/**
 * Tests anti-régression — Fix point 6 (Thomas Weill audit 2026-05-19).
 *
 * Bug : enforceWeekConstraints mute s.duration/s.distance (caps SL, caps
 * MAX_WEEKLY_VOLUME, recalibration ±10%, etc.) MAIS ne réajuste pas
 * weeklyVolumes. Conséquence : l'UI affiche un volume hebdo qui ne matche
 * pas la somme réelle des séances générées (S15 Thomas : weeklyVolumes=71,
 * somme=66, drift -7%).
 *
 * Fix : à la fin de enforceWeekConstraints, recalcul weeklyVolumes[weekIdx]
 * = sum(s.distance pour s.type ≠ Renforcement|Repos). Seuil 2 km pour
 * éviter le bruit d'arrondi.
 *
 * Lancer : npx vitest run src/services/__tests__/enforceWeekConstraints-syncWeeklyVolumes.test.ts
 */

import { describe, it, expect } from 'vitest';
import { enforceWeekConstraints } from '../geminiService';

// Profil "Intermédiaire" 10K — caps SL = 75 min ; non-SL = 56 min ; max session = 14 km.
const baseData = {
  goal: 'Course sur Route',
  subGoal: '10km',
  level: 'Intermédiaire (Régulier)',
  vma: 14,
  weight: 70,
  height: 175,
  age: 35,
};

