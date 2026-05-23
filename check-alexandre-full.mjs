import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/1779381807357`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();

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
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

console.log('🔑 ROOT KEYS:', Object.keys(plan).sort().join(', '));
console.log('');

// Cherche tout ce qui pourrait être questionnaire-related
for (const key of Object.keys(plan)) {
  if (key.toLowerCase().includes('quest') || key.toLowerCase().includes('input') || key.toLowerCase().includes('data') || key.toLowerCase().includes('context')) {
    console.log(`🔍 ${key}:`, JSON.stringify(plan[key], null, 2).slice(0, 800));
    console.log('');
  }
}

console.log('🎯 generationContext:', JSON.stringify(plan.generationContext, null, 2).slice(0, 1500));
console.log('');
console.log('👤 user info:', plan.userId, '|', plan.userEmail, '|', plan.userName);
console.log('🏁 Target/distance fields:', plan.targetTime, '|', plan.target, '|', plan.targetHyrox, '|', plan.distance);
console.log('📊 planDurationWeeks:', plan.planDurationWeeks, '| totalWeeks:', plan.totalWeeks);
console.log('');
if (plan.feasibility) {
  console.log('✅ FEASIBILITY :');
  console.log('  status :', plan.feasibility.status);
  console.log('  message:', (plan.feasibility.message || '').slice(0, 400));
}
console.log('');
if (plan.welcomeMessage) {
  console.log('💬 WELCOMEMESSAGE (extrait 600 chars) :');
  console.log(plan.welcomeMessage.slice(0, 600));
}
