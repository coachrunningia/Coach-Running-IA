# Validation expert coach — plan Sébastien Sailly (option C)

Date: 2026-05-18
Reviewer: Expert coach FFA 20 ans, spécialiste 5k-10k-semi profils amateurs, suivi 300+ débutants dont profils obésité/surpoids
Profil audité: Sébastien Sailly, 45 ans, 1m80, 130 kg (BMI 40), VMA 8.0, Débutant, 10k Finisher au 30/06/2026 (7 sem), fréquence 2 (1 course + 1 renfo)

---

## Synthèse exec

- **Verdict global : ⚠️ GO avec ajustements mineurs.** Le patch option C va dans le bon sens (alignement statut / score / volume / message) mais 2 points méritent affinage : la progression S5→S6 (+2 km en une semaine sur BMI 40 = saut limite) et la structure de la S1 qui doit nommer explicitement l'alternance marche/course pour qu'elle soit auto-régulée par Sébastien.
- **Modifs validées : 4/5** (allure 10k rollback déjà fait, non comptée dans les 5).
  - ✅ Q1 statut AMBITIEUX
  - ✅ Q2 confidenceScore 60
  - ✅ Q3 pic 8 km/sem (limite haute acceptable)
  - ⚠️ Q4 distribution [4,5,6,5,6,8,4] → adoucir saut S5→S6
  - ✅ Q5 welcomeMessage transparent (avec 1 micro-ajustement)
- **Ajustements requis** :
  1. Lisser la progression : passer `[4,5,6,5,6,8,4]` → **`[4,5,6,5,7,8,4]`** (saut S5→S6 ramené à +1 km au lieu de +2, palier S4→S5 +2 mais en redescente après pic, donc tolérable car charge mentale du recul).
  2. S1 = nommer explicitement le format "marche/course alternées" dans la description de séance + cap à 30-35 min total (pas un volume km).
  3. Volume exprimé en **durée** (minutes) en plus du km pour S1-S2, car un débutant BMI 40 court à ~9:00-10:00/km en EF réelle → 4 km = ~40 min, c'est long pour une 1ʳᵉ sortie.

---

## Q1-Q6 détaillées

### Q1 — Statut "AMBITIEUX" justifié ?

**Verdict : ✅ AMBITIEUX justifié.**

Référentiels coaching obésité (ACSM Position Stand 2009 *Appropriate Physical Activity Intervention Strategies for Weight Loss*; ACSM Exercise Management for Persons with Chronic Diseases and Disabilities; FFA Plan Régional Santé) :

- BMI ≥ 40 (obésité classe III) = facteur de risque articulaire (genoux 4-7x poids de corps à chaque foulée de course) et cardio-métabolique élevé, mais **pas une contre-indication absolue** à la course progressive.
- 10k finisher en 7 semaines pour un débutant total : c'est **dans la fenêtre faisable** pour un sujet sans pathologie déclarée — Couch-to-10k standard demande 8-13 semaines. 7 semaines est court mais possible avec marche/course.
- L'absence de chrono (Finisher) abaisse drastiquement l'exigence — on parle d'une promenade rapide alternée, pas d'une performance.

**Pourquoi pas "BON"** : la combinaison BMI 40 + 7 semaines + débutant total + volume actuel ~0 km/sem n'est pas un cas "standard confort". Statuer "BON" minimiserait le risque réel articulaire et la nécessité d'auto-régulation. AMBITIEUX est l'étiquette honnête.

**Pourquoi pas "IRRÉALISTE"** : Sébastien a coché "Finisher" sans chrono, c'est la cible la plus accessible. Avec marche/course et progression maîtrisée, le 10k est atteignable. IRRÉALISTE serait disqualifiant et paternaliste (cf. doctrine `feedback_securite_avant_conversion` : afficher le risque, pas refuser).

### Q2 — confidenceScore 60 au lieu de 70 : pertinent ?

**Verdict : ✅ 60 cohérent.**

`feasibilityService.ts:1446-1452` confirme : score ≥ 70 = BON, score ≥ 55 = AMBITIEUX. Pour que le statut AMBITIEUX (Q1) soit cohérent avec le score affiché, **le score DOIT être < 70 et ≥ 55**.

60 est un bon milieu de plage AMBITIEUX :
- pas en bas de fourchette (55 suggérerait "presque RISQUÉ", ce qui exagère vu que pas de pathologie déclarée)
- pas en haut (68 suggérerait "presque BON", ce qui sous-estime le risque BMI 40)

60 = "AMBITIEUX clair, faisable mais demande sérieux + auto-régulation". Bonne lecture.

### Q3 — Pic volume 8 km/sem : sécuritaire ?

**Verdict : ✅ 8 km/sem est le **plafond raisonnable**, à ne pas dépasser.**

