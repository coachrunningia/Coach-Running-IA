# Audit Dev Sprint G — UX Strava auto-match + correction

> Auditeur : Expert Dev senior (15 ans React/TS/Firebase/Capacitor).
> Date : 2026-05-27. Repo : `/Users/romanemarino/Coach-Running-IA`.
> Scope : flow "Je l'ai faite" → auto-match Strava → modal correction 3 options.

---

## 1. Structure fichiers — nouveaux composants vs étendre

Diagnostic : `PlanView.tsx` fait **2435 LOC** (déjà énorme, déjà monolithique). Ajouter le flow modal 3 options inline = +250 LOC ingérables. **On extrait**.

| Fichier | Action | LOC est. | Justification |
|---|---|---|---|
| `src/components/SessionFeedbackModal.tsx` | **CRÉER** (extract du JSX 1838-1932) | ~280 (move ~95 + nouveau ~185) | Séparer logique modal de PlanView qui sature |
| `src/components/StravaActivityPicker.tsx` | **CRÉER** (sous-modal liste 7j) | ~160 | Composant dédié, réutilisable bilan hebdo plus tard |
| `src/services/stravaAnalysisService.ts` | **ÉTENDRE** | +120 (cache LRU + retry + `fetchActivitiesLast7Days`) | Service existant, on n'éclate pas |
| `src/types.ts` | **ÉTENDRE** (`source` + `notDoneReason`) | +12 | Migration soft |
| `src/components/PlanView.tsx` | **ALLÉGER** (déléguer modal, ajouter `usedActivityIds` useMemo) | net -180 / +40 | Hook + props down |
| `src/services/storageService.ts` | **VÉRIFIER** (rétro-compat `source` absent) | 0-5 | Default `'manual_no_strava'` si legacy ? Voir §4 |
| `src/services/geminiService.ts` (ou équivalent adaptationContext) | **PATCHER** (skip `not_done`) | +8 | Doctrine sécurité, voir §6 |

**Total LOC nouveau code** ~620, dont ~280 sont du déplacement du modal existant. Net add ≈ 340 LOC.

---

## 2. Cache strategy — `fetchActivitiesForDateRange`

### Recommandation

**Map en mémoire (module-scoped) + TTL 5 min + retry 429 backoff exponentiel**. Pas localStorage (token-bound, multi-user risque, et SSR-safe pas requis ici car appel client-only).

```ts
// stravaAnalysisService.ts (top-level module scope)
type CacheEntry = { data: any[]; expiresAt: number };
const activitiesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20; // LRU soft, évite leak mémoire mobile Capacitor

const buildCacheKey = (userId: string, after: number, before: number) =>
  `${userId}:${after}:${before}`;
```

| Aspect | Choix | Justification |
|---|---|---|
| Structure | `Map<string, {data, expiresAt}>` | Plus simple qu'un LRU complet, suffisant pour 20 entrées |
| Key | `userId:afterSec:beforeSec` | Multi-user safe, range-précis |
| TTL | **5 min** | Compromis rate-limit 200req/15min vs fraîcheur post-activité Strava |
| Éviction | LRU soft : si `size > 20`, on supprime la plus ancienne (`Map` itère insertion order, `keys().next()`) | Safe pour 100+ users connectés sur la même session navigateur |
| Invalidation explicite | Exposer `invalidateStravaCache(userId)` → appelé après `updateSessionFeedback` qui pose un `stravaData` | Pas critique mais évite affichage stale après rattachement manuel |
| Webhook Strava | **HORS SCOPE Sprint G** (pas de webhook actif) | Doctrine `feedback_scope_strict` |

### Retry 429 — backoff exponentiel

```ts
const fetchWithRetry = async (url: string, opts: RequestInit, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    const retryAfter = parseInt(res.headers.get('Retry-After') || '0', 10);
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** i, 8000);
    await new Promise(r => setTimeout(r, wait));
  }
  throw new Error('Strava rate limit dépassé. Réessaie dans 15 min.');
};
```

| Param | Valeur |
|---|---|
| Max retries | 3 |
| Backoff | min(1000·2^i, 8000) ms, override par header `Retry-After` |
| Erreur finale | message FR coach-tone (pas un stack JS) |

---

## 3. Index `usedActivityIds` — useMemo

Scope = **plan courant uniquement** (doctrine `feedback_scope_strict`, pas cross-plan).

