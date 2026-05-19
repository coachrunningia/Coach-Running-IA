# TESTS EXPERT — Outil Nutrition Trail (Coach Running IA)
**Auditeur** : Nutritionniste expert ultra-trail (15 ans, suivis UTMB / Diagonale / Hardrock / Tor des Géants)
**Source code** : `src/components/tools/NutritionTrailPage.tsx` (2008 lignes, monolithique)
**Script de test** : `tests-nutrition/run-trail-profiles.mjs` (reproduit fidèlement les formules L31-425)
**Date audit** : 18 mai 2026
**Méthode** : 10 profils représentatifs (du VK 55 min au Hardrock 35 h), formules ré-implémentées en Node, comparaison avec littérature 2014-2024.

---

## RAPPEL FORMULES AUDITÉES

```
D eq ITRA = D_km + (D+/100) + (D-/400)                     // L109-111
kcal/h    = poids × (5 + (D+/h × 0.012) + (D-/h × 0.0035)) // L193-205 — Minetti 2002 simplifié
Glucides cibles par durée (g/h target) :                   // L118-127
  <1h:15 | 1-2h:45 | 2-3h:70 | 3-6h:75 | 6-12h:80 | 12-24h:70 | >24h:60
Hydro mL/h (base sudation × T°, ×weightFactor, ×altitude, ×hygro, cap 1000)
Sodium mg/L : Faible 400 | Modéré 600 | Élevé 900 | Salty 1200
Caféine pré : 3 mg/kg (2.5 si 3+ cafés/j), en course : 1 mg/kg/2.5h dès H3
Protéines  : 7 g/h dès H3 si effort ≥ 4 h
Pack gels  : ceil((totalCarbs - 30 - bases×40) / 25)
Pack caps sel : si Élevé/Salty → ceil((totalNa - 0.7×naBoisson) / 500)
```

---

# PROFIL 1 — UTMB Élite H

**Inputs** : H 60 kg | Expert | non-premier | 170 km / D+ 10 000 / D- 10 000 | 22 h prévu | 15 °C, alt 1500-2500 m | sudation Élevé | 3+ cafés/j | 8 bases

**Outputs calculés** :
- D eq ITRA : **295 km**
- kcal/h Minetti : **723** → total 15 906 kcal
- Glucides : **70 g/h** (plage 60-90) — total 1 540 g
- Hydratation : **680 mL/h** — total 14 960 mL (~15 L)
- Sodium : **900 mg/L** — total 13 464 mg (13,5 g)
- Caféine : pré **150 mg** + 8 prises × 60 mg = **10,5 mg/kg total/22 h**
- Protéines : 7 g/h dès H3 → 133 g
- Pack : 48 gels + 4 bidons/segment + 9 caps sel

**Verdict scientifique** : ⚠️ Discutable

