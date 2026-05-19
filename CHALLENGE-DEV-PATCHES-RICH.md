# Dev expert — Challenge patches Rich (Plan 1 + Plan 2)
Date: 2026-05-18

## Synthèse exec

**Verdict global : ⚠️ GO avec 4 modifs requises (3 mineures + 1 importante)**

| Bloc | Verdict | Détail |
|------|---------|--------|
| Q1 Cohérence interne Firestore | ✅ GO | Typage OK, sommes S1 cohérentes (70/3000), aucun champ orphelin |
| Q2 Cohérence inter-plans | ⚠️ Modif | Pics alignés (85/5800) mais 7 différences mineures sur paces, profil utilisateur diffère légèrement |
| Q3 Doctrine respectée | ✅ GO | Aucun mot interdit (le "poids" trouvé = "poids de corps" = bodyweight squats, légitime). Allures intactes |
| Q4 Risques techniques | ✅ GO | Backups OK, idempotence OK, updateMask propre, régénération full plan utilisera bien nos patches |
| Q5 Effets UI collatéraux | ⚠️ Modif | Plan 1 S1 contient bugs LLM hérités (distances/durées/mainSet incohérents) NON corrigés par les patches |
| Q6 Audit code antérieur | ✅ Confirmé | Les 2 bugs `planUtils.ts` sont 100% à l'origine des D+ écrasés |

**Modifs requises** :
1. **IMPORTANT** : Plan 1 a 3 sessions S1 avec incohérences distance/durée/mainSet héritées du LLM, jamais corrigées (Plan 2 a été propre via `patch-rich-PLAN2-S1-realign.mjs`).
2. Plan 2 message mentionne "12 000 m D+" alors que l'input questionnaire `trailDetails.elevation=11000m` (Rich avait déclaré 11000 en avril, 12000 en mai).
3. Plan 1 a `feasibility.recommendation` = "une durée de préparation d'au moins 20 semaines" — Plan 2 n'a pas ce champ.
4. Allures différentes entre Plan 1 et Plan 2 (5:07 vs 5:06, etc.) — c'est LÉGITIME (VMA recalculée différemment selon questionnaire), mais peut surprendre Rich s'il compare les 2 plans.

---

## Q1 — Cohérence interne Firestore (2 plans)

### Plan 1 (`1779135832271`, 13 sem)

| Champ | Type Firestore | Valeur | Verdict |
|-------|---------------|--------|---------|
| `feasibility` | `mapValue` | — | OK |
| `feasibility.status` | `stringValue` | `"AMBITIEUX"` | OK |
| `feasibility.score` | `integerValue` | `60` | OK |
| `feasibility.message` | `stringValue` | message cash 825c | OK |
| `feasibility.safetyWarning` | `stringValue` | ECG/cardio | OK |
| `feasibility.recommendation` | `stringValue` | "20 semaines min" | présent (asymétrie vs P2) |
| `confidenceScore` (top-level) | `integerValue` | `60` | OK |
| `welcomeMessage` | `stringValue` | 800c | OK |

**Cohérence vecteurs ↔ S1** :
- `weeklyVolumes[0]` = 70 vs sum(S1.distance) = 70 km → **OK**
- `weeklyElevationTarget[0]` = 3000 vs sum(S1.elevationGain) = 3000 m → **OK**
- `weeklyVolumes.length` = 13 = `durationWeeks` = 13 → **OK**
- `weeklyElevationTarget.length` = 13 → **OK**

**Pas de champ orphelin**. Tous les top-level présents : `adaptationLog, calculatedVMA, confidenceScore, createdAt, distance, durationWeeks, endDate, feasibility, fullPlanGenerated, generationContext, goal, id, isPreview, location, name, paces, raceDate, sessionsPerWeek, startDate, suggestedLocations, userEmail, userId, vma, vmaSource, weeks, welcomeMessage`.

### Plan 2 (`1775644846100`, 19 sem)

