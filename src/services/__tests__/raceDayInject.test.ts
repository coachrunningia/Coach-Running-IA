/**
 * Tests raceDayInject.ts — injection course officielle sur raceDate.
 * Source : INVESTIGATION-VARIATION-ET-COURSE-FINALE.md (bug Thomas Weill 2026-05-19).
 */

import { describe, it, expect } from 'vitest';
import { injectRaceSession, isRaceDaySession } from '../raceDayInject';
import { enforceSLDay, enforceFullPlanConstraints, type TrainingPaces } from '../geminiService';

const paces: TrainingPaces = {
  vma: 14,
  vmaKmh: '14.0',
  vmaPace: '4:17',
  seuilPace: '4:42',
  eaPace: '5:10',
  efPace: '5:40',
  recoveryPace: '6:10',
  allureSpecifique5k: '4:25',
  allureSpecifique10k: '4:35',
  allureSpecifiqueSemi: '4:50',
  allureSpecifiqueMarathon: '5:10',
};

// Helper : build minimal plan
const buildPlan = (startDate: string, weeks: number, raceDate?: string) => ({
  startDate,
  raceDate,
  weeks: Array.from({ length: weeks }, (_, i) => ({
    weekNumber: i + 1,
    phase: i < weeks - 2 ? 'specifique' : 'affutage',
    sessions: [
      { day: 'Mardi', type: 'Fractionné', title: 'VMA', distance: '8 km', duration: '50 min', mainSet: '8×400m' },
      { day: 'Jeudi', type: 'Jogging', title: 'Footing', distance: '6 km', duration: '40 min', mainSet: 'EF' },
      { day: 'Dimanche', type: 'Sortie Longue', title: 'SL EF', distance: '20 km', duration: '2h00', mainSet: '20 km EF' },
    ],
  })),
});

describe('raceDayInject — injection course officielle', () => {
  it('raceDate dimanche → SL dimanche remplacée par Course Marathon', () => {
    // startDate = lundi 2026-04-06, raceDate = dimanche 2026-04-19 (S2 dimanche)
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    const idx = injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-04-19' }, paces);
    expect(idx).toBe(1); // S2 (0-indexed)
    const dimSession = plan.weeks[1].sessions.find((s: any) => s.day === 'Dimanche');
    expect(dimSession).toBeDefined();
    expect(dimSession!.type).toBe('Course');
    expect(dimSession!.title).toBe('COURSE — Marathon');
    expect(dimSession!.distance).toBe('42.195 km');
    expect(isRaceDaySession(dimSession)).toBe(true);
  });

  it('raceDate lundi → séance lundi devient Course (ajoutée si pas de séance ce jour)', () => {
    // startDate = lundi 2026-04-06, raceDate = lundi 2026-04-20 (S3 lundi)
    const plan = buildPlan('2026-04-06', 3, '2026-04-20');
    const idx = injectRaceSession(plan, { subGoal: '10 km', raceDate: '2026-04-20' }, paces);
    expect(idx).toBe(2);
    const lundiSession = plan.weeks[2].sessions.find((s: any) => s.day === 'Lundi');
    expect(lundiSession).toBeDefined();
    expect(lundiSession!.type).toBe('Course');
    expect(lundiSession!.title).toBe('COURSE — 10 km');
  });

  it('raceDate mercredi → séance mercredi devient Course', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-15'); // mercredi S2
    // ajoute une séance mercredi pour tester le retype
    plan.weeks[1].sessions.push({ day: 'Mercredi', type: 'Jogging', title: 'Footing', distance: '5 km', duration: '30 min', mainSet: 'EF' });
    const idx = injectRaceSession(plan, { subGoal: 'Semi-marathon', raceDate: '2026-04-15' }, paces);
    expect(idx).toBe(1);
    const mercrediSession = plan.weeks[1].sessions.find((s: any) => s.day === 'Mercredi' && s.type === 'Course');
    expect(mercrediSession).toBeDefined();
    expect(mercrediSession!.title).toBe('COURSE — Semi-marathon');
  });

  it('raceDate antérieure au startDate → no-op (-1)', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-01');
    const idx = injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-04-01' }, paces);
    expect(idx).toBe(-1);
  });

  it('raceDate après endDate du plan → no-op', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-06-01'); // bien au-delà de 3 semaines
    const idx = injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-06-01' }, paces);
    expect(idx).toBe(-1);
  });

  it('Marathon → distance officielle 42.195 km + allure spé Marathon', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-04-19', targetTime: '3h45' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.distance).toBe('42.195 km');
    expect(course!.targetPace).toBe('5:10');
    expect(course!.duration).toBe('3h45');
    expect(course!.mainSet).toMatch(/Marathon/i);
    expect(course!.mainSet).toMatch(/ravito|mur|pacing/i);
  });

  it('Semi-marathon → distance 21.1 km + allure spé Semi', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    injectRaceSession(plan, { subGoal: 'Semi-marathon', raceDate: '2026-04-19' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.distance).toBe('21.1 km');
    expect(course!.targetPace).toBe('4:50');
    expect(course!.mainSet).toMatch(/Semi/i);
  });

  it('10 km → distance 10 km + allure spé 10K', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    injectRaceSession(plan, { subGoal: '10 km', raceDate: '2026-04-19' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.distance).toBe('10 km');
    expect(course!.targetPace).toBe('4:35');
  });

  it('5 km → distance 5 km + allure spé 5K', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    injectRaceSession(plan, { subGoal: '5 km', raceDate: '2026-04-19' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.distance).toBe('5 km');
    expect(course!.targetPace).toBe('4:25');
  });

  it('Trail avec D+ → distance trail + elevationGain', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    const data = {
      subGoal: 'Trail',
      raceDate: '2026-04-19',
      trailDetails: { distance: 42, elevation: 2000 },
    };
    injectRaceSession(plan, data, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.distance).toBe('42 km');
    expect(course!.elevationGain).toBe(2000);
    expect(course!.title).toContain('Trail');
    expect(course!.mainSet).toMatch(/montée|descente|D\+/i);
  });

  it('Hyrox → partie course uniquement, distance 8 km par défaut', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    injectRaceSession(plan, { subGoal: 'Hyrox', raceDate: '2026-04-19' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    expect(course!.title).toBe('COURSE — Hyrox');
    expect(course!.mainSet).toMatch(/Hyrox/i);
  });

  it('isRaceDaySession → true si _raceDay marqué', () => {
    expect(isRaceDaySession({ _raceDay: true })).toBe(true);
    expect(isRaceDaySession({ type: 'Course' })).toBe(false);
    expect(isRaceDaySession(null)).toBe(false);
    expect(isRaceDaySession(undefined)).toBe(false);
  });

  it('targetTime Finisher → pas de duration imposée', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    const originalDuration = plan.weeks[1].sessions.find((s: any) => s.day === 'Dimanche')!.duration;
    injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-04-19', targetTime: 'Finisher' }, paces);
    const course = plan.weeks[1].sessions.find((s: any) => s.type === 'Course');
    // duration originale conservée (Finisher → on n'écrase pas avec chrono)
    expect(course!.duration).toBe(originalDuration);
  });

  it('subGoal inconnu (Perte de poids p.ex.) → no-op', () => {
    const plan = buildPlan('2026-04-06', 3, '2026-04-19');
    const idx = injectRaceSession(plan, { subGoal: 'Perte de poids', raceDate: '2026-04-19' }, paces);
    expect(idx).toBe(-1);
  });

  it('plan sans startDate → no-op', () => {
    const plan = { weeks: [{ weekNumber: 1, sessions: [] }] } as any;
    const idx = injectRaceSession(plan, { subGoal: 'Marathon', raceDate: '2026-04-19' }, paces);
    expect(idx).toBe(-1);
  });
});

