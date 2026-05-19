# Sprint 3 — Fix `buildFinisherFeasibility`

Date : 2026-05-19
Branche : `main`
Statut : ✅ Tests verts (229/229) — Build OK — Push effectué — Deploy hosting EN ATTENTE validation Romane

---

## Cause racine identifiée

Le path `buildFinisherFeasibility` (`feasibilityService.ts`) reste **trop permissif** sur des profils à risque parce qu'il **ne croise jamais** :

1. **Âge** vs distance (60 ans Finisher 10K → toujours `EXCELLENT` possible)
2. **BMI** dans la zone "vigilance articulaire" 27-29.9 sur Finisher route
3. **VMA "corrigée"** vs PB déclarés (PB peu compétitif sur 5K → VMA réelle bien plus basse que la VMA "corrigée" affichée)

### Cas steph-fanny (régression principale)

| Champ | Valeur |
|---|---|
| Sexe / Âge / BMI | F / 60 ans / 23.5 |
| VMA "corrigée" | 8 km/h |
| PB déclaré | 5K en 46 min (= 6.52 km/h soutenu = 81 % VMA) |
| Distance | 10 km Finisher |
| Plan | 21 semaines, 3 séances/sem, vol 20 km/sem |
| Avant Sprint 3 | `score = 95 / status = EXCELLENT` |
| Après Sprint 3 | `score ≤ 84 / status = BON` ✅ |

**Trace du bug** (avant fix) :
- `buildFinisherFeasibility` part de `score = 80, status = BON`
- Aucun débit majeur (pas blessure, pas BMI > 30, pas plan trop court, hasChrono=true)
- Bonus volume : `currentVolume (20) >= distanceKm (10) × 0.50` → **+15** → score `95`
- `resolveStatus(95) = EXCELLENT`
- **Résultat affiché : EXCELLENT 95** → embellit le plan d'une senior avec VMA optimiste

Cf. `AUDIT-1779185876450.md` § "Cohérence du EXCELLENT 95" + `VALIDATION-COACH-AVANT-DEPLOY.md` élément B (Coach 15 ans recommande **BON 70-75**).

### Pourquoi Sprint 2 n'a pas corrigé

Sprint 2 (`fix(sprint2): seuils %VMA tenu sur distance + sync mainSet`) a traité **uniquement `calculateFeasibility`** (path chrono, avec `targetTime` parseable en minutes). Le path Finisher (`targetTime = "Finisher"`) bypass entièrement les seuils %VMA Sprint 2 — pas de `gapPercent`, pas de `pctVmaTenu`, donc le bug steph-fanny est passé à travers.

---

## Modifications appliquées

### 1) `src/services/feasibilityService.ts`

#### 1a) Nouveau champ `FeasibilityParams.recentRaceTimes`

```ts
recentRaceTimes?: {
  distance5km?: string;
  distance10km?: string;
  distanceHalfMarathon?: string;
  distanceMarathon?: string;
};
```

Justification : nécessaire pour détecter une VMA optimiste (cas steph-fanny VMA 8 "corrigée" sur 5K 46 min). Sans le PB, impossible de croiser physiologie.

#### 1b) Helper `checkPbVmaOptimism` (nouveau, lignes ~854-960)

Pour chaque PB déclaré dans `recentRaceTimes`, calcule la vitesse moyenne soutenue, puis le %VMA correspondant. Compare au seuil typique tenable par la distance :

| Distance PB | Seuil typique (% VMA tenable) |
|---|---|
| 5 km | 95 % |
| 10 km | 90 % |
| Semi | 85 % |
| Marathon | 80 % |

Si `pctVmaOnPb > seuil` → la VMA déclarée est **sur-évaluée** (le coureur n'aurait pas pu tenir ce PB avec la VMA déclarée à moins d'être Élite hors-norme — incohérent avec un Intermédiaire qui court un 5K en 46 min).

