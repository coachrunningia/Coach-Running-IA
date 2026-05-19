# AUDIT 5 PLANS — TEMPLATE RÉFÉRENCE POST-PREVIEW

**Date** : 18/05/2026  
**Auditeur** : Claude Opus 4.7  
**Template** : `~/.claude/projects/-Users-romanemarino/memory/project_template_analyse_post_preview.md`  
**Script** : `~/Coach-Running-IA/audit-5-plans-template.mjs` (réutilisable)  
**Sources brutes** : `audit-5-plans-template.txt` + `audit-5-plans-template.json`  
**Auth** : `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com` (lecture seule)

---

## TL;DR — Tableau synthèse 5 clients

| # | Prénom | Plan | Status | Score | 1.Allure | 2.Vol | 3.SL | 4.Faisa | 5.Welcome | Action |
|---|--------|------|--------|-------|----------|-------|------|---------|-----------|--------|
| 1 | **Alan** | Trail 35km / 1200D+ Finisher 11 sem | RISQUÉ | 35 | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | **Régénération conseillée** (durée + ratio D+) |
| 2 | **Sébastien** | 10 km Finisher 7 sem | AMBITIEUX | **60** | ✅ | ❌ | ❌ | ✅ | ✅ | **Patches OK** mais SL S1 = 75% vol = bug structurel mode marche-course |
| 3 | **Antoine** | Marathon 3h00 22 sem | EXCELLENT | 100 | ✅ | ⚠️ | ✅ | ✅ | ✅ | RAS (bug "2h60min" patché ✅) |
| 4 | **Annabelle** | Semi 1h45 7 sem | BON | 73 | ✅ | ⚠️ | ✅ | ✅ | ✅ | RAS (durée 7 sem courte mais cohérente) |
| 5 | **Armando** | Semi 1h20 13 sem | EXCELLENT | 94 | ✅ | ⚠️ | ✅ | ✅ | ✅ | RAS |

**Bugs récurrents (5/5)** :
- ❌ `feasibility.score` ABSENT dans Firestore pour 4/5 plans (Sébastien seul exception — code path régénération)
- ⚠️ Aucun `allureSpecifiqueTrail` dans `paces[]` → trail Finisher reçoit des allures route inutilisables
- ⚠️ Affûtage trop brutal (S-1 vs pic) : 4/5 plans avec drop > 30% en 1 semaine

---

## 1. ALAN — alanwentzel74@gmail.com

| Champ | Valeur |
|---|---|
| UID / Plan ID | `yzvy4Csd7OMYT7x5Xx6YPnFpML12` / `1779114282783` |
| Inscription / Last login | 2026-05-18 14:24 / 14:26 (preview vue) |
| Plan | "Préparation Trail 35km / 1200m D+ — Finisher — 11 sem." (`fullPlanGenerated=false`) |
| Profil | Homme, 21 ans, 83 kg, 186 cm, **IMC 24.0** |
| Niveau / VMA | Confirmé (Compétition) / **12.18 km/h** (Moyenne 5km en 25min et 10km en 58min) |
| Objectif | Trail 35 km / **1200 m D+** — Finisher — 30/07/2026 |
| Fréquence / Durée | 4 séances/sem (3 course + 1 renfo) / 11 sem |
| Vol actuel | 30 km/sem / **400 m D+** |
| Blessures | aucune |
| PB | 5km=25min • 10km=58min • semi=3h30 |

### 1. Allure cible — ⚠️
- Distance objectif : **trail 35 km**
- Allure cible attendue : `allureSpecifiqueTrail` → **ABSENTE** (pas générée par `geminiService.ts`)
- Allures disponibles : `efPace=7:21`, `eaPace=6:24`, `allureSpecifiqueMarathon=6:10` (utilisée par défaut comme proxy)
- SL S1 est à `pace=7:21` (EF) — cohérent pour S1
- **Verdict** : ⚠️ pas d'allure spécifique trail dans le modèle. Pour un Finisher trail sans PB trail, OK mais lacune systémique du moteur.

### 2. Volume hebdo — ⚠️

```
Sem | Phase          | km | Δ%
S1  | fondamental    | 26 | --
S2  | fondamental    | 28 | +8%
S3  | fondamental    | 30 | +7%
S4  | recuperation   | 23 | -23% ↓DELOAD
S5  | developpement  | 26 | +13%
S6  | developpement  | 30 | +15%
S7  | recuperation   | 27 | -10% ↓DELOAD
S8  | specifique     | 30 | +11%
S9  | specifique     | 32 | +7%  ★PIC
S10 | affutage       | 21 | -34%
S11 | affutage       | 17 | -19%
```

- Total : 290 km • Moy : 26.4 km/sem • Pic : **S9 = 32 km** • Affûtage final : 17 km (53% du pic)
- Saut depuis vol actuel : 30 → 26 = **-13%** ✅
- Max augmentation : +15% (S5→S6) 🟡 OK
- Semaines décharge : 4, 7 ✅
- **Référentiel trail 35km** : SL pic attendu 21-28 km (60-80% objectif). Or pic volume = 32 km, SL réelle pic estimée ~12-15 km (vu SL S1 = 10.2 km). **SL pic insuffisante pour ce trail.**
- **D+ projeté** : 400 m/sem actuel → course = 1200 m. **Ratio 3x**. Plan 11 sem ne permet pas d'atteindre les volumes D+ nécessaires (la feasibility le dit déjà).
- **Verdict** : ⚠️ progression km OK mais SL pic sous-dimensionnée + ratio D+ critique.

