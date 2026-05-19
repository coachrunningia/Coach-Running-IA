/**
 * Tests pass 4 anti-monotonie Marathon (enforceFullPlanConstraints).
 * Sprint Marathon 2026-05-20 — bug Thomas Weill : 3 SL MP-LR consécutives.
 */

import { describe, it, expect } from 'vitest';
import { enforceFullPlanConstraints } from '../geminiService';

// Helper : construit une SL MP-LR
const makeMpLrSession = (distanceKm: number) => ({
  day: 'Dimanche',
  type: 'Sortie Longue',
  title: 'Sortie Longue Allure Marathon',
  distance: `${distanceKm} km`,
  duration: '2h30',
  intensity: 'Modéré',
  mainSet: `${distanceKm} km dont bloc allure marathon — Marathon-Pace Long Run.`,
});

// Helper : SL LR-EF pure
const makeLrEfSession = (distanceKm: number) => ({
  day: 'Dimanche',
  type: 'Sortie Longue',
  title: 'Sortie Longue EF',
  distance: `${distanceKm} km`,
  duration: '2h00',
  intensity: 'Facile',
  mainSet: `${distanceKm} km en endurance fondamentale.`,
});

describe('enforceFullPlanConstraints — anti-monotonie Marathon (pass 4)', () => {
  it('2 SL MP-LR consécutives → 2e retypée en LR-EF', () => {
    const weeks = [
      {
        weekNumber: 13,
        phase: 'specifique',
        sessions: [
          { day: 'Mardi', type: 'Jogging', distance: '8 km', duration: '50 min' },
          makeMpLrSession(28),
        ],
      },
      {
        weekNumber: 14,
        phase: 'specifique',
        sessions: [
          { day: 'Mardi', type: 'Jogging', distance: '8 km', duration: '50 min' },
          makeMpLrSession(30),
        ],
      },
    ];
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 2 };
    enforceFullPlanConstraints(weeks, [36, 38], data);

    const sl14 = weeks[1].sessions.find((s: any) => s.type === 'Sortie Longue');
    expect(sl14!.title).toMatch(/EF/i);
    expect(sl14!.intensity).toBe('Facile');
    expect(sl14!.mainSet).toMatch(/récupération/i);
  });

  it('3 SL MP-LR consécutives (cas Thomas) → 2e et 3e retypées', () => {
    const weeks = [13, 14, 15].map(n => ({
      weekNumber: n,
      phase: 'specifique',
      sessions: [
        { day: 'Mardi', type: 'Jogging', distance: '8 km', duration: '50 min' },
        makeMpLrSession(30),
      ],
    }));
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 2 };
    enforceFullPlanConstraints(weeks, [38, 38, 38], data);

    // S13 reste MP-LR
    expect(weeks[0].sessions.find((s: any) => s.type === 'Sortie Longue')!.title).toMatch(/Marathon/i);
    // S14 et S15 retypées EF
    expect(weeks[1].sessions.find((s: any) => s.type === 'Sortie Longue')!.intensity).toBe('Facile');
    expect(weeks[2].sessions.find((s: any) => s.type === 'Sortie Longue')!.intensity).toBe('Facile');
  });

  it('Semi-marathon → pas d\'anti-monotonie marathon (guard objectif fonctionne)', () => {
    const weeks = [
      {
        weekNumber: 1,
        phase: 'specifique',
        sessions: [
          makeMpLrSession(24), // pourrait être un HMP-LR mais on simule un MP-LR
        ],
      },
      {
        weekNumber: 2,
        phase: 'specifique',
        sessions: [
          makeMpLrSession(26),
        ],
      },
    ];
    // subGoal = Semi → la pass 4 ne doit pas se déclencher
    const data = { goal: 'Course', subGoal: 'Semi-marathon', level: 'Confirmé', frequency: 1 };
    enforceFullPlanConstraints(weeks, [24, 26], data);

    // Les 2 SL restent inchangées (MP-LR-like)
    expect(weeks[0].sessions.find((s: any) => s.type === 'Sortie Longue')!.title).toMatch(/Allure Marathon/i);
    expect(weeks[1].sessions.find((s: any) => s.type === 'Sortie Longue')!.title).toMatch(/Allure Marathon/i);
  });

  it('Trail → pas d\'anti-monotonie marathon', () => {
    const weeks = [
      {
        weekNumber: 1,
        phase: 'specifique',
        sessions: [makeMpLrSession(24)],
      },
      {
        weekNumber: 2,
        phase: 'specifique',
        sessions: [makeMpLrSession(26)],
      },
    ];
    const data = { goal: 'Trail', subGoal: 'Trail', level: 'Confirmé', frequency: 1 };
    enforceFullPlanConstraints(weeks, [24, 26], data);

    expect(weeks[1].sessions.find((s: any) => s.type === 'Sortie Longue')!.title).toMatch(/Allure Marathon/i);
  });

  it('Marathon — SL EF + SL EF consécutives → pas retypées (pas de MP-LR détecté)', () => {
    const weeks = [
      {
        weekNumber: 1,
        phase: 'fondamental',
        sessions: [makeLrEfSession(20)],
      },
      {
        weekNumber: 2,
        phase: 'fondamental',
        sessions: [makeLrEfSession(22)],
      },
    ];
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 1 };
    enforceFullPlanConstraints(weeks, [20, 22], data);

    // Les 2 SL EF restent SL EF (pas de monotonie MP-LR détectée)
    expect(weeks[0].sessions[0].title).toMatch(/EF/i);
    expect(weeks[1].sessions[0].title).toMatch(/EF/i);
    // Originales non altérées (pas de message récupération)
    expect(weeks[1].sessions[0].mainSet).not.toMatch(/récupération/i);
  });

  it('Marathon — SL MP-LR espacée d\'une SL EF (S13 MP-LR / S14 EF / S15 MP-LR) → S15 conservée', () => {
    const weeks = [
      { weekNumber: 13, phase: 'specifique', sessions: [makeMpLrSession(30)] },
      { weekNumber: 14, phase: 'specifique', sessions: [makeLrEfSession(20)] },
      { weekNumber: 15, phase: 'specifique', sessions: [makeMpLrSession(32)] },
    ];
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 1 };
    enforceFullPlanConstraints(weeks, [38, 25, 40], data);

    // S15 MP-LR reste intacte car S14 = EF (pas de monotonie)
    expect(weeks[2].sessions[0].title).toMatch(/Allure Marathon/i);
    expect(weeks[2].sessions[0].intensity).toBe('Modéré');
  });
});
