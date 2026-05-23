import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const EMAILS = [
  'n.rioumarc@gmail.com',
  'lilian.raymond2007@gmail.com',
  'bertrandcassin44@gmail.com',
  'margauxmaurice@outlook.fr',
  'floggyz@outlook.fr',
  'cyril.conilleau@yahoo.fr',
  'cyril.berger@hotmail.fr',
  'paccaud.bertrand@gmail.com',
  'morganedorlet696@gmail.com',
  'louleroy94@gmail.com',
  'philippetaupin21@gmail.com',
];

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

async function queryByEmail(collection, email) {
  const qbody = {
    structuredQuery: {
      from: [{ collectionId: collection, allDescendants: false }],
      where: { fieldFilter: { field: { fieldPath: collection==='users'?'email':'userEmail' }, op: 'EQUAL', value: { stringValue: email } } }
    }
  };
  const qr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT}, body: JSON.stringify(qbody) });
  return await qr.json();
}

const summary = [];

for (const email of EMAILS) {
  const label = email.split('@')[0].replace(/[^a-z0-9]/gi,'_');
  console.log('\n=== ' + email + ' ===');
  const uj = await queryByEmail('users', email);
  let uid=null, userFlat=null;
  if (Array.isArray(uj)) {
    const userDocs = uj.filter(x=>x.document);
    if (userDocs.length) {
      uid = userDocs[0].document.name.split('/').pop();
      userFlat = flatten(userDocs[0].document.fields);
      console.log('UID:', uid);
    } else console.log('No user');
  } else console.log('USER query failed');

  const pj = await queryByEmail('plans', email);
  let plans=[];
  if (Array.isArray(pj)) {
    plans = pj.filter(x=>x.document).map(x=>({
      id: x.document.name.split('/').pop(),
      createdAt: unwrap(x.document.fields.createdAt),
      isPreview: unwrap(x.document.fields.isPreview),
      fullPlanGenerated: unwrap(x.document.fields.fullPlanGenerated),
      doc: x.document,
    }));
    plans.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  }
  console.log('plans:', plans.length);
  for (const p of plans) console.log(' ', p.id, p.createdAt, 'preview='+p.isPreview, 'full='+p.fullPlanGenerated);

  if (plans.length) {
    const latest = plans[0];
    const flat = flatten(latest.doc.fields);
    fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit11-${label}-plan.json`, JSON.stringify(flat, null, 2));
    if (userFlat) fs.writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit11-${label}-user.json`, JSON.stringify(userFlat, null, 2));
    summary.push({ email, label, uid, planId: latest.id, createdAt: latest.createdAt });
  } else {
    summary.push({ email, label, uid, planId: null });
  }
}

fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit11-summary.json', JSON.stringify(summary, null, 2));
console.log('\nDONE');
