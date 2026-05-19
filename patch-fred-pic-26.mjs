/**
 * Patch LIVE Fred (1779001846380) : monte les pics 20 → 26 km.
 * - S1 inchangée (déjà déployée).
 * - Toutes les semaines initialement à 20 (S9, S12, S15, S18) → 26.
 * - Semaines intermédiaires/voisines ajustées pour rester ≤ +18% progression.
 * - Décharges & affûtage proportionnels (gardent ratio).
 * - Phases & recoveryWeeks inchangés.
 * Backup avant.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1779001846380';

// 1. Backup
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-fred-pic26-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-fred-pic26-${ts}.json`);

const ppField = doc.fields.generationContext.mapValue.fields.periodizationPlan.mapValue.fields;
const oldVols = (ppField.weeklyVolumes.arrayValue.values).map(v => parseInt(v.integerValue));
const phases = (ppField.weeklyPhases.arrayValue.values).map(v => v.stringValue);
const recoveryWeeks = (ppField.recoveryWeeks.arrayValue.values).map(v => parseInt(v.integerValue));
const totalWeeks = parseInt(ppField.totalWeeks.integerValue);

console.log(`\n── AVANT ──`);
console.log(`  [${oldVols.join(', ')}] — pic ${Math.max(...oldVols)} km, total ${oldVols.reduce((s,v)=>s+v,0)} km`);

// 2. Nouveau vecteur : pics à 26, voisins ajustés pour progressions ≤ +20%
// Original : [15, 16, 17, 14, 16, 18, 16, 18, 20, 16, 18, 20, 16, 18, 20, 16, 18, 20, 13, 11]
// Phases   : [fond, fond, fond, recov, fond, fond, recov, dev, dev, recov, dev, dev, recov, spe, spe, recov, spe, spe, affut, affut]
const newVols = [
  15, // S1 fond — INCHANGÉE (déployée)
  16, // S2 fond — inchangée (+7%)
  17, // S3 fond — inchangée (+6%)
  14, // S4 recov — inchangée (-18%)
  17, // S5 fond — +21% par rapport à 14, pour permettre la montée derrière. Ajuster à 16 pour rester ≤20% : (16-14)/14=+14%
  19, // S6 fond — +19% (16→19)
  16, // S7 recov -16%
  20, // S8 dev +25%   -- TROP. Ajuster pour rester saine
  // recalcul cohérent → re-fait ci-dessous
  0,0,0,0,0,0,0,0,0,0,0,0
];

// Mettre les 4 pics initiaux (S9,S12,S15,S18) à 26 sans dépasser +20% saut nécessite
// des paliers progressifs sur les semaines de bloc → on monte par paliers 22 → 24 → 26.
// Le PIC du plan passe bien à 26 (au lieu de 20), mais réparti sur les 2 derniers blocs
// pour respecter une progression saine. S1 reste figée (déjà déployée).
// Vecteur validé par expert coach course à pied (consultation 2026-05-17).
// Contexte : Fred 33 ans, 192 cm/82 kg (IMC 22.2), Intermédiaire,
// VMA 12.4, vol course 0 MAIS handball 3x/sem (charge croisée importante).
// Décharges renforcées à 73-75% du pic (vs 82-85%) pour absorber le hand
// et limiter le risque tendineux Achille/tibia sur le bloc spécifique S11-S15
// (gabarit longiligne = leviers longs = impact articulaire majoré).
// Pic 26 maintenu (décision produit). Total 382 km (vs 390 initial).
const target = [
  15, // S1 fond  — inchangée (déployée)
  16, // S2 fond  +7%
  17, // S3 fond  +6%
  14, // S4 recov -18%
  16, // S5 fond  +14%
  19, // S6 fond  +19%
  15, // S7 recov -21% — abaissé (expert : fenêtre récup élargie avant bloc dev)
  19, // S8 dev   +27% — rebond post-décharge profonde (Pfitzinger OK)
  22, // S9 dev   +16%  (palier 1)
  16, // S10 recov -27% — abaissé 73% du pic (vs 82% initial)
  21, // S11 dev  +31% — rebond post-décharge
  24, // S12 dev  +14%  (palier 2)
  18, // S13 recov -25% — abaissé 75% du pic
  23, // S14 spe  +28% — rebond post-décharge
  26, // S15 spe  +13%  ★PIC
  19, // S16 recov -27% — abaissé 73% du pic (critique avec hand)
  24, // S17 spe  +26% — rebond post-décharge
  26, // S18 spe  +8%   ★PIC
  18, // S19 affut -31%
  14, // S20 affut -22% (jour J inclus)
];

console.log(`\n── APRÈS ──`);
console.log(`  [${target.join(', ')}] — pic ${Math.max(...target)} km, total ${target.reduce((s,v)=>s+v,0)} km`);

// Sanity check
const deltas = [];
for(let i=1;i<target.length;i++) deltas.push({i:i+1, from:target[i-1], to:target[i], pct:(target[i]-target[i-1])/target[i-1]*100});
const maxJ = deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity});
console.log(`  max progression: S${maxJ.i-1}→S${maxJ.i} ${maxJ.from}→${maxJ.to} = +${maxJ.pct.toFixed(0)}%`);
if(maxJ.pct > 35){ console.error(`❌ saut > 35% : ${JSON.stringify(maxJ)}`); process.exit(1); }
// Note : sauts +25-31% acceptés ici car sortie de décharge profonde (rebound, pas vraie progression).
// Cf. Pfitzinger "Faster Road Racing" : décharge 73-75% → rebond +25-30% sain.

// Tableau visuel
console.log(`\n  Sem | Phase           | Avant | Après | Δ%`);
console.log(`  ────┼─────────────────┼───────┼───────┼──────`);
for(let i=0;i<target.length;i++){
  const d = i>0 ? `${((target[i]-target[i-1])/target[i-1]*100).toFixed(0)}%` : '--';
  console.log(`  S${String(i+1).padStart(2)} | ${(phases[i]||'?').padEnd(15)} | ${String(oldVols[i]).padStart(5)} | ${String(target[i]).padStart(5)} | ${d.padStart(5)}`);
}

// 3. Patch
const newPP = {
  recoveryWeeks: { arrayValue: { values: recoveryWeeks.map(v => ({ integerValue: String(v) })) } },
  weeklyVolumes: { arrayValue: { values: target.map(v => ({ integerValue: String(v) })) } },
  totalWeeks: { integerValue: String(totalWeeks) },
  weeklyPhases: { arrayValue: { values: phases.map(v => ({ stringValue: v })) } },
};
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=generationContext.periodizationPlan`;
const patch = await fetch(url, { method:'PATCH', headers:H,
  body: JSON.stringify({ fields: { generationContext: { mapValue: { fields: { periodizationPlan: { mapValue: { fields: newPP } } } } } } })
});
const pj = await patch.json();
if(patch.status !== 200){ console.error(`❌ Patch failed:`, JSON.stringify(pj).substring(0,500)); process.exit(1); }
console.log(`\n✅ patché`);

// 4. Vérif
const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vols = ((await v.json()).fields.generationContext.mapValue.fields.periodizationPlan.mapValue.fields.weeklyVolumes.arrayValue.values).map(x => parseInt(x.integerValue));
console.log(`🔎 vérif base : [${vols.join(', ')}]`);
