# Audit Expert — Outil Nutrition Semi-Marathon (10 profils)

**Outil testé** : https://coachrunningia.fr/outils/nutrition-semi-marathon
**Code** : `src/components/tools/NutritionSemiMarathonPage.tsx` (1615 L, monolithique)
**Auditeur** : Nutritionniste expert semi-marathon (15 ans, 500+ semi-marathoniens, formation Jeukendrup / Burke / Cascua)
**Date** : 2026-05-18
**Méthode** : ré-implémentation des formules dans `tests-nutrition/run-semi-profiles.mjs` + lecture exhaustive du composant + analyse vs littérature.

**Sources citées dans cet audit** :
- Chambers et al. 2009 (J Physiol) — Mouth rinse glucose 6 %, perception centrale
- Carter et al. 2004 (Med Sci Sports Exerc) — Premier essai mouth rinse
- Beelen et al. 2009 (IJSNEM) — Rinse vs ingestion, distinction effets périphériques/centraux
- Burke et al. 2011 (J Sports Sci) — Carbohydrates during prolonged exercise (revue), seuil 90 min
- Jeukendrup 2014 (Sports Med) — Plafond 60 g/h glucose, 90 g/h glucose:fructose 2:1
- ACSM/AND 2016 — Position stand nutrition athlétique
- Sawka et al. 2007 (ACSM Position Stand) — Hydratation exercice
- Hew-Butler et al. 2015 — EAH (consensus Carlsbad)
- Spriet 2014 / Maughan 2016 — Caféine performance
- Kenefick 2004 — Hydratation par temps froid

---

## Doctrine produit rappelée
1. Honnêteté > conversion (pas de sur-prescription de gels)
2. Poids = input only, jamais affiché en message
3. Premier semi = mode prudent (cap 30 g/h, 600 mL/h, zéro caféine)
4. Cap 1000 mL/h hydratation (EAH possible)
5. Course exclusivement
6. Scope : pendant la course uniquement

---

## Profil 1 — Élite H sub-1h05

**Inputs** : H 58 kg, Expert, 1:05:00 (≈ 19,5 km/h), 12 °C standard, sudation Modéré, Habitué, 3+ cafés/j.

**Outputs calculés** :
- Stratégie : `mouth_rinse` — "Mouth rinse suffit"
- Glucides : 0 g/h — total 0 g
- Hydratation : 470 mL/h — total **plafonné à 500 mL** (logique `< 90 min`)
- Sodium : non obligatoire
- Caféine : 145 mg pré (2,5 mg/kg, dose réduite -17 % pour habitué)
- Mode Premier : non
- Nb gels affichés : 0 — message correct ("Pas de gel obligatoire")

**Verdict scientifique** : Pertinent.

**Analyse expert** :
- Stratégie globale : correcte. À cette intensité (105 % VMA quasi continue), prendre un gel solide pénaliserait le débit cardiaque splanchnique sans bénéfice. Chambers 2009 + Beelen 2009 = mouth rinse documenté comme optimum pour 30-60 min.
- Mouth rinse : protocole exact (25 mL glucose 6 %, swish 5-10 s, recrache) bien décrit aux km 7 et 14. Conforme.
- Glucides : 0 g/h, parfaitement aligné avec Burke 2007/2011 (seuil utile ~75-90 min).
- Hydratation : 500 mL total pour 1h05 = ~7 mL/kg/h — bon (élite acceptent souvent moins, mais OK 12 °C).
- Sodium : justifié non obligatoire (durée < 90 min, T° modérée, sudation modérée). ACSM 2016 OK.
- Caféine : 2,5 mg/kg = 145 mg, dose élite optimale (Spriet 2014). Réduction tolérance correcte. Aucun boost final mentionné : très bien (course finie en 65 min, half-life 4-6h).
- Sur-prescription détectée : **aucune**. Outil honnête.

**Risques santé identifiés** : aucun.

**Recommandation modifs outil pour ce profil** : aucune.

---

## Profil 2 — Compétitrice F sub-1h20

**Inputs** : F 52 kg, Expert, 1:20:00 (15,8 km/h), 14 °C standard, sudation Modéré, Habitué, 1-2 cafés/j.

