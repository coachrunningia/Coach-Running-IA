#!/usr/bin/env node
/**
 * patch-morgane-semi-live.mjs
 *
 * Patch live Firestore du plan Semi-Marathon Morgane (planId 1779261135721).
 *
 * Contexte audit Coach 20 ans + doctrine Romane "conservateur Débutant mais volume important":
 *   - Profil : F, ~20-30 ans, Semi-Marathon Finisher, freq 3, currentVol 7 km/sem,
 *     VMA estimée 11 km/h, niveau Débutant (0-1 an).
 *   - Plan freemium 1 semaine générée (preview), durationWeeks=22.
 *   - generationContext.periodizationPlan.weeklyVolumes actuel pic = 14 km/sem
 *     -> sous-calibré pour un Semi.
 *
 * Patch chirurgical :
 *   - generationContext.periodizationPlan.weeklyVolumes recalibré
 *     pic 14 -> 19 km/sem (conservateur Débutant + volume relevé pour un Semi)
 *   - S1 (seule semaine actuellement matérialisée) = 8 km : déjà cohérente avec
 *     la nouvelle progression -> NON touchée.
 *
 * Doctrines respectées :
 *   - feedback_input_client_obligatoire : targetTime "Finisher", level Débutant,
 *     currentWeeklyVolume 7, VMA 11, paces.* : INCHANGÉS.
 *   - feedback_jamais_baisser_allure_cible : aucune allure cible modifiée.
 *   - feedback_jamais_poids_minceur : aucun wording modifié (zéro risque).
 *   - feedback_jamais_contact_client : modif silencieuse.
 *   - feedback_patch_live_plans_jour_seulement : plan créé 2026-05-20 07:12Z,
 *     S1 non vécue (preview), patchable.
 *   - feedback_qualite_avant_vitesse : progression max +25% post-récup
 *     (équivalent à la périodisation actuelle).
 *
 * Dry-run par défaut. Pour exécuter : DRY_RUN=false node patch-morgane-semi-live.mjs
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779261135721';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_FILE = `/Users/romanemarino/Coach-Running-IA/backup-morgane-plan-${Date.now()}.json`;

// Nouvelle périodisation Morgane (22 semaines).
// Avant : [8,9,9,7,8,9,9,9,10,10,10,12,11,12,14,11,13,14,11,13,9,8]  pic 14
// Après : [8,9,10,8,10,12,10,12,14,11,13,15,12,15,17,14,16,18,16,19,13,9]  pic 19
const NEW_WEEKLY_VOLUMES = [8, 9, 10, 8, 10, 12, 10, 12, 14, 11, 13, 15, 12, 15, 17, 14, 16, 18, 16, 19, 13, 9];

// Mots interdits doctrine feedback_jamais_poids_minceur (preflight de robustesse,
// même si on ne touche pas aux wordings ici).
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = String(txt).toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) throw new Error(`Mot interdit "${w}" détecté dans ${label}: ${txt.slice(0, 160)}`);
  }
}

function token() {
  return execSync('gcloud auth print-access-token').toString().trim();
}

function fetchDoc() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" "${URL}"`,
    { maxBuffer: 80 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

function diff(label, before, after) {
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) { console.log(`    (inchangé)`); return; }
  console.log(`  AVANT: ${JSON.stringify(before)}`);
  console.log(`  APRES: ${JSON.stringify(after)}`);
}

(async () => {
  console.log(`>>> Patch live Morgane Semi (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);

  // 0) Sanity preflight wording (aucun wording modifié ici, mais on s'assure
  //    qu'aucune string interdite ne traverse).
  assertSafe('NEW_WEEKLY_VOLUMES', JSON.stringify(NEW_WEEKLY_VOLUMES));

  // 1) Fetch + backup
  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  execSync(`cat > ${BACKUP_FILE} <<'JSON_EOF'\n${JSON.stringify(doc, null, 2)}\nJSON_EOF`);
  console.log(`Backup -> ${BACKUP_FILE}`);

  const f = doc.fields;

  // 2) Sanity checks profil
  const userEmail = f.userEmail?.stringValue;
  if (userEmail !== 'morganedorlet696@gmail.com') {
    throw new Error(`Email plan inattendu: ${userEmail}`);
  }
  const durationWeeks = parseInt(f.durationWeeks?.integerValue, 10);
  if (durationWeeks !== 22) {
    throw new Error(`durationWeeks attendu 22, trouvé ${durationWeeks}`);
  }
  if (NEW_WEEKLY_VOLUMES.length !== durationWeeks) {
    throw new Error(`NEW_WEEKLY_VOLUMES taille ${NEW_WEEKLY_VOLUMES.length} != durationWeeks ${durationWeeks}`);
  }

  // 3) Localiser generationContext.periodizationPlan.weeklyVolumes
  const gc = f.generationContext?.mapValue?.fields;
  if (!gc) throw new Error('generationContext introuvable.');
  const periodPlan = gc.periodizationPlan?.mapValue?.fields;
  if (!periodPlan) throw new Error('generationContext.periodizationPlan introuvable.');
  const wvArr = periodPlan.weeklyVolumes?.arrayValue?.values;
  if (!Array.isArray(wvArr)) throw new Error('weeklyVolumes introuvable ou pas array.');

  const oldVols = wvArr.map(v => Number(v.integerValue ?? v.doubleValue));
  diff('generationContext.periodizationPlan.weeklyVolumes', oldVols, NEW_WEEKLY_VOLUMES);

  console.log(`\nPic ancien : ${Math.max(...oldVols)} km/sem`);
  console.log(`Pic nouveau: ${Math.max(...NEW_WEEKLY_VOLUMES)} km/sem`);
  console.log(`Sum ancien : ${oldVols.reduce((a, b) => a + b, 0)} km total`);
  console.log(`Sum nouveau: ${NEW_WEEKLY_VOLUMES.reduce((a, b) => a + b, 0)} km total`);

  // 4) Reconstruire l'array Firestore (integerValue conservés en string per spec)
  periodPlan.weeklyVolumes = {
    arrayValue: {
      values: NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: String(n) })),
    },
  };

  // 5) Vérifications doctrine — ces champs NE DOIVENT PAS être modifiés
  console.log(`\n--- Doctrine input client respectée ---`);
  console.log(`  targetTime           : ${f.targetTime?.stringValue} (inchangé)`);
  console.log(`  calculatedVMA        : ${f.calculatedVMA?.doubleValue ?? f.calculatedVMA?.integerValue} (inchangé)`);
  console.log(`  vma                  : ${f.vma?.doubleValue ?? f.vma?.integerValue} (inchangé)`);
  console.log(`  vmaSource            : ${f.vmaSource?.stringValue} (inchangé)`);
  console.log(`  sessionsPerWeek      : ${f.sessionsPerWeek?.integerValue} (inchangé)`);
  console.log(`  durationWeeks        : ${f.durationWeeks?.integerValue} (inchangé)`);
  console.log(`  paces.*              : INCHANGÉS (pas dans le payload)`);
  console.log(`  weeks[0] (S1)        : INCHANGÉE (sum dist = 8 km déjà cohérent)`);

  // 6) Payload : on patch uniquement generationContext (avec updateMask ciblé)
  const body = { fields: { generationContext: f.generationContext } };
  const patchUrl = `${URL}?updateMask.fieldPaths=generationContext`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-morgane-semi-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-morgane-${Date.now()}.json`;
  execSync(`cat > ${tmp} <<'JSON_EOF'\n${JSON.stringify(body)}\nJSON_EOF`);
  const res = execSync(
    `curl -s -X PATCH -H "Authorization: Bearer ${t}" -H "Content-Type: application/json" --data-binary @${tmp} "${patchUrl}"`,
    { maxBuffer: 80 * 1024 * 1024 }
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

  // 7) Re-fetch + verif
  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-morgane-plan.json';
  execSync(`cat > ${outFile} <<'JSON_EOF'\n${JSON.stringify(after, null, 2)}\nJSON_EOF`);
  console.log(`Dump post-patch -> ${outFile}`);

  const afterVols = after.fields.generationContext.mapValue.fields.periodizationPlan
    .mapValue.fields.weeklyVolumes.arrayValue.values.map(v => Number(v.integerValue));
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  weeklyVolumes: ${JSON.stringify(afterVols)}`);
  console.log(`  pic post-patch: ${Math.max(...afterVols)} km/sem`);
  console.log(`  sum post-patch: ${afterVols.reduce((a, b) => a + b, 0)} km total`);
  console.log(`  targetTime (inchangé): ${after.fields.targetTime?.stringValue}`);
  console.log(`  vma (inchangé): ${after.fields.vma?.doubleValue ?? after.fields.vma?.integerValue}`);

  // Cohérence
  if (JSON.stringify(afterVols) !== JSON.stringify(NEW_WEEKLY_VOLUMES)) {
    throw new Error('INCOHERENCE POST-PATCH : weeklyVolumes ne match pas la cible !');
  }
  console.log('\nOK — cohérence post-patch validée.');
})().catch(e => { console.error('FATAL', e); process.exit(99); });
