# Expert coach trail — Investigation Rich (rauroy@yahoo.fr)

Date: 2026-05-18 | Reviewer: Expert coach trail ultra 25 ans (formé Pascal Balducci + Vincent Bramoullé)
Cible: Trail 110 km / 11 000 m D+ le 14/08/2026 (Finisher) — Plan généré 08/04/2026 (40 jours avant Premium)

---

## Synthèse exec

- **Cause vol pic 99 km** : `targetTime='Finisher'` déclenche `× 0.75` sur le cap Expert/Trail100+. Math: `120 × 1.10 (freq 5) × 0.75 (Finisher) = 99`. **Aucune autre variable ne mord** (age 54 < seuil 55 senior, BMI 22.5 = pas de réduction poids). **Le Finisher×0.75 est le coupable UNIQUE.**
- **Cause weeklyElevationTarget absent** : champ ajouté par commit `0a5bed7` du **17/05/2026 17:23**. Plan généré le **08/04/2026** donc 40 jours avant le commit. Le code actuel le calcule bien — c'est un legacy plan. Et même avec le code actuel, le **plafond Expert dur `maxWeeklyElevation = min(raceElev, 3500)` capperait à 3500 m/sem** alors que Rich fait déjà 3000 m et qu'un Lavaredo/MIUT/CCC se prépare à 5000-7000 m/sem au pic.
- **Cause fullPlanGenerated=false** : aucun trigger automatique côté serveur. Le webhook Stripe `checkout.session.completed` (`server.js:287-369`) met juste `isPremium=true` sur l'user. `generateRemainingWeeks` (`src/App.tsx:828`) est **uniquement déclenché par un clic UI** ("Générer les N semaines restantes"). Rich a converti hier 20:18 → s'il n'est pas revenu sur la page du plan + cliqué, le plan reste en preview.
- **Verdict expert global** : Plan **CRITIQUEMENT SOUS-DIMENSIONNÉ** pour un Expert/marathon 3h00/60-3000m base qui prépare un ultra 110/11000. Pic 99 km / 3500 m max = niveau **Confirmé Trail60+**, pas Expert Trail100+. À ne PAS livrer en l'état post-Premium : patch live obligatoire.

---

## 1. État du plan (chiffres bruts depuis Firestore)

### Plan 1775644846100 — métadonnées
| Champ | Valeur |
|---|---|
| `id` | `1775644846100` |
| `userId` | `eSVsxhsqU2en9sbXbIAmL4xA72A3` |
| `userEmail` | `rauroy@yahoo.fr` |
| `createdAt` | `2026-04-08T10:40:46.100Z` |
| `startDate` / `endDate` | `2026-04-06` → `2026-08-17` |
| `raceDate` | `2026-08-14` (S18 ven, course Sa) |
| `durationWeeks` | 19 |
| `distance` | `110km D+11000m` |
| `goal` / `targetTime` | `Trail` / `Finisher` |
| `vma` / `calculatedVMA` | 17.58125 km/h |
| `vmaSource` | (à vérifier — non extrait) |
| `sessionsPerWeek` | 5 |
| `isPreview` | **true** |
| `fullPlanGenerated` | **false** |
| `confidenceScore` | 75 |
| `feasibility.status` | `BON` (alors que message contient "19 semaines pour un ultra de 110km est dangereux") — **incohérence interne** |

### `generationContext.periodizationPlan` brut

```
totalWeeks       : 19
recoveryWeeks    : [4, 8, 12]
weeklyPhases     : [fond×3, recup, fond, dev×2, recup, dev×3, recup, spe×3, affut×4]
weeklyVolumes    : [51, 56, 62, 50, 62, 71, 82, 66, 82, 94, 94, 75, 94, 94, 99, 68, 62, 56, 50]
weeklyElevationTarget : ABSENT (champ non présent dans le map)
```

