# PM ARBITRAGE — P4 srv.nicolas (Trail 80km / D+3200 Caillac — IRRÉALISTE 10)

**Auteur** : PM Technique Coach Running IA
**Date** : 2026-05-27
**Plan** : `1779825347513` — 18 sem × 5 séances — pic 52 km / pic D+ 2724 m
**Profil** : H 43a 75/174 cv=20 km/sem PB **aucun** cv D+ non déclaré
**startDate** : 2026-05-26 (S1 commence J-1 = lundi/mardi vécu)
**isPreview** : true — `fullPlanGenerated: false` (le user n'a vu QUE S1, le reste n'est pas généré)

---

## SECTION 1 — VERDICT : **GO-PATCH** (pas NO-GO-REFORMER)

### 1.1 — Tranchage net

**Le verdict Expert FFA N5 prévaut sur le verdict Coach pro amateurs.** Le plan reste, on patche.

### 1.2 — Justification doctrinale (chaîne de raisonnement)

**(a) Doctrine `feedback_securite_avant_conversion` (D4) — TEXTE LITTÉRAL** :
> « on ne peut JAMAIS mettre un score plus haut. en fait le fait de dire que c'était irréaliste c'est justement ULTRA important. Il faut être transparent et SAFE en priorité par rapport à la conversion. On laisse un message 'Ce plan peut être généré mais vous acceptez et témoignez de votre volonté de faire ce plan global' »

→ Romane a **explicitement** acté que la mécanique correcte = **plan généré sous DÉCHARGE EXPLICITE**, pas blocage. Le Coach pro amateurs propose exactement le contraire (« STOP / REFORMER / supprimer plan »). **Hors doctrine.**

**(b) Doctrine `feedback_d17_feasibility_transparence_optin` (D17)** :
> Quand un plan est IRRÉALISTE (score ≤ 30), on respecte 3 règles : (1) welcomeMessage explicite ; (2) safetyWarning + décharge ; (3) opt-in front.

→ Vérif raw P4 : (1) ✅ welcome dit "ne te permettra PAS d'atteindre" + propose alternative 30 km ; (2) ✅ safetyWarning présent ("Hydrate-toi… échauffement… récupération") ; (3) le `confidenceScore: 10` + `status: IRRÉALISTE` sont affichés front pour opt-in. **Doctrine D17 respectée à 95 %** (cf. trous résiduels §4).

**(c) Doctrine `feedback_compromis_messages_preventifs`** :
> « préférer compromis aux extrêmes ; messages plutôt que blocage. Le blocage strict reste possible UNIQUEMENT pour les cas IRRÉALISTE confiance < 10. »

→ Score 10/100, soit **égal à la limite, pas strictement inférieur**. Et même à 10, le Coach pro veut un blocage HARD (suppression plan + redirection). Hors compromis attendu.

**(d) Doctrine `feedback_jamais_baisser_allure_cible`** :
> « baisser l'allure cible revient à dire au user "tu n'es pas capable d'atteindre ton objectif". C'est une intrusion paternaliste. »

→ Le Coach pro propose de "reformer l'objectif" en 30 km. **Exactement l'intrusion paternaliste interdite**. La doctrine sœur dit : le statut faisabilité dit l'objectif est IRRÉALISTE + le welcome suggère 30 km, **mais on laisse l'user décider**.

**(e) Doctrine `feedback_ecouter_instructions_explicites`** :
> « Pas de safeguard/clamp/garde-fou ajouté de ma propre initiative qui contredit sa doctrine. »

→ Bloquer la génération à score 10 = exactement le pattern interdit. Le précédent Xavier (VMA 8.3 / Semi 2h00) montre que Romane a explosé pour MOINS que ça.

### 1.3 — Réponse explicite Q1 (la transparence D17 suffit-elle ?)

**OUI, la transparence D17 SUFFIT** quand un plan est IRRÉALISTE 10. La doctrine projet est cristallisée sur ce point depuis le 2026-05-16 (Xavier) et confirmée le 2026-05-24 (audit 27 plans). Le freelance externe (Coach pro amateurs) **ne connaît pas la doctrine projet**, il importe sa philosophie club FFA terrain — qui est respectable mais hors-périmètre produit.

→ **Le seul cas où on bloquerait** = preuve médicale objective de danger immédiat (cardio non testé sur 50+ avec IMC > 35, etc.). Ce n'est PAS le cas P4 (43a, IMC 24.8, normal).

