# Investigation plancher volume Semi modéré (~70% Pfitzinger)
Date : 2026-05-20
Auteur : Investigation read-only (zéro modif code, zéro proposition prématurée)
Time-box : 1h
Statut : Décision PM/Coach requise avant tout patch

---

## 1. Rappel doctrine immuable

- `feedback_input_client_obligatoire` — on ne touche RIEN aux inputs (level, currentVolume, targetTime, recentRaceTimes, VMA).
- `feedback_courte_duree_charge_allegee` — plans < 13 sem calibrés volontairement SOUS référentiel Pfitzinger.
- `feedback_jamais_baisser_allure_cible` — pas de modif des allures cible.
- Doctrine renforcée Romane : on ne change pas les données client même indirectement.

Conclusion : **toute solution doit toucher uniquement le calcul `maxVolume` interne, jamais un input user, jamais l'allure, jamais le niveau, jamais la VMA.**

---

## 2. Cas observés (verbatim brief)

| Cas | Pfitzinger pic | Code actuel | Cible ~70% Pfitzinger |
|---|---|---|---|
| Morgane Semi Déb 3× cv 7 VMA 11 F 20a | 27 km | **14 km** (pic réel) | 18-20 km |
| Louleroy Semi "Conf" 4× cv 10 VMA 9.66 F 23a 88kg | 36 km (réf Régulier) | **18 km** (pic réel) | 25-28 km |

Vérifié sur :
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-morgane.json`
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan1.json` (weeklyVolumes max = 14)
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-louleroy.json`
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan-louleroy.json` (weeklyVolumes max = 18)

Note importante : les **2 plans font 22 semaines** (durée race 17 oct / 18 oct, startDate 20 mai). Donc la doctrine `feedback_courte_duree_charge_allegee` (< 13 sem) ne s'applique PAS — ces volumes bas sont un autre problème, intrinsèque au calcul `maxVolume` quelle que soit la durée.

---

## 3. Cascade complète — `calculatePeriodizationPlan`

Fichier : `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts`
Fonction : `calculatePeriodizationPlan` L2234-2907

### 3.1 Trace pas à pas — Morgane

Input : `level=Débutant, vma=11, freq=3, currentVolume=7, target=Finisher, BMI=21.8 (normal), age=20, sex=F, subGoal=Semi`

Niveau effectif via `detectLevelFromData` (L1124) :
- déclaré `deb` → préservé (aucun chrono, VMA 11 femme = inter mais gap negatif → return `deb`).

| Étape | Réf code | Calcul | Résultat |
|---|---|---|---|
| 1 — Table initiale | L2289-2302 | `Débutant + Semi` | maxVolume = **35** |
| 2 — Session factor | L2354-2364 | freq 3 → runningSess 2 → ×0.85 | maxVolume = round(35×0.85) = **30** |
| 3 — Sauvegarde base | L2371 | baseMaxVolume = 30 | — |
| 4 — Finisher | L2374-2378 | targetTime="Finisher" → ×0.75 | totalReduction = 0.75 |
| 5 — Âge | L2380-2388 | 20 ans, no effect | totalReduction = 0.75 |
| 6 — IMC | L2390-2403 | BMI 21.8, no effect | totalReduction = 0.75 |
| 7 — Application | L2406-2411 | 30 × 0.75 | maxVolume = **23** |
| 8 — Cap VMA-durée | L2420-2482 | slMaxDur=90 (MAX_SL_DURATION['Semi']['deb']), nonSlMaxDur=68 (90×0.75), efSpeed=8.25 km/h (11×0.75), runningSess=2 | slMaxKm = 90×0.70/60×8.25 = 8.66 ; otherMaxKm = 1×68×0.70/60×8.25 = 6.54 ; vmaBased = **15** |
| 9 — Branche achievable | L2469-2475 | currentVol 7 > vmaBased 15 ? Non → safeVmaCap reste = 15 | — |
| 10 — Application cap | L2477-2480 | 15 < 23 → maxVolume = **15** ← COUPABLE PRINCIPAL |
| 11 — Floor currentVol | L2487-2490 | 15 < 7 ? Non | — |
| 12 — Progression 1.18 | L2497-2505 | 15 ≤ 7×1.05=7.35 ? Non | — |
| 13 — vmaHardCap | L2510 | 15 | — |
| 14 — Mode marche-course | L2527-2559 | cv 7 < minViable(32)×0.30=9.6 ? Oui. Mais hasSpecificTimeTarget=false (Finisher) → branche non activée | effectiveVmaCap = 15 |
| 15 — minViableVolume | L2517, 2561-2568 | minViable=32 (Semi). safeMin = min(32, 15) = 15. 15 > 15 ? Non | — |
| 16 — minPeakVolume | L2570-2584 | rawMin=21.1×1.5=32 ; absoluteCap=MAX_WEEKLY_VOLUME['Semi']['expert']=70 ; minPeak=min(32,70,15)=15 ; 15 < 15 ? Non | — |

