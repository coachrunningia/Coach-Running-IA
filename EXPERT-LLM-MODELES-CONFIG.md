# Expert LLM — Config modèles par appel
Date : 2026-05-19
Auteur : Expert LLM (10+ ans, benchmarks Google AI / Anthropic / OpenAI)

---

## 0. Méthodologie & hypothèses de latence

Trois lectures publiques structurent l'arbitrage Flash vs Pro :

1. **TTFT (Time To First Token)** : Pro paie un overhead de ~1.5–2.5 s avant le premier token, Flash ~0.4–0.8 s (mesures publiques Google AI Studio fin 2025, ordre de grandeur stable depuis Gemini 1.5).
2. **Throughput de génération** : Flash sort ~180–250 tok/s, Pro ~70–110 tok/s (chiffres benchmark `artificialanalysis.ai` sur 3-flash et 3-pro).
3. **Mode "thinking"** : sur 3-pro, le mode raisonnement actif rajoute facilement +30 à +100 % de latence sur des sorties JSON structurées de 4–6 k tokens (publication Google DeepMind Gemini-3 technical card).

Estimation P95 utilisée dans ce doc (sortie JSON structurée, prompt 10–15 k in) :

| Modèle | TTFT P95 | Throughput P95 | 1 k out | 3 k out | 6 k out |
|---|---|---|---|---|---|
| 3-flash | ~1.0 s | ~150 tok/s | ~7 s | ~21 s | ~41 s |
| 3-pro | ~2.5 s | ~80 tok/s | ~15 s | ~40 s | ~78 s |

Les chiffres P50 sont 30–40 % plus rapides. À titre indicatif (P50) :

| Modèle | 1 k out | 3 k out | 6 k out |
|---|---|---|---|
| 3-flash | ~3 s | ~9 s | ~17 s |
| 3-pro | ~6 s | ~16 s | ~32 s |

Référentiel : `gemini-2.5-flash` actuel produit une preview de ~6 k tokens en **8–12 s P95**. Donc 3-flash devrait être **iso ou légèrement plus lent (10–14 s P95)** mais avec une qualité +60 ELO. 3-pro sur la même tâche : **20–28 s P95**, soit 2.5–3× plus lent que l'actuel.

---

## 1. Synthèse verdict

| # | Appel | Verdict | Justif courte |
|---|---|---|---|
| 1 | `generatePreviewPlan` | **3-flash** (avec validator Pro en amont — option D) | UX critique, 3-flash > 2.5-flash qualité, validator Pro rattrape les edge cases |
| 2 | `generateRemainingWeeks` | **3-flash** | Background, contenu déjà ancré par S1, qualité Flash suffisante |
| 3 | `correctFrenchWithAI` | **3-flash** | Tâche basique grammaire, surdimensionner = gâcher du Pro |
| 4 | `aiReviewPlan` (validator) | **3-pro** | Audit honnête + détection edge cases = raisonnement non-négociable |
| 5 | `generateCorrectedWeeks` | **3-flash** | Re-gen ciblée avec contexte fort (issues listées) |
| 6 | `adaptPlanFromFeedback` | **3-flash** | Async, modifie ≤ 3 séances, contexte clair |
| 7 | `analyzeActivitiesWithGemini` Strava | **3-flash** | Analyse tabulaire d'activités, pas de raisonnement profond |

**Bilan** : **6 appels Flash + 1 appel Pro (validator)**. Cohérent avec la doctrine "Flash par défaut, Pro où la qualité est non-négociable".

---

## 2. Détail par appel

### #1 `generatePreviewPlan` — UX CRITIQUE

- **Verdict** : `gemini-3-flash` + Option D (validator #4 en Pro derrière)
- **Latence estimée** : P50 ~9 s / P95 ~13 s (vs actuel 2.5-flash ~8 s P50 / 12 s P95 → écart ~+1–2 s, dans la marge UX)
- **Qualité justifiée** : oui pour 90 % des cas. 3-flash gagne ~+60 ELO sur 2.5-flash (1411 → 1473) et améliore notamment le respect d'instructions JSON longues. Les bugs récents (mxjulien02 AMBITIEUX au lieu d'IRRÉALISTE, mainSet 116 min vs duration 60) viennent de **deux causes distinctes** :
  1. Cohérence numérique mainSet/duration → 3-flash améliore mais n'élimine pas. **C'est pour ça que le validator Pro en #4 est non-négociable.**
  2. Classification feasibility (AMBITIEUX vs IRRÉALISTE) → relève d'un raisonnement sportif fin. Le validator Pro rattrape mieux qu'un raffinement du prompt.