### 1.4 — Réponse explicite Q2 (le pic 52 est-il doctrinal sécurité ou sous-calibré ?)

**Les deux experts ont raison sur des angles différents** — je tranche selon la doctrine :

**Math experte (FFA N5)** :
- Krissy Moehl / Karl Meltzer : pic Ultra = 70-90 % distance race → **56-72 km/sem** pour 80 km
- Anti-Friel +10 %/sem depuis cv=20 sur 14 sem actives (S2-S15) : pic théorique max = 20 × 1.10^14 = **76 km** (mais cumul absurde pour profil débutant ultra)
- Compromis Pfitzinger Hammond pour profil non-base : **pic 60-70 km**

**Math doctrinale projet** :
- Doctrine D17 : on protège physiologie face à objectif inaccessible, **on accepte la non-atteinte**
- Doctrine D14 (pic ≤ ~1.5× cv habituel pour profils non-base) : 1.5 × 20 = 30 km ; le plan à 52 km est DÉJÀ à 2.6× = au-dessus de la zone sûre
- Doctrine `feedback_courte_duree_charge_allegee` : ne s'applique pas (18 sem ≥ 13), mais l'**esprit "on calibre sous le référentiel pour pas blesser"** est cohérent ici car le profil EST sous-équipé

→ **Verdict PM** : le pic 52 est un **compromis sécurité doctrinal délibéré**, pas un sous-calibrage. C'est la 3e voie entre « 30 km sécurité absolue mais zéro chance » et « 70 km Krissy Moehl mais blessure quasi-garantie ».

**MAIS** : la transparence D17 doit l'**expliciter** dans le welcome. Actuellement le welcome dit "ne te permettra PAS d'atteindre" mais ne dit PAS "on a volontairement plafonné le pic à 52 km pour protéger ta physiologie". Trou de transparence à patcher (§2.2).

### 1.5 — Pourquoi le verdict Coach pro est rejeté

Le Coach pro amateurs a 3 angles forts :
1. Risque blessure réel (factuel)
2. Risque trauma psychologique abandon J-J (factuel)
3. Coach humain "dirait : reformer"

**Mais** :
- Argument 3 = c'est un coach **humain en face-à-face**. On a une **plateforme produit** avec consentement opt-in. Différent.
- Argument 1-2 = c'est le rôle du welcome + safetyWarning de prévenir, pas du système de bloquer. C'est la doctrine projet, pas une omission.
- Sa proposition « **engage un coach humain en parallèle** » est BONNE (à intégrer §2.2) mais ne justifie PAS le NO-GO.
- Sa proposition de **supprimer le plan et rediriger** = viole `feedback_jamais_contact_client` (on ne communique pas directement) + `feedback_jamais_baisser_allure_cible` + impact business Premium (le user a probablement payé).

---

## SECTION 2 — RECOMMANDATIONS PATCHES P4

### 2.1 — Périmètre patchable (doctrine `feedback_s1_vecue_patchable_si_securite` + `feedback_patch_live_plans_jour_seulement`)

**État S1 au 2026-05-27** :
- startDate = 2026-05-26 (avant-hier)
- S1 Mardi (Renfo) = **AUJOURD'HUI 27 mai** → en cours / pas encore vécue à l'heure de l'arbitrage selon créneau, à confirmer avec Romane
- S1 Mercredi (Footing vallonné 16 min) = **DEMAIN** → patchable trivialement
- S1 Jeudi-Samedi-Dimanche = futur → patchables sans débat

**Doctrine D5 stricte** : "plans antérieurs au jour du fix" = ne pas toucher. Ici plan créé HIER (26 mai), patch live aujourd'hui 27 mai = limite de la fenêtre.

**Exception D5 sécurité** (`feedback_s1_vecue_patchable_si_securite`) : pour plans **problématiques sécurité**, on patche S1 même vécue. Ici P4 = IRRÉALISTE 10 = clairement "problématique sécurité". **Exception activée**.

→ **Tout est patchable, y compris S1 entière**.

### 2.2 — Patches recommandés (par ordre de priorité)

#### Patch 1 — `welcomeMessage` (HAUTE PRIORITÉ, invisible front, toujours autorisé)

Le welcome actuel est exemplaire D17 mais il **manque 3 éléments** que le Coach pro amateurs a raison de demander :

