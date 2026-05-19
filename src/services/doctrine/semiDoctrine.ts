/**
 * Semi-marathon doctrine — bibliothèque coach 20 ans validée.
 * Sources : Daniels, Pfitzinger Faster Road Racing, Magness.
 */

import type { DoctrinePattern } from './marathonDoctrine';

export const SEMI_PATTERNS: DoctrinePattern[] = [
  {
    name: 'HMP-LR',
    description: 'Half-Marathon Pace Long Run — SL avec bloc à allure semi.',
    format: '6-8 km EF + 8-14 km @ HMP + 2-3 km retour EF',
    distance: { min: 18, max: 26 },
    paceType: 'MP',
    phase: ['specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '6 km EF + 12 km @ HMP (4:50/km) + 2 km retour = 20 km',
    maxPerCycle: 3,
    neverConsecutive: true,
    minSpacingWeeks: 2,
  },
  {
    name: 'TEMPO-LONG',
    description: 'Tempo continu long allure seuil — 30-50 min continu.',
    format: 'Échauffement 15 min + 30-50 min @ seuil + retour 10 min',
    distance: { min: 12, max: 16 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 40 min @ seuil (4:42/km) + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LT-CRUISE-HM',
    description: 'LT Cruise intervals adapté semi (2-3 km segments).',
    format: 'Échauffement 15 min + 3-5 × 2-3 km @ seuil (récup 90 s) + retour 10 min',
    distance: { min: 12, max: 16 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 4 × 2.5 km @ seuil r=90s trot + 10 min EF',
    maxPerCycle: 4,
  },
  {
    name: 'VO2-MID',
    description: 'VO2max intervals moyens (2-4 min) — stimulation cardiaque sans déchet.',
    format: 'Échauffement 15 min + 5-8 × 2-4 min @ VMA (récup égale) + retour 10 min',
    distance: { min: 10, max: 13 },
    paceType: 'VMA',
    phase: ['developpement'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '15 min EF + 6 × 3 min @ VMA r=3 min trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LR-EF-HM',
    description: 'Long Run EF semi (base aérobie).',
    format: 'Continu en EF stricte',
    distance: { min: 14, max: 22 },
    paceType: 'EF',
    phase: ['fondamental', 'developpement', 'specifique', 'recuperation'],
    levels: ['Débutant', 'Régulier', 'Confirmé', 'Expert'],
    example: '18 km EF (5:40/km)',
    maxPerCycle: 99,
  },
  {
    name: 'LR-PROG-HM',
    description: 'Long Run progressif semi (EF → HMP en fin).',
    format: '14-18 km EF + 4-6 km @ HMP en fin',
    distance: { min: 18, max: 22 },
    paceType: 'MIXTE',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '16 km EF + 6 km @ HMP en progression',
    maxPerCycle: 4,
    minSpacingWeeks: 2,
  },
  {
    name: '5K-TUNE-UP',
    description: 'Course de préparation 5 km à 3-4 sem du semi.',
    format: 'Échauffement 20 min + 5 km en compétition + retour 10 min',
    distance: { min: 10, max: 12 },
    paceType: 'MIXTE',
    phase: ['specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '20 min EF + 5 km @ allure 5K + 10 min EF',
    maxPerCycle: 1,
  },
  {
    name: 'STRIDES',
    description: 'Footing + lignes droites (gammes vitesse) — économie de course.',
    format: 'Footing 30-45 min + 6-10 × 80-100m progressifs en fin',
    distance: { min: 6, max: 10 },
    paceType: 'STRIDES',
    phase: ['fondamental', 'developpement', 'specifique', 'affutage'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '40 min footing EF + 8 × 100m progressifs',
    maxPerCycle: 99,
  },
];

export const SEMI_RULES = {
  sequence4WeeksSpecifique: 'S1 HMP-LR / S2 TEMPO-LONG / S3 HMP-LR / S4 décharge LR-EF',
  minDifferentPatternsOver4Weeks: 3,
  quality8020Seiler: '80% EF / 20% qualité',
  minRecoveryBetweenHardSessions: 48,
  peakLrWeeksBeforeRace: 2,
};

export const SEMI_TAPER = {
  Sminus2: { volPct: 75, sl: '16-18 km dont 6 km HMP final' },
  Sminus1: { volPct: 50, sl: 'course only', focus: 'Footings courts + strides, repos J-1.' },
};

export const buildSemiPromptBlock = (data: any, paces: any, _ctx?: any): string => {
  const level = (data?.level || '').replace(/\s*\([^)]+\)/, '').trim();
  const isAdvanced = ['Régulier', 'Confirmé', 'Expert'].some(l => level.includes(l));
  const hmpPace = paces?.allureSpecifiqueSemi || '?';
  const seuilPace = paces?.seuilPace || '?';
  const vmaPace = paces?.vmaPace || '?';
  const efPace = paces?.efPace || '?';

  if (!isAdvanced) {
    return `📚 BIBLIOTHÈQUE COACH SEMI — niveau ${level || 'Débutant'} :
- Phase fondamentale : LR-EF-HM (SL 14-18 km EF) + strides en fin de footing.
- Phase développement : LR-EF-HM + 1 séance Fartlek doux ou côtes courtes.
- Phase spécifique : LR-EF-HM + rappel allure HMP (${hmpPace}) sur 4-6 km en fin de SL.
- Phase affûtage : footings courts + strides, repos J-1.
- INTERDIT : HMP-LR pleine, VO2-MID, 5K-TUNE-UP.`;
  }

  const patternsList = SEMI_PATTERNS
    .filter(p => !p.excludeLevels?.some(l => level.includes(l)))
    .map(p => `  • ${p.name} — ${p.description} | Format : ${p.format} | Distance : ${p.distance.min}-${p.distance.max} km | Phases : ${p.phase.join(', ')}`)
    .join('\n');

  return `📚 BIBLIOTHÈQUE COACH SEMI-MARATHON — niveau ${level} :

PATTERNS DISPONIBLES (sources : Daniels, Pfitzinger Faster Road Racing) :
${patternsList}

RÈGLES SÉQUENCEMENT :
- ${SEMI_RULES.sequence4WeeksSpecifique}
- ${SEMI_RULES.minDifferentPatternsOver4Weeks} patterns DIFFÉRENTS minimum sur 4 semaines glissantes.
- Ratio Seiler ${SEMI_RULES.quality8020Seiler}.
- Minimum ${SEMI_RULES.minRecoveryBetweenHardSessions}h entre 2 séances dures.
- JAMAIS 2 HMP-LR consécutives — espacer de ${SEMI_PATTERNS.find(p => p.name === 'HMP-LR')!.minSpacingWeeks} semaines.

ALLURES :
- EF : ${efPace}/km | HMP : ${hmpPace}/km | Seuil : ${seuilPace}/km | VMA : ${vmaPace}/km

AFFÛTAGE SEMI (2 semaines avant) :
- S-2 : ${SEMI_TAPER.Sminus2.volPct}% du volume pic. ${SEMI_TAPER.Sminus2.sl}.
- S-1 : ${SEMI_TAPER.Sminus1.volPct}% du volume pic. ${SEMI_TAPER.Sminus1.focus}`;
};
