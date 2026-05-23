import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

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

// Plan louleroy 1779260474961
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/1779260474961`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const j = await r.json();
if (j.fields) {
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan-louleroy-raw.json', JSON.stringify(j, null, 2));
  const p = flatten(j.fields);
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan-louleroy.json', JSON.stringify(p, null, 2));
  console.log('Louleroy plan OK', p.userEmail, p.userId);
} else console.log('NOT FOUND', JSON.stringify(j).slice(0,300));

// Récupère les 2 users
for (const [label, uid] of [['louleroy','PgIqRYG1HNZj1TJlfeRZTrEfh383'], ['morgane','BpoCyHQcCfavcmSby0u5LIdLS3o1']]) {
  const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const j2 = await r2.json();
  if (j2.fields) {
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/_audit-semi-user-${label}.json`, JSON.stringify(flatten(j2.fields), null, 2));
    console.log(label, 'user OK');
  } else console.log(label, 'NOT FOUND uid', uid, JSON.stringify(j2).slice(0,200));
}
