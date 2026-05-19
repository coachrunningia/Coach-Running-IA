# AUDIT 4 PLANS S1 ENRICHI — 18/05/2026

**Auditeur** : claude-opus-4-7
**Date d'exécution** : 18/05/2026 12:47
**Méthode** : Lecture seule via REST Firestore avec impersonation `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com` (compte gcloud actif : `programme@coachrunningia.fr`)
**Script** : `~/Coach-Running-IA/audit-4-plans-s1.mjs` (réutilisable)
**Sorties brutes** : `audit-4-plans-s1.txt` (trace 544 lignes) + `audit-4-plans-s1.json` (dump complet)

---

## TABLEAU SYNTHÈSE — 4 CLIENTS

| # | Prénom | Goal | Cible | Niveau | VMA | Vol | S1→Pic | MaxΔ | Affût | SL S1 | Chrono cible | Faisa | Score | Bug 2h60min | Verdict global |
|---|--------|------|-------|--------|-----|-----|--------|------|-------|-------|--------------|-------|-------|-------------|----------------|
| 1 | Antoine | Marathon | 3h00 | Expert | 17.59 | 80 | 68→90/S7 | +15% | 50% | 24 km | 80% VMA ✅ | EXCELLENT | 100 | ❌ DÉTECTÉ | ⚠️ message buggué |
| 2 | Annabelle | Semi | 1h45 | Expert | 13.86 | 40 | 34→43/S6 | +16% | 53% | 13 km | 87% VMA ✅ | BON | 73 | ✅ | ✅ RAS |
| 3 | Armando | Semi | 1h20 | Expert | 18.26 | 80 | 68→80/S3 | +16% | 50% | 21 km | 87% VMA ✅ | EXCELLENT | 94 | ✅ | ✅ RAS |
| 4 | Sébastien | 10km | Finisher | Débutant | 8.0 | 5 | 4→6/S6 | +25% | 50% | 3.8 km | n/a (finisher) | BON | 70 | ✅ | ⚠️ SL = 95% vol hebdo |

**Légende verdicts cellulaires** :
- ✅ conforme / dans la cible
- ⚠️ écart modéré ou point d'attention
- ❌ écart important / bug

---

# CLIENT 1 — antoineg.gde@outlook.fr (Antoine, Marathon 3h00)

## Identité

