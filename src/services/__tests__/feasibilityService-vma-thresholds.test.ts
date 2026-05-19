/**
 * Tests anti-régression Fix C — Seuils %VMA tenu sur distance.
 *
 * Cause racine : la gate `vmaRatioPercent >= 130` dans `feasibilityService.ts`
 * était asymétrique (utilise `getVmaFactor`). Cas mxjulien02 (Semi 2h00 VMA 10.8) :
 * vmaRatioPercent = 114.9 % (< 130) → passait IRRÉALISTE strict mais physiologiquement
 * il faudrait tenir 97.7 % VMA pendant 21 km → tenable seulement par un Élite.
 *
 * Référence doctrine coach 15 ans (VALIDATION-COACH-AVANT-DEPLOY.md élément C) :
 *   Distance     AMBITIEUX >   IRRÉALISTE >
 *   5K           93 % VMA      98 % VMA
 *   10K          90 %          95 %
 *   Semi         88 %          93 %
 *   Marathon     83 %          88 %
 *   Ultra        78 %          85 %
 *
 * Lancer : npx vitest run src/services/__tests__/feasibilityService-vma-thresholds.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';

// Profil minimum pour tests : intermédiaire route, sans blessure, chrono validé
const baseParams = {
  goal: 'Course sur route',
  level: 'Intermédiaire (Régulier)',
  planWeeks: 12,
  currentVolume: 30,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 4,
};

describe('Fix C — Seuils %VMA tenu : cas IRRÉALISTE par distance', () => {
  it('mxjulien02 — Semi 2h00 VMA 10.8 (97.7% VMA tenu) → IRRÉALISTE strict', () => {
    // speed = 21.1/2 = 10.55 km/h ; pctVmaTenu = 10.55/10.8 = 0.977 = 97.7%
    // Seuil Semi unrealistic = 93% → 97.7 > 93 → IRRÉALISTE
    const result = calculateFeasibility({
      ...baseParams,
      vma: 10.8,
      targetTime: '2h00',
      distance: 'Semi-Marathon',
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.score).toBeLessThanOrEqual(10);
    // Message doit mentionner %VMA et le seuil
    expect(result.message).toMatch(/97% de ta VMA|98% de ta VMA/);
    expect(result.message).toMatch(/seuil/i);
    expect(result.alternativeTarget).toBeDefined();
  });

  it('10K 45min VMA 10 (gate 130% existante) → IRRÉALISTE strict (cas extrême)', () => {
    // speed = 10/0.75 = 13.33 km/h ; vmaNeeded = 13.33/0.90 = 14.81 ; ratio = 148%
    // → déclenche la gate originale 130% AVANT le nouveau bloc.
    const result = calculateFeasibility({
      ...baseParams,
      vma: 10,
      targetTime: '45min',
      distance: '10 km',
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('Marathon 2h45 VMA 16 (>88% Marathon unrealistic) → IRRÉALISTE strict', () => {
    // speed = 42.195/2.75 = 15.34 ; pctVmaTenu = 15.34/16 = 0.959 = 95.9%
    // Seuil Marathon unrealistic = 88% → IRRÉALISTE
    const result = calculateFeasibility({
      ...baseParams,
      vma: 16,
      targetTime: '2h45',
      distance: 'Marathon',
      planWeeks: 16,
    });
    expect(result.status).toBe('IRRÉALISTE');
    expect(result.message).toMatch(/marathon|Marathon/);
  });
});

describe('Fix C — Seuils %VMA tenu : cas AMBITIEUX (cap score 60)', () => {
  it('Semi 1h45 VMA 13 (92.8% VMA tenu) → AMBITIEUX cap 60', () => {
    // speed = 21.1/1.75 = 12.06 ; pctVmaTenu = 12.06/13 = 0.928 = 92.8%
    // Seuil Semi : ambitious=88, unrealistic=93 → 92.8 > 88 ET 92.8 < 93 → AMBITIEUX
    const result = calculateFeasibility({
      ...baseParams,
      vma: 13,
      targetTime: '1h45',
      distance: 'Semi-Marathon',
    });
    expect(result.status).toBe('AMBITIEUX');
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('Marathon 3h00 VMA 16 (87.9% VMA tenu) → AMBITIEUX cap 60', () => {
    // speed = 42.195/3 = 14.065 ; pctVmaTenu = 14.065/16 = 0.879 = 87.9%
    // Seuil Marathon : ambitious=83, unrealistic=88 → 87.9 > 83 ET 87.9 < 88 → AMBITIEUX
    const result = calculateFeasibility({
      ...baseParams,
      vma: 16,
      targetTime: '3h00',
      distance: 'Marathon',
      planWeeks: 16,
    });
    expect(result.status).toBe('AMBITIEUX');
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('10K 38min VMA 17.5 (90.2% VMA tenu) → AMBITIEUX cap 60', () => {
    // speed = 10/0.6333 = 15.79 ; pctVmaTenu = 15.79/17.5 = 0.902 = 90.2%
    // Seuil 10K : ambitious=90, unrealistic=95 → 90.2 > 90 → AMBITIEUX
    const result = calculateFeasibility({
      ...baseParams,
      vma: 17.5,
      targetTime: '38min',
      distance: '10 km',
      level: 'Confirmé (Compétition)',
      currentVolume: 50,
    });
    expect(result.status).toBe('AMBITIEUX');
    expect(result.score).toBeLessThanOrEqual(60);
  });
});

describe('Fix C — Non-régression : cas EXCELLENT/BON inchangés', () => {
  it('Marathon 3h00 VMA 17 Élite (82.7% VMA tenu) → EXCELLENT inchangé', () => {
    // speed = 14.065 ; pctVmaTenu = 14.065/17 = 0.827 = 82.7%
    // Seuil Marathon ambitious = 83 → 82.7 < 83 → pas de cap %VMA
    // gapPercent ≈ 3% → EXCELLENT
    const result = calculateFeasibility({
      ...baseParams,
      vma: 17,
      targetTime: '3h00',
      distance: 'Marathon',
      level: 'Confirmé (Compétition)',
      currentVolume: 60,
      planWeeks: 16,
    });
    expect(['EXCELLENT', 'BON']).toContain(result.status);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('Marathon 3h30 VMA 16 (75.3% VMA tenu) → BON/EXCELLENT inchangé', () => {
    // speed = 42.195/3.5 = 12.06 ; pctVmaTenu = 12.06/16 = 0.753 = 75.3%
    // Seuil Marathon ambitious = 83 → 75.3 < 83 → pas de cap
    const result = calculateFeasibility({
      ...baseParams,
      vma: 16,
      targetTime: '3h30',
      distance: 'Marathon',
      level: 'Confirmé (Compétition)',
      currentVolume: 50,
      planWeeks: 16,
    });
    expect(['EXCELLENT', 'BON']).toContain(result.status);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('5K 22min VMA 16 (85.2% VMA tenu) → EXCELLENT inchangé (sous seuil 5K=93%)', () => {
    // speed = 5/0.3667 = 13.64 ; pctVmaTenu = 13.64/16 = 0.852 = 85.2%
    // Seuil 5K : ambitious=93 → 85.2 < 93 → pas de cap
    // gapPercent ≈ -16% → EXCELLENT
    const result = calculateFeasibility({
      ...baseParams,
      vma: 16,
      targetTime: '22min',
      distance: '5 km',
      level: 'Confirmé (Compétition)',
    });
    expect(['EXCELLENT', 'BON']).toContain(result.status);
  });
});

describe('Fix C — Branche Finisher (buildFinisherFeasibility) non touchée', () => {
  it('steph-fanny like — Finisher sans targetTime → branche finisher (pas de cap %VMA)', () => {
    // Sans targetTime, on tombe dans buildFinisherFeasibility AVANT le nouveau bloc.
    // Le Fix C ne s'applique pas → safety net : status doit rester cohérent
    // avec le profil (pas IRRÉALISTE artificiel).
    const result = calculateFeasibility({
      ...baseParams,
      vma: 11,
      distance: 'Semi-Marathon',
      // pas de targetTime → Finisher
      planWeeks: 12,
      currentVolume: 25,
    });
    // En Finisher, le statut dépend du contexte (volume/durée plan)
    // mais ne doit PAS être IRRÉALISTE strict via les nouveaux seuils %VMA.
    expect(result.status).not.toBe('IRRÉALISTE');
  });

  it('Finisher avec targetTime="Finisher" (texte) → branche finisher', () => {
    const result = calculateFeasibility({
      ...baseParams,
      vma: 12,
      targetTime: 'Finisher',
      distance: 'Marathon',
      planWeeks: 16,
      currentVolume: 35,
    });
    expect(result.status).not.toBe('IRRÉALISTE');
  });
});

describe('Fix C — Profil ultra (> 43 km) seuils plus conservatifs', () => {
  it('Trail Ultra 100km en 12h VMA 14 → seuils ultra appliqués', () => {
    // distance route plate = 100 km (trail sans D+ pour ce test)
    // speed = 100/12 = 8.33 km/h ; pctVmaTenu = 8.33/14 = 0.595 = 59.5%
    // Seuil ultra ambitious = 78% → 59.5 < 78 → pas de cap %VMA
    // Mais d'autres pénalités peuvent agir (volume, prep)
    const result = calculateFeasibility({
      ...baseParams,
      goal: 'Trail',
      vma: 14,
      targetTime: '12h00',
      distance: 'Trail 100km',
      level: 'Confirmé (Compétition)',
      currentVolume: 60,
      planWeeks: 24,
      frequency: 5,
    });
    // Ne pas être IRRÉALISTE via le nouveau bloc (%VMA tenu OK pour ultra)
    expect(result.status).not.toBe('IRRÉALISTE');
  });

  it('Ultra 100km en 8h VMA 14 (89.3% VMA tenu) → IRRÉALISTE seuils ultra', () => {
    // speed = 100/8 = 12.5 km/h ; pctVmaTenu = 12.5/14 = 0.893 = 89.3%
    // Seuil ultra : ambitious=78, unrealistic=85 → 89.3 > 85 → IRRÉALISTE
    const result = calculateFeasibility({
      ...baseParams,
      goal: 'Trail',
      vma: 14,
      targetTime: '8h00',
      distance: 'Trail 100km',
      level: 'Expert (Performance)',
      currentVolume: 80,
      planWeeks: 24,
      frequency: 6,
    });
    expect(result.status).toBe('IRRÉALISTE');
  });
});

describe('Fix C — Boundary cases (frontières précises)', () => {
  it('Semi avec pctVmaTenu = 88.0% exactement → pas de cap (juste sous seuil)', () => {
    // pctVmaTenu = 0.88 (seuil ambitious = 0.88, condition > 0.88 strict)
    // speed targeted = 0.88 * vma → time = 21.1 / (0.88 * vma) * 60
    const vma = 14;
    const targetMin = (21.1 / (0.88 * vma)) * 60;
    const h = Math.floor(targetMin / 60);
    const m = Math.round(targetMin % 60);
    const result = calculateFeasibility({
      ...baseParams,
      vma,
      targetTime: `${h}h${m.toString().padStart(2, '0')}`,
      distance: 'Semi-Marathon',
      level: 'Confirmé (Compétition)',
      currentVolume: 40,
      planWeeks: 12,
    });
    // À la frontière exacte 88.0% : la condition est `> 0.88` strict → pas de cap.
    // Score peut être EXCELLENT/BON selon gapPercent et autres pénalités.
    expect(result.status).not.toBe('IRRÉALISTE');
  });

  it('Marathon 2h59 VMA 17 → status calculé sans crasher', () => {
    // Sanity check : la fonction ne plante pas sur des cas limites.
    const result = calculateFeasibility({
      ...baseParams,
      vma: 17,
      targetTime: '2h59',
      distance: 'Marathon',
      level: 'Expert (Performance)',
      currentVolume: 70,
      planWeeks: 18,
    });
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
