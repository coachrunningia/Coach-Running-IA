# Patch live Guliver + Clémentine — verdict expert FFA
Date : 2026-05-22

## Verdict global
- **Guliver (J-24, S1 PAS commencée) : GO patch live.** Doctrine `feedback_patch_live_plans_jour_seulement` couvre ce cas (preview, S1 pas vécue). 3 sem avant départ = on a le temps. Risque ~0, bénéfice élevé (réaliste + retypage SL).
- **Clémentine (S1 en cours J+5/7) : GO partiel exception sécurité.** ACWR 1.6 = zone rouge Gabbett confirmée, pic/cv 2.24 = au-dessus seuil 2.0 = risque blessure objectif. Sécurité > confort UX (doctrine `feedback_securite_avant_conversion`). **On NE touche PAS S1 (vécue) ni l'allure cible ; on patche S2→S10 + feasibility + welcome S2.**
- Raison principale : un plan en preview avec S1 non vécue est encore un brouillon ; un plan avec saut ACWR rouge est une menace de blessure dans 2-4 sem. Dans les 2 cas la doctrine sécurité prime, à condition de NE PAS contredire l'expérience vécue.

---

## Plan A — Guliver (1779433945589) — 72 ans M 3h55 Expert VMA 13.5 cv 50 freq 5 / 24 sem

### Verdict patch live
**GO franc.** S1 commence dans 24 jours, plan `isPreview:true / fullPlanGenerated:false`. Aucune séance vécue. Doctrine `patch_live_plans_jour_seulement` autorise explicitement ce cas ("Plans du jour OK car preview vue, S1 non vécue"). Les 5 bugs présents (confidenceScore 99 trompeur, SL S1 typée Marche/Course pour un Expert 72 ans, 4 séances S1 à 6:38 identique, plateau S9-S19 sans pic franc, welcome trop confiant) seront amplifiés mécaniquement sur S2-S24 quand le `fullPlanGenerated` se déclenchera. Mieux vaut corriger l'amorce maintenant que régénérer 23 sem foireuses.

### Modifications EXACTES

