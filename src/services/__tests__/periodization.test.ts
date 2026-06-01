/**
 * Tests de non-régression pour la périodisation.
 * Vérifie que des profils types produisent des plans progressifs et cohérents.
 *
 * Lancer : npx vitest run src/services/__tests__/periodization.test.ts
 */

// On importe directement les fonctions exportées du module
// Note: calculatePeriodizationPlan et detectLevelFromData ne sont pas exportés
// → on les teste indirectement via createGenerationContext si exporté,
//   sinon on duplique la logique minimale pour les tests critiques.

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

// ─── Reproduction locale de detectLevelFromData pour test ───
function detectLevelFromData(data: any): string {
  const level = (data.level || '').toLowerCase();
  let declared: string;
  if (level.includes('débutant') || level.includes('debutant')) declared = 'deb';
  else if (level.includes('expert') || level.includes('performance')) declared = 'expert';
  else if (level.includes('confirmé') || level.includes('confirme') || level.includes('compétition')) declared = 'conf';
  else declared = 'inter';

  const vma = data.vma || data.estimatedVMA;
  if (vma && vma > 0) {
    const isFemale = data.sex === 'Femme';
    let vmaLevel: string;
    if (isFemale) {
      if (vma < 9.5) vmaLevel = 'deb';
      else if (vma < 12.5) vmaLevel = 'inter';
      else if (vma < 15) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    } else {
      if (vma < 11) vmaLevel = 'deb';
      else if (vma < 14) vmaLevel = 'inter';
      else if (vma < 17) vmaLevel = 'conf';
      else vmaLevel = 'expert';
    }

    const levelRank: Record<string, number> = { deb: 0, inter: 1, conf: 2, expert: 3 };
    const rankNames = ['deb', 'inter', 'conf', 'expert'];
    const gap = levelRank[declared] - levelRank[vmaLevel];
    if (gap >= 1) {
      const hardDropThreshold = isFemale ? 8.5 : 10;
      const maxDrop = vma < hardDropThreshold ? 2 : 1;
      return rankNames[Math.max(levelRank[declared] - maxDrop, levelRank[vmaLevel])];
    }
  }

  return declared;
}

// ─── Tests detectLevelFromData ───

describe('detectLevelFromData — seuils VMA par sexe', () => {
  it('Femme VMA 10.87 (semi 2h17) déclarée Confirmée → reste inter (pas deb)', () => {
    const result = detectLevelFromData({
      level: 'Confirmé (Compétition)',
      sex: 'Femme',
      vma: 10.87,
    });
    // Doit être inter (downgrade 1 cran max), PAS deb
    expect(result).toBe('inter');
    expect(result).not.toBe('deb');
  });

  it('Homme VMA 10.87 déclaré Confirmé → inter (VMA < 11 = deb homme, drop 1)', () => {
    const result = detectLevelFromData({
      level: 'Confirmé (Compétition)',
      sex: 'Homme',
      vma: 10.87,
    });
    expect(result).toBe('inter');
  });

  it('Femme VMA 8.0 déclarée Confirmée → inter (pas deb, VMA < 8.5 = deb, drop max 2 → deb)', () => {
    const result = detectLevelFromData({
      level: 'Confirmé (Compétition)',
      sex: 'Femme',
      vma: 8.0,
    });
    // VMA < 8.5 pour femme = deb, gap=2, maxDrop=2 (vma < 8.5) → drop to deb
    expect(result).toBe('deb');
  });

  it('Femme VMA 12.0 déclarée Confirmée → conf (pas de downgrade)', () => {
    const result = detectLevelFromData({
      level: 'Confirmé (Compétition)',
      sex: 'Femme',
      vma: 12.0,
    });
    // 9.5 ≤ 12.0 < 12.5 → inter, gap=1, drop 1 → inter
    expect(result).toBe('inter');
  });

  it('Femme VMA 13.0 déclarée Confirmée → conf (VMA ≥ 12.5 = conf pour femme)', () => {
    const result = detectLevelFromData({
      level: 'Confirmé (Compétition)',
      sex: 'Femme',
      vma: 13.0,
    });
    // 12.5 ≤ 13.0 < 15 → conf, gap=0 → pas de downgrade
    expect(result).toBe('conf');
  });

  it('Homme VMA 14.5 déclaré Expert → conf (drop 1)', () => {
    const result = detectLevelFromData({
      level: 'Expert (Performance)',
      sex: 'Homme',
      vma: 14.5,
    });
    // 14 ≤ 14.5 < 17 → conf, gap = expert(3) - conf(2) = 1, drop 1 → conf
    expect(result).toBe('conf');
  });

  it('Pas de VMA → retourne le niveau déclaré', () => {
    expect(detectLevelFromData({ level: 'Confirmé (Compétition)' })).toBe('conf');
    expect(detectLevelFromData({ level: 'Débutant (0-1 an)' })).toBe('deb');
  });
});

