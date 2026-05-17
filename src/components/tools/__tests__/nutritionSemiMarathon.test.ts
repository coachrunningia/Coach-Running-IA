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

  it('1h30-1h45 → recommended_1_2', () => {
    const s = strategyForChrono(95 * 60);
    expect(s.strategy).toBe('recommended_1_2');
  });

  it('1h45-2h → recommended_2', () => {
    const s = strategyForChrono(115 * 60);
    expect(s.strategy).toBe('recommended_2');
  });

  it('2h-2h30 → recommended_2_3', () => {
    const s = strategyForChrono(130 * 60);
    expect(s.strategy).toBe('recommended_2_3');
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

// ─────────────────────────────────────────────────────────────────────────────
// FIXES EXPERT NUTRITIONNISTE — Semi B1, B2, B3, B4
// (audit TESTS-EXPERT-NUTRITION-SEMI-10-PROFILS.md, mai 2026)
// ─────────────────────────────────────────────────────────────────────────────

describe('Semi B1 — nbGels cohérent avec strategyLabel (doctrine honnêteté)', () => {
  const baseInput = (chronoSec: number) => ({
    sexe: 'H' as const, poidsKg: 70, niveau: 'Confirmé' as const, premierMode: false,
    chronoSec, tempC: 15, hygrometrie: 'Standard' as const,
    expNutrition: 'Habitué' as const, sudation: 'Modéré' as const, cafeineHabit: '1-2 cafés/j' as const,
  });

  it('mouth_rinse (sub-1h15) : 0 gels', () => {
    const r = computeNutrition(baseInput(70 * 60));
    expect(r.strategy).toBe('mouth_rinse');
    expect(r.nbGels).toBe(0);
  });

  it('gel_optional (1h15-1h30) : 1 gel max', () => {
    const r = computeNutrition(baseInput(80 * 60));
    expect(r.strategy).toBe('gel_optional');
    expect(r.nbGels).toBe(1);
  });

  it('recommended_1_2 (1h30-1h45) : 2 gels max (anti sur-prescription)', () => {
    const r = computeNutrition(baseInput(100 * 60));
    expect(r.strategy).toBe('recommended_1_2');
    expect(r.nbGels).toBe(2);
  });

  it('recommended_2 (1h45-2h, profil 4 Régulière F) : 2 gels max au lieu de 4', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false,
      chronoSec: 105 * 60, tempC: 16, hygrometrie: 'Standard',
      expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.strategy).toBe('recommended_2');
    expect(r.nbGels).toBe(2);
  });

  it('recommended_2_3 (2h-2h30) : 3 gels max', () => {
    const r = computeNutrition(baseInput(135 * 60));
    expect(r.strategy).toBe('recommended_2_3');
    expect(r.nbGels).toBe(3);
  });

  it('marathon_approach (>2h30) : nb gels théorique (ceil totalCarbs/25)', () => {
    const r = computeNutrition(baseInput(170 * 60));
    expect(r.strategy).toBe('marathon_approach');
    expect(r.nbGels).toBeGreaterThanOrEqual(3);
    expect(r.nbGels).toBe(Math.max(3, Math.ceil(r.totalCarbs / 25)));
  });

  it('totalCarbsEstimate exposé pour transparence (info, pas obligation)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 75, niveau: 'Régulier', premierMode: false,
      chronoSec: 2 * 3600, tempC: 22, hygrometrie: 'Humide',
      expNutrition: 'Occasionnel', sudation: 'Élevé', cafeineHabit: 'Aucune',
    });
    expect(r.totalCarbsEstimate).toBeGreaterThan(0);
    expect(r.nbGels).toBeLessThanOrEqual(3);
  });
});

