import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PLANS = [
  { name: 'lilian',  id: '1779296358366' },
  { name: 'margaux', id: '1779291819180' },
  { name: 'floggyz', id: '1779291643754' },
];

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

for (const P of PLANS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${P.id}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const j = await r.json();
  if (!j.fields) { console.log(P.name, 'NOT FOUND'); continue; }
  const p = flatten(j.fields);
  fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/_3plans-${P.name}-full.json`, JSON.stringify(p, null, 2));
  console.log(`${P.name}: uid=${p.userId} name=${p.name}`);
  if (p.userId) {
    const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${p.userId}`,
      { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
    const uj = await ur.json();
    if (uj.fields) {
      const u = flatten(uj.fields);
      fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/_3plans-${P.name}-user.json`, JSON.stringify(u, null, 2));
      console.log(`  user OK email=${u.email}`);
    } else console.log('  user NOT FOUND');
  }
}
console.log('DONE');
