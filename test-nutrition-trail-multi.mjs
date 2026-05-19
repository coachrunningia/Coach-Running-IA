#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Script de simulation : NutritionTrailPage — 25 profils
// Reproduit fidèlement les fonctions de src/components/tools/NutritionTrailPage.tsx
// (extraction au 2026-05-18)
// Usage : node test-nutrition-trail-multi.mjs
// ─────────────────────────────────────────────────────────────────────────────

// ─── HELPERS DE CALCUL (copie 1:1 du composant) ───

const formatDuration = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

const distanceEquivalenteITRA = (distanceKm, dPlus, dMinus) =>
  Math.round((distanceKm + dPlus / 100 + dMinus / 400) * 10) / 10;

const carbsByTrailDuration = (durationSec) => {
  const h = durationSec / 3600;
  if (h < 1) return { min: 0, max: 30, target: 15 };
  if (h < 2) return { min: 30, max: 60, target: 45 };
  if (h < 3) return { min: 60, max: 90, target: 70 };
  if (h < 6) return { min: 60, max: 90, target: 75 };
  if (h < 12) return { min: 70, max: 100, target: 80 };
  if (h < 24) return { min: 60, max: 90, target: 70 };
  return { min: 50, max: 80, target: 60 };
};

const hydrationByProfil = (sudation, tempC, poidsKg = 70) => {
  const tempBucket = tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;
  const table = {
    Faible:          [350, 450, 550, 650],
    Modéré:          [450, 550, 650, 800],
    Élevé:           [550, 650, 800, 900],
    'Salty sweater': [600, 700, 850, 950],
  };
  let ml = table[sudation][tempBucket];
  const weightFactor = Math.min(1.25, Math.max(0.85, 1 + (poidsKg - 70) * 0.005));
  ml = Math.round(ml * weightFactor);
  if (ml > 1000) ml = 1000;
  return ml;
};

const sodiumByProfil = (sudation) => ({
  Faible: 400, Modéré: 600, Élevé: 900, 'Salty sweater': 1200,
}[sudation]);

const caffeineDose = (poidsKg, cafeineHabit, premierMode, durationSec) => {
  if (premierMode || cafeineHabit === 'Aucune') {
    return { preRaceMg: 0, inRaceMgPerDose: 0, mgPerKgTotal: 0 };
  }
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round((poidsKg * mgPerKgPre) / 5) * 5;
  const inRaceMgPerDose = durationSec >= 3 * 3600 ? Math.round((poidsKg * 1) / 10) * 10 : 0;
  const nbInRace = durationSec >= 3 * 3600 ? Math.floor((durationSec / 3600 - 3) / 2.5) + 1 : 0;
  const totalMg = preRaceMg + inRaceMgPerDose * nbInRace;
  const mgPerKgTotal = Math.round((totalMg / poidsKg) * 10) / 10;
  return { preRaceMg, inRaceMgPerDose, mgPerKgTotal };
};

const KCAL_PER_HOUR_TRAIL_CAP = 1000;
const kcalPerHourTrail = (poidsKg, dPlus, dMinus, durationSec) => {
  const h = durationSec / 3600;
  if (h <= 0) return 0;
  const mGrimpesParH = dPlus / h;
  const mDescendusParH = dMinus / h;
  const kcal = poidsKg * (5 + mGrimpesParH * 0.012 + mDescendusParH * 0.0035);
  return Math.min(KCAL_PER_HOUR_TRAIL_CAP, Math.max(0, Math.round(kcal)));
};

