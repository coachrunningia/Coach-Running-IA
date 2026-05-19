// Audit complet rauroy
import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'eSVsxhsqU2en9sbXbIAmL4xA72A3';
const PLAN_ID = '1775644846100';

// User doc complet
const userDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const ud = await userDoc.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/rauroy-user.json', JSON.stringify(ud, null, 2));
console.log('✅ rauroy-user.json sauvé');

// Plan complet
const planDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const pd = await planDoc.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/rauroy-plan.json', JSON.stringify(pd, null, 2));
console.log('✅ rauroy-plan.json sauvé');

// Tous les plans pour ce user (au cas où)
const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:UID} } } } }) });
const plans = (await plansResp.json()).filter(r => r.document);
console.log(`Plans tot: ${plans.length}`);
for (const p of plans) {
  console.log(`  - ${p.document.name.split('/').pop()}`);
}
