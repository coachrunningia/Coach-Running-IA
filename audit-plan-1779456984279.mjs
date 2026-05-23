import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const planId = '1779456984279';

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
for (const [k, v] of Object.entries(doc.fields || {})) plan[k] = parseFs(v);

console.log('═══════════════════════════════════════');
console.log(`PLAN ${planId}`);
console.log('═══════════════════════════════════════');
console.log(`userEmail : ${plan.userEmail}`);
console.log(`name : ${plan.name}`);
console.log(`goal : ${plan.goal}`);
console.log(`raceDate : ${plan.raceDate}`);
console.log(`startDate : ${plan.startDate}`);
console.log(`createdAt : ${doc.createTime}`);
console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated}`);
console.log(`durationWeeks : ${plan.durationWeeks}`);

const qs = plan.generationContext?.questionnaireSnapshot || {};
console.log('\n📋 INPUTS :');
console.log(`  age:${qs.age} sex:${qs.sex} ${qs.height}/${qs.weight}kg`);
console.log(`  level:${qs.level} | freq:${qs.frequency}`);
console.log(`  currentWeeklyVolume:${qs.currentWeeklyVolume}`);
console.log(`  vma:${qs.vma}`);
console.log(`  targetTime:${qs.targetTime}`);
console.log(`  recentRaceTimes: ${JSON.stringify(qs.recentRaceTimes)}`);
console.log(`  injuries: ${JSON.stringify(qs.injuries)}`);
console.log(`  comments: ${qs.comments || '(vide)'}`);
console.log(`  preferredDays: ${JSON.stringify(qs.preferredDays)}`);

const paces = plan.paces || plan.generationContext?.paces || {};
console.log('\n🏃 ALLURES :');
for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);

const periodization = plan.generationContext?.periodizationPlan || {};
console.log('\n📊 PÉRIODISATION :');
console.log(`  totalWeeks: ${periodization.totalWeeks}`);
console.log(`  weeklyVolumes: ${JSON.stringify(periodization.weeklyVolumes)}`);
console.log(`  weeklyPhases: ${JSON.stringify(periodization.weeklyPhases)}`);
const vols = periodization.weeklyVolumes || [];
if (vols.length > 0) {
  console.log(`  Pic: ${Math.max(...vols)} km | Plancher: ${Math.min(...vols)} km`);
  console.log(`  Ratio S1/cv: ${(vols[0]/qs.currentWeeklyVolume).toFixed(2)} (cv=${qs.currentWeeklyVolume})`);
  console.log(`  Ratio pic/cv: ${(Math.max(...vols)/qs.currentWeeklyVolume).toFixed(2)}`);
}

console.log('\n🎯 FEASIBILITY :');
console.log(`  status: ${plan.feasibility?.status} | confidenceScore: ${plan.confidenceScore}`);
console.log(`  message: ${plan.feasibility?.message?.slice(0, 500)}`);

const weeks = plan.weeks || [];
console.log(`\n📅 SEMAINES GÉNÉRÉES: ${weeks.length}`);
if (weeks[0]) {
  const w = weeks[0];
  const sessions = w.sessions || [];
  let total = 0;
  for (const s of sessions) total += parseFloat(String(s.distance||'0').replace(/[^\d.]/g,'')) || 0;
  console.log(`\n──── S1 (${w.phase}) — ${total.toFixed(1)} km / ${sessions.length} séances ────`);
  for (const s of sessions) {
    console.log(`  • ${s.type} — ${s.title}`);
    console.log(`    dist=${s.distance} | dur=${s.duration} | pace=${s.targetPace}`);
    if (s.mainSet) console.log(`    mainSet: ${String(s.mainSet).slice(0, 250)}`);
  }
}

console.log('\n💬 WELCOME (700 chars):');
console.log((plan.welcomeMessage || '').slice(0, 1000));
