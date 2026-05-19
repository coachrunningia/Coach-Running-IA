/**
 * AUDIT V2 — Plans affectés par le bug pace asymétrique (110 plans identifiés)
 *
 * Pour chaque plan affecté, on extrait :
 *   1. Inputs user : subGoal, targetTime, VMA, chronos récents
 *   2. État du plan : paces.allureSpecifique[X] stockée, isPreview, fullPlanGenerated
 *   3. Diagnostic : allure cible calculée, écart vs stockée, % VMA cible vs stockée
 *   4. Feasibility actuelle vs recommandée
 *   5. Sessions concernées : combien de séances ont la targetPace = bug
 *
 * On classe en groupes pour décider la stratégie de patch.
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

function timeToSeconds(timeStr, distance) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/);
  if (hm) { const h = parseInt(hm[1]); const m = hm[2] ? parseInt(hm[2]) : 0; return h * 3600 + m * 60; }
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) { if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60; return parseInt(ms[1])*60 + parseInt(ms[2]); }
  return 0;
}
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };
function secondsToPace(s) { if (!s || s <= 0) return '0:00'; const m = Math.floor(s/60), sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}`; }

const raceMap = {
  '5 km':         { dist: 5,      paceKey: 'allureSpecifique5k',       vmaPct: 0.95, expectedRangeVMA: [0.90, 1.00], label: '5 km' },
  '10 km':        { dist: 10,     paceKey: 'allureSpecifique10k',      vmaPct: 0.90, expectedRangeVMA: [0.86, 0.94], label: '10 km' },
  'semi-marathon':{ dist: 21.097, paceKey: 'allureSpecifiqueSemi',     vmaPct: 0.85, expectedRangeVMA: [0.82, 0.90], label: 'Semi' },
  'marathon':     { dist: 42.195, paceKey: 'allureSpecifiqueMarathon', vmaPct: 0.80, expectedRangeVMA: [0.78, 0.86], label: 'Marathon' },
};

// Détermine le statut "expert" attendu selon %VMA cible
function statutRecommande(pctVMACible, expectedRange, hasMatchingChrono) {
  // hasMatchingChrono : le coureur a déclaré un chrono sur cette distance → on assouplit
  const [low, high] = expectedRange;
  if (pctVMACible <= low + 0.02) return { status: 'EXCELLENT', score: 90, note: 'cible confortable' };
  if (pctVMACible <= (low + high) / 2) return { status: 'BON', score: 80, note: 'cible cohérente' };
  if (pctVMACible <= high) return { status: hasMatchingChrono ? 'BON' : 'AMBITIEUX', score: hasMatchingChrono ? 75 : 65, note: 'cible ambitieuse' + (hasMatchingChrono ? ' mais validée par chrono' : '') };
  if (pctVMACible <= high + 0.05) return { status: 'AMBITIEUX', score: 50, note: 'cible au-dessus fourchette standard' };
  if (pctVMACible <= high + 0.10) return { status: 'RISQUÉ', score: 30, note: 'cible bien au-dessus du potentiel' };
  return { status: 'IRRÉALISTE', score: 10, note: 'cible hors fourchette physiologique' };
}

// Charge la liste des 110 plans buggés depuis l'audit précédent
const previousAudit = JSON.parse(readFileSync('audit-pace-bug.json', 'utf8'));
const buggyIds = previousAudit.buggy.map(b => b.id);
console.log(`Charge ${buggyIds.length} plans buggés…`);

const detailed = [];
for (const id of buggyIds) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers:H });
  const j = await r.json();
  if (!j.fields) continue;
  const p = pf(j.fields);
  const snap = p.generationContext?.questionnaireSnapshot || {};
  const subGoal = (p.subGoal || snap.subGoal || '').toString();
  const targetTime = p.targetTime || snap.targetTime;
  const vma = p.vma || snap.vma || p.generationContext?.vma;
  const paces = p.paces || p.generationContext?.paces || {};
  const recent = snap.recentRaceTimes || {};
  const feas = p.feasibility || {};

  const normalized = subGoal.toLowerCase().replace(/\s+/g, ' ').trim();
  const info = raceMap[normalized];
  if (!info) continue;

  const targetSec = timeToSeconds(targetTime, info.dist);
  const targetPaceSec = targetSec / info.dist;
  const paceCibleStr = secondsToPace(targetPaceSec);
  const paceStockSec = paceToSec(paces[info.paceKey]);
  const diff = paceStockSec - targetPaceSec;
  const pctVMACible = vma ? (3600 / targetPaceSec) / vma : null;
  const pctVMAStock = vma ? (3600 / paceStockSec) / vma : null;

  // Le coureur a-t-il un chrono qui valide cette cible ?
  const recentKey = info.label === 'Marathon' ? 'distanceMarathon' : info.label === 'Semi' ? 'distanceHalfMarathon' : info.label === '10 km' ? 'distance10km' : 'distance5km';
  const hasMatchingChrono = !!recent[recentKey];
  const matchingChronoSec = hasMatchingChrono ? timeToSeconds(recent[recentKey], info.dist) : null;
  // Est-ce que la cible est plus ambitieuse que le chrono déclaré ?
  let cibleVsChrono = null;
  if (matchingChronoSec && matchingChronoSec > 0) {
    const deltaMinutes = Math.round((matchingChronoSec - targetSec) / 60);
    cibleVsChrono = deltaMinutes >= 0 ? `${deltaMinutes >= 0 ? '-' : '+'}${Math.abs(deltaMinutes)}min vs PB ${recent[recentKey]}` : `+${-deltaMinutes}min vs PB ${recent[recentKey]}`;
  }

  // Statut recommandé
  const reco = pctVMACible !== null ? statutRecommande(pctVMACible, info.expectedRangeVMA, hasMatchingChrono) : { status: '?', score: '?', note: 'pas de VMA' };

  // Sessions avec targetPace = bug ?
  let nbSessionsBuggy = 0;
  let nbSessionsTotal = 0;
  for (const w of (p.weeks || [])) {
    for (const s of (w.sessions || [])) {
      if (!s.targetPace) continue;
      nbSessionsTotal++;
      // Le pace stocké correspond-il au pace buggé ?
      const sPaceSec = paceToSec(s.targetPace);
      if (sPaceSec && Math.abs(sPaceSec - paceStockSec) <= 5) nbSessionsBuggy++;
    }
  }

  detailed.push({
    id,
    email: p.userEmail,
    subGoal,
    targetTime,
    targetTimeOk: targetSec > 0,
    vma: typeof vma === 'number' ? vma.toFixed(2) : vma,
    paceStockSec, paceStockStr: paces[info.paceKey], paceCibleStr,
    diffSec: Math.round(diff),
    pctVMACible: pctVMACible ? (pctVMACible*100).toFixed(0) + '%' : '?',
    pctVMAStock: pctVMAStock ? (pctVMAStock*100).toFixed(0) + '%' : '?',
    hasMatchingChrono,
    matchingChrono: hasMatchingChrono ? recent[recentKey] : null,
    cibleVsChrono,
    isPreview: p.isPreview,
    fullPlanGenerated: p.fullPlanGenerated,
    nbWeeks: (p.weeks || []).length,
    nbSessionsBuggy,
    nbSessionsTotal,
    feasStatusActuel: feas.status,
    feasScoreActuel: feas.score ?? p.confidenceScore,
    feasStatusReco: reco.status,
    feasScoreReco: reco.score,
    feasNote: reco.note,
    statusChange: feas.status !== reco.status ? 'OUI' : 'non',
    createdAt: p.createdAt?.substring(0,10),
  });
}

// Group by preview/full
const previews = detailed.filter(d => d.isPreview && !d.fullPlanGenerated);
const fulls = detailed.filter(d => d.fullPlanGenerated);
const ambig = detailed.filter(d => !d.isPreview && !d.fullPlanGenerated);

console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  RÉSULTAT AUDIT V2 — ${detailed.length} plans`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  Preview seulement (S1 déployée)    : ${previews.length}  → patch paces[] suffit`);
console.log(`  Full plan généré                    : ${fulls.length}  → patch paces[] + session.targetPace`);
console.log(`  Autres (ambigu)                     : ${ambig.length}`);

console.log(`\n── DISTRIBUTION ÉCART (paceStock - paceCible, secondes/km) ──`);
const buckets = { '0-15s': 0, '16-30s': 0, '31-60s': 0, '61-120s': 0, '>120s': 0 };
for (const d of detailed) {
  const x = Math.abs(d.diffSec);
  if (x <= 15) buckets['0-15s']++;
  else if (x <= 30) buckets['16-30s']++;
  else if (x <= 60) buckets['31-60s']++;
  else if (x <= 120) buckets['61-120s']++;
  else buckets['>120s']++;
}
for (const [k,v] of Object.entries(buckets)) console.log(`  ${k.padEnd(10)} : ${v}`);

console.log(`\n── DISTRIBUTION CHANGEMENT STATUT FEASIBILITY RECOMMANDÉ ──`);
const statusChanges = {};
for (const d of detailed) {
  const key = `${d.feasStatusActuel} → ${d.feasStatusReco}`;
  statusChanges[key] = (statusChanges[key] || 0) + 1;
}
for (const [k,v] of Object.entries(statusChanges).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(40)} : ${v}`);

writeFileSync('audit-pace-bug-v2.json', JSON.stringify(detailed, null, 2));
console.log(`\n📝 audit-pace-bug-v2.json (détail complet ${detailed.length} plans)`);

// Échantillon de 10 cas critiques (changement statut + écart >30s)
console.log(`\n── 10 PLANS LES PLUS CRITIQUES (écart pace + changement statut) ──`);
const critiques = detailed
  .filter(d => d.statusChange === 'OUI' && Math.abs(d.diffSec) >= 30)
  .sort((a,b) => Math.abs(b.diffSec) - Math.abs(a.diffSec))
  .slice(0, 10);
for (const c of critiques) {
  console.log(`  ${c.id} | ${(c.email||'?').substring(0,30).padEnd(30)} | ${c.subGoal.padEnd(13)} cible ${c.targetTime.padEnd(6)} | stock ${c.paceStockStr}/km → cible ${c.paceCibleStr}/km (Δ${c.diffSec}s, ${c.pctVMACible}VMA) | feas ${c.feasStatusActuel} → ${c.feasStatusReco} | ${c.isPreview?'preview':'full'} (${c.nbSessionsBuggy}/${c.nbSessionsTotal} séances buggées)`);
}
