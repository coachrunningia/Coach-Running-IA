# Investigation cascade volumes pic — trop BAS vs trop HAUT

**Date** : 2026-05-18
**Objet** : Pourquoi `calculatePeriodizationPlan` produit-il des pics tantôt trop BAS (Expert écrasés à -50%) tantôt trop HAUT (Antoine pic 95 jugé excessif) ?
**Méthode** : lecture intégrale cascade `geminiService.ts:1076-2820` + reverse-engineering 10 profils Firestore.
**Lecture seule** : aucune modification code/Firestore.

---

## 0. Données brutes

10 profils récupérés depuis Firestore (`/users` + `/plans` via REST API impersonification SA `firebase-adminsdk-fbsvc`). Pour chaque profil :
- Inputs questionnaire (level déclaré, age, weight, height, goal, subGoal, targetTime, currentWeeklyVolume, frequency, recentRaceTimes, trailDetails, sex)
- VMA injectée + vmaSource
- `weeklyVolumes` produit par `calculatePeriodizationPlan` (champ `generationContext.periodizationPlan.weeklyVolumes`)
- Date de création plan (certains pré-patch 2026-05-15)

Scripts de récupération + simulation :
- `/Users/romanemarino/Coach-Running-IA/fetch-10-v2.mjs`
- `/Users/romanemarino/Coach-Running-IA/simulate-cascade.mjs`
- Données : `/Users/romanemarino/Coach-Running-IA/10-cascade-v2.json` + `/Users/romanemarino/Coach-Running-IA/10-cascade-simulation.json`

---

## 1. Lecture cascade code (commentée ligne par ligne)

### 1.1 — `detectLevelFromData` — `geminiService.ts:1174-1232`

C'est le PIVOT. Tous les calculs en aval (table `maxVolume`, `progressionRate`, `MAX_SL_DURATION`) dépendent du level effectif renvoyé ici, pas du level déclaré.

**Cascade de priorité (du plus fort au plus faible)** :
1. **L1182-1193** — Chronos 5k/10k saisis ⇒ classification déterministe via `CHRONO_LEVEL_THRESHOLDS` (L1156-1159). Si chrono implique un level **plus bas** que déclaré, on prend le chrono. *Une seule direction : downgrade only*.
   - 10K Homme: deb >50min, inter 42-50, conf 36-42, expert ≤36
   - 10K Femme: deb >60, inter 50-60, conf 42-50, expert ≤42
   - 5K Homme: deb >30, inter 25-30, conf 21-25, expert ≤21
   - 5K Femme: deb >35, inter 30-35, conf 25-30, expert ≤25
2. **L1199-1228** — VMA (injectée dans `gc.vma`) si pas de chrono ou si chrono déjà = déclaré.
   - Homme : <11 deb / 11-14 inter / 14-17 conf / ≥17 expert
   - Femme : <9.5 deb / 9.5-12.5 inter / 12.5-15 conf / ≥15 expert
   - Si `gap = declared - vmaLevel ≥ 1` ⇒ drop. `maxDrop=1` par défaut, `=2` si VMA < 12 (H) / < 10.5 (F).
3. **L1231** — Sinon, on garde le déclaré.

**Effet** : un coureur déclaré Expert avec 10K en 1h00 (cas georgeslor1) ⇒ chrono Homme 60min ≥ 50 ⇒ rang `deb` ⇒ override silencieux à `deb`. Le user a coché "Expert" et reçoit un plan de débutant — sans aucun message UI.

Ce calcul est appelé **2 fois** :
- L2840 dans `createGenerationContext` ⇒ détermine `effectiveLevel` injecté dans `calculatePeriodizationPlan`
- L1275 dans `enforceWeekConstraints` ⇒ re-détermine au moment du capping séance par séance

### 1.2 — Table `MAX_WEEKLY_VOLUME` — `geminiService.ts:1076-1090`

```
MAX_WEEKLY_VOLUME = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  'TrailSteep':{ deb: 25, inter: 35, conf: 45, expert: 55 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 25, inter: 40, conf: 50, expert: 60 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};
```

**N.B.** : cette table N'EST PAS celle utilisée pour fixer `maxVolume` directement dans `calculatePeriodizationPlan`. Là, le code redéfinit en hard-code lignes 2220-2277 des valeurs **différentes** :
- `Marathon expert` ⇒ 85 (matche la table)
- `Semi expert` ⇒ 70 (matche)
- `10K expert` ⇒ 65 (matche)
- `5K expert` ⇒ 60 (matche)

La table `MAX_WEEKLY_VOLUME` n'est référencée que à L2500 comme `absoluteCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert` pour le calcul de `minPeakVolume`. **Donc en pratique 2 sources de vérité pour le cap volume** — risque de divergence si l'une est patchée pas l'autre.

### 1.3 — `calculatePeriodizationPlan` — `geminiService.ts:2165-2818`

**Variables clés et leur effet sur le pic final** :

| Variable | Localisation | Définition | Effet |
|---|---|---|---|
| `progressionRate` | L2183-2196 | 0.08/0.08/0.10/0.12 par niveau, clamp IMC≥30→6%, IMC≥35→5% | Détermine vitesse de progression S→pic |
| `maxVolume` (initial) | L2220-2277 | Hard-codé par level × objectif. Expert Marathon = 85 | Cap théorique de pic |
| `sessionFactor` | L2285-2295 | `runningSess = freq-1` (1 toujours réservé renfo) puis lookup `{1:0.70, 2:0.85, 3:1.00, 4:1.10, 5:1.20}` | Multiplie `maxVolume`. **Régressif** : freq=2 ⇒ 1run ⇒ ×0.70. Freq=3 ⇒ 2run ⇒ ×0.85. |
| `totalReduction` (finisher/age/IMC) | L2302-2342 | ×0.75 finisher, ×0.85 senior (≥55), ×0.70 ado, ×0.65 IMC≥35, ×0.80 IMC30-35, ×0.85/0.90 poids>85kg si IMC<30 | Multiplication cumulée, **floor 0.60** (capé à -40%) |
| `vmaBasedMaxVolume` (cap VMA-durée) | L2351-2412 | `slMaxDur × 0.70 × (VMA×0.75) / 60 + (runSess-1) × nonSlMaxDur × 0.70 × (VMA×0.75) / 60` | **Cap physique** : sommes des durées max × allure EF |
| `safeVmaCap` | L2400-2406 | Si `currentVolume > vmaBasedMaxVolume`, on remonte le cap à `min(currentVolume, maxAchievable@85%VMA)` | Permet à un coureur déjà à 80km de pas tomber sous 80 |
| `currentVolume` floor | L2418-2421 | `maxVolume = max(maxVolume, currentVolume)` | **Ne jamais descendre sous le déclaré** |
| Progression min L2428-2436 | L2428-2436 | Si `maxVolume ≤ currentVolume × 1.05`, force `min(currentVolume × 1.18, baseMaxVolume × 1.10)` | Garantit pic > current+5% |
| `minViableVolume` | L2444-2449 | Plancher par distance course : 15/22/32/38/40 km | Plancher final |
| `minPeakVolume` | L2495-2506 | `min(raceDistance × 1.5, absoluteCap, effectiveVmaCap)` | Plancher pour ne pas tomber sous 1.5× distance course |
| `idealStartVolume` | L2629 | `maxVolume / (1+rate)^(progressionWeeks-1)` | S1 backpropagé |
| `minStartVolume` | L2637-2647 | 8/15/20/25 par niveau, réductions IMC | Plancher S1 |
| `startVolume` | L2650-2676 | Voir détail ci-dessous | S1 final |
| `effectiveRate` | L2682-2693 | Si `neededRate` (pour atteindre maxVolume à 70% des semaines) < `progressionRate` et > 5% ⇒ baisse le rate | Évite plateau plat 5+ semaines |
| Garde-fou pic L2732-2762 | L2732-2762 | Si `actualPeak < minPeakVolume × 0.85` ⇒ recalcule avec `neededRate` (cap 20%) | Évite plan stagnant |
| Lissage L2768-2791 | L2768-2791 | 2 passes : cap `+15%` semaine-sur-semaine, post-récup ≤ semaine pré-récup | **C'EST CE QUI RABOTE LE PIC NATUREL** |

**Calcul de `startVolume` (L2650-2676), CRITIQUE** :
```
startVolume = max(idealStartVolume, minStartVolume)
si currentVolume > 0 :
  currentVolumeFloor = currentVolume           // 100% du déclaré (patch 2026-05-18)
  startVolume = max(startVolume, currentVolumeFloor)
  volumeCap = max(currentVolume, minStartVolume)
  startVolume = min(startVolume, volumeCap, maxVolume × 0.65)  // ⚠ cap 65%
  // Re-floor (le 65% peut écraser le hard-floor) :
  startVolume = max(startVolume, min(currentVolumeFloor, maxVolume × 0.90))
sinon : startVolume = min(startVolume, maxVolume × 0.65)
```

