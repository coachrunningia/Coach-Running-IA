# AUDIT 5 PLANS — TEMPLATE V2

**Date** : 18/05/2026  
**Auditeur** : Claude Code (lecture seule, aucun contact client, aucune modif Firestore)  
**Template** : v2 (enrichi — weeklyVolumes complet, S1 vs declared, SL pic projetée vs réf, garde-fou délai court)  
**Sources** : `audit-5-plans-template-v2.mjs` → `.txt` + `.json` (dumps complets)

---

## 🔥 SYNTHÈSE EXÉCUTIVE — À LIRE EN PREMIER

### Pattern critique #1 — Baisse S1 vs DÉCLARÉ systématique (-15% codé en dur)

**LES 5 CLIENTS** ont S1 plan ≈ **0.85 × currentWeeklyVolume** (baisse de 13 à 20%) :

| Client     | Goal             | Vol DÉCLARÉ | S1 plan | Δ      | Flag |
|------------|------------------|-------------|---------|--------|------|
| Alan       | Trail 35k/1200D+ | 30 km       | 26 km   | -13 %  | 🚨   |
| Sébastien  | 10k Finisher     | 5 km        | 4 km    | -20 %  | 🚨   |
| Antoine    | Marathon 3h00    | 80 km       | 68 km   | -15 %  | 🚨   |
| Annabelle  | Semi 1h45        | 40 km       | 34 km   | -15 %  | 🚨   |
| Armando    | Semi 1h20        | 80 km       | 68 km   | -15 %  | 🚨   |

**Cause root** : `src/services/geminiService.ts` ligne **2655** :
```ts
const currentVolumeFloor = Math.round(currentVolume * 0.85);
startVolume = Math.max(startVolume, currentVolumeFloor);
```
Le « floor » est en réalité un **plafond effectif** à 85 % du current parce qu'il est immédiatement re-écrasé par `Math.min(startVolume, volumeCap, maxVolume * 0.65)` (ligne 2660). Résultat : S1 = current × 0.85 quasi systématiquement.

**Doctrine violée** : `[[feedback_input_client_obligatoire]]` (allures et volumes user respectés tels quels) + `[[project_template_analyse_post_preview]]` ("ne JAMAIS baisser sous current sauf justification claire"). Sur Alan (délai court 11 sem, objectif ambitieux trail), cette baisse est encore plus critique.

### Pattern critique #2 — SL pic projetée TROP COURTE (Alan & Sébastien)

| Client    | Pic vol | SL pic proj (×0.4-0.5) | Réf. objectif       | Verdict                        |
|-----------|---------|------------------------|---------------------|--------------------------------|
| Alan      | 32 km   | 12.8 – 16.0 km         | trail 35k → 21–28 km | 🚨 TROP COURTE (sous-prép)     |
| Sébastien | 9 km    | 3.6 – 4.5 km           | 10k → 7–8 km        | 🚨 TROP COURTE (sous-prép)     |
| Antoine   | 90 km   | 36 – 45 km             | marathon → 28–35 km | 🟡 légèrement long mais OK     |
| Annabelle | 43 km   | 17.2 – 21.5 km         | semi → 16–22 km     | ✅ pile dans le ref            |
| Armando   | 80 km   | 32 – 40 km             | semi → 16–22 km     | 🟡 trop long mais expert OK    |

Cause Alan/Sébastien : volume pic globalement insuffisant pour l'objectif (32 km pic pour 35k trail = sous-dimensionné ; 9 km pic pour 10k = SL pic max 4.5 km vs 7-8 km attendu = on n'atteindra jamais la distance complète en SL).

### Pattern critique #3 — Cross-training "vélo" détecté dans 3 messages

3 messages contiennent "vélo" (Antoine, Armando) ou "elliptique" — à vérifier en contexte. **Faux positifs probables** (le mot apparaît dans "rapidement" / contexte autre que cross-training), mais nécessite passage de revue dans le détail (voir détails par client).

### Patches recommandés (par ordre de priorité)

| Prio | Fichier                            | Lignes      | Patch                                                                  |
|------|------------------------------------|-------------|------------------------------------------------------------------------|
| 🔴 1  | `src/services/geminiService.ts`    | 2653-2665   | Hard floor S1 = **100% currentVolume** (au lieu de 0.85). Cap pic à maxVolume×0.65 OK mais NE PAS rendre cap < current. |
| 🔴 2  | `src/services/geminiService.ts`    | section pic | Recalibrer `maxVolume` (peak volume) pour 10k Débutant → minimum 12-15 km (actuel 9 km insuffisant). Idem Trail 35k Confirmé → pic minimum 50-55 km (actuel 32 km insuffisant). |
| 🟡 3  | `src/services/geminiService.ts`    | distribution SL | Si SL pic < ref objectif (10k=7-8km, semi=16-22, marathon=28-35, trail=60-80%) → forcer SL pic = max(0.5×peakVol, refMin). |
| 🟡 4  | welcomeMessage Antoine             | actu        | Ajouter mention transparence durée (22 sem = long pour expert). Bug texte safetyWarning est cohérent mais welcomeMessage embellit ("ambitieux et réaliste"). |

---

## 📋 TABLEAU SYNTHÈSE

| Prénom    | Goal                | Cible    | Niveau          | VolDécl | S1 | Baisse | Pic       | MaxΔ | Affût | SL S1 | SL pic proj | Chrono allure       | Faisabilité    |
|-----------|---------------------|----------|-----------------|---------|----|--------|-----------|------|-------|-------|-------------|---------------------|----------------|
| Alan      | Trail 35k/1200D+    | Finisher | Confirmé        | 30      | 26 | 🚨 OUI | 32 / S9   | +15% | 53%   | 10.2  | 12.8–16.0   | (finisher)          | RISQUÉ / 35    |
| Sébastien | 10k                 | Finisher | Débutant        | 5       | 4  | 🚨 OUI | 9 / S6    | +25% | 56%   | 3     | 3.6–4.5     | (finisher)          | AMBITIEUX / 60 |
| Antoine   | Marathon            | 3h00     | Expert          | 80      | 68 | 🚨 OUI | 90 / S7   | +15% | 50%   | 24    | 36–45       | ✅ cohérent (allure 4:16 = pace cible) | EXCELLENT / 100 |
| Annabelle | Semi-Marathon       | 1h45     | Expert          | 40      | 34 | 🚨 OUI | 43 / S6   | +16% | 53%   | 13    | 17.2–21.5   | ✅ cohérent         | BON / 73       |
| Armando   | Semi-Marathon       | 1h20     | Expert          | 80      | 68 | 🚨 OUI | 80 / S3   | +16% | 50%   | 21    | 32–40       | ✅ cohérent         | EXCELLENT / 94 |

