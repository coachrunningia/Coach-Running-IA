#!/usr/bin/env node
/**
 * patch-margaux-semi-live.mjs
 *
 * Patch live Firestore du plan 1779291819180 (Margaux, Semi 2h20)
 *
 * Modifs :
 *  - distance : "16 km" -> "21.1 km (Semi-Marathon)"
 *  - generationContext.periodizationPlan.weeklyVolumes : recalibré pic 18 -> 25
 *    Distribution : [17,19,21,17,20,22,18,21,24,19,22,25,20,23,25,20,22,18,12]
 *    (ratios linéaires, pic 25 S15, affûtage S17-19 décroissant ; respecte hard floor Semi 22)
 *  - feasibility.message : reformulé (cohérence : gap chrono négatif + bas volume = risque musculo-squelettique)
 *
 * Préservés (doctrine feedback_input_client_obligatoire / feedback_jamais_baisser_allure_cible) :
 *  - targetTime = "2h20"
 *  - vma, paces, allureSpecifiqueSemi
 *  - durationWeeks = 19, sessionsPerWeek = 3
 *  - feasibility.status, feasibility.score, confidenceScore (préservés selon brief : seul message change)
 *  - welcomeMessage (déjà sobre, cite 2h20 = input client OK)
 *
 * Doctrines :
 *  - feedback_jamais_poids_minceur : preflight FORBIDDEN words
 *  - feedback_patch_live_plans_jour_seulement : plan créé 2026-05-20, S1 non vécue -> patchable
 *  - feedback_jamais_contact_client : modif silencieuse
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779291819180';
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

// Distribution selon brief : pic 25 km S15, affûtage S17-19 décroissant
const NEW_WEEKLY_VOLUMES = [17,19,21,17,20,22,18,21,24,19,22,25,20,23,25,20,22,18,12];

const NEW_FEASIBILITY_MESSAGE =
  "Ton objectif 2h20 sur semi est cohérent avec ta VMA de 10.9 km/h (temps théorique ~2h16). Le point d'attention principal n'est pas le chrono mais la charge : ton volume actuel (17 km/sem) est bas pour préparer un semi sereinement. Le plan monte progressivement jusqu'à un pic à 25 km/sem en spécifique — reste à l'écoute des signaux musculo-squelettiques (tendons, mollets, fessiers) et n'hésite pas à raccourcir une séance si besoin. La régularité prime sur le volume.";

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
  console.log(`>>> Patch live margaux (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  assertSafe('NEW_DISTANCE', NEW_DISTANCE);
  assertSafe('NEW_FEASIBILITY_MESSAGE', NEW_FEASIBILITY_MESSAGE);

  // Sanity check weeklyVolumes
  if (NEW_WEEKLY_VOLUMES.length !== 19) throw new Error(`weeklyVolumes doit faire 19, trouvé ${NEW_WEEKLY_VOLUMES.length}`);
  const peak = Math.max(...NEW_WEEKLY_VOLUMES);
  if (peak < 22) throw new Error(`Pic ${peak} < hard floor Semi 22`);
  console.log(`weeklyVolumes pic: ${peak} (≥ floor 22 OK)`);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  // Backup
  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-margaux-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  // --- distance ---
  const oldDistance = f.distance?.stringValue;
  f.distance = { stringValue: NEW_DISTANCE };
  diff('distance', oldDistance, NEW_DISTANCE);

  // --- generationContext.periodizationPlan.weeklyVolumes ---
  const pp = f.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
  if (!pp) throw new Error('periodizationPlan absent');
  const oldVols = pp.weeklyVolumes?.arrayValue?.values?.map(v => parseInt(v.integerValue));
  pp.weeklyVolumes = {
    arrayValue: {
      values: NEW_WEEKLY_VOLUMES.map(v => ({ integerValue: String(v) }))
    }
  };
  diff('generationContext.periodizationPlan.weeklyVolumes', oldVols, NEW_WEEKLY_VOLUMES);

  // --- feasibility.message ---
  const feas = f.feasibility?.mapValue?.fields || {};
  const oldMsg = feas.message?.stringValue;
  feas.message = { stringValue: NEW_FEASIBILITY_MESSAGE };
  diff('feasibility.message', oldMsg, NEW_FEASIBILITY_MESSAGE);

  // --- Champs préservés (vérif) ---
  console.log(`\n--- Champs préservés (input client, doctrine) ---`);
  console.log(`  targetTime:                  ${f.targetTime?.stringValue}`);
  console.log(`  vma:                         ${f.vma?.doubleValue || f.vma?.integerValue}`);
  console.log(`  durationWeeks:               ${f.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:             ${f.sessionsPerWeek?.integerValue}`);
  console.log(`  feasibility.status:          ${feas.status?.stringValue}`);
  console.log(`  feasibility.score:           ${feas.score?.integerValue}`);
  console.log(`  confidenceScore:             ${f.confidenceScore?.integerValue}`);
  console.log(`  paces.allureSpecifiqueSemi:  ${f.paces?.mapValue?.fields?.allureSpecifiqueSemi?.stringValue || '(absent)'}`);
  console.log(`  welcomeMessage (60 chars):   ${(f.welcomeMessage?.stringValue || '').slice(0,60)}...`);

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
    console.log('\n=== DRY RUN (aucune écriture). Pour exécuter : DRY_RUN=false node patch-margaux-semi-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-margaux-${Date.now()}.json`;
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
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-margaux.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  distance:                    ${fa.distance?.stringValue}`);
  const newVols = fa.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => parseInt(v.integerValue));
  console.log(`  weeklyVolumes:               ${JSON.stringify(newVols)} (pic ${Math.max(...newVols)})`);
  console.log(`  feasibility.message (60c):   ${(fa.feasibility?.mapValue?.fields?.message?.stringValue || '').slice(0,80)}...`);
  console.log(`  targetTime (inchangé):       ${fa.targetTime?.stringValue}`);
  console.log(`  feasibility.status (inchangé): ${fa.feasibility?.mapValue?.fields?.status?.stringValue}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
