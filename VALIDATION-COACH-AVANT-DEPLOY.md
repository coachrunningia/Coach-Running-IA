# Validation Coach 15 ans — avant déploiement live + fixes code
Date : 2026-05-19
Coach validateur : route + Semi + Marathon, 15 ans FFA — référentiels Daniels (VDOT), Pfitzinger (Advanced Marathoning), Hammond, Balducci, Riegel, ACSM.

> NB important : le fichier `INVESTIGATION-FEASIBILITY-VMA-GAP.md` cité dans le brief **n'existe pas sur disque**. La validation de l'élément C est faite à partir des seuils proposés dans le brief lui-même, pas d'un document tiers. À confirmer.

---

## Synthèse 30 secondes

- **mxjulien02 (Semi 2h00)** : ✅ **GO** — patch cohérent, transparent, conforme doctrine. Une modif mineure recommandée sur le score (35 → 30) et un alignement Riegel.
- **steph-fanny (10K Finisher 60 ans)** : ⚠️ **GO avec modif** — compromis 11.9 km/sem trop bas pour S1 d'une 60 ans Intermédiaire à 20 km/sem déclarés. Cibler 14-15 km/sem (3 séances). Bug latent allure 10K 8:20/km à corriger live aussi.
- **Fix `feasibilityService.ts` (seuils %VMA tenu)** : ⚠️ **GO avec modif** — seuils factor+0.05/+0.10 corrects pour Semi/Marathon, **dangereux pour 10K/5K** (faux négatifs garantis sur intermédiaire ambitieux). Moduler par distance.
- **Fix `enforceWeekConstraints` sync mainSet** : ⚠️ **GO avec modif** — le principe est correct (Fix #1 + Fix #2 combinés), mais le regex actuel **casse les fractionnés et le marche-course**. Whitelist par type de séance obligatoire avant déploiement.

**GO/NO-GO global** : GO sur les 2 patches live (mxjulien02 + steph-fanny modifié), GO sur Fix mainSet **uniquement après ajout whitelist type-de-séance**, GO sur Fix feasibility **uniquement après ajout modulation par distance**.

---

## A. mxjulien02 — Patch live Semi 2h00

### Verdict : ✅ GO (avec 2 modifs mineures)

### A.1 — Statut IRRÉALISTE (vs AMBITIEUX) : ✅ JUSTIFIÉ

**Référentiels physio appliqués au cas Julien (Homme 39 ans, VMA 10.8, BMI 26.87, Intermédiaire) :**

| Référentiel | Seuil semi | % VMA Julien (97.7%) | Verdict |
|---|---|---|---|
| Daniels VDOT (Half-Marathon T-pace) | 84-88 % VMA pour Intermédiaire | 97.7 % | **Hors plage de 10 points** |
| Pfitzinger (Lactate Threshold pace ≈ allure semi) | 88-92 % VMAaer (= ~85-88 % VMAmax) | 97.7 % | **Hors plage, 5-10 points trop haut** |
| Hammond (Run Less Run Faster, allure HM cible) | 85-90 % VMA pour amateurs | 97.7 % | **Hors plage** |
| Riegel depuis 10K 1h06 | Prédit 2h25 (= 84 % VMA) | Cible 2h00 (97.7 %) | **Gap 12.4 % > seuil IRRÉALISTE 10 %** |
| Gain VMA réaliste 19 sem Intermédiaire | +5 à +8 % (référentiel Daniels gain VDOT par phase 6 sem) | Demanderait +14.6 % | **Impossible biologiquement** |

**Trois critères IRRÉALISTE cochés**, exactement comme l'audit l'a vu. Le statut AMBITIEUX violait `feedback_securite_avant_conversion`. Aucun expert FFA n'écrirait « ambitieux mais faisable » pour 97.7 % VMA tenu sur 21 km à un Intermédiaire — c'est un seuil **élite mondiale stricte** (Bekele court son marathon à ~88 % VMA, Kipchoge ~86 %).

**Modif mineure proposée** : score 35 → **30**.
- 35 c'est juste sous le seuil 0-50 → cohérent mais légèrement adouci. 30 ancre la lecture côté front « clairement à éviter ». Argument : 3 critères IRRÉALISTE cochés + facteurs aggravants (BMI 26.87, travail nuit) → bas de la fourchette IRRÉALISTE.
- Cela dit, 35 reste défendable si Romane préfère « plan utile pour 2h15-2h20 » sémantiquement. **Décision binaire à trancher (B1).**

### A.2 — Recommandation 2h15 : ⚠️ TOP DE LA FOURCHETTE — à reformuler en 2h17-2h20

**Référentiel Riegel + gain physio :**
- Riegel pur depuis 10K 1h06 → Semi prédit 2h25 (allure 6:53/km = 87 % VMA actuelle)
- Gain VMA Intermédiaire 19 sem bien encadré : **+5 à +8 %** (Daniels et Pfitzinger convergent) → VMA cible fin de plan 11.3-11.7 km/h
- À 85 % de cette VMA fin de plan : 6:18-6:31/km → temps semi **2h13-2h18**
- À 87 % (Riegel) : 6:09-6:21/km → **2h10-2h14**

**Donc 2h15 est dans la fourchette haute mais atteignable** (= position « ambitieux mais réalisable »). C'est OK doctrinairement, mais :

- Le wording proposé dit « **autour de 2h15** » — cette formulation laisse de la marge. ✅ OK.
- Le `welcomeMessage` aussi parle de « **autour de 2h15** ». ✅ OK.
- Risque : un user qui lit « 2h15 » pile vise 2h15 et se prend un mur s'il n'a pas progressé +7 % VMA en 19 sem.

**Reco coach** : garder « autour de 2h15 » dans message + welcome, **mais ajouter une phrase dans `welcomeMessage`** : « Si la progression est moins forte que prévu (gain VMA 4-5 % au lieu de 7 %), une cible 2h18-2h20 reste un excellent résultat. » → laisse 2 portes de sortie honnêtes (Daniels et Pfitzinger préconisent toujours **target range**, pas target unique).

### A.3 — `weeklyVolumes` [25,27,29,23,28,30,24,28,31,25,29,31,25,30,32,25,28,22,16] : ✅ SAIN

| Critère ACSM/Pfitzinger | Constat plan | Verdict |
|---|---|---|
| Saut max +10-15 %/sem hors récup | Max +10.7 % S8→S9, +7.4 % S2→S3 | ✅ |
| Décharge 1/3 sem (Pfitzinger 4-week mesocycle adapté) | S4/S7/S10/S13/S16 = -20 à -22 % | ✅ |
| Pic ≤ +30 % vs S1 | 32 km vs 25 km = +28 % | ✅ (juste sous limite, ok) |
| Affûtage 2 sem -30/-50 % vs pic | S18 22 (-31%), S19 16 (-50%) | ✅ Pfitzinger taper exact |
| Pic unique vs plateau | 32 km en S15 unique | ✅ Daniels et Pfitzinger préconisent **un seul peak week** |

**Le vrai débat coaching** : 32 km de pic pour viser un Semi en 2h15 — est-ce assez ? Référentiel Pfitzinger « Up to 47 miles per week / 18 weeks » (=75 km/sem) ; référentiel Daniels Half-Marathon plan 2Q = 40-50 mpw (=65-80 km/sem). **32 km est honnêtement bas pour viser 2h15 sérieusement.**

MAIS : `feedback_input_client_obligatoire` impose de partir de 25 km déclarés, et un saut current 25 → pic 50 = +100 % en 15 sem = **inadmissible ACSM** (blessure quasi-garantie sur BMI 26.87 + travail nuit). Le compromis 32 km = **maximum sécurisé pour ce profil**.

**Cohérence interne** : on classe IRRÉALISTE parce qu'on ne PEUT PAS livrer un pic 45-50 km, et on pousse à 32 km le maximum tenable. La cohérence narrative tient. ✅

### A.4 — SL pic 16 km en S15 : ✅ OK pour 2h15, ⚠️ insuffisant si vraie ambition 2h00

**Référentiels SL pic Semi :**
- Pfitzinger Up to 47 mpw : SL pic = 21 km (= distance course)
- Daniels Half-Marathon : SL = 24-29 km (longer than race)
- Hammond Run Less : SL = 16-22 km (= 75-100 % distance)
- ACSM/coaching mainstream amateur : SL pic ≥ 75 % distance course = 16 km mini pour semi

**16 km = pile la borne basse Hammond / borne ACSM amateur.** Pour viser **2h15** c'est OK (le user aura couru 75 % de la distance avant le jour J). Pour viser **2h00** c'est insuffisant → cohérent avec le verdict IRRÉALISTE pour 2h00.

**Ratio SL pic / vol semaine pic** = 16/32 = 50 % → **borne haute Pfitzinger 33-50 %**. C'est élevé mais acceptable pour un Intermédiaire en phase spécifique. Attention : avec ratio 50 %, la fatigue dimanche → lundi sera marquée, vigilance sur le travail de nuit.

**Modif mineure** : si la pipeline génère la SL via ratio fixe (typique 0.45-0.50), 32 × 0.50 = 16 km ✓. Mais si la pipeline génère via heuristique distance/% race-distance, vérifier qu'elle pousse bien à 16 km (et pas 14 km comme ce qui était prévu avant patch). **Action dev requise (cf §10 du PROPOSITION-PATCH).**

### A.5 — Allure 5:41/km conservée alors qu'IRRÉALISTE : ✅ COHÉRENT DOCTRINE

C'est exactement le sens de `feedback_jamais_baisser_allure_cible` : on ne modifie PAS l'allure cible utilisateur (5:41/km = 2h00), on prévient via feasibility + welcomeMessage. La doctrine et la proposition sont alignées parfaitement.

**Risque coach** : le user va lire `paces.allureSpecifiqueSemi: 5:41` dans son plan et **faire ses séances seuil à 5:41**, ce qui est physiologiquement **inatteignable** (= 97.7 % VMA tenu 20-30 min × 4-6 répétitions, alors que le seuil tient à ~90 % VMA). Conséquence prévisible : il ratera ses séances spécifiques, ce qui peut affecter sa motivation.

**Reco** : ce risque est inhérent à la doctrine et c'est OK. Le `welcomeMessage` actuel ne le mentionne pas explicitement → **ajouter** : « Sur les séances seuil et spécifiques, si tu ne tiens pas le 5:41/km imposé par ta cible 2h00, c'est normal — tiens l'allure la plus rapide soutenable et notes l'écart, on saura ainsi quelle cible viser le jour J. »

### A.6 — Wording (feasibility.message + safetyWarning + welcomeMessage) : ✅ TRÈS BON

- Cite PB 10K 1h06 ✅
- Cite Riegel 2h25 ✅
- Donne le 97.7 % VMA en langage simple ✅
- Alternative 2h15 honnête ✅
- Médecin/cardio + travail nuit ✅
- Aucune mention poids/IMC (doctrine `feedback_jamais_poids_minceur`) ✅

**Seul vrai bémol coach** : le message ne dit pas explicitement « tu peux PAS courir 2h à 97.7 % VMA » de façon viscérale. C'est noyé dans « durées beaucoup plus courtes qu'un semi ». Pour un user qui se sent capable, ça peut sembler abstrait. **Reco** : remplacer « durées beaucoup plus courtes qu'un semi » par « **un effort qu'un coureur amateur tient au maximum 40-50 minutes, pas 2 heures** » → plus concret.

### A.7 — Décisions à trancher Romane (élément A)

- **B1** : Score 35 (proposition) vs 30 (reco coach) — choix Romane selon ton produit voulu
- **B2** : Reformulation `welcomeMessage` avec ajout « si gain VMA moins fort, 2h18-2h20 OK » et phrase explicite séances seuil à 5:41 → ajout recommandé

---

## B. steph-fanny — Patch live 10K Finisher 60 ans

### Verdict : ⚠️ GO AVEC MODIF (volume S1 à remonter à 14-15 km, allure 10K à corriger live aussi)

### B.1 — Statut EXCELLENT 95 → BON : ✅ JUSTIFIÉ, score 70-75

**Référentiel ACSM/Daniels pour Finisher 10K à 60 ans :**
- VMA réelle déduite du PB 5K 46 min : VDOT Daniels donne **VMA 6.5-7 km/h** (et non 8 « corrigée »)
- 21 sem de prépa : largement suffisant (Daniels recommande 12-16 sem pour 10K)
- Volume 20 km/sem déclaré : adéquat pour Finisher 10K
- Âge 60 ans : facteur de risque cardio + récupération ralentie (référentiel ACSM : -1 % VO2max/an après 30 ans, +0.5 j récupération après 50 ans)
- BMI 23.5 : sain ✅

**Score 95 EXCELLENT** suppose tous voyants au vert. Or :
- VMA optimiste (+15-25 % vs VDOT)
- Allure 10K 8:20/km irréaliste (cf B.5)
- 60 ans → vigilance cardio obligatoire

**BON 70-75** reflète honnêtement : « tu PEUX finir, c'est même très probable, mais on reste prudent sur les allures et le médecin ». **Score 75 est ma reco** (vs 70 trop bas pour un Finisher avec 21 sem, vs 80 trop optimiste).

### B.2 — Patch S1 compromis (Mardi 5.4 km mainSet "42 min" + Dimanche 6.5 km mainSet "6.5 km") : ⚠️ INSUFFISANT EN VOLUME

**Calcul détaillé :**
- S1 actuel patché : Mardi 5.4 km + Renfo 0 km + Dimanche 6.5 km = **11.9 km de course**
- vs `weeklyVolumes[0] = 20 km` (= currentWeeklyVolume déclaré)
- vs `feedback_input_client_obligatoire` qui impose de ne pas écraser le déclaré

**Référentiel coaching 60 ans Finisher 10K avec 20 km/sem déclarés :**
- Daniels recommande de **maintenir le volume déclaré en S1** (entrée progressive de structure, pas baisse de volume)
- Pfitzinger : « do not reduce volume on Week 1 of plan vs pre-plan » (Advanced Marathoning chap 3, applicable aussi 10K)
- ACSM : baisse vol > 30 % S1 = signal de déconditionnement, contre-productif

**11.9 km vs 20 km déclaré = -40 %.** C'est une baisse importante non justifiée par la physio. Le compromis proposé est **trop bas**.

### B.3 — Question stratégique « 11.9 km sécurisant ou sous-dimensionné ? » : SOUS-DIMENSIONNÉ

**Verdict coach 15 ans : sous-dimensionné. Voici l'alternative que je proposerais.**

**Alternative coach (cohérente doctrine `feedback_securite_avant_conversion` + `feedback_input_client_obligatoire`) :**

| Jour | Type | Durée | Distance | Allure | mainSet |
|---|---|---|---|---|---|
| Mardi | Footing EF | 1h00 | 5.4 km | 11:12 | « 42 min en deux moitiés... » (= patch proposé) |
| Jeudi | Renfo | 30 min | 0 km | — | inchangé |
| Dimanche | Sortie Longue EF | **1h30** | **8 km** | 11:12 | **« 8 km de course continue à 11:12, marche autorisée si essoufflée »** |

**Total** : 13.4 km de course. Plus proche du 20 km déclaré (sans atteindre, mais bien meilleur que 11.9). Si on veut s'approcher franchement de 20 km, on ajoute une 3ème séance course Vendredi 30-35 min EF (3-3.5 km) → **total ~17 km**, à ratio 85 % du déclaré (acceptable pour S1 prudente).

**MAIS** : le profil est `frequency: 3` (= 2 course + 1 renfo selon doctrine). Donc une 3ème séance course casserait la fréquence déclarée. Reste à 2 séances course + renfo. → **Reco finale : Mardi 5.4 km / 1h00 + Dimanche 8 km / 1h30 = 13.4 km de course.**

**Pourquoi 8 km / 1h30 (et pas 6.5 km / 1h13 comme proposé) :**
- 8 km à 11:12 = 89.6 min = exactement ce que Gemini avait initialement généré (et que les caps ont rabaissé à tort à 60 min)
- Pour une 60 ans qui déclare 20 km/sem, faire 1h30 de footing EF dimanche est **standard de chez standard** (Pfitzinger recommande SL = 25-30 % vol pour profils Maintenance/Finisher → 25 % de 20 = 5 km, **on est large à 8 km mais cohérent avec le mainSet généré initial**)
- 11:12/km = ~67 % VMA réelle 6.5-7 = **EF pure**, sécurité parfaite
- Allure conversationnelle, marche autorisée → cohérent profil 60 ans

**Compromis avec `feedback_securite_avant_conversion`** : on ne dépasse PAS 1h30 (=Pfitzinger seuil « long run beginning » pour senior), on **ne combine PAS allure tendue + durée longue**, on laisse marche-autorisée explicite dans le mainSet.

### B.4 — Allure 10K 8:20/km : ⚠️ BUG LATENT À CORRIGER LIVE AUSSI

Phase spécifique S14+ : les séances cibleront 8:20/km, soit **0:52/km plus rapide que le PB 5K** (9:12) et **2 min/km plus rapide que la VMA-based** (10:00-10:30). Impossible biologiquement pour cette profil.

**Application doctrine `feedback_finisher_plus_pb_allure`** : Finisher + PB 5K 46 min → allure 10K cible = `max(PB+5%, VMA-based)` :
- PB 5K (9:12/km) extrapolé 10K → PB 10K théorique ≈ 9:40/km (règle +5 % Riegel pace adjustment)
- + 5 % cushion = ~10:08/km
- vs VMA-based 70-75 % VMA 7 = 10:00-10:43/km
- **max = ~10:00 min/km** (arrondi 10:00 strict)

**Patch live à ajouter** : `paces.allureSpecifique10k`: `"8:20 min/km"` → **`"10:00 min/km"`**.

**Cohérence doctrine** : pas une violation de `feedback_jamais_baisser_allure_cible` parce que `targetTime = "Finisher"` = pas d'allure cible saisie. La règle Finisher+PB s'applique pleinement.

**Critique du brief** : la proposition initiale dit « laisser pour patch code structurel ». **NON, à corriger live**. C'est exactement le scope du patch live (S1 + plan à venir). Si le patch code arrive dans 1 mois et que la cliente a déjà entamé sa phase spécifique entre temps avec 8:20/km, elle ratera toutes ses séances ou se blessera. Le patch live doit corriger les **2 bugs principaux** : volume S1 + allure 10K.

### B.5 — WelcomeMessage : ⚠️ À RÉÉCRIRE

Le welcome actuel ne mentionne PAS le PB 5K 46 min (doctrine `feedback_finisher_plus_pb_allure` viole). À ajouter :

```
Bienvenue ! Ton plan est conçu sur 21 semaines pour préparer ton 10 km en mode Finisher.

Ton PB sur 5 km en 46 min me sert à calibrer tes allures d'entraînement : tes footings se font autour de 11:12 min/km (allure conversationnelle, tu dois pouvoir parler) et les séances plus rythmées de la phase spécifique cibleront environ 10:00 min/km — soit ton allure 10K confortable, légèrement plus rapide que ton 5K rapporté à la distance plus longue.

Côté volume : tu pars de 20 km/semaine en cours, le plan démarre prudemment autour de 13-14 km de course en S1 pour bien caler la régularité, puis le volume reste stable autour de 20-23 km/sem tout au long du plan. Pas de progression brutale : on construit la durabilité, pas la performance.

Deux points santé importants : à 60 ans, un bilan médical complet avec test d'effort cardio est vivement recommandé avant de démarrer. Pendant l'entraînement, accorde-toi 48h minimum entre deux séances course, et écoute ton corps — la marche pendant une sortie est toujours une option saine, pas un échec.

Bonne préparation !
```

Caractéristiques validées :
- PB 5K cité ✅ (doctrine `feedback_finisher_plus_pb_allure`)
- Allure d'entraînement expliquée ✅
- Allure 10K spécifique mentionnée 10:00 (cohérent avec patch live B.4)
- Volume S1 13-14 honnête (cohérent reco B.3)
- 60 ans + cardio + 48h récup ✅
- Marche autorisée ✅
- Aucun chrono `targetTime` mentionné (Finisher) ✅
- Aucune mention poids/IMC ✅

### B.6 — Décisions à trancher Romane (élément B)

- **B3** : 11.9 km S1 (proposition initiale) vs 13.4 km S1 (reco coach Mardi 5.4 + Dimanche 8) — **reco coach forte = 13.4**
- **B4** : Patcher live l'allure 10K (8:20 → 10:00) OUI/NON — **reco coach forte = OUI**, sinon bug latent atteint la cliente avant fix code
- **B5** : Reformulation welcomeMessage avec PB 5K + allure 10:00 — **reco coach forte = OUI**

---

## C. Fix code `feasibilityService.ts` (seuils %VMA tenu)

### Verdict : ⚠️ GO AVEC MODIF (modulation par distance obligatoire, sinon faux négatifs sur 10K/5K)

### C.1 — Analyse des seuils proposés (factor + 0.05 / factor + 0.10)

**Référentiels VMA pour chaque distance (Daniels VDOT + Pfitzinger) :**

| Distance | factor (= % VMA cible élite/ambitieux) | Cohérent ? |
|---|---|---|
| 5K | 0.95 (élite 95-100 %, ambitieux amateur 90-93 %) | ⚠️ Borne haute |
| 10K | 0.90 (élite 92-95 %, ambitieux amateur 88-92 %) | ✅ |
| Semi (21K) | 0.85 (élite 88-90 %, ambitieux amateur 84-87 %) | ✅ |
| Marathon (42K) | 0.80 (élite 85-88 %, ambitieux amateur 78-82 %) | ✅ |

**Avec seuils proposés (factor + 0.05 = AMBITIEUX, factor + 0.10 = IRRÉALISTE) :**

| Distance | Ambitieux > | Irréaliste > | Test cas | Verdict |
|---|---|---|---|---|
| 5K (factor 0.95) | > 1.00 | > **1.05** | Impossible (>VMA 5K) sauf erreur VMA déclarée | 🚨 **Seuils inopérants** : aucun 5K tenu à >105 % VMA = jamais classé IRRÉALISTE. Seuils morts. |
| 10K (factor 0.90) | > 0.95 | > 1.00 | 10K 38min VMA 17.5 = 95.6 % VMA → juste AMBITIEUX | ✅ OK |
| Semi (factor 0.85) | > 0.90 | > 0.95 | mxjulien02 97.7 % VMA → IRRÉALISTE | ✅ OK |
| Marathon (factor 0.80) | > 0.85 | > 0.90 | Marathon 3h00 VMA 16 = 88 % VMA → IRRÉALISTE | ✅ OK |

**🚨 Le 5K est cassé.** Si factor=0.95 et threshold IRRÉALISTE = factor+0.10 = 1.05, **aucun 5K n'atteindra ce seuil** (un 5K à 100 % VMA tenu c'est déjà élite, 105 % c'est non-bio). → Tous les 5K seront classés BON, même un débutant ciblant 22 min avec VMA 12 (= 97 % VMA = irréaliste).

**🚨 Borderline 10K aussi.** factor 0.90 + 0.10 = 1.00. Un user débutant qui vise 10K en 40 min avec VMA 14 (= 107 % VMA tenu sur 40 min = délire absolu) sera bien classé IRRÉALISTE. Mais un user qui vise 10K en 42 min avec VMA 14.3 (= 100 % VMA pile) sera classé AMBITIEUX seulement. **Faux négatif quasi-garanti** : 100 % VMA tenu 42 min est inatteignable hors élite.

### C.2 — Modulation proposée

**Reco coach (basée sur Daniels VDOT)** : utiliser des **seuils absolus par distance**, pas factor+0.05/+0.10. Tableau de référence :

| Distance | AMBITIEUX > | IRRÉALISTE > | Justification |
|---|---|---|---|
| 5K | 0.93 | 0.97 | Amateur ambitieux 93 % / élite 97 % / hors-élite >97 % impossible |
| 10K | 0.90 | 0.95 | Amateur ambitieux 90 % / élite 95 % / >95 % irréaliste |
| Semi | 0.88 | 0.93 | Daniels HM T-pace 88 % / élite 92 % / >93 % irréaliste |
| Marathon | 0.83 | 0.88 | Daniels M-pace 82 % / élite 86-88 % / >88 % irréaliste |

**Note** : `factor` proposé dans le brief = % VMA cible tenable amateur, ce qui n'est PAS la même chose que le seuil IRRÉALISTE. Le brief confond les deux. Le `factor` devrait être le seuil **AMBITIEUX** (= « limite amateur ambitieux »), et IRRÉALISTE = `factor + 0.05` (pas +0.10).

**Reformulation des seuils :**
```ts
const distFactor = getVmaFactor(effectiveDistanceKm);  // = seuil AMBITIEUX
const irrealisticThreshold = distFactor + 0.05;        // = seuil IRRÉALISTE
const ambitiousThreshold = distFactor;                  // = seuil AMBITIEUX

// Avec factors révisés :
// 5K: 0.93 → IRRÉALISTE 0.98
// 10K: 0.90 → IRRÉALISTE 0.95
// Semi: 0.88 → IRRÉALISTE 0.93
// Marathon: 0.83 → IRRÉALISTE 0.88
```

**Cas test révisés (avec mes factors proposés) :**

| Cas | Calcul | Verdict |
|---|---|---|
| 5K 22 min VMA 16 | 91 % VMA → < 0.93 | BON (proche AMBITIEUX) ✅ |
| 5K 20 min VMA 16 | 100 % VMA → > 0.98 | IRRÉALISTE ✅ |
| 10K 38 min VMA 17.5 | 90.2 % VMA → > 0.90 | AMBITIEUX cap 60 ✅ |
| 10K 38 min VMA 18.5 | 85 % VMA → < 0.90 | BON ✅ |
| Marathon 3h00 VMA 16 | 88 % VMA → > 0.88 | **IRRÉALISTE** ✅ (Pfitzinger Type A élite, pas Intermédiaire) |
| Marathon 3h00 VMA 17 | 82.8 % VMA → < 0.83 | BON ✅ |
| mxjulien02 Semi 2h00 VMA 10.8 | 97.7 % VMA → > 0.93 | IRRÉALISTE ✅ (cohérent patch live) |

### C.3 — Modulation par niveau (Intermédiaire vs Confirmé vs Expert)

**Reco coach** : ne PAS différencier par niveau dans le calcul `feasibility.status`. Le niveau est déjà capturé dans la **VMA déclarée** (un Expert a une VMA supérieure à un Intermédiaire). Différencier par niveau créerait des **edge cases** (Intermédiaire VMA 18 = aberration, mais le code dirait « OK c'est Intermédiaire seuils plus durs »).

Si on veut moduler quelque part, c'est sur le **score AMBITIEUX cap** (60 vs 65 vs 70) — pas sur le seuil de classification. Mais c'est un raffinement qui peut attendre v2.

### C.4 — Cap score AMBITIEUX à 60 (vs 65 ou 70)

**Reco coach** : **60 OK**. C'est cohérent avec l'échelle proposée dans le patch mxjulien02 (BON 70-100 / AMBITIEUX 50-70 / IRRÉALISTE 0-50). Cap 60 = pile au milieu de la zone AMBITIEUX, ce qui dit honnêtement « ambitieux mais ni le haut ni le bas de l'ambition ».

**Alternative** : cap 65 (haut de la zone AMBITIEUX) = plus optimiste, conversion plus haute. Risque doctrine `feedback_securite_avant_conversion` violée si l'écart est limite. **60 est plus safe.**

### C.5 — Score IRRÉALISTE = 10 vs 5 (gate 130 % VMA existant)

Le gate 130 % VMA existant (score 5) = absolument irréaliste (= user a saisi un PB ou une VMA fausse). C'est un cas différent du « IRRÉALISTE par défaut » (score 10).

**Reco coach** : garder les 2 niveaux séparés :
- Score 5 = gate 130 % VMA (= input cassé, user a erreur dans ses chiffres)
- Score 10-30 = IRRÉALISTE physiologique (cible > seuil mais valeurs cohérentes)
- Score 30-50 = IRRÉALISTE light (cible juste au-dessus du seuil)

Pour mxjulien02 (97.7 % VMA = juste au-dessus 0.93 seuil Semi) → score 30-35 cohérent. Pour un user à 110 % VMA Semi → score 10-15.

### C.6 — Risques sur autres profils non testés

**Profils à risque où le fix pourrait surclasser ou sous-classer :**

| Profil | Risque | Comment tester |
|---|---|---|
| Trail / Ultra | `effectiveDistanceKm` doit être ajusté (un trail 30 km D+800 = ~36 km plat) | Vérifier `effectiveDistanceKm` calculé avec D+ |
| Hyrox course | factor à définir (1 km × 8 = pseudo 10K) | Ajouter factor Hyrox = 0.92 (proche 10K) |
| Très débutant VMA < 8 | factors potentiellement inapplicables (Daniels VDOT bas ne suit pas la même courbe) | Floor sur VMA min, sinon score artificiellement haut |
| Très expert VMA > 18 | factors restent valables (l'élite africaine c'est ~21 VMA) | OK |
| Marche-course | N/A, la VMA pure ne s'applique pas | Bypass cette logique pour mode marche-course |

### C.7 — Décisions à trancher Romane (élément C)

- **B6** : Adopter table factors révisés par distance (5K 0.93 / 10K 0.90 / Semi 0.88 / Marathon 0.83) OUI/NON — **reco coach forte = OUI**
- **B7** : Threshold IRRÉALISTE = factor + 0.05 (pas + 0.10) — **reco coach forte = OUI**
- **B8** : Cap score AMBITIEUX à 60 — **reco coach = OK 60**
- **B9** : Garder 2 niveaux IRRÉALISTE (gate 130 % VMA = score 5, IRRÉALISTE physio = score 10-30) — **reco coach = OUI**

---

## D. Fix code `enforceWeekConstraints` sync mainSet

### Verdict : ⚠️ GO AVEC MODIF (whitelist par type de séance obligatoire)

### D.1 — Robustesse du helper `applySessionScale`

**Le principe (Fix #1 + Fix #2 combinés) est sain :**
- Fix #2 (repousser `buildFootingVariant` APRÈS enforce) résout la cause racine pour les Joggings
- Fix #1 (helper de sync) est défensif et corrige les SL post-cap

**Problèmes concrets du regex actuel :**

```ts
// Regex Fix #1 actuel
ms = ms.replace(/^(\s*)(\d+\s*h\s*\d*|\d+\s*min)/i, `$1${bodyMin} min`);
ms = ms.replace(/(\d+(?:[.,]\d+)?)\s*km(?!\/h)/, `${newKm} km`);
```

### D.2 — Cas qui cassent (à fixer AVANT déploiement)

**🚨 CAS 1 — Fractionné classique** (Daniels intervals, Pfitzinger reps) :
- mainSet `"6 × 800 m à 4:00/km récup 2 min"` → le `(\d+(?:[.,]\d+)?)\s*km` ne match pas (`800 m`, pas `km`) ✅ safe
- mainSet `"5 × 1000 m à 3:50/km"` → idem `1000 m` ne match pas ✅
- mainSet `"3 × 2 km à 4:00/km"` → 🚨 **MATCH** : remplace `2 km` par `newKm km`. **BUG**.

**🚨 CAS 2 — Hyrox** : déjà flaggé dans la proposition (`8 × 1km`). Le fix anti-Hyrox proposé `(?<![×x]\s)` + `(?!\s*[×x])` :
- Pour `8 × 1km` : `1` est précédé de `× ` → lookback `(?<![×x]\s)` match donc remplace ❌ BUG (le regex anti veut le contraire : ne PAS remplacer si précédé de ×)

Le regex est inversé dans la proposition. Reformulation correcte :
```ts
ms = ms.replace(
  /(?<!(?:×|x|fois)\s)(\d+(?:[.,]\d+)?)\s*km(?!\/h)(?!\s*[×x])/,
  `${newKm} km`,
);
```
Le `(?<!(?:×|x|fois)\s)` = lookback négatif : ne match PAS si précédé de `× `, `x `, ou `fois `. **Tester sur regex101 avant déploiement.**

**🚨 CAS 3 — Marche-course** (débutants/petite VMA) :
- mainSet `"8 × (5 min course + 1 min marche) à 8:17"` → le `^(\s*)(\d+\s*h\s*\d*|\d+\s*min)` ne match pas en début ✅ safe
- MAIS le regex anchored `^` ne touche que le **début**. Si mainSet commence par `"Footing en blocs : 8 × (5 min..."`, pas de match → mainSet préservé. ✅ Heureusement.
- Mais si mainSet commence par `"5 min course..."` (sans préfixe), match → 🚨 BUG.

**🚨 CAS 4 — Fartlek progressif** :
- mainSet `"Fartlek 6 × 30s rapide / 30s récup, puis 20 min EF"` → `^...(\d+\s*min)` ne match pas en début (commence par `Fartlek`) ✅ safe

**🚨 CAS 5 — SL Daniels avec splits** :
- mainSet `"16 km au total : 12 km à 6:00/km puis 4 km accélération à 5:30/km"` → le regex `(\d+(?:[.,]\d+)?)\s*km` match `16` en premier → remplace par newKm. **C'est ce qu'on veut** (le total). ✅ OK
- Mais ensuite les `12 km` et `4 km` restent intacts alors qu'ils devraient être proportionnels. **mainSet incohérent après remplacement partiel.**

### D.3 — Reco coach : whitelist par TYPE de séance

Ne pas appliquer la sync mainSet **uniquement** aux types où le pattern est sûr :

```ts
const SAFE_TO_SYNC_TYPES = new Set([
  'Sortie Longue',         // mainSet typique "X km de course continue à pace"
  'Jogging',               // mainSet typique "X min" via buildFootingVariant
  'Footing',               // idem
]);

const RISKY_TYPES = new Set([
  'Renforcement',          // pas de km, déjà filtré
  'Fractionné',            // 6 × 800 m, ne pas toucher
  'Fartlek',               // structure complexe
  'Côtes',                 // séquence sprint, ne pas toucher
  'Tempo',                 // duration tempo + warmup, structure mixte
  'Repos',                 // rien à toucher
  'Trail D+',              // déjà géré L.2171
]);

if (!SAFE_TO_SYNC_TYPES.has(s.type)) {
  // Sync duration/distance seulement, pas mainSet
  if (newDurMin > 0) s.duration = formatDurationStr(newDurMin);
  if (newKm > 0) s.distance = `${newKm} km`;
  return;
}
```

Pour les RISKY_TYPES, le mainSet **ne devrait pas être réécrit** (= mainSet structurel, pas distance-based). C'est meilleur de laisser une légère incohérence duration vs mainSet **sur les types structurels** (le user comprend que le fractionné est défini par sa structure, pas son volume total) que de casser le mainSet.

**Validation cross-doctrine** : c'est cohérent avec `feedback_chaque_ligne_justifiee` (on ne casse pas une ligne qu'on ne comprend pas).

### D.4 — Risque silencieux si regex ne match pas

**Aujourd'hui** : si le regex ne match pas, `s.mainSet` est silencieusement inchangé alors que `duration`/`distance` changent. → bug invisible identique à celui qu'on essaie de fixer.

**Reco coach** : ajouter un **log warning** quand le regex ne match pas sur un type SAFE_TO_SYNC. Et **étendre `planValidator.ts`** avec la règle `mainset_duration_mismatch` (déjà proposée en annexe C de l'investigation). Cette double protection (sync + validator) est nécessaire.

### D.5 — Décisions à trancher Romane (élément D)

- **B10** : Adopter whitelist `SAFE_TO_SYNC_TYPES` (SL/Jogging/Footing seulement) — **reco coach forte = OUI**
- **B11** : Ajouter log warning si regex ne match pas sur un type SAFE — **reco coach = OUI**
- **B12** : Déployer `planValidator.ts` règle `mainset_duration_mismatch` (warning) en parallèle — **reco coach = OUI**

---

## Décisions binaires à trancher par Romane

### Patch live mxjulien02 (élément A)
- **B1** : Score IRRÉALISTE = 30 (reco coach) ou 35 (proposition initiale) ?
- **B2** : Ajouter dans welcomeMessage la phrase « si gain VMA moins fort, 2h18-2h20 reste excellent » + phrase explicite « si tu ne tiens pas 5:41 en séance, c'est normal » ?

### Patch live steph-fanny (élément B)
- **B3** : S1 vol course total = 11.9 km (proposition) ou **13.4 km** (Mardi 5.4 + Dimanche **8** km, reco coach) ?
- **B4** : Patcher live l'allure 10K **8:20 → 10:00 min/km** OUI/NON (reco coach : OUI, sinon bug latent atteint la cliente avant fix code) ?
- **B5** : Réécrire `welcomeMessage` avec PB 5K cité + allure 10:00 mentionnée (cf §B.5) ?
- **B6** : Statut score = 75 BON (reco coach) ou 70 (proposition) ?

### Fix code feasibilityService (élément C)
- **B7** : Adopter table factors révisés par distance (5K 0.93 / 10K 0.90 / Semi 0.88 / Marathon 0.83) OUI/NON (reco coach : OUI) ?
- **B8** : Threshold IRRÉALISTE = factor + 0.05 (pas + 0.10) (reco coach : OUI) ?
- **B9** : Cap score AMBITIEUX = 60 (vs 65/70) ?
- **B10** : Garder 2 niveaux IRRÉALISTE (gate 130 % VMA score 5, IRRÉALISTE physio score 10-30) ?

### Fix code enforceWeekConstraints (élément D)
- **B11** : Adopter whitelist `SAFE_TO_SYNC_TYPES` (SL/Jogging/Footing seulement) OUI/NON (reco coach : OUI obligatoire) ?
- **B12** : Ajouter log warning si regex ne match pas sur un type SAFE ?
- **B13** : Déployer en parallèle la règle `mainset_duration_mismatch` dans planValidator ?

---

## GO / NO-GO global deploy

| Élément | Verdict | Conditions |
|---|---|---|
| Patch live mxjulien02 | ✅ **GO** | Avec B1=35 OK (ou 30 si Romane préfère), B2 reco mais non bloquant |
| Patch live steph-fanny | ⚠️ **GO AVEC MODIF** | **B3 = 13.4 km obligatoire** (11.9 km trop bas doctrine), **B4 = patcher allure 10K obligatoire** (sinon bug latent), B5 reco mais non bloquant |
| Fix `feasibilityService.ts` | ⚠️ **GO AVEC MODIF** | **B7 + B8 obligatoires** (sans ça, 5K cassé + 10K avec faux négatifs garantis) |
| Fix `enforceWeekConstraints` | ⚠️ **GO AVEC MODIF** | **B11 whitelist obligatoire** (sans ça, casse fractionnés + marche-course + Hyrox). B12 + B13 reco. |

**Ordre de déploiement recommandé :**
1. **Aujourd'hui** : patch live mxjulien02 + patch live steph-fanny (avec modifs B3+B4 minimum)
2. **Cette semaine** : Fix `enforceWeekConstraints` avec whitelist (élément D) — c'est le bug le plus visible et le plus systémique (51 séances touchées dans l'audit)
3. **Cette semaine ou semaine prochaine** : Fix `feasibilityService.ts` avec factors révisés (élément C) — moins urgent car le patch live mxjulien02 traite déjà le cas le plus visible
4. **Cette semaine** : extension `planValidator.ts` règle `mainset_duration_mismatch` (filet de sécurité CI pour détecter toute régression future)

**Flag profils non testés mais à risque (à auditer après déploiement) :**
- Plans Marathon Confirmé/Expert avec cibles ambitieuses (probable IRRÉALISTE chez certains, statut actuel AMBITIEUX/BON)
- Plans 5K débutants (le fix C actuel ne classera **jamais** IRRÉALISTE un 5K si factor + 0.10 est conservé)
- Plans Trail D+ (le regex Fix D peut casser le mainSet `D+ cible 200m` si pas filtré dans whitelist)
- Plans Hyrox course (`8 × 1km` → vérifier que le regex anti-× fonctionne)
- Plans en mode marche-course (débutants/petite VMA) : whitelist doit exclure le pattern `(\d+) min course / (\d+) min marche`

---

Fin validation coach. Prêt pour décision Romane sur B1-B13.
