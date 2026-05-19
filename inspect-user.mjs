import { execSync } from 'child_process';
const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const UID = 'CxIr00SfkxOme5npEDxLKUPeQUi1';
const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/users/${UID}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
const d = await r.json();
const qd = d.fields?.questionnaireData?.mapValue?.fields || {};
console.log('questionnaireData keys:', Object.keys(qd).sort());
for (const k of Object.keys(qd).sort()) {
  const v = qd[k];
  let val = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue;
  if (v.arrayValue) val = '[' + (v.arrayValue.values||[]).map(x => x.stringValue ?? x.integerValue ?? JSON.stringify(x)).join(',') + ']';
  if (v.mapValue) {
    const sub = v.mapValue.fields || {};
    val = '{' + Object.entries(sub).map(([sk, sv]) => `${sk}=${sv.stringValue ?? sv.integerValue ?? sv.doubleValue ?? JSON.stringify(sv)}`).join(', ') + '}';
  }
  console.log(`  ${k} = ${val}`);
}
