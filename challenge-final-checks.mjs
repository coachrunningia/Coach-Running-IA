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

function full(p, lbl) {
  console.log(`\n=== ${lbl} TOP-LEVEL ===`);
  const f = p.fields;
  console.log('distance:', fromFs(f.distance));
  console.log('durationWeeks:', fromFs(f.durationWeeks));
  console.log('raceDate:', fromFs(f.raceDate));
  console.log('startDate:', fromFs(f.startDate));
  console.log('endDate:', fromFs(f.endDate));
  console.log('isPreview:', fromFs(f.isPreview));
  console.log('fullPlanGenerated:', fromFs(f.fullPlanGenerated));
  console.log('userId:', fromFs(f.userId));
  console.log('userEmail:', fromFs(f.userEmail));
  console.log('name:', fromFs(f.name));
  console.log('goal:', fromFs(f.goal));
  console.log('targetTime:', fromFs(f.targetTime));
  console.log('vmaSource:', fromFs(f.vmaSource));

  // adaptationLog
  const al = fromFs(f.adaptationLog);
  console.log('adaptationLog:', JSON.stringify(al));

  // suggestedLocations
  const sl = fromFs(f.suggestedLocations);
  if (sl) console.log('suggestedLocations: (count=', Array.isArray(sl) ? sl.length : '?', ')');

  // feasibility complet
  const fe = fromFs(f.feasibility);
  console.log('feasibility keys:', Object.keys(fe || {}).join(', '));
  console.log('  recommendation present:', !!fe?.recommendation);
  if (fe?.recommendation) console.log('  recommendation (200c):', fe.recommendation.slice(0, 200));

  // weeks[0] structure
  const weeks = fromFs(f.weeks) || [];
  if (weeks[0]) {
    const w0 = weeks[0];
    console.log('weeks[0] keys:', Object.keys(w0).join(', '));
    console.log('weeks[0].weekNumber:', w0.weekNumber);
    console.log('weeks[0].phase:', w0.phase);
    console.log('weeks[0].isRecoveryWeek:', w0.isRecoveryWeek);
    console.log('weeks[0].totalKm:', w0.totalKm);
    console.log('weeks[0].totalElevation:', w0.totalElevation);
    console.log('weeks[0].sessions[0] keys:', Object.keys(w0.sessions[0] || {}).join(', '));
  }
}

full(p1, 'PLAN 1');
full(p2, 'PLAN 2');

// Vérifier IDs sessions Plan 1 vs Plan 2 - format ?
console.log('\n=== SESSION IDs S1 ===');
for (const [label, p] of [['P1', p1], ['P2', p2]]) {
  const sessions = fromFs(p.fields.weeks)?.[0]?.sessions || [];
  for (const s of sessions) {
    console.log(`  ${label} ${s.day}: id=${s.id}`);
  }
}

// Vérifier le contexte initial - input client respecté ?
console.log('\n=== INPUT CLIENT RESPECTÉ ? ===');
const gc1 = fromFs(p1.fields.generationContext);
const gc2 = fromFs(p2.fields.generationContext);
console.log('Plan 1: currentWeeklyVolume input=', gc1?.questionnaireSnapshot?.currentWeeklyVolume, '| S1 effectif=', gc1?.periodizationPlan?.weeklyVolumes?.[0]);
console.log('Plan 1: currentWeeklyElevation input=', gc1?.questionnaireSnapshot?.currentWeeklyElevation, '| S1 D+ effectif=', gc1?.periodizationPlan?.weeklyElevationTarget?.[0]);
console.log('Plan 2: currentWeeklyVolume input=', gc2?.questionnaireSnapshot?.currentWeeklyVolume, '| S1 effectif=', gc2?.periodizationPlan?.weeklyVolumes?.[0]);
console.log('Plan 2: currentWeeklyElevation input=', gc2?.questionnaireSnapshot?.currentWeeklyElevation, '| S1 D+ effectif=', gc2?.periodizationPlan?.weeklyElevationTarget?.[0]);
