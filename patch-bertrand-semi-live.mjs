#!/usr/bin/env node
/**
 * patch-bertrand-semi-live.mjs
 *
 * Patch live Firestore du plan 1779292771055 (Bertrand, Semi Finisher)
 *
 * Modifs :
 *  - distance : "14 km" -> "21.1 km (Semi-Marathon)"
 *  - generationContext.periodizationPlan.weeklyVolumes : pic 16 -> 22
 *    Distribution : [15,17,19,15,18,20,16,18,21,17,20,22,17,20,22,17,19,16,11]
 *  - feasibility.message : retirer "très chargée en volume" (faux à 15 km/sem), reformuler cohérent Finisher
 *  - welcomeMessage : INCHANGÉ (audit : "structuré sur 19 semaines pour progression ultra-douce" = OK,
 *    ne dit pas "19 sem c'est long")
 *
 * Préservés (doctrine) :
 *  - targetTime = "Finisher"
 *  - vma, paces
 *  - durationWeeks = 19, sessionsPerWeek = 3
 *  - feasibility.status, feasibility.score, confidenceScore
 *  - feasibility.safetyWarning (mention 51 ans + cardio, déjà bonne)
 *
 * Doctrines :
 *  - feedback_jamais_poids_minceur : preflight FORBIDDEN
 *  - feedback_patch_live_plans_jour_seulement
 *  - feedback_jamais_contact_client
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779292771055';
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

const NEW_DISTANCE = '21.1 km (Semi-Marathon)';

const NEW_WEEKLY_VOLUMES = [15,17,19,15,18,20,16,18,21,17,20,22,17,20,22,17,19,16,11];

const NEW_FEASIBILITY_MESSAGE =
  "Ce semi-marathon est un beau défi Finisher. Avec ta VMA de 9.5 km/h, l'enjeu n'est pas le chrono mais la construction du volume : tu pars de 15 km/sem, le plan monte progressivement jusqu'à 22 km/sem en spécifique. Sur 19 semaines à 3 séances, la régularité prime. À 51 ans, écoute particulièrement tes signaux musculo-squelettiques (tendons, mollets) et n'hésite pas à raccourcir une séance si besoin.";

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

function diff(label, before, after) {
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`\n[${same ? '=' : '~'}] ${label}`);
  if (same) { console.log('    (inchangé)'); return; }
  console.log(`  AVANT: ${JSON.stringify(before).slice(0,400)}`);
  console.log(`  APRES: ${JSON.stringify(after).slice(0,400)}`);
}

(async () => {
  console.log(`>>> Patch live bertrand (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  assertSafe('NEW_DISTANCE', NEW_DISTANCE);
  assertSafe('NEW_FEASIBILITY_MESSAGE', NEW_FEASIBILITY_MESSAGE);

  if (NEW_WEEKLY_VOLUMES.length !== 19) throw new Error(`weeklyVolumes doit faire 19, trouvé ${NEW_WEEKLY_VOLUMES.length}`);
  const peak = Math.max(...NEW_WEEKLY_VOLUMES);
  if (peak < 22) throw new Error(`Pic ${peak} < hard floor Semi 22`);
  console.log(`weeklyVolumes pic: ${peak} (≥ floor 22 OK)`);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-bertrand-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  const oldDistance = f.distance?.stringValue;
  f.distance = { stringValue: NEW_DISTANCE };
  diff('distance', oldDistance, NEW_DISTANCE);

  const pp = f.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
  if (!pp) throw new Error('periodizationPlan absent');
  const oldVols = pp.weeklyVolumes?.arrayValue?.values?.map(v => parseInt(v.integerValue));
  pp.weeklyVolumes = {
    arrayValue: { values: NEW_WEEKLY_VOLUMES.map(v => ({ integerValue: String(v) })) }
  };
  diff('generationContext.periodizationPlan.weeklyVolumes', oldVols, NEW_WEEKLY_VOLUMES);

  const feas = f.feasibility?.mapValue?.fields || {};
  const oldMsg = feas.message?.stringValue;
  feas.message = { stringValue: NEW_FEASIBILITY_MESSAGE };
  diff('feasibility.message', oldMsg, NEW_FEASIBILITY_MESSAGE);

  console.log(`\n--- Champs préservés ---`);
  console.log(`  targetTime:                  ${f.targetTime?.stringValue}`);
  console.log(`  vma:                         ${f.vma?.doubleValue || f.vma?.integerValue}`);
  console.log(`  durationWeeks:               ${f.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:             ${f.sessionsPerWeek?.integerValue}`);
  console.log(`  feasibility.status:          ${feas.status?.stringValue}`);
  console.log(`  feasibility.score:           ${feas.score?.integerValue}`);
  console.log(`  feasibility.safetyWarning (60c): ${(feas.safetyWarning?.stringValue || '').slice(0,80)}...`);
  console.log(`  welcomeMessage (60c):        ${(f.welcomeMessage?.stringValue || '').slice(0,60)}...`);

  const body = {
    fields: {
      distance:          f.distance,
      generationContext: f.generationContext,
      feasibility:       f.feasibility,
    },
  };
  const fieldPaths = ['distance', 'generationContext', 'feasibility'];
  const maskQuery = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN. Pour exécuter : DRY_RUN=false node patch-bertrand-semi-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-bertrand-${Date.now()}.json`;
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
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-bertrand.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  distance:                    ${fa.distance?.stringValue}`);
  const newVols = fa.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => parseInt(v.integerValue));
  console.log(`  weeklyVolumes:               ${JSON.stringify(newVols)} (pic ${Math.max(...newVols)})`);
  console.log(`  feasibility.message (80c):   ${(fa.feasibility?.mapValue?.fields?.message?.stringValue || '').slice(0,80)}...`);
  console.log(`  targetTime (inchangé):       ${fa.targetTime?.stringValue}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
