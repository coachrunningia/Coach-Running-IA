
import React, { useState, useMemo } from 'react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import {
  Book, Calculator, ArrowRight, Search, ChevronDown, ChevronUp,
  Zap, Heart, Timer, TrendingUp, Activity, Target, RotateCcw
} from 'lucide-react';

// ============================================
// DÉFINITIONS RUNNING
// ============================================

interface Definition {
  term: string;
  shortDef: string;
  fullDef: string;
  icon: React.ReactNode;
  category: 'allures' | 'physiologie' | 'entrainement' | 'mesures';
  relatedTerms?: string[];
}

const DEFINITIONS: Definition[] = [
  // === ALLURES ===
  {
    term: 'VMA',
    shortDef: 'Vitesse Maximale Aérobie',
    fullDef: "La VMA est la vitesse de course à laquelle votre consommation d'oxygène atteint son maximum (VO2max). C'est un indicateur clé de votre potentiel en course à pied. Elle se mesure généralement via un test terrain (demi-Cooper, VAMEVAL) ou en laboratoire. Une VMA de 15 km/h signifie que vous pouvez théoriquement tenir cette allure pendant 4-7 minutes à effort maximal.",
    icon: <Zap className="text-red-500" size={20} />,
    category: 'physiologie',
    relatedTerms: ['VO2max', 'Seuil', 'Fractionné']
  },
  {
    term: 'VO2max',
    shortDef: 'Consommation maximale d\'oxygène',
    fullDef: "Le VO2max représente la quantité maximale d'oxygène que votre organisme peut utiliser par minute lors d'un effort intense. Exprimé en ml/kg/min, il est directement lié à votre VMA (VO2max ≈ VMA × 3.5). Un coureur débutant a généralement un VO2max de 35-40 ml/kg/min, tandis qu'un coureur élite peut dépasser 70-80 ml/kg/min.",
    icon: <Activity className="text-blue-500" size={20} />,
    category: 'physiologie',
    relatedTerms: ['VMA', 'Capacité aérobie']
  },
  {
    term: 'Endurance Fondamentale (EF)',
    shortDef: 'Allure de base, conversation possible',
    fullDef: "L'endurance fondamentale est l'allure à laquelle vous pouvez tenir une conversation sans essoufflement. Elle correspond à environ 65-75% de votre FCmax ou 60-70% de votre VMA. C'est la base de tout entraînement running : elle développe votre système aérobie, améliore l'utilisation des graisses et permet la récupération active. 70-80% de votre volume d'entraînement devrait être en EF.",
    icon: <Heart className="text-green-500" size={20} />,
    category: 'allures',
    relatedTerms: ['Zone 2', 'Récupération', 'Sortie longue']
  },
  {
    term: 'Endurance Active (EA)',
    shortDef: 'Allure modérée, entre EF et Seuil',
    fullDef: "L'endurance active se situe entre l'endurance fondamentale et le seuil. Elle correspond à 75-85% de FCmax ou 70-80% de VMA. À cette allure, la conversation devient plus difficile. Elle permet de travailler l'économie de course et prépare aux allures plus rapides. Utilisée dans les sorties longues progressives ou les footing toniques.",
    icon: <TrendingUp className="text-yellow-500" size={20} />,
    category: 'allures',
    relatedTerms: ['EF', 'Seuil', 'Footing']
  },
  {
    term: 'Seuil (Lactique)',
    shortDef: 'Allure soutenable ~1h en compétition',
    fullDef: "Le seuil lactique correspond à l'intensité à laquelle l'acide lactique commence à s'accumuler plus vite qu'il n'est éliminé. Il se situe généralement autour de 85-90% de votre VMA. C'est approximativement votre allure de course sur semi-marathon. Travailler au seuil améliore votre capacité à maintenir une allure rapide sur la durée. Formats classiques : 3×10' ou 2×15' avec récupération courte.",
    icon: <Timer className="text-orange-500" size={20} />,
    category: 'allures',
    relatedTerms: ['Tempo', 'Semi-marathon', 'Lactate']
  },
  {
    term: 'Allure Spécifique',
    shortDef: 'Allure cible de votre course objectif',
    fullDef: "L'allure spécifique est la vitesse à laquelle vous prévoyez de courir votre compétition objectif. Pour un marathon en 4h, c'est 5:41 min/km. L'entraînement à allure spécifique permet à votre corps de mémoriser ce rythme et d'optimiser votre économie de course à cette vitesse précise. Essentiel dans les semaines de préparation spécifique.",
    icon: <Target className="text-purple-500" size={20} />,
    category: 'allures',
    relatedTerms: ['Objectif', 'Préparation spécifique']
  },

  // === ENTRAINEMENT ===
  {
    term: 'Fractionné',
    shortDef: 'Alternance d\'efforts intenses et récupérations',
    fullDef: "Le fractionné consiste à alterner des phases d'effort intense (généralement à allure VMA ou seuil) et des phases de récupération (trot ou marche). Exemples : 10×400m, 6×1000m, 30/30. Il permet d'accumuler du temps à haute intensité tout en restant frais grâce aux récupérations. C'est le moyen le plus efficace pour développer votre VMA.",
    icon: <RotateCcw className="text-red-500" size={20} />,
    category: 'entrainement',
    relatedTerms: ['VMA', 'Intervalle', 'Récupération']
  },
  {
    term: 'Fartlek',
    shortDef: 'Jeu de vitesse libre en nature',
    fullDef: "Le fartlek (\"jeu de vitesse\" en suédois) est une forme de fractionné non structurée. Vous variez les allures selon vos sensations, le terrain, ou des repères visuels (\"je sprinte jusqu'au prochain arbre\"). Plus ludique que le fractionné classique, il développe l'adaptation à différentes allures et la lecture du terrain. Idéal pour les débutants ou en trail.",
    icon: <Activity className="text-green-500" size={20} />,
    category: 'entrainement',
    relatedTerms: ['Fractionné', 'Trail', 'Sensations']
  },
  {
    term: 'Sortie Longue (SL)',
    shortDef: 'Séance longue à allure EF',
    fullDef: "La sortie longue est une séance d'1h30 à 2h30 (voire plus pour ultra) principalement en endurance fondamentale. Elle développe l'endurance aérobie, apprend au corps à utiliser les graisses, renforce les tendons et prépare mentalement aux longues distances. Pour un marathon, les SL peuvent atteindre 30-35 km. Variantes : SL progressive, SL avec blocs à allure spécifique.",
    icon: <Timer className="text-blue-500" size={20} />,
    category: 'entrainement',
    relatedTerms: ['Marathon', 'Endurance', 'EF']
  },
  {
    term: 'PPG / Renforcement',
    shortDef: 'Préparation Physique Générale',
    fullDef: "La PPG englobe tous les exercices de renforcement musculaire, gainage et proprioception qui complètent la course. Squats, fentes, gainage, pompes, exercices de pieds... Elle améliore l'économie de course, prévient les blessures et permet de mieux encaisser les charges d'entraînement. 1-2 séances de 20-30 min par semaine sont recommandées.",
    icon: <Zap className="text-purple-500" size={20} />,
    category: 'entrainement',
    relatedTerms: ['Gainage', 'Prévention', 'Force']
  },
  {
    term: 'Récupération',
    shortDef: 'Phase essentielle de progression',
    fullDef: "La récupération est le moment où votre corps s'adapte et progresse. Elle inclut le sommeil, l'alimentation, les jours de repos et les séances faciles. Sans récupération adéquate, pas de supercompensation ! Signes de sous-récupération : fatigue persistante, performances en baisse, irritabilité, troubles du sommeil. La règle : jamais 2 séances dures consécutives.",
    icon: <Heart className="text-green-500" size={20} />,
    category: 'entrainement',
    relatedTerms: ['Supercompensation', 'Repos', 'Adaptation']
  },

  // === MESURES ===
  {
    term: 'RPE',
    shortDef: 'Rate of Perceived Exertion (effort ressenti)',
    fullDef: "L'échelle RPE (1-10) mesure votre perception subjective de l'effort. 1-2 : très facile (marche). 3-4 : facile (EF, conversation aisée). 5-6 : modéré (EA, phrases courtes). 7-8 : difficile (seuil, quelques mots). 9-10 : maximal (VMA, impossible de parler). C'est un outil simple pour ajuster l'intensité sans montre cardio.",
    icon: <Activity className="text-orange-500" size={20} />,
    category: 'mesures',
    relatedTerms: ['FCmax', 'Intensité', 'Zones']
  },
  {
    term: 'FCmax',
    shortDef: 'Fréquence Cardiaque Maximale',
    fullDef: "La FCmax est le nombre maximal de battements par minute que votre cœur peut atteindre. Formule approximative : 220 - âge (peu fiable). Mieux vaut la mesurer lors d'un test d'effort ou d'une côte en fin de fractionné intense. Elle sert de référence pour calculer vos zones d'entraînement. Exemple : EF = 65-75% FCmax.",
    icon: <Heart className="text-red-500" size={20} />,
    category: 'mesures',
    relatedTerms: ['Zones cardio', 'RPE', 'Intensité']
  },
  {
    term: 'Cadence',
    shortDef: 'Nombre de pas par minute',
    fullDef: "La cadence est le nombre de pas (ou de foulées) par minute. Une cadence optimale se situe généralement entre 170-190 pas/min à allure EF. Une cadence trop basse (<160) peut indiquer une foulée trop longue, source de blessures. Augmenter légèrement sa cadence améliore souvent l'économie de course et réduit l'impact au sol.",
    icon: <Timer className="text-blue-500" size={20} />,
    category: 'mesures',
    relatedTerms: ['Foulée', 'Économie de course', 'Technique']
  },
  {
    term: 'D+ / Dénivelé Positif',
    shortDef: 'Cumul des montées en mètres',
    fullDef: "Le D+ représente le cumul total des montées sur un parcours. Un trail de 20 km avec 1000 m D+ signifie que vous allez monter l'équivalent de 1000 m d'altitude au total (pas forcément d'un seul tenant). En trail, le D+ est aussi important que la distance pour évaluer la difficulté. Règle : 100 m D+ ≈ 1 km de plat en effort.",
    icon: <TrendingUp className="text-green-500" size={20} />,
    category: 'mesures',
    relatedTerms: ['Trail', 'Altitude', 'Difficulté']
  },
  {
    term: 'Indice d\'endurance',
    shortDef: 'Capacité à maintenir l\'allure sur la durée',
    fullDef: "L'indice d'endurance mesure votre capacité à maintenir un pourcentage élevé de votre VMA sur de longues distances. Un marathonien élite peut maintenir 85% de sa VMA sur 42 km, tandis qu'un amateur sera plutôt à 75-80%. Il s'améliore avec les sorties longues, le travail au seuil et les années d'entraînement.",
    icon: <Target className="text-purple-500" size={20} />,
    category: 'mesures',
    relatedTerms: ['VMA', 'Marathon', 'Endurance']
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: <Book size={16} /> },
  { id: 'allures', label: 'Allures', icon: <Timer size={16} /> },
  { id: 'physiologie', label: 'Physiologie', icon: <Heart size={16} /> },
  { id: 'entrainement', label: 'Entraînement', icon: <Activity size={16} /> },
  { id: 'mesures', label: 'Mesures', icon: <TrendingUp size={16} /> },
];

