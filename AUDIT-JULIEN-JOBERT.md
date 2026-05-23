# Audit Julian Jobert — test Cooper + ajustement plan

Date : 2026-05-21
Auditeur : Claude (lecture seule)
Sources : Firestore (users + plans), Strava analysis stockée.

> Orthographe : le user a bien `julian.jobert@hotmail.fr` (avec **a**), pas Julien. Anonymisé ci-dessous en `ju***@hotmail.fr`.

---

## 1. Profil utilisateur

| Champ | Valeur |
|---|---|
| UID | `bNTAkiezfzf21NFdqapqIvx5YRw2` |
| Email | `ju***@hotmail.fr` (Julian) |
| firstName | Julian |
| Compte créé | 2026-03-09 |
| Premium | actif (depuis 2026-04-15), Stripe `active`, pas d'annulation |
| Strava connecté | oui, dernier sync 2026-05-20 |
| Ville | Bois-d'Arcy |

### Questionnaire (snapshot doc user)

| Champ | Valeur |
|---|---|
| sex / age / taille / poids | Homme / 32 ans / 170 cm / 81 kg |
| goal / sous-objectif | Trail / 10 km D+ 50 m |
| level | Confirmé (Compétition) |
| raceDate | 2026-06-28 (≈ 6 semaines après start) |
| startDate | 2026-05-18 |
| frequency | 4 séances/sem |
| preferredDays | Lun, Mar, Mer, Sam |
| currentWeeklyVolume | 25 km |
| currentWeeklyElevation | 200 m D+ |
| targetTime | **55 min** sur 10 km D+ 50 m |
| recentRaceTimes.distance10km | **56:30** (PB déclaré, plat probable) |
| **vma (déclarée/calculée)** | **11.7994 km/h** (probablement issue du 10k 56:30 via formule) |
| injuries.hasInjury | **true — Aponévrosite plantaire pied gauche** |
| comments | "Une sortie vélo en famille le dimanche" |

---

## 2. Test demi-Cooper (input nouveau, 18/05/2026)

Stocké dans le `feedback.notes` de la séance W1 S2 :

> "Test demi-cooper fait après séance : **1,230 km en 6 minutes**. FC max sur le demi-cooper : **197 bpm**. FC zone 2 à ajuster ?"

| Calcul | Résultat |
|---|---|
| VMA mesurée | (1230 × 60) / (6 × 1000) = **12.3 km/h** |
| FCmax réelle | **197 bpm** (mesurée terrain) |
| FCmax théorique 220-age | 188 (Tanaka 185.6) → **sous-estimée de 9-11 bpm** |

**Écart VMA calculée (11.8) vs Cooper (12.3) = +4.2 % en faveur de Cooper.**

---

## 3. État de la VMA dans le plan stocké

| Champ plan | Valeur |
|---|---|
| `plan.vma` | **12.3** |
| `plan.calculatedVMA` | 11.7994 |
| `plan.vmaSource` | **"Ajustée manuellement : 11.8 → 12.3 km/h"** |
| `generationContext.vma` | 12.3 |
| `generationContext.vmaSource` | "Ajustée manuellement : 11.8 → 12.3 km/h" |

**Le plan a déjà été régénéré sur VMA 12.3** (avant le test Cooper, le 16/05 — créé sur cette base). Le test Cooper du 18/05 vient **CONFIRMER pile 12.3 km/h** → la VMA actuelle du plan est la bonne. Aucun recalcul nécessaire côté allures.

### Allures stockées (cohérentes VMA 12.3)

| Zone | Pace |
|---|---|
| EF | 7:17 min/km |
| Récup | 8:08 |
| Seuil | 5:36 |
| VMA | 4:53 |
| Allure 10k | 5:25 |
| Allure semi | 5:44 |

---

## 4. RPE & feedback observés (1 séance vécue + 1 doublon)

Pas de sous-collection `feedback` / `rpe` / `sessionFeedback` — les feedbacks sont **inline dans `plan.weeks[].sessions[].feedback`**.

### Sessions marquées completed

| Sem | Jour | Type | Title | RPE | Strava réel | adaptationRequested |
|---|---|---|---|---|---|---|
| W1 S1 | Lun 18/05 | Jogging | Footing progressif négative split (6.6 km / 51 min @ 7:17) | **1** | 4.8 km / 46 min / **9:31 min/km** / FC 139/154 / 10 D+ | false |
| W1 S2 | Mar | Jogging | Footing vallonné côtes marche (5 km / 38 min @ 7:17 / 75 D+) | **1** | **MÊME activityId 18551969372** (4.8 km / 46 min / 9:31 / 10 D+) | **true** |

