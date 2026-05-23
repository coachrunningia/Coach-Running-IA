import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
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

console.log('═══════════════════════════════════════');
console.log(`🔍 INVESTIGATION : ${email}`);
console.log('═══════════════════════════════════════\n');

// 1. Look for user(s) with that email in users collection
console.log('1️⃣ Recherche dans collection users…');
const usersRes = await runQuery({
  from: [{ collectionId: 'users' }],
  where: {
    fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } }
  }
});
const users = (usersRes || []).filter(r => r.document).map(r => {
  const f = {};
  for (const [k, v] of Object.entries(r.document.fields || {})) f[k] = parseFs(v);
  f._id = r.document.name.split('/').pop();
  f._createTime = r.document.createTime;
  return f;
});
console.log(`   ${users.length} user(s) trouvé(s)`);
for (const u of users) {
  console.log(`   • userId: ${u._id}`);
  console.log(`     created: ${u._createTime}`);
  console.log(`     premium: ${u.isPremium || u.premium || u.subscriptionStatus || '?'}`);
  console.log(`     premiumSince: ${u.premiumSince || u.subscriptionStartDate || u.activatedAt || '?'}`);
  console.log(`     stripeCustomerId: ${u.stripeCustomerId || '?'}`);
  console.log(`     stripeSubscriptionId: ${u.stripeSubscriptionId || '?'}`);
  console.log(`     keys: ${Object.keys(u).filter(k => !k.startsWith('_')).join(', ')}`);
  console.log('');
}
const userIds = users.map(u => u._id);

// 2. Look for plans associated with this email or userId
console.log('2️⃣ Recherche plans par userEmail…');
const plansByEmailRes = await runQuery({
  from: [{ collectionId: 'plans' }],
  where: {
    fieldFilter: { field: { fieldPath: 'userEmail' }, op: 'EQUAL', value: { stringValue: email } }
  }
});
const plansByEmail = (plansByEmailRes || []).filter(r => r.document).map(r => {
  const f = {};
  for (const [k, v] of Object.entries(r.document.fields || {})) f[k] = parseFs(v);
  f._id = r.document.name.split('/').pop();
  f._createTime = r.document.createTime;
  return f;
});
console.log(`   ${plansByEmail.length} plan(s) trouvé(s) par email`);
for (const p of plansByEmail) {
  console.log(`   • planId: ${p._id} | goal: ${p.goal} | created: ${p._createTime} | userId: ${p.userId}`);
}

console.log('');
console.log('3️⃣ Recherche plans par userId…');
for (const uid of userIds) {
  const plansByUidRes = await runQuery({
    from: [{ collectionId: 'plans' }],
    where: {
      fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } }
    }
  });
  const plansByUid = (plansByUidRes || []).filter(r => r.document).map(r => {
    const f = {};
    for (const [k, v] of Object.entries(r.document.fields || {})) f[k] = parseFs(v);
    f._id = r.document.name.split('/').pop();
    f._createTime = r.document.createTime;
    return f;
  });
  console.log(`   userId ${uid} → ${plansByUid.length} plan(s)`);
  for (const p of plansByUid) {
    console.log(`     • planId: ${p._id} | goal: ${p.goal} | created: ${p._createTime} | userEmail: ${p.userEmail}`);
  }
}

console.log('');
console.log('4️⃣ Recherche events Stripe / payments…');
// Possibles collections : stripeEvents, payments, subscriptions
const collections = ['stripeEvents', 'subscriptions', 'payments', 'customers'];
for (const col of collections) {
  try {
    const r = await runQuery({
      from: [{ collectionId: col }],
      where: {
        fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } }
      },
      limit: 5
    });
    const docs = (r || []).filter(rr => rr.document);
    if (docs.length > 0) {
      console.log(`   • ${col}: ${docs.length} doc(s)`);
      for (const d of docs) {
        const f = {};
        for (const [k, v] of Object.entries(d.document.fields || {})) f[k] = parseFs(v);
        console.log(`     - ${d.document.name.split('/').pop()} | keys: ${Object.keys(f).join(', ')}`);
      }
    }
  } catch (e) { /* skip */ }
}

console.log('');
console.log('5️⃣ Liste des collections existantes (root) :');
const collListUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:listCollectionIds`;
const collListRes = await fetch(collListUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const collList = await collListRes.json();
console.log(`   ${(collList.collectionIds || []).join(', ')}`);
