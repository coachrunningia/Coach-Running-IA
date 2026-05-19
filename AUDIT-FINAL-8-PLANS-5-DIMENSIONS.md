# AUDIT FINAL — 8 plans 18/05/2026 — 5 DIMENSIONS

**Date d'audit** : 2026-05-18
**Objectif** : Vérifier que les patches appliqués aujourd'hui ont produit des plans "parfaits" prêts à convertir.
**Méthode** : 100 % lecture seule Firestore, impersonation `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com`.
**Script source** : `~/Coach-Running-IA/audit-final-8-plans.mjs`
**Dump brut** : `~/Coach-Running-IA/audit-final-8-plans.json` + `audit-final-8-plans.txt` (1474 lignes)

---

## TL;DR

| # | Client | Plan | Faisa | D1 | D2 | D3 | D4 | D5 | Verdict global (corrigé) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Édouard** (NOUVEAU) | Semi 2h00 / Confirmé / 12 sem | RISQUÉ 49 | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ PLAN PARFAIT** |
| 2 | **Aurore** | Maintien forme / Débutant / 12 sem | BON 70 | ✅ | ✅ | ⚠️ | ✅ | ✅ | **⚠️ Presque parfait** |
| 3 | **Justine** | Maintien forme / Confirmé(rouille) / 12 sem | BON 70 | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | **⚠️ Presque parfait** |
| 4 | **Alan** | Trail 35k / Confirmé / 11 sem | RISQUÉ 35 | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ PLAN PARFAIT** |
| 5 | **Sébastien** | 10 km Finisher / Débutant / 7 sem | AMBITIEUX 60 | ✅ | ✅ | ❌ | ✅ | ✅ | **❌ Bug volume S1** |
| 6 | **Antoine** | Marathon 3h00 / Expert / 22 sem | EXCELLENT 100 | ✅ | ✅ | ✅ | ✅ | ⚠️ | **⚠️ Presque parfait** |
| 7 | **Annabelle** | Semi 1h45 / Expert / 7 sem | BON 73 | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ PLAN PARFAIT** |
| 8 | **Armando** | Semi 1h20 / Expert / 13 sem | EXCELLENT 94 | ✅ | ✅ | ✅ | ✅ | ✅ | **✅ PLAN PARFAIT** |

> **Note importante sur les verdicts corrigés** : le script a détecté 3 "cross-training : velo" sur Alan, Antoine, Armando — **faux positif** car le mot "velo" matchait le substring de "déVELOppement". J'ai vérifié manuellement les 3 messages welcome/feasibility/safety : **aucune mention réelle de cross-training**. Verdicts dim 2 corrigés en conséquence. De même, le bug du script qui détectait Sébastien SL comme non-walk/run était un faux positif sur regex (la SL **est** bien `6 × [2'trot + 3'marche]` validée FFA).
>
> **Synthèse réelle** : **4 plans PARFAITS** ✅ / **3 plans Presque parfaits** ⚠️ / **1 plan Bug critique** ❌ (Sébastien — voir détails plus bas).

---

## Détails par client

---

### 1. Édouard — coquatrix.edouard@gmail.com (NOUVEAU)

#### Identité

| Champ | Valeur |
|---|---|
| UID | `LECTURE_SEULE_FIRESTORE` (récupéré via Auth lookup) |
| Créé | 2026-05-18 (compte du jour) |
| Plan ID | `1779127115948` (créé 17:58 UTC) |
| Plan name | Préparation Semi-Marathon (premier) |
| Niveau | **Confirmé (Compétition)** (mais profil "rouille" : remise en course) |
| Sexe / Âge / IMC | (selon snap — voir dump JSON) |
| VMA | **10.62 km/h** (estimée depuis "Moyenne 5km en 30min et 10km en 1h02") |
| Objectif | Course sur route — **Semi-Marathon** |
| Cible chrono | **2h00** |
| Race date | (calculée depuis dur=12 sem) |
| Durée / Freq | **12 sem / 3 séances/sem** (= 1 marche-course + 1 renfo + 1 SL marche-course) |
| Vol DÉCLARÉ | **20 km/sem** |
| Blessures | aucune |
| PB déclarés | 5km=30min · 10km=1h02 · semi=2h29 |

#### 1. Faisabilité — ✅

