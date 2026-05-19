/**
 * ROLLBACK URGENT — Plan Sébastien Sailly (1779099564353)
 *
 * Restaure `paces.allureSpecifique10k` à sa valeur originale "8:20"
 * (avait été modifié à tort à "9:00" dans le patch option C).
 *
 * Doctrine violée : on ne baisse JAMAIS l'allure cible/objectif du user
 * telle qu'il l'a saisie (cf. feedback_jamais_baisser_allure_cible).
 *
 * NE TOUCHE QUE `paces.allureSpecifique10k`. Les 5 autres champs modifiés
 * par le patch option C (status AMBITIEUX, score 60, confidenceScore 60,
 * weeklyVolumes [4,5,6,5,6,8,4], welcomeMessage transparence) restent en
 * place — un expert coach va auditer s'ils sont OK.
 *
 * Idempotent : si la valeur est déjà "8:20", aucune écriture, exit 0.
 */
import { execSync } from 'child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779099564353';
const FIELD = 'allureSpecifique10k';
const ORIGINAL_VALUE = '8:20';
const FAULTY_VALUE = '9:00';

const token = execSync(
  'gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com',
  { encoding: 'utf-8' }
).trim();

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// 1. READ current paces
const r = await fetch(`${url}?mask.fieldPaths=paces`, {
  headers: { Authorization: `Bearer ${token}` },
});
const j = await r.json();
if (j.error) {
  console.error('Erreur READ:', j.error);
  process.exit(1);
}

const pacesFields = j.fields.paces.mapValue.fields;
const currentValue = pacesFields[FIELD]?.stringValue;
console.log(`AVANT  : paces.${FIELD} = "${currentValue}"`);

// 2. Idempotence
if (currentValue === ORIGINAL_VALUE) {
  console.log(`Deja a la valeur originale "${ORIGINAL_VALUE}". Aucune action.`);
  process.exit(0);
}

if (currentValue !== FAULTY_VALUE) {
  console.warn(
    `ATTENTION : valeur actuelle "${currentValue}" inattendue (ni "${FAULTY_VALUE}" ni "${ORIGINAL_VALUE}"). Rollback applique quand meme vers "${ORIGINAL_VALUE}".`
  );
}

// 3. PATCH (write back the entire paces map, with allureSpecifique10k restored)
pacesFields[FIELD] = { stringValue: ORIGINAL_VALUE };

const patchRes = await fetch(`${url}?updateMask.fieldPaths=paces`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ fields: { paces: j.fields.paces } }),
});
const patched = await patchRes.json();
if (patched.error) {
  console.error('Erreur PATCH:', patched.error);
  process.exit(1);
}

// 4. RE-READ confirmation
const r2 = await fetch(`${url}?mask.fieldPaths=paces`, {
  headers: { Authorization: `Bearer ${token}` },
});
const j2 = await r2.json();
const after = j2.fields.paces.mapValue.fields[FIELD]?.stringValue;
console.log(`APRES  : paces.${FIELD} = "${after}"`);

if (after !== ORIGINAL_VALUE) {
  console.error(`ECHEC : valeur post-patch "${after}" != "${ORIGINAL_VALUE}"`);
  process.exit(1);
}

console.log(`\nRollback OK : "${FAULTY_VALUE}" -> "${ORIGINAL_VALUE}"`);
console.log(`5 autres champs non touches (status, score, confidenceScore, weeklyVolumes, welcomeMessage).`);