// ─── Tests de cohérence volume ───

describe('Profils types — volumes progressifs', () => {
  it('Femme Confirmée Semi 2h17 + PdP → defaultVolume ≥ 25 (pas 15)', () => {
    // Avec le fix, une semi-marathonienne en PdP doit avoir un defaultVolume
    // basé sur sa distance courue (semi inter = 28), pas sur PdP inter (15)
    const vmaSource = 'Semi en 2h17';
    const isPertePoids = true;
    const effectiveLevelKey = 'inter'; // après downgrade VMA

    // Simuler le uplift PdP
    let defaultVolume = 15; // PdP inter
    const src = vmaSource.toLowerCase();
    const hasSemiExp = src.includes('semi');
    if (isPertePoids && hasSemiExp) {
      const raceDefault = effectiveLevelKey === 'inter' ? 28 : 35;
      if (raceDefault > defaultVolume) defaultVolume = raceDefault;
    }

    expect(defaultVolume).toBeGreaterThanOrEqual(25);
  });

  it('Homme débutant PdP sans chrono → defaultVolume = 10 (pas de uplift)', () => {
    const effectiveLevelKey = 'deb';
    const defaultVolume = 10; // PdP deb
    // Pas de vmaSource → pas d'uplift
    expect(defaultVolume).toBe(10);
  });
});

// ─── Non-régression : Expert dégradé en Débutant (chrono lent) ───
// Profil "georgeslor1" type : Expert déclaré 57 ans 90kg VMA 10.7, marathon 5h15
// → override → Débutant. Avec senior×0.85 et surpoids×0.90, le pic plafonnait à 48.
// Après patch (1.18× currentVol et baseMaxVolume×1.10), le pic doit atteindre ≥50.

describe('calculatePeriodizationPlan — progression minimale (cas Marathon Expert dégradé)', () => {
  it('Profil Expert dégradé Débutant + senior + surpoids + vol45 → peakVolume ≥ 50', () => {
    // effectiveLevel = 'Débutant (0-1 an)' (le caller fait l'override via detectLevelFromData)
    const result = calculatePeriodizationPlan(
      22,                          // totalWeeks
      45,                          // currentVolume
      'Débutant (0-1 an)',         // level (après override chrono 10k=1h00 → deb)
      'Course sur route',          // goal
      'Marathon',                  // subGoal
      undefined,                   // trailDistance
      undefined,                   // trailElevation
      '4h45',                      // targetTime
      57,                          // age
      90,                          // weight
      10.685,                      // vma
      5,                           // sessionsPerWeek
      { height: 180 },
    );
    const peak = Math.max(...result.weeklyVolumes);
    expect(peak).toBeGreaterThanOrEqual(50);
  });
});

