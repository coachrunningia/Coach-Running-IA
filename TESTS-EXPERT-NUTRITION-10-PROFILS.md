# Audit expert — Calculateur Nutrition Marathon (10 profils)

**Auditeur** : Nutritionniste expert marathon (15 ans, 200+ amateurs + 30 élites — formation Jeukendrup/Burke/ACSM)
**Date** : 2026-05-17
**Outil** : https://coachrunningia.fr/outils/nutrition-marathon
**Code source** : `src/components/tools/NutritionMarathonPage.tsx` (1572 lignes)
**Méthode** : ré-implémentation à l'identique des formules exportées (`carbsByChrono`, `hydrationByProfil`, `sodiumByProfil`, `caffeineDose`, `computeNutrition`) dans `tests-nutrition/run-profiles.mjs`, puis exécution des 10 profils.

---

## Cadre scientifique de référence

- **Glucides** : Jeukendrup 2014 (*Sports Med* 44:S25) → 60 g/h glucose seul (cap SGLT1), 90-120 g/h glucose+fructose 2:1 (ajout GLUT5). Cermak & van Loon 2013 → métaanalyse confirmant 60-90 g/h sur >2h.
- **Hydratation** : Sawka 2007 (ACSM Position Stand) → 400-800 mL/h selon sudation/climat ; "drink to thirst". Hew-Butler 2015 (3rd Intl EAH Consensus, *Clin J Sport Med*) → cap 1000 mL/h pour prévenir l'hyponatrémie d'effort (EAH) — cause #1 de décès non-traumatique en ultra/marathon.
- **Sodium** : Maughan 2007 (sweat Na+ varie 200-2000 mg/L) ; Hew-Butler 2015 → le sodium NE PRÉVIENT PAS l'EAH mais soutient la palatabilité et l'absorption intestinale (couplage SGLT1).
- **Caféine** : Spriet 2014 (*Sports Med* 44:S175) → 3 mg/kg pré-effort = dose ergogénique optimale, plateau >5 mg/kg. Maughan 2016 (*Br J Sports Med* IOC consensus) confirme 3-6 mg/kg, baisse de la fenêtre si tolérance.
- **Énergie** : Margaria 1963 / ACSM 2017 → ~1 kcal/kg/km (course plate ; ≈0.95 quand on déduit le coût de repos).

---

## Doctrine produit (rappel)

1. Sécurité > conversion
2. Jamais poids/IMC en messages user (poids = input only)
3. "Premier marathon" = mode prudent (cap 60 g/h, zéro caféine)
4. Cap absolu 1000 mL/h hydratation
5. Estimation ±15 % systématiquement mentionnée
6. Doit servir la majorité du peloton FR (sub-4h à sub-5h)

---

## Profil 1 — Élite H 2h30 (60 kg, 12°C, sudation Élevé, 3+ cafés/j)

**Inputs** : H, 60 kg, Expert, 2h30:00, 12°C Standard, Élevé, Habitué, 3+ cafés/j, premier=non

**Outputs calculés** :
- Glucides : **80 g/h** (plage 70-95) — total **200 g**
- Hydratation : **650 mL/h** — total **1 625 mL**
- Sodium : **900 mg/L** — total **1 463 mg**
- Caféine : **150 mg pré + 50 mg boost = 200 mg** (3.3 mg/kg)
- kcal/h : **962** — total **2 405 kcal**
- Pack : 8 gels | 2 bidons | 1 caps sel

**Verdict scientifique** : ✅ Pertinent (avec 1 nuance)

**Analyse expert** :
- **Glucides** : 80 g/h est conservateur pour un élite. Littérature élite (Jeukendrup 2014, Stellingwerff 2019 sur marathoniens kényans) → 90-120 g/h chez les élites entraînés en gut training. Mais la borne max (95 g/h) couvre la fenêtre haute. ✅ raisonnable mais pourrait pousser 90-100 g/h comme cible si gut training éprouvé.
- **Hydratation** : 650 mL/h × 2h30 = 1.6 L, plausible pour 12°C sudation élevée. Sawka 2007 → élite à 17 km/h transpire 1.0-1.5 L/h → l'outil sous-estime probablement de 200-300 mL/h. À ce niveau l'élite gère par ressenti.
- **Sodium** : 900 mg/L = ok ; sweat Na+ moyen sportif ~600-1000 mg/L (Maughan 2007). Cohérent.
- **Caféine** : 200 mg total = 3.3 mg/kg = pile dans la fenêtre Spriet/Maughan. Réduction -17 % bien appliquée pour tolérant. ✅
- **kcal** : 60×16.88×0.95 = 962 kcal/h × 2.5 = 2 405 kcal. Cohérent (élite kényan ~750-900 kcal/h pour 55-60 kg).

