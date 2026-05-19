/**
 * Tests normalizePace — Fix bug abalandreau Trail "seuilPace=5:60".
 */

import { describe, it, expect } from 'vitest';
import { normalizePace, calculateAllPaces } from '../geminiService';

describe('normalizePace — anti-régression bug "5:60"', () => {
  it('5:60 → 6:00', () => {
    expect(normalizePace(5, 60)).toBe('6:00');
  });

  it('5:61 → 6:01', () => {
    expect(normalizePace(5, 61)).toBe('6:01');
  });

  it('5:120 → 7:00 (carry multiple)', () => {
    expect(normalizePace(5, 120)).toBe('7:00');
  });

  it('5:59 → 5:59 (no change)', () => {
    expect(normalizePace(5, 59)).toBe('5:59');
  });

  it('6:00 → 6:00 (already normalized)', () => {
    expect(normalizePace(6, 0)).toBe('6:00');
  });

  it('4:00 → 4:00 (low edge)', () => {
    expect(normalizePace(4, 0)).toBe('4:00');
  });

  it('Pad single-digit seconds → 4:05 (pas 4:5)', () => {
    expect(normalizePace(4, 5)).toBe('4:05');
  });

  it('Cas dégénéré sec < 0 (entrée invalide LLM) → remonte ou clamp 0', () => {
    expect(normalizePace(5, -10)).toBe('4:50');
    expect(normalizePace(0, -1)).toBe('0:00'); // clamp
  });
});

describe('calculateAllPaces — toutes paces valides (0 ≤ sec < 60)', () => {
  it('VMA 12 → toutes paces format valide', () => {
    const paces = calculateAllPaces(12);
    const allPaces = [
      paces.vmaPace, paces.seuilPace, paces.eaPace, paces.efPace, paces.recoveryPace,
      paces.allureSpecifique5k, paces.allureSpecifique10k, paces.allureSpecifiqueSemi, paces.allureSpecifiqueMarathon,
    ];
    for (const p of allPaces) {
      expect(p).toMatch(/^\d+:\d{2}$/);
      const sec = parseInt(p.split(':')[1]);
      expect(sec).toBeGreaterThanOrEqual(0);
      expect(sec).toBeLessThan(60);
      expect(p).not.toMatch(/:60$/);
    }
  });

  it('VMA 15 (élite) → toutes paces format valide', () => {
    const paces = calculateAllPaces(15);
    const allPaces = [paces.vmaPace, paces.seuilPace, paces.efPace, paces.allureSpecifiqueMarathon];
    for (const p of allPaces) {
      expect(p).toMatch(/^\d+:\d{2}$/);
    }
  });

  it('VMA 9 (débutant) → toutes paces format valide', () => {
    const paces = calculateAllPaces(9);
    const allPaces = [paces.vmaPace, paces.seuilPace, paces.efPace, paces.allureSpecifiqueMarathon];
    for (const p of allPaces) {
      expect(p).toMatch(/^\d+:\d{2}$/);
      expect(p).not.toMatch(/:60$/);
    }
  });
});
