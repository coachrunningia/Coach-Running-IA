import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779188625574';

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const j = await r.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-plan.json', JSON.stringify(j, null, 2));
console.log('Plan saved. createTime:', j.createTime, 'updateTime:', j.updateTime);
console.log('Top-level fields:', Object.keys(j.fields || {}).join(', '));
