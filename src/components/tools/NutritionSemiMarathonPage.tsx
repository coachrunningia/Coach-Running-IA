
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Leaf,
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
  ListChecks,
  MessageCircleQuestion,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CALCUL — NUTRITION SEMI-MARATHON (inline, monolithique)
// Sources : ACSM/AND 2016, Jeukendrup 2014, Chambers et al. 2009 (mouth rinse),
// Carter et al. 2004 (mouth rinse), Sawka 2007 (hydratation), Hew-Butler 2015 (EAH),
// Spriet 2014 / Maughan 2016 (caféine).
// Doctrine : outil le plus SIMPLE des 3 — distance fixe 21.1 km, pas de D+,
// pas d'altitude, pas de bases de vie, pas de protéines, pas de carte plan B.
// Question SEO forte : "faut-il vraiment manger pendant un semi-marathon ?"
// ─────────────────────────────────────────────────────────────────────────────

type Sexe = 'H' | 'F';
type Niveau = 'Débutant' | 'Régulier' | 'Confirmé' | 'Expert';
type Hygrometrie = 'Sec' | 'Standard' | 'Humide';
type ExpNutrition = 'Jamais' | 'Occasionnel' | 'Habitué';
type Sudation = 'Faible' | 'Modéré' | 'Élevé' | 'Salty sweater';
type Cafeine = 'Aucune' | '1-2 cafés/j' | '3+ cafés/j';

