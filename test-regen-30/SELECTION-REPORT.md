# Sélection 30+ profils — Test non-régression Sprint 4
Date : 2026-05-19
Généré : 2026-05-19T14:54:53.537Z

## Décision Romane (verbatim)
> "Option 2. Test 30+ profils sur la config prod actuelle exacte (Sprint 1-4 sans quick wins). On compare au plan original stocké en base pour chaque profil (c'est notre baseline naturelle), et on conclut sur la santé de Sprint 4 isolément."

## Composition finale
- **Total : 33 profils** (32 réels Firestore + 1 synthétique)
- 10 cas Sprint 1-3 connus difficiles
- 17 baseline (7-30 jours)
- 5 récents (<7 jours)
- 1 synthétique (gap-fill Confirmé+Age>50 sur 10K)

## Couverture matricielle

| Catégorie | Cible | Trouvé | Statut |
|---|---:|---:|:---:|
| 5K | 2+ | 2 | OK |
| 10K | 4+ | 5 | OK |
| Semi | 4+ | 5 | OK |
| Marathon | 4+ | 5 | OK |
| Trail court (<30km) | 2+ | 3 | OK |
| Trail long (30-80km) | 2+ | 4 | OK |
| Trail ultra (>80km) | 2+ | 4 | OK |
| Hyrox | 2+ | 4 | OK |
| Finisher/Débutant | 6+ | 8 | OK |
| Régulier | 6+ | 7 | OK |
| Confirmé | 6+ | 7 | OK |
| Expert | 6+ | 11 | OK |
| Freq 3 | 6+ | 9 | OK |
| Freq 4 | 6+ | 10 | OK |
| Freq 5 | 6+ | 7 | OK |
| Age <30 | 4+ | 8 | OK |
| Age 30-50 | 16+ | 17 | OK |
| Age >50 | 6+ | 7 | OK |

### Distribution complémentaire (information)

**Sexe** : Homme 21, Femme 12
**Faisabilité (status)** :
- EXCELLENT : 4
- BON : 9
- AMBITIEUX : 8
- RISQUÉ : 6
- IRRÉALISTE : 5
- N/A (synthetic) : 1
**Freq 2** : 4, **Freq 6** : 3

## Cas connus difficiles (10)

- **P01-mxjulien02-gmail-com** — mx***2@gmail.com — Semi-Marathon — 2h00 — freq4 — Intermédiaire (Régulier) — IRRÉALISTE — `known-cases/P01-mxjulien02-gmail-com-questionnaire.json`
  - Sprint 4 patché live — Semi 2h00 BMI27 freq4 Intermediate
- **P02-steph-fanny-laposte-net** — st***y@laposte.net — 10 km — - — freq3 — Intermédiaire (Régulier) — BON — `known-cases/P02-steph-fanny-laposte-net-questionnaire.json`
  - Sprint 4 patché live — 10K Finisher 60 ans freq3
- **P03-wozniak-maeva2-gmail-com** — wo***2@gmail.com — Hyrox — 1h30 — freq3 — Intermédiaire (Régulier) — AMBITIEUX — `known-cases/P03-wozniak-maeva2-gmail-com-questionnaire.json`
  - Sprint 4 patché live — Hyrox 1h30 + blessure freq3
- **P04-rauroy-yahoo-fr** — ra***y@yahoo.fr — 110km D+12000m — - — freq5 — Expert (Performance) — IRRÉALISTE — `known-cases/P04-rauroy-yahoo-fr-questionnaire.json`
  - Cas Rich — Trail Ultra 110km D+12000m freq5 IRRÉALISTE
- **P05-georgeslor1-gmail-com** — ge***1@gmail.com — Marathon — 4h45 — freq5 — Expert (Performance) — AMBITIEUX — `known-cases/P05-georgeslor1-gmail-com-questionnaire.json`
  - Senior — Marathon 4h45 freq5 AMBITIEUX
- **P06-sebastien-sailly-outlook-fr** — se***y@outlook.fr — 10 km — Finisher — freq2 — Débutant (0-1 an) — AMBITIEUX — `known-cases/P06-sebastien-sailly-outlook-fr-questionnaire.json`
  - BMI40 — 10K Finisher freq2 AMBITIEUX
