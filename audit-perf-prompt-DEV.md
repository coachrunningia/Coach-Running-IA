# Audit Perf — `generatePreviewPlan` 30s → ≤15s

**Cible** : preview S1 sous 15s. Hot path : `geminiService.ts:4423→5066`.
**Observation clé** : `gemini-3-flash-preview` (modèle PREVIEW Google = SLA dégradé) + prompt ~350 lignes injectées + `generateContent` non-streaming + plan B silencieux qui doublerait la latence si rejet schema (`L5046-5063`).

---

## 1. Tableau 6 axes

| # | Axe | Gain temps | Effort | Risque | Priorité |
|---|---|---|---|---|---|
| 1 | Client → Serveur (Cloud Function) | 0s sur Gemini lui-même. +1-2s overhead réseau. **Sécurité clé seulement.** | 6-10h | Moyen (refactor `getApiKey` + CORS + auth Firebase) | **P2** (sécurité, pas perf) |
| 2 | Streaming (`generateContentStream`) | **Time-to-first-byte ~3-5s vs 30s.** Total identique, **UX perçue ÷3**. Parse JSON incrémental impossible (responseSchema strict), mais on peut afficher skeleton + spinner "S1 arrive..." | 4-6h | Faible (fallback `generateContent` trivial) | **P0** |
| 3 | Context caching (prefix) | Prompt préfixe stable (RÈGLES ABSOLUES, DISCIPLINE, PERTE/HYROX/TRAIL blocks, RESPONSE_SCHEMA) ≈ 60-70% du prompt. **Gemini context cache : -40 à -75% latence sur cache hit.** Estimé : -8 à -12s | 3-5h (extraire le prefix const + `cachedContents.create`) | Faible (TTL 1h auto-refresh) | **P0** |
| 4 | Preview ∥ Remaining parallèle | **NON-GO** : Remaining a besoin de `generationContext` + `week1Summary` issu de Preview (`L5648`). Dépendance dure. | N/A | Bloquant (incohérence S1↔S2+) | **NO-GO** |
| 5 | Réduire output (schema slim) | Schema actuel = 13 champs/session × 5 sessions ≈ 70 cellules. **Retirer `warmup`/`cooldown`/`advice` du LLM** (= 50% des tokens output) et **générer post-process** depuis `mainSet` + templates. Estimé : -5 à -8s output decode | 4-6h (templates renfo existent déjà via `buildRenfoMainSet` `L5201`) | Moyen (qualité advice perdue, mais déjà patché en post-process) | **P1** |
| 6 | Modèle : `gemini-3-flash-preview` → stable | `preview` = SLA non garanti, p99 connue à 30-60s. **`gemini-3-flash` stable** (si dispo) ≈ -30%. **`gemini-3-flash-lite`** = -50% latence mais qualité dégradée sur prompts longs ≥ 4k tokens (notre cas). | 30min swap + tests | Moyen (lite peut casser `responseSchema` complex) | **P0** test A/B |

---

## 2. Quick wins (60 min, gain cumulé ~12-15s)

### QW1 — Swap modèle stable (`gemini-3-flash-preview` → `gemini-3-flash`)
**Files** : `geminiService.ts:4430`, `5599`, `6525`, `3715`
**Action** : remplacer la const `MODEL_ID` (3 occurrences) + `modelUsed` audit.
**Effort** : 15 min + smoke test 3 profils.
**Gain estimé** : -8 à -12s (sortir du tier preview = critique).

### QW2 — Context cache du prefix (`PREVIEW_RESPONSE_SCHEMA` + RÈGLES + DISCIPLINE)
**Files** : `geminiService.ts:4197-4267` (schema) + extraire prefix stable du previewPrompt (`L4699-4775`).
**Action** :
```ts
const cached = await genAI.cachedContents.create({
  model: "models/gemini-3-flash",
  contents: [{ parts: [{ text: PREFIX_RULES_BLOCK }] }],
  ttl: "3600s",
});
model.generateContent({ cachedContent: cached.name, contents: [...userSpecificParts] });
```
**Effort** : 30 min (refactor pour isoler le prefix invariant).
**Gain estimé** : -40% latence si cache hit (~ -8s sur 20s restant après QW1).