**Doublon Strava** : la même activité (id 18551969372 du 18/05) a été matchée à la fois sur S1 et S2. Très probablement il n'y a eu qu'**une seule sortie réelle** le 18/05, et l'utilisateur a marqué S1 puis S2 comme complétées avec le même run. À noter, pas de bug d'auto-match, c'est plus probablement un comportement manuel.

### Lecture cardiaque vraie (FCmax 197 confirmée par Cooper)

| Métrique | Valeur | Lecture |
|---|---|---|
| FC moy 139 / FCmax 197 | 71 % | **Z2 idéal** pour EF |
| FC max 154 / FCmax 197 | 78 % | Z3 milieu |
| Pace 9:31 vs target 7:17 EF | **2:14 min/km plus lent** | RPE 1 cohérent : très/trop facile |
| Distance 4.8 km vs target 6.6 km | -27 % | Sortie écourtée |

### Conclusion RPE / feedback

- Le user a **délibérément ralenti** suite à la fcAlert Strava analysis ("vise 7:00-7:30 EF") → il est descendu encore plus bas (9:31).
- RPE 1 = trop facile. Il y a un sous-effort sur cette première sortie.
- Le doublon S1/S2 brouille la vue : impossible de juger l'adhérence au plan sur la base d'une seule sortie réelle.
- **Pas assez de données pour conclure** sur la dureté générale du plan, sauf que la première séance n'a pas été suivie au pace prévu.

---

## 5. Analyse Strava (`lastStravaAnalysis`, datée 2026-05-16)

30 derniers jours : 29.7 km de course + vélo + CrossFit en 6 séances. 4 sorties course :
- 3 / 4 courues en Z5 (FC moy 168-190 bpm), dont une de 12 km à FC moy **190.7 bpm**.
- 0 séance en Z2 estimée (sur la base FCmax 180 estimée).
- weeklyBreakdown : Sem 15/04 = 4 km ; Sem 05/05 = 12.8 km ; Sem 12/05 = 12.9 km.

`coachVerdict = À AMÉLIORER`. `fcAlert.hasAlert = true` avec suggestion `suggestedEFPace = "7:15 min/km"`.

**Mise en perspective avec FCmax 197 mesurée** : les FC moy 168-190 que l'analyse Strava décrit comme "dangereusement au-dessus de FCmax 180" sont en réalité ~86-97 % FCmax **réelle** — toujours trop élevées pour une EF (cible Z2 = 118-138 bpm avec FCmax 197), mais **pas au-dessus de FCmax**. La fcAlert reste pertinente sur le fond (intensité trop élevée), mais ses chiffres sont à recalibrer.

---

## 6. Plan actuel — structure 6 semaines

| W | Phase | Vol cible | Sum séances | D+ | Notes |
|---|---|---|---|---|---|
| 1 | fondamental | 21 km | 21.1 km | 125 m | EF + EF vallon + renfo A + SL 9.5 km |
| 2 | développement | 23 km | 23.0 km | 170 m | EF + **VMA courte** (5 km @ 4:53) + renfo B + SL 12 km D+170 |
| 3 | développement | 24 km | 24.0 km | 215 m | EF + **côtes courtes** (@5:25) + renfo A + **SL 12 km D+215 m (pic D+)** |
| 4 | récupération | 19 km | 19.0 km | 61 m | EF récup + EF + renfo léger + SL 9 km D+61 |
| 5 | spécifique | 22 km | 22.0 km | 80 m | EF + **Seuil** 6 km @ 5:36 + renfo A + **SL simu trail** 10 km D+80 |
| 6 | affûtage | 14 km | 14.0 km | 20 m | EF + rappel VMA + renfo léger + footing veille 6 km |

- Renforcement présent chaque semaine (cohérent avec freq 4 = 3 course + 1 renfo).
- Pic volume W3 (24 km), pic D+ W3 (215 m). Volume actuel user déclaré : 25 km/sem → **pic 24 km très conservateur**. OK pour gérer l'aponévrosite plantaire.
- Allures dérivées de VMA 12.3 : EF 7:17, VMA 4:53, seuil 5:36, allure 10k 5:25.
- Allure objectif course **non écrasée** : `targetTime = "55min"` conservé (doctrine `feedback_jamais_baisser_allure_cible` respectée).

