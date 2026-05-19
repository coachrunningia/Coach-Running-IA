/**
 * Patch Plan Sébastien Sailly — AJUSTEMENT ALLURE 10K + WELCOMEMESSAGE
 * UID  : jZ8E7E1beJeO9GdDAYM6gYwMdVN2
 * Plan : 1779099564353 - "Préparation 10 km — Finisher — 7 sem."
 *
 * Contexte : plan en preview (isPreview=true, fullPlanGenerated=false),
 * SEUL weeks[0] (S1) existe à ce stade. Les semaines 2-7 ne sont PAS
 * encore générées dans le document Firestore.
 *
 * Cible 2 champs (au lieu des 3 demandés) :
 *
 *  1) paces.allureSpecifique10k                              : "8:20" → "9:30"
 *     Raison : PB 10k déclaré 1h30 = 9:00/km + cushion 5% finisher = 9:27 ≈
 *     9:30. Cohérent avec règle "Finisher + PB" actée 2026-05-18 (le user a
 *     coché "Finisher" donc pas de cible saisie, et il a un PB déclaré).
 *
 *  2) welcomeMessage                                          : nouveau texte
 *     Raison : nouveau texte explicite que l'allure d'entraînement 9:30/km
 *     est légèrement plus douce que son PB 9:00/km pour garder de la marge
 *     le jour J. Conserve transparence + autorisation marche + bilan médical.
 *
 * NON APPLIQUÉ : modification SL pic semaine 6 (weeks[5].sessions[X]).
 *   Raison BLOQUANTE : weeks ne contient QUE week 1 à ce stade (preview).
 *   weeks[5] n'existe pas (array.length === 1). On ne peut pas patcher une
 *   séance qui n'est pas encore générée. Doctrine "chaque ligne justifiée" :
 *   on n'invente pas un weeks[5] de zéro. Ce patch doit attendre la
 *   génération complète du plan (fullPlanGenerated=true).
 *   Aucun mirror `slPerWeek` n'existe non plus dans periodizationPlan.
 *
 * Doctrine respectée :
 *  - JAMAIS de mot interdit (poids/IMC/obésité/kilos/minceur/silhouette/...)
 *  - Allure 10k ajustée 8:20 → 9:30 (plus lente) car règle "Finisher + PB"
 *    actée le 2026-05-18 : un finisher avec PB DOIT recevoir son PB + cushion.
 *  - Aucun contact client (feedback_jamais_contact_client)
 *  - Touche UNIQUEMENT les 2 champs + leurs voisins préservés (autres paces)
 *
 * Idempotent : si les 2 cibles sont déjà à la valeur voulue, exit 0.
 */

import { execSync } from 'child_process';

// --- Auth ---
const token = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com',
  { encoding: 'utf-8' }
).trim();

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779099564353';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// --- Valeurs cibles ---
const NEW_PACE_10K = '9:30';
const NEW_WELCOME = "Bienvenue Sébastien ! Tu te lances dans un 10 km en 7 semaines, c'est un beau projet de démarrage. Ton objectif est tendu pour ce délai court — on construit une progression très progressive pour que ton corps s'adapte sans risque. La marche est autorisée et même recommandée dès que tu en ressens le besoin, que ce soit à l'entraînement ou le jour de la course : un 10 km finisher avec une partie en marche est un succès, pas un échec. Le plan combine 1 séance de course + 1 séance de renforcement par semaine pour protéger tes articulations. Sur ton dernier 10 km tu as couru en 1h30 (allure 9:00/km) — ton plan vise une allure d'entraînement légèrement plus douce à 9:30/km, pour t'entraîner sans risque et garder de la marge pour le jour J. Avant de débuter, un bilan médical complet (cardio + articulations) est fortement recommandé. Écoute ton corps, respecte tes jours de repos, et profite du parcours — le chrono n'a aucune importance, seule la ligne d'arrivée compte.";

// --- Doctrine guard : aucun mot interdit ---
const FORBIDDEN = ['poids', 'imc', 'obésité', 'obesite', 'kilos', 'minceur', 'silhouette', 'corpulence', 'maigrir', 'mince'];
const checkForbidden = (label, txt) => {
  const low = (txt || '').toLowerCase();
  for (const w of FORBIDDEN) {
    if (low.includes(w)) {
      console.error(`🔴 ABORT : mot interdit "${w}" détecté dans ${label}. Patch annulé.`);
      process.exit(1);
    }
  }
};
checkForbidden('NEW_WELCOME', NEW_WELCOME);
checkForbidden('NEW_PACE_10K', NEW_PACE_10K);

// --- 1. Lecture état actuel ---
const r = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j = await r.json();
if (j.error) { console.error('🔴 Lecture KO :', j.error); process.exit(1); }

const F = j.fields;