| Champ | Valeur |
|---|---|
| Email | antoineg.gde@outlook.fr |
| UID | `G1QYJ1KzqqWXoB5BbcjKQFmORC02` |
| Plan ID | `1779086346189` |
| Nom du plan | Préparation Marathon en 3h00 — 22 sem. |
| Date inscription | 2026-05-18T06:38:36Z |
| Génération plan | 2026-05-18T06:39:06Z (30 s après inscription) |
| Dernière connexion | 2026-05-18T06:38:36Z (seulement à l'inscription, jamais revenu) |
| isPremium | `false` |
| isPreview | `true` |
| fullPlanGenerated | `false` |
| Sexe / Âge | Homme / 32 ans |
| Poids / Taille / BMI | 72 kg / 180 cm / **22.2** |
| Niveau | Expert (Performance) |
| Goal / SubGoal | Course sur route / Marathon |
| TargetTime | **3h00** |
| RaceDate | 2026-10-18 (22 sem.) |
| Frequency | 6 séances/sem (5 course + 1 renfo) |
| CurrentWeeklyVolume | 80 km/sem |
| Injuries | aucune |
| RecentRaceTimes | **10km = 38:06 • Semi = 1h24 • Marathon = 3h12** |

## 1. ALLURE COHÉRENCE vs OBJECTIF

**VMA estimée** : 17.59 km/h (source : « Moyenne 10km 38:06 et Semi 1h24 »)

| Pace | Valeur |
|---|---|
| efPace | 5:05 |
| eaPace | 4:26 |
| seuilPace | 3:55 |
| vmaPace | 3:25 |
| recoveryPace | 5:41 |
| allureSpécifique5k | 3:35 |
| allureSpécifique10k | 3:47 |
| allureSpécifiqueSemi | 4:01 |
| allureSpécifiqueMarathon | **4:16** |

**Calcul cible** : Marathon 42.195 km en 3h00 = **4:16/km = 80.0 % VMA** (attendu 78-86 %) → **✅ COHÉRENT** (le script auto a manqué le check car `goal=Course sur route` et non `marathon`, mais le pacing marathon dans paces[] est rigoureusement aligné : 4:16 = 4:16 ✅).

**Comparaison vs PB** : marathon PB = **3h12 → cible 3h00 = -12 min (gain ~6 %)**. Avec un Semi 1h24 (équivalent marathon théorique ~2h57 selon Riegel x1.06) → la cible 3h00 est **réaliste pour 22 semaines**. Le 10km 38:06 et le Semi 1h24 sont compatibles avec un marathonien sub-3h.

**Bug `formatTime "2h60min"`** : ❌ **DÉTECTÉ** dans `feasibility.message` (voir §4).

**Verdict §1** : ✅ COHÉRENT — paces calibrées correctement, cible alignée avec PB.

## 2. PIC VOLUME — TOUTES LES SEMAINES

```
Sem | Phase           | km   | Δkm   | Δ%    | Flag
────┼─────────────────┼──────┼───────┼───────┼──────────
S 1 | fondamental     |  68  |  --   |  --   |
S 2 | fondamental     |  75  |  +7   | +10%  |
S 3 | fondamental     |  82  |  +7   |  +9%  |
S 4 | recuperation    |  66  | -16   | -20%  | ↓DELOAD
S 5 | fondamental     |  76  | +10   | +15%  |
S 6 | fondamental     |  86  | +10   | +13%  |
S 7 | developpement   |  90  |  +4   |  +5%  | ★PIC
S 8 | recuperation    |  72  | -18   | -20%  | ↓DELOAD
S 9 | developpement   |  83  | +11   | +15%  |
S10 | developpement   |  86  |  +3   |  +4%  |
S11 | developpement   |  90  |  +4   |  +5%  |
S12 | recuperation    |  72  | -18   | -20%  | ↓DELOAD
S13 | developpement   |  83  | +11   | +15%  |
S14 | specifique      |  86  |  +3   |  +4%  |
S15 | specifique      |  90  |  +4   |  +5%  |
S16 | recuperation    |  72  | -18   | -20%  | ↓DELOAD
S17 | specifique      |  83  | +11   | +15%  |
S18 | specifique      |  86  |  +3   |  +4%  |
S19 | specifique      |  90  |  +4   |  +5%  |
S20 | affutage        |  60  | -30   | -33%  |
S21 | affutage        |  53  |  -7   | -12%  |
S22 | affutage        |  45  |  -8   | -15%  |
```

- **Total : 1694 km** • Moy 77 km/sem
- **Pic identifié** : **S7 = 90 km/sem** (re-touché à S11, S15, S19)
- **Saut S0→S1** : 80 → 68 km = **-15 %** ✅ (entrée prudente sous le volume actuel)
- **Max augmentation** : +15 % (S8→S9, +11 km) ⚠️ acceptable (limite haute mais récurrent à chaque sortie de deload)
- **Decloads projetés** : S4, S8, S12, S16 (toutes -20 %) ✅ rythme classique 3+1
- **Affûtage** : S20=60 (66 % pic), S21=53 (59 %), S22=45 (50 %) ✅ 3 semaines bien dessinées

**Verdict §2** : ✅ EXCELLENT — périodisation à 4 blocs 3+1, pic 90 km adapté à un coureur 80 km de base visant sub-3h, affûtage propre.

## 3. SL S1

| Jour | Type | Dist | Durée | Pace | Titre |
|---|---|---|---|---|---|
| Lundi | Jogging | 10.0 km | 51 min | 5:05 | Footing + lignes droites |
| Mardi | Renforcement | — | 35-45 min | — | Renfo Focus A — Quadriceps & Gainage S1 |
| Mercredi | Jogging | 12.0 km | 1h01 | 5:05 | Footing vallonné, côtes en marche |
| Jeudi | Jogging | 10.0 km | 51 min | 5:05 | Footing en blocs souples |
| Samedi | Jogging | 12.0 km | 1h01 | 5:05 | Footing vallonné |
| Dimanche | **Sortie Longue** | **24.0 km** | **2h01** | 5:05 | SL endurance fondamentale |

- Total km course S1 : 68.0 km ✅ (cohérent avec wv[0])
- **SL S1 : 24 km / 2h01 / pace 5:05 (= efPace) / 0 m D+**
- **Ratio SL/Vol S1 = 35 %** ⚠️ (cible 25-35 % — pile à la limite haute)
- Ratio SL/Vol actuel user = 30 % ✅
- Cohérence Expert sub-3h : oui, un Expert habitué à 80 km/sem encaisse 24 km en EF sans souci.

**Verdict §3** : ✅ — point d'attention sur le ratio 35 % mais acceptable pour Expert.

## 4. SCORE FAISABILITÉ + MESSAGE

- `feasibility.status` : **EXCELLENT**
- `feasibility.score` : **(absent)** ← champ non présent dans le doc
- `confidenceScore` : **100**
- Champs feasibility : `[status, message, safetyWarning]`

**`feasibility.message`** (175 chars) :
> Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ **2h60min**. Ton objectif de 3h00min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

🔴 **BUG `formatTime "2h60min"` CONFIRMÉ** dans `feasibility.message` (alors que Romane indique avoir patché le bug aujourd'hui — le plan reste en cache car généré le 18/05 à 06:39 UTC, le patch est probablement postérieur OU appliqué au calcul futur mais pas re-écrit dans Firestore).

**`safetyWarning`** :
> Hydrate-toi bien, échauffe-toi avant chaque séance et accorde-toi un vrai temps de récupération.
>
> ⚠️ DURÉE DU PLAN : 22 semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en 20 semaines maximum. Un plan trop long peut entraîner de la lassitude et une stagnation. Si tu te sens prêt, tu peux envisager de rapprocher ta date de début.

Cohérence statut : ✅ EXCELLENT/100 = juste (PB 3h12 → 3h00 est crédible et bien outillé).

**Verdict §4** : ⚠️ — statut correct mais **message client buggué (2h60min)** → patch live recommandé.

## 5. WELCOMEMESSAGE (593 chars)

> Bienvenue dans ton plan d'entraînement de 22 semaines pour le Marathon ! Ton objectif de terminer en 3h00 est ambitieux et réaliste, parfaitement aligné avec ton niveau de coureur confirmé. Ce programme est structuré pour te faire progresser progressivement, en construisant une base solide d'endurance, puis en développant tes qualités de vitesse et de résistance spécifiques au marathon. Chaque semaine sera un pas de plus vers ton succès le jour J. Nous te recommandons de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport.

| Check doctrine | Statut |
|---|---|
| Mots interdits (poids/IMC/minceur…) | ✅ aucun |
| Titre du plan | "Préparation Marathon en 3h00 — 22 sem." ✅ |
| Bug formatTime `2h60min` dans WM | ✅ OK (n'apparaît que dans `feasibility.message`) |
| Profil sensible (>50 ans ou BMI>30) | non (32 ans, BMI 22.2) — mention médecin tout de même présente ✅ |
| Allures user citées | (aucune) |
| Embellissement plan irréaliste | non (plan réaliste) ✅ |

**Verdict §5** : ✅ RAS.

---

# CLIENT 2 — nabou57@hotmail.fr (Annabelle, Semi 1h45)

## Identité

| Champ | Valeur |
|---|---|
| Email | nabou57@hotmail.fr |
| UID | `Zdxq3nSp88WYjhQ7ghVM4Z51aQA2` |
| Plan ID | `1779085742508` |
| Nom du plan | Préparation Semi-Marathon en 1h45 — 7 sem. |
| Date inscription | 2026-05-18T06:28:25Z |
| Génération plan | 2026-05-18T06:29:02Z |
| Dernière connexion | 2026-05-18T06:31:05Z (3 min après inscription, jamais revenue) |
| isPremium | `false` |
| isPreview | `true` |
| fullPlanGenerated | `false` |
| Sexe / Âge | Femme / 45 ans |
| Poids / Taille / BMI | 51 kg / 160 cm / **19.9** |
| Niveau | Expert (Performance) |
| Goal / SubGoal | Course sur route / Semi-Marathon |
| TargetTime | **1h45** |
| RaceDate | 2026-07-05 (7 sem. — préparation **très courte**) |
| Frequency | 4 séances/sem (3 course + 1 renfo) |
| CurrentWeeklyVolume | 40 km/sem |
| Injuries | aucune |
| RecentRaceTimes | **5km = 23:10 • 10km = 46:54 • Semi = 1h45** |

## 1. ALLURE COHÉRENCE vs OBJECTIF

**VMA estimée** : 13.86 km/h (source : « Moyenne 5km 23:10 et 10km 46:54 »)

| Pace | Valeur |
|---|---|
| efPace | 6:28 |
| eaPace | 5:37 |
| seuilPace | 4:58 |
| vmaPace | 4:20 |
| recoveryPace | 7:13 |
| allureSpécifique5k | 4:33 |
| allureSpécifique10k | 4:49 |
| allureSpécifiqueSemi | **4:59** |
| allureSpécifiqueMarathon | 5:25 |

**Calcul cible** : Semi 21.097 km en 1h45 → **4:59/km = 87.0 % VMA** (attendu 82-90 %) → **✅ COHÉRENT** (pile au centre de la fourchette).

**Comparaison vs PB** : Semi PB = **1h45 → cible = 1h45 (identique)**. La cible est donc d'**égaler son PB en 7 sem.** Cohérent avec son niveau Expert (5k 23:10, 10k 46:54). **Pas de gain demandé** = très faible risque. Le risque principal n'est pas le chrono mais la **brièveté du plan** (7 sem.), ce que le système relève correctement.

**Bug `2h60min`** : ✅ OK.

**Verdict §1** : ✅ COHÉRENT.

## 2. PIC VOLUME — TOUTES LES SEMAINES

```
Sem | Phase           | km   | Δkm   | Δ%    | Flag
────┼─────────────────┼──────┼───────┼───────┼──────────
S 1 | fondamental     |  34  |  --   |  --   |
S 2 | fondamental     |  37  |  +3   |  +9%  |
S 3 | developpement   |  41  |  +4   | +11%  |
S 4 | recuperation    |  32  |  -9   | -22%  | ↓DELOAD
S 5 | specifique      |  37  |  +5   | +16%  |
S 6 | specifique      |  43  |  +6   | +16%  | ★PIC
S 7 | affutage        |  23  | -20   | -47%  |
```

- **Total : 247 km** • Moy 35 km/sem
- **Pic** : **S6 = 43 km/sem** (= 108 % du vol actuel 40 km, faible majoration adaptée à un plan court)
- Saut S0→S1 : 40 → 34 km = **-15 %** ✅
- Max augmentation : **+16 %** (S5→S6) ⚠️ acceptable
- **1 seul deload** (S4) — normal sur 7 sem.
- **Affûtage** : 1 seule semaine (S7=23, 53 % du pic) — court mais cohérent pour 7 sem.

**Verdict §2** : ✅ — pic 43 km très raisonnable, structure 3+1+2+1 adaptée à un plan condensé.

## 3. SL S1

| Jour | Type | Dist | Durée | Pace | Titre |
|---|---|---|---|---|---|
| Lundi | Jogging | 10 km | 1h05 | 6:28 | Footing + lignes droites |
| Mercredi | Renforcement | — | 40-45 min | — | Renfo Focus A S1 |
| Vendredi | Jogging | 11 km | 1h11 | 6:28 | Footing vallonné |
| Dimanche | **Sortie Longue** | **13 km** | **1h24** | 6:28 | SL Endurance Fondamentale |

- Total km course S1 : 34 km ✅
- **SL S1 : 13 km / 1h24 / pace 6:28 (= efPace)**
- **Ratio SL/Vol S1 = 38 %** ⚠️ (cible 25-35 % — **3 pts au-dessus**)
- Ratio SL/Vol actuel = 33 % ✅
- Cohérence Expert : oui, 13 km en EF est trivial pour une coureuse à 40 km/sem.

**Verdict §3** : ⚠️ — ratio SL 38 % légèrement au-dessus, mais pas critique sur un plan court (acceptable car SL doit progresser vite vers 18-20 km dans les semaines suivantes).

## 4. SCORE FAISABILITÉ + MESSAGE

- `feasibility.status` : **BON**
- `feasibility.score` : **(absent)**
- `confidenceScore` : **73**
- Champs : `[status, message, safetyWarning]`

**`feasibility.message`** :
> Avec ta VMA de 13.9 km/h, ton temps théorique sur semi-marathon est d'environ 1h47min. Viser 1h45min est un bel objectif. Avec un entraînement régulier, c'est tout à fait atteignable. Attention : 7 semaines, c'est court pour une préparation semi-marathon. Le plan sera condensé.

✅ Pas de bug formatTime. Message factuel, transparent sur la durée.

**`safetyWarning`** :
> À 45 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

Cohérence statut : ✅ — BON/73 colle (cible = PB → 0 gap, brièveté seule pénalise).

**Verdict §4** : ✅ RAS.

## 5. WELCOMEMESSAGE (709 chars)

> Bonjour ! Ce plan d'entraînement de 7 semaines te guidera vers ton objectif ambitieux de terminer un semi-marathon en 1h45. Avec un score de faisabilité de 73/100, ton profil est très bon pour atteindre cet objectif avec un entraînement structuré et rigoureux. La première semaine est dédiée à la construction de tes fondations aérobies. Le programme est conçu pour être progressif, en respectant ta capacité et en te préparant étape par étape à la distance et à l'allure ciblée. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 45 ans, un bilan cardio-vasculaire est particulièrement conseillé.

| Check doctrine | Statut |
|---|---|
| Mots interdits | ✅ aucun |
| Titre | "Préparation Semi-Marathon en 1h45 — 7 sem." ✅ |
| Bug formatTime | ✅ OK |
| Profil sensible (45 ans) | mention médecin + cardio ✅ |
| Allures user citées | (aucune) |
| Embellissement | non — message factuel, score affiché, brièveté pas occultée ✅ |

**Verdict §5** : ✅ RAS.

---

# CLIENT 3 — arenaarmando@hotmail.com (Armando, Semi 1h20)

## Identité

| Champ | Valeur |
|---|---|
| Email | arenaarmando@hotmail.com |
| UID | `rZwYWXDBJbMDbaRmZ2yAVcSLVED2` |
| Plan ID | `1779071910169` |
| Nom du plan | Préparation Semi-Marathon en 1h20 — 13 sem. |
| Date inscription | 2026-05-18T02:37:49Z |
| Génération plan | 2026-05-18T02:38:30Z |
| Dernière connexion | 2026-05-18T03:21:14Z (43 min après, est revenu 1 fois) |
| isPremium | `false` |
| isPreview | `true` |
| fullPlanGenerated | `false` |
| Sexe / Âge | Homme / 48 ans |
| Poids / Taille / BMI | 74 kg / 182 cm / **22.3** |
| Niveau | Expert (Performance) |
| Goal / SubGoal | Course sur route / Semi-Marathon |
| TargetTime | **1h20** |
| RaceDate | 2026-08-15 (13 sem.) |
| Frequency | 6 séances/sem (5 course + 1 renfo) |
| CurrentWeeklyVolume | 80 km/sem |
| Injuries | aucune |
| RecentRaceTimes | **10km = 37:00 • Semi = 1h20** |

## 1. ALLURE COHÉRENCE vs OBJECTIF

**VMA estimée** : 18.26 km/h (source : « Moyenne 10km 37min et Semi 1h20 »)

| Pace | Valeur |
|---|---|
| efPace | 4:54 |
| eaPace | 4:16 |
| seuilPace | 3:47 |
| vmaPace | 3:17 |
| recoveryPace | 5:29 |
| allureSpécifique5k | 3:28 |
| allureSpécifique10k | 3:39 |
| allureSpécifiqueSemi | **3:47** |
| allureSpécifiqueMarathon | 4:06 |

**Calcul cible** : Semi 21.097 km en 1h20 → **3:48/km = 86.7 % VMA** (attendu 82-90 %) → **✅ COHÉRENT**.

**Comparaison vs PB** : Semi PB = **1h20 → cible = 1h20 (égalisation)**. Le 10km 37:00 est compatible (équivalent semi théorique 1h22). Cible = égaler son PB en 13 sem. avec un volume de 80 km/sem soutenu → ✅.

**Bug `2h60min`** : ✅ OK.

**Verdict §1** : ✅ COHÉRENT — Expert très bien outillé, paces nickel.

## 2. PIC VOLUME — TOUTES LES SEMAINES

```
Sem | Phase           | km   | Δkm   | Δ%    | Flag
────┼─────────────────┼──────┼───────┼───────┼──────────
S 1 | fondamental     |  68  |  --   |  --   |
S 2 | fondamental     |  75  |  +7   | +10%  |
S 3 | fondamental     |  80  |  +5   |  +7%  | ★PIC
S 4 | recuperation    |  64  | -16   | -20%  | ↓DELOAD
S 5 | developpement   |  74  | +10   | +16%  |
S 6 | developpement   |  76  |  +2   |  +3%  |
S 7 | developpement   |  80  |  +4   |  +5%  |
S 8 | recuperation    |  64  | -16   | -20%  | ↓DELOAD
S 9 | specifique      |  74  | +10   | +16%  |
S10 | specifique      |  76  |  +2   |  +3%  |
S11 | affutage        |  53  | -23   | -30%  |
S12 | affutage        |  47  |  -6   | -11%  |
S13 | affutage        |  40  |  -7   | -15%  |
```

- **Total : 871 km** • Moy 67 km/sem
- **Pic** : **S3 = 80 km/sem** (= 100 % du vol actuel — pas de surcharge)
- Saut S0→S1 : 80 → 68 km = **-15 %** ✅
- Max augmentation : **+16 %** (S4→S5) ⚠️ acceptable
- Decloads : S4, S8 (cycle 3+1 puis 3+1)
- **Affûtage** : 3 semaines bien graduées (S11=53, S12=47, S13=40 = 66/59/50 % du pic) ✅

⚠️ **Point d'attention** : le pic à 80 km/sem = exactement le volume actuel de l'utilisateur. Pour un Expert qui vise un sub-1h20 et tient déjà 80 km/sem confortablement, le plan ne propose **aucune augmentation de volume** — il consolide. C'est défendable pour un athlète qui a déjà sa structure, mais on aurait pu attendre un pic 85-90 km pour un Semi sub-1h20 préparé en 13 sem.

**Verdict §2** : ✅ acceptable (pic = 100 % vol actuel, conservateur mais cohérent avec un Expert qui n'a pas besoin de plus).

## 3. SL S1

| Jour | Type | Dist | Durée | Pace | Titre |
|---|---|---|---|---|---|
| Lundi | Jogging | 9 km | 45 min | 4:54 | Footing progressif (negative split) |
| Mardi | Jogging | 10.3 km | 49 min | 4:54 | Footing vallonné |
| Mercredi | Renforcement | — | 40-45 min | — | Renfo Focus A S1 |
| Jeudi | Jogging | 9.9 km | 49 min | 4:54 | Footing progressif |
| Vendredi | Jogging | 9.9 km | 49 min | 4:54 | Footing endurance fondamentale |
| Dimanche | **Sortie Longue** | **21 km** | **1h43** | 4:54 | SL endurance fondamentale |

- Total km course S1 : 60.1 km ✅
- **SL S1 : 21 km / 1h43 / pace 4:54 (= efPace)**
- **Ratio SL/Vol S1 = 31 %** ✅ (cible 25-35 %)
- Ratio SL/Vol actuel = 26 % ✅
- Cohérence Expert 80 km/sem : ✅ parfait.

**Verdict §3** : ✅ EXCELLENT.

## 4. SCORE FAISABILITÉ + MESSAGE

- `feasibility.status` : **EXCELLENT**
- `feasibility.score` : (absent)
- `confidenceScore` : **94**

**`feasibility.message`** :
> Avec ta VMA de 18.3 km/h, ton temps théorique sur semi-marathon est d'environ 1h22min. Ton objectif de 1h20min est cohérent avec ton niveau. C'est un plan réaliste et bien calibré.

✅ Pas de bug. Cohérent.

**`safetyWarning`** :
> À 48 ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.

**Verdict §4** : ✅ RAS.

## 5. WELCOMEMESSAGE (845 chars)

> Félicitations pour ton engagement dans la préparation de ce Semi-Marathon avec un objectif ambitieux de 1h20 ! Ce programme de 13 semaines est conçu pour t'aider à atteindre cet objectif en construisant une base solide et en développant progressivement tes qualités spécifiques.
>
> La première phase, dite 'fondamentale', se concentrera sur le développement de ton endurance aérobie, la consolidation de ton volume hebdomadaire et le renforcement musculaire, sans travail intense de vitesse en début de programme. Nous privilégierons la régularité et l'écoute de tes sensations pour une progression saine et durable.
>
> Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 48 ans, un bilan cardio-vasculaire est particulièrement conseillé.

| Check doctrine | Statut |
|---|---|
| Mots interdits | ✅ aucun |
| Titre | "Préparation Semi-Marathon en 1h20 — 13 sem." ✅ |
| Bug formatTime | ✅ OK |
| Profil sensible (48 ans) | mention médecin + cardio ✅ |
| Allures user citées | (aucune) |
| Embellissement | non ✅ |

**Verdict §5** : ✅ RAS.

---

# CLIENT 4 — sebastien.sailly@outlook.fr (Sébastien, 10 km Finisher)

## Identité

| Champ | Valeur |
|---|---|
| Email | sebastien.sailly@outlook.fr |
| UID | `jZ8E7E1beJeO9GdDAYM6gYwMdVN2` |
| Plan ID | `1779099564353` (seul plan — preview, plus récent) |
| Nom du plan | Préparation 10 km — Finisher — 7 sem. |
| Date inscription | 2026-05-18T10:18:34Z (**aujourd'hui**, ajouté par Romane) |
| Génération plan | 2026-05-18T10:19:24Z |
| Dernière connexion | 2026-05-18T10:20:51Z |
| isPremium | `false` |
| isPreview | `true` |
| fullPlanGenerated | `false` |
| Sexe / Âge | Homme / 45 ans |
| Poids / Taille / **BMI** | 130 kg / 180 cm / **40.1** 🔴 obésité morbide |
| Niveau | Débutant (0-1 an) |
| Goal / SubGoal | Course sur route / 10 km |
| TargetTime | **Finisher** |
| RaceDate | 2026-06-30 (**7 sem.** seulement) |
| Frequency | **2 séances/sem** (1 course + 1 renfo — fréquence minimale) |
| CurrentWeeklyVolume | 5 km/sem |
| Injuries | aucune |
| RecentRaceTimes | **10km = 1h30** (déclaré) |

## 1. ALLURE COHÉRENCE vs OBJECTIF

**VMA estimée** : **8.00 km/h** (source : « 10km en 1h30 (corrigé) »)

| Pace | Valeur |
|---|---|
| efPace | 11:12 |
| eaPace | 9:44 |
| seuilPace | 8:37 |
| vmaPace | 7:30 |
| recoveryPace | 12:30 |
| allureSpécifique5k | 7:54 |
| allureSpécifique10k | 8:20 |
| allureSpécifiqueSemi | 8:49 |
| allureSpécifiqueMarathon | 9:23 |

**Note source VMA** : « (corrigé) » → suggère un cap minimum appliqué (VMA brute issue d'un 10km 1h30 = 6.67 km/h → relevée à 8.0 par garde-fou). À vérifier dans le code.

**Cible Finisher** : pas de chrono → analyse % VMA n/a. La cible « finisher » est juste : un BMI 40 + débutant 5km/sem ne peut viser que **terminer** en marche/course.

**Bug `2h60min`** : ✅ OK.

**Verdict §1** : ✅ — paces calibrées sur une VMA volontairement relevée à 8 (cap minimum), cohérent avec niveau Débutant pure.

## 2. PIC VOLUME — TOUTES LES SEMAINES

```
Sem | Phase           | km   | Δkm   | Δ%    | Flag
────┼─────────────────┼──────┼───────┼───────┼──────────
S 1 | fondamental     |   4  |  --   |  --   |
S 2 | fondamental     |   4  |   0   |   0%  |
S 3 | developpement   |   5  |  +1   | +25%  |
S 4 | recuperation    |   4  |  -1   | -20%  | ↓DELOAD
S 5 | specifique      |   5  |  +1   | +25%  |
S 6 | specifique      |   6  |  +1   | +20%  | ★PIC
S 7 | affutage        |   3  |  -3   | -50%  |
```

- **Total : 31 km** • Moy 4.4 km/sem
- **Pic** : **S6 = 6 km/sem** (au-dessus du vol actuel 5 km → +20 %)
- Saut S0→S1 : 5 → 4 km = -20 % ✅ (entrée très douce)
- Max augmentation : **+25 %** (S2→S3 et S5→S6) — ❌ flag du script mais **en valeur absolue +1 km c'est trivial**, le % est trompeur sur de très petits volumes
- 1 deload S4
- Affûtage S7 = 3 km = 50 % du pic ✅

**Verdict §2** : ✅ — sur des volumes aussi faibles le % n'est pas l'indicateur clé. La progression +1 km/sem est conservative et adaptée à un BMI 40.

## 3. SL S1

| Jour | Type | Dist | Durée | Pace | Titre |
|---|---|---|---|---|---|
| Vendredi | Renforcement | — | 30 min | N/A | Renfo Focus A S1 |
| Dimanche | **Sortie Longue** | **3.8 km** | **1h00** | EF 11:12 (course) / 12:30 (marche) | **Première séance Marche/Course en aisance** |

- Total km course S1 : **3.8 km** (1 seule séance de course !)
- **SL S1 : 3.8 km / 1h00 / marche-course alternée**
- **Ratio SL/Vol S1 = 95 %** ❌ (la SL **EST** la totalité du volume course)
- Ratio SL/Vol actuel = 76 % ❌
- ✅ **Mode marche-course bien activé** (conforme à la doctrine « mode marche-course = débutants uniquement »)

⚠️ **Point structurel** : avec **frequency=2** dont 1 renfo, il ne reste qu'**1 séance de course par semaine**, qui est de facto la SL. Le ratio SL/vol n'a donc plus de sens. La vraie question est : **est-ce suffisant pour préparer un 10 km en 7 sem.** ? Réponse : honnêtement, 1 séance de course/semaine + BMI 40 + 7 sem. → **objectif "finisher" 10 km très juste**. Le système l'a quand même validé en BON/70.

**Verdict §3** : ⚠️ — le ratio est trompeur. Le vrai sujet est la **fréquence à 2** (1 renfo + 1 course) qui rend le plan limite pour préparer un 10 km, même en finisher. Romane voudra probablement ajuster.

## 4. SCORE FAISABILITÉ + MESSAGE

- `feasibility.status` : **BON**
- `confidenceScore` : **70**

**`feasibility.message`** (525 chars) :
> Ton objectif de finisher sur ce 10km est tout à fait atteignable. Avec ta VMA de 8.0 km/h, concentre-toi sur la régularité. Ton profil actuel impose une vigilance articulaire renforcée — consulte un médecin avant de démarrer, privilégie surfaces souples (herbe, terre, chemin) et chaussures avec amorti maximal. Ton volume actuel (5 km/sem) est en dessous du minimum pour ton niveau (8 km/sem) — le plan démarrera légèrement au-dessus. Point positif : ton volume actuel de 5km/sem est une excellente base pour cette distance.

🔴 **INCOHÉRENCE INTERNE** dans le message :
- Phrase 4 : « ton volume actuel (5 km/sem) est **en dessous du minimum** » → puis dit que le plan démarrera **au-dessus** (or wv[0]=4 km, c'est **en dessous**)
- Phrase 5 : « ton volume actuel de 5km/sem est une **excellente base** pour cette distance »
→ Les deux dernières phrases se contredisent (« en dessous du minimum » + « excellente base »). Bug rédactionnel à patcher.

✅ Mention médecin/surfaces souples/amorti = ✅ conforme doctrine sécurité.
✅ Pas de bug formatTime.
❌ Aucune mention que le **BMI 40 est facteur cardiovasculaire majeur**.

**`safetyWarning`** :
> AVIS MÉDICAL OBLIGATOIRE : à 45 ans, avec un démarrage débutant, consulte impérativement ton médecin pour un test d'effort avant de commencer. Démarre très progressivement en alternant marche et course.

✅ « AVIS MÉDICAL OBLIGATOIRE » bien escaladé. Mais **manque mention spécifique IMC/cardio** alors que BMI 40 est plus alarmant que les 45 ans.

Cohérence statut : ⚠️ — **BON/70** pour un BMI 40 + 5 km/sem visant un 10 km en 7 sem. me paraît **généreux** — un statut AMBITIEUX aurait été plus prudent. Le plan tient parce que la cible est « finisher », mais le profil reste à haut risque articulaire/cardio.

**Verdict §4** : ⚠️ — message contradictoire + statut un peu optimiste pour le profil.

## 5. WELCOMEMESSAGE (1027 chars)

> ⚠️ Avant de commencer ce programme, il est INDISPENSABLE de consulter ton médecin pour obtenir un certificat médical d'aptitude à la pratique de la course à pied. À partir de 45 ans et avec ton profil, un bilan cardio-vasculaire (test d'effort) est fortement recommandé. Ta santé est notre priorité absolue — ce plan est conçu pour t'accompagner en toute sécurité, mais seul un médecin peut confirmer que tu es apte à démarrer.
>
> Félicitations pour ton engagement à relever le défi des 10 km ! Ce plan est spécialement conçu pour te permettre d'atteindre ton objectif de finisher en toute confiance et sans pression de performance. Nous allons nous concentrer sur la construction de ton endurance fondamentale, la régularité et une progression douce pour habituer ton corps à l'effort. Ce programme de 7 semaines privilégiera l'écoute de ton corps et l'adoption d'une foulée confortable. Assure-toi également de porter des chaussures de course avec un amorti maximal pour protéger tes articulations dès le début de ton parcours.

| Check doctrine | Statut |
|---|---|
| Mots interdits (poids/IMC/minceur…) | ✅ aucun (parfaitement respecté malgré BMI 40) |
| Titre | "Préparation 10 km — Finisher — 7 sem." ✅ |
| Bug formatTime | ✅ OK |
| Profil sensible (BMI 40 + 45 ans) | ✅ message INDISPENSABLE + bilan cardio + amorti maximal — **excellent message préventif** |
| Embellissement | ✅ pas d'embellissement, ton transparent |
| Allures user citées | (aucune) |

**Verdict §5** : ✅ EXEMPLAIRE — le WM ouvre par un disclaimer santé majuscule, sans mentionner « poids »/« IMC » mais en couvrant le risque articulaire et cardio.

---

# SYNTHÈSE GLOBALE

## Bugs récurrents détectés

| Bug | Plans touchés | Sévérité | Détail |
|---|---|---|---|
| **`formatTime "2h60min"`** | 1/4 (Antoine) | 🔴 P0 client-facing | `feasibility.message` affiche « temps théorique sur marathon est d'environ **2h60min** » au lieu de « 3h00 ». Bug arithmétique : 180 min affiché comme 2h60 au lieu de 3h00 par fonction de formatage time. Le fix mentionné dans la mémoire (« FIXÉ aujourd'hui ») n'est **pas répercuté** dans le plan déjà stocké en Firestore (généré le 18/05 à 06:39 UTC). |
| **Message faisabilité contradictoire** | 1/4 (Sébastien) | 🟡 P1 | Message dit « volume actuel en dessous du minimum » + « excellente base » dans la même phrase → contradiction. À revoir dans le prompt feasibility.message. |
| **Mention BMI/cardio absente du safetyWarning** | 1/4 (Sébastien BMI 40) | 🟡 P1 doctrine | Le `safetyWarning` mentionne âge mais pas le facteur BMI 40 (qui est plus critique). Le WM le compense bien, donc impact limité. |
| **Champ `feasibility.score` absent** | 4/4 | 🟢 P3 cosmétique | Tous les docs n'ont que `[status, message, safetyWarning]` côté `feasibility` — le score est dans `confidenceScore` au niveau du plan. Soit normaliser, soit documenter. |
| **Ratio SL/Vol > 35 %** | 2/4 (Antoine 35 %, Annabelle 38 %) | 🟢 P3 | Limite haute mais acceptable pour Expert. Pas critique. |

## Patches code à prévoir

| Patch | Fichier (à confirmer) | Détail |
|---|---|---|
| **P0 — Re-générer plans déjà émis avec `2h60min`** | script ad-hoc | Audit ciblé sur `feasibility.message` matching regex `/\d+h\s*60(min)?/` pour identifier les plans à patcher live (re-render message uniquement, ne pas régénérer le plan). |
| **P1 — Fix prompt feasibility.message** | `src/services/feasibility*.ts` | Pour les profils où `currentVolume < minVolumeForLevel`, ne pas dire « excellente base » après avoir dit « en dessous du minimum ». Logique mutuellement exclusive à mettre. |
| **P1 — safetyWarning BMI** | `src/services/safety*.ts` | Ajouter branche : `if (bmi > 30) safetyWarning += ' Ton IMC actuel impose un avis cardio et articulaire avant tout effort.'`. |

## Action recommandée par client

| Client | Action |
|---|---|
| **Antoine** (Marathon 3h00) | 🔴 **Patch live `feasibility.message`** uniquement : remplacer « 2h60min » par « 3h00 ». Le plan en soi est ✅. À faire avant qu'il ne convertisse premium et lise le message. |
| **Annabelle** (Semi 1h45) | ✅ **RAS**. Plan cohérent, cible = PB donc 0 risque chrono, juste plan court (7 sem.) bien communiqué. |
| **Armando** (Semi 1h20) | ✅ **RAS**. Plan exemplaire. Pic 80 km = vol actuel — discutable mais défendable pour Expert. |
| **Sébastien** (10 km finisher, BMI 40) | 🟡 **Patch live `feasibility.message`** : supprimer contradiction « en dessous du minimum » / « excellente base ». Optionnel : enrichir `safetyWarning` avec mention BMI. Le plan en soi (fréquence 2 / 1 course) reste limite — Romane jugera si elle souhaite suggérer une fréquence 3. |

## Notes méthodo

- **Sébastien** : 1 seul plan trouvé (preview du jour, jamais converti en full). C'est bien le plus récent.
- **Aucun client n'est premium** (4/4 en preview). Aucun `fullPlanGenerated=true`.
- Aucune blessure déclarée pour les 4 clients.
- 3 des 4 clients ne se sont **pas reconnectés** après inscription — opportunité d'observation : si Antoine voit le « 2h60min », risque d'abandon. À patcher rapidement.

---

**Fin de l'audit. Aucune modification Firestore effectuée. Aucun contact client.**
