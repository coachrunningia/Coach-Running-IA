import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PLAN_ID = '1779342759388';

function unwrap(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) {
    const r = {};
    for (const k in v.mapValue.fields||{}) r[k]=unwrap(v.mapValue.fields[k]);
    return r;
  }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(unwrap);
  if ('nullValue' in v) return null;
  return v;
}

function flatten(fields) {
  const o = {};
  for (const k in fields) o[k] = unwrap(fields[k]);
  return o;
}

// Fetch plan by ID
const planUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const pr = await fetch(planUrl, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planRaw = await pr.json();

if (planRaw.error) {
  console.error('Plan fetch error:', JSON.stringify(planRaw.error).slice(0,400));
  process.exit(1);
}
fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${PLAN_ID}-plan-raw.json`, JSON.stringify(planRaw, null, 2));
const planFlat = flatten(planRaw.fields);
fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${PLAN_ID}-plan.json`, JSON.stringify(planFlat, null, 2));

console.log('Plan fetched:', PLAN_ID);
console.log('userId:', planFlat.userId);
console.log('userEmail:', planFlat.userEmail);
console.log('planName:', planFlat.planName);
console.log('createdAt:', planFlat.createdAt);
console.log('isPreview:', planFlat.isPreview, 'full:', planFlat.fullPlanGenerated);

const uid = planFlat.userId;
const email = planFlat.userEmail;

// Fetch user by UID
if (uid) {
  const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`;
  const ur = await fetch(userUrl, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const userRaw = await ur.json();
  if (userRaw.error) {
    console.error('User fetch error:', JSON.stringify(userRaw.error).slice(0,400));
  } else {
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${PLAN_ID}-user-raw.json`, JSON.stringify(userRaw, null, 2));
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${PLAN_ID}-user.json`, JSON.stringify(flatten(userRaw.fields), null, 2));
    console.log('User fetched OK');
  }
}