Helper `parsePbToSeconds` local (autonomie module) — parse les formats `46min`, `46:00`, `1h30`, `1:30:00`, etc., aligné sur la doctrine `timeToSeconds` de `geminiService.ts` (rejette inputs pollués `km`, garde-fous plausibilité).

#### 1c) Caps "max BON" dans `buildFinisherFeasibility` (lignes ~1300-1356)

Insérés **après les pénalités R2** et **avant le `clamp` final**. N'écrasent JAMAIS un score déjà < 84 (`Math.min(score, 84)`).

```ts
// Sprint 3a — Senior + distance ≥ 10 km
const isSenior = params.age !== undefined && params.age >= 55;
const isMidLongDistance = distanceKm !== null && distanceKm >= 10;
if (isSenior && isMidLongDistance && score > 84) {
  score = 84;
  reasons.push({ type: 'warn', text: `à ${params.age} ans sur cette distance, on garde une marge prudente (vigilance cardio + récupération)` });
}

// Sprint 3b — BMI ≥ 27
if (bmiFin >= 27 && score > 84) {
  score = 84;
}

// Sprint 3c — VMA optimiste détectée via PB
const pbCheck = checkPbVmaOptimism(vma, params.recentRaceTimes);
if (pbCheck && pbCheck.isOptimistic && score > 84) {
  score = 84;
  reasons.push({ type: 'warn', text: `VMA déclarée ${vma} km/h optimiste vu ton ${pbCheck.source} (${pctRound}% VMA tenu sur ce PB, au-delà du seuil typique ${seuilRound}% pour la distance)` });
}
```

**Pourquoi un cap à 84 et pas plus bas** : doctrine `feedback_securite_avant_conversion` demande la transparence, pas la stigmatisation. `BON 70-84` est un status honnête pour un Finisher avec un signal de prudence. Forcer AMBITIEUX/RISQUÉ serait une sur-réaction qui découragerait des profils parfaitement capables (60 ans qui veut finir un 10K).

### 2) Callers — propagation `recentRaceTimes` à `calculateFeasibility`

- `src/services/geminiService.ts` (L3565+) — appel preview
- `src/components/PlanView.tsx` (L517) — recalcul live faisabilité
- `src/App.tsx` (L1228) — recalcul faisabilité après changement VMA (+ ajout `weight`/`height` au passage, oubliés)

Aucune autre callsite (vérifié via `grep -rn calculateFeasibility src/`).

---

## Tests anti-régression — 13 tests Sprint 3

`src/services/__tests__/buildFinisherFeasibility-sprint3.test.ts` (nouveau).

| # | Cas | Avant | Après | Justification |
|---|---|---|---|---|
| 1 | steph-fanny (F 60 ans VMA 8, 10K Finisher, PB 5K 46min) | EXCELLENT 95 | **BON ≤ 84** ✅ | Régression principale |
| 2 | Finisher 5K Débutant 28 ans VMA 9 sans PB | EXCELLENT/BON | EXCELLENT/BON ✅ | Non-régression jeune court |
| 3 | Marathon 60 ans VMA 11 | EXCELLENT | **BON ≤ 84** ✅ | Cap senior + distance |
| 4 | Trail 30 km 50 ans VMA 13 | EXCELLENT | EXCELLENT/BON ✅ | < 55 ans → pas de cap |
| 5 | 10K 55 ans VMA 12 PB 10K 50min | EXCELLENT | **BON ≤ 84** ✅ | Senior 55 ans limite |
| 6 | 10K 40 ans VMA 10 sans PB | EXCELLENT | EXCELLENT/BON ✅ | Profil sain, pas de cap |
| 7 | Ultra 100km 50 ans Expert VMA 14 | (R2/vol) | Inchangé | Pas senior ≥ 55 |
| 8 | Semi 65 ans VMA 9 | EXCELLENT | **BON ≤ 84** ✅ | Senior 65 ans |
| 9 | Confirmé 10K chrono 38min VMA 17 | AMBITIEUX (Sprint 2) | AMBITIEUX (inchangé) ✅ | Path chrono pas touché |
| 10 | Finisher 10K 35 ans BMI 28 VMA 11 | EXCELLENT | **BON ≤ 84** ✅ | Cap BMI ≥ 27 |
| 11 | Finisher 10K 35 ans VMA 12 PB 10K 40min (125% VMA) | EXCELLENT | **BON ≤ 84** ✅ | VMA optimiste détectée |
| 12 | Finisher 10K 35 ans VMA 17 PB 10K 42min (84% VMA, sain) | EXCELLENT/BON | EXCELLENT/BON ✅ | VMA cohérente → pas de cap |
| 13 | Senior 60 ans Marathon 8 sem (score déjà < 84) | RISQUÉ bas | RISQUÉ bas ✅ | Cap ne dégrade pas plus |

