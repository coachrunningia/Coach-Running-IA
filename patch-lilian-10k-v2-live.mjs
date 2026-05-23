#!/usr/bin/env node
/**
 * patch-lilian-10k-v2-live.mjs
 *
 * Patch live Firestore V2 du plan 1779296358366 (Lilian, 10K Débutant 20 sem).
 * Suite au patch V1 (feasibility + welcomeMessage "15->13 km"), 3 modifs résiduelles :
 *
 *  1) S1 séances course : duration "1h00" / distance "6.6 km" -> "45 min" / "4 km"
 *     - mainSet ajusté en cohérence (marche-course raccourci)
 *     - cible : Mardi (s1-1) + Dimanche (s3-1). Jeudi = renfo, non touché.
 *  2) weeklyVolumes : pic 17 -> 22 (progression linéaire 13 -> 22, affûtage en S19/S20)
 *     - longueur 20 (confirmée par dump V1)
 *  3) welcomeMessage : réécriture cohérente (45 min / 4 km / pic 22 / honnête débutant)
 *
 * Préservés (doctrine) :
 *  - distance "10 km", targetTime "Finisher"
 *  - vma=11, paces (input client), cv=0
 *  - durationWeeks=20, sessionsPerWeek=3
 *  - phases, recoveryWeeks (inchangés)
 *  - feasibility (déjà patché V1)
 *  - confidenceScore=60 (V1)
 *  - level "Débutant (0-1 an)", questionnaireSnapshot
 *
 * Doctrines :
 *  - feedback_jamais_poids_minceur : preflight FORBIDDEN
 *  - feedback_input_client_obligatoire : cv/vma/paces/targetTime inchangés
 *  - feedback_jamais_baisser_allure_cible : targetTime "Finisher" inchangé
 *  - feedback_patch_live_plans_jour_seulement : S1 = pas vécue (preview), OK
 *  - feedback_jamais_contact_client : silencieux
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

// --- Nouveaux contenus ---

// S1 séances course : 45 min / 4 km marche-course
// Avant : 8 répétitions (Mardi) ou 10 répétitions (Dimanche) de 1 min course / 2 min marche
// Après : on raccourcit à 6 répétitions (1 min course / 2 min marche = 18 min) + warmup/cooldown plus courts
//         => total ~45 min, ~4 km parcourus (course + marche).
const NEW_S1_DURATION = '45 min';
const NEW_S1_DISTANCE = '4 km';

const NEW_S1_MARDI_WARMUP =
  '5 min de marche à 9:05 min/km';
const NEW_S1_MARDI_MAINSET =
  "Bloc de 6 répétitions composé de 1 min de course légère à allure EF (8:08 min/km) suivie de 2 min de marche active pour la récupération. Travaille ta posture bien droite.";
const NEW_S1_MARDI_COOLDOWN =
  '5 min de retour au calme en marche + étirements';

const NEW_S1_DIMANCHE_WARMUP =
  '5 min de marche à 9:05 min/km progressive';
const NEW_S1_DIMANCHE_MAINSET =
  "Réalise 6 répétitions de 1 min de course légère à allure EF (8:08 min/km) alternées avec 2 min de marche active. Le but est de maintenir une conversation sans être essoufflé.";
const NEW_S1_DIMANCHE_COOLDOWN =
  '5 min de retour au calme en marche + étirements';

// weeklyVolumes : longueur 20, progression 13 -> pic 22 en S18, affûtage S19/S20
// Phases : fond(1-3) recup(4) fond(5-6) recup(7) dev(8-9) recup(10) dev(11-12) recup(13)
//          spe(14-15) recup(16) spe(17-18) recup(19) affut(20)
// Recup weeks (4,7,10,13,16,19) = volume plus bas que voisines.
const NEW_WEEKLY_VOLUMES = [
  13, 14, 15,    // fond S1-3 (S1=13 = 2 séances × 4 km course + ~5 km marche, OK)
  12,            // recup S4
  16, 17,        // fond S5-6
  14,            // recup S7
  18, 19,        // dev S8-9
  15,            // recup S10
  19, 20,        // dev S11-12
  16,            // recup S13
  20, 21,        // spe S14-15
  16,            // recup S16
  21, 22,        // spe S17-18 (PIC S18 = 22)
  14,            // recup S19 (affûtage commencé)
  10,            // affut S20 (semaine course)
];
if (NEW_WEEKLY_VOLUMES.length !== 20) {
  throw new Error(`NEW_WEEKLY_VOLUMES length must be 20, got ${NEW_WEEKLY_VOLUMES.length}`);
}

// welcomeMessage réécrit
const NEW_WELCOME =
  "Bienvenue dans ton programme de préparation pour ton premier 10 km. L'objectif est de te faire franchir la ligne d'arrivée avec plaisir et sans douleur. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. Tu nous as indiqué 0 km/semaine actuels : on démarre très progressivement avec des séances courtes de marche-course (45 min, environ 4 km) en S1, le temps que ton corps s'adapte sans risque. La progression sur 20 semaines te mènera à un pic d'entraînement autour de 22 km/semaine en S18, avant l'affûtage final. Concernant ton ampoule récurrente, le plan adapte la progression pour limiter les frictions ; pense à des chaussettes techniques sans coutures et des chaussures bien ajustées.";

// --- Preflight ---
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
  console.log(`>>> Patch live lilian V2 (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);

  // Preflight sur tous les nouveaux contenus textuels
  assertSafe('NEW_S1_MARDI_MAINSET', NEW_S1_MARDI_MAINSET);
  assertSafe('NEW_S1_DIMANCHE_MAINSET', NEW_S1_DIMANCHE_MAINSET);
  assertSafe('NEW_S1_MARDI_WARMUP', NEW_S1_MARDI_WARMUP);
  assertSafe('NEW_S1_DIMANCHE_WARMUP', NEW_S1_DIMANCHE_WARMUP);
  assertSafe('NEW_S1_MARDI_COOLDOWN', NEW_S1_MARDI_COOLDOWN);
  assertSafe('NEW_S1_DIMANCHE_COOLDOWN', NEW_S1_DIMANCHE_COOLDOWN);
  assertSafe('NEW_WELCOME', NEW_WELCOME);

  const doc = fetchDoc();
  if (!doc.fields) throw new Error('Document introuvable.');
  const f = doc.fields;

  const backupPath = `/Users/romanemarino/Coach-Running-IA/backup-lilian-v2-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(doc, null, 2));
  console.log(`Backup -> ${backupPath}`);

  // --- 1. S1 séances course ---
  const weeks = f.weeks?.arrayValue?.values || [];
  if (weeks.length === 0) throw new Error('weeks vide.');
  const s1 = weeks[0]?.mapValue?.fields;
  const s1Sessions = s1?.sessions?.arrayValue?.values || [];
  if (s1Sessions.length < 3) throw new Error(`S1 doit avoir 3 sessions, trouvé ${s1Sessions.length}`);

  // Identifier les séances course (type "Sortie Longue" ou autre type course, pas "Renforcement")
  let courseCount = 0;
  for (let i = 0; i < s1Sessions.length; i++) {
    const sess = s1Sessions[i]?.mapValue?.fields;
    if (!sess) continue;
    const sType = sess.type?.stringValue || '';
    const sDay = sess.day?.stringValue || '';
    if (sType === 'Renforcement') {
      console.log(`  [=] S1 session #${i} (${sDay}, ${sType}) — non touchée`);
      continue;
    }
    // Vérifier que c'est bien une séance avec marche-course (mainSet contient "marche")
    const oldMainSet = sess.mainSet?.stringValue || '';
    if (!oldMainSet.toLowerCase().includes('marche')) {
      console.log(`  [!] S1 session #${i} (${sDay}, ${sType}) — pas de marche-course détectée, on saute`);
      continue;
    }
    const oldDuration = sess.duration?.stringValue;
    const oldDistance = sess.distance?.stringValue;
    const oldWarmup = sess.warmup?.stringValue;
    const oldCooldown = sess.cooldown?.stringValue;

    // Choisir le nouveau contenu selon le jour (Mardi vs Dimanche)
    const isDimanche = sDay === 'Dimanche';
    const newMainSet = isDimanche ? NEW_S1_DIMANCHE_MAINSET : NEW_S1_MARDI_MAINSET;
    const newWarmup = isDimanche ? NEW_S1_DIMANCHE_WARMUP : NEW_S1_MARDI_WARMUP;
    const newCooldown = isDimanche ? NEW_S1_DIMANCHE_COOLDOWN : NEW_S1_MARDI_COOLDOWN;

    sess.duration = { stringValue: NEW_S1_DURATION };
    sess.distance = { stringValue: NEW_S1_DISTANCE };
    sess.mainSet = { stringValue: newMainSet };
    sess.warmup = { stringValue: newWarmup };
    sess.cooldown = { stringValue: newCooldown };

    diff(`S1 #${i} ${sDay} duration`, oldDuration, NEW_S1_DURATION);
    diff(`S1 #${i} ${sDay} distance`, oldDistance, NEW_S1_DISTANCE);
    diff(`S1 #${i} ${sDay} mainSet`, oldMainSet.slice(0,160), newMainSet.slice(0,160));
    diff(`S1 #${i} ${sDay} warmup`, oldWarmup, newWarmup);
    diff(`S1 #${i} ${sDay} cooldown`, oldCooldown, newCooldown);
    courseCount++;
  }
  console.log(`\n>>> ${courseCount} séances course S1 modifiées (attendu : 2)`);

  // --- 2. weeklyVolumes ---
  const gc = f.generationContext?.mapValue?.fields;
  const pp = gc?.periodizationPlan?.mapValue?.fields;
  const oldVolumes = (pp?.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue, 10));
  if (oldVolumes.length !== 20) {
    console.warn(`AVERTISSEMENT: weeklyVolumes length=${oldVolumes.length} (attendu 20)`);
  }
  const newVolumesValues = NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: String(n) }));
  pp.weeklyVolumes = { arrayValue: { values: newVolumesValues } };
  diff('weeklyVolumes', oldVolumes, NEW_WEEKLY_VOLUMES);
  console.log(`  Pic ancien: ${Math.max(...oldVolumes)} km`);
  console.log(`  Pic nouveau: ${Math.max(...NEW_WEEKLY_VOLUMES)} km`);

  // --- 3. welcomeMessage ---
  const oldWelcome = f.welcomeMessage?.stringValue || '';
  f.welcomeMessage = { stringValue: NEW_WELCOME };
  diff('welcomeMessage', oldWelcome.slice(0, 400), NEW_WELCOME.slice(0, 400));

  // --- Vérifs préservation ---
  console.log(`\n--- Champs préservés (doctrine) ---`);
  console.log(`  distance:                    ${f.distance?.stringValue}`);
  console.log(`  targetTime:                  ${f.targetTime?.stringValue}`);
  console.log(`  vma:                         ${f.vma?.doubleValue || f.vma?.integerValue}`);
  console.log(`  durationWeeks:               ${f.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek:             ${f.sessionsPerWeek?.integerValue}`);
  console.log(`  feasibility.status:          ${f.feasibility?.mapValue?.fields?.status?.stringValue}`);
  console.log(`  feasibility.score:           ${f.feasibility?.mapValue?.fields?.score?.integerValue}`);
  console.log(`  confidenceScore:             ${f.confidenceScore?.integerValue}`);
  console.log(`  paces.efPace:                ${f.paces?.mapValue?.fields?.efPace?.stringValue}`);

  // Build patch body
  const body = {
    fields: {
      weeks:             f.weeks,
      generationContext: f.generationContext,
      welcomeMessage:    f.welcomeMessage,
    },
  };
  const fieldPaths = ['weeks', 'generationContext', 'welcomeMessage'];
  const maskQuery = fieldPaths.map(p => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  const patchUrl = `${URL}?${maskQuery}`;

  if (DRY_RUN) {
    console.log('\n=== DRY RUN. Pour exécuter : DRY_RUN=false node patch-lilian-10k-v2-live.mjs ===');
    return;
  }

  const t = token();
  const tmp = `/tmp/patch-lilian-v2-${Date.now()}.json`;
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
  const outFile = '/Users/romanemarino/Coach-Running-IA/post-patch-lilian-v2.json';
  fs.writeFileSync(outFile, JSON.stringify(after, null, 2));
  console.log(`Dump post-patch -> ${outFile}`);

  const fa = after.fields;
  const s1AfterSessions = fa.weeks?.arrayValue?.values?.[0]?.mapValue?.fields?.sessions?.arrayValue?.values || [];
  const courseSessionsAfter = s1AfterSessions
    .map(s => s?.mapValue?.fields)
    .filter(s => s && s.type?.stringValue !== 'Renforcement');
  const volumesAfter = (fa.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values || [])
    .map(v => parseInt(v.integerValue, 10));

  console.log('\n--- POST-PATCH VERIF ---');
  console.log(`  distance (inchangé):              ${fa.distance?.stringValue}`);
  console.log(`  targetTime (inchangé):            ${fa.targetTime?.stringValue}`);
  console.log(`  vma (inchangé):                   ${fa.vma?.integerValue}`);
  console.log(`  durationWeeks (inchangé):         ${fa.durationWeeks?.integerValue}`);
  console.log(`  sessionsPerWeek (inchangé):       ${fa.sessionsPerWeek?.integerValue}`);
  console.log(`  feasibility.score (inchangé):     ${fa.feasibility?.mapValue?.fields?.score?.integerValue}`);
  console.log(`  confidenceScore (inchangé):       ${fa.confidenceScore?.integerValue}`);
  for (const sess of courseSessionsAfter) {
    console.log(`  S1 ${sess.day?.stringValue} (${sess.type?.stringValue}): duration=${sess.duration?.stringValue}, distance=${sess.distance?.stringValue}`);
  }
  console.log(`  weeklyVolumes pic:                ${Math.max(...volumesAfter)} km`);
  console.log(`  weeklyVolumes length:             ${volumesAfter.length}`);
  console.log(`  welcomeMessage contient "45 min": ${(fa.welcomeMessage?.stringValue || '').includes('45 min')}`);
  console.log(`  welcomeMessage contient "22 km":  ${(fa.welcomeMessage?.stringValue || '').includes('22 km')}`);
  console.log(`  welcomeMessage contient "4 km":   ${(fa.welcomeMessage?.stringValue || '').includes('4 km')}`);
})().catch(e => { console.error('FATAL', e); process.exit(99); });