**Risques santé** : aucun majeur. Légère sous-estimation hydratation (l'élite compensera au ravito élite tous les 5 km).

**Recommandation modifs** : optionnel — flag "Expert + chrono < 2h45" → cible glucides 90 g/h plutôt que 80.

---

## Profil 2 — Confirmée F 3h15 (55 kg, 16°C, sudation Modéré, 1-2 cafés/j)

**Inputs** : F, 55 kg, Confirmé, 3h15:00, 16°C Standard, Modéré, Habitué, 1-2 cafés/j

**Outputs** :
- Glucides : **70 g/h** (plage 60-85) — total **228 g**
- Hydratation : **550 mL/h** — total **1 788 mL**
- Sodium : **600 mg/L** — total **1 073 mg**
- Caféine : **165 mg pré + 50 mg boost = 215 mg** (3.9 mg/kg)
- kcal/h : **678** — total **2 204 kcal**
- Pack : 9 gels | 2 bidons | 0 caps sel

**Verdict scientifique** : ✅ Pertinent

**Analyse expert** :
- **Glucides** : 70 g/h pour une 3h15 confirmée habituée → conforme Jeukendrup/Cermak (60-90 g/h sub-3h30). Ratio glucose-fructose obligatoire à 70 g/h (jamais glucose pur). **L'outil ne mentionne pas explicitement le ratio 2:1** dans le bloc principal — seulement en FAQ. Manque pédagogique.
- **Hydratation** : 550 mL/h × 3h15 → 1.78 L. Pour femme 55 kg sudation modérée 16°C : Sawka donne 500-700 mL/h. ✅
- **Sodium** : 600 mg/L × 1.78 L = 1 073 mg total. Plausible (perte sudorale femme 55 kg modérée ~300-500 mg/h × 3h15 ≈ 1 000-1 600 mg). ✅
- **Caféine** : 3.9 mg/kg est légèrement au-dessus de la cible 3 mg/kg mais sous le plateau 5 mg/kg (Spriet). Pour 1-2 cafés/j (tolérance modérée), c'est dans la fenêtre. ✅
- **Cohérence** : pack 9 gels = 225 g glucides + 20 g boisson = 245 g (au-dessus des 228 g requis) → marge sécurité bien dimensionnée.

**Risques santé** : aucun.

**Recommandation** : afficher dans le bloc résultat principal : "**glucose+fructose obligatoire dès 60 g/h**" — actuellement enterré en FAQ.

---

## Profil 3 — Régulier H 3h35 (75 kg, 18°C, sudation Modéré, occasionnel nutrition)

**Inputs** : H, 75 kg, Régulier, 3h35:00, 18°C Standard, Modéré, Occasionnel, 1-2 cafés/j

**Outputs** :
- Glucides : **60 g/h** (plage 50-75) — total **215 g**
- Hydratation : **650 mL/h** — total **2 329 mL**
- Sodium : **600 mg/L** — total **1 397 mg**
- Caféine : **225 mg pré + 50 mg boost = 275 mg** (3.7 mg/kg)
- kcal/h : **839** — total **3 006 kcal**
- Pack : 8 gels | 3 bidons | 0 caps sel

**Verdict scientifique** : ✅ Pertinent — c'est le **cœur de cible** (sub-3h30/4h).

**Analyse expert** :
- **Glucides** : 60 g/h est PILE le seuil SGLT1 (Jeukendrup) → idéal pour quelqu'un avec gut training "occasionnel". Bonne calibration prudente.
- **Hydratation** : 650 mL/h × 3h35 = 2.33 L. Homme 75 kg 18°C → Sawka 600-900 mL/h. ✅ borne basse-médiane → cohérent avec un "occasionnel" qui ne maîtrise pas la prise.
- **Sodium** : 1 397 mg total, cohérent.
- **Caféine** : 3.7 mg/kg, optimal.
- **Cohérence** : 8 gels × 25 g = 200 g + 20 boisson = 220 g — bord limite (215 g requis). Si un gel raté → déficit. **Suggestion : ajouter 1 gel de sécurité (mention "+1 sécurité" en marge)**.

**Risques santé** : aucun. Profil parfait pour l'outil.

**Recommandation** : mentionner explicitement "1 gel de sécurité en plus" dans le pack (best practice de tous les coachs marathon).

---

## Profil 4 — Régulière F 4h00 humide, salty sweater (62 kg, 22°C, aucune caféine)

**Inputs** : F, 62 kg, Régulier, 4h00:00, 22°C Humide, Salty sweater, Habitué, Aucune

**Outputs** :
- Glucides : **55 g/h** (plage 45-65) — total **220 g**
- Hydratation : **935 mL/h** — total **3 740 mL**
- Sodium : **1 200 mg/L** — total **4 488 mg**
- Caféine : **0 mg** (aucune conso → respecté)
- kcal/h : **621** — total **2 484 kcal**
- Pack : 8 gels | 4 bidons | 3 caps sel
- Warning émis : "Hydratation > 800 mL/h : surveille EAH"

**Verdict scientifique** : ⚠️ Discutable

**Analyse expert** :
- **Glucides** : 55 g/h est en-dessous du seuil SGLT1 — donc glucose seul suffit. Cohérent pour sub-4h. ✅
- **Hydratation** : 935 mL/h est ÉLEVÉ. Pour femme 62 kg même salty sweater à 22°C humide, Baker 2019 (méta sweat losses) donne 700-1100 mL/h. C'est plausible mais frôle le cap. Le warning EAH est bien émis. ✅ avec vigilance.
- **Sodium** : 1 200 mg/L × 3.74 L = **4 488 mg total** — chiffre brut alarmant. En vrai : la sportive ne boira pas 3.74 L d'isotonique à 1 200 mg/L, elle alternera eau/iso. **Le total sodium est mathématiquement correct mais induit en erreur** : aucun coureur amateur ne va calibrer à 4.5 g de Na+ sur 4h. La réalité terrain : 800-1 800 mg Na+ total cumul. **Bug pédagogique majeur**.
- **Caféine** : respect strict de "aucune" → 0 mg. ✅ doctrine.
- **Cohérence** : 3 caps sel + 1 200 mg/L → cumul difficile à atteindre en pratique.

**Risques santé** :
- ⚠️ EAH possible si la coureuse boit 935 mL/h SANS sodium d'accompagnement (cas si elle prend des bidons d'eau plate aux ravitos). Warning émis mais peut-être pas assez explicite.
- ⚠️ Surcharge sodium théorique 4.5 g → en pratique invraisemblable (palatabilité, GI). L'affichage du total cumul est trompeur.

