import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const getStr = f => f?.stringValue;
const getNum = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getArr = f => f?.arrayValue?.values || [];
const getMap = f => f?.mapValue?.fields || {};
const getBool = f => f?.booleanValue;
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

// 5 plans cibles depuis INVESTIGATION-CAP-VOLUME-EXPERT.md §6
const TARGETS = [
  { planId: '1773143911561', email: 'lafleur666@yahoo.fr' },
  { planId: '1772961018568', email: 'chapeaujean@yahoo.fr' },
  { planId: '1779085742508', email: 'nabou57@hotmail.fr' },
  { planId: '1777900210405', email: 'micklunven@yahoo.fr' },
  { planId: '1774645125950', email: 'gauthierbazille@yahoo.fr' },
];

async function getPlan(planId) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return await r.json();
}

async function findUserByEmail(email) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 1
      }
    })
  });
  const j = await r.json();
  return j.find(x => x.document)?.document;
}

async function listAllUserPlans(uid) {
  // List plans where userId == uid
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } },
        limit: 30
      }
    })
  });
  const j = await r.json();
  return j.filter(x => x.document).map(x => x.document);
}

const out = {};

for (const t of TARGETS) {
  console.error(`\n--- ${t.email} (${t.planId}) ---`);
  const plan = await getPlan(t.planId);
  if (plan.error) {
    out[t.planId] = { error: plan.error.message, email: t.email };
    continue;
  }

  const pf = plan.fields;
  const userIdFromPlan = getStr(pf.userId);
  const userEmailFromPlan = getStr(pf.userEmail);

  // Lookup user doc by email OR by uid
  let userDoc = await findUserByEmail(t.email);
  if (!userDoc && userIdFromPlan) {
    // try doc fetch
    const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userIdFromPlan}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const u = await r2.json();
    if (!u.error) userDoc = u;
  }

  const qd = userDoc ? getMap(userDoc.fields.questionnaireData) : {};
  const uidResolved = userDoc ? userDoc.name.split('/').pop() : userIdFromPlan;

  // Profile
  const profile = {
    age: getNum(qd.age),
    sex: getStr(qd.sex),
    weight: getNum(qd.weight),
    height: getNum(qd.height),
    level: getStr(qd.level),
    currentWeeklyVolume: getNum(qd.currentWeeklyVolume),
    currentWeeklyElevation: getNum(qd.currentWeeklyElevation),
    frequency: getNum(qd.frequency),
    goal: getStr(qd.goal),
    subGoal: getStr(qd.subGoal),
    targetTime: getStr(qd.targetTime),
    startDate: getStr(qd.startDate),
    raceDate: getStr(qd.raceDate),
    vma: getNum(qd.vma),
    city: getStr(qd.city),
    preferredDays: getArr(qd.preferredDays).map(getStr),
    preferredLongRunDay: getStr(qd.preferredLongRunDay),
    comments: getStr(qd.comments),
  };
  const inj = getMap(qd.injuries);
  profile.hasInjury = getBool(inj.hasInjury);
  profile.injuryDescription = getStr(inj.description);
  const race = getMap(qd.recentRaceTimes);
  profile.recentRaceTimes = {
    '5km': getStr(race.distance5km),
    '10km': getStr(race.distance10km),
    'semi': getStr(race.distanceHalfMarathon),
    'marathon': getStr(race.distanceMarathon),
  };

  profile.bmi = (profile.weight && profile.height) ? +(profile.weight / Math.pow(profile.height/100, 2)).toFixed(2) : null;

  // Plan
  const gc = getMap(pf.generationContext);
  const peri = getMap(gc.periodizationPlan);
  const wv = getArr(peri.weeklyVolumes).map(getNum);
  const wp = getArr(peri.weeklyPhases).map(getStr);
  const rw = getArr(peri.recoveryWeeks).map(getNum);
  const recoveryInterval = getNum(peri.recoveryWeekInterval);
  const peakPlanned = getNum(peri.peakVolume);
  const startVol = getNum(peri.startVolume);
  const totalWeeks = getNum(peri.totalWeeks);

  const feas = getMap(pf.feasibility);
  const paces = getMap(pf.paces);

  const planInfo = {
    planId: t.planId,
    name: getStr(pf.name),
    distance: getStr(pf.distance),
    createdAt: getStr(pf.createdAt),
    durationWeeks: getNum(pf.durationWeeks),
    isPreview: getBool(pf.isPreview),
    fullPlanGenerated: getBool(pf.fullPlanGenerated),
    isPremium: getBool(pf.isPremium),
    confidenceScore: getNum(pf.confidenceScore),
    feasibility: {
      status: getStr(feas.status),
      score: getNum(feas.score),
      message: getStr(feas.message),
      safetyWarning: getStr(feas.safetyWarning),
    },
    paces: {
      ef: getStr(paces.efPace),
      recovery: getStr(paces.recoveryPace),
      seuil: getStr(paces.seuilPace),
      vma: getStr(paces.vmaPace),
    },
    weeksGenerated: getArr(pf.weeks).length,
    periodization: {
      weeklyVolumes: wv,
      weeklyPhases: wp,
      recoveryWeeks: rw,
      recoveryWeekInterval: recoveryInterval,
      peakVolume: peakPlanned,
      startVolume: startVol,
      totalWeeks,
      actualPeak: wv.length ? Math.max(...wv) : null,
      actualTotal: wv.reduce((a,b) => a + (b||0), 0),
    },
  };

  // User premium status check
  let userPremium = null;
  let userCreatedAt = null;
  let userPlanCount = null;
  if (userDoc) {
    const uf = userDoc.fields;
    userPremium = getBool(uf.isPremium);
    userCreatedAt = getStr(uf.createdAt);
    const sub = getMap(uf.subscription);
    if (sub && Object.keys(sub).length) {
      planInfo.subscriptionStatus = getStr(sub.status);
    }
    // List all plans for this user (count)
    const allPlans = await listAllUserPlans(uidResolved);
    userPlanCount = allPlans.length;
  }

  out[t.planId] = {
    email: t.email,
    planIdFromTarget: t.planId,
    uid: uidResolved,
    userEmailFromPlan,
    userIdFromPlan,
    userExists: !!userDoc,
    userPremium,
    userCreatedAt,
    userPlanCount,
    profile,
    plan: planInfo,
  };
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-5-plans-expert-override-raw.json', JSON.stringify(out, null, 2));
console.log('Done. Raw written.');
console.log(JSON.stringify(Object.keys(out).map(k => ({
  id: k,
  email: out[k].email,
  level: out[k].profile?.level,
  curr: out[k].profile?.currentWeeklyVolume,
  peak: out[k].plan?.periodization?.actualPeak,
  recovInt: out[k].plan?.periodization?.recoveryWeekInterval,
})), null, 2));
