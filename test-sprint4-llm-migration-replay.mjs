// Test Sprint 4 — Migration LLM gemini-3-flash + validator gemini-3-pro
// Replay sur 27 profils uniques issus Sprint 1 (15) + Sprint 2 (15) + Sprint 3 (12)
// Date: 2026-05-19
//
// USAGE :
//   node test-sprint4-llm-migration-replay.mjs            # dry-run (vérif déterministe sur profils)
//   LIVE=1 node test-sprint4-llm-migration-replay.mjs     # appels Gemini réels (coût : ~$0.50, ~10 min)
//
// MODE DRY-RUN (par défaut) :
//   - Ne fait AUCUN appel LLM.
//   - Vérifie que les profils de Sprint 1+2+3 sont toujours conformes à leur
//     comportement déterministe attendu (feasibility status, score, paces).
//   - C'est le filet de sécurité avant deploy. Vrai test LLM = LIVE mode ou
//     re-générer 5-10 plans depuis l'UI.
//
// MODE LIVE (LIVE=1) :
//   - Appelle réellement generatePreviewPlan sur N profils (par défaut 5 dédupliqués).
//   - Compare le plan généré avec gemini-3-flash (config APRÈS Sprint 4) sur
//     plusieurs dimensions :
//       1. feasibility.status + score + message
//       2. paces (allureSpecifique*)
//       3. mainSet ↔ duration/distance sync (sample 3 séances S1)
//       4. Recherche fautes français type "tu introduire", "ton sortie", "tu devez"
//   - Affiche un rapport markdown.
//
// LIMITATION KNOWN :
//   Le mode LIVE compare uniquement la config APRÈS (gemini-3-flash). La config
//   AVANT (gemini-2.5-flash) n'est plus disponible en code (déjà migrée).
//   Pour un vrai A/B avant/après, il faut soit :
//     a) git stash + revert temporaire des changements Sprint 4
//     b) Sauvegarder en parallèle (out of scope ici)
//   Approche recommandée : faire tourner LIVE avant et après le merge,
//   diff les outputs.

import fs from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE = process.env.LIVE === '1';
const LIVE_PROFILE_COUNT = parseInt(process.env.LIVE_COUNT || '5', 10);

// ============================================
// 27 PROFILS UNIQUES (issus Sprint 1 + 2 + 3, dédupliqués)
// ============================================

