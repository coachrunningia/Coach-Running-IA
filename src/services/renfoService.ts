/**
 * Service de renforcement musculaire -- Generation deterministe des seances
 * Remplace la bibliotheque d'exercices qui etait dans le prompt Gemini
 */

import type { Session } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Exercise {
  name: string;
  sets: string; // e.g. "3x15" or "3x30s"
}

interface ExerciseFamily {
  name: string;
  exercises: Exercise[];
}

// ---------------------------------------------------------------------------
// Exercise database organized by family and discipline
// ---------------------------------------------------------------------------

const ROUTE_EXERCISES: ExerciseFamily[] = [
  {
    name: 'QUADRICEPS/FESSIERS',
    exercises: [
      { name: 'Squats poids de corps', sets: '3x15' },
      { name: 'Squat bulgare', sets: '3x10/jambe' },
      { name: 'Fentes avant', sets: '3x10/jambe' },
      { name: 'Fentes marchees', sets: '3x12/jambe' },
      { name: 'Step-up sur marche', sets: '3x10/jambe' },
      { name: 'Hip thrust', sets: '3x15' },
      { name: 'Pont unipodal', sets: '3x10/jambe' },
      { name: 'Chaise murale', sets: '3x30-45s' },
    ],
  },
  {
    name: 'STABILITE HANCHE',
    exercises: [
      { name: 'Clamshell avec elastique', sets: '3x15/cote' },
      { name: 'Marche laterale avec elastique', sets: '3x10 pas/cote' },
      { name: 'Fente laterale', sets: '3x10/jambe' },
      { name: 'Equilibre unipodal', sets: '2x30s/pied' },
    ],
  },
  {
    name: 'MOLLETS/PIEDS',
    exercises: [
      { name: 'Extensions mollets debout', sets: '3x20' },
      { name: 'Mollets assis (soleaire)', sets: '3x15' },
      { name: 'Marche sur talons', sets: '2x20m' },
      { name: 'Marche sur pointes', sets: '2x20m' },
    ],
  },
  {
    name: 'GAINAGE',
    exercises: [
      { name: 'Gainage ventral', sets: '3x30-60s' },
      { name: 'Gainage lateral', sets: '3x20-30s/cote' },
      { name: 'Dead bug', sets: '3x10/cote' },
      { name: 'Bird-dog', sets: '3x10/cote' },
      { name: 'Superman', sets: '3x12' },
      { name: 'Pompes', sets: '3x10' },
    ],
  },
];

// Trail-specific additional exercises
const TRAIL_EXERCISES: ExerciseFamily[] = [
  {
    name: 'EXCENTRIQUE QUADRICEPS',
    exercises: [
      { name: 'Squat excentrique (descente 4s)', sets: '3x10' },
      { name: 'Step-down excentrique', sets: '3x8/jambe' },
      { name: 'Fente arriere lente (3s)', sets: '3x10/jambe' },
      { name: 'Chaise murale longue', sets: '3x45-90s' },
    ],
  },
  {
    name: 'PROPRIOCEPTION',
    exercises: [
      { name: 'Equilibre unipodal yeux fermes', sets: '3x20-30s/pied' },
      { name: 'Equilibre sur coussin instable', sets: '3x30s/pied' },
      { name: 'Sauts directionnels', sets: '3x8' },
      { name: 'Corde a sauter', sets: '3x1min' },
    ],
  },
  {
    name: 'MOLLETS MONTEE',
    exercises: [
      { name: 'Mollets debout unipodal', sets: '3x12/jambe' },
      { name: 'Mollets assis soleaire', sets: '3x15' },
      { name: 'Protocole Stanish excentrique', sets: '3x10' },
    ],
  },
  {
    name: 'GAINAGE ROTATION',
    exercises: [
      { name: 'Planche + rotation laterale', sets: '3x10/cote' },
      { name: 'Russian twist', sets: '3x15/cote' },
      { name: 'Bird-dog avec rotation', sets: '3x10/cote' },
    ],
  },
  {
    name: 'PLIOMETRIE TRAIL',
    exercises: [
      { name: 'Sauts directionnels multi-axes', sets: '3x8' },
      { name: 'Corde a sauter variee', sets: '3x1min' },
      { name: 'Box jumps ou sauts sur banc', sets: '3x8' },
      { name: 'Nordic hamstring curl', sets: '3x6' },
    ],
  },
];

