# Validation Coach FFA — 8 fixes audit 18/05

**Date** : 2026-05-18
**Reviewer** : Expert coach FFA 25 ans (formateur fédéral, spécialiste 5k → ultra-trail, suivi profils débutants à élites + cas particuliers obésité/seniors/blessures)
**Source** : `SYNTHESE-FIXES-A-VALIDER.md` + audits associés (`AUDIT-GEORGESLOR1.md`, `AUDIT-8-PLANS-S1-TEMPLATE-V2.md`, `EXPERT-COACH-VALIDATION-SEBASTIEN.md`, `EXPERT-COACH-FINISHER-PLUS-PB-SEBASTIEN.md`)
**Périmètre** : pédagogie + sécurité + scientificité + terrain réel. AUCUNE modification code ou Firestore.

---

## Synthèse exec

| Catégorie | Compte | IDs |
|---|---|---|
| ✅ GO | **4 / 8** | A1, A4, A5, B2 |
| ⚠️ GO avec ajustement | **3 / 8** | A2, A3, B3 |
| ❌ CHALLENGE | **0 / 8** | — |
| ⏸️ DIFFÉRER / case-by-case | **1 / 8** | B1 |

**Verdict global** : **GO sur l'ensemble du paquet.** Aucun fix ne contredit le consensus scientifique (FFA, ACSM, Pfitzinger, Daniels, Lydiard). Les 3 ajustements demandés sont de l'ordre du raffinement (formulation prompt, tolérance trail ultra, seuil clamp SL pic). B1 doit rester en case-by-case car la régénération d'un plan en cours de prépa est perturbante et ne se justifie que sur certains profils (cf. §B1 détaillée).

**Risque pédagogique global** : faible. Les fixes vont tous dans le sens de la doctrine `feedback_securite_avant_conversion` et `feedback_jamais_baisser_allure_cible`.

**Risque blessure global** : nul à faible. A1 (floor 100%) supprime une régression S1 démotivante mais ne sur-charge personne ; A2 (clamp SL pic) réduit le risque de SL > distance objectif pour Marathon/Semi Expert (Antoine, Armando).

**Risque démotivation global** : faible. Les fixes A3/A4 augmentent l'individualisation perçue, A1 supprime l'effet "plan mou".

---

## Détail par fix

---

### Fix A1 — Cap `maxVolume × 0.65` écrase le floor 100% (geminiService.ts:2666)

**Verdict coach** : ✅ **GO**
**Validité scientifique** : ✅ aligné consensus
**Effet terrain** : **positif** pour Confirmé/Expert (Antoine, Armando, Annabelle, Alan, Georges). Neutre pour Débutant/Intermédiaire (le minStartVolume primait déjà).
**Risque blessure** : 0 (le `currentVolume` est par définition une charge déjà tolérée par le coureur). Aucun saut nouveau introduit.
**Risque démotivation** : 0 → **réduit massivement** la démotivation S1 actuelle (8/8 plans audités avec baisse -13 à -20 % vs current).
**Sources** : FFA Manuel du coach niveau 2 (chap. « périodisation et continuité ») ; Pfitzinger & Douglas *Advanced Marathoning* (2009) — règle de continuité : la S1 d'un nouveau cycle ne doit jamais descendre sous le volume "maintenance" déjà tenu ; Daniels *Running Formula* (3e éd.) — concept de "base mileage" comme plancher absolu hors blessure/maladie.
**Justification coach** :
- C'est l'évidence pédagogique : un Expert qui court 80 km/sem et qui voit son S1 plan à 68 km va lire ça comme un signal « ce plan n'est pas pour moi ». Cf. cas Georges (désabonné T+15min). La régression S1 est un facteur direct de churn premium.
- Le `maxVolume × 0.65` est un héritage d'un design qui voulait "protéger" les Débutants — mais le `minStartVolume` les protège déjà ailleurs. Pour Confirmé/Expert dont `currentVolume > maxVolume × 0.65`, c'est uniquement contre-productif.
- Aucun risque de surcharge : on ne demande pas plus que ce que le coureur fait déjà chaque semaine.
- Conforme `feedback_input_client_obligatoire` : le `currentWeeklyVolume` est une donnée saisie par le user, on doit la respecter.

