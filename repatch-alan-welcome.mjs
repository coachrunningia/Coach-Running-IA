// RE-PATCH IDEMPOTENT — welcomeMessage Alan Wentzel (v2 — version "mix")
// Cible : mix entre l'ancien welcome (pédagogique) et le nouveau (transparent).
// Le précédent (patch-alan-welcome.mjs) était jugé trop violent ("on te le dit cash",
// "on doit assumer ce compromis ensemble", "On y va sérieusement, mais sans se mentir").
// Cette version remet l'aspect pédagogique au centre, tout en gardant des alertes brèves
// et factuelles (11 sem court, D+ actuel sous-dimensionné).
//
// Ne modifie QUE plans/{PLAN_ID}.welcomeMessage. Tout le reste intact.
//
// Doctrine respectée :
//   - feedback_securite_avant_conversion : transparence + décharge médicale rappelée
//   - feedback_compromis_messages_preventifs : message préventif, ton respectueux
//   - feedback_jamais_contact_client : aucun contact direct (juste le champ du plan)
//   - feedback_jamais_poids_minceur : zéro mot poids/IMC/minceur/silhouette/kilos
//   - feedback_mode_marche_course_scope : Alan = Confirmé → "stratégie trail", pas "marche-course"
//   - feedback_chaque_ligne_justifiee : remplacement documenté ci-dessus
//
// Lance avec : node repatch-alan-welcome.mjs [--dry]

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const UID = 'yzvy4Csd7OMYT7x5Xx6YPnFpML12';
const PLAN_ID = '1779114282783';
const DRY = process.argv.includes('--dry');

// Nouvelle cible : mix pédagogique + alertes brèves, ton respectueux.
const NEW_WELCOME = [
  "Bienvenue Alan ! Ton plan Trail 35 km / 1200 m D+ est conçu pour bâtir progressivement ton endurance et ta résilience spécifique au trail en 11 semaines.",
  "",
  "⚠️ Petite note de transparence : 11 semaines, c'est court pour un trail 35 km / 1200 D+ — la fenêtre idéale serait 12-16 semaines. Ton volume actuel (30 km/sem) est solide, mais ton dénivelé hebdo (400 m) est en-dessous de ce que demande la course. On va donc pousser progressivement le dénivelé.",
  "",
  "La première semaine, en phase fondamentale, met l'accent sur le développement de la base aérobie et l'adaptation à des volumes croissants sur des terrains variés. Sur les semaines suivantes, le plan augmente la fréquence de séances vallonnées et la durée des sorties longues pour préparer ton corps aux exigences du jour J.",
  "",
  "Quelques règles d'or sur ces 11 semaines :",
  "- L'objectif 35 km reste l'objectif — on ne baisse rien, on optimise le temps disponible",
  "- Marche les montées raides à l'entraînement comme en course : stratégie trail normale",
  "- Écoute ton corps : à la moindre douleur articulaire ou tendineuse, on adapte plutôt que forcer",
  "",
  "Avant de débuter, un certificat médical d'aptitude au sport reste fortement recommandé."
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

// Canonicalisation ordre-insensible : Firestore ne garantit pas l'ordre des
// clés d'un mapValue dans la réponse GET, donc JSON.stringify direct produit
// des faux positifs. On normalise les clés avant comparaison.
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
    return out;
  }
  return v;
}
const deepEq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

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

// Garantir que l'objectif 35 km n'est pas baissé : la chaîne "35 km" doit rester présente
function assertObjectifIntact(txt) {
  if (!txt.includes('35 km')) {
    throw new Error(`Doctrine violée : l'objectif "35 km" doit rester mentionné dans le welcomeMessage`);
  }
}

// ─── main ───────────────────────────────────────────────────────────────────
const TOKEN = token();

// 0. doctrine local
assertNoBanned(NEW_WELCOME);
assertObjectifIntact(NEW_WELCOME);

// 1. backup runtime additionnel (pré-repatch)
const BACKUP = '/Users/romanemarino/Coach-Running-IA/backup-plan-alan-pre-repatch-welcome.json';
if (!existsSync(BACKUP)) {
  const before = await readPlan(TOKEN);
  writeFileSync(BACKUP, JSON.stringify(before, null, 2));
  console.log(`Backup pré-repatch créé → ${BACKUP}`);
} else {
  console.log(`Backup pré-repatch déjà présent (préservé) → ${BACKUP}`);
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
const pacesUnchanged = deepEq(before.fields?.paces, after.fields?.paces);
const weeksUnchanged = deepEq(before.fields?.weeks, after.fields?.weeks);
const feasibilityUnchanged = deepEq(before.fields?.feasibility, after.fields?.feasibility);

console.log(`\n--- RE-READ ---`);
console.log(`welcomeMessage == cible ?   ${newWelcome === NEW_WELCOME ? 'OUI' : 'NON'}`);
console.log(`feasibility.status          = ${newStatus} (inchangé : ${newStatus === currentStatus})`);
console.log(`feasibility.message intact  = ${newMessage === currentMessage}`);
console.log(`feasibility (objet) intact  = ${feasibilityUnchanged}`);
console.log(`paces intact                = ${pacesUnchanged}`);
console.log(`weeks intact                = ${weeksUnchanged}`);

if (!feasibilityUnchanged || !pacesUnchanged || !weeksUnchanged || newWelcome !== NEW_WELCOME) {
  console.error(`\n[ALERTE] anomalie post-patch — vérifier manuellement.`);
  process.exit(1);
}

// 5. doctrine post-patch (re-vérif sur la valeur réellement écrite)
assertNoBanned(newWelcome);
assertObjectifIntact(newWelcome);

console.log(`\nOK — re-patch idempotent appliqué proprement.`);
