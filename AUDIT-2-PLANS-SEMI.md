# Audit 2 plans Semi-Marathon — modestes — analyse référentiel + fix code
Date : 2026-05-20
Auditeur : agent Claude (instruction Romane, mission « 2 plans Semi modestes »)
Scope : lecture seule Firestore + code. Aucun patch exécuté.

---

## 0. Synthèse exécutive

Romane signale 2 plans Semi-Marathon dont le volume hebdo paraît trop faible.
Le challenge structurel est confirmé : **le `vmaBasedMaxVolume` (cap VMA-durée)
écrase systématiquement les profils Débutant/Confirmé à VMA modeste, produisant
des pics 40-65 % en-dessous du référentiel coach interne `REFERENTIEL-COACH.md`.**

| Plan | User | Profil | Pic projeté | Référentiel coach interne | Verdict |
|------|------|--------|------------:|--------------------------:|---------|
| `1779261135721` | morganed***@ | Déb 3×, VMA 11, CV 7, Finisher | **14 km** | 27 km (Déb 3× Semi) | **-48 %** |
| `1779260474961` | louler***@ | Conf 4×, VMA 9.66, CV 10, "1h10" IRRÉALISTE | **18 km** | 56 km (Conf 4× Semi) | **-68 %** |

> ⚠ Note méthode : Romane a mappé louleroy94 → `1779261135721`. **C'est
> morganedorlet696 qui possède ce plan.** Le plan louleroy94 est
> `1779260474961`. J'ai audité les deux.

Cause racine identifiée : `geminiService.ts` L2420-2482, le cap VMA-durée
calculé à partir de `MAX_SL_DURATION` + 75 % VMA + facteur 0.70 est trop
conservateur pour les VMA basses (< 12 km/h) en peu de séances (2-3 running),
et le mode marche-course (seul rattrapage existant) est désactivé sur
Finisher (`hasSpecificTimeTarget=false`).

---

## 1. Plan 1 — morganedorlet696 (`1779261135721`) — Déb Finisher Semi

### 1.1 Profil (Firestore live, snapshot 2026-05-20T07:12)

| Champ | Valeur |
|-------|--------|
| email | `morganed***@gmail.com` |
| sexe | Femme |
| âge | 20 |
| poids / taille / BMI | 63 kg / 170 cm / **21.8** (normal) |
| niveau déclaré | **Débutant (0-1 an)** |
| VMA | 11 km/h *(estimée Débutant)* |
| `currentWeeklyVolume` | **7 km/sem** |
| subGoal | Semi-Marathon (21.1 km) |
| `targetTime` | **Finisher** |
| `frequency` | 3 |
| `recentRaceTimes` | {} (aucun) |
| `raceDate` | 2026-10-17 (22 sem) |
| comment | « 4 séances muscu/sem + j'aimerais courir 2× /sem » |
| `confidenceScore` | 55 |
| `feasibility.status` | AMBITIEUX |
| `isPreview` / `fullPlanGenerated` | true / false |
| `modelUsed` | `gemini-3-flash-preview` |
| créé il y a | ~1 h → **patchable live (< 24 h)** |

Cohérence input :
- Le comment dit « courir 2×/sem » mais frequency=3. Le code applique 3 séances dont 1 renfo (= 2 running effectives), donc **en réalité aligné avec la volonté user**. Pas d'incohérence à corriger.
- Pas de PB déclaré → calibration VMA-based (efPace 8:08, allure semi 6:25).

### 1.2 Dimension 2 — Volume (audit)

| Métrique | Valeur observée | Cible coach | Verdict |
|----------|----------------:|------------:|---------|
| `currentWeeklyVolume` | 7 km | — | — |
| S1 calibré | **8 km** | 7-10 | ✅ (ratio 1.14 ≤ 1.6 Sprint 6) |
| Pic | **14 km** (S15) | **27 km** (ref Déb 3× Semi) | ❌ **-48 %** |
| Saut max % / sem | +20 % (S11→S12 : 10→12) | ≤ 15 % | ⚠ légère dérive arrondi |
| Affûtage final | S21 : 9 km / S22 : 8 km (= 64 % / 57 % pic) | -30 % puis -50 % | ✅ shape OK |
| SL pic projetée (32 % du pic) | **4.5 km** | **14 km** (ref Déb Semi) | ❌ **-68 %** |