| Champ | Type Firestore | Valeur | Verdict |
|-------|---------------|--------|---------|
| `feasibility` | `mapValue` | — | OK |
| `feasibility.status` | `stringValue` | `"AMBITIEUX"` | OK |
| `feasibility.score` | `integerValue` | `60` | OK |
| `feasibility.message` | `stringValue` | message cash 818c | OK |
| `feasibility.safetyWarning` | `stringValue` | ECG/cardio + recovery weeks | OK |
| `feasibility.recommendation` | absent | — | asymétrie vs P1 |
| `confidenceScore` (top-level) | `integerValue` | `60` | OK |
| `welcomeMessage` | `stringValue` | 1100c | OK |
| `targetTime` | `stringValue` | `"Finisher"` | présent (asymétrie vs P1) |

**Cohérence vecteurs ↔ S1** :
- `weeklyVolumes[0]` = 70 vs sum(S1.distance) = 70 km → **OK** (post-realign)
- `weeklyElevationTarget[0]` = 3000 vs sum(S1.elevationGain) = 3000 m → **OK** (post-realign)
- `weeklyVolumes.length` = 19 = `durationWeeks` = 19 → **OK**

**Top-level fields** : identiques à P1 PLUS `targetTime`. Pas de champ orphelin.

### Confirmation pas de typage cassé

Aucun `stringValue` n'est numérique par erreur, aucun `integerValue` n'est string non-numérique. Les arrays Firestore sont bien encodés `arrayValue: { values: [...] }`. **Verdict : ✅ GO**.

---

## Q2 — Cohérence inter-plans

### Tableau alignement

| Critère | Plan 1 (13 sem) | Plan 2 (19 sem) | Aligné ? |
|---------|-----------------|------------------|----------|
| `feasibility.status` | `AMBITIEUX` | `AMBITIEUX` | ✅ |
| `feasibility.score` | `60` | `60` | ✅ |
| `confidenceScore` | `60` | `60` | ✅ |
| `feasibility.safetyWarning` | "55 ans + ultra... ECG INDISPENSABLE" | "55 ans + ultra alpin... ECG INDISPENSABLE" | ✅ ton aligné, formulation légèrement différente |
| Pic volume | 85 (×3) | 85 (×3) | ✅ |
| Pic D+ | 5800 (S11) | 5800 (S15) | ✅ |
| `weeklyVolumes` shape | progressif + plateau | progressif + plateau | ✅ même philosophie |
| `welcomeMessage` ton | consistance / plateau / Master 55 | consistance / plateau / Master 55 | ✅ |
| BTB mentionnés | S8, S9, S11 | "phase spécifique" générique | ⚠️ P1 plus précis |
| `feasibility.recommendation` | présent | absent | ⚠️ asymétrie schéma |
| `targetTime` | undefined | "Finisher" | ⚠️ asymétrie (héritage) |

### Allures — DIFFÉRENTES entre les 2 plans

| Pace | Plan 1 | Plan 2 | Diff |
|------|--------|--------|------|
| efPace | 5:07 | 5:06 | -1s |
| eaPace | 4:27 | 4:26 | -1s |
| seuilPace | 3:56 | 3:55 | -1s |
| vmaPace | 3:26 | 3:25 | -1s |
| recoveryPace | 5:43 | 5:41 | -2s |
| allureSpecifique5k | 3:37 | 3:36 | -1s |
| allureSpecifique10k | 3:49 | 3:48 | -1s |
| allureSpecifiqueSemi | 4:02 | 4:01 | -1s |
| allureSpecifiqueMarathon | 4:17 | 4:16 | -1s |

**Analyse** : différence due à VMA différente :
- Plan 1 : VMA = 17.5 km/h (estimation niveau Expert)
- Plan 2 : VMA = 17.581 km/h (calculée depuis marathon 3h00)

Les paces ont été calculées à des moments différents avec des inputs différents. Les patches **n'ont pas touché aux paces**, doctrine respectée. C'est une **incohérence acceptable** mais Rich va probablement la remarquer s'il switch d'un plan à l'autre. Décision : la laisser, conforme à `feedback_jamais_baisser_allure_cible` et `feedback_input_client_obligatoire`.

### Profil utilisateur — DIFFÉRENT

