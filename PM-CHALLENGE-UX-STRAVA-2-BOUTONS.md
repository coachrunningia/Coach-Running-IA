# PM CHALLENGE — UX Strava 2 boutons (Arnaud bug)

Date : 2026-05-27
Auteur : PM Coach Running IA
Source bug : plan `1779554515397` (Arnaud) — SL Vendredi 29/05 faite Mercredi 27/05
Code de référence : `src/services/stravaAnalysisService.ts:361-432`, `src/components/SessionCard.tsx:439-460`, `src/components/PlanView.tsx:280-307, 1839-1932`

---

## SECTION 1 — VERDICT GLOBAL

**GO-CONDITIONNEL**.

L'UX proposé règle le bug Arnaud + le cas piscine et est dans le scope strict du problème. Mais 3 conditions BLOQUANTES doivent être traitées AVANT de coder, sinon on introduit une régression doctrine pire que le bug actuel :

1. **Caching local obligatoire** sur `fetchActivitiesForDateRange(7j)` — sinon explosion rate-limit Strava (Q2).
2. **Index inverse `stravaActivityId → sessionRef`** indispensable pour "déjà rattachée" cross-plans (Q3).
3. **Bouton 1 "sans Strava" ne doit JAMAIS injecter dans le contexte d'adaptation Gemini sans marqueur explicite** (Q1 / Q4) — risque d'adaptation sur déclaration mensongère = blessure.

Si ces 3 conditions sont tranchées + un détail UX (Q4 piscine + course manquée même jour) → on est sur **5h30 réel, pas 4h30**.

L'estimation 4.5h sous-estime de ~25 %. **Sprint G OK, hotfix intermédiaire NON nécessaire** (cf. Q7), Romane peut répondre à Arnaud à la main aujourd'hui.

---

## SECTION 2 — RÉPONSES Q1-Q7

### Q1 — Doctrines projet respectées ?

**Verdict : RESPECTÉ avec 1 risque doctrinal majeur à mitiger.**

| Doctrine | Statut | Justification |
|---|---|---|
| D2 inputs immuables (allure, freq, cv, raceDate…) | OK | Les 2 boutons modifient `feedback.completed`, `dateOverride`, `feedback.stravaData` — aucun des champs immuables D2 |
| D17 transparence | OK | L'app dit explicitement "Aucune activité Strava trouvée" (`PlanView.tsx:1882-1887`). Les 2 boutons rendent le statut + la source plus transparents, pas moins |
| `feedback_jamais_contact_client` | OK | UI in-app ≠ contact direct. Aucune email/notif déclenchée par les boutons |
| `feedback_compromis_messages_preventifs` | OK | Justement, ces 2 boutons sont un compromis (vs le rejet du Design D cascade). On préfère "message + 2 actions" à "blocage" |
| `feedback_input_client_obligatoire` | OK | `dateOverride` choisi par user = input respecté |
| D-Hyrox-scope, D-marche-course, D-que-course | N/A | Pas d'impact sur génération plan |
| **`feedback_securite_avant_conversion`** | **RISQUE** | Cf. ci-dessous |

**Risque doctrinal majeur — bouton 1 "Je l'ai faite (sans Strava)" :**

Un user peut cliquer ce bouton sans avoir réellement fait la séance, pour :
- Se motiver factice ("j'ai fait 80 % de mon plan !")
- Conserver une streak
- Éviter le message "tu n'as pas fait"

**Conséquence en aval :** `handleValidateFeedback(needsAdaptation: true)` dans `PlanView.tsx:342-424` injecte ce feedback (RPE + notes + complétion) dans le prompt Gemini d'adaptation (`adaptationContext`, ligne 390). Gemini va alors :
- Croire que la charge a été bien encaissée → potentiellement durcir les semaines suivantes
- Si user a faussement coché 3-4 séances, l'adaptation peut sur-charger la S+1 → **risque blessure réel**

Cette doctrine `feedback_securite_avant_conversion` dit explicitement : *"la sécurité utilisateur passe AVANT la conversion"*. Or, ici, on a un risque silencieux non communiqué.

