// PATCH IDEMPOTENT — welcomeMessage Alan Wentzel
// Cible : refléter le statut RISQUÉ (11 sem trop court pour 35 km / 1200 D+)
// Ne modifie QUE plans/{PLAN_ID}.welcomeMessage. Tout le reste intact.
//
// Doctrine respectée :
//   - feedback_securite_avant_conversion : transparence + décharge explicite
//   - feedback_compromis_messages_preventifs : message préventif, pas de blocage
//   - feedback_jamais_contact_client : aucun contact direct (juste le champ du plan)
//   - feedback_jamais_poids_minceur : zéro mot poids/IMC/minceur/silhouette/kilos
//   - feedback_mode_marche_course_scope : Alan = Confirmé, donc on parle "stratégie trail",
//     pas de "marche-course"
//
// Lance avec : node patch-alan-welcome.mjs [--dry]

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const UID = 'yzvy4Csd7OMYT7x5Xx6YPnFpML12';
const PLAN_ID = '1779114282783';
const DRY = process.argv.includes('--dry');

const NEW_WELCOME = [
  "Salut Alan, bienvenue dans ton plan Trail 35 km / 1200 m D+.",
  "",
  "On te le dit cash dès le départ : 11 semaines est court pour un trail 35 km / 1200 m D+. La fenêtre idéale serait 12 à 16 semaines pour limiter le risque de blessure et permettre une progression sereine, surtout sur la construction de la résistance en descente. Ton volume actuel (30 km/sem) est une vraie base solide, mais ton dénivelé hebdo (400 m) est très en-dessous de ce que demande la course.",
  "",
  "Si tu peux retarder ta course de 4 à 6 semaines, ce serait clairement optimal. Sinon, ce plan condense au mieux la préparation, mais avec une marge de sécurité réduite : on doit assumer ce compromis ensemble, en toute transparence.",
  "",
  "Concrètement, sur ces 11 semaines :",
  "- L'objectif reste 35 km / 1200 D+, on ne le baisse pas.",
  "- On va prioriser la régularité, la montée progressive du dénivelé et l'écoute du corps (fatigue, douleurs, sommeil).",
  "- En course comme à l'entraînement, marcher les montées raides est une stratégie trail normale et recommandée, pas un échec.",
  "- À la moindre douleur articulaire ou musculaire persistante, on adapte (réduction du volume, jour de repos en plus) plutôt que de forcer.",
  "",
  "Vu que c'est ton premier effort sur cette distance avec ce D+, une validation médicale en amont (certificat d'aptitude) est vivement conseillée avant de te lancer.",
  "",
  "On y va sérieusement, mais sans se mentir : ce plan est faisable, à condition de respecter ces garde-fous."
].join('\n');

// ─── helpers ────────────────────────────────────────────────────────────────
const token = () => execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();

async function readPlan(TOKEN) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  if (!r.ok) throw new Error(`READ ${r.status} ${await r.text()}`);
  return await r.json();
}

async function patchWelcome(TOKEN, value) {
  // updateMask=welcomeMessage → on ne touche QUE ce champ
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=welcomeMessage`;
  const body = { fields: { welcomeMessage: { stringValue: value } } };
  const r = await fetch(url,
    { method:'PATCH', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
  return await r.json();
}

// ─── garde-fous doctrine ────────────────────────────────────────────────────
const BANNED = ['poids','imc','minceur','silhouette','kilos','maigrir','corpulence','bmi'];
function assertNoBanned(txt) {
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
      throw new Error(`Doctrine violée : mot interdit "${w}" dans le welcomeMessage`);
    }
  }
}

// ─── main ───────────────────────────────────────────────────────────────────
const TOKEN = token();

// 0. doctrine local
assertNoBanned(NEW_WELCOME);

// 1. backup runtime si pas déjà fait
const BACKUP = '/Users/romanemarino/Coach-Running-IA/backup-plan-alan-pre-patch.json';
if (!existsSync(BACKUP)) {
  const before = await readPlan(TOKEN);
  writeFileSync(BACKUP, JSON.stringify(before, null, 2));
  console.log(`Backup créé → ${BACKUP}`);
} else {
  console.log(`Backup déjà présent (préservé) → ${BACKUP}`);
}

// 2. lecture pré-patch (idempotence)
const before = await readPlan(TOKEN);
const currentWelcome = before.fields?.welcomeMessage?.stringValue || '';
const currentStatus = before.fields?.feasibility?.mapValue?.fields?.status?.stringValue || '?';
const currentMessage = before.fields?.feasibility?.mapValue?.fields?.message?.stringValue || '';

console.log(`\n--- ÉTAT AVANT ---`);
console.log(`feasibility.status   = ${currentStatus}`);
console.log(`welcomeMessage (len) = ${currentWelcome.length}`);

if (currentWelcome === NEW_WELCOME) {
  console.log(`\n[IDEMPOTENT] welcomeMessage déjà à la cible. Rien à faire.`);
  process.exit(0);
}

console.log(`\n--- DIFF ---`);
console.log(`AVANT :\n${currentWelcome}\n`);
console.log(`APRES :\n${NEW_WELCOME}\n`);

if (DRY) {
  console.log(`[DRY] aucune écriture.`);
  process.exit(0);
}

// 3. patch
await patchWelcome(TOKEN, NEW_WELCOME);
console.log(`\nPATCH OK`);

// 4. re-read confirmation
const after = await readPlan(TOKEN);
const newWelcome = after.fields?.welcomeMessage?.stringValue || '';
const newStatus = after.fields?.feasibility?.mapValue?.fields?.status?.stringValue || '?';
const newMessage = after.fields?.feasibility?.mapValue?.fields?.message?.stringValue || '';
const pacesUnchanged = JSON.stringify(before.fields?.paces) === JSON.stringify(after.fields?.paces);
const weeksUnchanged = JSON.stringify(before.fields?.weeks) === JSON.stringify(after.fields?.weeks);
const feasibilityUnchanged = JSON.stringify(before.fields?.feasibility) === JSON.stringify(after.fields?.feasibility);

console.log(`\n--- RE-READ ---`);
console.log(`welcomeMessage == cible ? ${newWelcome === NEW_WELCOME ? 'OUI' : 'NON'}`);
console.log(`feasibility.status        = ${newStatus} (inchangé : ${newStatus === currentStatus})`);
console.log(`feasibility.message intact = ${newMessage === currentMessage}`);
console.log(`feasibility (objet) intact = ${feasibilityUnchanged}`);
console.log(`paces intact              = ${pacesUnchanged}`);
console.log(`weeks intact              = ${weeksUnchanged}`);

if (!feasibilityUnchanged || !pacesUnchanged || !weeksUnchanged || newWelcome !== NEW_WELCOME) {
  console.error(`\n[ALERTE] anomalie post-patch — vérifier manuellement.`);
  process.exit(1);
}
console.log(`\nOK — patch idempotent appliqué proprement.`);
