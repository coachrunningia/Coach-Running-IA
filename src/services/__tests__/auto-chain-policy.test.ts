/**
 * Sprint F+ Vague 1 — F-10 tests anti-régression
 *
 * Doctrine `feedback_chaque_ligne_justifiee` : chaque cas de la fonction
 * `decideAutoChain` a un test correspondant pour garantir qu'aucune
 * modification future ne casse silencieusement la doctrine D17.
 *
 * Lancer : npx vitest run src/services/__tests__/auto-chain-policy.test.ts
 */

import { describe, it, expect } from 'vitest';
import { decideAutoChain } from '../autoChainPolicy';
import type { TrainingPlan, User } from '../../types';

// Helpers pour fabriquer des fixtures minimales sans répéter toute la structure.
const premium = (overrides: Partial<User> = {}): User => ({
  id: 'u1', email: 'test@test.fr', isPremium: true, hasPurchasedPlan: false, ...overrides,
} as User);

const planPreviewBon = (overrides: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'p1', userId: 'u1', name: 'Marathon 4h30', createdAt: '2026-05-27', startDate: '2026-06-01',
  goal: 'Course sur route', weeks: [{ weekNumber: 1, theme: '', weekGoal: '', sessions: [] }],
  isPreview: true,
  feasibility: { status: 'BON', message: '', safetyWarning: '' },
  confidenceScore: 70,
  generationContext: {} as any, // suffisant pour le test (on vérifie juste qu'il existe)
  ...overrides,
} as TrainingPlan);

describe('decideAutoChain — F-10 Premium auto-chain feasibility BON', () => {
  // -------------------------------------------------------------------------
  // GO autorisé : tous critères verts
  // -------------------------------------------------------------------------
  it('1. Premium isPremium=true + preview + BON 70 → AUTO-CHAIN ✓ (cas terebeu)', () => {
    const result = decideAutoChain(premium(), planPreviewBon());
    expect(result.shouldAutoChain).toBe(true);
    expect(result.reason).toBe('premium-feasibility-ok');
  });

  it('2. Premium via hasPurchasedPlan=true (plan unique) + EXCELLENT → AUTO-CHAIN ✓', () => {
    const user = premium({ isPremium: false, hasPurchasedPlan: true });
    const plan = planPreviewBon({ feasibility: { status: 'EXCELLENT', message: '', safetyWarning: '' }, confidenceScore: 90 });
    expect(decideAutoChain(user, plan).shouldAutoChain).toBe(true);
  });

  // -------------------------------------------------------------------------
  // NO-GO : raisons doctrinales (D17 sécurité)
  // -------------------------------------------------------------------------
  it('3. Premium + feasibility=AMBITIEUX → NO auto-chain (warning obligatoire D17)', () => {
    const plan = planPreviewBon({ feasibility: { status: 'AMBITIEUX', message: '', safetyWarning: '' }, confidenceScore: 55 });
    const result = decideAutoChain(premium(), plan);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('feasibility-ambitieux');
  });

  it('4. Premium + feasibility=RISQUÉ → NO auto-chain', () => {
    const plan = planPreviewBon({ feasibility: { status: 'RISQUÉ', message: '', safetyWarning: '' }, confidenceScore: 40 });
    expect(decideAutoChain(premium(), plan).shouldAutoChain).toBe(false);
  });

  it('5. Premium + feasibility=IRRÉALISTE → NO auto-chain (cas marquilie68)', () => {
    const plan = planPreviewBon({ feasibility: { status: 'IRRÉALISTE', message: '', safetyWarning: '' }, confidenceScore: 10 });
    const result = decideAutoChain(premium(), plan);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('feasibility-irréaliste');
  });

  it('6. Premium + BON mais confidenceScore=10 (< 15) → NO auto-chain', () => {
    const plan = planPreviewBon({ confidenceScore: 10 });
    const result = decideAutoChain(premium(), plan);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('low-confidence-10');
  });

  it('7. Premium + BON + confidenceScore=15 (limite exacte) → AUTO-CHAIN ✓ (>=15)', () => {
    const plan = planPreviewBon({ confidenceScore: 15 });
    expect(decideAutoChain(premium(), plan).shouldAutoChain).toBe(true);
  });

  it('8. Premium + BON + confidenceScore=14 (juste sous) → NO auto-chain', () => {
    const plan = planPreviewBon({ confidenceScore: 14 });
    expect(decideAutoChain(premium(), plan).shouldAutoChain).toBe(false);
  });

  // -------------------------------------------------------------------------
  // NO-GO : raisons techniques
  // -------------------------------------------------------------------------
  it('9. User Free (isPremium=false ET hasPurchasedPlan=false) → NO auto-chain', () => {
    const user = premium({ isPremium: false, hasPurchasedPlan: false });
    const result = decideAutoChain(user, planPreviewBon());
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('not-premium');
  });

  it('10. Premium mais plan PAS en preview → NO auto-chain', () => {
    const plan = planPreviewBon({ isPreview: false });
    const result = decideAutoChain(premium(), plan);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('not-preview');
  });

  it('11. Premium + preview MAIS sans generationContext → NO auto-chain', () => {
    const plan = planPreviewBon({ generationContext: undefined });
    const result = decideAutoChain(premium(), plan);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('no-generation-context');
  });

  it('12. User null → NO auto-chain (pas de crash)', () => {
    const result = decideAutoChain(null, planPreviewBon());
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('no-user');
  });

  it('13. Plan null → NO auto-chain (pas de crash)', () => {
    const result = decideAutoChain(premium(), null);
    expect(result.shouldAutoChain).toBe(false);
    expect(result.reason).toBe('no-plan');
  });

  it('14. Feasibility status absent (undefined) + score OK → AUTO-CHAIN ✓ (fallback safe)', () => {
    const plan = planPreviewBon({ feasibility: undefined as any });
    expect(decideAutoChain(premium(), plan).shouldAutoChain).toBe(true);
  });

  it('15. confidenceScore undefined → fallback 100 → AUTO-CHAIN ✓', () => {
    const plan = planPreviewBon({ confidenceScore: undefined });
    expect(decideAutoChain(premium(), plan).shouldAutoChain).toBe(true);
  });
});
