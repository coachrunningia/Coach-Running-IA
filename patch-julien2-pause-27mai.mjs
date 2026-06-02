#!/usr/bin/env node
/**
 * patch-julien2-pause-27mai.mjs
 *
 * Pause SAFETY du plan #2 Julien (1779892027140) — re-gen post-patch du Plan #1.
 * Même mécanisme que patch-julien-pause-safety-27mai.mjs : userId → _PAUSED_SAFETY_*.
 *
 * Restore après audit FFA + patches : DRY_RUN=false ACTION=restore node ce-script.
 *
 * Doctrines : feedback_securite_avant_conversion + jamais_contact_client.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PLAN_ID = '1779892027140';
const EXPECTED_EMAIL = 'desbonnet.julien@gmail.com';
const ORIGINAL_USER_ID = 'tyJB9FYzhbdKhTyl8rn1l3rAgCI2';
const PAUSE_PREFIX = '_PAUSED_SAFETY_';
const PAUSED_USER_ID = `${PAUSE_PREFIX}${ORIGINAL_USER_ID}`;
const PAUSE_REASON = 'Plan #2 re-gen post-patch admin Plan #1. Contournement safeguards. Audit FFA challenge en cours.';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const ACTION = process.env.ACTION || 'pause';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-julien2-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

console.log(`>>> Pause Julien #2 — DRY_RUN=${DRY_RUN} ACTION=${ACTION}`);
const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) throw new Error('Email mismatch');
const cur = f.userId?.stringValue;
console.log(`userId AVANT: ${cur}`);

const updates = { fields: {} };
const mask = ['userId', '_pausedAt', '_pausedReason', '_originalUserId'];

if (ACTION === 'pause') {
  if (cur === PAUSED_USER_ID) { console.log('Déjà pausé'); process.exit(0); }
  updates.fields.userId = { stringValue: PAUSED_USER_ID };
  updates.fields._originalUserId = { stringValue: ORIGINAL_USER_ID };
  updates.fields._pausedAt = { stringValue: new Date().toISOString() };
  updates.fields._pausedReason = { stringValue: PAUSE_REASON };
  console.log(`userId APRÈS: ${PAUSED_USER_ID}`);
} else if (ACTION === 'restore') {
  const orig = f._originalUserId?.stringValue || ORIGINAL_USER_ID;
  if (cur === ORIGINAL_USER_ID) { console.log('Déjà restauré'); process.exit(0); }
  updates.fields.userId = { stringValue: orig };
  updates.fields._pausedAt = { nullValue: null };
  updates.fields._pausedReason = { nullValue: null };
  updates.fields._originalUserId = { nullValue: null };
  console.log(`userId APRÈS: ${orig}`);
}

if (DRY_RUN) { console.log('DRY RUN OK'); process.exit(0); }

const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
const tmp = `/tmp/patch-julien2-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));
const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
if (res.error) { console.error(res.error.message); process.exit(1); }
console.log(`✅ PATCH OK -> updateTime: ${res.updateTime}`);
