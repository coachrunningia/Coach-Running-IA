# Tests Sprint 2 — 15 profils avant/après

**Date** : 2026-05-19
**Commit avant** : `0435796` (Sprint 1 — Trail Ultra + Senior)
**Commit après** : `7d49f37` (Sprint 2 — seuils %VMA tenu + sync mainSet)
**Runner** : `test-sprint2-15-profils-feasibility.mjs` (reproduction lecture seule)

---

## Synthèse 30 secondes

| Catégorie | Score |
|---|---|
| Profils conformes attendu | **13/15** ✅ |
| Profils "différent mais OK" (effet voulu du fix) | **2/15** ⚠️ |
| Régressions vraies (BON→AMBITIEUX à tort) | **0/15** ❌ |
| Tests Fix D sync mainSet | **5/5** ✅ |
| Tests Validator mainset_duration_mismatch | **5/5** ✅ |
| **mxjulien02 reclassé IRRÉALISTE** | ✅ score 68 → 5 |
| **steph-fanny FINISHER_PATH inchangé** | ✅ (bug séparé, hors scope Sprint 2) |

**Verdict deploy** : ✅ **GO** (aucune régression, comportement attendu sur les 2 "différents mais OK")

---

## Méthodologie

1. Reproduction de `calculateFeasibility` **AVANT** Sprint 2 (commit `0435796`) et **APRÈS** (commit `7d49f37`)
2. Le diff entre les deux versions est isolé à 2 hunks (vérifié via `git diff 0435796 7d49f37 src/services/feasibilityService.ts`) :
   - Hunk 1 (ligne ~441) : ajout du bloc Fix C — seuils %VMA tenu (IRRÉALISTE strict + cap AMBITIEUX retenu)
   - Hunk 2 (ligne ~711) : application du cap AMBITIEUX juste avant `clamp` final
3. Tous les autres helpers (R2 gates, parseTargetTime, getVmaFactor, BMI, blessures, plans courts, etc.) sont **identiques avant/après** — leurs reproductions sont partagées entre les deux versions
4. Le path **Finisher** (`buildFinisherFeasibility`) **n'a PAS été modifié** par Sprint 2 → profils #9, #13, #14, #15 retournent `FINISHER_PATH` (non testés mais vérifiés identiques par le diff git)
5. Pour Fix D : reproduction fidèle de `applySessionScale` + `isMainSetSyncable`
6. Pour Validator : reproduction fidèle de `checkMainsetDurationMismatch`

---

## 15 profils détaillés

### Profil #1 — Élite club 5K 18 min
- **Inputs** : VMA 19.5, 5K en 18 min, Expert, 12 sem, vol 70, chrono OK
- **AVANT** : score **95** / EXCELLENT | gap −11.2% | pctVmaTenu 85.5%
- **APRÈS** : score **95** / EXCELLENT | pctVmaTenu 85.5%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — 85.5% VMA reste largement sous le seuil 5K ambitious (93%)

### Profil #2 — Régulier 5K 22 min
- **Inputs** : VMA 16, 5K en 22 min, Confirmé, 10 sem, vol 35, chrono OK
- **AVANT** : score **95** / EXCELLENT | gap −11.5% | pctVmaTenu 85.2%
- **APRÈS** : score **95** / EXCELLENT | pctVmaTenu 85.2%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — bien sous le seuil 5K

### Profil #3 — Régulier 5K 25 min ambitieux
- **Inputs** : VMA 13, 5K en 25 min, Intermédiaire, 12 sem, vol 25, chrono OK
- **AVANT** : score **91** / EXCELLENT | gap −2.9% | pctVmaTenu 92.3%
- **APRÈS** : score **91** / EXCELLENT | pctVmaTenu 92.3%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — 92.3% < seuil 93% (5K), juste sous → aucun cap appliqué

### Profil #4 — Régulier 10K 50 min ⚠️
- **Inputs** : VMA 13, 10K en 50 min, Intermédiaire, 12 sem, vol 30, chrono OK
- **AVANT** : score **93** / EXCELLENT | gap 2.5% | pctVmaTenu 92.3%
- **APRÈS** : score **60** / AMBITIEUX | pctVmaTenu 92.3%
- **Δ score** : −33
- **Verdict** : ⚠️ **Différent mais OK** — 92.3% > seuil 10K ambitious 90% → cap 60 appliqué
- **Justification physiologique** : tenir 92.3% VMA sur 10 km est physiologiquement **au-dessus du seuil lactique** pour un Intermédiaire — un coureur Régulier ne tient pas plus de ~90% VMA sur 40 min d'effort (Daniels VDOT). Le reclassement AMBITIEUX est correct.
- **Note** : ce profil sortait EXCELLENT à AVANT car le gap théorique (2.5%) est faible, mais le théorique utilise `getVmaFactor(10) = 0.90` — donc passer à 92.3% VMA tenu rend bien l'effort ambitieux.

