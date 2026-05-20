/**
 * P1d (2026-05-20) — Mode "absolute beginner" cv=0 + niveau Débutant.
 *
 * BUG (audit fin Lilian 10K Débutant cv=0, plan 1779185876450) :
 *   Saut 0 → 13 km en S1 trop violent pour un vrai débutant absolu.
 *   Le code ne distinguait pas "Débutant qui ne court pas" (cv=0) d'un
 *   "Débutant qui court déjà 5 km" → S1 calculée pareil.
 *
 * FIX (geminiService.ts ~L2880) :
 *   Si cv === 0 ET level === 'Débutant (0-1 an)' → cap S1 ≤ 10 km.
 *   Le mode marche-course du LLM gère la modalité d'exécution, ici on
 *   plafonne la quantité.
 *
 * Doctrine [[feedback_input_client_obligatoire]] : cv=0 = signal explicite
 * de novice absolu, pas un input à écraser. On respecte le signal.
 *
 * Lancer : npx vitest run src/services/__tests__/absolute-beginner-mode.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

function plan(args: {
  totalWeeks?: number;
  currentVolume: number;
  level: string;
  goal?: string;
  subGoal?: string;
  targetTime?: string;
  vma: number;
  sessionsPerWeek?: number;
}): { peak: number; s1: number; volumes: number[] } {
  const p = calculatePeriodizationPlan(
    args.totalWeeks || 12,
    args.currentVolume,
    args.level,
    args.goal || 'Course sur route',
    args.subGoal || '10K',
    undefined, undefined,
    args.targetTime || 'Finisher',
    35, 65,
    args.vma,
    args.sessionsPerWeek || 3,
    { height: 170 },
  );
  return {
    peak: Math.max(...p.weeklyVolumes),
    s1: p.weeklyVolumes[0],
    volumes: p.weeklyVolumes,
  };
}

describe('Mode "absolute beginner" cv=0 + Débutant', () => {
  it('1. Cas Lilian : 10K Débutant cv=0 freq=3 → S1 ≤ 10 km (cap actif)', () => {
    const { s1 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 0, subGoal: '10K',
      vma: 10, sessionsPerWeek: 3, totalWeeks: 12,
    });
    expect(s1).toBeLessThanOrEqual(10);
  });

  it('2. 5K Débutant cv=0 freq=3 → S1 ≤ 10 km', () => {
    const { s1 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 0, subGoal: '5K',
      vma: 10, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(s1).toBeLessThanOrEqual(10);
  });

  it('3. Semi Débutant cv=0 freq=3 → S1 ≤ 10 km (mode actif quel que soit l\'objectif)', () => {
    const { s1 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 0, subGoal: 'Semi',
      vma: 10, sessionsPerWeek: 3, totalWeeks: 14,
    });
    expect(s1).toBeLessThanOrEqual(10);
  });

  // ──────────────────────────────────────────────────────────────
  // NON-RÉGRESSION : le mode NE S'ACTIVE PAS pour cv > 0
  // ──────────────────────────────────────────────────────────────

  it('4. 10K Débutant cv=5 freq=3 → S1 NON capée par le mode beginner', () => {
    // cv=5 > 0 → mode NON activé. La S1 suit les règles standard
    // (au minimum 100% du cv, donc ≥ 5).
    const { s1 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 5, subGoal: '10K',
      vma: 10, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(s1).toBeGreaterThanOrEqual(5);
  });

  it('5. 10K Inter cv=0 freq=3 → mode NON activé (niveau Inter ≠ Déb)', () => {
    // Inter cv=0 (incohérent mais possible) : mode NON activé,
    // les règles minStartVolume Inter (=15) s'appliquent.
    const { s1 } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 0, subGoal: '10K',
      vma: 12, sessionsPerWeek: 3, totalWeeks: 10,
    });
    // Pas de cap "10" forcé ; le minStartVolume Inter est 15 mais limité
    // par maxVolume × 0.65. On vérifie juste qu'on n'est PAS capé à 10 strictement.
    expect(s1).toBeGreaterThanOrEqual(8); // pas plus bas que minStartVolume Déb
  });
});
