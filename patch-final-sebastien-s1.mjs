/**
 * PATCH FINAL — Sébastien S1 4 → 5 km — 18/05/2026
 * ────────────────────────────────────────────────────────────────────────────
 * Plan : 1779099564353 (sebastien.sailly@outlook.fr, UID jZ8E7E1beJeO9GdDAYM6gYwMdVN2)
 *
 * Bug : generationContext.periodizationPlan.weeklyVolumes[0] = 4
 *       < currentWeeklyVolume = 5 (declared user).
 *       Viole doctrine feedback_input_client_obligatoire.
 *
 * Vecteur avant : [4, 5, 6, 7, 8, 9, 5]   (validé FFA précédemment)
 * Vecteur après : [5, 5, 6, 7, 8, 9, 5]   (S1 monté à 5 = current, reste inchangé)
 *
 * Touche UNIQUEMENT generationContext.periodizationPlan.weeklyVolumes[0].
 * Aucune autre modification (paces, feasibility, sessions, welcome, SL S1 walk/run, allure 9:30 → inchangés).
 *
 * Idempotent : si wv[0] déjà ≥ 5, skip.
 * Backup : backup-final/sebastien-pre-S1-5.json
 *
 * Usage : node patch-final-sebastien-s1.mjs --apply
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
if (!APPLY) {
  console.error('🔴 --apply requis.');
  process.exit(1);
}

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { encoding: 'utf-8' }).trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };

const PLAN_ID = '1779099564353';
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-final';
mkdirSync(BACKUP_DIR, { recursive: true });

function pInt(v) {
  if (v?.integerValue !== undefined) return Number(v.integerValue);
  if (v?.doubleValue !== undefined) return Number(v.doubleValue);
  return 0;
}

async function readPlan() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error('READ → ' + j.error.message);
  return j;
}

async function patchWv(newWv) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const qs = 'updateMask.fieldPaths=' + encodeURIComponent('generationContext.periodizationPlan.weeklyVolumes');
  const body = {
    fields: {
      generationContext: {
        mapValue: {
          fields: {
            periodizationPlan: {
              mapValue: {
                fields: {
                  weeklyVolumes: {
                    arrayValue: { values: newWv.map((n) => ({ integerValue: String(n) })) },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const r = await fetch(`${url}?${qs}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error('PATCH → ' + j.error.message);
  return j;
}

console.log('='.repeat(80));
console.log('PATCH FINAL — Sébastien S1 4 → 5 km — plan ' + PLAN_ID);
console.log('='.repeat(80));

const before = await readPlan();
const backupPath = `${BACKUP_DIR}/sebastien-pre-S1-5.json`;
writeFileSync(backupPath, JSON.stringify(before, null, 2));
console.log('  📦 backup →', backupPath);

const ppBefore = before.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
const wvBefore = (ppBefore?.weeklyVolumes?.arrayValue?.values || []).map(pInt);
console.log('  AVANT wv :', JSON.stringify(wvBefore));

if (wvBefore.length === 0) { console.error('🔴 wv vide.'); process.exit(1); }

if (wvBefore[0] >= 5) {
  console.log('  ✅ Idempotent : wv[0]=' + wvBefore[0] + ' ≥ 5. Aucun PATCH.');
  process.exit(0);
}

const wvAfter = [...wvBefore];
wvAfter[0] = 5;
console.log('  APRÈS wv :', JSON.stringify(wvAfter));

// Vérifs : seul wv[0] change, le reste identique
const restOk = wvBefore.slice(1).every((v, i) => v === wvAfter[i + 1]);
console.log('  CHECK reste du vecteur inchangé :', restOk ? '✅' : '🔴');
if (!restOk) { console.error('🔴 reste modifié.'); process.exit(1); }

await patchWv(wvAfter);
console.log('  ✔ PATCH envoyé.');

// Re-read
const after = await readPlan();
const ppAfter = after.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
const wvReread = (ppAfter?.weeklyVolumes?.arrayValue?.values || []).map(pInt);
console.log('  RE-READ wv :', JSON.stringify(wvReread));

const rereadOk = wvReread.length === wvAfter.length && wvReread.every((v, i) => v === wvAfter[i]);
console.log('  re-read OK :', rereadOk ? '✅' : '🔴');

// Préservation voisins
const ppKeysBefore = Object.keys(ppBefore).sort();
const ppKeysAfter = Object.keys(ppAfter).sort();
console.log('  periodizationPlan keys préservées :', JSON.stringify(ppKeysBefore) === JSON.stringify(ppKeysAfter) ? '✅' : '🔴');

const lensBefore = {
  welcomeMessage: before.fields?.welcomeMessage?.stringValue?.length || 0,
  weeks: (before.fields?.weeks?.arrayValue?.values || []).length,
  paces: Object.keys(before.fields?.paces?.mapValue?.fields || {}).length,
  feasibility: Object.keys(before.fields?.feasibility?.mapValue?.fields || {}).length,
};
const lensAfter = {
  welcomeMessage: after.fields?.welcomeMessage?.stringValue?.length || 0,
  weeks: (after.fields?.weeks?.arrayValue?.values || []).length,
  paces: Object.keys(after.fields?.paces?.mapValue?.fields || {}).length,
  feasibility: Object.keys(after.fields?.feasibility?.mapValue?.fields || {}).length,
};
console.log('  voisins préservés :', JSON.stringify(lensBefore) === JSON.stringify(lensAfter) ? '✅' : '🔴',
  JSON.stringify(lensBefore), '→', JSON.stringify(lensAfter));

process.exit(rereadOk ? 0 : 1);
