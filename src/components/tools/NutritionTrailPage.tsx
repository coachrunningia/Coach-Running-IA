
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Mountain,
  AlertTriangle,
  Droplet,
  Zap,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Coffee,
  Activity,
  Package,
  CheckCircle2,
  Info,
  X,
  HelpCircle,
  Beaker,
  Target,
  Flame,
  ListChecks,
  Compass,
  Soup,
  Utensils,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CALCUL — NUTRITION TRAIL (inline, monolithique)
// Sources : ACSM 2024, Jeukendrup 2014/2017, Tiller (ISSN 2019 Ultra),
// Hew-Butler 2015 (EAH), Minetti 2002 (coût énergétique pentes),
// Vernillo 2017 (biomécanique trail), Costa 2017 (gut training),
// ITRA Performance Index (D équivalente), Spriet 2014 / Grgic 2020 (caféine),
// Pfeiffer 2012 (lassitude gustative), Stuempfle & Hoffman 2015 (GI ultra).
// ─────────────────────────────────────────────────────────────────────────────

type Sexe = 'H' | 'F';
type Niveau = 'Débutant' | 'Régulier' | 'Confirmé' | 'Expert';
type Hygrometrie = 'Sec' | 'Standard' | 'Humide';
type ExpNutrition = 'Jamais' | 'Occasionnel' | 'Habitué';
type Sudation = 'Faible' | 'Modéré' | 'Élevé' | 'Salty sweater';
type Cafeine = 'Aucune' | '1-2 cafés/j' | '3+ cafés/j';
type Altitude = 'Mer/<500m' | '500-1500m' | '1500-2500m' | '>2500m';

interface CalcResult {
  // Course
  distanceKm: number;
  dPlus: number;
  dMinus: number;
  distanceEquivalenteITRA: number;   // km équivalent ITRA
  durationSec: number;
  durationLabel: string;
  durationHours: number;
  // Énergie
  kcalPerHour: number;
  totalKcal: number;
  // Glucides
  carbsPerHour: { min: number; max: number; target: number };
  totalCarbs: number;
  // Hydratation
  hydrationPerHour: number;
  totalHydration: number;
  // Sodium
  sodiumPerLiter: number;
  totalSodium: number;
  // Caféine
  caffeinePreRace: number;
  caffeineInRaceMgPerDose: number;     // dose par prise toutes les 2-3 h
  caffeineDoseMgPerKgTotal: number;
  // Protéines (>4 h)
  proteinsPerHour: number;             // 0 si effort court
  totalProteins: number;
  // Pack
  nbGels: number;
  nbBidons: number;
  nbCapsSel: number;
  // Mode / warnings
  premierMode: boolean;
  warnings: string[];
  // Timeline
  timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[];
  // Conditionnels
  basesDeVie: number;
  showPlanB: boolean;        // effort >6 h
  showLassitude: boolean;    // effort >8 h
  showProteins: boolean;     // effort >4 h
}

// hh:mm:ss → secondes
const hmsToSec = (h: string, m: string, s: string): number => {
  const H = parseInt(h || '0', 10) || 0;
  const M = parseInt(m || '0', 10) || 0;
  const S = parseInt(s || '0', 10) || 0;
  return H * 3600 + M * 60 + S;
};

const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
};

// Distance équivalente ITRA — réf : ITRA Performance Index documentation
// `D_eq = D_km + (DPlus / 100) + (DMinus / 400)`
// → utilisée pour comparer la DIFFICULTÉ d'une course à un plat équivalent.
const distanceEquivalenteITRA = (distanceKm: number, dPlus: number, dMinus: number): number => {
  return Math.round((distanceKm + dPlus / 100 + dMinus / 400) * 10) / 10;
};

// Glucides g/h trail — plages par durée d'effort (ACSM 2024, Jeukendrup 2014/2017,
// Tiller JISSN 2019 ultra, Costa 2017).
// Plages plus larges que marathon — l'intensité trail (55-70% VO2max) est plus basse
// mais la durée prend le relais comme driver des besoins glucidiques.
// Conserver une cible réaliste (borne basse-médiane) — éviter le mythe "120 g/h pour tous".
const carbsByTrailDuration = (durationSec: number): { min: number; max: number; target: number } => {
  const h = durationSec / 3600;
  if (h < 1) return { min: 0, max: 30, target: 15 };
  if (h < 2) return { min: 30, max: 60, target: 45 };
  if (h < 3) return { min: 60, max: 90, target: 70 };
  if (h < 6) return { min: 60, max: 90, target: 75 };
  if (h < 12) return { min: 70, max: 100, target: 80 };    // lassitude possible mais besoin élevé
  if (h < 24) return { min: 60, max: 90, target: 70 };     // digestion saturée
  return { min: 50, max: 80, target: 60 };                 // 24h+ : aliments vrais dominants
};

