/**
 * Patch Plan Sébastien Sailly — OPTION C "Compromis"
 * UID  : jZ8E7E1beJeO9GdDAYM6gYwMdVN2
 * Plan : 1779099564353 - "Préparation 10 km — Finisher — 7 sem."
 *
 * Contexte : le plan a déjà reçu un premier patch (feasibility.message +
 * feasibility.safetyWarning enrichis) via patch-sebastien.mjs.
 * Ce script applique l'option C validée par Romane : ajustement de la
 * sévérité affichée + allure 10k plus réaliste finisher débutant +
 * profil de volume avec pic à 8 km en S6 + welcomeMessage transparent.
 *
 * Cible 6 champs (tous au top-level sauf weeklyVolumes qui est imbriqué) :
 *
 *  1) feasibility.status                                  : "BON" -> "AMBITIEUX"
 *     Raison : "BON" sous-estimait la difficulté réelle pour ce profil
 *     (45 ans, débutant, VMA 8, 10 km en 7 sem.). "AMBITIEUX" reste positif
 *     mais signale que l'objectif est tendu, conformément à la doctrine
 *     "transparence + décharge explicite, jamais embellir un plan irréaliste".
 *
 *  2) feasibility.score                                   : (absent) -> 60
 *     Raison : aligne le score chiffré sur le nouveau status AMBITIEUX
 *     et sur le nouveau confidenceScore (60).
 *
 *  3) confidenceScore                                     : 70 -> 60
 *     Raison : cohérence avec status AMBITIEUX + score 60.
 *
 *  4) paces.allureSpecifique10k                           : "8:20" -> "9:00"
 *     Raison : 8:20/km = 1h23 sur 10k. Pour un finisher débutant avec VMA 8,
 *     une allure cible de 9:00/km (1h30) est nettement plus réaliste et
 *     conforme à l'objectif "Finisher" / vmaSource "10km en 1h30".
 *
 *  5) generationContext.periodizationPlan.weeklyVolumes
 *     [4, 4, 5, 4, 5, 6, 3] -> [4, 5, 6, 5, 6, 8, 4]
 *     Raison : profil de volume avec pic à 8 km en S6 (au lieu de 6),
 *     affûtage S7 à 4 km (-50% du pic, OK), progression douce conservée
 *     (max +1 km/sem). Donne un volume cumulé plus crédible pour préparer
 *     un 10k finisher.
 *
 *  6) welcomeMessage                                      : nouveau texte
 *     Raison : ancien message contenait déjà un avertissement médical fort,
 *     mais ne disait pas que l'objectif était tendu et n'explicitait pas
 *     que la marche le jour J est légitime. Nouveau texte = transparence
 *     totale + cadre rassurant + autorisation marche course/jour J +
 *     rappel bilan médical. Doctrine respectée (aucun mot interdit).
 *
 * NON TOUCHÉ ici :
 *  - feasibility.message      (déjà patché précédemment)
 *  - feasibility.safetyWarning (déjà patché précédemment)
 *  - weeks[0] Sortie Longue   (distance déjà à "3.8 km" ≈ 4 km, cohérent
 *                              avec nouveau volume S1=4 km ; consigne disait
 *                              de monter à 4 km UNIQUEMENT si 2-3 km — pas
 *                              le cas, donc on laisse tel quel)
 *  - tout le reste            (sessions S2-S7, paces autres que 10k, etc.)
 *
 * Idempotent : si tous les champs cibles sont déjà à la valeur voulue,
 * aucun PATCH n'est envoyé.
 */

import { execSync } from 'child_process';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779099564353';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// --- Valeurs cibles ---
const NEW_STATUS = 'AMBITIEUX';
const NEW_SCORE = 60;
const NEW_CONFIDENCE = 60;
const NEW_PACE_10K = '9:00';
const NEW_WEEKLY_VOLUMES = [4, 5, 6, 5, 6, 8, 4];
const NEW_WELCOME = "Bienvenue Sébastien ! Tu te lances dans un 10 km en 7 semaines, c'est un beau projet de démarrage. Ton **objectif est tendu** pour ce délai court — on construit une progression très progressive pour que ton corps s'adapte sans risque. La **marche est autorisée et même recommandée** dès que tu en ressens le besoin, que ce soit à l'entraînement ou le jour de la course : un 10 km finisher avec une partie en marche est un succès, pas un échec. Le plan combine **1 séance de course + 1 séance de renforcement** par semaine pour protéger tes articulations. Avant de débuter, un bilan médical complet (cardio + articulations) est fortement recommandé. Écoute ton corps, respecte tes jours de repos, et **profite du parcours** — le chrono n'a aucune importance, seule la ligne d'arrivée compte.";