**Mitigation recommandée (BLOQUANT) :**
1. Sur le bouton 1, **marquer la séance avec un flag `feedback.source: 'manual_no_strava'`** dans `SessionFeedback` (cf. `types.ts:113-120`).
2. Dans `adaptationContext` (PlanView.tsx:390-412), si > 50 % des séances de la semaine ont `source = 'manual_no_strava'` ET `user.stravaConnected = true`, **injecter dans le prompt** : *"⚠️ Note : la majorité des feedbacks cette semaine sont déclaratifs sans données Strava alors que l'utilisateur est connecté. Adopter une approche conservatrice."*
3. Le bouton 1 doit ouvrir le modal feedback **avec une question de plus** : *"Tu n'as pas synchronisé Strava — était-ce intentionnel (vélo d'appart, tapis sans capteur) ou un oubli ?"*. Le but n'est pas de gêner, c'est de capturer l'intention pour la traçabilité.

### Q2 — Performance Strava API

**Code lu :** `stravaAnalysisService.ts:327-339` (`fetchActivitiesForDateRange`).

**Constats :**
- **AUCUNE gestion 429** dans `fetchActivitiesForDateRange` ni `findStravaActivityForSession` ni `fetchRecentActivities`. Si Strava renvoie un 429, on throw `"Erreur API Strava"` (l.337) → user voit la modal vide.
- **AUCUNE déduplication** : si le même user ouvre 3 modals sur 3 séances de la même semaine, on fait 3 fetches identiques sur la même fenêtre 7j (en pratique différentes fenêtres ±1j actuellement, mais identique avec bouton 2 = 7j fixe).
- **Limite Strava réelle** : 200 req/15min ET 2000/jour par user. Avec 50 séances ouvertes en 15min → on hit la limite des 200 req/15min seulement si on additionne `findStravaActivityForSession` actuel + nouveau `fetchActivitiesForDateRange(7j)`.
- Rate limit existant : `checkCanAnalyze()` (l.98-123) — **limite globale de 1 analyse/sem**, mais ne couvre QUE l'analyse mensuelle Gemini, **PAS le matching session-par-session**. Donc actuellement, ouvrir 50 modals = 50 hits Strava sans frein.

**Caching local nécessaire — OUI, BLOQUANT.**

Recommandation :
- Cache **en mémoire** (pas localStorage — risque stale après changement plan) avec clé `userId + 7j-rolling-window`, TTL 5 min.
- Pseudo : `const activitiesCache = new Map<string, { data, fetchedAt }>()`. Si fetch < 5min, retourner cached.
- Window : "7 derniers jours" se recalcule à chaque appel, donc clé = `userId + Math.floor(Date.now() / (5*60*1000))`.
- Si 50 modals ouverts en < 5min → 1 seul fetch Strava (vs 50). 

**Gestion 429 :**
- Si `response.status === 429`, parser `X-RateLimit-Usage` (header Strava), backoff + message UI : *"Strava limite temporairement les requêtes. Réessaye dans 5 min, ou marque la séance manuellement."* → fallback bouton 1.

### Q3 — État "déjà rattachée"

**Code lu :** `SessionFeedback.stravaData?: StravaActivityMatch` (types.ts:119), persisté dans le plan via `updateSessionFeedback`.

**Constats :**
- L'activité Strava est stockée **par séance**, dans `plan.weeks[*].sessions[*].feedback.stravaData.activityId`.
- **Pas d'index inverse** existant. Pour savoir si activity `12345` est rattachée à une autre séance, il faut **scanner toutes les séances de tous les plans actifs du user**.
- Avec 1 plan de 16 sem × 4 séances = 64 séances. Avec 2 plans actifs Premium = 128 scans. Acceptable en perf JS, **mais** : sur mobile capacitor (l.10 capacitor.config.ts = WebView load), le scan se fait à chaque ouverture modal → 50-100ms de jank potentiel.