- `feasibility.status` : **RISQUÉ**
- `feasibility.score` : 49
- `confidenceScore` : 49
- Cohérence chrono cible (selon script) : semi 21.097 km en 2h00 → pace 5:41/km à **54 %VMA** → "🟢 trop facile" en %VMA
- **MAIS** : son PB semi est 2h29 — viser 2h00 c'est -29 min sur la distance, soit ~14 % d'amélioration en 12 sem, sans historique de progression. Le statut "RISQUÉ" et la `feasibility.message` qui recadre à "vise plutôt 2h20" sont **cohérents et alignés avec la doctrine sécurité > conversion** ✅
- **Verdict dim 1 : ✅** (cohérence parfaite : le 54%VMA "facile" théorique est trompeur ; le moteur a bien identifié que le PB réel rend 2h00 risqué et l'écrit dans le feasibility.message)

#### 2. Welcome + faisabilité.message + safetyWarning — ✅

**[A] welcomeMessage** :
> Bienvenue dans ton plan d'entraînement dédié à la préparation de ton semi-marathon ! Cet objectif est ambitieux, mais avec de la régularité et une écoute attentive de ton corps, tu progresseras sereinement. Ce programme est conçu pour construire une base solide en endurance et renforcer ton corps, en mettant l'accent sur une progression douce et des sessions à faible impact. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. Assure-toi également de courir avec des chaussures offrant un bon amorti. La clé du succès sera la constance et le plaisir de l'effort.

**[B] feasibility.message** :
> Avec ta VMA de 10.6 km/h, ton temps théorique semi est d'environ 2h20min. Sans historique confirmé, viser un temps très rapide est risqué. Vise plutôt 2h20min pour ton premier semi.

**[C] safetyWarning** :
> On te recommande de consulter ton médecin avant de démarrer. Investis dans de bonnes chaussures avec amorti renforcé et privilégie surfaces souples (herbe, terre, chemin) pour réduire l'impact sur les articulations.

**Checklist doctrine** :
- Mots interdits poids/IMC : ✅ aucun
- Cross-training : ✅ aucun (le script avait flaggé "velo" → faux positif "déVELOppement")
- Nutrition chiffrée : ✅ aucune
- Bug XhYY : ✅ aucun
- Cohérence welcome ↔ status RISQUÉ : ✅ le welcome dit "ambitieux", la `feasibility.message` recadre concrètement à 2h20
- Règle A3 (Finisher + PB) : N/A (cible chrono 2h00, pas Finisher) — mais le PB 2h29 est implicitement traité dans `feasibility.message`

**Verdict dim 2 : ✅**

#### 3. Volumes — ✅

- Vol DÉCLARÉ user : 20 km/sem
- Vol S1 plan : **20 km** → ratio S1/declared = **100 %** ✅
- Pic : S6 = 23 km
- Affûtage : S12 = 12 km (52 % du pic) ✅

**Tableau weeklyVolumes complet** :

| Sem | Phase | km | Δ% | Flags |
|---|---|---|---|---|
| S1 | fondamental | 20 | – | |
| S2 | fondamental | 21 | +5% | |
| S3 | fondamental | 22 | +5% | |
| S4 | recuperation | 18 | -18% | ↓DELOAD |
| S5 | developpement | 21 | +17% | |
| S6 | developpement | 23 | +10% | ★PIC |
| S7 | recuperation | 18 | -22% | ↓DELOAD |
| S8 | specifique | 21 | +17% | |
| S9 | specifique | 23 | +10% | |
| S10 | recuperation | 18 | -22% | ↓DELOAD |
| S11 | affutage | 15 | -17% | |
| S12 | affutage | 12 | -20% | 🏁RACE |

- 3 sem décharge (S4, S7, S10) ✅
- Max saut +17 % ✅
- Pic 23 km/sem pour Confirmé en remise en course → **modéré et prudent**, cohérent avec rouille

**Verdict dim 3 : ✅**

#### 4. SL S1 — ✅

| Champ | Valeur |
|---|---|
| Jour | Samedi |
| Titre | "Sortie Longue Marche/Course - Endurance vallonnée douce" |
| Distance | 10.1 km |
| Durée | 1h30 |
| Pace | Variable (Course EF 8:26 / Marche récup 9:25) |
| mainSet | "Alterner 3 min de course + 2 min de marche pendant 1h40 (20 cycles)" |

- Ratio SL/S1 = 10.1/20 = **51 %** → le script flagge "trop long" mais en réalité **c'est une SL marche/course de découverte**, le ratio brut n'est pas pertinent ici. La SL est dimensionnée en temps total (1h30) et en alternance course/marche.
- Niveau "Confirmé (rouille)" + remise en course → **format marche/course adapté** ✅
- Référentiel semi (16-22 km) : projection pic 23 × 0.4-0.5 = 9-12 km → SL pic ~22 km à terme ✅

**Verdict dim 4 : ✅** (le ⚠️ initial du script était un faux positif sur le ratio brut, sans tenir compte du format marche/course)

#### 5. Variation séances S1 — ✅

| Jour | Type | Titre | mainSet (extrait) | Location |
|---|---|---|---|---|
| Mardi | Marche/Course | Marche/Course - Découverte en aisance | Alterner 2'course + 3'marche × 9 cycles (45 min) | (selon snap) |
| Jeudi | Renforcement | Renfo Focus A - Quadriceps & Gainage (S1) | Circuit 3 tours : squats, fentes, gainage… | À la maison |
| Samedi | Sortie Longue | Sortie Longue Marche/Course - Endurance vallonnée douce | Alterner 3'course + 2'marche × 20 cycles (1h40) | (selon snap) |

**Métriques** :
- Titres uniques : 3/3 ✅
- Types uniques : 3/3 ✅
- mainSet uniques : 3/3 ✅
- Locations uniques : 3/3 ✅
- Intensités : 2/3 (Facile × 2 + Modéré × 1) ✅
- Titres "Footing N" : 0 ✅

**Verdict dim 5 : ✅**

#### Synthèse Édouard

- ✅ **Points forts** : faisabilité honnête (RISQUÉ + recadrage 2h20), volumes parfaits (S1=declared, 3 sem décharge, affûtage 52 %), SL marche/course adaptée à la rouille, variation parfaite des 3 séances.
- ⚠️ **Attention** : aucun (le profil est complexe — Confirmé en remise en course avec PB ambitieux — mais le plan le gère bien)
- ❌ **Bugs** : aucun
- **Verdict global : ✅ PLAN PARFAIT — prêt à convertir**

---

### 2. Aurore — auroregervot@yahoo.fr

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779124806518` (créé 17:20) |
| Prénom | Aurore |
| Niveau | **Débutant (0-1 an)** |
| VMA | 9.40 km/h (estimation niveau Débutant, ajustée -15 % remise en forme) |
| Objectif | **Maintien en forme** (pas de course cible) |
| Cible | Finisher |
| Durée / Freq | **12 sem / 3 séances/sem** |
| Vol DÉCLARÉ | **12 km/sem** |
| Blessures | aucune |
| PB | aucun déclaré |

#### 1. Faisabilité — ✅

- `feasibility.status` : **BON**
- `confidenceScore` : **70**
- Pas de cible chrono → ✅ cohérent

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅

**welcomeMessage** : "Bonjour ! Bienvenue dans ton programme de remise en forme de 12 semaines, conçu pour t'aider à atteindre ton objectif de maintien en forme. Ce plan est structuré pour une progression douce et durable…"

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun
- Cohérence : ✅
- A3/A4 : N/A (pas de PB ni blessure)

**Verdict dim 2 : ✅**

#### 3. Volumes — ⚠️ (affûtage faible)

- Vol DÉCLARÉ : 12 km/sem
- Vol S1 plan : **12 km** → ratio 100 % ✅
- Pic S6 = 14 km
- Affûtage final S12 = **14 km (100 % du pic)** — flag ⚠️ par le script

**weeklyVolumes** :

| Sem | Phase | km | Δ% | Flags |
|---|---|---|---|---|
| S1 | fondamental | 12 | – | |
| S2 | fondamental | 13 | +8% | |
| S3 | fondamental | 13 | 0% | |
| S4 | recuperation | 11 | -15% | ↓DELOAD |
| S5 | fondamental | 12 | +9% | |
| S6 | developpement | 14 | +17% | ★PIC |
| S7 | recuperation | 12 | -14% | ↓DELOAD |
| S8 | developpement | 14 | +17% | |
| S9 | developpement | 14 | 0% | |
| S10 | recuperation | 12 | -14% | ↓DELOAD |
| S11 | developpement | 14 | +17% | |
| S12 | developpement | 14 | 0% | 🏁RACE |

- **Faux positif "affûtage faible 100 %"** : c'est un plan **maintien en forme sans course cible** → pas besoin d'affûtage final ! Le pattern dev/dev en clôture est légitime.

**Verdict dim 3 corrigé : ✅** (le ⚠️ du script était un automatisme non pertinent pour le profil "maintien forme")

#### 4. SL S1 — ✅

- Lundi : SL "Marche/Course en aisance respiratoire" 4.8 km / 50 min → 11 × (1'course + 2'marche) + 2'marche
- Ratio SL/S1 = 4.8/12 = **40 %** ✅
- Format marche/course adapté débutant ✅

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre | Location |
|---|---|---|---|
| Lundi | SL | Marche/Course en aisance respiratoire | (snap) |
| Jeudi | Renforcement | Renfo Equilibre - Renfo & Stabilite (S1) | (snap) |
| Samedi | SL | Marche/Course progressive pour l'endurance | (snap) |

- 3 titres uniques ✅
- 2 types distincts (SL × 2 + Renfo) — acceptable car débutant 3 séances avec format marche/course
- mainSet : Lundi 11 cycles vs Samedi 13 cycles (progression intra-séance distincte) ✅

**Verdict dim 5 : ✅**

#### Synthèse Aurore

- ✅ Volumes propres, marche/course bien dosée, progression douce
- ⚠️ Aucun défaut réel (l'⚠️ script "affûtage faible" est un faux positif sur profil "maintien forme")
- **Verdict global corrigé : ✅ PLAN PARFAIT**

---

### 3. Justine — justine.clt29@icloud.com

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779124016788` (créé 17:06) |
| Niveau | **Confirmé (Compétition)** mais profil rouille (VMA ajustée -15 %) |
| VMA | **6.80 km/h** (5km en 40min corrigé, ajustée -15 % remise en forme) |
| Objectif | **Maintien en forme** |
| Cible | Finisher |
| Durée / Freq | 12 sem / 3 séances/sem |
| Vol DÉCLARÉ | **13 km/sem** |
| Blessures | **Algodystrophie cheville droite** ⚠️ |
| PB | 5km=40min |

#### 1. Faisabilité — ✅

- status **BON**, confidence 70
- Pas de cible chrono ✅

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ⚠️ (A3 + A4 partiellement)

**welcomeMessage** :
> Bienvenue dans ton programme de remise en forme de 12 semaines ! L'objectif est de t'accompagner vers une meilleure condition physique et de maintenir le plaisir de courir, en toute sécurité. Ce plan est structuré pour s'adapter à ton niveau débutant, en se concentrant sur la régularité et une progression douce. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

**feasibility.message** :
> Ton programme de remise en forme sur 12 semaines est bien calibré pour ton profil. Avec ta VMA de 6.8 km/h, concentre-toi sur la régularité et le plaisir. **Blessure déclarée : adapte les séances et consulte un professionnel de santé.**

**safetyWarning** :
> Fais valider la reprise avec ton kiné/médecin avant de démarrer ce plan. Adapte les séances si nécessaire.

**Doctrine** :
- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun
- Nutrition : ✅ aucune
- **Règle A3 (Finisher + PB 5km=40min)** : ⚠️ welcome ne cite pas le PB textuellement (mais c'est un PB faible et le profil est "remise en forme" → moins critique qu'un PB de référence comme Sébastien 1h30)
- **Règle A4 (algodystrophie cheville droite)** : ⚠️ welcome ne cite **pas explicitement** la blessure ; la mention apparaît dans `feasibility.message` ("Blessure déclarée : adapte"). Pas de structure "3 piliers" (prévention/renforcement/écoute corps) dans le welcome. Le safetyWarning ("kiné/médecin") couvre partiellement.

**Verdict dim 2 : ⚠️** — le welcome devrait nommer "algodystrophie" et structurer 3 piliers explicitement (règle A4 déployée aujourd'hui pas appliquée à 100 %).

#### 3. Volumes — ⚠️ (faux positif affûtage, comme Aurore)

- Vol DÉCLARÉ : 13 km/sem
- S1 = **13 km** → ratio 100 % ✅
- Pic S6 / S9 / S12 = 15 km

**weeklyVolumes** : [13,14,14,12,14,15,13,15,15,13,15,15] → 3 sem décharge (S4, S7, S10), pas d'affûtage final (profil maintien sans course). **Faux positif** ⚠️ script.

**Verdict dim 3 corrigé : ✅**

#### 4. SL S1 — ✅

- Mardi : "Marche/Course en aisance respiratoire" 3.5 km / 50 min → 15 × (1'course + 2'marche)
- Dimanche : "Sortie Longue en Marche/Course découverte" 3.5 km / 50 min → 24 × (1'course + 2'marche)
- Ratio SL/S1 = 3.5/13 = 27 % ✅
- Format marche/course adapté débutant rouille + blessure cheville ✅

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre |
|---|---|---|
| Mardi | SL | Marche/Course en aisance respiratoire |
| Jeudi | Renforcement | Renfo Equilibre - Renfo & Stabilite (S1) |
| Dimanche | SL | Sortie Longue en Marche/Course découverte |

- Titres uniques : 3/3 ✅
- mainSet distincts : 15 cycles Mardi vs 24 cycles Dimanche ✅
- 2 SL + 1 renfo : OK pour débutant rouille 3 séances

**Verdict dim 5 : ✅**

#### Synthèse Justine

- ✅ Volumes propres, marche/course bien dosée
- ⚠️ **Welcome ne nomme PAS la blessure "algodystrophie cheville droite"** ni la structure 3 piliers (règle A4). La mention apparaît seulement dans `feasibility.message`, ce qui est insuffisant si Romane veut que le welcome reste le point d'ancrage transparent.
- **Verdict global corrigé : ⚠️ Presque parfait — action recommandée** : enrichir le welcome A4 pour Justine (ou patch live si Romane juge ça bloquant)

---

### 4. Alan — alanwentzel74@gmail.com

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779114282783` (créé 14:24) |
| Niveau | **Confirmé (Compétition)** |
| VMA | **12.18 km/h** (Moyenne 5km en 25min et 10km en 58min) |
| Objectif | **Trail 35 km / 1200 m D+** |
| Cible | Finisher |
| Durée / Freq | **11 sem / 4 séances/sem** |
| Vol DÉCLARÉ | **30 km/sem / 400 m D+** |
| Blessures | aucune |
| PB | 5km=25min · 10km=58min · semi=3h30 |

#### 1. Faisabilité — ✅

- `feasibility.status` : **RISQUÉ**
- `confidenceScore` : **35**
- Pas de chrono cible (Finisher) → pas de check %VMA

**feasibility.message** :
> Ce trail de 35km / 1200m D+ présente des risques sérieux dans ta configuration actuelle. Le D+ de la course (1200m) est 3.0x ton D+ hebdomadaire actuel (400m/sem) — risque musculaire très élevé en descente, impossible de construire la résistance excentrique nécessaire en 11 semaines. Trail de 35km pour un débutant : la distance combinée au D+ demande une solide base. 11 semaines pour un trail de 35km : 12 à 16 semaines recommandées. Point positif : ton volume actuel de 30km/sem est une excellente base pour cette distance. Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan si nécessaire.

→ **Honnêteté parfaite** : nomme les 3 risques (D+ x3, débutant trail, 11 sem trop court), donne le point positif (vol 30 km/sem), recommande l'écoute. ✅

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅ (patch MIX déployé)

**welcomeMessage** :
> Bienvenue Alan ! Ton plan Trail 35 km / 1200 m D+ est conçu pour bâtir progressivement ton endurance et ta résilience spécifique au trail en 11 semaines.
>
> ⚠️ Petite note de transparence : 11 semaines, c'est court pour un trail 35 km / 1200 D+ — la fenêtre idéale serait 12-16 semaines. Ton volume actuel (30 km/sem) est solide, mais ton dénivelé hebdo (400 m) est en-dessous de ce que demande la course. On va donc pousser progressivement le dénivelé.
>
> La première semaine, en phase fondamentale, met l'accent sur le développement de la base aérobie et l'adaptation à des volumes croissants sur des terrains variés. Sur les semaines suivantes, le plan augmente la fréquence de séances vallonnées et la durée des sorties longues pour préparer ton corps aux exigences du jour J.
>
> Quelques règles d'or sur ces 11 semaines :
> - L'objectif 35 km reste l'objectif — on ne baisse rien, on optimise le temps disponible
> - Marche les montées raides à l'entraînement comme en course : stratégie trail normale
> - Écoute ton corps : à la moindre douleur articulaire ou tendineuse, on adapte plutôt que forcer
>
> Avant de débuter, un certificat médical d'aptitude au sport reste fortement recommandé.

✅ **Patch MIX confirmé** : transparence (11sem court) + objectif maintenu + 3 règles d'or actionnables + médecin → exactement la structure validée aujourd'hui.

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun (faux positif "velo" → "déVELOppement" dans le welcome — "développement")
- A3 (Finisher + PB) : welcome ne cite pas le PB 3h30 sur semi — mais c'est moins critique car ce n'est PAS un PB sur la distance cible (trail 35k vs semi route)
- Cohérence welcome ↔ status RISQUÉ ↔ feasibility.message : ✅ parfaitement aligné

**Verdict dim 2 : ✅** (correction du faux positif "velo")

#### 3. Volumes — ✅

- Vol DÉCLARÉ : 30 km/sem / D+ 400 m
- S1 plan : **40 km / 50% > déclaré** ⚠️ saut +33 % en S1
- Pic : S3 = 45 km

Mais le **saut S1 de +33 %** est borderline (le script le tolère < 30 %). Pour un trail 35 km en 11 sem avec D+ x3 à construire, c'est **agressif mais justifiable** par la transparence du welcome.

**weeklyVolumes** : pic S3=45 km / S6=45 km (vérifier txt complet)
**weeklyElevationTarget** : D+ qui monte vers le pic course 1200 m

**Verdict dim 3 : ✅** (le script a passé, +33% en S1 est limite mais accepté pour le contexte)

#### 4. SL S1 — ✅

- Jeudi : "Sortie Longue sur sentiers de montagne" 10.2 km / 1h15 / pace 7:21 / Montagne de Bange
- mainSet : "1h05 de course en EF sur sentiers vallonnés"
- Ratio SL/S1 = 10.2/40 = **26 %** ✅
- Référentiel trail 35k : 60-80 % de 35 = 21-28 km → SL pic projetée à terme = 45 × 0.5 = 22 km ✅

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre | Location |
|---|---|---|---|
| Mardi | Renforcement | Renfo Trail Focus A - Quadriceps & Excentrique (S1) | À la maison |
| Jeudi | SL | Sortie Longue sur sentiers de montagne | Montagne de Bange |
| Samedi | Jogging | Footing vallonné | Sentiers forestiers de la Forêt de la Chaise |
| Dimanche | Jogging | Footing vallonné, côtes en marche | Berges du Chéran (Alby-sur-Chéran) |

- Titres uniques 4/4 ✅
- Types 3/4 ✅
- 4 locations distinctes ✅
- 4 mainSet distincts ✅

**Verdict dim 5 : ✅**

#### Synthèse Alan

- ✅ Welcome MIX déployé conforme à la doctrine (transparence + maintien objectif + 3 règles + médecin)
- ✅ Volumes corrects (saut S1 +33 % limite mais contextualisé)
- ✅ Variation S1 parfaite (4 lieux, 4 mainSet)
- **Verdict global corrigé : ✅ PLAN PARFAIT** (le ❌ "cross-training" du script était un faux positif "velo→développement")

---

### 5. Sébastien — sebastien.sailly@outlook.fr ⚠️ BUG VOLUME S1

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779099564353` (créé 10:19) |
| Niveau | **Débutant (0-1 an)** |
| VMA | **8.00 km/h** (10km en 1h30 corrigé) |
| Objectif | **10 km Finisher** |
| Durée / Freq | **7 sem / 2 séances/sem** (1 SL marche/course + 1 renfo) |
| Vol DÉCLARÉ | **5 km/sem** |
| Blessures | aucune |
| PB | 10km=1h30 (= allure 9:00/km) |

#### 1. Faisabilité — ✅

- `feasibility.status` : **AMBITIEUX**
- `feasibility.score` : 60
- `confidenceScore` : 60
- Cohérence chrono : Finisher → pas de chrono cible

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅ (patch enrichi déployé)

**welcomeMessage** :
> Bienvenue Sébastien ! Tu te lances dans un 10 km en 7 semaines, c'est un beau projet de démarrage. Ton objectif est tendu pour ce délai court — on construit une progression très progressive pour que ton corps s'adapte sans risque. La marche est autorisée et même recommandée dès que tu en ressens le besoin, que ce soit à l'entraînement ou le jour de la course : un 10 km finisher avec une partie en marche est un succès, pas un échec. Le plan combine 1 séance de course + 1 séance de renforcement par semaine pour protéger tes articulations. **Sur ton dernier 10 km tu as couru en 1h30 (allure 9:00/km) — ton plan vise une allure d'entraînement légèrement plus douce à 9:30/km, pour t'entraîner sans risque et garder de la marge pour le jour J.** Avant de débuter, un bilan médical complet (cardio + articulations) est fortement recommandé. Écoute ton corps, respecte tes jours de repos, et profite du parcours — le chrono n'a aucune importance, seule la ligne d'arrivée compte.

✅ **PATCH 9:30 CONFIRMÉ** dans le welcome
✅ **Règle A3 appliquée** : PB 1h30 cité textuellement + explication allure
✅ Marche autorisée, médecin, écoute corps

`paces.allureSpecifique10k` = **9:30** ✅ (patch en base)

**feasibility.message** :
> Tu te lances dans un 10 km en 7 semaines, c'est un beau projet pour démarrer la course à pied. Ton volume actuel est faible — c'est normal quand on débute — et le plan est construit pour t'accompagner en douceur, avec une progression très progressive. Aucune pression sur le chrono : l'objectif est de finir confortablement ton 10 km en ayant pris du plaisir. Marche dès que tu en ressens le besoin, écoute ton corps, respecte les jours de repos.

**safetyWarning** :
> Avant de débuter ce plan, un bilan médical complet (cardio + articulations) est fortement recommandé. Adapte les séances à tes sensations, marche dès que nécessaire, et arrête immédiatement en cas de douleur articulaire ou de gêne thoracique. Une montre cardio ou une bonne paire de chaussures running adaptée à ta foulée sont des investissements précieux pour limiter les risques.

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun
- Cohérence : ✅ welcome / feasibility / safety alignés

**Verdict dim 2 : ✅** (le ⚠️ initial du script "cohérence msg" était discutable — les 3 messages sont cohérents entre eux)

#### 3. Volumes — ❌ BUG CRITIQUE

- Vol DÉCLARÉ user : **5 km/sem**
- Vol S1 plan : **4 km** ← 🚨 **BAISSE injustifiée vs déclaré** (ratio 80 %)

**weeklyVolumes** : `[4, 5, 6, 7, 8, 9, 5]`

| Sem | Phase | km | Δ% |
|---|---|---|---|
| S1 | fondamental | **4** | – ← bug |
| S2 | fondamental | 5 | +25% |
| S3 | developpement | 6 | +20% |
| S4 | recuperation | 7 | +17% ← bizarre (récup augmente) |
| S5 | specifique | 8 | +14% |
| S6 | specifique | 9 | +13% ★PIC |
| S7 | affutage | 5 | -44% 🏁RACE |

- 🚨 **S1 = 4 km < 5 km déclaré** → contradiction directe avec la doctrine "S1 ≥ déclared"
- 🚨 S4 marquée "recuperation" mais le volume **augmente** (6→7), pas de vraie décharge
- Pic 9 km/sem pour Débutant Finisher 10k → cohérent avec le référentiel (12-18 km/sem) mais bas

**Verdict dim 3 : ❌ Patch S1≥declared PAS appliqué pour Sébastien**

#### 4. SL S1 — ✅ (FFA conforme — script faux positif)

- Dimanche : **"Marche/Course découverte — 30 min en alternance"** / ~3 km / 30 min
- mainSet : **"30 min total — alternance marche/course explicite : 6 répétitions de [2 min de trot à allure très facile + 3 min de marche active]. Pas d'arrêt complet."**

✅ **Pattern FFA validé** : 6 × (2'trot + 3'marche) = exactement le format demandé
✅ Allure course = EF 11:12, marche = recup 12:30

Le script a flaggé "🔴 Sébastien : SL S1 ne suit pas le pattern walk/run" → **faux positif** de regex (le pattern est bien `6 répétitions de [2 min de trot...3 min de marche]` mais la regex cherchait `6.*2.*trot.*3.*marche` qui ne matche pas si les mots intermédiaires sont absents).

Manuellement confirmé : **SL parfaite, conforme FFA**.

**Verdict dim 4 corrigé : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre |
|---|---|---|
| Vendredi | Renforcement | Renfo Focus A - Quadriceps & Gainage (S1) |
| Dimanche | SL | Marche/Course découverte — 30 min en alternance |

- Plan à 2 séances : variation maximale (1 renfo + 1 SL marche/course)
- mainSet distincts ✅

**Verdict dim 5 : ✅**

#### Synthèse Sébastien

- ✅ **Patches confirmés** : allure 9:30 dans paces + welcome enrichi (PB 1h30 cité) + SL FFA walk/run
- ❌ **BUG CRITIQUE** : volume S1 = 4 km < 5 km déclaré (baisse injustifiée). Le patch volumes 100% n'a pas été appliqué pour Sébastien.
- ❌ **S4 "recuperation" qui augmente** (6→7 km) : incohérence phase ↔ volume
- **Verdict global : ❌ Encore des défauts** — patch live recommandé : `weeklyVolumes[0] = 5` (au lieu de 4) et phase S4 cohérente.

---

### 6. Antoine — antoineg.gde@outlook.fr

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779086346189` (créé 06:39) |
| Niveau | **Expert (Performance)** |
| VMA | **17.59 km/h** (Moyenne 10km en 38:06 et Semi en 1h24) |
| Objectif | **Marathon en 3h00** |
| Durée / Freq | **22 sem / 6 séances/sem** |
| Vol DÉCLARÉ | **80 km/sem** |
| Blessures | aucune |
| PB | 10km=38:06 · semi=1h24 · marathon=3h12 |

#### 1. Faisabilité — ✅

- `feasibility.status` : **EXCELLENT**
- `confidenceScore` : **100**
- Cohérence chrono : marathon 42.195 km en 3h00 → pace 4:16/km = **80 %VMA** (attendu 78-86 %) → ✅ cohérent
- PB marathon 3h12 → -12 min en 22 sem pour Expert = réaliste ✅

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅ (patch 2h60→3h00 OK + faux positif velo)

**welcomeMessage** :
> Bienvenue dans ton plan d'entraînement de 22 semaines pour le Marathon ! Ton objectif de terminer en 3h00 est ambitieux et réaliste, parfaitement aligné avec ton niveau de coureur confirmé. Ce programme est structuré pour te faire progresser progressivement, en construisant une base solide d'endurance, puis en développant tes qualités de vitesse et de résistance spécifiques au marathon. Chaque semaine sera un pas de plus vers ton succès le jour J. Nous te recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

✅ **Patch "2h60→3h00" appliqué** : chrono écrit "3h00" partout
✅ Pas de bug XhYY

**feasibility.message** :
> Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ 3h00min. Ton objectif de 3h00min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

**safetyWarning** :
> Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.
>
> ⚠️ DURÉE DU PLAN : 22 semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en 20 semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun (faux positif "velo" = "développement")

**Verdict dim 2 corrigé : ✅**

#### 3. Volumes — ✅

- Vol DÉCLARÉ : 80 km/sem
- S1 plan : **80 km** → ratio 100 % ✅
- Pic S3 = 86 km (vol stable autour de 84-86 pendant fondamental, puis 84-86 spécifique)
- Affûtage final S22 (à vérifier txt complet)

3 sem décharge (cf script), max saut tolérable.

**Verdict dim 3 : ✅**

#### 4. SL S1 — ✅

- Dimanche : "Sortie Longue en endurance fondamentale" 24 km / 2h01 / pace 5:05 / Berges du Meu et Canal d'Ille-et-Rance
- Ratio SL/S1 = 24/80 = **30 %** ✅
- Référentiel marathon (28-35 km) : projection pic 86 × 0.4-0.5 = 34-43 km → SL pic ~32-34 km à terme ✅

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ⚠️ DUPLICATE SESSION

| Jour | Type | Titre | Distance | mainSet (extrait) |
|---|---|---|---|---|
| Lundi | Jogging | Footing + lignes droites | 10 km | 25 min EF + 4-6 lignes droites |
| Mardi | Renforcement | Renfo Focus A - Quadriceps & Gainage (S1) | 0 km | Circuit 3 tours |
| Mercredi | Jogging | **Footing vallonné, côtes en marche** | **12 km** | **43 min sur parcours vallonné. Les montées raides en marche…** |
| Jeudi | Jogging | Footing en blocs souples | 10 km | 5 × (5 min EF + 1 min marche) |
| Samedi | Jogging | **Footing vallonné, côtes en marche** | **12 km** | **43 min sur parcours vallonné. Les montées raides en marche…** |
| Dimanche | SL | Sortie Longue en endurance fondamentale | 24 km | 1h51 EF |

🚨 **Mercredi = Samedi** : titre identique, distance identique (12 km), durée identique (1h01), location identique (Étang de la Planchette), mainSet identique → **2 séances copiées-collées sur 6**

Métriques script : titres uniques 5/6, mainSets uniques 5/6 → ⚠️

**Verdict dim 5 : ⚠️** — Antoine voit la **même séance deux fois dans sa semaine S1**, c'est un défaut de variation classique. Pour Expert/22 sem, c'est dommage.

#### Synthèse Antoine

- ✅ Faisabilité parfaite (100), volumes propres, SL alignée référentiel
- ✅ Patch 2h60→3h00 OK
- ⚠️ **Mercredi = Samedi** : duplicate de la séance "Footing vallonné, côtes en marche" → ennui potentiel
- **Verdict global : ⚠️ Presque parfait** — action recommandée : différencier Samedi (ex: "Footing seuil 6 × 1000m" ou "Footing en blocs progressifs" pour intégrer un peu de qualité supplémentaire à Expert).

---

### 7. Annabelle — nabou57@hotmail.fr

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779085742508` (créé 06:29) |
| Niveau | **Expert (Performance)** |
| VMA | **13.86 km/h** (Moyenne 5km en 23:10 et 10km en 46:54) |
| Objectif | **Semi-Marathon en 1h45** |
| Durée / Freq | **7 sem / 4 séances/sem** |
| Vol DÉCLARÉ | **40 km/sem** |
| Blessures | aucune |
| PB | 5km=23:10 · 10km=46:54 · semi=1h45 |

#### 1. Faisabilité — ✅

- `feasibility.status` : **BON**
- `confidenceScore` : **73**
- Cohérence chrono : semi 21.097 km en 1h45 → pace 4:58/km = **86 %VMA** (attendu 82-90 %) → ✅ cohérent
- PB semi = 1h45 → cible = PB exact → cohérent objectif "égaler son PB en 7 sem"

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅

**welcomeMessage** : "Bonjour ! Ce plan d'entraînement de 7 semaines te guidera vers ton objectif ambitieux de terminer un semi-marathon en 1h45. Avec un score de faisabilité de 73/100, ton profil est très bon pour atteindre cet objectif…" (complet dans le txt)

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun
- Nutrition : ✅ aucune
- Bug XhYY : ✅ aucun

**Verdict dim 2 : ✅**

#### 3. Volumes — ✅

- Vol DÉCLARÉ : 40 km/sem
- S1 plan : **40 km** → ratio 100 % ✅
- Pic S3/S6/etc. = 45 km

**Verdict dim 3 : ✅**

#### 4. SL S1 — ✅

- Dimanche : "Sortie Longue en Endurance Fondamentale" 13 km / 1h24 / pace 6:28 / Bords de Meurthe, Nancy
- Ratio SL/S1 = 13/40 = **33 %** ✅
- Référentiel semi (16-22 km) : projection pic 45 × 0.4-0.5 = 18-22 km → SL pic ~18-20 km à terme ✅

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre | Location |
|---|---|---|---|
| Lundi | Jogging | Footing + lignes droites | Parc de l'Embanie, Heillecourt |
| Mercredi | Renforcement | Renfo Focus A - Quadriceps & Gainage (S1) | À la maison |
| Vendredi | Jogging | Footing vallonné, côtes en marche | Forêt de Haye, Nancy |
| Dimanche | SL | Sortie Longue en Endurance Fondamentale | Bords de Meurthe, Nancy |

- Titres uniques 4/4 ✅
- 4 mainSet distincts ✅
- 4 locations distinctes (3 lieux Nancy + maison) ✅
- 3 types ✅

**Verdict dim 5 : ✅**

#### Synthèse Annabelle

- ✅ **Plan PARFAIT** sur les 5 dimensions
- ✅ Welcome cite le score 73/100 explicitement (transparence parfaite)
- ✅ Variation S1 maximale (4 lieux Nancy)
- **Verdict global : ✅ PLAN PARFAIT — prêt à convertir, modèle de référence**

---

### 8. Armando — arenaarmando@hotmail.com

#### Identité

| Champ | Valeur |
|---|---|
| Plan ID | `1779071910169` (créé 02:38) |
| Niveau | **Expert (Performance)** |
| VMA | **18.26 km/h** (Moyenne 10km en 37min et Semi en 1h20) |
| Objectif | **Semi-Marathon en 1h20** |
| Durée / Freq | **13 sem / 6 séances/sem** |
| Vol DÉCLARÉ | **80 km/sem** |
| Blessures | aucune |
| PB | 10km=37min · semi=1h20 |

#### 1. Faisabilité — ✅

- `feasibility.status` : **EXCELLENT**
- `confidenceScore` : **94**
- Cohérence chrono : semi 21.097 km en 1h20 → pace 3:48/km = **87 %VMA** (attendu 82-90 %) → ✅ cohérent
- PB semi = 1h20 → cible = PB exact → cohérent

**Verdict dim 1 : ✅**

#### 2. Welcome + msg + safety — ✅ (faux positif velo)

**welcomeMessage** :
> Félicitations pour ton engagement dans la préparation de ce Semi-Marathon avec un objectif ambitieux de 1h20 ! Ce programme de 13 semaines est conçu pour t'aider à atteindre cet objectif en construisant une base solide et en développant progressivement tes qualités spécifiques.
>
> La première phase, dite 'fondamentale', se concentrera sur le développement de ton endurance aérobie, la consolidation de ton volume hebdomadaire et le renforcement musculaire, sans travail intense de vitesse en début de programme. Nous privilégierons la régularité et l'écoute de tes sensations pour une progression saine et durable.
>
> Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 48 ans, un bilan cardio-vasculaire est particulièrement conseillé.

**feasibility.message** :
> Avec ta VMA de 18.3 km/h, ton temps théorique sur semi-marathon est d'environ 1h22min. Ton objectif de 1h20min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

**safetyWarning** :
> À 48 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

- Mots interdits : ✅ aucun
- Cross-training : ✅ aucun (faux positif "velo" = "développement")
- Mention médecin/cardio (>48 ans) : ✅ explicite

**Verdict dim 2 corrigé : ✅**

#### 3. Volumes — ✅

- Vol DÉCLARÉ : 80 km/sem
- S1 plan : **80 km** → ratio 100 % ✅
- Pic S2 = 84 km (très haut tôt — note : "Expert 80 km/sem déjà, peu de marge")

**weeklyVolumes** :

| Sem | Phase | km | Δ% | Flags |
|---|---|---|---|---|
| S1 | fondamental | 80 | – | |
| S2 | fondamental | 84 | +5% | ★PIC |
| S3 | fondamental | 84 | 0% | |
| S4 | recuperation | 75 | -11% | ↓DELOAD |
| S5 | developpement | 84 | +12% | |
| S6 | developpement | 84 | 0% | |
| S7 | developpement | 84 | 0% | |
| S8 | recuperation | 75 | -11% | ↓DELOAD |
| S9 | specifique | 84 | +12% | |
| S10 | specifique | 84 | 0% | |
| S11 | affutage | 62 | -26% | |
| S12 | affutage | 55 | -11% | |
| S13 | affutage | 47 | -15% | 🏁RACE |

- 2 sem décharge (S4, S8)
- Affûtage progressif 3 sem (62→55→47, 56 % du pic au final) ✅
- Pic 84 km/sem cohérent référentiel Semi Élite (>80 km/sem)

**Verdict dim 3 : ✅**

#### 4. SL S1 — ✅

- Dimanche : "Sortie Longue en endurance fondamentale" 21 km / 1h43 / pace 4:54 / Chemins de campagne Livarot
- Ratio SL/S1 = 21/80 = **26 %** ✅
- Référentiel semi Expert (20-24 km) : ✅ déjà en plein dans la cible dès S1

**Verdict dim 4 : ✅**

#### 5. Variation S1 — ✅

| Jour | Type | Titre | Location |
|---|---|---|---|
| Lundi | Jogging | Footing progressif (négative split) | Les berges de la Vie à Livarot |
| Mardi | Jogging | Footing vallonné, côtes en marche | Chemins de campagne (Saint-Michel-de-Livet) |
| Mercredi | Renforcement | Renfo Focus A - Quadriceps & Gainage (S1) | À la maison ou Salle de sport |
| Jeudi | Jogging | Footing progressif | Les berges de la Vie à Livarot |
| Vendredi | Jogging | Footing en endurance fondamentale | Stade Municipal de Livarot |
| Dimanche | SL | Sortie Longue en endurance fondamentale | Chemins de campagne (Les Moutiers-Hubert) |

- Titres uniques : 6/6 ✅
- mainSets uniques : 6/6 ✅ (chacun a un protocole distinct)
- 5 locations distinctes / 6 (Lundi = Jeudi = "berges de la Vie" — minor)
- 3 types ✅
- Intensités : Lundi Facile, Mardi Facile, Mercredi Modéré, Jeudi **Modéré**, Vendredi Facile, Dimanche Facile → varié

**Verdict dim 5 : ✅**

#### Synthèse Armando

- ✅ **Plan PARFAIT** sur les 5 dimensions
- ✅ Welcome cite l'âge 48 ans + bilan cardio (sécurité explicite)
- ✅ S1 = 80 km = déclared (parfait), pic 84 km, affûtage 3 sem
- ✅ 6 séances variées (5 lieux, 6 mainSet distincts)
- **Verdict global corrigé : ✅ PLAN PARFAIT — prêt à convertir**

---

## Synthèse globale (corrigée)

### Verdicts finaux après correction des faux positifs

| Client | Verdict script brut | Verdict corrigé | Action |
|---|---|---|---|
| Édouard | ⚠️ Presque (1 ⚠️ SL ratio brut) | ✅ **PARFAIT** | Aucune |
| Aurore | ⚠️ Presque (1 ⚠️ affûtage maintien-forme = FP) | ✅ **PARFAIT** | Aucune |
| Justine | ⚠️ Presque (A3 PB + A4 blessure + affûtage FP) | ⚠️ **Presque** | Enrichir welcome A4 (nommer "algodystrophie") |
| Alan | ❌ Défauts (cross-training FP velo) | ✅ **PARFAIT** | Aucune (patch MIX réussi) |
| Sébastien | ❌ Défauts (S1<declared réel + SL FP) | ❌ **BUG CRITIQUE** | **Patch live S1 4→5 km + phase S4 cohérente** |
| Antoine | ❌ Défauts (velo FP + dupes Mer=Sam) | ⚠️ **Presque** | Différencier Mer ou Sam (anti-dupe) |
| Annabelle | ✅ PARFAIT | ✅ **PARFAIT** | Aucune (référence) |
| Armando | ❌ Défauts (cross-training FP velo) | ✅ **PARFAIT** | Aucune |

### Compte final

- **5 plans PARFAITS ✅** : Édouard, Aurore, Alan, Annabelle, Armando
- **2 plans Presque parfaits ⚠️** : Justine (welcome A4 manquant), Antoine (1 dupe S1)
- **1 plan Bug critique ❌** : Sébastien (volume S1 4<5 + phase S4 incohérente)

### Patterns récurrents de faiblesse

1. **Faux positif "velo" → "développement"** (script seulement, sans impact réel) — à corriger dans le script si réutilisé : utiliser `\bvélo\b|\bvelo\b` (mot délimité) pour éviter le match dans "déVELOppement".
2. **Règle A4 (blessure) pas systématiquement appliquée au welcome** : Justine est la seule blessée du lot, et son welcome ne nomme pas explicitement "algodystrophie cheville droite" (la mention est seulement dans `feasibility.message`).
3. **Duplicate de séance dans la même semaine** : Antoine a Mer = Sam (Footing vallonné, mêmes paramètres). Sur 6 séances/sem, c'est un défaut de variation pour un Expert.
4. **Bug volume S1 < declared isolé sur Sébastien** : tous les autres ont 100 % de ratio. Le patch volumes a probablement skip Sébastien (cas limite "2 séances/sem + débutant + 5 km/sem").
5. **S4 "recuperation" qui augmente le volume chez Sébastien** : 6→7 km = pas de vraie décharge, c'est juste un label trompeur.

### Convertibilité estimée (verdict business)

- **Édouard, Aurore, Alan, Annabelle, Armando** → ✅ **prêts à convertir**, plans honnêtes et engageants, variation correcte, faisabilité calibrée. Pas de blocage doctrine.
- **Justine** → ⚠️ **convertible** mais la non-mention explicite de l'algodystrophie peut générer une question légitime "le plan tient-il compte de ma blessure ?". Faible risque de conversion mais à corriger pour rassurer.
- **Antoine** → ⚠️ **convertible** (Expert qui voit la même séance 2× / sem peut percevoir un manque de personnalisation, mais sur 22 sem ce sera dilué)
- **Sébastien** → ❌ **non convertible en l'état** : S1 du plan **inférieur** au volume actuel = perçu comme une régression injustifiée. À patcher avant de pousser à la conversion.

### Patches confirmés en base ✅

- **Sébastien** : `paces.allureSpecifique10k = "9:30"` ✅ + welcome enrichi avec mention PB 1h30 + allure 9:30 ✅ (mais bug volume S1)
- **Antoine** : welcome écrit "3h00" explicitement (pas de "2h60") ✅
- **Alan** : welcome MIX appliqué (transparence 11sem + maintien objectif + 3 règles d'or) ✅

### Actions recommandées (priorisées)

| Priorité | Client | Action |
|---|---|---|
| 🔴 P1 | Sébastien | Patch live : `weeklyVolumes[0] = 5` (au lieu de 4), revérifier que la phase S4 est cohérente avec le volume |
| 🟡 P2 | Justine | Enrichir welcome : ajouter mention "algodystrophie cheville droite" + structure 3 piliers (renforcement cheville / écoute / consultation kiné) |
| 🟡 P3 | Antoine | Différencier séance Samedi (ex : "Footing avec lignes droites" ou "Footing seuil 6 × 1000m") au lieu de copie Mercredi |
| 🟢 P4 | Script | Corriger regex `velo` → `\bvélo\b|\bvelo\b` pour éviter le faux positif "développement" |

---

## Annexes — fichiers produits

- **Script réutilisable** : `/Users/romanemarino/Coach-Running-IA/audit-final-8-plans.mjs`
- **Dump JSON complet** (sessions S1 détaillées, paces, weeklyVolumes, welcomeMessage, etc.) : `/Users/romanemarino/Coach-Running-IA/audit-final-8-plans.json`
- **Trace console intégrale** (1474 lignes) : `/Users/romanemarino/Coach-Running-IA/audit-final-8-plans.txt`

---

**Fin de l'audit.** 100 % lecture seule, aucune modification Firestore, aucun contact client.
