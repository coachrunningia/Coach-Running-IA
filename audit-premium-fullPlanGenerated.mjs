/**
 * AUDIT READ-ONLY : vérifie que 100 % des plans des users premium actifs ont fullPlanGenerated=true.
 * Objectif : confirmer qu'utiliser `plan.fullPlanGenerated` comme gate ne bloque aucun premium légitime.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
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

async function listAll(coll) {
  const all = [];
  let pageToken = null;
  while (true) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}?pageSize=300${pageToken?`&pageToken=${pageToken}`:''}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${access_token}` } });
    const j = await res.json();
    (j.documents || []).forEach(d => all.push({ id: d.name.split('/').pop(), ...pf(d.fields) }));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return all;
}

console.log('Chargement users + plans...');
const [users, plans] = await Promise.all([listAll('users'), listAll('plans')]);
console.log(`Users: ${users.length}  •  Plans: ${plans.length}`);

// Plans qu'on cherche à protéger : ceux des users premium actifs OU plan unique
const eligibleUsers = users.filter(u => u.isPremium === true || u.hasPurchasedPlan === true);
const eligibleUserIds = new Set(eligibleUsers.map(u => u.id));
console.log(`Users éligibles "Ajuster VMA" (isPremium=true OU hasPurchasedPlan=true): ${eligibleUsers.length}`);

// Pour chaque plan d'un user éligible : check fullPlanGenerated
const eligiblePlans = plans.filter(p => p.userId && eligibleUserIds.has(p.userId));
console.log(`Plans liés à un user éligible: ${eligiblePlans.length}\n`);

const buckets = {
  full_true: [],          // fullPlanGenerated === true (OK pour le gate)
  full_false_with_weeks: [],  // fullPlanGenerated !== true MAIS toutes les semaines déployées (bug à investiguer)
  full_false_preview: [], // fullPlanGenerated !== true ET preview (1 sem) — normal pour freemium pas converti
  full_false_partial: [], // fullPlanGenerated !== true ET 2-N sem (en cours / incohérent)
};

for (const p of eligiblePlans) {
  const w = (p.weeks || []).length;
  const dur = p.durationWeeks || w;
  const fg = p.fullPlanGenerated === true;
  if (fg) { buckets.full_true.push(p); continue; }
  if (w >= dur || w >= 8) { buckets.full_false_with_weeks.push(p); continue; }
  if (w <= 1) { buckets.full_false_preview.push(p); continue; }
  buckets.full_false_partial.push(p);
}

console.log(`── PLANS DES PREMIUMS — ÉTAT fullPlanGenerated ──`);
console.log(`✅ fullPlanGenerated=true (gate OK):                    ${buckets.full_true.length}`);
console.log(`🔴 fullPlanGenerated=false MAIS toutes sem déployées:   ${buckets.full_false_with_weeks.length}  ← problème potentiel`);
console.log(`🟡 fullPlanGenerated=false ET 2-N sem (partiel):        ${buckets.full_false_partial.length}`);
console.log(`⚪ fullPlanGenerated=false ET ≤1 sem (preview normal):  ${buckets.full_false_preview.length}`);

if (buckets.full_false_with_weeks.length > 0) {
  console.log(`\n── DÉTAIL — plans "complets" sans le flag (CES PREMIUMS SERAIENT BLOQUÉS PAR MON PATCH) ──`);
  buckets.full_false_with_weeks.forEach(p => {
    const u = users.find(x => x.id === p.userId);
    console.log(`  ${p.createdAt?.substring(0,16)}  ${u?.email?.padEnd(38)}  plan=${p.id} weeks=${p.weeks.length}/${p.durationWeeks}  isPreview=${p.isPreview}  isPremium=${u?.isPremium}  hasPurchased=${u?.hasPurchasedPlan}`);
  });
}

if (buckets.full_false_partial.length > 0) {
  console.log(`\n── DÉTAIL — plans partiels (génération interrompue ?) ──`);
  buckets.full_false_partial.slice(0, 20).forEach(p => {
    const u = users.find(x => x.id === p.userId);
    console.log(`  ${p.createdAt?.substring(0,16)}  ${u?.email?.padEnd(38)}  plan=${p.id} weeks=${p.weeks.length}/${p.durationWeeks}`);
  });
}

writeFileSync('audit-premium-fullPlanGenerated.json', JSON.stringify(buckets, null, 2));
console.log(`\n💾 audit-premium-fullPlanGenerated.json`);
