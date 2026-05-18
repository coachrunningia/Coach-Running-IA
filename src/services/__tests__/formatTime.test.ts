/**
 * Tests anti-régression du bug "2h60min" / "22:60" observé live sur antoineg.gde
 * le 2026-05-18 (Marathon 3h00, plan génère temps théorique 179.7 min → "2h60min").
 *
 * Cause : Math.floor(minutes/60) et Math.round(minutes%60) désynchronisés sur les
 * cas-limites d'arrondi (179.7 → floor(2.995)=2 + round(59.7)=60 → "2h60min").
 *
 * Fix : arrondir le total AVANT split, garantissant cohérence h/m.
 */

import { describe, it, expect } from 'vitest';
import { formatTime } from '../feasibilityService';

describe('formatTime — anti bug 2h60min / 22:60', () => {
  describe('cas-limites arrondi (anciennement buggés)', () => {
    it('179.7 min → "3h00min" (et plus "2h60min")', () => {
      expect(formatTime(179.7)).toBe('3h00min');
    });

    it('239.6 min → "4h00min" (proche frontière 4h)', () => {
      expect(formatTime(239.6)).toBe('4h00min');
    });

    it('59.7 min → "59:42" (reste en mm:ss car < 60)', () => {
      expect(formatTime(59.7)).toBe('59:42');
    });

    it('179.5 min → "3h00min" (round half-up sur Math.round)', () => {
      expect(formatTime(179.5)).toBe('3h00min');
    });

    it('22.99 min → "22:59" (format mm:ss, pas de "22:60")', () => {
      expect(formatTime(22.99)).toBe('22:59');
    });
  });

  describe('cas standards', () => {
    it('60 min → "1h00min"', () => {
      expect(formatTime(60)).toBe('1h00min');
    });

    it('90 min → "1h30min"', () => {
      expect(formatTime(90)).toBe('1h30min');
    });

    it('180 min → "3h00min" (marathon 3h pile)', () => {
      expect(formatTime(180)).toBe('3h00min');
    });

    it('215 min → "3h35min" (marathon 3h35)', () => {
      expect(formatTime(215)).toBe('3h35min');
    });

    it('285 min → "4h45min" (marathon 4h45)', () => {
      expect(formatTime(285)).toBe('4h45min');
    });

    it('315 min → "5h15min" (marathon 5h15)', () => {
      expect(formatTime(315)).toBe('5h15min');
    });
  });

  describe('format mm:ss (< 60 min)', () => {
    it('22.5 min → "22:30"', () => {
      expect(formatTime(22.5)).toBe('22:30');
    });

    it('30 min → "30:00"', () => {
      expect(formatTime(30)).toBe('30:00');
    });

    it('45.25 min → "45:15"', () => {
      expect(formatTime(45.25)).toBe('45:15');
    });

    it('0.5 min → "0:30"', () => {
      expect(formatTime(0.5)).toBe('0:30');
    });
  });

  describe('garde-fou : aucun output ne doit contenir "60min" ou ":60"', () => {
    // Balayage exhaustif sur fenêtre critique des arrondis
    const cases: number[] = [];
    for (let m = 0.1; m < 360; m += 0.13) cases.push(m); // ~2770 cas
    it('aucune sortie ne contient "60min" ou ":60"', () => {
      const buggy = cases.filter(m => {
        const r = formatTime(m);
        return r.includes('60min') || r.endsWith(':60');
      });
      expect(buggy).toEqual([]);
    });
  });
});