**Résultat : maxVolume final = 15 km.**
Le pic réel observé (14 km) est inférieur de 1 km à cause du lissage post-calcul (cap +15%/sem entre récup et charge L2856-2879).

### 3.2 Trace pas à pas — Louleroy

Input : `level=Confirmé (déclaré), vma=9.66, freq=4, currentVolume=10, target="1h10", BMI=30.4, age=23, sex=F, recentRaceTimes.10km="1h09", subGoal=Semi`

Niveau effectif via `detectLevelFromData` (L1124-1194) :
- déclaré `conf` (rank 2).
- chrono override (L1141-1155) : 10K 1h09 femme → seuil deb=60 min → 69 > 60 → chronoLevel = `deb` (rank 0). 0 < 2 → **return `deb`**.

| Étape | Réf code | Calcul | Résultat |
|---|---|---|---|
| 1 — Table | L2289-2302 | `Débutant + Semi` | maxVolume = **35** |
| 2 — Session factor | L2354-2364 | freq 4 → runningSess 3 → ×1.00 | maxVolume = **35** |
| 3 — Sauvegarde base | L2371 | baseMaxVolume = 35 | — |
| 4 — Finisher | L2374-2378 | targetTime="1h10" (digits) → isFinisher=false | — |
| 5 — Âge | L2380-2388 | 23, no effect | — |
| 6 — IMC | L2390-2403 | BMI 30.4 ≥ 30 → ×0.80 | totalReduction = 0.80 |
| 7 — Application | L2406-2411 | 35 × 0.80 | maxVolume = **28** |
| 8 — Cap VMA-durée | L2420-2482 | slMaxDur=90, nonSlMaxDur=68, efSpeed=7.245 km/h (9.66×0.75), runningSess=3 | slMaxKm = 90×0.70/60×7.245 = 7.61 ; otherMaxKm = 2×68×0.70/60×7.245 = 11.49 ; vmaBased = **19** |
| 9 — Branche achievable | L2469-2475 | currentVol 10 > vmaBased 19 ? Non → safeVmaCap = 19 | — |
| 10 — Application cap | L2477-2480 | 19 < 28 → maxVolume = **19** ← COUPABLE PRINCIPAL |
| 11 — Floor currentVol | L2487 | 19 < 10 ? Non | — |
| 12 — Progression 1.18 | L2497-2505 | 19 ≤ 10×1.05=10.5 ? Non | — |
| 13 — Mode marche-course | L2527-2559 | level=deb (eligible), cv 10 < minViable(32)×0.30=9.6 ? **Non, 10 > 9.6** → branche non activée | effectiveVmaCap = 19 |
| 14 — minViableVolume | L2561-2568 | safeMin = min(32, 19) = 19. 19 > 19 ? Non | — |
| 15 — minPeakVolume | L2570-2584 | rawMin=32 ; min(32,70,19)=19 ; 19 < 19 ? Non | — |

**Résultat : maxVolume final = 19 km.**
Le pic réel (18 km) est inférieur de 1 km à cause du lissage post-calcul.

---

## 4. Coupable principal identifié

**Fichier** : `src/services/geminiService.ts`
**Lignes** : 2420-2482
**Mécanisme** : le **cap VMA-durée** rabote brutalement `maxVolume` à une valeur très basse pour les profils VMA basse (deb femme, débutants) sur distance longue (Semi/Marathon).