`weeklyVolumes` complet :
```
S1:8  S2:9  S3:9  S4:7-R  S5:8  S6:9  S7:9-R  S8:9  S9:10  S10:10-R
S11:10 S12:12 S13:11-R S14:12 S15:14 S16:11-R S17:13 S18:14 S19:11-R S20:13 S21:9-AF S22:8-AF
```

**Anomalie structurelle** : à 14 km/sem total avec SL = 4.5 km, les 2 autres
séances font ~5 km chacune. **Aucune progression utile vers 21.1 km de course**
en 22 semaines. Une débutante qui doit courir 21.1 km dans 22 semaines avec
une SL pic à 4.5 km est mathématiquement non-préparée (ratio SL/race = 21 %).

Doctrine `feedback_securite_avant_conversion` + `feedback_jamais_baisser_allure_cible` :
le plan affiche AMBITIEUX mais la trajectoire de volume est sous le seuil
de safe preparation. Le welcome dit déjà « volume actuel 7 km/sem un peu
faible pour un semi (20 km/sem minimum) » donc la transparence existe, mais
le plan ne corrige pas → **incohérence prévention vs entraînement**.

### 1.3 Autres dimensions

- **D1 Allure** : 6:25 /km Semi-spé, dérivée de VMA 11 km/h. Cohérent Finisher.
- **D3 Diversité** : preview S1 = Marche/Course + Renforcement + SL. OK pour Déb S1.
- **D4 SL** : SL S1 = 5 km en EF, cohérent avec `MIN_SL_PROPORTION` 0.32. Sous-dimensionnée pour préparation Semi (cf. D2).
- **D5 Renfo** : Renfo Focus A — Quadriceps & Gainage S1 présent, conforme doctrine `feedback_renfo_obligatoire`.

---

## 2. Plan 2 — louleroy94 (`1779260474961`) — Conf Semi 1h10 IRRÉALISTE

### 2.1 Profil (Firestore live, snapshot 2026-05-20T07:01)

| Champ | Valeur |
|-------|--------|
| email | `louler***@gmail.com` |
| firstName | Lou |
| sexe | Femme |
| âge | 23 |
| poids / taille / BMI | 88 kg / 170 cm / **30.4** (obésité classe 1) |
| niveau déclaré | **Confirmé (Compétition)** |
| VMA | 9.66 km/h *(dérivée du 10 km en 1h09)* |
| `currentWeeklyVolume` | **10 km/sem** |
| subGoal | Semi-Marathon |
| `targetTime` | **1h10** ⚠ aberrant |
| `frequency` | 4 |
| `recentRaceTimes` | `{distance10km: "1h09"}` |
| `raceDate` | 2026-10-18 (22 sem) |
| `preferredLongRunDay` | Mercredi |
| `confidenceScore` | **5** |
| `feasibility.status` | **IRRÉALISTE** |
| `feasibility.recommendation` | « un temps cible de 2h42 » |
| créé il y a | ~1 h → **patchable live (< 24 h)** |

**Incohérences input multiples** :

1. **`targetTime=1h10` aberrant** : une coureuse qui fait 10 km en 1h09 ne fait
   pas 21.1 km en 1h10. Saisie probable = **2h10** (= 6:09/km, cohérent avec
   10 km en 1h09). Le `feasibility.message` détecte bien le problème : « VMA
   nécessaire 21.3 km/h = 220 % VMA actuelle ». Score 5 IRRÉALISTE est correct.

2. **`level=Confirmé (Compétition)` aberrant** : une compétitrice ne fait pas
   son 10 km en 1h09 (6:54/km). C'est un niveau **Débutant/Régulier**. Auto-
   override probable non déclenché (à investiguer).

