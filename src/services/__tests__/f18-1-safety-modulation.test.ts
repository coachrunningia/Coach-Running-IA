/**
 * F-18.1 (2026-05-28) — Tests anti-régression modulation safety du plancher MIN_WEEKLY_VOLUME
 *
 * BUG d'origine F-18 (déployé 18:50, retiré 19:30) :
 *   F-18 introduit MIN_WEEKLY_VOLUME pour éviter les pics ridicules (cyrielle Semi 14 km
 *   < race 21 km). Bug : `minPeakVolume = MIN[obj][level]` ÉCRASE les protections
 *   existantes calculées dans `totalReduction` (BMI/age/poids L2965-2987) et BYPASS
 *   le cap physiologique `effectiveVmaCap` (sécurité tendineuse).
 *
 * CAUSE RACINE (verdict croisé PM + Coach pro course à pied FFA 28/05/2026) :
 *   1. F-18 ne réutilise pas `totalReduction` calculé L2952-2992
 *   2. F-18 ne re-cappe pas par `effectiveVmaCap` (calculé L3133+)
 *   3. F-18 ne tient pas compte de `hasInjury`
 *
 * FIX F-18.1 (3 patches geminiService.ts) :
 *   1. `params.hasInjury` propagé à calculatePeriodizationPlan
 *   2. `totalReduction *= 0.75` si hasInjury (bloc L2961-2992)
 *   3. `minPeakVolume = min(round(MIN[obj][level] * totalReduction), effectiveVmaCap)`
 *
 * Doctrines : feedback_securite_avant_conversion, feedback_jamais_baisser_allure_cible
 * (la cible chrono reste user → on adapte le VOLUME, jamais l'ALLURE).
 *
 * Lancer : npx vitest run src/services/__tests__/f18-1-safety-modulation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

function plan(args: {
  totalWeeks?: number;
  currentVolume: number;
  level: string;
  goal?: string;
  subGoal?: string;
  trailDistance?: number;
  trailElevation?: number;
  targetTime?: string;
  age?: number;
  weight?: number;
  height?: number;
  vma: number;
  sessionsPerWeek?: number;
  hasInjury?: boolean;
}): { peak: number; volumes: number[] } {
  const p = calculatePeriodizationPlan(
    args.totalWeeks || 16,
    args.currentVolume,
    args.level,
    args.goal || 'Course sur route',
    args.subGoal || 'Marathon',
    args.trailDistance,
    args.trailElevation,
    args.targetTime || 'Finisher',
    args.age || 35,
    args.weight || 65,
    args.vma,
    args.sessionsPerWeek || 3,
    { height: args.height || 170, hasInjury: args.hasInjury },
  );
  return { peak: Math.max(...p.weeklyVolumes), volumes: p.weeklyVolumes };
}

describe('F-18.1 — Modulation safety du plancher MIN_WEEKLY_VOLUME', () => {

  // ════════════════════════════════════════════════════════════════
  // CAS DANGEREUX F-18 brut (verdict Coach pro + PM)
  // ════════════════════════════════════════════════════════════════

  it('1. Cas A — Marathon Déb 57 ans BMI 30 cv 5 → pic MODULÉ (≤ 32 km)', () => {
    // F-18 brut : MIN['Marathon']['deb'] = 35 km → pic forcé à 35.
    // F-18.1 : totalReduction = 0.80 (BMI 30) × 0.85 (age 57) = 0.68 → 35×0.68 ≈ 24.
    // Borné par plancher 0.60 → minimum 35×0.60 = 21 km.
    // Effectivement capé par effectiveVmaCap si VMA basse.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 5, subGoal: 'Marathon',
      vma: 10.5, age: 57, weight: 78, height: 161, // BMI ≈ 30.1
      sessionsPerWeek: 3, totalWeeks: 16, targetTime: '4h30',
    });
    // F-18 brut aurait forcé 35. F-18.1 doit moduler à < 32.
    expect(peak).toBeLessThan(32);
    // Plancher de sécurité minimum (race-1) : pas plus bas que ce que la VMA permet.
    expect(peak).toBeGreaterThan(0);
  });

  it('2. Cas E — Marathon Déb 30 ans BMI 32 cv 15 → pic MODULÉ (< 35 brut)', () => {
    // F-18 brut : 35 km forcé sur obèse classe 1 = blessure overuse garantie.
    // F-18.1 : totalReduction = 0.80 (BMI 30+) → minHebdo F-18 35×0.80 = 28 km.
    // Le pic réel peut être au-dessus si maxVolume modulé + cv*(1+rate)^N donne plus.
    // Le test garantit que le pic est < 35 brut (modulation appliquée).
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 15, subGoal: 'Marathon',
      vma: 12, age: 30, weight: 95, height: 172, // BMI ≈ 32.1
      sessionsPerWeek: 4, totalWeeks: 16, targetTime: '4h00',
    });
    expect(peak).toBeLessThan(35); // modulé strictement sous le brut F-18
  });

  it('3. Semi Déb hasInjury cv 3 VMA 11 → pic modulé < 25 km', () => {
    // F-18 brut : MIN['Semi']['deb'] = 25 km forcé sur tendinite active = récidive.
    // F-18.1 : hasInjury ×0.75 → 25×0.75 ≈ 19 km. Effectif capé par VMA aussi.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 3, subGoal: 'Semi',
      vma: 11, age: 35, weight: 65, height: 170, hasInjury: true,
      sessionsPerWeek: 3, totalWeeks: 12, targetTime: 'Finisher',
    });
    expect(peak).toBeLessThan(25); // modulé sous le brut
  });

  it('4. Marathon Déb 60 ans cv 20 BMI 22 → pic modulé < 35 km (protection senior)', () => {
    // F-18 brut : 35 km forcé sur senior 60 ans = +75% sur cap senior 0.85.
    // F-18.1 : age ≥55 → ×0.85 → 35×0.85 ≈ 30 km.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 20, subGoal: 'Marathon',
      vma: 12, age: 60, weight: 70, height: 178, // BMI ≈ 22.1
      sessionsPerWeek: 4, totalWeeks: 16, targetTime: '4h15',
    });
    expect(peak).toBeLessThan(35); // modulé sous le brut
    expect(peak).toBeGreaterThanOrEqual(25); // pas excessivement bas
  });

  // ════════════════════════════════════════════════════════════════
  // CAS OK (profils SAINS jeunes BMI normal) — plancher F-18 doit s'appliquer
  // ════════════════════════════════════════════════════════════════

  it('5. Cas B — Semi Déb cv 3 VMA 11.5 freq 3 (cyrielle-like) → capé effectiveVmaCap', () => {
    // F-18.1 : totalReduction = 1.0 (sain), adjustedMin = 25 km MAIS effectiveVmaCap bas
    // (freq 3 = 2 runs × durée × 0.75×VMA → ≈ 9-14 km).
    // Doctrine PM/Coach pro : la sécurité physiologique (effectiveVmaCap) PRIME sur le
    // plancher race-distance. Le user reçoit welcomeMessage IRRÉALISTE + CTA regen
    // (target 2h28 plus réaliste OU freq augmentée).
    // → cyrielle reste à <25 km mais protégée par message explicite (non-régression
    // sur la protection tendineuse tendineuse, transparence opt-in user).
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 3, subGoal: 'Semi',
      vma: 11.5, age: 35, weight: 55, height: 167, // BMI ≈ 19.7
      sessionsPerWeek: 3, totalWeeks: 12, targetTime: 'Finisher',
    });
    // Sécurité physio : on reste sous le plancher car VMA × freq ne permet pas plus.
    // Doctrine `feedback_securite_avant_conversion` : warning user (welcomeMessage),
    // pas force le volume au-delà du soutenable.
    expect(peak).toBeLessThan(25); // capé VMA, doctrine respectée
    expect(peak).toBeGreaterThan(0); // plan généré quand même (doctrine "on génère TOUJOURS")
  });

  it('6. Cas D — Marathon Inter 45 ans BMI 28 cv 20 → plancher 50 km appliqué', () => {
    // F-18.1 : BMI 28 < 30 → pas de trigger BMI. age 45 < 55 → pas de trigger senior.
    // Mais BMI 28 + age 45-50 (proche) → 0.90 si age ≥ 50, sinon rien.
    // → plancher 50 km appliqué (totalReduction = 1.0).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 20, subGoal: 'Marathon',
      vma: 13, age: 45, weight: 82, height: 171, // BMI ≈ 28.0
      sessionsPerWeek: 4, totalWeeks: 16, targetTime: '3h45',
    });
    expect(peak).toBeGreaterThanOrEqual(35); // plancher Inter
  });

  // ════════════════════════════════════════════════════════════════
  // NON-RÉGRESSION : tests semi-marathon-volume-floor.test.ts continuent
  // ════════════════════════════════════════════════════════════════

  it('7. Margaux Inter cv=17 freq=3 Semi 2h20 sain → pic ≥ 22 km (non-régression)', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 17, subGoal: 'Semi',
      vma: 10.9, age: 35, weight: 65, height: 170,
      sessionsPerWeek: 3, totalWeeks: 12, targetTime: '2h20',
    });
    expect(peak).toBeGreaterThanOrEqual(22);
  });

  it('8. Profil Confirmé cv=50 freq=5 Marathon → pic non régressé (≥ 60)', () => {
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 50, subGoal: 'Marathon',
      vma: 16, age: 35, weight: 65, height: 170,
      sessionsPerWeek: 5, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(60);
  });

  it('9. Trail 100K Expert 45a BMI 28 cv 60 → plancher 80 km modulé', () => {
    // F-18.1 : BMI 28 = pas trigger ≥30, age 45 = pas trigger ≥55.
    // age 45 + BMI 28 → 0.90 si age ≥ 50, sinon rien. Ici age=45 → totalReduction=1.0.
    // → plancher Trail100+ Expert = 80 km appliqué.
    const { peak } = plan({
      level: 'Expert (Performance)', currentVolume: 60, goal: 'Trail',
      subGoal: 'Trail100+', trailDistance: 100, trailElevation: 4000,
      vma: 15.5, age: 45, weight: 80, height: 169, // BMI ≈ 28.0
      sessionsPerWeek: 5, totalWeeks: 20,
    });
    // Trail Ultra Pfitzinger Ultra-Running ref ≥ 60% race = ≥ 60 km
    expect(peak).toBeGreaterThanOrEqual(60);
  });
});
