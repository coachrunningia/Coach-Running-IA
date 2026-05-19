// PATCH PLAN 1 PIC 85 — Rich (rauroy@yahoo.fr) — plan 1779135832271
// Trail 110 km / 12 000 m D+ — 13 sem — 55 ans — Expert — Premium
//
// Décision Romane : approche CONSISTANCE > pic ponctuel.
// Re-patch après MASTER100 : pic 100 km/sem → pic 85 km/sem 3× plateau (S6, S9, S11).
// Pic D+ 6500 → 5800 m S11 (48% race D+, zone Balducci basse).
//
// Doctrine ABSOLUE:
// - Allures intactes (jamais touchées)
// - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
// - Pas de contact client (Romane gère)
// - Backup pré-pic85 créé : backup-rich-PLAN1-pre-pic85.json
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique post-patch
// - Sessions S1 (weeks[0]) : 70 km / 3000 m D+ déjà conformes → skip (idempotent)
//
// Changements vs état actuel (post MASTER100) :
//  1. generationContext.periodizationPlan.weeklyVolumes
//     [70,75,82,65,85,92,75,95,100,80,100,70,50] -> [70,73,78,65,80,85,70,82,85,72,85,68,50]
//  2. generationContext.periodizationPlan.weeklyElevationTarget
//     [3000,3300,3800,2700,4300,4900,3500,5300,6000,4200,6500,3800,1500] -> [3000,3200,3500,2700,4000,4500,3500,4800,5500,4000,5800,3800,1500]
//  3. feasibility.message — update valeurs pic 100/6500 -> 85/5800
//  4. welcomeMessage — update pic 100/6500 -> 85/5800 + philosophie consistance Master 55

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779135832271';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// --- Nouveaux vecteurs PIC 85 (consistance plateau 80-85 km plusieurs semaines) ---
const TARGET_VOLUMES   = [70, 73, 78, 65, 80, 85, 70, 82, 85, 72, 85, 68, 50];
const TARGET_ELEVATION = [3000, 3200, 3500, 2700, 4000, 4500, 3500, 4800, 5500, 4000, 5800, 3800, 1500];

// Sanity checks vecteurs
if (TARGET_VOLUMES.length !== 13) throw new Error('TARGET_VOLUMES doit faire 13 sem');
if (TARGET_ELEVATION.length !== 13) throw new Error('TARGET_ELEVATION doit faire 13 sem');
const peakVol = Math.max(...TARGET_VOLUMES);
const peakElev = Math.max(...TARGET_ELEVATION);
if (peakVol !== 85) throw new Error(`Pic volume attendu 85, obtenu ${peakVol}`);
if (peakElev !== 5800) throw new Error(`Pic D+ attendu 5800, obtenu ${peakElev}`);

// --- Nouveaux textes ---
const NEW_FEASIBILITY_MSG =
  "Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en moins de 13 semaines, " +
  "c'est court (la fenêtre idéale serait 16-20 semaines). Avec ton volume actuel " +
  "(70 km + 3 000 m D+/sem) et ton expérience Expert, tu as une vraie base — mais à 55 ans " +
  "pour cet ultra alpin, la bonne préparation, l'écoute du corps et la validation médicale " +
  "sont absolument essentielles. Le plan vise une montée progressive et prudente (pic d'environ " +
  "85 km/sem et 5800 m D+/sem) pour t'amener prêt à finisher.";

