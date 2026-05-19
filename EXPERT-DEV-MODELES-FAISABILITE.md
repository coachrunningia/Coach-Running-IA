# Expert Dev — Faisabilité migration modèles Gemini

Date : 2026-05-19
Rôle : Dev senior 15+ ans, TypeScript/Node, anti-régression
Mission : valider la **faisabilité technique** de migrer les appels Gemini de l'app vers `gemini-3-flash` / `gemini-3-pro`.

---

## 1. Audit technique actuel

### 1.1 SDK installés

```json
"@google/generative-ai": "^0.24.1",   // ← UTILISÉ (ancien SDK, déprécié upstream)
"@google/genai": "^1.35.0",           // ← INSTALLÉ MAIS JAMAIS IMPORTÉ
```

**Verdict** : le code utilise exclusivement l'**ancien SDK** `@google/generative-ai@0.24.1`. Le nouveau SDK officiel `@google/genai@1.35.0` est listé dans `package.json` mais **aucun import dans `src/`**. C'est mort.

**Impact migration 3.x** :
- Google a explicitement déprécié `@google/generative-ai` au profit de `@google/genai`. Les modèles 3.x sont annoncés sur le nouveau SDK en priorité.
- L'ancien SDK accepte historiquement n'importe quelle string en `model:` et la transmet à l'API REST `v1beta` (rétro-compatible). Il faut tester en réel mais la string `gemini-3-flash` *devrait* passer.
- **Risque** : si Google retire la route `v1beta/models/gemini-3-*` de l'ancien SDK ou y limite les features (ex. responseSchema strict, thinking), il faudra migrer vers `@google/genai` (qui est déjà installé, donc 0h d'install).