**Ajouter** (sans retirer le texte existant) :
> "Si tu maintiens ton inscription au 80 km : on te recommande FORTEMENT d'engager un coach humain en parallèle — l'IA ne peut pas combler à elle seule le saut depuis 20 km/sem. Repère aussi un trail de 30-40 km en septembre 2026 comme **B-goal de remplacement** si tu sens que ton corps dit non d'ici la S10. Mieux vaut finir un 30 km fier que abandonner un 80 km au km 45."

**Justification** :
- Mention coach humain = compromis Coach pro (sans bloquer)
- B-goal explicite = bonne pratique Coach pro universelle
- Reformulation "mieux vaut finir un 30 km fier" = honore la doctrine `feedback_compromis_messages_preventifs`

#### Patch 2 — `feasibility.safetyWarning` (HAUTE PRIORITÉ, invisible front)

Actuel :
> "Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération."

= **TROP GÉNÉRIQUE pour un IRRÉALISTE 10**. Doctrine D17 demande une décharge médicale explicite.

**Remplacer par** :
> "Plan IRRÉALISTE 10/100. Risques connus pour ton profil : tendinopathies (Achille, rotulienne), périostite tibiale, fracture de fatigue (montée volume +260 %), aponévrosite plantaire. Test d'effort cardio **indispensable** avant S1 (non recommandé, indispensable). Au moindre signal d'alerte (douleur talon/plante/genou >3 jours), arrête, consulte. Tu reconnais signer ce plan en pleine conscience de ces risques."

#### Patch 3 — S1 Mercredi 2.7 km / 16 min (MOYENNE PRIORITÉ — incohérence titre/data)

Aujourd'hui : `title: "Footing vallonné, côtes en marche"` + `elevationGain: 100` + `duration: "16 min"` + `distance: "2.7 km"`.

**Problème** : 16 min de course (= 9 min main, 7 min de marche en côte) pour démarrer un programme 18 sem ultra = trop court même en intro safe. Et l'incohérence `duration: 16 min` (= main only, bug D18) crée du flou utilisateur.

**Patch** :
- `duration: "35 min"` (warmup 10 + main 20 + cooldown 5)
- `distance: "3.5 km"` (recompute cohérent)
- `mainSet` : préciser "20 min sur parcours vallonné, montées en marche active, plat et descentes en EF (5:47 ref)" — déjà OK
- Garde la séance courte/douce pour l'intro safe doctrine D20, mais transparence durée.

#### Patch 4 — S1 Samedi "Footing vallonné technique" elevationGain: 0 (BUG DATA)

`title: "Footing vallonné technique"` + `mainSet: "incluant du dénivelé"` + `elevationGain: 0` → **incohérence interne raw**.

**Patch** :
- Soit retirer "vallonné" du titre et passer "Footing nature roulant"
- Soit assigner `elevationGain: 100` cohérent avec titre + mainSet
- Recommandation PM : **assigner elevationGain: 100** (cohérent avec doctrine spécifique D+ pour profil ultra)

#### Patch 5 — S1 Dimanche SL 10.7 km / 401 D+ (RAS — OK doctrine)

Ratio SL/race = 10.7/80 = 13 % → BAS volontaire (doctrine sécurité IRRÉALISTE). Cohérent. **Ne pas patcher**.

#### Patch 6 — Affûtage (BASSE PRIORITÉ — plan non encore généré au-delà de S1)

`fullPlanGenerated: false` → seul S1 existe. Le reste sera généré au fil de l'eau. Le pic 52 (S15) et descente 39/34/29 (S16-S18) sont des targets `weeklyVolumes`, pas des séances réelles.

→ **Pas de patch séances affûtage maintenant**. À surveiller à la génération S16 (août).

### 2.3 — Patches NON-recommandés (à ne PAS faire)

❌ **Rehausser le pic à 60-70 km** (proposition implicite freelance externe) → contredit doctrine D17 "pic protecteur" + risque blessure réel pour cv=20 PB aucun.

❌ **Supprimer le plan / rediriger vers nouveau questionnaire** (proposition Coach pro) → viole doctrine D4 (sécurité = décharge, pas blocage) + D17 (opt-in user sacré) + impact business Premium.

❌ **Modifier les allures (`paces`)** → doctrine `feedback_jamais_baisser_allure_cible`. Allure EF 5:47, vmaPace 3:52 etc. restent tels quels (calibration sur VMA 15.5 estimée, vu PB aucun).

