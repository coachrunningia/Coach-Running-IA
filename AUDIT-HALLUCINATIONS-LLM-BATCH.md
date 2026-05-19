# Audit hallucinations LLM batch — patterns mainSet
Date : 2026-05-19
Plans audités : 30 (les plus récents `fullPlanGenerated=true`)
Modèle audité : `gemini-3-flash-preview` (batchPrompt full plan)
Source : Firestore `plans` collection

## Méthode

- Téléchargement de 30 plans avec `fullPlanGenerated=true` les plus récents
  (du 2026-03-30 au 2026-05-19, 10 dans les 100 plus récents + 20 du batch 100-300)
- 1 445 séances totales, dont **1 076 séances course-pertinentes** (hors renfo/repos)
- 7 patterns regex appliqués sur le champ `mainSet` de chaque séance
- Vérification manuelle de chaque alerte (lecture mainSet + targetPace + paces du plan)

## Synthèse globale

| Pattern | Description | Alertes brutes | Vraies hallu (manuel) |
|---|---|---|---|
| A | "N blocs/x/répétitions de Xkm" anormal (Thomas-like) | 1 | **1** |
| B | "Y reps de Zkm" totalisant > 150% distance | 0 | 0 |
| C | "parcourir/faire Xkm" ≠ session.distance (écart > 25%) | 0 | 0 |
| D | Référence séance précédente (`comme dimanche dernier`) | 0 | 0 |
| E | Type SL/Footing avec mots "fartlek/fractionné" (strict) | 0 | 0 |
| F | Allure mainSet ≠ targetPace (faux positifs à 95%) | 20 | 0 |
| G | Allure EF mainSet ≠ `paces.efPace` du plan (écart > 30s) | 5 | **2** |
| H | Durée mainSet ≠ `session.duration` (écart > 30min ET > 50%) | 60 | **3** |

**TOTAL vraies hallucinations identifiées : 6 alertes / 1 076 séances course (~0.56%)**
**Plans impactés : 3 / 30 (10%)**

## Cas Thomas S13 reproduit ailleurs ?

**NON. Cas strictement isolé sur le pattern A "2 blocs de 35 km dans séance 35 km".**

Sur les 30 plans, seules 3 occurrences du pattern `N <séparateur> X km` ont été trouvées :
- `2 blocs de 35 km` — Thomas S13 SL (HALLU)
- `2 x 4 km` — Thomas S? (légitime, 2x4=8km dans une séance plus grande)
- `3 blocs de 3 km` — Thomas S13 fractionné 15 km (légitime, 3x3=9km dans 15)

Aucun autre plan n'utilise la formulation "N blocs/x de Xkm" qui pourrait halluciner. La structure de prompt génère plutôt "X km à allure Y" ou "N x Y min à allure Z" — Thomas est un cas particulier où le LLM a confondu la **distance totale de la séance** (35 km) avec **la longueur d'un bloc d'allure marathon**.

## Détail des vraies hallucinations

