# QA Pré-Deploy — Coach Running IA (Sprint G + F-17)
**QA Lead** · 28 mai 2026 · auditeur Claude pre-prod sprint UX Strava

---

## 1. Verdict deploy — **GO conditionnel**

Sprint G UX Strava est sain, isolé, premium-gated correctement. F-17 est dormant (non branché) donc neutre. Un seul point à vérifier en smoke prod : que `user.stravaConnected` ne devienne pas accidentellement `true` pour un user Free non-Strava (gate dépend uniquement de ce flag, pas du tier).

---

## 2. Régression sur flows existants

| Flow | Statut | Vérification |
|------|--------|--------------|
| Modal feedback (RPE + Notes + Enregistrer + Ajuster) Premium | OK | `PlanView.tsx:1998-2053` — RPE/Notes/2 CTA inchangés en mode normal (`!notDoneMode`). `handleValidateFeedback(true)` propage `adaptationRequested + onAdaptPlan(adaptationContext)` comme avant (`L375-457`). |
| Auto-match Strava `findStravaActivityForSession` | OK | Signature inchangée (`stravaAnalysisService.ts:495`). Le seul changement = passe désormais par cache `fetchActivitiesForDateRange` (`L399-427`). Fenêtre ±1j préservée. |
| `handleQuickComplete` toggle done/not_done | OK + ajout source | `PlanView.tsx:488-509`. Branche done/not_done préservée. Ajout: `source: inferredSource` (`L494-495`). Préserve `session.feedback?.source` si déjà posée → idempotent. |
| `handleValidateFeedback` adaptation Gemini Premium | OK + source flag | `PlanView.tsx:330-481`. `adaptationContext` template inchangé (`L423-445`). Skip Gemini sur `not_done` via `adaptationRequested: false` posé en dur (`L344`). |
| `updateSessionFeedback` Firestore write | OK | `storageService.ts:308`. Pas de schéma strict, accepte champs optionnels. Détection injury via keywords (`L342-369`) tourne toujours sur RPE/notes — inchangée. |
| Détection injury auto via RPE+keywords | OK | `storageService.ts:351`. Toujours `rpe >= 7 && keyword`. Pour `not_done` (`rpe=0`) → ne triggera plus, ce qui est cohérent (séance pas faite ≠ blessée). |

**Aucune régression bloquante détectée.**

---

## 3. Premium vs Free

| Feature | Premium | Plan Unique | Free | Source |
|---------|---------|-------------|------|--------|
| Bouton "🔄 Ajuster les semaines suivantes" | OK actif | Bloqué (CTA pricing) | Bloqué (CTA pricing) | `PlanView.tsx:2029-2051` (`canAccessPremiumFeatures`) |
| Modal 3 options Sprint G ("Pas la bonne séance ?") | Visible si Strava | Visible si Strava | **Visible si Strava** | `PlanView.tsx:1944` gate = `user?.stravaConnected` seul |
| Picker Strava 7-14j | Visible si Strava | Visible si Strava | **Visible si Strava** | `PlanView.tsx:2129-2143` même gate |
| `source='not_done'` skip Gemini | OK (skip explicite) | N/A pas d'adapt | N/A pas d'adapt | `handleValidateFeedback` L344 |
| Modal "Recalculer mes allures" (VMA) | OK plein | OK plein (`canViewFullPlan`) | **Modal blurred + CTA pricing** | `PlanView.tsx:2521,2578-2596` |
| `handleRecalculateVMA` côté App | OK | OK | Bail-out avec message | `App.tsx:1050-1054` (gate `isPremium || hasPurchasedPlan`) |
| Bouton "Analyser ma semaine" Strava | OK | Bloqué | Bloqué | `PlanView.tsx:1584` |

