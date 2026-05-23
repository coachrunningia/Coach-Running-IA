# Backlog Fix Code — Identifié sessions 20-21/05/2026

État au 21/05 ~00h30. Liste des bugs/améliorations restants à coder après une journée monumentale (15 commits déployés, 10 patches live Firestore, 439/439 tests verts).

---

## 🚨 P0 — Critiques (impact user direct)

### P0-1 — `handleRecalculateVMA` ne sauvegarde pas `feasibility`
**Fichier** : `src/App.tsx:1216-1245` (zone `handleRecalculateVMA`)

**Bug** : le code calcule bien `newFeasibility` (lignes 1216-1236), mais l'utilise UNIQUEMENT dans un toast. **Jamais** `fullPlan.feasibility = newFeasibility` avant `savePlan(fullPlan)`.

**Conséquence** : quand un user recalcule sa VMA via l'UI, `paces.*` ET `weeks[].sessions[].targetPace` se mettent bien à jour, MAIS `feasibility.message` stocké en Firestore reste obsolète (cite l'ancienne VMA).

**Cas réel** : Julian Jobert — VMA 11.8 → 12.3, paces OK, MAIS message disait encore "VMA 11.8 → estimé 1h03/recommande 1h06" → patché live manuellement ce soir.

**Fix** : ajouter `fullPlan.feasibility = newFeasibility;` juste avant `await savePlan(fullPlan);`.

**Tests** : créer test E2E qui vérifie qu'après `handleRecalculateVMA`, `feasibility.message` cite la nouvelle VMA.

**Effort** : 5 min code + 15 min tests.

---

### P0-2 — Doublon Strava `activityId` matching séances
**Fichier** : `src/services/stravaAnalysisService.ts` ou logique `matchSessionToActivity`

**Bug** : pour Julian, W1 S1 + W1 S2 pointent sur **le même `activityId` 18551969372**. Une seule vraie sortie Strava est comptée 2× dans le tracking RPE.

**Conséquence** : les stats user faussées (1 sortie réelle, 2 RPE attribués), affichage UI doublon.

**Fix** : ajouter unicité `activityId` par plan (si `activityId X` déjà assigné à séance Y, ne pas le matcher sur séance Z).

**Tests** : test unique sur la fonction matching.

**Effort** : 30 min code + tests.

---

### P0-3 — Fix 1 D+ Trail : branche secondaire %VMA potentiellement sans `effectiveDistanceKm`
**Fichier** : `src/services/feasibilityService.ts`

**Flag Coach 20 ans** : "Le bug '95% VMA' sur Bertrand (Trail 16km/1000D+ en 2h15) est probablement un bug d'affichage `pctVmaPercent` en amont du message IRRÉALISTE — chercher s'il existe une 2e branche de message (BON/AMBITIEUX) qui n'utilise pas `effectiveDistanceKm`."

**Conséquence** : 2 plans Trail (Bertrand, Cyril Berger) ont eu des messages décourageant à tort avec %VMA gonflé.

**Investigation** : tracer toutes les branches de message dans `feasibilityService.ts`. Vérifier que `pctVmaPercent` utilise toujours `effectiveDistanceKm = distance + D+/100` (convention ITRA).

**Effort** : 45 min investigation + fix + tests.

---

## ⚠️ P1 — Important

### P1-1 — Bug C : Post-récup smoothing ×1.15 étrangle Inter+ VMA basse
**Fichier** : `src/services/geminiService.ts:~2700`

**Bug** : le smoothing post-récup multiplie le volume par 1.15 entre semaines, ce qui plafonne Margaux à 18 km au lieu de 25 (pic Semi théorique).

**Conséquence** : Semi Inter freq=3 VMA<11 sont systématiquement sous-dimensionnés.

**Investigation requise** : la formule `×1.15` est-elle adaptable selon objectif/profil ? Faut-il `×1.18-1.20` pour Semi/Marathon Inter ?

**Effort** : 30 min investigation + 30 min fix + tests.

---

### P1-2 — Bug E : Expert phase fondamental trop longue + safety net L675 force EF
**Fichier** : `src/services/geminiService.ts:673-691` + `previewPrompt` L3985

**Bug** : floggyz 10K Expert VMA 17.5, 30 sem, S1 = **4 footings TOUS à 5:07/km** (même allure, zéro variété).

**Cause cumulée** :
1. Phase fondamental ratio fixe (~30% du plan) → 9 sem fondamental sur 30 sem Expert
2. Safety net code L673-691 force 100% EF en phase fondamental
3. Prompt L3985 dit "intensité dès S3 seulement"

**Conséquence** : Expert qui désapprend à courir vite, perte élasticité, syndrome essuie-glace.

**Fix** : pour Expert phase fondamental :
- 1 footing avec **6×20s accélérations** (technique, économie)
- 1 footing avec **strides 6-8×100m** en fin
- Pas 4 footings identiques

**Effort** : 1h refacto prompt + code + tests.

---

### P1-3 — Hard floor pic Trail (par distance)
**Fichier** : `src/services/geminiService.ts:~2658` (zone hard floors Semi/Marathon existants)

**Manque actuel** : seuls Semi (≥22) et Marathon (≥32) ont un hard floor pic. Trail pas couvert.

