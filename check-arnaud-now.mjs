import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
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
const doc = await (await fetch('https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/1779554515397', { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);
const qs = plan.generationContext?.questionnaireSnapshot || {};
console.log(`📅 État actuel plan Arnaud (1779554515397) :`);
console.log(`  plan.startDate stocké : ${plan.startDate}`);
console.log(`  plan.endDate : ${plan.endDate}`);
console.log(`  plan.raceDate : ${plan.raceDate} ← demande user ?`);
console.log(`  questionnaireSnapshot.startDate user input : ${qs.startDate}`);
console.log(`  questionnaireSnapshot.raceDate user input : ${qs.raceDate}`);
console.log(`  questionnaireSnapshot.preferredDays : ${JSON.stringify(qs.preferredDays)}`);
console.log(`\n📅 Simul front alignToMonday(plan.startDate) :`);
const sd = new Date(plan.startDate);
console.log(`  startDate parsed : ${sd.toISOString()}`);
console.log(`  startDate getDay() : ${sd.getDay()} (0=dim, 6=sam)`);
const day = sd.getDay();
const diff = day === 0 ? -6 : 1 - day;
const aligned = new Date(sd);
aligned.setDate(sd.getDate() + diff);
console.log(`  aligned ${diff > 0 ? '+' : ''}${diff} → ${aligned.toISOString().split('T')[0]} (lun précédent)`);
console.log(`  S1 J1 (Lundi) front affiche : ${aligned.toISOString().split('T')[0]}`);
console.log(`  S1 J3 (Jeudi) front affiche : ${new Date(aligned.getTime() + 3*86400000).toISOString().split('T')[0]}`);
