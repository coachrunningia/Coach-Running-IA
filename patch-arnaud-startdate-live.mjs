/**
 * Patch live Arnaud 1779554515397 — startDate 24/05 (dim) → 25/05 (lun)
 * Date : 2026-05-23
 *
 * Bug : plan.startDate aligné sur lundi PRÉCÉDENT (passé), pas lundi suivant.
 * User a demandé "demain dimanche 24/05", front affiche S1 J1 = Lundi 18/05 (passé).
 *
 * Fix immédiat : startDate = 2026-05-25 (lundi suivant), endDate recalculée.
 *
 * Doctrines respectées :
 * - feedback_input_client_obligatoire (on respecte la VOLONTÉ user "commencer demain")
 * - feedback_chaque_ligne_justifiee
 * - feedback_jamais_baisser_allure_cible (allures intactes)
 */
import { execSync } from 'child_process';
import fs from 'fs';

const accessToken = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null'
).toString().trim();

const fetch = (await import('node-fetch')).default;
const planId = '1779554515397';
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
const DRY = process.argv.includes('--dry');

function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}

const doc = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

const backupFile = `/Users/romanemarino/Coach-Running-IA/backup-arnaud-startdate-${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backupFile}\n`);

// ─── Nouvelles dates ───
// User demande "commencer demain dim 24/05" → on aligne au LUNDI SUIVANT = 25/05.
// Doctrine produit : plans commencent toujours le lundi (cohérence affichage).
const NEW_START_DATE = '2026-05-25'; // Lundi
const sd = new Date(NEW_START_DATE);
const durationWeeks = plan.durationWeeks || 15;
sd.setDate(sd.getDate() + durationWeeks * 7);
const NEW_END_DATE = sd.toISOString().split('T')[0]; // 25/05 + 15 sem = 7/9

console.log(`📅 startDate : ${plan.startDate} → ${NEW_START_DATE} (lundi)`);
console.log(`📅 endDate : ${plan.endDate} → ${NEW_END_DATE}`);
console.log(`📅 raceDate (inchangé) : ${plan.raceDate}`);
console.log(`📅 durationWeeks : ${durationWeeks}`);

if (DRY) {
  console.log(`\n🛑 DRY-RUN`);
  process.exit(0);
}

const fields = {
  startDate: { stringValue: NEW_START_DATE },
  endDate: { stringValue: NEW_END_DATE },
};
const patchRes = await fetch(`${url}?updateMask.fieldPaths=startDate&updateMask.fieldPaths=endDate`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields }),
});
const patchResult = await patchRes.json();
if (patchResult.error) { console.error('❌', JSON.stringify(patchResult.error)); process.exit(1); }
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${patchResult.updateTime}`);

// Verif
const verifDoc = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const verifPlan = {};
for (const [k, v] of Object.entries(verifDoc.fields)) verifPlan[k] = parseFs(v);
console.log(`\n🔍 Vérif :`);
console.log(`  startDate : ${verifPlan.startDate}`);
console.log(`  endDate : ${verifPlan.endDate}`);
console.log(`  raceDate : ${verifPlan.raceDate} (inchangé)`);
