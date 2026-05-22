/**
 * Sprint D — Item 4 : prompt LLM règle freq <= 3
 * Source : EXPERT-FFA-CHALLENGE-9-ITEMS.md (verdict CONFIRMÉ par expert FFA 20 ans)
 * Bug ciblé : plan Christopher 1779456984279 — 2 séances course identiques (13 km/13.1 km)
 *
 * Item 7 (PHASE_VOLUME_CAP) reporté Sprint E — première implémentation rabotait les hard floors
 * Semi/Marathon/10K (régression 6 tests). Logique à revoir : appliquer cap APRÈS hard floor.
 */
import { describe, it, expect } from 'vitest';
import { buildSafetyInstructions } from '../geminiService';
import type { QuestionnaireData } from '../../types';

const baseProfile = (overrides: Partial<QuestionnaireData> = {}): QuestionnaireData => ({
  goal: 'Course sur route',
  subGoal: 'Semi-Marathon',
  level: 'Confirmé (Compétition)',
  frequency: 3,
  currentWeeklyVolume: 30,
  vma: 13,
  age: 30,
  sex: 'Homme',
  weight: 72,
  height: 174,
  targetTime: '1h45',
  raceDate: '2026-11-01',
  startDate: '2026-06-08',
  preferredDays: ['Mardi', 'Jeudi', 'Samedi'],
  recentRaceTimes: { distanceHalfMarathon: '2h04' },
  injuries: { hasInjury: false },
  ...overrides,
} as QuestionnaireData);

describe('Sprint D Item 4 — règle freq <= 3 dans buildSafetyInstructions', () => {
  it('freq=3 → bloc RÈGLE FREQ injecté avec footing court + SL + Pfitzinger FRR', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 3 }), false);
    expect(out).toContain('RÈGLE FREQ 3');
    expect(out).toContain('footing 35-50%');
    expect(out).toContain('SL 50-65%');
    expect(out).toContain('Pfitzinger FRR ch.4');
    expect(out).toContain('Distances ET durées DIFFÉRENTES');
  });

  it('freq=2 → bloc RÈGLE FREQ injecté (cas Débutant 2 séances/sem)', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 2, level: 'Débutant (0-1 an)' }), true);
    expect(out).toContain('RÈGLE FREQ 2');
    expect(out).toContain('footing 35-50%');
  });

  it('freq=4 → bloc RÈGLE FREQ ABSENT (assez de séances pour différencier naturellement)', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 4 }), false);
    expect(out).not.toContain('RÈGLE FREQ');
  });

  it('freq=5 → bloc RÈGLE FREQ ABSENT (haute fréquence Marathon/Confirmé)', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 5, subGoal: 'Marathon' }), false);
    expect(out).not.toContain('RÈGLE FREQ');
  });

  it('freq=3 + Perte de Poids → règle freq présente, doctrine perte de poids préservée', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 3, goal: 'Perte de poids' }), false);
    expect(out).toContain('RÈGLE FREQ 3');
    // Vérif que la doctrine perte de poids spécifique (2 SL/sem) reste en place
    expect(out).toContain('MAXIMUM 2 séances de type "Sortie Longue"');
  });

  it('freq=3 → bloc DIVERSITÉ OBLIGATOIRE reste intact (pas régression)', () => {
    const out = buildSafetyInstructions(baseProfile({ frequency: 3 }), false);
    expect(out).toContain('DIVERSITÉ OBLIGATOIRE DES SÉANCES');
    expect(out).toContain('MAXIMUM 1 séance de type "Sortie Longue"');
  });
});
