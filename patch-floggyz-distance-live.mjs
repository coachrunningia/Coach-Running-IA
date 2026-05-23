#!/usr/bin/env node
/**
 * patch-floggyz-distance-live.mjs
 *
 * Patch live Firestore du plan 1779291643754 (floggyz, 10K Expert)
 *
 * Modif UNIQUE :
 *  - distance : "36 km" -> "10 km"
 *
 * Décision Romane : Plan floggyz a d'autres bizarreries (Expert sans chrono + 30 sem)
 * mais on NE TOUCHE QUE LA DISTANCE pour ce plan, le reste en backlog.
 *
 * Doctrines :
 *  - feedback_input_client_obligatoire : targetTime / level / cv / paces inchangés
 *  - feedback_jamais_baisser_allure_cible : allures inchangées
 *  - feedback_jamais_poids_minceur : aucune mention poids/IMC/minceur
 *  - feedback_patch_live_plans_jour_seulement : plan créé 2026-05-20, S1 non vécue -> patchable
 *  - feedback_jamais_contact_client : modif silencieuse, aucun message envoyé
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779291643754';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';

function token() {
  return execSync('gcloud auth print-access-token').toString().trim();
}

function fetchDoc() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" "${URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

const NEW_DISTANCE = '10 km';

const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = String(txt).toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      throw new Error(`Mot interdit "${w}" detecte dans ${label}: ${String(txt).slice(0,160)}`);
    }
  }
}

(async () => {
  console.log(`>>> Patch live floggyz (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  assertSafe('NEW_DISTANCE', NEW_DISTANCE);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  // Backup
  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-floggyz-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  const oldDistance = f.distance?.stringValue;
  if (oldDistance !== '36 km') {
    console.warn(`AVERTISSEMENT: distance attendue "36 km", trouvée "${oldDistance}"`);
  }
  f.distance = { stringValue: NEW_DISTANCE };

  console.log(`\n[~] distance`);
  console.log(`  AVANT: ${oldDistance}`);
  console.log(`  APRES: ${NEW_DISTANCE}`);

  // Autres champs immuables - vérification
  console.log(`\n--- Champs préservés (vérif) ---`);
  console.log(`  targetTime:        ${f.targetTime?.stringValue}`);
  console.log(`  durationWeeks:     ${f.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:   ${f.sessionsPerWeek?.integerValue}`);
  console.log(`  vma:               ${f.vma?.doubleValue || f.vma?.integerValue}`);
  console.log(`  confidenceScore:   ${f.confidenceScore?.integerValue}`);
  console.log(`  feasibility.score: ${f.feasibility?.mapValue?.fields?.score?.integerValue}`);

  const body = { fields: { distance: f.distance } };
  const maskQuery = 'updateMask.fieldPaths=distance';
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-floggyz-distance-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-floggyz-${Date.now()}.json`;
  fs.writeFileSync(tmp, JSON.stringify(body));
  const res = execSync(
    `curl -s -X PATCH -H "Authorization: Bearer ${t}" -H "Content-Type: application/json" --data-binary @${tmp} "${patchUrl}"`,
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

  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-floggyz.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  distance:          ${fa.distance?.stringValue}`);
  console.log(`  targetTime:        ${fa.targetTime?.stringValue}`);
  console.log(`  durationWeeks:     ${fa.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:   ${fa.sessionsPerWeek?.integerValue}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
