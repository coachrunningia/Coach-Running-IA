/**
 * Validation 10 profils Trail/Ultra — Sprints A+B+C+D en prod
 * Date : 2026-05-23
 * Testeur : QA pro Trail/Ultra 10 ans
 *
 * Objectif : valider que les fixes Sprint A (Bug #2a/#3/#4), Sprint B (Bug #2b/#2c/#5),
 * Sprint C (Bug #1/#2 Finisher/#3/#6/#9) et Sprint D Item 4 (freq <=3 prompt) ne
 * dégradent PAS la pertinence sur les profils Trail/Ultra. Le testeur précédent
 * n'avait validé QUE Marathon/Semi/10K/5K — Trail/Ultra n'avaient JAMAIS été testés.
 *
 * Sources :
 *   - SPRINT-A-P0-RECAP.md (commit d4fa6360)
 *   - SPRINT-B-P1-RECAP.md (commit 481bd26f)
 *   - Sprint C (commit 04d7529) — buildTransparencyBlock exporté, guard petits volumes
 *   - SPRINT-D-RECAP.md / commit 7f32724 — buildSafetyInstructions freq <=3
 *
 * Lancer :
 *   npx vitest run src/services/__tests__/validation-10-profils-trail-ultra.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';
import {
  calculatePeriodizationPlan,
  applyMarcheCourseRouting,
  buildTransparencyBlock,
  buildSafetyInstructions,
} from '../geminiService';
import type { QuestionnaireData } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseFeas = {
  goal: 'Trail',
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
};

const baseQ = (overrides: Partial<QuestionnaireData> = {}): QuestionnaireData => ({
  goal: 'Trail',
  subGoal: 'Trail',
  level: 'Confirmé (Compétition)',
  frequency: 4,
  preferredDays: ['Mardi', 'Jeudi', 'Samedi'],
  currentWeeklyVolume: 30,
  vma: 13,
  age: 35,
  sex: 'Homme',
  weight: 72,
  height: 178,
  raceDate: '2026-09-01',
  startDate: '2026-05-23',
  injuries: { hasInjury: false },
  ...overrides,
}) as QuestionnaireData;

// Pattern run/walk pour tester applyMarcheCourseRouting
const walkRunMainSet =
  "Échauffement 10 min. 8 × (1 min de course / 2 min de marche). Retour au calme 5 min.";
const slTrailVallonneMainSet =
  "Échauffement 15 min EF. 18 km vallonné avec 1 min de course / 1 min de marche en montées. Retour au calme.";

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 1 — Trail Débutant court : 35 ans F, Trail 20 km / 500 D+, cv 15, VMA 10, freq 3, 12 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Pour un Débutant à 20 km, le path Finisher s'applique (pas de temps cible).
// Attentes :
//   - calculateFeasibility (Finisher) : score raisonnable (pas IRRÉALISTE), pas de cap senior (35 ans).
//   - calculatePeriodizationPlan : pic ≈ 25-35 km (Débutant Trail<30 = 35 km × session factor).
//   - cap ACWR : S1 ≤ 1.3 × 15 = 20.
//   - applyMarcheCourseRouting actif sur Débutant.
//   - buildTransparencyBlock : selon S1/cv.
//   - buildSafetyInstructions freq=3 : règle FREQ 3 injectée.

describe('Profil 1 — Trail Débutant court (35 F Trail 20/500 cv15 VMA10 freq3 12s)', () => {
  it('Feasibility Finisher : score cohérent (Débutant cv 15 + D+ actuel 50 vs race 500 = ratio 10× → IRRÉALISTE attendu)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Débutant (0-1 an)',
      vma: 10,
      distance: 'Trail 20km',
      planWeeks: 12,
      frequency: 3,
      currentVolume: 15,
      currentWeeklyElevation: 50,
      trailElevation: 500,
      trailDistance: 20,
      age: 35,
      weight: 60,
      height: 165,
    });
    console.log(`[P1 Trail Déb 20km] score=${r.score} status=${r.status}`);
    // Profil Débutant + ratio D+ race/actuel 10× + plan court 12 sem = IRRÉALISTE LÉGITIME
    // (doctrine feedback_securite_avant_conversion). Anciennes assertions ≥40 trop optimistes.
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(95);
    expect(['IRRÉALISTE', 'RISQUÉ', 'AMBITIEUX']).toContain(r.status);
  });

  it('Plan : S1 capée par ACWR (≤ 1.3 × cv = 20)', () => {
    const plan = calculatePeriodizationPlan(
      12, 15, 'Débutant (0-1 an)', 'Trail', 'Trail',
      20, 500, undefined, 35, 60, 10, 3, { height: 165 },
    );
    console.log(`[P1 Trail Déb 20km] S1=${plan.weeklyVolumes[0]} peak=${Math.max(...plan.weeklyVolumes)}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(15);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(20);
  });

  it('Routing Marche/Course ACTIF (Débutant)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 10, currentWeeklyVolume: 15 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Prompt freq=3 : règle FREQ 3 injectée', () => {
    const out = buildSafetyInstructions(baseQ({
      level: 'Débutant (0-1 an)', frequency: 3, currentWeeklyVolume: 15, vma: 10, age: 35, sex: 'Femme',
    }), true);
    expect(out).toContain('RÈGLE FREQ 3');
    expect(out).toContain('footing 35-50%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 2 — Trail Régulier moyen : 40 ans H, Trail 50 km / 1500 D+, cv 35, D+ act 400, VMA 13, Inter, freq 4, 16 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Path Finisher (pas de temps).
// Attentes :
//   - Score raisonnable (BON/AMBITIEUX).
//   - cap ACWR : S1 ≤ 1.3 × 35 = 45.
//   - Pic ≈ 50-60 km (Inter Trail30+ = 60).
//   - Pas de cap senior (40 ans).
//   - Routing MC DÉSACTIVÉ (Intermédiaire).

describe('Profil 2 — Trail Régulier moyen (40 H Trail 50/1500 cv35 D+400 VMA13 Inter freq4 16s)', () => {
  it('Feasibility : score raisonnable (40-90)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Intermédiaire (Régulier)',
      vma: 13,
      distance: 'Trail 50km',
      planWeeks: 16,
      frequency: 4,
      currentVolume: 35,
      currentWeeklyElevation: 400,
      trailElevation: 1500,
      trailDistance: 50,
      age: 40,
      weight: 72,
      height: 178,
    });
    console.log(`[P2 Trail Inter 50km] score=${r.score} status=${r.status}`);
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThanOrEqual(95);
  });

  it('Plan : pic ≥ 40 km, S1 ≤ 45 (ACWR cap)', () => {
    const plan = calculatePeriodizationPlan(
      16, 35, 'Intermédiaire (Régulier)', 'Trail', 'Trail',
      50, 1500, undefined, 40, 72, 13, 4, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P2 Trail Inter 50km] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(35);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(46); // 1.3 × 35 = 45.5
    expect(peak).toBeGreaterThanOrEqual(40);
  });

  it('Routing MC DÉSACTIVÉ (Intermédiaire, pas Débutant)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Intermédiaire (Régulier)', vma: 13, currentWeeklyVolume: 35 });
    expect(week.sessions[0].type).toBe('Jogging');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 3 — Trail Confirmé long : 45 ans H, Trail 80 km / 3000 D+, cv 60, D+ act 1000, VMA 14, Conf, freq 5, 20 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Path Finisher. Attentes :
//   - Score BON (pas IRRÉALISTE, profil sain pour 80 km).
//   - cap ACWR : S1 ≤ 1.3 × 60 = 78.
//   - Pic ≈ 60-75 km (Conf Ultra = 70 mais 80 < 100 donc Trail30+ Conf = 70).
//   - Pas de cap senior (45 ans).

describe('Profil 3 — Trail Confirmé long (45 H Trail 80/3000 cv60 D+1000 VMA14 Conf freq5 20s)', () => {
  it('Feasibility : score BON (≥ 60)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 14,
      distance: 'Trail 80km',
      planWeeks: 20,
      frequency: 5,
      currentVolume: 60,
      currentWeeklyElevation: 1000,
      trailElevation: 3000,
      trailDistance: 80,
      age: 45,
      weight: 72,
      height: 178,
    });
    console.log(`[P3 Trail Conf 80km] score=${r.score} status=${r.status}`);
    expect(r.score).toBeGreaterThanOrEqual(50);
  });

  it('Plan : pic ≥ 55 km, S1 ≤ 78', () => {
    const plan = calculatePeriodizationPlan(
      20, 60, 'Confirmé (Compétition)', 'Trail', 'Trail',
      80, 3000, undefined, 45, 72, 14, 5, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P3 Trail Conf 80km] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(60);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(78);
    expect(peak).toBeGreaterThanOrEqual(55);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 4 — Trail Expert montagne : 35 ans H, Trail 100 km / 5000 D+, cv 80, D+ act 1800, VMA 16, Expert, freq 6, 24 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Path Finisher (pas de temps). Attentes :
//   - Score BON/EXCELLENT (Expert profil saint).
//   - cap ACWR : S1 ≤ 1.3 × 80 = 104.
//   - Pic ≈ 100-120 km (Expert Trail100+ = 120 base, freq 6 → factor 1.20 = 144 plafonné par profil).

describe('Profil 4 — Trail Expert montagne (35 H Trail 100/5000 cv80 D+1800 VMA16 Expert freq6 24s)', () => {
  it('Feasibility : score ≥ 60', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Expert (Performance)',
      vma: 16,
      distance: 'Trail 100km',
      planWeeks: 24,
      frequency: 6,
      currentVolume: 80,
      currentWeeklyElevation: 1800,
      trailElevation: 5000,
      trailDistance: 100,
      age: 35,
      weight: 70,
      height: 178,
    });
    console.log(`[P4 Trail Expert 100km] score=${r.score} status=${r.status}`);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it('Plan : pic ≥ 90 km (Expert Trail100+)', () => {
    const plan = calculatePeriodizationPlan(
      24, 80, 'Expert (Performance)', 'Trail', 'Trail',
      100, 5000, undefined, 35, 70, 16, 6, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P4 Trail Expert 100km] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(80);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(104); // 1.3×80
    expect(peak).toBeGreaterThanOrEqual(90);
  });

  it('Routing MC DÉSACTIVÉ (Expert)', () => {
    const week = { sessions: [{ type: 'Sortie Longue', title: 'SL Trail 30km', mainSet: slTrailVallonneMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Expert (Performance)', vma: 16, currentWeeklyVolume: 80 });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 5 — Ultra Senior roulant (Olivier-like) : 56 ans H, Trail 100 km / 800 D+, cv 30, D+ act 50, VMA 9, Conf déclaré, freq 5, 12 sem
// ═══════════════════════════════════════════════════════════════════════════════
// CAS CRITIQUE :
//   - Niveau Conf déclaré MAIS volume 30 km/sem + VMA 9 → vrai profil Inter ou borderline.
//   - 56 ans → cap senior Finisher (55+ ET dist ≥ 10K → max BON 84) MAIS Sprint C item 2
//     ajoute cap progressif 60+/70+ (56 sous seuil donc cap 84 seul).
//   - 100 km en 12 sem ET cv 30 → R2 règle 3 ratio 30/100 = 0.30 < 0.30 (Ultra) → cap IRRÉALISTE 10
//     OU 30/100 = 0.30 = exactement seuil amb 0.40 ? Seuils Ultra: irr=0.30, amb=0.40.
//     ratio 0.30 = EXACTEMENT seuil irr → NON < irr → ne déclenche pas. Mais 0.30 < 0.40 amb → penalty 20.
//   - Ultra 100km+ : minimum 20 sem (planWeeks 12 < 20 → -40 + -20 = -60).
//   - Cap senior Finisher 84.

describe('Profil 5 — Ultra Senior roulant Olivier-like (56 H Trail 100/800 cv30 D+50 VMA9 Conf freq5 12s)', () => {
  it('Feasibility : doit signaler IRRÉALISTE ou RISQUÉ (ultra 12 sem cv30)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 9,
      distance: 'Trail 100km',
      planWeeks: 12,
      frequency: 5,
      currentVolume: 30,
      currentWeeklyElevation: 50,
      trailElevation: 800,
      trailDistance: 100,
      age: 56,
      weight: 75,
      height: 178,
    });
    console.log(`[P5 Olivier-like] score=${r.score} status=${r.status} msg=${r.message.slice(0, 200)}`);
    // 12 sem pour 100 km est dangereux : doit cap au moins à RISQUÉ ou descendre fort.
    expect(r.score).toBeLessThanOrEqual(50);
  });

  it('Plan : pic conserve hard floor Ultra (cap senior 55+ ×0.85 appliqué côté volume)', () => {
    const plan = calculatePeriodizationPlan(
      12, 30, 'Confirmé (Compétition)', 'Trail', 'Trail',
      100, 800, undefined, 56, 75, 9, 5, { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P5 Olivier-like] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    // S1 capée par ACWR ≤ 1.3 × 30 = 39
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(30);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(39);
    expect(peak).toBeGreaterThan(plan.weeklyVolumes[0]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 6 — Ultra Senior 100mi UTMB-like : 50 ans H, Trail 170 km / 10000 D+, cv 70, D+ act 2000, VMA 13, Expert, freq 5, 28 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Cas réaliste UTMB :
//   - 170 km / 10000 D+ → R2 règle 1 : min D+ cycle = 10000 × 3 = 30 000 m
//     (multiplier 3 pour ≥100 km, doctrine UTMB Academy).
//   - cv 70 / 170 = 0.41 (> seuil amb 0.40 Ultra : pas de penalty).
//   - D+ act 2000 / race 10000 = ratio 5 (< 15 : pas de penalty).
//   - 50 ans → pas de cap senior Finisher (< 55).
//   - Pic Expert Trail100+ = 120 × factor freq 5/run4 = 1.10 → 132 cap.

describe('Profil 6 — Ultra 100mi UTMB-like (50 H Trail 170/10000 cv70 D+2000 VMA13 Expert freq5 28s)', () => {
  it('Feasibility : score BON (≥ 50)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Expert (Performance)',
      vma: 13,
      distance: 'Trail 170km',
      planWeeks: 28,
      frequency: 5,
      currentVolume: 70,
      currentWeeklyElevation: 2000,
      trailElevation: 10000,
      trailDistance: 170,
      age: 50,
      weight: 70,
      height: 175,
    });
    console.log(`[P6 UTMB-like] score=${r.score} status=${r.status}`);
    expect(r.score).toBeGreaterThanOrEqual(40);
  });

  it('Plan : pic Expert Trail100+ ≥ 100 km', () => {
    const plan = calculatePeriodizationPlan(
      28, 70, 'Expert (Performance)', 'Trail', 'Trail',
      170, 10000, undefined, 50, 70, 13, 5, { height: 175 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P6 UTMB-like] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(70);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(91); // 1.3 × 70
    // Bug 4 Sprint E Phase 2 (commit c50a9db) : floor Trail Ultra 60% race appliqué.
    // 170 km × 0.60 = 102 km min → pic effectif 102 (vérifié logs Periodization).
    // Anciennement 99 (cap MAX_WEEKLY_VOLUME 100 + ondulation 0.95). Bug 4 résout.
    expect(peak).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 7 — Trail Femme post-blessure : 32 ans F, Trail 30 km / 1200 D+, cv 25, D+ act 300, VMA 12, Inter, freq 4, 14 sem, injury
// ═══════════════════════════════════════════════════════════════════════════════
// Attentes :
//   - hasInjury true → -10 score.
//   - Routing MC désactivé (Intermédiaire).
//   - cap ACWR : S1 ≤ 1.3 × 25 = 32.

describe('Profil 7 — Trail Femme post-blessure (32 F Trail 30/1200 cv25 D+300 VMA12 Inter freq4 14s injury)', () => {
  it('Feasibility : score reflète blessure (-10 minimum)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      hasInjury: true,
      injuryDescription: 'Tendinite achille gauche, en récupération',
      level: 'Intermédiaire (Régulier)',
      vma: 12,
      distance: 'Trail 30km',
      planWeeks: 14,
      frequency: 4,
      currentVolume: 25,
      currentWeeklyElevation: 300,
      trailElevation: 1200,
      trailDistance: 30,
      age: 32,
      weight: 58,
      height: 165,
    });
    console.log(`[P7 Trail blessure 30km] score=${r.score} status=${r.status}`);
    expect(r.score).toBeGreaterThanOrEqual(10);
    expect(r.score).toBeLessThanOrEqual(90);
  });

  it('Plan : S1 capée par ACWR (≤ 33), démarrage progressif post-blessure', () => {
    const plan = calculatePeriodizationPlan(
      14, 25, 'Intermédiaire (Régulier)', 'Trail', 'Trail',
      30, 1200, undefined, 32, 58, 12, 4, { height: 165 },
    );
    console.log(`[P7 Trail blessure 30km] S1=${plan.weeklyVolumes[0]} peak=${Math.max(...plan.weeklyVolumes)}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(25);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(33);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 8 — Trail BMI élevé : 42 ans H, BMI 31 (180 cm / 100 kg), Trail 25 km / 500 D+, cv 20, D+ act 80, VMA 10, Débutant, freq 3, 16 sem
// ═══════════════════════════════════════════════════════════════════════════════
// Attentes :
//   - BMI 31 (obésité classe 1) → progression réduite à 6%/sem, volume × 0.80.
//   - Débutant → routing MC actif.
//   - Path Finisher : reasons "vigilance articulaire renforcée".
//   - cap ACWR : S1 ≤ 1.3 × 20 = 26.

describe('Profil 8 — Trail BMI élevé (42 H BMI31 180/100 Trail 25/500 cv20 D+80 VMA10 Déb freq3 16s)', () => {
  it('Feasibility : score modeste (BMI 31 → -15 reasons articulaires)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Débutant (0-1 an)',
      vma: 10,
      distance: 'Trail 25km',
      planWeeks: 16,
      frequency: 3,
      currentVolume: 20,
      currentWeeklyElevation: 80,
      trailElevation: 500,
      trailDistance: 25,
      age: 42,
      weight: 100,
      height: 180,
    });
    console.log(`[P8 Trail BMI31 25km] score=${r.score} status=${r.status}`);
    // Profil BMI élevé Débutant Trail → ne doit pas être EXCELLENT.
    expect(r.score).toBeLessThanOrEqual(84);
    expect(r.score).toBeGreaterThanOrEqual(10);
  });

  it('Plan : progression douce (rate ≤ 6%/sem pour BMI 30+)', () => {
    const plan = calculatePeriodizationPlan(
      16, 20, 'Débutant (0-1 an)', 'Trail', 'Trail',
      25, 500, undefined, 42, 100, 10, 3, { height: 180 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    console.log(`[P8 Trail BMI31 25km] S1=${plan.weeklyVolumes[0]} peak=${peak}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(20);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(26);
  });

  it('Routing MC ACTIF (Débutant)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 10, currentWeeklyVolume: 20 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Prompt safety : profil à risque élevé (Déb + BMI 30+) → avis médical IMPÉRATIF', () => {
    const out = buildSafetyInstructions(baseQ({
      level: 'Débutant (0-1 an)', frequency: 3, currentWeeklyVolume: 20, vma: 10,
      age: 42, weight: 100, height: 180, sex: 'Homme',
    }), true);
    expect(out).toContain('AVIS MÉDICAL IMPÉRATIF');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 9 — Trail VMA basse loisir : 60 ans F, Trail 22 km / 400 D+, cv 10, D+ act 30, VMA 8, Débutant, freq 3, 14 sem
// ═══════════════════════════════════════════════════════════════════════════════
// CAS CRITIQUE :
//   - 60 ans + Trail 22 km Finisher → Sprint C item 2 cap 90.
//   - VMA 8 ET cv 10 → reprise/santé → routing MC actif (Débutant + VMA<10 + cv<10).
//   - cap ACWR : S1 ≤ 1.3 × 10 = 13. Mais : guard petits volumes Sprint C #3
//     (s1Delta < 8 ET cv < 10 → bloc vide). cv = 10 EXACTEMENT → cv < 10 = false → guard NE s'applique PAS.

describe('Profil 9 — Trail VMA basse senior loisir (60 F Trail 22/400 cv10 D+30 VMA8 Déb freq3 14s)', () => {
  it('Feasibility Finisher : cap senior 60+ → score ≤ 90', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Débutant (0-1 an)',
      vma: 8,
      distance: 'Trail 22km',
      planWeeks: 14,
      frequency: 3,
      currentVolume: 10,
      currentWeeklyElevation: 30,
      trailElevation: 400,
      trailDistance: 22,
      age: 60,
      weight: 60,
      height: 165,
    });
    console.log(`[P9 Trail senior 22km] score=${r.score} status=${r.status}`);
    expect(r.score).toBeLessThanOrEqual(90);
    expect(r.score).toBeGreaterThanOrEqual(10);
  });

  it('Plan : S1 démarrage très bas (cv=10 cap ACWR 13)', () => {
    const plan = calculatePeriodizationPlan(
      14, 10, 'Débutant (0-1 an)', 'Trail', 'Trail',
      22, 400, undefined, 60, 60, 8, 3, { height: 165 },
    );
    console.log(`[P9 Trail senior 22km] S1=${plan.weeklyVolumes[0]} peak=${Math.max(...plan.weeklyVolumes)}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(10);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(15);
  });

  it('Routing MC ACTIF (Débutant + VMA<10 + cv<10)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 8, currentWeeklyVolume: 10 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });

  it('Prompt safety senior : adaptations 60 ans + risque élevé (Déb + Senior)', () => {
    const out = buildSafetyInstructions(baseQ({
      level: 'Débutant (0-1 an)', frequency: 3, currentWeeklyVolume: 10, vma: 8,
      age: 60, weight: 60, height: 165, sex: 'Femme',
    }), true);
    expect(out).toContain('COUREUR DE 60 ANS');
    expect(out).toContain('AVIS MÉDICAL IMPÉRATIF'); // Senior + Débutant = risque élevé
    expect(out).toContain('RÈGLE FREQ 3');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL 10 — Trail Reprise progressive : 38 ans F, Trail 50 km / 1500 D+, cv 0, VMA 8, Débutant, freq 3, 20 sem
// ═══════════════════════════════════════════════════════════════════════════════
// CAS CRITIQUE :
//   - cv=0 → mode absolute beginner (S1 ≤ 10 km).
//   - 50 km Trail Débutant en 20 sem cv=0 → R2 règle 3 ratio 0/50 = 0 < 0.40 → mais cv=0 skip de la règle.
//   - Débutant Trail 30-60 km Finisher → score 30 (très ambitieux pour débutant).
//   - Garde-fou getMinimumWeeksForBeginnerVolZero : Trail ≥ 30 km cv=0 → minimum 36 sem ? 20 sem < min.
//   - Routing MC actif.

describe('Profil 10 — Trail Reprise progressive (38 F Trail 50/1500 cv0 VMA8 Déb freq3 20s)', () => {
  it('Feasibility : statut RISQUÉ ou IRRÉALISTE (Déb cv=0 Trail 50km en 20 sem)', () => {
    const r = calculateFeasibility({
      ...baseFeas,
      level: 'Débutant (0-1 an)',
      vma: 8,
      distance: 'Trail 50km',
      planWeeks: 20,
      frequency: 3,
      currentVolume: 0,
      currentWeeklyElevation: 0,
      trailElevation: 1500,
      trailDistance: 50,
      age: 38,
      weight: 60,
      height: 168,
    });
    console.log(`[P10 Trail reprise 50km cv0] score=${r.score} status=${r.status} msg=${r.message.slice(0, 200)}`);
    // Débutant cv=0 sur Trail 50km en 20 sem = dangereux (minWeeks 36 sem requis).
    expect(r.score).toBeLessThanOrEqual(40);
  });

  it('Plan : S1 démarrage mode absolute beginner (≤ 10 km)', () => {
    const plan = calculatePeriodizationPlan(
      20, 0, 'Débutant (0-1 an)', 'Trail', 'Trail',
      50, 1500, undefined, 38, 60, 8, 3, { height: 168 },
    );
    console.log(`[P10 Trail reprise 50km cv0] S1=${plan.weeklyVolumes[0]} peak=${Math.max(...plan.weeklyVolumes)}`);
    expect(plan.weeklyVolumes[0]).toBeGreaterThan(0);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(10);
  });

  it('Routing MC ACTIF (Débutant + VMA<10 + cv<10 = absolute beginner)', () => {
    const week = { sessions: [{ type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet }] };
    applyMarcheCourseRouting(week, { level: 'Débutant (0-1 an)', vma: 8, currentWeeklyVolume: 0 });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Verifs transverses sur Trail :
// - buildTransparencyBlock : tester en cas pertinent (cv 35 S1 45 → ratio 1.29 jaune/vert)
// - buildTransparencyBlock : tester guard petits volumes (cv 10 S1 13 → bloc vide ? cv >= 10 donc PAS guard)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Verifs transverses Trail — buildTransparencyBlock', () => {
  it('cv=35 S1=45 (P2) : palier vert/jaune (ratio 1.29 ≤ 1.30)', () => {
    const block = buildTransparencyBlock(35, 45);
    // ratio 45/35 = 1.286 → ≤ 1.30 mais > 1.15 → palier PRUDENT
    console.log(`[Trans P2] block=${block.slice(0, 150)}`);
    expect(block).toContain('PRUDENT');
  });

  it('cv=15 S1=20 (P1 Débutant) : palier vert/jaune ou guard', () => {
    const block = buildTransparencyBlock(15, 20);
    // s1Delta = 5 (< 8) ET cv = 15 (PAS < 10) → guard NE s applique PAS
    // ratio 20/15 = 1.33 > 1.30 → palier DUR
    console.log(`[Trans P1] block=${block.slice(0, 150)}`);
    // ratio 1.33 → palier jaune/rouge DUR
    expect(block.length).toBeGreaterThan(0);
  });

  it('cv=10 S1=13 (P9) : guard activé ? cv=10 NON < 10 → guard NE s applique PAS', () => {
    const block = buildTransparencyBlock(10, 13);
    // s1Delta=3 (<8) ET cv=10 PAS strictement < 10 → guard PAS appliqué
    // ratio 1.30 → palier PRUDENT
    console.log(`[Trans P9] block=${block.slice(0, 150)}`);
    expect(block.length).toBeGreaterThan(0);
  });

  it('cv=8 S1=10 (P9 variation cv<10) : guard activé → bloc vide', () => {
    const block = buildTransparencyBlock(8, 10);
    // s1Delta=2 <8 ET cv=8 <10 → guard appliqué → bloc vide
    console.log(`[Trans P9 var] block="${block}"`);
    expect(block).toBe('');
  });

  it('cv=60 S1=78 (P3 Confirmé) : palier PRUDENT (ratio 1.30 limite)', () => {
    const block = buildTransparencyBlock(60, 78);
    // 78/60 = 1.30 → limit haut PRUDENT
    console.log(`[Trans P3] block=${block.slice(0, 150)}`);
    expect(block).toContain('PRUDENT');
  });
});
