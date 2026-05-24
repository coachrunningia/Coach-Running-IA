/**
 * Sprint F — Audits préalables avant code
 * 1. Bug 13 : combien % plans ont pic stagnant phase dev/spé (4+ semaines même volume) ?
 * 2. Bug 11 : combien % plans cv<10 ont semaines récup qui ne déchargent pas ?
 * 3. Investigation Bug 14 : combien plans avec recentRaceTimes au format suspect (heures pour 5K/10K) ?
 */
import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
function parseFs(f) {
  if (f == null) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return parseInt(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(parseFs);
  if ('mapValue' in f) {
    const out = {};
    for (const [k, v] of Object.entries(f.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return f;
}
async function runQuery(q) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: q })
  });
  return await r.json();
}

// Récupérer 200 derniers plans
const sinceIso = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
const docs = await runQuery({
  from: [{ collectionId: 'plans' }],
  where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: sinceIso } } },
  orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
  limit: 300,
});

const plans = (docs || []).filter(d => d.document).map(d => {
  const p = {};
  for (const [k, v] of Object.entries(d.document.fields || {})) p[k] = parseFs(v);
  return p;
});

console.log(`📊 Total plans 60 derniers jours : ${plans.length}\n`);

// =====================================================
// BUG 13 — Pic stagnant phase dev/spé
// =====================================================
console.log('═══════════════════════════════════════');
console.log('BUG 13 — Pic stagnant (≥4 sem identiques en dev/spé)');
console.log('═══════════════════════════════════════');
let plansAvecPicStagnant = 0;
let totalPlansAnalyses = 0;
const exemplesPicStagnant = [];
for (const p of plans) {
  const vols = p.generationContext?.periodizationPlan?.weeklyVolumes;
  const phases = p.generationContext?.periodizationPlan?.weeklyPhases;
  if (!vols || !phases || vols.length < 13) continue; // skip plans courts
  totalPlansAnalyses++;
  // Chercher 4+ semaines consécutives même volume EN PHASE dev OU spé
  let maxConsec = 1;
  let currentConsec = 1;
  let stagnantInDev = false;
  for (let i = 1; i < vols.length; i++) {
    if (vols[i] === vols[i-1] && (phases[i] === 'developpement' || phases[i] === 'specifique') && (phases[i-1] === 'developpement' || phases[i-1] === 'specifique')) {
      currentConsec++;
      if (currentConsec > maxConsec) maxConsec = currentConsec;
      if (currentConsec >= 4) stagnantInDev = true;
    } else {
      currentConsec = 1;
    }
  }
  // Alternative : compter les % de semaines dev/spé qui sont au pic théorique
  const pic = Math.max(...vols);
  const semDevSpe = phases.filter(ph => ph === 'developpement' || ph === 'specifique').length;
  const semAuPic = vols.filter((v, i) => v === pic && (phases[i] === 'developpement' || phases[i] === 'specifique')).length;
  const ratioPic = semDevSpe > 0 ? semAuPic / semDevSpe : 0;
  if (stagnantInDev || ratioPic >= 0.5) {
    plansAvecPicStagnant++;
    if (exemplesPicStagnant.length < 5) {
      exemplesPicStagnant.push({ id: p.id || p.userId, goal: p.goal, vols, maxConsec, ratioPic: ratioPic.toFixed(2) });
    }
  }
}
console.log(`Plans analysés (>= 13 sem) : ${totalPlansAnalyses}`);
console.log(`Plans avec pic stagnant : ${plansAvecPicStagnant} (${(100*plansAvecPicStagnant/Math.max(1,totalPlansAnalyses)).toFixed(0)}%)`);
console.log(`Exemples :`);
for (const e of exemplesPicStagnant) console.log(`  • ${e.id} ${e.goal} | maxConsec=${e.maxConsec} ratioPic=${e.ratioPic} | vols=${JSON.stringify(e.vols).slice(0,80)}...`);

