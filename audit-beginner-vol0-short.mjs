/**
 * Audit batch — plans existants avec Débutant + vol actuel 0 + durée < minimum sain
 * (selon table validée par expert coach, intégrée au code feasibilityService.ts)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

function getMinWeeks(distanceKm, isTrail, bmi, age, hasInjury) {
  let minWeeks;
  if (distanceKm === null || distanceKm === undefined) minWeeks = 12;
  else if (isTrail) {
    if (distanceKm >= 60) minWeeks = 52;
    else if (distanceKm >= 30) minWeeks = 36;
    else if (distanceKm >= 15) minWeeks = 22;
    else minWeeks = 12;
  } else {
    if (distanceKm >= 42) minWeeks = 30;
    else if (distanceKm >= 21) minWeeks = 20;
    else if (distanceKm >= 10) minWeeks = 14;
    else minWeeks = 10;
  }
  let mods = 0;
  if (bmi !== null && bmi >= 30) mods += 4;
  if (age !== undefined && age >= 50) mods += 2;
  if (hasInjury) mods += 4;
  return minWeeks + Math.min(mods, 8);
}

async function fetchAll() {
  const all = [];
  let pageToken = null;
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`;
    const r = await fetch(url, { headers:H });
    const j = await r.json();
    if (j.documents) all.push(...j.documents);
    pageToken = j.nextPageToken;
  } while (pageToken);
  return all;
}

console.log(`Fetch tous les plans…`);
const docs = await fetchAll();
console.log(`Total : ${docs.length} plans`);

const affected = [];
for (const doc of docs) {
  const p = pf(doc.fields);
  const id = doc.name.split('/').pop();
  const snap = p.generationContext?.questionnaireSnapshot || {};
  const level = p.level || snap.level || '';
  const isBeginner = level.includes('Débutant');
  const vol = snap.currentWeeklyVolume ?? snap.currentVolume ?? p.generationContext?.currentVolume ?? null;
  if (!isBeginner || vol === null || vol !== 0) continue;

  const dur = p.durationWeeks;
  if (!dur) continue;

  const goal = (p.goal || snap.goal || '').toLowerCase();
  const isTrail = goal.includes('trail');
  const subGoal = (p.subGoal || snap.subGoal || '').toLowerCase();
  let distanceKm = null;
  if (isTrail) {
    distanceKm = snap.trailDetails?.distance || p.generationContext?.trailDistance;
  } else if (subGoal.includes('marathon') && !subGoal.includes('semi')) distanceKm = 42.195;
  else if (subGoal.includes('semi')) distanceKm = 21.097;
  else if (subGoal.includes('10')) distanceKm = 10;
  else if (subGoal.includes('5')) distanceKm = 5;

  if (distanceKm === null && !isTrail) continue; // perte poids / maintien forme (pas de distance)

  const w = snap.weight; const h = snap.height;
  const bmi = (w && h && h > 0) ? w / ((h/100)**2) : null;
  const age = snap.age;
  const hasInjury = !!(snap.injuries?.hasInjury);

  const minRequired = getMinWeeks(distanceKm, isTrail, bmi, age, hasInjury);
  if (dur >= minRequired) continue;

  affected.push({
    id, email: p.userEmail,
    goal: p.goal, subGoal: p.subGoal, distanceKm,
    isTrail, trailElev: snap.trailDetails?.elevation,
    durActuelle: dur, minRequired,
    ecart: minRequired - dur,
    age, bmi: bmi?.toFixed(1), hasInjury,
    feasStatusActuel: p.feasibility?.status,
    feasScoreActuel: p.feasibility?.score ?? p.confidenceScore,
    statusReco: dur < minRequired ? 'IRRÉALISTE/15' : 'RISQUÉ/30',
    isPreview: p.isPreview, fullPlanGenerated: p.fullPlanGenerated,
    createdAt: p.createdAt?.substring(0,10),
  });
}

console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  PLANS AFFECTÉS : ${affected.length}`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════`);

// Tri par écart desc (les plus problématiques)
affected.sort((a,b) => b.ecart - a.ecart);

console.log(`\n  ${'id'.padEnd(15)} ${'email'.padEnd(30)} ${'distance'.padEnd(20)} ${'dur'.padEnd(5)} ${'min'.padEnd(5)} ${'écart'.padEnd(7)} ${'statut actuel'.padEnd(15)} ${'reco'.padEnd(14)} créé`);
console.log('  ' + '─'.repeat(150));
for (const a of affected) {
  console.log(`  ${a.id.padEnd(15)} ${(a.email||'?').substring(0,30).padEnd(30)} ${((a.isTrail?'Trail ':'')+(a.distanceKm||'?')+'km').padEnd(20)} ${String(a.durActuelle).padEnd(5)} ${String(a.minRequired).padEnd(5)} ${('-'+a.ecart).padEnd(7)} ${(a.feasStatusActuel+'/'+a.feasScoreActuel).padEnd(15)} ${a.statusReco.padEnd(14)} ${a.createdAt}`);
}

writeFileSync('audit-beginner-vol0-short.json', JSON.stringify(affected, null, 2));
console.log(`\n📝 audit-beginner-vol0-short.json (${affected.length} plans)`);
