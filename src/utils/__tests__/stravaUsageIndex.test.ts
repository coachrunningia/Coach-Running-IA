/**
 * Sprint G — Tests buildUsedStravaActivitiesIndex (T8/T9/T10)
 *
 * Lancer : npx vitest run src/utils/__tests__/stravaUsageIndex.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildUsedStravaActivitiesIndex } from '../stravaUsageIndex';
import type { TrainingPlan, Session, Week } from '../../types';

// ─── Fixtures ─────────────────────────────────────────────
const session = (over: Partial<Session> = {}): Session => ({
    day: 'Mardi',
    title: 'Footing',
    type: 'Jogging',
    duration: '45 min',
    distance: '8 km',
    targetRPE: 4,
    elevationGain: 0,
    mainSet: 'Footing aérobie',
    coachAdvice: '',
    ...over,
} as Session);

const planFixture = (weeks: Week[]): TrainingPlan => ({
    startDate: '2026-05-04',
    raceDate: '2026-07-12',
    weeks,
    // champs non utilisés par l'index
} as unknown as TrainingPlan);

const stravaData = (id: number) => ({
    activityId: id,
    name: 'X',
    distance: 5,
    movingTime: 30,
    elapsedTime: 30,
    elevationGain: 0,
    avgPace: '6:00 min/km',
    type: 'Run',
    startDate: '2026-05-05T07:00:00Z',
});

// ─── Tests ────────────────────────────────────────────────
describe('buildUsedStravaActivitiesIndex — Sprint G', () => {
    it('T8a. Set contient bien tous les activityId du plan', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: [
                session({ day: 'Mardi', type: 'Jogging', feedback: { rpe: 5, completed: true, stravaData: stravaData(111) } }),
                session({ day: 'Jeudi', type: 'Fractionné', feedback: { rpe: 7, completed: true, stravaData: stravaData(222) } }),
            ] } as Week,
            { weekNumber: 2, sessions: [
                session({ day: 'Dimanche', type: 'Sortie Longue', feedback: { rpe: 6, completed: true, stravaData: stravaData(333) } }),
            ] } as Week,
        ]);
        const { ids } = buildUsedStravaActivitiesIndex(plan);
        expect(ids.size).toBe(3);
        expect(ids.has(111)).toBe(true);
        expect(ids.has(222)).toBe(true);
        expect(ids.has(333)).toBe(true);
    });

    it('T8b. Séances sans feedback ou sans stravaData → exclues', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: [
                session({ feedback: { rpe: 5, completed: true } }), // pas de stravaData
                session({}), // pas de feedback du tout
                session({ feedback: { rpe: 6, completed: true, stravaData: stravaData(444) } }),
            ] } as Week,
        ]);
        const { ids } = buildUsedStravaActivitiesIndex(plan);
        expect(ids.size).toBe(1);
        expect(ids.has(444)).toBe(true);
    });

    it('T10a. info Map associe activityId → {type, date DD/MM}', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: [
                session({ day: 'Mardi', type: 'Jogging', feedback: { rpe: 5, completed: true, stravaData: stravaData(555) } }),
            ] } as Week,
        ]);
        const { info } = buildUsedStravaActivitiesIndex(plan);
        const entry = info.get(555);
        expect(entry).toBeDefined();
        expect(entry!.type).toBe('Jogging');
        // 2026-05-04 (startDate) + S1 Mardi → 2026-05-05 → "05/05" en fr-FR
        expect(entry!.date).toMatch(/^\d{2}\/\d{2}$/);
    });

    it('T10b. dateOverride respecté pour le tooltip', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: [
                session({ day: 'Vendredi', type: 'Sortie Longue', dateOverride: '2026-05-27', feedback: { rpe: 6, completed: true, stravaData: stravaData(666) } }),
            ] } as Week,
        ]);
        const { info } = buildUsedStravaActivitiesIndex(plan);
        expect(info.get(666)?.date).toBe('27/05');
    });

    it('Plan vide / weeks vide → index vide, pas de crash', () => {
        const empty = buildUsedStravaActivitiesIndex(planFixture([]));
        expect(empty.ids.size).toBe(0);
        expect(empty.info.size).toBe(0);

        const nullPlan = buildUsedStravaActivitiesIndex({} as TrainingPlan);
        expect(nullPlan.ids.size).toBe(0);
    });

    it('Sessions absentes dans une week → skip safe', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: null as any } as Week,
            { weekNumber: 2, sessions: [
                session({ feedback: { rpe: 5, completed: true, stravaData: stravaData(777) } }),
            ] } as Week,
        ]);
        const { ids } = buildUsedStravaActivitiesIndex(plan);
        expect(ids.has(777)).toBe(true);
    });

    it('Doublon activityId entre 2 séances (cas rare patch admin) → 1 seule entrée Set', () => {
        const plan = planFixture([
            { weekNumber: 1, sessions: [
                session({ day: 'Mardi', type: 'Jogging', feedback: { rpe: 5, completed: true, stravaData: stravaData(888) } }),
                session({ day: 'Jeudi', type: 'Fractionné', feedback: { rpe: 7, completed: true, stravaData: stravaData(888) } }), // même id
            ] } as Week,
        ]);
        const { ids, info } = buildUsedStravaActivitiesIndex(plan);
        expect(ids.size).toBe(1);
        // Le dernier wins dans info (Map.set écrase) — comportement acceptable
        expect(info.get(888)?.type).toBe('Fractionné');
    });
});