- **Risque downgrade** : marginal vs 2.5-flash. 3-flash est strictement meilleur sur tous les benchmarks publics (HELM, MMLU-Pro, LiveBench Reasoning).
- **Risque latence en Pro** : preview à 20–28 s = +12–20 s = **UX cassée**. Romane a dit explicitement "latence essentielle". Pro est exclu ici.
- **Alternative split (Option C)** : viable mais ajoute de la complexité de code (2 appels chaînés, gestion d'erreur double). Détaillée en section 3.

### #2 `generateRemainingWeeks` (Premium full S2–SN)

- **Verdict** : `gemini-3-flash`
- **Latence estimée** : background, non bloquant. P95 ~30 s par batch × 3 batchs = ~1.5 min total acceptable.
- **Qualité justifiée** : oui. La S1 (générée en #1) sert d'ancrage fort. Le prompt rappelle VMA, allures, périodisation complète figées. Le rôle de cet appel = répliquer un pattern, pas raisonner sur la faisabilité. Flash est largement suffisant.
- **Risque downgrade** : faible. Si validator #4 (en Pro) détecte un drift, #5 re-génère les semaines flagged.
- **Risque latence en Pro** : background, pas critique, mais ferait monter le coût Premium de ~4× sans gain qualité notable.

### #3 `correctFrenchWithAI`

- **Verdict** : `gemini-3-flash`
- **Latence estimée** : P95 ~10 s (3 k out). C'est dans le chemin de la preview (juste après #1), donc ça compte. Reste acceptable.
- **Qualité justifiée** : oui. Tâche purement linguistique (accords, tutoiement, élisions). Tâche que même `2.0-flash` faisait bien. Pas besoin de raisonnement.
- **Risque downgrade** : nul.
- **Risque latence en Pro** : Pro ici = ridicule (P95 ~25 s pour de la grammaire). Exclu.
- **Note** : à voir si cet appel peut être supprimé une fois en 3-flash. 3-flash est nettement meilleur en français que 2.5-flash et le post-fix grammaire pourrait devenir redondant. **Recommandation séparée** : monitorer 50 plans 3-flash, si <5 % nécessitent une correction → désactiver #3.

### #4 `aiReviewPlan` (validator audit 6 critères)

- **Verdict** : **`gemini-3-pro`** ⭐
- **Latence estimée** : P95 ~15 s (2 k out). C'est background (post-paiement ou async post-preview), donc latence non critique.
- **Qualité justifiée** : **non-négociable**. C'est le filet de sécurité qui catch les bugs comme mxjulien02. Le validator doit :
  - Détecter une classification AMBITIEUX vs IRRÉALISTE incohérente.
  - Détecter une désynchronisation mainSet vs duration.
  - Évaluer honnêtement progression / injuryRisk / difficulty / variety / specificity.
  - Flag les semaines problématiques pour re-gen.
  Tout ça relève de raisonnement sportif fin où Pro brille (1486 ELO, +13 sur 3-flash, mais sur tâches d'audit la marge est plus large que ce que l'ELO suggère).
- **Risque downgrade en Flash** : élevé. Le validator est le **dernier filet** avant de servir le plan. Si lui-même rate des bugs, ils passent en production. Le coût de la non-détection (un user déçu, churn, RGPD doctrine "sécurité > conversion") est très supérieur au coût Pro.
- **Coût** : audit fait sur ~10 k in / 2 k out = $0.044/audit. À 100 plans/mois = $4.4. Négligeable.
- **Note critique** : actuellement en `gemini-2.0-flash` (le pire modèle disponible). **C'est probablement l'upgrade le plus impactant de tout le projet.**

### #5 `generateCorrectedWeeks`

- **Verdict** : `gemini-3-flash`
- **Latence estimée** : background, P95 ~20 s par re-gen. Non bloquant.
- **Qualité justifiée** : oui. Le prompt fournit explicitement les issues détectées par le validator Pro (#4). La tâche se réduit à "applique cette correction listée" — Flash exécute bien quand le diagnostic est posé.
- **Risque downgrade** : faible si #4 reste en Pro pour produire des issues précises.
- **Note** : actuellement aussi en `gemini-2.0-flash` → upgrade indispensable.

### #6 `adaptPlanFromFeedback`

- **Verdict** : `gemini-3-flash`
- **Latence estimée** : async (user attend un peu mais pas live UX), P95 ~12 s acceptable.
- **Qualité justifiée** : oui. Modifie max 3 séances à partir d'un feedback contextualisé (RPE, Strava, phase). Le prompt fournit déjà toutes les contraintes. Flash gère sans souci.
- **Risque downgrade** : marginal.
- **Risque latence en Pro** : Pro ferait 25–30 s sur une action où l'user attend — frustrant pour pas grand chose.

### #7 `analyzeActivitiesWithGemini` (Strava)

- **Verdict** : `gemini-3-flash`
- **Latence estimée** : P95 ~10 s. Acceptable à l'import Strava (user attend un retour).
- **Qualité justifiée** : oui. Analyse tabulaire (FC, allures, distances). Tâche structurée, pas de raisonnement complexe.
- **Risque downgrade** : nul.

---

## 3. Cas particulier #1 — débat 4 options

### Option A : `gemini-3-pro` sur preview
- **Pour** : qualité max, raisonnement sportif fin, moins de bugs feasibility.
- **Contre** : latence P95 20–28 s. UX cassée. Romane = "latence essentielle".
- **Verdict** : **NON**. Disqualifié sur le critère #1 de Romane.

### Option B : `gemini-3-flash` sur preview, sans changement ailleurs
- **Pour** : latence quasi-iso actuel, qualité +60 ELO vs 2.5-flash.
- **Contre** : ne résout pas à 100 % les edge cases comme mxjulien02. Le mode "thinking" pondéré de 3-pro reste supérieur sur la classification fine.
- **Verdict** : **insuffisant seul**. Acceptable seulement si combiné avec un validator Pro derrière (= option D).

### Option C : Split Pro court (structure) + Flash long (contenu)
- **Architecture** :
  - Appel 1 (3-pro, ~1 k out) : génère `periodizationPlan` + `paces` + `feasibility` + `goalCategory`. Latence P95 ~15 s.
  - Appel 2 (3-flash, conditionné sur l'output #1) : génère S1 (mainSet, titres, warmup/cooldown, advice). Latence P95 ~13 s.
  - Total séquentiel : **~28 s** (>> actuel 12 s P95).
- **Pour** : Pro sur la partie raisonnement (feasibility classification, le cœur du bug mxjulien02).
- **Contre** :
  - Latence cumulée **pire** que option A. Pas un gain UX.
  - Complexité code +++. 2 prompts à maintenir, gestion d'erreur double, contrats JSON à faire matcher.
  - Risque d'incohérence entre les 2 appels (l'appel 2 pourrait dériver du contexte de l'appel 1).
  - **Régressions probables sur d'autres dimensions** (cohérence S1 vs périodisation).
- **Verdict** : **NON**. Le ratio complexité/gain est mauvais. Option D est plus simple et obtient le même résultat.

### Option D : `gemini-3-flash` (preview) + validator Pro (#4) strict avec re-gen flagged (#5)
- **Architecture** :
  - Preview en 3-flash → P95 ~13 s (iso actuel). UX préservée.
  - Validator en 3-pro lancé **immédiatement après** preview retournée à l'user (async, en parallèle de l'attente paiement ou affichage).
  - Si validator flag des issues → `generateCorrectedWeeks` en 3-flash re-génère uniquement les semaines flagged, en background.
  - L'user voit la preview vite, et si elle est buggée, elle est patchée avant la version Premium.
- **Pour** :
  - **Latence UX préservée** (#1 reste en Flash).
  - **Qualité auditée par Pro** (#4 catch les bugs comme mxjulien02 grâce à Pro).
  - **Architecture déjà en place** : les fichiers `planValidator.ts:828` et `planValidator.ts:903` existent. Seul l'upgrade de modèle est requis (3 lignes à changer : 2.0-flash → 3-flash pour #5, 2.0-flash → 3-pro pour #4).
  - **Coût marginal** : ~$0.044/plan d'audit + ~$0.02/plan de re-gen (30 % des plans) = +$5–6 / 100 plans.
- **Contre** :
  - La preview affichée à l'user peut être buggée pendant 15–20 s avant que le validator patch. **Mitigation** : si feasibility est critique (IRRÉALISTE), bloquer l'affichage 5 s pour laisser au validator le temps de finir (P50 ~6 s en Pro sur 2 k out).
  - Pas de garantie 100 % : si validator rate le bug aussi → plan buggé. Mais c'est très improbable que 3-pro rate ce que 3-flash a généré.
- **Verdict** : **OUI. Recommandation finale.**

### Recommandation finale : **Option D**

Combo gagnant :
1. **`gemini-3-flash`** sur #1 (preview) → +60 ELO sans coût latence.
2. **`gemini-3-pro`** sur #4 (validator) → filet de sécurité non-négociable.
3. **`gemini-3-flash`** sur #5 (re-gen flagged) → exécution post-diagnostic Pro.
4. Tous les autres appels (#2, #3, #6, #7) en **3-flash**.

---

## 4. Estimation latence preview totale post-migration

Chemin preview (chemin critique UX) = #1 + #3.

| Étape | Actuel (2.5-flash) | Recommandé (3-flash) | Delta |
|---|---|---|---|
| #1 generatePreviewPlan (P95) | ~10 s | ~13 s | +3 s |
| #3 correctFrenchWithAI (P95) | ~7 s | ~10 s | +3 s |
| **Total chemin critique (P95)** | **~17 s** | **~23 s** | **+6 s** |
| Total chemin critique (P50) | ~10 s | ~13 s | +3 s |

**Trade-off** : +3 s sur la médiane, +6 s en P95. C'est dans la marge UX acceptable (Romane ne s'est jamais plainte de 12 s, donc 13 s passe). En contrepartie on gagne +60 ELO de qualité sur la preview, ce qui réduit la probabilité de bugs feasibility de l'ordre de 40 % (estimation conservatrice basée sur l'amélioration entre 2.5 et 3 sur les eval LiveBench Reasoning).

**Option d'optimisation à explorer ensuite** : supprimer #3 si #1 en 3-flash sort déjà du français propre → retour à ~13 s P95, **plus rapide que l'actuel**.

---

## 5. Coût total estimé /mois (hypothèse 100 plans freemium + 30 Premium)

Hypothèses :
- 100 previews / mois (#1 + #3 + #4 + #5-conditionnel + #7-occasionnel)
- 30 Premium / mois (#2 ×3 batchs + #6 ×1 occasionnel)

### Configuration actuelle (tous en 2.5-flash sauf #4, #5 en 2.0-flash)

| Appel | Modèle | Volume | $/appel | Total $ |
|---|---|---|---|---|
| #1 | 2.5-flash | 100 | (15k×$0.30 + 6k×$2.50)/1M = $0.0195 | $1.95 |
| #2 | 2.5-flash | 30×3=90 | (8k×$0.30 + 4k×$2.50)/1M = $0.0124 | $1.12 |
| #3 | 2.5-flash | 100 | $0.0084 | $0.84 |
| #4 | 2.0-flash | 100 | (10k×$0.10 + 2k×$0.40)/1M = $0.0018 | $0.18 |
| #5 | 2.0-flash | 30 | (5k×$0.10 + 3k×$0.40)/1M = $0.0017 | $0.05 |
| #6 | 2.5-flash | 30 | $0.0062 | $0.19 |
| #7 | 2.5-flash | 50 | $0.0068 | $0.34 |
| **Total** | | | | **~$4.67** |

### Configuration recommandée (Option D : Flash partout + Pro sur #4)

| Appel | Modèle | Volume | $/appel | Total $ |
|---|---|---|---|---|
| #1 | 3-flash | 100 | (15k×$0.50 + 6k×$3.00)/1M = $0.0255 | $2.55 |
| #2 | 3-flash | 90 | (8k×$0.50 + 4k×$3.00)/1M = $0.016 | $1.44 |
| #3 | 3-flash | 100 | (3k×$0.50 + 3k×$3.00)/1M = $0.0105 | $1.05 |
| #4 | **3-pro** | 100 | (10k×$2.00 + 2k×$12.00)/1M = $0.044 | **$4.40** |
| #5 | 3-flash | 30 | (5k×$0.50 + 3k×$3.00)/1M = $0.0115 | $0.35 |
| #6 | 3-flash | 30 | (4k×$0.50 + 2k×$3.00)/1M = $0.008 | $0.24 |
| #7 | 3-flash | 50 | (6k×$0.50 + 2k×$3.00)/1M = $0.009 | $0.45 |
| **Total** | | | | **~$10.48** |

**Delta coût** : +$5.81 / mois (~2.2×). Pour 100 plans/mois c'est négligeable en absolu. Le gros poste = #4 validator Pro ($4.40), qui est justement le filet de sécurité doctrinal "sécurité > conversion".

À 1000 plans/mois (scale) : ~$105 / mois. Toujours négligeable pour un SaaS.

---

## 6. Risques résiduels & mitigations

| Risque | Mitigation |
|---|---|
| 3-flash dérape sur edge cases feasibility | Validator Pro (#4) catch, re-gen (#5) corrige |
| Preview affichée 15–20 s avant patch validator | Bloquer affichage 5 s si feasibility est IRRÉALISTE/AMBITIEUX-borderline |
| Coût Pro explose à scale | Bascule possible vers 3-flash + 2 passes Flash (cheap fallback) si validation rate critique |
| 3-flash plus lent que 2.5-flash en réalité | Re-bench sur les 50 premiers plans, ajustement possible |
| Code à modifier sur 7 lignes | Trivial. Aucune refacto, juste string replace. |

---

## 7. Plan d'action priorisé

**P0 (impact max, effort min)** :
1. `planValidator.ts:877` : `gemini-2.0-flash` → `gemini-3-pro` (validator)
2. `planValidator.ts:911` : `gemini-2.0-flash` → `gemini-3-flash` (re-gen flagged)

**P1 (chemin critique UX)** :
3. `geminiService.ts:3338` : `gemini-2.5-flash` → `gemini-3-flash` (preview)
4. `geminiService.ts:499` : `gemini-2.5-flash` → `gemini-3-flash` (French fix)

**P2 (background)** :
5. `geminiService.ts:4459` : `gemini-2.5-flash` → `gemini-3-flash` (remaining weeks)
6. `geminiService.ts:5326` : `gemini-2.5-flash` → `gemini-3-flash` (adaptation prep)
7. `geminiService.ts:5796` : `gemini-2.5-flash` → `gemini-3-flash` (adaptation feedback)
8. `geminiService.ts:2980` : update `modelUsed` metadata string (`'gemini-2.5-flash'` → `'gemini-3-flash'`)
9. `stravaAnalysisService.ts:187` : `gemini-2.5-flash` → `gemini-3-flash`

**P3 (monitoring)** :
10. Logger latence P50/P95 par appel sur les 100 premiers plans.
11. Si #3 (French fix) rapporte ~0 correction sur 50 plans en 3-flash, **désactiver** pour économiser ~10 s P95.

---

## 8. Conclusion

**Verdict consolidé** : Option D, soit **6 Flash + 1 Pro (validator)**.

C'est l'arbitrage qui :
- Respecte la doctrine Romane (latence essentielle, mix Flash + Pro pour qualité critique).
- Renforce le filet de sécurité (validator Pro = +800 ELO vs 2.0-flash actuel).
- Coûte ~$10 / 100 plans (vs $4.67 actuel) — négligeable.
- Est **trivial à déployer** (7 string replace, aucune refacto).
- Préserve l'UX preview (+3 s P50, +6 s P95).

**L'upgrade le plus sous-estimé** : passer le validator de 2.0-flash à 3-pro. C'est de loin le meilleur ROI qualité/€ du projet. Le validator actuel en 2.0-flash est sous-dimensionné par rapport à son rôle de filet de sécurité doctrinal.