| Critère | Plan 1 (mai 2026) | Plan 2 (avril 2026) |
|---------|-------------------|---------------------|
| age | 55 | 54 |
| trailDetails.distance | 110 | 110 |
| trailDetails.elevation | **12 000** | **11 000** |
| currentWeeklyVolume | **70** | **60** |
| currentWeeklyElevation | 3 000 | 3 000 |
| location | Paulhac | Toulouse |
| vmaSource | Estimation Expert | Marathon 3h00 |

**Problème** : les `welcomeMessage` et `feasibility.message` patchés des **deux** plans mentionnent "12 000 m D+". C'est correct pour Plan 1 (input=12000) mais Plan 2 a `trailDetails.elevation=11000` dans son questionnaireSnapshot. La doctrine `feedback_input_client_obligatoire` dit "inputs client respectés tels quels" — donc Plan 2 message devrait dire "11 000 m D+", pas "12 000 m D+".

⚠️ **Modif suggérée Plan 2** : revoir si on garde "12 000" (situation actuelle réelle Rich) ou si on restaure "11 000" (input questionnaire historique).

### S1 — Verdict

Plan 2 S1 a été **proprement realigned** par `patch-rich-PLAN2-S1-realign.mjs`. Plan 1 S1 contient des incohérences (voir Q5).

---

## Q3 — Doctrine respectée

### Checklist

| Règle | Plan 1 | Plan 2 |
|-------|--------|--------|
| Aucun mot poids/IMC/minceur/silhouette/kilos/corpulence/maigrir (HORS exercice musculation) | ✅ | ✅ |
| Allures `paces.*` intactes (jamais touchées) | ✅ | ✅ |
| `feedback_jamais_baisser_allure_cible` | ✅ | ✅ |
| `feedback_input_client_obligatoire` S1 ≥ current declared | ✅ (70=70) | ✅ (70≥60) |
| `feedback_securite_avant_conversion` (message cash, pas embellissement) | ✅ ("n'est pas optimal", "très court", "impossible") | ✅ ("est ambitieux", "fenêtre minimum acceptable") |
| Mention ECG/cardio INDISPENSABLE | ✅ | ✅ |
| Pas de nutrition/protocole chiffré | ✅ (mention "petites quantités toutes 30-45 min" reste light) | ✅ |
| QUE course à pied (pas cross-training) | ✅ | ✅ |
| Pas de mention "poids/minceur" dans message client | ✅ | ✅ |

### Détail "poids" trouvé

Une occurrence dans **chaque** plan, à l'emplacement :
`weeks[0].sessions[1] (Mercredi Renfo).mainSet` :
> "Circuit 4 tours : Squats **poids de corps** (3x18), …"

