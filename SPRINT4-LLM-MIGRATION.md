# Sprint 4 — Migration LLM modèles + diète correctFrenchWithAI
Date : 2026-05-19

## Contexte

Suite à l'audit `AUDIT-UTILITE-7-APPELS-LLM.md` (7 appels LLM passés en revue) et
aux validations experts `EXPERT-LLM-MODELES-CONFIG.md` + `EXPERT-DEV-MODELES-FAISABILITE.md`.

Décision Romane :
- **Option D** : migration vers `gemini-3-flash` (5 appels) + upgrade validator vers `gemini-3-pro`
- **Suppression** : `correctFrenchWithAI` (LLM correcteur français redondant avec `forceTutoiement` regex)

## Modifs appliquées

### 1. Migrations de modèle (8 sites)

| # | Fichier:Ligne | Avant | Après |
|---|---|---|---|
| 1 | `src/services/geminiService.ts:3338` (preview) | `gemini-2.5-flash` | `gemini-3-flash` |
| 2 | `src/services/geminiService.ts:4459` (remainingWeeks) | `gemini-2.5-flash` | `gemini-3-flash` |
| 3 | `src/services/geminiService.ts:5326` (adapt model — shadowée) | `gemini-2.5-flash` | `gemini-3-flash` |
| 4 | `src/services/geminiService.ts:5796` (adaptationModel utilisé) | `gemini-2.5-flash` | `gemini-3-flash` |
| 5 | `src/services/stravaAnalysisService.ts:187` (Strava) | `gemini-2.5-flash` | `gemini-3-flash` |
| 6 | `src/services/planValidator.ts:877` (aiReviewPlan validator) | `gemini-2.0-flash` | `gemini-3-pro` |
| 7 | `src/services/planValidator.ts:911` (generateCorrectedWeeks) | `gemini-2.0-flash` | `gemini-3-flash` |
| 8 | `src/services/geminiService.ts:2980` (`modelUsed` métadonnée) | `gemini-2.5-flash` | `gemini-3-flash` |
| 9 | `src/types.ts:299` (commentaire) | `gemini-2.0-flash` | `gemini-3-flash` |

### 2. Suppression `correctFrenchWithAI`

- Fonction supprimée (`src/services/geminiService.ts` L489–599, ~110 lignes).
- 2 sites d'appel supprimés :
  - `geminiService.ts` end of `generatePreviewPlan` (post preview)
  - `geminiService.ts` end of `generateRemainingWeeks` (post full plan)
- Commentaire de justification déposé à la place de la fonction (doctrine
  `feedback_chaque_ligne_justifiee` : pourquoi elle existait + pourquoi on la supprime).
- `forceTutoiement` (regex déterministes, L308–487) **CONSERVÉ** intégral — fait
  90 % du boulot en regex (impératifs, accords féminins, élisions, conjugaisons
  hybrides, négations).

### 3. Patches défensifs

- `generatePreviewPlan` : `maxOutputTokens: 8192` ajouté au `generationConfig`
  (anti JSON tronqué sur 3-flash).
- `aiReviewPlan` (validator Pro) :
  - **Timeout 30s** via `Promise.race` → fallback skip-on-timeout (retourne review
    neutre score=70, flaggedWeeks=[]). Background OK, jamais bloquant.
  - **Parse JSON robuste** : strip markdown fences ` ```json ... ``` ` avant
    `JSON.parse`. gemini-3-pro a tendance à wrapper malgré `responseMimeType:
    application/json`. Regex `/```(?:json)?\s*([\s\S]*?)```/`.

### 4. Logs traces

`console.log` ajoutés sur chaque appel LLM avec le `model=...` identifié :
- `[Gemini Preview] model=gemini-3-flash`
- `[Gemini RemainingWeeks] model=gemini-3-flash`
- `[Gemini Adapt] model=gemini-3-flash`
- `[Gemini Strava] model=gemini-3-flash`
- `[PlanValidator AI Review] model=gemini-3-pro`
- `[PlanValidator CorrectedWeeks] model=gemini-3-flash`

Permet monitoring rapide post-deploy.

## Tests

