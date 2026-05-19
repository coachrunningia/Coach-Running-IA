/**
 * Marathon doctrine — bibliothèque coach 20 ans validée.
 * Sources : Daniels (Running Formula 4th ed.), Pfitzinger (Advanced Marathoning 3rd ed.),
 *           Hammond (Endurance Masters 2018), Magness (Science of Running),
 *           Lydiard (Running to the Top).
 * Validation : PM 10 ans + Coach FFA 20 ans + Dev senior (2026-05-19).
 * Doctrine produit : feedback_qualite_avant_vitesse + feedback_chaque_ligne_justifiee.
 */

export type DoctrinePattern = {
  name: string;
  description: string;
  format: string;
  distance: { min: number; max: number };
  paceType: 'MP' | 'EF' | 'EA' | 'SEUIL' | 'VMA' | 'MIXTE' | 'STRIDES';
  phase: Array<'fondamental' | 'developpement' | 'specifique' | 'affutage' | 'recuperation'>;
  levels: Array<'Débutant' | 'Régulier' | 'Confirmé' | 'Expert'>;
  excludeLevels?: Array<'Débutant' | 'Régulier' | 'Confirmé' | 'Expert'>;
  example: string;
  maxPerCycle?: number;
  neverConsecutive?: boolean;
  minSpacingWeeks?: number;
};

/**
 * Patterns Marathon validés. Tous applicables aux niveaux Régulier+ minimum.
 * MP = Marathon Pace (allure spécifique marathon, ~80% VMA).
 */
