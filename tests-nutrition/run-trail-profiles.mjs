#!/usr/bin/env node
// Reproduction fidèle des formules de NutritionTrailPage.tsx (lignes 31-425)
// pour tester 10 profils ultra-trail. Aucune modification du code source.

// ─── HELPERS (copie 1:1 du source) ───
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

const sodiumByProfil = (sudation) =>
  ({ Faible: 400, Modéré: 600, Élevé: 900, 'Salty sweater': 1200 })[sudation];

const caffeineDose = (poidsKg, cafeineHabit, premierMode, durationSec) => {
  if (premierMode || cafeineHabit === 'Aucune') {
    return { preRaceMg: 0, inRaceMgPerDose: 0, mgPerKgTotal: 0, nbInRace: 0 };
  }
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round((poidsKg * mgPerKgPre) / 5) * 5;
  const inRaceMgPerDose = durationSec >= 3 * 3600 ? Math.round((poidsKg * 1) / 10) * 10 : 0;
  const nbInRace = durationSec >= 3 * 3600 ? Math.floor((durationSec / 3600 - 3) / 2.5) + 1 : 0;
  const totalMg = preRaceMg + inRaceMgPerDose * nbInRace;
  const mgPerKgTotal = Math.round((totalMg / poidsKg) * 10) / 10;
  return { preRaceMg, inRaceMgPerDose, mgPerKgTotal, nbInRace };
};

const kcalPerHourTrail = (poidsKg, dPlus, dMinus, durationSec) => {
  const h = durationSec / 3600;
  if (h <= 0) return 0;
  const mGrimpesParH = dPlus / h;
  const mDescendusParH = dMinus / h;
  const kcal = poidsKg * (5 + mGrimpesParH * 0.012 + mDescendusParH * 0.0035);
  return Math.max(0, Math.round(kcal));
};

const computeNutrition = (p) => {
  const warnings = [];
  const durationHours = p.durationSec / 3600;
  const dEq = distanceEquivalenteITRA(p.distanceKm, p.dPlus, p.dMinus);

  const carbsBase = carbsByTrailDuration(p.durationSec);
  let target = carbsBase.target;
  let carbsMin = carbsBase.min;
  let carbsMax = carbsBase.max;

  if (p.expNutrition === 'Jamais') {
    target = Math.max(30, Math.round(target * 0.8));
    carbsMin = Math.max(20, Math.round(carbsMin * 0.8));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.8));
    warnings.push("[GLUC -20%] aucune exp nutrition");
  }
  if (p.premierMode && target > 60) {
    target = 60;
    carbsMax = Math.min(carbsMax, 60);
    carbsMin = Math.min(carbsMin, target);
    warnings.push("[PREMIER] cap glucides 60 g/h");
  }
  if (target >= 60) warnings.push("[GLUC 2:1] glucose:fructose obligatoire");

  const totalCarbs = Math.round((target * p.durationSec) / 3600);

  let hydrationPerHour = hydrationByProfil(p.sudation, p.tempC, p.poidsKg);
  if (p.hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (p.hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  if (p.altitude === '1500-2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.1);
    warnings.push("[ALT 1500-2500m] +10% hydro");
  }
  if (p.altitude === '>2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.15);
    warnings.push("[ALT >2500m] +15% hydro");
  }
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) warnings.push("[HYDRO >800mL/h] vigilance EAH");
  if (p.tempC >= 25) warnings.push("[CHAUD] -15-20% allure");
  if (p.tempC >= 25 && p.cafeineHabit !== 'Aucune') warnings.push("[CHAUD+CAF] dose -30%");
  if (p.tempC <= 8) warnings.push("[FROID] soif trompeuse Kenefick 2004");
  if (durationHours >= 4) warnings.push("[EAH] risque ++ effort >4h");

  const totalHydration = Math.round((hydrationPerHour * p.durationSec) / 3600);

  let sodiumPerLiter = sodiumByProfil(p.sudation);
  if (p.premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = Math.round((sodiumPerLiter * totalHydration) / 1000);

  const caf = caffeineDose(p.poidsKg, p.cafeineHabit, p.premierMode, p.durationSec);
  if (caf.mgPerKgTotal > 6) warnings.push("[CAF >6mg/kg/24h] réduire");

  const showProteins = durationHours >= 4;
  const proteinsPerHour = showProteins ? 7 : 0;
  const totalProteins = Math.round(proteinsPerHour * Math.max(0, durationHours - 3));

  const kcalPerHour = kcalPerHourTrail(p.poidsKg, p.dPlus, p.dMinus, p.durationSec);
  const totalKcal = Math.round((kcalPerHour * p.durationSec) / 3600);

  // Pack
  const carbsPerGel = 25;
  const nbGels = Math.max(0, Math.ceil((totalCarbs - 30 - p.basesDeVie * 40) / carbsPerGel));
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl / Math.max(1, p.basesDeVie + 1)));
  const sodiumPerCap = 500;
  const nbCapsSel = p.sudation === 'Salty sweater' || p.sudation === 'Élevé'
    ? Math.max(1, Math.ceil((totalSodium - sodiumPerLiter * (totalHydration / 1000) * 0.7) / sodiumPerCap))
    : 0;

  return {
    distanceEquivalenteITRA: dEq,
    durationLabel: formatDuration(p.durationSec),
    durationHours: Math.round(durationHours * 100) / 100,
    kcalPerHour, totalKcal,
    carbsPerHour: { min: carbsMin, max: carbsMax, target },
    totalCarbs,
    hydrationPerHour, totalHydration,
    sodiumPerLiter, totalSodium,
    caffeinePreRace: caf.preRaceMg,
    caffeineInRaceMgPerDose: caf.inRaceMgPerDose,
    caffeineDoseMgPerKgTotal: caf.mgPerKgTotal,
    caffeineNbInRace: caf.nbInRace,
    proteinsPerHour, totalProteins,
    nbGels, nbBidons, nbCapsSel,
    warnings,
  };
};

