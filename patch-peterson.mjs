/**
 * Patch live plan y.petersonprivat (1779027192953) — Trail 50km/3500D+ IRRÉALISTE
 * Welcome + warning trop optimistes vs statut IRRÉALISTE/10 → reformulés.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1779027192953';

// Backup
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-peterson-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-peterson-${ts}.json`);

const oldFeas = doc.fields.feasibility?.mapValue?.fields;
console.log(`AVANT — welcome: "${doc.fields.welcomeMessage?.stringValue?.substring(0,150)}…"`);
console.log(`AVANT — warning: "${oldFeas?.safetyWarning?.stringValue}"`);

// Nouveau welcome — template Trail Finisher IRRÉALISTE
const firstName = (await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${doc.fields.userId.stringValue}`, { headers:H }).then(r=>r.json())).fields?.firstName?.stringValue;
const prenom = firstName ? ` ${firstName}` : '';

const newWelcome = `Bonjour${prenom},

Bienvenue dans ton plan d'entraînement pour ton trail 50 km / 3500 m D+ fin juillet.

⚠️ À savoir avant de démarrer : ton objectif est ambitieux compte tenu de ton profil actuel. Tu déclares un volume d'entraînement actuel de 31 km/sem alors qu'une préparation saine pour ce type de trail (50 km / 3500 D+) demande typiquement un volume au pic de 60 à 80 km/sem avec un volume de base solide. De plus, 11 semaines de préparation est court — la littérature recommande plutôt 22 à 36 semaines pour une montée en charge progressive sur ce type de format, sans risque de blessure ni d'abandon.

Nous classons ce plan comme IRRÉALISTE dans sa configuration actuelle, non pas parce que tu ne peux pas y arriver, mais parce que la combinaison "préparation courte + volume actuel insuffisant + dénivelé important" augmente significativement le risque de blessure (tendinopathies, fractures de fatigue, ITBS), de décompensation en course, ou d'abandon.

🎯 Trois options s'offrent à toi :

1. Reporter ta cible sur 2027 et suivre une préparation longue (6-9 mois) — c'est ce que nous te recommandons pour vivre cette aventure en toute sécurité.

2. Modifier l'objectif pour cette saison : viser plutôt un trail 15-25 km avec moins de dénivelé (ex : 1000 m D+), beaucoup plus accessible avec ton volume actuel, et conserver le 50 km / 3500 D+ comme objectif 2027.

3. Maintenir ce plan tel quel en sachant que tu prends un risque réel. Si tu choisis cette voie, écoute attentivement ton corps : douleurs articulaires/tendineuses persistantes, fatigue inhabituelle, sommeil dégradé → arrête immédiatement, consulte un kiné ou un médecin. Ne pousse pas en course si tu sens que ça ne passe pas.

Avec un entraînement régulier sur la durée, tu peux tout à fait progresser vers ce type d'objectif. La régularité prime sur la précipitation, surtout en trail montagne.

🩺 Avant de démarrer : un certificat médical d'aptitude à la course est INDISPENSABLE. Un bilan cardio-vasculaire (test d'effort) est fortement recommandé pour ce type d'engagement. Investis dans de bonnes chaussures de trail adaptées, travaille progressivement le D+ (renforcement excentrique des quadriceps pour les descentes), et reconnais le terrain en amont.

Bonne réflexion.`;

const newWarning = `IRRÉALISTE — Trail 50 km / 3500 D+ en 11 sem avec volume actuel 31 km/sem est très ambitieux pour ton profil. Risques majorés : tendinopathies, fractures de fatigue, ITBS (bandelette), décompensation en course, hypothermie ou blessure en montagne si tu pousses au-delà de tes capacités. Consulte impérativement un médecin du sport avant de démarrer (certificat + idéalement test d'effort). En course, ne reste jamais seul si tu sens que ça ne passe pas — abandonne plutôt que prendre des risques. Reconnais le parcours, équipe-toi correctement (couverture survie, sifflet, frontale), suis la météo. Ce plan est calibré pour s'approcher au mieux de ton objectif, mais l'objectif lui-même mérite d'être reconsidéré.`;

console.log(`\nAPRÈS — welcome: "${newWelcome.substring(0,150)}…"`);
console.log(`APRÈS — warning: "${newWarning.substring(0,150)}…"`);

const newFeasFields = {
  ...oldFeas,
  safetyWarning: { stringValue: newWarning },
};

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=welcomeMessage&updateMask.fieldPaths=feasibility`;
const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify({ fields: { welcomeMessage: { stringValue: newWelcome }, feasibility: { mapValue: { fields: newFeasFields } } } }) });
if (patch.status !== 200) { console.error(`❌ Patch failed`, await patch.text()); process.exit(1); }
console.log(`\n✅ Patch OK`);
