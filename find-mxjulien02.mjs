import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const EMAIL = 'mxjulien02@gmail.com';

// 1. Trouver l'UID via Firebase Auth
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ email:[EMAIL] }) });
const j = await r.json();
console.log('Auth lookup:', JSON.stringify(j, null, 2));

if (!j.users?.length) {
  console.log('Not in Auth. Searching by userEmail in plans...');
  let pageToken = null;
  let allFound = [];
  let pages = 0;
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const pr = await fetch(url, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
    const pj = await pr.json();
    const docs = pj.documents || [];
    const matched = docs.filter(d => {
      const e = (d.fields?.userEmail?.stringValue || '').toLowerCase();
      return e.includes('mxjulien02');
    });
    for (const m of matched) {
      const f = m.fields || {};
      allFound.push({ planId: m.name.split('/').pop(), email: f.userEmail?.stringValue, userId: f.userId?.stringValue, createdAt: f.createdAt?.timestampValue || f.creationDate?.timestampValue });
    }
    pageToken = pj.nextPageToken;
    pages++;
    if (pages > 30) break;
  } while (pageToken);
  console.log('Plans matchés:', JSON.stringify(allFound, null, 2));
  process.exit(0);
}

const uid = j.users[0].localId;
console.log(`\nUID: ${uid}`);

// 2. Fetch user doc
const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const uj = await ur.json();
console.log('\n--- USER DOC ---');
console.log(JSON.stringify(uj, null, 2).slice(0, 5000));

// 3. Lister plans via runQuery filtré sur userId
const qbody = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    where: {
      fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } }
    }
  }
};
const qr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify(qbody) });
const qj = await qr.json();
console.log('\n--- PLANS FOUND ---');
const plans = (qj || []).filter(x => x.document).map(x => {
  const f = x.document.fields;
  return {
    planId: x.document.name.split('/').pop(),
    userEmail: f.userEmail?.stringValue,
    createdAt: f.createdAt?.timestampValue || f.creationDate?.timestampValue,
    planName: f.planName?.stringValue,
    goal: f.goal?.stringValue,
    subGoal: f.subGoal?.stringValue,
  };
});
console.log(JSON.stringify(plans, null, 2));
