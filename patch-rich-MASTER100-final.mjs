// PATCH MASTER 100 FINAL — Rich (rauroy@yahoo.fr) — plan 1779135832271
// Trail 110 km / 12 000 m D+ — 13 sem — 55 ans — Expert — Premium
//
// Re-challenger Master 55+ ultra alpin : pic 100 km/sem au lieu de 115 km (plus safe).
// Approche maximum prudence : Master 55 first ultra alpin → quartile bas Balducci 2024.
//
// Doctrine ABSOLUE:
// - Allures intactes (jamais touchées)
// - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
// - Pas de contact client (Romane gère)
// - Backup additionnel pré-repetch MASTER100 créé : backup-rich-NEW-pre-repatch-MASTER100.json
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique post-patch
//
// Changements vs état actuel (post-MASTER50):
//  1. generationContext.periodizationPlan.weeklyVolumes
//     [70,75,82,65,88,96,105,82,100,110,115,75,50] -> [70,75,82,65,85,92,75,95,100,80,100,70,50]
//  2. generationContext.periodizationPlan.weeklyElevationTarget
//     [3000,3400,4000,2800,4500,5200,5800,4200,5500,6300,6800,4000,1500] -> [3000,3300,3800,2700,4300,4900,3500,5300,6000,4200,6500,3800,1500]
//  3. feasibility.message — update valeurs current 60->70 km, retire mention pic ancien
//  4. welcomeMessage — update current 60 km->70 km, pic 130/7800 -> 100/6500, AJOUT mention BTB + sortie nuit
//  5. weeks[0].sessions — S1 reste à 70 km / 3000 m D+ (déjà bon, idempotent)

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779135832271';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// --- Nouveaux vecteurs MASTER100 (pic 100 km/sem 2× S9 et S11, pic 6500 D+ S11) ---
const TARGET_VOLUMES   = [70, 75, 82, 65, 85, 92, 75, 95, 100, 80, 100, 70, 50];
const TARGET_ELEVATION = [3000, 3300, 3800, 2700, 4300, 4900, 3500, 5300, 6000, 4200, 6500, 3800, 1500];

// --- S1 par session (rôle, pas jour) ---
const S1_TARGETS = {
  'Mardi':      { distance: 12, elevationGain: 400  },
  'Mercredi':   { distance: 0,  elevationGain: 0    },
  'Jeudi':      { distance: 14, elevationGain: 700  },
  'Samedi':     { distance: 20, elevationGain: 200  },
  'Dimanche':   { distance: 24, elevationGain: 1700 },
};
// Total = 70 km / 3000 m D+ ✓ (= currentWeeklyVolume Rich)

// --- Nouveaux textes ---
const NEW_FEASIBILITY_MSG =
  "Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en moins de 13 semaines, " +
  "c'est court (la fenêtre idéale serait 16-20 semaines). Avec ton volume actuel " +
  "(70 km + 3 000 m D+/sem) et ton expérience Expert, tu as une vraie base — mais à 55 ans " +
  "pour cet ultra alpin, la bonne préparation, l'écoute du corps et la validation médicale " +
  "sont absolument essentielles. Le plan vise une montée progressive et prudente (pic ~100 km/sem " +
  "+ ~6 500 m D+/sem) pour t'amener prêt à finisher.";

const NEW_WELCOME_MSG =
  "Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec 12 000 m de D+ " +
  "en moins de 13 semaines de préparation. Ton expérience Expert (marathon 3h00) et ton volume actuel " +
  "(70 km/sem + 3 000 m D+/sem) sont une base solide pour aborder ce défi.\n\n" +
  "Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic à ~100 km/sem et " +
  "~6 500 m D+/sem en phase spécifique, pour t'amener prêt à finisher. La structure intègre 3 semaines " +
  "de décharge bien placées (S4, S7, S10) et un affûtage de 2 semaines avant la course.\n\n" +
  "Ce plan intègre 2-3 week-ends back-to-back (samedi long + dimanche moyen en fatigue) en phase " +
  "spécifique (S8, S9, S11) pour simuler la fatigue cumulée de l'ultra, et idéalement 1-2 sorties " +
  "nuit (lampe frontale obligatoire, terrain familier) pour t'habituer à l'effort nocturne — " +
  "ta course passe la nuit.\n\n" +
  "Quelques règles d'or pour ces 13 semaines :\n" +
  "- Marche les montées techniques à l'entraînement comme en course — stratégie ultra trail normale\n" +
  "- Renforcement spécifique trail (quadriceps excentrique, mollets, gainage) prioritaire\n" +
  "- Écoute ton corps : à la moindre douleur articulaire, tendineuse ou fatigue persistante, on adapte plutôt que forcer\n\n" +
  "⚠️ À 55 ans pour cet ultra alpin, un bilan cardio-vasculaire complet (test d'effort + ECG) avant de débuter " +
  "est INDISPENSABLE. La validation médicale n'est pas négociable.";

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

