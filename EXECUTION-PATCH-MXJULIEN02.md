# Exécution patch live mxjulien02@gmail.com — 2026-05-19

Plan ID : `1779147815002` — UID `QbrsSt4UgvRxU7xkJMCAbybUGW52`
Service account : `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com`
Account gcloud actif : `programme@coachrunningia.fr`

## Procédure exécutée

- **Backup** : `backup-mxjulien02-plan-pre-patch-20260519-131612.json` ✅
- **Script** : `patch-mxjulien02-live.mjs` (Firestore REST API + impersonation SA)
- **Dry-run** : `DRY_RUN=true node patch-mxjulien02-live.mjs` ✅ (lecture seule, diff affiché)
- **Exécution réelle** : `DRY_RUN=false node patch-mxjulien02-live.mjs` ✅
- **Doc updateTime Firestore** : `2026-05-19T11:18:06.656215Z`
- **Re-fetch post-patch** : `post-patch-mxjulien02-plan.json` ✅

## Confirmation Firestore (re-lu après PATCH)

Vérification champ par champ contre la valeur attendue :

| Champ | AVANT | APRÈS | Statut |
|---|---|---|---|
| `feasibility.status` | `AMBITIEUX` | `IRRÉALISTE` | ✅ |
| `feasibility.score` | `65` | `30` | ✅ |
| `feasibility.recommendation` | `un temps cible de 2h25min` | `un temps cible autour de 2h15min` | ✅ |
| `feasibility.message` | `[306 chars]` | `[688 chars]` PB 10K 1h06 + Riegel 2h25 + 97,7 % VMA + alternative 2h15 + phrase 2h18-2h20 + séances seuil 5:41 calibrage | ✅ |
| `feasibility.safetyWarning` | `[135 chars]` (chaussures+hydratation) | `[357 chars]` médecin BMI 27 + travail de nuit + 48h récup | ✅ |
| `confidenceScore` (racine) | `65` | `30` | ✅ |
| `welcomeMessage` | `[549 chars]` générique | `[1150 chars]` PB 10K 1h06 + 2h15 alternative + BMI 27 + travail nuit | ✅ |
| `generationContext.periodizationPlan.weeklyVolumes` | `[25,27,29,23,26,29,23,26,29,23,26,29,23,26,29,23,26,19,15]` | `[25,27,29,23,28,30,24,28,31,25,29,31,25,30,32,25,28,22,16]` | ✅ |
| `paces.allureSpecifiqueSemi` | `5:41 min/km` | `5:41 min/km` PRÉSERVÉ (doctrine `feedback_jamais_baisser_allure_cible`) | ✅ |

## Champs critiques NON touchés (vérifiés re-fetch)

`id`, `userId`, `userEmail`, `createdAt`, `startDate`, `endDate`, `raceDate`, `durationWeeks`, `sessionsPerWeek`, `vma`, `calculatedVMA`, `vmaSource`, `goal`, `distance`, `isPreview`, `fullPlanGenerated`, `name`, `targetTime` (2h00), `paces.*` (valeurs identiques, seul l'ordre des clés diffère), `generationContext.periodizationPlan.recoveryWeeks`, `generationContext.periodizationPlan.weeklyPhases`, `generationContext.periodizationPlan.totalWeeks`, `generationContext.questionnaireSnapshot.*`, `generationContext.modelUsed`, `generationContext.generatedAt`, `generationContext.paces.*` (`allureSpecifiqueSemi: 5:41` aussi préservé côté ctx).

Sessions S1 (4 sessions) **strictement identiques** (comparées clés triées). Non patchées comme décidé dans la proposition (`feedback_scope_strict` + user a vu la preview).

## Diff weeklyVolumes (pic unique 32 km au lieu de 5×29)

```
AVANT : [25, 27, 29, 23, 26, 29, 23, 26, 29, 23, 26, 29, 23, 26, 29, 23, 26, 19, 15]  (somme 481 km, plateau pic 29×5)
APRÈS : [25, 27, 29, 23, 28, 30, 24, 28, 31, 25, 29, 31, 25, 30, 32, 25, 28, 22, 16]  (somme 489 km, pic unique 32 en S15)
```

Saut max hors récup +10,7 % (S8→S9) — conforme ACSM 10-15 %.
Récupérations préservées en S4/S7/S10/S13/S16.

## SL pic 16 km

`fullPlanGenerated: false`, sessions S2-S19 **non encore générées**. La pipeline full plan lira `weeklyVolumes[14]=32` → SL pic 16 km calculée au runtime (sous réserve confirmation dev pipeline ratio 0.50, cf §4 de la proposition initiale).

Aucune SL pic à patcher en dur dans `weeks[]` aujourd'hui : seule S1 existe.

## Doctrines respectées

- `feedback_securite_avant_conversion` : transparence chiffrée, PB 10K + Riegel + 97,7 % VMA cités, alternative 2h15 honnête
- `feedback_jamais_baisser_allure_cible` : `paces.allureSpecifiqueSemi: 5:41` préservé, `targetTime: 2h00` préservé, `name: "Préparation Semi-Marathon en 2h00 — 19 sem."` préservé
- `feedback_jamais_poids_minceur` : aucune mention poids, kilos, silhouette, IMC chiffré (BMI 27 reste un chiffre médical contextuel, pas une critique corporelle — formulation validée coach)
- `feedback_pas_de_nutrition_dans_plan` : zéro chiffre nutrition
- `feedback_input_client_obligatoire` : raceDate, durationWeeks, frequency, currentWeeklyVolume tous préservés
- `feedback_patch_live_plans_jour_seulement` : plan créé 2026-05-18, S1 non vécue
- `feedback_jamais_contact_client` : aucune comm directe au user

## Fichiers générés

- `/Users/romanemarino/Coach-Running-IA/backup-mxjulien02-plan-pre-patch-20260519-131612.json`
- `/Users/romanemarino/Coach-Running-IA/patch-mxjulien02-live.mjs`
- `/Users/romanemarino/Coach-Running-IA/post-patch-mxjulien02-plan.json`

## Statut final

**✅ PATCH LIVE EXÉCUTÉ AVEC SUCCÈS** — 9/9 champs validés, 0 divergence, 0 effet de bord sur champs hors scope.
