import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth print-access-token --account=programme@coachrunningia.fr', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

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

const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h
const sinceISO = since.toISOString();

async function queryPlans() {
  const sq = {
    from: [{ collectionId: 'plans' }],
    where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: sinceISO } } },
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 30,
  };
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: sq }),
  });
  const data = await r.json();
  const docs = (Array.isArray(data) ? data : []).filter(d => d.document);
  return docs.map(d => ({ id: d.document.name.split('/').pop(), ...pf(d.document.fields) }));
}

const plans = await queryPlans();
console.log(`Plans dernières 2h : ${plans.length}\n`);
for (const p of plans) {
  const t = p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '?';
  const ctx = p.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const q = ctx.questionnaireData || {};
  const goal = p.goal || snap.goal || q.goal || '?';
  const subGoal = snap.subGoal || q.subGoal || '?';
  const target = p.targetTime || snap.targetTime || q.targetTime || '?';
  const age = snap.age || q.age || '?';
  const sex = snap.sex || q.sex || '?';
  const dist = p.distance || snap.distance || '?';
  console.log(`${t} | ${p.id} | ${(p.userEmail||'?').padEnd(38)} | ${goal} ${subGoal} ${target} | ${age}ans ${sex} | dist=${dist}`);
}

// Identifier celui qui matche : Semi 2h00 60ans Femme
const target = plans.find(p => {
  const ctx = p.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const q = ctx.questionnaireData || {};
  const subGoal = snap.subGoal || q.subGoal || '';
  const tt = p.targetTime || snap.targetTime || q.targetTime || '';
  return /semi/i.test(subGoal) && /2.*0?0/.test(tt);
});

if (target) {
  console.log(`\n=== MATCH SEMI 2h00 : ${target.id} ===`);
  writeFileSync('audit-plan-romane-test.json', JSON.stringify(target, null, 2));
  console.log('-> audit-plan-romane-test.json');

  // Fetch user
  const userId = target.userId;
  if (userId) {
    const ur = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    const uj = await ur.json();
    const user = uj.fields ? { id: userId, ...pf(uj.fields) } : { id: userId, error: uj };
    writeFileSync('audit-user-romane-test.json', JSON.stringify(user, null, 2));
    console.log(`-> audit-user-romane-test.json (uid=${userId})`);
  }
} else {
  console.log('\n⚠️ Aucun match Semi 2h00. Affichage TOUS les plans 2h pour identification manuelle.');
  writeFileSync('audit-plans-2h.json', JSON.stringify(plans, null, 2));
}
