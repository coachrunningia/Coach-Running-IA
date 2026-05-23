import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const planId = '1779456984279';
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;

// Doctrine `feedback_input_client_obligatoire` : on ne SUGGÈRE MÊME PAS de changer la fréquence.
// On reste sur ce qu'il a saisi (2 courses + 1 renfo), on optimise au mieux, point.
// On garde la transparence sur le bottleneck physique sans suggérer.
const NEW_WELCOME = `Bienvenue dans ta préparation pour le semi-marathon en 1h45 du 1er novembre 2026.

Avant d'attaquer, deux points de transparence essentiels :

1) Ton PB semi actuel est 2h04, viser 1h45 demande un gain de 19 min sur 21,1 km (-15%). C'est un objectif AMBITIEUX qui suppose une vraie progression VMA + seuil. On respecte ta cible (allure 4:59/km), mais sois conscient que le gap théorique-réel est important. Notre estimation honnête de ce que tu peux faire avec ce plan : 1h54 (encadré jaune ci-dessous).

2) Tu as choisi 3 séances/sem dont 1 renforcement = 2 séances course/sem. C'est la formule qu'on a calibrée pour toi et qu'on respecte. À ce rythme, le plafond physique de progression est nécessairement plus modeste que pour un coureur qui s'entraîne 4-5 fois par semaine. On optimise au maximum avec tes 2 séances course : footing court de mise en route le mardi, sortie longue clé le samedi. Le renforcement quadriceps/gainage du jeudi est essentiel pour soutenir la charge sans blessure.

Pourquoi 20 semaines ? Parce qu'avec un gap de 15% à combler, on a précisément besoin de ce temps pour développer VMA et seuil sans te griller. Une prépa plus courte (8-12 sem) ne te ferait que maintenir ton niveau actuel.

Structure du plan : phase fondamentale (S1-S6) pour bâtir la base aérobie, développement (S8-S12) pour le seuil, spécifique (S14-S18) pour l'allure semi, affûtage (S19-S20).

Nous te recommandons de consulter un médecin avant de débuter ce programme et d'obtenir un certificat médical d'aptitude au sport.`;

const toFs = (v) => typeof v === 'string' ? { stringValue: v } : null;
const patchRes = await fetch(`${url}?updateMask.fieldPaths=welcomeMessage`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { welcomeMessage: toFs(NEW_WELCOME) } }),
});
const r = await patchRes.json();
if (r.error) { console.error('❌', JSON.stringify(r.error)); process.exit(1); }
console.log(`✅ welcomeMessage patché — updateTime: ${r.updateTime}`);
console.log(`   ${NEW_WELCOME.length} chars`);
console.log(`   Suggestion "tu peux ajouter une séance" SUPPRIMÉE`);
console.log(`   Doctrine feedback_input_client_obligatoire respectée strictement`);
