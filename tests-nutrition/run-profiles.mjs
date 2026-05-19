// Script de test : re-implémente exactement les formules de NutritionMarathonPage.tsx
// puis exécute les 10 profils et émet un JSON synthétique.

const carbsByChrono = (chronoSec) => {
  if (chronoSec < 2.5 * 3600) return { min: 80, max: 110, target: 90 };
  if (chronoSec < 3 * 3600)   return { min: 70, max: 95,  target: 80 };
  if (chronoSec < 3.5 * 3600) return { min: 60, max: 85,  target: 70 };
  if (chronoSec < 4 * 3600)   return { min: 50, max: 75,  target: 60 };
  if (chronoSec < 4.5 * 3600) return { min: 45, max: 65,  target: 55 };
  if (chronoSec < 5 * 3600)   return { min: 40, max: 55,  target: 45 };
  return { min: 35, max: 50, target: 40 };
};

const hydrationByProfil = (sudation, tempC) => {
  const tempBucket = tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;
  const table = {
    'Faible':          [350, 450, 550, 650],
    'Modéré':          [450, 550, 650, 800],
    'Élevé':           [550, 650, 800, 900],
    'Salty sweater':   [600, 700, 850, 950],
  };
  let ml = table[sudation][tempBucket];
  if (ml > 1000) ml = 1000;
  return ml;
};

const sodiumByProfil = (sudation) => ({
  'Faible': 400, 'Modéré': 600, 'Élevé': 900, 'Salty sweater': 1200,
}[sudation]);

const caffeineDose = (poidsKg, cafeineHabit, premierMode) => {
  if (premierMode) return { preRaceMg: 0, boostMg: 0, mgPerKgTotal: 0 };
  if (cafeineHabit === 'Aucune') return { preRaceMg: 0, boostMg: 0, mgPerKgTotal: 0 };
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round(poidsKg * mgPerKgPre / 5) * 5;
  const boostMg = 50;
  const mgPerKgTotal = Math.round((preRaceMg + boostMg) / poidsKg * 10) / 10;
  return { preRaceMg, boostMg, mgPerKgTotal };
};

const computeNutrition = (p) => {
  const { poidsKg, premierMode, chronoSec, tempC, hygrometrie, expNutrition, sudation, cafeineHabit } = p;
  const warnings = [];

  // Glucides
  const carbsBase = carbsByChrono(chronoSec);
  let target = carbsBase.target;
  if (expNutrition === 'Jamais') {
    target = Math.round(target * 0.8);
    warnings.push("Cible glucides -20% (aucune exp nutrition)");
  }
  if (premierMode && target > 60) {
    target = 60;
    warnings.push("Premier marathon : cap glucides 60 g/h");
  }
  const carbsPerHour = { ...carbsBase, target };
  const totalCarbs = Math.round((target * chronoSec) / 3600);

  // Hydratation
  let hydrationPerHour = hydrationByProfil(sudation, tempC);
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec')    hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) warnings.push("Hydratation > 800 mL/h : surveille EAH");
  const totalHydration = Math.round((hydrationPerHour * chronoSec) / 3600);

  // Sodium
  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = Math.round((sodiumPerLiter * totalHydration) / 1000);

  // Caféine
  const caf = caffeineDose(poidsKg, cafeineHabit, premierMode);

  // Énergie
  const distanceKm = 42.195;
  const vitesseKmh = distanceKm / (chronoSec / 3600);
  const kcalPerHour = Math.round(poidsKg * vitesseKmh * 0.95);
  const totalKcal = Math.round((kcalPerHour * chronoSec) / 3600);

  // Pack
  const carbsPerGel = 25;
  const nbGels = Math.max(0, Math.ceil((totalCarbs - 20) / carbsPerGel));
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl / 2));
  const sodiumPerCap = 500;
  const nbCapsSel = (sudation === 'Salty sweater' || sudation === 'Élevé')
    ? Math.max(1, Math.ceil((totalSodium - sodiumPerLiter * (totalHydration/1000) * 0.7) / sodiumPerCap))
    : 0;

  return {
    durationSec: chronoSec,
    carbsPerHour, totalCarbs,
    hydrationPerHour, totalHydration,
    sodiumPerLiter, totalSodium,
    caffeinePreRace: caf.preRaceMg, caffeineBoost: caf.boostMg, mgPerKgTotal: caf.mgPerKgTotal,
    kcalPerHour, totalKcal,
    nbGels, nbBidons, nbCapsSel,
    warnings,
    vitesseKmh: Math.round(vitesseKmh*100)/100,
  };
};