**Fix proposé Coach** : Trail court (<25 km) → pic ≥ 22 km, Trail long (25-45 km) → pic ≥ 32 km, Ultra (>45 km) → pic ≥ 40 km.

**Effort** : 20 min code + tests.

---

### P1-4 — Bloquer ou warning fort `frequency=2` Marathon
**Fichier** : `src/components/Questionnaire/*` ou validation upstream

**Bug** : freq=2 Marathon → physiologiquement intenable (1 SL + 1 séance qualité = pic ~16 km insuffisant pour 42 km).

**Fix** : soit bloquer freq=2 Marathon en amont du questionnaire, soit warning explicite "freq=2 pour Marathon = très risqué, recommande freq≥3".

**Effort** : 20 min UI/UX + tests.

---

### P1-5 — Bug 6 : Message "très chargée en volume" L1231 inversé
**Fichier** : `src/services/feasibilityService.ts:1231`

**Bug** : message déclenche si `frequency≤3 && planWeeks>16` sans regarder le volume effectif. Bertrand a 15 km/sem (5 km/séance) = absolument PAS chargé, mais message dit "très chargé".

**Fix** : conditionner sur `kmParSeance >= 10` ET reformuler "manquera de variété" au lieu de "très chargée en volume".

**Effort** : 10 min code + test.

---

### P1-6 — Bug 7 : Blessure structurelle vs ampoule (+4 sem auto-déclenché à tort)
**Fichier** : `src/services/feasibilityService.ts:349`

**Bug** : `hasInjury=true` ajoute +4 sem au minimum requis pour Débutants vol=0. Mais Lilian a déclaré "Ampoule récurrente" → ce n'est PAS une blessure musculo-squelettique.

**Fix** : whitelist regex `/tendinite|fasciite|fracture|déchirure|entorse|arthrose|hernie|lombaire|sciatique|genou|cheville|achille|tibial/i` pour appliquer le +4 sem. Ampoule, ongle noir, frottement → pas de +4.

**Effort** : 15 min code + tests.

---

### P1-7 — Cap `planWeeks` par objectif
**Fichier** : `src/services/geminiService.ts:3620`

**Bug** : actuellement `planDurationWeeks = Math.max(4, Math.min(30, diffWeeks))`. Pas de cap par distance → floggyz 30 sem pour 10K Finisher = trop.

**Fix** : `maxWeeksByGoal = { '5 km': 10, '10 km': 16, 'Semi-Marathon': 20, 'Marathon': 24 }`. Trail/Hyrox/PdP conservent 30.

**Effort** : 15 min code + tests.

---

## 📋 P2 — Quality of life

### P2-1 — Refacto doctrine TS-first complet
Migrer `REFERENTIEL-COACH.md` (Markdown narratif) vers `src/services/doctrine/*.ts` constantes typées. Déjà fait pour bibliothèque coach (Marathon/Semi/10K/5K patterns). Étendre aux autres règles (caps niveau, calibrage fréquence, etc.).

**Effort** : sprint dédié 4-6h.

---

### P2-2 — Validator faux positifs (sprint LLM-cleanup)
Le `validator` actuel a 7/10 faux positifs sur le mini-batch (cf. audit ce matin). À investiguer si garde-fou rule-based ou refonte.

**Effort** : 2h investigation + fix.

---

### P2-3 — UX message confirmation PB chrono format suspect
Bug Romane signalé : si chrono saisi contient `h` sur distance < marathon (ex "39h20" pour 10K) → modal soft de confirmation "Tu as saisi X, on a interprété Y, c'est bien ça ?". Pas un blocage, juste une question.

**Effort** : 1h composant React + tests.

---

## 🎁 Backlog opportunités stratégiques

### Test Pro vs Flash sur cœur produit
La discussion d'hier sur upgrade modèle preview (gemini-3-flash vs gemini-3-pro) n'a pas été tranchée. Si la qualité actuelle reste critiquée, le test A/B sur 3-5 profils témoins reste à faire.

---

## 📊 Stats journée 20-21/05

| Métrique | Valeur |
|---|---|
| Commits push main | **15** |
| Patches live Firestore | **10 plans** (Morgane, Louleroy, Lilian ×2, Margaux, Bertrand, floggyz, Thomas ×2 + delete, Julian) |
| Tests baseline | 377 → **439 verts** |
| Audits livrés | Cyril, Bertrand, 4 plans Semi, audit fin 3 plans, audit 11 plans, Julian |
| Sprints code | Sprint plancher, Trail libellé, Nutrition V2 (22 ajustements), P0a/b/c, P1a/d/f, Marche/Course routing |
| Doctrines mémoires actées | `feedback_courte_duree_charge_allegee` |
| 3 experts indépendants validés | Coach trail performance + Nutrition clinique + Trail elite terrain |

---

**Recommandation séquence demain matin** :
1. **P0-1** (handleRecalculateVMA save feasibility) — 20 min, impact immédiat tous les futurs recalculs VMA
2. **P0-2** (doublon Strava activityId) — 30 min, propre data
3. **P0-3** (D+ Trail branche secondaire) — investigation + fix, finit le sujet Trail
4. Selon temps : P1-6 (message inversé) + P1-7 (cap planWeeks) — 30 min cumulé

P1-1 (smoothing) + P1-2 (Expert) = sprints plus lourds, à planifier en bloc dédié.

Bonne nuit ! 🏃‍♀️