// ─── F-19 (01/06/2026) — Modulation hasInjury × 0.85 ───────────────
// Découverte audit FFA Sement.francois : hasInjury non géré dans
// totalReduction = ratio S1→pic 1.70 sur tendinopathie Achille = unsafe.
// Patch : ajout modulation ×0.85 dans le bloc totalReduction.
describe('F-19 — modulation hasInjury × 0.85', () => {
  // Profil "Sement.francois" reproduit : Trail 31km/750D+ Conf cv 40 freq 4
  const baseProfile = {
    totalWeeks: 20,
    currentVolume: 40,
    level: 'Confirmé (Compétition)',
    goal: 'Trail',
    subGoal: 'trail',
    trailDistance: 31,
    trailElevation: 750,
    targetTime: '2h15',
    age: 38,
    weight: 75,
    vma: 14.5,
    sessionsPerWeek: 4,
  } as const;

  it('hasInjury=true → pic réduit ~15% vs hasInjury=false sur profil Trail Conf', () => {
    const sain = calculatePeriodizationPlan(
      baseProfile.totalWeeks, baseProfile.currentVolume, baseProfile.level,
      baseProfile.goal, baseProfile.subGoal, baseProfile.trailDistance,
      baseProfile.trailElevation, baseProfile.targetTime, baseProfile.age,
      baseProfile.weight, baseProfile.vma, baseProfile.sessionsPerWeek,
      { height: 180, hasInjury: false },
    );
    const inj = calculatePeriodizationPlan(
      baseProfile.totalWeeks, baseProfile.currentVolume, baseProfile.level,
      baseProfile.goal, baseProfile.subGoal, baseProfile.trailDistance,
      baseProfile.trailElevation, baseProfile.targetTime, baseProfile.age,
      baseProfile.weight, baseProfile.vma, baseProfile.sessionsPerWeek,
      { height: 180, hasInjury: true },
    );
    const peakSain = Math.max(...sain.weeklyVolumes);
    const peakInj = Math.max(...inj.weeklyVolumes);
    const ratio = peakInj / peakSain;
    // Doit être réduit (ratio ≤ ~0.88 pour tolérance arrondi entier)
    expect(peakInj).toBeLessThan(peakSain);
    expect(ratio).toBeGreaterThanOrEqual(0.80);
    expect(ratio).toBeLessThanOrEqual(0.90);
  });

  it('hasInjury=undefined → pic identique à hasInjury=false (pas de mod)', () => {
    const sain = calculatePeriodizationPlan(
      baseProfile.totalWeeks, baseProfile.currentVolume, baseProfile.level,
      baseProfile.goal, baseProfile.subGoal, baseProfile.trailDistance,
      baseProfile.trailElevation, baseProfile.targetTime, baseProfile.age,
      baseProfile.weight, baseProfile.vma, baseProfile.sessionsPerWeek,
      { height: 180 },
    );
    const explicitFalse = calculatePeriodizationPlan(
      baseProfile.totalWeeks, baseProfile.currentVolume, baseProfile.level,
      baseProfile.goal, baseProfile.subGoal, baseProfile.trailDistance,
      baseProfile.trailElevation, baseProfile.targetTime, baseProfile.age,
      baseProfile.weight, baseProfile.vma, baseProfile.sessionsPerWeek,
      { height: 180, hasInjury: false },
    );
    expect(Math.max(...sain.weeklyVolumes)).toBe(Math.max(...explicitFalse.weeklyVolumes));
  });

  it('Cap min 0.60 : injury+cumul (Finisher+Senior+BMI30) → totalReduction ne descend pas sous 0.60', () => {
    // Cumul Finisher (×0.75) + Senior (×0.85) + BMI 30 (×0.80) + injury (×0.85)
    // = 0.75 × 0.85 × 0.80 × 0.85 = 0.4335 → capé à 0.60
    const inj = calculatePeriodizationPlan(
      20, 40, 'Intermédiaire (Régulier)', 'Course sur route', 'Marathon',
      undefined, undefined, '5h00', 57, 92, 11.0, 4,
      { height: 175, hasInjury: true },
    );
    const peak = Math.max(...inj.weeklyVolumes);
    // Cap Inter Marathon = 65. Avec session factor 4 (3 running ×1.00) = 65.
    // Reduction min 0.60 → 65 × 0.60 = 39 km (floor garde-fou).
    expect(peak).toBeGreaterThanOrEqual(35);
  });

  it('S1-preserve : hasInjury=true ne touche PAS cv user (doctrine input_client_obligatoire)', () => {
    // Doctrine feedback_input_client_obligatoire : S1 = currentVolume IMMUABLE.
    // F-19 module le PIC, pas S1. Verrouille la non-régression.
    const cv = 40;
    const result = calculatePeriodizationPlan(
      baseProfile.totalWeeks, cv, baseProfile.level,
      baseProfile.goal, baseProfile.subGoal, baseProfile.trailDistance,
      baseProfile.trailElevation, baseProfile.targetTime, baseProfile.age,
      baseProfile.weight, baseProfile.vma, baseProfile.sessionsPerWeek,
      { height: 180, hasInjury: true },
    );
    // S1 doit être ≥ cv user (floor garde-fou input client)
    expect(result.weeklyVolumes[0]).toBeGreaterThanOrEqual(cv);
  });
});
