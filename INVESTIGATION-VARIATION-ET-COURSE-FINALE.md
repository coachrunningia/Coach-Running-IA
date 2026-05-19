# Investigation A — Variation séances + B — Course finale + C — Audit Marathon

Date : 2026-05-19
Scope : `src/services/geminiService.ts` (5940 L), `REFERENTIEL-COACH.md`, plans Firestore récents (Thomas + halluci-audit).
Mode : lecture seule. Aucune modification.

---

## A — Variation séances

### A.1 — `previewPrompt` (L3661 → L4015)

Sections analysées :

| Élément | Statut | Référence |
|---|---|---|
| Types de séances autorisés par phase | Présent (générique) | L3731–3755 |
| MP-LR (Marathon-Pace Long Run) | ❌ ABSENT du prompt | — |
| Blocs AS Marathon dans SL ("SL X km dont Y km AS") | ❌ ABSENT du prompt | — |
| SL progressive (EF → fin AS) | ⚠️ Existe seulement pour PdP (L3786 "Footing progressif"), pas pour Marathon | L3786 |
| SL mixte (EF + 2 blocs AS) | ❌ ABSENT du prompt | — |
| Fartlek structuré (avec format) | ⚠️ PARTIEL — uniquement "fartlek libre 5-6 acc. 30s" en fondamental conf+/4séances (L3740) ; pas de format structuré (ex 4×4', 5×3') | L3740 |
| Tempo (seuil long) | ⚠️ Mentionné à 1 ligne L3753 "Seuil long, allure spécifique course, fractionné seuil" — sans format ni durée | L3753 |
| Côtes structurées (durées, effort, récup) | ⚠️ PARTIEL — "Côtes courtes 6-8×20s" L3742 seulement fondamental ; pas de côtes longues structurées en spé | L3742 |
| Variation hebdo (anti-répétition d'une semaine à l'autre) | ❌ ABSENT — règle anti-répétition uniquement INTRA-semaine | L3751 |
| Spécificités Pfitzinger 18/55 ou 18/70 | ❌ ABSENT | — |
| Templates Expert Marathon | ❌ ABSENT — aucun bloc dédié niveau Expert / Marathon | — |
| VO2max intervals type 5×600m R2' | ❌ ABSENT | — |
| LT intervals type 4×1.5 mi à seuil | ❌ ABSENT | — |

**Citations exactes — phase `specifique` previewPrompt (L3753) :**
```
- specifique : + Seuil long, allure spécifique course, fractionné seuil.
```
Tout le bloc Expert / Marathon est résumé à cette ligne unique de 11 mots, sans aucun exemple, format, distance, ni structure de séance.

**Règle anti-répétition (L3751, INTRA-semaine uniquement) :**
```
NE PAS répéter le même intitulé ou le même format deux fois dans la même semaine.
```
Aucune règle équivalente pour empêcher 3 SL consécutives à 35 km AS Marathon sur S13-S14-S15 (cas Thomas).

### A.2 — `batchPrompt` (L4571 → L4745, génération S2-SN Premium)

Bloc TYPES DE SÉANCES PAR PHASE (L4622-4635) :
```
- developpement : + Fractionné (VMA courte, côtes), seuil court possible.
- specifique : + Seuil long, allure spécifique course, fractionné seuil.
- affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionné court.
```

Pas plus détaillé que `previewPrompt`. Tous les manques cités en A.1 s'y reproduisent. Le résumé `previousWeeksSummary` (L4558-4563) ne sert qu'à donner les **titres** des 2 dernières semaines générées au LLM — pas de mécanisme de variation imposé.