### Profil #5 — Confirmé 10K 38 min
- **Inputs** : VMA 17.5, 10K en 38 min, Confirmé, 12 sem, vol 50, chrono OK
- **AVANT** : score **99** / EXCELLENT | gap 0.2% | pctVmaTenu 90.2%
- **APRÈS** : score **60** / AMBITIEUX | pctVmaTenu 90.2%
- **Δ score** : −39
- **Verdict** : ⚠️ **Différent mais OK** — 90.2% > 90% (de poil) → cap 60 AMBITIEUX
- **Justification coach** : 10K à 90.2% VMA pour un Confirmé reste un objectif **gros effort** (allure proche du temps de course optimal). Le cap AMBITIEUX souligne qu'il n'y a plus de marge → coach honnête.
- **Edge case** : à VMA 17.5 + 38 min = pile sur la frontière (90.2%). Si Romane juge ce reclassement trop strict, il faudrait remonter le seuil à 91% pour 10K. Mais doctrine Daniels = 90% est la borne haute physiologique.

### Profil #6 — mxjulien02 — Intermédiaire Semi 2h00 VMA 10.8 ✅
- **Inputs** : VMA 10.8, Semi en 2h00, Intermédiaire, 19 sem, vol 25, chrono OK
- **AVANT** : score **68** / AMBITIEUX | gap 13.0% | vmaRatio 115% | pctVmaTenu **97.7%** ← BUG
- **APRÈS** : score **5** / IRRÉALISTE | pctVmaTenu 97.7%
- **Δ score** : −63
- **Verdict** : ✅ **FIX CONFIRMÉ** — 97.7% > seuil semi unrealistic 93% → IRRÉALISTE strict
- **Justification** : tenir 97.7% VMA pendant 21 km = physiologiquement impossible (zone allure 5K, durée 4× supérieure). Avant Sprint 2, la gate `vmaRatioPercent >= 130` (asymétrique via `getVmaFactor`) laissait passer ce cas (vmaRatio = 115% < 130). Le nouveau seuil "pctVmaTenu absolu" colle au vrai seuil lactique.

### Profil #7 — Confirmé Semi 1h30
- **Inputs** : VMA 16, Semi en 1h30, Confirmé, 14 sem, vol 50, chrono OK
- **AVANT** : score **90** / EXCELLENT | gap 3.3% | pctVmaTenu 87.9%
- **APRÈS** : score **90** / EXCELLENT | pctVmaTenu 87.9%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — 87.9% < 88% (de 0.1 point), pas de cap appliqué
- **Note** : cas frontière mais on respecte le seuil strict `>` (pas `>=`). Cohérent avec le test.

### Profil #8 — Intermédiaire Semi 1h45 VMA 13
- **Inputs** : VMA 13, Semi en 1h45, Intermédiaire, 14 sem, vol 40, chrono OK
- **AVANT** : score **79** / BON | gap 8.4% | pctVmaTenu 92.7%
- **APRÈS** : score **60** / AMBITIEUX | pctVmaTenu 92.7%
- **Δ score** : −19
- **Verdict** : ✅ Conforme — 92.7% > 88% (seuil semi ambitious) → cap 60
- **Justification** : tenir 92.7% VMA sur 21 km pour un Intermédiaire est très ambitieux. Le reclassement BON→AMBITIEUX est légitime.

### Profil #9 — Débutant Marathon Finisher VMA 11
- **Inputs** : VMA 11, Marathon Finisher, Débutant, 20 sem, vol 30, sans chrono
- **AVANT** : FINISHER_PATH (buildFinisherFeasibility)
- **APRÈS** : FINISHER_PATH (identique)
- **Verdict** : ✅ Conforme — path Finisher non touché par Sprint 2 (diff git confirme aucune modif de `buildFinisherFeasibility`)