C'est l'expression standard pour "bodyweight squats" en français. **NON considéré comme un mot interdit lié à la corpulence**. Conforme à `feedback_jamais_poids_minceur` (qui interdit la mention de poids/IMC/corpulence du runner, pas l'exercice de musculation).

### Tonalité Plan 1 vs Plan 2

- Plan 1 (13 sem) : ton **alarmant** — "n'est pas optimal", "très court", "très élevé", "impossible de construire toute la résistance excentrique en 13 semaines". Conforme `feedback_securite_avant_conversion`.
- Plan 2 (19 sem) : ton **modéré-honnête** — "est ambitieux", "fenêtre minimum acceptable", "point clé à travailler". Modération justifiée car 19 sem >> 13 sem.

✅ **Verdict** : doctrine respectée.

---

## Q4 — Risques techniques

### Idempotence des scripts

Tous les 3 scripts critiques (`patch-rich-PLAN1-pic85.mjs`, `patch-rich-PLAN2-pic85.mjs`, `patch-rich-cash-messages.mjs`) implémentent **`isAlreadyPatched(doc)`** + early return :
- Compare `weeklyVolumes`/`weeklyElevationTarget` element-by-element
- Compare `feasibility.message` string-identique
- Compare `welcomeMessage` string-identique

**Verdict** : ✅ **idempotents** — re-run sans risque.

Le `patch-rich-PLAN2-S1-realign.mjs` écrit sans tester `before === after` mais cible des valeurs explicites (les TARGETs), donc re-run produit toujours le même résultat = idempotent **par convergence**.

### Backups disponibles + intacts

```
backup-rich-NEW-pre-patch.json                (création preview originale)
backup-rich-NEW-pre-repatch-MASTER100.json    (pré pic 100)
backup-rich-NEW-pre-repatch-MASTER50.json     (pré master 50)
backup-rich-PLAN1-pre-pic85.json              (pré patch pic 85)
backup-rich-PLAN1-pre-cash-message.json       (pré message cash)
backup-rich-PLAN2-pre-patch.json              (pré homogenize)
backup-rich-PLAN2-pre-pic85.json              (pré patch pic 85)
backup-rich-PLAN2-pre-cash-message.json       (pré message cash)
backup-rich-PLAN2-pre-S1-realign.json         (pré realign sessions S1)
```

✅ **Chaîne de backups complète** — rollback possible à n'importe quelle étape via PATCH sur l'ensemble du doc.

### `updateMask` ciblé correctement ?

| Script | updateMask.fieldPaths | Risque overwrite ? |
|--------|----------------------|---------------------|
| `patch-rich-PLAN1-pic85.mjs` | `generationContext, feasibility, welcomeMessage` | ⚠️ remplace TOUTE la map `feasibility` et `generationContext` — mais le code **renvoie la map complète enrichie** (clone + modif locale), donc safe |
| `patch-rich-PLAN2-pic85.mjs` | idem | idem |
| `patch-rich-cash-messages.mjs` | `feasibility` seul | ⚠️ replace map → renvoie map complète clonée + modif `.message` |
| `patch-rich-PLAN2-S1-realign.mjs` | `weeks` seul | ⚠️ replace tout `weeks` array — renvoie array complet clonée |

Les scripts font **`getDoc()` → mutation in-place sur `fields.X` → PATCH avec `fields: { X: fields.X }`**. La map/array entière est renvoyée. Pas de perte de champs orphelins. ✅

### Régénération full plan (UI déclenchée par Rich)

Si Rich clique "Générer le plan complet" :
- `App.tsx:828` appelle `generateRemainingWeeks(plan, …)`
- Cette fonction lit `plan.generationContext.periodizationPlan.weeklyVolumes` (nos patches) et `weeklyElevationTarget` (nos patches)
- Génère S2-SN via Gemini en **respectant les vecteurs patchés** (cités explicitement dans le prompt L4446 : `Volume ${ctx.periodizationPlan.weeklyVolumes[phaseIdx]}km`)
- Applique `enforceWeekConstraints` et `enforceFullPlanConstraints` qui CAPPENT les volumes des nouvelles semaines sur nos vecteurs (`ctx.periodizationPlan.weeklyVolumes[idx]`)
- S1 (déjà en base) n'est **pas régénérée** — fusion `[plan.weeks[0], ...allGeneratedWeeks]` (L4794)

✅ **Nos patches sont préservés lors de la régénération**.

⚠️ **MAIS** : `enforceWeekConstraints` est appliqué aussi sur S1 (idx 0) avec target volume = `weeklyVolumes[0]` = 70. Si Plan 1 S1 actuel (70 km mais réparti bizarrement avec une "Récupération 20km/45min/200m D+" hallucinante) ne fait pas le compte exact, le code peut SCALER (multiplier toutes les distances par un facteur). Le total est OK donc pas de scaling, mais c'est fragile.

⚠️ Le code peut aussi **retyper** les sessions (ex : "Récupération 20km" → "Sortie Longue" si la durée est > seuil). Le LLM avait mis 45 min pour 20 km — c'est court donc probablement pas retypé, mais à surveiller.

⚠️ `validateAndCorrectPlan` (Layer 3 du `planValidator`) PEUT décider de RE-GÉNÉRER une semaine via Gemini si jugée invalide. Si Layer 3 catalogue S1 comme incohérente (distances vs durées vs allure incompatibles), il peut la réécrire. Probabilité : modérée vu les incohérences existantes Plan 1.

---

## Q5 — Effets UI collatéraux

### S1 vs S2 progression

| Plan | S1 vol (réel) | S2 vol (target) | Progression | Verdict |
|------|---------------|-----------------|-------------|---------|
| Plan 1 | 70 km | 73 km | +4.3 % | ✅ douce |
| Plan 2 | 70 km | 73 km | +4.3 % | ✅ douce |

| Plan | S1 D+ (réel) | S2 D+ (target) | Progression |
|------|--------------|-----------------|-------------|
| Plan 1 | 3000 m | 3200 m | +6.7 % |
| Plan 2 | 3000 m | 3200 m | +6.7 % |

✅ Progression S1→S2 cohérente sur les deux plans.

### Graphiques de progression (Statistics.tsx)

Les nouveaux vecteurs `weeklyVolumes` et `weeklyElevationTarget` seront lus directement par les composants UI qui font `plan.generationContext.periodizationPlan.weeklyVolumes`. Format Firestore = `arrayValue: { values: [{integerValue: "85"}, …] }`, normalisé en number[] côté client par le converter standard. ✅ Aucun risque.

### Carte 5 (allure objectif)

Les allures `paces.*` n'ont **pas été touchées**. La carte 5 affichera les paces originales du plan. ✅

### Notifications/emails

`feedback_jamais_contact_client` strict : aucun email/notif n'est déclenché par les patches Firestore (les patches sont des UPDATE sur `plans/{id}`, pas des trigger Cloud Function actifs sur cette collection pour notifier le user). ✅ Romane reste maître du contact.

### Plan 1 S1 sessions — INCOHÉRENCES HÉRITÉES (NON corrigées)

**C'est le point chaud du challenge.** Le `patch-rich-PLAN1-pic85.mjs` annonce explicitement (L15) :
> "Sessions S1 (weeks[0]) : 70 km / 3000 m D+ déjà conformes → skip (idempotent)"

Mais "conformes" sur le total uniquement ! Détail Plan 1 S1 actuel :

| Jour | Type | Distance | Durée | D+ | Mainset (extrait) | Problème |
|------|------|----------|-------|-----|--------------------|----------|
| Mardi | Jogging | 12 km | **1h 09 min** | 400 m | "62 min sur parcours vallonné" | dur ≠ mainSet (62 min ≠ 1h09) |
| Mercredi | Renforcement | 0 km | 45-50 min | 0 m | OK | ✅ |
| Jeudi | Jogging | 14 km | **1h 31 min** | 700 m | "62 min sur terrain varié" | dur ≠ mainSet (62 min ≠ 1h31) |
| Samedi | **Récupération** | **20 km** | **45 min** | 200 m | "25 min de footing très léger à 5:43 min/km" | **20 km en 45 min = 26.7 km/h IMPOSSIBLE** ; mainSet dit 25 min |
| Dimanche | Sortie Longue | 24 km | **3h00** | 1700 m | "2h30 de course" | dur ≠ mainSet (2h30 ≠ 3h00) |

Le total fait 70 km / 3000 m D+ (par chance), mais **4 des 5 sessions ont des incohérences distance/durée/mainSet**. Rich va voir cela dans l'UI.

**Plan 2 S1 — CORRECT** (post realign script) :
- Mardi Footing 12 km / 60 min / 400 m (cohérent : 12 km à 5:00 min/km = 60 min) ✅
- Mercredi Renfo 0 km / 45-50 min / 0 m ✅
- Jeudi Footing 14 km / 75 min / 700 m (cohérent : 14 km à ~5:21 = 75 min) ✅
- Samedi SL 24 km / 3h30 / 1700 m (cohérent : 24 km en 3h30 = 8h45 power hiking, OK pour trail) ✅
- Dimanche Footing 20 km / 1h45 / 200 m (cohérent : 20 km en 105 min = 5:15 min/km) ✅

→ **Plan 1 mérite un patch identique** à `patch-rich-PLAN2-S1-realign.mjs`.

---

## Q6 — Audit code antérieur

### Bug `planUtils.ts:121-125` — `maxWeeklyElevation = Math.min(raceElevation, 3500)` pour Expert

**CONFIRMÉ.** Pour Rich (Expert, raceElevation=12000) :
- `maxWeeklyElevation = Math.min(12000, 3500) = 3500m` (cap dur)
- Vecteur D+ généré par le code buggué : `[1500, 1667, 1833, 2000, 2167, 2333, 2500, 2667, 2833, 3000, 3167, 3333, 3500]`
- Pic D+ jamais > 3500m, soit **29% de la course (12000m)**.
- Doctrine Master Balducci basse = 48% race D+ = **5800m** (notre cible patchée).

→ **Bug confirmé**. Le fix devrait remonter le cap Expert à au moins `raceElevation * 0.5` (soit 6000m pour Rich) ou `Math.min(raceElevation, 6000)`. Caps actuels (800/1500/2500/3500) sont trop bas pour des coureurs Expert préparant un trail vertical.

### Bug `planUtils.ts:134` — `maxStart = Math.min(1500, maxWeeklyElevation * 0.60)`

**CONFIRMÉ.** Pour Rich :
- `maxStart = Math.min(1500, 3500*0.60=2100) = 1500m`
- `rawStart = Math.min(currentWeeklyElevation=3000, maxStart=1500) = 1500m`
- `startElevation = 1500m` → **régression de -50%** vs le 3000m réel déclaré.

→ **Bug confirmé**. Le `Math.min(1500, …)` est un cap absolu qui **écrase tout `currentWeeklyElevation` > 1500m**. Doctrine `feedback_input_client_obligatoire` : on ne baisse jamais sous le volume actuel. Le fix devrait être :
```ts
const maxStart = Math.round(maxWeeklyElevation * 0.60); // supprimer le cap absolu 1500
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
  ? currentWeeklyElevation   // pas de Math.min: input client est obligatoire
  : Math.min(defaultStart, maxStart);
```

### Audit code globalement

- `calculateWeekTargetElevation` n'est pas appelé directement par `geminiService` (vérifié par `grep`). Mais le code de **simulation** suggère qu'il l'était (ou que la même logique existait dans `geminiService` — confirmé par `geminiService.ts.BACKUP-D2:2009`).
- La fonction active de calcul du `weeklyElevationTarget` se trouve dans `geminiService.ts` (non lu en entier ici). Vérification : `grep "weeklyElevationTarget" src/services/geminiService.ts` → trouvée L2818, dans `calculatePeriodizationPlan`. À auditer pour s'assurer que le fix porte au bon endroit.

→ Le fix doit s'appliquer **à la fois** dans `planUtils.ts` (pour les tests unitaires) et dans `geminiService.ts` (pour la production). Sinon le bug reste actif en prod.

---

## Risques détectés

1. ⚠️ **Plan 1 S1 sessions incohérentes** (4/5 sessions ont distance/durée/mainSet désynchronisés). Rich va voir cela. Risque : confusion, perte de confiance.
2. ⚠️ **Plan 2 message mentionne "12 000 m"** alors que `trailDetails.elevation=11000m` (input historique avril). Risque : si Rich relit ses données questionnaire, divergence visible.
3. ⚠️ **Allures Plan 1 ≠ Plan 2** (decalage 1-2s sur toutes les paces). Décision Romane mais à surveiller — Rich peut s'interroger.
4. ⚠️ **`feasibility.recommendation` présent Plan 1 / absent Plan 2** : asymétrie schéma. L'UI doit gérer la valeur absente sans crash.
5. ⚠️ **`targetTime` présent Plan 2 ("Finisher") / absent Plan 1** : asymétrie, peut affecter certains affichages conditionnels UI.
6. ⚠️ **Si Rich clique "Générer plan complet"** : `enforceWeekConstraints` peut **scaler** ou **retyper** les sessions S1 (notamment Plan 1 incohérent). Risque modéré.
7. ⚠️ **`validateAndCorrectPlan` Layer 3** peut DÉCIDER de régénérer S1 si jugée invalide via Gemini (pour Plan 1 incohérent surtout). Risque modéré.
8. 🔴 **Bug `planUtils.ts:121-125` toujours en code actif** → tout nouveau plan Expert avec raceElevation > 3500m sera capé à 3500m. Aucune protection.
9. 🔴 **Bug `planUtils.ts:134` toujours en code actif** → tout nouveau plan dont `currentWeeklyElevation > 1500m` sera écrasé à 1500m. Régression silencieuse.

---

## Recommandations

### URGENT (avant que Rich clique "Générer plan complet")

1. **Créer `patch-rich-PLAN1-S1-realign.mjs`** — calqué sur `patch-rich-PLAN2-S1-realign.mjs`. Corriger les sessions S1 Plan 1 :
   - Mardi 12 km / 60 min / 400 m + mainSet aligné
   - Jeudi 14 km / 75 min / 700 m + mainSet aligné
   - Samedi (Récupération → Footing) 20 km / 1h45 / 200 m + mainSet aligné (PAS "Récupération" 20 km en 45 min impossible)
   - Dimanche SL 24 km / 3h30 / 1700 m + mainSet aligné
   - Total reste 70 km / 3000 m D+

### IMPORTANT (cohérence Plan 2)

2. **Décision Romane** : Plan 2 messages mentionnent "12 000 m D+" mais questionnaireSnapshot dit "11 000 m". Choisir :
   - Option A : garder "12 000" (situation Rich aujourd'hui, plus pertinent)
   - Option B : restaurer "11 000" (respect input questionnaire historique)
   - Option C : mettre "~11-12 000 m" (compromis honnête)

### CODE FIX (avant tout autre plan Expert/trail vertical)

3. **Fixer `planUtils.ts:121-125`** :
   ```ts
   const maxWeeklyElevation =
     isDeb ? Math.min(raceElevation, 800) :
     isInter ? Math.min(raceElevation, 2500) :    // 1500 → 2500
     isConf ? Math.min(raceElevation, 4500) :    // 2500 → 4500
     Math.min(raceElevation, 6000);              // 3500 → 6000 (Master Expert)
   ```
   ou mieux : `Math.min(raceElevation * 0.5, plafond)` pour cap proportionnel à la course.

4. **Fixer `planUtils.ts:134-139`** :
   ```ts
   const maxStart = Math.round(maxWeeklyElevation * 0.60);  // supprimer 1500
   const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
     ? currentWeeklyElevation                                  // input client obligatoire
     : Math.min(defaultStart, maxStart);
   const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));
   ```

5. **Trouver et corriger le code miroir dans `geminiService.ts`** (la même logique D+ est dupliquée — cf. `geminiService.ts.BACKUP-D2:2009-2024`). Le fix doit être appliqué aux deux endroits, sinon la prod reste buggée.

### MINEUR (cohérence schéma)

6. **Aligner schéma feasibility** : soit ajouter `feasibility.recommendation` sur Plan 2, soit supprimer sur Plan 1. Préférer ajouter sur Plan 2 (info utile).
7. **Vérifier l'UI** : que `targetTime` undefined sur Plan 1 ne casse pas l'affichage (carte 5 "objectif chrono" notamment).

### MONITORING (post-déploiement)

8. **Snapshot post-régénération** : si Rich clique "Générer plan complet", refaire un audit immédiatement pour vérifier que les vecteurs et S1 n'ont pas été altérés par `enforceWeekConstraints` / Layer 3.
9. **Surveiller les autres plans Expert/trail vertical déjà créés** : auditer batch tous les plans `level=Expert` ET `trailDetails.elevation > 3500` pour identifier d'autres victimes silencieuses des 2 bugs.

---

## Annexe — Fichiers d'audit générés

- `/Users/romanemarino/Coach-Running-IA/challenge-plan1.json` (snapshot Plan 1 post-patches)
- `/Users/romanemarino/Coach-Running-IA/challenge-plan2.json` (snapshot Plan 2 post-patches)
- `/Users/romanemarino/Coach-Running-IA/rich-plan2-current.json` (idem)
- `/Users/romanemarino/Coach-Running-IA/rich-current-state.json` (Plan 1 état actuel formaté)
- `/Users/romanemarino/Coach-Running-IA/challenge-full-audit.mjs` (script audit complet)
- `/Users/romanemarino/Coach-Running-IA/challenge-compare-s1.mjs` (script comparaison S1)
- `/Users/romanemarino/Coach-Running-IA/challenge-final-checks.mjs` (script vérifications top-level)
- `/Users/romanemarino/Coach-Running-IA/challenge-simulate-bug.mjs` (script reproduction bugs planUtils)
- `/Users/romanemarino/Coach-Running-IA/challenge-investigate-poids.mjs` (script localisation "poids")