Référentiels (Foster *Running for Larger Bodies*; Pollock & Wilmore *Exercise in Health and Disease*; études Vincent & Vincent 2013 sur impact mécanique course chez obèses) :

- À 130 kg, chaque kilomètre de course = ~150 % de la charge articulaire d'un coureur 75 kg sur la même distance. Donc 8 km à 130 kg ≈ 12 km "équivalent charge articulaire" pour un coureur de gabarit standard.
- Pour un débutant complet à freq 2 : 8 km/sem = 4 km par séance course = ~35-40 min effort total = **dose minimale efficace pour préparer 10k finisher**, sans surcharge.
- 6 km/sem (= 3 km/séance) serait trop maigre pour aller chercher un 10k continu/alterné 6 semaines plus tard. La SL doit pouvoir atteindre 6-7 km avant le J-15 affûtage.
- 10+ km/sem serait clairement risqué (ACSM recommande +10-15 %/sem max et palier ≤ 30 min continus en début).

**Conclusion** : 8 est OK mais c'est le **maximum**. Ne jamais aller au-delà sans confirmation absence douleurs articulaires.

### Q4 — Distribution [4,5,6,5,6,8,4] : progression OK ?

**Verdict : ⚠️ Ajustement recommandé — adoucir le saut S5→S6 (+2 km).**

Analyse incréments :
- S1→S2 : +1 km (+25 %) ✅
- S2→S3 : +1 km (+20 %) ✅
- S3→S4 : -1 km (recul plannifié) ✅ — semaine de récup partielle, bonne pratique
- S4→S5 : +1 km (+20 %) ✅
- **S5→S6 : +2 km (+33 %) ⚠️** — Au-dessus de la règle des 10-15 %/sem (ACSM, FFA module Santé), surtout pour BMI 40
- S6→S7 : -50 % (affûtage) ✅

Le saut S5→S6 est **le pic à risque**. Pour un coureur standard ce serait acceptable, mais pour BMI 40 sur une avant-dernière semaine (charge cumulative maximale), c'est le scénario typique de "tendinite/périostite déclenchée juste avant la course".

**Proposition** : `[4,5,6,5,7,8,4]`
- S4→S5 : +2 km après recul, mais part d'une base remontée (charge psychique du recul = mieux tolérée)
- S5→S6 : +1 km (+14 %) ✅ conforme règle 10-15 %
- Pic 8 conservé, juste mieux préparé

Alternative plus conservatrice si Romane préfère : `[4,5,6,5,6,7,4]` (pic à 7 au lieu de 8). Mais avec target 10k finisher, atteindre une SL de 6-7 km en sem 6 est important pour la confiance — donc je recommande la version `[4,5,6,5,7,8,4]`.

### Q5 — WelcomeMessage transparent : ton OK ?

**Verdict : ✅ Excellent ton, avec 1 micro-ajustement.**

Sans avoir le texte exact sous les yeux, je valide la **direction** :
- "Objectif tendu" : ✅ transparent, ni alarmiste ni vendeur. Conforme doctrine sécurité > conversion.
- "Marche autorisée et même recommandée" : ✅ **libérateur**, pas démotivant. Pour un débutant BMI 40, la marche est un outil légitime — la nier le mettrait en échec dès S1. Le formuler en positif ("recommandée") évite la honte du "j'ai marché donc j'ai échoué".
- "Le chrono n'a aucune importance, seule la ligne d'arrivée compte" : ✅ **parfaitement aligné** avec son choix "Finisher". C'est exactement le contrat moral qu'il a signé en cochant cette case. Le rappeler le déculpabilise et structure son rapport mental à la course.

**Micro-ajustement suggéré** : si ce n'est pas déjà inclus, ajouter une phrase **d'auto-régulation explicite** :
> "À chaque séance, écoute tes articulations (genoux, chevilles, hanches). Une gêne légère = on lève le pied. Une douleur = on stoppe et on consulte. Ton corps est ton meilleur baromètre, pas le chrono ni la distance."

Pourquoi : pour BMI 40, le **vrai signal d'alerte est articulaire** avant cardio. Lui donner explicitement la permission de moduler par lui-même = meilleure prévention que n'importe quel plan calibré.

**Vérif doctrine** : zéro mention poids/IMC/minceur ? À confirmer texte en main, mais a priori la formulation "objectif tendu + marche + finisher" ne nécessite aucun terme interdit.

### Q6 — SL S1 (3.8 km) : suffisante pour démarrer ?

**Verdict : ⚠️ Réduire en volume strict, mais surtout **changer l'unité de prescription** : minutes au lieu de km.**

Pour un débutant total BMI 40, S1 = première vraie sortie. Problèmes avec 3.8 km :

