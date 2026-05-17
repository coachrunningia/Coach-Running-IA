/**
 * Tests unitaires des formules nutrition semi-marathon.
 * Couvre : plages glucides par chrono (mouth rinse <1h15, gel optionnel 1h15-1h30, etc.),
 * stratégie selon chrono (mouth_rinse / gel_optional / gels_recommended / marathon_approach),
 * cap absolu hydratation 1000 mL/h (Hew-Butler 2015 EAH),
 * Mode Premier (cap glucides 30 g/h, cap hydratation 600 mL/h, zéro caféine),
 * pas de boost final caféine (course trop courte),
 * sodium non obligatoire <1h30,
 * doctrine "poids jamais affiché dans output".
 *
 * Lancer : npx vitest run src/components/tools/__tests__/nutritionSemiMarathon.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  carbsBySemiTime,
  hydrationByProfil,
  sodiumByProfil,
  caffeineDose,
  strategyForChrono,
  computeNutrition,
} from '../NutritionSemiMarathonPage';

describe('carbsBySemiTime — plages honnêtes selon chrono', () => {
  it('sub-1h15 (1h10) : 0 g/h (mouth rinse suffit)', () => {
    const r = carbsBySemiTime(70 * 60);
    expect(r.target).toBe(0);
  });

  it('sub-1h30 (1h20) : 20-30 g/h (1 gel optionnel)', () => {
    const r = carbsBySemiTime(80 * 60);
    expect(r.target).toBeGreaterThanOrEqual(20);
    expect(r.target).toBeLessThanOrEqual(30);
  });

  it('sub-2h (1h50) : 40-60 g/h (2 gels recommandés)', () => {
    const r = carbsBySemiTime(110 * 60);
    expect(r.target).toBeGreaterThanOrEqual(40);
    expect(r.target).toBeLessThanOrEqual(60);
  });

  it('sub-2h30 (2h15) : 45-75 g/h', () => {
    const r = carbsBySemiTime(135 * 60);
    expect(r.target).toBeGreaterThanOrEqual(45);
    expect(r.target).toBeLessThanOrEqual(75);
  });

  it('2h30+ : 60-90 g/h (approche marathon)', () => {
    const r = carbsBySemiTime(170 * 60);
    expect(r.target).toBeGreaterThanOrEqual(60);
    expect(r.target).toBeLessThanOrEqual(90);
  });
});

describe('strategyForChrono — réponse honnête "faut-il manger ?"', () => {
  it('sub-1h15 → mouth_rinse', () => {
    const s = strategyForChrono(70 * 60);
    expect(s.strategy).toBe('mouth_rinse');
    expect(s.label).toMatch(/mouth rinse|rinçage/i);
  });

  it('1h15-1h30 → gel_optional', () => {
    const s = strategyForChrono(80 * 60);
    expect(s.strategy).toBe('gel_optional');
  });

  it('1h30-2h30 → gels_recommended', () => {
    const s90 = strategyForChrono(95 * 60);
    const s2h = strategyForChrono(120 * 60);
    expect(s90.strategy).toBe('gels_recommended');
    expect(s2h.strategy).toBe('gels_recommended');
  });

  it('2h30+ → marathon_approach', () => {
    const s = strategyForChrono(170 * 60);
    expect(s.strategy).toBe('marathon_approach');
  });
});

describe('hydrationByProfil — cap absolu 1000 mL/h', () => {
  it('Salty sweater + très chaud (40°C) ne dépasse jamais 1000 mL/h', () => {
    const ml = hydrationByProfil('Salty sweater', 40);
    expect(ml).toBeLessThanOrEqual(1000);
  });

  it('Modéré 15°C correspond à la table (500 mL/h)', () => {
    expect(hydrationByProfil('Modéré', 15)).toBe(500);
  });
});

describe('caffeineDose semi — pas de boost final', () => {
  it('Mode Premier = ZÉRO caféine', () => {
    const r = caffeineDose(70, '3+ cafés/j', true);
    expect(r.preRaceMg).toBe(0);
  });

  it('Habitué : 3 mg/kg pré-course', () => {
    const r = caffeineDose(70, '1-2 cafés/j', false);
    expect(r.preRaceMg).toBeGreaterThanOrEqual(195);
    expect(r.preRaceMg).toBeLessThanOrEqual(220);
  });

  it('3+ cafés/j réduit la dose pré (-17%)', () => {
    const normal = caffeineDose(70, '1-2 cafés/j', false);
    const reduced = caffeineDose(70, '3+ cafés/j', false);
    expect(reduced.preRaceMg).toBeLessThan(normal.preRaceMg);
  });
});

describe('computeNutrition semi — intégration doctrine + sécurité', () => {
  it('Mode Premier cap glucides à 30 g/h', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Débutant', premierMode: true,
      chronoSec: 2 * 3600,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: 'Aucune',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(30);
  });

  it('Mode Premier cap hydratation 600 mL/h', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 55, niveau: 'Débutant', premierMode: true,
      chronoSec: 2 * 3600,
      tempC: 28, hygrometrie: 'Humide', expNutrition: 'Habitué',
      sudation: 'Élevé', cafeineHabit: 'Aucune',
    });
    expect(r.hydrationPerHour).toBeLessThanOrEqual(600);
  });

  it('Mode Premier = zéro caféine', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 55, niveau: 'Débutant', premierMode: true,
      chronoSec: 1.8 * 3600,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.caffeinePreRace).toBe(0);
  });

  it('Sub-1h15 : strategy = mouth_rinse + 0 gels', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 70 * 60,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.strategy).toBe('mouth_rinse');
    expect(r.nbGels).toBe(0);
    expect(r.totalCarbs).toBe(0);
  });

  it('Sodium pas calculé en total <1h30', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 80 * 60,    // 1h20
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.totalSodium).toBe(0);
  });

  it('Sodium calculé pour ≥1h30', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 2 * 3600,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.totalSodium).toBeGreaterThan(0);
  });

  it('DOCTRINE — Aucun champ "poids" / "weight" / "imc" visible dans le résultat sérialisé', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 1.5 * 3600,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/poids/i);
    expect(json).not.toMatch(/weight/i);
    expect(json).not.toMatch(/imc|bmi/i);
  });

  it('Warning chaleur si T° >= 25°C', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 2 * 3600,
      tempC: 28, hygrometrie: 'Humide', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /chaleur|>25|épuisement|ralentis/i.test(w))).toBe(true);
  });

  it('Sub-1h15 total hydratation <= 500 mL (hors chaleur)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 70 * 60,
      tempC: 15, hygrometrie: 'Standard', expNutrition: 'Habitué',
      sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.totalHydration).toBeLessThanOrEqual(500);
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