**Aucun bloc Marathon-spécifique** dans `batchPrompt` (Hyrox, Perte de poids, Trail, Finisher, VK, TrailSteep ont chacun un bloc dédié ; Marathon n'a rien).

### A.3 — `REFERENTIEL-COACH.md`

Le **référentiel coach contient** les patterns Marathon avancés (L106-116) :
```
**Spécificités Marathon** : SL ≥ 30 km × 3 minimum en spé. 2× AS marathon ≥ 15 km.
Medium-long 14-18 km hebdo (Pfitzinger). Affûtage 3 sem (50→30→J).
```

Et règles transversales L237-244 (zones d'allure marathon par niveau 75/78/80/83 %VMA).

**Ces patterns ne sont JAMAIS injectés dans le prompt LLM.** Le référentiel sert uniquement aux humains (PM/Coach), pas au LLM.

### A.4 — Code post-LLM (`enforceWeekConstraints`)

L1666-1735 : si une semaine `specifique`/`developpement` ne contient PAS de séance de Fractionné, le code convertit la séance la plus courte (autre que SL) en "Fractionné Allure Marathon — Phase Spécifique" avec un format fixe :
```
Échauffement 15 min EF, puis 3 × 10 min à allure marathon (r=3 min trot), puis 10 min retour au calme.
```

C'est **réactif et monolithique** : 1 seul template, identique pour toutes les semaines spécifiques où il manque un fractionné. Aucune progression (5×8' → 4×10' → 3×15'), aucune alternance avec MP-LR.

### Verdict A

**Le LLM N'EST PAS guidé sur la variation Marathon** :

1. ❌ Aucune mention "MP-LR", "Medium-long", "blocs AS dans SL", "Pfitzinger" dans `previewPrompt` ni `batchPrompt`
2. ❌ Aucune règle d'alternance INTER-semaines (le LLM peut générer 3× la même SL 35 km AS — c'est exactement ce qui est arrivé sur Thomas S13-S15)
3. ❌ Phase `specifique` Marathon = 1 ligne générique partagée avec 5K/10K/Semi/Trail
4. ❌ Niveau Expert : aucun bloc dédié, aucun template Pfitzinger 18/55 ou 18/70
5. ❌ Code post-LLM réactif (1 seul template fractionné Marathon, jamais MP-LR)
6. ⚠️ Le `REFERENTIEL-COACH.md` contient la doctrine correcte mais n'est PAS injecté dans le prompt

**Les blocs "X km AS Marathon dans une SL" sont 100 % laissés à la libre interprétation du LLM.** Quand il en génère un (S6 Thomas "SL avec blocs Marathon"), c'est un coup de chance. Quand il génère 3 SL identiques (S13-S15), il n'y a aucun garde-fou.

### Recommandations A

**Patch prompt (preview + batch) — bloc Marathon dédié à insérer si `subGoal=Marathon`** :

```
🔴 BLOC MARATHON — VARIATION OBLIGATOIRE PHASE SPÉCIFIQUE :
En phase specifique (4-6 semaines avant course), ALTERNER OBLIGATOIREMENT les séances clés :
- Semaine A : SL "MP-LR" longue (28-32 km dont 12-16 km à allure marathon EN FIN de SL)
- Semaine B : SL "blocs AS" (24-28 km avec 2 × 5 km à allure marathon DANS la SL)
- Semaine C : SL EF pure progressive (30-35 km, finir les 5 derniers km à AM-10s)
- Tempo : 1× tempo continu 12-16 km à allure semi-marathon (séance hebdo qualité)
- Medium-long : 14-18 km en milieu de semaine (Pfitzinger)
INTERDICTION : générer 2 SL IDENTIQUES (même distance + même allure) sur 2 semaines consécutives.

🔴 NIVEAU EXPERT MARATHON sub-3h30 : ajouter VO2max 5×800-1000m R2-3min + LT 4×1.5mi @ seuil
```

