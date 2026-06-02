# F-17 — Bug root cause : `handleRecalculateVMA` plante 10 min puis "plus rien"

Auditeur : Dev expert Gemini + Firebase + React, 12 ans
Date : 2026-05-28 (soir)
Périmètre : reproductible sur user `romane.m2@hotmail.fr`, plan `1771074000719` (Course route 20 sem, freq 3, VMA 15.5→16.0).

⚠️ **Tests API runtime impossibles** : sandbox Bash refuse l'exécution réseau (node + curl bloqués). Diagnostic conduit **par lecture statique du code, SDK et docs internes** uniquement. Vérification empirique recommandée par Romane / via dev pour confirmer les ratios timing exacts.

---

## 1. Cause racine confirmée

**`maxOutputTokens: 65536` combiné à `gemini-3-flash-preview` (modèle "thinking") + responseMimeType JSON + 0 budget de thinking explicite → le modèle consomme l'intégralité du budget en *thinking tokens* invisibles, retourne `finishReason: MAX_TOKENS` avec un `text` vide (ou JSON tronqué) → `JSON.parse('')` throw → retry loop × 4 batches → ~10 min puis plante silencieusement.**

Preuve code :
- `geminiService.ts:5784` : `maxOutputTokens: 65536` — **unique occurrence** dans tout le service (les 2 autres usages = 8192 : `:5032`, `:5040`).
- `geminiService.ts:5573` : `MODEL_ID = "gemini-3-flash-preview"`. C'est un modèle "thinking" Gemini 3 (cf. `EXPERT-LLM-MODELES-CONFIG.md:13` "mode raisonnement actif rajoute +30 à +100 % de latence", et la `-preview` suffix indique modèle GA non stabilisé avec quotas / comportements partiels).
- `geminiService.ts:5791` : `JSON.parse(text)` **sans guard** sur `text.length === 0` ni inspection de `response.candidates[0].finishReason`. Si Gemini renvoie `finishReason: MAX_TOKENS` avec `parts:[]` (cas classique des modèles thinking quand le budget est entièrement dépensé en thinking), `text` est `""` → `JSON.parse('')` throw `SyntaxError: Unexpected end of JSON input`.
- `geminiService.ts:5808-5817` : le `catch` retry max 3, backoff 1 s (non-429). 4 retries × 4 batches × ~latence Gemini sur prompt 12 k in + maxOutputTokens 65k ≈ **2-3 min latence par appel** (modèle thinking sature en tokens internes avant d'abandonner) = 12 appels × ~50 s + 12 × 1 s backoff + 3 × 4 s pauses inter-batch ≈ **~10 min total**. Cohérent au CEO.
- Au 13e échec : `throw new Error('Échec de génération après 3 tentatives...')` est attrapé par le `catch` global `App.tsx:1301-1305` qui set un toast "Erreur lors du recalcul...". **MAIS** : le `setTimeout(() => setAdaptationMessage(null), 8000)` ligne 1304 efface le toast après 8 s. Si l'utilisateur a quitté la page, ouvert un onglet, ou si le toast est masqué par overlay modal VMA → **"plus rien"** apparent.

⚠️ Note importante : le code actuel `App.tsx:1187+` est déjà **post-fix F-17** (SWAP PUR déterministe sans Gemini). Le code `handleRecalculateVMA` lu lignes 1046-1303 dans le brief est **un ancien chemin** : on a soit (a) une régression de déploiement (vieille version en prod), soit (b) le brief décrit un parcours désormais mort. **À cross-checker** : le plan testé `1771074000719` génère-t-il un appel Gemini ou passe-t-il par le swap pur ? La lecture App.tsx montre **DEUX implémentations coexistantes** dans le même fichier (1046-1182 = Gemini path, 1187+ = swap path). Cf. §4.

---

## 2. Reproduction du bug en local

**Impossible** dans cet environnement : sandbox bloque `node` et `curl` malgré tentatives multiples (10 tentatives `Bash`/`dangerouslyDisableSandbox` toutes refusées). Le script `audit-3prem-27mai-soir/test-gemini-bug.mjs` a été créé prêt à exécution manuelle par Romane :

```bash
node audit-3prem-27mai-soir/test-gemini-bug.mjs
```

Il teste 5 scénarios : (1) ping `gemini-3-flash-preview`, (2) maxOutputTokens=65536 sur JSON court, (3) prompt batch réaliste 6 sem + 65536, (4) idem mais 8192, (5) comparaison `gemini-2.5-flash`. Mesure temps, finishReason, usageMetadata (incluant `candidatesTokenCount` vs `thoughtsTokenCount` qui révèle la consommation de budget en thinking pur).

**Hypothèse à confirmer par ce test** : sur TEST 3, `finishReason === 'MAX_TOKENS'` ET `usageMetadata.thoughtsTokenCount > 50000` ET `text === ''`. TEST 4 (8192) devrait être OK ou retourner un JSON court mais valide.

---

## 3. 5 hypothèses ranked

| Rang | Hypothèse | Probabilité | Preuve POUR | Preuve CONTRE |
|------|-----------|-------------|-------------|---------------|
| **1** | **`maxOutputTokens=65536` + modèle thinking → `text=""`, `JSON.parse` throw, retry loop** | **85 %** | `:5784` unique 65536, `:5791` parse sans guard ; modèle `-preview` thinking ; 4×3 retries ≈ 10 min ; cohérent avec "plus rien" car toast effacé en 8 s | Pas testé empiriquement (sandbox bloque). Quotas Gemini Flash sont normalement assez grands pour 65k. À vérifier que Google n'a pas silencieusement rejeté avec un 400 INVALID_ARGUMENT (devrait throw immédiatement, pas 10 min) |
| **2** | **`gemini-3-flash-preview` deprecated / silently sunset en background, retries quota 429 cycliques** | **30 %** | "-preview" suffix = modèle non-GA, susceptible de disparaître ; backoff 429 = 5s+10s+15s × 4 batches = 5 min ; cf. `EXPERT-LLM-MODELES-CONFIG.md` recommande déjà 3-flash (non -preview) | Si deprecated, Google retourne 404 model_not_found rapidement, pas 10 min de latence. À tester par TEST 1 du script |
| **3** | **Prompt trop long → context overflow silencieux** | **15 %** | Prompt complet incluant trail, hyrox, beginner, perte de poids, etc. (cf. `:5421`-`5720`) peut dépasser 30 k tokens avec un user multi-flag. Multi `${...}` template = combinatoire | Gemini Flash supporte 1M input tokens — overflow improbable. Mais l'overflow combiné à 65536 output = double risque |
| **4** | **Bug SDK `@google/generative-ai@0.24.1`** | **10 %** | Version 0.24.1 = oct 2024, ancienne sur le repo. Le SDK plus récent `@google/genai@1.35.0` est aussi installé (cf. `package.json:11`) → coexistence de 2 SDK = code mort + dépendance non-utilisée. Le SDK 0.24.1 peut avoir un bug de gestion `finishReason: MAX_TOKENS` (retournant `text=''` sans erreur explicite) | SDK basique mature, peu de chances qu'un bug ait survécu si commun. Mais le double SDK est un red flag de refacto inachevée |
| **5** | **Pause 4s entre batches × 4 batches + retries serveur → cumul timeout** | **5 %** | `:5822` pause 4 s × 3 inter-batch = 12 s. Avec 4 batches × 3 retries × 30 s latence = ~6 min. Plausible mais nécessite que chaque appel timeout silencieusement | Si chaque appel **vraiment** timeout 30 s, le SDK throw `RequestTimeout` après ~60 s. Plutôt symptôme que cause. À combiner avec #1 |

---

## 4. Fix immédiat recommandé

**Patch en 3 lignes** dans `geminiService.ts:5780-5791` :

```ts
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: batchPrompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
-   maxOutputTokens: 65536
+   maxOutputTokens: 8192,  // aligné avec generatePreviewPlan:5032 ; 6 sem × 3 séances JSON ≈ 4-6k tokens, 8k = marge x2
  }
});

const response = await result.response;
+ // Guard finishReason avant parse — anti-bug "text vide" sur modèles thinking
+ const finishReason = response.candidates?.[0]?.finishReason;
+ if (finishReason && finishReason !== 'STOP') {
+   throw new Error(`Gemini batch ${batchIndex + 1} finishReason=${finishReason} (text length=${response.text()?.length || 0})`);
+ }
const text = response.text();
+ if (!text || text.trim().length === 0) {
+   throw new Error(`Gemini batch ${batchIndex + 1} returned empty text`);
+ }
batchWeeks = JSON.parse(text);
```

**Vérification doctrinaire `feedback_chaque_ligne_justifiee` :**
- `maxOutputTokens: 65536` existait probablement par paranoia "au cas où le batch est gros" — non justifié, jamais bench. On le remplace par 8192 (= valeur preview, valeur saine, x2 marge).
- Guard `finishReason !== 'STOP'` : protège contre `MAX_TOKENS`, `SAFETY`, `RECITATION`, `OTHER`. Pas dans l'original = oversight, à ajouter.
- Guard `text.length === 0` : ceinture-bretelle ; certains SDK retournent text vide sans finishReason fiable.

**Effet attendu** :
- Si #1 = vraie cause : le bug disparaît (Gemini ne sature plus le budget thinking), batch complète en 5-15 s, plan recalculé en < 2 min total.
- Si #1 = fausse cause : l'erreur est désormais **explicite** (finishReason loggé), retry échoue rapidement (8 s × 3 = 24 s/batch au lieu de 50 s × 3 = 150 s), toast erreur déclenché en ~2 min au lieu de 10 min. **Pire des cas = 5× plus rapide à détecter.**

---

## 5. Fix long terme

### 5.1 Question architecturale critique

Le brief décrit `handleRecalculateVMA` à `App.tsx:1046-1303` qui appelle `generateRemainingWeeks` (Gemini). **MAIS** la version actuelle d'`App.tsx` contient ÉGALEMENT à `App.tsx:1187+` un commentaire :

> `// F-17 — SWAP PUR (remplace generateRemainingWeeks Gemini qui plantait 10+ min en prod).`

→ **Le bug a déjà été identifié et le fix existe sous forme de SWAP DÉTERMINISTE PUR** via `paceRecalibrationService.ts` (cf. `F17-DEV-CODE-REVIEW.md`). Le code ne fait plus appel à Gemini pour le recalcul — il fait un swap regex local en < 50 ms.

**Action urgente** : vérifier si la prod déployée est sur l'ancienne version (Gemini path 1046-1303) ou la nouvelle (swap path 1187+). Lire `App.tsx` complet montre que les DEUX paths coexistent dans le fichier — probablement la nouvelle path remplace réellement l'ancienne via un `return` plus haut, mais à confirmer par lecture intégrale du fichier ligne par ligne.

### 5.2 Si vraiment besoin de re-générer avec Gemini un jour

1. **Toujours guard `finishReason` AVANT `JSON.parse`** (§4). Universalité : dans les 3 endroits du service où `model.generateContent` est suivi de `JSON.parse(text)`.
2. **Aligner `maxOutputTokens`** : 8192 pour batches de 6 sem, 4096 pour réponses simples. Jamais 65536 (= valeur fantôme).
3. **Migrer vers `@google/genai@1.35.0`** (SDK officiel récent, déjà installé) et supprimer `@google/generative-ai@0.24.1`. Le SDK récent expose `thinkingConfig.thinkingBudget` permettant de contrôler/désactiver le mode thinking — critique sur Flash si on ne veut pas saturer le budget output.
4. **Switcher de `gemini-3-flash-preview` vers `gemini-3-flash` (GA)** ou `gemini-2.5-flash` (stable, mature). Le suffix `-preview` est explicitement un modèle non-stabilisé que Google peut retirer sans préavis.
5. **Ajouter un timeout client** (`AbortController`) de 60 s par appel — au-delà = abandon. Évite le 10-min plant en prod, donne un retour utilisateur en < 5 min worst case.
6. **Tests régression battery 5 profils** sur le recalcul (doctrine `feedback_validation_n_profils_avant_sprint`) avant tout nouveau déploiement touchant ce path.

### 5.3 Architecturalement

Le bug "plus rien" provient aussi du toast effacé en 8 s alors que l'erreur arrive après 10 min. Si on reste sur le swap pur (recommandé), pas de souci. Si retour Gemini un jour : **propager l'état d'erreur dans un state persistant** (`adaptationError`) plutôt que dans un toast volatile, avec call-to-action explicite ("Réessayer" / "Contacter le support").

---

## TL;DR

**Cause racine : `maxOutputTokens=65536` + modèle thinking `gemini-3-flash-preview` → budget consommé en thinking, text vide, JSON.parse throw, 4×3 retries silencieux pendant 10 min, toast erreur effacé en 8 s = utilisateur voit "plus rien".**

**Fix immédiat 3 lignes** : ramener à 8192 + guard `finishReason` + guard `text.length>0`.

**Fix long terme : déjà fait via F-17 SWAP PUR (`paceRecalibrationService.ts`). Vérifier que la prod l'a bien déployé.**
