import fs from 'fs';
const p1 = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan1.json','utf8'));
const p2 = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan2.json','utf8'));

const fromFs = (v) => {
  if (!v) return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o={}; for (const k of Object.keys(v.mapValue.fields||{})) o[k]=fromFs(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromFs);
  return v;
};

function summary(p, label) {
  const weeks = fromFs(p.fields.weeks) || [];
  const s1 = weeks[0]?.sessions || [];
  console.log(`\n=== ${label} S1 SESSIONS DÉTAIL ===`);
  for (const s of s1) {
    console.log(`  ${s.day} | type=${s.type} | title=${s.title || '?'} | dist=${s.distance} | dur=${s.duration} | D+=${s.elevationGain} | targetPace=${s.targetPace || '-'}`);
    console.log(`    mainSet: ${(s.mainSet||'').slice(0,200)}`);
  }
  // VMA
  const vma = fromFs(p.fields.vma);
  const calc = fromFs(p.fields.calculatedVMA);
  console.log(`  VMA: ${vma} | calculatedVMA: ${calc}`);
  // raceDate
  const rd = fromFs(p.fields.raceDate);
  const sd = fromFs(p.fields.startDate);
  const ed = fromFs(p.fields.endDate);
  console.log(`  startDate: ${sd} | endDate: ${ed} | raceDate: ${rd}`);
  // location
  const loc = fromFs(p.fields.location);
  console.log(`  location: ${loc}`);
  // sessionsPerWeek
  const spw = fromFs(p.fields.sessionsPerWeek);
  console.log(`  sessionsPerWeek: ${spw}`);
  // generationContext - questionnaireSnapshot
  const gc = fromFs(p.fields.generationContext);
  console.log(`  GC keys: ${Object.keys(gc || {}).join(', ')}`);
  if (gc?.questionnaireSnapshot) {
    const qs = gc.questionnaireSnapshot;
    console.log(`  QS: age=${qs.age} | level=${qs.level} | goal=${qs.goal} | currentWeeklyVolume=${qs.currentWeeklyVolume} | currentWeeklyElevation=${qs.currentWeeklyElevation || qs.dPlusBackground}`);
    console.log(`  QS trailDetails: ${JSON.stringify(qs.trailDetails)}`);
    console.log(`  QS preferredDays: ${JSON.stringify(qs.preferredDays)}`);
    console.log(`  QS preferredLongRunDay: ${qs.preferredLongRunDay}`);
    console.log(`  QS frequency: ${qs.frequency}`);
    console.log(`  QS targetTime: ${qs.targetTime}`);
  }
  // periodizationPlan
  const pp = gc?.periodizationPlan;
  if (pp) {
    console.log(`  PP keys: ${Object.keys(pp).join(', ')}`);
    console.log(`  PP recoveryWeeks: ${JSON.stringify(pp.recoveryWeeks)}`);
    console.log(`  PP weeklyPhases (sample): ${JSON.stringify((pp.weeklyPhases||[]).slice(0,5))}`);
    console.log(`  PP totalWeeks: ${pp.totalWeeks}`);
  }
}

summary(p1, 'PLAN 1 (13 sem)');
summary(p2, 'PLAN 2 (19 sem)');

// Comparaison paces
const paces1 = fromFs(p1.fields.paces);
const paces2 = fromFs(p2.fields.paces);
console.log('\n=== COMPARAISON PACES ===');
const allKeys = new Set([...Object.keys(paces1||{}), ...Object.keys(paces2||{})]);
for (const k of allKeys) {
  const v1 = paces1?.[k] || '-';
  const v2 = paces2?.[k] || '-';
  console.log(`  ${k.padEnd(28)}: P1=${v1.padEnd(8)} | P2=${v2.padEnd(8)} | ${v1===v2 ? 'SAME' : 'DIFF'}`);
}
