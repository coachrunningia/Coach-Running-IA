/**
 * Patch Plan Sébastien Sailly — AJUSTEMENTS Q4 + Q6
 * UID  : jZ8E7E1beJeO9GdDAYM6gYwMdVN2
 * Plan : 1779099564353 - "Préparation 10 km — Finisher — 7 sem."
 *
 * Contexte : le plan a déjà reçu plusieurs patches précédents (option C +
 * rollback allure 10k à 8:20). État actuel attendu :
 *  - status AMBITIEUX, score 60, confidenceScore 60
 *  - paces.allureSpecifique10k = "8:20" (rollback OK, NE PAS TOUCHER)
 *  - weeklyVolumes = [4, 5, 6, 5, 6, 8, 4]
 *  - welcomeMessage transparence en place
 *
 * Ce script applique les 2 ajustements validés par l'expert coach FFA :
 *
 *  Q4) generationContext.periodizationPlan.weeklyVolumes
 *      [4, 5, 6, 5, 6, 8, 4]  →  [4, 5, 6, 5, 7, 8, 4]
 *      Raison : lisser le saut S5→S6 (avant +33% = risque tendinite,
 *      après +14% conforme à la règle ACSM 10-15%/sem).
 *
 *  Q6) weeks[0].sessions[1] (la séance "Sortie Longue" — index 1 dans S1)
 *      Reformulation en mode marche/course explicite plus court et plus
 *      sécurisant pour un primo-pratiquant. La séance Renfo (index 0)
 *      n'est PAS touchée.
 *
 *      Modifications dans cette séance uniquement :
 *      - title    : "Première séance Marche/Course en aisance"
 *                   → "Marche/Course découverte — 30 min en alternance"
 *      - mainSet  : 16 cycles (1 min trot + 2 min marche) = 48 min
 *                   → 6 répétitions de [2 min trot très facile + 3 min
 *                     marche active] = 30 min, formulation explicite
 *      - duration : "1h00"  →  "30 min"
 *      - distance : "3.8 km" → "~3 km"   (la durée prime, distance = réf 2e)
 *
 *      NON TOUCHÉ dans cette même séance : targetPace, intensity,
 *      elevationGain, id, advice, warmup, locationSuggestion, cooldown,
 *      day, type. (Les allures targetPace restent EF/Récup telles quelles.)
 *
 * Doctrine respectée :
 *  - JAMAIS de mot interdit (poids/IMC/obésité/kilos/minceur/silhouette/...)
 *  - JAMAIS baisser l'allure cible 10k (8:20 reste 8:20 — non touché ici)
 *  - Mode marche-course OK pour débutant VMA 8 (scope respecté)
 *  - Aucun contact client
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
const NEW_WEEKLY_VOLUMES = [4, 5, 6, 5, 7, 8, 4];
const SL_INDEX = 1; // session "Sortie Longue" dans weeks[0].sessions

const NEW_SL_TITLE = "Marche/Course découverte — 30 min en alternance";
const NEW_SL_MAINSET = "30 min total — alternance marche/course explicite : **6 répétitions de [2 min de trot à allure très facile + 3 min de marche active]**. Pas d'arrêt complet entre les blocs. Trottiner uniquement quand tu te sens à l'aise — si tu sens essoufflé ou douleur articulaire, marche plus longtemps.";
const NEW_SL_DURATION = "30 min";
const NEW_SL_DISTANCE = "~3 km";

// --- Doctrine guard : aucun mot interdit dans les textes modifiés ---
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
checkForbidden('NEW_SL_TITLE', NEW_SL_TITLE);
checkForbidden('NEW_SL_MAINSET', NEW_SL_MAINSET);
checkForbidden('NEW_SL_DURATION', NEW_SL_DURATION);
checkForbidden('NEW_SL_DISTANCE', NEW_SL_DISTANCE);

// --- 1. Lecture état actuel ---
const r = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j = await r.json();
if (j.error) { console.error('🔴 Lecture KO :', j.error); process.exit(1); }

const F = j.fields;

// Q4 : weeklyVolumes
const beforeVolumes = F?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => Number(v.integerValue ?? v.doubleValue));

// Q6 : SL S1
const weeks = F?.weeks?.arrayValue?.values || [];
const week1Fields = weeks[0]?.mapValue?.fields;
const sessions = week1Fields?.sessions?.arrayValue?.values || [];
const slSession = sessions[SL_INDEX]?.mapValue?.fields;
if (!slSession || slSession?.type?.stringValue !== 'Sortie Longue') {
  console.error(`🔴 ABORT : sessions[${SL_INDEX}] n'est pas une "Sortie Longue" (type=${slSession?.type?.stringValue}). Index probablement faux.`);
  process.exit(1);
}

// Guard supplémentaire : on ne doit PAS toucher à l'allure 10k
const currentPace10k = F?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
if (currentPace10k !== '8:20') {
  console.error(`🔴 ABORT : paces.allureSpecifique10k = "${currentPace10k}" alors qu'on attendait "8:20". État inattendu. Aucun PATCH envoyé.`);
  process.exit(1);
}

const beforeSL = {
  title: slSession?.title?.stringValue,
  mainSet: slSession?.mainSet?.stringValue,
  duration: slSession?.duration?.stringValue,
  distance: slSession?.distance?.stringValue,
};

console.log('--- AVANT ---');
console.log(' [Q4] weeklyVolumes :', JSON.stringify(beforeVolumes));
console.log(' [Q6] SL S1 title    :', JSON.stringify(beforeSL.title));
console.log(' [Q6] SL S1 mainSet  :', JSON.stringify(beforeSL.mainSet?.substring(0, 120) + (beforeSL.mainSet?.length > 120 ? '…' : '')));
console.log(' [Q6] SL S1 duration :', JSON.stringify(beforeSL.duration));
console.log(' [Q6] SL S1 distance :', JSON.stringify(beforeSL.distance));
console.log(' [GUARD] paces.allureSpecifique10k :', JSON.stringify(currentPace10k));

// --- Idempotence ---
const arrayEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const q4OK = arrayEq(beforeVolumes, NEW_WEEKLY_VOLUMES);
const q6OK =
  beforeSL.title === NEW_SL_TITLE &&
  beforeSL.mainSet === NEW_SL_MAINSET &&
  beforeSL.duration === NEW_SL_DURATION &&
  beforeSL.distance === NEW_SL_DISTANCE;

if (q4OK && q6OK) {
  console.log('\n✅ Idempotent : Q4 + Q6 déjà à la valeur voulue. Aucun PATCH envoyé.');
  process.exit(0);
}

// --- 2. PATCH ---
// Stratégie : 2 PATCH séparés pour éviter d'écraser autre chose.
//  - PATCH 1 (Q4) : updateMask sur generationContext.periodizationPlan.weeklyVolumes
//                   → uniquement ce sous-champ, le reste de periodizationPlan préservé.
//  - PATCH 2 (Q6) : updateMask sur weeks (le tableau entier — Firestore ne supporte
//                   pas l'updateMask sur un index de tableau). On reconstruit le
//                   tableau weeks complet en modifiant uniquement les 4 champs cibles
//                   de sessions[SL_INDEX] dans weeks[0], tout le reste inchangé.

// === PATCH 1 : Q4 weeklyVolumes ===
if (!q4OK) {
  const url1 = `${URL}?updateMask.fieldPaths=${encodeURIComponent('generationContext.periodizationPlan.weeklyVolumes')}`;
  const body1 = {
    fields: {
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
    },
  };
  const p1 = await fetch(url1, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body1),
  });
  const p1j = await p1.json();
  if (p1j.error) { console.error('🔴 PATCH Q4 KO :', p1j.error); process.exit(1); }
  console.log('  ✔ PATCH Q4 envoyé (weeklyVolumes)');
} else {
  console.log('  · Q4 déjà OK — skip');
}

// === PATCH 2 : Q6 SL S1 ===
if (!q6OK) {
  // On clone le tableau weeks existant tel quel (raw Firestore JSON),
  // puis on remplace UNIQUEMENT les 4 champs cibles de sessions[SL_INDEX]
  // dans weeks[0]. Tous les autres champs (warmup, cooldown, advice,
  // targetPace, intensity, etc.) restent strictement identiques.
  const weeksClone = JSON.parse(JSON.stringify(F.weeks));
  const targetSession = weeksClone.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values[SL_INDEX].mapValue.fields;
  targetSession.title    = { stringValue: NEW_SL_TITLE };
  targetSession.mainSet  = { stringValue: NEW_SL_MAINSET };
  targetSession.duration = { stringValue: NEW_SL_DURATION };
  targetSession.distance = { stringValue: NEW_SL_DISTANCE };

  const url2 = `${URL}?updateMask.fieldPaths=weeks`;
  const body2 = { fields: { weeks: weeksClone } };
  const p2 = await fetch(url2, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body2),
  });
  const p2j = await p2.json();
  if (p2j.error) { console.error('🔴 PATCH Q6 KO :', p2j.error); process.exit(1); }
  console.log('  ✔ PATCH Q6 envoyé (weeks[0].sessions[' + SL_INDEX + '])');
} else {
  console.log('  · Q6 déjà OK — skip');
}

// --- 3. Re-read confirmation ---
const r2 = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j2 = await r2.json();
const F2 = j2.fields;

const afterVolumes = F2?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes?.arrayValue?.values?.map(v => Number(v.integerValue ?? v.doubleValue));

const weeks2 = F2?.weeks?.arrayValue?.values || [];
const sessions2 = weeks2[0]?.mapValue?.fields?.sessions?.arrayValue?.values || [];
const slSession2 = sessions2[SL_INDEX]?.mapValue?.fields;
const afterSL = {
  title: slSession2?.title?.stringValue,
  mainSet: slSession2?.mainSet?.stringValue,
  duration: slSession2?.duration?.stringValue,
  distance: slSession2?.distance?.stringValue,
  // voisins qu'on devait préserver
  targetPace: slSession2?.targetPace?.stringValue,
  intensity: slSession2?.intensity?.stringValue,
  warmup: slSession2?.warmup?.stringValue,
  cooldown: slSession2?.cooldown?.stringValue,
  advice: slSession2?.advice?.stringValue,
  day: slSession2?.day?.stringValue,
  type: slSession2?.type?.stringValue,
  id: slSession2?.id?.stringValue,
  locationSuggestion: slSession2?.locationSuggestion?.stringValue,
};

// Voisins globaux à préserver
const afterPace10k = F2?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue;
const periodKeys = Object.keys(F2?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields || {});
const week1Keys = Object.keys(weeks2[0]?.mapValue?.fields || {});
const renfoSession = sessions2[0]?.mapValue?.fields;
const renfoTitle = renfoSession?.title?.stringValue;
const renfoMainSet = renfoSession?.mainSet?.stringValue;

console.log('\n--- APRÈS (re-read) ---');
console.log(' [Q4] weeklyVolumes :', JSON.stringify(afterVolumes));
console.log(' [Q6] SL S1 title    :', JSON.stringify(afterSL.title));
console.log(' [Q6] SL S1 mainSet  :', JSON.stringify(afterSL.mainSet));
console.log(' [Q6] SL S1 duration :', JSON.stringify(afterSL.duration));
console.log(' [Q6] SL S1 distance :', JSON.stringify(afterSL.distance));
console.log(' [Q6 preserved] SL targetPace :', JSON.stringify(afterSL.targetPace));
console.log(' [Q6 preserved] SL warmup     :', JSON.stringify(afterSL.warmup?.substring(0, 60) + '…'));
console.log(' [Q6 preserved] SL cooldown   :', JSON.stringify(afterSL.cooldown?.substring(0, 60) + '…'));
console.log(' [Q6 preserved] SL type       :', JSON.stringify(afterSL.type));
console.log(' [Q6 preserved] SL day        :', JSON.stringify(afterSL.day));
console.log(' [Q6 preserved] SL id         :', JSON.stringify(afterSL.id));
console.log(' [GUARD] paces.allureSpecifique10k :', JSON.stringify(afterPace10k));
console.log(' [GUARD] periodizationPlan keys    :', periodKeys.sort().join(', '));
console.log(' [GUARD] week1 keys                :', week1Keys.sort().join(', '));
console.log(' [GUARD] Renfo session title       :', JSON.stringify(renfoTitle));
console.log(' [GUARD] Renfo session mainSet     :', JSON.stringify(renfoMainSet?.substring(0, 80) + '…'));

// --- Vérifs ---
const checks = [
  ['Q4 weeklyVolumes == [4,5,6,5,7,8,4]', arrayEq(afterVolumes, NEW_WEEKLY_VOLUMES)],
  ['Q6 SL title MAJ',                     afterSL.title === NEW_SL_TITLE],
  ['Q6 SL mainSet MAJ',                   afterSL.mainSet === NEW_SL_MAINSET],
  ['Q6 SL duration MAJ',                  afterSL.duration === NEW_SL_DURATION],
  ['Q6 SL distance MAJ',                  afterSL.distance === NEW_SL_DISTANCE],
  ['Q6 SL targetPace préservée',          !!afterSL.targetPace && afterSL.targetPace.includes('EF') && afterSL.targetPace.includes('Récupération')],
  ['Q6 SL intensity préservée',           afterSL.intensity === 'Facile'],
  ['Q6 SL warmup préservé',               !!afterSL.warmup && afterSL.warmup.includes('marche')],
  ['Q6 SL cooldown préservé',             !!afterSL.cooldown && afterSL.cooldown.includes('étirements')],
  ['Q6 SL advice préservé',               !!afterSL.advice && afterSL.advice.length > 50],
  ['Q6 SL type == Sortie Longue',         afterSL.type === 'Sortie Longue'],
  ['Q6 SL day préservé',                  !!afterSL.day],
  ['Q6 SL id préservé',                   !!afterSL.id],
  ['Q6 SL locationSuggestion préservée',  !!afterSL.locationSuggestion],
  ['GUARD allure 10k = 8:20 INCHANGÉE',   afterPace10k === '8:20'],
  ['GUARD periodizationPlan.totalWeeks préservé',     periodKeys.includes('totalWeeks')],
  ['GUARD periodizationPlan.weeklyPhases préservé',   periodKeys.includes('weeklyPhases')],
  ['GUARD periodizationPlan.recoveryWeeks préservé',  periodKeys.includes('recoveryWeeks')],
  ['GUARD week1.phase préservé',          week1Keys.includes('phase')],
  ['GUARD week1.weekGoal préservé',       week1Keys.includes('weekGoal')],
  ['GUARD week1.theme préservé',          week1Keys.includes('theme')],
  ['GUARD week1.weekNumber préservé',     week1Keys.includes('weekNumber')],
  ['GUARD Renfo session intacte (title)', renfoTitle && renfoTitle.includes('Renfo')],
  ['GUARD Renfo session intacte (set)',   renfoMainSet && renfoMainSet.includes('Squats')],
];

// Vérif doctrine : aucun mot interdit dans les valeurs finales modifiées
const finalTexts = [afterSL.title, afterSL.mainSet, afterSL.duration, afterSL.distance].join(' ').toLowerCase();
let doctrineOK = true;
for (const w of FORBIDDEN) {
  if (finalTexts.includes(w)) { doctrineOK = false; break; }
}
checks.push(['Doctrine : aucun mot interdit dans Q6 final', doctrineOK]);

console.log('\n--- VÉRIFS ---');
let allGood = true;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✅' : '🔴'} ${label}`);
  if (!ok) allGood = false;
}

if (!allGood) { console.error('\n🔴 Au moins une vérif a échoué.'); process.exit(1); }
console.log('\n✅ Patch Q4 + Q6 appliqué et re-vérifié. Doctrine respectée.');