// Ultra-trail additional exercises (force-endurance + upper body for poles)
const ULTRA_EXERCISES: Exercise[] = [
  { name: 'Pompes', sets: '3x15' },
  { name: 'Dips sur banc', sets: '3x12' },
  { name: 'Tirage elastique horizontal', sets: '3x15' },
  { name: 'Extension triceps avec elastique', sets: '3x12' },
  { name: 'Gainage avec sac leste', sets: '3x45s' },
  { name: 'Dead bug haute repetition', sets: '3x20' },
  { name: 'Chaise murale prolongee', sets: '3x90-120s' },
];

// Injury prevention exercises by category
const POSTERIOR_CHAIN_PREVENTION: Exercise[] = [
  { name: 'Nordic hamstring curl (ou variante assise)', sets: '3x6' },
  { name: 'Pont fessier unipodal (tenu 3s en haut)', sets: '3x10/jambe' },
  { name: 'Deadlift roumain unipodal poids de corps', sets: '3x8/jambe' },
  { name: 'Étirement actif ischio (allongé, jambe tendue)', sets: '2x20s/jambe' },
  { name: 'Good morning poids de corps', sets: '3x12' },
  { name: 'Glissade talon au sol (hamstring slide)', sets: '3x8/jambe' },
];

const KNEE_PREVENTION: Exercise[] = [
  { name: 'Quart de squat isométrique (mur)', sets: '3x30s' },
  { name: 'Step-down excentrique lent', sets: '3x8/jambe' },
  { name: 'Pont fessier (activation VMO)', sets: '3x15' },
  { name: 'Clamshell avec élastique', sets: '3x15/côté' },
  { name: 'Marche latérale élastique', sets: '3x10 pas/côté' },
  { name: 'Étirement bandelette IT (rouleau)', sets: '2x30s/côté' },
];

const BACK_PREVENTION: Exercise[] = [
  { name: 'Cat-cow (mobilité dos)', sets: '2x10' },
  { name: 'Bird-dog (contrôle lombaire)', sets: '3x10/côté' },
  { name: 'Pont fessier (décharge lombaire)', sets: '3x15' },
  { name: 'Dead bug (gainage profond)', sets: '3x10/côté' },
  { name: 'Étirement psoas (fente basse)', sets: '2x30s/côté' },
  { name: 'Superman partiel (bras seuls)', sets: '3x10' },
];

const ANKLE_PREVENTION: Exercise[] = [
  { name: 'Mobilité cheville (genou au mur)', sets: '2x15/pied' },
  { name: 'Équilibre unipodal yeux fermés', sets: '3x20s/pied' },
  { name: 'Mollets excentrique (descente lente 4s)', sets: '3x10' },
  { name: 'Écriture alphabet avec le pied', sets: '1x/pied' },
  { name: 'Marche sur pointes + talons', sets: '2x20m chaque' },
];

// Perte de poids metabolic exercises
const METABOLIC_EXERCISES: Exercise[] = [
  { name: 'Burpees adaptes', sets: '3x10' },
  { name: 'Jumping jacks', sets: '3x30s' },
  { name: 'Montees de genoux', sets: '3x20' },
  { name: 'Mountain climbers', sets: '3x20' },
  { name: 'Squats sautes', sets: '3x12' },
  { name: 'Fentes sautees alternees', sets: '3x10/jambe' },
  { name: 'Pompes', sets: '3x10' },
  { name: 'Gainage dynamique avec rotation', sets: '3x10/cote' },
  { name: 'Planche + tirage', sets: '3x10/cote' },
];

