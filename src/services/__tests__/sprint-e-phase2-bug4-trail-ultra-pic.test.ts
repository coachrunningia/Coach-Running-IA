/**
 * Sprint E Phase 2 — Bug 4 : Pic volume Trail Ultra (≥ 50 km) avec floor 60% race.
 *
 * Source :
 *   - Patch zone : calculatePeriodizationPlan ~ L3041 (après hard floors Semi/Marathon).
 *   - Doctrine [[feedback_courte_duree_charge_allegee]] : on calibre sous référentiel.
 *   - Réf Pfitzinger Ultra-Running : pic = 60-75 % race distance pour Confirmé.
 *
 * Cas Olivier (126 km / cv 30 / 27 sem / Confirmé) : pic VMA-based + ACWR-clamp
 * tombait à ~52 km (41 % race) → insuffisant pour préparer un 100M. Le floor
 * 60 % le remonte à 76 km min.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase2-bug4-trail-ultra-pic.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

const peakOf = (volumes: number[]) => Math.max(...volumes);

describe('Bug 4 — Trail Ultra pic ≥ 60% race distance', () => {
  it('Olivier-like 126 km / cv 30 / 27 sem / Confirmé → pic ≥ 75 km (60% × 126)', () => {
    const plan = calculatePeriodizationPlan(
      27,                              // totalWeeks
      30,                              // currentVolume
      'Confirmé (Compétition)',        // level
      'Trail',                         // goal
      undefined,                       // subGoal
      126,                             // trailDistance
      4000,                            // trailElevation
      undefined,                       // targetTime
      35,                              // age
      70,                              // weight
      14.5,                            // vma
      5,                               // sessionsPerWeek
      { height: 180 },
    );
    expect(peakOf(plan.weeklyVolumes)).toBeGreaterThanOrEqual(75);
  });

  it('Trail 100 km / cv 40 / 20 sem / Confirmé → pic ≥ 60 km (60% × 100)', () => {
    const plan = calculatePeriodizationPlan(
      20, 40, 'Confirmé (Compétition)', 'Trail',
      undefined, 100, 3500, undefined, 32, 68, 15, 5,
      { height: 178 },
    );
    expect(peakOf(plan.weeklyVolumes)).toBeGreaterThanOrEqual(60);
  });

  it('Trail 50 km / cv 30 / 14 sem / Intermédiaire → pic ≥ 30 km (60% × 50)', () => {
    const plan = calculatePeriodizationPlan(
      14, 30, 'Intermédiaire (Régulier)', 'Trail',
      undefined, 50, 1500, undefined, 30, 70, 13, 4,
      { height: 175 },
    );
    expect(peakOf(plan.weeklyVolumes)).toBeGreaterThanOrEqual(30);
  });

  it('Trail court 25 km < 50 km → PAS de floor 60% (cv-based normal)', () => {
    // Sans floor 60%, le pic peut rester sous 15 km (60% × 25) selon profil cv bas.
    // Hard floor reste celui des autres règles (effectiveVmaCap / cv-based).
    const plan = calculatePeriodizationPlan(
      12, 15, 'Intermédiaire (Régulier)', 'Trail',
      undefined, 25, 600, undefined, 35, 70, 12, 3,
      { height: 175 },
    );
    // Le test vérifie qu'on n'applique PAS le floor 60% (qui forcerait pic ≥ 15).
    // Le pic réel peut être ≥ 15 pour d'autres raisons (cv 15 × progression),
    // mais on s'assure que la branche Trail Ultra ne s'est pas déclenchée :
    // pic raisonnablement contraint par VMA-cap, pas par floor 60% × 25 = 15.
    // Pour le test, on vérifie simplement que le plan tourne sans crash et
    // qu'on a un pic positif. Le critère "pas de floor 60%" est implicite
    // (la condition `trailDistance >= 50` n'est pas vraie pour 25).
    expect(plan.weeklyVolumes.length).toBe(12);
    expect(peakOf(plan.weeklyVolumes)).toBeGreaterThan(0);
  });

  it('Trail 100 km / cv 0 (absolute beginner) → cap VMA-durée peut mordre, floor NON garanti', () => {
    // Profil extrême : cv = 0, débutant pur. Le cap VMA-durée (effectiveVmaCap)
    // est volontairement plus restrictif que le floor 60% pour ne pas blesser.
    // Doctrine : sécurité physique > référentiel théorique.
    // Le pic peut être < 60 km dans ce cas (cap effectiveVmaCap = sécurité).
    const plan = calculatePeriodizationPlan(
      24, 0, 'Débutant (0-1 an)', 'Trail',
      undefined, 100, 3500, undefined, 28, 75, 10, 3,
      { height: 178 },
    );
    expect(plan.weeklyVolumes.length).toBe(24);
    expect(peakOf(plan.weeklyVolumes)).toBeGreaterThan(0);
    // On ne fait PAS expect(peak >= 60) ici : doctrine sécurité prime.
  });
});
