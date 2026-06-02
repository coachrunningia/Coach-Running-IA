/**
 * platformService.ts
 *
 * Service central de détection plateforme (web / iOS natif / Android natif).
 *
 * Pourquoi ce service :
 * - Single source of truth pour `Capacitor.isNativePlatform()` et `Capacitor.getPlatform()`.
 *   Évite la duplication des try/catch dispersés et permet de mocker en test.
 * - Sépare les concerns : si demain on migre Capacitor → autre wrapper, on ne touche
 *   qu'à ce fichier.
 * - Centralise la gestion Stripe iOS (Apple 3.1.1) : la fonction `canShowPaidCTA`
 *   permet à TOUT composant front de décider d'afficher ou non un CTA paiement.
 *
 * Apple 3.1.1 : sur iOS, AUCUN CTA paiement Stripe ne doit être visible/cliquable
 * dans l'app. L'utilisateur iOS souscrit Premium UNIQUEMENT depuis Safari sur
 * coachrunningia.fr (hors app). Sa souscription est synchronisée via Firebase au
 * retour dans l'app. Voir [[project_coach_running_ia_mobile_v1]].
 *
 * NB Apple "anti-steering rules" : on n'a PAS le droit d'afficher dans l'app un
 * lien vers le site web pour payer ailleurs. On masque simplement la PricingPage
 * en iOS et on n'invite à rien. L'utilisateur qui veut Premium ira chercher
 * coachrunningia.fr de lui-même.
 */

import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

/** Vrai si on tourne dans un container Capacitor natif (iOS ou Android) */
export const isNative: boolean = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

/** Plateforme détectée : 'web' | 'ios' | 'android' */
export const platform: Platform = (() => {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
    return 'web';
  } catch {
    return 'web';
  }
})();

/** Vrai uniquement si iOS natif (pas web Safari mobile, pas Android) */
export const isIOSNative: boolean = isNative && platform === 'ios';

/** Vrai uniquement si Android natif */
export const isAndroidNative: boolean = isNative && platform === 'android';

/**
 * Décide si un CTA paiement (Stripe / Premium) peut s'afficher.
 * Apple 3.1.1 : faux sur iOS natif. Vrai partout ailleurs.
 *
 * Usage dans tout composant front :
 *   if (canShowPaidCTA()) { <button>S'abonner</button> } else { ... }
 */
export const canShowPaidCTA = (): boolean => !isIOSNative;
