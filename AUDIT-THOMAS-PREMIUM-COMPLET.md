# AUDIT THOMAS — Plan Premium Marathon 3h20 (19 sem.)

> Audit réalisé le 2026-05-19. Plan créé le 2026-05-19, paiement Premium 8 min après inscription.

---

## Client — thomas.weill.pro@gmail.com

| Champ | Valeur |
|---|---|
| **UID** | `nMH83IjgsYZY24QYWyijuIjyoH33` |
| **Plan ID** | `1779217739002` |
| **Nom du plan** | "Préparation Marathon en 3h20 — 19 sem." |
| **Date inscription** | 2026-05-19T19:08:39Z |
| **Email vérifié** | 2026-05-19T19:09:27Z |
| **Paiement Premium** | 2026-05-19T19:17:36Z (`hasPurchasedPlan: true`, `planPurchaseDate`) |
| **Anomalie flag** | `isPremium: false` malgré `hasPurchasedPlan: true` → flag potentiellement non synchronisé |
| **Date création plan** | 2026-05-19T19:08:59Z (20 sec après inscription, AVANT paiement) |
| **Last update** | n/a (jamais mis à jour) |
| **Sexe / Âge / Poids / Taille / BMI** | Homme / 31 / 73 kg / 178 cm / **23.0** (normal) |
| **Niveau** | Expert (Performance) |
| **Goal / SubGoal** | Course sur route / **Marathon** |
| **TargetTime** | **3h20** |
| **RaceDate** | 2026-09-27 (~19 semaines depuis startDate, **cohérent** avec le plan) |
| **StartDate** | 2026-05-19 (jour J de l'inscription) |
| **Frequency** | **4** séances/sem (= 3 course + 1 renfo, conforme doctrine) |
| **CurrentWeeklyVolume** | **40 km/sem** déclaré |
| **PB déclaré** | `recentRaceTimes.distance10km = "39h20"` (**format anormal — voir bug §7**) |
| **Injuries** | Aucune (`hasInjury: false`) |
| **Ville** | Vannes (préparation marathon de Vannes) |
| **Jours préférés** | Lundi, Mercredi, Vendredi, Dimanche |
| **Comments** | "Je cours le soir" |
| **VMA estimée** | 16.95 km/h (`vmaSource: "10km en 39h20"` — voir §7) |
| **Modèle utilisé** | `gemini-3-flash-preview` |
| **fullPlanGenerated** | `true` (19 semaines complètes) |
| **Sprints 1-6 en prod** | OUI (plan généré le 2026-05-19, après les déploiements) |

---

## 1. Allure cible

| Allure | Valeur |
|---|---|
| Spécifique Marathon | **4:44 /km** |
| Spécifique Semi | 4:10 /km |
| Spécifique 10K | 3:56 /km |
| Spécifique 5K | 3:44 /km |
| Seuil | 4:04 /km |
| VMA (3000m) | 3:32 /km |
| EF (5e carte) | 5:17 /km |
| EA | 4:36 /km |
| Récup | 5:54 /km |

**Vérification cohérence :**
- Marathon en 3h20 = 200 min / 42.195 km = **4:44.5/km** → allureSpecifiqueMarathon parfaitement calibrée.
- VMA 16.95 km/h → temps marathon théorique (modèle Mercier-VMA) ≈ 3h07, **donc 3h20 est confortablement réaliste (≈86% VMA sur marathon)**.
- Si on prend PB 10K = 39:20 (lecture la plus probable malgré format "39h20"), Riegel pour marathon = **3h08** → cohérent avec VMA. Donc l'IA a probablement bien interprété "39h20" comme "39:20".
- PB 10K en 39:20 ⇒ allureSpecifique10k devrait être ~3:56/km → **plan affiche 3:56/km : exact** (ce qui confirme que l'IA a bien lu 39:20).
- Allure Spé Marathon 4:44 = environ **3.94/km sous PB10K Riegel** — calibration finisher+PB respectée (max(PB+5%, VMA-based)) — ici l'objectif user 3h20 est plus rapide que confort mais cohérent avec son niveau.

**Verdict : OK** mais ⚠️ le format "39h20" indique soit (a) faute de saisie user (manque le séparateur `:`) soit (b) un bug d'input qui aurait pu être catastrophique. Ici sauvé par interprétation IA, mais le système ne devrait pas accepter ce format sans validation.

---

## 2. Volume hebdo (toutes les 19 semaines)

| Sem | Phase | Vol prévu (km) | Vol réel généré (km) | Δ% vs S-1 | Note |
|---|---|---:|---:|---:|---|
| 1 | fondamental | 40 | 40.0 | — | = currentVol déclaré (40), ratio 1.0 → conforme (Sprint 6 ≤ 1.6) |
| 2 | fondamental | 43 | 43.0 | +7.5% | OK |
| 3 | fondamental | 47 | 47.0 | +9.3% | OK |
| 4 | **récup** | 37 | 37.0 | -21% | Décharge OK |
| 5 | fondamental | 43 | 43.0 | +16% | OK |
| 6 | développement | 49 | 49.0 | +14% | OK |
| 7 | développement | 56 | 56.0 | +14% | OK |
| 8 | **récup** | 48 | 46.0 | -18% | ⚠️ Vol réel 46 vs prévu 48 (-2 km) |
| 9 | développement | 55 | 55.0 | +20% | ⚠️ saut +20% après récup (max recommandé 15%) |
| 10 | développement | 63 | 63.0 | +14.5% | OK |
| 11 | développement | 67 | 67.0 | +6.3% | OK |
| 12 | **récup** | 54 | 54.0 | -19% | OK |
| 13 | spécifique | 62 | 62.0 | +15% | OK |
| 14 | spécifique | 67 | **64.0** | +3.2% | ⚠️ Vol réel 64 vs prévu 67 (-3 km, écart périodisation/génération) |
| 15 | spécifique | 71 | **66.0** | +3.1% | ⚠️ Vol réel 66 vs prévu 71 (**-5 km, écart majeur**) |
| 16 | **récup** | 57 | 57.0 | -14% | ⚠️ "Récup" qui est PLUS volumineuse (57) que la semaine 14 (64) — donc pas vraiment décharge |
| 17 | affûtage | 47 | 47.0 | -18% | OK |
| 18 | affûtage | 41 | 41.0 | -13% | OK |
| 19 | affûtage | 36 | 36.0 | -12% | OK (semaine course D-? — course le 27/09, dernière semaine commence le 14/09 → la course n'est PAS la dernière semaine du plan, le plan se termine ~2 semaines après ?) |

**Pic volume** : 67 km/sem (S11 et S14 prévu, S11 réel) — **+67% vs vol initial**. Cohérent pour Expert qui prépare un marathon.

**Saut max constaté** : +20% (S8→S9), borderline mais OK pour Expert.

**Récupération S16** : 57 km est marqué "récupération" mais c'est plus que S6 (49) ou S5 (43). Pour un Expert post-pic 71, oui décharge relative. Mais la SL passe de 35km (S15) à 30km (S16) — **trop peu de décharge** sur la sortie longue (-14%).

**Affûtage** : 47→41→36 km, décroissance progressive correcte. SL d'affûtage 23→21→20 km, **encore très volumineuses** (20km à J-? de la course). 

**Anomalies majeures :**
- ❌ **Vol périodisé ≠ vol généré sur S8, S14, S15** : la périodisation prévoit 48/67/71 mais le plan génère 46/64/66 — désynchronisation interne du moteur. Sur S15 (pic prévu 71 km), perte de 5 km soit 7%.
- ⚠️ **Pas de course finale dans le plan** : raceDate 2026-09-27, startDate 2026-05-19 → 19 sem. = jusqu'au 2026-09-27. Mais la semaine 19 est "affûtage" classique (36 km en EF, SL 20 km le dimanche) **sans mention de la course**. Le dimanche 2026-09-27 devrait être le jour de la course, or il y a une SL EF 20 km à 5:17 — c'est incohérent.

---

## 3. Sortie longue — progression sur 19 semaines

| Sem | SL (km) | Durée | Allure | % vol hebdo | Saut % vs SL S-1 |
|---|---:|---|---|---:|---:|
| 1 | **15** | 79 min | 5:17 EF | 38% | — |
| 2 | **22** | 1h56 | 5:17 EF | 51% | **+47%** ❌ |
| 3 | **25** | 2h12 | 5:17 EF | 53% | +14% |
| 4 | 20 | 1h46 | 5:17 EF | 54% | -20% (récup) |
| 5 | 24 | 2h07 | 5:17 EF | 56% | +20% |
| 6 | 23.7 | 2h05 | 5:17 + 2×4km @4:15 | 48% | -1% |
| 7 | 30 | 2h25 | 4:44 (3×15min) | 54% | +27% ⚠️ |
| 8 | 26 | 2h20 | 5:17 EF | 57% | -13% (récup) |
| 9 | 29 | 2h30 | 4:10 (4×10min Spé Semi) | 53% | +12% |
| 10 | 34 | 2h45 | 4:44 (2×25min) | 54% | +17% |
| 11 | **35** | 2h55 | 4:44 (3×20min) | 52% | +3% (pic) |
| 12 | 28 | 2h28 | 5:17 EF | 52% | -20% (récup) |
| 13 | **35** | 2h53 | 4:44 (2 blocs — voir §7) | 56% | +25% |
| 14 | **35** | 2h53 | 4:44 (35 km en continu) | 55% | 0% |
| 15 | **35** | 2h54 | 4:44 (35 km AS Marathon) | 53% | 0% |
| 16 | 30 | 2h38 | 5:17 EF | 53% | -14% (récup) |
| 17 | 23 | 2h02 | 5:17 + 2×10min AS Mara | 49% | -23% |
| 18 | 21 | 1h51 | 5:17 EF | 51% | -9% |
| 19 | 20 | 1h46 | 5:17 EF | 56% | -5% |

**Référentiel marathon : pic SL = 35 km sur 2h45-3h00 → OK.**

**Anomalies critiques :**

- ❌ **S1→S2 saut SL +47% (15→22 km)** : passage de 79 min à 1h56 d'un coup. C'est BRUTAL même pour un Expert qui déclare vol 40 km/sem. Sa "SL habituelle" actuelle (s'il fait 40 km/sem) doit être ~15-18 km. Lui demander 22 km en S2 puis 25 km en S3 sur **3 semaines successives** sans ramping est non-conforme à la règle classique +10-15% max sur la SL.
- ❌ **S13, S14, S15 : 3 sorties longues consécutives à 35 km / 2h53-2h54 dont 2 entièrement à allure marathon** :
  - S14 = "35 km à l'allure marathon en continu" → ABSURDE coaching : faire 35 km à allure marathon 3 sem. avant la course, c'est cramer le coureur. Le standard est 1 bloc 30-35 km dont 20-25 km à AS Marathon, **pas la totalité**.
  - S15 = "35 km à l'allure marathon intégrés" → idem.
  - 3 sem. consécutives de SL 35 km dont 2 à AS Marathon = **risque blessure et surentraînement majeur**.
- ⚠️ **S13 mainSet incohérent texte** : `"2 blocs de 35 km à l'allure marathon... entrecoupés de 2 km de récup"` → **2 × 35 = 70 km**, ce qui est physiquement impossible pour une séance de 35 km totale. **Bug texte IA** (voulait dire "2 blocs de 3-5 km" probablement, ou "blocs de 5 km × 3").
- ⚠️ **SL S17 affûtage = 23 km incluant 2×10 min AS Marathon** : OK contenu, mais 23 km à 14 jours de la course est borderline. Acceptable pour Expert.
- ⚠️ **SL S19 (semaine course) = 20 km le dimanche** : c'est la semaine du 14 au 20/09 si on suppose course le 27/09 → cohérent. Mais le DIMANCHE 27/09 (jour de la course) le plan génère une SL EF 20 km — **bug : ce jour est censé être la course**.

---

## 4. Faisabilité

```
status: "EXCELLENT"
score: 95
message: "Avec ta VMA de 16.9 km/h, ton temps théorique sur marathon est d'environ 
         3h07min. Ton objectif de 3h20min est cohérent avec ton niveau. C'est un plan 
         réaliste et bien calibré."
safetyWarning: "Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi 
                un vrai temps de récupération."
```

**Verdict :**
- ✅ Statut EXCELLENT cohérent : VMA 16.9 → marathon théorique 3h07, objectif 3h20 = marge confortable (+13 min).
- ✅ Aucune mention poids/IMC (doctrine respectée).
- ✅ SafetyWarning générique mais présent.
- ⚠️ **Le score 95 ne reflète pas les anomalies du plan généré** (saut SL +47%, 3 SL 35 km consécutives à AS Marathon). Le moteur faisabilité juge le profil et l'objectif (cohérents) mais pas le contenu du plan livré. À noter pour amélioration produit.

---

## 5. WelcomeMessage

```
Bienvenue dans ta préparation spécifique pour le marathon de Vannes ! 
Ce programme de 19 semaines est structuré pour bâtir une base aérobie solide 
avant d'attaquer les phases de développement et de spécificité marathon. 
Nous te recommandons de consulter un médecin avant de débuter ce programme, 
notamment pour obtenir un certificat médical d'aptitude au sport. 
Ton objectif de 3h20 est parfaitement calibré avec ton profil de coureur confirmé.
```

**Verdict :**
- ✅ Aucune mention poids/IMC/minceur (doctrine respectée).
- ✅ Mention médecin présente (recommandation standard, même si pas obligatoire pour 31 ans BMI normal).
- ✅ Personnalisation : "marathon de Vannes" (basé sur la ville).
- ✅ Objectif référencé clairement.
- ⚠️ Mais : message dit "coureur confirmé" alors que le user déclare niveau **"Expert (Performance)"**. Petite imprécision rédactionnelle.
- ⚠️ Pas de référence explicite au PB 10K (39:20) déclaré, alors que c'est la donnée la plus discriminante du profil.

---

## 6. Variation séances (sur 19 semaines)

### Distribution par type :

| Type | Nb total | Sem. présence |
|---|---:|---|
| Jogging / Footing | 33 | toutes |
| Renforcement | 19 | toutes (1/sem) |
| Sortie Longue | 19 | toutes (1/sem) |
| Fractionné | 10 | S6, S7, S9, S10, S11, S13, S14, S15, S17, S18 |
| Tempo dédié | 0 | (intégré dans Fractionné/SL) |
| Côtes dédié | 0 | (intégré dans footing vallonné) |
| Marche-Course | 0 | ✅ Conforme doctrine (Expert ≠ marche-course) |

### Variation titres : ✅ EXCELLENTE

Exemples :
- "Footing au ressenti (fartlek doux)" / "Footing vallonné, côtes en marche" / "Footing progressif en forêt" / "Footing technique - Rosvellec" / "Footing sensoriel - Vincin"
- SL toutes différentes : "Boucle de Conleau" / "Sentier Côtier de Conleau" / "Liaison Vannes - Séné" / "Cap sur Arradon" / "Volume Spécifique - Boucle du Golfe" / "Grande Sortie Endurance - Vers Arradon" / "Volume Maximum - La Sortie Royale" / etc.

### Variation lieux : ✅ EXCELLENTE
Vannes / Promenade de la Rabine / Parc de la Garenne / Étang au Duc / Conleau / Séné / Arradon / Voie Verte / Stade de Kercado / Bois de Vincin / Forêt de Plescop / Parc de Kerizac / Larmor-Baden / Réserve de Séné… Très local, contextualisé Morbihan.

### Renfo : ✅ Bonne alternance Focus A (quadri/gainage) / Focus B (fessiers/hanches/gainage latéral), avec versions "Léger" en récup et "Maintien" en affûtage.

### Cohérence niveau Expert :
- ⚠️ **Quasi-aucun fractionné dans les 5 premières semaines** (1er fractionné en S6, jusque-là que footings + SL EF). Pour un Expert qui vise 3h20, c'est tardif. Mais cohérent avec phase "fondamentale" longue (5 sem.) pour reconstruire base aérobie.
- ⚠️ **VMA peu travaillée** : seulement 3 séances VMA pures (S7 : 10×300, S10 : 6×800, S18 : 10×200). Pour un marathon c'est OK, mais maigre pour le profil Expert.
- ⚠️ **Aucun travail dédié à l'allure semi** (4:10) sauf 1 fois en S9 (4×10 min Spé Semi en intégration). Travail seuil OK (5 séances seuil dédiées).

---

## 7. Bugs Sprint 1-6 (focus particulier)

| Test | Résultat |
|---|---|
| **C1.3** mainSet ↔ duration cohérence | ⚠️ **Anomalie S13** : "2 blocs de 35 km à l'allure marathon" dans une séance de 35 km/2h53 — **incohérent** (texte ferait 70 km min.). |
| **C1.4** mainSet ↔ distance | ⚠️ idem S13. Autres SL : `durée_mainSet > duration_séance` à plusieurs reprises (ex. S6 fractionné 14.1 km / 1h10 mais mainSet ne couvre pas tout). |
| **C2.1** Vol S1 ≤ currentVol × 1.6 | ✅ **40 ≤ 40 × 1.6 = 64** : largement OK. |
| **C2.2** Allure 10K Finisher+PB | n/a (targetTime = "3h20", pas Finisher) |
| **C2.6/2.7** 5e carte (paces Marathon) | ✅ `allureSpecifiqueMarathon: "4:44"` présente. |
| **Mode marche-course** | ✅ Aucune séance marche-course (Expert). |
| **Cap D+ trail** | n/a (Course sur route). |
| **Allure cible respectée** | ✅ 4:44/km marathon = exactement 3h20 sur 42.195 km. |
| **Renfo inclus dans freq** | ✅ Frequency 4 = 3 course + 1 renfo. |
| **Validation input PB** | ❌ **BUG CRITIQUE** : `distance10km: "39h20"` accepté tel quel. Format aberrant (39h = 39 heures). L'IA a interprété par chance comme "39:20" (minutes:secondes), mais le système n'a pas validé/normalisé l'input. **Risque** : si demain un user tape "39h20" en pensant "39 minutes 20", le système peut tomber sur une autre interprétation. |
| **isPremium flag** | ❌ **BUG flag** : `isPremium: false` malgré `hasPurchasedPlan: true` et `planPurchaseDate` renseigné. Synchronisation Stripe/Firebase à vérifier. |
| **Plan ne contient pas le jour de la course** | ⚠️ Course 2026-09-27 (dimanche) — la semaine 19 génère une SL 20 km EF ce jour-là au lieu de marquer "COURSE". |

---

## Synthèse Thomas

### ✅ Points positifs
- Profil cohérent : Expert, vol 40 km/sem, marathon 3h20, raceDate dans 19 sem.
- Allures parfaitement calibrées (4:44/km = exactement 3h20).
- VMA 16.9 km/h cohérente (interprétation correcte du PB malgré format douteux).
- Faisabilité EXCELLENT 95 légitime sur le profil.
- WelcomeMessage doctrinalement clean (zéro poids, médecin OK).
- Variation séances/titres/lieux exceptionnelle sur 19 semaines (Vannes/Morbihan, varié).
- Renfo bien dosé (1/sem, alternance Focus A/B + Léger récup + Maintien affûtage).
- Aucune séance marche-course (conforme niveau Expert).
- Aucun cross-training (conforme doctrine "que course à pied").
- Aucune mention nutrition/poids dans le plan ou conseils.

### ⚠️ Points d'attention
- **Saut SL S1→S2 = +47%** (15 → 22 km) : agressif. Pour un Expert "qui fait 40 km/sem" mais dont la SL réelle habituelle est inconnue, on ne devrait pas dépasser +15% sur la SL d'une semaine sur l'autre.
- **3 SL consécutives à 35 km / 2h53 (S13, S14, S15)** dont 2 à AS Marathon en continu : surentraînement probable, c'est rare en littérature même chez les élites. Le standard est 1 sortie 30-35 km dont 20-25 km à AS Marathon, **espacée de 3 semaines**.
- **S13 mainSet "2 blocs de 35 km"** : bug texte IA, soit doit lire "2 blocs de 5 km", soit "2 × 3.5 km" — à clarifier.
- **Vol périodisation ≠ vol généré** sur S8 (-2), S14 (-3), **S15 (-5 km soit -7%)** : désynchronisation interne moteur entre `periodizationPlan.weeklyVolumes` et `weeks[].sessions`.
- **Pas de course finale** dans le plan : SL EF 20 km générée le 2026-09-27 (jour course) au lieu de jour de course.
- **Affûtage SL 23/21/20 km** : volumineux. Standard marathon affûtage = SL 18/16/12 km. Ici 20 km à J-7 c'est trop.
- **Faible variété fractionné en début de plan** : aucun fractionné S1→S5 pour un Expert ⇒ retard de stimulation.

### ❌ Bugs critiques
- **Format PB user "39h20"** accepté sans validation : risque catastrophique si interprétation IA différente sur un autre user (devrait être normalisé à `39:20`).
- **`isPremium: false` malgré paiement** : possible bug de synchronisation Stripe → Firebase. À vérifier (Thomas a-t-il accès à la totalité du plan dans l'UI ?).
- **S13 mainSet "2 blocs de 35 km"** : faute IA texte, induira l'utilisateur en erreur.
- **Jour de course non détecté** dans la dernière semaine.

### Action recommandée

Plan créé il y a **moins de 1 heure** et la S1 n'a pas encore commencé (startDate = 2026-05-19, premier entraînement = Lundi 19/05 soir d'après "Je cours le soir"). 

Doctrine `feedback_patch_live_plans_jour_seulement` : **on peut encore patcher live aujourd'hui** car S1 non vécue (preview non commencée IRL).

**Recommandations à Romane (lecture seule pour l'audit, aucune modif Firestore) :**

1. **(critique sécurité)** Diminuer la SL S2 de 22 → 18 km, S3 de 25 → 22 km pour adoucir la rampe (+15-18% au lieu de +47%).
2. **(critique entraînement)** Espacer les SL 35 km : S11 (déjà 35), S13 → 32 km, S14 → 28 km (récup), S15 → 35 km. Au lieu de 35/35/35 d'affilée.
3. **(critique entraînement)** Réduire le volume à AS Marathon dans S14/S15 : passer de "35 km en continu à AS Marathon" à "20 km à AS Marathon intégrés dans une SL 32-35 km en EF". Standard littérature.
4. **(critique texte)** Corriger S13 mainSet : retirer "2 blocs de 35 km", remplacer par contenu cohérent (ex: "3 blocs de 5 km à 4:44/km, récup 2 min EF entre").
5. **(critique affûtage)** Réduire SL affûtage : 23/21/20 → **18/14/race-day**. La S19 doit explicitement contenir "COURSE 42.195 km le 27/09".
6. **(critique produit)** Vérifier le flag `isPremium` côté backend — Thomas a-t-il bien accès à toutes les semaines dans l'app malgré `isPremium: false` ? (le rendering peut se baser sur `hasPurchasedPlan` ou `fullPlanGenerated`).
7. **(critique input)** Patcher la validation `recentRaceTimes.distance10km` côté front : refuser format `\d+h\d+` sur une distance < marathon, ou normaliser auto.

**Aucun contact direct au client** (doctrine `feedback_jamais_contact_client`). Romane décide rétro-patch ou pas.

---

## Fichiers de référence
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-user.json` (raw Firestore)
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-user-parsed.json`
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-plan.json` (raw Firestore)
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json`
- Scripts audit : `_thomas-find-plan.mjs`, `_thomas-parse.mjs`, `_thomas-audit-weeks.mjs`, `_thomas-detail-weeks.mjs`
