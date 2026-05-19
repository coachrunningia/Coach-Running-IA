# Audit batch — baisse volume S1
Date : 2026-05-18  •  Généré : 2026-05-18T15:57:39.919Z

> **Bug** : `src/services/geminiService.ts:2655` faisait `currentVolumeFloor = currentVolume × 0.85` →
> S1 systématiquement à -15 % du volume actuel user. Fix appliqué (passage à 100 %) ; cet audit identifie les plans déjà générés impactés.

## Synthèse

- Total plans audités (fullPlanGenerated OR isPreview) : **1156**
- 🟢 OK (ratio ≥ 0.95)         : **593** (51.3%)
- 🟡 Léger (0.85 ≤ r < 0.95)   : **155** (13.4%)
- 🔴 Grave (r < 0.85)          : **118** (10.2%)
- ⚪ Skip (currentVol = 0/null) : **290** (25.1%)
- ⚫ Pas de volume S1 calculable : **0** (0.0%)

### Décomposition par type de plan

| Type                            | Total | OK | Léger | Grave |
|---------------------------------|------:|---:|------:|------:|
| fullPlanGenerated = true        | 84 | 39 | 18 | 12 |
| isPreview = true (preview only) | 1072 | 554 | 137 | 106 |

## Distribution par typologie (plans avec curVol > 0)

### Total impactés (Léger + Grave)

| Niveau \ Goal     | 5km | 10km | Semi | Marathon | Trail | Hyrox | Forme | PoidsForme | VMA | Autre | Total |
|-------------------|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|-----:|
| Débutant          | 1/2 | 2/8 | 2/5 | 1/2 | 2/11 | 1/1 | 1/1 | · | · | · | 10/30 |
| Intermédiaire     | 0/9 | 5/28 | 6/35 | 2/9 | 13/54 | 4/4 | 0/1 | · | · | · | 30/140 |
| Confirmé          | 5/10 | 18/53 | 19/86 | 13/68 | 74/217 | 1/1 | · | 1/2 | · | · | 131/437 |
| Expert            | 4/7 | 22/46 | 16/35 | 13/40 | 46/130 | 1/1 | · | · | · | · | 102/259 |

### Grave uniquement (ratio < 0.85)

| Niveau \ Goal     | 5km | 10km | Semi | Marathon | Trail | Hyrox | Forme | PoidsForme | VMA | Autre | Total |
|-------------------|----:|----:|----:|----:|----:|----:|----:|----:|----:|----:|-----:|
| Débutant          | 1 | 2 | 0 | 1 | 0 | 0 | 0 | · | · | · | 4 |
| Intermédiaire     | 0 | 2 | 4 | 0 | 7 | 0 | 0 | · | · | · | 13 |
| Confirmé          | 3 | 11 | 9 | 4 | 28 | 0 | · | 1 | · | · | 56 |
| Expert            | 1 | 9 | 7 | 3 | 25 | 0 | · | · | · | · | 45 |

## Plans Premium actifs à RÉGÉNÉRER (course future, full plan) — top 30 les pires

Total à régénérer : **11**

| # | email | prénom | level | goal | freq | curVol | volS1 | ratio | raceDate | planId |
|--:|-------|--------|-------|------|----:|------:|------:|------:|----------|--------|
| 1 | lafleur666@yahoo.fr | Lucie | Confirmé | Semi | 3 | 40 | 24 | 60% | 2026-09-27 | `1773143911561` |
| 2 | baroneromain26400@gmail.com | Romain | Confirmé | 5km | 4 | 35 | 22 | 63% | 2026-06-25 | `1774180563158` |
| 3 | manondbc92@gmail.com | Manon | Confirmé | Trail | 3 | 25 | 18 | 72% | 2026-10-16 | `1774900493420` |
| 4 | amelfoul@gmail.com | Amelie | Confirmé | Trail | 4 | 40 | 33 | 83% | 2026-10-03 | `1771192741777` |
| 5 | emmanuel.tellier.professionnel@gmail.com | emmanuel.tellier.professionnel@gmail.com | Confirmé | 10km | 4 | 25 | 21 | 84% | 2026-08-15 | `1777227660497` |
| 6 | cyril.carriere4@gmail.com | Cyril | Confirmé | Trail | 4 | 40 | 34 | 85% | 2026-06-13 | `1775202027706` |
| 7 | mouhammadslimani2605@gmail.com | Mouhammad | Expert | 10km | 6 | 88 | 75 | 85% | 2026-07-10 | `1778441786486` |
| 8 | deugnilson@gmail.com | Julien | Confirmé | Trail | 4 | 30 | 26 | 87% | 2026-09-20 | `1778654056401` |
| 9 | charlesl.88@live.fr | Charles | Confirmé | 10km | 4 | 30 | 26 | 87% | 2026-06-28 | `1775251010162` |
| 10 | cyrienne.dacosta@gmail.com | Cyrienne | Intermédiaire | 10km | 4 | 10 | 9 | 90% | 2026-06-27 | `1776770917685` |
| 11 | programme@coachrunningia.fr | Admin | Confirmé | Trail | 5 | 42 | 38 | 90% | 2026-07-15 | `1778920918506` |