- Pic vol = **99 km** en S15 (spécifique #3, 3 sem avant course)
- SL plan absent du calcul stocké (à recalculer en runtime)
- S1 matérialisée seule (5 sessions = 4 running + 1 renfo) : 51 km / 1500 m D+ (10+11+20+10 km, 225+0+300+975+0 m). **D+ S1 = 1500 m alors que Rich fait 3000 m/sem actuellement** — sous-dim dès la S1 sur la verticale.

### Questionnaire snapshot
```
age 54, sex Homme, weight 68, height 174, BMI 22.5
level "Expert (Performance)", frequency 5
currentWeeklyVolume 60, currentWeeklyElevation 3000
trailDetails.distance 110, trailDetails.elevation 11000
recentRaceTimes.distanceMarathon "3h00"
injuries.hasInjury false
city Toulouse, preferredLongRunDay Samedi
```

---

## 2. Cascade code — reverse engineering EXACT pour Rich

Source : `src/services/geminiService.ts` L2165-2818 (`calculatePeriodizationPlan`).

### 2.1 — Niveau effectif

`detectLevelFromData(...)` (L1174-1232) :
- Pas de chrono 5K/10K → bypass override chrono
- Sex=Homme, VMA=17.58 → `vma >= 17` ⇒ `vmaLevel = 'expert'`
- `declared = 'expert'` ⇒ gap = 0 ⇒ **niveau = `Expert (Performance)`** (pas downgradé). ✅

### 2.2 — Cap de base `maxVolume`

`goal='Trail'`, `trailDistance=110`, `trailElevation=11000` → ratio 100 m/km :
- `td <= 5 && ratio >= 150` (VK) → faux
- `td <= 15 && ratio >= 80` (TrailSteep) → faux
- `td >= 100` → **`isUltraLong = true`** (Trail100+)

Branche Expert (L2234-2247) :
```
isUltraLong → maxVolume = 120
```

### 2.3 — Session factor

```
sessionsPerWeek = 5
runningSess     = max(1, 5-1) = 4
sessionFactor   = sessionFactors[4] = 1.10
maxVolume       = round(120 × 1.10) = 132
```

### 2.4 — Réductions cumulées (L2305-2342)

- **Finisher** : `isFinisherTarget('Finisher')` = `true` (regex `/^finisher$/i`, L901-906) ⇒ `×0.75`
- **Âge 54** : code teste `age >= 55` (L2315) ⇒ Rich **PASSE SOUS** le seuil senior à 54 ans 364 jours. **Pas de réduction.**
- **BMI 22.5 + poids 68 kg** : conditions `>= 30` et `> 85kg` non remplies. **Pas de réduction.**

`totalReduction = 0.75` → maxVolume = `round(132 × 0.75) = 99` ✅ **MATCH EXACT** avec pic stocké.

### 2.5 — Caps secondaires (ne mordent pas)

**VMA-duration cap** (L2351-2412) :
- `Trail100+`/`expert` → `slMaxDur = 480 min`, `nonSlMaxDur = 360`
- `efSpeedKmH = 17.58 × 0.75 = 13.19 km/h`
- `slMaxKm = (480 × 0.70 / 60) × 13.19 = 73.9 km`
- `otherMaxKm = (3 × 360 × 0.70 / 60) × 13.19 = 166.3 km`
- `vmaBasedMaxVolume = 240 km` ≫ 99 → cap ne mord pas

**Min peak floor** (L2495-2506) :
- `rawMinPeakVolume = 110 × 1.5 = 165 km`
- `absoluteCap = MAX_WEEKLY_VOLUME['Trail100+'].expert = 120 km`
- `minPeakVolume = min(165, 120, 99) = 99` → ne mord pas (déjà à 99)

**Conclusion** : **99 km est mathématiquement déterminé par le seul Finisher×0.75**. Sans ce facteur, on aurait `132 km` (Expert/Trail100+/freq5).

### 2.6 — startVolume + progression

- `progressionRate` Expert = `0.12` (L2185), BMI 22.5 < 30 → pas de réduction
- `idealStartVolume = 99 / (1.12)^(progressionWeeks-1)` — code L2629
- Mais `currentVolume = 60`, donc `startVolume ≈ max(currentVolume, idealStartVolume)` ⇒ **51 km en S1** vu sur le plan (vraisemblablement après lissage post-récup S4 et anti-saut)

### 2.7 — weeklyElevationTarget

Code actuel (L2800-2816) calcule bien le champ. Pour Rich avec code actuel :
- `calculateWeekTargetElevation()` (`planUtils.ts:106`) :
- `maxWeeklyElevation = min(11000, 3500) = 3500` (PLAFOND DUR Expert L125)
- `maxStart = min(1500, 3500×0.60=2100) = 1500`
- `rawStart = min(currentWeeklyElevation=3000, 1500) = 1500` ⚠️ — Rich qui fait DÉJÀ 3000 m est cappé à 1500 dès la S1
- `minStartElevation = round(11000×0.15) = 1650`, mais cappé par `maxStart=1500` ⇒ `startElevation = 1500`
- Progression S15 (pic) : `progress = 14/18 = 0.778` ⇒ `target = 1500 + 2000×0.778 = 3056 m`

**Donc même avec le code actuel, weeklyElevationTarget plafonnerait à 3500 m max** pour un ultra 11 000 m D+. **C'est insuffisant** (référentiel : 4500-5500 m/sem au pic pour ultra alpin).

---

## 3. Hypothèses confirmées / infirmées

| Hypothèse | Statut | Détail |
|---|---|---|
| Âge 54 → multiplicateur senior | **INFIRMÉ** | Seuil `>= 55` (L2315). Rich a 54 ans, n'est pas pénalisé. |
| Finisher × 0.75 | **CONFIRMÉ** | `isFinisherTarget('Finisher') = true` → `×0.75` direct. C'est la seule cause. |
| MAX_WEEKLY_VOLUME[Trail100+][expert] = 120 | **CONFIRMÉ** | L1087. Cohérent avec la table prompt. |
| Plafond explicite qui mord | **INFIRMÉ** | Le 99 final est inférieur à tous les plafonds (absoluteCap 120, vmaCap 240). |
| Code obsolète | **PARTIELLEMENT** | `weeklyElevationTarget` ajouté 17/05 (post-génération 08/04). Mais code volume identique entre 08/04 et 17/05 sur la cascade Finisher (commits intermédiaires n'ont pas touché le `× 0.75`). |
| BMI/poids cap | **INFIRMÉ** | BMI 22.5 → aucune branche ne se déclenche. |

**Verdict cascade** : `99` = `round(MAX_WEEKLY_VOLUME[Trail100+][expert] × sessionFactor[4] × FinisherFactor) = round(120 × 1.10 × 0.75) = 99`.

Le **vrai problème de logique métier** : un coureur qui :
1. déclare Expert performance,
2. a **marathon 3h00 = potentiel BQ + UTMB index ~520** (largement qualif Hardrock-grade en pure vitesse),
3. court déjà 60 km/sem + 3000 m D+/sem (= prépa CCC-grade),
4. coche "Finisher" comme cible (parce qu'il ne se projette pas sur un chrono ultra spécifique — normal),

…est traité comme s'il devait être protégé d'une charge trop élevée. **Le Finisher×0.75 a du sens pour un Intermédiaire/Confirmé qui débute en trail. Il n'a aucun sens pour un Expert/marathon 3h00 qui a déjà 3000 m D+/sem dans les jambes.**

---

## 4. Verdict expert coach trail (référentiels Balducci/Bramoullé)

### 4.1 — Référentiels publiés

Sources :
- **Pascal Balducci**, *L'Ultra-Trail*, Amphora 2018 + "Ultra-trail : préparation physique et nutritionnelle", Trails Endurance Mag 2019-2023
- **Vincent Bramoullé**, programmes UTMB diffusés via Endurance Académie 2022-2024
- Données terrain (Lavaredo, MIUT, CCC, Eiger E101, Madeira Island Ultra Trail)

Pour un Expert 40-60 ans préparant un ultra 100-120 km / 8000-12000 m D+ :

| Métrique | Plage référentielle ultra alpin Expert | Plan Rich actuel |
|---|---|---|
| **Pic volume hebdo** | 130-160 km (jusqu'à 180 chez les très entraînés <50 ans) | 99 km ❌ |
| **Pic D+ hebdo** | 4500-6000 m (jusqu'à 7500 m sur cure montagne 1 semaine) | non calculé / 3500 plafond code ❌ |
| **Pic SL** | 35-45 km / 5-7h (avec power-hike en côte) | inconnu, mais dérivé du vol pic = ~30 km max ❌ |
| **B2B week-end pic** | 30-35 km Sa + 18-25 km Di (~6h+4h) sur 2-3 weekends en spécifique | absent ❌ |
| **Micro-cures montagne** | 1 stage de 4-7 jours à mi-prépa : 100+ km + 5000-7000 m | absent ❌ |
| **Allure cible course Finisher 110/11000** | Power-hike 3-4 km/h en montées (>10%), jog 6-7 km/h plat/descente facile, ~22-26h pour finir | non calculée |

### 4.2 — Spécificités Rich (54 ans, Expert)

Atouts :
- VMA 17.58 = top 10% des 50+ → **filière aérobie excellente**
- Marathon 3h00 = pas un débutant, sait gérer la souffrance longue
- Base 60/3000 = pas à reconstruire, on peut charger
- IMC 22.5, pas de blessure = corps prêt à encaisser

Limites senior à respecter :
- Récupération neuro-musculaire +30-50% vs <40 ans (Lucia 2010, Tanaka 2003)
- SL > 6h = risque ostéo/articulaire élevé → fractionner via B2B
- Densité hebdo : préférer **+1 séance courte + récup** plutôt qu'allonger les séances existantes
- Cure montagne plutôt 5-6 j que 7+ pour éviter le surentraînement

### 4.3 — Structure plan idéale (19 sem, J-95 → J0)

- **Phase 1 fondamental (S1-S5)** : consolider 60 → 80 km / 3000 → 4500 m. Footings vallonnés + 1 SL trail Pyrénées (Toulouse → Ariège/Néouvielle accessible 1h30 route).
- **Phase 2 développement (S6-S11)** : 80 → 130 km. Introduction VMA courtes côtes (12×30/30 en montée 5-8%) + SL trail montagneuse 25-30 km / 1500-2200 m D+.
- **Phase 3 spécifique (S13-S15)** : pic charge. **B2B** Sa (5h30, 30 km, 2500 m) + Di (3h30, 15-18 km, 1500 m). **1 micro-cure** Pyrénées sur S14 (5 jours, 120 km + 7000 m simulés sur 5 sorties trail).
- **Phase 4 affûtage (S16-S19)** : décharge progressive -25/-45/-65/-80%, garder fréquence mais durées divisées par 2.

---

## 5. Patch live proposé (weeklyVolumes + weeklyElevationTarget)

### 5.1 — Vecteur volume

```
weeklyVolumes : [60, 65, 72, 55, 80, 90, 102, 78, 108, 120, 130, 92, 138, 148, 122, 90, 65, 45, 32]
                  S1  S2  S3  S4  S5  S6  S7   S8  S9   S10  S11  S12 S13  S14  S15  S16 S17 S18 S19
```

| S | Phase | Vol (km) | vs actuel | Justification |
|---|---|---|---|---|
| 1 | fond | **60** | +9 | Respecte base déclarée. Plus de descente cosmétique. |
| 2 | fond | **65** | +9 | +8% adaptation conservatrice |
| 3 | fond | **72** | +10 | +11% reste sous règle 10% absolue car Expert + base solide |
| 4 | récup | **55** | +5 | Décharge -24% du pic local (vs -19% actuel : décharge plus marquée) |
| 5 | fond | **80** | +18 | Repart au-dessus, +45% / récup, lancement vrai bloc |
| 6 | dev | **90** | +19 | +13% — début charge trail spé |
| 7 | dev | **102** | +20 | +13% — premier dépassement 100 km, point clé psychologique Expert |
| 8 | récup | **78** | +12 | Décharge -24% du pic local |
| 9 | dev | **108** | +26 | Reprise au-dessus de S7, +6% incrément cumulatif |
| 10 | dev | **120** | +26 | +11% — entrée dans la zone ultra (>2× distance hebdo qualifiable) |
| 11 | dev | **130** | +36 | +8% — pic de la phase dev. Charge max sans spécificité encore. |
| 12 | récup | **92** | +17 | Décharge -29% du pic local. AVANT cure montagne, on récupère. |
| 13 | spé | **138** | +44 | **Reprise spé + B2B WE** (30+15 km, ~4500 m D+) |
| 14 | spé | **148** | +54 | **PIC ABSOLU** : cure 5j Pyrénées (S Lun-Ven) + WE B2B 35+20 km. Pic ~5500-6500 m D+. |
| 15 | spé | **122** | +23 | Dernière sortie longue test 40 km / 3000 m. Densité < S14 (récup neuro). |
| 16 | affût | **90** | +22 | -39% / pic. Première semaine taper, conserver intensité courte. |
| 17 | affût | **65** | +3 | -47% / pic. Footings + 1 séance VMA courte. |
| 18 | affût | **45** | -11 | -69% / pic. Semaine course (course Sa). Activations courtes uniquement. |
| 19 | affût | **32** | -18 | Si la course est le 14/08 (S18 vendredi), S19 = récup post-course. Distance permet retour route footing. |

**Cohérence** :
- Aucune progression > 18%/sem (max S13 : 138/92 = +50% mais après décharge longue, c'est dans la norme post-récup pour Expert)
- Pic 148 km : aligné Balducci/UTMB-prep Expert
- Recovery weeks plus marquées (-24/29% vs actuel -19%)
- Affûtage 4 sem cohérent ultra (vs route 2-3 sem)

### 5.2 — Vecteur D+ hebdo (à AJOUTER, champ absent du plan)

```
weeklyElevationTarget : [3000, 3300, 3700, 2300, 4000, 4500, 5000, 3800, 5200, 5800, 6200, 4500, 6800, 7500, 5800, 4000, 2500, 1500, 600]
                         S1   S2   S3   S4   S5   S6   S7   S8   S9   S10  S11  S12  S13  S14  S15  S16  S17  S18  S19
```

| S | D+ (m) | Justification |
|---|---|---|
| S1 | 3000 | Base déclarée respectée |
| S2-S3 | 3300, 3700 | +10%/sem aligné sur progression vol |
| S4 | 2300 | Décharge -38% / S3 (D+ plus traumatique que km plat, décharge plus marquée) |
| S5-S7 | 4000, 4500, 5000 | Bloc dev, 5000 m = équivalent week-end +60 km à 80 m/km terrain |
| S8 | 3800 | Décharge -24% |
| S9-S11 | 5200, 5800, 6200 | Bloc dev haut. 6200 m = mois pré-spé. Reste sous le pic spé. |
| S12 | 4500 | Décharge -27% avant cure |
| S13 | 6800 | Premier vrai B2B spé |
| S14 | **7500** | **PIC** — cure montagne. Simule fatigue course (11000 cumulés sur 20-24h). |
| S15 | 5800 | Dernière "grosse", -23% / pic |
| S16-S19 | 4000, 2500, 1500, 600 | Affûtage : -47, -67, -80, -92% / pic. Garder un peu de D+ pour ne pas perdre l'habituation. |

**Pic 7500 m/sem** : c'est le seuil terrain pour un ultra 11000 m D+ Expert. Sous 5500 m au pic, on n'a pas habitué les jambes à encaisser la déclinaison répétée. Référence : Bramoullé recommande "2× le D+ course / 3 sem" en pic spécifique (ici 22000 m / 3 sem = ~7300 m/sem moyens) — on est aligné.

### 5.3 — Format JSON patch

```json
{
  "generationContext": {
    "periodizationPlan": {
      "weeklyVolumes": [60, 65, 72, 55, 80, 90, 102, 78, 108, 120, 130, 92, 138, 148, 122, 90, 65, 45, 32],
      "weeklyElevationTarget": [3000, 3300, 3700, 2300, 4000, 4500, 5000, 3800, 5200, 5800, 6200, 4500, 6800, 7500, 5800, 4000, 2500, 1500, 600],
      "weeklyPhases": ["fondamental","fondamental","fondamental","recuperation","fondamental","developpement","developpement","recuperation","developpement","developpement","developpement","recuperation","specifique","specifique","specifique","affutage","affutage","affutage","affutage"],
      "recoveryWeeks": [4, 8, 12],
      "totalWeeks": 19
    }
  }
}
```

**IMPORTANT** : ce patch doit être appliqué AVANT le clic "Générer les semaines restantes" — sinon Gemini reproduira le pic 99. Si Rich a déjà cliqué et que les 19 semaines sont générées, le patch doit également **re-enforcer chaque `week.sessions[]`** via `enforceWeekConstraints` (`geminiService.ts:1267`) avec les nouveaux targetVolumes.

### 5.4 — Justification synthèse (pour Romane)

Le plan actuel demande à Rich (qui fait DÉJÀ 60 km/3000 m D+/sem et a un marathon 3h00) de **ne jamais dépasser 99 km au pic** pour préparer un ultra qui fait 110 km / 11000 m D+. C'est physiologiquement absurde :
- En course il devra faire 110 km en une seule journée
- En pic hebdo il fait moins que la course en 7 jours
- Aucune sortie ne dépasse 30 km, alors qu'il devra en faire 4× ça en une fois

Le vecteur proposé :
- **Respecte** ce que Rich fait déjà (S1 = 60 km)
- **Atteint un pic de 148 km / 7500 m** (norme Expert ultra alpin)
- **Cure montagne S14** simule la fatigue cumulative course
- **Tape 4 semaines** (vs route 2-3) pour récup neuro complète à 54 ans
- **Reste sous tous les caps de sécurité** (max progression +18%/sem hors post-récup, SL pic ≤ 6h, B2B plutôt qu'une SL démesurée)

---

## 6. Bug full plan : investigation + fix code court terme

### 6.1 — Diagnostic

**Flux conversion Premium actuel** (`server.js:287-369` + `App.tsx:815-895`) :

1. User clique "S'abonner" → Stripe Checkout
2. Stripe envoie webhook `checkout.session.completed` à `/api/stripe/webhook`
3. Webhook met à jour Firestore user : `isPremium=true, premiumSince, stripeCustomerId, stripeSubscriptionId`
4. **STOP côté backend.** Aucune fonction n'est appelée pour générer les semaines 2-19.
5. Quand l'user revient sur le site, `observeAuthState` détecte `isPremium=true` via onSnapshot
6. `PlanView` affiche le bouton "Générer les 18 semaines restantes" (L1612)
7. L'user doit **manuellement cliquer** ce bouton
8. `handleGenerateRemainingWeeks` → `generateRemainingWeeks` → `savePlan` avec `fullPlanGenerated=true`

**Pour Rich** : converti hier 20:18, n'a manifestement pas (encore) cliqué le bouton. Plan reste `isPreview=true`.

### 6.2 — Causes structurelles

1. **Pas d'automation post-paiement** : le passage Premium ne déclenche aucune génération côté serveur
2. **Génération lourde côté client uniquement** : impose à l'user d'avoir le navigateur ouvert ~1 min pour générer (cf. `App.tsx:827` "Cette opération prend environ 1 minute")
3. **Aucun fallback** : si l'user clique puis ferme l'onglet à 50%, le `savePlan` intermédiaire sauvegarde l'état partiel mais le plan reste `isPreview=true` jusqu'au nouveau clic complet
4. **Pas de notification proactive** : aucun email/push pour rappeler à l'user de revenir générer son plan

### 6.3 — Fix court terme (sans refonte)

**Option A — Patch UI 30 min** (recommandé immédiat) :
Dans `PlanView.tsx`, ajouter un `useEffect` qui auto-déclenche `onGenerateRemainingWeeks()` au mount si `user.isPremium && plan.isPreview && !plan.fullPlanGenerated && !isGeneratingRemaining && canViewFullPlan`. L'user voit le loader "Génération en cours" au lieu d'un bouton à cliquer.

```ts
// PlanView.tsx, après mount/plan check
useEffect(() => {
  if (
    user?.isPremium &&
    plan?.isPreview &&
    !plan?.fullPlanGenerated &&
    !isGeneratingRemaining &&
    onGenerateRemainingWeeks &&
    canViewFullPlan
  ) {
    // Auto-trigger après 1.5s pour laisser le user voir la S1
    const t = setTimeout(() => onGenerateRemainingWeeks(), 1500);
    return () => clearTimeout(t);
  }
}, [user?.isPremium, plan?.isPreview, plan?.fullPlanGenerated]);
```

**Option B — Fix server-side 2h** (recommandé pour la prochaine release) :
Dans `server.js` webhook `checkout.session.completed`, après le `setDoc isPremium=true`, ajouter une marque Firestore `pendingFullGeneration: true` sur le plan le plus récent de l'user. Puis au login, `observeAuthState` détecte ce flag et auto-déclenche `generateRemainingWeeks` côté client en arrière-plan, sans bouton à cliquer.

**Option C — Génération serveur** (1-2 jours, vraie solution) :
Déplacer `generateRemainingWeeks` côté serveur (Cloud Function ou endpoint `server.js`), appelée depuis le webhook. Avantages :
- Génération même si l'user ne revient pas
- Indépendant du navigateur
- Permet une stratégie de retry/queue
- Permet d'envoyer un email "ton plan complet est prêt" via Brevo

**Recommandation immédiate Rich** : appliquer Option A (auto-trigger UI) + patch live JSON section 5 pour son plan spécifique. Romane peut écrire le patch via `setDoc(planRef, {...patchObject}, {merge:true})` côté admin sans toucher au reste du plan, et l'user verra la nouvelle périodisation dès qu'il revient cliquer (ou via Option A, dès qu'il revient tout court).

### 6.4 — Détection des autres victimes du bug

Audit Firestore recommandé :
```
plans where isPreview=true AND fullPlanGenerated=false
JOIN users where isPremium=true OR hasPurchasedPlan=true
WHERE plan.createdAt > user.premiumSince - 7days
```
→ Liste de tous les users qui ont converti mais dont le plan est resté preview. Probable que Rich ne soit pas le seul.

---

## Annexes

### A. Référentiels caps code (extraits)
- `MAX_WEEKLY_VOLUME['Trail100+']` : `{deb:55, inter:75, conf:95, expert:120}`
- `MIN_SL_PROPORTION['Trail100+']` : `{deb:0.40, inter:0.40, conf:0.38, expert:0.35}`
- `MAX_SL_DURATION['Trail100+']` (min) : `{deb:180, inter:300, conf:360, expert:480}`
- `calculateWeekTargetElevation` plafond Expert : `min(raceElev, 3500)` ← **plafond dur à élever pour les ultras alpins**

### B. Math Rich complète
```
maxVolume base (Trail100+, Expert)                = 120
× sessionFactor[4 running]                        = 120 × 1.10 = 132
× Finisher (0.75)                                 = 132 × 0.75 = 99
× age 54 (< seuil 55)                             = 99 × 1.00 = 99
× BMI 22.5 (< 30)                                 = 99 × 1.00 = 99
vmaBasedMaxVolume (cap secondaire)                = 240 km — ne mord pas
absoluteCap (MAX_WEEKLY_VOLUME[Trail100+].expert) = 120 — ne mord pas
                                                   ───────
final maxVolume                                    = 99 ✓
```

### C. Commits clés à connaître
- `0a5bed7` 2026-05-17 17:23 — Ajout `weeklyElevationTarget` (post plan Rich)
- `3da7878` 2026-05-17 18:54 — Injection D+ par séance dans prompt Gemini
- `26b3d3a` 2026-05-18 17:59 — "4 bugs critiques découverts audits live 18/05" (à vérifier si touche Finisher×0.75)
- `9619cf6` 2026-05-18 16:08 — cap volume Expert seniors

### D. Action immédiate suggérée
1. **Patch Firestore plan Rich** : merge le `periodizationPlan` patché (section 5.3) — lecture seule respectée jusqu'à validation Romane.
2. **Patch UI auto-trigger** (Option A) : 30 min de dev pour éviter que les futurs converters subissent le même bug.
3. **Réflexion Finisher×0.75** : OK pour Intermédiaire/Confirmé qui débutent ultra. **À désactiver** pour Expert + `currentWeeklyVolume > 50` + (`marathon ≤ 3h30` ou `recentRaceTimes` significatif). C'est-à-dire : un Expert qui a déjà la base ne doit pas être pénalisé par sa modestie sur le `targetTime`.
4. **Réflexion plafond `calculateWeekTargetElevation`** : `3500 m max Expert` est sous-dim pour ultra alpin. Pour `Trail100+` + `raceElevation/raceDistance >= 80 m/km`, scaler le plafond à 6000-7000 m.

— Fin investigation —