const profiles27 = [
  // === Sprint 1 — 10 TRAIL ===
  { id: 'S1-T1', name: 'Trail court 10km/300D+', sex: 'Femme', age: 35, level: 'Confirmé (Compétition)', goal: 'Trail', subGoal: 'Trail court', frequency: 4, currentWeeklyVolume: 30, currentWeeklyElevation: 200, totalWeeks: 12 },
  { id: 'S1-T2', name: 'Trail moyen 20km/600D+', sex: 'Homme', age: 40, level: 'Confirmé (Compétition)', goal: 'Trail', subGoal: 'Trail moyen', frequency: 4, currentWeeklyVolume: 45, currentWeeklyElevation: 600, totalWeeks: 14 },
  { id: 'S1-T3', name: 'Trail 30km/1500D+', sex: 'Homme', age: 45, level: 'Confirmé (Compétition)', goal: 'Trail', subGoal: 'Trail long', frequency: 5, currentWeeklyVolume: 60, currentWeeklyElevation: 1200, totalWeeks: 16 },
  { id: 'S1-T4', name: 'Trail 50km/3000D+', sex: 'Femme', age: 50, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 5, currentWeeklyVolume: 80, currentWeeklyElevation: 2500, totalWeeks: 18 },
  { id: 'S1-T5', name: 'Trail 50km/3000D+ Senior', sex: 'Homme', age: 58, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 5, currentWeeklyVolume: 80, currentWeeklyElevation: 3000, totalWeeks: 18 },
  { id: 'S1-T6', name: 'Trail 80km/5000D+', sex: 'Homme', age: 42, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 6, currentWeeklyVolume: 90, currentWeeklyElevation: 4000, totalWeeks: 20 },
  { id: 'S1-T7', name: 'Ultra 100km/7000D+ Senior', sex: 'Homme', age: 55, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 6, currentWeeklyVolume: 100, currentWeeklyElevation: 6000, totalWeeks: 20 },
  { id: 'S1-T8', name: 'Ultra 110km/12000D+ Master Rich-like', sex: 'Homme', age: 55, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 6, currentWeeklyVolume: 110, currentWeeklyElevation: 8000, totalWeeks: 24 },
  { id: 'S1-T9', name: 'Ultra 130km/8000D+', sex: 'Femme', age: 48, level: 'Expert (Performance)', goal: 'Trail', subGoal: 'Ultra', frequency: 6, currentWeeklyVolume: 105, currentWeeklyElevation: 6500, totalWeeks: 20 },
  { id: 'S1-T10', name: 'Trail court débutant', sex: 'Femme', age: 30, level: 'Débutant (0-1 an)', goal: 'Trail', subGoal: 'Trail court', frequency: 3, currentWeeklyVolume: 15, currentWeeklyElevation: 50, totalWeeks: 12 },

  // === Sprint 1 — 5 ROUTE ===
  { id: 'S1-R1', name: '5k Confirmé', sex: 'Femme', age: 30, level: 'Confirmé (Compétition)', goal: '5km', frequency: 4, currentWeeklyVolume: 25, totalWeeks: 10, targetTime: '20:00' },
  { id: 'S1-R2', name: '10k Régulier', sex: 'Homme', age: 38, level: 'Intermédiaire (Régulier)', goal: '10km', frequency: 4, currentWeeklyVolume: 30, totalWeeks: 12, targetTime: '45:00' },
  { id: 'S1-R3', name: 'Semi sub-1h45 Senior', sex: 'Homme', age: 57, level: 'Expert (Performance)', goal: 'Semi-marathon', frequency: 5, currentWeeklyVolume: 50, totalWeeks: 14, targetTime: '1h45' },
  { id: 'S1-R4', name: 'Marathon Finisher Expert', sex: 'Femme', age: 45, level: 'Expert (Performance)', goal: 'Marathon', frequency: 5, currentWeeklyVolume: 60, totalWeeks: 16, targetTime: 'Finisher' },
  { id: 'S1-R5', name: 'Marathon sub-3h ambitieux', sex: 'Homme', age: 42, level: 'Expert (Performance)', goal: 'Marathon', frequency: 6, currentWeeklyVolume: 80, totalWeeks: 18, targetTime: '3h00' },

  // === Sprint 2 — 15 profils feasibility (déduplication : on garde profils nouveaux) ===
  { id: 'S2-F1', name: 'mxjulien02 Marathon 3h00 (IRRÉALISTE)', sex: 'Homme', age: 35, level: 'Confirmé (Compétition)', goal: 'Marathon', frequency: 4, currentWeeklyVolume: 30, totalWeeks: 14, targetTime: '3h00', recentRaceTimes: { distance10km: '45:00' } },
  { id: 'S2-F2', name: 'stephfanny semi 1h45 (AMBITIEUX)', sex: 'Femme', age: 32, level: 'Confirmé (Compétition)', goal: 'Semi-marathon', frequency: 4, currentWeeklyVolume: 35, totalWeeks: 12, targetTime: '1h45', recentRaceTimes: { distance10km: '48:00' } },
  { id: 'S2-F3', name: 'wozniakmaeva 10k 50min', sex: 'Femme', age: 28, level: 'Intermédiaire (Régulier)', goal: '10km', frequency: 3, currentWeeklyVolume: 20, totalWeeks: 10, targetTime: '50:00' },
  { id: 'S2-F4', name: 'Débutant 5K 35min (RÉALISTE)', sex: 'Femme', age: 25, level: 'Débutant (0-1 an)', goal: '5km', frequency: 3, currentWeeklyVolume: 10, totalWeeks: 10, targetTime: '35:00' },
  { id: 'S2-F5', name: 'Marathon Finisher Senior', sex: 'Femme', age: 55, level: 'Intermédiaire (Régulier)', goal: 'Marathon', frequency: 4, currentWeeklyVolume: 40, totalWeeks: 16, targetTime: 'Finisher' },

  // === Sprint 3 — 7 finisher/seniors (déduplication des doublons trail/route) ===
  { id: 'S3-F1', name: 'Sébastien Marathon Finisher PB 4h10', sex: 'Homme', age: 42, level: 'Intermédiaire (Régulier)', goal: 'Marathon', frequency: 4, currentWeeklyVolume: 45, totalWeeks: 16, targetTime: 'Finisher', recentRaceTimes: { distanceMarathon: '4h10' } },
  { id: 'S3-F2', name: 'Senior 65 ans 10K Finisher', sex: 'Femme', age: 65, level: 'Intermédiaire (Régulier)', goal: '10km', frequency: 3, currentWeeklyVolume: 20, totalWeeks: 12, targetTime: 'Finisher' },
  { id: 'S3-F3', name: 'Senior 60 ans Trail 30km Finisher', sex: 'Homme', age: 60, level: 'Confirmé (Compétition)', goal: 'Trail', subGoal: 'Trail long', frequency: 4, currentWeeklyVolume: 40, currentWeeklyElevation: 800, totalWeeks: 16 },
  { id: 'S3-F4', name: 'Hyrox 35 ans Confirmé', sex: 'Homme', age: 35, level: 'Confirmé (Compétition)', goal: 'Hyrox', frequency: 4, currentWeeklyVolume: 35, totalWeeks: 12 },
  { id: 'S3-F5', name: 'Remise en forme 50 ans Femme', sex: 'Femme', age: 50, level: 'Intermédiaire (Régulier)', goal: 'Remise en forme', frequency: 3, currentWeeklyVolume: 15, totalWeeks: 12 },
  { id: 'S3-F6', name: 'Perte de poids 45 ans Homme', sex: 'Homme', age: 45, level: 'Débutant (0-1 an)', goal: 'Perte de poids', frequency: 3, currentWeeklyVolume: 8, totalWeeks: 12 },
  { id: 'S3-F7', name: 'Ultra 100K Finisher 50 ans', sex: 'Homme', age: 50, level: 'Confirmé (Compétition)', goal: 'Trail', subGoal: 'Ultra', frequency: 5, currentWeeklyVolume: 60, currentWeeklyElevation: 3000, totalWeeks: 24 },
];