### Profil #10 — Pfitzinger Type A Marathon 3h00 VMA 17
- **Inputs** : VMA 17, Marathon en 3h00, Confirmé, 18 sem, vol 70, chrono OK
- **AVANT** : score **90** / EXCELLENT | gap 3.3% | pctVmaTenu 82.7%
- **APRÈS** : score **90** / EXCELLENT | pctVmaTenu 82.7%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — 82.7% < seuil marathon ambitious 83% → pas de cap
- **Note** : cas idéal Daniels — sub-3h VMA 17 + 18 sem + vol 70 = config standard pour cet objectif.

### Profil #11 — Marathon 3h00 VMA 16 ambitieux
- **Inputs** : VMA 16, Marathon en 3h00, Confirmé, 18 sem, vol 65, chrono OK
- **AVANT** : score **78** / BON | gap 9.0% | pctVmaTenu 87.9%
- **APRÈS** : score **60** / AMBITIEUX | pctVmaTenu 87.9%
- **Δ score** : −18
- **Verdict** : ✅ Conforme — 87.9% < seuil marathon unrealistic 88% mais > ambitious 83% → cap 60
- **Justification** : sub-3h marathon à VMA 16 = très ambitieux (besoin ~85% VMA tenu marathon = OK, mais ici 88%). Le reclassement BON→AMBITIEUX est cohérent doctrine.

### Profil #12 — Marathon 3h30 VMA 16 confort
- **Inputs** : VMA 16, Marathon en 3h30, Confirmé, 16 sem, vol 55, chrono OK
- **AVANT** : score **95** / EXCELLENT | gap −6.2% | pctVmaTenu 75.3%
- **APRÈS** : score **95** / EXCELLENT | pctVmaTenu 75.3%
- **Δ score** : 0
- **Verdict** : ✅ Conforme — 75.3% bien sous seuil marathon ambitious 83%

### Profil #13 — Trail 30km/1500D+ Confirmé Finisher
- **Inputs** : VMA 15, Trail 30 km/1500 D+, Confirmé, 14 sem, vol 45, sans chrono
- **AVANT/APRÈS** : FINISHER_PATH
- **Verdict** : ✅ Conforme — path Finisher non touché Sprint 2

### Profil #14 — Ultra 100 km Expert Finisher
- **Inputs** : VMA 14, Trail 100 km/5000 D+, Expert, 26 sem, vol 80, sans chrono
- **AVANT/APRÈS** : FINISHER_PATH
- **Verdict** : ✅ Conforme — path Finisher inchangé

### Profil #15 — steph-fanny — Intermédiaire 10K Finisher VMA 8 60 ans
- **Inputs** : VMA 8, 10K Finisher, Intermédiaire, 21 sem, vol 20, 60 ans, sans chrono
- **AVANT/APRÈS** : FINISHER_PATH
- **Verdict** : ✅ Conforme — path Finisher inchangé
- **Note** : le bug EXCELLENT 95 sur ce profil ne sera **pas** corrigé par Sprint 2 (path différent). C'est un flag séparé à traiter dans un sprint dédié.

---

## Synthèse profils

| # | Profil | AVANT | APRÈS | Δ | Verdict |
|---|---|---|---|---|---|
| 1 | Élite 5K 18min | 95 EXCELLENT | 95 EXCELLENT | 0 | ✅ |
| 2 | Régulier 5K 22min | 95 EXCELLENT | 95 EXCELLENT | 0 | ✅ |
| 3 | Régulier 5K 25min | 91 EXCELLENT | 91 EXCELLENT | 0 | ✅ |
| 4 | Régulier 10K 50min | 93 EXCELLENT | 60 AMBITIEUX | −33 | ⚠️ effet voulu (92.3% > 90%) |
| 5 | Confirmé 10K 38min | 99 EXCELLENT | 60 AMBITIEUX | −39 | ⚠️ effet voulu (90.2% borderline) |
| 6 | mxjulien02 Semi 2h00 VMA 10.8 | 68 AMBITIEUX | 5 IRRÉALISTE | −63 | ✅ FIX |
| 7 | Confirmé Semi 1h30 | 90 EXCELLENT | 90 EXCELLENT | 0 | ✅ |
| 8 | Inter Semi 1h45 VMA 13 | 79 BON | 60 AMBITIEUX | −19 | ✅ (92.7% > 88%) |
| 9 | Déb Marathon Finisher | FINISHER | FINISHER | — | ✅ |
| 10 | Pfitz Marathon 3h00 VMA 17 | 90 EXCELLENT | 90 EXCELLENT | 0 | ✅ |
| 11 | Marathon 3h00 VMA 16 | 78 BON | 60 AMBITIEUX | −18 | ✅ (87.9% > 83%) |
| 12 | Marathon 3h30 VMA 16 confort | 95 EXCELLENT | 95 EXCELLENT | 0 | ✅ |
| 13 | Trail 30/1500 Confirmé | FINISHER | FINISHER | — | ✅ |
| 14 | Ultra 100km Expert | FINISHER | FINISHER | — | ✅ |
| 15 | steph-fanny 10K Finisher | FINISHER | FINISHER | — | ✅ |