const NEW_WELCOME_MSG =
  "Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec 12 000 m de D+ " +
  "en moins de 13 semaines de préparation. Ton expérience Expert (marathon 3h00) et ton volume actuel " +
  "(70 km/sem + 3 000 m D+/sem) sont une base solide pour aborder ce défi.\n\n" +
  "Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic d'environ 85 km/sem et " +
  "5800 m D+/sem, atteint plusieurs semaines en plateau (approche consistance privilégiée pour Master " +
  "55 ans, plutôt que pics ponctuels plus risqués). À ton âge, mieux vaut tenir 80-85 km plusieurs " +
  "semaines que viser des pics ponctuels à 100 km/sem qui augmenteraient le risque de blessure sans " +
  "vraiment améliorer la préparation. Pour Finisher (pas chrono), c'est l'approche la plus sûre. " +
  "La structure intègre 3 semaines de décharge bien placées (S4, S7, S10) et un affûtage de 2 semaines " +
  "avant la course.\n\n" +
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
  return { sameVol, sameElev, sameFeasMsg, sameWelcome,
           allSame: sameVol && sameElev && sameFeasMsg && sameWelcome };
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
console.log('=== SNAPSHOT BEFORE (post MASTER100) ===');
const before = await getDoc();

// Backup pré-pic85 (n'écrase pas si déjà existe)
const BK = '/Users/romanemarino/Coach-Running-IA/backup-rich-PLAN1-pre-pic85.json';
if (!fs.existsSync(BK)) {
  fs.writeFileSync(BK, JSON.stringify(before, null, 2));
  console.log(`✅ Backup pré-pic85 créé : ${BK}`);
} else {
  console.log(`⏭️  Backup pré-pic85 déjà présent : ${BK}`);
}