| Test | Résultat |
|---|---|
| `npx vitest run` | **229/229 verts** (13 fichiers tests) |
| `npm run build` | OK (2284 modules, 4.17s, 37 prerender pages) |
| `node test-sprint1-15-profils.mjs` | OK (15 profils trail/route, fixes #1–#6) |
| `node test-sprint2-15-profils-feasibility.mjs` | OK (mxjulien02 IRRÉALISTE confirmé) |
| `node test-sprint3-finisher-profils.mjs` | OK (12 profils finisher/seniors) |
| `node test-sprint4-llm-migration-replay.mjs` | OK (27/27 profils structure valide) |

**Note erreurs TS `tsc --noEmit`** : ~25 erreurs préexistantes hors scope Sprint 4
(types `QuestionnaireData`, `paces`, `vma`). Aucune n'est introduite par les
modifications Sprint 4. Le `npm run build` (vite) passe — TypeScript erreurs
non bloquantes en build mode.

## Replay 27 profils

- **Script créé** : `test-sprint4-llm-migration-replay.mjs`
- **Mode DRY-RUN (par défaut)** : exécuté avec succès. Vérifie :
  1. Structure des 27 profils (Sprint 1+2+3 dédupliqués)
  2. Référence des 3 tests Sprint déterministes (lancés OK séparément)
  3. Patterns de détection fautes français (vouvoiement résiduel, accords cassés)
- **Mode LIVE (LIVE=1)** : **non exécuté**. Limitation technique : le code
  applicatif TypeScript utilise `import.meta.env` (Vite) → non lançable
  directement depuis Node sans bundle ou tsx setup. Solution recommandée :
  Romane regénère 5-10 plans via l'UI ou via `test-e2e-new-user.mjs` après
  validation manuelle.

### Limites du replay automatisé

- Les tests Sprint 1/2/3 testent uniquement la **logique déterministe** (feasibility,
  paces, post-processing). Ils ne déclenchent **aucun appel LLM réel**. Donc :
  - **Faisabilité, allures, mainSet/duration sync, %VMA tenu** : strictement
    identiques avant/après Sprint 4 (logique 100 % JS).
  - **Qualité français des plans réels (welcomeMessage, mainSet, advice)** :
    non testable hors LIVE. À valider manuellement par Romane sur 5-10 plans
    générés post-deploy.

## Commit + push

Voir commit final :
```
feat(sprint4): migration LLM gemini-3-flash + validator gemini-3-pro + diète correctFrenchWithAI
```

## Estimations post-Sprint 4

### Coût mensuel (100 plans, 30 Premium, 50 bilans Strava)

| Appel | Modèle | Coût |
|---|---|---|
| Preview | 3-flash | $2.55 |
| RemainingWeeks | 3-flash | $1.44 |
| Validator | 3-pro | ~$4.40 |
| CorrectedWeeks | 3-flash | ~$0.40 |
| Adapt | 3-flash | $0.24 |
| Strava | 3-flash | $0.45 |
| **Total** | | **~$9.50–10/mois** |

vs actuel ~$4.67/mois → **+$5/mois pour qualité validator +800 ELO**.

### Latence preview P95

| Étape | Avant | Après |
|---|---|---|
| Preview generation | ~10s | ~13s |
| correctFrenchWithAI | ~7s | **0s** (supprimé) |
| **Total P95** | **~17s** | **~13s** (**−23 %**) |

Net : preview plus rapide malgré upgrade modèle. Win.

### Nombre d'appels LLM par plan

| Phase | Avant | Après Sprint 4 |
|---|---|---|
| Freemium (preview seul) | 2 (preview + french) | **1** (preview) |
| Premium (full plan) | 6-7 (preview + french×2 + remaining + validator + corrected) | **5-6** (preview + remaining + validator pro + corrected si flagged) |
| Adaptation hebdo | 1 | 1 |
| Bilan Strava | 1 | 1 |

## À valider Romane avant deploy hosting

1. **Replay 27 profils manuel** (option) :
   - Recompiler `LIVE=1 node test-sprint4-llm-migration-replay.mjs` (cf limitation)
   - OU regénérer 5-10 plans via l'UI/test-e2e-new-user.mjs sur profils variés
2. **Comparaison A/B side-by-side** :
   - Pour 3-4 plans clés (mxjulien02, stephfanny, wozniakmaeva, sebastien finisher PB)
   - Vérifier : feasibility identique, allures identiques (déterministe), mainSet
     cohérent, français propre (pas de "tu introduire", "ton sortie", "vous devez")
3. **Validator gemini-3-pro** :
   - Surveiller premiers logs prod : `[PlanValidator AI Review] model=gemini-3-pro`
   - Vérifier que le timeout 30s ne se déclenche pas systématiquement
   - Vérifier que le JSON parse robuste fonctionne (logs `flagged=...`)
4. **Deploy hosting** : à décider après ces validations. **NON déployé depuis
   l'agent Sprint 4** (consigne explicite).

## Risques résiduels & monitoring post-deploy

| Risque | Probabilité | Mitigation |
|---|---|---|
| 3-flash dégrade le français vs 2.5-flash + correctFrench supprimé | Faible (3-flash +60 ELO) | Si > 1 % plans avec faute critique → ajouter 3-5 regex ciblées dans `forceTutoiement` |
| 3-pro lent / timeout 30s déclenché systématiquement | Moyen (jamais bench prod) | Fallback skip-on-timeout retourne review neutre — plan accepté tel quel |
| 3-pro wrap JSON en markdown | Élevé (observé hors prod) | Patch défensif strip ` ```json ` appliqué |
| 3-flash maxOutputTokens défaut trop bas → JSON tronqué preview | Bas (patch 8192 appliqué) | maxOutputTokens explicite |
| Suppression `correctFrenchWithAI` casse français | Bas (forceTutoiement couvre 90%) | Monitoring 50 premiers plans |

## Annexes — fichiers modifiés

- `src/services/geminiService.ts` (8 sites, suppression fonction)
- `src/services/planValidator.ts` (2 sites + timeout + parse robuste)
- `src/services/stravaAnalysisService.ts` (1 site + log)
- `src/types.ts` (commentaire)
- `test-sprint4-llm-migration-replay.mjs` (nouveau, runner replay)
- `SPRINT4-LLM-MIGRATION.md` (ce livrable)
