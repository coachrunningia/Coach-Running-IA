import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = '76JExiX6ZRcFxZjKvkiyCRZ4rrl1';

const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${UID}`, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const uj = await ur.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-1779185876450-user.json', JSON.stringify(uj, null, 2));
console.log('User doc saved');
console.log('Email:', uj.fields?.email?.stringValue);
console.log('Display:', uj.fields?.displayName?.stringValue);
console.log('Created:', uj.createTime);
console.log('Updated:', uj.updateTime);