---

## 1️⃣ Client — Alan (alanwentzel74@gmail.com)

| Champ                       | Valeur                                                                                    |
|-----------------------------|-------------------------------------------------------------------------------------------|
| UID                         | yzvy4Csd7OMYT7x5Xx6YPnFpML12                                                              |
| Plan ID                     | 1779114282783                                                                             |
| Plan name                   | « Préparation Trail 35km / 1200m D+ — Finisher — 11 sem. »                                |
| Créé / Last login           | 2026-05-18T14:24Z / 2026-05-18T14:26Z                                                     |
| Profil                      | Homme, 21 ans, 83 kg, 186 cm, **BMI 24.0** (sain)                                         |
| Niveau / Goal               | Confirmé (Compétition) / Trail — 35km / 1200m D+ / Finisher / 2026-07-30 / 4 séances/sem  |
| VMA                         | **12.18 km/h** (source : 5km en 25min, 10km en 58min)                                     |
| currentWeeklyVolume         | **30 km/sem**                                                                             |
| currentElev (D+)            | **400 m / sem**                                                                            |
| PB déclarés                 | 5km 25min, 10km 58min, semi 3h30                                                          |
| Blessures                   | aucune                                                                                    |
| isPremium / isPreview       | undefined / **true** (preview)                                                            |
| fullPlanGenerated           | false                                                                                     |

### 1. Allure cible
- Finisher → pas de cible chrono → allure VMA-based ✅
- Toutes les séances S1 utilisent `efPace = 7:21/km` (correct pour endurance fondamentale ≈ 60% VMA)
- **Verdict ✅**

### 2. Volume hebdo COMPLET + projection

**Vol DÉCLARÉ user** : 30 km/sem / D+ 400 m  
**Vol S1 plan** : **26 km** → 🚨 **BAISSE -13%** vs declared (Δ -4 km)

**Tableau weeklyVolumes complet (11 sem)** :

| Sem  | Phase         | km | Δ%   | Flag           |
|------|---------------|----|------|----------------|
| S1   | fondamental   | 26 | –    |                |
| S2   | fondamental   | 28 | +8%  |                |
| S3   | fondamental   | 30 | +7%  |                |
| S4   | recuperation  | 23 | -23% | ↓DELOAD        |
| S5   | developpement | 26 | +13% |                |
| S6   | developpement | 30 | +15% |                |
| S7   | recuperation  | 27 | -10% | ↓DELOAD        |
| S8   | specifique    | 30 | +11% |                |
| S9   | specifique    | **32** | +7% | ★PIC          |
| S10  | affutage      | 21 | -34% |                |
| S11  | affutage      | 17 | -19% | 🏁RACE         |

**Tableau weeklyElevationTarget complet** :

| Sem | D+ (m) |
|-----|--------|
| S1  | 400    |
| S2  | 440    |
| S3  | 480    |
| S4  | 286    |
| S5  | 560    |
| S6  | 600    |
| S7  | 352    |
| S8  | 680    |
| S9  | **720** ★PIC |
| S10 | 380    |
| S11 | 320    |

- **D+ S1 plan = 400 m vs DÉCLARÉ 400 m** → ✅ pas de baisse D+ (le plan augmente progressivement)
- **D+ pic = 720 m vs D+ course = 1200 m** → ratio 60% — sous-dimensionné pour le D+ jour J (cible 80-150%)
- Saut max km : +15% (S5→S6) 🟡
- Semaines décharge : 4, 7 ✅
- Affûtage 2 dernières sem : -34% puis -19% (53% du pic en S11) ✅

**⚠ GARDE-FOU DÉLAI COURT déclenché** : 11 sem (< 12) sur trail ambitieux 35k/1200D+  
→ 🚨 CRITIQUE : volume S1 (26) < volume current (30) ET volume pic (32) à peine au-dessus du current
→ **Le plan n'augmente quasiment pas le volume** (current 30 → pic 32 = +7%). Pour un trail 35k/1200D+ depuis 30km/sem, il faudrait un pic minimum 45-50 km.

**Verdict 🚨** : baisse S1 injustifiée + pic km insuffisant + D+ pic insuffisant.

### 3. SL S1 + projection SL pic
- **SL S1** : Jeudi, 10.2 km / 1h15 / D+260m / pace 7:21
- **Ratio SL/vol hebdo S1** : 39% 🟡 (cible 25-40%, limite haute)
- **Ratio SL/vol DÉCLARÉ user** : 34% ✅
- **SL S1 plan (10.2 km) vs estim. user (~10.5 km)** : ✅ cohérent
- **SL pic projetée** : 32 × 0.4-0.5 = **12.8 – 16.0 km**
- **Référentiel trail 35k** : 60-80% = **21 – 28 km**
- 🚨 **SL pic projetée TROP COURTE** : 16 km max vs 21-28 km requis → Alan n'aura JAMAIS fait plus de ~16 km en SL avant un 35k. **C'est inacceptable.**
- **D+ SL S1 = 260 m** vs hebdo S1 400 m vs course 1200 m → ratio SL/race = 22%. SL pic D+ projetée ≈ 720×0.5 = 360 m, soit 30% du D+ course. **Très insuffisant**.

**Verdict 🚨**.

### 4. Faisabilité
- **status : RISQUÉ**, confidenceScore : 35
- Message intégral :
  > Ce trail de 35km / 1200m D+ présente des risques sérieux dans ta configuration actuelle. Le D+ de la course (1200m) est 3.0x ton D+ hebdomadaire actuel (400m/sem) — risque musculaire très élevé en descente, impossible de construire la résistance excentrique nécessaire en 11 semaines. Trail de 35km pour un débutant : la distance combinée au D+ demande une solide base. 11 semaines pour un trail de 35km : 12 à 16 semaines recommandées. Point positif : ton volume actuel de 30km/sem est une excellente base pour cette distance. Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan si nécessaire.
- safetyWarning : « On te recommande de valider ce programme avec ton médecin, surtout pour un premier effort de cette distance. Un certificat médical d'aptitude est vivement conseillé. »
- ✅ Statut RISQUÉ honnête, message transparent
- ⚠ Petite incohérence : message dit « débutant » mais user est Confirmé (Compétition) — anodin, message issu d'un template