### QW3 — Augmenter `maxOutputTokens` Preview à 16k + diag
**File** : `geminiService.ts:5053` (`maxOutputTokens: 8192`).
**Pourquoi** : asymétrie suspecte vs `L5812` (65536). 8k peut forcer Gemini en mode "économie" avec backoff interne. **Plus important** : ajouter log `result.response.usageMetadata` pour mesurer `promptTokenCount` / `candidatesTokenCount` (= savoir si on est compute-bound ou output-bound avant d'optimiser).
**Effort** : 5 min.
**Gain** : 0s direct mais débloque la décision QW4 (slim schema).

---

## 3. Sprint 1 jour — 30s → <15s

**Ordre** (chaque étape gated par metric prod) :

1. **H+0 → H+1** : QW1 + QW2 + QW3 déployés behind feature flag `GEMINI_FAST_MODE=true`. Mesure p50/p99 sur 10 generations test (`__tests__/sprint-b-p1-fixes.test.ts` pattern).
2. **H+1 → H+3** : Streaming UX (`generateContentStream`). Refactor `App.tsx:125` pour consommer un AsyncIterable. Parse JSON final à la fermeture (pas incrémental — schema strict). Affichage progressif côté `Questionnaire.tsx:271` : skeleton "Génération de ta S1..." avec barre progression fake basée sur tokens reçus. **Gain UX perçue** : 30s → ~5s feel.
3. **H+3 → H+5** : Slim schema. Retirer `warmup`, `cooldown`, `advice` de `PREVIEW_RESPONSE_SCHEMA` (`L4253-4256`). Post-process : `applyRenfoTemplate` existe déjà (`L5201`) → étendre à `buildSessionTemplate(type, paces, week, phase)`. **Risque** : `advice` est différenciant produit → garder pour sessions clés (SL, Fractionné) uniquement, retirer pour Jogging/Récup.
4. **H+5 → H+7** : Tests régression. Batterie 10 profils (cf. `feedback_validation_n_profils_avant_sprint`) : Débutant/Inter/Confirmé × 5k/10k/Semi/Marathon/Trail/Hyrox/PdP. Vérif `feasibility.status`, `weeklyVolumes`, `mainSet` allures, `welcomeMessage` tone.
5. **H+7 → H+8** : Canary 10% prod, monitoring `[Gemini Preview] Terminé en Xms`. Rollback si p99 > 18s.

**Tests requis** :
- `sprint-b-p1-fixes.test.ts` étendu : assert latency < 15000ms (mock + perf budget).
- Manual : 3 profils Trail (D+ ≥ 500m), 1 Hyrox, 1 Perte de poids → vérif que slim schema ne casse pas les templates de sécurité.

**Risques** :
- `gemini-3-flash` stable peut ne pas exister (vérifier `https://ai.google.dev/gemini-api/docs/models`). **Fallback** : `gemini-2.5-flash` (utilisé déjà `L570`, prouvé prod).
- Context caching exige `cached_content` ≥ 4096 tokens. Si prefix < 4k, Gemini refuse → mesurer avant.
- Streaming + responseSchema : documentation Google non claire. Tester avec un POC isolé avant refactor.

---

## 4. Anti-patterns à NE PAS faire

1. **Ne pas micro-optimiser `applyDistanceOverride` ni `enforceSLDay`** (`L5075`, `L5153`) : ces post-process tournent en <50ms, c'est du bruit face aux 30s Gemini.
2. **Ne pas réduire le prompt à la hache.** Le coach a déjà payé en qualité chaque ligne (cf. `feedback_chaque_ligne_justifiee`). Cibler le **prefix invariant** via cache, pas le contenu dynamique.
3. **Ne pas paralléliser Preview ∥ Remaining** : dépendance `week1Summary → batchPrompt` est dure (`L5648`). Risque incohérence allures S1 vs S2+.
4. **Ne pas retirer le plan B `responseSchema` rejeté** (`L5056-5063`) : la robustesse vaut les 0.5s overhead du try/catch.
5. **Ne pas migrer Cloud Function pour la perf** : le bottleneck est Gemini lui-même, pas le client. Migration = projet sécurité, à découpler.
6. **Ne pas augmenter `maxOutputTokens` à 65536 partout** sans mesure : output tokens facturés, et schema strict limite naturellement la sortie.
7. **Ne pas activer streaming sans schema strict** : Gemini stream renvoie JSON partiel non-parseable. Parser à la fin (`text()`) ou utiliser un parser tolérant style `partial-json`.

---

**Verdict** : 90% du gain vient de **QW1 (modèle stable)** + **QW2 (context cache)** + **streaming UX**. Le reste (schema slim, parallel, serveur) = P1/P2.
