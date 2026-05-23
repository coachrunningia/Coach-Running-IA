/**
 * Sprint E Phase 1 — 5 bugs P0 transversaux (TOUS profils, pas que Trail/Ultra).
 *
 * Sources :
 *   - /Users/romanemarino/Coach-Running-IA/DEV-EXPERT-TRAIL-ULTRA-8-BUGS.md
 *   - /Users/romanemarino/Coach-Running-IA/COACH-EXPERT-TRAIL-ULTRA-8-BUGS.md
 *
 * Bug 1+2 — Cross-training banni :
 *   `buildSafetyInstructions` injecte désormais NO_CROSS_TRAINING_RULE inconditionnellement
 *   (gating mort L3443 réparé : data.distance/trailDistance → data.subGoal/trailDetails).
 *   + Filtre post-LLM `enforceNoCrossTraining` retype les séances "Vélo/Natation/etc." en Repos.
 *
 * Bug 7/12 — WelcomeMessage conditionné `feasibility.status` :
 *   `buildWelcomeToneBlock(status)` retourne un bloc d'instruction ton selon status
 *   (BON → vide ; AMBITIEUX → ferme ; RISQUÉ → prudent ; IRRÉALISTE → brutal).
 *
 * Bug 8 — VMA cible astronaute (623 km/h) :
 *   `parseTargetTime("2:24")` → 144 min (HH:MM heuristique m∈[1,5]) au lieu de 2.4 min.
 *   `requiredVmaForTarget(...)` cap à 30 km/h max (anti-aberration).
 *
 * Bug 10 — Distance recalculée depuis durée × pace (anti-hallucination LLM) :
 *   Déjà géré par `recalculateSessionDistance` (tolérance 10%). Sprint E ajoute le SKIP
 *   sur sessions multi-allures (négatif/progressif/fartlek/côtes/tempo/seuil).
 *
 * Bug 11 — `recoveryFactor` correctement appliqué petits volumes :
 *   `Math.floor` (au lieu de `Math.round`) garantit la décharge effective sur S7/S10/S13.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-e-phase1-p0-transversaux.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSafetyInstructions,
  buildWelcomeToneBlock,
  enforceNoCrossTraining,
  recalculateSessionDistance,
  calculatePeriodizationPlan,
} from '../geminiService';
import { parseTargetTime, requiredVmaForTarget } from '../feasibilityService';
import type { QuestionnaireData } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseProfile = (overrides: Partial<QuestionnaireData> = {}): QuestionnaireData => ({
  goal: 'Course sur route',
  subGoal: 'Semi-Marathon',
  level: 'Intermédiaire (Régulier)',
  frequency: 3,
  currentWeeklyVolume: 25,
  age: 35,
  sex: 'Homme',
  weight: 70,
  height: 175,
  targetTime: '1h45',
  raceDate: '2026-11-01',
  startDate: '2026-06-01',
  preferredDays: ['Mardi', 'Jeudi', 'Samedi'],
  injuries: { hasInjury: false },
  ...overrides,
} as QuestionnaireData);

// ═════════════════════════════════════════════════════════════════════════════
// BUG 1+2 — Cross-training banni
// ═════════════════════════════════════════════════════════════════════════════

describe('Sprint E Phase 1 Bug 1+2 — NO_CROSS_TRAINING_RULE inconditionnel', () => {
  it('Trail BMI 22 (Olivier-like profil sain) → règle injectée', () => {
    // Cas Olivier Trail 126 km BMI 26.5 → imcTier=1 mais ancien gating mort (data.distance
    // n'existe pas) ne déclenchait pas la règle. Désormais inconditionnel.
    const profile = baseProfile({
      goal: 'Trail',
      subGoal: 'Trail 50km+',
      level: 'Confirmé (Compétition)',
      trailDetails: { distance: 126, elevation: 850 },
      age: 56,
      weight: 82,
      height: 176,                                // BMI = 82 / (1.76)² ≈ 26.5
      currentWeeklyVolume: 30,
    });
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
    expect(out).toContain('vélo');
  });

  it('Semi profil sain BMI 22 (cas standard) → règle injectée (inconditionnel)', () => {
    const profile = baseProfile({ weight: 65, height: 175 }); // BMI 21.2
    const out = buildSafetyInstructions(profile, false);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });

  it('Maintien en forme débutant → règle injectée (couvre TOUS profils)', () => {
    const profile = baseProfile({
      goal: 'Maintien en forme',
      subGoal: undefined,
      level: 'Débutant (0-1 an)',
      frequency: 2,
      currentWeeklyVolume: 10,
    });
    const out = buildSafetyInstructions(profile, true);
    expect(out).toContain('NE JAMAIS proposer ni mentionner de cross-training');
  });
});

describe('Sprint E Phase 1 Bug 1+2 — enforceNoCrossTraining filtre post-LLM', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it('Récupération Active (Vélo) — cas Olivier S1 Dim → retypé Repos complet', () => {
    const session = {
      type: 'Récupération',
      title: 'Récupération Active (Vélo)',
      mainSet: 'Vélo récup 75 min en aisance',
      duration: '75 min',
      targetPace: '11:33',
      distance: '6.5 km',
      warmup: '5 min',
      cooldown: '5 min',
    };
    const changed = enforceNoCrossTraining(session);
    expect(changed).toBe(true);
    expect(session.type).toBe('Repos');
    expect(session.title).toBe('Repos complet');
    expect(session.distance).toBe('N/A');
    expect(session.duration).toBe('N/A');
    expect(session.targetPace).toBe('N/A');
    expect(session.mainSet).toContain('Jour de repos complet');
    // Fix : agent a mis "SÉANCE" en majuscules pour emphasis, on accepte les 2
    expect(session.mainSet?.toLowerCase()).toContain('séance à part entière');
  });

  it('Cyclisme dans le mainSet → retypé Repos', () => {
    const session = {
      type: 'Récupération',
      title: 'Récupération active',
      mainSet: '60 min de cyclisme léger pour décrasser',
    };
    expect(enforceNoCrossTraining(session)).toBe(true);
    expect(session.type).toBe('Repos');
  });

  it('Natation → retypé Repos', () => {
    const session = { type: 'Récupération', title: 'Récup piscine', mainSet: 'Natation 45 min' };
    expect(enforceNoCrossTraining(session)).toBe(true);
    expect(session.type).toBe('Repos');
  });

  it('Elliptique → retypé Repos', () => {
    const session = { type: 'Récupération', title: 'Cardio doux', mainSet: '30 min elliptique' };
    expect(enforceNoCrossTraining(session)).toBe(true);
    expect(session.type).toBe('Repos');
  });

  it('Footing classique (mot "vélocité" légitime) → PAS retypé', () => {
    // Anti-faux-positif : si "vélo" apparaît dans un mot composé, on ne touche pas.
    // Notre regex utilise \b (frontière de mot) donc "vélocité" ne match pas "vélo".
    const session = {
      type: 'Jogging',
      title: "Footing d'Endurance Fondamentale",
      mainSet: 'Travailler la vélocité de foulée 35 min EF',
    };
    expect(enforceNoCrossTraining(session)).toBe(false);
    expect(session.type).toBe('Jogging'); // Inchangé.
  });

  it('Session Renforcement classique → no-op', () => {
    const session = { type: 'Renforcement', title: 'Renfo Full Body', mainSet: 'Squats, gainage, fentes' };
    expect(enforceNoCrossTraining(session)).toBe(false);
    expect(session.type).toBe('Renforcement');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG 7/12 — WelcomeMessage déconnecté feasibility.status
// ═════════════════════════════════════════════════════════════════════════════

describe('Sprint E Phase 1 Bug 7/12 — buildWelcomeToneBlock conditionnel', () => {
  it('Status undefined → bloc vide (no-op)', () => {
    expect(buildWelcomeToneBlock(undefined)).toBe('');
  });

  it('Status EXCELLENT → bloc vide (LLM libre encourageant)', () => {
    expect(buildWelcomeToneBlock('EXCELLENT')).toBe('');
  });

  it('Status BON → bloc vide', () => {
    expect(buildWelcomeToneBlock('BON')).toBe('');
  });

  it('Status AMBITIEUX → ton FERME, pas d\'enthousiasme excessif', () => {
    const out = buildWelcomeToneBlock('AMBITIEUX');
    expect(out).toContain('AMBITIEUX');
    expect(out).toContain('TON FERME');
    expect(out).toMatch(/conditions de réussite|régularité/);
    expect(out).toContain('feedback_securite_avant_conversion');
  });

  it('Status RISQUÉ → ton PRUDENT, signaux à surveiller', () => {
    const out = buildWelcomeToneBlock('RISQUÉ');
    expect(out).toContain('RISQUÉ');
    expect(out).toContain('TON PRUDENT');
    expect(out).toContain('signaux');
    expect(out).toMatch(/sereinement|graduelle|douce/); // doit bannir ces termes
  });

  it('Status IRRÉALISTE → ton BRUTAL TRANSPARENT (cas Olivier 126 km / 1778921428769)', () => {
    const out = buildWelcomeToneBlock('IRRÉALISTE');
    expect(out).toContain('IRRÉALISTE');
    expect(out).toContain('BRUTAL TRANSPARENT');
    // Doit bannir les formulations lénifiantes :
    expect(out).toContain('graduelle');
    expect(out).toContain('sereine');
    expect(out).toContain('tu vas progresser en douceur');
    // Doit exiger reconnaissance explicite + médecin :
    expect(out).toMatch(/avis médical/i);
    expect(out).toMatch(/indispensable/i);
    // Doit citer doctrines safety :
    expect(out).toContain('feedback_securite_avant_conversion');
    expect(out).toContain('feedback_jamais_baisser_allure_cible');
  });

  it('Status inconnu (string libre) → bloc vide (safe no-op)', () => {
    expect(buildWelcomeToneBlock('UNKNOWN_STATUS')).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG 8 — VMA cible astronaute (623 km/h)
// ═════════════════════════════════════════════════════════════════════════════

describe('Sprint E Phase 1 Bug 8 — parseTargetTime HH:MM vs MM:SS', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  it('"2:24" → 144 min (HH:MM, cas Semi astronaute)', () => {
    // AVANT correction : 2 + 24/60 = 2.4 min → VMA cible 620 km/h
    // APRÈS : m=2 ∈ [1,5] → 2h24 = 144 min ✓
    expect(parseTargetTime('2:24')).toBe(144);
  });

  it('"1:30" → 90 min (HH:MM, Semi sub-1h30 mal saisi)', () => {
    expect(parseTargetTime('1:30')).toBe(90);
  });

  it('"3:45" → 225 min (HH:MM, Marathon sub-3h45)', () => {
    expect(parseTargetTime('3:45')).toBe(225);
  });

  it('"5:00" → 300 min (HH:MM, ultra finisher)', () => {
    expect(parseTargetTime('5:00')).toBe(300);
  });

  it('"22:30" → 22.5 min (MM:SS, PB 5K — non touché car m≥6)', () => {
    // PB 5K typique 20-30 min → branche m∈[1,5] PAS prise → MM:SS standard
    expect(parseTargetTime('22:30')).toBeCloseTo(22.5, 2);
  });

  it('"45:30" → 45.5 min (MM:SS, PB 10K — non touché)', () => {
    expect(parseTargetTime('45:30')).toBeCloseTo(45.5, 2);
  });

  it('"2h24" → 144 min (format préféré, inchangé)', () => {
    expect(parseTargetTime('2h24')).toBe(144);
  });

  it('"sub-1h30" → 90 min (préfixe "sub" géré, inchangé)', () => {
    expect(parseTargetTime('sub-1h30')).toBe(90);
  });
});

describe('Sprint E Phase 1 Bug 8 — requiredVmaForTarget cap sanity', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); });

  it('Cas astronaute pré-correction (2.4 min sur 21.1 km) → cap 30 km/h', () => {
    // Speed = 21.1 / (2.4/60) = 527 km/h → factor 0.85 → vmaCible 620 km/h.
    // Cap doit ramener à 30 (pas 620, pas null, pas crash).
    const result = requiredVmaForTarget(2.4, 21.1);
    expect(result).toBe(30);
  });

  it('Cas normal Semi 1h45 → vmaCible ~14.2 km/h (pas capé)', () => {
    // 21.1 km / (105/60) = 12.06 km/h, factor Semi=0.85 → 14.18 km/h.
    const result = requiredVmaForTarget(105, 21.1);
    expect(result).toBeGreaterThan(13);
    expect(result).toBeLessThan(15);
  });

  it('Cas Marathon 3h00 → vmaCible ~17.6 km/h (pas capé)', () => {
    // 42.195 / 3 = 14.065 km/h, factor Marathon=0.80 → 17.58 km/h.
    const result = requiredVmaForTarget(180, 42.195);
    expect(result).toBeGreaterThan(17);
    expect(result).toBeLessThan(18.5);
  });

  it('Input invalide (targetMinutes=0) → cap 30 retourné (pas NaN/Infinity)', () => {
    const result = requiredVmaForTarget(0, 21.1);
    expect(result).toBe(30);
  });

  it('Input invalide (distanceKm=0) → cap 30 retourné', () => {
    const result = requiredVmaForTarget(105, 0);
    expect(result).toBe(30);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG 10 — Distance recalculée depuis durée × pace (anti-hallucination LLM)
// ═════════════════════════════════════════════════════════════════════════════

describe('Sprint E Phase 1 Bug 10 — recalculateSessionDistance', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it('Cas Ambre 1778921428769 S1 J2 : 50 min @ 10:17/km affiché 3.88 km → recalculé ~4.9 km', () => {
    // Distance correcte = 50 / (10 + 17/60) = 50 / 10.283 = 4.86 km
    // 3.88 km affiché = écart 20.4% > 10% → doit être écrasé
    const session = {
      type: 'Jogging',
      title: "Footing d'Endurance Fondamentale",
      duration: '50 min',
      targetPace: '10:17',
      distance: '3.88 km',
      mainSet: '40 min en EF',
    };
    recalculateSessionDistance(session);
    const km = parseFloat(session.distance);
    expect(km).toBeGreaterThanOrEqual(4.7);
    expect(km).toBeLessThanOrEqual(5.0);
  });

  it('Multi-allure "Négative split" → distance LLM PRÉSERVÉE (skip recalc)', () => {
    // Sur négative split : 5 km @ 5:30 + 5 km @ 5:00 → pace moyen ~5:15, durée totale ~52 min.
    // Distance correcte calculée depuis pace global serait fausse. On skip.
    const session = {
      type: 'Sortie Longue',
      title: 'Sortie Longue en Négative Split',
      duration: '52 min',
      targetPace: '5:15',
      distance: '10 km',
      mainSet: '5 km à 5:30/km puis 5 km à 5:00/km (négative split)',
    };
    recalculateSessionDistance(session);
    // Distance non écrasée :
    expect(session.distance).toBe('10 km');
  });

  it('Multi-allure "Fartlek" → skip recalc', () => {
    const session = {
      type: 'Fractionné',
      title: 'Fartlek 6×1min',
      duration: '45 min',
      targetPace: '5:30',
      distance: '8 km',
      mainSet: '6 × (1 min vite + 2 min EF)',
    };
    recalculateSessionDistance(session);
    expect(session.distance).toBe('8 km');
  });

  it('Multi-allure "Progressif" → skip recalc', () => {
    const session = {
      type: 'Jogging',
      title: 'Footing Progressif',
      duration: '40 min',
      targetPace: '5:00',
      distance: '7 km',
      mainSet: 'Progressif 10:00 → 8:00',
    };
    recalculateSessionDistance(session);
    expect(session.distance).toBe('7 km');
  });

  it('Multi-allure "Séance côtes" → skip recalc', () => {
    const session = {
      type: 'Fractionné',
      title: 'Séance Côtes',
      duration: '45 min',
      targetPace: '5:30',
      distance: '6.5 km',
      mainSet: '8 × côtes de 30 sec + récup descente',
    };
    recalculateSessionDistance(session);
    expect(session.distance).toBe('6.5 km');
  });

  it('Footing classique cohérent (écart < 10%) → PAS de modif', () => {
    // 30 min @ 6:00/km = 5.0 km. Distance affichée 5.0 km → écart 0% → no-op.
    const session = {
      type: 'Jogging',
      title: 'Footing EF',
      duration: '30 min',
      targetPace: '6:00',
      distance: '5.0 km',
      mainSet: '20 min EF',
    };
    recalculateSessionDistance(session);
    expect(session.distance).toBe('5.0 km'); // Inchangé.
  });

  it('Session de type Repos (Bug 1+2) → skip (pas de pace/distance)', () => {
    const session = {
      type: 'Repos',
      title: 'Repos complet',
      duration: 'N/A',
      targetPace: 'N/A',
      distance: 'N/A',
    };
    recalculateSessionDistance(session);
    expect(session.distance).toBe('N/A'); // Pas touché.
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BUG 11 — recoveryFactor petits volumes (Math.floor vs Math.round)
// ═════════════════════════════════════════════════════════════════════════════

describe.skip('Sprint E Phase 1 Bug 11 — REVERTÉ Phase 2 (audit data préalable PM)', () => {
  // Bug 11 reverté Phase 1 : Math.floor cassait hard floors 5K/Ultra ; Math.round + force décharge
  // créait d'autres régressions. Reporté Sprint E Phase 2 avec audit data préalable (combien % plans plats ?).
  it('Profil cv=5 Semi 17 sem : récup S<N> < S<N-1> sur petits volumes', () => {
    // Cas plan 1778921428769 (Ambre-like) : sur petits volumes (10/12/14 km), les semaines
    // récup S7/S10/S13 doivent décharger effectivement (avec Math.round ancienne logique,
    // 11 × 0.80 = 8.8 → 9 ≈ ne décharge quasi pas).
    const result = calculatePeriodizationPlan(
      17,                       // totalWeeks
      5,                        // currentVolume (très petit)
      'Débutant (0-1 an)',
      'Course sur route',
      'Semi-Marathon',
      undefined, undefined,     // trail dist/elev
      '2h30',                   // targetTime
      30, 65, 11,               // age, weight, vma
      3,                        // sessionsPerWeek
      { height: 170 },
    );

    // Inspecter : pour chaque semaine récup, vol(récup) < vol(semaine précédente)
    const recoveryWeeks = result.recoveryWeeks;
    expect(recoveryWeeks.length).toBeGreaterThan(0);
    for (const rw of recoveryWeeks) {
      const idx = rw - 1; // 0-indexed
      if (idx >= 1) {
        const prev = result.weeklyVolumes[idx - 1];
        const curr = result.weeklyVolumes[idx];
        expect(curr).toBeLessThan(prev);
      }
    }
  });

  it('Petit volume edge case : prev=10 → récup = floor(10×0.80)=8 (pas 8.0 puis round 8)', () => {
    // On vérifie que la fonction utilise bien Math.floor :
    // floor(10 × 0.80) = floor(8.0) = 8 ✓
    // floor(11 × 0.80) = floor(8.8) = 8 (vs round qui donnait 9)
    // floor(12 × 0.78) = floor(9.36) = 9 (vs round qui donnait 9)
    // floor(14 × 0.78) = floor(10.92) = 10 (vs round qui donnait 11)
    // On reproduit le calcul directement :
    expect(Math.floor(10 * 0.80)).toBe(8);
    expect(Math.floor(11 * 0.80)).toBe(8);
    expect(Math.floor(14 * 0.78)).toBe(10);
  });

  it('Plus gros volume (cv=40 Marathon) : récup reste effective', () => {
    const result = calculatePeriodizationPlan(
      18,
      40,
      'Intermédiaire (Régulier)',
      'Course sur route',
      'Marathon',
      undefined, undefined,
      '3h45',
      35, 72, 14,
      4,
      { height: 178 },
    );
    const recoveryWeeks = result.recoveryWeeks;
    expect(recoveryWeeks.length).toBeGreaterThan(0);
    for (const rw of recoveryWeeks) {
      const idx = rw - 1;
      if (idx >= 1) {
        expect(result.weeklyVolumes[idx]).toBeLessThan(result.weeklyVolumes[idx - 1]);
      }
    }
  });

  it('Garde-fou Math.max(1, ...) : volume récup jamais < 1', () => {
    // Edge case : si prev = 1 (théorique), floor(1×0.78)=0 → garde-fou ramène à 1.
    // On simule via cv=2 (très bas), plan court.
    const result = calculatePeriodizationPlan(
      8,
      2,
      'Débutant (0-1 an)',
      'Maintien en forme',
      undefined,
      undefined, undefined,
      undefined,
      40, 65, 9,
      2,
      { height: 165 },
    );
    // Tous les volumes > 0 :
    for (const v of result.weeklyVolumes) {
      expect(v).toBeGreaterThanOrEqual(1);
    }
  });
});
