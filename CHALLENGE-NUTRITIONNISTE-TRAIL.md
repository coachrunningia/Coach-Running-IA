# Challenge nutritionniste expert TRAIL — Brief outil nutrition trail
Date: 2026-05-17
Reviewer: Nutritionniste du sport spé trail/ultra (15 ans expé, DU Nutrition du Sport, suivi UTMB/Diagonale/Tor des Géants, formation Balducci/Bramoullé/Browning)

---

## Synthèse exec

- **Niveau de précision actuel du brief : MOYEN-FAIBLE.**
  Bonnes intuitions (alternance liquide/solide, salé en 2e partie, lassitude gustative, gut training, protéines au-delà de 4h) mais cadrage scientifique trop survolé pour prétendre au « meilleur calculateur nutrition trail FR ». Sur un format de 24h+, certaines simplifications du brief deviennent dangereuses.

- **Points critiques manquants** :
  1. La formule ITRA est faite pour CLASSER des courses, pas pour estimer une charge énergétique. Inadaptée seule.
  2. Aucune modulation par INTENSITÉ relative (allure trail ≠ allure marathon → besoin glucidique différent).
  3. Aucune mention de l'**hyponatrémie d'effort** (EAH) qui tue plus d'ultra-traileurs que la déshydratation pure (Hoffman & Stuempfle, Almond et al. NEJM 2005).
  4. Pas de stratégie **caféine** (pourtant ergogène robuste, méta-analyse Grgic 2020).
  5. Pas de nutrition pré-course (J-3 → J-1) ni récupération (30 min / 24-48h).
  6. Pas de **garde-fou hypoglycémie réactionnelle** (timing dernier glucide simple avant départ).
  7. Pas de prise en compte **dénivelé négatif** comme facteur de dégâts musculaires (et donc besoin protéique).
  8. Pas de différenciation **homme / femme** (oxydation des glucides, phase lutéale, fer, hydratation).
  9. Pas de plan B « estomac fermé » (que faire quand l'athlète ne supporte plus rien à H8).
  10. Pas de mention **base de vie / drop bag** comme moments stratégiques distincts d'un ravito classique.

- **Recommandation** : ⚠️ **REFONTE PARTIELLE.**
  Le squelette du brief est bon (3 cartes, inputs cohérents, SEO réaliste). Mais il faut : (a) remplacer la formule ITRA seule par un calcul énergétique multifactoriel, (b) ajouter 4 inputs critiques, (c) ajouter 2 cartes (pré-course / récup), (d) durcir les garde-fous sécurité, (e) muscler le SEO longue traîne (10 KW de plus minimum), (f) FAQ retravaillée avec intentions de recherche réelles.

---

## Challenge #1 — Formule ITRA

**Verdict** : ⚠️ **AMÉLIORABLE — utiliser uniquement comme proxy de difficulté, pas pour la charge énergétique.**

**Détail scientifique** :
La formule `D_eq = D + (D+/100) + (D-/400)` est l'**Effort Distance** ITRA, conçue pour comparer la difficulté de DEUX courses entre elles (système de points de performance ITRA). Elle est :
- **Pertinente** pour estimer une durée probable de course en partant d'une allure plate équivalente.
- **Insuffisante** pour estimer la dépense énergétique réelle, parce qu'elle ignore :
  - L'**intensité relative** (un traileur élite à 75 % VO2max ≠ un finisher à 55 % VO2max → coût énergétique très différent),
  - Le **rendement de la marche vs course** (en montée raide >15-20 %, la marche est plus économique → ratio coût/temps modifié),
  - Le **dénivelé négatif** : à 400 « bonus » km, c'est purement temporel ; or la descente coûte ~3-4x moins d'énergie qu'un plat mais provoque des **dégâts musculaires excentriques** majeurs (Vernillo et al. Sports Med 2017),
  - L'**altitude** (au-delà de 2 500 m, oxydation glucidique majorée, voir Péronnet),
  - La **technicité** du terrain (sentier roulant ≠ pierrier).

Formules alternatives plus précises pour l'énergie :
- **Minetti et al. (J Appl Physiol 2002)** : coût énergétique du déplacement en fonction de la pente (du -45 % au +45 %). Référence académique. Permet de calculer un **GAP (Grade Adjusted Pace)** énergétique.
- **Strava GAP / Skiba's NGP (Normalized Graded Pace)** : utilisent Minetti pour normaliser l'allure → plus pertinent pour estimer le METs moyen et donc kcal/h.
- **Modèle Scarpa / Pugliese** (UTMB Mont-Blanc Lab) : intègre fatigue cumulative + technicité, mais pas open source.
- **MEF (Mountain Effort Factor)** utilisé par certains coachs (Balducci) : pondération empirique.

**Sources** :
- Minetti AE et al. *Energy cost of walking and running at extreme uphill and downhill slopes*. J Appl Physiol 93(3):1039-46, 2002.
- Vernillo G et al. *Biomechanics and physiology of uphill and downhill running*. Sports Med 47(4):615-29, 2017.
- ITRA Performance Index documentation (publique).
- Giovanelli N et al. *Energy cost of running and walking in trail*. Eur J Appl Physiol 2016.

**Recommandation pour l'outil** :
1. **Garder ITRA D_eq** comme estimation de DURÉE probable (entrée user : « ton chrono visé OU laisse l'outil estimer via D_eq »).
2. **Calculer en plus** une **dépense énergétique estimée (kcal)** par la formule simplifiée :
   `kcal ≈ poids × (D_montée × Cm + D_plat × Cp + D_descente × Cd) × facteur_intensité`
   avec Cm ≈ 9-12 kcal/kg/km en montée raide, Cp ≈ 1 kcal/kg/km, Cd ≈ 0.6-0.8 kcal/kg/km.
3. **Afficher les DEUX** : D_eq pour la difficulté ressentie, kcal pour le besoin énergétique → c'est ce dernier qui pilote la reco g/h de glucides.
4. **Mention « estimation ±15 % »** : c'est honnête et c'est la doctrine sécurité > conversion.

---

## Challenge #2 — Glucides/h en trail

**Verdict** : ⚠️ **AMÉLIORABLE — fourchette « 60-120 g/h » trop simpliste, dangereuse en bas de gamme pour ultra, irréaliste en haut de gamme sans gut training.**

**Détail scientifique** :

### Plages par durée (recos ACSM 2024 / Jeukendrup / Burke modulées trail)

| Durée effort | Glucides/h (entraîné gut trained) | Glucides/h (débutant non gut trained) | Type de glucides |
|---|---|---|---|
| < 1h | 0-30 g/h (souvent inutile) | 0 | Eau seule ou rinçage bouche (Carter et al. 2004) |
| 1-2h | 30-60 g/h | 20-30 g/h | Glucose seul OK |
| 2-3h | 60-75 g/h | 40-50 g/h | Glucose ou maltodextrine |
| 3-6h | 60-90 g/h | 50-60 g/h | **Glucose:fructose 2:1 obligatoire au-dessus de 60 g/h** |
| 6-12h | 70-100 g/h | 50-70 g/h | Multi-transporteurs + solide salé progressif |
| 12-24h | 60-90 g/h (descend) | 50-70 g/h | Forte composante solide ; baisse volontaire si lassitude |
| 24h+ | 50-80 g/h | 40-60 g/h | Aliments « vrais » dominants, sucré minoritaire |

**Pourquoi la limite « 120 g/h » du marketing énergétique est trompeuse en trail** :
- Les 120 g/h proviennent d'études cyclistes sur **vélo, intensité haute, durée 2-4h** (Viribay et al. 2020, Urdampilleta 2020). Sur le vélo, le tronc stable et l'absence d'impact rendent la digestion tolérable. En trail, secousses + position verticale + déshydratation relative réduisent la vidange gastrique → **plafond pratique 90-100 g/h pour la grande majorité**, même gut trained.
- Les rares cas documentés à 120 g/h en course (Costa et al., King's College London) imposent un gut training de **6-10 semaines minimum**.

### Impact de l'intensité

- **Allure trail = souvent 55-70 % VO2max** (Z1-Z2 marathon), vs marathon 75-85 % VO2max.
- À intensité plus basse → **oxydation lipidique relativement plus haute**, donc **besoin glucidique/h moindre en théorie**.
- MAIS sur ultra >6h, le **glycogène hépatique** s'épuise (réserve ~80-100 g) → l'apport exogène devient critique pour maintenir glycémie cérébrale (hypoglycémie centrale = « bonk », perte cognitive, accidents).
- **Conclusion** : en ultra long, l'intensité plus basse ne dispense PAS d'apport glucidique élevé, parce que la durée prend le relais sur l'intensité comme driver.

### Tolérance digestive réelle vs théorique (gut training)

- 30-90 % des ultra-traileurs rapportent des **GI distress** (Costa et al., Aliment Pharmacol Ther 2017). Cause #1 d'abandon en ultra.
- Le **gut training** (entraînement de l'estomac à digérer en course) est documenté : 4-10 semaines, augmentation progressive de la dose, en simulation de course.
- Protocole type : commencer à 30 g/h sur sorties longues, +5-10 g/h toutes les semaines, atteindre la cible course 4 semaines avant.

### Glucose seul vs glucose:fructose

- **Glucose seul** : transporteur intestinal **SGLT1** saturé à **~60 g/h** (Jeukendrup 2014, Sports Med).
- **Glucose + fructose** : ajout du transporteur **GLUT5** → permet d'atteindre **90 g/h (ratio 2:1)** et jusqu'à **105-120 g/h (ratio 1:0.8)** (Jeukendrup, O'Brien et al. 2013).
- **Au-delà de 60 g/h, le produit MUST contenir du fructose**, sinon GI distress garanti. C'est un point que l'outil doit imposer.

**Sources** :
- Jeukendrup AE. *A step towards personalized sports nutrition: carbohydrate intake during exercise*. Sports Med 44 Suppl 1:S25-33, 2014.
- Burke LM et al. *Carbohydrates for training and competition*. J Sports Sci 29 Suppl 1:S17-27, 2011.
- Costa RJS et al. *Systematic review: exercise-induced gastrointestinal syndrome*. Aliment Pharmacol Ther 2017.
- ACSM/Academy of Nutrition Joint Position Stand 2024.
- Tiller NB et al. *International Society of Sports Nutrition Position Stand: Nutritional considerations for single-stage ultra-marathon training and racing*. JISSN 16:50, 2019.

**Recommandation pour l'outil** :
- Afficher une **plage personnalisée** (poids × durée × niveau gut training auto-déclaré : « jamais entraîné mon estomac / 1-3 sorties longues avec nutrition / régulier (>5 sorties) »).
- **Imposer** la mention « multi-transporteurs » si reco > 60 g/h.
- **Warning rouge** si l'utilisateur est débutant + cherche un objectif >12h : « tes besoins théoriques sont X g/h mais sans gut training, vise Y g/h max — un abandon GI est plus probable qu'une perte de chrono. »

---

## Challenge #3 — Hydratation et sodium

**Verdict** : ❌ **INSUFFISANT dans le brief actuel. La gestion hydrique en ultra est CRITIQUE et le brief ne mentionne ni hyponatrémie, ni stratégie de pesée, ni dose personnalisée de sodium.**

### Fourchette mL/h

Recos modulées (ACSM 2024 + Hew-Butler Wilderness Med Society 2019) :

| Température | Hygrométrie | Volume/h (homme 70 kg, allure trail) |
|---|---|---|
| < 10 °C | toutes | 300-500 mL/h |
| 10-20 °C | < 60 % | 400-600 mL/h |
| 10-20 °C | > 60 % | 500-700 mL/h |
| 20-28 °C | < 60 % | 500-750 mL/h |
| 20-28 °C | > 60 % | 600-900 mL/h |
| > 28 °C | toutes | 700-1000 mL/h (plafond conseillé ≈ 1 L/h) |

Modulations :
- × **poids/70** (linéaire approximatif).
- × **1.05-1.15** pour les hommes (sueur souvent plus salée + débit sudoral plus élevé).
- × **0.85-1.0** pour les femmes (débit sudoral moyen plus faible, mais variabilité +++).

**Méthode terrain (la plus fiable)** : **test de pesée pré/post sortie longue d'1h**, calcul perte = (poids_pre - poids_post + liquide_ingéré). C'est ce que l'outil devrait recommander, pas se contenter d'une table générique.

### Sodium par litre

- **500-700 mg/L** = standard boisson énergétique commerciale, **insuffisant** pour beaucoup de coureurs (« heavy sweaters » : 1200-2000 mg/L de sueur, mesure Precision Hydration / Levine sweat patch).
- **Plage recommandée trail >4h** : **700-1500 mg Na+ / L** selon profil sueur.
- **Tests sudation labo** ou test terrain (traînées blanches sur t-shirt, croûtes salées sur le visage → heavy sweater).

**Méta-référence** : Hew-Butler T et al. *Statement of the 3rd International Exercise-Associated Hyponatremia Consensus*. Clin J Sport Med 25(4):303-20, 2015.

### Hyponatrémie d'effort (EAH) — POINT VITAL

**Définition** : Na+ plasmatique < 135 mmol/L pendant ou après effort prolongé. Cause : **excès d'apport hydrique > pertes** (souvent + sécrétion inappropriée d'ADH).

**Incidence ultra** : 5-30 % des finishers d'ultra (Hoffman & Stuempfle Western States/Hardrock series), avec cas symptomatiques sévères (œdème cérébral, convulsions, décès — Almond et al. NEJM 2005, Boston Marathon).

**Profils à risque** :
- Femmes (+++) (corpulence plus faible, durée souvent plus longue).
- Athlètes lents (>8h pour 50 km).
- Météo chaude → boivent excessivement.
- Boisson « light » (peu salée) + grandes quantités.

**L'outil DOIT** :
1. Afficher en encart **rouge persistant** : « Ne bois JAMAIS plus de 1 L/h. Soif et envie d'uriner toutes les 1-2h = bon repère. Urine claire continue = signe d'OVER-hydratation. »
2. Suggérer **règle des sensations** : boire à la soif + ajustement météo, ne JAMAIS forcer au-delà de la soif sur ultra >6h.
3. Recommander la pesée pré/post comme test de calibrage.
4. Adapter la quantité de Na+ aux **« heavy sweaters »**.

### Mg, K, Ca

- **Potassium (K+)** : pertes sudorales faibles (~200 mg/L), reconstitué par alimentation solide (bananes, fruits secs). Peu utile en supplémentation aiguë. Marketing surfait.
- **Magnésium (Mg)** : pas de preuve solide qu'une supplémentation aiguë prévienne les crampes (Schwellnus 2009 : crampes = fatigue neuromusculaire, pas déficit ionique). Apport chronique (300-400 mg/j) suffit.
- **Calcium (Ca)** : aucun intérêt aigu en course.
- **Bottom line** : focaliser le marketing sur **Na+ uniquement** pour la phase aiguë ; mentionner Mg/K/Ca uniquement en récupération alimentaire.

**Sources** :
- Hew-Butler T et al. EAH Consensus Statement 2015.
- Almond CSD et al. *Hyponatremia among runners in the Boston Marathon*. NEJM 352:1550-6, 2005.
- Hoffman MD, Stuempfle KJ. *Hydration strategies, weight change and performance in a 161 km ultramarathon*. Res Sports Med 22:213-25, 2014.
- Schwellnus MP. *Cause of exercise associated muscle cramps*. BJSM 43:401-8, 2009.

**Recommandation pour l'outil** :
- Input « profil sudoral » : peu / normal / fort (avec aide visuelle « croûtes blanches sur t-shirt »).
- Calcul sodium personnalisé : 700/1000/1300 mg/L selon profil.
- **Warning EAH automatique** dès que durée > 4h ET genre F OU durée > 8h tous profils.
- Suggestion forte : « Pour précision médicale, fais un test sudation (Precision Hydration ~150€ — non sponsorisé). »

---

## Challenge #4 — Protéines en ultra

**Verdict** : ⚠️ **CORRECT mais flou. « 5-10 g/h si > 4h » est une bonne base mais nécessite précision sur forme, timing, justification.**

### Pourquoi en prendre

1. **Épargne musculaire** : sur ultra, dégâts musculaires excentriques (descentes) → catabolisme protéique (élévation CK, urée). L'apport limite la protéolyse et la sensation de « jambes mortes ».
2. **Source énergétique modeste** : 5-15 % de l'énergie sur ultra >12h vient de l'oxydation des AA (Tarnopolsky 2004).
3. **Effet satiétogène et anti-écœurement sucré** : un gel protéiné ou un morceau de fromage rompt la monotonie gustative (cf. challenge #7).
4. **Soutien immunitaire** (glutamine) : limite l'immunodépression post-ultra (Castell et al.).

### Quelle quantité

- Consensus actuel (Tiller et al. JISSN 2019, Knechtle & Nikolaidis Front Physiol 2018) : **5-10 g/h pour effort > 4h** → **LE BRIEF EST DANS LE BON**.
- Limite haute : **15 g/h en pic** (bases de vie) pour utilisateurs entraînés.
- Total cible : **0.25-0.4 g/kg/h** pendant l'effort long, soit ~17-28 g/h pour 70 kg → ce qui contredit légèrement la fourchette 5-10 g/h. **Compromis pratique : 5-10 g/h en continu + bolus 15-25 g aux bases de vie.**

### Forme

| Forme | Avantages | Inconvénients | Quand |
|---|---|---|---|
| **BCAA** | Faciles à boire, anti-fatigue centrale (théorie Newsholme) | Peu calorique, preuve mitigée | Si écœurement, en boisson |
| **EAA (essentiels)** | Profil aminé complet, digestion rapide | Goût, coût | Bonne option en gel/poudre |
| **Whey hydrolysée** | Digestion rapide, peu d'osmolarité | Forme liquide souvent peu pratique | Boisson de récup post-base de vie |
| **Gels protéinés** (ex. SiS Beta Fuel +Protein, Maurten 320, Näak) | Pratiques, dose connue | Goût souvent moyen | En course continue |
| **Aliments solides protéinés** (saucisson, fromage, jambon cru, fromage de brebis sec) | Salés, rompent monotonie, dense | Digestion plus lente | Bases de vie, après H6 |

### Timing

- **Toutes les heures à partir de H3-H4** : intégrer ~5-10 g protéines dans le ravito horaire (1 gel protéiné OU 1 portion solide).
- **Bonus aux bases de vie** : 15-25 g (sandwich jambon-beurre, bol de soupe + parmesan, riz salé + œuf dur).
- **PAS de protéine en pré-course immédiat** (<1h avant départ) : ralentit la vidange gastrique, risque GI.

### À éviter

- **Whey concentrée pure pendant l'effort** : osmolarité élevée, GI distress fréquent.
- **Boisson hyper-protéique « tout-en-un »** : compromet l'absorption des glucides.

**Sources** :
- Tiller NB et al. ISSN Position Stand on Single-Stage Ultra-Marathon. JISSN 16:50, 2019.
- Knechtle B, Nikolaidis PT. *Physiology and pathophysiology in ultra-marathon running*. Front Physiol 9:634, 2018.
- Tarnopolsky M. *Protein requirements for endurance athletes*. Nutrition 20:662-8, 2004.

**Recommandation pour l'outil** :
- Reco par défaut : « **5-10 g/h dès H3 sur effort >4h, + 15-25 g aux bases de vie** ».
- Suggestion exemples concrets : « 1 gel protéiné par heure OU 30 g de saucisson sec OU 1 part de fromage » (visuel illustratif).
- Warning : « pas de protéine isolée pré-course immédiat ».

---

## Challenge #5 — Pré-course et récupération

**Verdict** : ❌ **GROSSE LACUNE DU BRIEF. L'outil sera incomplet sans ces phases.**

### Pré-course (J-3 à J-1)

**Surcharge glycogénique (carb-loading)** :
- Protocole **Western/Australian** (Burke et al.) : 7-12 g/kg/j de glucides pendant les **24-72h pré-course**, ramené à 10-12 g/kg/j J-1.
- Pour 70 kg → 490-840 g de glucides/j J-1. Cela représente ~5-7 portions de féculents/repas, sur 3-4 repas + collations.
- **Adapté à la durée d'effort** :
  - < 90 min de course : carb-loading inutile.
  - 90 min à 3h : 7-10 g/kg/j sur 24-48h.
  - > 3h : 8-12 g/kg/j sur 48-72h.
- **Erreur classique** : confondre « manger beaucoup de pâtes » et « atteindre les g/kg ». Beaucoup de coureurs sous-dosent en croyant carb-loader.

### Petit-déjeuner pré-course (J-J)

- **Timing** : 3-4h avant le départ idéalement, 2h minimum.
- **Composition** : 1-4 g/kg de glucides à IG modéré, faible en fibres, faible en lipides/protéines (digestion).
  - Exemple 70 kg, 3h avant : 200-280 g glucides = bol de riz au lait + banane + miel + tartines confiture.
- **Hydratation pré-course** : 5-10 mL/kg dans les 2-4h avant départ.
- **Dernière prise glucidique** : éviter les sucres rapides isolés entre H-60min et H-15min (risque **hypoglycémie réactionnelle** au démarrage). Soit prendre **>60 min avant**, soit **dans les 5 min avant** le départ (l'exercice annule l'insulinémie).

### Récupération immédiate (0-30 min post)

- **Fenêtre métabolique** (concept assoupli mais toujours valide en ultra) : maximiser resynthèse glycogène + amorcer réparation musculaire.
- **Reco** : **1.0-1.2 g/kg glucides + 0.3-0.4 g/kg protéines** (ratio 3:1 à 4:1).
- Pour 70 kg : ~80 g glucides + 25 g protéines.
- Exemples : 500 mL boisson récup (Recoverite, SiS Rego) ou shake maison (banane + lait + flocons + whey) ou tartines miel + lait chocolaté.

### Récupération 24-72h post-ultra

- Glucides : 8-10 g/kg/j J+1 jusqu'à reprise sensation normale.
- Protéines : **1.6-2.2 g/kg/j** pendant 3-5 jours (réparation musculaire).
- **Anti-inflammatoires nutritionnels** :
  - Polyphénols : cerise montmorency (jus 30 mL/j × 5 jours, Howatson et al. 2010 ↓ CK), curcuma + poivre noir, thé vert.
  - Oméga-3 : 2-3 g EPA+DHA/j.
  - **Éviter AINS systématiques** (ibuprofène) : aggrave dommages rénaux post-ultra (Lipman et al. 2017, Western States).
- Hydratation : reprise progressive, recalibrage sodium (bouillon, fromage).
- Sommeil : optimisation glucidique en soirée pour qualité de sommeil (Halson 2014).

### Faut-il l'intégrer à l'outil ou créer outils séparés ?

**Recommandation FORTE** : intégrer **2 cartes supplémentaires** dans le MÊME outil :
- Carte **« Pré-course (J-3 → départ) »** (charge glucidique + petit-déj').
- Carte **« Récupération (0-72h post) »**.

Justification :
- L'utilisateur cherchant « nutrition trail » cherche **toute la phase**, pas juste la course.
- Cela double le temps passé sur la page → SEO ++.
- Permet de capter aussi les requêtes longue traîne « petit-déjeuner avant trail », « récupération après ultra ».
- Évite la dispersion en 3 outils (Romane : sécurité > conversion, mais aussi clarté > prolifération).

**Sources** :
- Burke LM, Hawley JA. *Carbohydrate availability and training adaptation: effects on cell metabolism*. Exerc Sport Sci Rev 39:107-12, 2011.
- Howatson G et al. *Influence of tart cherry juice on indices of recovery following marathon running*. Scand J Med Sci Sports 20:843-52, 2010.
- Lipman GS et al. *Ibuprofen vs placebo effect on AKI in ultramarathoners*. Emerg Med J 34:637-642, 2017.
- Halson SL. *Sleep in elite athletes and nutritional interventions to enhance sleep*. Sports Med 44 Suppl 1:S13-23, 2014.

---

## Challenge #6 — Caféine

**Verdict** : ❌ **ABSENCE DU BRIEF = lacune majeure. La caféine est l'ergogène le plus documenté en endurance ; un calculateur nutrition trail sans elle perd en crédibilité scientifique.**

### Preuves d'efficacité

- **Méta-analyses récentes** (Grgic et al. JISSN 2020, Southward et al. Sports Med 2018) : effet ergogène moyen +2-4 % sur performance endurance.
- En ultra-trail : effet **cognitif et anti-somnolent** crucial sur nuit blanche (UTMB, Diagonale).
- Mécanismes : antagoniste adénosine (cerveau) + augmentation oxydation lipidique modeste + abaissement perception effort.

### Dosage

| Moment | Dose | Forme |
|---|---|---|
| **60-90 min pré-course** | 3-6 mg/kg | Café fort, capsule, gel caféiné |
| **En course continue** | 1-3 mg/kg toutes les 2-3h | Gel caféiné, boisson cola plate, capsule |
| **Nuit (ultra)** | Bolus 1-2 mg/kg en début de nuit | Café noir, cola, gel double dose |
| **Plafond/24h** | ≤ 6 mg/kg total (au-delà : effets secondaires sans gain) | — |

Pour 70 kg : 210-420 mg pré-course, 70-210 mg en course par prise, plafond 420 mg/24h.

### Risques

- **Tachycardie, palpitations, anxiété** : surtout chez non-habitués ou >6 mg/kg.
- **Troubles digestifs** : caféine + acidité gels → reflux, brûlures (très fréquent dernier tiers d'ultra).
- **Diurèse modérée** : effet réel mais modeste pendant l'exercice (pas un facteur de déshydratation significatif).
- **Dépendance/tolérance** : avec usage chronique, gain ergogène ↓. Stratégie **« sevrage 4-7 jours pré-course »** débattue (Pickering & Kiely Sports Med 2018) : gain marginal, contraignant.
- **Insomnie post-course** : éviter dernière prise si arrivée prévue le soir et besoin de dormir.
- **Cas individuels** : génotype CYP1A2 (métaboliseurs lents) → plus sensibles aux effets négatifs.

### Précautions outil

- Si user déclare « pas habituée à la caféine » → reco basse (1-2 mg/kg).
- Warning cardiovasculaire si dose totale > 6 mg/kg.
- Suggestion : **tester en entraînement** comme tout produit.

**Sources** :
- Grgic J et al. *Wake up and smell the coffee: caffeine supplementation and exercise performance*. JISSN 2020.
- Guest NA et al. *International Society of Sports Nutrition Position Stand: Caffeine and exercise performance*. JISSN 18:1, 2021.
- Pickering C, Kiely J. *Are the current guidelines on caffeine use in sport optimal for everyone?* Sports Med 48:7-16, 2018.

**Recommandation pour l'outil** :
- Carte **« Stratégie caféine »** dans la timeline.
- Input optionnel « consommation caféine quotidienne (0 / 1-2 cafés/j / 3+ cafés/j) » → module la reco.
- Warning rouge si dose calculée > 6 mg/kg.

---

## Challenge #7 — Lassitude gustative et alternance

**Verdict** : ⚠️ **OK MAIS TROP FLOU. Le brief mentionne l'idée mais ne donne pas les outils pratiques.**

### Pourquoi le sucré devient écœurant après 6-8h

- **Sensitization gustative** (saturation des récepteurs T1R2/T1R3 du sucré) + **adaptation centrale**.
- **Vidange gastrique ralentie** par hyperosmolarité des gels → sensation de plein.
- **Élévation glycémie + insulinémie résiduelle** sur effort prolongé déstabilise la régulation hédonique.
- **Augmentation cortisol/adrénaline** → modifications goût + nausée.
- Études : Pfeiffer et al. (Int J Sport Nutr Exerc Metab 2012) montrent que la diversification précoce des sources de glucides ↓ GI distress sur ultra.

### Ratio liquide/solide selon les heures

| Phase | % liquide | % solide | Note |
|---|---|---|---|
| H0-H2 | 100 % | 0 % | Estomac sensible au démarrage |
| H2-H4 | 70 % | 30 % | Intro premier solide (gel énergétique « mou ») |
| H4-H8 | 50 % | 50 % | Alternance |
| H8-H12 | 30 % | 70 % | Solide dominant, salé majoritaire |
| H12+ | 30-40 % | 60-70 % | Aliments « vrais » prioritaires, bouillons chauds |

### Aliments solides recommandés (du plus au plus tardif)

| Phase | Sucré | Salé |
|---|---|---|
| **H0-H4** | Gels énergétiques, pâtes de fruits, bonbons gélifiés (Haribo), barres | Crackers, biscuits salés simples |
| **H4-H8** | Compotes en gourde, banane, dattes, fruits secs (abricots, raisins) | Tucs, mini-sandwich pain blanc-beurre, pretzels |
| **H8-H12** | Diminuer le sucré | Saucisson, fromage à pâte dure (comté, parmesan), olives, chips, jambon cru |
| **H12+** | Quasi nul (purée fruits si tolérée) | **Bouillon chaud** (++), soupe miso, purée de pomme de terre/patate douce salée, riz blanc salé, ramen, gnocchis beurre-sel, omelette, œuf dur |

### Stratégies anti-écœurement

1. **Rinçage bouche** : eau pure entre deux gels (élimine résidu sucré).
2. **Alternance arômes** : ne pas prendre 3 gels de même goût d'affilée.
3. **Températures contrastées** : boisson fraîche puis bouillon chaud à la base de vie suivante = reset gustatif.
4. **Acidité ponctuelle** : citron, cornichon, pickles = stimule salivation + casse écœurement (technique Browning).
5. **Astringence** : un peu de café noir, thé fort, ou même eau gazeuse = nettoie le palais.
6. **Ginger/menthol** : capsule de gingembre ou bonbon menthe → effet anti-nausée léger (preuves modestes mais terrain les valide).
7. **Plan B « estomac fermé »** : si rejet total, marcher 15 min + petites gorgées eau salée tiède + Coca dégazé (recommandation classique des médecins UTMB).

### Comment l'outil peut TIMER ces switches dans la carte « timeline »

Proposition de structure de la **carte « Timeline »** dynamique selon durée prévue :

```
H0    │ ▮ Eau + sels minéraux (rinçage 1ʳᵉ heure si <3h, 30 g glucides si >3h)
H1    │ ▮ Gel #1 (glucides simples, glucose-fructose 2:1) + 500 mL boisson Na+
H2    │ ▮ Gel #2 OU pâte de fruits + eau
H3    │ ▮ Premier solide léger : barre OU banane + 1 gel + boisson
H4    │ ▮ → PROTÉINES démarrent (5-10 g/h)
        ▮ Bolus base de vie #1 (si applicable) : 200-300 kcal solide salé
H5-H6 │ ▮ Alternance liquide/solide 50/50
H7    │ ▮ ✱ ALERTE LASSITUDE — basculer salé dominant
H8    │ ▮ Bouillon chaud / soupe (base de vie #2)
H9-H12│ ▮ Solide salé + dose caféine cognitive si nuit
H12+  │ ▮ Aliments « vrais » dominants, micro-bolus glucidique en relais
        ▮ Surveillance EAH ++ (boire à la soif, pas plus)
```

L'outil génère ce planning dynamiquement selon les inputs.

**Sources** :
- Pfeiffer B et al. *Nutritional intake and gastrointestinal problems during competitive endurance events*. Med Sci Sports Exerc 44:344-51, 2012.
- Costa RJS et al. *Gut-training: the impact of two weeks repetitive gut-challenge during exercise on gastrointestinal status, glucose availability, fuel kinetics, and running performance*. Appl Physiol Nutr Metab 42:547-557, 2017.
- Stuempfle KJ, Hoffman MD. *Gastrointestinal distress is common during a 161-km ultramarathon*. J Sports Sci 33:1814-21, 2015.

**Recommandation pour l'outil** :
- Carte « Timeline » avec **switches automatiques** dépendant de la durée estimée.
- Section « Plan B estomac fermé » accessible en 1 clic depuis la timeline.
- Liste shopping solide salé (« kit anti-écœurement ») dans la carte « Pack ».

---

## Challenge #8 — Gut training et FAQ SEO

**Verdict** : ⚠️ **Gut training mentionné mais pas explicité. FAQ « 10 questions » dans le brief : trop générique, manque d'angles longue traîne.**

### Gut training — section pédagogique indispensable

L'outil doit inclure une section dédiée :

**Pourquoi ?**
- Les recos g/h ne sont **atteignables que si l'estomac a été entraîné**. Sinon GI distress quasi certain.
- 30-90 % des ultra-traileurs souffrent de troubles digestifs (Costa 2017).
- Sans cette pédagogie, l'outil donne des chiffres irréalistes → trahit la doctrine **sécurité > conversion**.

**Comment l'expliquer (300 mots max sur la page)** :
1. **Principe** : l'intestin et l'estomac sont entraînables comme un muscle. Tolérance aux glucides et au volume augmente avec exposition répétée.
2. **Protocole 4-8 semaines** :
   - Semaines 1-2 : 30 g/h sur sorties longues (2-3h).
   - Semaines 3-4 : 50-60 g/h.
   - Semaines 5-6 : 70-90 g/h, simulation conditions course (même produits, même horaires).
   - Semaines 7-8 : peaufinage + course de simulation (rando longue ou demi-distance D).
3. **Règle d'or** : **rien de nouveau le jour de la course**. Tout produit doit avoir été testé ≥ 3 fois sur sortie longue.
4. **Signaux d'alerte** : ballonnements, nausées, diarrhée → réduire dose ou changer produit.

### FAQ SEO — 15 vraies questions de coureurs (au lieu de 10 génériques)

(détaillée plus bas, voir section dédiée)

**Sources** :
- Costa RJS et al. *Gut-training: the impact of two weeks repetitive gut-challenge during exercise...*. Appl Physiol Nutr Metab 42:547-557, 2017.
- Jeukendrup AE. *Training the gut for athletes*. Sports Med 47 Suppl 1:S101-S110, 2017.

**Recommandation pour l'outil** :
- Encadré pédagogique **« Avant d'utiliser ces chiffres : as-tu fait du gut training ? »** en haut de page, qui module les outputs si l'user dit non.

---

## Inputs supplémentaires à ajouter (au-delà du brief)

Le brief actuel a : distance, D+, D- (optionnel), poids, sexe, niveau, chrono/durée, météo (température / hygrométrie).

**À ajouter** (par ordre de priorité) :

1. **Profil sudoral** : peu / normal / fort (3 boutons + tooltip explicatif « croûtes blanches sur t-shirt = fort »). → Calcul Na+ personnalisé.
2. **Expérience gut training** : jamais / 1-3 sorties testées / régulier (>5 sorties avec nutrition cible). → Module la dose g/h proposée.
3. **Habitude caféine** : 0 / 1-2 cafés/j / 3+ cafés/j. → Module la stratégie caféine.
4. **Sensibilité digestive déclarée** : aucune / parfois GI distress / souvent. → Recadre les recos vers la fourchette basse.
5. **Type de produits préférés** (cases à cocher multi-choix) : gels / boisson énergétique / barres / aliments vrais (sandwich, fromage, soupe) / pâtes de fruits / autre. → Génère un « pack » personnalisé.
6. **Altitude moyenne du parcours** (optionnel, m) : <1000 / 1000-2000 / 2000-3000 / >3000. → Modulation oxydation glucidique, hydratation.
7. **Heure de départ** : matin / après-midi / nuit / massif (>24h). → Adapte timing nutrition + caféine + signal carb-loading.
8. **Nombre estimé de bases de vie / ravitaillements** : 0 / 1-3 / 4-6 / 7+. → Adapte stratégie portable vs disponible sur place.
9. **Objectif déclaré** : finir / temps cible précis / podium. → Module l'agressivité de la stratégie (les podiums prennent plus de risques digestifs).
10. **Allergies/intolérances** : gluten / lactose / fructose intolérance / autre. → Filtre les recos produits.

---

## Outputs à enrichir

Le brief prévoit 3 cartes : synthèse + timeline + pack. **À enrichir** :

### Carte 1 — Synthèse (existante, à muscler)
Ajouter :
- Kcal totales estimées (dépense + déficit ciblé acceptable).
- % d'apport vs dépense (rappel « tu ne couvres jamais 100 %, vise 60-70 % de la dépense en course »).
- Plage g/h glucides personnalisée (basse / cible / haute).
- Plage mL/h hydratation.
- Plage mg/h sodium total.
- Plage mg caféine total + bolus.

### Carte 2 — Timeline (existante, à muscler)
Voir exemple détaillé Challenge #7. Ajouter :
- Switches automatiques liquide/solide.
- Marquage des bases de vie déclarées.
- Alerte « lassitude probable » à H6-H8.
- Marqueurs caféine.
- Plan B estomac fermé en collapse.

### Carte 3 — Pack nutrition (existante, à muscler)
Ajouter :
- Liste shopping concrète : nombre de gels (sucrés/salés/protéinés/caféinés), volume boisson totale, quantité sels, solides salés.
- Estimation poids total du pack (intéresse les coureurs : optimisation portage).
- Estimation coût total (transparence).
- Suggestions de marques (génériques, **sans sponsoring** pour respecter la doctrine sécurité > conversion).

### Carte 4 — Pré-course (NOUVELLE)
- Plan carb-loading J-3 → J-1 (g/kg/j personnalisés + exemples repas).
- Petit-déjeuner pré-course (timing + composition + volume hydratation).
- Check-list veille (sommeil, dernière boisson, sel).

### Carte 5 — Récupération (NOUVELLE)
- 0-30 min : ratio glucides/protéines + exemples.
- 24-72h post : protocole anti-inflammatoire nutritionnel.
- Hydratation post.
- Reprise alimentaire « normale ».

### Carte 6 — Sécurité (NOUVELLE, encadré rouge persistant)
- Signaux d'alerte EAH (confusion, prise de poids pendant course, nausées + urine claire abondante).
- Signaux hypoglycémie (tremblements, vision trouble, perte coordination).
- Signaux GI distress sévère (vomissements répétés → arrêt course).
- Mention « contacte un médecin du sport pour personnalisation fine ».

---

## Garde-fous sécurité indispensables

1. **Hyponatrémie d'effort (EAH)** — banderole rouge dès durée > 4h : « Ne dépasse jamais 1 L/h. Boire à la soif est ta meilleure boussole. »
2. **Surcharge digestive** — si reco > 90 g/h ET utilisateur déclare « pas de gut training » → forcer un cap à 60 g/h + message explicatif.
3. **Hypoglycémie réactionnelle pré-course** — message si l'user inclut une prise de sucre rapide isolée entre H-60 et H-15.
4. **Caféine** — cap à 6 mg/kg/24h, message si user « pas habitué » et reco > 3 mg/kg.
5. **AINS** — message explicite « N'utilise PAS d'ibuprofène/AINS pendant ou juste après l'ultra (risque insuffisance rénale aiguë, Lipman 2017). En cas de douleur, paracétamol uniquement, et consulte si persistante. »
6. **Vomissements** — message clair : « 2 vomissements à courte distance → arrêt obligatoire de la course, repos 30 min minimum, évaluation médicale au prochain poste. »
7. **Confusion mentale / désorientation** — signal d'arrêt immédiat, peut signer EAH ou hypothermie ou hypoglycémie sévère.
8. **Diabète / pathologies** — disclaimer obligatoire : « Si tu es diabétique, sous traitement cardiaque, hypertendu, ou as une pathologie chronique, consulte ton médecin avant d'utiliser ces recos. Cet outil n'est pas un avis médical. »
9. **Grossesse / allaitement** — disclaimer dédié.
10. **Pas de mention poids/IMC/minceur** dans aucun message output (le poids est un input technique du calcul, point — doctrine Coach Running IA respectée).

---

## SEO — Top 20 KW longue traîne à ajouter (au-delà des 4 du brief)

(Volumes mensuels estimés via fourchettes Google Keyword Planner / Ahrefs / SEMrush, France, recoupés ; valeurs indicatives à confirmer.)

| # | Mot-clé | Volume estimé/mois | Intention |
|---|---|---|---|
| 1 | combien de gels pour un trail 50km | 320 | Informationnelle/transactionnelle |
| 2 | nutrition utmb | 260 | Informationnelle (course iconique) |
| 3 | quoi manger pendant un ultra trail | 210 | Informationnelle |
| 4 | gel énergétique trail | 880 | Transactionnelle |
| 5 | hydratation trail | 590 | Informationnelle |
| 6 | sel en trail | 170 | Informationnelle |
| 7 | hyponatrémie course à pied | 90 | Informationnelle |
| 8 | gut training trail | 50 | Informationnelle (niche, en hausse) |
| 9 | petit déjeuner avant trail | 480 | Informationnelle |
| 10 | que manger en base de vie | 110 | Informationnelle |
| 11 | récupération après ultra trail | 170 | Informationnelle |
| 12 | caféine trail | 90 | Informationnelle |
| 13 | mal au ventre en trail | 140 | Informationnelle (douleur) |
| 14 | crampes en trail | 480 | Informationnelle |
| 15 | combien d'eau pour la saintélyon | 70 | Informationnelle géo |
| 16 | nutrition diagonale des fous | 110 | Informationnelle (course iconique) |
| 17 | écœurement sucré ultra | 30 | Informationnelle niche |
| 18 | carb loading trail | 50 | Informationnelle |
| 19 | sandwich trail recette | 70 | Informationnelle (long tail) |
| 20 | boisson isotonique trail maison | 140 | Informationnelle/DIY |

**Bonus** (mots-clés transverses à insérer dans H2/H3 même si volume <30) :
- « plan nutrition trail 100km »
- « ravitaillement trail liste »
- « nutrition trail femme »
- « erreurs nutrition ultra trail »
- « pack nutrition utmb »

---

## FAQ — 15 vraies questions de coureurs trail (au lieu de 10 génériques)

(Intentions de recherche entre crochets — utile pour le balisage schema.org `FAQPage`.)

1. **Combien de gels par heure en trail ?** [reco quantitative simple]
2. **Quelle quantité d'eau prévoir pour un trail de 50 km / 80 km / 100 km ?** [estimation logistique]
3. **Pourquoi j'ai mal au ventre en trail ?** [troubleshooting santé]
4. **Que manger à une base de vie d'ultra ?** [pratique pendant course]
5. **À quoi sert le sel en trail et combien en prendre ?** [pédagogie + reco]
6. **Combien de temps avant un trail dois-je manger mon petit-déjeuner ?** [timing pré-course]
7. **C'est quoi le gut training et comment le faire ?** [pédagogie + protocole]
8. **Caféine en trail : combien, quand, sous quelle forme ?** [pédagogie + reco]
9. **Comment éviter l'écœurement du sucre sur un ultra ?** [stratégie pratique]
10. **Quelle boisson isotonique choisir pour le trail (ou faire maison) ?** [comparatif/DIY]
11. **Combien de protéines en course pour préserver les muscles ?** [pédagogie + reco]
12. **Comment récupérer dans les 30 minutes après un trail ?** [récup immédiate]
13. **Que manger dans les 24-72h après un ultra-trail ?** [récup long terme]
14. **Comment savoir si je bois trop pendant un trail (hyponatrémie) ?** [signaux d'alerte]
15. **Faut-il prendre des BCAA en trail ?** [démystification + reco]

**Bonus** (si la FAQ peut en accueillir 20) :
- Pourquoi je transpire blanc en trail ? (heavy sweater)
- Quel pack nutrition pour un trail de nuit ?
- Combien de glucides faut-il manger les 3 jours avant un trail ?
- Peut-on courir un ultra à jeun ?
- Quels aliments solides emporter en trail ?

---

## Brief réécrit (proposition complète)

```
🏔️ NUTRITION TRAIL — /outils/nutrition-trail (V2 — challenged)

═══════════════════════════════════════════════════════
INPUTS
═══════════════════════════════════════════════════════

Inputs course (obligatoires)
- Distance (km, libre)
- D+ (m, libre, obligatoire)
- D- (m, libre, optionnel — défaut = D+)
- Durée prévue OU chrono visé OU "laisse l'outil estimer"

Inputs athlète (obligatoires)
- Poids (kg) [usage strictement technique, jamais affiché dans les messages]
- Sexe (H / F)
- Niveau course (débutant / intermédiaire / confirmé / expert) [issue du composant partagé]

Inputs nutrition (nouveaux, modulent les recos)
- Expérience gut training : jamais / 1-3 sorties testées / régulier (>5)
- Profil sudoral : peu / normal / fort (tooltip "croûtes blanches sur t-shirt = fort")
- Sensibilité digestive : aucune / parfois GI distress / souvent
- Habitude caféine : 0 / 1-2 cafés/j / 3+ cafés/j
- Type de produits préférés (multi-cases) : gels / boisson énergétique / barres / aliments solides / pâtes de fruits

Inputs contextuels (optionnels)
- Météo : température (°C) + hygrométrie (%)
- Altitude moyenne du parcours (<1000 / 1000-2000 / 2000-3000 / >3000 m)
- Heure de départ (matin / après-midi / nuit / >24h)
- Nombre de bases de vie/ravitaillements (0 / 1-3 / 4-6 / 7+)
- Objectif : finir / temps cible / podium
- Allergies/intolérances (gluten, lactose, fructose, autre)

═══════════════════════════════════════════════════════
CALCUL
═══════════════════════════════════════════════════════

Phase 1 — Estimation durée
- D_eq ITRA = D + (D+/100) + (D-/400) → estimation durée si pas de chrono visé
- (D_eq sert UNIQUEMENT à estimer la durée probable, PAS la charge énergétique)

Phase 2 — Estimation énergie (kcal)
- Formule Minetti pondérée :
  kcal ≈ poids × (km_montée × 9 + km_plat × 1.0 + km_descente × 0.7) × facteur_intensité
- Facteur intensité par niveau : 1.05 (expert) / 1.00 (confirmé) / 0.95 (intermédiaire) / 0.90 (débutant)
- Ajustement altitude (>2000 m : ×1.05) ; chaleur (>25°C : ×1.05)

Phase 3 — Reco glucides/h
- Plage personnalisée selon durée + gut training + sensibilité (voir matrice Challenge #2)
- Cap automatique à 60 g/h si gut training = jamais
- Cap automatique à 75 g/h si gut training = 1-3 testées
- Cap à 90-100 g/h pour gut trained
- Forcer mention multi-transporteurs (glucose:fructose 2:1) au-dessus de 60 g/h

Phase 4 — Reco hydratation
- mL/h calculé selon poids + météo + sexe (table Challenge #3)
- Plafond strict 1000 mL/h (warning EAH)
- Calcul Na+/L selon profil sudoral (700 / 1000 / 1300 mg/L)

Phase 5 — Reco protéines (si durée > 4h)
- 5-10 g/h en continu dès H3
- + bolus 15-25 g aux bases de vie déclarées

Phase 6 — Reco caféine
- Pré-course : 3-6 mg/kg (modulé par habitude)
- En course : 1-3 mg/kg toutes 2-3h
- Plafond 6 mg/kg/24h

═══════════════════════════════════════════════════════
OUTPUTS — 6 CARTES
═══════════════════════════════════════════════════════

Carte 1 — Synthèse
  • Durée estimée + kcal estimée (mention ±15 %)
  • Plage g/h glucides (basse / cible / haute)
  • Plage mL/h + mg/L sodium
  • Protéines totales (si applicable)
  • Caféine totale (si applicable)

Carte 2 — Timeline interactive
  • Frise H0 → fin course
  • Switches automatiques liquide/solide
  • Marquage bases de vie
  • Alerte lassitude H6-H8
  • Marqueurs caféine
  • Section repliable "Plan B estomac fermé"

Carte 3 — Pack nutrition
  • Liste shopping concrète (gels, boissons, sels, solides)
  • Estimation poids pack
  • Estimation coût
  • Suggestions marques génériques (sans sponsoring)

Carte 4 — Pré-course (J-3 → départ)
  • Carb-loading g/kg/j personnalisé + exemples repas
  • Petit-déjeuner pré-course (timing + composition)
  • Check-list veille

Carte 5 — Récupération (0-72h post)
  • 0-30 min : 1.0-1.2 g/kg glucides + 0.3-0.4 g/kg protéines (+ exemples)
  • 24-72h : protocole anti-inflammatoire nutritionnel
  • Mention "pas d'AINS"

Carte 6 — Sécurité (encadré rouge persistant)
  • Signaux EAH
  • Signaux hypoglycémie
  • Signaux GI distress sévère
  • Disclaimer médical
  • Disclaimer diabète / pathologies / grossesse

═══════════════════════════════════════════════════════
GARDE-FOUS
═══════════════════════════════════════════════════════

- Banderole rouge "boire ≤ 1 L/h, à la soif" si durée > 4h
- Cap glucides si pas de gut training
- Warning hypoglycémie réactionnelle pré-course
- Cap caféine 6 mg/kg/24h + warning si non-habitué
- Message anti-AINS systématique en post-course
- Message protocole vomissement (arrêt si 2 vomissements)
- Disclaimers médicaux (diabète, grossesse, pathologies)
- Aucune mention poids/IMC/minceur dans tout message user

═══════════════════════════════════════════════════════
SEO (1200-1500 mots, pas 700-900 — sujet trop riche)
═══════════════════════════════════════════════════════

KW principaux : nutrition trail (480), nutrition ultra trail (140),
pack nutrition trail (70), plan nutrition trail (70),
gel énergétique trail (880), hydratation trail (590),
petit déjeuner avant trail (480), crampes en trail (480)

H2/H3 :
- Comment fonctionne le calculateur nutrition trail
- Glucides en trail : combien par heure selon distance, D+ et durée
- Hydratation et sodium en trail : éviter crampes ET hyponatrémie
- Protéines en ultra : pourquoi et combien
- Caféine en trail : dosage et timing
- Lassitude gustative : pourquoi le sucré écœure après 6-8h
- Gut training : entraîner ton estomac avant un ultra
- Pré-course : carb-loading et petit-déjeuner
- Récupération : 30 min, 24h, 72h après un trail
- Pack nutrition trail 30 km / 50 km / 80 km / 100 km / UTMB (5 H3)
- Nutrition selon ton niveau (débutant à expert)
- Plan B : que faire quand ton estomac dit stop
- FAQ trail (15 questions, schema.org FAQPage)

Schema markup : FAQPage + HowTo + Article
Internal linking : vers calculateur allures, plans trail, blog "préparer son premier ultra"
```

═══════════════════════════════════════════════════════

## Conclusion reviewer

Le brief V1 était une **bonne fondation** mais souffrait de 3 angles morts critiques :
1. **Sous-estimation des risques médicaux** (EAH absente du radar).
2. **Sur-simplification du calcul énergétique** (ITRA seule = insuffisant).
3. **Périmètre trop étroit** (manquent pré-course, récup, caféine, plan B).

Une fois la V2 (brief réécrit ci-dessus) implémentée, cet outil aura un **avantage concurrentiel net** sur le francophone, où la plupart des "calculateurs nutrition trail" existants sont soit des copies marketing de marques (Aptonia, Overstim's), soit des outils trop simplistes. La crédibilité scientifique + la doctrine sécurité de Coach Running IA peuvent en faire **la référence FR**.

**Sources clés mobilisées dans ce challenge** :
- Jeukendrup AE — Sports Med 2014, 2017 (glucides, gut training)
- Burke LM — J Sports Sci 2011 (carb-loading)
- Costa RJS — Aliment Pharmacol Ther 2017, Appl Physiol Nutr Metab 2017 (GI distress, gut training)
- Hew-Butler T — Clin J Sport Med 2015 (EAH consensus)
- Almond CSD — NEJM 2005 (hyponatrémie Boston)
- Hoffman MD & Stuempfle KJ — Res Sports Med 2014 (hydratation ultra)
- Minetti AE — J Appl Physiol 2002 (coût énergétique pentes)
- Vernillo G — Sports Med 2017 (biomécanique trail)
- Tiller NB — JISSN 2019 (ISSN Position Stand Ultra-Marathon)
- Guest NA — JISSN 2021 (ISSN Position Stand Caffeine)
- Grgic J — JISSN 2020 (méta caféine)
- Howatson G — Scand J Med Sci Sports 2010 (cerise montmorency récup)
- Lipman GS — Emerg Med J 2017 (AINS et IRA en ultra)
- Tarnopolsky M — Nutrition 2004 (protéines endurance)
- Knechtle B & Nikolaidis PT — Front Physiol 2018 (physiopathologie ultra)
- Stuempfle KJ & Hoffman MD — J Sports Sci 2015 (GI ultramarathon)
- Pfeiffer B — Med Sci Sports Exerc 2012 (nutrition endurance)
- Schwellnus MP — BJSM 2009 (crampes)
- Halson SL — Sports Med 2014 (sommeil)
- ACSM/AND Joint Position Stand 2024
- Guidelines IAAF Nutrition 2019

Reviewer : nutritionniste du sport spé trail/ultra
Statut : Challenge complété — prêt pour discussion avec Romane avant transmission dev.
