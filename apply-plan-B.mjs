/**
 * Correction Plan B — bruno.grange (1778673418021)
 *   1. Warning IMC ajouté à feasibility.safetyWarning
 *   2. D+ sur "Footing vallonné" Lundi S1 : 0 → 60m
 */
import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778673418021';

// === 1. Lecture pour calcul du nouveau warning + extraction des weeks ===
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
const currentWarning = j.fields.feasibility.mapValue.fields.safetyWarning.stringValue;
console.log(`Warning actuel (${currentWarning.length} chars):`);
console.log(currentWarning.substring(0,200) + '...\n');

// Le warning actuel contient déjà la mention durée plan. On ajoute la phrase IMC AVANT cette mention.
const IMC_PHRASE = "Compte tenu de ta morphologie, sois progressif sur les volumes et privilégie les surfaces souples ; un avis médical est recommandé avant un objectif compétitif intense.\n\n";

let newWarning;
if (currentWarning.includes('⚠️ DURÉE DU PLAN')) {
  newWarning = currentWarning.replace('⚠️ DURÉE DU PLAN', IMC_PHRASE + '⚠️ DURÉE DU PLAN');
} else {
  newWarning = currentWarning + '\n\n' + IMC_PHRASE.trim();
}
console.log(`Nouveau warning (${newWarning.length} chars):`);
console.log(newWarning.substring(0,400) + '...\n');

// === 2. Patch feasibility.safetyWarning ===
const patchFeasRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility.safetyWarning`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: { feasibility: { mapValue: { fields: { safetyWarning: { stringValue: newWarning } } } } }
  }),
});
const patchedFeas = await patchFeasRes.json();
if (patchedFeas.error) { console.error('🔴 Erreur PATCH warning:', patchedFeas.error); process.exit(1); }
console.log('✅ Warning IMC ajouté.\n');

// === 3. Patch D+ Lundi "Footing vallonné" ===
// On doit re-écrire le tableau weeks avec D+ Lundi=60.
const weeks = j.fields.weeks.arrayValue.values;
const w1 = weeks[0].mapValue.fields;
const s1Sessions = w1.sessions.arrayValue.values;

let changed = false;
for (const sess of s1Sessions) {
  const f = sess.mapValue.fields;
  const day = f.day?.stringValue;
  const title = f.title?.stringValue || '';
  if (day === 'Lundi' && /vallonn/i.test(title)) {
    const before = f.elevationGain?.integerValue ?? f.elevationGain?.doubleValue ?? 0;
    f.elevationGain = { integerValue: 60 };
    console.log(`Lundi "${title}": D+ ${before} → 60m`);
    changed = true;
  }
}
if (!changed) { console.warn('⚠️ Séance Lundi vallonné non trouvée. Abandon patch D+.'); process.exit(0); }

// PATCH weeks complet (Firestore exige l'array entier sur ce champ)
const patchWeeksRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=weeks`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { weeks: { arrayValue: { values: weeks } } } }),
});
const patchedWeeks = await patchWeeksRes.json();
if (patchedWeeks.error) { console.error('🔴 Erreur PATCH weeks:', patchedWeeks.error); process.exit(1); }

// Vérif post-patch
const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j2 = await r2.json();
const lundi = j2.fields.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values
  .find(s => s.mapValue.fields.day?.stringValue === 'Lundi');
const finalDplus = lundi.mapValue.fields.elevationGain?.integerValue ?? lundi.mapValue.fields.elevationGain?.doubleValue ?? 0;
console.log(`\n✅ Vérif post-patch : Lundi D+ = ${finalDplus}m`);
console.log(`✅ Plan B corrigé.`);