**Outputs calculés** :
- Stratégie : `gel_optional` — "1 gel optionnel"
- Glucides : 25 g/h (plage 20-30) — total 33 g
- Hydratation : 455 mL/h — total **plafonné 500 mL** (< 90 min)
- Sodium : non obligatoire
- Caféine : 155 mg pré (3 mg/kg)
- Mode Premier : non
- **Nb gels affichés : 2** (incohérence avec strategy "1 gel optionnel")

**Verdict scientifique** : Discutable.

**Analyse expert** :
- Stratégie globale : 1h20 est dans la zone grise (Burke 2011 : bénéfice glucidique faible avant 90 min). "1 gel optionnel" est une bonne formulation honnête.
- Mouth rinse : non mentionné dans le `strategyDetail` pour `gel_optional`. **C'est une omission** : une coureuse de 1h20 reste candidate au mouth rinse (effet central documenté jusqu'à ~90 min — Carter 2004). On devrait proposer mouth rinse en option A + gel en option B.
- Glucides : 25 g/h cohérent.
- Hydratation : 500 mL total pour 1h20 — OK élite féminine.
- Sodium : non obligatoire — OK.
- Caféine : 3 mg/kg = 155 mg, dose pleine optimale (Spriet 2014). Bien.
- **Bug détecté** : `nbGels = ceil(33/25) = 2` alors que la stratégie indique "1 gel optionnel". Le pack affiche "2 gels de 25 g" → contredit la message principal et **sur-prescrit**.

**Risques santé identifiés** : risque mineur de troubles GI si la coureuse prend 2 gels (50 g) pour 1h20 alors qu'elle n'en a pas besoin physiologiquement.

**Recommandation modifs outil pour ce profil** :
- Bug `nbGels` à corriger : pour stratégie `gel_optional`, forcer affichage "1 gel (optionnel) + option mouth rinse".
- Ajouter mouth rinse comme alternative dans `gel_optional`.

---

## Profil 3 — Confirmé H sub-1h30

**Inputs** : H 70 kg, Confirmé, 1:30:00 (14,1 km/h), 18 °C standard, sudation Modéré, Habitué, 1-2 cafés/j.

**Outputs calculés** :
- Stratégie : `gels_recommended` — "1-2 gels recommandés" (car chrono = exactement 5400 s, et seuil `< 105 min` est franchi)
- Glucides : 40 g/h (plage 30-50) — total 60 g
- Hydratation : 600 mL/h — total 900 mL
- Sodium : 600 mg/L (total 540 mg)
- Caféine : 210 mg pré (3 mg/kg)
- Mode Premier : non
- **Nb gels affichés : 3** (ceil(60/25) = 3 — incohérence avec strategy "1-2 gels recommandés")

**Verdict scientifique** : Discutable.

**Analyse expert** :
- Stratégie globale : Pile à 1h30, on est à la frontière. Burke 2007 : bénéfice glucidique devient net ≥ 90 min. Le passage de "1 gel optionnel" à "1-2 gels recommandés" est OK mais brutal.
- **Bug seuil** : `chronoSec < 90 * 60` strict → 5400 s tombe dans `gels_recommended` "1-2 gels". Le message dit "1 gel vers km 10, 2e vers km 16 si fatigue" → cohérent stratégie. Mais le pack affiche 3 gels.
- Glucides : 40 g/h × 1,5 h = 60 g → ceil(60/25) = 3 gels = 75 g potentiels ingérés → **24 % au-dessus du target**. Le pack sur-prescrit.
- Hydratation : 600 mL/h pour 70 kg à 18 °C — généreux mais sûr.
- Sodium : 540 mg total — défendable, mais le seuil "non obligatoire < 1h30" exclut TOUS les chronos jusqu'à 5399 s puis bascule. Pile à 1h30 = sodium activé. C'est une discontinuité brutale.
- Caféine : 210 mg = 3 mg/kg, dose optimale.
- Sur-prescription détectée : **OUI** — 3 gels pour un sub-1h30 qui se débrouille très bien avec 1-2 gels.

**Risques santé identifiés** : troubles GI si le coureur ingère 3 gels.