// ─── 10 profils ultra-trail ───
const profils = [
  {
    n: 1, titre: "UTMB Élite H",
    sexe: 'H', poidsKg: 60, niveau: 'Expert', premierMode: false,
    distanceKm: 170, dPlus: 10000, dMinus: 10000, durationSec: 22 * 3600,
    tempC: 15, hygrometrie: 'Standard', altitude: '1500-2500m',
    basesDeVie: 8, expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '3+ cafés/j',
  },
  {
    n: 2, titre: "CCC Confirmée F",
    sexe: 'F', poidsKg: 55, niveau: 'Confirmé', premierMode: false,
    distanceKm: 100, dPlus: 6100, dMinus: 6100, durationSec: 18 * 3600,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m',
    basesDeVie: 6, expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
  },
  {
    n: 3, titre: "OCC Régulière F",
    sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false,
    distanceKm: 55, dPlus: 3500, dMinus: 3500, durationSec: 11 * 3600,
    tempC: 14, hygrometrie: 'Standard', altitude: '500-1500m',
    basesDeVie: 4, expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
  },
  {
    n: 4, titre: "Saintélyon H",
    sexe: 'H', poidsKg: 75, niveau: 'Régulier', premierMode: false,
    distanceKm: 81, dPlus: 2000, dMinus: 2000, durationSec: 12 * 3600,
    tempC: 2, hygrometrie: 'Sec', altitude: 'Mer/<500m',
    basesDeVie: 5, expNutrition: 'Occasionnel', sudation: 'Faible', cafeineHabit: '3+ cafés/j',
  },
  {
    n: 5, titre: "Trail 30 km premier H débutant",
    sexe: 'H', poidsKg: 80, niveau: 'Débutant', premierMode: true,
    distanceKm: 30, dPlus: 1500, dMinus: 1500, durationSec: 5 * 3600,
    tempC: 20, hygrometrie: 'Standard', altitude: '500-1500m',
    basesDeVie: 1, expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
  },
  {
    n: 6, titre: "Diagonale des Fous F",
    sexe: 'F', poidsKg: 62, niveau: 'Expert', premierMode: false,
    distanceKm: 165, dPlus: 9700, dMinus: 9700, durationSec: 28 * 3600,
    tempC: 25, hygrometrie: 'Humide', altitude: '>2500m',
    basesDeVie: 10, expNutrition: 'Habitué', sudation: 'Salty sweater', cafeineHabit: '3+ cafés/j',
  },
  {
    n: 7, titre: "Trail court 20 km H rapide",
    sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false,
    distanceKm: 20, dPlus: 600, dMinus: 600, durationSec: 2 * 3600,
    tempC: 18, hygrometrie: 'Standard', altitude: 'Mer/<500m',
    basesDeVie: 0, expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j',
  },
  {
    n: 8, titre: "Hardrock 100 H altitude",
    sexe: 'H', poidsKg: 68, niveau: 'Expert', premierMode: false,
    distanceKm: 160, dPlus: 10000, dMinus: 10000, durationSec: 35 * 3600,
    tempC: 8, hygrometrie: 'Sec', altitude: '>2500m',
    basesDeVie: 9, expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j',
  },
  {
    n: 9, titre: "MaXi-Race 90 km Premier F",
    sexe: 'F', poidsKg: 60, niveau: 'Régulier', premierMode: true,
    distanceKm: 90, dPlus: 6000, dMinus: 6000, durationSec: 17 * 3600,
    tempC: 16, hygrometrie: 'Standard', altitude: '500-1500m',
    basesDeVie: 6, expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: 'Aucune',
  },
  {
    n: 10, titre: "VK 5 km/1000 D+ Expert",
    sexe: 'H', poidsKg: 65, niveau: 'Expert', premierMode: false,
    distanceKm: 5, dPlus: 1000, dMinus: 0, durationSec: 55 * 60,
    tempC: 12, hygrometrie: 'Standard', altitude: '1500-2500m',
    basesDeVie: 0, expNutrition: 'Habitué', sudation: 'Élevé', cafeineHabit: '1-2 cafés/j',
  },
];

