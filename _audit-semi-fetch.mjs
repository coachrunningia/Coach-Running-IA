import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const PLAN_ID_1 = '1779261135721';
const EMAIL_2 = 'morganedorlet696@gmail.com';
const EMAIL_1 = 'louleroy94@gmail.com';

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

// Récupère plan 1
const r1 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID_1}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const j1 = await r1.json();
if (j1.fields) {
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan1-raw.json', JSON.stringify(j1, null, 2));
  const p = flatten(j1.fields);
  fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan1.json', JSON.stringify(p, null, 2));
  console.log('Plan1 OK', p.userEmail, p.userId);
} else {
  console.log('Plan1 NOT FOUND', JSON.stringify(j1).slice(0,500));
}

// Cherche plan 2 par email user
const qbody = {
  structuredQuery: {
    from: [{ collectionId: 'plans', allDescendants: false }],
    where: {
      fieldFilter: { field: { fieldPath: 'userEmail' }, op: 'EQUAL', value: { stringValue: EMAIL_2 } }
    }
  }
};
const qr = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify(qbody) });
const qj = await qr.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-search-morgane.json', JSON.stringify(qj, null, 2));
console.log('Morgane plans:', (Array.isArray(qj)?qj:[]).length);
if (Array.isArray(qj)) {
  const plans = qj.filter(x=>x.document).map(x=>({
    id: x.document.name.split('/').pop(),
    createdAt: unwrap(x.document.fields.createdAt),
    isPreview: unwrap(x.document.fields.isPreview),
    fullPlanGenerated: unwrap(x.document.fields.fullPlanGenerated),
    name: unwrap(x.document.fields.planName),
    raw: x.document
  }));
  plans.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  console.log('All morgane plans (sorted):');
  for (const p of plans) console.log('  ', p.id, p.createdAt, 'preview='+p.isPreview, 'full='+p.fullPlanGenerated, p.name);
  if (plans.length) {
    const latest = plans[0];
    fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan2-raw.json', JSON.stringify(latest.raw, null, 2));
    fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/_audit-semi-plan2.json', JSON.stringify(flatten(latest.raw.fields), null, 2));
    console.log('Plan2 chosen:', latest.id);
  }
}

// Cherche aussi par email louleroy pour cross-check
const qbody2 = {
  structuredQuery: {
    from: [{ collectionId: 'plans', allDescendants: false }],
    where: {
      fieldFilter: { field: { fieldPath: 'userEmail' }, op: 'EQUAL', value: { stringValue: EMAIL_1 } }
    }
  }
};
const qr2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify(qbody2) });
const qj2 = await qr2.json();
if (Array.isArray(qj2)) {
  const plans = qj2.filter(x=>x.document).map(x=>({
    id: x.document.name.split('/').pop(),
    createdAt: unwrap(x.document.fields.createdAt),
    isPreview: unwrap(x.document.fields.isPreview),
    fullPlanGenerated: unwrap(x.document.fields.fullPlanGenerated),
    name: unwrap(x.document.fields.planName),
  }));
  plans.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  console.log('All louleroy plans:');
  for (const p of plans) console.log('  ', p.id, p.createdAt, 'preview='+p.isPreview, 'full='+p.fullPlanGenerated, p.name);
}