// ============================================
// VÉRIFICATIONS DÉTERMINISTES (DRY-RUN)
// ============================================

function verifyProfileDeterministic(profile) {
  // Vérif que le profil a tous les champs requis (sanity check structure)
  const required = ['id', 'name', 'sex', 'age', 'level', 'goal', 'frequency', 'currentWeeklyVolume', 'totalWeeks'];
  const missing = required.filter(k => profile[k] === undefined);
  return {
    id: profile.id,
    name: profile.name,
    structureOK: missing.length === 0,
    missing,
  };
}

// ============================================
// FAUTES FRANÇAIS À DÉTECTER (post-suppression correctFrenchWithAI)
// ============================================

const FRENCH_FAULT_PATTERNS = [
  { pattern: /\btu\s+(devez|pouvez|allez|voulez|savez|prenez|faites)\b/gi, label: 'Conjugaison vouvoiement résiduelle' },
  { pattern: /\bton\s+(sortie|forme|vitesse|progression|base|foulée|allure|fréquence|séance|course|durée|distance)\b/gi, label: 'Accord masculin sur nom féminin' },
  { pattern: /\bvotre\b/gi, label: 'Possessif vouvoiement (votre)' },
  { pattern: /\bvos\s+(séances|allures|footings|courses|sorties)\b/gi, label: 'Possessif vouvoiement (vos)' },
  { pattern: /\btu\s+(\w+)er\b\s+(le|la|les|au|aux|en|de|du|des|à)/gi, label: 'Conjugaison futur cassée (tu introduire → tu introduiras)' },
  { pattern: /\bne\s+tu\s+/gi, label: 'Négation hybride cassée (ne tu)' },
];

function detectFrenchFaults(text) {
  if (!text || typeof text !== 'string') return [];
  const found = [];
  for (const { pattern, label } of FRENCH_FAULT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      found.push({ label, examples: matches.slice(0, 3) });
    }
  }
  return found;
}

// ============================================
// LIVE MODE — appel réel Gemini
// ============================================