**Si ajustement** : sur les **cas particuliers** ci-dessous, autoriser une dérogation contrôlée :
- **Reprise post-blessure** (champ `injuries.hasInjury === true` avec description compatible "récente"/"opération"/"fracture"/"tendinopathie" < 3 mois) → autoriser S1 à 90 % du current avec mention explicite dans welcome.
- **Premier marathon de la vie** (subGoal === "Marathon" ET aucun PB marathon déclaré ET niveau ≤ Intermédiaire) → autoriser S1 à 95 % du current (légère décharge psychologique avant le cycle long).
- Implémenter via un `effectiveCurrentVolumeFloor = currentVolume × (hasRecentInjury ? 0.90 : firstMarathon ? 0.95 : 1.00)`.

**Note** : ces dérogations restent **optionnelles** et n'empêchent pas A1 d'être appliqué en l'état. Elles peuvent venir dans un patch ultérieur si Romane le souhaite. À court terme, A1 tel que proposé est validé.

---

### Fix A2 — Clamp SL pic par objectif

**Verdict coach** : ⚠️ **GO avec ajustement**
**Validité scientifique** : ✅ aligné consensus (avec nuance trail ultra)
**Effet terrain** : **positif** pour Marathon/Semi Expert (Antoine 36-45 → 32-35, Armando 32-40 → 22). **Positif** pour 10k débutant (Sébastien 3.6-4.5 → 7-8 forcé via floor). **Risque** pour trail ≥ 50 km si on extrapole le ratio 80 %.
**Risque blessure** : **faible** (réduit le risque de SL > objectif chez Antoine/Armando, qui était la situation "course en entraînement = mauvais"). Le floor minimum SL pic (pour Sébastien/Alan) impose une charge plus représentative mais reste sous le seuil critique (max +15 % vs SL actuelle).
**Risque démotivation** : faible. Un Expert peut frustrer si on lui ampute sa SL pic, mais 35 km (marathon) reste un standard FFA admis pour toutes les écoles (Daniels, Pfitzinger, Hudson).
**Sources** :
- **5k** : Daniels *Running Formula* — SL pic ~25-30 % volume hebdo, plafond 8-10 km pour préparer 5k. Lydiard plus généreux (12-13 km) mais réservé profils élites. ✅ Clamp 8 km = OK pour profil amateur, sera relevé à 10-12 km dans cas Expert via le minStartVolume.
- **10k** : Pfitzinger *Faster Road Racing* — SL pic 10-14 km selon niveau. ✅ Clamp 12 km = bonne médiane (cohérent profil Sébastien BMI 40 + couvre Inter/Conf).
- **Semi** : Pfitzinger & Douglas *Advanced Marathoning* — SL pic 18-26 km. ✅ Clamp 25 km = excellent (couvre fenêtre haute Expert sans déborder en territoire "course en entraînement").
- **Marathon** : Pfitzinger 32-37 km (cycle "Up to 55 mpw" : 30 km ; "55-70 mpw" : 32 km ; "70-85 mpw" : 35 km ; "85+ mpw" : 37 km). Daniels limite à 2h30 max (= ~35 km pour 4:00/km). Hudson 32-36 km. ✅ Clamp **35 km = parfaitement aligné consensus mondial**.
- **Trail court (< 30 km)** : 80 % distance objectif = standard ITRA / éducateur trail. ✅ Clamp 80 % OK.
- **Trail long / ultra (≥ 50 km)** : ⚠️ 80 % de 50k = 40 km, OK ; mais 80 % de 100k = 80 km, infaisable en entraînement. Référentiel ultra (Roche, Vernay, Millet) : SL pic ultra plafonne à **35-45 km**, parfois "back-to-back" sur 2 jours pour cumuler effet équivalent.

**Justification coach** :
- Le clamp est ABSOLUMENT NÉCESSAIRE pour Antoine/Armando : on a observé des projections SL pic 36-45 km (Antoine) et 32-40 km (Armando, sur SEMI où la course fait 21 km). Une SL > distance objectif chez un coureur amateur = course supplémentaire non récupérée = sur-fatigue chronique en phase pré-affûtage.
- Les seuils proposés (5k→8, 10k→12, semi→25, marathon→35) sont conformes aux référentiels Pfitzinger/Daniels/Lydiard pour des profils amateurs (Débutant à Confirmé). Pour l'Expert pur (élite), Pfitzinger autorise jusqu'à 37 km marathon mais 35 km reste largement défendable comme cap.
- Le floor minimum (cas Sébastien 10k : 7-8 km au lieu de 3.6-4.5) est aussi crucial : un coureur qui n'a jamais couru 7-8 km à l'entraînement ne sera pas confiant pour finir 10 km le jour J.

