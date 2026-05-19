# Audit 5 plans Expert override — décision patch ou pas
Date: 2026-05-18
Auteur: Investigation suite à `INVESTIGATION-CAP-VOLUME-EXPERT.md` §6
Mode: lecture seule (zéro modif Firestore — patch dans phase suivante après validation Romane)

## Méthodologie

Pour chaque plan :
1. Lecture du document Firestore `plans/{planId}` + `users/{uid}` (questionnaireData).
2. Simulation de `detectLevelFromData(data)` sur le profil pour identifier le niveau effectif utilisé par le moteur.
3. Calcul du `recoveryWeekInterval` déduit depuis l'array `recoveryWeeks` (delta entre indices) :
   - interval = 3 → signature **Débutant** (override agressif comme georgeslor1)
   - interval = 4 → Inter/Conf/Expert (pas d'override "deb forcé")
4. Comparaison `actualPeak` vs `MAX_WEEKLY_VOLUME[obj][effectiveLevel]` + `currentVol × 1.10`.

### Critères de décision retenus
- **PATCH** : Expert déclaré ET vol actuel ≥ 35 ET peak < currentVol × 1.10 ET race future ET profil sain.
- **À VALIDER Romane** : profil limite (Confirmé, BMI > 30, blessures, premier marathon, course imminente).
- **NE PAS PATCHER** : niveau effectif justifié par les chronos (pas un bug `detectLevelFromData`), course passée, ou bénéfice marginal.

---

## Plan 1 — lafleur666@yahoo.fr (planID `1773143911561`)

- **Profil** : Femme 41 ans · 70 kg/168 cm · BMI 24.8 · Tours · Premium=**true** · 1 plan total
- **Niveau déclaré** : Confirmé (Compétition)
- **Niveau effectif** (simulation `detectLevelFromData`) : **inter** (chrono override : 10k 55min → inter pour Femme, seuil F 10k inter=50-60min)
- **Cible** : Semi-Marathon 1h59, raceDate **2026-09-27** (futur, ~19 semaines restantes)
- **PB** : 5k=27min, 10k=55min, semi=2h05, mara=4h49
- **VMA** : 11.87 km/h, freq 3
- **Volume actuel** : 40 km/sem
- **Pic actuel** : 38 km · weeklyVolumes `[24,26,25,18,25,22,27,19,35,38,29,24,34,32,35,24,27,24,16,13]`
- **Phases** : 20 semaines, **recoveryWeeks=[4,8,12,16] (interval=4 → PAS override deb)**
- **Plan généré** : `isPreview=false` `fullPlanGenerated=true` (full plan 20/20 sem)
- **Confidence** : 75 (BON)
- **BLESSURES** : ⚠️ Fasciite plantaire + lombaires après 15min — SafetyWarning explicite Romane plafonne SL à 1h45 et 2h02 plutôt que 1h59
- **MAX_WEEKLY_VOLUME[Semi][inter]** = 55 km

### Verdict : ❌ **NE PAS PATCHER**

**Raisons** :
1. **Niveau effectif `inter` est légitime** : 10k en 55min (Femme) tombe juste dans la zone inter (50-60 min), pas un bug. Pas d'override silencieux vers `deb`.
2. **Blessures multiples explicitement adressées** dans le safetyWarning par le plan (fasciite + lombaires). Augmenter le pic = contre-indication médicale directe.
3. **Cible 1h59 déjà flag "ambitieuse"** par le plan lui-même (89.6 % VMA, au-dessus de la zone tenable). Augmenter volume = doubler le risque.
4. Pic 38 < curr 40 est délibéré : SL plafonnée à 1h45 (vs 2h initial) pour les lombaires.
5. **Profil Premium** : utilisatrice payante → modification silencieuse = risque relationnel élevé sans gain perçu.

---

## Plan 2 — chapeaujean@yahoo.fr (planID `1772961018568`)

- **Profil** : Homme · sex Homme · âge **0** (non renseigné) · weight **0** (non renseigné) · BMI N/A · SALINS LES BAINS · Premium=false · 1 plan total
- **Niveau déclaré** : Confirmé (Compétition)
- **Niveau effectif** : **conf** (pas d'override — pas de chrono 5k/10k saisi ; VMA 17.9 km/h pointerait expert mais gap négatif donc pas de drop)
- **Cible** : Semi-Marathon 1h20, raceDate **2026-05-24** (futur, 6 jours)
- **PB** : semi=1h23 uniquement
- **VMA** : 17.9 km/h, freq 3
- **Volume actuel** : 40 km/sem
- **Pic actuel** : **42 km** · weeklyVolumes `[40,35,33,23,40,39,42,33,29,20,16]`
- **Phases** : 11 sem, recoveryWeeks=[4,8] interval=4 → pas override deb
- **Plan généré** : `isPreview=false` `fullPlanGenerated=true` (full plan 11/11)
- **Confidence** : 75 (BON)
- **Blessures** : aucune
- **MAX_WEEKLY_VOLUME[Semi][conf]** = 60 km

### Verdict : ❌ **NE PAS PATCHER**

**Raisons** :
1. **Course dans 6 jours** (2026-05-24). On est en pleine phase d'affûtage (S9–S11). Modifier le volume maintenant = catastrophe sportive (perte d'affûtage, anxiété pré-course).
2. **Plan déjà terminé conceptuellement** : pic atteint en S7 (42 km, semaine spécifique). Re-bumper ferait sauter la périodisation alors que l'athlète est déjà sur la cible.
3. **Données utilisateur incomplètes** (âge=0, poids=0) → on ne peut pas recalculer une cascade fiable.
4. **Niveau `conf` est correct** : 17.9 km/h VMA + semi 1h23 → c'est cohérent avec Compétition. Pas un bug.
5. Pic 42 > curr 40 (×1.05) : la progression existe déjà, juste pas spectaculaire — c'est attendu sur 11 sem courtes avec un athlète déjà rodé.

---

## Plan 3 — nabou57@hotmail.fr (planID `1779085742508`)

- **Profil** : Femme 45 ans · 51 kg/160 cm · BMI 19.9 · Heillecourt · Premium=false · 1 plan total
- **Niveau déclaré** : **Expert (Performance)**
- **Niveau effectif** : **conf** (chrono override : 10k 46:54 → conf pour Femme, seuils F 10k expert ≤42min)
- **Cible** : Semi-Marathon 1h45, raceDate **2026-07-05** (futur, ~7 sem restantes)
- **PB** : 5k=23:10, 10k=46:54, semi=1h45
- **VMA** : 13.86 km/h, freq 4
- **Volume actuel** : 40 km/sem
- **Pic actuel** : **43 km** · weeklyVolumes `[34,37,41,32,37,43,23]`
- **Phases** : 7 sem, recoveryWeeks=[4] interval=4 → pas override deb
- **Plan généré** : `isPreview=true` `fullPlanGenerated=false` (preview 1/7 sem)
- **Confidence** : 73 (BON)
- **User créé** : 2026-05-18 (= **aujourd'hui**, plan d'aujourd'hui)
- **MAX_WEEKLY_VOLUME[Semi][conf]** = 60 km · `[Semi][expert]` = 70 km

### Verdict : ⚠️ **À VALIDER avec Romane** (penche vers ❌)

**Raisons mixtes** :
1. **Seul des 5 à être réellement Expert déclaré sans course passée** + plan créé aujourd'hui.
2. MAIS : 10k en 46:54 pour une Femme tombe **clairement** dans la zone Confirmé (42–50min). Le PB semi 1h45 = même chrono que la cible → l'utilisatrice vise *son propre record*, sans VMA pour le porter (théorique sur 13.86 = 1h47).
3. **`isPreview=true`** : seules 1 semaine générée sur 7. Le full plan n'a même pas encore été demandé/payé. Si on patch maintenant, le full plan régénérera et utilisera *de toute façon* le nouveau code patché → patch base inutile, le full plan n'existe pas.
4. Le critère "currentVol × 1.10 = 44" est juste au-dessus de peak 43 → écart marginal (+1–2 km/sem).
5. **Bénéfice attendu** : passer pic 43 → 45 km env. Coût/bénéfice faible, et l'utilisatrice n'a pas encore engagé le plan.

**Si patch décidé** : nouveau peak ~47 km (currentVol × 1.18 = 47.2), proportional rescale ×(47/43) = ×1.093 sur chaque semaine.
Diff weeklyVolumes proposé : `[34,37,41,32,37,43,23]` → `[37,40,45,35,40,47,25]` (total 247→269, Δ +22 km +9%).

**Recommandation** : attendre si elle achète le full plan ; à ce moment-là, le code patché fera le travail naturellement.

---

## Plan 4 — micklunven@yahoo.fr (planID `1777900210405`)

- **Profil** : Homme 45 ans · 92 kg/183 cm · BMI **27.5** · Vannes · Premium=false · 1 plan total
- **Niveau déclaré** : Confirmé (Compétition)
- **Niveau effectif** : **inter** (chrono override : 5k 25:10 → inter pour Homme, seuils M 5k inter=25-30min — pile à la frontière)
- **Cible** : Marathon 3h55, raceDate **2026-09-27** (futur, ~19 sem restantes)
- **PB** : **5k=25:10 uniquement** (pas de 10k, pas de semi, pas de marathon)
- **VMA** : 12.55 km/h, freq 5
- **Volume actuel** : 40 km/sem
- **Pic actuel** : **48 km** · weeklyVolumes `[34,35,37,28,37,40,41,31,41,44,46,35,46,46,48,36,48,46,32,28,24]`
- **Phases** : 21 sem, recoveryWeeks=[4,8,12,16] interval=4 → pas override deb
- **Plan généré** : `isPreview=true` `fullPlanGenerated=false` (preview 1/21 sem)
- **Confidence** : 65 (AMBITIEUX)
- **SafetyWarning** existant : âge 45 → certificat médical + durée 21 sem trop longue
- **MAX_WEEKLY_VOLUME[Marathon][inter]** = 65 km

### Verdict : ❌ **NE PAS PATCHER**

**Raisons** :
1. **currentVol × 1.10 = 44 < peak 48** : ne remplit PAS le critère "peak < currentVol × 1.10". La progression réelle est de **×1.20** (40→48), conforme à la doctrine progressive.
2. **Niveau effectif `inter` est défendable** : 5k 25:10 = pile au seuil inter/conf homme (25min). Premier marathon (aucun PB long), Confirmé déclaré ambitieux pour un débutant marathon.
3. **BMI 27.5 → réduction poids/IMC -10%** déjà appliquée dans la cascade (cohérent avec le SafetyWarning).
4. **`isPreview=true`** : 1/21 sem générées. Le full plan régénérera avec le code patché si l'utilisateur passe à l'acte.
5. Plan ressemble à georgeslor1 en surface (Marathon, surpoids, pic 48) MAIS **georgeslor1 était effectiveLevel `deb` (interval=3), micklunven est `inter` (interval=4)** — le mécanisme du bug n'est pas le même.

**Note** : la similitude visuelle (pic 48) entre micklunven et georgeslor1 dans le rapport d'investigation initial est trompeuse. Le pic 48 chez micklunven sort d'un cap inter avec marathon (65) × réductions âge/IMC × backprop progression, pas d'un override `deb` agressif.

---

## Plan 5 — gauthierbazille@yahoo.fr (planID `1774645125950`)

- **Profil** : Homme 43 ans · 71 kg/171 cm · BMI 24.3 · Illkirch · Premium=false · 1 plan total
- **Niveau déclaré** : **Expert (Performance)**
- **Niveau effectif** : **conf** (chrono override : 10k 41:30 → conf pour Homme, seuils M 10k expert ≤36min)
- **Cible** : Semi-Marathon 1h30, raceDate **2026-05-10** (**PASSÉ — 8 jours dans le passé**)
- **PB** : 10k=41:30 uniquement
- **VMA** : 16.06 km/h, freq 3 (commentaire user : "5 séances")
- **Volume actuel** : 60 km/sem
- **Pic actuel** : **49 km** · weeklyVolumes `[39,43,47,33,43,49,30]`
- **Phases** : 7 sem, recoveryWeeks=[4] interval=4 → pas override deb
- **Plan généré** : `isPreview=true` `fullPlanGenerated=false` (preview 1/7 sem)
- **Confidence** : 65 (AMBITIEUX)
- **MAX_WEEKLY_VOLUME[Semi][conf]** = 60 km

### Verdict : ❌ **NE PAS PATCHER**

**Raisons** :
1. **Course passée** (2026-05-10, il y a 8 jours). Le plan est obsolète. Modifier un plan dont la course a eu lieu n'a aucune valeur pour l'utilisateur.
2. **Plan est resté en preview** (1/7 sem). L'utilisateur n'a jamais converti.
3. **Volume actuel 60 km/sem > peak 49** : c'est l'anomalie la plus flagrante (le plan baisse le volume d'un athlète qui tournait à 60). Mais raison probable : 7 sem trop courtes pour Semi 1h30 → le plan a fait du conservatif. Si on patch le pic on n'aide personne, la course est passée.
4. **Cohérent avec `feedback_input_client_obligatoire`** : on n'écrase pas, on commente seulement.

---

## Synthèse

| # | Plan | Verdict | Cause principale |
|---|------|---------|------------------|
| 1 | lafleur666 (Semi 1h59) | ❌ NE PAS PATCHER | Blessures + override `inter` légitime |
| 2 | chapeaujean (Semi 1h20) | ❌ NE PAS PATCHER | Course dans 6 jours, plan finalisé |
| 3 | nabou57 (Semi 1h45) | ⚠️ VALIDER (penche ❌) | Preview, full plan régénérera avec code patché |
| 4 | micklunven (Marathon 3h55) | ❌ NE PAS PATCHER | Critère non rempli (progression 40→48 déjà bonne), preview |
| 5 | gauthierbazille (Semi 1h30) | ❌ NE PAS PATCHER | Course passée |

**Compte final** :
- Patchs à appliquer : **0**
- À valider Romane : **1** (nabou57, mais recommandation = laisser)
- Ne pas patcher : **4**

### Pourquoi aucun ne mérite vraiment le patch

L'investigation initiale (`INVESTIGATION-CAP-VOLUME-EXPERT.md`) identifie comme signature du bug `detectLevelFromData` : **override silencieux vers `deb`** (`recoveryWeekInterval=3` au lieu de 4). Or :

- **Aucun des 5 plans audités n'a `recoveryWeekInterval=3`**. Tous les 5 sont en `interval=4` → leur cap volume n'a PAS été écrasé par un downgrade vers `deb`.
- Les overrides observés (lafleur conf→inter, nabou expert→conf, micklunven conf→inter, gauthier expert→conf) **sont légitimes** : les chronos saisis correspondent réellement à la zone du niveau effectif (seuils CHRONO_LEVEL_THRESHOLDS).
- Le seul "drama case" comme georgeslor1 (Expert→deb avec interval=3, pic 48) n'a **aucun jumeau** dans ces 5 plans.

### Analyse coût/bénéfice globale

| Plan | Bénéfice patch | Coût patch | Verdict coût/bénéfice |
|------|---------------|------------|----------------------|
| lafleur666 | Aucun (pic 38 voulu pour blessures) | Risque blessure + bris confiance Premium | **Bénéfice négatif** |
| chapeaujean | ~5km/sem en plus mais en affûtage | Bousiller affûtage 6 jours avant course | **Bénéfice négatif** |
| nabou57 | +4 km/sem sur 7 sem | Preview → si full plan acheté, code patché fait le job | **Quasi nul** |
| micklunven | Marginal (progression déjà 1.20×) | Preview → même logique | **Quasi nul** |
| gauthierbazille | Zéro (course passée) | Zéro mais inutile | **Nul** |

**Conclusion exécutive** :
La query SQL initiale de l'investigation (Confirmé/Expert × Marathon/Semi × currentVol ≥ 40 × pic < 50) **a sur-pêché**. Les 5 plans remontés sont des positifs apparents mais **aucun n'est un vrai jumeau de georgeslor1** : la signature `interval=3` n'est pas là.

→ Le patch code (geminiService.ts L2382–2390) appliqué dans la phase précédente couvre déjà naturellement tout futur cas similaire à georgeslor1. **Aucune action Firestore live recommandée sur ces 5 plans.**

---

## Annexes

- **Données brutes** : `~/Coach-Running-IA/audit-5-plans-expert-override-raw.json`
- **Script d'audit** : `~/Coach-Running-IA/audit-5-plans-expert-override.mjs`
- **Simulation detectLevel** : `/tmp/simulate-detect-level.mjs`
- **Source du bug georgeslor1** : `~/Coach-Running-IA/INVESTIGATION-CAP-VOLUME-EXPERT.md`
- **Code patché** : `src/services/geminiService.ts:2382-2390`