### 1.2 Pattern d'appel utilisé partout

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: { responseMimeType: "application/json", maxOutputTokens: N },
});
const text = result.response.text();
const parsed = JSON.parse(text);
```

Aucun `responseSchema` structuré. Aucun `safetySettings`. Aucun `temperature`/`topK`/`topP` (sauf 1 site = 0.1). 1 seul `systemInstruction` (sur 7). Pas de streaming. Pas de timeout côté client. Retry uniquement sur 1 site (generateRemainingWeeks).

### 1.3 Tableau des 7 appels actifs

| # | Fichier:Ligne | Fonction | Modèle | gen.Config | systemInstr. | Retry | Try/Catch | Parsing |
|---|---|---|---|---|---|---|---|---|
| 1 | `geminiService.ts:499` | `correctFrenchWithAI` | `gemini-2.5-flash` | `temperature:0.1, maxOutputTokens:4096` | non | non | oui, **non-bloquant** (fallback : garde textes originaux) | regex `\{[\s\S]*\}` puis `JSON.parse` |
| 2 | `geminiService.ts:3338` | `generatePreviewPlan` | `gemini-2.5-flash` | `responseMimeType:"application/json"` (pas de maxOutputTokens, pas de temp) | non | non | oui (try/catch de la fonction) | `JSON.parse(text)` direct, **pas de fallback** |
| 3 | `geminiService.ts:4459` (appel L4666) | `generateRemainingWeeks` (batched) | `gemini-2.5-flash` | `responseMimeType:"application/json", maxOutputTokens:65536` | non | **oui, 3x backoff 5s×n sur 429** | oui, **propage l'erreur** après 3 retries | `JSON.parse(text)` |
| 4 | `geminiService.ts:5795` | `adaptPlanFromFeedback` | `gemini-2.5-flash` | `responseMimeType:"application/json"` | **oui** (`systemInstruction: systemWithContext`) | non | oui, fallback `{adaptationSummary, modifications:[]}` si parse fail | extraction robuste + `JSON.parse` |
| 5 | `planValidator.ts:877` (appel L878) | `aiReviewPlan` (Layer 2) | `gemini-2.0-flash` | `responseMimeType:"application/json", maxOutputTokens:2048` | non | non | oui, fallback review neutre score=70 | `JSON.parse(text)` |
| 6 | `planValidator.ts:911` (appel L978) | `generateCorrectedWeeks` (Layer 3) | `gemini-2.0-flash` | `responseMimeType:"application/json", maxOutputTokens:4096` | non | non | oui, propage erreur | `JSON.parse(text)` |
| 7 | `stravaAnalysisService.ts:187` (appel L308) | `analyzeActivitiesWithGemini` | `gemini-2.5-flash` | `responseMimeType:"application/json"` (pas de maxOutputTokens, pas de temp) | non | non | **aucun try/catch local** (propagé au caller) | `JSON.parse(text)` direct |

**Note** : `geminiService.ts:5326` est du **dead code** (variable `model` shadowée immédiatement par `adaptationModel` L5795 et jamais utilisée).

### 1.4 Tests anti-régression existants

- `test-sprint1-15-profils.mjs`, `test-sprint2-15-profils-feasibility.mjs`, `test-sprint3-finisher-profils.mjs` : tests Node qui **reproduisent la logique déterministe** (calculs VMA, allures, périodisation, enforce constraints). **Aucun appel LLM réel.**
- Pas de runner E2E qui appelle vraiment l'API Gemini. Donc **aucun test anti-régression au sens LLM** aujourd'hui.

### 1.5 Logging / telemetry

- `console.log` / `console.warn` / `console.error` partout, taggés (ex. `[Gemini Preview]`, `[FrenchAI]`, `[Gemini Remaining]`, `[Gemini Adaptation]`, `[PlanValidator]`).
- **Aucune métrique structurée** : pas de latence loggée, pas de tokens loggés, pas de coût loggé. Impossible aujourd'hui de mesurer l'impact d'un changement de modèle sans tooling supplémentaire.

---

## 2. Compatibilité modèles 3.x

| Critère | SDK actuel `@google/generative-ai@0.24.1` | Statut |
|---|---|---|
| Passer la string `gemini-3-flash` / `gemini-3-pro` | Le SDK ne valide pas la string, la passe brute à `v1beta/models/{model}:generateContent`. Devrait fonctionner si l'endpoint accepte. | **À tester en réel — pas de blocage code prévisible** |
| `responseMimeType: "application/json"` | Supporté nativement sur 2.x. Sur 3.x : Google maintient le contrat, mais le mode strict change vers `responseJsonSchema` (nouveau SDK). | **OK en mode JSON souple, à vérifier en strict** |
| `responseSchema` structuré (Zod-like) | Non utilisé aujourd'hui → pas de risque de régression sur ce critère. | **N/A (non utilisé)** |
| `systemInstruction` | Supporté depuis 0.10 du SDK actuel. Format `{ model, systemInstruction }`. | **OK identique** |
| Streaming (`generateContentStream`) | Non utilisé. | **N/A** |
| `safetySettings` | Non utilisé. Les modèles 3.x peuvent avoir des défauts plus stricts → à monitorer (erreurs de type BLOCKED_SAFETY). | **Vigilance** |
| `maxOutputTokens: 65536` (lot remaining) | Sur 3-flash, la limite output est typiquement 8192-65536 selon le tier. Sur 3-pro, la limite peut être plus basse. **À vérifier dans la fiche modèle officielle.** | **Risque** |
| Tokens d'entrée (context window) | 2.5-flash ≈ 1M tokens. 3-flash / 3-pro : annoncés ≥ 1M. Prompts coach ≈ 20-50k tokens → aucun problème. | **OK** |
| Rate limits | Free tier 3-pro probablement plus strict que 2.5-flash. **Rate limits 3.x à vérifier dans la console Cloud avant rollout.** | **À vérifier** |
| Latence | 3-flash annoncé ~comparable à 2.5-flash. **3-pro peut être 3-5x plus lent**, surtout sur output 60k+ tokens. | **Risque latence sur Pro** |

**Recommandation SDK** : **upgrader vers `@google/genai`** en parallèle de la migration de modèle.
- Le package est **déjà installé** (1.35.0).
- L'API est légèrement différente : `new GoogleGenAI({ apiKey }).models.generateContent({ model, contents, config })` au lieu de `getGenerativeModel().generateContent()`.
- **Si Romane veut rester sur l'ancien SDK** : c'est faisable mais ajouter un canary feature flag est obligatoire (cf §4.2).

---

## 3. Risques par appel

| # | Appel | Risque schema (JSON) | Risque latence | Risque coût | Risque qualité | Plan B |
|---|---|---|---|---|---|---|
| 1 | `correctFrenchWithAI` | Bas (JSON simple `{corrections:{}}`, regex tolérante) | Bas | Bas (4k tokens max) | Bas (correction grammaire) | Non-bloquant déjà : `catch` garde textes originaux. ✅ |
| 2 | `generatePreviewPlan` | **Élevé** (pas de `maxOutputTokens` défini → si modèle Pro coupe au milieu, JSON tronqué → `JSON.parse` throw → exception cliente) | **Élevé sur Pro** (preview S1 = critique pour conversion, latence > 15s = abandon utilisateur probable) | **Élevé sur Pro** (1 preview par user inscrit) | Élevé en cas de downgrade | Aucun fallback actuel. **À ajouter** : retry 1x sur autre modèle si parse fail. |
| 3 | `generateRemainingWeeks` (lot) | Moyen (retry x3 déjà en place, gère 429 + missing weeks) | **Très élevé** (déjà 4s pause entre lots, lot Pro peut atteindre 60s × N lots = 3-5 min) | **Très élevé** (output 65536 tokens × N lots × users premium) | Moyen | Retry x3 existant. **Ajouter** : timeout per-call (90s) + alerte si > 2min. |
| 4 | `adaptPlanFromFeedback` | Bas (fallback safe `{modifications:[]}` si parse fail) | Moyen | Bas (1 appel par feedback user) | Moyen | Fallback déjà robuste ✅ |
| 5 | `aiReviewPlan` (validator Layer 2) | Bas (fallback neutre score=70) | Bas (2048 tokens max) | Bas | Bas (rôle = QA, faux positif = pas de correction inutile) | Fallback existant ✅ |
| 6 | `generateCorrectedWeeks` (validator Layer 3) | Moyen (propage erreur) | Moyen | Moyen | Moyen | **Aucun fallback** — si fail, la correction est annulée. Acceptable car le plan original passe quand même. |
| 7 | `analyzeActivitiesWithGemini` (Strava) | Moyen (pas de try/catch local) | Moyen | Bas (1 appel par bilan mensuel) | Moyen | **Aucun fallback** — erreur remonte au caller. À renforcer. |

### Pièges spécifiques identifiés

- **L3338 (generatePreviewPlan)** : `generationConfig` ne définit ni `maxOutputTokens` ni `temperature`. Sur 3.x, le défaut de `maxOutputTokens` peut être inférieur à celui de 2.5-flash → **JSON tronqué silencieux**. **Patch obligatoire** : définir explicitement `maxOutputTokens: 8192` (preview = 1 semaine ≈ 4-6k tokens output).
- **L308 (Strava)** : passe **deux parts** dans `contents` (instruction + prompt). Sur 3.x ça reste supporté mais le `systemInstruction` serait plus propre.
- **L538 (correctFrenchWithAI)** : utilise une regex `\{[\s\S]*\}` pour extraire le JSON. Sur 3-pro qui peut générer du markdown ` ```json ... ``` ` autour, **la regex matche toujours mais inclut les backticks** → `JSON.parse` throw. **Patch défensif** : strip ` ```json` ` et ` ``` ` avant parse.
- **Aucun timeout client** : si Pro freeze pendant 90s, le user voit un spinner infini. **Wrapper Promise.race avec AbortController.**

