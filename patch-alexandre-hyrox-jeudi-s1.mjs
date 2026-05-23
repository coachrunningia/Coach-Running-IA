#!/usr/bin/env node
/**
 * patch-alexandre-hyrox-jeudi-s1.mjs
 *
 * Patch live Firestore du plan 1779381807357 (Alexandre, Hyrox 19 sem).
 *
 * BUG (audit 2026-05-21) :
 *   Jeudi S1 : mainSet "12 reps (1 min de course à 9:15 + 2 min de marche)"
 *   → type "Sortie Longue" (mal typé par Gemini, "de" intercalé contourne regex)
 *   → distance 3.2 km / targetPace 10:20 incohérents.
 *
 * FIX live (avant Fix B code en prod) :
 *   - type: "Sortie Longue" → "Marche/Course"
 *   - distance: "3.2 km" → "5.0 km"
 *   - targetPace: "10:20" → "9:15" (allure dominante du mainSet)
 *   - mainSet, warmup, cooldown, duration : conservés tels quels
 *
 * Doctrine :
 *   - feedback_patch_live_plans_jour_seulement : S1 commence 25/05, plan
 *     créé 21/05 16h43 → preview vu mais S1 PAS vécue → patchable.
 *   - feedback_input_client_obligatoire : allure/cv/vma/objectif inchangés.
 *   - feedback_jamais_contact_client : silencieux.
 *
 * Scope strict (feedback_scope_strict) : SEUL Jeudi S1 patché.
 *   Dimanche S1 a même bug (type "Sortie Longue" + mainSet marche-course)
 *   mais NON inclus dans la mission. Voir SPRINT-FIX-B-MARCHE-COURSE.md.
 *
 * Usage : DRY_RUN=false node patch-alexandre-hyrox-jeudi-s1.mjs
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779381807357';
const DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const URL = `https://firestore.googleapis.com/v1/${DOC_PATH}`;
const DRY_RUN = process.env.DRY_RUN !== 'false';

function token() {
  return execSync('gcloud auth print-access-token').toString().trim();
}

function fetchDoc() {
  const t = token();
  const out = execSync(`curl -s -H "Authorization: Bearer ${t}" "${URL}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
  return JSON.parse(out);
}

function diff(label, before, after) {
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) { console.log('    (inchangé)'); return; }
  console.log(`  AVANT: ${JSON.stringify(before).slice(0, 300)}`);
  console.log(`  APRES: ${JSON.stringify(after).slice(0, 300)}`);
}

// Preflight anti-poids (doctrine feedback_jamais_poids_minceur)
const FORBIDDEN = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = String(txt).toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) throw new Error(`Mot interdit "${w}" dans ${label}: ${String(txt).slice(0, 160)}`);
  }
}

(async () => {
  console.log(`>>> Patch Alexandre Hyrox Jeudi S1 (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  // Backup obligatoire
  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-alexandre-hyrox-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  // Localiser Jeudi S1
  const weeks = f.weeks?.arrayValue?.values || [];
  if (weeks.length === 0) throw new Error('weeks vide.');
  const s1Sessions = weeks[0]?.mapValue?.fields?.sessions?.arrayValue?.values || [];
  if (s1Sessions.length === 0) throw new Error('S1 sans sessions.');

  let jeudiIdx = -1;
  for (let i = 0; i < s1Sessions.length; i++) {
    const sess = s1Sessions[i]?.mapValue?.fields;
    if (sess?.day?.stringValue === 'Jeudi') { jeudiIdx = i; break; }
  }
  if (jeudiIdx === -1) throw new Error('Jeudi S1 introuvable.');

  const jeudi = s1Sessions[jeudiIdx].mapValue.fields;

  // Vérifs préalables (cible attendue : type=Sortie Longue, distance=3.2 km, targetPace=10:20)
  const oldType = jeudi.type?.stringValue;
  const oldDistance = jeudi.distance?.stringValue;
  const oldTargetPace = jeudi.targetPace?.stringValue;
  const oldMainSet = jeudi.mainSet?.stringValue;
  const oldDuration = jeudi.duration?.stringValue;

  console.log('\n--- Avant patch (Jeudi S1) ---');
  console.log(`  type:        ${oldType}`);
  console.log(`  distance:    ${oldDistance}`);
  console.log(`  targetPace:  ${oldTargetPace}`);
  console.log(`  duration:    ${oldDuration}`);
  console.log(`  mainSet:     ${oldMainSet?.slice(0, 200)}`);

  // Garde-fou : refuse de patcher si déjà patché ou si état inattendu
  if (oldType === 'Marche/Course') {
    console.log('\n[!] Jeudi déjà type=Marche/Course → rien à faire.');
    process.exit(0);
  }
  if (oldType !== 'Sortie Longue') {
    throw new Error(`État inattendu : type Jeudi = "${oldType}" (attendu "Sortie Longue").`);
  }
  if (!oldMainSet || !/course/i.test(oldMainSet) || !/marche/i.test(oldMainSet)) {
    throw new Error('mainSet Jeudi ne contient pas course/marche → état inattendu, abort.');
  }

  // Préflight contenu (mainSet conservé tel quel mais on vérifie quand même)
  assertSafe('mainSet Jeudi (préservé)', oldMainSet);

  // Appliquer les 3 modifs
  const NEW_TYPE = 'Marche/Course';
  const NEW_DISTANCE = '5.0 km';
  const NEW_TARGETPACE = '9:15';

  jeudi.type = { stringValue: NEW_TYPE };
  jeudi.distance = { stringValue: NEW_DISTANCE };
  jeudi.targetPace = { stringValue: NEW_TARGETPACE };

  diff('Jeudi S1 type', oldType, NEW_TYPE);
  diff('Jeudi S1 distance', oldDistance, NEW_DISTANCE);
  diff('Jeudi S1 targetPace', oldTargetPace, NEW_TARGETPACE);
  diff('Jeudi S1 mainSet (préservé)', oldMainSet?.slice(0, 80), oldMainSet?.slice(0, 80));
  diff('Jeudi S1 duration (préservé)', oldDuration, oldDuration);

  // Build patch (updateMask = weeks seulement)
  const body = { fields: { weeks: f.weeks } };
  const patchUrl = `${URL}?updateMask.fieldPaths=weeks`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN. Pour exécuter : DRY_RUN=false node patch-alexandre-hyrox-jeudi-s1.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-alexandre-${Date.now()}.json`;
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

  // Re-fetch + vérif
  const after = fetchDoc();
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-alexandre-hyrox.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  const jeudiAfter = fa.weeks?.arrayValue?.values?.[0]?.mapValue?.fields?.sessions?.arrayValue?.values?.[jeudiIdx]?.mapValue?.fields;
  console.log('\n--- POST-PATCH VERIF (Jeudi S1) ---');
  console.log(`  type:        ${jeudiAfter?.type?.stringValue}        (attendu Marche/Course)`);
  console.log(`  distance:    ${jeudiAfter?.distance?.stringValue}       (attendu 5.0 km)`);
  console.log(`  targetPace:  ${jeudiAfter?.targetPace?.stringValue}        (attendu 9:15)`);
  console.log(`  duration:    ${jeudiAfter?.duration?.stringValue}        (inchangé)`);
  console.log(`  mainSet OK:  ${(jeudiAfter?.mainSet?.stringValue || '').includes('1 min de course')}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