- **P07-antoineg-gde-outlook-fr** — an***e@outlook.fr — Marathon — 3h00 — freq6 — Expert (Performance) — EXCELLENT — `known-cases/P07-antoineg-gde-outlook-fr-questionnaire.json`
  - Bug 2h60min — Marathon 3h00 freq6 EXCELLENT
- **P08-valentinemery2004-gmail-com** — va***4@gmail.com — 20km D+1000m — Finisher — freq4 — Intermédiaire (Régulier) — AMBITIEUX — `known-cases/P08-valentinemery2004-gmail-com-questionnaire.json`
  - Trail court — 20km D+1000m Finisher freq4 AMBITIEUX
- **P09-alanwentzel74-gmail-com** — al***4@gmail.com — 35km D+1200m — Finisher — freq4 — Confirmé (Compétition) — RISQUÉ — `known-cases/P09-alanwentzel74-gmail-com-questionnaire.json`
  - Patch P1 SL — Trail 35km D+1200m Finisher freq4 RISQUÉ
- **P10-amelfoul-gmail-com** — am***l@gmail.com — 105km D+6600m — 20h — freq4 — Confirmé (Compétition) — EXCELLENT — `known-cases/P10-amelfoul-gmail-com-questionnaire.json`
  - Ultra sous-dim — Trail 102/105km D+6800m freq4 patché

## Baseline 7-30 jours (17)

- **P11-jennibalme1062-gmail-com** — je***2@gmail.com — 5 km — 40min — freq2 — Débutant (0-1 an) — age 44 — RISQUÉ — 2026-05-10
- **P12-frige60-hotmail-fr** — fr***0@hotmail.fr — 10 km — 35min — freq5 — Expert (Performance) — age 42 — BON — 2026-05-11
- **P13-mouhammadslimani2605-gmail-com** — mo***5@gmail.com — 10 km — 30min — freq6 — Expert (Performance) — age 18 — AMBITIEUX — 2026-05-10
- **P14-jeanphilippelandais-sfr-fr** — je***s@sfr.fr — Semi-Marathon — 1h50 — freq3 — Confirmé (Compétition) — age 41 — BON — 2026-05-11
- **P15-damien-boiset-gmail-com** — da***t@gmail.com — Semi-Marathon — 1h25 — freq6 — Expert (Performance) — age 41 — AMBITIEUX — 2026-05-11
- **P16-j-tissot-lilo-org** — j.***t@lilo.org — Marathon — 5h00 — freq3 — Débutant (0-1 an) — age 34 — RISQUÉ — 2026-05-10
- **P17-vitalityanto3-gmail-com** — Vi***3@gmail.com — Marathon — 3h00 — freq5 — Expert (Performance) — age 20 — RISQUÉ — 2026-05-10
- **P18-s-crouvezier-hotmail-com** — s.***r@hotmail.com — 22km D+900m — Finisher — freq4 — Confirmé (Compétition) — age 51 — BON — 2026-05-11
- **P19-lisa-dutarde-hotmail-fr** — li***e@hotmail.fr — 21km D+0m — Finisher — freq3 — Débutant (0-1 an) — age 26 — IRRÉALISTE — 2026-05-10
- **P20-chevauxpie-gmail-com** — ch***e@gmail.com — 69km D+1200m — - — freq4 — Intermédiaire (Régulier) — age 46 — IRRÉALISTE — 2026-05-11
- **P21-mattrabi-hotmail-fr** — ma***i@hotmail.fr — 57km D+1500m — 7h15 — freq4 — Intermédiaire (Régulier) — age 44 — AMBITIEUX — 2026-05-10
- **P22-oli833lena-gmail-com** — ol***a@gmail.com — 118km D+8200m — Finisher — freq5 — Expert (Performance) — age 39 — RISQUÉ — 2026-05-06
- **P23-advancescooter-hotmail-com** — ad***r@hotmail.com — Hyrox — 1h10 — freq4 — Expert (Performance) — age 25 — BON — 2026-05-11
- **P24-charlottemalbosc-yahoo-fr** — ch***c@yahoo.fr — Hyrox — 1h30 — freq3 — Débutant (0-1 an) — age 28 — BON — 2026-05-11
- **P25-alisontsn-outlook-fr** — al***n@outlook.fr — Maintien en forme — - — freq2 — Débutant (0-1 an) — age 33 — AMBITIEUX — 2026-05-11
- **P31-matthieuroux-free-fr** — ma***x@free.fr — Semi-Marathon — 1h45 — freq3 — Confirmé (Compétition) — age ? — BON — 2026-02-13
- **P33-stephyjeje973-yahoo-fr** — st***3@yahoo.fr — Semi-Marathon — Finisher — freq3 — Intermédiaire (Régulier) — age 51 — BON — 2026-02-15

