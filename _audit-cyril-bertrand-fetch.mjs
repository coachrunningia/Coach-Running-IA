import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const EMAILS = [
  { label: 'cyril-berger', email: 'cyril.berger@hotmail.fr' },
  { label: 'paccaud-bertrand', email: 'paccaud.bertrand@gmail.com' },
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

async function queryByEmail(collection, email) {
  const qbody = {
    structuredQuery: {
      from: [{ collectionId: collection, allDescendants: false }],
      where: {
        fieldFilter: { field: { fieldPath: collection==='users'?'email':'userEmail' }, op: 'EQUAL', value: { stringValue: email } }
      }
    }
  };
  const qr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify(qbody) });
  return await qr.json();
}

for (const { label, email } of EMAILS) {
  console.log('\n=== ' + label + ' (' + email + ') ===');

  // Find user
  const uj = await queryByEmail('users', email);
  if (!Array.isArray(uj)) {
    console.log('USER query failed:', JSON.stringify(uj).slice(0,300));
    continue;
  }
  const userDocs = uj.filter(x=>x.document);
  console.log('user docs found:', userDocs.length);
  if (!userDocs.length) {
    console.log('No user for ' + email);
    continue;
  }
  const uDoc = userDocs[0].document;
  const uid = uDoc.name.split('/').pop();
  console.log('UID:', uid);
  fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${label}-user-raw.json`, JSON.stringify(uDoc, null, 2));
  fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${label}-user.json`, JSON.stringify(flatten(uDoc.fields), null, 2));

  // Find plans (by userEmail)
  const pj = await queryByEmail('plans', email);
  if (!Array.isArray(pj)) {
    console.log('PLAN query failed:', JSON.stringify(pj).slice(0,300));
    continue;
  }
  const planDocs = pj.filter(x=>x.document);
  console.log('plan docs found:', planDocs.length);
  const summaries = planDocs.map(x=>({
    id: x.document.name.split('/').pop(),
    createdAt: unwrap(x.document.fields.createdAt),
    isPreview: unwrap(x.document.fields.isPreview),
    fullPlanGenerated: unwrap(x.document.fields.fullPlanGenerated),
    name: unwrap(x.document.fields.planName),
    raw: x.document,
  }));
  summaries.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  for (const s of summaries) {
    console.log('  ', s.id, s.createdAt, 'preview='+s.isPreview, 'full='+s.fullPlanGenerated, s.name);
  }
  if (summaries.length) {
    const latest = summaries[0];
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${label}-plan-raw.json`, JSON.stringify(latest.raw, null, 2));
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-${label}-plan.json`, JSON.stringify(flatten(latest.raw.fields), null, 2));
    console.log('Plan chosen:', latest.id, '->', `audit-${label}-plan.json`);
  }
}
