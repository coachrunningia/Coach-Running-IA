/**
 * Helper unique de routing : selon subGoal/goal, injecte le bloc doctrine adapté.
 * Trail / Hyrox / Perte de poids → no-op (déjà gérés ailleurs dans geminiService).
 *
 * Source : SPRINT-MARATHON-COMPLET — Sprint 2 Bloc Marathon + Anti-monotonie.
 * Validation : PM 10 ans + Coach FFA 20 ans.
 */

import { buildMarathonPromptBlock } from './marathonDoctrine';
import { buildSemiPromptBlock } from './semiDoctrine';
import { build10kPromptBlock } from './distance10kDoctrine';
import { build5kPromptBlock } from './distance5kDoctrine';

export const buildDisciplineBlock = (
  subGoal: string | undefined,
  data: any,
  paces: any,
  ctx?: any,
): string => {
  if (!subGoal) return '';
  const lc = subGoal.toLowerCase();

  // Semi PRIORITAIRE avant Marathon (car "Semi-marathon" contient "marathon").
  if (lc.includes('semi')) return buildSemiPromptBlock(data, paces, ctx);
  if (lc.includes('marathon')) return buildMarathonPromptBlock(data, paces, ctx);
  if (lc === '10 km' || lc === '10km' || lc.includes('10 km')) return build10kPromptBlock(data, paces, ctx);
  if (lc === '5 km' || lc === '5km' || lc.includes('5 km')) return build5kPromptBlock(data, paces, ctx);

  // Trail / Hyrox / Perte de poids : déjà gérés par d'autres blocs spécifiques
  // dans geminiService (trailRules, hyroxRules, blocPertePoids). Pas de duplication.
  return '';
};
