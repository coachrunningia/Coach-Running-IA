import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const userId = '0wVykixEIWWVl8p9SbUyuYLoM6h1';
const email = 'elisarnaud.1311@gmail.com';

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
async function runQuery(structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  return await res.json();
}
function flat(r) {
  return (r || []).filter(rr => rr.document).map(rr => {
    const f = {};
    for (const [k, v] of Object.entries(rr.document.fields || {})) f[k] = parseFs(v);
    f._id = rr.document.name.split('/').pop();
    f._createTime = rr.document.createTime;
    f._updateTime = rr.document.updateTime;
    return f;
  });
}

console.log('═══════════════════════════════════════');
console.log('🔬 AUDIT PROFOND ARNAUD');
console.log('═══════════════════════════════════════\n');

// 1. ALL plans (preview + non-preview + deletions)
console.log('1️⃣ TOUS LES PLANS user (preview + complets) :\n');
const plans = flat(await runQuery({
  from: [{ collectionId: 'plans' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 50
}));
for (const p of plans) {
  console.log(`📋 Plan ${p._id} :`);
  console.log(`   createdAt : ${p._createTime}`);
  console.log(`   updateTime : ${p._updateTime}`);
  console.log(`   name : ${p.name}`);
  console.log(`   goal : ${p.goal}`);
  console.log(`   raceDate : ${p.raceDate}`);
  console.log(`   startDate : ${p.startDate}`);
  console.log(`   isPreview : ${p.isPreview}`);
  console.log(`   fullPlanGenerated : ${p.fullPlanGenerated}`);
  console.log(`   durationWeeks : ${p.durationWeeks}`);
  console.log(`   weeks count : ${(p.weeks || []).length}`);

  const qs = p.generationContext?.questionnaireSnapshot || {};
  console.log(`   QS inputs clés :`);
  console.log(`     trailDetails.distance : ${qs.trailDetails?.distance}`);
  console.log(`     trailDetails.elevation : ${qs.trailDetails?.elevation}`);
  console.log(`     raceDate (qs) : ${qs.raceDate}`);
  console.log(`     comments : "${qs.comments || ''}"`);
  console.log(`     level : ${qs.level}`);
  console.log(`     frequency : ${qs.frequency}`);
  console.log(`     currentWeeklyVolume : ${qs.currentWeeklyVolume}`);
  console.log('');
}

// 2. plan_deletions complet
console.log('\n2️⃣ DELETIONS détail :\n');
const dels = flat(await runQuery({
  from: [{ collectionId: 'plan_deletions' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 20
}));
console.log(`   ${dels.length} suppression(s)`);
for (const d of dels) {
  console.log(`   • ${JSON.stringify(d, null, 2).slice(0, 800)}`);
  console.log('');
}

// 3. generation_errors
console.log('\n3️⃣ GENERATION ERRORS :\n');
const errs = flat(await runQuery({
  from: [{ collectionId: 'generation_errors' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 20
}));
console.log(`   ${errs.length} erreur(s)`);
for (const e of errs) console.log(`   • ${JSON.stringify(e).slice(0, 500)}`);

// 4. Strava : recherche tous les champs / sous-collections Strava
console.log('\n4️⃣ STRAVA — sous-collections user et plans :\n');
const userSubcols = await (await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}:listCollectionIds`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})).json();
console.log(`   Sous-collections user : ${(userSubcols.collectionIds || []).join(', ') || 'aucune'}`);

for (const p of plans) {
  const planSubcols = await (await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${p._id}:listCollectionIds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })).json();
  console.log(`   Sous-collections plan ${p._id} : ${(planSubcols.collectionIds || []).join(', ') || 'aucune'}`);
}

// Check user doc for Strava fields
console.log('\n5️⃣ USER doc — champs Strava :');
const u = await (await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const ud = {};
for (const [k, v] of Object.entries(u.fields)) ud[k] = parseFs(v);
for (const k of Object.keys(ud)) {
  if (k.toLowerCase().includes('strava') || k.toLowerCase().includes('athlet') || k.toLowerCase().includes('token')) {
    console.log(`   ${k} : ${typeof ud[k] === 'object' ? JSON.stringify(ud[k]).slice(0, 200) : ud[k]}`);
  }
}
const stravaKeys = Object.keys(ud).filter(k => k.toLowerCase().includes('strava'));
if (stravaKeys.length === 0) console.log('   ❌ Aucun champ Strava dans le user doc');
console.log(`   tous les keys user : ${Object.keys(ud).join(', ')}`);

// 6. Recherche collection strava_* éventuelle
console.log('\n6️⃣ Collections Strava globales :');
const collRes = await (await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:listCollectionIds`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})).json();
const stravaCols = (collRes.collectionIds || []).filter(c => c.toLowerCase().includes('strava'));
console.log(`   Strava collections : ${stravaCols.length === 0 ? '(aucune)' : stravaCols.join(', ')}`);

