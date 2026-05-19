// PATCH MASTER 50+ CORRIGÉ — Rich (rauroy@yahoo.fr) — plan 1779135832271
// Trail 110 km / 12 000 m D+ — 13 sem — 55 ans — Expert — Premium
//
// Re-patch : vecteurs Master 50+ validés Expert FFA (le patch précédent était trop fort).
//
// Doctrine:
// - Allures intactes (jamais touchées)
// - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
// - Pas de contact client (Romane gère)
// - Backup additionnel pré-repatch créé : backup-rich-NEW-pre-repatch-MASTER50.json
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique post-patch
//
// Changements:
//  1. generationContext.periodizationPlan.weeklyVolumes        -> nouveau vecteur (pic S11=115)
//  2. generationContext.periodizationPlan.weeklyElevationTarget -> nouveau vecteur (pic S11=6800)
//  3. weeks[0].sessions[]  -> ajuster distance + elevationGain pour S1 total = 70 km / 3000 m D+
//
// CHAMPS NON TOUCHÉS (déjà OK):
//  - feasibility.status (AMBITIEUX), score (60), message, safetyWarning
//  - confidenceScore (60)
//  - welcomeMessage
//  - paces (allures)

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779135832271';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// --- Nouveaux vecteurs Master 50+ Expert FFA validés ---
const TARGET_VOLUMES   = [70, 75, 82, 65, 88, 96, 105, 82, 100, 110, 115, 75, 50];
const TARGET_ELEVATION = [3000, 3400, 4000, 2800, 4500, 5200, 5800, 4200, 5500, 6300, 6800, 4000, 1500];

// --- S1 par session (rôle, pas jour — Samedi=Récup, Dimanche=SL dans ce plan) ---
// Total 70 km / 3000 m D+, aligné sur currentWeeklyVolume=70 / currentWeeklyElevation=3000 déclarés.
const S1_TARGETS = {
  'Mardi':      { distance: 12, elevationGain: 400  },  // Jogging (footing vallonné)
  'Mercredi':   { distance: 0,  elevationGain: 0    },  // Renforcement
  'Jeudi':      { distance: 14, elevationGain: 700  },  // Jogging (footing vallonné nature)
  'Samedi':     { distance: 20, elevationGain: 200  },  // Récupération (longue récup roulante)
  'Dimanche':   { distance: 24, elevationGain: 1700 },  // Sortie Longue
};
// Total = 12 + 0 + 14 + 20 + 24 = 70 km ; D+ = 400 + 0 + 700 + 200 + 1700 = 3000 m ✓

// --- Helpers Firestore typed-value ---
const toFs = (v) => {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = toFs(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
};
const fromFs = (v) => {
  if (!v) return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o={}; for (const k of Object.keys(v.mapValue.fields||{})) o[k]=fromFs(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromFs);
  return v;
};

// --- Fetch current doc ---
async function getDoc() {
  const r = await fetch(BASE, { headers: HDR });
  if (!r.ok) throw new Error(`GET ${r.status} ${await r.text()}`);
  return r.json();
}

// --- Idempotence ---
async function isAlreadyPatched(doc) {
  const gc = fromFs(doc.fields.generationContext);
  const vol  = gc?.periodizationPlan?.weeklyVolumes;
  const elev = gc?.periodizationPlan?.weeklyElevationTarget;
  const sameVol  = Array.isArray(vol) && vol.length === TARGET_VOLUMES.length &&
                   vol.every((v,i)=>v===TARGET_VOLUMES[i]);
  const sameElev = Array.isArray(elev) && elev.length === TARGET_ELEVATION.length &&
                   elev.every((v,i)=>v===TARGET_ELEVATION[i]);

  const weeksArr = fromFs(doc.fields.weeks) || [];
  const s1 = weeksArr[0]?.sessions || [];
  let sessionsOk = true;
  for (const s of s1) {
    const t = S1_TARGETS[s.day];
    if (!t) continue;
    if (parseFloat(s.distance) !== t.distance) { sessionsOk = false; break; }
    if (parseInt(s.elevationGain) !== t.elevationGain) { sessionsOk = false; break; }
  }
  return { sameVol, sameElev, sessionsOk, allSame: sameVol && sameElev && sessionsOk };
}

// --- Banned words sanity (on ne réécrit pas, mais on check les mainSet qu'on touche) ---
const BANNED = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'maigre'];
function assertNoBanned(label, txt) {
  if (typeof txt !== 'string') return;
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) throw new Error(`[BANNED WORD] "${w}" présent dans ${label}`);
  }
}

// --- SNAPSHOT BEFORE ---
console.log('=== SNAPSHOT BEFORE (post précédent patch) ===');
const before = await getDoc();

// Backup additionnel pré-repatch (n'écrase pas le backup d'origine)
const BK2 = '/Users/romanemarino/Coach-Running-IA/backup-rich-NEW-pre-repatch-MASTER50.json';
if (!fs.existsSync(BK2)) {
  fs.writeFileSync(BK2, JSON.stringify(before, null, 2));
  console.log(`✅ Backup pré-repatch créé : ${BK2}`);
} else {
  console.log(`⏭️  Backup pré-repatch déjà présent, conservé : ${BK2}`);
}

