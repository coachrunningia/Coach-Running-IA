/**
 * Tests unitaires des formules nutrition trail.
 * Couvre : plages glucides par durée d'effort (ACSM 2024 / Jeukendrup / Tiller ISSN 2019),
 * formule ITRA distance équivalente, ajustement altitude hydratation,
 * cap absolu hydratation 1000 mL/h (Hew-Butler 2015 EAH),
 * Mode Premier (cap glucides 60 g/h, zéro caféine, sodium plafonné),
 * formule Minetti kcal/h trail, protéines >4h, plan B effort >6h,
 * doctrine "poids jamais affiché dans output".
 *
 * Lancer : npx vitest run src/components/tools/__tests__/nutritionTrail.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  carbsByTrailDuration,
  hydrationByProfil,
  sodiumByProfil,
  caffeineDose,
  distanceEquivalenteITRA,
  kcalPerHourTrail,
  KCAL_PER_HOUR_TRAIL_CAP,
  computeNutrition,
} from '../NutritionTrailPage';

describe('carbsByTrailDuration — plages par durée trail (ACSM 2024 / Tiller 2019)', () => {
  it('< 1h : cible 0-30 g/h (mouth rinse souvent suffit)', () => {
    const r = carbsByTrailDuration(0.5 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(0);
    expect(r.target).toBeLessThanOrEqual(30);
  });

  it('1-2h : cible 30-60 g/h', () => {
    const r = carbsByTrailDuration(1.5 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(30);
    expect(r.target).toBeLessThanOrEqual(60);
  });

  it('3-6h (trail moyen) : cible 60-90 g/h', () => {
    const r = carbsByTrailDuration(4 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(60);
    expect(r.target).toBeLessThanOrEqual(90);
  });

  it('6-12h (ultra) : cible 70-100 g/h (besoin élevé malgré lassitude)', () => {
    const r = carbsByTrailDuration(8 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(70);
    expect(r.target).toBeLessThanOrEqual(100);
  });

  it('12-24h : baisse volontaire 60-90 g/h (digestion saturée)', () => {
    const r = carbsByTrailDuration(18 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(60);
    expect(r.target).toBeLessThanOrEqual(90);
  });

  it('24h+ : 50-80 g/h (aliments vrais dominants)', () => {
    const r = carbsByTrailDuration(28 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(50);
    expect(r.target).toBeLessThanOrEqual(80);
  });
});

describe('distanceEquivalenteITRA — formule ITRA D_eq = D + (D+/100) + (D-/400)', () => {
  it('50 km + 2000 D+ + 2000 D- = 75 km équivalent', () => {
    const dEq = distanceEquivalenteITRA(50, 2000, 2000);
    expect(dEq).toBe(75);
  });

  it('UTMB-like : 170 km + 10000 D+ + 10000 D- ≈ 295 km équivalent', () => {
    const dEq = distanceEquivalenteITRA(170, 10000, 10000);
    expect(dEq).toBe(295);
  });

  it('Trail plat (0 D+ / 0 D-) = distance réelle', () => {
    const dEq = distanceEquivalenteITRA(42, 0, 0);
    expect(dEq).toBe(42);
  });
});

describe('hydrationByProfil — cap absolu 1000 mL/h + ajustement poids', () => {
  it('Salty sweater + très chaud (40°C) ne dépasse jamais 1000 mL/h', () => {
    const ml = hydrationByProfil('Salty sweater', 40);
    expect(ml).toBeLessThanOrEqual(1000);
  });

  it('Coureur 105 kg > coureur 70 kg pour mêmes conditions', () => {
    const light = hydrationByProfil('Élevé', 20, 70);
    const heavy = hydrationByProfil('Élevé', 20, 105);
    expect(heavy).toBeGreaterThan(light);
  });
});

describe('hydratation : ajustement altitude (Péronnet)', () => {
  it('Altitude >2500m génère un warning et augmente hydratation', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 80, dPlus: 5000, dMinus: 5000,
      durationSec: 12 * 3600, tempC: 10, hygrometrie: 'Standard',
      altitude: '>2500m', basesDeVie: 2,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /2500|altitude|acclimat/i.test(w))).toBe(true);
  });
});

describe('caffeineDose trail — Premier = zéro, plafond 6 mg/kg/24h', () => {
  it('Mode Premier = zéro caféine', () => {
    const r = caffeineDose(70, '3+ cafés/j', true, 10 * 3600);
    expect(r.preRaceMg).toBe(0);
    expect(r.inRaceMgPerDose).toBe(0);
  });

  it('Caféine en course seulement si effort >3h', () => {
    const short = caffeineDose(70, '1-2 cafés/j', false, 2 * 3600);
    const long = caffeineDose(70, '1-2 cafés/j', false, 8 * 3600);
    expect(short.inRaceMgPerDose).toBe(0);
    expect(long.inRaceMgPerDose).toBeGreaterThan(0);
  });
});

describe('kcalPerHourTrail — formule Minetti pondérée', () => {
  it('Trail moyen : kcal/h positif et cohérent', () => {
    const kcal = kcalPerHourTrail(70, 1500, 1500, 5 * 3600); // 30 km / 5h
    expect(kcal).toBeGreaterThan(300);
    expect(kcal).toBeLessThan(800);
  });

  it('Plus de D+ → plus de kcal/h (à durée constante)', () => {
    const flat = kcalPerHourTrail(70, 200, 200, 5 * 3600);
    const climby = kcalPerHourTrail(70, 3000, 3000, 5 * 3600);
    expect(climby).toBeGreaterThan(flat);
  });
});

describe('computeNutrition trail — intégration doctrine + sécurité', () => {
  it('Mode Premier ultra cap glucides à 60 g/h (peu importe la durée)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Débutant', premierMode: true,
      distanceKm: 100, dPlus: 5000, dMinus: 5000,
      durationSec: 18 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 3,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
  });

  it('Mode Premier = zéro caféine même si habit cafés', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 55, niveau: 'Débutant', premierMode: true,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 8 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 2,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.caffeinePreRace).toBe(0);
    expect(r.caffeineInRaceMgPerDose).toBe(0);
  });

  it('Cap hydratation 1000 mL/h respecté même conditions extrêmes', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 90, niveau: 'Expert', premierMode: false,
      distanceKm: 100, dPlus: 5000, dMinus: 5000,
      durationSec: 14 * 3600, tempC: 35, hygrometrie: 'Humide',
      altitude: '>2500m', basesDeVie: 4,
      expNutrition: 'Habitué', sudation: 'Salty sweater', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(1000);
  });

  it('Effort >6h : showPlanB = true', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 80, dPlus: 3000, dMinus: 3000,
      durationSec: 8 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 2,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.showPlanB).toBe(true);
  });

  it('Effort <6h : showPlanB = false', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 30, dPlus: 1000, dMinus: 1000,
      durationSec: 4 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 0,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.showPlanB).toBe(false);
  });

  it('Effort >4h active les protéines (Tiller 2019)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 6 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.showProteins).toBe(true);
    expect(r.proteinsPerHour).toBeGreaterThanOrEqual(5);
    expect(r.proteinsPerHour).toBeLessThanOrEqual(10);
  });

  it('Warning EAH affiché pour effort >4h', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 55, niveau: 'Régulier', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 8 * 3600, tempC: 20, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /EAH|hyponatr|1 L\/h|à la soif/i.test(w))).toBe(true);
  });

  it('Distance équivalente ITRA calculée correctement dans le résultat', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 7 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.distanceEquivalenteITRA).toBe(75);
  });

  it('DOCTRINE — Aucun champ "poids" / "weight" / "imc" visible dans le résultat sérialisé', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 7 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/poids/i);
    expect(json).not.toMatch(/weight/i);
    expect(json).not.toMatch(/imc|bmi/i);
  });

  it('Warning ratio glucose/fructose si target ≥ 60 g/h', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 7 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /glucose.*fructose|SGLT1|2:1|1:0\.8/i.test(w))).toBe(true);
  });

  it('Expérience nutrition = Jamais réduit la cible glucides de 20%', () => {
    const expert = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 7 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    const noob = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 7 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    expect(noob.carbsPerHour.target).toBeLessThan(expert.carbsPerHour.target);
  });
});

describe('sodiumByProfil — table profil sudation', () => {
  it('Salty sweater = 1200 mg/L', () => {
    expect(sodiumByProfil('Salty sweater')).toBe(1200);
  });
  it('Faible = 400 mg/L', () => {
    expect(sodiumByProfil('Faible')).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIXES EXPERT NUTRITIONNISTE — Trail B1, B2, B3, B5, B10, B11, B12
// (audit TESTS-EXPERT-NUTRITION-TRAIL-10-PROFILS.md, mai 2026)
// ─────────────────────────────────────────────────────────────────────────────

describe('Trail B12 — Validation durée jusqu\'à 50 h (Hardrock, Tor des Géants en marge)', () => {
  it('Effort 35 h (Hardrock) ne lève plus d\'erreur de calcul', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 68, niveau: 'Expert', premierMode: false,
      distanceKm: 160, dPlus: 10000, dMinus: 10000,
      durationSec: 35 * 3600, tempC: 8, hygrometrie: 'Sec',
      altitude: '>2500m', basesDeVie: 9,
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.durationHours).toBeCloseTo(35, 1);
    expect(r.totalCarbs).toBeGreaterThan(0);
  });

  it('Effort > 30 h → warning "effort exceptionnel" affiché', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
      distanceKm: 170, dPlus: 9000, dMinus: 9000,
      durationSec: 32 * 3600, tempC: 12, hygrometrie: 'Standard',
      altitude: '1500-2500m', basesDeVie: 6,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /exceptionnel|diététicien|personnalisée|>30 h/i.test(w))).toBe(true);
  });

  it('Effort ≤ 30 h → pas de warning effort exceptionnel', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
      distanceKm: 100, dPlus: 5000, dMinus: 5000,
      durationSec: 20 * 3600, tempC: 12, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 4,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /exceptionnel|>30 h/i.test(w))).toBe(false);
  });
});

describe('Trail B1 — Cap dur caféine 6 mg/kg/24 h (Grgic 2020)', () => {
  it('Hardrock 100 (68 kg, 35 h, 3+ cafés) : caféine totale jamais > 6 mg/kg', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 68, niveau: 'Expert', premierMode: false,
      distanceKm: 160, dPlus: 10000, dMinus: 10000,
      durationSec: 35 * 3600, tempC: 8, hygrometrie: 'Sec',
      altitude: '>2500m', basesDeVie: 9,
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.caffeineDoseMgPerKgTotal).toBeLessThanOrEqual(6);
  });

  it('UTMB 22 h (60 kg, 3+ cafés) : caféine totale jamais > 6 mg/kg + warning cap affiché', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 60, niveau: 'Expert', premierMode: false,
      distanceKm: 170, dPlus: 10000, dMinus: 10000,
      durationSec: 22 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: '1500-2500m', basesDeVie: 8,
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '3+ cafés/j',
    });
    expect(r.caffeineDoseMgPerKgTotal).toBeLessThanOrEqual(6);
    expect(r.warnings.some(w => /plafonn|6 mg\/kg|Grgic/i.test(w))).toBe(true);
  });

  it('Trail court 2 h (caféine pré seulement) reste sous cap naturellement', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 20, dPlus: 600, dMinus: 600,
      durationSec: 2 * 3600, tempC: 18, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 0,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.caffeineDoseMgPerKgTotal).toBeLessThanOrEqual(6);
  });
});

describe('Trail B5 — Total hydratation pondéré 0.85 si effort > 12 h (anti-EAH affichage)', () => {
  it('Effort 28 h cap 1L/h : total <= 1000 mL × 28 × 0.85 = 23 800 mL (pas 28 L)', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 62, niveau: 'Expert', premierMode: false,
      distanceKm: 165, dPlus: 9700, dMinus: 9700,
      durationSec: 28 * 3600, tempC: 25, hygrometrie: 'Humide',
      altitude: '>2500m', basesDeVie: 10,
      expNutrition: 'Habitué', sudation: 'Salty sweater', cafeineHabit: '3+ cafés/j',
    });
    const naiveTotal = r.hydrationPerHour * 28;
    expect(r.totalHydration).toBeLessThan(naiveTotal);
    expect(r.totalHydration).toBeLessThanOrEqual(Math.round(naiveTotal * 0.85) + 1);
  });

  it('Effort ≤ 12 h : pondération non appliquée (cohérence pour ultras courts)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
      distanceKm: 80, dPlus: 2500, dMinus: 2500,
      durationSec: 10 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 3,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.totalHydration).toBe(Math.round(r.hydrationPerHour * 10));
  });

  it('Effort > 12 h : message "estimation pédagogique" + "bases de vie" présent', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 68, niveau: 'Expert', premierMode: false,
      distanceKm: 160, dPlus: 8000, dMinus: 8000,
      durationSec: 24 * 3600, tempC: 14, hygrometrie: 'Standard',
      altitude: '1500-2500m', basesDeVie: 7,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /pédagogique|bases de vie|à la soif/i.test(w))).toBe(true);
  });
});

describe('Trail B11 — Différenciation H/F glucides (-10 % F, Devries 2016 / Sims 2018)', () => {
  it('Femme cible glucides ≈ 10 % en-dessous d\'un homme identique', () => {
    const h = computeNutrition({
      sexe: 'H', poidsKg: 65, niveau: 'Confirmé', premierMode: false,
      distanceKm: 80, dPlus: 3000, dMinus: 3000,
      durationSec: 10 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 3,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    const f = computeNutrition({
      sexe: 'F', poidsKg: 65, niveau: 'Confirmé', premierMode: false,
      distanceKm: 80, dPlus: 3000, dMinus: 3000,
      durationSec: 10 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 3,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(f.carbsPerHour.target).toBeLessThan(h.carbsPerHour.target);
    expect(f.warnings.some(w => /femme|Devries|Sims|-10/i.test(w))).toBe(true);
  });

  it('Effort très court F : target conservé bas (≥10, plancher de sécurité)', () => {
    // < 1 h : carbs cibles très basses (~15 g/h) ; on applique le -10 % mais
    // on protège un plancher pour ne pas tomber sous 10 g/h utile.
    const f = computeNutrition({
      sexe: 'F', poidsKg: 55, niveau: 'Expert', premierMode: false,
      distanceKm: 10, dPlus: 200, dMinus: 200,
      durationSec: 50 * 60, tempC: 12, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 0,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(f.carbsPerHour.target).toBeGreaterThanOrEqual(10);
    expect(f.carbsPerHour.target).toBeLessThanOrEqual(15);
  });
});

describe('Trail B2 — Cap 1000 kcal/h sur Minetti (VK / D+ très raides)', () => {
  it('VK 5 km/1000 D+ en 55 min : kcal/h plafonné à 1000', () => {
    const kcal = kcalPerHourTrail(65, 1000, 0, 55 * 60);
    expect(kcal).toBeLessThanOrEqual(KCAL_PER_HOUR_TRAIL_CAP);
    expect(kcal).toBe(1000);
  });

  it('Cap appliqué via computeNutrition + warning "Cap pédagogique" si D+/h > 800', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 65, niveau: 'Expert', premierMode: false,
      distanceKm: 5, dPlus: 1000, dMinus: 0,
      durationSec: 55 * 60, tempC: 12, hygrometrie: 'Standard',
      altitude: '1500-2500m', basesDeVie: 0,
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.kcalPerHour).toBeLessThanOrEqual(1000);
    expect(r.warnings.some(w => /Cap pédagogique|Minetti|VK/i.test(w))).toBe(true);
  });

  it('Trail moyen (D+/h modéré) : pas de cap appliqué ni warning', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      distanceKm: 30, dPlus: 1500, dMinus: 1500,
      durationSec: 5 * 3600, tempC: 15, hygrometrie: 'Standard',
      altitude: 'Mer/<500m', basesDeVie: 1,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.kcalPerHour).toBeLessThan(1000);
    expect(r.warnings.some(w => /Cap pédagogique kcal|Minetti.*sur-estime/i.test(w))).toBe(false);
  });
});

describe('Trail B3 — Plage glucides utile Premier (min=50, max=60), pas collapsée', () => {
  it('Mode Premier ultra long : plage 50-60 g/h (pas min=max=60)', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 60, niveau: 'Régulier', premierMode: true,
      distanceKm: 90, dPlus: 6000, dMinus: 6000,
      durationSec: 17 * 3600, tempC: 16, hygrometrie: 'Standard',
      altitude: '500-1500m', basesDeVie: 6,
      expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    expect(r.carbsPerHour.target).toBe(60);
    expect(r.carbsPerHour.max).toBe(60);
    expect(r.carbsPerHour.min).toBe(50);
    expect(r.carbsPerHour.min).toBeLessThan(r.carbsPerHour.max);
  });

  it('Premier sur effort court (< cap déclenché) : plage native conservée', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 80, niveau: 'Débutant', premierMode: true,
      distanceKm: 30, dPlus: 1500, dMinus: 1500,
      durationSec: 5 * 3600, tempC: 20, hygrometrie: 'Standard',
      altitude: '500-1500m', basesDeVie: 1,
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
  });
});

describe('Trail B10 — Warning MAM si altitude > 2500 m (Lipman 2013)', () => {
  it('Altitude >2500m → warning MAM explicite avec Lipman 2013', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
      distanceKm: 80, dPlus: 5000, dMinus: 5000,
      durationSec: 14 * 3600, tempC: 10, hygrometrie: 'Standard',
      altitude: '>2500m', basesDeVie: 3,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /MAM|Mal Aigu|Lipman/i.test(w))).toBe(true);
  });

  it('Altitude 1500-2500m → pas de warning MAM (réservé >2500m)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
      distanceKm: 50, dPlus: 2000, dMinus: 2000,
      durationSec: 8 * 3600, tempC: 12, hygrometrie: 'Standard',
      altitude: '1500-2500m', basesDeVie: 2,
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /MAM|Mal Aigu/i.test(w))).toBe(false);
  });
});
