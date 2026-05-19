# AUDIT — mxjulien02@gmail.com

> Audit post-preview au format template 5 dimensions (`project_template_analyse_post_preview`).
> Contexte Romane : « VMA presque égale au semi, AMBITIEUX +++ ! » — question centrale : **le score AMBITIEUX est-il trop positif ? Devrait-on afficher IRRÉALISTE ?**
> Plan analysé tel quel (avant fix). Lecture seule Firestore.

---

### Client — mxjulien02@gmail.com

| Champ | Valeur |
|---|---|
| UID | `QbrsSt4UgvRxU7xkJMCAbybUGW52` |
| Plan ID | `1779147815002` |
| Nom plan | `Préparation Semi-Marathon en 2h00 — 19 sem.` |
| Date inscription | `2026-05-18T23:43:11Z` (= hier) |
| Dernière connexion | `2026-05-18T23:43:10Z` |
| Source | `web` |
| isPreview | `true` (S1 seule générée, `fullPlanGenerated: false`) |
| isPremium | `false` |
| Profil | Homme, 39 ans, 90 kg, 183 cm, **BMI = 26.87 (surpoids)** |
| Niveau | Intermédiaire (Régulier) |
| Goal / SubGoal | Course sur route / Semi-Marathon |
| targetTime | **2h00** |
| raceDate | 2026-09-26 (J+131 = 19 semaines pleines) |
| frequency | 4 (= 3 course + 1 renfo) |
| currentWeeklyVolume | 25 km |
| VMA déclarée/calculée | **10.807 km/h** (moyenne 5K 28min + 10K 1h06) |
| PB déclarés | 5K = 28min (≈ 5:36/km) ; 10K = 1h06 (≈ 6:36/km) |
| Blessures | Non |
| Jours dispos course | Lun / Mar / Ven / Sam (+ SL Dim) |
| Commentaire user | « Je travail de nuit. » |
| Ville | Saint-Quentin |

---

#### 1. Allure cible

- Allure semi affichée : `allureSpecifiqueSemi = 5:41 min/km` = **10.557 km/h**
- VMA estimée : 10.807 km/h → **% VMA cible semi = 97.7 % VMA**
- Allure VMA-based théorique pour un Semi (référentiel 80–85 % VMA Intermédiaire) :
  - 80 % VMA = 8.65 km/h = **6:56/km**
  - 85 % VMA = 9.19 km/h = **6:32/km**
- Allure PB :
  - 10K 1h06 → **6:36/km** (= 84.1 % VMA) — cohérente avec un intermédiaire
  - 5K 28min → **5:36/km** (= 99 % VMA, effort court max)
- Prédictions Riegel pour Semi :
  - Depuis 10K 1h06 → **2h25**
  - Depuis 5K 28min → **2h08**
  - Moyenne pondérée → **~2h17** (cohérent avec le `feasibility.message` qui annonce 2h18)
- Gap chrono : 2h17 prédit → 2h00 visé = **−17 min** = **−48 à −52 s/km plus rapide à tenir sur 21 km**

**Verdict : ❌**
Tenir 97.7 % VMA pendant 21 km est **physiologiquement impossible** hors élite (le seuil lactique se situe à 88–92 % VMA, tenable max ~1h). Pour un intermédiaire 39 ans BMI 26.87, l'allure semi tenable est **80–85 % VMA = 6:32–6:56/km**.

L'allure cible n'est PAS modifiée (doctrine `feedback_jamais_baisser_allure_cible` respectée), c'est correct, mais alors **la doctrine `feedback_securite_avant_conversion` impose que le statut faisabilité et le welcome préviennent honnêtement**. À voir Dimension 4.

---

#### 2. Volume hebdo

Tableau complet `generationContext.periodizationPlan.weeklyVolumes` (toutes les 19 sem) :