// ============================================
// COMPOSANTS SIMULATEURS
// ============================================

// Convertisseur Allure ↔ Vitesse
const PaceConverter: React.FC = () => {
  const [mode, setMode] = useState<'paceToSpeed' | 'speedToPace'>('paceToSpeed');
  const [paceMin, setPaceMin] = useState(5);
  const [paceSec, setPaceSec] = useState(30);
  const [speed, setSpeed] = useState(10.9);

  const convertPaceToSpeed = (min: number, sec: number): number => {
    const totalMinutes = min + sec / 60;
    return totalMinutes > 0 ? Math.round((60 / totalMinutes) * 10) / 10 : 0;
  };

  const convertSpeedToPace = (kmh: number): { min: number; sec: number } => {
    if (kmh <= 0) return { min: 0, sec: 0 };
    const totalMinutes = 60 / kmh;
    const min = Math.floor(totalMinutes);
    const sec = Math.round((totalMinutes - min) * 60);
    return { min, sec: sec === 60 ? 0 : sec };
  };

  const handlePaceChange = (newMin: number, newSec: number) => {
    setPaceMin(newMin);
    setPaceSec(newSec);
    setSpeed(convertPaceToSpeed(newMin, newSec));
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    const pace = convertSpeedToPace(newSpeed);
    setPaceMin(pace.min);
    setPaceSec(pace.sec);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <RotateCcw className="text-blue-600" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Convertisseur Allure ↔ Vitesse</h3>
          <p className="text-sm text-slate-500">min/km vers km/h et inversement</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('paceToSpeed')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            mode === 'paceToSpeed'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          min/km → km/h
        </button>
        <button
          onClick={() => setMode('speedToPace')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
            mode === 'speedToPace'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          km/h → min/km
        </button>
      </div>

      {mode === 'paceToSpeed' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Allure (min/km)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={15}
                value={paceMin}
                onChange={(e) => handlePaceChange(parseInt(e.target.value) || 0, paceSec)}
                className="w-20 p-3 border rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-xl font-bold text-slate-400">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={paceSec}
                onChange={(e) => handlePaceChange(paceMin, parseInt(e.target.value) || 0)}
                className="w-20 p-3 border rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-500 font-medium">min/km</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-600 mb-1">Vitesse correspondante</p>
            <p className="text-3xl font-black text-blue-700">{speed} km/h</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Vitesse (km/h)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={4}
                max={25}
                step={0.1}
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value) || 0)}
                className="w-32 p-3 border rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-500 font-medium">km/h</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-600 mb-1">Allure correspondante</p>
            <p className="text-3xl font-black text-blue-700">
              {paceMin}:{paceSec.toString().padStart(2, '0')} min/km
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Calculateur VMA
const VMACalculator: React.FC = () => {
  const [testType, setTestType] = useState<'cooper' | 'demiCooper' | 'time'>('time');
  const [distance, setDistance] = useState(2400); // mètres
  const [raceDistance, setRaceDistance] = useState('5');
  const [raceTimeMin, setRaceTimeMin] = useState(22);
  const [raceTimeSec, setRaceTimeSec] = useState(0);

  const calculateVMA = useMemo(() => {
    if (testType === 'cooper') {
      // Test de Cooper : distance en 12 min → VMA ≈ distance / 200
      return Math.round((distance / 200) * 10) / 10;
    } else if (testType === 'demiCooper') {
      // Demi-Cooper : distance en 6 min → VMA ≈ distance / 100
      return Math.round((distance / 100) * 10) / 10;
    } else {
      // Calcul depuis un temps de course
      const totalMinutes = raceTimeMin + raceTimeSec / 60;
      if (totalMinutes <= 0) return 0;

      const distanceKm = parseFloat(raceDistance);
      const speedKmh = (distanceKm / totalMinutes) * 60;

      // Facteurs de correction selon la distance
      let vmaPct: number;
      switch (raceDistance) {
        case '5': vmaPct = 0.93; break;      // 5 km ≈ 93% VMA
        case '10': vmaPct = 0.88; break;     // 10 km ≈ 88% VMA
        case '21.1': vmaPct = 0.83; break;   // Semi ≈ 83% VMA
        case '42.195': vmaPct = 0.78; break; // Marathon ≈ 78% VMA
        default: vmaPct = 0.90;
      }

      return Math.round((speedKmh / vmaPct) * 10) / 10;
    }
  }, [testType, distance, raceDistance, raceTimeMin, raceTimeSec]);

  // Allures calculées depuis la VMA
  const paces = useMemo(() => {
    if (calculateVMA <= 0) return null;

    const vmaMinKm = 60 / calculateVMA;
    const formatPace = (minKm: number) => {
      const min = Math.floor(minKm);
      const sec = Math.round((minKm - min) * 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return {
      ef: formatPace(vmaMinKm / 0.67),        // EF = 67% VMA
      ea: formatPace(vmaMinKm / 0.77),        // EA = 77% VMA
      seuil: formatPace(vmaMinKm / 0.87),     // Seuil = 87% VMA
      vma: formatPace(vmaMinKm),              // VMA = 100%
      recovery: formatPace(vmaMinKm / 0.60),  // Récup = 60% VMA
    };
  }, [calculateVMA]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Zap className="text-red-600" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Calculateur VMA</h3>
          <p className="text-sm text-slate-500">Estimez votre VMA et vos allures</p>
        </div>
      </div>

      {/* Méthode */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Méthode de calcul</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTestType('time')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              testType === 'time' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Temps course
          </button>
          <button
            onClick={() => setTestType('cooper')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              testType === 'cooper' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Cooper (12')
          </button>
          <button
            onClick={() => setTestType('demiCooper')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              testType === 'demiCooper' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Demi-Cooper (6')
          </button>
        </div>
      </div>

      {/* Inputs selon méthode */}
      {testType === 'time' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Distance de course</label>
            <select
              value={raceDistance}
              onChange={(e) => setRaceDistance(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="21.1">Semi-marathon (21.1 km)</option>
              <option value="42.195">Marathon (42.195 km)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Temps réalisé</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={360}
                value={raceTimeMin}
                onChange={(e) => setRaceTimeMin(parseInt(e.target.value) || 0)}
                className="w-20 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-red-500 outline-none"
              />
              <span className="text-slate-500">min</span>
              <input
                type="number"
                min={0}
                max={59}
                value={raceTimeSec}
                onChange={(e) => setRaceTimeSec(parseInt(e.target.value) || 0)}
                className="w-20 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-red-500 outline-none"
              />
              <span className="text-slate-500">sec</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Distance parcourue en {testType === 'cooper' ? '12' : '6'} minutes (mètres)
          </label>
          <input
            type="number"
            min={800}
            max={4000}
            step={50}
            value={distance}
            onChange={(e) => setDistance(parseInt(e.target.value) || 0)}
            className="w-full p-3 border rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>
      )}

      {/* Résultat VMA */}
      <div className="mt-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white text-center">
        <p className="text-sm opacity-90 mb-1">VMA estimée</p>
        <p className="text-4xl font-black">{calculateVMA} km/h</p>
      </div>

      {/* Allures dérivées */}
      {paces && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 font-medium">EF (67%)</p>
            <p className="font-bold text-green-800">{paces.ef} /km</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-600 font-medium">EA (77%)</p>
            <p className="font-bold text-yellow-800">{paces.ea} /km</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 font-medium">Seuil (87%)</p>
            <p className="font-bold text-orange-800">{paces.seuil} /km</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 font-medium">VMA (100%)</p>
            <p className="font-bold text-red-800">{paces.vma} /km</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Prédicteur de temps / Calculateur objectif
const RacePredictor: React.FC = () => {
  const [mode, setMode] = useState<'timeToTarget' | 'targetToTime'>('timeToTarget');

  // Mode 1 : Je connais mon temps, prédire autres distances
  const [knownDistance, setKnownDistance] = useState('10');
  const [knownTimeMin, setKnownTimeMin] = useState(45);
  const [knownTimeSec, setKnownTimeSec] = useState(0);

  // Mode 2 : Je veux un temps, quelle allure ?
  const [targetDistance, setTargetDistance] = useState('42.195');
  const [targetTimeHours, setTargetTimeHours] = useState(3);
  const [targetTimeMin, setTargetTimeMin] = useState(30);

  const DISTANCES = [
    { value: '5', label: '5 km' },
    { value: '10', label: '10 km' },
    { value: '21.1', label: 'Semi-marathon' },
    { value: '42.195', label: 'Marathon' },
  ];

  // Prédiction avec formule de Riegel : T2 = T1 * (D2/D1)^1.06
  const predictTime = (time1Sec: number, dist1: number, dist2: number): number => {
    return time1Sec * Math.pow(dist2 / dist1, 1.06);
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}h${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}'${seconds.toString().padStart(2, '0')}`;
  };

  const predictions = useMemo(() => {
    const knownTimeSecs = knownTimeMin * 60 + knownTimeSec;
    const knownDist = parseFloat(knownDistance);

    return DISTANCES.map(d => {
      const dist = parseFloat(d.value);
      const predictedSecs = predictTime(knownTimeSecs, knownDist, dist);
      const pacePerKm = predictedSecs / dist;
      const paceMin = Math.floor(pacePerKm / 60);
      const paceSec = Math.round(pacePerKm % 60);

      return {
        ...d,
        time: formatTime(predictedSecs),
        pace: `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`
      };
    });
  }, [knownDistance, knownTimeMin, knownTimeSec]);

  const targetPace = useMemo(() => {
    const totalMinutes = targetTimeHours * 60 + targetTimeMin;
    const dist = parseFloat(targetDistance);
    const pacePerKm = totalMinutes / dist;
    const paceMin = Math.floor(pacePerKm);
    const paceSec = Math.round((pacePerKm - paceMin) * 60);
    const speedKmh = Math.round((dist / totalMinutes) * 60 * 10) / 10;

    return {
      pace: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
      speed: speedKmh
    };
  }, [targetDistance, targetTimeHours, targetTimeMin]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Target className="text-purple-600" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Prédicteur & Objectifs</h3>
          <p className="text-sm text-slate-500">Estimez vos temps ou calculez votre allure cible</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('timeToTarget')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            mode === 'timeToTarget' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Prédire mes temps
        </button>
        <button
          onClick={() => setMode('targetToTime')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            mode === 'targetToTime' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Calculer mon allure
        </button>
      </div>

      {mode === 'timeToTarget' ? (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Je connais mon temps sur</label>
              <select
                value={knownDistance}
                onChange={(e) => setKnownDistance(e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {DISTANCES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Temps réalisé</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={360}
                  value={knownTimeMin}
                  onChange={(e) => setKnownTimeMin(parseInt(e.target.value) || 0)}
                  className="w-20 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-slate-500">min</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={knownTimeSec}
                  onChange={(e) => setKnownTimeSec(parseInt(e.target.value) || 0)}
                  className="w-20 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-slate-500">sec</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-700 mb-3">Temps estimés sur autres distances</p>
            {predictions.map(pred => (
              <div
                key={pred.value}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  pred.value === knownDistance ? 'bg-purple-100 border-2 border-purple-300' : 'bg-slate-50'
                }`}
              >
                <span className="font-medium text-slate-700">{pred.label}</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{pred.time}</span>
                  <span className="text-xs text-slate-500 ml-2">({pred.pace})</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Distance visée</label>
              <select
                value={targetDistance}
                onChange={(e) => setTargetDistance(e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {DISTANCES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Temps objectif</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={targetTimeHours}
                  onChange={(e) => setTargetTimeHours(parseInt(e.target.value) || 0)}
                  className="w-16 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-slate-500">h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={targetTimeMin}
                  onChange={(e) => setTargetTimeMin(parseInt(e.target.value) || 0)}
                  className="w-16 p-3 border rounded-xl text-center font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-slate-500">min</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
            <p className="text-sm opacity-90 mb-2">Pour atteindre cet objectif, vous devez courir à :</p>
            <div className="flex items-end justify-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-black">{targetPace.pace}</p>
                <p className="text-xs opacity-75">min/km</p>
              </div>
              <div className="text-2xl font-light opacity-50">=</div>
              <div className="text-center">
                <p className="text-4xl font-black">{targetPace.speed}</p>
                <p className="text-xs opacity-75">km/h</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'definitions' | 'simulateurs'>('definitions');

  const filteredDefinitions = useMemo(() => {
    return DEFINITIONS.filter(def => {
      const matchesSearch = def.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           def.shortDef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Helmet>
        <meta name="description" content="Glossaire running complet : VMA, fartlek, fractionné, seuil, D+... Toutes les définitions pour comprendre l'entraînement course à pied." />
      </Helmet>
      {/* Hero */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Lexique Running</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Toutes les définitions et outils pour comprendre l'entraînement running
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2 inline-flex gap-2">
          <button
            onClick={() => setActiveTab('definitions')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'definitions'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Book size={18} /> Définitions
          </button>
          <button
            onClick={() => setActiveTab('simulateurs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'simulateurs'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator size={18} /> Simulateurs
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {activeTab === 'definitions' ? (
          <>
            {/* Search & Filters */}
            <div className="mb-8 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un terme (VMA, seuil, fractionné...)"
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent/50 outline-none text-lg"
                />
              </div>

              {/* Categories */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Definitions List */}
            <div className="space-y-3">
              {filteredDefinitions.map(def => (
                <div
                  key={def.term}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all hover:shadow-md"
                >
                  <button
                    onClick={() => setExpandedTerm(expandedTerm === def.term ? null : def.term)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        {def.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{def.term}</h3>
                        <p className="text-sm text-slate-500">{def.shortDef}</p>
                      </div>
                    </div>
                    {expandedTerm === def.term ? (
                      <ChevronUp className="text-slate-400" size={20} />
                    ) : (
                      <ChevronDown className="text-slate-400" size={20} />
                    )}
                  </button>

                  {expandedTerm === def.term && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <p className="text-slate-600 leading-relaxed mt-4">
                        {def.fullDef}
                      </p>
                      {def.relatedTerms && (
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-400">Termes liés :</span>
                          {def.relatedTerms.map(term => (
                            <span
                              key={term}
                              className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {filteredDefinitions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">Aucun terme trouvé pour "{searchTerm}"</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Simulateurs */
          <div className="grid md:grid-cols-2 gap-6">
            <PaceConverter />
            <VMACalculator />
            <div className="md:col-span-2">
              <RacePredictor />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-accent/10 to-orange-100 rounded-3xl p-10">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Prêt à mettre en pratique ?
          </h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Créez votre plan d'entraînement personnalisé avec notre coach IA. Vos allures seront calculées automatiquement !
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-accent text-white px-8 py-4 rounded-full font-bold hover:bg-orange-600 transition-colors shadow-lg"
          >
            Créer mon plan gratuit
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GlossaryPage;
