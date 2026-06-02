# COL 3 — Coach FFA externe (20 ans expérience route+trail+senior)

> **Note méthodo** : Col 1 (avis freelance externe) non disponible après 2 vérifications espacées (T0, T+30s). Audit conduit en **mode indépendant** sans contre-analyse du freelance. Croisement complet questionnaire ↔ plan, focus écueils que je vois souvent passer sous le radar IA + freelance non-FFA.

---

## Plan 1779872965757 — terebeu@gmail.com

**Profil clé** : H 55 ans, 192/108 → IMC 29.3, marathon 1ère expérience implicite, VMA 12.85 (PB 5k 24:35), cv 40 km/sem, freq 5, target 4h30 sur 16 sem, J1 = 15 juin (J+19).

### Ce qu'un freelance verrait probablement
- Plan globalement sain : 16 sem, pic 60 km, progression +7% max, retour rec S4/S8/S12 visible.
- S1 marche-course (5×5min) raisonnable au démarrage.
- Safety warning âge + certif médical bien posé.

### Ce qu'il manquerait
- **PB 5k 24:35 = 4:55/km → VMA terrain plutôt 13.5-14, pas 12.85** : la VMA calculée sous-estime probablement le potentiel réel (un 5k à 4:55 sur un H entraîné = VMA 14+ classiquement). Le plan tourne donc à allure EF 6:58/km, ce qui est très lent pour qui boucle un 5k à 4:55. Risque de démotivation EF + sous-stim.
- **IMC 29.3 sur 192cm/108kg + 55 ans** : charge articulaire élevée, surtout sur SL de 14 km dès S1 et pic 60 km. Pas de signal interne (légitime sur message user, mais doctrine = absent). Le plan a cependant la sagesse de plafonner pic à 60 km, c'est cohérent.
- **Mode marche-course S1 sur un Confirmé Compétition** : doctrine = marche-course = débutants/petite VMA uniquement. Là on a un Confirmé déclaré qui boucle 40 km/sem ; les 5 blocs de 5min entrecoupés de marche détonnent. À vérifier code (peut-être lié âge ≥55, mais doctrine est claire : marche-course = scope débutants).
- **SL S1 = 14 km à 6:58/km** : cohérent avec cv 40 et niveau Confirmé. OK.

### Incohérences inputs vs plan
- **VMA 12.85 vs PB 5k 24:35** : incohérence forte. Source VMA = "5km en 24:35" mais 24:35 / 5 = 4:55/km = VMA Riegel ~14. Bug calcul VMA ou champ recentRaceTimes mal utilisé.
- **Level "Confirmé Compétition" + cv 40 + freq 5** : globalement cohérent.
- **targetTime 4h30 sur marathon** : vs VMA réelle ~14, théorique ~3h45-3h55. Le 4h30 est **conservateur** (raisonnable pour 1ère expérience marathon à 55 ans), pas un problème de sécurité.

### 3 actions reco (Coach interne)
1. **Vérifier formule VMA depuis PB 5k** : 24:35 sur 5k devrait sortir VMA ~14, pas 12.85. Bug à débugger en priorité (impacte allures EF de toute la cohorte avec PB 5k).
2. **Patcher S1 mode marche-course pour Confirmé/Expert** : retirer les blocs de marche pour level ≥ Intermédiaire (doctrine marche-course scope). Garder pour Débutant uniquement.
3. **Confirmer doctrine "marathon 1ère expé"** : pas d'input "première fois" dans questionnaire, mais 55 ans + marathon → prudent. Welcome message déjà bien posé sur certif + bilan cardio.

---

## Plan 1779874303413 — noemie507@hotmail.com

**Profil clé** : F 37 ans, 175/70 → IMC 22.9, trail 10 km / 349 m D+, target 1h25, PB 10k plat 1h20, VMA 8.33, cv 15 km/sem (D+ 500m/sem actif), freq 3, 7 sem (court), J1 = aujourd'hui 27 mai.

