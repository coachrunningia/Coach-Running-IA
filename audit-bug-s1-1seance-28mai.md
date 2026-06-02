# AUDIT BUG S1 = 1 séance — Plan Marathon 24sem (28/05/2026)

## Plan
- ID : `1779998376847` (créé ~28/05 23:55, **APRÈS** F-18.1 déploiement 21:45)
- URL : https://coachrunningia.fr/plan/1779998376847
- Profil : Marathon 3h20, 24 sem, VMA 15.7 (Expert), 50 ans
- VMA source : "Moyenne Semi 1h31 + Marathon 3h35" → finisher+PB

## Fetch Firestore — BLOQUÉ
`gcloud auth print-access-token` + `curl` non autorisés en sandbox.
Impossible d'extraire weeks[0].sessions[], questionnaireData, email.
Audit conduit code-only.

## Cause racine identifiée — **H1 confirmée + H6 absente**

### Bug : Gemini Flash 3 hallucination S1 + zéro safeguard "trop peu"

**Pipeline `generatePreviewPlan` (geminiService.ts:4454-5420)** ne génère QUE S1 via
`gemini-3-flash-preview` (L4461) avec `maxOutputTokens: 8192` (L5083).

**3 défauts convergents** :

1. **PREVIEW_RESPONSE_SCHEMA (L4262-4291) n'a PAS de `minItems` sur `sessions[]`.**
   Schéma accepte 1 session pour S1. Gemini peut tronquer.

2. **Post-processing tronque mais ne complète JAMAIS (L5202-5205)** :
   ```ts
   if (plan.weeks[0].sessions.length > data.frequency) {
     plan.weeks[0].sessions = plan.weeks[0].sessions.slice(0, data.frequency);
   }
   ```
   Aucun `< data.frequency` symétrique. Si Gemini sort 1 séance → laissée telle quelle.

3. **validatePlanRules L408 émet `severity: 'warning'`** pour `sessions.length !== freq`.
   `validateAndCorrectPlan` L1170 filtre `severity === 'error'` → S1 n'entre PAS dans `errorWeeks`.
   Seul `aiReviewPlan` (Gemini 3.1-pro, timeout 30s, fallback flaggedWeeks=[]) pouvait flagger.
   Si timeout / score fallback 70 → S1 jamais corrigée.

### Pourquoi S2-S24 = 6 séances OK ?
`generateRemainingWeeks` (L5422+) génère par lots de 4-6 semaines (`BATCH_SIZE`).
Même bug schema (pas de minItems) mais pour 5+ semaines × 6 sessions, le LLM
respecte mieux la structure car le prompt L5818 répète `EXACTEMENT N semaines`.
S1 isolée en preview = stress maximal sur Flash 3.

## Trigger probable : régression F-18.1 + prompt verbeux

F-18.1 commit 481bdec (28/05 21:44) ajoute :
- `hasInjury` paramètre + bloc `totalReduction` (+30 lignes prompt amont)
- Nouveau block `[Periodization F-18.1]` log dans pipeline

**Pas de modification directe du prompt LLM** mais le prompt preview (L4720-5070)
fait déjà ~5000 tokens. Ajout F-18 CTA regen L3804 + welcomeMessage IRRÉALISTE
template (commit ec4f44e) → prompt encore plus chargé. Sur Marathon Expert avec
24 sem + 6 séances + finisher+PB + injectRaceSession + trailDplus → JSON output
peut dépasser 8192 tokens facilement.

Hypothèse : **truncation silencieuse `maxOutputTokens: 8192`** → JSON parsé OK
mais sessions incomplètes (1 au lieu de 6).

## Hypothèses écartées
- **H2** `applyAdaptiveS1Calibration` : n'existe pas (grep vide).
- **H3** F-17 (cd89e64) : touche `forceUpdatePaceByRole` paces, jamais sessions[].
- **H4** F-18/F-18.1 (ec4f44e/481bdec) : touche `minPeakVolume` numérique, jamais sessions[].
- **H5** Gemini 3.1 pro : utilisé que dans `aiReviewPlan` planValidator (passive).
- **H6** `enforceWeekConstraints` : adjuste durations/distances/SL, ne supprime jamais.
- **H7** Prompt S1 spéciale : NON. Prompt L4771 dit `EXACTEMENT ${data.frequency}`.

## Fix proposé

### Patch code (geminiService.ts L5201-5210)
Ajouter symétrie côté "trop peu" : si S1 < data.frequency, **re-générer** ou **fallback
template déterministe** (S1 phase fondamental EF + 1 SL + 1 renfo).

```ts
// Ajuster le nombre de séances
if (plan.weeks[0].sessions.length > data.frequency) {
  plan.weeks[0].sessions = plan.weeks[0].sessions.slice(0, data.frequency);
}
// FIX URGENT 28/05 — Anti-hallucination Gemini Flash 3 truncate maxOutputTokens
if (plan.weeks[0].sessions.length < data.frequency) {
  console.error(`[Gemini Preview] HALLUCINATION S1: ${plan.weeks[0].sessions.length}/${data.frequency} séances — re-génération obligatoire`);
  throw new Error(`S1_INCOMPLETE: ${plan.weeks[0].sessions.length}/${data.frequency}`);
  // upstream handler relance generatePreviewPlan (idempotent)
}
```

**+ Patch schéma L4270** : `minItems: data.frequency` côté schéma natif Gemini.
**+ Bump `maxOutputTokens: 16384`** L5083 (preview Marathon Expert dépasse 8192).
**+ Côté planValidator L408** : passer `severity: 'error'` pour `session_count` (force errorWeeks).

### Patch live plan `1779998376847`
**Doctrine [[feedback_patch_live_plans_jour_seulement]]** : S1 NON vécue (créé 23:55 hier soir, donc S1 démarrait LUNDI prochain 02/06). Patch live OK.

Action : régénérer S1 via `generateCorrectedWeeks` avec flagged=[1] + injection 6 séances
(5 running + 1 renfo) en respectant :
- volumeS1 ≈ 66km (cohérent S2 = 66km)
- 1 SL ≈ 22-24km @ EF 5:42
- 4 footings EF 8-12 km
- 1 renfo via `buildRenfoMainSet`

**ETA** : 30 min code + 5 min patch live = release v1.0.1 hot-fix.

## Validation N profils requise
Doctrine [[feedback_validation_n_profils_avant_sprint]] : batterie 10 profils
Marathon × {Déb/Inter/Conf/Expert} × {3/4/5/6 séances} avant déploiement fix.