export const MARATHON_PATTERNS: DoctrinePattern[] = [
  {
    name: 'MP-LR',
    description: 'Marathon-Pace Long Run — clé du plan (Pfitzinger). Bloc à allure marathon en milieu de SL.',
    format: '8-10 km EF + bloc continu MP (12-26 km selon phase) + 2-4 km retour EF',
    distance: { min: 24, max: 35 },
    paceType: 'MP',
    phase: ['specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '6 km EF + 22 km @ MP + 2 km récup = 30 km total',
    maxPerCycle: 3,
    neverConsecutive: true,
    minSpacingWeeks: 2,
  },
  {
    name: 'MLR',
    description: 'Medium Long Run — 2e long run de la semaine en milieu de cycle (Pfitzinger).',
    format: '14-22 km EF continu, sans bloc qualité',
    distance: { min: 14, max: 22 },
    paceType: 'EF',
    phase: ['developpement', 'specifique'],
    levels: ['Confirmé', 'Expert'],
    excludeLevels: ['Débutant', 'Régulier'],
    example: '18 km EF en milieu de semaine (mercredi typique) + SL le dimanche',
    maxPerCycle: 6,
  },
  {
    name: 'LT-CRUISE',
    description: 'Lactate Threshold Cruise intervals (Daniels) — séance seuil par fractions de 1.5-2.5 km.',
    format: 'Échauffement 15 min + 3-5 × 1.5-2.5 km @ seuil (récup 1-2 min trot) + retour 10 min',
    distance: { min: 12, max: 18 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 4 × 2 km @ seuil (4:42/km) r=90s trot + 10 min EF',
    maxPerCycle: 4,
    neverConsecutive: false,
  },
  {
    name: 'TEMPO',
    description: 'Tempo continu seuil (Daniels) — 20-40 min continu à allure seuil.',
    format: 'Échauffement 15 min + 20-40 min continu @ seuil + retour 10 min',
    distance: { min: 10, max: 16 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 30 min @ seuil + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'VO2-LONG',
    description: 'VO2max intervals longs (Daniels) — répétitions 3-5 min à allure VMA pour stimuler le débit cardiaque.',
    format: 'Échauffement 15 min + 4-6 × 3-5 min @ VMA (récup égale en durée) + retour 10 min',
    distance: { min: 10, max: 14 },
    paceType: 'VMA',
    phase: ['developpement'],
    levels: ['Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '15 min EF + 5 × 4 min @ VMA (4:17/km) r=4 min trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LR-PROG',
    description: 'Long Run progressif — SL démarrée EF, finie 5-10 km @ MP.',
    format: '20-30 km EF + 5-10 km en progression jusqu à MP',
    distance: { min: 25, max: 35 },
    paceType: 'MIXTE',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '24 km EF puis 8 km en accélération progressive (EF → MP)',
    maxPerCycle: 4,
    minSpacingWeeks: 2,
  },
  {
    name: 'LR-EF',
    description: 'Long Run EF pur — SL classique 100% endurance fondamentale (Lydiard, base aérobie).',
    format: 'Continu en EF stricte, conversation possible',
    distance: { min: 18, max: 32 },
    paceType: 'EF',
    phase: ['fondamental', 'developpement', 'specifique', 'recuperation'],
    levels: ['Débutant', 'Régulier', 'Confirmé', 'Expert'],
    example: '24 km en EF (5:40/km), aisance respiratoire totale',
    maxPerCycle: 99,
  },
  {
    name: '10K-TUNE-UP',
    description: 'Course de préparation 10K à 4-5 semaines de la course objectif (Daniels, Pfitzinger).',
    format: 'Échauffement 20 min + 10 km en compétition + retour 10 min',
    distance: { min: 14, max: 18 },
    paceType: 'MIXTE',
    phase: ['specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '20 min EF + 10 km @ allure 10K (~4:35/km) + 10 min retour',
    maxPerCycle: 1,
  },
];

/**
 * Règles globales Marathon (séquencement, espacement, ratio 80/20).
 */
export const MARATHON_RULES = {
  /** Séquence type 4 semaines en phase spécifique (Pfitzinger). */
  sequence4WeeksSpecifique: 'S1 MP-LR / S2 LR-PROG / S3 MP-LR / S4 décharge LR-EF',
  /** Variation minimale sur 4 semaines glissantes (anti-monotonie). */
  minDifferentPatternsOver4Weeks: 3,
  /** Ratio Seiler 80/20 polarisé. */
  quality8020Seiler: '80% EF / 20% qualité (seuil + VMA + MP)',
  /** Minimum 72h entre 2 séances dures (Pfitzinger). */
  minRecoveryBetweenHardSessions: 72,
  /** Pic SL au moins 3 semaines avant la course. */
  peakLrWeeksBeforeRace: 3,
};

/**
 * Affûtage Marathon canonique (Pfitzinger Chapter 7).
 * S-3 = 3 semaines avant la course, S-2 = 2 semaines avant, S-1 = semaine course.
 * volPct = pourcentage du volume pic.
 */
export const MARATHON_TAPER = {
  Sminus3: { volPct: 80, sl: '24-28 km dont 5-8 km MP final', focus: 'Dernière SL volumineuse, dernière vraie séance qualité.' },
  Sminus2: { volPct: 65, sl: '18-22 km EF + 4 km MP final', focus: 'Réduction nette du volume, maintien intensité courte.' },
  Sminus1: { volPct: 45, sl: 'aucune SL — la course REMPLACE la SL', focus: 'Footings courts uniquement, 1 rappel 200-400m allure MP, REPOS J-1 et J-2.' },
};

/**
 * Construit le bloc texte à injecter dans le prompt LLM pour les plans Marathon.
 * @param data — questionnaireData (level, frequency, raceDate, currentWeeklyVolume)
 * @param paces — TrainingPaces (allure spé Marathon notamment)
 * @param ctx — contexte (phase actuelle, semaine ciblée, etc.)
 */
export const buildMarathonPromptBlock = (data: any, paces: any, _ctx?: any): string => {
  const level = (data?.level || '').replace(/\s*\([^)]+\)/, '').trim(); // "Débutant (0-1 an)" → "Débutant"
  const isAdvanced = ['Régulier', 'Confirmé', 'Expert'].some(l => level.includes(l));
  const mpPace = paces?.allureSpecifiqueMarathon || '?';
  const seuilPace = paces?.seuilPace || '?';
  const vmaPace = paces?.vmaPace || '?';
  const efPace = paces?.efPace || '?';

  // Débutant Marathon : restriction stricte → pas de MP-LR, pas de VO2-LONG.
  if (!isAdvanced) {
    return `📚 BIBLIOTHÈQUE COACH MARATHON — niveau ${level || 'Débutant'} :
- Phase fondamentale : LR-EF uniquement (SL continue 18-24 km @ EF ${efPace}).
- Phase développement : LR-EF + 1 séance qualité légère type Fartlek doux ou côtes courtes.
- Phase spécifique : LR-EF (max 28 km) + 1 rappel allure MP (${mpPace}) sur 5-8 km en fin de SL toutes les 2 semaines.
- Phase affûtage : footings courts EF, repos J-1 et J-2.
- INTERDIT pour ce niveau : MP-LR > 28 km, VO2-LONG, LR-PROG > 30 km, 10K-TUNE-UP.
- Variété : alterner format SL semaine (continu / progressif léger / rythmé final).`;
  }

  // Niveau intermédiaire/avancé : bibliothèque complète.
  const patternsList = MARATHON_PATTERNS
    .filter(p => !p.excludeLevels?.some(l => level.includes(l)))
    .map(p => `  • ${p.name} — ${p.description} | Format : ${p.format} | Distance : ${p.distance.min}-${p.distance.max} km | Phases : ${p.phase.join(', ')}`)
    .join('\n');

  return `📚 BIBLIOTHÈQUE COACH MARATHON (20 ans validée) — niveau ${level} :

PATTERNS DISPONIBLES (sources : Daniels, Pfitzinger, Lydiard) :
${patternsList}

RÈGLES DE SÉQUENCEMENT (anti-monotonie) :
- ${MARATHON_RULES.sequence4WeeksSpecifique}
- ${MARATHON_RULES.minDifferentPatternsOver4Weeks} patterns DIFFÉRENTS minimum sur 4 semaines glissantes.
- Ratio Seiler ${MARATHON_RULES.quality8020Seiler} sur l'ensemble du cycle.
- Minimum ${MARATHON_RULES.minRecoveryBetweenHardSessions}h entre 2 séances DURES (MP-LR, LT-CRUISE, VO2-LONG).
- JAMAIS 2 SL MP-LR consécutives — espacer de ${MARATHON_PATTERNS.find(p => p.name === 'MP-LR')!.minSpacingWeeks} semaines minimum.
- Pic SL placé ≥ ${MARATHON_RULES.peakLrWeeksBeforeRace} semaines avant le raceDate.

ALLURES À UTILISER EXACTEMENT (jamais inventer) :
- EF : ${efPace}/km
- MP (allure marathon) : ${mpPace}/km
- Seuil : ${seuilPace}/km
- VMA : ${vmaPace}/km

AFFÛTAGE MARATHON (3 semaines avant la course) :
- S-3 (3 sem avant) : ${MARATHON_TAPER.Sminus3.volPct}% du volume pic. ${MARATHON_TAPER.Sminus3.sl}.
- S-2 (2 sem avant) : ${MARATHON_TAPER.Sminus2.volPct}% du volume pic. ${MARATHON_TAPER.Sminus2.sl}.
- S-1 (semaine course) : ${MARATHON_TAPER.Sminus1.volPct}% du volume pic. ${MARATHON_TAPER.Sminus1.sl}.`;
};
