/**
 * Tests unitaires des formules nutrition marathon.
 * Couvre : plages glucides par chrono (recalibrées borne basse-médiane),
 * cap absolu hydratation 1000 mL/h, caféine 3 mg/kg cible + split pré/boost,
 * mode Premier (cap glucides + zéro caféine), doctrine "poids jamais affiché".
 *
 * Lancer : npx vitest run src/components/tools/__tests__/nutritionMarathon.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  carbsByChrono,
  hydrationByProfil,
  sodiumByProfil,
  caffeineDose,
  computeNutrition,
} from '../NutritionMarathonPage';

describe('carbsByChrono — plages recalibrées borne basse-médiane', () => {
  it('sub-3h cible 70-95 g/h', () => {
    const r = carbsByChrono(2.5 * 3600 + 1); // 2h30+
    expect(r.target).toBeGreaterThanOrEqual(70);
    expect(r.target).toBeLessThanOrEqual(95);
  });

  it('sub-4h cible recalibrée 50-75 g/h (ex-70 g/h trop haut pour 55 kg)', () => {
    const r = carbsByChrono(3.7 * 3600); // 3h42 (entre 3h30 et 4h)
    expect(r.target).toBeGreaterThanOrEqual(50);
    expect(r.target).toBeLessThanOrEqual(75);
  });

  it('sub-3h35 (3h30-4h palier) target = 60 g/h (ex Romane 55 kg)', () => {
    const r = carbsByChrono(3 * 3600 + 35 * 60); // 3h35
    expect(r.target).toBe(60);
  });

  it('sub-5h cible 40-55 g/h', () => {
    const r = carbsByChrono(4.7 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(40);
    expect(r.target).toBeLessThanOrEqual(55);
  });

  it('5h+ cible 35-50 g/h', () => {
    const r = carbsByChrono(5.5 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(35);
    expect(r.target).toBeLessThanOrEqual(50);
  });
});

describe('hydrationByProfil — cap absolu 1000 mL/h', () => {
  it('Salty sweater + très chaud ne dépasse jamais 1000 mL/h', () => {
    const ml = hydrationByProfil('Salty sweater', 40);
    expect(ml).toBeLessThanOrEqual(1000);
  });

  it('Faible + frais reste raisonnable (< 500 mL/h)', () => {
    const ml = hydrationByProfil('Faible', 5);
    expect(ml).toBeLessThan(500);
  });

  it('Modéré 15°C correspond à la table (550 mL/h)', () => {
    expect(hydrationByProfil('Modéré', 15)).toBe(550);
  });
});

describe('sodiumByProfil', () => {
  it('Salty sweater = 1200 mg/L', () => {
    expect(sodiumByProfil('Salty sweater')).toBe(1200);
  });
  it('Faible = 400 mg/L', () => {
    expect(sodiumByProfil('Faible')).toBe(400);
  });
});

describe('caffeineDose — 3 mg/kg cible (Spriet 2014) + split pré/boost', () => {
  it('Mode Premier = ZÉRO caféine (pas 3 mg/kg, vraiment 0)', () => {
    const r = caffeineDose(70, '3+ cafés/j', true);
    expect(r.preRaceMg).toBe(0);
    expect(r.boostMg).toBe(0);
  });

  it('Habitude caféine = Aucune → pas de caféine (l\'user a dit non)', () => {
    const r = caffeineDose(70, 'Aucune', false);
    expect(r.preRaceMg).toBe(0);
    expect(r.boostMg).toBe(0);
  });

  it('Femme 55 kg, 1-2 cafés/j → ~165 mg pré (3 mg/kg), pas 220 mg (ex-4 mg/kg)', () => {
    const r = caffeineDose(55, '1-2 cafés/j', false);
    expect(r.preRaceMg).toBeGreaterThanOrEqual(155);
    expect(r.preRaceMg).toBeLessThanOrEqual(170);
  });

  it('Boost final = 50 mg fixe (gel caféiné standard), indépendant du poids', () => {
    const r1 = caffeineDose(55, '1-2 cafés/j', false);
    const r2 = caffeineDose(85, '1-2 cafés/j', false);
    expect(r1.boostMg).toBe(50);
    expect(r2.boostMg).toBe(50);
  });

  it('Total combiné reste ≤ 5 mg/kg (cap sécurité Spriet)', () => {
    const r = caffeineDose(55, '1-2 cafés/j', false);
    expect(r.mgPerKgTotal).toBeLessThanOrEqual(5);
  });

  it('3+ cafés/j réduit la dose pré (-17% : 2.5 mg/kg au lieu de 3)', () => {
    const normal = caffeineDose(70, '1-2 cafés/j', false);
    const reduced = caffeineDose(70, '3+ cafés/j', false);
    expect(reduced.preRaceMg).toBeLessThan(normal.preRaceMg);
  });
});

describe('computeNutrition — intégration doctrine', () => {
  it('Mode Premier cap glucides à 60 g/h', () => {
    const r = computeNutrition({
      sexe: 'H',
      poidsKg: 70,
      niveau: 'Débutant',
      premierMode: true,
      chronoSec: 3 * 3600, // sub-3h, normalement 80 g/h
      tempC: 15,
      hygrometrie: 'Standard',
      expNutrition: 'Habitué',
      sudation: 'Modéré',
      cafeineHabit: 'Aucune',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
  });

  it('Mode Premier = zéro caféine (preRace + boost tous deux = 0)', () => {
    const r = computeNutrition({
      sexe: 'F',
      poidsKg: 55,
      niveau: 'Débutant',
      premierMode: true,
      chronoSec: 3.5 * 3600,
      tempC: 15,
      hygrometrie: 'Standard',
      expNutrition: 'Habitué',
      sudation: 'Modéré',
      cafeineHabit: '1-2 cafés/j',
    });
    expect(r.caffeinePreRace).toBe(0);
    expect(r.caffeineBoost).toBe(0);
  });

  it('Cap hydratation 1000 mL/h respecté même conditions extrêmes', () => {
    const r = computeNutrition({
      sexe: 'H',
      poidsKg: 70,
      niveau: 'Expert',
      premierMode: false,
      chronoSec: 3 * 3600,
      tempC: 35,
      hygrometrie: 'Humide',
      expNutrition: 'Habitué',
      sudation: 'Salty sweater',
      cafeineHabit: '1-2 cafés/j',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(1000);
  });

  it('Aucun champ "poids" / "weight" / "imc" visible dans le résultat sérialisé', () => {
    const r = computeNutrition({
      sexe: 'H',
      poidsKg: 70,
      niveau: 'Régulier',
      premierMode: false,
      chronoSec: 3.5 * 3600,
      tempC: 15,
      hygrometrie: 'Standard',
      expNutrition: 'Habitué',
      sudation: 'Modéré',
      cafeineHabit: '1-2 cafés/j',
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/poids/i);
    expect(json).not.toMatch(/weight/i);
    expect(json).not.toMatch(/imc|bmi/i);
  });

  it('B1+B2 fix : Jamais nutrition recalibre min/max ET target (cohérence affichage)', () => {
    const noob = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Débutant', premierMode: false,
      chronoSec: 4.7 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    // Plancher 40 g/h (Pfeiffer 2012)
    expect(noob.carbsPerHour.target).toBeGreaterThanOrEqual(40);
    expect(noob.carbsPerHour.min).toBeGreaterThanOrEqual(40);
    // Cohérence : target doit être entre min et max
    expect(noob.carbsPerHour.target).toBeGreaterThanOrEqual(noob.carbsPerHour.min);
    expect(noob.carbsPerHour.target).toBeLessThanOrEqual(noob.carbsPerHour.max);
  });

  it('B4 fix : hydratation pondérée par poids (105 kg > 70 kg pour mêmes conditions)', () => {
    const light = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Régulier', premierMode: false,
      chronoSec: 4.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: 'Aucune',
    });
    const heavy = computeNutrition({
      sexe: 'H', poidsKg: 105, niveau: 'Débutant', premierMode: false,
      chronoSec: 4.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: 'Aucune',
    });
    expect(heavy.hydrationPerHour).toBeGreaterThan(light.hydrationPerHour);
  });

  it('B5 fix : warning chaleur si T° >= 25°C', () => {
    const hot = computeNutrition({
      sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false,
      chronoSec: 4.5 * 3600, tempC: 30, hygrometrie: 'Humide',
      expNutrition: 'Occasionnel', sudation: 'Salty sweater', cafeineHabit: '1-2 cafés/j',
    });
    expect(hot.warnings.some(w => /chaleur|>25|épuisement thermique/i.test(w))).toBe(true);
    // Combo chaleur + caféine = warning supplémentaire
    expect(hot.warnings.some(w => /caféine.*30%|thermogenèse/i.test(w))).toBe(true);
  });

  it('B5 fix : warning froid si T° <= 8°C (soif émoussée Kenefick 2004)', () => {
    const cold = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3 * 3600, tempC: 4, hygrometrie: 'Sec',
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '3+ cafés/j',
    });
    expect(cold.warnings.some(w => /froid|soif.*trompeuse|Kenefick/i.test(w))).toBe(true);
  });

  it('Ratio glucose/fructose : warning si target ≥ 60 g/h', () => {
    const high = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(high.warnings.some(w => /glucose.*fructose|SGLT1|2:1/i.test(w))).toBe(true);
  });

  it('Expérience nutrition = Jamais réduit la cible glucides de 20%', () => {
    const expert = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    const noob = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    expect(noob.carbsPerHour.target).toBeLessThan(expert.carbsPerHour.target);
  });
});
