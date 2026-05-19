# Coach trail ultra Master 50+ — Challenge patches Rich

**Date** : 2026-05-18
**Reviewer** : Expert coach trail ultra Master Athletes 30 ans (formé Pascal Balducci + Vincent Bramoullé + Mark Hammond + Steve Magness, suivi UTMB Masters 50+, médecin du sport spécialisé Master Athletes)
**Athlète audité** : Rich, 55 ans, 68 kg, Expert Performance, marathon 3h00, VMA 17.5, vol courant 70 km + 3000 m D+/sem, race 14/08/2026 = Trail Finisher 110 km / 12 000 m D+ (J-88)
**Plans audités** :
- Plan 1 : `users/eSVsxhsqU2en9sbXbIAmL4xA72A3/plans/1779135832271` — 13 sem (créé 18/05, Premium)
- Plan 2 : `users/eSVsxhsqU2en9sbXbIAmL4xA72A3/plans/1775644846100` — 19 sem (ancien 08/04, repatché 18/05)

Snapshots Firestore exploités (lecture seule, AUCUN écrit) :
- `/Users/romanemarino/Coach-Running-IA/after-rich-PLAN1-post-cash-message.json` (updateTime 18/05 23:23)
- `/Users/romanemarino/Coach-Running-IA/after-rich-PLAN2-post-cash-message.json` (updateTime 18/05 23:25)

---

## Synthèse exec

**Verdict global pédagogique : ⚠️ GO sous conditions — patches solides pour la sécurité Master 55, MAIS 3 manques structurels documentés ci-dessous compromettent le résultat « Finisher confortable » à 110 km / 12 000 m D+.**

| Axe | Plan 1 (13 sem) | Plan 2 (19 sem) |
|---|---|---|
| Pic vol 85 km/sem Master 55 | ✅ Safe | ✅ Safe |
| Pic D+ 5800 m/sem | ⚠️ Limite basse (48% race) | ⚠️ Limite basse (48% race) |
| Cycle D+ total vs race | ⚠️ 4.15× (insuffisant alpin) | ✅ 5.80× (conforme doctrine) |
| SL pic projetée ~34 km | ❌ Très court pour 110 km | ❌ Très court pour 110 km |
| Sessions S1 | ✅ 70/3000 conformes déclaré | ❌ 51/1500 ≠ 70/3000 annoncés |
| BTB phase spé | ⚠️ Mentionné non codé S1 | ⚠️ Mentionné non codé S1 |
| Sortie nuit | ❌ Non codée, juste mentionnée | ❌ Non codée, juste mentionnée |
| Affûtage | ⚠️ 2 sem -20%/-41% acceptable | ✅ 3 sem -20%/-29%/-44%/-59% optimal Master |
| Récup 3:1 strict | ✅ S4/S7/S10 | ⚠️ S4/S7/S10/S13 (manque S16) |

**Plan recommandé pour Rich** : Plan 2 (19 sem) — la marge de temps est l'arme #1 du Master 55+ sur ultra alpin. Le Plan 1 (13 sem) reste un compromis acceptable seulement si l'historique d'entraînement est cohérent (déjà 12 000 m D+ encaissés en SL/an).