// =====================================================
// BUG 11 — recoveryFactor petits volumes
// =====================================================
console.log(`\n═══════════════════════════════════════`);
console.log('BUG 11 — recovery weeks pas dégressives (petits volumes cv<10)');
console.log('═══════════════════════════════════════');
let plansPetitVol = 0;
let plansPetitVolBugRecup = 0;
const exemplesBugRecup = [];
for (const p of plans) {
  const vols = p.generationContext?.periodizationPlan?.weeklyVolumes;
  const phases = p.generationContext?.periodizationPlan?.weeklyPhases;
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const cv = qs.currentWeeklyVolume;
  if (!vols || !phases || cv === undefined || cv >= 10) continue;
  plansPetitVol++;
  // Chercher semaines récup où vol(récup) >= vol(sem précédente)
  let hasBug = false;
  const recupBuggees = [];
  for (let i = 1; i < vols.length; i++) {
    if (phases[i] === 'recuperation' && vols[i] >= vols[i-1]) {
      hasBug = true;
      recupBuggees.push(`S${i+1}=${vols[i]}≥S${i}=${vols[i-1]}`);
    }
  }
  if (hasBug) {
    plansPetitVolBugRecup++;
    if (exemplesBugRecup.length < 5) {
      exemplesBugRecup.push({ id: p.id || p.userId, cv, vols, recupBuggees });
    }
  }
}
console.log(`Plans cv<10 : ${plansPetitVol}`);
console.log(`Plans cv<10 avec récup pas dégressive : ${plansPetitVolBugRecup} (${(100*plansPetitVolBugRecup/Math.max(1,plansPetitVol)).toFixed(0)}%)`);
console.log(`Exemples :`);
for (const e of exemplesBugRecup) console.log(`  • ${e.id} cv=${e.cv} | bugs=${e.recupBuggees.join(',')} | vols=${JSON.stringify(e.vols).slice(0,80)}...`);

// =====================================================
// BUG 14 — recentRaceTimes saisie suspecte
// =====================================================
console.log(`\n═══════════════════════════════════════`);
console.log('BUG 14 — recentRaceTimes saisie absurde (heures pour 5K/10K)');
console.log('═══════════════════════════════════════');
let plansAvecPB = 0;
let plansSaisieAbsurde = 0;
const exemplesAbsurdes = [];
for (const p of plans) {
  const rt = p.generationContext?.questionnaireSnapshot?.recentRaceTimes;
  if (!rt) continue;
  plansAvecPB++;
  const absurdes = [];
  for (const [dist, time] of Object.entries(rt)) {
    if (!time || typeof time !== 'string') continue;
    // Detect format "Xh..." sur 5K (impossible)
    if (dist === 'distance5km' && /\d+h/i.test(time)) absurdes.push(`5K="${time}" suspect`);
    if (dist === 'distance10km' && /^\d+h\d/i.test(time)) absurdes.push(`10K="${time}" suspect (Xh saisi pour XminY ?)`);
    if (dist === 'distanceHalfMarathon' && /^\d+h\d+/i.test(time)) {
      // Semi sub-2h ou >5h = suspect
      const m = time.match(/^(\d+)h(\d+)/);
      if (m && (parseInt(m[1]) < 1 || parseInt(m[1]) > 4)) absurdes.push(`Semi="${time}" suspect`);
    }
  }
  if (absurdes.length > 0) {
    plansSaisieAbsurde++;
    if (exemplesAbsurdes.length < 5) {
      exemplesAbsurdes.push({ id: p.id || p.userId, absurdes, rt });
    }
  }
}
console.log(`Plans avec recentRaceTimes : ${plansAvecPB}`);
console.log(`Plans avec saisie absurde détectée : ${plansSaisieAbsurde} (${(100*plansSaisieAbsurde/Math.max(1,plansAvecPB)).toFixed(0)}%)`);
console.log(`Exemples :`);
for (const e of exemplesAbsurdes) console.log(`  • ${e.id} | ${e.absurdes.join(', ')} | rt=${JSON.stringify(e.rt).slice(0,120)}`);

// =====================================================
// SYNTHÈSE pour décision Sprint F
// =====================================================
console.log(`\n═══════════════════════════════════════`);
console.log('SYNTHÈSE — Décision Sprint F');
console.log('═══════════════════════════════════════');
console.log(`Bug 13 pic stagnant : ${plansAvecPicStagnant}/${totalPlansAnalyses} plans (${(100*plansAvecPicStagnant/Math.max(1,totalPlansAnalyses)).toFixed(0)}%) — ${plansAvecPicStagnant >= 30 ? '🔥 P0 fix urgent' : plansAvecPicStagnant >= 10 ? '⚠️ P1' : '✅ marginal, peut attendre'}`);
console.log(`Bug 11 recup petit vol : ${plansPetitVolBugRecup}/${plansPetitVol} plans cv<10 (${(100*plansPetitVolBugRecup/Math.max(1,plansPetitVol)).toFixed(0)}%) — ${plansPetitVolBugRecup >= 20 ? '🔥 P0' : plansPetitVolBugRecup >= 5 ? '⚠️ P1' : '✅ marginal'}`);
console.log(`Bug 14 saisie absurde : ${plansSaisieAbsurde}/${plansAvecPB} plans (${(100*plansSaisieAbsurde/Math.max(1,plansAvecPB)).toFixed(0)}%) — ${plansSaisieAbsurde >= 10 ? '🔥 P0' : plansSaisieAbsurde >= 3 ? '⚠️ P1' : '✅ marginal'}`);