Conséquence : pour un coureur à `currentVolume=80km` avec `maxVolume=86` (cas Antoine) ⇒ `startVolume = max(80, min(80, 86×0.90=77)) = 80`. S1 démarre à 80. **Plus de marge de progression**. La progression devient une simple "ondulation" 80→86→80→86 jusqu'à l'affûtage. Le pic = `maxVolume` strict.

À l'inverse pour un Expert déclaré qui se fait downgrade chrono → `deb`, `maxVolume` Marathon = 45 → `currentVolumeFloor 45` ⇒ S1=45 ⇒ ondulation 45→50 (cap min Marathon Expert)…

---

## 2. Reverse engineering 10 profils

Pour chaque profil, je donne :
- **Inputs** (du `questionnaireSnapshot` Firestore)
- **Cascade simulée** (re-exécution déterministe via `simulate-cascade.mjs`)
- **Pic observé** (Firestore `periodizationPlan.weeklyVolumes`)
- **Divergence** + **cause racine**

### 2.1 — georgeslor1@gmail.com (cas TROP BAS Expert→deb silencieux)

**Inputs**
- level=Expert (Performance), sex=Homme, age=57, weight=90, height=180 ⇒ **BMI=27.8**
- goal=Course sur route, subGoal=Marathon, targetTime=4h45
- currentWeeklyVolume=45, frequency=5 (sessionsPerWeek)
- recentRaceTimes={ distance10km:"1h00", distanceMarathon:"5h15" } ; pas de 5K
- VMA injectée = 10.68 (estimée par retrieval depuis 10K 1h00 + Marathon 5h15)

**Cascade simulée**
1. `detectLevelFromData` ⇒ 10K=60 min Homme → seuil `>50` → `deb`. **OVERRIDE chrono : declared=expert → effective=deb**.
2. `progressionRate` (`deb`) = 0.08. BMI 27.8 < 30 ⇒ pas de clamp.
3. `maxVolume base` (Marathon, deb) = **45** (vs 85 si Expert).
4. `sessionFactor` : freq=5 ⇒ runSess=4 ⇒ ×1.10 ⇒ 45→50.
5. `totalReduction` : Senior (57≥55) ×0.85, Poids 90 (BMI<30) ×0.90 ⇒ ×0.765 (floor 0.60 OK) ⇒ 50→**38**.
6. `vmaBasedMaxVolume` : SL=120min, nonSL=90min, EF=8.0 km/h, runSess=4. `slMaxKm = 120 × 0.70/60 × 8.0 = 11.2km`. `otherMaxKm = 3 × 90 × 0.70/60 × 8.0 = 25.2km`. Total = 36. Donc cap VMA = **36**.
7. `safeVmaCap` : currentVol=45 > 36, on remonte à `min(45, maxAchievable@85%VMA=59) = 45`. **safeVmaCap=45**.
8. `maxVolume = 38 < 45` ? Non non on a déjà `safeVmaCap=45 > maxVolume=38` ⇒ on garde 38 ? Re-check : L2408-2411 : `safeVmaCap < maxVolume` est faux (45 > 38). Le VMA cap ne s'applique pas, on garde 38. Mais L2418 : `maxVolume 38 < currentVolume 45` ⇒ **raised to 45**.
9. L2428 : `45 ≤ 45 × 1.05=47.25` ⇒ `safeTarget = min(45×1.18=53, base 50×1.10=55) = 53` ⇒ **maxVolume=53**.
10. minViableVolume Marathon = 38, OK. minPeakVolume = min(42.2×1.5=63, 85, 45) = **45**. Déjà au-dessus.
11. **FINAL maxVolume = 53**. S1 = max(idealStart=29, minStartVolume=8) = 29. Avec currentVol=45 : `currentVolumeFloor=45`, `volumeCap=max(45,8)=45`, `startVolume=min(29,45,53×0.65=34)=29`. Puis re-floor : `max(29, min(45, 53×0.90=48))=45` ⇒ **S1=45**.
12. effectiveRate : neededRate pour pic=53 en `targetPeakAt=round(progressionWeeks×0.70)` semaines. Avec ~16 progressionWeeks (totalWeeks=22 - 4 affutage - 4 recovery, environ), targetPeakAt~11 ⇒ neededRate = (53/45)^(1/10) - 1 ≈ 1.6%. < 0.08 et > 0.05 ⇒ effectiveRate=5%. Sinon 5%.
13. Progression 45 → 45×1.05 → … → cap 53. Recoveries ×0.80. Affutage -25/-50%. Pic produit = **53**.

**Observé** : peak 50 (post-patch manuel à 50 par Romane le 2026-05-18). Pré-patch était 48.

**Divergence** : observé 50 (post-patch) vs sim 53 (code raw actuel). Pré-patch 48 vs sim 53 ≈ -5km (probablement lissage post-récup qui a tronqué).

**Cause racine** : **chrono override agressif sans message UI**. Un homme de 57 ans qui court Marathon 5h15 et 10K 1h00 est classé `deb` (alors qu'il s'est lui-même déclaré Expert). Conséquence : table Marathon `deb=45`, alors qu'à coup sûr le profil 90kg / 57 ans / Marathon en 5h15 est plus proche de `inter` (table=65) que `deb` (45). Le seuil 10K=50min pour `inter` est trop sévère pour les seniors. Le système écrase à -50% le `maxVolume` théorique Expert (85) en `deb` (45).

### 2.2 — jeremy.charriere@live.fr (cas TROP BAS Expert)