async function getDoc() {
  const r = await fetch(BASE, { headers: HDR });
  if (!r.ok) throw new Error(`GET ${r.status} ${await r.text()}`);
  return r.json();
}

// --- Idempotence ---
async function isAlreadyPatched(doc) {
  const gc = fromFs(doc.fields.generationContext);
  const fe = fromFs(doc.fields.feasibility);
  const wm = fromFs(doc.fields.welcomeMessage);
  const vol  = gc?.periodizationPlan?.weeklyVolumes;
  const elev = gc?.periodizationPlan?.weeklyElevationTarget;
  const sameVol  = Array.isArray(vol) && vol.length === TARGET_VOLUMES.length &&
                   vol.every((v,i)=>v===TARGET_VOLUMES[i]);
  const sameElev = Array.isArray(elev) && elev.length === TARGET_ELEVATION.length &&
                   elev.every((v,i)=>v===TARGET_ELEVATION[i]);
  const sameFeasMsg = fe?.message === NEW_FEASIBILITY_MSG;
  const sameWelcome = wm === NEW_WELCOME_MSG;

  const weeksArr = fromFs(doc.fields.weeks) || [];
  const s1 = weeksArr[0]?.sessions || [];
  let sessionsOk = true;
  for (const s of s1) {
    const t = S1_TARGETS[s.day];
    if (!t) continue;
    if (parseFloat(s.distance) !== t.distance) { sessionsOk = false; break; }
    if (parseInt(s.elevationGain) !== t.elevationGain) { sessionsOk = false; break; }
  }
  return { sameVol, sameElev, sameFeasMsg, sameWelcome, sessionsOk,
           allSame: sameVol && sameElev && sameFeasMsg && sameWelcome && sessionsOk };
}

// --- Banned words sanity sur textes qu'on écrit ---
const BANNED = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'maigre'];
function assertNoBanned(label, txt) {
  if (typeof txt !== 'string') return;
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) throw new Error(`[BANNED WORD] "${w}" présent dans ${label}`);
  }
}
assertNoBanned('NEW_FEASIBILITY_MSG', NEW_FEASIBILITY_MSG);
assertNoBanned('NEW_WELCOME_MSG',     NEW_WELCOME_MSG);

// --- SNAPSHOT BEFORE ---
console.log('=== SNAPSHOT BEFORE (post MASTER50) ===');
const before = await getDoc();

// Backup additionnel pré-repatch MASTER100 (n'écrase pas si déjà existe)
const BK = '/Users/romanemarino/Coach-Running-IA/backup-rich-NEW-pre-repatch-MASTER100.json';
if (!fs.existsSync(BK)) {
  fs.writeFileSync(BK, JSON.stringify(before, null, 2));
  console.log(`✅ Backup pré-MASTER100 créé : ${BK}`);
} else {
  console.log(`⏭️  Backup pré-MASTER100 déjà présent : ${BK}`);
}