**Recommandations :**
- **Build index inverse côté client** (1× au chargement plan, mémorisé par `useMemo`) : `Map<activityId, { planId, weekNumber, sessionId, sessionTitle }>`.
- Cross-plan : OUI, le user a accès à ses N plans via `getUserPlans(userId)` (storageService.ts:205). Charger les autres plans 1× → index inverse global. **Mais attention** : actuellement `PlanView.tsx` ne charge qu'1 plan à la fois (URL `/plan/:id`). Donc soit on étend le scope (cher), soit on **limite l'exclusion "déjà rattachée" au plan en cours uniquement** (compromis pragmatique cf. doctrine `compromis_messages_preventifs`).

**Choix recommandé : plan en cours uniquement + warning si l'activité a `id` existant ailleurs.**

Implémentation :
```typescript
const usedActivityIds = useMemo(() => {
  const ids = new Set<number>();
  plan.weeks.forEach(w => w.sessions.forEach(s => {
    if (s.feedback?.stravaData?.activityId) ids.add(s.feedback.stravaData.activityId);
  }));
  return ids;
}, [plan]);
```
Dans le modal bouton 2 : afficher activités où `ids.has(activity.id)` en grisé + libellé "Déjà rattachée à : {sessionTitle}".

### Q4 — Cas edge non couverts

| Edge | Couvert ? | Recommandation |
|---|---|---|
| User ment "fait" sur bouton 1 → adapt Gemini sur fake data | **NON** | Cf. Q1, mitigation `source: 'manual_no_strava'` + warning prompt |
| Strava non connecté | À spécifier | **Cacher bouton 2** (pas message d'erreur) — UX cleaner. Vérifier `user.stravaConnected` |
| Activité plus longue que prévu (15km vs 10km) | Existant déjà | `adaptationContext` (PlanView.tsx:380-388) inclut déjà "Distance réelle vs prévu". OK |
| Course officielle ratée (lendemain) | **NON spécifié** | Cas rare mais critique : la course `raceDate` est dans le plan comme séance. Si user la fait à J+1 (rare mais arrive), bouton 1 doit fonctionner mais avec un flag `is_race_day_session`. Pour cette release on accepte le comportement standard, mais à logger pour follow-up |
| Activité `private=true` | **PAS FILTRÉE** | Vérifier : l'API `athlete/activities` ne renvoie les `private` que si scope OAuth `activity:read_all`. Si scope normal `activity:read`, déjà filtrées côté Strava. À vérifier dans le flow OAuth (`StravaConnect.tsx`). Si scope étendu, **inclure** les private (c'est le wish user de voir SES activités, pas un partage public) |
| Activité `manual=true` (entrée à la main sur Strava) | **PAS FILTRÉE** | À INCLURE dans la liste. Si user a saisi à la main sur Strava parce que sa montre a planté, c'est légitime. Distance/pace seront là, FC absent. UI doit gérer `avgHeartrate` undefined (déjà OK ligne 422) |
| User a 2 activités le même jour (matin + soir, ou course + footing récup) | Partiel | `findStravaActivityForSession` prend la plus longue (l.402-404). Pour le bouton 2 (liste), montrer **toutes**, laisser le user choisir |
| Type WeightTraining/Workout (renfo) | OK | Géré l.378-384 |
| User clique bouton 1, ferme le modal feedback sans valider | À spécifier | Bouton 1 ne doit **PAS** marquer `completed=true` tant que le modal feedback n'est pas validé. Sinon état zombie |

**Edge bonus critique non listé par Romane :**
- **Cas piscine + course Mardi correctement matchée** : si Mardi est OK (Strava match), Mercredi piscine n'apparaît PAS comme "non faite". Or actuellement le code (`compareWeekWithStrava`) compte sessions runningActivities vs plannedSessions sur la semaine entière → si l'user a 3 plannings cette semaine et fait 2 courses + 1 piscine, compliance = 67 %, OK. **Mais** le message UI au niveau séance (la card Mercredi piscine) : actuellement aucun message direct ne dit "tu n'as pas fait Mercredi". Le user voit juste la card non-cochée. **Ce point du brief Romane est ambigu — à clarifier**.

