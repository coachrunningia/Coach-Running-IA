/**
 * Tests anti-régression refonte V2 Nutrition Trail (mai 2026).
 * Couvre les 22 ajustements validés par 3 experts indépendants :
 *   Expert #1 — coach trail performance 20 ans (ISSN/ITRA/UTMB Academy)
 *   Expert #2 — nutrition clinique sport (SFNS/IOC, sécurité EAH/GI)
 *   Expert #3 — trail elite terrain 25 ans (UTMB/Tor/Hardrock)
 *
 * Audits sources :
 *   - AUDIT-NUTRITION-TRAIL-V2-EXPERT-11-TESTS.md
 *   - AUDIT-NUTRITION-TRAIL-EXPERT-MULTI-PROFILS.md
 *
 * Bug principal corrigé : 27 km / 4 h → 14 gels (V1). Cause : formule gels
 * ignorait apport boisson isotonique. V2 = formule déduit boisson + solides + BV.
 *
 * Lancer : npx vitest run src/components/tools/__tests__/nutrition-trail-v2.test.ts
 */

import { describe, it, expect } from 'vitest';
import { computeNutrition } from '../NutritionTrailPage';

// Profil par défaut pour fabriquer les cas de tests
const baseInput = {
  sexe: 'H' as const,
  poidsKg: 70,
  niveau: 'Confirmé' as const,
  premierMode: false,
  isPremierUltra: false,
  distanceKm: 30,
  dPlus: 1500,
  dMinus: 1500,
  durationSec: 4 * 3600,
  tempC: 15,
  hygrometrie: 'Standard' as const,
  altitude: 'Mer/<500m' as const,
  basesDeVie: 0,
  expNutrition: 'Habitué' as const,
  sudation: 'Modéré' as const,
  cafeineHabit: '1-2 cafés/j' as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// 11 PROFILS DE RÉFÉRENCE (audit AUDIT-NUTRITION-TRAIL-V2-EXPERT-11-TESTS.md)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Paliers durée (5 paliers : Court / Moyen / Long / TrèsLong / Ultra)', () => {
  it('Trail 10 km / 500 D+ / 1h05 → palier Court (<2h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 10, dPlus: 500, dMinus: 500,
      durationSec: 65 * 60,
    });
    expect(r.durationPalier).toBe('court');
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(50);
  });

  it('Trail 27 km / 1500 D+ / 3h50 → palier Moyen (2-5h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 27, dPlus: 1500, dMinus: 1500,
      durationSec: 3 * 3600 + 50 * 60,
    });
    expect(r.durationPalier).toBe('moyen');
  });

  it('Trail 47 km / 3000 D+ / 7h30 → palier Long (5-8h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 47, dPlus: 3000, dMinus: 3000,
      durationSec: 7 * 3600 + 30 * 60,
      basesDeVie: 1,
    });
    expect(r.durationPalier).toBe('long');
  });

  it('Trail 55 km / 4000 D+ / 9h40 → palier TrèsLong (8-18h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 55, dPlus: 4000, dMinus: 4000,
      durationSec: 9 * 3600 + 40 * 60,
      basesDeVie: 2,
    });
    expect(r.durationPalier).toBe('tresLong');
  });

  it('Trail 100 km / 6500 D+ / 19h → palier Ultra (>18h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 100, dPlus: 6500, dMinus: 6500,
      durationSec: 19 * 3600,
      basesDeVie: 3,
    });
    expect(r.durationPalier).toBe('ultra');
  });
});

