# Audit benchmark Gemini Flash — Dev senior (15 ans backend / LLM prod)

Verdict global : **benchmark NON conclusif, 3 runs = bruit pur**. Le résultat est plausible mais ne suffit pas pour acter un swap. Détails ci-dessous.

---

## 1. Validité statistique du benchmark — VERDICT : NON conclusif

Pièges identifiés :
- **n=3 par modèle** : variance Gemini Flash en prod typique = sigma 15-35% sur p50. Sur 3 tirages, IC95 ≈ ±40%. Les écarts 13s vs 19s (+46%) tombent **DANS le bruit**.
- **Heure unique** : Gemini a des creux de charge marqués (off-peak EU = nuit US). Un run 17h Paris = peak EU + peak US-East = pire moment. Refaire 02h-08h Paris donnera 30-50% de mieux sur TOUS les modèles, mais pas forcément même ratio.
- **Pas de warmup / cold start** : 1er appel toujours plus lent (connexion HTTPS, DNS, edge routing Google). Run 1 pollue p50 sur n=3.
- **Pas de region pinning** : SDK `@google/generative-ai` route via load-balancer global, l'endpoint réel peut varier entre runs.
- **Ordre séquentiel non randomisé** : modèles testés toujours dans le même ordre → biais conditions réseau temporel.

Minimum acceptable : **n=20 par modèle**, **randomisation ordre**, **2 créneaux horaires** (peak EU + off-peak), warmup run jeté.

---

## 2. Représentativité du prompt — VERDICT : PAS du tout représentatif

Le benchmark teste 415 tk in / 1150 tk out. La prod fait **5000 tk in / 8000 tk out**. Implications :
- Latence LLM = **principalement output-bound** (TTFT + N × time-per-token). En prod, output 7x plus gros → latence dominée par génération, pas par prompt.
- Extrapoler linéairement est **dangereux** : preview et stable peuvent avoir des throughputs output différents (tokens/s). Sur 1150 tk out, l'écart fixe (TTFT) domine. Sur 8000 tk out, c'est le throughput qui domine.
- **Le stable peut redevenir compétitif voire meilleur sur gros output** si son tokens/s est supérieur même avec TTFT plus lent.
- Caching côté Google : sur prompts répétitifs 5000 tk avec system prompt stable, le stable bénéficie souvent mieux du context caching (preview = cache moins mature).

Conclusion : **benchmark mesure le mauvais régime**. Inutilisable pour décision prod.

---

## 3. Preview > Stable, raisons plausibles

Hypothèses pro classées par crédibilité :
1. **Queue dédiée preview / capacité sur-provisionnée Google** (HAUTE) : preview = peu de trafic, infra dédiée test bed, GPUs sous-utilisés. Pattern observé chez Google/OpenAI/Anthropic : modèles preview souvent plus rapides que stable pendant 2-6 semaines post-launch.
2. **Stable = quotas/throttling partagé entreprise** (MOYENNE) : 3.5-flash sert millions de QPS, queue shared tenant, soft throttle au niveau projet.
3. **Architecture preview plus légère** (FAIBLE) : preview pourrait être un modèle plus petit testé en A/B, ce qui expliquerait vitesse ET qualité différente.
4. **Bias échantillon n=3** (TRÈS HAUTE) : tout simplement, +46% sur 3 runs n'est statistiquement pas distinguable du bruit.

**Risque majeur** : un modèle preview peut voir sa latence **doubler du jour au lendemain** quand Google rebalance les GPUs vers le stable. Aucune SLA. Mettre la prod sur preview = **dette technique + risque incident**.

---

## 4. Validation stratégie PM — VERDICT : OUI, c'est la bonne approche

Le PM a raison sur le diagnostic : **bottleneck = output tokens**, pas le modèle. Détail :

| Optim PM | Gain réaliste | Confiance | Note |
|---|---|---|---|
| Bump maxOutputTokens 8192→16384 | 0 à -1s | **FAIBLE** | maxOutputTokens est un PLAFOND, pas un objectif. Si la sortie réelle reste 8000 tk, zéro gain. Sauf si tu hittes le plafond et truncates → là oui gros gain. À vérifier dans les logs. |
| Compresser prompt 250→120 tk | -0.2 à -0.5s | MOYENNE | Prompt processing rapide chez Gemini Flash (~5-10ms/100tk). Gain réel <1s. PM optimiste. |
| Drop rappel FORMAT JSON | -0.5 à -1s | HAUTE | Si responseSchema strict actif, le rappel est redondant ET pousse le modèle à doubler des tokens de structure. Gain output direct. |
| Compresser MAINSET_COHERENCE + RACE_DAY | -0.5 à -1.5s | MOYENNE | Dépend de la verbosité actuelle. Si ces sections font 500+ tk, gain réel. |

**Total réaliste cumulé : -2 à -4s** (pas -6 à -11s comme additionné). Reste excellent. Stratégie **VALIDÉE**.

Optim manquante critique : **streaming**. Si l'UX peut consommer le JSON en streaming (parsing incrémental), perçu user = -50% latence. Cherche `responseStream` côté Gemini SDK.

---

## 5. Verdict final + 3 actions MAINTENANT

**Recommandation : Garder preview en dev, NE PAS swap en prod, appliquer optims PM, refaire benchmark sérieux.**

Raisons :
- Benchmark actuel ne prouve rien (n=3, mauvais régime tokens).
- Preview en prod = risque SLA non assumable (peut casser sans préavis Google).
- Les optims PM rapportent plus que le swap modèle (4s gagnés vs 6s incertains).

**3 actions à exécuter MAINTENANT (ordre prio) :**

1. **Appliquer les 3 optims PM à confiance HAUTE/MOYENNE immédiatement** : drop rappel JSON, compresser MAINSET+RACE_DAY, compresser soft quality. Bump maxOutputTokens uniquement si logs prouvent truncation. Gain attendu prod : -2 à -4s, zéro risque.
2. **Refaire benchmark sérieux AVANT toute décision modèle** : n=20 par modèle, prompt 5000 tk + output 8000 tk (copier le vrai prompt prod), randomiser ordre, 2 créneaux (10h Paris + 03h Paris), jeter run 1, calculer p50/p95/p99 + sigma. Coût ~30 min compute, ~5€ API. Indispensable.
3. **Investiguer streaming Gemini** : si UX compatible, c'est -50% latence perçue. ROI massif vs effort. Spike technique 2h.

Si après benchmark sérieux le stable est dans ±10% du preview : **switch stable immédiatement** (sécurité SLA > 1-2s latence). Si preview reste >20% plus rapide ET les optims ne suffisent pas : envisager preview EN PROD avec **fallback automatique stable** sur timeout 25s.