const computeNutrition = (p) => {
  const {
    sexe, poidsKg, premierMode, distanceKm, dPlus, dMinus, durationSec,
    tempC, hygrometrie, altitude, basesDeVie,
    expNutrition, sudation, cafeineHabit,
  } = p;
  const warnings = [];
  const durationHours = durationSec / 3600;
  const dEq = distanceEquivalenteITRA(distanceKm, dPlus, dMinus);

  if (durationHours > 30) {
    warnings.push('Effort >30 h : approche personnalisée recommandée');
  }

  // Glucides
  const carbsBase = carbsByTrailDuration(durationSec);
  let target = carbsBase.target;
  let carbsMin = carbsBase.min;
  let carbsMax = carbsBase.max;

  if (expNutrition === 'Jamais') {
    target = Math.max(30, Math.round(target * 0.8));
    carbsMin = Math.max(20, Math.round(carbsMin * 0.8));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.8));
    warnings.push('Cible -20% (Jamais nutrition course)');
  }
  if (sexe === 'F' && target > 0) {
    target = Math.max(15, Math.round(target * 0.9));
    carbsMin = Math.max(10, Math.round(carbsMin * 0.9));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.9));
    warnings.push('Cible -10% (femme, oxydation glucidique exogène)');
  }
  if (premierMode && target > 60) {
    target = 60;
    carbsMax = 60;
    carbsMin = 50;
    warnings.push('Mode Premier ultra : cap 60 g/h');
  }
  if (target >= 60) {
    warnings.push('≥60 g/h : gels glucose:fructose 2:1 obligatoires');
  }
  const carbsPerHour = { min: carbsMin, max: carbsMax, target };
  const totalCarbs = Math.round((target * durationSec) / 3600);

  // Hydratation
  let hydrationPerHour = hydrationByProfil(sudation, tempC, poidsKg);
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  if (altitude === '1500-2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.1);
    warnings.push('Altitude 1500-2500m : +10% hydratation');
  }
  if (altitude === '>2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.15);
    warnings.push('Altitude >2500m : +15% hydratation');
    warnings.push('Risque MAM');
  }
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) warnings.push('Hydratation >800mL/h : surveille EAH');
  if (tempC >= 25) warnings.push('Trail >25°C : ralentir 15-20%');
  if (tempC >= 25 && cafeineHabit !== 'Aucune') warnings.push('Chaleur+caféine : -30% pré-course');
  if (tempC <= 8) warnings.push('Froid : soif trompeuse');
  if (durationHours >= 4) warnings.push('Effort >4h : risque EAH');

  const hydrationPauseFactor = durationHours > 12 ? 0.85 : 1;
  const totalHydration = Math.round((hydrationPerHour * durationSec / 3600) * hydrationPauseFactor);
  if (durationHours > 12) warnings.push('Total hydra pondéré -15% (pauses bases de vie)');

  // Sodium
  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = Math.round((sodiumPerLiter * totalHydration) / 1000);

  // Caféine
  let { preRaceMg: caffeinePreRace, inRaceMgPerDose: caffeineInRaceMgPerDose, mgPerKgTotal } =
    caffeineDose(poidsKg, cafeineHabit, premierMode, durationSec);
  const CAFFEINE_HARD_CAP_MG_PER_KG = 6;
  const maxTotalMg = poidsKg * CAFFEINE_HARD_CAP_MG_PER_KG;
  if (caffeineInRaceMgPerDose > 0 && durationHours >= 3) {
    const nbInRaceRaw = Math.floor((durationHours - 3) / 2.5) + 1;
    const naturalTotal = caffeinePreRace + caffeineInRaceMgPerDose * nbInRaceRaw;
    if (naturalTotal > maxTotalMg) {
      const allowedInRace = Math.max(0, maxTotalMg - caffeinePreRace);
      const allowedDoses = Math.max(0, Math.floor(allowedInRace / caffeineInRaceMgPerDose));
      const cappedTotal = caffeinePreRace + caffeineInRaceMgPerDose * allowedDoses;
      mgPerKgTotal = Math.round((cappedTotal / poidsKg) * 10) / 10;
      if (allowedDoses < nbInRaceRaw) warnings.push(`Caféine plafonnée à 6mg/kg/24h (${allowedDoses} prises max)`);
    }
  } else if (mgPerKgTotal > CAFFEINE_HARD_CAP_MG_PER_KG) {
    const cappedPre = Math.round((maxTotalMg) / 5) * 5;
    caffeinePreRace = Math.min(caffeinePreRace, cappedPre);
    mgPerKgTotal = Math.round((caffeinePreRace / poidsKg) * 10) / 10;
    warnings.push('Caféine plafonnée 6mg/kg');
  }

  // Protéines
  const showProteins = durationHours >= 4;
  const proteinsPerHour = showProteins ? 7 : 0;
  const totalProteins = Math.round(proteinsPerHour * Math.max(0, durationHours - 3));

  // Energy
  const kcalPerHour = kcalPerHourTrail(poidsKg, dPlus, dMinus, durationSec);
  if (kcalPerHour >= KCAL_PER_HOUR_TRAIL_CAP) {
    const mGrimpesParH = dPlus / Math.max(0.01, durationHours);
    if (mGrimpesParH > 800) warnings.push('Cap 1000kcal/h (VK)');
  }
  const totalKcal = Math.round((kcalPerHour * durationSec) / 3600);

  // Pack
  const carbsPerGel = 25;
  const nbGels = Math.max(0, Math.ceil((totalCarbs - 30 - basesDeVie * 40) / carbsPerGel));
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl / Math.max(1, basesDeVie + 1)));
  const sodiumPerCap = 500;
  const nbCapsSel = (sudation === 'Salty sweater' || sudation === 'Élevé')
    ? Math.max(1, Math.ceil((totalSodium - sodiumPerLiter * (totalHydration / 1000) * 0.7) / sodiumPerCap))
    : 0;

  return {
    distanceKm, dPlus, dMinus, distanceEquivalenteITRA: dEq,
    durationSec, durationLabel: formatDuration(durationSec), durationHours,
    kcalPerHour, totalKcal,
    carbsPerHour, totalCarbs,
    hydrationPerHour, totalHydration,
    sodiumPerLiter, totalSodium,
    caffeinePreRace, caffeineInRaceMgPerDose, caffeineDoseMgPerKgTotal: mgPerKgTotal,
    proteinsPerHour, totalProteins,
    nbGels, nbBidons, nbCapsSel,
    premierMode, warnings, basesDeVie, showProteins,
  };
};

