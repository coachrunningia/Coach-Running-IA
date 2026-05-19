# Challenge Coach course à pied — Brief V3 Nutrition Course

**Date** : 2026-05-17
**Reviewer** : Coach expert course à pied (20 ans d'expé — formateur UTMB Academy, méthodes Pfitzinger/Daniels, 200+ amateurs + 30+ élites suivis)
**Documents lus** :
- `BRIEF-NUTRITION-V3-CONSOLIDE.md`
- `CHALLENGE-NUTRITIONNISTE-TRAIL.md`
- `CHALLENGE-NUTRITIONNISTE-ROUTE.md`
- Doctrine CRIA (`feedback_*`, `project_coach_running_ia_outil_nutrition.md`)

---

## Synthèse exec

- **Brief V3 vs réalité terrain coach** : **solide sur la rigueur scientifique** (les deux nutritionnistes ont bien fait leur boulot), **moyen sur la pédagogie débutant**, **faible sur l'articulation avec le plan d'entraînement principal**, **lacunaire sur l'UX jour J**.
- Le brief lit comme un **outil pour intermédiaire/confirmé** alors que le cœur de cible CRIA (1500 plans générés) est dominé par des débutants/réguliers, dont une part significative court son premier marathon ou semi en >4h30.
- **Risques pédagogiques détectés** :
  1. **Cliff entre le plan (zéro nutrition) et l'outil (tableaux chiffrés)** non géré → user perdu / sentiment d'incohérence produit.
  2. **Absence d'amorce gut training intégré aux sorties longues** : le brief dit "teste 6-8 sem avant" mais ne dit jamais OÙ tester, alors que le plan CRIA propose des SL.
  3. **Warning EAH à >800 mL/h** : risque d'effrayer un débutant marathon 4h30 à 22°C qui a légitimement besoin de 800 mL/h.
  4. **Profil "marathon >5h" sous-représenté** alors que c'est 15% des finishers FR (FFA 2024) et probablement >30% du cœur CRIA (générateur de plans, premier marathon = "juste finir").
  5. **Aucun plan B pour le jour J** : pas de format mobile, pas de mémo emportable, l'athlète part à la course avec sa stratégie en tête (lui qui ne fait jamais 3 chiffres correctement sous stress de départ).
  6. **Caféine 60 min avant** énoncé comme dogme alors que la pratique terrain est une fenêtre 30-90 min selon métabolisme et habitudes.
  7. **Cap hydratation 1L/h** trop strict pour conditions extrêmes (Marathon des Sables, IronMan Nice juillet, UTMB canicule) où les coachs voient 1.2-1.5 L/h chez salty sweaters non-symptomatiques.
- **Recommandation globale** : ⚠️ **Refonte partielle (delta V3 → V4 ciblé)**
  Pas de refonte majeure (le brief V3 est globalement bon), mais **10 modifications ciblées** sont nécessaires avant de passer au dev — sinon l'outil sera scientifiquement juste mais **trahira la promesse coach** (pédagogie + sécurité + cohérence avec le produit principal CRIA).

---

## Challenge #1 — Cohérence avec produit principal

**Verdict** : ⚠️ **Améliorable — risque de dissonance produit grave si non traité.**

### Analyse coach
Le plan CRIA (générateur de plans payant) **interdit toute mention nutrition chiffrée** (doctrine `feedback_pas_de_nutrition_dans_plan`). L'utilisateur qui :
1. Génère un plan marathon 16 semaines → reçoit 64 séances détaillées **sans une ligne de nutrition**.
2. Tape "nutrition marathon" sur Google → atterrit sur l'outil `/outils/nutrition-marathon` (même domaine, même charte graphique, même branding "Coach Running IA").
3. Découvre une matrice de chiffres : 50-80 g/h, 600-800 mL/h, 700 mg sodium/h, 3-6 mg/kg caféine, etc.

→ **Dissonance** : "Pourquoi mon plan ne me parle pas de ça si c'est si important ?"
→ Pire : "Mon coach a oublié la moitié du job."

C'est exactement le genre de friction qui érode la confiance produit. La doctrine "sécurité > conversion" se retourne contre toi si la transparence du plan n'est pas explicite sur **POURQUOI** il ne traite pas la nutrition.

### Recommandation produit
1. **Ajouter une carte/section dans le plan d'entraînement** (welcome message OU advice de fin de plan, à valider avec Romane) :
   > *"Cet entraînement ne couvre pas la nutrition. C'est un choix : la nutrition en course mérite une approche personnalisée et chiffrée, qu'on traite séparément dans nos outils dédiés (`/outils/nutrition-marathon`, `nutrition-trail`, `nutrition-semi-marathon`). Va y jeter un œil 6-8 semaines avant ta course objectif pour tester ta stratégie sur tes sorties longues."*
   - ≤ 60 mots
   - Pas de chiffres dans le plan (doctrine respectée)
   - Pas de "perte de poids" ni "minceur" (doctrine respectée)
   - Pointe vers l'outil → cohérence produit créée

2. **Ajouter dans l'outil nutrition (haut de page, sous le warning) un mini-bandeau** :
   > *"Pas encore de plan d'entraînement structuré ? Notre générateur de plans gratuit te crée un plan personnalisé en 2 min. → [Créer mon plan]"*
   - Cross-sell soft, cohérent avec la doctrine "compromis + messages préventifs".
   - **Pas de couplage hard** (l'outil reste utilisable seul).

3. **Doctrine renforcée** : ajouter au memory `feedback_pas_de_nutrition_dans_plan` une exception **explicite** : "Le plan peut MENTIONNER l'existence des outils nutrition séparés, sans chiffres ni protocole."

---

## Challenge #2 — Pédagogie pour débutants

**Verdict** : ❌ **Risque — le brief V3 est calibré intermédiaire/confirmé, le débutant n'est pas tenu par la main.**

### Analyse coach
Profil-type débutant CRIA = "30-45 ans, vient de s'inscrire à son premier marathon (Paris, Nantes, La Rochelle), court depuis 6-18 mois, vise 4h-5h, n'a jamais touché un gel de sa vie." Ce profil arrive sur l'outil avec **3 angoisses majeures** :
1. "Combien je dois manger ?" → l'outil répond.
2. "Quand ?" → l'outil répond.
3. **"Vais-je vomir/avoir mal au ventre ?"** → l'outil **ne répond que via un encart "gut training" qui peut être lu comme un détail technique.**

**Le débutant ne va PAS lire l'encart gut training avec le bon niveau d'urgence.** Pour lui, "teste tes gels à l'entraînement" sonne comme un conseil parmi d'autres — pas comme **LE prérequis absolu**.

Risques concrets observés sur le terrain :
- **Sur-conformité TCA-like** : le débutant qui découvre "120 g glucides totaux" prend ces chiffres pour des dogmes et bascule en hyper-strict ("j'ai pas pris EXACTEMENT 50 g à H+1, j'ai raté ma course"). Profil typique : femme 28-40 ans, perfectionniste, premier marathon.
- **Hyper-surcharge** : "On m'a dit 80 g/h, je vais essayer 100 g/h pour être large." → vomi au km 22.
- **Stress nutrition > stress course** : il passe 3h à calculer au lieu de courir l'esprit libre.
- **Premier gel jamais testé pris au km 6** → diarrhée en plein course Paris.

### Recommandation produit
1. **Mode "Premier marathon / Premier semi / Premier ultra" en INPUT obligatoire (case à cocher)**. Si cochée :
   - **Limiter la plage haute** : jamais >70 g/h en marathon, jamais >60 g/h en semi, jamais >70 g/h en trail si <12h.
   - **Forcer un message pédagogique en TÊTE de la carte synthèse** :
     > *"⚠️ Premier marathon : ces chiffres sont une cible théorique. **Ta vraie priorité, c'est de finir confortable, pas optimal.** Mieux vaut 50 g/h bien digérés que 80 g/h vomis. Reste sur la fourchette basse, teste tout sur 2-3 SL minimum, et ne change RIEN le jour J."*
   - **Désactiver les warnings techniques anxiogènes** (EAH, hyper-sodium salty sweater 1500 mg/L, etc.) sauf si vraiment pertinents pour son chrono visé.

2. **Reformuler le warning gut training** pour qu'il soit **visible et impossible à manquer** (pas un encart discret). Proposition :
   > *"🛑 **AVANT de regarder les chiffres** : si tu n'as jamais utilisé de gel/boisson énergétique en course, NE COMMENCE PAS par ta course objectif. Teste sur 3-5 sorties longues d'au moins 1h30, en augmentant progressivement la quantité. Sinon : 80% de chances de troubles digestifs (Costa 2017). C'est la 1ère cause d'abandon en marathon amateur."*
   - **En tête de page**, pas en bas.
   - Bouton "Compris, je veux voir les chiffres" → désinhibe l'angoisse en confirmant que l'user a lu.

3. **Anti-TCA** : ajouter un disclaimer micro-visible mais bien placé en bas de la carte synthèse :
   > *"Ces chiffres sont des cibles théoriques (±15%). Ton corps et ton ressenti restent les meilleurs juges. **Manger trop strict ne te rendra pas plus performant.** Si la nutrition devient une source d'angoisse, parle-en à un professionnel."*
   - Pas de "TCA" explicite (anxiogène), mais le message est là.
   - Compatible avec doctrine "jamais poids/minceur".

4. **Warning hypoglycémie pré-course renforcé pour débutants** : la règle "rien entre H-30 et H-0" n'est pas intuitive — beaucoup de débutants prennent un gel "pour la route" 10 min avant le coup de canon (geste rassurant). Il faut un **encart visuel timeline** très explicite : "ROUGE entre H-30 et H-0 → ne touche à rien de sucré sauf eau".

---

## Challenge #3 — Profils ignorés / sous-représentés

**Verdict** : ⚠️ **Améliorable — profils débutants long (>5h marathon, >2h30 semi) sous-représentés.**

### Analyse coach

**Marathon >5h** :
- Le brief V3 va de sub-2h30 à sub-5h. Manque **sub-5h30 et sub-6h** (et au-delà).
- Stats FFA 2024 : 15% des finishers marathon FR sont >5h, 3-4% >5h30, 1-2% >6h.
- Sur CRIA spécifiquement, le pourcentage est probablement **plus élevé** (cœur de cible = "premier marathon = juste finir").
- Ce profil a des **besoins très différents** : intensité <65% FCmax, oxydation lipidique dominante, **risque GI moins lié à l'intensité, plus lié à la durée et à la fatigue posturale**.
- **Reco coach** : 30-50 g/h suffisent, hydratation modérée 500-700 mL/h sauf chaleur, sodium modeste, **aucune caféine systématique** (perturbation sommeil post-course si arrivée tardive).

**Semi >2h30** :
- Le brief s'arrête à "2h30+ = approche marathon". Insuffisant.
- Stats FFA : ~10-15% des semi-finishers FR sont >2h30, ~5% >3h.
- Profil typique : retour à la course après inactivité, surpoids non assumable dans la doctrine (donc on n'en parle pas), première vraie épreuve longue.
- **Reco coach** : 25-40 g/h suffisent, hydratation 400-600 mL/h, **focus mental + plan B walk-run plus que stratégie nutrition optimisée**.

**Trail <5km** :
- D'accord avec le brief : hors scope. Mais **borner explicitement** dans l'UX : si user entre 3 km, message "Pour les courses <10 km, la nutrition en course n'est généralement pas nécessaire — concentre-toi sur ton hydratation et ton petit-déjeuner. Veux-tu quand même voir les recos ?"
- Évite que l'outil affiche "tu as besoin de 0 g glucides" qui semble buggé.

**Profils Hyrox** :
- Hyrox = format différent (8 stations × 1 km course + 8 exercices renfo). Doctrine CRIA déjà claire : `project_coach_running_ia_hyrox_scope` = "plan Hyrox = partie course UNIQUEMENT".
- **Pour la nutrition course** : la partie course Hyrox totalise ~8 km en 50-90 min selon niveau → **équivalent semi très court / 10k allongé**. Hors scope outil nutrition (déjà cohérent).
- **MAIS** : un athlète Hyrox cherchant nutrition arrivera sur l'outil → il faut **un mot dans la FAQ** : "Hyrox : faut-il manger pendant ? Non, l'effort total reste sous 90 min. Concentre-toi sur ton petit-déjeuner et ton hydratation."

**Marche-course / débutants petite VMA** :
- Doctrine claire : `feedback_mode_marche_course_scope` = uniquement débutants/petite VMA.
- Pour ces profils, marathon = 5h-6h facile, semi = 3h+.
- Le brief V3 inclut sub-5h mais s'arrête là.
- **Reco** : étendre marathon à sub-5h30 / sub-6h, semi à sub-3h / sub-3h30.

### Recommandation produit
1. **Ajouter paliers marathon** : sub-5h30, sub-6h, sub-6h30 (libellé "marche-course / premier marathon").
2. **Ajouter paliers semi** : sub-3h, sub-3h30 (libellé idem).
3. **Borner trail bas** : <10 km → message d'orientation au lieu de chiffres bizarres.
4. **Mini-FAQ Hyrox** : 1-2 questions dans la FAQ semi-marathon (proche en durée).
5. **Mode "Premier marathon / Premier semi"** : voir Challenge #2.

---

## Challenge #4 — Lien avec gut training et plan d'entraînement

**Verdict** : ❌ **Lacune majeure — c'est l'opportunité de cross-promotion la plus naturelle, totalement absente du brief.**

### Analyse coach
Le brief V3 mentionne "gut training 6-8 semaines avant" — c'est exactement la fenêtre couverte par le plan d'entraînement CRIA pour un marathon (12-18 semaines de plan, dont 6-8 dernières avec SL >1h30).

**La pédagogie coach est limpide** :
- SL = la séance où on teste la nutrition (par définition, car >1h30, et c'est le seul moment de la semaine où l'estomac est sollicité en endurance prolongée).
- Sans test sur SL → catastrophe garantie le jour J.

**Mais** :
- Le plan CRIA ne mentionne pas la nutrition (doctrine).
- L'outil nutrition mentionne le gut training mais **sans dire OÙ le faire concrètement** (l'utilisateur novice ne fait pas le lien spontané SL = gut training).

**Conflit doctrine ?**
Apparent, mais **résoluble** :
- Doctrine "pas de nutrition dans le plan" = pas de chiffres, pas de protocole nutrition DANS les séances.
- **MAIS** : une mention "teste tes gels sur tes SL >1h30 — voir notre outil dédié /outils/nutrition-marathon" n'est PAS de la nutrition dans le plan, c'est un **renvoi pédagogique** vers l'outil séparé.
- C'est le même esprit que "Hyrox = partie course uniquement, pas les stations" — le plan dit ce qu'il fait, et redirige pour le reste.

### Recommandation produit

1. **Dans l'OUTIL NUTRITION** — ajouter une **carte dédiée "Quand tester ta stratégie"** :
   > *"Le calcul ci-dessus n'est qu'une cible théorique. Pour qu'il marche le jour J, **tu dois entraîner ton estomac** :*
   > - *Choisis une sortie longue (SL) >1h30 dans ton plan.*
   > - *Commence à 30 g/h sur la 1ère SL test.*
   > - *Augmente +10-15 g/h toutes les 2 semaines, jusqu'à atteindre ta cible course 4 semaines avant.*
   > - *Tu n'as pas encore de plan structuré ? → [Génère ton plan gratuit en 2 min]"*
   - Le bouton CTA pointe vers le générateur de plans → conversion soft.

2. **Dans le PLAN D'ENTRAÎNEMENT (welcome message OU advice avancé du plan)** — ajouter en fin de welcome ou dans la zone "Conseils additionnels" (à valider avec doctrine) :
   > *"💧 Ta nutrition en course n'est pas dans ce plan — c'est volontaire. Pour la calculer et la tester sur tes sorties longues, va sur notre outil dédié : /outils/nutrition-marathon (ou trail/semi selon ton objectif). À regarder 6-8 semaines avant ta course."*
   - ≤ 40 mots, pas de chiffres, pas de protocole.
   - Compatible avec doctrine `feedback_pas_de_nutrition_dans_plan` (mention de l'existence ≠ nutrition dans plan).

3. **Documenter cette articulation** dans le memory `feedback_pas_de_nutrition_dans_plan` :
   > *"Exception : le plan peut MENTIONNER (sans chiffres) l'existence des outils nutrition séparés et inviter à les utiliser pour tester sur SL."*

---

## Challenge #5 — Sécurité débutant : warnings trop alarmants ?

**Verdict** : ⚠️ **Améliorable — l'équilibre transparence/pédagogie est OK sur le principe mais le seuil EAH 800 mL/h va effrayer des users qui en ont légitimement besoin.**

### Analyse coach

**Cas concret** : femme 55 kg, premier marathon Paris, vise 4h45, prévu 22°C ensoleillé.
- Hydratation calculée par la matrice V3 : profil "Modéré" × 20-25°C = 650-800 mL/h.
- Elle entre les inputs → outil sort 750 mL/h.
- **Pas de warning EAH** (seuil 800 mL/h non atteint). OK.

**Mais si** elle est H 80 kg, premier marathon Paris, vise 4h, prévu 24°C :
- Matrice : profil "Élevé" × 20-25°C = 800-1000 mL/h.
- Outil sort 900 mL/h. → **Warning EAH affiché**.
- Premier marathon, panique : "Je vais mourir d'hyponatrémie ?!"
- Effet contre-productif : il sous-boit le jour J → coup de chaud, abandon.

**Le warning EAH en l'état est trop frontal pour un public débutant.** La formulation actuelle :
> *"Hyponatrémie d'effort = cause #1 de décès en ultra-trail (Almond NEJM 2005)"*

est **techniquement vraie** mais **pédagogiquement contre-productive** pour un marathonien débutant 4h. Le mot "décès" est un button-pusher.

### Recommandation produit

1. **Adapter le warning EAH par contexte d'usage** :
   - **Marathon/Semi** (durée <5h) : reformuler en :
     > *"💧 Tu vises >800 mL/h. C'est élevé mais cohérent avec ton profil et la chaleur prévue. **À retenir** :*
     > *- Bois selon ta soif, pas en forçant.*
     > *- Combine toujours avec du sodium (voir ci-dessous, sinon risque hyponatrémie).*
     > *- Ne dépasse jamais 1 L/h."*
     - Aucun mot "mort", "décès", "fatal".
     - Ton informatif et rassurant, doctrine "compromis + messages préventifs".

   - **Trail / Ultra** (durée >6h) : garder un warning plus appuyé (le risque est statistiquement réel) :
     > *"⚠️ **Hyponatrémie d'effort** : sur les ultras longs, c'est un risque sérieux. Symptômes à surveiller : nausées, maux de tête, confusion, prise de poids pendant la course (urines très claires + abondantes = OVER-hydratation, pas l'inverse). Si suspicion → arrête l'eau, prends du sodium (capsule + aliment salé), repose-toi 30 min. Plus de détails sur la carte Sécurité."*

2. **Toujours coupler warning EAH + reco sodium** dans la même vue : un user qui voit "trop d'eau = risque" et "voici combien de sel prendre" comprend qu'il n'est PAS sans solution.

3. **Disclaimer médical déjà bon dans V3, garder tel quel** (diabète/grossesse/pathologies).

4. **Test utilisateur post-prod** : prévoir 3-5 entretiens débutants après mise en ligne pour valider qu'aucun warning n'a "scared off" l'utilisateur.

---

## Challenge #6 — Validité métier des plages glucides

**Verdict** : ✅ **Globalement OK, quelques ajustements terrain.**

### Analyse coach

**Marathon — par chrono visé (table V3)** :

| Chrono V3 | g/h V3 | Mon retour terrain | Note |
|---|---|---|---|
| sub-2h30 | 90-120 g/h | OK élite gut-trained | Précis |
| sub-3h | 80-100 g/h | OK, mais bcp d'amateurs sub-3h vivent très bien à 70-80 g/h | Plage haute (100) un peu agressive sans gut training |
| sub-3h30 | 60-90 g/h | OK | Précis |
| sub-4h | 50-80 g/h | OK | Précis |
| sub-4h30 | 40-70 g/h | OK | Précis |
| sub-5h | 40-60 g/h | OK mais souvent **30-50 suffit** car oxydation lipidique dominante | Plage trop haute |

**Manque** :
- sub-5h30 / sub-6h : recommander 25-40 g/h (souvent un gel toutes les 45 min + bouillons aux ravitos + bananes ravitos).
- **Mention du facteur "ravitos officiels"** : sur marathon ASO (Paris, Nantes), ~6 ravitos avec gobelets iso 150 mL × 60-80 g/L = 60-72 g de glucides "gratuits". L'outil V3 ne déduit pas → user sur-dose en gels. Le nutritionniste route l'a noté (Challenge #2 nutritionniste route) — à intégrer.

**Trail** :

| Durée V3 | g/h V3 | Mon retour terrain | Note |
|---|---|---|---|
| <1h | 0-30 g | OK | Précis |
| 1-2h | 30-60 g | OK | Précis |
| 2-3h | 60-90 g | Légèrement haut pour amateur non-gut trained — réalité = 50-70 g/h | Plage haute trop ambitieuse pour débutant |
| 3-6h | 60-90 g | OK | Précis |
| 6-12h | 70-100 g | OK pour confirmés, **trop haut pour débutant ultra** (50-70 g/h plus réaliste) | À moduler par gut training |
| 12-24h | 60-90 g | OK | Précis |
| 24h+ | 50-80 g | OK | Précis, et reconnaît la "digestion saturée" — bien vu |

**Semi** : OK globalement, juste enrichir avec sub-3h / sub-3h30 (voir Challenge #3).

### Recommandation produit
1. **Caps automatiques par expérience nutrition** (déjà partiellement dans V3 : "-20% si Jamais") :
   - Si "Jamais" → cap dur à 60 g/h max, peu importe le chrono.
   - Si "Occasionnel" → cap à 80 g/h max.
   - Si "Habitué" → plage complète.

2. **Déduire les apports ravitos officiels** :
   - Input optionnel "Course officielle avec ravitos boisson iso ?" (Oui/Non/Je ne sais pas).
   - Si Oui : afficher dans la carte synthèse une ligne *"Sur cette course, prévois X gobelets iso aux ravitos (~Y g glucides). Ton complément en gels propres : Z gels."*
   - Évite le sur-dosage en gels.

3. **Ajouter paliers marathon >5h** : sub-5h30 et sub-6h avec 25-40 g/h.

---

## Challenge #7 — Hydratation : cap 1L/h vs réalité chaleur

**Verdict** : ⚠️ **Améliorable — le cap 1L/h est juste pour la grande majorité, mais bloque les cas légitimes en conditions extrêmes.**

### Analyse coach

**Cas terrain où 1 L/h est trop strict** :
- Marathon des Sables (40-50°C, gros sudeur 90 kg) : 1.2-1.5 L/h documenté chez plusieurs finishers non-symptomatiques (athlètes acclimatés, pesée pré/post équilibrée).
- IronMan Nice juillet (32°C, course longue) : 1.1-1.3 L/h fréquent.
- UTMB canicule 2003 / 2019 : pareil.

**Mais** :
- Ces athlètes sont **acclimatés et expérimentés**.
- Pour 99% des users CRIA, le cap 1 L/h est protecteur.

**Comment exprimer la nuance** sans ouvrir une porte dangereuse :

### Recommandation produit
1. **Garder le cap visuel à 1000 mL/h** dans le calcul affiché par défaut.
2. **Ajouter une carte/section discrète "Conditions extrêmes (chaleur >30°C, course longue, athlète acclimaté)"** :
   > *"En conditions très chaudes (>30°C) et si tu es acclimaté (>2 semaines en climat similaire avant la course), ton taux de sudation peut dépasser 1 L/h. Dans ce cas :*
   > - *La meilleure boussole = test de pesée pré/post sortie longue.*
   > - *Boire AU-DESSUS de 1 L/h doit s'accompagner d'un sodium proportionnel (>1000 mg/L).*
   > - *Ne JAMAIS tester ces volumes pour la 1ère fois le jour de la course.*
   > - *En cas de doute → reste sous 1 L/h, ton corps tolère mieux un léger déficit qu'un excès."*
3. **Pas de calculateur 1.2-1.5 L/h en libre accès** : laisser le cap dur, mais ouvrir l'info pour ceux qui en ont besoin (recherche active dans la page).
4. **Cohérent doctrine "sécurité > conversion + transparence"** : on dit la vérité terrain sans inciter à la prise de risque.

---

## Challenge #8 — Caféine : timing pré-course

**Verdict** : ⚠️ **Améliorable — le "60 min avant" est une moyenne, pas un dogme.**

### Analyse coach

**Réalité terrain** :
- **Athlètes à café quotidien** (3+ cafés/j) : tolérance forte → fenêtre 30-90 min avant, dose 3-4 mg/kg suffit, beaucoup prennent 2 espressos étalés (1 au lever + 1 à H-30).
- **Athlètes occasionnels** (1-2 cafés/j) : 45-75 min avant, dose 3-5 mg/kg.
- **Naïfs caféine** (0 café/j) : 60-90 min avant pour laisser le temps à la métabolisation, dose 2-3 mg/kg max (sinon tachycardie + troubles GI au km 5).
- **Gélule caféine pure (NoDoz, ProPlus)** : cinétique différente du café (absorption plus rapide en gélule liquide, plus lente en gélule sèche) → 30-45 min suffisent souvent.
- **Génétique CYP1A2 (métaboliseurs lents)** : 20-30% de la population, pic d'effet décalé à 90-120 min — eux sentent l'effet juste sur les derniers km.

**Le "60 min avant" du brief V3 est la moyenne des recos officielles (ISSN 2021)**, mais en pratique c'est **une fenêtre 30-90 min**.

**Aussi** : le brief V3 ne dit pas qu'il faut TESTER la caféine en SL avant. Pourtant c'est crucial — un naïf caféine qui prend 5 mg/kg le jour J risque palpitations, diarrhée, anxiété.

### Recommandation produit
1. **Reformuler la fiche caféine** :
   > *"**Pré-course** : 3-6 mg/kg de caféine, dans une fenêtre de **30 à 90 min avant le départ** (selon ta tolérance et la forme : café, gélule, gel caféiné).*
   > *- Si tu ne consommes JAMAIS de café au quotidien : commence à 2 mg/kg max, 60-90 min avant.*
   > *- Si tu prends 1-2 cafés/jour : 3-4 mg/kg, 45-75 min avant.*
   > *- Si tu prends 3+ cafés/jour : 4-6 mg/kg possible, 30-60 min avant (la tolérance réduit l'effet ergogène).*
   > *- Forme : café (lent) = 60 min, gélule liquide (rapide) = 30-45 min, gel caféiné = 30 min.*
   > *⚠️ **Teste impérativement la dose et le timing sur 2-3 SL avant la course objectif.** Effets secondaires possibles : tachycardie, troubles digestifs, anxiété."*

2. **Ajouter dans le warning gut training** : "le test concerne aussi la caféine, pas que les gels".

3. **Cap dur** : ne jamais dépasser 6 mg/kg sur 24h cumulé (déjà dans V3, garder).

---

## Challenge #9 — Lassitude gustative et plan B en ultra

**Verdict** : ⚠️ **Améliorable — le sujet est cité (carte 7 V3) mais survolé. C'est pourtant le KEY DIFFERENCIATOR vs Aptonia/Overstim's.**

### Analyse coach

**Réalité ultra-trail** : à H+8, 60-80% des coureurs ne supportent plus le sucré. À H+12, la moitié ne supporte plus RIEN. À H+18, ils marchent en silence en regardant leurs pieds, écœurés.

C'est LE moment où la stratégie nutrition s'effondre. Et c'est aussi le moment où **un outil bien fait fait la différence** entre un finisher et un abandon.

Le brief V3 mentionne :
- Carte 7 "Lassitude gustative & plan B" : timing alternance + "estomac fermé" (rinçages, soupes, températures différentes)
- Carte 6 "Conseils ravitos / bases de vie" : planning de prise

**Ce qui manque concrètement** :
- **Liste shopping détaillée** : "kit anti-écœurement" → comté en cube, saucisson sec en tranches, pickles, citron, gingembre bonbon, bouillon en sachet, eau gazeuse, cola dégazé.
- **Protocole "estomac fermé"** : que faire QUAND ça arrive — pas juste "ça peut arriver".
  - Marcher 10-15 min.
  - Boire petite gorgée eau salée tiède.
  - Cola dégazé (60-90 mL).
  - Capsule gingembre OU bonbon menthe.
  - Si ça ne passe pas en 30 min → arrêt en base de vie, repos 30-45 min, médecin si possible.
- **Conseils bases de vie >5 min de pause** : que mangent les athlètes UTMB en BdV → soupe miso, riz blanc salé, ramen, omelette, banane, fromage, sandwich pain blanc-beurre-jambon-comté.
- **Conseils bases de vie >15 min de pause** (Tor des Géants, Spartathlon) : repas chaud complet + sieste de 20-30 min si nuit.

### Recommandation produit
1. **Carte 7 "Lassitude gustative & plan B" — enrichir massivement** :
   - Section "Anticipation" (alternance, températures, rinçages) — DÉJÀ dans V3.
   - **Nouvelle section "Quand ça arrive — protocole en 4 étapes"** : marche / cola / gingembre / repos.
   - **Nouvelle section "Kit anti-écœurement à emporter"** : liste 6-8 items.

2. **Carte 6 "Conseils ravitos / bases de vie" — enrichir** :
   - Cas BdV courte (<5 min) : grignote = 1 banane + 1 morceau fromage + boisson iso + bouillon chaud si possible.
   - Cas BdV moyenne (5-10 min) : assis = bol soupe + tranche pain-fromage + boisson iso + 2 gorgées eau salée + sortie avec gel propre.
   - Cas BdV longue (>15 min) : table = repas chaud (riz, pâtes, omelette) + boisson récup partielle (50 g glucides + 10 g protéines) + sieste possible si nuit + change de chaussettes obligatoire + reprise progressive sur 5 min de marche.

3. **Ces sections rentrent dans le SEO longue traîne** : "que manger en base de vie UTMB", "lassitude gustative ultra", "écœurement sucré trail", "plan B nutrition ultra" — tous notés par le nutritionniste trail.

4. **Validation coach** : ces protocoles sont issus directement de la pratique terrain UTMB / Diagonale des Fous / Tor des Géants — ils n'inventent rien, ils opérationnalisent.

---

## Challenge #10 — UX du calculateur en course (mobile, post-inscription)

**Verdict** : ❌ **Lacune majeure du brief V3 — aucune mention de l'usage jour J.**

### Analyse coach

**Réalité athlète** :
- Aujourd'hui, l'athlète qui calcule sa stratégie 4 semaines avant la course **note ses chiffres sur un papier / dans Notes iPhone / dans un Google Doc** → arrive le jour J avec une mémoire imprécise et un cerveau sous stress.
- **0% des outils nutrition francophones actuels** proposent un format mobile/PWA/PDF utilisable jour J.
- Sur ultra (>6h), 100% des athlètes ont un téléphone (sécurité, GPS, météo) → potentiel énorme.

**3 cas d'usage à distinguer** :
1. **AVANT la course** (planification J-30 à J-7) : desktop OK, calcul détaillé, lecture pédagogique.
2. **VEILLE de la course** (J-1) : mobile probable, check rapide, impression mentale.
3. **PENDANT la course** (J-J) : mobile uniquement, lecture rapide en marchant, sans réseau (montagne).

### Recommandation produit

**MVP V1 (à inclure dans le brief V4)** :
1. **Mobile-first responsive** (déjà standard, à vérifier).
2. **Export PDF "Ma stratégie nutrition"** (1 page, format A5, imprimable + emportable) :
   - Header : nom de la course, chrono visé, date.
   - Tableau résumé : à H+X minutes → prendre Y g glucides + Z mL boisson + W mg sodium.
   - Timeline visuelle.
   - Liste shopping pack.
   - Warnings essentiels (1 phrase chacun).
3. **Lien partagé persistant** (URL avec params query string) : l'athlète peut re-ouvrir sa stratégie en re-cliquant le lien → utile pour partage avec coach/compagnon.

**V2 (selon traffic)** :
4. **PWA installable** (icône home screen) avec mode offline : permet consultation jour J en montagne sans réseau.
5. **Mode "Pendant la course"** : interface simplifiée timeline qui scroll au temps réel ("Tu en es à H+2h15 → prochaine prise : gel + 200 mL boisson à H+2h25").

**Cohérence doctrine** :
- Pas de notif push (pas de contact direct client, doctrine `feedback_jamais_contact_client` respectée — c'est l'utilisateur qui consulte, l'outil ne lui envoie rien).
- Format léger, pas d'app native (économie dev).

**Pas de gold-plating** :
- MVP = mobile responsive + export PDF + lien partagé. C'est suffisant pour 90% des cas.
- PWA en V2 si traffic le justifie.

---

## Risques pédagogiques majeurs détectés

### Risque 1 — Effet "TCA marathonien-débutant"
**Scénario** : Femme 32 ans, prépare son 1er marathon Nantes. Très perfectionniste, milieu corporate, déjà tendance "tout contrôler". Découvre l'outil → applique les chiffres à la lettre → ne dort plus, pèse ses bananes au gramme près, vit la nutrition course comme une obsession.
**Mitigation** : disclaimer anti-rigidité dans la carte synthèse + mode "Premier marathon" qui assouplit les recos.

### Risque 2 — Effet "warning EAH paralysant"
**Scénario** : Homme 80 kg, 1er marathon Paris, vise 4h, prévu 24°C. Outil sort 900 mL/h + warning EAH avec mot "décès". Il sous-boit le jour J → déshydratation + coup de chaud → abandon km 28.
**Mitigation** : reformuler warning EAH avec ton informatif pour <5h, garder ton appuyé pour ultra >6h.

### Risque 3 — Effet "gel jamais testé pris au km 6"
**Scénario** : Débutant total nutrition, suit la carte timeline V3, prend son 1er gel jamais consommé au km 6 du marathon. Diarrhée au km 12. Abandon ou finisher catastrophique.
**Mitigation** : warning gut training en TÊTE de page, impossible à manquer, avec bouton "Compris, montre-moi les chiffres" qui désinhibe.

### Risque 4 — Effet "sur-confiance scientifique"
**Scénario** : Athlète confirmé voit "ACSM 2024 + Jeukendrup + Burke" en sources → "C'est la science, c'est forcément vrai pour moi" → ignore ses sensations digestives → vomi sur ultra.
**Mitigation** : mention systématique "±15%" + insister sur "ton corps reste le meilleur juge" + "rien de nouveau le jour J".

### Risque 5 — Effet "calcul incohérent visible"
**Scénario** : Athlète entre des inputs incohérents (poids 60 kg, vise 2h marathon, sudation Faible, 30°C) → outil sort des chiffres bizarres mais aucun garde-fou logique.
**Mitigation** : validation logique des inputs (cohérence chrono/niveau, etc.) + message d'orientation si inputs improbables.

### Risque 6 — Effet "abandon plan d'entraînement payant pour outil gratuit"
**Scénario** : Lead arrive sur l'outil nutrition (gratuit, SEO), trouve ça super, ne ressent plus le besoin de prendre le plan payant.
**Mitigation** : CTA cross-sell soft "Pas encore de plan structuré ?" + le plan reste la valeur ajoutée majeure (16 semaines de séances personnalisées vs un calculateur).

### Risque 7 — Effet "perte du contrôle qualité" (pas de Romane sur les messages)
**Scénario** : Doctrine `feedback_jamais_contact_client` — c'est Romane qui s'en charge. Mais ici c'est un outil auto-servi → pas de mail/notif/contact. Cohérent. Mais les **MESSAGES affichés dans l'UI** doivent être validés par Romane (ton, formulation, sécurité, jamais poids/minceur).
**Mitigation** : tous les libellés UI + warnings + messages doivent passer par revue Romane avant prod.

---

## Compléments métier indispensables (au-delà du brief)

Règles coach que les nutritionnistes ne connaissent pas / ne soulignent pas assez :

1. **"Rien de nouveau le jour J"** — règle d'or absolue. Tout produit, toute marque, tout protocole DOIT avoir été testé sur 2-3 SL minimum avant la course. À répéter 3 fois dans l'outil (warning + carte timeline + FAQ).

2. **Les "tests SL nutrition" sont à programmer dans le plan d'entraînement** — pas juste "teste pendant 6-8 semaines" vague. Concret : "SL #1 à 30 g/h, SL #2 à 50 g/h, SL #3 à 70 g/h, SL #4 = simulation course complète".

3. **L'estomac est entraînable comme un muscle** — pédagogie cruciale, justifie pourquoi le gut training est non négociable.

4. **Stress de course = digestion réduite de 30-50%** — donc même un athlète qui digère 80 g/h en SL peut chuter à 50 g/h en course. Reco coach : marge de sécurité de 15-20% sous la cible théorique pour la course objectif.

5. **"Allure trop rapide = nausée garantie"** — si l'athlète part trop vite (10-15 sec/km au-dessus de son allure cible), le shunt sang digestif → musculaire s'accentue → nausée et vomi quasi-systématique. La nutrition n'y peut RIEN. C'est à mentionner dans le plan B "estomac fermé".

6. **Le froid coupe l'envie de boire** — sur trail hiver / nuit, l'athlète sous-boit naturellement. Reco coach : forcer un rappel toutes les 20-30 min même sans soif si T° <5°C.

7. **L'altitude >2000 m augmente la diurèse** — l'athlète urine plus, doit boire plus (+10-15%). Le brief V3 le note bien.

8. **"Ravito = pause mentale, pas juste alimentaire"** — sur ultra, le ravito est une occasion de check-in mental : changer chaussettes, soin pieds, vérifier matériel obligatoire, regarder la carte, manger calmement. Le nutritionniste pense aux calories, le coach pense au reset complet.

9. **La pesée pré/post SL** — méthode terrain la plus fiable pour calibrer son hydratation perso. Le brief V3 ne la mentionne pas, le nutritionniste trail oui. À intégrer dans la carte pédagogique.

10. **Marathon vs Trail = profils glucidiques opposés** — marathon = intensité haute + durée moyenne = gels/liquide dominent. Trail = intensité basse + durée longue = solide salé progressif. Cohérent avec V3, à formaliser pédagogiquement.

11. **Femmes en phase lutéale** — besoins glucidiques +5-10% + sudation modifiée. Le brief V3 ne le traite pas. Sujet complexe → peut-être hors scope V1, mais à noter pour V2.

12. **Caféine = excellent en endurance MAIS pas pour tout le monde** — 20-30% des coureurs ont une intolérance digestive ou cardiaque. La caféine doit être OPTIONNELLE, pas systématique dans la timeline.

---

## CTA & cross-promotion avec produit principal

### Sens "Outil nutrition → Plan d'entraînement"
1. **CTA principal en haut de l'outil** :
   > *"💡 Pour tester ta stratégie sur tes sorties longues, tu auras besoin d'un plan structuré. → [Génère ton plan gratuit en 2 min]"*

2. **CTA secondaire dans la carte "Gut training"** :
   > *"Pas encore de SL programmées dans ta semaine ? Notre générateur t'en intègre selon ton objectif. → [Créer mon plan]"*

3. **CTA tertiaire dans la FAQ** ("Combien de temps avant la course tester ?") :
   > *"Lance ton plan 12-16 semaines avant ta course objectif → tu auras 8-10 SL pour tester ta nutrition. → [Plan personnalisé gratuit]"*

### Sens "Plan d'entraînement → Outil nutrition"
1. **Welcome message du plan** (à valider doctrine) :
   > *"💧 Ta nutrition en course n'est pas dans ce plan — c'est volontaire. On la traite dans nos outils dédiés : [link nutrition-marathon/trail/semi selon objectif]. À regarder 6-8 semaines avant ta course."*

2. **Advice fin de plan** (dernière semaine, déjà existant en V3 advice ?) :
   > *"J-7 : as-tu testé ta stratégie nutrition ? Si non → [outils nutrition]. Si oui, ne change RIEN le jour J."*

### Maillage avec les autres outils CRIA
- Outil nutrition trail/marathon/semi → cross-link vers Convertisseur d'allure (pour calculer allure cible) + Prédicteur de temps (pour valider chrono visé).
- Bloc "Outils performance liés" déjà prévu en V3 — bien.

### Doctrine respectée
- Cross-sell soft, pas hard.
- Aucune communication directe client (pas de mail, pas de notif).
- L'outil reste pleinement utilisable sans le plan.
- Le plan reste pleinement utilisable sans l'outil.
- Cohérent `feedback_jamais_contact_client` + `feedback_pas_de_nutrition_dans_plan` (mention ≠ chiffres).

---

## Recommandations UX mobile + ergonomie en course

### Mobile (priorité MVP)
1. **Responsive obligatoire** — tableaux matrices 4×4 hydratation : passer en cards verticales sur mobile, pas en tableau réduit.
2. **Inputs en step-by-step** sur mobile (10 inputs en une fois = abandon UX) : 3-4 écrans wizard avec progress bar.
3. **Outputs en cards séparées scrollables** sur mobile, pas une seule page-fleuve.
4. **Bouton "Recalculer" sticky** en bas d'écran sur mobile (UX classique calculateur).

### Format emportable (priorité MVP)
1. **Export PDF 1 page A5** : header course + timeline visuelle + pack shopping + 3 warnings essentiels.
2. **URL partageable avec params query string** : l'athlète peut sauvegarder l'URL et re-ouvrir n'importe quand sans re-saisir.
3. **Format imprimable propre** : pas de couleurs criardes, taille lisible, repliable en 2.

### Jour J (priorité V2 selon traffic)
1. **PWA installable** (icône home screen, manifest.json) — économie dev forte vs app native.
2. **Mode offline** (service worker cache la dernière session) — utile en montagne sans réseau.
3. **Mode "course en cours"** : input "heure de départ" → l'app scroll automatiquement à la prochaine prise.

### Cohérence avec autres outils CRIA
- Aligner pattern UI sur `MarathonPacePage.tsx`, `VMACalculatorPage.tsx` (doctrine `feedback_chaque_ligne_justifiee` : ne pas réinventer, réutiliser le pattern dev existant).
- Composant partagé `<NutritionCalculator config={config} />` validé V3 → bonne décision.

---

## Brief V4 — Modifications proposées (delta vs V3)

Liste numérotée des changements à apporter au brief V3, **prête à intégrer**.

### Inputs
1. **Ajouter input "Premier marathon / Premier semi / Premier ultra"** (case à cocher Oui/Non) — required si Niveau = Débutant.
2. **Ajouter input "Course officielle avec ravitos boisson iso ?"** (Oui/Non/Je ne sais pas) — optional. Utilisé pour déduire apports ravitos du besoin gels.
3. **Étendre paliers chrono marathon** : ajouter sub-5h30 (25-40 g/h) et sub-6h (20-35 g/h).
4. **Étendre paliers chrono semi** : ajouter sub-3h (25-40 g/h) et sub-3h30 (20-30 g/h).
5. **Trail : borner bas** — si distance <10 km, message orientation "nutrition course probablement pas nécessaire, focus petit-déj + hydratation".

### Calcul / Garde-fous
6. **Cap glucides par expérience nutrition** : Jamais → 60 g/h max ; Occasionnel → 80 g/h max ; Habitué → plage complète. Plus strict que V3 ("-20% si Jamais").
7. **Si premier marathon/semi/ultra coché** : limiter plage haute (jamais >70 g/h marathon, jamais >60 g/h semi, jamais >70 g/h trail <12h) + message pédagogique en tête de carte synthèse.
8. **Déduction ravitos officiels** : si course officielle Oui → afficher ligne synthèse "X gobelets iso = Y g glucides, complément en gels = Z gels".
9. **Reformuler warning EAH** :
   - Marathon/Semi (<5h) : ton informatif et rassurant, pas de "décès".
   - Trail/Ultra (>6h) : ton appuyé, symptômes détaillés, protocole de réaction.
10. **Cap hydratation 1L/h** : maintenir cap par défaut, mais ajouter section "Conditions extrêmes (>30°C + acclimatation)" qui ouvre la nuance pour 1.2-1.5 L/h sans inciter à la prise de risque.
11. **Reformuler caféine pré-course** : fenêtre 30-90 min selon habitude + forme + obligation test SL.

### Cartes / Outputs
12. **Nouvelle carte "Quand tester ta stratégie"** (ou enrichir carte Gut training) :
    - Protocole 4-8 semaines progressif (30 → 50 → 70 → cible g/h).
    - CTA "Pas de plan ? → générateur de plans CRIA".
    - Test pesée pré/post SL pour calibrer hydratation.
13. **Enrichir carte 7 trail "Lassitude gustative & plan B"** :
    - Section "Anticipation" (existante).
    - Nouvelle section "Quand ça arrive — protocole 4 étapes" : marche / cola / gingembre / repos.
    - Nouvelle section "Kit anti-écœurement" : 6-8 items concrets.
14. **Enrichir carte 6 trail "Conseils ravitos / bases de vie"** : 3 cas (BdV courte / moyenne / longue) avec quoi faire/manger pour chacun.
15. **Carte synthèse marathon/semi** : ajouter message anti-rigidité (anti-TCA soft) : *"Ton corps et ton ressenti restent les meilleurs juges. Manger trop strict ne te rendra pas plus performant."*
16. **Warning gut training en TÊTE de page** (pas en encart bas) avec bouton "Compris, montre-moi les chiffres" pour désinhiber.

### UX / Format
17. **Mobile-first responsive** : matrices hydratation en cards verticales sur mobile, pas en tableau réduit.
18. **Wizard inputs step-by-step** sur mobile (3-4 écrans avec progress bar).
19. **Export PDF 1 page A5** : MVP obligatoire (header + timeline + pack + warnings).
20. **URL partageable avec query string** : MVP obligatoire (sauvegarde/partage).
21. **PWA + mode offline** : V2 selon traffic (pas MVP).

### Cohérence produit principal
22. **CTA cross-sell soft "Pas encore de plan structuré ?"** en haut de l'outil et dans la carte "Gut training".
23. **Welcome message du plan d'entraînement** : ajouter mention de l'existence des outils nutrition séparés (≤40 mots, sans chiffres, sans protocole) — à valider doctrine `feedback_pas_de_nutrition_dans_plan`.
24. **Documenter exception doctrine** dans `feedback_pas_de_nutrition_dans_plan` : "Le plan peut MENTIONNER (sans chiffres) l'existence des outils nutrition séparés."

### Sécurité doctrine
25. **Revue Romane sur tous les libellés UI** : warnings, messages, ton — vérifier `feedback_jamais_poids_minceur`, `feedback_securite_avant_conversion`, `feedback_pas_de_micro_expert`.
26. **Tests utilisateurs post-MVP** : 3-5 entretiens débutants pour valider qu'aucun warning n'a "scared off".

### Profils manquants à mentionner
27. **FAQ Hyrox** : ajouter 1-2 questions dans la FAQ semi-marathon (Hyrox = effort proche en durée).
28. **Femmes phase lutéale** : noter pour V2 (hors scope V1, complexité).

### Compléments métier coach (à insérer dans cartes/FAQ pédagogiques)
29. **Mentions explicites dans la FAQ ou la carte sécurité** :
    - "Rien de nouveau le jour J" (×3 fois dans l'outil).
    - "L'estomac est entraînable comme un muscle".
    - "Stress de course = digestion -30 à -50% → marge de sécurité 15-20% sous la cible théorique".
    - "Allure trop rapide = nausée garantie, la nutrition n'y peut rien".
    - "Froid coupe l'envie de boire — forcer rappel toutes les 20-30 min si <5°C".
    - "Pesée pré/post SL = méthode la plus fiable pour calibrer hydratation perso".

---

## Conclusion reviewer

Le brief V3 est **scientifiquement solide** (les deux nutritionnistes ont bien fait le boulot), **mais incomplet sur la pédagogie coach et l'articulation avec le produit principal CRIA**.

Les 29 modifications listées ci-dessus permettent de passer d'un *"calculateur nutrition rigoureux"* (V3) à un *"coach nutrition en course pédagogique, sécurisé, et cohérent avec le générateur de plans"* (V4).

**3 priorités absolues** avant passage au dev :
1. **Mode "Premier marathon/semi/ultra"** avec garde-fous spécifiques et message anti-rigidité (Risque #1 et #3).
2. **Reformulation warning EAH** en mode informatif pour course route, gardant ton appuyé pour ultra (Risque #2).
3. **Articulation outil ↔ plan d'entraînement** : welcome message dans le plan + CTA dans l'outil + documentation doctrine (Challenge #1 et #4).

Les 26 autres modifications sont importantes mais peuvent être priorisées en MVP / V1.1 / V2.

**Recommandation finale** : ⚠️ **Refonte partielle ciblée — appliquer les 29 deltas V3→V4 avant transmission au dev.**

Une fois V4 implémentée, cet outil aura :
- ✅ La crédibilité scientifique des nutritionnistes.
- ✅ La pédagogie coach (débutants protégés, warnings calibrés).
- ✅ La cohérence produit principal (plan ↔ outil articulés).
- ✅ L'UX utilisable jour J (PDF, URL partagée).
- ✅ Le respect total de la doctrine CRIA (sécurité > conversion, jamais poids/minceur, jamais contact client, course exclusivement).

→ **Position concurrentielle nette** sur le marché francophone, où aucun outil ne combine ces 5 dimensions.

**Reviewer** : Coach course à pied expert (20 ans expé, UTMB Academy, Pfitzinger/Daniels)
**Statut** : Challenge complété — prêt pour intégration brief V4 par Romane avant transmission Phase 3 (PM + dev).
