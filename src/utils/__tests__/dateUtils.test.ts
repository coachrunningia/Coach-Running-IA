import { describe, it, expect } from 'vitest';
import { calculateSessionDate, getWeekNumberForDate, resolveSessionDate, parseLocalDate } from '../dateUtils';

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

describe('dateUtils — Bug 17 Sprint E (startDate any-day cyclique modulo 7)', () => {
  it('1. startDate=Lundi 25/05, S1 Lundi → 25/05 (offset 0)', () => {
    expect(iso(calculateSessionDate('2026-05-25', 1, 'Lundi'))).toBe('2026-05-25');
  });
  it('2. startDate=Lundi 25/05, S1 Dimanche → 31/05 (offset 6)', () => {
    expect(iso(calculateSessionDate('2026-05-25', 1, 'Dimanche'))).toBe('2026-05-31');
  });
  it('3. startDate=Mardi 26/05, S1 Lundi → 1/06 (cycle suivant, offset 6)', () => {
    expect(iso(calculateSessionDate('2026-05-26', 1, 'Lundi'))).toBe('2026-06-01');
  });
  it('4. startDate=Samedi 23/05, S1 Vendredi → 29/05 (offset 6)', () => {
    expect(iso(calculateSessionDate('2026-05-23', 1, 'Vendredi'))).toBe('2026-05-29');
  });
  it('5. startDate=Dim 24/05 (Arnaud), S1 Lundi → 25/05 (offset 1)', () => {
    expect(iso(calculateSessionDate('2026-05-24', 1, 'Lundi'))).toBe('2026-05-25');
  });
  it('6. startDate=Dim 24/05 (Arnaud), S1 Vendredi → 29/05 (offset 5)', () => {
    expect(iso(calculateSessionDate('2026-05-24', 1, 'Vendredi'))).toBe('2026-05-29');
  });
  it('7. Week 2 cyclique : startDate=Mardi 26/05, S2 Lundi → 8/06 (offset 6 + 7)', () => {
    expect(iso(calculateSessionDate('2026-05-26', 2, 'Lundi'))).toBe('2026-06-08');
  });
  it('8. resolveSessionDate priorise dateOverride', () => {
    const session = { day: 'Lundi', dateOverride: '2026-06-15' };
    expect(iso(resolveSessionDate(session as any, '2026-05-25', 1))).toBe('2026-06-15');
  });
  it('9. getWeekNumberForDate symétrie : sessionDate(2,Lun) → weekNum 2', () => {
    const sd = calculateSessionDate('2026-05-25', 2, 'Lundi');
    expect(getWeekNumberForDate(sd, '2026-05-25')).toBe(2);
  });
  it('10. getWeekNumberForDate date avant startDate → 0 ou négatif', () => {
    const before = parseLocalDate('2026-05-18');
    expect(getWeekNumberForDate(before, '2026-05-25')).toBeLessThanOrEqual(0);
  });
});