3. **`allureSpecifiqueSemi=3:19`** ← **CORRUPTION VISIBLE**. Cette allure
   n'est pas humaine (= 18 km/h sustained sur 21 km). Cause : `applyTargetTimeOverride`
   L942-1006 calcule `targetSec = timeToSeconds("1h10", 21.1) = 4200s` puis
   `targetPaceSec = 4200/21.1 = 199 s = 3:19`. Le code respecte volontairement
   l'input user (doctrine `feedback_input_client_obligatoire` + `feedback_jamais_baisser_allure_cible`),
   mais l'allure résultante est mathématiquement infaisable. **Garde-fou
   manquant** : si `targetPaceSec < vmaPaceSec × 0.5` (= cible > 200 % VMA),
   afficher l'allure VMA-based + flag dans `welcomeMessage` (déjà fait sur
   message mais l'allure dans le plan reste 3:19).

4. **BMI 30.4** : applique correctement `×0.80` sur maxVolume (60→48).

### 2.2 Dimension 2 — Volume (audit)

| Métrique | Valeur observée | Cible coach | Verdict |
|----------|----------------:|------------:|---------|
| `currentWeeklyVolume` | 10 km | — | — |
| S1 calibré | **10 km** | 10-15 | ✅ (ratio 1.00 ≤ 1.6) |
| Pic | **18 km** (S18) | **56 km** (ref Conf 4× Semi) | ❌ **-68 %** |
| Saut max % / sem | +20 % (S5→S6 : 10→12) | ≤ 15 % | ⚠ |
| Affûtage final | S21 : 12 / S22 : 10 (66 % / 55 % pic) | -30 puis -50 | ✅ shape |
| SL pic projetée (30 % pic) | **5.4 km** | 18-22 km | ❌ **-72 %** |

`weeklyVolumes` complet :
```
S1:10 S2:11 S3:11 S4:9-R  S5:10 S6:12 S7:10-R S8:12 S9:14 S10:11-R
S11:13 S12:15 S13:13-R S14:15 S15:17 S16:14-R S17:16 S18:18 S19:14-R S20:16 S21:12-AF S22:10-AF
```

**Observation critique** : SL pic projetée à 5.4 km pour préparer un Semi est
**non-préparant**. Ratio SL/race = 26 %. Le code applique la doctrine `feedback_jamais_baisser_allure_cible`
mais ne corrige pas le volume pour autant. La feasibility a downgrade le score
à 5 (correct), mais le plan reste inutilisable pour aller au bout du semi.

---

## 3. Référentiel Semi-Marathon par niveau — comparaison

### 3.1 Référentiel coach interne (`REFERENTIEL-COACH.md` L92-102)

```
Semi-Marathon
| Niveau         | km/séance pic | 3× | 4× | 5× | 6× |
| Débutant       |       9       | 27 | 36 | 45 |  – |
| Intermédiaire  |      12       | 36 | 48 | 60 |  – |
| Confirmé       |      14       | 42 | 56 | 70 | 84 |
| Expert         |      16       | 48 | 64 | 80 | 96 |
SL pic : Déb 14 · Inter 16-18 · Confirmé 18-22 · Expert 22-28
SL ≥ 16 km · Tempo continu 8-15 km en spé · Affûtage 14 j
```

### 3.2 Pfitzinger « Faster Road Racing » (Half-Marathon Programs)

| Niveau | Pic km/sem | SL pic |
|--------|-----------:|-------:|
| Beginner Half (sub-2h30 / Finisher) | 25-35 | 16-18 |
| Régulier (sub-2h00) | 30-40 | 18-20 |
| Compétiteur (sub-1h45) | 40-50 | 20-22 |
| Élite (sub-1h30) | 50-60 | 22-28 |

### 3.3 Tableau comparatif des 2 plans audités