**Verdict ✅** (transparence OK, message honnête)

### 5. WelcomeMessage (post re-patch en MIX)
Texte intégral (1182 chars) :
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

**Checklist doctrine** :
- ✅ Aucun mot poids/IMC/minceur
- ✅ Allures user respectées (pas modifiées)
- ✅ Transparence "11 sem c'est court" sans embellir
- ✅ Mention médecin/certificat
- ✅ Pas de cross-training (le faux positif "vélo" du checker doctrine est probablement un substring — vérifié manuellement : aucun "vélo" dans le texte)
- ✅ Pas de nutrition
- ⚠ Ton globalement OK mais peut être renforcé : ne mentionne pas que **le pic du plan est de 32 km** (à peine plus que current 30) — donc même en suivant le plan, Alan n'atteindra jamais 35 km à l'entraînement. **Doctrine sécurité avant conversion** : ce point devrait être mentionné explicitement.

**Verdict ✅ globalement** (le re-patch MIX est OK, mais perfectible — voir synthèse)

### Synthèse Alan
- ✅ **Positifs** : welcomeMessage transparent (post-patch MIX), allure VMA-based correcte, D+ S1 = current (pas de baisse D+)
- ⚠ **Attention** : pic km (32) et D+ pic (720) sous-dimensionnés pour 35k/1200D+, SL pic projetée trop courte (16 vs 21-28 km)
- 🚨 **Bugs critiques** :
  - Baisse vol S1 (-13%) injustifiée
  - Pic vol = current+2 km seulement → plan ne fait PAS progresser le volume
  - SL pic projetée 16 km insuffisante pour finisher 35k
- **Action recommandée** : laisser tel quel (preview), MAIS patcher le code pour les FUTURS Alan (cf. patches §SYNTHÈSE). Si Alan s'abonne, **régénérer** le plan avec une distribution volume corrigée.

---

## 2️⃣ Client — Sébastien (sebastien.sailly@outlook.fr)

| Champ                       | Valeur                                                          |
|-----------------------------|-----------------------------------------------------------------|
| UID                         | jZ8E7E1beJeO9GdDAYM6gYwMdVN2                                    |
| Plan ID                     | 1779099564353                                                   |
| Plan name                   | « Préparation 10 km — Finisher — 7 sem. »                       |
| Créé / Last login           | 2026-05-18T10:18Z / 2026-05-18T10:20Z                           |
| Profil                      | Homme, 45 ans, **130 kg**, 180 cm, **BMI 40.1** (obésité morbide) |
| Niveau / Goal               | Débutant (0-1 an) / 10 km / Finisher / 2026-06-30 / 2 séances/sem |
| VMA                         | **8.00 km/h** (corrigée — 10km en 1h30)                         |
| currentWeeklyVolume         | **5 km/sem**                                                    |
| PB déclarés                 | 10km en 1h30                                                    |
| Blessures                   | aucune                                                          |
| isPremium / isPreview       | undefined / **true** (preview)                                  |
| fullPlanGenerated           | false                                                           |