// ─── PROFILS DE TEST ───

const PROFILS = [
  // === Trails courts ===
  { id: 1, label: 'T-10km / 1h00 / 60kg H / Confirmé / frais',
    sexe: 'H', poidsKg: 60, niveau: 'Confirmé', premierMode: false,
    distanceKm: 10, dPlus: 200, dMinus: 200, durationSec: 1 * 3600,
    tempC: 15, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 0,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 2, label: 'T-15km / 1h45 / 75kg H / Confirmé / vallonné',
    sexe: 'H', poidsKg: 75, niveau: 'Confirmé', premierMode: false,
    distanceKm: 15, dPlus: 500, dMinus: 500, durationSec: 1 * 3600 + 45 * 60,
    tempC: 15, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 0,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 3, label: 'T-20km / 2h30 / 55kg F / Confirmé / chaud 25°',
    sexe: 'F', poidsKg: 55, niveau: 'Confirmé', premierMode: false,
    distanceKm: 20, dPlus: 600, dMinus: 600, durationSec: 2 * 3600 + 30 * 60,
    tempC: 25, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 0,
    expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j' },
  { id: 4, label: 'T-25km / 3h00 / 80kg H / Régulier / frais',
    sexe: 'H', poidsKg: 80, niveau: 'Régulier', premierMode: false,
    distanceKm: 25, dPlus: 800, dMinus: 800, durationSec: 3 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 0,
    expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },

  // === Trails moyens (CAS CHALLENGÉ) ===
  { id: 5, label: '⭐T-27km / 4h15 / 55kg F / Confirmé (CAS PROBLEME)',
    sexe: 'F', poidsKg: 55, niveau: 'Confirmé', premierMode: false,
    distanceKm: 27, dPlus: 1000, dMinus: 1000, durationSec: 4 * 3600 + 15 * 60,
    tempC: 15, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 1,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 6, label: 'T-30km / 4h30 / 70kg H / Confirmé / chaud 28°',
    sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
    distanceKm: 30, dPlus: 1200, dMinus: 1200, durationSec: 4 * 3600 + 30 * 60,
    tempC: 28, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 1,
    expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j' },
  { id: 7, label: 'T-35km / 5h00 / 65kg F / Expert / frais',
    sexe: 'F', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 35, dPlus: 1500, dMinus: 1500, durationSec: 5 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 1,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 8, label: 'T-42km / 6h30 / 80kg H / Confirmé / vallonné 1500D+',
    sexe: 'H', poidsKg: 80, niveau: 'Confirmé', premierMode: false,
    distanceKm: 42, dPlus: 1500, dMinus: 1500, durationSec: 6 * 3600 + 30 * 60,
    tempC: 16, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 2,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 9, label: 'T-45km / 7h00 / 75kg H / Expert / montagne 2500D+',
    sexe: 'H', poidsKg: 75, niveau: 'Expert', premierMode: false,
    distanceKm: 45, dPlus: 2500, dMinus: 2500, durationSec: 7 * 3600,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 2,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 10, label: 'T-50km / 8h00 / 60kg F / Expert / nuit',
    sexe: 'F', poidsKg: 60, niveau: 'Expert', premierMode: false,
    distanceKm: 50, dPlus: 2000, dMinus: 2000, durationSec: 8 * 3600,
    tempC: 10, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 2,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },

  // === Trails longs ===
  { id: 11, label: 'T-55km / 10h00 / 75kg H / Expert / vallonné',
    sexe: 'H', poidsKg: 75, niveau: 'Expert', premierMode: false,
    distanceKm: 55, dPlus: 2200, dMinus: 2200, durationSec: 10 * 3600,
    tempC: 16, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 3,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 12, label: 'T-60km / 11h00 / 55kg F / Expert / frais',
    sexe: 'F', poidsKg: 55, niveau: 'Expert', premierMode: false,
    distanceKm: 60, dPlus: 2500, dMinus: 2500, durationSec: 11 * 3600,
    tempC: 13, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 3,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 13, label: 'OCC-55km / 9h30 / 70kg H / Expert / mont 3000D+',
    sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
    distanceKm: 56, dPlus: 3500, dMinus: 3500, durationSec: 9 * 3600 + 30 * 60,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 2,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 14, label: 'CCC-100km / 17h00 / 65kg F / Expert',
    sexe: 'F', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 100, dPlus: 6100, dMinus: 6100, durationSec: 17 * 3600,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 4,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 15, label: 'T-80km / 14h00 / 85kg H / Expert / chaud',
    sexe: 'H', poidsKg: 85, niveau: 'Expert', premierMode: false,
    distanceKm: 80, dPlus: 3000, dMinus: 3000, durationSec: 14 * 3600,
    tempC: 26, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 3,
    expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j' },

  // === Ultras ===
  { id: 16, label: 'UTMB-170km / 32h00 / 70kg H / Expert / extrême',
    sexe: 'H', poidsKg: 70, niveau: 'Expert', premierMode: false,
    distanceKm: 170, dPlus: 10000, dMinus: 10000, durationSec: 32 * 3600,
    tempC: 15, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 6,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 17, label: 'Hardrock-160km / 35h00 / 65kg H / Expert / alt>3000m',
    sexe: 'H', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 160, dPlus: 10000, dMinus: 10000, durationSec: 35 * 3600,
    tempC: 10, hygrometrie: 'Sec', altitude: '>2500m', basesDeVie: 6,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 18, label: 'Diagonale-165km / 28h00 / 60kg F / Expert / tropic',
    sexe: 'F', poidsKg: 60, niveau: 'Expert', premierMode: false,
    distanceKm: 165, dPlus: 9600, dMinus: 9600, durationSec: 28 * 3600,
    tempC: 22, hygrometrie: 'Humide', altitude: '1500-2500m', basesDeVie: 5,
    expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j' },
  { id: 19, label: 'TorDesGeants-330km / 100h00 / 75kg H / Expert',
    sexe: 'H', poidsKg: 75, niveau: 'Expert', premierMode: false,
    distanceKm: 330, dPlus: 24000, dMinus: 24000, durationSec: 50 * 3600,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 10,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },

  // === Cas particuliers ===
  { id: 20, label: 'T-30km / 4h30 / 95kg H BMI30 / Régulier débutant trail',
    sexe: 'H', poidsKg: 95, niveau: 'Régulier', premierMode: true,
    distanceKm: 30, dPlus: 1000, dMinus: 1000, durationSec: 4 * 3600 + 30 * 60,
    tempC: 14, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 1,
    expNutrition: 'Occasionnel', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j' },
  { id: 21, label: 'T-25km / 5h00 / 50kg F / Débutant lent',
    sexe: 'F', poidsKg: 50, niveau: 'Débutant', premierMode: true,
    distanceKm: 25, dPlus: 800, dMinus: 800, durationSec: 5 * 3600,
    tempC: 16, hygrometrie: 'Standard', altitude: 'Mer/<500m', basesDeVie: 1,
    expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune' },
  { id: 22, label: 'T-50km / 12h00 / 70kg H / Débutant Finisher',
    sexe: 'H', poidsKg: 70, niveau: 'Débutant', premierMode: true,
    distanceKm: 50, dPlus: 2000, dMinus: 2000, durationSec: 12 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 3,
    expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: 'Aucune' },
  { id: 23, label: 'VK-5km / 1h00 / 65kg H / Expert / 1000D+',
    sexe: 'H', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 5, dPlus: 1000, dMinus: 0, durationSec: 1 * 3600,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m', basesDeVie: 0,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 24, label: 'T-100km / 13h00 / 65kg H / Élite rapide',
    sexe: 'H', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 100, dPlus: 3000, dMinus: 3000, durationSec: 13 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 4,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 25, label: 'T-130km / 25h00 / 75kg H / Confirmé lent',
    sexe: 'H', poidsKg: 75, niveau: 'Confirmé', premierMode: false,
    distanceKm: 130, dPlus: 5000, dMinus: 5000, durationSec: 25 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: '500-1500m', basesDeVie: 5,
    expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
];

// ─── EXECUTION ───
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SIMULATION NUTRITION TRAIL — 25 PROFILS');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

const results = PROFILS.map(p => ({ p, r: computeNutrition(p) }));

results.forEach(({ p, r }) => {
  console.log(`─── #${p.id}  ${p.label} ───`);
  console.log(`Durée: ${r.durationLabel} | D_eq ITRA: ${r.distanceEquivalenteITRA} km`);
  console.log(`Glucides: ${r.carbsPerHour.target} g/h (plage ${r.carbsPerHour.min}-${r.carbsPerHour.max}) | Total ${r.totalCarbs} g`);
  console.log(`Hydra: ${r.hydrationPerHour} mL/h | Total ${r.totalHydration} mL (${(r.totalHydration/1000).toFixed(1)} L)`);
  console.log(`Sodium: ${r.sodiumPerLiter} mg/L | Total ${r.totalSodium} mg`);
  console.log(`Caféine: pré ${r.caffeinePreRace} mg | dose course ${r.caffeineInRaceMgPerDose} mg | total ${r.caffeineDoseMgPerKgTotal} mg/kg`);
  if (r.showProteins) console.log(`Protéines: ${r.proteinsPerHour} g/h | Total ${r.totalProteins} g`);
  console.log(`kcal: ${r.kcalPerHour} kcal/h | Total ${r.totalKcal}`);
  console.log(`PACK: ${r.nbGels} gels | ${r.nbBidons} bidons (500mL) | ${r.nbCapsSel} caps sel`);
  console.log(`Warnings (${r.warnings.length}): ${r.warnings.slice(0, 3).join(' / ')}${r.warnings.length > 3 ? ` (+${r.warnings.length - 3})` : ''}`);
  console.log('');
});

// ─── TABLE SYNTHÈSE ───
console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('SYNTHESE TABULAIRE');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('ID | Label                                              | Gels | Bidons | Caps | g/h | mL/h | Total gluc | Total hydra | Prot');
console.log('---|----------------------------------------------------|------|--------|------|-----|------|------------|-------------|-----');
results.forEach(({ p, r }) => {
  const lbl = p.label.padEnd(50).slice(0, 50);
  console.log(
    `${String(p.id).padStart(2)} | ${lbl} | ${String(r.nbGels).padStart(4)} | ${String(r.nbBidons).padStart(6)} | ${String(r.nbCapsSel).padStart(4)} | ${String(r.carbsPerHour.target).padStart(3)} | ${String(r.hydrationPerHour).padStart(4)} | ${String(r.totalCarbs).padStart(10)} | ${String(r.totalHydration).padStart(11)} | ${r.showProteins ? String(r.totalProteins).padStart(4) : '   -'}`
  );
});

// Export JSON pour usage ultérieur
import { writeFileSync } from 'fs';
writeFileSync(
  '/Users/romanemarino/Coach-Running-IA/test-nutrition-trail-multi-results.json',
  JSON.stringify(results, null, 2)
);
console.log('\nRésultats JSON écrits dans test-nutrition-trail-multi-results.json');