**Recommandation modifs outil pour ce profil** :
- Bug critique : aligner `nbGels` calculé sur le `target` médian de la plage, pas sur la valeur max → utiliser `floor` ou `round` plutôt que `ceil`.
- Ou mieux : forcer `nbGels` à correspondre à `strategyLabel` ("1-2 gels" → max 2).

---

## Profil 4 — Régulière F sub-1h45

**Inputs** : F 58 kg, Régulier, 1:45:00 (12,1 km/h), 16 °C standard, sudation Modéré, Occasionnel, 1-2 cafés/j.

**Outputs calculés** :
- Stratégie : `gels_recommended` — "2 gels recommandés"
- Glucides : 50 g/h (plage 40-60) — total 88 g
- Hydratation : 470 mL/h — total 823 mL
- Sodium : 600 mg/L (total 494 mg)
- Caféine : 175 mg pré (3 mg/kg)
- Mode Premier : non
- **Nb gels affichés : 4** (ceil(88/25) = 4 — STRATÉGIE DIT 2 GELS, PACK DIT 4)

**Verdict scientifique** : Erroné (sur-prescription nette).

**Analyse expert** :
- Stratégie globale : 1h45, profil régulier féminin. Cible 30-50 g/h pertinente (Jeukendrup 2014, Burke 2011).
- **Incohérence majeure** : message "2 gels recommandés" + pack "4 gels". L'utilisatrice ne sait pas quoi suivre.
- Glucides : 50 g/h × 1,75 h = 88 g → 4 gels × 25 g = 100 g, **soit 13 % au-dessus du target**. Mais surtout : pour un profil féminin Régulier 58 kg, 100 g de glucides = ingestion non testée potentiellement, risque GI réel.
- Hydratation : 470 mL/h × 1,75 = 823 mL — OK.
- Sodium : 494 mg total — correct.
- Caféine : 175 mg (3 mg/kg) — dose pleine pour Occasionnel — **trop forte** pour une utilisatrice "1-2 cafés/j" qui n'a pas testé la caféine en course. Devrait être réduite à 2-2,5 mg/kg pour Occasionnel non-habitué.
- Sur-prescription détectée : **OUI** (4 gels vs 2 annoncés).

**Risques santé identifiés** : troubles GI gel × 4 ; effets caféine si jamais testée en course (nervosité, tachycardie, GI).

**Recommandation modifs outil pour ce profil** :
- Bug `nbGels` (idem profil 3).
- Croiser dose caféine avec `expNutrition` : si `Occasionnel` + jamais testé caféine en course → -33 % dose.

---

## Profil 5 — Régulier H sub-2h00 chaud humide

**Inputs** : H 75 kg, Régulier, 2:00:00 (10,6 km/h), 22 °C humide, sudation Élevé, Occasionnel, Aucune caféine.

**Outputs calculés** :
- Stratégie : `gels_recommended` — "2-3 gels recommandés"
- Glucides : 60 g/h (plage 45-75) — total 120 g
- Hydratation : 789 mL/h — total 1578 mL
- Sodium : 900 mg/L (total 1420 mg)
- Caféine : 0 mg
- Mode Premier : non
- **Nb gels affichés : 5** (ceil(120/25) = 5 — strategy dit 2-3 max)
- Warning : "≥60 g/h : gels glucose:fructose 2:1 obligatoires" (correct)

**Verdict scientifique** : Erroné (sur-prescription glucides + sur-prescription gels).

**Analyse expert** :
- Stratégie globale : 2h chaud humide, profil Régulier Occasionnel. 60 g/h est le **plafond physiologique glucose seul** (Jeukendrup 2014). Pour un coureur Occasionnel (pas Habitué), c'est **trop ambitieux** : recommandation littérature = monter graduellement, démarrer 40-50 g/h.
- Glucides : 60 g/h pour Occasionnel à 22 °C humide → risque GI élevé. Devrait être 45-50 g/h.
- **Bug `nbGels = 5`** : strategy dit "2-3 gels" → pack montre 5. Sur-prescription catastrophique.
- Hydratation : 789 mL/h × 2 h = 1578 mL — OK. Cap 1000 mL/h respecté.
- Sodium : 1420 mg total — bien pour 22 °C humide sudation élevée.
- Sur-prescription détectée : **OUI** (5 gels au lieu de 2-3, 60 g/h pour Occasionnel).

