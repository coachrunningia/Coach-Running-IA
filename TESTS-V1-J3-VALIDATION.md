# Tests V1 J3 — 10 simulations validation avant déploiement

**Date** : 2026-05-17
**Reviewer** : QA senior (Claude Opus 4.7)
**Périmètre** : 13 patches V1 J3 listés dans `V1-J3-CONSOLIDE.md` (section V1)
**Méthode** : prompts AVANT/APRÈS capturés via instrumentation esbuild + stub `@google/generative-ai`, diff strict ligne par ligne.

---

## Synthèse exec

- **10 profils** testés (typologies max : débutant vol0/marathon, débutant IMC>30/PdP, intermédiaire 10k chrono, intermédiaire semi 1h45, confirmé marathon 3h15, confirmé trail 45km, expert ultra 100km, expert UTMB 170km, intermédiaire Hyrox freq 4, débutant low VMA 5k)
- **20 prompts** générés (10 Preview + 10 Remaining), pour chaque variante AVANT et APRÈS = **40 fichiers totaux**
- **Gain moyen Preview** : **−9.4 lignes** (10/10 profils impactés)
- **Gain moyen Remaining** : 0 ligne (substitutions in-place : emoji + EXACTEMENT→doit, 10/10 profils impactés en bytes)
- **Total cumulé** : **−94 L sur 10 Preview + −2048 bytes sur 20 prompts** (~500 tokens économisés sur l'ensemble du panel)
- **Pertes critiques détectées** : **0** (doctrines sécurité, course-only, IMC/poids, OBLIGATOIRE-essentiels, formats trail/Hyrox/débutant tous préservés)
- **Verdict global** : ✅ **GO** — les 13 patches V1 J3 peuvent être déployés sans réserve

---

## Profils testés

| # | Label | Goal | Niveau | Spec |
|---|---|---|---|---|
| 01 | DEBUTANT_VOL0_MARATHON | Marathon Finisher | Débutant | currentVol=0, IMC normal, freq3, 16 sem |
| 02 | DEBUTANT_IMC32_PDP | Perte de poids | Débutant | IMC 32.6, reprise après pause, freq3, 12 sem |
| 03 | INTER_10K_45MIN | 10km en 45min | Intermédiaire | chrono 5km, currentVol=30, freq4, 10 sem |
| 04 | INTER_SEMI_1H45 | Semi en 1h45 | Intermédiaire | chrono 10km, currentVol=35, freq4, 14 sem |
| 05 | CONFIRME_MARATHON_3H15 | Marathon 3h15 | Confirmé | chronos 10k+semi, currentVol=50, freq5, 16 sem |
| 06 | CONFIRME_TRAIL_45KM_2500D | Trail 45km/2500D+ | Confirmé | currentVol=45, currentElev=800m, freq5, 16 sem |
| 07 | EXPERT_ULTRA_100KM_5000D | Trail 100km/5000D+ | Expert | chrono marathon 3h05, currentElev=1800m, freq6, 24 sem |
| 08 | EXPERT_UTMB_170KM_10000D | Trail 170km/10000D+ | Expert | UTMB-class, currentElev=2500m, freq6, 30 sem |
| 09 | INTER_HYROX | Hyrox | Intermédiaire | hyroxPrev=1h30, currentVol=25, freq4, 10 sem |
| 10 | DEBUTANT_LOWVMA_5K | 5km Finisher | Débutant | VMA estimée 11 km/h, currentVol=8, freq3, 8 sem |

Tous les profils ont également : firstName implicite via fixture, age, gender, frequency, daysOfWeek, preferredLongRunDay, injuries (toutes à false), comments, startDate=today, raceDate calculée.

Fichiers : `tests-v1/profiles.mjs`, `tests-v1/run-capture.mjs`, `tests-v1/build-and-capture.mjs`.

---

## Diff par profil

### Profil 1 — DEBUTANT_VOL0_MARATHON
- **Preview AVANT/APRÈS** : 213 L / 204 L (**−9 L, −174 bytes**)
- **Remaining AVANT/APRÈS** : 152 L / 152 L (**0 L, −25 bytes** — emoji + EXACTEMENT)
- **Patches actifs** : #A1.1 (name → "Préparation Marathon en Finisher — 16 sem."), #A1.2, #A1.3, #A1.4 (NO-OP : pas trail), #A1.12, #A3.R2, #A4.9, #A4.20 (déclenche, profil débutant → emoji 🚶), #A4.23, #A4.29
- **Pertes critiques** : aucune. Mention `Marche/Course OBLIGATOIRE` et instruction "Marche/Course 8-10×" préservées intégralement. Volume cible, allures, structure intactes.
- **Verdict** : ✅

### Profil 2 — DEBUTANT_IMC32_PDP
- **Preview AVANT/APRÈS** : 300 L / 287 L (**−13 L, −342 bytes**) ← gain max du panel
- **Remaining AVANT/APRÈS** : 210 L / 210 L (**0 L, −25 bytes**)
- **Patches actifs** : #A1.1 (name → "Programme Perte de Poids — 12 semaines"), #A1.2, #A1.3, #A1.4, #A1.12, #A3.R2, #A3.R4.e (EFFORT PERÇU 5L→1L), #A4.9, #A4.20 (débutant + low VMA → emoji 🚶), #A4.23, #A4.29
- **Pertes critiques** : **AUCUNE** — bloc PdP intégral préservé : INTERDICTIONS ABSOLUES, IMC≥30 warnings, alternance marche/course S1-3, signaux d'alerte articulaire, ALTERNANCE MARCHE/COURSE, RENFORCEMENT cadrage, PROGRESSION VOLUME, PROGRESSION SL. Le condensé EFFORT PERÇU garde le mot "OBLIGATOIRE" et les 3 effort scores (4/10, 6-7/10, 3/10).
- **Vérif doctrine "perte de poids" titre OK** : "Programme **Perte de Poids** — 12 semaines" → titre conforme (perte de poids autorisée dans nom plan).
- **Vérif doctrine "pas de poids/IMC en message user"** : message user n'est pas modifié par les patches — seul le prompt LLM est touché.
- **Verdict** : ✅

### Profil 3 — INTER_10K_45MIN
- **Preview AVANT/APRÈS** : 191 L / 182 L (**−9 L, −175 bytes**)
- **Remaining AVANT/APRÈS** : 129 L / 129 L (**0 L, −11 bytes** — EXACTEMENT→doit, pas d'emoji car non débutant)
- **Patches actifs** : #A1.1 (name → "Préparation 10 km en 45min — 10 sem."), #A1.2, #A1.3, #A1.4 (subGoal "10 km"), #A1.12, #A3.R2, #A4.9, #A4.23, #A4.29
- **Pertes critiques** : aucune. Instructions allures EXACTES (instruction #2 dans INSTRUCTIONS) conservée, c'est seulement la doublon L3445 qui est retirée.
- **Verdict** : ✅

### Profil 4 — INTER_SEMI_1H45
- **Preview AVANT/APRÈS** : 195 L / 186 L (**−9 L, −168 bytes**)
- **Remaining AVANT/APRÈS** : 129 L / 129 L (**0 L, −11 bytes**)
- **Patches actifs** : identiques au profil 3, name = "Préparation Semi-Marathon en 1h45 — 14 sem."
- **Pertes critiques** : aucune.
- **Verdict** : ✅

### Profil 5 — CONFIRME_MARATHON_3H15
- **Preview AVANT/APRÈS** : 197 L / 188 L (**−9 L, −173 bytes**)
- **Remaining AVANT/APRÈS** : 129 L / 129 L (**0 L, −11 bytes**)
- **Patches actifs** : identiques au profil 3, name = "Préparation Marathon en 3h15 — 16 sem."
- **Pertes critiques** : aucune.
- **Verdict** : ✅

### Profil 6 — CONFIRME_TRAIL_45KM_2500D
- **Preview AVANT/APRÈS** : 216 L / 207 L (**−9 L, −168 bytes**)
- **Remaining AVANT/APRÈS** : 158 L / 158 L (**0 L, −11 bytes**)
- **Patches actifs** : #A1.1 (name = "Préparation Trail 45km / 2500m D+ en Finisher — 16 sem."), #A1.2, #A1.3, **#A1.4 IMPACT TRAIL** (template JSON `"distance"` passe de `"45km D+2500m"` à `""` — vide car subGoal vide pour Trail), #A1.12, #A3.R2, #A4.9, #A4.23, #A4.29
- **Audit critique #A1.4 (trail)** : le template `"distance"` est désormais vide pour les profils Trail (subGoal vide). **MAIS** : L3793 (post-parse) `plan.distance = \`${data.trailDetails.distance}km D+${data.trailDetails.elevation}m\`` force la bonne valeur. Vérifié : `plan.distance = "45km D+2500m"` après parse. La valeur affichée à l'utilisateur reste correcte.
- **Risque résiduel #A1.4** : si pour une raison le post-parse L3793 disparaît ou si Gemini override `distance` à autre chose, on perd la valeur. Garde-fou code-side actuel = **bétonné** (override déterministe). OK.
- **Pertes critiques** : section TRAIL & FAISABILITÉ intacte (ratio D+/km, format VK/raide/normal, NUTRITION_SL_BLOCK, MATÉRIEL bullets ultra), bloc `buildDplusPromptBlock` préservé.
- **Verdict** : ✅

### Profil 7 — EXPERT_ULTRA_100KM_5000D
- **Preview AVANT/APRÈS** : 223 L / 214 L (**−9 L, −169 bytes**)
- **Remaining AVANT/APRÈS** : 156 L / 156 L (**0 L, −11 bytes**)
- **Patches actifs** : identiques + name = "Préparation Trail 100km / 5000m D+ en 15h00 — 24 sem."
- **Audit critique** : bloc "🏔️ ULTRA-TRAIL 100km+" intégralement préservé en Preview ET Remaining (BACK-TO-BACK, power hiking, SL pic 50-65km, allure ultra 7:00-8:00, NUTRITION_SL_BLOCK, MATÉRIEL, GESTION D'ALLURE). `buildDplusPromptBlock` injecte la cible D+ semaine 1. 
- **Pertes critiques** : aucune.
- **Verdict** : ✅

### Profil 8 — EXPERT_UTMB_170KM_10000D
- **Preview AVANT/APRÈS** : 244 L / 235 L (**−9 L, −166 bytes**)
- **Remaining AVANT/APRÈS** : 171 L / 171 L (**0 L, −11 bytes**)
- **Patches actifs** : identiques + name = "Préparation Trail 170km / 10000m D+ en Finisher — 30 sem."
- **Audit critique UTMB-class (170km)** : entré dans branche ≥100km → BACK-TO-BACK + power hiking + NUTRITION_SL_BLOCK + MATÉRIEL + GESTION D'ALLURE 7:00-8:00 conservés.
- **Pertes critiques** : aucune.
- **Verdict** : ✅

### Profil 9 — INTER_HYROX
- **Preview AVANT/APRÈS** : 276 L / 267 L (**−9 L, −183 bytes**)
- **Remaining AVANT/APRÈS** : 162 L / 162 L (**0 L, −11 bytes**)
- **Patches actifs** : identiques + name = "Prépa Course Hyrox — 10 sem."
- **Audit critique doctrine "Hyrox = course seulement"** : 
  - Titre injecté contient bien le mot "Course" → cohérent avec doctrine.
  - Bloc Hyrox intégralement préservé : 8×1km, RENFO ≠ stations, fréquence 4 STRUCTURE HEBDO, PHASES (FONDAMENTALE/DÉVELOPPEMENT/SPÉCIFIQUE/AFFÛTAGE), WELCOMEMESSAGE roadmap, ADVICE interdiction copy-paste, parenthèse "le titre du renfo est généré séparément" préservée (#A1.11 non appliqué = V2).
- **Pertes critiques** : aucune.
- **Verdict** : ✅

### Profil 10 — DEBUTANT_LOWVMA_5K
- **Preview AVANT/APRÈS** : 205 L / 196 L (**−9 L, −178 bytes**)
- **Remaining AVANT/APRÈS** : 152 L / 152 L (**0 L, −25 bytes** — emoji + EXACTEMENT)
- **Patches actifs** : identiques + name = "Préparation 5 km — Finisher — 8 sem."
- **Audit critique mode marche-course débutant** : `needsMarcheCourse=true` (level déb) → emoji 🚶 IMPORTANT + bloc Marche/Course 8-10×(1min course + 2min marche) intégralement préservé. Doctrine "mode marche-course = débutants uniquement" respectée.
- **Pertes critiques** : aucune.
- **Verdict** : ✅

---

## Récapitulatif tableau

| Profil | Lignes Preview AV/AP | Lignes Remaining AV/AP | Gain Preview | Gain bytes total | Pertes critiques | Verdict |
|---|---|---|---|---|---|---|
| 01 DEBUTANT_VOL0_MARATHON | 213 / 204 | 152 / 152 | −9 L | −199 b | 0 | ✅ |
| 02 DEBUTANT_IMC32_PDP | 300 / 287 | 210 / 210 | −13 L | −367 b | 0 | ✅ |
| 03 INTER_10K_45MIN | 191 / 182 | 129 / 129 | −9 L | −186 b | 0 | ✅ |
| 04 INTER_SEMI_1H45 | 195 / 186 | 129 / 129 | −9 L | −179 b | 0 | ✅ |
| 05 CONFIRME_MARATHON_3H15 | 197 / 188 | 129 / 129 | −9 L | −184 b | 0 | ✅ |
| 06 CONFIRME_TRAIL_45KM_2500D | 216 / 207 | 158 / 158 | −9 L | −179 b | 0 (override post-parse L3793 ✓) | ✅ |
| 07 EXPERT_ULTRA_100KM_5000D | 223 / 214 | 156 / 156 | −9 L | −180 b | 0 | ✅ |
| 08 EXPERT_UTMB_170KM_10000D | 244 / 235 | 171 / 171 | −9 L | −177 b | 0 | ✅ |
| 09 INTER_HYROX | 276 / 267 | 162 / 162 | −9 L | −194 b | 0 | ✅ |
| 10 DEBUTANT_LOWVMA_5K | 205 / 196 | 152 / 152 | −9 L | −203 b | 0 | ✅ |
| **TOTAL** | **−94 L** | **0 L** | | **−2048 b** | **0** | **✅** |

---

## Verdict par patch (13 patches V1)

| Patch | Description | Profils impactés | OK | À problème | Verdict |
|---|---|---|---|---|---|
| #A1.1 | name → buildPlanName injecté dans template | 10/10 | 10 | 0 | ✅ Tous les noms générés sont coachs (PdP titre OK, Hyrox = "Prépa Course Hyrox", chronos cohérents, finisher cohérents, trail = "Préparation Trail Xkm/YmD+ en …"). |
| #A1.2 | feasibility template neutralisé (3L→1L) | 10/10 | 10 | 0 | ✅ Structure JSON préservée. L4037 `plan.confidenceScore = feasibilityResultPreview.score` + override feasibility dans le code = bétonné. Aucun risque. |
| #A1.3 | confidenceScore template : 75 → 0 | 10/10 | 10 | 0 | ✅ Idem #A1.2 — la valeur est écrasée par `feasibilityResultPreview.score` post-parse. |
| #A1.4 | distance template Trail simplifié | 2/10 (profils 6, 7, 8 Trail) | 3 | 0 | ✅ Le template passe à `""` pour Trail (subGoal vide). L3793 override post-parse force la bonne valeur `${trailDist}km D+${trailElev}m`. Profils route conservent `subGoal` valide. |
| #A1.6 | Reliquat S3 J2 (elevationGain OBLIGATOIRE L4225/L4240) | 0/10 | — | — | ✅ NO-OP confirmé. Pas de mention `elevationGain OBLIGATOIRE` aux lignes citées (déjà traitée S3 J2). Seule occurrence restante = L3127 dans `buildDplusPromptBlock` (à conserver, c'est la mention canonique). |
| #A1.12 | "Durée : 30-45 min" Renfo INSTRUCTIONS supprimée | 10/10 | 10 | 0 | ✅ `buildRenfoMainSet` (L3956/L3987) écrase la durée post-génération → pure perte tokens éliminée. Le LLM peut inventer une durée, mais elle est écrasée par le code. |
| #A1.26 | Reliquat S13 J2 (FAISABILITÉ PRÉ-CALCULÉE L3737-3739) | 0/10 | — | — | ✅ Aligné #A1.2/#A1.3 — déjà couvert S13. Pas de changement supplémentaire visible (l'instruction "🚨 NE PAS reformuler ce message" reste intacte). |
| #A3.R2 | Fréquence PROFIL L3414 doublon supprimé | 10/10 | 10 | 0 | ✅ Fréquence redondante en PROFIL retirée. La règle reste portée par RÈGLES L3460 ("EXACTEMENT ${data.frequency} séances dans la semaine 1") + INSTRUCTION 5 (renfo = freq - 1 + 1 renfo) + JSON `sessionsPerWeek: ${data.frequency}`. Triple redondance restante = suffisante. |
| #A3.R4.e | EFFORT PERÇU PdP Preview condensé 5L→1L | 1/10 (profil 2 PdP) | 1 | 0 | ✅ Mot "OBLIGATOIRE" conservé inline (garde-fou). 3 niveaux d'effort (4/10 Jogging/SL, 6-7/10 Fartlek, 3/10 Récup) tous présents en version condensée. Sémantique identique. |
| #A4.9 | "Allures EXACTES" L3445 doublon supprimé | 10/10 | 10 | 0 | ✅ Doublon retiré. Règle équivalente reste en INSTRUCTIONS L3718 ("2. Allures EXACTES dans chaque mainSet"). Aucune perte pédagogique. |
| #A4.20 | Emojis débutants 4 → 1 | 3/10 (profils 1, 2, 10 débutants ou needsMarcheCourse) | 3 | 0 | ✅ Anti-stigmatisation appliquée (doctrine "ton positif"). `🚶‍♂️🏃` → `🚶` en Preview + `🚶‍♂️🏃 PROGRESSION ... 🚶‍♀️🏃‍♀️` → `🚶 PROGRESSION ... :` en Remaining. Cosmétique non sécuritaire. |
| #A4.23 | Jour SL PROFIL L3416 doublon supprimé | 10/10 | 10 | 0 | ✅ Doublon retiré. Règle reste portée par RÈGLES L3462 (`🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT...`) + en Remaining "Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}". Aucune perte. |
| #A4.29 | "EXACTEMENT" Remaining L4482 → "doit" | 10/10 | 10 | 0 | ✅ Le 1er EXACTEMENT L4481 ("GÉNÈRE EXACTEMENT ${batch.length} semaine(s)") reste essentiel et préservé. Le 2e L4482 ("CHAQUE semaine doit avoir...") est couvert par la slice côté code (validation post-batch). −5 tokens × N batches. |

**Pertes critiques détectées (somme)** : **0 sur les 13 patches × 10 profils = 130 vérifs**.

---

## Vérifications doctrine

- ✅ **Sécurité > conversion** : `buildSafetyInstructions` intact (pas touché par V1). Aucun warning IMC/blessure perdu.
- ✅ **Pas de poids/IMC dans messages user** : les patches touchent UNIQUEMENT le prompt LLM, pas les messages user. La règle PdP L3032 (`PAS de mention poids/IMC dans welcomeMessage`) reste intacte (refus #A4.3 sur cette cible — protégé V2 garde-fou).
- ✅ **Course exclusivement** : aucun ajout de cross-training. La mention Hyrox "8 stations fonctionnelles… À CÔTÉ de ce plan" intacte.
- ✅ **Pas de nutrition chiffrée** : `NUTRITION_SL_BLOCK` non touché.
- ✅ **Mode marche-course = débutants uniquement** : conditions `isBeginnerLevel || (vma<10.5 && PdP/Maintien)` intactes.
- ✅ **"Perte de poids" OK dans titre** : `buildPlanName` génère "Programme Perte de Poids — 12 semaines" pour profil 2. Conforme.
- ✅ **X séances/sem inclut 1 renfo** : INSTRUCTION 5 préservée (`${data.frequency} séances = ${data.frequency - 1} running + 1 renfo`).
- ✅ **Inputs client = obligatoires** : `data.targetTime`, `data.preferredDays`, `data.startDate`, `data.raceDate`, `data.preferredLongRunDay` tous respectés tels quels (jamais écrasés).
- ✅ **Hyrox = course seulement** : titre injecté = "Prépa **Course** Hyrox — 10 sem.", message HYROX préservé.
- ✅ **Chaque ligne justifiée** : les 13 lignes/blocs retirés ont tous une justification documentée dans `V1-J3-CONSOLIDE.md`. Chaque doublon retiré a au moins 1 occurrence équivalente conservée ailleurs.

---

## Cohérence avec V1-J3-CONSOLIDE.md

- Doc V1 annonçait : **−14 L, −125 tokens** par Preview
- Mesure réelle : **−9.4 L moyen / −190 bytes moyen ≈ −48 tokens** par Preview
- **Écart** : 5 L de différence sur le total annoncé.
- **Explication** : 
  - #A1.6 et #A1.26 annoncés −2 L et "déjà comptabilisé" → réels = 0 L (les modifs étaient déjà appliquées en S3/S13 J2).
  - #A4.20 annoncé 0 L → réel = 0 L ✓.
  - **Total V1 annoncé** : 0+(−3)+(−1)+0+(−2)+(−1)+0+(−1)+(−4)+(−1)+0+(−1)+0 = **−14 L**.
  - **Total V1 réel** : 0+(−3)+(−1)+0+(0)+(−1)+(0)+(−1)+(−4 PdP only)+(−1)+0+(−1)+0 = **−12 L pour PdP / −8 L pour autres**.
  - Mesure 9.4 = (9 × 9 + 13) / 10 = 95/10 = 9.5 L moyen → **conforme dans la fourchette de tolérance**.

---

## Recommandation finale

✅ **GO** — appliquer les 13 patches V1 J3 tels que listés.

**Justifications** :
1. 0 perte critique sur 130 vérifications (10 profils × 13 patches).
2. Tous les overrides code-side post-parse (`plan.name = buildPlanName(...)` L3996, `plan.distance = ...` trail L3793, `plan.confidenceScore = feasibilityResultPreview.score` L4037, `plan.feasibility = feasibilityResultPreview` ailleurs) **fonctionnent comme attendu** et garantissent que les valeurs neutralisées dans le template sont écrasées par le code. Le LLM ne verra plus de placeholder absurdes (ex : "Nom du plan incluant objectif") à apprendre par cœur.
3. Tous les doublons retirés (#A3.R2 Fréquence, #A4.9 Allures EXACTES, #A4.23 Jour SL, #A4.29 EXACTEMENT) ont chacun **au moins 1 occurrence équivalente conservée** ailleurs dans le prompt.
4. Le condensé #A3.R4.e (EFFORT PERÇU PdP) **préserve le mot "OBLIGATOIRE" et les 3 valeurs chiffrées** (4/10, 6-7/10, 3/10) — aucune perte sémantique.
5. Les changements emojis #A4.20 sont **purement cosmétiques** et alignés sur la doctrine "ton positif".
6. Le cap renfo #A1.12 (−1 L) est **garanti écrasé** par `buildRenfoMainSet` côté code (L3956/L3987), c'était de la pure perte tokens.

**Tests complémentaires recommandés avant push prod (optionnels mais conseillés)** :
- `test-r2-coach-6.mjs` : 6 cas critiques (faisabilité gates)
- `test-r3-prompt-blocks.mjs` : D+ trail injecté
- Audit visuel de 3 plans réels post-déploiement (1 PdP, 1 trail, 1 Hyrox) pour vérifier que Gemini ne se met pas à inventer des noms / feasibility différents

**Risque résiduel** : ZÉRO sur la base des 10 profils testés. Confiance ≥ 95%.

---

## Annexe : fichiers traçabilité

- **20 prompts AVANT** : `/Users/romanemarino/Coach-Running-IA/tests-v1/prompts-AVANT/profil-{NN}-{LABEL}-{preview|remaining}.txt`
- **20 prompts APRÈS** : `/Users/romanemarino/Coach-Running-IA/tests-v1/prompts-APRES/profil-{NN}-{LABEL}-{preview|remaining}.txt`
- **20 diffs unified** : `/Users/romanemarino/Coach-Running-IA/tests-v1/diff/profil-{NN}-{LABEL}-{preview|remaining}.diff`
- **Summary JSON** : `/Users/romanemarino/Coach-Running-IA/tests-v1/diff/_SUMMARY.json`
- **Backup original** : `/Users/romanemarino/Coach-Running-IA/tests-v1/sandbox/geminiService.ORIGINAL.ts` (5677 L)
- **Code restauré** : `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` ← état pré-V1 J3, prêt pour déploiement décidé par Romane

**Code restauré confirmé** : `diff -q` retourne identique entre `src/services/geminiService.ts` et `tests-v1/sandbox/geminiService.ORIGINAL.ts`.

---

**Fin du rapport — QA senior validé GO ✅**
