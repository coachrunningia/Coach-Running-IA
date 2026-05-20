/**
 * P0c (2026-05-20, validation Coach 20 ans Pfitzinger Lab) — Tests garde-fou
 * rampe de progression : `peakVolume / currentVolume > 2.0` → score cap 50.
 *
 * Contexte : ratio Gabbett (Acute:Chronic Workload Ratio) standard seuil = 1.5.
 * Au-dessus de 2.0, risque blessure significatif documenté (overuse,
 * tendinopathies, stress fractures). Cas extrême audit : Marathon cv=10 freq=3
 * → pic 32 km = ratio 3.2× → rampe absurde.
 *
 * Fix : cap score à 50 (= seuil AMBITIEUX max) + raison explicite injectée
 * dans `reasons` (côté buildFinisherFeasibility) ou en aval (chemin général).
 *
 * Lancer : npx vitest run src/services/__tests__/feasibility-p0c-peak-volume-guard.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';

const baseParams = {
  goal: 'Course sur route',
  level: 'Intermédiaire (Régulier)',
  planWeeks: 16,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 3,
};

describe('P0c — Garde-fou rampe pic/cv > 2.0', () => {
  it('1. Marathon cv=10 pic=32 (ratio 3.2) → score capé à 50 max', () => {
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      targetTime: 'Finisher',
      distance: 'Marathon',
      currentVolume: 10,
      peakVolume: 32,
    });
    // Score capé à 50 — peut être RISQUÉ ou AMBITIEUX (selon autres facteurs).
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it('2. Marathon cv=10 pic=32 Finisher → message contient mention pic 2× volume', () => {
    // Chemin Finisher utilise buildFinisherFeasibility qui push une raison
    // explicite ("pic d'entraînement ... plus de 2× ton volume actuel"). Cette
    // raison est ensuite agglomérée dans `result.message` via riskReasons.
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      targetTime: 'Finisher',
      distance: 'Marathon',
      currentVolume: 10,
      peakVolume: 32,
    });
    // Le message doit mentionner explicitement le ratio pic/cv > 2×.
    expect(result.message).toMatch(/pic.*plus de 2.*volume actuel|2×.*volume|rampe/i);
  });

  it('3. Marathon cv=20 pic=32 (ratio 1.6) → garde-fou inactif', () => {
    // Ratio sous 2.0 → garde-fou pic/cv ne se déclenche PAS (le warning Pfitzinger
    // > 1.5 reste possible via d'autres règles, mais pas le cap dur ici).
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      targetTime: 'Finisher',
      distance: 'Marathon',
      currentVolume: 20,
      peakVolume: 32,
    });
    // Le message ne mentionne PAS la formule "plus de 2× ton volume actuel".
    expect(result.message).not.toMatch(/plus de 2.*volume actuel/i);
  });

  it('4. Semi cv=15 pic=22 (ratio 1.47) → garde-fou inactif', () => {
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      targetTime: 'Finisher',
      distance: 'Semi-Marathon',
      currentVolume: 15,
      peakVolume: 22,
      planWeeks: 12,
    });
    expect(result.message).not.toMatch(/plus de 2.*volume actuel/i);
  });

  it('5. peakVolume undefined → garde-fou inactif (pas de crash)', () => {
    // Quand peakVolume n'est pas fourni (call legacy), le garde-fou ne s'active pas.
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      targetTime: 'Finisher',
      distance: 'Marathon',
      currentVolume: 10,
      // pas de peakVolume
    });
    expect(result.message).not.toMatch(/plus de 2.*volume actuel/i);
    // Le calcul finit sans erreur (status défini).
    expect(result.status).toBeDefined();
  });
});