### Ce qu'un freelance verrait probablement
- Plan court 7 sem cohérent avec raceDate proche.
- Status AMBITIEUX + référence Minetti (1h28) + objectif 1h25 = transparence honnête.
- S1 démarre soft : footing 60min + renfo trail + SL 5km/200 D+.

### Ce qu'il manquerait
- **VMA 8.33 vs PB 10k 1h20** : 1h20 sur 10k = 8:00 min/km = vitesse moyenne 7.5 km/h. VMA dérivée 8.33 cohérente. OK.
- **Allure EF 10:45 min/km très lente** : sur une F qui sort un 10k plat à 8:00/km, EF à 10:45 = 70% VMA → c'est **dans les clous Daniels**, mais ras la gueule en bas de la fourchette. À surveiller perception "trop lent".
- **freq 3 + 1 seul jour préférence (mercredi) + SL samedi** : le 3e jour (lundi footing) est imposé sans préférence user, vérifier que c'est OK contractuellement.
- **D17 plan 7 sem AMBITIEUX, S1 commence aujourd'hui** : OK doctrine, transparence bien faite, opt-in implicite (preview).
- **Pas de PPS spécifique côtes en S1** : sur un trail D+ 349m en 7 sem, S1 = renfo quadri excentrique = bon réflexe. Mais il faudra des séances de côtes en S3-S5 (à vérifier hors scope S1).

### Incohérences inputs vs plan
- Cohérence globale OK. RAS majeur.
- **`preferredDays: ["Mercredi"]` mais plan a Lundi+Mercredi+Samedi** : Samedi = preferredLongRunDay, OK. Lundi = imposé par freq 3. Petit angle mort UX : user attend peut-être qu'on respecte stricto "Mercredi seulement". À documenter en welcome.

### 3 actions reco (Coach interne)
1. **Audit séances côtes S3-S5** : confirmer présence travail spécifique D+ (sortie côtes ou intervalle en montée) pour atteindre 1h25 vs 1h28 référence. Sans ça, le -3min n'est pas atteint.
2. **Welcome : expliciter pourquoi lundi est ajouté** au-delà du mercredi préféré (sinon UX dissonante).
3. **Suivi feedback post-S2** : plan court 7 sem = aucune marge d'erreur. Mettre un check-in à S2 pour ajuster si surcharge ou sous-stim.

---

## Plan 1779892027140 — desbonnet.julien@gmail.com

**Profil clé** : H 42 ans, 170/90 → IMC 31.1 (obésité grade I), marathon, VMA 9.66 (PB 5k 33min + 10k 1h08), level Intermédiaire, cv **15 km/sem** (sous le seuil marathon 30), freq 4, 21 sem, J1 = 1er juin.
**⚠ Mémoire** : déjà eu un plan plus tôt aujourd'hui (1779889214538) patché par Romane. Plan actuel = re-génération.

### Ce qu'un freelance verrait probablement
- Status RISQUÉ + recommandation semi-marathon = bon flag.
- Progression très douce (16→29 km pic) = prudente.
- Welcome + safety warning bien posés (médecin, chaussures, surfaces souples).

### Ce qu'il manquerait
- **cv 15 km/sem + marathon 1ère expé probable** : doctrine "cv < seuil marathon" déclenche RISQUÉ → fait. Bien.
- **IMC 31.1** : non flaggé dans warning user (doctrine = OK, zéro mention poids). Mais en interne audit = facteur charge articulaire majeur. Le pic à 29 km est cohérent avec ça (très en-dessous des 50-60 standard pour un marathon).
- **VMA 9.66 vs cv 15 km/sem + level Intermédiaire** : VMA correspond à 6:13/km en théorique marathon = 4h22. target n'est pas renseignée → pas de conflit. OK.
- **"Intermédiaire (Régulier)" + cv 15** : flag jaune. Intermédiaire est censé = cv ≥ 25. Soit user a sur-estimé son level, soit cv reflète une saison creuse. Le plan compense en partant à 16 km/sem = lecture prudente, bien.
- **Re-génération vs plan patché Romane plus tôt soir** : à vérifier — si user a refait le questionnaire, on a peut-être perdu le patch manuel. Inputs ici cohérents avec un nouveau cycle.
- **Mode marche-course S1 (5×5min)** : doctrine = débutants/petite VMA uniquement. Ici level Intermédiaire, mais VMA 9.66 + cv 15 = profil quasi-débutant en réalité. Discutable mais défendable.