// Maintien en forme / general fitness extras
const FITNESS_EXERCISES: Exercise[] = [
  { name: 'Etirements dynamiques', sets: '2x8/cote' },
  { name: 'Mobilite hanche (cercles)', sets: '2x10/cote' },
  { name: 'Chat-vache (mobilite dos)', sets: '2x10' },
  { name: 'Fente + rotation tronc', sets: '2x8/cote' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic pick of `count` exercises from a list, rotating based on weekNumber.
 * Uses modulo to ensure different exercises each week while staying deterministic.
 */
function pickExercises(exercises: Exercise[], count: number, weekNumber: number): Exercise[] {
  if (exercises.length === 0) return [];
  const n = Math.min(count, exercises.length);
  const offset = (weekNumber - 1) % exercises.length;
  const picked: Exercise[] = [];
  for (let i = 0; i < n; i++) {
    picked.push(exercises[(offset + i) % exercises.length]);
  }
  return picked;
}

/**
 * Scale sets string for level / phase adjustments.
 * - factor < 1 => reduce volume (affutage, beginner)
 * - factor > 1 => increase volume (expert)
 * Returns the modified sets string.
 */
function scaleSets(sets: string, factor: number): string {
  // Match patterns like "3x15", "3x10/jambe", "3x30-60s", "2x20m", "3x1min"
  return sets.replace(/(\d+)x(\d+)/, (_match, s, r) => {
    const reps = Math.max(1, Math.round(parseInt(r, 10) * factor));
    return `${s}x${reps}`;
  });
}

function getLevelFactor(level: string): number {
  if (level.includes('Debutant') || level.includes('Débutant')) return 0.7;
  if (level.includes('Intermediaire') || level.includes('Intermédiaire')) return 1.0;
  if (level.includes('Confirme') || level.includes('Confirmé')) return 1.15;
  if (level.includes('Expert')) return 1.3;
  return 1.0;
}

function getPhaseFactor(phase: string): number {
  switch (phase) {
    case 'fondamental': return 0.9; // moderate, focus technique
    case 'developpement': return 1.0;
    case 'specifique': return 1.1; // higher intensity
    case 'affutage': return 0.65; // -35% volume
    case 'recuperation': return 0.6; // -40% volume
    default: return 1.0;
  }
}

function getDuration(level: string): string {
  if (level.includes('Debutant') || level.includes('Débutant')) return '30 min';
  if (level.includes('Intermediaire') || level.includes('Intermédiaire')) return '35-40 min';
  return '40-45 min';
}

function getRestBetweenTours(level: string, goal: string): string {
  if (goal === 'Perte de poids') return '30s';
  if (level.includes('Debutant') || level.includes('Débutant')) return '2 min';
  if (level.includes('Expert')) return '1 min';
  return '1 min 30';
}

function getTours(level: string, goal: string, phase: string): number {
  let tours = 3;
  if (goal === 'Perte de poids') tours = 4;
  if (level.includes('Debutant') || level.includes('Débutant')) tours = 2;
  if (level.includes('Expert')) tours = 4;
  if (phase === 'affutage' || phase === 'recuperation') tours = Math.max(2, tours - 1);
  return tours;
}

// ---------------------------------------------------------------------------
// Focus A / Focus B family selectors
// ---------------------------------------------------------------------------

/**
 * Focus A (odd weeks): quadriceps-dominant + gainage frontal + mollets debout
 * Focus B (even weeks): fessiers/hanches + gainage lateral/rotation + mollets assis
 */
function getFocusAFamilies(routeFamilies: ExerciseFamily[]): {
  primary: ExerciseFamily;
  gainage: Exercise[];
  mollets: Exercise[];
} {
  const quadFamily = routeFamilies.find(f => f.name === 'QUADRICEPS/FESSIERS')!;
  const gainageFamily = routeFamilies.find(f => f.name === 'GAINAGE')!;
  const molletsFamily = routeFamilies.find(f => f.name === 'MOLLETS/PIEDS')!;

  // Focus A quad exercises: first half of the list (squats, fentes, step-up, chaise)
  const quadExercises: Exercise[] = quadFamily.exercises.filter(e =>
    !e.name.includes('Hip thrust') &&
    !e.name.includes('Pont unipodal'),
  );
  const primaryA: ExerciseFamily = { name: quadFamily.name, exercises: quadExercises };

  // Focus A gainage: ventral-oriented (ventral, dead bug, superman, pompes)
  const gainageA = gainageFamily.exercises.filter(e =>
    e.name.includes('ventral') ||
    e.name.includes('Dead bug') ||
    e.name.includes('Superman') ||
    e.name.includes('Pompes'),
  );

  // Focus A mollets: debout
  const molletsA = molletsFamily.exercises.filter(e =>
    e.name.includes('debout') || e.name.includes('pointes'),
  );

  return { primary: primaryA, gainage: gainageA, mollets: molletsA };
}

function getFocusBFamilies(routeFamilies: ExerciseFamily[]): {
  primary: ExerciseFamily;
  gainage: Exercise[];
  mollets: Exercise[];
} {
  const quadFamily = routeFamilies.find(f => f.name === 'QUADRICEPS/FESSIERS')!;
  const stabFamily = routeFamilies.find(f => f.name === 'STABILITE HANCHE')!;
  const gainageFamily = routeFamilies.find(f => f.name === 'GAINAGE')!;
  const molletsFamily = routeFamilies.find(f => f.name === 'MOLLETS/PIEDS')!;

  // Focus B: hip thrust + pont unipodal + all stability exercises
  const hipExercises = quadFamily.exercises.filter(e =>
    e.name.includes('Hip thrust') || e.name.includes('Pont unipodal'),
  );
  const primaryB: ExerciseFamily = {
    name: 'FESSIERS/HANCHES',
    exercises: [...hipExercises, ...stabFamily.exercises],
  };

  // Focus B gainage: lateral-oriented
  const gainageB = gainageFamily.exercises.filter(e =>
    e.name.includes('lateral') || e.name.includes('Bird-dog'),
  );

  // Focus B mollets: assis + talons
  const molletsB = molletsFamily.exercises.filter(e =>
    e.name.includes('assis') || e.name.includes('talons'),
  );

  return { primary: primaryB, gainage: gainageB, mollets: molletsB };
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildRenfoMainSet(params: {
  weekNumber: number;
  goal: string;
  subGoal?: string;
  trailDistance?: number;
  level: string;
  phase: string;
  weight?: number;
  height?: number;
  injuries?: { hasInjury?: boolean; description?: string };
}): { mainSet: string; warmup: string; cooldown: string; duration: string; title: string } {
  const { weekNumber, goal, subGoal, trailDistance, level, phase, weight, height, injuries } = params;

  // Calcul IMC pour adapter les exercices (protection articulaire si surpoids)
  const bmi = (weight && height && height > 0) ? weight / ((height / 100) ** 2) : 0;
  const isOverweight = bmi >= 28; // IMC ≥ 28 = surpoids significatif → adapter

  // Détection blessures par catégorie → adapter exercices + prévention ciblée
  const injuryDesc = (injuries?.description || '').toLowerCase();
  const hasInjury = !!(injuries?.hasInjury);

  const hasPosteriorChainInjury = hasInjury && (
    injuryDesc.includes('ischio') || injuryDesc.includes('hamstring') ||
    injuryDesc.includes('posterieur') || injuryDesc.includes('postérieur') ||
    injuryDesc.includes('cuisse arriere') || injuryDesc.includes('cuisse arrière') ||
    injuryDesc.includes('chaine posterieur') || injuryDesc.includes('chaîne postérieur') ||
    injuryDesc.includes('fessier') || injuryDesc.includes('sciatique')
  );

  const hasKneeInjury = hasInjury && (
    injuryDesc.includes('genou') || injuryDesc.includes('genoux') ||
    injuryDesc.includes('rotule') || injuryDesc.includes('ménisque') || injuryDesc.includes('menisque') ||
    injuryDesc.includes('ligament croisé') || injuryDesc.includes('knee') ||
    injuryDesc.includes('bandelette') || injuryDesc.includes('syndrome essuie')
  );

  const hasBackInjury = hasInjury && (
    injuryDesc.includes('dos') || injuryDesc.includes('lombaire') || injuryDesc.includes('lombalgie') ||
    injuryDesc.includes('hernie') || injuryDesc.includes('sciatique') ||
    injuryDesc.includes('back') || injuryDesc.includes('vertebr')
  );

  const hasAnkleInjury = hasInjury && (
    injuryDesc.includes('cheville') || injuryDesc.includes('achille') ||
    injuryDesc.includes('tendon') || injuryDesc.includes('tendinite') ||
    injuryDesc.includes('périoste') || injuryDesc.includes('periostite') ||
    injuryDesc.includes('fasci') || injuryDesc.includes('aponévrose') ||
    injuryDesc.includes('ankle') || injuryDesc.includes('shin')
  );

  const hasHipInjury = hasInjury && (
    injuryDesc.includes('hanche') || injuryDesc.includes('hip') ||
    injuryDesc.includes('tendineu') || injuryDesc.includes('tendinopathie')
  );

  const hasJointInjury = hasKneeInjury || hasAnkleInjury || hasHipInjury || (hasInjury && (
    injuryDesc.includes('articul') || injuryDesc.includes('statique')
  ));
  const hasAnySpecificInjury = hasPosteriorChainInjury || hasKneeInjury || hasBackInjury || hasAnkleInjury;
  const needsLowImpact = isOverweight || hasJointInjury;

  const isOddWeek = weekNumber % 2 === 1;
  const levelFactor = getLevelFactor(level);
  const phaseFactor = getPhaseFactor(phase);
  const combinedFactor = levelFactor * phaseFactor;
  const tours = getTours(level, goal, phase);
  const rest = getRestBetweenTours(level, goal);

  const warmup = needsLowImpact
    ? '10 min de mobilité articulaire douce et échauffement progressif (marche rapide, rotations, pas chassés)'
    : hasPosteriorChainInjury
    ? '10-15 min d\'échauffement progressif : marche rapide, montées de genoux douces, activation fessiers (ponts au sol), étirements dynamiques ischio-jambiers'
    : '10 min de mobilité articulaire et échauffement dynamique';
  let cooldown = '5 min d\'étirements : quadriceps, ischio-jambiers, mollets, hanches';
  if (hasPosteriorChainInjury) {
    cooldown = '8-10 min d\'étirements ciblés : ischio-jambiers (30s×2/jambe), fessiers (piriforme 30s×2), mollets (30s×2), psoas (30s×2). Automassage rouleau chaîne postérieure si disponible.';
  } else if (hasKneeInjury) {
    cooldown = '8 min d\'étirements : quadriceps (30s×2/jambe), bandelette IT (rouleau, 30s/côté), mollets, mobilité rotule en flexion douce.';
  } else if (hasBackInjury) {
    cooldown = '8 min d\'étirements : psoas (fente basse 30s×2), piriforme, cat-cow (10 reps), étirement dos allongé.';
  } else if (hasAnkleInjury) {
    cooldown = '8 min : mobilité cheville (genou au mur 15×2), étirements mollets + soléaire, automassage voûte plantaire (balle).';
  }
  const duration = getDuration(level);

  // -----------------------------------------------------------------------
  // Perte de poids: circuit adapté (doux si surpoids, HIIT sinon)
  // -----------------------------------------------------------------------
  if (goal === 'Perte de poids') {
    if (needsLowImpact) {
      // Circuit SANS IMPACT pour protéger les articulations
      const LOW_IMPACT_EXERCISES: Exercise[] = [
        { name: 'Squats poids de corps (descente lente)', sets: '3x12' },
        { name: 'Pont fessier au sol', sets: '3x15' },
        { name: 'Step-up sur marche basse', sets: '3x10/jambe' },
        { name: 'Gainage ventral', sets: '3x20-30s' },
        { name: 'Gainage latéral', sets: '2x15-20s/côté' },
        { name: 'Bird-dog', sets: '3x8/côté' },
        { name: 'Fentes arrière lentes', sets: '3x8/jambe' },
        { name: 'Marche latérale avec élastique', sets: '3x10 pas/côté' },
        { name: 'Extensions mollets debout', sets: '3x15' },
        { name: 'Dead bug', sets: '3x8/côté' },
      ];

      const focusLabel = isOddWeek ? 'Bas du corps' : 'Gainage & Stabilité';
      const title = `Renfo Adapté - ${focusLabel} (S${weekNumber})`;

      const pool = isOddWeek
        ? LOW_IMPACT_EXERCISES.filter(e =>
            e.name.includes('Squat') || e.name.includes('Pont') ||
            e.name.includes('Step') || e.name.includes('Fente') || e.name.includes('Mollet'),
          )
        : LOW_IMPACT_EXERCISES.filter(e =>
            e.name.includes('Gainage') || e.name.includes('Bird') ||
            e.name.includes('Dead') || e.name.includes('latéral'),
          );

      const exercises = pickExercises(pool, 4, weekNumber);
      const scaledExercises = exercises.map(e => ({
        ...e,
        sets: scaleSets(e.sets, combinedFactor * 0.85), // volume réduit
      }));

      const exerciseList = scaledExercises.map(e => `${e.name} (${e.sets})`).join(', ');
      const mainSet = `Circuit ${Math.max(2, tours - 1)} tours, repos ${rest} entre exercices, 1 min 30 entre tours : ${exerciseList}. Privilégie la technique et le contrôle, pas la vitesse.`;

      return { mainSet, warmup, cooldown, duration: '25-30 min', title };
    }

    const focusLabel = isOddWeek ? 'Bas du corps' : 'Full body';
    const title = isOddWeek
      ? `Circuit Métabolique Haute Intensité - ${focusLabel}`
      : `HIIT Full Body - Semaine ${weekNumber}`;

    // Alternate between lower-body focused and full-body focused
    // Filtrer pliométrie pour débutants OU blessures articulaires (squats sautés, fentes sautées, burpees)
    const isBeginnerLevel = level.includes('Débutant') || level.includes('Debutant');
    const needsPlioFilter = isBeginnerLevel || hasJointInjury;
    const safeMetabolic = needsPlioFilter
      ? METABOLIC_EXERCISES.filter(e => !e.name.includes('saute') && !e.name.includes('sauté') && !e.name.includes('Burpees'))
      : METABOLIC_EXERCISES;
    const pool = isOddWeek
      ? safeMetabolic.filter(e =>
          e.name.includes('Squat') ||
          e.name.includes('Fente') ||
          e.name.includes('Montee') ||
          e.name.includes('Mountain'),
        )
      : safeMetabolic;

    const exercises = pickExercises(pool, 5, weekNumber);
    const scaledExercises = exercises.map(e => ({
      ...e,
      sets: scaleSets(e.sets, combinedFactor),
    }));

    // Add base route exercises for variety
    const routeQuads = ROUTE_EXERCISES.find(f => f.name === 'QUADRICEPS/FESSIERS')!;
    const bonusExercise = pickExercises(routeQuads.exercises, 1, weekNumber + 3);
    const allExercises = [...scaledExercises, ...bonusExercise.map(e => ({
      ...e,
      sets: scaleSets(e.sets, combinedFactor),
    }))];

    const exerciseList = allExercises.map(e => `${e.name} (${e.sets})`).join(', ');
    const mainSet = `Circuit ${tours} tours, repos ${rest} entre exercices, 1 min entre tours : ${exerciseList}.`;

    return { mainSet, warmup, cooldown, duration: '30-35 min', title };
  }

  // -----------------------------------------------------------------------
  // Maintien en forme: balanced, gentle
  // -----------------------------------------------------------------------
  if (goal === 'Maintien en forme') {
    const focusLabel = isOddWeek ? 'Renfo & Stabilite' : 'Mobilite & Gainage';
    const title = `Renfo Equilibre - ${focusLabel} (S${weekNumber})`;

    const focus = isOddWeek
      ? getFocusAFamilies(ROUTE_EXERCISES)
      : getFocusBFamilies(ROUTE_EXERCISES);

    const primaryPicks = pickExercises(focus.primary.exercises, 2, weekNumber);
    const gainagePicks = pickExercises(focus.gainage, 2, weekNumber);
    const molletsPicks = pickExercises(focus.mollets, 1, weekNumber);
    const fitnessPicks = pickExercises(FITNESS_EXERCISES, 1, weekNumber);

    const allExercises = [...primaryPicks, ...gainagePicks, ...molletsPicks, ...fitnessPicks]
      .map(e => ({ ...e, sets: scaleSets(e.sets, combinedFactor) }));

    const exerciseList = allExercises.map(e => `${e.name} (${e.sets})`).join(', ');
    const mainSet = `Circuit ${tours} tours : ${exerciseList}. Repos ${rest} entre tours.`;

    return { mainSet, warmup, cooldown, duration, title };
  }

  // -----------------------------------------------------------------------
  // Course sur route / Trail
  // -----------------------------------------------------------------------
  const isTrail = goal === 'Trail';
  const isUltra = isTrail && (trailDistance || 0) >= 60;
  const isTrailLong = isTrail && (trailDistance || 0) >= 30;
  const isMarathon = goal === 'Course sur route' &&
    subGoal?.toLowerCase().includes('marathon') &&
    !subGoal?.toLowerCase().includes('semi');
  const isSemi = goal === 'Course sur route' && subGoal?.toLowerCase().includes('semi');
  const isShortRoad = goal === 'Course sur route' && !isMarathon && !isSemi;

  // Build title
  let title: string;
  if (isOddWeek) {
    title = isTrail
      ? `Renfo Trail Focus A - Quadriceps & Excentrique (S${weekNumber})`
      : `Renfo Focus A - Quadriceps & Gainage (S${weekNumber})`;
  } else {
    title = isTrail
      ? `Renfo Trail Focus B - Hanches & Proprioception (S${weekNumber})`
      : `Renfo Focus B - Fessiers/Hanches & Gainage lateral (S${weekNumber})`;
  }

  // Phase-specific title override
  if (phase === 'affutage') {
    title = `Renfo Maintien Leger - Affutage (S${weekNumber})`;
  } else if (phase === 'recuperation') {
    title = `Renfo Leger - Recuperation (S${weekNumber})`;
  }

  // Injury-specific title enrichment
  if (hasPosteriorChainInjury) {
    title = title.replace('Quadriceps & Gainage', 'Quadriceps & Prévention Ischio');
    title = title.replace('Quadriceps & Excentrique', 'Excentrique & Prévention Ischio');
    title = title.replace('Fessiers/Hanches', 'Fessiers/Ischio & Prévention');
    title = title.replace('Hanches & Proprioception', 'Hanches & Prévention Ischio');
  } else if (hasKneeInjury) {
    title = title.replace('Quadriceps & Gainage', 'Quadriceps & Prévention Genou');
    title = title.replace('Quadriceps & Excentrique', 'Excentrique & Prévention Genou');
  }

  // Build exercise list
  const exercises: Exercise[] = [];

  // Primary focus
  const focus = isOddWeek
    ? getFocusAFamilies(ROUTE_EXERCISES)
    : getFocusBFamilies(ROUTE_EXERCISES);

  const primaryCount = (phase === 'affutage' || phase === 'recuperation') ? 2 : 3;
  exercises.push(...pickExercises(focus.primary.exercises, primaryCount, weekNumber));

  // Gainage
  const gainageCount = 2;
  exercises.push(...pickExercises(focus.gainage, gainageCount, weekNumber));

  // Mollets
  exercises.push(...pickExercises(focus.mollets, 1, weekNumber));

  // ---- Trail-specific additions ----
  if (isTrail) {
    if (isOddWeek) {
      // Focus A trail: excentrique quadriceps
      const excentricFamily = TRAIL_EXERCISES.find(f => f.name === 'EXCENTRIQUE QUADRICEPS')!;
      exercises.push(...pickExercises(excentricFamily.exercises, 2, weekNumber));
      // Pliométrie pour confirmé+ ET pas de contre-indication articulaire
      if (!needsLowImpact && (level.includes('Confirme') || level.includes('Confirmé') || level.includes('Expert'))) {
        const plioFamily = TRAIL_EXERCISES.find(f => f.name === 'PLIOMETRIE TRAIL')!;
        exercises.push(...pickExercises(plioFamily.exercises, 1, weekNumber));
      }
    } else {
      // Focus B trail: proprioception + gainage rotation
      const proprioFamily = TRAIL_EXERCISES.find(f => f.name === 'PROPRIOCEPTION')!;
      // Blessures articulaires / surpoids : proprioception au sol uniquement (pas de sauts)
      const proprioExercises = needsLowImpact
        ? proprioFamily.exercises.filter(e => !e.name.includes('Saut') && !e.name.includes('Corde'))
        : proprioFamily.exercises;
      exercises.push(...pickExercises(proprioExercises, 2, weekNumber));
      const gainageRotFamily = TRAIL_EXERCISES.find(f => f.name === 'GAINAGE ROTATION')!;
      exercises.push(...pickExercises(gainageRotFamily.exercises, 1, weekNumber));
    }

    // Trail mollets montée (both focuses)
    const molletsTrailFamily = TRAIL_EXERCISES.find(f => f.name === 'MOLLETS MONTEE')!;
    exercises.push(...pickExercises(molletsTrailFamily.exercises, 1, weekNumber));
  }

  // ---- Ultra additions (60km+) ----
  if (isUltra) {
    exercises.push(...pickExercises(ULTRA_EXERCISES, isTrail && (trailDistance || 0) >= 100 ? 3 : 2, weekNumber));
  }

  // ---- Marathon endurance emphasis ----
  if (isMarathon) {
    // Swap to higher reps for endurance
    // Already handled via level factor, but we add a long gainage
    exercises.push({ name: 'Gainage ventral long', sets: '2x90-120s' });
  }

  // ---- Short road (5K/10K) explosive emphasis (pas si blessure articulaire ou surpoids) ----
  if (isShortRoad && !needsLowImpact && (level.includes('Confirme') || level.includes('Confirmé') || level.includes('Expert'))) {
    const explosiveExtras: Exercise[] = [
      { name: 'Squats sautés', sets: '3x10' },
      { name: 'Fentes sautées alternées', sets: '3x8/jambe' },
      { name: 'Skipping haut', sets: '3x15' },
    ];
    exercises.push(...pickExercises(explosiveExtras, 1, weekNumber));
  }

  // ---- Filtrer les exercices à risque articulaire (squat bulgare, fentes sautées, pliométrie) ----
  if (hasJointInjury) {
    const riskyPatterns = ['bulgare', 'sauté', 'sautée', 'sautés', 'sautées', 'box jump', 'pliomét', 'pliomet'];
    const safeExercises = exercises.filter(e =>
      !riskyPatterns.some(p => e.name.toLowerCase().includes(p))
    );
    exercises.length = 0;
    exercises.push(...safeExercises);
  }

  // ---- Injury prevention exercises ----
  // Remplace 1-2 exercices génériques par des exercices de prévention ciblés
  if (hasPosteriorChainInjury) {
    const prevention = pickExercises(POSTERIOR_CHAIN_PREVENTION, 2, weekNumber);
    // Retirer les exercices qui sollicitent trop les ischio (fentes marchées, step-up agressifs)
    const filtered = exercises.filter(e =>
      !e.name.toLowerCase().includes('fentes marchees') &&
      !e.name.toLowerCase().includes('fentes sautées')
    );
    exercises.length = 0;
    exercises.push(...filtered, ...prevention);
  } else if (hasKneeInjury) {
    const prevention = pickExercises(KNEE_PREVENTION, 2, weekNumber);
    exercises.push(...prevention);
  } else if (hasBackInjury) {
    const prevention = pickExercises(BACK_PREVENTION, 2, weekNumber);
    // Retirer les exercices de charge axiale lourde
    const filtered = exercises.filter(e =>
      !e.name.toLowerCase().includes('squat sauté') &&
      !e.name.toLowerCase().includes('box jump')
    );
    exercises.length = 0;
    exercises.push(...filtered, ...prevention);
  } else if (hasAnkleInjury) {
    const prevention = pickExercises(ANKLE_PREVENTION, 2, weekNumber);
    exercises.push(...prevention);
  }

  // Scale all exercises for level + phase
  const scaledExercises = exercises.map(e => ({
    ...e,
    sets: scaleSets(e.sets, combinedFactor),
  }));

  // Format as circuit string
  const exerciseList = scaledExercises.map(e => `${e.name} (${e.sets})`).join(', ');
  const preventionNote = hasAnySpecificInjury
    ? ` ⚠️ Exercices de prévention inclus pour ta blessure — si douleur, arrête immédiatement.`
    : '';
  const mainSet = `Circuit ${tours} tours : ${exerciseList}. Repos ${rest} entre tours.${preventionNote}`;

  // Adjust duration for trail/ultra
  let finalDuration = duration;
  if (isUltra) {
    finalDuration = '45-50 min';
  } else if (isTrailLong) {
    finalDuration = '40-45 min';
  } else if (isMarathon) {
    finalDuration = '35-45 min';
  }

  // Reduce duration for affutage/recuperation
  if (phase === 'affutage' || phase === 'recuperation') {
    finalDuration = '25-30 min';
  }

  return { mainSet, warmup, cooldown, duration: finalDuration, title };
}

// ---------------------------------------------------------------------------
// Complete session builder
// ---------------------------------------------------------------------------

let _sessionIdCounter = 0;

export function buildRenfoSession(params: {
  weekNumber: number;
  goal: string;
  subGoal?: string;
  trailDistance?: number;
  level: string;
  phase: string;
  day: string;
  weight?: number;
  height?: number;
  injuries?: { hasInjury?: boolean; description?: string };
}): Session {
  const { weekNumber, goal, subGoal, trailDistance, level, phase, day, weight, height, injuries } = params;

  // Calcul IMC pour adapter les conseils
  const bmi = (weight && height && height > 0) ? weight / ((height / 100) ** 2) : 0;
  const isOverweight = bmi >= 28;

  const { mainSet, warmup, cooldown, duration, title } = buildRenfoMainSet({
    weekNumber,
    goal,
    subGoal,
    trailDistance,
    level,
    phase,
    weight,
    height,
    injuries,
  });

  _sessionIdCounter += 1;
  const id = `renfo-s${weekNumber}-${_sessionIdCounter}`;

  // Intensity depends on phase — surpoids + débutant = jamais Difficile
  const isBeginner = level.includes('Debutant') || level.includes('Débutant');
  let intensity: 'Facile' | 'Modéré' | 'Difficile';
  if (phase === 'affutage' || phase === 'recuperation') {
    intensity = 'Facile';
  } else if (isOverweight && isBeginner) {
    intensity = 'Facile'; // Sécurité articulaire
  } else if (isOverweight) {
    intensity = 'Modéré'; // Pas de Difficile si surpoids
  } else if (goal === 'Perte de poids' || phase === 'specifique') {
    intensity = 'Difficile';
  } else {
    intensity = 'Modéré';
  }

  // Contextual advice — bienveillant, pragmatique, en français correct
  let advice: string;

  if (isOverweight && isBeginner) {
    advice = 'Concentre-toi sur la technique, pas sur la vitesse. Chaque répétition bien faite compte plus que le nombre. Prends des pauses si besoin, c\'est normal et c\'est bien. Si un exercice provoque une gêne, passe au suivant sans hésiter.';
  } else if (isOverweight) {
    advice = 'Privilégie le contrôle du mouvement et les exercices au sol. Si un exercice est inconfortable, adapte-le ou passe au suivant. Tu progresses à chaque séance.';
  } else if (isBeginner) {
    advice = 'Concentre-toi sur la technique plutôt que la vitesse. Prends des pauses supplémentaires si nécessaire. Écoute ton corps et ne force jamais en cas de douleur.';
  } else if (phase === 'affutage') {
    advice = 'Séance de maintien léger : garde la technique mais ne cherche pas la fatigue. L\'objectif est d\'arriver frais à ta course.';
  } else if (goal === 'Perte de poids') {
    advice = 'Maintiens un rythme soutenu avec des temps de repos courts. L\'objectif est de garder la fréquence cardiaque élevée. Hydrate-toi bien.';
  } else if (goal === 'Trail') {
    advice = 'Contrôle la phase excentrique de chaque mouvement (descente lente). Ça renforce les muscles pour les descentes en trail. Écoute ton corps.';
  } else {
    advice = 'Exécute chaque exercice avec un mouvement contrôlé et une bonne posture. Respire régulièrement. Si un exercice provoque une douleur, passe au suivant.';
  }

  return {
    id,
    day,
    type: 'Renforcement',
    duration,
    intensity,
    title,
    warmup,
    mainSet,
    cooldown,
    advice,
  };
}
