# AUDIT POST-PREVIEW — rauroy@yahoo.fr

**Date audit** : 2026-05-18
**Auditeur** : Claude Code (lecture seule, zéro modif Firestore)
**Template** : `project_template_analyse_post_preview` — 6 dimensions

---

## ÉTAPE 1 — Identification client

Variantes testées : `rauroy@gmail.com`, `r.auroy@gmail.com`, `raoul.roy@gmail.com`, `raouroy@gmail.com`, `r.aury@gmail.com`, `rauroy@hotmail.com`, `rauroy@yahoo.fr` → **TROUVÉ**.

| Champ | Valeur |
|---|---|
| **Email** | `rauroy@yahoo.fr` |
| **UID** | `eSVsxhsqU2en9sbXbIAmL4xA72A3` |
| **Prénom** | Rich |
| **Plan ID** | `1775644846100` |
| **Plan name** | Préparation Trail 110km / 11000m D+ — Finisher — 19 sem. |
| **Inscription** | 2026-04-08 10:37:46 UTC |
| **Génération preview** | 2026-04-08 10:40:46 UTC (~3 min après inscription) |
| **Dernière connexion** | 2026-05-18 20:12:17 UTC (hier soir) |
| **isPremium** | **true** (depuis 2026-05-18 20:18:42 UTC — converti hier soir !) |
| **Stripe subscription** | `sub_1TYXc61WQbIX14t0sCyZpE4j` — **active** |
| **Stripe customer** | `cus_UXcrqr5sHACX62` |
| **isPreview** | **true** ❌ (alors qu'il est premium) |
| **fullPlanGenerated** | **false** ❌ (jamais déclenché ou échec silencieux) |
| **Email vérifié** | ❌ non |
| **Profil** | Homme, 54 ans, 68 kg, 174 cm, **BMI 22.5** (normal) |
| **Localisation** | Toulouse |
| **Niveau** | Expert (Performance) |
| **Goal** | Trail |
| **subGoal / cible** | 110 km / 11 000 m D+ — **Finisher** |
| **targetTime** | Finisher (pas de chrono) |
| **raceDate** | 2026-08-14 (J-88 au moment de la preview, J-88 au moment de l'audit) |
| **Frequency** | 5 séances/sem |
| **currentWeeklyVolume** | **60 km/sem** déclarés |
| **currentWeeklyElevation** | **3 000 m D+/sem** déclarés |
| **PB déclarés** | **Marathon 3h00** (4:16/km) |
| **VMA estimée** | 17.58 km/h (dérivée du marathon 3h00, via Riegel) |
| **Injuries** | aucune |
| **Generation errors** | 0 |
| **Email verification tokens** | 0 |

**Note conversion** : abonnement souscrit **18/05/2026 20:18:42**, soit 6 min après sa dernière connexion. C'est un client qui vient de payer hier soir. Pourtant le plan reste à `isPreview=true / fullPlanGenerated=false` → **anomalie : le plan complet n'a pas été régénéré post-conversion**.

---

## 1. ALLURE CIBLE — cohérence Finisher + PB

| Allure | Valeur affichée | Cohérence |
|---|---|---|
| efPace | 5:06 /km (67% VMA) | ✅ Daniels-OK pour EF |
| recoveryPace | 5:41 /km (60% VMA) | ✅ |
| eaPace | 4:26 /km | ✅ |
| seuilPace | 3:55 /km (~87% VMA) | ✅ |
| vmaPace | 3:25 /km | ✅ exact 17.58 km/h |
| allureSpecifiqueMarathon | 4:16 /km | ✅ = PB marathon 3h00 |
| allureSpecifique5k / 10k / Semi | 3:36 / 3:48 / 4:01 | ✅ |
| **Allure spécifique trail / ultra** | — | ⚠️ pas de `allureSpecifiqueTrail` ou `allureSpecifiqueUltra` — sur cet ultra c'est l'allure power-hike + EF qui compte |

**Analyse Finisher + PB marathon 3h00** :
- Règle A3 (Finisher + PB) : citer le PB dans welcomeMessage + caler allure trail sur `max(PB+5%, VMA-based)`.
- PB marathon 3h00 cohérent avec VMA 17.58 (typique pour Expert Performance).
- Pour un **ultra 110km / 11000m D+**, la cible "Finisher" est correcte (pas de chrono visé). L'allure de course attendue est ~6:30-8:00/km sur le plat + power-hiking en côte → pas calé dans les paces, mais le plan donne `7:00-8:00 min/km en côte` dans les sessions, ce qui est cohérent.

**Verdict** : ✅ **Allures techniques OK**, mais ⚠️ absence d'`allureSpecifiqueUltra` (déficit de spécificité dans le tableau paces). Pas un bug bloquant.

---

## 2. VOLUME HEBDO S1 + PIC + PROGRESSION

### A. Volume km — tableau complet `weeklyVolumes`

| Sem | Vol km | Phase | Δ vs prev |
|----|----|----|----|
| 1  | **51** | fondamental | — |
| 2  | 56 | fondamental | +10% |
| 3  | 62 | fondamental | +11% |
| 4  | 50 | **récup** | -19% |
| 5  | 62 | fondamental | +24% |
| 6  | 71 | dev | +15% |
| 7  | **82** | dev | +15% |
| 8  | 66 | **récup** | -20% |
| 9  | 82 | dev | +24% |
| 10 | 94 | dev | +15% |
| 11 | 94 | dev | 0% |
| 12 | 75 | **récup** | -20% |
| 13 | 94 | spécifique | +25% |
| 14 | 94 | spécifique | 0% |
| 15 | **99** ← pic | spécifique | +5% |
| 16 | 68 | affûtage | -31% |
| 17 | 62 | affûtage | -9% |
| 18 | 56 | affûtage | -10% |
| 19 | 50 | affûtage | -11% |

**Constats volume km** :
- **Volume S1 = 51 km vs declared 60 km → ratio 0.85** ❌ (le fix A1 "floor S1 = current" exige ≥ 0.95). Le plan baisse de 15 % le volume current sans justification (pas de blessure, premier ultra mais user expert avec base solide).
- Volume pic = **99 km/sem** pour un **ultra 110 km / 11 000 m D+**.
  - Référentiel ultra >100km (Expert) : pic 130-180 km/sem typique (UTMB OCC/CCC, Ultra-Trail world series).
  - **99 km/sem = 90% de la distance race en km**, ratio absolument insuffisant pour finisher sereinement un 110km avec 11000m D+ (cumul de fatigue, pas d'adaptation aux longs efforts).
- Sauts %/sem : max +25% (sem 8→9, sem 12→13). **> seuil ACSM 10-15 %** ❌. Plusieurs sauts à +24-25 % post-décharge — risque blessure.
- Semaines de décharge ✅ bien placées (4, 8, 12).
- Affûtage 4 sem (sem 16-19) ✅ progressif (-31/-9/-10/-11%) — OK.

### B. Volume D+ (trail) — `weeklyElevationTarget` absent

🚨 **`weeklyElevationTarget` ABSENT du `periodizationPlan`**. Aucune projection D+ semaine par semaine pour un ultra à 11 000 m D+.

**S1 D+ calculé via sessions** :
- Mardi footing : 225 m
- Mercredi renfo : 0 m
- Jeudi footing vallonné : 300 m
- Samedi SL : 975 m
- Dimanche récup : 0 m
- **Total S1 D+ = 1 500 m vs declared 3 000 m/sem → ratio 0.5** 🚨

Le user déclare 3000 m D+/sem actuels (3000 m chez un trailer Expert avec base 60 km/sem = profil "habitué"). Le plan le ramène à **1500 m D+/sem en S1**, soit **moitié moins**. Pour préparer 11000 m D+ sur 110 km, cette baisse en S1 est **dangereuse côté progressivité** : il manque ~8 semaines de stimulation D+ avant de remonter, et sans `weeklyElevationTarget` on n'a aucune visibilité sur la trajectoire D+ jusqu'à la race.

### C. Référentiel SL pic projetée

- SL pic projetée = `weeklyVolumes[14] × 0.4-0.5` = 99 × 0.45 ≈ **40-50 km**.
- Référentiel ultra 100+ km : SL pic 50-70 km (50-65% race distance).
- **SL pic estimée ~45 km vs cible référentiel 50-70 km** → légèrement sous le bas du référentiel pour un ultra 110 km. Acceptable si compensé par double-SL (back-to-back week-end), mais rien dans la S1 ne le suggère.

### D. Garde-fou délai court

- 19 semaines jusqu'à la race, c'est dans la fourchette habituelle (16-24 sem ultra). **MAIS** le feasibility.message lui-même dit "19 semaines pour un ultra de 110km est dangereux — 20+ semaines sont nécessaires" → **le système reconnaît le délai serré mais affiche quand même status BON** (cf. dim. 4).
- Délai serré + baisse volume km (-15%) + baisse D+ (-50%) = **anti-pattern** garde-fou A1.

**Verdict volume** : 🚨 **CRITIQUE**
- ❌ Volume S1 < current (51 vs 60, ratio 0.85)
- 🚨 D+ S1 = moitié du declared (1500 vs 3000)
- 🚨 weeklyElevationTarget ABSENT
- ❌ Volume pic 99 km/sem sous-dimensionné pour ultra 110 km
- ⚠️ Sauts %/sem jusqu'à +25 % (au-delà ACSM)

---

## 3. SORTIE LONGUE S1 — base de départ

| Champ | Valeur |
|---|---|
| Distance | **20.0 km** |
| Durée | **3h00** (warmup 15min + main 2h45 + cooldown 15min ≈ 3h15 en fait) |
| Allure | 5:06 /km plat, 7:00-8:00 /km côte |
| D+ | **975 m** |
| Lieu | Forêt de Bouconne |
| Type | Sortie Longue |

**Cohérence** :
- Ratio SL S1 / vol hebdo S1 = 20/51 = **39 %** ✅ (cible 25-40%)
- Vs niveau Expert + ultra 110km → 20 km en SL S1 est **léger** pour un Expert qui fait déjà 60 km/sem (probablement 15-25 km SL actuelles). OK pour démarrage progressif mais pas exigeant.
- D+ SL S1 = 975 m sur 20 km = ratio 48 m D+/km, **bien inférieur** au ratio race (100 m D+/km). Cohérent pour S1 mais doit monter rapidement.
- SL pic projetée ≈ 45 km : **sous le bas du référentiel ultra 100+ km** (50-70 km), voir §2.C.

**Verdict** : ⚠️ **SL S1 OK** mais SL pic projetée sous-dimensionnée pour cet ultra.

---

## 4. SCORE FAISABILITÉ + MESSAGE

| Champ | Valeur |
|---|---|
| `status` | **BON** |
| `score` | (non présent dans le doc) |
| `confidenceScore` (au niveau plan) | 75 |

### Message intégral

> Ton objectif de finisher sur ce trail de 110km / 11000m D+ est tout à fait atteignable. Avec ta VMA de 17.6 km/h, concentre-toi sur la régularité. **19 semaines pour un ultra de 110km est dangereux — 20+ semaines sont nécessaires**. 100m D+/km : terrain vallonné, la gestion des montées comptera. Point positif : ton volume actuel de 60km/sem est une excellente base pour cette distance, 19 semaines de préparation avec un bon volume : conditions favorables.

### SafetyWarning intégral

> À 54 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

### Bugs détectés

1. ❌ **CONTRADICTION INTERNE GRAVE** : message dit "tout à fait atteignable" + "conditions favorables" + **status = BON**, mais le **même message** dit "19 semaines pour un ultra de 110km est **dangereux** — 20+ semaines sont nécessaires". Le user lit littéralement "atteignable mais dangereux" dans la même phrase.
2. ❌ **Status BON incohérent** : si le moteur reconnaît que le délai est "dangereux" → le status doit être AMBITIEUX a minima, pas BON. Doctrine `feedback_securite_avant_conversion` : **ne pas embellir un plan irréaliste/limite**.
3. ❌ Phrase "100m D+/km : terrain vallonné" — un ratio 100m D+/km c'est de la **haute montagne / ultra alpin** (UTMB tier), pas "vallonné". Sous-estimation grossière du challenge.
4. ❌ **Aucune mention** que le volume pic plan (99 km/sem) est SOUS-DIMENSIONNÉ pour un 110 km.
5. ❌ **Aucune mention** que le plan baisse le volume current de 15 % et le D+ current de 50 %.
6. ✅ Pas de bug formatTime "2h60min" / "XhYY" → format propre.
7. ✅ SafetyWarning âge 54 ans + certif médical présent → OK.

**Verdict** : ❌ **MESSAGE DANGEREUX** — auto-contradictoire, status BON injustifié, embellit un plan sous-dimensionné. Viole `feedback_securite_avant_conversion`.

---

## 5. WELCOMEMESSAGE

### Texte intégral

> Bienvenue dans ton plan d'entraînement Trail Finisher pour l'ultra de 110km avec 11000m de D+ ! Ce programme sur 19 semaines est conçu pour t'emmener sereinement jusqu'à la ligne d'arrivée, en mettant l'accent sur l'endurance fondamentale, la résistance à la fatigue et la gestion du dénivelé. La première phase, 'fondamentale', vise à construire une base solide sans intensité excessive. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 54 ans, un bilan cardio-vasculaire est particulièrement conseillé.

### Checklist doctrine

| Critère | Statut |
|---|---|
| ❌ poids/IMC/minceur/silhouette/kilos/corpulence/maigrir | ✅ aucun mot interdit |
| ✅ "Perte de poids" OK seulement titre programme | N/A (pas de "Perte de poids" — c'est Trail) |
| ✅ Si Finisher + PB → cite PB (règle A3 déployée 18/05 21h) | ❌ **PB marathon 3h00 NON cité** |
| ✅ Si blessure → mention structure 3 piliers (règle A4 18/05 21h) | N/A (pas de blessure) |
| ✅ Ton préventif | ✅ "sereinement", "sans intensité excessive" |
| ✅ Transparence si AMBITIEUX | ❌ aucune mention que 99 km/sem pic est faible pour 110 km, aucune mention délai serré |
| ✅ Sécurité si >50 ans ou BMI>30 | ✅ "54 ans → bilan cardio-vasculaire" présent |
| ✅ Allures user citées si fournies | ✅ EF 5:06 cité implicitement dans sessions, marathon 3h00 NON cité |
| ✅ Pas de nutrition (`feedback_pas_de_nutrition_dans_plan`) | ⚠️ Session SL S1 contient "mange de petites quantités toutes les 30-45 minutes" — limite, c'est un conseil court coach mais à surveiller |

**Justification absence règle A3** : le plan a été généré le **08/04/2026**, soit **40 jours AVANT** le déploiement de A3 (18/05/2026 21h). Donc conforme à l'état du système au moment de la génération, MAIS la régénération full plan post-conversion bénéficierait du fix.

**Verdict** : ⚠️ **welcomeMessage propre côté doctrine** (pas de poids/IMC, sécurité 54 ans OK), MAIS :
- Ne cite pas le PB marathon 3h00 (règle A3, normal car généré pré-A3)
- Ne mentionne PAS la dimension "challenge ambitieux" du 110km/11000m D+ → manque de transparence
- "Sereinement jusqu'à la ligne d'arrivée" + plan sous-dimensionné = embellissement.

---

## 6. VARIATION DES SÉANCES — anti-ennui

Sessions S1 (5 séances) :

| # | Jour | Titre | Type | mainSet (résumé) | Distance | Allure | D+ | Lieu | Intensité |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Mar | Footing en aisance respiratoire | Footing | 45 min EF plat | 10 km | 5:06 | 225 m | Bords Garonne / Canal Midi | Facile |
| 2 | Mer | Renfo Trail Focus A - Quadriceps & Excentrique (S1) | Renforcement | Circuit 4 tours, 13 exos (squats, bulgare, fentes, gainage, excentrique, mollets, sauts, pompes, dips, tirage) | 0 km | N/A | 0 | Maison | Modéré |
| 3 | Jeu | Footing vallonné en EF | Footing | 50 min EF terrain vallonné, marche en forte pente | 11 km | 5:06 plat | 300 m | Parc Pech David | Facile |
| 4 | Sam | Sortie Longue Trail en EF (avec marche en côte) | Sortie Longue | 2h45 EF sentiers vallonnés, power hiking, ravito 30-45 min | 20 km | 5:06/7:00-8:00 | 975 m | Forêt Bouconne | Facile |
| 5 | Dim | Footing nature / récupération active | Footing | 45 min EF souple/plat, foulée légère | 10 km | 5:06 | 0 | Bords Garonne / Parc Ramée | Facile |

**Analyse variation** :
- ✅ **5 titres uniques** (footing/footing vallonné/SL/récup/renfo) — pas de "Footing 1/2/3"
- ✅ **5 mainSets différents** dans le contenu (plat, vallonné, SL+power-hike, récup active, circuit force)
- ✅ **Types variés** : 3 Footing (mais avec angles différents : plat/vallonné/récup) + 1 SL + 1 Renforcement → conforme freq 5 = 4 course + 1 renfo (mémoire `project_coach_running_ia_frequence`)
- ✅ **Lieux variés** : Garonne / Pech David / Bouconne / Ramée (4 lieux différents pour 5 sessions)
- ⚠️ **Intensité peu variée** : 4 séances "Facile" + 1 "Modéré" (renfo). Pour une S1 fondamentale Expert, c'est conforme (pas de fractionné en S1) — pas un bug, doctrine fondamental respectée.
- ✅ **Aucun doublon** détecté (vs cas Antoine Mercredi=Samedi 17/05).
- ✅ **Renfo Trail spécifique** (excentrique + quadriceps) → adapté trail montagne ✅

**Verdict** : ✅ **Variation des séances OK** — engageante, pas répétitive.

---

## SYNTHÈSE CLIENT

### ✅ Points forts
- Plan structuré (19 sem, 4 phases : fondamental → développement → spécifique → affûtage)
- 3 semaines de décharge bien placées (4, 8, 12)
- Affûtage 4 sem progressif (-31/-9/-10/-11 %)
- Allures Daniels-cohérentes avec VMA 17.58 + marathon 3h00
- SL S1 raisonnable (20 km / 39 % du vol hebdo)
- Renfo trail spécifique (excentrique, quadriceps, mollets, sauts directionnels)
- Variation des séances S1 OK (titres uniques, lieux variés, types mixés)
- SafetyWarning âge 54 ans + certificat médical présent
- welcomeMessage sans mention poids/IMC ✅

### ⚠️ Points d'attention
- Allure spécifique trail / ultra absente du tableau paces
- welcomeMessage ne cite pas le PB marathon 3h00 (règle A3 — généré pré-A3, normal mais à régénérer)
- Session SL S1 contient brève consigne nutrition ("mange petites quantités 30-45 min") — limite vs `feedback_pas_de_nutrition_dans_plan`
- SL pic projetée (~45 km) sous le bas du référentiel ultra 100+ km (50-70 km)

### ❌ Bugs critiques

1. ❌ **VOLUME S1 < CURRENT** : 51 km plan vs 60 km declared (ratio 0.85). Le fix A1 "floor S1 = current ≥ 0.95" n'a pas été appliqué.
2. 🚨 **D+ S1 = 50 % DU DECLARED** : 1500 m plan vs 3000 m declared. Pour un ultra à 11000 m D+, baisser de moitié en S1 sans justification = dangereux niveau progression.
3. 🚨 **`weeklyElevationTarget` ABSENT** du `periodizationPlan` pour un trail 11000 m D+ → aucune visibilité D+ semaine par semaine.
4. ❌ **VOLUME PIC SOUS-DIMENSIONNÉ** : 99 km/sem pour un 110 km/11000 m D+. Référentiel ultra Expert : 130-180 km/sem.
5. ❌ **feasibility.status BON contradictoire avec son propre message** : status BON + safetyWarning OK, mais message dit "19 sem est dangereux — 20+ sem nécessaires". Auto-contradiction visible par le user.
6. ❌ **MESSAGE EMBELLI** : "tout à fait atteignable" + "conditions favorables" alors que le plan est sous-dimensionné. Viole `feedback_securite_avant_conversion`.
7. ❌ **SAUTS %/SEM > ACSM** : jusqu'à +25 % post-décharge (sem 8→9, 12→13). Limite ACSM = 10-15 %.
8. ❌ **PHRASE TROMPEUSE** : "100m D+/km : terrain vallonné" — 100m D+/km = haute montagne (UTMB tier), pas "vallonné".
9. 🚨 **PREMIUM SANS FULL PLAN** : user abonné depuis 18/05 20:18 (Stripe sub active), mais `isPreview=true / fullPlanGenerated=false`. **Régénération full plan jamais déclenchée OU échec silencieux**. Aucune erreur loggée dans `generation_errors`.

### Action recommandée

**RÉGÉNÉRATION FULL PLAN OBLIGATOIRE** + patch live message faisabilité, dans cet ordre :

1. **IMMÉDIAT — patch live `feasibility.message`** : retirer la phrase auto-contradictoire "19 semaines pour un ultra de 110km est dangereux — 20+ semaines sont nécessaires" tant que `status=BON`. Soit on garde la phrase et on bascule en `status=AMBITIEUX`, soit on retire la phrase. Cohérence interne.
2. **IMMÉDIAT — investiguer pourquoi `fullPlanGenerated=false` malgré conversion** :
   - Vérifier les Cloud Functions / endpoint post-conversion (`/api/generate-full-plan` ou équivalent)
   - Logs Stripe webhook 18/05 20:18 → est-ce que `generate-full-plan` a été déclenché ?
   - Vérifier `generation_errors` collection au-delà du `userId` (peut-être loggé sans `userId`)
3. **RÉGÉNÉRATION** une fois le bug full plan corrigé, avec corrections :
   - Floor S1 = 60 km (current) avec ratio ≥ 0.95
   - `weeklyElevationTarget` rempli (S1 = 3000 m, montée jusqu'à pic ~6000-8000 m D+/sem)
   - Pic volume revu à la hausse (cible 120-150 km/sem)
   - Sauts %/sem capés à +15 %
   - welcomeMessage cite PB marathon 3h00 (règle A3)
   - feasibility.status passé à AMBITIEUX (délai serré + volume current solide mais ultra exigeant + 54 ans)

---

## VÉRIFICATIONS SPÉCIFIQUES (historique 18/05)

| # | Vérif | Statut |
|---|---|---|
| 1 | Bug formatTime "2h60min" dans `feasibility.message` | ✅ ABSENT |
| 2 | Floor S1 = current (ratio S1/declared ≥ 0.95) | ❌ 51/60 = 0.85 — **bug A1 actif** |
| 3 | Si Finisher+PB → allure `max(PB+5%, VMA-based)` appliquée | N/A (Trail Finisher pas d'allure cible trail, pas d'`allureSpecifiqueUltra`) |
| 4 | Si blessure → welcomeMessage cite structure 3 piliers | N/A (pas de blessure) |
| 5 | Variation séances : doublons titre/mainSet/distance S1 | ✅ Aucun doublon |
| 6 | weeklyElevationTarget présent pour trail | 🚨 **ABSENT** |
| 7 | Volume pic cohérent avec distance race | ❌ 99 km/sem pour 110 km/11000 m D+ = **sous-dimensionné** |

---

## PATCHES CODE RECOMMANDÉS

1. **`feasibilityService.ts`** : ajouter règle "si message contient mots-clés danger (`dangereux`, `nécessaires`, `insuffisant`, `risqué`) → forcer status ≠ BON". Empêche auto-contradiction.
2. **`feasibilityService.ts`** : pour trail ultra >80km, requérir volume pic ≥ 1.2× distance race en km. Sinon downgrade status.
3. **`geminiService.ts`** : si `goal=Trail` ET `trailDetails.elevation ≥ 1000`, **EXIGER** `weeklyElevationTarget` dans `periodizationPlan` (validation post-génération). Sinon retry.
4. **`geminiService.ts`** : vérifier que le déclenchement post-conversion premium → `generateFullPlan` est garanti (mécanisme retry + log explicite). Le cas rauroy montre que ça peut silencieusement ne pas s'exécuter.
5. **Post-A1 fix** : auditer rétroactivement les plans générés avant 08/04 (date de génération rauroy) pour vérifier que tous les nouveaux abonnés depuis A1 bénéficient bien du floor S1 ≥ 0.95.

---

**Fichiers source de l'audit** :
- `/Users/romanemarino/Coach-Running-IA/rauroy-user.json` (doc Firestore user)
- `/Users/romanemarino/Coach-Running-IA/rauroy-plan.json` (doc Firestore plan)
- `/Users/romanemarino/Coach-Running-IA/search-rauroy.mjs` (script recherche)
- `/Users/romanemarino/Coach-Running-IA/audit-rauroy-full.mjs` (script fetch JSON)
