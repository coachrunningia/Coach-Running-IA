/**
 * F-17 — Tests paceRecalibrationService (8 cas critiques, scope mini-viable)
 *
 * Couverture des 20 tests prévus Dev senior plan, focus :
 * - Swap map construction + multi-paces
 * - Regex patterns P1/P2/P3
 * - Garde-fou swap.has (durées préservées)
 * - Idempotence + identité
 * - Plan legacy sans paces
 */

import { describe, it, expect } from 'vitest';
import {
  buildPaceSwapMap,
  recalibrateText,
  recalibrateSession,
} from '../paceRecalibrationService';
import type { Session, TrainingPaces } from '../../types';

const oldPaces: Partial<TrainingPaces> = {
  vmaPace: '6:00',
  seuilPace: '6:53',
  eaPace: '7:48',
  efPace: '8:57',
  recoveryPace: '10:00',
  allureSpecifique5k: '6:19',
  allureSpecifique10k: '6:40',
  allureSpecifiqueSemi: '7:03',
  allureSpecifiqueMarathon: '7:30',
};

const newPaces: Partial<TrainingPaces> = {
  vmaPace: '5:00',
  seuilPace: '5:44',
  eaPace: '6:30',
  efPace: '7:28',
  recoveryPace: '8:20',
  allureSpecifique5k: '5:16',
  allureSpecifique10k: '5:33',
  allureSpecifiqueSemi: '5:53',
  allureSpecifiqueMarathon: '6:15',
};

describe('buildPaceSwapMap', () => {
  it('1. Construit le swap correct sur 9 paces standard', () => {
    const swap = buildPaceSwapMap(oldPaces, newPaces);
    expect(swap.size).toBe(9);
    expect(swap.get('8:57')).toBe('7:28');
    expect(swap.get('6:00')).toBe('5:00');
    expect(swap.get('10:00')).toBe('8:20');
  });

  it('2. Strip " min/km" si présent', () => {
    const swap = buildPaceSwapMap(
      { efPace: '8:57 min/km' } as any,
      { efPace: '7:28 min/km' } as any
    );
    expect(swap.get('8:57')).toBe('7:28');
  });

  it('3. Plan legacy sans paces → swap vide, pas de crash', () => {
    expect(buildPaceSwapMap(null, newPaces).size).toBe(0);
    expect(buildPaceSwapMap(oldPaces, undefined).size).toBe(0);
  });
});

describe('recalibrateText — patterns P1/P2/P3', () => {
  const swap = buildPaceSwapMap(oldPaces, newPaces);

  it('4. P1 "X:XX min/km" simple — cas standard', () => {
    expect(recalibrateText('Footing 5 km à 8:57 min/km', swap))
      .toBe('Footing 5 km à 7:28 min/km');
  });

  it('5. P3 parenthèses "(8:57)"', () => {
    expect(recalibrateText('EF (8:57) confortable', swap))
      .toBe('EF (7:28) confortable');
  });

  it('6. Multi-paces dans même mainSet (fractionné)', () => {
    const input = '4×800 à 6:00 min/km récup à 10:00 min/km';
    const out = recalibrateText(input, swap);
    expect(out).toContain('5:00 min/km');
    expect(out).toContain('8:20 min/km');
  });

  it('7. Garde-fou durées non-paces : "Repos 1:30" intact', () => {
    expect(recalibrateText('Repos 1:30 entre tours', swap))
      .toBe('Repos 1:30 entre tours');
  });

  it('8. Garde-fou pace inconnue : "6:30/km" intact (pas dans oldPaces)', () => {
    // 6:30 n'est pas dans oldPaces → no-op
    expect(recalibrateText('Footing à 6:30/km bizarre', swap))
      .toBe('Footing à 6:30/km bizarre');
  });

  it('9. Borne \\b : "15:07 min/km" matché en 15:07 (pas 5:07 ni 7:07)', () => {
    // oldPaces n'a ni 15:07 ni 5:07 → no-op
    expect(recalibrateText('Footing 15:07 min/km', swap))
      .toBe('Footing 15:07 min/km');
  });

  it('10. Multi-occurrence même pace (cas mxjulien02)', () => {
    expect(recalibrateText('20 min à 8:57 puis 30 min à 8:57 min/km', swap))
      .toBe('20 min à 7:28 puis 30 min à 7:28 min/km');
  });
});

