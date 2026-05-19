import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const UID = 'sRLuCBE8yKMxlmWczdTAGcoL0H42';

// User doc
const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}`, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const uj = await ur.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-user.json', JSON.stringify(uj, null, 2));
console.log('User doc saved.');

// Plans in subcollection
const pr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}/plans?pageSize=100`, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const pj = await pr.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-plans-list.json', JSON.stringify(pj, null, 2));
const subPlans = pj.documents || [];
console.log(`Subcollection plans: ${subPlans.length}`);
for (const p of subPlans) {
  console.log('  -', p.name.split('/').pop(), '| createTime:', p.createTime);
}

// Also check top-level plans by userId
const q = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: UID } } },
    limit: 50
  }
};
const tr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
  method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
  body: JSON.stringify(q)
});
const tj = await tr.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-toplevel-plans.json', JSON.stringify(tj, null, 2));
const topPlans = (tj || []).filter(x => x.document);
console.log(`Top-level plans: ${topPlans.length}`);
for (const p of topPlans) {
  console.log('  -', p.document.name.split('/').pop(), '| createTime:', p.document.createTime);
}
