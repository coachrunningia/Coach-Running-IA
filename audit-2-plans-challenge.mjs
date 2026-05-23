import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';

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

const planIds = ['1779433945589', '1779433173116'];

for (const planId of planIds) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const doc = await res.json();
  const plan = {};
  for (const [k, v] of Object.entries(doc.fields || {})) plan[k] = parseFs(v);
  
  console.log('═══════════════════════════════════════════════');
  console.log(`📋 PLAN ${planId}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`name : ${plan.name}`);
  console.log(`goal : ${plan.goal}`);
  console.log(`userEmail : ${plan.userEmail}`);
  console.log(`raceDate : ${plan.raceDate}`);
  console.log(`startDate : ${plan.startDate}`);
  console.log(`createdAt : ${doc.createTime}`);
  console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated}`);
  console.log(`durationWeeks : ${plan.durationWeeks}`);
  
  const qs = plan.generationContext?.questionnaireSnapshot || {};
  console.log('\n📝 INPUTS QUESTIONNAIRE :');
  console.log(`  age : ${qs.age}`);
  console.log(`  sex : ${qs.sex}`);
  console.log(`  height : ${qs.height} | weight : ${qs.weight}`);
  console.log(`  level : ${qs.level}`);
  console.log(`  frequency : ${qs.frequency}`);
  console.log(`  currentWeeklyVolume : ${qs.currentWeeklyVolume}`);
  console.log(`  currentWeeklyElevation : ${qs.currentWeeklyElevation}`);
  console.log(`  vma : ${qs.vma}`);
  console.log(`  targetTime : ${qs.targetTime}`);
  console.log(`  recentRaceTimes : ${JSON.stringify(qs.recentRaceTimes)}`);
  console.log(`  injuries : ${JSON.stringify(qs.injuries)}`);
  console.log(`  comments : ${qs.comments || '(vide)'}`);
  console.log(`  trailDetails : ${JSON.stringify(qs.trailDetails || null)}`);
  
  const paces = plan.paces || plan.generationContext?.paces || {};
  console.log('\n🏃 ALLURES :');
  for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);
  
  const periodization = plan.generationContext?.periodizationPlan || {};
  console.log('\n📊 PÉRIODISATION :');
  console.log(`  totalWeeks : ${periodization.totalWeeks}`);
  console.log(`  weeklyVolumes : ${JSON.stringify(periodization.weeklyVolumes)}`);
  console.log(`  weeklyPhases : ${JSON.stringify(periodization.weeklyPhases)}`);
  
  if (plan.feasibility) {
    console.log('\n🎯 FEASIBILITY :');
    console.log(`  status : ${plan.feasibility.status}`);
    console.log(`  confidenceScore : ${plan.confidenceScore}`);
    console.log(`  message : ${plan.feasibility.message?.slice(0, 600)}`);
  }
  
  // S1 details
  const weeks = plan.weeks || [];
  console.log(`\n📅 SEMAINES GÉNÉRÉES : ${weeks.length}`);
  if (weeks[0]) {
    const w = weeks[0];
    const sessions = w.sessions || [];
    const totalKm = sessions.reduce((acc, s) => acc + (parseFloat(String(s.distance || '0').replace(/[^\d.]/g, '')) || 0), 0);
    console.log(`\n  ──── S1 (${w.phase}) — ${totalKm.toFixed(1)} km / ${sessions.length} séances ────`);
    for (const s of sessions) {
      console.log(`    • ${s.type} — ${s.title}`);
      console.log(`      dist: ${s.distance} | dur: ${s.duration} | pace: ${s.targetPace}`);
      if (s.mainSet) console.log(`      mainSet: ${String(s.mainSet).slice(0, 180)}`);
    }
  }
  
  // Welcome msg
  console.log('\n💬 WELCOME (300 chars):');
  console.log((plan.welcomeMessage || '').slice(0, 600));
  
  console.log('\n\n');
}
