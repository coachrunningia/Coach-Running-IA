#!/usr/bin/env node
/**
 * patch-julian-feasibility-live.mjs
 *
 * Patch live Firestore du plan 1778935995789 (julian.jobert@hotmail.fr,
 * UID bNTAkiezfzf21NFdqapqIvx5YRw2).
 *
 * Contexte : VMA recalibrée 11.8 -> 12.3 km/h suite test demi-Cooper du 18/05
 * (1230 m en 6 min). plan.vma, paces.* et vmaSource déjà à jour. Seuls
 * feasibility.message et feasibility.recommendation sont obsolètes et
 * mentionnent encore la VMA 11.8.
 *
 * Modifs :
 *  - feasibility.message : réécrit (mention VMA 12,3, test demi-Cooper 18/05,
 *    estimation Riegel ~57 min, marge 2 min via seuil + spécifique trail,
 *    rappel aponévrosite)
 *  - feasibility.recommendation : "Objectif réaliste 55-57 min selon progression"
 *
 * CONSERVÉ (doctrine input client + jamais baisser allure cible) :
 *  - targetTime = "55min"
 *  - paces.* (déjà recalées sur VMA 12.3)
 *  - vma = 12.3
 *  - vmaSource = "Ajustée manuellement : 11.8 → 12.3 km/h"
 *  - feasibility.status = "AMBITIEUX"
 *  - feasibility.safetyWarning (déjà bon : kiné/médecin)
 *  - feasibility.score (si présent) -> conservé
 *
 * Doctrines :
 *  - feedback_input_client_obligatoire  : targetTime/paces/vma inchangés
 *  - feedback_jamais_baisser_allure_cible : 55 min cible préservée
 *  - feedback_jamais_poids_minceur      : preflight FORBIDDEN
 *  - feedback_jamais_contact_client     : modif silencieuse (pas de notif)
 *  - feedback_securite_avant_conversion : message honnête (rappelle dénivelé +
 *    aponévrosite, ne promet pas le chrono)
 */

import { execSync } from 'node:child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778935995789';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';

function token() {
  return execSync(
    `gcloud auth print-access-token --impersonate-service-account=${SA}`,
    { stdio: ['pipe', 'pipe', 'pipe'] }
  ).toString().trim();
}

function fetchDoc() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" -H "x-goog-user-project: ${PROJECT}" "${URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

// ---- Wordings cibles ----
const NEW_FEASIBILITY_MESSAGE =
  "Excellent travail Julian — on a mis à jour ta VMA à 12,3 km/h suite à ton test demi-Cooper du 18/05 (1230 m en 6 min). Tes allures d'entraînement ont été automatiquement recalibrées sur cette nouvelle base, mieux adaptée à ton niveau réel.\n\nAvec cette VMA et 8 semaines de prépa, ton objectif de 55 min sur ton trail (PB actuel 56:30) reste ambitieux mais accessible : l'estimation Riegel sur ta VMA actualisée donne un chrono théorique autour de 57 min. La marge à grappiller (~2 min) viendra du travail seuil et du dénivelé spécifique des prochaines semaines.\n\nVigilance : ton aponévrosite plantaire impose une rampe progressive — écoute les sensations et privilégie les sorties souples (sentier > bitume) sur les phases de charge.";

const NEW_RECOMMENDATION =
  "Objectif réaliste 55-57 min selon progression";

// ---- Mots interdits (doctrine feedback_jamais_poids_minceur) ----
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = txt.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      throw new Error(`Mot interdit "${w}" detecte dans ${label}: ${txt.slice(0, 160)}`);
    }
  }
}

function preflightWordings() {
  assertSafe('feasibility.message', NEW_FEASIBILITY_MESSAGE);
  assertSafe('feasibility.recommendation', NEW_RECOMMENDATION);
}

function diff(label, before, after) {
  const same = before === after;
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) {
    console.log(`    (inchangé)`);
    return;
  }
  console.log(`  AVANT: ${String(before).slice(0, 400)}${String(before).length > 400 ? '...' : ''}`);
  console.log(`  APRES: ${String(after).slice(0, 400)}${String(after).length > 400 ? '...' : ''}`);
}

