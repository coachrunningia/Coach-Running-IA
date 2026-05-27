/**
 * F-11 (2026-05-27) — Tests anti-régression normalizeFlaggedWeeks.
 *
 * Bug détecté en test E2E pré-deploy : `gemini-3.1-pro-preview` retourne
 * `flaggedWeeks: ["S1", "S2"]` (strings) au lieu de `[1, 2]` (numbers) malgré
 * la consigne "numéros des semaines" dans le prompt aiReviewPlan.
 *
 * Sans normalisation, Layer 3 ne matchait JAMAIS `cw.weekNumber === w.weekNumber`
 * (number vs string) → aucune correction appliquée → couche L2 review inutile.
 *
 * Lancer : npx vitest run src/services/__tests__/plan-validator-flagged-weeks.test.ts
 */

import { describe, it, expect } from 'vitest';
import { normalizeFlaggedWeeks } from '../planValidator';

describe('normalizeFlaggedWeeks — F-11 Pro 3.1 strings → numbers', () => {
  it('1. Pro 3.1 format "S1", "S2" → [1, 2]', () => {
    expect(normalizeFlaggedWeeks(['S1', 'S2'])).toEqual([1, 2]);
  });

  it('2. Numbers directs préservés [1, 2, 3] → [1, 2, 3] (idempotent)', () => {
    expect(normalizeFlaggedWeeks([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('3. Format mixte ["S1", 2, "Semaine 3"] → [1, 2, 3]', () => {
    expect(normalizeFlaggedWeeks(['S1', 2, 'Semaine 3'])).toEqual([1, 2, 3]);
  });

  it('4. Format "Week N" (anglais) → [N]', () => {
    expect(normalizeFlaggedWeeks(['Week 5', 'Week 10'])).toEqual([5, 10]);
  });

  it('5. Strings "1", "2" (number-like) → [1, 2]', () => {
    expect(normalizeFlaggedWeeks(['1', '2'])).toEqual([1, 2]);
  });

  it('6. Espaces tolérés "S 1", "S  2" → [1, 2]', () => {
    expect(normalizeFlaggedWeeks(['S 1', 'S  2'])).toEqual([1, 2]);
  });

  it('7. Valeurs invalides filtrées : null, NaN, "abc", "" → []', () => {
    expect(normalizeFlaggedWeeks([null, NaN, 'abc', ''])).toEqual([]);
  });

  it('8. Valeurs invalides + valides → filtre uniquement valides', () => {
    expect(normalizeFlaggedWeeks(['S1', null, 'abc', 3])).toEqual([1, 3]);
  });

  it('9. Input non-array (null/undefined/object) → []', () => {
    expect(normalizeFlaggedWeeks(null)).toEqual([]);
    expect(normalizeFlaggedWeeks(undefined)).toEqual([]);
    expect(normalizeFlaggedWeeks({})).toEqual([]);
    expect(normalizeFlaggedWeeks('S1')).toEqual([]);
  });

  it('10. Array vide → []', () => {
    expect(normalizeFlaggedWeeks([])).toEqual([]);
  });

  it('11. Zéro et négatif filtrés (semaine ≥ 1 obligatoire)', () => {
    expect(normalizeFlaggedWeeks([0, -1, 'S0'])).toEqual([]);
    expect(normalizeFlaggedWeeks([0, 1, 2])).toEqual([1, 2]);
  });

  it('12. Décimaux filtrés (Number.isInteger requis)', () => {
    expect(normalizeFlaggedWeeks([1.5, 2.7])).toEqual([]);
  });

  it('13. Infinity / -Infinity filtrés', () => {
    expect(normalizeFlaggedWeeks([Infinity, -Infinity, 1])).toEqual([1]);
  });

  it('14. Symbol ne fait pas crash (String(Symbol) ne throw pas, filtré via NaN)', () => {
    // En pratique JSON.parse ne produit JAMAIS de Symbol, mais on vérifie la robustesse.
    // String(Symbol('x')) retourne "Symbol(x)" sans throw, regex \d+ ne match rien → NaN
    // → filtré par Number.isInteger. Seul 1 (number direct) reste.
    expect(normalizeFlaggedWeeks([Symbol('x') as any, 1])).toEqual([1]);
  });

  it('15. Format "2026-05-27" (date) → premier nombre 2026 (regex laxiste documentée)', () => {
    // Comportement actuel du regex \d+ : on documente, non bloquant en pratique.
    expect(normalizeFlaggedWeeks(['2026-05-27'])).toEqual([2026]);
  });
});
