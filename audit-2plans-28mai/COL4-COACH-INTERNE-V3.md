# COL4 — COACH INTERNE V3 — Audit plans #5 & #6 (28 mai)

Auditeur : Coach interne (D1-D19, F-1 à F-15). Méthodo V2 héritée + focus bugs code Sprint G+1.
Investigation : `geminiService.ts`, `planUtils.ts`, plans JSON.

---

## Plan #5 — raph.courjault — Trail 100K Nantes — 21 sem.

**Profil** : H 39 ans, 176cm/73kg (BMI 23.6), VMA 15.24 km/h dérivée 5K 21:30 + 10K 41:30, **PB Marathon 3h32 + Semi 1h38**, cv=50 km/sem, **currentWeeklyElevation=500m**, freq=5, level Expert Performance, raceDate 2026-10-16, race=**100km D+4500m** (45 m/km).

### Tableau métriques weeklyVolumes + D+

| Sem | Vol km | Δ% vol | D+ target | Δ% D+ | Phase | OK/Anomalie |
|---|---|---|---|---|---|---|
| 1 | 50 | — | 675 | — | fondamental | OK (cv=50 base) |
| 2 | 53 | +6% | 866 | +28% | fondamental | OK vol / **D+ +28%** |
| 3 | 55 | +4% | 1058 | +22% | fondamental | OK vol / **D+ +22%** |
| 4 | 43 | -22% | 687 | -35% | **recuperation** | OK |
| 5 | 49 | +14% | **1440** | **+109%** | fondamental | OK vol / 🚨 **saut D+ post-récup** |
| 6 | 56 | +14% | 1631 | +13% | fondamental | OK |
| 7 | 64 | +14% | 1823 | +12% | developpement | OK |
| 8 | 51 | -20% | 1108 | -39% | recuperation | OK |
| 9 | 59 | +16% | **2205** | **+99%** | developpement | 🚨 vol+D+ post-récup |
| 10 | 68 | +15% | 2396 | +9% | developpement | OK borderline +15% |
| 11 | 75 | +10% | 2588 | +8% | developpement | OK |
| 12 | 60 | -20% | 1528 | -41% | recuperation | OK |
| 13 | 69 | +15% | **2970** | **+94%** | developpement | 🚨 D+ post-récup |
| 14 | 75 | +9% | 3161 | +6% | specifique | OK |
| 15 | 79 | +5% | 3353 | +6% | specifique | OK |
| 16 | 63 | -20% | 1949 | -42% | recuperation | OK |
| 17 | 72 | +14% | **3735** | **+92%** | specifique | 🚨 D+ post-récup |
| 18 | 75 | +4% | 3926 | +5% | specifique | OK |
| 19 | 53 | -29% | 2883 | -27% | affutage | OK |
| 20 | 46 | -13% | 2155 | -25% | affutage | OK |
| 21 | 40 | -13% | 1800 | -16% | affutage | OK |

**Verdict** : volumes parfaitement lissés (post-récup ≤ +16%, conforme cap code +15% line 3546-3551). **D+ NON LISSÉ** : 4 sauts post-récup entre +92% et +109%. Pic D+ S18 = 3926m = 87% race D+ (OK doctrine Expert ultra alpin 50-65% race, ici un peu haut mais Expert).

### Verdict F-trigger
- **F-trigger D+ post-récup** : **NOUVEAU** — saut D+ S(N→N+1) > +50% systématique en sortie récup. À nommer **F-16 (D+ post-récup uncapped)**.
- F-14/F-15 inactifs (age 39, BMI 23.6, cv cohérent Expert).
- D17 inactif (score 60 AMBITIEUX, opt-in non requis).

### Consigne "5:53 en référence sur le plat"
**Origine** : phrase **émise par Gemini** (LLM), PAS injectée par code. `enforceFlatEquivalentNote` (`geminiService.ts:746-782`) injecte un wording fixé `"Note D+ : repère plat-équivalent X km..."` qui n'apparaît PAS dans le plan raph (grep 0 hit). Le LLM produit sa propre paraphrase doctrinale, ce qui est **doctrinalement OK** (la doctrine D18b est respectée) mais **non-déterministe**.

**Cohérence** : sur 21 séances vallonnées ou trail dans raph (D+/km > 30), la phrase apparaît seulement **1 fois** ("5:53 en référence sur le plat, la vitesse baisse en côte c'est normal" S1 sentier vallonné), avec 10 autres mainSet contenant juste "5:53 en référence" (forme courte). **Inégalité de wording = risque ambiguïté user**.