const gcB = fromFs(before.fields.generationContext);
const feB = fromFs(before.fields.feasibility);
const wmB = fromFs(before.fields.welcomeMessage);
console.log('  weeklyVolumes  (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyVolumes));
console.log('  weeklyElev     (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyElevationTarget));
console.log('  feasibility.msg (before, 100c):', (feB?.message||'').slice(0,100)+'...');
console.log('  welcomeMessage (before, 100c):',  (wmB||'').slice(0,100)+'...');

const idem = await isAlreadyPatched(before);
if (idem.allSame) {
  console.log('\n⏭️  Déjà patché MASTER100. Aucun write.');
  process.exit(0);
}
console.log('  Idempotence flags (before):', JSON.stringify(idem));

// --- Build patched doc in memory ---
const fields = before.fields;

// 1) weeklyVolumes & weeklyElevationTarget
const gcFields = fields.generationContext.mapValue.fields;
const ppFields = gcFields.periodizationPlan.mapValue.fields;
ppFields.weeklyVolumes        = toFs(TARGET_VOLUMES);
ppFields.weeklyElevationTarget = toFs(TARGET_ELEVATION);

// 2) feasibility.message (rest of feasibility untouched : status/score/safetyWarning préservés)
const feFields = fields.feasibility.mapValue.fields;
feFields.message = { stringValue: NEW_FEASIBILITY_MSG };

// 3) welcomeMessage
fields.welcomeMessage = { stringValue: NEW_WELCOME_MSG };

// 4) weeks[0].sessions — S1 = 70 km / 3000 m D+ (idempotent même si déjà à ces valeurs)
const weeksArr = fields.weeks.arrayValue.values;
const w0Sessions = weeksArr[0].mapValue.fields.sessions.arrayValue.values;
for (const s of w0Sessions) {
  const day = s.mapValue.fields.day?.stringValue;
  if (!day || !(day in S1_TARGETS)) continue;
  const t = S1_TARGETS[day];
  s.mapValue.fields.distance      = Number.isInteger(t.distance)
    ? { integerValue: String(t.distance) }
    : { doubleValue: t.distance };
  s.mapValue.fields.elevationGain = { integerValue: String(t.elevationGain) };
  // mainSet/allures : NON TOUCHÉS
}

// --- PATCH via updateMask (top-level: generationContext + weeks + feasibility + welcomeMessage) ---
const touchedTop = ['generationContext', 'weeks', 'feasibility', 'welcomeMessage'];
const qs = touchedTop.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
const url = `${BASE}?${qs}`;
const patchBody = JSON.stringify({ fields: {
  generationContext: fields.generationContext,
  weeks:             fields.weeks,
  feasibility:       fields.feasibility,
  welcomeMessage:    fields.welcomeMessage,
}});

console.log('\n=== APPLY PATCH ===');
console.log('Top fields touched:', touchedTop.join(', '));
const r = await fetch(url, { method: 'PATCH', headers: HDR, body: patchBody });
if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
console.log('✅ PATCH appliqué');

// --- RE-READ confirmation ---
console.log('\n=== RE-READ CONFIRMATION ===');
const after = await getDoc();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/after-rich-MASTER100-post-repatch.json', JSON.stringify(after, null, 2));

const gcA = fromFs(after.fields.generationContext);
const feA = fromFs(after.fields.feasibility);
const wmA = fromFs(after.fields.welcomeMessage);
const confA = fromFs(after.fields.confidenceScore);

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

console.log('\nfeasibility.message (after, 150c):');
console.log('  ' + (feA?.message||'').slice(0,150)+'...');
console.log('welcomeMessage (after, 200c):');
console.log('  ' + (wmA||'').slice(0,200)+'...');

// --- Assertions finales ---
console.log('\n=== ASSERTIONS ===');
const idem2 = await isAlreadyPatched(after);
console.log('Vol OK:        ', idem2.sameVol);
console.log('Elev OK:       ', idem2.sameElev);
console.log('Sessions OK:   ', idem2.sessionsOk);
console.log('Feas msg OK:   ', idem2.sameFeasMsg);
console.log('Welcome OK:    ', idem2.sameWelcome);
if (!idem2.allSame) {
  console.error('❌ PATCH INCOMPLET');
  process.exit(2);
}

// --- Vérifs invariants doctrine ---
console.log('\n=== INVARIANTS DOCTRINE (non touchés) ===');
console.log('feasibility.status:',  feA?.status,   '(attendu: AMBITIEUX)');
console.log('feasibility.score: ',  feA?.score,    '(attendu: 60)');
console.log('confidenceScore:   ',  confA,         '(attendu: 60)');
if (feA?.status !== 'AMBITIEUX' || parseInt(feA?.score) !== 60 || parseInt(confA) !== 60) {
  console.error('❌ Un invariant doctrine a bougé !');
  process.exit(3);
}

// Allures intactes ?
let pacesIntact = 0;
for (const s of s1A) {
  if ((s.mainSet||'').includes('min/km')) pacesIntact++;
}
console.log('Sessions S1 avec allure min/km intacte :', pacesIntact, '/ 5');

// Mots interdits absents dans messages écrits ?
assertNoBanned('feasibility.message (after)', feA?.message);
assertNoBanned('welcomeMessage (after)', wmA);
console.log('Mots interdits : ABSENTS dans feasibility.message + welcomeMessage');

// Mentions BTB + sortie nuit présentes dans welcomeMessage ?
const hasBTB   = (wmA||'').toLowerCase().includes('back-to-back');
const hasNight = (wmA||'').toLowerCase().includes('nuit');
console.log('welcomeMessage contient "back-to-back" :', hasBTB);
console.log('welcomeMessage contient "nuit"         :', hasNight);
if (!hasBTB || !hasNight) {
  console.error('❌ Mention BTB ou sortie nuit manquante dans welcomeMessage');
  process.exit(4);
}

console.log('\n✅✅✅ PATCH MASTER100 FINAL COMPLET ET CONFIRMÉ');
