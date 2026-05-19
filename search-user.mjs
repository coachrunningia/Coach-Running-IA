// Recherche un user par patterns d'email + par nom partiel
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

// 1. Tester variantes d'email
const VARIANTS = [
  'xbouche.clement.bc@gmail.com',
  'xboucheclementbc@gmail.com',
  'xbouche.clement@gmail.com',
  'bouche.clement.bc@gmail.com',
  'clement.bouche.bc@gmail.com',
  'clement.bouche@gmail.com',
  'clementbouche@gmail.com',
  'x.bouche.clement.bc@gmail.com',
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
  console.log(`\n→ Utilise: node analyze-user.mjs ${foundUser.email}`);
  process.exit(0);
}

// 2. Recherche par displayName dans Firestore users (qui contient bouche/clement)
console.log('\n▶ Recherche Firestore users par displayName (peut prendre 10s)...');
// Pas de fulltext search dans Firestore, donc on liste tous les users récents et on filtre
const allUsers = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=300`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const aj = await allUsers.json();
const docs = aj.documents || [];
console.log(`  Total users en Firestore: ${docs.length}`);

const matches = docs.filter(d => {
  const f = d.fields || {};
  const fields = [f.firstName?.stringValue, f.email?.stringValue, f.displayName?.stringValue].filter(Boolean);
  const blob = fields.join(' ').toLowerCase();
  return blob.includes('bouche') || blob.includes('clement') || blob.includes('clément');
});
console.log(`\n▶ Matches "bouche"/"clement": ${matches.length}`);
for (const m of matches) {
  const f = m.fields || {};
  const uid = m.name.split('/').pop();
  console.log(`  - UID=${uid} email=${f.email?.stringValue} firstName=${f.firstName?.stringValue}`);
}

// 3. Last resort : chercher dans plans par userEmail
console.log('\n▶ Recherche dans plans par userEmail "bouche"/"clement"...');
const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const pj = await plansResp.json();
const planDocs = pj.documents || [];
console.log(`  Total plans en Firestore: ${planDocs.length}`);

const planMatches = planDocs.filter(d => {
  const e = (d.fields?.userEmail?.stringValue || '').toLowerCase();
  return e.includes('bouche') || e.includes('clement');
});
console.log(`\n▶ Plans matchant: ${planMatches.length}`);
for (const p of planMatches) {
  const f = p.fields || {};
  console.log(`  - planId=${p.name.split('/').pop()} email=${f.userEmail?.stringValue} userId=${f.userId?.stringValue}`);
}
