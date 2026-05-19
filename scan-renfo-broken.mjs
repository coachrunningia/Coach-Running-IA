/**
 * Scanne TOUS les plans pour détecter les sessions Renforcement qui ont raté buildRenfoMainSet.
 * Signature du bug : title === 'Renforcement musculaire' ou 'Renforcement léger' (titre Gemini brut)
 * OU mainSet ne contient AUCUN match du pattern Nom(NxM) attendu.
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

console.log('Chargement plans...');
const plans = await listAll('plans');
console.log(`Total: ${plans.length}\n`);

// Pattern propre attendu (généré par buildRenfoMainSet)
const cleanFormat = /\([0-9]+x[0-9]+/;
// Titres génériques bruts
const genericTitleRe = /^(Renforcement musculaire|Renforcement léger|Renforcement musculaire général|Renforcement$)/i;

const brokenSessions = [];
let totalRenfo = 0;
let cleanRenfo = 0;

for (const p of plans) {
  const weeks = p.weeks || [];
  for (const w of weeks) {
    for (const s of (w.sessions || [])) {
      if (s.type !== 'Renforcement') continue;
      totalRenfo++;
      const title = s.title || '';
      const main = s.mainSet || '';
      const hasCleanFormat = cleanFormat.test(main);
      const hasGenericTitle = genericTitleRe.test(title);
      if (hasCleanFormat) { cleanRenfo++; continue; }
      brokenSessions.push({
        planId: p.id,
        userEmail: p.userEmail,
        weekNumber: w.weekNumber,
        title,
        duration: s.duration,
        mainSetStart: main.substring(0, 80),
        sessionId: s.id,
        createdAt: p.createdAt,
        genericTitle: hasGenericTitle,
      });
    }
  }
}

console.log(`── BILAN ──`);
console.log(`Total renfo: ${totalRenfo}`);
console.log(`Format propre (Nom(NxM)): ${cleanRenfo} (${(cleanRenfo/totalRenfo*100).toFixed(0)}%)`);
console.log(`🔴 Format cassé: ${brokenSessions.length} (${(brokenSessions.length/totalRenfo*100).toFixed(0)}%)\n`);

// Groupes par plan
const byPlan = {};
brokenSessions.forEach(b => (byPlan[b.planId] = byPlan[b.planId] || []).push(b));
const plansAffected = Object.keys(byPlan).length;
console.log(`Plans affectés: ${plansAffected} sur ${plans.length}`);

// Pattern des titres
const titlePattern = {};
brokenSessions.forEach(b => titlePattern[b.title] = (titlePattern[b.title]||0) + 1);
console.log(`\n── TITRES PROBLÉMATIQUES (top) ──`);
Object.entries(titlePattern).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([t,n]) => console.log(`  ${String(n).padStart(4)}  "${t}"`));

// Top plans affectés
console.log(`\n── TOP 15 PLANS AFFECTÉS ──`);
Object.entries(byPlan).sort((a,b)=>b[1].length-a[1].length).slice(0,15).forEach(([id, list]) => {
  console.log(`  ${id}  ${list[0].userEmail?.padEnd(35)} ${list.length} renfo cassés  •  semaines ${list.map(x=>x.weekNumber).join(',')}`);
});

// Distribution dans le temps
const byMonth = {};
brokenSessions.forEach(b => {
  const m = (b.createdAt||'').substring(0,7);
  byMonth[m] = (byMonth[m]||0) + 1;
});
console.log(`\n── PAR MOIS DE CRÉATION DU PLAN ──`);
Object.entries(byMonth).sort().forEach(([m,n]) => console.log(`  ${m}  ${n} renfo cassés`));

writeFileSync('scan-renfo-broken.json', JSON.stringify({totalRenfo, cleanRenfo, broken: brokenSessions, byPlan, titlePattern, byMonth}, null, 2));
console.log(`\n💾 scan-renfo-broken.json`);