interface CalcResult {
  durationSec: number;
  durationLabel: string;
  carbsPerHour: { min: number; max: number; target: number };
  totalCarbs: number;
  hydrationPerHour: number;
  totalHydration: number;
  sodiumPerLiter: number;
  totalSodium: number;
  caffeinePreRace: number;
  caffeineDoseMgPerKgTotal: number;
  kcalPerHour: number;
  totalKcal: number;
  premierMode: boolean;
  warnings: string[];
  // Pack
  nbGels: number;
  nbBidons: number;
  // Spécifique semi : recommandation principale "faut-il manger ?"
  strategy: 'mouth_rinse' | 'gel_optional' | 'gels_recommended' | 'marathon_approach';
  strategyLabel: string;
  strategyDetail: string;
  // Timeline
  timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[];
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

// Glucides g/h semi — HONNÊTE selon chrono (Chambers 2009, Jeukendrup 2014, ACSM 2016).
// Spécificité semi : sub-1h15 → mouth rinse seul (pas de glucides nécessaires).
// Plages plus basses qu'un marathon parce que la durée d'effort est plus courte.
const carbsBySemiTime = (chronoSec: number): { min: number; max: number; target: number } => {
  if (chronoSec < 75 * 60) return { min: 0, max: 0, target: 0 };          // <1h15 mouth rinse
  if (chronoSec < 90 * 60) return { min: 20, max: 30, target: 25 };       // 1h15-1h30 : 1 gel optionnel
  if (chronoSec < 105 * 60) return { min: 30, max: 50, target: 40 };      // 1h30-1h45
  if (chronoSec < 120 * 60) return { min: 40, max: 60, target: 50 };      // 1h45-2h
  if (chronoSec < 150 * 60) return { min: 45, max: 75, target: 60 };      // 2h-2h30
  return { min: 60, max: 90, target: 70 };                                // 2h30+ : approche marathon
};

// Matrice hydratation mL/h selon profil sudation × température (Sawka 2007).
// Identique base marathon — cap 1000 mL/h (Hew-Butler 2015).
const hydrationByProfil = (sudation: Sudation, tempC: number, poidsKg: number = 70): number => {
  const tempBucket: 0 | 1 | 2 | 3 =
    tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;

  const table: Record<Sudation, [number, number, number, number]> = {
    Faible:          [300, 400, 500, 600],
    Modéré:          [400, 500, 600, 700],
    Élevé:           [500, 600, 700, 800],
    'Salty sweater': [550, 650, 750, 850],
  };
  let ml = table[sudation][tempBucket];
  const weightFactor = Math.min(1.25, Math.max(0.85, 1 + (poidsKg - 70) * 0.005));
  ml = Math.round(ml * weightFactor);
  if (ml > 1000) ml = 1000;
  return ml;
};

// Sodium mg/L selon profil sudation — pas obligatoire <1h30, identique marathon ≥1h30.
const sodiumByProfil = (sudation: Sudation): number => {
  const table: Record<Sudation, number> = {
    Faible: 400,
    Modéré: 600,
    Élevé: 900,
    'Salty sweater': 1200,
  };
  return table[sudation];
};

// Caféine pré-course semi — Spriet 2014, Maughan 2016.
// Pas de boost final : course trop courte pour bénéficier d'un gel caféiné en fin.
// 3 mg/kg cible pré, -17% si 3+ cafés/j. Premier semi = ZÉRO.
const caffeineDose = (
  poidsKg: number,
  cafeineHabit: Cafeine,
  premierMode: boolean,
): { preRaceMg: number; mgPerKgTotal: number } => {
  if (premierMode || cafeineHabit === 'Aucune') {
    return { preRaceMg: 0, mgPerKgTotal: 0 };
  }
  let mgPerKgPre = 3;
  if (cafeineHabit === '3+ cafés/j') mgPerKgPre = 2.5;
  const preRaceMg = Math.round((poidsKg * mgPerKgPre) / 5) * 5;
  const mgPerKgTotal = Math.round((preRaceMg / poidsKg) * 10) / 10;
  return { preRaceMg, mgPerKgTotal };
};

// Stratégie principale "faut-il manger ?" selon chrono — réponse honnête.
const strategyForChrono = (chronoSec: number): { strategy: CalcResult['strategy']; label: string; detail: string } => {
  if (chronoSec < 75 * 60) {
    return {
      strategy: 'mouth_rinse',
      label: 'Mouth rinse suffit',
      detail: "Pour un semi <1h15, les glucides en course n'apportent pas de bénéfice significatif (Chambers 2009). Un simple rinçage bouche (25 mL d'une solution glucose 6%, swish 5-10 sec puis recracher) stimule les récepteurs glucidiques buccaux et réduit la perception de l'effort. Aucune calorie ingérée. Hydratation gorgées seulement (sauf chaleur).",
    };
  }
  if (chronoSec < 90 * 60) {
    return {
      strategy: 'gel_optional',
      label: '1 gel optionnel',
      detail: "Pour un semi 1h15-1h30, un gel vers le km 12 peut aider mais reste OPTIONNEL. Si tu te sens bien, mouth rinse + eau suffit. Si tu sens un creux à mi-course, 1 gel de 20-25 g glucides + 150 mL d'eau.",
    };
  }
  if (chronoSec < 105 * 60) {
    return {
      strategy: 'gels_recommended',
      label: '1-2 gels recommandés',
      detail: "Pour un semi 1h30-1h45, 1-2 gels apportent un vrai gain. 1 gel vers le km 10, un 2e vers le km 16 si tu sens la fatigue glucidique. Hydratation 400-700 mL/h selon météo.",
    };
  }
  if (chronoSec < 120 * 60) {
    return {
      strategy: 'gels_recommended',
      label: '2 gels recommandés',
      detail: "Pour un semi 1h45-2h, 2 gels sont vraiment utiles. 1 vers le km 8, 1 vers le km 14-16. Hydratation 400-700 mL/h. Sodium 400-900 mg/L de boisson selon ta sudation.",
    };
  }
  if (chronoSec < 150 * 60) {
    return {
      strategy: 'gels_recommended',
      label: '2-3 gels recommandés',
      detail: "Pour un semi 2h-2h30, traite-le comme un mini-marathon. 2-3 gels (km 6, km 12, km 17). Hydratation 500-800 mL/h. Sodium 600-900 mg/L. Caféine pré-course (3 mg/kg) si habitué.",
    };
  }
  return {
    strategy: 'marathon_approach',
    label: 'Approche marathon court',
    detail: "Pour un semi >2h30, applique une vraie stratégie marathon. 3+ gels, alterne eau/isotonique, sodium adapté, caféine si habitué. Le risque de fatigue glucidique est réel — ne sous-estime pas l'apport.",
  };
};

// Calcul principal
const computeNutrition = (params: {
  sexe: Sexe;
  poidsKg: number;
  niveau: Niveau;
  premierMode: boolean;
  chronoSec: number;
  tempC: number;
  hygrometrie: Hygrometrie;
  expNutrition: ExpNutrition;
  sudation: Sudation;
  cafeineHabit: Cafeine;
}): CalcResult => {
  const {
    poidsKg, premierMode, chronoSec, tempC, hygrometrie, expNutrition,
    sudation, cafeineHabit,
  } = params;

  const warnings: string[] = [];
  const strat = strategyForChrono(chronoSec);

  // ─── Glucides ───
  const carbsBase = carbsBySemiTime(chronoSec);
  let target = carbsBase.target;
  let carbsMin = carbsBase.min;
  let carbsMax = carbsBase.max;

  // Expérience nutrition : si Jamais → -20%
  if (expNutrition === 'Jamais' && target > 0) {
    target = Math.max(20, Math.round(target * 0.8));
    carbsMin = Math.max(0, Math.round(carbsMin * 0.8));
    carbsMax = Math.max(carbsMin + 5, Math.round(carbsMax * 0.8));
    warnings.push("Cible glucides réduite de 20% car aucune expérience nutrition en course. Progresse graduellement.");
  }

  // Mode Premier semi : cap à 30 g/h max + hydratation modérée + zéro caféine
  if (premierMode && target > 30) {
    target = 30;
    carbsMax = Math.min(carbsMax, 30);
    carbsMin = Math.min(carbsMin, target);
    warnings.push("Mode Premier semi-marathon : cible glucides plafonnée à 30 g/h pour limiter tout risque digestif. L'objectif est de finir, pas d'optimiser.");
  }

  if (target >= 60) {
    warnings.push("Cible ≥ 60 g/h : tes gels doivent contenir glucose:fructose (ratio 2:1 ou 1:0.8). Sinon plafond physiologique 60 g/h via SGLT1 (Jeukendrup 2014).");
  }
  const carbsPerHour = { min: carbsMin, max: carbsMax, target };
  const totalCarbs = Math.round((target * chronoSec) / 3600);

  // ─── Hydratation ───
  let hydrationPerHour = hydrationByProfil(sudation, tempC, poidsKg);
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  // Mode Premier : cap hydratation 600 mL/h pour limiter risque EAH
  if (premierMode && hydrationPerHour > 600) hydrationPerHour = 600;
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) {
    warnings.push("Hydratation > 800 mL/h : surveille les signes d'hyponatrémie (nausées, gonflement, confusion). Cap absolu 1000 mL/h.");
  }
  if (tempC >= 25) {
    warnings.push("Semi par >25°C : ralentis ton allure de 10-15%. Surveille l'épuisement thermique.");
  }
  if (tempC >= 25 && cafeineHabit !== 'Aucune') {
    warnings.push("Chaleur + caféine = thermogenèse accrue. Réduis ta dose pré-course de 30%.");
  }
  if (tempC <= 8) {
    warnings.push("Par temps froid, la soif est trompeuse (Kenefick 2004). Suis ton plan chronométré.");
  }
  // Hydratation totale : seulement le temps de course
  const totalHydration = chronoSec < 90 * 60
    ? Math.min(500, Math.round((hydrationPerHour * chronoSec) / 3600))  // <1h30 : 200-500 mL total suffisent (hors chaleur)
    : Math.round((hydrationPerHour * chronoSec) / 3600);

  // ─── Sodium ───
  // Sodium pas obligatoire <1h30 — on garde la valeur indicative mais total calculé minimal
  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = chronoSec < 90 * 60
    ? 0  // <1h30 : pas obligatoire
    : Math.round((sodiumPerLiter * totalHydration) / 1000);

  // ─── Caféine ───
  const { preRaceMg: caffeinePreRace, mgPerKgTotal } = caffeineDose(poidsKg, cafeineHabit, premierMode);

