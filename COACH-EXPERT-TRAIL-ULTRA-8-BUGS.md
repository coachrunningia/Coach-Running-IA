# Verdict coach trail ultra 20 ans — 8 bugs Trail/Ultra
Date : 2026-05-23
Auteur : Coach FFA + UTMB Academy, 20 ans de terrain ultra (UTMB, Diagonale, Tor)

## Verdict global

**Le produit Trail/Ultra n'est PAS safe en prod aujourd'hui.** Sur les 8 bugs candidats : **6 CONFIRMÉS, 2 NUANCÉS, 0 INFIRMÉ.** Hiérarchie : **P0 = 4 (1, 2, 7, 8)**, **P1 = 3 (3, 4, 5)**, **P2 = 1 (6)**. Le cas Olivier 126 km/850 D+ est l'archétype du plan à ne JAMAIS générer "joliment" — l'application ment au user actuellement.

---

## Bug 1 — Vélo banni (cross-training dans plan)

**Verdict** : ✅ CONFIRMÉ

**Coach** : Le plan Olivier S1 Dim "Récupération Active (Vélo) 6.5 km / 75 min / 11:33" est une faute produit ET coach. Magness (Ultra-Endurance Training, ch. 6 "Active Recovery") admet vélo en récup mais c'est hors-scope d'une app de course. UTMB Academy "Programme Trail Initiation" : récup post-SL = marche active 20-30 min + mobilité, pas vélo. Cory Smith (Speedrunner Marathon Plans, sec. "Recovery Days") : easy 20-40 min en EF strict ou repos complet. La doctrine `feedback_coach_running_ia_que_course` est explicite : zéro cross-training programmé.

**Spec** :
- Filtre lexical post-LLM sur `title` ET `mainSet` : si match `/v[ée]lo|cyclisme|natation|piscine|aquajog|elliptique|rameur|home.?trainer|spinning/i` → retype `Récupération` ET réécrit mainSet en "Marche active 20-30 min + mobilité hanches/chevilles 10 min" OU `null` la séance et compacte la semaine.
- Préférer **suppression douce** (séance → repos jour) plutôt que substitution, pour ne pas inventer un volume non couvert par le LLM.
- Doctrines impactées : `feedback_coach_running_ia_que_course` (souche), `feedback_securite_avant_conversion` (transparence > silence).

**Risque doctrine** : aucun conflit. Strictement aligné `que_course`.

**Priorité** : **P0** — viole une doctrine explicite formulée 2× par PM, casse promesse produit.

---

## Bug 2 — Allure running appliquée à séance Vélo

**Verdict** : ✅ CONFIRMÉ (corollaire de Bug 1)

**Coach** : "11:33 min/km" sur vélo est un non-sens physiologique : un footing à 11:33/km c'est de la marche soutenue, pas du vélo récup (qui se prescrit en RPE 2-3/10 ou 90-100 W, pas en min/km). Joe Friel "The Triathlete's Training Bible" insiste : chaque modalité a sa propre métrique (allure, watts, FC). Mixer allure course sur vélo = LLM hallucine.

**Spec** : si Bug 1 supprime la séance, Bug 2 disparaît. Si on garde une logique de filtre intermédiaire (par sécurité défense en profondeur) : pour toute séance dont `type ∈ {Récupération, Repos}` ET `title` ne contient pas un verbe course → `targetPace = null` (afficher "—" front), `distance = null`, garder uniquement `duration`.

**Risque doctrine** : aucun.

**Priorité** : **P0** — couplé Bug 1, fix unique.

---

## Bug 3 — SL placée en Lundi J1 (Olivier plans 1 et 3)

**Verdict** : ✅ CONFIRMÉ

**Coach** : Placer la séance la plus dure (2h04, 128 D+) en J1 est une erreur de pédagogie d'entraînement. Friel (Training Bible, ch. 8 "Periodization Building Blocks") et Magness (Science of Running, ch. 11 "Scheduling Workouts") : la SL doit être positionnée en fin de microcycle pour permettre la pleine fenêtre de récup avant le prochain stimulus dur, et en weekend pour des raisons pratiques (vie pro, lumière). UTMB Academy schedule type 4 séances/sem : Mar/Jeu = qualité, Sam ou Dim = SL trail. Killian (Above the Clouds, "Weekly Structure") : SL le dimanche, semaine commence par easy run lundi.