describe('raceDayInject — intégration enforceSLDay + cap affûtage', () => {
  it('enforceSLDay → no-op si semaine contient _raceDay (la course remplace la SL)', () => {
    const week = {
      weekNumber: 3,
      sessions: [
        { day: 'Mardi', type: 'Jogging', title: 'Footing', distance: '5 km', duration: '30 min' },
        { day: 'Dimanche', type: 'Course', title: 'COURSE — Marathon', distance: '42.195 km', duration: '3h45', _raceDay: true },
      ],
    };
    const result = enforceSLDay(week, 'Dimanche');
    expect(result).toBe(false); // skip car _raceDay présent
    // La séance Course reste intacte, position Dimanche
    const course = week.sessions.find((s: any) => s._raceDay);
    expect(course).toBeDefined();
    expect(course!.type).toBe('Course');
    expect(course!.day).toBe('Dimanche');
  });

  it('cap affûtage (enforceFullPlanConstraints) → ne scale PAS la séance _raceDay', () => {
    const weeks = [
      {
        weekNumber: 1,
        phase: 'specifique',
        sessions: [
          { day: 'Mardi', type: 'Fractionné', title: 'VMA', distance: '10 km', duration: '60 min' },
          { day: 'Jeudi', type: 'Jogging', title: 'EF', distance: '8 km', duration: '50 min' },
          { day: 'Dimanche', type: 'Sortie Longue', title: 'SL', distance: '25 km', duration: '2h30' },
        ],
      },
      {
        weekNumber: 2,
        phase: 'affutage',
        sessions: [
          { day: 'Mardi', type: 'Jogging', title: 'EF', distance: '6 km', duration: '40 min' },
          { day: 'Dimanche', type: 'Course', title: 'COURSE — Marathon', distance: '42.195 km', duration: '3h45', _raceDay: true },
        ],
      },
    ];
    const weeklyVolumes = [43, 48];
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 3 };
    enforceFullPlanConstraints(weeks, weeklyVolumes, data);

    // La séance race-day garde sa distance officielle 42.195 km — PAS scaled.
    const course = weeks[1].sessions.find((s: any) => s._raceDay);
    expect(course!.distance).toBe('42.195 km');
    expect(course!.duration).toBe('3h45');
  });

  it('getWeekKm via enforceFullPlanConstraints → skip _raceDay du compteur', () => {
    // Si on incluait _raceDay dans getWeekKm, S2 ferait 48 km (6 + 42) et le cap
    // affûtage tenterait de scaler la course. Or _raceDay doit être skip.
    const weeks = [
      {
        weekNumber: 1,
        phase: 'specifique',
        sessions: [
          { day: 'Mardi', type: 'Jogging', distance: '10 km', duration: '60 min' },
          { day: 'Dimanche', type: 'Sortie Longue', distance: '20 km', duration: '2h00' },
        ],
      },
      {
        weekNumber: 2,
        phase: 'affutage',
        sessions: [
          { day: 'Mardi', type: 'Jogging', distance: '8 km', duration: '50 min' },
          { day: 'Dimanche', type: 'Course', distance: '42.195 km', duration: '3h45', _raceDay: true },
        ],
      },
    ];
    const data = { goal: 'Course', subGoal: 'Marathon', level: 'Confirmé', frequency: 2 };
    enforceFullPlanConstraints(weeks, [30, 50], data);

    // La course n'a pas été touchée (distance officielle conservée).
    const course = weeks[1].sessions.find((s: any) => s._raceDay);
    expect(course!.distance).toBe('42.195 km');
  });
});

