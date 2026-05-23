import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const planId = '1779397206122';

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
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

console.log('🆔 PLAN ARNAUD TRAIL (preview)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`planId : ${planId}`);
console.log(`name : ${plan.name}`);
console.log(`goal : ${plan.goal}`);
console.log(`raceDate : ${plan.raceDate}`);
console.log(`startDate : ${plan.startDate}`);
console.log(`endDate : ${plan.endDate}`);
console.log(`durationWeeks : ${plan.durationWeeks}`);
console.log(`isPreview : ${plan.isPreview}`);
console.log(`fullPlanGenerated : ${plan.fullPlanGenerated}`);
console.log(`createdAt : ${doc.createTime}`);
console.log(`updateTime : ${doc.updateTime}`);
console.log('');

const qs = plan.generationContext?.questionnaireSnapshot || {};
console.log('📋 QUESTIONNAIRE :');
console.log(JSON.stringify(qs, null, 2));

console.log('');
console.log('📊 PÉRIODISATION :');
const p = plan.generationContext?.periodizationPlan || {};
console.log(`   totalWeeks: ${p.totalWeeks}`);
console.log(`   weeklyVolumes: ${JSON.stringify(p.weeklyVolumes)}`);
console.log(`   weeklyPhases: ${JSON.stringify(p.weeklyPhases)}`);

const weeks = plan.weeks || [];
console.log(`\n📅 SEMAINES GÉNÉRÉES : ${weeks.length}`);
for (let i = 0; i < weeks.length; i++) {
  const w = weeks[i];
  const sessions = w.sessions || [];
  console.log(`\nS${i+1} (${w.phase || '?'}) — ${sessions.length} séances :`);
  for (const s of sessions) {
    console.log(`   • ${s.type} — ${s.title || ''} | dist: ${s.distance} | dur: ${s.duration} | pace: ${s.targetPace}`);
  }
}

console.log('');
console.log('🎯 FEASIBILITY :');
if (plan.feasibility) {
  console.log(`   status: ${plan.feasibility.status}`);
  console.log(`   message: ${(plan.feasibility.message || '').slice(0, 400)}`);
}

console.log('');
console.log('💬 WELCOME (200 chars):');
console.log((plan.welcomeMessage || '').slice(0, 400));

// Strava
console.log('\n🏃 STRAVA :');
console.log(`   stravaActivities (top-level): ${plan.stravaActivities ? 'présent' : 'absent'}`);
const stravaInSession = (plan.weeks?.[0]?.sessions || []).some(s => s.stravaActivityId);
console.log(`   stravaActivityId in S1 sessions: ${stravaInSession ? 'présent' : 'absent'}`);