---

## 4. Plan d'action technique

### 4.1 Helper centralisé `getModel(useCase)`

Créer `src/services/llmModelRegistry.ts` :

```ts
// src/services/llmModelRegistry.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export type UseCase =
  | 'frenchCorrection'      // correctFrenchWithAI
  | 'previewPlan'           // generatePreviewPlan
  | 'remainingWeeks'        // generateRemainingWeeks
  | 'planAdaptation'        // adaptPlanFromFeedback
  | 'validatorReview'       // aiReviewPlan
  | 'validatorCorrection'   // generateCorrectedWeeks
  | 'stravaAnalysis';       // analyzeActivitiesWithGemini

const DEFAULT_MODEL = 'gemini-2.5-flash'; // sécurité : si env var absente, on garde le comportement actuel
const FALLBACK_VALIDATOR = 'gemini-2.0-flash';

const ENV_VAR_BY_CASE: Record<UseCase, string> = {
  frenchCorrection:     'VITE_GEMINI_MODEL_FRENCH',
  previewPlan:          'VITE_GEMINI_MODEL_PREVIEW',
  remainingWeeks:       'VITE_GEMINI_MODEL_REMAINING',
  planAdaptation:       'VITE_GEMINI_MODEL_ADAPT',
  validatorReview:      'VITE_GEMINI_MODEL_VALIDATOR_REVIEW',
  validatorCorrection:  'VITE_GEMINI_MODEL_VALIDATOR_FIX',
  stravaAnalysis:       'VITE_GEMINI_MODEL_STRAVA',
};

export function resolveModelName(useCase: UseCase): string {
  const envKey = ENV_VAR_BY_CASE[useCase];
  const fromEnv = (import.meta.env as any)[envKey];
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  // Default préservé pour ne pas changer le comportement tant que la variable n'est pas set
  if (useCase === 'validatorReview' || useCase === 'validatorCorrection') {
    return FALLBACK_VALIDATOR;
  }
  return DEFAULT_MODEL;
}

export function getModel(genAI: GoogleGenerativeAI, useCase: UseCase, extra?: { systemInstruction?: string }) {
  const model = resolveModelName(useCase);
  const t0 = Date.now();
  const cfg: any = { model };
  if (extra?.systemInstruction) cfg.systemInstruction = extra.systemInstruction;
  const m = genAI.getGenerativeModel(cfg);
  // Wrapper léger pour logger la latence par useCase
  const origGen = m.generateContent.bind(m);
  (m as any).generateContent = async (req: any) => {
    const start = Date.now();
    try {
      const res = await origGen(req);
      const dt = Date.now() - start;
      console.log(`[LLM] ${useCase} model=${model} latency=${dt}ms ok`);
      return res;
    } catch (e: any) {
      const dt = Date.now() - start;
      console.error(`[LLM] ${useCase} model=${model} latency=${dt}ms ERROR=${e?.message || e}`);
      throw e;
    }
  };
  void t0;
  return m;
}
```

