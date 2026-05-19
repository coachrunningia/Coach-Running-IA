// patch-mxjulien02-live.mjs
// Patch live Firestore du plan mxjulien02@gmail.com — plan ID 1779147815002
// Doctrine : feedback_securite_avant_conversion + feedback_jamais_baisser_allure_cible
// + feedback_jamais_poids_minceur + feedback_patch_live_plans_jour_seulement
// Validation coach 15 ans (cf VALIDATION-COACH-AVANT-DEPLOY.md) :
//   - score IRRÉALISTE = 30 (pas 35)
//   - welcomeMessage avec phrase "si gain VMA moins fort, 2h18-2h20 OK" + séances seuil 5:41 calibrage
//   - safetyWarning BMI 27 + travail nuit (zéro mention poids/IMC chiffré)

import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779147815002';
const DRY_RUN = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';

const TOKEN = execSync(
  `gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio: ['pipe', 'pipe', 'pipe'] },
).toString().trim();

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT,
};

const DOC_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// =========================================================================
// 1. Wordings finaux validés (verbatim brief Romane + coach)
// =========================================================================

const NEW_FEASIBILITY_MESSAGE = `Ton objectif de 2h00 sur Semi-Marathon est physiologiquement très ambitieux : il demande de tenir 97,7 % de ta VMA actuelle (10,8 km/h) sur 21 km, ce qui dépasse le seuil tenable au-delà d'une heure (88-92 % VMA selon les référentiels Daniels et Pfitzinger). À partir de ton PB 10 km en 1h06, la formule de prédiction Riegel donne plutôt 2h25 sur le Semi.

Un objectif autour de **2h15** (allure 6:24/km, environ 87 % VMA) serait ambitieux mais réalisable avec 19 semaines de préparation structurée. Si ton gain VMA s'avère moins fort, finir entre 2h18 et 2h20 reste une belle performance. Les séances seuil à 5:41/km serviront de calibrage haut intensité, sans être ton allure de course.`;

const NEW_RECOMMENDATION = `un temps cible autour de 2h15min`;

const NEW_SAFETY_WARNING = `À toi de voir avec ton médecin pour un certificat d'aptitude avant de démarrer (BMI 27 = vigilance reprise). Ton travail de nuit demande une attention particulière sur la gestion du sommeil et de la fatigue : programme tes séances dures sur tes jours de récupération bien dormie, pas au sortir d'une nuit. Accorde-toi 48h minimum entre séances qualitatives.`;

const NEW_WELCOME_MESSAGE = `Bienvenue dans ton plan d'entraînement Semi-Marathon de 19 semaines. Avant tout, on est transparents avec toi : ton objectif 2h00 est très ambitieux vu ton PB 10 km en 1h06 (qui projette un Semi autour de 2h25 selon la formule Riegel). Tenir l'allure 5:41/km sur 21 km demande 97,7 % de ta VMA actuelle, c'est physiologiquement à la limite haute.

On te recommande chaudement de viser **2h15** comme cible "ambitieux mais réalisable" — c'est l'allure 6:24/km, soit 87 % de ta VMA, parfaitement tenable avec 19 semaines de prépa. Tu peux régénérer un plan calé sur 2h15 pour avoir des allures d'entraînement plus cohérentes (clique sur "régénérer" dans tes paramètres).

Si tu gardes 2h00, le plan tient debout : les séances seuil à 5:41/km serviront de calibrage haute intensité (sans être ton allure de course visée). On construit ton volume autour de 25-32 km/semaine avec un pic à 32 km en semaine 15.

Côté santé : ton BMI 27 et ton travail de nuit nous invitent à te recommander un check médical avant démarrage. Programme tes séances qualitatives sur tes jours bien dormis, pas au sortir d'une nuit de travail. On compte sur toi pour t'écouter.`;

const NEW_WEEKLY_VOLUMES = [25, 27, 29, 23, 28, 30, 24, 28, 31, 25, 29, 31, 25, 30, 32, 25, 28, 22, 16];

// =========================================================================
// 2. Read current doc
// =========================================================================

console.log('========================================================');
console.log(`PATCH mxjulien02 plan ${PLAN_ID}`);
console.log(`DRY_RUN = ${DRY_RUN}`);
console.log(`Service account = ${SA}`);
console.log('========================================================\n');

const r = await fetch(DOC_URL, { headers: HEADERS });
if (!r.ok) {
  console.error('❌ Failed to read doc:', r.status, await r.text());
  process.exit(1);
}
const beforeDoc = await r.json();
const beforeFields = beforeDoc.fields || {};

// Helpers pour lire valeurs typées Firestore REST
function readStr(f, path) {
  const parts = path.split('.');
  let cur = f;
  for (const p of parts) {
    if (!cur) return undefined;
    if (cur.mapValue) cur = cur.mapValue.fields;
    cur = cur?.[p];
  }
  return cur?.stringValue;
}
function readNum(f, path) {
  const parts = path.split('.');
  let cur = f;
  for (const p of parts) {
    if (!cur) return undefined;
    if (cur.mapValue) cur = cur.mapValue.fields;
    cur = cur?.[p];
  }
  if (cur?.integerValue !== undefined) return Number(cur.integerValue);
  if (cur?.doubleValue !== undefined) return Number(cur.doubleValue);
  return undefined;
}
function readArr(f, path) {
  const parts = path.split('.');
  let cur = f;
  for (const p of parts) {
    if (!cur) return undefined;
    if (cur.mapValue) cur = cur.mapValue.fields;
    cur = cur?.[p];
  }
  const arr = cur?.arrayValue?.values || [];
  return arr.map((v) => {
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.doubleValue !== undefined) return Number(v.doubleValue);
    return v.stringValue;
  });
}