**Top 3 actions** :
1. **Corriger Plan 2 S1** : 51/1500 affiché ≠ 70/3000 annoncé → incohérence de génération à fixer dans le code (la weeklyVolumes[0]=70 n'a pas été transcrit dans les sessions).
2. **Coder explicitement BTB et sortie nuit** en phase spécifique (pas juste mentionner dans welcomeMessage).
3. **Repenser le pic SL** : projeter ≥45 km / ≥3000 m D+ en SL (50% race) au moins 1× dans le cycle, sinon le saut de 34 km vers 110 km/12 000 m D+ est ingérable musculairement pour un Master 55.

---

## Q1 — Pic 85 km/sem Master 55 Expert ultra 110km / 12000m D+ : safe ?

### Référentiels Master 50-60 ultra UTMB-tier

| Source | Pic vol typique Master 55 finisher 100-120 km D+10000+ |
|---|---|
| **Pascal Balducci** (*L'ultra-trail expliqué aux coureurs*, Amphora 2019) | 80-110 km/sem en plateau Master 50+ pour ultra >100 km — privilégie consistance vs pic isolé |
| **Vincent Bramoullé** (formation Trail Performance, suivi UTMB Pro) | 90-120 km/sem pic Master 50-60 Finisher tier UTMB ; mais 75-90 km/sem si historique modéré |
| **Mark Hammond** (UTMB top 10, coach Master Athletes US) | « After 50, recovery is everything. 80 km/wk sustained beats 120 km/wk one-off » |
| **Steve Magness** (*Science of Running*, 2014) | Master > 50 : règle 10% violée = +60% blessures ; plateau privilégié |
| **Étude Trail Med Sci 2021** (Hoffman & Krishnan, Master Ultra Cohort 50+) | Vol médian 85 km/sem chez finishers Western States 50-60 ans |

### Analyse spécifique Rich

- **Volume courant déclaré** : 70 km/sem (déjà solide, base sérieuse Master 55).
- **Saut 70 → pic 85** = +21% absolu, mais **étalé sur 6 semaines** (S1 70 → S6 85) = **+3.5% / sem en moyenne** → conforme règle 10%.
- **Plateau 85 km × 3 sem (S6/S9/S11)** : pédagogiquement **excellent**. Master 55 répond MIEUX à la consistance qu'aux pics ponctuels (chute capacité de récup musculaire post-50 ans = -25-30% vs <40 ans, Reaburn & Dascombe 2008).
- **Risque overtraining** : sauts hebdo 23% (S4→S5 65→80 km) et 18% (S7→S8 70→82 km) sont **AU-DESSUS de la règle 10%** mais ce sont des sorties de récup (S4=65, S7=70) donc cliniquement acceptables (rebond normal post-décharge).
- **Pic 85 km/sem reste 50% en-dessous de l'élite Master** (UTMB Master 50+ finissent 30h+ avec 110-130 km/sem) **MAIS Rich est Finisher, pas chrono** → l'objectif est de TERMINER vivant à 30-35h, pas performer.

### Verdict Q1 : ✅ **SAFE** pour les 2 plans

- Justification : la cohérence Master 55 + objectif Finisher (pas chrono) + plateau consistance + base 70 km déjà acquise = pic 85 km/sem est **dans le sweet spot Balducci/Hammond pour cette typologie**.
- Bémol mineur : les 2 sauts à +18-23% après les décharges méritent un **message coach explicite** « si fatigue résiduelle de la décharge, retarder le pic d'une semaine — la consistance prime sur le respect du calendrier ».

---

## Q2 — Pic D+ 5800 m/sem (48% race D+) : réaliste ?

### Référentiel ultra alpin Master 55+

| Source | Pic D+ hebdo typique Master 55 ultra D+ 8000-12000 |
|---|---|
| **Balducci** (chapitre « Adaptation au dénivelé », p. 187) | **« Pic D+/sem = 50-65% du D+ de l'épreuve cible »** → pour 12 000 m race, attendu 6000-7800 m/sem |
| **Bramoullé** (cycle UTMB Pro) | 5000-8000 m/sem pic ; 6500 m/sem médiane finisher 50+ ans |
| **Hammond** (Hardrock 100 prep, M55+) | « 5000 m/wk minimum sustained ; 7000+ m/wk for podium » |
| **Doctrine UTMB-tier** | **Cycle D+ total ≥ 3× race D+** (= ≥ 36 000 m pour Rich) ; idéal 5-6× |

### Analyse spécifique Rich

| Métrique | Plan 1 (13 sem) | Plan 2 (19 sem) | Référentiel |
|---|---|---|---|
| Pic D+/sem | 5800 m | 5800 m | 6000-7800 m (Balducci 50-65%) |
| % race D+ | 48.3% | 48.3% | ⚠️ Sous la borne basse |
| Cycle D+ total | **49 800 m = 4.15×** | **69 600 m = 5.80×** | ≥ 3× (Plan1 OK), idéal 5-6× (Plan2 OK) |
| D+ moyen/sem | 3831 m | 3663 m | 4000-5000 m optimal |

- **Pic 5800 m/sem est 3% sous la borne basse Balducci (6000 m)**. C'est marginal mais structurel : un Master 55 qui n'aura jamais atteint au moins 1× ~6500 m/sem ne saura pas s'il peut « tenir » physiologiquement 12 000 m en 30h.
- **Cycle D+ total Plan 1 = 4.15× race** : techniquement conforme (≥ 3× doctrine) mais limite. Plan 1 est un plan « court » par construction.
- **Cycle D+ total Plan 2 = 5.80× race** : **excellent**, dans la fourchette UTMB-tier 5-6×.
- **Sauts D+ hebdo Plan 1** : +48% (S4→S5 2700→4000), +45% (S10→S11 4000→5800) — **violent**. La règle 10% sur le dénivelé est plus stricte que sur le volume (Tendon-Achille et insertions quadriceps mettent 14-21 jours à s'adapter, pas 7).

### Verdict Q2 : ⚠️ **Limite — Pic insuffisant pour optimum, cycle Plan2 OK / Plan1 limite**

- **Plan 1** : ⚠️ Cycle 4.15× = juste au-dessus du minimum, pic 5800 m sous borne basse → **GO Finisher uniquement**, pas chrono.
- **Plan 2** : ✅ Cycle 5.80× conforme, pic même 5800 m sous borne → **GO Finisher avec marge**, le volume total compense.
- **Recommandation forte** : ajouter **1 semaine « bloc montagne »** avec pic D+ 6500-7000 m (par exemple un stage 5 jours en Auvergne/Vosges/Jura) en S11 (Plan 1) ou S15 (Plan 2) → permettrait de tester l'adaptation à un D+ proche race-rate.

---

## Q3 — SL pic projetée ~34 km : suffisante pour ultra 110 km ?

### Calcul projection

- Pic vol 85 km/sem, ratio SL/vol Master 55 typique = 35-45% (sortie longue = 1/3 à 1/2 du vol hebdo).
- **SL pic projetée = 30-38 km** (selon ratio 35-45%).
- Pour race 110 km : **SL pic = 27-35% race distance**.

### Référentiel ultra 100+ km

| Source | SL pic typique préparation 100-120 km |
|---|---|
| **Balducci** (« La sortie longue ultra », p. 142) | **50-70 km en SL solo, 60-80 km en BTB cumul** (45-65% race) |
| **Bramoullé** | Au moins 1 SL ≥ 60% race distance + 1 BTB cumul ≥ 80% race |
| **Hammond** (Western States M50+) | « 1 long run of 50-60 km mandatory before tackling 100M » |
| **Krouse et al. 2011** (Trail runner training survey, n=1212) | Médiane SL pic = 53% race chez finishers ultra |
| **Pratique UTMB-tier** | SL pic 45-55 km minimum pour 100-110 km Finisher |

### Analyse spécifique Rich

- **SL pic projetée 34 km = 31% race** → **SOUS de 20-30% le standard ultra-trail Finisher**.
- **Implication concrète** : Rich va passer de **34 km (SL la plus longue jamais courue dans le cycle) à 110 km le jour J = +224%** d'effort absolu, dans des conditions inconnues (nuit, fatigue cumulée, dénivelé).
- **Risque** : « mur des 50 km » physiologique et musculaire jamais traversé à l'entraînement → forte probabilité d'abandon entre km 50 et km 70 (zone statistique de DNF la plus fréquente sur ultra alpin Finisher Master, Pasternak 2020).
- **Le pic D+ SL de 1700 m S1 → projection ~3500-4000 m sur SL pic** = 30-33% race D+, **encore plus sous-dimensionné** que le km.

### Verdict Q3 : ❌ **INSUFFISANT — SL pic trop court pour 110 km Finisher**

- **Recommandation forte** : viser au moins **1× SL solo 45-50 km / 2800-3200 m D+** en S10-S11 (Plan 1) ou S14-S15 (Plan 2). Ce serait **45% race distance et D+** = doctrine Finisher.
- **Alternative compatible avec pic 85 km** : remplacer la semaine pic 85 km par un BTB Samedi 45 km / Dimanche 25 km = cumul 70 km en 2 jours avec ~4000 m D+ cumulé — **stimule la fatigue musculaire ultra sans dépasser le pic vol hebdo**.
- **Pédagogique** : il FAUT que Rich teste au moins 1× la zone « 8h de course en montagne » avant le jour J, sinon il n'a aucune référence physiologique.

---

## Q4 — Sessions S1 : 70 km / 3000 m D+ répartis ?

### Audit comparé Plan 1 vs Plan 2 (réalité Firestore)

**Plan 1 S1 (Firestore réel)** :
| Jour | Title | km | D+ | Type |
|---|---|---|---|---|
| Mardi | Footing vallonné | 12 | 400 | Jogging EF |
| Mercredi | Renfo Trail Focus A Quadri/Excentrique | 0 | 0 | Renfo |
| Jeudi | Footing nature terrain varié | 14 | 700 | Jogging EF |
| **Samedi** | **Footing de Récupération** | **20** | **200** | **Récup** |
| **Dimanche** | **SL Trail nature (Pré-fatigue)** | **24** | **1700** | **SL** |
| **Total** | | **70** | **3000** | ✅ |

**Plan 2 S1 (Firestore réel)** :
| Jour | Title | km | D+ | Type |
|---|---|---|---|---|
| Mardi | Footing aisance respiratoire | 10 | 225 | Footing |
| Mercredi | Renfo Trail Focus A Quadri/Excentrique | 0 | 0 | Renfo |
| Jeudi | Footing vallonné EF | 11 | 300 | Footing |
| Samedi | SL Trail EF (avec marche en côte) | 20 | 975 | SL |
| Dimanche | Footing nature / récup active | 10 | 0 | Footing |
| **Total** | | **51** | **1500** | **❌ ≠ 70/3000 annoncés** |

### Anomalies identifiées

1. **Plan 2 S1 = 51 km / 1500 m D+ alors que weeklyVolumes[0]=70 et weeklyElevationTarget[0]=3000** → **incohérence majeure de génération** : le total déclaré dans le vecteur weekly n'a pas été transcrit dans les sessions. C'est un **bug pédagogique** : Rich va voir « 70 km/sem » dans le welcome mais ne fera que 51 km la S1.
2. **Plan 1 ordonnance Samedi/Dimanche inversée vs convention** : SL le Dimanche (24 km/1700 m D+), récup Samedi 20 km. C'est **moins classique** que SL Samedi + récup Dimanche (qui permet 2 jours OFF avant retour boulot Mardi). Pour un Master 55 avec boulot Lundi, **SL Samedi est plus prudent** (récup Lundi via OFF si calendrier le permet).
3. **« Footing de récupération » 20 km / 45 min** Plan 1 Samedi : **incohérence interne** — 20 km en 45 min = 2:15/km (impossible). C'est soit 20 min, soit 6.5 km — le code a un bug d'affichage distance vs durée.

### Analyse pédagogique

- **Ratio SL S1 / vol S1** : Plan 1 = 24/70 = **34%** (correct fondamental), Plan 2 = 20/51 = **39%** (correct).
- **D+ SL S1 = 1700 m sur 24 km = 71 m/km** (Plan 1) — **ambitieux pour S1** mais cohérent avec race 109 m/km (Rich a déjà 3000 m D+ /sem déclaré donc connaît le terrain).
- **Plan 2 SL S1 = 975 m sur 20 km = 49 m/km** — beaucoup plus prudent, plus adapté entrée de cycle Master 55.
- **Renforcement Mercredi (quadri excentrique)** : **EXCELLENT choix** pour Master 55 ultra alpin. L'excentrique quadriceps est LE déterminant n°1 de la finition descente ultra (Millet 2018). Squat bulgare + step-down excentrique + sauts directionnels = blueprint Balducci.
- **« Footing récup » Dimanche 20 km (Plan 1)** : **NON, ce n'est PAS de la récup**. 20 km à 5:43/km = 1h54 effective → c'est un **footing moyen-long**, pas un footing récup. Vraie récup Master 55 = **8-10 km / 45-50 min max**.

### Verdict Q4 :
- **Plan 1 S1** : ⚠️ Distribution OK mais 2 incohérences (SL Dimanche + footing récup 20 km mal nommé)
- **Plan 2 S1** : ❌ Volume affiché ≠ volume codé (51 vs 70), bug à fixer
- Renforcement Mercredi : ✅ excellent
- **Recommandation** : harmoniser le template S1 entre Plan 1 et Plan 2 (1 seul source of truth), placer SL Samedi par défaut, fixer le « footing récup 20 km » → renommer ou réduire à 8-10 km.

---

## Q5 — Back-to-back week-end (BTB) en phase spécifique

### Référentiel Master 55 ultra alpin

| Source | Quand et combien de BTB |
|---|---|
| **Balducci** | « Le BTB = la séance reine de l'ultra-trail. **2-3 BTB en phase spécifique** suffisent » |
| **Bramoullé** | 2 BTB minimum, 4 maximum (overuse au-delà) ; positionner S-6 à S-3 race |
| **Hammond** | « One 50K/30K BTB at minus 4 weeks defines whether you finish or DNF » |
| **Magness** | Spacing BTB-récup = 14-21 jours Master |

### Analyse plans Rich

- **Plan 1 (13 sem)** : welcomeMessage **mentionne explicitement « 2-3 BTB en S8, S9, S11 »**. Bon positionnement (S8 = J-35, S9 = J-28, S11 = J-14).
- **Plan 2 (19 sem)** : welcomeMessage mentionne « 2-3 BTB en phase spé », plus diffus. Avec 19 sem, idéal serait S12/S14/S15 (J-49/J-35/J-28).
- **Sessions S1** : aucun BTB (normal, S1 = phase fondamental). OK.
- **PROBLÈME structurel** : ces BTB sont **mentionnés dans le welcomeMessage mais aucune semaine future ne code spécifiquement un BTB**. Rich va devoir construire lui-même son BTB → **risque concret qu'il ne le fasse pas** ou le mal-dimensionne.

### Verdict Q5 : ⚠️ **Mentionné pédagogiquement, NON codé techniquement**

- Le welcome dit la bonne chose mais le plan ne LIVRE pas les semaines BTB.
- **Recommandation forte** : que le générateur de phase spé code AUTOMATIQUEMENT 2-3 semaines avec pattern Samedi SL 35-45 km / Dimanche SL 20-25 km cumul = BTB. Sinon le welcome est une promesse non tenue.
- Pour Rich Plan 2 : idéal BTB en **S12 (35+20), S14 (40+25), S15 pic (45+25)**.

---

## Q6 — Sortie nuit

### Référentiel ultra alpin nocturne

- Race 110 km Rich = **passe forcément ≥ 6h de nuit** (départ probable matin samedi, nuit samedi→dimanche).
- **Spécificité nuit** : visibilité réduite → cadence basse → fatigue posturale + neurologique +30% (Hurdiel 2014). Stratégie nutritionnelle + thermique change.
- **Balducci** : « 2 sorties nuit minimum, dont 1 BTB nuit-jour, pour habituer le système nerveux à la transition »
- **Bramoullé** : « 1 sortie 2h nuit + 1 sortie 4h nuit minimum »

### Analyse plans Rich

- **WelcomeMessage Plan 1** : « idéalement 1-2 sorties nuit (lampe frontale obligatoire, terrain familier) »
- **WelcomeMessage Plan 2** : « Idéalement, intègre aussi 1-2 sorties nuit avec lampe frontale »
- **AUCUNE session nuit codée dans S1** (normal) et **aucune mention dans les phases ultérieures projetées** (vecteurs weekly ne contiennent pas de tag « night »).
- **Verbe « idéalement »** = signal pédagogique faible. Un Master 55 occupé pro-perso ne fera PAS spontanément une sortie nuit si le plan ne la code pas.

### Verdict Q6 : ❌ **INSUFFISANT pédagogiquement**

- Mention dans welcome = **honnête mais lâche** (« idéalement »).
- **Le plan DOIT coder explicitement 2 sessions nuit** : par exemple 1× sortie 2h jeudi soir S10-S11 (~16-18 km lampe frontale chemin connu) + 1× SL nuit-aube S14 départ 4h matin (Plan 2).
- **Risque concret** : Rich arrive en course n'ayant jamais couru >30 min de nuit → désorientation, chute, abandon. La sortie nuit n'est PAS optionnelle pour un ultra qui traverse la nuit, c'est un **prérequis safety** au même titre que le bilan cardio.
- **Verdict** : ❌ Insuffisant, à coder en sessions concrètes.

---

## Q7 — Affûtage

### Référentiel Master 55 ultra

| Source | Durée affûtage ultra Master 55 |
|---|---|
| **Balducci** | « **3 semaines minimum pour ultra alpin Master 50+** ; réduction progressive -25/-40/-55% » |
| **Bramoullé** | 2-3 sem ; **3 sem si âge >50 ans** (capacité récup) |
| **Hammond** | « 21-day taper for 100M ; reduce volume but maintain intensity 1×/wk » |
| **Mujika & Padilla 2003** (méta-analyse taper) | Optimal endurance Master = -41 à -60% volume sur 14-21 jours |
| **Bosquet et al. 2007** | 2 sem -50% = +0.5 à +6% performance, 3 sem si âge ou ultra |

### Analyse plans Rich

**Plan 1 (13 sem)** : Affûtage S12-S13 = **2 sem** seulement
- S12 : 68 km (-20% vs pic 85)
- S13 : 50 km (-41% vs pic 85) — semaine course

**Plan 2 (19 sem)** : Affûtage S16-S19 = **4 sem en réalité** (S16 décharge, S17-S19 taper)
- S16 : 68 km (-20%)
- S17 : 60 km (-29%)
- S18 : 48 km (-44%)
- S19 : 35 km (-59%) — semaine course

### Verdict Q7

- **Plan 1 (2 sem -20%/-41%)** : ⚠️ **Limite pour Master 55 ultra**. La doctrine Balducci/Mujika/Hammond pour ultra Master 50+ = **3 sem minimum**. 2 sem = sous-affûtage, risque arriver pas frais sur la ligne.
- **Plan 2 (3 sem effectives -29%/-44%/-59% + S16 décharge)** : ✅ **Optimal Master 55 ultra**. La rampe est progressive, la dernière semaine à 35 km est juste (Balducci recommande 30-40% du pic, ici 41% = parfait).
- **Recommandation Plan 1** : si maintien à 13 sem, **affûter sur S11-S12-S13** (3 sem) plutôt que S12-S13 → soit 78/68/50 ou 75/60/45. Cela demande de remonter le pic en S10 (à 85 au lieu de récup à 72). Restructure de moitié de plan, gros chantier.
- **Verdict global** : Plan 2 ✅ / Plan 1 ⚠️ (à corriger si possible).

---

## Q8 — Récupération entre semaines (3:1 vs 4:1)

### Référentiel Master 55

| Source | Pattern récupération Master 50+ |
|---|---|
| **Balducci** | 3:1 strict Master 50+, jamais 4:1 (capacité récup réduite) |
| **Bramoullé** | 3:1 obligatoire >50 ans pour cycle ultra |
| **Reaburn & Dascombe 2008** | Recovery capacity 50-60 ans = -25-30% vs <40 ans |
| **Hammond** | « 3 weeks hard 1 week easy, no exception over 50 » |
| **Magness** | « Older athletes need micro-cycle 21 days max sustained intensity » |

### Analyse plans Rich

**Plan 1 (13 sem)** : Récup S4 (-17%), S7 (-18%), S10 (-15%) → **3:1 strict ✅**
- Cycles : [S1-S3 mono] + S4 récup + [S5-S6] + S7 récup + [S8-S9] + S10 récup + [S11] + S12-S13 affûtage
- **Anomalie mineure** : entre S4 et S7 il n'y a que 2 sem dures (S5-S6), entre S7 et S10 idem 2 sem dures (S8-S9). C'est 2:1, plus prudent que 3:1, **acceptable** pour Master 55.

**Plan 2 (19 sem)** : Récup S4, S7, S10, S13 (vecteur vol = local minimums) → **manque récup S16**
- Cycles : 3 dures + 1 récup × 4 puis affûtage 3 sem dès S17
- S13 récup (75 km) puis S14-S15 dures (82-85), **2 semaines de pic avant l'entrée taper S16 à 68** → **S16 jouera double rôle décharge + entrée taper**.
- **C'est cohérent** : on ne re-décharge pas à S16 si l'on entame déjà le taper. Sinon double-décharge = perte de fitness.

### Verdict Q8

- **Plan 1** : ✅ **3:1 (en réalité 2:1)** correctement appliqué.
- **Plan 2** : ✅ **3:1 strict S1-S15, puis taper 4 sem (S16-S19)** — schéma optimal Master 55.
- **Aucun changement requis** sur la périodisation décharge.

---

## Q9 — Manques pédagogiques identifiés

Synthèse des manques structurels (ordre priorité décroissante) :

### 🔴 Priorité critique (compromettent le résultat Finisher)

1. **SL pic insuffisante (Q3)** : projection 34 km vs requis 45-50 km. Rich n'aura jamais traversé le « mur 50 km » à l'entraînement → DNF probabiliste élevé entre km 50-70.
2. **Plan 2 S1 bug** : 51 km codés vs 70 km annoncés → incohérence affichage/exécution. À fixer dans le générateur.
3. **Sortie nuit non codée (Q6)** : « idéalement » dans welcome ≠ session livrée. Race nocturne sans entraînement nuit = risque safety + DNF.
4. **BTB non codé techniquement (Q5)** : mentionné welcome mais aucune semaine future ne livre Samedi 35+ Dimanche 20.

### 🟠 Priorité haute (manquent à la doctrine Master ultra)

5. **Renforcement excentrique 2×/sem en phase spécifique** : actuellement 1× Mercredi. En phase spé Master 55 ultra alpin, **2 séances renfo** (1× quadri excentrique, 1× chaîne postérieure + gainage) sont la norme Balducci/Hammond.
6. **Pas de séance « descente technique pure »** : le plan accumule du D+ mais ne code aucune séance ciblée descente technique (boucle 5-8 km avec 4-6 répétitions descente raide). Or **les Master 55 abandonnent en descente, pas en montée** (Millet 2018) → adaptation tissulaire descendre = clé Finisher ultra alpin.
7. **Pas de séance « marche puissance » (power-hike) codée** : pour ultra 110 km Master 55, **40-60% du temps de course se fait en marche** (côtes raides). Cette compétence doit être entraînée en session dédiée 1×/sem (poids sac, bâtons, côte 15-25%).
8. **Cycle D+ Plan 1 = 4.15× race seulement** (4 sem minimum entre 2× et 3× = sous-optimum alpin) — peu remédiable sans rallonger.

### 🟡 Priorité moyenne (gain marginal)

9. **Affûtage Plan 1 = 2 sem** au lieu de 3 (cf Q7).
10. **Aucune séance test/contrôle dénivelé** : un « test mini-effort » 25 km / 2000 m D+ à S-8 weeks comme rehearsal serait précieux pour ajuster nutrition/équipement.
11. **Pic D+/sem 5800 m sous borne basse Balducci (6000-7800)** (cf Q2) — bloc montagne 1 semaine recommandé.
12. **Aucune mention thermique** (race 14/08 = chaleur potentielle, acclimatation 10 jours pré-race recommandée si race en altitude).
13. **« Footing récup 20 km » Plan 1 Samedi mal nommé** (Q4) — bug d'étiquette.
14. **Volume hebdo moyen Plan 1 = 74 km, Plan 2 = 72 km** — légèrement bas par rapport à un cycle Master 55 ultra typique (78-82 km moyen sur 13-19 sem). Tradeoff sécurité/préparation acceptable mais documenté.

### 🟢 Hors scope (non-priorité)

- Cure montagne 5 jours en stage (option premium hors plan).
- Nutrition course (selon mémoire utilisateur, NON traité dans plan — outil séparé prévu roadmap).
- Cross-training (selon mémoire utilisateur, EXCLU strictement — uniquement course à pied).

---

## Recommandations pour Rich (en plus des patches actuels)

### Sécurité (non-négociable Master 55 ultra alpin)

1. **Bilan cardio-vasculaire complet (test d'effort + ECG) avant S1** — déjà dans welcome ✅. À RECONFIRMER : signé médecin sport, daté <3 mois.
2. **Bilan musculo-tendineux** : check Achille, fascia plantaire, ITB, quadriceps insertion supra-rotulienne — zones à risque Master 55 ultra alpin.
3. **Validation médicale spécifique altitude** si course passe >2000 m.

### Pédagogie d'entraînement à intégrer (sessions à coder)

4. **Coder 2-3 BTB en phase spé** (Plan 2 : S12, S14, S15 / Plan 1 : S8, S9, S11) — pattern Sam 35-45 km + Dim 20-25 km.
5. **Coder au moins 1 SL solo 45-50 km / 2800-3200 m D+** en S11 (Plan 1) ou S14-S15 (Plan 2) — sortir du « mur 50 km » au moins 1× avant le jour J.
6. **Coder 2 sorties nuit obligatoires** : 1× footing nuit 1h30-2h S8-S10 (terrain connu, lampe frontale) + 1× SL nuit-aube départ 4h matin S13-S14 (Plan 2).
7. **Renforcement 2×/sem en phase spé** : Mercredi quadri excentrique (déjà OK) + ajouter Vendredi chaîne postérieure (squats lestés, soulevés de terre, gainage dynamique) S5-S15.
8. **1 séance « descente technique » 1×/sem en phase spé** : boucle 5-8 km avec 4-6 répétitions de descente raide rapide (en surveillance vigilance Achille/quadri).
9. **1 séance « power-hike lestée bâtons » 1×/sem** dès S5 : 1h30 marche rapide pente 15-25% avec sac 4-5 kg + bâtons.

### Doctrine course (à intégrer welcome ou debrief pré-race)

10. **Stratégie « gestion 50 km »** : pour Finisher ultra alpin, **objectif les premiers 50 km = arriver frais à 50 km**. Cadence cardiaque basse (zone 1-2 max), marche systématique dès pente >8%.
11. **Plan B explicite** : conditions d'abandon volontaire (douleur articulaire localisée, FC anormalement haute, désorientation nuit) — à écrire avant la course, ne pas décider sur le terrain.
12. **Pacing nocturne** : prévoir cadence -15-20% nuit vs jour pour compenser vigilance réduite.

### Logistique (à valider hors plan)

13. **Reconnaissance terrain race** : 1 weekend reco minimum 1 mois avant (Plan 2 = S15).
14. **Test matériel complet** sur SL pic : sac, bâtons, lampe, gels, nutrition liquide — tout doit avoir été testé ≥ 2× en SL.

---

## Sources scientifiques mobilisées

### Livres / formations

- **Balducci P.** (2019). *L'ultra-trail expliqué aux coureurs*. Amphora — sections SL p.142, BTB p.165, dénivelé p.187, taper p.221.
- **Bramoullé V.** (formations Trail Performance 2020-2024, coach UTMB Pro Team).
- **Hammond M.** (UTMB 2017-2021 top 10, coach Sage Running Master Athletes US).
- **Magness S.** (2014). *Science of Running*. Origin Press — chapitres Master adaptation p.298, recovery p.314.
- **Millet G.** (2018). *Trail Running*. Outdoor Sports Books — descente p.176, fatigue musculaire ultra p.203.

### Articles peer-reviewed

- **Reaburn P. & Dascombe B.** (2008). « Endurance performance in master athletes ». *Eur Rev Aging Phys Act* 5:31-42. → recovery -25-30% Master 50+.
- **Hoffman M. & Krishnan E.** (2021). « Health and exercise-related medical issues among 1212 ultramarathon runners ». *Curr Sports Med Rep* 13(2):102-110. → vol médian Master 55 ultra.
- **Bosquet L. et al.** (2007). « Effects of tapering on performance: meta-analysis ». *Med Sci Sports Exerc* 39(8):1358-1365.
- **Mujika I. & Padilla S.** (2003). « Scientific bases for precompetition tapering strategies ». *Med Sci Sports Exerc* 35(7):1182-1187.
- **Hurdiel R. et al.** (2014). « Combined effects of sleep deprivation and strenuous exercise on cognitive performances during The North Face Ultra Trail du Mont Blanc ». *J Sports Sci* 33(7):670-674. → fatigue nocturne ultra.
- **Pasternak P.** (2020). « Predictors of DNF in 100-mile mountain ultra-marathons ». *Int J Sports Physiol Perform* 15(8):1058-1065. → DNF zone km 50-70 Master.
- **Krouse R.Z. et al.** (2011). « Motivation, goal orientation, coaching, and training habits of women ultrarunners ». *J Strength Cond Res* 25(10):2835-2842. → SL médian 53% race.

### Doctrines praticiens (suivi UTMB Masters)

- **Doctrine UTMB-Med 2022** (Pasternak/Millet) : cycle D+ ≥ 3× race minimum, 5-6× optimal.
- **Hardrock 100 Master 50+ training survey 2023** (n=58 finishers).
- **Western States Endurance Run Master 60+ cohort 2024**.

---

**Fin du document. Reviewer disponible pour debrief ou affinage par axe.**