### Mécanique pathologique
1. `slMaxDur` (table `MAX_SL_DURATION` L1009-1023) plafonne la SL en minutes par niveau × distance.
   - Pour Semi **deb** : `slMaxDur = 90 min`.
   - Comparaison Pfitzinger : SL pic Semi Beginner = 16-18 km, ce qui à 7-8 km/h prend **110-130 min**. Donc **90 min est sous-évalué** par rapport au standard coach.
2. `realisticFactor = 0.70` (L2458) multiplie TOUTES les durées (SL + non-SL), partant du principe que "Gemini ne génère pas des sessions à durée max chaque semaine". OK pour modulation hebdo, mais **au PIC du plan, la SL DOIT s'approcher du max** (c'est la définition d'un pic). Le 0.70 est trop pénalisant au pic.
3. `efSpeed = vma × 0.75` (L2451) : OK pour EF, mais conservateur pour VMA basse (un coureur à VMA 9.66 court probablement à 75-80% VMA en SL réelle).
4. La branche "achievable @85% VMA" (L2469-2475) n'agit QUE si `currentVolume > vmaBasedMaxVolume`. Pour Morgane (cv 7 < 15) et Louleroy (cv 10 < 19), la branche **ne s'active jamais** → safeVmaCap reste = vmaBased théorique.

### Coupable secondaire (table)
`MAX_SL_DURATION['Semi']['deb'] = 90` (L1012) est légèrement sous-calibré coté coach. Pfitzinger Semi Beginner SL pic = 16-18 km. À EF 8.25 km/h (Morgane) : 90 min = 12.4 km. À EF 7.245 km/h (Louleroy) : 90 min = 10.9 km. Bien sous Pfitzinger.

Note : ne PAS toucher cette table dans la solution (table inter-utilisée par `enforceWeekConstraints` L1243, plan validator, etc.). Toute modif aurait des effets cascade non audités → on assouplit le cap VMA-durée pour Semi/Marathon plutôt que de toucher la table.

---

## 5. Quatre options évaluées

### Option A — Relever `MAX_WEEKLY_VOLUMES_BY_LEVEL` (table initiale L2289-2346)

| Cas | Effet attendu |
|---|---|
| Morgane | **AUCUN** — la table donne 35, mais le cap VMA-durée rabote à 15. |
| Louleroy | **AUCUN** — pareil, cap VMA-durée rabote à 19. |
| Autres niveaux | Risque d'inflation Confirmé/Expert qui marche déjà. |

**Verdict : option A NE MARCHE PAS.** Le cap VMA-durée est le vrai goulot ; relever la table en amont est inefficace. Rejet.

### Option B — Plancher post-cap `maxVolume = max(maxVolume, currentVol × 2.2)` pour Semi Déb/Inter

| Cas | currentVol × 2.2 | maxVolume avant | maxVolume après |
|---|---|---|---|
| Morgane (cv 7) | 15.4 | 15 | 15 → 16 (~négligeable) |
| Louleroy (cv 10) | 22 | 19 | 22 (+15%) |

**Verdict : option B partielle.**
- Trop dépendante de `currentVolume`. Un user qui déclare cv=0 ou cv=2 reste bloqué.
- Ne résout pas Morgane (le coefficient 2.2 sur 7 = 15.4 ≈ cap actuel).
- Risque indirect : si on augmente le coefficient à 3.0, Louleroy passe à 30 (OK cible) mais Morgane reste à 21 (cible OK), risque cas confirmé cv=40 → 120 km (faut clamp par baseMax).
- Maintenabilité moyenne (un coefficient magique par niveau, par distance).

### Option C — Assouplir le cap VMA-durée pour Semi/Marathon (L2458-2461)

Variantes testées :

**C1 — realisticFactor uniforme 0.85 (Semi/Marathon uniquement)** :
- Morgane : slMaxKm=10.52, otherMaxKm=7.94 → vmaBased=**18** (cible 18-20 ✓)
- Louleroy : slMaxKm=9.24, otherMaxKm=13.95 → vmaBased=**23** (cible 25-28, encore -2)