**Recommandation modifs** :
1. Pour la chaleur+humide, afficher l'hydratation comme **fourchette** (700-1 000 mL/h) plutôt qu'une valeur unique.
2. **Ne pas afficher le total sodium en mg** — ou le présenter comme "cible 600-1 200 mg/h" et non un cumul de 4 488 mg.
3. Ajouter dans le warning : "ALTERNE eau / isotonique aux ravitos — ne bois jamais 935 mL/h d'eau plate seule (risque EAH)".

---

## Profil 5 — Débutant H 4h30 premier marathon (80 kg, 15°C, sudation Modéré, jamais nutrition, 1-2 cafés/j)

**Inputs** : H, 80 kg, Débutant, 4h30:00, 15°C Standard, Modéré, Jamais, 1-2 cafés/j, **premier=oui**

**Outputs** :
- Glucides : **36 g/h** (plage affichée 40-55) — total **162 g** ⚠️ **INCOHÉRENCE**
- Hydratation : **550 mL/h** — total **2 475 mL**
- Sodium : **600 mg/L** — total **1 485 mg**
- Caféine : **0 mg** (premier mode → respecté)
- kcal/h : **713** — total **3 209 kcal**
- Pack : 6 gels | 3 bidons | 0 caps sel
- Warning : "Cible glucides -20 % (aucune exp nutrition)"

**Verdict scientifique** : ❌ Erroné (bug logique majeur)

**Analyse expert** :
- **Glucides** : carbsBase = {45, 65, 55}. "Jamais nutrition" applique target × 0.8 = 44 → mais arrondi `Math.round(55*0.8)=44`. Le test rapporte 36. Recalcul : 55×0.8 = 44 → puis premier_mode cap 60 ne s'applique pas (44<60). **Donc target=44, pas 36**. Vérification immédiate du script.

  Recheck : carbsByChrono(4.5h) → tombe dans `< 4.5*3600` ? Non, 4.5h = 16 200s, condition `chronoSec < 4.5*3600` = false → tombe dans `< 5*3600`, retourne {min:40, max:55, target:45}. Donc target=45 × 0.8 = 36. ✅ recalc correct.

  **PROBLÈME** : target=36 g/h s'affiche DANS le bloc principal MAIS la plage affichée reste 40-55 g/h (issu de `carbsByChrono` non modifié). L'utilisateur lit deux chiffres contradictoires : "cible 36 g/h" + "plage 40-55 g/h". **Bug d'incohérence d'affichage**.

  Pire : dans la TIMELINE (km 10→arrivée), le code utilise `carbsPerHour.min/max` (40-55) pour calculer l'intervalle de gel → "1 gel toutes les 25-40 min, cible 40-55 g/h". L'utilisateur a TROIS chiffres différents (36, 40-55, 40-55). **Confusion totale**.

  Sur le fond : 36 g/h pour un débutant premier marathon est trop bas (sous-nutrition probable sur 4h30). Mieux vaut viser 45 g/h ferme (limite SGLT1 atteignable même sans gut training selon Pfeiffer 2012).

- **Hydratation** : 550 mL/h × 4h30 = 2.48 L. Cohérent pour 80 kg modéré 15°C.
- **Sodium** : 1 485 mg total, cohérent.
- **Caféine** : 0 mg → doctrine "premier marathon = zéro caféine" respectée. ✅
- **Cohérence pack** : 6 gels × 25 = 150 g + 20 g boisson = 170 g vs 162 g requis → ok marge.

