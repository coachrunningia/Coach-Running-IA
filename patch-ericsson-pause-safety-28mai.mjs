#!/usr/bin/env node
/**
 * patch-ericsson-pause-safety-28mai.mjs
 *
 * URGENT — Mise en pause SAFETY du plan ericsson777@hotmail.com (1779998376847).
 *
 * Contexte (Romane décision 28/05/2026 ~22h30) :
 *   - Plan Marathon 3h20 sur 24 sem, généré 19:59:37 (28/05)
 *   - Profil 50 ans, VMA 15.7 (Expert), VMA source "Semi 1h31 + Marathon 3h35"
 *   - feasibility EXCELLENT 98% (cohérent VMA-based)
 *   - Volume pic ~90 km/sem (cohérent Marathon Expert)
 *   - 🚨 BUG STRUCTUREL : S1 = 1 séance (Footing 14.6 km) alors que S2-S24 = 6 séances/sem
 *
 * Causes suspectées (à creuser) :
 *   - Plan créé 1h après déploiement F-18 (18:50, MIN_WEEKLY_VOLUME + garde-fou pic 95% +
 *     rate cap 20%). F-18 a pu cascader effets sur le LLM (volume S1 calculé énorme, LLM
 *     halluciné 1 séance pour absorber tout dans un footing).
 *   - F-11 (migration Gemini 3.1 pro preview) : régression structure S1 possible.
 *   - À investiguer en profondeur (agent debug en cours).
 *
 * Mécanisme pause :
 *   - `storageService.ts:239` fait `if (plan.userId !== userId) throw 'Non autorisé'`
 *   - On change `userId` → `_PAUSED_SAFETY_<original>` → front bloque 403
 *   - Stockage `_originalUserId` + `_pausedAt` + `_pausedReason` pour traçabilité & rollback
 *
 * Doctrines :
 *   - feedback_securite_avant_conversion (sécurité > conversion) ✅
 *   - feedback_jamais_contact_client (blocage silencieux, Romane communique) ✅
 *   - feedback_patch_live_plans_jour_seulement : OK (plan créé aujourd'hui)
 *
 * Rollback : ACTION=restore pour remettre l'userId original.
 *
 * Usage :
 *   - DRY RUN  : node patch-ericsson-pause-safety-28mai.mjs
 *   - EXEC PAUSE   : DRY_RUN=false node patch-ericsson-pause-safety-28mai.mjs
 *   - EXEC RESTORE : DRY_RUN=false ACTION=restore node patch-ericsson-pause-safety-28mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779998376847';
const EXPECTED_EMAIL = 'ericsson777@hotmail.com';
const ORIGINAL_USER_ID = 'iDawDSv2qWgpJZicGSLzXy7VBXS2';
const PAUSE_PREFIX = '_PAUSED_SAFETY_';
const PAUSED_USER_ID = `${PAUSE_PREFIX}${ORIGINAL_USER_ID}`;
const PAUSE_REASON = 'Plan Marathon 3h20 — S1 = 1 séance vs S2-S24 = 6 séances (anomalie structure). Causes potentielles F-18 cascade ou F-11 Gemini 3.1 migration. Investigation Coach + PM en cours.';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const ACTION = process.env.ACTION || 'pause'; // 'pause' | 'restore'
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-bug-s1-1seance-28mai-backups-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }
function fetchDoc() { return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString()); }

console.log(`>>> Patch SAFETY ericsson — action=${ACTION} — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups dans ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan ericsson introuvable');

writeFileSync(`${BACKUP_DIR}/${PLAN_ID}.json`, JSON.stringify(doc, null, 2));
console.log(`>>> Backup OK`);

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ updateTime avant : ${doc.updateTime}`);

const currentUserId = f.userId?.stringValue;
console.log(`✓ userId AVANT : ${currentUserId}`);

const updateMask = ['userId', '_pausedAt', '_pausedReason', '_originalUserId'];
const updates = { fields: {} };

if (ACTION === 'pause') {
  if (currentUserId === PAUSED_USER_ID) {
    console.log(`>>> Plan DÉJÀ pausé (userId=${currentUserId}). Idempotent : exit 0.`);
    process.exit(0);
  }
  if (currentUserId !== ORIGINAL_USER_ID) {
    throw new Error(`userId actuel inattendu : ${currentUserId} ≠ ${ORIGINAL_USER_ID}`);
  }
  updates.fields.userId = { stringValue: PAUSED_USER_ID };
  updates.fields._originalUserId = { stringValue: ORIGINAL_USER_ID };
  updates.fields._pausedAt = { timestampValue: new Date().toISOString() };
  updates.fields._pausedReason = { stringValue: PAUSE_REASON };
} else if (ACTION === 'restore') {
  if (currentUserId === ORIGINAL_USER_ID) {
    console.log(`>>> Plan DÉJÀ restauré (userId=${currentUserId}). Idempotent : exit 0.`);
    process.exit(0);
  }
  if (currentUserId !== PAUSED_USER_ID) {
    throw new Error(`userId actuel inattendu pour restore : ${currentUserId}`);
  }
  updates.fields.userId = { stringValue: ORIGINAL_USER_ID };
  updates.fields._originalUserId = { stringValue: '' };
  updates.fields._pausedAt = { stringValue: '' };
  updates.fields._pausedReason = { stringValue: '' };
}

const updateUrl = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
const tmp = `/tmp/patch-ericsson-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`>>> PATCH URL : ${updateUrl}`);
console.log(`>>> PATCH BODY :`);
console.log(JSON.stringify(updates, null, 2));

if (DRY_RUN) {
  console.log(`>>> DRY RUN — pas d'écriture.`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(res.error.message);
console.log(`✅ PATCH OK — updateTime: ${res.updateTime}`);
console.log(`✅ userId APRÈS : ${res.fields?.userId?.stringValue}`);