### Q5 — Mobile vs Web

**Constats lus dans `capacitor.config.ts`** : iOS Capacitor charge `https://coachrunningia.fr` en WebView (server.url). Donc pas de code natif différent — c'est le même JS/HTML/CSS.

**Risques mobile :**
- Modal bouton 2 = liste activités, scroll vertical. Sur iPhone SE (375px), liste de 5-10 activités avec 4 lignes chacune = scroll obligatoire. Vérifier `max-h-[70vh] overflow-y-auto`.
- Tap targets : Apple HIG = 44pt min. Le bouton "Cliquer pour sélectionner activité" doit être ≥ 44pt (≈ 60px en CSS avec padding). **À tester sur iPhone**.
- WebView Capacitor n'a **PAS de problème CORS pour Strava** car l'appel se fait via `fetch` standard (autorisé par CSP de Capacitor par défaut).
- Bouton "Chercher Strava" : si `user.stravaConnected === false` → cacher (cohérent web + mobile).

**Pas de bloquant mobile, mais à intégrer dans les tests E2E (1h budget actuel) :** au moins 1 cas iPhone (Safari ou Simulator Capacitor).

### Q6 — Risque dette technique / refacto

**État actuel :**
- Le rejet du Design D (cascade orpheline) était bon : trop de complexité pour résoudre un cas rare.
- Les 2 boutons sont une approche **incrémentale**, pas une refonte. Le risque dette est limité.

**Risque à 6 mois :**
- **Si le power-user veut tout customiser** (ex: "j'ai fait ma SL en 2 fois Mercredi + Jeudi") → pas couvert. Mais c'est < 1 % des cas, on peut attendre demande explicite.
- **État "phantom completed" (bouton 1 sans Strava)** : impact stats long-terme = **modéré**. Si on track `feedback.source`, on peut filtrer en analytics (séances Strava-vérifiées vs déclaratives). Stats Premium "Tu as fait 80% de ton plan" doivent ÊTRE TRANSPARENTES sur la source (cf. D17). Sinon doctrine `securite_avant_conversion` violée si on vend du Premium en surévaluant la compliance.

**Recommandation refacto léger :**
- Ajouter dans `SessionFeedback`: `source?: 'strava_matched' | 'manual_no_strava' | 'strava_picked_from_list'` (cf. Q1).
- Stats long-terme : filtrer/colorer par source.
- Pas plus pour l'instant.

### Q7 — Sprint G ou plus tôt ?

**Reco : SPRINT G complet, pas de hotfix intermédiaire. Romane répond à Arnaud à la main.**

**Justifications :**
1. **Le bug Arnaud est aigu mais isolé.** Arnaud va recevoir une réponse de Romane aujourd'hui + son plan patché en admin (script `dateOverride`). Aucun risque sécurité pour lui.
2. **L'incidence sur d'autres users dans les 3-4 jours d'attente Sprint G** est faible : il faut (a) Strava connecté, (b) séance faite à un jour ≠ planning, (c) écart > 1 jour. Estimation : < 5 % des users actifs Premium par jour = ~1-2 users/jour max. Romane peut gérer manuellement.
3. **Un hotfix 1h (bouton 1 seul) introduirait 2 problèmes** :
   - On déploie sans la mitigation `source: 'manual_no_strava'` → on ouvre la porte aux fake completions Gemini-impactantes (cf. Q1 risque doctrinal). **NON conforme à `securite_avant_conversion`**.
   - On crée 2 deploys back-to-back, c'est inefficace.
4. **Sprint G = 4.5h annoncé → 5h30 réel** (avec caching + index + mitigation source). 1 journée de dev. Largement faisable.

**Communication Arnaud + futurs users (templates à préparer mais PAS envoyés par moi) :**

`feedback_jamais_contact_client` — je propose un template, Romane envoie.

