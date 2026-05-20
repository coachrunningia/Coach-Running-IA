/**
 * P1f (2026-05-20) — Distance Marche/Course pondérée par run ratio.
 *
 * BUG (audit fin Lilian) :
 *   Séance Marche/Course "60 min — 8 × (2 min course + 1 min marche)"
 *   affichait "6.6 km" (= 60 min × ef pace) alors que la distance courue
 *   réelle ≈ 40 min × ef pace ≈ 4.4 km. UI gonflée.
 *
 * FIX (geminiService.ts) :
 *   - `extractRunRatio(mainSet)` parse le pattern "X min course + Y min marche"
 *   - `recalculateSessionDistance(session)` pondère le calcul par runRatio
 *     pour les séances `type === 'Marche/Course'`.
 *   - Fallback runRatio = 0.6 si pattern non détecté (heuristique conservatrice).
 *
 * Lancer : npx vitest run src/services/__tests__/marche-course-distance.test.ts
 */

import { describe, it, expect } from 'vitest';
import { extractRunRatio, recalculateSessionDistance } from '../geminiService';

describe('extractRunRatio — parse ratio course/total depuis mainSet', () => {
  it('1. "2 min course + 1 min marche" → 2/3 ≈ 0.667', () => {
    const ratio = extractRunRatio('8 × (2 min course + 1 min marche), puis 5 min retour');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(2 / 3, 2);
  });

  it('2. "3 min course + 2 min marche" → 3/5 = 0.6', () => {
    const ratio = extractRunRatio('6 × (3 min course + 2 min marche)');
    expect(ratio).toBeCloseTo(0.6, 2);
  });

  it('3. "1 min marche + 2 min course" (ordre inversé) → 2/3', () => {
    const ratio = extractRunRatio('10 × (1 min marche + 2 min course)');
    expect(ratio).toBeCloseTo(2 / 3, 2);
  });

  it('4. MainSet sans pattern run/walk → null', () => {
    expect(extractRunRatio('60 min en endurance fondamentale')).toBeNull();
  });

  it('5. MainSet vide → null', () => {
    expect(extractRunRatio('')).toBeNull();
    expect(extractRunRatio(null as any)).toBeNull();
  });
});

describe('recalculateSessionDistance — Marche/Course pondéré (P1f)', () => {
  it('1. Cas Lilian : 60 min 2/1 course/marche → distance pondérée ≈ 4.4 km (vs 6.6 km bug)', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '8 × (2 min course + 1 min marche)',
      distance: '6.6 km', // bug : valeur LLM gonflée
      title: 'Marche/Course — Démarrage',
    };
    recalculateSessionDistance(session);
    // 60 min × 2/3 / 9 min/km = 4.44 km
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(4.0);
    expect(km).toBeLessThanOrEqual(4.8);
  });

  it('2. Marche/Course 50 min 3/2 → ratio 0.6 → 50 × 0.6 / 8 = 3.75 km', () => {
    const session = {
      type: 'Marche/Course',
      duration: '50 min',
      targetPace: '8:00',
      mainSet: '6 × (3 min course + 2 min marche)',
      distance: '6.2 km', // valeur LLM gonflée
      title: 'M/C',
    };
    recalculateSessionDistance(session);
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(3.5);
    expect(km).toBeLessThanOrEqual(4.0);
  });

  it('3. Marche/Course sans pattern parsable → fallback ratio 0.6', () => {
    const session = {
      type: 'Marche/Course',
      duration: '40 min',
      targetPace: '8:00',
      mainSet: '40 min en alternant course et marche selon ressenti',
      distance: '',
      title: 'M/C',
    };
    recalculateSessionDistance(session);
    // 40 min × 0.6 / 8 = 3 km
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(2.8);
    expect(km).toBeLessThanOrEqual(3.2);
  });

  // ────────────────────────────────────────────────────
  // NON-RÉGRESSION : autres types de séances NON pondérés
  // ────────────────────────────────────────────────────

  it('4. Jogging EF 60 min à 6:00 → 10 km (non pondéré, runRatio=1)', () => {
    const session = {
      type: 'Jogging',
      duration: '60 min',
      targetPace: '6:00',
      mainSet: '50 min de footing EF',
      distance: '',
      title: 'Footing',
    };
    recalculateSessionDistance(session);
    expect(parseFloat(session.distance)).toBeCloseTo(10, 1);
  });

  it('5. Sortie Longue 90 min à 5:30 → ~16.4 km (non pondéré)', () => {
    const session = {
      type: 'Sortie Longue',
      duration: '90 min',
      targetPace: '5:30',
      mainSet: '90 min EF',
      distance: '',
      title: 'SL',
    };
    recalculateSessionDistance(session);
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(16);
    expect(km).toBeLessThanOrEqual(16.5);
  });

  it('6. Fractionné 50 min à 4:30 → ~11.1 km (non pondéré)', () => {
    const session = {
      type: 'Fractionné',
      duration: '50 min',
      targetPace: '4:30',
      mainSet: '6 × 800m R 2min',
      distance: '',
      title: 'VMA',
    };
    recalculateSessionDistance(session);
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(10.5);
    expect(km).toBeLessThanOrEqual(11.5);
  });
});
