#!/usr/bin/env node
/**
 * patch-arnaud-renfo-adducteurs-27mai.mjs
 *
 * Patch live SÉCURITÉ Arnaud (elisarnaud.1311@gmail.com, plan 1779554515397).
 *
 * Contexte : Arnaud a renseigné le feedback suivant sur sa séance S1 Renfo Focus A
 * (Quadriceps & Gainage) — Mardi avec RPE 7/10 :
 *   "Difficile sur le gainage tremblement, léger mal au niveau des adducteurs."
 *
 * Sa prochaine séance Renfo (S2 Jeudi 04/06) est "Focus B - Fessiers/Hanches &
 * Gainage lateral" — exactement la chaîne musculaire LIÉE aux adducteurs (les
 * hanches/fessiers tirent mécaniquement sur les adducteurs en abduction/adduction).
 *
 * Sans patch : risque réel de bascule en lésion adducteur (tendinopathie ou
 * déchirure micro-fibrillaire) si Arnaud ne sait pas adapter les exos.
 *
 * Patches validés par coach course à pied 20+ ans (Version 2 — Renfo + alerte SL) :
 *
 *   S2 Jeudi Renforcement Focus B :
 *     - mainSet : préfixe "⚠️ ADAPTATION SUITE À TON RESSENTI S1" avec règles
 *       concrètes (échauffement, skip exos qui tirent, gainage genoux fléchis,
 *       squat bulgare amplitude 45°, douleur >4/10 → stop + glace) + ouverture kiné
 *       si récidive
 *     - advice : enrichi rappel règle douleur + glace post si tension
 *
 *   S2 Vendredi Sortie Longue (lendemain Renfo Focus B) :
 *     - mainSet : préfixe alerte "Si tu as fait le Renfo Focus B hier..." pour éviter
 *       la cascade DOMS J+1 adducteurs + négative split = risque tendinopathie
 *       (Cook & Purdam, Pfitzinger back-to-back lower-body monitoring)
 *
 * Doctrines respectées :
 *   D1 — allure cible non touchée (Renfo n'a pas d'allure) ✅
 *   D2 — inputs immuables ✅
 *   D6 — zéro mention poids/IMC ✅
 *   feedback_securite_avant_conversion — sécurité avant tout ✅
 *   feedback_compromis_messages_preventifs — message préventif, pas blocage ✅
 *   feedback_jamais_contact_client — admin Firestore, pas d'email user ✅
 *
 * S1 Jeudi (déjà completed=true) NON touché.
 * S3+ non touché (on attend retour user S2 d'abord).
 *
 * Idempotent : si la phrase "⚠️ Adapte selon ton ressenti" est déjà présente
 * dans le mainSet S2, on skip.
 *
 * Dry-run par défaut. Pour exec : DRY_RUN=false node patch-arnaud-renfo-adducteurs-27mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779554515397';
const EXPECTED_EMAIL = 'elisarnaud.1311@gmail.com';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-arnaud-26mai/backups-renfo-adducteurs-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const FORBIDDEN_WORDS = ['imc', 'poids', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'bmi', 'obèse', 'graisse'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = String(txt).toLowerCase();
  for (const w of FORBIDDEN_WORDS) {
    if (low.includes(w)) throw new Error(`Mot interdit D6 "${w}" dans ${label}`);
  }
}

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }
function fetchDoc() {
  return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
}

// ============== PATCH CONTENT ==============

// Encadré sécurité à insérer EN PRÉFIXE du mainSet S2 Renfo
// Wording validé coach FFA 20 ans (cf rapport coach 27/05) : signal de seuil normal
// début de plan, pas une blessure → cadre actionnable non anxiogène.
const MARKER_IDEMPOTENT_RENFO = '⚠️ ADAPTATION SUITE À TON RESSENTI S1';
const PREFIX_MAINSET_NEW =
  "⚠️ ADAPTATION SUITE À TON RESSENTI S1 — Gainage tremblement + tension adducteurs (RPE 7) = signal de seuil normal en début de plan, pas une blessure. On adapte pour consolider sans forcer :\n" +
  "• Échauffement : 10 min mobilité hanches DOUCE (cercles, rotations) avant le circuit.\n" +
  "• Tension adducteurs > 2/10 sur un exo → SKIP cet exo, passe au suivant.\n" +
  "• Squat bulgare : amplitude réduite 45° (pas 90°), descente lente contrôlée.\n" +
  "• Gainage latéral : démarre GENOUX FLÉCHIS au sol tant que les adducteurs sont sensibles.\n" +
  "• Douleur > 4/10 à tout moment → STOP la séance, marche 10 min, glace 15 min sur la zone tendue.\n" +
  "• Si même ressenti adducteurs cette semaine → on réadapte S3 et tu vois un kiné du sport pour bilan.\n\n" +
  "Circuit habituel ci-dessous :\n";

const ADVICE_NEW =
  "Suite à ton feedback S1 (gainage tremblement + tension adducteurs RPE 7) : cette séance Focus B sollicite hanches/fessiers/gainage latéral, chaîne directement liée aux adducteurs. PRIORITÉ : sécurité avant intensité. Skip tout exo qui tire > 2/10 sur les adducteurs. Si la séance se passe mal, prends un repos complet à la place (le repos est une séance utile). Glace 15 min post-séance sur la zone tendue si besoin. Si récidive en S2 → kiné du sport pour bilan avant S3.";

// === Vendredi 05/06 — COURSE OFFICIELLE 10km, alerte post-Renfo (Version 2 adaptée) ===
// ATTENTION : Vendredi 05/06 = COURSE OFFICIELLE 10km Arnaud (patchée hier A-5 batch).
// Wording adapté course officielle (pas SL EF). Risque post-Renfo Focus B la veille :
// DOMS adducteurs + effort max course → cascade tendinopathie possible.
// Cook & Purdam : "load is the treatment" mais avec progression — pas effort max sur
// tissu sensibilisé. Coach amateur doit pouvoir prendre la décision pendant la course.
const MARKER_IDEMPOTENT_SL = '⚠️ Si tu as fait le Renfo Focus B';
const PREFIX_SL_VENDREDI_NEW =
  "⚠️ Si tu as fait le Renfo Focus B hier (Jeudi 04/06) et que tes adducteurs/hanches tirent encore au réveil : c'est ta COURSE 10km OFFICIELLE aujourd'hui, mais ta SÉCURITÉ passe avant le chrono. Trois règles :\n" +
  "• ÉCHAUFFE-TOI LONGUEMENT : 15-20 min de footing très lent (allure récup, marche si besoin) + mobilité hanches DOUCE avant le départ. NE PAS sauter cette étape.\n" +
  "• Pendant la course : si douleur adducteurs > 3/10 → ralentis franchement, accepte de marcher dans les bosses. Mieux finir bien que tendinopathie pour 6 semaines.\n" +
  "• Si douleur > 5/10 → retire-toi proprement (au ravitaillement, à un check-point). Cette course est UN POINT DE RÉFÉRENCE chrono, pas un test all-in. Tu as 13 semaines de plan derrière pour progresser.\n\n";

// ============== EXEC ==============

console.log(`>>> Patch SÉCURITÉ Arnaud — S2 Renfo prévention adducteurs — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups dans ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan Arnaud introuvable');

writeFileSync(`${BACKUP_DIR}/${PLAN_ID}.json`, JSON.stringify(doc, null, 2));
console.log(`>>> Backup OK`);

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ updateTime avant : ${doc.updateTime}`);

// Cibles : S2 Jeudi Renforcement + S2 Vendredi Sortie Longue (lendemain Renfo)
const s2Sessions = f.weeks.arrayValue.values[1].mapValue.fields.sessions.arrayValue.values;
const renfoSession = s2Sessions.find((s) => {
  const sf = s.mapValue.fields;
  return sf.day?.stringValue === 'Jeudi' && sf.type?.stringValue === 'Renforcement';
});
const slSession = s2Sessions.find((s) => {
  const sf = s.mapValue.fields;
  return sf.day?.stringValue === 'Vendredi' && sf.type?.stringValue === 'Sortie Longue';
});

if (!renfoSession) throw new Error('S2 Jeudi Renforcement introuvable');
if (!slSession) throw new Error('S2 Vendredi Sortie Longue introuvable');

const renfoFields = renfoSession.mapValue.fields;
const slFields = slSession.mapValue.fields;
const renfoMainCurrent = renfoFields.mainSet?.stringValue || '';
const renfoAdviceCurrent = renfoFields.advice?.stringValue || '';
const slMainCurrent = slFields.mainSet?.stringValue || '';

console.log(`\n--- Sessions cibles S2 ---`);
console.log(`  Renfo Jeudi  : ${renfoFields.title?.stringValue}`);
console.log(`    mainSet actuel (100c) : ${renfoMainCurrent.slice(0, 100)}...`);
console.log(`    advice actuel (100c)  : ${renfoAdviceCurrent.slice(0, 100)}`);
console.log(`  SL Vendredi  : ${slFields.title?.stringValue}`);
console.log(`    mainSet actuel (100c) : ${slMainCurrent.slice(0, 100)}...`);

// === Patch 1 : S2 Renfo Jeudi ===
let renfoAlreadyPatched = false;
if (renfoMainCurrent.includes(MARKER_IDEMPOTENT_RENFO)) {
  console.log(`\n  ⏭️  S2 Renfo : marker déjà présent — skip.`);
  renfoAlreadyPatched = true;
} else {
  const newRenfoMain = PREFIX_MAINSET_NEW + renfoMainCurrent.trim();
  assertSafe('S2 Renfo mainSet', newRenfoMain);
  assertSafe('S2 Renfo advice', ADVICE_NEW);
  renfoFields.mainSet = { stringValue: newRenfoMain };
  renfoFields.advice = { stringValue: ADVICE_NEW };
  console.log(`\n  ✓ S2 Renfo patché : +${PREFIX_MAINSET_NEW.length} chars mainSet + advice ${renfoAdviceCurrent.length}→${ADVICE_NEW.length} chars`);
}

// === Patch 2 : S2 SL Vendredi (alerte post-Renfo) ===
let slAlreadyPatched = false;
if (slMainCurrent.includes(MARKER_IDEMPOTENT_SL)) {
  console.log(`  ⏭️  S2 SL Vendredi : marker déjà présent — skip.`);
  slAlreadyPatched = true;
} else {
  const newSlMain = PREFIX_SL_VENDREDI_NEW + slMainCurrent.trim();
  assertSafe('S2 SL Vendredi mainSet', newSlMain);
  slFields.mainSet = { stringValue: newSlMain };
  console.log(`  ✓ S2 SL Vendredi patché : +${PREFIX_SL_VENDREDI_NEW.length} chars en préfixe (alerte post-Renfo)`);
}

if (renfoAlreadyPatched && slAlreadyPatched) {
  console.log(`\n========== Tout idempotent — aucun changement ==========`);
  process.exit(0);
}

// === Exec ===
if (DRY_RUN) {
  console.log(`\n========== DRY RUN OK ==========`);
  console.log(`Pour exec : DRY_RUN=false node patch-arnaud-renfo-adducteurs-27mai.mjs`);
} else {
  const url = `${docUrl}?updateMask.fieldPaths=weeks`;
  const body = { fields: { weeks: f.weeks } };
  const tmp = `/tmp/patch-arnaud-renfo-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify(body));
  const res = execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80 * 1024 * 1024 }).toString();
  const parsed = JSON.parse(res);
  if (parsed.error) {
    console.error(`\n❌ PATCH FAILED : ${parsed.error.message}`);
    process.exit(1);
  }
  console.log(`\n========== EXEC TERMINÉ ==========`);
  console.log(`✅ PATCH OK -> updateTime: ${parsed.updateTime}`);
  console.log(`\nArnaud verra l'encadré sécurité au prochain refresh sur sa séance Renfo S2 Jeudi 04/06.`);
}