| Niveau plan | Référentiel pic Pfitzinger | Référentiel pic coach interne | Pic observé | Δ vs coach |
|-------------|---------------------------:|------------------------------:|------------:|-----------:|
| **Morgane** Déb 3× Finisher | 25-35 (Beginner) | 27 (Déb 3×) | **14** | **-48 %** |
| **Louleroy** Conf 4× (1h10) | 40-50 (Compétiteur) | 56 (Conf 4×) | **18** | **-68 %** |

Verdict : **les 2 plans sont 40-70 % en-dessous du référentiel.** Ni Pfitzinger
ni le référentiel coach interne (qui sert pourtant à calibrer les `MAX_WEEKLY_VOLUME`
L1029) ne sont respectés.

### 3.4 Cap MAX_WEEKLY_VOLUME vs valeur réelle calculée

`MAX_WEEKLY_VOLUME.Semi` table (L1029) :
```
Semi: deb=35  inter=55  conf=60  expert=70
```

Calcul réel avec cap VMA :

- **Morgane Déb** : 35 (table) → 30 (sessionFactor) → 23 (Finisher×0.75) → **15 (cap VMA-durée)**.
- **Louleroy Conf** : 60 (table) → 60 (sessionFactor=1.00) → 48 (BMI 30+ ×0.80) → **24 (cap VMA-durée)**.