const before = {
  feasibilityStatus: readStr(beforeFields, 'feasibility.status'),
  feasibilityScore: readNum(beforeFields, 'feasibility.score'),
  feasibilityMessage: readStr(beforeFields, 'feasibility.message'),
  feasibilityRecommendation: readStr(beforeFields, 'feasibility.recommendation'),
  feasibilitySafetyWarning: readStr(beforeFields, 'feasibility.safetyWarning'),
  confidenceScore: readNum(beforeFields, 'confidenceScore'),
  welcomeMessage: readStr(beforeFields, 'welcomeMessage'),
  weeklyVolumes: readArr(beforeFields, 'generationContext.periodizationPlan.weeklyVolumes'),
  allureSemi: readStr(beforeFields, 'paces.allureSpecifiqueSemi'),
  allureSemiCtx: readStr(beforeFields, 'generationContext.paces.allureSpecifiqueSemi'),
};

console.log('--- AVANT (lu Firestore) ---');
console.log(JSON.stringify(before, null, 2));
console.log('');

// =========================================================================
// 3. Build update payload (Firestore REST PATCH avec updateMask)
// =========================================================================

// IMPORTANT : pour patcher un sous-champ d'un mapValue, on doit fournir le mapValue
// complet du parent OU utiliser updateMask avec field path qualifié.
// Stratégie : pour `feasibility`, on remplace l'objet entier (5 champs).
// Pour `generationContext.periodizationPlan.weeklyVolumes`, on doit fournir le
// mapValue periodizationPlan complet pour éviter d'écraser les autres champs.

// On va plutôt utiliser des updateMask field paths (Firestore supporte les
// notations imbriquées avec backticks pour les segments simples).

const periodizationPlanFields = beforeFields.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
if (!periodizationPlanFields) {
  console.error('❌ generationContext.periodizationPlan introuvable');
  process.exit(1);
}

// Reconstruct periodizationPlan with new weeklyVolumes
const newPeriodizationPlan = {
  mapValue: {
    fields: {
      ...periodizationPlanFields,
      weeklyVolumes: {
        arrayValue: {
          values: NEW_WEEKLY_VOLUMES.map((v) => ({ integerValue: String(v) })),
        },
      },
    },
  },
};

// Reconstruct generationContext with new periodizationPlan (keep all other fields)
const gcFields = beforeFields.generationContext?.mapValue?.fields || {};
const newGenerationContext = {
  mapValue: {
    fields: {
      ...gcFields,
      periodizationPlan: newPeriodizationPlan,
    },
  },
};

// New feasibility object (replace whole map)
const newFeasibility = {
  mapValue: {
    fields: {
      status: { stringValue: 'IRRÉALISTE' },
      score: { integerValue: '30' },
      message: { stringValue: NEW_FEASIBILITY_MESSAGE },
      recommendation: { stringValue: NEW_RECOMMENDATION },
      safetyWarning: { stringValue: NEW_SAFETY_WARNING },
    },
  },
};

// Patch body : only fields we want to update (with updateMask)
const patchBody = {
  fields: {
    feasibility: newFeasibility,
    confidenceScore: { integerValue: '30' },
    welcomeMessage: { stringValue: NEW_WELCOME_MESSAGE },
    generationContext: newGenerationContext,
  },
};

// Build updateMask : list of top-level field names we patch
const updateMaskFields = ['feasibility', 'confidenceScore', 'welcomeMessage', 'generationContext'];
const updateMaskQS = updateMaskFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');

console.log('--- APRÈS (planifié) ---');
console.log(JSON.stringify({
  feasibilityStatus: 'IRRÉALISTE',
  feasibilityScore: 30,
  feasibilityMessage: NEW_FEASIBILITY_MESSAGE.slice(0, 200) + '...',
  feasibilityRecommendation: NEW_RECOMMENDATION,
  feasibilitySafetyWarning: NEW_SAFETY_WARNING.slice(0, 200) + '...',
  confidenceScore: 30,
  welcomeMessage: NEW_WELCOME_MESSAGE.slice(0, 200) + '...',
  weeklyVolumes: NEW_WEEKLY_VOLUMES,
  allureSemi: before.allureSemi + ' (INCHANGÉ, doctrine)',
}, null, 2));
console.log('');