```ts
const usedActivityIds = useMemo(() => {
  const ids = new Set<number>();
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      const aid = s.feedback?.stravaData?.activityId;
      if (typeof aid === 'number') ids.add(aid);
    }
  }
  return ids;
}, [plan.weeks]);
```

| Aspect | Valeur |
|---|---|
| Signature retour | `Set<number>` (lookup O(1)) |
| Dépendance | `[plan.weeks]` — recalculé seulement si plan modifié |
| Taille mémoire pire cas | 30 sem × 5 sessions = 150 numbers ≈ 4.8 KB. Négligeable. |
| Position | Top-level du composant `PlanView`, passé en prop à `SessionFeedbackModal` |

**Tooltip grisé** : pour chaque activity grisée, on doit retrouver QUELLE séance la possède. Variante :

```ts
const usedActivityMap = useMemo(() => {
  const map = new Map<number, { type: string; date: string }>();
  // ... peuple {activityId → {type, date formaté DD/MM}}
}, [plan.weeks]);
```

→ même `useMemo`, retourne un objet `{ ids: Set, info: Map }`. **2 useMemo séparés**, plus lisibles.

---

## 4. Migration `SessionFeedback.source`

### Schema proposé

```ts
export type FeedbackSource =
  | 'strava_auto_matched'
  | 'strava_user_corrected'
  | 'manual_no_strava'
  | 'not_done';

export interface SessionFeedback {
  rpe: number;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  adaptationRequested?: boolean;
  stravaData?: StravaActivityMatch;
  source?: FeedbackSource;          // NEW — optionnel pour rétro-compat
  notDoneReason?: 'douleur' | 'fatigue' | 'manque_temps' | 'autre'; // NEW
}
```

| Question | Réponse |
|---|---|
| Optionnel ou required ? | **Optionnel**. Required casserait toutes les S1-S2 existantes en prod. |
| Fallback legacy (séances saved avant Sprint G) | Au read : `source ?? (stravaData ? 'strava_auto_matched' : 'manual_no_strava')`. Helper `inferSource(feedback)` centralisé. |
| Migration Firestore | **Aucune** (lazy migration). Quand user re-valide, `source` est posé. |
| Impact `completed: boolean` vs `not_done` | `not_done` → `completed: false`, `rpe: 0` ou `null`. **À trancher** : on garde `completed:false` mais on a un feedback (avant : pas de feedback = pas fait). Voir §6 régression `quickComplete`. |
| Impact Firestore rules | À vérifier — si rules whitelistent les champs de `feedback`, ajouter `source` + `notDoneReason` |

---

## 5. Edge cases non listés

