#!/usr/bin/env node
/**
 * patch-philkhal-welcome-31mai.mjs
 *
 * Patch live philkhal@hotmail.com (1778254954905) — Trail 10km/500m D+ 55min 7sem.
 *
 * Demande Romane 31/05 — Option B : welcome enrichi qui explique le trade-off
 * cv 50 + freq 3 + race 10K. La SL 22 km est mécaniquement forcée par les inputs
 * user (immuables) — on ne peut pas patcher les sessions sans violer une doctrine.
 *
 * Doctrines respectées :
 * - feedback_jamais_poids_minceur ✅ (zéro mention poids/BMI/silhouette)
 * - feedback_jamais_baisser_allure_cible ✅ (target 55min préservé)
 * - feedback_jamais_suggerer_changer_frequence ✅ (PAS de "passe à 4 séances")
 * - feedback_input_client_obligatoire ✅ (cv 50 + freq 3 respectés)
 * - feedback_securite_avant_conversion ✅ (honnête + CTA régen objectif réaliste)
 *
 * Usage :
 *   DRY RUN : node patch-philkhal-welcome-31mai.mjs
 *   EXEC    : DRY_RUN=false node patch-philkhal-welcome-31mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778254954905';
const EXPECTED_EMAIL = 'philkhal@hotmail.com';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-2plans-30mai-backups-philkhal-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

const NEW_WELCOME = `Bienvenue dans ta préparation pour ton 10 km trail (500m D+) en 55 min.

⚠️ **Honnête avec toi** : ton objectif 55 min nécessite une VMA de 19.3 km/h. Ta VMA actuelle est 13.5 km/h (estimée — aucun chrono saisi). Temps réaliste sur ce trail : **~1h22**. Tu peux suivre le plan en connaissance de cause, mais l'objectif chrono restera mécaniquement hors d'atteinte.

📊 **À savoir sur ton profil** : tu cours 50 km/sem sur 3 séances. Ce volume hebdo correspond plutôt à une préparation semi-marathon ou marathon qu'à un 10K classique. Conséquence : tes 50 km/sem se répartissent en 2 grosses sorties course (footing ~18 km + sortie longue ~22 km). Ces séances longues seront plus exigeantes que pour un 10K standard — c'est normal compte tenu de ton volume hebdo déclaré.

🩺 **Avant de démarrer** :
- **Mesure ta VMA réelle** (test 6 min Cooper ou test 30/30) pour des allures précises — ton plan actuel est calibré sur une estimation
- Consultation médicale + certificat d'aptitude au sport indispensable
- Renforce les articulations (chevilles, genoux) — le Trail 500m D+ sollicite différemment qu'une route plate
- Échauffement systématique 15 min avant chaque séance

📌 **Recommandation honnête** : pour une vraie progression chronométrique, **régénère ton plan** avec un objectif autour de 1h20-1h25 (calibré sur ta VMA actuelle de 13.5 km/h). L'objectif 55 min restera ton horizon mental mais le plan sera plus précis et adapté à ton niveau réel.

On est là si besoin.`;

// Validation anti feedback_jamais_poids_minceur
const FORBIDDEN = ['poids', 'kg', 'IMC', 'bmi', 'silhouette', 'minceur', 'obèse', 'obésité', 'corpulence', 'graisse', 'kilos', 'maigrir'];
const violations = FORBIDDEN.filter(w => NEW_WELCOME.toLowerCase().includes(w.toLowerCase()));
if (violations.length > 0) {
  console.error(`❌ DOCTRINE VIOLATION : ${violations.join(', ')}`);
  process.exit(1);
}
// Validation anti feedback_jamais_suggerer_changer_frequence
const FORBIDDEN_FREQ = ['passe à 4', 'passer à 4', 'ajoute une séance', 'ajouter une séance', '4 séances'];
const freqViol = FORBIDDEN_FREQ.filter(w => NEW_WELCOME.toLowerCase().includes(w.toLowerCase()));
if (freqViol.length > 0) {
  console.error(`❌ DOCTRINE freq VIOLATION : ${freqViol.join(', ')}`);
  process.exit(1);
}
console.log(`✓ Doctrines validées (poids ✅ + freq ✅) | ${NEW_WELCOME.length} chars`);

console.log(`\n>>> Patch PHILKHAL welcome — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backup : ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));

if (doc.fields.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${doc.fields.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ Welcome AVANT : ${(doc.fields.welcomeMessage?.stringValue || '').length} chars`);
console.log(`✓ Welcome APRÈS : ${NEW_WELCOME.length} chars`);

const updates = { fields: { welcomeMessage: { stringValue: NEW_WELCOME } } };
const updateUrl = `${docUrl}?updateMask.fieldPaths=welcomeMessage`;
const tmp = `/tmp/patch-philkhal-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-philkhal-welcome-31mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
