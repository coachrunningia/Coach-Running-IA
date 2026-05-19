/**
 * Tests bibliothèque coach Marathon (Sprint Marathon 2026-05-20).
 */

import { describe, it, expect } from 'vitest';
import { MARATHON_PATTERNS, MARATHON_RULES, MARATHON_TAPER, buildMarathonPromptBlock } from '../doctrine/marathonDoctrine';

describe('marathonDoctrine — structure patterns', () => {
  it('MARATHON_PATTERNS contient les 8 patterns canoniques', () => {
    const names = MARATHON_PATTERNS.map(p => p.name);
    expect(names).toContain('MP-LR');
    expect(names).toContain('MLR');
    expect(names).toContain('LT-CRUISE');
    expect(names).toContain('TEMPO');
    expect(names).toContain('VO2-LONG');
    expect(names).toContain('LR-PROG');
    expect(names).toContain('LR-EF');
    expect(names).toContain('10K-TUNE-UP');
    expect(MARATHON_PATTERNS.length).toBe(8);
  });

  it('MP-LR exclut Débutant (sécurité)', () => {
    const mpLr = MARATHON_PATTERNS.find(p => p.name === 'MP-LR');
    expect(mpLr!.excludeLevels).toContain('Débutant');
    expect(mpLr!.neverConsecutive).toBe(true);
    expect(mpLr!.minSpacingWeeks).toBe(2);
  });

  it('MARATHON_RULES contient séquencement et ratios Seiler', () => {
    expect(MARATHON_RULES.sequence4WeeksSpecifique).toMatch(/MP-LR/);
    expect(MARATHON_RULES.minDifferentPatternsOver4Weeks).toBe(3);
    expect(MARATHON_RULES.minRecoveryBetweenHardSessions).toBe(72);
  });

  it('MARATHON_TAPER contient 3 paliers (S-3, S-2, S-1)', () => {
    expect(MARATHON_TAPER.Sminus3.volPct).toBe(80);
    expect(MARATHON_TAPER.Sminus2.volPct).toBe(65);
    expect(MARATHON_TAPER.Sminus1.volPct).toBe(45);
    expect(MARATHON_TAPER.Sminus1.sl).toMatch(/REMPLACE/);
  });
});

describe('marathonDoctrine — buildMarathonPromptBlock', () => {
  const paces = {
    efPace: '5:40',
    seuilPace: '4:42',
    vmaPace: '4:17',
    allureSpecifiqueMarathon: '5:10',
  };

  it('Débutant Marathon → restriction stricte (pas de MP-LR autorisée)', () => {
    const block = buildMarathonPromptBlock({ level: 'Débutant (0-1 an)' }, paces);
    expect(block).toMatch(/INTERDIT pour ce niveau/);
    expect(block).toMatch(/MP-LR > 28 km/);
    expect(block).toMatch(/VO2-LONG/);
    // Le bloc ne doit PAS lister les patterns avancés
    expect(block).not.toMatch(/PATTERNS DISPONIBLES/);
  });

  it('Confirmé Marathon → bibliothèque complète injectée', () => {
    const block = buildMarathonPromptBlock({ level: 'Confirmé' }, paces);
    expect(block).toMatch(/PATTERNS DISPONIBLES/);
    expect(block).toMatch(/MP-LR/);
    expect(block).toMatch(/LT-CRUISE/);
    expect(block).toMatch(/AFFÛTAGE MARATHON/);
    expect(block).toMatch(/5:10/); // allure MP injectée
  });

  it('Bloc Confirmé contient les règles anti-monotonie', () => {
    const block = buildMarathonPromptBlock({ level: 'Confirmé' }, paces);
    expect(block).toMatch(/JAMAIS 2 SL MP-LR consécutives/);
    expect(block).toMatch(/2 semaines minimum/);
  });
});
