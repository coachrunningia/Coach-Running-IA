/**
 * Sprint F+ Vague 1 — F-10 (2026-05-27)
 *
 * Décide si on doit auto-chaîner `generateRemainingWeeks` immédiatement après
 * `generatePreviewPlan` pour un user Premium, OU laisser le bouton manuel
 * "Générer les N semaines restantes" comme aujourd'hui.
 *
 * Cas réel : terebeu@gmail.com paye, génère un plan Marathon 16 sem feasibility BON 70.
 * Le plan reste isPreview=true (S1 seule) avec bouton "Générer" → terebeu pense
 * que son paiement n'est pas pris en compte. Test E2E confirmé : le bouton marche,
 * mais la friction UX est inacceptable pour un Premium qui paye 9,90€.
 *
 * Doctrines respectées :
 * - D17 transparence : si feasibility ∈ {RISQUÉ, IRRÉALISTE, AMBITIEUX} ou score < 15,
 *   on NE saute PAS le warning. L'opt-in conscient utilisateur reste OBLIGATOIRE.
 * - feedback_securite_avant_conversion : pas d'auto-chain sur profil à risque.
 * - feedback_jamais_contact_client : pas de notif, le user voit juste son plan complet.
 *
 * Fonction pure exportée → testable isolément (vitest).
 */

import type { TrainingPlan, User } from '../types';

/**
 * Statuts de feasibility qui DOIVENT déclencher un warning modal avant la génération
 * des semaines restantes. Pour ces statuts, on NE saute PAS le clic manuel utilisateur.
 *
 * NOTE : aligné avec PlanView.tsx:1689 (handler bouton "Générer") qui ouvre
 * `showFeasibilityWarning` pour ces mêmes statuts. Cohérence stricte requise sinon
 * on contournerait silencieusement le garde-fou D17.
 */
const FEASIBILITY_STATUS_REQUIRING_WARNING = ['RISQUÉ', 'IRRÉALISTE', 'AMBITIEUX'] as const;

/**
 * Score de confiance sous lequel on force le warning manuel même si le statut n'est
 * pas dans la liste ci-dessus (cas plan EXCELLENT/BON mais score numérique très bas).
 * Aligné PlanView.tsx:1689 (`score < 15`).
 */
const MIN_CONFIDENCE_FOR_AUTO_CHAIN = 15;

export interface AutoChainDecision {
  shouldAutoChain: boolean;
  /** Raison lisible (utilisée pour les logs, pas pour l'UI). */
  reason: string;
}

/**
 * Décide si l'auto-chain est autorisé pour un user + plan donné.
 *
 * Retourne `shouldAutoChain: false` dès qu'un seul critère bloque, avec la raison.
 * Retourne `shouldAutoChain: true` UNIQUEMENT si TOUS les critères sont verts.
 *
 * Critères (ordre = ordre de check) :
 * 1. User Premium (hasPurchasedPlan ou isPremium)
 * 2. Plan en mode preview (sinon rien à chaîner)
 * 3. Plan a un generationContext (sinon `generateRemainingWeeks` plantera)
 * 4. feasibility.status PAS dans la liste à warning (D17)
 * 5. confidenceScore >= 15 (D17 sécurité)
 */
export function decideAutoChain(
  user: User | null | undefined,
  plan: TrainingPlan | null | undefined,
): AutoChainDecision {
  if (!user) return { shouldAutoChain: false, reason: 'no-user' };
  if (!plan) return { shouldAutoChain: false, reason: 'no-plan' };

  // 1. Premium status — accepte les 2 voies (abonnement OU achat unique)
  const isPremium = Boolean(user.isPremium) || Boolean(user.hasPurchasedPlan);
  if (!isPremium) return { shouldAutoChain: false, reason: 'not-premium' };

  // 2. Plan doit être en preview pour qu'il y ait quelque chose à chaîner
  if (!plan.isPreview) return { shouldAutoChain: false, reason: 'not-preview' };

  // 3. generationContext requis (sinon generateRemainingWeeks throws ligne 5275)
  if (!plan.generationContext) return { shouldAutoChain: false, reason: 'no-generation-context' };

  // 4. Feasibility status à risque → warning manuel obligatoire (D17)
  const status = plan.feasibility?.status;
  if (status && (FEASIBILITY_STATUS_REQUIRING_WARNING as readonly string[]).includes(status)) {
    return { shouldAutoChain: false, reason: `feasibility-${status.toLowerCase()}` };
  }

  // 5. Score de confiance faible → warning manuel obligatoire (D17)
  // confidenceScore peut être 0..100 OU 1..5 selon les plans (cf. getConfidenceStyle).
  // On accepte tout score >= 15 dans l'échelle 0..100. Pour échelle 1..5,
  // on ne bloque PAS (PlanView fait la même condition « score < 15 »).
  const score = plan.confidenceScore ?? 100;
  if (score < MIN_CONFIDENCE_FOR_AUTO_CHAIN) {
    return { shouldAutoChain: false, reason: `low-confidence-${score}` };
  }

  return { shouldAutoChain: true, reason: 'premium-feasibility-ok' };
}
