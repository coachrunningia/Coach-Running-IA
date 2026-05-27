/**
 * Sprint F+ Vague 1 — F-3 tests anti-régression
 *
 * Doctrine D18b : `distance` = horizontal plat-équivalent IMMUABLE. Pour D+/km > 30 m/km,
 * le `mainSet` doit contenir une phrase explicite "plat-équivalent" / "effort qui compte".
 *
 * Lancer : npx vitest run src/services/__tests__/enforce-flat-equivalent-note.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enforceFlatEquivalentNote } from '../geminiService';

describe('enforceFlatEquivalentNote — F-3 D18b auto-injection', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  // -------------------------------------------------------------------------
  // CAS POSITIFS : injection nécessaire
  // -------------------------------------------------------------------------
  it('1. Vallon léger 30 < D+/km <= 50 : injection note légère', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Sortie Longue', day: 'Dimanche', distance: '10 km', elevationGain: 400, mainSet: 'SL trail en EF.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/plat-équivalent/i);
    expect(week.sessions[0].mainSet).toMatch(/effort EF/i);
    expect(week.sessions[0].mainSet).not.toMatch(/Cory Smith|3-5 s\/km/i); // wording léger, pas quantifié
  });

  it('2. Vallon raide D+/km > 50 : injection note quantifiée Cory Smith', () => {
    const week = {
      weekNumber: 5,
      sessions: [{ type: 'Sortie Longue', day: 'Dimanche', distance: '12 km', elevationGain: 1000, mainSet: 'SL montagne.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/plat-équivalent/i);
    expect(week.sessions[0].mainSet).toMatch(/3-5 s\/km/);
    expect(week.sessions[0].mainSet).toMatch(/D\+\/km/);
  });

  it('3. Plan A marquilie Dimanche D+150 sur 8km (≈19 m/km) → AUCUNE injection (sous seuil 30)', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Sortie Longue', day: 'Dimanche', distance: '8 km', elevationGain: 150, mainSet: 'SL initiation.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe('SL initiation.'); // inchangé
  });

  it('4. Plan B Lion Mathieu Mardi 73min/15km/D+700m (≈47 m/km) : note légère ajoutée', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '15 km', elevationGain: 700, mainSet: 'Footing vallonné Mardi.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/plat-équivalent/i);
  });

  // -------------------------------------------------------------------------
  // IDEMPOTENCE : pas de double-injection
  // -------------------------------------------------------------------------
  it('5. Note "plat-équivalent" déjà présente → no-op (idempotent)', () => {
    const initial = "Footing vallonné. Note : la distance 15 km est un repère plat-équivalent. Pilote à l'effort.";
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '15 km', elevationGain: 700, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial); // strictement inchangé
  });

  it('6. Variante "effort qui compte" déjà présente → no-op', () => {
    const initial = "SL en montagne. C'est l'effort qui compte, pas la vitesse.";
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Sortie Longue', day: 'Dimanche', distance: '25 km', elevationGain: 2275, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  it('7. Variante "allure-référence plat" déjà présente (cas patch Plan B Lion Mathieu) → no-op', () => {
    const initial = "Footing 5:30. L'allure-référence plat n'est pas la vitesse terrain.";
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Vendredi', distance: '15 km', elevationGain: 700, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  // -------------------------------------------------------------------------
  // SKIPS : types qui ne doivent PAS recevoir la note
  // -------------------------------------------------------------------------
  it('8. Type Renforcement → skip (pas de distance pertinente)', () => {
    const initial = 'Squats, gainage';
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Renforcement', day: 'Mercredi', distance: '0 km', elevationGain: 200, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  it('9. Type Repos → skip', () => {
    const initial = 'Repos complet';
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Repos', day: 'Lundi', distance: 'N/A', elevationGain: 0, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  it('10. Type Marche/Course → skip (wording dédié dans applyMarcheCourseRouting)', () => {
    const initial = '10 reps 1min course + 2min marche';
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Marche/Course', day: 'Mardi', distance: '5 km', elevationGain: 200, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  // -------------------------------------------------------------------------
  // ROBUSTESSE input
  // -------------------------------------------------------------------------
  it('11. elevationGain = 0 → no-op (terrain plat)', () => {
    const initial = 'Footing plat.';
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '10 km', elevationGain: 0, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  it('12. distance vide / undefined → skip safe', () => {
    const initial = 'Footing.';
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '', elevationGain: 500, mainSet: initial }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toBe(initial);
  });

  it('13. mainSet undefined → ne crash pas, ajoute la note depuis chaîne vide', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Sortie Longue', day: 'Dimanche', distance: '10 km', elevationGain: 400 }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/plat-équivalent/i);
  });

  it('14. week null/sessions absent → ne crash pas', () => {
    expect(() => enforceFlatEquivalentNote(null as any)).not.toThrow();
    expect(() => enforceFlatEquivalentNote({} as any)).not.toThrow();
    expect(() => enforceFlatEquivalentNote({ sessions: 'pas-un-array' } as any)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Distance format edge cases
  // -------------------------------------------------------------------------
  it('15. Distance "10.5 km" (point décimal) parsée → injection OK', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '10.5 km', elevationGain: 400, mainSet: 'Footing.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/10\.5 km/);
  });

  it('16. Distance "10,5 km" (virgule) parsée → injection OK', () => {
    const week = {
      weekNumber: 1,
      sessions: [{ type: 'Jogging', day: 'Mardi', distance: '10,5 km', elevationGain: 400, mainSet: 'Footing.' }],
    };
    enforceFlatEquivalentNote(week);
    expect(week.sessions[0].mainSet).toMatch(/10\.5 km/); // converti en point pour formatage
  });
});