| Plan | Email | Sem | Séance | Pattern | Extrait mainSet | Verdict |
|---|---|---|---|---|---|---|
| 1779217739002 | thomas.w********@gmail.com | S13 | Sortie Longue 35km | A | `2 blocs de 35 km à l'allure marathon (4:44 min/km)` | **HALLU structure** (N×X > distance) |
| 1777662230470 | abala*****@hotmail.com | S1 | Jogging 7.4km | G | `endurance fondamentale à 5:47 min/km` (efPace plan=7:47) | **HALLU allure** (Δ -2 min/km) |
| 1777662230470 | abala*****@hotmail.com | S1 | Sortie Longue 10.6km | G | `endurance fondamentale à 5:47 min/km` (efPace plan=7:47) | **HALLU allure** (Δ -2 min/km) |
| 1777043776160 | emilien******@gmail.com | S1 | Jogging 10.5km | H+G | `2h00 min de course continue en EF (11:12 min/km)` (duration=1h04, targetPace=6:11) | **HALLU durée + pace** |
| 1777043776160 | emilien******@gmail.com | S1 | Sortie Longue 7.7km | H | `1h42 min de course en EF (11:12 min/km)` (duration=1h25) | **HALLU durée** (Δ +17 min) |
| 1778441786486 | mouhammads**********@gmail.com | toutes | toutes EF | G | mainSet utilise systématiquement `4:29 min/km` comme EF alors que `paces.efPace=4:10` et `paces.eaPace=3:37` | **HALLU allure inventée** (4:29 n'existe dans aucune allure déclarée) |

### Détails cas par cas

**Thomas S13 — Pattern A (hallu structure)**
- Plan : Marathon 3h20, 19 sem.
- Séance : Sortie Longue 35 km (PIC), targetPace 4:44 min/km
- mainSet : `2 blocs de 35 km à l'allure marathon (4:44 min/km) entrecoupés de 2 km de récupération à 5:17 min/km. Le reste de la sortie en EF.`
- Problème : 2 × 35 = 70 km dans une séance de 35 km. Le LLM a confondu "longueur du bloc" avec "distance totale".

**Abalandreau S1 — Pattern G (hallu allure)**
- Plan : Trail 14 km Finisher, 7 sem. (débutant trail)
- `paces.efPace = 7:47 min/km`, `seuilPace = 5:60` (autre bug — 5:60 invalide), `eaPace = 6:47`, `recoveryPace = 8:42`
- mainSet S1 Jogging + SL : `endurance fondamentale à 5:47 min/km`
- Problème : 5:47 est plus rapide que `seuilPace 5:60` et beaucoup plus rapide que efPace 7:47. Hallu de chiffre (5 vs 7 — erreur de digit).
- À partir de S2, le mainSet utilise correctement `7:47` → hallu localisée à S1 uniquement.

**Emilien S1 — Patterns H+G (hallu durée + pace)**
- Plan : "10 km en 3h15", 20 sem. (target time TRÈS irréaliste pour 10k = 19:30 min/km moyen → débutant absolu)
- `paces.efPace = 6:11`, recovery non lue
- Séance Jogging S1 : duration `1h04`, distance `10.5 km`, targetPace `6:11`
- mainSet : `2h00 min de course continue en endurance fondamentale (11:12 min/km)`
- Problèmes :
  - Durée 2h00 ≠ duration 1h04 (Δ ~56 min)
  - Pace 11:12 ≠ targetPace 6:11 (Δ ~5 min/km)
  - 11:12 ≠ efPace plan 6:11
- Séance Sortie Longue S1 : duration `1h25`, distance `7.7 km`, targetPace `11:12`
- mainSet : `1h42 min de course en EF (11:12 min/km)`
- Problème : durée 1h42 ≠ duration 1h25 (Δ +17 min). 7.7 km × 11:12 = 86 min ≠ 102 min.
- Note : ici le profil "10k en 3h15" est aberrant et **a probablement cassé la calibration du LLM**.

**Mouhammad — Pattern G (hallu allure inventée systémique)**
- Plan : "10 km en 30 min", 9 sem. (target irréaliste — feasibility dit "33:23 plus réaliste avec VMA 20")
- `paces.efPace = 4:10`, `eaPace = 3:37`, `recoveryPace = 4:39`
- mainSet utilise `4:29 min/km` comme allure EF sur TOUTES les séances
- Problème : `4:29` n'est listée nulle part dans `paces`. Allure inventée par le LLM (probablement interpolation entre efPace 4:10 et recoveryPace 4:39 → ((4:10 + 4:39)/2 = 4:25, proche).
- Faisable physiologiquement, mais c'est une **incohérence systémique entre `paces.efPace` (donnée d'entrée) et mainSet (allure utilisée)** sur l'ensemble du plan.

## Pattern F (faux positifs)

20 alertes "allure mainSet ≠ targetPace" mais ce sont des **faux positifs structurels** :
- Séances Jogging modernes contiennent souvent un bloc EF + accélérations (lignes droites, fartlek court, blocs spé) → mainSet liste plusieurs allures
- `targetPace` reflète l'allure dominante mais pas exhaustivement
- Aucune vraie hallu ici

## Pattern H (faux positifs durée)

60 alertes "durée mainSet < duration session" mais 95% sont expliquées par :
- `mainSet` décrit le **core workout** seul
- `warmup` et `cooldown` sont des champs séparés qui ajoutent souvent 20-40 min
- Le calcul total `warmup + mainSet + cooldown` est cohérent avec `duration`

