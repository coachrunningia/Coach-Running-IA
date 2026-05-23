/**
 * Sprint E Phase 2 — Bug 3 : SL placement intelligente (Lundi J1 → Dimanche/dernier dispo).
 *
 * Source :
 *   - Patch zone : findBestSLDay helper + 5 sites preferredLongRunDay defaults.
 *   - Doctrine [[feedback_input_client_obligatoire]] : input explicite prime
 *     toujours sur fallback inféré.
 *
 * Avant : default 'Dimanche' dur quand preferredLongRunDay non saisi → cas
 * preferredDays = [Lun, Mar, Jeu, Sam] sans dimanche dispo → enforceSLDay
 * forçait Dim (hors pool dispo) → swap chaotique avec une séance du Sam ou Lun.
 * Désormais : fallback intelligent priorise Dim > Sam > Ven > ... > Lun
 * parmi les preferredDays effectivement disponibles.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase2-bug3-sl-placement.test.ts
 */

import { describe, it, expect } from 'vitest';
import { findBestSLDay, enforceSLDay } from '../geminiService';

describe('Bug 3 — findBestSLDay (fallback intelligent)', () => {
  it('preferredDays = [Lun, Mar, Jeu, Ven, Dim] → Dimanche (priorité max)', () => {
    expect(findBestSLDay(['Lundi', 'Mardi', 'Jeudi', 'Vendredi', 'Dimanche'])).toBe('Dimanche');
  });

  it('preferredDays = [Lun, Mar, Jeu, Sam] → Samedi (Dim absent, Sam suivant)', () => {
    expect(findBestSLDay(['Lundi', 'Mardi', 'Jeudi', 'Samedi'])).toBe('Samedi');
  });

  it('preferredDays = [Lun, Mar, Mer] → Mercredi (dernier en priorité)', () => {
    expect(findBestSLDay(['Lundi', 'Mardi', 'Mercredi'])).toBe('Mercredi');
  });

  it('preferredDays = undefined → Dimanche (fallback strict)', () => {
    expect(findBestSLDay(undefined)).toBe('Dimanche');
  });

  it('preferredDays = [] → Dimanche (fallback strict)', () => {
    expect(findBestSLDay([])).toBe('Dimanche');
  });

  it('preferredDays = [Lun, Ven] → Vendredi (Ven prioritaire vs Lun)', () => {
    expect(findBestSLDay(['Lundi', 'Vendredi'])).toBe('Vendredi');
  });

  it('preferredDays = [Mar] (1 seul jour) → Mardi', () => {
    expect(findBestSLDay(['Mardi'])).toBe('Mardi');
  });
});

describe('Bug 3 — input explicite preferredLongRunDay prime sur fallback', () => {
  it('user saisit Samedi explicite → SL placée sur Samedi même si Dim dispo', () => {
    const week = {
      weekNumber: 1,
      sessions: [
        { day: 'Lundi', type: 'Sortie Longue', title: 'SL test', distance: '15 km' },
        { day: 'Mercredi', type: 'Footing', title: 'EF' },
        { day: 'Samedi', type: 'Fractionné', title: 'VMA' },
      ],
    };
    enforceSLDay(week, 'Samedi'); // input explicite
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    expect(sl?.day).toBe('Samedi');
  });
});

describe('Bug 3 — comportement intégré enforceSLDay + findBestSLDay', () => {
  it('SL initialement Lundi, preferredDays = [Lun, Mar, Jeu, Sam] → SL replacée sur Samedi via fallback', () => {
    const week = {
      weekNumber: 1,
      sessions: [
        { day: 'Lundi', type: 'Sortie Longue', title: 'SL', distance: '12 km' },
        { day: 'Mardi', type: 'Footing', title: 'EF' },
        { day: 'Jeudi', type: 'Fractionné', title: 'VMA' },
        { day: 'Samedi', type: 'Footing', title: 'Récup' },
      ],
    };
    // Simulation des call sites patch : data.preferredLongRunDay absent →
    // findBestSLDay(preferredDays) = 'Samedi'.
    const slDay = findBestSLDay(['Lundi', 'Mardi', 'Jeudi', 'Samedi']);
    enforceSLDay(week, slDay);
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    expect(sl?.day).toBe('Samedi');
  });
});
