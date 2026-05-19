/**
 * Analyse profonde — Plans buggés PREMIUM uniquement
 *
 * Pour chaque plan dans audit-pace-bug-v2.json :
 *   1. Fetch users/{userId} pour isPremium / hasPurchasedPlan / Stripe
 *   2. Si premium ou plan acheté → analyse détaillée
 *
 * Output : tableau premium + résumé écart + criticité
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

const detailed = JSON.parse(readFileSync('audit-pace-bug-v2.json', 'utf8'));
console.log(`Audit premium sur ${detailed.length} plans buggés…`);

// Charger pour chaque plan le userId puis le doc user
const enriched = [];
for (const d of detailed) {
  // récupérer userId du plan
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${d.id}`, { headers:H });
  const planDoc = await r.json();
  if (!planDoc.fields) continue;
  const userId = planDoc.fields.userId?.stringValue;
  if (!userId) { console.log(`⚠ ${d.id} pas de userId`); continue; }

  const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userId}`, { headers:H });
  const userDoc = await ur.json();
  if (ur.status === 404 || !userDoc.fields) {
    // user pas trouvé (rare)
    enriched.push({ ...d, userId, isPremium: false, hasPurchasedPlan: false, plansCount: '?' });
    continue;
  }
  const u = pf(userDoc.fields);
  enriched.push({
    ...d,
    userId,
    firstName: u.firstName,
    isPremium: u.isPremium || false,
    hasPurchasedPlan: u.hasPurchasedPlan || false,
    stripeCustomerId: u.stripeCustomerId || null,
    plansCount: u.plansCount,
    emailVerified: u.emailVerified,
  });
}

writeFileSync('audit-premium-buggy.json', JSON.stringify(enriched, null, 2));

const premiums = enriched.filter(e => e.isPremium || e.hasPurchasedPlan);
const freemiums = enriched.filter(e => !e.isPremium && !e.hasPurchasedPlan);

console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  ANALYSE PREMIUM — sur ${enriched.length} plans buggés`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  Premium / a acheté un plan : ${premiums.length}`);
console.log(`  Freemium                    : ${freemiums.length}`);

if (!premiums.length) {
  console.log(`\n✅ Aucun premium impacté.`);
  process.exit(0);
}

// Distribution écart premium
const buckets = { '0-15s': 0, '16-30s': 0, '31-60s': 0, '61-120s': 0, '>120s': 0 };
for (const p of premiums) {
  const x = Math.abs(p.diffSec);
  if (x <= 15) buckets['0-15s']++;
  else if (x <= 30) buckets['16-30s']++;
  else if (x <= 60) buckets['31-60s']++;
  else if (x <= 120) buckets['61-120s']++;
  else buckets['>120s']++;
}
console.log(`\n── DISTRIBUTION ÉCART PREMIUM ──`);
for (const [k,v] of Object.entries(buckets)) console.log(`  ${k.padEnd(10)} : ${v}`);

// Changements de statut
const statusChanges = {};
for (const p of premiums) {
  const key = `${p.feasStatusActuel} → ${p.feasStatusReco}`;
  statusChanges[key] = (statusChanges[key] || 0) + 1;
}
console.log(`\n── CHANGEMENTS STATUT PREMIUM ──`);
for (const [k,v] of Object.entries(statusChanges).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(40)} : ${v}`);

// Full vs preview
const previewsP = premiums.filter(p => p.isPreview && !p.fullPlanGenerated);
const fullsP = premiums.filter(p => p.fullPlanGenerated);
console.log(`\n── PREVIEW vs FULL (PREMIUM) ──`);
console.log(`  Preview : ${previewsP.length}`);
console.log(`  Full    : ${fullsP.length}`);

// Détail tous les premium
console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  DÉTAIL DES ${premiums.length} PLANS PREMIUM`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  planId             | email                          | ⭐    | subGoal      | targetTime | paceStock → paceCible | Δs    | %VMA cible | feas actuel → reco       | preview/full | sessions buggy`);
console.log(`  -------------------+--------------------------------+------+--------------+------------+-----------------------+-------+------------+--------------------------+--------------+----------------`);
for (const p of premiums.sort((a,b) => Math.abs(b.diffSec) - Math.abs(a.diffSec))) {
  const stars = p.isPremium ? '⭐⭐⭐' : '⭐';
  const type = p.fullPlanGenerated ? 'full ' : (p.isPreview ? 'prev' : '?');
  console.log(`  ${p.id} | ${(p.email||'?').substring(0,30).padEnd(30)} | ${stars.padEnd(4)} | ${p.subGoal.padEnd(12)} | ${String(p.targetTime).padEnd(10)} | ${(p.paceStockStr+' → '+p.paceCibleStr).padEnd(21)} | +${String(p.diffSec).padEnd(4)} | ${p.pctVMACible.padEnd(10)} | ${(p.feasStatusActuel+'/'+p.feasScoreActuel).padEnd(13)} → ${(p.feasStatusReco+'/'+p.feasScoreReco).padEnd(13)} | ${type.padEnd(12)} | ${p.nbSessionsBuggy}/${p.nbSessionsTotal}`);
}

console.log(`\n📝 audit-premium-buggy.json (détail complet)`);