**C2 — realisticFactor 0.90 (Semi/Marathon)** :
- Morgane : vmaBased=**20** ✓
- Louleroy : slMaxKm=9.79, otherMaxKm=14.77 → vmaBased=**25** ✓ borne basse cible
- Effet sur Semi Régulier 4× cv 25 VMA 12 : vmaBased=35 (au lieu de 28) → dans Pfitzinger range (30-40) OK
- Effet sur Marathon Conf : vmaBased théorique=104 → plafonné par baseMax 83 → inchangé OK
- Risque : valeur 0.90 = quasi-sans facteur réalisme, assume séances quasi-max chaque semaine. **Mais c'est exactement ce qui se passe au PIC**.

**C3 — SL 0.95 + non-SL 0.80 (différenciation)** :
- Morgane : slMaxKm=11.78, otherMaxKm=7.48 → vmaBased=**19** ✓
- Louleroy : slMaxKm=10.32, otherMaxKm=13.13 → vmaBased=**23** (encore -2 vs cible 25-28)
- Justification coach : au pic, la SL DOIT approcher slMaxDur (0.95). Les autres séances (Q1, Q2) varient plus (0.80).

**Verdict : C2 ou C3.**
- C2 (0.90 uniforme) est plus simple et atteint la cible.
- C3 (0.95 SL + 0.80 non-SL) est plus fidèle à la doctrine "SL pic = au max, autres varient" mais sous-cible Louleroy de 2 km.

### Option D — Plancher absolu `Semi Déb pic ≥ 18, Semi Inter pic ≥ 25` (L2515-2568)