console.log('--- DIFF résumé champ par champ ---');
const diffs = [
  ['feasibility.status', before.feasibilityStatus, 'IRRÉALISTE'],
  ['feasibility.score', before.feasibilityScore, 30],
  ['feasibility.recommendation', before.feasibilityRecommendation, NEW_RECOMMENDATION],
  ['confidenceScore', before.confidenceScore, 30],
  ['feasibility.message', `[${(before.feasibilityMessage || '').length} chars]`, `[${NEW_FEASIBILITY_MESSAGE.length} chars]`],
  ['feasibility.safetyWarning', `[${(before.feasibilitySafetyWarning || '').length} chars]`, `[${NEW_SAFETY_WARNING.length} chars]`],
  ['welcomeMessage', `[${(before.welcomeMessage || '').length} chars]`, `[${NEW_WELCOME_MESSAGE.length} chars]`],
  ['weeklyVolumes', JSON.stringify(before.weeklyVolumes), JSON.stringify(NEW_WEEKLY_VOLUMES)],
  ['paces.allureSpecifiqueSemi', before.allureSemi, before.allureSemi + ' (PRÉSERVÉ doctrine)'],
];
for (const [field, av, ap] of diffs) {
  console.log(`  ${field}:`);
  console.log(`    AVANT : ${av}`);
  console.log(`    APRÈS : ${ap}`);
}
console.log('');

if (DRY_RUN) {
  console.log('🔵 DRY_RUN=true → aucune écriture Firestore. Re-run avec DRY_RUN=false pour patcher.');
  process.exit(0);
}

// =========================================================================
// 4. Exécution réelle PATCH
// =========================================================================

console.log('🟠 DRY_RUN=false → écriture Firestore en cours...\n');

const patchUrl = `${DOC_URL}?${updateMaskQS}`;
const pr = await fetch(patchUrl, {
  method: 'PATCH',
  headers: HEADERS,
  body: JSON.stringify(patchBody),
});

if (!pr.ok) {
  const errTxt = await pr.text();
  console.error('❌ PATCH failed:', pr.status, errTxt);
  process.exit(1);
}

const patchResp = await pr.json();
console.log('✅ PATCH réussi.');
console.log('Doc updateTime:', patchResp.updateTime);
console.log('');

// =========================================================================
// 5. Re-fetch & verify
// =========================================================================

const r2 = await fetch(DOC_URL, { headers: HEADERS });
if (!r2.ok) {
  console.error('❌ Re-fetch failed:', r2.status);
  process.exit(1);
}
const afterDoc = await r2.json();
const afterFields = afterDoc.fields || {};

const after = {
  feasibilityStatus: readStr(afterFields, 'feasibility.status'),
  feasibilityScore: readNum(afterFields, 'feasibility.score'),
  feasibilityMessage: readStr(afterFields, 'feasibility.message'),
  feasibilityRecommendation: readStr(afterFields, 'feasibility.recommendation'),
  feasibilitySafetyWarning: readStr(afterFields, 'feasibility.safetyWarning'),
  confidenceScore: readNum(afterFields, 'confidenceScore'),
  welcomeMessage: readStr(afterFields, 'welcomeMessage'),
  weeklyVolumes: readArr(afterFields, 'generationContext.periodizationPlan.weeklyVolumes'),
  allureSemi: readStr(afterFields, 'paces.allureSpecifiqueSemi'),
};

console.log('--- APRÈS (relu Firestore) ---');
console.log(JSON.stringify(after, null, 2));
console.log('');

// Verify each field
const checks = [
  ['feasibility.status', after.feasibilityStatus, 'IRRÉALISTE'],
  ['feasibility.score', after.feasibilityScore, 30],
  ['feasibility.recommendation', after.feasibilityRecommendation, NEW_RECOMMENDATION],
  ['feasibility.message', after.feasibilityMessage, NEW_FEASIBILITY_MESSAGE],
  ['feasibility.safetyWarning', after.feasibilitySafetyWarning, NEW_SAFETY_WARNING],
  ['confidenceScore', after.confidenceScore, 30],
  ['welcomeMessage', after.welcomeMessage, NEW_WELCOME_MESSAGE],
  ['weeklyVolumes', JSON.stringify(after.weeklyVolumes), JSON.stringify(NEW_WEEKLY_VOLUMES)],
  ['paces.allureSpecifiqueSemi (PRÉSERVÉ)', after.allureSemi, '5:41'],
];

console.log('--- VÉRIFICATION champ par champ ---');
let allOk = true;
for (const [field, actual, expected] of checks) {
  const ok = actual === expected;
  console.log(`  ${ok ? '✅' : '❌'} ${field}: ${ok ? 'OK' : `attendu="${expected}" reçu="${actual}"`}`);
  if (!ok) allOk = false;
}
console.log('');
console.log(allOk ? '✅ PATCH validé tous champs OK.' : '❌ DIVERGENCES détectées.');

// Dump post-patch
const fs = await import('fs');
fs.writeFileSync(
  '/Users/romanemarino/Coach-Running-IA/post-patch-mxjulien02-plan.json',
  JSON.stringify(afterDoc, null, 2),
);
console.log('Dump post-patch écrit dans post-patch-mxjulien02-plan.json');

process.exit(allOk ? 0 : 1);
