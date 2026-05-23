import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const email = 'elisarnaud.1311@gmail.com';
const userId = '0wVykixEIWWVl8p9SbUyuYLoM6h1';

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

console.log('🗑️ plan_deletions pour userId/email :');
for (const fld of ['userId', 'userEmail', 'email']) {
  const val = fld === 'userId' ? userId : email;
  const r = await runQuery({
    from: [{ collectionId: 'plan_deletions' }],
    where: { fieldFilter: { field: { fieldPath: fld }, op: 'EQUAL', value: { stringValue: val } } },
    limit: 10
  });
  const docs = (r || []).filter(rr => rr.document);
  if (docs.length > 0) {
    console.log(`   via ${fld}=${val} → ${docs.length} deletion(s)`);
    for (const d of docs) {
      const f = {};
      for (const [k, v] of Object.entries(d.document.fields || {})) f[k] = parseFs(v);
      console.log(`     • ${d.document.name.split('/').pop()}: ${JSON.stringify(f).slice(0, 500)}`);
    }
  } else {
    console.log(`   via ${fld}=${val} → 0`);
  }
}

console.log('');
console.log('🚨 generation_errors pour userId/email :');
for (const fld of ['userId', 'userEmail', 'email']) {
  const val = fld === 'userId' ? userId : email;
  const r = await runQuery({
    from: [{ collectionId: 'generation_errors' }],
    where: { fieldFilter: { field: { fieldPath: fld }, op: 'EQUAL', value: { stringValue: val } } },
    limit: 10
  });
  const docs = (r || []).filter(rr => rr.document);
  if (docs.length > 0) {
    console.log(`   via ${fld}=${val} → ${docs.length} erreur(s)`);
    for (const d of docs) {
      const f = {};
      for (const [k, v] of Object.entries(d.document.fields || {})) f[k] = parseFs(v);
      console.log(`     • ${d.document.name.split('/').pop()} | createTime: ${d.document.createTime}`);
      console.log(`       fields: ${JSON.stringify(f).slice(0, 800)}`);
      console.log('');
    }
  } else {
    console.log(`   via ${fld}=${val} → 0`);
  }
}

console.log('');
console.log('📋 Vérif user document complet :');
const userUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
const userRes = await fetch(userUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
const userDoc = await userRes.json();
if (userDoc.fields) {
  const u = {};
  for (const [k, v] of Object.entries(userDoc.fields)) u[k] = parseFs(v);
  console.log(JSON.stringify(u, null, 2));
}

console.log('');
console.log('📦 Sous-collections du user (pour voir si plan en draft / questionnaire pending) :');
const subColUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}:listCollectionIds`;
const subRes = await fetch(subColUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
const subList = await subRes.json();
console.log(`   ${(subList.collectionIds || []).join(', ') || '(aucune)'}`);

console.log('');
console.log('⏱️ Chronologie :');
console.log(`   Compte créé : 2026-05-21T18:25:24.388Z`);
console.log(`   Premium activé : 2026-05-21T18:27:23.189Z (+ 1m59s après création)`);
console.log(`   Maintenant : ${new Date().toISOString()}`);
const minutesSincePremium = Math.round((Date.now() - new Date('2026-05-21T18:27:23.189Z')) / 60000);
console.log(`   Délai depuis premium : ${minutesSincePremium} min`);