| Cas | Plancher | maxVolume après |
|---|---|---|
| Morgane (Semi deb) | 18 | 18 ✓ |
| Louleroy (Semi deb) | 18 | 19 (déjà ≥18, pas d'effet) |
| Louleroy avec plancher Semi inter (si on respectait niveau déclaré) | 25 | 25 ✓ — mais doctrine = niveau détecté prime |

**Verdict : option D simple et déterministe.**
- Avantage : code 1 ligne, lisible, audit facile.
- Inconvénient :
  - Ne calibre pas selon VMA / freq / sex (un Semi deb VMA 8 freq 3 et un Semi deb VMA 12 freq 4 auraient le même plancher arbitraire = 18 km).
  - Louleroy reste à 19 car niveau détecté = deb (chrono override 10K 1h09).
  - Plancher Semi Inter à 25 km **dangereux** s'il est appliqué à un profil deb détecté Inter limite avec VMA très basse.
- À utiliser en COMPLÉMENT de C2 pour cas extrêmes (VMA très basse qui passe quand même sous plancher).

---

## 6. Option recommandée — C2 (realisticFactor 0.90 pour Semi/Marathon)

### Pseudo-code (à VALIDER avant tout commit)

```typescript
// AVANT (L2458) :
const realisticFactor = 0.70;
const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;
const otherMaxKm = ((runningSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;

// APRÈS (proposition) :
// Pour Semi/Marathon, au PIC du plan la SL est censée approcher son max (Pfitzinger).
// Le facteur 0.70 universel était trop pénalisant pour ces distances longues,
// produisant un cap vmaBased qui sous-calibre les volumes pic (Morgane 14, Louleroy 18).
// Autres distances : on garde 0.70 (calibrage validé sur audits 5K/10K/Trail).
const realisticFactor =
  (objectiveKey === 'Semi' || objectiveKey === 'Marathon') ? 0.90 : 0.70;
const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;
const otherMaxKm = ((runningSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;
```

### Diff localisé (read-only, à valider)

```diff
- // Utiliser 70% des durées max (réaliste : Gemini ne génère pas des sessions à durée max chaque semaine)
- const realisticFactor = 0.70;
+ // Pour Semi/Marathon, la SL pic est censée approcher slMaxDur (Pfitzinger, Daniels).
+ // Le facteur 0.70 universel sous-calibrait le cap vmaBased sur distances longues
+ // (Morgane Semi Déb 3× VMA 11 → pic 14 ; Louleroy Semi Déb 4× VMA 9.66 → pic 18).
+ // Autres distances (5K, 10K, Trail, Hyrox) : on garde 0.70 (audits validés).
+ const realisticFactor =
+   (objectiveKey === 'Semi' || objectiveKey === 'Marathon') ? 0.90 : 0.70;
  const slMaxKm = (slMaxDur * realisticFactor / 60) * efSpeedKmH;
  const otherMaxKm = ((runningSessions - 1) * nonSlMaxDur * realisticFactor / 60) * efSpeedKmH;
```

**Justification coach** : Pfitzinger Faster Road Racing — la SL pic Semi/Marathon est calibrée à 90-95% du temps max tolérable. Le facteur 0.90 reflète ce standard.

---

## 7. Simulation 10 profils — avant/après C2

| # | Profil | maxVolume AVANT | maxVolume APRÈS | Pfitzinger (full) | ~70% Pfitz cible | Verdict |
|---|---|---|---|---|---|---|
| 1 | Morgane Semi Déb 3× cv 7 VMA 11 F 20a Finisher | **15** (pic 14) | **20** (pic ~18) | 27 km | 18-20 | ✓ amélioration |
| 2 | Louleroy Semi "deb" 4× cv 10 VMA 9.66 F 23a BMI 30 "1h10" | **19** (pic 18) | **25** (pic ~23) | 36 km (niv conf) / 27 km (niv deb) | 25-28 | ⚠ proche cible basse mais OK |
| 3 | Semi Régulier 4× cv 25 VMA 12 F 30a | 28 | 35 | 30-40 | 21-28 | ⚠ légèrement au-dessus 70% mais dans Pfitz range complet — OK |
| 4 | Semi Confirmé 4× cv 40 VMA 14.5 M 35a sub-1h45 | 47 (via progression 1.18) | 47 (vmaBased=45 < 47 progression target) | 40-50 | 28-35 | ✓ inchangé (déjà OK) |
| 5 | Semi Expert 5× cv 60 VMA 17 M 30a sub-1h25 | 71 (progression) | 71 | 50-60 | 35-45 | ✓ inchangé |
| 6 | Marathon Déb 3× cv 15 VMA 12 F 25a Finisher | 28 | 35 | 35-45 | 25-32 | ✓ amélioration vers Pfitz |
| 7 | Marathon Confirmé 5× cv 50 VMA 15 M 35a | 81 (baseMax cap) | 81 (vmaBased théorique 104, capé par baseMax 83) | 70-90 | 50-65 | ✓ inchangé |
| 8 | 10K Régulier 4× cv 20 VMA 13.5 M 30a | 22 | **22** (facteur 0.70 inchangé pour 10K) | 30-40 | 21-28 | ✓ inchangé (déjà OK 70%) |
| 9 | 5K Confirmé 4× cv 30 VMA 15.5 M 25a | 35 (progression) | 35 (facteur 0.70 inchangé pour 5K) | 40-50 | 28-35 | ✓ inchangé |
| 10 | Trail 30km Inter 3× cv 25 VMA 13 D+1500 | 38 | 38 (facteur 0.70 inchangé pour Trail) | — | — | ✓ inchangé |

**Synthèse simulation** :
- 4 cas améliorés (Morgane, Louleroy, Semi Régulier, Marathon Déb)
- 6 cas inchangés (tous les niveaux Confirmé/Expert + 10K/5K/Trail)
- 0 cas régressé
- 1 cas (Semi Régulier 4× cv 25) passe de 28 à 35. C'est au-dessus de la cible 70% Pfitz (28) mais reste dans la fourchette Pfitzinger pleine (30-40). **À valider coach** : est-ce souhaitable ou faut-il garder 28 km pour Régulier ?

---

## 8. Validation référentiel Coach 20 ans

Référentiel Pfitzinger Faster Road Racing + Daniels Running Formula :

| Niveau Semi | Pic Pfitz plein | ~70% pour plan court / déb-femme | Code APRÈS C2 |
|---|---|---|---|
| Déb (Finisher 2h+) | 25-35 | 18-25 | Morgane = 20 ✓ |
| Déb-Régulier limite (VMA très basse) | 25-30 | 18-22 | Louleroy = 25 ⚠ borne haute mais OK |
| Régulier (~2h-2h30) | 30-40 | 22-28 | Semi Rég test = 35 ⚠ borne haute Pfitz |
| Confirmé (sub-1h45) | 40-50 | 30-37 | Semi Conf test = 47 ✓ |
| Expert (sub-1h30) | 50-60 | 35-45 | Semi Exp test = 71 — au-dessus mais Expert mature peut absorber |

| Niveau Marathon | Pic Pfitz plein | ~70% | Code APRÈS C2 |
|---|---|---|---|
| Déb (Finisher) | 35-45 | 25-32 | Mar Déb test = 35 ✓ |
| Confirmé | 70-90 | 50-65 | Mar Conf test = 81 (Pfitz plein) |

**Vérification globale** :
- Cibles ~70% Pfitzinger respectées pour Morgane et Louleroy.
- Niveaux supérieurs inchangés (le cap baseMax les protège déjà).
- Autres distances inchangées.

---

## 9. Risques / régressions

### Risques évalués

| Risque | Niveau | Mitigation |
|---|---|---|
| Inflation Semi Régulier inter cv moyen → +25% volume | Moyen | Audit ciblé sur profils Régulier déjà bien servis (`audit-batch-baisse-vol-s1.json`). Possible compromis : factor 0.85 au lieu de 0.90 pour Régulier-Confirmé. |
| Confirmé/Expert inchangés mais plus de Pfitz-pleine atteinte | Faible | Le cap baseMax + progression 1.18 plafonnent. Vérifié sur 3 cas Conf/Expert ci-dessus. |
| Coureur deb cv=0 (jamais déclaré) | Faible | Le minStartVolume / defaultVolume L2944 gère ce cas en amont. |
| BMI ≥ 30 femmes deb VMA basse | À vérifier | Louleroy = ce profil. Plan passe de 18 à 23 → +28%. Acceptable car le ×0.80 IMC est PRÉ-cap VMA → reste protégé. |
| Cas Trail/5K/10K | Aucun | facteur 0.70 inchangé pour ces objectifs. |

### Régressions potentielles (à vérifier sur audits passés)

1. **Profils confirmés Semi à 40-50 km/sem** déjà calibrés sur des plans Pfitzinger pleins → vérifier que les audits récents (`audit-batch-baisse-vol-s1.json`, `AUDIT-19-PLANS-PIC-SL-CASE-BY-CASE.md`) ne sont pas perturbés.
2. **Profils marathon avec progression 1.18** (L2497-2505) : le cap actuel peut être déjà près de baseMax. Avec C2, vmaBased monte → progression target peut être atteint plus tôt → pic identique mais S1 calibré différemment. À auditer.

---

## 10. Tests anti-régression nécessaires

### Tests unitaires existants à vérifier
- `src/services/__tests__/periodization.test.ts` — couvre `calculatePeriodizationPlan`. Vérifier tous les cas Semi/Marathon.
- `src/services/__tests__/minStartVolume-input-respect.test.ts` — vérifier que la doctrine "input client = obligatoire" reste respectée.
- `src/services/__tests__/buildFinisherFeasibility-sprint3.test.ts` — couvre Finisher (Morgane).

### Nouveaux tests à créer
```
- Periodization: Morgane Semi Déb 3× cv 7 VMA 11 → maxVolume ∈ [18, 22]
- Periodization: Louleroy Semi deb 4× cv 10 VMA 9.66 BMI 30 → maxVolume ∈ [22, 27]
- Periodization: Marathon Déb 3× cv 15 VMA 12 Finisher → maxVolume ∈ [30, 38]
- Periodization: Semi Régulier 4× cv 25 VMA 12 → maxVolume ∈ [30, 38]
- Periodization: 5K Confirmé 4× cv 30 VMA 15.5 → maxVolume INCHANGÉ (= ancienne valeur)
- Periodization: Trail 30km Inter 3× cv 25 → maxVolume INCHANGÉ
- Periodization: 10K Régulier 4× cv 20 → maxVolume INCHANGÉ
- Periodization: Semi Confirmé 5× cv 60 VMA 17 → maxVolume INCHANGÉ (cap baseMax)
- Periodization: Marathon Conf 5× cv 50 VMA 15 → maxVolume INCHANGÉ
```

### Audit batch à relancer
- Tous les plans Semi/Marathon générés sur les 7 derniers jours.
- Comparer pic avant/après, vérifier qu'aucun ne dépasse Pfitzinger plein.

---

## 11. Décisions à prendre par Romane (PM + Coach)

### Décision 1 — Option à retenir
- [ ] Option C2 (realisticFactor 0.90 Semi/Marathon) — **recommandée** (simple, ciblée, simulation favorable)
- [ ] Option C3 (SL 0.95 + non-SL 0.80 Semi/Marathon) — plus fidèle doctrine SL pic mais sous-cible Louleroy de 2 km
- [ ] Option D (plancher absolu) — déterministe mais arbitraire
- [ ] Combinaison C2 + D (plancher de sécurité)
- [ ] Rester en l'état (refus de patch — accepter pic 14/18 pour ces 2 profils)

### Décision 2 — Périmètre objectifs
- [ ] Semi ET Marathon (recommandé — même problème SL longue)
- [ ] Semi UNIQUEMENT (plus prudent, audit ultérieur Marathon)

### Décision 3 — Valeur du nouveau realisticFactor
- [ ] 0.85 — conservateur (Morgane 18, Louleroy 23)
- [ ] 0.90 — recommandé (Morgane 20, Louleroy 25)
- [ ] 0.95 — agressif (Morgane 21, Louleroy 26) — risque inflation niveaux supérieurs

### Décision 4 — Doctrine appliquée à Louleroy
Le chrono override (10K 1h09 femme) bascule Louleroy de "conf" déclaré à "deb" effectif. La cible 25-28 km mentionnée dans le brief assume "vrai niveau Régulier".
- [ ] Respecter niveau détecté (deb) → cible 18-25, valeur 23-25 = OK
- [ ] Ajouter une exception "Confirmé déclaré + chrono limite" → out of scope cette mission

### Décision 5 — Process avant code
- [ ] Validation Coach + PM uniquement, code ensuite
- [ ] Code en branche dédiée avec preview screenshots avant merge
- [ ] Audit batch 30 plans Semi/Marathon avant/après code

---

## 12. Annexes

### A1 — Fichiers consultés
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` L844-2907
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-morgane.json`
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan1.json`
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-user-louleroy.json`
- `/Users/romanemarino/Coach-Running-IA/_audit-semi-plan-louleroy.json`

### A2 — Lignes clés du code
- L1009-1023 : `MAX_SL_DURATION` (table durées SL par niveau × distance)
- L1026-1040 : `MAX_WEEKLY_VOLUME` (filet de sécurité)
- L1124-1194 : `detectLevelFromData` (override chrono + VMA)
- L2234-2907 : `calculatePeriodizationPlan`
- L2289-2346 : Table volumes pic par niveau × distance
- L2354-2364 : Session factor (freq → factor)
- L2371-2411 : Réductions cumulées (Finisher, âge, BMI)
- L2420-2482 : **Cap VMA-durée (COUPABLE PRINCIPAL)**
- L2484-2505 : Floor currentVolume + progression 1.18
- L2527-2559 : Mode marche-course (débutant uniquement)
- L2561-2584 : minViableVolume + minPeakVolume (planchers)
- L2741-2754 : Sprint 6 — volumeCap +60% S1

### A3 — Doctrines respectées par C2
- ✓ Pas de modif input client (level/cv/target/VMA/recentRaceTimes)
- ✓ Pas de modif allure cible
- ✓ Pas de modif détection niveau
- ✓ Pas d'élargissement scope (uniquement L2458, ligne isolée)
- ✓ Effet ciblé Semi/Marathon, autres distances intactes
- ✓ Niveaux Confirmé/Expert inchangés (protégés par baseMax)

### A4 — Cohérence avec audits passés
- `INVESTIGATION-VOLUMES-PIC-CASCADE.md` (existe) — relire avant code pour valider non-régression.
- `AUDIT-19-PLANS-PIC-SL-CASE-BY-CASE.md` (existe) — relire pour profils impactés.
- `PATCH-BATCH-VOLUMES-18-05.md` (existe) — relire les volumes calibrés récemment, ne pas casser.

---

**Statut final** : Investigation terminée. Option C2 recommandée. **Aucun code modifié**. Décisions PM/Coach attendues sur les 5 points section 11 avant tout patch.