### Non-régression Sprint 1 + Sprint 2

- 216 tests pré-Sprint-3 → **216 / 216 verts**
- + 13 tests Sprint 3 → **13 / 13 verts**
- **Total : 229 / 229 ✅**

```
Test Files  13 passed (13)
     Tests  229 passed (229)
```

### Build

```
✓ built in 4.17s
```

---

## Commit + push

- Commit : `fix(sprint3): path buildFinisherFeasibility — cap BON pour seniors/Finisher long`
- Branche : `main`
- Pushed : ✅

---

## Tests à valider par Romane avant deploy hosting

Avant `firebase deploy --only hosting`, valider les 9 profils Finisher avant/après dans l'UI (preview live) :

1. **steph-fanny** réel (1779185876450) : Finisher 10K F 60 ans VMA 8 PB 5K 46min → doit afficher **BON ≤ 84**, pas EXCELLENT
2. Finisher 5K Débutant 28 ans VMA 9 → reste **EXCELLENT/BON** (pas de régression jeune court)
3. Marathon Finisher Senior 60 ans VMA 11 → **BON ≤ 84**
4. Trail Finisher 30 km 50 ans VMA 13 → **EXCELLENT/BON** (< 55 ans)
5. 10K Finisher 55 ans VMA 12 PB 10K 50min → **BON ≤ 84**
6. 10K Finisher 40 ans VMA 10 → **EXCELLENT/BON**
7. Ultra 100K Expert 50 ans VMA 14 → comportement R2 conservé (pas senior)
8. Semi 65 ans VMA 9 → **BON ≤ 84**
9. 10K Confirmé chrono 38min VMA 17 → **AMBITIEUX** (path chrono Sprint 2, inchangé)

Décisions Romane :
- **D1** : Le score 84 est-il le bon plafond, ou descendre à 80 (= mid-BON) pour les seniors ? Reco coach : 84 ok pour rester rassurant.
- **D2** : Faut-il appliquer le cap aussi en **Confirmé/Expert Senior** ? Actuellement le cap touche tous niveaux. Doctrine sécurité : OUI (la vigilance cardio 60+ ne dépend pas du niveau).
- **D3** : Ajouter `currentVolume / age` cross-check ? Hors scope Sprint 3 (Sprint 4 si nécessaire).

---

## Contraintes respectées

- ✅ Lecture seule Firestore (aucune modif données)
- ✅ Tests vitest verts avant commit
- ✅ Validation coach 15 ans (élément B `VALIDATION-COACH-AVANT-DEPLOY.md`)
- ✅ Non-régression Sprint 1 + Sprint 2 (216 → 229 verts)
- ✅ Doctrine `feedback_securite_avant_conversion` : préfère "trop prudent" à "trop optimiste"
- ✅ Pas de deploy hosting depuis cet agent
- ✅ `feedback_chaque_ligne_justifiee` : chaque cap doc commentée avec rationale
- ✅ `feedback_qualite_avant_vitesse` : 13 typologies testées avant deploy
