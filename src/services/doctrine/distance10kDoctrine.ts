/**
 * 10K doctrine — bibliothèque coach 20 ans validée.
 * Sources : Daniels (10K = balance VO2max + LT), Pfitzinger Faster Road Racing.
 */

import type { DoctrinePattern } from './marathonDoctrine';

export const DISTANCE_10K_PATTERNS: DoctrinePattern[] = [
  {
    name: 'VO2-LONG-10K',
    description: 'VO2max intervals longs adaptés 10K (3-5 min @ allure 10K-VMA).',
    format: 'Échauffement 15 min + 4-6 × 3-5 min @ allure 10K / VMA + retour 10 min',
    distance: { min: 10, max: 14 },
    paceType: 'VMA',
    phase: ['developpement'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '15 min EF + 5 × 4 min @ allure 10K (4:35/km) r=3 min trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LT-CRUISE-10K',
    description: 'LT Cruise intervals 1-2 km au seuil (Daniels).',
    format: 'Échauffement 15 min + 4-6 × 1-2 km @ seuil (r=60-90 s) + retour 10 min',
    distance: { min: 11, max: 14 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 5 × 1.5 km @ seuil (4:42/km) r=75s + 10 min EF',
    maxPerCycle: 4,
  },
  {
    name: 'TEMPO-10K',
    description: 'Tempo continu 20-30 min à allure seuil.',
    format: 'Échauffement 15 min + 20-30 min continu @ seuil + retour 10 min',
    distance: { min: 9, max: 13 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 25 min @ seuil + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LR-EF-10K',
    description: 'Long Run EF base aérobie (14-18 km).',
    format: 'Continu en EF stricte',
    distance: { min: 12, max: 18 },
    paceType: 'EF',
    phase: ['fondamental', 'developpement', 'specifique', 'recuperation'],
    levels: ['Débutant', 'Régulier', 'Confirmé', 'Expert'],
    example: '14 km EF (5:40/km)',
    maxPerCycle: 99,
  },
  {
    name: 'VMA-COURTE',
    description: 'VMA courte (200-400m) — vitesse pure, économie.',
    format: 'Échauffement 15 min + 10-16 × 200-400m @ VMA (récup égale) + retour 10 min',
    distance: { min: 8, max: 12 },
    paceType: 'VMA',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 12 × 400m @ VMA (4:17/km) r=400m trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: '5K-TUNE-UP',
    description: 'Course 5 km en préparation 2-3 sem avant.',
    format: 'Échauffement 20 min + 5 km en compétition + retour 10 min',
    distance: { min: 10, max: 12 },
    paceType: 'MIXTE',
    phase: ['specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '20 min EF + 5 km @ allure 5K + 10 min EF',
    maxPerCycle: 1,
  },
];

export const DISTANCE_10K_RULES = {
  minDifferentPatternsOver4Weeks: 3,
  quality8020Seiler: '80% EF / 20% qualité',
  minRecoveryBetweenHardSessions: 48,
};

export const build10kPromptBlock = (data: any, paces: any, _ctx?: any): string => {
  const level = (data?.level || '').replace(/\s*\([^)]+\)/, '').trim();
  const isAdvanced = ['Régulier', 'Confirmé', 'Expert'].some(l => level.includes(l));
  const tenkPace = paces?.allureSpecifique10k || '?';
  const seuilPace = paces?.seuilPace || '?';
  const vmaPace = paces?.vmaPace || '?';
  const efPace = paces?.efPace || '?';

  if (!isAdvanced) {
    return `📚 BIBLIOTHÈQUE COACH 10K — niveau ${level || 'Débutant'} :
- Phase fondamentale : LR-EF-10K + footings EF, strides en fin (gammes vitesse).
- Phase développement : LR-EF-10K + Fartlek doux (30s-1min accélérations) ou côtes courtes.
- Phase spécifique : LR-EF-10K + 1 séance Tempo 15-20 min @ allure 10K (${tenkPace}).
- Affûtage : footings courts + strides, repos J-1.`;
  }

  const patternsList = DISTANCE_10K_PATTERNS
    .filter(p => !p.excludeLevels?.some(l => level.includes(l)))
    .map(p => `  • ${p.name} — ${p.description} | Format : ${p.format} | Phases : ${p.phase.join(', ')}`)
    .join('\n');

  return `📚 BIBLIOTHÈQUE COACH 10K — niveau ${level} :

PATTERNS DISPONIBLES (Daniels, Pfitzinger Faster Road Racing) :
${patternsList}

RÈGLES :
- ${DISTANCE_10K_RULES.minDifferentPatternsOver4Weeks} patterns DIFFÉRENTS minimum sur 4 semaines glissantes.
- Ratio ${DISTANCE_10K_RULES.quality8020Seiler}.
- Minimum ${DISTANCE_10K_RULES.minRecoveryBetweenHardSessions}h entre 2 séances dures.

ALLURES :
- EF : ${efPace}/km | Allure 10K : ${tenkPace}/km | Seuil : ${seuilPace}/km | VMA : ${vmaPace}/km`;
};