**Seuil 30 m/km** (`geminiService.ts:766`) : OK doctrine Pfitzinger ("rolling").

### Patches live recommandés
- **Aucun patch live S1**. S1 (raph) est correcte : volumes 50 km conformes cv, D+ S1 675m = 135% cv user (500m) → progression Gabbett OK. Aucune séance dangereuse.
- L'audit S1 ne nécessite pas de patch. Plan systémique OK pour exécution.

### Bugs code identifiés

1. **🚨 Δ% D+ post-récup UNCAPPED** (`planUtils.ts:106-173`).
   - `calculateWeekTargetElevation` calcule une rampe linéaire `startElevation + (max - start) × progress` PUIS applique `×0.55` en phase récup.
   - **Aucune passe de lissage post-récup analogue à `weeklyVolumes`** (`geminiService.ts:3531-3554`).
   - Résultat : la récup tire S(N) à 55% de la trend → S(N+1) explose mécaniquement à +90-110%.
   - **Fix proposé** : appliquer la même passe `for (let pass=0; pass<2; pass++)` sur `weeklyElevationTarget` avec règle post-récup `next ≤ min(preRecov, curr × 1.20)` (D+ tolère +20% car charge excentrique vs +15% volume).

2. **🚨 wording flat-equivalent non-déterministe** (`geminiService.ts:746-782`).
   - `enforceFlatEquivalentNote` n'a été injecté sur **AUCUNE** séance de raph (grep "Note D+ : repère plat-équivalent" = 0 hit). Pourquoi ? Probable : `s.distance` parsing échoue OU regex `ALREADY_HAS_FLAT_EQUIVALENT_NOTE` matche le wording LLM "en référence" (pas dans la regex actuelle).
   - **Vérification regex** L746 : `/plat[- ]équivalent|effort qui compte|ta vitesse au sol|rpe constant|distance affichée sur le plat|distance affichée plat|c'est l'effort qui prime|allure[- ]référence plat/i`. La phrase LLM "5:53 en référence sur le plat" matche `/allure[- ]référence plat/i` ? Non — pas de "allure" devant. Donc la regex ne matche pas, mais la note n'est pas injectée non plus.
   - **À investiguer** : pourquoi `enforceFlatEquivalentNote` ne tourne pas sur preview ? (Probable : ordre d'appel.)
   - **Fix proposé** : ajouter `/en référence sur le plat|en référence/i` à `ALREADY_HAS_FLAT_EQUIVALENT_NOTE` pour idempotence + s'assurer que l'enforce tourne preview ET remaining.

3. **Monotonie wording terrain** : 10 mainSet avec exactement "5:53 en référence" sans précision contextuelle. Le LLM aurait dû alterner "ralentis naturellement en montée" / "RPE 5/10 constant" / "foulée courte en côte". Pas un bug code, c'est un manque dans le prompt système.

---

## Plan #6 — cyrielle — Semi 2h00 Toulouse — 20 sem.

**Profil** : F, cv=2 km/sem, freq=3, level Intermédiaire (Régulier), targetTime 2h00, vmaSource "Marathon en 5h00", PAS de PB cohérent. VMA dérivée objectif = **10.5 km/h** (objectif 2h00 = 5:41/km = 95-100% VMA = IRRÉALISTE).

### Tableau métriques weeklyVolumes

| Sem | Vol km | Δ% | Phase | OK/Anomalie |
|---|---|---|---|---|
| 1 | 3 | — | fond | OK (cv=2 base, +50% mais Δ abs = 1km) |
| 2 | 4 | +33% | fond | OK petits volumes |
| 3 | 4 | 0% | fond | OK |
| 4 | 3 | -25% | recup | OK |
| 5 | 5 | +67% | fond | abs +2km, tolérable |
| 6 | 6 | +20% | dev | OK |
| 7 | 5 | -17% | recup | OK |
| 8 | 7 | +40% | dev | abs +2km |
| 9 | 8 | +14% | dev | OK |
| 10 | 7 | -13% | recup | OK |
| 11 | 8 | +14% | dev | OK |
| 12 | 9 | +13% | dev | OK |
| 13 | 10 | +11% | recup ? | OK |
| 14 | 9 | -10% | spé | OK |
| 15 | 10 | +11% | spé | OK |
| 16 | 12 | +20% | spé | abs +2km |
| 17 | 10 | -17% | recup | OK |
| 18 | 12 | +20% | spé | abs +2km |
| 19 | 14 | +17% | spé | **PIC 14km** |
| 20 | 13 | -7% | affût | OK |

**Verdict** : volumes Δ% acceptables doctrine V2 (Δ abs ≤ 2 km). **PIC 14 km pour préparer Semi 21.1 km = 66% race distance = ANOMALIE STRUCTURELLE** (référentiel Semi Débutant 25-30 km, hard floor code = 22 km).

### Verdict F-trigger
- **F-15 inactif** : level Intermédiaire + cv 2 = incohérent (devrait être F-15 actif). Recalibrage `effective_level=Débutant`.
- D17 actif : IRRÉALISTE score 5, opt-in correct.
- **F-trigger NOUVEAU : F-17 (pic volume < 80% race distance pour Semi/Marathon)**.

### Cas IRRÉALISTE — suffisant pour décision regen ?

**État actuel** (`plan-1779986074728.json`) :
- `feasibility.message` : "demande 100% VMA, impossible... Un objectif réaliste serait autour de 2h28min." ✅
- `feasibility.recommendation` : "un temps cible de 2h28min" ✅
- `welcomeMessage` : "Ce plan ne te permettra PAS d'atteindre 2h00... une cible plus réaliste serait de 2h28min..." ✅

**Verdict** : **NON suffisant**. Le welcomeMessage signale le problème mais **n'invite PAS explicitement à regénérer**. Tournure ambigüe : "une cible plus réaliste serait 2h28min" sonne comme un constat, pas comme un call-to-action.

**Phrase à ajouter dans welcomeMessage IRRÉALISTE** :
> "Si tu acceptes ce constat, on te recommande fortement de **regénérer un plan avec un targetTime de 2h28min** depuis ton profil. Tu auras alors un plan calibré pour réussir, pas pour te frustrer."

Cohérent doctrines : `feedback_securite_avant_conversion`, `feedback_compromis_messages_preventifs` (message > blocage), `feedback_jamais_baisser_allure_cible` (on ne touche PAS le plan, on PROPOSE regen).

### Tension doctrinale pic volume Semi cv=2

Doctrines impliquées :
- `feedback_input_client_obligatoire` : cv immuable.
- `feedback_securite_avant_conversion` : transparence > conversion. Plan IRRÉALISABLE = devoir d'alerter.
- `feedback_courte_duree_charge_allegee` : <13 sem charge allégée. Cyrielle = 20 sem → **NE S'APPLIQUE PAS**.

**Arbitrage** : cv=2 input immuable + Semi 21.1 km racetime IRRÉALISTE = ce **n'est PAS** un cas charge allégée volontaire, c'est un cas **structurellement irréalisable** (pic 14 km ne prépare PAS 21.1 km). Le plan court vers **F-17 silencieux** : on respecte le cv user mais on ne LE DIT PAS au user que le pic 14 km est ridicule pour la distance race.

**Bug code** : `geminiService.ts:3171` :
```ts
let minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap);
```
Le hard floor Semi 22 km L3180-3183 est ensuite appliqué :
```ts
if (objectiveKey === 'Semi' && minPeakVolume < 22) minPeakVolume = 22;
```
MAIS `maxVolume` (line 3217) est ensuite forcé : `if (maxVolume < minPeakVolume) maxVolume = minPeakVolume`. **DEVRAIT** porter le pic à 22 km. Or le plan a un pic 14 km.

**Hypothèse** : `effectiveVmaCap` est plus bas que 22 km parce que VMA dérivée 10.5 km/h × freq=3 × durée max → vmaBasedMaxVolume ≈ 14 km (L3052), qui CASCADE et empêche la remontée. Probable : `maxVolume = currentVolume = 2` (L3079) PUIS progression min 18% (L3089-3097) PUIS hard floor Semi 22 mais cappé par `safeTarget = Math.min(progressionTarget, baseMaxVolume × 1.10)` ≈ 14. Le hard floor Semi n'a PAS de garde absolu.

**Fix proposé** : ajouter check final post-tout :
```ts
const ABS_MIN_PIC_BY_RACE = { Semi: 18, Marathon: 30 };
if (objectiveKey in ABS_MIN_PIC_BY_RACE && maxVolume < ABS_MIN_PIC_BY_RACE[objectiveKey]) {
  // Si IRRÉALISTE accepté par user (cv vs race), au moins garantir pic = race × 0.85.
  // Sinon flagger F-17 explicit dans feasibility.
}
```

### Patches live recommandés

- **Cyrielle welcomeMessage** : ajouter explicitement "**Re-génère un plan avec un targetTime de 2h28**". Patch live S1 OK (plan du jour, S1 non vécue).
- **Cyrielle plan** : PAS de modification du plan lui-même (`feedback_jamais_baisser_allure_cible` + `feedback_input_client_obligatoire`).

### Bugs code identifiés (synthèse cyrielle)

4. **🚨 welcomeMessage IRRÉALISTE manque call-to-action regen** (`geminiService.ts:3747-3762`).
   - Bloc `buildWelcomeToneBlock('IRRÉALISTE')` exige "Reconnaitre EXPLICITEMENT" + "Si feasibility.alternativeTarget existe, le suggérer comme cible réaliste" (L3757) — mais "suggérer" n'est PAS "demander de regénérer".
   - **Fix proposé** : ajouter à L3757 : "5. Inviter explicitement le user à **regénérer son plan** depuis son profil avec targetTime=alternativeTarget. Wording obligatoire : 'Pour bénéficier d'un plan calibré pour réussir, regénère depuis ton profil avec un objectif de X.'"

5. **🚨 Pic volume race-distance silencieusement bypassé** (`geminiService.ts:3171, 3180-3183`).
   - Hard floor Semi 22 km (L3182) cappé en amont par `effectiveVmaCap` à L3171.
   - **Fix proposé** : déplacer le hard floor APRÈS toutes les cascades VMA-cap / currentVolume-floor pour garantir Semi ≥ 18 km / Marathon ≥ 28 km absolu, OU exposer une nouvelle alerte F-17 si `peak < race × 0.80`.

---

## Synthèse 2 plans

| Sujet | raph (Trail 100K) | cyrielle (Semi 2h00) |
|---|---|---|
| feasibility | 60 AMBITIEUX justifié | 5 IRRÉALISTE correctement flaggué |
| F-trigger | **F-16 NOUVEAU : D+ post-récup uncapped** | **F-15 silencieux + F-17 pic-vs-race** |
| Patches live | Aucun (plan systémique OK) | welcomeMessage + call-to-action regen |
| Bug code | (1) Δ% D+ cap post-récup ; (2) wording flat-equiv non-déterministe | (4) IRRÉALISTE no-regen ; (5) hard floor Semi bypass |

### Top actions Sprint G+1

- **P0 code** : 
  - Lisser `weeklyElevationTarget` (passe post-récup analogue volumes, cap +20% D+) — `planUtils.ts:106-173`.
  - Ajouter call-to-action regen dans `buildWelcomeToneBlock('IRRÉALISTE')` — `geminiService.ts:3747-3762`.
- **P0 patch live** : cyrielle welcomeMessage manuel (mention "regénère avec 2h28").
- **P1 code** : déplacer hard floor pic volume (Semi 22 / Marathon 32) APRÈS toutes cascades VMA-cap — `geminiService.ts:3171-3220`.
- **P1 code** : élargir regex `ALREADY_HAS_FLAT_EQUIVALENT_NOTE` ou rendre `enforceFlatEquivalentNote` tourné systématiquement preview+remaining — `geminiService.ts:746`.
- **P2 prompt** : wording trail "en référence" déterministe (forcer phrase canonique injectée systématiquement, pas paraphrase LLM).

### Autocritique vs V1/V2

- **V1+V2 angle mort raté** : on auditait les `weeklyVolumes` mais PAS les `weeklyElevationTarget`. Sur trail à D+ marqué, c'est l'élément le plus dangereux (charge excentrique). À ajouter au pipeline obligatoire : tableau `[S, D+ target, Δ% D+, phase]`.
- **V1+V2 angle mort raté** : on n'a jamais ratio `peak / race_distance`. Cyrielle = 66% = signal rouge structural pour Semi. Ajouter check `peak_vol_km ≥ race_distance_km × 0.85` pour Semi/Marathon.
- **V2 prudence renouvelée** : ne PAS sur-réagir aux Δ% sur petits volumes (≤ 2 km abs) — règle V2 confirmée chez cyrielle (8 sauts +14% à +67% mais tous Δ abs ≤ 2 km = OK).
- **Self-check positif** : la phrase "5:53 en référence sur le plat" est doctrinalement OK (D18b respecté) mais LLM-générée → non-déterministe → risque régression silencieuse. Identifié, plus fort que V2.