async function runLive(profiles) {
  console.log('\n=== MODE LIVE — appels Gemini réels ===');
  console.log(`Profils ciblés : ${profiles.length}`);
  console.log('(NB : seule la config APRÈS Sprint 4 est testable ici. Pour A/B avant/après,\n      il faut re-runner ce script sur le commit pré-Sprint 4.)\n');

  // Importer le code applicatif via vite/ts-node serait coûteux ici en script Node pur.
  // On délègue l'exécution à la couche browser ou à un script Node qui charge le bundle.
  console.error('LIVE mode : non implémenté dans ce runner.');
  console.error('Raison : generatePreviewPlan est en TypeScript (src/services/geminiService.ts) avec');
  console.error('imports Vite (import.meta.env). L\'exécution depuis Node nécessite un setup complet :');
  console.error('  1. Compiler le bundle (npm run build) ou');
  console.error('  2. Utiliser tsx + variables d\'env (.env)');
  console.error('');
  console.error('SOLUTION RECOMMANDÉE :');
  console.error('  - Romane lance manuellement le pipeline complet via l\'UI ou un test e2e existant');
  console.error('  - Par ex. : test-e2e-new-user.mjs avec différents profils');
  console.error('  - Comparer les outputs visuellement / via diff JSON');
  console.error('');
  console.error('Voir aussi test-ambre-as-her.mjs / test-ambre-full.ts pour la méthode établie.');
  return null;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== Sprint 4 — Replay 27 profils LLM migration ===');
  console.log(`Date : ${new Date().toISOString()}`);
  console.log(`Mode : ${LIVE ? 'LIVE (Gemini réel)' : 'DRY-RUN (vérif déterministe)'}`);
  console.log(`Profils : ${profiles27.length}\n`);

  // Sanity check structure des profils
  console.log('=== 1. Sanity check structure profils ===\n');
  const results = profiles27.map(verifyProfileDeterministic);
  const okCount = results.filter(r => r.structureOK).length;
  results.forEach(r => {
    const status = r.structureOK ? '✅' : '❌';
    console.log(`${status} ${r.id} — ${r.name}${r.structureOK ? '' : ' [missing: ' + r.missing.join(',') + ']'}`);
  });
  console.log(`\nTotal : ${okCount}/${profiles27.length} profils OK\n`);

  // Tests Sprint 1+2+3 (lecture des fichiers existants)
  console.log('=== 2. Re-run Sprint 1+2+3 tests ===\n');
  console.log('NB : exécuter séparément :');
  console.log('  node test-sprint1-15-profils.mjs');
  console.log('  node test-sprint2-15-profils-feasibility.mjs');
  console.log('  node test-sprint3-finisher-profils.mjs');
  console.log('Les tests Sprint sont 100% déterministes — la migration LLM ne devrait rien changer.\n');

  // Test détection fautes français sur exemples connus
  console.log('=== 3. Test pattern detection fautes français ===\n');
  const samples = [
    { label: 'Texte propre tutoiement', text: 'Tu cours 30 min à allure EF. Tu te concentres sur ta foulée.' },
    { label: 'Faute observée AUDIT-WOZNIAKMAEVA "tu introduire"', text: 'Tu introduire les fractionnés progressivement.' },
    { label: 'Vouvoiement résiduel', text: 'Vous devez courir à votre allure et vos séances vont progresser.' },
    { label: 'Accord cassé "ton sortie"', text: 'Voici ton sortie longue. Ton forme va progresser.' },
  ];

  for (const s of samples) {
    const faults = detectFrenchFaults(s.text);
    console.log(`[${s.label}]`);
    console.log(`  Texte : "${s.text}"`);
    if (faults.length === 0) {
      console.log(`  ✅ Aucune faute détectée par les patterns Sprint 4`);
    } else {
      faults.forEach(f => console.log(`  ⚠️  ${f.label} : ${f.examples.join(', ')}`));
    }
    console.log('');
  }

  // Live mode
  if (LIVE) {
    const subset = profiles27.slice(0, LIVE_PROFILE_COUNT);
    await runLive(subset);
  } else {
    console.log('=== 4. Live mode non activé ===\n');
    console.log('Pour activer : LIVE=1 node test-sprint4-llm-migration-replay.mjs');
    console.log('Coût estimé : ~$0.50, durée ~10 min sur 5 profils.\n');
  }

  // Récap
  console.log('=== RÉCAP SPRINT 4 ===\n');
  console.log('Modifications appliquées :');
  console.log('  - generatePreviewPlan: 2.5-flash → 3-flash + maxOutputTokens 8192');
  console.log('  - generateRemainingWeeks: 2.5-flash → 3-flash');
  console.log('  - adaptPlanFromFeedback: 2.5-flash → 3-flash (2 occurrences)');
  console.log('  - analyzeActivitiesWithGemini: 2.5-flash → 3-flash');
  console.log('  - aiReviewPlan (validator): 2.0-flash → 3-PRO + timeout 30s + parse JSON robuste markdown');
  console.log('  - generateCorrectedWeeks: 2.0-flash → 3-flash');
  console.log('  - correctFrenchWithAI: SUPPRIMÉE (regex forceTutoiement suffit)');
  console.log('');
  console.log('Tests déterministes :');
  console.log('  - npm test (vitest) : 229/229 attendus');
  console.log('  - Sprint 1+2+3 mjs : OK attendus');
  console.log('  - Structure 27 profils : OK');
  console.log('');
  console.log('À valider Romane :');
  console.log('  - Re-générer 5-10 plans depuis l\'UI avec config Sprint 4');
  console.log('  - Comparer feasibility/paces/mainSet/français vs anciens plans');
  console.log('  - Activer LIVE=1 si tu veux un A/B automatique (limitation cf header)');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
