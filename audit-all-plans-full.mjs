import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const getStr  = f => f?.stringValue;
const getNum  = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getBool = f => f?.booleanValue;
const getArr  = f => f?.arrayValue?.values || [];
const getMap  = f => f?.mapValue?.fields || {};
const getTs   = f => f?.timestampValue;
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

// Plans loaded from previous dump
const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans.json', 'utf-8'));

// Get unique userIds from plans (need re-fetch since not in initial dump)
console.log(`Fetching userId for ${plans.length} plans...`);
const planUids = new Map();
const chunks = (a, n) => Array.from({length: Math.ceil(a.length/n)}, (_, i) => a.slice(i*n, i*n+n));
for (const batch of chunks(plans, 20)) {
  await Promise.all(batch.map(async p => {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}?mask.fieldPaths=userId`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const j = await r.json();
    planUids.set(p.id, getStr(j.fields?.userId));
  }));
}

const uniqueUids = [...new Set([...planUids.values()].filter(Boolean))];
console.log(`Fetching ${uniqueUids.length} unique users...`);
const userData = new Map();
for (const batch of chunks(uniqueUids, 15)) {
  await Promise.all(batch.map(async uid => {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) return;
    const j = await r.json();
    const qd = getMap(j.fields?.questionnaireData);
    if (!qd || Object.keys(qd).length === 0) return;
    const injMap = getMap(qd.injuries);
    const raceMap = getMap(qd.recentRaceTimes);
    const trailMap = getMap(qd.trailDetails);
    userData.set(uid, {
      age: getNum(qd.age),
      sex: getStr(qd.sex),
      weight: getNum(qd.weight),
      height: getNum(qd.height),
      currentWeeklyVolume: getNum(qd.currentWeeklyVolume),
      currentWeeklyElevation: getNum(qd.currentWeeklyElevation),
      level: getStr(qd.level),
      frequency: getNum(qd.frequency),
      goal: getStr(qd.goal),
      subGoal: getStr(qd.subGoal),
      targetTime: getStr(qd.targetTime),
      city: getStr(qd.city),
      preferredDays: getArr(qd.preferredDays).map(getStr),
      hasInjury: getBool(injMap.hasInjury),
      injuryDescription: getStr(injMap.description),
      trailDistance: getNum(trailMap.distance),
      trailElevation: getNum(trailMap.elevation),
      chrono5km: getStr(raceMap.distance5km),
      chrono10km: getStr(raceMap.distance10km),
      chronoSemi: getStr(raceMap.distanceHalfMarathon),
      chronoMarathon: getStr(raceMap.distanceMarathon),
      vma: getNum(qd.vma),
    });
  }));
}

// Merge
const enriched = plans.map(p => ({
  ...p,
  userId: planUids.get(p.id),
  user: userData.get(planUids.get(p.id)) || null
}));

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', JSON.stringify(enriched, null, 2));
console.log(`\nEnriched dump: ${enriched.length} plans`);
console.log(`With user data: ${enriched.filter(p => p.user).length}`);
console.log(`Without: ${enriched.filter(p => !p.user).length}`);

// Quick summary
const withInjury = enriched.filter(p => p.user?.hasInjury);
console.log(`\nPlans avec blessure déclarée: ${withInjury.length}`);
withInjury.slice(0,10).forEach(p => console.log(`  - ${p.userEmail} | ${p.user.injuryDescription?.substring(0,80)} | peak=${p.periodization.actualPeak} feas=${p.feasibility}/${p.score}`));