Avantage : 1 seul point de bascule, 1 seul logger latence, rétro-compat (si env var absente → comportement actuel inchangé).

### 4.2 Feature flags par cas d'usage

À déclarer dans `.env.local` (et `src/vite-env.d.ts`) :

```
VITE_GEMINI_MODEL_FRENCH=gemini-2.5-flash
VITE_GEMINI_MODEL_PREVIEW=gemini-2.5-flash
VITE_GEMINI_MODEL_REMAINING=gemini-2.5-flash
VITE_GEMINI_MODEL_ADAPT=gemini-2.5-flash
VITE_GEMINI_MODEL_VALIDATOR_REVIEW=gemini-2.0-flash
VITE_GEMINI_MODEL_VALIDATOR_FIX=gemini-2.0-flash
VITE_GEMINI_MODEL_STRAVA=gemini-2.5-flash
```

**Rollback** : changer la valeur, rebuild Vite. C'est embarqué côté client (Vite expose `import.meta.env.VITE_*` au build). **Important** : ce n'est PAS un flag live (Vite inline les valeurs au build). Pour un vrai rollback live, il faudrait passer par un fetch de config au boot.

**Alternative live** : exposer la config via Firebase Remote Config (déjà utilisé) → relecture sans rebuild. À envisager si rollback rapide critique.