const gcB = fromFs(before.fields.generationContext);
console.log('  weeklyVolumes  (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyVolumes));
console.log('  weeklyElev     (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyElevationTarget));
const weeksB = fromFs(before.fields.weeks) || [];
const s1B = weeksB[0]?.sessions || [];
let preKm=0, preD=0;
console.log('  --- S1 sessions (before) ---');
for (const s of s1B) {
  const km = parseFloat(s.distance||0), d = parseInt(s.elevationGain||0);
  preKm += km; preD += d;
  console.log(`    ${s.day} (${s.type}): ${km} km / ${d} m D+`);
}
console.log(`  S1 TOTAL (before): ${preKm} km / ${preD} m D+`);

const idem = await isAlreadyPatched(before);
if (idem.allSame) {
  console.log('\n⏭️  Déjà patché Master 50+. Aucun write.');
  process.exit(0);
}

// --- Build patched doc in memory ---
const fields = before.fields;

// 1) weeklyVolumes & weeklyElevationTarget
const gcFields = fields.generationContext.mapValue.fields;
const ppFields = gcFields.periodizationPlan.mapValue.fields;
ppFields.weeklyVolumes        = toFs(TARGET_VOLUMES);
ppFields.weeklyElevationTarget = toFs(TARGET_ELEVATION);

// 2) weeks[0].sessions — adjust distance + elevationGain only (mainSet préservé tel quel)
const weeksArr = fields.weeks.arrayValue.values;
const w0Sessions = weeksArr[0].mapValue.fields.sessions.arrayValue.values;
for (const s of w0Sessions) {
  const day = s.mapValue.fields.day?.stringValue;
  if (!day || !(day in S1_TARGETS)) continue;
  const t = S1_TARGETS[day];
  // distance peut être stocké double ou integer ; on garde le même typage : integer si entier sinon double
  s.mapValue.fields.distance      = Number.isInteger(t.distance)
    ? { integerValue: String(t.distance) }
    : { doubleValue: t.distance };
  s.mapValue.fields.elevationGain = { integerValue: String(t.elevationGain) };
  // mainSet : on touche PAS — laisse les textes existants intacts (déjà OK, allures intactes)
  // NB : pas de banned-word check ici car on N'ÉCRIT PAS de nouveau texte.
  // ("squat poids de corps" en renfo est terminologie exercice, pas violation poids/IMC.)
}

// --- PATCH via updateMask (top-level: generationContext + weeks) ---
const touchedTop = ['generationContext', 'weeks'];
const qs = touchedTop.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
const url = `${BASE}?${qs}`;
const patchBody = JSON.stringify({ fields: { generationContext: fields.generationContext, weeks: fields.weeks } });

console.log('\n=== APPLY PATCH ===');
console.log('Top fields touched:', touchedTop.join(', '));
const r = await fetch(url, { method: 'PATCH', headers: HDR, body: patchBody });
if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
console.log('✅ PATCH appliqué');

// --- RE-READ confirmation ---
console.log('\n=== RE-READ CONFIRMATION ===');
const after = await getDoc();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/after-rich-MASTER50-post-repatch.json', JSON.stringify(after, null, 2));

const gcA = fromFs(after.fields.generationContext);
console.log('weeklyVolumes (after):',         JSON.stringify(gcA?.periodizationPlan?.weeklyVolumes));
console.log('weeklyElevationTarget (after):', JSON.stringify(gcA?.periodizationPlan?.weeklyElevationTarget));

const weeksA = fromFs(after.fields.weeks) || [];
const s1A = weeksA[0]?.sessions || [];
let totKm=0, totD=0;
console.log('--- S1 sessions (after) ---');
for (const s of s1A) {
  const km = parseFloat(s.distance||0), d = parseInt(s.elevationGain||0);
  totKm += km; totD += d;
  console.log(`  ${s.day} (${s.type}): ${km} km / ${d} m D+`);
}
console.log(`S1 TOTAL (after): ${totKm} km / ${totD} m D+`);

// --- Assertions finales ---
console.log('\n=== ASSERTIONS ===');
const idem2 = await isAlreadyPatched(after);
console.log('Vol OK:     ', idem2.sameVol);
console.log('Elev OK:    ', idem2.sameElev);
console.log('Sessions OK:', idem2.sessionsOk);
if (!idem2.allSame) {
  console.error('❌ PATCH INCOMPLET');
  process.exit(2);
}

// --- Vérifs invariants doctrine ---
// feasibility / confidenceScore / welcomeMessage / paces : NON TOUCHÉS
const feA = fromFs(after.fields.feasibility);
const confA = fromFs(after.fields.confidenceScore);
const wmA = fromFs(after.fields.welcomeMessage);
console.log('\n=== INVARIANTS DOCTRINE (non touchés) ===');
console.log('feasibility.status:',  feA?.status,   '(attendu: AMBITIEUX)');
console.log('feasibility.score: ',  feA?.score,    '(attendu: 60)');
console.log('confidenceScore:   ',  confA,         '(attendu: 60)');
console.log('welcomeMessage[80]:',  (wmA||'').slice(0,80)+'...');
if (feA?.status !== 'AMBITIEUX' || parseInt(feA?.score) !== 60 || parseInt(confA) !== 60) {
  console.error('❌ Un invariant doctrine a bougé !');
  process.exit(3);
}

// Vérif allures et mainSet intacts (présence de "min/km" dans plusieurs mainSet)
let pacesIntact = 0;
for (const s of s1A) {
  if ((s.mainSet||'').includes('min/km')) pacesIntact++;
}
console.log('Sessions S1 avec allure min/km intacte :', pacesIntact, '/ 5');

console.log('\n✅✅✅ RE-PATCH MASTER 50+ COMPLET ET CONFIRMÉ');