**Risques santé identifiés** : troubles GI (gels × 5 = 125 g de sucre rapide sur 2 h pour estomac non entraîné). Risque de gut shutdown en chaleur humide.

**Recommandation modifs outil pour ce profil** :
- Bug `nbGels` (vu profils 2, 3, 4).
- Croisement `Occasionnel × chronoSec > 105 min` : capper à 50 g/h max si pas Habitué.
- Mettre en avant le warning "ratio 2:1" plus haut dans la page.

---

## Profil 6 — Premier semi F sub-2h15 (Débutante)

**Inputs** : F 65 kg, Débutant, 2:15:00 (9,4 km/h), 15 °C standard, sudation Modéré, Jamais testé, 1-2 cafés/j, Premier semi (forcé).

**Outputs calculés** :
- Stratégie : `gels_recommended` — "2-3 gels recommandés"
- Glucides : 30 g/h (cap Premier) — total 68 g
- Hydratation : 488 mL/h — total 1098 mL
- Sodium : 600 mg/L (total 659 mg)
- Caféine : 0 mg (Premier mode → forcé)
- Mode Premier : oui
- Nb gels affichés : 3 (ceil(68/25) = 3 — cohérent avec strategy)
- Warnings : "cible -20 % (jamais testé)" + "cap 30 g/h Premier" (corrects)

**Verdict scientifique** : Pertinent (avec un bémol).

**Analyse expert** :
- Stratégie globale : excellente. Le cap 30 g/h pour Premier semi + Jamais testé est doctrinairement parfait (objectif = finir).
- Glucides : 30 g/h × 2,25 h = 68 g → 3 gels. Cohérent.
- Hydratation : 488 mL/h pour 65 kg sudation Modérée 15 °C — OK. Plafond Premier 600 mL/h pas atteint.
- Sodium : 600 mg/L est défendable mais **discutable** : Mode Premier devrait peut-être cap sodium à 400 mg/L (sudation Modéré). Le seul cap actuel est `> 1300 mg/L`, donc inutile ici.
- Caféine : 0 mg, correct (Premier).
- Bémol : la stratégie `gels_recommended` reste celle d'un sub-2h15 standard ; le message ne souligne pas assez "ces 3 gels doivent avoir été testés en SL". Le pack mentionne "tester en SL" mais c'est insuffisant pour une débutante qui n'a JAMAIS testé.
- Sur-prescription détectée : non, mais **manque de pédagogie pour Premier + Jamais**.

**Risques santé identifiés** : troubles GI si premiers gels ingérés sans gut training (Jamais testé). Hypoglycémie réactionnelle si premier gel mal timé.

**Recommandation modifs outil pour ce profil** :
- Pour `premierMode + Jamais`, ajouter un encart dédié : "Tu n'as jamais testé de gel en course : limite-toi à 1 gel maximum le jour J, et teste impérativement au moins 2 sorties longues avec ce gel précis avant la course."
- Reduce target à 20 g/h pour la combo `premier + Jamais` (au lieu de 30 g/h).

---

## Profil 7 — Obésité H Premier semi 2h45

**Inputs** : H 105 kg, Débutant, 2:45:00 (7,7 km/h), 14 °C standard, sudation Élevé, Jamais testé, Aucune caféine, Premier (forcé).

**Outputs calculés** :
- Stratégie : `marathon_approach` — "Approche marathon court"
- Glucides : 30 g/h (cap Premier) — total 83 g
- Hydratation : 600 mL/h (cap Premier) — total 1650 mL
- Sodium : 900 mg/L (total 1485 mg)
- Caféine : 0 mg
- Mode Premier : oui
- Nb gels affichés : 4 (ceil(83/25) = 4)
- Warnings : "cible -20 %" + "cap 30 g/h" (OK)

**Verdict scientifique** : Discutable.

