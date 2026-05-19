/**
 * Tests anti-régression Fix D — applySessionScale + whitelist mainSet sync.
 *
 * Cause racine (INVESTIGATION-MAINSET-DURATION-DESYNC.md) : 24 sites dans
 * geminiService.ts mutent duration/distance sans réécrire mainSet → 51 séances
 * en base avec mainSet "116 min" vs duration "60 min" (cas steph-fanny).
 *
 * Doctrine coach (élément D) : WHITELIST stricte (Sortie Longue / Jogging /
 * Footing) + BLACKLIST explicite (Fractionné, Tempo, Côtes, Renforcement,
 * Marche-Course, Hyrox, ...).
 *
 * Lancer : npx vitest run src/services/__tests__/sessionScale-sync-mainset.test.ts
 */

import { describe, it, expect } from 'vitest';
import { applySessionScale, isMainSetSyncable, MAINSET_SYNCABLE_TYPES, MAINSET_RISKY_TYPES } from '../sessionScale';

describe('Fix D — applySessionScale : whitelist Sortie Longue / Jogging / Footing', () => {
  it('Sortie Longue 1h30/12 km → scale à 1h00/8 km → duration + distance maj + mainSet sync', () => {
    const session: any = {
      type: 'Sortie Longue',
      day: 'Dimanche',
      duration: '1h 30 min',
      distance: '12 km',
      mainSet: '90 min de course continue en endurance fondamentale (6:30/km).',
    };
    applySessionScale(session, '1h00', '8 km');
    expect(session.duration).toBe('1h00');
    expect(session.distance).toBe('8 km');
    // mainSet doit avoir "60 min" en début (1h00 = 60 min)
    expect(session.mainSet).toMatch(/^60 min/);
  });

  it('Jogging "45 min en EF (6:00/km)" → scale 30 min → mainSet "30 min..."', () => {
    const session: any = {
      type: 'Jogging',
      duration: '45 min',
      distance: '7 km',
      mainSet: '45 min en endurance fondamentale, allure régulière (6:00/km).',
    };
    applySessionScale(session, '30 min', '5 km');
    expect(session.mainSet).toMatch(/^30 min en endurance/);
    expect(session.distance).toBe('5 km');
  });

  it('Footing "60 min en deux moitiés..." 10 km → scale 40 min/6 km → mainSet "40 min..."', () => {
    const session: any = {
      type: 'Footing',
      duration: '60 min',
      distance: '10 km',
      mainSet: '60 min en deux moitiés : la 1re très tranquille (bas de l\'EF), la 2e dans le haut de l\'EF autour de 6:00/km.',
    };
    applySessionScale(session, '40 min', '6 km');
    expect(session.mainSet).toMatch(/^40 min en deux moitiés/);
  });

  it('Pattern "X km" sync sans toucher au pattern fractionné "Y × Z km"', () => {
    // Cas où une Sortie Longue mentionne en passant "10 km à 5:00/km"
    const session: any = {
      type: 'Sortie Longue',
      duration: '1h30',
      distance: '12 km',
      mainSet: '90 min de course continue. Sur les derniers 10 km, accélère vers allure spécifique.',
    };
    applySessionScale(session, '1h00', '8 km');
    // Premier "X km" remplacé (10 km → 8 km)
    expect(session.mainSet).toMatch(/8 km/);
  });
});

