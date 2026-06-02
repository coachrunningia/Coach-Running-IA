#!/usr/bin/env node
/**
 * patch-paccaud-trail-wording-31mai.mjs
 *
 * URGENT — Fix wording feasibility.message paccaud.bertrand@gmail.com (1779263721331).
 * Trail 16km / 1000m D+ 2h15 — le message dit "Sur marathon" au lieu de neutre/trail.
 *
 * Bug LLM hallucination : template feasibility marathon appliqué à un Trail.
 * À backlog : créer template feasibility Trail-specific avec gestion D+.
 *
 * Ce patch : remplace UNIQUEMENT feasibility.message (les autres champs intacts).
 *
 * Doctrines :
 * - feedback_securite_avant_conversion ✓ (préserve transparence IRRÉALISTE 5)
 * - feedback_chaque_ligne_justifiee ✓ (chaque mot remplacé documenté)
 * - feedback_jamais_baisser_allure_cible ✓ (chrono 2h15 cible immuable)
 *
 * Usage :
 *   DRY RUN : node patch-paccaud-trail-wording-31mai.mjs
 *   EXEC    : DRY_RUN=false node patch-paccaud-trail-wording-31mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779263721331';
const EXPECTED_EMAIL = 'paccaud.bertrand@gmail.com';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-2plans-30mai-backups-paccaud-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

// Nouveau message — remplace "Sur marathon" + ajoute nuance Trail.
// Préserve : chiffres VMA, % VMA, temps théorique, objectif réaliste.
const NEW_MESSAGE = `Ton objectif de 2h15min sur ce trail de 16 km (1000m D+) demande de tenir 95% de ta VMA (12.1 km/h) pendant toute la course. Sur un effort prolongé en montagne, le seuil physiologiquement soutenable est d'environ 88% VMA (référence Daniels VDOT + Pfitzinger), et le dénivelé positif réduit encore la vitesse en sentier. Ton temps théorique est de 2h41min. Un objectif réaliste serait autour de 2h49min, en gardant en tête que les conditions terrain (technicité, météo, fraîcheur) peuvent faire varier ce résultat de ±10 min.`;

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
if (doc.fields.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${doc.fields.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}

const oldFeasibility = doc.fields.feasibility?.mapValue?.fields || {};
const newFeasibility = {
  ...oldFeasibility,
  message: { stringValue: NEW_MESSAGE },
};

const updates = { fields: { feasibility: { mapValue: { fields: newFeasibility } } } };
const updateUrl = `${docUrl}?updateMask.fieldPaths=feasibility`;
const tmp = `/tmp/patch-paccaud-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`>>> Patch PACCAUD feasibility wording — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backup : ${BACKUP_DIR}`);
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ Old message (with bug): ${oldFeasibility.message?.stringValue || ''}`);
console.log(`✓ New message: ${NEW_MESSAGE}`);
console.log(`✓ Preserve: status=${oldFeasibility.status?.stringValue} score=${oldFeasibility.score?.integerValue || oldFeasibility.score?.doubleValue}`);

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-paccaud-trail-wording-31mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
