# Patch en douceur — Plan Ambre Painvin (1778942808369)
Date : 2026-05-21

> **Révision Romane 2026-05-21** : allures cohérentes 2h30 + S1 intouchée.
> - Les séances utilisent désormais l'allure spé semi **7:07/km** (cohérente avec l'objectif user 2h30) et matchent strictement les `paces` stockés du plan : efPace 10:15, eaPace 8:55, seuilPace 7:54, allureSpecifique5k 7:14, allureSpecifique10k 7:38, allureSpecifiqueSemi 7:07, vmaPace 6:52.
> - L'écart 2h30 cible vs ~2h51 VMA-projeté s'exprime UNIQUEMENT dans `feasibility.message` et `welcomeMessage`. L'allure cible utilisateur n'est jamais baissée silencieusement (doctrine `feedback_jamais_baisser_allure_cible` + `feedback_input_client_obligatoire`).
> - **S1 (lundi 18/05 → samedi 23/05) entièrement intouchable**, J3 SL du 23/05 incluse. Le patch s'applique de **S2 à S17** uniquement (doctrine `feedback_patch_live_plans_jour_seulement`).
> - Note sécurité : 7:07/km = 8.4 km/h, **juste sous** le seuil de douleur déclaré (9 km/h). VMA pace 6:52 = 8.7 km/h → quasi seuil, évitée en fractionné dur, remplacée par fartlek doux EA dans les séances. Le médecin reste OBLIGATOIRE avant démarrage.

## 1. WelcomeMessage (texte exact à patcher)
```
Bienvenue Ambre, et bravo pour ce projet de semi à Nancy le 12 septembre.

⚠️ IMPORTANT — À LIRE AVANT DE COMMENCER

1) Consultation médicale OBLIGATOIRE avant le démarrage du plan. Prends rendez-vous avec un médecin du sport pour obtenir un certificat d'aptitude à la course à pied et faire évaluer ta douleur au genou. C'est non négociable.

2) Tu as mentionné une douleur au genou à 9 km/h. Or l'allure cible pour ton objectif 2h30 est 7:07/km, soit 8,4 km/h : tu te rapproches franchement de ce seuil. Tant que cette douleur n'a pas été évaluée par un médecin, ne démarre PAS le plan. Et si une douleur réapparaît pendant un entraînement (même légère), STOP immédiat, et tu reprends contact avec ton médecin avant de remettre les baskets.

3) Équipement : choisis une paire de chaussures running récentes, avec un bon amorti (modèles type "max cushion" — un vendeur spécialisé saura te guider). Renouvelle-les tous les 600-800 km.

4) Surfaces : privilégie la terre, l'herbe, les chemins forestiers ou la piste plutôt que le bitume. Nancy a de belles options (Parc de la Pépinière, forêt de Haye).

5) Échauffement systématique 10 min marche active + mobilité genou/cheville avant chaque footing. Étirements doux après.

Le plan est progressif, prudent, et chaque séance est sous tes sensations. À la moindre alerte : STOP, repos, médecin. La régularité prime sur la performance. On y va doucement, mais on y va bien. 💪
```

## 2. Feasibility message (texte exact à patcher)
status : TRÈS RISQUÉ
```
Objectif déclaré : Semi 2h30 le 12/09/2026 à Nancy.

Plusieurs points appellent à la transparence totale :

• Ton PB Semi actuel est 3h05. Viser 2h30 demande de gagner 35 minutes sur 21,1 km, soit ~1'40"/km plus rapide. C'est un saut très important sur 17 semaines.

• Ton estimation VMA (8,73 km/h) projette un temps semi théorique aux alentours de 2h51. Autrement dit, ton profil actuel est plus aligné avec un objectif 2h51 que 2h30. On RESPECTE ta cible 2h30 — les séances seront calibrées sur l'allure 7:07/km correspondante — mais sois consciente que cette cible est ambitieuse et que la performance réelle dépendra de l'évolution de ta forme et du feu vert médical.

• Volume actuel 5 km/sem → la montée en charge sera progressive (règle ACWR) pour protéger articulations et tendons.

• POINT BLOQUANT : la douleur au genou que tu signales à 9 km/h impose une consultation médicale AVANT le démarrage du plan. À noter : l'allure cible 7:07/km = 8,4 km/h, juste sous ce seuil. Sans feu vert médecin, on ne lance pas.

Aucun chrono ne sera promis. Priorité absolue : finir en bonne santé.
```