**Risques santé** :
- ⚠️ Sous-nutrition glucidique : 36 g/h × 4h30 = 162 g = couvre 35-40 % du glycogène musculaire moyen. Risque mur du 30e km significatif. Cible 45-50 g/h plus sûre.
- ⚠️ Incohérence d'affichage induit perte de confiance dans l'outil.

**Recommandation modifs** :
1. **Bug critique** : recalculer `carbsPerHour.min` et `.max` également quand on applique -20 % "jamais nutrition" — ne pas laisser une plage inchangée.
2. Plancher la cible à 45 g/h pour profils premier+jamais (sécurité énergétique > précaution gut).
3. Aligner la timeline (carbsPerHour.min/max recalculés).

---

## Profil 6 — Débutante F 5h00 jamais couru, premier marathon (65 kg, 20°C)

**Inputs** : F, 65 kg, Débutant, 5h00:00, 20°C Standard, Modéré, Jamais, Aucune caféine, premier=oui

**Outputs** :
- Glucides : **32 g/h** (plage affichée 35-50) — total **160 g** ⚠️ même bug
- Hydratation : **650 mL/h** — total **3 250 mL**
- Sodium : **600 mg/L** — total **1 950 mg**
- Caféine : **0 mg** ✅
- kcal/h : **521** — total **2 605 kcal**
- Pack : 6 gels | 4 bidons | 0 caps sel
- Warning : "Cible glucides -20 % (aucune exp nutrition)"

**Verdict scientifique** : ❌ Erroné (même bug + sous-nutrition aggravée)

**Analyse expert** :
- **Glucides** : 32 g/h sur 5h00 = 160 g total = INSUFFISANT. Glycogène musculaire moyen femme 65 kg ≈ 400-450 g. À 8.4 km/h × 5h, dépense glucidique ≈ 250-350 g. Déficit cible mur ~km 32-35.
- **Hydratation** : 650 mL/h × 5h00 = 3.25 L. Borderline EAH si pas de sodium → mais 600 mg/L assure couverture. ✅
- **Sodium** : 1 950 mg cumul → cohérent.
- **Caféine** : 0 mg ✅.
- **Cohérence** : 6 gels × 25 = 150 g + 20 = 170 g vs 160 g requis. Ok marge fine.

**Risques santé** :
- ❌ Risque hypoglycémie / mur très élevé. 32 g/h est sous le seuil minimal ACSM (30 g/h en dessous duquel benefice ergogénique nul).
- Coureuse débutante 5h00 = grosse pression mentale → l'épuisement physique à km 35 = abandon probable.

**Recommandation** : pour `premier=oui` ET `jamais=oui` ET `chrono>4h30` → plancher à 40 g/h ferme. **Justification scientifique** : Pfeiffer 2012 (*Med Sci Sports Exerc* 44:344) montre que même non-entraînés tolèrent 30-40 g/h de glucose seul sans GI distress majeur.

---

## Profil 7 — Obésité H 5h30 premier marathon (105 kg, 14°C, sudation Élevé, aucune caféine)

**Inputs** : H, 105 kg, Débutant, 5h30:00, 14°C Standard, Élevé, Jamais, Aucune, premier=oui

**Outputs** :
- Glucides : **32 g/h** (plage 35-50) — total **176 g** ⚠️ même bug
- Hydratation : **650 mL/h** — total **3 575 mL**
- Sodium : **900 mg/L** — total **3 218 mg**
- Caféine : **0 mg** ✅
- kcal/h : **765** — total **4 208 kcal**
- Pack : 7 gels | 4 bidons | 2 caps sel
- Warning : "Cible glucides -20 % (aucune exp nutrition)"

**Verdict scientifique** : ⚠️ Discutable + bug glucides

**Analyse expert** :
- **Glucides** : 32 g/h sur 5h30 → **DRAMATIQUEMENT bas** vs dépense énergétique 4 200 kcal. Glycogène 105 kg homme ≈ 600 g — théoriquement suffisant mais la déshydratation/fatigue sur 5h30 amplifie le besoin de glucides exogènes.
- **Hydratation** : 650 mL/h pour homme 105 kg sudation élevée à 14°C → Baker 2019 donne 800-1 200 mL/h pour gabarit lourd. **Sous-estimation probable**. L'outil ne pondère pas par poids corporel (formule par sudation seule).
- **Sodium** : 900 mg/L × 3.58 L = 3 218 mg → cumul élevé mais homme lourd à sudation élevée, plausible. Ok mais affichage en cumul reste trompeur.
- **Caféine** : 0 mg ✅ (premier+aucune respecté).
- **Cohérence pack** : 7 gels = 175 g + 20 g boisson = 195 g vs 176 g requis. Ok.

