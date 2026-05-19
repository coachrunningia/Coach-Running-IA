/**
 * Patch live — Antoine (antoineg.gde@outlook.fr)
 * Plan: 1779086346189 — Préparation Marathon en 3h00 — 22 sem.
 * UID:  G1QYJ1KzqqWXoB5BbcjKQFmORC02
 *
 * Bug : formatTime() produisait "2h60min" (débordement d'arrondi : 2h + 60min au lieu de 3h00min).
 * Correction front déjà déployée (feasibilityService.ts) ; ce script corrige le plan déjà persisté.
 *
 * Patch ciblé : feasibility.message uniquement.
 *   "2h60min" → "3h00min"
 *
 * Réutilisable : adapter PLAN_ID + OLD_MESSAGE / NEW_MESSAGE.
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779086346189';
const BACKUP_PATH = new URL('./backup-plan-antoine-pre-patch.json', import.meta.url).pathname;

const OLD_MESSAGE = "Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ 2h60min. Ton objectif de 3h00min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.";
const NEW_MESSAGE = "Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ 3h00min. Ton objectif de 3h00min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.";

// 1. Read current state from Firestore
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const j = await r.json();
if (j.error) {
  console.error('🔴 Erreur lecture plan:', j.error);
  process.exit(1);
}

const currentMessage = j.fields?.feasibility?.mapValue?.fields?.message?.stringValue;
console.log('AVANT :');
console.log(`  "${currentMessage}"`);

// 2. Ensure backup exists (idempotent — n'écrase pas un backup pré-patch existant)
if (!existsSync(BACKUP_PATH)) {
  writeFileSync(BACKUP_PATH, JSON.stringify(j, null, 2));
  console.log(`\n💾 Backup créé : ${BACKUP_PATH}`);
} else {
  console.log(`\n💾 Backup déjà présent (préservé) : ${BACKUP_PATH}`);
}

// 3. Détection pattern "XhYY" où YY >= 60 (sécurité supplémentaire)
const overflowMatch = currentMessage?.match(/(\d+)h(\d{2})(min)?/g);
if (overflowMatch) {
  console.log(`\n🔍 Patterns "XhYY" détectés : ${JSON.stringify(overflowMatch)}`);
}

// 4. Si pas le bon OLD_MESSAGE, on s'arrête (safety)
if (currentMessage !== OLD_MESSAGE) {
  if (currentMessage === NEW_MESSAGE) {
    console.log('\n✅ Plan déjà patché (NEW_MESSAGE = état actuel). Rien à faire.');
    process.exit(0);
  }
  console.error("\n🔴 ABORT : message actuel ne correspond pas à OLD_MESSAGE attendu.");
  console.error('Attendu :', OLD_MESSAGE);
  console.error('Actuel  :', currentMessage);
  process.exit(1);
}

// 5. PATCH feasibility.message uniquement
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility.message`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fields: {
      feasibility: {
        mapValue: {
          fields: {
            message: { stringValue: NEW_MESSAGE },
          }
        }
      }
    }
  }),
});
const patched = await patchRes.json();
if (patched.error) {
  console.error('🔴 Erreur PATCH:', patched.error);
  process.exit(1);
}

const newMessage = patched.fields?.feasibility?.mapValue?.fields?.message?.stringValue;
console.log('\nAPRÈS :');
console.log(`  "${newMessage}"`);

// 6. Vérif autres champs feasibility intacts
const finalFeas = patched.fields?.feasibility?.mapValue?.fields;
console.log('\nVérif feasibility intact :');
console.log(`  status         = "${finalFeas?.status?.stringValue}"`);
console.log(`  safetyWarning  = "${finalFeas?.safetyWarning?.stringValue?.substring(0, 80)}..."`);

if (newMessage === NEW_MESSAGE) {
  console.log('\n✅ Patch appliqué avec succès — feasibility.message corrigé.');
} else {
  console.error('\n🔴 Mismatch après PATCH — message persisté ≠ NEW_MESSAGE.');
  process.exit(1);
}