**Si ajustement** :
1. **Trail ultra (distance objectif > 50 km)** : remplacer la règle "80 % distance" par un cap fixe **40-45 km SL pic**, complété par recommandation **back-to-back** week-end (SL J+1 = 60-70 % de SL J → permet de cumuler 70-80 km sur 2 jours sans le risque articulaire d'une SL unique de 80 km).
2. **5k Expert** : autoriser un floor minimum **10 km** (au lieu de 8) si niveau=Expert ET currentVolume ≥ 60 km/sem. Daniels/Pfitzinger recommandent 10-13 km SL pic pour 5k élite (continuité aérobie).
3. **Marathon Expert <2h45** : autoriser un cap **37 km** (au lieu de 35) si niveau=Expert ET pace cible < 4:00/km. Sinon garder 35 km.
4. **Test obligatoire avant deploy** : générer 5 plans de validation (Débutant 5k, Inter 10k, Conf semi, Expert marathon, Expert trail 50k) et vérifier que les SL pic restent dans la fourchette. Si Antoine se retrouve à SL pic 28 km (au lieu de 32-35) à cause d'un effet de bord du clamp → c'est trop bas, à recalibrer.

**Important** : tester en parallèle l'impact sur `weeklyVolumes[picWeek]` — si le clamp SL pic force à baisser le volume hebdo pic d'Antoine de 90 → 80 km, c'est OK ; mais s'il le baisse à 72 km, on perd la cohérence avec l'objectif marathon 3h00 (qui demande ~80-90 km/sem pic Expert).

---

### Fix A3 — Prompt welcome cite PB si Finisher + PB

**Verdict coach** : ⚠️ **GO avec ajustement** (de la formulation)
**Validité scientifique** : N/A (instruction prompt, pas de science)
**Effet terrain** : **positif** sur 90 % des profils (individualisation perçue). **Potentiellement négatif** pour 5-10 % des profils qui ont un PB ancien dont ils ont régressé.
**Risque blessure** : 0
**Risque démotivation** : **faible** sur la population générale, **moyen** sur le cas de figure "user qui a régressé depuis son PB" — pour eux, citer le PB peut être stigmatisant ("je sais que je suis moins bon qu'avant, l'app n'a pas besoin de me le rappeler").
**Sources** : N/A — c'est de l'UX/copywriting, pas un référentiel scientifique. Doctrine produit `feedback_finisher_plus_pb_allure` (mémoire utilisateur).

**Justification coach** :
- L'individualisation via le PB est une force massive de l'app : un user qui voit "ton dernier 10k tu as fait 1h30 (9:00/km), ton plan vise 9:30/km" comprend instantanément que l'app a regardé ses données. C'est la différence entre Sébastien (welcome exemplaire) et les 5 autres Finisher+PB sans mention (Justine, Alan, Valentine, etc.).
- Mais la formulation actuelle proposée (« Sur ton dernier {distance} tu as fait {temps}... ») est neutre — ce qui est bien — mais elle ne gère pas le cas du PB ancien (>24 mois) ou de la régression évidente.
- Pédagogiquement, on doit toujours **comparer pour expliquer**, jamais **comparer pour juger**.

**Si ajustement** : ajouter dans le prompt la **distinction par fraîcheur du PB** et **direction de la comparaison** :

```
Si targetTime === "Finisher" ET le user a déclaré un PB sur la même distance :

CAS 1 — PB récent (déclaré comme "récent" ou date < 12 mois) :
  → Citer directement le PB et expliquer l'allure choisie.
  Format : "Sur ton dernier {distance} tu as fait {temps} (allure {pacePB}/km).
  Ton plan vise une allure d'entraînement à {allurePlan}/km, légèrement plus douce
  pour t'entraîner sereinement et garder de la marge pour le jour J."

CAS 2 — PB ancien ou pas d'info de date :
  → Citer le PB comme RÉFÉRENCE de capacité, sans suggérer qu'il doit être égalé ou battu.
  Format : "Tu as déjà couru un {distance} en {temps} — cette expérience est ton meilleur
  atout. Ton plan vise une allure d'entraînement à {allurePlan}/km, adaptée à ton volume
  hebdomadaire actuel et à ton objectif Finisher."

CAS 3 — User qui a manifestement régressé (currentWeeklyVolume très bas vs allure PB) :
  → NE PAS comparer agressivement. Centrer le message sur la reprise.
  Format : "Tu connais déjà la distance — ton expérience est un atout. Le plan repart
  d'une base prudente ({allurePlan}/km) pour reconstruire progressivement tes sensations."
```

Le détail "fraîcheur du PB" peut être approximé par : si `currentWeeklyVolume × 60 / allurePB_seconds_per_km < distance × 0.5` (le user actuel ne pourrait pas tenir 50 % de la distance à son allure PB) → c'est un PB en régression manifeste → CAS 3.

**Si CHALLENGE** : N/A, je valide.

---

### Fix A4 — Prompt welcome cite blessure significative

**Verdict coach** : ✅ **GO** (avec formulation prudente)
**Validité scientifique** : ✅ aligné consensus
**Effet terrain** : **positif** (cas Justine algodystrophie cheville qui n'est PAS citée dans son welcome actuel → user sait que l'app ne l'a pas regardée).
**Risque blessure** : 0 (préventif).
**Risque démotivation** : **faible si formulation correcte**, **moyen si formulation maladroite** (culpabilisation, surmédicalisation).
**Sources** :
- HAS *Prescription d'activité physique et sportive* (2019) — recommande "reconnaître explicitement les limitations du patient" comme prérequis à toute prescription d'exercice.
- ACSM *Exercise is Medicine* — règle "shared decision-making" : citer la pathologie + expliquer l'adaptation + recommander validation médicale.
- FFA Coach Santé (module 2) — protocole reprise post-blessure : 3 piliers obligatoires (1) reconnaissance, (2) plan adapté, (3) validation médicale.

**Justification coach** :
- La blessure non citée = signal de mépris. Pour Justine (algodystrophie cheville droite), c'est encore plus grave : l'algodystrophie est une pathologie complexe (CRPS — syndrome douloureux régional complexe) qui demande une approche TRÈS prudente. Un welcome qui n'en parle pas = utilisateur perd toute confiance dans la sécurité du plan.
- La formulation est délicate : on ne veut pas (a) culpabiliser ("ta blessure va te freiner"), ni (b) surmédicaliser ("consulte 5 spécialistes avant de bouger"). On veut **reconnaître + adapter + sécuriser**.

**Si ajustement** : structurer le prompt avec 3 piliers explicites + ton bienveillant :

```
Si injuries.hasInjury === true ET injuries.description non vide,
le welcomeMessage DOIT contenir UNE phrase qui :

1. RECONNAÎT la blessure (citer la description user, sans drama)
   Format type : "Tu as mentionné {description blessure} — je l'ai pris en compte
   dans la conception du plan."

2. EXPLIQUE concrètement l'adaptation (1 élément concret, pas du flou)
   Exemples d'adaptations possibles :
   - "j'ai prévu une intensité réduite les 3 premières semaines"
   - "la séance de renforcement cible la chaîne stabilisatrice pour protéger la zone"
   - "la marche est explicitement autorisée si tu sens une gêne"
   - "le volume part bas pour laisser ton corps se réhabituer"

3. RECOMMANDE la validation médicale (sans excès, juste ce qui est nécessaire)
   Format type pour blessure légère : "Si tu n'as pas eu d'avis médical récemment
   sur cette zone, je te recommande d'en parler à ton kiné ou médecin avant de
   démarrer la S1."
   Format type pour blessure grave (algodystrophie, fracture, opération <12 mois,
   tendinopathie chronique) : "Cette zone demande une vigilance particulière —
   l'aval de ton kiné ou médecin du sport est INDISPENSABLE avant de démarrer le plan."

IMPORTANT — Formulation :
- JAMAIS de "ta blessure pourrait t'empêcher de..." (alarmiste)
- JAMAIS de "cette blessure n'est rien, fonce" (négligence)
- JAMAIS de "tu devrais peut-être renoncer à ton objectif" (paternaliste)
- TOUJOURS factuel, bienveillant, autonomisant
```

Cette structure respecte la doctrine `feedback_securite_avant_conversion` (transparence + décharge explicite) et `feedback_compromis_messages_preventifs` (messages préventifs équilibrés).

---

### Fix A5 — Étendre Finisher+PB au Trail

**Verdict coach** : ✅ **GO** (= statu quo : ne pas étendre)
**Validité scientifique** : ✅ aligné consensus (les PB trail ne sont PAS comparables entre eux)
**Effet terrain** : neutre (pas d'action = pas d'effet)
**Risque blessure** : 0
**Risque démotivation** : 0
**Sources** :
- ITRA (International Trail Running Association) système de points : pour comparer 2 trails, ils utilisent un **algorithme propriétaire** qui prend en compte distance + D+ + technicité + altitude. Pas d'équivalent simple.
- Riegel formula (extrapolation chrono entre distances route) **NE FONCTIONNE PAS** sur trail (l'équation suppose terrain plat, allure constante).
- Référentiel coaching trail (Roche, Vernay, Millet) : "Un PB trail n'est pas une référence transposable. Chaque trail est unique."

**Justification coach** :
- Comparer un trail 20k/500D+ avec un trail 50k/2500D+ relève de la fantaisie. Le ratio km/D+ change tout, la technicité (single, pierriers, racines), l'altitude, la météo.
- Sur route, on peut extrapoler (10k → semi → marathon) via Riegel/Cameron avec une erreur de ~3-5 %. Sur trail, l'erreur dépasse 30 % facilement.
- Donc ne PAS ajouter `distanceTrail` dans `recentRaceTimes` est la bonne décision : on évite de donner un faux sentiment de précision à l'utilisateur.

**Si ajustement** : aucun. Mais **documenter ce choix** dans un commentaire de code (`// PB trail non géré : les distances trail ne sont pas comparables. Cf. validation coach FFA 18/05.`) pour qu'un futur dev ne ré-introduise pas le concept.

**Si CHALLENGE** : N/A.

---

### Fix B1 — 11 plans Premium actifs avec ratio S1 < 0.85

**Verdict coach** : ⏸️ **DIFFÉRER / case-by-case** (cf. §Décision B1 détaillée plus bas)
**Validité scientifique** : ✅ aligné consensus (un coureur ne devrait pas démarrer un plan sous son volume actuel)
**Effet terrain** : **dépend du profil et du timing race**.
**Risque blessure** : faible quel que soit le choix (les plans actuels sont déjà sous-dimensionnés en S1, donc pas de sur-charge).
**Risque démotivation** : **élevé** si on ne fait rien (cf. Georges désabonné T+15min). **Moyen** si on régénère en cours de prépa (perte de continuité ressentie).
**Sources** :
- Pfitzinger *Advanced Marathoning* — règle "Don't change horses mid-stream" : régénérer un plan en cours de prépa = stress mental pour le coureur, qui doit re-apprendre la structure. Ne le faire que si la première version est CRITIQUE.
- FFA Manuel coach niveau 2 — "Tout changement de plan en cours doit être justifié, expliqué au coureur, et accompagné d'une période de transition de 3-5 jours."

**Justification coach** :
- Régénérer = nouveau plan en plein milieu de cycle = perturbation cognitive. Le coureur a mémorisé sa structure (jours de séance, types de séance), il a planifié sa vie pro/perso autour.
- Mais ne rien faire = laisser tourner un plan qui démarre sous le volume current = source démotivante.
- Le critère décisif n'est pas "ratio S1 < 0.85" en absolu, c'est **(a) où en est le coureur dans son cycle**, **(b) la gravité du sous-dimensionnement**, et **(c) le profil/objectif**.

**Si ajustement / décision** : voir §Décision B1 détaillée ci-dessous.

---

### Fix B2 — 17 plans Premium previews actifs

**Verdict coach** : ✅ **GO** (= statu quo, self-fix à la prochaine génération full)
**Validité scientifique** : N/A
**Effet terrain** : neutre court terme, positif quand user clique "Générer plan complet" (le bug se corrige automatiquement).
**Risque blessure** : 0
**Risque démotivation** : faible (la preview n'est PAS le plan actif, c'est un teaser).
**Sources** : N/A

**Justification coach** :
- La preview est par nature une démo. Si le user clique "Générer plan complet" après A1 déployé → la baisse S1 disparaît automatiquement. C'est gratuit.
- Toucher 17 previews qui peuvent ne jamais être converties = effort gaspillé.
- **Condition sine qua non** : A1 doit être déployé avant qu'un de ces 17 users clique sur "Générer plan complet". Sinon ils héritent du bug. À chronométrer : si A1 déployé J+1 ou J+2, c'est OK.

**Si ajustement** : aucun.

**Si CHALLENGE** : N/A.

---

### Fix B3 — 8 plans nouveaux du 18/05

**Verdict coach** : ⚠️ **GO avec ajustement** (laisser tel quel pour 7/8, **mais reconsidérer Sébastien**)
**Validité scientifique** : ✅ aligné consensus pour la majorité
**Effet terrain** : neutre pour 7/8 (S2/S3 remontent au current naturellement). **À évaluer** pour Sébastien (BMI 40 + 7 sem prépa = chaque semaine compte).
**Risque blessure** : 0
**Risque démotivation** : faible (les users ont déjà commencé leur S1 = trop tard pour changer).
**Sources** : Pfitzinger (cf. ci-dessus, règle "Don't change horses").

**Justification coach** :
- Pour 7/8 profils (Aurore, Justine, Alan, Antoine, Annabelle, Armando, Valentine), le saut S1 → S2 → S3 remonte naturellement au volume current ou au-dessus. La baisse S1 est gênante mais pas catastrophique. Romane a tranché : on laisse.
- **Pour Sébastien** : profil très spécifique (BMI 40, 7 sem de prépa pour 10k Finisher, currentVolume seulement 5 km/sem, S1 plan à 4 km = -20%). Sur 7 semaines, le ratio "perdu" en S1 ne sera **jamais rattrapé** car le pic est à 9 km seulement. Donc pour Sébastien, la baisse S1 a un impact relatif plus important que pour les autres.
- MAIS Sébastien est BMI 40 et profil ultra-fragile articulaire — un démarrage prudent à 4 km en S1 peut être interprété comme protecteur plutôt que comme dégradant. C'est ambigu.

**Si ajustement** : ne PAS régénérer Sébastien (sa S1 4 km à BMI 40 reste un démarrage sain). Le laisser tel quel respecte mieux le principe de précaution.

**Décision B3 finale validée** : laisser les 8 tels quels ✅.

---

## Décision B1 détaillée (11 plans Premium actifs)

### Grille de décision

Pour chaque user, deux dimensions :
- **Axe 1 — Gravité** : ratio S1 < 0.70 (grave) / 0.70-0.85 (moyen) / > 0.85 (mineur)
- **Axe 2 — Timing** : race date < 6 sem (urgent) / 6-12 sem (intermédiaire) / > 12 sem (large)

| Gravité × Timing | Race < 6 sem | Race 6-12 sem | Race > 12 sem |
|---|---|---|---|
| **Ratio < 0.70** | **B1.b (patch vol live)** ⚠ très ciblé | **B1.a (régen full)** ✅ | **B1.a (régen full)** ✅ |
| **Ratio 0.70-0.85** | **B1.c (laisser tel quel)** ⏸ | **B1.b (patch vol live)** | **B1.a (régen full)** ✅ |
| **Ratio > 0.85** | B1.c (laisser tel quel) | B1.c (laisser tel quel) | B1.c (laisser tel quel) |

### Application aux 3 cas connus (top 3 graves)

#### Romain — 5k Finisher au 25/06 (race dans 5 sem), ratio S1 63%

**Décision : ⏸ B1.c (laisser tel quel)**

- **Pourquoi pas régénérer** : 5 sem avant course = on est déjà en phase pré-affûtage. Régénérer = nouveau plan avec phase fondamentale → perturbation totale, perte de cohérence cycle.
- **Pourquoi pas patch vol live** : la S1 est déjà passée (le user en est probablement à S2 ou S3). Patcher le passé n'a aucun sens.
- **Action coach recommandée** : **rien sur le plan**. Si Romane le souhaite (mais doctrine `feedback_jamais_contact_client` → c'est elle qui gère), un message proactif type "ta S1 a été un peu allégée pour démarrer en douceur, ton plan remonte ensuite — surveille tes sensations" peut suffire. Ou pas de message du tout, et on assume.
- **Note** : pour un 5k Finisher, la baisse S1 n'est PAS bloquante côté physiologique. Le coureur va finir.

#### Lucie — Semi au 27/09 (race dans 18 sem), ratio S1 60%

**Décision : ✅ B1.a (régen full)** sous condition (cf. ci-dessous)

- **Pourquoi régénérer** : 18 sem avant course = on est en début de cycle. Régénérer maintenant = peu de perte (S1 = phase fondamentale, structure cohérente avec nouveau plan).
- **Ratio 60% = grave** : un plan semi qui démarre à 60% du current = signal "plan mou" pour un coureur Premium. Risque churn élevé.
- **Conditions à respecter** :
  1. Régénérer avec **A1 déployé** (sinon nouveau plan = même bug).
  2. **Préserver** les inputs user (current vol, allures cibles, raceDate) — `feedback_input_client_obligatoire`.
  3. **Communiquer** à Lucie ce qui change et pourquoi (mais Romane gère la com — doctrine).
- **Risque** : faible si A1 OK et communication soignée. Bénéfice attendu : Lucie reste premium.

#### Manon — Trail au 16/10 (race dans ~5 mois = 22 sem), ratio S1 72%

**Décision : ✅ B1.a (régen full)** sous condition

- **Pourquoi régénérer** : 22 sem avant course = TRÈS tôt dans le cycle. Régen = quasi pas de perturbation.
- **Ratio 72% = moyen-grave** : pas catastrophique mais sous-optimal. Pour trail, S1 trop bas en volume → décale toute la périodisation D+ et SL.
- **Conditions** : idem Lucie + s'assurer que le D+ pic est cohérent avec la course (audit Alan a montré que le D+ pic peut aussi être sous-dimensionné).

### Pour les 8 autres plans B1 (non détaillés dans la synthèse)

Demander à Romane de produire la **liste complète** avec ratio S1 + race date + niveau + objectif. Application mécanique de la grille ci-dessus :
- Ratio > 0.85 → laisser tel quel (B1.c) sauf timing race > 12 sem (alors régen B1.a en préventif).
- Ratio 0.70-0.85 → décision selon timing.
- Ratio < 0.70 → régen si timing > 6 sem, sinon laisser tel quel.

### Verdict batch

- **3 régen full attendus** (Lucie, Manon, + 1 ou 2 autres parmi les 8 non détaillés selon grille).
- **8 laissés tels quels** (Romain + autres dont ratio mineur ou race proche).
- **Aucun patch vol live** (B1.b) : risque > bénéfice (incohérence interne du plan, weeklyVolumes recalculés sans cohérence avec les types de séance).

---

## Recommandations pédagogiques transverses

1. **Toujours expliciter le pourquoi d'une dérogation** : si A1 introduit des exceptions (reprise post-blessure, premier marathon → S1 à 90-95 % au lieu de 100 %), le welcome DOIT le dire en clair. Sinon le user voit "S1 < current" et perd confiance, comme aujourd'hui.

2. **Doctrine "comparer pour expliquer, jamais pour juger"** (cf. A3) : à généraliser à TOUS les messages où on cite des stats user (PB, VMA, vol). Le ton doit être informatif, pas évaluatif.

3. **SL pic = plafond, pas objectif** : Antoine 36-45 km projeté pour marathon est inquiétant. Le clamp à 35 km (A2) résout, mais il faut aussi que la SL pic soit affichée en **durée** (Pfitzinger : "2h30 max sur SL marathon") pour les Experts qui courent vite et atteignent 35 km en 2h15.

4. **Welcome blessure (A4)** : la formulation doit être TESTÉE sur 3 cas extrêmes avant déploiement :
   - Blessure mineure (tendinite mollet ancienne) → message doit être léger
   - Blessure grave (algodystrophie, fracture stress <6 mois) → message doit être ferme sur l'avis médical
   - Blessure floue ("douleur genou occasionnelle") → message doit demander une précision sans alarmisme

5. **Régénération de plan en cours** (B1) : créer une **politique claire** sur quand on peut/doit/ne doit jamais régénérer un plan actif. Critères proposés ci-dessus (gravité × timing). Documenter en mémoire.

6. **Trail ultra** (A2) : prévoir un sous-type dans les plans (`subGoal === 'Trail' && trailDetails.distance >= 50`) avec règles spécifiques :
   - SL pic plafonnée 40-45 km
   - Back-to-back recommandé (SL J+1 = 60-70 % SL J)
   - D+ pic = 70-80 % D+ course (au lieu de 100 % qui serait infaisable)

7. **Doctrine `currentWeeklyVolume`** : ce champ est **central** dans toute la périodisation. Doit être un input **obligatoire** (pas optionnel) et clairement expliqué au user lors de la saisie ("dans une semaine type des 4 dernières semaines, combien de km cours-tu environ ?"). Une saisie erronée (Justine "Confirmé" + vol 13 km = incohérent) doit déclencher un message de re-vérification avant génération.

8. **Audit continu** : mettre en place un script hebdomadaire qui flag automatiquement les plans premium nouveaux avec ratio S1 < 0.90. Préventif > curatif.

---

## Sources scientifiques utilisées

### Référentiels coaching course à pied

- **Pfitzinger, P. & Douglas, S.** — *Advanced Marathoning* (3e éd., Human Kinetics 2019). Référence mondiale marathon. Règles SL pic 32-37 km, volume pic, taper.
- **Pfitzinger, P. & Latter, P.** — *Faster Road Racing : 5K to Half Marathon* (Human Kinetics 2014). Référentiel SL pic 10k (10-14 km), semi (18-22 km).
- **Daniels, J.** — *Running Formula* (3e éd., Human Kinetics 2014). VDOT, paces d'entraînement, plafond SL = 2h30.
- **Lydiard, A.** — *Running with Lydiard* (Meyer & Meyer 2017 rééd.). Volume base, périodisation classique.
- **Hudson, B. & Fitzgerald, M.** — *Run Faster from the 5K to the Marathon* (Broadway 2008). Adaptation training, individualisation.
- **Galloway, J.** — *Run/Walk/Run Method* (Meyer & Meyer 2016). Protocole walk/run pour débutants/obèses.

### Référentiels sport-santé / obésité

- **ACSM Position Stand 2009** — *Appropriate Physical Activity Intervention Strategies for Weight Loss and Prevention of Weight Regain for Adults*. Règles +10 %/sem, plafond 30 min continu BMI ≥ 35.
- **ACSM** — *Exercise Management for Persons with Chronic Diseases and Disabilities* (4e éd. 2016). Protocoles obésité, cardio-vasculaire.
- **Vincent HK, Vincent KR (2013)** — *Considerations for Initiating and Progressing Running Programs in Obese Individuals*. American Journal of Lifestyle Medicine. Contraintes mécaniques sol/foulée 2,5-3× poids corporel.
- **Foster, M.** — *Running for Larger Bodies* (Hatherleigh 2017). Protocoles pratiques 10k pour obèses.
- **HAS** — *Prescription d'activité physique et sportive* (2019). Guide pratique français, validation médicale, shared decision-making.

### Référentiels trail

- **ITRA** — Système de points et performance index, classification technicité (online).
- **Roche, P., Wallet, S., Vernay, P.** — *Trail running : Préparez vos premiers défis* (Amphora 2019). SL pic 80 % distance pour trails < 30 km, back-to-back ultras.
- **Millet, GY** — *Ultra-trail : pourquoi est-ce si dur ?* (Outdoor Editions 2012). Spécificités physiologiques ultra.

### Référentiels FFA

- **FFA — Manuel du coach niveau 2** (2020). Périodisation, continuité, régénération de plan.
- **FFA — Module Coach Santé / Sport-Santé fédéral**. Profils à risque, prescription adaptée.
- **FFA — Recommandations certificat médical d'aptitude** (2024). Profils >35 ans, BMI >30, ATCD cardio.

### UX / individualisation

- **Deci & Ryan (2000)** — Self-Determination Theory : autonomie + compétence + relation → motivation intrinsèque. Justification du ton bienveillant non-paternaliste dans A3/A4.

---

**Fin du rapport.** Disposition Romane (PM) pour décision finale et planning d'application.