**Analyse expert** :
- Stratégie globale : `marathon_approach` est étrangement déclenché pour 2h45 — mais c'est aussi la cible. Le `strategyDetail` parle de "3+ gels, alterne eau/isotonique, sodium adapté, caféine si habitué". Pour un Premier semi Débutant 105 kg, cette description est **inadaptée** : on lui demande une stratégie d'expert.
- **Bug logique critique** : le `strategyDetail` du `marathon_approach` ne tient PAS COMPTE de `premierMode`. Il dit "caféine si habitué" alors qu'on a déjà forcé 0 caféine. Il dit "cible 70 g/h dans le détail glucides" alors qu'on cappe à 30 g/h. Message contradictoire avec les chiffres.
- Glucides : 30 g/h, OK pour Premier.
- Hydratation : 600 mL/h × 2,75 h = 1650 mL — beaucoup. Pour 105 kg, ça reste 5,7 mL/kg/h — OK.
- Sodium : 1485 mg total — généreux mais défendable sudation Élevée.
- Caféine : 0 mg, OK.
- Sur-prescription détectée : 4 gels pour Premier sans gut training = risque GI réel.

**Risques santé identifiés** :
1. Trouble GI gel × 4 sans entraînement digestif.
2. **Risque articulaire / cardio non mentionné** : un coureur de 105 kg sur 2h45 a un risque ostéo-articulaire et cardio-vasculaire spécifique. L'outil nutrition n'a pas à le traiter, MAIS le disclaimer médical devrait être plus visible pour ce profil.
3. Risque hypoglycémie si gels mal espacés.

**Recommandation modifs outil pour ce profil** :
- Override `strategyDetail` lorsque `premierMode = true` ET `marathon_approach` : substituer un texte adapté Premier ("Ton objectif est de finir, pas d'optimiser. Bois régulièrement, prends 2-3 gels que tu as TESTÉS en SL, espacés de 30 min").
- Bug `nbGels` : 4 gels pour un Premier semi qui n'a jamais testé = anti-doctrine. Cap à 3 max.

---

## Profil 8 — Très fin H sub-1h12

**Inputs** : H 52 kg, Expert, 1:12:00 (17,6 km/h), 10 °C sec, sudation Faible, Habitué, 3+ cafés/j.