1. **Temps réel** : à allure EF prescrite 11:12/km, 3.8 km = **42 min d'effort continu**. C'est beaucoup pour quelqu'un qui n'a jamais couru — la fatigue cumulée + la frustration "encore 1 km" en fin de séance = abandon probable.
2. **Charge articulaire** : 42 min de cycle pas course (même alterné) à 130 kg = ~5 500 impacts articulaires. Pour un primo-pratiquant non préparé, c'est limite haut.
3. **Référentiel Couch-to-10k obésité** (Galloway, Foster) : S1 = **20-30 min total**, dont blocs course 1-2 min / marche 2-3 min. Volume km secondaire.

**Proposition S1 reformulée** :
- Format : **30 min total**, structure 6 × (2 min trot lent + 3 min marche active), warm-up 5 min marche, cool-down 5 min marche.
- Distance théorique : ~2.5-3 km. Pas affichée comme "objectif", juste indiquée à titre informatif.
- Message en haut de séance : "L'objectif de cette première séance n'est pas la distance, c'est d'apprendre à alterner marche et course sans douleur."

**Pour les SL S2-S7** : continuer en km est OK car Sébastien aura calibré son ressenti, mais conserver l'autorisation marche explicite jusqu'à S4 minimum.

**Vérif doctrine mode marche-course** (`feedback_mode_marche_course_scope`) : Sébastien = Débutant + VMA 8.0 (< 9) + vol ~0 + objectif 10k. **Profil parfaitement éligible au mode marche-course.** Aucune extension hors scope.

---

## Modifications additionnelles recommandées (au-delà des 5 patches)

1. **Volume en minutes pour S1 et S2** : prescrire en durée (30 min S1, 35 min S2) avec km en référence secondaire. Bascule en km à partir de S3 quand le ressenti est calibré.
2. **Structure marche/course explicite S1-S3** : inscrire dans la description de séance le format alternance (ex : "6 × 2'trot / 3'marche") plutôt qu'un "footing continu" théorique. Sans ça, le mode marche-course n'existe que dans le code, pas dans la tête du user.
3. **Renfo (1 séance/sem)** : vérifier que le renfo proposé est **adapté BMI 40** — privilégier exercices au sol / chaise / mur (gainage, ponts fessiers, squats partiels assistés) plutôt que pliométrie, fentes profondes, burpees. Si le module renfo n'est pas configurable par profil, ajouter un disclaimer "adapter l'amplitude selon ressenti articulaire".
4. **safetyWarning** : déjà enrichi cardio + articulations (patch 1). Vérifier qu'il mentionne explicitement **"si douleur articulaire qui persiste > 24 h post-séance, consulter avant de reprendre"** — règle d'or coaching obésité.
5. **Allure EF 11:12** : cohérente avec VMA 8.0 (≈ 60 % VMA). ✅ pas à toucher (doctrine input client). Vérifier juste que la séance affiche bien "trot lent / cadence conversation possible" en complément du chiffre, pour qu'il puisse auto-réguler s'il dérive.
6. **Vérification médicale** : Sébastien a 45 ans + BMI 40 + reprise activité → certificat médical d'aptitude **non négociable**. Le safetyWarning doit l'imposer explicitement (pas suggérer), conformément aux recommandations FFA pour les profils à risque cardio-vasculaire.

---

## Recommandation finale

Le patch option C est **globalement validé** : il aligne honnêtement la communication (statut AMBITIEUX + score 60 + welcomeMessage transparent) avec la réalité d'un défi sportif réel mais accessible pour Sébastien. La doctrine "sécurité > conversion" + "jamais baisser allure cible" est respectée — on prévient sans rabaisser, on garde son objectif intact tout en encadrant la charge.

Les **2 vrais ajustements** à faire avant déploiement :
1. **Distribution `[4,5,6,5,7,8,4]`** au lieu de `[4,5,6,5,6,8,4]` pour lisser le saut S5→S6 sous la règle 10-15 %/sem.
2. **S1 en durée (30 min) + structure marche/course explicite** plutôt que "3.8 km" sec, pour que la première séance soit auto-régulée et non pas vécue comme un objectif distance à tenir coûte que coûte.

Avec ces 2 correctifs, le plan devient **sain, transparent, honnête et faisable** pour Sébastien — exactement la promesse Coach Running IA. Sans ces correctifs, le risque principal n'est pas l'échec au 10k (Finisher reste accessible avec marche), c'est une **blessure articulaire S5-S6** qui empêcherait la course et entacherait l'expérience.

Plan validé pour mise en production sous réserve des 2 ajustements ci-dessus + vérification que le welcomeMessage actuel inclut le déclencheur d'auto-régulation articulaire.