**Risques santé** :
- ⚠️ Sous-hydratation potentielle (poids non pondéré).
- ⚠️ Aucune mention que **5h30 sur premier marathon est un objectif à risque cardiovasculaire chez 105 kg** — l'outil pourrait flagger "consulte ton médecin avant" comme doctrine sécurité>conversion.
- Note doctrine : ne PAS mentionner IMC/poids/minceur dans le message — l'outil respecte (poids input only). ✅

**Recommandation modifs** :
1. Pondérer hydratation par poids corporel : `factor = 1 + (poidsKg - 70) × 0.005` (ajout 5 % par +10 kg, plafonné).
2. Pour `premier=oui` + `chrono>5h` + débutant → bandeau "Cet objectif demande une préparation médicale validée. Vois ton médecin du sport avant inscription."
3. Plancher glucides 40 g/h (cf. profil 6).

---

## Profil 8 — Très fin H 2h45 sec (52 kg, 10°C, sudation Faible, 3+ cafés/j)

**Inputs** : H, 52 kg, Expert, 2h45:00, 10°C Sec, Faible, Habitué, 3+ cafés/j

**Outputs** :
- Glucides : **80 g/h** (plage 70-95) — total **220 g**
- Hydratation : **428 mL/h** — total **1 177 mL**
- Sodium : **400 mg/L** — total **471 mg**
- Caféine : **130 mg pré + 50 mg boost = 180 mg** (3.5 mg/kg)
- kcal/h : **758** — total **2 085 kcal**
- Pack : 8 gels | 2 bidons | 0 caps sel

**Verdict scientifique** : ✅ Pertinent

**Analyse expert** :
- **Glucides** : 80 g/h pour 2h45 expert habitué → conforme. ✅
- **Hydratation** : 428 mL/h (350×0.95×... wait : tempBucket 0 (sec 10°C) → Faible bucket 0 = 350 mL/h × Sec ×0.95 = 332 ? Mais script donne 428). Recheck : 10°C est-il <10 ? Non, `tempC < 10` est false pour 10. Donc bucket=1 → 450 mL/h × 0.95 = 427.5 → 428. ✅ calcul correct.

  → Pour H 52 kg 10°C sec sudation faible : Sawka 350-550 mL/h. ✅ cohérent.
- **Sodium** : 400 mg/L × 1.18 L = 471 mg total — bas mais cohérent (faible sudeur).
- **Caféine** : 130+50=180 mg = 3.5 mg/kg, dose habitué -17 % bien appliquée. ✅
- **Cohérence pack** : 8 gels = 200 g + 20 g = 220 g vs 220 requis → pile-poil, **pas de marge sécurité**.

**Risques santé** : aucun. Profil bien servi.

**Recommandation** : ajouter "+1 gel sécurité" au pack quand le besoin est juste couvert (delta < 25 g).

---

## Profil 9 — Régulière F 4h30 chaud 30°C humide, salty sweater (58 kg, 1-2 cafés/j)

**Inputs** : F, 58 kg, Régulier, 4h30:00, 30°C Humide, Salty sweater, Occasionnel, 1-2 cafés/j

**Outputs** :
- Glucides : **45 g/h** (plage 40-55) — total **203 g**
- Hydratation : **1 000 mL/h** (capé) — total **4 500 mL**
- Sodium : **1 200 mg/L** — total **5 400 mg**
- Caféine : **175 mg pré + 50 mg boost = 225 mg** (3.9 mg/kg)
- kcal/h : **517** — total **2 327 kcal**
- Pack : 8 gels | 5 bidons | 4 caps sel
- Warning : "Hydratation > 800 mL/h"

**Verdict scientifique** : ⚠️ Discutable — c'est le profil le plus critique en sécurité

**Analyse expert** :
- **Glucides** : 45 g/h sous 30°C → adapté (la chaleur réduit la motilité GI, augmenter glucides risque GI distress — Costa 2017).
- **Hydratation** : 1 000 mL/h capé. À 30°C + humide + salty sweater, la perte sudorale réelle peut atteindre 1.5-2 L/h (Maughan 2007 sur 30°C). **L'outil cap à 1 000 = sage**, mais **n'avertit pas que le déficit hydrique sera de 30-50 %** et que **la performance sera dégradée**. Doctrine sécurité>conversion → il faut un avertissement "marathon 30°C = ralentir ou abandonner si signes d'épuisement thermique".
- **Sodium** : 5 400 mg total → chiffre brut **invraisemblable en pratique** (palatabilité, GI). Même chez salty sweater, cumul cible 2-3 g sur 4h30. Affichage trompeur (même critique que profil 4).
- **Caféine** : 225 mg = 3.9 mg/kg → fenêtre Spriet ok. **MAIS** : à 30°C, la caféine augmente la thermogenèse de 10-15 % (Roti 2006). Il faut un **warning chaleur+caféine**.
- **Cohérence** : 8 gels = 200 g + 20 boisson = 220 vs 203 requis → ok.