describe('Fix D — Blacklist : types risqués → mainSet INCHANGÉ', () => {
  it('Fractionné "6 × 800 m" → scale dur/km → mainSet INCHANGÉ', () => {
    const session: any = {
      type: 'Fractionné',
      duration: '60 min',
      distance: '10 km',
      mainSet: 'Échauffement 15 min EF, puis 6 × 800 m à allure VMA (récup 2 min trot), puis 10 min retour au calme.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '45 min', '7 km');
    // Duration/distance officielles maj
    expect(session.duration).toBe('45 min');
    expect(session.distance).toBe('7 km');
    // mainSet INCHANGÉ
    expect(session.mainSet).toBe(originalMainSet);
  });

  it('Renforcement "Squats 3×9, Fentes 3×8" → scale dur → mainSet INCHANGÉ', () => {
    const session: any = {
      type: 'Renforcement',
      duration: '40 min',
      mainSet: 'Échauffement articulaire 5 min. Squats 3×9 (récup 60s), Fentes alternées 3×8 par jambe, Gainage 3×45s. Étirements 5 min.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '30 min', '');
    expect(session.duration).toBe('30 min');
    expect(session.mainSet).toBe(originalMainSet);
  });

  it('Tempo "20 min à allure seuil" → scale → mainSet INCHANGÉ', () => {
    const session: any = {
      type: 'Tempo',
      duration: '50 min',
      distance: '8 km',
      mainSet: 'Échauffement 15 min EF, puis 20 min à allure seuil (5:00/km), puis 10 min retour au calme.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '40 min', '6 km');
    expect(session.duration).toBe('40 min');
    expect(session.mainSet).toBe(originalMainSet);
  });

  it('Côtes "10 × 200m côte" → scale → mainSet INCHANGÉ', () => {
    const session: any = {
      type: 'Côtes',
      duration: '55 min',
      distance: '7 km',
      mainSet: 'Échauffement 15 min, puis 10 × 200m en côte (effort 8/10, récup trot descente), retour au calme 10 min.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '45 min', '6 km');
    expect(session.mainSet).toBe(originalMainSet);
  });

  it('Hyrox "8 × 1 km" → scale → mainSet INCHANGÉ (NE PAS toucher)', () => {
    const session: any = {
      type: 'Hyrox',
      duration: '60 min',
      distance: '8 km',
      mainSet: '8 × 1 km avec stations Hyrox entre chaque bloc course.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '50 min', '7 km');
    expect(session.mainSet).toBe(originalMainSet);
  });

  it('Marche-Course → scale → mainSet INCHANGÉ', () => {
    const session: any = {
      type: 'Marche-Course',
      duration: '40 min',
      mainSet: 'Alterne 2 min marche / 1 min course très facile, x 8-10 cycles selon ressenti.',
    };
    const originalMainSet = session.mainSet;
    applySessionScale(session, '30 min', '');
    expect(session.mainSet).toBe(originalMainSet);
  });
});

describe('Fix D — Anti-collision : mainSet whitelisté mais contient fractionné', () => {
  it('Type "Jogging" mais mainSet contient "6 × 200m" → distance NON modifiée', () => {
    // Cas Gemini mal typé : un fractionné enregistré comme Jogging
    const session: any = {
      type: 'Jogging',
      duration: '50 min',
      distance: '8 km',
      mainSet: '50 min de footing avec 6 × 200m vifs en milieu de séance.',
    };
    applySessionScale(session, '40 min', '6 km');
    // Distance officielle maj
    expect(session.distance).toBe('6 km');
    // mainSet : "50 min" peut être remplacé par "40 min" (pattern dur en début),
    // MAIS la distance "200m" ne doit PAS être touchée (pattern fractionné détecté)
    expect(session.mainSet).toMatch(/200m/); // intact
  });
});

describe('Fix D — Idempotence', () => {
  it('Appel multiple → résultat stable (pas de drift)', () => {
    const session: any = {
      type: 'Sortie Longue',
      duration: '1h30',
      distance: '12 km',
      mainSet: '90 min de course continue en endurance fondamentale (6:30/km).',
    };
    applySessionScale(session, '1h00', '8 km');
    const afterFirst = session.mainSet;
    applySessionScale(session, '1h00', '8 km');
    expect(session.mainSet).toBe(afterFirst);
    applySessionScale(session, '1h00', '8 km');
    expect(session.mainSet).toBe(afterFirst);
  });
});

describe('Fix D — Edge cases', () => {
  it('mainSet absent → pas de crash', () => {
    const session: any = { type: 'Jogging', duration: '40 min', distance: '6 km' };
    expect(() => applySessionScale(session, '30 min', '5 km')).not.toThrow();
    expect(session.duration).toBe('30 min');
  });

  it('session undefined → no-op', () => {
    expect(() => applySessionScale(null, '30 min', '5 km')).not.toThrow();
    expect(() => applySessionScale(undefined, '30 min', '5 km')).not.toThrow();
  });

  it('isMainSetSyncable — exports cohérents', () => {
    expect(MAINSET_SYNCABLE_TYPES.has('Sortie Longue')).toBe(true);
    expect(MAINSET_SYNCABLE_TYPES.has('Jogging')).toBe(true);
    expect(MAINSET_SYNCABLE_TYPES.has('Footing')).toBe(true);
    expect(MAINSET_SYNCABLE_TYPES.has('Fractionné')).toBe(false);

    expect(MAINSET_RISKY_TYPES.has('Fractionné')).toBe(true);
    expect(MAINSET_RISKY_TYPES.has('Tempo')).toBe(true);
    expect(MAINSET_RISKY_TYPES.has('Renforcement')).toBe(true);
    expect(MAINSET_RISKY_TYPES.has('Hyrox')).toBe(true);
    expect(MAINSET_RISKY_TYPES.has('Sortie Longue')).toBe(false);
  });

  it('isMainSetSyncable détecte les fractionnés via le mainSet', () => {
    expect(isMainSetSyncable('Jogging', '45 min EF')).toBe(true);
    expect(isMainSetSyncable('Jogging', '6 × 800m')).toBe(false);
    expect(isMainSetSyncable('Jogging', '8x400m récup 1 min')).toBe(false);
    expect(isMainSetSyncable('Fractionné', '6 × 800m')).toBe(false);
    expect(isMainSetSyncable('Sortie Longue', '90 min continu')).toBe(true);
  });
});
