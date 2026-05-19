/**
 * Inspecte les 10 cas suspects en profondeur : trace de génération, vmaSource, etc.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const SUSPECTS = [
  'c.lecarpentier175@gmail.com',
  'emiliendylanh@gmail.com',
  'ch.courtin01@gmail.com',
  'tieffryguillaume@hotmail.fr',
  'mosbahmelissa54@gmail.com',
  'nicoooas@yahoo.fr',
  'azkaine24@gmail.com',
  'mattrabi@hotmail.fr',
  'julienfriche13@gmail.com',
  'rouet.dimitri@hotmail.fr',
];

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

async function query(coll, field, value) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: coll }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
        limit: 10,
      }
    }),
  });
  const d = await r.json();
  return (Array.isArray(d)?d:[]).filter(r=>r.document).map(r=>({id:r.document.name.split('/').pop(),_create:r.document.createTime,...pf(r.document.fields)}));
}

const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

log(`${'═'.repeat(100)}`);
log(`INVESTIGATION 10 SUSPECTS — plans complets sans paiement Stripe ni cadeau`);
log(`${'═'.repeat(100)}`);

for (const email of SUSPECTS) {
  log(`\n──────── ${email} ────────`);
  const users = await query('users', 'email', email);
  log(`  Users Firestore: ${users.length}`);
  users.forEach(u => {
    log(`    UID=${u.id.substring(0,16)}  isPremium=${u.isPremium}  hasPurchased=${u.hasPurchasedPlan}  stripeCust=${u.stripeCustomerId||'(none)'}  createdAt=${u.createdAt?.substring(0,16)||'?'}  firstName=${u.firstName||'?'}`);
  });
  const plans = await query('plans', 'userEmail', email);
  log(`  Plans (userEmail=${email}): ${plans.length}`);
  plans.forEach(p => {
    const w = (p.weeks||[]).length;
    log(`    plan=${p.id}  weeks=${w}/${p.durationWeeks}  isPreview=${p.isPreview}  fullPlanGenerated=${p.fullPlanGenerated}  isFreePreview=${p.isFreePreview}  createdAt=${p.createdAt?.substring(0,16)||'?'}  userId=${p.userId?.substring(0,16)}`);
    if (p.vmaSource) log(`      vmaSource: "${p.vmaSource}"`);
    if (p.adaptationLog?.adaptationHistory?.length) log(`      adaptations: ${p.adaptationLog.adaptationHistory.length}`);
  });
}

writeFileSync('inspect-10-suspects.txt', lines.join('\n'));
console.log(`\n📝 inspect-10-suspects.txt`);
