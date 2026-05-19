/**
 * Patch Plan Sébastien Sailly (sebastien.sailly@outlook.fr)
 * UID  : jZ8E7E1beJeO9GdDAYM6gYwMdVN2
 * Plan : 1779099564353 - "Préparation 10 km — Finisher — 7 sem."
 *
 * Corrige 2 champs feasibility uniquement :
 *   1) feasibility.message     : message AVANT était contradictoire
 *      ("en dessous du minimum requis" + "excellente base" en même temps)
 *      -> reformulé cohérent, ton bienveillant, ZERO mention poids/IMC/obésité.
 *   2) feasibility.safetyWarning : AVANT mentionnait uniquement l'âge.
 *      -> ajoute bilan cardio + articulaire (facteur santé principal réel),
 *      sans jamais nommer poids/IMC/obésité (doctrine).
 *
 * NE TOUCHE PAS : welcomeMessage (jugé exemplaire), confidenceScore, status,
 *                 weeklyVolumes, sessions, etc.
 *
 * Idempotent : si les NEW textes sont déjà en place, le script ne renvoie pas
 *              de PATCH et exit 0 avec un log clair.
 */

import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779099564353';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const NEW_MESSAGE = "Tu te lances dans un 10 km en 7 semaines, c'est un beau projet pour démarrer la course à pied. Ton volume actuel est faible — c'est normal quand on débute — et le plan est construit pour t'accompagner en douceur, avec une progression très progressive. Aucune pression sur le chrono : l'objectif est de finir confortablement ton 10 km en ayant pris du plaisir. Marche dès que tu en ressens le besoin, écoute ton corps, respecte les jours de repos.";

const NEW_WARNING = "Avant de débuter ce plan, un bilan médical complet (cardio + articulations) est fortement recommandé. Adapte les séances à tes sensations, marche dès que nécessaire, et arrête immédiatement en cas de douleur articulaire ou de gêne thoracique. Une montre cardio ou une bonne paire de chaussures running adaptée à ta foulée sont des investissements précieux pour limiter les risques.";

// --- Sanity-check doctrine : aucun mot interdit dans les nouveaux textes ---
const FORBIDDEN = ['poids', 'imc', 'obésité', 'obesite', 'kilos', 'minceur', 'silhouette', 'corpulence'];
for (const txt of [NEW_MESSAGE, NEW_WARNING]) {
  const low = txt.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      console.error(`🔴 ABORT : mot interdit "${w}" détecté dans un texte cible. Patch annulé.`);
      process.exit(1);
    }
  }
}

// --- 1. Read current state ---
const r = await fetch(URL, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j = await r.json();
if (j.error) {
  console.error('🔴 Lecture KO :', j.error);
  process.exit(1);
}
const feasBefore = j.fields?.feasibility?.mapValue?.fields;
const beforeMessage = feasBefore?.message?.stringValue;
const beforeWarning = feasBefore?.safetyWarning?.stringValue;

console.log('--- AVANT ---');
console.log('message       :', JSON.stringify(beforeMessage));
console.log('safetyWarning :', JSON.stringify(beforeWarning));

// --- Idempotence ---
if (beforeMessage === NEW_MESSAGE && beforeWarning === NEW_WARNING) {
  console.log('\n✅ Idempotent : les 2 champs sont déjà à la valeur cible. Aucun PATCH envoyé.');
  process.exit(0);
}

// --- 2. PATCH : message + safetyWarning UNIQUEMENT ---
// updateMask cible précisément les 2 sous-champs ; les autres (status, etc.) sont préservés.
const patchUrl = `${URL}?updateMask.fieldPaths=feasibility.message&updateMask.fieldPaths=feasibility.safetyWarning`;

const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: {
      feasibility: {
        mapValue: {
          fields: {
            message: { stringValue: NEW_MESSAGE },
            safetyWarning: { stringValue: NEW_WARNING },
          },
        },
      },
    },
  }),
});
const patched = await patchRes.json();
if (patched.error) {
  console.error('🔴 PATCH KO :', patched.error);
  process.exit(1);
}

// --- 3. Re-read pour confirmer ---
const r2 = await fetch(URL, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j2 = await r2.json();
const feasAfter = j2.fields?.feasibility?.mapValue?.fields;
const afterMessage = feasAfter?.message?.stringValue;
const afterWarning = feasAfter?.safetyWarning?.stringValue;
const afterStatus = feasAfter?.status?.stringValue;

console.log('\n--- APRÈS (re-read) ---');
console.log('message       :', JSON.stringify(afterMessage));
console.log('safetyWarning :', JSON.stringify(afterWarning));
console.log('status (intact):', JSON.stringify(afterStatus));

const okMsg = afterMessage === NEW_MESSAGE;
const okWarn = afterWarning === NEW_WARNING;
console.log(`\nmessage       == NEW_MESSAGE  : ${okMsg ? '✅' : '🔴'}`);
console.log(`safetyWarning == NEW_WARNING  : ${okWarn ? '✅' : '🔴'}`);

if (!okMsg || !okWarn) process.exit(1);

console.log('\n✅ Patch Sébastien appliqué et re-vérifié.');