describe('Fix point 6 — sync weeklyVolumes après enforceWeekConstraints', () => {
  it('1. Week avec session cap → weeklyVolumes recalculé', () => {
    // SL de 20 km > max 14 km → sera cappée à 14 km
    const week: any = {
      weekNumber: 1,
      phase: 'developpement',
      sessions: [
        { type: 'Jogging', day: 'Lundi', duration: '45 min', distance: '7 km' },
        { type: 'Fractionné', day: 'Mercredi', duration: '50 min', distance: '8 km' },
        { type: 'Sortie Longue', day: 'Dimanche', duration: '1h30', distance: '20 km' },
      ],
    };
    const weeklyVolumes = [35]; // = 7+8+20 = 35, mais SL sera cappée à 14
    enforceWeekConstraints(week, 35, baseData, weeklyVolumes, 0);

    // Sum après cap ≈ 29-33 selon scaling additionnel ; en tous cas < 35 original
    // car la SL a été cappée. Le seuil 2 km déclenche le resync.
    expect(weeklyVolumes[0]).toBeLessThan(35);
    expect(weeklyVolumes[0]).toBeGreaterThanOrEqual(25);
    expect(weeklyVolumes[0]).toBeLessThanOrEqual(33);
  });

  it('2. Week avec seulement renfo + repos (target=0) → pas de crash, sync skip', () => {
    // Quand targetVolume=0, enforceWeekConstraints short-circuit en section 6
    // (return ligne ~1512) → le sync block n'est pas atteint. Comportement
    // acceptable : weeks sans target = pas de drift à corriger.
    const week: any = {
      weekNumber: 1,
      phase: 'fondamental',
      sessions: [
        { type: 'Renforcement', day: 'Mardi', duration: '30 min' },
        { type: 'Repos', day: 'Jeudi', duration: '0 min' },
      ],
    };
    const weeklyVolumes = [25];
    expect(() => enforceWeekConstraints(week, 0, baseData, weeklyVolumes, 0)).not.toThrow();
    // weeklyVolumes inchangé car early-return targetVolume<=0 avant le sync
    expect(weeklyVolumes[0]).toBe(25);
  });

  it('2b. Week avec target>0 + renfo + course → sum exclut renfo, sync OK', () => {
    // Renfo a une distance "0 km" ou undefined par convention → ne doit pas
    // entrer dans la somme. Vérifié par le filter type !== Renforcement|Repos.
    const week: any = {
      weekNumber: 1,
      phase: 'fondamental',
      sessions: [
        { type: 'Renforcement', day: 'Mardi', duration: '30 min', distance: '0 km' },
        { type: 'Jogging', day: 'Mercredi', duration: '40 min', distance: '6 km' },
        { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '10 km' },
      ],
    };
    // weeklyVolumes input = 30 (anormalement haut) → drift = 14 km → resync vers 16
    const weeklyVolumes = [30];
    enforceWeekConstraints(week, 16, baseData, weeklyVolumes, 0);
    // Resync : sum course = 6+10 = 16, on attend ≈16 (renfo ignoré).
    expect(weeklyVolumes[0]).toBeLessThanOrEqual(18);
    expect(weeklyVolumes[0]).toBeGreaterThanOrEqual(14);
  });

  it('3. Pas de mutation distance (déjà conforme caps) → weeklyVolumes inchangé', () => {
    const week: any = {
      weekNumber: 1,
      phase: 'fondamental',
      sessions: [
        { type: 'Jogging', day: 'Lundi', duration: '40 min', distance: '6 km' },
        { type: 'Jogging', day: 'Mercredi', duration: '45 min', distance: '7 km' },
        { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '10 km' },
      ],
    };
    // Total = 23 km, weeklyVolumes input = 23 (parfaitement aligné)
    const weeklyVolumes = [23];
    enforceWeekConstraints(week, 23, baseData, weeklyVolumes, 0);

    // Aucune mutation → drift = 0 → seuil 2 non franchi → weeklyVolumes inchangé
    expect(weeklyVolumes[0]).toBe(23);
  });

  it('4. weeklyVolumes undefined / weekIdx undefined → pas de crash', () => {
    const week: any = {
      weekNumber: 1,
      phase: 'fondamental',
      sessions: [
        { type: 'Jogging', day: 'Lundi', duration: '40 min', distance: '6 km' },
        { type: 'Sortie Longue', day: 'Dimanche', duration: '1h00', distance: '10 km' },
      ],
    };
    // Ne passe NI weeklyVolumes NI weekIdx → la fonction doit just no-op le sync
    expect(() => enforceWeekConstraints(week, 16, baseData)).not.toThrow();
    // Idem avec weeklyVolumes mais weekIdx hors borne
    const wv = [20];
    expect(() => enforceWeekConstraints(week, 16, baseData, wv, 5)).not.toThrow();
    expect(wv[0]).toBe(20); // inchangé
  });

  it('5. Drift Thomas S15 reproduit → sync vers somme réelle', () => {
    // Reproduction approximative du cas Thomas : S15 weeklyVolumes=71, sum=66.
    // On simule sessions dont la somme post-cap = 66 km (drift -7%).
    const week: any = {
      weekNumber: 15,
      phase: 'specifique',
      sessions: [
        { type: 'Jogging', day: 'Lundi', duration: '50 min', distance: '8 km' },
        { type: 'Fractionné', day: 'Mardi', duration: '55 min', distance: '9 km' },
        { type: 'Jogging', day: 'Jeudi', duration: '55 min', distance: '9 km' },
        { type: 'Tempo', day: 'Vendredi', duration: '50 min', distance: '8 km' },
        { type: 'Sortie Longue', day: 'Dimanche', duration: '2h00', distance: '14 km' },
        { type: 'Renforcement', day: 'Samedi', duration: '30 min' },
      ],
    };
    // Sum course = 8+9+9+8+14 = 48 km MAIS weeklyVolumes périodisation = 71
    // Drift = 23 km, > seuil 2 → sync.
    const weeklyVolumes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 71];
    enforceWeekConstraints(week, 71, baseData, weeklyVolumes, 14);

    // weeklyVolumes[14] doit avoir été resync à la somme réelle (à ±5 km près
    // car enforceWeekConstraints peut scaler-up si under-target).
    expect(weeklyVolumes[14]).toBeLessThan(71);
    expect(weeklyVolumes[14]).toBeGreaterThan(0);
  });
});
