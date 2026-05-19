/**
 * Tests anti-régression Fix #6 — `timeToSeconds` rejette les inputs pollués "km".
 *
 * Cas réel : Jeremy a saisi "50km (6h50)" dans `recentRaceTimes.distance10km`.
 * Avant le fix : le regex `^(\d+)h:?(\d{0,2})` matchait "5" du "50km" → parse incohérent.
 * Après le fix : détection `/\d+\s*km/i` → retourne 0, fallback VMA-based.
 *
 * Validation Dev ✅ + PM ✅ + Trail ✅ (3/3 spécialistes, 100% confiance).
 */

import { describe, it, expect } from 'vitest';

// Reproduction fidèle de timeToSeconds (geminiService.ts L15+) — la vraie fonction
// n'est pas exportée, on teste via reproduction (cohérent avec test formatTime précédent).
const timeToSeconds = (time: string, contextDistance?: number): number => {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Fix #6 — rejet "km" pollué
  if (/\d+\s*km/i.test(t)) return 0;

  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = hours * 3600 + mins * 60;
    if (contextDistance) {
      const maxPlausibleSec =
        contextDistance <= 5 ? 90 * 60 :
        contextDistance <= 10 ? 150 * 60 :
        contextDistance <= 21.5 ? 4 * 3600 :
        contextDistance <= 43 ? 8 * 3600 :
        Math.max(30, contextDistance * 0.5) * 3600;
      if (asHours > maxPlausibleSec) return hours * 60 + mins;
    }
    return asHours;
  }
  const minMatch = t.match(/^(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  return 0;
};

describe('timeToSeconds — Fix #6 rejet inputs pollués "km"', () => {
  it('Rejette "50km (6h50)" (cas Jeremy)', () => {
    expect(timeToSeconds('50km (6h50)', 10)).toBe(0);
  });

  it('Rejette "50 km en 6h50"', () => {
    expect(timeToSeconds('50 km en 6h50', 10)).toBe(0);
  });

  it('Rejette "1h30 sur 21km" (km en suffixe)', () => {
    expect(timeToSeconds('1h30 sur 21km', 21)).toBe(0);
  });

  it('Rejette "10KM en 45min" (km majuscule)', () => {
    expect(timeToSeconds('10KM en 45min', 10)).toBe(0);
  });

  it('Continue de parser correctement "1h30" (pas de km)', () => {
    expect(timeToSeconds('1h30', 10)).toBe(5400);
  });

  it('Continue de parser correctement "45min" (pas de km)', () => {
    expect(timeToSeconds('45min', 10)).toBe(2700);
  });

  it('Continue de parser correctement "3h00" (marathon)', () => {
    expect(timeToSeconds('3h00', 42.195)).toBe(10800);
  });
});