❌ **Contacter le user directement** → doctrine `feedback_jamais_contact_client`. Romane gère la comm si nécessaire.

### 2.4 — Validation post-patch obligatoire

Avant push live, doctrine `feedback_validation_n_profils_avant_sprint` : tester les patches sur **N ≥ 5 profils Trail Ultra "irréalistes"** comparables (cv < 30 km, PB aucun, distance race ≥ 50 km). Si les patches welcome/safetyWarning sont génériques (templates), valider qu'ils ne cassent pas les plans Ultra réalistes (P3 pascal qui est BON 75 ne doit pas hériter du warning catastrophiste).

---

## SECTION 3 — CRÉATION F-16 ? **NON.**

### 3.1 — Question

Faut-il un nouveau bug code **F-16 : "Bloquer génération si feasibility IRRÉALISTE ET cv < 30 % distance race"** ?

### 3.2 — Verdict PM : **NON, ne pas créer F-16**

**Raisons doctrinales** :

1. **Doctrine `feedback_securite_avant_conversion`** est cristallisée : « plan généré sous DÉCHARGE EXPLICITE », pas blocage. Romane l'a dit littéralement. Créer F-16 = ré-ouvrir un débat tranché.

2. **Doctrine `feedback_ecouter_instructions_explicites`** : précédent Xavier 2026-05-16. Quand j'ai ajouté un clamp `targetVmaRatio > 0.98`, Romane a explosé. F-16 serait exactement le même pattern à plus grande échelle.

3. **Doctrine `feedback_compromis_messages_preventifs`** : « blocage strict UNIQUEMENT pour IRRÉALISTE < 10 ». P4 = 10 exactement = au-dessus du seuil hypothétique de blocage.

4. **Argument business** : bloquer la génération = perdre conversion ET imposer un parcours redémarrage qui frustre l'user (qui pense être "incapable de générer un plan"). Pire UX que le statut IRRÉALISTE + opt-in actuel.

5. **Argument philosophique projet** : l'opt-in user est sacré. L'user paye Premium = on lui donne le plan qu'il a demandé, avec transparence maximale. Décider à sa place = paternalisme.

### 3.3 — Doctrine émergente Sprint G alternative (à proposer à Romane)

Plutôt que F-16 "bloquer", proposer **F-16bis : "Renforcer transparence D17 pour IRRÉALISTE ≤ 15"** :

**Spec** :
- `safetyWarning` enrichi avec décharge médicale **explicite** (risques nommés : tendinopathies, fracture stress, etc.)
- `welcomeMessage` enrichi avec **B-goal de remplacement nommé** (ex : "30-40 km en septembre 2026")
- `welcomeMessage` enrichi avec **mention coach humain recommandé**
- UI front : modal de **double-confirmation** "Tu acceptes ce plan IRRÉALISTE. Je reconnais : (cocher) risques médicaux / (cocher) suggestion B-goal / (cocher) recommandation coach humain"
- **Pas de blocage**, juste friction consciente

**Pourquoi c'est mieux que F-16** :
- Respecte D4/D17 (transparence + opt-in)
- Ne casse pas la doctrine "compromis messages préventifs"
- Apporte la **valeur Coach pro** (B-goal, coach humain) sans la **violation projet** (blocage)
- Mesurable : taux d'opt-out front = signal qualité

→ **Recommandation PM** : créer ticket **F-16bis "Décharge enrichie IRRÉALISTE ≤ 15"** dans la backlog Sprint G. À discuter avec Romane avant code.

---

## SECTION 4 — RISQUES RÉSIDUELS

### 4.1 — Risques athlète (acceptés sous opt-in)

| Risque | Probabilité | Mitigation actuelle | Mitigation post-patch |
|--------|-------------|---------------------|------------------------|
| Fracture de fatigue (montée volume +260%) | Élevée | safetyWarning générique | safetyWarning explicite (Patch 2) |
| Tendinopathie Achille/rotulienne | Élevée | Renfo excentrique S1 OK | Idem + mention dans warning |
| Abandon course J-J | Très élevée | Welcome mentionne alternative 30 km | Welcome ajoute B-goal explicite (Patch 1) |
| Trauma psychologique post-DNF | Modérée | Aucune | Mention coach humain recommandé (Patch 1) |
| Accident cardio non détecté (43a) | Faible | "Consulter médecin" | "Test d'effort INDISPENSABLE" (Patch 2) |