| Sem | Vol (km) | Phase | Δ vs sem précédente |
|---|---|---|---|
| 1 | **25** | fondamental | (= current 25 km, OK) |
| 2 | 27 | fondamental | +8.0 % |
| 3 | 29 | fondamental | +7.4 % |
| 4 | 23 | **récup** | −20.7 % |
| 5 | 26 | fondamental | +13.0 % |
| 6 | **29** | développement | +11.5 % |
| 7 | 23 | **récup** | −20.7 % |
| 8 | 26 | développement | +13.0 % |
| 9 | **29** | développement | +11.5 % |
| 10 | 23 | **récup** | −20.7 % |
| 11 | 26 | développement | +13.0 % |
| 12 | **29** | spécifique | +11.5 % |
| 13 | 23 | **récup** | −20.7 % |
| 14 | 26 | spécifique | +13.0 % |
| 15 | **29** | spécifique | +11.5 % |
| 16 | 23 | **récup** | −20.7 % |
| 17 | 26 | spécifique | +13.0 % |
| 18 | 19 | affûtage | −26.9 % |
| 19 | 15 | affûtage | −21.1 % |

- **Volume S1 = 25 km = currentWeeklyVolume** (pas de baisse, ✅)
- **Pic = 29 km** atteint 5 fois (S3, S6, S9, S12, S15) — plateau, jamais dépassé
- Saut max +13 % (S5, S8, S11, S14, S17) — sous le 15 % ACSM, ✅
- Affûtage 2 dernières sem : −34.5 % (29 → 19 → 15), ✅
- Décharges régulières S4/S7/S10/S13/S16 (1 sur 3 sem), ✅

**🚨 Problème critique — volume pic sous-dimensionné pour Semi en 2h00**

Référentiel coaching pour un Intermédiaire visant un Semi en 2h00 :
- Pic volume cible **40–50 km/sem** minimum
- SL pic 16–22 km
- Ici pic = **29 km/sem** → écart **−27 à −42 %** par rapport au référentiel
- Ratio pic/current = 29/25 = **+16 % seulement** sur 17 sem de fondamental/développement/spécifique = stagnation

Le plan **respecte la doctrine "ne pas baisser"** mais **plafonne à un niveau insuffisant** pour préparer un semi à 97.7 % VMA. Cohérent avec le verdict : on prépare en réalité un semi ~2h15–2h25, pas 2h00.

**Verdict : ⚠️**
Volume S1 OK, progression saine, mais pic à 29 km **insuffisant pour l'objectif chrono affiché**. Reflète honnêtement la réalité physiologique : si on visait vraiment 2h00, il faudrait monter à 40+ km/sem ce qui ne serait pas tenable pour ce profil sur 19 sem (saut +60 % vs current = trop risqué). Donc volume cohérent avec capacité user, **incohérent avec chrono cible**.

---

#### 3. SL S1 + projection SL pic

- **SL S1** (Dimanche) :
  - Distance : **9 km**
  - Durée : **1h15** (warmup 10 min + mainSet 55 min + cooldown 10 min)
  - Allure : 8:17/km (= efPace, EF pure)
  - D+ : 0 m
  - Ratio SL S1 / volume course S1 (24.8 km) = **36.3 %** → dans la cible 25–40 % ✅
- **Projection SL pic** (sem 12 ou 15 = 29 km × 0.4 à 0.5) = **11.6 à 14.5 km**

**🚨 Problème — SL pic projetée 11.6–14.5 km vs référentiel 16–22 km pour Semi**

La SL pic projetée **ne dépasse pas 14.5 km**, soit **69 % de la distance course (21.1 km)**. Référentiel coaching pour Semi : SL pic 16–22 km (75–100 % de la distance). Avec une SL pic à 14.5 km max, le user **n'aura jamais couru plus de 14.5 km** avant le jour J de 21.1 km. Risque élevé de mur à partir du 15ᵉ km, surtout à allure tendue.

