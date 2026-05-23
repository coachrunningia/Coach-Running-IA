import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';

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
    return f;
  });
}

console.log('═══════════════════════════════════════');
console.log('🔍 RECHERCHE PROFIL JUMEAU pour elisarnaud.1311');
console.log('═══════════════════════════════════════\n');

// Indices Elisa
const targetPhotoURL = 'https://lh3.googleusercontent.com/a/ACg8ocJEg5CBLFP14kIv54I7D8d5ZvBZ4DuF525FJr_iK6v-EZvNH-Q=s96-c';
const targetStripeCustomerId = 'cus_UYikNWFImZJd3E';

console.log('1️⃣ TOUS les users avec firstName "Arnaud" :\n');
const r1 = flat(await runQuery({
  from: [{ collectionId: 'users' }],
  where: { fieldFilter: { field: { fieldPath: 'firstName' }, op: 'EQUAL', value: { stringValue: 'Arnaud' } } },
  limit: 50
}));
for (const u of r1) {
  console.log(`   • ${u.email || '(no email)'} | id: ${u._id}`);
  console.log(`     firstName: ${u.firstName} | createdAt: ${u.createdAt} | isPremium: ${u.isPremium}`);
  if (u.photoURL) console.log(`     photoURL: ${u.photoURL.slice(0, 80)}${u.photoURL === targetPhotoURL ? '  ⭐ MATCH PHOTO' : ''}`);
  console.log('');
}

console.log('\n2️⃣ Users avec firstName commençant par Elis/Élis/Eli :\n');
for (const prefix of ['Elisa', 'Elise', 'Elisabeth', 'Élisa', 'Élise', 'Eli', 'Lisa']) {
  const r = flat(await runQuery({
    from: [{ collectionId: 'users' }],
    where: { fieldFilter: { field: { fieldPath: 'firstName' }, op: 'EQUAL', value: { stringValue: prefix } } },
    limit: 20
  }));
  for (const u of r) {
    console.log(`   • [${prefix}] ${u.email} | id: ${u._id} | createdAt: ${u.createdAt} | premium: ${u.isPremium}`);
    if (u.photoURL === targetPhotoURL) console.log(`     ⭐⭐⭐ MATCH PHOTO IDENTIQUE`);
    else if (u.photoURL) console.log(`     photoURL: ${u.photoURL.slice(0, 70)}`);
  }
}

console.log('\n3️⃣ Tous les comptes créés ces 7 derniers jours (pour cross-check par photoURL et timing) :\n');
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const r3 = flat(await runQuery({
  from: [{ collectionId: 'users' }],
  where: {
    fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: sevenDaysAgo } }
  },
  limit: 200
}));

// Filter by matching photoURL or related names
console.log(`   ${r3.length} comptes créés ces 7j (recherche photoURL identique + email arnaud/elisa)`);
const matches = [];
for (const u of r3) {
  const photoMatch = u.photoURL === targetPhotoURL;
  const emailHint = (u.email || '').match(/arnaud|elis|lisa/i);
  const nameHint = (u.firstName || '').match(/arnaud|elis|lisa/i);
  if (photoMatch || emailHint || nameHint) {
    matches.push({ u, photoMatch, emailHint: !!emailHint, nameHint: !!nameHint });
  }
}
console.log(`   ${matches.length} matches potentiels :\n`);
for (const { u, photoMatch, emailHint, nameHint } of matches) {
  const flags = [
    photoMatch ? '⭐ PHOTO IDENTIQUE' : '',
    emailHint ? '📧 email-hint' : '',
    nameHint ? '👤 name-hint' : ''
  ].filter(Boolean).join(' / ');
  console.log(`   • ${u.email} | ${u.firstName || '(no name)'} | createdAt: ${u.createdAt}`);
  console.log(`     id: ${u._id} | premium: ${u.isPremium} | stripeCustomerId: ${u.stripeCustomerId || '-'}`);
  console.log(`     ${flags}`);
  if (u.photoURL) console.log(`     photoURL: ${u.photoURL.slice(0, 90)}`);
  console.log('');
}

console.log('\n4️⃣ Tous les comptes créés dans la fenêtre [J-2 ; maintenant] sans plan généré (cross-référence) :\n');
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
const recent = r3.filter(u => u.createdAt && u.createdAt >= twoDaysAgo);
console.log(`   ${recent.length} comptes créés <48h`);

// Check which have plans
const userIds = recent.map(u => u._id);
const usersWithPlans = new Set();
// Batch fetch by chunks of 10 (Firestore IN limit)
for (let i = 0; i < userIds.length; i += 10) {
  const chunk = userIds.slice(i, i + 10);
  if (chunk.length === 0) continue;
  const plansR = flat(await runQuery({
    from: [{ collectionId: 'plans' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'userId' },
        op: 'IN',
        value: { arrayValue: { values: chunk.map(id => ({ stringValue: id })) } }
      }
    },
    limit: 100
  }));
  for (const p of plansR) usersWithPlans.add(p.userId);
}

const recentNoPlan = recent.filter(u => !usersWithPlans.has(u._id));
console.log(`   → ${recentNoPlan.length} sans aucun plan généré :\n`);
for (const u of recentNoPlan) {
  const isPrem = u.isPremium === true;
  console.log(`   • ${u.email} | ${u.firstName || '?'} | ${u.createdAt} | premium: ${isPrem ? '✅' : '❌'}`);
  if (u.photoURL === targetPhotoURL) console.log(`     ⭐⭐⭐ PHOTO IDENTIQUE → MEME PERSONNE !`);
}