// ─── Run ───
for (const p of profils) {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`PROFIL ${p.n} — ${p.titre}`);
  console.log("══════════════════════════════════════════════════════════");
  console.log(`Inputs : ${p.sexe} ${p.poidsKg}kg | ${p.niveau} | premier=${p.premierMode}`);
  console.log(`         ${p.distanceKm}km D+${p.dPlus} D-${p.dMinus} | ${p.durationSec/3600}h prévu`);
  console.log(`         ${p.tempC}°C ${p.hygrometrie} | alt=${p.altitude} | sudation=${p.sudation}`);
  console.log(`         expNut=${p.expNutrition} | caf=${p.cafeineHabit} | bases=${p.basesDeVie}`);
  const r = computeNutrition(p);
  console.log("\n--- Outputs calculés ---");
  console.log(`D eq ITRA : ${r.distanceEquivalenteITRA} km`);
  console.log(`Durée     : ${r.durationLabel} (${r.durationHours} h)`);
  console.log(`Énergie   : ${r.kcalPerHour} kcal/h × ${r.durationHours}h = ${r.totalKcal} kcal`);
  console.log(`Glucides  : ${r.carbsPerHour.target} g/h (plage ${r.carbsPerHour.min}-${r.carbsPerHour.max}) | total ${r.totalCarbs} g`);
  console.log(`Hydro     : ${r.hydrationPerHour} mL/h × ${r.durationHours}h = ${r.totalHydration} mL`);
  console.log(`Sodium    : ${r.sodiumPerLiter} mg/L | total ${r.totalSodium} mg`);
  console.log(`Caféine   : pré ${r.caffeinePreRace} mg + ${r.caffeineNbInRace} prises × ${r.caffeineInRaceMgPerDose} mg = ${r.caffeineDoseMgPerKgTotal} mg/kg total`);
  console.log(`Protéines : ${r.proteinsPerHour} g/h | total ${r.totalProteins} g`);
  console.log(`Pack      : ${r.nbGels} gels, ${r.nbBidons} bidon(s) par segment, ${r.nbCapsSel} caps sel`);
  console.log(`Warnings  :`);
  r.warnings.forEach(w => console.log(`   - ${w}`));
}
