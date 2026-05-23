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
for (const planId of ['1779071910169', '1779563548769']) {
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
  console.log(`userEmail : ${plan.userEmail}`);
  console.log(`raceDate : ${plan.raceDate} | startDate : ${plan.startDate} | createdAt : ${doc.createTime}`);
  console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated}`);
  const qs = plan.generationContext?.questionnaireSnapshot || {};
  console.log(`\nINPUTS: age:${qs.age} ${qs.sex} ${qs.height}/${qs.weight}kg | level:${qs.level} freq:${qs.frequency}`);
  console.log(`  cv:${qs.currentWeeklyVolume} | vma:${qs.vma} | targetTime:${qs.targetTime}`);
  console.log(`  recentRaceTimes:${JSON.stringify(qs.recentRaceTimes)}`);
  console.log(`  injuries:${JSON.stringify(qs.injuries)}`);
  const paces = plan.paces || plan.generationContext?.paces || {};
  console.log(`\nALLURES:`);
  for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);
  const p = plan.generationContext?.periodizationPlan || {};
  console.log(`\nweeklyVolumes:${JSON.stringify(p.weeklyVolumes)}`);
  console.log(`weeklyPhases:${JSON.stringify(p.weeklyPhases)}`);
  console.log(`\nFEASIBILITY: ${plan.feasibility?.status} | confidence:${plan.confidenceScore}`);
  const weeks = plan.weeks || [];
  if (weeks[0]) {
    console.log(`\n── S1 (${weeks[0].phase}) :`);
    for (const s of (weeks[0].sessions || [])) {
      console.log(`  • ${s.type} — ${s.title}`);
      console.log(`    dist=${s.distance} | dur=${s.duration} | pace=${s.targetPace}`);
      if (s.mainSet) console.log(`    mainSet=${String(s.mainSet).slice(0, 120)}`);
    }
  }
  console.log(`\nWELCOME (400):`);
  console.log((plan.welcomeMessage || '').slice(0, 800));
}
