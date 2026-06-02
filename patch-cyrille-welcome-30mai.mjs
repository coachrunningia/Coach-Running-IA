#!/usr/bin/env node
/**
 * patch-cyrille-welcome-30mai.mjs
 *
 * Patch live cyrilleroy1992@hotmail.com (1780074799468) — Semi-Marathon 2h20 Lausanne.
 *
 * Demande Romane 30/05 : welcomeMessage enrichi pour profil ayant besoin
 * d'avertissements safety SUPPLÉMENTAIRES sans aucune mention poids/BMI/silhouette
 * (doctrine feedback_jamais_poids_minceur).
 *
 * Changements :
 * - welcomeMessage UNIQUEMENT (autres champs intacts)
 * - Avant : ~600 chars génériques
 * - Après : ~1500 chars avec conseils sécurité renforcés :
 *   - Médecin INDISPENSABLE (pas seulement recommandé)
 *   - Kiné suggéré
 *   - Échauffement EXPLICITE 15 min
 *   - Surfaces souples Lausanne (Vidy, Sauvabelin, Jorat)
 *   - Alternance marche/course autorisée
 *   - Récup 48-72h (vs 24-48 standard)
 *   - Sommeil 8h
 *   - Règle d'or régularité > vitesse
 *
 * Doctrines :
 * - feedback_jamais_poids_minceur ✅ (ZÉRO mention poids/BMI/silhouette/etc)
 * - feedback_securite_avant_conversion ✅ (safety renforcée)
 * - feedback_patch_live_plans_jour_seulement ✅ (S1 démarre 1er juin, pas commencée)
 * - feedback_chaque_ligne_justifiee ✅ (chaque ajout justifié vs welcome standard)
 *
 * Usage :
 *   DRY RUN : node patch-cyrille-welcome-30mai.mjs
 *   EXEC    : DRY_RUN=false node patch-cyrille-welcome-30mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1780074799468';
const EXPECTED_EMAIL = 'cyrilleroy1992@hotmail.com';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-2plans-30mai-backups-cyrille-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

// ─────────────────────────────────────────────────────────
// CONTENU welcomeMessage NEW (validé Romane 30/05/2026)
// ─────────────────────────────────────────────────────────

const NEW_WELCOME = `Bienvenue dans ton programme de préparation pour ton premier semi-marathon en 2h20. Avec ta VMA actuelle (10.8 km/h), c'est un bel objectif atteignable avec de la régularité et de la patience.

📈 La structure : progression VOLONTAIREMENT douce. Le volume hebdo monte en 20 semaines de 20 à 25 km/sem maximum. C'est délibéré pour laisser à ton corps le temps de s'adapter sereinement.

⚠️ Avant de démarrer — INDISPENSABLE (pas seulement recommandé) :
- **Consultation médicale + certificat d'aptitude au sport** : c'est ta priorité n°1 cette semaine. Demande aussi à ton médecin si un test d'effort serait pertinent dans ton cas.
- **Avis kiné** si possible : bilan de tes appuis et de ta foulée. Une analyse 30 min peut prévenir 90% des blessures.

🏃 Pendant les séances :
- **Échauffement long 15 min systématique** (mobilité hanches/chevilles + marche active + 5-6 lignes droites souples). Ne saute JAMAIS l'échauffement.
- **Surfaces souples privilégiées** : herbe, terre, chemins forestiers, piste d'athlé. Évite le bitume autant que possible — Lausanne offre de belles alternatives (Vidy, Bois de Sauvabelin, Bois du Jorat).
- **Alternance marche/course autorisée à tout moment** : si tu ressens une douleur articulaire ou un essoufflement excessif, marche 30s puis reprends. C'est meilleur pour ta progression que de forcer.

💤 Après les séances :
- **Récupération 48 à 72h entre séances intenses** (au lieu de 24-48h habituels). Si tu hésites entre "reposer" et "courir" : repose.
- **Hydratation non-négociable** (avant / pendant / après chaque sortie).
- **Sommeil** : 8h minimum les nuits après une séance dure.

🎯 La règle d'or : ton 2h20 c'est l'horizon de la semaine 20, pas la semaine 1. La régularité paye 100x plus que la vitesse précoce. Si une semaine te paraît dure, allège — un footing en moins ne te coûtera rien, une blessure t'arrêtera 6 mois.

On est là si besoin.`;

// ─────────────────────────────────────────────────────────
// VALIDATION ANTI feedback_jamais_poids_minceur
// ─────────────────────────────────────────────────────────

const FORBIDDEN = ['poids', 'kg', 'IMC', 'bmi', 'silhouette', 'minceur', 'obèse', 'obésité', 'corpulence', 'graisse', 'kilos', 'maigrir', 'mince', 'gros'];
const lowerWelcome = NEW_WELCOME.toLowerCase();
const violations = FORBIDDEN.filter(w => lowerWelcome.includes(w.toLowerCase()));
if (violations.length > 0) {
  console.error(`❌ DOCTRINE VIOLATION : mots interdits trouvés : ${violations.join(', ')}`);
  process.exit(1);
}
console.log(`✓ Doctrine feedback_jamais_poids_minceur : OK (0 mot interdit)`);
console.log(`✓ Longueur : ${NEW_WELCOME.length} chars (était ~600)`);

// ─────────────────────────────────────────────────────────
// EXEC
// ─────────────────────────────────────────────────────────

console.log(`\n>>> Patch Cyrille welcome — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backup : ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan Cyrille introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
console.log('✓ Backup OK');

if (doc.fields.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${doc.fields.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ welcome AVANT : ${(doc.fields.welcomeMessage?.stringValue || '').length} chars`);

const updates = { fields: { welcomeMessage: { stringValue: NEW_WELCOME } } };
const updateUrl = `${docUrl}?updateMask.fieldPaths=welcomeMessage`;
const tmp = `/tmp/patch-cyrille-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`\n=== PATCH ===`);
console.log(`  Plan ID         : ${PLAN_ID}`);
console.log(`  Champ patché    : welcomeMessage (1 seul)`);
console.log(`  Update mask     : welcomeMessage`);
console.log(`  Nouveau welcome : ${NEW_WELCOME.length} chars`);

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-cyrille-welcome-30mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
console.log(`✅ Plan Cyrille welcome enrichi.`);
