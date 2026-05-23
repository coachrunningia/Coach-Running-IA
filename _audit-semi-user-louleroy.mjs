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
  if ('mapValue' in v) { const r={}; for (const k in v.mapValue.fields||{}) r[k]=unwrap(v.mapValue.fields[k]); return r; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(unwrap);
  if ('nullValue' in v) return null;
  return v;
}
function flatten(fields) { const o={}; for (const k in fields) o[k]=unwrap(fields[k]); return o; }

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/t4SVXgKvmLVhQGno9X0NLWoOYA13`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const j = await r.json();
console.log('keys:', Object.keys(j));
if (j.fields) {
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-user-louleroy.json', JSON.stringify(flatten(j.fields), null, 2));
  console.log('OK');
} else console.log(JSON.stringify(j).slice(0,400));
