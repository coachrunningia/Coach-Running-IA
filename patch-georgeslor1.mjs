/**
 * Patch live — plan georgeslor1@gmail.com (1779089493075)
 * UID oWrcHj2F1CQsL34K3KS0ZMc7Olg1 — Marathon 4h45 en 22 sem, Expert 57 ans.
 *
 * Plan affiché "BON" alors qu'IRRÉALISTE (VMA 10.7 → marathon théorique 4h56,
 * PB 5h15, cible 4h45 = -30 min). Désabonnement en 15 min.
 * Doctrine : sécurité > conversion, transparence, jamais embellir un plan irréaliste.
 *
 * Champs modifiés (6) :
 *   - feasibility.status        "BON" -> "AMBITIEUX"
 *   - feasibility.score         (inexistant) -> 60  (le brief demande 79->60 ;
 *                               score top-level vit dans confidenceScore)
 *   - feasibility.message       remplacé (transparence VMA + grosse réduction)
 *   - feasibility.safetyWarning remplacé (écoute corps, révision cible OK)
 *   - confidenceScore (top)     79 -> 60
 *   - welcomeMessage            remplacé (transparence + bilan médical à 57 ans,
 *                               sans aucune mention de poids/IMC)
 *
 * Sécurité Firestore REST :
 *   updateMask.fieldPaths permet de cibler des sous-champs (feasibility.status)
 *   sans écraser les autres sous-champs de feasibility. À TESTER en re-read.
 *
 * Idempotent : la 2e exécution ré-écrit les mêmes valeurs (no-op effectif).
 */
import { execSync } from 'child_process';
import fs from 'fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779089493075';
const BACKUP_PATH = `${process.env.HOME}/Coach-Running-IA/backup-plan-georgeslor1-pre-patch.json`;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const auth = { 'Authorization': `Bearer ${access_token}` };

// ---------- 1. Backup brut si pas déjà fait ----------
if (!fs.existsSync(BACKUP_PATH)) {
  console.log(`[backup] Création ${BACKUP_PATH}`);
  const r0 = await fetch(BASE_URL, { headers: auth });
  const j0 = await r0.json();
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(j0, null, 2));
  console.log(`[backup] ${fs.statSync(BACKUP_PATH).size} bytes écrits`);
} else {
  console.log(`[backup] Existant déjà (${fs.statSync(BACKUP_PATH).size} bytes) — pas réécrit`);
}

// ---------- 2. Read AVANT ----------
const beforeRes = await fetch(BASE_URL, { headers: auth });
const before = await beforeRes.json();
if (before.error) { console.error('READ before échec', before.error); process.exit(1); }

const beforeFeas = before.fields?.feasibility?.mapValue?.fields || {};
const beforeStatus  = beforeFeas.status?.stringValue;
const beforeScore   = beforeFeas.score?.integerValue ?? beforeFeas.score?.doubleValue ?? '(absent)';
const beforeMsg     = beforeFeas.message?.stringValue || '';
const beforeWarn    = beforeFeas.safetyWarning?.stringValue || '';
const beforeConf    = before.fields?.confidenceScore?.integerValue ?? before.fields?.confidenceScore?.doubleValue;
const beforeWelcome = before.fields?.welcomeMessage?.stringValue || '';

// ---------- 3. Nouvelles valeurs ----------
const NEW_STATUS = 'AMBITIEUX';
const NEW_SCORE  = 60;
const NEW_MSG    = "Avec ta VMA de 10.7 km/h, ton temps théorique sur marathon est d'environ 4h56. Tu vises 4h45, soit 30 min de moins que ton PB marathon (5h15) — c'est une grosse réduction, un objectif ambitieux qui demande un entraînement très régulier sur 22 semaines. Le plan est construit pour t'amener au plus près, mais une marge réaliste serait autour de 4h55-5h05 pour limiter le risque de blessure.";
const NEW_WARN   = "Objectif ambitieux : reste à l'écoute de ton corps, respecte les semaines de récupération, et n'hésite pas à revoir la cible à la baisse en cours de plan si nécessaire.";
const NEW_CONF   = 60;
const NEW_WELCOME = "Bienvenue Georges ! Tu as choisi un beau projet : un marathon en 4h45 dans 22 semaines, soit 30 min de moins que ton PB marathon en 5h15. C'est une grosse réduction : un objectif ambitieux qui demande un entraînement très régulier et progressif. Ce plan construit une base solide d'endurance, intègre des séances de renforcement musculaire (1 par semaine) et augmente progressivement le volume jusqu'à ton pic. Reste à l'écoute de ton corps : si tu sens que la cible 4h45 devient trop dure, on pourra réviser vers 4h55-5h05 en cours de plan — c'est mieux que se blesser. Avant de débuter, je te recommande vivement un bilan médical et un certificat cardio-vasculaire (à 57 ans, c'est indispensable).";

