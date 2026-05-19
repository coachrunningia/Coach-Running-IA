# Tests Sprint 1 — 15 profils

Date: 2026-05-19
Commit testé: `0435796` (Sprint 1 — fixes #1, #2, #4, #5a, #6)
Script : `test-sprint1-15-profils.mjs`

## Synthèse

- ✅ OK : **11/15**
- ⚠️ Limite (comportement attendu mais à surveiller) : **4/15** (T2, T3, T9, R4/R5 input pollué)
- ❌ Bug : **0/15**

**Tous les fixes ciblés (#1, #2, #4, #5a, #6) fonctionnent comme attendu.**
Les comportements "limite" relèvent du **chrono override** (mécanisme préexistant à Sprint 1) ou d'**inputs utilisateur pollués** non couverts par fix #6 (qui ne reject que les chaînes contenant "km").

---

## 10 profils trail (T1-T10)

### T1 — Trail court 10km/300D+ (Femme 35, Confirmé) ✅
- **Niveau effectif** : `conf` (préservé, 10K 50min Femme = conf)
- **S1 D+** : 200m (=current, ratio 1.00) | **Pic D+** : 282m (94% race, S10)
- **S1 vol** : 25km | **Pic vol** : 48km
- **BTB / Nuit** : non (distance < 70/80)
- **Verdict** : ✅ OK. Cap `raceElevation` prime (Math.min) → pic ≤ 300m respecté. Conforme fix #1.

### T2 — Trail moyen 20km/600D+ (Homme 40, Confirmé) ⚠️
- **Niveau effectif** : `inter` (10K 45min Homme → chrono override conf→inter)
- **S1 D+** : 600m (=race entière) | **Pic D+** : 600m (100% race)
- **S1 vol** : 35km | **Pic vol** : 59km
- **Verdict** : ⚠️ Limite. **Plan totalement plat en D+** : current 600m = race 600m = maxWeeklyElev (cap inter=1500 mais race prime). Comportement mathématiquement correct mais peu intéressant — pas de progression possible. Acceptable car la race est de petit dénivelé.

### T3 — Trail 30km/1500D+ (Homme 45, Confirmé) ⚠️
- **Niveau effectif** : `deb` (10K 55min Homme → chrono override conf→deb !)
- **S1 D+** : 1500m | **Pic D+** : 1500m (S1 puis descente)
- **S1 vol** : 40km | **Pic vol** : 58km
- **weeklyElev** : `[1500, 1446, 1392, 736, 1285, 1231, 1177, 618, 1069, 1015, 962, 499, 427, 320]`
- **Verdict** : ⚠️ Limite. Niveau effectif `deb` (cap 800m) + current 1500m → S1 prend current declared (fix #2 floor) MAIS pic descend vers cap 800. **Le plan décroît en D+ au lieu de progresser.** Comportement attendu vu l'incohérence input (10K 55min ≠ Confirmé) mais signale qu'un Confirmé avec chrono lent voit son D+ s'effondrer.

### T4 — Trail 50km/3000D+ (Femme 50, Expert) ✅
- **Niveau effectif** : `expert` (pas de chrono → déclaré préservé)
- **S1 D+** : 2500m (=current) | **Pic D+** : 2933m (98% race, S14)
- **S1 vol** : 55km | **Pic vol** : 115km
- **BTB / Nuit** : non (distance 50 < 70)
- **Verdict** : ✅ OK. Progression linéaire 2500→2933, cap Expert 6500 mais race=3000 prime.

### T5 — Trail 50km/3000D+ Senior (Homme 58, Expert, 10K 1h05) ✅
- **Niveau effectif** : `expert` ✅ **(fix #5a confirmé)**
- **S1 D+** : 2500m | **Pic D+** : 2933m | **S1 vol** : 50km | **Pic vol** : 104km
- **Verdict** : ✅ OK. Sans fix #5a, 10K 1h05 Homme aurait downgradé à `deb` (cap 800m → plan ridicule). Avec fix #5a : âge 58 ≥ 55 + niveau déclaré ≥ inter → preserved Expert. **Comportement attendu**.

### T6 — Trail 80km/5000D+ (Homme 42, Expert, 10K 40min) ✅
- **Niveau effectif** : `conf` (10K 40min Homme → conf via chrono, non-senior donc pas de #5a)
- **S1 D+** : 4000m (=current, fix #2 floor) | **Pic D+** : 4447m (89% race, S18)
- **S1 vol** : 70km | **Pic vol** : 130km
- **BTB injecté** : ✅ oui (≥70km) | **Nuit injectée** : ✅ oui (≥80km) **— fix #4 OK**
- **Verdict** : ✅ OK. Cap conf=4500 (post-fix #1) permet de couvrir 89% race D+ 5000. Pre-fix #1 (cap conf=2500), le pic aurait été plafonné à 2500m = 50% race — sous-entraîné.

### T7 — Ultra 100km/7000D+ Senior (Homme 55, Expert, 10K 1h00) ✅
- **Niveau effectif** : `expert` ✅ (fix #5a)
- **S1 D+** : 4500m (=current) | **Pic D+** : 6326m (90% race, S22)
- **S1 vol** : 80km | **Pic vol** : 164km
- **BTB / Nuit** : ✅ oui (fix #4)
- **Verdict** : ✅ OK. Progression franche du D+ (4500→6326), cap Expert 6500 permet 90% race.

### T8 — Ultra 110km/12000D+ Master (Rich-like, Homme 55, Expert, 10K 1h00) ✅
- **Niveau effectif** : `expert` ✅ (fix #5a)
- **S1 D+** : **3000m** ✅ **(vs 1500 pre-fix — fix #2 OK)** | **Pic D+** : **6196m** ✅ **(vs 3500 pre-fix — fix #1 OK)**
- **S1 vol** : 70km | **Pic vol** : 144km
- **BTB / Nuit** : ✅ oui (fix #4)
- **Verdict** : ✅ OK. **Cas emblématique Sprint 1**. S1 = current declared 3000 (fix #2 préserve l'input user) ; pic atteint 52% race D+ via cap Expert 6500 (fix #1). Pre-Sprint 1 : S1 plafonné 1500 (écrasement écran), pic plafonné 3500 (cap Expert) = profil sous-entraîné.

### T9 — Ultra 130km/8000D+ (Femme 48, Expert, 10K 45min) ⚠️
- **Niveau effectif** : `conf` (10K 45min Femme → conf via chrono, 48 ans non-senior)
- **S1 D+** : 5000m (=current) | **Pic D+** : 5000m (S1)
- **Plan décroissant en D+** : `[5000, 4978, 4957, 2714, ... 4543, 2261, 1800]`
- **S1 vol** : 85km | **Pic vol** : 156km
- **BTB / Nuit** : ✅ oui (fix #4)
- **Verdict** : ⚠️ Limite. Niveau effectif `conf` (cap 4500) + current 5000 > 4500 → S1 préservé via fix #2 floor mais target redescend vers cap. **D+ plan décroissant.** Comportement attendu (chrono 10K 45min ≠ Expert Femme) mais signale un mismatch déclaratif / chrono. **Pas un bug Sprint 1** — fix #2 fait son job (préserve user input), fix #1 cap conf=4500 est intentionnel.

### T10 — Trail court débutant (Femme 30, Débutant 15km/500D+) ✅
- **Niveau effectif** : `deb`
- **S1 D+** : 300m (=current) | **Pic D+** : 464m (93% race, S10)
- **S1 vol** : 8km | **Pic vol** : 11km
- **Verdict** : ✅ OK. Cap deb=800 mais race=500 prime → maxWeekly=500. Progression cohérente 300→464.

---

## 5 profils route (R1-R5)

### R1 — 5k Confirmé (Femme 30) ✅
- Effectif `conf` | weeklyElev **absent** ✅ (route, pas de trailDetails)
- S1 25km | Pic 48km | **Verdict** : ✅ OK non-régression.

### R2 — 10k Régulier (Homme 38) ✅
- Effectif `inter` | weeklyElev absent ✅
- S1 30km | Pic 51km | **Verdict** : ✅ OK non-régression.

### R3 — Semi sub-1h45 Senior (Homme 57, Expert, 10K 39min) ✅
- **Effectif** : `expert` ✅ **(fix #5a : senior ≥55 + niveau ≥ inter → préservé)**
- S1 50km | Pic 106km | **Verdict** : ✅ OK. Bénéficie de fix #5a même sur route — confirme que le fix est level-agnostic et n'impacte pas l'objectif.

### R4 — Marathon Finisher Expert (Femme 45) ⚠️
- Input pollué : `distance10km: "3h30"` (marathon time dans champ 10k)
- Effectif `deb` (timeToSeconds("3h30",10)=12600s → 210min → > 60 → deb)
- S1 60km | Pic 86km | **Verdict** : ⚠️ Limite. **Fix #6 ne déclenche pas** car "3h30" ne contient pas "km". Input utilisateur incohérent → downgrade Expert→deb. Pas une régression Sprint 1 (comportement identique avant), mais montre une limite du fix #6 : reject ne couvre que les chaînes contenant explicitement "km". Pour aller plus loin, ajouter un garde-fou plausibilité (10K > 3h ≈ marche) — **hors scope Sprint 1**.

### R5 — Marathon sub-3h ambitieux (Homme 42) ⚠️
- Input pollué : `distance10km: "3h10"` (marathon time)
- Effectif `deb` (même cause que R4)
- S1 80km | Pic 115km | **Verdict** : ⚠️ Limite. Idem R4.

---

## Bugs détectés

**Aucun bug Sprint 1.**

Les 4 cas "limite" (T2, T3, T9, R4/R5) relèvent du chrono override préexistant et d'inputs utilisateur pollués, pas des fixes Sprint 1. Comportements stables et expliqués.

---

## Non-régressions vérifiées

| Vérification | Résultat |
|---|---|
| R1-R5 : `weeklyElevationTarget` absent pour non-trail | ✅ 5/5 |
| R1-R5 : weeklyVolumes calculés normalement | ✅ 5/5 |
| Fix #6 : `"50km (6h50)"` → 0 (input pollué reject) | ✅ |
| Fix #6 : `"45min"` → 2700s (pas de faux positif) | ✅ |
| Fix #6 : `"1h00"` → 3600s | ✅ |
| T1 : cap `raceElevation` prime (300m) → pic ≤ 300 | ✅ (282m) |
| T8 (Rich-like) : S1 ≥ 3000 + pic ≥ 5500 | ✅ (3000 + 6196) |
| T5 (Senior Expert) : niveau préservé Expert | ✅ |
| T7 (Senior Ultra) : niveau préservé Expert | ✅ |
| R3 (Senior Semi Expert) : niveau préservé Expert | ✅ |
| T6/T7/T8/T9 (distance ≥70) : BTB injecté | ✅ 4/4 |
| T6/T7/T8/T9 (distance ≥80) : Nuit injectée | ✅ 4/4 |
| T1-T5/T10 (distance <70) : BTB/Nuit non injectés | ✅ 6/6 |

---

## Vérification spécifique Sprint 1

| Fix | Vérif | Résultat |
|---|---|---|
| **#1** Cap Expert 3500→6500, Conf 2500→4500 | T8 pic 6196m (vs 3500 pre-fix) | ✅ |
| **#2** Floor 100% currentWeeklyElevation | T8 S1=3000 (vs 1500 pre-fix) | ✅ |
| **#4** BTB + Nuit injection ≥ 80km | T6/T8 prompt contiennent les blocs | ✅ |
| **#5a** Senior ≥55 niveau préservé | T5, T7, R3 → expert préservé | ✅ |
| **#6** timeToSeconds reject "km" | "50km (6h50)" → 0 | ✅ |

---

## Verdict deploy Sprint 1 : ✅ GO

**Tous les fixes ciblés sont fonctionnels et n'introduisent aucune régression sur les 5 profils route testés.**

Recommandations post-deploy (hors scope Sprint 1, à inscrire à la roadmap) :
1. **Garde-fou plausibilité chronos** (R4/R5) : reject `timeToSeconds` si valeur > X×distance (ex. 10K > 2h30 = aberrant). Fix #6 actuel ne couvre que la pollution par "km".
2. **Surveiller cas mismatch déclaratif/chrono Confirmé/Expert** (T2, T3, T9) : un chrono lent rétrograde au niveau inférieur, et si current D+ user > cap niveau effectif, le plan est plat ou décroissant. Envisager : message d'accueil signalant le downgrade + invitation à confirmer.
3. **T2/T9 D+ plat ou décroissant** : pas un bug, mais cosmétiquement étrange pour l'utilisateur. À documenter dans le welcome message.

---

## Annexes — outputs détaillés par profil

Voir log complet généré par `node test-sprint1-15-profils.mjs` (script idempotent, réutilisable pour valider futurs sprints).

Détail des `weeklyElev` complets pour profils trail :
- T1 : `[200, 209, 218, 125, 236, 245, 255, 145, 273, 282, 146, 120]` (12 sem)
- T2 : `[600, 600, 600, 330, 600, 600, 600, 330, 600, 600, 300, 240]` (12 sem — plat)
- T3 : `[1500, 1446, 1392, 736, 1285, 1231, 1177, 618, 1069, 1015, 962, 499, 427, 320]` (14 sem — décroissant)
- T4 : `[2500, 2533, 2567, 1430, 2633, 2667, 2700, 1503, 2767, 2800, 2833, 1577, 2900, 2933, 1484, 1200]` (16 sem)
- T5 : idem T4 (50/3000 même params, current proche)
- T6 : `[4000, 4026, 4053, 2243, 4105, 4132, 4158, 2301, 4211, 4237, 4263, 2359, 4316, 4342, 4368, 2417, 4421, 4447, 2237, 1800]` (20 sem)
- T7 : pic 6326 S22 (24 sem)
- T8 : S1 3000 → pic 6196 S22 ✅ Rich-like
- T9 : `[5000, 4978, ... 4543, 2261, 1800]` (24 sem — décroissant)
- T10 : `[300, 318, 336, 195, 373, 391, 409, 235, 445, 464, 241, 200]` (12 sem)
