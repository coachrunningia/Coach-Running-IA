#!/usr/bin/env node
/**
 * patch-lilian-10k-live.mjs
 *
 * Patch live Firestore du plan 1779296358366 (Lilian, 10K Débutant)
 *
 * Modifs :
 *  - distance : OK (déjà "10 km") — pas touché
 *  - feasibility.message : retirer "très chargée en volume" (3 séances/sem OK pour débutant)
 *                          retirer "minimum confortable 22 semaines" (ampoule récurrente = frottement,
 *                          pas blessure structurelle nécessitant +2 semaines)
 *  - feasibility.status : RISQUÉ -> AMBITIEUX (ampoule pas blessure structurelle ; 20 sem suffisant 10K Finisher)
 *  - feasibility.score : 30 -> 60
 *  - confidenceScore : 30 -> 60 (cohérence)
 *  - welcomeMessage : "On calibre ta première semaine à 15 km" -> "13 km" (S1 réelle = 2 séances × 6.6 km = 13 km)
 *  - feasibility.safetyWarning : préservé (déjà sobre)
 *
 * Préservés (doctrine) :
 *  - distance, targetTime "Finisher"
 *  - vma, paces (input client)
 *  - durationWeeks = 20, sessionsPerWeek = 3
 *  - weeks (S1 sessions déjà cohérentes 13 km total)
 *  - generationContext.periodizationPlan.weeklyVolumes (déjà cohérents pic 17 ≥ floor 10K 12)
 *
 * Doctrines :
 *  - feedback_jamais_poids_minceur : preflight FORBIDDEN
 *  - feedback_patch_live_plans_jour_seulement
 *  - feedback_jamais_contact_client
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779296358366';
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

const NEW_FEASIBILITY_STATUS = 'AMBITIEUX';
const NEW_FEASIBILITY_SCORE = 60;
const NEW_CONFIDENCE_SCORE = 60;

const NEW_FEASIBILITY_MESSAGE =
  "Ce premier 10 km Finisher est un beau projet. Tu pars de zéro côté course, le plan est calibré sur 20 semaines avec une progression très douce — c'est suffisant pour un objectif Finisher. Côté ampoule récurrente, ce n'est pas une blessure structurelle : pense à des chaussettes techniques sans coutures et des chaussures bien ajustées (lacéage + amorti). Écoute ton corps, sois progressif, et n'hésite pas à raccourcir une séance si besoin.";

// welcomeMessage : on remplace "calibre ta première semaine à 15 km" -> "13 km"
// (et on évite de réécrire tout le message, on fait un remplacement chirurgical)

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
  console.log(`>>> Patch live lilian (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  assertSafe('NEW_FEASIBILITY_MESSAGE', NEW_FEASIBILITY_MESSAGE);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-lilian-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  // Distance OK : on vérifie
  const distance = f.distance?.stringValue;
  console.log(`\n[=] distance (vérif inchangée): "${distance}"`);
  if (distance !== '10 km') {
    console.warn(`  AVERTISSEMENT: distance attendue "10 km", trouvée "${distance}"`);
  }

  // --- feasibility.status / score / message ---
  const feas = f.feasibility?.mapValue?.fields || {};
  const oldStatus = feas.status?.stringValue;
  const oldScore = feas.score?.integerValue;
  const oldMsg = feas.message?.stringValue;

  feas.status = { stringValue: NEW_FEASIBILITY_STATUS };
  feas.score = { integerValue: String(NEW_FEASIBILITY_SCORE) };
  feas.message = { stringValue: NEW_FEASIBILITY_MESSAGE };

  diff('feasibility.status', oldStatus, NEW_FEASIBILITY_STATUS);
  diff('feasibility.score', oldScore, String(NEW_FEASIBILITY_SCORE));
  diff('feasibility.message', oldMsg, NEW_FEASIBILITY_MESSAGE);

  // --- confidenceScore racine ---
  const oldConf = f.confidenceScore?.integerValue;
  f.confidenceScore = { integerValue: String(NEW_CONFIDENCE_SCORE) };
  diff('confidenceScore (root)', oldConf, String(NEW_CONFIDENCE_SCORE));

  // --- welcomeMessage : remplacement chirurgical "15 km" -> "13 km" ---
  const oldWelcome = f.welcomeMessage?.stringValue || '';
  // On cherche la phrase exacte
  let newWelcome = oldWelcome;
  if (oldWelcome.includes('15 km')) {
    newWelcome = oldWelcome.replace('15 km', '13 km');
  } else {
    console.warn('AVERTISSEMENT: "15 km" non trouvé dans welcomeMessage — vérification manuelle requise');
  }
  assertSafe('NEW_WELCOME', newWelcome);
  f.welcomeMessage = { stringValue: newWelcome };
  diff('welcomeMessage (substring 15->13 km)', oldWelcome.slice(0, 400), newWelcome.slice(0, 400));

  console.log(`\n--- Champs préservés ---`);
  console.log(`  distance:                    ${f.distance?.stringValue}`);
  console.log(`  targetTime:                  ${f.targetTime?.stringValue}`);
  console.log(`  vma:                         ${f.vma?.doubleValue || f.vma?.integerValue}`);
  console.log(`  durationWeeks:               ${f.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:             ${f.sessionsPerWeek?.integerValue}`);
  console.log(`  feasibility.safetyWarning:   ${(feas.safetyWarning?.stringValue || '').slice(0,100)}...`);
  console.log(`  feasibility.recommendation:  ${feas.recommendation?.stringValue || '(absent)'}`);

  const body = {
    fields: {
      feasibility:     f.feasibility,
      confidenceScore: f.confidenceScore,
      welcomeMessage:  f.welcomeMessage,
    },
  };
  const fieldPaths = ['feasibility', 'confidenceScore', 'welcomeMessage'];
  const maskQuery = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN. Pour exécuter : DRY_RUN=false node patch-lilian-10k-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-lilian-${Date.now()}.json`;
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
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-lilian.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  distance (inchangé):         ${fa.distance?.stringValue}`);
  console.log(`  feasibility.status:          ${fa.feasibility?.mapValue?.fields?.status?.stringValue}`);
  console.log(`  feasibility.score:           ${fa.feasibility?.mapValue?.fields?.score?.integerValue}`);
  console.log(`  confidenceScore:             ${fa.confidenceScore?.integerValue}`);
  console.log(`  feasibility.message (80c):   ${(fa.feasibility?.mapValue?.fields?.message?.stringValue || '').slice(0,80)}...`);
  console.log(`  welcomeMessage contient "13 km": ${(fa.welcomeMessage?.stringValue || '').includes('13 km')}`);
  console.log(`  welcomeMessage contient "15 km": ${(fa.welcomeMessage?.stringValue || '').includes('15 km')}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