### 3. SL S1 — ✅
- Jeudi : **10.2 km / 1h15 / D+260m / pace 7:21** "Sortie Longue sur sentiers de montagne"
- Ratio SL/vol hebdo S1 : 39% 🟡 (cible 25-40%, juste à la limite)
- Ratio SL/vol actuel user : 34% ✅
- D+ SL S1 / D+ course : 260/1200 = 22%
- **Verdict** : ✅ SL S1 cohérente pour un Confirmé. D+ raisonnable en S1.

### 4. Faisabilité — ✅
- Status : **RISQUÉ** • confidenceScore : **35** • `feasibility.score` : **ABSENT** ❌
- `feasibility.message` (616 chars) :
> Ce trail de 35km / 1200m D+ présente des risques sérieux dans ta configuration actuelle. Le D+ de la course (1200m) est 3.0x ton D+ hebdomadaire actuel (400m/sem) — risque musculaire très élevé en descente, impossible de construire la résistance excentrique nécessaire en 11 semaines. Trail de 35km pour un débutant : la distance combinée au D+ demande une solide base. 11 semaines pour un trail de 35km : 12 à 16 semaines recommandées. Point positif : ton volume actuel de 30km/sem est une excellente base pour cette distance. Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan si nécessaire.

- `safetyWarning` :
> On te recommande de valider ce programme avec ton médecin, surtout pour un premier effort de cette distance. Un certificat médical d'aptitude est vivement conseillé.

- Bug "2h60min" : non
- Embellissement plan RISQUÉ : non (transparent, doctrine sécurité respectée)
- **Note débutant** : Alan se déclare "Confirmé (Compétition)" mais le message dit "pour un débutant". Incohérence inputs/algo : ses PB (10km=58min, semi=3h30) indiquent plutôt **Débutant/Intermédiaire**, pas Confirmé. Le moteur a probablement re-classé par PB.
- **Verdict** : ✅ message honnête et préventif.

### 5. WelcomeMessage — ⚠️
Texte (750 chars) :
> Bienvenue dans ton plan d'entraînement pour le Trail de 35km avec 1200m de D+ ! Ton objectif est de devenir un finisher solide, et ce programme est conçu pour bâtir progressivement ton endurance et ta résilience spécifique au trail. La première semaine, en phase 'fondamentale', met l'accent sur le développement de ta base aérobie en endurance fondamentale (EF) et l'adaptation de ton corps à des volumes croissants sur des terrains variés. Nous allons prioriser la régularité et l'écoute de ton corps. Chaque séance est une étape vers la construction d'une base solide pour affronter les défis du dénivelé. Nous te recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

| Check | Verdict |
|---|---|
| Mots interdits (poids/IMC/minceur) | ✅ aucun |
| Allures user citées | ❌ aucune (PB 10km=58min, semi=3h30 non mentionnés) |
| PB déclarés cités | ❌ aucun |
| Mention sécurité | ✅ médecin + certificat |
| Ton préventif | ✅ |
| Cohérent avec status RISQUÉ | ⚠️ **trop optimiste** vs feasibility.message qui dit "11 sem insuffisant, 12-16 recommandées". Le welcome devrait reprendre cet avertissement central. |

- **Verdict** : ⚠️ welcome déconnecté de la sévérité du diagnostic feasibility (status RISQUÉ score 35 mais welcome reste générique encourageant).

### Synthèse Alan
- ✅ Volume initial bien dimensionné, SL S1 cohérente, message feasibility transparent
- ⚠️ Welcome ne reprend pas l'avertissement "11 sem insuffisantes" — risque de conversion sur un plan que le système lui-même qualifie de risqué
- ❌ Aucune `allureSpecifiqueTrail` (lacune systémique)
- ❌ `feasibility.score` absent (lacune systémique)
- **Action recommandée** : **régénération conseillée** OU patch live welcome pour reprendre l'avertissement "11 sem trop court" + recommander 12-16 sem si Alan peut décaler son objectif.

---

## 2. SÉBASTIEN — sebastien.sailly@outlook.fr (RE-CHECK PATCHES)

| Champ | Valeur |
|---|---|
| UID / Plan ID | `jZ8E7E1beJeO9GdDAYM6gYwMdVN2` / `1779099564353` |
| Inscription / Last login | 2026-05-18 10:18 / 10:20 |
| Plan | "Préparation 10 km — Finisher — 7 sem." (`fullPlanGenerated=false`) |
| Profil | Homme, 45 ans, **130 kg**, 180 cm, **IMC 40.1** ⚠️ |
| Niveau / VMA | Débutant (0-1 an) / **8.00 km/h** (10km en 1h30 corrigé) |
| Objectif | 10 km — Finisher — 30/06/2026 |
| Fréquence / Durée | 2 séances/sem (1 course + 1 renfo) / 7 sem |
| Vol actuel | 5 km/sem |
| Blessures | aucune |
| PB | 10km=1h30 |

### Validation patches précédents