### Risque "fuite" identifié — non bloquant
Le lien "Pas la bonne séance ?" et le modal 3 options sont accessibles à **tout user avec Strava connecté**, y compris Free. **Pas une fuite Premium** car la feature finale (le picker + le re-tagging stravaData) **ne déclenche aucune action Premium-only** (pas d'adaptation Gemini : `handleValidateFeedback(false)` du chemin "Enregistrer sans modifier" reste accessible Free). Le seul vrai gate Premium = `Ajuster les semaines suivantes`, qui reste bien bloqué `L2029-2051`. **OK pour la doctrine sécurité : la transparence Strava n'est pas un gate de conversion**, c'est un fix UX.

---

## 4. Impact API

### Strava (200 req / 15 min, par token user)
- **Avant Sprint G** : un modal ouvert = 1 fetch ±1j sur `findStravaActivityForSession`. Pas de cache → 1 modal × N réouvertures = N hits.
- **Après Sprint G** : cache module-scope LRU 20, TTL 5 min (`stravaAnalysisService.ts:23-25`). Key = `userId:after:before` (`L27-28`).
- **Réduction nette** sur usage solo (modal ouvert plusieurs fois sur même séance dans 5min).
- **Picker** : 1 nouveau fetch fenêtre 7j ou 14j (`L437-458`), partagé par cache si le picker est rouvert.
- **Retry 429** : honore `Retry-After` (plafond 60s) sinon backoff exp `min(1000·2^i, 8000)ms`, max 3 tentatives (`L60-79`). **Throw FR coach-tone** après échec. OK.
- **Verdict** : quota Strava net **inchangé à réduit**. Aucun risque de hit limit additionnel.

### Gemini
- `not_done` → skip adaptation (`adaptationRequested:false` posé en dur `L344`). **Économie nette** (moins d'appels).
- Aucun nouvel appel ajouté côté Sprint G.
- **Verdict** : quota Gemini net **réduit**.

### Firestore writes
- `SessionFeedback` accepte champs optionnels `source` + `notDoneReason` (`types.ts:143-144`).
- Firestore rules `plans/{planId}` autorisent `write` plein pour owner (`firestore.rules:17`). **Aucun whitelist de champs** → nouveaux champs passent sans patch rules.
- **Verdict** : pas de patch rules requis.

### Capacitor mobile
- Aucun nouvel appel natif. Modals = pur React. `fetch` Strava passe par même chemin web.

---

## 5. Cas VMA — modal Recalculer

| Cas | Comportement attendu | Source |
|-----|----------------------|--------|
| Premium VMA confirmée | Modal active, recalc plein via `handleRecalculateVMA` (régénère semaines futures + warning ampleur changement) | `App.tsx:1046-1306` |
| Premium VMA non confirmée (mode `feeling`) | OK, `vmaFeeling` mappe à ±0.5/-1, calcul `currentVMA + adjustment` | `PlanView.tsx:2557-2575, 2619-2623` |
| Plan Unique | Modal active (`canViewFullPlan` true) | `PlanView.tsx:2521,2606` |
| Free | Modal blurred + overlay pricing CTA | `PlanView.tsx:2521,2578-2596` |
| Free clic Recalculer (shouldn't reach) | Bail-out backend `App.tsx:1050-1054` (defense en profondeur OK) | `App.tsx:1050` |

**`paceRecalibrationService.ts` n'est PAS branché** dans le flow VMA UI (`App.tsx:1046` utilise toujours `calculateAllPaces + generateRemainingWeeks` + `updateSessionPaces` inline `L1208-1234`). **Aucun side-effect au load** : le fichier est pure TS, exports nommés uniquement, pas de top-level execution.

---

## 6. Bugs bloquants — **AUCUN**

Rien qui empêche le deploy.

---

## 7. Bugs / observations non bloquants (V2)

| # | Sévérité | Description | Fichier | Recommandation |
|---|----------|-------------|---------|----------------|
| 1 | Bas | Le wording empty-picker dit "7 derniers jours Strava" en dur, mais la fenêtre peut être 14j si séance > 7j ancienne | `StravaActivityPicker.tsx:127` | Aligner sur `windowDays` dynamique |
| 2 | Bas | `setFeedbackSource('manual_no_strava')` posé quand user clique option (b) du modal 3 options, mais si user avait déjà un auto-match → le `setStravaMatch(null)` casse le bandeau Strava existant sans confirmation | `PlanView.tsx:2089` | Demander confirm ou conserver match si user revient en arrière |
| 3 | Bas | Pas d'invalidation cache appelée après `handleValidateFeedback` posant un `strava_user_corrected` → cache 5min reste consistant côté lecture, mais si user re-fetch picker dans la même minute, voit même liste (acceptable) | `PlanView.tsx:2134-2140` | Optionnel : `invalidateStravaCache(user.id)` après select picker |
| 4 | Très bas | `feedbackSource` state par défaut = `'strava_auto_matched'` (`L240`) — peut surprendre si modal s'ouvre sans Strava connecté. Mais corrigé immédiatement par `setFeedbackSource(...)` dans `handleOpenFeedback` `L297` | `PlanView.tsx:240` | Cosmétique |
| 5 | Info | F-17 `paceRecalibrationService.ts` exporte mais aucun import depuis `App.tsx` / `PlanView.tsx` → tree-shaking inclura quand même dans bundle test, mais pas le runtime (vérif via dev-tools réseau post-deploy si bundle size critical) | `services/paceRecalibrationService.ts` | OK, branchera plus tard |

---

## 8. Smoke tests recommandés post-deploy (5 cas)

1. **Premium + Strava connecté** : ouvrir feedback sur une séance avec auto-match → cliquer "Pas la bonne séance ?" → modal 3 options apparaît → cliquer (a) → picker affiche liste 7j → sélectionner une autre activité → vérifier que `feedback.source` = `'strava_user_corrected'` dans Firestore (lecture admin).
2. **Premium pas Strava** : ouvrir feedback → vérifier que lien "Pas la bonne séance ?" **n'apparaît pas** (gate `user?.stravaConnected` `L1944`). RPE/Notes/Ajuster les semaines = inchangés.
3. **Free + Strava connecté** : ouvrir feedback → vérifier que le lien "Pas la bonne séance ?" + picker s'ouvrent (Sprint G non Premium-gated par design) mais que le bouton "Ajuster les semaines suivantes" reste **verrouillé + CTA pricing** `L2042-2049`.
4. **Premium "Pas faite"** : ouvrir feedback → cliquer "Pas la bonne séance ?" → option (c) "Finalement je ne l'ai pas faite" → chip "douleur" → "C'est noté" → vérifier `feedback.completed=false`, `rpe=0`, `source='not_done'`, `notDoneReason='douleur'` en Firestore. Vérifier **AUCUN appel Gemini** (network tab).
5. **Premium Recalculer VMA** : ouvrir modal Recalculer mes allures → mode "VMA connue" → 14.5 → vérifier que `handleRecalculateVMA` régénère bien les semaines futures, conserve les semaines complétées avec leurs feedbacks, et que feasibility est mise à jour (`App.tsx:1147-1180`). Tester aussi avec un user Free → vérifier blur + CTA pricing.

**Critère go/no-go production** : si les 5 smoke tests passent, on déploie. Si #1 ou #4 échoue (mauvais flag `source`), rollback immédiat (les patches Firestore admin déjà exec restent intacts, ils ont leurs propres `ACTION=restore`).

---

## Annexes

- **Tests Vitest Sprint G écrits** (non exécutés ici car sandbox bloque l'exécution) :
  - `src/services/__tests__/strava-cache-retry.test.ts` — 8 tests (retry 429, header `Retry-After` plafonné 60s, backoff exp, scoping userId cache invalidation)
  - `src/utils/__tests__/feedbackSource.test.ts` — 14 tests (rétro-compat legacy, priorité explicite, robustesse null/undefined)
  - `src/utils/__tests__/stravaUsageIndex.test.ts` — 7 tests (Set+Map index, doublons activityId, plan vide)
  - **Recommandation** : lancer `npx vitest run src/services/__tests__/strava-cache-retry.test.ts src/utils/__tests__/feedbackSource.test.ts src/utils/__tests__/stravaUsageIndex.test.ts` avant push pour valider 29 tests.
- **F-17** : `src/services/__tests__/paceRecalibrationService.test.ts` (17) + `paceRecalibrationService-stress.test.ts` (28) = 45 tests pure TS, dormant (pas branché). Aucun risque deploy.
- **Patches admin Firestore** (Julien #1+#2, Robine, Lucas, Arnaud Renfo) : rollback dispo via `ACTION=restore` sur chaque script. Aucun impact UI front.
- **Capacitor mobile** : `StravaActivityPicker` modal full-screen `max-h-[85vh] flex flex-col` + tap targets `p-4` (≥44pt). Cartes activité `p-4` + `active:scale-[0.99]`. Loader gérant `state.status === 'loading'`. Erreur réseau → `state.status === 'error'` avec bouton Réessayer (`L133-151`). **Offline graceful : OK**.
