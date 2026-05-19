// Fetch nouveau plan rich
import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PLAN_ID = '1779135832271';

const planDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const pd = await planDoc.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-rich-NEW-pre-patch.json', JSON.stringify(pd, null, 2));
console.log('✅ backup-rich-NEW-pre-patch.json sauvé');
console.log('Taille:', JSON.stringify(pd).length, 'chars');
