# Sprint 2 — Fix code C + D
Date: 2026-05-19
Commit: `7d49f37`
Pushed: ✅ (`main` → `origin/main`)

## Objectif

Implémenter en code (pas en patch de données) les fixes pour que les bugs
**mxjulien02** (feasibility AMBITIEUX au lieu d'IRRÉALISTE) et **steph-fanny**
(mainSet 116 min vs duration 60 min) ne re-arrivent **JAMAIS** sur les futurs
plans générés.

Doctrine Romane : « je veux pas resoudre les patchs des anciens plans, je veux
corriger le code ».

---

## Fix C — feasibilityService.ts seuils %VMA tenu sur distance

### Cause racine

La seule gate IRRÉALISTE existante (`vmaRatioPercent >= 130`) est asymétrique :
elle utilise `getVmaFactor()` qui module par distance. Cas mxjulien02 :

| Param | Valeur |
| ----- | ------ |
| VMA | 10.8 km/h |
| Cible | Semi 2h00 |
| `requiredSpeed` | 21.1 / 2 = 10.55 km/h |
| `vmaNeeded` via factor 0.85 | 10.55 / 0.85 = 12.41 km/h |
| `vmaRatioPercent` | 12.41 / 10.8 = **115 %** → < 130 → passe ❌ |
| `pctVmaTenu` réel | 10.55 / 10.8 = **97.7 %** → physiologiquement IRRÉALISTE sur 21 km |

### Implémentation

Fichier : `src/services/feasibilityService.ts` lignes **444-503** (nouveau bloc)
et **723-731** (cap appliqué avant clamp final).

Seuils absolus validés coach 15 ans (élément C de `VALIDATION-COACH-AVANT-DEPLOY.md`) :

| Distance | AMBITIEUX > | IRRÉALISTE > |
| -------- | ----------- | ------------ |
| 5K (≤ 5.5 km) | 93 % VMA | 98 % VMA |
| 10K (≤ 11 km) | 90 % | 95 % |
| Semi (≤ 22 km) | 88 % | 93 % |
| Marathon (≤ 43 km) | 83 % | 88 % |
| Ultra (> 43 km) | 78 % | 85 % |

Référence physiologique : Daniels VDOT + Pfitzinger seuil lactique.

Comportement :
- **IRRÉALISTE strict** (return anticipé score 5) si `pctVmaTenu > unrealistic` —
  message explicite avec %VMA tenu + seuil distance + alternative Riegel.
- **AMBITIEUX cap 60** retenu dans `vmaThresholdAmbitiousCap` et appliqué APRÈS
  toutes les autres pénalités, juste AVANT le clamp final. Ne remonte jamais
  un score déjà plus bas (uniquement plafonne).
- Préservé : la branche `buildFinisherFeasibility` (steph-fanny Finisher) n'est
  pas touchée — Fix C ne s'applique qu'à `calculateFeasibility` avec
  `targetMinutes != null`.

---

## Fix D — sessionScale.ts + sync mainSet via whitelist

### Cause racine

24 sites dans `geminiService.ts` mutent `session.duration` et/ou
`session.distance` (caps SL, caps non-SL, caps session km, volume scale up/down,
proportion SL, ...) **sans réécrire `mainSet`**. Conséquence : 51 séances en
base sur 10+ plans avec `mainSet` "Footing 116 min" alors que `duration` = 60 min.

### Implémentation

#### Nouveau fichier `src/services/sessionScale.ts` (122 lignes)

```ts
export const MAINSET_SYNCABLE_TYPES = new Set([
  'Sortie Longue', 'Jogging', 'Footing',
]);

export const MAINSET_RISKY_TYPES = new Set([
  'Fractionné', 'Fartlek', 'Côtes', 'Tempo', 'Trail',
  'Renforcement', 'Marche-Course', 'Marche/Course', 'Hyrox',
  'VMA', 'Intervalle', 'Seuil', 'Repos',
]);

function shouldSyncMainSet(sessionType, mainSet) {
  if (!MAINSET_SYNCABLE_TYPES.has(sessionType)) return false;
  if (MAINSET_RISKY_TYPES.has(sessionType)) return false; // double safety net
  if (mainSet && FRACTIONAL_PATTERN_RE.test(mainSet)) return false; // détection "X × Y km"
  return true;
}

export function applySessionScale(session, newDur, newKm) {
  session.duration = newDur;
  session.distance = newKm;
  if (shouldSyncMainSet(session.type, session.mainSet)) {
    session.mainSet = syncMainSetText(session.mainSet, parseDurationMin(newDur), parseKm(newKm));
  }
}
```

Pattern de sync `mainSet` :
- Préfixe `^X min` → remplacé par `${newDurMin} min` (premier match uniquement).
- Premier `X km` → remplacé par `${newKm} km` SEULEMENT si pas de pattern `X × Y km`
  dans le mainSet (anti-fractionné).

#### Patch `enforceWeekConstraints` dans `geminiService.ts`

Au lieu de patcher les 10+ sites de mutation (risque de régression élevé), j'ai
ajouté un **pass final unique** à la fin de `enforceWeekConstraints` (ligne
1872-1893) qui re-synchronise les mainSets des types whitelistés avec
`duration` / `distance` finales :

```ts
week.sessions.forEach((s) => {
  if (!s || !s.mainSet) return;
  if (!isMainSetSyncable(s.type, s.mainSet)) return;
  // ... applySessionScale (idempotent) ...
});
```

Pourquoi safe : applique uniquement sur les **3 types whitelistés** et **idempotent**
(les types risqués ne sont jamais touchés, peu importe combien de fois la
fonction est ré-appelée).

#### Déplacement `buildFootingVariant` après `enforceWeekConstraints` (preview path)

`buildFootingVariant()` génère un mainSet `"${m} min en EF..."` à partir de
`session.duration`. S'il tourne AVANT `enforceWeekConstraints`, l'enforce peut
ensuite cap la duration (1h30 → 1h00) et le mainSet "90 min..." reste obsolète.

Solution : appel déplacé APRÈS l'enforce → variant construit son mainSet avec
la duration FINALE.

Fichier `geminiService.ts` lignes 4121-4151 (était avant enforce, maintenant après).
Le batch path (lignes 4781-4810) n'a pas été déplacé car la structure du loop
batch rendrait l'opération invasive — le **pass de sync** dans
`enforceWeekConstraints` couvre ce cas.

---

## Fix Validator — règle `mainset_duration_mismatch`

Fichier : `src/services/planValidator.ts` lignes 78-128 (helper) + 793-812 (boucle).

```ts
function checkMainsetDurationMismatch(session) {
  if (!session.mainSet) return null;
  if (MAINSET_RISKY_TYPES.has(session.type)) return null;
  if (/\d+\s*[x×]\s*\d/i.test(session.mainSet)) return null;
  if (/fractionn|tempo|seuil|vma|côte|hyrox|renfo/i.test(session.title)) return null;

  // Check duration ↔ "X min" en début de mainSet
  const durMatch = session.mainSet.match(/^\s*(\d+)\s*min\b/i);
  if (durMatch && parseDurationMin(session.duration) > 0) {
    const drift = Math.abs(mainSetMin - sessionMin) / sessionMin;
    if (drift > 0.20) return `... mainSet ${mainSetMin}min ≠ duration ${sessionMin}min (écart ${(drift*100).toFixed(0)}%)`;
  }

  // Check distance ↔ "X km" (premier non-fractionné)
  // ... (idem pour km, seuil 20%) ...

  return null;
}
```

Sévérité = `warning` (pas error → ne bloque pas la sauvegarde, mais log + AI
review peut suggérer correction).

---

## Tests anti-régression

### `src/services/__tests__/feasibilityService-vma-thresholds.test.ts` (15 tests)

| Cas | Attendu | Status |
| --- | ------- | ------ |
| mxjulien02 Semi 2h00 VMA 10.8 (97.7 %) | IRRÉALISTE strict | ✅ |
| 10K 45min VMA 10 (gate 130 % existante) | IRRÉALISTE strict | ✅ |
| Marathon 2h45 VMA 16 (95.9 %) | IRRÉALISTE strict | ✅ |
| Semi 1h45 VMA 13 (92.8 %) | AMBITIEUX cap 60 | ✅ |
| Marathon 3h00 VMA 16 (87.9 %) | AMBITIEUX cap 60 | ✅ |
| 10K 38min VMA 17.5 (90.2 %) | AMBITIEUX cap 60 | ✅ |
| Marathon 3h00 VMA 17 Élite (82.7 %) | EXCELLENT/BON inchangé | ✅ |
| Marathon 3h30 VMA 16 (75.3 %) | EXCELLENT/BON inchangé | ✅ |
| 5K 22min VMA 16 (85.2 %) | EXCELLENT/BON inchangé | ✅ |
| Finisher sans targetTime (steph-fanny-like) | branche Finisher non touchée | ✅ |
| Trail Ultra 100km en 12h VMA 14 (59.5 %) | pas IRRÉALISTE via Fix C | ✅ |
| Ultra 100km en 8h VMA 14 (89.3 %) | IRRÉALISTE seuils ultra | ✅ |
| Boundary 88.0 % exactement (frontière `>` strict) | pas de cap | ✅ |

### `src/services/__tests__/sessionScale-sync-mainset.test.ts` (16 tests)

| Cas | Attendu | Status |
| --- | ------- | ------ |
| SL 1h30/12km → 1h00/8km | duration + distance + mainSet sync | ✅ |
| Jogging "45 min EF" → 30min/5km | mainSet "30 min..." | ✅ |
| Footing "60 min en deux moitiés" → 40min | mainSet "40 min en deux moitiés" | ✅ |
| Fractionné "6 × 800 m" → scale | mainSet INCHANGÉ | ✅ |
| Renforcement "Squats 3×9" → scale | mainSet INCHANGÉ | ✅ |
| Tempo "20 min seuil" → scale | mainSet INCHANGÉ | ✅ |
| Côtes "10 × 200m" → scale | mainSet INCHANGÉ | ✅ |
| Hyrox "8 × 1 km" → scale | mainSet INCHANGÉ | ✅ |
| Marche-Course → scale | mainSet INCHANGÉ | ✅ |
| Jogging mal typé (mainSet "6 × 200m") | distance NON touchée | ✅ |
| Idempotence (3 appels) | résultat stable | ✅ |

### `src/services/__tests__/planValidator-mainset-mismatch.test.ts` (8 tests)

| Cas | Attendu | Status |
| --- | ------- | ------ |
| SL 60min mainSet "116 min" (steph-fanny) | mismatch detected | ✅ |
| Footing 8km mainSet "12 km" | mismatch detected | ✅ |
| Fractionné "3 × 1km" + dur 45min | SKIP (type risky) | ✅ |
| Renforcement "Squats 3×9" + total 50min | SKIP (type risky) | ✅ |
| SL cohérente 60min / "60 min" | pas de mismatch | ✅ |
| SL 60min mainSet "42 min" (drift 30 %) | mismatch detected | ✅ |
| SL 60min mainSet "55 min" (drift 8 %) | sous seuil 20 % → pas de mismatch | ✅ |
| Pas de mainSet | early return clean | ✅ |

---

## Résultats consolidés

```
Test Files  12 passed (12)
Tests       216 passed (216)
```

- **Baseline pre-Sprint2** : 9 fichiers / 177 tests
- **Post-Sprint2** : 12 fichiers / 216 tests (**+39 tests anti-régression**)
- Build vite : ✅ (3.84s, aucune nouvelle erreur)
- TypeScript : aucune nouvelle erreur introduite (62 erreurs pré-existantes
  dans des fichiers non modifiés, inchangé)
- Non-régression Sprint 1 (15 profils) : ✅ via `test-sprint1-15-profils.mjs`

---

## Commit + push

```
commit 7d49f37 (HEAD -> main, origin/main)
fix(sprint2): seuils %VMA tenu sur distance + sync mainSet enforceWeekConstraints

 7 files changed, 1011 insertions(+), 13 deletions(-)
  src/services/__tests__/feasibilityService-vma-thresholds.test.ts | 281 +++
  src/services/__tests__/planValidator-mainset-mismatch.test.ts    | 208 +++
  src/services/__tests__/sessionScale-sync-mainset.test.ts         | 216 +++
  src/services/feasibilityService.ts                               |  61 +
  src/services/geminiService.ts                                    |  57 +-
  src/services/planValidator.ts                                    |  79 +
  src/services/sessionScale.ts                                     | 122 +
```

Pushed to `origin/main`. Deploy hosting → Romane après validation.

---

## Sécurité doctrine

- **Whitelist STRICTE** mainSet sync (Sortie Longue / Jogging / Footing
  uniquement). Aucun type non-whitelisté touché.
- **Blacklist explicite** comme double safety net (un nouvel ajout dans la
  whitelist qui collisionnerait avec un type risky est rejeté).
- **Pattern fractionné `X × Y km`** détecté dans le mainSet → distance NON
  modifiée même sur un type whitelisté (cas Gemini mal typé).
- **Idempotence garantie** par l'ancrage `^X min` en début de chaîne et le
  premier `X km` non fractionné.
- **Cap %VMA AMBITIEUX appliqué APRÈS** toutes les pénalités → ne remonte
  jamais un score déjà plus bas (pure sur-protection, jamais sous-protection).
- **Branche `buildFinisherFeasibility` intacte** → steph-fanny Finisher non
  impacté.
