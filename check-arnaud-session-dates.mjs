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
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/1779554515397`;
const doc = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);
console.log(`plan.startDate stocké : ${plan.startDate}`);
console.log(`plan.endDate : ${plan.endDate}`);
console.log(`questionnaireSnapshot.startDate : ${plan.generationContext?.questionnaireSnapshot?.startDate}`);
const weeks = plan.weeks || [];
for (let i = 0; i < Math.min(weeks.length, 3); i++) {
  console.log(`\nS${i+1} sessions :`);
  for (const s of (weeks[i].sessions || [])) {
    console.log(`  ${s.type} | dayDate=${s.dayDate || s.date} | day=${s.day} | title=${s.title}`);
  }
}