**Analyse expert** :
- **D eq ITRA** : 295 km — correct mathématiquement, mais peu informatif pour ce profil (UTMB élite vise 20-22 h ; le pacing est dicté par l'allure mountain pace, pas par D_eq).
- **Glucides 70 g/h** : *cohérent en moyenne*. Tiller (ISSN 2019) recommande 60-90 g/h pour ultra ; les élites UTMB modernes (Kilian, D'Haene) opèrent en réalité à **80-100 g/h** sur les 12 premières heures (Viribay 2020). La cible est donc **conservatrice mais sûre**.
- **Hydratation 680 mL/h × 22 h** : RAS sur l'horaire. **Mais le total 15 L** est trompeur — un élite UTMB en moyenne montagne 15 °C consomme plutôt 8-11 L (Hoffman 2014). Le tool surestime ~30 % parce qu'il pondère 22h plein régime, alors qu'en montée raide la sudation chute.
- **Sodium 900 mg/L = 13,5 g/24 h** : cohérent avec Stuempfle 2002 (pertes 7-25 g Na+ en ultra) mais haut de gamme pour un élite qui exsude moins de volume.
- **Caféine 10,5 mg/kg/22 h** : **⚠️ DÉPASSE le plafond Grgic 2020 (6 mg/kg/24 h)**. Le warning s'affiche bien mais le chiffre brut affiché reste inchangé → un user peut le suivre tel quel. Le moteur devrait *capper* la dose, pas seulement avertir.
- **Protéines 7 g/h dès H3** : raisonnable (Knechtle 2018 cite 5-10 g/h). Pour un élite à 80 % VO2max sur 22 h, c'est même limite haut (digestion).
- **Pack 48 gels** : 48 × 25 g = 1 200 g ; +30 g start + 8 × 40 g (bases) = 1 550 g → couvre. Mais 48 gels = irréaliste : aucun élite UTMB ne porte 48 gels.
- **Cohérence globale** : *Acceptable pour ce profil* — les warnings clés sont là, mais la **caféine totale n'est PAS cappée**, et le **pack gels n'est pas réaliste pour un élite** (qui charge poudre + nutrition liquide en bidons).

**Risques santé** : sur-caféination (palpitations, GI distress, insomnie post-course), légère sur-hydratation théorique.

**Recommandations** :
1. **Capper la caféine totale à 6 mg/kg/24 h dans le calcul**, pas seulement warning.
2. Préciser dans l'output : "Total = cible théorique ; module en montée/descente."
3. Ajouter % nutrition liquide (poudre bidon) vs solide pour les élites.

---

# PROFIL 2 — CCC Confirmée F

**Inputs** : F 55 kg | Confirmé | 100 km D+/- 6 100 | 18 h | 12 °C alt 1500-2500 m | sudation Modéré | 1-2 cafés/j | 6 bases

**Outputs calculés** :
- D eq ITRA : **176,3 km**
- kcal/h : **564** → 10 152 kcal
- Glucides : **70 g/h** (60-90) — total 1 260 g
- Hydratation : **560 mL/h** — total 10 080 mL
- Sodium : **600 mg/L** — total 6 048 mg
- Caféine : pré **165 mg** + 7 prises × 60 mg = **10,6 mg/kg total**
- Protéines : 7 g/h → 105 g
- Pack : 40 gels + 3 bidons/segment + 0 caps sel

**Verdict** : ⚠️ Discutable

**Analyse** :
- **D eq ITRA 176 km** : utile, profil cohérent CCC.
- **Glucides 70 g/h** : OK, mais **les femmes oxydent moins de glucides exogènes** (Tarnopolsky 2008, Devries 2016) — pas de différenciation H/F dans l'outil (alors que le champ Sexe est demandé !).
- **Hydratation 560 mL/h × 18 h = 10 L** : un peu élevé pour 12 °C. Hoffman 2014 documente moyenne 350-500 mL/h sur Western States par 12-15 °C → outil **+15-20 %**.
- **Sodium 600 mg/L** : OK pour Modéré, mais **les femmes ont plus de risque EAH** (Almond 2005, Hew-Butler 2017) → outil ne déclenche aucune alerte spécifique au sexe.
- **Caféine 10,6 mg/kg/18 h** : **dépasse plafond 6 mg/kg/24 h** (warning affiché mais pas cappé).
- **Protéines** : OK.
- **Pack 40 gels** : 1 000 g sucre concentré → réaliste, mais lassitude à H6+ pas chiffrée.

**Risques** : **EAH** (femme + 18 h + boire selon plan plutôt que soif), insomnie post-course (caféine).

**Recommandations** :
1. **Différencier glucides H/F** : -5-10 g/h pour F (Devries 2016).
2. **Warning EAH renforcé** quand sexe=F ET durée >6 h.
3. **Cap caféine** strict.

---

# PROFIL 3 — OCC Régulière F

**Inputs** : F 58 kg | Régulier | 55 km D+/- 3 500 | 11 h | 14 °C alt 500-1500 m | Modéré | 1-2 cafés/j | 4 bases

**Outputs calculés** :
- D eq ITRA : **98,8 km**
- kcal/h : **576** → 6 336 kcal
- Glucides : **80 g/h** (70-100) — total 880 g
- Hydratation : **517 mL/h** — total 5 687 mL
- Sodium : **600 mg/L** — total 3 412 mg
- Caféine : pré **175 mg** + 4 prises × 60 mg = **7,2 mg/kg**
- Protéines : 7 g/h → 56 g
- Pack : 28 gels + 3 bidons/segment + 0 caps sel

**Verdict** : ⚠️ Discutable

**Analyse** :
- **D eq 99 km** : pertinent.
- **Glucides 80 g/h** : **trop pour une Régulière F sur OCC**. La cible 80 g/h vise les confirmés/experts entraînés au gut training. Pour une régulière, plafond 60-70 g/h est plus sûr (Costa 2017). La case "Habitué" en exp nutrition n'a aucun impact sur la borne haute.
- **Hydratation 517 mL/h** : OK.
- **Sodium 600 mg/L** : OK.
- **Caféine 7,2 mg/kg** : encore au-dessus du plafond 6 mg/kg.
- **Pack 28 gels** : 28 × 25 g = 700 g, +30 + 4×40 = 890 g pour 880 g cible → calibré. Mais c'est aussi 28 gels en 11 h = 1 gel toutes les 24 min → **lassitude assurée**, pas de diversité.

**Risques** : **GI distress** (80 g/h sur 11 h pour une Régulière), légère insomnie caféine.

**Recommandations** :
1. **Plafonner glucides 70 g/h pour niveau Régulier**, même Habitué.
2. **Cap caféine 6 mg/kg/24 h**.
3. Diversifier le pack : barres, fruits secs, bouillon dès H6.

---

# PROFIL 4 — Saintélyon H (froid nuit)

**Inputs** : H 75 kg | Régulier | 81 km D+/- 2 000 | 12 h | **2 °C** Sec | mer | sudation Faible | 3+ cafés/j | 5 bases | exp Occasionnel

**Outputs calculés** :
- D eq ITRA : **106 km**
- kcal/h : **569** → 6 828 kcal
- Glucides : **70 g/h** (60-90) — total 840 g
- Hydratation : **341 mL/h** — total 4 092 mL
- Sodium : **400 mg/L** — total 1 637 mg
- Caféine : pré **190 mg** + 4 prises × 80 mg = **6,8 mg/kg**
- Protéines : 7 g/h → 63 g
- Pack : 25 gels + 2 bidons/segment + 0 caps sel

**Verdict** : ✅ Pertinent (à 80 %)

**Analyse** :
- **D eq 106 km** : cohérent Saintélyon (~78 km + 2 100 D+).
- **Glucides 70 g/h** : *OK pour ce profil*, mais "exp Occasionnel" n'abaisse pas la cible.
- **Hydratation 341 mL/h** : **excellent — l'outil capte bien le combo froid + Faible sudation** (Kenefick 2004). Warning "soif trompeuse" affiché.
- **Sodium 400 mg/L** : conservé bas — OK.
- **Caféine 6,8 mg/kg** : limite haute, **warning légitime nuit (insomnie post)**.
- **Cohérence** : excellent traitement du froid. **Mais** : pas de chiffrage *énergie thermorégulation* (Tipton 2008 : +200-300 kcal/h pour rester chaud à 2 °C en habits techniques). Sur Saintélyon, c'est un trou.
- **Manque** : aucun conseil **isolation/équipement humide** (Saintélyon = sueur qui refroidit à l'arrêt en base de vie). Hors scope nutrition mais utile en warning.

**Risques** : **hypothermie au ravito** (sueur figée), légère sous-alimentation thermique.

**Recommandations** :
1. Ajouter +50-100 kcal/h chaude (bouillon, soupe) si T° <5 °C.
2. Warning "se changer en base de vie par froid <5 °C".

---

# PROFIL 5 — Trail 30 km PREMIER H Débutant

**Inputs** : H 80 kg | Débutant | premier=true forcé | 30 km D+/- 1 500 | 5 h | 20 °C | alt 500-1500 m | Modéré | 1-2 cafés/j | **exp Jamais** | 1 base

**Outputs calculés** :
- D eq ITRA : **48,8 km**
- kcal/h : **772** → 3 860 kcal
- Glucides : **60 g/h** (plage 48-72) — total 300 g
- Hydratation : **683 mL/h** — total 3 415 mL
- Sodium : **600 mg/L** — total 2 049 mg
- Caféine : **0 mg** partout (premier mode) ✅
- Protéines : 7 g/h → 14 g
- Pack : 10 gels + 4 bidons/segment + 0 caps sel

**Verdict** : ⚠️ Discutable

**Analyse** :
- **D eq 48,8 km** : utile.
- **kcal/h 772 sur 80 kg** : suspicieux. Le débutant **ne court PAS 5 h non-stop** sur 1500 D+ — il marche les côtes. La formule Minetti suppose course continue ; un Débutant à 6 km/h moyen aura plutôt **500-600 kcal/h** (40-50 % en marche).
- **Glucides 60 g/h** : **bonne réduction premier+jamais** (15 → 30 g/h × 0.8 = ?). Attendu : 75 × 0.8 = 60, puis cap premier = 60. **Match**.
  - Plage min 48 g/h : OK.
- **Hydratation 683 mL/h × 5 h = 3,4 L** : raisonnable. Mais 683 mL/h pour un débutant qui n'a jamais bu en course → **risque GI car non habitué**. Devrait être 500-600 mL/h.
- **Sodium 600 mg/L** : OK.
- **Caféine 0** : **parfait, doctrine respectée**.
- **Pack 10 gels** : 10 × 25 = 250 g + 30 start + 40 base = 320 g pour 300 g cible. OK mathématiquement. **Mais 10 gels pour un Débutant qui n'a jamais consommé = saturation digestive certaine**. Devrait recommander alternatives "vraies" (banane, compote, pâte de fruits).
- **Pas de warning "gut training 4-8 sem avant"** activé explicitement quand exp=Jamais et durée >3 h.

**Risques** : **GI distress (vomissements)** — *risque #1 sur premier trail long*, sous-utilisation des aliments réels.

**Recommandations** :
1. **kcal/h Débutant** : pondérer Minetti par un facteur "fraction marche" basé sur niveau (Débutant: ×0.7, Régulier: ×0.85, Confirmé/Expert: ×1).
2. **Hydratation premier** : cap à 600 mL/h.
3. **Pack premier** : remplacer 70 % des gels par compote/banane/barre.
4. **Warning explicite "gut training obligatoire"** quand exp=Jamais et durée ≥3 h.

---

# PROFIL 6 — Diagonale des Fous F (chaleur humide altitude)

**Inputs** : F 62 kg | Expert | 165 km D+/- 9 700 | 28 h | **25 °C Humide alt >2500 m** | Salty sweater | 3+ cafés/j | 10 bases

**Outputs calculés** :
- D eq ITRA : **286,3 km**
- kcal/h : **643** → 18 004 kcal
- Glucides : **60 g/h** (50-80) — total 1 680 g
- Hydratation : **1 000 mL/h** (cappé) — total **28 L**
- Sodium : **1 200 mg/L** — total **33,6 g**
- Caféine : pré **155 mg** + 11 prises × 60 mg = **13,1 mg/kg total**
- Protéines : 7 g/h → 175 g
- Pack : 50 gels + 6 bidons/segment + 21 caps sel

**Verdict** : ❌ Erroné (plusieurs paramètres dangereux)

**Analyse** :
- **D eq 286 km** : OK math, mais profil Diagonale (île, microclimat) très spécifique.
- **Glucides 60 g/h sur 28 h** : *cohérent* (cap >24h L126).
- **Hydratation 1000 mL/h CAPPÉ × 28 h = 28 L** : **chiffre AFFICHÉ = ALARMANT pour le user**. Hoffman 2014 montre que des athlètes survivent à des ultras avec 350-600 mL/h moyens même en chaleur. **Recommander 28 L est PRO-EAH** (le cap horaire est bien là, mais le total cumulé devrait être recalibré par les pauses bases de vie).
  - Note : la formule cap à 1000 mL/h *en moyenne sur toute la course*, ce qui est **illogique** (on ne court pas 28 h à VO2max continue).
- **Sodium 33,6 g/24 h** : **dangereux comme cible affichée**. Costa 2017 : pertes max documentées en ultra ~25 g Na+. 33 g = sur-supplémentation → **hypernatrémie possible chez F petit gabarit**.
- **Caféine 13,1 mg/kg/28 h** : **GROSSEMENT EXCESSIF**. Plafond 6 mg/kg/24 h Grgic 2020 → ici on est à 2,2× le plafond. **Warning affiché ne suffit pas**.
- **Protéines 175 g** : excessif (Knechtle 2018 : 5-10 g/h × 25 h = 125-250 g max acceptable, mais peu d'études vraiment positives au-delà de 100 g).
- **Pack 50 gels + 21 caps sel** : 50 gels en 28 h, plausible mais **doit basculer salé à H6** (warning timeline présent ✅).
- **Cohérence** : **profil le plus exposé, et outil le plus dangereux**. Diagonale = 25 °C humide jour + 8 °C nuit altitude → l'outil ne module pas T° dans le temps.

**Risques** : **EAH (cap 1L cumulé illogique), hypernatrémie, intoxication caféine, MAM altitude non chiffrée, perte d'appétit nuit non gérée**.

**Recommandations** :
1. **Cap total hydro = (cap horaire × durée × 0.7) par défaut** (les bases de vie + pauses réduisent le débit moyen).
2. **Cap caféine 6 mg/kg/24 h DUR**, pas affichage indicatif.
3. **Plafond Na+ total = 25 g/24 h DUR**.
4. **Warning altitude >2500 m avec D+ >5000** : risque MAM (Lipman 2013).
5. **Profil temporel** : module les besoins selon jour/nuit (T° basse, soif baisse → cible hydro nuit -25 %).

---

# PROFIL 7 — Trail court 20 km H rapide

**Inputs** : H 70 kg | Confirmé | 20 km D+/- 600 | 2 h | 18 °C | mer | Modéré | 1-2 cafés/j | 0 base

**Outputs calculés** :
- D eq ITRA : **27,5 km**
- kcal/h : **676** → 1 352 kcal
- Glucides : **70 g/h** (60-90) — total 140 g
- Hydratation : **650 mL/h** — total 1 300 mL
- Sodium : **600 mg/L** — total 780 mg
- Caféine : pré **210 mg** = **3 mg/kg** (pas de relais car <3 h)
- Protéines : 0 g/h (effort <4 h) ✅
- Pack : 5 gels + 3 bidons/segment + 0 caps sel

**Verdict** : ✅ Pertinent

**Analyse** :
- **D eq 27,5 km** : OK.
- **Glucides 70 g/h** : OK (Jeukendrup 2014 : 60-90 g/h sur 2-3 h effort).
- **Hydratation 650 mL/h** : *un peu haut* pour 18 °C effort 2 h (Sawka 2007 : 400-600 mL/h suffisant).
- **Sodium 600 mg/L** : OK.
- **Caféine 3 mg/kg sans relais** : **parfait pour effort 2 h** (Spriet 2014).
- **Protéines 0** : OK (gate >4 h respecté).
- **Pack 5 gels + 3 bidons** : 5 × 25 + 30 = 155 g pour 140 g cible. **3 bidons/segment** = bizarre car 0 base de vie → la formule dit `ceil(1300/500/1) = 3` bidons portés au départ = 1,5 L en bidons = **lourd inutile sur 2 h** (en réalité, 1 flasque 500 mL + 1 bidon ravito mi-course suffit).

**Risques** : aucun significatif.

**Recommandations** :
1. **Ajuster formule nbBidons** : prendre en compte les **postes ravito** (ce n'est pas que les bases de vie).
2. Réduire hydro à 550 mL/h sur trail court tempéré.

---

# PROFIL 8 — Hardrock 100 H altitude

**Inputs** : H 68 kg | Expert | 160 km D+/- 10 000 | **35 h** | 8 °C Sec **alt >2500 m** | sudation Élevé | 1-2 cafés/j | 9 bases

**Outputs calculés** :
- D eq ITRA : **285 km**
- kcal/h : **641** → 22 435 kcal
- Glucides : **60 g/h** (50-80) — total 2 100 g
- Hydratation : **596 mL/h** — total 20 860 mL (~21 L)
- Sodium : **900 mg/L** — total **18,8 g**
- Caféine : pré **205 mg** + 13 prises × 70 mg = **16,4 mg/kg total**
- Protéines : 7 g/h → 224 g
- Pack : 69 gels + 5 bidons/segment + 12 caps sel

**Verdict** : ❌ Erroné

**Analyse** :
- **D eq 285 km** : OK.
- **kcal 22 435** : **plausible** (Hardrock = effort le plus coûteux du circuit, Costill estime 16-25 k kcal pour 100 mi montagne).
- **Glucides 60 g/h sur 35 h** : cohérent doctrine (cap >24h). Mais **2 100 g de glucides à porter/digérer** = irréaliste. En réalité Hardrock = 50 % aliments réels (pommes de terre, soupe, sandwich).
- **Hydratation 596 mL/h × 35 h = 21 L** : *plausible* sur 35 h, mais **la majorité des finishers Hardrock boivent 400-500 mL/h** (Hoffman 2013 Hardrock data).
- **Sodium 18,8 g** : très élevé. Plage acceptable mais haut.
- **Caféine 16,4 mg/kg/35 h** = **2,7× plafond**. **Très dangereux** affiché tel quel pour effort sommeil-déprivé : interactions troubles cardiaques (Higgins 2013).
- **Protéines 224 g** : excessif.
- **Pack 69 gels** : *absurde*. Aucun Hardrocker ne porte 69 gels.
- **MAM** : altitude moyenne Hardrock 3 200 m, sommets >4 000 m. **Aucune mention MAM** dans warnings (Lipman 2013 : 30 % MAM >3 000 m chez non-acclimatés).
- **Sommeil/dette cognitive** : 35 h = micro-sommeil garanti. Pas de protocole "power nap + caféine 100 mg".
- **Hypothermie nuit** : 8 °C en journée → 0-5 °C nuit en altitude. Non chiffré.

**Risques** : **MAM, hypothermie nocturne, sur-caféination, dépression nutritionnelle**.

**Recommandations** :
1. **Mention MAM obligatoire** alt >2 500 m + D+ > 5 000 m.
2. **Cap caféine ferme** ; suggérer protocole 1-2 mg/kg pré-nuit unique.
3. **Module sommeil** pour effort >24 h.
4. **Pack** : ratio gels/aliments réels à recommander.

---

# PROFIL 9 — MaXi-Race 90 km Premier F (zéro caféine)

**Inputs** : F 60 kg | Régulier | premier=true | 90 km D+/- 6 000 | 17 h | 16 °C | alt 500-1500 m | Modéré | **Aucune** caféine | exp Occasionnel | 6 bases

**Outputs calculés** :
- D eq ITRA : **165 km**
- kcal/h : **628** → 10 676 kcal
- Glucides : **60 g/h** (60-60 — plage collapsée) — total 1 020 g
- Hydratation : **523 mL/h** — total 8 891 mL (~9 L)
- Sodium : **600 mg/L** — total 5 335 mg
- Caféine : **0 mg** partout ✅
- Protéines : 7 g/h → 98 g
- Pack : 30 gels + 3 bidons/segment + 0 caps sel

**Verdict** : ⚠️ Discutable

**Analyse** :
- **D eq 165 km** : OK.
- **Glucides 60 g/h** : cap premier respecté ✅. **Mais plage min=max=60** suite au cap → **affichage user perd la fourchette** (impression de chiffre figé non négociable, alors qu'il devrait être 50-60).
- **Hydratation 523 mL/h** : OK F + modéré + 16 °C.
- **Sodium 600 mg/L** : OK.
- **Caféine 0** : respect parfait doctrine premier+aucune.
- **Pack 30 gels** : 30 × 25 = 750, +30 + 6 × 40 = 1 020 → match. Mais **30 gels pour une F premier** = idem profil 5, lassitude assurée.
- **Cohérence** : *correct base*, mais l'outil ne signale pas que **17 h sur premier est ambitieux** (gut training à intensifier). Aucun message d'alerte spécifique "premier ultra long".

**Risques** : **GI distress (Occasionnel + 17 h), EAH (F + long)**.

**Recommandations** :
1. **Ne pas collapser min=max** quand cap appliqué — afficher 50-60.
2. **Warning explicite "premier ultra >12 h" = prépare un plan B salé dès maintenant**.
3. Alternative aliments solides dans pack premier.

---

# PROFIL 10 — VK 5 km / 1000 D+ Expert

**Inputs** : H 65 kg | Expert | 5 km D+ 1 000 / D- 0 | **55 min** | 12 °C | alt 1500-2500 m | Élevé | 1-2 cafés/j | 0 base

**Outputs calculés** :
- D eq ITRA : **15 km**
- kcal/h : **1 176** → 1 078 kcal
- Glucides : **15 g/h** (0-30) — total **14 g**
- Hydratation : **697 mL/h** — total 639 mL
- Sodium : **900 mg/L** — total 575 mg
- Caféine : pré **195 mg** = **3 mg/kg**
- Protéines : 0 g/h ✅
- Pack : **0 gels** + 2 bidons + 1 caps sel

**Verdict** : ⚠️ Discutable

**Analyse** :
- **D eq 15 km** : OK formellement, mais une VK ne se "court" pas comme un 15 km plat (VO2max 90 % continu = 55 min en marche-puissance + course extrêmes). La D_eq ITRA n'est PAS conçue pour la VK.
- **kcal/h 1176** : **excessif**. La formule Minetti gives `65 × (5 + (1000/0.917)×0.012) = 65 × 18.1 = 1177` → la formule explose sur D+ >1000 m/h. Réalité VK 55 min : 700-900 kcal réels (Vernillo 2017).
- **Glucides 15 g/h** : OK (effort <1 h, Carter 2004 : rinçage bouche suffit).
- **Hydratation 697 mL/h × 55 min = 639 mL** : un peu élevé. VK = effort court intense → 200-300 mL suffit (sudation peu volumineuse en montée raide).
- **Sodium 900 mg/L** : sur-dosé pour 55 min effort (575 mg total).
- **Caféine 3 mg/kg pré** : **pertinent et bien dosé** pour effort court intense ✅.
- **Pack 0 gels + 1 caps sel** : la caps sel pour 55 min effort est **non justifiée** (formule déclenche cap car sudation Élevé, mais sur 55 min l'apport boisson suffit).
- **Cohérence** : **VK n'est pas le bon scope** pour cet outil. Devrait afficher "VK <1 h : eau + 1 gel facultatif suffit, pas de plan complexe".

**Risques** : sur-sodatation théorique, sur-estimation kcal (psychologique : "j'ai brûlé 1000 kcal" → user mange trop post-course).

**Recommandations** :
1. **Plafonner kcal/h Minetti** à 1 000 kcal/h (au-delà la formule diverge).
2. **Mode "effort court <90 min"** simplifié : eau + 1 gel optionnel + caféine pré.
3. Ne pas déclencher cap sel sous 1 h effort.

---

# ─────────────────────────────────────────
## SYNTHÈSE EXEC
# ─────────────────────────────────────────

| Profil | Verdict | Risque principal |
|---|---|---|
| 1 UTMB Élite H | ⚠️ | Caféine non cappée |
| 2 CCC Confirmée F | ⚠️ | Pas de différenciation H/F glucides |
| 3 OCC Régulière F | ⚠️ | Glucides 80 g/h trop pour Régulière |
| 4 Saintélyon H | ✅ | RAS (manque thermorégulation) |
| 5 30 km Premier H Déb. | ⚠️ | kcal sur-évalués, pack 100% gels |
| 6 Diagonale F | ❌ | Cap 1L cumulé 28 L, caféine 13 mg/kg |
| 7 Trail court 20 km | ✅ | RAS (3 bidons exagéré) |
| 8 Hardrock H altitude | ❌ | Caféine 16 mg/kg, MAM ignoré, sommeil ignoré |
| 9 MaXi-Race Premier F | ⚠️ | Plage glucides collapsée min=max |
| 10 VK 55 min | ⚠️ | kcal/h 1176 explosif, scope inadapté |

**Score global** :
- ✅ servis correctement : **2/10** (4, 7)
- ⚠️ servis partiellement : **6/10** (1, 2, 3, 5, 9, 10)
- ❌ mal servis : **2/10** (6, 8 — les deux ultras extrêmes)
- **Verdict global outil Trail : ⚠️ Modifs avant scaling**

L'outil est **solide en zone moyenne (Saintélyon, OCC, trail court)** mais **dégrade en sécurité aux deux extrêmes** : (a) débutant/premier (pack non adapté, kcal sur-évalués), (b) ultra extrême >24 h ou altitude (caféine non cappée, Na+ sur-dosé, MAM ignoré, sommeil ignoré). Il ne devrait pas être mis en production tel quel pour les profils Diagonale/Hardrock.

---

## TOP 7 MODIFS OUTIL PRIORITAIRES (ordre d'impact)

### 1. **CAP DUR caféine totale 6 mg/kg/24 h** (et non simple warning)
Justification : Grgic 2020 (méta-analyse), Higgins 2013 (cardiotoxicité). 6/10 profils dépassent le plafond, et l'outil affiche le total brut au user → un coureur novice peut le suivre tel quel. **Patch L298-303** : appliquer `Math.min(6 * poidsKg, totalMg)`. Localisation : `src/components/tools/NutritionTrailPage.tsx` L298-303.

### 2. **Plafonner Na+ total à 25 g/24 h** + warning si dépassement
Justification : Stuempfle 2002 documente pertes max 25 g Na+ en ultra extrême. 33,6 g (profil 6) = sur-supplémentation, risque hypernatrémie surtout F petit gabarit. Localisation : ajout après L296.

### 3. **Différencier glucides H/F**
Justification : Tarnopolsky 2008 + Devries 2016 — femmes oxydent ~10 % moins de glucides exogènes. Patch : `if (sexe === 'F') target = Math.round(target * 0.9);`. Localisation : après L255.

### 4. **Plafonner kcalPerHourTrail à 1 000 kcal/h**
Justification : la formule Minetti L193-205 diverge linéairement quand m_grimpés/h > 800 (VK, montagne extrême). 1 176 kcal/h sur VK = sur-estimation 30-40 %. Patch : `return Math.min(1000, ...)`. Localisation : L204.

### 5. **Recalibrer cap hydratation TOTAL** (pas seulement horaire)
Justification : afficher 28 L sur 28 h (profil 6) est anxiogène ET pro-EAH. Réalité Hoffman 2014 : moyenne 400-600 mL/h sur ultra. Suggestion : `totalHydration = Math.round(hydrationPerHour * durationSec / 3600 * 0.85)` (pondération bases/pauses). Localisation : L291.

### 6. **Mode "effort court <90 min"** simplifié
Justification : pour profil VK ou cross-country, l'output complet (caps sel, pack gels, plan B) est inadapté. Afficher juste : eau + 1 gel optionnel + caféine pré si habitué. Localisation : nouvelle branche dans `computeNutrition` ou rendering conditionnel.

### 7. **Module altitude / MAM** au-delà de 2 500 m + D+ > 5 000 m
Justification : Lipman 2013 — 30 % MAM chez non-acclimatés au-dessus de 3 000 m. Aucun warning dans profils 6 et 8. Ajouter warning explicite "acclimatation 2+ sem requise, surveille maux de tête + nausées + dyspnée". Localisation : après L274.

---

## SPÉCIFICITÉS ULTRA NON GÉRÉES (>12 h)

1. **Sommeil / micro-sommeil** (>24 h) — aucune mention. Hardrock 100 (profil 8 : 35 h) = 1-2 micro-naps essentiels. Recommander protocole 15 min nap + 80-100 mg caféine.
2. **Hypothermie nocturne** en altitude — profils 6 et 8 voient T° chuter 15-20 °C la nuit. Pas de chiffrage thermorégulation.
3. **MAM altitude** — Lipman 2013 ignoré.
4. **Perte d'appétit / dépression nutritionnelle H18+** (Stuempfle 2015) — mention lassitude présente mais pas la **dépression nutritionnelle vraie** (refus actif d'avaler).
5. **Profil temporel jour/nuit** — la T° change, la soif change, l'appétit change. L'outil traite la course comme une moyenne plate.
6. **Vomissements / plan B GI** — la FAQ mentionne le plan B mais pas de protocole décisionnel intégré aux outputs.
7. **Refeed post-vomissement** — comment relancer après une crise GI (cola dégazé, bouillon, gingembre) → mentionné en FAQ mais pas dans timeline structurée.
8. **Crampes salines vs hyponatrémie** — confusion fréquente, pas de différenciation diagnostique côté user.
9. **Femmes hormones (cycle/ménopause)** — sexe est input mais aucune modulation (alors que Devries 2016 / Sims 2018 sont citables).
10. **Diabétiques / GI fragiles** — disclaimer en FAQ mais pas de garde-fou en input.

---

## BUGS / INCOHÉRENCES DÉTECTÉS DANS LE CODE TRAIL

| # | Fichier:Ligne | Bug |
|---|---|---|
| B1 | `NutritionTrailPage.tsx:298-303` | Caféine totale calculée puis affichée brute sans cap dur, malgré le warning. User peut dépasser 16 mg/kg. |
| B2 | `NutritionTrailPage.tsx:204` | `kcalPerHourTrail` diverge linéairement : VK profil 10 retourne 1 176 kcal/h. Pas de plafond. |
| B3 | `NutritionTrailPage.tsx:241-254` | Quand premierMode cape target à 60, **min/max collapsent** (profil 9 : plage 60-60). Affichage user trompeur. |
| B4 | `NutritionTrailPage.tsx:296` | `totalSodium` peut atteindre 33 g (profil 6) sans aucun warning/cap, alors que Stuempfle 2002 plafond = 25 g/24 h. |
| B5 | `NutritionTrailPage.tsx:291` | `totalHydration = hydrationPerHour × durationSec / 3600` — pas de pondération pauses/bases. Profil 6 : 28 L affichés. |
| B6 | `NutritionTrailPage.tsx:316` | Formule `nbGels` : `ceil((totalCarbs - 30 - bases×40) / 25)` peut donner 0 si bases × 40 + 30 > totalCarbs (cas profil 10 OK car carbs 14g). Edge case : profil avec beaucoup de bases pour distance courte → 0 gel mais glucides à honorer en ravitos uniquement, pas signalé. |
| B7 | `NutritionTrailPage.tsx:318` | `nbBidons` ne prend que les bases de vie comme "recharges", ignore les postes ravito intermédiaires. Profil 7 (0 base, 20 km, 2 h) suggère 3 bidons portés = 1,5 L lourd. |
| B8 | `NutritionTrailPage.tsx:320-322` | `nbCapsSel` activé uniquement Élevé/Salty, ignore effort court. Profil 10 (VK 55 min, Élevé) sort 1 caps sel inutile. |
| B9 | `NutritionTrailPage.tsx:307` | `proteinsPerHour` figé à 7 g/h dès H3 sans modulation poids/durée. Profil 8 : 224 g totaux (haut). |
| B10 | `NutritionTrailPage.tsx:267-274` | Warnings altitude pertinents mais **MAM jamais mentionné** au-delà de 2 500 m. |
| B11 | `NutritionTrailPage.tsx (champ sexe)` | Champ `sexe` est demandé en input (L444, L800-814) mais **n'a aucun effet** dans `computeNutrition`. Données collectées non exploitées (et aucune mention RGPD/finalité). |
| B12 | `NutritionTrailPage.tsx:524` | Borne durée max 30 h alors que Hardrock/Tor des Géants/UTMR vont 35-150 h. Profil 8 (35 h) refusé par la validation. **Bug bloquant pour ultras extrêmes**. |
| B13 | `NutritionTrailPage.tsx:179` | Formule pré-course `Math.round((poidsKg × mgPerKgPre) / 5) × 5` arrondit à multiples de 5, ce qui crée des cibles type 195 mg (profil 10) — peu naturel à mesurer (1 expresso ≈ 80 mg, 1 gel caféiné ≈ 100 mg). |

---

## RECOMMANDATION FINALE PRODUIT POUR ROMANE

L'outil Nutrition Trail est **architecturé de manière professionnelle** (sources citées, doctrine premier-mode bien intégrée, warnings climatiques pertinents, timeline pédagogique solide jusqu'à H12). C'est un **bon outil de zone moyenne** : un coureur OCC, Saintélyon ou trail 30-50 km en aura un plan utilisable et sûr.

**Mais l'outil n'est PAS production-ready pour le scope qu'il prétend couvrir** (jusqu'à 100 mi / 24h+ / altitude). Trois zones critiques :

1. **Caféine** non cappée → risque cardio/sommeil sur ultras. Patch obligatoire avant SEO.
2. **Cap hydratation 1 L/h en moyenne sur 28 h** affiche des totaux (28 L) qui sont eux-mêmes pro-EAH. La doctrine "Sécurité > conversion" exige de **recalibrer le total**.
3. **Ultras extrêmes (>24 h, >2 500 m altitude, >9 000 D+)** sont mal traités : MAM ignoré, sommeil ignoré, dépression nutritionnelle ignorée. Soit **on cap la durée à 24 h en validation** (et on assume "outil pour trail jusqu'à 100 km / 24 h"), soit on développe un vrai module ultra extrême.

**Ma reco produit pragmatique pour Romane** :

- **Phase 1 (1-2 j)** : appliquer les 7 patches prioritaires (cap caf, cap Na+, cap kcal, mode <90min, MAM warning, plage glucides non-collapsée, hydratation totale recalibrée). Cela passe **6/10 ⚠️ à ✅** sans gros effort.
- **Phase 2 (1 sem)** : décider du **scope max** assumé. Soit cap 24 h (et on enlève "ultra 100 mi" du marketing), soit on construit le module ultra extrême (sommeil, MAM, dépression nutritionnelle).
- **Phase 3 (avant lancement Outil Nutrition séparé)** : différenciation H/F (cycle, cibles glucides), corrections bugs cosmétiques (champ sexe inactif, validation durée 30h, etc.).

L'outil **doit être patché avant d'être indexé SEO** — il va attirer des premiers ultra-traileurs (forte intention de recherche "nutrition UTMB"), et c'est précisément le profil le plus à risque dans l'état actuel.

— Fin de l'audit —
