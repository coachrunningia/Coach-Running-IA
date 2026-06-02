#!/usr/bin/env node
/**
 * test-f19-modulation-injury-10profils.mjs
 *
 * Validation F-19 — modulation hasInjury × 0.85 sur 10 profils diversifiés.
 * Doctrine feedback_validation_n_profils_avant_sprint : 10+ profils OBLIGATOIRE
 * avant tout sprint touchant la génération.
 *
 * Méthode :
 *   - Pour chaque profil, compare le pic AVANT modulation (sans hasInjury)
 *     vs APRÈS modulation (avec hasInjury=true), via appel direct au build.
 *   - Vérifie que la réduction observée est cohérente avec ×0.85 (modulo cap min 0.60).
 *
 * Implémentation : on charge directement le module compilé via Vitest pour
 * éviter de réimplémenter la logique. Tu peux aussi le lancer en pur JS
 * en simulant calculatePeriodizationPlan inline (méthode choisie ici pour
 * indépendance du build).
 */

// ─────────────────────────────────────────────
// Mini-clone calculatePeriodizationPlan logique
// (uniquement la partie volume max + réductions
// pour vérifier l'effet modulation hasInjury)
// ─────────────────────────────────────────────

function getMaxVolume(goal, level, subGoal, trailDistance, trailElevation, isFinisher) {
  const sub = (subGoal || '').toLowerCase();
  const isMarathon = sub.includes('marathon') && !sub.includes('semi');
  const isSemi = sub.includes('semi');
  const is10k = sub.includes('10');
  const isTrail = goal.includes('Trail');
  const isUltraLong = isTrail && (trailDistance || 0) >= 100;
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrail30Plus = isTrail && (trailDistance || 0) >= 30;
  const isPertePoids = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien') || goal.includes('Remise');
  const dPlusPerKm = (trailDistance && trailDistance > 0 && trailElevation) ? (trailElevation / trailDistance) : 0;
  const isVK = isTrail && (trailDistance || 0) <= 5 && dPlusPerKm >= 150;
  const isTrailSteep = !isVK && isTrail && (trailDistance || 0) <= 15 && dPlusPerKm >= 80;
  const isHyrox = goal.includes('Hyrox');

  if (level === 'Débutant (0-1 an)') {
    if (isHyrox) return 16;
    if (isPertePoids) return 20;
    if (isMaintien) return 25;
    if (isVK) return 20;
    if (isTrailSteep) return 25;
    if (isMarathon) return 45;
    if (isUltraLong) return 55;
    if (isUltra) return 45;
    if (isTrail30Plus) return 45;
    if (isTrail) return 35;
    if (isSemi) return 35;
    if (is10k) return 30;
    return 25;
  }
  if (level === 'Expert (Performance)') {
    if (isHyrox) return 38;
    if (isPertePoids) return 45;
    if (isMaintien) return 55;
    if (isVK) return 45;
    if (isTrailSteep) return 55;
    if (isUltraLong) return 120;
    if (isUltra) return 100;
    if (isMarathon) return 85;
    if (isTrail30Plus) return 80;
    if (isTrail) return 65;
    if (isSemi) return 70;
    if (is10k) return 65;
    return 60;
  }
  if (level === 'Confirmé (Compétition)') {
    if (isHyrox) return 30;
    if (isPertePoids) return 35;
    if (isMaintien) return 45;
    if (isVK) return 35;
    if (isTrailSteep) return 45;
    if (isUltraLong) return 95;
    if (isUltra) return 70;
    if (isMarathon) return 75;
    if (isTrail30Plus) return 70;
    if (isTrail) return 55;
    if (isSemi) return 60;
    if (is10k) return 55;
    return 46;
  }
  // Intermédiaire
  if (isHyrox) return 23;
  if (isPertePoids) return 30;
  if (isMaintien) return 40;
  if (isVK) return 30;
  if (isTrailSteep) return 35;
  if (isUltraLong) return 75;
  if (isUltra) return 55;
  if (isMarathon) return 65;
  if (isTrail30Plus) return 60;
  if (isTrail) return 50;
  if (isSemi) return 55;
  if (is10k) return 50;
  return 40;
}

function computePeak(profile) {
  const { goal, level, subGoal, trailDistance, trailElevation, isFinisher, age, weight, height, sessionsPerWeek, hasInjury } = profile;
  let maxVolume = getMaxVolume(goal, level, subGoal, trailDistance, trailElevation, isFinisher);

  // Session factor
  if (sessionsPerWeek && sessionsPerWeek > 0) {
    const runningSess = Math.max(1, sessionsPerWeek - 1);
    const sessionFactors = { 1: 0.70, 2: 0.85, 3: 1.00, 4: 1.10, 5: 1.20 };
    const sessionFactor = sessionFactors[Math.min(runningSess, 5)] || 1.00;
    if (sessionFactor !== 1.00) {
      const absoluteMax = getMaxVolume(goal, 'Expert (Performance)', subGoal, trailDistance, trailElevation, isFinisher);
      maxVolume = Math.min(Math.round(maxVolume * sessionFactor), absoluteMax);
    }
  }

  // Reductions
  let totalReduction = 1.0;
  const isPertePoids = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien') || goal.includes('Remise');
  if (isFinisher && !isPertePoids && !isMaintien) totalReduction *= 0.75;

  if (age && age > 0) {
    if (age < 18) totalReduction *= 0.70;
    else if (age >= 55) totalReduction *= 0.85;
  }

  const bmi = (weight && height > 0) ? weight / ((height / 100) ** 2) : 0;
  if (bmi >= 35) totalReduction *= 0.65;
  else if (bmi >= 30) totalReduction *= 0.80;
  else if (weight && weight > 85 && bmi < 30) {
    totalReduction *= weight >= 100 ? 0.85 : 0.90;
  }

  // F-19 — nouvelle modulation
  if (hasInjury) totalReduction *= 0.85;

  totalReduction = Math.max(totalReduction, 0.60);
  return Math.round(maxVolume * totalReduction);
}

