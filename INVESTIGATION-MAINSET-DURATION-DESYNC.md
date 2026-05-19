# Investigation bug `mainSet` ↔ `duration`/`distance` désync

**Plan déclencheur** : `1779185876450` (steph-fanny@laposte.net, Sorenza, 60 ans, F)
**Date** : 2026-05-19
**Mode** : lecture seule (aucune modif appliquée)

---

## 1. Reproduction du bug

### Profil steph-fanny
- Objectif : `10 km — Finisher — 21 sem`
- Sexe : Femme, 60 ans
- Niveau déclaré : `Intermédiaire (Régulier)` → `inter` (préservé par fix #5a senior ≥55)
- VMA : 8 km/h (corrigée depuis `5km en 46min`)
- `currentWeeklyVolume` : 20 km
- `frequency` : 3
- Paces calculées : `efPace=11:12`, `recoveryPace=12:30`
- `weeklyVolumes[0] = 20 km`

### S1 observée (Firestore)

| Jour | Type | `duration` | `distance` | `targetPace` | `mainSet` | Cohérence |
|------|------|------------|------------|--------------|-----------|-----------|
| Mardi | **Sortie Longue** (sic) `title="Footing progressif (négative split)"` | `1h00` | `5.4 km` | `11:12` | `"116 min en deux moitiés..."` | **DÉSYNC : mainSet décrit 116 min** ; 60 min total à 11:12 = 5.36 km (cohérent dist) mais mainSet hors-sujet |
| Jeudi | Renforcement | `30 min` | `0.0 km` | — | (circuit renfo) | OK |
| Dimanche | Sortie Longue | `1h00` | `5.3 km` | `11:12` | `"8.0 km de course continue à 11:12 min/km"` | **DÉSYNC : mainSet décrit 8 km** ; 60 min à 11:12 = 5.36 km (cohérent dist) mais mainSet hors-sujet |

**Lecture forte** : `mainSet Mardi (116 min EF à 11:12) = 10.36 km` + `mainSet Dimanche (8.0 km à 11:12) = 89.6 min ≈ 90 min` + warmup/cooldown (~2 km) ≈ **20 km, soit pile `weeklyVolumes[0]`**. → Les `mainSet` reflètent l'**état pré-cap** ; `duration`/`distance` ont été **divisés par ~2** par post-traitement.

---

## 2. Audit autres plans (scan textuel)

Scanner Python sur tous les `audit-*.json` du repo, critère strict (mention `Xmin/Xkm` dans `mainSet` dépassant `duration+5` / `distance×1.30`) :

```
REAL BUGS: 51 séances
audit-orphelins-correct.json        28
audit-premium-fullPlanGenerated.json 20
audit-24h-non-vus-plans.json         3
```

Types touchés :
- **Sortie Longue** (ex : 1773143911561 Dimanche `1h45 / 14 km / mainSet "120min"`)
- **Jogging / Footing** (ex : 1774982922486 Mardi `29 min / 3.3 km / mainSet "35min"`)
- **Endurance Fondamentale** type custom (ex : 1774110422631 Jeudi `48 min / 6 km / mainSet "8.7 km"`)
- 1 cas `Renforcement` (1774110422631 Mercredi `29 min / mainSet "40min"`) — anomalie minoritaire

Le bug n'est **pas spécifique** à VMA basse / Finisher 60+ : il touche aussi Marathon Confirmé, Trail, débutant, etc. **C'est un bug structurel du pipeline.**

---

## 3. Flow code analysé

### Pipeline `generatePreviewPlan` (S1) — `geminiService.ts:3304`
Ordre des opérations sur le plan retourné par Gemini :

1. **L.4016** `enforceSLDay(plan.weeks[0], ...)` — Place la SL sur le bon jour, dédup si 2+ SL → l'une retypée Jogging.
2. **L.4069-4092** Injection déterministe **Renforcement** (mainSet, warmup, cooldown, duration tous écrits par le code via `buildRenfoMainSet`).
3. **L.4094-4125** Injection **variantes de footing** (`buildFootingVariant`) — **ÉCRIT mainSet, warmup, cooldown** sur les `type === 'Jogging' && intensity === 'Facile'` en phase fondamental/récupération.
4. **L.4130** `postProcessWeekQuality(week, paces, ...)` — Tutoiement, injection allure dans warmup/cooldown/mainSet si manquante.
5. **L.4134** **`enforceWeekConstraints(week, targetVol, data)`** — **MODIFIE duration et distance** sur de nombreuses règles (cap SL, cap non-SL, scale down/up volume, etc.) **SANS toucher mainSet**.
6. **L.4137** `enforceFullPlanConstraints(...)` — Cross-week guard (affûtage, progression +15%/sem) → scaleWeekVolume modifie aussi duration/distance.

### Fonction critique : `buildFootingVariant` (`footingVariants.ts:282`)

```ts
const totalMin = parseDurationToMin(durationStr);     // ← durée AVANT enforce
const bodyMin  = Math.max(20, totalMin - 18);          // body = total - 18 (warmup+cooldown)
return {
  mainSet: variant.buildMainSet(bodyMin, pace),       // ← écrit en dur dans le mainSet
  ...
};
```

Pour la variante `footing_negative_split` (l.66-76 de `footingVariants.ts`) :
```ts
buildMainSet: (m, p) => `${m} min en deux moitiés : la 1re très tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de ${p}...`
```
→ **exactement le mainSet observé sur la séance Mardi de steph-fanny.**

`m = 116` ⇒ `totalMin = 134` ⇒ **Gemini a généré `duration = "2h14"` pour Mardi**, ensuite cappée à `1h00`.

### Fonction critique : `enforceWeekConstraints` (`geminiService.ts:1288`)

10 sites de mutation `s.duration = ...` / `s.distance = ...`, **aucun ne touche `s.mainSet`** :

| Ligne | Règle | Mutations |
|-------|-------|-----------|
| 1322-1329 | Cap SL > `MAX_SL_DURATION[obj][lvl]` | duration, distance |
| 1366-1373 | Boost SL trop courte vs `minSLRatios` | duration, distance |
| 1386-1393 | Cap non-SL > 75 % SL max | duration, distance |
| 1443-1453 | Réajustement proportion SL/total | duration, distance |
| 1462-1467 | Plancher SL min duration | duration, distance |
| 1478-1483 | Forcer SL > toute autre session | duration, distance |
| 1495-1500 | Cap session > `MAX_SESSION_KM` | duration, distance |
| 1586-1597 | Cap volume hebdo absolu | duration, distance |
| 1613-1622 | Scale DOWN volume > target ×1.10 | duration, distance |
| 1626-1658 | Scale UP volume < target ×0.80 | duration, distance |
| 1733-1736 | Repos actif conversion (avec mainSet réécrit ✔) | les 3 |
| 1735, 1862, 1909, 1973 | Variation footings, autres caps | duration, distance |

**24 mutations duration/distance contre 16 mutations mainSet, et la majorité des 16 sont des cas particuliers** (renfo, conversion en repos, conversion en récupération, séances dédupliquées). Aucune règle générique « si je touche `duration`/`distance`, je recompose le `mainSet` ».

### Le seul recalcul de cohérence existant : `recalculateSessionDistance` (`geminiService.ts:604`)

Ré-aligne `distance` sur `duration × targetPace` (tolérance 10 %). **Mais ne touche jamais le `mainSet`**. Appelé uniquement à L.820 (back-to-back ultra), L.850 (dédup SL) et L.881 (anti-2 longs consécutifs).

### Le prompt LLM demande la cohérence (L.3708-3711, L.3864-3867, L.4560)
```
COHÉRENCE DURÉE/DISTANCE/MAINSET (CRITIQUE) :
Le champ "duration" et le contenu du "mainSet" doivent être IDENTIQUES.
Si duration = "45 min", le mainSet ne doit PAS décrire 1h20 de course.
```
→ Gemini respecte ce contrat (les `mainSet` produits collent à la duration **qu'il a lui-même proposée**). Le contrat est cassé **uniquement** par le post-traitement.

---

## 4. Cause racine

**Bug systémique en 2 mécaniques cumulables** :

### Mécanique A — Footings/Joggings (Mardi steph-fanny)
1. Gemini génère `Mardi : Jogging Facile, duration "2h14" (134 min)` (le LLM ne sait pas que `MAX_SL_DURATION[10K][inter]=75` ni les autres caps appliqués downstream).
2. `buildFootingVariant` est appelée **avant** le cap → sélectionne `footing_negative_split`, calcule `bodyMin = 134 - 18 = 116`, écrit `mainSet = "116 min en deux moitiés..."`.
3. `enforceWeekConstraints` détecte `dur=134` ≥ `slDurationThreshold=65` → retype en `Sortie Longue` (l.1316-1319), puis cap à `maxSlDur` et redimensionnement de `distance` proportionnel. `mainSet` jamais touché.
4. Le scale-down/cap successifs amènent à `1h00 / 5.4 km`.
5. → `mainSet` conserve la signature `"116 min"` figée à l'étape 2.

### Mécanique B — Sorties Longues (Dimanche steph-fanny)
1. Gemini génère `Dimanche : Sortie Longue, duration "1h30" (~90 min) / 8 km / mainSet "8.0 km de course continue à 11:12"`.
2. Pas de `buildFootingVariant` (filtre `type === 'Jogging'`, l.4105) — `mainSet` reste celui du LLM, cohérent à 90min/8km.
3. `enforceWeekConstraints` cap la SL à `maxSlDur` (75 min en théorie pour inter ; valeur capée plus bas, certainement par `enforceFullPlanConstraints.scaleWeekVolume` après recalibration cross-semaines à `weeklyVolumes[0]=20`). `distance` rescalée. `mainSet` jamais touché.
4. → `mainSet "8.0 km"` figé alors que `distance` réelle = 5.3 km.

### Hypothèses validées / invalidées

| # | Hypothèse | Verdict |
|---|-----------|---------|
| H1 | LLM incohérent | ❌ Le LLM est cohérent à l'instant T ; c'est le pipeline qui casse la cohérence |
| H2 | Recalcul interne post-LLM bugué | ✅ partiellement — `recalculateSessionDistance` ré-aligne distance/duration sur targetPace, mais sans toucher mainSet |
| H3 | Bug parsing `"1h56" → 1.56h → 60min` | ❌ `parseDurationMin` (planUtils.ts:14) gère correctement `1h00`, `1h56`, `1h 30 min` |
| H4 | Cap aggressif sans réécrire mainSet | ✅ **C'est la racine** pour la SL Dimanche |
| H5 | Le code force `duration ≤ 60min` pour 60+ Finisher | ❌ Pas de cap dépendant de l'âge ; le 60min vient d'une chaîne `enforceFullPlanConstraints.scaleWeekVolume` (cap après scale down progression) |
| H6 | Deux calls LLM séparés produisent duration / mainSet | ❌ Les deux viennent du même appel |

**Synthèse** : H4 confirmée pour SL ; **nouvelle hypothèse H7 = "ordre d'opérations : variante footing appliquée AVANT cap duration"** confirmée pour Jogging. Aucune des deux n'invalide l'autre.

---

## 5. Fix code proposé

Deux fix minimaux complémentaires.

### Fix #1 — Recomposer `mainSet` après chaque mutation de `duration`/`distance` dans `enforceWeekConstraints`

Approche : factoriser un helper `applyDurationChange(session, newDurMin, newKm?, paces?)` qui modifie `duration`, `distance` ET **réécrit le mainSet en respectant le template existant** (regex de remplacement des nombres + format `Xh YY` / `Y min` / `Z km`).

**Fichier** : `src/services/geminiService.ts`

**AVANT** (exemple L.1322-1328) :
```ts
if (dur > maxSlDur) {
  const factor = maxSlDur / dur;
  s.duration = formatDurationStr(maxSlDur);
  const km = parseKm(s.distance);
  if (km > 0) s.distance = `${Math.round(km * factor * 10) / 10} km`;
  console.log(`[Enforce] SL capped: ${dur}min → ${maxSlDur}min [${objective} ${level}]`);
}
```

**APRÈS** (proposition) :
```ts
if (dur > maxSlDur) {
  const factor = maxSlDur / dur;
  const oldDur = dur;
  const oldKm = parseKm(s.distance);
  const newKm = oldKm > 0 ? Math.round(oldKm * factor * 10) / 10 : 0;
  applySessionScale(s, maxSlDur, newKm, oldDur, oldKm);
  console.log(`[Enforce] SL capped: ${dur}min → ${maxSlDur}min [${objective} ${level}]`);
}
```

Et le helper (à ajouter au-dessus de `enforceWeekConstraints`) :
```ts
/**
 * Applique un changement de durée + distance à une séance ET synchronise le mainSet.
 * Remplace dans le mainSet tous les patterns " 116 min " / " 8 km " / " 1h45 "
 * par les nouvelles valeurs proportionnelles. Si pas de pattern trouvé,
 * suffixe un avertissement plutôt que de laisser un mainSet périmé.
 */
const applySessionScale = (
  s: any,
  newDurMin: number,
  newKm: number,
  oldDurMin: number,
  oldKm: number,
): void => {
  if (newDurMin > 0) s.duration = formatDurationStr(newDurMin);
  if (newKm > 0) s.distance = `${newKm} km`;
  if (!s.mainSet) return;
  let ms: string = s.mainSet;

  // 1. Remplacer la première occurrence d'une durée "Xh YY" ou "X min" en début de mainSet
  //    par la nouvelle duration body (= newDurMin - 18min warmup/cooldown, plancher 20)
  const bodyMin = Math.max(20, newDurMin - 18);
  ms = ms.replace(
    /^(\s*)(\d+\s*h\s*\d*|\d+\s*min)/i,
    `$1${bodyMin} min`,
  );

  // 2. Remplacer la première mention "X km" / "X,Y km" / "X.Y km"
  if (newKm > 0) {
    ms = ms.replace(
      /(\d+(?:[.,]\d+)?)\s*km(?!\/h)/,
      `${newKm} km`,
    );
  }

  s.mainSet = ms;
};
```

Puis remplacer tous les blocs des lignes 1322-1499 / 1593 / 1619 / 1648 / 1734 / 1862 / 1909 / 1974 par des appels à `applySessionScale` (avec passage de `oldDurMin`, `oldKm`).

**Risque non-régression** :
- Les `mainSet` Sortie Longue type `"8.0 km de course continue"` → bien réécrits en `"5.3 km de course continue"`.
- Les Joggings post-`buildFootingVariant` type `"116 min en deux moitiés"` → réécrits en `"42 min en deux moitiés"` (60 min total - 18 = 42 min body).
- Renfo : ignoré car `type === 'Renforcement'` filtré (déjà fait dans tous les enforce).
- **CAS LIMITE** : mainSet sans pattern numérique (rare) → silent no-op, mais `duration`/`distance` mis à jour quand même. Préférable au statu quo.

### Fix #2 — Repousser `buildFootingVariant` APRÈS `enforceWeekConstraints`

Approche structurelle plus propre : ne composer le mainSet décoratif **qu'après** que `duration` ait été figée.

**Fichier** : `src/services/geminiService.ts`

**AVANT** (Preview L.4094-4137) :
```ts
// 1. buildFootingVariant      → écrit mainSet avec totalMin pré-cap
// 2. postProcessWeekQuality   → tutoiement
// 3. enforceWeekConstraints   → cap duration/distance (mainSet déjà figé)
// 4. enforceFullPlanConstraints
```

**APRÈS** :
```ts
// 1. postProcessWeekQuality   → tutoiement + injection allure
// 2. enforceWeekConstraints   → cap duration/distance (mainSet pas encore composé)
// 3. enforceFullPlanConstraints
// 4. buildFootingVariant      → compose mainSet avec duration FINALE
// 5. injection renfo          (à laisser ici car le renfo a sa propre duration figée)
```

**Risque** : un re-test bout-en-bout est nécessaire. Certains blocs de `postProcessWeekQuality` (l.704, l.842, l.878) **réécrivent eux-mêmes le mainSet** en se basant sur `parseDurationMin(s.duration)` actuelle ; ces lignes deviennent redondantes avec Fix #1 et resteraient correctes en Fix #2.

### Recommandation : Fix #1 + Fix #2 combinés

- **Fix #1** est défensif (filet de sécurité général : toute mutation future de duration/distance reste cohérente).
- **Fix #2** corrige la cause d'ordre pour les Joggings — sans lui, le `mainSet` Jogging serait régénéré sur la duration capée mais le `bodyMin` resterait incohérent vs la duration finale (variant.buildMainSet écrirait `42 min` quand le nouveau total est 60 min → bodyMin = 60-18 = 42, OK en fait, mais avec Fix #2 c'est garanti).
- Coût : Fix #2 = déplacer un bloc de 30 lignes ; Fix #1 = ajouter un helper de 25 lignes + remplacer 10 sites de mutation.

### Tests anti-régression à ajouter

1. `__tests__/mainSetSync.test.ts` :
   - Plan 10K Finisher, VMA 8, inter, 60 ans : asserter `bodyMinFromMainSet ≤ durationMin` sur toutes séances S1.
   - Plan Marathon Conf : asserter `kmFromMainSet ≈ kmFromDistance` (tolérance 10 %) sur toutes SL.
2. Étendre `planValidator.ts` (qui n'a actuellement aucune règle mainSet/duration) avec une règle `mainset_duration_mismatch` : `severity: warning` si `mainSet` contient `Xmin > durationMin × 1.1`.

---

## 6. Risque non-régression

| Cas | Impact estimé | Notes |
|-----|--------------|-------|
| Renforcement | Aucun | `type === 'Renforcement'` filtré partout, et `buildRenfoMainSet` est appelé après tout. Le mainSet renfo n'est jamais reformulé par les enforce. |
| Marche/Course | À vérifier | mainSet contient des séquences "2 min course / 1 min marche" — le regex Fix #1 ne touche que le PREMIER token. À tester. |
| Trail D+ | OK | mainSet contient "D+ cible de Xm" déjà mis à jour par `s.mainSet.replace(/D\+ ... \d+ m/, ...)` (L.2171). Le Fix #1 ajoute la cohérence dist/dur. |
| Ultra back-to-back | OK | Déjà géré via `recalculateSessionDistance` (L.820, L.881), Fix #1 améliore. |
| Sessions Hyrox | À vérifier | Le prompt Hyrox a son propre vocabulaire (`8 × 1km`, `tempo Hyrox 20-30min`) — le regex Fix #1 (\d+\s*km) toucherait le `8 × 1km` qui doit rester intact. **Risque réel.** Ajouter une whitelist : ne pas remplacer si le pattern est précédé de `×` / `x` / `fois`. |
| Fartlek `(8 × 30"/30")` | OK | Pas de match sur `min` / `km` standalone. |
| Sessions sans mainSet | OK | Guard `if (!s.mainSet) return`. |

**Action correctrice anti-Hyrox** : raffiner le regex Fix #1 pour ne pas remplacer un `Xkm` ou `Xmin` précédé de `×`, `x`, `fois`, ou suivi de `×` :

```ts
ms = ms.replace(
  /(?<![×x]\s)(\d+(?:[.,]\d+)?)\s*km(?!\/h)(?!\s*[×x])/,
  `${newKm} km`,
);
```

---

## 7. Patch live steph-fanny (proposition)

**Plan** : `1779185876450`, S1 uniquement (preview affichée), patch Firestore manuel.

### Contraintes doctrinaires
- `feedback_jamais_baisser_allure_cible` : OK, on touche EF/volume S1, pas l'allure cible 10K (Finisher = pas d'allure cible saisie de toute façon).
- `feedback_input_client_obligatoire` : currentVol déclaré = 20 km/sem. Le plan actuel livre 10.6 km/sem (Mardi 5.4 + Dimanche 5.3, hors warmup). Sous-livraison de 47 %.
- `feedback_securite_avant_conversion` : 60 ans Finisher VMA 8, ne pas pousser à 90 min de course continue à 11:12 en plein soleil S1.
- `feedback_patch_live_plans_jour_seulement` : S1 commence aujourd'hui (`startDate=2026-05-18`, donc lundi passé). Mardi et Dimanche sont à venir → patchables.
- `feedback_compromis_messages_preventifs` : préférer compromis.

### Analyse stratégique BAS vs HAUT

| Option | Mardi | Dimanche | Total course | vs 20 km déclaré |
|--------|-------|----------|--------------|------------------|
| Aligner sur le BAS (laisser les `distance` actuelles, juste corriger les `mainSet`) | 5.4 km / 1h00 / mainSet `"42 min en deux moitiés..."` | 5.3 km / 1h00 / mainSet `"5.3 km de course continue à 11:12"` | 10.7 km | **-47 %** (sous-livré) |
| Aligner sur le HAUT (réécrire `duration`/`distance` au niveau initialement généré par Gemini) | 10.4 km / 1h56 / mainSet inchangé | 8.0 km / 1h30 / mainSet inchangé | 18.4 km | -8 % (cohérent) MAIS 90 min de course continue à 11:12 pour une 60 ans Finisher S1 = trop ambitieux |
| **Compromis recommandé** | 5.4 km / 1h00 / mainSet `"42 min en deux moitiés..."` | **6.5 km / 1h13 / mainSet `"6.5 km de course continue à 11:12 min/km..."`** | 11.9 km | -40 % (toujours sous le déclaré, mais : S1 = phase de mise en route ; un user à 20 km/sem auto-déclaré peut bien commencer à 12 km/sem si historique non confirmé par Strava) |

**Recommandation** : **compromis**. Aligner Mardi sur duration finale (mainSet recomposé), pousser légèrement Dimanche à 1h13/6.5 km (≈ 87 % de l'objectif déclaré). Ajouter mention dans le `welcomeMessage` si pas déjà : « S1 démarre prudemment à 12 km de course pour confort articulaire ; le volume montera progressivement vers 20 km/sem au fil des semaines. »

### Patch Firestore détaillé

```
plans/1779185876450 → weeks[0].sessions[0] (Mardi)
  mainSet : "116 min en deux moitiés : la 1re très tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de 11:12, toujours conversationnel, jamais essoufflé. Tu termines plus vite que tu n'as commencé. (allure : 11:12 min/km)"
  →
  "42 min en deux moitiés : la 1re très tranquille (bas de l'EF), la 2e dans le haut de l'EF autour de 11:12, toujours conversationnel, jamais essoufflé. Tu termines plus vite que tu n'as commencé. (allure : 11:12 min/km)"

  (duration "1h00" et distance "5.4 km" inchangés)

plans/1779185876450 → weeks[0].sessions[2] (Dimanche)
  duration : "1h00" → "1h 13 min"
  distance : "5.3 km" → "6.5 km"
  mainSet : "8.0 km de course continue en endurance fondamentale (EF) à l'allure de 11:12 min/km. Maintiens une conversation facile et une respiration contrôlée. L'objectif est de tenir la durée sans chercher la vitesse."
  →
  "6.5 km de course continue en endurance fondamentale (EF) à l'allure de 11:12 min/km. Maintiens une conversation facile et une respiration contrôlée. L'objectif est de tenir la durée sans chercher la vitesse."
```

### Si Romane préfère "aligner sur le BAS" (option safe pure)

```
Mardi mainSet "116 min..." → "42 min en deux moitiés..." (idem)
Dimanche mainSet "8.0 km..." → "5.3 km..." (juste rewrite pour cohérence)
```
Inconvénient : sous-livraison maintenue (10.7 km/sem vs 20 km/sem déclaré). À assumer dans le welcomeMessage si on prend cette option.

---

## Annexes

### A. Sites de mutation `duration`/`distance` dans `geminiService.ts` (ne touchent PAS `mainSet`)

L.819, L.842 *, L.873 *, L.1324, L.1326, L.1368, L.1370-1372, L.1388, L.1390, L.1444-1446, L.1453, L.1463, L.1465, L.1479-1481, L.1497, L.1499, L.1591-1593, L.1617-1619, L.1640, L.1648, L.1652-1653, L.1705-1706 †, L.1727, L.1734, L.1846-1850, L.1859, L.1863, L.1907-1909, L.1972-1974.

(* = aussi réécrit mainSet en parallèle, OK ; † = repos actif, distance vidée OK)

### B. Code clé du fix #1 testé sur exemple

Avec `oldDur=134`, `oldKm=10.4`, `newDur=60`, `newKm=5.4` :
- Input mainSet : `"116 min en deux moitiés..."`
- Regex `^(\s*)(\d+\s*h\s*\d*|\d+\s*min)` match `"116 min"` → remplace par `"42 min"` (60 - 18 = 42).
- Output mainSet : `"42 min en deux moitiés..."` ✓

Avec mainSet SL `"8.0 km de course continue à 11:12 min/km..."` et `newKm=5.3` :
- Regex `(\d+(?:[.,]\d+)?)\s*km(?!\/h)` match `"8.0 km"` (le `km/h` lookahead négatif évite de toucher `11:12 min/km`).
- Output : `"5.3 km de course continue à 11:12 min/km..."` ✓

### C. Validator manquant — proposition

Ajouter dans `planValidator.ts:744` une règle `mainset_duration_mismatch` :
```ts
for (const week of weeks) {
  for (const s of week.sessions) {
    if (s.type === 'Renforcement' || s.type === 'Repos') continue;
    const dur = parseDurationMin(s.duration);
    const dist = parseKm(s.distance);
    const minMatches = (s.mainSet || '').match(/(\d+)\s*min(?:utes?)?(?!\/km)/g) || [];
    for (const m of minMatches) {
      const v = parseInt(m);
      if (v >= 30 && dur > 0 && v > dur + 10) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'warning',
          rule: 'mainset_duration_mismatch',
          message: `Séance ${s.day} : mainSet décrit ${v}min mais duration=${s.duration}.`,
        });
        break;
      }
    }
    const kmMatches = (s.mainSet || '').match(/(\d+(?:[.,]\d+)?)\s*km(?!\/h)/g) || [];
    for (const k of kmMatches) {
      const v = parseFloat(k.replace(',', '.'));
      if (v >= 3 && dist > 0 && v > dist * 1.3) {
        issues.push({
          weekNumber: week.weekNumber,
          severity: 'warning',
          rule: 'mainset_distance_mismatch',
          message: `Séance ${s.day} : mainSet décrit ${v}km mais distance=${s.distance}.`,
        });
        break;
      }
    }
  }
}
```
→ Permet de détecter ce bug en CI dès qu'un audit JSON est régénéré, sans dépendre de la review humaine.
