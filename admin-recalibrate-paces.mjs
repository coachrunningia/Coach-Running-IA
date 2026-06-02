#!/usr/bin/env node
/**
 * admin-recalibrate-paces.mjs
 *
 * Script admin one-shot : déclenche le recalibrage des allures pour un plan
 * en utilisant la logique du service `paceRecalibrationService.ts` (portée en JS pur).
 *
 * Utilise les formules `calculateAllPaces` (geminiService.ts:236) :
 * - vmaPace : 100% VMA
 * - seuilPace : 87% VMA
 * - eaPace : 77% VMA
 * - efPace : 67% VMA
 * - recoveryPace : 60% VMA
 * - allureSpecifique5k : 95% VMA
 * - allureSpecifique10k : 90% VMA
 * - allureSpecifiqueSemi : 85% VMA
 * - allureSpecifiqueMarathon : 80% VMA
 *
 * Usage :
 *   DRY  : USER=robine node admin-recalibrate-paces.mjs
 *   EXEC : DRY_RUN=false USER=robine node admin-recalibrate-paces.mjs
 *   USER=lucas idem
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const USERS = {
  robine: {
    planId: '1779898894672',
    email: 'robineregina@gmail.com',
    oldVMA: 8.3,
    newVMA: 10.0,
  },
  lucas: {
    planId: '1779900008615',
    email: 'lucasducharlet@outlook.fr',
    oldVMA: 10.9,
    newVMA: 13.4,
  },
};

const userKey = process.env.USER || 'robine';
const conf = USERS[userKey];
if (!conf) throw new Error(`USER inconnu : ${userKey}`);

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-recalibrate-${userKey}-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${conf.planId}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80*1024*1024 }).toString());

// ──────────────────────────────────────────────
// Port de calculateAllPaces depuis geminiService.ts:236
// ──────────────────────────────────────────────
function secondsToPace(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '0:00';
  let min = Math.floor(seconds / 60);
  let sec = Math.round(seconds % 60);
  if (sec >= 60) { min += 1; sec = 0; }
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function calculateAllPaces(vma) {
  const vmaPaceSeconds = 3600 / vma;
  return {
    vmaPace: secondsToPace(vmaPaceSeconds),
    seuilPace: secondsToPace(3600 / (vma * 0.87)),
    eaPace: secondsToPace(3600 / (vma * 0.77)),
    efPace: secondsToPace(3600 / (vma * 0.67)),
    recoveryPace: secondsToPace(3600 / (vma * 0.60)),
    allureSpecifique5k: secondsToPace(3600 / (vma * 0.95)),
    allureSpecifique10k: secondsToPace(3600 / (vma * 0.90)),
    allureSpecifiqueSemi: secondsToPace(3600 / (vma * 0.85)),
    allureSpecifiqueMarathon: secondsToPace(3600 / (vma * 0.80)),
  };
}

// ──────────────────────────────────────────────
// Port de paceRecalibrationService.ts
// ──────────────────────────────────────────────
function stripUnit(s) {
  return (s || '').replace(/\s*min\s*\/\s*km/i, '').trim();
}

// Doctrine Romane F-17 : gel des allures course objectif si targetTime existe.
// Le plan reste stable côté objectif chrono, on ne touche que les allures d'entraînement.
const TRAINING_KEYS = ['vmaPace', 'seuilPace', 'eaPace', 'efPace', 'recoveryPace'];
const RACE_SPECIFIC_KEYS = ['allureSpecifique5k', 'allureSpecifique10k', 'allureSpecifiqueSemi', 'allureSpecifiqueMarathon'];

function paceToSeconds(p) {
  const m = p.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function secondsToPaceLocal(s) {
  if (!isFinite(s) || s < 0) return null;
  let mm = Math.floor(s / 60);
  let ss = s - mm * 60;
  if (ss >= 60) { mm += 1; ss = 0; }
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function buildPaceSwapMap(oldPaces, newPaces, freezeRaceSpecific) {
  const swap = new Map();
  if (!oldPaces || !newPaces) return swap;
  const keys = freezeRaceSpecific ? TRAINING_KEYS : [...TRAINING_KEYS, ...RACE_SPECIFIC_KEYS];
  for (const k of keys) {
    const oldRaw = oldPaces[k];
    const newRaw = newPaces[k];
    if (typeof oldRaw !== 'string' || typeof newRaw !== 'string') continue;
    const oldVal = stripUnit(oldRaw);
    const newVal = stripUnit(newRaw);
    if (!/^\d{1,2}:[0-5]\d$/.test(oldVal)) continue;
    if (!/^\d{1,2}:[0-5]\d$/.test(newVal)) continue;
    // Tolérance ±1 sec sur la pace OLD (arrondi peut différer entre calc actuel et code prod).
    // On peuple swap pour les 3 variants oldSec-1, oldSec, oldSec+1 → même newVal.
    const oldSec = paceToSeconds(oldVal);
    if (oldSec == null) continue;
    for (const delta of [-1, 0, 1]) {
      const variant = secondsToPaceLocal(oldSec + delta);
      if (variant && /^\d{1,2}:[0-5]\d$/.test(variant) && !swap.has(variant)) {
        swap.set(variant, newVal);
      }
    }
  }
  return swap;
}

const PACE_PATTERNS = [
  /\b(\d{1,2}):([0-5]\d)\s*(?:min\s*)?\/\s*km\b/g,
  /(?:^|[^A-Za-zÀ-ÿ])(à|allure\s*:?)\s+(\d{1,2}):([0-5]\d)\b(?!\s*[:.\/])/g,
  /\((?:allure\s*:\s*)?(\d{1,2}):([0-5]\d)(?:\s+en\s+r[ée]f[ée]rence)?\s*(?:min\s*\/\s*km)?\s*[^)]*\)/g,
];

function recalibrateText(text, swap) {
  if (!text || swap.size === 0) return text || '';
  let result = text;
  for (const pattern of PACE_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const inner = match.match(/(\d{1,2}):([0-5]\d)/);
      if (!inner) return match;
      const old = `${inner[1]}:${inner[2]}`;
      if (!swap.has(old)) return match;
      return match.replace(old, swap.get(old));
    });
  }
  return result;
}

function recalibrateSessionFirestore(sf, oldPaces, newPaces, freezeRaceSpecific) {
  const swap = buildPaceSwapMap(oldPaces, newPaces, freezeRaceSpecific);
  if (swap.size === 0) return { swap: 0, patched: 0 };
  let patched = 0;
  // 1. targetPace
  const tp = sf.targetPace?.stringValue;
  if (tp) {
    const stripped = stripUnit(tp);
    if (swap.has(stripped)) {
      const hadUnit = /min\s*\/\s*km/i.test(tp);
      sf.targetPace = { stringValue: hadUnit ? `${swap.get(stripped)} min/km` : swap.get(stripped) };
      patched++;
    }
  }
  // 2. mainSet
  const ms = sf.mainSet?.stringValue;
  if (ms) {
    const newMs = recalibrateText(ms, swap);
    if (newMs !== ms) {
      sf.mainSet = { stringValue: newMs };
      patched++;
    }
  }
  // 3. warmup
  const wu = sf.warmup?.stringValue;
  if (wu) {
    const newWu = recalibrateText(wu, swap);
    if (newWu !== wu) {
      sf.warmup = { stringValue: newWu };
      patched++;
    }
  }
  // 4. cooldown
  const cd = sf.cooldown?.stringValue;
  if (cd) {
    const newCd = recalibrateText(cd, swap);
    if (newCd !== cd) {
      sf.cooldown = { stringValue: newCd };
      patched++;
    }
  }
  return { swap: swap.size, patched };
}

// ──────────────────────────────────────────────
// EXEC
// ──────────────────────────────────────────────
console.log(`>>> Recalibrage allures ${userKey} — DRY_RUN=${DRY_RUN}`);
console.log(`>>> VMA ${conf.oldVMA} → ${conf.newVMA} (ratio ${(conf.newVMA/conf.oldVMA).toFixed(3)})`);

const oldPaces = calculateAllPaces(conf.oldVMA);
const newPaces = calculateAllPaces(conf.newVMA);

// Détection targetTime sur ce plan → gel des allures course (D1)
const docPeek = fetchDoc();
const targetTimeField = docPeek.fields?.generationContext?.mapValue?.fields?.questionnaireSnapshot?.mapValue?.fields?.targetTime?.stringValue;
const hasTargetTime = !!targetTimeField && targetTimeField !== '?' && targetTimeField !== '';
const FREEZE_RACE = hasTargetTime;
console.log(`>>> targetTime user : ${targetTimeField || '(absent)'} → freezeRaceSpecificPaces=${FREEZE_RACE}`);

console.log(`\n--- Paces calculées ---`);
console.log(`            OLD VMA ${conf.oldVMA}        NEW VMA ${conf.newVMA}`);
for (const k of Object.keys(oldPaces)) {
  console.log(`  ${k.padEnd(28)} ${oldPaces[k].padEnd(8)}   →   ${newPaces[k]}`);
}

const doc = fetchDoc();
writeFileSync(`${BACKUP_DIR}/${conf.planId}-before.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== conf.email) throw new Error('Email mismatch');

// Update VMA dans generationContext
const gc = f.generationContext?.mapValue?.fields;
if (gc?.vma) {
  gc.vma = { doubleValue: conf.newVMA };
  console.log(`\ngenerationContext.vma : ${conf.newVMA}`);
}

// ──────────────────────────────────────────────
// V1 Romane : filter `date >= today`
// On ne touche QUE les sessions à partir d'aujourd'hui. Doctrine
// `feedback_patch_live_plans_jour_seulement` — les séances déjà passées
// (faites par le user avec leur ancienne allure) restent figées.
// ──────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);
const planStartDateStr = f.startDate?.stringValue || '';
const planStartDate = planStartDateStr ? new Date(planStartDateStr + 'T00:00:00') : null;
const DAY_TO_INDEX = { 'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3, 'Vendredi': 4, 'Samedi': 5, 'Dimanche': 6 };
console.log(`\n>>> Filter date : ne patche QUE les sessions >= ${today.toISOString().split('T')[0]} (today)`);
console.log(`>>> Plan startDate : ${planStartDateStr || '(absent)'}`);

function resolveSessionDate(sf, weekNumber) {
  // dateOverride prioritaire (cf. types.ts:dateOverride)
  const override = sf.dateOverride?.stringValue;
  if (override) return new Date(override + 'T00:00:00');
  if (!planStartDate) return null;
  const dayIdx = DAY_TO_INDEX[sf.day?.stringValue] ?? 0;
  const d = new Date(planStartDate);
  d.setDate(d.getDate() + (weekNumber - 1) * 7 + dayIdx);
  return d;
}

// Update sessions — filter par date
const weeks = f.weeks?.arrayValue?.values || [];
console.log(`\n${weeks.length} semaine(s) — application recalibrage :`);
let totalSwap = 0;
let totalPatched = 0;
let totalSessions = 0;
let totalSkippedPast = 0;
for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
  const weekNumber = parseInt(weeks[wIdx].mapValue.fields.weekNumber?.integerValue || (wIdx + 1));
  const sessions = weeks[wIdx].mapValue.fields.sessions?.arrayValue?.values || [];
  let weekPatched = 0;
  let weekSkippedPast = 0;
  for (const s of sessions) {
    const sf = s.mapValue.fields;
    totalSessions++;
    const sessionDate = resolveSessionDate(sf, weekNumber);
    if (sessionDate && sessionDate < today) {
      weekSkippedPast++;
      totalSkippedPast++;
      continue; // séance passée → on ne touche pas
    }
    const res = recalibrateSessionFirestore(sf, oldPaces, newPaces, FREEZE_RACE);
    totalSwap = Math.max(totalSwap, res.swap);
    totalPatched += res.patched;
    if (res.patched > 0) weekPatched++;
  }
  if (wIdx < 3 || weekPatched > 0 || weekSkippedPast > 0) {
    console.log(`  S${wIdx+1} : ${weekPatched}/${sessions.length} patchées, ${weekSkippedPast} séances passées (skip)`);
  }
}
console.log(`\nTOTAL : ${totalPatched} champs patchés / ${totalSessions} sessions (${totalSkippedPast} séances passées préservées, swap ${totalSwap} paces)`);

// ──────────────────────────────────────────────
// Welcome enrichi (1 phrase ajoutée en TÊTE, le reste reste valide)
// V1 simplifié Romane : pas de bouton rollback, juste invitation contact chat coach.
// ──────────────────────────────────────────────
const oldWelcome = f.welcomeMessage?.stringValue || '';
const noticePrefix = `📊 Tes allures ont été mises à jour suite au changement de ta VMA (${conf.oldVMA} → ${conf.newVMA} km/h, +${Math.round(((conf.newVMA/conf.oldVMA)-1)*100)}%).${FREEZE_RACE ? ' Ton allure course objectif reste inchangée pour préserver la stabilité de ton plan.' : ''} Si les allures ne te conviennent pas suite à ce changement, contacte le coach dans le chat.

`;
// Évite double-injection si script ré-exécuté
if (!oldWelcome.startsWith('📊 Tu as ajusté ta VMA')) {
  f.welcomeMessage = { stringValue: noticePrefix + oldWelcome };
  console.log(`\nwelcomeMessage : +${noticePrefix.length} chars phrase ajustement VMA ajoutée en tête`);
}

// ──────────────────────────────────────────────
// Compteur _paceRecalibrationCount (max 4/plan, doctrine F-17)
// ──────────────────────────────────────────────
const currentCount = parseInt(f._paceRecalibrationCount?.integerValue || '0', 10);
const newCount = currentCount + 1;
f._paceRecalibrationCount = { integerValue: newCount };
f._lastRecalibratedAt = { stringValue: new Date().toISOString() };
console.log(`_paceRecalibrationCount : ${currentCount} → ${newCount} (max 4 doctrine F-17)`);
if (newCount > 4) {
  console.warn(`⚠️  Compteur > 4 : devrait être bloqué côté UI en production`);
}

const mask = ['generationContext', 'weeks', 'welcomeMessage', '_paceRecalibrationCount', '_lastRecalibratedAt'];

if (DRY_RUN) {
  writeFileSync(`${BACKUP_DIR}/${conf.planId}-proposed.json`, JSON.stringify({ fields: f }, null, 2));
  console.log(`\nDRY RUN OK. Pour exec : DRY_RUN=false USER=${userKey} node admin-recalibrate-paces.mjs`);
  console.log(`Proposed dump : ${BACKUP_DIR}/${conf.planId}-proposed.json`);
} else {
  const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/recalibrate-${userKey}-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: f }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) { console.error(res.error.message); process.exit(1); }
  console.log(`\n✅ PATCH OK -> updateTime: ${res.updateTime}`);
  console.log(`🟢 ${userKey} : ${totalPatched} champs allures recalibrés sur VMA ${conf.newVMA}`);
}