### Incohérences inputs vs plan
- **Level Intermédiaire vs cv 15** : flag classique. Plan calibre conservateur = OK fonctionnellement.
- **Marathon avec cv 15** : RISQUÉ flag fait son job.
- **Pas de targetTime** : aucun objectif chrono = "finisher" implicite. Cohérent avec le profil.

### 3 actions reco (Coach interne)
1. **Vérifier diff vs plan 1779889214538 patché Romane** : récupérer le patch manuel précédent et voir si la re-génération l'a effacé. Si oui, ré-appliquer ou notifier Romane.
2. **Confirmer scope marche-course S1 sur Intermédiaire bas-cv** : décision doctrine — soit on étend marche-course aux Intermédiaires à VMA <10 et cv <20, soit on retire. Trancher en V-prochaine.
3. **D17 — opt-in front RISQUÉ** : confirmer que l'opt-in explicite est bien présenté (status RISQUÉ + recommandation alternative semi).

---

## Plan 1779898894672 — robineregina@gmail.com

**Profil clé** : F 47 ans, 170/80 → IMC 27.7, 10 km, target 1h15, VMA **ajustée manuellement 8.3 → 10.0** (suspect), level Confirmé, cv 20, freq 4, 16 sem, J1 = 6 sept, **isPreview: false** (plan validé/payé).

### Ce qu'un freelance verrait probablement
- Status IRRÉALISTE + welcome ATTENTION + recommandation 1h24 = transparence doctrinaire OK.
- Pic 20 km/sem cohérent avec cv 20.
- Le plan ne baisse PAS l'allure cible user (doctrine respectée).

### Ce qu'il manquerait
- **VMA ajustée manuellement 8.3 → 10.0 km/h** : énorme. User (ou système) a gonflé la VMA de +20%. Pourtant le calcul feasibility utilise toujours 8.3 (cf. message "tenir 96% de ta VMA (8.3 km/h)"). Double valeur de vérité = bug confusionnel. Le plan utilise quelle VMA pour les allures ? EF affichée 10:47 min/km = 5.57 km/h = ~67% de VMA 8.3, ou ~56% de VMA 10. Plutôt cohérent avec VMA 8.3. Donc l'ajustement manuel à 10 n'est **pas pris en compte** dans le plan, mais reste dans le champ. À nettoyer.
- **"Confirmé Compétition" + cv 20 + VMA réelle 8.3** : flag rouge classique. Confirmé Compétition implique normalement VMA F ≥ 14 et cv ≥ 30. Là, profil "Débutant volontaire qui se déclare Confirmé". Plan compense bien en partant à 15 km/sem.
- **Target 1h15 sur 10k vs VMA 8.3** : 1h15 sur 10k = 8.0 km/h = 96% VMA, physiologiquement impossible sur 10k (seuil 90-92% VMA pour une F entraînée). IRRÉALISTE bien flaggé.
- **isPreview: false + IRRÉALISTE** : user a validé/payé un plan flaggé IRRÉALISTE. Soit opt-in volontaire (doctrine D17), soit bypass UX. À auditer.
- **Âge 47 + IMC 27.7** : facteurs cumulés non-flaggés (doctrine poids absente, OK). Plan reste très soft (pic 20), prudent.

### Incohérences inputs vs plan
- **Double valeur VMA (8.3 questionnaire vs 10.0 ajustée)** : à nettoyer dans le data model. Source d'erreur future.
- **Level Confirmé Compétition + cv 20** : aberration. Plan a sagement ignoré le level déclaré pour calibrer sur la VMA réelle.
- **Aucun jour préféré (`preferredDays: []`)** : plan a choisi Mardi/Jeudi/Samedi/Dimanche. À vérifier que c'est OK doctrinairement (default safe).

