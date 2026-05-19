/**
 * Audit des plans et inscrits dans les 24h glissantes,
 * en excluant ceux déjà analysés dans cette session.
 *
 * Plans déjà analysés (à exclure) :
 *   - 1778648613186 (deugnilson freemium)
 *   - 1778654056401 (deugnilson payant 19sem)
 *   - 1778654000218 (lameymichel@yahoo)
 *   - 1778667864907 (garrel.florian)
 *   - 1778669503908 (lamey.michel)
 *   - 1778673418021 (bruno.grange)
 *   - 1778675188561 (mainmain)
 *   - 1778677412470 (estenoza.tom)
 *   - 1778615277138 (arnaudmanoeuvre payant 24sem)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const ALREADY_ANALYZED = new Set([
  '1778648613186', '1778654056401', '1778654000218', '1778667864907',
  '1778669503908', '1778673418021', '1778675188561', '1778677412470',
  '1778615277138',
]);

// Fenêtre 24h glissantes : maintenant - 24h
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const sinceISO = since.toISOString();
console.log(`Fenêtre : depuis ${since.toLocaleString('fr-FR')}\n`);

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

// ============ 1. PLANS dans la fenêtre ============
async function queryPlans() {
  const all = [];
  let lastCreatedAt = null;
  while (true) {
    const sq = {
      from: [{ collectionId: 'plans' }],
      where: lastCreatedAt
        ? { compositeFilter: { op: 'AND', filters: [
            { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: sinceISO } } },
            { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } },
          ]}}
        : { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: sinceISO } } },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 100,
    };
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: sq }),
    });
    const data = await r.json();
    const docs = (Array.isArray(data) ? data : []).filter(d => d.document);
    if (docs.length === 0) break;
    for (const d of docs) all.push({ id: d.document.name.split('/').pop(), ...pf(d.document.fields) });
    lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
    if (docs.length < 100) break;
    if (all.length >= 200) break;
  }
  return all;
}

// ============ 2. USERS dans la fenêtre ============
async function queryUsers() {
  // Pas d'index sur createdAt → on charge tous et filtre côté client
  const all = [];
  let pageToken = null;
  while (true) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=300${pageToken?`&pageToken=${pageToken}`:''}`;
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${access_token}` } });
    const j = await r.json();
    (j.documents || []).forEach(d => all.push({ id: d.name.split('/').pop(), ...pf(d.fields) }));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return all.filter(u => u.createdAt && new Date(u.createdAt) >= since);
}

const [plans, users] = await Promise.all([queryPlans(), queryUsers()]);
console.log(`Plans 24h: ${plans.length}`);
console.log(`Users inscrits 24h: ${users.length}\n`);

// === Liste détaillée ===
const newPlans = plans.filter(p => !ALREADY_ANALYZED.has(p.id));
console.log(`Plans NON encore analysés : ${newPlans.length}\n`);
console.log(`${'─'.repeat(110)}`);
console.log(`${'PLANS 24H'.padEnd(110)}`);
console.log(`${'─'.repeat(110)}`);

newPlans.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).forEach(p => {
  const t = p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '?';
  const w = (p.weeks || []).length;
  const dur = p.durationWeeks || '?';
  const status = p.feasibility?.status || '?';
  const ctx = p.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const q = ctx.questionnaireData || {};
  const age = snap.age || q.age || '?';
  const lvl = snap.level || q.level || '?';
  const hasInj = !!(snap.injuries?.hasInjury || q.injuries?.hasInjury);
  console.log(`  ${t.padEnd(14)} | ${p.id} | ${(p.userEmail||'?').padEnd(34)} | ${w}/${String(dur).padEnd(3)} | ${status.padEnd(11)} | ${age}ans | ${lvl.substring(0,18).padEnd(18)} | ${hasInj?'BLESSURE':'         '}`);
});

console.log(`\n${'─'.repeat(110)}`);
console.log(`USERS INSCRITS 24H (${users.length})`);
console.log(`${'─'.repeat(110)}`);
users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).forEach(u => {
  const t = u.createdAt ? new Date(u.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '?';
  const linkedPlan = plans.find(p => p.userId === u.id);
  console.log(`  ${t.padEnd(14)} | ${u.id.substring(0,16)} | ${(u.email||'?').padEnd(40)} | ${u.firstName||'?'.padEnd(15)} | premium=${u.isPremium} | plan=${linkedPlan?linkedPlan.id:'(aucun)'}`);
});

writeFileSync('audit-24h-non-vus-plans.json', JSON.stringify(newPlans, null, 2));
writeFileSync('audit-24h-non-vus-users.json', JSON.stringify(users, null, 2));
console.log(`\n💾 audit-24h-non-vus-plans.json + audit-24h-non-vus-users.json`);