// ---------- 4. Diff explicite ----------
const trunc = (s, n=140) => s.length > n ? s.slice(0,n) + '…' : s;
console.log('\n=========== DIFF (avant -> après) ===========');
console.log(`feasibility.status        : "${beforeStatus}"  ->  "${NEW_STATUS}"`);
console.log(`feasibility.score         : ${beforeScore}  ->  ${NEW_SCORE}`);
console.log(`confidenceScore           : ${beforeConf}  ->  ${NEW_CONF}`);
console.log(`feasibility.message       : (${beforeMsg.length}c) "${trunc(beforeMsg)}"`);
console.log(`                          ->(${NEW_MSG.length}c) "${trunc(NEW_MSG)}"`);
console.log(`feasibility.safetyWarning : (${beforeWarn.length}c) "${trunc(beforeWarn)}"`);
console.log(`                          ->(${NEW_WARN.length}c) "${trunc(NEW_WARN)}"`);
console.log(`welcomeMessage            : (${beforeWelcome.length}c) "${trunc(beforeWelcome)}"`);
console.log(`                          ->(${NEW_WELCOME.length}c) "${trunc(NEW_WELCOME)}"`);
console.log('==============================================\n');

// ---------- 5. PATCH (updateMask par sous-champ, préserve le reste) ----------
const fieldPaths = [
  'feasibility.status',
  'feasibility.score',
  'feasibility.message',
  'feasibility.safetyWarning',
  'confidenceScore',
  'welcomeMessage',
];
const qs = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');

const body = {
  fields: {
    feasibility: {
      mapValue: {
        fields: {
          status:        { stringValue: NEW_STATUS },
          score:         { integerValue: NEW_SCORE },
          message:       { stringValue: NEW_MSG },
          safetyWarning: { stringValue: NEW_WARN },
        }
      }
    },
    confidenceScore: { integerValue: NEW_CONF },
    welcomeMessage:  { stringValue: NEW_WELCOME },
  }
};

console.log('[write] PATCH Firestore en cours…');
const patchRes = await fetch(`${BASE_URL}?${qs}`, {
  method: 'PATCH',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const patched = await patchRes.json();
if (patched.error) {
  console.error('🔴 PATCH ÉCHEC :', JSON.stringify(patched.error, null, 2));
  process.exit(1);
}
console.log('[write] PATCH OK (HTTP', patchRes.status + ')');

// ---------- 6. Re-read pour confirmer ----------
const afterRes = await fetch(BASE_URL, { headers: auth });
const after = await afterRes.json();
const afterFeas    = after.fields?.feasibility?.mapValue?.fields || {};
const afterStatus  = afterFeas.status?.stringValue;
const afterScore   = afterFeas.score?.integerValue ?? afterFeas.score?.doubleValue;
const afterMsg     = afterFeas.message?.stringValue || '';
const afterWarn    = afterFeas.safetyWarning?.stringValue || '';
const afterConf    = after.fields?.confidenceScore?.integerValue ?? after.fields?.confidenceScore?.doubleValue;
const afterWelcome = after.fields?.welcomeMessage?.stringValue || '';

console.log('\n=========== RE-READ (post-write) ===========');
const checks = [
  ['feasibility.status',        afterStatus,        NEW_STATUS],
  ['feasibility.score',         String(afterScore), String(NEW_SCORE)],
  ['confidenceScore',           String(afterConf),  String(NEW_CONF)],
  ['feasibility.message',       afterMsg,           NEW_MSG],
  ['feasibility.safetyWarning', afterWarn,          NEW_WARN],
  ['welcomeMessage',            afterWelcome,       NEW_WELCOME],
];
let ok = true;
for (const [name, got, want] of checks) {
  const eq = got === want;
  if (!eq) ok = false;
  console.log(`  ${eq ? '✅' : '🔴'} ${name}  ${eq ? 'OK' : `MISMATCH (got="${trunc(got,80)}", want="${trunc(want,80)}")`}`);
}
console.log('============================================');

// ---------- 7. Vérif rien d'autre cassé ----------
const beforeKeys = Object.keys(before.fields || {}).sort();
const afterKeys  = Object.keys(after.fields  || {}).sort();
const removed = beforeKeys.filter(k => !afterKeys.includes(k));
const added   = afterKeys.filter(k => !beforeKeys.includes(k));
if (removed.length) console.warn('⚠️ Champs top-level perdus :', removed);
if (added.length)   console.log('ℹ️  Champs top-level ajoutés :', added);

const beforeFeasKeys = Object.keys(beforeFeas).sort();
const afterFeasKeys  = Object.keys(afterFeas).sort();
const feasRemoved = beforeFeasKeys.filter(k => !afterFeasKeys.includes(k));
if (feasRemoved.length) console.warn('⚠️ Sous-champs feasibility perdus :', feasRemoved);

// Vérifier que les champs lourds (weeks, paces, etc.) sont toujours là
for (const k of ['weeks','paces','vma','targetTime','sessionsPerWeek','durationWeeks']) {
  if (!after.fields?.[k]) console.warn(`⚠️ Champ "${k}" absent après patch !`);
}

if (!ok) {
  console.error('\n🔴 Au moins un champ n\'a pas la valeur attendue. À investiguer.');
  process.exit(2);
}
console.log('\n✅ Patch live appliqué et confirmé. Aucun champ tiers cassé.');
