# Audit plan Hyrox 1h30 — wozniak.maeva2@gmail.com

> Audit demandé par Romane : "volume parait un peu faible. creuse pour voir si cest le cas ?"
> Scope strict : on audite UNIQUEMENT la partie course du plan Hyrox (pas les stations, pas le mixte cardio+stations).
> Date audit : 2026-05-19. Lecture seule (zéro modif Firestore).

---

## Client — wozniak.maeva2@gmail.com

| Champ | Valeur |
|---|---|
| UID | `sRLuCBE8yKMxlmWczdTAGcoL0H42` |
| Plan ID | `1779188625574` |
| Nom plan | `Prépa Course Hyrox — Objectif 1h30 — 21 sem.` |
| Date inscription | 2026-05-19 11:03:09 UTC (aujourd'hui, il y a ~1h) |
| Plan créé | 2026-05-19 11:03:45 UTC (saved Firestore 11:04:22) |
| Email vérifié | 2026-05-19 11:04:48 (a confirmé son mail) |
| Premium | `false` (preview only) |
| `isPreview` | `true` |
| `fullPlanGenerated` | `false` (S1 seule détaillée, S2-S21 = volumes projetés seulement) |
| Profil | Femme, 24 ans, 70 kg, 172 cm, BMI 23.66 (normal) |
| Niveau | Intermédiaire (Régulier) |
| Goal / subGoal | Hyrox — `targetTime: "1h30"` |
| Race date | 2026-10-10 (~21 semaines) |
| Frequency | **3 séances/sem** (doctrine : 3 = 2 course + 1 renfo) |
| `currentWeeklyVolume` | **10 km/sem** |
| PB déclaré | 5 km en 30 min (= 6:00/km → VMA calculée 10.526 km/h) |
| Blessures | `hasInjury: true` — "douleurs genoux/ménisques" |
| Commentaire user | "je peux courir du tapis de course" |
| Localisation | Genève |
| Modèle IA | gemini-2.5-flash |
| Confidence score | 70 |
| Source VMA | "5km en 30min" (déclarative via PB, pas test VMA) |

---

## 1. Allure cible

| Paces (calculées sur VMA 10.5 km/h) | Valeur |
|---|---|
| `vmaPace` (100% VMA) | 5:42 /km |
| `seuilPace` | 6:33 /km |
| `allureSpecifique5k` | 6:00 /km |
| `allureSpecifique10k` | 6:20 /km |
| `allureSpecifiqueSemi` | 6:42 /km |
| `allureSpecifiqueMarathon` | 7:07 /km |
| `eaPace` (endurance active) | 7:24 /km |
| `efPace` (endurance fondamentale) | 8:30 /km |
| `recoveryPace` | 9:30 /km |

**Cible course Hyrox 1h30 calculée** :
- Hyrox total 1h30 = 8 × 1 km course + 8 stations.
- Si stations ~45 min (objectif femme intermédiaire), il lui reste ~45 min pour 8 km de course → pace cible **~5:37/km**.
- Plus réaliste (stations 50 min) : 40 min sur 8 km → **5:00/km** (très exigeant).
- Avec sa VMA actuelle 10.5 km/h (5:42/km à 100% VMA), tenir 5:37/km sur 8 km entrecoupés de stations = quasi-impossible. Même sous 6:00/km (son allure 5k pure) c'est déjà très dur en jambes carbonisées par les stations.

**Verdict allure cible** : ❌ **VMA insuffisante pour objectif 1h30 réel**.
- Pour viser 1h30 il faudrait courir ~5:37/km en jambes lourdes → VMA cible ≥ ~12-13 km/h.
- Avec VMA 10.5, objectif réaliste = ~1h45-1h55.
- **Mais doctrine `feedback_jamais_baisser_allure_cible` + `feedback_input_client_obligatoire` : on NE TOUCHE PAS à la cible.** Statut feasibility + welcomeMessage doivent la prévenir → le plan le fait partiellement (cf §4).

Le plan utilise correctement `efPace` pour les footings S1 (allure 8:30 affichée dans les 3 séances course).

---

## 2. Volume hebdo + pic + distribution ⭐ FOCUS

### WeeklyVolumes complet (km)

| Sem | Phase | Vol (km) | Δ vs sem précédente |
|---:|---|---:|---:|
| 1  | fondamental    | 10 | — |
| 2  | fondamental    | 11 | +10 % |
| 3  | fondamental    | 12 | +9 % |
| 4  | recuperation   | 10 | -17 % |
| 5  | fondamental    | 12 | +20 % |
| 6  | fondamental    | 11 | -8 % |
| 7  | developpement  | 12 | +9 % |
| 8  | recuperation   | 10 | -17 % |
| 9  | developpement  | 12 | +20 % |
| 10 | developpement  | 11 | -8 % |
| 11 | developpement  | 12 | +9 % |
| 12 | recuperation   | 10 | -17 % |
| 13 | developpement  | 12 | +20 % |
| 14 | specifique     | 11 | -8 % |
| 15 | specifique     | 12 | +9 % |
| 16 | recuperation   | 10 | -17 % |
| 17 | specifique     | 12 | +20 % |
| 18 | specifique     | 11 | -8 % |
| 19 | specifique     | 12 | +9 % |
| 20 | recuperation   | 10 | -17 % |
| 21 | affutage       | 6  | -40 % |

### Métriques

- **S1 = 10 km/sem** = `currentWeeklyVolume` user (10) → ✅ respecte doctrine `feedback_input_client_obligatoire`.
- **Pic = 12 km/sem** (atteint 9 fois entre S3 et S19).
- **Pas de progression de pic** : le plan oscille 10-12 km pendant 20 semaines. **Aucune montée en charge**.
- **Saut max** : +20 % (S4→S5, S8→S9, S12→S13, S16→S17). Acceptable.
- **Total bloc course** : 229 km sur 21 semaines (moyenne 10.9 km/sem).
- **Affûtage** : -40 % S20→S21. Cohérent.
- **Phases** : fondamental S1-S3, dev S7-S13, spécifique S14-S19, affûtage S21. Découpage théorique OK.

### Référentiel coach Hyrox 1h30 (Intermédiaire/Confirmé)

D'après nos audits Hyrox précédents (Bramoullé, Hammond, UTMB Academy) + référentiel coach :
- **Pic volume course attendu : 30-40 km/sem**
- SL : 12-18 km
- Présence séances spécifiques au pace Hyrox cible (5:37-6:15 /km)

### Verdict volume

**❌ CONFIRMÉ — volume très largement insuffisant pour un objectif compétitif Hyrox 1h30.**

| Critère | Plan actuel | Référentiel 1h30 | Écart |
|---|---:|---:|---:|
| Pic vol course/sem | **12 km** | 30-40 km | **-60 % à -70 %** |
| Vol moyen /sem | 10.9 km | 25-30 km | -60 % |
| Pic vs S1 (progression) | **×1.2** | ×2.5-×3 | quasi stagnation |
| SL S1 max | 5.5 km | 8-10 km | -45 % |
| Présence allures Hyrox (5:37-6:20) | aucune en S1 | dès S4-S6 | 0 |

Le plan tient un volume *de reprise* (10-12 km/sem) du début jusqu'à la fin. C'est cohérent avec :
- ✅ La protection blessure (genoux/ménisques) → garder un vol bas est prudent.
- ✅ Frequency 3 (dont 1 renfo) → seulement 2 séances course/sem, ça plafonne mécaniquement.
- ❌ MAIS incompatible avec l'objectif chrono 1h30 affiché.

**Cause racine probable** : la combinaison **frequency 3 + 1 renfo obligatoire + blessure déclarée + VMA 10.5 km/h + currentVolume 10 km** verrouille le générateur sur un plan ultra-prudent. Le LLM a optimisé pour la sécurité (justifié vu la blessure) mais n'a pas raconté la limite à l'utilisatrice (cf §5).

---

## 3. SL S1 + projection SL pic

### S1 — sessions course détail

| Jour | Type | Distance | Pace | Durée |
|---|---|---:|---|---:|
| Lundi | Jogging "blocs souples" (5×5min footing + 1min marche) | **5.5 km** | 8:30 | 47 min |
| Mercredi | Renforcement Hyrox quadriceps/genoux | 0 km | N/A | 35-40 min |
| Vendredi | Jogging sentier roulant | **4.5 km** | 8:30 | 38 min |

- **SL S1 = 5.5 km / 47 min** (le footing Lundi est en pratique la "longue" car la séance la plus volumineuse).
- Ratio SL/vol S1 = 5.5/10 = **55 %** → trop élevé. Standard recommandé 30-40 %. Mais ici avec seulement 2 séances course, mécanique inévitable.
- **Aucun fractionné ni travail allure** en S1 (cohérent phase fondamental).

### Projection SL pic (S15-S19)

Le plan ne détaille pas S2-S21 (`fullPlanGenerated: false`), mais avec vol pic 12 km et 2 sessions course + 1 renfo : la SL pic plafonnera autour de **7-8 km**. Pour un objectif Hyrox 1h30 il faudrait des SL pic 12-15 km (simuler la fatigue cumulée des 8 km Hyrox + résidu stations).

**Verdict SL** : ⚠️ S1 acceptable pour reprise post-blessure ; ❌ projection pic SL trop faible pour cible 1h30.

---

## 4. Faisabilité

```
feasibility.status   = "BON"
feasibility.score    = 70
feasibility.message  = "Ton objectif de finisher sur ce cette course est tout
                        à fait atteignable. Avec ta VMA de 10.5 km/h,
                        concentre-toi sur la régularité. Blessure déclarée :
                        adapte les séances et consulte un professionnel de santé."
feasibility.safetyWarning = "Fais valider la reprise avec ton kiné/médecin
                              avant de démarrer ce plan. Adapte les séances si
                              nécessaire.

                              ⚠️ DURÉE DU PLAN : 21 semaines, c'est long pour
                              ton profil. La plupart des coureurs de ton niveau
                              préparent cette distance en 14 semaines maximum.
                              Un plan trop long peut entraîner de la lassitude
                              et une stagnation. Si tu te sens prêt, tu peux
                              envisager de rapprocher ta date de début."
```

### Bugs faisabilité

1. ❌ **Message dit "finisher" alors que `targetTime = 1h30`** (objectif chrono compétitif, pas finish).
   - Doctrine `feedback_securite_avant_conversion` : transparence + décharge explicite, jamais embellir un plan irréaliste.
   - Le plan EMBELLIT silencieusement : il déclasse l'objectif "1h30" en "finisher" sans le dire à la cliente. Elle voit "BON" et "atteignable" → croit qu'avec ce plan elle fera 1h30.
   - **C'est exactement le scénario interdit par la doctrine.**

2. ❌ **Aucune mention que VMA 10.5 km/h est insuffisante pour 1h30**.
   - Pour 1h30 il faut pace course ~5:37/km en jambes carbo, son `vmaPace` à 100 % VMA est 5:42 → elle devrait courir au-delà de sa VMA pendant 8 km, infaisable.
   - Le score 70 + status "BON" est mensonger sur la cible chrono.

3. ⚠️ **safetyWarning "21 sem trop long"** : standard générique, pas pertinent ici. Avec une blessure genoux + reprise vol 10 km, 21 semaines est au contraire prudent.

4. ✅ Mention médecin/kiné présente (cohérent doctrine `feedback_securite_avant_conversion` vu la blessure déclarée).

**Verdict faisabilité** : ❌ **bug critique de transparence** — score gonflé + cible silencieusement déclassée en "finisher".

---

## 6. Variation séances S1

S1 contient 3 séances :

| # | Type | Titre | Location | mainSet original ? |
|---|---|---|---|---|
| 1 | Jogging | "Footing en blocs souples" | Berges du Rhône | ✅ Format blocs 5×(5min run + 1min marche), original |
| 2 | Renforcement | "Renfo Hyrox Focus A - Quadriceps & Prévention Genou (S1)" | À la maison | ✅ Circuit 3 tours, 7 exos ciblés genoux, **adapté blessure** |
| 3 | Jogging | "Footing sur sentier roulant" | Parc La Grange | ✅ Footing 20 min D+ diffus |

- ✅ **2 jogging mais formats différents** (blocs souples vs sentier vallonné) → bonne variation.
- ✅ **Locations distinctes** sur 3 séances : Berges Rhône, maison, Parc La Grange. Doctrine variation respectée.
- ✅ **Renfo titré "Hyrox Focus A — Quadriceps & Prévention Genou"** = adapté à la blessure user. Excellent travail.
- ✅ **Conseils originaux** par séance (pas de copier-coller).
- ⚠️ Mode marche-course (5 min run + 1 min marche) sur la SL : doctrine `feedback_mode_marche_course_scope` = réservé débutants/petite VMA. Maeva = **Intermédiaire**. C'est limite. Justifiable ici par la blessure (limiter impact mécanique) — le `advice` le justifie clairement ("découper l'effort permet d'accumuler du volume aérobie en réduisant la charge mécanique"). Acceptable par exception blessure mais ne devrait pas durer plus de 2-3 semaines.
- ⚠️ Le renfo ne contient **aucun mouvement spécifique stations Hyrox** (pas de sled push pattern, pas de wall ball pattern). C'est du renfo prévention genou pur. **Conforme scope strict course Coach Running IA** mais le titre "Renfo Hyrox" est trompeur.

**Verdict séances** : ✅ S1 de qualité avec bonne variation et adaptation blessure. Bémol mineur sur le branding "Hyrox" du renfo.

---

## 5. WelcomeMessage

Texte intégral :

> "Bonjour ! Ce plan d'entraînement se concentre spécifiquement sur la partie course à pied de ta préparation Hyrox ; tes séances de renforcement fonctionnel liées aux stations (sled push, wall balls, etc.) sont à gérer en parallèle. Les semaines 1-3, comme celle-ci, poseront une base aérobie solide et un travail technique initial. Tu introduire progressivement des fartleks et des accélérations courtes dès les semaines 4-6. Les simulations Hyrox plus spécifiques, progressant de 4×1km à 8×1km, débuteront à partir de la semaine 7, avec enfin une phase d'affûtage ciblée pour le jour J. Cette approche progressive est conçue pour te mener à ton objectif d'1h30 sur Hyrox avec une capacité de relance optimale et une endurance de fer. Compte tenu de tes douleurs aux genoux/ménisques, ce plan privilégie une progression très douce du volume, des surfaces souples et des séances d'endurance fondamentale pour limiter l'impact. Il est crucial d'écouter attentivement ton corps : en cas de moindre gêne ou douleur persistante, n'hésite pas à lever le pied et à consulter un professionnel de santé avant de reprendre. Nous te recommandons également de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport."

### Conformité doctrine

| Critère | Statut | Note |
|---|---|---|
| Pas de poids/IMC/minceur | ✅ | Aucune mention |
| Pas de nutrition/chiffres | ✅ | Aucune mention |
| Mention médecin (blessure déclarée) | ✅ | Présente 2× (kiné + médecin certificat) |
| Scope Hyrox = course uniquement | ✅ | "spécifiquement sur la partie course à pied […] tes séances de renforcement fonctionnel liées aux stations […] sont à gérer en parallèle" — **exactement la phrase doctrine demandait** |
| Transparence cible 1h30 atteignable ? | ❌ | "conçue pour te mener à ton objectif d'1h30" alors que la VMA 10.5 est insuffisante. **Doctrine `feedback_securite_avant_conversion` violée**. |
| Pédagogie progression | ✅ | Roadmap S1-3 base, S4-6 fartleks, S7+ simulations 4×1km→8×1km bien expliquée |
| Pas de cross-training | ✅ | Aucune mention vélo/natation |
| Faute français | ⚠️ | "Tu introduire" (devrait être "Tu introduiras") — typo |

**Verdict welcomeMessage** : ✅ globalement bon (scope Hyrox correctement borné, blessure traitée, médecin OK) ❌ **mais affirmation "te mener à ton objectif d'1h30" mensongère** vu volume 12 km/sem pic + VMA 10.5.

---

## Synthèse wozniak.maeva

### ✅ Points positifs

1. **Scope Hyrox correctement borné** dans le welcomeMessage : "partie course à pied, stations à gérer en parallèle". Doctrine `project_coach_running_ia_hyrox_scope` respectée.
2. **Adaptation blessure** : renfo titré spécifiquement "Quadriceps & Prévention Genou", surfaces souples, mode marche-course justifié, mention kiné/médecin double.
3. **Vol S1 = 10 km = `currentWeeklyVolume`** → doctrine `feedback_input_client_obligatoire` respectée.
4. **Variation S1** : 3 séances aux formats/locations/objectifs distincts.
5. **Pas de poids ni nutrition** dans le message.
6. **Roadmap pédagogique claire** semaines 1-3 / 4-6 / 7+ / affûtage.

### ⚠️ Points d'attention

1. **Mode marche-course chez Intermédiaire** (limite doctrine `feedback_mode_marche_course_scope`) — justifié ici par blessure, mais à ne pas étendre au-delà de S2-S3.
2. **Renfo branded "Hyrox"** alors qu'il est en réalité du renfo prévention genou (pas de pattern stations). Cohérent scope strict mais branding trompeur.
3. **safetyWarning "21 sem trop long"** : message générique pas adapté ici (avec blessure + reprise vol 10, c'est même prudent).
4. **Typo welcomeMessage** : "Tu introduire" → "Tu introduiras".
5. **SL pic projetée ~7-8 km** : très en-dessous standard Hyrox (12-15 km).

### ❌ Bugs critiques

1. **VOLUME COURSE TRÈS INSUFFISANT POUR 1h30** (réponse directe à Romane).
   - Pic = **12 km/sem** vs référentiel Hyrox 1h30 = **30-40 km/sem**.
   - Écart **-60 % à -70 %**. Plan plafonné à un volume de reprise pendant 20 semaines.
   - Aucune progression de volume (10→12, ×1.2 sur 20 semaines vs ×2.5-3 attendu).

2. **Faisabilité mensongère / cible silencieusement déclassée**.
   - User demande `targetTime = "1h30"` (chrono compétitif).
   - `feasibility.message` répond "objectif de **finisher** […] tout à fait atteignable" → glissement sémantique vers "finisher" non assumé.
   - Status "BON" + score 70 sans avertir que VMA 10.5 km/h est trop juste pour pace cible 5:37/km.
   - **Viole doctrine `feedback_securite_avant_conversion` (transparence + décharge explicite, jamais embellir un plan irréaliste).**
   - Le welcomeMessage enfonce le clou : "conçue pour te mener à ton objectif d'1h30" → faux.

3. **Pace cible 1h30 incompatible VMA actuelle**.
   - Pace course Hyrox cible : ~5:37/km en jambes carbo stations.
   - `vmaPace` 100 % VMA = 5:42/km. Impossible de tenir 8 × 1 km au-delà de la VMA.
   - Objectif chrono réaliste cohérent avec VMA 10.5 = **~1h45-1h55**.

### Réponse Romane "volume trop faible ?"

> **OUI, CONFIRMÉ. Pic 12 km/sem vs référentiel Hyrox 1h30 = 30-40 km/sem. Écart -60 à -70 %.**
>
> Volume du plan ≈ volume *de reprise post-blessure*, pas volume *préparation compétitive 1h30*. Le plan stagne à 10-12 km/sem pendant 20 semaines sans aucune montée en charge.
>
> En l'état, ce plan amène raisonnablement Maeva à **terminer un Hyrox en ~1h45-1h55** (cohérent avec VMA 10.5 km/h), pas à viser 1h30.

### Action recommandée

**Contexte décisif pour patch live** :
- Plan créé **aujourd'hui 2026-05-19 à 11:03**, audit lancé ~1h après (12:00+).
- `isPreview: true`, `fullPlanGenerated: false`, `isPremium: false` → **plan en preview uniquement, S1 pas encore vécue**.
- `adaptationLog.adaptationsThisWeek = 0` → aucune adaptation appliquée.
- Doctrine `feedback_patch_live_plans_jour_seulement` : ✅ **patch live possible** (plan du jour, S1 prévue lundi 2026-05-18 → mais startDate plan = 18/05, donc S1 a déjà commencé hier. À vérifier avec Romane si patch live OK ou si on attend régénération).

**Hiérarchie problèmes** :
1. **Pas de patch du volume** (interdit doctrine `feedback_jamais_baisser_allure_cible` + sa version inverse implicite : on ne *force* pas non plus un volume trop haut sur quelqu'un avec blessure genou déclarée). **Le vrai problème n'est pas le volume bas — c'est la promesse 1h30 mensongère**.
2. **Patch transparence requis** sur 3 endroits :
   - `feasibility.message` : retirer "finisher tout à fait atteignable", écrire clairement "Avec ta VMA actuelle 10.5 km/h et ta blessure, l'objectif 1h30 sur Hyrox est très ambitieux ; ce plan vise d'abord à courir l'événement en sécurité (~1h45-1h55) tout en progressant. Pour viser 1h30, il faudrait une VMA ≥ 12 km/h et un volume course autour de 30 km/sem incompatible avec ta blessure actuelle."
   - `feasibility.score` : passer de 70 à ~40-50 (objectif chrono peu réaliste, plan néanmoins sécurisé).
   - `welcomeMessage` : remplacer "conçue pour te mener à ton objectif d'1h30" par formulation transparente (ex : "Compte tenu de ta VMA actuelle et de ta blessure, ce plan privilégie une participation Hyrox réussie et sans dommage ; viser 1h30 strict reste très ambitieux et dépendra de ta progression VMA et de la cicatrisation"). Corriger aussi la typo "Tu introduire".
3. **Confirmer scope Hyrox course pure** : welcomeMessage le fait déjà — RAS.

**Que NE PAS patcher** :
- ❌ Ne pas toucher `targetTime` "1h30" → doctrine `feedback_jamais_baisser_allure_cible`.
- ❌ Ne pas gonfler artificiellement le pic à 30 km/sem → blessure genou + frequency 3 + currentVol 10 km rendent ça dangereux. Le plan est correctement calibré sur la *santé* de Maeva, c'est uniquement la *communication* qui ment.
- ❌ Ne pas suggérer cross-training (vélo/natation) pour compenser le vol bas → doctrine `feedback_coach_running_ia_que_course`.

**Décision à valider avec Romane** :
- Plan généré ce matin → si S1 (lun 18/05) déjà commencée par Maeva, patch live S1 = interdit. Mais le patch ici ne touche QUE `feasibility.message`, `feasibility.score`, `welcomeMessage` (pas les séances) → safe à patcher live.
- Si Romane veut régénérer plutôt qu'éditer : régénération recommandée car le générateur reproduira probablement la même erreur (root cause = LLM qui n'audite pas la cohérence VMA ↔ targetTime sur Hyrox).

---

## Annexes — fichiers générés

- `/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-user.json` — doc user brut Firestore
- `/Users/romanemarino/Coach-Running-IA/audit-wozniakmaeva-plan.json` — plan brut Firestore
- `/Users/romanemarino/Coach-Running-IA/find-wozniakmaeva.mjs` — script résolution UID par email
- `/Users/romanemarino/Coach-Running-IA/fetch-wozniakmaeva.mjs` — script fetch user + listing plans
- `/Users/romanemarino/Coach-Running-IA/fetch-wozniakmaeva-plan.mjs` — script fetch plan
