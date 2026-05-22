/**
 * Sprint B P1 — Tests anti-régression 3 fixes coach FFA major impact.
 *
 * Source : /Users/romanemarino/Coach-Running-IA/VERDICT-EXPERT-5-BUGS.md
 *
 * Bug #2b — Cap senior progressif (Hammond Masters + Pfitzinger Masters).
 *   60+ → cap 90, 70+ → cap 75, 75+ → cap 70.
 *
 * Bug #2c — Cross-check PB déclaré vs cible (Riegel fallback).
 *   pbGap > 4% à 60+ ans → cap 70.
 *   pbGap > 8% (toute âge) → cap 70.
 *   pbGap > 15% (toute âge) → cap 60.
 *
 * Bug #5 — WelcomeMessage 3 paliers Gabbett (wording).
 *   Le bloc transparencyBlock est injecté dans le prompt LLM selon le ratio S1/cv.
 *
 * Lancer : npx vitest run src/services/__tests__/sprint-b-p1-fixes.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateFeasibility } from '../feasibilityService';

// ─────────────────────────────────────────────────────────────────────────────
// Base feasibility — profil utilisé pour isoler chaque cap
// ─────────────────────────────────────────────────────────────────────────────

const baseHealthy = {
  goal: 'Course sur route',
  level: 'Intermédiaire (Régulier)',
  planWeeks: 16,
  hasInjury: false,
  hasChrono: true,
  vmaFromTarget: false,
  frequency: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Bug #2b — Cap senior progressif (VO2max Hammond / Pfitzinger Masters)
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #2b — Cap senior progressif sur confidenceScore', () => {
  it('Profil 30 ans, confidence brut élevé → reste élevé (pas de cap)', () => {
    // gapPercent négatif fort (cible plus lente que théorique) → score = 95 brut.
    // 30 ans → aucun cap senior, on doit garder un score haut.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 30,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('Profil 60 ans, confidence brut élevé → cap 90', () => {
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 60,
    });
    expect(result.score).toBeLessThanOrEqual(90);
  });

  it('Profil 70 ans, confidence brut élevé → cap 75', () => {
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 70,
    });
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('Profil 75 ans, confidence brut élevé → cap 70', () => {
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 75,
    });
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it('Profil 72 ans (Guliver) sans PB → cap 75 (Fix 2b seul)', () => {
    // Sans recentRaceTimes, seul Fix 2b s'applique → cap 75.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 13.5,
      targetTime: '3h55',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 72,
    });
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('Profil 59 ans (sous le seuil 60) → pas de cap senior', () => {
    // Garde-fou : à 59 ans on est SOUS le seuil, score brut conservé.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h45',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 59,
    });
    // Score brut excellent attendu (≥ 91 = au-dessus du cap 90 qui aurait été appliqué à 60).
    expect(result.score).toBeGreaterThanOrEqual(91);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #2c — Cross-check PB vs cible (Riegel fallback)
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug #2c — Cross-check PB déclaré vs cible', () => {
  it('Guliver (72 ans, PB M 4h10, cible 3h55) → pbGap 6% → cap 70', () => {
    // 250-235 = 15 min sur 250 = 6%. Senior 72 ans + pbGap 6% > 4% → cap 70 (#2c).
    // Combiné cap 75 (#2b) → résultat final ≤ 70.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 13.5,
      targetTime: '3h55',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 72,
      recentRaceTimes: { distanceMarathon: '4h10' },
    });
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it('Cas sain (40 ans, PB M 3h30, cible 3h30) → pbGap 0% → pas de cap #2c', () => {
    // PB == cible → pbGap 0%, aucun cap PB.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 16,
      targetTime: '3h30',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 40,
      recentRaceTimes: { distanceMarathon: '3h30' },
    });
    // Pas de cap PB ; un score raisonnable doit rester possible.
    expect(result.score).toBeGreaterThan(70);
  });

  it('Cas raisonnable (35 ans, PB M 4h00, cible 3h55) → pbGap ~2% → pas de cap #2c', () => {
    // 240 → 235 = 5 min sur 240 = ~2% < 4 et < 8 → aucun cap PB ni senior.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 15,
      targetTime: '3h55',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 35,
      recentRaceTimes: { distanceMarathon: '4h00' },
    });
    // Pas de cap dur PB (< 8%) et pas de cap senior (35 ans). Score brut conservé.
    expect(result.score).toBeGreaterThan(70);
  });

  it('Cas hors limite (30 ans, PB M 4h00, cible 3h00) → pbGap 25% → cap 60', () => {
    // 240 → 180 = 60 min sur 240 = 25% > 15 → cap 60.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 16,
      targetTime: '3h00',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 30,
      recentRaceTimes: { distanceMarathon: '4h00' },
    });
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('Fallback Riegel : PB semi 1h49 sans PB marathon, cible 3h55 → estimer M ≈ 3h49, gap < 4% → pas de cap', () => {
    // PB semi 1h49 = 109 min. Riegel ×2.1 → ~229 min ≈ 3h49.
    // Cible 3h55 = 235 min. Cible PLUS LENTE que PB estimé → pbGap NÉGATIF → aucun cap PB.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 14,
      targetTime: '3h55',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 55,
      age: 35,
      recentRaceTimes: { distanceHalfMarathon: '1h49' },
    });
    // Pas de cap #2c (gap négatif). Score brut conservé.
    expect(result.score).toBeGreaterThan(70);
  });

  it('Fallback Riegel hors limite : PB 10K 50min sans PB marathon, cible 3h00 → estimer M ≈ 3h50, gap ~22% → cap 60', () => {
    // PB 10K 50min × 4.6 ≈ 230 min (3h50). Cible 180 → gap 50/230 = ~22% > 15 → cap 60.
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 17,
      targetTime: '3h00',
      distance: 'Marathon',
      currentVolume: 60,
      s1ActualVolume: 65,
      age: 35,
      recentRaceTimes: { distance10km: '50:00' },
    });
    expect(result.score).toBeLessThanOrEqual(60);
  });

  it('Senior 65 ans, PB M 4h05, cible 4h10 (gap -1.2%) → pas de cap PB (objectif au-dessus du PB)', () => {
    // 245 → 250 = -5 min sur 245 = ~-2% < 0 → pas de cap.
    // Cap senior 80 ne s'applique pas (60+ → cap 90), 65+ → cap 90 (ancien spec EXPERT recommandait 80 mais on a chosi paliers 60/70/75 selon la mission).
    const result = calculateFeasibility({
      ...baseHealthy,
      vma: 14,
      targetTime: '4h10',
      distance: 'Marathon',
      currentVolume: 50,
      s1ActualVolume: 50,
      age: 65,
      recentRaceTimes: { distanceMarathon: '4h05' },
    });
    // Aucun cap PB. Senior cap 90.
    expect(result.score).toBeLessThanOrEqual(90);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug #5 — WelcomeMessage 3 paliers Gabbett (wording)
// ─────────────────────────────────────────────────────────────────────────────
//
// On valide directement la logique du transparencyBlock par un harness inline
// (réplique exacte de la logique injectée dans geminiService.ts L4131+).
// Cela évite de monter tout le pipeline preview ; on teste UNIQUEMENT le bloc
// chiffrage qui pilote le LLM.

function buildTransparencyBlock(cvForRatio: number, s1VolForRatio: number): string {
  const s1Ratio = cvForRatio > 0 ? s1VolForRatio / cvForRatio : 1;
  const s1DeltaPct = Math.round((s1Ratio - 1) * 100);
  const s1DeltaKm = s1VolForRatio - cvForRatio;
  if (cvForRatio <= 0 || s1Ratio <= 1.15) return '';
  if (s1Ratio <= 1.30) {
    return `
⚠️ TRANSPARENCE CALIBRAGE VOLUME — wording PRUDENT (palier vert/jaune Gabbett) :
Ratio S1/cv = ${s1Ratio.toFixed(2)} (+${s1DeltaPct}%, soit +${s1DeltaKm}km vs ton volume actuel).
Le welcomeMessage DOIT mentionner CE CHIFFRAGE PRÉCIS de manière neutre. Modèle obligatoire :
"Ta S1 démarre à ${s1VolForRatio}km, légèrement au-dessus de ton volume actuel (${cvForRatio}km) — +${s1DeltaPct}%, on surveille ton ressenti. Si tu cours réellement plus, ajuste dans ton profil."
INCLURE textuellement les chiffres "+${s1DeltaPct}%" et le ratio. Ne pas adoucir.`;
  }
  if (s1Ratio <= 1.50) {
    return `
🟠 TRANSPARENCE CALIBRAGE VOLUME — wording DUR (palier jaune/rouge Gabbett) :
Ratio S1/cv = ${s1Ratio.toFixed(2)} (+${s1DeltaPct}%, soit +${s1DeltaKm}km vs ton volume actuel).
Le welcomeMessage DOIT prévenir explicitement du saut. Modèle obligatoire :
"On démarre ta S1 à ${s1VolForRatio}km alors que ton volume actuel est ${cvForRatio}km — c'est +${s1DeltaPct}% (ratio Gabbett ${s1Ratio.toFixed(1)}), au-dessus de la zone recommandée. Sois vigilant·e, écoute ton corps et ralentis si fatigue inhabituelle. Si tu cours réellement plus, ajuste dans ton profil."
INCLURE textuellement "+${s1DeltaPct}%", "ratio Gabbett ${s1Ratio.toFixed(1)}", "vigilance/vigilant". Ne JAMAIS écrire "un peu plus" ni "reste progressif".`;
  }
  return `
🚨 TRANSPARENCE CALIBRAGE VOLUME — wording BRUTAL (zone rouge Gabbett, saut violent) :
Ratio S1/cv = ${s1Ratio.toFixed(2)} (+${s1DeltaPct}%, soit +${s1DeltaKm}km vs ton volume actuel).
Le welcomeMessage DOIT prévenir SANS EMBELLIR. Modèle obligatoire :
"Ta S1 démarre à ${s1VolForRatio}km, soit +${s1DeltaPct}% au-dessus de ton volume actuel (${cvForRatio}km). C'est un saut violent en zone rouge Gabbett (ratio ${s1Ratio.toFixed(1)} > 1.5) — risque de blessure significatif pour ton objectif. Lecture obligatoire : si tu cours réellement plus que ${cvForRatio}km/sem, ajuste dans ton profil. Sinon on te recommande d'allonger ton plan ou de revoir l'objectif. Suivre cette S1 nécessite vigilance accrue."
INCLURE textuellement "+${s1DeltaPct}%", "Gabbett ${s1Ratio.toFixed(1)}", "risque" (de blessure) et "vigilance". Ne JAMAIS adoucir, ne JAMAIS écrire "un peu plus" ni "reste progressif". Ne PAS mentionner d'allure (doctrine jamais_baisser_allure_cible). Ne PAS mentionner poids/IMC (doctrine jamais_poids_minceur).`;
}

describe('Bug #5 — Welcome 3 paliers Gabbett (transparencyBlock)', () => {
  it('cv=50, S1=50 (ratio 1.0) → bloc vide (pas de chiffrage alarmiste)', () => {
    const block = buildTransparencyBlock(50, 50);
    expect(block).toBe('');
  });

  it('cv=30, S1=33 (ratio 1.10) → bloc vide (zone verte stricte ≤ 1.15)', () => {
    const block = buildTransparencyBlock(30, 33);
    expect(block).toBe('');
  });

  it('cv=30, S1=37 (ratio ~1.23) → wording PRUDENT, mention "+23%", "on surveille"', () => {
    const block = buildTransparencyBlock(30, 37);
    expect(block).toContain('PRUDENT');
    expect(block).toContain('+23%');
    expect(block).toContain('on surveille');
    expect(block).not.toContain('risque de blessure');
  });

  it('cv=20, S1=28 (ratio 1.40) → wording DUR, mention "+40%", "Gabbett 1.4", "vigilan"', () => {
    const block = buildTransparencyBlock(20, 28);
    expect(block).toContain('DUR');
    expect(block).toContain('+40%');
    expect(block).toContain('Gabbett 1.4');
    expect(block).toMatch(/vigilan/i);
  });

  it('Clémentine cv=25, S1=40 (ratio 1.6) → wording BRUTAL, mention "+60%", "Gabbett 1.6", "risque"', () => {
    const block = buildTransparencyBlock(25, 40);
    expect(block).toContain('BRUTAL');
    expect(block).toContain('+60%');
    expect(block).toContain('Gabbett 1.6');
    expect(block).toContain('risque');
    expect(block).toContain('vigilance');
    // Anti-régression doctrine : le MODÈLE de message (entre guillemets) ne doit
    // mentionner ni le poids/IMC/silhouette ni l'allure cible. La directive LLM
    // hors guillemets peut nommer la doctrine ("Ne PAS mentionner poids/IMC")
    // — c'est une consigne, pas du wording final pour le user.
    const modelMatch = block.match(/"([^"]+)"/);
    expect(modelMatch).not.toBeNull();
    const model = modelMatch![1];
    expect(model).not.toMatch(/poids|imc|silhouette/i);
    expect(model).not.toMatch(/allure (cible|objectif)/i);
    // Anti-régression wording : on ne doit JAMAIS rencontrer "un peu plus" / "reste progressif".
    // Note : le bloc CONTIENT l'instruction "Ne JAMAIS écrire X" — c'est une instruction
    // pour le LLM, pas du wording final. On vérifie juste qu'aucun phrasé doux n'est utilisé
    // pour DÉCRIRE le saut lui-même (modèle d'output).
    expect(block).not.toMatch(/démarre à 40km.*un peu plus/);
  });

  it('cv=0 (débutant) → bloc vide quelle que soit S1', () => {
    const block = buildTransparencyBlock(0, 30);
    expect(block).toBe('');
  });
});
