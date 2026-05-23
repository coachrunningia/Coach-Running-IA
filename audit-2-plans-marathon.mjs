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

for (const planId of ['1778927329896', '1779538939602']) {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`PLAN ${planId}`);
  console.log(`═══════════════════════════════════════`);
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const doc = await res.json();
  if (doc.error) { console.log(`❌ ${doc.error.code} ${doc.error.message}`); continue; }
  const plan = {};
  for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

  console.log(`name : ${plan.name}`);
  console.log(`goal : ${plan.goal} | userEmail : ${plan.userEmail}`);
  console.log(`raceDate : ${plan.raceDate} | startDate : ${plan.startDate} | createdAt : ${doc.createTime}`);
  console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated} | durationWeeks : ${plan.durationWeeks}`);

  const qs = plan.generationContext?.questionnaireSnapshot || {};
  console.log(`\nINPUTS:`);
  console.log(`  age:${qs.age} sex:${qs.sex} | level:${qs.level} freq:${qs.frequency}`);
  console.log(`  cv:${qs.currentWeeklyVolume} | vma:${qs.vma} | targetTime:${qs.targetTime}`);
  console.log(`  vmaSource:${plan.vmaSource || plan.generationContext?.vmaSource || qs.vmaSource}`);
  console.log(`  recentRaceTimes:${JSON.stringify(qs.recentRaceTimes)}`);

  const paces = plan.paces || plan.generationContext?.paces || {};
  console.log(`\nALLURES:`);
  for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);

  const p = plan.generationContext?.periodizationPlan || {};
  console.log(`\nPÉRIODISATION:`);
  console.log(`  weeklyVolumes:${JSON.stringify(p.weeklyVolumes)}`);
  console.log(`  weeklyPhases:${JSON.stringify(p.weeklyPhases)}`);
  if (p.weeklyVolumes) {
    const pic = Math.max(...p.weeklyVolumes);
    console.log(`  Pic:${pic} | Ratio pic/cv:${(pic/(qs.currentWeeklyVolume||1)).toFixed(2)}`);
  }

  console.log(`\nFEASIBILITY: ${plan.feasibility?.status} | confidence:${plan.confidenceScore}`);
  console.log(`  message:${(plan.feasibility?.message || '').slice(0, 400)}`);

  const weeks = plan.weeks || [];
  console.log(`\nSEMAINES GÉNÉRÉES: ${weeks.length}`);
  if (weeks[0]) {
    const w = weeks[0];
    console.log(`\n── S1 (${w.phase}) :`);
    for (const s of (w.sessions || [])) {
      console.log(`  • ${s.type} — ${s.title}`);
      console.log(`    dist=${s.distance} | dur=${s.duration} | pace=${s.targetPace}`);
    }
  }

  console.log(`\nWELCOME (200 chars):`);
  console.log((plan.welcomeMessage || '').slice(0, 400));
}