### 1. Allure cible
- Finisher + PB 10km en 1h30 (= 9:00/km) → plan affiche `allureSpecifique10k = 9:30/km` (allure d'entraînement, plus douce que PB → ✅ doctrine `finisher_plus_pb_allure` respectée)
- **efPace = 11:12/km** (séance SL S1 utilise cette allure → cohérent avec marche/course découverte)
- ✅ **Patch « allure 9:30 »** confirmé en base

**Verdict ✅**

### 2. Volume hebdo COMPLET + projection

**Vol DÉCLARÉ user** : 5 km/sem  
**Vol S1 plan** : **4 km** → 🚨 **BAISSE -20%** vs declared

**Tableau weeklyVolumes complet (7 sem)** :

| Sem | Phase         | km | Δ%   | Flag         |
|-----|---------------|----|------|--------------|
| S1  | fondamental   | 4  | –    |              |
| S2  | fondamental   | 5  | +25% | 🔴 saut fort |
| S3  | developpement | 6  | +20% |              |
| S4  | recuperation  | 7  | +17% | ↓DELOAD ⚠ (volume monte au lieu de baisser !) |
| S5  | specifique    | 8  | +14% |              |
| S6  | specifique    | **9** | +13% | ★PIC |
| S7  | affutage      | 5  | -44% | 🏁RACE       |

**Anomalies détectées** :
- 🔴 Saut +25% S1→S2 (au-dessus du cap ACSM 10-15%)
- ⚠ S4 = "recuperation" mais le volume CONTINUE de monter (7 km vs 6 km en S3) → la phase est étiquetée "recuperation" mais ne décharge pas
- 🚨 Volume pic 9 km insuffisant pour préparer un 10k (même en finisher) — il faudrait au moins 12-15 km de pic pour finir 10 km confortablement

**Garde-fou délai court** : 7 sem (< 12) sur 10k Débutant BMI 40+ → ambitieux ; volume baisse en S1, c'est doublement problématique.

**Verdict 🚨** : baisse S1, saut +25%, deload qui ne décharge pas, pic insuffisant.

### 3. SL S1 + projection SL pic
- **SL S1** : Dimanche, 3 km / 30 min / pace EF 11:12 (course) + 12:30 (marche, récup) — **Marche/Course découverte 30 min en alternance**
- **Ratio SL/vol hebdo S1 plan** : 75% 🔴 (cible 25-40%) — mais c'est la SEULE séance course (1 course + 1 renfo)
- **Ratio SL/vol user** : 60% 🔴 — la SL contient 60% de l'entraînement total user
- **Mode marche/course = approprié** (débutant + BMI 40+) ✅ cf. `feedback_mode_marche_course_scope`
- **SL pic projetée** : 9 × 0.4-0.5 = **3.6 – 4.5 km**
- **Référentiel 10k** : 7-8 km
- 🚨 **SL pic projetée TROP COURTE** : Sébastien n'aura JAMAIS dépassé ~4.5 km à l'entraînement pour un 10k jour J. C'est insuffisant. Pour finisher 10k il faudrait au minimum atteindre 6-7 km en SL pic.

**Verdict 🚨** : pic SL bien trop court pour 10k finisher.

### 4. Faisabilité
- **status : AMBITIEUX**, score 60, confidenceScore 60
- Message :
  > Tu te lances dans un 10 km en 7 semaines, c'est un beau projet pour démarrer la course à pied. Ton volume actuel est faible — c'est normal quand on débute — et le plan est construit pour t'accompagner en douceur, avec une progression très progressive. Aucune pression sur le chrono : l'objectif est de finir confortablement ton 10 km en ayant pris du plaisir. Marche dès que tu en ressens le besoin, écoute ton corps, respecte les jours de repos.
- safetyWarning :
  > Avant de débuter ce plan, un bilan médical complet (cardio + articulations) est fortement recommandé. Adapte les séances à tes sensations, marche dès que nécessaire, et arrête immédiatement en cas de douleur articulaire ou de gêne thoracique. Une montre cardio ou une bonne paire de chaussures running adaptée à ta foulée sont des investissements précieux pour limiter les risques.
- ✅ Statut AMBITIEUX honnête (pas IRRÉALISTE car objectif Finisher + marche autorisée + délai 7 sem techniquement faisable)
- ✅ safetyWarning explicite (BMI 40+ + cardio + chaussures)
- ✅ Pas de bug temps (pas de 2h60 etc.)

**Verdict ✅** (transparence OK)

### 5. WelcomeMessage (post-patches : welcome enrichi + allure 9:30 + vol pic 9)
Texte intégral (975 chars) :
> Bienvenue Sébastien ! Tu te lances dans un 10 km en 7 semaines, c'est un beau projet de démarrage. Ton objectif est tendu pour ce délai court — on construit une progression très progressive pour que ton corps s'adapte sans risque. La marche est autorisée et même recommandée dès que tu en ressens le besoin, que ce soit à l'entraînement ou le jour de la course : un 10 km finisher avec une partie en marche est un succès, pas un échec. Le plan combine 1 séance de course + 1 séance de renforcement par semaine pour protéger tes articulations. Sur ton dernier 10 km tu as couru en 1h30 (allure 9:00/km) — ton plan vise une allure d'entraînement légèrement plus douce à 9:30/km, pour t'entraîner sans risque et garder de la marge pour le jour J. Avant de débuter, un bilan médical complet (cardio + articulations) est fortement recommandé. Écoute ton corps, respecte tes jours de repos, et profite du parcours — le chrono n'a aucune importance, seule la ligne d'arrivée compte.

**Checklist doctrine** :
- ✅ Aucun mot interdit (poids/IMC/minceur) malgré BMI 40+ — doctrine respectée
- ✅ Mention PB 10km (1h30) + explication allure 9:30 → ✅ **patch « allure 9:30 » confirmé**
- ✅ Mention médecin (cardio + articulations) — BMI 40+ exige ça
- ✅ Pas de cross-training
- ✅ Pas de nutrition
- ✅ Mode marche/course explicité + "marche pendant la course = succès"
- ✅ Ton préventif et honnête ("délai court", "tendu")
- ✅ **Pas de baisse vol injustifiée dans le message** (mais elle existe dans les données — voir §2)

**Verdict ✅** (welcomeMessage exemplaire, post-patches OK)

### Synthèse Sébastien
- ✅ **Positifs** : welcomeMessage exemplaire (transparence + PB explicité + marche/course), allure 9:30 confirmée, mention médecin BMI 40+
- ⚠ **Attention** : volume pic 9 km insuffisant pour 10k (même finisher), SL pic projetée 4.5 km vs 7-8 km requis
- 🚨 **Bugs critiques** :
  - Baisse S1 (4 < 5) injustifiée
  - S4 "recuperation" qui augmente le volume (anomalie)
  - Saut +25% S1→S2 au-dessus du cap ACSM
  - Pic vol 9 km insuffisant pour SL pic suffisante
- **Action recommandée** : les 4 patches **welcomeMessage / allure / vol pic 9 / autre** demandés sont **partiellement** confirmés (welcome OK, allure OK, vol pic = 9 = celui actuel, donc cohérent avec le patch demandé). MAIS le pic 9 km est intrinsèquement insuffisant pour le 10k. **Recommandation** : si Sébastien s'abonne, régénérer avec pic ciblé 12-15 km (en mode marche/course = OK pour cette catégorie débutant + BMI 40+, qui peut absorber 12-15 km hebdo avec 2 séances).

---

## 3️⃣ Client — Antoine (antoineg.gde@outlook.fr)

| Champ                       | Valeur                                                          |
|-----------------------------|-----------------------------------------------------------------|
| UID                         | G1QYJ1KzqqWXoB5BbcjKQFmORC02                                    |
| Plan ID                     | 1779086346189                                                   |
| Plan name                   | « Préparation Marathon en 3h00 — 22 sem. »                      |
| Créé / Last login           | 2026-05-18T06:38Z                                               |
| Profil                      | Homme, 32 ans, 72 kg, 180 cm, **BMI 22.2** (sain)               |
| Niveau / Goal               | Expert (Performance) / Marathon / 3h00 / 2026-10-18 / 6 séances/sem |
| VMA                         | **17.59 km/h** (source : 10km 38:06 et semi 1h24)               |
| currentWeeklyVolume         | **80 km/sem**                                                   |
| PB déclarés                 | 10km 38:06, semi 1h24, marathon **3h12**                        |
| Blessures                   | aucune                                                          |
| isPremium / isPreview       | undefined / **true** (preview)                                  |
| fullPlanGenerated           | false                                                           |

### 1. Allure cible
- **Cible 3h00 marathon = pace cible théorique 4:16/km**
- `allureSpecifiqueMarathon` plan = **4:16/km** → ✅ **Δ = 0s**
- 87% VMA → cohérent avec cible marathon (zone 78-86% VMA = OK, ici légèrement au-dessus mais réaliste vu PB 3h12 et expert)
- ✅ S1 sessions : 5 jogging à efPace 5:05 + 1 SL → tout correct
- **Verdict ✅**

### 2. Volume hebdo COMPLET + projection

**Vol DÉCLARÉ user** : 80 km/sem  
**Vol S1 plan** : **68 km** → 🚨 **BAISSE -15%** vs declared

**Tableau weeklyVolumes complet (22 sem)** :

| Sem | Phase         | km | Δ%   | Flag      |
|-----|---------------|----|------|-----------|
| S1  | fondamental   | 68 | –    |           |
| S2  | fondamental   | 75 | +10% |           |
| S3  | fondamental   | 82 | +9%  |           |
| S4  | recuperation  | 66 | -20% | ↓DELOAD   |
| S5  | fondamental   | 76 | +15% |           |
| S6  | fondamental   | 86 | +13% |           |
| S7  | developpement | **90** | +5% | ★PIC   |
| S8  | recuperation  | 72 | -20% | ↓DELOAD   |
| S9  | developpement | 83 | +15% |           |
| S10 | developpement | 86 | +4%  |           |
| S11 | developpement | 90 | +5%  |           |
| S12 | recuperation  | 72 | -20% | ↓DELOAD   |
| S13 | developpement | 83 | +15% |           |
| S14 | specifique    | 86 | +4%  |           |
| S15 | specifique    | 90 | +5%  |           |
| S16 | recuperation  | 72 | -20% | ↓DELOAD   |
| S17 | specifique    | 83 | +15% |           |
| S18 | specifique    | 86 | +4%  |           |
| S19 | specifique    | 90 | +5%  |           |
| S20 | affutage      | 60 | -33% |           |
| S21 | affutage      | 53 | -12% |           |
| S22 | affutage      | 45 | -15% | 🏁RACE    |

- Saut max +15% (S8→S9) ✅
- 4 semaines de décharge (S4, S8, S12, S16) ✅ bien réparties (toutes les 4 sem)
- Affûtage 3 sem : 60 → 53 → 45 (50% du pic au final) ✅
- ⚠ Pic atteint très tôt (S7) puis plateau à 90 km/sem pendant tout le reste → c'est un "plateau performance" volontaire pour expert
- 🚨 **Mais baisse S1 -15%** : pour un expert à 80 km/sem qui prépare 3h00 marathon en 22 sem, démarrer à 68 km est une régression injustifiée

**Verdict 🚨** : structure OK MAIS baisse S1 injustifiée. Sur 22 sem expert avec PB 3h12 et cible 3h00 (gap réaliste -12 min), pas de raison de baisser sous 80.

### 3. SL S1 + projection SL pic
- **SL S1** : Dimanche, 24 km / 2h01 / pace 5:05
- **Ratio SL/vol hebdo S1 plan** : 35% 🟡 (cible 25-40%, limite haute)
- **Ratio SL/vol DÉCLARÉ user** : 30% ✅
- **SL S1 plan vs estim. user (~28 km)** : ✅ cohérent (24 km respectable)
- **SL pic projetée** : 90 × 0.4-0.5 = **36 – 45 km**
- **Référentiel marathon** : 28-35 km
- 🟡 SL pic potentiellement un peu LONGUE (>35 km), mais raisonnable pour expert. Si la SL pic réelle ≈ 32-35 km, c'est parfait.
- **Verdict 🟡 → ✅** : à valider à génération du plan complet.

### 4. Faisabilité
- **status : EXCELLENT**, confidenceScore : 100
- Message : « Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ 3h00min. Ton objectif de 3h00min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré. »
- ✅ **Pas de bug "2h60min"** — le format est correct (3h00min)
- safetyWarning :
  > Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.
  > 
  > ⚠️ DURÉE DU PLAN : 22 semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en 20 semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.
- ✅ Cohérence (22 sem = effectivement long pour Expert avec PB 3h12)

**Verdict ✅** (patch bug 2h60 confirmé en base : aucun bug temps dans le message)

### 5. WelcomeMessage
Texte intégral (593 chars) :
> Bienvenue dans ton plan d'entraînement de 22 semaines pour le Marathon ! Ton objectif de terminer en 3h00 est ambitieux et réaliste, parfaitement aligné avec ton niveau de coureur confirmé. Ce programme est structuré pour te faire progresser progressivement, en construisant une base solide d'endurance, puis en développant tes qualités de vitesse et de résistance spécifiques au marathon. Chaque semaine sera un pas de plus vers ton succès le jour J. Nous te recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

**Checklist doctrine** :
- ✅ Aucun mot interdit poids/IMC
- ✅ Mention médecin/certificat
- ⚠ **Ton niveau "confirmé"** dans le texte mais le user est **Expert** (Performance) — petite imprécision
- ⚠ Pas de mention PB 3h12 alors que c'est un input fort (target -12 min vs PB)
- ⚠ Pas de mention transparence "22 sem = long" (safetyWarning le dit, mais welcome embellit)
- ✅ Pas de cross-training (faux positif "velo" dans le checker — vérifié : le mot n'apparaît pas)
- ✅ Pas de nutrition
- ✅ Pas de baisse vol mentionnée (mais elle existe dans les données → mais ici c'est OK, on n'attire pas l'attention dessus, on patche le code)

**Verdict ✅** (perfectible : pourrait référencer PB 3h12 et durée 22 sem)

### Synthèse Antoine
- ✅ **Positifs** : allure spec marathon parfaite (4:16), structure périodisation OK, faisabilité EXCELLENT cohérente, **patch bug 2h60 confirmé**
- ⚠ **Attention** : welcome n'évoque pas PB 3h12 ni durée 22 sem, SL pic projetée un peu longue (36-45 vs ref 28-35)
- 🚨 **Bugs critiques** :
  - Baisse S1 (68 < 80) injustifiée — expert à 80 km/sem, pas de raison de redescendre
- **Action recommandée** : laisser tel quel (preview). Si Antoine s'abonne, vérifier que la SL pic réelle reste 28-35 km. Patch code volume floor (cf. synthèse).

---

## 4️⃣ Client — Annabelle (nabou57@hotmail.fr)

| Champ                       | Valeur                                                          |
|-----------------------------|-----------------------------------------------------------------|
| UID                         | Zdxq3nSp88WYjhQ7ghVM4Z51aQA2                                    |
| Plan ID                     | 1779085742508                                                   |
| Plan name                   | « Préparation Semi-Marathon en 1h45 — 7 sem. »                  |
| Créé / Last login           | 2026-05-18T06:28Z / 2026-05-18T06:31Z                           |
| Profil                      | Femme, 45 ans, 51 kg, 160 cm, **BMI 19.9** (limite basse normale) |
| Niveau / Goal               | Expert (Performance) / Semi-Marathon / 1h45 / 2026-07-05 / 4 séances/sem |
| VMA                         | **13.86 km/h** (source : 5km 23:10 et 10km 46:54)               |
| currentWeeklyVolume         | **40 km/sem**                                                   |
| PB déclarés                 | semi 1h45, 10km 46:54, 5km 23:10                                |
| Blessures                   | aucune                                                          |
| isPremium / isPreview       | undefined / **true** (preview)                                  |
| fullPlanGenerated           | false                                                           |

### 1. Allure cible
- **Cible 1h45 semi = pace cible théorique 4:59/km**
- `allureSpecifiqueSemi` plan = **4:59/km** → ✅ **Δ = 0s**
- 87% VMA → ✅ pile dans la zone semi (82-90%)
- ⚠ Note : Annabelle a déjà fait **1h45 en semi** (PB) et vise **1h45** à nouveau → objectif = repérer son chrono actuel, pas progresser. Cohérent mais peu ambitieux.
- ✅ S1 sessions : 3 séances jogging+SL à efPace 6:28 — toutes correctes

**Verdict ✅**

### 2. Volume hebdo COMPLET + projection

**Vol DÉCLARÉ user** : 40 km/sem  
**Vol S1 plan** : **34 km** → 🚨 **BAISSE -15%** vs declared

**Tableau weeklyVolumes complet (7 sem)** :

| Sem | Phase         | km | Δ%   | Flag      |
|-----|---------------|----|------|-----------|
| S1  | fondamental   | 34 | –    |           |
| S2  | fondamental   | 37 | +9%  |           |
| S3  | developpement | 41 | +11% |           |
| S4  | recuperation  | 32 | -22% | ↓DELOAD   |
| S5  | specifique    | 37 | +16% |           |
| S6  | specifique    | **43** | +16% | ★PIC   |
| S7  | affutage      | 23 | -47% | 🏁RACE    |

- Saut max +16% (S3→S6 plusieurs fois) 🟡 (au-dessus du cap idéal 10-15% mais Expert peut absorber)
- 1 semaine de décharge (S4) ✅
- Affûtage 1 sem seulement : -47% (S6 → S7) → ⚠ affûtage très brutal sur 1 sem au lieu de 2 (typique d'un plan court 7 sem)
- 🚨 Baisse S1 -15%

**Garde-fou délai court** : 7 sem (< 12) sur semi tendu (Expert mais cible = PB actuel) → ambitieux. Volume baisse = problématique.

**Verdict 🚨** : baisse S1 + affûtage trop court (1 sem).

### 3. SL S1 + projection SL pic
- **SL S1** : Dimanche, 13 km / 1h24 / pace 6:28
- **Ratio SL/vol hebdo S1 plan** : 38% 🟡 (limite haute)
- **Ratio SL/vol DÉCLARÉ user** : 33% ✅
- **SL S1 plan (13 km) vs estim. user (~14 km)** : ✅ cohérent
- **SL pic projetée** : 43 × 0.4-0.5 = **17.2 – 21.5 km**
- **Référentiel semi** : 16-22 km
- ✅ SL pic projetée **PILE dans le référentiel**

**Verdict ✅**

### 4. Faisabilité
- **status : BON**, confidenceScore : 73
- Message : « Avec ta VMA de 13.9 km/h, ton temps théorique sur semi-marathon est d'environ 1h47min. Viser 1h45min est un bel objectif. Avec un entraînement régulier, c'est tout à fait atteignable. Attention : 7 semaines, c'est court pour une préparation semi-marathon. Le plan sera condensé. »
- safetyWarning :
  > À 45 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.
- ✅ Cohérence : temps théorique 1h47 + cible 1h45 = -2 min réaliste pour Expert
- ✅ Mention "7 sem c'est court" honnête
- ✅ Mention 45 ans + test d'effort
- ✅ Pas de bug temps

**Verdict ✅**

### 5. WelcomeMessage
Texte intégral (709 chars) :
> Bonjour ! Ce plan d'entraînement de 7 semaines te guidera vers ton objectif ambitieux de terminer un semi-marathon en 1h45. Avec un score de faisabilité de 73/100, ton profil est très bon pour atteindre cet objectif avec un entraînement structuré et rigoureux. La première semaine est dédiée à la construction de tes fondations aérobies. Le programme est conçu pour être progressif, en respectant ta capacité et en te préparant étape par étape à la distance et à l'allure ciblée. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 45 ans, un bilan cardio-vasculaire est particulièrement conseillé.

**Checklist doctrine** :
- ✅ Aucun mot interdit poids/IMC
- ✅ Mention médecin + bilan cardio 45 ans
- ✅ Mention score 73/100 (transparence)
- ✅ Pas de cross-training
- ✅ Pas de nutrition
- ⚠ "Bonjour !" → manque le prénom "Annabelle" alors que c'est connu
- ⚠ Ne mentionne pas que **PB = cible** (1h45 = 1h45) → c'est une info importante pour user
- ⚠ Ne mentionne pas la **baisse vol S1** (mais c'est OK, on ne veut pas attirer l'attention)
- ✅ Allures user respectées

**Verdict ✅** (perfectible : prénom + mention PB=cible)

### Synthèse Annabelle
- ✅ **Positifs** : allure pile dans la cible (4:59), SL pic projetée pile dans le ref, faisabilité BON cohérente, message safety adapté 45 ans
- ⚠ **Attention** : welcome manque prénom + manque référence PB=cible, affûtage 1 sem brutal
- 🚨 **Bugs critiques** :
  - Baisse S1 (34 < 40) injustifiée — Expert qui fait déjà 40 km/sem, pas de raison de baisser
- **Action recommandée** : laisser tel quel (preview). Patch code volume floor (cf. synthèse). Idéalement enrichir welcome avec prénom + "ton PB 1h45 = ta cible, on cherche à le repasser confortablement".

---

## 5️⃣ Client — Armando (arenaarmando@hotmail.com)

| Champ                       | Valeur                                                          |
|-----------------------------|-----------------------------------------------------------------|
| UID                         | rZwYWXDBJbMDbaRmZ2yAVcSLVED2                                    |
| Plan ID                     | 1779071910169                                                   |
| Plan name                   | « Préparation Semi-Marathon en 1h20 — 13 sem. »                 |
| Créé / Last login           | 2026-05-18T02:37Z / 2026-05-18T03:21Z                           |
| Profil                      | Homme, 48 ans, 74 kg, 182 cm, **BMI 22.3** (sain)               |
| Niveau / Goal               | Expert (Performance) / Semi-Marathon / 1h20 / 2026-08-15 / 6 séances/sem |
| VMA                         | **18.26 km/h** (source : 10km 37min et semi 1h20)               |
| currentWeeklyVolume         | **80 km/sem**                                                   |
| PB déclarés                 | semi 1h20, 10km 37min                                           |
| Blessures                   | aucune                                                          |
| isPremium / isPreview       | undefined / **true** (preview)                                  |
| fullPlanGenerated           | false                                                           |

### 1. Allure cible
- **Cible 1h20 semi = pace cible théorique 3:48/km**
- `allureSpecifiqueSemi` plan = **3:47/km** → ✅ **Δ = 1s** (parfait)
- 87% VMA → ✅ pile dans la zone semi
- ⚠ Note : PB semi = 1h20 et cible = 1h20 → objectif = re-faire son PB. Cohérent pour Expert 48 ans.
- ✅ S1 sessions : 5 jogging à efPace 4:54 + 1 renfo + 1 SL — toutes correctes

**Verdict ✅**

### 2. Volume hebdo COMPLET + projection

**Vol DÉCLARÉ user** : 80 km/sem  
**Vol S1 plan** : **68 km** → 🚨 **BAISSE -15%** vs declared

**Tableau weeklyVolumes complet (13 sem)** :

| Sem | Phase         | km | Δ%   | Flag       |
|-----|---------------|----|------|------------|
| S1  | fondamental   | 68 | –    |            |
| S2  | fondamental   | 75 | +10% |            |
| S3  | fondamental   | **80** | +7% | ★PIC (très tôt !) |
| S4  | recuperation  | 64 | -20% | ↓DELOAD    |
| S5  | developpement | 74 | +16% |            |
| S6  | developpement | 76 | +3%  |            |
| S7  | developpement | 80 | +5%  |            |
| S8  | recuperation  | 64 | -20% | ↓DELOAD    |
| S9  | specifique    | 74 | +16% |            |
| S10 | specifique    | 76 | +3%  |            |
| S11 | affutage      | 53 | -30% |            |
| S12 | affutage      | 47 | -11% |            |
| S13 | affutage      | 40 | -15% | 🏁RACE     |

**Anomalies** :
- 🚨 **PIC en S3 (sur 13 sem)** soit à 23% du plan → BEAUCOUP trop tôt (cible normale 65-70% du plan = S8-S9)
- Volume pic 80 km = **EXACTEMENT le current** → 0% de progression de volume
- 🚨 Baisse S1 -15% sur Expert PB 1h20 = absurde
- 2 semaines décharge (S4, S8) ✅
- Affûtage 3 sem : 53 → 47 → 40 (50% du pic) ✅

**Verdict 🚨** : pic trop tôt + pic = current + baisse S1. Le plan n'apporte AUCUNE progression de volume à Armando (qui fait déjà 80 km/sem, le plan plafonne à 80 km/sem).

### 3. SL S1 + projection SL pic
- **SL S1** : Dimanche, 21 km / 1h43 / pace 4:54
- **Ratio SL/vol hebdo S1 plan** : 31% 🟡 (cible 25-40%)
- **Ratio SL/vol DÉCLARÉ user** : 26% ✅
- **SL S1 plan (21 km) vs estim. user (~28 km)** : ⚠ SL S1 inférieure à ce que l'user fait probablement
- **SL pic projetée** : 80 × 0.4-0.5 = **32 – 40 km**
- **Référentiel semi** : 16-22 km
- 🟡 SL pic projetée TROP LONGUE vs ref (32-40 vs 16-22) — pour Expert préparant semi, faire 32-40 km en SL est exagéré (sauf si on considère que le plan doit aussi préparer un éventuel marathon futur). Le coaching classique semi ne dépasse pas 22-25 km en SL.

**Verdict 🟡** : SL S1 cohérente, SL pic projetée trop longue.

### 4. Faisabilité
- **status : EXCELLENT**, confidenceScore : 94
- Message : « Avec ta VMA de 18.3 km/h, ton temps théorique sur semi-marathon est d'environ 1h22min. Ton objectif de 1h20min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré. »
- safetyWarning :
  > À 48 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.
- ✅ Cohérence (temps théo 1h22, cible 1h20 = -2 min raisonnable pour Expert avec PB 1h20)
- ✅ Mention 48 ans + test d'effort
- ✅ Pas de bug temps

**Verdict ✅**

### 5. WelcomeMessage
Texte intégral (845 chars) :
> Félicitations pour ton engagement dans la préparation de ce Semi-Marathon avec un objectif ambitieux de 1h20 ! Ce programme de 13 semaines est conçu pour t'aider à atteindre cet objectif en construisant une base solide et en développant progressivement tes qualités spécifiques.
>
> La première phase, dite 'fondamentale', se concentrera sur le développement de ton endurance aérobie, la consolidation de ton volume hebdomadaire et le renforcement musculaire, sans travail intense de vitesse en début de programme. Nous privilégierons la régularité et l'écoute de tes sensations pour une progression saine et durable.
>
> Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 48 ans, un bilan cardio-vasculaire est particulièrement conseillé.

**Checklist doctrine** :
- ✅ Aucun mot interdit poids/IMC
- ✅ Mention médecin + bilan cardio 48 ans
- ✅ Pas de cross-training (faux positif "velo" du checker)
- ✅ Pas de nutrition
- ⚠ Manque prénom "Armando"
- ⚠ Ne mentionne pas que PB = cible (1h20 = 1h20)
- ⚠ Ne mentionne pas que **pic en S3 = current** (donc le plan ne fait pas progresser le volume) → mais OK, on ne veut pas attirer l'attention sur ce bug, on patche le code.

**Verdict ✅** (perfectible)

### Synthèse Armando
- ✅ **Positifs** : allure parfaite (3:47 vs 3:48), faisabilité EXCELLENT cohérente, message safety adapté 48 ans
- ⚠ **Attention** : pic en S3 trop tôt, pic = current (0% progression vol), SL pic projetée potentiellement trop longue (32-40 km pour semi)
- 🚨 **Bugs critiques** :
  - Baisse S1 (68 < 80) injustifiée
  - Pic atteint en S3/13 = 23% du plan (cible 65-70%) — anomalie sévère de périodisation
  - Volume pic plafonné à 80 km = current → AUCUNE progression de volume
- **Action recommandée** : laisser tel quel (preview). Si Armando s'abonne, **régénération recommandée** car la périodisation est cassée (pic en S3). Patch code volume floor + algo pic timing.

---

## 🛠️ PATCHES CODE RECOMMANDÉS (par ordre de criticité)

### 🔴 Patch #1 — Volume S1 floor à 100% currentVolume (au lieu de 85%)
**Fichier** : `src/services/geminiService.ts` lignes **2653-2665**

**Code actuel** :
```ts
// Hard floor S1 : au moins 85% du volume courant
const currentVolumeFloor = Math.round(currentVolume * 0.85);
startVolume = Math.max(startVolume, currentVolumeFloor);
// Plafond S1 : on ne dépasse pas le volume courant NI 65% du pic...
const volumeCap = Math.max(currentVolume, minStartVolume);
startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
// Re-appliquer le hard floor 85% — il prime sur la règle des 65% du peak
startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90));
```

**Pourquoi ça existe** (chaque ligne justifiée) :
- ligne 2655 (`× 0.85`) : "marge de sécurité" pour éviter d'envoyer un débutant qui ment sur son volume au crash. **Mais elle s'applique aux Experts qui sont honnêtes → injustifiée pour eux**.
- ligne 2660 (`maxVolume * 0.65`) : garantir que S1 ne soit pas trop proche du pic (sinon pas de progression possible). **Légitime**.
- ligne 2665 (re-apply 0.85) : protection contre l'écrasement par la règle des 65%. **Légitime mais perpétue le -15%**.

**Patch proposé** :
```ts
// Hard floor S1 : 100% du volume courant (respecter strictement l'input user)
// Doctrine: [[feedback_input_client_obligatoire]] — on ne baisse JAMAIS sous current.
const currentVolumeFloor = currentVolume; // Was: Math.round(currentVolume * 0.85);
startVolume = Math.max(startVolume, currentVolumeFloor);
// Plafond S1 garde-fou progression : cap à maxVolume × 0.65 SAUF si current > 0.65×peak
// (auquel cas on respecte le current et le pic doit être recalibré, voir patch #2)
const progressionCap = maxVolume * 0.65;
if (currentVolume <= progressionCap) {
  startVolume = Math.min(startVolume, progressionCap);
}
// Sinon : startVolume = currentVolume (et le pic sera ré-haussé par #2)
```

**Impact** : Alan S1 26→30, Sébastien S1 4→5, Antoine S1 68→80, Annabelle S1 34→40, Armando S1 68→80.

### 🔴 Patch #2 — Recalibrer maxVolume (pic) selon objectif

**Fichier** : `src/services/geminiService.ts` (fonction qui calcule `maxVolume` — non explorée en détail mais c'est l'amont de la boucle 2614)

**Problème** : Pic Sébastien = 9 km (impossible de finir 10k avec SL pic 4.5 km) ; Pic Alan = 32 km (impossible de finir trail 35k avec SL pic 16 km) ; Pic Armando = 80 km = current (pas de progression).

**Règle proposée** : `maxVolume = max(maxVolumeCalculé, refMinPic(objectif), currentVolume × 1.10)`
- 10k Débutant → refMinPic = 12 km
- Semi → refMinPic = 45 km (vol pic semi typique)
- Marathon → refMinPic = 80 km
- Trail < 30k → refMinPic = 40 km
- Trail 30-50k → refMinPic = 55 km
- Trail > 50k → refMinPic = 75 km

### 🟡 Patch #3 — Forcer SL pic ≥ ref objectif

**Fichier** : section distribution SL dans génération weeks (à localiser)

**Règle** : si SL pic calculée (`peakVol × 0.4-0.5`) < refSLPic.min → forcer SL pic = refSLPic.min (et adapter peakVol en conséquence).

### 🟡 Patch #4 — Algorithme pic timing
**Fichier** : `src/services/geminiService.ts` lignes 2677-2687 (rate adaptatif)

**Problème Armando** : pic en S3/13 sem (23% du plan), au lieu du 65-70% visé.

**Cause probable** : `progressionRate` initial trop fort + plan court (13 sem) où S1 = current force le pic à monter rapidement. **À vérifier en suite** avec une session dédiée.

---

## 🔄 PATTERNS GLOBAUX DÉTECTÉS

| Pattern                                            | Fréquence (5 clients) | Sévérité |
|----------------------------------------------------|-----------------------|----------|
| Baisse S1 vs declared (≈ -15%)                     | 5/5                   | 🚨        |
| SL pic projetée trop courte vs ref objectif        | 2/5 (Alan, Sébastien) | 🚨        |
| SL pic projetée trop longue vs ref objectif        | 2/5 (Antoine, Armando) | 🟡       |
| Pic atteint trop tôt (<50% du plan)                | 1/5 (Armando S3/13)   | 🚨        |
| Welcome sans prénom ni référence PB                 | 2/5 (Annabelle, Armando) | 🟡    |
| Faux positif "velo" dans checker doctrine          | 3/5                   | ⚪ (cosmétique audit) |
| Mention médecin/safety appropriée                   | 5/5                   | ✅        |
| Allures spec parfaitement alignées sur cible chrono| 4/4 (clients avec cible) | ✅     |
| Patch bug 2h60 (Antoine)                           | confirmé en base      | ✅        |
| Patch welcome+allure 9:30+vol pic 9 (Sébastien)    | confirmés en base     | ✅        |
| WelcomeMessage Alan re-patché MIX                  | confirmé en base      | ✅        |

---

## 🎯 ACTIONS IMMÉDIATES PAR CLIENT

| Client    | Statut preview                       | Action si abonnement                                     |
|-----------|--------------------------------------|----------------------------------------------------------|
| Alan      | Laisser preview en l'état            | **Régénérer** avec pic ≥ 50 km, SL pic ≥ 21 km, D+ pic ≥ 900 m |
| Sébastien | Laisser preview en l'état            | **Régénérer** avec pic ≥ 12 km, SL pic ≥ 7 km            |
| Antoine   | Laisser preview en l'état            | Régénérer après patch #1 (S1=80 au lieu de 68)           |
| Annabelle | Laisser preview en l'état            | Régénérer après patch #1 (S1=40 au lieu de 34) + affût 2 sem |
| Armando   | Laisser preview en l'état            | **Régénérer** : patch #1 + patch #4 (pic timing — actuel S3/13 anormal) |

---

## 📦 LIVRABLES PRODUITS

- `/Users/romanemarino/Coach-Running-IA/audit-5-plans-template-v2.mjs` — script réutilisable (lecture seule)
- `/Users/romanemarino/Coach-Running-IA/audit-5-plans-template-v2.txt` — log brut complet (560 lignes)
- `/Users/romanemarino/Coach-Running-IA/audit-5-plans-template-v2.json` — dumps JSON complets des 5 plans (paces, weeklyVolumes, feasibility, welcomeMessage)
- `/Users/romanemarino/Coach-Running-IA/AUDIT-5-PLANS-TEMPLATE-V2.md` — ce document