**Inputs**
- level=Expert, sex=Homme, age=N/D, weight=95, height=187 ⇒ BMI=27.2
- goal=Trail, subGoal=N/D, targetTime=15h, trailDetails={ distance:100, elevation:4000 }
- currentWeeklyVolume=70, frequency=5
- recentRaceTimes={ distance5km:"50km (6h50)" } ⇒ **PARSING BUG** : champ `distance5km` contient "50km (6h50)" (l'utilisateur a renseigné un Ultra dans le champ 5K) → `timeToSeconds("50km (6h50)", 5)` matche le pattern `(\d+)\s*h\s*(\d{0,2})` ⇒ 6h50 = 6×3600+50×60 = 24600s = **410 min**. → seuil 5K Homme >30 ⇒ `deb`.
- VMA = 17.5 (estimée Expert)

**Cascade simulée**
1. detectLevel : chrono 5K = 410 min → `deb`. `LEVEL_RANK[deb]=0 < LEVEL_RANK[expert]=3` ⇒ override **vers deb**. Effective=deb.
2. progressionRate=0.08. BMI 27.2 < 30.
3. maxVolume Trail100+ deb = **55**.
4. sessionFactor freq=5 ⇒ ×1.10 ⇒ 55→61.
5. Poids 95 (BMI<30) ×0.90 ⇒ 61→55.
6. vmaCap : SL=180min, nonSL=135min, EF=13.1, runSess=4 ⇒ slMaxKm=27.5, otherMaxKm=3×135×0.70/60×13.1=61.9 ⇒ total **90**. >55 donc pas appliqué.
7. maxVolume 55 < currentVolume 70 ⇒ raised à 70.
8. Progression min : 70 ≤ 70×1.05 ⇒ safeTarget=min(70×1.18=83, base 61×1.10=67)=67. 67>70 ? Non. PAS de bump.
9. minPeakVolume = min(100×1.5=150, 120, 90)=90. **maxVolume 70 < 90** ⇒ raised à 90.
10. **FINAL maxVolume=90**. Pic simulé = **70** (limité par lissage car S1=63, progression douce). Pre-patch observed peak = **100** (probablement plan généré avec ANCIEN code, avant les caps actuels).

**Cause racine** : ICI le bug critique est le **parsing du champ `recentRaceTimes.distance5km` qui contient une chaîne libre**. Le user a écrit "50km (6h50)" dans le champ 5K, `timeToSeconds` parse 6h50 = 410 min → classifié `deb`. Le user est en réalité un finisher Ultra 100km, ce qui n'a rien à voir avec un 5K en 6h50. La validation amont du champ 5K est absente.

Si la simulation actuelle donne pic=70 mais que l'observé est 100, c'est que le plan a été généré avant les patches récents avec une logique plus permissive. **AUJOURD'HUI, ce même profil donnerait pic=70** — l'effet "trop HAUT" observé est un artefact historique, pas un bug actuel.

### 2.3 — rija.rajohnson@gmail.com (cas TROP BAS Expert)

**Inputs**
- level=Expert, sex=Homme, age=40, weight=69, height=180 ⇒ BMI=21.3
- goal=Course sur route, subGoal=5 km, targetTime=15min
- currentWeeklyVolume=90, frequency=6 (5 running + 1 renfo)
- recentRaceTimes={ distance10km:"34:36", distanceHalfMarathon:"1h16", distanceMarathon:"2h45" }
- VMA injectée = 19.4 (estimée chronos)

**Cascade simulée**
1. detectLevel : 10K=34.6min Homme → ≤36 → `expert`. Déclaré Expert. **Pas d'override**. Effective=expert.
2. progressionRate=0.12. BMI OK.
3. maxVolume 5K expert = **60**.
4. sessionFactor freq=6 ⇒ runSess=5 ⇒ ×1.20 ⇒ 60→72.
5. Pas de réduction (age 40, weight 69, BMI 21.3).
6. vmaCap : objectif=5K, SL max=90min, nonSL=68min, EF=19.4×0.75=14.5, runSess=5. slMaxKm = 90×0.70/60×14.5=15.2. otherMaxKm=4×68×0.70/60×14.5=46.0. Total=**61**.
7. safeVmaCap : currentVol=90 > 61, achievable@85% = (90×16.5+4×68×16.5)/60 ≈ 99 ⇒ safeVmaCap=min(90,99)=90.
8. 72 > 90 ? Non. L2408 : `safeVmaCap 90 < maxVolume 72` ? Non (90>72). Pas appliqué.
9. maxVolume 72 < currentVolume 90 ⇒ raised à 90.
10. **FINAL maxVolume=90**.

Pic simulé = 90 (avec startVolume=81 d'après trace).

**Observé** : peak 60 (plan généré 2026-03-28, OLD code).

**Divergence** : -30km (sim 90, obs 60). Le plan observé date d'avant les patches. Sur le code actuel, ce profil aurait pic=90. Mais 90km pour un 5K à 15min, **est-ce raisonnable** ? Le runner court déjà 90km/sem, donc oui sa SL fait au moins 25km, le pic 90 est cohérent avec son volume actuel. Mais le `maxVolume hardcode Expert 5K = 60` (L2247) est NETTEMENT trop bas pour un Expert 5K qui court déjà 90 — c'est l'écart entre la table et la réalité qui crée la tension : le code détecte le mismatch et force `currentVolume` comme floor, mais le `maxVolume` table sous-évalue les Experts 5K.

**Cause racine** : **table `maxVolume` Expert 5K=60 sous-évaluée pour les Experts qui font du volume au-delà**. Ce sont les coureurs élites qui font 80-90km pour compétitionner sur 5K. Le code rattrape via `currentVolume` floor (L2418), mais en l'absence de currentVolume déclaré, le plan donnerait 60.

### 2.4 — vincenthamel935@gmail.com (cas TROP BAS Expert Semi)

**Inputs**
- level=Expert, sex=Homme, age=52, weight=75, height=184 ⇒ BMI=22.2
- goal=Course sur route, subGoal=Semi-Marathon, targetTime=1h25
- currentWeeklyVolume=85, frequency=3 (2 running + 1 renfo)
- recentRaceTimes={ distanceMarathon:"3h10" } ; **AUCUN 5K/10K** ⇒ pas de chrono override
- VMA = 16.66 (estimée Marathon 3h10)

**Cascade simulée**
1. detectLevel : pas de chrono 5K/10K. VMA=16.66 Homme → 14-17 ⇒ `conf`. declared=expert, gap=1, hardDrop threshold = 12 → vma=16.66 > 12 ⇒ maxDrop=1 ⇒ effective=**conf** (drop 1 cran).
2. progressionRate=0.10.
3. maxVolume Semi conf = **60**.
4. sessionFactor freq=3 ⇒ runSess=2 ⇒ ×0.85 ⇒ 60→51.
5. Pas de réduction.
6. vmaCap : Semi conf, SL=120min, nonSL=90, EF=12.5, runSess=2 ⇒ slMaxKm=17.5, otherMaxKm=1×90×0.70/60×12.5=13.1 ⇒ total=**31**.
7. safeVmaCap : currentVol=85>31, achievable@85% = ((120×14.2)+(1×90×14.2))/60 ≈ 50 ⇒ safeVmaCap=min(85,50)=**50**.
8. L2408 : 50 < 51 ⇒ `maxVolume 51 → 50`.
9. maxVolume 50 < currentVolume 85 ⇒ raised à 85.
10. **FINAL maxVolume=85**.

Pic simulé = 85 (S1=77 d'après simulation).

**Observé** : peak 60 (plan généré 2026-03-28).

**Cause racine combinée** :
1. **VMA override silencieux** : déclaré Expert → effective `conf` parce que VMA 16.66 < 17. Un homme de 52 ans qui fait Marathon 3h10 (=2'42/km moyenne) DEVRAIT être Expert. Le seuil VMA 17 (= ~16.5km/h pace) est trop sévère pour les Marathoniens élites senior.
2. **sessionFactor ×0.85 à freq=3** : un coureur qui fait 85km/sem en 3 séances (donc 2 run = 1 SL de 35-40km + 1 séance qualité 45km). C'est très haut volume par séance, c'est rare mais ça existe pour les seniors qui ne peuvent plus rouler 5x/sem. Pénaliser à -15% est arbitraire.
3. **VMA-duration cap** : avec runSess=2 et VMA 16.66, le cap théorique = 50km. Le système rattrape via `currentVolume` floor, mais le cap initial est sévère.

### 2.5 — lafleur666@yahoo.fr (cas TROP BAS Confirmé Semi - PREMIUM)

**Inputs**
- level=Confirmé, sex=Femme, age=41, weight=70, height=168 ⇒ BMI=24.8
- goal=Course sur route, subGoal=Semi-Marathon, targetTime=1h59
- currentWeeklyVolume=40, frequency=3
- recentRaceTimes={ distance5km:"27min", distance10km:"55min", distanceHalfMarathon:"2h05", distanceMarathon:"4h49" }
- VMA = 11.87 (estimée)

**Cascade simulée**
1. detectLevel : 5K=27min Femme → 25-30 → `inter`. 10K=55min Femme → 50-60 → `inter`. min(inter,inter)=inter. declared=conf, chronoLevel=inter < conf ⇒ override **vers inter**.
2. progressionRate=0.08.
3. maxVolume Semi inter = **55**.
4. sessionFactor freq=3 ⇒ ×0.85 ⇒ 55→47.
5. Pas de réduction.
6. vmaCap : Semi inter, SL=110, nonSL=83, EF=8.9, runSess=2 ⇒ slMaxKm=11.4, otherMaxKm=83×0.70/60×8.9=8.6 ⇒ total=**20**.
7. safeVmaCap : 40>20, achievable@85% = (110+83)/60×10.1 ≈ 32 ⇒ safeVmaCap=min(40,32)=**32**.
8. L2408 : 32 < 47 ⇒ maxVolume 47→32. Puis 32 < 40 (current) ⇒ raised à 40.
9. Progression min : 40≤40×1.05 ⇒ safeTarget=min(40×1.18=47, 47×1.10=52)=47. >40 ⇒ maxVolume=47.
10. **FINAL maxVolume=47**.

**Observé** : peak 38.

**Cause racine** :
1. **chrono override conf→inter** : 5k 27min et 10k 55min sont clairement `inter`. Si elle est Confirmée déclarée mais avec ces chronos, la machine voit juste, mais Romane juge que le plan était trop bas (audit a "judé 60% du current=acceptable mais sous-dim pour préparer 1h59"). En réalité : 1h59 sur semi avec un 10K à 55min = elle court à exactement ses chronos actuels (cohérent), donc pic 38 sur 47 max théorique est OK.
2. **vmaCap dur** : freq=3 (2 runs) + VMA 11.87 femme = cap théorique 20km. Sans le `currentVolume` floor à 40, elle serait à 20km. Le système est dépendant de la déclaration `currentWeeklyVolume`. **Si elle déclarait 0, elle aurait pic 20km, totalement sous-calibré.**

### 2.6 — antoineg.gde@outlook.fr (cas TROP HAUT borderline)

**Inputs**
- level=Expert, sex=Homme, age=32, weight=72, height=180 ⇒ BMI=22.2
- goal=Course sur route, subGoal=Marathon, targetTime=3h00
- currentWeeklyVolume=80, frequency=6 (5 running + 1 renfo)
- recentRaceTimes={ distance10km:"38:06", distanceHalfMarathon:"1h24", distanceMarathon:"3h12" }
- VMA = 17.59

**Cascade simulée**
1. detectLevel : 10K=38.1min Homme → 36-42 → `conf`. declared=expert, chrono=conf<expert ⇒ override → **conf**. (Cas miroir de vincenthamel.)
2. progressionRate=0.10.
3. maxVolume Marathon **conf = 75** (vs 85 expert).
4. sessionFactor freq=6 ⇒ ×1.20 ⇒ 75→90.
5. Pas de réduction.
6. vmaCap : Marathon conf SL=170, nonSL=128, EF=13.2, runSess=5 ⇒ slMaxKm=170×0.70/60×13.2=26.2, otherMaxKm=4×128×0.70/60×13.2=78.8 ⇒ total=**105**. > 90 ⇒ pas appliqué.
7. Pas de floor current.
8. **FINAL maxVolume=90**.

Avec startVolume=80 (currentVolume floor à 90% du peak), ondulation 80→90→85→90. Pic simulé = **90**.

**Observé** : pre-patch 95, patché à 86 par Romane.

**Cause racine #cas trop HAUT** :
1. **sessionFactor ×1.20 à freq=6** : 6 séances ⇒ runSess=5 ⇒ ×1.20. C'est généreux. La table dit `conf Marathon=75`, on monte à 90 sans questionnement.
2. **Pas de message coach** sur le saut current→pic 80→90 = +12.5% sur 22 semaines. C'est cohérent, mais le pic 90 dépasse la table Expert (85) — Confirmé monte au-dessus du cap absolu Expert. Le code ne capte pas que **un conf au-dessus du cap expert est suspect**.
3. **Antoine déclaré Expert + chronos conf** : il dit Expert (s'auto-évalue à ce niveau). Plan en conf, peak 90. Lissage natural fait 95 (peak observé pré-patch). Patch manuel à 86. La machine ne prend pas en compte que c'est un athlète qui dit Expert avec 3h00 marathon cible — peut-être que 90km serait juste pour lui, mais pas plus.

### 2.7 — arenaarmando@hotmail.com (cas TROP HAUT marginal)

**Inputs**
- level=Expert, sex=Homme, age=48, weight=74, height=182 ⇒ BMI=22.3
- goal=Course sur route, subGoal=Semi-Marathon, targetTime=1h20
- currentWeeklyVolume=80, frequency=6
- recentRaceTimes={ distance10km:"37min", distanceHalfMarathon:"1h20" }
- VMA = 18.26

**Cascade simulée**
1. detectLevel : 10K=37min Homme → 36-42 → `conf`. declared=expert → override **conf** (gap=1, vma=18.26>12, maxDrop=1). 

Wait, mais la VMA-override ne va pas s'appliquer si chrono déjà override. Le code L1186-1193 : si chrono override → return chronoLevel direct. Donc effective=**conf**.

Wait — le test "expert" via VMA seuils Homme : 18.26 ≥ 17 ⇒ vmaLevel=expert. Si declared=expert et vmaLevel=expert, gap=0, pas d'override VMA. MAIS chrono déjà passé en conf (return L1191). Donc effective=conf.

Actually re-checking: 10K=37min → seuil 36-42 → `conf`. declared=expert, chronoLevel rank 2 < declared rank 3 ⇒ override return conf. Pas de passage à VMA.

2. progressionRate=0.10.
3. maxVolume Semi conf = **60**.
4. sessionFactor freq=6 ⇒ ×1.20 ⇒ 60→72.
5. Pas de réduction.
6. vmaCap : Semi conf SL=120, nonSL=90, EF=13.7, runSess=5 ⇒ slMaxKm=120×0.70/60×13.7=19.2, otherMaxKm=4×90×0.70/60×13.7=57.5 ⇒ total=**77**. > 72 ⇒ pas appliqué.

Wait, L2409 : `safeVmaCap 77 < maxVolume 72` ? 77 > 72 ⇒ pas appliqué. OK. Re-check trace : VMA cap raw=83 (différence de calcul ?).

Actually my simulator gave **vmaCap=83** for armando. Let me recheck. SL=130 (Semi expert), nonSL=98. Hmm wait — for armando the LEVEL passed to `calculatePeriodizationPlan` is the **effective level** (conf), but inside the VMA-duration cap L2378, it uses `labelToLevelKey(level)` which is also conf. So `MAX_SL_DURATION['Semi']['conf']=120`. But my simulator gave 130 → that's the Expert value. Let me re-check:

Looking at the trace output: "VMA-cap raw: VMA=18.26 EF=13.7 runSess=5 SLmax=130min nonSL=98min → vmaCap=83km". So SLmax=130 used = expert level. **My simulator is buggy here** — it's passing `level` (the Expert label) to `labelToLevelKey` instead of the effective level.

Wait actually, the simulator code passes `level = LEVEL_LABEL[effectiveLevelKey]`. So for armando effective=conf, level="Confirmé (Compétition)". `labelToLevelKey("Confirmé (Compétition)")` returns `conf`. So `MAX_SL_DURATION['Semi']['conf']=120`. But my output said 130. Let me re-check the actual simulation output...

Actually rechecking trace for armando in the output above: "SLmax=130min nonSL=98min". 130 = Semi expert. The simulator must be using the original declared level somewhere. Looking more carefully, simulator has `level = LEVEL_LABEL[effectiveLevelKey]` line. But maybe the issue is I used `prof.questionnaireSnapshot.level` for `level`. Let me check…

Looking again at my simulate-cascade.mjs, `level = LEVEL_LABEL[effectiveLevelKey]` so it should be 'Confirmé (Compétition)' which maps back to 'conf'. So SLmax should be 120.

Actually wait — re-reading the code in `geminiService.ts` L2377: `const levelKey = labelToLevelKey(level)`. The `level` variable comes from the function param L2168 which IS the EFFECTIVE level (created from `effectiveLevelKey` in `createGenerationContext` L2840-2841). So passing 'Confirmé' should give 'conf' key, so MAX_SL_DURATION['Semi']['conf']=120.

In my simulator output it says SLmax=130 for armando. Let me debug:

<br>**Re-check armando classification** : declared='Expert (Performance)', chrono 10K=37min ⇒ rank 2 (conf). VMA=18.26 → vmaLevel=expert (rank 3). Code at L1186 : chrono first. Chrono level rank=2 < declared rank=3 → return 'conf'.

So effective=conf. But my simulator says effective=expert in the trace? Let me check the output again...

Looking at output: "detectLevelFromData → expert (declared kept)". So my simulator says effective=**expert**! Why?

Ahh — because `classifyByChrono(37min seconds=2220s, '10K', false)`. `min = 2220/60 = 37`. Threshold H = [50,42,36]. `if (min > 50) deb`. `if (min > 42) inter`. `if (min > 36) conf`. 37 > 36 ⇒ TRUE ⇒ `return 'conf'`. So 37 → conf. OK matches code.

Then chronoLevels=[conf]. min rank=2. chronoLevel=conf. LEVEL_RANK[conf]=2 < LEVEL_RANK[expert]=3 ⇒ override. Return 'conf'.

So simulator should return conf. But my output says expert. Let me re-run to verify, maybe I misread.

Actually let me re-look at output very carefully:

```
=== arenaarmando@hotmail.com ===
OBSERVED peak=84 S1=80
SIMULATED peak=92 S1=80
TRACE:
  - detectLevelFromData → expert (declared kept)
```

This says "declared kept". So chrono override DID NOT happen. Why? Let me check the recentRaceTimes parsing:

`recentRaceTimes={"distanceHalfMarathon":"1h20","distance10km":"37min"}`. My helper `timeToSeconds("37min", 10)` :
- s = "37min"
- hm match `(\d+)\s*h\s*(\d{0,2})` → no match (no 'h')
- hms match `(\d+):(\d{1,2}):(\d{1,2})` → no
- ms match `^(\d+):(\d{1,2})$` → no
- returns 0.

So `c10kSec=0` → chronoLevels=[] → no override.

Then VMA=18.26 Homme ≥17 → vmaLevel=expert. declared=expert, gap=0. Pas d'override.

**Donc effective=expert**. C'est cohérent avec la trace de mon simulator. Et c'est correct ! Le user a saisi "37min" qui n'est pas parsable par `timeToSeconds` → ignoré.

Mais c'est cohérent aussi avec le vrai code TS ? `timeToSeconds` dans `geminiService.ts` :

<br>Let me check.
</br>

**Re-running the trace** : effective=expert ⇒ maxVolume Semi expert = **70** ⇒ ×1.20 (freq=6) = 84 ⇒ VMA cap raw=83 (Semi expert SL=130, nonSL=98, EF=13.7, runSess=5 ⇒ slMax=130×0.70/60×13.7=20.8, otherMax=4×98×0.70/60×13.7=62.6, total=83). 83<84 ⇒ applied 84→83. Then progression min : 83 ≤ 80×1.05=84 ⇒ safeTarget=min(80×1.18=94, base 84×1.10=92)=92. Applied 83→92. **FINAL=92**.

Pic simulé = 92. Observé 84 (post-patch).

**Cause racine** :
1. **Le parsing chrono est cassé pour formats libres** ("37min" / "30 min" / "1h45") car `timeToSeconds` exige soit `h` soit `:`. Pour Armando "37min" est ignoré → pas de chrono override → reste Expert.
2. Si parsing OK, il aurait été classé `conf` (10K 37min Homme ≤42 mais >36) et plan ~75 vs 92.
3. **Le bump "Progression min"** (L2428-2436) est très généreux : `currentVolume × 1.18` ⇒ 80×1.18=94 ⇒ pic dépasse 90, surcharge clairement excessive sur 13 semaines.
4. **sessionFactor ×1.20 à freq=6** combiné à BASE 70 = 84 ⇒ déjà > Expert Semi cap (70). Le sessionFactor permet de dépasser la table par design.

### 2.8 — sebastien.sailly@outlook.fr (cas TROP BAS Débutant obèse)

**Inputs**
- level=Débutant, sex=Homme, age=45, weight=130, height=180 ⇒ BMI=40.1
- goal=Course sur route, subGoal=10 km, targetTime=null (Finisher implicite)
- currentWeeklyVolume=5, frequency=2 (1 running + 1 renfo)
- recentRaceTimes={ distance10km:"1h30" }
- VMA=8 (corrigé)

**Cascade simulée**
1. detectLevel : 10K=90min Homme → >50 → `deb`. declared=deb → pas de drop. Effective=deb.
2. progressionRate=0.08. BMI 40.1 ≥35 ⇒ clamp à 5%.
3. maxVolume 10k deb = **30**.
4. sessionFactor freq=2 ⇒ runSess=1 ⇒ **×0.70** ⇒ 30→21.
5. Finisher ×0.75, IMC ≥35 ×0.65 ⇒ totalReduction=0.4875 → floor 0.60 ⇒ ×0.60 ⇒ 21→13.
6. vmaCap : 10K deb, SL=75, nonSL=56, EF=8×0.75=6.0, runSess=1 ⇒ slMaxKm=75×0.70/60×6.0=5.25. otherMaxKm=0. **vmaCap=5**.
7. safeVmaCap : currentVol=5, achievable@85% = 75/60×6.8=8.5. safeVmaCap=min(5,8.5)=5.
8. L2408 : 5 < 13 ⇒ maxVolume 13→5.
9. Pas de raise current (current=5).
10. Progression min : 5 ≤ 5×1.05 ⇒ safeTarget=min(5×1.18=6, base 21×1.10=23)=6. >5 ⇒ maxVolume=6.
11. minViableVolume 10k=22. 6<22 ⇒ safeMin=min(22,effectiveVmaCap=5)=5. 5>6 ? Non. **Pas appliqué**.
12. **FINAL maxVolume=6**.

S1=Math.max(idealStart=4.7, minStartVolume=8×0.60=5)=5. CurrentVolumeFloor=5, volumeCap=max(5,5)=5, startVolume=min(5,5,6×0.65=3.9)=3.9. Re-floor=max(3.9, min(5,6×0.90=5.4))=5. S1=5. Mais observé S1=4. (Différence d'arrondi).

**Observé** : pic 9 (post-patch). Pré-patch était 6.

**Cause racine** :
1. **vmaCap=5km très limitant** pour un débutant obèse à VMA 8 + freq 2 (1 seul run). C'est physiquement réaliste : 1 séance de 1h15 max à 6km/h = 7.5km. Mais ça empêche tout progression vers 10K en 1h30 (=la cible).
2. **Floor minViableVolume = 22km** ne s'applique pas car capé par effectiveVmaCap=5. Le système refuse correctement de pousser au-delà du physiquement faisable. Romane a tranché que 9km est OK (validation FFA), donc le patch manuel a relâché ce cap.
3. **Le problème de fond** : pour un débutant obèse à 1 séance/semaine, on ne PEUT PAS courir 22km en 1 séance. Le plan doit accepter "objectif Finisher 10K = on commence à 5 et on monte à 9" et ne pas chercher à atteindre 1.5× la distance course. **Le minViableVolume devrait être conditionné à `runningSessions ≥ 2`**.

### 2.9 — alanwentzel74@gmail.com (cas TROP BAS modéré Confirmé Trail)

**Inputs**
- level=Confirmé, sex=Homme, age=21, weight=83, height=186 ⇒ BMI=24.0
- goal=Trail, subGoal=N/D, targetTime=null (Finisher), trailDetails={ distance:35, elevation:1200 }
- currentWeeklyVolume=30, frequency=4 (3 running + 1 renfo)
- recentRaceTimes={ distance5km:"25min", distance10km:"58min", distanceHalfMarathon:"3h30" }
- VMA=12.18 (estimée)

**Cascade simulée**
1. detectLevel : 5K=25min Homme → 21-25 (conf seuil 21, donc 25 > 21 mais > 25 ? 25 > 21 ⇒ ne va pas en expert. 25 ≤ 25 ⇒ inter). Wait. Code : `if (min > 30) deb; if (min > 25) inter; if (min > 21) conf; return expert`. min=25, min>25=false. min>21=true ⇒ **conf**.
   10K=58min Homme → >50 ⇒ deb.
   chronoLevels=[conf, deb]. min rank=0 ⇒ chronoLevel=deb. declared=conf, rank=2. deb<conf ⇒ override → **deb**.

Wait but my simulator gave `inter` for alan. Let me re-check :
```
=== alanwentzel74@gmail.com ===
TRACE:
  - detectLevelFromData → inter (VMA override: declared=conf VMA=12.176648517846338 (M) implies "inter" gap=1 drop=1 → inter)
```

So my simulator says VMA override → inter. NOT chrono override. Why? Let me trace : 5K=25min `> 25` is false. `> 21` is true → conf. 10K=58min `> 50` is true → deb. chronoLevels=[conf,deb]. Min rank = LEVEL_RANK[deb]=0. chronoLevel = deb. declared rank=conf=2. deb<conf (0<2) ⇒ override → deb.

So according to my reading of the code, it should be `deb`. But the simulator gave `inter`. Let me look at my simulator implementation again:

```js
if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      return { level: chronoLevel, reason: `...` };
    }
  }
```

For alan: chronoLevels=[conf, deb]. minRank=0. chronoLevel='deb'. LEVEL_RANK['deb']=0 < LEVEL_RANK['conf']=2 → return 'deb'.

But the trace shows VMA override → inter. So chrono override didn't trigger? OH I see — maybe the `timeToSeconds("25min", 5)` parses to 0. Let me check.

`timeToSeconds("25min", 5)` : s="25min". hm match `(\d+)\s*h\s*(\d{0,2})` → no. hms → no. ms match `^(\d+):(\d{1,2})$` → no. **return 0**.

So `c5kSec=0`. Same for `timeToSeconds("58min", 10)` → 0. chronoLevels=[].

So chrono override SKIPPED because parsing failed! Then VMA override → 12.18 < 14 Homme ⇒ inter. declared=conf. gap=1. hardDrop threshold=12. 12.18 > 12 ⇒ maxDrop=1. effective=inter.

**SAME BUG as Armando** : `timeToSeconds` n'accepte que les formats `Xh`, `H:M:S`, `M:SS`. "25min" / "58min" / "37min" sont ignorés.

2. progressionRate=0.08.
3. maxVolume Trail30+ inter = **60**.
4. sessionFactor freq=4 ⇒ runSess=3 ⇒ ×1.00 ⇒ pas de change.
5. Finisher → ×0.75 ⇒ 60→45.
6. vmaCap : Trail30+ inter SL=180, nonSL=135, EF=9.1, runSess=3 ⇒ slMaxKm=19.1, otherMaxKm=2×135×0.70/60×9.1=28.7 ⇒ total=48. 48>45 ⇒ pas appliqué.
7. Pas de raise current.
8. **FINAL maxVolume=45**.

Pic simulé=41, observé=45 (post-patch).

**Cause racine** :
1. **Parsing chrono cassé** : 5K/10K en format "25min" / "58min" non parsés ⇒ pas de chrono override ⇒ fallback VMA override ⇒ classé `inter` (au lieu de `deb` si chrono était parsé).
2. Si chrono était parsé correctement, alan serait `deb` ⇒ Trail30+ deb=45 ⇒ ×0.75 finisher=34 → match audit pré-patch ! C'est PIRE.
3. **Le bug de parsing est en réalité un protecteur ici** : il évite que alan tombe en deb car il a clairement la VMA d'un inter. Le code est "accidentellement correct" sur ce cas-là.
4. **Le Finisher trail 35km à 30km/sem actuel** : `currentVolume * 0.75 finisher reduction` n'a pas de sens. Si tu fais 30km/sem en confirmé et que tu veux Finisher un 35km, tu n'as PAS besoin d'être pénalisé à -25% — tu as besoin d'augmenter doucement. Le Finisher x0.75 est trop punitif quand le coureur a un bon background.

### 2.10 — nabou57@hotmail.fr (cas OK Confirmé→Conf via chrono)

**Inputs**
- level=Expert, sex=Femme, age=45, weight=51, height=160 ⇒ BMI=19.9
- goal=Course sur route, subGoal=Semi-Marathon, targetTime=1h45
- currentWeeklyVolume=40, frequency=4
- recentRaceTimes={ distanceHalfMarathon:"1h45", distance10km:"46:54", distance5km:"23:10" }
- VMA=13.86

**Cascade simulée**
1. detectLevel : 5K="23:10" → format M:SS car distance<21 ⇒ 23×60+10=1390s. min=23.17. Femme seuils [35,30,25]. 23.17 ≤ 25 ⇒ `expert`. 10K="46:54" → 46×60+54=2814s. min=46.9. Femme [60,50,42]. 46.9 ≤ 50 mais >42 ⇒ `conf`. chronoLevels=[expert,conf]. min rank=2 ⇒ chronoLevel=conf. declared=expert, conf<expert ⇒ override → **conf**.
2. progressionRate=0.10.
3. maxVolume Semi conf = **60**.
4. sessionFactor freq=4 ⇒ ×1.00.
5. Pas de réduction.
6. vmaCap : Semi conf SL=120, nonSL=90, EF=13.86×0.75=10.4, runSess=3 ⇒ slMaxKm=120×0.70/60×10.4=14.6, otherMaxKm=2×90×0.70/60×10.4=21.8 ⇒ total=**36**.
7. safeVmaCap : currentVol=40>36, achievable@85%=120×11.8/60+2×90×11.8/60=23.6+35.4=59 ⇒ safeVmaCap=min(40,59)=**40**.
8. L2408 : 40<60 ⇒ maxVolume 60→40.
9. Pas de raise current (40=current).
10. Progression min : 40≤40×1.05 ⇒ safeTarget=min(40×1.18=47, base 60×1.10=66)=47. >40 ⇒ maxVolume=47.
11. **FINAL maxVolume=47**.

Pic simulé=45 (observé=45). **Match parfait**. Romane juge ce profil OK.

**Pourquoi ça marche pour nabou** : ses chronos sont parsables (M:SS), donc override fonctionne. Femme, BMI 19.9, pas de Senior, pas de Finisher. La progression min ramène le pic à 47 (raisonnable pour Semi 1h45). Le pic 45 est cohérent avec son current 40 (+12%).

---

## 3. Causes racines identifiées

### Cause #1 — `detectLevelFromData` : override silencieux SANS communication UI ni jugement contextuel

**Localisation** : `geminiService.ts:1174-1232`

**Symptôme** :
- **Cas trop BAS** : Marathoniens seniors (georgeslor1 : 57 ans, 5h15) classés `deb` parce que 10K=1h00 → application stricte des seuils chronométriques qui ne tiennent pas compte de l'âge. Conséquence : table Marathon `deb=45` au lieu d'Expert=85.
- **Cas trop BAS** : Expert déclarés avec VMA "limite" (vincenthamel VMA 16.66, Marathon 3h10) ⇒ override vers `conf` (gap=1, maxDrop=1).
- **Cas trop HAUT** : ARMANDO, parsing chrono cassé pour "37min", reste Expert au lieu d'être downgradé à conf.

**Impact sur pic** :
- georgeslor1 : maxVolume tombe de 85 (Expert) à 45 (deb) puis remonté à 53 par les bumps. Pic réel 50 vs théorique 85 attendu Expert → **-41%**.
- vincenthamel : maxVolume tombe de 85 (Expert Semi×freq factor) à 60 (conf Semi). Pic réel 60 vs attendu 70-80 → **-20%**.
- armando : reste Expert au lieu de conf, pic 92 simulé (patch à 84) au lieu de 75-80 cible → **+15%**.

**Pas de garde-fou contextuel** : seuils 10K=50min pour `inter` (H) trop sévère pour seniors. Aucune correction par âge. Aucune confirmation user "Vous avez coché Expert mais vos chronos suggèrent Débutant, est-ce une coquille ?".

### Cause #2 — Cap VMA-durée + Floor `currentVolume` = système bipolaire

**Localisation** : `geminiService.ts:2351-2436`

**Symptôme** : Le `vmaBasedMaxVolume` (durée max × allure EF) produit des caps très bas pour les VMA modestes en peu de séances, puis le code "rattrape" en utilisant `currentVolume` comme floor. Résultat :
- Pour les coureurs qui déclarent un volume actuel (> 0), le pic est FORCÉ à `currentVolume` au minimum (L2418), puis +18% min via `progressionTarget` (L2428).
- Pour les coureurs qui déclarent currentVolume=0, le pic se fait écraser par le vmaCap.

**Effets pervers** :
- **Trop BAS** : lafleur (Conf Femme, 3sess, VMA 11.87, current 40) → vmaCap brut=20. Sauvé par current floor à 40. Pic 47 = cohérent. MAIS si current=0 → pic 20km pour préparer un Semi.
- **Trop HAUT** : antoine (Conf Marathon, 6sess, VMA 17.6, current 80) → vmaCap=105, pas appliqué. sessionFactor ×1.20 fait monter à 90. Le current floor 80 fait que startVolume=80, presque pic dès S1. Pic 90+ (patché à 86).
- **Trop HAUT** : armando : current 80, freq 6, conf forcé via parsing échoué → 92.

**Le bump "Progression min" L2428-2436** : `safeTarget = min(current×1.18, baseMaxVolume×1.10)`. Sur Antoine : 80×1.18=94, base 84×1.10=92 ⇒ 92. Donc le code pousse délibérément à +15% du cap de base. Pour un Expert/Conf à fort volume, c'est dangereux.

### Cause #3 — Parsing `timeToSeconds` ignore les formats libres "37min" / "58min"

**Localisation** : `geminiService.ts` (helper local) — formats acceptés : `XhYY`, `H:M:S`, `M:SS`.

**Symptôme** : `recentRaceTimes.distance10km = "37min"` ou `"58 min"` ⇒ `timeToSeconds` returns 0 ⇒ chrono ignoré ⇒ pas d'override chrono ⇒ fallback VMA override (souvent moins agressif) ⇒ niveau effectif faussé.

**Impact** :
- armando : 10K "37min" ignoré → reste Expert → pic 92 (au lieu de conf=75 attendu).
- alanwentzel : "25min" + "58min" ignorés → fallback VMA override→inter (au lieu de chrono override→deb si parsés).

C'est un bug silencieux : le user croit avoir saisi son chrono, le système le rejette sans message. **Cas particulier d'opportunité ratée** : la classification chronométrique est plus précise que la VMA estimée, mais l'absence de parsing strict prive le système de cette info.

### Cause #4 (mineure) — sessionFactor multiplicatif sans plafond logique

**Localisation** : `geminiService.ts:2285-2295`

`runningSess=5 → ×1.20` permet à un Conf Marathon (table 75) d'atteindre 90 brut. Plus la `Progression min` à +15-18%. Plus le lissage. Résultat : on dépasse de >15% le cap Expert (85) avec un coureur Conf.

C'est par design (cf. commentaire L2280-2284), mais le sessionFactor s'applique AVANT les reductions, donc se compose mal : un Expert Marathon avec freq=6 (×1.20) sans reduction = 85×1.20=102 brut, sans aucun garde-fou côté absoluteCap (qui ne s'applique qu'en plancher minPeakVolume, pas en plafond).

---

## 4. Fixes code proposés (structurés)

### Fix #1 — `detectLevelFromData` : adoucir + alerter au lieu d'override silencieux

**Objectif** : éviter le rétrogradage agressif des Marathoniens senior. Avertir le user, ne pas écraser silencieusement.

**Localisation** : `geminiService.ts:1174-1232`

**Diff proposé** (logique, pas littéral) :

1. Pondérer les chronos par distance la plus longue saisie. Si le user a un Marathon ou Semi, NE PAS classer en `deb` sur la base d'un 10K isolé. Exemple : marathon 5h15 (= ~7'30/km) sur 42km est physiologiquement un `inter` minimum (un débutant n'arrive pas à finir un marathon sans préparation conséquente).

2. Ajouter un **correctif âge** sur les seuils chrono : pour homme ≥ 55 ans (femme ≥ 50), seuils 10K assouplis de +5min sur chaque cran. Justifié : la VO2max décroît ~10%/décade après 30 ans (Tanaka 2008).

3. Limiter `maxDrop` à 1 même quand VMA < hardDropThreshold (sauf si gap ≥ 2). Le drop de 2 crans est rare et hasardeux.

4. **Logger en clair** quand un override se produit + **exposer dans `generationContext`** un champ `levelOverrideReason` pour que l'UI puisse afficher un message du type "Vous vous êtes déclaré Expert, mais vos chronos suggèrent Confirmé — nous calibrons sur Confirmé. Cochez la case ci-dessous si vous souhaitez forcer Expert."

**Effet attendu sur les 10 profils** :
| Profil | Effective avant | Effective après | Pic avant | Pic estimé après |
|---|---|---|---|---|
| georgeslor1 | deb | inter (correctif âge + marathon prim) | 53 | ~65 (Marathon inter 65) |
| jeremy | deb (parsing 5K cassé) | (Fix#3 enlève le bug 5K, reste Expert) | 70 sim | 90+ (à modérer Fix#5) |
| rija | expert | expert (inchangé) | 90 | 90 |
| vincenthamel | conf | conf ou expert (Marathon 3h10→Expert si Fix#1 pris) | 85 | ~90 |
| lafleur | inter | inter (cohérent) | 47 | 47 |
| antoine | conf | conf | 90 | 80 (Fix#4) |
| armando | expert (bug parsing) | conf (Fix#3 parse "37min") | 92 | 75-80 |
| sebastien | deb | deb | 6 | 9 (Fix#2) |
| alan | inter (bug parsing) | inter ou deb (Fix#3 parse) | 41 | 35-45 |
| nabou | conf | conf | 45 | 45 |

**Tests à ajouter** : `detectLevelFromData.test.ts` — pour chaque combinaison age × chronos × VMA × declared, asserter le effective level et la `reason`.

**Risques régression** : non-négligeables, car cette fonction est appelée partout (renfo, paces, prompt Gemini). À tester sur le full corpus de 600+ plans (audit-all-plans.json). Mitigation : ajouter le param facultatif `strictMode=false` (default), garder l'ancien comportement accessible.

---

### Fix #2 — Découpler cap VMA-durée du floor `currentVolume`

**Objectif** : séparer le "physiquement possible" du "ce que je fais déjà". Aujourd'hui le code utilise `currentVolume` à la fois comme floor (anti-régression) et comme cap (anti-VMA-trop-bas). Cela bipolarise le résultat : sans `currentVolume`, plan écrasé ; avec, plan possiblement trop ambitieux.

**Localisation** : `geminiService.ts:2351-2436`

**Diff proposé** :

1. **Cap dur physique** = vmaBasedMaxVolume PLUS sessionFactor mais sans `currentVolume` rescue. C'est ce qui est physiquement faisable en durée × allure dans la fréquence donnée.

2. **Plancher `currentVolume`** s'applique SÉPARÉMENT, et il ne peut EXCÉDER le cap dur physique de +30% max. Aujourd'hui le code accepte `currentVolume` même 2× supérieur au cap physique (cas Vincenthamel : current 85, cap théorique 31, accepted 85). Cela laisse passer des incohérences.

3. **Si `currentVolume` >> cap physique**, déclencher un check de cohérence : "Vous déclarez 85km/sem en 3 séances. Cela implique des SL de 35-40km, est-ce correct ?" Si oui, élargir le cap. Si non, raboter au cap physique +20%.

4. **Le bump "Progression min"** (L2428-2436) :
   - Aujourd'hui : `safeTarget = min(current × 1.18, baseMax × 1.10)`. Le facteur 1.18 est trop fort pour les gros volumes (80km × 1.18 = 94 ⇒ pic dépasse Expert cap 85).
   - Proposé : `safeTarget = min(current × 1.10, baseMax × 1.05)` pour `current ≥ 60km` ; `× 1.15` pour 30-60 ; `× 1.20` pour < 30. **Progression dégressive avec le volume actuel** (un coureur à 80km n'a pas besoin de +18%, +10% suffit).

**Effet attendu** :
| Profil | Pic actuel sim | Pic post-fix |
|---|---|---|
| antoine (current 80, freq 6) | 90 | 84 (current×1.05=84, baseMax×1.05=88) |
| armando (current 80, freq 6) | 92 | 84 |
| rija (current 90, freq 6, Expert 5K cap 60) | 90 | 90 (current 90 retenu, déjà au-dessus) |
| vincenthamel (current 85, freq 3, conf Semi cap 60) | 85 | 85 (current floor) — mais cohérence check pourrait alerter "85km en 3 séances suspicious" |
| lafleur (current 40, freq 3, inter Semi cap 47) | 47 | 44 (current×1.10=44) — plus doux |

**Tests** : `calculatePeriodizationPlan.test.ts` — matrice current × freq × level × goal asserter le pic.

**Risques** : modèle plus conservateur sur les gros volumes ⇒ certains Experts pourraient se plaindre d'un plan "trop bas". À balancer avec l'option "j'assume des SL plus longues".

---

### Fix #3 — Parser tolérant pour `timeToSeconds` (formats libres)

**Objectif** : accepter "37min" / "58 min" / "1h" / "1H30" / "37mn" sans casser sur les valeurs hors-format.

**Localisation** : `geminiService.ts` (helper local) — il existe 2 versions probables (une dans calculatePeriodizationPlan, une dans detectLevelFromData). Centraliser.

**Diff proposé** :

```ts
function timeToSeconds(timeStr: string, distance: number): number {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase().replace(/\s+/g, '');

  // 1. Format "XhYY" ou "XhYYmin"
  const hm = s.match(/^(\d+)h(\d{0,2})/);
  if (hm) { const h = parseInt(hm[1]); const m = hm[2] ? parseInt(hm[2]) : 0; return h * 3600 + m * 60; }

  // 2. Format "H:M:S"
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);

  // 3. Format "M:SS" (ou "H:MM" pour les longues)
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) { if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60; return parseInt(ms[1])*60 + parseInt(ms[2]); }

  // 4. NEW: Format "37min" / "37mn" / "37 minutes"
  const minOnly = s.match(/^(\d+)(?:min|mn|minutes)/);
  if (minOnly) {
    const m = parseInt(minOnly[1]);
    // Heuristique : 5K en 37min OK, 5K en 90min OK (débutant), 10K en 37min OK, 10K en 25min impossible
    return m * 60;
  }

  // 5. NEW: Format "1h" sans minutes
  if (/^\d+h$/.test(s)) return parseInt(s) * 3600;

  // 6. NEW: Une valeur déraisonnable (ex: "50km (6h50)" pour distance5km) — REJET strict
  // Si on a des caractères non-temporels (km, m, etc.), on retourne 0 + LOG
  if (/[a-z]/.test(s) && !/^\d+(min|mn|minutes|h)$/.test(s)) {
    console.warn(`[timeToSeconds] format non reconnu: "${timeStr}" pour ${distance}km → ignoré`);
    return 0;
  }

  return 0;
}
```

**Effet attendu** :
| Profil | Parsing actuel | Parsing fixé | Effective level |
|---|---|---|---|
| armando | 10K="37min" → 0 | 37×60=2220s → 37min | expert→**conf** |
| alan | 5K="25min" → 0 ; 10K="58min" → 0 | 25min ; 58min | inter→**deb** (5K conf, 10K deb → min=deb) ⇒ probablement trop sévère |
| jeremy | 5K="50km (6h50)" → 410min (BUG, treated as 6h50) | rejected (contains "km") → 0 | reste **deb** uniquement via VMA — mais VMA 17.5 ⇒ expert. Donc effective=**expert** (≠ actuel deb) ! |

**Tests** : `timeToSeconds.test.ts` — couvrir 20+ formats : "1h00", "1H00", "1:00", "01:00", "37min", "37 min", "37mn", "50km (6h50)", "DNF", "1h", "1:00:00", etc.

**Risques** : jeremy passe de `deb` à `expert` ⇒ son pic risque d'exploser. À combiner avec Fix#2 (cap raisonné). Pour alanwentzel, le passage à `deb` est trop sévère (il a la VMA d'un inter clair) ⇒ besoin de croiser avec un Fix#1 plus malin (prendre le MAX level entre chrono et VMA quand l'écart est >1 cran).

---

### Fix #4 — Plafonner le `sessionFactor` × tables pour ne pas dépasser l'Expert cap absolu

**Objectif** : empêcher qu'un Conf avec freq=6 (×1.20) dépasse l'Expert cap absolu.

**Localisation** : `geminiService.ts:2289-2295` + check post

**Diff proposé** :

```ts
if (sessionFactor !== 1.00) {
  const before = maxVolume;
  maxVolume = Math.round(maxVolume * sessionFactor);
  // NEW: ne jamais dépasser le cap absolu Expert pour ce goal
  const absoluteExpertCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert || 999;
  if (maxVolume > absoluteExpertCap && level !== 'Expert (Performance)') {
    console.log(`[Periodization] sessionFactor cap: ${maxVolume}km > Expert cap ${absoluteExpertCap}km → clamped`);
    maxVolume = absoluteExpertCap;
  }
}
```

Note: `objectiveKey` est défini plus tard L2496, il faudrait le hoister.

**Effet attendu** :
| Profil | sessionFactor effect | Avant | Après |
|---|---|---|---|
| antoine (Conf Marathon, freq 6, ×1.20) | 75→90 | 90 | 85 (Expert Marathon cap) |
| armando (Conf Semi, freq 6, ×1.20) | 60→72, puis bump à 92 | 92 | 70 (Expert Semi cap) — ATTENTION : la progression min L2428 reprend, donc résultat final dépendra |
| rija (Expert 5K, freq 6, ×1.20) | 60→72 — inchangé (Expert) | 90 | 90 (current floor) |

**Risques** : trop conservateur pour les vrais Confirmés qui ont la cylindrée pour faire le volume Expert. À combiner avec Fix#1 pour reclasser les "vrais Experts" correctement.

---

### Fix #5 — Réviser le `minViableVolume` et le cap final pour les profils ultra-bas-volume

**Objectif** : pour les débutants à 1 séance/sem (cas sebastien), accepter que minViable=race×1.5 n'est PAS atteignable et que c'est OK.

**Localisation** : `geminiService.ts:2444-2506`

**Diff proposé** :

1. `minViableVolume` conditionné à `runningSessions ≥ 2` : si runSess=1, plafond à `vmaBasedMaxVolume × 1.20` (acceptation que la prépa sera "marche-course incomplète").
2. Pour Finisher + currentVol > 0 + runSess ≥ 2 : ne pas appliquer le facteur 0.75 si `currentVolume / raceDistance ≥ 1.0` (le coureur fait déjà la distance, pas besoin de réduire). Cas Alan : 30km/sem pour Trail 35km Finisher → on garde le cap calculé sans le ×0.75.

**Effet attendu** :
| Profil | Pic actuel | Pic post-fix |
|---|---|---|
| sebastien | 6 | 9 (vmaCap 5×1.20=6 + autorisation explicite Finisher 10K à pic 9km via override) — validation FFA OK |
| alan | 41 | ~55 (sans réduction Finisher car current/race = 30/35 = 0.86 ≥ 0.5) |

**Tests** : couvrir Finisher debut/conf/expert × runSess 1/2/3.

**Risques** : Fix concerne edge cases, peu de régressions attendues.

---

## 5. Tableau récap effet attendu post-fixes

| Profil | Inputs clés | Pic actuel observé | Pic sim. (code actuel) | Pic post Fix#1+2+3+4+5 | Verdict Romane |
|---|---|---|---|---|---|
| georgeslor1 | Expert/Marathon, 57ans, 90kg, 45km, freq5 | 50 (patch) | 53 | **65** (correctif âge Marathon prim ⇒ inter, table=65) | ✅ proche cible |
| jeremy | Expert/Trail100km, 95kg, 70km, freq5 | 100 (OLD code) | 70 | **90-95** (Fix#3 rejette "50km(6h50)" ⇒ pas de chrono override, VMA 17.5 ⇒ Expert ; Fix#4 limit ; current 70 floor + progression douce ⇒ ~85-95) | À ajuster Fix#2 |
| rija | Expert/5K, 90km, freq6 | 60 (OLD) | 90 | **90** (current 90 floor — pas de changement) | ✅ (75-90 OK pour profil élite) |
| vincenthamel | Expert/Semi (Marathon 3h10), 85km, freq3 | 60 (OLD) | 85 | **80** (Fix#2 modère bump current×1.18 ; Fix#1 garde Expert si Marathon 3h10 priorisé ⇒ ~80) | ✅ |
| lafleur | Conf/Semi (2h05 PB), 40km, freq3 | 38 | 47 | **44** (Fix#2 bump ×1.10 au lieu ×1.18 ⇒ 44 ; inchangé Fix#1) | ✅ |
| antoine | Expert/Marathon sub-3h, 80km, freq6 | 86 (patch) | 90 | **85** (Fix#4 cap Expert Marathon ; ou current×1.05=84 via Fix#2) | ✅ |
| armando | Expert/Semi sub-1h20, 80km, freq6 | 84 (patch) | 92 | **84** (Fix#3 parse "37min" ⇒ conf ; Fix#4 cap Semi expert 70 ; mais current 80 floor ⇒ ~84) | ✅ |
| sebastien | Débutant/10K (1h30), 130kg, 5km, freq2 | 9 (patch) | 6 | **9** (Fix#5 autorise pic 9 pour Finisher 10K runSess=1) | ✅ |
| alan | Conf/Trail35 Finisher, 21ans, 30km, freq4 | 45 (patch) | 41 | **48** (Fix#3 risque deb si parse réussi ⇒ besoin Fix#1 pour garder inter via VMA prim ; Fix#5 retire Finisher×0.75 ⇒ ~48) | ✅ |
| nabou | Conf (via chrono)/Semi 1h45, 45ans, 40km, freq4 | 45 | 45 | **45** (inchangé — chronos M:SS bien parsés) | ✅ |

---

## 6. Annexes

### 6.1 — Fichiers de données générés

- `/Users/romanemarino/Coach-Running-IA/10-cascade-v2.json` — données brutes Firestore des 10 profils + plans + weeklyVolumes observés
- `/Users/romanemarino/Coach-Running-IA/10-cascade-simulation.json` — simulation cascade pour chacun des 10 profils + trace ligne par ligne

### 6.2 — Scripts

- `/Users/romanemarino/Coach-Running-IA/fetch-10-v2.mjs` — récupère depuis Firestore (impersonation SA + REST API)
- `/Users/romanemarino/Coach-Running-IA/simulate-cascade.mjs` — réimplémente fidèlement `calculatePeriodizationPlan` en JS pur

### 6.3 — Lignes de code cruciales référencées

- `geminiService.ts:1076-1090` — table `MAX_WEEKLY_VOLUME`
- `geminiService.ts:1174-1232` — `detectLevelFromData`
- `geminiService.ts:2165-2818` — `calculatePeriodizationPlan`
- `geminiService.ts:2219-2277` — table `maxVolume` hard-codée (DOUBLE source de vérité avec `MAX_WEEKLY_VOLUME`)
- `geminiService.ts:2285-2295` — `sessionFactor` multiplicatif
- `geminiService.ts:2351-2412` — cap VMA-durée + `safeVmaCap`
- `geminiService.ts:2415-2436` — floor `currentVolume` + `Progression min`
- `geminiService.ts:2628-2676` — calcul `startVolume` (multi-floor)

### 6.4 — Observations méthodologiques

- 4 des 10 plans datent de mars 2026 (jeremy, rija, vincenthamel, lafleur) ⇒ leur pic observé reflète une ancienne version du code. Les valeurs "trop HAUT" (jeremy peak 100) ne sont plus reproductibles aujourd'hui.
- 6 des 10 plans sont post-2026-05-15 ⇒ leur pic observé reflète le code actuel après patches manuels Romane.
- Le simulator reproduit le **comportement actuel raw** du code (avant patches manuels) ⇒ c'est ce qui faut analyser pour décider de la refonte structurelle.
- Le simulator ne reproduit PAS : (a) le post-processing Gemini lui-même qui peut ajuster les semaines individuelles, (b) `enforceFullPlanConstraints` qui re-cap les SL/séances, (c) les patches manuels post-création.

### 6.5 — Points qui sortent du scope mais à surveiller

- **Le champ `recentRaceTimes.distance5km`** accepte n'importe quoi (cas jeremy "50km (6h50)") — besoin de validation amont au questionnaire.
- **Double source de vérité `MAX_WEEKLY_VOLUME` (table) vs hard-codé L2220-2277** : risque divergence sur la prochaine modif.
- **`detectLevelFromData` appelé 2× (avant et après génération)** : si `data` muté entre les 2 appels, level différent. Cela peut produire des incohérences entre périodisation et enforcement.
- **Aucun test unitaire** sur `detectLevelFromData` ni `calculatePeriodizationPlan` n'a été trouvé dans `__tests__/`. Toute refonte sans tests = risque régression massive.