### 4.3 Ordre de rollout (du moins risqué au plus critique)

| Phase | Appel | Justification |
|---|---|---|
| **P1** (1er jour) | `aiReviewPlan` (validator Layer 2) | Fallback neutre déjà en place, score=70 si échec. Aucune visibilité user. |
| **P2** | `generateCorrectedWeeks` (validator Layer 3) | Si échec, le plan original passe quand même (pas bloquant). |
| **P3** | `correctFrenchWithAI` | Non-bloquant déjà (garde textes originaux). Faible visibilité. |
| **P4** | `analyzeActivitiesWithGemini` (Strava) | Bilan mensuel = pas critique, user peut retry. **Ajouter try/catch local avant.** |
| **P5** | `adaptPlanFromFeedback` | Fallback safe déjà. Impact = adaptations RPE feedback (1 fois/sem max). |
| **P6** | `generateRemainingWeeks` | Critique mais retry x3 déjà en place. Tester sur 5 users avant rollout. |
| **P7** (en dernier, jamais sur Pro tant que pas validé) | `generatePreviewPlan` | **LE plus critique** : c'est le 1er contact user, écran de conversion. Si latence > 15s ou JSON foireux → bounce direct. **Test obligatoire sur 27 profils Sprint 1+2+3 avant flip.** |

### 4.4 Tests anti-régression nécessaires

1. **Faire passer les 27 profils Sprint 1+2+3 sur le nouveau modèle** — mais aujourd'hui ces tests ne touchent **PAS** l'API LLM (logique déterministe pure). Donc :
   - Soit on étend les tests pour appeler vraiment Gemini → impose une clé API en CI + ~$2-5/run sur Pro
   - Soit on crée un script `compare-models.mjs` qui sur 27 profils :
     - appelle `generatePreviewPlan` avec `VITE_GEMINI_MODEL_PREVIEW=gemini-2.5-flash`
     - appelle avec `gemini-3-flash` puis `gemini-3-pro`
     - diff les outputs : structure JSON valide, weeks.length=N, allures cohérentes, fréquence respectée
2. **Script de A/B comparaison** : pour chaque profil, mesurer `volumeS1`, `volumeMaxPic`, `slDurationS1`, `paceEF`, `nbRenfo`, `freqRespectée`. Si la moyenne 3-pro diverge > 10% du 2.5-flash → flag.
3. **Smoke test endpoint** : 1 profil par typologie (Route/Trail/Hyrox/RemiseEnForme/PerteDePoids/Finisher+PB) appelle bien la nouvelle config sans throw.

### 4.5 Monitoring + alertes

À court terme (avant rollout) :

- Wrapper `getModel` logge `[LLM] {useCase} model={X} latency={ms} ok|ERROR` (cf §4.1)
- Côté Firebase (déjà utilisé) : ajouter dans `analytics.logEvent` pour chaque appel :
  - `gemini_call_latency_ms`
  - `gemini_call_model`
  - `gemini_call_usecase`
  - `gemini_call_outcome` (ok / parse_error / 429 / safety / timeout)
- Alerte Sentry/Firebase Crashlytics si :
  - taux d'erreur LLM > 2% sur 1h
  - p95 latence preview > 10s
  - taux fallback adapter > 5%

