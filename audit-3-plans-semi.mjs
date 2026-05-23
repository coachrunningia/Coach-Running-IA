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

for (const planId of ['1779531199512', '1778921428769', '1779530587006']) {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`PLAN ${planId}`);
  console.log(`═══════════════════════════════════════`);
  const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const doc = await res.json();
  if (doc.error) { console.log(`❌ ${doc.error.code} ${doc.error.message}`); continue; }
  if (!doc.fields) { console.log('❌ Pas de fields'); continue; }
  const plan = {};
  for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);
  
  console.log(`name : ${plan.name}`);
  console.log(`goal : ${plan.goal} | userEmail : ${plan.userEmail}`);
  console.log(`raceDate : ${plan.raceDate} | startDate : ${plan.startDate} | createdAt : ${doc.createTime}`);
  console.log(`isPreview : ${plan.isPreview} | fullPlanGenerated : ${plan.fullPlanGenerated}`);
  console.log(`durationWeeks : ${plan.durationWeeks}`);

  const qs = plan.generationContext?.questionnaireSnapshot || {};
  console.log(`\nINPUTS:`);
  console.log(`  age:${qs.age} sex:${qs.sex} ${qs.height}/${qs.weight}kg | level:${qs.level} freq:${qs.frequency}`);
  console.log(`  cv:${qs.currentWeeklyVolume} | vma:${qs.vma} | targetTime:${qs.targetTime}`);
  console.log(`  recentRaceTimes:${JSON.stringify(qs.recentRaceTimes)}`);
  console.log(`  injuries:${JSON.stringify(qs.injuries)}`);

  const paces = plan.paces || plan.generationContext?.paces || {};
  console.log(`\nALLURES:`);
  for (const [k, v] of Object.entries(paces)) console.log(`  ${k}: ${v}`);

  const p = plan.generationContext?.periodizationPlan || {};
  console.log(`\nPÉRIODISATION:`);
  console.log(`  totalWeeks:${p.totalWeeks}`);
  console.log(`  weeklyVolumes:${JSON.stringify(p.weeklyVolumes)}`);
  console.log(`  weeklyPhases:${JSON.stringify(p.weeklyPhases)}`);
  if (p.weeklyVolumes) {
    console.log(`  Pic:${Math.max(...p.weeklyVolumes)}km | Ratio pic/cv:${(Math.max(...p.weeklyVolumes)/(qs.currentWeeklyVolume||1)).toFixed(2)} | Ratio pic/distance:${(Math.max(...p.weeklyVolumes)/21.1).toFixed(2)}`);
  }

  console.log(`\nFEASIBILITY: ${plan.feasibility?.status} | confidence:${plan.confidenceScore}`);
  console.log(`  message:${(plan.feasibility?.message || '').slice(0, 500)}`);

  const weeks = plan.weeks || [];
  console.log(`\nSEMAINES GÉNÉRÉES: ${weeks.length}`);
  if (weeks[0]) {
    const w = weeks[0];
    console.log(`\n── S1 (${w.phase}) :`);
    for (const s of (w.sessions || [])) {
      const dist = parseFloat(String(s.distance||'0').replace(/[^\d.]/g,'')) || 0;
      const dur = s.duration || '?';
      // Parse duration "50 min" or "1h 30 min" or "60 min"
      let durMin = 0;
      const m = String(dur).match(/(?:(\d+)h)?\s*(\d+)?\s*min/);
      if (m) { durMin = parseInt(m[1]||'0')*60 + parseInt(m[2]||'0'); }
      const paceStr = String(s.targetPace || '');
      const paceMatch = paceStr.match(/(\d+):(\d+)/);
      let paceDecimal = 0;
      if (paceMatch) paceDecimal = parseInt(paceMatch[1]) + parseInt(paceMatch[2])/60;
      const expectedDist = paceDecimal > 0 ? (durMin / paceDecimal) : 0;
      const inconsistency = paceDecimal > 0 && dist > 0 ? Math.abs(dist - expectedDist) / expectedDist * 100 : 0;
      console.log(`  • ${s.type} — ${s.title}`);
      console.log(`    dist=${s.distance} | dur=${s.duration} | pace=${s.targetPace}`);
      if (paceDecimal > 0 && dist > 0) {
        console.log(`    ▶ Calcul : ${durMin}min / ${paceDecimal.toFixed(2)}min/km = ${expectedDist.toFixed(2)}km vs affiché ${dist}km (écart ${inconsistency.toFixed(0)}%)`);
      }
    }
  }
  
  console.log(`\nWELCOME (300 chars):`);
  console.log((plan.welcomeMessage || '').slice(0, 600));
}
