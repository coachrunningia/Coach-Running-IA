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
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/1779489509164`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);
const weeks = plan.weeks || [];
console.log(`Plan 1 — 126 km Olivier — startDate ${plan.startDate} | weeks count: ${weeks.length}`);
console.log(`isPreview: ${plan.isPreview} | fullPlanGenerated: ${plan.fullPlanGenerated}`);
console.log(`Total séances S1-S${weeks.length}:`);
for (let i = 0; i < weeks.length; i++) {
  const sessions = weeks[i].sessions || [];
  const totalKm = sessions.reduce((acc, s) => acc + (parseFloat(String(s.distance||'0').replace(/[^\d.]/g,'')) || 0), 0);
  console.log(`  S${i+1} (${weeks[i].phase}): ${sessions.length} séances, ${totalKm.toFixed(1)} km`);
  for (const s of sessions) {
    console.log(`     ${s.type} | ${s.title} | ${s.distance} | ${s.targetPace}`);
  }
}
