/**
 * Tests anti-régression Fix A — libellé "effort équivalent" Trail
 *
 * Audit Cyril (Trail 45 km / 1900 m D+) + Bertrand (Trail 16 km / 1000 m D+) :
 *   le message IRRÉALISTE citait "Sur marathon, le seuil 88 % VMA..." pour
 *   Bertrand et "Sur 64 km..." pour Cyril → crédibilité produit cassée car le
 *   label `distanceThresholds.label` est dérivé de la distance EFFECTIVE
 *   (distance + D+/100, règle Kilian) et ne fait pas sens pour le user qui
 *   raisonne en km terrain.
 *
 * Fix : pour Trail avec D+ > 0, libellé explicite type
 *   "Sur ton trail de X km avec Y m de dénivelé (≈ Z km d'effort équivalent)".
 * Pour route (5K / 10K / Semi / Marathon) : libellé classique inchangé.
 *
 * Le calcul (effectiveDistanceKm et seuil VMA) reste strictement identique —
 * seul le LIBELLÉ affiché change. Aucune incidence sur le score ni le statut.
 *
 * Lancer : npx vitest run src/services/__tests__/feasibility-trail-label.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';

const baseTrailParams = {
  level: 'Intermédiaire (Régulier)',
  planWeeks: 16,
  currentVolume: 30,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 4,
  goal: 'Trail',
};

const baseRouteParams = {
  level: 'Confirmé (Compétition)',
  planWeeks: 12,
  currentVolume: 40,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 4,
  goal: 'Course sur route',
};

describe('Fix A — Libellé Trail explicite (effort équivalent)', () => {
  it('Bertrand — Trail 16 km + 1000 m D+ → label "trail" + "16 km" + "1000 m" + "26 km effort équivalent" (PAS "marathon")', () => {
    // effectiveDistanceKm = 16 + 1000/100 = 26 km → seuil "marathon" (d<=43)
    // unrealistic = 0.88. VMA=10, target 2h45 → speed=9.45 km/h, pctVMA=94.5%
    // vmaNeeded = 9.45/0.80 = 11.82 → ratio 118% → passe gate 130, déclenche IRRÉALISTE.
    const result = calculateFeasibility({
      ...baseTrailParams,
      vma: 10,
      targetTime: '2h45',
      distance: 'Trail 16km',
      trailElevation: 1000,
      trailDistance: 16,
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.message).toMatch(/trail/i);
    expect(result.message).toContain('16 km');
    expect(result.message).toContain('1000 m');
    expect(result.message).toContain("26 km d'effort équivalent");
    // Ne doit PAS citer "marathon" comme catégorie (crédibilité produit)
    expect(result.message).not.toMatch(/Sur marathon/);
  });

  it('Cyril — Trail 45 km + 1900 m D+ → label "trail" + "45 km" + "1900 m" + "64 km effort équivalent" (PAS "Sur 64 km" brut)', () => {
    // effectiveDistanceKm = 45 + 19 = 64 km → seuil "ultra" (d>43) unrealistic=0.85
    // VMA=12, target 6h00 → speed=10.67 km/h, pctVMA=88.9% > 85% → IRRÉALISTE
    // vmaNeeded = 10.67/0.70 = 15.24 → ratio 127% → passe gate 130.
    const result = calculateFeasibility({
      ...baseTrailParams,
      vma: 12,
      targetTime: '6h00',
      distance: 'Trail 45km',
      trailElevation: 1900,
      trailDistance: 45,
      planWeeks: 20,
      currentVolume: 50,
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.message).toMatch(/trail/i);
    expect(result.message).toContain('45 km');
    expect(result.message).toContain('1900 m');
    expect(result.message).toContain("64 km d'effort équivalent");
    // Le libellé brut "Sur 64 km," ne doit plus apparaître seul
    expect(result.message).not.toMatch(/Sur 64 km,/);
  });

  it('Trail 30 km + 0 m D+ (cas rare plat) → fallback label classique (pas de libellé trail)', () => {
    // Sans D+, effectiveDistanceKm = 30 → seuil "marathon" (d<=43)
    // Le fix se déclenche UNIQUEMENT si trailElevation > 0. Donc fallback OK.
    // VMA=10, target 2h45 → speed=10.91 km/h, pctVMA=109% → vmaNeeded=13.64 → ratio 136% → gate L437
    // → message gate VMA, pas message seuil. On utilise plutôt 3h15 pour cibler L485.
    // VMA=10, target 3h15 (3.25h) → speed=30/3.25=9.23, pctVMA=92.3% → IRRÉALISTE.
    // vmaNeeded = 9.23/0.80 = 11.54 → ratio 115% → passe gate, déclenche L485.
    const result = calculateFeasibility({
      ...baseTrailParams,
      vma: 10,
      targetTime: '3h15',
      distance: 'Trail 30km',
      // trailElevation absent → fallback
      trailDistance: 30,
    });
    expect(result.status).toBe('IRRÉALISTE');
    // Fallback : pas de mention "effort équivalent" puisque pas de D+
    expect(result.message).not.toContain("effort équivalent");
    // Libellé classique route catégorie
    expect(result.message).toMatch(/Sur (marathon|semi-marathon|\d+ km)/);
  });

  it('Marathon 42.195 km (route) → label classique "Sur marathon" inchangé', () => {
    // Cas non-régression route : VMA=16, target 2h45 → speed=15.34, pctVMA=95.9% > 88% (marathon unreal)
    // vmaNeeded = 15.34/0.80 = 19.18 → ratio 119.9% → passe gate, déclenche L485.
    const result = calculateFeasibility({
      ...baseRouteParams,
      vma: 16,
      targetTime: '2h45',
      distance: 'Marathon',
      planWeeks: 16,
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.message).toContain('Sur marathon');
    expect(result.message).not.toMatch(/trail/i);
    expect(result.message).not.toContain("effort équivalent");
  });

  it('Semi 21.1 km (route) → label classique "Sur semi-marathon" inchangé (cas mxjulien02)', () => {
    // Non-régression Fix C : mxjulien02 Semi 2h00 VMA 10.8 → IRRÉALISTE strict, libellé route préservé.
    const result = calculateFeasibility({
      ...baseRouteParams,
      vma: 10.8,
      targetTime: '2h00',
      distance: 'Semi-Marathon',
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.message).toContain('Sur semi-marathon');
    expect(result.message).not.toMatch(/trail/i);
    expect(result.message).not.toContain("effort équivalent");
  });
});