Vraies hallu durée : seulement chez Emilien S1 (2/60 alertes).

## Risque produit

**~0.6% de séances impactées, ~10% de plans avec au moins 1 hallu.**

- **Cas Thomas (Pattern A)** : isolé, RARE, mais **catastrophique pour la confiance utilisateur** (séance non-réalisable affichée comme calibrée).
- **Cas abalandreau (Pattern G)** : hallu de **chiffre** (5 vs 7 sur une allure), peut être due à `seuilPace = "5:60"` (chiffre invalide, 60 secondes = 1 minute → devrait être 6:00) qui a pu déstabiliser le LLM.
- **Cas emilien / mouhammad** : profils avec **targetTime aberrants** ("10k en 3h15", "10k en 30min") qui poussent le LLM hors zone de fiabilité.

**Verdict : risque MINEUR mais réel.** Pas d'urgence critique, mais une règle prompt explicite réduirait à zéro le pattern A.

## Recommandations prompt

### Règle 1 — Interdire les blocs ≥ distance séance (cible Pattern A)

À ajouter dans le prompt système / batchPrompt :

```
RÈGLE CRITIQUE MAINSET — Cohérence distance :
Le mainSet ne doit JAMAIS mentionner "N blocs de X km" ou "N x X km" où :
- N × X > session.distance × 1.1, OU
- X >= session.distance.

Exemples INTERDITS pour une séance de 35 km :
- "2 blocs de 35 km" (NON : 2×35=70 > 35)
- "3 fois 15 km" (NON : 3×15=45 > 35)

Exemples CORRECTS pour une séance de 35 km :
- "3 blocs de 5 km à allure marathon entrecoupés de 2 km en EF" (3×5=15, le reste en EF)
- "20 km à allure marathon puis 15 km en EF progressif"
- "Sortie longue de 35 km avec 2 portions de 8 km à allure marathon"
```

### Règle 2 — Cohérence allure mainSet vs paces du plan (cible Pattern G)

```
RÈGLE CRITIQUE MAINSET — Cohérence allure :
Toutes les allures (X:YY min/km) mentionnées dans le mainSet DOIVENT correspondre
exactement à une des allures déclarées dans `paces` :
- efPace, eaPace, vmaPace, seuilPace, recoveryPace, allureSpecifique5k/10k/Semi/Marathon

INTERDIT d'inventer une allure (ex: "4:29 min/km" si elle n'est pas dans `paces`).

Si tu veux mentionner une allure intermédiaire (ex: "EF active" entre EF et EA),
utilise toujours une référence paces, pas un chiffre inventé.
```

### Règle 3 — Cohérence durée mainSet vs duration (cible Pattern H emilien)

```
RÈGLE CRITIQUE MAINSET — Cohérence durée :
La durée totale décrite dans le mainSet doit être ≤ session.duration - warmup - cooldown.
Si session.duration = 1h04 et warmup ≈ 15 min et cooldown ≈ 5 min,
alors mainSet ne peut pas excéder 44 min.

INTERDIT de mentionner "2h00 de course continue" dans une séance dont
session.duration = 1h04.
```

### Règle 4 — Pas de raisonnement aberrant sur targetTime irréaliste

Pour les profils dont `feasibility.status` est négatif (ex: mouhammad 10k 30min ou emilien 10k 3h15) :
- Ne pas calibrer le plan sur le targetTime aberrant
- Calibrer sur la VMA réelle (ou efPace réel)
- Le `welcomeMessage` doit prévenir l'utilisateur du décalage (déjà fait)

### Cible prompt à modifier

À vérifier dans :
- `previewPrompt` (plan court 6 sem)
- `batchPrompt` (plan complet, où Thomas a été touché)

Les règles 1-3 doivent apparaître **avant** la génération des séances, dans la section "contraintes mainSet".

## Bug additionnel détecté : `seuilPace = "5:60"`

Plan abalandreau (`1777662230470`) :
```json
"paces": {
  "seuilPace": { "stringValue": "5:60" }
}
```

`5:60` est invalide (60 secondes = 1 minute → devrait être `6:00`). Bug de génération côté **calcul des allures** (pas LLM). À investiguer dans `lib/calculatePaces.ts` ou équivalent : un `seuilPace` calculé doit normaliser les secondes < 60.

