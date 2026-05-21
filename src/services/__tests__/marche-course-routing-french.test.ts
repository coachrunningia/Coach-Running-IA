/**
 * Fix B (2026-05-21) — Regex assouplie "de course" + clamp runRatio BMI > 35.
 *
 * BUG :
 *   Plan Alexandre Hyrox (et Lilian similaire) : Gemini écrit naturellement
 *   "1 min de course / 2 min de marche" — avec le mot "de" intercalé entre
 *   l'unité et le verbe. Le pattern RUN_WALK_PATTERNS / extractRunRatio
 *   pré-Fix-B ne capturait que "1 min course / 2 min marche" → type
 *   "Sortie Longue" gardé au lieu de "Marche/Course" → distance & targetPace
 *   incohérents (3.2 km / 10:20 au lieu de 5.0 km / 9:15 sur Jeudi S1).
 *
 * FIX :
 *   - RUN_WALK_PATTERNS : (?:de\s+|en\s+)? optionnel entre l'unité et course/marche
 *   - extractRunRatio (3 sous-patterns) : idem
 *   - recalculateSessionDistance : clamp runRatio ≤ 0.5 si BMI > 35
 *     (sécurité débutant obèse classe II, doctrine coach 20 ans)
 *
 * Lancer : npx vitest run src/services/__tests__/marche-course-routing-french.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyMarcheCourseRouting,
  extractRunRatio,
  recalculateSessionDistance,
} from '../geminiService';

describe('Fix B — Regex tolerant "de course" / "de marche"', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // ─── applyMarcheCourseRouting : patterns français naturels ───

  it('1. Cas Alexandre/Lilian : "1 min de course / 2 min de marche" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Sortie Longue progressive',
          type: 'Sortie Longue',
          mainSet: '12 reps (1 min de course à 9:15 + 2 min de marche)',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('2. Rétrocompat : "1 min course / 2 min marche" (sans "de") → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Footing alterné',
          type: 'Jogging',
          mainSet: '8 × (1 min course / 2 min marche)',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('3. Galloway court : "30s de course / 30s de marche" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Galloway 30/30',
          type: 'Jogging',
          mainSet: '15 × (30s de course / 30s de marche)',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('4. Variante "en course / en marche" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Alternance débutant',
          type: 'Sortie Longue',
          mainSet: '6 × (2 min en course / 1 min en marche)',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('5. Ordre inversé : "2 min de marche + 1 min de course" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Bloc débutant',
          type: 'Jogging',
          mainSet: '10 × (2 min de marche + 1 min de course)',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  // ─── Cas négatifs (non-régression) ───

  it('6. Cas négatif : "SL EF 8 km en EF" → type inchangé', () => {
    const week = {
      sessions: [
        {
          title: 'Sortie Longue EF',
          type: 'Sortie Longue',
          mainSet: 'Sortie longue 8 km à 6:30/km en endurance fondamentale',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });

  it('7. Cas négatif : "Fractionné 6 × 800m r=2 min" → type inchangé', () => {
    const week = {
      sessions: [
        {
          title: 'VMA courte',
          type: 'Fractionné',
          mainSet: 'Échauffement 15 min, 6 × 800m r=2 min trot, retour calme 10 min',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Fractionné');
  });
});

describe('Fix B — extractRunRatio tolerant "de course"', () => {
  it('1. "1 min de course / 2 min de marche" → 1/3', () => {
    const ratio = extractRunRatio('12 reps (1 min de course à 9:15 + 2 min de marche)');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(1 / 3, 2);
  });

  it('2. "2 min de course + 1 min de marche" → 2/3', () => {
    const ratio = extractRunRatio('8 × (2 min de course + 1 min de marche)');
    expect(ratio).toBeCloseTo(2 / 3, 2);
  });

  it('3. Rétrocompat : "2 min course + 1 min marche" (sans "de") → 2/3', () => {
    const ratio = extractRunRatio('8 × (2 min course + 1 min marche)');
    expect(ratio).toBeCloseTo(2 / 3, 2);
  });

  it('4. Variante "en course / en marche" → ratio extrait', () => {
    const ratio = extractRunRatio('6 × (2 min en course + 1 min en marche)');
    expect(ratio).toBeCloseTo(2 / 3, 2);
  });
});

describe('Fix B — recalculateSessionDistance : clamp runRatio BMI > 35', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('1. BMI 36 + Marche/Course 2/1 (ratio 0.667) → capé à 0.5', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '8 × (2 min de course + 1 min de marche)',
      distance: '',
      title: 'M/C débutant obèse',
    };
    recalculateSessionDistance(session, 36);
    // Avec runRatio 0.5 (capé) : 60 × 0.5 / 9 ≈ 3.33 km
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(3.0);
    expect(km).toBeLessThanOrEqual(3.7);
  });

  it('2. BMI 25 + Marche/Course 2/1 (ratio 0.667) → non touché', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '8 × (2 min de course + 1 min de marche)',
      distance: '',
      title: 'M/C BMI normal',
    };
    recalculateSessionDistance(session, 25);
    // Avec runRatio 0.667 : 60 × 0.667 / 9 ≈ 4.44 km
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(4.0);
    expect(km).toBeLessThanOrEqual(4.8);
  });

  it('3. BMI null/undefined → runRatio non capé (rétrocompat)', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '8 × (2 min de course + 1 min de marche)',
      distance: '',
      title: 'M/C sans bmi',
    };
    recalculateSessionDistance(session); // bmi non passé
    const km = parseFloat(session.distance);
    // 60 × 0.667 / 9 ≈ 4.44 km
    expect(km).toBeGreaterThanOrEqual(4.0);
    expect(km).toBeLessThanOrEqual(4.8);
  });

  it('4. BMI 36 + Jogging (pas Marche/Course) → runRatio reste 1 (non clampé)', () => {
    const session = {
      type: 'Jogging',
      duration: '60 min',
      targetPace: '8:00',
      mainSet: '60 min EF',
      distance: '',
      title: 'Footing',
    };
    recalculateSessionDistance(session, 36);
    // 60 / 8 = 7.5 km (pas de clamp car type ≠ Marche/Course)
    const km = parseFloat(session.distance);
    expect(km).toBeCloseTo(7.5, 1);
  });

  it('5. BMI 36 + Marche/Course déjà à 0.4 (ratio bas) → non remonté', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '6 × (1 min de course + 2 min de marche)', // ratio 1/3 = 0.333
      distance: '',
      title: 'M/C ratio bas',
    };
    recalculateSessionDistance(session, 36);
    // 60 × 0.333 / 9 = 2.22 km
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(1.8);
    expect(km).toBeLessThanOrEqual(2.5);
  });

  it('6. BMI exactly 35 (limite) → non clampé (strict >)', () => {
    const session = {
      type: 'Marche/Course',
      duration: '60 min',
      targetPace: '9:00',
      mainSet: '8 × (2 min de course + 1 min de marche)',
      distance: '',
      title: 'M/C BMI limite',
    };
    recalculateSessionDistance(session, 35);
    // 60 × 0.667 / 9 ≈ 4.44 km (non clampé car > strict)
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(4.0);
    expect(km).toBeLessThanOrEqual(4.8);
  });
});
