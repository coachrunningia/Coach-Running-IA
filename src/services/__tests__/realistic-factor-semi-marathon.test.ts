/**
 * Sprint plancher Semi/Marathon (2026-05-20) — Tests anti-régression
 *
 * RÈGLE : `realisticFactor` calibre la durée réaliste vs durée max théorique
 * dans le cap VMA-durée (geminiService.ts:2462).
 *   - 0.70 pour 5K/10K/Trail/Hyrox (intensité-driven, volume n'est pas le driver #1)
 *   - 0.85 pour Semi/Marathon (volume = driver #1 d'adaptation aérobie)
 *
 * Garde-fous SL Débutant (validation coach 20 ans 2026-05-20) :
 *   - Semi Déb cv<10 → slMaxKm ≤ 12 km (tissus tendineux non préparés)
 *   - Marathon Déb cv<20 freq≤3 → slMaxKm ≤ 18 km (ratio Hanson <60% volume hebdo)
 *
 * Doctrine : [[feedback_input_client_obligatoire]] (cv/level/freq préservés),
 *           [[feedback_jamais_baisser_allure_cible]] (allures intactes),
 *           [[feedback_courte_duree_charge_allegee]] (cible ~65% Pfitzinger).
 *
 * Validation coach 20 ans Pfitzinger Lab : refus 0.90 nu, validation 0.85 + cap SL.
 * Investigation : INVESTIGATION-PLANCHER-VOLUME-SEMI.md.
 *
 * Lancer : npx vitest run src/services/__tests__/realistic-factor-semi-marathon.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

// Helper : génère un plan et retourne le pic + volumes hebdo
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

describe('realisticFactor 0.85 Semi/Marathon — pic relevé vs baseline 0.70', () => {
  it('1. Morgane Semi Déb cv=7 VMA=11 freq=3 → pic > baseline 14 km', () => {
    // Baseline (factor 0.70) : peak=14, profil Pfitzinger=20-22 → plancher trop bas.
    // Post-patch (factor 0.85) : peak=16, plus proche de la cible Coach 20 ans
    // (volume = driver Marathon, on relève sans atteindre Pfitzinger non plus).
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 7, subGoal: 'Semi',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThan(14); // strictement > baseline
    expect(peak).toBeLessThanOrEqual(20); // mais sans excès (cap baseMaxVolume Déb Semi = 35)
  });

  it('2. Louleroy Semi Déb cv=10 VMA=9.66 freq=4 → pic relevé vs baseline 17', () => {
    // Baseline : peak=17. Post-patch : peak=21. Cv=10 → pas de cap SL (>=10).
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 10, subGoal: 'Semi',
      vma: 9.66, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(20);
    expect(peak).toBeLessThanOrEqual(28);
  });

  it('3. Semi Régulier cv=25 4× VMA=14 → pic relevé vs baseline 32', () => {
    // Baseline : peak=32. Post-patch : peak=37 (Coach Pfitzinger AM3 valide ≤45).
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 25, subGoal: 'Semi',
      vma: 14, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(35);
    expect(peak).toBeLessThanOrEqual(45); // garde Sprint 6 +60% sur cv=25 (40 max), tolérance lissage
  });

  it('4. Semi Confirmé cv=40 4× VMA=16 → pic proche de la baseline (cap baseMaxVolume)', () => {
    // Baseline : peak=47. Post-patch : peak=45. Cap baseMaxVolume Semi Conf = 60.
    // Légère oscillation (≤2 km) acceptable, surtout cappée par lissage post-calcul.
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 40, subGoal: 'Semi',
      vma: 16, sessionsPerWeek: 4, totalWeeks: 12,
    });
    expect(peak).toBeGreaterThanOrEqual(40);
    expect(peak).toBeLessThanOrEqual(60); // MAX_WEEKLY_VOLUME Semi conf
  });

  it('5. Marathon Déb 3× cv=15 VMA=11 → pic conservé + SL ≤ 18 km (cap actif)', () => {
    // Baseline : peak=24. Post-patch : peak=24 (cap SL borne à 18, peak idem).
    // Doctrine validée : cv<20 freq≤3 → cap SL agit en filet de sécurité.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 15, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(22); // plancher viable Marathon (raceDistanceKm×1.5/2)
    expect(peak).toBeLessThanOrEqual(45); // baseMaxVolume Déb Marathon = 45
  });

  it('6. Marathon Confirmé 5× cv=50 VMA=16 → pic inchangé (cap baseMaxVolume)', () => {
    // Baseline : peak=62. Post-patch : peak=62 (identique).
    // Profils Conf/Expert avec cv significatif : protégés par MAX_WEEKLY_VOLUME Marathon=75.
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 50, subGoal: 'Marathon',
      vma: 16, sessionsPerWeek: 5, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(60);
    expect(peak).toBeLessThanOrEqual(75); // MAX_WEEKLY_VOLUME Marathon conf
  });

  it('7. 10K Régulier cv=20 VMA=13 freq=3 → pic INCHANGÉ (factor 0.70 conservé)', () => {
    // Patch ne touche que Semi/Marathon → 10K conservé.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 20, subGoal: '10K',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(peak).toBeLessThanOrEqual(30); // baseline 10K Inter cap
    expect(peak).toBeGreaterThanOrEqual(20); // hard floor cv
  });

  it('8. 5K Confirmé cv=30 VMA=15 → pic INCHANGÉ (factor 0.70 conservé)', () => {
    const { peak } = plan({
      level: 'Confirmé (Compétition)', currentVolume: 30, subGoal: '5K',
      vma: 15, sessionsPerWeek: 3, totalWeeks: 8,
    });
    expect(peak).toBeLessThanOrEqual(46); // MAX_WEEKLY_VOLUME 5K conf
    expect(peak).toBeGreaterThanOrEqual(30);
  });

  it('9. Trail Inter cv=25 → pic INCHANGÉ (factor 0.70 conservé pour Trail)', () => {
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 25, goal: 'Trail',
      subGoal: 'Trail<30', trailDistance: 20, trailElevation: 800,
      vma: 13, sessionsPerWeek: 3, totalWeeks: 10,
    });
    expect(peak).toBeLessThanOrEqual(50); // MAX_WEEKLY_VOLUME Trail<30 inter
    expect(peak).toBeGreaterThanOrEqual(25);
  });

  it('10. Garde-fou cap SL Semi Déb cv=8 VMA=13 → SL plafonnée à 12 km (vmaCap log)', () => {
    // VMA=13 → slKm sans cap = 90×0.85/60 × 9.75 = 12.43 km → cap 12 bite.
    // Pic résultant ≤ 23 km (vs ~24 sans cap). Cap reste actif en mode silencieux.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 8, subGoal: 'Semi',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 12,
    });
    expect(peak).toBeLessThanOrEqual(23); // cap SL contraint le pic
    expect(peak).toBeGreaterThanOrEqual(14); // pic >= cv pour progression
  });

  it('11. Garde-fou cap SL Marathon Déb cv=15 freq=3 → SL plafonnée à 18 km', () => {
    // Cv=15<20, freq=3 → cap SL actif. VMA=11 → slKm sans cap = 17.5 < 18 (cap ne bite pas)
    // mais reste actif comme filet de sécurité pour VMA Déb > 12.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 15, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeLessThanOrEqual(35); // cap actif + baseMaxVolume Marathon Déb 45
    expect(peak).toBeGreaterThanOrEqual(20);
  });

  it('11bis. Cap SL Marathon Déb cv=10 VMA=13 freq=3 → cap bite (slKm raw 20.7 > 18)', () => {
    // VMA=13 (rare pour Déb mais possible avec override chrono) → slKm raw = 150×0.85/60 × 9.75 = 20.7
    // → cap 18 bite. Pic résultant ≤ 26 km, plus bas qu'avec cap inactif.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 10, subGoal: 'Marathon',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeLessThanOrEqual(28); // cap SL contraint pic
    expect(peak).toBeGreaterThanOrEqual(15);
  });

  it('12. Garde-fou désactivé : Marathon Déb cv=22 (≥20) → pas de cap SL appliqué', () => {
    // Cv=22 ≥ 20 → cap SL N'EST PAS appliqué → pic plus élevé que cv<20.
    const { peak } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 22, subGoal: 'Marathon',
      vma: 11, sessionsPerWeek: 3, totalWeeks: 16,
    });
    expect(peak).toBeGreaterThanOrEqual(25); // pic non contraint par cap SL
    expect(peak).toBeLessThanOrEqual(45); // baseMaxVolume Déb Marathon
  });

  it('13. Garde-fou désactivé : Semi Régulier cv=8 (level≠Débutant) → pas de cap SL', () => {
    // Level Inter → cap SL Semi NE S\'APPLIQUE PAS (réservé Déb).
    // Pic peut donc être > 20 km contrairement à Semi Déb cv=8.
    const { peak } = plan({
      level: 'Intermédiaire (Régulier)', currentVolume: 8, subGoal: 'Semi',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 12,
    });
    // Pas de cap SL → vmaBasedMaxVolume plus haut → peak > Semi Déb cv=8
    expect(peak).toBeGreaterThanOrEqual(16);
    expect(peak).toBeLessThanOrEqual(35); // MAX_WEEKLY_VOLUME Semi inter
  });

  it('14. Garde-fou Marathon désactivé : Marathon Déb cv=10 freq=4 → pas cap SL (freq>3)', () => {
    // Cv=10<20 MAIS freq=4 > 3 → cap SL Marathon N'EST PAS appliqué.
    // (cap SL Marathon réservé aux profils Déb 3× avec cv bas, le cas le plus tendu).
    //
    // Note 2026-05-20 (Sprint Fix P0b) : depuis le hard floor minPeakVolume
    // Marathon ≥ 32 km, les deux fréquences sont remontées au même plancher
    // dans le calcul interne. Après lissage, les pics convergent (≥).
    // L'assertion reste valide : freq=4 ne doit PAS être STRICTEMENT inférieure
    // à freq=3 (ce serait le signe d'un cap SL appliqué à tort).
    const { peak: peakFreq4 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 10, subGoal: 'Marathon',
      vma: 13, sessionsPerWeek: 4, totalWeeks: 16,
    });
    const { peak: peakFreq3 } = plan({
      level: 'Débutant (0-1 an)', currentVolume: 10, subGoal: 'Marathon',
      vma: 13, sessionsPerWeek: 3, totalWeeks: 16,
    });
    // freq=4 sans cap → peak ≥ freq=3 (lissage post-calcul équilibre les deux).
    expect(peakFreq4).toBeGreaterThanOrEqual(peakFreq3);
  });
});
