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

const planIds = ['1779489509164', '1771207028541', '1775329941173'];

for (const planId of planIds) {
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const doc = await res.json();
  const plan = {};
  for (const [k, v] of Object.entries(doc.fields || {})) plan[k] = parseFs(v);

  console.log('\n═══════════════════════════════════════════════');
  console.log(`PLAN ${planId} — ${plan.name}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`userEmail : ${plan.userEmail}`);
  console.log(`goal : ${plan.goal}`);
  console.log(`raceDate : ${plan.raceDate} | startDate : ${plan.startDate}`);
  console.log(`createdAt : ${doc.createTime}`);
  console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated}`);
  console.log(`durationWeeks : ${plan.durationWeeks}`);

  const qs = plan.generationContext?.questionnaireSnapshot || {};
  console.log('\n📋 INPUTS :');
  console.log(`  age:${qs.age} sex:${qs.sex} ${qs.height}/${qs.weight}kg`);
  console.log(`  level:${qs.level} | freq:${qs.frequency} | preferredDays:${JSON.stringify(qs.preferredDays)}`);
  console.log(`  cv:${qs.currentWeeklyVolume} km/sem | D+ actuel:${qs.currentWeeklyElevation} m/sem`);
  console.log(`  vma:${qs.vma}`);
  console.log(`  targetTime:${qs.targetTime}`);
  console.log(`  trailDetails:${JSON.stringify(qs.trailDetails)}`);
  console.log(`  city:${qs.city}`);
  console.log(`  recentRaceTimes:${JSON.stringify(qs.recentRaceTimes)}`);
  console.log(`  injuries:${JSON.stringify(qs.injuries)}`);

  const paces = plan.paces || plan.generationContext?.paces || {};
  console.log('\n🏃 ALLURES :');
  for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);

  const p = plan.generationContext?.periodizationPlan || {};
  console.log('\n📊 PÉRIODISATION :');
  console.log(`  totalWeeks:${p.totalWeeks}`);
  console.log(`  weeklyVolumes:${JSON.stringify(p.weeklyVolumes)}`);
  console.log(`  weeklyPhases:${JSON.stringify(p.weeklyPhases)}`);
  console.log(`  weeklyElevationTarget:${JSON.stringify(p.weeklyElevationTarget)}`);
  const vols = p.weeklyVolumes || [];
  if (vols.length > 0) {
    console.log(`  Pic km:${Math.max(...vols)} | Ratio pic/cv:${(Math.max(...vols)/(qs.currentWeeklyVolume||1)).toFixed(2)}`);
    if (qs.trailDetails?.distance) console.log(`  Ratio pic/distance_course:${(Math.max(...vols)/qs.trailDetails.distance).toFixed(2)}`);
  }

  console.log('\n🎯 FEASIBILITY :');
  console.log(`  status:${plan.feasibility?.status} | confidence:${plan.confidenceScore}`);
  console.log(`  message:${(plan.feasibility?.message || '').slice(0, 600)}`);

  const weeks = plan.weeks || [];
  console.log(`\n📅 SEMAINES:${weeks.length}`);
  if (weeks[0]) {
    const w = weeks[0];
    console.log(`\n── S1 (${w.phase}) :`);
    for (const s of (w.sessions || [])) {
      console.log(`  • [${s.dayDate || '?'}] ${s.type} — ${s.title || ''}`);
      console.log(`    dist:${s.distance} | dur:${s.duration} | pace:${s.targetPace} | D+:${s.elevation || s.elevationGain || '?'}`);
      if (s.mainSet) console.log(`    mainSet:${String(s.mainSet).slice(0, 180)}`);
    }
  }

  console.log('\n💬 WELCOME (400 chars):');
  console.log((plan.welcomeMessage || '').slice(0, 800));
}
