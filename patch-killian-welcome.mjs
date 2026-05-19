/**
 * Repatch ciblé : régénère le welcomeMessage de Killian (plan 1779006774503)
 * pour inclure la nouvelle mention santé/reprise perte-de-poids.
 *
 * Approche : on ne re-génère PAS le plan via Gemini (risque de modifier les
 * séances). On écrit directement un welcomeMessage manuel qui respecte la
 * nouvelle doctrine, puis on patche le doc Firestore en place.
 * Backup avant.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

const PLAN_ID = '1779006774503';

// 1. Backup
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const before = await r.json();
const ts = new Date().toISOString().replace(/[:.]/g,'-');
writeFileSync(`backup-killian-welcome-${ts}.json`, JSON.stringify(before, null, 2));
console.log(`📦 backup-killian-welcome-${ts}.json`);

const oldWelcome = before.fields?.welcomeMessage?.stringValue || '';
console.log(`\n── AVANT ──\n${oldWelcome}`);

// 2. Nouveau welcomeMessage — respecte la nouvelle doctrine
const newWelcome = `Bienvenue dans ton plan d'entraînement de 12 semaines, conçu spécifiquement pour la perte de poids. Cet objectif sera atteint par la régularité et une progression douce de ton volume d'entraînement, en te concentrant sur l'endurance fondamentale. Ce programme est structuré en phases : 'fondamental' pour construire tes bases, 'développement' pour augmenter légèrement l'intensité, et 'récupération' pour assimiler la charge.

🩺 IMPORTANT — Santé et reprise : nous te recommandons de consulter ton médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. Si tu reprends après une longue pause sans activité régulière, un avis médical avec test d'effort est particulièrement recommandé (surtout si tu as des antécédents cardio, des facteurs de risque, ou plus de 35 ans). Écoute ton corps dès les premières séances : essoufflement anormal, douleur thoracique, vertiges → arrête immédiatement et consulte.

🏃 Pour bien démarrer : un échauffement long (10 min minimum) avant chaque séance et des chaussures adaptées avec bon amorti sont essentiels — les articulations sont souvent peu sollicitées en reprise et demandent à être ménagées. Mieux vaut 3 séances faciles tenues qu'un plan trop ambitieux abandonné. Et si une douleur articulaire (genou, cheville, hanche) persiste, prends un avis kiné/médical avant de continuer.`;

console.log(`\n── APRÈS ──\n${newWelcome}`);

// 3. Patch
const patch = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=welcomeMessage`, {
  method:'PATCH', headers:H,
  body: JSON.stringify({ fields:{ welcomeMessage: { stringValue: newWelcome } } })
});
const patchJ = await patch.json();
if(patch.status !== 200){ console.error(`❌ Patch failed (${patch.status}):`, JSON.stringify(patchJ)); process.exit(1); }
console.log(`\n✅ welcomeMessage patché sur plan ${PLAN_ID}`);