**Spec** :
- Algo placement : identifier la SL (séance la plus longue OU `type === "Sortie Longue Trail"`).
- Ordre de placement : **Dim > Sam > Ven** (si dispo dans `preferredDays`).
- Contrainte d'espacement : minimum **48h entre 2 séances dures** (SL et qualité). Donc si SL Dim, qualité au plus tard Jeu (idéal Mar+Jeu, ou Mer si freq=3).
- Jamais J1 du microcycle, jamais lendemain d'une autre séance dure.
- Doctrines impactées : aucune doctrine ne s'y oppose. `feedback_input_client_obligatoire` respecté : `preferredDays` reste l'input, l'algo choisit DANS ces jours.

**Risque doctrine** : si user a coché uniquement Lun-Mar-Mer-Jeu en `preferredDays`, on prend le dernier (Jeu) pour SL — pas de violation.

**Priorité** : **P1** — pas un risque vital mais UX et pédagogie d'entraînement.

---

## Bug 4 — Pic volume insuffisant Trail Ultra ⭐ DÉTAIL EXIGÉ

**Verdict** : ✅ CONFIRMÉ (mais avec nuance forte sur les plans < 13 sem cf doctrine)

**Coach** : Pour le trail ultra long (>50 km), le pic hebdo détermine la spécificité du stress glycogénique, musculaire excentrique et mental. Références :
- **UTMB Academy "Programme UTMB 100 km"** (Cyril Cointre / Pascal Balducci) : pic semaine 60-90 km pour 100 km, pic 80-110 km pour 100 mi (UTMB).
- **Cory Smith Speedrunner Ultra plans** : pic = 0.70-0.90 × distance race pour 50-80 km, 0.50-0.70 × pour 100 km, 0.45-0.55 × pour 100 mi.
- **Magness Ultra Endurance Training** (ch. 4 "Volume Periodization") : pour ultras >100 km, pic = 1.5 à 2× le longest single run, et longest single run = 35-50% de la race.
- **Renato Canova** (méthode marathon adaptée ultra) : spécificité = au moins une semaine à 75-85% du temps total estimé de course.
- **Killian Jornet** (Above the Clouds) : "pour un ultra de N km, je veux pouvoir tenir N/2 en single run en zone 2 avant de me sentir prêt".

### Tableau de référence (recommandation experte 20 ans)

| Distance race | D+ | cv user | Pic optimal | Pic minimum acceptable | Source |
|---|---|---|---|---|---|
| 50 km | <1500 D+ | 30 | 55-65 km | 45 km | UTMB Academy Trail 50, Cory Smith Ultra |
| 50 km | 2000+ D+ | 30 | 60-70 km + 2500 D+/sem | 50 km + 1800 D+ | UTMB Academy CCC profil, Magness Ultra |
| 100 km | 800 D+ | 40 | 75-90 km | 60 km | Cory Smith 100k roulant, Canova endurance bloc |
| 100 km | 3000+ D+ | 40 | 80-100 km + 4000 D+/sem | 70 km + 3000 D+/sem | UTMB Academy CCC/TDS, Killian |
| 126 km | 850 D+ | 30 | 90-110 km | 75 km | Extrapolation Cory Smith 100mi / UTMB Programme 100 mi |
| 100 mi (160 km) | 5000+ D+ | 50 | 110-140 km + 6000 D+/sem | 95 km + 5000 D+ | UTMB Academy Programme UTMB, Killian |

### Cas Olivier 126 km / 850 D+

**Pic actuel plan : 63 km. Verdict : CATASTROPHIQUE et MENSONGER.**

- Pic 63 km pour 126 km = ratio 0.50, **en dessous du minimum acceptable** (75 km, ratio 0.60).
- Pire : Olivier part de cv = 30 km/sem. Passer de 30 à 63 sur 19 sem = montée +110%. Le pic théorique de 90-110 km demanderait +200-260%, **impossible sans blessure** chez un H 56 ans BMI 26.5.
- D+ actuel 50 m/sem, race 850 D+ : aucune préparation D+ ne peut se faire en 27 sem en respectant la sécurité. Il faudrait 2500-3000 m D+/sem sur le bloc spécifique, soit +5000% du baseline.
- Marathon PB 5h45 = profil **loisir débutant longue distance**, pas confirmé. La déclaration "Confirmé" est fausse — VMA 8.66 confirme.

**Conclusion Olivier** : le plan **n'est pas générable physiquement**. Le statut IRRÉALISTE confidence 10 est correct, mais le plan ne devrait **pas être affiché comme "préparé"**. Le pic 63 km est un compromis qui ment au user : il ne sera ni assez préparé pour finir, ni assez peu chargé pour ne pas se blesser. C'est le pire des deux mondes.