  // ─── Énergie ───
  const distanceKm = 21.0975;
  const vitesseKmh = distanceKm / (chronoSec / 3600);
  const kcalPerHour = Math.round(poidsKg * vitesseKmh * 0.95);
  const totalKcal = Math.round((kcalPerHour * chronoSec) / 3600);

  // ─── Pack ───
  const carbsPerGel = 25;
  const nbGels = totalCarbs > 0 ? Math.max(0, Math.ceil(totalCarbs / carbsPerGel)) : 0;
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl));

  // ─── Timeline ───
  const timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[] = [];
  timeline.push({
    window: 'H-30 → H-0',
    instruction: caffeinePreRace > 0
      ? `Hydratation 200-300 mL d'eau plate. Caféine : ${caffeinePreRace} mg (≈ ${Math.round(caffeinePreRace / 80)} expressos) 45-60 min avant le départ.`
      : `Hydratation 200-300 mL d'eau plate. ${premierMode ? 'Pas de caféine sur premier semi-marathon.' : 'Pas de caféine.'}`,
    tone: 'highlight',
  });
  timeline.push({
    window: 'H-15 → H-0',
    instruction: "ZONE ROUGE : pas de gel ni de glucides solides isolés (risque hypoglycémie réactionnelle au départ).",
    tone: 'warning',
  });

  if (strat.strategy === 'mouth_rinse') {
    timeline.push({
      window: 'km 0-21',
      instruction: "Eau seule à chaque ravito (gorgées 100-150 mL). Optionnel : mouth rinse glucose 6 % aux km 7 et km 14 (25 mL, swish 5-10 sec, recrache).",
      tone: 'normal',
    });
  } else if (strat.strategy === 'gel_optional') {
    timeline.push({
      window: 'km 0-12',
      instruction: "Hydratation gorgées toutes 10-15 min. Si tu sens un creux à mi-course : 1 gel + 150 mL eau au km 12.",
      tone: 'normal',
    });
    timeline.push({
      window: 'km 12-21',
      instruction: "Si tu as pris le gel : maintien hydratation. Sinon, eau seule jusqu'à l'arrivée.",
      tone: 'normal',
    });
  } else if (strat.strategy === 'gels_recommended') {
    timeline.push({
      window: 'km 0-8',
      instruction: "Hydratation gorgées toutes 10-15 min (~150-200 mL). Pas de gel avant 45-60 min de course.",
      tone: 'normal',
    });
    timeline.push({
      window: 'km 8-10',
      instruction: `1er gel (${carbsPerGel}g glucides) + 150-200 mL eau. Démarre sodium si disponible (${sodiumPerLiter} mg/L).`,
      tone: 'highlight',
    });
    timeline.push({
      window: 'km 14-16',
      instruction: chronoSec >= 105 * 60 ? "2e gel + 150-200 mL liquide. Alterne eau/isotonique selon ravitos." : "Si fatigue glucidique : 2e gel optionnel + eau.",
      tone: 'normal',
    });
  } else {
    // marathon_approach
    timeline.push({
      window: 'km 0-6',
      instruction: "Hydratation seulement. Allure de croisière, garde glycogène pour la 2e moitié.",
      tone: 'normal',
    });
    timeline.push({
      window: 'km 6-21',
      instruction: `1 gel toutes les ~30-40 min, alterne eau/isotonique. Cible ${carbsPerHour.target} g/h selon ta tolérance.`,
      tone: 'highlight',
    });
  }

  return {
    durationSec: chronoSec,
    durationLabel: formatDuration(chronoSec),
    carbsPerHour,
    totalCarbs,
    hydrationPerHour,
    totalHydration,
    sodiumPerLiter,
    totalSodium,
    caffeinePreRace,
    caffeineDoseMgPerKgTotal: mgPerKgTotal,
    kcalPerHour,
    totalKcal,
    premierMode,
    warnings,
    nbGels,
    nbBidons,
    strategy: strat.strategy,
    strategyLabel: strat.label,
    strategyDetail: strat.detail,
    timeline,
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

const NutritionSemiMarathonPage: React.FC = () => {
  // ─── Form state ───
  const [sexe, setSexe] = useState<Sexe>('H');
  const [poids, setPoids] = useState<string>('');
  const [niveau, setNiveau] = useState<Niveau>('Régulier');
  const [premierMode, setPremierMode] = useState<boolean>(false);

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
    const ack = localStorage.getItem('nutrition_semi_warning_ack_v1');
    if (ack) {
      const ackDate = parseInt(ack, 10);
      const days = (Date.now() - ackDate) / (1000 * 60 * 60 * 24);
      if (days < 30) setShowWarningBar(false);
    }
    trackEvent('nutrition_semi_view');
  }, []);

  const dismissWarningBar = () => {
    localStorage.setItem('nutrition_semi_warning_ack_v1', Date.now().toString());
    setShowWarningBar(false);
  };

  // ─── Auto-coche Mode Premier si Débutant ───
  useEffect(() => {
    if (niveau === 'Débutant') setPremierMode(true);
  }, [niveau]);

  // ─── Validation et calcul ───
  const calculate = () => {
    const poidsNum = parseFloat(poids);
    const chronoSec = hmsToSec(chronoH, chronoM, chronoS);
    const tempNum = parseFloat(tempC);

    if (!poidsNum || poidsNum < 30 || poidsNum > 200) {
      alert("Renseigne un poids valide (entre 30 et 200 kg).");
      return;
    }
    // Semi : 1h à 3h30
    if (chronoSec < 3600 || chronoSec > 3.5 * 3600) {
      alert("Renseigne un chrono valide (entre 1h00 et 3h30).");
      return;
    }
    if (isNaN(tempNum) || tempNum < -10 || tempNum > 45) {
      alert("Renseigne une température valide (entre -10 et 45°C).");
      return;
    }

    const r = computeNutrition({
      sexe,
      poidsKg: poidsNum,
      niveau,
      premierMode,
      chronoSec,
      tempC: tempNum,
      hygrometrie,
      expNutrition,
      sudation,
      cafeineHabit,
    });
    setResult(r);
    trackEvent('nutrition_semi_calculate', {
      chrono: r.durationLabel,
      niveau,
      premier_mode: premierMode,
      temp: tempNum,
      strategy: r.strategy,
    });
    setTimeout(() => {
      const el = document.getElementById('nutrition-results');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const onCtaPlanClick = () => {
    trackEvent('nutrition_semi_cta_plan_click');
  };

  return (
    <>
      <Helmet>
        <title>Calculateur Nutrition Semi-Marathon Gratuit & Instantané</title>
        <meta
          name="description"
          content="Plan nutrition semi-marathon gratuit : faut-il manger ? Glucides, hydratation, caféine selon ton chrono (sub-1h30 à sub-2h30)."
        />
        <meta
          name="keywords"
          content="nutrition semi marathon, semi marathon nutrition, plan nutrition semi, faut-il manger pendant semi, mouth rinse semi marathon, hydratation semi marathon, gels semi marathon, premier semi marathon nutrition, glucides semi marathon, caféine semi marathon, plan nutrition semi sub 1h30, plan nutrition semi sub 2h, plan nutrition semi sub 1h45"
        />
        <link rel="canonical" href="https://coachrunningia.fr/outils/nutrition-semi-marathon" />
        <meta property="og:title" content="Calculateur Nutrition Semi-Marathon Gratuit & Instantané" />
        <meta property="og:description" content="Plan nutrition semi-marathon gratuit : faut-il manger ? Glucides, hydratation, caféine selon ton chrono." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://coachrunningia.fr/outils/nutrition-semi-marathon" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Calculateur Nutrition Semi-Marathon Gratuit & Instantané" />
        <meta name="twitter:description" content="Plan nutrition semi-marathon gratuit : faut-il manger ? Glucides, hydratation, caféine selon ton chrono." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Faut-il vraiment manger pendant un semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Réponse honnête selon ton chrono. Sub-1h15 : non, mouth rinse (rinçage bouche glucose 6%) suffit (Chambers 2009). 1h15-1h30 : optionnel, 1 gel vers le km 12 si tu sens un creux. 1h30-2h : recommandé, 1-2 gels. 2h-2h30 : 2-3 gels. >2h30 : approche marathon court. Hydratation toujours, glucides selon durée."
              }
            },
            {
              "@type": "Question",
              "name": "Combien de gels pour un semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "0 à 3 gels selon ton chrono. Sub-1h30 : 0-1 gel (souvent inutile). 1h30-1h45 : 1-2 gels. 1h45-2h : 2 gels. 2h-2h30 : 2-3 gels. >2h30 : 3+ gels (approche marathon). Prévois toujours 1 gel de plus en sécurité."
              }
            },
            {
              "@type": "Question",
              "name": "Combien boire pendant un semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Selon ton chrono et la météo. Sub-1h30 : 200-500 mL total suffisent (hors chaleur). 1h30-2h : 400-700 mL/h. >2h : 500-800 mL/h. Cap absolu 1000 mL/h pour éviter l'hyponatrémie d'effort."
              }
            },
            {
              "@type": "Question",
              "name": "Qu'est-ce que le mouth rinse en semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Le rinçage bouche avec une solution glucidique (Chambers 2009, Carter 2004) : 25 mL d'eau + 6% glucose (15 g/250 mL), swish 5-10 secondes dans la bouche, puis recrache. Stimule les récepteurs glucidiques buccaux et réduit la perception de l'effort sans ingérer de calories. Efficace sur effort <90 min."
              }
            },
            {
              "@type": "Question",
              "name": "Faut-il de la caféine en semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Oui si tu es habitué : 3 mg/kg pré-course 45-60 min avant le départ (Spriet 2014, Maughan 2016). Pas de boost final (course trop courte pour bénéficier). Premier semi : zéro caféine (trop d'inconnues). Si 3 cafés/jour : -17% de la dose (tolérance)."
              }
            },
            {
              "@type": "Question",
              "name": "Premier semi-marathon : quelle stratégie nutrition ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mode prudent : cap glucides 30 g/h, hydratation modérée (max 600 mL/h), zéro caféine, gels testés en sortie longue. L'objectif est de finir confortablement, pas d'optimiser à la marge. Aucune nouveauté le jour J."
              }
            },
            {
              "@type": "Question",
              "name": "Quand prendre son premier gel en semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Vers le km 8-10 si tu vises 1h30-2h. Vers le km 10-12 si tu vises plus lent. Évite tout gel dans les 15 min précédant le départ (risque hypoglycémie réactionnelle au démarrage)."
              }
            },
            {
              "@type": "Question",
              "name": "Faut-il du sodium en semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Pas obligatoire <1h30 (sauf chaleur ou heavy sweater). ≥1h30 : 400-1200 mg/L de boisson selon ton profil sudation. Salty sweater (traces blanches) : 1000-1200 mg/L."
              }
            },
            {
              "@type": "Question",
              "name": "Quelle différence avec la nutrition marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Le semi est plus court : pas de mur du 30e km, moins de risque d'épuisement glycogénique. Sub-1h30 : presque pas besoin de glucides. Sub-2h : 1-2 gels suffisent. Le marathon (>2h45 systématique) nécessite toujours une vraie stratégie 50-90 g/h."
              }
            },
            {
              "@type": "Question",
              "name": "Que manger 1h avant un semi-marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Cet outil traite uniquement la nutrition PENDANT la course. Pour le pré-course (3-4h avant : repas pauvre en fibres, riche en glucides simples, 1-3 g/kg), consulte un professionnel."
              }
            },
            {
              "@type": "Question",
              "name": "Mouth rinse vraiment efficace ou marketing ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Vraiment efficace, validé par Chambers et al. 2009 (Med Sci Sports Exerc) et Carter et al. 2004. Mécanisme neurologique : récepteurs glucidiques buccaux signalent au cerveau l'arrivée d'énergie, ce qui réduit la perception de l'effort. Effet documenté sur cyclisme et course <1h."
              }
            },
            {
              "@type": "Question",
              "name": "L'outil remplace-t-il un avis médical ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Non. Cet outil donne des estimations basées sur la littérature scientifique générale (±15% d'incertitude). Si tu as une condition médicale (diabète, troubles digestifs, pathologie cardiaque, grossesse, etc.), consulte un professionnel de santé."
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
                  avant-course (dernier repas, hydratation pré) et après-course (récupération) sont primordiales et
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
              <span className="text-accent">Nutrition Semi-Marathon</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Calculateur Nutrition Semi-Marathon — Gratuit &amp; Honnête
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mb-4">
              Calcule en <strong className="text-white">30 secondes</strong> ta stratégie nutrition semi-marathon —
              réponse honnête selon ton chrono : <strong className="text-white">faut-il vraiment manger ?</strong>
              Mouth rinse, gels, hydratation, sodium et caféine adaptés à ton profil.
            </p>
            <p className="text-sm text-slate-400 max-w-3xl">
              Basé sur Chambers (2009 mouth rinse), Jeukendrup (2014), ACSM/AND (2016), Hew-Butler (2015 EAH),
              Spriet (2014 caféine). Outil 100 % gratuit, sans inscription.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Gratuit</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Réponse honnête</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Sub-1h15 à 3h30</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Mouth rinse inclus</span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 rounded-full">✓ Sources scientifiques</span>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 -mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Leaf className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Ma stratégie nutrition semi-marathon</h2>
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
                      placeholder="Ex: 65"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Premier semi-marathon</label>
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
                        C'est mon premier semi-marathon
                        {niveau === 'Débutant' && (
                          <span className="block text-xs text-slate-500">Activé d'office pour les débutants</span>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2 — Course */}
              <div className="mb-8 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">2. Course</h3>
                <p className="text-xs text-slate-500 mb-4">Distance fixe : <strong>21,1 km</strong></p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Chrono visé
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={chronoH}
                        onChange={(e) => setChronoH(e.target.value)}
                        placeholder="h"
                        min="1"
                        max="3"
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
                    <p className="text-xs text-slate-500 mt-1">Ex : 1h45 → 1 / 45 / 00 — entre 1h et 3h30</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Température jour J (°C)
                    </label>
                    <input
                      type="number"
                      value={tempC}
                      onChange={(e) => setTempC(e.target.value)}
                      placeholder="Ex: 15"
                      min="-10"
                      max="45"
                      className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
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
                    <strong>Mode Premier semi-marathon activé.</strong> Stratégie volontairement prudente :
                    cap glucides 30 g/h, hydratation modérée, zéro caféine. L'objectif est de finir confortablement.
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

              {/* CARTE 1 — Faut-il vraiment manger ? (CARTE FORTE — spécifique semi) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-md p-6 md:p-8 border border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <MessageCircleQuestion className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Faut-il vraiment manger ?</h2>
                </div>
                <div className="mb-4">
                  <div className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-full text-sm font-bold mb-3">
                    {result.strategyLabel}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{result.strategyDetail}</p>
                </div>
              </div>

              {/* CARTE 2 — Synthèse */}
              <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Activity className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Synthèse : ton semi en chiffres</h2>
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
                    <div className="text-2xl font-bold text-emerald-700">{result.totalSodium > 0 ? result.sodiumPerLiter : '—'}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      mg sodium / L
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {result.totalSodium > 0 ? 'dans ta boisson' : 'pas obligatoire <1h30'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">{result.caffeinePreRace}</div>
                    <div className="text-xs text-slate-500 mt-1">mg caféine pré</div>
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
                    <strong>Nombre de gels :</strong> {result.nbGels}
                  </div>
                  <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <strong>Durée estimée :</strong> {result.durationLabel}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
                  Estimation théorique ±15 % — adapte selon ton ressenti jour J.
                </div>
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
                  {result.nbGels > 0 ? (
                    <li className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.nbGels} gel{result.nbGels > 1 ? 's' : ''}</strong> de 25 g glucides (type maltodextrine + fructose, ratio 2:1 ou 1:0.8)
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>Pas de gel obligatoire.</strong> Option : 1 petite gourde glucose 6 % pour mouth rinse (25 mL × 2-3 prises).
                      </span>
                    </li>
                  )}
                  <li className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>{result.nbBidons} bidon{result.nbBidons > 1 ? 's' : ''}</strong> de 500 mL
                      {result.totalSodium > 0
                        ? <> d'isotonique (60-80 g/L glucides + {result.sodiumPerLiter} mg/L sodium)</>
                        : <> d'eau (sodium pas obligatoire &lt;1h30)</>}
                    </span>
                  </li>
                  {result.caffeinePreRace > 0 && (
                    <li className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.caffeinePreRace} mg caféine pré-course</strong> (gélule, expresso ou boisson énergisante).
                        Pas de boost final : la course est trop courte pour en bénéficier.
                      </span>
                    </li>
                  )}
                </ul>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-900 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>À tester en sortie longue avant ta course objectif.</strong> Aucun produit, aucune marque,
                    aucun timing ne doit être découvert le jour J.
                  </span>
                </div>
              </div>

              {/* CARTE 5 — Sécurité (accordéon) */}
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
                      <h3 className="font-bold text-sm text-red-900 mb-1">Hyponatrémie d'effort (EAH)</h3>
                      <p className="text-sm text-red-800">
                        Risque plus faible qu'en marathon mais réel, surtout si tu forces la boisson sans soif.
                        Cap absolu 1000 mL/h. Ne bois jamais sans soif.
                      </p>
                    </div>

                    <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-orange-900 mb-1">Hypoglycémie réactionnelle</h3>
                      <p className="text-sm text-orange-800">
                        Ne prends aucun gel ni glucides rapides dans les 15 minutes précédant le départ.
                        Le pic d'insuline peut provoquer un coup de barre dès le km 2-3.
                      </p>
                    </div>

                    <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-lg">
                      <h3 className="font-bold text-sm text-amber-900 mb-1">Tester en sortie longue</h3>
                      <p className="text-sm text-amber-800">
                        Même sur semi, teste toujours ta stratégie nutrition au moins 2-3 fois en SL avant ta course objectif.
                        Aucune nouveauté le jour J — pas même le mouth rinse si tu ne l'as jamais essayé.
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
                          </ul>
                          <p className="font-semibold pt-2">
                            Consulte un médecin du sport ou un diététicien-nutritionniste spécialisé endurance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CARTE 6 — CTA Plan (POST-synthèse uniquement) */}
              <div className="bg-gradient-to-br from-accent to-orange-500 text-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3">
                  Ta stratégie nutrition est prête. Et ton plan d'entraînement semi ?
                </h2>
                <p className="text-white/90 mb-5 text-sm md:text-base">
                  Pour que cette stratégie tienne, il faut un plan semi-marathon progressif derrière.
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

        {/* CONTENU SEO */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

            {/* H2 fort : Faut-il vraiment manger pendant un semi-marathon ? */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-md border border-emerald-200 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0">
                  <MessageCircleQuestion className="w-6 h-6 text-emerald-700" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Faut-il vraiment manger pendant un semi-marathon&nbsp;?
                </h2>
              </div>
              <div className="prose prose-slate max-w-none">
                <p><strong>Réponse honnête : ça dépend de ton chrono.</strong></p>
                <ul>
                  <li><strong>Sub-1h15&nbsp;:</strong> <strong>NON.</strong> Mouth rinse glucose 6 % suffit (Chambers 2009, Carter 2004). Pas de calories ingérées, juste stimulation des récepteurs glucidiques buccaux.</li>
                  <li><strong>1h15-1h30&nbsp;:</strong> <strong>Optionnel.</strong> 1 gel vers le km 12 si creux ressenti.</li>
                  <li><strong>1h30-2h&nbsp;:</strong> <strong>Recommandé.</strong> 1-2 gels apportent un vrai gain sur la fin.</li>
                  <li><strong>2h-2h30&nbsp;:</strong> <strong>2-3 gels.</strong> La fatigue glucidique est réelle.</li>
                  <li><strong>&gt;2h30&nbsp;:</strong> <strong>Approche marathon court.</strong> Vraie stratégie 50-80 g/h.</li>
                </ul>
                <p>L'erreur classique en semi&nbsp;: croire qu'il faut absolument prendre des gels parce que tout le monde le fait. <strong>Sur sub-1h30, c'est souvent inutile</strong> — voire contre-productif (lourdeur d'estomac, sucre superflu).</p>
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
                  { name: 'Chambers 2009', desc: 'Mouth rinse glucose 6%, effet neurologique' },
                  { name: 'Carter 2004', desc: 'Rinçage bouche, course endurance' },
                  { name: 'ACSM/AND 2016', desc: 'Sodium + hydratation' },
                  { name: 'Jeukendrup 2014', desc: 'Tables glucides par chrono' },
                  { name: 'Hew-Butler 2015', desc: 'Prévention hyponatrémie d\'effort' },
                  { name: 'Spriet 2014', desc: 'Dose ergogenic caféine 3 mg/kg' },
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
                  <strong>Ajustements doctrine&nbsp;:</strong> cap glucides 30 g/h en mode "premier semi",
                  cap hydratation 600 mL/h pour limiter risque EAH, zéro caféine si premier semi,
                  cap absolu 1000 mL/h pour tous (sécurité EAH).
                </p>
              </div>
            </div>

            {/* H2 Glucides */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-50 rounded-xl flex-shrink-0">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Glucides par heure en semi&nbsp;: 0 à 70 g/h selon ton chrono
                </h2>
              </div>
              <p className="text-slate-700 mb-5">La cible glucides en semi dépend principalement de ton chrono&nbsp;:</p>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900 rounded-l-lg">Chrono visé</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900">Cible</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900">Plage</th>
                      <th className="px-4 py-3 text-left font-semibold text-orange-900 rounded-r-lg">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100">
                    <tr><td className="px-4 py-3 font-semibold">sub-1h15</td><td className="px-4 py-3 text-orange-700 font-bold">0 g</td><td className="px-4 py-3 text-slate-600">0</td><td className="px-4 py-3 text-slate-600 text-xs">Mouth rinse suffit</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">sub-1h30</td><td className="px-4 py-3 text-orange-700 font-bold">25 g/h</td><td className="px-4 py-3 text-slate-600">20-30</td><td className="px-4 py-3 text-slate-600 text-xs">1 gel optionnel km 12</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">sub-1h45</td><td className="px-4 py-3 text-orange-700 font-bold">40 g/h</td><td className="px-4 py-3 text-slate-600">30-50</td><td className="px-4 py-3 text-slate-600 text-xs">1-2 gels recommandés</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">sub-2h</td><td className="px-4 py-3 text-orange-700 font-bold">50 g/h</td><td className="px-4 py-3 text-slate-600">40-60</td><td className="px-4 py-3 text-slate-600 text-xs">2 gels recommandés</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">sub-2h30</td><td className="px-4 py-3 text-orange-700 font-bold">60 g/h</td><td className="px-4 py-3 text-slate-600">45-75</td><td className="px-4 py-3 text-slate-600 text-xs">2-3 gels recommandés</td></tr>
                    <tr className="bg-orange-50/40"><td className="px-4 py-3 font-semibold">2h30+</td><td className="px-4 py-3 text-orange-700 font-bold">70 g/h</td><td className="px-4 py-3 text-slate-600">60-90</td><td className="px-4 py-3 text-slate-600 text-xs">Approche marathon court</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-4 italic">Source&nbsp;: Jeukendrup 2014, Chambers 2009 pour mouth rinse.</p>
            </div>

            {/* H2 Mouth rinse — section dédiée car KW SEO */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-teal-50 rounded-xl flex-shrink-0">
                  <Droplet className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Mouth rinse en semi-marathon&nbsp;: comment et pourquoi
                </h2>
              </div>
              <p className="text-slate-700 mb-4">
                Le <strong>mouth rinse</strong> (rinçage bouche glucidique) est validé scientifiquement par Chambers et al. (2009)
                et Carter et al. (2004). Mécanisme&nbsp;: les récepteurs glucidiques buccaux signalent au cerveau l'arrivée d'énergie,
                ce qui <strong>réduit la perception de l'effort</strong> sans nécessiter d'ingestion.
              </p>
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
                <h3 className="font-bold text-sm text-teal-900 mb-2">Protocole pratique :</h3>
                <ol className="text-sm text-teal-800 space-y-1 list-decimal list-inside">
                  <li>Préparer une solution glucose 6 % (15 g glucose dans 250 mL d'eau).</li>
                  <li>Prendre 25 mL dans la bouche.</li>
                  <li>"Swish" (faire circuler) 5-10 secondes.</li>
                  <li>Recracher (pas d'ingestion).</li>
                  <li>Répéter aux km 7 et km 14 sur un sub-1h15.</li>
                </ol>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                Effet documenté sur cyclisme et course &lt;1h. Sans calories ni risque GI, c'est l'option la plus sûre pour les semis courts.
              </p>
            </div>

            {/* H2 Hydratation */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Hydratation semi-marathon
                </h2>
              </div>
              <p className="text-slate-700 mb-3 font-medium">Matrice mL/h par profil sudation × température (cap absolu 1000 mL/h)&nbsp;:</p>
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
                    <tr><td className="px-3 py-3 font-semibold">Faible</td><td className="px-3 py-3 text-center">300</td><td className="px-3 py-3 text-center">400</td><td className="px-3 py-3 text-center">500</td><td className="px-3 py-3 text-center">600</td></tr>
                    <tr className="bg-blue-50/40"><td className="px-3 py-3 font-semibold">Modéré</td><td className="px-3 py-3 text-center">400</td><td className="px-3 py-3 text-center">500</td><td className="px-3 py-3 text-center">600</td><td className="px-3 py-3 text-center">700</td></tr>
                    <tr><td className="px-3 py-3 font-semibold">Élevé</td><td className="px-3 py-3 text-center">500</td><td className="px-3 py-3 text-center">600</td><td className="px-3 py-3 text-center">700</td><td className="px-3 py-3 text-center">800</td></tr>
                    <tr className="bg-blue-50/40"><td className="px-3 py-3 font-semibold">Salty sweater</td><td className="px-3 py-3 text-center">550</td><td className="px-3 py-3 text-center">650</td><td className="px-3 py-3 text-center">750</td><td className="px-3 py-3 text-center font-bold text-blue-700">850</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">Sub-1h30 : 200-500 mL total suffisent hors chaleur. ≥1h30 : matrice complète.</p>
            </div>

            {/* H2 Caféine */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl flex-shrink-0">
                  <Coffee className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Caféine et semi-marathon
                </h2>
              </div>
              <p className="text-slate-700 mb-4">
                La caféine améliore la performance d'environ <strong>2-3 % sur le semi</strong> (Maughan 2016).
                <strong> Dose efficace dès 3 mg/kg</strong> (Spriet 2014), prise <strong>45 à 60 min avant le départ</strong>.
                <strong>Pas de boost final</strong> : la course est trop courte pour bénéficier d'un gel caféiné en fin.
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { ic: '🎯', txt: <><strong>Cible 3 mg/kg pré-course</strong> — dose minimale efficace, la plus sûre.</> },
                  { ic: '☕', txt: <>Si <strong>3 cafés/jour ou plus</strong>&nbsp;: réduis la dose de 17 % (tolérance).</> },
                  { ic: '🚫', txt: <>Si <strong>premier semi</strong> ou caféine non testée&nbsp;: zéro caféine.</> },
                  { ic: '⚠️', txt: <>Pas de boost final&nbsp;: l'effet caféine met 30-45 min, trop tard pour un semi.</> },
                ].map((b, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-purple-50/50 rounded-lg">
                    <span className="text-lg flex-shrink-0">{b.ic}</span>
                    <span className="text-sm text-slate-700">{b.txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* H2 Plan nutrition semi par chrono — H3 same-page SEO */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-amber-50 rounded-xl flex-shrink-0">
                  <ListChecks className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    Plan nutrition semi-marathon par chrono
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">5 paliers — du sub-1h15 au sub-2h30</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { chrono: 'sub-1h15', allure: '3:33/km', carbs: '0 g/h', body: 'Mouth rinse glucose 6 % suffit (25 mL × 2-3 prises, swish puis recrache). Hydratation : 1-2 gorgées eau aux ravitos (200-500 mL total selon chaleur). Caféine pré : 3 mg/kg si habitué. Pas de gel — c\'est juste pas nécessaire physiologiquement.' },
                  { chrono: 'sub-1h30', allure: '4:16/km', carbs: '20-30 g/h', body: '1 gel optionnel vers le km 12 si tu sens un creux. Hydratation 400-600 mL/h. Caféine 3 mg/kg pré. Sodium pas obligatoire sauf chaleur ou heavy sweater.' },
                  { chrono: 'sub-1h45', allure: '4:58/km', carbs: '30-50 g/h', body: '1-2 gels (km 8-10 puis km 14-16). Hydratation 400-700 mL/h. Sodium 400-900 mg/L. Caféine 3 mg/kg pré si habitué. Ne pas surcharger.' },
                  { chrono: 'sub-2h', allure: '5:41/km', carbs: '40-60 g/h', body: '2 gels (km 8 + km 14-16). Hydratation 500-700 mL/h. Sodium 600-900 mg/L. Caféine pré. Alterne eau/isotonique. C\'est le palier où la nutrition devient vraiment utile.' },
                  { chrono: 'sub-2h30', allure: '7:06/km', carbs: '45-75 g/h', body: '2-3 gels (km 6, km 12, km 17). Approche mini-marathon. Hydratation 500-800 mL/h. Sodium adapté. Diversité (gel + isotonique + banane si dispo). Premier semi : Mode Premier, cap 30 g/h.' },
                ].map((p) => (
                  <div key={p.chrono} className="border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-colors">
                    <div className="flex flex-wrap items-baseline gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">Plan nutrition semi {p.chrono}</h3>
                      <span className="text-xs text-slate-500">({p.allure})</span>
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
                Questions fréquentes — Nutrition Semi-Marathon
              </h2>
              <p className="text-slate-600">
                12 réponses honnêtes aux questions des semi-marathoniens.
              </p>
            </div>
            <FaqAccordion items={SEMI_FAQ_ITEMS} />
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Autres outils nutrition course
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/outils/nutrition-trail" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  🏔️ Nutrition Trail
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Stratégie trail et ultra (distance, D+, altitude)
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

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

const SEMI_FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Faut-il vraiment manger pendant un semi-marathon ?',
    a: <>Réponse honnête selon ton chrono. <strong>Sub-1h15&nbsp;:</strong> non, mouth rinse suffit (Chambers 2009). <strong>1h15-1h30&nbsp;:</strong> optionnel. <strong>1h30-2h&nbsp;:</strong> 1-2 gels recommandés. <strong>2h-2h30&nbsp;:</strong> 2-3 gels. <strong>&gt;2h30&nbsp;:</strong> approche marathon court.</>,
  },
  {
    q: 'Combien de gels pour un semi-marathon ?',
    a: <>0 à 3 gels selon ton chrono. <strong>Sub-1h30&nbsp;:</strong> 0-1 gel. <strong>1h30-1h45&nbsp;:</strong> 1-2 gels. <strong>1h45-2h&nbsp;:</strong> 2 gels. <strong>2h-2h30&nbsp;:</strong> 2-3 gels. Prévois toujours 1 gel de plus en sécurité.</>,
  },
  {
    q: 'Combien boire pendant un semi-marathon ?',
    a: <>Selon ton chrono et la météo. <strong>Sub-1h30&nbsp;:</strong> 200-500 mL total hors chaleur. <strong>1h30-2h&nbsp;:</strong> 400-700 mL/h. <strong>&gt;2h&nbsp;:</strong> 500-800 mL/h. Cap absolu 1000 mL/h.</>,
  },
  {
    q: 'Qu\'est-ce que le mouth rinse en semi-marathon ?',
    a: <>Rinçage bouche solution glucose 6 % (Chambers 2009)&nbsp;: 25 mL, swish 5-10 sec, recrache. Stimule les récepteurs glucidiques buccaux, réduit la perception de l'effort, <strong>sans calorie ingérée</strong>. Idéal sur sub-1h15.</>,
  },
  {
    q: 'Faut-il de la caféine en semi-marathon ?',
    a: <>Oui si tu es habitué&nbsp;: 3 mg/kg pré-course 45-60 min avant. <strong>Pas de boost final</strong>&nbsp;: la course est trop courte (effet caféine 30-45 min). Premier semi&nbsp;: zéro caféine.</>,
  },
  {
    q: 'Premier semi-marathon : quelle stratégie nutrition ?',
    a: <>Mode prudent activé par le calculateur si tu coches "premier semi"&nbsp;: <strong>cap glucides 30 g/h</strong>, hydratation modérée (max 600 mL/h), <strong>zéro caféine</strong>, gels testés en sortie longue. Objectif&nbsp;: finir confortablement.</>,
  },
  {
    q: 'Quand prendre son premier gel en semi-marathon ?',
    a: <>Vers le <strong>km 8-10</strong> si tu vises 1h30-2h. Vers le <strong>km 10-12</strong> si tu vises plus lent. Évite tout gel dans les 15 min précédant le départ (risque hypoglycémie réactionnelle).</>,
  },
  {
    q: 'Faut-il du sodium en semi-marathon ?',
    a: <>Pas obligatoire &lt;1h30 (sauf chaleur ou heavy sweater). ≥1h30&nbsp;: 400-1200 mg/L selon profil sudation. Salty sweater (traces blanches)&nbsp;: 1000-1200 mg/L.</>,
  },
  {
    q: 'Quelle différence avec la nutrition marathon ?',
    a: <>Le semi est plus court&nbsp;: pas de mur du 30e km, moins de risque d'épuisement glycogénique. <strong>Sub-1h30&nbsp;:</strong> presque pas besoin de glucides. <strong>Sub-2h&nbsp;:</strong> 1-2 gels suffisent. Le marathon (&gt;2h45 systématique) demande toujours une vraie stratégie 50-90 g/h.</>,
  },
  {
    q: 'Mouth rinse vraiment efficace ou marketing ?',
    a: <><strong>Vraiment efficace</strong>, validé par Chambers et al. 2009 (Med Sci Sports Exerc) et Carter et al. 2004. Mécanisme neurologique&nbsp;: récepteurs glucidiques buccaux signalent au cerveau l'arrivée d'énergie, ce qui réduit la perception de l'effort. Effet documenté sur cyclisme et course &lt;1h.</>,
  },
  {
    q: 'Que manger 1h avant un semi-marathon ?',
    a: <>⚠️ Cet outil ne traite que la nutrition <strong>PENDANT</strong> la course. Le pré-course (3-4 h avant&nbsp;: repas pauvre en fibres, riche en glucides simples, 1-3 g/kg) nécessite une approche dédiée — consulte un coach ou un diététicien du sport.</>,
  },
  {
    q: 'L\'outil remplace-t-il un avis médical ?',
    a: <><strong>Non.</strong> Il donne des estimations basées sur la littérature scientifique générale (±15 %). Si tu as une condition médicale (diabète, troubles digestifs, pathologie cardiaque, grossesse, etc.), consulte un professionnel de santé.</>,
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
  carbsBySemiTime,
  hydrationByProfil,
  sodiumByProfil,
  caffeineDose,
  strategyForChrono,
  computeNutrition,
};

export default NutritionSemiMarathonPage;