describe('Semi B2 — strategyForChrono prend en compte premierMode', () => {
  it('Premier + marathon_approach : texte adapté, sans "caféine si habitué"', () => {
    const s = strategyForChrono(170 * 60, true);
    expect(s.strategy).toBe('marathon_approach');
    expect(s.detail).not.toMatch(/caféine si habitué/i);
    expect(s.detail).toMatch(/[Pp]remier|finir|testés/i);
  });

  it('Premier + recommended_2_3 : texte aligné Premier (cap 30 g/h)', () => {
    const s = strategyForChrono(130 * 60, true);
    expect(s.strategy).toBe('recommended_2_3');
    expect(s.detail).toMatch(/30 g\/h|TESTÉS|[Pp]remier/);
    expect(s.detail).not.toMatch(/caféine si habitué/i);
  });

  it('Non-Premier : texte standard conservé (mention caféine OK)', () => {
    const s = strategyForChrono(170 * 60, false);
    expect(s.detail).toMatch(/caféine/i);
  });

  it('strategyForChrono backward-compat : sans param premierMode → comportement non-Premier', () => {
    const s = strategyForChrono(170 * 60);
    expect(s.detail).toMatch(/caféine/i);
  });
});

describe('Semi B3 — Premier + Jamais testé : cap 20 g/h (Burke 2014)', () => {
  it('Premier + Jamais (chrono 2h) : target plafonné à 20 g/h', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 80, niveau: 'Débutant', premierMode: true,
      chronoSec: 2 * 3600, tempC: 2, hygrometrie: 'Sec',
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(20);
    expect(r.warnings.some(w => /20 g\/h|gut training|Burke/i.test(w))).toBe(true);
  });

  it('Premier + Occasionnel (gut training partiel) : cap reste à 30 g/h Premier', () => {
    const r = computeNutrition({
      sexe: 'F', poidsKg: 65, niveau: 'Débutant', premierMode: true,
      chronoSec: 135 * 60, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.carbsPerHour.target).toBeLessThanOrEqual(30);
    expect(r.carbsPerHour.target).toBeGreaterThan(20);
  });

  it('Non-Premier + Jamais : cap -20 % standard (pas le cap 20 g/h Premier+Jamais)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Régulier', premierMode: false,
      chronoSec: 2 * 3600, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.carbsPerHour.target).toBeGreaterThan(20);
  });
});

describe('Semi B4 — Auto-ajustement -30 % caféine si T° >= 25 °C + caféine', () => {
  it('Chaleur 30 °C + 1-2 cafés/j : dose pré-course réduite ≈ 30 % vs neutre', () => {
    const hot = computeNutrition({
      sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false,
      chronoSec: 150 * 60, tempC: 30, hygrometrie: 'Humide',
      expNutrition: 'Occasionnel', sudation: 'Salty sweater', cafeineHabit: '1-2 cafés/j',
    });
    const neutral = computeNutrition({
      sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false,
      chronoSec: 150 * 60, tempC: 15, hygrometrie: 'Standard',
      expNutrition: 'Occasionnel', sudation: 'Salty sweater', cafeineHabit: '1-2 cafés/j',
    });
    expect(hot.caffeinePreRace).toBeLessThan(neutral.caffeinePreRace);
    // ~30 % de moins → tolérance large pour arrondi multiple de 5
    expect(hot.caffeinePreRace).toBeLessThanOrEqual(Math.round(neutral.caffeinePreRace * 0.75));
  });

  it('Chaleur 28 °C sans caféine (Aucune) : reste à 0 mg', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 75, niveau: 'Régulier', premierMode: false,
      chronoSec: 2 * 3600, tempC: 28, hygrometrie: 'Humide',
      expNutrition: 'Occasionnel', sudation: 'Élevé', cafeineHabit: 'Aucune',
    });
    expect(r.caffeinePreRace).toBe(0);
  });

  it('Le warning "chaleur + caféine" reste affiché (transparence)', () => {
    const r = computeNutrition({
      sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
      chronoSec: 130 * 60, tempC: 27, hygrometrie: 'Standard',
      expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
    });
    expect(r.warnings.some(w => /chaleur.*caféine|thermogenèse|30 %/i.test(w))).toBe(true);
  });
});
