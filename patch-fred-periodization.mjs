/**
 * Patch LIVE uniquement pour Fred (plan 1779001846380).
 * - Aucune modification de code.
 * - Régénère `generationContext.periodizationPlan.weeklyVolumes` pour passer
 *   d'un pic 20 km/sem (sous-dimensionné pour semi 2h00) à un pic 30 km/sem
 *   (recommandation expert : 28-30 km/sem pour semi 2h00 en 3 séances).
 * - `weeklyPhases` et `recoveryWeeks` inchangés (la structure de périodisation
 *   reste la même : juste les volumes sont relevés).
 * - S1 = 15 km conservée (déjà déployée et affichée).
 * - Progression maxi +20% (sortie de décharge), max +18% en charge.
 * - Affûtage final S20 = 15 km (50% du pic) — cohérent semi.
 *
 * Backup avant patch.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1779001846380';

// 1. Backup full doc
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-fred-periodization-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-fred-periodization-${ts}.json`);

// 2. Extract existing periodizationPlan
const ppField = doc.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
if(!ppField){ console.error('❌ periodizationPlan introuvable'); process.exit(1); }
const oldVolumes = (ppField.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const phases = (ppField.weeklyPhases?.arrayValue?.values || []).map(v => v.stringValue);
const recoveryWeeks = (ppField.recoveryWeeks?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const totalWeeks = parseInt(ppField.totalWeeks?.integerValue);
console.log(`\n── AVANT ──`);
console.log(`  weeklyVolumes: [${oldVolumes.join(', ')}]`);
console.log(`  pic: ${Math.max(...oldVolumes)} km (S${oldVolumes.indexOf(Math.max(...oldVolumes))+1})`);
console.log(`  total: ${oldVolumes.reduce((s,v)=>s+v,0)} km`);

// 3. Nouveau weeklyVolumes — pic 30 km, S1=15 conservée, progression saine
//    Phases (inchangées) : fond×3, recov, fond×2, recov, dev×2, recov, dev×2, recov, spe×2, recov, spe×2, affut×2
//    recoveryWeeks (inchangées) : [4, 7, 10, 13, 16]
const newVolumes = [
  15, // S1 fond — inchangée (déjà déployée)
  17, // S2 fond +13%
  19, // S3 fond +12%
  16, // S4 recov -16%
  19, // S5 fond +19%
  22, // S6 fond +16%
  18, // S7 recov -18%
  21, // S8 dev +17%
  24, // S9 dev +14%
  20, // S10 recov -17%
  24, // S11 dev +20%
  26, // S12 dev +8%
  22, // S13 recov -15%
  26, // S14 spe +18%
  28, // S15 spe +8%
  24, // S16 recov -14%
  28, // S17 spe +17%
  30, // S18 spe +7% ★PIC
  22, // S19 affut -27%
  15, // S20 affut -32%
];
if(newVolumes.length !== totalWeeks){ console.error(`❌ length mismatch (${newVolumes.length} vs ${totalWeeks})`); process.exit(1); }

console.log(`\n── APRÈS ──`);
console.log(`  weeklyVolumes: [${newVolumes.join(', ')}]`);
console.log(`  pic: ${Math.max(...newVolumes)} km (S${newVolumes.indexOf(Math.max(...newVolumes))+1})`);
console.log(`  total: ${newVolumes.reduce((s,v)=>s+v,0)} km`);

// 4. Sanity check progressions
const deltas = [];
for(let i=1;i<newVolumes.length;i++) deltas.push(((newVolumes[i]-newVolumes[i-1])/newVolumes[i-1]*100));
const maxJump = Math.max(...deltas);
console.log(`  max progression: +${maxJump.toFixed(0)}%`);
if(maxJump > 20){ console.error(`❌ saut > 20%`); process.exit(1); }

// 5. PATCH via updateMask sur generationContext.periodizationPlan (map entière)
const newPP = {
  recoveryWeeks: { arrayValue: { values: recoveryWeeks.map(v => ({ integerValue: String(v) })) } },
  weeklyVolumes: { arrayValue: { values: newVolumes.map(v => ({ integerValue: String(v) })) } },
  totalWeeks: { integerValue: String(totalWeeks) },
  weeklyPhases: { arrayValue: { values: phases.map(v => ({ stringValue: v })) } },
};

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=generationContext.periodizationPlan`;
const patch = await fetch(url, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ fields: { generationContext: { mapValue: { fields: { periodizationPlan: { mapValue: { fields: newPP } } } } } } })
});
const pj = await patch.json();
if(patch.status !== 200){ console.error(`❌ Patch failed (${patch.status}):`, JSON.stringify(pj).substring(0,500)); process.exit(1); }
console.log(`\n✅ periodizationPlan patché sur plan ${PLAN_ID}`);

// 6. Vérification
const verif = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await verif.json();
const verifVols = (vj.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
console.log(`\n🔎 Vérification : weeklyVolumes en base = [${verifVols.join(', ')}]`);
console.log(`✅ pic vérifié = ${Math.max(...verifVols)} km`);
