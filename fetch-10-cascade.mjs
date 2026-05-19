/**
 * Fetch profile + plan + periodization for 10 users (cascade volumes investigation)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

const EMAILS = [
  'georgeslor1@gmail.com',
  'jeremy.charriere@live.fr',
  'rija.rajohnson@gmail.com',
  'vincenthamel935@gmail.com',
  'lafleur666@yahoo.fr',
  'antoineg.gde@outlook.fr',
  'arenaarmando@hotmail.com',
  'sebastien.sailly@outlook.fr',
  'alanwentzel74@gmail.com',
  'nabou57@hotmail.fr',
];

function pv(v){ if(!v) return null;
  if(v.stringValue!==undefined) return v.stringValue;
  if(v.integerValue!==undefined) return parseInt(v.integerValue);
  if(v.doubleValue!==undefined) return v.doubleValue;
  if(v.booleanValue!==undefined) return v.booleanValue;
  if(v.timestampValue!==undefined) return v.timestampValue;
  if(v.arrayValue) return (v.arrayValue.values||[]).map(pv);
  if(v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

const out = {};

for (const EMAIL of EMAILS) {
  console.log(`\n=== ${EMAIL} ===`);
  try {
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
      { method:'POST', headers:H, body:JSON.stringify({ email:[EMAIL] }) });
    const lj = await lookup.json();
    const u = lj.users?.[0];
    if (!u) { console.log('  NOT FOUND'); out[EMAIL] = { error: 'NOT_FOUND' }; continue; }
    const uid = u.localId;

    // User doc
    const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
    const userDoc = ud.status === 404 ? {} : pf((await ud.json()).fields);

    // Plans
    const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
      { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
    const plansRaw = (await pq.json()).filter(x=>x.document);

    const plans = plansRaw.map(x => {
      const id = x.document.name.split('/').pop();
      const data = pf(x.document.fields);
      return { id, data };
    });

    // Sort by createdAt desc
    plans.sort((a,b) => {
      const ta = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      const tb = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      return tb - ta;
    });

    // Take the most recent that has weeks (i.e. a real plan)
    const mainPlan = plans.find(p => Array.isArray(p.data.weeks) && p.data.weeks.length > 0) || plans[0];

    if (!mainPlan) {
      out[EMAIL] = { uid, userDoc, plansCount: 0 };
      continue;
    }

    // Compute weekly volumes from weeks if not stored
    let weeklyVolumes = mainPlan.data?.generationContext?.periodizationPlan?.weeklyVolumes;
    let weeklyPhases = mainPlan.data?.generationContext?.periodizationPlan?.weeklyPhases;
    let actualWeeklyKm = [];
    if (Array.isArray(mainPlan.data.weeks)) {
      for (const w of mainPlan.data.weeks) {
        let totalKm = 0;
        if (Array.isArray(w.sessions)) {
          for (const s of w.sessions) {
            const km = parseFloat(String(s.distance || '').replace(',','.').replace(/[^0-9.]/g,''));
            if (!isNaN(km)) totalKm += km;
          }
        }
        actualWeeklyKm.push(Math.round(totalKm * 10)/10);
      }
    }

    const q = mainPlan.data?.questionnaireData || {};
    const gc = mainPlan.data?.generationContext || {};

    out[EMAIL] = {
      uid,
      userDoc: {
        firstName: userDoc.firstName,
        isPremium: userDoc.isPremium,
        plansCount: userDoc.plansCount,
      },
      plansCount: plans.length,
      mainPlanId: mainPlan.id,
      mainPlanCreatedAt: mainPlan.data.createdAt,
      questionnaireData: {
        level: q.level,
        sex: q.sex,
        age: q.age,
        weight: q.weight,
        height: q.height,
        goal: q.goal,
        subGoal: q.subGoal,
        targetTime: q.targetTime,
        currentWeeklyVolume: q.currentWeeklyVolume,
        frequency: q.frequency,
        trailDetails: q.trailDetails,
        recentRaceTimes: q.recentRaceTimes,
        availability: q.availability,
      },
      generationContext: {
        vma: gc.vma,
        vmaSource: gc.vmaSource,
        paces: gc.paces,
        weeklyVolumes,
        weeklyPhases,
        recoveryWeeks: gc?.periodizationPlan?.recoveryWeeks,
      },
      actualWeeklyKm,
      peakActualKm: actualWeeklyKm.length ? Math.max(...actualWeeklyKm) : null,
      peakPlannedKm: Array.isArray(weeklyVolumes) ? Math.max(...weeklyVolumes) : null,
      weeksCount: mainPlan.data?.weeks?.length,
    };
    console.log(`  uid=${uid}  weeks=${mainPlan.data?.weeks?.length}  peakActual=${out[EMAIL].peakActualKm}km  peakPlanned=${out[EMAIL].peakPlannedKm}km`);
  } catch (e) {
    console.error(`  ERR:`, e.message);
    out[EMAIL] = { error: e.message };
  }
}

writeFileSync('10-cascade-data.json', JSON.stringify(out, null, 2));
console.log('\n=> 10-cascade-data.json');