| # | Cas | Mitigation |
|---|---|---|
| E1 | User clique 2× "Valider cette activité" (double-tap mobile) | `isSaving` déjà géré. **Vérifier** que `disabled={isSaving}` couvre AUSSI le bouton "Valider cette activité" du nouveau flow. |
| E2 | Race auto-match : modal fermé pendant `findStravaActivityForSession` en cours | `stravaRequestRef` déjà OK (ligne 288). Pattern à reproduire pour la fetch 7-jours. |
| E3 | Token Strava expiré pendant la session modal | `getValidToken` refresh auto (ligne 88). **Risque** : si refresh échoue → exception non gérée dans le picker. **Fallback** : catch → "Reconnecte ton compte Strava" + lien `/profile`. |
| E4 | User a coché "Je l'ai faite hors Strava" puis veut corriger en rattachant Strava | Doit pouvoir rouvrir modal et changer `source`. → bouton "Modifier le bilan" déjà existant (ligne 1843), garder. |
| E5 | Séance dans le passé éloigné (>7j, ex: rattrapage S3 d'il y a 2 semaines) | "7 derniers jours" du picker = **glissant depuis aujourd'hui**, donc une séance vieille de 10j ne trouvera rien. **Décision** : élargir à 14j si `sessionDate < today - 7j` ? **Recommandation PM call** : garder strict 7j pour Sprint G (scope) + message "Ta séance est trop ancienne pour être retrouvée automatiquement, saisie manuelle ou skip." |
| E6 | Multi-plans actifs (user a 10K + Trail en parallèle) | `usedActivityIds` scope plan courant. Une activité peut être rattachée à 2 plans (1 séance dans chaque) → **acceptable**, pas un bug. Doctrine `feedback_scope_strict`. |
| E7 | Réseau partiel (fetch 7j timeout en plein milieu) | `fetchWithRetry` retry 3× sur 429 mais **pas sur 5xx ni timeout**. Ajouter `AbortController` 10s + retry sur 502/503. |
| E8 | User Capacitor hors-ligne | `fetch` rejette → catch → état "Impossible de joindre Strava, sauvegarde locale tes notes". À tester sur device. |
| E9 | Activité Strava listée mais SUPPRIMÉE Strava-side entre fetch et validate | API renverra l'ID OK. Activity object aura `id`, validate poursuit. **Pas bloquant Sprint G**. |
| E10 | Plan préview (lock premium) — modal feedback accessible ? | Vérifier que `canAccessPremiumFeatures` gate cohérent (ligne 1906-1928 actuel). |
| E11 | RPE laissé à 5 par défaut sur `manual_no_strava` | Le défaut 5 force un input neutre. **OK** mais ajouter astérisque "Tu peux ajuster ce curseur." |
| E12 | `not_done` + user a coché par erreur "demande adaptation" | `not_done` → cacher bouton "Ajuster les semaines" entièrement. |

---

## 6. Risques régression — flows existants

| Flow | Risque | Mitigation |
|---|---|---|
| Auto-match ±1j (ligne 361-432 `findStravaActivityForSession`) | **NE PAS TOUCHER** sauf cache wrap | Wrapper `fetchActivitiesForDateRange` côté cache, pas la signature. |
| `updateSessionFeedback` (storageService:308) | `source` absent côté Firestore → undefined écrit. OK si rules permissives. | Test : sauvegarder un feedback legacy, relire, vérifier `source === undefined`. |
| `adaptationContext` Gemini (PlanView:390-412) | **CRITIQUE** : si `source === 'not_done'` injecté tel quel → Gemini reçoit `RPE: 0` ou `5` → adapt sur fausse donnée. | Garde `handleValidateFeedback` : `if (source === 'not_done') skip adaptation entirely, no Gemini call`. Doctrine `feedback_securite_avant_conversion`. |
| `recentRPEs` historique (ligne 360-367) | Inclut séances `not_done` actuellement | Filtrer : `if (s.feedback?.source === 'not_done') continue;`. |
| Sync Strava webhook | **Aucun webhook actif d'après audit** (juste OAuth refresh). Pas de régression. | OK. |
| `compareWeekWithStrava` (analyse hebdo) | Réutilise `fetchActivitiesForDateRange` → bénéficie du cache | OK, vérifier que cache hit ne pollue pas une autre vue. |
| `handleQuickComplete` (ligne 455) | Ne pose pas `source`. Compatible mais désaligné. | Ajouter `source: 'manual_no_strava'` quand `quickComplete(true)` et `source: 'not_done'` quand `quickComplete(false)` (= skip). Cohérence data Gemini. |

---

## 7. Tests unitaires Vitest à écrire

| # | Fichier | Test |
|---|---|---|
| T1 | `stravaAnalysisService.test.ts` | Cache HIT : 2 appels même range → 1 seul fetch réel |
| T2 | idem | Cache MISS après TTL 5min |
| T3 | idem | LRU éviction : 21e entrée → la 1re supprimée |
| T4 | idem | 429 → retry après `Retry-After` header |
| T5 | idem | 429 sans header → backoff exp (mock setTimeout) |
| T6 | idem | 3 retries successifs 429 → throw error message FR |
| T7 | idem | Token refresh transparent au cache (pas de poison) |
| T8 | `PlanView.test.tsx` | `usedActivityIds` Set contient bien tous les `stravaData.activityId` du plan |
| T9 | idem | Modal picker grise les activités présentes dans `usedActivityIds` |
| T10 | idem | Tooltip grisé affiche "Déjà rattachée à [Type] du [DD/MM]" |
| T11 | `SessionFeedbackModal.test.tsx` | source `strava_auto_matched` posée quand user clique "Valider cette activité" |
| T12 | idem | source `strava_user_corrected` quand picker → choix manuel |
| T13 | idem | source `manual_no_strava` quand "Hors Strava" |
| T14 | idem | source `not_done` quand skip + raison enregistrée |
| T15 | `adaptationContext.test.ts` | `source: 'not_done'` → AUCUN appel Gemini, AUCUN `adaptationContext` généré |
| T16 | idem | `recentRPEs` exclut les séances `source: 'not_done'` |
| T17 | `inferSource.test.ts` | Legacy feedback (sans `source`) + `stravaData` → `'strava_auto_matched'` |
| T18 | idem | Legacy feedback sans `stravaData` → `'manual_no_strava'` |

**Total ≈ 18 tests**. Budget : 1h30.

---

## 8. Ordre de coding optimal

```
[1] types.ts — ajout FeedbackSource + notDoneReason + helper inferSource()
       ↓ (bloquant typage tout le reste)
[2] stravaAnalysisService — cache + retry 429        ║  [3] usedActivityIds useMemo (PlanView)
       ↓                                             ║       (parallèle, indépendant)
[4] StravaActivityPicker.tsx (composant pur)         ║
       ↓                                             ║
[5] Extract SessionFeedbackModal.tsx + wire 3 options
       ↓
[6] Patch handleValidateFeedback : branchements source + skip Gemini si not_done
       ↓
[7] Patch handleQuickComplete : poser source cohérente
       ↓
[8] Tests Vitest T1→T18
       ↓
[9] QA manuelle device iOS (Capacitor) — focus E3, E7, E8
```

**Parallélisable** : [2] et [3] peuvent être codés en parallèle (un dev sur service, un sur PlanView hook). [4] dépend de [2] (utilise nouvelles fonctions). [5]+[6] séquentiels.

---

## 9. Estimation temps

| Étape | Temps | Notes |
|---|---|---|
| [1] Types + helper | 20 min | + tests T17/T18 |
| [2] Cache + retry 429 | 50 min | + tests T1-T7 (cœur risque) |
| [3] useMemo index | 20 min | + tests T8 |
| [4] StravaActivityPicker | 1h10 | UI liste + grisage + tooltip + tests T9/T10 |
| [5] Extract + nouveau modal 3 options | 1h30 | Move JSX existant + ajout flows |
| [6] Patch adaptationContext skip not_done | 30 min | + tests T15/T16 (sécurité critique) |
| [7] Patch quickComplete cohérence | 15 min | |
| [8] Tests restants + QA | 50 min | T11-T14 |
| [9] QA iOS device | 30 min | edge cases E3/E7/E8 |
| **TOTAL** | **~6h15** | |

**Écart vs estimation PM (5h30-6h30)** : aligné fourchette haute. Justification : extraction modal (+1h) sous-estimée par PM, mais on gagne en testabilité et lisibilité long-terme. Si on garde le modal inline dans PlanView : -45 min, mais dette technique sur fichier déjà à 2435 LOC.

---

## 10. Verdict final

### **GO sous condition**

5 MUST-DO avant de coder :

1. **PM call edge case E5** : 7j strict vs 14j si séance ancienne. Recommandation = 7j strict + message clair. → Romane tranche.
2. **PM call notDoneReason enum** : `'douleur' | 'fatigue' | 'manque_temps' | 'autre'` suffit ? Ou besoin d'un free-text additionnel pour Gemini context (même si on n'injecte pas la séance, on peut injecter "user a skippé 2 séances pour douleur" en signal global) ? Recommandation = enum + free-text optionnel.
3. **Vérifier Firestore rules** : champs `source` et `notDoneReason` whitelistés dans les rules ? Si validation stricte, ajouter avant déploiement (sinon 403 silencieux).
4. **Confirmer doctrine `not_done` → Gemini** : skip TOTAL (pas d'appel) OU appel avec contexte "séance non faite, ne pas adapter" ? Recommandation expert = **skip total** côté `handleValidateFeedback` (pas de bouton "Ajuster" affiché), mais le compteur `missedSessions` du contexte adaptationContext (ligne 373) doit AGRÉGER les `not_done` pour signaler la tendance. Distinction subtile mais importante.
5. **Capacitor offline** (E8) : la nouvelle UX assume fetch Strava disponible. Sur device offline, dégrader gracieusement vers `manual_no_strava` + `not_done` uniquement (cacher les 2 boutons Strava). → 10 min de code en plus.

Une fois ces 5 points clarifiés, le code peut démarrer sans risque sur les flows existants. L'auto-match ±1j n'est **pas touché**, doctrine `feedback_securite_avant_conversion` enforced via `source: 'not_done'` qui skip Gemini.

---

**Chemin absolu** : `/Users/romanemarino/Coach-Running-IA/AUDIT-EXPERT-DEV-SPRINT-G.md`
**Verdict** : GO sous condition (5 MUST-DO clarifiés par Romane avant 1re ligne de code).