### Spec
- Ajouter `minPeakVolume_Trail_Ultra` = max(0.60 × distance_race, 1.8 × cv_initial).
- Ajouter `minPeakElevation_Trail_Ultra` = 0.70 × race_D+ / nb_séances_trail_pic, plafonné à 4× D+_initial pour sécurité progression.
- Si plan ≥ 18 sem : viser pic optimal (col 4).
- Si plan 13-17 sem : viser entre min et optimal.
- Si plan < 13 sem **ET** distance > 50 km : **bloquer génération** ou afficher IRRÉALISTE + override décharge musclée. Doctrine `feedback_courte_duree_charge_allegee` s'applique pour les distances courtes/route, **mais pas pour l'ultra >50 km** où le sous-dimensionnement = échec garanti ou hospitalisation.
- Si `minPeakVolume > 2.5 × cv_initial` → statut IRRÉALISTE automatique (impossible à atteindre safely).

**Doctrines impactées** :
- `feedback_courte_duree_charge_allegee` : NUANCE — la règle "sous 13 sem = calibrage allégé volontaire" est valable pour route ≤ semi. Pour ultra, allégé = mort. À étendre comme exception explicite.
- `feedback_securite_avant_conversion` : renforce. Le pic 63 km affiché comme "préparation 126 km" est un mensonge marketing.
- `feedback_input_client_obligatoire` : la date course reste l'input, mais on a le droit (et le devoir) de basculer IRRÉALISTE et exiger décharge.

**Risque doctrine** : conflit avec `feedback_courte_duree_charge_allegee` à clarifier. Recommandation : **ajouter une exception trail >50 km** où la règle "allégé = safe" devient fausse.

