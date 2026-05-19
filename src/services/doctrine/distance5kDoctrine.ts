/**
 * 5K doctrine — bibliothèque coach 20 ans validée.
 * Sources : Daniels (5K = VO2max dominant), Magness.
 */

import type { DoctrinePattern } from './marathonDoctrine';

export const DISTANCE_5K_PATTERNS: DoctrinePattern[] = [
  {
    name: 'VO2-COURT',
    description: 'VO2max courts (1-3 min) — saturation cardiaque, allure 5K-VMA.',
    format: 'Échauffement 15 min + 6-10 × 1-3 min @ allure 5K / VMA (r=égale) + retour 10 min',
    distance: { min: 8, max: 11 },
    paceType: 'VMA',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    excludeLevels: ['Débutant'],
    example: '15 min EF + 8 × 2 min @ allure 5K (4:25/km) r=2 min trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'VMA-COURTE-5K',
    description: 'VMA très courte (200-400m) — vitesse maximale aérobie, économie.',
    format: 'Échauffement 15 min + 12-16 × 200-400m @ VMA (r=égale) + retour 10 min',
    distance: { min: 8, max: 11 },
    paceType: 'VMA',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 14 × 400m @ VMA (4:17/km) r=400m trot + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LT-CRUISE-5K',
    description: 'LT Cruise courts (1 km segments) au seuil.',
    format: 'Échauffement 15 min + 5-7 × 1 km @ seuil (r=60 s) + retour 10 min',
    distance: { min: 9, max: 12 },
    paceType: 'SEUIL',
    phase: ['developpement', 'specifique'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '15 min EF + 6 × 1 km @ seuil (4:42/km) r=60s + 10 min EF',
    maxPerCycle: 3,
  },
  {
    name: 'LR-EF-5K',
    description: 'Long Run EF base aérobie 5K (10-14 km).',
    format: 'Continu en EF stricte',
    distance: { min: 8, max: 14 },
    paceType: 'EF',
    phase: ['fondamental', 'developpement', 'specifique', 'recuperation'],
    levels: ['Débutant', 'Régulier', 'Confirmé', 'Expert'],
    example: '12 km EF (5:40/km)',
    maxPerCycle: 99,
  },
  {
    name: 'STRIDES',
    description: 'Footing + lignes droites (gammes vitesse).',
    format: 'Footing 30-45 min + 6-10 × 80-100m progressifs en fin',
    distance: { min: 5, max: 9 },
    paceType: 'STRIDES',
    phase: ['fondamental', 'developpement', 'specifique', 'affutage'],
    levels: ['Régulier', 'Confirmé', 'Expert'],
    example: '40 min footing EF + 8 × 100m progressifs',
    maxPerCycle: 99,
  },
];

export const DISTANCE_5K_RULES = {
  minDifferentPatternsOver4Weeks: 3,
  quality8020Seiler: '80% EF / 20% qualité',
  minRecoveryBetweenHardSessions: 48,
};

export const build5kPromptBlock = (data: any, paces: any, _ctx?: any): string => {
  const level = (data?.level || '').replace(/\s*\([^)]+\)/, '').trim();
  const isAdvanced = ['Régulier', 'Confirmé', 'Expert'].some(l => level.includes(l));
  const fivekPace = paces?.allureSpecifique5k || '?';
  const seuilPace = paces?.seuilPace || '?';
  const vmaPace = paces?.vmaPace || '?';
  const efPace = paces?.efPace || '?';

  if (!isAdvanced) {
    return `📚 BIBLIOTHÈQUE COACH 5K — niveau ${level || 'Débutant'} :
- Phase fondamentale : LR-EF-5K + footings EF, strides en fin.
- Phase développement : LR-EF-5K + Fartlek doux ou côtes courtes.
- Phase spécifique : LR-EF-5K + 1 séance Tempo court ou intervalles courts @ allure 5K (${fivekPace}).
- Affûtage : footings courts + strides, repos J-1.`;
  }

  const patternsList = DISTANCE_5K_PATTERNS
    .filter(p => !p.excludeLevels?.some(l => level.includes(l)))
    .map(p => `  • ${p.name} — ${p.description} | Format : ${p.format} | Phases : ${p.phase.join(', ')}`)
    .join('\n');

  return `📚 BIBLIOTHÈQUE COACH 5K — niveau ${level} :

PATTERNS DISPONIBLES (Daniels, Magness) :
${patternsList}

RÈGLES :
- ${DISTANCE_5K_RULES.minDifferentPatternsOver4Weeks} patterns DIFFÉRENTS minimum sur 4 semaines glissantes.
- Ratio ${DISTANCE_5K_RULES.quality8020Seiler}.
- Minimum ${DISTANCE_5K_RULES.minRecoveryBetweenHardSessions}h entre 2 séances dures.

ALLURES :
- EF : ${efPace}/km | Allure 5K : ${fivekPace}/km | Seuil : ${seuilPace}/km | VMA : ${vmaPace}/km`;
};
