
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Apple,
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
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CALCUL (inline, monolithique — pas d'abstraction prématurée)
// Sources : ACSM/AND 2016, Jeukendrup 2014, Cermak & van Loon 2013,
// Sawka 2007 (hydratation), Hew-Butler 2015 (sodium/EAH), Maughan 2016 (caféine).
// ─────────────────────────────────────────────────────────────────────────────

type Sexe = 'H' | 'F';
type Niveau = 'Débutant' | 'Régulier' | 'Confirmé' | 'Expert';
type Hygrometrie = 'Sec' | 'Standard' | 'Humide';
type ExpNutrition = 'Jamais' | 'Occasionnel' | 'Habitué';
type Sudation = 'Faible' | 'Modéré' | 'Élevé' | 'Salty sweater';
type Cafeine = 'Aucune' | '1-2 cafés/j' | '3+ cafés/j';
type Cycle = 'Phase folliculaire' | 'Phase lutéale' | 'Pas concernée';

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
  caffeineDoseMgPerKg: number;
  kcalPerHour: number;
  totalKcal: number;
  premierMode: boolean;
  warnings: string[];
  // Pack
  nbGels: number;
  nbBidons: number;
  nbCapsSel: number;
  // Timeline (objets séquentiels)
  timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[];
}

// Convertit h:m:s → secondes
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

// Glucides g/h selon chrono (Jeukendrup 2014, Cermak & van Loon 2013)
const carbsByChrono = (chronoSec: number): { min: number; max: number; target: number } => {
  if (chronoSec < 2.5 * 3600) return { min: 90, max: 120, target: 100 };       // sub-2h30
  if (chronoSec < 3 * 3600) return { min: 80, max: 100, target: 90 };          // sub-3h
  if (chronoSec < 3.5 * 3600) return { min: 70, max: 90, target: 80 };         // sub-3h30
  if (chronoSec < 4 * 3600) return { min: 60, max: 80, target: 70 };           // sub-4h
  if (chronoSec < 4.5 * 3600) return { min: 50, max: 70, target: 60 };         // sub-4h30
  if (chronoSec < 5 * 3600) return { min: 45, max: 60, target: 50 };           // sub-5h
  return { min: 40, max: 55, target: 45 };                                     // 5h+
};

