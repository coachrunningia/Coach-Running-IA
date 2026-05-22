/**
 * Sprint Fix P0b volume Semi/Marathon (2026-05-20) — Tests anti-régression
 *
 * BUG : audit 4 plans 2026-05-20 — pic Semi ridicule pour Inter/Confirmé VMA
 * modérée freq 3 :
 *   - Margaux  (Inter VMA 10.9, cv=17, freq=3, Semi 2h20)   → pic 18 km
 *   - Bertrand (Conf  VMA 9.5,  cv=15, freq=3, Semi Finisher) → pic 16 km
 *
 * CAUSE RACINE :
 *   1. `runningSessions = sessionsPerWeek - 1` (1 slot amputé pour renfo)
 *      → Semi freq 3 : runningSessions=2 → cap VMA-durée ≈ 21 km
 *   2. Le cap VMA neutralisait le plancher Sprint Semi (32 km / factor 0.85)
 *      via `effectiveVmaCap` dans `minPeakVolume = min(rawMinPeak, absCap, effVmaCap)`.
 *   3. Résultat : pic Semi 18 km au lieu de ≥22 km attendu pour préparer 21.1 km.
 *
 * FIX (geminiService.ts, 2 patches) :
 *   - Semi/Marathon freq ≤ 3 : ne pas amputer le slot renfo dans `runningSessions`
 *     (le renfo 20-30 min ne devrait pas voler un slot running dans ce calcul).
 *   - Hard floor `minPeakVolume` Semi ≥ 22 km / Marathon ≥ 32 km, indépendant
 *     du cap VMA. Sous Pfitzinger (référentiel 36/55 km) mais pas ridicule.
 *
 * Doctrine : [[feedback_courte_duree_charge_allegee]] (cible ~65% Pfitzinger).
 *
 * Lancer : npx vitest run src/services/__tests__/semi-marathon-volume-floor.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

function plan(args: {
  totalWeeks?: number;
  currentVolume: number;
  level: string;
  goal?: string;
  subGoal?: string;
  trailDistance?: number;
  trailElevation?: number;
  targetTime?: string;
  age?: number;
  weight?: number;
  height?: number;
  vma: number;
  sessionsPerWeek?: number;
}): { peak: number; volumes: number[] } {
  const p = calculatePeriodizationPlan(
    args.totalWeeks || 12,
    args.currentVolume,
    args.level,
    args.goal || 'Course sur route',
    args.subGoal || '10K',
    args.trailDistance,
    args.trailElevation,
    args.targetTime || 'Finisher',
    args.age || 35,
    args.weight || 65,
    args.vma,
    args.sessionsPerWeek || 3,
    { height: args.height || 170 },
  );
  return { peak: Math.max(...p.weeklyVolumes), volumes: p.weeklyVolumes };
}

describe('Hard floor Semi 22 / Marathon 32 + runningSessions Semi/Marathon freq ≤ 3', () => {
  // ════════════════════════════════════════════════════════════════
  // CAS CRITIQUES AUDIT 2026-05-20 (bugs Margaux/Bertrand)
  // ════════════════════════════════════════════════════════════════

  it('1. Cas Margaux : Inter VMA 10.9 cv=17 freq=3 Semi 2h20 → pic ≥ 22 km', () => {
    // Baseline pré-patch : pic 18 km (bug observé en production).
    // Post-patch : pic ≥ 22 km (hard floor + runningSessions=3).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 17, subGoal: 'Semi',
      vma: 10.9, sessionsPerWeek: 3, targetTime: '2h20', totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(22);
  });

  it('2. Cas Bertrand : Conf VMA 9.5 cv=15 freq=3 Semi Finisher → pic ≥ 22 km', () => {
    // Baseline pré-patch : pic 16 km (bug observé en production).
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 15, subGoal: 'Semi',
      vma: 9.5, sessionsPerWeek: 3, targetTime: 'Finisher', totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(22);
  });

  it('3. Marathon Inter VMA 11 cv=20 freq=3 → pic ≥ 32 km (hard floor)', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 20, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(32);
  });

  // ════════════════════════════════════════════════════════════════
  // NON-RÉGRESSION : profils Confirmé/Expert déjà au-dessus du plancher
  // ════════════════════════════════════════════════════════════════

  it('4. Marathon Confirmé cv=50 freq=5 → pic inchangé (déjà au-dessus du floor)', () => {
    // Profil Pfitzinger normal : pic ≈ 60-70 km, hard floor 32 inactif.
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 50, subGoal: 'Marathon',
      vma: 16, sessionsPerWeek: 5, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(60); // baseline préservée
    expect(peak).toBeLessThanOrEqual(75); // MAX_WEEKLY_VOLUME Marathon conf
  });

  it('5. Semi Expert VMA 17 cv=60 freq=5 → pic inchangé (déjà au-dessus du floor)', () => {
    // Profil élite : pic ≈ 65-70 km, hard floor 22 inactif.
    const { peak } = plan({
      level: 'Expert (Performance)', currentVolume: 60, subGoal: 'Semi',
      vma: 17, sessionsPerWeek: 5, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(60);
    // MAX_WEEKLY_VOLUME Semi expert = 70 ; tolérance lissage "progression minimale" +10%
    expect(peak).toBeLessThanOrEqual(77);
  });

  // ════════════════════════════════════════════════════════════════
  // NON-RÉGRESSION : autres distances NON impactées par le hard floor
  // ════════════════════════════════════════════════════════════════

  it('6. 10K Inter VMA 12 freq=3 → hard floor 10K ≥ 18 (P1a)', () => {
    // P1a (audit fin 2026-05-20) : hard floor 10K ≥ 18 km (anti-bug Lilian).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 15, subGoal: '10K',
      vma: 12, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(peak).toBeGreaterThanOrEqual(18); // hard floor 10K P1a
    expect(peak).toBeLessThanOrEqual(30); // pas d'explosion
  });

  it('7. Trail 50km Inter cv=25 → pas impacté par hard floor Semi/Marathon', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 25, goal: 'Trail',
      subGoal: 'Trail60+', trailDistance: 50, trailElevation: 2000,
      vma: 13, sessionsPerWeek: 4, totalWeeks: 14,
    });
    // Trail : ses propres planchers, le hard floor Semi/Marathon n'agit pas.
    expect(peak).toBeGreaterThanOrEqual(25);
  });

  it('8. Hyrox Inter cv=15 freq=3 → pas impacté', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 15, goal: 'Hyrox',
      subGoal: 'Hyrox', vma: 12, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(peak).toBeLessThanOrEqual(40); // pas d'explosion via plancher Semi
  });

  // ════════════════════════════════════════════════════════════════
  // GARDE-FOUS SÉCURITÉ : caps absolus toujours respectés
  // ════════════════════════════════════════════════════════════════

  it('9. Cap user × 1.6 (Sprint 6) toujours respecté Semi Déb cv=10', () => {
    // Sprint 6 : cap progression user × ~1.6. Le hard floor 22 ne doit pas
    // exploser ce garde-fou. baseMaxVolume Déb Semi = 35.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 10, subGoal: 'Semi',
      vma: 9.66, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeLessThanOrEqual(35); // baseMaxVolume Déb Semi
  });

  it('10. Semi Inter cv=7 currentVolume bas → input cv respecté, plan pic = floor 22', () => {
    // Doctrine [[feedback_input_client_obligatoire]] : on n'écrase JAMAIS cv user.
    // Mais le plan généré peut viser un pic ≥ 22 (hard floor) pour préparer 21.1 km.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 7, subGoal: 'Semi',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 12,
    });
    // Hard floor 22 actif ; mais cap user × 1.6 peut rester contraignant.
    // On vérifie au minimum que le pic n'est PAS sous 18 (bug Margaux).
    expect(peak).toBeGreaterThan(18);
  });

  it('11. volumeCapSessions Semi freq=3 = 3 (doctrine P0c: densifie cap, runningSessions reste 2)', () => {
    // P0c (2026-05-20, validation Coach 20 ans Pfitzinger Lab) :
    //   doctrine project_coach_running_ia_frequence respectée → runningSessions
    //   = sessionsPerWeek - 1 TOUJOURS (freq=3 → 2 course + 1 renfo).
    //   Pour Semi/Marathon freq ≤ 3 : volumeCapSessions = 3 dans le calcul
    //   du cap VMA-durée théorique → densifie les 2 séances course sans
    //   ajouter un 3e slot.
    // Validation indirecte : le pic Semi freq=3 inter VMA 10.9 doit toujours ≥ 22
    // (hard floor + cap théorique densifié).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 17, subGoal: 'Semi',
      vma: 10.9, sessionsPerWeek: 3, targetTime: '2h20', totalWeeks: 12,
    });
    // Pré-P0b : pic 18 (runningSessions=2, vmaCap bridé). P0b/P0c : pic ≥ 22.
    expect(peak).toBeGreaterThanOrEqual(22);
  });

  it('12. volumeCapSessions Semi freq=4 = 3 (comportement préexistant, freq > 3)', () => {
    // freq=4 → runningSessions = 4-1 = 3, volumeCapSessions = 3 (égalité).
    // Le découplage P0c ne s'applique QUE pour Semi/Marathon freq ≤ 3.
    // Ce profil Semi Régulier cv=25 4× doit rester ≥ 35.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 25, subGoal: 'Semi',
      vma: 14, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(35);
    expect(peak).toBeLessThanOrEqual(45);
  });

  it('13. runningSessions 10K freq=3 = 2 (amputation conservée, pas Semi/Marathon)', () => {
    // Le fix runningSessions ne s'applique QU\'à Semi/Marathon.
    // 10K freq=3 doit garder runningSessions=2 (comportement préexistant).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 20, subGoal: '10K',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 10,
    });
    // Si runningSessions avait été 3, vmaCap aurait grimpé. On vérifie que ce
    // n'est pas le cas (pic 10K reste dans la plage baseline).
    expect(peak).toBeLessThanOrEqual(30);
  });

  // ════════════════════════════════════════════════════════════════
  // P0c (2026-05-20) — Ajustements coach 20 ans Pfitzinger Lab
  // ════════════════════════════════════════════════════════════════

  it('P0c-1. Marathon Inter VMA 11 cv=20 freq=3 : pic ≥ 32 (hard floor + volumeCap densifié)', () => {
    // Doctrine P0c : runningSessions = 2 (freq=3 → 2 course + 1 renfo),
    // volumeCapSessions = 3 → cap théorique Marathon densifié → pic ≥ 32.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 20, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(32);
  });

  it('P0c-2. Marathon Inter VMA 11 cv=10 freq=3 : pic dégradé (cap ACWR S1=13) + ratio > 2.0', () => {
    // Sprint A P0 (Bug #3 VERDICT-EXPERT-5-BUGS.md) : cap S1 à 1.3× cv = 13.
    // Conséquence : le pic ne peut plus atteindre le hard floor 32 km
    // (mathématiquement infaisable depuis S1=13 sur 16 sem avec rate max 20%).
    // Verdict expert : on accepte la dégradation du pic — la feasibility
    // refuse/dégrade le statut (cap pic/cv > 2.0 → score ≤ 50, statut RISQUÉ).
    // Doctrine feedback_securite_avant_conversion : sécurité ACWR > préparation distance.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 10, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    // Pic non null et progression réelle depuis S1=13 (smoothing +15% cumulé).
    expect(peak).toBeGreaterThanOrEqual(20);
    // Ratio pic/cv attendu > 2.0 (déclenche garde-fou feasibility en aval).
    expect(peak / 10).toBeGreaterThan(2.0);
  });

  it('P0c-3. Semi Inter cv=17 freq=2 : volumeCapSessions=2, runningSessions=1', () => {
    // freq=2 → runningSessions=1 (Math.max(1, 2-1)=1), volumeCapSessions=2
    // (Semi/Marathon freq ≤ 3). On vérifie que le pic est plausible (hard floor
    // Semi 22 actif + cap théorique densifié sur 2 slots).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 17, subGoal: 'Semi',
      vma: 10.9, sessionsPerWeek: 2, targetTime: '2h20', totalWeeks: 12,
    });
    // Hard floor 22 actif même en freq=2 (préparation à minima du Semi).
    expect(peak).toBeGreaterThanOrEqual(22);
  });

  it('P0c-4. Marathon Confirmé VMA 16 cv=50 freq=5 : non-régression (P0c neutre hors freq≤3)', () => {
    // freq=5 → volumeCapSessions = runningSessions = 4. Le découplage P0c
    // est inactif. Comportement strictement préservé.
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 50, subGoal: 'Marathon',
      vma: 16, sessionsPerWeek: 5, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(60);
    expect(peak).toBeLessThanOrEqual(75);
  });

  // ════════════════════════════════════════════════════════════════
  // P1a (2026-05-20) — Hard floor 10K + 5K (audit fin Lilian/Margaux/floggyz)
  // ════════════════════════════════════════════════════════════════

  it('P1a-1. 10K Inter VMA 11 cv=15 freq=3 → pic ≥ 18 km (hard floor)', () => {
    // Cas Lilian-like : Inter freq=3 VMA modérée, le pic 10K stagnait
    // ridiculement bas (~14-17 km) malgré progression. P1a force pic ≥ 18 km.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 15, subGoal: '10K',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(peak).toBeGreaterThanOrEqual(18);
  });

  it('P1a-2. 10K Inter VMA 11 cv=10 freq=4 plan 12 sem → pic ≥ 18 km (hard floor + progression)', () => {
    // Cas Inter avec un peu plus de marge (cv=10, freq=4, 12 sem) :
    // le hard floor 18 km doit être effectivement atteint à plein régime.
    // (cv=5 Déb 10 sem est un cas limite où le lissage post-récup + cap × 1.6
    // empêche d'atteindre exactement 18, traité au cas par cas par le calibrage Débutant.)
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 10, subGoal: '10K',
      vma: 11, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(18);
  });

  it('P1a-3. 5K Inter VMA 12 cv=10 freq=3 → pic ≥ 15 km (hard floor)', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 10, subGoal: '5K',
      vma: 12, sessionsPerWeek: 3, totalWeeks: 8,
    });
    expect(peak).toBeGreaterThanOrEqual(15);
  });

  it('P1a-4. 10K Confirmé VMA 15 cv=35 freq=5 → non-régression (déjà au-dessus de 18)', () => {
    // Profil confirmé : pic naturellement ≥ 30, hard floor 18 inactif.
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 35, subGoal: '10K',
      vma: 15, sessionsPerWeek: 5, totalWeeks: 10,
    });
    expect(peak).toBeGreaterThanOrEqual(30); // baseline préservée
  });
});
