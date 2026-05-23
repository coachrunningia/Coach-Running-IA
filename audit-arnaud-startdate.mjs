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
async function runQuery(q) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: q })
  });
  return await r.json();
}

// Get all plans by userEmail
const userId = '0wVykixEIWWVl8p9SbUyuYLoM6h1';
const r = await runQuery({
  from: [{ collectionId: 'plans' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 20
});
const plans = (r || []).filter(x => x.document);
console.log(`\n📋 Plans Arnaud (uid ${userId}) : ${plans.length}\n`);
for (const d of plans) {
  const f = {};
  for (const [k, v] of Object.entries(d.document.fields || {})) f[k] = parseFs(v);
  const qs = f.generationContext?.questionnaireSnapshot || {};
  console.log(`─── ${d.document.name.split('/').pop()} ───`);
  console.log(`  name : ${f.name}`);
  console.log(`  goal : ${f.goal} | subGoal : ${qs.subGoal}`);
  console.log(`  createdAt firestore : ${d.document.createTime}`);
  console.log(`  startDate stocké : ${f.startDate}`);
  console.log(`  raceDate : ${f.raceDate}`);
  console.log(`  durationWeeks : ${f.durationWeeks}`);
  console.log(`  isPreview : ${f.isPreview} | fullPlanGenerated : ${f.fullPlanGenerated}`);
  console.log(`  questionnaireSnapshot.startDate : ${qs.startDate}`);
  console.log(`  questionnaireSnapshot.raceDate : ${qs.raceDate}`);
}