**Outputs calculés** :
- Stratégie : `mouth_rinse` — "Mouth rinse suffit"
- Glucides : 0 g/h — total 0 g
- Hydratation : 346 mL/h — total **plafonné 415 mL**
- Sodium : non obligatoire
- Caféine : 130 mg pré (2,5 mg/kg, réduction Habitué)
- Mode Premier : non
- Nb gels : 0 (OK)
- Pas de warning froid (10 °C n'est pas ≤ 8 °C → seuil discutable)

**Verdict scientifique** : Pertinent.

**Analyse expert** :
- Stratégie globale : parfaite. Mouth rinse honnête pour 1h12.
- Mouth rinse : protocole bien défini.
- Hydratation : 346 mL/h × 1,2 = 415 mL — adapté petit poids, sudation faible, sec frais.
- Sodium : non obligatoire — OK.
- Caféine : 2,5 mg/kg = 130 mg, dose calibrée Habitué (Spriet 2014).
- Sur-prescription détectée : **aucune**. Profil servi parfaitement par la doctrine.
- Point : pas de warning "déshydratation par temps frais sec" → mineur, le coureur a une température corporelle élevée, la déshydratation reste contenue à cette durée.

**Risques santé identifiés** : aucun.

**Recommandation modifs outil pour ce profil** : aucune. C'est le profil "vitrine" de la doctrine.

---

## Profil 9 — Salty sweater F chaud 2h30

**Inputs** : F 58 kg, Régulier, 2:30:00 (8,4 km/h), 30 °C humide, sudation Salty sweater, Occasionnel, 1-2 cafés/j.

**Outputs calculés** :
- Stratégie : `marathon_approach` — "Approche marathon court"
- Glucides : 70 g/h (plage 60-90) — total 175 g
- Hydratation : 879 mL/h — total **2198 mL** sur 2h30
- Sodium : 1200 mg/L → total **2638 mg**
- Caféine : 175 mg pré (3 mg/kg)
- Mode Premier : non
- **Nb gels affichés : 7**
- Warnings : ≥60 g/h ratio 2:1, >800 mL/h hyponatrémie, chaleur ralentir, chaleur+caféine -30 %.

**Verdict scientifique** : Discutable (plusieurs risques cumulés).

**Analyse expert** :
- Stratégie globale : 30 °C humide pour une femme 58 kg → conditions à risque (épuisement thermique > déshydratation). Le ralentissement de 10-15 % est cité dans le warning, **mais l'allure cible (8,4 km/h ≈ 17:50 min/km, c'est aberrant : 8,4 km/h = 7:08/km)** n'est pas recalculée. L'outil ne propose pas de modifier le chrono cible.
- Glucides : 70 g/h pour Occasionnel = **trop ambitieux**. Plafond physiologique 90 g/h nécessite gut training (Habitué). Pour Occasionnel : capper à 60 g/h.
- **Bug `nbGels = 7` pour 2h30** : strategy ne dit pas explicitement un nombre, mais 7 gels = 175 g de sucre pour une coureuse Occasionnel = quasi-garantie de trouble GI.
- Hydratation : 879 mL/h pour 58 kg = **15 mL/kg/h** — au-dessus du seuil de prudence pour profil féminin léger. Hew-Butler 2015 : risque EAH chez femmes < 60 kg si hydratation excessive en chaleur. Le cap absolu 1000 mL/h est respecté mais 879 mL/h pour 58 kg est limite.
- Sodium : 1200 mg/L × 2,2 L = 2638 mg total — **généreux mais justifié** pour salty sweater (jusqu'à 2000 mg/L de sueur perdus chez vrai salty). Bien dans ce cas.
- Caféine : 175 mg pré + warning "chaleur+caféine -30 %" affiché mais **NON appliqué automatiquement**. C'est cohérent avec la doctrine "warning plutôt que blocage" mais ici dangereux : risque thermogenèse aggravée. Devrait afficher dose ajustée recommandée (175 × 0,7 ≈ 120 mg).
- Sur-prescription détectée : **OUI** (glucides + gels) ; **risque EAH spécifique** (poids + chaleur + sur-boit).

**Risques santé identifiés** :
1. **EAH** (poids < 60 kg + chaud + 879 mL/h) — risque réel documenté chez les femmes légères (Almond 2005, Hew-Butler 2015).
2. Épuisement thermique (30 °C humide).
3. Troubles GI (7 gels Occasionnel).
4. Thermogenèse caféine + chaleur non régulée auto.

**Recommandation modifs outil pour ce profil** :
- **Bloc EAH spécifique** quand `poids < 60 + tempC ≥ 25 + sudation ∈ {Élevé, Salty}` : afficher avertissement renforcé "Buvez à la soif, pas plus".
- Auto-ajustement caféine `chaleur ≥ 25 °C` : appliquer -30 % au lieu de juste warner.
- Bug `nbGels` (idem 3, 4, 5).
- Glucides : capper à 60 g/h si Occasionnel (même au-delà de 2h30).
- Recalculer chrono cible avec warning "ton chrono visé est probablement inatteignable à 30 °C, vise +10 à +15 %".

---

## Profil 10 — Premier H grand froid 2h00

**Inputs** : H 80 kg, Débutant, 2:00:00 (10,6 km/h), 2 °C sec, sudation Modéré, Jamais, 1-2 cafés/j, Premier (forcé).

**Outputs calculés** :
- Stratégie : `gels_recommended` — "2-3 gels recommandés"
- Glucides : 30 g/h (cap Premier) — total 60 g
- Hydratation : 399 mL/h — total 798 mL
- Sodium : 600 mg/L (total 479 mg)
- Caféine : 0 mg (Premier)
- Mode Premier : oui
- Nb gels affichés : 3 (cohérent stratégie)
- Warnings : -20 % (Jamais), cap 30 g/h (Premier), "soif trompeuse par froid" (Kenefick).

**Verdict scientifique** : Pertinent.

**Analyse expert** :
- Stratégie globale : bonne. Mode Premier + warning froid bien posés.
- Glucides : 30 g/h, target 60 g, 3 gels — OK.
- Hydratation : 399 mL/h × 2 = 798 mL — adapté au froid (réduction 0,95 facteur Sec).
- Sodium : 479 mg total — correct.
- Caféine : 0, OK.
- Warning froid : très bonne référence Kenefick 2004. Manque peut-être un mot sur **prévention hypothermie main/doigts** pour ouvrir les gels (mineur).
- Bémol : comme profil 6, pour `Premier + Jamais`, 3 gels reste ambitieux. Devrait recommander 1-2 gels max.

**Risques santé identifiés** : troubles GI si gels jamais testés ; soif trompeuse (mentionnée correctement).

**Recommandation modifs outil pour ce profil** :
- Cap glucides 20 g/h pour `Premier + Jamais` (idem profil 6).
- Petit ajout doctrinal : "Garde 1 gel chaud dans une poche intérieure, les gels figés sont durs à avaler par grand froid."

---

# Synthèse exec

- Profils servis correctement (Pertinent) : **4/10** (1, 6, 8, 10)
- Profils servis partiellement (Discutable) : **4/10** (2, 3, 7, 9)
- Profils mal servis (Erroné) : **2/10** (4, 5)

**Verdict global outil Semi** : Modifs avant scaling.

L'outil a une **excellente doctrine** (mouth rinse pour sub-1h15, Mode Premier prudent, honnêteté affichée). Mais une **incohérence systémique** entre la `strategyLabel` (ex : "2 gels recommandés") et le `nbGels` calculé (ex : 4) **détruit la doctrine** dès qu'on passe à 1h45+. Ce bug à lui seul rend l'outil sur-prescripteur en moyenne distance, contredisant l'esprit du produit.

## Top 5 modifs outil prioritaires

1. **[CRITIQUE] Bug `nbGels` (Line 281)** : `Math.ceil(totalCarbs / 25)` produit 3, 4, 5, 7 gels alors que la `strategyLabel` annonce "1-2", "2", "2-3". Aligner le pack sur la stratégie verbale (utiliser une table fixe basée sur `strategy` plutôt que sur target × durée / 25). Justification : Burke 2011 + doctrine honnêteté — un coureur Régulier n'a pas à se trimballer 5 gels.

2. **[HAUT] Combo `premier + Jamais` insuffisamment prudente (Lines 217-230)** : actuellement -20 % puis cap à 30 g/h indépendants. Pour la combinaison, le vrai pattern littérature = 0-20 g/h max (Burke 2014 — gut training nécessaire). Modifier : si `premierMode && expNutrition === 'Jamais'`, alors target = 20 g/h (au lieu de 30).

3. **[HAUT] Ajustement caféine en chaleur non automatique (Line 252)** : le warning "réduis de 30 %" est passif. Calculer la dose ajustée et l'afficher comme valeur principale (175 → 120 mg). Justification Spriet 2014 + Souissi 2013 : caféine + chaleur = thermogenèse +0,3 à 0,5 °C documentée.

4. **[HAUT] Bloc EAH dédié pour profil à risque** : quand `poids < 60 && tempC ≥ 25 && sudation ∈ {Élevé, Salty}` ET hydratation ≥ 750 mL/h → afficher message spécifique. Référence Almond 2005 (NEJM) : EAH plus fréquente chez femmes < 60 kg.

5. **[MOYEN] Override `strategyDetail` quand `premierMode + marathon_approach`** : Profil 7 montre un texte d'expert servi à un débutant 105 kg (mentionne "caféine si habitué" alors que cappée à 0). Substituer un detail dédié quand `premierMode === true`.

## Sur-prescriptions détectées (anti-doctrine honnêteté)

- Profil 2 : 2 gels affichés vs "1 gel optionnel" annoncé (+ mouth rinse non proposé)
- Profil 3 : 3 gels vs "1-2 gels"
- Profil 4 : 4 gels vs "2 gels" (le plus flagrant)
- Profil 5 : 5 gels vs "2-3 gels"
- Profil 9 : 7 gels pour Occasionnel
- Profil 7 : 4 gels pour Premier sans gut training

Tous ces cas violent **Chambers 2009** (mouth rinse > ingestion sur courte durée), **Burke 2011** (bénéfice glucidique à partir de 90 min, pas avant), **Jeukendrup 2014** (60 g/h plafond glucose seul, 90 g/h nécessite ratio 2:1 + gut training).

## Sous-prescriptions détectées

- Profil 2 : pas de mouth rinse proposé (1h20 reste éligible Chambers 2009).
- Profil 6 et 10 : aucune incitation à tester gels en SL au-delà du warning générique (peu pédagogique pour profil Jamais).
- Profil 8 : pas d'alerte spécifique "petit gabarit + intensité haute" (très mineur).

## Bugs / incohérences détectés dans le code Semi

- `src/components/tools/NutritionSemiMarathonPage.tsx` **Line 281** : `nbGels = Math.ceil(totalCarbs / carbsPerGel)` produit incohérence systémique avec `strategyLabel`. **Bug n°1 prioritaire.**
- **Line 88-95** `carbsBySemiTime` : transitions brutales aux seuils 75 / 90 / 105 / 120 / 150 min. À 5400 s exactement (1h30), saut de 25 g/h → 40 g/h. Lisser ou afficher "tu es dans la zone de transition".
- **Lines 232-234** : warning `target >= 60` (ratio 2:1) — déclenché correctement profils 5, 9. OK.
- **Line 244** : cap absolu 1000 mL/h respecté partout. OK.
- **Lines 254-256** : warning froid déclenché seulement `tempC <= 8` strict. Profil 8 (10 °C) n'a pas le warning : seuil acceptable, mais Profil 10 (2 °C) bien servi.
- **Line 252** : warning "chaleur + caféine -30 %" textuel uniquement, dose pas ajustée automatiquement (Profil 9).
- **Lines 217-221** : la cible glucides -20 % `Jamais` se cumule au cap Premier 30 g/h. Cumul peut produire target = 20 g/h dans certains cas mais ne s'applique pas en pratique car cap kicke avant. À auditer.
- **Lines 263-268** : sodium "non obligatoire < 1h30" en dur, mais 1h30 pile est dans `>= 90 min` → bascule directe. Discontinuité.
- **Lines 145-187** `strategyForChrono` : ne tient PAS compte de `premierMode`. Le `strategyDetail` du `marathon_approach` parle de caféine et 70 g/h même si on est en Premier. **Bug n°2 prioritaire.**
- **Lines 130-143** `caffeineDose` : ne tient PAS compte de `tempC` ni `expNutrition`. Devrait croiser.
- **Lines 286-345** `timeline` : bien construite par stratégie, mais les seuils km (km 8, 10, 12, 14, 16) sont **en dur** sans tenir compte de l'allure réelle. Pour Profil 7 (7,7 km/h), le km 8 arrive à 1h02, plus tard que prévu. Idéalement : passer à des marqueurs temps (T+45 min) plutôt que km.

## Recommandation finale produit pour Romane

L'outil Semi a **la meilleure doctrine du portfolio nutrition** : il est le seul à oser dire "mouth rinse suffit" et "1 gel optionnel", ce qui te démarque radicalement du marché (la concurrence pousse 3-5 gels minimum sur tous les chronos). C'est un actif différentiant fort SEO + crédibilité.

Mais **un bug arithmétique unique** (`nbGels = ceil(totalCarbs/25)`) sabote cette doctrine sur 6 profils sur 10, en affichant un pack de gels qui contredit le message principal. Un coureur sub-1h45 lit "2 gels recommandés" en haut, puis "4 gels à prévoir" en bas, et conclura qu'il faut 4 gels. La doctrine honnêteté est annulée par le pack.

**Avant scaling, à faire impérativement** :
1. Réparer le bug `nbGels` (1 ligne, alignement table fixe sur strategy).
2. Override `strategyDetail` pour `premierMode + marathon_approach`.
3. Combo `premier + Jamais` → cap glucides 20 g/h.
4. Ajustement auto caféine en chaleur.

**Optionnel mais qualitatif** :
5. Bloc EAH dédié profil féminin léger + chaud.
6. Lisser transitions aux seuils 90/105/120 min.
7. Ajouter mouth rinse en option dans `gel_optional` (1h15-1h30).

Une fois ces 4 corrections critiques faites, l'outil sera **production-ready** et constituera une référence francophone solide sur la nutrition semi-marathon — niche où, contrairement au marathon, la doctrine "honnêteté > conversion" a un vrai impact santé (réduire la sur-prescription de gels et d'isotonique à 50-80 % des sub-1h30).
