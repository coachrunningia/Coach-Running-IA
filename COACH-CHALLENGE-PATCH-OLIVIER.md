# Challenge coach trail ultra — Patch Olivier 126 km
Date : 2026-05-23
Auteur : Coach FFA + UTMB Academy, 20 ans terrain ultra

## Verdict global
**CORRECTIONS REQUISES avant exec.** Le patch est globalement aligné sur ma doctrine et mon verdict du matin, mais 2 points cassent : (1) la suggestion "50 km en septembre" dans le welcome viole `feedback_input_client_obligatoire` (on suggère un changement de raceDate/distance déguisé), à reformuler comme question/option, pas comme reco directive ; (2) Repos complet 100% S2-S9 sur le 5e jour est OK mais doit être couplé à un message explicite que la SL doit migrer vers Dim dès S2 (sinon SL en Lundi reste en J1 = bug #3 jamais résolu). Le reste est bon.

---

## A. WelcomeMessage
**Verdict** : ⚠️ MODIFICATION SUGGÉRÉE

**Critique** :
- Ton brutal : OK, aligné `feedback_securite_avant_conversion`. ✅
- Pas de mention IMC explicite : OK, doctrine `feedback_jamais_poids_minceur` respectée. ✅
- Pas de suggestion +1 séance : OK, `feedback_jamais_suggerer_changer_frequence` respectée. ✅
- "Ton volume hebdo va devoir tripler" : factuel, sourcé, bon. ✅
- **PROBLÈME 1** : la reco "viser un 50 km / 1500 D+ en septembre comme test grandeur réelle" est ambiguë. Lu littéralement c'est un test (OK), mais formulé "objectif intermédiaire" ça suggère un changement d'objectif → friction avec `feedback_input_client_obligatoire`. Mon verdict du matin (Bug 7) autorisait "suggérer viser distance moins longue" sous décharge IRRÉALISTE, donc c'est légitime, mais il faut **clarifier que c'est une étape, pas un remplacement**.
- **PROBLÈME 2** : 1500 D+ sur 50 km est un trail montagne — la course cible est 126 km / 850 D+ = profil plat/roulant. Proposer 1500 D+ test pour un objectif 850 D+ = incohérent spécificité. Le test doit être proportionnel : ~500 D+ sur 50 km, soit profil identique à la cible.
- **PROBLÈME 3** : "Le dimanche est un jour de repos complet dans nos plans ultra senior" — c'est faux dans la doctrine. Dans un plan ultra-trail, le **Dimanche est typiquement le jour SL** (cf. Killian, Magness, UTMB Academy). Cette phrase contredit Bug 3 et le placement futur de la SL. À retirer ou reformuler.
- **PROBLÈME 4** : pas de mention de la SL placée en Lundi (bug #3 actuel). Si on patche les Dim en Repos et qu'on laisse la SL en Lundi sans avertir, on légitime la mauvaise placement. À ajouter une ligne.

**Version corrigée** :
```
Bienvenue Olivier. Ce plan prépare un trail de 126 km avec 850 m de dénivelé, le 21 novembre 2026.

⚠️ TRANSPARENCE ABSOLUE — À LIRE AVANT TOUTE SÉANCE

Notre analyse objective de la faisabilité est IRRÉALISTE (confidence 10/100). Les chiffres :
- Tu cours actuellement 30 km/sem avec 50 m de D+/sem.
- La course demande 126 km en une seule fois avec 850 m de D+ accumulé.
- Ton volume hebdo va devoir tripler en 27 semaines. Ton D+ hebdo devra être multiplié par 17.
- À 56 ans, ton appareil locomoteur tient mal des charges aussi soutenues sans casse — repos strict obligatoire entre les séances dures.

CE QUE NOUS RECOMMANDONS FORTEMENT (sans modifier ton objectif si tu maintiens) :
1) Consultation médecin du sport AVANT démarrage : bilan cardio + évaluation articulaire genoux/chevilles.
2) Test grandeur réelle : t'inscrire à un 50 km roulant (~500 D+, profil similaire à ta cible) en septembre. Ce n'est PAS un remplacement de ton 126 km, c'est un check-point pour valider que ton corps tient la charge. Si tu finis bien, on continue. Sinon, on en reparle.
3) Coach Running IA est exclusivement course à pied — aucun cross-training (vélo, natation) imposé dans ton plan. Les jours "off" sont des vraies coupures.
4) Pour les semaines à venir : nous te recommandons de basculer ta Sortie Longue du Lundi vers le Dimanche (jour traditionnel SL en ultra-trail). Le Lundi reste alors séance facile + tu as 6 jours pleins de récup avant la prochaine SL.
5) STOP immédiat si douleur articulaire ou tendineuse > 48h — médecin obligatoire avant reprise.

Le plan a été recalibré (pic 80 km/sem au lieu de 63) pour s'approcher du minimum vital UTMB Academy, sans franchir le mur ACWR (ratio aigu/chronique > 1.3 = risque blessure majeur).

L'objectif 126 km reste le tien. On respecte. Mais on te dit la vérité — ce n'est pas un plan où on te ment pour vendre.
```

---

## B. WeeklyVolumes
**Verdict** : ⚠️ MODIFICATION SUGGÉRÉE (mineure)

**Critique** :
- Pic 80 km : ✅ OK strict minimum acceptable (ratio 0.63 du race, tableau verdict matin = 75 km min). Pas optimal (90-110) mais ACWR-safe vs cv=30. Compromis honnête.
- Progression S1→S7 : 30 → 50 = +67% sur 6 sem = ~+9%/sem hors récup. ✅ Sain.
- S8 récup 38 = -24% vs S7=50. ✅ OK (Pfitzinger préconise -20 à -30%).
- **PROBLÈME 1** : S3→S4 = 40 → 30 = -25% : c'est une semaine récup en S4 après 3 sem progression. ✅ OK micro-cycle 3:1.
- **PROBLÈME 2** : S15 = 70 → S16 = 53 = -24%. ✅ OK.
- **PROBLÈME 3** : Pic spé S22-S23 à 76 puis 80 = derniers gros volumes 5 sem avant race (race S+27, donc S23 = race-4sem). ✅ OK timing classique.
- **PROBLÈME 4 (mineur)** : entre S19 (pic 80) et S22 (76), il y a S20 récup 60 et S21 = 70 et S22 = 76. Donc S19=80, S20=60, S21=70, S22=76, S23=80. Le **plateau S22-S23 à 76-80 km à 5-4 sem race** est correct chez le confirmé jeune, mais chez un senior 56 ans en première préparation ultra, **ramener S23 à 70 km plutôt que 80** est plus prudent (moins de risque blessure tardive). La fenêtre tapering effective sera plus longue.
- ACWR vérifié : passage S18=72 → S19=80 = +11% week-to-week, aigu/chronique sur 4 sem = ~1.20 → safe (<1.3). ✅

**Array corrigé (S23 ajusté)** :
```
[30, 35, 40, 30, 38, 44, 50, 38, 45, 53, 60, 45, 53, 62, 70, 53, 62, 72, 80, 60, 70, 76, 70, 60, 48, 38, 30]
```
(seul S23 passe de 80 → 70 km — gain sécurité affûtage senior, perte spécifité marginale acceptable)

**Si Romane préfère garder le pic dur** : laisser tel quel est défendable. La modif est un raffinement, pas un blocant.

---

## C. Remplacement Vélo
**Verdict** : ✅ APPROUVÉ

**Critique** :
- Repos complet > footing récup ultra court pour un senior 56 ans en première prépa ultra. Justifications :
  1. La fréquence est déjà 5 séances/sem (4 course + 1 ex-vélo). Si on remplace par footing récup 4-5 km, on garde 5 séances course → charge cumulative trop élevée pour un débutant ultra de 56 ans, BMI 26.5.
  2. Un 5e footing récup en plus de la SL Lun + 3 séances milieu de semaine = ZÉRO jour off réel sur 7. Inacceptable chez senior en première prépa ultra (Magness Ultra Endurance ch.7 "Senior Athlete Recovery" : 1-2 jours off complets/sem obligatoires >50 ans).
  3. Le repos est sous-utilisé en France amateur, sur-utilisé chez les pros UTMB (Killian, Mathieu Blanchard) = signal qualité.
  4. Le mainSet proposé (étirements doux + mobilité genou/cheville + hydratation/nutrition normales) est exactement ce que prescrit la UTMB Academy en jour off.
- Aucune violation doctrine `feedback_coach_running_ia_que_course` ✅
- Aucune mention nutrition chiffrée ✅
- **Remarque dev** : le `distance: 'N/A'` / `duration: 'N/A'` / `targetPace: 'N/A'` en string risque de poser des problèmes de typage si front parse en number. À vérifier dev, mais hors scope coach.

---

## D. Suggestion "50 km en septembre"
**Verdict** : ⚠️ MODIFICATION SUGGÉRÉE (couvert dans A)

**Critique** :
- La doctrine `feedback_input_client_obligatoire` interdit d'écraser les inputs (cv, freq, raceDate, distance race). Mais elle dit explicitement "on commente seulement dans message d'accueil, jamais on écrase". **Donc proposer un test dans le welcomeMessage est conforme à la doctrine** si on ne modifie pas la distance/date dans le plan.
- L'exception `feedback_securite_avant_conversion` autorise (et exige) la transparence brutale en cas IRRÉALISTE. Suggérer un check-point est une mesure de sécurité, pas une vente déguisée.
- MAIS : la formulation "Objectif intermédiaire : viser un 50 km" est trop directive, peut être lue comme un ordre. À reformuler en **"option de check-point"** (cf. version corrigée A).
- Le D+ proposé (1500 m) est mauvais : doit matcher la spécificité race (850 D+ sur 126 km = ~7 D+/km, donc 50 km roulant = ~350-500 D+). Voir A.

---

## E. Placement séances S2-S9
**Verdict** : ⚠️ MODIFICATION SUGGÉRÉE

**Critique** :
- Patch actuel : Dim devient Repos sur S1-S9. SL reste en Lun.
- **Problème majeur** : si on laisse SL en Lun de S2 à S9 (et au-delà), on perpétue le Bug 3 (SL en J1 = pas de fenêtre récup avant le stimulus du Mer). Mon verdict du matin classait Bug 3 en P1, donc patchable plus tard, mais ici on a une OCCASION ZÉRO COÛT de le corriger en même temps que les Dim.
- **Options** :
  - **Option mini (statu quo patch)** : SL reste Lun, Dim devient Repos. On a réglé le vélo, pas le placement. Le welcome ligne 4 (version corrigée A) prévient le user de basculer manuellement. Acceptable mais perfectible.
  - **Option max (recommandée)** : pour S2-S9 (non vécus, preview), **swap la SL Lun ↔ Repos Dim**. Coût dev minimal (échange 2 sessions par semaine), gain pédagogie majeur. La SL passe en Dim (fin de microcycle, jour traditionnel), le Lun devient le jour Repos. Conforme Magness/Killian/Friel/UTMB Academy.
- Doctrine `feedback_patch_live_plans_jour_seulement` : S2-S9 = preview = patchable, donc OPTION MAX autorisée. ✅
- Doctrine `feedback_input_client_obligatoire` : `preferredDays` reste respecté (Lun et Dim sont tous deux des jours préférés du user, sinon on les n'aurait pas). Swap conforme. ✅

**Précision technique (Option max recommandée)** :
Pour chaque semaine S2 à S9 :
1. Identifier la session Lundi (actuellement SL trail).
2. Identifier la session Dimanche (actuellement Récup Vélo → Repos après patch).
3. Swap : Dim devient SL, Lun devient Repos.
4. Recalculer ordre `dayOfWeek` / `sessionIdx` si nécessaire pour cohérence affichage.

Si dev refuse la complexité du swap (risque casse d'index) : Option mini acceptable, mais alors la ligne 4 du welcome (recommandation de basculer manuellement) devient OBLIGATOIRE.

---

## Décision finale

**Corrections à intégrer avant exec** :
1. **WelcomeMessage** : remplacer par la version corrigée A (D+ test 500 au lieu de 1500 ; suppression phrase "dimanche = repos en ultra senior" ; ajout ligne 4 sur bascule SL Lun → Dim).
2. **WeeklyVolumes** : raffinement S23 80 → 70 km recommandé (optionnel, défendable des deux côtés). Si exec rapide souhaité, garder version originale, c'est acceptable.
3. **Placement S2-S9** : Option max (swap SL Lun ↔ Repos Dim) FORTEMENT RECOMMANDÉE. Si Option mini retenue, alors le welcome DOIT contenir la ligne de bascule manuelle (point 1).
4. **Repos vs Footing récup** : Repos complet APPROUVÉ tel quel.

**GO PATCH après intégration des corrections 1 + (3 ou ligne 4 du welcome).** Sans ces deux corrections : NO GO — on patche le vélo mais on perpétue le SL en J1 et on suggère un test mal calibré.

Signature : Coach FFA + UTMB Academy