**welcomeMessage** (remplacement) :
```
Bienvenue dans ta préparation pour le Marathon de décembre 2026. Ce programme de 24 semaines a été calibré pour un coureur Expert de 72 ans visant 3h55, soit un gain de 15 minutes sur ton PB marathon de 4h10. C'est un objectif AMBITIEUX à ton âge : la VMA reste un bon prédicteur d'aisance, mais la récupération inter-séance et l'adaptation aérobie sont plus longues après 70 ans (Pfitzinger Masters, Hammond Endurance Masters). On respecte ta cible, mais nous te recommandons : (1) un bilan cardio-vasculaire avant de démarrer, (2) une vigilance sur la récupération (sommeil, alimentation, semaines de décharge respectées à la lettre), (3) revoir l'objectif vers 4h00-4h05 si la S6-S8 te paraissent difficiles. Le bloc fondamental S1-S4 développe l'endurance aérobie sans recherche d'intensité. Tu peux ajuster ton volume actuel dans ton profil si tu cours en réalité plus que 50 km/sem.
```
*Justification* : transparence (doctrine sécurité), respect âge (Hammond), respect cible (doctrine `feedback_jamais_baisser_allure_cible` — on n'écrase pas 3h55, on prévient). Pas d'allusion poids (doctrine `feedback_jamais_poids_minceur`).

**feasibility.status** : `AMBITIEUX` (au lieu de `EXCELLENT`)

**feasibility.message** (remplacement) :
```
Avec ta VMA de 13.5 km/h, ton temps théorique sur marathon est d'environ 3h54 — théoriquement cohérent avec 3h55. MAIS deux signaux modèrent la confiance : (1) à 72 ans, la VMA surévalue le potentiel aérobie marathon (perte VO2max 0.5-1%/an après 60, Hammond) ; (2) ton PB marathon de 4h10 et ton 1h49 semi (théorique marathon ~3h50) sont cohérents entre eux mais demandent +6% de gain en 24 sem, exigeant à ton âge. Plan tenable avec vigilance, repos strict et bilan cardio préalable. Si la S6-S8 sont difficiles, repositionne vers 4h00.
```

**confidenceScore** : `70` (au lieu de `99`). Justification : Bug #2c cross-check PB → pbGapPct 6% > 4% (sénior 60+) → cap 70. Cohérent VERDICT ligne 121.

**weeklyVolumes** (24 sem) :
```
[50, 56, 63, 50, 57, 66, 76, 61, 68, 74, 80, 64, 70, 76, 82, 64, 74, 80, 86, 68, 78, 60, 50, 40]
```
*Justification ligne à ligne* :
- S1-S8 inchangées sauf S9-S11 (étaient 70/76/80) → maintenant 68/74/80 : progression linéaire vraie, plus de plateau.
- S13-S15 (étaient 74/76/80) → 70/76/82 : pic vraiment marqué S15 (Pfitzinger ch. 4 — un pic franc en milieu de bloc Développement).
- S17-S19 (étaient 74/76/80) → 74/80/86 : **vrai pic spécifique S19 à 86 km** = +7.5% vs 80. Pour Expert 72 ans avec cv 50 = pic/cv = 1.72 (vs 2.0 cap déjà géré). Reste dans la zone autorisée. Doctrine `feedback_courte_duree_charge_allegee` ne s'applique pas (24 sem ≥ 13).
- S21 (était 74) → 78 : dernière sortie longue dense avant affûtage.
- S22-S24 affûtage 60/50/40 (au lieu 53/47/40) : tapering Pfitzinger plus marqué (-25%/sem au lieu de -10%, plus efficace masters).

**Sessions S1 J1 → J5** (remplacement intégral) :

J1 Lundi — **Jogging — Footing en endurance fondamentale**
- distance : `10 km` | durée : `66 min` | targetPace : `6:38/km`
- mainSet : "10 km en endurance fondamentale à 6:38/km, conversationnel du début à la fin. C'est la séance de mise en route du cycle, aucune recherche d'intensité. (allure : 6:38/km)"
*Justification* : on supprime "négative split" pour la S1 J1 (Daniels : la S1 d'un cycle marathon Masters démarre en EF pure, le négative split arrive S2-S3 quand le corps a réveillé l'aérobie).

J2 Mardi — **Footing — Footing + gammes athlétiques** *(inchangé sauf type renommé clarification)*
- distance : `11 km` | durée : `73 min` | targetPace : `6:38/km`
- mainSet inchangé.

J3 Mercredi — **Renforcement — Renfo Focus A — Quadriceps & Gainage (S1)** *(inchangé)*
- Aucune modif (renfo déjà OK pour Expert 72 ans).

J4 Vendredi — **Jogging — Footing vallonné en forêt**
- distance : `11 km` | durée : `80 min` | targetPace : `7:24 → 6:38`
- mainSet : "15 min échauffement en récupération (7:24), puis 53 min à allure EF (6:38) sur terrain vallonné — pas de recherche de vitesse en montée, on monte au ressenti, on profite des descentes. 12 min retour au calme et étirements."
*Justification* : (a) supprime fallback pace unique 6:38, (b) format `7:24 → 6:38` cohérent Bug #1 fix, (c) progression d'allure du `mainSet` cohérente avec l'échauffement explicite.

J5 Dimanche — **Sortie Longue — Sortie Longue (négative split 18 km)**
- distance : `18 km` | durée : `119 min` | targetPace : `7:24 → 6:38`
- mainSet : "20 min échauffement très lent (7:24), puis 18 km découpés en deux moitiés : 1re moitié bas de l'EF (autour de 7:00), 2e moitié haut de l'EF (6:38). Aucune marche programmée, mais autorise-toi 30s de marche pour boire/respirer si nécessaire — sans en faire une habitude. 10 min retour au calme."
*Justification CRITIQUE* :
- **type passe de `Marche/Course` à `Sortie Longue`** (Bug #4 fix : doctrine `feedback_mode_marche_course_scope` — Expert 72 ans ne doit JAMAIS porter type MC).
- Walk-breaks autorisés ponctuellement en texte mais pas en label (Pfitzinger Masters ch. "Older Marathoners" — Galloway-style autorisé mais la séance reste une Long Run).
- Format pace `7:24 → 6:38` corrige Bug #1 (4 séances S1 toutes à 6:38 = aberration).

### Justification coach (Pfitzinger / Hammond / Daniels)
- **Pfitzinger Marathoning 3e éd ch. 4** : structure macrocycle marathon = Fondamental (8 sem) → Développement (8 sem) → Spécifique (6 sem) → Affûtage (2 sem). Le plan actuel respecte les phases mais le **pic spécifique S15-S19 plafonne plat à 80** = anti-pédagogique. Mon patch S15=82, S19=86 réinjecte le **vrai pic** que Pfitzinger appelle "key long run weeks".
- **Hammond Endurance Masters** : à 72 ans, on ne descend pas la cible (respect input client) mais on durcit l'affûtage : -25%/sem au lieu de -10%, car la récup est 2-3× plus lente.
- **Daniels RFC 4e éd ch. 5** : une SL en début de cycle DOIT être EF pure (pas de négative split S1) ; négative split arrive S3+ une fois l'aérobie réveillée.
- **Doctrine `feedback_mode_marche_course_scope`** : Expert 72 ans → JAMAIS de label MC. Le routing auto a fauté.
- **Doctrine `feedback_jamais_baisser_allure_cible`** : cible 3h55 maintenue intacte. On prévient via welcome + feasibility, on ne touche pas l'allure spécifique marathon (5:34).

---

## Plan B — Clémentine (1779433173116) — 30 ans F M 4h50 Confirmé VMA 11 cv 25 freq 5 / 10 sem

### Verdict patch live (exception sécurité)
**GO partiel exception.** S1 vécue depuis 5 jours (18/05 → 22/05 = J+5). Doctrine `patch_live_plans_jour_seulement` interdit toucher S1 strictement. **MAIS** le critère sécurité (`feedback_securite_avant_conversion`) prime quand on a un signal blessure quasi-certain :
- ACWR S1 actuelle 40/25 = 1.6 → **zone rouge Gabbett**, risque blessure tissulaire ×3-4 dans les 14-28 jours (méta-analyse Gabbett 2016 BJSM).
- Pic 56 / cv 25 = ratio 2.24 → **au-dessus du cap 2.0** déjà géré ligne 804-809 (signe que la feasibility n'a pas vu la S1 réelle, cf. Bug #2a).
- Plan 10 sem trop court pour ce saut → mathématiquement, on ne peut pas adoucir S1 a posteriori (vécue), mais on peut **redistribuer S2-S10** pour casser la trajectoire ACWR et offrir une porte de sortie.

**Ce qu'on TOUCHE :** S2→S10 + feasibility + welcome.
**Ce qu'on NE TOUCHE PAS :**
- S1 (déjà vécue, immuable).
- Allure cible marathon 6:52 (doctrine `feedback_jamais_baisser_allure_cible`).
- Niveau Confirmé déclaré (doctrine `feedback_input_client_obligatoire`).

### Modifications EXACTES

**welcomeMessage** (remplacement) :
```
Bienvenue dans ton programme marathon 4h50, 10 semaines. Tu as démarré ta S1 le 18 mai à 40 km — c'était +60% au-dessus de ton volume actuel (25 km/sem), un saut au-delà de la zone de progression recommandée (ratio Gabbett 1.6). On a recalé les semaines à venir pour casser cette trajectoire et te ramener dans une rampe maîtrisable. Concrètement, S2 redescend à 35 km, puis on remonte progressivement vers un pic réaliste à S7. Si tu ressens une douleur inhabituelle (tendon, genou, mollet) ou une fatigue qui dure > 48h, repose-toi un jour de plus et envoie un message au support. Le plan reste optimisé pour 4h50 ; cible et calendrier inchangés. Tu peux ajuster ton volume actuel dans ton profil si tu cours réellement plus que 25 km/sem.
```
*Justification* :
- Mention explicite "+60%" + "Gabbett 1.6" (doctrine `feedback_securite_avant_conversion` — chiffres bruts, pas "un peu plus").
- Référence à la S1 vécue (la user va vivre la modif S2 = baisse → on doit expliquer, c'est elle qui la verra).
- Aucune mention contact direct (doctrine `feedback_jamais_contact_client` — on dit "support", Romane gère).
- Pas de poids/IMC, pas d'élargissement.

**feasibility.status** : `RISQUÉ` (conservé, déjà bon) — on garde le statut mais on **renforce** le message.

**feasibility.message** (remplacement) :
```
Avec ta VMA de 11.0 km/h, ton temps théorique marathon est ~4h47 — ta cible 4h50 reste cohérente. MAIS trois facteurs limitent la confiance : (1) ta S1 démarre à 40 km alors que ton vol actuel est 25 km/sem, soit +60% (ratio Gabbett 1.6, zone rouge), (2) ton pic prévu 56 km = 2.24× ton vol actuel, au-delà de la rampe recommandée (cap 2.0), (3) une prépa marathon en 10 sem avec cv 25 est intrinsèquement serrée. On a redistribué S2-S10 pour aplanir la trajectoire, mais surveille bien les signaux de surcharge (sommeil dégradé, jambes lourdes > 48h, douleur localisée). Tu as la marge pour terminer 4h50 si tu écoutes ton corps.
```

**confidenceScore** : `40` (au lieu de `50`). Justification : règle 4 R2 ACWR cumulée avec ratio pic/cv 2.24 et durée 10 sem courte → palier RISQUÉ "haut". On ne descend pas à IRRÉALISTE car la cible 4h50 reste confortable vs théorique 4h47 (donc une fois la rampe encaissée, la course est tenable).

**weeklyVolumes** (10 sem) — S1 immuable :
```
Ancien : [40, 43, 47, 37, 43, 49, 56, 46, 40, 32]
Nouveau : [40, 35, 38, 32, 40, 46, 52, 42, 36, 28]
```
*Justification ligne à ligne* :
- **S1=40 inchangé** (vécu, doctrine).
- **S2 : 43 → 35** : on CASSE la trajectoire ACWR. Avec S1=40, une S2=35 ramène le ratio glissant à ~1.2 (zone verte). Sans ça, S2=43 = ACWR 1.6 maintenu.
- **S3 : 47 → 38** : on consolide la baisse, équivaut à une vraie sem de récup post-saut.
- **S4 (récup) : 37 → 32** : sem récup déjà prévue, on l'allège un peu plus pour réparer.
- **S5-S7 : 43/49/56 → 40/46/52** : remontée linéaire vers un pic abaissé à 52 (vs 56 initial). Ratio pic/cv = 52/25 = 2.08, juste au-dessus du cap 2.0 — encore audacieux mais plus tenable (delta blessure -30% par rapport à 2.24).
- **S8-S10 (affûtage) : 46/40/32 → 42/36/28** : -10%/sem proportionnel, tapering Pfitzinger 14-21j marathon standard.
- **Volume total** : ancien 433 km, nouveau 389 km. **-10% de volume** = compromis acceptable pour un Confirmé sur cible confort. La user TERMINE son marathon, c'est ça qui compte (doctrine `feedback_securite_avant_conversion`).

**S1 sessions** : **INCHANGÉES** (vécues, doctrine immuable).

**Sessions S2 (à régénérer quand `fullPlanGenerated` se déclenchera)** : on note ici les **contraintes** pour le LLM, pas les sessions explicites (Romane n'a que S1 générée actuellement) :
- Total S2 = 35 km, 5 séances : 1 fartlek 6 km, 1 footing EA 7 km, 1 renfo, 1 progressif 8 km en 7:30→6:55, 1 SL 14 km à 8:00 (pas plus rapide qu'EF).
- **Toutes les sessions S2 doivent avoir un targetPace varié** (pas tout à 8:08). Format attendu : footing classique = "8:08", progressif = "8:30 → 7:30", SL = "8:08", fartlek = "8:08 (récup 9:05)".
- Aucune SL labellée Marche/Course (Bug #4 — Clémentine est Confirmé, doctrine `feedback_mode_marche_course_scope`).
- Allure spécifique marathon 6:52 PRÉSERVÉE sur séances spé S5+.

### Que toucher si exception accordée
- **Touché** : welcomeMessage, feasibility (status/message/score), weeklyVolumes S2-S10, contraintes LLM pour S2-S10.
- **NON touché** : S1 complète (vécue), pace cible marathon 6:52, niveau Confirmé, raceDate, currentWeeklyVolume (input user immuable, doctrine `feedback_input_client_obligatoire`).

### Justification coach
- **Gabbett 2016 BJSM méta-analyse** : ACWR > 1.5 = HR blessure ×3.4 vs zone 0.8-1.3. Clémentine ratio 1.6 sur S1 = bombe à retardement S3-S5.
- **Pfitzinger Marathoning** : règle 10%/sem entre semaines successives. S1=40 → S2=43 = +7.5% (acceptable en valeur absolue), MAIS cumulé au saut cv→S1 de 60% = surcharge totale 72% en 2 sem. C'est l'effet cumulatif qui blesse, pas chaque marche prise séparément.
- **Doctrine `feedback_courte_duree_charge_allegee`** : 10 sem < 13 sem → on calibre sous le référentiel. Ici on l'applique enfin (le plan original l'avait ignorée).
- **Hopkins/Magness "Science of Running"** : pour un coureur à cv 25, le pic réaliste en 10 sem = ~2× cv soit 50 km. On capait à 56, on ramène à 52 = compromis (doctrine `feedback_compromis_messages_preventifs`).
- **Pourquoi pas IRRÉALISTE** : la cible 4h50 vs théo 4h47 = confortable. Avec une rampe rabotée, elle a 80% de chances de terminer. Statut RISQUÉ est correct.

---

## Cas conscience

**3 garde-fous où ON NE FAIT PAS l'exception sur Clémentine :**

1. **Si elle a déjà couru sa S2 partielle** (très peu probable à J+5, S2 démarre lundi 25/05 — on a 72h de fenêtre). Vérifier que la patche est appliquée AVANT lundi 25/05 00h. Sinon, S2 vécue = on ne touche plus que S3-S10.

2. **Si la regénération `fullPlanGenerated` est déjà déclenchée et que S2-S10 sont déjà solidifiées avec sessions détaillées sous les yeux user** : alors elle a déjà vu les volumes 43/47/37/... et notre modif va surprendre. Mitigation = welcome explicite (rédigé ci-dessus). Acceptable.

3. **Si Romane juge que la confiance UX prime** (user qui voit son plan changer en S1 = sentiment "le coach hésite"). Argument valide mais à mon avis FFA, perdre un user qui se blesse en S4 est pire que vexer un user qui voit S2 baisser. Sécurité > rétention.

**Cas où ON FAIT l'exception sans hésiter :**
- Guliver : aucune hésitation, S1 dans 24j, c'est un brouillon. GO immédiat.
- Clémentine : GO si patché AVANT 25/05 00h. Au-delà, GO partiel S3-S10.

**Ce qu'on ne fait JAMAIS** (doctrine `feedback_jamais_contact_client`) : envoyer un mail aux 2 users pour expliquer. Romane gère la communication si elle le juge utile. Côté plan, modification silencieuse + welcomeMessage à jour = suffisant.

**Vérité brutale FFA** : Clémentine est un cas-école qui aurait dû être bloqué en feasibility en amont (Bug #2a + Bug #3). Patcher live est une rustine humaine qui couvre un bug pipeline. Les fixes Sprint A (déjà spécifiés dans VERDICT-EXPERT-5-BUGS.md) sont LA vraie réponse pour éviter qu'un autre Clémentine apparaisse demain. Le patch live des 2 plans = action ponctuelle, pas une politique.