---

## 7. Feasibility — INCOHÉRENCE DÉTECTÉE

`plan.feasibility` stocké :

```
status      : AMBITIEUX
message     : "Avec ta VMA de 11.8 km/h, ton temps théorique sur 10km
              avec 50m D+ est d'environ 1h03min. Viser 55:00 demande
              une VMA d'environ 13.5 km/h. ..."
recommendation : "un temps cible de 1h06min"
safetyWarning  : "Fais valider la reprise avec ton kiné/médecin..."
```

**Problème** : le `feasibility.message` parle de **VMA 11.8** alors que `plan.vma = 12.3`. L'ajustement manuel 11.8→12.3 n'a **pas mis à jour `feasibility`**.

Cause racine : `handleRecalculateVMA` (App.tsx:1021-1279) recalcule `paces`, `vma`, `vmaSource`, `generationContext`, régénère les semaines futures, met à jour le `level` effectif, et **affiche un toast `adaptationMessage`** avec un avertissement feasibility éphémère — mais **il n'écrit pas `plan.feasibility`**. Le champ persiste à sa version initiale.

### Refaisons le calcul propre avec VMA 12.3

| Cible | Fraction VMA requise | Verdict |
|---|---|---|
| 56:30 (PB déclaré 10k plat) | 86.3 % VMA | Confirmé → atteignable, c'est son niveau actuel |
| 55:00 sur 10k plat | 88.7 % VMA | Très ambitieux pour Confirmé, plutôt Expert |
| 55:00 sur 10k D+ 50 m | équivalent ~54:00-54:30 plat | + dur encore |

Modèle simplifié : avec VMA 12.3, fraction Confirmé ~86 % → 10k plat estimé **56:42**. Ajout +30s-1min pour 50 m D+ → estimé Trail 10k **57:12-57:42**.

**Verdict ajusté propre** : 55:00 reste **AMBITIEUX** (pas IRRÉALISTE) avec VMA 12.3. Le user devrait progresser pendant le plan, mais 55:00 sur Trail avec 6 semaines de prépa + aponévrosite plantaire active est tendu. Cible plus réaliste : **57-58 min** (PB-like). Le message stocké ("1h03 / 1h06") était calé sur VMA 11.8 et est désormais trop pessimiste.

---

## 8. WelcomeMessage

> "Bonjour ! Ce plan d'entraînement est conçu pour t'accompagner dans ton objectif de Trail de 10km avec 50m de D+ en 55 minutes. La structure des 6 prochaines semaines te permettra de construire une base solide en endurance, d'améliorer progressivement tes capacités en trail et de gérer ton aponévrosite plantaire. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport."

- Mentionne l'aponévrosite (bien).
- Mentionne le certificat médical (bien, doctrine sécurité).
- **Ne mentionne pas l'écart VMA/cible 55 min** (zone d'amélioration : le user peut croire que 55 min est dans la poche, alors que c'est AMBITIEUX).
- Pas de variation S1 ni de mention du test Cooper / FCmax réelle (le plan a été créé avant le test).

---

## 9. Diagnostic synthèse 5 dimensions

| Dimension | Verdict |
|---|---|
| **1. Allure cible / VMA** | OK — VMA 12.3 utilisée, cohérente avec test Cooper. Allures EF 7:17 / VMA 4:53 / seuil 5:36 correctes. |
| **2. Volume S1 + SL** | OK — S1 = 21 km vs déclaré 25 km, SL 9.5 km très raisonnable. Conservateur, justifié par blessure. |
| **3. Volume pic + évolution** | OK — pic 24 km W3 < volume actuel 25 km. Progression douce 21→23→24→19→22→14. D+ pic 215 m W3 cohérent avec 200 m déclaré. |
| **4. Feasibility** | **INCOHÉRENT** — message parle de VMA 11.8 alors que plan vma=12.3. Status "AMBITIEUX" reste juste, mais texte obsolète. |
| **5. WelcomeMessage / S1** | OK sur blessure + cert médical. Manque la transparence sur l'écart à 55 min (doctrine `feedback_securite_avant_conversion`). |

---

## 10. Recommandation d'ajustement

