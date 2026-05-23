import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PLAN_ID = '1779071910169';

// 1. Direct fetch /plans/{id}
const direct = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const dj = await direct.json();

if (dj.fields) {
  console.log('FOUND in /plans/{id}');
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-plan.json', JSON.stringify(dj, null, 2));
  console.log('User email:', dj.fields.userEmail?.stringValue);
  console.log('User ID:', dj.fields.userId?.stringValue);
  console.log('Plan name:', dj.fields.planName?.stringValue);
  console.log('CreatedAt:', dj.fields.createdAt?.timestampValue);

  const userId = dj.fields.userId?.stringValue;
  if (userId) {
    const userRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userId}`,
      { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
    const uj = await userRes.json();
    if (uj.fields) {
      fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779071910169-user.json', JSON.stringify(uj, null, 2));
      console.log('User saved');
    } else {
      console.log('User not found, response:', JSON.stringify(uj).slice(0, 500));
    }
  }
  process.exit(0);
}

console.log('Not found direct, response:', JSON.stringify(dj).slice(0, 500));

// 2. Sinon collectionGroup
const qbody = {
  structuredQuery: {
    from: [{ collectionId: 'plans', allDescendants: true }],
    where: {
      fieldFilter: { field: { fieldPath: '__name__' }, op: 'EQUAL', value: { referenceValue: `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}` } }
    }
  }
};
const qr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify(qbody) });
const qj = await qr.json();
console.log('CollectionGroup result:', JSON.stringify(qj, null, 2).slice(0, 2000));
