#!/usr/bin/env node
/**
 * patch-robine-faux-positif-27mai.mjs
 *
 * Robine plan (1779898894672) — fix faux-positif F-13 partiel.
 * Le score 5 IRRÉALISTE utilise VMA brute 8.3 alors que user a ajusté à 10.
 * Sur VMA ajustée 10 : 1h15 sur 10K = 80% VMA = AMBITIEUX (Daniels VDOT).
 *
 * Patches :
 * - status IRRÉALISTE → AMBITIEUX
 * - score 5 → 50
 * - message refondu sur VMA effective 10
 * - recommendation refondu (1h15 reste objectif)
 * - welcomeMessage refondu cohérent
 * - allures sessions INCHANGÉES (10:47/km sur VMA brute 8.3) — sécurité prime
 *
 * Doctrines : feedback_securite_avant_conversion, jamais_baisser_allure_cible
 * (on monte pas, on garde), jamais_poids_minceur, input_client_obligatoire.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PLAN_ID = '1779898894672';
const EXPECTED_EMAIL = 'robineregina@gmail.com';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/backups-robine-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80*1024*1024 }).toString());

const NEW_FEAS_MESSAGE = `Ton objectif 1h15 sur 10K est ambitieux mais cohérent avec ta VMA ajustée à 10 km/h (que tu as déclarée). Sur cette VMA, 1h15 demande de tenir 80% de tes capacités — c'est dans la zone Daniels VDOT atteignable avec une préparation rigoureuse. Les allures d'entraînement EF restent calibrées sur ta VMA initiale 8.3 km/h pour démarrer en douceur les premières semaines. Recalibrage possible S2-S3 selon ton ressenti.`;

const NEW_FEAS_RECO = `Maintenir l'objectif 1h15 sur 10K avec ta VMA ajustée à 10 km/h. Si les allures d'entraînement te semblent trop faciles dès S1-S2, on recalibre ensemble vers la VMA 10. Si elles te semblent trop dures, c'est que la VMA brute 8.3 est plus proche de la réalité — on adapte l'objectif à la baisse en accord.`;

const NEW_SAFETY = `À 47 ans, consulte ton médecin pour un certificat d'aptitude avant de démarrer. Idéalement un test d'effort. Accorde-toi 48h de récupération minimum entre les séances et écoute ton corps. À la moindre douleur articulaire ou tendineuse qui persiste 48h, tu stoppes et tu consultes un kiné du sport.`;

const NEW_WELCOME = `Bienvenue Robine,

Ton objectif 1h15 sur 10K est ambitieux mais cohérent avec ta VMA ajustée à 10 km/h. À 80% de tes capacités déclarées, c'est dans la zone atteignable avec une préparation rigoureuse.

Quelques points importants avant qu'on démarre :

Tes allures d'entraînement (EF, seuil, VMA) sont calibrées sur ta VMA initiale 8.3 km/h pour démarrer en douceur les 2-3 premières semaines. C'est une sécurité : si ta VMA réelle est plus proche de 8.3 que de 10, le plan reste tenable. Si tu sens que les allures sont trop faciles dès S1-S2, on recalibrera ensemble vers ton ajustement à 10.

À 47 ans, on te recommande un certificat médical d'aptitude avant de démarrer, idéalement un test d'effort.

Ce plan de 16 semaines va construire ta base aérobie + ton seuil pour passer la ligne en pleine forme. La régularité prime sur l'intensité.

Romane et moi sommes là. Bon vent.`;

console.log(`>>> Robine fix faux-positif F-13 — DRY_RUN=${DRY_RUN}`);
const doc = fetchDoc();
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) throw new Error('Email mismatch');

const oldStatus = f.feasibility?.mapValue?.fields?.status?.stringValue;
const oldScore = f.feasibility?.mapValue?.fields?.score?.integerValue;
console.log(`feasibility avant: ${oldStatus} ${oldScore}`);

f.feasibility = { mapValue: { fields: {
  status: { stringValue: 'AMBITIEUX' },
  score: { integerValue: 50 },
  message: { stringValue: NEW_FEAS_MESSAGE },
  safetyWarning: { stringValue: NEW_SAFETY },
  recommendation: { stringValue: NEW_FEAS_RECO },
}}};
f.welcomeMessage = { stringValue: NEW_WELCOME };

console.log(`feasibility après: AMBITIEUX 50`);

const mask = ['feasibility', 'welcomeMessage'];

if (DRY_RUN) {
  writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-proposed.json`, JSON.stringify({ fields: f }, null, 2));
  console.log(`\nDRY RUN OK. Pour exec : DRY_RUN=false node patch-robine-faux-positif-27mai.mjs`);
} else {
  const url = `${docUrl}?${mask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
  const tmp = `/tmp/patch-robine-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify({ fields: f }));
  const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80*1024*1024 }).toString());
  if (res.error) { console.error(res.error.message); process.exit(1); }
  console.log(`\n✅ PATCH OK -> updateTime: ${res.updateTime}`);
  console.log(`🟢 Robine plan: AMBITIEUX 50 (était IRRÉALISTE 5)`);
}