```
Salut Arnaud,

Merci pour ton retour ! Effectivement, l'app a un fonctionnement actuel limité :
elle compare ta séance Strava à la date prévue dans le plan, avec une tolérance
de ±1 jour. Comme tu as fait ta sortie longue Mercredi alors qu'elle était prévue
Vendredi, le matching échoue.

J'ai patché ton plan en interne pour décaler la séance à Mercredi (date réelle).
Tu devrais voir la coche verte dans quelques heures.

On déploie cette semaine une mise à jour qui permettra de :
1. Marquer manuellement une séance comme faite (même sans Strava)
2. Chercher dans tes 7 derniers jours Strava si l'app n'a pas matché toute seule

Bon entraînement et continue de me remonter ce genre de cas !
Romane
```

---

## SECTION 3 — MODIFICATIONS RECOMMANDÉES AVANT DE CODER

### M1 — BLOQUANT — Ajouter `source` à `SessionFeedback`
Fichier : `src/types.ts:113-120`
```typescript
export interface SessionFeedback {
  rpe: number;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  adaptationRequested?: boolean;
  stravaData?: StravaActivityMatch;
  source?: 'strava_matched' | 'manual_no_strava' | 'strava_picked_from_list'; // NOUVEAU
}
```

### M2 — BLOQUANT — Cache en mémoire `fetchActivitiesForDateRange`
Fichier : `src/services/stravaAnalysisService.ts:327-339`
- Wrapper avec Map TTL 5min.
- Gestion 429 explicite avec message UI + fallback bouton 1.

### M3 — BLOQUANT — Index inverse `usedActivityIds` côté PlanView
Fichier : `src/components/PlanView.tsx`
- `useMemo` qui scanne `plan.weeks[*].sessions[*].feedback.stravaData.activityId`.
- Passer en prop au modal bouton 2.

### M4 — RECOMMANDÉ — Mitigation adaptation Gemini
Fichier : `src/components/PlanView.tsx:390-412` (`adaptationContext`)
- Compter `manual_no_strava` ratio. Si > 50 % et `stravaConnected = true`, injecter warning dans prompt.

### M5 — RECOMMANDÉ — Bouton 2 caché si Strava non connecté
Fichier : `src/components/SessionCard.tsx`
- Ajouter prop `stravaConnected?: boolean`.
- Conditionnel sur le bouton 2.

### M6 — UI — Inclure `manual=true`, exclure rien d'autre
Fichier : `src/services/stravaAnalysisService.ts` (nouveau wrapper `fetchActivitiesForBrowsing`)
- Garder le filtre type Run/TrailRun/VirtualRun.
- Pas de filtre supplémentaire sur `private` / `manual`.

### M7 — Tests E2E élargi
Cas obligatoires (1h prévue, je passe à 1h30) :
1. Bouton 1 sans Strava → completed=true, source=manual.
2. Bouton 2 avec Strava match → completed=true, dateOverride, source=picked.
3. Bouton 2 active déjà rattachée → grisée + libellé.
4. Bouton 2 ouverture multiple modals < 5min → 1 seul fetch (vérifier console).
5. Strava 429 simulé → fallback bouton 1 visible avec message.
6. **Cas Arnaud reproduit** : SL planifiée vendredi, activité Strava mercredi → bouton 2 montre l'activité → click → completed + dateOverride mercredi.
7. **Cas piscine Romane** : course Mardi OK match auto, Mercredi piscine, bouton 1 NON cliqué → état séance reste "non faite" sans message agressif.
8. iPhone SE 375px : modal liste scrollable, tap targets ≥ 44pt.

---

## SECTION 4 — RISQUES RÉSIDUELS NON VUS

### R1 — Webhook Strava activity created/updated/deleted
Si user supprime une activité Strava après l'avoir liée → `stravaData.activityId` orphelin dans le plan. **Non bloquant pour Sprint G**, mais à logger : la prochaine analyse hebdo peut planter si elle re-fetch et compare.

