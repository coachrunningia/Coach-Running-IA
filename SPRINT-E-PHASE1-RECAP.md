# Sprint E Phase 1 — 5 bugs P0 transversaux

Date : 2026-05-23
Sources : DEV-EXPERT-TRAIL-ULTRA-8-BUGS.md + COACH-EXPERT-TRAIL-ULTRA-8-BUGS.md

## Hash commit

`[À renseigner après commit / push]`

## Fichiers modifiés

| Fichier | Lignes ± | Synthèse |
|---|---|---|
| `src/services/geminiService.ts` | +166 / −9 | Bug 1+2 (gating + enforceNoCrossTraining + injection inconditionnelle), Bug 7/12 (buildWelcomeToneBlock), Bug 10 (skip multi-allures recalculateSessionDistance), Bug 11 (Math.floor recoveryFactor ×2) |
| `src/services/feasibilityService.ts` | +50 / −3 | Bug 8 (parseTargetTime heuristique HH:MM ambigu + cap 30 km/h requiredVmaForTarget) |
| `src/services/__tests__/sprint-e-phase1-p0-transversaux.test.ts` | +444 (NEW) | Tests anti-régression 5 bugs (33 cases) |

## Bug-par-bug

### Bug 1+2 — Cross-training banni
- **Gating L3443** réparé : `data.distance`/`data.trailDistance` (champs INEXISTANTS dans `QuestionnaireData`) → `data.subGoal`/`data.trailDetails.distance` + extension `goal === 'Trail'` (couvre toutes distances trail). Olivier Trail 126 km BMI 26.5 imcTier=1 → désormais détecté.
- **Règle inconditionnelle** : `NO_CROSS_TRAINING_RULE` désormais injecté pour TOUS les profils (pas que IMC≥30 + longue distance). Doctrine `feedback_coach_running_ia_que_course` = 100% course universellement.
- **Filtre post-LLM** `enforceNoCrossTraining(session)` exporté : regex `\b(v[ée]lo|cyclisme|cycling|bike|natation|swim|piscine|aquajog|elliptique|rameur|home.?trainer|spinning|cross.?training)\b` détecte un sport hors-course dans title/mainSet → retype `type='Repos'`, `title='Repos complet'`, distance/duration/pace = `N/A`, mainSet "Jour de repos complet". Branche `type === 'Repos'` ajoutée pour skip warmup/cooldown/mainSet/paceForType et `recalculateSessionDistance`.

### Bug 7/12 — WelcomeMessage déconnecté `feasibility.status`
- `buildWelcomeToneBlock(status)` exporté, injecté dans 2 prompts (preview + remaining).
- EXCELLENT/BON → string vide (LLM libre).
- AMBITIEUX → ton FERME, pas d'enthousiasme excessif.
- RISQUÉ → ton PRUDENT, signaux à surveiller, bannit "graduelle/douce/sereine".
- IRRÉALISTE → ton BRUTAL TRANSPARENT, bannit "tu vas progresser en douceur", exige avis médical "indispensable", reconnaissance explicite que la cible est hors d'atteinte.
- Doctrines citées dans le bloc : `feedback_securite_avant_conversion`, `feedback_jamais_baisser_allure_cible`, `feedback_compromis_messages_preventifs`.

### Bug 8 — VMA cible astronaute
- `parseTargetTime` : heuristique HH:MM ambigu pour `M:SS` avec M ∈ [1, 5] (impossible physiologiquement qu'un Semi/Marathon/etc. soit fait en < 6 minutes). `"2:24"` → 144 min (au lieu de 2.4). Compatibilité PB préservée : `"22:30"` → 22.5 min (5K), `"45:30"` → 45.5 min (10K).
- `requiredVmaForTarget` exporté + cap sanity à 30 km/h. Au-delà → log error + retour 30 (pas null, pas crash). Garde-fou division par zéro / inputs négatifs.

### Bug 10 — Distance recalculée depuis durée × pace
- `recalculateSessionDistance` (déjà tolérance 10%) → ajout SKIP sur sessions multi-allures (title/mainSet matche `n[ée]gatif|progressif|fartlek|c[ôo]tes|tempo|seuil`). Pace LLM moyen ≠ pace de calcul de distance → ne pas écraser.
- Skip également pour `type === 'Repos'` (cohérence Bug 1+2).

### Bug 11 — `recoveryFactor` correctement appliqué
- 2 occurrences `Math.round(prevWeekVol * recoveryFactor)` dans `calculatePeriodizationPlan` → `Math.max(1, Math.floor(...))`. Garantit décharge effective sur petits volumes (S6=10 → S7=8, S9=12 → S10=9, S12=14 → S13=10).
- Garde-fou `Math.max(1, ...)` empêche volume récup à 0.

## Tests

- **Nouveau fichier** : `src/services/__tests__/sprint-e-phase1-p0-transversaux.test.ts` — 33 cases couvrant les 5 bugs.
- **Ancien total** : 525 verts (Sprints A-D)
- **Nouveau total attendu** : 525 + 33 = **558 verts** (à valider via `npx vitest run` — autorisation Bash requise).

## Effets attendus sur profils audités

- **Olivier Trail 126 km** : 9 séances Vélo bannies en regen (Bug 1+2 actif via inconditionnalité + post-LLM filter). WelcomeMessage IRRÉALISTE devient brutal transparent (Bug 7).
- **1778921428769 / Ambre-like** :
  - WelcomeMessage IRRÉALISTE brutal en regen (Bug 7).
  - Récup S7 < S6, S10 < S9, S13 < S12 (Bug 11 floor).
  - Distance S1 J2 (50 min @ 10:17/km) recalculée 4.9 km au lieu de 3.88 km affiché (Bug 10).
- **Tout profil avec targetTime ambigu "2:24"** : parsé en 144 min (HH:MM) au lieu de 2.4 min → plus jamais "VMA 623 km/h" (Bug 8).

## Doctrines respectées

- `feedback_coach_running_ia_que_course` : zéro cross-training programmé (règle inconditionnelle + filtre post-LLM).
- `feedback_securite_avant_conversion` : welcome IRRÉALISTE brutal, transparence > conversion.
- `feedback_jamais_baisser_allure_cible` : aucune modif d'allure cible user (welcome prévient seulement).
- `feedback_input_client_obligatoire` : inputs user (allures, dates) intacts ; parseTargetTime corrige seulement une saisie ambiguë.
- `feedback_qualite_avant_vitesse` : audit exhaustif gating + 33 tests anti-régression.
- `feedback_chaque_ligne_justifiee` : commentaires inline sur chaque changement de logique (gating, filtres, cap, floor).
- `feedback_patch_live_plans_jour_seulement` : code applique aux NOUVEAUX plans uniquement, pas de rétro-patch.

## Notes & risques

1. **Permission Bash bloquée** sur `npx vitest` / `vite build` : tests pas exécutés en local par l'agent. Tu dois lancer manuellement :
   ```bash
   npx vitest run
   npm run build
   ```
2. **Risque léger de régression** sur tests existants : aucun test ne fait d'assertion négative sur `NO_CROSS_TRAINING_RULE` ; aucun test n'utilise un PB / targetTime au format `"M:SS"` pour M ∈ [1, 5] ; `Math.floor` affecte UNIQUEMENT les semaines récup (pas le pic = `Math.max(...)`).
3. **Bug 4 (pic Trail Ultra) et Bug 3 (SL Lundi)** NON traités dans cette Phase 1 (P1 selon spec dev expert) — à shipper Phase 2 / Sprint E.5.
