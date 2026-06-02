/**
 * NativeOnlyRoute.tsx
 *
 * Wrapper de route React-Router 6+ qui redirige les utilisateurs iOS natifs
 * vers une URL alternative, et rend le composant enfant normalement en web.
 *
 * Pourquoi ce composant :
 * - Apple Guideline 4.2 (Minimum Functionality) : les apps qui ne sont qu'un
 *   wrapper de site web vitrine sont rejetées. Les routes "vitrine SEO" pures
 *   (`/`, `/blog/*`, landings SEO) ne doivent pas être accessibles en natif.
 * - Apple Guideline 4.2.3 (primarily web views) : éviter que l'app affiche
 *   du contenu marketing web identique à un navigateur.
 *
 * Pattern technique :
 * - `<Navigate replace />` est synchrone à la résolution de route → pas de flash
 *   de la landing avant redirect (contrairement à un useEffect qui navigate).
 * - `replace` évite la pollution de l'history (pas de boucle back).
 * - En web : `isIOSNative=false` → composant `<Navigate>` jamais monté.
 *   Aucun impact SEO/crawl Google.
 *
 * Usage :
 *   <Route path="/" element={
 *     <NativeOnlyRoute redirect="/dashboard">
 *       <LandingPage user={user} ... />
 *     </NativeOnlyRoute>
 *   } />
 *
 * Cible recommandée : `/dashboard` (qui chaîne automatiquement vers
 * `/auth?from=dashboard` si user non loggé via la garde existante).
 *
 * Audit iOS J3 (02/06/2026) : pattern validé par Expert iOS senior.
 * Cf [[feedback_mobile_audit_fin_etape]] + [[project_coach_running_ia_mobile_v1]].
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { isIOSNative } from '../services/platformService';

interface NativeOnlyRouteProps {
  children: React.ReactNode;
  redirect: string;
}

const NativeOnlyRoute: React.FC<NativeOnlyRouteProps> = ({ children, redirect }) => {
  if (isIOSNative) {
    return <Navigate to={redirect} replace />;
  }
  return <>{children}</>;
};

export default NativeOnlyRoute;