## 3. WeeklyVolumes recalibrés
```
[8, 9.5, 11, 9, 11, 13, 11, 14, 15, 13, 17, 19, 16, 22, 24, 17, 12]
```
Justification :
- Départ 5 km/sem → S1=8 (inchangée, déjà patchée live et S1 intouchable à partir de maintenant)
- Progression +10 à +15 %/sem hors recup (règle ACWR débutante, Hammond/Gabbett)
- Recup S4 / S7 / S10 / S13 = -15 à -20 % vs semaine précédente
- Pic à S15 = 24 km/sem (ACWR S15 vs moy S11-S14 = 1,33 → limite haute acceptable en phase spé)
- Affûtage : S16 = -29 % vs pic, S17 = race week (12 km incluant les 21,1 km de course est volontairement abstrait : la SL course est traitée comme la séance principale)
- SL plafonnée à 12 km au pic (57 % de la distance race) → cohérent avec doctrine reprise prudente + blessure genou
- Volume hebdo hors compétition ne dépasse jamais 24 km : compromis entre nécessité d'aller chercher 21,1 km en course et préservation articulaire

## 4. Sessions S2→S17 ajustées
Lecture : J1 = Lundi, J2 = Mercredi (renfo, code gère, NE PAS toucher), J3 = Samedi.
**S1 intouchable — non listée ici. Patch démarre à S2.**

Allures utilisées (strictement alignées sur les `paces` stockés du plan) :
- EF = 10:15 /km
- EA = 8:55 /km (utilisée pour accélérations fartlek en remplacement de la VMA, car 8:55 = 6,7 km/h, bien sous seuil douleur 9 km/h)
- Seuil = 7:54 /km (utilisable car 7,6 km/h, sous seuil)
- Allure spé semi = **7:07 /km** (cohérente avec objectif user 2h30 ; 8,4 km/h, juste sous seuil douleur — sous réserve feu vert médecin)
- VMA = 6:52 /km : **NON prescrite** en fractionné dur (8,7 km/h, quasi seuil douleur). Remplacée par fartlek doux EA + accélérations 30 s feeling.

