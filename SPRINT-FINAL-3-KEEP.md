# Sprint final 3 KEEP
Date : 2026-05-21

## 3 commits

- **P0-1** : `f726ae4` — fix(VMA): save feasibility après handleRecalculateVMA (bug Julian)
- **P1-6** : `f29576c` — fix(feasibility): message volume warning conditionné km/séance >=10 (bug Bertrand)
- **P1-7** : `6f64c86` — fix(plan-duration): cap planDurationWeeks par objectif (bug floggyz 30 sem 10K)

## Tests
- Baseline : 439 verts (31 fichiers de test)
- Après sprint : **450 verts** (31 → 33 fichiers)
- +5 anti-régression P1-6 (feasibility-volume-warning.test.ts)
- +6 anti-régression P1-7 (plan-duration-cap.test.ts)

## Build
OK (Vite + prerender 39/39 pages)

## Détails techniques

### P0-1 (App.tsx)
Le bloc de calcul `newFeasibility` (anciennement L1210-1245) a été déplacé AVANT
le branching `savePlan(fullPlan)` / `savePlan(updatedPlan)` (qui sont aux deux
branches du if/else). `newFeasibility` est maintenant assigné à `fullPlan.feasibility`
(branche regen) et à `updatedPlan.feasibility` (branche full feedback) avant
chaque appel `savePlan()`. Le `feasibilityWarning` du toast utilisateur reste
identique.

### P1-6 (feasibilityService.ts:1248)
Ajout de `kmParSeance = currentVolume / frequency` et condition `kmParSeance >= 10`
en plus de `freq <= 3 && planWeeks > 16`. Message reformulé : "ton plan manquera
de variété" au lieu de "très chargée en volume" (factuellement faux pour Bertrand
5 km/séance).

### P1-7 (geminiService.ts)
Extraction de la fonction `computePlanDurationWeeks(params)` exportée (était inline,
intestable). Table `PLAN_DURATION_MAX_WEEKS_BY_GOAL` :
- 5 km → 10 sem
- 10 km → 16 sem
- Semi-Marathon → 20 sem
- Marathon → 24 sem
- Default (Trail/Hyrox/Perte de poids/Maintien) → 30 sem

Comportement inchangé sur le `startDate` shifting quand `diffWeeks > cap`.

## main ahead origin by 3
## En attente Romane : push ?