// --- Conservés tels quels lors de la réécriture du sous-objet feasibility ---
// (Le PATCH Firestore sur un mapValue REMPLACE le map entier — donc on doit
// renvoyer message + safetyWarning identiques à l'existant pour ne pas les
// écraser. On les charge dynamiquement après la lecture.)

// --- Sanity-check doctrine : aucun mot interdit dans le welcomeMessage ---
const FORBIDDEN = ['poids', 'imc', 'obésité', 'obesite', 'kilos', 'minceur', 'silhouette', 'corpulence', 'maigrir', 'mince'];
{
  const low = NEW_WELCOME.toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      console.error(`🔴 ABORT : mot interdit "${w}" détecté dans welcomeMessage. Patch annulé.`);
      process.exit(1);
    }
  }
}

// --- 1. Lecture état actuel ---
const r = await fetch(URL, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j = await r.json();
if (j.error) { console.error('🔴 Lecture KO :', j.error); process.exit(1); }

const F = j.fields;
const feas = F?.feasibility?.mapValue?.fields || {};
const beforeStatus = feas?.status?.stringValue;
const beforeScore = feas?.score?.integerValue ?? feas?.score?.doubleValue ?? null;
const beforeConfidence = F?.confidenceScore?.integerValue ?? F?.confidenceScore?.doubleValue;
const beforePace10k = F?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
const beforeVolumes = F?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => Number(v.integerValue ?? v.doubleValue));
const beforeWelcome = F?.welcomeMessage?.stringValue;

// On a besoin de conserver feasibility.message + safetyWarning lors du PATCH du sous-objet feasibility
const keepMessage = feas?.message?.stringValue;
const keepWarning = feas?.safetyWarning?.stringValue;

console.log('--- AVANT ---');
console.log(' feasibility.status        :', JSON.stringify(beforeStatus));
console.log(' feasibility.score         :', JSON.stringify(beforeScore));
console.log(' confidenceScore           :', JSON.stringify(beforeConfidence));
console.log(' paces.allureSpecifique10k :', JSON.stringify(beforePace10k));
console.log(' weeklyVolumes             :', JSON.stringify(beforeVolumes));
console.log(' welcomeMessage (len)      :', beforeWelcome?.length, 'chars');

// --- Idempotence : tout déjà à jour ? ---
const arrayEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const allOK =
  beforeStatus === NEW_STATUS &&
  Number(beforeScore) === NEW_SCORE &&
  Number(beforeConfidence) === NEW_CONFIDENCE &&
  beforePace10k === NEW_PACE_10K &&
  arrayEq(beforeVolumes, NEW_WEEKLY_VOLUMES) &&
  beforeWelcome === NEW_WELCOME;

if (allOK) {
  console.log('\n✅ Idempotent : les 6 champs cibles sont déjà à la valeur voulue. Aucun PATCH envoyé.');
  process.exit(0);
}

// --- 2. PATCH : 6 champs ciblés ---
// updateMask permet de modifier chaque champ indépendamment SANS écraser les voisins
// (sauf pour feasibility où on patche le map entier — donc on remet message + warning).
const maskFields = [
  'feasibility',                                                  // map entier remplacé (donc on inclut message + warning conservés)
  'confidenceScore',
  'paces.allureSpecifique10k',                                    // sous-champ uniquement → autres paces préservées
  'generationContext.periodizationPlan.weeklyVolumes',            // sous-champ uniquement → reste de periodizationPlan préservé
  'welcomeMessage',
];
const qs = maskFields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
const patchUrl = `${URL}?${qs}`;

