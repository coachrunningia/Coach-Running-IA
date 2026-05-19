import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const EMAIL = 'wozniak.maeva2@gmail.com';

// Run structured query to find user by email
const query = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'email' },
        op: 'EQUAL',
        value: { stringValue: EMAIL }
      }
    },
    limit: 5
  }
};

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT },
  body: JSON.stringify(query)
});
const j = await r.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/find-wozniakmaeva-raw.json', JSON.stringify(j, null, 2));
console.log('Raw results:', JSON.stringify(j).slice(0, 500));

const docs = (j || []).filter(x => x.document);
console.log(`Found ${docs.length} user(s)`);
for (const d of docs) {
  const path = d.document.name;
  const uid = path.split('/').pop();
  console.log('UID:', uid);
  console.log('Email:', d.document.fields?.email?.stringValue);
  console.log('Created:', d.document.createTime);
}