// Matrice hydratation mL/h trail × T° (Sawka 2007 + Hew-Butler 2015).
// Identique base marathon, ajustée altitude/humidité ensuite.
// Pondération poids ±0.5%/kg autour 70 kg, capé 0.85-1.25×.
// Cap absolu hyponatrémie d'effort : 1000 mL/h (Hew-Butler 2015).
const hydrationByProfil = (
  sudation: Sudation,
  tempC: number,
  poidsKg: number = 70,
): number => {
  const tempBucket: 0 | 1 | 2 | 3 =
    tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;
  const table: Record<Sudation, [number, number, number, number]> = {
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

// Sodium mg/L selon profil sudation
const sodiumByProfil = (sudation: Sudation): number => {
  const table: Record<Sudation, number> = {
    Faible: 400,
    Modéré: 600,
    Élevé: 900,
    'Salty sweater': 1200,
  };
  return table[sudation];
};

// Caféine pré-course trail (idem marathon) — Spriet 2014, Maughan 2016, Grgic 2020.
// 3 mg/kg cible, -17% si tolérance haute. Premier ultra = ZÉRO.
// Boost final marathon n'a pas de sens en trail long → on calcule plutôt
// une "dose en course" toutes les 2-3 h (1-2 mg/kg).
const caffeineDose = (
  poidsKg: number,
  cafeineHabit: Cafeine,
  premierMode: boolean,
  durationSec: number,
): { preRaceMg: number; inRaceMgPerDose: number; mgPerKgTotal: number } => {
  if (premierMode || cafeineHabit === 'Aucune') {
    return { preRaceMg: 0, inRaceMgPerDose: 0, mgPerKgTotal: 0 };
  }
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round((poidsKg * mgPerKgPre) / 5) * 5;
  // Dose en course toutes 2-3 h si effort > 3 h, ~1 mg/kg/prise (arrondi à 10 mg)
  const inRaceMgPerDose = durationSec >= 3 * 3600 ? Math.round((poidsKg * 1) / 10) * 10 : 0;
  // Total prévu sur la course (estimation : 1 prise toutes 2.5 h après H3)
  const nbInRace = durationSec >= 3 * 3600 ? Math.floor((durationSec / 3600 - 3) / 2.5) + 1 : 0;
  const totalMg = preRaceMg + inRaceMgPerDose * nbInRace;
  const mgPerKgTotal = Math.round((totalMg / poidsKg) * 10) / 10;
  return { preRaceMg, inRaceMgPerDose, mgPerKgTotal };
};

// Estimation kcal/h trail — Minetti pondéré.
// `kcal/h = poids × (5 + (m_grimpés/h × 0.012) + (m_descendus/h × 0.0035))`
// 5 kcal/kg/h ≈ base course/marche douce ; coeff montée 0.012 (Minetti),
// coeff descente 0.0035 (descente coûte ~3-4× moins qu'un plat mais reste consommatrice).
const kcalPerHourTrail = (
  poidsKg: number,
  dPlus: number,
  dMinus: number,
  durationSec: number,
): number => {
  const h = durationSec / 3600;
  if (h <= 0) return 0;
  const mGrimpesParH = dPlus / h;
  const mDescendusParH = dMinus / h;
  const kcal = poidsKg * (5 + mGrimpesParH * 0.012 + mDescendusParH * 0.0035);
  return Math.max(0, Math.round(kcal));
};

// Calcul principal
const computeNutrition = (params: {
  sexe: Sexe;
  poidsKg: number;
  niveau: Niveau;
  premierMode: boolean;
  distanceKm: number;
  dPlus: number;
  dMinus: number;
  durationSec: number;
  tempC: number;
  hygrometrie: Hygrometrie;
  altitude: Altitude;
  basesDeVie: number;
  expNutrition: ExpNutrition;
  sudation: Sudation;
  cafeineHabit: Cafeine;
}): CalcResult => {
  const {
    poidsKg, premierMode, distanceKm, dPlus, dMinus, durationSec,
    tempC, hygrometrie, altitude, basesDeVie,
    expNutrition, sudation, cafeineHabit,
  } = params;

  const warnings: string[] = [];
  const durationHours = durationSec / 3600;
  const dEq = distanceEquivalenteITRA(distanceKm, dPlus, dMinus);

  // ─── Glucides ───
  const carbsBase = carbsByTrailDuration(durationSec);
  let target = carbsBase.target;
  let carbsMin = carbsBase.min;
  let carbsMax = carbsBase.max;

  if (expNutrition === 'Jamais') {
    target = Math.max(30, Math.round(target * 0.8));
    carbsMin = Math.max(20, Math.round(carbsMin * 0.8));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.8));
    warnings.push("Cible glucides réduite de 20% car aucune expérience nutrition en course. Sur trail long, un abandon GI est plus probable qu'une perte de chrono — progresse graduellement (Costa 2017).");
  }

  // Mode Premier ultra : cap à 60 g/h max (peu importe la durée)
  if (premierMode && target > 60) {
    target = 60;
    carbsMax = Math.min(carbsMax, 60);
    carbsMin = Math.min(carbsMin, target);
    warnings.push("Mode Premier trail/ultra : cible glucides plafonnée à 60 g/h pour limiter le risque GI distress. Première priorité : finir, pas optimiser.");
  }

  if (target >= 60) {
    warnings.push("Cible ≥ 60 g/h : tes gels DOIVENT contenir un mélange glucose:fructose (ratio 2:1 ou 1:0.8, mention sur l'étiquette). Sinon plafond physiologique 60 g/h via SGLT1 seul (Jeukendrup 2014).");
  }
  const carbsPerHour = { min: carbsMin, max: carbsMax, target };
  const totalCarbs = Math.round((target * durationSec) / 3600);

  // ─── Hydratation ───
  let hydrationPerHour = hydrationByProfil(sudation, tempC, poidsKg);
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  // Ajustement altitude — Péronnet : +10% besoins hydratation au-delà 1500 m
  if (altitude === '1500-2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.1);
    warnings.push("Altitude 1500-2500 m : besoins hydratation +10% (moins si tu es acclimaté >2 sem). Surveille soif + couleur urine.");
  }
  if (altitude === '>2500m') {
    hydrationPerHour = Math.round(hydrationPerHour * 1.15);
    warnings.push("Altitude >2500 m : besoins hydratation +15%, oxydation glucidique majorée. Si tu n'es pas acclimaté ≥2 semaines, l'effort sera nettement plus dur.");
  }
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) {
    warnings.push("Hydratation > 800 mL/h : surveille les signes d'hyponatrémie (nausées, confusion, gonflement doigts). Cap absolu 1000 mL/h — boire à la soif est ta meilleure boussole.");
  }
  if (tempC >= 25) {
    warnings.push("Trail par >25°C : ralentis ton allure de 15-20%. Surveille l'épuisement thermique (frissons paradoxaux, désorientation).");
  }
  if (tempC >= 25 && cafeineHabit !== 'Aucune') {
    warnings.push("Chaleur + caféine = thermogenèse accrue. Réduis ta dose pré-course de 30%.");
  }
  if (tempC <= 8) {
    warnings.push("Par temps froid, la soif est trompeuse (Kenefick 2004). Bois selon ton plan chronométré, pas selon la soif uniquement.");
  }
  if (durationHours >= 4) {
    warnings.push("Effort >4 h : risque hyponatrémie d'effort (EAH) plus élevé, surtout pour les femmes et coureurs lents. Ne dépasse JAMAIS 1 L/h. Urine claire abondante = signe de SUR-hydratation.");
  }
  const totalHydration = Math.round((hydrationPerHour * durationSec) / 3600);

  // ─── Sodium ───
  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = Math.round((sodiumPerLiter * totalHydration) / 1000);

  // ─── Caféine ───
  const { preRaceMg: caffeinePreRace, inRaceMgPerDose: caffeineInRaceMgPerDose, mgPerKgTotal } =
    caffeineDose(poidsKg, cafeineHabit, premierMode, durationSec);
  if (mgPerKgTotal > 6) {
    warnings.push("Caféine totale calculée >6 mg/kg sur 24 h : réduis tes prises en course. Au-delà, les effets secondaires (palpitations, GI distress) dépassent les bénéfices ergogéniques.");
  }

  // ─── Protéines (>4 h) ───
  const showProteins = durationHours >= 4;
  const proteinsPerHour = showProteins ? 7 : 0;     // 5-10 g/h cible mid-range (Tiller 2019)
  const totalProteins = Math.round(proteinsPerHour * Math.max(0, durationHours - 3));

  // ─── Énergie (Minetti) ───
  const kcalPerHour = kcalPerHourTrail(poidsKg, dPlus, dMinus, durationSec);
  const totalKcal = Math.round((kcalPerHour * durationSec) / 3600);

  // ─── Pack ───
  const carbsPerGel = 25;
  const nbGels = Math.max(0, Math.ceil((totalCarbs - 30 - basesDeVie * 40) / carbsPerGel));
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl / Math.max(1, basesDeVie + 1)));
  const sodiumPerCap = 500;
  const nbCapsSel = sudation === 'Salty sweater' || sudation === 'Élevé'
    ? Math.max(1, Math.ceil((totalSodium - sodiumPerLiter * (totalHydration / 1000) * 0.7) / sodiumPerCap))
    : 0;

  // ─── Timeline ───
  const timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[] = [];
  timeline.push({
    window: 'H-30 → H-0',
    instruction: caffeinePreRace > 0
      ? `Hydratation 200-400 mL eau plate. Caféine : ${caffeinePreRace} mg (≈ ${Math.round(caffeinePreRace / 80)} expressos ou 1 gélule) 45-60 min avant le départ.`
      : `Hydratation 200-400 mL d'eau plate. ${premierMode ? 'Pas de caféine sur premier trail/ultra (trop d\'inconnues GI).' : 'Pas de caféine.'}`,
    tone: 'highlight',
  });
  timeline.push({
    window: 'H-15 → H-0',
    instruction: "ZONE ROUGE : pas de gel ni de glucides simples isolés (risque hypoglycémie réactionnelle au démarrage).",
    tone: 'warning',
  });
  timeline.push({
    window: 'H0 → H1',
    instruction: durationHours < 1
      ? "Eau seule (ou rinçage bouche). Pour un trail <1 h, les glucides ne servent presque à rien (Carter 2004)."
      : "Hydratation gorgées toutes 10-15 min (~150-200 mL). 1er gel facultatif vers H0:45 si tu sens un creux.",
    tone: 'normal',
  });
  if (durationHours >= 1) {
    timeline.push({
      window: 'H1 → H3',
      instruction: `1 gel toutes les ~25-35 min (cible ${carbsPerHour.target} g/h). Boisson Na+ ${sodiumPerLiter} mg/L en relais. Démarre l'alternance liquide/solide léger dès H2.`,
      tone: 'normal',
    });
  }
  if (durationHours >= 3) {
    timeline.push({
      window: 'H3+',
      instruction: showProteins
        ? `Démarre les PROTÉINES : ${proteinsPerHour} g/h en continu (gel protéiné OU 30 g saucisson sec OU 1 part fromage). Bolus 15-25 g aux bases de vie.`
        : `Maintiens le rythme glucides ${carbsPerHour.target} g/h. Alterne arômes pour limiter la lassitude.`,
      tone: 'highlight',
    });
  }
  if (durationHours >= 6) {
    timeline.push({
      window: 'H6+',
      instruction: "Bascule progressive vers SALÉ dominant (saucisson, fromage, crackers, soupe). Le sucré devient écœurant (Pfeiffer 2012). Bouillon chaud = reset gustatif efficace.",
      tone: 'normal',
    });
  }
  if (durationHours >= 8) {
    timeline.push({
      window: 'H8+',
      instruction: "Lassitude gustative quasi certaine. Aliments « vrais » prioritaires : bouillon, soupe miso, riz salé, omelette, gnocchis beurre. Sucré minoritaire en relais.",
      tone: 'normal',
    });
  }
  if (durationHours >= 12) {
    timeline.push({
      window: 'H12+',
      instruction: "Vigilance EAH ++. Boire À LA SOIF, jamais au-delà. Solide salé domine. Si nuit : caféine cognitive 1-2 mg/kg en début de nuit.",
      tone: 'warning',
    });
  }
  if (caffeineInRaceMgPerDose > 0 && durationHours >= 3) {
    timeline.push({
      window: `Toutes les 2-3 h après H3`,
      instruction: `Caféine en relais : ${caffeineInRaceMgPerDose} mg/prise (gel caféiné, capsule, cola plate). Plafond 6 mg/kg/24 h cumulés.`,
      tone: 'highlight',
    });
  }

  const showPlanB = durationHours >= 6;
  const showLassitude = durationHours >= 8;

  return {
    distanceKm,
    dPlus,
    dMinus,
    distanceEquivalenteITRA: dEq,
    durationSec,
    durationLabel: formatDuration(durationSec),
    durationHours,
    kcalPerHour,
    totalKcal,
    carbsPerHour,
    totalCarbs,
    hydrationPerHour,
    totalHydration,
    sodiumPerLiter,
    totalSodium,
    caffeinePreRace,
    caffeineInRaceMgPerDose,
    caffeineDoseMgPerKgTotal: mgPerKgTotal,
    proteinsPerHour,
    totalProteins,
    nbGels,
    nbBidons,
    nbCapsSel,
    premierMode,
    warnings,
    timeline,
    basesDeVie,
    showPlanB,
    showLassitude,
    showProteins,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GA4 helper
// ─────────────────────────────────────────────────────────────────────────────
const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  // @ts-expect-error gtag is loaded globally
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    // @ts-expect-error gtag is loaded globally
    window.gtag('event', eventName, params || {});
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT
// ─────────────────────────────────────────────────────────────────────────────

const NutritionTrailPage: React.FC = () => {
  // ─── Form state ───
  const [sexe, setSexe] = useState<Sexe>('H');
  const [poids, setPoids] = useState<string>('');
  const [niveau, setNiveau] = useState<Niveau>('Régulier');
  const [premierMode, setPremierMode] = useState<boolean>(false);

  const [distanceKm, setDistanceKm] = useState<string>('30');
  const [dPlus, setDPlus] = useState<string>('1500');
  const [dMinus, setDMinus] = useState<string>('');
  const [altitude, setAltitude] = useState<Altitude>('Mer/<500m');
  const [basesDeVie, setBasesDeVie] = useState<string>('0');

  const [chronoH, setChronoH] = useState<string>('');
  const [chronoM, setChronoM] = useState<string>('');
  const [chronoS, setChronoS] = useState<string>('');

  const [tempC, setTempC] = useState<string>('15');
  const [hygrometrie, setHygrometrie] = useState<Hygrometrie>('Standard');
  const [expNutrition, setExpNutrition] = useState<ExpNutrition>('Occasionnel');

  const [showAffinages, setShowAffinages] = useState<boolean>(false);
  const [sudation, setSudation] = useState<Sudation>('Modéré');
  const [cafeineHabit, setCafeineHabit] = useState<Cafeine>('1-2 cafés/j');

  const [result, setResult] = useState<CalcResult | null>(null);
  const [showSafety, setShowSafety] = useState<boolean>(false);
  const [showMedicalDisclaimer, setShowMedicalDisclaimer] = useState<boolean>(false);

  // ─── Bandeau pré/post (localStorage 30 j) ───
  const [showWarningBar, setShowWarningBar] = useState<boolean>(true);
  useEffect(() => {
    const ack = localStorage.getItem('nutrition_trail_warning_ack_v1');
    if (ack) {
      const ackDate = parseInt(ack, 10);
      const days = (Date.now() - ackDate) / (1000 * 60 * 60 * 24);
      if (days < 30) setShowWarningBar(false);
    }
    trackEvent('nutrition_trail_view');
  }, []);

  const dismissWarningBar = () => {
    localStorage.setItem('nutrition_trail_warning_ack_v1', Date.now().toString());
    setShowWarningBar(false);
  };

  // ─── Auto-coche Mode Premier si Débutant ───
  useEffect(() => {
    if (niveau === 'Débutant') setPremierMode(true);
  }, [niveau]);

  // ─── Validation et calcul ───
  const calculate = () => {
    const poidsNum = parseFloat(poids);
    const distNum = parseFloat(distanceKm);
    const dPlusNum = parseFloat(dPlus) || 0;
    const dMinusNum = parseFloat(dMinus || dPlus) || 0;
    const basesNum = parseInt(basesDeVie || '0', 10) || 0;
    const chronoSec = hmsToSec(chronoH, chronoM, chronoS);
    const tempNum = parseFloat(tempC);

    if (!poidsNum || poidsNum < 30 || poidsNum > 200) {
      alert("Renseigne un poids valide (entre 30 et 200 kg).");
      return;
    }
    if (!distNum || distNum < 5 || distNum > 300) {
      alert("Renseigne une distance valide (entre 5 et 300 km).");
      return;
    }
    if (dPlusNum < 0 || dPlusNum > 15000) {
      alert("Renseigne un D+ valide (entre 0 et 15000 m).");
      return;
    }
    if (dMinusNum < 0 || dMinusNum > 15000) {
      alert("Renseigne un D- valide (entre 0 et 15000 m).");
      return;
    }
    if (basesNum < 0 || basesNum > 10) {
      alert("Renseigne un nombre de bases de vie entre 0 et 10.");
      return;
    }
    // Durée : 0h30 minimum (trail court) → 30h max (ultra long)
    if (chronoSec < 1800 || chronoSec > 30 * 3600) {
      alert("Renseigne une durée valide (entre 0h30 et 30h).");
      return;
    }
    if (isNaN(tempNum) || tempNum < -20 || tempNum > 45) {
      alert("Renseigne une température valide (entre -20 et 45°C).");
      return;
    }

    const r = computeNutrition({
      sexe,
      poidsKg: poidsNum,
      niveau,
      premierMode,
      distanceKm: distNum,
      dPlus: dPlusNum,
      dMinus: dMinusNum,
      durationSec: chronoSec,
      tempC: tempNum,
      hygrometrie,
      altitude,
      basesDeVie: basesNum,
      expNutrition,
      sudation,
      cafeineHabit,
    });
    setResult(r);
    trackEvent('nutrition_trail_calculate', {
      distance_km: distNum,
      d_plus: dPlusNum,
      duree: r.durationLabel,
      niveau,
      premier_mode: premierMode,
      temp: tempNum,
    });
    setTimeout(() => {
      const el = document.getElementById('nutrition-results');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const onCtaPlanClick = () => {
    trackEvent('nutrition_trail_cta_plan_click');
  };

  return (
    <>
      <Helmet>
        <title>Calculateur Nutrition Trail Gratuit & Instantané</title>
        <meta
          name="description"
          content="Plan nutrition trail gratuit : glucides, hydratation, sodium, caféine selon distance, D+ et météo. Pour ultra-trail et trails courts."
        />
        <meta
          name="keywords"
          content="nutrition trail, pack nutrition trail, plan nutrition trail, nutrition ultra trail, gels trail, hydratation trail, sodium trail, caféine trail, gut training trail, pack nutrition Saintélyon, UTMB nutrition, hyponatrémie trail, base de vie ultra, plan B estomac fermé trail, lassitude gustative ultra"
        />
        <link rel="canonical" href="https://coachrunningia.fr/outils/nutrition-trail" />
        <meta property="og:title" content="Calculateur Nutrition Trail Gratuit & Instantané" />
        <meta property="og:description" content="Plan nutrition trail gratuit : glucides, hydratation, sodium, caféine selon distance, D+ et météo." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://coachrunningia.fr/outils/nutrition-trail" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Calculateur Nutrition Trail Gratuit & Instantané" />
        <meta name="twitter:description" content="Plan nutrition trail gratuit : glucides, hydratation, sodium, caféine selon distance, D+ et météo." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Combien de gels par heure en trail ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Selon la durée d'effort : 1-2 gels/h sur trail court (2-3 h), 2-3 gels/h sur ultra (60-90 g/h), à diminuer après 12 h car la digestion sature. Au-delà de 60 g/h, tes gels DOIVENT contenir glucose:fructose 2:1 ou 1:0.8 (SGLT1 saturé à 60 g/h)."
              }
            },
            {
              "@type": "Question",
              "name": "Quelle quantité d'eau prévoir pour un trail de 50 km / 80 km / 100 km ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Compte 500-800 mL/h selon météo et sudation. Pour un 50 km (5-8 h) : 3-6 L. Pour un 80 km (10-15 h) : 6-12 L. Pour un 100 km (12-24 h) : 8-20 L. Cap absolu : 1000 mL/h (prévention hyponatrémie d'effort)."
              }
            },
            {
              "@type": "Question",
              "name": "Pourquoi j'ai mal au ventre en trail ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "30-90 % des ultra-traileurs rapportent des troubles digestifs (Costa 2017). Causes : gut training insuffisant, hyperosmolarité des gels, déshydratation relative, secousses verticales. Solution : entraîne ton estomac 4-8 semaines avant ta course, en augmentant progressivement la dose g/h."
              }
            },
            {
              "@type": "Question",
              "name": "Que manger à une base de vie d'ultra ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Solide salé + bolus protéines 15-25 g. Exemples : bol de soupe + parmesan, riz salé + œuf dur, sandwich jambon-beurre, gnocchis beurre. Temps de prise : 5-15 min selon urgence chrono. Bois 300-500 mL pendant le passage. Repars avec ton ravito horaire pour les prochaines heures."
              }
            },
            {
              "@type": "Question",
              "name": "À quoi sert le sel en trail et combien en prendre ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Le sodium facilite l'absorption intestinale, prévient les crampes et protège contre l'hyponatrémie. Cible 400-1200 mg/L de boisson selon profil sudation. Si traces blanches sur ton t-shirt (heavy sweater) → 1000-1500 mg/L. Caps sel 500 mg en complément si sudation élevée."
              }
            },
            {
              "@type": "Question",
              "name": "C'est quoi le gut training et comment le faire ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Entraînement de l'estomac à digérer en course. Protocole 4-8 semaines : commence à 30 g/h sur sorties longues, augmente de +5-10 g/h chaque semaine, atteins ta cible 4 semaines avant. Règle d'or : rien de nouveau le jour J. Tout produit testé ≥3 fois en sortie longue."
              }
            },
            {
              "@type": "Question",
              "name": "Caféine en trail : combien, quand, sous quelle forme ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Pré-course : 3-6 mg/kg, 45-60 min avant le départ. En course : 1-3 mg/kg toutes les 2-3 h (gel caféiné, cola plate, capsule). Nuit en ultra : bolus 1-2 mg/kg en début de nuit. Plafond : 6 mg/kg/24 h. Premier ultra ou non-habitué : zéro caféine ou dose réduite."
              }
            },
            {
              "@type": "Question",
              "name": "Comment éviter l'écœurement du sucre sur un ultra ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Bascule progressive vers le salé après H6 : saucisson, fromage, crackers, bouillon chaud. Alterne arômes (ne pas 3 gels même goût d'affilée). Rinçage bouche eau pure entre gels. Acidité ponctuelle (citron, pickles). Températures contrastées (froid puis chaud) = reset gustatif."
              }
            },
            {
              "@type": "Question",
              "name": "Combien de protéines en course pour préserver les muscles ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sur effort >4 h : 5-10 g/h en continu dès H3 (1 gel protéiné OU 30 g saucisson OU 1 part fromage). Bolus aux bases de vie : 15-25 g (sandwich jambon, soupe + parmesan). PAS de protéine isolée pré-course immédiat (ralentit vidange gastrique)."
              }
            },
            {
              "@type": "Question",
              "name": "Comment savoir si je bois trop pendant un trail (hyponatrémie) ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Signaux d'alerte EAH : nausées sans cause apparente, gonflement des doigts/visage, confusion, prise de poids pendant la course, urine claire et abondante très fréquente. Profils à risque : femmes, coureurs lents (>8 h pour 50 km), météo chaude, boisson peu salée. Cap absolu 1 L/h. Boire à la soif."
              }
            },
            {
              "@type": "Question",
              "name": "Qu'est-ce qu'un plan B « estomac fermé » en ultra ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Si rejet total après H6+ : 1) Marcher 15 min, calmer le rythme cardiaque. 2) Rinçage bouche eau pure, petites gorgées eau salée tiède. 3) Bouillon chaud + cola dégazé (recommandation classique médecins UTMB). 4) Solides simples (saucisson, fromage dur) en micro-bouchées. Si vomissements répétés : arrêt obligatoire 30 min + évaluation médicale."
              }
            },
            {
              "@type": "Question",
              "name": "L'altitude change-t-elle la nutrition trail ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Au-delà de 1500 m : +10-15 % besoins hydratation, oxydation glucidique majorée (Péronnet). Si non acclimaté ≥2 semaines, l'effort est nettement plus dur. Maintiens ton apport glucidique cible, augmente l'hydratation, surveille les signes de mal aigu des montagnes (maux de tête, nausées)."
              }
            },
            {
              "@type": "Question",
              "name": "Combien d'eau pour la Saintélyon (78 km nuit) ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Pour 8-12 h d'effort à 0-10°C en nuit : 4-7 L d'eau au total. Soit 400-600 mL/h. Réduis car le froid masque la soif. Sodium : 500-800 mg/L car sudation modérée par temps froid. Caféine cognitive en milieu de nuit (1-2 mg/kg) recommandée si tu es habitué."
                                    }
            },
            {
              "@type": "Question",
              "name": "Distance équivalente ITRA : à quoi ça sert ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "C'est la formule D_eq = D + (D+/100) + (D-/400) utilisée par l'ITRA pour comparer la DIFFICULTÉ d'une course à un plat équivalent. Exemple : 50 km + 2000 D+ + 2000 D- = 75 km équivalent ITRA. Utile pour estimer ta durée probable, PAS la charge énergétique réelle (qui dépend du coût énergétique réel des pentes via la formule de Minetti)."
              }
            },
            {
              "@type": "Question",
              "name": "L'outil remplace-t-il un avis médical ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Non. Cet outil donne des estimations basées sur la littérature scientifique générale (±15 à 25 % d'incertitude en trail). Si tu as une condition médicale (diabète, troubles digestifs, pathologie cardiaque, grossesse, etc.), consulte un médecin du sport ou un diététicien-nutritionniste spécialisé endurance."
              }
            }
          ]
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Warning Bar pré/post — TOP */}
        {showWarningBar && (
          <div className="bg-amber-50 border-b-2 border-amber-300 px-4 py-4">
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-900 font-medium leading-relaxed">
                  Cet outil traite <strong>uniquement la nutrition PENDANT la course</strong>. Les phases
                  avant-course (carb-loading, dernier repas) et après-course (récupération, AINS interdits) sont primordiales et
                  nécessitent une approche distincte.
                </p>
                <button
                  onClick={dismissWarningBar}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                >
                  J'ai compris
                </button>
              </div>
              <button
                onClick={dismissWarningBar}
                aria-label="Fermer"
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-slate-800 to-slate-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="text-sm mb-6 text-slate-300">
              <Link to="/" className="hover:text-white">Accueil</Link>
              <span className="mx-2">/</span>
              <Link to="/outils" className="hover:text-white">Outils</Link>
              <span className="mx-2">/</span>
              <span className="text-accent">Nutrition Trail</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Calculateur Nutrition Trail — Gratuit, Instantané & Personnalisé
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mb-4">
              Calcule en <strong className="text-white">30 secondes</strong> ta stratégie nutrition trail sur-mesure :
              glucides g/h, hydratation mL/h, sodium, caféine et protéines adaptés à ta distance, D+, durée et météo
              (du trail court de 30 km à l'ultra de 24h+).
            </p>
            <p className="text-sm text-slate-400 max-w-3xl">
              Basé sur ACSM (2024), Jeukendrup (2014/2017), Tiller ISSN (2019 Ultra), Hew-Butler (2015 EAH),
              Minetti (2002 coût énergétique pentes), Costa (2017 gut training). Outil 100 % gratuit, sans inscription.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Gratuit</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ 30 sec</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Distance équivalente ITRA</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Du 30 km au 100 mi</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Plan B estomac fermé</span>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 -mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Mountain className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Ma stratégie nutrition trail</h2>
              </div>

              {/* SECTION 1 — Profil */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">1. Profil</h3>

                <div className="grid md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sexe</label>
                    <div className="flex gap-3">
                      {(['H', 'F'] as Sexe[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSexe(s)}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium ${
                            sexe === s
                              ? 'border-accent bg-accent/5 text-accent'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          {s === 'H' ? 'Homme' : 'Femme'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Poids (kg) <span className="text-xs text-slate-400">— utilisé uniquement pour le calcul</span>
                    </label>
                    <input
                      type="number"
                      value={poids}
                      onChange={(e) => setPoids(e.target.value)}
                      placeholder="Ex: 70"
                      min="30"
                      max="200"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Niveau</label>
                    <select
                      value={niveau}
                      onChange={(e) => setNiveau(e.target.value as Niveau)}
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="Débutant">Débutant</option>
                      <option value="Régulier">Régulier</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Premier trail/ultra</label>
                    <label
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl ${
                        niveau === 'Débutant' ? 'bg-slate-50 cursor-not-allowed' : 'cursor-pointer hover:border-accent/50'
                      } ${premierMode ? 'border-accent bg-accent/5' : 'border-slate-200'}`}
                    >
                      <input
                        type="checkbox"
                        checked={premierMode}
                        disabled={niveau === 'Débutant'}
                        onChange={(e) => setPremierMode(e.target.checked)}
                        className="w-5 h-5 accent-accent"
                      />
                      <span className="text-sm text-slate-700">
                        C'est mon premier trail/ultra
                        {niveau === 'Débutant' && (
                          <span className="block text-xs text-slate-500">Activé d'office pour les débutants</span>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2 — Course (Trail) */}
              <div className="mb-8 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">2. Course</h3>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Distance (km)</label>
                    <input
                      type="number"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                      placeholder="Ex: 50"
                      min="5"
                      max="300"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      D+ (m) <span className="text-xs text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={dPlus}
                      onChange={(e) => setDPlus(e.target.value)}
                      placeholder="Ex: 2500"
                      min="0"
                      max="15000"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      D- (m) <span className="text-xs text-slate-400">(optionnel, = D+ si vide)</span>
                    </label>
                    <input
                      type="number"
                      value={dMinus}
                      onChange={(e) => setDMinus(e.target.value)}
                      placeholder="Ex: 2500"
                      min="0"
                      max="15000"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Durée visée
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={chronoH}
                        onChange={(e) => setChronoH(e.target.value)}
                        placeholder="h"
                        min="0"
                        max="30"
                        className="w-full p-4 border border-slate-300 rounded-xl text-center focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                      <span className="text-slate-500 font-bold">:</span>
                      <input
                        type="number"
                        value={chronoM}
                        onChange={(e) => setChronoM(e.target.value)}
                        placeholder="m"
                        min="0"
                        max="59"
                        className="w-full p-4 border border-slate-300 rounded-xl text-center focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                      <span className="text-slate-500 font-bold">:</span>
                      <input
                        type="number"
                        value={chronoS}
                        onChange={(e) => setChronoS(e.target.value)}
                        placeholder="s"
                        min="0"
                        max="59"
                        className="w-full p-4 border border-slate-300 rounded-xl text-center focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Ex : 8h30 → 8 / 30 / 00 — entre 0h30 et 30h</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Altitude moyenne
                    </label>
                    <select
                      value={altitude}
                      onChange={(e) => setAltitude(e.target.value as Altitude)}
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="Mer/<500m">Mer / &lt;500 m</option>
                      <option value="500-1500m">500-1500 m</option>
                      <option value="1500-2500m">1500-2500 m</option>
                      <option value=">2500m">&gt;2500 m</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Température jour J (°C)
                    </label>
                    <input
                      type="number"
                      value={tempC}
                      onChange={(e) => setTempC(e.target.value)}
                      placeholder="Ex: 12"
                      min="-20"
                      max="45"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Hygrométrie</label>
                    <select
                      value={hygrometrie}
                      onChange={(e) => setHygrometrie(e.target.value as Hygrometrie)}
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="Sec">Sec (&lt; 40%)</option>
                      <option value="Standard">Standard (40-70%)</option>
                      <option value="Humide">Humide (&gt; 70%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Bases de vie / ravitos majeurs
                    </label>
                    <input
                      type="number"
                      value={basesDeVie}
                      onChange={(e) => setBasesDeVie(e.target.value)}
                      placeholder="Ex: 2"
                      min="0"
                      max="10"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expérience nutrition en course</label>
                    <select
                      value={expNutrition}
                      onChange={(e) => setExpNutrition(e.target.value as ExpNutrition)}
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="Jamais">Jamais (jamais testé en course)</option>
                      <option value="Occasionnel">Occasionnel (quelques tests SL)</option>
                      <option value="Habitué">Habitué (gut training fait)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3 — Affinages (accordéon) */}
              <div className="mb-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAffinages(!showAffinages)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                    3. Affinages (optionnel)
                  </h3>
                  {showAffinages ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {showAffinages && (
                  <div className="mt-4 grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Profil sudation</label>
                      <select
                        value={sudation}
                        onChange={(e) => setSudation(e.target.value as Sudation)}
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                      >
                        <option value="Faible">Faible</option>
                        <option value="Modéré">Modéré</option>
                        <option value="Élevé">Élevé</option>
                        <option value="Salty sweater">Salty sweater (traces blanches sur la peau)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Habitude caféine quotidienne</label>
                      <select
                        value={cafeineHabit}
                        onChange={(e) => setCafeineHabit(e.target.value as Cafeine)}
                        className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                      >
                        <option value="Aucune">Aucune</option>
                        <option value="1-2 cafés/j">1-2 cafés/j</option>
                        <option value="3+ cafés/j">3+ cafés/j</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* BOUTON CALCULER */}
              <button
                type="button"
                onClick={calculate}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
              >
                <Zap className="w-5 h-5" />
                Calculer ma stratégie
              </button>
            </div>
          </div>
        </section>

        {/* RESULTS */}
        {result && (
          <section id="nutrition-results" className="py-12 bg-slate-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

              {/* Mode Premier message */}
              {result.premierMode && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                  <p className="text-sm text-blue-900">
                    <strong>Mode Premier trail/ultra activé.</strong> Stratégie volontairement prudente :
                    cap glucides 60 g/h, zéro caféine, sodium plafonné. L'objectif est de finir confortablement.
                  </p>
                </div>
              )}

              {/* Soft warnings */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  {result.warnings.map((w, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-900 flex gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* CARTE 1 — Synthèse */}
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Activity className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Synthèse : ta course en chiffres</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{result.totalKcal}</div>
                    <div className="text-xs text-slate-500 mt-1">kcal totales</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">{result.totalCarbs}g</div>
                    <div className="text-xs text-slate-500 mt-1">glucides</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{result.totalHydration}</div>
                    <div className="text-xs text-slate-500 mt-1">mL eau</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-700">{result.sodiumPerLiter}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      mg sodium / L
                      <span className="block text-[10px] text-slate-400 mt-0.5">dans ta boisson</span>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">{result.caffeinePreRace}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      mg caféine pré
                      {result.caffeineInRaceMgPerDose > 0 && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          + {result.caffeineInRaceMgPerDose} mg / 2-3h
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <strong>Glucides/h :</strong> {result.carbsPerHour.target} g/h
                    <span className="text-xs text-slate-400 ml-2">(plage {result.carbsPerHour.min}-{result.carbsPerHour.max})</span>
                  </div>
                  <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <strong>Hydratation/h :</strong> {result.hydrationPerHour} mL/h
                  </div>
                  <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <strong>Sodium :</strong> {result.sodiumPerLiter} mg/L de boisson
                  </div>
                  <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <strong>Durée estimée :</strong> {result.durationLabel}
                  </div>
                  {result.showProteins && (
                    <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg md:col-span-2">
                      <strong>Protéines (dès H3) :</strong> {result.proteinsPerHour} g/h en continu — total estimé {result.totalProteins} g + bolus 15-25 g aux bases de vie.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
                  Estimation théorique ±15-25% en trail (terrain, technicité, conditions). Adapte selon ton ressenti
                  jour J — aucune stratégie ne remplace les sensations en temps réel.
                </div>
              </div>

              {/* CARTE 2 — Distance équivalente ITRA (spécifique trail) */}
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Compass className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Distance équivalente ITRA</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">Distance réelle</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{result.distanceKm} km</div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">D+ / D-</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{result.dPlus} / {result.dMinus} m</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-xs text-emerald-700 uppercase font-bold">Équivalent plat</div>
                    <div className="text-2xl font-bold text-emerald-800 mt-1">{result.distanceEquivalenteITRA} km</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  <strong>Méthode ITRA</strong> : <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">D_eq = D + (D+/100) + (D-/400)</code>.
                  Cette formule sert à comparer la <strong>difficulté</strong> d'une course à un plat équivalent — elle est utile pour
                  estimer une durée probable, mais elle <strong>ne mesure pas la dépense énergétique réelle</strong> (qui dépend
                  du coût énergétique des pentes, voir formule de Minetti 2002 utilisée ci-dessus pour les kcal).
                </p>
              </div>

              {/* CARTE 3 — Timeline */}
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Timeline de course</h2>
                </div>

                <div className="space-y-3">
                  {result.timeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-4 p-4 rounded-xl border-l-4 ${
                        step.tone === 'warning'
                          ? 'bg-red-50 border-red-400'
                          : step.tone === 'highlight'
                          ? 'bg-amber-50 border-amber-400'
                          : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900 min-w-[110px]">{step.window}</div>
                      <div className="text-sm text-slate-700 flex-1">{step.instruction}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARTE 4 — Pack nutrition */}
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Package className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Pack nutrition à prévoir</h2>
                </div>

                <ul className="space-y-3 mb-4">
                  <li className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>{result.nbGels} gels</strong> de 25 g glucides (type maltodextrine + fructose, ratio 2:1 ou 1:0.8)
                      {result.basesDeVie > 0 && <> — déduit de l'apport bases de vie ({result.basesDeVie} × ~40 g)</>}
                    </span>
                  </li>
                  <li className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>{result.nbBidons} bidons</strong> de 500 mL d'isotonique (60-80 g/L glucides + {result.sodiumPerLiter} mg/L sodium) — recharge aux ravitos
                    </span>
                  </li>
                  {result.nbCapsSel > 0 && (
                    <li className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.nbCapsSel} caps de sel</strong> de 500 mg (complément si sudation élevée)
                      </span>
                    </li>
                  )}
                  {result.showProteins && (
                    <li className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>Protéines :</strong> gels protéinés OU 100-200 g saucisson sec / fromage à pâte dure (cible {result.proteinsPerHour} g/h dès H3)
                      </span>
                    </li>
                  )}
                  {result.caffeinePreRace > 0 && (
                    <li className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.caffeinePreRace} mg caféine pré-course</strong> (gélule, expresso)
                        {result.caffeineInRaceMgPerDose > 0 && (
                          <> + <strong>{result.caffeineInRaceMgPerDose} mg/prise</strong> toutes les 2-3 h (gel caféiné, cola plate)</>
                        )}
                      </span>
                    </li>
                  )}
                  {result.showLassitude && (
                    <li className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>Kit anti-écœurement :</strong> bouillon en poudre, soupe miso, crackers salés, riz blanc, pickles/cornichons
                      </span>
                    </li>
                  )}
                </ul>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-900 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>À tester en sortie longue avant ta course objectif.</strong> Aucun produit, aucune marque,
                    aucun timing ne doit être découvert le jour J. Gut training 4-8 semaines avant ton ultra.
                  </span>
                </div>
              </div>

              {/* CARTE 5 — Plan B estomac fermé (si effort >6 h) */}
              {result.showPlanB && (
                <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-amber-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Soup className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Plan B — estomac fermé</h2>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Sur effort &gt;6 h, le rejet digestif arrive chez 30-90 % des ultra-traileurs (Costa 2017). Protocole 4 étapes si tu n'arrives plus à rien avaler :
                  </p>
                  <ol className="space-y-3">
                    {[
                      { n: 1, title: "Marcher 15 min", body: "Calme la fréquence cardiaque, redirige le flux sanguin vers le système digestif. Reset complet." },
                      { n: 2, title: "Rinçage bouche eau pure", body: "Élimine résidu sucré. Puis petites gorgées d'eau salée tiède (1 g de sel pour 500 mL)." },
                      { n: 3, title: "Bouillon chaud + cola plate", body: "Recommandation classique des médecins UTMB. Bouillon = sel + glucose, cola dégazé = glucides simples + caféine légère." },
                      { n: 4, title: "Solides simples en micro-bouchées", body: "Saucisson sec, fromage à pâte dure (comté, parmesan), pickles. Salé exclusivement. Pas plus de 50 g/15 min." },
                    ].map((s) => (
                      <li key={s.n} className="flex gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{s.n}</div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{s.title}</div>
                          <div className="text-xs text-slate-600 mt-1">{s.body}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900 flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span><strong>2 vomissements à courte distance = arrêt obligatoire 30 min</strong> + évaluation médicale au prochain poste.</span>
                  </div>
                </div>
              )}

              {/* CARTE 6 — Bases de vie (si renseignées) */}
              {result.basesDeVie > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-50 rounded-lg">
                      <Utensils className="w-5 h-5 text-rose-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Conseils bases de vie ({result.basesDeVie})</h2>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Une base de vie n'est pas un ravito : c'est un moment stratégique. Timing &amp; contenu selon ton état.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      {
                        title: "Si jambes OK",
                        time: "Passage rapide 5 min",
                        body: "1 gel + 1 portion solide (sandwich petit), bidon rechargé. Repars vite, ne te repose pas inutilement.",
                        color: "emerald",
                      },
                      {
                        title: "Si fatigue moyenne",
                        time: "Passage moyen 10-15 min",
                        body: "Bouillon chaud ou soupe + solide salé + bolus protéines 15-25 g (saucisson, fromage, œuf dur). Assis quelques minutes.",
                        color: "amber",
                      },
                      {
                        title: "Si mode survie",
                        time: "Passage long 20-30 min",
                        body: "S'asseoir, soupe + plat chaud + boisson chaude. Évaluer abandon honnêtement vs reprise lente. Soigner les pieds.",
                        color: "red",
                      },
                    ].map((c, i) => (
                      <div key={i} className={`p-4 rounded-xl border-l-4 bg-${c.color}-50 border-${c.color}-400`}>
                        <div className="font-bold text-sm text-slate-900 mb-1">{c.title}</div>
                        <div className="text-xs text-slate-500 mb-2 italic">{c.time}</div>
                        <div className="text-xs text-slate-700 leading-relaxed">{c.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CARTE 7 — Lassitude gustative (si effort >8 h) */}
              {result.showLassitude && (
                <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Flame className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Lassitude gustative en ultra</h2>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Après 8 h d'effort, le sucré devient écœurant (saturation T1R2/T1R3, vidange gastrique ralentie — Pfeiffer 2012).
                    Bascule progressive vers le salé :
                  </p>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-purple-900 rounded-l-lg">Phase</th>
                          <th className="px-3 py-2 text-left font-semibold text-purple-900">% liquide</th>
                          <th className="px-3 py-2 text-left font-semibold text-purple-900">% solide</th>
                          <th className="px-3 py-2 text-left font-semibold text-purple-900 rounded-r-lg">Switch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        <tr><td className="px-3 py-2 font-semibold">H0-H2</td><td className="px-3 py-2">100%</td><td className="px-3 py-2">0%</td><td className="px-3 py-2 text-xs">Estomac sensible</td></tr>
                        <tr className="bg-purple-50/40"><td className="px-3 py-2 font-semibold">H2-H4</td><td className="px-3 py-2">70%</td><td className="px-3 py-2">30%</td><td className="px-3 py-2 text-xs">Intro gel "mou"</td></tr>
                        <tr><td className="px-3 py-2 font-semibold">H4-H8</td><td className="px-3 py-2">50%</td><td className="px-3 py-2">50%</td><td className="px-3 py-2 text-xs">Alternance</td></tr>
                        <tr className="bg-purple-50/40"><td className="px-3 py-2 font-semibold">H8-H12</td><td className="px-3 py-2">30%</td><td className="px-3 py-2">70%</td><td className="px-3 py-2 text-xs"><strong>Salé dominant</strong></td></tr>
                        <tr><td className="px-3 py-2 font-semibold">H12+</td><td className="px-3 py-2">30-40%</td><td className="px-3 py-2">60-70%</td><td className="px-3 py-2 text-xs">Aliments "vrais" + bouillons chauds</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 italic">
                    Stratégies anti-écœurement : rinçage bouche entre gels, alternance arômes, températures contrastées (froid puis chaud),
                    acidité ponctuelle (citron, pickles), bonbon menthe ou gingembre.
                  </p>
                </div>
              )}

              {/* CARTE 8 — Sécurité (accordéon) */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSafety(!showSafety)}
                  className="w-full p-6 md:p-8 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Sécurité et précautions</h2>
                  </div>
                  {showSafety ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {showSafety && (
                  <div className="px-6 md:px-8 pb-8 space-y-4">
                    <div className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-red-900 mb-1">Hyponatrémie d'effort (EAH) — POINT VITAL</h3>
                      <p className="text-sm text-red-800">
                        5-30 % des finishers d'ultra sont touchés (Hoffman &amp; Stuempfle). Cap absolu 1000 mL/h.
                        Signaux : nausées sans cause, gonflement des doigts/visage, confusion, prise de poids en course,
                        urine claire et abondante très fréquente. Profils à risque : femmes, coureurs lents, météo chaude.
                        <br /><strong>Règle d'or : boire À LA SOIF. Jamais au-delà.</strong>
                      </p>
                    </div>

                    <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-orange-900 mb-1">Hypoglycémie réactionnelle</h3>
                      <p className="text-sm text-orange-800">
                        Ne prends aucun gel ni glucides rapides dans les 15 minutes précédant le départ.
                        Soit &gt;60 min avant, soit dans les 5 min avant (l'exercice annule l'insulinémie).
                      </p>
                    </div>

                    <div className="border-l-4 border-rose-400 bg-rose-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-rose-900 mb-1">PAS d'AINS (ibuprofène, etc.)</h3>
                      <p className="text-sm text-rose-800">
                        Ne prends PAS d'AINS pendant ou juste après l'ultra : risque insuffisance rénale aiguë majoré
                        (Lipman 2017, Western States). En cas de douleur : paracétamol uniquement, consulte si persistante.
                      </p>
                    </div>

                    <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-amber-900 mb-1">Gut training indispensable</h3>
                      <p className="text-sm text-amber-800">
                        Sans gut training, abandon GI quasi garanti en ultra. Démarre 4-8 semaines avant : 30 g/h en SL,
                        +5-10 g/h chaque semaine, cible atteinte 4 semaines avant le départ. Rien de nouveau le jour J.
                      </p>
                    </div>

                    <div className="border-l-4 border-purple-400 bg-purple-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-purple-900 mb-1">Vomissements répétés / confusion</h3>
                      <p className="text-sm text-purple-800">
                        2 vomissements à courte distance = arrêt obligatoire 30 min + évaluation médicale.
                        Confusion mentale ou désorientation = signal d'arrêt immédiat (peut signer EAH, hypothermie ou hypoglycémie sévère).
                      </p>
                    </div>

                    {/* Disclaimer médical — accordéon */}
                    <div className="border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setShowMedicalDisclaimer(!showMedicalDisclaimer)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Cet outil ne s'applique pas si tu as une condition médicale (cliquer pour voir la liste)
                        </span>
                        {showMedicalDisclaimer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showMedicalDisclaimer && (
                        <div className="px-4 pb-4 text-sm text-slate-600 space-y-2">
                          <p>Ne suis pas ces recommandations sans avis médical si tu présentes l'une de ces conditions :</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Diabète (type 1 ou 2) ou résistance à l'insuline</li>
                            <li>Pathologie cardiaque ou hypertension non équilibrée</li>
                            <li>Insuffisance rénale ou troubles électrolytiques</li>
                            <li>Troubles digestifs chroniques (Crohn, RCH, SII sévère, gastrite, reflux sévère)</li>
                            <li>Grossesse ou allaitement</li>
                            <li>Antécédents ou trouble du comportement alimentaire (TCA)</li>
                            <li>Allergies ou intolérances alimentaires (gluten, lactose, fructose...)</li>
                            <li>Traitement médicamenteux interagissant avec la caféine ou l'hydratation</li>
                            <li>Antécédents d'hyponatrémie ou de coup de chaleur</li>
                            <li>Anémie ferriprive ou pathologie thyroïdienne</li>
                            <li>Mal aigu des montagnes (MAM) antérieur en altitude</li>
                          </ul>
                          <p className="font-semibold pt-2">
                            Consulte un médecin du sport ou un diététicien-nutritionniste spécialisé endurance/ultra.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CARTE 9 — CTA Plan (POST-synthèse uniquement) */}
              <div className="bg-gradient-to-br from-accent to-orange-500 text-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3">
                  Ta stratégie nutrition est prête. Et ton plan d'entraînement trail ?
                </h2>
                <p className="text-white/90 mb-5 text-sm md:text-base">
                  Une stratégie nutrition solide a besoin d'un plan trail progressif derrière (côtes, descentes, D+).
                  Notre IA te construit un plan personnalisé sur-mesure en 2 minutes.
                </p>
                <Link
                  to="/auth"
                  onClick={onCtaPlanClick}
                  className="inline-flex items-center gap-2 bg-white text-accent hover:bg-slate-100 font-semibold py-3 px-6 rounded-full transition-colors shadow-md"
                >
                  Créer mon plan d'entraînement
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Bouton imprimer */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-sm text-slate-500 hover:text-accent underline"
                >
                  Imprimer / exporter ma stratégie en PDF
                </button>
              </div>
            </div>
          </section>
        )}

        {/* CONTENU SEO — cards visuelles */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

            {/* H2 À quoi sert */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded-xl flex-shrink-0">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  À quoi sert ce calculateur nutrition trail&nbsp;?
                </h2>
              </div>
              <div className="prose prose-slate max-w-none">
                <p>Le trail et l'ultra sont des épreuves où la <strong>stratégie nutritionnelle</strong> détermine plus que tout autre paramètre la capacité à finir. Au-delà de 4 h d'effort, les stocks de <strong>glycogène</strong> s'épuisent, l'<strong>hyponatrémie d'effort</strong> menace plus que la déshydratation pure (Hoffman &amp; Stuempfle), et 30-90 % des ultra-traileurs souffrent de troubles digestifs (Costa 2017).</p>
                <p>Cet outil personnalise ta stratégie selon ta <strong>distance, D+, D-, durée visée, altitude</strong>, ton <strong>profil physiologique</strong> et les conditions <strong>météo du jour J</strong>. Tu obtiens un plan complet&nbsp;: glucides/h, hydratation/h, sodium, caféine, protéines, timeline, conseils bases de vie, plan B estomac fermé.</p>
              </div>
            </div>

            {/* H2 Comment fonctionne */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                  <Beaker className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Comment fonctionne le calculateur&nbsp;?
                </h2>
              </div>
              <p className="text-slate-700 mb-4">Les formules s'appuient sur les <strong>consensus scientifiques internationaux</strong>&nbsp;:</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {[
                  { name: 'ACSM 2024', desc: 'Sodium + hydratation (Sawka 2007 base)' },
                  { name: 'Jeukendrup 2014/2017', desc: 'Tables glucides + gut training' },
                  { name: 'Tiller ISSN 2019', desc: 'Position stand single-stage ultra' },
                  { name: 'Hew-Butler 2015', desc: 'Prévention hyponatrémie d\'effort (EAH)' },
                  { name: 'Minetti 2002', desc: 'Coût énergétique pentes (kcal/h trail)' },
                  { name: 'Costa 2017', desc: 'Gut training + GI distress ultra' },
                  { name: 'ITRA', desc: 'Distance équivalente (difficulté course)' },
                  { name: 'Grgic 2020', desc: 'Méta-analyse caféine endurance' },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-slate-600 text-xs mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <strong>Ajustements doctrine&nbsp;:</strong> cap glucides 60 g/h en mode "premier trail/ultra",
                  cap hydratation absolu 1000 mL/h (sécurité EAH), réduction -20&nbsp;% de la cible glucidique
                  si l'expérience nutrition est nulle, zéro caféine si premier ultra, plafond 6 mg/kg caféine cumulés.
                </p>
              </div>
            </div>

            {/* H2 Glucides trail */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded-xl flex-shrink-0">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Glucides par heure&nbsp;: 0 à 100 g/h selon ta durée d'effort
                </h2>
              </div>
              <p className="text-slate-700 mb-5">La cible <strong>glucides/heure</strong> en trail dépend principalement de la durée d'effort, plus que de l'intensité (en trail, durée prend le relais sur intensité comme driver des besoins)&nbsp;:</p>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900 rounded-l-lg">Durée</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900">Cible</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900">Plage</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900 rounded-r-lg">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    <tr><td className="px-4 py-3 font-semibold">&lt;1h</td><td className="px-4 py-3 text-orange-700 font-bold">15 g/h</td><td className="px-4 py-3 text-slate-600">0-30</td><td className="px-4 py-3 text-slate-600 text-xs">Mouth rinse suffit souvent</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">1-2h</td><td className="px-4 py-3 text-orange-700 font-bold">45 g/h</td><td className="px-4 py-3 text-slate-600">30-60</td><td className="px-4 py-3 text-slate-600 text-xs">Glucose seul OK</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">2-3h</td><td className="px-4 py-3 text-orange-700 font-bold">70 g/h</td><td className="px-4 py-3 text-slate-600">60-90</td><td className="px-4 py-3 text-slate-600 text-xs">Ratio 2:1 obligatoire</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">3-6h</td><td className="px-4 py-3 text-orange-700 font-bold">75 g/h</td><td className="px-4 py-3 text-slate-600">60-90</td><td className="px-4 py-3 text-slate-600 text-xs">Premier solide léger</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">6-12h</td><td className="px-4 py-3 text-orange-700 font-bold">80 g/h</td><td className="px-4 py-3 text-slate-600">70-100</td><td className="px-4 py-3 text-slate-600 text-xs">Lassitude possible, bascule salé</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">12-24h</td><td className="px-4 py-3 text-orange-700 font-bold">70 g/h</td><td className="px-4 py-3 text-slate-600">60-90</td><td className="px-4 py-3 text-slate-600 text-xs">Digestion saturée — baisse volontaire</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">24h+</td><td className="px-4 py-3 text-orange-700 font-bold">60 g/h</td><td className="px-4 py-3 text-slate-600">50-80</td><td className="px-4 py-3 text-slate-600 text-xs">Aliments "vrais" dominants</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-4 italic">Sources&nbsp;: ACSM 2024, Jeukendrup 2014 (Sports Med), Tiller ISSN 2019, Costa 2017.</p>
            </div>

            {/* H2 Hydratation */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Hydratation trail&nbsp;: hyponatrémie ≫ déshydratation
                </h2>
              </div>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-5">
                <p className="text-sm text-red-900">
                  <strong>⚠ Erreur classique en ultra&nbsp;:</strong> forcer la boisson "pour bien faire" → <strong>hyponatrémie d'effort (EAH)</strong> qui touche 5-30 % des finishers (Hoffman &amp; Stuempfle Western States).
                  <br /><strong>Règle d'or&nbsp;:</strong> boire à la soif, jamais plus de <strong>1000 mL/h</strong>.
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-3 font-medium">Matrice mL/h par profil sudation × température (pondéré poids et altitude)&nbsp;:</p>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-blue-900 rounded-l-lg">Sudation</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-900">&lt; 10°C</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-900">10-18°C</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-900">18-25°C</th>
                      <th className="px-3 py-3 text-center font-semibold text-blue-900 rounded-r-lg">&gt; 25°C</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    <tr><td className="px-3 py-3 font-semibold">Faible</td><td className="px-3 py-3 text-center">350</td><td className="px-3 py-3 text-center">450</td><td className="px-3 py-3 text-center">550</td><td className="px-3 py-3 text-center">650</td></tr>
                    <tr className="bg-blue-50/40"><td className="px-3 py-3 font-semibold">Modéré</td><td className="px-3 py-3 text-center">450</td><td className="px-3 py-3 text-center">550</td><td className="px-3 py-3 text-center">650</td><td className="px-3 py-3 text-center">800</td></tr>
                    <tr><td className="px-3 py-3 font-semibold">Élevé</td><td className="px-3 py-3 text-center">550</td><td className="px-3 py-3 text-center">650</td><td className="px-3 py-3 text-center">800</td><td className="px-3 py-3 text-center">900</td></tr>
                    <tr className="bg-blue-50/40"><td className="px-3 py-3 font-semibold">Salty sweater</td><td className="px-3 py-3 text-center">600</td><td className="px-3 py-3 text-center">700</td><td className="px-3 py-3 text-center">850</td><td className="px-3 py-3 text-center font-bold text-blue-700">950</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">Ajustements&nbsp;: +10 % humide, -5 % sec, +10 % altitude 1500-2500 m, +15 % &gt;2500 m. Cap absolu 1000 mL/h.</p>
            </div>

            {/* H2 Altitude */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-cyan-50 rounded-xl flex-shrink-0">
                  <Mountain className="w-6 h-6 text-cyan-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Altitude et nutrition trail
                </h2>
              </div>
              <p className="text-slate-700 mb-4">
                Au-delà de <strong>1500 m</strong>, les besoins évoluent (Péronnet) — oxydation glucidique majorée, hydratation augmentée, vigilance EAH renforcée.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" /> <span><strong>1500-2500 m</strong> : +10 % besoins hydratation. Effort perçu majoré si non acclimaté.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" /> <span><strong>&gt;2500 m</strong> : +15 % hydratation, oxydation glucidique nettement majorée. Acclimatation ≥2 semaines fortement recommandée.</span></li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" /> <span>Surveille les signes de <strong>mal aigu des montagnes</strong> (MAM) : maux de tête, nausées, fatigue anormale.</span></li>
              </ul>
            </div>

            {/* H2 Sodium */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl flex-shrink-0">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Sodium en trail&nbsp;: combien et pourquoi
                </h2>
              </div>
              <p className="text-slate-700 mb-4">Le <strong>sodium</strong> facilite l'absorption intestinale, prévient les <strong>crampes</strong> et protège contre l'<strong>hyponatrémie</strong>. En ultra &gt;4 h, c'est l'électrolyte numéro 1.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Sudation faible', value: '400 mg/L', color: 'emerald' },
                  { label: 'Sudation modérée', value: '600 mg/L', color: 'emerald' },
                  { label: 'Sudation élevée', value: '900 mg/L', color: 'emerald' },
                  { label: 'Salty sweater (traces blanches)', value: '1200 mg/L', color: 'emerald' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                    <span className="text-sm text-slate-700 font-medium">{s.label}</span>
                    <span className="text-lg font-bold text-emerald-700">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* H2 Caféine */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl flex-shrink-0">
                  <Coffee className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Caféine en trail&nbsp;: dosage, timing, nuit
                </h2>
              </div>
              <p className="text-slate-700 mb-4">
                La caféine améliore la performance d'environ <strong>2-4 % en endurance</strong> (Grgic 2020).
                En ultra-trail, son effet <strong>anti-somnolent</strong> est crucial sur nuit blanche (UTMB, Diagonale).
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { ic: '🎯', txt: <><strong>Pré-course&nbsp;:</strong> 3-6 mg/kg, 45-60 min avant le départ.</> },
                  { ic: '⚡', txt: <><strong>En course&nbsp;:</strong> 1-3 mg/kg toutes les 2-3 h (gel caféiné, cola plate, capsule).</> },
                  { ic: '🌙', txt: <><strong>Nuit en ultra&nbsp;:</strong> bolus 1-2 mg/kg en début de nuit pour rester éveillé.</> },
                  { ic: '☕', txt: <>Si <strong>3 cafés/jour ou plus</strong>&nbsp;: réduis la dose pré de 17&nbsp;% (tolérance).</> },
                  { ic: '🚫', txt: <>Si <strong>premier ultra</strong> ou caféine non testée&nbsp;: zéro caféine. Trop d'inconnues.</> },
                  { ic: '⚠️', txt: <>Plafond sécurité&nbsp;: <strong>6 mg/kg cumulés sur 24 h</strong>. Au-delà&nbsp;: palpitations, GI distress, insomnie.</> },
                ].map((b, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-purple-50/50 rounded-lg">
                    <span className="text-lg flex-shrink-0">{b.ic}</span>
                    <span className="text-sm text-slate-700">{b.txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* H2 Plan nutrition par distance — H3 same-page SEO */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
                  <ListChecks className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    Pack nutrition trail par distance
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">4 paliers — du trail court au 100 km</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { dist: '30 km', duree: '3-5h', carbs: '70-90 g/h', body: '6-10 gels glucidiques + 2 bidons 500 mL isotonique (60-80 g/L). Sodium 600-900 mg/L selon sudation. Caféine 3 mg/kg pré-course optionnelle. Premier solide léger possible vers H2 (banane ravito).' },
                  { dist: '50 km', duree: '6-10h', carbs: '75-90 g/h', body: '10-16 gels + 3-5 bidons. Démarre protéines dès H3 (5-10 g/h, gel protéiné ou saucisson). Sodium 700-1000 mg/L. Caféine pré + relais toutes 2-3 h après H3. Premier "vrai" salé vers H4 (sandwich petit, fromage).' },
                  { dist: '80 km', duree: '10-16h', carbs: '70-90 g/h', body: '15-25 gels au total. Bascule salé dominant après H6 : saucisson, fromage, soupe miso, bouillon chaud. Protéines 5-10 g/h en continu + bolus 15-25 g aux bases de vie. Caféine cognitive en milieu de course. Kit anti-écœurement obligatoire.' },
                  { dist: '100 km', duree: '12-24h', carbs: '60-90 g/h', body: 'Aliments "vrais" prioritaires après H8 : riz salé, omelette, gnocchis beurre, soupe + parmesan. Sucré minoritaire en relais. Vigilance EAH ++ (boire À LA SOIF). Plan B estomac fermé connu d\'avance. Caféine 1-2 mg/kg bolus en début de nuit si applicable.' },
                ].map((p) => (
                  <div key={p.dist} className="border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-colors">
                    <div className="flex flex-wrap items-baseline gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">Pack nutrition trail {p.dist}</h3>
                      <span className="text-xs text-slate-500">({p.duree})</span>
                      <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{p.carbs}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* FAQ accordéon */}
        <section className="py-16 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                Questions fréquentes — Nutrition Trail
              </h2>
              <p className="text-slate-600">
                15 réponses scientifiques aux questions concrètes des traileurs et ultra-traileurs.
              </p>
            </div>
            <FaqAccordion items={TRAIL_FAQ_ITEMS} />
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Autres outils nutrition course
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/outils/nutrition-marathon" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  🍯 Nutrition Marathon
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Stratégie complète pour ton marathon (sub-3h à sub-5h30)
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/nutrition-semi-marathon" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  🍃 Nutrition Semi-Marathon
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Faut-il manger ? Stratégie honnête selon ton chrono
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/predicteur-temps" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Prédicteur de Temps
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Estime tes chronos sur toutes les distances
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* CSS print */}
      <style>{`
        @media print {
          nav, button, a[href="/auth"], .bg-gradient-to-br { display: none !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAQ accordéon (interactif, monolithique — pas d'abstraction)
// ─────────────────────────────────────────────────────────────────────────────
type FaqItem = { q: string; a: React.ReactNode };

const TRAIL_FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Combien de gels par heure en trail ?',
    a: <>Selon la durée : trail court (2-3 h) 1-2 gels/h, ultra (6-12 h) 2-3 gels/h, ultra long (24 h+) <strong>diminution volontaire</strong> (digestion saturée). Au-delà de 60 g/h, tes gels DOIVENT contenir glucose:fructose 2:1 ou 1:0.8.</>,
  },
  {
    q: 'Quelle quantité d\'eau prévoir pour un trail 50 km / 80 km / 100 km ?',
    a: <>Compte 500-800 mL/h selon météo. <strong>50 km (5-8 h)&nbsp;:</strong> 3-6 L. <strong>80 km (10-15 h)&nbsp;:</strong> 6-12 L. <strong>100 km (12-24 h)&nbsp;:</strong> 8-20 L. Cap absolu&nbsp;: 1000 mL/h (EAH).</>,
  },
  {
    q: 'Pourquoi j\'ai mal au ventre en trail ?',
    a: <>30-90 % des ultra-traileurs souffrent de GI distress (Costa 2017). Causes&nbsp;: gut training insuffisant, hyperosmolarité des gels, déshydratation relative, secousses verticales. Solution&nbsp;: gut training 4-8 semaines avant la course, augmentation progressive des doses g/h.</>,
  },
  {
    q: 'Que manger à une base de vie d\'ultra ?',
    a: <>Solide salé + bolus protéines 15-25 g. Exemples&nbsp;: soupe + parmesan, riz salé + œuf dur, sandwich jambon-beurre, gnocchis beurre. Temps de prise&nbsp;: 5-15 min selon ton état. Bois 300-500 mL pendant le passage.</>,
  },
  {
    q: 'À quoi sert le sel en trail et combien en prendre ?',
    a: <>Le sodium facilite l'absorption intestinale, prévient les crampes et protège contre l'hyponatrémie. Cible <strong>400-1200 mg/L</strong> de boisson selon profil sudation. Traces blanches sur t-shirt (heavy sweater) → 1000-1500 mg/L.</>,
  },
  {
    q: 'C\'est quoi le gut training et comment le faire ?',
    a: <>Entraînement de l'estomac à digérer en course. Protocole 4-8 semaines&nbsp;: démarre 30 g/h sur SL, +5-10 g/h par semaine, cible atteinte 4 semaines avant. <strong>Règle d'or&nbsp;:</strong> rien de nouveau le jour J.</>,
  },
  {
    q: 'Caféine en trail : combien, quand, sous quelle forme ?',
    a: <>Pré-course&nbsp;: <strong>3-6 mg/kg</strong>, 45-60 min avant. En course&nbsp;: 1-3 mg/kg toutes 2-3 h. Nuit en ultra&nbsp;: bolus 1-2 mg/kg en début de nuit. Plafond&nbsp;: 6 mg/kg/24 h. Premier ultra ou non-habitué = zéro.</>,
  },
  {
    q: 'Comment éviter l\'écœurement du sucre sur un ultra ?',
    a: <>Bascule progressive vers le salé après H6&nbsp;: saucisson, fromage, soupe, bouillon chaud. Alterne arômes, rinçage bouche entre gels, acidité ponctuelle (citron, pickles), températures contrastées (froid puis chaud).</>,
  },
  {
    q: 'Combien de protéines en course pour préserver les muscles ?',
    a: <>Sur effort &gt;4 h&nbsp;: <strong>5-10 g/h en continu dès H3</strong> (gel protéiné, saucisson, fromage). Bolus aux bases de vie&nbsp;: 15-25 g (sandwich jambon, soupe + parmesan). PAS de protéine isolée pré-course immédiat.</>,
  },
  {
    q: 'Comment savoir si je bois trop (hyponatrémie d\'effort) ?',
    a: <>Signaux EAH&nbsp;: nausées sans cause, gonflement doigts/visage, confusion, prise de poids en course, urine claire abondante très fréquente. Profils à risque&nbsp;: femmes, coureurs lents, météo chaude. <strong>Cap 1 L/h. Boire à la soif.</strong></>,
  },
  {
    q: 'Qu\'est-ce qu\'un "plan B estomac fermé" ?',
    a: <>Si rejet total après H6+&nbsp;: (1) marcher 15 min, (2) rinçage bouche + eau salée tiède, (3) bouillon chaud + cola plate (recommandation médecins UTMB), (4) solides simples en micro-bouchées (saucisson, fromage dur, pickles).</>,
  },
  {
    q: 'L\'altitude change-t-elle la nutrition trail ?',
    a: <>Au-delà de 1500 m&nbsp;: +10-15 % besoins hydratation, oxydation glucidique majorée (Péronnet). Maintiens ton apport glucidique, augmente l'hydratation, surveille les signes de MAM (maux de tête, nausées). Acclimatation ≥2 sem fortement recommandée &gt;2500 m.</>,
  },
  {
    q: 'Distance équivalente ITRA : à quoi ça sert ?',
    a: <>Formule <code>D_eq = D + (D+/100) + (D-/400)</code>. Sert à comparer la <strong>difficulté</strong> d'une course à un plat équivalent. Utile pour estimer ta durée probable, PAS la charge énergétique réelle (qui dépend du coût des pentes — Minetti 2002).</>,
  },
  {
    q: 'Doit-on prendre des AINS (ibuprofène) en ultra ?',
    a: <><strong>NON.</strong> Risque insuffisance rénale aiguë majoré (Lipman 2017, Western States). En cas de douleur&nbsp;: paracétamol uniquement, consulte si persistante. Aucun AINS pendant ou juste après l'ultra.</>,
  },
  {
    q: 'L\'outil remplace-t-il un avis médical ?',
    a: <><strong>Non.</strong> Estimations basées sur la littérature scientifique générale (±15-25 % en trail). Si tu as une condition médicale (diabète, troubles digestifs, pathologie cardiaque, grossesse, MAM antérieur, etc.), consulte un médecin du sport ou un diététicien-nutritionniste spécialisé endurance.</>,
  },
];

const FaqAccordion: React.FC<{ items: FaqItem[] }> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`bg-white border rounded-xl shadow-sm transition-all ${
              isOpen ? 'border-accent shadow-md' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="flex items-start gap-3 flex-1">
                <HelpCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isOpen ? 'text-accent' : 'text-slate-400'}`} />
                <span className="font-semibold text-slate-900 text-sm md:text-base">{item.q}</span>
              </span>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-accent flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-0 pl-14 text-sm text-slate-700 leading-relaxed border-t border-slate-100">
                <div className="pt-4">{item.a}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Exports pour tests unitaires
// ─────────────────────────────────────────────────────────────────────────────
export {
  carbsByTrailDuration,
  hydrationByProfil,
  sodiumByProfil,
  caffeineDose,
  distanceEquivalenteITRA,
  kcalPerHourTrail,
  computeNutrition,
};

export default NutritionTrailPage;
