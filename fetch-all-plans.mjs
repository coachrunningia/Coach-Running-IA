import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { execSync } from 'child_process';
const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();

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

const all = [];
let lastCreatedAt = null;
let page = 0;
while (true) {
  const sq = {
    from: [{ collectionId: 'plans' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 300,
  };
  if (lastCreatedAt) {
    sq.where = { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } };
  }
  const q = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: sq }),
  });
  const data = await q.json();
  const docs = data.filter(r => r.document);
  if (docs.length === 0) break;
  for (const r of docs) {
    all.push({ id: r.document.name.split('/').pop(), _createTime: r.document.createTime, ...pf(r.document.fields) });
  }
  page++;
  lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
  console.log(`Page ${page}: +${docs.length} (total ${all.length}) — next < ${lastCreatedAt}`);
  if (!lastCreatedAt || docs.length < 300) break;
  if (page >= 20) break;
}

console.log(`\n📦 Total plans: ${all.length}`);

const premium = all.filter(p => p.fullPlanGenerated === true);
const freemium = all.filter(p => p.fullPlanGenerated !== true);
console.log(`💎 Premium (fullPlanGenerated=true): ${premium.length}`);
console.log(`🆓 Freemium (S1 seule):              ${freemium.length}`);
const premComplete = premium.filter(p => (p.weeks||[]).length >= (p.durationWeeks || 1) * 0.8);
console.log(`   dont ≥80% sem déployées:          ${premComplete.length}`);

writeFileSync('all-plans.json', JSON.stringify(all, null, 2));
const sizeKB = (JSON.stringify(all).length / 1024).toFixed(0);
console.log(`💾 Écrit: all-plans.json (${sizeKB} KB)`);
