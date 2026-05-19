/**
 * Fetch profile + plan + periodization for 10 users (v2: correct fields)
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
    if (!u) { out[EMAIL] = { error: 'NOT_FOUND' }; continue; }
    const uid = u.localId;

    // User doc
    const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
    const userDoc = ud.status === 404 ? {} : pf((await ud.json()).fields);

    // Plans
    const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
      { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
    const plansRaw = (await pq.json()).filter(x=>x.document);

    const plans = plansRaw.map(x => ({ id: x.document.name.split('/').pop(), data: pf(x.document.fields) }));
    plans.sort((a,b) => {
      const ta = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
      const tb = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
      return tb - ta;
    });
    const mainPlan = plans.find(p => Array.isArray(p.data.weeks) && p.data.weeks.length > 0) || plans[0];
    if (!mainPlan) { out[EMAIL] = { uid, userDoc, plansCount: 0 }; continue; }

    const gc = mainPlan.data?.generationContext || {};
    const q = gc.questionnaireSnapshot || {};
    const periodizationPlan = gc.periodizationPlan || {};
    const weeklyVolumes = periodizationPlan.weeklyVolumes || [];
    const weeklyPhases = periodizationPlan.weeklyPhases || [];

    // Actual weekly km from sessions
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

    out[EMAIL] = {
      uid,
      userDoc: {
        firstName: userDoc.firstName,
        isPremium: userDoc.isPremium,
        plansCount: userDoc.plansCount,
      },
      mainPlanId: mainPlan.id,
      mainPlanName: mainPlan.data.name,
      mainPlanCreatedAt: mainPlan.data.createdAt,
      questionnaireSnapshot: q,
      sessionsPerWeek: mainPlan.data.sessionsPerWeek,
      durationWeeks: mainPlan.data.durationWeeks,
      raceDate: mainPlan.data.raceDate,
      goal: mainPlan.data.goal,
      targetTime: mainPlan.data.targetTime,
      vmaTop: mainPlan.data.vma,
      vmaSourceTop: mainPlan.data.vmaSource,
      gc: {
        vma: gc.vma,
        vmaSource: gc.vmaSource,
        paces: gc.paces,
      },
      weeklyVolumes,
      weeklyPhases,
      recoveryWeeks: periodizationPlan.recoveryWeeks,
      peakPlanned: Math.max(...(weeklyVolumes.length ? weeklyVolumes : [0])),
      actualWeeklyKm,
      peakActual: actualWeeklyKm.length ? Math.max(...actualWeeklyKm) : null,
      weeksCount: mainPlan.data?.weeks?.length,
    };
    console.log(`  uid=${uid} | peakPlan=${out[EMAIL].peakPlanned}km | S1=${weeklyVolumes[0]}km | freq=${mainPlan.data.sessionsPerWeek}`);
    console.log(`  Q: level=${q.level} | age=${q.age} | weight=${q.weight} | height=${q.height} | currentWeeklyVolume=${q.currentWeeklyVolume}`);
    console.log(`  Q: goal=${q.goal} | subGoal=${q.subGoal} | targetTime=${q.targetTime} | sex=${q.sex}`);
    console.log(`  Q: recentRaceTimes=${JSON.stringify(q.recentRaceTimes)} | trailDetails=${JSON.stringify(q.trailDetails)}`);
  } catch (e) {
    console.error(`  ERR:`, e.message);
    out[EMAIL] = { error: e.message };
  }
}

writeFileSync('10-cascade-v2.json', JSON.stringify(out, null, 2));
console.log('\n=> 10-cascade-v2.json');
