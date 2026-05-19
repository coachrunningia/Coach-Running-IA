// PATCH PLAN 2 — Rich (rauroy@yahoo.fr) — plan 1775644846100 (ancien, 19 sem, généré 08/04/2026)
// Trail 110 km / 12 000 m D+ — 55 ans — Expert — course 14/08/2026
//
// Objectif : ALIGNER Plan 2 (ancien) avec Plan 1 (nouveau déjà patché MASTER 50+ pic 100/6500)
// → mêmes status AMBITIEUX/60, mêmes messages sécurité, vecteurs Master 50+ proportionnels cohérents
//
// Doctrine ABSOLUE:
// - Allures intactes (jamais touchées)
// - weeks[].sessions S1-S19 NON touchés (patch volumes/élev seulement)
// - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
// - Pas de contact client (Romane gère)
// - Backup créé : backup-rich-PLAN2-pre-patch.json
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique post-patch
//
// 7 modifications :
//  1. generationContext.periodizationPlan.weeklyVolumes (19 sem) — vecteur Master 50+ pic 100
//  2. generationContext.periodizationPlan.weeklyElevationTarget (19 sem) — vecteur Master 50+ pic 6500 (CRÉATION car absent)
//  3. feasibility.status : BON -> AMBITIEUX
//  4. feasibility.score : créer/forcer à 60 + confidenceScore (top-level) : 75 -> 60
//  5. feasibility.message — version cohérente avec Plan 1
//  6. feasibility.safetyWarning — version forte (sécurité 55 ans)
//  7. welcomeMessage — version alignée Plan 1

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1775644846100';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// --- Vecteurs cibles Master 50+ 19 semaines ---
const TARGET_VOLUMES = [70, 75, 82, 65, 82, 90, 70, 90, 95, 75, 90, 100, 80, 95, 100, 75, 65, 50, 35];
const TARGET_ELEVATION = [3000, 3300, 3800, 2700, 3800, 4500, 3300, 4500, 5000, 3700, 4800, 5500, 4000, 5500, 6500, 4500, 3500, 2200, 1200];

// --- Cibles top-level ---
const TARGET_FEAS_STATUS = 'AMBITIEUX';
const TARGET_FEAS_SCORE  = 60;
const TARGET_CONFIDENCE  = 60;

// --- Nouveaux textes ---
const NEW_FEASIBILITY_MSG =
  "Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en 19 semaines de préparation. " +
  "Avec ton volume actuel (70 km + 3000 m D+/sem) et ton expérience Expert (marathon 3h00), " +
  "tu as une base solide pour aborder ce défi. Le plan vise une montée progressive jusqu'à un pic " +
  "d'environ 100 km/sem et 6500 m D+/sem, en respectant la sensibilité à la charge propre à un coureur " +
  "Master de 55 ans. À cet âge et pour cet ultra de haute montagne, l'écoute du corps, les récupérations " +
  "strictes et la validation médicale sont essentielles.";

const NEW_SAFETY_WARNING =
  "⚠️ Sécurité PRIORITAIRE : à 55 ans + ultra alpin de haute montagne (12 000 m D+), un bilan " +
  "cardio-vasculaire complet (test d'effort + ECG) avant de débuter est INDISPENSABLE. Respecte " +
  "impérativement les semaines de récupération (S4, S7, S10, S13), hydrate-toi rigoureusement, écoute " +
  "ton corps. À la moindre douleur articulaire, tendineuse ou cardiaque persistante, stoppe et consulte " +
  "immédiatement. La récupération inter-sessions (48-72h entre séances longues) est non négociable à ton âge.";

