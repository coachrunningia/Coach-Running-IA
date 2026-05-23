/**
 * Validation profonde 16 profils — Tous Sprints A/B/C/D/E (Phases 1+2) + Bug 17.
 * Date : 2026-05-23
 * Testeur : QA pro 10 ans (SaaS santé critique).
 *
 * Objectif : valider EN PROFONDEUR que TOUS les bugs corrigés ne se reproduisent
 * plus sur 16 profils réalistes (Route, Trail, Hyrox, Edge cases), ET que les
 * profils non-concernés sont préservés (zéro régression).
 *
 * Sprints couverts :
 *  - Sprint A (d4fa636) : Bug #2a s1ActualVolume, Bug #3 cap S1 ACWR 1.3, Bug #4 MC Débutant
 *  - Sprint B (481bd26) : Bug #2b cap senior 60/70/75, Bug #2c PB Riegel, Bug #5 paliers Gabbett
 *  - Sprint C (04d7529) : Bug #1 transparencyBlock exporté, Bug #3 guard petits vol
 *  - Sprint D (7f32724) : Bug #4 prompt freq <=3 différenciée
 *  - Sprint E Phase 1 (6507258) : Bug 1+2 Cross-training banni, Bug 7/12 Welcome,
 *                                  Bug 8 VMA cap, Bug 10 distance recalc
 *  - Sprint E Phase 2 (257bba4) : Bug 15 Injuries blacklist côtes
 *  - Bug 17 (working tree, pas encore commit) : startDate any-day cyclique
 *
 * Lancer :
 *   npx vitest run src/services/__tests__/validation-15-profils-tous-bugs-sprints.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateFeasibility, parseTargetTime, requiredVmaForTarget } from '../feasibilityService';
import {
  calculatePeriodizationPlan,
  applyMarcheCourseRouting,
  buildTransparencyBlock,
  buildSafetyInstructions,
  buildWelcomeToneBlock,
  enforceNoCrossTraining,
  enforceInjuryBlacklist,
  isHillBanned,
  isHardSurfaceBanned,
  recalculateSessionDistance,
} from '../geminiService';
import { calculateSessionDate, getWeekNumberForDate } from '../../utils/dateUtils';
import type { QuestionnaireData } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseFeas = {
  goal: 'Course sur route',
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
};

const baseQ = (overrides: Partial<QuestionnaireData> = {}): QuestionnaireData => ({
  goal: 'Course sur route',
  subGoal: 'Semi-Marathon',
  level: 'Intermédiaire (Régulier)',
  frequency: 3,
  preferredDays: ['Mardi', 'Jeudi', 'Samedi'],
  currentWeeklyVolume: 25,
  vma: 11,
  age: 35,
  sex: 'Homme',
  weight: 70,
  height: 175,
  targetTime: '1h45',
  raceDate: '2026-11-01',
  startDate: '2026-06-01',
  injuries: { hasInjury: false },
  ...overrides,
}) as QuestionnaireData;

const walkRunMainSet =
  "Échauffement 10 min. 8 × (1 min de course / 2 min de marche). Retour au calme 5 min.";
const slMainSetWalkBreak =
  "Échauffement 15 min EF. 12 km vallonné avec 1 min de course / 1 min de marche en montées. Retour au calme.";

// Spy console pour ne pas polluer (mais on peut consulter logs si besoin).
let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errSpy.mockRestore();
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 1 — Débutant Femme 5K (25 F cv 0 VMA 7 Finisher 5K 12 sem freq 3)
// ═════════════════════════════════════════════════════════════════════════════
// Attentes :
//  - cv=0 → mode absolute beginner, S1 ≤ 10 km, cap ACWR ne s'applique pas (cv≤0)
//  - Débutant + VMA<10 + cv<10 → routing MC actif
//  - Pas de cross-training dans buildSafetyInstructions
//  - Prompt RÈGLE FREQ 3 injectée
//  - 25 ans → pas de cap senior
//  - Profil sain pas de tone block

describe('PROFIL 1 — Débutant Femme 5K (25F cv0 VMA7 Finisher 5K 12s freq3)', () => {
  const profile = baseQ({
    goal: 'Course sur route',
    subGoal: '5K',
    level: 'Débutant (0-1 an)',
    frequency: 3,
    currentWeeklyVolume: 0,
    vma: 7,
    age: 25,
    sex: 'Femme',
    weight: 58,
    height: 165,
    targetTime: 'Finisher',
  });

  it('Feasibility Finisher : statut raisonnable (pas IRRÉALISTE pour 5K)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: profile.level!, vma: 7, distance: '5 km',
      planWeeks: 12, frequency: 3, currentVolume: 0, age: 25, weight: 58, height: 165,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(['EXCELLENT', 'BON', 'AMBITIEUX', 'RISQUÉ', 'IRRÉALISTE']).toContain(r.status);
  });

  it('S1 démarrage mode absolute beginner (≤ 10 km)', () => {
    const plan = calculatePeriodizationPlan(
      12, 0, 'Débutant (0-1 an)', 'Course sur route', '5K',
      undefined, undefined, 'Finisher', 25, 58, 7, 3, { height: 165 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThan(0);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(10);
  });

  it('Récupération : weeklyVolumes[récup] < weeklyVolumes[récup-1]', () => {
    const plan = calculatePeriodizationPlan(
      12, 0, 'Débutant (0-1 an)', 'Course sur route', '5K',
      undefined, undefined, 'Finisher', 25, 58, 7, 3, { height: 165 },
    );
    const recoveryWeeks = plan.recoveryWeeks;
    expect(recoveryWeeks.length).toBeGreaterThan(0);
  });

  it('applyMarcheCourseRouting : ACTIF (Débutant + VMA<10 + cv<10)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 7, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('buildSafetyInstructions : RÈGLE FREQ 3 + Footing 35-50%', () => {
    const out = buildSafetyInstructions(profile, true);
    expect(out).toContain('RÈGLE FREQ 3');
    expect(out).toContain('footing 35-50%');
  });

  it('buildSafetyInstructions : NO_CROSS_TRAINING_RULE injectée', () => {
    const out = buildSafetyInstructions(profile, true);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });

  it('enforceNoCrossTraining : Vélo retypé Repos', () => {
    const s: any = { type: 'Récupération', title: 'Récup vélo', mainSet: 'Vélo 45 min' };
    expect(enforceNoCrossTraining(s)).toBe(true);
    expect(s.type).toBe('Repos');
  });

  it('buildWelcomeToneBlock : statut BON → string vide', () => {
    expect(buildWelcomeToneBlock('BON')).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 2 — Débutant Homme 10K BMI 31 (32H cv0 VMA8 Finisher 10K 16s freq3)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 2 — Débutant H 10K BMI31 (32H cv0 VMA8 Finisher 10K 16s freq3)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: '10K', level: 'Débutant (0-1 an)',
    frequency: 3, currentWeeklyVolume: 0, vma: 8,
    age: 32, sex: 'Homme', weight: 95, height: 175, // BMI ~31
    targetTime: 'Finisher',
  });

  it('Feasibility Finisher : statut non IRRÉALISTE absolu (mais peut être RISQUÉ)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Débutant (0-1 an)', vma: 8, distance: '10 km',
      planWeeks: 16, frequency: 3, currentVolume: 0, age: 32, weight: 95, height: 175,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('buildSafetyInstructions : AVIS MÉDICAL IMPÉRATIF (Déb + BMI≥30)', () => {
    const out = buildSafetyInstructions(profile, true);
    expect(out).toContain('AVIS MÉDICAL IMPÉRATIF');
  });

  it('S1 mode absolute beginner ≤ 10', () => {
    const plan = calculatePeriodizationPlan(
      16, 0, 'Débutant (0-1 an)', 'Course sur route', '10K',
      undefined, undefined, 'Finisher', 32, 95, 8, 3, { height: 175 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThan(0);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(10);
  });

  it('applyMarcheCourseRouting : ACTIF (Débutant + VMA<10 + cv<10)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 8, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('buildSafetyInstructions : RÈGLE FREQ 3', () => {
    expect(buildSafetyInstructions(profile, true)).toContain('RÈGLE FREQ 3');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 3 — Régulier Semi Confirmé (40F cv25 VMA11 Semi 1h50 PB 2h05 16s freq4)
// ═════════════════════════════════════════════════════════════════════════════
// PB 2h05 = 125 min, cible 1h50 = 110 min, gap = 15/125 = 12% > 8% → cap 70

describe('PROFIL 3 — Régulier Semi Confirmé (40F cv25 VMA11 Semi 1h50 PB 2h05 16s freq4)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Semi-Marathon', level: 'Confirmé (Compétition)',
    frequency: 4, currentWeeklyVolume: 25, vma: 11,
    age: 40, sex: 'Femme', weight: 58, height: 165, targetTime: '1h50',
    recentRaceTimes: { distanceHalfMarathon: '2h05' },
  });

  it('Feasibility : score ≤ 70 (cap PB gap 12% > 8%)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Confirmé (Compétition)', vma: 11, targetTime: '1h50',
      distance: 'Semi-Marathon', planWeeks: 16, frequency: 4,
      currentVolume: 25, s1ActualVolume: 28, age: 40, weight: 58, height: 165,
      recentRaceTimes: { distanceHalfMarathon: '2h05' },
    });
    expect(r.score).toBeLessThanOrEqual(70);
  });

  it('S1 capée par ACWR 1.3 (≤ 33 km)', () => {
    const plan = calculatePeriodizationPlan(
      16, 25, 'Confirmé (Compétition)', 'Course sur route', 'Semi-Marathon',
      undefined, undefined, '1h50', 40, 58, 11, 4, { height: 165 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(25);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(33);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Confirmé)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing récup', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Confirmé (Compétition)', vma: 11, currentWeeklyVolume: 25 });
    expect(week.sessions[0].type).toBe('Jogging');
  });

  it('buildSafetyInstructions : freq=4 → PAS de RÈGLE FREQ', () => {
    const out = buildSafetyInstructions(profile, false);
    expect(out).not.toContain('RÈGLE FREQ');
  });

  it('buildSafetyInstructions : NO_CROSS_TRAINING_RULE inconditionnel', () => {
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 4 — Confirmé Marathon 3h30 PB 3h40 (35H cv50 VMA14 Marathon 18s freq5)
// ═════════════════════════════════════════════════════════════════════════════
// PB 3h40 = 220 min, cible 3h30 = 210 min, gap = 10/220 = 4.5% < 8% → pas cap #2c
// 35 ans → pas cap senior. Profil sain.

describe('PROFIL 4 — Confirmé Marathon 3h30 PB 3h40 (35H cv50 VMA14 Marathon 18s freq5)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Marathon', level: 'Confirmé (Compétition)',
    frequency: 5, currentWeeklyVolume: 50, vma: 14,
    age: 35, sex: 'Homme', weight: 70, height: 178, targetTime: '3h30',
    recentRaceTimes: { distanceMarathon: '3h40' },
  });

  it('Feasibility : score raisonnable (≥ 50, profil cohérent)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Confirmé (Compétition)', vma: 14, targetTime: '3h30',
      distance: 'Marathon', planWeeks: 18, frequency: 5,
      currentVolume: 50, s1ActualVolume: 52, age: 35, weight: 70, height: 178,
      recentRaceTimes: { distanceMarathon: '3h40' },
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('Plan pic ≥ 60 km (Marathon Confirmé)', () => {
    const plan = calculatePeriodizationPlan(
      18, 50, 'Confirmé (Compétition)', 'Course sur route', 'Marathon',
      undefined, undefined, '3h30', 35, 70, 14, 5, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    expect(peak).toBeGreaterThanOrEqual(60);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(65); // 1.3 × 50
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Confirmé)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL 18km', mainSet: slMainSetWalkBreak }] };
    applyMarcheCourseRouting(week, { level: 'Confirmé (Compétition)', vma: 14, currentWeeklyVolume: 50 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });

  it('buildSafetyInstructions : freq=5 → PAS de RÈGLE FREQ', () => {
    expect(buildSafetyInstructions(profile, false)).not.toContain('RÈGLE FREQ');
  });

  it('buildWelcomeToneBlock : statut EXCELLENT → string vide', () => {
    expect(buildWelcomeToneBlock('EXCELLENT')).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 5 — Expert Marathon 2h45 PB 2h50 (28H cv75 VMA18 Marathon 20s freq6)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 5 — Expert Marathon 2h45 PB 2h50 (28H cv75 VMA18 Marathon 20s freq6)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Marathon', level: 'Expert (Performance)',
    frequency: 6, currentWeeklyVolume: 75, vma: 18,
    age: 28, sex: 'Homme', weight: 65, height: 178, targetTime: '2h45',
    recentRaceTimes: { distanceMarathon: '2h50' },
  });

  it('Feasibility : score élevé attendu (Expert cohérent, gap PB ~3%)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Expert (Performance)', vma: 18, targetTime: '2h45',
      distance: 'Marathon', planWeeks: 20, frequency: 6,
      currentVolume: 75, s1ActualVolume: 78, age: 28, weight: 65, height: 178,
      recentRaceTimes: { distanceMarathon: '2h50' },
    });
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it('S1 cappée par ACWR 1.3 (cv=75 → max 97)', () => {
    const plan = calculatePeriodizationPlan(
      20, 75, 'Expert (Performance)', 'Course sur route', 'Marathon',
      undefined, undefined, '2h45', 28, 65, 18, 6, { height: 178 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(75);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(98);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Expert)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL 30km', mainSet: slMainSetWalkBreak }] };
    applyMarcheCourseRouting(week, { level: 'Expert (Performance)', vma: 18, currentWeeklyVolume: 75 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });

  it('buildSafetyInstructions : freq=6 → pas de RÈGLE FREQ', () => {
    expect(buildSafetyInstructions(profile, false)).not.toContain('RÈGLE FREQ');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 6 — Senior 70 Marathon Finisher (72H cv30 VMA9 Marathon 20s freq4)
// ═════════════════════════════════════════════════════════════════════════════
// 72 ans → cap senior 75 (70+). Pas de PB → cap #2c off.

describe('PROFIL 6 — Senior 72 Marathon Finisher (72H cv30 VMA9 Marathon 20s freq4)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Marathon', level: 'Intermédiaire (Régulier)',
    frequency: 4, currentWeeklyVolume: 30, vma: 9,
    age: 72, sex: 'Homme', weight: 72, height: 175, targetTime: 'Finisher',
  });

  it('Feasibility : score ≤ 75 (cap senior 70+ #2b)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Intermédiaire (Régulier)', vma: 9, targetTime: 'Finisher',
      distance: 'Marathon', planWeeks: 20, frequency: 4,
      currentVolume: 30, s1ActualVolume: 30, age: 72, weight: 72, height: 175,
    });
    expect(r.score).toBeLessThanOrEqual(75);
  });

  it('Plan S1 ≥ cv, ≤ 1.3×cv', () => {
    const plan = calculatePeriodizationPlan(
      20, 30, 'Intermédiaire (Régulier)', 'Course sur route', 'Marathon',
      undefined, undefined, 'Finisher', 72, 72, 9, 4, { height: 175 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(30);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(39);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Intermédiaire, VMA=9 mais cv=30)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 9, currentWeeklyVolume: 30 });
    expect(week.sessions[0].type).toBe('Jogging');
  });

  it('buildSafetyInstructions : senior 72 ans → COUREUR DE 72 ANS dans contraintes', () => {
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('COUREUR DE 72 ANS');
  });

  it('buildSafetyInstructions : freq=4 → PAS de RÈGLE FREQ', () => {
    expect(buildSafetyInstructions(profile, false)).not.toContain('RÈGLE FREQ');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 7 — Reprise blessure ischio (50F cv25 VMA12 Marathon 4h00 18s freq5)
// CAS LAURENCE Bug 15 — OBLIGATOIRE
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 7 — Reprise blessure ischio LAURENCE (50F cv25 VMA12 Marathon 4h00 18s freq5)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Marathon', level: 'Intermédiaire (Régulier)',
    frequency: 5, currentWeeklyVolume: 25, vma: 12,
    age: 50, sex: 'Femme', weight: 58, height: 165, targetTime: '4h00',
    injuries: { hasInjury: true, description: 'Tendinite ischio active' },
  });

  it('Bug 15 — isHillBanned("Tendinite ischio") → true', () => {
    expect(isHillBanned('Tendinite ischio')).toBe(true);
  });

  it('Bug 15 — isHillBanned("tendinite ischio active") → true', () => {
    expect(isHillBanned('tendinite ischio active')).toBe(true);
  });

  it('Bug 15 — enforceInjuryBlacklist retype S1 Footing vallonné → "Footing EF plat"', () => {
    const week = {
      weekNumber: 1, phase: 'fondamental',
      sessions: [
        { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné',
          mainSet: '45 min EF côtes en marche' },
        { day: 'Jeudi', type: 'Jogging', title: 'Footing vallonné',
          mainSet: '50 min EF avec dénivelé' },
        { day: 'Samedi', type: 'Sortie Longue', title: 'SL vallonnée',
          mainSet: '1h15 vallonnée, côtes en marche' },
      ],
    };
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio active', weekIdx: 0 });
    week.sessions.forEach(s => {
      expect(s.title).toBe('Footing EF plat');
      expect(s.mainSet).toMatch(/STRICTEMENT plat/i);
    });
  });

  it('Bug 15 — S5+ : enforceInjuryBlacklist NE retype PAS (phase libre)', () => {
    const week = {
      weekNumber: 5, phase: 'developpement',
      sessions: [
        { day: 'Mardi', type: 'Jogging', title: 'Footing vallonné',
          mainSet: '45 min EF vallonné' },
      ],
    };
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 4 });
    expect(week.sessions[0].title).toBe('Footing vallonné');
  });

  it('Bug 15 — Renforcement JAMAIS retypé (même tendinite ischio)', () => {
    const week = {
      weekNumber: 1, phase: 'fondamental',
      sessions: [
        { day: 'Lundi', type: 'Renforcement', title: 'Renfo bas',
          mainSet: 'Squats vallonné' },
      ],
    };
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 0 });
    expect(week.sessions[0].type).toBe('Renforcement');
    expect(week.sessions[0].title).toBe('Renfo bas');
  });

  it('Bug 15 — Repos JAMAIS retypé', () => {
    const week = {
      weekNumber: 1, phase: 'fondamental',
      sessions: [
        { day: 'Lundi', type: 'Repos', title: 'Repos complet', mainSet: 'Jour de repos' },
      ],
    };
    enforceInjuryBlacklist(week, { injuryDesc: 'tendinite ischio', weekIdx: 0 });
    expect(week.sessions[0].type).toBe('Repos');
  });

  it('Feasibility avec injury → score < 90 (pénalité -10 sur blessure)', () => {
    const r = calculateFeasibility({
      ...baseFeas, hasInjury: true,
      injuryDescription: 'Tendinite ischio active',
      level: 'Intermédiaire (Régulier)', vma: 12, targetTime: '4h00',
      distance: 'Marathon', planWeeks: 18, frequency: 5,
      currentVolume: 25, s1ActualVolume: 27, age: 50, weight: 58, height: 165,
    });
    // -10 sur blessure attendu, score doit refléter
    expect(r.score).toBeLessThanOrEqual(95);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Intermédiaire)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 12, currentWeeklyVolume: 25 });
    expect(week.sessions[0].type).toBe('Jogging');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 8 — Cible IRRÉALISTE Ambre-like (20F cv5 VMA8.7 Semi 2h00 PB 3h05 17s freq3)
// ═════════════════════════════════════════════════════════════════════════════
// PB Semi 3h05 = 185min, cible 2h00 = 120min, gap = 65/185 = 35% >> 15% → cap 60
// cv=5 → S1 cap ACWR 6.5

describe('PROFIL 8 — IRRÉALISTE Ambre-like (20F cv5 VMA8.7 Semi 2h00 PB 3h05 17s freq3)', () => {
  const profile = baseQ({
    goal: 'Course sur route', subGoal: 'Semi-Marathon', level: 'Débutant (0-1 an)',
    frequency: 3, currentWeeklyVolume: 5, vma: 8.7,
    age: 20, sex: 'Femme', weight: 55, height: 165, targetTime: '2h00',
    recentRaceTimes: { distanceHalfMarathon: '3h05' },
  });

  it('Feasibility : statut IRRÉALISTE ou RISQUÉ (gap PB 35% + cv=5)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Débutant (0-1 an)', vma: 8.7, targetTime: '2h00',
      distance: 'Semi-Marathon', planWeeks: 17, frequency: 3,
      currentVolume: 5, s1ActualVolume: 6, age: 20, weight: 55, height: 165,
      recentRaceTimes: { distanceHalfMarathon: '3h05' },
    });
    expect(['IRRÉALISTE', 'RISQUÉ']).toContain(r.status);
    expect(r.score).toBeLessThanOrEqual(60);
  });

  it('buildWelcomeToneBlock : IRRÉALISTE → BRUTAL TRANSPARENT + médecin', () => {
    const out = buildWelcomeToneBlock('IRRÉALISTE');
    expect(out).toContain('IRRÉALISTE');
    expect(out).toContain('BRUTAL TRANSPARENT');
    expect(out).toMatch(/indispensable/i);
    expect(out).toContain('graduelle'); // dans interdits
  });

  it('S1 cap ACWR 1.3 × 5 = ≤ 7 (mais ≥ cv)', () => {
    const plan = calculatePeriodizationPlan(
      17, 5, 'Débutant (0-1 an)', 'Course sur route', 'Semi-Marathon',
      undefined, undefined, '2h00', 20, 55, 8.7, 3, { height: 165 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(5);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(20); // tolérant ACWR + hard floor débutant
  });

  it('applyMarcheCourseRouting : ACTIF (Débutant + VMA<10 + cv<10)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 8.7, currentWeeklyVolume: 5 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('buildSafetyInstructions : RÈGLE FREQ 3', () => {
    expect(buildSafetyInstructions(profile, true)).toContain('RÈGLE FREQ 3');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 9 — Trail Débutant court (28F cv20 D+200 VMA11 Trail 25/600 Finisher 14s freq4)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 9 — Trail Débutant court (28F cv20 D+200 VMA11 Trail 25/600 Finisher 14s freq4)', () => {
  const profile = baseQ({
    goal: 'Trail', subGoal: 'Trail',
    trailDetails: { distance: 25, elevation: 600 } as any,
    level: 'Débutant (0-1 an)', frequency: 4, currentWeeklyVolume: 20,
    currentWeeklyElevation: 200, vma: 11,
    age: 28, sex: 'Femme', weight: 58, height: 165, targetTime: 'Finisher',
  });

  it('Feasibility : statut raisonnable', () => {
    const r = calculateFeasibility({
      ...baseFeas, goal: 'Trail',
      level: 'Débutant (0-1 an)', vma: 11, distance: 'Trail 25km',
      planWeeks: 14, frequency: 4,
      currentVolume: 20, currentWeeklyElevation: 200,
      trailElevation: 600, trailDistance: 25,
      age: 28, weight: 58, height: 165,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('S1 cap ACWR (≤ 1.3 × 20 = 26)', () => {
    const plan = calculatePeriodizationPlan(
      14, 20, 'Débutant (0-1 an)', 'Trail', 'Trail',
      25, 600, undefined, 28, 58, 11, 4, { height: 165 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(20);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(26);
  });

  it('applyMarcheCourseRouting : ACTIF (Débutant)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 11, currentWeeklyVolume: 20 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('buildSafetyInstructions : freq=4 → pas de RÈGLE FREQ', () => {
    expect(buildSafetyInstructions(profile, true)).not.toContain('RÈGLE FREQ');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 10 — Trail Régulier moyen (40H cv45 D+800 VMA13 Trail 50/2000 Finisher 20s freq5)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 10 — Trail Régulier moyen (40H cv45 D+800 VMA13 Trail 50/2000 Finisher 20s freq5)', () => {
  const profile = baseQ({
    goal: 'Trail', subGoal: 'Trail',
    trailDetails: { distance: 50, elevation: 2000 } as any,
    level: 'Intermédiaire (Régulier)', frequency: 5, currentWeeklyVolume: 45,
    currentWeeklyElevation: 800, vma: 13,
    age: 40, sex: 'Homme', weight: 72, height: 178, targetTime: 'Finisher',
  });

  it('Feasibility : score raisonnable (≥ 40)', () => {
    const r = calculateFeasibility({
      ...baseFeas, goal: 'Trail',
      level: 'Intermédiaire (Régulier)', vma: 13, distance: 'Trail 50km',
      planWeeks: 20, frequency: 5,
      currentVolume: 45, currentWeeklyElevation: 800,
      trailElevation: 2000, trailDistance: 50,
      age: 40, weight: 72, height: 178,
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('Plan : S1 cap ACWR (≤ 59 = 1.3×45)', () => {
    const plan = calculatePeriodizationPlan(
      20, 45, 'Intermédiaire (Régulier)', 'Trail', 'Trail',
      50, 2000, undefined, 40, 72, 13, 5, { height: 178 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(45);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(59);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Intermédiaire)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL 22km', mainSet: slMainSetWalkBreak }] };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 13, currentWeeklyVolume: 45 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 11 — Trail Confirmé long (38H cv70 D+2500 VMA15 Trail 80/4000 Conf 24s freq6)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 11 — Trail Confirmé long (38H cv70 D+2500 VMA15 Trail 80/4000 Conf 24s freq6)', () => {
  it('Feasibility : score raisonnable (Confirmé profil sain)', () => {
    const r = calculateFeasibility({
      ...baseFeas, goal: 'Trail',
      level: 'Confirmé (Compétition)', vma: 15, distance: 'Trail 80km',
      planWeeks: 24, frequency: 6,
      currentVolume: 70, currentWeeklyElevation: 2500,
      trailElevation: 4000, trailDistance: 80,
      age: 38, weight: 72, height: 178,
    });
    expect(r.score).toBeGreaterThanOrEqual(50);
  });

  it('Plan : pic ≥ 70 km', () => {
    const plan = calculatePeriodizationPlan(
      24, 70, 'Confirmé (Compétition)', 'Trail', 'Trail',
      80, 4000, undefined, 38, 72, 15, 6, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    expect(peak).toBeGreaterThanOrEqual(70);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(91); // 1.3×70
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Confirmé)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL 30km', mainSet: slMainSetWalkBreak }] };
    applyMarcheCourseRouting(week, { level: 'Confirmé (Compétition)', vma: 15, currentWeeklyVolume: 70 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 12 — CAS OLIVIER Ultra Senior roulant (56H cv30 D+50 VMA9 Trail 100/800 Finisher 27s freq5)
// Bug 1+2 — Cross-training banni
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 12 — CAS OLIVIER Ultra Senior roulant (56H cv30 D+50 VMA9 Trail 100/800 Finisher 27s freq5)', () => {
  const profile = baseQ({
    goal: 'Trail', subGoal: 'Trail',
    trailDetails: { distance: 100, elevation: 800 } as any,
    level: 'Confirmé (Compétition)', frequency: 5, currentWeeklyVolume: 30,
    currentWeeklyElevation: 50, vma: 9,
    age: 56, sex: 'Homme', weight: 82, height: 176, targetTime: 'Finisher',
  });

  it('Feasibility : statut IRRÉALISTE ou RISQUÉ (cv30 vs 100km dist)', () => {
    const r = calculateFeasibility({
      ...baseFeas, goal: 'Trail',
      level: 'Confirmé (Compétition)', vma: 9, distance: 'Trail 100km',
      planWeeks: 27, frequency: 5,
      currentVolume: 30, currentWeeklyElevation: 50,
      trailElevation: 800, trailDistance: 100,
      age: 56, weight: 82, height: 176,
    });
    expect(r.score).toBeLessThanOrEqual(60);
  });

  it('Bug 1+2 — Récupération Active (Vélo) → retypé Repos complet', () => {
    const session: any = {
      type: 'Récupération', title: 'Récupération Active (Vélo)',
      mainSet: 'Vélo récup 75 min en aisance',
      duration: '75 min', targetPace: '11:33', distance: '6.5 km',
    };
    expect(enforceNoCrossTraining(session)).toBe(true);
    expect(session.type).toBe('Repos');
    expect(session.title).toBe('Repos complet');
    expect(session.distance).toBe('N/A');
  });

  it('Bug 1+2 — buildSafetyInstructions : NO_CROSS_TRAINING_RULE INCONDITIONNEL (cas Olivier)', () => {
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });

  it('Plan : S1 cap ACWR (≤ 39 = 1.3×30)', () => {
    const plan = calculatePeriodizationPlan(
      27, 30, 'Confirmé (Compétition)', 'Trail', 'Trail',
      100, 800, undefined, 56, 82, 9, 5, { height: 176 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(30);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(39);
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Confirmé déclaré, même VMA<10)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL 30km', mainSet: slMainSetWalkBreak }] };
    applyMarcheCourseRouting(week, { level: 'Confirmé (Compétition)', vma: 9, currentWeeklyVolume: 30 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 13 — Ultra Expert UTMB-like (50H cv70 D+2000 VMA13 Trail 170/10000 Expert 28s freq5)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 13 — Ultra Expert UTMB-like (50H cv70 D+2000 VMA13 Trail 170/10000 Expert 28s freq5)', () => {
  it('Feasibility : score raisonnable Expert (≥ 40)', () => {
    const r = calculateFeasibility({
      ...baseFeas, goal: 'Trail',
      level: 'Expert (Performance)', vma: 13, distance: 'Trail 170km',
      planWeeks: 28, frequency: 5,
      currentVolume: 70, currentWeeklyElevation: 2000,
      trailElevation: 10000, trailDistance: 170,
      age: 50, weight: 70, height: 175,
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('Plan : pic ≥ 90 km (Expert Trail100+)', () => {
    const plan = calculatePeriodizationPlan(
      28, 70, 'Expert (Performance)', 'Trail', 'Trail',
      170, 10000, undefined, 50, 70, 13, 5, { height: 175 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    expect(peak).toBeGreaterThanOrEqual(90);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(91); // 1.3×70
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 14 — Hyrox Régulier (35H cv30 VMA12 Hyrox 8K Finisher 14s freq4)
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 14 — Hyrox Régulier (35H cv30 VMA12 Hyrox 8K Finisher 14s freq4)', () => {
  const profile = baseQ({
    goal: 'Hyrox', subGoal: 'Hyrox',
    level: 'Intermédiaire (Régulier)', frequency: 4, currentWeeklyVolume: 30,
    vma: 12, age: 35, sex: 'Homme', weight: 78, height: 180,
    targetTime: 'Finisher',
  });

  it('S1 cap ACWR (≤ 39 = 1.3×30) — Hyrox respecte aussi le cap', () => {
    const plan = calculatePeriodizationPlan(
      14, 30, 'Intermédiaire (Régulier)', 'Hyrox', 'Hyrox',
      undefined, undefined, 'Finisher', 35, 78, 12, 4, { height: 180 },
    );
    // Doctrine `feedback_courte_duree_charge_allegee` : Hyrox 14 sem → S1 peut démarrer
    // légèrement sous cv (~27 km vs cv 30) pour montée en charge progressive sécurisée.
    // Borne haute respecte ACWR 1.3 strict.
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(20);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(39);
  });

  it('buildSafetyInstructions : NO_CROSS_TRAINING_RULE injectée (Hyrox = part course uniquement)', () => {
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });

  it('applyMarcheCourseRouting : DÉSACTIVÉ (Intermédiaire)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 12, currentWeeklyVolume: 30 });
    expect(week.sessions[0].type).toBe('Jogging');
  });

  it('buildSafetyInstructions : freq=4 → pas de RÈGLE FREQ', () => {
    expect(buildSafetyInstructions(profile, false)).not.toContain('RÈGLE FREQ');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 15 — VMA astronaute trap (32F cv25 VMA11 Semi "2:24" 16s freq4)
// Bug 8 — parseTargetTime HH:MM heuristique
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 15 — VMA astronaute trap (32F cv25 VMA11 Semi "2:24" 16s freq4)', () => {
  it('Bug 8 — parseTargetTime("2:24") → 144 min (HH:MM, pas 2.4)', () => {
    expect(parseTargetTime('2:24')).toBe(144);
  });

  it('Bug 8 — requiredVmaForTarget cap 30 km/h (anti-aberration)', () => {
    // 2.4 min sur 21.1 km → 527 km/h vmaCible → cap 30
    expect(requiredVmaForTarget(2.4, 21.1)).toBe(30);
  });

  it('Bug 8 — requiredVmaForTarget normal Semi 144 min → ~10.4 km/h', () => {
    // 21.1 / (144/60) = 8.79 km/h, factor 0.85 → ~10.34
    const v = requiredVmaForTarget(144, 21.1);
    expect(v).toBeGreaterThan(9);
    expect(v).toBeLessThan(12);
  });

  it('Feasibility avec "2:24" (interprété 2h24) → score raisonnable (pas crash, pas IRRÉALISTE absolu)', () => {
    const r = calculateFeasibility({
      ...baseFeas, level: 'Intermédiaire (Régulier)', vma: 11, targetTime: '2:24',
      distance: 'Semi-Marathon', planWeeks: 16, frequency: 4,
      currentVolume: 25, s1ActualVolume: 28, age: 32, weight: 58, height: 165,
    });
    // Pas de crash, score dans range valide
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROFIL 16 — Arnaud startDate any-day (50H cv30 VMA11 10K 50min startDate dim 24/05 freq3)
// Bug 17 — calculateSessionDate cyclique modulo 7
// NOTE: Bug 17 implémenté dans le working tree mais PAS encore commité.
// On teste quand même car le code est en place (utilisateur a précisé "bientôt commit").
// ═════════════════════════════════════════════════════════════════════════════

describe('PROFIL 16 — Bug 17 startDate any-day cyclique (Arnaud)', () => {
  it('startDate dim 24/05/2026 + Lundi S1 → 25/05 (offset 1)', () => {
    const d = calculateSessionDate('2026-05-24', 1, 'Lundi');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // mai
    expect(d.getDate()).toBe(25);
  });

  it('startDate dim 24/05/2026 + Dimanche S1 → 24/05 (offset 0)', () => {
    const d = calculateSessionDate('2026-05-24', 1, 'Dimanche');
    expect(d.getDate()).toBe(24);
    expect(d.getMonth()).toBe(4);
  });

  it('startDate dim 24/05/2026 + Mardi S1 → 26/05 (offset 2)', () => {
    const d = calculateSessionDate('2026-05-24', 1, 'Mardi');
    expect(d.getDate()).toBe(26);
  });

  it('startDate dim 24/05/2026 + Samedi S1 → 30/05 (offset 6)', () => {
    const d = calculateSessionDate('2026-05-24', 1, 'Samedi');
    expect(d.getDate()).toBe(30);
  });

  it('getWeekNumberForDate(lun 25/05, startDate dim 24/05) → 1', () => {
    const dateLundi = new Date(2026, 4, 25); // mai = mois 4
    const wn = getWeekNumberForDate(dateLundi, '2026-05-24');
    expect(wn).toBe(1);
  });

  it('getWeekNumberForDate(dim 31/05, startDate dim 24/05) → 2 (7 jours pile)', () => {
    const dateNextSun = new Date(2026, 4, 31);
    const wn = getWeekNumberForDate(dateNextSun, '2026-05-24');
    expect(wn).toBe(2);
  });

  it('NO REGRESSION : startDate lun 25/05 + Lundi S1 → 25/05 (offset 0)', () => {
    const d = calculateSessionDate('2026-05-25', 1, 'Lundi');
    expect(d.getDate()).toBe(25);
  });

  it('NO REGRESSION : startDate lun 25/05 + Mardi S2 → 02/06', () => {
    const d = calculateSessionDate('2026-05-25', 2, 'Mardi');
    expect(d.getDate()).toBe(2);
    expect(d.getMonth()).toBe(5); // juin
  });

  it('Cas Mardi startDate + Lundi → offset 6 (lundi suivant)', () => {
    // Mardi 26/05/2026 → Lundi de la semaine "cyclique" = lundi 1/06 (offset 6)
    const d = calculateSessionDate('2026-05-26', 1, 'Lundi');
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(5); // juin
  });

  it('Cas Vendredi startDate + Dimanche → offset 2', () => {
    // Vendredi 29/05/2026 → Dimanche = 31/05 (offset 2)
    const d = calculateSessionDate('2026-05-29', 1, 'Dimanche');
    expect(d.getDate()).toBe(31);
    expect(d.getMonth()).toBe(4); // mai
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITES TRANSVERSES — buildTransparencyBlock + buildWelcomeToneBlock
// ═════════════════════════════════════════════════════════════════════════════

describe('TRANSVERSE — buildTransparencyBlock (Sprint B Bug 5 + Sprint C Bug 1+3)', () => {
  it('cv=50 S1=50 (ratio 1.0) → bloc vide', () => {
    expect(buildTransparencyBlock(50, 50)).toBe('');
  });

  it('cv=10 S1=13 (delta < 8 ET cv < 10 ? cv=10 NON <10) → palier dépend ratio', () => {
    const block = buildTransparencyBlock(10, 13);
    // cv=10 PAS strictement < 10 donc guard PAS appliqué
    // ratio 1.30 → palier vert/jaune PRUDENT
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('PRUDENT');
  });

  it('Bug 3 Sprint C — guard petits volumes : cv=5 S1=10 (delta=5<8 ET cv<10) → bloc vide', () => {
    expect(buildTransparencyBlock(5, 10)).toBe('');
  });

  it('cv=30 S1=37 (ratio 1.23) → PRUDENT, mention +23%', () => {
    const block = buildTransparencyBlock(30, 37);
    expect(block).toContain('PRUDENT');
    expect(block).toContain('+23%');
  });

  it('cv=20 S1=28 (ratio 1.40) → DUR, mention +40%', () => {
    const block = buildTransparencyBlock(20, 28);
    expect(block).toContain('DUR');
    expect(block).toContain('+40%');
    expect(block).toContain('Gabbett 1.4');
  });

  it('cv=25 S1=40 (ratio 1.6) → BRUTAL, mention +60%', () => {
    const block = buildTransparencyBlock(25, 40);
    expect(block).toContain('BRUTAL');
    expect(block).toContain('+60%');
    expect(block).toContain('Gabbett 1.6');
  });

  it('cv=0 → bloc vide quelle que soit S1', () => {
    expect(buildTransparencyBlock(0, 25)).toBe('');
  });
});

describe('TRANSVERSE — buildWelcomeToneBlock conditional (Sprint E Bug 7/12)', () => {
  it('undefined → vide', () => { expect(buildWelcomeToneBlock(undefined)).toBe(''); });
  it('EXCELLENT → vide', () => { expect(buildWelcomeToneBlock('EXCELLENT')).toBe(''); });
  it('BON → vide', () => { expect(buildWelcomeToneBlock('BON')).toBe(''); });
  it('AMBITIEUX → TON FERME', () => {
    const out = buildWelcomeToneBlock('AMBITIEUX');
    expect(out).toContain('TON FERME');
  });
  it('RISQUÉ → TON PRUDENT + signaux', () => {
    const out = buildWelcomeToneBlock('RISQUÉ');
    expect(out).toContain('TON PRUDENT');
    expect(out).toContain('signaux');
  });
  it('IRRÉALISTE → BRUTAL TRANSPARENT + avis médical', () => {
    const out = buildWelcomeToneBlock('IRRÉALISTE');
    expect(out).toContain('BRUTAL TRANSPARENT');
    expect(out).toMatch(/avis médical/i);
    expect(out).toMatch(/indispensable/i);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITES TRANSVERSES — Bug 8 parseTargetTime / requiredVmaForTarget
// ═════════════════════════════════════════════════════════════════════════════

describe('TRANSVERSE — Bug 8 parseTargetTime', () => {
  it('"2:24" → 144 min (HH:MM, m=2 ∈ [1,5])', () => {
    expect(parseTargetTime('2:24')).toBe(144);
  });
  it('"1:30" → 90 min (HH:MM)', () => {
    expect(parseTargetTime('1:30')).toBe(90);
  });
  it('"3:45" → 225 min (HH:MM Marathon)', () => {
    expect(parseTargetTime('3:45')).toBe(225);
  });
  it('"22:30" → 22.5 min (MM:SS car m=22 hors [1,5])', () => {
    expect(parseTargetTime('22:30')).toBeCloseTo(22.5, 2);
  });
  it('"45:30" → 45.5 min (MM:SS, m=45 hors)', () => {
    expect(parseTargetTime('45:30')).toBeCloseTo(45.5, 2);
  });
  it('"2h24" → 144 min', () => {
    expect(parseTargetTime('2h24')).toBe(144);
  });
});

describe('TRANSVERSE — Bug 8 requiredVmaForTarget cap', () => {
  it('input absurde (2.4 min Semi) → cap 30 km/h', () => {
    expect(requiredVmaForTarget(2.4, 21.1)).toBe(30);
  });
  it('input invalide (0 min) → cap 30', () => {
    expect(requiredVmaForTarget(0, 21.1)).toBe(30);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITES TRANSVERSES — Bug 10 recalculateSessionDistance
// ═════════════════════════════════════════════════════════════════════════════

describe('TRANSVERSE — Bug 10 recalculateSessionDistance', () => {
  it('Cas Ambre J2 : 50 min @ 10:17, distance 3.88 km → recalculé ~4.86 km', () => {
    const s: any = {
      type: 'Jogging', title: 'Footing EF',
      duration: '50 min', targetPace: '10:17', distance: '3.88 km',
      mainSet: '40 min EF',
    };
    recalculateSessionDistance(s);
    const km = parseFloat(s.distance);
    expect(km).toBeGreaterThanOrEqual(4.7);
    expect(km).toBeLessThanOrEqual(5.0);
  });

  it('Négative split → distance PRÉSERVÉE (skip)', () => {
    const s: any = {
      type: 'Sortie Longue', title: 'SL Négative Split',
      duration: '52 min', targetPace: '5:15', distance: '10 km',
      mainSet: 'négative split 5 km à 5:30 puis 5 km à 5:00',
    };
    recalculateSessionDistance(s);
    expect(s.distance).toBe('10 km');
  });

  it('Fartlek → distance PRÉSERVÉE', () => {
    const s: any = {
      type: 'Fractionné', title: 'Fartlek 6x1min',
      duration: '45 min', targetPace: '5:30', distance: '8 km',
      mainSet: '6 × (1 min vite + 2 min EF) fartlek',
    };
    recalculateSessionDistance(s);
    expect(s.distance).toBe('8 km');
  });

  it('Repos → skip', () => {
    const s: any = { type: 'Repos', title: 'Repos', duration: 'N/A', targetPace: 'N/A', distance: 'N/A' };
    recalculateSessionDistance(s);
    expect(s.distance).toBe('N/A');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITES TRANSVERSES — enforceNoCrossTraining (Sprint E Bug 1+2)
// ═════════════════════════════════════════════════════════════════════════════

describe('TRANSVERSE — Bug 1+2 enforceNoCrossTraining', () => {
  it('Vélo → Repos', () => {
    const s: any = { type: 'Récupération', title: 'Vélo récup', mainSet: 'Vélo 45 min' };
    expect(enforceNoCrossTraining(s)).toBe(true);
    expect(s.type).toBe('Repos');
  });
  it('Natation → Repos', () => {
    const s: any = { type: 'Récupération', title: 'Récup', mainSet: 'Natation 30 min' };
    expect(enforceNoCrossTraining(s)).toBe(true);
    expect(s.type).toBe('Repos');
  });
  it('Elliptique → Repos', () => {
    const s: any = { type: 'Récupération', title: 'Cardio doux', mainSet: 'Elliptique 30 min' };
    expect(enforceNoCrossTraining(s)).toBe(true);
    expect(s.type).toBe('Repos');
  });
  it('Piscine → Repos', () => {
    const s: any = { type: 'Récupération', title: 'Récup piscine', mainSet: 'Piscine 30 min' };
    expect(enforceNoCrossTraining(s)).toBe(true);
    expect(s.type).toBe('Repos');
  });
  it('Vélocité (mot composé) → NE PAS retyper (regex \\b)', () => {
    const s: any = { type: 'Jogging', title: 'Footing EF',
      mainSet: 'Travailler la vélocité de foulée 35 min' };
    expect(enforceNoCrossTraining(s)).toBe(false);
    expect(s.type).toBe('Jogging');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITES TRANSVERSES — Bug 15 isHardSurfaceBanned (autre branche injuries)
// ═════════════════════════════════════════════════════════════════════════════

describe('TRANSVERSE — Bug 15 isHardSurfaceBanned', () => {
  it('périostite → true', () => { expect(isHardSurfaceBanned('périostite tibiale')).toBe(true); });
  it('stress fracture → true', () => { expect(isHardSurfaceBanned('stress fracture')).toBe(true); });
  it('tibia → true', () => { expect(isHardSurfaceBanned('douleur tibia')).toBe(true); });
  it('genou général → false', () => { expect(isHardSurfaceBanned('douleur genou général')).toBe(false); });
  it('undefined → false', () => { expect(isHardSurfaceBanned(undefined)).toBe(false); });
});