### 3 actions reco (Coach interne)
1. **Audit du champ "VMA ajustée manuellement"** : d'où vient l'ajustement 8.3→10 ? User input ou bug ? Si user input, faut-il l'écouter (doctrine "inputs immuables") ou capper ? Décision Romane requise.
2. **Vérifier flow opt-in IRRÉALISTE → isPreview:false** : user a-t-il explicitement coché "je sais que c'est irréaliste, je veux quand même" ? Si non, fuite UX.
3. **Welcome — vérifier qu'aucune mention IMC/poids** n'est passée. Le snippet vu est clean, OK doctrine.

---

## Plan 1779900008615 — lucasducharlet@outlook.fr

**Profil clé** : H 23 ans, 174/75 → IMC 24.8, 10 km, target 40min, VMA **ajustée manuellement 12.9 → 13.4** (et message dit "VMA 10.9, target nécessite 16.7"), level Intermédiaire, cv 20, freq 3, 16 sem, J1 = 7 juin, **isPreview: false** (validé).

### Ce qu'un freelance verrait probablement
- Status IRRÉALISTE + recommandation 52:08 = transparence OK.
- Pic 15 km/sem **très faible** (cv 20 → pic 15 = régression nette).
- Welcome ATTENTION posé.

### Ce qu'il manquerait
- **Triple valeur VMA confusion** : champ vma=13.4, source "ajustée 12.9→13.4", message feasibility cite "13.4" puis welcome cite "10.9". Trois chiffres. Bug data majeur, plus grave qu'au plan précédent.
- **EF S1 affichée 8:12 min/km = 7.3 km/h = 54% de VMA 13.4 ou 67% de VMA 10.9** : c'est cohérent avec VMA 10.9, **pas** avec VMA 13.4. Le moteur utilise donc 10.9 pour les allures mais 13.4 pour le statut affiché → incohérence totale, le user voit "VMA 13.4" et tape un EF de débutant à 8:12/km. Démotivation programmée + perte de confiance produit.
- **Pic 15 km/sem < cv déclaré 20** : doctrine "courte durée charge allégée" peut justifier sur 13 sem, mais ici 16 sem on devrait monter au-dessus du cv, pas baisser. Sauf si le moteur calibre sur VMA 10.9 (= Débutant) auquel cas le cv 20 est ré-interprété. À clarifier.
- **target 40min sur 10k pour H 23 ans VMA 10.9** : effectivement impossible (16.7 km/h nécessaire). Flag IRRÉALISTE correct.
- **freq 3 + cv 20 + level Intermédiaire + 23 ans + sain** : profil avec marge de progression. Le plan pourrait être bien plus stimulant. Pic 15 = très conservateur.

### Incohérences inputs vs plan
- **VMA triple-valuée** : 10.9 (réelle) / 12.9 (intermédiaire) / 13.4 (déclarée). Faut trancher.
- **target 40min vs VMA 10.9** : IRRÉALISTE flag OK.
- **Level Intermédiaire + cv 20** : limite mais acceptable pour 23 ans.

### 3 actions reco (Coach interne)
1. **Audit VMA cascade (Q→ajustement→feasibility→allures)** : la même valeur doit être utilisée partout. Bug data prioritaire (touche aussi plan robineregina).
2. **Re-calibrer pic en cohérence** : si moteur utilise VMA 10.9, alors c'est un profil Débutant et le cv 20 n'est pas tenable → contradiction. Soit on respecte cv 20 (doctrine inputs immuables), soit on flagge "cv déclaré incohérent avec VMA mesurée".
3. **isPreview: false sur IRRÉALISTE** : même question que robineregina, vérifier opt-in explicite enregistré.

---

## Plan 1779900993196 — thibaud.mathys@gmail.com

**Profil clé** : H 41 ans, 172/65 → IMC 22, marathon, target 3h10, VMA 17.05 (PB 10k 39:30 + semi 1h26), level Expert, cv 60, freq 6, 24 sem, J1 = aujourd'hui 27 mai.