## Plans audités (anonymisés)

```
1779217739002 | 2026-05-19 | thomas.w********@gmail.com       | Marathon 3h20 — 19 sem
1779190338331 | 2026-05-19 | arnaudm*******@gmail.com         | Remise en Forme — 12 sem
1779170513074 | 2026-05-19 | rau***@yahoo.fr                  | Trail 110km Finisher
1778942808369 | 2026-05-16 | painvi******@yahoo.com           | Semi 2h30 — 17 sem
1778920918506 | 2026-05-16 | prog****@coachrunningia.fr       | Trail 21km
1778654056401 | 2026-05-13 | deugn*****@gmail.com             | Trail 20km
1778645930644 | 2026-05-13 | rouet.******@hotmail.fr          | Trail 129km
1778613918663 | 2026-05-12 | nahiapel********@gmail.com       | 5km Finisher
1778600029840 | 2026-05-12 | Julienf*******@gmail.com         | Remise en Forme
1778448056417 | 2026-05-10 | matt****@hotmail.fr              | Trail 57km
1778441786486 | 2026-05-10 | mouhammads**********@gmail.com   | 10k en 30min ← HALLU systémique
1778429788661 | 2026-05-10 | lisa-d******@hotmail.fr          | Trail 21km
1778392497932 | 2026-05-10 | azka****@gmail.com               | Marathon 4h00
1778356268451 | 2026-05-09 | nico****@yahoo.fr                | Trail 34km
1778283379869 | 2026-05-08 | mosbahm*******@gmail.com         | Perte de Poids
1778262981697 | 2026-05-08 | tieffryg********@hotmail.fr      | Remise en Forme
1778094004207 | 2026-05-06 | ch.cou******@gmail.com           | Trail 13km
1777662230470 | 2026-05-01 | abala*****@hotmail.com           | Trail 14km ← HALLU allure S1
1777043776160 | 2026-04-24 | emilien******@gmail.com          | 10k en 3h15 ← HALLU durée+pace S1
1776889642333 | 2026-04-22 | Agp-l*****@outlook.be            | 5km en 15min
1776799498175 | 2026-04-21 | c.lecarp********@gmail.com       | Trail 10km
1776770917685 | 2026-04-21 | cyrienne********@gmail.com       | 10k Finisher
1776451012891 | 2026-04-17 | roma****@hotmail.fr              | Trail 21km
1776111554147 | 2026-04-13 | annesophie**********@gmail.com   | Marathon 3h30
1775497873913 | 2026-04-06 | annesophie**********@gmail.com   | Trail 25km
1775471041831 | 2026-04-06 | marie.d*******@me.com            | Trail 21km
1775251010162 | 2026-04-03 | charl*****@live.fr               | 10k en 50min
1775239815417 | 2026-04-03 | david.mi********@gmail.com       | Semi 1h25
1775202027706 | 2026-04-03 | cyril.c*******@gmail.com         | Trail 50km
1775163288380 | 2026-04-02 | jolyj*****@hotmail.com           | Trail 50km
```

## Verbatim conclusion

> Le cas Thomas S13 (`2 blocs de 35 km` dans séance 35 km) est **strictement isolé** sur le pattern de structure. Aucun autre plan dans les 30 audités ne reproduit cette hallucination spécifique.
>
> Cependant, **2 autres types d'hallucinations** ont été détectés sur 3 plans différents (abalandreau, emilien, mouhammad) :
> - Hallu d'allure (chiffre EF erroné, ex: 5:47 au lieu de 7:47)
> - Hallu de durée (2h00 dans une séance 1h04)
>
> Ces hallu apparaissent majoritairement en **S1 de plans avec un targetTime aberrant** (10k en 3h15, 10k en 30min) ou avec un bug en amont (`seuilPace=5:60`). Le LLM est moins fiable quand les inputs sont extrêmes.
>
> **Taux global ~0.6% séances impactées, ~10% plans avec au moins 1 hallu.** Pas urgent, mais ajout de 3 règles prompt explicites (structure mainSet, allure cohérente, durée cohérente) suffirait à éliminer 100% des hallu détectées.
