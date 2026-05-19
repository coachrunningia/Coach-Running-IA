/**
 * Audit avancé deugnilson@gmail.com — D+, charge renfo, images, premium.
 * Run: node audit-deugnilson-v2.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const EMAIL = 'deugnilson@gmail.com';

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

// ---- Charger le user ----
async function getUser(email) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 1,
      }
    }),
  });
  const d = await res.json();
  const doc = (Array.isArray(d) ? d : []).find(r => r.document)?.document;
  return doc ? { id: doc.name.split('/').pop(), ...pf(doc.fields) } : null;
}

// ---- Plan via dump déjà sauvegardé ----
const dump = JSON.parse(readFileSync('audit-deugnilson-raw.json', 'utf-8'));
const planPayant = dump.find(p => (p.weeks||[]).length > 1) || dump[0];

// ---- Catalogue images (parse TypeScript en regex simple) ----
function loadCatalog() {
  const src = readFileSync(resolve(__dirname, 'src/services/exerciseCatalog.ts'), 'utf-8');
  const keys = [];
  // matches: "nom de l'exercice": {
  const re = /^\s{2}"([^"]+)":\s*\{/gm;
  let m;
  while ((m = re.exec(src)) !== null) keys.push(m[1]);
  return new Set(keys);
}
const CATALOG = loadCatalog();

function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function findInCatalog(rawName) {
  const n = normalize(rawName);
  if (CATALOG.has(n)) return n;
  for (const k of CATALOG) if (n.includes(k) || k.includes(n)) return k;
  const words = n.split(' ').filter(w => w.length > 3);
  for (const k of CATALOG) {
    const kw = k.split(' ');
    const c = words.filter(w => kw.some(x => x.includes(w) || w.includes(x))).length;
    if (c >= 2) return k;
  }
  return null;
}
function parseExercises(mainSet) {
  const out = [];
  if (!mainSet) return out;
  const regex = /([A-ZÀ-Ü][a-zà-ü\-\s']+(?:[A-ZÀ-Ü][a-zà-ü\-\s']*)*(?:\s*\((?!\d+x\d+)[^)]*\))*)\s*\((\d+x\d+[^)]*)\)/g;
  let m;
  while ((m = regex.exec(mainSet)) !== null) out.push({ raw: m[1].trim(), sets: m[2].trim() });
  return out;
}

// ---- Images disponibles dans public/exercises ----
const imageFiles = new Set(readdirSync(resolve(__dirname, 'public/exercises')));
function hasImage(catalogKey) {
  // imageUrl convention: /exercises/<key-with-dashes>.png
  const filename = catalogKey.replace(/ /g, '-') + '.png';
  return imageFiles.has(filename);
}

// ---- Parsing durée séance "1h 00 min" / "40-45 min" → minutes ----
function durationToMin(d) {
  if (!d) return 0;
  const s = String(d);
  let total = 0;
  const h = s.match(/(\d+)\s*h/i); if (h) total += parseInt(h[1]) * 60;
  const m = s.match(/(\d+)(?:-\d+)?\s*min/i); if (m) total += parseInt(m[1]);
  if (!h && !m) {
    const n = s.match(/^(\d+)/); if (n) total = parseInt(n[1]); // suppose minutes
  }
  return total;
}

// ============== ANALYSE ==============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

const user = await getUser(EMAIL);
const weeks = planPayant.weeks || [];

log(`\n${'═'.repeat(100)}`);
log(`  AUDIT AVANCÉ — deugnilson@gmail.com — Plan ${planPayant.id}`);
log(`${'═'.repeat(100)}\n`);

// ---- 1. STATUT PREMIUM ----
log(`── STATUT PREMIUM ──`);
if (!user) {
  log(`🔴 User introuvable dans la collection users`);
} else {
  log(`User ID: ${user.id}`);
  log(`Email: ${user.email}`);
  log(`isPremium: ${user.isPremium === true ? '✅ true' : '❌ ' + user.isPremium}`);
  log(`Stripe customerId: ${user.stripeCustomerId || '(aucun)'}`);
  log(`Stripe status: ${user.stripeSubscriptionStatus || '(aucun)'}`);
  log(`Plan attendu: 19 semaines déployées (${weeks.length}/19 OK)`);
  if (weeks.length === planPayant.durationWeeks && user.isPremium !== true) {
    log(`⚠️  Plan complet déployé mais isPremium != true — incohérence`);
  }
}

// ---- 2. D+ PROGRESSION ----
log(`\n── DÉNIVELÉ POSITIF (D+) ──`);
const goalElevation = planPayant.generationContext?.questionnaireData?.trailDetails?.elevation
  || planPayant.generationContext?.trailDetails?.elevation
  || planPayant.generationContext?.questionnaireData?.elevation
  || 1300;
log(`D+ cible (course): ${goalElevation}m`);

const slByWeek = weeks.map(w => {
  const ss = (w.sessions||[]).filter(s => /longue/i.test(s.type||''));
  return { week: w.weekNumber, sessions: ss };
});
let totalElevWithD = 0, totalSL = 0, maxSLelev = 0;
const dPlusLine = [];
for (const r of slByWeek) {
  const elev = r.sessions.reduce((s, x) => s + (x.elevationGain || 0), 0);
  dPlusLine.push(`S${r.week}=${elev}m`);
  if (r.sessions.length > 0) totalSL++;
  if (elev > 0) totalElevWithD++;
  if (elev > maxSLelev) maxSLelev = elev;
}
log(`D+ par SL hebdo: ${dPlusLine.join('  ')}`);
log(`SL avec D+ > 0: ${totalElevWithD}/${totalSL}`);
log(`D+ max sur une SL: ${maxSLelev}m`);

// Total D+ par semaine (toutes séances)
const totalDplusByWeek = weeks.map(w => (w.sessions||[]).reduce((s,x) => s + (x.elevationGain||0), 0));
log(`D+ total hebdo (toutes séances): ${totalDplusByWeek.map((v,i)=>`S${i+1}=${v}m`).join('  ')}`);
const totalDplusPlan = totalDplusByWeek.reduce((s,v)=>s+v, 0);
log(`D+ cumulé sur le plan: ${totalDplusPlan}m  •  Course = ${goalElevation}m`);
if (totalDplusPlan < goalElevation * 5) {
  log(`🔴 D+ cumulé (${totalDplusPlan}m) très faible vs course ${goalElevation}m — préparation spécifique trail insuffisante`);
}
if (maxSLelev < goalElevation * 0.4) {
  log(`🟡 SL la plus dénivelée = ${maxSLelev}m vs ${goalElevation}m cible — devrait atteindre 60-80 % du D+ course (cible ≥${Math.round(goalElevation*0.6)}m)`);
}

// ---- 3. CHARGE RENFO PROGRESSION ----
log(`\n── RENFORCEMENT MUSCULAIRE : ÉVOLUTION CHARGE ──`);
const renfoByWeek = weeks.map(w => {
  const r = (w.sessions||[]).filter(s => /renfo/i.test(s.type||''));
  return r.map(s => ({
    week: w.weekNumber,
    title: s.title,
    duration: s.duration,
    durMin: durationToMin(s.duration),
    mainSet: s.mainSet || '',
    intensity: s.intensity,
  }));
}).flat();

log(`Total renfo: ${renfoByWeek.length} sur ${weeks.length} semaines`);
log(`Durées renfo: ${renfoByWeek.map(r=>`S${r.week}=${r.durMin}min`).join('  ')}`);
const durs = renfoByWeek.map(r=>r.durMin);
log(`Durée min/max/moy: ${Math.min(...durs)}/${Math.max(...durs)}/${(durs.reduce((s,v)=>s+v,0)/durs.length).toFixed(0)} min`);
const firstHalf = durs.slice(0, Math.floor(durs.length/2));
const secondHalf = durs.slice(Math.floor(durs.length/2));
const avgFirst = firstHalf.reduce((s,v)=>s+v,0)/firstHalf.length;
const avgSecond = secondHalf.reduce((s,v)=>s+v,0)/secondHalf.length;
log(`Moy 1ère moitié: ${avgFirst.toFixed(0)} min  •  Moy 2e moitié: ${avgSecond.toFixed(0)} min  •  Δ: ${avgSecond>avgFirst?'+':''}${(avgSecond-avgFirst).toFixed(0)} min`);
if (avgSecond <= avgFirst * 1.05) {
  log(`🟡 Pas de progression de la charge renfo entre 1ère et 2e moitié du plan (${avgFirst.toFixed(0)}→${avgSecond.toFixed(0)} min)`);
}

// Évolution nombre exercices par séance
const exoCount = renfoByWeek.map(r => parseExercises(r.mainSet).length);
log(`Nb exercices/séance: ${exoCount.map((n,i)=>`S${renfoByWeek[i].week}=${n}`).join('  ')}`);
const exoFirst = exoCount.slice(0, Math.floor(exoCount.length/2)).reduce((s,v)=>s+v,0)/Math.floor(exoCount.length/2);
const exoSecond = exoCount.slice(Math.floor(exoCount.length/2)).reduce((s,v)=>s+v,0)/(exoCount.length - Math.floor(exoCount.length/2));
log(`Moy exos 1ère/2e moitié: ${exoFirst.toFixed(1)} / ${exoSecond.toFixed(1)}`);

// ---- 4. IMAGES EXERCICES ----
log(`\n── AFFICHAGE IMAGES EXERCICES (premium feature) ──`);
log(`Catalogue chargé: ${CATALOG.size} exercices  •  Images dispo: ${imageFiles.size} PNG`);

const allExos = [];
for (const r of renfoByWeek) {
  const exos = parseExercises(r.mainSet);
  for (const e of exos) {
    const key = findInCatalog(e.raw);
    const img = key ? hasImage(key) : false;
    allExos.push({ week: r.week, raw: e.raw, sets: e.sets, key, img });
  }
}
const total = allExos.length;
const matched = allExos.filter(x => x.key).length;
const withImg = allExos.filter(x => x.img).length;
log(`Exercices détectés dans renfo: ${total}`);
log(`Matché dans le catalogue: ${matched}/${total} (${total?(matched/total*100).toFixed(0):0} %)`);
log(`Avec image disponible: ${withImg}/${total} (${total?(withImg/total*100).toFixed(0):0} %)`);

// Liste des exos non-matchés
const unmatched = [...new Set(allExos.filter(x => !x.key).map(x => x.raw))];
if (unmatched.length) {
  log(`\n🟡 Exercices NON matchés dans le catalogue (pas d'image) :`);
  unmatched.slice(0, 20).forEach(e => log(`   - "${e}"`));
  if (unmatched.length > 20) log(`   ... +${unmatched.length-20} autres`);
}
// Liste exos matchés mais sans image
const missingImg = [...new Set(allExos.filter(x => x.key && !x.img).map(x => x.key))];
if (missingImg.length) {
  log(`\n🟡 Exercices matchés mais image manquante dans public/exercises :`);
  missingImg.slice(0, 20).forEach(e => log(`   - "${e}" → /exercises/${e.replace(/ /g,'-')}.png`));
  if (missingImg.length > 20) log(`   ... +${missingImg.length-20} autres`);
}

log(`\n${'═'.repeat(100)}`);
log(`  LIENS UTILES`);
log(`${'═'.repeat(100)}`);
log(`Plan payant 19 sem (3h05): http://localhost:5173/plan/${planPayant.id}`);
log(`                          ou : https://coach-running-ia.web.app/plan/${planPayant.id}`);
const freemium = dump.find(p => (p.weeks||[]).length <= 1);
if (freemium) log(`Plan freemium (2h55, S1): http://localhost:5173/plan/${freemium.id}`);
log(``);

import('fs').then(({writeFileSync}) => writeFileSync('audit-deugnilson-v2.txt', lines.join('\n')));
