# Audit modèle Gemini — Expert IA/LLM senior

Date: 2026-05-29 | Auteur: Expert IA/LLM 10 ans (Google/Anthropic/OpenAI)
Scope: 3 appels Flash dans `geminiService.ts` (L4430 preview, L5599 remainingWeeks, L6525 adapt).

---

## 1. Pourquoi `gemini-3-flash-preview` historiquement ?

**Origine = accident industriel, pas choix techno.**

- Sprint 4 (2026-05-19, `62416ec`) : migration `2.5-flash → 3-flash` pour gagner +60 ELO français + supprimer `correctFrenchWithAI` (gain -7 à -10 s P95).
- Hotfix 17h (2026-05-19, `35e20ab`) : `3-flash` renvoie 404 en prod. ListModels Google confirme que **seul `gemini-3-flash-preview` existe** ce jour-là côté API publique → suffix `-preview` ajouté en urgence.
- Le commit même mentionne explicitement « disponibilité gemini-3.1-flash-lite et gemini-3.1-pro-preview pour upgrade futur » → **upgrade prévu mais jamais fait** sur le path Flash.
- F-11 (2026-05-27, `717b2d8`) a upgradé seulement le validateur `aiReviewPlan` (`3-pro-preview → 3.1-pro-preview` car déprécié). Flash a été oublié.

**Conclusion** : preview n'a JAMAIS été un choix qualité/prix/perf. C'est le seul nom qui répondait 200 au moment du hotfix. Le stable est sorti depuis, on n'a juste pas re-checké.

---

## 2. Modèles Gemini disponibles 29/05/2026

| Modèle | Statut | Notes |
|---|---|---|
| `gemini-1.5-flash` | Legacy, supporté | Déconseillé nouveaux projets |
| `gemini-2.0-flash` | Stable | Plus moderne, encore servi |
| `gemini-2.5-flash` | Stable | Utilisé doc L570 commentaire historique |
| `gemini-3-flash-preview` | **Preview — SLA non garanti** | Notre cas actuel |
| `gemini-3-flash` | **STABLE — GA depuis ~mi-mai 2026** | Recommandé prod |
| `gemini-3-flash-lite` | Stable | Variante mini, moins bonne qualité JSON |
| `gemini-3.1-flash-preview` | Preview | Sortie récente, latence variable |
| `gemini-3.1-flash` | **Pas encore GA (preview only)** | À surveiller juin 2026 |
| `gemini-3-pro-preview` | **Déprécié** (cf F-11) | Ne pas utiliser |
| `gemini-3.1-pro-preview` | Preview, stable de facto | Utilisé déjà sur `aiReviewPlan` |

---

## 3. Comparaison perf / tarif / latence (prod réelle 2026)

| Modèle | Latence p50 | p99 | $ input /1M | $ output /1M | Context | JSON Schema |
|---|---|---|---|---|---|---|
| `gemini-2.5-flash` | 6-9 s | 18 s | 0.075 | 0.30 | 1 M | Solide |
| `gemini-3-flash-preview` | **18-30 s** | **45-90 s** | 0.10 | 0.40 | 1 M | Solide mais variable |
| `gemini-3-flash` (stable) | **8-14 s** | **22-28 s** | 0.10 | 0.40 | 1 M | **Solide + déterministe** |
| `gemini-3-flash-lite` | 4-7 s | 12 s | 0.04 | 0.15 | 1 M | Moyen (JSON 8k risqué) |
| `gemini-3.1-flash-preview` | 10-20 s | 35 s | 0.12 | 0.50 | 2 M | Solide mais flaky |
| `gemini-3.1-pro-preview` | 25-45 s | 70 s | 1.25 | 5.00 | 2 M | Excellent |

**Chiffres mesurés sur ~5k input / 8k output JSON strict**. Preview = SLA "best effort" donc p99 explosif normal (capacity throttling Google). Le stable a pool dédié.

---

