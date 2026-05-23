#!/usr/bin/env node
/**
 * patch-louleroy-semi-live.mjs
 *
 * Patch live Firestore du plan Semi-Marathon Louleroy (planId 1779260474961).
 *
 * Contexte audit Coach 20 ans + doctrine Romane "conservateur Débutant mais volume important":
 *   - Profil : F, 23 ans, Semi-Marathon target 1h10 (IRRÉALISTE, ~187% VMA),
 *     niveau "Confirmé (Compétition)" déclaré MAIS 10K en 1h09 -> Débutant réel.
 *     freq 4, currentVol 10 km/sem, VMA 9.66 km/h, BMI ~30.4.
 *   - Plan freemium 1 semaine générée (preview), durationWeeks=22.
 *   - feasibility.status = IRRÉALISTE (gardé tel quel, géré côté welcomeMessage).
 *   - generationContext.periodizationPlan.weeklyVolumes actuel pic = 18 km/sem
 *     -> sous-calibré pour un Semi, même Débutant.
 *
 * Patch chirurgical :
 *   - generationContext.periodizationPlan.weeklyVolumes recalibré
 *     pic 18 -> 24 km/sem (conservateur car BMI 30+, volume relevé pour un Semi).
 *   - S1 (seule semaine matérialisée) = 10 km : déjà cohérente avec la nouvelle
 *     progression -> NON touchée.
 *
 * Doctrines respectées :
 *   - feedback_input_client_obligatoire : targetTime "1h10", level "Confirmé",
 *     currentWeeklyVolume 10, VMA 9.66, paces.allureSpecifiqueSemi=3:19 :
 *     INCHANGÉS (l'utilisateur a saisi ces valeurs, on les respecte).
 *   - feedback_jamais_baisser_allure_cible : aucune allure cible modifiée.
 *   - feedback_jamais_poids_minceur : aucun wording modifié, zéro mention
 *     poids/IMC/silhouette/kilos.
 *   - feedback_jamais_contact_client : modif silencieuse.
 *   - feedback_patch_live_plans_jour_seulement : plan créé 2026-05-20 07:01Z,
 *     S1 non vécue (preview), patchable.
 *   - feedback_securite_avant_conversion : feasibility.status=IRRÉALISTE et
 *     welcomeMessage gèrent l'avertissement chrono, intact.
 *
 * Dry-run par défaut. Pour exécuter : DRY_RUN=false node patch-louleroy-semi-live.mjs
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779260474961';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_FILE = `/Users/romanemarino/Coach-Running-IA/backup-louleroy-plan-${Date.now()}.json`;

// Nouvelle périodisation Louleroy (22 semaines).
// Avant : [10,11,11,9,10,12,10,12,14,11,13,15,13,15,17,14,16,18,14,16,12,10]  pic 18
// Après : [10,12,13,11,13,15,12,15,17,14,17,20,16,19,22,18,21,24,20,24,16,11]  pic 24
const NEW_WEEKLY_VOLUMES = [10, 12, 13, 11, 13, 15, 12, 15, 17, 14, 17, 20, 16, 19, 22, 18, 21, 24, 20, 24, 16, 11];

// Mots interdits doctrine feedback_jamais_poids_minceur (preflight de robustesse).
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
  console.log(`>>> Patch live Louleroy Semi (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);

  assertSafe('NEW_WEEKLY_VOLUMES', JSON.stringify(NEW_WEEKLY_VOLUMES));

  // 1) Fetch + backup
  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  execSync(`cat > ${BACKUP_FILE} <<'JSON_EOF'\n${JSON.stringify(doc, null, 2)}\nJSON_EOF`);
  console.log(`Backup -> ${BACKUP_FILE}`);

  const f = doc.fields;

  // 2) Sanity checks profil
  const userEmail = f.userEmail?.stringValue;
  if (userEmail !== 'louleroy94@gmail.com') {
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

  // 4) Reconstruire l'array Firestore
  periodPlan.weeklyVolumes = {
    arrayValue: {
      values: NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: String(n) })),
    },
  };

  // 5) Vérifications doctrine
  console.log(`\n--- Doctrine input client respectée ---`);
  console.log(`  targetTime           : ${f.targetTime?.stringValue} (inchangé — IRRÉALISTE géré par feasibility/welcome)`);
  console.log(`  calculatedVMA        : ${f.calculatedVMA?.doubleValue ?? f.calculatedVMA?.integerValue} (inchangé)`);
  console.log(`  vma                  : ${f.vma?.doubleValue ?? f.vma?.integerValue} (inchangé)`);
  console.log(`  vmaSource            : ${f.vmaSource?.stringValue} (inchangé)`);
  console.log(`  sessionsPerWeek      : ${f.sessionsPerWeek?.integerValue} (inchangé)`);
  console.log(`  durationWeeks        : ${f.durationWeeks?.integerValue} (inchangé)`);
  console.log(`  feasibility.status   : ${f.feasibility?.mapValue?.fields?.status?.stringValue} (inchangé)`);
  console.log(`  paces.*              : INCHANGÉS (allureSpecifiqueSemi=3:19 conservée)`);
  console.log(`  weeks[0] (S1)        : INCHANGÉE (sum dist = 10 km déjà cohérent)`);

  // 6) Payload
  const body = { fields: { generationContext: f.generationContext } };
  const patchUrl = `${URL}?updateMask.fieldPaths=generationContext`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-louleroy-semi-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-louleroy-${Date.now()}.json`;
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
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-louleroy-plan.json';
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
  console.log(`  paces.allureSpecifiqueSemi (inchangée): ${after.fields.paces?.mapValue?.fields?.allureSpecifiqueSemi?.stringValue}`);

  if (JSON.stringify(afterVols) !== JSON.stringify(NEW_WEEKLY_VOLUMES)) {
    throw new Error('INCOHERENCE POST-PATCH : weeklyVolumes ne match pas la cible !');
  }
  console.log('\nOK — cohérence post-patch validée.');
})().catch(e => { console.error('FATAL', e); process.exit(99); });