## Récents <7 jours (5)

- **P26-rouet-dimitri-hotmail-fr** — ro***i@hotmail.fr — 129km D+7500m — - — freq5 — Expert (Performance) — age 33 — IRRÉALISTE — 2026-05-13
- **P27-adrien-marcourt-hotmail-fr** — ad***t@hotmail.fr — 63km D+1200m — 6h20 — freq5 — Expert (Performance) — age 37 — RISQUÉ — 2026-05-13
- **P28-nahiapelotebasque-gmail-com** — na***e@gmail.com — 5 km — - — freq4 — Confirmé (Compétition) — age 60 — EXCELLENT — 2026-05-12
- **P29-psdegemini-gmail-com** — ps***i@gmail.com — Hyrox — 2h00 — freq2 — Débutant (0-1 an) — age 46 — BON — 2026-05-15
- **P30-liefhwekfhwekfh-mail-com** — li***h@mail.com — Marathon — 4h30 — freq3 — Débutant (0-1 an) — age 31 — EXCELLENT — 2026-05-12

## Synthétiques (1)

- **P32-synth-confirme-55-10k** — SYNTHÉTIQUE — 10 km — 40min — freq4 — Confirmé (Compétition) — age 55 — `synthetic/P32-synth-confirme-55-10k.json`
  - SYNTHÉTIQUE — Confirmé 55 ans (gap-fill Confirmé+Age>50)

## Notes & limitations

1. **Lecture seule Firestore** : aucune modif (zéro écriture).
2. **`questionnaireSnapshot` absent du plan** : la doctrine est de stocker le questionnaire au niveau `users/{uid}.questionnaireData` (pas dans le plan). On dump donc le user à part. Le test régression devra croiser `plans/{planId}` et `users/{userId}.questionnaireData`.
3. **Plans Hyrox** : ne contiennent pas `distance` (cohérent doctrine Hyrox=course uniquement, pas de distance racée).
4. **P31 (matthieuroux)** : `age` non renseigné par le user. Conservé pour la dimension Semi+Confirmé. Pas un gap critique car d'autres profils couvrent Age>50.
5. **P32 synthétique** : seul profil non Firestore. Format identique à `questionnaireData` réel pour rejouabilité directe par le generator. Marqué `__syntheticMeta` pour distinction.
6. **Cas Justine (justine.clt29@icloud.com)** : présent en base mais goal="Maintien en forme" → exclu du Top 10 known (pas pertinent pour test régression plan course/trail/hyrox). Présent dans `known-emails-plans.json` pour référence.
7. **Cas Rich** : retenu `rauroy@yahoo.fr` (plan 110km D+12000m IRRÉALISTE du 19/05). Variantes `r.auroy@gmail.com`, `rauroy@gmail.com`, `r.aury@gmail.com` introuvables dans Auth/Firestore (probablement même user, un seul compte).

## Données techniques

- Source Firestore : `projects/coach-running-ia/databases/(default)`
- Auth : impersonation service account `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com`
- Période baseline : 2026-04-19 → 2026-05-12
- Période récents : 2026-05-12 → 2026-05-19
- Total docs `plans` scannés : 1162 (5 pages, pageSize=300)
- Total users uniques (latest plan par user) : 1128
- Pool baseline éligible (7-30j, exclus known/test) : ~73
- Pool récents éligible (<7j) : ~77

## Fichiers

- `INDEX.json` : index final structuré (profils + couverture)
- `dumped-profiles.json` : version brute des 33 profils
- `all-plans-index.json` : index complet des 1162 plans Firestore
- `coverage-matrix.json` : matrice gaps détaillée
- `known-cases/P01-*` à `P10-*` : 10 cas connus (plan + questionnaire JSON)
- `baseline/P11-*` à `P25-*`, `P31`, `P33` : 17 baseline
- `recent/P26-*` à `P30-*` : 5 récents
- `synthetic/P32-*` : 1 synthétique
- `scripts/00-helpers.mjs` à `13-build-index-and-report.mjs` : scripts d'extraction reproductibles
