// Fetch plan Alan + user doc, dump bruts
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'yzvy4Csd7OMYT7x5Xx6YPnFpML12';
const PLAN_ID = '1779114282783';

const planResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const plan = await planResp.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-plan-alan-pre-patch.json', JSON.stringify(plan, null, 2));
console.log('Plan backup OK -> backup-plan-alan-pre-patch.json');

const userResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const userDoc = await userResp.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-user-alan-pre-patch.json', JSON.stringify(userDoc, null, 2));
console.log('User backup OK -> backup-user-alan-pre-patch.json');

// extract feasibility + welcomeMessage
const f = plan.fields || {};
console.log('\n=== TOP-LEVEL PLAN FIELDS ===');
console.log(Object.keys(f).sort().join('\n'));

if (f.feasibility) {
  console.log('\n=== feasibility ===');
  console.log(JSON.stringify(f.feasibility, null, 2));
}
if (f.welcomeMessage) {
  console.log('\n=== welcomeMessage ===');
  console.log(f.welcomeMessage.stringValue || JSON.stringify(f.welcomeMessage, null, 2));
}

const uf = userDoc.fields || {};
if (uf.questionnaireData) {
  const q = uf.questionnaireData.mapValue?.fields || {};
  console.log('\n=== USER questionnaire (full) ===');
  for (const [k, v] of Object.entries(q)) {
    const val = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.doubleValue ?? JSON.stringify(v);
    console.log(`  ${k}: ${val}`);
  }
}
