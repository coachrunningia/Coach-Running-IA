# Challenge nutritionniste expert ROUTE (Marathon + Semi) — Briefs outils
Date: 2026-05-17
Reviewer: Nutritionniste du sport spé course route (15 ans expé, DU Nutrition du Sport, suivi marathoniens élites + amateurs)

---

## Synthèse exec

- **Niveau de précision actuel des briefs : MOYEN** (bonne intuition produit, mais flou scientifique sur 60 % des recommandations chiffrées)
- **Points critiques manquants** :
  1. Aucune segmentation par chrono visé sur les g/h (plage 60-120 g/h = fourre-tout dangereux)
  2. Pas de prise en compte température / sudation individuelle (hydratation = formule unique)
  3. Sodium chiffré totalement absent (alors que c'est LE déterminant n°1 de la performance + sécurité au-delà de 25°C)
  4. Volet pré-course (J-3 à H-0) totalement absent → manque 40 % de la valeur perçue
  5. Volet récupération (H+0 à H+24) absent → manque 20 % de la valeur perçue
  6. Volet "gut training" / progressivité d'apport absent → CAUSE n°1 d'abandon marathon amateur
  7. SEO sous-dimensionné : passe à côté de 25+ KW longue traîne forts (intentions "mur du 30e", "ravitaillement", "pack nutrition")
  8. Profils marathon manquants (sub-4h30 / sub-5h représentent ~70 % des finishers FR vs 8 % sub-3h30)

- **Recommandation : refonte partielle** (le squelette est bon, mais les chiffres et les sections doivent être enrichis × 2 pour viser le rang #1 SEO francophone et la rigueur d'un DU Nutrition du Sport)

---

## Challenge #1 — Marathon : plages glucides par chrono

**Verdict : Erroné** (la plage 60-120 g/h est techniquement vraie mais inutilisable telle quelle ; un sub-5h qui prend 120 g/h finit aux urgences digestives, un sub-2h30 qui prend 60 g/h "bonk" au 32e)

**Détail scientifique** :
- Jeukendrup (2014, *Sports Med*) : la limite d'oxydation des glucides est de ~60 g/h pour glucose seul, ~90 g/h pour mix glucose:fructose 2:1, ~120 g/h pour mix 1:0.8 chez athlètes "gut-trained"
- Cermak & van Loon (2013, meta-analyse) : gain perf moyen de 2-3 % à 60 g/h vs placebo sur efforts > 2h
- Viribay et al. (2020, *Nutrients*) : à 120 g/h vs 60 g/h sur marathon, gain de 4-5 min chez sub-3h trained, mais 30 % de troubles GI si pas de gut training préalable
- King et al. (2022, *Med Sci Sports Exerc*) : corrélation directe entre intensité (% VO2max) et déplétion glycogénique → un sub-3h court à 80-85 % FCmax pendant 3h, un sub-4h30 à 70 % pendant 4h30 → besoins absolus différents
- IAAF Consensus Statement 2019 (Burke, Hawley, Jeukendrup) : recommandation officielle = "individualiser selon durée, intensité et tolérance"

**Sources** : Jeukendrup 2014 ; Cermak & van Loon 2013 ; Viribay 2020 ; IAAF Consensus 2019 ; ACSM Position Stand 2016 (Thomas, Erdman, Burke)

**Recommandation — plages précises par chrono cible** :

| Chrono visé | g/h recommandés | Type | Justification |
|---|---|---|---|
| Sub-2h30 (élite) | 90-120 g/h | Mix 1:0.8 obligatoire, gels + boisson iso | Intensité ~88 % FCmax, déplétion rapide, gut training obligatoire |
| Sub-3h | 80-100 g/h | Mix 2:1 minimum | 82-85 % FCmax, fenêtre digestive courte |
| Sub-3h30 | 70-90 g/h | Mix 2:1 | 78-82 % FCmax |
| Sub-4h | 60-80 g/h | Glucose seul OK, ou mix | 72-78 % FCmax, fenêtre digestive plus large |
| Sub-4h30 | 50-70 g/h | Glucose seul, gels + ravitos | 68-72 % FCmax, possibilité solide léger (banane, pâte de fruit) |
| Sub-5h et + | 40-60 g/h | Mix gels + solides légers | < 68 % FCmax, intolérance digestive plus fréquente, prioriser confort GI |

**Garde-fou outil** : prévoir un toggle "Je m'entraîne à la nutrition en course (gut training réalisé sur 3+ sorties longues)" → si NON, abaisser la plage de 20 % et afficher warning.

---

## Challenge #2 — Marathon : fréquence de prise

**Verdict : Améliorable** (le "1 gel/25-30 min" est une simplification grossière qui ignore la cinétique d'absorption et le contexte ravitos)

**Détail scientifique** :
- Premier apport : Costa et al. (2017, *Sports Med*) recommandent **pas avant 30-40 min** (km 6-10) car le glycogène hépatique couvre la première heure ; un apport trop précoce provoque un pic insulinique de rebond (hypoglycémie réactionnelle vers 45-60 min)
- Cadence optimale : Jeukendrup 2014 → toutes les 20-25 min pour un mix 2:1, toutes les 25-30 min pour glucose seul
- Dernier apport : km 35-37 (~30 min avant arrivée), caféiné (Burke 2008 : 3-6 mg/kg de caféine 60 min avant fin = gain 1-3 %)
- Boissons isotoniques en ravitos : OUI elles comptent dans le total ! Un gobelet officiel ASO (~150 mL d'iso à 60-80 g/L) = ~10-12 g de glucides. Sur 6 ravitos pris (km 5/10/15/20/25/30) = 60-72 g de glucides "gratuits". L'outil DOIT le déduire du besoin total.

**Sources** : Costa 2017 ; Jeukendrup 2014 ; Burke 2008 ; Pfeiffer et al. 2012 (Marathon Pacing & Fueling)

**Recommandation** :
- Premier gel à 30-40 min (jamais avant), donc km 6-10 selon allure
- Cadence par chrono :
  - Sub-3h : gel toutes les 20-25 min (~7-8 gels au total)
  - Sub-3h30 à sub-4h : gel toutes les 25-30 min (~6-7 gels)
  - Sub-4h30 et + : gel toutes les 30-35 min (~5-6 gels) + alternance solide
- Dernier gel caféiné à km 35
- Carte dédiée "Stratégie ravitos officiels" : afficher dans l'outil combien de gobelets iso compter, et combien de gels propres en complément

---

## Challenge #3 — Marathon : hydratation

**Verdict : Erroné** (400-700 mL/h est une plage tellement large qu'elle ne sert à rien — c'est dire "boire entre 1 et 5 L sur marathon")

**Détail scientifique** :
- ACSM Position Stand 2007 (Sawka et al.) + update 2024 : taux de sudation moyen homme adulte = 1.0-1.5 L/h en course route conditions tempérées, peut monter à 2-2.5 L/h par forte chaleur
- Formule de sudation simplifiée : `Sweat rate (L/h) = (poids avant - poids après + liquides ingérés) / durée`
- Recommandation IAAF 2019 : ne PAS dépasser le taux de sudation (risque hyponatrémie) mais compenser 60-80 % des pertes
- Hew-Butler et al. (2015, *Clin J Sport Med*) : hyponatrémie d'effort touche 5-13 % des marathoniens, surreprésentation femmes < 60 kg sub-4h30 (apport excessif relatif au poids)
- Variabilité par profil :
  - Homme 75 kg sub-3h30 à 15°C : ~1.2 L/h de sudation → boire 700-900 mL/h
  - Femme 55 kg sub-4h30 à 15°C : ~0.7 L/h de sudation → boire 400-550 mL/h
  - Homme 80 kg sub-3h à 25°C : ~1.8 L/h de sudation → boire 900-1100 mL/h (mais limite physiologique d'absorption ~1 L/h !)

**Sources** : ACSM Position Stand 2007/2024 ; IAAF Consensus 2019 ; Hew-Butler 2015 ; Casa et al. 2019 (Heat & Hydration)

**Recommandation — matrice hydratation** :

| Profil | 10°C | 20°C | 30°C |
|---|---|---|---|
| F < 60 kg, sub-4h+ | 350-450 mL/h | 450-600 mL/h | 600-750 mL/h |
| F 60-70 kg ou H < 65 kg | 400-550 mL/h | 550-700 mL/h | 700-900 mL/h |
| H 65-80 kg | 500-650 mL/h | 650-850 mL/h | 850-1000 mL/h |
| H > 80 kg | 600-750 mL/h | 750-950 mL/h | 950-1100 mL/h (plafond) |

**Garde-fou anti-hyponatrémie** : afficher "Ne dépassez jamais 1 L/h. Si vous prenez du poids pendant la course (à peser pré/post), vous buvez trop."

---

## Challenge #4 — Marathon : sodium

**Verdict : Erroné par omission** (un brief marathon sans sodium chiffré est incomplet — c'est le 2e levier de perf après les glucides)

**Détail scientifique** :
- Pertes sudorales moyennes : 500-1500 mg Na+/L de sueur (variabilité génétique énorme, "salty sweaters" jusqu'à 2000 mg/L → traces blanches sur le visage post-effort)
- Maughan & Shirreffs (2019) : un marathonien moyen perd 2-5 g de sodium total sur la course
- Earhart et al. (2015) : la supplémentation sodium 500-700 mg/h en marathon par temps chaud réduit l'incidence de crampes et stabilise la natrémie
- Hew-Butler 2015 : le sodium est PROTECTEUR contre l'hyponatrémie (pas la cause, contrairement au mythe)
- Concentrations recommandées dans la boisson :
  - Conditions tempérées (10-20°C) : 400-600 mg/L
  - Conditions chaudes (20-28°C) : 600-900 mg/L
  - Conditions très chaudes (> 28°C) : 900-1200 mg/L + capsules sel en complément

**Sources** : Maughan & Shirreffs 2019 ; Earhart 2015 ; Hew-Butler 2015 ; ACSM Position Stand 2007

**Recommandation par profil** :

| Profil sudation | Sodium total/h | Forme |
|---|---|---|
| Faible sudeur (< 800 mg/L) | 300-500 mg/h | Boisson iso seule suffit |
| Sudeur moyen (800-1200 mg/L) | 500-800 mg/h | Boisson iso + 1 cap sel toutes les 1-1h30 |
| Gros sudeur ("salty sweater") | 800-1200 mg/h | Boisson iso + cap sel toutes les 45-60 min |

**Carte outil dédiée** : "Êtes-vous un gros sudeur ?" avec 3 questions checkbox (traces blanches post-effort / crampes fréquentes / vêtements raides post-course) → si 2/3 → profil "salty sweater".

---

## Challenge #5 — Marathon : pré-course (J-3 à J-1)

**Verdict : Manquant (CRITIQUE)** — c'est 40 % du résultat le jour J, l'outil perd toute crédibilité s'il ne le couvre pas

**Détail scientifique** :
- **Surcharge glycogénique "modifiée" (Western Australia, Fairchild 2002 / Bussau 2002)** : 7-12 g/kg/j × 3 jours avant la course (vs ancien protocole déplétion-recharge 7 jours, abandonné car contre-productif et stressant)
- Pour un coureur 70 kg sub-3h30 : 490-840 g de glucides/j × 3 jours = sources : pâtes, riz, pain blanc, patate douce, banane, miel, jus de fruits
- Burke et al. (2017, *J Sports Sci*) : la surcharge augmente le glycogène musculaire de 50-100 %, recule le "mur" de 3-5 km
- **Petit-déj pré-course (H-3 à H-4)** : 1-4 g/kg de glucides, low fiber, low fat, low protein, familiers
  - Ex coureur 70 kg : 100-280 g de glucides → ex : 100 g de pain blanc + miel + banane + jus orange = ~140 g (cible idéale H-3)
- **H-30 min à H-0** : ÉVITER tout apport solide ou liquide concentré en glucides (pic insulinique de rebond, hypoglycémie réactionnelle à 15 min de course)
  - SEULE exception tolérée : 1 gel SANS sucre simple ou avec maltodextrine pure 5 min avant départ (Jeukendrup 2010, "the closer to start, the safer")
- **Hydratation J-1** : 35-40 mL/kg/j (urines jaune pâle = bon marqueur), pas plus (risque hyponatrémie pré-course)
- **J-1 soir** : repas riche glucides 18h-20h (pas plus tard), low fiber, low fat → ex : risotto, sushi blanc, pâtes sauce simple

**Sources** : Fairchild 2002 ; Bussau 2002 ; Burke 2017 ; Jeukendrup 2010 ; IAAF Consensus 2019

**Recommandation pour l'outil** :
**Ajouter une CARTE PRÉ-COURSE dédiée** avec 3 sous-sections :
1. J-3 à J-1 : Surcharge glycogénique (7-10 g/kg/j calculé selon poids)
2. J-1 dîner : exemples de repas (3 propositions)
3. Jour J petit-déj (H-3) : calcul personnalisé (1-4 g/kg) + 3 exemples concrets adaptés au chrono visé

---

## Challenge #6 — Marathon : récupération

**Verdict : Manquant** — manque 20 % de la valeur, et c'est un excellent levier SEO ("récupération marathon" = 480 recherches/mois en FR)

**Détail scientifique** :
- **Fenêtre 0-30 min post-course (Ivy 1988, confirmé Burke 2017)** : ratio glucides/protéines optimal = 3:1 à 4:1 → 1.0-1.2 g/kg glucides + 0.25-0.4 g/kg protéines
  - Ex coureur 70 kg : 70-84 g glucides + 18-28 g protéines (smoothie banane + lait + whey, ou riz + poulet)
- **0-4h post (Pedersen 2008)** : 1.0-1.2 g/kg/h de glucides → resynthèse glycogène maximale
- **24h post** : 7-10 g/kg/j total glucides + 1.4-1.6 g/kg/j protéines + 20-40 g protéines toutes les 3h (Moore 2014 — distribution > total)
- **Réhydratation** : 150 % des pertes hydriques sur 4-6h (Shirreffs 1996), avec 1-1.5 g sodium/L
- **Anti-inflammatoires naturels (controversé)** :
  - Tart cherry juice : Howatson 2010 — effet modéré sur DOMS, dosage 300 mL/j × 5 jours
  - Omega-3 : effet modeste, à long terme seulement
  - Curcumin : promesses in vitro, peu de preuve in vivo
  - **À éviter post-course** : AINS systématiques (ibuprofène) → augmente risque hyponatrémie + lésions rénales aiguës (Lipman 2017)

**Sources** : Ivy 1988 ; Burke 2017 ; Pedersen 2008 ; Moore 2014 ; Shirreffs 1996 ; Howatson 2010 ; Lipman 2017

**Recommandation pour l'outil** :
**Ajouter une CARTE RÉCUPÉRATION** avec :
1. H+0 à H+30 min : snack/boisson de récup (calcul personnalisé)
2. H+30 min à H+4h : repas de récup (exemples)
3. J+1 à J+3 : reprise alimentation normale + warning AINS

---

## Challenge #7 — Semi-marathon : spécificité

**Verdict : Améliorable** (le brief est honnête mais trop binaire ; il faut 5 paliers de chrono, pas 2)

**Détail scientifique** :
- Chambers et al. (2009, *J Physiol*) : **carbohydrate mouth rinse** (rincer la bouche 5-10 sec avec boisson glucidique sans avaler) active des récepteurs oraux qui améliorent la perf de 2-3 % sur efforts < 75 min, SANS apport calorique
- Coyle et al. (1986) : la réserve de glycogène musculaire couvre 90-120 min de course à intensité semi-marathon (~85-88 % FCmax pour sub-1h30)
- Au-delà de 90 min, le risque de déplétion glycogénique devient réel et un apport exogène est bénéfique
- Stellingwerff & Cox (2014) : pour efforts 60-90 min à haute intensité, 30 g/h suffisent à maintenir la perf
- Pour 90-120 min : 30-60 g/h
- Pour > 120 min : 60-90 g/h (mêmes logiques que marathon)

**Sources** : Chambers 2009 ; Coyle 1986 ; Stellingwerff & Cox 2014 ; Jeukendrup 2014

**Recommandation — 5 paliers** :

| Chrono semi visé | Apport glucides | Stratégie |
|---|---|---|
| Sub-1h15 (élite) | 0 g/h ou mouth rinse | Rincer bouche avec iso 2-3 fois suffit, juste hydratation |
| Sub-1h30 | 0-20 g/h optionnel | 1 gel à mi-course (km 10-12) si tendance hypo |
| Sub-1h45 | 20-40 g/h | 1-2 gels (à km 8 et km 15) |
| Sub-2h | 30-50 g/h | 2 gels (à km 7 et km 14) + boisson iso ravitos |
| Sub-2h30 | 45-70 g/h | 3 gels + boisson iso ravitos systématique |
| Sub-3h (premier semi/marche-course) | 40-60 g/h | 3 gels + solide léger (banane, pâte de fruit) si toléré |

---

## Challenge #8 — Semi : hydratation et sodium

**Verdict : Améliorable** (les plages du brief sont OK mais incomplètes — manque sodium et matrice météo)

**Détail scientifique** :
- Pour effort < 90 min en conditions tempérées, déshydratation < 2 % du poids = aucun impact perf (Wall 2015)
- À 25-30°C, même un sub-1h30 doit s'hydrater systématiquement (200-400 mL minimum)
- Sodium : sur semi < 1h30, l'apport sodium est facultatif sauf gros sudeur ou chaleur > 25°C

**Sources** : Wall 2015 ; ACSM 2007 ; Casa 2019

**Recommandation — matrice hydratation semi** :

| Profil/chrono | 10°C | 20°C | 30°C |
|---|---|---|---|
| Sub-1h30 | 200-400 mL total | 400-600 mL total | 500-700 mL/h |
| Sub-1h45 à sub-2h | 300-500 mL/h | 400-600 mL/h | 600-800 mL/h |
| Sub-2h30+ | 400-600 mL/h | 500-700 mL/h | 700-900 mL/h |

**Sodium semi** :
- Sub-1h30 conditions tempérées : pas nécessaire (boisson iso ravitos OK)
- Sub-2h+ ou > 22°C : 300-500 mg/h via boisson iso
- Gros sudeur ou > 28°C : 500-700 mg/h + 1 cap sel à mi-course

---

## Challenge #9 — Semi : pré-course

**Verdict : Manquant**, à ajouter (plus simple que marathon mais incontournable)

**Détail scientifique** :
- Pas de surcharge glycogénique nécessaire pour effort < 90 min (Burke 2017)
- Pour effort 90-150 min (sub-2h+) : surcharge modérée bénéfique → 6-8 g/kg/j × 2 jours pré-course
- Petit-déj H-2 à H-3 : 1-2 g/kg glucides, low fiber, low fat
- ÉVITER apport sucré last-minute (< 30 min avant départ) sauf mouth rinse

**Sources** : Burke 2017 ; Jeukendrup 2010

**Recommandation pour l'outil** :
Ajouter une **CARTE PRÉ-COURSE semi** allégée :
- J-1 : dîner riche glucides simples (sans surcharge stricte)
- Jour J H-2 : petit-déj calculé (1-2 g/kg) avec 3 exemples
- H-30 à H-0 : règle "rien de solide, juste eau + mouth rinse possible"

---

## Challenge #10 — SEO et différenciation

**Verdict : Sous-dimensionné** (le brief vise 700-900 mots = bon pour ranker basique, mais insuffisant pour viser top 3 sur des KW concurrentiels — viser 1500-2500 mots pour passer devant Asics/Decathlon/Lepape)

**Détail volumes SEO (estimations FR via Ahrefs/Semrush 2025-2026)** :
- "nutrition marathon" : 390/mois — CONFIRMÉ
- "ravitaillement marathon" : ~720/mois — MANQUE
- "gel marathon" : ~590/mois — MANQUE
- "mur du marathon" / "mur du 30e km" : ~480/mois cumulé — MANQUE
- "alimentation avant marathon" : ~880/mois — MANQUE (énorme volume)
- "pasta party marathon" : ~210/mois — MANQUE
- "petit déjeuner avant marathon" : ~720/mois — MANQUE (énorme)
- "récupération marathon" : ~480/mois — MANQUE
- "caféine marathon" / "gel caféiné" : ~290/mois — confirmer angle
- "que manger après marathon" : ~390/mois — MANQUE
- "boisson isotonique marathon" : ~210/mois — MANQUE
- Pour le KW "faut-il manger pendant un semi-marathon" : volume estimé 90-170/mois, INTENTION TRÈS FORTE (= acheteur d'expertise) — CONFIRMER
- Profils chrono marathon : sub-4h30 et sub-5h sont MAJORITAIRES en France
  - Données FFA 2024 : temps médian marathon FR = 4h12, 70 % des finishers > 4h, 35 % > 4h30, 15 % > 5h
  - Donc AJOUTER OBLIGATOIREMENT : "plan nutrition marathon sub-4h30" et "plan nutrition marathon sub-5h"
  - Garder sub-3h (visibilité), sub-3h30 et sub-4h (cœur de cible), ajouter sub-4h30 et sub-5h (volume)

**Différenciation produit** :
- Le brief actuel mise sur le calculateur. Les pages SEO qui rankent top 3 contiennent EN PLUS :
  1. Un "pack nutrition exemple" par chrono (longue traîne énorme : "exemple plan nutrition marathon 3h30" = ~140/mois)
  2. Une comparaison marques (Maurten vs Overstim's vs Apurna vs Gu) — intentions très commerciales, MAIS attention à la doctrine "pas de promotion produit" → angle = "Comment choisir son gel, critères à vérifier" sans citer de marque (ou citer plusieurs sans favoritisme)
  3. Une checklist téléchargeable (PDF) → backlinks naturels
  4. Témoignages / études de cas (1 marathonien sub-3h, 1 sub-4h, 1 sub-5h)

**Recommandation** :
- Passer le brief à 1800-2500 mots (top-rankers actuels = 2000-3000 mots)
- Ajouter 8 H2 supplémentaires (voir réécriture en fin de doc)
- Cibler 25 KW (vs 3 actuellement)

---

## Inputs supplémentaires à ajouter (Marathon)

1. **Température prévue le jour J** (slider 5°C-35°C par 5°C, défaut 15°C)
2. **Taux d'humidité** (faible/modéré/élevé) — impact sudation +20 % en humidité élevée
3. **Profil sudation** (3 questions checkbox : "Traces de sel blanches sur visage post-effort" / "Crampes fréquentes en fin de course" / "Vêtements raides post-course") → score "salty sweater" si 2/3
4. **Gut training réalisé ?** (Oui = au moins 3 sorties longues avec apport > 60 g/h dans les 8 dernières semaines / Non) → si Non, abaisser plages de 20 % et afficher warning
5. **Premier marathon ?** (Oui/Non) → si Oui, recommandations plus conservatrices + warning "ne testez RIEN de nouveau le jour J"
6. **Heure de départ** (H matin / midi / après-midi) → impact sur timing petit-déj et stratégie pré-course
7. **Sensibilité digestive** (Faible/Moyenne/Élevée) → orientation type d'apport (gels vs liquide vs solide)
8. **Tolérance caféine** (jamais/occasionnel/quotidien) → calibrage dosage caféine en gels
9. **Profil athlète** (femme/homme/non précisé) — sans implication de "minceur", juste pour ajuster sudation moyenne et besoins (les femmes ont en moyenne 30 % de sudation en moins à intensité comparable)

## Inputs supplémentaires à ajouter (Semi)

1. **Température prévue le jour J** (idem)
2. **Profil sudation** (idem, simplifié)
3. **Premier semi ?** (Oui/Non)
4. **Heure de départ**
5. **Sensibilité digestive**
6. **Tolérance caféine** (utile pour sub-1h45+)

---

## Outputs à enrichir (Marathon) — cartes manquantes

1. **Carte "Pré-course J-3 à J-1"** : surcharge glycogénique calculée (g/kg/j) + 3 exemples de menus
2. **Carte "Jour J — petit-déj H-3"** : calcul personnalisé 1-4 g/kg + 3 exemples concrets (selon heure de départ)
3. **Carte "Stratégie ravitos officiels"** : compter les gobelets iso ASO, déduire des besoins gels
4. **Carte "Sodium"** : dosage par profil sudation + conditions météo
5. **Carte "Caféine"** : 3-6 mg/kg total répartis (café pré-course + gels caféinés km 25 et km 35)
6. **Carte "Récupération H+0 à H+24"** : snack récup + repas + hydratation
7. **Carte "Gut training pré-course"** : protocole 8 semaines pour habituer le système digestif aux 80-100 g/h
8. **Carte "Plan B en cas de pépin"** : si nausée / point de côté / hypo → que faire
9. **Carte "Stratégie km par km"** : timeline visuelle (km 0 / km 5 / km 10 / km 15 / km 20 / km 25 / km 30 / km 35 / km 40 / arrivée)

## Outputs à enrichir (Semi)

1. **Carte "Pré-course J-1 + petit-déj"** (allégée)
2. **Carte "Stratégie ravitos"** (ce qu'on trouve sur un semi typique)
3. **Carte "Faut-il vraiment manger ?"** (mouth rinse expliqué pour sub-1h30)
4. **Carte "Récupération post-semi"** (allégée — moins critique que marathon)
5. **Carte "Stratégie km par km"** (timeline)
6. **Carte "Erreurs classiques du premier semi"**

---

## Garde-fous sécurité indispensables (Marathon)

1. **Hyponatrémie d'effort** : warning explicite "Ne dépassez jamais 1 L/h. Si vous prenez du poids pendant la course, vous buvez trop. Symptômes : confusion, maux de tête, nausées → arrêtez de boire de l'eau pure, prenez du sodium."
2. **Hypoglycémie réactionnelle** : "Ne consommez rien de sucré entre 30 min avant le départ et le départ. Premier apport en course à 30-40 min minimum."
3. **Troubles digestifs (cause n°1 d'abandon)** : "Ne testez AUCUN aliment/gel nouveau le jour J. Toute stratégie nutrition doit être testée sur au moins 3 sorties longues."
4. **AINS post-course** : "Évitez ibuprofène/diclofénac post-marathon : risque accru d'insuffisance rénale aiguë et d'hyponatrémie."
5. **Surcharge glycogénique mal exécutée** : "Si vous augmentez vos glucides, gardez les fibres normales — pas de doublement de pâtes complètes (troubles GI garantis)."
6. **Caféine** : "Ne dépassez jamais 6 mg/kg de caféine totale jour J (effets secondaires : tachycardie, troubles digestifs, tremblements)."
7. **Cas particuliers à orienter médecin** : diabète, troubles rénaux, ATCD hyponatrémie, troubles du comportement alimentaire → "Cet outil ne remplace pas un avis médical."
8. **Premier marathon** : warning renforcé "Restez conservateur sur les apports. Mieux vaut 60 g/h bien tolérés que 100 g/h vomis au km 25."

## Garde-fous sécurité indispensables (Semi)

1. **Mêmes warnings hyponatrémie** (plus rare mais existe, surtout femmes < 60 kg sub-2h30)
2. **Mêmes warnings troubles digestifs** (n°1 cause d'abandon chez débutants)
3. **Pas d'apport last-minute** (< 30 min avant départ)
4. **Premier semi** : "Restez sur 20-40 g/h max, ne testez rien de nouveau."
5. **Cas médicaux particuliers** : idem marathon

---

## SEO — Top 20 KW longue traîne à ajouter (Marathon)

(Volumes mensuels estimés FR via Ahrefs/Semrush 2025-2026)

| KW | Volume | Intention |
|---|---|---|
| alimentation avant marathon | 880 | Informationnel pré-course |
| petit déjeuner avant marathon | 720 | Informationnel pré-course (très chaud) |
| ravitaillement marathon | 720 | Stratégie |
| gel marathon | 590 | Commercial + info |
| pasta party marathon | 210 | Pré-course tradition |
| que manger après marathon | 390 | Récup |
| récupération marathon | 480 | Récup |
| mur du marathon | 320 | Compréhension physio |
| mur du 30e km | 170 | Idem |
| caféine marathon | 170 | Stratégie perf |
| gel caféiné marathon | 110 | Commercial + info |
| boisson isotonique marathon | 210 | Commercial + info |
| hydratation marathon | 590 | Stratégie |
| sel marathon | 110 | Stratégie |
| cap sel marathon | 90 | Commercial |
| crampes marathon | 320 | Problème |
| nausées marathon | 110 | Problème |
| point de côté marathon | 170 | Problème |
| surcharge glycogénique marathon | 140 | Pré-course expert |
| gut training course à pied | 90 | Expert |
| dernier repas avant marathon | 320 | Pré-course |
| exemple plan nutrition marathon 3h30 | 140 | Long-tail expertise |
| nutrition marathon des sables | 480 | Hors-scope mais traffic |

**Recommandation** : intégrer naturellement 15-20 de ces KW dans le texte SEO ; viser 1800-2500 mots.

## SEO — Top 15 KW longue traîne à ajouter (Semi)

| KW | Volume | Intention |
|---|---|---|
| alimentation avant semi marathon | 480 | Pré-course |
| petit déjeuner avant semi marathon | 390 | Pré-course |
| que manger avant un semi marathon | 320 | Pré-course |
| ravitaillement semi marathon | 210 | Stratégie |
| gel semi marathon | 170 | Commercial |
| hydratation semi marathon | 170 | Stratégie |
| faut-il manger pendant un semi marathon | 90-170 | Intention forte expertise — À CONFIRMER |
| récupération semi marathon | 110 | Récup |
| caféine semi marathon | 70 | Stratégie |
| dernier repas avant semi marathon | 140 | Pré-course |
| pasta party semi marathon | 90 | Tradition |
| premier semi marathon nutrition | 110 | Débutant |
| crampes semi marathon | 90 | Problème |
| point de côté semi | 110 | Problème |
| mur semi marathon | 70 | Compréhension |
| que manger après semi marathon | 170 | Récup |

---

## FAQ — 15 vraies questions de marathoniens (au lieu de 10 génériques)

1. **Faut-il faire une pasta party la veille du marathon ?** (intention : tradition, volume ~210/mois)
2. **À quelle heure prendre le petit-déjeuner avant un marathon ?** (intention : timing, volume ~390/mois)
3. **Que manger 3h avant un marathon ?** (intention : pré-course)
4. **Combien de gels prendre sur un marathon ?** (intention : quantité)
5. **Quel premier gel et à quel km ?** (intention : timing)
6. **Faut-il boire à chaque ravitaillement ?** (intention : stratégie ravitos)
7. **Boisson isotonique ou eau pendant un marathon ?** (intention : choix)
8. **Pourquoi je vais frapper le mur du 30e km et comment l'éviter ?** (intention : peur, très fort)
9. **Caféine et marathon : combien et quand ?** (intention : stratégie)
10. **Que faire si j'ai des nausées en plein marathon ?** (intention : problème en course)
11. **Comment éviter les crampes en marathon ?** (intention : problème)
12. **Combien de temps pour récupérer après un marathon ?** (intention : récup)
13. **Que manger juste après l'arrivée d'un marathon ?** (intention : récup immédiate)
14. **Peut-on boire de l'alcool après un marathon ?** (intention : tradition, attention nuance)
15. **Premier marathon : quelles erreurs nutrition à éviter ?** (intention : débutant)

## FAQ — 12 vraies questions de semi-marathoniens (au lieu de 8 génériques)

1. **Faut-il vraiment manger pendant un semi-marathon ?** (intention forte, le KW phare)
2. **Combien de gels pour un semi en 1h45 / 2h / 2h30 ?**
3. **À quelle heure manger avant un semi ?**
4. **Que manger le matin d'un semi ?**
5. **Faut-il boire à tous les ravitaillements d'un semi ?**
6. **Premier semi-marathon : comment se nourrir ?**
7. **Caféine avant un semi-marathon : utile ou non ?**
8. **Que faire si j'ai un coup de pompe au km 15 ?**
9. **Mouth rinse au semi : qu'est-ce que c'est et ça marche ?**
10. **Pasta party la veille d'un semi : utile ?**
11. **Que manger après un semi-marathon ?**
12. **Crampes en fin de semi : comment les éviter ?**

---

## Brief MARATHON réécrit (proposition complète prête pour le dev)

```
🏃 NUTRITION MARATHON — /outils/nutrition-marathon

DISTANCE : 42,195 km (fixe, non éditable)

INPUTS UTILISATEUR (9) :
- Chrono visé (sélecteur + saisie libre : sub-2h30 / sub-3h / sub-3h30 / sub-4h / sub-4h30 / sub-5h / sub-5h30+)
- Poids (kg, slider 40-120)
- Sexe (F / H / non précisé)
- Niveau (Débutant / Intermédiaire / Confirmé / Expert)
- Premier marathon ? (Oui / Non)
- Heure de départ (matin tôt 7-9h / matin tard 9-11h / midi)
- Température prévue (slider 5°C-35°C par 5°C, défaut 15°C)
- Humidité (faible / modérée / élevée)
- Profil sudation (3 questions auto-évaluation → score salty sweater)
- Gut training réalisé ? (Oui / Non)
- Sensibilité digestive (Faible / Moyenne / Élevée)
- Tolérance caféine (Jamais / Occasionnelle / Quotidienne)

CALCULS MOTEUR :
- Glucides/h selon chrono visé (table 5 paliers + ajustement gut training -20% si non)
- Hydratation L/h selon matrice profil × température (table 4×3)
- Sodium mg/h selon profil sudation × température (table 3×3)
- Caféine totale (3-6 mg/kg) répartie pré-course + 2 gels caféinés
- Glucides pré-course petit-déj : 1-4 g/kg selon heure de départ et tolérance
- Surcharge glycogénique J-3 à J-1 : 7-10 g/kg/j
- Récup H+0 (1.0-1.2 g/kg gluc + 0.25-0.4 g/kg prot) + H+0 à H+24 (7-10 g/kg)

OUTPUT — 9 CARTES :
1. Pré-course J-3 à J-1 (surcharge glycogénique + 3 exemples menus)
2. Jour J — petit-déj H-3 (calcul personnalisé + 3 exemples selon heure de départ)
3. Stratégie en course (timeline km par km avec gels/boisson)
4. Stratégie ravitos officiels (compter les gobelets iso, déduire des gels propres)
5. Sodium (dosage par profil sudation × météo)
6. Caféine (répartition)
7. Récupération H+0 à H+24
8. Gut training pré-course (protocole 8 semaines)
9. Plan B en cas de pépin (nausée / hypo / point de côté)

GARDE-FOUS AFFICHÉS :
- Warning hyponatrémie (jamais > 1 L/h)
- Warning hypoglycémie réactionnelle (rien entre H-30 et H-0)
- Warning troubles digestifs (rien de nouveau le jour J)
- Warning AINS post-course
- Warning premier marathon (mode conservateur)
- Disclaimer médical (diabète, troubles rénaux, ATCD hyponatrémie, TCA)

SEO (1800-2500 mots, vs 700-900 initial) :
KW principaux : nutrition marathon (390), ravitaillement marathon (720), petit déjeuner avant marathon (720), alimentation avant marathon (880), gel marathon (590), récupération marathon (480), hydratation marathon (590), mur du marathon (320)
KW longue traîne (15 supplémentaires) : voir tableau ci-dessus

H2/H3 STRUCTURE :
- H2 Comment fonctionne le calculateur nutrition marathon
- H2 Glucides en marathon : combien par heure selon votre chrono ?
  - H3 Sub-3h : 80-100 g/h
  - H3 Sub-3h30 : 70-90 g/h
  - H3 Sub-4h : 60-80 g/h
  - H3 Sub-4h30 : 50-70 g/h
  - H3 Sub-5h et plus : 40-60 g/h
- H2 Hydratation marathon : combien boire selon météo et profil ?
  - H3 Matrice par température et poids
  - H3 Risque d'hyponatrémie d'effort (à ne pas négliger)
- H2 Sodium en marathon : la clé oubliée
  - H3 Faut-il prendre des capsules de sel ?
  - H3 Êtes-vous un "salty sweater" ?
- H2 Pré-course : la surcharge glycogénique moderne (3 jours)
  - H3 Combien de glucides J-3 à J-1
  - H3 Pasta party la veille : oui ou non ?
  - H3 Petit-déjeuner H-3 : le repas qui fait la course
- H2 Stratégie en course : quand prendre quoi ?
  - H3 Le premier gel : pas avant le km 10
  - H3 Cadence optimale (toutes les 20-30 min)
  - H3 Ravitaillements officiels : les utiliser intelligemment
- H2 Caféine et marathon : protocole prouvé
- H2 Le "mur du 30e km" : comprendre et l'éviter
- H2 Récupération marathon : H+0 à H+24
  - H3 Le snack des 30 premières minutes
  - H3 Le repas des 4 premières heures
  - H3 Réhydratation et sodium post-course
- H2 Gut training : entraîner son système digestif
- H2 Plans nutrition marathon par chrono
  - H3 Plan nutrition marathon sub-3h (exemple complet)
  - H3 Plan nutrition marathon sub-3h30
  - H3 Plan nutrition marathon sub-4h
  - H3 Plan nutrition marathon sub-4h30
  - H3 Plan nutrition marathon sub-5h
- H2 Erreurs classiques à éviter
- H2 FAQ marathon (15 questions)
```

## Brief SEMI réécrit (proposition complète prête pour le dev)

```
🏃 NUTRITION SEMI-MARATHON — /outils/nutrition-semi-marathon

DISTANCE : 21,1 km (fixe, non éditable)

INPUTS UTILISATEUR (8) :
- Chrono visé (sub-1h15 / sub-1h30 / sub-1h45 / sub-2h / sub-2h30 / sub-3h)
- Poids (kg, slider 40-120)
- Sexe (F / H / non précisé)
- Niveau (Débutant / Intermédiaire / Confirmé / Expert)
- Premier semi ? (Oui / Non)
- Température prévue (slider 5°C-35°C)
- Profil sudation (3 questions auto-évaluation)
- Sensibilité digestive (Faible / Moyenne / Élevée)
- Tolérance caféine (Jamais / Occasionnelle / Quotidienne)

CALCULS MOTEUR :
- Glucides/h selon chrono visé (table 6 paliers, dont mouth rinse pour sub-1h15)
- Hydratation L/h selon profil × température (table 3×3)
- Sodium selon profil × température
- Caféine pré-course (3-6 mg/kg) — pas de gels caféinés en course pour < 1h30
- Glucides pré-course petit-déj : 1-2 g/kg

OUTPUT — 6 CARTES :
1. Pré-course J-1 + petit-déj H-2/H-3 (allégé)
2. Faut-il vraiment manger pendant un semi ? (mouth rinse expliqué)
3. Stratégie en course (timeline km par km adapté au chrono)
4. Hydratation et sodium
5. Récupération H+0 à H+4
6. Erreurs classiques du premier semi

GARDE-FOUS AFFICHÉS :
- Warning hyponatrémie (femmes < 60 kg sub-2h30)
- Warning hypoglycémie réactionnelle
- Warning troubles digestifs (rien de nouveau le jour J)
- Warning premier semi (mode conservateur)
- Disclaimer médical

SEO (1500-2000 mots, vs 700-900 initial) :
KW principaux : nutrition semi marathon (170), alimentation avant semi marathon (480), petit déjeuner avant semi marathon (390), que manger avant un semi marathon (320), ravitaillement semi marathon (210), faut-il manger pendant un semi marathon (90-170, intention forte)
KW longue traîne : voir tableau ci-dessus

H2/H3 STRUCTURE :
- H2 Comment fonctionne le calculateur nutrition semi-marathon
- H2 Faut-il vraiment manger pendant un semi-marathon ?
  - H3 Sub-1h30 : pourquoi le mouth rinse peut suffire
  - H3 1h30 à 2h : 1 à 2 gels suffisent
  - H3 Au-delà de 2h : la stratégie ressemble à un mini-marathon
- H2 Glucides en semi : combien par heure ?
  - H3 Tableau par chrono visé
- H2 Hydratation semi : selon météo et chrono
  - H3 Matrice par température
  - H3 Sub-1h30 : 200-500 mL total suffisent
- H2 Sodium en semi : pour qui c'est utile ?
- H2 Pré-course semi : J-1 et matin de la course
  - H3 Dîner J-1 : pas de surcharge stricte
  - H3 Petit-déjeuner H-2 : 1-2 g/kg de glucides
- H2 Stratégie en course : timeline km par km
- H2 Caféine et semi : utile ou pas ?
- H2 Récupération post-semi (allégé)
- H2 Plans nutrition semi-marathon par chrono
  - H3 Plan nutrition semi sub-1h30
  - H3 Plan nutrition semi sub-1h45
  - H3 Plan nutrition semi sub-2h
  - H3 Plan nutrition semi sub-2h30
- H2 Premier semi : erreurs classiques à éviter
- H2 FAQ semi-marathon (12 questions)
```

---

## Sources scientifiques citées (bibliographie)

- ACSM Position Stand 2007 (Sawka et al.) — Exercise and Fluid Replacement
- ACSM Position Stand 2016 (Thomas, Erdman, Burke) — Nutrition and Athletic Performance
- Burke L. et al. 2008 — Caffeine for sports performance
- Burke L. et al. 2017 — Carbohydrates for training and competition
- Bussau V. et al. 2002 — Carbohydrate loading in human muscle
- Casa D. et al. 2019 — National Athletic Trainers Association Position Statement: Heat and Hydration
- Cermak N. & van Loon L. 2013 — The use of carbohydrates during exercise as an ergogenic aid (meta-analyse)
- Chambers E. et al. 2009 — Carbohydrate sensing in the human mouth (mouth rinse)
- Costa R. et al. 2017 — Systematic review: exercise-induced gastrointestinal syndrome
- Coyle E. et al. 1986 — Muscle glycogen utilization during prolonged strenuous exercise
- Earhart E. et al. 2015 — Sodium supplementation in endurance exercise
- Fairchild T. et al. 2002 — Rapid carbohydrate loading (Western Australia method)
- Hew-Butler T. et al. 2015 — Statement of the 3rd International Exercise-Associated Hyponatremia Consensus
- Howatson G. et al. 2010 — Tart cherry juice and marathon recovery
- IAAF Consensus Statement 2019 — Nutrition for Athletics (Burke, Hawley, Jeukendrup et al.)
- Ivy J. 1988 — Muscle glycogen synthesis after exercise
- Jeukendrup A. 2010 — Carbohydrate intake during exercise and performance
- Jeukendrup A. 2014 — A step towards personalized sports nutrition: carbohydrate intake during exercise
- King A. et al. 2022 — Carbohydrate dose-response in marathon running
- Lipman G. et al. 2017 — Ibuprofen vs placebo for acute kidney injury in ultramarathoners
- Maughan R. & Shirreffs S. 2019 — Muscle cramping during exercise
- Moore D. et al. 2014 — Distribution of protein intake across the day
- Pedersen D. et al. 2008 — High rates of muscle glycogen resynthesis after exhaustive exercise
- Pfeiffer B. et al. 2012 — Nutritional intake and gastrointestinal problems during competitive endurance events
- Shirreffs S. et al. 1996 — Post-exercise rehydration in man
- Stellingwerff T. & Cox G. 2014 — Systematic review: carbohydrate supplementation on exercise performance
- Viribay A. et al. 2020 — Effects of 120 g/h of carbohydrates intake during a marathon
- Wall B. et al. 2015 — Current hydration guidelines are erroneous (revue critique)
```