## Plans Premium actifs à PATCHER LIVE (preview only, course future) — top 20 les pires

Total à patcher live : **17**

| # | email | prénom | level | goal | freq | curVol | volS1 | ratio | raceDate | planId |
|--:|-------|--------|-------|------|----:|------:|------:|------:|----------|--------|
| 1 | patrick.cadours@hotmail.fr | patrick | Intermédiaire | Semi | 3 | 25 | 15 | 60% | 2026-11-01 | `1774291685137` |
| 2 | mymydeletttre@gmail.com | Myriam | Intermédiaire | Semi | 3 | 40 | 28 | 70% | 2026-09-13 | `1774751401405` |
| 3 | perarnau.g@gmail.com | Guillem | Confirmé | Trail | 5 | 40 | 28 | 70% | 2026-08-03 | `1774550853233` |
| 4 | patrick.cadours@hotmail.fr | patrick | Confirmé | Semi | 3 | 25 | 18 | 72% | 2026-11-01 | `1775012578645` |
| 5 | arnaudmanoeuvre@gmail.com | Arnaud | Confirmé | PoidsForme | 4 | 25 | 21 | 84% | ? | `1779092657010` |
| 6 | julian.jobert@hotmail.fr | Julian | Confirmé | Trail | 4 | 25 | 21 | 84% | 2026-06-28 | `1778935995789` |
| 7 | emmanuel.tellier.professionnel@gmail.com | emmanuel.tellier.professionnel@gmail.com | Confirmé | Marathon | 5 | 25 | 21 | 84% | 2026-10-25 | `1777324377154` |
| 8 | al1.kasongo@hotmail.fr | al1.kasongo@hotmail.fr | Expert | Marathon | 6 | 60 | 51 | 85% | 2026-11-15 | `1778927329896` |
| 9 | al1.kasongo@hotmail.fr | al1.kasongo@hotmail.fr | Confirmé | Semi | 4 | 60 | 51 | 85% | 2026-10-11 | `1778918772165` |
| 10 | grabo7@hotmail.com | Nicolas | Confirmé | Trail | 5 | 40 | 34 | 85% | 2026-08-20 | `1777082253985` |
| 11 | theogonon@live.fr | Théo | Expert | 10km | 5 | 35 | 30 | 86% | 2026-06-20 | `1777536547499` |
| 12 | gauthier.raph@gmail.com | Raphaël | Confirmé | Trail | 5 | 50 | 43 | 86% | 2026-07-02 | `1778250764802` |
| 13 | grabo7@hotmail.com | Nicolas | Confirmé | Trail | 5 | 50 | 43 | 86% | 2026-08-20 | `1778030830877` |
| 14 | briardantoine@outlook.fr | Antoine  | Expert | Trail | 6 | 50 | 43 | 86% | 2026-06-28 | `1775639929497` |
| 15 | arnaudmanoeuvre@gmail.com | Arnaud | Confirmé | Semi | 3 | 30 | 26 | 87% | 2026-10-25 | `1779093258648` |
| 16 | deugnilson@gmail.com | Julien | Confirmé | Trail | 4 | 30 | 26 | 87% | 2026-09-20 | `1778648613186` |
| 17 | georgeslor1@gmail.com | Georges | Expert | Marathon | 5 | 45 | 40 | 89% | 2026-10-18 | `1779089493075` |

## Plans passés ou non premium (info, pas d'action)

Total ignorés : **1128**

### Raison de premier tri (mutuellement exclusive)

| Raison | Count |
|--------|------:|
| ratio OK | 593 |
| pas de curVol référence | 290 |
| pas premium | 244 |
| course passée | 1 |

### Ignorés mais impactés par le bug (info)

Parmi les **1128** ignorés, **245** étaient quand même impactés (léger ou grave) :

- dont non-premium : **244**
- dont course passée (toutes catégories) : **12**
- dont **premium + course passée** (perte client effective) : **1**

## Ratio moyen S1/current par niveau

| Niveau | N | Ratio moyen |
|--------|--:|------------:|
| Expert | 259 | 90.6% |
| Confirmé | 437 | 96.8% |
| Intermédiaire | 140 | 100.5% |
| Débutant | 30 | 102.9% |

## Recommandation finale

**Action priorisée** :

1. **Code fix déjà appliqué** (`geminiService.ts:2655` floor S1 = 100 % current) → tous nouveaux plans OK.
2. **Régénération ciblée** : 11 plans premium actifs (course > 2026-05-18) avec full plan généré.
   - **Sous-prioriser** par sévérité (grave d'abord, 5 plans) puis date course proche.
   - Garder ratio cible ≥ 0.95.
3. **Patch live** : 17 previews actifs — recalcul S1 à la prochaine ouverture app, pas besoin de régénérer immédiatement.
4. **Aucune communication client direct** (doctrine [[feedback_jamais_contact_client]]) — Romane gère.

### Risque non régénération
- Confirmé/Expert : ressenti "plan mou" (sous-charge S1 = -15 %) → désabonnement.
- Débutant : illusion "je suis prêt" si plan démarre au volume actuel × 0.85 (faux confort).