Coût : pour avoir le coût $$, on ne peut pas le mesurer côté client (token usage). Lire `response.usageMetadata.{prompt|candidates}TokenCount` (existe sur l'ancien SDK) et logger → estimation $$ via tarif public.

### 4.6 Rollback rapide

1 env var par cas d'usage → flip arrière en éditant `.env.local` et redeploy. Pour rollback **live sans redeploy** :
- Passer les modèles via Firebase Remote Config
- Au boot client, fetch la config et stocker en memory
- `resolveModelName(useCase)` lit la config en memory au lieu de `import.meta.env`

Effort additionnel pour le mode "live" : ~3h.

---

## 5. Estimation effort

| Tâche | Heures |
|---|---|
| Helper `llmModelRegistry.ts` + types vite-env | 2h |
| Refacto des 7 sites d'appel pour utiliser `getModel(useCase)` (1 ligne chacun + import) | 1.5h |
| Ajout `maxOutputTokens` explicite sur preview + strava (patch défensif) | 0.5h |
| Strip markdown ```json``` dans `correctFrenchWithAI` (patch défensif) | 0.5h |
| Timeout client `AbortController` 90s par défaut, 30s pour validator | 1.5h |
| Script `compare-models.mjs` (27 profils A/B) | 4h |
| Run + analyse 3 modèles × 27 profils = 81 appels | 2h (exécution) + 3h (analyse) |
| Monitoring latence + token usage (Firebase analytics events) | 2h |
| Rollback live via Firebase Remote Config (optionnel) | 3h |
| Tests smoke 1 profil/typologie en staging | 2h |
| Documentation rollout interne + runbook | 1h |
| **TOTAL coeur** | **~20h dev** |
| **TOTAL avec live rollback + monitoring poussé** | **~25h dev** |

**Durée calendaire rollout** :
- J0 : refacto + helper + patches défensifs (déployé sans changer aucun modèle, comportement inchangé)
- J1 : phase P1+P2+P3 (validator, frenchCorrection) en staging puis prod canary 10%
- J3 : phase P4 (Strava), observation 48h
- J5 : phase P5 (adaptation), observation 48h
- J7 : phase P6 (remainingWeeks), test sur 5 users payants puis 100%
- J10+ : phase P7 (preview) — **uniquement après A/B test 27 profils OK sur 3-flash**, et **3-pro uniquement après validation manuelle de 5 plans côté coach**

Rollout total : **~2 semaines** pour migrer tout en sécurité.

---

## 6. Pièges identifiés

1. **`generatePreviewPlan` n'a PAS de `maxOutputTokens`** → sur 3.x avec un défaut plus bas → JSON tronqué silencieux → `JSON.parse` throw → écran d'erreur user en plein flow conversion. **Bloquant à patcher AVANT migration.**
2. **`correctFrenchWithAI` parse JSON via regex `\{[\s\S]*\}`** → si 3-pro entoure de ` ```json ... ``` ` (probable car modèles instruct récents le font), la regex capte les backticks → parse fail. **Patcher.**
3. **`analyzeActivitiesWithGemini` n'a aucun try/catch local** → si 3.x renvoie un `BLOCKED_SAFETY` ou un timeout, ça explose dans le caller UI. **Patcher.**
4. **`@google/generative-ai@0.24.1` n'a pas le `responseJsonSchema` strict** du nouveau SDK. Si Romane veut activer le mode strict sur 3.x → upgrade obligatoire vers `@google/genai`.
5. **`maxOutputTokens: 65536` sur `generateRemainingWeeks`** : sur 3-pro, certains tiers limitent à 8192 output. Vérifier la fiche modèle officielle, sinon → erreur 400 au runtime.
6. **Aucun timeout client** : si 3-pro freeze 120s, user voit un spinner infini. Ajouter `AbortController` côté SDK ou Promise.race custom.
7. **Vite `import.meta.env` est inliné au build** : changer `VITE_GEMINI_MODEL_*` impose un rebuild + redeploy. Pour vrai rollback live → Firebase Remote Config.
8. **Rate limits 3.x potentiellement plus stricts** que 2.5-flash sur le free tier. Le retry x3 backoff existant sur generateRemainingWeeks aide mais les 6 autres sites n'ont aucun retry. **Ajouter retry générique sur tous les sites prod.**
9. **Coût Pro vs Flash** : 3-pro peut être 5-15x plus cher que 3-flash. Sur `generatePreviewPlan` (1 appel par user inscrit) + `generateRemainingWeeks` (lots × users premium) → explosion potentielle. **Surveiller token usage 48h après chaque flip.**
10. **Modèle Pro plus verbeux** : on n'a pas de `temperature` explicite sur 5 sites/7. Sur 3-pro, defaults peuvent générer plus de remplissage texte (warmup/cooldown plus longs). Impact UI : description séance trop longue. **Ajouter `temperature: 0.4-0.6` explicite.**
11. **Le SDK `@google/generative-ai` est officiellement déprécié par Google** au profit de `@google/genai`. Une version 3.x peut casser quelque chose côté SDK ancien (header API, route v1beta gelée). **Plan B prêt : `@google/genai` déjà installé en deps.**
12. **`gemini-2.0-flash` (validator)** sera probablement deprecated avant `gemini-2.5-flash`. À surveiller : la validator pourrait casser AVANT le reste si Google retire 2.0 → migrer validator en priorité.

---

## 7. Recommandation rollout finale

### Phase 0 — Préparation (J0, ~6h dev)
- Implémenter `llmModelRegistry.ts` + helper `getModel(useCase)`
- Refacto des 7 sites d'appel (1-liner chacun)
- Patcher 4 bugs défensifs : `maxOutputTokens` preview/strava, regex markdown, try/catch strava, timeout AbortController
- Logger latence + tokens
- **Déployer avec tous les env vars = modèles actuels** (zéro changement de comportement)

### Phase 1 — Migration low-risk (J1-J3)
- Validator Layer 2 + Layer 3 → `gemini-3-flash` (gain coût + remplace 2.0 deprecated)
- correctFrenchWithAI → `gemini-3-flash`
- Observation 48h, surveillance taux d'erreur + latence

### Phase 2 — Migration medium-risk (J4-J7)
- analyzeActivitiesWithGemini → `gemini-3-flash`
- adaptPlanFromFeedback → `gemini-3-flash` ou Pro selon recommandation expert LLM
- Observation 72h

### Phase 3 — Migration critique (J8-J14)
- Lancer script A/B 27 profils Sprint 1+2+3 sur 3-flash et 3-pro
- Validation coach manuelle sur 5 plans (par typologie)
- Si OK : `generateRemainingWeeks` → `gemini-3-flash`, puis 24h plus tard
- `generatePreviewPlan` → `gemini-3-pro` UNIQUEMENT si la qualité justifie le coût et la latence reste < 10s p95
- Sinon : `generatePreviewPlan` → `gemini-3-flash` et garder Pro pour usages premium (à décider avec PM)

### Garde-fous obligatoires
- **Ne JAMAIS migrer `generatePreviewPlan` sans avoir patché `maxOutputTokens` explicite.**
- **Ne JAMAIS rollout 3-pro sur tous les appels en même temps** (coût explosion).
- **Garder `gemini-2.5-flash` comme fallback config-able** au moins 1 mois post-migration.
- **Si SDK ancien casse sur 3.x** : bascule vers `@google/genai` (déjà installé, ~4h refacto).

---

## Verdict global

**Migration techniquement faisable, MAIS** :

- 4 patches défensifs sont **bloquants** avant toute bascule (maxOutputTokens preview, regex markdown, try/catch strava, timeout)
- Aucun test E2E LLM aujourd'hui → il faut créer le script A/B 27 profils avant tout flip de preview
- Le rollout doit être progressif (~2 semaines), pas un big bang
- Coût Pro à surveiller activement (token usage logging obligatoire)
- SDK actuel à risque (déprécié) — prévoir migration `@google/genai` en backup
- `generatePreviewPlan` est l'appel le plus critique : DERNIER à migrer, et UNIQUEMENT après validation A/B