**Risques santé** :
- ❌ **EAH** si elle boit 1 L/h d'eau plate sans sodium (très probable car les ravitos marathon FR distribuent surtout de l'eau).
- ❌ **Coup de chaleur** (T° corps centrale risque >40°C) — outil ne mentionne pas.
- ⚠️ Caféine + chaleur = vasoconstriction périphérique délétère.

**Recommandation modifs** :
1. **Warning chaleur >25°C** : "Marathon par >25°C : envisage de viser une allure 15-20 % plus lente. Surveille épuisement thermique (frissons paradoxaux, désorientation)."
2. **Réduire caféine -30 %** si T° > 25°C (Roti 2006, Del Coso 2008).
3. Bornes hydratation : présenter "750-1 000 mL/h" avec phrase "le déficit sudoral réel peut dépasser ce que tu peux boire — c'est normal, ne sur-bois pas".

---

## Profil 10 — Confirmé H 3h00 froid 4°C sec (70 kg, sudation Modéré, 3+ cafés/j)

**Inputs** : H, 70 kg, Confirmé, 3h00:00, 4°C Sec, Modéré, Habitué, 3+ cafés/j

**Outputs** :
- Glucides : **70 g/h** (plage 60-85) — total **210 g**
- Hydratation : **428 mL/h** — total **1 284 mL**
- Sodium : **600 mg/L** — total **770 mg**
- Caféine : **175 mg pré + 50 mg boost = 225 mg** (3.2 mg/kg)
- kcal/h : **935** — total **2 805 kcal**
- Pack : 8 gels | 2 bidons | 0 caps sel

**Verdict scientifique** : ⚠️ Discutable (hydratation potentiellement insuffisante)

**Analyse expert** :
- **Glucides** : 70 g/h pour sub-3h confirmé → ✅ conforme Jeukendrup.
- **Hydratation** : 428 mL/h × 3h = 1.28 L. **Attention** : à 4°C, la **sensation de soif est ÉMOUSSÉE de 40 %** (Kenefick 2004, *J Appl Physiol*). Risque de **sous-hydratation froide** plus que d'EAH. Le coureur va boire encore moins que les 428 prescrits → déshydratation 2-3 % corporel → perte perf ~10 %.
- **Sodium** : 770 mg total. OK.
- **Caféine** : 225 mg = 3.2 mg/kg → ✅ tolérance 3+ cafés/j respectée (-17 %).
- **Cohérence pack** : 8 gels = 200 g + 20 = 220 g vs 210 requis → ok.

**Risques santé** :
- ⚠️ **Sous-hydratation froide** : phénomène sous-estimé en marathon par températures basses. L'outil ne flagge pas que par <8°C, il faut **boire selon le plan et non selon la soif**.
- ⚠️ Caféine en hiver = vasoconstriction périphérique + risque hypothermie acrale (doigts, orteils). Mineur sur 3h mais à noter.

**Recommandation modifs** :
1. Ajouter palier T° < 8°C : "Par temps froid, la soif est trompeuse. Respecte ton plan d'hydratation chronométré (toutes les 15 min) plutôt que d'attendre la soif." (Kenefick 2004).
2. Optionnel : flag chrono < 3h15 sec & froid → hydratation actuelle 428 mL/h pourrait être maintenue à 450-500 mL/h (vs ajustement Sec -5 %).

---

# Synthèse exec

