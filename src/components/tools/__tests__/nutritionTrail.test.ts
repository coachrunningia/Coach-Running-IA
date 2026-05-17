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