const NEW_WELCOME_MSG =
  "Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec 12 000 m de D+, " +
  "sur 19 semaines de préparation. Ton expérience Expert (marathon 3h00) et ton volume actuel " +
  "(70 km/sem + 3 000 m D+/sem) sont une base solide pour aborder ce défi de haute montagne.\n\n" +
  "Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic d'environ 100 km/sem et " +
  "6 500 m D+/sem en phase spécifique, calibré pour un coureur Master de 55 ans. La structure intègre " +
  "4 semaines de décharge bien placées (toutes les 3 semaines, rythme 3:1 strict Master), un affûtage " +
  "progressif sur 3-4 semaines, et 2-3 week-ends back-to-back (samedi long + dimanche moyen en fatigue) " +
  "en phase spécifique pour simuler la fatigue cumulée de l'ultra. Idéalement, intègre aussi 1-2 sorties " +
  "nuit avec lampe frontale, car ta course passe la nuit.\n\n" +
  "Quelques règles d'or pour ces 19 semaines :\n" +
  "- Marche les montées techniques à l'entraînement comme en course — stratégie ultra trail normale\n" +
  "- Renforcement excentrique quadriceps + mollets indispensable pour descente technique\n" +
  "- Écoute ton corps : à la moindre douleur articulaire ou tendineuse, on adapte plutôt que forcer\n\n" +
  "⚠️ À 55 ans pour cet ultra alpin, un bilan cardio-vasculaire complet (test d'effort + ECG) avant de " +
  "débuter est INDISPENSABLE. La validation médicale n'est pas négociable.";

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

// --- Idempotence check ---
function checkAlreadyPatched(doc) {
  const gc = fromFs(doc.fields.generationContext);
  const fe = fromFs(doc.fields.feasibility);
  const wm = fromFs(doc.fields.welcomeMessage);
  const conf = fromFs(doc.fields.confidenceScore);
  const vol  = gc?.periodizationPlan?.weeklyVolumes;
  const elev = gc?.periodizationPlan?.weeklyElevationTarget;
  const sameVol  = Array.isArray(vol) && vol.length === TARGET_VOLUMES.length &&
                   vol.every((v,i)=>v===TARGET_VOLUMES[i]);
  const sameElev = Array.isArray(elev) && elev.length === TARGET_ELEVATION.length &&
                   elev.every((v,i)=>v===TARGET_ELEVATION[i]);
  const sameStatus  = fe?.status === TARGET_FEAS_STATUS;
  const sameScore   = parseInt(fe?.score) === TARGET_FEAS_SCORE;
  const sameConf    = parseInt(conf) === TARGET_CONFIDENCE;
  const sameFeasMsg = fe?.message === NEW_FEASIBILITY_MSG;
  const sameSafety  = fe?.safetyWarning === NEW_SAFETY_WARNING;
  const sameWelcome = wm === NEW_WELCOME_MSG;

  return { sameVol, sameElev, sameStatus, sameScore, sameConf, sameFeasMsg, sameSafety, sameWelcome,
           allSame: sameVol && sameElev && sameStatus && sameScore && sameConf && sameFeasMsg && sameSafety && sameWelcome };
}

// --- Banned words sanity ---
const BANNED = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'maigre'];
function assertNoBanned(label, txt) {
  if (typeof txt !== 'string') return;
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) throw new Error(`[BANNED WORD] "${w}" présent dans ${label}`);
  }
}
assertNoBanned('NEW_FEASIBILITY_MSG', NEW_FEASIBILITY_MSG);
assertNoBanned('NEW_SAFETY_WARNING',  NEW_SAFETY_WARNING);
assertNoBanned('NEW_WELCOME_MSG',     NEW_WELCOME_MSG);

// --- SNAPSHOT BEFORE ---
console.log('=== SNAPSHOT BEFORE (Plan 2 ancien) ===');
const before = await getDoc();

// Backup (n'écrase pas si déjà existe)
const BK = '/Users/romanemarino/Coach-Running-IA/backup-rich-PLAN2-pre-patch.json';
if (!fs.existsSync(BK)) {
  fs.writeFileSync(BK, JSON.stringify(before, null, 2));
  console.log(`✅ Backup créé : ${BK}`);
} else {
  console.log(`⏭️  Backup déjà présent : ${BK}`);
}