const gcB = fromFs(before.fields.generationContext);
const feB = fromFs(before.fields.feasibility);
const wmB = fromFs(before.fields.welcomeMessage);
console.log('  weeklyVolumes  (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyVolumes));
console.log('  weeklyElev     (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyElevationTarget));
console.log('  feasibility.msg (before, 120c):', (feB?.message||'').slice(0,120)+'...');
console.log('  welcomeMessage (before, 150c):',  (wmB||'').slice(0,150)+'...');

const idem = await isAlreadyPatched(before);
if (idem.allSame) {
  console.log('\n⏭️  Déjà patché PIC 85. Aucun write.');
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

// 2) feasibility.message (status/score/safetyWarning/recommendation préservés)
const feFields = fields.feasibility.mapValue.fields;
feFields.message = { stringValue: NEW_FEASIBILITY_MSG };

// 3) welcomeMessage
fields.welcomeMessage = { stringValue: NEW_WELCOME_MSG };

// --- PATCH via updateMask (top-level: generationContext + feasibility + welcomeMessage) ---
// Note : weeks NON touché (S1 sessions déjà conformes 70/3000)
const touchedTop = ['generationContext', 'feasibility', 'welcomeMessage'];
const qs = touchedTop.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
const url = `${BASE}?${qs}`;
const patchBody = JSON.stringify({ fields: {
  generationContext: fields.generationContext,
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
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/after-rich-PLAN1-post-pic85.json', JSON.stringify(after, null, 2));

const gcA = fromFs(after.fields.generationContext);
const feA = fromFs(after.fields.feasibility);
const wmA = fromFs(after.fields.welcomeMessage);
const confA = fromFs(after.fields.confidenceScore);

console.log('weeklyVolumes (after):',         JSON.stringify(gcA?.periodizationPlan?.weeklyVolumes));
console.log('weeklyElevationTarget (after):', JSON.stringify(gcA?.periodizationPlan?.weeklyElevationTarget));

const weeksA = fromFs(after.fields.weeks) || [];
const s1A = weeksA[0]?.sessions || [];
let totKm=0, totD=0;
console.log('--- S1 sessions (after, non touché) ---');
for (const s of s1A) {
  const km = parseFloat(s.distance||0), d = parseInt(s.elevationGain||0);
  totKm += km; totD += d;
  console.log(`  ${s.day} (${s.type}): ${km} km / ${d} m D+`);
}
console.log(`S1 TOTAL (after): ${totKm} km / ${totD} m D+`);

console.log('\nfeasibility.message (after):');
console.log('  ' + (feA?.message||''));
console.log('\nwelcomeMessage (after, full):');
console.log(wmA||'');

// --- Assertions finales ---
console.log('\n=== ASSERTIONS ===');
const idem2 = await isAlreadyPatched(after);
console.log('Vol OK:        ', idem2.sameVol);
console.log('Elev OK:       ', idem2.sameElev);
console.log('Feas msg OK:   ', idem2.sameFeasMsg);
console.log('Welcome OK:    ', idem2.sameWelcome);
if (!idem2.allSame) {
  console.error('❌ PATCH INCOMPLET');
  process.exit(2);
}

// --- Vérifs invariants doctrine (non touchés) ---
console.log('\n=== INVARIANTS DOCTRINE (non touchés) ===');
console.log('feasibility.status:',  feA?.status,   '(attendu: AMBITIEUX)');
console.log('feasibility.score: ',  feA?.score,    '(attendu: 60)');
console.log('confidenceScore:   ',  confA,         '(attendu: 60)');
if (feA?.status !== 'AMBITIEUX' || parseInt(feA?.score) !== 60 || parseInt(confA) !== 60) {
  console.error('❌ Un invariant doctrine a bougé !');
  process.exit(3);
}
console.log('feasibility.safetyWarning (préservé, 100c):', (feA?.safetyWarning||'').slice(0,100)+'...');

// Mots interdits absents dans messages écrits ?
assertNoBanned('feasibility.message (after)', feA?.message);
assertNoBanned('welcomeMessage (after)', wmA);
console.log('Mots interdits : ABSENTS dans feasibility.message + welcomeMessage');

// Mention pic 85 / 5800 présente ?
const hasPic85Feas = (feA?.message||'').includes('85 km/sem') && (feA?.message||'').includes('5800');
const hasPic85Welcome = (wmA||'').includes('85 km/sem') && (wmA||'').includes('5800');
const hasConsistance = (wmA||'').toLowerCase().includes('consistance');
const hasPlateau = (wmA||'').toLowerCase().includes('plateau') || (wmA||'').toLowerCase().includes('80-85');
console.log('feasibility.message contient 85 km/sem + 5800 :', hasPic85Feas);
console.log('welcomeMessage contient 85 km/sem + 5800       :', hasPic85Welcome);
console.log('welcomeMessage contient "consistance"           :', hasConsistance);
console.log('welcomeMessage contient plateau / 80-85         :', hasPlateau);
if (!hasPic85Feas || !hasPic85Welcome || !hasConsistance || !hasPlateau) {
  console.error('❌ Mention pic85/consistance/plateau manquante');
  process.exit(4);
}

// Vérif vecteur consistance : 85 atteint 3×
const count85 = TARGET_VOLUMES.filter(v => v === 85).length;
console.log(`Pic 85 atteint ${count85} fois (attendu: 3)`);
if (count85 !== 3) {
  console.error('❌ Pic 85 doit être atteint 3 fois (consistance plateau)');
  process.exit(5);
}

// Vérif saut max ≤ +25%
let maxJump = 0;
for (let i=1; i<TARGET_VOLUMES.length; i++) {
  const j = (TARGET_VOLUMES[i] - TARGET_VOLUMES[i-1]) / TARGET_VOLUMES[i-1];
  if (j > maxJump) maxJump = j;
}
console.log(`Saut max volume entre 2 sem : +${(maxJump*100).toFixed(1)}% (attendu ≤ +25%)`);
if (maxJump > 0.25 + 1e-6) {
  console.error('❌ Saut max > +25%');
  process.exit(6);
}

// Cycle total D+
const totalDplus = TARGET_ELEVATION.reduce((a,b)=>a+b,0);
console.log(`Cycle total D+ : ${totalDplus} m (= ${(totalDplus/12000).toFixed(2)}× race ; doctrine ≥ 3×)`);
if (totalDplus / 12000 < 3.0) {
  console.error('❌ Cycle total D+ < 3× race');
  process.exit(7);
}

console.log('\n✅✅✅ PATCH PLAN 1 PIC 85 COMPLET ET CONFIRMÉ');