### Ce qu'un freelance verrait probablement
- Status EXCELLENT score 93 = bien posé.
- 24 sem + pic 90 km = standard préparation marathon Expert.
- Tous inputs cohérents : PB→VMA→target→cv.

### Ce qu'il manquerait
- **Pic 90 km/sem pour Expert visant 3h10** : un peu en deçà du standard FFA (Pfitzinger 75-95 mpw, Daniels jusqu'à 100). 90 = bas de la fourchette Expert. OK mais pas optimal pour un viseur 3h10.
- **S1 = 5 séances course + 1 renfo (freq 6)** : doctrine X séances = X-1 course + 1 renfo → freq 6 = 5 course + 1 renfo. ✅ vérifié, conforme.
- **Récup active samedi à 5:52/km avant SL dimanche** : très bon réflexe coach (drainage J-1 avant long).
- **Pas de séance qualité (seuil, VMA, allure marathon) en S1** : normal, S1 = fondamental. À vérifier que S2-S6 introduisent progressivement.
- **Allure EF 5:15/km pour VMA 17** : 5:15 = 11.4 km/h = 67% VMA. Daniels EF = 65-75%. OK.
- **SL S1 = 21.8 km dès la 1ère semaine** : cohérent avec cv 60. Bon.
- **Pattern weeklyVolumes** : 60→66→73→58→67→77→89→72→83→86→90→72→83→86→90→72→83→86→90→72→83→60→53→45. **Pic plateau à 90 répété 4 fois (S11, S15, S19) avec récup S12/S16/S20 à 72** → bonne périodisation alternance charge/récup. Solide.

### Incohérences inputs vs plan
- Aucune incohérence majeure. Plan le plus propre des 6.
- Seul micro-point : Expert + freq 6 + cv 60 + target 3h10 cohérent vs VMA réelle (théorique 3h06). Marge 4min = réaliste.

### 3 actions reco (Coach interne)
1. **Confirmer présence travail qualité S5+** : seuil, allure marathon (4:30-4:35/km pour 3h10), VMA. Sans ça, EF seule ne suffit pas pour viser 3h10.
2. **Évaluer pic 90 vs 95-100** : pour un viseur 3h10 ambitieux, monter le pic à 95-100 km/sem pourrait sécuriser le chrono. Décision selon doctrine "charge allégée < 13 sem" — ici 24 sem, donc charge complète justifiée.
3. **SL longue à 30+ km en S15-S19** : vérifier qu'au moins 2-3 SL ≥ 30 km sont planifiées. Sans ça, marathon en 3h10 risqué sur le mur 32 km.

---

## Synthèse transverse (3 patterns récurrents détectés)

### A. Bug "VMA cascade" — priorité 1
3 plans sur 6 (terebeu, robineregina, lucasducharlet) ont une incohérence entre VMA déclarée/calculée/ajustée et VMA utilisée pour les allures. C'est un bug data architectural, pas un cas isolé. À traiter avant prochain sprint.

### B. Mode marche-course S1 hors scope doctrine
Détecté sur terebeu (Confirmé), desbonnet (Intermédiaire). Doctrine = Débutant uniquement. Soit étendre la doctrine officiellement (avec critères VMA<X et cv<Y), soit retirer du code pour level ≥ Intermédiaire. Décision Romane.

### C. Level déclaré vs cv réel
4 plans sur 6 ont un mismatch (Confirmé déclaré + cv 20-40 ; Intermédiaire + cv 15). Suggère d'ajouter un soft-flag UX : "Ton volume actuel est sous la fourchette habituelle de ton niveau — on calibre prudent". Ne change pas le plan, ajoute juste de la transparence.

### D. opt-in IRRÉALISTE / isPreview:false
2 plans sur 6 (robineregina, lucasducharlet) sont en isPreview:false avec status IRRÉALISTE. Vérifier que l'opt-in front est explicite et tracé (doctrine D17).