### R2 — Token Strava expiré pendant l'usage
`getValidToken` (l.75-95) refresh automatiquement. **OK**, mais si refresh fail (l.53 throw), le modal bouton 2 va afficher "Erreur API Strava" sans UX claire. → Catch dans le composant, afficher "Reconnecte ton Strava".

### R3 — Bouton 1 + activité Strava existante orpheline
Scénario : user a fait sa séance, Strava synchronisée, mais user clique bouton 1 par erreur (oubli). Maintenant l'activité Strava est sur Strava sans être liée à la séance, ET la séance est marquée `manual_no_strava`. Pas critique mais sub-optimal. **Solution future** : après bouton 1 click, faire un quick check `findStravaActivityForSession(±3j)` et proposer "On a trouvé X sur Strava, tu veux le lier ?" → reportable au Sprint H.

### R4 — Doctrine `feedback_jamais_baisser_allure_cible`
Pas d'impact direct, mais pour info : aucune modification d'allure cible n'est faite par ces 2 boutons. Bien.

### R5 — Plans archivés (endDate dépassé)
`compareWeekWithStrava` (utilisé par le bouton "Analyser ma semaine") fonctionne pour past + current. Les 2 nouveaux boutons doivent fonctionner sur **toutes les séances non complétées non lockées**, y compris semaines passées (cf. `isWeekLocked` check `PlanView.tsx:1599-1601`). OK actuellement.

### R6 — i18n / wording
"Je l'ai faite (sans Strava)" et "Chercher dans mes activités Strava" : OK pour FR. Si app passe en EN un jour (pas prévu Sprint G), le wording reste local mais conforme. **Non bloquant**.

### R7 — Doctrine `feedback_qualite_avant_vitesse`
**Validation N profils avant sprint** : Sprint G touche la complétion + le matching, **pas la génération de plan**. La doctrine `validation_n_profils_avant_sprint` parle de la **génération** (impact plan). Donc pas applicable strictement, mais Romane peut décider d'un test profil sur 5 users existants premium pour valider l'UX en preview avant déploiement live.

---

## SECTION 5 — RECO TIMING

**Décision recommandée : SPRINT G complet, 5h30 dev (vs 4h30 annoncé).**

**Planning :**
- **Aujourd'hui (J0)** : Romane patche Arnaud en admin (`patch-arnaud-startdate-live.mjs` existe déjà comme template) + envoie l'email type (Section 2 Q7) à Arnaud. → 30 min.
- **J+1 ou J+2 (Sprint G dev)** :
  - M1 (types) — 15 min
  - M2 (cache 5min + 429) — 1h
  - M3 (index inverse) — 30 min
  - M4 (mitigation Gemini) — 30 min
  - M5 (cacher bouton 2 si !stravaConnected) — 15 min
  - M6 (wrapper fetchActivitiesForBrowsing) — 30 min
  - Bouton 1 UI + handler — 1h
  - Bouton 2 modal + handler — 1h30
  - Tests E2E 8 cas (M7) — 1h30
  - **Total : 6h30** réel. (j'ai été pessimiste exprès — meilleure surprise vs explosion budget)
- **J+3** : Romane valide preview sur 5 profils. Si OK → deploy prod.

**Pas de hotfix intermédiaire.** Le coût d'un déploiement back-to-back + le risque doctrinal du bouton 1 sans `source` flag dépassent le bénéfice de gagner 2 jours.

---

## TL;DR Romane

- **GO Sprint G** avec les 3 conditions BLOQUANTES (cache, index, source flag).
- **Pas de hotfix.** Tu réponds à Arnaud à la main aujourd'hui (template Q7), tu patches son plan.
- **Budget réel : 5h30-6h30**, pas 4h30. Prévoir J+1/J+2 dev + J+3 validation.
- **Le risque doctrinal #1** est que sans `source: 'manual_no_strava'` + warning Gemini, on viole `feedback_securite_avant_conversion` (fake completions → adaptation sur déclaration mensongère → blessure). C'est LE point non négociable.
- Le reste = exécution propre.