| Patch | Attendu | Trouvé | Verdict |
|---|---|---|---|
| Allure 10k | `9:30` | **`9:30`** | ✅ patché |
| WelcomeMessage enrichi | mention "1h30 (allure 9:00/km) → 9:30/km" | **présent textuellement** | ✅ patché |
| WeeklyVolumes pic | 9 km | **`[4,5,6,7,8,9,5]` pic S6=9 km** | ✅ patché |
| Status / Score | AMBITIEUX / 60 | **AMBITIEUX / 60** | ✅ patché |
| `feasibility.score` persisté | présent | **présent (60)** | ✅ (anomalie : seul plan des 5 à l'avoir) |

**Tous les patches sont vérifiés en base. Bravo Romane.**

### 1. Allure cible — ✅
- Distance objectif : 10 km
- `allureSpecifique10k` : **9:30** (corrigée)
- PB déclaré 10km=1h30 → pace PB = **9:00/km** • Cushion +5% = **9:27/km**
- Allure cible (9:30) **>= pace PB + 5% cushion** ✅
- **Verdict** : ✅ patch allure tient (`feedback_finisher_plus_pb_allure` respecté).

### 2. Volume hebdo — ❌

```
Sem | Phase          | km | Δ%
S1  | fondamental    |  4 | --
S2  | fondamental    |  5 | +25%  🔴
S3  | developpement  |  6 | +20%
S4  | recuperation   |  7 | +17% ↓DELOAD ← anomalie : "decharge" mais volume monte
S5  | specifique     |  8 | +14%
S6  | specifique     |  9 | +13%  ★PIC
S7  | affutage       |  5 | -44%
```

- Total : 44 km • Moy : 6.3 km/sem • Pic : **S6 = 9 km** ✅
- Saut depuis vol actuel : 5 → 4 = **-20%** ✅
- Max augmentation : +25% (S1→S2) 🔴 → théoriquement > ACSM 10-15% mais sur 1 km absolu = négligeable en réalité (4→5 km)
- **Anomalie phase** : S4 marquée `recuperation ↓DELOAD` mais volume monte (6→7). Bug d'étiquetage `weeklyPhases[]` / `recoveryWeeks[]`.
- Affûtage : 9→5 = **-44%** (trop brutal mais sur petits volumes négligeable)
- **Référentiel 10k** : SL pic attendu 7-8 km. Ici pic volume 9 km mais SL réelle reste = 3 km en S1, à monter probablement vers 5-6 km au pic. **Sous-dimensionné** (vu fréquence 2 séances/sem dont 1 renfo, c'est en réalité 1 séance de course par semaine).
- **Verdict** : ❌ progression % aberrante mathématiquement mais inévitable sur petits volumes ; le vrai souci est **1 seule séance course/sem** = volume total famine.

### 3. SL S1 — ❌

- Dimanche : **3 km / 30 min / pace EF 11:12 (course) / 12:30 (marche)** "Marche/Course découverte — 30 min en alternance"
- Ratio SL/vol hebdo S1 : **75% 🔴** (cible 25-40%)
- Ratio SL/vol actuel user : **60% 🔴**
- **Verdict** : ❌ ratio aberrant — la SL EST le seul footing de la semaine. C'est un effet inévitable du mode marche-course 2 séances/sem (1 renfo + 1 course = SL est forcément 100% de la course). Pas vraiment un bug à patcher mais une **limite structurelle du mode 2 séances marche-course**.

### 4. Faisabilité — ✅

- Status : **AMBITIEUX** • Score : **60** • confidenceScore : **60** ✅ (cohérence parfaite)
- `feasibility.message` :
> Tu te lances dans un 10 km en 7 semaines, c'est un beau projet pour démarrer la course à pied. Ton volume actuel est faible — c'est normal quand on débute — et le plan est construit pour t'accompagner en douceur, avec une progression très progressive. Aucune pression sur le chrono : l'objectif est de finir confortablement ton 10 km en ayant pris du plaisir. Marche dès que tu en ressens le besoin, écoute ton corps, respecte les jours de repos.

- `safetyWarning` :
> Avant de débuter ce plan, un bilan médical complet (cardio + articulations) est fortement recommandé. Adapte les séances à tes sensations, marche dès que nécessaire, et arrête immédiatement en cas de douleur articulaire ou de gêne thoracique. Une montre cardio ou une bonne paire de chaussures running adaptée à ta foulée sont des investissements précieux pour limiter les risques.

- Bug "2h60min" : non
- BMI 40.1 → safetyWarning mentionne "cardio + articulations" ✅
- **Verdict** : ✅ message + warning bien dosés pour profil obésité 1. Aucune mention de poids/IMC dans le corps (doctrine respectée).

### 5. WelcomeMessage — ✅

Texte (975 chars) :
> Bienvenue Sébastien ! Tu te lances dans un 10 km en 7 semaines, c'est un beau projet de démarrage. Ton objectif est tendu pour ce délai court — on construit une progression très progressive pour que ton corps s'adapte sans risque. La marche est autorisée et même recommandée dès que tu en ressens le besoin, que ce soit à l'entraînement ou le jour de la course : un 10 km finisher avec une partie en marche est un succès, pas un échec. Le plan combine 1 séance de course + 1 séance de renforcement par semaine pour protéger tes articulations. Sur ton dernier 10 km tu as couru en 1h30 (allure 9:00/km) — ton plan vise une allure d'entraînement légèrement plus douce à 9:30/km, pour t'entraîner sans risque et garder de la marge pour le jour J. Avant de débuter, un bilan médical complet (cardio + articulations) est fortement recommandé. Écoute ton corps, respecte tes jours de repos, et profite du parcours — le chrono n'a aucune importance, seule la ligne d'arrivée compte.

| Check | Verdict |
|---|---|
| Mots interdits (poids/IMC/minceur) | ✅ aucun |
| Allures user citées | ✅ 9:00 (PB) + 9:30 (cible) |
| PB déclarés cités | ✅ "1h30" |
| Mention sécurité | ✅ "bilan médical complet (cardio + articulations)" |
| Ton préventif | ✅ "marche autorisée et recommandée" |
| Référence PB explicite (Finisher+PB) | ✅ "Sur ton dernier 10 km tu as couru en 1h30 (allure 9:00/km)" |
| Allure cible expliquée | ✅ "plan vise allure légèrement plus douce à 9:30/km" |

- **Verdict** : ✅ welcome exemplaire. Sert de **modèle** pour les autres Finisher+PB.

### Synthèse Sébastien — challenge des patches

**Si j'avais audité Sébastien aujourd'hui avec ce template, est-ce que j'aurais identifié les mêmes problèmes que ceux qui ont mené aux patches ?**

**Verdict expert honnête** :

✅ **J'aurais identifié** :
- Bug allure 10k = 8:20 vs PB 9:00 (cushion +5% non respecté) → `allure cible plus rapide que PB+cushion` détecté par mon test "Finisher avec PB"
- WelcomeMessage sans référence PB (mon check "PB déclarés cités dans welcome" déclencherait ⚠️)
- Status / score incohérent (mais ça aurait demandé de **comparer** le score donné par la BD au score attendu vu le profil obésité 40.1 + 5 km/sem actuel + cible 7 sem)

⚠️ **J'aurais probablement RATÉ** :
- L'enrichissement narratif spécifique attendu dans le welcome (le template ne précise pas la formulation exacte attendue). J'aurais signalé "PB pas cité" mais pas dicté la phrase complète.
- Le bug pic volume = 9 nécessite un point de comparaison "attendu". Sans connaître la doctrine "vol pic cible 65-80% objectif", j'aurais accepté un pic 7 km (ratio 70%). Le template référentiel a bien la règle 10k → 7-8 km — donc avec le template à jour, **OUI je l'aurais flagué**.
- L'anomalie S4 phase=recuperation mais volume monte (6→7) : pas dans mon template, **raté**.

**Verdict global** : le template **suffit à 80%**. **À enrichir** :
1. Ajouter un check "cohérence weeklyPhases[i] vs Δ% volume" (si phase='recuperation' alors Δ% doit être <0)
2. Ajouter un check "narratif welcome pour Finisher+PB" plus prescriptif : si Finisher+PB ET allure cible != allure PB, vérifier que le welcome contient explicitement "ton dernier X en Y" + "ton plan vise Z" sinon ⚠️
3. Ajouter un check `feasibility.score` PRÉSENT (pas juste confidenceScore) — révèle bug structurel persistance

---

## 3. ANTOINE — antoineg.gde@outlook.fr (RE-CHECK BUG "2h60min")

| Champ | Valeur |
|---|---|
| UID / Plan ID | `G1QYJ1KzqqWXoB5BbcjKQFmORC02` / `1779086346189` |
| Inscription | 2026-05-18 06:38 |
| Plan | "Préparation Marathon en 3h00 — 22 sem." |
| Profil | Homme, 32 ans, 72 kg, 180 cm, **IMC 22.2** |
| Niveau / VMA | Expert (Performance) / **17.59 km/h** |
| Objectif | Marathon — 3h00 — 18/10/2026 |
| Fréquence / Durée | 6 séances/sem (5 course + 1 renfo) / 22 sem |
| Vol actuel | 80 km/sem |
| PB | 10km=38:06 • semi=1h24 • marathon=3h12 |

### 1. Allure cible — ✅
- Distance objectif : marathon 42.195 km
- Chrono cible : 3h00 → pace nécessaire = **4:16/km**
- `allureSpecifiqueMarathon` : **4:16/km** → ✅ cohérence parfaite (Δ 0s)
- %VMA cible : 75% (attendu 78-86% pour marathon — léger biais bas mais OK)
- PB marathon 3h12 → pace 4:33/km → cushion +5% = 4:47/km. Cible (4:16) plus rapide que PB+cushion : c'est **un chrono cible**, donc `feedback_jamais_baisser_allure_cible` s'applique = respect input user.
- **Verdict** : ✅ allure conforme chrono cible.

### 2. Volume hebdo — ⚠️

Total : 1694 km • Moy : 77 km/sem • **Pic : S7,S11,S15,S19 = 90 km** • Affûtage final S22=45 km (50% du pic)

```
S1 fondamental  68  --     S12 recuperation 72 -20% ↓
S2 fondamental  75 +10%    S13 developpement 83 +15%
S3 fondamental  82  +9%    S14 specifique   86  +4%
S4 recuperation 66 -20% ↓  S15 specifique   90  +5%
S5 fondamental  76 +15%    S16 recuperation 72 -20% ↓
S6 fondamental  86 +13%    S17 specifique   83 +15%
S7 developpement 90 +5% ★  S18 specifique   86  +4%
S8 recuperation 72 -20% ↓  S19 specifique   90  +5%
S9 developpement 83 +15%   S20 affutage     60 -33%
S10 developpement 86 +4%   S21 affutage     53 -12%
S11 developpement 90 +5%   S22 affutage     45 -15%
```

- Saut S→S1 : 80 → 68 = -15% ✅
- Max ↑ : +15% (S4→S5, S8→S9, S12→S13, S16→S17) 🟡
- Semaines décharge : 4, 8, 12, 16 (toutes les 4 sem) ✅ pattern marathon classique
- Pic plateau 90 km × 4 occurrences (S7, S11, S15, S19) — pas de **vraie surcharge progressive vers le pic**. Le plan reste en plateau.
- **Référentiel marathon** : SL pic 28-35 km. SL S1 = 24 km → SL pic probablement 30-32 km ✅
- **Verdict** : ⚠️ structure correcte mais **monotone** (4 pics identiques à 90 km). Pour un Expert/Performance visant 3h00 (vs PB 3h12 = -12 min), on attendrait probablement un pic >100 km au moins une fois. **Plan sécuritaire mais peu ambitieux pour Expert.**

### 3. SL S1 — ✅
- Dimanche : **24 km / 2h01 / pace 5:05** "Sortie Longue en endurance fondamentale"
- Ratio SL/vol hebdo S1 : 35% 🟡 (cible 25-40%)
- Ratio SL/vol actuel user : 30% ✅
- **Verdict** : ✅ SL S1 cohérente Expert marathon.

### 4. Faisabilité — ✅ (BUG "2h60min" PATCHÉ ✅)
- Status : **EXCELLENT** • `feasibility.score` : **ABSENT** ❌ (bug structurel) • confidenceScore : **100**
- `feasibility.message` :
> Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ **3h00min**. Ton objectif de **3h00min** est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

✅ **Aucun bug "2h60min" / "XhYY"** détecté. Format propre.

- `safetyWarning` :
> Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.
> 
> ⚠️ DURÉE DU PLAN : 22 semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en 20 semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.

- **Verdict** : ✅ message propre. Warning durée pertinent et honnête.

### 5. WelcomeMessage — ✅
Texte (593 chars) :
> Bienvenue dans ton plan d'entraînement de 22 semaines pour le Marathon ! Ton objectif de terminer en 3h00 est ambitieux et réaliste, parfaitement aligné avec ton niveau de coureur confirmé. Ce programme est structuré pour te faire progresser progressivement, en construisant une base solide d'endurance, puis en développant tes qualités de vitesse et de résistance spécifiques au marathon. Chaque semaine sera un pas de plus vers ton succès le jour J. Nous te recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

| Check | Verdict |
|---|---|
| Mots interdits | ✅ aucun |
| Allures user citées | ❌ aucune (mais pas Finisher donc moins critique) |
| PB cités | ❌ marathon=3h12 non mentionné |
| Mention sécurité | ✅ médecin + certificat |
| Cohérence niveau | ⚠️ dit "coureur confirmé" alors que niveau=Expert (Performance) |

- **Verdict** : ✅ propre globalement. Léger biais "ambitieux et réaliste" pour passer de 3h12 → 3h00 (-12 min en 22 sem est tendu pour Expert ; en réalité plus AMBITIEUX que EXCELLENT). Mais cohérent avec status EXCELLENT du moteur.

### Synthèse Antoine
- ✅ Bug "2h60min" **patché et confirmé**
- ✅ Allure cible parfaite, SL S1 bonne, message propre
- ⚠️ Plan un peu monotone (4 pics identiques à 90 km) — léger sous-stimulus pour Expert
- ❌ `feasibility.score` absent
- **Action recommandée** : RAS. Patches précédents validés.

---

## 4. ANNABELLE — nabou57@hotmail.fr

| Champ | Valeur |
|---|---|
| UID / Plan ID | `Zdxq3nSp88WYjhQ7ghVM4Z51aQA2` / `1779085742508` |
| Inscription | 2026-05-18 06:28 |
| Plan | "Préparation Semi-Marathon en 1h45 — 7 sem." |
| Profil | Femme, 45 ans, 51 kg, 160 cm, **IMC 19.9** |
| Niveau / VMA | Expert (Performance) / **13.86 km/h** |
| Objectif | Semi — 1h45 — 05/07/2026 |
| Fréquence / Durée | 4 séances/sem (3 course + 1 renfo) / 7 sem |
| Vol actuel | 40 km/sem |
| PB | semi=1h45 • 10km=46:54 • 5km=23:10 |

### 1. Allure cible — ✅
- Distance objectif : semi
- Chrono cible 1h45 / 21.097 km = **4:59/km**
- `allureSpecifiqueSemi` : **4:59/km** → ✅ (Δ 0s)
- %VMA cible : 87% (attendu 82-90% semi) ✅
- **Anomalie identité PB/cible** : PB semi = 1h45 = cible 1h45. Donc viser sa propre PB, c'est plus un "égaliser PB" qu'un "améliorer". Score EXCELLENT serait plus juste qu'un BON ambitieux. Pas un bug, juste cohérence.
- **Verdict** : ✅

### 2. Volume hebdo — ⚠️

```
S1 fondamental    34 --
S2 fondamental    37 +9%
S3 developpement  41 +11%
S4 recuperation   32 -22% ↓DELOAD
S5 specifique     37 +16%
S6 specifique     43 +16% ★PIC
S7 affutage       23 -47%
```

- Total : 247 km • Moy : 35.3 km/sem • Pic : **S6=43 km** • Affûtage : -47% en 1 semaine
- Saut S→S1 : 40 → 34 = -15% ✅
- Max ↑ : +16% (S5→S6, S2→S3) 🟡 légèrement au-dessus 15% ACSM
- **Référentiel semi** : SL pic 16-22 km ✅ (SL S1=13, pic probable ~18-20)
- **Affûtage trop brutal** : 43→23 = -47% en 1 seule semaine. Norme = -30% en 2 semaines glissantes. **Risque de désentraînement aigu pour Expert.**
- **7 sem = court** pour un semi (norme 10-12 sem). Cohérent avec `feasibility.message`.
- **Verdict** : ⚠️ progression OK mais affûtage trop sec.

### 3. SL S1 — ✅
- Dimanche : **13 km / 1h24 / pace 6:28** "Sortie Longue en Endurance Fondamentale"
- Ratio SL/vol hebdo S1 : 38% 🟡 (cible 25-40%)
- Ratio SL/vol actuel user : 33% ✅
- **Verdict** : ✅

### 4. Faisabilité — ✅
- Status : **BON** • `feasibility.score` : **ABSENT** ❌ • confidenceScore : **73**
- `feasibility.message` :
> Avec ta VMA de 13.9 km/h, ton temps théorique sur semi-marathon est d'environ 1h47min. Viser 1h45min est un bel objectif. Avec un entraînement régulier, c'est tout à fait atteignable. Attention : 7 semaines, c'est court pour une préparation semi-marathon. Le plan sera condensé.

- `safetyWarning` :
> À 45 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

- Bug "1h47min" : pas un bug (format propre)
- **Verdict** : ✅ équilibré, warning âge approprié.

### 5. WelcomeMessage — ✅
Texte (709 chars) :
> Bonjour ! Ce plan d'entraînement de 7 semaines te guidera vers ton objectif ambitieux de terminer un semi-marathon en 1h45. Avec un score de faisabilité de 73/100, ton profil est très bon pour atteindre cet objectif avec un entraînement structuré et rigoureux. La première semaine est dédiée à la construction de tes fondations aérobies. Le programme est conçu pour être progressif, en respectant ta capacité et en te préparant étape par étape à la distance et à l'allure ciblée. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 45 ans, un bilan cardio-vasculaire est particulièrement conseillé.

| Check | Verdict |
|---|---|
| Mots interdits | ✅ aucun |
| Allures user citées | ❌ aucune textuelle |
| PB cités | ✅ "1h45" (= cible = PB) |
| Mention sécurité | ✅ médecin + bilan cardio âge |
| Pas de prénom | ⚠️ "Bonjour !" générique alors que prénom dispo = "Annabelle" |
| "score de faisabilité 73/100" | ⚠️ exposition technique du score au user (rare, peut être bien ou mal) |

- **Verdict** : ✅ globalement bon. Petite amélioration cosmétique possible (prénom).

### Synthèse Annabelle
- ✅ Allure cible parfaite, SL S1 bonne, message équilibré, warning âge présent
- ⚠️ Affûtage S6→S7 = -47% trop sec
- ⚠️ Welcome n'utilise pas le prénom
- ❌ `feasibility.score` absent
- **Action recommandée** : RAS (le plan est viable). Si Romane veut perfectionner, patcher affûtage à -25%/-25% sur 2 semaines au lieu d'un seul drop -47%.

---

## 5. ARMANDO — arenaarmando@hotmail.com

| Champ | Valeur |
|---|---|
| UID / Plan ID | `rZwYWXDBJbMDbaRmZ2yAVcSLVED2` / `1779071910169` |
| Inscription | 2026-05-18 02:37 |
| Plan | "Préparation Semi-Marathon en 1h20 — 13 sem." |
| Profil | Homme, 48 ans, 74 kg, 182 cm, **IMC 22.3** |
| Niveau / VMA | Expert (Performance) / **18.26 km/h** |
| Objectif | Semi — 1h20 — 15/08/2026 |
| Fréquence / Durée | 6 séances/sem (5 course + 1 renfo) / 13 sem |
| Vol actuel | 80 km/sem |
| PB | semi=1h20 • 10km=37min |

**Résolution email** : `.com` confirmé du premier essai (compte unique trouvé).

### 1. Allure cible — ✅
- Distance objectif : semi
- Chrono cible 1h20 / 21.097 km = **3:48/km**
- `allureSpecifiqueSemi` : **3:47/km** ✅ (Δ -1s, négligeable)
- %VMA cible : 87% ✅
- **Anomalie identité PB/cible** : PB semi = 1h20 = cible 1h20 (égaliser PB, pas améliorer). Cohérent avec EXCELLENT.
- **Verdict** : ✅

### 2. Volume hebdo — ⚠️

```
S1 fondamental   68 --
S2 fondamental   75 +10%
S3 fondamental   80 +7% ★PIC ← pic dès S3 (inhabituel)
S4 recuperation  64 -20% ↓
S5 developpement 74 +16%
S6 developpement 76 +3%
S7 developpement 80 +5%
S8 recuperation  64 -20% ↓
S9 specifique    74 +16%
S10 specifique   76 +3%
S11 affutage     53 -30%
S12 affutage     47 -11%
S13 affutage     40 -15%
```

- Total : 871 km • Moy : 67 km/sem • **Pic : S3=80 km** (très tôt !) • Affûtage final S13=40 km (50% du pic)
- Saut S→S1 : 80→68 = -15% ✅
- Max ↑ : +16% (S4→S5, S8→S9) 🟡
- Semaines décharge : 4, 8 ✅
- **Anomalie pic S3** : pic atteint en semaine 3 puis plateau à 80 km. Pour une vraie préparation semi 13 sem, on attendrait pic vers S9-S10 (block specifique). Ici pic = fondamental = sous-stimulus en phase specifique.
- **Référentiel semi** : SL pic 16-22 km. SL S1=21 km → déjà au pic en S1, sera ≥21 km presque toute la prépa.
- Affûtage 3 semaines progressif (53→47→40) ✅ bon
- **Verdict** : ⚠️ structure périodisée trop sage. Pour Expert 13 sem, le pic devrait monter à 85-90 km au moins une fois en specifique.

### 3. SL S1 — ✅
- Dimanche : **21 km / 1h43 / pace 4:54** "Sortie Longue en endurance fondamentale"
- Ratio SL/vol hebdo S1 : 31% 🟡 (cible 25-40%)
- Ratio SL/vol actuel user : 26% ✅
- **Verdict** : ✅ très bon pour Expert.

### 4. Faisabilité — ✅
- Status : **EXCELLENT** • `feasibility.score` : **ABSENT** ❌ • confidenceScore : **94**
- `feasibility.message` :
> Avec ta VMA de 18.3 km/h, ton temps théorique sur semi-marathon est d'environ 1h22min. Ton objectif de 1h20min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

- `safetyWarning` :
> À 48 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

- **Verdict** : ✅ propre.

### 5. WelcomeMessage — ✅
Texte (845 chars, structuré en 3 paragraphes) :
> Félicitations pour ton engagement dans la préparation de ce Semi-Marathon avec un objectif ambitieux de 1h20 ! Ce programme de 13 semaines est conçu pour t'aider à atteindre cet objectif en construisant une base solide et en développant progressivement tes qualités spécifiques.
> 
> La première phase, dite 'fondamentale', se concentrera sur le développement de ton endurance aérobie, la consolidation de ton volume hebdomadaire et le renforcement musculaire, sans travail intense de vitesse en début de programme. Nous privilégierons la régularité et l'écoute de tes sensations pour une progression saine et durable.
> 
> Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 48 ans, un bilan cardio-vasculaire est particulièrement conseillé.

| Check | Verdict |
|---|---|
| Mots interdits | ✅ aucun |
| Allures user citées | ❌ aucune textuelle |
| PB cités | ✅ "1h20" (= cible = PB) |
| Mention sécurité | ✅ médecin + bilan cardio âge |
| Pas de prénom | ⚠️ "Félicitations pour ton engagement" générique |

- **Verdict** : ✅ bien structuré.

### Synthèse Armando
- ✅ Allure, SL, message conformes ; sécurité âge OK
- ⚠️ Périodisation un peu sage pour Expert (pic dès S3, plateau)
- ❌ `feasibility.score` absent
- **Action recommandée** : RAS.

---

## SYNTHÈSE GLOBALE

### Bugs récurrents sur les 5 plans

| Bug | Plans concernés | Sévérité | Type |
|---|---|---|---|
| `feasibility.score` non persisté dans Firestore | Alan, Antoine, Annabelle, Armando (4/5) | 🔴 critique (analytique) | Code |
| Pas de `allureSpecifiqueTrail` dans `paces[]` | Alan (1/5 trail) | 🟡 lacune systémique | Code |
| Affûtage trop brutal (-44% à -47% en 1 sem) | Sébastien, Annabelle (2/5 courte durée) | 🟡 mineur | Code |
| Welcome n'utilise pas le prénom user | Annabelle, Armando, Antoine, Alan (4/5) | 🟢 cosmétique | Prompt |
| Welcome déconnecté du status RISQUÉ (pas d'avertissement durée) | Alan (1/1 RISQUÉ) | 🟡 conversion vs sécurité | Prompt |
| `weeklyPhases` "recuperation" mais Δ% > 0 | Sébastien S4 (1/5) | 🟢 cosmétique | Code |
| Welcome cite PB pour Finisher+PB | Tous l'ont sauf Alan (4/5 OK, 1/5 manque) | 🟢 patché majoritairement | Prompt |

### Patches code à prévoir

#### Patch 1 — CRITIQUE — Persister `feasibility.score`
**Fichier** : `src/services/geminiService.ts` ligne 4072-4078

**Actuel** (bug : `score` absent de l'objet `feasibility`) :
```ts
plan.feasibility = {
  status: feasibilityResultPreview.status,
  message: feasibilityResultPreview.message,
  safetyWarning: feasibilityResultPreview.safetyWarning,
  recommendation: feasibilityResultPreview.recommendation,
};
plan.confidenceScore = feasibilityResultPreview.score;
```

**Patch** :
```ts
plan.feasibility = {
  status: feasibilityResultPreview.status,
  score: feasibilityResultPreview.score,           // ← AJOUT
  message: feasibilityResultPreview.message,
  safetyWarning: feasibilityResultPreview.safetyWarning,
  recommendation: feasibilityResultPreview.recommendation,
};
plan.confidenceScore = feasibilityResultPreview.score;
```

**Justification de l'existence du code actuel** : `plan.confidenceScore` est utilisé par le frontend pour afficher un badge global. **Justification du patch** : `feasibility.score` est l'API logique attendue (cf. type `FeasibilityResult` ligne 14 de `feasibilityService.ts` qui contient bien `score`), nécessaire pour audits et cohérence. La ligne `confidenceScore` reste intacte (rétro-compat frontend).

#### Patch 2 — Ajouter `allureSpecifiqueTrail` aux paces
**Fichier** : `src/services/geminiService.ts` lignes 143-146 + 173-176 + 997-1000

**Actuel** : `Paces` n'a que 5k/10k/Semi/Marathon.

**Patch suggéré** : ajouter `allureSpecifiqueTrail?: string` (optionnel, calculé seulement si trail). Formule indicative : `efPace * 1.05` à `efPace * 1.15` selon dénivelé (D+ par km). Hors scope immédiat, mais à roadmap.

**Justification** : aujourd'hui les trail Finisher tournent en `efPace` sur SL — c'est juste mais pas explicite côté pédagogie/preview.

#### Patch 3 — Affûtage progressif minimum 2 semaines
**Fichier** : algo de génération `periodizationPlan.weeklyVolumes[]` (probablement `planValidator.ts` ou directement le prompt Gemini)

**Règle** : pour plans ≥6 semaines, affûtage = 2 dernières semaines minimum avec -25% / -25% au lieu d'un seul drop -45%. À documenter avec ACSM/Daniels.

#### Patch 4 — Welcome doit reprendre l'avertissement de durée si status RISQUÉ
**Fichier** : `src/services/geminiService.ts` (prompt construit pour welcomeMessage)

**Règle** : si `feasibility.status === 'RISQUÉ'` ET `feasibility.message` contient "X semaines" + "Y à Z recommandées", **injecter** cette information dans le welcome ou ajouter une mention "ton délai est tendu : Y-Z semaines seraient idéales".

**Justification** : Alan (RISQUÉ score 35) a un welcome qui passe sous silence l'avertissement "11 sem trop court, 12-16 recommandées" présent dans `feasibility.message`. Risque conversion-vs-sécurité (doctrine `feedback_securite_avant_conversion`).

### Actions immédiates par client

| Client | Action |
|---|---|
| **Alan** | Régénération conseillée ou patch live `welcomeMessage` pour reprendre l'alerte "11 sem trop court". Garder l'option de décaler date course. |
| **Sébastien** | RAS — patches validés. Documenter que le mode "marche-course 2 séances/sem" produit mécaniquement un ratio SL/vol = 75% (limite structurelle, pas un bug). |
| **Antoine** | RAS — bug "2h60min" patché ✅ |
| **Annabelle** | RAS — plan viable. Patch optionnel : adoucir affûtage S6→S7 (-47% → -25%) |
| **Armando** | RAS — plan viable. Suggestion future : monter pic à 85-90 km en specifique |

### Cas Sébastien : le template suffit-il ?

**Réponse** : ~80% oui, à enrichir sur 3 points.

**Enrichissements à ajouter au template `project_template_analyse_post_preview.md`** :

1. **Check "cohérence phase vs Δ%"** : si `weeklyPhases[i] === 'recuperation'` ALORS `weeklyVolumes[i] < weeklyVolumes[i-1]` (sinon ⚠️ étiquetage incohérent).
2. **Check Finisher+PB welcome enrichi** : si Finisher+PB déclaré ET allure cible ≠ pace PB, le welcome DOIT contenir littéralement : "ton dernier {distance} en {temps}" + "ton plan vise {allure cible}" — sinon ⚠️ (et non ✅).
3. **Check `feasibility.score` PRÉSENT** (pas juste `confidenceScore`) : si absent, signaler bug structurel persistance.

Avec ces 3 ajouts, j'aurais détecté **tous** les patches qui ont été nécessaires pour Sébastien dès le premier audit.

---

## Annexe — Données brutes

- `audit-5-plans-template.txt` : log complet de l'audit (510 lignes, dump détaillé tableaux volumes/séances/feasibility/welcome)
- `audit-5-plans-template.json` : dump JSON structuré par client (paces, weeklyVolumes, weeklyPhases, recoveryWeeks, s1.sessions, feasibility, welcomeMessage, verdicts)
- `audit-5-plans-template.mjs` : script réutilisable pour audits futurs (Firestore REST + impersonation service account, lecture seule)

**Note méthodologique** : le script a un mini-bug d'allure cible pour cas marathon quand `goal="Course sur route"` et `subGoal="Marathon"` (testait `goal.includes('marathon')` au lieu de `subGoal.includes('marathon')`). Vérifié manuellement pour Antoine : son `allureSpecifiqueMarathon=4:16` est parfaitement cohérent avec cible 3h00 → 4:16/km. À corriger dans le script avant prochaine ré-utilisation (1 ligne : ajouter `|| sgL.includes('marathon')` ligne ~166).
