/**
 * Sprint G — Helper rétro-compat pour SessionFeedback.source
 *
 * Pourquoi ce helper :
 * Les `SessionFeedback` saved avant Sprint G n'ont pas de champ `source`.
 * On infère lazy au read pour éviter une migration Firestore coûteuse,
 * et on pose `source` explicitement à toute nouvelle écriture.
 *
 * Règles d'inférence (legacy) :
 * • Si `feedback.stravaData?.activityId` existe → l'auto-match a fonctionné
 *   à l'époque → 'strava_auto_matched'
 * • Sinon → l'user avait validé sans Strava → 'manual_no_strava'
 * • Cas `completed === false` sans feedback : pas concerné (pas de feedback à inferer)
 *
 * Doctrine `feedback_securite_avant_conversion` :
 * 'not_done' n'est JAMAIS inferé en legacy (un user qui aurait skippé
 * en silence dans l'ancien flow n'avait pas de SessionFeedback du tout).
 */

import type { FeedbackSource, SessionFeedback } from '../types';

export function inferSource(feedback: SessionFeedback | undefined | null): FeedbackSource | undefined {
  if (!feedback) return undefined;
  if (feedback.source) return feedback.source; // déjà posé (Sprint G+)
  if (feedback.stravaData?.activityId) return 'strava_auto_matched';
  return 'manual_no_strava';
}

/**
 * Test rapide pour exclure les séances `not_done` d'un calcul "séances faites"
 * (utilisé pour adaptationContext Gemini + compliance compteur).
 */
export function isCompletedFeedback(feedback: SessionFeedback | undefined | null): boolean {
  if (!feedback) return false;
  if (!feedback.completed) return false;
  if (inferSource(feedback) === 'not_done') return false;
  return true;
}
