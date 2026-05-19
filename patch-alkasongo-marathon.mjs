/**
 * Patch LIVE al1.kasongo plan 1778927329896 (Marathon 3h30) :
 * - paces.allureSpecifiqueMarathon : "5:12" → "4:59" (allure cible 3h30/42.195km)
 * - feasibility.status : "EXCELLENT" → "AMBITIEUX" (84% VMA = au-dessus fourchette 78-82%)
 * - feasibility.score / confidenceScore : 87 → 65
 * - welcomeMessage : reformulé pour refléter le caractère ambitieux
 * Backup avant.
 *
 * Contexte : ce plan a été généré avec l'ancien code asymétrique (commit 94af713
 * du 24 avril) qui ne déclenchait l'override d'allure QUE si la cible était plus
 * lente que le potentiel VMA. Cible 3h30 = 4:59 < potentiel 5:12 → override ignoré.
 * Le fix bidirectionnel est en local, sera déployé ensuite (prio 2).
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1778927329896';

// 1. Backup
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const doc = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-alkasongo-${ts}.json`, JSON.stringify(doc, null, 2));
console.log(`📦 backup-alkasongo-${ts}.json`);

const oldPaces = doc.fields?.paces?.mapValue?.fields;
const oldFeas = doc.fields?.feasibility?.mapValue?.fields;
console.log(`\n── AVANT ──`);
console.log(`  paces.allureSpecifiqueMarathon : ${oldPaces?.allureSpecifiqueMarathon?.stringValue}`);
console.log(`  feasibility.status             : ${oldFeas?.status?.stringValue}`);
console.log(`  feasibility.score              : ${oldFeas?.score?.integerValue || oldFeas?.score?.doubleValue}`);
console.log(`  confidenceScore                : ${doc.fields?.confidenceScore?.integerValue || doc.fields?.confidenceScore?.doubleValue}`);
console.log(`  welcomeMessage (premier 200c) : "${doc.fields?.welcomeMessage?.stringValue?.substring(0,200)}…"`);

// 2. Construire le nouveau paces (clone tout, change marathon)
const newPacesFields = { ...oldPaces, allureSpecifiqueMarathon: { stringValue: '4:59' } };

// 3. Nouveau feasibility (clone tout, change status + score)
const newFeasFields = {
  ...oldFeas,
  status: { stringValue: 'AMBITIEUX' },
  score: { integerValue: '65' },
};

// 4. Nouveau welcomeMessage (transparent, doctrine : on n'embellit pas un plan ambitieux)
const newWelcome = `Félicitations pour ton engagement dans la préparation du Marathon de Paris en 3h30 ! Ton objectif est ambitieux : il représente -1 minute sur ton meilleur marathon récent (3h31), avec une allure spécifique de 4:59/km (84% de ta VMA actuelle, légèrement au-dessus de la fourchette confortable 78-82% pour marathon). C'est tenable car tu as la preuve que tu sais courir à ce niveau, mais ça demandera de la rigueur sur les séances spécifiques marathon et de la régularité sur les 27 semaines.

Ce plan est structuré en plusieurs phases progressives, débutant par le développement de ton endurance fondamentale, puis intégrant progressivement des séances de développement et spécifiques à allure cible.

🩺 À 45 ans, nous te recommandons vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance.`;

// 5. PATCH via updateMask
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=paces&updateMask.fieldPaths=feasibility&updateMask.fieldPaths=confidenceScore&updateMask.fieldPaths=welcomeMessage`;
const body = {
  fields: {
    paces: { mapValue: { fields: newPacesFields } },
    feasibility: { mapValue: { fields: newFeasFields } },
    confidenceScore: { integerValue: '65' },
    welcomeMessage: { stringValue: newWelcome },
  }
};

const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify(body) });
const pj = await patch.json();
if(patch.status !== 200){ console.error(`❌ Patch failed (${patch.status}):`, JSON.stringify(pj).substring(0,500)); process.exit(1); }

// 6. Vérif
const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await v.json();
console.log(`\n── APRÈS (vérif base) ──`);
console.log(`  paces.allureSpecifiqueMarathon : ${vj.fields?.paces?.mapValue?.fields?.allureSpecifiqueMarathon?.stringValue}`);
console.log(`  feasibility.status             : ${vj.fields?.feasibility?.mapValue?.fields?.status?.stringValue}`);
console.log(`  feasibility.score              : ${vj.fields?.feasibility?.mapValue?.fields?.score?.integerValue}`);
console.log(`  confidenceScore                : ${vj.fields?.confidenceScore?.integerValue}`);
console.log(`  welcomeMessage (premier 200c) : "${vj.fields?.welcomeMessage?.stringValue?.substring(0,200)}…"`);
console.log(`\n✅ patch al1.kasongo OK`);
