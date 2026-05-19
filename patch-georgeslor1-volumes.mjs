/**
 * Patch live volumes — plan georgeslor1@gmail.com (1779089493075)
 * UID oWrcHj2F1CQsL34K3KS0ZMc7Olg1 — Marathon 4h45 en 22 sem.
 *
 * Doctrine appliquée :
 * - Romane veut pic 50 km/sem au lieu de 48 (pas 60-70, on ne surcharge pas un
 *   profil 57 ans + 90 kg + override Débutant).
 * - Code patché en amont pour futurs users (cf. INVESTIGATION-CAP-VOLUME-EXPERT.md).
 * - Pour ce plan existant : application d'un facteur multiplicateur proportionnel
 *   ×(50/48) = ×1.0417 sur TOUS les volumes hebdo (préserve la périodisation,
 *   les récup et l'affûtage relatifs).
 * - Ne touche PAS feasibility / welcomeMessage / confidenceScore (autre agent).
 * - Backup avant write, re-read après pour confirmer.
 *
 * Champs modifiés (1) :
 *   - generationContext.periodizationPlan.weeklyVolumes
 *
 * Idempotent — la 2e exécution doit retomber sur les mêmes valeurs (pic ≥ 50).
 */
import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779089493075';
const BACKUP_PATH = `${process.env.HOME}/Coach-Running-IA/backup-volumes-georgeslor1-pre-patch.json`;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const TOKEN = execSync(
  `gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio: ['pipe', 'pipe', 'pipe'] },
).toString().trim();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT,
};

// ---------- 1. Read AVANT + backup ----------
console.log('[read] Fetching plan…');
const before = await (await fetch(BASE_URL, { headers: H })).json();
if (before.error) {
  console.error('[read] ÉCHEC:', before.error);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_PATH)) {
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(before, null, 2));
  console.log(`[backup] ${BACKUP_PATH} (${fs.statSync(BACKUP_PATH).size} bytes)`);
} else {
  console.log(`[backup] Existant déjà (${fs.statSync(BACKUP_PATH).size} bytes) — pas réécrit`);
}

const ppField = before.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
if (!ppField) {
  console.error('[read] generationContext.periodizationPlan introuvable');
  process.exit(1);
}
const oldVolumes = (ppField.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const oldPeak = Math.max(...oldVolumes);
const oldSum = oldVolumes.reduce((s, v) => s + v, 0);

console.log('\n── AVANT ──');
console.log(`  weeklyVolumes: [${oldVolumes.join(', ')}]`);
console.log(`  pic: ${oldPeak} km`);
console.log(`  total: ${oldSum} km`);

// ---------- 2. Cible : pic = 50 km via facteur proportionnel × 1.0417 ----------
// Le facteur multiplie chaque semaine puis arrondit à l'entier (cohérent avec
// le format Firestore integerValue et avec ce que produit la code path en amont).
// Ne modifie pas les positions relatives (récup, affûtage, ondulations).
const TARGET_PEAK = 50;
const factor = TARGET_PEAK / oldPeak; // 50 / 48 = 1.04166…
const newVolumes = oldVolumes.map(v => Math.round(v * factor));

// Sanity : si l'arrondi n'a pas amené le pic à 50, on force le pic exact à 50
// (en relevant la (les) semaine(s) max d'1 km — sans toucher les autres).
let newPeak = Math.max(...newVolumes);
if (newPeak < TARGET_PEAK) {
  for (let i = 0; i < newVolumes.length; i++) {
    if (newVolumes[i] === newPeak) newVolumes[i] = TARGET_PEAK;
  }
  newPeak = Math.max(...newVolumes);
}

const newSum = newVolumes.reduce((s, v) => s + v, 0);

console.log('\n── APRÈS ──');
console.log(`  weeklyVolumes: [${newVolumes.join(', ')}]`);
console.log(`  pic: ${newPeak} km (cible ${TARGET_PEAK})`);
console.log(`  total: ${newSum} km (Δ +${newSum - oldSum} km)`);

// ---------- 3. Sanity check progressions (max +20%/sem hors affûtage) ----------
const deltas = [];
for (let i = 1; i < newVolumes.length; i++) {
  const d = ((newVolumes[i] - newVolumes[i - 1]) / newVolumes[i - 1]) * 100;
  deltas.push(d);
}
const maxJump = Math.max(...deltas);
console.log(`\n  max progression intra-plan: +${maxJump.toFixed(1)}%`);
if (maxJump > 25) {
  console.error('🔴 Saut intra-plan > 25%, abort');
  process.exit(1);
}

if (newPeak < TARGET_PEAK) {
  console.error(`🔴 pic ${newPeak} < cible ${TARGET_PEAK}, abort`);
  process.exit(1);
}
if (newPeak > TARGET_PEAK + 1) {
  console.error(`🔴 pic ${newPeak} > cible + tolérance (${TARGET_PEAK + 1}), abort`);
  process.exit(1);
}

// ---------- 4. PATCH (updateMask ciblé sur weeklyVolumes uniquement) ----------
// On n'écrit QUE generationContext.periodizationPlan.weeklyVolumes (pas weeklyPhases,
// recoveryWeeks, totalWeeks). Le updateMask Firestore préserve tout le reste de
// generationContext (feasibility, welcomeMessage, confidenceScore, etc. ne sont
// pas dedans — ils sont au niveau racine, donc safe par construction).
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
                    values: newVolumes.map(v => ({ integerValue: String(v) })),
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
const url = `${BASE_URL}?updateMask.fieldPaths=${encodeURIComponent('generationContext.periodizationPlan.weeklyVolumes')}`;
console.log('\n[write] PATCH Firestore en cours…');
const patchRes = await fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
const patched = await patchRes.json();
if (patched.error) {
  console.error('🔴 PATCH ÉCHEC :', JSON.stringify(patched.error, null, 2));
  process.exit(1);
}
console.log(`[write] PATCH OK (HTTP ${patchRes.status})`);

// ---------- 5. Re-read pour confirmer ----------
const after = await (await fetch(BASE_URL, { headers: H })).json();
const afterPP = after.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
const afterVolumes = (afterPP?.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const afterPeak = Math.max(...afterVolumes);

console.log('\n── RE-READ (post-write) ──');
console.log(`  weeklyVolumes: [${afterVolumes.join(', ')}]`);
console.log(`  pic: ${afterPeak} km`);

// ---------- 6. Vérif que weeklyPhases / recoveryWeeks / totalWeeks intacts ----------
const beforePhases = (ppField.weeklyPhases?.arrayValue?.values || []).map(v => v.stringValue);
const afterPhases = (afterPP?.weeklyPhases?.arrayValue?.values || []).map(v => v.stringValue);
const beforeRecov = (ppField.recoveryWeeks?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const afterRecov = (afterPP?.recoveryWeeks?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
const beforeTw = parseInt(ppField.totalWeeks?.integerValue);
const afterTw = parseInt(afterPP?.totalWeeks?.integerValue);

const phasesOK = JSON.stringify(beforePhases) === JSON.stringify(afterPhases);
const recovOK = JSON.stringify(beforeRecov) === JSON.stringify(afterRecov);
const twOK = beforeTw === afterTw;

console.log(`  weeklyPhases inchangées : ${phasesOK ? '✅' : '🔴 MODIFIÉES'}`);
console.log(`  recoveryWeeks inchangées: ${recovOK ? '✅' : '🔴 MODIFIÉES'}`);
console.log(`  totalWeeks inchangé     : ${twOK ? '✅' : '🔴 MODIFIÉ'}`);

// ---------- 7. Vérif que feasibility / welcomeMessage / confidenceScore intacts ----------
const fields = ['feasibility', 'welcomeMessage', 'confidenceScore'];
let untouchedOK = true;
for (const f of fields) {
  const a = JSON.stringify(before.fields?.[f] || null);
  const b = JSON.stringify(after.fields?.[f] || null);
  const eq = a === b;
  console.log(`  ${eq ? '✅' : '🔴'} ${f} ${eq ? 'inchangé' : 'MODIFIÉ (régression !)'}`);
  if (!eq) untouchedOK = false;
}

// ---------- 8. Verdict final ----------
const allOK = phasesOK && recovOK && twOK && untouchedOK && afterPeak >= TARGET_PEAK;
if (!allOK) {
  console.error('\n🔴 Au moins une vérif a échoué.');
  process.exit(2);
}
console.log(`\n✅ Patch volumes appliqué : pic ${oldPeak} → ${afterPeak} (cible ${TARGET_PEAK}), backup ${BACKUP_PATH}`);
