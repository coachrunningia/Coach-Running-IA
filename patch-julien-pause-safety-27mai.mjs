#!/usr/bin/env node
/**
 * patch-julien-pause-safety-27mai.mjs
 *
 * URGENT — Mise en pause SAFETY du plan desbonnet.julien@gmail.com (1779889214538).
 *
 * Contexte (PM décision 27/05/2026 soir) :
 *   - Profil 46 ans, IMC 31.1 (90kg/1.70m), VMA 9.22 (PB lent 5K=35min, 10K=1h10)
 *   - cv = 7 km/sem, freq = 4
 *   - GOAL = Marathon (1ère expérience) en 22 sem
 *   - Level déclaré : "Intermédiaire" alors que perfs/cv = DÉBUTANT
 *   - feasibility RISQUÉ 45 — plan considéré IRRÉALISTE par Romane après revue
 *   - User a déjà eu accès au plan en preview, a "sonné" (réagi) → mise en sécurité
 *
 * Mécanisme :
 *   - `storageService.ts:239` fait `if (plan.userId !== userId) throw 'Non autorisé'`
 *   - On change `userId` → `_PAUSED_SAFETY_<original>` → front bloque 403
 *   - Admin path `getPlanById(planId, "admin")` continue de fonctionner → Romane garde accès
 *   - On stocke `_originalUserId` + `_pausedAt` + `_pausedReason` pour traçabilité & rollback
 *
 * Doctrines :
 *   - feedback_securite_avant_conversion (sécurité > conversion) ✅
 *   - feedback_jamais_contact_client (blocage silencieux, Romane communique) ✅
 *   - feedback_compromis_messages_preventifs (pause = message préventif fort) ✅
 *   - feedback_input_client_obligatoire : on ne TOUCHE PAS aux inputs user (cv, raceDate,
 *     allures, frequency) — on rend juste le plan inaccessible le temps de l'audit
 *
 * Rollback : exécuter avec ACTION=restore pour remettre l'userId original.
 *
 * Idempotent : si déjà pausé/restauré → log et exit 0.
 *
 * Usage :
 *   - DRY RUN :  node patch-julien-pause-safety-27mai.mjs
 *   - EXEC PAUSE : DRY_RUN=false node patch-julien-pause-safety-27mai.mjs
 *   - EXEC RESTORE : DRY_RUN=false ACTION=restore node patch-julien-pause-safety-27mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779889214538';
const EXPECTED_EMAIL = 'desbonnet.julien@gmail.com';
const ORIGINAL_USER_ID = 'tyJB9FYzhbdKhTyl8rn1l3rAgCI2';
const PAUSE_PREFIX = '_PAUSED_SAFETY_';
const PAUSED_USER_ID = `${PAUSE_PREFIX}${ORIGINAL_USER_ID}`;
const PAUSE_REASON = 'Plan en revue sécurité urgente — IMC 31 + marathon 1ère fois + level incohérent. Audit Expert Coach FFA en cours.';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const ACTION = process.env.ACTION || 'pause'; // 'pause' | 'restore'
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-27mai-soir/backups-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }
function fetchDoc() { return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString()); }

console.log(`>>> Patch SAFETY Julien — action=${ACTION} — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups dans ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan Julien introuvable');

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
    console.log(`\n⏭️  Plan DÉJÀ pausé (userId = ${PAUSED_USER_ID}). Idempotent, exit.`);
    process.exit(0);
  }
  if (currentUserId !== ORIGINAL_USER_ID) {
    throw new Error(`userId inattendu : ${currentUserId}. Manuel requis.`);
  }
  updates.fields.userId = { stringValue: PAUSED_USER_ID };
  updates.fields._originalUserId = { stringValue: ORIGINAL_USER_ID };
  updates.fields._pausedAt = { stringValue: new Date().toISOString() };
  updates.fields._pausedReason = { stringValue: PAUSE_REASON };
  console.log(`\n--- ACTION PAUSE ---`);
  console.log(`  userId           : ${currentUserId} → ${PAUSED_USER_ID}`);
  console.log(`  _pausedReason    : ${PAUSE_REASON}`);
  console.log(`  _pausedAt        : (now ISO)`);
  console.log(`  _originalUserId  : ${ORIGINAL_USER_ID}`);
  console.log(`\n=> Effet : Julien recevra 'Non autorisé' (403) sur /plan/${PLAN_ID}.`);
  console.log(`=> Romane garde accès via admin path (getPlanById(planId, "admin")).`);
} else if (ACTION === 'restore') {
  const orig = f._originalUserId?.stringValue;
  if (!orig) throw new Error('Pas de _originalUserId — restore impossible.');
  if (currentUserId === ORIGINAL_USER_ID) {
    console.log(`\n⏭️  Plan DÉJÀ restauré. Idempotent, exit.`);
    process.exit(0);
  }
  updates.fields.userId = { stringValue: orig };
  updates.fields._originalUserId = { nullValue: null };
  updates.fields._pausedAt = { nullValue: null };
  updates.fields._pausedReason = { nullValue: null };
  console.log(`\n--- ACTION RESTORE ---`);
  console.log(`  userId AVANT : ${currentUserId}`);
  console.log(`  userId APRÈS : ${orig}`);
} else {
  throw new Error(`ACTION inconnue : ${ACTION}. Attendu : 'pause' ou 'restore'.`);
}

if (DRY_RUN) {
  console.log(`\n========== DRY RUN OK ==========`);
  console.log(`Pour exec : DRY_RUN=false ACTION=${ACTION} node patch-julien-pause-safety-27mai.mjs`);
} else {
  const url = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-julien-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify(updates));
  const res = execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80 * 1024 * 1024 }).toString();
  const parsed = JSON.parse(res);
  if (parsed.error) {
    console.error(`\n❌ PATCH FAILED : ${parsed.error.message}`);
    process.exit(1);
  }
  console.log(`\n========== EXEC TERMINÉ ==========`);
  console.log(`✅ PATCH OK -> updateTime: ${parsed.updateTime}`);
  if (ACTION === 'pause') {
    console.log(`\n🔒 Julien ne peut plus charger son plan via URL.`);
    console.log(`   Romane reste full admin (getPlanById(planId, "admin")).`);
    console.log(`\nPour restore après audit : DRY_RUN=false ACTION=restore node patch-julien-pause-safety-27mai.mjs`);
  }
}