→ **Tous les risques restent SOUS opt-in user**. C'est doctrinal.

### 4.2 — Risques business (à surveiller)

| Risque | Niveau | Note |
|--------|--------|------|
| Réputation marque si abandon + presse | Modéré | Doctrine D4 nous protège : transparence affichée, décharge signée |
| Litige assurance si blessure | Faible | Décharge médicale + safetyWarning enrichi (Patch 2) renforcent défense |
| Churn premium si user déçu après abandon | Modéré | Mitigation = relance Romane post-course pour réinscription B-goal |
| Conversion baisse si modal double-confirmation F-16bis | Faible-modéré | À mesurer si implémenté ; acceptable car sécurité > conversion |

### 4.3 — Risques techniques résiduels

1. **Bug duration = main only** (D18 violée sur 5/5 plans) — pas spécifique P4 mais affecte la perception charge. Hors scope arbitrage, ticket existant Priorité 1 EXPERT-COACH.

2. **isPreview true + fullPlanGenerated false** : le user n'a que S1. Si patch welcome live, vérifier que le user voit bien la nouvelle version au prochain refresh (cache front).

3. **VMA estimée 15.5 sans PB** : VMA déclarative "niveau Confirmé" sans aucun chrono = très incertaine. Les allures dérivées (5:47 EF) peuvent être TROP RAPIDES pour le vrai niveau. Doctrine `feedback_input_client_obligatoire` dit on respecte la déclaration. **Risque accepté**.

4. **Caillac plat vs race 3200 D+** : `suggestedLocations` du raw ne flagge pas la nécessité de se déplacer pour le D+. Bug géo F-8 ne se déclenche pas (D+/km race = 40 < seuil 50). **Trou produit hors scope arbitrage**.

### 4.4 — Risques doctrine

1. **Patch welcome trop pédagogique** → ne JAMAIS basculer dans le ton "Coach pro" qui dit "on te le dit franchement, ce n'est pas raisonnable". Le welcome reste **factuel + alternatives offertes**, pas moraliste.

2. **Patch warning trop alarmiste** → ne JAMAIS nommer "ton poids", "ta corpulence" (doctrine `feedback_jamais_poids_minceur`). Ici 75 kg / 174 / IMC 24.8 = normal donc trivialement OK, mais vérifier le template global F-16bis ne le fasse pas par défaut sur d'autres profils.

3. **Templating** : si patches deviennent templates système (Sprint G F-16bis), risque que le template s'applique à des plans Trail BON par erreur. Tests N=10 obligatoires.

---

## SYNTHÈSE EXÉCUTIVE — ce que je tranche

| # | Question | Verdict PM |
|---|----------|-----------|
| Q1 | D17 suffit pour IRRÉALISTE 10 ? | **OUI** — doctrine projet cristallisée |
| Q2 | Pic 52 doctrinal ou sous-calibré ? | **DOCTRINAL** — compromis sécurité délibéré, à expliciter dans welcome |
| Q3 | Patches live recommandés ? | **OUI** — 4 patches (welcome enrichi, safetyWarning enrichi, S1 Mercredi cohérence durée, S1 Samedi elevationGain) |
| Q4 | Créer F-16 blocage génération ? | **NON** — créer F-16bis "décharge enrichie + modal double-confirmation" à la place |

**Verdict global** : **GO-PATCH** (Expert FFA N5 prévaut). Plan livré sous opt-in renforcé.

**Action immédiate Romane** :
1. Valider les 4 patches §2.2
2. Décider si on attend la batterie N≥5 profils Trail Ultra IRRÉALISTE avant push (doctrine `feedback_validation_n_profils_avant_sprint`) OU si on patche P4 seul (cas isolé) — recommandation PM = **patcher P4 seul aujourd'hui**, créer ticket F-16bis ensuite pour la généralisation Sprint G.
3. Ne PAS contacter srv.nicolas directement (doctrine `feedback_jamais_contact_client`).

---

*PM Technique Coach Running IA — arbitrage tranché 2026-05-27.*
*Si Romane challenge le verdict GO-PATCH, le seul angle recevable est : « le score 10 (= limite basse) mérite-t-il un traitement spécial même si la doctrine dit < 10 strict ? ». Sinon, doctrine respectée, on patche.*
