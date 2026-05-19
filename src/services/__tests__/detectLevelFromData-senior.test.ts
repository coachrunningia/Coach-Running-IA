/**
 * Tests anti-régression Fix #5a — Senior ≥55 ans : préservation niveau déclaré.
 *
 * Bug : cas georgeslor1 (57 ans, déclare Expert, chrono 10K 1h00) — code rétrogradait à "deb"
 * car 10K 1h00 = critère Débutant pour homme jeune. Mais en senior, ce chrono = niveau Expert.
 * Les chronos lents en senior reflètent l'âge (déclin VO2max -10%/décennie), PAS le niveau
 * d'entraînement.
 *
 * Fix sûr : si âge ≥ 55 ET niveau déclaré ≥ Intermédiaire → préserver le déclaratif.
 *
 * Validation Coach FFA ✅ + Trail ✅ + PM ✅. Sources : Hammond 2018 "lifelong endurance Masters",
 * Tanaka 2008 (déclin VO2max âge).
 */

import { describe, it, expect } from 'vitest';
import { detectLevelFromData } from '../geminiService';

describe('detectLevelFromData — Fix #5a senior preservation', () => {
  it('georgeslor1 : 57 ans, déclare Expert, chrono 10K 1h00 → retourne expert (pas deb)', () => {
    const data = {
      age: 57,
      sex: 'Homme',
      level: 'Expert (Performance)',
      recentRaceTimes: { distance10km: '1h00' },
    };
    expect(detectLevelFromData(data)).toBe('expert');
  });

  it('Rich : 55 ans, déclare Expert, chrono 10K 45min → retourne expert', () => {
    const data = {
      age: 55,
      sex: 'Homme',
      level: 'Expert (Performance)',
      recentRaceTimes: { distance10km: '45min' },
    };
    expect(detectLevelFromData(data)).toBe('expert');
  });

  it('60 ans, déclare Confirmé, chrono 10K 55min → retourne conf (préservé)', () => {
    const data = {
      age: 60,
      sex: 'Homme',
      level: 'Confirmé (Compétition)',
      recentRaceTimes: { distance10km: '55min' },
    };
    expect(detectLevelFromData(data)).toBe('conf');
  });

  it('65 ans, déclare Intermédiaire, chrono lent → retourne inter (préservé)', () => {
    const data = {
      age: 65,
      sex: 'Femme',
      level: 'Intermédiaire (Régulier)',
      recentRaceTimes: { distance10km: '1h10' },
    };
    expect(detectLevelFromData(data)).toBe('inter');
  });

  it('60 ans Débutant → reste Débutant (pas d\'effet sur deb)', () => {
    const data = {
      age: 60,
      sex: 'Homme',
      level: 'Débutant (0-1 an)',
      recentRaceTimes: { distance10km: '1h30' },
    };
    expect(detectLevelFromData(data)).toBe('deb');
  });
});

describe('detectLevelFromData — non-régression (age < 55)', () => {
  it('30 ans Expert, chrono 10K 1h00 → downgrade comportement actuel inchangé', () => {
    const data = {
      age: 30,
      sex: 'Homme',
      level: 'Expert (Performance)',
      recentRaceTimes: { distance10km: '1h00' },
    };
    // Pas senior → override chrono s'applique → downgrade vers deb
    expect(detectLevelFromData(data)).not.toBe('expert');
  });

  it('45 ans Confirmé, chrono cohérent → reste conf', () => {
    const data = {
      age: 45,
      sex: 'Homme',
      level: 'Confirmé (Compétition)',
      recentRaceTimes: { distance10km: '40min' },
    };
    expect(detectLevelFromData(data)).toBe('conf');
  });

  it('Pas d\'âge fourni (age=0) → senior fix non déclenché, comportement actuel', () => {
    const data = {
      sex: 'Homme',
      level: 'Expert (Performance)',
      recentRaceTimes: { distance10km: '1h00' },
    };
    expect(detectLevelFromData(data)).not.toBe('expert');
  });

  it('54 ans (juste sous seuil) Expert chrono lent → downgrade applicable', () => {
    const data = {
      age: 54,
      sex: 'Homme',
      level: 'Expert (Performance)',
      recentRaceTimes: { distance10km: '1h00' },
    };
    expect(detectLevelFromData(data)).not.toBe('expert');
  });
});