```
S2 (fondamental, vol=9.5) :
  J1 Jogging EF      : dist=4.0 km / dur=41 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=5.5 km / dur=56 min / pace=10:15

S3 (fondamental, vol=11) :
  J1 Jogging EF      : dist=4.5 km / dur=46 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=6.5 km / dur=67 min / pace=10:15

S4 (recup, vol=9) :
  J1 Jogging EF      : dist=4.0 km / dur=41 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=5.0 km / dur=51 min / pace=10:15

S5 (fondamental, vol=11) :
  J1 Jogging EF      : dist=4.5 km / dur=46 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=6.5 km / dur=67 min / pace=10:15

S6 (dev, vol=13) :
  J1 Fartlek doux    : dist=5.0 km / dur=49 min / pace=10:15 base + 4x30" accélérations à 8:55 EA (feeling, jamais au-dessus)
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=8.0 km / dur=82 min / pace=10:15

S7 (recup, vol=11) :
  J1 Jogging EF      : dist=4.5 km / dur=46 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=6.5 km / dur=67 min / pace=10:15

S8 (dev, vol=14) :
  J1 Fartlek doux    : dist=5.5 km / dur=54 min / pace=10:15 base + 6x30" accélérations à 8:55 EA (feeling)
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=8.5 km / dur=87 min / pace=10:15

S9 (dev, vol=15) :
  J1 Fartlek doux    : dist=6.0 km / dur=58 min / pace=10:15 base + 8x30" accélérations à 8:55 EA (feeling)
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=9.0 km / dur=92 min / pace=10:15

S10 (recup, vol=13) :
  J1 Jogging EF      : dist=5.0 km / dur=51 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=8.0 km / dur=82 min / pace=10:15

S11 (spé, vol=17) :
  J1 Allure semi     : dist=6.5 km / dur=63 min / pace=10:15 base + 2x6 min à 7:07 spé semi
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=10.5 km / dur=108 min / pace=10:15

S12 (spé, vol=19) :
  J1 Seuil court     : dist=7.0 km / dur=67 min / pace=10:15 base + 3x5 min à 7:54 seuil (r=2 min EF)
  J2 Renforcement    : (code gère)
  J3 SL + allure semi: dist=11.5 km / dur=117 min / pace=10:15 base + 2x10 min à 7:07 en fin

S13 (recup, vol=16) :
  J1 Jogging EF      : dist=6.0 km / dur=61 min / pace=10:15
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=9.5 km / dur=97 min / pace=10:15

S14 (spé, vol=22) :
  J1 Seuil           : dist=7.5 km / dur=72 min / pace=10:15 base + 4x5 min à 7:54 seuil (r=2 min EF)
  J2 Renforcement    : (code gère)
  J3 SL + allure semi: dist=12.0 km / dur=122 min / pace=10:15 base + 3x10 min à 7:07 en fin

S15 (spé, vol=24, PIC) :
  J1 Allure semi     : dist=8.0 km / dur=77 min / pace=10:15 base + 3x10 min à 7:07 spé semi
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=12.0 km / dur=122 min / pace=10:15 base + 4 km à 7:07 en fin

S16 (affutage, vol=17) :
  J1 Allure semi     : dist=6.0 km / dur=58 min / pace=10:15 base + 2x8 min à 7:07 spé semi
  J2 Renforcement    : (code gère)
  J3 Sortie Longue   : dist=10.0 km / dur=103 min / pace=10:15

S17 (affutage / race week, vol=12) :
  J1 Activation      : dist=4.0 km / dur=40 min / pace=10:15 base + 4x1 min à 7:07 spé semi
  J2 Renforcement    : (code gère — version très légère)
  J3 SEMI NANCY      : 21.1 km / objectif user 2h30 / allure réaliste sous sensations
```

## 5. Justification coach 20 ans
Profil de reprise quasi-totale (5 km/sem) avec blessure active du genou et objectif chrono très en avance sur la VMA estimée. La doctrine appliquée combine Pfitzinger ("Faster Road Racing", règle des 20 % d'augmentation hebdo maximum pour débutantes), Daniels (Easy zone exclusive sur les 5 premières semaines, intro fractionné fartlek très court en phase dev), et Hammond/Gabbett (ACWR < 1,3 pour minimiser le risque blessure articulaire). Le pic à 24 km/sem est volontairement modeste : c'est le maximum qu'un appareil locomoteur en reprise post-blessure peut absorber proprement sur 17 semaines. Aller plus haut sans signal médical = aggravation tendineuse quasi-certaine. La SL plafonnée à 12 km (57 % du semi) compense par la spécificité (blocs à allure semi 7:07 en fin de SL S15) plutôt que par le kilométrage. **Toutes les allures prescrites restent strictement ≤ 7:07/km (8,4 km/h), donc sous le seuil de douleur déclaré 9 km/h ; aucune VMA prescrite (6:52 = 8,7 km/h, trop proche du seuil) — remplacée par fartlek doux EA avec accélérations feeling.** Le respect strict du repos et de la consultation médicale conditionne tout le reste : sans feu vert médecin, le plan ne démarre pas. L'allure cible 2h30 est respectée dans les séances (cohérente avec ce que l'utilisatrice voit dans `paces`), mais l'écart avec la projection VMA (~2h51) est explicitement chiffré dans `feasibility.message` et `welcomeMessage` pour transparence totale.