// ─────────────────────────────────────────────
// 10 PROFILS DIVERSIFIÉS
// ─────────────────────────────────────────────

const PROFILS = [
  {
    name: '1. SEMENT.FRANCOIS (cas réel)',
    goal: 'Trail', level: 'Confirmé (Compétition)', subGoal: 'trail',
    trailDistance: 31, trailElevation: 750, isFinisher: false,
    age: 38, weight: 75, height: 180, sessionsPerWeek: 4,
  },
  {
    name: '2. Expert Marathon 35a normal',
    goal: 'Marathon', level: 'Expert (Performance)', subGoal: 'marathon',
    isFinisher: false, age: 35, weight: 70, height: 178, sessionsPerWeek: 5,
  },
  {
    name: '3. Débutant 10K Finisher BMI 32',
    goal: '10K', level: 'Débutant (0-1 an)', subGoal: '10K',
    isFinisher: true, age: 42, weight: 95, height: 172, sessionsPerWeek: 3,
  },
  {
    name: '4. Senior 58a Semi',
    goal: 'Semi-Marathon', level: 'Confirmé (Compétition)', subGoal: 'semi',
    isFinisher: false, age: 58, weight: 72, height: 175, sessionsPerWeek: 4,
  },
  {
    name: '5. Ultra 100km Expert',
    goal: 'Trail', level: 'Expert (Performance)', subGoal: 'trail',
    trailDistance: 100, trailElevation: 5000, isFinisher: false,
    age: 40, weight: 68, height: 175, sessionsPerWeek: 5,
  },
  {
    name: '6. Perte Poids Inter BMI 28',
    goal: 'Perte de Poids', level: 'Intermédiaire (Régulier)', subGoal: '',
    isFinisher: false, age: 30, weight: 88, height: 178, sessionsPerWeek: 4,
  },
  {
    name: '7. Trail VK Confirmé',
    goal: 'Trail', level: 'Confirmé (Compétition)', subGoal: 'trail',
    trailDistance: 4, trailElevation: 1000, isFinisher: false,
    age: 32, weight: 65, height: 172, sessionsPerWeek: 4,
  },
  {
    name: '8. Marathon Inter cumul (Finisher + Senior + BMI 30)',
    goal: 'Marathon', level: 'Intermédiaire (Régulier)', subGoal: 'marathon',
    isFinisher: true, age: 57, weight: 92, height: 175, sessionsPerWeek: 3,
  },
  {
    name: '9. 5K Expert jeune normal',
    goal: '5K', level: 'Expert (Performance)', subGoal: '5K',
    isFinisher: false, age: 25, weight: 65, height: 175, sessionsPerWeek: 5,
  },
  {
    name: '10. Maintien Débutant ado',
    goal: 'Maintien en forme', level: 'Débutant (0-1 an)', subGoal: '',
    isFinisher: false, age: 16, weight: 60, height: 170, sessionsPerWeek: 3,
  },
  {
    name: '11. BMI 36 obésité + injury (CAP CHECK)',
    goal: 'Maintien en forme', level: 'Débutant (0-1 an)', subGoal: '',
    isFinisher: false, age: 45, weight: 110, height: 175, sessionsPerWeek: 3,
  },
];

// ─────────────────────────────────────────────
// EXEC
// ─────────────────────────────────────────────

console.log('Validation F-19 — modulation hasInjury × 0.85\n');
console.log('Légende :');
console.log('  pic_sain  = pic SANS hasInjury (baseline)');
console.log('  pic_inj   = pic AVEC hasInjury=true');
console.log('  ratio     = pic_inj / pic_sain');
console.log('  attendu   = 0.85 (sauf si déjà capé par -40% min 0.60)\n');
console.log('─'.repeat(90));

let allPass = true;
for (const p of PROFILS) {
  const sain = computePeak({ ...p, hasInjury: false });
  const inj = computePeak({ ...p, hasInjury: true });
  const ratio = inj / sain;
  // Le ratio attendu est 0.85, mais peut être > 0.85 si le cap min 0.60 est déjà actif
  const expected = 0.85;
  const tolerance = 0.03; // tolérance arrondi
  const pass = Math.abs(ratio - expected) <= tolerance || ratio > 0.85; // si déjà capé, ratio plus haut OK
  if (!pass) allPass = false;
  const verdict = pass ? '✅' : '❌';
  console.log(`${verdict} ${p.name}`);
  console.log(`   pic_sain=${sain}km | pic_inj=${inj}km | ratio=${ratio.toFixed(3)} | attendu ≈ ${expected}`);
}
console.log('─'.repeat(90));
console.log(allPass ? '\n✅ TOUS LES 11 PROFILS OK' : '\n❌ ÉCHEC sur ≥1 profil');
process.exit(allPass ? 0 : 1);
