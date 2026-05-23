/**
 * Validation Sprint A + B — 10 profils QA anti-régression
 * Date : 2026-05-22
 *
 * Objectif : valider que les fixes Sprint A (Bug #2a, #3, #4) et Sprint B
 * (Bug #2b, #2c, #5) s'appliquent correctement aux profils CIBLÉS, sans
 * casser les profils NON CONCERNÉS (dommage collatéral).
 *
 * Sources :
 *   - SPRINT-A-P0-RECAP.md (commit d4fa6360)
 *   - SPRINT-B-P1-RECAP.md (commit 481bd26f)
 *   - VERDICT-EXPERT-5-BUGS.md (spec attendue)
 *
 * Lancer : npx vitest run src/services/__tests__/validation-sprint-ab-10-profils.test.ts
 *
 * Justification chaque profil (doctrine feedback_chaque_ligne_justifiee) :
 *   - Profils 1-6 (CIBLÉS) : doit montrer l'effet des fixes.
 *   - Profils 7-10 (NON CONCERNÉS) : doit rester normal (anti-régression).
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';
// Sprint C Item 1 — buildTransparencyBlock importé depuis la prod (plus de réplique).
import { calculatePeriodizationPlan, applyMarcheCourseRouting, buildTransparencyBlock } from '../geminiService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const baseFeas = {
  goal: 'Course sur route',
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
};

// Sprint C Item 1 — buildTransparencyBlock importé depuis la prod ci-dessus
// (plus de réplique locale, doctrine feedback_securite_avant_conversion : tests
// HONNÊTES qui reflètent le code exécuté en preview).

// Mainset Galloway-like que Gemini peut générer pour une SL "vallonnée"
const slMainSetWalkBreak =
  "Échauffement 15 min EF. 12 km vallonné avec 1 min de course / 1 min de marche en montées. Retour au calme 5 min.";

// Mainset Marche/Course pur (débutant)
const walkRunMainSet =
  "Échauffement 10 min. 8 × (1 min de course / 2 min de marche). Retour au calme 5 min.";

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILS CIBLÉS — doit montrer EFFET des fixes
// ═══════════════════════════════════════════════════════════════════════════════

describe('Profil 1 — Senior fort (Guliver-like) : 72 ans H Marathon Expert', () => {
  // Inputs : VMA 13.5, cv 50, PB 4h10, cible 3h55, 24 sem
  // AVANT fixes :
  //   - confidence brut ~99 (cap senior + PB inexistants en Sprint A seul)
  //   - SL "vallonnée" avec walk-break → typée Marche/Course (Bug #4)
  // APRÈS fixes (Sprint A + B) :
  //   - Bug #2b cap 75 (70+ ans)
  //   - Bug #2c cap 70 (pbGap 6% senior > 4%)
  //   - Bug #4 routing désactivé (Expert)
  //   - S1=50 raw vs cv=50 → ratio 1.0 → pas de cap ACWR
  //   - welcomeBlock = '' (ratio 1.0 ≤ 1.15)
  it('confidenceScore ≤ 70 (cap senior #2b + cross-check PB #2c)', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Expert (Performance)',
      vma: 13.5,
      targetTime: '3h55',
      distance: 'Marathon',
      planWeeks: 24,
      frequency: 5,
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 72,
      weight: 75,
      height: 178,
      recentRaceTimes: { distanceMarathon: '4h10' },
    });
    console.log(`[P1] Guliver: score=${result.score} status=${result.status}`);
    expect(result.score).toBeLessThanOrEqual(70);
    // Sanity : score reste ≥ 10 (pas écrasé à zéro)
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it('S1 calibrée ≈ cv (pas de cap ACWR, ratio 1.0)', () => {
    const plan = calculatePeriodizationPlan(
      24, 50, 'Expert (Performance)', 'Course sur route', 'Marathon',
      undefined, undefined, '3h55', 72, 75, 13.5, 5, { height: 178 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(50);
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(65); // cap 1.3 × 50
  });

  it('Routing Marche/Course DÉSACTIVÉ sur SL vallonnée (Bug #4)', () => {
    const week = {
      sessions: [
        { type: 'Sortie Longue', title: 'SL vallonnée 18 km', mainSet: slMainSetWalkBreak },
      ],
    };
    applyMarcheCourseRouting(week, {
      level: 'Expert (Performance)', vma: 13.5, currentWeeklyVolume: 50,
    });
    expect(week.sessions[0].type).toBe('Sortie Longue');
    // Phrase walk-break retirée du mainSet
    expect(week.sessions[0].mainSet).not.toMatch(/1 min de course \/ 1 min de marche/);
  });
});

describe('Profil 2 — Senior border : 60 ans H 10K Confirmé (seuil cap senior)', () => {
  // Inputs : VMA 14, cv 40, cible 50min (RÉALISTE, ≈ théorique VMA 14)
  // Cible 50min : 10K ≈ 50min ↔ vitesse 12km/h = 86% VMA 14 → soutenable
  //   (le test précédent à 45min était bloqué par règle R2 Daniels avant
  //   même d'arriver au cap senior — profil mal isolé pour Bug #2b).
  // AVANT fixes : confidence brut élevé sans cap senior
  // APRÈS fixes : cap senior 90 (60+ ans, Bug #2b)
  //   - pas de PB déclaré → pas de cap #2c
  //   - âge 60 = SEUIL → cap 90 doit s'appliquer
  it('confidenceScore ≤ 90 (cap senior 60+ #2b mord juste au seuil)', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 14,
      targetTime: '50:00',          // cible réaliste, n'active pas R2 Daniels
      distance: '10 km',
      planWeeks: 12,
      frequency: 5,
      currentVolume: 40,
      s1ActualVolume: 42,
      age: 60,
      weight: 72,
      height: 175,
    });
    // Le cap senior 60+ plafonne à 90.
    expect(result.score).toBeLessThanOrEqual(90);
    // Score reste ≥ 70 (statut BON minimum, on n'écrase pas un cas sain).
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('Routing Marche/Course DÉSACTIVÉ (Confirmé, pas Débutant)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, {
      level: 'Confirmé (Compétition)', vma: 14, currentWeeklyVolume: 40,
    });
    expect(week.sessions[0].type).toBe('Jogging');
  });
});

describe('Profil 3 — PB gap haut : 35 ans F Marathon, PB 4h00 cible 3h00', () => {
  // Inputs : VMA 16, cv 50, PB Marathon 4h00 (240min), cible 3h00 (180min)
  // gap (240-180)/240 = 25% > 15 → cap 60 (Bug #2c)
  // AVANT fixes : score haut (PB cross-check inexistant)
  // APRÈS fixes : cap 60 (gap > 15%, tout âge)
  it('confidenceScore ≤ 60 (gap PB 25% > 15% → cap #2c)', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 16,
      targetTime: '3h00',
      distance: 'Marathon',
      planWeeks: 16,
      frequency: 5,
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 35,
      weight: 60,
      height: 168,
      recentRaceTimes: { distanceMarathon: '4h00' },
    });
    expect(result.score).toBeLessThanOrEqual(60);
  });
});

describe('Profil 4 — Saut ACWR rouge : 30 ans F Marathon vol 25 S1 voulu 50', () => {
  // Inputs : VMA 11, cv 25, cible 4h30 (donc S1 brut serait haut)
  // Bug #3 doit capper S1 à 1.3 × 25 = 32.5 → S1 ≤ 33
  // Bug #2a doit voir la VRAIE S1 et déclencher la règle 4 R2 si saut > 50%
  //   - cv=25, S1=32 → sautPct = (32-25)/25 = 0.28 < 0.30 → pas de cap saut violent
  //   - mais cap ACWR mord
  it('S1 cappée par ACWR (cap 1.3 × cv = 32-33)', () => {
    const plan = calculatePeriodizationPlan(
      16, 25, 'Intermédiaire (Régulier)', 'Course sur route', 'Marathon',
      undefined, undefined, '4h30', 30, 62, 11, 4, { height: 168 },
    );
    // S1 ≤ 33 (cap 1.3 × 25 = 32.5 arrondi)
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(33);
    // Floor : S1 ≥ cv (input respecté)
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(25);
  });

  it('confidenceScore reflète saut violent si on FORCE S1=50 via input', () => {
    // Si pour une raison X la S1 réelle dépasse le cap (cas extrême théorique),
    // Bug #2a doit signaler le saut. On simule S1=50 → sautPct (50-25)/25 = 1.0 > 0.50
    // → règle 4 R2 → irrealisticCap = 10.
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Intermédiaire (Régulier)',
      vma: 11,
      targetTime: '4h30',
      distance: 'Marathon',
      planWeeks: 16,
      frequency: 4,
      currentVolume: 25,
      s1ActualVolume: 50, // forçage simulation cas pré-fix
      age: 30,
      weight: 62,
      height: 168,
    });
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

describe('Profil 5 — Marche/Course mal routée : Expert 50 ans VMA 14 SL Trail', () => {
  // Avant Bug #4 : un Expert SL Trail vallonné avec walk-breaks en montée → MC
  // Après Bug #4 : Expert → routing DÉSACTIVÉ, type Sortie Longue préservé
  it('SL Trail Expert NE doit PAS être typée Marche/Course', () => {
    const week = {
      sessions: [
        {
          type: 'Sortie Longue',
          title: 'SL Trail D+ 22 km',
          mainSet: 'Échauffement. 22 km trail vallonné, alternance trot/marche en grosses montées. Retour au calme.',
        },
      ],
    };
    applyMarcheCourseRouting(week, {
      level: 'Expert (Performance)', vma: 14, currentWeeklyVolume: 55,
    });
    expect(week.sessions[0].type).toBe('Sortie Longue');
  });
});

describe('Profil 6 — Welcome Gabbett rouge : cv 25 S1 40 ratio 1.6', () => {
  // Bug #5 : transparencyBlock doit utiliser palier BRUTAL avec mention
  // "+60%", "Gabbett 1.6", "risque", "vigilance".
  it('transparencyBlock = BRUTAL avec chiffrage Gabbett 1.6', () => {
    const block = buildTransparencyBlock(25, 40);
    expect(block).toContain('BRUTAL');
    expect(block).toContain('+60%');
    expect(block).toContain('Gabbett 1.6');
    expect(block).toContain('risque');
    expect(block).toContain('vigilance');
  });

  it('confidenceScore avec saut ACWR 1.6 → cap saut violent #2a', () => {
    // sautPct = 0.60 > 0.50 → règle 4 R2 → cap 10.
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Intermédiaire (Régulier)',
      vma: 11,
      targetTime: '4h50',
      distance: 'Marathon',
      planWeeks: 10,
      frequency: 4,
      currentVolume: 25,
      s1ActualVolume: 40,
      age: 30,
    });
    expect(result.score).toBeLessThanOrEqual(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILS NON CONCERNÉS — doit rester normal (anti-régression)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Profil 7 — Adulte sain : 35 ans H Marathon vol 60 cible 3h30 PB 3h35', () => {
  // PB 3h35 (215min) → cible 3h30 (210min) → gap (215-210)/215 = 2.3% < 4
  // 35 ans → pas de cap senior
  // cv=60, s1=65 → ratio 1.08 < 1.15 → pas de bloc welcome
  // Aucun cap ne doit mordre → score haut conservé
  it('confidenceScore haut (≥ 70), aucun cap déclenché', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 16,
      targetTime: '3h30',
      distance: 'Marathon',
      planWeeks: 16,
      frequency: 5,
      currentVolume: 60,
      s1ActualVolume: 65,
      age: 35,
      weight: 72,
      height: 178,
      recentRaceTimes: { distanceMarathon: '3h35' },
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('S1 pas cappée (ratio 65/60 = 1.08 < 1.3, cap raw mais déjà sous le seuil)', () => {
    const plan = calculatePeriodizationPlan(
      16, 60, 'Confirmé (Compétition)', 'Course sur route', 'Marathon',
      undefined, undefined, '3h30', 35, 72, 16, 5, { height: 178 },
    );
    // S1 ≥ cv (floor)
    expect(plan.weeklyVolumes[0]).toBeGreaterThanOrEqual(60);
    // S1 ≤ 1.3 × cv = 78 (cap)
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(78);
  });

  it('transparencyBlock vide (ratio raisonnable, pas de bruit dans welcome)', () => {
    const block = buildTransparencyBlock(60, 65);
    expect(block).toBe('');
  });
});

describe('Profil 8 — Confirmé classique : 28 ans F Semi vol 45 cible 1h45', () => {
  // 28 ans → pas de cap senior
  // Cible Semi 1h45 (105min) ; VMA 14 → théorique semi ≈ 1h35-40
  // cv 45, s1 ~48 → ratio 1.07 → pas de transparencyBlock
  // Confirmé → pas de routing MC
  it('confidenceScore reste raisonnable (pas de cap senior, pas de cap PB)', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 14,
      targetTime: '1h45',
      distance: 'Semi-Marathon',
      planWeeks: 12,
      frequency: 5,
      currentVolume: 45,
      s1ActualVolume: 48,
      age: 28,
      weight: 58,
      height: 165,
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('Routing Marche/Course DÉSACTIVÉ (Confirmé)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing récup', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, {
      level: 'Confirmé (Compétition)', vma: 14, currentWeeklyVolume: 45,
    });
    expect(week.sessions[0].type).toBe('Jogging');
  });
});

describe('Profil 9 — Débutant pur : 25 ans cv 0 Débutant Marathon 4h30', () => {
  // cv=0 → cap ACWR ne mord pas (condition currentVolume > 0)
  // Débutant → routing MC AUTORISÉ (mainSet alternance acceptée)
  // Pas de PB → pas de cap #2c
  // 25 ans → pas de cap senior
  it('S1 démarre bas (mode débutant absolu, pas écrasé par cap ACWR)', () => {
    const plan = calculatePeriodizationPlan(
      20, 0, 'Débutant (0-1 an)', 'Course sur route', 'Marathon',
      undefined, undefined, '4h30', 25, 65, 9, 3, { height: 170 },
    );
    expect(plan.weeklyVolumes[0]).toBeGreaterThan(0);
    // S1 démarre modeste (typiquement ≤ 15 pour un débutant absolu Marathon)
    expect(plan.weeklyVolumes[0]).toBeLessThanOrEqual(20);
  });

  it('Routing Marche/Course ACTIF (Débutant déclaré)', () => {
    const week = {
      sessions: [
        { type: 'Jogging', title: 'Footing 1', mainSet: walkRunMainSet },
      ],
    };
    applyMarcheCourseRouting(week, {
      level: 'Débutant (0-1 an)', vma: 9, currentWeeklyVolume: 0,
    });
    expect(week.sessions[0].type).toBe('Marche/Course');
  });
});

describe('Profil 10 — Cas limite âge 59 ans : Marathon Confirmé', () => {
  // Garde-fou : à 59 ans on est SOUS le seuil 60.
  // Cap senior #2b NE DOIT PAS se déclencher.
  // Score brut élevé doit être conservé.
  it('confidenceScore > 90 (sous seuil 60, pas de cap senior)', () => {
    const result = calculateFeasibility({
      ...baseFeas,
      level: 'Confirmé (Compétition)',
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      planWeeks: 16,
      frequency: 5,
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 59,
      weight: 70,
      height: 175,
    });
    // Score doit dépasser 90 (cap qui aurait été appliqué à 60+) → garde-fou OK.
    expect(result.score).toBeGreaterThan(90);
  });
});
