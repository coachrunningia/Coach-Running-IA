/**
 * Sprint A P0 — Tests anti-régression 3 fixes critiques validés expert FFA 20 ans.
 *
 * Sources :
 *   - /Users/romanemarino/Coach-Running-IA/VERDICT-EXPERT-5-BUGS.md
 *
 * Bug #2a — feasibilityService : passer la VRAIE S1 calibrée au confidenceScore
 *   Avant : s1Volume estimé via cv×1.10 → règle 4 R2 morte sur cas Clémentine.
 *   Après : s1ActualVolume passé depuis calculatePeriodizationPlan → règle 4 vive.
 *
 * Bug #3 — geminiService.calculatePeriodizationPlan : cap S1 à 1.3× currentVolume
 *   ACWR Gabbett zone verte/jaune. Cas Clémentine cv=25 → S1=40 (rouge) → S1=32.
 *
 * Bug #4 — geminiService.applyMarcheCourseRouting : garde-fou niveau
 *   Routing MC autorisé UNIQUEMENT si Débutant OU (VMA<10 ET cv<10).
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-a-p0-fixes.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';
import { calculatePeriodizationPlan, applyMarcheCourseRouting } from '../geminiService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseFeasibility = {
  goal: 'Course sur route',
  level: 'Intermédiaire (Régulier)',
  planWeeks: 10,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 4,
};

// Helper : un mainSet "Marche/Course" type Galloway tel que produit par Gemini.
const walkRunMainSet = "Échauffement 10 min. 8 × (1 min de course / 2 min de marche). Retour au calme 5 min.";

// ─────────────────────────────────────────────────────────────────────────────
// Bug #2a — vraie S1 passée au confidenceScore
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #2a — passer la VRAIE S1 calibrée au confidenceScore', () => {
  it('Clémentine (cv=25, S1_calibrée=40, Marathon 4h50) → score < 80 (statut RISQUÉ ou IRRÉALISTE)', () => {
    // sautPct = (40-25)/25 = 0.60 > 0.50 ET sautAbs = 15 (= seuil).
    // Règle 4 R2 → irrealisticCap = 10 (saut violent).
    const result = calculateFeasibility({
      ...baseFeasibility,
      vma: 11,
      targetTime: '4h50',
      distance: 'Marathon',
      currentVolume: 25,
      s1ActualVolume: 40,
      age: 30,
      planWeeks: 10,
    });
    expect(result.score).toBeLessThan(80);
    // Avec saut violent +60% → cap 10 attendu (statut IRRÉALISTE).
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it('Cas sain (cv=50, S1_calibrée=55, ACWR 1.10) → score non impacté par règle 4', () => {
    // sautPct = (55-50)/50 = 0.10 < 0.30 → aucune pénalité saut.
    const baselineResult = calculateFeasibility({
      ...baseFeasibility,
      vma: 13,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 35,
      planWeeks: 16,
    });
    // Pas de chute brutale liée à la règle saut.
    expect(baselineResult.score).toBeGreaterThanOrEqual(50);
  });

  it('Sans s1ActualVolume (rétro-compat) → fallback estimation cv×1.10 préservé', () => {
    // Ancien comportement : pas de s1ActualVolume → estimation cv×1.10 = 27.5
    // → sautPct = 0.10 → aucune pénalité (règle 4 morte, comportement legacy).
    const result = calculateFeasibility({
      ...baseFeasibility,
      vma: 11,
      targetTime: '4h50',
      distance: 'Marathon',
      currentVolume: 25,
      age: 30,
      planWeeks: 10,
      // s1ActualVolume non fourni
    });
    // Score peut rester >= 30 si rien d'autre ne déclenche (vs avec s1=40 → ≤ 20).
    expect(result.score).toBeGreaterThan(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #3 — cap S1 à 1.3× currentVolume (ACWR) + redistribution
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #3 — cap S1 à 1.3× currentVolume (ACWR Gabbett)', () => {
  it('Clémentine (cv=25, plan Marathon 10 sem Inter) → S1 finale ≤ 33 km (cap 1.3×=32.5)', () => {
    const plan = calculatePeriodizationPlan(
      10,                          // totalWeeks
      25,                          // currentVolume
      'Intermédiaire (Régulier)',  // level
      'Course sur route',          // goal
      'Marathon',                  // subGoal
      undefined,                   // trailDistance
      undefined,                   // trailElevation
      '4h50',                      // targetTime
      30,                          // age
      62,                          // weight
      11,                          // vma
      4,                           // sessionsPerWeek
      { height: 168 },
    );
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(33);
    // Sanity : on n'écrase pas en-dessous du currentVolume (doctrine respect input).
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(25);
  });

  it('Cas sain (cv=50, plan Marathon 16 sem Conf) → pas de cap (ratio raw < 1.3)', () => {
    const plan = calculatePeriodizationPlan(
      16,
      50,
      'Confirmé (Compétition)',
      'Course sur route',
      'Marathon',
      undefined,
      undefined,
      '3h30',
      35,
      70,
      14,
      5,
      { height: 175 },
    );
    // S1 raw = max(idealStart, currentVolume) ; le cap 1.3×50 = 65 ne devrait pas mordre.
    // On valide que S1 reste ≥ currentVolume (hard floor) et ≤ 1.3× cv (cap respecté).
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(50);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(Math.round(50 * 1.3));
  });

  it('Profil senior (cv=50, plan Marathon 24 sem Expert âgé) → S1 ≈ 50 (vol stable, ACWR 1.0)', () => {
    // Cas Guliver-like : cv=50 → S1 calibrée ~ 50 → ratio 1.0 → pas de cap.
    const plan = calculatePeriodizationPlan(
      24,
      50,
      'Expert (Performance)',
      'Course sur route',
      'Marathon',
      undefined,
      undefined,
      '3h55',
      72,
      75,
      13.5,
      5,
      { height: 178 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(50);
    // Cap respecté (≤ 1.3 × 50 = 65).
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(65);
  });

  it('cv=0 (débutant absolu) → pas de cap (condition currentVolume > 0)', () => {
    // Pas de baseline → la logique absoluteBeginner / minStartVolume prime.
    const plan = calculatePeriodizationPlan(
      12,
      0,
      'Débutant (0-1 an)',
      'Course sur route',
      '10K',
      undefined,
      undefined,
      'Finisher',
      28,
      65,
      9,
      3,
      { height: 170 },
    );
    // Le cap ne touche pas car currentVolume <= 0.
    expect(plan.weeklyVolumes[0]).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #4 — garde-fou routing Marche/Course
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #4 — garde-fou routing Marche/Course (Débutant OR VMA<10 ET cv<10)', () => {
  it('Débutant VMA 8 cv 5 → routing Marche/Course actif (type forcé)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing débutant', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 8, currentWeeklyVolume: 5 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Expert VMA 13.5 cv 50 (Guliver) → routing DÉSACTIVÉ, SL conserve type "Sortie Longue"', () => {
    const slMainSet = "Échauffement 15 min EF. 12 km vallonné avec 1 min de course / 1 min de marche en montées. Retour au calme 5 min.";
    const week = {
      sessions: [
        { type: 'Sortie Longue', title: 'Sortie Longue vallonnée 18 km', mainSet: slMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Expert (Performance)', vma: 13.5, currentWeeklyVolume: 50 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
    // La phrase walk-break a été nettoyée du mainSet.
    expect(week.sessions[0].mainSet).not.toMatch(/1 min de course \/ 1 min de marche/);
  });

  it('Confirmé VMA 11 cv 25 (Clémentine) → routing DÉSACTIVÉ', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing récup', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Confirmé (Compétition)', vma: 11, currentWeeklyVolume: 25 });
    expect(week.sessions[0].type).toBe('Jogging');
  });

  it('Débutant déclaré VMA 11 cv 12 (BMI high) → routing actif (Débutant déclaré prime)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing reprise', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 11, currentWeeklyVolume: 12 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Reprise santé Inter VMA 9.5 cv 8 → routing actif (VMA<10 ET cv<10)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing reprise', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 9.5, currentWeeklyVolume: 8 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Idempotent : session déjà typée Marche/Course → laissée intacte', () => {
    const week = {
      sessions: [
        { type: 'Marche/Course', title: 'MC débutant', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, { level: 'Expert (Performance)', vma: 13, currentWeeklyVolume: 50 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Pas de ctx (legacy fallback) → routing DÉSACTIVÉ par défaut (sécurité)', () => {
    // ctx undefined → isBeginner=false, vmaVeryLow=false (vma=99>10), cvVeryLow=false.
    // routingAllowed=false → on retire la phrase mais on ne force pas le type.
    const week = {
      sessions: [
        { type: 'Sortie Longue', title: 'SL', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});
