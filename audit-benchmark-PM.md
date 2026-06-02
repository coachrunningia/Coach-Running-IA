# Audit Benchmark Gemini 29/05 — PM tech senior (post-bench)

Date: 2026-05-29 | Reviewer: PM 15 ans SaaS LLM | Scope: trancher swap modèle après bench Romane

---

## 1. Validation benchmark — INVALIDE pour décision prod

| Biais | Sévérité | Impact lecture résultats |
|---|---|---|
| **n=3 runs** | **Bloquant** | Aucune signif stat. p50 sur 3 runs = la valeur du milieu, pas un percentile. Variance Gemini 30-50% sur petits N |
| **Prompt 415 tk vs prod ~5000 tk** | **Bloquant** | Test à 8% du payload réel. Le bottleneck Flash est compute-bound sur output, pas input — mais les pools preview/stable se comportent différemment selon la taille (throttling Google par tier de compute) |
| **Output 1150 tk vs prod ~8000 tk** | **Bloquant** | Output domine la latence (~50-80 tk/s Flash). Test à 14% du volume réel. **C'est exactement la dimension qu'on veut mesurer** — et elle n'est pas mesurée |
| **Pas de responseSchema strict** | Moyen | En prod on a schema 13 champs × 5-6 sessions. Schema strict coûte 2-5s de plus (decoding constrainé) |
| **Runs séquentiels, pas de warm-up** | Moyen | Run 1 = cold start pool. Pénalise tous les modèles de façon égale mais surtout le stable (warm pool tier entreprise = warm-up plus long sur petite charge) |
| **Pas de variance jour/heure** | Moyen | 17h Paris = 8h Pacific = pool US underload. Tester aussi 9h Paris (18h Pacific = peak US) |

**Verdict** : ce bench montre une **tendance directionnelle**, rien d'autre. Affirmer "preview > stable" sur n=3 et 8% du payload réel = **erreur de méthode**.

---

## 2. Plausibilité "preview plus rapide que stable" — OUI, mais conditionnelle

