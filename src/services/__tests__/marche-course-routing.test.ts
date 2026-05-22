/**
 * Audit Lilian (2026-05-21) — Routing label Marche/Course post-process.
 *
 * BUG :
 *   Plan Lilian (10K Débutant cv=0) : séances S1 ont mainSet décrivant
 *   alternance "1 min course / 2 min marche × 6" mais `type` reste
 *   'Sortie Longue' / 'Footing'. UI affiche le mauvais type.
 *
 * FIX (geminiService.ts → applyMarcheCourseRouting) :
 *   Après génération LLM + enforceWeekConstraints, scanner le mainSet de
 *   chaque session. Si pattern run/walk détecté → forcer type = 'Marche/Course'.
 *   Patterns permissifs (Galloway Run-Walk-Run réf, inclut "30s/30s" très court).
 *
 * Lancer : npx vitest run src/services/__tests__/marche-course-routing.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyMarcheCourseRouting } from '../geminiService';

describe('applyMarcheCourseRouting — force type sur pattern run/walk', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('1. mainSet "1 min course / 2 min marche × 6 reps" → type forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Sortie Longue progressive',
          type: 'Sortie Longue',
          mainSet: '1 min course / 2 min marche × 6 reps, puis 5 min de marche douce',
        },
      ],
    };
    // Bug #4 — VERDICT-EXPERT-5-BUGS.md : ctx Débutant pour activer le routing.
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('2. mainSet "Sortie longue 8 km à 11:12/km" → type inchangé (pas Marche/Course)', () => {
    const week = {
      sessions: [
        {
          title: 'Sortie longue EF',
          type: 'Sortie Longue',
          mainSet: 'Sortie longue 8 km à 11:12/km en endurance fondamentale',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Sortie Longue');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('3. mainSet "2 min course / 1 min marche × 8" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Footing débutant',
          type: 'Jogging',
          mainSet: '8 × (2 min course + 1 min marche)',
        },
      ],
    };
    // Bug #4 — VERDICT-EXPERT-5-BUGS.md : ctx Débutant pour activer le routing.
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('4. Session déjà type=Marche/Course → idempotent (pas de double log)', () => {
    const week = {
      sessions: [
        {
          title: 'Marche/Course découverte',
          type: 'Marche/Course',
          mainSet: '6 × (1 min course + 2 min marche)',
        },
      ],
    };
    // Bug #4 — VERDICT-EXPERT-5-BUGS.md : ctx Débutant pour activer le routing.
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
    expect(logSpy).not.toHaveBeenCalled();
    // Deuxième passe : toujours idempotent
    applyMarcheCourseRouting(week);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('5. mainSet contient "marche-course" en mot mais pas pattern numérique → pas forcé', () => {
    // Cas où le mainSet décrit la séance en texte libre sans chiffres
    // (ex: "Marche-course tranquille en endurance fondamentale")
    // → on ne touche pas le type sans pattern explicite
    const week = {
      sessions: [
        {
          title: 'Footing EF',
          type: 'Jogging',
          mainSet: 'Footing tranquille en endurance fondamentale, environ 30 min',
        },
      ],
    };
    applyMarcheCourseRouting(week);
    expect(week.sessions[0].type).toBe('Jogging');
    expect(logSpy).not.toHaveBeenCalled();
  });

  // ─── Robustesse Galloway court (30s/30s) ───
  it('6. Galloway court "30 sec course / 30 sec marche" → forcé Marche/Course', () => {
    const week = {
      sessions: [
        {
          title: 'Footing alterné',
          type: 'Jogging',
          mainSet: '20 × (30 sec course / 30 sec marche)',
        },
      ],
    };
    // Bug #4 — VERDICT-EXPERT-5-BUGS.md : ctx Débutant pour activer le routing.
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  // ─── Robustesse semaine multi-séances ───
  it('7. Semaine multi-séances : seules les séances run/walk sont reroutées', () => {
    const week = {
      sessions: [
        {
          title: 'Footing EF',
          type: 'Jogging',
          mainSet: '30 min en endurance fondamentale à 6:30/km',
        },
        {
          title: 'Sortie Longue',
          type: 'Sortie Longue',
          mainSet: '6 × (1 min course / 2 min marche), puis 5 min marche',
        },
        {
          title: 'Renforcement',
          type: 'Renforcement',
          mainSet: '3 séries de gainage + squats',
        },
      ],
    };
    // Bug #4 — VERDICT-EXPERT-5-BUGS.md : ctx Débutant pour activer le routing.
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Jogging');
    expect(week.sessions[1].type).toBe('Marche/Course');
    expect(week.sessions[2].type).toBe('Renforcement');
  });

  // ─── Robustesse edge cases ───
  it('8. Week sans sessions → no-op safe', () => {
    expect(() => applyMarcheCourseRouting({ sessions: undefined } as any)).not.toThrow();
    expect(() => applyMarcheCourseRouting({} as any)).not.toThrow();
    expect(() => applyMarcheCourseRouting(null as any)).not.toThrow();
  });
});
