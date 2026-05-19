import { execSync } from 'child_process';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778867644661';

// Get current welcome
const r0 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const plan = await r0.json();
const currentWelcome = plan.fields?.welcomeMessage?.stringValue || '';
console.log(`Welcome actuel (${currentWelcome.length} chars):\n---\n${currentWelcome}\n---\n`);

// Reformuler : supprimer les mentions "perte de poids" dans le corps du welcome
// Garder l'alerte légère en tête (qu'on a injectée), reformuler le reste
let newWelcome = currentWelcome
  .replace(/plan d'entraînement de 12 semaines pour la perte de poids/gi, "plan d'entraînement de 12 semaines axé endurance et régularité")
  .replace(/programme pour la perte de poids/gi, "programme endurance et régularité")
  .replace(/pour la perte de poids/gi, "pour ta progression endurance")
  .replace(/La clé de la perte de poids est la constance/gi, "La clé de la progression est la constance")
  .replace(/perte de poids/gi, "progression endurance"); // catch-all

console.log(`\nNouveau welcome (${newWelcome.length} chars):\n---\n${newWelcome}\n---\n`);

// Patch
const patchBody = {
  fields: { welcomeMessage: { stringValue: newWelcome } }
};
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=welcomeMessage`;
const r = await fetch(url, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody),
});
if (!r.ok) {
  const e = await r.json();
  console.log(`❌ ÉCHEC PATCH: ${r.status}`);
  console.log(JSON.stringify(e, null, 2).substring(0, 1500));
  process.exit(1);
}
console.log(`✅ Welcome Nanarebelle reformulé sans "perte de poids"`);

// Vérification
const rv = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { Authorization: `Bearer ${TOKEN}` }
});
const v = await rv.json();
const verifWelcome = v.fields?.welcomeMessage?.stringValue || '';
const stillContainsPdP = /\b(poids|minceur|corpulence|surpoids|kilos)\b/i.test(verifWelcome);
console.log(`\n🔍 Vérif post-patch : mots interdits dans welcome ? ${stillContainsPdP ? '❌ OUI' : '✅ NON'}`);
if (stillContainsPdP) {
  const matches = verifWelcome.match(/\b(poids|minceur|corpulence|surpoids|kilos)\b/gi) || [];
  console.log(`   Restant : ${matches.join(', ')}`);
}
