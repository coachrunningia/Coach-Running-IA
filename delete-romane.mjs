// Supprime Romane (romane@elance-bijoux.fr) totalement : Auth + Firestore doc + plans
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const EMAIL = 'romane@elance-bijoux.fr';
const PROJECT = 'coach-running-ia';

const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
console.log(`Token: ${TOKEN.length} chars`);

// 1. Lookup UID
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ email:[EMAIL] }) });
const lookupJson = await lookup.json();
const uid = lookupJson.users?.[0]?.localId;
const verified = lookupJson.users?.[0]?.emailVerified;
console.log(`\nUID: ${uid || 'NON TROUVÉ'}`);
console.log(`Email vérifié: ${verified}`);
if (!uid) { console.log('Rien à supprimer'); process.exit(0); }

// 2. Lister ses plans
const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const plans = (await plansResp.json()).filter(r => r.document);
console.log(`\nPlans Firestore: ${plans.length}`);
for (const p of plans) {
  const f = p.document.fields;
  const pid = p.document.name.split('/').pop();
  const w = f.weeks?.arrayValue?.values?.length || 0;
  const dist = f.distance?.stringValue || '?';
  const ca = f.createdAt?.stringValue || '?';
  console.log(`  - planId=${pid} | distance=${dist} | weeks=${w} | createdAt=${ca.substring(0,19)}`);
}

// 3. Supprimer les plans
console.log(`\n── Suppression plans ──`);
for (const p of plans) {
  const r = await fetch(`https://firestore.googleapis.com/v1/${p.document.name}`,
    { method:'DELETE', headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  console.log(`  DELETE plan ${p.document.name.split('/').pop()} → ${r.status}`);
}

// 4. Supprimer doc Firestore users/{uid}
console.log(`\n── Suppression Firestore users/${uid} ──`);
const userDocDel = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
  { method:'DELETE', headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
console.log(`  → ${userDocDel.status}`);

// 5. Supprimer Firebase Auth
console.log(`\n── Suppression Firebase Auth ──`);
const authDel = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:delete`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ localId: uid }) });
console.log(`  → ${authDel.status}: ${(await authDel.text()).substring(0,200)}`);

// 6. Vérif finale
const verify = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ email:[EMAIL] }) });
const verifyJson = await verify.json();
const remaining = verifyJson.users?.length || 0;
console.log(`\n── Vérif finale ──`);
console.log(`  Users restants pour ${EMAIL}: ${remaining}`);

console.log(`\n${remaining === 0 ? '✅' : '❌'} Romane ${remaining === 0 ? 'totalement supprimée' : 'pas complètement supprimée'}`);
console.log(`Elle peut maintenant s'inscrire à nouveau comme nouveau user.`);
