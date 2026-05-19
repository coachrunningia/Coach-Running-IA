/**
 * Patch Plan Sébastien Sailly — MONTÉE PIC VOLUME 8 → 9 km/sem + LISSAGE
 * UID  : jZ8E7E1beJeO9GdDAYM6gYwMdVN2
 * Plan : 1779099564353 - "Préparation 10 km — Finisher — 7 sem."
 *
 * Cible UNIQUE :
 *   generationContext.periodizationPlan.weeklyVolumes
 *     AVANT : [4, 5, 6, 5, 7, 8, 4]   (pic 8 km/sem S6, saut +14% S5→S6,
 *                                       creux -17% S3→S4 incohérent)
 *     APRÈS : [4, 5, 6, 7, 8, 9, 5]   (pic 9 km/sem S6, progression
 *                                       +1 km/sem lissée S1→S6, affûtage
 *                                       S7 = -44% (5 km))
 *
 * Justification :
 *  - Pic 9 km/sem permet une SL pic de 6-7 km (= 60-70% du 10k objectif),
 *    standard de coaching minimal pour aborder un 10 km finisher.
 *  - Progression +1 km/sem partout respecte ACSM 10-15%/sem ; aucun saut
 *    > +25%. L'ancien creux S3→S4 (-17%) puis saut S4→S5 (+40%) est
 *    supprimé.
 *  - Affûtage S7 = 5 km (-44%) : standard finisher 10k 7 sem.
 *
 * Doctrine respectée :
 *  - Ne touche AUCUN autre champ : paces.allureSpecifique10k (9:30),
 *    welcomeMessage (975 chars), feasibility.status (AMBITIEUX),
 *    feasibility.score (60) — TOUS préservés via updateMask ciblé.
 *  - Pas de contact client (feedback_jamais_contact_client).
 *  - Chaque ligne justifiée : le champ remplacé existe (cf backup),
 *    on documente avant/après.
 *
 * Idempotent : si weeklyVolumes est déjà [4,5,6,7,8,9,5], exit 0 sans PATCH.
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

// --- Valeur cible ---
const NEW_WEEKLY_VOLUMES = [4, 5, 6, 7, 8, 9, 5];

// --- 1. Lecture état actuel ---
const r = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j = await r.json();
if (j.error) { console.error('🔴 Lecture KO :', j.error); process.exit(1); }
const F = j.fields;

const pp = F?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
if (!pp) { console.error('🔴 generationContext.periodizationPlan introuvable.'); process.exit(1); }

const wvBefore = (pp.weeklyVolumes?.arrayValue?.values || []).map(v => {
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  return v;
});

// Snapshots des champs critiques à PRÉSERVER (lecture seule, contrôle après)
const snapBefore = {
  pace10k:           F?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue,
  welcomeLen:        F?.welcomeMessage?.stringValue?.length,
  feasibilityStatus: F?.feasibility?.mapValue?.fields?.status?.stringValue,
  feasibilityScore:  F?.feasibility?.mapValue?.fields?.score?.integerValue,
  periodizationKeys: Object.keys(pp).sort(),
  totalWeeks:        pp.totalWeeks?.integerValue,
  recoveryWeeks:     (pp.recoveryWeeks?.arrayValue?.values || []).length,
  weeklyPhases:      (pp.weeklyPhases?.arrayValue?.values || []).length,
};

console.log('--- AVANT ---');
console.log(' weeklyVolumes              :', JSON.stringify(wvBefore));
console.log(' paces.allureSpecifique10k  :', JSON.stringify(snapBefore.pace10k));
console.log(' welcomeMessage (len)       :', snapBefore.welcomeLen, 'chars');
console.log(' feasibility.status         :', JSON.stringify(snapBefore.feasibilityStatus));
console.log(' feasibility.score          :', snapBefore.feasibilityScore);
console.log(' periodizationPlan keys     :', snapBefore.periodizationKeys.join(', '));
console.log(' periodizationPlan.totalWeeks   :', snapBefore.totalWeeks);
console.log(' periodizationPlan.recoveryWeeks (len) :', snapBefore.recoveryWeeks);
console.log(' periodizationPlan.weeklyPhases  (len) :', snapBefore.weeklyPhases);

// --- Idempotence ---
const same =
  wvBefore.length === NEW_WEEKLY_VOLUMES.length &&
  wvBefore.every((v, i) => v === NEW_WEEKLY_VOLUMES[i]);
if (same) {
  console.log('\n✅ Idempotent : weeklyVolumes déjà = ' + JSON.stringify(NEW_WEEKLY_VOLUMES) + '. Aucun PATCH envoyé.');
  process.exit(0);
}

// --- 2. PATCH : UNIQUEMENT generationContext.periodizationPlan.weeklyVolumes ---
// updateMask ciblé sur le sous-chemin exact → tous les autres champs de
// periodizationPlan (recoveryWeeks, weeklyPhases, totalWeeks) sont préservés,
// ainsi que tous les autres top-level (paces, welcomeMessage, feasibility, …).
const maskFields = ['generationContext.periodizationPlan.weeklyVolumes'];
const qs = maskFields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
const patchUrl = `${URL}?${qs}`;

const body = {
  fields: {
    generationContext: {
      mapValue: {
        fields: {
          periodizationPlan: {
            mapValue: {
              fields: {
                weeklyVolumes: {
                  arrayValue: {
                    values: NEW_WEEKLY_VOLUMES.map(n => ({ integerValue: String(n) })),
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

const patchRes = await fetch(patchUrl, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 PATCH KO :', patched.error); process.exit(1); }
console.log('\n  ✔ PATCH envoyé (generationContext.periodizationPlan.weeklyVolumes)');

// --- 3. Re-read confirmation ---
const r2 = await fetch(URL, { headers: { Authorization: `Bearer ${token}` } });
const j2 = await r2.json();
const F2 = j2.fields;
const pp2 = F2?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;

const wvAfter = (pp2?.weeklyVolumes?.arrayValue?.values || []).map(v => {
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  return v;
});

const snapAfter = {
  pace10k:           F2?.paces?.mapValue?.fields?.allureSpecifique10k?.stringValue,
  welcomeLen:        F2?.welcomeMessage?.stringValue?.length,
  feasibilityStatus: F2?.feasibility?.mapValue?.fields?.status?.stringValue,
  feasibilityScore:  F2?.feasibility?.mapValue?.fields?.score?.integerValue,
  periodizationKeys: Object.keys(pp2 || {}).sort(),
  totalWeeks:        pp2?.totalWeeks?.integerValue,
  recoveryWeeks:     (pp2?.recoveryWeeks?.arrayValue?.values || []).length,
  weeklyPhases:      (pp2?.weeklyPhases?.arrayValue?.values || []).length,
};

console.log('\n--- APRÈS (re-read) ---');
console.log(' weeklyVolumes              :', JSON.stringify(wvAfter));
console.log(' paces.allureSpecifique10k  :', JSON.stringify(snapAfter.pace10k));
console.log(' welcomeMessage (len)       :', snapAfter.welcomeLen, 'chars');
console.log(' feasibility.status         :', JSON.stringify(snapAfter.feasibilityStatus));
console.log(' feasibility.score          :', snapAfter.feasibilityScore);
console.log(' periodizationPlan keys     :', snapAfter.periodizationKeys.join(', '));
console.log(' periodizationPlan.totalWeeks   :', snapAfter.totalWeeks);
console.log(' periodizationPlan.recoveryWeeks (len) :', snapAfter.recoveryWeeks);
console.log(' periodizationPlan.weeklyPhases  (len) :', snapAfter.weeklyPhases);

// --- Vérifs ---
const checks = [
  ['weeklyVolumes == [4,5,6,7,8,9,5]',           JSON.stringify(wvAfter) === JSON.stringify(NEW_WEEKLY_VOLUMES)],
  ['paces.allureSpecifique10k préservée (9:30)', snapAfter.pace10k === snapBefore.pace10k && snapAfter.pace10k === '9:30'],
  ['welcomeMessage préservé (len identique)',     snapAfter.welcomeLen === snapBefore.welcomeLen],
  ['feasibility.status préservé (AMBITIEUX)',     snapAfter.feasibilityStatus === snapBefore.feasibilityStatus && snapAfter.feasibilityStatus === 'AMBITIEUX'],
  ['feasibility.score préservé (60)',             snapAfter.feasibilityScore === snapBefore.feasibilityScore && snapAfter.feasibilityScore === '60'],
  ['periodizationPlan keys identiques',           JSON.stringify(snapAfter.periodizationKeys) === JSON.stringify(snapBefore.periodizationKeys)],
  ['periodizationPlan.totalWeeks préservé',       snapAfter.totalWeeks === snapBefore.totalWeeks],
  ['periodizationPlan.recoveryWeeks préservés',   snapAfter.recoveryWeeks === snapBefore.recoveryWeeks],
  ['periodizationPlan.weeklyPhases préservés',    snapAfter.weeklyPhases === snapBefore.weeklyPhases],
];

console.log('\n--- VÉRIFS ---');
let allGood = true;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✅' : '🔴'} ${label}`);
  if (!ok) allGood = false;
}

if (!allGood) { console.error('\n🔴 Au moins une vérif a échoué.'); process.exit(1); }
console.log('\n✅ Patch weeklyVolumes [4,5,6,7,8,9,5] appliqué + tous autres champs préservés.');
