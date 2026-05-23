import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const planId = '1771207028541';
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
console.log('=== Raw response status:', res.status);
console.log('=== Raw doc keys:', Object.keys(doc));
console.log('=== Has fields:', !!doc.fields);
if (doc.error) console.log('=== ERROR:', JSON.stringify(doc.error));
if (doc.fields) {
  console.log('=== Field count:', Object.keys(doc.fields).length);
  console.log('=== First fields:', Object.keys(doc.fields).slice(0, 10));
}
