/**
 * État des lieux d'activité — 8 plans premium patchés
 *
 * Pour chaque plan, on extrait :
 *   - Nb séances total (course + renfo)
 *   - Nb séances "complétées" (feedback.completed = true)
 *   - Nb séances avec RPE rempli (feedback.rpe défini)
 *   - Date de dernier feedback (le plus récent completedAt)
 *   - Jours depuis dernier feedback
 *   - Note moyenne RPE
 *   - Adaptation demandée combien de fois
 *   - Stravaconnect ?
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

// Liste premium (incl. al1.kasongo Marathon qu'on n'a pas patché mais qui reste premium)
const PREMIUMS = [
  { id: '1774429257527', email: 'mhbrx06@gmail.com',        tier: 'plan unique', subGoal: '10 km',         targetTime: '1h00', change: 'RISQUÉ → IRRÉALISTE',   patched: true },
  { id: '1778942808369', email: 'painvin.ambre@yahoo.com',  tier: 'premium',     subGoal: 'Semi-Marathon', targetTime: '2h30', change: 'RISQUÉ → RISQUÉ',       patched: true },
  { id: '1773143911561', email: 'lafleur666@yahoo.fr',      tier: 'premium',     subGoal: 'Semi-Marathon', targetTime: '1h59', change: 'BON → BON (rien)',      patched: true },
  { id: '1776425761569', email: 'berrebiariel94@hotmail.com', tier: 'premium',   subGoal: 'Semi-Marathon', targetTime: '1h55', change: 'BON → AMBITIEUX',       patched: true },
  { id: '1778918772165', email: 'al1.kasongo@hotmail.fr',   tier: 'premium',     subGoal: 'Semi-Marathon', targetTime: '1h30', change: 'BON → BON',             patched: true },
  { id: '1772961018568', email: 'chapeaujean@yahoo.fr',     tier: 'plan unique', subGoal: 'Semi-Marathon', targetTime: '1h20', change: 'BON → BON (rien)',      patched: true },
  { id: '1778615277138', email: 'arnaudmanoeuvre@gmail.com', tier: 'premium',    subGoal: 'Semi-Marathon', targetTime: '1h30', change: 'EXCELLENT → BON',       patched: true },
  { id: '1778927329896', email: 'al1.kasongo@hotmail.fr',   tier: 'premium',     subGoal: 'Marathon',      targetTime: '3h30', change: 'EXCELLENT → AMBITIEUX (manuel)', patched: 'manuel' },
];

const today = new Date();
const results = [];

for (const p of PREMIUMS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}`, { headers:H });
  const j = await r.json();
  if (!j.fields) { console.log(`⚠ ${p.id} introuvable`); continue; }
  const plan = pf(j.fields);
  const userId = plan.userId;
  // user doc pour stravaConnected + createdAt + email vérifié
  const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userId}`, { headers:H });
  const userJ = await ur.json();
  const user = userJ.fields ? pf(userJ.fields) : {};

  let nbTotal = 0;
  let nbCompleted = 0;
  let nbWithRPE = 0;
  let nbAdaptReq = 0;
  let nbWithStrava = 0;
  let nbNotes = 0;
  const rpes = [];
  let latestCompletedAt = null;
  let firstCompletedAt = null;
  const completedByWeek = {};

  for (const w of (plan.weeks || [])) {
    const wn = w.weekNumber;
    for (const s of (w.sessions || [])) {
      nbTotal++;
      const fb = s.feedback;
      if (!fb) continue;
      if (fb.completed) {
        nbCompleted++;
        completedByWeek[wn] = (completedByWeek[wn]||0) + 1;
        if (fb.completedAt) {
          if (!latestCompletedAt || fb.completedAt > latestCompletedAt) latestCompletedAt = fb.completedAt;
          if (!firstCompletedAt || fb.completedAt < firstCompletedAt) firstCompletedAt = fb.completedAt;
        }
      }
      if (typeof fb.rpe === 'number' && fb.rpe > 0) {
        nbWithRPE++;
        rpes.push(fb.rpe);
      }
      if (fb.notes) nbNotes++;
      if (fb.adaptationRequested) nbAdaptReq++;
      if (fb.stravaData) nbWithStrava++;
    }
  }

  const daysSinceLast = latestCompletedAt ? Math.floor((today - new Date(latestCompletedAt)) / (1000*60*60*24)) : null;
  const avgRpe = rpes.length ? (rpes.reduce((s,v)=>s+v, 0) / rpes.length).toFixed(1) : null;
  const startDate = plan.startDate;
  const planAgeDays = startDate ? Math.floor((today - new Date(startDate)) / (1000*60*60*24)) : null;
  const completedRatio = nbTotal > 0 ? Math.round(nbCompleted/nbTotal*100) : 0;
  const rpeRatio = nbCompleted > 0 ? Math.round(nbWithRPE/nbCompleted*100) : 0;

  // Variabilité des RPE (si toujours 5 → user clique "fait" sans s'investir)
  const rpeUnique = [...new Set(rpes)];
  const rpeInvested = rpeUnique.length >= 2;

  results.push({
    ...p,
    userId, firstName: user.firstName,
    stravaConnected: user.stravaConnected || false,
    emailVerified: user.emailVerified,
    plansCount: user.plansCount,
    // Stripe / abonnement
    stripeSubscriptionStatus: user.stripeSubscriptionStatus || (user.hasPurchasedPlan ? 'one-time-plan' : 'none'),
    stripeSubscriptionId: user.stripeSubscriptionId,
    premiumSince: user.premiumSince?.substring?.(0,10) || user.planPurchaseDate?.substring?.(0,10),
    premiumCancelAt: user.premiumCancelAt?.substring?.(0,10),
    hasPurchasedPlan: user.hasPurchasedPlan || false,
    isPremium: user.isPremium || false,
    // Plan stats
    durationWeeks: plan.durationWeeks,
    isPreview: plan.isPreview,
    fullPlanGenerated: plan.fullPlanGenerated,
    nbTotal, nbCompleted, nbWithRPE, nbNotes, nbAdaptReq, nbWithStrava,
    completedRatio: `${completedRatio}%`,
    rpeRatio: `${rpeRatio}%`,
    avgRpe,
    rpeUnique: rpeUnique.length,
    rpeInvested,
    firstCompletedAt: firstCompletedAt?.substring(0,10),
    latestCompletedAt: latestCompletedAt?.substring(0,10),
    daysSinceLast,
    planAgeDays,
    startDate,
    completedByWeek,
  });
}

// Classement par activité (nbCompleted desc, puis daysSinceLast asc)
results.sort((a,b) => {
  if (b.nbCompleted !== a.nbCompleted) return b.nbCompleted - a.nbCompleted;
  return (a.daysSinceLast || 999) - (b.daysSinceLast || 999);
});

console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  ÉTAT DES LIEUX ACTIVITÉ + ABONNEMENT — 8 PLANS PREMIUM`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  ${'planId'.padEnd(15)} ${'email'.padEnd(31)} ${'subStatus'.padEnd(15)} ${'premiumSince'.padEnd(12)} ${'cancelAt'.padEnd(11)} ${'sub'.padEnd(13)} ${'cible'.padEnd(6)} ${'fait/tot'.padEnd(9)} ${'RPE/fait'.padEnd(8)} ${'avgRPE'.padEnd(7)} ${'inv'.padEnd(4)} ${'strava'.padEnd(7)} change`);
console.log('  ' + '─'.repeat(180));
for (const r of results) {
  console.log(`  ${r.id.padEnd(15)} ${(r.email||'?').substring(0,31).padEnd(31)} ${String(r.stripeSubscriptionStatus).padEnd(15)} ${(r.premiumSince||'-').padEnd(12)} ${(r.premiumCancelAt||'-').padEnd(11)} ${r.subGoal.padEnd(13)} ${r.targetTime.padEnd(6)} ${(r.nbCompleted+'/'+r.nbTotal).padEnd(9)} ${(r.nbWithRPE+'/'+r.nbCompleted).padEnd(8)} ${(r.avgRpe||'-').padEnd(7)} ${(r.rpeInvested?'✅':'❌').padEnd(4)} ${(r.stravaConnected?'✅':'❌').padEnd(7)} ${r.change}`);
}

writeFileSync('audit-premium-activity.json', JSON.stringify(results, null, 2));
console.log(`\n📝 audit-premium-activity.json`);

// Priorisation
console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  PRIORITÉS COMMUNICATION (du plus prioritaire au moins prioritaire)`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
const actifs = results.filter(r => r.nbCompleted > 0);
const inactifs = results.filter(r => r.nbCompleted === 0);
console.log(`\n  🟢 ACTIFS (au moins 1 séance faite) : ${actifs.length}`);
actifs.forEach(r => console.log(`    → ${r.email.padEnd(30)} ${r.change.padEnd(30)} | ${r.nbCompleted}/${r.nbTotal} faites, dernier feedback il y a ${r.daysSinceLast} jours`));
console.log(`\n  🔴 INACTIFS (0 séance faite) : ${inactifs.length}`);
inactifs.forEach(r => console.log(`    → ${r.email.padEnd(30)} ${r.change.padEnd(30)} | plan créé ${r.planAgeDays}j (préview=${r.isPreview})`));
