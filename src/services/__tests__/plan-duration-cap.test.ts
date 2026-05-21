/**
 * P1-7 (2026-05-21, bug floggyz 30 sem 10K) — Tests anti-régression cap
 * `planDurationWeeks` par objectif.
 *
 * BUG : avant ce fix, `planDurationWeeks = max(4, min(30, diffWeeks))` global,
 * sans cap par distance. Floggyz 10K Finisher Expert raceDate +30 sem → plan
 * 30 sem (excessif pour un 10K).
 *
 * FIX : table `maxWeeksByGoal` :
 *   5K       → 10 sem max
 *   10K      → 16 sem max
 *   Semi     → 20 sem max
 *   Marathon → 24 sem max
 *   Trail / Hyrox / Perte de poids / Maintien : conservent 30 sem.
 *
 * Bonus : résout indirectement P1-2 (Expert phase fondamental trop longue sur
 * plans 30 sem en route courte distance), évite refacto safety net L675.
 *
 * Lancer : npx vitest run src/services/__tests__/plan-duration-cap.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computePlanDurationWeeks } from '../geminiService';

// Helper : raceDate à N semaines de startDate.
function raceDatePlusWeeks(startISO: string, weeks: number): string {
  const start = new Date(startISO);
  const race = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return race.toISOString().split('T')[0];
}

const START = '2026-06-01';

describe('P1-7 — Cap planDurationWeeks par objectif', () => {
  it('1. 10K Finisher avec raceDate +30 sem → cap à 16 (floggyz)', () => {
    const r = computePlanDurationWeeks({
      subGoal: '10 km',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 30),
    });
    expect(r.planDurationWeeks).toBe(16);
    expect(r.cap).toBe(16);
    expect(r.adjustedStartDate).toBeDefined();
  });

  it('2. Semi-Marathon raceDate +25 sem → cap à 20', () => {
    const r = computePlanDurationWeeks({
      subGoal: 'Semi-Marathon',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 25),
    });
    expect(r.planDurationWeeks).toBe(20);
    expect(r.cap).toBe(20);
  });

  it('3. Marathon raceDate +30 sem → cap à 24', () => {
    const r = computePlanDurationWeeks({
      subGoal: 'Marathon',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 30),
    });
    expect(r.planDurationWeeks).toBe(24);
    expect(r.cap).toBe(24);
  });

  it('4. Trail raceDate +30 sem → 30 (inchangé, pas de cap distance route)', () => {
    const r = computePlanDurationWeeks({
      subGoal: 'Trail 50 km',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 30),
    });
    expect(r.planDurationWeeks).toBe(30);
    expect(r.cap).toBe(30);
    expect(r.adjustedStartDate).toBeUndefined();
  });

  it('5. 10K raceDate +12 sem → 12 (sous cap, pas d\'ajustement)', () => {
    const r = computePlanDurationWeeks({
      subGoal: '10 km',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 12),
    });
    expect(r.planDurationWeeks).toBe(12);
    expect(r.cap).toBe(16);
    expect(r.adjustedStartDate).toBeUndefined();
  });

  it('6. 5K raceDate +15 sem → cap à 10', () => {
    const r = computePlanDurationWeeks({
      subGoal: '5 km',
      startDate: START,
      raceDate: raceDatePlusWeeks(START, 15),
    });
    expect(r.planDurationWeeks).toBe(10);
    expect(r.cap).toBe(10);
  });
});
