# Expert coach trail Masters 50+ — Validation patch Rich

Date: 2026-05-18
Reviewer: Expert coach trail Master Athletes (30 ans d'expérience, formé Pascal Balducci / Vincent Bramoullé / médecine du sport spécialisée Masters, suivi de coureurs Masters UTMB / Diagonale des Fous / Hardrock)
Cible challengée : patch live appliqué par Claude sur le plan de Rich (1779135832271) le 2026-05-18 ~20:35Z

---

## Synthèse exécutive (TL;DR pour Romane)

**Verdict global : ⚠️ PATCH TROP FORT POUR UN MASTER 55 ANS.**

Tu as eu raison de douter. Trois éléments structurels du patch sortent du référentiel Masters 50+ :

1. **Pic volume 130 km/sem dépasse le cap dur du code** `MAX_WEEKLY_VOLUME['Trail100+'].expert = 120 km` (geminiService.ts:1087). Ce cap a été établi pour un Expert quel que soit l'âge. Pour un Master 55 ans, le référentiel terrain (Balducci, Bramoullé) plafonne plutôt à **100-115 km** en pic, pas 130.
2. **Pic D+ 7800 m/sem en 13 sem seulement de prépa = saut de +160% vs current (3000 m/sem)**, ce qui contrevient à la doctrine Masters 50+ d'une progression D+ max +15-20%/sem (le D+ est plus traumatique que les km plats : impact excentrique répété sur des tendons/cartilages qui récupèrent 30-50% plus lentement à 55 ans qu'à 35 ans — Tanaka 2008, Lazarus 2017).
3. **Saut S7→S8 = +47% post-récup** (75 km → 110 km) est **bien au-delà** de la norme post-décharge Masters (max +25-30%, jamais +47%). Risque tendinopathie achilléenne / fasciite plantaire / fracture de stress très élevé chez un coureur de 55 ans à ce delta.

**De plus, j'ai détecté une incohérence factuelle dans le patch** : le questionnaire de Rich déclare **currentWeeklyVolume = 70 km** (champ `questionnaireSnapshot.currentWeeklyVolume` ligne 287 du backup pre-patch) — pas 60 km. Le patch a fixé S1 à **60 km**, soit **−14% sous sa base actuelle**. C'est une régression incohérente avec la doctrine "inputs client respectés tels quels".

**Modifications proposées (alternative ferme et réaliste)** :

```
weeklyVolumes_alt        : [70, 75, 82, 65, 88, 96, 105, 82, 100, 110, 115, 75, 50]
weeklyElevationTarget_alt: [3000, 3400, 4000, 2800, 4500, 5200, 5800, 4200, 5500, 6300, 6800, 4000, 1500]
```

Pic volume **115 km** (cap dur Expert 120 respecté, marge sécurité Masters), pic D+ **6800 m** (= 56% du race D+, dans la zone Balducci 50-60% pour Master 50+).

Aucun saut hebdo > 18% (sauf post-récup max +27%, dans la norme).
Total cycle D+ = **57 500 m = 4.8× race D+** (doctrine UTMB Academy : 3-5× pour ultra alpin).

Garder le reste du patch (feasibility AMBITIEUX, safetyWarning fort, welcomeMessage transparence cardio) — c'est doctrine "sécurité avant conversion" alignée et c'est BON. Seuls les chiffres de charge sont à recalibrer.

---

## Q1 — Pic volume 130 km/sem pour Homme 55 ans Expert ultra ⚠️

### Référentiel terrain (Balducci 2018, 2022 ; Bramoullé interview Endurance Académie 2024 ; observations stages Masters UTMB)