// Matrice hydratation mL/h selon profil sudation × température (Sawka 2007)
const hydrationByProfil = (sudation: Sudation, tempC: number): number => {
  // Lookup table 4 profils × 4 fourchettes température
  const tempBucket: 0 | 1 | 2 | 3 =
    tempC < 10 ? 0 : tempC < 18 ? 1 : tempC < 25 ? 2 : 3;

  const table: Record<Sudation, [number, number, number, number]> = {
    Faible:           [350, 450, 550, 650],
    Modéré:           [450, 550, 650, 800],
    Élevé:            [550, 650, 800, 900],
    'Salty sweater':  [600, 700, 850, 950],
  };
  let ml = table[sudation][tempBucket];
  // Cap absolu hyponatrémie d'effort (Hew-Butler 2015 — max 1000 mL/h)
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

// Caféine pré-course (Maughan 2016 : 3-5 mg/kg)
// Note : on calcule en mg/kg, mais on n'affiche JAMAIS le poids.
// On affiche uniquement la dose totale en mg.
const caffeineDose = (poidsKg: number, cafeineHabit: Cafeine, premierMode: boolean): { totalMg: number; mgPerKg: number } => {
  let mgPerKg = 3; // base prudente
  if (!premierMode) {
    mgPerKg = 4; // dose moyenne
    if (cafeineHabit === '3+ cafés/j') mgPerKg = Math.round(mgPerKg * 0.7 * 10) / 10; // -30% si tolérance
  } else {
    mgPerKg = 3; // cap Premier
  }
  const totalMg = Math.round(poidsKg * mgPerKg);
  return { totalMg, mgPerKg };
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
  cycle: Cycle | null;
}): CalcResult => {
  const {
    poidsKg, premierMode, chronoSec, tempC, hygrometrie, expNutrition,
    sudation, cafeineHabit,
  } = params;

  const warnings: string[] = [];

  // ─── Glucides ───
  const carbsBase = carbsByChrono(chronoSec);
  let target = carbsBase.target;
  // Ajustement -20% si jamais d'expérience nutrition
  if (expNutrition === 'Jamais') {
    target = Math.round(target * 0.8);
    warnings.push("Cible glucides réduite de 20% car aucune expérience nutrition en course. Progresse graduellement.");
  }
  // Mode Premier : cap à 60 g/h max
  if (premierMode && target > 60) {
    target = 60;
    warnings.push("Mode Premier marathon : cible glucides plafonnée à 60 g/h pour limiter le risque digestif.");
  }
  const carbsPerHour = { ...carbsBase, target };
  const totalCarbs = Math.round((target * chronoSec) / 3600);

  // ─── Hydratation ───
  let hydrationPerHour = hydrationByProfil(sudation, tempC);
  // Ajustement humidité
  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
  // Cap final 1000 mL/h
  if (hydrationPerHour > 1000) hydrationPerHour = 1000;
  if (hydrationPerHour > 800) {
    warnings.push("Hydratation > 800 mL/h : surveille les signes d'hyponatrémie (nausées, confusion, gonflement). Cap absolu 1000 mL/h.");
  }
  const totalHydration = Math.round((hydrationPerHour * chronoSec) / 3600);

  // ─── Sodium ───
  let sodiumPerLiter = sodiumByProfil(sudation);
  if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300;
  const totalSodium = Math.round((sodiumPerLiter * totalHydration) / 1000);

  // ─── Caféine ───
  const { totalMg: caffeinePreRace, mgPerKg } = caffeineDose(poidsKg, cafeineHabit, premierMode);

  // ─── Énergie (ACSM, kcal/h ≈ poids × vitesse_kmh × 0.95) ───
  const distanceKm = 42.195;
  const vitesseKmh = distanceKm / (chronoSec / 3600);
  const kcalPerHour = Math.round(poidsKg * vitesseKmh * 0.95);
  const totalKcal = Math.round((kcalPerHour * chronoSec) / 3600);

  // ─── Pack (estimation simple) ───
  const carbsPerGel = 25; // gel standard 25g
  const nbGels = Math.max(0, Math.ceil((totalCarbs - 20) / carbsPerGel)); // -20g pour boisson glucidique
  const bidonMl = 500;
  const nbBidons = Math.max(1, Math.ceil(totalHydration / bidonMl / 2)); // recharge possible
  const sodiumPerCap = 500;
  const nbCapsSel = sudation === 'Salty sweater' || sudation === 'Élevé'
    ? Math.max(1, Math.ceil((totalSodium - sodiumPerLiter * (totalHydration / 1000) * 0.7) / sodiumPerCap))
    : 0;

  // ─── Timeline ───
  const timeline: { window: string; instruction: string; tone: 'normal' | 'warning' | 'highlight' }[] = [];
  timeline.push({
    window: 'H-30 → H-0',
    instruction: `Hydratation 200-400 mL d'eau plate. Si caféine : prends ${caffeinePreRace} mg (équivalent ~${Math.round(caffeinePreRace / 80)} expressos) 45-60 min avant le départ.`,
    tone: 'highlight',
  });
  timeline.push({
    window: 'H-15 → H-0',
    instruction: "ZONE ROUGE : pas de gel ni de glucides solides (risque hypoglycémie réactionnelle au départ).",
    tone: 'warning',
  });
  timeline.push({
    window: 'km 0-8',
    instruction: "Hydratation seulement (gorgées toutes les 10-15 min, ~150-200 mL). Pas de gel.",
    tone: 'normal',
  });
  timeline.push({
    window: 'km 8-10',
    instruction: `1er gel (${carbsPerGel}g glucides) + 150-200 mL eau. Démarre la prise sodium si disponible.`,
    tone: 'highlight',
  });
  timeline.push({
    window: 'km 10 → arrivée',
    instruction: `1 gel toutes les ${Math.max(15, Math.round(60 / (target / carbsPerGel)))} min + 150-250 mL liquide. Alterne eau/isotonique selon ravitos.`,
    tone: 'normal',
  });
  if (chronoSec > 4 * 3600) {
    timeline.push({
      window: 'Après 4h de course',
      instruction: "Si tu sens la lassitude gustative : alterne gel ↔ boisson glucidique ↔ banane ravitos. Maintiens le rythme glucides coûte que coûte.",
      tone: 'normal',
    });
  }
  if (cafeineHabit !== 'Aucune' && !premierMode) {
    timeline.push({
      window: 'km 30-35',
      instruction: `Boost caféine final : gel caféiné (~50 mg) pour le 30e km. Pas plus tard que 5 km avant l'arrivée.`,
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
    caffeineDoseMgPerKg: mgPerKg,
    kcalPerHour,
    totalKcal,
    premierMode,
    warnings,
    nbGels,
    nbBidons,
    nbCapsSel,
    timeline,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GA4 helper (gtag est chargé via index.html — guard si absent)
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

const NutritionMarathonPage: React.FC = () => {
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
  const [cycle, setCycle] = useState<Cycle>('Pas concernée');

  const [result, setResult] = useState<CalcResult | null>(null);
  const [showSafety, setShowSafety] = useState<boolean>(false);
  const [showMedicalDisclaimer, setShowMedicalDisclaimer] = useState<boolean>(false);

  // ─── Bandeau pré/post (localStorage 30j) ───
  const [showWarningBar, setShowWarningBar] = useState<boolean>(true);
  useEffect(() => {
    const ack = localStorage.getItem('nutrition_marathon_warning_ack_v1');
    if (ack) {
      const ackDate = parseInt(ack, 10);
      const days = (Date.now() - ackDate) / (1000 * 60 * 60 * 24);
      if (days < 30) setShowWarningBar(false);
    }
    trackEvent('nutrition_marathon_view');
  }, []);

  const dismissWarningBar = () => {
    localStorage.setItem('nutrition_marathon_warning_ack_v1', Date.now().toString());
    setShowWarningBar(false);
  };

  // ─── Auto-coche Mode Premier si Débutant ───
  useEffect(() => {
    if (niveau === 'Débutant') setPremierMode(true);
  }, [niveau]);

  // ─── Reset cycle si Sexe = H ───
  useEffect(() => {
    if (sexe === 'H') setCycle('Pas concernée');
  }, [sexe]);

  // ─── Validation et calcul ───
  const calculate = () => {
    const poidsNum = parseFloat(poids);
    const chronoSec = hmsToSec(chronoH, chronoM, chronoS);
    const tempNum = parseFloat(tempC);

    if (!poidsNum || poidsNum < 30 || poidsNum > 200) {
      alert("Renseigne un poids valide (entre 30 et 200 kg).");
      return;
    }
    if (chronoSec < 7200 || chronoSec > 7 * 3600) {
      alert("Renseigne un chrono valide (entre 2h00 et 7h00).");
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
      cycle: sexe === 'F' ? cycle : null,
    });
    setResult(r);
    trackEvent('nutrition_marathon_calculate', {
      chrono: r.durationLabel,
      niveau,
      premier_mode: premierMode,
      temp: tempNum,
    });
    // Scroll vers résultats
    setTimeout(() => {
      const el = document.getElementById('nutrition-results');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const onCtaPlanClick = () => {
    trackEvent('nutrition_marathon_cta_plan_click');
  };

  return (
    <>
      <Helmet>
        <title>Calculateur Nutrition Marathon Gratuit | Coach Running IA</title>
        <meta
          name="description"
          content="Calculateur nutrition marathon gratuit : glucides, hydratation, sodium et caféine personnalisés selon ton chrono, ton profil et la météo. Stratégie scientifique ACSM/Jeukendrup."
        />
        <meta
          name="keywords"
          content="nutrition marathon, plan nutrition marathon, glucides marathon, hydratation marathon, caféine marathon, calculateur nutrition course, stratégie nutrition marathon, gels marathon"
        />
        <link rel="canonical" href="https://coachrunningia.fr/outils/nutrition-marathon" />
        <meta property="og:title" content="Calculateur Nutrition Marathon : Glucides, Hydratation, Sodium personnalisés" />
        <meta property="og:description" content="Plan nutrition marathon personnalisé en 30 secondes. Glucides, hydratation, sodium et caféine adaptés à ton chrono et à la météo." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Calculateur Nutrition Marathon Gratuit" />
        <meta name="twitter:description" content="Plan nutrition marathon personnalisé : glucides, hydratation, sodium, caféine selon ton chrono." />
        <meta name="twitter:image" content="https://coachrunningia.fr/og-image.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Combien de glucides par heure prendre en marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Entre 40 et 120 g/h selon ton chrono. Sub-3h : 80-100 g/h. Sub-4h : 60-80 g/h. Sub-5h : 45-60 g/h. Plus le marathon est rapide, plus l'apport doit être élevé (recommandations Jeukendrup 2014 / Cermak 2013). Adapte progressivement via le gut training."
              }
            },
            {
              "@type": "Question",
              "name": "Combien boire pendant un marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Entre 400 et 800 mL/h selon ta sudation, la température et l'hygrométrie. Cap absolu 1000 mL/h pour éviter l'hyponatrémie d'effort. La règle ACSM : boire selon la soif, jamais en excès."
              }
            },
            {
              "@type": "Question",
              "name": "Quand prendre son premier gel en marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Entre le km 8 et le km 10, soit après 45-60 min de course. Évite tout gel dans les 15 minutes précédant le départ (risque d'hypoglycémie réactionnelle). Ensuite, un gel toutes les 25-30 min."
              }
            },
            {
              "@type": "Question",
              "name": "Faut-il prendre de la caféine en marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "La caféine améliore la performance d'environ 2-3% (Maughan 2016). Dose recommandée : 3-5 mg/kg de poids corporel, 45-60 min avant le départ. Réduis la dose si tu consommes 3 cafés/j ou plus (tolérance). Évite si premier marathon."
              }
            },
            {
              "@type": "Question",
              "name": "Comment éviter le mur du 30e km ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Le mur vient de l'épuisement des stocks de glycogène. Trois leviers : 1) Carb-loading 48h avant. 2) Apport glucidique régulier pendant la course (60-90 g/h dès le km 8). 3) Allure de départ contrôlée (pas plus rapide que l'allure cible)."
              }
            },
            {
              "@type": "Question",
              "name": "Quelle différence entre eau et boisson isotonique en marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "L'eau seule hydrate mais n'apporte ni glucides ni sodium. L'isotonique (60-80 g glucides/L + 400-1200 mg sodium/L) couvre les 3 besoins simultanément. Alterne les deux sur les ravitos pour éviter la saturation digestive."
              }
            },
            {
              "@type": "Question",
              "name": "Combien de gels prévoir pour un marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "En général 5 à 8 gels selon ton chrono et ta cible glucidique. Un gel standard = 25g de glucides. Sub-3h30 : 7-8 gels. Sub-4h30 : 5-6 gels. Toujours en tester un de plus en sécurité (chute, gel raté)."
              }
            },
            {
              "@type": "Question",
              "name": "Qu'est-ce que le gut training ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "C'est l'entraînement digestif : habituer ton tube digestif à absorber des glucides à l'effort. Indispensable. Démarre 8-12 semaines avant le marathon, augmente progressivement de 30 à 60-90 g/h sur tes sorties longues."
              }
            },
            {
              "@type": "Question",
              "name": "Pourquoi du sodium en marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "La sueur évacue 400-1500 mg de sodium par litre. Le sodium aide l'absorption intestinale de l'eau et des glucides, et prévient les crampes et l'hyponatrémie. Cible : 400-1200 mg/L de boisson selon ton profil de sudation."
              }
            },
            {
              "@type": "Question",
              "name": "Que manger 1h avant un marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Cet outil traite uniquement la nutrition PENDANT la course. Pour le pré-course, le carb-loading et le dernier repas sont des sujets distincts qui nécessitent une approche dédiée (3-4h avant : repas pauvre en fibres, riche en glucides simples)."
              }
            },
            {
              "@type": "Question",
              "name": "Doit-on tester sa nutrition avant le marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Oui, c'est NON négociable. Aucune marque, aucun gel, aucune boisson ne doit être découverte le jour J. Teste toute ta stratégie nutrition au moins 3 fois en sortie longue avant ton marathon objectif."
              }
            },
            {
              "@type": "Question",
              "name": "Que faire si j'ai mal au ventre pendant le marathon ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Stoppe les gels pendant 15-20 min, passe à l'eau plate seule, ralentis temporairement. Si ça persiste : alterne gel et solide (banane ravitos). Cause fréquente : trop de glucides d'un coup, ou gut training insuffisant en amont."
              }
            },
            {
              "@type": "Question",
              "name": "Le ratio glucose-fructose change quoi ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Au-delà de 60 g/h, mélanger glucose et fructose (ratio 2:1 ou 1:0.8) permet d'absorber jusqu'à 90-120 g/h via 2 transporteurs intestinaux différents (SGLT1 + GLUT5). Sans ce ratio, plafond physiologique à 60 g/h."
              }
            },
            {
              "@type": "Question",
              "name": "Premier marathon : quelle stratégie nutrition ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Mode prudent : cap glucides à 60 g/h, hydratation modérée (500-700 mL/h selon météo), pas de caféine si pas habitué, gels testés en sortie longue. L'objectif est de finir confortablement, pas d'optimiser à la marge."
              }
            },
            {
              "@type": "Question",
              "name": "L'outil remplace-t-il un avis médical ?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Non. Cet outil donne des estimations basées sur la littérature scientifique générale (±15% d'incertitude). Si tu as une condition médicale (diabète, troubles digestifs chroniques, pathologie cardiaque, grossesse, etc.), consulte un professionnel de santé spécialisé sport."
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
                  avant-course (carb-loading, dernier repas) et après-course (récupération) sont primordiales et
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
              <span className="text-accent">Nutrition Marathon</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Calculateur Nutrition Marathon : ta stratégie personnalisée
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl">
              Glucides, hydratation, sodium et caféine adaptés à ton chrono, ton profil et la météo
              du jour J. Basé sur les recommandations ACSM, Jeukendrup et Cermak.
            </p>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 -mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Apple className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Ma stratégie nutrition</h2>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Premier marathon</label>
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
                        C'est mon premier marathon
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
                        min="2"
                        max="7"
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
                    <p className="text-xs text-slate-500 mt-1">Ex : 3h45 → 3 / 45 / 00</p>
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

                    {/* Cycle conditionnel Sexe = F uniquement */}
                    {sexe === 'F' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cycle menstruel</label>
                        <select
                          value={cycle}
                          onChange={(e) => setCycle(e.target.value as Cycle)}
                          className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-accent focus:border-accent"
                        >
                          <option value="Phase folliculaire">Phase folliculaire (post-règles, ~J1-J14)</option>
                          <option value="Phase lutéale">Phase lutéale (~J15-J28)</option>
                          <option value="Pas concernée">Pas concernée / je préfère ne pas indiquer</option>
                        </select>
                      </div>
                    )}
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
                    <strong>Mode Premier marathon activé.</strong> Stratégie volontairement prudente :
                    cap glucides 60 g/h, pas de boost caféine final. L'objectif est de finir confortablement.
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
                    <div className="text-2xl font-bold text-emerald-700">{result.totalSodium}</div>
                    <div className="text-xs text-slate-500 mt-1">mg sodium</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">{result.caffeinePreRace}</div>
                    <div className="text-xs text-slate-500 mt-1">mg caféine</div>
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
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
                  Estimation théorique ±15% — adapte selon ton ressenti jour J. Aucune stratégie nutrition
                  ne remplace les sensations en temps réel.
                </div>
              </div>

              {/* CARTE 2 — Timeline */}
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

              {/* CARTE 3 — Pack nutrition */}
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
                    </span>
                  </li>
                  <li className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">
                      <strong>{result.nbBidons} bidons</strong> de 500 mL d'isotonique (60-80 g/L glucides + {result.sodiumPerLiter} mg/L sodium)
                    </span>
                  </li>
                  {result.nbCapsSel > 0 && (
                    <li className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.nbCapsSel} caps de sel</strong> de 500 mg (pour compléter selon perte sudorale)
                      </span>
                    </li>
                  )}
                  {result.caffeinePreRace > 0 && (
                    <li className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        <strong>{result.caffeinePreRace} mg de caféine</strong> pré-course (gélule, expresso ou boisson énergisante)
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

              {/* CARTE 4 — Sécurité (accordéon replié) */}
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
                        Surveille si tu dépasses 800 mL/h d'hydratation : nausées, gonflement des doigts, confusion,
                        prise de poids pendant la course = signes possibles. Cap absolu : 1000 mL/h. Ne bois jamais sans soif.
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
                      <h3 className="font-bold text-sm text-amber-900 mb-1">Gut training indispensable</h3>
                      <p className="text-sm text-amber-800">
                        L'absorption intestinale de 60-90 g de glucides/h ne s'improvise pas. Démarre le gut training
                        8 à 12 semaines avant ton marathon : sorties longues avec gels, augmentation progressive de 30 à 60-90 g/h.
                      </p>
                    </div>

                    {sexe === 'F' && cycle !== 'Pas concernée' && (
                      <div className="border-l-4 border-pink-400 bg-pink-50 p-4 rounded-r-lg">
                        <h3 className="font-bold text-sm text-pink-900 mb-1">Cycle menstruel</h3>
                        <p className="text-sm text-pink-800">
                          {cycle === 'Phase lutéale'
                            ? 'En phase lutéale, la température corporelle est légèrement plus élevée et la sensibilité à la déshydratation augmente. Vérifie ton hydratation de près.'
                            : 'En phase folliculaire, l\'absorption glucidique est généralement optimale. Profite-en pour tester des charges plus élevées en sortie longue.'}
                        </p>
                      </div>
                    )}

                    {/* Disclaimer médical — accordéon dans l'accordéon */}
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

              {/* CARTE 5 — CTA Plan (POST-synthèse uniquement) */}
              <div className="bg-gradient-to-br from-accent to-orange-500 text-white rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold mb-3">
                  Ta stratégie nutrition est prête. Et ton plan d'entraînement ?
                </h2>
                <p className="text-white/90 mb-5 text-sm md:text-base">
                  Pour que cette stratégie tienne la route, il faut un plan progressif derrière.
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

              {/* Bouton imprimer (window.print, MVP) */}
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
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-slate max-w-none">

            <h2>À quoi sert ce calculateur nutrition marathon ?</h2>
            <p>
              Le marathon est une épreuve où la <strong>stratégie nutritionnelle</strong> détermine
              autant la performance que l'entraînement. Au-delà de 2h d'effort, les stocks de
              <strong> glycogène</strong> s'épuisent, l'<strong>hydratation</strong> devient critique et
              les <strong>électrolytes</strong> commencent à manquer. Un mauvais plan nutrition transforme
              un marathon préparé en cauchemar à partir du 25e km.
            </p>
            <p>
              Cet outil personnalise ta stratégie selon ton <strong>chrono visé</strong>, ton <strong>profil
              physiologique</strong> (sudation, expérience) et les conditions <strong>météo du jour J</strong>
              (température, hygrométrie). Tu obtiens un plan complet : glucides/heure, hydratation/heure,
              sodium, caféine, timeline km par km et liste matérielle à prévoir.
            </p>

            <h2>Comment fonctionne le calculateur ?</h2>
            <p>
              Les formules s'appuient sur les <strong>consensus scientifiques internationaux</strong> :
            </p>
            <ul>
              <li><strong>ACSM/AND 2016</strong> : recommandations sodium et hydratation (Sawka et al. 2007)</li>
              <li><strong>Jeukendrup 2014</strong> : tables glucides/heure selon la durée d'effort</li>
              <li><strong>Cermak & van Loon 2013</strong> : méta-analyse glucides et performance endurance</li>
              <li><strong>Hew-Butler 2015</strong> : prévention hyponatrémie d'effort (EAH)</li>
              <li><strong>Maughan 2016</strong> : protocoles caféine et performance</li>
            </ul>
            <p>
              Le calculateur intègre aussi des <strong>ajustements doctrine</strong> : cap glucides 60 g/h
              en mode "premier marathon", cap hydratation absolu 1000 mL/h (sécurité EAH), réduction de la
              cible glucidique si l'expérience nutrition est nulle (gut training non fait).
            </p>

            <h2>Glucides par heure : 40-120 g/h selon ton chrono</h2>
            <p>
              La cible <strong>glucides/heure</strong> dépend principalement de la durée d'effort
              et de la tolérance digestive entraînée :
            </p>
            <div className="not-prose overflow-x-auto my-6">
              <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Chrono visé</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Glucides/h cible</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Plage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  <tr><td className="px-4 py-3 font-medium">sub-3h</td><td>90 g/h</td><td>80-100</td><td>Ratio 2:1 glucose/fructose obligatoire</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 font-medium">sub-3h30</td><td>80 g/h</td><td>70-90</td><td>Ratio 2:1 recommandé</td></tr>
                  <tr><td className="px-4 py-3 font-medium">sub-4h</td><td>70 g/h</td><td>60-80</td><td>Gel + boisson glucidique</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 font-medium">sub-4h30</td><td>60 g/h</td><td>50-70</td><td>Plafond physiologique standard</td></tr>
                  <tr><td className="px-4 py-3 font-medium">sub-5h+</td><td>50 g/h</td><td>40-60</td><td>Mode prudent, alterner solide/liquide</td></tr>
                </tbody>
              </table>
            </div>
            <p>
              <em>Source : Jeukendrup, Sports Medicine 2014. Cermak & van Loon, Sports Medicine 2013.</em>
            </p>

            <h2>Hydratation marathon : ne pas trop boire est aussi dangereux que se déshydrater</h2>
            <p>
              L'erreur classique du débutant : forcer la boisson "pour bien faire" → <strong>hyponatrémie
              d'effort (EAH)</strong>, complication grave (œdème cérébral possible). La règle ACSM :
              <strong> boire selon la soif</strong>, jamais plus de 1000 mL/h.
            </p>
            <div className="not-prose overflow-x-auto my-6">
              <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Profil sudation</th>
                    <th className="px-4 py-3 text-left font-semibold">&lt; 10°C</th>
                    <th className="px-4 py-3 text-left font-semibold">10-18°C</th>
                    <th className="px-4 py-3 text-left font-semibold">18-25°C</th>
                    <th className="px-4 py-3 text-left font-semibold">&gt; 25°C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="px-4 py-3 font-medium">Faible</td><td>350 mL/h</td><td>450</td><td>550</td><td>650</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 font-medium">Modéré</td><td>450</td><td>550</td><td>650</td><td>800</td></tr>
                  <tr><td className="px-4 py-3 font-medium">Élevé</td><td>550</td><td>650</td><td>800</td><td>900</td></tr>
                  <tr className="bg-slate-50"><td className="px-4 py-3 font-medium">Salty sweater</td><td>600</td><td>700</td><td>850</td><td>950</td></tr>
                </tbody>
              </table>
            </div>

            <h2>Sodium en marathon : combien et pourquoi</h2>
            <p>
              Le <strong>sodium</strong> joue 3 rôles : il facilite l'absorption intestinale de l'eau
              et des glucides, prévient les <strong>crampes</strong> et protège contre l'<strong>hyponatrémie</strong>.
              La perte sodique varie énormément d'un coureur à l'autre (de 400 à 1500 mg/L de sueur).
            </p>
            <ul>
              <li>Sudation faible : <strong>400 mg/L</strong> de boisson</li>
              <li>Sudation modérée : <strong>600 mg/L</strong></li>
              <li>Sudation élevée : <strong>900 mg/L</strong></li>
              <li>Salty sweater (traces blanches) : <strong>1200 mg/L</strong></li>
            </ul>

            <h2>Caféine et marathon : dosage et timing</h2>
            <p>
              La caféine améliore la performance d'environ <strong>2-3% sur le marathon</strong> (Maughan 2016).
              Dose efficace : <strong>3-5 mg/kg</strong> de poids corporel, prise 45 à 60 minutes avant le départ.
            </p>
            <ul>
              <li>Si tu bois <strong>3 cafés/jour ou plus</strong> : réduis la dose de 30% (tolérance installée).</li>
              <li>Si <strong>premier marathon</strong> ou caféine non testée : pas de boost final, dose réduite.</li>
              <li>Plafond de sécurité : <strong>6 mg/kg cumulés sur 24h</strong> (insomnie, palpitations au-delà).</li>
            </ul>

            <h2>Le mur du 30e km : pourquoi et comment l'éviter</h2>
            <p>
              Le fameux <strong>"mur"</strong> n'est pas une fatalité : c'est l'épuisement des stocks de
              glycogène musculaire et hépatique. Trois leviers pour le prévenir :
            </p>
            <ol>
              <li><strong>Carb-loading 48h avant</strong> : 8-10 g de glucides/kg/jour les 2 jours précédant la course</li>
              <li><strong>Apport régulier pendant la course</strong> : 60-90 g/h dès le 8e km, sans rupture</li>
              <li><strong>Allure de départ contrôlée</strong> : sortir vite = brûler du glycogène 2x plus vite</li>
            </ol>

            <h2>Plan nutrition par chrono</h2>

            <h3>Plan nutrition marathon sub-3h</h3>
            <p>
              Pour un sub-3h, l'apport glucidique doit être <strong>maximisé</strong> : 80-100 g/h dès le 8e km,
              avec ratio glucose/fructose 2:1 obligatoire (transporteurs SGLT1 + GLUT5). Hydratation
              500-700 mL/h selon météo. Caféine 4-5 mg/kg pré-course + gel caféiné au 30e km.
            </p>

            <h3>Plan nutrition marathon sub-3h30</h3>
            <p>
              Cible 70-90 g/h, soit environ 1 gel toutes les 20-25 min après le km 8. Hydratation
              500-650 mL/h. Le mur frappe souvent vers le 32-35e km : maintenir l'apport coûte que coûte
              dans les 15 derniers km, même sans envie.
            </p>

            <h3>Plan nutrition marathon sub-4h</h3>
            <p>
              Sub-4h = 60-80 g/h. Un gel toutes les 25 min suffit. Hydratation 500-650 mL/h. Caféine
              optionnelle (3-4 mg/kg) si tu es habitué. Sodium 600-900 mg/L selon ta sudation.
            </p>

            <h3>Plan nutrition marathon sub-4h30</h3>
            <p>
              Cible 50-70 g/h. Alterne gel et boisson glucidique pour limiter la saturation digestive.
              Hydratation 450-600 mL/h. Pas de boost caféine final si premier marathon.
            </p>

            <h3>Plan nutrition marathon sub-5h</h3>
            <p>
              Sub-5h = ~45-60 g/h. Privilégie la <strong>diversité</strong> : gel, banane ravitos,
              pâte de fruits, boisson isotonique. La lassitude gustative est ton vrai ennemi.
              Hydratation 400-600 mL/h selon météo.
            </p>

            <h2>FAQ marathon nutrition</h2>

            <h3>Combien de glucides par heure prendre en marathon ?</h3>
            <p>Entre 40 et 120 g/h selon ton chrono. Sub-3h : 80-100 g/h. Sub-4h : 60-80 g/h.
            Sub-5h : 45-60 g/h. Adapte progressivement via le gut training.</p>

            <h3>Combien boire pendant un marathon ?</h3>
            <p>Entre 400 et 800 mL/h selon ta sudation et la température. Cap absolu 1000 mL/h pour
            éviter l'hyponatrémie d'effort. Boire selon la soif, jamais en excès.</p>

            <h3>Quand prendre son premier gel en marathon ?</h3>
            <p>Entre le km 8 et le km 10, soit après 45-60 min de course. Évite tout gel dans les
            15 minutes précédant le départ (hypoglycémie réactionnelle).</p>

            <h3>Faut-il prendre de la caféine en marathon ?</h3>
            <p>3-5 mg/kg de poids corporel, 45-60 min avant le départ. Réduis la dose si tu bois
            3 cafés/j ou plus. Évite si premier marathon.</p>

            <h3>Comment éviter le mur du 30e km ?</h3>
            <p>Carb-loading 48h avant + apport glucidique régulier (60-90 g/h dès le km 8) +
            allure de départ contrôlée.</p>

            <h3>Quelle différence entre eau et boisson isotonique ?</h3>
            <p>L'eau hydrate seulement. L'isotonique (60-80 g/L + sodium) couvre 3 besoins simultanément.
            Alterne les deux pour limiter la saturation.</p>

            <h3>Combien de gels prévoir pour un marathon ?</h3>
            <p>5 à 8 gels selon ton chrono et ta cible glucidique. Toujours un de plus en sécurité.</p>

            <h3>Qu'est-ce que le gut training ?</h3>
            <p>Entraînement digestif : habituer ton intestin à absorber 60-90 g/h. Démarre 8-12
            semaines avant le marathon.</p>

            <h3>Pourquoi du sodium en marathon ?</h3>
            <p>Le sodium aide l'absorption, prévient les crampes et l'hyponatrémie.
            Cible : 400-1200 mg/L de boisson selon ton profil.</p>

            <h3>Que manger 1h avant le marathon ?</h3>
            <p>Cet outil ne traite que la nutrition PENDANT la course. Le pré-course nécessite
            une approche dédiée (3-4h avant : repas pauvre en fibres et riche en glucides simples).</p>

            <h3>Doit-on tester sa nutrition avant le marathon ?</h3>
            <p>Oui, c'est NON négociable. Teste toute ta stratégie au moins 3 fois en sortie longue.</p>

            <h3>Que faire si j'ai mal au ventre pendant la course ?</h3>
            <p>Stoppe les gels 15-20 min, passe à l'eau plate, ralentis. Si ça persiste : alterne
            gel et solide (banane ravitos).</p>

            <h3>Le ratio glucose-fructose change quoi ?</h3>
            <p>Au-delà de 60 g/h, mélanger glucose et fructose (ratio 2:1 ou 1:0.8) permet d'absorber
            jusqu'à 90-120 g/h via 2 transporteurs intestinaux.</p>

            <h3>Premier marathon : quelle stratégie nutrition ?</h3>
            <p>Mode prudent : cap glucides 60 g/h, hydratation modérée, pas de caféine si pas habitué,
            gels testés en sortie longue. Objectif : finir confortablement.</p>

            <h3>L'outil remplace-t-il un avis médical ?</h3>
            <p>Non. Il donne des estimations basées sur la littérature scientifique générale (±15%).
            Si tu as une condition médicale (diabète, troubles digestifs, pathologie cardiaque,
            grossesse, etc.), consulte un professionnel de santé.</p>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              Autres outils pour ton marathon
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/outils/allure-marathon" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Calculateur Allure Marathon
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Trouve ton allure cible et tes temps de passage
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
                  Estime ton chrono marathon à partir d'un 10k ou semi
                </p>
                <span className="text-accent text-sm font-medium flex items-center gap-1">
                  Utiliser <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <Link to="/outils/calculateur-vma" className="group p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-100">
                <h3 className="font-semibold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  Calculateur VMA
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Calcule ta VMA et tes zones d'entraînement
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
// Exports pour tests unitaires
// ─────────────────────────────────────────────────────────────────────────────
export { carbsByChrono, hydrationByProfil, sodiumByProfil, caffeineDose, computeNutrition };

export default NutritionMarathonPage;
