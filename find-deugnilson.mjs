/**
 * Trouve toute trace de deugnilson : users, plans, freemium, etc.
 */
import { execSync } from 'child_process';
const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const NEEDLE = 'deugnilson';

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

async function listCollections() {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:listCollectionIds`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const j = await res.json();
  return j.collectionIds || [];
}

async function listDocs(coll, limit = 1000) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}?pageSize=${limit}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await res.json();
  return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...pf(d.fields) }));
}

const colls = await listCollections();
console.log('Collections:', colls.join(', '));

// users
if (colls.includes('users')) {
  console.log('\n── USERS ──');
  const users = await listDocs('users', 2000);
  const matches = users.filter(u => JSON.stringify(u).toLowerCase().includes(NEEDLE));
  console.log(`Total users: ${users.length} • match "${NEEDLE}": ${matches.length}`);
  matches.forEach(u => console.log(' -', u.id, '|', u.email || u.userEmail, '|', u.displayName || u.name || ''));
}

// plans (search large)
if (colls.includes('plans')) {
  console.log('\n── PLANS ──');
  // récupère tous les plans, filtre côté client (insensible casse)
  const all = [];
  let lastCreatedAt = null;
  while (true) {
    const sq = {
      from: [{ collectionId: 'plans' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300,
    };
    if (lastCreatedAt) sq.where = { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } };
    const q = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: sq }),
    });
    const data = await q.json();
    const docs = (Array.isArray(data) ? data : []).filter(r => r.document);
    if (docs.length === 0) break;
    for (const r of docs) {
      const obj = { id: r.document.name.split('/').pop(), _createTime: r.document.createTime, ...pf(r.document.fields) };
      all.push(obj);
    }
    lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
    if (!lastCreatedAt || docs.length < 300) break;
    if (all.length > 5000) break;
  }
  console.log(`Total plans: ${all.length}`);
  const matches = all.filter(p =>
    (p.userEmail||'').toLowerCase().includes(NEEDLE) ||
    (p.generationContext?.email||'').toLowerCase().includes(NEEDLE) ||
    (p.generationContext?.userEmail||'').toLowerCase().includes(NEEDLE) ||
    (p.email||'').toLowerCase().includes(NEEDLE)
  );
  console.log(`Match "${NEEDLE}": ${matches.length}`);
  matches.forEach(p => console.log(' -', p.id, '|', p.userEmail||p.email, '|', p.name, '|', p.createdAt));
}
