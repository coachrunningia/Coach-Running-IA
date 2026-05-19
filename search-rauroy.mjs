// Recherche user rauroy par variantes email + nom
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const VARIANTS = [
  'rauroy@gmail.com',
  'r.auroy@gmail.com',
  'raoul.roy@gmail.com',
  'raouroy@gmail.com',
  'r.aury@gmail.com',
  'rauroy@hotmail.com',
  'rauroy@yahoo.fr',
  'rauroy@orange.fr',
  'rauroy@free.fr',
  'rauroygmail.com',
  'rauroy.gmail@gmail.com',
  'r-auroy@gmail.com',
  'raury@gmail.com',
  'auroy@gmail.com',
];

console.log('▶ Test variantes email Firebase Auth :');
let foundUser = null;
for (const email of VARIANTS) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ email:[email] }) });
  const j = await r.json();
  if (j.users?.length) {
    console.log(`  ✅ TROUVÉ: ${email} → UID ${j.users[0].localId}`);
    foundUser = { email, uid: j.users[0].localId };
    break;
  } else {
    console.log(`  ❌ ${email}`);
  }
}

if (foundUser) {
  console.log(`\n→ UID: ${foundUser.uid} | email: ${foundUser.email}`);
  process.exit(0);
}

// Recherche par patterns dans Firestore users
console.log('\n▶ Recherche Firestore users par nom (auroy/raoul/ray)...');
const allUsers = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=500`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const aj = await allUsers.json();
const docs = aj.documents || [];
console.log(`  Total users page 1: ${docs.length}`);

const matches = docs.filter(d => {
  const f = d.fields || {};
  const fields = [f.firstName?.stringValue, f.lastName?.stringValue, f.email?.stringValue, f.displayName?.stringValue].filter(Boolean);
  const blob = fields.join(' ').toLowerCase();
  return blob.includes('auroy') || blob.includes('rauroy') || blob.includes('raoul') || blob.includes('aury') || blob.includes('roy');
});
console.log(`\n▶ Matches user nom: ${matches.length}`);
for (const m of matches) {
  const f = m.fields || {};
  const uid = m.name.split('/').pop();
  console.log(`  - UID=${uid} email=${f.email?.stringValue} firstName=${f.firstName?.stringValue} lastName=${f.lastName?.stringValue} displayName=${f.displayName?.stringValue}`);
}

// Pagination users
let pageToken = aj.nextPageToken;
let page = 2;
while (pageToken && page < 10) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=500&pageToken=${pageToken}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const j = await r.json();
  const pageDocs = j.documents || [];
  console.log(`  Page ${page}: ${pageDocs.length} users`);
  const pageMatches = pageDocs.filter(d => {
    const f = d.fields || {};
    const fields = [f.firstName?.stringValue, f.lastName?.stringValue, f.email?.stringValue, f.displayName?.stringValue].filter(Boolean);
    const blob = fields.join(' ').toLowerCase();
    return blob.includes('auroy') || blob.includes('rauroy') || blob.includes('raoul') || blob.includes('aury');
  });
  for (const m of pageMatches) {
    const f = m.fields || {};
    const uid = m.name.split('/').pop();
    console.log(`  ✅ UID=${uid} email=${f.email?.stringValue} firstName=${f.firstName?.stringValue} lastName=${f.lastName?.stringValue}`);
  }
  pageToken = j.nextPageToken;
  page++;
}

// Plans
console.log('\n▶ Recherche dans plans par userEmail "auroy"/"rauroy"...');
const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=500`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const pj = await plansResp.json();
const planDocs = pj.documents || [];
console.log(`  Total plans page 1: ${planDocs.length}`);

const planMatches = planDocs.filter(d => {
  const e = (d.fields?.userEmail?.stringValue || '').toLowerCase();
  return e.includes('auroy') || e.includes('rauroy') || e.includes('aury');
});
for (const p of planMatches) {
  const f = p.fields || {};
  console.log(`  ✅ planId=${p.name.split('/').pop()} email=${f.userEmail?.stringValue} userId=${f.userId?.stringValue}`);
}

let pt = pj.nextPageToken;
let pp = 2;
while (pt && pp < 10) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=500&pageToken=${pt}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const j = await r.json();
  const pageDocs = j.documents || [];
  console.log(`  Plans page ${pp}: ${pageDocs.length}`);
  const matches = pageDocs.filter(d => {
    const e = (d.fields?.userEmail?.stringValue || '').toLowerCase();
    return e.includes('auroy') || e.includes('rauroy') || e.includes('aury');
  });
  for (const p of matches) {
    const f = p.fields || {};
    console.log(`  ✅ planId=${p.name.split('/').pop()} email=${f.userEmail?.stringValue} userId=${f.userId?.stringValue}`);
  }
  pt = j.nextPageToken;
  pp++;
}