const beforePace10k = F?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
const beforeWelcome = F?.welcomeMessage?.stringValue;
const weeksLen = F?.weeks?.arrayValue?.values?.length || 0;
const isPreview = F?.isPreview?.booleanValue;
const fullPlanGenerated = F?.fullPlanGenerated?.booleanValue;

console.log('--- AVANT ---');
console.log(' paces.allureSpecifique10k :', JSON.stringify(beforePace10k));
console.log(' welcomeMessage (len)      :', beforeWelcome?.length, 'chars');
console.log(' weeks.length              :', weeksLen, '(preview =', isPreview, ', fullPlanGenerated =', fullPlanGenerated, ')');

// Garde explicite : si weeks[5] n'existe pas, on log que la mod 3 (SL pic S6)
// est volontairement non appliquée. Ce n'est PAS une erreur — c'est une
// décision documentée (cf doctrine "chaque ligne justifiée").
if (weeksLen < 6) {
  console.log('\n⚠️  weeks[5] (S6) absent : modification SL pic S6 NON APPLIQUÉE (preview only).');
  console.log('   À refaire après génération complète du plan (fullPlanGenerated=true).');
}

// --- Idempotence ---
const allOK = beforePace10k === NEW_PACE_10K && beforeWelcome === NEW_WELCOME;
if (allOK) {
  console.log('\n✅ Idempotent : les 2 champs cibles sont déjà à la valeur voulue. Aucun PATCH envoyé.');
  process.exit(0);
}

// --- 2. PATCH : 2 champs ciblés ---
// updateMask : on cible paces.allureSpecifique10k (sous-champ seul → autres
// paces préservées) + welcomeMessage (string top-level).
const maskFields = [
  'paces.allureSpecifique10k',
  'welcomeMessage',
];
const qs = maskFields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
const patchUrl = `${URL}?${qs}`;

const body = {
  fields: {
    paces: {
      mapValue: {
        fields: {
          allureSpecifique10k: { stringValue: NEW_PACE_10K },
        },
      },
    },
    welcomeMessage: { stringValue: NEW_WELCOME },
  },
};

const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 PATCH KO :', patched.error); process.exit(1); }
console.log('  ✔ PATCH envoyé (paces.allureSpecifique10k + welcomeMessage)');

// --- 3. Re-read confirmation ---
const r2 = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j2 = await r2.json();
const F2 = j2.fields;

const afterPace10k = F2?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
const afterWelcome = F2?.welcomeMessage?.stringValue;
const otherPaces = Object.keys(F2?.paces?.mapValue?.fields || {});

console.log('\n--- APRÈS (re-read) ---');
console.log(' paces.allureSpecifique10k       :', JSON.stringify(afterPace10k));
console.log(' welcomeMessage (len)            :', afterWelcome?.length, 'chars');
console.log(' paces (toutes clés présentes)   :', otherPaces.sort().join(', '));

// --- Vérifs ---
const checks = [
  ['allureSpecifique10k == 9:30',              afterPace10k === NEW_PACE_10K],
  ['welcomeMessage == NEW_WELCOME',            afterWelcome === NEW_WELCOME],
  ['paces.allureSpecifiqueMarathon préservée', otherPaces.includes('allureSpecifiqueMarathon')],
  ['paces.allureSpecifique5k préservée',       otherPaces.includes('allureSpecifique5k')],
  ['paces.allureSpecifiqueSemi préservée',     otherPaces.includes('allureSpecifiqueSemi')],
  ['paces.vmaPace préservée',                  otherPaces.includes('vmaPace')],
  ['paces.seuilPace préservée',                otherPaces.includes('seuilPace')],
  ['paces.efPace préservée',                   otherPaces.includes('efPace')],
  ['paces.eaPace préservée',                   otherPaces.includes('eaPace')],
  ['paces.recoveryPace préservée',             otherPaces.includes('recoveryPace')],
];

// Vérif doctrine : aucun mot interdit dans le welcomeMessage final
const lowFinal = (afterWelcome || '').toLowerCase();
let doctrineOK = true;
for (const w of FORBIDDEN) {
  if (lowFinal.includes(w)) { doctrineOK = false; break; }
}
checks.push(['Doctrine : aucun mot interdit dans welcomeMessage final', doctrineOK]);

console.log('\n--- VÉRIFS ---');
let allGood = true;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✅' : '🔴'} ${label}`);
  if (!ok) allGood = false;
}

if (!allGood) { console.error('\n🔴 Au moins une vérif a échoué.'); process.exit(1); }
console.log('\n✅ Patch allure 10k 9:30 + welcomeMessage appliqué et re-vérifié. Doctrine respectée.');
console.log('⚠️  Rappel : modification SL pic S6 NON APPLIQUÉE (weeks[5] absent — plan en preview).');