**Compte final** :
- ✅ Conforme attendu : **13/15**
- ⚠️ Différent mais OK : **2/15** (profils #4 et #5 — reclassement légitime selon Daniels VDOT)
- ❌ Régression vraie : **0/15**

---

## Tests Fix D — sync mainSet (5 cas séances)

### S1 — Sortie Longue 1h30/8km → cap 1h00/5.3km
- **BEFORE** : duration `1h30` | distance `8 km` | mainSet `"8 km à 11:12/km"`
- **AFTER cap** : duration `1h00` | distance `5.3 km` | mainSet `"5.3 km à 11:12/km"`
- **syncable?** `true` | **fractional?** `false`
- **Verdict** : ✅ **sync correct** — la SL est whitelistée, pas de pattern fractionné détecté, donc "8 km" remplacé par "5.3 km" comme attendu

### S2 — Footing 1h00/5.4km (pas de cap mais mainSet desynced)
- **BEFORE** : duration `1h00` | distance `5.4 km` | mainSet `"42 min en deux moitiés"`
- **AFTER apply** : duration `1h00` | distance `5.4 km` | mainSet `"60 min en deux moitiés"`
- **syncable?** `true` | **fractional?** `false`
- **Verdict** : ✅ **Comportement correct** — le mainSet desynced ("42 min" alors que duration officielle = 60) est réaligné à 60 min. **C'est exactement l'effet voulu** : la sync corrige les drifts existants même sans cap (cas concret : si une étape précédente a touché duration mais pas mainSet)
- **Note importante** : ce cas illustre que `applySessionScale` est **idempotent + auto-correctif**. Si Romane veut éviter la réécriture quand newDur = duration actuelle, il faut ajouter un check `if (newDurMin !== parseDurationMin(session.duration))`. Mais pour la cause racine du bug steph-fanny (mainSet drifted), le comportement actuel est SOUHAITABLE.

### S3 — Fractionné 45min/6.5km → cap 40min/5.5km
- **BEFORE** : duration `45 min` | distance `6.5 km` | mainSet `"6 × 800 m à 4:00"`
- **AFTER cap** : duration `40 min` | distance `5.5 km` | mainSet `"6 × 800 m à 4:00"` ← **INCHANGÉ**
- **syncable?** `false` (blacklist + fractional pattern)
- **Verdict** : ✅ **mainSet intact** — duration/distance scalées, mainSet protégé par double safety (blacklist + pattern frac)

### S4 — Renforcement 30min/0km
- **BEFORE** : duration `30 min` | distance `0 km` | mainSet `"Squats 3×9, Gainage 3×30s"`
- **AFTER** : INCHANGÉ
- **syncable?** `false` (blacklist Renforcement + pattern "3×9")
- **Verdict** : ✅ **mainSet intact** — renforcement protégé

### S5 — Trail montagne 2h/15km → cap 1h45/13km
- **BEFORE** : duration `2h` | distance `15 km` | mainSet `"Côtes 5 × 200 m D+"`
- **AFTER cap** : duration `1h45` | distance `13 km` | mainSet `"Côtes 5 × 200 m D+"` ← **INCHANGÉ**
- **syncable?** `false` (blacklist Trail + pattern "5 × 200")
- **Verdict** : ✅ **mainSet intact** — trail protégé

**Total Fix D : 5/5 ✅**

---

## Tests Validator — `mainset_duration_mismatch` (5 cas)

### V1 — SL "8 km @ 11:12" + duration 1h00 (cas steph-fanny initial)
- **Detection** : ⚠️ DETECTED — `mainSet 8km ≠ distance 5.4km (écart 48%)`
- **Verdict** : ✅ Conforme — le validator détecte bien le bug original

### V2 — SL "5.3 km @ 11:12" + duration 1h00 (cohérent)
- **Detection** : ✅ Pas de mismatch
- **Verdict** : ✅ Conforme — aucun faux positif

### V3 — Fractionné "6×800m" + 45min
- **Detection** : ✅ Pas de mismatch (skip via blacklist `MAINSET_RISKY_TYPES.has('Fractionné')`)
- **Verdict** : ✅ Conforme — skip correct

### V4 — Footing "42 min" + 1h00 (écart 30%)
- **Detection** : ⚠️ DETECTED — `mainSet 42min ≠ duration 60min (écart 30%)`
- **Verdict** : ✅ Conforme — détection au-delà du seuil 20%

### V5 — Jogging "60 min EF" + 30 min
- **Detection** : ⚠️ DETECTED — `mainSet 60min ≠ duration 30min (écart 100%)`
- **Verdict** : ✅ Conforme — gros écart bien repéré

**Total Validator : 5/5 ✅**

---

## Verdict deploy

### ✅ **GO deploy**

**Critères tous remplis** :
1. ✅ 0 régression vraie sur les 15 profils (les 2 "différents" #4 et #5 sont des reclassements **physiologiquement légitimes** validés par doctrine Daniels VDOT — pas des bugs)
2. ✅ mxjulien02 reclassé **IRRÉALISTE** (score 68 → 5) comme attendu
3. ✅ Fix D sync mainSet ne casse aucun type protégé (Fractionné / Renforcement / Trail / Côtes) — 5/5
4. ✅ Validator détecte les vrais bugs (V1, V4, V5) sans faux positifs (V2, V3) — 5/5

### ⚠️ Points de vigilance avant deploy

**Vigilance #1 — Profils proches du seuil 10K ambitious 90%**

Le profil #5 (Confirmé 10K 38min VMA 17.5 → 90.2% VMA tenu) est **borderline** (0.2 point au-dessus du seuil). Sur le terrain, certains plans Confirmés à 10K 90/91% VMA tenu sortaient EXCELLENT avant et sortiront AMBITIEUX cap 60 après.

→ **Recommandation** : si tu observes en prod plusieurs Confirmés avec un objectif 10K très ciblé qui sortent AMBITIEUX, on peut ajuster le seuil à `0.91` pour 10K (mais doctrine = 90% est la borne haute physiologique stricte).

**Vigilance #2 — S2 Footing avec mainSet desynced réaligné automatiquement**

Quand `applySessionScale` est appelé sans changement de duration mais avec un mainSet drifted ("42 min" pour duration 60 min), la sync **corrige automatiquement** le mainSet à 60 min. C'est **l'effet voulu** pour résoudre la cause racine du bug steph-fanny, mais pourrait surprendre si on regarde un seul cas isolé.

→ **Pas de correction nécessaire** : le comportement est idempotent et auto-corrige les drifts existants en base.

**Vigilance #3 — Path Finisher non touché**

Les profils #9, #13, #14, #15 passent via `buildFinisherFeasibility` qui **n'est PAS** modifié par Sprint 2. Le bug steph-fanny (EXCELLENT 95 alors que VMA 8 + 60 ans + 10K à 21 sem) reste donc à corriger dans un sprint ultérieur (Sprint 3 dédié path Finisher).

---

## Annexes

### Diff exact Sprint 2 sur feasibilityService.ts
```
git diff 0435796 7d49f37 -- src/services/feasibilityService.ts | grep "^[+-]" | wc -l
→ 79 lignes ajoutées, 0 ligne supprimée
→ 2 hunks : ajout bloc seuils %VMA (l.441) + ajout cap après pénalités (l.711)
→ Tout le reste du fichier identique
```

### Fichiers concernés Sprint 2 (lecture seule)
- `src/services/feasibilityService.ts` (Fix C — seuils %VMA tenu)
- `src/services/sessionScale.ts` (Fix D — applySessionScale + isMainSetSyncable)
- `src/services/geminiService.ts` (intégration enforceWeekConstraints + buildFootingVariant déplacé)
- `src/services/planValidator.ts` (règle `mainset_duration_mismatch`)
- Tests : `feasibilityService-vma-thresholds.test.ts` (15), `sessionScale-sync-mainset.test.ts` (16), `planValidator-mainset-mismatch.test.ts` (8) — **39 tests anti-régression ajoutés**

### Runner
`/Users/romanemarino/Coach-Running-IA/test-sprint2-15-profils-feasibility.mjs`
→ exécution : `node test-sprint2-15-profils-feasibility.mjs`
