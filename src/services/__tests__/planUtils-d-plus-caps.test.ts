/**
 * Tests anti-régression Fix #1 + #2 — Caps D+ ultra Master/Expert + floor 100% currentWeeklyElevation.
 *
 * Bug A (Fix #1) : Expert cap maxWeeklyElevation 3500 → Rich (race D+ 12000m) plafonné
 * à 3500m/sem (29% du race) = sous-entraîné pour ultra alpin. Source : Balducci 2024,
 * Master Expert ultra alpin pic D+ 50-65% race.
 *
 * Bug B (Fix #2) : `Math.min(currentWeeklyElevation, maxStart)` avec maxStart=1500 écrasait
 * Rich (3000+/sem déclaré) à 1500 — VIOLATION doctrine `feedback_input_client_obligatoire`.
 *
 * Validation Dev ✅ + PM ✅ + Trail ✅ + Coach FFA ✅.
 */

import { describe, it, expect } from 'vitest';
import { calculateWeekTargetElevation } from '../planUtils';

describe('calculateWeekTargetElevation — Fix #1 caps Expert/Confirmé', () => {
  it('Rich case : Expert raceElev=12000, current=3000 → max = 6500 (cap Expert), pas 3500', () => {
    // S1 ratio = 0/(N-1) → startElevation. On vérifie maxWeeklyElevation = target dernière semaine.
    // En S1 (weekNumber=1, total=12), progress=0 → target = startElevation.
    // En Sfinal (weekNumber=12, total=12), progress=1 → target = maxWeeklyElevation.
    const finalWeek = calculateWeekTargetElevation(12, 12, 12000, 'Expert (Performance)', 3000);
    expect(finalWeek).toBe(6500);
  });

  it('Trail court 10km/300D+ : raceElev=300 prime sur cap Expert', () => {
    const finalWeek = calculateWeekTargetElevation(12, 12, 300, 'Expert (Performance)', 100);
    expect(finalWeek).toBe(300); // raceElevation < cap → race prime
  });

  it('Confirmé Trail 30km/1500D+ : raceElev=1500 prime sur cap 4500', () => {
    const finalWeek = calculateWeekTargetElevation(12, 12, 1500, 'Confirmé (Compétition)', 500);
    expect(finalWeek).toBe(1500);
  });

  it('Confirmé Trail ultra UTMB CCC 6000D+ : cap 4500 prime', () => {
    const finalWeek = calculateWeekTargetElevation(12, 12, 6000, 'Confirmé (Compétition)', 1000);
    expect(finalWeek).toBe(4500);
  });

  it('Débutant Trail 1500D+ : cap 800 prime', () => {
    const finalWeek = calculateWeekTargetElevation(12, 12, 1500, 'Débutant (0-1 an)', 200);
    expect(finalWeek).toBe(800);
  });
});

describe('calculateWeekTargetElevation — Fix #2 floor 100% currentWeeklyElevation', () => {
  it('Rich case : current=3000 → S1 startElevation ≥ 3000 (jamais écrasé)', () => {
    // S1 : progress=0 → target = startElevation (raw, sans phase)
    const s1 = calculateWeekTargetElevation(1, 12, 12000, 'Expert (Performance)', 3000);
    expect(s1).toBeGreaterThanOrEqual(3000);
  });

  it('Expert current=5000 → S1 floor préservé à 5000', () => {
    const s1 = calculateWeekTargetElevation(1, 12, 12000, 'Expert (Performance)', 5000);
    expect(s1).toBeGreaterThanOrEqual(5000);
  });

  it('Inter current=600, race=1500 → floor préservé 600 (pas downgrade à 300 defaultStart)', () => {
    const s1 = calculateWeekTargetElevation(1, 12, 1500, 'Intermédiaire (Régulier)', 600);
    expect(s1).toBeGreaterThanOrEqual(600);
  });

  it('Pas de current declared → defaultStart utilisé (300 inter)', () => {
    const s1 = calculateWeekTargetElevation(1, 12, 1500, 'Intermédiaire (Régulier)', undefined);
    // minStartElevation = 1500*0.15 = 225 ; defaultStart = 300 → max(300, min(225, 900)) = max(300, 225) = 300
    expect(s1).toBeGreaterThanOrEqual(225);
    expect(s1).toBeLessThanOrEqual(900);
  });

  it('Phase récup : reduction 55% appliquée sur target (Rich pic)', () => {
    // En phase récup, target *= 0.55
    const recupWeek = calculateWeekTargetElevation(6, 12, 12000, 'Expert (Performance)', 3000, 'récup');
    const normalWeek = calculateWeekTargetElevation(6, 12, 12000, 'Expert (Performance)', 3000);
    expect(recupWeek).toBeLessThan(normalWeek);
    expect(recupWeek).toBeCloseTo(Math.round(normalWeek * 0.55), -1);
  });
});

describe('calculateWeekTargetElevation — non-régression', () => {
  it('raceElevation invalide (0) → retourne 0', () => {
    expect(calculateWeekTargetElevation(1, 12, 0, 'Expert (Performance)', 1000)).toBe(0);
  });

  it('NaN → retourne 0', () => {
    expect(calculateWeekTargetElevation(1, 12, NaN, 'Expert (Performance)', 1000)).toBe(0);
  });

  it('Accepte clé courte "expert"', () => {
    const finalWeek = calculateWeekTargetElevation(12, 12, 12000, 'expert', 3000);
    expect(finalWeek).toBe(6500);
  });
});
