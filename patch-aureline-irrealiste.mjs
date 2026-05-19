/**
 * Patch live Aureline (plan 1778575564571) :
 *   - feasibility.status : RISQUÉ → IRRÉALISTE
 *   - feasibility.score : 35 → 15
 *   - confidenceScore : aligné
 *   - welcomeMessage : refait pour refléter réalité (7 sem trop court pour son profil)
 *
 * Justification : Débutante (0-1 an) + IMC 31.6 (obésité classe 1) + vol actuel 0 km/sem
 * + trail 6km/150D+ en SEULEMENT 7 semaines = combinaison inadaptée. Standard littérature
 * pour débutante sédentaire obèse : 16-20 semaines minimum pour préparation trail court.
 * 7 sem est insuffisant pour adaptations cardiovasculaires + ostéo-tendineuses + perte de
 * masse grasse nécessaires.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1778575564571';

// 1. Backup
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-aureline-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-aureline-${ts}.json`);

const oldFeas = doc.fields.feasibility?.mapValue?.fields;
console.log(`\n── AVANT ──`);
console.log(`  feasibility.status: ${oldFeas?.status?.stringValue}`);
console.log(`  feasibility.score: ${oldFeas?.score?.integerValue || oldFeas?.score?.doubleValue}`);
console.log(`  confidenceScore: ${doc.fields.confidenceScore?.integerValue}`);

// 2. Nouveau feasibility (clone tout, change status + score)
const newFeasFields = {
  ...oldFeas,
  status: { stringValue: 'IRRÉALISTE' },
  score: { integerValue: '15' },
};

// 3. Nouveau welcomeMessage — transparent, doctrine sécurité>conversion, ton coach bienveillant
const newWelcome = `Bonjour Aureline,

Bienvenue dans ton plan d'entraînement pour ton trail 6 km / 150 D+ à Autechaux fin juin.

⚠️ **À savoir avant de démarrer** : tu pars de zéro en course à pied (volume actuel 0 km/sem) et ton profil demande une préparation particulièrement progressive et prudente. **7 semaines, c'est court** pour préparer sereinement un trail dans ces conditions — la littérature recommande plutôt 16 à 20 semaines pour ce type de profil débutant.

Nous classons ce plan comme **IRRÉALISTE** dans sa configuration actuelle, non pas parce que tu ne peux pas le faire, mais parce que la combinaison "préparation très courte + débutante sédentaire" augmente significativement le risque de blessure (genoux, tendons d'Achille, périoste tibial) et d'abandon.

🎯 **Trois options s'offrent à toi** :

1. **Reporter ta course** à l'automne ou l'année prochaine, et suivre un plan de préparation sur 16+ semaines. C'est l'option que nous te recommandons pour vivre cette aventure dans les meilleures conditions.

2. **Modifier l'objectif** : viser une simple participation en **marchant la majorité du parcours** (90% marche / 10% course par exemple). C'est tout à fait honorable et adapté à ton profil actuel.

3. **Maintenir le plan tel quel** en sachant que tu prends un risque réel. Si tu choisis cette voie, écoute attentivement ton corps : douleur articulaire, gêne respiratoire, fatigue inhabituelle → arrête immédiatement et consulte.

🩺 **Quelle que soit ton option** : un certificat médical d'aptitude à la course à pied est INDISPENSABLE avant de démarrer. Un bilan cardio-vasculaire (test d'effort) est fortement recommandé. Investis dans de bonnes chaussures de running avec un amorti renforcé, privilégie les surfaces souples (herbe, terre, chemin), commence systématiquement par 10 minutes de marche d'échauffement.

Avec un entraînement régulier sur la durée, tu peux tout à fait progresser et viser ce trail (ou un autre) dans des conditions plus sereines. La régularité prime sur la vitesse.

Bonne réflexion, et n'hésite pas à ajuster ta cible si besoin.`;

console.log(`\n── APRÈS ──`);
console.log(`  feasibility.status: IRRÉALISTE`);
console.log(`  feasibility.score: 15`);
console.log(`  confidenceScore: 15`);
console.log(`  welcomeMessage: (${newWelcome.length} chars, début : "${newWelcome.substring(0,200)}…")`);

// 4. PATCH
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility&updateMask.fieldPaths=confidenceScore&updateMask.fieldPaths=welcomeMessage`;
const body = {
  fields: {
    feasibility: { mapValue: { fields: newFeasFields } },
    confidenceScore: { integerValue: '15' },
    welcomeMessage: { stringValue: newWelcome },
  }
};
const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify(body) });
const pj = await patch.json();
if(patch.status !== 200){ console.error(`❌ Patch failed (${patch.status}):`, JSON.stringify(pj).substring(0,500)); process.exit(1); }

// 5. Vérif
const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await v.json();
console.log(`\n✅ Patch OK`);
console.log(`  Vérif statut en base : ${vj.fields.feasibility?.mapValue?.fields?.status?.stringValue}/${vj.fields.feasibility?.mapValue?.fields?.score?.integerValue}`);