const body = {
  fields: {
    feasibility: {
      mapValue: {
        fields: {
          status:        { stringValue:  NEW_STATUS },
          score:         { integerValue: NEW_SCORE },
          message:       { stringValue:  keepMessage },          // conservé
          safetyWarning: { stringValue:  keepWarning },          // conservé
        },
      },
    },
    confidenceScore: { integerValue: NEW_CONFIDENCE },
    paces: {
      mapValue: {
        fields: {
          allureSpecifique10k: { stringValue: NEW_PACE_10K },
        },
      },
    },
    generationContext: {
      mapValue: {
        fields: {
          periodizationPlan: {
            mapValue: {
              fields: {
                weeklyVolumes: {
                  arrayValue: {
                    values: NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: n })),
                  },
                },
              },
            },
          },
        },
      },
    },
    welcomeMessage: { stringValue: NEW_WELCOME },
  },
};

const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 PATCH KO :', patched.error); process.exit(1); }

// --- 3. Re-read confirmation ---
const r2 = await fetch(URL, { headers: { 'Authorization': `Bearer ${access_token}` } });
const j2 = await r2.json();
const F2 = j2.fields;
const feas2 = F2?.feasibility?.mapValue?.fields || {};

const afterStatus = feas2?.status?.stringValue;
const afterScore = Number(feas2?.score?.integerValue ?? feas2?.score?.doubleValue);
const afterMessage = feas2?.message?.stringValue;
const afterWarning = feas2?.safetyWarning?.stringValue;
const afterConfidence = Number(F2?.confidenceScore?.integerValue ?? F2?.confidenceScore?.doubleValue);
const afterPace10k = F2?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
const afterVolumes = F2?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => Number(v.integerValue ?? v.doubleValue));
const afterWelcome = F2?.welcomeMessage?.stringValue;

// Voisins qu'on ne devait PAS écraser
const otherPaces = Object.keys(F2?.paces?.mapValue?.fields || {});
const periodKeys = Object.keys(F2?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields || {});

console.log('\n--- APRÈS (re-read) ---');
console.log(' feasibility.status        :', JSON.stringify(afterStatus));
console.log(' feasibility.score         :', afterScore);
console.log(' feasibility.message       :', afterMessage ? `(conservé, ${afterMessage.length} chars)` : '🔴 PERDU');
console.log(' feasibility.safetyWarning :', afterWarning ? `(conservé, ${afterWarning.length} chars)` : '🔴 PERDU');
console.log(' confidenceScore           :', afterConfidence);
console.log(' paces.allureSpecifique10k :', JSON.stringify(afterPace10k));
console.log(' paces (toutes clés présentes) :', otherPaces.sort().join(', '));
console.log(' weeklyVolumes             :', JSON.stringify(afterVolumes));
console.log(' periodizationPlan (toutes clés présentes) :', periodKeys.sort().join(', '));
console.log(' welcomeMessage (len)      :', afterWelcome?.length, 'chars');

const checks = [
  ['status == AMBITIEUX',                 afterStatus === NEW_STATUS],
  ['score == 60',                         afterScore === NEW_SCORE],
  ['feasibility.message conservé',        afterMessage === keepMessage && !!keepMessage],
  ['feasibility.safetyWarning conservé',  afterWarning === keepWarning && !!keepWarning],
  ['confidenceScore == 60',               afterConfidence === NEW_CONFIDENCE],
  ['allureSpecifique10k == 9:00',         afterPace10k === NEW_PACE_10K],
  ['paces.allureSpecifiqueMarathon préservée', otherPaces.includes('allureSpecifiqueMarathon')],
  ['paces.vmaPace préservée',             otherPaces.includes('vmaPace')],
  ['paces.seuilPace préservée',           otherPaces.includes('seuilPace')],
  ['weeklyVolumes == [4,5,6,5,6,8,4]',    arrayEq(afterVolumes, NEW_WEEKLY_VOLUMES)],
  ['periodizationPlan.totalWeeks préservé', periodKeys.includes('totalWeeks')],
  ['periodizationPlan.weeklyPhases préservé', periodKeys.includes('weeklyPhases')],
  ['periodizationPlan.recoveryWeeks préservé', periodKeys.includes('recoveryWeeks')],
  ['welcomeMessage == NEW_WELCOME',       afterWelcome === NEW_WELCOME],
];

console.log('\n--- VÉRIFS ---');
let allGood = true;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✅' : '🔴'} ${label}`);
  if (!ok) allGood = false;
}

if (!allGood) { console.error('\n🔴 Au moins une vérif a échoué.'); process.exit(1); }
console.log('\n✅ Patch Sébastien option C appliqué et re-vérifié.');