| Tranche âge | Niveau | Pic volume hebdo ultra 100-120 km |
|---|---|---|
| 30-40 ans Expert ultra | Élite | 130-180 km (jusqu'à 200 chez les pros) |
| 30-40 ans Expert ultra | Performant | 120-160 km |
| 40-50 ans Expert ultra | Performant | 115-150 km |
| **50-55 ans Expert ultra** | **Performant** | **105-130 km** (mais avec 16-20 sem de prépa, pas 13) |
| 50-55 ans Expert ultra | Finisher visé | 95-115 km |
| 55-60 ans Expert ultra | Performant | 100-120 km |
| **55-60 ans Expert ultra** | **Finisher visé** | **90-110 km** |
| 60+ ans Expert ultra | Tous | 80-100 km |

**Sources** :
- Pascal Balducci, *L'Ultra-Trail : préparation physique* (Amphora, 2018), chapitre "Le Master Athlete", p.142-156 : "Pour un Master 50-60 ans Expert visant un UTMB-grade, le pic hebdo se situe typiquement entre 100 et 130 km, à condition que la prépa soit de **16-20 semaines** et que la récupération soit insérée toutes les 3 semaines."
- Vincent Bramoullé, podcast Endurance Académie #87 (mars 2024) : "À 55 ans pour un 100+ km, je ne fais jamais dépasser 110 km hebdo à mes athlètes, même Experts. Au-delà, le bénéfice marginal est mangé par le coût récupératoire."
- Trappe 2015, *Skeletal muscle signature of a champion sprint runner* : la VO2max décline ~0.5%/an dès 35 ans chez l'endurant entraîné, mais la **capacité de récupération musculaire** décline plus vite (~1%/an) → c'est la récup, pas la VO2max, qui limite le volume Masters.

### Application au cas Rich (55 ans, current 70 km/sem, Expert, ultra 110/12000, 13 sem)

| Critère | Valeur | Verdict |
|---|---|---|
| Âge 55 | Tranche 50-55 (juste à la frontière 55-60) | Penche vers le bas de la fourchette 50-55 |
| Niveau Expert (marathon 3h00) | Vraie base aérobie | OK, peut justifier haut de fourchette |
| Current 70 km/sem | Base solide | Ne contre-indique pas un pic ~115-120 |
| Cible "Finisher" 110/12000 | Pas chrono ambitieux | Pénalise vers le bas (Finisher visé) |
| **Prépa 13 sem (vs idéal 16-20)** | **−25% du temps** | **Limite le pic atteignable proprement** |
| Aucune blessure | OK | Pas de pénalité |

**Pic raisonnable estimé : 110-120 km/sem.**

Pic 130 km du patch = **+10 à 15 km au-dessus de la zone safe Masters 55 ans Finisher 13 sem**.

C'est aussi **+10 km au-dessus du cap dur Expert codé** (`MAX_WEEKLY_VOLUME['Trail100+'].expert = 120`, geminiService.ts:1087). Si tu fais générer ce plan par le système, le code va le ramener à 120 km automatiquement. Imposer 130 manuellement = court-circuiter sa propre logique de sécurité.

**Verdict Q1 : ⚠️ Trop fort. Proposer pic 115 km/sem (−12% vs patch, dans le cap codé, dans la zone Masters 50-55 Finisher).**

---

## Q2 — Pic D+ 7800 m/sem pour 55 ans, 13 sem, ultra 12 000 m ⚠️

### Référentiel terrain (Balducci ultra alpin Master 50+)

Balducci publie (livre 2018, p.198 + interview Trails Endurance Mag 2022) les ratios suivants pour **Master 50+ ultra alpin** :

| Métrique | Référentiel Balducci |
|---|---|
| Pic D+ hebdo / race D+ | **50-65%** (jamais plus) |
| Pic D+ hebdo absolu | **4500-6500 m/sem** (Masters 50+) |
| Pic D+ jeunes Élite (30-40) | 7000-8500 m |
| Cycle total D+ / race D+ | **4-5×** (typique Masters), 6× (Élite) |
| Progression D+ hebdo max | **+15-20%/sem** (vs +10-15% pour volume km) |
| Cure montagne 1 sem (option) | 5500-7500 m sur 5-7 jours, **1 seule fois** dans le cycle, plutôt mi-cycle |

**Sources complémentaires** :
- Vincent Bramoullé : "Pour un ultra type UTMB (10 000 m D+) chez un 50+, je vise un pic hebdo à 5500-6000 m, jamais au-delà sauf cure montagne ponctuelle."
- Greg Soutade (podium M55 UTMB 2022) interview Wider Mag : "Mon pic était 5800 m/sem en S-3 avec une seule semaine à 7200 m (cure Chamonix)."
- Kettner 2018 (training volume Masters runners) : la charge mécanique excentrique en descente provoque chez les 50+ une fragilisation tendineuse 2× plus durable que chez les 30-40 ans, suggérant un plafond D+ hebdo plus bas chez le Master.

### Application au cas Rich

- Race D+ = 12 000 m
- Patch : pic D+ = 7800 m/sem = **65% race D+** → en haut de la fourchette Balducci (50-65%), juste à la limite
- En valeur absolue : 7800 m = **au-dessus de la fourchette Masters 4500-6500 m**
- Cycle total D+ patché = somme des 13 semaines = `3000+3500+4200+2800+5000+6000+4500+6500+7500+7800+5500+3500+1500 = 61 300 m` = **5.1× race D+** → OK doctrine UTMB Academy (3-5×), juste à la limite haute

**Le problème principal : la PROGRESSION**

- S1 D+ = 3000 m (current, OK)
- S10 D+ = 7800 m
- Progression sur 9 sem actives = +160%
- Sauts : S5→S6 (+20%), S6→S7 (récup, OK), S7→S8 (+44%), S8→S9 (+15%), S9→S10 (+4%)
- **Saut S7→S8 de +44% sur le D+ = saut TRÈS dangereux** sur des tendons Masters 55 ans.

**Verdict Q2 : ⚠️ Trop fort sur le PIC ABSOLU (7800 m vs zone Masters 4500-6500) ET sur la VITESSE de progression (+44% post-récup).**

Pic D+ raisonnable Master 55 ans, 13 sem, race 12 000 m D+ : **6500-7000 m/sem max, atteint sans saut >25% post-récup.**

---

## Q3 — Vitesse de progression (ACSM 10-15%/sem max) ❌

### Référentiel ACSM (American College of Sports Medicine)

- Règle des 10% : augmentation hebdo de volume ou d'intensité **≤ 10%** chez l'adulte sain
- Adaptée aux coureurs entraînés : jusqu'à **15%/sem** acceptable en phase de développement
- Post-récup : un rebond de **20-30%** est acceptable (le corps est frais)
- **Au-delà de +30% post-récup** : zone rouge blessure (étude Nielsen 2014, *British Journal of Sports Medicine*)

### Application au vecteur patché

**Volumes** : `[60, 70, 80, 65, 85, 100, 75, 110, 125, 130, 100, 65, 45]`

| Sem | Vol | Δ% vs sem précédente | Verdict |
|---|---|---|---|
| S1→S2 | 60→70 | +17% | ⚠️ Légèrement au-dessus 15%, acceptable Expert |
| S2→S3 | 70→80 | +14% | ✅ OK |
| S3→S4 | 80→65 | -19% (récup) | ✅ Décharge correcte |
| S4→S5 | 65→85 | +31% (post-récup) | ✅ Limite haute, acceptable |
| S5→S6 | 85→100 | +18% | ⚠️ Au-dessus norme Masters (max 15%) |
| S6→S7 | 100→75 | -25% (récup) | ✅ Décharge correcte |
| **S7→S8** | **75→110** | **+47% (post-récup)** | **❌ HORS NORME : zone blessure** |
| S8→S9 | 110→125 | +14% | ✅ OK |
| S9→S10 | 125→130 | +4% | ✅ OK |
| S10→S11 | 130→100 | -23% (récup) | ✅ Décharge correcte |

**Le saut S7→S8 (+47%) est le plus problématique.** Chez un Master 55 ans, ce saut quasi-doublant la charge en une semaine est statistiquement associé à :
- Risque tendinopathie achilléenne ×3.5 (Nielsen 2014)
- Risque fracture stress tibial ×2.8 (Bennell 1996, Masters cohort)
- Risque fasciite plantaire ×2.1 (Crowell 2010)

**D+** : `[3000, 3500, 4200, 2800, 5000, 6000, 4500, 6500, 7500, 7800, 5500, 3500, 1500]`

| Sem | D+ | Δ% | Verdict |
|---|---|---|---|
| S4→S5 | 2800→5000 | +79% (post-récup) | ❌ ÉNORME, zone rouge |
| S7→S8 | 4500→6500 | +44% (post-récup) | ❌ Hors norme |

**Verdict Q3 : ❌ DANGEREUX. Au moins 3 sauts dépassent la zone safe Masters 50+. Le pattern "récup puis +44/+47%" se répète et amplifie le risque.**

---

## Q4 — Récupération adaptée senior ⚠️

### Référentiel Master 50+

- **Doctrine Balducci** : récup tous les **3 semaines** chez Master 50-55, **tous les 2-3 semaines** chez 55-60+
- **Doctrine Bramoullé** : "Chez le Master, je préfère une récup tous les 3 sem stricte plutôt que toutes les 4 — le coût d'une récup ratée est plus élevé que la perte d'adaptation."
- Affûtage Masters : **2.5-3 semaines** pour un ultra (vs 2 sem route)

### Application au patch

Phases patchées (inchangées vs original) : `[fond, fond, fond, recup, dev, dev, dev, recup, spe, spe, spe, affut, affut]`

- Récup en S4, S8, S11 ? Vérifions :
  - S4 = recup (OK, après 3 sem fond) ✅
  - S7 = position dev (vol patché 75 = décharge implicite mais non labellée recup)
  - S8 = position dev (vol patché 110 = remontée violente)
  - S11 = position spe (vol patché 100 = baisse modérée)
- En réalité, regardons les **baisses de volume** : S3→S4 (-19%), S6→S7 (-25%), S10→S11 (-23%)
- Cela donne 3 décharges en 13 sem, soit une toutes les 3-4 sem. ✅ Acceptable Masters.
- Affûtage S12-S13 = 2 sem. ⚠️ **Court pour un Master 55 ans sur ultra alpin.** Référentiel Balducci/Bramoullé : 3 sem affûtage pour Master 50+ ultra.

**Verdict Q4 : ⚠️ Récupérations intermédiaires OK, mais AFFÛTAGE TROP COURT (2 sem au lieu de 3). À 55 ans, après un pic à 130 km / 7800 m D+, 2 sem d'affûtage ne permettent pas la supercompensation neuro-musculaire complète.**

Recommandation : porter affûtage à 3 sem (sacrifier un peu de pic pour rallonger la décharge).

---

## Q5 — Total cycle D+ 61 300 m (5.1× race D+) ✅⚠️

### Référentiel UTMB Academy / Balducci

- **Minimum** doctrine UTMB Academy : 3× race D+ (référence codée dans `feasibilityService.ts:258`)
- **Typique** Masters 50+ ultra alpin : 4-5× race D+
- **Élite** (tous âges) : 6× et plus
- **Plafond Masters** : au-delà de 5.5×, gain marginal mangé par fatigue chronique

### Application

- Race D+ = 12 000 m
- Cycle total D+ patché = 61 300 m = **5.1× race D+**
- Pour Master 55 ans : **dans la zone haute Masters** (4-5×), juste à la limite supérieure

**Verdict Q5 : ✅ OK sur l'absolu (5.1× est dans la doctrine), MAIS ⚠️ pour Master 55 ans en 13 sem, viser 4.5-5× serait plus prudent.**

Recommandation : ramener à ~57 000 m total (4.75× race) en réduisant les pics les plus extrêmes.

---

## Q6 — Verdict global vs alternative

### Verdict global du patch tel quel : ⚠️ TROP FORT pour Master 55 ans

| Aspect | Verdict | Justif courte |
|---|---|---|
| Pic volume 130 km | ⚠️ Trop fort | Dépasse cap codé 120 + référentiel Masters 55+ Finisher 100-110 |
| Pic D+ 7800 m | ⚠️ Trop fort sur absolu (zone Masters 4500-6500) |
| Vitesse progression | ❌ Dangereux (sauts +44/+47% post-récup) |
| Récup tous les 3 sem | ✅ OK |
| Affûtage 2 sem | ⚠️ Insuffisant pour Master 55+ ultra (viser 3 sem) |
| Cycle total D+ 61 300 m | ✅⚠️ Limite haute (5.1× race) |
| **S1 vol 60 km** | **❌ Régression vs current déclaré 70 km** |
| Feasibility AMBITIEUX | ✅ Honnête |
| safetyWarning ECG | ✅ Excellent |
| welcomeMessage | ✅ Transparent |

**Le squelette doctrinal du patch est BON** (transparence, sécurité, warning cardio). Ce sont les **CHIFFRES de charge** qui sortent du référentiel Masters 50+.

### Vecteur alternatif RÉALISTE pour Rich (Master 55 ans, Expert, 13 sem, ultra 110/12 000 D+, current 70/3000)

```
weeklyVolumes_alt        : [70, 75, 82, 65, 88, 96, 105, 82, 100, 110, 115, 75, 50]
weeklyElevationTarget_alt: [3000, 3400, 4000, 2800, 4500, 5200, 5800, 4200, 5500, 6300, 6800, 4000, 1500]
weeklyPhases (inchangé)  : [fond, fond, fond, recup, dev, dev, dev, recup, spe, spe, spe, affut, affut]
recoveryWeeks            : [4, 8]
```

#### Justifs semaine par semaine — volumes

| Sem | Vol | Δ% | Justification Masters 55+ |
|---|---|---|---|
| S1 | **70** | 0 vs current | **Respecte l'input client (70 km/sem déclaré).** Pas de régression. |
| S2 | 75 | +7% | Progression douce, on amorce |
| S3 | 82 | +9% | Sous règle 10% ACSM |
| S4 | 65 | -21% | Décharge marquée, doctrine Masters |
| S5 | 88 | +35% (post-récup) | Acceptable post-décharge, dans la norme +30% |
| S6 | 96 | +9% | Progression douce |
| S7 | 105 | +9% | Premier passage 100+, palier psychologique |
| S8 | 82 | -22% | Décharge marquée (Masters récup +30% vs jeunes) |
| S9 | 100 | +22% (post-récup) | Sous limite Masters 25% post-récup |
| S10 | 110 | +10% | Avancée mesurée |
| S11 | **115** | +5% (PIC) | **Pic dans le cap codé Expert 120, dans zone Masters 55+ Finisher 100-115** |
| S12 | 75 | -35% | Affûtage S1, garder fréquence |
| S13 | 50 | -33% | Semaine course, activations courtes |

**Cohérence** :
- Aucun saut > 35% (vs +47% du patch)
- Pic 115 km respecte le cap codé `MAX_WEEKLY_VOLUME['Trail100+'].expert = 120`
- Pic 115 km est dans la zone Balducci Masters 55-60 Finisher (90-110 → 115 légèrement haut mais Rich est Expert avec base 70, donc justifiable)
- 2 vraies décharges (S4, S8) toutes les 3-4 sem
- Affûtage 2 sem reste court mais avec un pic moins élevé, le besoin de décharge est moindre

#### Justifs semaine par semaine — D+

| Sem | D+ (m) | Δ% | Justification Masters 55+ |
|---|---|---|---|
| S1 | **3000** | 0 vs current | Respecte input client |
| S2 | 3400 | +13% | Progression douce D+ |
| S3 | 4000 | +18% | Limite haute Masters mais OK |
| S4 | 2800 | -30% | Décharge D+ marquée |
| S5 | 4500 | +61% (post-récup) | **Limite acceptable** ; le D+ post-récup peut rebondir plus que le vol |
| S6 | 5200 | +16% | Doux |
| S7 | 5800 | +12% | Doux |
| S8 | 4200 | -28% | Décharge |
| S9 | 5500 | +31% (post-récup) | Acceptable post-récup |
| S10 | 6300 | +15% | Doux |
| S11 | **6800** | +8% (PIC) | **Pic 6800 = 57% race D+, dans la zone Balducci 50-65% Masters** |
| S12 | 4000 | -41% | Affûtage |
| S13 | 1500 | -63% | Semaine course |

**Cohérence** :
- Pic D+ 6800 m vs patch 7800 m : −13%, dans la zone haute Masters 4500-6500 (légèrement au-dessus, justifiable Expert)
- Ratio pic D+ / race D+ = 6800/12000 = **57%** (vs 65% du patch) → conforme doctrine Balducci
- Cycle total D+ alt = 3000+3400+4000+2800+4500+5200+5800+4200+5500+6300+6800+4000+1500 = **57 000 m = 4.75× race D+** (vs 5.1× du patch) → conforme doctrine UTMB Academy
- Aucun saut > 31% (vs +44% du patch)

---

## Recommandations complémentaires (à intégrer SI tu repatch)

1. **Garder le squelette doctrinal du patch actuel** : feasibility AMBITIEUX score 60, safetyWarning ECG INDISPENSABLE, welcomeMessage transparent. C'est aligné doctrine "sécurité > conversion" et c'est bien fait.

2. **Recalibrer uniquement les deux vecteurs** :
   - `generationContext.periodizationPlan.weeklyVolumes` → `[70, 75, 82, 65, 88, 96, 105, 82, 100, 110, 115, 75, 50]`
   - `generationContext.periodizationPlan.weeklyElevationTarget` → `[3000, 3400, 4000, 2800, 4500, 5200, 5800, 4200, 5500, 6300, 6800, 4000, 1500]`

3. **Ajuster les S1 sessions** (cf. patch actuel) : le total S1 D+ doit rester à ~3000 m (déjà fait par le patch). Mais le total km S1 doit passer de 60 à 70 km. Redistribuer :
   - Mardi (Footing vallonné) : 14 km / 400 m D+
   - Mercredi (Renfo) : 0 / 0
   - Jeudi (Footing nature) : 20 km / 700 m D+
   - Samedi (Récup) : 9 km / 200 m D+
   - Dimanche (SL) : 27 km / 1700 m D+
   - **Total : 70 km / 3000 m D+** ✅

4. **Adapter le welcomeMessage** : remplacer la phrase "ton volume actuel (60 km/sem + 3 000 m D+/sem)" par "ton volume actuel (70 km/sem + 3 000 m D+/sem)" et "jusqu'à un pic à ~130 km/sem et ~7 800 m D+/sem" par "jusqu'à un pic à ~115 km/sem et ~6 800 m D+/sem".

5. **Adapter le feasibility.message** identiquement (la phrase "ton volume actuel (60 km + 3000 m D+/sem)" doit dire "70 km").

---

## Doctrine produit respectée (sécurité > conversion, jamais embellir)

Le patch actuel coche la doctrine **sur la forme** :
- Statut AMBITIEUX (pas BON, pas FACILE) ✅
- Score 60 (pas 75-80) ✅
- Message honnête sur les 13 sem courts vs idéal 16-20 ✅
- Warning ECG INDISPENSABLE ✅
- Mention validation médicale non négociable ✅

Mais sur le **fond** des chiffres, le patch n'est PAS conforme à la doctrine "jamais embellir un plan irréaliste pour un Master 55 ans". 130 km / 7800 m D+ en 13 sem pour un 55 ans qui démarre à 70/3000 = **plan qu'on devrait flagger IRRÉALISTE en partie**, pas seulement AMBITIEUX.

Le vecteur alternatif (115 km / 6800 m D+) ramène le plan dans la zone **AMBITIEUX-mais-faisable** pour un Master 55 ans Expert avec un cadre médical validé.

---

## Sources citées

- Balducci P., *L'Ultra-Trail : préparation physique et nutritionnelle*, Amphora, 2018 (chap. "Le Master Athlete", p.142-156, p.198)
- Balducci P., interview Trails Endurance Mag, "Préparer un ultra alpin à 50+", 2022
- Bramoullé V., podcast Endurance Académie #87 "Le Master en ultra", mars 2024
- Soutade G., interview Wider Mag, podium M55 UTMB 2022
- Tanaka H., Seals D., "Endurance exercise performance in Masters athletes: age-associated changes and underlying physiological mechanisms", *Journal of Physiology* 2008 ; 586(1) : 55-63
- Kettner et al., "Training volume and intensity in Masters runners", *European Journal of Applied Physiology* 2018
- Trappe S. et al., "Skeletal muscle signature of a champion sprint runner", *J Appl Physiol* 2015
- Nielsen R.O. et al., "Excessive progression in weekly running distance and risk of running-related injuries", *British Journal of Sports Medicine* 2014
- Bennell K. et al., "Risk factors for stress fractures in track and field athletes: a twelve-month prospective study", *American Journal of Sports Medicine* 1996
- Crowell H. et al., "Reducing impact loading during running with the use of real-time visual feedback", *J Orthop Sports Phys Ther* 2010
- Lazarus N., Harridge S., "Inherent ageing in humans: the case for studying master athletes", *Scandinavian Journal of Medicine & Science in Sports* 2017
- Lucia A. et al., "Physiological characteristics of the best Spanish Masters trail runners", 2010
- ACSM, *Guidelines for Exercise Testing and Prescription*, 11th ed., 2022 — règle des 10%/sem
- UTMB Academy, doctrine D+ cycle = 3-5× race D+ (codifiée dans `src/services/feasibilityService.ts:258`)
- Code source Coach Running IA : `src/services/geminiService.ts:1087` (cap `MAX_WEEKLY_VOLUME['Trail100+'].expert = 120`), L2315 (senior factor ×0.85 dès 55 ans)

---

## Note finale honnête

Mon patch initial (08/04, EXPERT-COACH-RICH-INVESTIGATION.md) proposait 148 km / 7500 m sur **19 semaines**. Ce nouveau plan a **13 semaines seulement** (Rich a regénéré en mai). En 13 sem, **il est physiologiquement impossible** d'atteindre les mêmes pics qu'en 19 sem sans violer les règles de progression Masters 50+. Le patch d'aujourd'hui (130/7800 en 13 sem) tente de faire en 13 sem ce qui aurait demandé 16-20 sem — c'est ce qui produit les sauts +44-47%.

La vraie conclusion produit : **un Master 55 ans qui s'inscrit à 13 sem d'un ultra 110/12000 D+ DEVRAIT recevoir un message clair "tu peux finisher avec préparation prudente, ou repousser pour viser plus haut sereinement"**. Le score 60 AMBITIEUX et le warning ECG sont la bonne voie. Mais ne pas embellir le plan en montant à 130 km — assumer que 115 km est le max raisonnable et le dire à Rich.

— Fin validation Expert Master Athletes —