const profils = [
  { n: 1, label: 'Élite H 2h30',                sexe:'H', poidsKg:60,  niveau:'Expert',    chronoSec: 2*3600+30*60, tempC:12, hygrometrie:'Standard', sudation:'Élevé',         expNutrition:'Habitué',    cafeineHabit:'3+ cafés/j', premierMode:false },
  { n: 2, label: 'Confirmée F 3h15',            sexe:'F', poidsKg:55,  niveau:'Confirmé',  chronoSec: 3*3600+15*60, tempC:16, hygrometrie:'Standard', sudation:'Modéré',        expNutrition:'Habitué',    cafeineHabit:'1-2 cafés/j', premierMode:false },
  { n: 3, label: 'Régulier H 3h35',             sexe:'H', poidsKg:75,  niveau:'Régulier',  chronoSec: 3*3600+35*60, tempC:18, hygrometrie:'Standard', sudation:'Modéré',        expNutrition:'Occasionnel',cafeineHabit:'1-2 cafés/j', premierMode:false },
  { n: 4, label: 'Régulière F 4h00 humide',     sexe:'F', poidsKg:62,  niveau:'Régulier',  chronoSec: 4*3600,       tempC:22, hygrometrie:'Humide',   sudation:'Salty sweater', expNutrition:'Habitué',    cafeineHabit:'Aucune',      premierMode:false },
  { n: 5, label: 'Débutant H 4h30 1er mar.',    sexe:'H', poidsKg:80,  niveau:'Débutant',  chronoSec: 4*3600+30*60, tempC:15, hygrometrie:'Standard', sudation:'Modéré',        expNutrition:'Jamais',     cafeineHabit:'1-2 cafés/j', premierMode:true  },
  { n: 6, label: 'Débutante F 5h00 1er mar.',   sexe:'F', poidsKg:65,  niveau:'Débutant',  chronoSec: 5*3600,       tempC:20, hygrometrie:'Standard', sudation:'Modéré',        expNutrition:'Jamais',     cafeineHabit:'Aucune',      premierMode:true  },
  { n: 7, label: 'Obésité H 5h30 1er mar.',     sexe:'H', poidsKg:105, niveau:'Débutant',  chronoSec: 5*3600+30*60, tempC:14, hygrometrie:'Standard', sudation:'Élevé',         expNutrition:'Jamais',     cafeineHabit:'Aucune',      premierMode:true  },
  { n: 8, label: 'Très fin H 2h45 sec',         sexe:'H', poidsKg:52,  niveau:'Expert',    chronoSec: 2*3600+45*60, tempC:10, hygrometrie:'Sec',      sudation:'Faible',        expNutrition:'Habitué',    cafeineHabit:'3+ cafés/j', premierMode:false },
  { n: 9, label: 'Régulière F 4h30 chaud 30°C', sexe:'F', poidsKg:58,  niveau:'Régulier',  chronoSec: 4*3600+30*60, tempC:30, hygrometrie:'Humide',   sudation:'Salty sweater', expNutrition:'Occasionnel',cafeineHabit:'1-2 cafés/j', premierMode:false },
  { n:10, label: 'Confirmé H 3h00 froid 4°C',   sexe:'H', poidsKg:70,  niveau:'Confirmé',  chronoSec: 3*3600,       tempC: 4, hygrometrie:'Sec',      sudation:'Modéré',        expNutrition:'Habitué',    cafeineHabit:'3+ cafés/j', premierMode:false },
];

const fmt = (s) => `${Math.floor(s/3600)}h${String(Math.floor((s%3600)/60)).padStart(2,'0')}`;

for (const p of profils) {
  const r = computeNutrition(p);
  console.log(`\n────── #${p.n} ${p.label} (${fmt(p.chronoSec)}, ${p.poidsKg}kg, ${p.tempC}°C ${p.hygrometrie}, sudation ${p.sudation}) ──────`);
  console.log(`Vitesse: ${r.vitesseKmh} km/h`);
  console.log(`Glucides: target=${r.carbsPerHour.target} g/h (plage ${r.carbsPerHour.min}-${r.carbsPerHour.max} g/h) | total=${r.totalCarbs} g`);
  console.log(`Hydratation: ${r.hydrationPerHour} mL/h | total=${r.totalHydration} mL`);
  console.log(`Sodium: ${r.sodiumPerLiter} mg/L | total=${r.totalSodium} mg`);
  console.log(`Caféine: pré=${r.caffeinePreRace} mg + boost=${r.caffeineBoost} mg = ${r.caffeinePreRace + r.caffeineBoost} mg (${r.mgPerKgTotal} mg/kg)`);
  console.log(`kcal/h=${r.kcalPerHour} | total kcal=${r.totalKcal}`);
  console.log(`Pack: ${r.nbGels} gels | ${r.nbBidons} bidons | ${r.nbCapsSel} caps sel`);
  if (r.warnings.length) console.log(`Warnings: ${r.warnings.join(' | ')}`);
}
