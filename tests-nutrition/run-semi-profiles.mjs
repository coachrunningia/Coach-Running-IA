// Tests profils Semi-Marathon — ré-implémentation IDENTIQUE des formules
// de src/components/tools/NutritionSemiMarathonPage.tsx (Lines 71-369)

const hmsToSec = (h, m, s) => h * 3600 + m * 60 + s;
const formatDuration = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

const carbsBySemiTime = (chronoSec) => {
  if (chronoSec < 75 * 60) return { min: 0, max: 0, target: 0 };
  if (chronoSec < 90 * 60) return { min: 20, max: 30, target: 25 };
  if (chronoSec < 105 * 60) return { min: 30, max: 50, target: 40 };
  if (chronoSec < 120 * 60) return { min: 40, max: 60, target: 50 };
  if (chronoSec < 150 * 60) return { min: 45, max: 75, target: 60 };
  return { min: 60, max: 90, target: 70 };
};

const hydrationByProfil = (sudation, tempC, poidsKg = 70) => {
  const tempBucket = tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;
  const table = {
    Faible: [300, 400, 500, 600],
    Modéré: [400, 500, 600, 700],
    Élevé: [500, 600, 700, 800],
    'Salty sweater': [550, 650, 750, 850],
  };
  let ml = table[sudation][tempBucket];
  const weightFactor = Math.min(1.25, Math.max(0.85, 1 + (poidsKg - 70) * 0.005));
  ml = Math.round(ml * weightFactor);
  if (ml > 1000) ml = 1000;
  return ml;
};

const sodiumByProfil = (sudation) => {
  const table = { Faible: 400, Modéré: 600, Élevé: 900, 'Salty sweater': 1200 };
  return table[sudation];
};

const caffeineDose = (poidsKg, cafeineHabit, premierMode) => {
  if (premierMode || cafeineHabit === 'Aucune') {
    return { preRaceMg: 0, mgPerKgTotal: 0 };
  }
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round((poidsKg * mgPerKgPre) / 5) * 5;
  const mgPerKgTotal = Math.round((preRaceMg / poidsKg) * 10) / 10;
  return { preRaceMg, mgPerKgTotal };
};

const strategyForChrono = (chronoSec) => {
  if (chronoSec < 75 * 60) return { strategy: 'mouth_rinse', label: 'Mouth rinse suffit' };
  if (chronoSec < 90 * 60) return { strategy: 'gel_optional', label: '1 gel optionnel' };
  if (chronoSec < 105 * 60) return { strategy: 'gels_recommended', label: '1-2 gels recommandés' };
  if (chronoSec < 120 * 60) return { strategy: 'gels_recommended', label: '2 gels recommandés' };
  if (chronoSec < 150 * 60) return { strategy: 'gels_recommended', label: '2-3 gels recommandés' };
  return { strategy: 'marathon_approach', label: 'Approche marathon court' };
};

const computeNutrition = (p) => {
  const { poidsKg, premierMode, chronoSec, tempC, hygrometrie, expNutrition, sudation, cafeineHabit } = p;
  const warnings = [];
  const strat = strategyForChrono(chronoSec);
  const carbsBase = carbsBySemiTime(chronoSec);
  let target = carbsBase.target, carbsMin = carbsBase.min, carbsMax = carbsBase.max;

  if (expNutrition === 'Jamais' && target > 0) {
    target = Math.max(20, Math.round(target * 0.8));
    carbsMin = Math.max(0, Math.round(carbsMin * 0.8));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.8));
    warnings.push("Cible glucides réduite de 20% (jamais testé en course).");
  }
  if (premierMode && target > 30) {
    target = 30;
    carbsMax = Math.min(carbsMax, 30);
    carbsMin = Math.min(carbsMin, target);
    warnings.push("Mode Premier : cap 30 g/h.");
  }
  if (target >= 60) {
    warnings.push("≥60 g/h : gels glucose:fructose 2:1 ou 1:0.8 obligatoires (Jeukendrup 2014).");
  }
  const totalCarbs = Math.round((target * chronoSec) / 3600);

  let hydrationPerHour = hydrationByProfil(sudation, tempC, poidsKg);
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  if (premierMode && hydrationPerHour > 600) hydrationPerHour = 600;
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) warnings.push(">800 mL/h : surveille hyponatrémie. Cap 1000 mL/h.");
  if (tempC >= 25) warnings.push(`Chaleur ${tempC}°C : -10-15% allure.`);
  if (tempC >= 25 && cafeineHabit !== 'Aucune') warnings.push("Chaleur + caféine : -30% dose pré.");
  if (tempC <= 8) warnings.push("Froid : soif trompeuse (Kenefick 2004).");

  const totalHydration = chronoSec < 90 * 60
    ? Math.min(500, Math.round((hydrationPerHour * chronoSec) / 3600))
    : Math.round((hydrationPerHour * chronoSec) / 3600);

  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = chronoSec < 90 * 60 ? 0 : Math.round((sodiumPerLiter * totalHydration) / 1000);

  const { preRaceMg: caffeinePreRace, mgPerKgTotal } = caffeineDose(poidsKg, cafeineHabit, premierMode);

  const distanceKm = 21.0975;
  const vitesseKmh = distanceKm / (chronoSec / 3600);
  const kcalPerHour = Math.round(poidsKg * vitesseKmh * 0.95);
  const totalKcal = Math.round((kcalPerHour * chronoSec) / 3600);

  const nbGels = totalCarbs > 0 ? Math.max(0, Math.ceil(totalCarbs / 25)) : 0;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / 500));

  return {
    durationLabel: formatDuration(chronoSec),
    strategy: strat.strategy, strategyLabel: strat.label,
    carbsPerHour: { min: carbsMin, max: carbsMax, target },
    totalCarbs, hydrationPerHour, totalHydration,
    sodiumPerLiter, totalSodium, caffeinePreRace, mgPerKgTotal,
    kcalPerHour, totalKcal, nbGels, nbBidons, warnings,
    vitesseKmh: Math.round(vitesseKmh * 100) / 100,
  };
};