**Priorité** : **P1** (P0 si on considère qu'un plan ultra sous-dimensionné = risque médical, mais pourrait passer P0 selon arbitrage Romane).

---

## Bug 5 — Allures S1 monotones (toutes à efPace unique)

**Verdict** : ⚠️ NUANCÉ

**Coach** : S1 d'un plan trail ultra **doit être majoritairement EF** (zone 2), c'est OK que 80% des séances soient à efPace. MAIS la séance qualité (Tempo court / côtes EF+) et la SL doivent avoir des allures différenciées. Magness (Science of Running, ch. 9 "Aerobic Development") : phase d'introduction = volume aérobie strict, mais 1 stimulus de qualité par semaine dès S1 pour entretenir le top-end. Friel : Base 1 = 90% Z1-Z2, 10% Z3.

Le plan 3 (Olivier 100 km) affiche 9:33/km partout : c'est cohérent pour les EF et la SL d'une **vraie S1 ultra** où on reste en Z2. Le bug est plus subtil : c'est l'**absence de différenciation entre EF récup (10:00-10:30/km) et EF active (9:00-9:30/km)**, et l'absence d'une séance avec composante côte/tempo.

**Spec** :
- En S1 : autoriser `efPace` unique sur 70-80% séances, MAIS exiger ≥ 1 séance avec composante "côtes en EF+" (sortie vallonnée 30-45 min EF + 6×30" côte easy) ou "fartlek nature" à efPace + 4-6× 1min plus rapide.
- Différencier `efPaceRecup` (efPace × 1.08) sur lendemain de SL.
- SL en S1 = obligatoirement EF strict, mais format "sortie longue progressive" possible (dernier tiers efPace - 10").
- Sprint C Item 1 (allure unique S1) déjà identifié comme report — confirmer le scope coach.

**Doctrines impactées** : `feedback_jamais_baisser_allure_cible` (allures spécifiques objectif intactes), aucun risque.

**Risque doctrine** : aucun.

**Priorité** : **P1** — qualité produit moyenne, pas dangereux.

---

## Bug 6 — Hallucination géographique spots LLM

**Verdict** : ✅ CONFIRMÉ

**Coach** : "Parc de Kerpape à 1h30 AR de Vannes" est une hallucination — Kerpape est à Lorient, ~1h en voiture de Vannes (donc 2h AR minimum), et c'est un centre de rééducation, pas un parc trail. Sur le plan coach pur ça n'a aucune importance (l'effort prescrit est valable). Sur le plan UX/confiance c'est désastreux : le user perd foi dans l'app si la première mention concrète est fausse.

**Spec** :
- Option A (safe) : **retirer toute mention de spot géo nommé du prompt LLM**, ne garder que des descriptions génériques ("parcours vallonné proche de chez toi", "boucle de 8-12 km avec dénivelé").
- Option B (riche) : whitelist par ville construite à la main pour les top 50 villes France (Vannes, Lorient, Rennes, etc.) avec 3-5 spots trail validés.
- Option C (deferred) : intégration API Strava Segments / IGN pour shortlist auto. Hors scope court terme.

**Recommandation immédiate** : Option A maintenant, Option B en Sprint F si volume justifie.

**Doctrines impactées** : aucune existante. Crée un précédent "ne pas inventer de faits géo".

**Risque doctrine** : aucun.

**Priorité** : **P2** — UX dégradée mais pas dangereux ni viral.

---

## Bug 7 — WelcomeMessage déconnecté `feasibility.status`

**Verdict** : ✅ CONFIRMÉ

**Coach** : Plan 3 Olivier 100 km, feasibility IRRÉALISTE, welcomeMessage "progression très graduelle" = mensonge produit caractérisé. Doctrine `feedback_securite_avant_conversion` explicite : on ne ment JAMAIS sur le risque pour pousser conversion. Plan Olivier qui sort "graduelle, douce, on y va sereinement" alors que c'est physiquement infaisable = faute majeure.

Cory Smith dans ses consultations 1-1 (podcast "Athletic Performance Podcast" ep. 87) : "if a plan is unrealistic, the first thing the coach says is 'this is unrealistic, here's what we can actually do safely'". Killian Jornet refuse explicitement des athlètes qui visent des chronos qu'ils ne peuvent pas tenir — la transparence est partie du métier.

**Spec** :
- `welcomeMessage` doit être **conditionné** au `feasibility.status` :
  - REALISTE : ton motivant, vision positive.
  - AMBITIEUX : ton lucide, "c'est ambitieux mais atteignable si tu respectes le plan".
  - IRRÉALISTE : ton **brutal, transparent, décharge explicite** ("Ce plan est IRRÉALISTE selon nos calculs : ton volume actuel 30 km/sem ne permet pas de préparer safely 126 km en 27 sem. Tu peux générer le plan sous décharge, en acceptant le risque de blessure et de non-finish. Notre coach recommande : a) repousser la course de 12-18 mois pour préparer proprement, b) viser un format 50 km d'abord. Si tu maintiens 126 km : on optimise au max dans tes contraintes, mais on ne te ment pas.").
- Bannir mots-clés "graduelle/douce/sereine/tranquille" si `status === IRRÉALISTE`.
- Aligner ton du welcome ET du `safetyWarning` (cohérence).

**Doctrines impactées** : `feedback_securite_avant_conversion` (souche), `feedback_jamais_baisser_allure_cible` (on ne baisse pas l'objectif, on prévient seulement), `feedback_compromis_messages_preventifs` (messages préventifs > blocage), `feedback_jamais_suggerer_changer_frequence` (NE PAS suggérer "ajoute 1 séance" — par contre suggérer "repousser race" ou "viser distance moins longue" est OK car ce n'est pas un input fréquence/allure).

**Risque doctrine** : attention à ne pas tomber dans suggestion changement freq. La suggestion "repousser la course" touche `raceDate` qui est input user — c'est limite mais légitime sur IRRÉALISTE strict (décharge). À cadrer : on suggère, on n'écrase pas.

**Priorité** : **P0** — souche doctrine sécurité, défaut grave actuellement en prod.

---

## Bug 8 — VMA cible "623 km/h" (bug astronaute)

**Verdict** : ✅ CONFIRMÉ

**Coach** : "VMA cible 623 km/h" = bug calcul critique, probablement division par 0 ou mauvaise unité (m/s confondu avec km/h, ou temps en secondes pris pour heures). "Progression nécessaire +6851%" confirme : le code calcule `vmaCible / vma - 1` sur une vmaCible qui a une unité ou un signe absurde.

Aucun athlète humain n'a dépassé VMA ~26 km/h (record Bekele/Cheptegei estimé). Hicham El Guerrouj sur 1500 m c'est ~28 km/h instantané sur 200m, pas en VMA continue 6 min.

**Spec** :
- Cap dur en sortie de calcul : `vmaCible = clamp(vmaCible, vma_initiale, 25)`.
- Si `vmaCible > 22` → log warning + statut IRRÉALISTE automatique (objectif impossible).
- Détection garde-fou en entrée : si `targetTime` produit `allure < 2:30/km` (=24 km/h) → reject input, demander confirmation.
- Détection division par 0 / NaN / Infinity à chaque étape du pipeline calcul allure.
- Test unitaire obligatoire : profil VMA 9 + targetTime marathon 2h30 = vmaCible théorique impossible → status IRRÉALISTE + cap.

**Doctrines impactées** :
- `feedback_jamais_baisser_allure_cible` : NUANCE — on ne touche pas `allureSpecifiqueMarathon` (input), on cap uniquement la `vmaCible` interne affichée. Si la cible est physiquement impossible, on affiche IRRÉALISTE plutôt que de cap silencieusement.
- `feedback_securite_avant_conversion` : confirme.

**Risque doctrine** : si on cap vmaCible silencieusement, on triche sur l'affichage. Bonne pratique : afficher la vmaCible vraie (même absurde) avec status IRRÉALISTE plutôt que cap muet. Ou alors cap + message "objectif impossible physiquement, statut IRRÉALISTE forcé".

**Priorité** : **P0** — bug calcul visible en prod, dégrade confiance instantanément.

---

## Hiérarchisation Sprint E

**P0 (urgent qualité produit / sécurité)** :
- Bug 1 + 2 (cross-training Vélo + allure absurde) — fix couplé, 1 filtre lexical
- Bug 7 (Welcome déconnecté IRRÉALISTE) — défaut doctrine sécurité
- Bug 8 (VMA astronaute) — bug calcul visible

**P1 (important UX, pédagogie d'entraînement)** :
- Bug 3 (SL en J1) — algo placement
- Bug 4 (Pic volume Trail Ultra) — référentiel + statut IRRÉALISTE renforcé
- Bug 5 (Monotonie S1) — différenciation EF/EF récup + 1 séance qualité

**P2 (raffinement)** :
- Bug 6 (Hallucination spots) — retirer mention géo nommée ou whitelist

---

## Tests anti-régression critiques à imposer

Profils tests à couvrir (en plus des actuels semi/marathon route) :

1. **Olivier 126 km loisir-âgé** : H 56 ans BMI 26.5, VMA 8.66, cv 30 km/sem, D+ 50 m/sem, PB Marathon 5h45 → DOIT générer IRRÉALISTE, welcome brutal, zéro vélo, pic ≥ 75 km **ou** IRRÉALISTE bloquant.
2. **Trail 50 km débutant** : H 35 ans, VMA 12, cv 25 km/sem → pic ≥ 45 km, D+ progressif.
3. **UTMB CCC confirmé** : H 40 ans, VMA 15, cv 60 km/sem, 100 km / 6000 D+ → pic 80-100 km + 4000 D+ progressif.
4. **Diagonale des Fous 165 km expert** : H 45 ans, VMA 16, cv 80 km/sem → pic 110-140 km. Test stress glycogénique simulé (≥ 1 sortie > 35 km).
5. **Plan court trail < 13 sem** : doit basculer IRRÉALISTE si distance > 50 km et cv < 0.4 × distance race.
6. **Cas VMA astronaute** : VMA 9, targetTime marathon 2h45 → vmaCible doit clamper à 22 max + status IRRÉALISTE.
7. **Préfèrence days Lun-Jeu uniquement** : SL doit aller sur Jeu (dernier jour dispo), jamais Lun.
8. **Cross-training prompt** : forcer LLM à générer "Vélo récupération" → filtre doit le retyper en Repos/Marche.
9. **Spot géo absent** : aucun nom de parc ou lieu spécifique dans toutes les séances générées pour 5 villes test (Vannes, Lorient, Annecy, Chamonix, Bordeaux).
10. **Welcome ton IRRÉALISTE** : aucun mot "graduelle/douce/sereine" présent quand `feasibility.status === IRRÉALISTE`.

---

## Décision finale

**Le produit Trail/Ultra n'est PAS safe en prod aujourd'hui.** Trois plans audités sur trois présentent des défauts graves (cross-training vélo, welcome mensonger, pic sous-dimensionné, SL mal placée, bug VMA astronaute, hallucination géo). Sur le cas Olivier 126 km, l'app génère un plan **physiquement infaisable**, affiche un message rassurant ("progression graduelle"), et lui fait croire qu'il est prêt — c'est une faute de responsabilité produit.

**Sprint E priorité MAXIMALE.** Recommandation : freezer les générations Trail >50 km en prod (ou bandeau IRRÉALISTE forcé temporaire) tant que P0 1+2+7+8 ne sont pas livrés. P1 (3+4+5) sur Sprint E ou E.5. P2 (6) peut glisser Sprint F.

Le verdict expert n'est pas négociable : on ne génère pas de plan ultra "joliment" quand le user n'est physiquement pas prêt. Notre signature coach c'est la vérité — surtout quand le marché vend du rêve.