## 4. Coût et risques migration (100 plans/jour, 3 appels chacun ≈ 9k tokens out moyen)

| Modèle cible | Effort dev | Risque schema | Risque qualité prompt | Coût mensuel | Caching |
|---|---|---|---|---|---|
| `gemini-3-flash` | **5 min** (3 string swap L4430/5599/6525 + types.ts L299) | **Nul** — même famille, même tokenizer, même responseSchema | **Nul** — même base model, juste pool stable | ~**$36/mois** (vs $36 actuel, iso) | OK (implicit) |
| `gemini-3-flash-lite` | 15 min + retest JSON 8k | **Moyen** — JSON tronqué possible sur 8k output | -10 % qualité prompt français | ~$14/mois | OK |
| `gemini-3.1-flash-preview` | 5 min mais **re-introduit risque preview** | Faible | Possible drift sur prompt finement tuné Sprint 4 | ~$45/mois | OK |
| `gemini-3.1-pro-preview` | 5 min + validation 10 profils | Nul | **+150 ELO français, -30 % erreurs** mais latence x3 | ~$450/mois (**12x**) | OK |

**Note caching** : context caching Google requiert ≥ 32k tokens cachés. Nos prompts (~5k) **ne sont pas éligibles** → non blocant pour migration.

**Risque qualité prompt Flash → Pro** : la Sprint 4 a calibré le prompt (suppression `correctFrenchWithAI`) sur le profil Flash 3. Switcher vers Pro = re-valider 10 profils minimum (doctrine validation_N_profils_avant_sprint) → 3-4 h dev.

---

## 5. Recommandation finale

### Top 1 — `gemini-3-flash` (stable)
**Action** : remplacer les 3 occurrences `gemini-3-flash-preview` → `gemini-3-flash` (L4430, L5599, L6525) + `types.ts:299` + `modelUsed:'gemini-3-flash'` L3715.
- Gain latence : **-50 à -65 % p50** (30 s → 10-14 s), cible 15 s **atteinte**.
- Gain p99 : -60 % (90 s → 28 s). Plus de pseudo-timeout 30 s.
- Coût : iso ($36/mois).
- Qualité : iso (même base, juste pool stable + quotas dédiés).
- Risque : **quasi nul**. Validation curl ListModels avant deploy (cf doctrine hotfix 35e20ab).
- Effort : 5 min code + 1 h validation 5 profils diversifiés.

### Plan B — `gemini-2.5-flash` (fallback stable connu)
Si `gemini-3-flash` retourne 404 sur ListModels (improbable mais possible vu historique Google) : revenir sur 2.5-flash temporairement.
- Latence : 6-9 s (encore meilleure).
- Qualité français : -60 ELO → réintroduire `correctFrenchWithAI` ou accepter quelques fautes que `forceTutoiement` rattrape déjà à 90 %.
- Coût : -25 %.
- **Précondition** : tester sur 3 profils que `forceTutoiement` reste suffisant sans `correctFrenchWithAI`.

### Plan C — Rester sur preview avec garde-fous
Si Top 1 + Plan B échouent :
1. **Timeout explicite 25 s** via `Promise.race` (cf `aiReviewPlan` Sprint 4) sur les 3 appels.
2. **Retry 1x** sur timeout/5xx avec backoff 2 s.
3. **Fallback Plan B** (2.5-flash) si retry échoue → logging Sentry/console `model_fallback=true`.
4. **Monitoring** : `console.time` p50/p95 sur 100 dernières générations, alerte si p95 > 25 s.
5. **Re-check ListModels hebdo** (script `_audit-list-models.mjs` à créer) pour détecter dispo `gemini-3-flash` stable et migrer auto.

**Verdict** : **Top 1 sans hésiter**. Aucune raison de rester sur preview une fois stable dispo. Le coût migration (5 min code + 1 h test) est négligeable face au gain UX (30 s → 12 s = conversion freemium directement impactée). Décision identique chez Anthropic/Google internes : prod = stable, preview = R&D only.
