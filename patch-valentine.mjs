/**
 * Patch live Valentine (plan 1779029895523) — Trail 20km/1000D+ en 7 sem
 *
 * Profil : 21 ans, IMC 27.2, VMA 11.1 (= profil plus débutante qu'Intermédiaire
 * affiché), vol 25 km/sem, D+ 600 m/sem, 10km en 1h00 (allure 6:00/km).
 *
 * Pas IRRÉALISTE comme Peterson car son vol et son D+ couvrent largement la
 * course (20km/1000D+ vs vol 25 et D+ 600). MAIS 7 semaines de prépa pour
 * un trail 20km/1000D+ avec ce profil = court, marge faible, vigilance
 * articulaire (IMC 27 limite surpoids).
 *
 * Statut : EXCELLENT/85 → RISQUÉ/30
 * Welcome : reformulé bienveillant + options (reporter / marche-course / vigilance)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1779029895523';

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-valentine-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-valentine-${ts}.json`);

const oldFeas = doc.fields.feasibility?.mapValue?.fields;
console.log(`AVANT : ${oldFeas?.status?.stringValue}/${doc.fields.confidenceScore?.integerValue}`);

const newWelcome = `Bonjour Valentine,

Bienvenue dans ton plan d'entraînement pour ton trail 20 km / 1000 m D+ début juillet.

À savoir avant de démarrer : ton volume actuel (25 km/sem) et ton D+ hebdomadaire (600 m/sem) sont une bonne base pour ce trail. Ton corps connaît déjà le terrain vallonné, c'est un atout.

⚠️ En revanche, 7 semaines de préparation, c'est court pour un trail 20 km / 1000 D+ vu ton profil actuel. Pour démarrer la course à pied sereinement et sans risque de blessure (genoux, tendons), la littérature recommande plutôt 12 à 16 semaines de montée en charge progressive.

🎯 Trois options s'offrent à toi :

1. Reporter ta course à fin d'été / automne pour suivre une préparation plus longue et confortable — c'est ce que nous te recommandons.

2. Modifier l'objectif : viser une participation en marchant les montées et certaines descentes techniques. Très honorable et adapté à ton profil actuel, surtout sur 1000 D+.

3. Maintenir le plan tel quel en sachant que tu prends un risque réel d'inconfort, de blessure ou d'abandon. Si tu choisis cette voie, écoute attentivement ton corps : douleurs persistantes (genou, cheville, tendons), fatigue inhabituelle → arrête immédiatement.

🩺 Avant de démarrer : un certificat médical d'aptitude à la course à pied est INDISPENSABLE. Investis dans de bonnes chaussures de trail avec un bon amorti, privilégie les surfaces souples à l'entraînement (chemins, terre, herbe), et marche les descentes techniques si tu sens que ça force trop sur les articulations.

Avec un entraînement régulier sur la durée, tu pourras tout à fait progresser et viser ce trail (ou un autre) dans des conditions sereines. La régularité prime sur la précipitation.

Bonne réflexion.`;

const newWarning = `Plan court (7 sem) pour ton profil. Privilégie les chaussures avec un bon amorti, les surfaces souples à l'entraînement, et marche les descentes raides à l'entraînement comme en course. Hydrate-toi bien, échauffe-toi systématiquement (10 min de marche progressive), et consulte ton médecin avant de démarrer. Écoute ton corps : douleur articulaire persistante → arrête, repos ou avis kiné.`;

const newFeasFields = {
  ...oldFeas,
  status: { stringValue: 'RISQUÉ' },
  score: { integerValue: '30' },
  safetyWarning: { stringValue: newWarning },
};

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility&updateMask.fieldPaths=confidenceScore&updateMask.fieldPaths=welcomeMessage`;
const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify({ fields: { feasibility: { mapValue: { fields: newFeasFields } }, confidenceScore: { integerValue: '30' }, welcomeMessage: { stringValue: newWelcome } } }) });
if (patch.status !== 200) { console.error(`❌`, await patch.text()); process.exit(1); }

const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await v.json();
console.log(`APRÈS : ${vj.fields.feasibility?.mapValue?.fields?.status?.stringValue}/${vj.fields.confidenceScore?.integerValue}`);
console.log(`✅ Patch Valentine OK`);