(async () => {
  console.log(`>>> Patch live julian.jobert@hotmail.fr (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  preflightWordings();

  const doc = fetchDoc();
  if (!doc.fields) {
    console.error('Doc introuvable / réponse inattendue :', JSON.stringify(doc).slice(0, 500));
    throw new Error('Document introuvable.');
  }
  const f = doc.fields;

  // --- Garde-fou : assert état inchangé sur champs sensibles ---
  const vma = f.vma?.doubleValue ?? f.vma?.integerValue;
  const targetTime = f.targetTime?.stringValue;
  const vmaSource = f.vmaSource?.stringValue;
  const efPace = f.paces?.mapValue?.fields?.efPace?.stringValue;
  const allure10k = f.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
  console.log(`\n--- ÉTAT AVANT PATCH (assert) ---`);
  console.log(`  targetTime              : ${targetTime}`);
  console.log(`  vma                     : ${vma}`);
  console.log(`  vmaSource               : ${vmaSource}`);
  console.log(`  paces.efPace            : ${efPace}`);
  console.log(`  paces.allureSpecifique10k : ${allure10k}`);

  if (String(targetTime) !== '55min') throw new Error(`targetTime inattendu : ${targetTime}`);
  if (Number(vma) !== 12.3) throw new Error(`vma attendue 12.3, trouvée : ${vma}`);
  if (vmaSource !== 'Ajustée manuellement : 11.8 → 12.3 km/h') {
    throw new Error(`vmaSource inattendu : ${vmaSource}`);
  }

  // --- feasibility ---
  const feas = f.feasibility?.mapValue?.fields || {};
  const oldStatus  = feas.status?.stringValue;
  const oldScore   = feas.score?.integerValue;
  const oldMsg     = feas.message?.stringValue;
  const oldRecom   = feas.recommendation?.stringValue;
  const oldSafety  = feas.safetyWarning?.stringValue;

  feas.message        = { stringValue: NEW_FEASIBILITY_MESSAGE };
  feas.recommendation = { stringValue: NEW_RECOMMENDATION };
  // status, score, safetyWarning conservés

  diff('feasibility.status (conservé)', oldStatus, oldStatus);
  diff('feasibility.score (conservé)', oldScore, oldScore);
  diff('feasibility.safetyWarning (conservé)', oldSafety, oldSafety);
  diff('feasibility.message', oldMsg, NEW_FEASIBILITY_MESSAGE);
  diff('feasibility.recommendation', oldRecom, NEW_RECOMMENDATION);

  // --- PAYLOAD ---
  const body = {
    fields: { feasibility: f.feasibility },
  };
  const fieldPaths = ['feasibility'];
  const maskQuery = fieldPaths
    .map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`)
    .join('&');
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-julian-feasibility-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-julian-feasibility-${Date.now()}.json`;
  execSync(`cat > ${tmp} <<'JSON_EOF'\n${JSON.stringify(body)}\nJSON_EOF`);
  const res = execSync(
    `curl -s -X PATCH -H "Authorization: Bearer ${t}" -H "x-goog-user-project: ${PROJECT}" -H "Content-Type: application/json" --data-binary @${tmp} "${patchUrl}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  let parsed;
  try { parsed = JSON.parse(res); } catch (e) {
    console.error('Réponse non-JSON:', res.slice(0, 500));
    process.exit(1);
  }
  if (parsed.error) {
    console.error('ERREUR PATCH:', JSON.stringify(parsed.error, null, 2));
    process.exit(1);
  }
  console.log('\nPATCH OK -> updateTime:', parsed.updateTime);

  // Re-fetch + dump
  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-julian.json';
  execSync(`cat > ${outFile} <<'JSON_EOF'\n${JSON.stringify(after, null, 2)}\nJSON_EOF`);
  console.log(`Dump post-patch -> ${outFile}`);

  // Vérif lecture
  const fa = after.fields;
  const feasA = fa.feasibility?.mapValue?.fields || {};
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  feasibility.status         : ${feasA.status?.stringValue}`);
  console.log(`  feasibility.score          : ${feasA.score?.integerValue}`);
  console.log(`  feasibility.message (200c) : ${(feasA.message?.stringValue||'').slice(0,200)}...`);
  console.log(`  feasibility.recommendation : ${feasA.recommendation?.stringValue}`);
  console.log(`  feasibility.safetyWarning  : ${(feasA.safetyWarning?.stringValue||'').slice(0,120)}`);
  console.log(`  targetTime (conservé)      : ${fa.targetTime?.stringValue}`);
  console.log(`  vma (conservé)             : ${fa.vma?.doubleValue ?? fa.vma?.integerValue}`);
  console.log(`  vmaSource (conservé)       : ${fa.vmaSource?.stringValue}`);
  console.log(`  paces.efPace (conservé)    : ${fa.paces?.mapValue?.fields?.efPace?.stringValue}`);
  console.log(`  paces.allure10k (conservé) : ${fa.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue}`);

  // Asserts post-patch
  const newMsg = feasA.message?.stringValue || '';
  if (!newMsg.includes('12,3 km/h')) console.warn('WARN: "12,3 km/h" non trouvé dans nouveau message');
  if (!newMsg.includes('test demi-Cooper du 18/05')) console.warn('WARN: "test demi-Cooper du 18/05" non trouvé');
  if (fa.targetTime?.stringValue !== '55min') console.warn('WARN: targetTime modifié !');
  const vmaAfter = fa.vma?.doubleValue ?? fa.vma?.integerValue;
  if (Number(vmaAfter) !== 12.3) console.warn('WARN: vma modifiée !');
})().catch(e => { console.error('FATAL', e); process.exit(99); });