**Patch code — règle anti-monotonie cross-semaines à ajouter dans `enforceFullPlanConstraints` (L1846)** :
Détecter `≥ 2 SL consécutives avec même distance ±2km ET même allure` → forcer le LLM à varier (re-génération ciblée ou rewriting déterministe d'une des 2 séances en MP-LR variant).

**Spec code** : créer un catalogue déterministe de templates MP-LR par niveau (similaire à `buildFootingVariant` L4881-4899) appelé sur les SL de phase `specifique` Marathon.

---

## B — Course finale jour J

### B.1 — Code `calculatePeriodizationPlan` (L2154-2827)

Recherche exhaustive `raceDate / raceDay / race day / jour de course / course officielle / finalRace / addRaceSession` dans tout `geminiService.ts` :

| Pattern | Occurrence |
|---|---|
| `raceDate` (utilisations) | L3489-3500 (clamp durée plan), L3670 (affiché au LLM), L4076-4078 (réinjection après preview), L5662-5665 (utilité post-feedback), L5783 (référence) |
| `raceSession / injectRace / addRaceDay / finalRace / dernière séance = course` | **0 occurrence dans tout le fichier** |

**Le calcul `calculatePeriodizationPlan` retourne `weeklyVolumes[]`, `weeklyPhases[]`, `recoveryWeeks[]`, `weeklyElevationTarget[]` — JAMAIS de "raceDay" ni de marqueur "dernière séance = course".** Le code traite le dernier dimanche comme n'importe quelle séance d'affûtage.

### B.2 — Prompt (`previewPrompt` + `batchPrompt`)

`previewPrompt` (L3670) mentionne uniquement :
```
- Date de course : ${data.raceDate || 'Non définie'}
```
…à titre d'info dans le profil. **Aucune instruction "la dernière séance du dernier dimanche est la course officielle".**

`batchPrompt` : aucune mention de `raceDate` du tout. La dernière semaine d'affûtage est décrite uniquement par sa phase et son volume (L4600-4603) :
```
${batch.map(weekNum => {
  const phaseIdx = weekNum - 1;
  return `Semaine ${weekNum}: ${ctx.periodizationPlan.weeklyPhases[phaseIdx]} - Volume ${ctx.periodizationPlan.weeklyVolumes[phaseIdx]}km${ctx.periodizationPlan.recoveryWeeks.includes(weekNum) ? ' (RÉCUP)' : ''}`;
}).join('\n')}
```

Et la consigne phase `affutage` (L4634, batchPrompt) :
```
- affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionné court.
```
→ Cette instruction littérale **demande au LLM de mettre une SL courte le dimanche d'affûtage**, même si c'est le jour J de la course.

### B.3 — Post-LLM (`enforceFullPlanConstraints`, `enforceSLDay`)

- `enforceSLDay` (L855-898) : FORCE la SL le dimanche → si le dimanche est jour J de course, ça FORCE une SL Jogging à la place de la course.
- `enforceFullPlanConstraints` (L1846-1947) : applique affûtage cap + smoothing volume. **Aucune logique race-day**.

### Verdict B

**Cause racine : DOUBLE — code + prompt + amplifié par enforceSLDay**

| Cause | Détail |
|---|---|
| Code | `calculatePeriodizationPlan` ne marque pas la `lastWeek.lastSession` comme "raceDay" + aucune injection post-LLM d'une séance "Course Marathon" |
| Prompt | `batchPrompt` n'a aucune instruction "si raceDate ∈ dernière semaine, la dernière séance EST la course officielle" |
| Enforcement contre-productif | `enforceSLDay` force une SL le dimanche y compris le dimanche de course → écrase toute initiative LLM qui aurait pu placer la course |
| LLM | Sans instruction explicite, le LLM par défaut suit "phase affutage = SL courte" et ne devine pas qu'il faut basculer en "Course Marathon 42.195 km" |

**Bug isolé ou systémique : SYSTÉMIQUE** — voir Audit C.

### Recommandations B

**Patch prompt (`batchPrompt` UNIQUEMENT pour le dernier lot, si `raceDate` ∈ dernière semaine)** :
```
🔴 INSTRUCTION DERNIÈRE SÉANCE — JOUR J :
La date ${data.raceDate} tombe le ${dayName} de la semaine ${totalWeeks} (dernière semaine).
Cette séance N'EST PAS un footing ni une SL.
Génère-la comme :
  - type: "Course"
  - title: "Course officielle — ${data.subGoal}"
  - distance: "${raceDistanceKm} km"
  - duration: "${data.targetTime}"
  - targetPace: "${paces.allureSpecifique${subGoal}}"
  - intensity: "Difficile"
  - mainSet: stratégie de course détaillée (pacing, ravito, allure cible, gestion effort)
  - advice: messages motivants jour J + rappels logistiques (sommeil, petit-déj, échauffement)
```

**Patch code (à privilégier pour fiabilité)** :
1. Dans `calculatePeriodizationPlan`, retourner aussi `raceDayIndex: { weekNumber, dayName }` calculé depuis `raceDate` + `startDate`.
2. Après `enforceFullPlanConstraints`, ajouter `injectRaceSession(plan, raceDayInfo, data)` qui :
   - Identifie la séance du jour J
   - Si c'est une SL/Jogging générique → la remplace par un template race-day déterministe
   - Ajuste les autres séances de la semaine pour préserver la fréquence
3. Faire ce patch AVANT `enforceSLDay` pour éviter le swap forcé.

**Garde-fou minimal sans refonte** : `enforceSLDay` doit skip si la séance du dimanche concerné est déjà typée "Course" / titre contient "Course officielle".

---

## C — Audit batch Marathon récents

Plans audités : fichiers `halluci-audit/plans/*.json` (Firestore raw) + `audit-thomas-plan-parsed.json`.

### Résultats Marathon `fullPlanGenerated: true` :

| Plan ID | Plan | Race date | Dernière séance | Distance | Allure | Conforme race-day ? |
|---|---|---|---|---|---|---|
| 1776111554147 | Préparation Marathon 3h30 — 8 sem. | 2026-10-31 | Jogging "Pré-course footing léger + étirements" | 7.7 km | 5:47/km | ❌ NON — c'est un avant-course, pas la course |
| 1778392497932 | Préparation Marathon 4h00 — 20 sem. | 2026-09-27 | Sortie Longue "Dernière SL symbolique" | 8 km | 7:28/km | ❌ NON |
| 1779217739002 (Thomas) | Préparation Marathon 3h20 — 19 sem. | 2026-09-27 | Sortie Longue "SL de Confiance" | 20 km | 5:17/km | ❌ NON |

**3/3 plans Marathon `fullPlanGenerated: true` audités présentent une dernière séance AUTRE que la course.**

Aucun ne mentionne :
- Distance officielle (42.195 km)
- Allure spécifique marathon cible (4:44/km pour Thomas)
- Title "Course officielle" / "Marathon" / "Jour J"
- Type "Course" (qui d'ailleurs n'existe pas dans l'enum de types)

### Verdict C

**Bug SYSTÉMIQUE sur 100 % des plans Marathon audités.** Le bug Thomas n'est pas isolé. On peut raisonnablement extrapoler à tous les Marathon en production.

Note : le plan 1776111554147 (8 sem) a au moins un titre cohérent "Pré-course" sur la dernière séance — mais c'est une COINCIDENCE du LLM, pas une consigne du système.

---

## Synthèse

| Point | Cause racine | Patch nécessaire |
|---|---|---|
| Variation séances Marathon | **Prompt** : phase `specifique` réduite à 1 ligne générique partagée avec 5K/10K/Trail. **Pas de catalogue MP-LR/blocs AS/tempo Marathon.** Référentiel coach correct mais non injecté. **Pas de règle anti-monotonie inter-semaines.** | **Prompt** : ajouter bloc Marathon-spécifique avec catalogue MP-LR / blocs AS / progression hebdo. **Code** : ajouter règle anti-monotonie `≥ 2 SL consécutives identiques → re-générer ou re-écrire`. Optionnel : catalogue déterministe MP-LR injecté post-LLM. |
| Course finale jour J | **Code** : `calculatePeriodizationPlan` ne calcule pas `raceDayIndex` + aucune injection post-LLM d'une séance race. **Prompt** : aucune instruction "dernière séance = course officielle". **Enforcement contre-productif** : `enforceSLDay` force une SL sur le dimanche du jour J. | **Code (prioritaire)** : calculer `raceDayInfo` dans périodisation + `injectRaceSession()` après guard, AVANT `enforceSLDay`. **Prompt (complémentaire)** : ajouter instruction race-day dans dernier lot batchPrompt. **Garde-fou** : `enforceSLDay` skip si séance typée "Course". |

---

## Plan d'action proposé

**P0 (impact utilisateur immédiat — embarrassant pour la marque) :**
1. Patch code race-day → 100 % des prochains Marathon auront leur course officielle en dernière séance
2. Patch prompt race-day en complément (ceinture + bretelles)
3. Re-générer le dernier dimanche des 3 Marathon en cours via script live (Thomas + 2 autres)

**P1 (qualité plan Marathon — variation) :**
4. Ajouter bloc Marathon dédié dans `previewPrompt` et `batchPrompt` (templates MP-LR / blocs AS / progression spécifique)
5. Règle anti-monotonie inter-semaines dans `enforceFullPlanConstraints`
6. Cataloguer 4-6 templates Marathon spé déterministes (similaire à `buildFootingVariant`)

**P2 (extension autres distances) :**
7. Étendre patch race-day aux Semi-Marathon, 10 km, 5 km, Trail (même bug attendu).
8. Étendre bloc variation aux autres distances (Semi notamment).

---

## Fichiers clés référencés

- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts`
  - L2154-2827 : `calculatePeriodizationPlan` (zéro mention race-day)
  - L3661-4015 : `previewPrompt` (zéro mention race-day, variation Marathon générique)
  - L4571-4745 : `batchPrompt` (zéro mention race-day, variation Marathon générique)
  - L855-898 : `enforceSLDay` (problème : force SL le dimanche, écrase potentiel race-day)
  - L1666-1735 : conversion réactive SL → "Fractionné Allure Marathon" (1 template unique)
  - L1846-1947 : `enforceFullPlanConstraints` (zéro logique race-day, zéro anti-monotonie)
- `/Users/romanemarino/Coach-Running-IA/REFERENTIEL-COACH.md` L106-116 (doctrine correcte Marathon, non injectée dans le LLM)
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json` (preuve Thomas S13-S15 et S19)
- `/Users/romanemarino/Coach-Running-IA/halluci-audit/plans/1776111554147.json`, `1778392497932.json`, `1779217739002.json` (3/3 Marathon avec bug race-day)