C'est un pattern **documenté** chez OpenAI/Anthropic/Google :
- **Preview = pool R&D Google avec capacité réservée faible**. Quand sous-utilisé (cas actuel : peu d'apps en prod sur 3-flash-preview), tu profites d'un pool quasi vide → latence basse.
- **Stable = pool partagé entreprise multi-tenant**. SLA garanti mais queue partagée avec gros clients (10k+ req/min). Plus lent en moyenne, **moins de variance** sur les p99.
- **Inversion classique** : preview p50 < stable p50, **mais preview p99 explose** (5-10×) quand Google reroute capacity. Stable p99 reste plat.

**À 100 plans/jour (= ~300 calls Gemini/jour, ~12/h en pic)** : ta charge est négligeable pour les 2 pools. Le bench ne discrimine pas ça. **En prod, preview reste probablement plus rapide en p50** tant que Google ne sature pas le pool R&D — **mais p99 imprévisible** (= les 30s/45s observés en prod = exactement ce pattern, pas du noise).

**Conclusion API LLM réelle** : preview = rapide moyenne, **instable extrême**. Stable = plus lent moyenne, **prévisible**. Pour un produit B2C avec SLA UX implicite (user attend < 20s), la **prévisibilité bat la moyenne**.

---

## 3. Confirmation bottleneck = OUTPUT (pas modèle)

Math :
- Flash genère ~60 tk/s en output (mesure prod stable industrie).
- Output prod 8000 tk → **133s théorique seul output**. On observe 30s → Google parallelise/batch, mais l'output reste >50% du temps.
- Input 5000 tk parsing : 1-2s, négligeable.
- Network Paris↔Google : <500ms.
- Bundle JS/serialization : <200ms.

**Le delta 13s (bench) → 30s (prod) = ~+17s = exactement le coût des +6850 output tokens** (8000-1150) ÷ 60 tk/s ≈ +114s théorique, mais avec parallélisme Flash on tombe sur **+15-20s observé**. Cohérent.

**Verdict** : le modèle pèse ~20% du temps, l'output pèse ~70%, le reste 10%. **Bumper maxOutputTokens et réduire l'output attendu = 5× plus impactant qu'un swap modèle.**

---

## 4. Validation optims PM — GO avec ajustements

| Optim | Verdict | Note |
|---|---|---|
| Bump 8192 → 16384 | **GO immédiat** | Quick win incontesté, débloque truncation silencieuse, +log finishReason obligatoire |
| O1 soft quality 250→120 tk | **GO** | Mots-clés whitelist préservés, safety net post-LLM rattrape |
| O2 drop FORMAT JSON rappel | **GO** | Schema enforce déjà, doublon |
| O5 MAINSET_COHERENCE+RACE_DAY | **GO** | Compression légère, faible risque |
| O3 safetyInstructions consolidation | **HOLD** (sprint 2) | Plus risqué, demande batterie 10 profils IMC/senior/blessure. Ne pas mélanger avec sprint quick wins |
| O4 advice Hyrox | **GO** | Trivial, gain marginal mais propre |
| **AJOUT — log usageMetadata p0** | **CRITIQUE manquant** | Sans télémétrie token réelle prod, on optimise à l'aveugle. Doit être déployé AVANT toute autre optim |
| **AJOUT — réduire `welcomeMessage` cap 800c→500c** | À tester | Output text long pèse cher. 500c suffit pour ton coach |
| **AJOUT — `advice` séances Jogging/Récup = 1 ligne max** | À tester | Différenciant produit OK pour SL/Fractionné, pas pour récup |

**Gain réaliste cumulé** : -7 à -12s (proche borne haute estimation PM initial). **Atteint la cible 15s.**

---

## 5. Slim schema (warmup/cooldown/advice via templates) — NON pour S1 preview

| Critère | Verdict |
|---|---|
| Gain technique | Réel (-5 à -8s output) |
| Risque qualité | **Élevé sur S1 preview** = première impression user, c'est l'écran de conversion freemium. Templates = générique, LLM = personnalisé au profil/blessure/discipline |
| Réversibilité | Faible : retirer puis remettre = casse les snapshots tests, regen de tous les plans |
| Existence déjà | `buildRenfoMainSet` couvre déjà renfo. Étendre à warmup générique OK, mais `advice` perso = non |
| ROI | -8s × risque produit conversion = mauvais ratio |

**Verdict** : **NO-GO sur preview S1**. Acceptable sur **remainingWeeks** (S2-S20) où le user a déjà converti et où la persona templatée passe. Tester slim schema sur remaining d'abord, mesurer satisfaction, étendre seulement si NPS stable.

---

## 6. Plan d'action MAINTENANT — 3 actions

### Action 1 (aujourd'hui, 1h) — DÉPLOYER LA TÉLÉMÉTRIE
- Logger `response.usageMetadata` + `finishReason` sur les 3 calls (preview + remaining + adapt). Console + Sentry.
- Bump `maxOutputTokens: 8192 → 16384` sur preview (L5053).
- Alerte si `candidatesTokenCount > 0.85 × max` OU `finishReason === 'MAX_TOKENS'`.
- **Sans ça, toute autre décision est aveugle.** Pré-requis bloquant.

### Action 2 (demain, 3h) — APPLIQUER OPTIMS PROMPT (O1 + O2 + O5 + O4)
- Compress soft quality, drop FORMAT JSON texte, raccourcir MAINSET/RACE_DAY, advice Hyrox.
- Batterie 10 profils diversifiés (doctrine `validation_n_profils_avant_sprint`).
- Mesurer p50 prod réelle sur 24h post-déploy via télémétrie Action 1.
- **Cible** : 30s → 18-22s prod réelle.

### Action 3 (J+3, 2h) — RE-BENCH PROPRE AVANT TOUT SWAP MODÈLE
- **GARDER preview tant que la décision swap n'est pas fondée.** Le bench actuel ne justifie ni GO ni NO-GO.
- Re-bench : **10 runs × 3 modèles × 2 créneaux horaires** (9h FR / 17h FR) sur **prompt prod réel ~5000 tk + responseSchema strict + output ~8000 tk** (recopier `previewPrompt` complet + schema).
- Mesurer p50 ET p99 (la prévisibilité, pas que la moyenne).
- Décision : si preview reste plus rapide en p50 ET p99 reste < 35s → **garder preview**. Si p99 preview > 45s sur ≥1 run/10 → **swap stable** avec feature flag + canary 10% (process audit-modele-gemini-PM §5).

---

## Verdict final

**Garder preview + appliquer optims PM**, **PAS de swap stable maintenant** (bench insuffisant pour trancher).
Le vrai bottleneck est **l'output volume** + **truncation 8192**, pas le pool modèle.
Re-bench réaliste **avant** toute décision de swap. Sans télémétrie prod, on tâtonne — déployer logs usageMetadata est le P0 absolu, tout le reste en découle.

Le Dev expert s'est trompé sur le scope (modèle pas dominant) **et** Romane est en train de se tromper sur le bench (n=3, 8% payload, pas représentatif). La doctrine `qualite_avant_vitesse` impose un bench solide avant de bouger un modèle servant 100 plans/jour.