### Q1 — Faut-il patcher live les allures ?

**Non.** Le plan tourne déjà sur VMA 12.3, qui est précisément la VMA Cooper. Pas d'écart. Allures et structure restent valides.

### Q2 — Faut-il régénérer ?

**Non.** Pas de raison structurelle. Volumes corrects, périodisation correcte, renfo présent, allures justes.

### Q3 — User peut-il recalculer via UI ?

Oui, `handleRecalculateVMA` existe (App.tsx:1021), Premium + VMA actuelle 12.3 → mais comme la nouvelle valeur (12.3 mesurée) est strictement identique à `plan.vma` actuelle, le garde-fou `if (Math.abs(newVMA - oldVMA) < 0.1)` (ligne 1039) renverra **"La VMA est déjà à cette valeur."** Donc l'UI ne déclenchera rien. Comportement attendu et correct.

### Q4 — Le `targetTime = "55min"` reste-t-il réaliste ?

- **PB 10k plat 56:30** → 55:00 demande -1:30 de progrès en 6 semaines, sur terrain trail + 50 m D+ + aponévrosite active.
- Faisable mais TRÈS ambitieux. Pas IRRÉALISTE (donc on respecte la doctrine `feedback_jamais_baisser_allure_cible` — on garde 55 min comme cible user).
- En revanche, le message feasibility actuel ("1h03 / recommande 1h06") **dévalorise** trop la cible alors qu'avec VMA 12.3 le calcul propre donne ~57 min. Ce message devrait être mis à jour.

### Q5 — Vrais points d'action restants

1. **(Bug code, hors plan)** : `handleRecalculateVMA` devrait écrire `plan.feasibility` (recalculé via `calculateFeasibility`) en plus du toast — sinon l'incohérence persiste dans l'UI au prochain affichage. Le code calcule déjà `newFeasibility` (ligne 1216-1236) mais ne l'écrit jamais dans le plan stocké. **Patch à envisager : ajouter `fullPlan.feasibility = newFeasibility;` avant le `savePlan(fullPlan)` (ligne 1195) et idem dans la branche `else` (ligne 1199-1208).**

2. **(Plan vivant)** : envoyer un message côté coach (Romane → user, doctrine `feedback_jamais_contact_client` → c'est Romane qui le fait, pas l'IA) :
   - "Test Cooper confirme VMA 12.3, c'est ta vraie valeur — plan calibré dessus, on est bons."
   - "FCmax réelle = 197, pas 180. Recalibre tes zones cardio Strava."
   - "Sur S1 footing à 9:31 RPE 1 : trop lent. Tu as raison de ralentir vs ton ancienne intensité Z5, mais 7:15-7:30 est la cible EF — pas 9:30. La FC 139 (71% FCmax 197) confirme que tu peux courir plus vite à FC équivalente."
   - "Objectif 55:00 reste ambitieux mais conservé comme tu l'as demandé. Le `feasibility` affiché dans le plan est obsolète (calculé sur VMA 11.8) — ne t'en inquiète pas, on le fixera côté code."

3. **(Doublon Strava S1/S2)** : informer le user qu'il n'a marqué qu'une vraie séance, pas deux. La donnée S2 est un duplicate de S1.

---

## 11. Décision attendue Romane

1. **Confirmer** qu'aucune action plan vivant n'est nécessaire (allures bonnes, structure bonne).
2. **Décider** si on patche le code (`handleRecalculateVMA` → écrire `feasibility` dans le plan) — à faire hors de cet audit mais à logger.
3. **Décider** du message coach à envoyer au user (Romane le fait, pas l'IA) avec les 3 points ci-dessus.
4. **Optionnel** : si Romane veut mettre à jour manuellement le `plan.feasibility.message` pour qu'il reflète VMA 12.3, c'est un script Firestore lecture-écriture séparé (hors scope audit).

---

## 12. Annexes — fichiers récupérés

- `audit-julian-user-raw.json` / `audit-julian-user.json` : doc user complet.
- `audit-julian-plan-raw.json` / `audit-julian-plan.json` : plan complet 6 semaines.
- Sous-collections `feedback`, `rpe`, `activities`, `sessionFeedback`, `feedbacks` : toutes vides (les feedbacks vivent inline dans `plan.weeks[].sessions[].feedback`).

Script de fetch : `_audit-julien-jobert-fetch.mjs`.