Le cap VMA-durée court-circuite la table coach et impose **15 / 24** au lieu de **23 / 48**.
Puis le moteur de progression atteint 14 / 18 (un peu en-dessous du cap, car
le pic est lissé par les semaines de récup et l'ondulation `weeksAtPeak`).

---

## 4. Investigation code — pourquoi le pic est si bas

### 4.1 Localisation du coupable

`src/services/geminiService.ts` lignes **2420 - 2482** : bloc « CAP VMA-DURÉE ».

```ts
// L2459 — formule du cap dur
const efSpeedKmH = vma * 0.75;
const realisticFactor = 0.70;
const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;
const otherMaxKm = ((runningSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;
const vmaBasedMaxVolume = Math.round(slMaxKm + otherMaxKm);
```

### 4.2 Cascade traces (simulation `_audit-semi-simul.mjs`)

```
=== Morgane (Déb / 3 sess / VMA 11 / CV 7 / Finisher) ===
  baseMax Semi deb            = 35
  ×0.85 (sessionFactor 3 sess) = 30
  ×0.75 (Finisher)             = 23
  VMA cap = (90×0.70/60×8.25) + (1×68×0.70/60×8.25)
          = 8.66 + 6.54 = 15
  vmaBased=15 < maxVolume=23 → APPLIED 23→15
  currentVolume=7 < vmaBased=15 → pas de "rescue" (safeVmaCap reste 15)
  FINAL maxVolume = 15
```

```
=== Louleroy (Conf / 4 sess / VMA 9.66 / CV 10 / 1h10) ===
  baseMax Semi conf            = 60
  ×1.00 (sessionFactor 4 sess) = 60
  ×0.80 (BMI 30.4)             = 48
  VMA cap = (115×0.70/60×7.25) + (2×86×0.70/60×7.25)
          = 9.72 + 14.54 = 24
  vmaBased=24 < maxVolume=48 → APPLIED 48→24
  currentVolume=10 < vmaBased=24 → pas de rescue
  FINAL maxVolume = 24
```

### 4.3 Causes structurelles

**Cause #1 — Formule VMA-durée trop conservative pour VMA basse**

À VMA 11 km/h (femme débutante typique), `efSpeedKmH = 0.75 × 11 = 8.25 km/h`
= **7:16 /km**. Pour les deb, c'est déjà plus rapide que leur footing réel
(ils tournent souvent à 8:30-9:00). Donc 75 % VMA n'est pas la "vraie" vitesse
de footing → le cap réel pour eux est encore plus bas.

Mais surtout, le `realisticFactor=0.70` (« on ne fait pas chaque séance à
durée max ») cumulé avec `efSpeedKmH=0.75×VMA` donne un facteur effectif
**0.525 × VMA × durée**. Sur une SL de 90 min Semi/deb : `90×0.525/60×11 = 8.7 km`
**par séance la plus longue**. Pour les VMA basses (8-12), c'est physiquement
correct, mais ça écrase le pic vs le référentiel coach (qui ne prend pas en
compte la VMA).

**Cause #2 — Le « rescue » `currentVolume` ne se déclenche que si `currentVolume > vmaBasedMax`**

```ts
// L2469
if (currentVolume > 0 && currentVolume > vmaBasedMaxVolume) {
  // safeVmaCap = max(vmaBased, min(currentVolume, achievable@85%VMA))
}
```

Pour Morgane (CV=7 < cap=15) et Louleroy (CV=10 < cap=24), le rescue ne se déclenche pas. Le cap VMA reste appliqué brut.

**Cause #3 — Le mode marche-course (seul mécanisme d'override) est désactivé sur Finisher inversement à son intention**

```ts
// L2528
const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);
// L2536
const isLevelEligibleForWalkRun = level === 'Débutant (0-1 an)';
const isLowVolForTimedLongRace = isLevelEligibleForWalkRun &&
    currentVolume > 0 &&
    currentVolume < minViableVolume * 0.30 &&  // = 32×0.30 = 9.6
    raceDistanceKm >= 15 &&
    hasSpecificTimeTarget;  // ⚠ exclut Finisher
```

Logique actuelle : « marche-course = on assume des SL plus longues parce que
l'user a coché IRRÉALISTE en cochant un chrono ». Conséquence : **un Finisher
Débutant à CV=7 (cas Morgane) ne déclenche JAMAIS le mode marche-course**,
même si physiquement il en aurait besoin pour monter le SL.

→ Bug de design : la condition `hasSpecificTimeTarget` exclut le cas le plus
courant (débutants qui font Finisher leur premier Semi).

**Cause #4 — Plancher `minPeakVolume` ne sert à rien si cap VMA déjà bas**

```ts
// L2579
const minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap);
// rawMinPeakVolume = race × 1.5 = 32 ; absoluteCap = 70 Semi expert ; effectiveVmaCap = 15 (Morgane) ou 24 (Louleroy)
// → minPeakVolume = 15 ou 24 (clampé par VMA cap)
```

Le plancher (race × 1.5 = 32 km) est inutilisable car re-clampé par le cap VMA.

### 4.4 Le bug n'apparaît pas chez les profils Inter+ avec gros volume

Les profils audités précédemment (`INVESTIGATION-VOLUMES-PIC-CASCADE.md`,
audits Armando/Antoine/Rich) ne déclenchent pas ce bug car :
- VMA > 14-15 km/h → cap VMA naturellement plus haut
- currentVolume > vmaBased → `safeVmaCap` rescue activé
- Pas Finisher → mode marche-course disponible

**Le bug est silencieux et frappe spécifiquement les Semi/Marathon Débutant
et Inter/Conf à VMA modeste + currentVol faible + Finisher.** C'est précisément
le sous-cas non couvert par les audits précédents.

---

## 5. Propositions

### 5.1 Patch live (plans < 24 h, doctrine `feedback_patch_live_plans_jour_seulement`)

#### Patch live Morgane (`1779261135721`)

Plan créé il y a ~1 h → patchable.
S1 visible en preview mais non vécue → patch valable selon doctrine.

**Cible recalibrée (compromis Finisher Déb + référentiel coach 27 km)** :
- Pic 23 km (entre cap actuel 15 et ref coach 27, prudent Finisher VMA 11)
- SL pic 12 km (~52 % du pic, monte la SL de 4.5 → 12)
- S1 inchangé = 8 km
- Progression rate ~7.8 %/sem (calculé pour atteindre pic à S15)

**`weeklyVolumes` proposé** :
```
S1:8 S2:9 S3:10 S4:8-R S5:10 S6:11 S7:9-R S8:12 S9:14 S10:11-R
S11:15 S12:16 S13:13-R S14:18 S15:19 S16:15-R S17:21 S18:23 S19:18-R S20:23 S21:14-AF S22:12-AF
```

Toujours en-dessous du ref Pfitzinger Beginner (25-35) → conservateur safe pour
Finisher VMA 11 sans expérience. Le welcome doit garder l'avertissement « volume
de départ faible, suis le plan avec rigueur ».

Patch additionnel : `welcomeMessage` actuel mentionne déjà « 7 km/sem un peu
faible » → pas de modif nécessaire. Score 55 AMBITIEUX reste pertinent.

#### Patch live Louleroy (`1779260474961`)

Plan créé il y a ~1 h → patchable.

**Cible recalibrée** :
- Pic 40 km (compromis ref Pfitzinger Compétiteur 40-50, prudent vu BMI 30 + CV 10 + level réel = Régulier malgré déclaré Conf)
- SL pic 14 km (~35 % du pic)
- S1 = 12 km (currentVolume 10 × 1.20, sous floor Sprint 6 × 1.6 = 16)
- Progression rate ~10 %/sem

**`weeklyVolumes` proposé** :
```
S1:12 S2:13 S3:15 S4:12-R S5:16 S6:18 S7:14-R S8:20 S9:22 S10:18-R
S11:24 S12:27 S13:22-R S14:30 S15:33 S16:26-R S17:36 S18:40 S19:32-R S20:40 S21:25-AF S22:20-AF
```

Patch additionnel **OBLIGATOIRE** : alerter sur `targetTime=1h10` aberrant :
- `welcomeMessage` doit dire (en plus du message IRRÉALISTE) : « Tu as saisi
  1h10 comme objectif Semi — c'est plus rapide qu'un record du monde féminin.
  Si c'était 2h10 (cohérent avec ton 10 km en 1h09), envoie-nous un message
  pour qu'on corrige. En attendant, on calibre le plan sur ta capacité réelle
  (objectif visé ~2h42, cf. évaluation). »
- `paces.allureSpecifiqueSemi` : actuellement 3:19, devrait afficher l'allure
  VMA-based 6:25 ou l'allure recommandation (2h42 = 7:40/km). Le 3:19 est
  visiblement corrompu et perturbant pour Lou.

Doctrine `feedback_jamais_baisser_allure_cible` : on garde 1h10 cible OFFICIELLE
mais l'allure d'**entraînement** doit suivre la VMA réelle, pas la cible
infaisable. Le code respecte la doctrine en gardant la cible 1h10 dans le
plan, mais le `targetPace` 3:19 dans les séances n'est pas un input user — c'est
un dérivé. À corriger ou flagguer dans le SL.

> ⚠ Décision Romane requise sur le ton du message Louleroy.
> Doctrine `feedback_jamais_contact_client` : on ne contacte pas Lou
> directement — c'est Romane qui décide d'envoyer/relancer.

### 5.2 Fix code structurel (à valider Romane)

**Fix proposé #1 — Élargir le mode marche-course aux Débutants Finisher Semi+**

```ts
// L2528 — REMPLACER
const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);
// PAR
const isFinisherLongRace = isFinisherTarget(targetTime) && raceDistanceKm >= 15;
const hasMotivatedTarget = (!!targetTime && !isFinisherTarget(targetTime)) || isFinisherLongRace;
// L2541 — REMPLACER hasSpecificTimeTarget PAR hasMotivatedTarget
```

Justification : un débutant à 7 km/sem qui fait un **premier Semi en Finisher**
a autant besoin du mode marche-course qu'un débutant qui vise un chrono. La
distance de course (Semi/Marathon) suffit à justifier l'élévation du cap.

**Effet attendu Morgane** :
- isLevelEligibleForWalkRun = true (Déb) ✓
- currentVolume 7 < minViable×0.30 = 9.6 ✓
- raceDist 21.1 ≥ 15 ✓
- isFinisherLongRace = true (Semi Finisher) → hasMotivatedTarget = true ✓
- → mode marche-course activé : `vmaCapMC = 165×0.80/60×5.8 + 1×124×0.80/60×5.8 = 21.5 + 9.6 = 31`
- → effectiveVmaCap monte de 15 à 31
- → `minPeakVolume = min(32, 70, 31) = 31`
- → maxVolume final = max(15, 31) = **31** ≈ référentiel coach 27 ✅

**Fix proposé #2 — Plancher proportionnel à la race-distance pour les profils Conf/Expert IMC élevé**

Le cas Louleroy n'est pas un Débutant donc Fix #1 ne s'applique pas. Le vrai
problème ici est que **niveau="Confirmé" déclaré mais réalité = Régulier ou
moins** (10 km en 1h09 → ce n'est pas Conf).

Option A : auto-override niveau via `detectLevelFromData` (cf. Fix #1
INVESTIGATION-VOLUMES-PIC-CASCADE.md).

Option B (compromis live) : ajouter un plancher pic = `currentVolume + race-distance × 0.5` minimum, sans dépasser le cap VMA × 1.5 :

```ts
// Après L2584 (minPeakVolume)
const reasonablePeak = currentVolume + Math.round(raceDistanceKm * 0.5);  // 10 + 10.5 = 20 pour Louleroy
const safePeakFloor = Math.min(reasonablePeak, effectiveVmaCap * 1.5);
if (maxVolume < safePeakFloor && safePeakFloor <= effectiveVmaCap * 1.5) {
  console.log(`[Periodization] reasonable peak floor: ${maxVolume} → ${safePeakFloor}`);
  maxVolume = safePeakFloor;
}
```

→ Louleroy : reasonablePeak = 10 + 10.5 = 20.5, effectiveVmaCap×1.5 = 36 → safePeakFloor = 20. Toujours en-dessous du référentiel mais légèrement remonté du 18 actuel.

**Préférence** : Romane doit trancher. Fix #1 seul corrige Morgane proprement.
Pour Louleroy, le vrai fix est `detectLevelFromData` qui downgrade
"Confirmé déclaré + chrono Débutant" → niveau effectif Déb/Régulier, puis le
mode marche-course Fix #1 s'applique.

**Fix proposé #3 — Garde-fou allure spé sur cible infaisable (Louleroy 3:19)**

```ts
// applyTargetTimeOverride, après L997
const targetPaceStr = secondsToPace(targetPaceSec);
const vmaPaceSec = 3600 / vma;
// NEW: si cible > 200% VMA, ne PAS écraser l'allure dans le plan
// (le plan ne peut pas être préparé sur une allure infaisable)
if (targetPaceSec * 2 < vmaPaceSec) {
  console.warn(`[Paces] Cible ${data.targetTime} ${data.subGoal} = ${targetPaceStr} > 200% VMA → allure plan reste VMA-based ${previous}`);
  return;  // skip override
}
```

→ Louleroy : `targetPaceSec * 2 = 398s, vmaPaceSec = 3600/9.66 = 373s` → 398 > 373 donc la condition NE se déclenche PAS (cible Louleroy n'est pas > 200 % VMA en pace mais bien en équivalence VMA, sa cible nécessite 220 % VMA selon feasibility). Il faudrait raisonner en VMA cible = 3.6 / paceSec × 1000 plutôt que paceSec.

Formule plus directe :
```ts
const vmaTargetKmH = 3600 / targetPaceSec * (info.dist / 21.1);  // approx
// Plus simple : si pace cible < 75 % du pace VMA (= cible nécessite > 133 % VMA), refuser
if (targetPaceSec < vmaPaceSec * 0.5) {
  // refuser, garder allure VMA-based
  return;
}
```

Vérification Louleroy : `vmaPaceSec = 373s`, `targetPaceSec = 199s`. `199 < 373 × 0.5 = 186` ? Non, 199 > 186. Donc bug toujours pas attrapé. Il faut un seuil plus serré : `< vmaPaceSec × 0.55` → 205. **199 < 205 → attrapé ✓**.

Compromis : seuil **0.60** = cible > 167 % VMA → allure VMA-based gardée. Couvre Louleroy (220 %) sans pénaliser les vrais Compétiteurs (qui visent ~95-100 % VMA, ratio 1.0-1.05).

### 5.3 Tests à ajouter

- `calculatePeriodizationPlan.semi-debutant-finisher.test.ts` :
  - Profil Morgane : Déb / VMA 11 / 3 sess / CV 7 / Finisher Semi → asserter pic ≥ 25 km.
- `calculatePeriodizationPlan.semi-cv-bas-irrealiste.test.ts` :
  - Profil Louleroy : Conf déclaré / VMA 9.66 / 4 sess / CV 10 / 1h10 → asserter pic ≥ 28 km (compromis Régulier réel).
- `applyTargetTimeOverride.test.ts` :
  - Cible > 167 % VMA → allure plan = VMA-based (pas écrasée).

---

## 6. Décisions Romane attendues

| # | Action | Décision attendue |
|---|--------|-------------------|
| 1 | Patch live Morgane `1779261135721` : pic 14 → 23, SL pic 4.5 → 12 | oui / non |
| 2 | Patch live Louleroy `1779260474961` : pic 18 → 40, SL pic 5.4 → 14 | oui / non |
| 3 | Patch additionnel Louleroy : allure spé 3:19 → VMA-based 6:25 + welcome augmenté « 1h10 = sans doute 2h10 » | oui / non |
| 4 | Fix code #1 (marche-course pour Finisher Semi/Marathon Débutants) | oui / non |
| 5 | Fix code #2 (plancher reasonablePeak pour Conf/Expert IMC élevé) | oui / non (alternative : Fix detectLevelFromData) |
| 6 | Fix code #3 (garde-fou allure spé > 167 % VMA) | oui / non |
| 7 | Anonymisation des emails dans logs / commits | déjà fait dans ce rapport |
| 8 | Contact direct Lou pour confirmer 2h10 vs 1h10 | **NON** doctrine `feedback_jamais_contact_client` — Romane décide |

---

## 7. Fichiers générés (données brutes, lecture seule)

- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan1.json` — plan Morgane parsé
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan-louleroy.json` — plan Louleroy parsé
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-morgane.json` — user Morgane
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-louleroy.json` — user Louleroy
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-fetch.mjs` — script fetch Firestore (impersonation SA)
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-simul.mjs` — simulation cascade calculatePeriodizationPlan

## 8. Lignes de code référencées

- `geminiService.ts:826-840` — table `MAX_SESSION_KM`
- `geminiService.ts:1009-1023` — table `MAX_SL_DURATION` (source du cap VMA)
- `geminiService.ts:1026-1040` — table `MAX_WEEKLY_VOLUME` (cap absolu)
- `geminiService.ts:1043-1057` — table `MIN_SL_PROPORTION`
- `geminiService.ts:2234-2906` — `calculatePeriodizationPlan` complet
- `geminiService.ts:2288-2346` — table interne `maxVolume` par niveau × goal (**alignée sur MAX_WEEKLY_VOLUME**)
- `geminiService.ts:2354-2364` — sessionFactor
- `geminiService.ts:2374-2411` — réductions (Finisher / âge / IMC)
- **`geminiService.ts:2420-2482` — CAP VMA-DURÉE (coupable principal)**
- `geminiService.ts:2528-2559` — mode marche-course (rattrapage non activable sur Finisher)
- `geminiService.ts:2570-2584` — `minPeakVolume` (re-clampé par cap VMA)
- `geminiService.ts:2715-2764` — calcul startVolume (Sprint 6 floors)
- `geminiService.ts:942-1006` — `applyTargetTimeOverride` (allure spé `3:19` Louleroy)

---

*Fin du rapport — TimeBox respecté, lecture seule, aucun patch exécuté.*
