# Sprint D — Items 4 + 7 — Récapitulatif

Date : 2026-05-22
Backlog : EXPERT-FFA-CHALLENGE-9-ITEMS.md (clôture 7/7 après Sprint C 5/7)

## État

- Code écrit, tests écrits, **vitest BLOQUÉ par sandbox** (npm/npx/node refusés).
- **À FAIRE par Romane** : `npx vitest run` (baseline 519 → 525+ attendu) + `npm run build` + commit + push + deploy.

## Hash commit

À générer après validation tests (commande proposée ci-dessous).

## Item 4 — Prompt LLM règle variété intra-semaine freq <= 3

- Fichier : `src/services/geminiService.ts`
- Localisation : fonction `buildSafetyInstructions` (la SEULE injection couvre preview + remaining via `${buildSafetyInstructions(...)}` lignes 4581 + 5299).
- Lignes ajoutées prompt : **5 lignes** (bloc compact conditionnel `freq <= 3`).
- Export ajouté : `buildSafetyInstructions` (même pattern que `buildTransparencyBlock` Sprint C Item 1) → testable directement.
- Total lignes code Item 4 : ~8 (commentaires inclus).

## Item 7 — calculatePeriodizationPlan PHASE_VOLUME_CAP progressif

- Fichier : `src/services/geminiService.ts`
- Localisation : `calculatePeriodizationPlan` boucle principale (3122+) + garde-fou pic recompute (3190+).
- `PHASE_VOLUME_CAP` : `fondamental: 0.80, developpement: 0.92, specifique: 1.00`.
- Affutage / récuperation : **inchangés** (logique propre conservée).
- Edge case géré : si `currentVol > phaseMaxVolume` (cv user haut respecté en fond), on ne descend PAS sous le user — `effectivePhaseCap = Math.max(phaseMaxVolume, currentVol)` (doctrine `feedback_input_client_obligatoire`).
- Total lignes code Item 7 : ~30 (commentaires inclus, 2 patches : boucle + garde-fou).

## Diff total

`git diff --stat src/services/geminiService.ts` = 1 file, +48 / -8 lignes.

## Tests anti-régression

Fichier : `src/services/__tests__/sprint-d-items4-7.test.ts` (8 tests)

**Item 4 (4 tests)** :
- freq=3 : règle "RÈGLE FREQ 3 / footing 35-50% / SL 50-65% / Pfitzinger FRR" injectée
- freq=2 : règle "RÈGLE FREQ 2" injectée + "Distances ET durées DIFFÉRENTES"
- freq=4 : règle NON injectée
- freq=5 : règle NON injectée

**Item 7 (4 tests)** :
- Christopher Semi 20 sem freq=3 cv=30 : fond ≤ 80% pic +1km tolérance, dev ≤ 92% +1, spe = pic, ordre strict croissant
- Pic phase = 'specifique' (pas 'fondamental') — anti-régression Christopher
- Régression freq=5 Marathon Confirmé vol60 3h30 : pic ≥ 50 km (pas régressé), pic en spé/dev
- Plan court 8 sem 10K : pic ≥ 18 km (garde-fou minPeakVolume actif)

## Effet attendu sur Christopher (freq=3 Semi 20 sem cv=30 VMA 13)

- maxVolume après session factor ×0.85 ≈ 51 km
- AVANT : pic atteint dès S3 (~51 km), plateau 14 sem
- APRÈS : S3-S6 (fond) plafonné ~41 km, S7-S14 (dev) plafonné ~47 km, S15-S20 (spé) pic 51 km
- Prompt LLM : règle freq <=3 force 1 footing court (35-50%, 35-60 min) + 1 SL différenciée (50-65%, 75-115 min) → fini les 2 séances 13/13.1 km

## Commit message (à appliquer après tests verts)

```
fix(planning): Sprint D — Items 4 + 7 finalisent backlog expert FFA

Item 4 (geminiService buildSafetyInstructions) — règle freq <=3 :
  footing court 35-50% + SL 50-65% différenciés (Pfitzinger FRR ch.4)
  Bloc 5 lignes injecté conditionnellement, pas de gonflement du prompt.
  buildSafetyInstructions EXPORTÉ pour tests (pattern Sprint C Item 1).

Item 7 (geminiService calculatePeriodizationPlan) — PHASE_VOLUME_CAP :
  fondamental 0.80, développement 0.92, spécifique 1.00
  Plus de plateau du pic dès S3 (cas Christopher) ; pic croît progressivement.
  Edge case currentVol > phaseCap → on ne descend pas user
  (doctrine feedback_input_client_obligatoire).

Sources : EXPERT-FFA-CHALLENGE-9-ITEMS.md (verdict expert FFA 20 ans)
Doctrines : feedback_chaque_ligne_justifiee, feedback_input_client_obligatoire,
feedback_jamais_baisser_allure_cible

Effet attendu :
- Christopher freq=3 : 1 footing court + 1 SL au lieu de 2 SL identiques
- Pic vol semi 20 sem : S3=80% / S9=92% / S15=100% (progression visible)

Tests : src/services/__tests__/sprint-d-items4-7.test.ts (8 tests)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```