// Les 10 profils
const profiles = [
  { id: 1, label: "Élite H sub-1h05", sexe: 'H', poidsKg: 58, niveau: 'Expert', premierMode: false, chronoSec: hmsToSec(1,5,0), tempC: 12, hygrometrie: 'Standard', expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '3+ cafés/j' },
  { id: 2, label: "Compét F sub-1h20", sexe: 'F', poidsKg: 52, niveau: 'Expert', premierMode: false, chronoSec: hmsToSec(1,20,0), tempC: 14, hygrometrie: 'Standard', expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 3, label: "Confirmé H sub-1h30", sexe: 'H', poidsKg: 70, niveau: 'Confirmé', premierMode: false, chronoSec: hmsToSec(1,30,0), tempC: 18, hygrometrie: 'Standard', expNutrition: 'Habitué', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 4, label: "Régulière F sub-1h45", sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false, chronoSec: hmsToSec(1,45,0), tempC: 16, hygrometrie: 'Standard', expNutrition: 'Occasionnel', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 5, label: "Régulier H sub-2h00", sexe: 'H', poidsKg: 75, niveau: 'Régulier', premierMode: false, chronoSec: hmsToSec(2,0,0), tempC: 22, hygrometrie: 'Humide', expNutrition: 'Occasionnel', sudation: 'Élevé', cafeineHabit: 'Aucune' },
  { id: 6, label: "Premier semi F sub-2h15", sexe: 'F', poidsKg: 65, niveau: 'Débutant', premierMode: true, chronoSec: hmsToSec(2,15,0), tempC: 15, hygrometrie: 'Standard', expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
  { id: 7, label: "Obésité H premier 2h45", sexe: 'H', poidsKg: 105, niveau: 'Débutant', premierMode: true, chronoSec: hmsToSec(2,45,0), tempC: 14, hygrometrie: 'Standard', expNutrition: 'Jamais', sudation: 'Élevé', cafeineHabit: 'Aucune' },
  { id: 8, label: "Très fin H sub-1h12", sexe: 'H', poidsKg: 52, niveau: 'Expert', premierMode: false, chronoSec: hmsToSec(1,12,0), tempC: 10, hygrometrie: 'Sec', expNutrition: 'Habitué', sudation: 'Faible', cafeineHabit: '3+ cafés/j' },
  { id: 9, label: "Chaud salty F sub-2h30", sexe: 'F', poidsKg: 58, niveau: 'Régulier', premierMode: false, chronoSec: hmsToSec(2,30,0), tempC: 30, hygrometrie: 'Humide', expNutrition: 'Occasionnel', sudation: 'Salty sweater', cafeineHabit: '1-2 cafés/j' },
  { id: 10, label: "Premier H grand froid 2h00", sexe: 'H', poidsKg: 80, niveau: 'Débutant', premierMode: true, chronoSec: hmsToSec(2,0,0), tempC: 2, hygrometrie: 'Sec', expNutrition: 'Jamais', sudation: 'Modéré', cafeineHabit: '1-2 cafés/j' },
];

for (const p of profiles) {
  const r = computeNutrition(p);
  console.log(`\n===== PROFIL ${p.id} : ${p.label} =====`);
  console.log(`Inputs: ${p.sexe} ${p.poidsKg}kg, ${p.niveau}, chrono ${r.durationLabel} (${r.vitesseKmh} km/h), ${p.tempC}°C ${p.hygrometrie}, sudation ${p.sudation}, exp ${p.expNutrition}, café ${p.cafeineHabit}, premier=${p.premierMode}`);
  console.log(`-- Stratégie : ${r.strategy} (${r.strategyLabel})`);
  console.log(`-- Glucides : ${r.carbsPerHour.target} g/h (plage ${r.carbsPerHour.min}-${r.carbsPerHour.max}) — total ${r.totalCarbs} g`);
  console.log(`-- Hydratation : ${r.hydrationPerHour} mL/h — total ${r.totalHydration} mL — ${r.nbBidons} bidons`);
  console.log(`-- Sodium : ${r.totalSodium > 0 ? r.sodiumPerLiter + ' mg/L (total ' + r.totalSodium + ' mg)' : 'NON OBLIGATOIRE'}`);
  console.log(`-- Caféine pré : ${r.caffeinePreRace} mg (${r.mgPerKgTotal} mg/kg)`);
  console.log(`-- Énergie : ${r.kcalPerHour} kcal/h — total ${r.totalKcal} kcal`);
  console.log(`-- Nb gels affichés : ${r.nbGels}`);
  if (r.warnings.length > 0) console.log(`-- Warnings : ${r.warnings.join(' | ')}`);
}
