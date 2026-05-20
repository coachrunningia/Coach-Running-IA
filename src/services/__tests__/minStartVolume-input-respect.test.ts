/**
 * Sprint 6 (2026-05-19) — Tests anti-régression Patch 1
 *
 * RÈGLE : le `currentVolume` déclaré par l'utilisateur est respecté.
 *   - currentVolume > 0 → volumeCap = currentVolume × 1.6 (garde-fou +60% S1)
 *   - currentVolume = 0 → fallback minStartVolume par niveau (sécurité plancher)
 *
 * Doctrine : [[feedback_input_client_obligatoire]] + verbatim Romane Sprint 6 :
 *   "max +60% vu que la personne se declare intermediaire et donc habitué.
 *    Si jamais elle fait une faible semaine à 5 on peut quand même monter
 *    à +60% et pas +50."
 *
 * Cas Romane (avant patch) : Inter cv=5 → S1=14 (×2.8, ACSM-incompatible).
 * Cas Romane (après patch) : Inter cv=5 → S1 ≤ 8 (×1.6, Daniels-compatible).
 *
 * Lancer : npx vitest run src/services/__tests__/minStartVolume-input-respect.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

// Helper : génère un plan et retourne S1
function s1(args: {
  totalWeeks?: number;
  currentVolume: number;
  level: string;
  goal?: string;
  subGoal?: string;
  targetTime?: string;
  age?: number;
  weight?: number;
  height?: number;
  vma?: number;
  sessionsPerWeek?: number;
}): number {
  const plan = calculatePeriodizationPlan(
    args.totalWeeks || 12,
    args.currentVolume,
    args.level,
    args.goal || 'Route',
    args.subGoal || '10K',
    undefined, // trailDistance
    undefined, // trailElevation
    args.targetTime || 'Finisher',
    args.age || 35,
    args.weight || 65,
    args.vma || 13,
    args.sessionsPerWeek || 3,
    { height: args.height || 170 },
  );
  return plan.weeklyVolumes[0];
}

describe('Sprint 6 — Patch 1 : volumeCap = currentVolume × 1.6 quand cv > 0', () => {
  it('Cas Romane : Inter cv=5 → S1 ≤ 8 km (5×1.6)', () => {
    const v = s1({
      level: 'Intermédiaire (Régulier)',
      currentVolume: 5,
      subGoal: '10K',
      vma: 13,
    });
    expect(v).toBeLessThanOrEqual(8);
    // Et > 0 (sanity)
    expect(v).toBeGreaterThan(0);
  });

  it('Inter cv=10 → S1 ≤ 16 km (10×1.6)', () => {
    const v = s1({
      level: 'Intermédiaire (Régulier)',
      currentVolume: 10,
      subGoal: '10K',
      vma: 13,
    });
    expect(v).toBeLessThanOrEqual(16);
    expect(v).toBeGreaterThanOrEqual(10); // hard floor = currentVolume
  });

  it('Inter cv=0 (declared absent) → S1 cap fallback minStartVolume=15', () => {
    // Sans currentVolume déclaré, on fallback sur le plancher de sécurité par niveau.
    // S1 doit pouvoir atteindre minStartVolume (15 pour Inter).
    const v = s1({
      level: 'Intermédiaire (Régulier)',
      currentVolume: 0,
      subGoal: '10K',
      vma: 13,
    });
    // S1 doit être >= 0 et <= maxVolume*0.65 (cap garanti par autre branche)
    expect(v).toBeGreaterThan(0);
    // Sans declared, le plancher de sécurité (minStartVolume Inter = 15) s'applique
    // via Math.max(idealStartVolume, minStartVolume) avant la branche cv>0
    // → S1 peut être >= 8 (≃ minStartVolume backpropagé)
  });

  it('Débutant cv=3 → S1 ≤ 5 km (3×1.6=4.8→5)', () => {
    const v = s1({
      level: 'Débutant (0-1 an)',
      currentVolume: 3,
      subGoal: '10K',
      vma: 10,
    });
    expect(v).toBeLessThanOrEqual(5);
    expect(v).toBeGreaterThanOrEqual(3); // hard floor
  });

  it('Confirmé cv=30 → S1 cohérent (cap par maxVolume × 0.65 plus restrictif)', () => {
    const v = s1({
      level: 'Confirmé (Compétition)',
      currentVolume: 30,
      subGoal: 'Marathon',
      vma: 15,
    });
    // Pour un Confirmé Marathon, S1 doit rester progressif (pas exploser)
    expect(v).toBeLessThanOrEqual(48); // 30×1.6 = 48 max
    expect(v).toBeGreaterThanOrEqual(30); // hard floor
  });

  it('Expert cv=50 → S1 cohérent (hard floor + cap progression)', () => {
    const v = s1({
      level: 'Expert (Performance)',
      currentVolume: 50,
      subGoal: 'Marathon',
      vma: 17,
    });
    // Pour un Expert Marathon volume 50, S1 ~ cv (hard floor + cap 0.90×peak).
    // Note (2026-05-20): après patch realisticFactor=0.85 Semi/Marathon, le cap VMA
    // ne plafonne plus artificiellement le peak (Marathon Expert vma=17 peut physiquement
    // faire >54 km/sem) → maxVolume reste à 54 → S1 ≤ 54×0.9 ≈ 49 km (cf. line 2779
    // qui cape le hard floor à 90% du peak pour garder marge progression).
    // Le S1 ~49 reste cohérent : 98% du currentVolume, ratio sain Expert.
    expect(v).toBeGreaterThanOrEqual(48); // hard floor ~currentVolume (tolérance 90%×peak)
    expect(v).toBeLessThanOrEqual(80);    // cap Sprint 6 (cv × 1.6)
  });

  it('BMI 30 + Inter cv=5 → S1 toujours plafonné à 8 (declared prime sur BMI cap)', () => {
    // BMI >= 30 réduit minStartVolume, mais ici on respecte le declared cv=5 → cap = 5×1.6 = 8
    const v = s1({
      level: 'Intermédiaire (Régulier)',
      currentVolume: 5,
      subGoal: '10K',
      vma: 11,
      weight: 90,
      height: 170, // BMI = 31.1 → >= 30
    });
    expect(v).toBeLessThanOrEqual(8);
  });

  it('Inter cv=1 (extrême bas) → S1 ≤ 2 (1×1.6=1.6→2, declared respecté)', () => {
    // Anti-régression : un user qui déclare 1km ne doit pas se retrouver avec S1=15
    // (ancien bug : volumeCap = max(1, 15) = 15 → écrasement)
    const v = s1({
      level: 'Intermédiaire (Régulier)',
      currentVolume: 1,
      subGoal: '10K',
      vma: 13,
    });
    expect(v).toBeLessThanOrEqual(2);
  });
});
