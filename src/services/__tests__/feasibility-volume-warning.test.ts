/**
 * P1-6 (2026-05-21, bug Bertrand) — Tests anti-régression message "très chargée
 * en volume" (devenu "manquera de variété") conditionné sur km/séance ≥ 10.
 *
 * BUG : avant ce fix, le warning fréquence se déclenchait dès `freq <= 3 &&
 * planWeeks > 16` sans regarder le volume effectif par séance. Cas Bertrand :
 * 15 km/sem ÷ 3 séances = 5 km/séance = PAS chargé du tout → warning à tort.
 *
 * FIX : on calcule `kmParSeance = currentVolume / frequency` et on n'émet le
 * warning que si `kmParSeance >= 10` (≥ 10 km/séance, seuil "vraiment chargé").
 * Message reformulé : "ton plan manquera de variété" (au lieu de "très chargée
 * en volume" qui était factuellement faux pour des bas volumes).
 *
 * Note : le warn n'est agglomeré au message que pour status != EXCELLENT (cf.
 * L1453 feasibilityService). Les tests 2 et 4 utilisent un Trail Finisher avec
 * D+ exigeant qui dégrade le status sous EXCELLENT, garantissant la remontée
 * du warn dans le message visible.
 *
 * Lancer : npx vitest run src/services/__tests__/feasibility-volume-warning.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';

const baseParams = {
  vma: 13.5,
  targetTime: 'Finisher',
  distance: 'Semi-Marathon',
  goal: 'Course sur route',
  level: 'Intermédiaire (Régulier)',
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
};

const WARNING_PATTERN_NEW = /manquera de variété/i;
const WARNING_PATTERN_OLD = /très chargée en volume/i;

function hasVarietyWarning(result: ReturnType<typeof calculateFeasibility>): boolean {
  const msg = result.message + ' ' + (result.safetyWarning || '');
  return WARNING_PATTERN_NEW.test(msg) || WARNING_PATTERN_OLD.test(msg);
}

describe('P1-6 — Warning fréquence conditionné km/séance ≥ 10', () => {
  it('1. Bertrand — cv=15, freq=3, planWeeks=19 → 5 km/séance → PAS de warning', () => {
    const result = calculateFeasibility({
      ...baseParams,
      vma: 9.5,
      planWeeks: 19,
      frequency: 3,
      currentVolume: 15,
    });
    expect(hasVarietyWarning(result)).toBe(false);
  });

  it('2. Cas légitime — Trail 20km cv=40 freq=3 planWeeks=18 → 13 km/séance → warning déclenche', () => {
    // Trail Finisher exigeant en D+ → status < EXCELLENT donc le warn surface.
    // kmParSeance = 40/3 ≈ 13 ≥ 10 → warn déclenche.
    const result = calculateFeasibility({
      ...baseParams,
      vma: 10.5,
      goal: 'Trail',
      distance: 'Trail 20km',
      targetTime: 'Finisher',
      planWeeks: 18,
      frequency: 3,
      currentVolume: 40,
      trailDistance: 20,
      trailElevation: 1500,
      currentWeeklyElevation: 50,
    });
    expect(WARNING_PATTERN_NEW.test(result.message + ' ' + (result.safetyWarning || ''))).toBe(true);
  });

  it('3. freq=4 → PAS de warning quel que soit le volume (cv=50)', () => {
    const result = calculateFeasibility({
      ...baseParams,
      planWeeks: 20,
      frequency: 4,
      currentVolume: 50,
    });
    expect(hasVarietyWarning(result)).toBe(false);
  });

  it('4. Limite — Trail 20km cv=30 freq=3 planWeeks=18 → 10 km/séance pile → warning déclenche', () => {
    const result = calculateFeasibility({
      ...baseParams,
      vma: 10.5,
      goal: 'Trail',
      distance: 'Trail 20km',
      targetTime: 'Finisher',
      planWeeks: 18,
      frequency: 3,
      currentVolume: 30,
      trailDistance: 20,
      trailElevation: 1500,
      currentWeeklyElevation: 50,
    });
    expect(WARNING_PATTERN_NEW.test(result.message + ' ' + (result.safetyWarning || ''))).toBe(true);
  });

  it('5. planWeeks=16 (sous seuil) → jamais de warning même si km/séance élevé', () => {
    const result = calculateFeasibility({
      ...baseParams,
      planWeeks: 16,
      frequency: 3,
      currentVolume: 50,
    });
    expect(hasVarietyWarning(result)).toBe(false);
  });
});