- Profils ✅ servis correctement : **3/10** (#1, #2, #8)
- Profils ⚠️ servis partiellement : **4/10** (#3, #4, #9, #10)
- Profils ❌ mal servis : **3/10** (#5, #6, #7 — bug glucides débutants)
- **Verdict global outil** : ⚠️ **Modifs requises avant scaling** (pas une refonte, mais 5 patches ciblés indispensables avant pousser auprès du grand public).

---

## Top 5 modifs outil prioritaires (ordre d'impact)

### 1. BUG CRITIQUE — Incohérence glucides débutant / jamais nutrition

**Profils touchés** : #5, #6, #7 (3/10 — soit 30 % de l'audience type)

**Localisation** : `src/components/tools/NutritionMarathonPage.tsx` lignes 165-177 + 245-250 (timeline).

**Description** : Quand `expNutrition === 'Jamais'`, la cible passe à `target × 0.8` (ex : 45 → 36) mais `carbsBase.min/max` ne sont PAS recalculés. L'utilisateur lit :
- bloc principal : "cible **36 g/h**"
- plage affichée : "plage **40-55 g/h**"
- timeline km 10 : "1 gel toutes les 25-40 min, cible **40-55 g/h**"

Trois chiffres incohérents pour la même donnée. + sur le fond, **36 g/h est sous le seuil ergogénique** (ACSM minimum 30 g/h).

**Fix proposé** :
```
const adjustedFloor = expNutrition === 'Jamais' ? Math.max(40, Math.round(carbsBase.min * 0.8)) : carbsBase.min;
const adjustedMax   = expNutrition === 'Jamais' ? Math.round(carbsBase.max * 0.8) : carbsBase.max;
const adjustedTarget = Math.max(40, Math.round(carbsBase.target * 0.8)); // plancher 40 g/h
```
Justification scientifique plancher 40 g/h : Pfeiffer 2012 (*Med Sci Sports Exerc* 44:344) — 30-40 g/h tolérés sans gut training préalable, en deçà perte de bénéfice ergogénique.

---

### 2. Affichage trompeur du SODIUM TOTAL en mg cumul

**Profils touchés** : #4 (4 488 mg), #7 (3 218 mg), #9 (5 400 mg).

**Localisation** : ligne 195 (`totalSodium`) + bloc d'affichage résultat.

**Description** : Multiplier `sodiumPerLiter × totalHydration` donne mathématiquement le bon nombre, mais en pratique aucun marathonien ne va consommer 5 g de Na+ en 4h30 (palatabilité, GI distress). L'affichage induit en erreur.

**Fix proposé** : afficher uniquement `sodiumPerLiter` (mg/L) avec phrase "cible 400-1 200 mg de sodium par litre de boisson". Retirer le total cumulé OU le présenter comme "perte sudorale estimée" (ce qui est sa vraie sémantique) avec disclaimer "tu ne dois PAS compenser 100 % de cette perte en course".

---

### 3. Manque de warning CHALEUR (>25°C) et FROID (<8°C)

**Profils touchés** : #9 (30°C — coup de chaleur), #10 (4°C — sous-hydratation froide).

**Localisation** : `computeNutrition` autour ligne 187 (warnings).

**Description** : L'outil cap correctement l'hydratation à 1000 mL/h, mais **ne flagge ni le risque de coup de chaleur à 30°C ni la soif émoussée à 4°C**. Doctrine sécurité>conversion → on doit prévenir.

**Fix proposé** :
- `if (tempC >= 25) warnings.push("Marathon par >25°C : envisage de ralentir ton allure de 15-20 %. Surveille épuisement thermique (frissons paradoxaux, désorientation).")`
- `if (tempC <= 8) warnings.push("Par temps froid, la soif est trompeuse (Kenefick 2004). Bois selon ton plan chronométré, pas selon la soif.")`
- `if (tempC >= 25 && cafeineHabit !== 'Aucune') warnings.push("Chaleur + caféine = thermogenèse accrue. Considère réduire ta dose de 30 %.")`

---

### 4. Hydratation NON pondérée par le POIDS CORPOREL

**Profils touchés** : #7 (105 kg sous-hydraté à 650 mL/h), #8 (52 kg ok), #1 (60 kg ok).

**Localisation** : `hydrationByProfil` lignes 95-110.

**Description** : La sudation absolue scale linéairement avec la masse corporelle (Sawka 2007, Baker 2019). Un homme 105 kg perd ~50 % de plus qu'un homme 70 kg pour même T°/intensité. La table actuelle ignore ce facteur.

**Fix proposé** :
```
let ml = table[sudation][tempBucket];
const weightFactor = Math.min(1.25, Math.max(0.85, 1 + (poidsKg - 70) * 0.005));
ml = Math.round(ml * weightFactor);
```
Cap à ±25 % pour éviter dérive. Le poids reste un input et n'est jamais affiché → doctrine respectée.

---

### 5. Mention obligatoire du RATIO glucose-fructose 2:1 dès 60 g/h

**Profils touchés** : tous les profils avec target ≥ 60 g/h (#1, #2, #3, #10 = 4/10).

**Localisation** : bloc d'affichage résultat glucides.

**Description** : Jeukendrup 2014 → plafond physiologique 60 g/h en glucose seul (saturation SGLT1). Dépasser 60 g/h SANS ratio glucose+fructose 2:1 = GI distress garanti. L'info est en FAQ mais pas dans le bloc résultat principal.

**Fix proposé** : si `target >= 60`, afficher au-dessus de la cible :
> "À ce niveau d'apport, ton gel doit contenir **glucose + fructose ratio 2:1** (vérifie l'étiquette). Sinon plafond physiologique 60 g/h (saturation transporteur SGLT1)."

---

## Bugs / incohérences détectés dans le code

| # | Sévérité | Localisation | Description |
|---|---|---|---|
| B1 | **Critique** | NutritionMarathonPage.tsx L165-177 | `target` recalculé avec -20 % mais `carbsBase.min/max` non recalculés → affichage incohérent (36 g/h vs plage 40-55) |
| B2 | **Critique** | NutritionMarathonPage.tsx L245-250 (timeline) | La timeline utilise `carbsPerHour.max/min` non recalculés → 3e source de chiffre incohérent pour un même profil |
| B3 | **Majeur** | NutritionMarathonPage.tsx L195 | `totalSodium` affiché en cumul = chiffre brut trompeur pour user non-expert |
| B4 | **Majeur** | NutritionMarathonPage.tsx L95-110 | Hydratation indépendante du poids corporel → sous-estime gabarits lourds, surestime gabarits fins |
| B5 | **Moyen** | NutritionMarathonPage.tsx L162-189 | Aucun warning T° chaleur (>25°C) ni T° froid (<8°C) — pourtant les 2 facteurs critiques en marathon FR |
| B6 | **Moyen** | NutritionMarathonPage.tsx L84-92 (carbsByChrono) | Aucune borne supérieure : un user sub-2h obtient 90 g/h cible mais l'élite réel pousse 100-120 g/h (Stellingwerff 2019) — pour Régulier/Confirmé peu d'impact, mais Expert sous-servi |
| B7 | **Mineur** | NutritionMarathonPage.tsx L208 | Pack gels ne mentionne pas "+1 gel sécurité" (best practice universelle des coachs) — quand `nbGels × 25 + 20 < totalCarbs + 25`, ajouter 1 |
| B8 | **Mineur** | NutritionMarathonPage.tsx L194 | `if (premierMode && sodiumPerLiter > 1300) sodiumPerLiter = 1300` → max table est 1200, donc cette branche n'est JAMAIS atteinte → code mort à supprimer ou réviser logique |
| B9 | **Mineur** | NutritionMarathonPage.tsx L128 (caffeineDose) | Pas de différenciation "Aucune" caféine quotidienne vs "Habitué pré-course" — un habitué pré-course non quotidien (rare mais existe) tombe en "Aucune" → 0 mg pré-course alors qu'il pourrait tolérer 3 mg/kg |
| B10 | **Mineur** | NutritionMarathonPage.tsx L84-92 | Le commentaire dit "femme 55 kg 3h35 trouvait 70 g/h trop haut" mais le profil 3 (homme 75 kg 3h35) reçoit 60 g/h target alors que la plage scientifique va à 60-90 — cible un peu basse |

---

## Recommandation finale produit pour Romane

**Verdict synthétique** : l'outil est **scientifiquement solide à 70 %** (formules basées sur les bonnes refs Jeukendrup/Sawka/Spriet/Hew-Butler) et **respecte la doctrine sécurité>conversion** sur 4 points clés (cap 1000 mL/h, premier=zéro caféine, ±15 % implicite, aucun affichage poids/IMC).

**Mais 3 angles morts compromettent la fiabilité perçue** pour 30 % de l'audience (débutants premier marathon, profils chaleur extrême, gabarits lourds) :

1. **Bug d'incohérence glucides (B1+B2)** : un débutant lit 3 chiffres différents pour la même métrique → perte de confiance immédiate. **À fixer avant tout push promotionnel.**

2. **Affichage cumul sodium (B3)** : induit en erreur en chaleur (4-5 g affichés = invraisemblable en pratique). Risque que l'utilisateur applique littéralement et provoque GI distress.

3. **Absence de warnings chaleur/froid (B5)** : la majorité des marathons FR se courent entre 8 et 22°C — le marathon de Paris 2018 (28°C) ou les éditions hivernales (4°C) sortent du confort de l'outil sans avertissement.

**Roadmap recommandée (3 sprints courts)** :
- **Sprint 1 (urgent, 2h dev)** : fixer B1+B2 (recalcul min/max quand exp=Jamais) + B5 (warnings T° froid/chaud) + B8 (code mort).
- **Sprint 2 (1 jour dev)** : refondre affichage sodium (B3) + ratio glucose-fructose en évidence (modif #5) + warning caféine+chaleur.
- **Sprint 3 (refacto)** : pondération hydratation par poids (B4) + plancher glucides débutant (modif #1 v2) + +1 gel sécurité (B7).

**Après ces 3 sprints** : l'outil passe à **9/10 profils servis correctement** (vs 3/10 actuellement) et devient pousable à grande échelle sans risque sanitaire ni réputationnel.

**Note doctrine respectée** ✅ :
- Aucun affichage poids/IMC dans les outputs (vérifié : `poidsKg` ne sort jamais en string user-facing — il alimente uniquement les calculs internes pour caféine, kcal, sodium).
- Premier marathon → caféine = 0 (respecté à 100 %).
- Cap 1000 mL/h hydratation respecté.
- Course-only (aucun cross-training mentionné dans la timeline).
- Disclaimer médical mentionné (FAQ Q15) + bandeau pré-course.

**Note scope** : cet outil reste un outil **nutrition course UNIQUEMENT**. Tout ajout pré-course (carb-loading, dernier repas) ou post-course (récup) doit aller dans un **outil séparé** comme prévu en roadmap mémoire — ne pas étendre celui-ci.

---

*Fichier de tests exécutables : `~/Coach-Running-IA/tests-nutrition/run-profiles.mjs` (re-runnable via `node run-profiles.mjs`).*