**Verdict : ⚠️**
SL S1 cohérente avec le niveau et le volume S1 (ratio 36 %, bon). Mais la **projection SL pic est sous le seuil minimum référentiel** — confirme que le plan ne prépare pas réellement à 2h00.

---

#### 4. Faisabilité ⭐ FOCUS — la question de Romane

##### Données brutes

```json
"feasibility": {
  "status": "AMBITIEUX",
  "score": 65,
  "message": "Avec ta VMA de 10.8 km/h, ton temps théorique sur semi-marathon est d'environ 2h18min. Viser 2h00min demande une VMA d'environ 12.4 km/h. C'est un écart significatif par rapport à ton niveau actuel. Ce plan te fera progresser, mais un objectif autour de 2h18min serait plus réaliste pour cette préparation.",
  "safetyWarning": "Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c'est possible. Pense à bien t'hydrater.",
  "recommendation": "un temps cible de 2h25min"
}
```
`confidenceScore` racine = 65 (cohérent avec score)

##### Bugs / incohérences détectés

1. **🚨 Contradiction interne** : `message` recommande **2h18min** comme cible réaliste, mais `recommendation` (champ séparé) dit **2h25min**. Le user voit **deux chiffres différents** selon ce qui est affiché en front. Bug à patcher.
2. `safetyWarning` ne mentionne **aucun risque lié au BMI 26.87** (surpoids) ni à l'âge 39 (mineur mais avec BMI > 25, une recommandation cardio est attendue par doctrine). Le welcomeMessage le mentionne, mais pas le safetyWarning.
3. Aucun mot sur le travail de nuit (le user l'a précisé en commentaire — impact récupération réel).

##### Analyse critique du statut AMBITIEUX vs IRRÉALISTE

**Grille de classification (référentiel interne implicite)** :
- BON : gap chrono < 5 % vs prédiction Riegel
- AMBITIEUX : gap 5–10 % (atteignable avec bon entraînement et délai suffisant)
- IRRÉALISTE : gap > 10 % OU allure cible > 90 % VMA OU délai insuffisant pour combler le gap

**Application au cas Julien** :
- Prédiction Riegel moyenne = 2h17 → cible 2h00 → gap = **−12.4 %** sur le chrono
- Allure cible = **97.7 % VMA** (largement au-dessus du seuil 88–92 %)
- Délai 19 sem (favorable) — MAIS pic plafonné à 29 km/sem (insuffisant pour combler le gap)
- Gain VMA réaliste en 19 sem pour un Intermédiaire = +5 à +7 % grand max = VMA fin de plan ~11.3–11.5 km/h → allure semi réaliste à fin de plan ~6:25–6:35/km → **temps prédit 2h15–2h18**, jamais 2h00

**Les 3 critères IRRÉALISTE sont coches :**
- ✅ Gap > 10 % (12.4 %)
- ✅ Allure > 90 % VMA (97.7 %)
- ✅ Délai insuffisant pour combler le gap (même +7 % VMA ne donne pas 2h00)

##### Réponse explicite à Romane

> *« Le score AMBITIEUX est-il trop positif ? Devrait-on afficher IRRÉALISTE ? »*

**OUI, le statut AMBITIEUX est trop positif. La classification correcte est IRRÉALISTE.**

Justification chiffrée :
- Allure cible = **97.7 % VMA** sur 21 km → **physiologiquement impossible** (le seuil lactique pour un Intermédiaire est ~88–92 % VMA, tenable max 45–60 min, pas 2h)
- Riegel depuis 10K 1h06 → semi prédit **2h25** (et non 2h18 comme dit le message — le message lisse en utilisant la moyenne 5K/10K qui surestime le potentiel semi)
- Gap chrono **−17 à −25 min** sur 21 km → impossible à combler en 19 sem avec un pic volume plafonné à 29 km
- Pic SL projetée 11.6–14.5 km → user n'aura jamais couru plus de 14.5 km avant le jour J de 21.1 km

**Le message actuel reste honnête sur les chiffres** (mentionne « 2h18 plus réaliste », « écart significatif ») mais le **statut AMBITIEUX adoucit la réalité**. La nuance compte : un user qui lit « AMBITIEUX » + plan détaillé pense souvent « c'est dur mais c'est faisable ». Lire « IRRÉALISTE » + alternative claire 2h15–2h20 force le déclic.

**Doctrine `feedback_securite_avant_conversion` :** « jamais embellir un plan irréaliste ». Ici on est précisément dans ce cas. Le score 65 est **trop haut** (devrait être 35–45) et le statut **devrait être IRRÉALISTE**.

**Nuance honnête (thèse adverse pour transparence) :**
- 19 sem est un délai long (non 13 comme évoqué par Romane — vérifié `durationWeeks=19`)
- Le user est Intermédiaire Régulier (pas débutant), donc capable de progresser
- Si le message recommande explicitement 2h18 / 2h25, on peut argumenter que « AMBITIEUX + message clair = transparence suffisante »

**Mais cette thèse ne tient pas face aux chiffres** : 97.7 % VMA tenu 2h c'est élite mondiale, pas Intermédiaire. La classification doit refléter la **biologie**, pas la durée du plan.

**Verdict : ❌** — statut AMBITIEUX trop positif, devrait être **IRRÉALISTE**. Bug + contradiction 2h18/2h25 à patcher dans `feasibilityService.ts`.

---

#### 6. Variation des séances S1

| # | Jour | Type | Titre | mainSet (extrait) | Intensité | Lieu |
|---|---|---|---|---|---|---|
| 1 | Lun | Jogging | **Footing en blocs souples** | 8 × (5 min EF + 1 min marche) à 8:17 | Facile | Parc d'Isle |
| 2 | Mar | Renforcement | **Renfo Focus A — Quadriceps & Gainage (S1)** | Circuit 2 tours : squats 3×9, bulgares 3×6, fentes 3×6, gainage 3×19–60s, dead bug 3×6, mollets 3×13 | Modéré | À la maison |
| 3 | Ven | Jogging | **Footing vallonné** | 44 min sur vallon doux à 8:17, foulée courte montée/descente | Facile | Forêt de Saint-Quentin |
| 4 | Dim | Sortie Longue | **Sortie longue en endurance fondamentale** | 55 min EF 8:17 + W/U + C/D 10 min chaque | Facile | Canal de Saint-Quentin |

- 3 séances course toutes à **8:17/km EF** (pas d'intensité S1, cohérent fondamental S1 — pas un défaut)
- 3 titres distincts, 3 mainSet différents (blocs / vallonné / SL continue) → ✅ variation
- 3 lieux différents (parc, forêt, canal) → ✅ variation locationSuggestion
- Renfo dimensionné Intermédiaire (charges modérées, gainage 19–60s — la fourchette 19s est étrange mais probablement progressive)
- Pas de marche-course (= correct, Intermédiaire — doctrine `feedback_mode_marche_course_scope` respectée)

**Verdict : ✅** Variation correcte sur la S1. Mainset blocs « 8 × 5 min + 1 min marche » est judicieux pour BMI 26.87 (charge mécanique fractionnée).

---

#### 5. WelcomeMessage

##### Texte intégral
> *« Bonjour et bienvenue dans ton plan d'entraînement pour le semi-marathon ! Cet objectif de 2h00 est ambitieux et demandera un investissement régulier. Ce programme est structuré sur 19 semaines pour te permettre de progresser de manière cohérente, en commençant par le renforcement de ta base d'endurance. Chaque semaine sera conçue pour développer progressivement tes capacités et te préparer au mieux. Je te recommande vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. »*

##### Checklist doctrine

| Critère | Statut |
|---|---|
| ❌ Aucune mention poids/IMC/minceur/silhouette/kilos | ✅ Respecté (zéro mention) |
| ✅ Ton préventif, allures user citées si fournies | ⚠️ « ambitieux » dit, mais **aucune allure citée**, aucune mention 2h18/2h25 |
| ✅ Pas commercial | ✅ |
| ✅ Mention sécurité (médecin/cardio si > 50 ans ou BMI > 30) | ⚠️ Mention médecin présente — **mais BMI 26.87 < 30 donc pas obligatoire par doctrine**, c'est un bonus OK |
| ✅ Si Finisher + PB : référence au PB déclaré | N/A (chrono visé, pas Finisher) |
| ✅ Si AMBITIEUX/IRRÉALISTE : transparence sans embellir | ⚠️ **Insuffisant** : « ambitieux et demandera un investissement régulier » est trop soft. Aucune mention chiffrée du gap, aucune alternative honnête (2h15 ou 2h20), pas de référence au PB 10K 1h06 |
| Pas de travail nuit pris en compte (commentaire user) | ⚠️ Le user a précisé « Je travail de nuit » → impact récupération réel non commenté |

**Verdict : ⚠️**

Le message est **propre côté doctrine poids** (parfait, zéro mention). Il prévient à minima (« ambitieux », « consulter un médecin »). **Mais il est trop édulcoré pour un plan IRRÉALISTE** :
- Pas de gap chrono explicite (« ton temps prédit est 2h17–2h25, 2h00 demande un saut de niveau important »)
- Pas d'alternative honnête (« si tu veux sécuriser, vise 2h15–2h20, on adaptera si tu progresses au-delà »)
- Pas de référence à son PB 10K 1h06
- Pas de mention du travail de nuit (impact réel récup)

C'est exactement le profil de message qui **embellit** la réalité = violation `feedback_securite_avant_conversion`.

---

### Synthèse mxjulien02

#### ✅ Points positifs
- VMA correctement calculée (moyenne 5K + 10K, source documentée)
- Allure semi cible respectée à 5:41/km (= 2h00 mathématique, doctrine `feedback_jamais_baisser_allure_cible` respectée)
- Volume S1 = 25 km = currentWeeklyVolume (ne baisse pas, ✅ doctrine)
- Progression volume saine (sauts max +13 %, sous 15 % ACSM)
- Décharges régulières (1 sem sur 3)
- Affûtage 2 dernières sem clean
- SL S1 dimensionnée correctement (ratio 36 % du vol hebdo)
- Variation séances S1 (3 titres, 3 mainSet, 3 lieux)
- Frequency 4 = 3 course + 1 renfo (doctrine `project_coach_running_ia_frequence` respectée)
- Renfo bien construit pour profil BMI 26.87 (Focus quadri + gainage = articulations)
- Mode marche-course non utilisé (correct, Intermédiaire)
- Mention médecin présente (bonus, BMI < 30 ne l'imposait pas)
- Aucune mention poids/IMC dans le plan (doctrine `feedback_jamais_poids_minceur` respectée)

#### ⚠️ Points d'attention
- Volume pic 29 km **sous-dimensionné** pour Semi en 2h00 (référentiel : 40–50 km/sem)
- SL pic projetée 11.6–14.5 km **sous référentiel** Semi (16–22 km) — risque de mur après km 15
- WelcomeMessage trop édulcoré : pas de gap chrono cité, pas d'alternative honnête, pas de référence au PB 10K, pas de mention du travail de nuit
- `safetyWarning` ne mentionne ni BMI 26.87 ni travail de nuit

#### ❌ Bugs / problèmes critiques

1. **🚨 STATUT FAISABILITÉ TROP POSITIF**
   - Affiché : AMBITIEUX (score 65)
   - Réalité : **IRRÉALISTE** (allure 97.7 % VMA sur 21 km = impossible hors élite, gap chrono −17 min vs Riegel, gap −12 % > seuil IRRÉALISTE)
   - Doctrine violée : `feedback_securite_avant_conversion`

2. **🚨 CONTRADICTION INTERNE feasibility**
   - `message` recommande **2h18min**
   - `recommendation` recommande **2h25min**
   - Le user voit deux chiffres incompatibles selon ce que le front affiche

3. **Riegel mal calibré dans le message**
   - Le message dit « temps théorique ~2h18 »
   - Riegel pur depuis PB 10K 1h06 = 2h25 (vs 5K = 2h08, moyenne 2h17)
   - Pour Semi, c'est la prédiction depuis 10K qui est la plus fiable → devrait afficher 2h25, pas 2h18

#### Action recommandée

**Rappel doctrine `feedback_patch_live_plans_jour_seulement`** : plan créé hier (2026-05-18T23:43), aujourd'hui = 2026-05-19 → la preview a été vue, mais **S1 n'a pas encore été vécue** (start_date = 2026-05-18 mais user a découvert le plan il y a < 24 h, vol_S1 et SL_S1 toujours adaptables). Cas limite : techniquement plan « du jour », patch live envisageable si critique.

**Recommandations par priorité :**

1. **Patch code (pas patch live) — feasibilityService.ts** :
   - Reclasser AMBITIEUX → IRRÉALISTE quand allure cible > 90 % VMA (pour toute distance ≥ 10K)
   - Réconcilier `message` et `recommendation` (un seul chiffre, basé sur Riegel depuis la distance la plus longue déclarée)
   - Inclure BMI > 25 dans la modulation `safetyWarning` (pas seulement > 30)

2. **Patch live ce plan (optionnel — `feedback_patch_live_plans_jour_seulement` permet ici car S1 non vécue)** :
   - `feasibility.status` : IRRÉALISTE
   - `feasibility.score` : 35–40 (au lieu de 65)
   - `feasibility.message` : « Ton PB 10K en 1h06 prédit un semi autour de 2h25. Viser 2h00 demande un gain ~17 min impossible à atteindre en 19 sem sans saut de volume hebdo majeur (que ton historique ne permet pas en sécurité). Plan calibré sur 2h00 pour respecter ta cible, mais une cible plus saine serait 2h15–2h20 (à 6:25–6:35/km). On adaptera si tu progresses au-delà. »
   - `feasibility.recommendation` : « 2h15–2h20 »
   - `welcomeMessage` : réécriture intégrant le gap chiffré, le PB 10K, et le travail de nuit

3. **Pas de contact client direct** (doctrine `feedback_jamais_contact_client`). Tout patch éventuel se fait via Firestore, c'est Romane qui décide d'aviser ou pas.

4. **Garder l'allure 5:41/km telle quelle** (doctrine `feedback_jamais_baisser_allure_cible`). L'allure cible reste celle du user, on prévient via faisabilité + welcome, on n'écrase pas.

---

### Bilan question Romane

> *« Es-tu d'accord avec mon analyse : le score ambitieux est un peu trop positif ? »*

**OUI, 100 % d'accord.** Et plus que « un peu trop positif » : **trop positif d'un cran complet**. La classification correcte est **IRRÉALISTE**, pas AMBITIEUX. Les trois critères (allure > 90 % VMA, gap chrono > 10 %, gain physiologique impossible en 19 sem) cochent tous IRRÉALISTE.

Le seul angle où AMBITIEUX pourrait se défendre est « le délai est long (19 sem) » — mais cela ne change rien à la physiologie : 97.7 % VMA sur 21 km reste impossible quelque soit la prépa. La doctrine `feedback_securite_avant_conversion` tranche : honnêteté > conversion.

**Le bug n'est pas spécifique à Julien — c'est probablement systémique sur tous les profils où allure cible > 90 % VMA.** Patch code `feasibilityService.ts` recommandé pour reclasser ces cas.