describe('V2 — Cibles glucides g/h par palier (40/60/70/75/75)', () => {
  it('Court : target 30-50 g/h', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 90 * 60 });
    expect(r.carbsPerHour.target).toBeGreaterThanOrEqual(30);
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(50);
  });

  it('Moyen : target ~60 g/h (plage 50-75)', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 4 * 3600 });
    expect(r.carbsPerHour.target).toBeGreaterThanOrEqual(50);
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(75);
  });

  it('Long : target ~70 g/h', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 7 * 3600 });
    expect(r.carbsPerHour.target).toBeGreaterThanOrEqual(60);
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(80);
  });

  it('TrèsLong : target ~75 g/h (plage 65-80)', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 12 * 3600 });
    expect(r.carbsPerHour.target).toBeGreaterThanOrEqual(65);
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(80);
  });

  it('Ultra : target ~75 g/h', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 20 * 3600 });
    expect(r.carbsPerHour.target).toBeGreaterThanOrEqual(65);
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(80);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUG CRITIQUE V1 → V2 : 27 km → 14 gels
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Bug 27 km gels (régression critique)', () => {
  it('Trail 27 km / 1500 D+ / 3h50 → 3-7 gels (vs 14 V1)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 27, dPlus: 1500, dMinus: 1500,
      durationSec: 3 * 3600 + 50 * 60,
      basesDeVie: 0,
    });
    expect(r.nbGels).toBeGreaterThanOrEqual(2);
    expect(r.nbGels).toBeLessThanOrEqual(8);
  });

  it('Trail 27 km / 3000 D+ / 4h45 + 1 BV → 4-7 gels', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 27, dPlus: 3000, dMinus: 3000,
      durationSec: 4 * 3600 + 45 * 60,
      basesDeVie: 1,
    });
    expect(r.nbGels).toBeGreaterThanOrEqual(2);
    expect(r.nbGels).toBeLessThanOrEqual(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CAPS GELS (palier + horaire)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Cap gels par palier + cap horaire 1.33/h', () => {
  it('Cap absolu 1 gel / 45 min jamais dépassé (= 1.33/h)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 80, dPlus: 4000, dMinus: 4000,
      durationSec: 14 * 3600,
      basesDeVie: 2,
    });
    expect(r.nbGels).toBeLessThanOrEqual(Math.floor(14 * 1.34));
  });

  it('Cap palier TrèsLong : 18-20 gels max', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 80, dPlus: 5000, dMinus: 5000,
      durationSec: 14 * 3600,
      basesDeVie: 0, // pas de BV pour pousser le nb gels
    });
    expect(r.nbGels).toBeLessThanOrEqual(20);
  });

  it('Cap palier Long : ≤ 14 gels', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 47, dPlus: 3000, dMinus: 3000,
      durationSec: 7 * 3600,
      basesDeVie: 0,
    });
    expect(r.nbGels).toBeLessThanOrEqual(14);
  });

  it('Trail 100 km / 6500 D+ / 19 h → 14-30 gels (palier Ultra)', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 100, dPlus: 6500, dMinus: 6500,
      durationSec: 19 * 3600,
      basesDeVie: 3,
    });
    expect(r.nbGels).toBeGreaterThanOrEqual(10);
    expect(r.nbGels).toBeLessThanOrEqual(35);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HYDRATATION — plages + plafonds femme légère
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Hydratation plages palier + plafond F<55kg climat frais', () => {
  it('Cap absolu 1000 mL/h respecté en toutes conditions', () => {
    const r = computeNutrition({
      ...baseInput,
      poidsKg: 90,
      durationSec: 14 * 3600,
      tempC: 35, hygrometrie: 'Humide', altitude: '>2500m',
      sudation: 'Salty sweater',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(1000);
  });

  it('Femme <55 kg climat frais (<18°C) → plafond 750 mL/h', () => {
    const r = computeNutrition({
      ...baseInput,
      sexe: 'F', poidsKg: 52,
      tempC: 12, hygrometrie: 'Humide',
      durationSec: 10 * 3600,
      sudation: 'Élevé',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(750);
    expect(r.clinicalWarnings.some(w => /Femme.*55|EAH amplifié|sueur réduite/i.test(w))).toBe(true);
  });

  it('Femme 60kg, climat tempéré → cap 850 mL/h (pas 750)', () => {
    const r = computeNutrition({
      ...baseInput,
      sexe: 'F', poidsKg: 60,
      tempC: 22, hygrometrie: 'Standard',
      durationSec: 10 * 3600,
      sudation: 'Élevé',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(850);
  });

  it('hydrationRange exposé selon palier', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 12 * 3600,
      basesDeVie: 2,
    });
    expect(r.hydrationRange.min).toBe(500);
    expect(r.hydrationRange.max).toBe(800);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SODIUM — ration mg/h palier
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Sodium ration mg/h par palier (expert #2)', () => {
  it('Palier Long : sodiumRange 500-1000 mg/h', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.sodiumRange.min).toBe(500);
    expect(r.sodiumRange.max).toBe(1000);
  });

  it('Palier Court : sodiumRange 300-500 mg/h', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 90 * 60,
    });
    expect(r.sodiumRange.min).toBe(300);
    expect(r.sodiumRange.max).toBe(500);
  });

  it('Chaleur >25°C → sodiumPerHour = borne haute du palier', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 10 * 3600,
      tempC: 30,
      basesDeVie: 2,
    });
    expect(r.sodiumPerHour).toBe(r.sodiumRange.max);
  });

  it('Sweat-salty heavy palier Long+ → sodium ≥1000 mg/h + warning', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 10 * 3600,
      sudation: 'Salty sweater',
      basesDeVie: 2,
    });
    expect(r.sodiumPerHour).toBeGreaterThanOrEqual(1000);
    expect(r.clinicalWarnings.some(w => /sweat.*salty|test sweat sodium|1400/i.test(w))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODE "PREMIER ULTRA" dédié (expert #3 ajustement #22)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Mode Premier ultra (cap auto 60 g/h palier TrèsLong+)', () => {
  it('Premier ultra actif + palier TrèsLong → cap 60 g/h', () => {
    const r = computeNutrition({
      ...baseInput,
      isPremierUltra: true,
      distanceKm: 80, dPlus: 4000, dMinus: 4000,
      durationSec: 14 * 3600,
      basesDeVie: 2,
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
    expect(r.warnings.some(w => /Premier ultra|First-timer|FINIR|60 g\/h/i.test(w))).toBe(true);
  });

  it('Premier ultra actif + palier Ultra → cap 60 g/h', () => {
    const r = computeNutrition({
      ...baseInput,
      isPremierUltra: true,
      distanceKm: 130, dPlus: 7500, dMinus: 7500,
      durationSec: 25 * 3600,
      basesDeVie: 5,
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
  });

  it('Premier ultra actif sur palier Moyen → pas de cap forcé (déjà <60)', () => {
    const r = computeNutrition({
      ...baseInput,
      isPremierUltra: true,
      durationSec: 4 * 3600,
    });
    // Palier moyen target = 60, donc cap est ok déjà naturel
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
  });

  it('Premier ultra : zéro caféine forcée', () => {
    const r = computeNutrition({
      ...baseInput,
      isPremierUltra: true,
      cafeineHabit: '1-2 cafés/j',
      durationSec: 14 * 3600,
      basesDeVie: 2,
    });
    expect(r.caffeinePreRace).toBe(0);
    expect(r.caffeineInRaceMgPerDose).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROTÉINES par palier (expert #3 — BV-centric)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Protéines par palier (concentré BV, pas continu)', () => {
  it('Palier Court : pas de protéines', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 90 * 60 });
    expect(r.proteinsConfig.required).toBe(false);
    expect(r.proteinsConfig.optional).toBe(false);
    expect(r.proteinsPerHour).toBe(0);
  });

  it('Palier Moyen : pas de protéines (avant 5 h)', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 4 * 3600 });
    expect(r.proteinsConfig.required).toBe(false);
    expect(r.proteinsConfig.optional).toBe(false);
  });

  it('Palier Long : protéines optionnelles, ~5 g/h moyenne, 15 g/BV', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.proteinsConfig.optional).toBe(true);
    expect(r.proteinsConfig.gPerBV).toBe(15);
  });

  it('Palier TrèsLong : protéines obligatoires, 7 g/h, 25 g/BV', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 12 * 3600,
      basesDeVie: 2,
    });
    expect(r.proteinsConfig.required).toBe(true);
    expect(r.proteinsConfig.gPerBV).toBe(25);
    expect(r.proteinsConfig.uxMessage).toMatch(/concentré en base de vie|BV/i);
  });

  it('Palier Ultra : 30 g/BV + œuf dur autorisé BV uniquement', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 20 * 3600,
      basesDeVie: 3,
    });
    expect(r.proteinsConfig.required).toBe(true);
    expect(r.proteinsConfig.gPerBV).toBe(30);
    expect(r.proteinsConfig.uxMessage).toMatch(/BV réfrigérée|salmonella|listeria/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOLIDES — liste élargie expert #3 (Coca, soupe, boudoirs, fruits secs)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Solides liste élargie (Coca dégazé, soupe, boudoirs, fruits secs)', () => {
  it('Palier Long (≥6 h) : Coca dégazé présent', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.solidesList.some(s => /coca/i.test(s))).toBe(true);
  });

  it('Palier Long (≥6 h) : Soupe instantanée présente', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.solidesList.some(s => /soupe|miso/i.test(s))).toBe(true);
  });

  it('Palier Moyen (3-6 h) : Boudoirs + fruits secs moelleux présents', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 4 * 3600,
    });
    expect(r.solidesList.some(s => /boudoir|biscuits secs/i.test(s))).toBe(true);
    expect(r.solidesList.some(s => /fruits secs|abricot|datte/i.test(s))).toBe(true);
  });

  it('Palier Moyen (3-6 h) : pas de Coca dégazé (réservé H≥6 h)', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 4 * 3600,
    });
    expect(r.solidesList.some(s => /coca/i.test(s))).toBe(false);
  });

  it('Palier Court (<2 h) : aucun solide', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 90 * 60,
    });
    expect(r.solidesList).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WARNINGS CLINIQUES (expert #2 critiques EAH/GI)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Warnings cliniques (sécurité)', () => {
  it('Cible >60 g/h → warning gut training (Costa 2017)', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /gut training|Costa|4-6 semaines/i.test(w))).toBe(true);
  });

  it('Cible ≥60 g/h → warning ratio glucose:fructose / maltodextrine + fructose', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /maltodextrine.*fructose|2:1|SGLT1/i.test(w))).toBe(true);
  });

  it('Règle gel + eau (100-150 mL dans 5 min) toujours présente', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 5 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /100-150 mL|jamais à sec|anti-GI/i.test(w))).toBe(true);
  });

  it('Sodium toujours dans/avec boisson glucidique', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 5 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /sodium.*boisson|pastilles sel/i.test(w))).toBe(true);
  });

  it('Hypoglycémie pré-départ : dernier gel >60 min OU top départ', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 5 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /dernier gel|60 min AVANT|rebound hypoglycémique/i.test(w))).toBe(true);
  });

  it('Cap caféine 400 mg/24 h cumulé', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 12 * 3600,
      cafeineHabit: '1-2 cafés/j',
      basesDeVie: 2,
    });
    expect(r.clinicalWarnings.some(w => /400 mg|caféine|Coca.*30 mg/i.test(w))).toBe(true);
  });

  it('Anti-métronome : repères mémorables + alarme backup', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 6 * 3600,
      basesDeVie: 1,
    });
    expect(r.clinicalWarnings.some(w => /métronome|repère|alarme|40-50/i.test(w))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BASES DE VIE — seuils par durée + D+
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Bases de vie recommandées (seuils palier + D+)', () => {
  it('Court (<4 h) : 0 BV recommandée', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 3 * 3600 });
    expect(r.basesDeVieRecommande).toBe(0);
  });

  it('4-8 h : 1 BV', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 7 * 3600, dPlus: 2000,
    });
    expect(r.basesDeVieRecommande).toBe(1);
  });

  it('8-14 h avec D+ >2500 : 2 BV', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 12 * 3600, dPlus: 3000, dMinus: 3000,
    });
    expect(r.basesDeVieRecommande).toBe(2);
  });

  it('14-20 h avec D+ >4500 : 3 BV', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 17 * 3600, dPlus: 5000, dMinus: 5000,
    });
    expect(r.basesDeVieRecommande).toBe(3);
  });

  it('Ultra long >20 h : 1 BV / 5 h (max 6)', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 28 * 3600, dPlus: 6000, dMinus: 6000,
    });
    expect(r.basesDeVieRecommande).toBeGreaterThanOrEqual(4);
    expect(r.basesDeVieRecommande).toBeLessThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ŒUF DUR / FROMAGE FRAIS — BV réfrigérée uniquement
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Œuf dur / fromage frais hors BV = sécurité', () => {
  it('Ultra : message protéines mentionne BV réfrigérée pour œuf dur / fromage frais', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 20 * 3600,
      basesDeVie: 3,
    });
    expect(r.proteinsConfig.uxMessage).toMatch(/réfrigérée|salmonella|listeria/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAUCISSON — "1-2 tranches fines max" en BV uniquement
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Saucisson restriction BV + précision tranches', () => {
  it('Palier ≥6 h : timeline mentionne saucisson 1-2 tranches fines', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 10 * 3600,
      basesDeVie: 2,
    });
    const allTimelineText = r.timeline.map(s => s.instruction).join(' ');
    expect(allTimelineText).toMatch(/saucisson.*tranches?\s*fines?|saucisson.*1-2/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHIFFRES CLÉS — Profils référence (validation tests 11 profils)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Profils référence tests 11 profils (validation chiffres clés)', () => {
  it('Profil #4 : Trail 47 km / 3000 D+ / 7h30 → 6-14 gels palier Long', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 47, dPlus: 3000, dMinus: 3000,
      durationSec: 7 * 3600 + 30 * 60,
      basesDeVie: 1,
    });
    expect(r.durationPalier).toBe('long');
    expect(r.nbGels).toBeGreaterThanOrEqual(4);
    expect(r.nbGels).toBeLessThanOrEqual(14);
  });

  it('Profil #5 : Trail 55 km / 4000 D+ / 9h40 → palier TrèsLong, BV reco ≥1', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 55, dPlus: 4000, dMinus: 4000,
      durationSec: 9 * 3600 + 40 * 60,
      basesDeVie: 2,
    });
    expect(r.durationPalier).toBe('tresLong');
    expect(r.basesDeVieRecommande).toBeGreaterThanOrEqual(1);
    expect(r.nbGels).toBeLessThanOrEqual(20);
  });

  it('Profil #6 : Trail 75 km / 4300 D+ / 14h → palier TrèsLong, gels ≤20', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 75, dPlus: 4300, dMinus: 4300,
      durationSec: 14 * 3600,
      basesDeVie: 3,
    });
    expect(r.durationPalier).toBe('tresLong');
    expect(r.nbGels).toBeLessThanOrEqual(20);
  });

  it('Profil #8 : Trail 130 km / 7500 D+ / 27h → Ultra, BV reco ≥4', () => {
    const r = computeNutrition({
      ...baseInput,
      distanceKm: 130, dPlus: 7500, dMinus: 7500,
      durationSec: 27 * 3600,
      basesDeVie: 5,
    });
    expect(r.durationPalier).toBe('ultra');
    expect(r.basesDeVieRecommande).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPOSITION FIELDS V2 (rétrocompat + nouveaux)
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — CalcResult enrichi (champs V2 exposés)', () => {
  it('durationPalier + durationPalierLabel exposés', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 12 * 3600 });
    expect(r.durationPalier).toBeDefined();
    expect(r.durationPalierLabel).toMatch(/Très long|8-18/i);
  });

  it('hydrationRange + sodiumRange + sodiumPerHour exposés', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 7 * 3600, basesDeVie: 1 });
    expect(r.hydrationRange.min).toBeGreaterThan(0);
    expect(r.sodiumRange.min).toBeGreaterThan(0);
    expect(r.sodiumPerHour).toBeGreaterThan(0);
  });

  it('proteinsConfig + nbSolides + solidesList exposés', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 10 * 3600, basesDeVie: 2 });
    expect(r.proteinsConfig).toBeDefined();
    expect(typeof r.nbSolides).toBe('number');
    expect(Array.isArray(r.solidesList)).toBe(true);
  });

  it('clinicalWarnings séparé de warnings', () => {
    const r = computeNutrition({ ...baseInput, durationSec: 8 * 3600, basesDeVie: 2 });
    expect(Array.isArray(r.clinicalWarnings)).toBe(true);
    expect(r.clinicalWarnings.length).toBeGreaterThan(0);
  });

  it('isPremierUltra exposé dans le résultat', () => {
    const r = computeNutrition({
      ...baseInput,
      isPremierUltra: true,
      durationSec: 14 * 3600, basesDeVie: 2,
    });
    expect(r.isPremierUltra).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCTRINE — pas de mention poids dans output sérialisé
// ═══════════════════════════════════════════════════════════════════════════

describe('V2 — Doctrine : zéro mention poids/IMC dans output', () => {
  it('Output sérialisé ne contient ni "poids" ni "weight" ni "imc"', () => {
    const r = computeNutrition({
      ...baseInput,
      durationSec: 14 * 3600, basesDeVie: 2,
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/poids/i);
    expect(json).not.toMatch(/weight/i);
    expect(json).not.toMatch(/imc|bmi/i);
  });
});