describe('Gel allures course (freezeRaceSpecificPaces)', () => {
  it('16. freezeRaceSpecificPaces=true → exclut allureSpecifique5k/10k/Semi/Marathon', () => {
    const swap = buildPaceSwapMap(oldPaces, newPaces, { freezeRaceSpecificPaces: true });
    expect(swap.size).toBe(5); // 5 training paces only
    expect(swap.get('8:57')).toBe('7:28'); // efPace OK
    expect(swap.has('7:37')).toBe(false); // allureSpecifique5k exclu
    expect(swap.has('8:02')).toBe(false); // allureSpecifique10k exclu
  });

  it('17. recalibrateText avec freeze : allure 10K objectif intacte, EF recalibrée', () => {
    const swap = buildPaceSwapMap(oldPaces, newPaces, { freezeRaceSpecificPaces: true });
    const input = 'Échauffement 10 min à 8:57 min/km, puis 5 km allure 10K à 8:02 min/km';
    const out = recalibrateText(input, swap);
    expect(out).toContain('7:28 min/km'); // EF recalibrée
    expect(out).toContain('8:02 min/km'); // allure 10K GELÉE (intacte)
  });
});

describe('recalibrateSession — intégration', () => {
  it('11. Session EF complète : targetPace + mainSet + warmup/cooldown swappés', () => {
    const session: Session = {
      day: 'Mardi', title: 'EF', type: 'Jogging', duration: '60 min',
      distance: '8 km', targetRPE: 4, elevationGain: 0,
      targetPace: '8:57 min/km',
      mainSet: '60 min à 8:57 min/km',
      coachAdvice: '',
      warmup: '10 min à 10:00 min/km',
      cooldown: '5 min à 10:00 min/km + étirements',
    } as any;
    const r = recalibrateSession(session, oldPaces, newPaces);
    expect(r.targetPace).toBe('7:28 min/km');
    expect(r.mainSet).toBe('60 min à 7:28 min/km');
    expect((r as any).warmup).toBe('10 min à 8:20 min/km');
    expect((r as any).cooldown).toBe('5 min à 8:20 min/km + étirements');
  });

  it('12. Session Renfo : aucun changement (no pace match)', () => {
    const session: Session = {
      day: 'Mercredi', title: 'Renfo', type: 'Renforcement', duration: '40 min',
      targetRPE: 6, elevationGain: 0,
      mainSet: 'Squats 3x10, Fentes 3x8/jambe, Repos 1:30 entre tours',
      coachAdvice: '',
    } as any;
    const r = recalibrateSession(session, oldPaces, newPaces);
    expect(r.mainSet).toBe(session.mainSet);
  });

  it('13. Idempotence : recalibrage identité (old=new) → byte-equal', () => {
    const session: Session = {
      day: 'Mardi', title: 'EF', type: 'Jogging', duration: '60 min',
      targetRPE: 4, elevationGain: 0,
      targetPace: '8:57', mainSet: '60 min à 8:57 min/km', coachAdvice: '',
    } as any;
    const r = recalibrateSession(session, oldPaces, oldPaces);
    expect(r.mainSet).toBe(session.mainSet);
    expect(r.targetPace).toBe(session.targetPace);
  });

  it('14. Chaîne A→B→C : valeur finale = C, pas A intermédiaire', () => {
    const midPaces: Partial<TrainingPaces> = { ...newPaces, efPace: '7:28' };
    const finalPaces: Partial<TrainingPaces> = { ...newPaces, efPace: '6:45' };
    const session: Session = {
      day: 'Mardi', title: 'EF', type: 'Jogging', duration: '60 min',
      targetRPE: 4, elevationGain: 0,
      targetPace: '8:57', mainSet: '60 min à 8:57 min/km', coachAdvice: '',
    } as any;
    const step1 = recalibrateSession(session, oldPaces, midPaces);
    expect(step1.mainSet).toBe('60 min à 7:28 min/km');
    const step2 = recalibrateSession(step1, midPaces, finalPaces);
    expect(step2.mainSet).toBe('60 min à 6:45 min/km');
  });

  it('15. Plan legacy sans paces → session inchangée', () => {
    const session: Session = {
      day: 'Mardi', title: 'EF', type: 'Jogging', duration: '60 min',
      targetRPE: 4, elevationGain: 0,
      targetPace: '8:57', mainSet: '60 min à 8:57 min/km', coachAdvice: '',
    } as any;
    const r = recalibrateSession(session, null, null);
    expect(r.mainSet).toBe(session.mainSet);
  });
});
