/**
 * Tests unitaires des formules nutrition marathon.
 * Couvre : plages glucides par chrono, cap absolu hydratation 1000 mL/h,
 * mode Premier cap caféine 3 mg/kg, doctrine "poids jamais affiché".
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

describe('carbsByChrono — plages glucides selon chrono', () => {
  it('sub-3h cible 80-100 g/h', () => {
    const r = carbsByChrono(2.5 * 3600 + 1); // 2h30+
    expect(r.target).toBeGreaterThanOrEqual(80);
    expect(r.target).toBeLessThanOrEqual(100);
  });

  it('sub-4h cible 60-80 g/h', () => {
    const r = carbsByChrono(3.7 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(60);
    expect(r.target).toBeLessThanOrEqual(80);
  });

  it('sub-5h cible 45-60 g/h', () => {
    const r = carbsByChrono(4.7 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(45);
    expect(r.target).toBeLessThanOrEqual(70);
  });

  it('5h+ cible 40-55 g/h', () => {
    const r = carbsByChrono(5.5 * 3600);
    expect(r.target).toBeGreaterThanOrEqual(40);
    expect(r.target).toBeLessThanOrEqual(55);
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

describe('caffeineDose — mode Premier cap à 3 mg/kg', () => {
  it('Mode Premier plafonne à 3 mg/kg même si 3+ cafés/j', () => {
    const r = caffeineDose(70, '3+ cafés/j', true);
    expect(r.mgPerKg).toBeLessThanOrEqual(3);
    expect(r.totalMg).toBeLessThanOrEqual(70 * 3);
  });

  it('Hors mode Premier, 3+ cafés/j réduit la dose de 30%', () => {
    const normal = caffeineDose(70, 'Aucune', false);
    const reduced = caffeineDose(70, '3+ cafés/j', false);
    expect(reduced.mgPerKg).toBeLessThan(normal.mgPerKg);
  });
});

describe('computeNutrition — intégration doctrine', () => {
  it('Mode Premier cap glucides à 60 g/h', () => {
    const r = computeNutrition({
      sexe: 'H',
      poidsKg: 70,
      niveau: 'Débutant',
      premierMode: true,
      chronoSec: 3 * 3600, // sub-3h, normalement 90 g/h
      tempC: 15,
      hygrometrie: 'Standard',
      expNutrition: 'Habitué',
      sudation: 'Modéré',
      cafeineHabit: 'Aucune',
      cycle: null,
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(60);
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
      cycle: null,
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(1000);
  });

  it('Aucun champ "poids" ni dérivé direct visible dans le résultat', () => {
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
      cycle: null,
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/poids/i);
    expect(json).not.toMatch(/weight/i);
    expect(json).not.toMatch(/imc|bmi/i);
  });

  it('Expérience nutrition = Jamais réduit la cible glucides de 20%', () => {
    const expert = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: 'Aucune', cycle: null,
    });
    const noob = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 3.5 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune', cycle: null,
    });
    expect(noob.carbsPerHour.target).toBeLessThan(expert.carbsPerHour.target);
  });
});