const gcB = fromFs(before.fields.generationContext);
const feB = fromFs(before.fields.feasibility);
const wmB = fromFs(before.fields.welcomeMessage);
const confB = fromFs(before.fields.confidenceScore);
console.log('  weeklyVolumes  (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyVolumes));
console.log('  weeklyElev     (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyElevationTarget));
console.log('  feasibility.status (before):', feB?.status);
console.log('  feasibility.score  (before):', feB?.score);
console.log('  confidenceScore    (before):', confB);
console.log('  feasibility.msg (before, 100c):', (feB?.message||'').slice(0,100)+'...');
console.log('  feasibility.safetyWarning (before, 100c):', (feB?.safetyWarning||'').slice(0,100)+'...');
console.log('  welcomeMessage  (before, 100c):',  (wmB||'').slice(0,100)+'...');

const idem = checkAlreadyPatched(before);
if (idem.allSame) {
  console.log('\n⏭️  Déjà patché Plan 2. Aucun write.');
  process.exit(0);
}
console.log('\n  Idempotence flags (before):', JSON.stringify(idem));

// --- Build patched doc in memory ---
const fields = before.fields;

// 1+2) weeklyVolumes & weeklyElevationTarget (création si absent)
const gcFields = fields.generationContext.mapValue.fields;
const ppFields = gcFields.periodizationPlan.mapValue.fields;
ppFields.weeklyVolumes         = toFs(TARGET_VOLUMES);
ppFields.weeklyElevationTarget = toFs(TARGET_ELEVATION); // création OK

// 3) feasibility.status BON -> AMBITIEUX
// 4) feasibility.score : créer à 60
// 5) feasibility.message
// 6) feasibility.safetyWarning
const feFields = fields.feasibility.mapValue.fields;
feFields.status        = { stringValue: TARGET_FEAS_STATUS };
feFields.score         = { integerValue: String(TARGET_FEAS_SCORE) };
feFields.message       = { stringValue: NEW_FEASIBILITY_MSG };
feFields.safetyWarning = { stringValue: NEW_SAFETY_WARNING };

// 4bis) confidenceScore top-level : 75 -> 60
fields.confidenceScore = { integerValue: String(TARGET_CONFIDENCE) };

// 7) welcomeMessage
fields.welcomeMessage = { stringValue: NEW_WELCOME_MSG };

// --- PATCH via updateMask (top-level fields touchés) ---
const touchedTop = ['generationContext', 'feasibility', 'welcomeMessage', 'confidenceScore'];
const qs = touchedTop.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
const url = `${BASE}?${qs}`;
const patchBody = JSON.stringify({ fields: {
  generationContext: fields.generationContext,
  feasibility:       fields.feasibility,
  welcomeMessage:    fields.welcomeMessage,
  confidenceScore:   fields.confidenceScore,
}});

console.log('\n=== APPLY PATCH ===');
console.log('Top fields touched:', touchedTop.join(', '));
console.log('NB: weeks[].sessions NON touchés (volumes/élev seulement)');
const r = await fetch(url, { method: 'PATCH', headers: HDR, body: patchBody });
if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
console.log('✅ PATCH appliqué');

// --- RE-READ confirmation ---
console.log('\n=== RE-READ CONFIRMATION ===');
const after = await getDoc();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/after-rich-PLAN2-post-patch.json', JSON.stringify(after, null, 2));

const gcA = fromFs(after.fields.generationContext);
const feA = fromFs(after.fields.feasibility);
const wmA = fromFs(after.fields.welcomeMessage);
const confA = fromFs(after.fields.confidenceScore);

console.log('weeklyVolumes (after):',         JSON.stringify(gcA?.periodizationPlan?.weeklyVolumes));
console.log('weeklyElevationTarget (after):', JSON.stringify(gcA?.periodizationPlan?.weeklyElevationTarget));
console.log('feasibility.status (after):', feA?.status);
console.log('feasibility.score  (after):', feA?.score);
console.log('confidenceScore    (after):', confA);
console.log('\nfeasibility.message (after, 200c):');
console.log('  ' + (feA?.message||'').slice(0,200)+'...');
console.log('\nfeasibility.safetyWarning (after, 200c):');
console.log('  ' + (feA?.safetyWarning||'').slice(0,200)+'...');
console.log('\nwelcomeMessage (after, 250c):');
console.log('  ' + (wmA||'').slice(0,250)+'...');

// --- Assertions finales ---
console.log('\n=== ASSERTIONS ===');
const idem2 = checkAlreadyPatched(after);
console.log('Vol OK:           ', idem2.sameVol);
console.log('Elev OK:          ', idem2.sameElev);
console.log('Status OK:        ', idem2.sameStatus);
console.log('Score (feas) OK:  ', idem2.sameScore);
console.log('Confidence OK:    ', idem2.sameConf);
console.log('Feas msg OK:      ', idem2.sameFeasMsg);
console.log('SafetyWarning OK: ', idem2.sameSafety);
console.log('Welcome OK:       ', idem2.sameWelcome);
if (!idem2.allSame) {
  console.error('❌ PATCH INCOMPLET');
  process.exit(2);
}

// --- Vérifs invariants doctrine ---
console.log('\n=== INVARIANTS DOCTRINE ===');
// Mots interdits absents ?
assertNoBanned('feasibility.message (after)',       feA?.message);
assertNoBanned('feasibility.safetyWarning (after)', feA?.safetyWarning);
assertNoBanned('welcomeMessage (after)',            wmA);
console.log('Mots interdits : ABSENTS dans tous les messages écrits');

// Vérifs cohérence vecteurs
console.log('\n=== VÉRIFS VECTEURS ===');
console.log('weeklyVolumes length:', gcA?.periodizationPlan?.weeklyVolumes?.length, '(attendu 19)');
console.log('weeklyElevationTarget length:', gcA?.periodizationPlan?.weeklyElevationTarget?.length, '(attendu 19)');
const pic = Math.max(...gcA.periodizationPlan.weeklyVolumes);
const picElev = Math.max(...gcA.periodizationPlan.weeklyElevationTarget);
console.log('Pic volume:', pic, '(attendu 100)');
console.log('Pic dénivelé:', picElev, '(attendu 6500)');

// Vérifier sauts ≤ +30%
let maxJump = 0;
const vols = gcA.periodizationPlan.weeklyVolumes;
for (let i = 1; i < vols.length; i++) {
  if (vols[i] > vols[i-1]) {
    const pct = ((vols[i] - vols[i-1]) / vols[i-1]) * 100;
    if (pct > maxJump) maxJump = pct;
  }
}
console.log('Saut max volume:', maxJump.toFixed(1) + '%', '(doit être ≤ 30%)');

// Vérifier mentions clés welcomeMessage
const hasBTB    = (wmA||'').toLowerCase().includes('back-to-back');
const hasNight  = (wmA||'').toLowerCase().includes('nuit');
const hasMaster = (wmA||'').toLowerCase().includes('master');
const hasMedical= (wmA||'').toLowerCase().includes('médical');
console.log('welcomeMessage contient "back-to-back":', hasBTB);
console.log('welcomeMessage contient "nuit":         ', hasNight);
console.log('welcomeMessage contient "Master":       ', hasMaster);
console.log('welcomeMessage contient "médical":      ', hasMedical);
if (!hasBTB || !hasNight || !hasMaster || !hasMedical) {
  console.error('❌ Mentions clés manquantes dans welcomeMessage');
  process.exit(4);
}

// Vérifier que feasibility.status & score sont bien alignés
if (feA?.status !== TARGET_FEAS_STATUS || parseInt(feA?.score) !== TARGET_FEAS_SCORE || parseInt(confA) !== TARGET_CONFIDENCE) {
  console.error('❌ status/score/confidence pas alignés');
  process.exit(3);
}

console.log('\n✅✅✅ PATCH PLAN 2 HOMOGÉNÉISATION COMPLET ET CONFIRMÉ');
console.log('Plan 1 ↔ Plan 2 alignés : status=AMBITIEUX, score=60, confidence=60');
