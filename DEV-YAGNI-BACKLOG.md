# Dev YAGNI — Challenge backlog code
Date : 2026-05-21
Reviewer : dev senior TS 15 ans, YAGNI absolu

## TL;DR
- **KEEP** : 3/10 (fix réellement nécessaires, simples, justifiés)
- **SIMPLIFY** : 3/10 (fix OK mais l'approche proposée est surdimensionnée)
- **WONTFIX** : 3/10 (cas hypothétique, doublon de garde-fous existants, ou déjà couvert)
- **REVERT** : 1/10 (au moins 1 ligne de doctrine à supprimer plutôt qu'ajouter)

Total ajouté si tout KEEP/SIMPLIFY appliqué : **~20 lignes** (vs. ~210 lignes proposées). Économie : **~190 lignes** + ~8h dev + tests.

---

## Item par item

### P0-1 — `handleRecalculateVMA` ne save pas `feasibility`
- **Code nécessaire ?** : OUI. `App.tsx:1216-1245` calcule `newFeasibility` mais ne l'écrit JAMAIS sur `fullPlan` ni `updatedPlan` avant `savePlan()`. Bug réel reproductible (cas Julian patché live).
- **Fix existant ailleurs ?** : non. Le seul calcul est ce bloc. Pas d'autre code Firestore qui re-déclencherait.
- **Lignes ajoutées** : **1** (`fullPlan.feasibility = newFeasibility;` + équivalent dans `updatedPlan`, donc 2 lignes max).
- **Alternative + simple** : c'est déjà 1 ligne. Mais le mot 1 reste de bout-en-bout : déplacer le bloc `calculateFeasibility` AVANT les 2 branches `savePlan`, puis attribuer dans les deux branches via spread. **Réécrire le bloc en 1 calcul + 2 affectations**, pas 2 logiques séparées.
- **Tests** : un test d'intégration suffit. Inutile de mocker tout l'App, tester directement `calculateFeasibility` est déjà fait, et la mécanique "assign before save" est triviale. **1 test, max 10 min.**
- **Verdict** : 🟢 **KEEP**. Fix net, 2 lignes, bug réel.

### P0-2 — Doublon Strava `activityId`
- **Code nécessaire ?** : MODÉRÉ. Le matching est UI-driven (`PlanView.tsx:270`, à l'ouverture du modal). Une activity est dupliquée SEULEMENT si le user ouvre 2 séances le même jour ET que les 2 matchent la même activity. C'est PEU fréquent (1 cas réel : Julian, déjà patché live).
- **Fix existant ailleurs ?** : non. Mais le doublon n'altère pas les paces ni le plan : il pollue `feedback.stravaData` sur 2 séances.
- **Lignes ajoutées proposées** : ~10-20 lignes (set + lookup par plan).
- **Alternative + simple** : **côté UI seulement**. Quand on ouvre `handleOpenFeedback` (`PlanView.tsx:270`), lister les `activityId` déjà persistés dans `plan.weeks[*].sessions[*].feedback?.stravaData?.activityId` et filtrer `findStravaActivityForSession` en exclusion. **3-5 lignes max**. Pas besoin de toucher `stravaAnalysisService.ts`.
- **Tests** : 1 test sur la fonction utilitaire d'exclusion. ROI OK.
- **Verdict** : 🟡 **SIMPLIFY**. Pas un set global plan-level, juste un filtre à l'appel (3-5 lignes UI).

### P0-3 — D+ Trail branche secondaire %VMA
- **Code nécessaire ?** : **NON**. Investigation faite : il n'existe PAS de "branche secondaire BON/AMBITIEUX qui n'utilise pas `effectiveDistanceKm`". Le seul calcul `pctVmaPercent` est en L489-514 (`feasibilityService.ts`), branche IRRÉALISTE, et il utilise `effectiveDistanceKm` correctement (déjà patché Fix A pour le libellé Trail). Les statuts BON/AMBITIEUX/EXCELLENT utilisent `gapPercent` basé sur `theoMinutes(vma, effectiveDistanceKm)` — donc déjà correct.
- **Fix existant ailleurs ?** : OUI. Fix A (L496-505) déjà déployé : libellé Trail explicite "effort équivalent". Le bug Bertrand est résolu.
- **Lignes ajoutées** : 0 nécessaires.
- **Alternative + simple** : aucun code. **Fermer le ticket.**
- **Verdict** : 🔴 **WONTFIX**. C'est un cas hypothétique alimenté par un "flag Coach" sans preuve d'existence. Cf doctrine [[feedback_chaque_ligne_justifiee]] : on ne code pas un fix pour un bug qu'on n'a pas démontré.

### P1-1 — Smoothing ×1.15 post-récup étrangle
- **Code nécessaire ?** : OUI mais 1 modif d'1 ligne (formule existante L3096+L3101). Pas d'ajout.
- **Fix existant ailleurs ?** : non.
- **Lignes ajoutées** : **0 nettes** (modification de la constante 1.15 → table param par objectif).
- **Alternative + simple** : faire varier seulement pour Semi/Marathon Inter+ : `const postRecovGrowth = (objectiveKey === 'Semi' || objectiveKey === 'Marathon') && currentVolume >= 20 ? 1.18 : 1.15;`. **1 ligne**, pas une refonte. Attention : ne PAS ajouter de paramètre exposé, garder local à la boucle.
- **Tests** : 1-2 tests sur progression post-récup Semi vs 5K.
- **Verdict** : 🟡 **SIMPLIFY**. 1 ligne max, pas une investigation 30 min.

### P1-2 — Expert phase fondamental + safety net
- **Code nécessaire ?** : **PARTIELLEMENT**. Le prompt L4104 DIT DÉJÀ "NIVEAU CONFIRMÉ+ / 4+ SÉANCES : à partir de la SEMAINE 3 du fondamental, 1 séance par semaine DOIT inclure du travail de vitesse léger" + "VARIÉTÉ OBLIGATOIRE en phase fondamentale" L4110. Donc l'instruction existe pour Expert freq=4. Si le LLM produit "4 footings identiques 5:07", c'est un raté LLM, pas un manque d'instruction.
- **Fix existant ailleurs ?** : OUI, prompt L4102-4116. Le safety net L763-781 NE force PAS EF sur un footing déjà classé EF — il convertit seulement les seuils/fractionnés dans phase fondamentale.
- **Lignes ajoutées proposées** : ~50 lignes refacto prompt.
- **Alternative + simple** :
  1. Renforcer 1 phrase du prompt existant L4109 pour Expert : "POUR EXPERT (VMA ≥ 17) : EXIGENCE strides 6×100m fin de séance OU 6×20s accélérations sur 1 footing/semaine DÈS S1 (pas S3)". **3 lignes prompt**.
  2. Réduire phase fondamental Expert : modifier ratio L2818 `Math.floor(totalWeeks * 0.30)` → si Expert, `0.20`. **1 ligne**.
- **Tests** : prompt-based, valider sur 2-3 régénérations floggyz. Pas de test unitaire (LLM output).
- **Verdict** : 🟡 **SIMPLIFY**. 4 lignes max, pas 50.

### P1-3 — Hard floor pic Trail
- **Code nécessaire ?** : MODÉRÉ. L2768-2787 traite Semi/Marathon/10K/5K mais pas Trail. Cas réel ? Pas listé dans le backlog (pas de user impacté). Le rawMinPeakVolume = `raceDistanceKm * 1.5` cappé par `effectiveVmaCap` couvre déjà le cas général. Quand VMA cap descend trop bas pour Trail → potentiellement sous-dimensionné.
- **Fix existant ailleurs ?** : partiel (rawMinPeakVolume = 1.5× distance Trail). Pour Trail 16 km → 24 km pic, déjà raisonnable.
- **Lignes ajoutées** : 8-10 (3-4 conditions if + commentaire).
- **Alternative + simple** : ajouter UNE règle simple `if (isTrail && minPeakVolume < raceDistanceKm * 1.3) minPeakVolume = Math.round(raceDistanceKm * 1.3);` **2 lignes**. Couvre tous les Trails sans table d'enum (Trail court / long / ultra). YAGNI : on n'a pas de cas user avéré.
- **Tests** : 1 test paramétrique.
- **Verdict** : 🟡 **SIMPLIFY**. 2 lignes, pas une table.
  Note : pourrait aussi être **WONTFIX** tant qu'aucun user n'est cité. Le backlog ne nomme PAS de cas réel.

### P1-4 — Warning freq=2 Marathon
- **Code nécessaire ?** : NON. `Questionnaire.tsx:1097-1108` AFFICHE DÉJÀ un warning : "Attention : {data.frequency} séances peuvent être insuffisantes pour votre objectif" quand `data.frequency < getRecommendedFrequency.min`. Pour Marathon recommandé 5, min 4 → freq 2 déclenche déjà le warning.
- **Fix existant ailleurs ?** : OUI, L1097-1101 + L1102-1106.
- **Lignes ajoutées proposées** : ~10.
- **Alternative + simple** : aucune. Le warning existe. Si on veut le RENFORCER (style "très risqué" en rouge gras), c'est cosmétique. Si on veut BLOQUER, c'est une régression UX (user adulte qui sait ce qu'il fait + safetyWarning IRRÉALISTE déjà géré par feasibility).
- **Verdict** : 🔴 **WONTFIX**. Garde-fou déjà présent, pas de cas user cité ayant ignoré le warning.

### P1-6 — Message "très chargée en volume" inversé
- **Code nécessaire ?** : OUI. `feasibilityService.ts:1248-1250` déclenche sur `planWeeks > 16 && frequency <= 3` sans regarder volume effectif. Mauvais wording confirmé (Bertrand 15 km/sem → "très chargée").
- **Fix existant ailleurs ?** : non.
- **Lignes ajoutées** : **3-5** (1 if + reformulation).
- **Alternative + simple** :
  ```ts
  // Avant L1248
  const kmParSeance = currentVolume && frequency ? currentVolume / frequency : null;
  if (frequency && planWeeks && planWeeks > 16 && frequency <= 3 && (kmParSeance ?? 0) >= 10) {
    reasons.push({ type: 'warn', text: `avec ${frequency} séances/sem sur ${planWeeks} sem, chaque séance va monter en volume — passer à 4 séances apporterait plus de variété` });
  }
  ```
  3 lignes ajoutées, message corrigé. **N'augmente pas la complexité**.
- **Tests** : 1 test Bertrand profile, 1 test cas inverse (10K/sem freq=2 plan court → pas de message).
- **Verdict** : 🟢 **KEEP**. 3 lignes, bug réel, fix net.

### P1-7 — Cap `planWeeks` par objectif
- **Code nécessaire ?** : OUI mais 1 ligne. `geminiService.ts:3859-3860`.
- **Fix existant ailleurs ?** : non.
- **Lignes ajoutées** : **3-5**.
- **Alternative + simple** :
  ```ts
  const maxWeeksByGoal: Record<string, number> = { '5 km': 10, '10 km': 16, 'Semi-Marathon': 20, 'Marathon': 24 };
  const maxWeeks = maxWeeksByGoal[data.subGoal] ?? 30;
  ```
  L3859 remplace `const maxWeeks = 30`. **2 lignes ajoutées, 1 modifiée**.
- **Tests** : 1 test paramétrique (5K → cap 10, Trail → cap 30).
- **Verdict** : 🟢 **KEEP**. Fix simple, problème réel (floggyz 30 sem 10K Finisher = absurde).

### P2-3 — UX modal confirmation chrono "h" sur 10K
- **Code nécessaire ?** : NON. Cas user RÉEL = 1 (signalé par Romane). Pas de remontée massive. Le parsing actuel doit déjà faire quelque chose (probablement valeur absurde ignorée ou plan recalibré).
- **Fix existant ailleurs ?** : partiel. La gate IRRÉALISTE de feasibilityService.ts couvre les chronos absurdes en aval.
- **Lignes ajoutées proposées** : ~100 (composant React + intégration).
- **Alternative + simple** : ajouter UNE validation côté input : si distance ≤ 10K et chrono contient "h" → afficher une simple ligne d'aide sous l'input (pas modal). **5-10 lignes JSX**. Mais cela reste un raffinement cosmétique.
- **Verdict** : 🔴 **WONTFIX**. 1 cas user, fix proposé surdimensionné (100 lignes pour 1 modal). Si on doit faire qqch, 5 lignes d'helper text suffisent — pas un composant.

---

## Synthèse code

| Item | Verdict | Lignes prop. | Lignes réelles |
|---|---|---|---|
| P0-1 | 🟢 KEEP | 1 | 2 |
| P0-2 | 🟡 SIMPLIFY | 10-20 | 3-5 |
| P0-3 | 🔴 WONTFIX | N lignes | 0 |
| P1-1 | 🟡 SIMPLIFY | ~10 | 1 |
| P1-2 | 🟡 SIMPLIFY | ~50 | 4 |
| P1-3 | 🟡 SIMPLIFY | 8 | 2 |
| P1-4 | 🔴 WONTFIX | ~10 | 0 |
| P1-6 | 🟢 KEEP | 3-5 | 3 |
| P1-7 | 🟢 KEEP | 5 | 3 |
| P2-3 | 🔴 WONTFIX | ~100 | 0 |
| **TOTAL** | | **~210** | **~18** |

**Économie : ~190 lignes de code évitées.**

---

## REVERT (suppression code)

⚪ **Doctrine [[feedback_chaque_ligne_justifiee]]** : 1 candidat à suppression.

- Le commentaire bloc `L457-475` dans `feasibilityService.ts` documente "Fix C — Seuils %VMA tenu" déjà appliqué. Justifié de garder. **Pas à supprimer**.
- En revanche, **P0-3** étant WONTFIX, vérifier qu'aucun TODO/commentaire pollue `feasibilityService.ts` autour de "branche secondaire %VMA". Si oui : -3 à -5 lignes commentaires.

**Net : +18 lignes / -0 à -5 lignes**.

---

## Anti-patterns détectés dans le backlog

1. **"Garde-fou pour cas qu'on a déjà patché live"** (P0-2 doublon Strava, P1-4 freq=2 Marathon). 1 cas user résolu live ≠ besoin code. Refus.
2. **"Refacto 50 lignes pour bug LLM"** (P1-2 Expert). Le prompt dit déjà la bonne chose. Renforcer 3 lignes prompt suffit.
3. **"Investigation N lignes" sans cas user concret** (P0-3 D+ Trail). On ne code pas pour un flag Coach abstrait, on vérifie d'abord. Vérifié → pas de bug.
4. **"Composant React 100 lignes pour 1 user"** (P2-3 modal chrono). YAGNI.
5. **"Table d'enum quand 1 ligne suffit"** (P1-3 hard floor Trail par tranche : 22/32/40). Une seule règle `1.3× distance` couvre.

---

## Économie effort dev

| Fix | Effort original | Effort YAGNI |
|---|---|---|
| P0-1 | 20 min | 10 min |
| P0-2 | 30 min | 15 min |
| P0-3 | 45 min | 0 |
| P1-1 | 1h | 10 min |
| P1-2 | 1h | 15 min prompt |
| P1-3 | 20 min | 5 min |
| P1-4 | 20 min | 0 |
| P1-6 | 10 min | 10 min |
| P1-7 | 15 min | 10 min |
| P2-3 | 1h | 0 |
| **TOTAL** | **~5h35** | **~1h15** |

**Économie : ~4h20 de dev + tests associés.**

---

## Recommandation séquence

1. **P0-1** (10 min) — réécrire le bloc en 2 affectations, pas 2 logiques séparées.
2. **P1-7** (10 min) — table cap par objectif.
3. **P1-6** (10 min) — ajout condition + reformulation.
4. **P0-2** (15 min) — filtre UI seulement, pas service.
5. **P1-1** (10 min) — 1 ligne formule conditionnelle.
6. **P1-2** (15 min) — 3 lignes prompt + 1 ligne ratio fondamental.
7. **P1-3** (5 min) — 2 lignes hard floor Trail générique.

**Stop. P0-3, P1-4, P2-3 = WONTFIX.**

Total : ~1h15 vs 5h35 estimé. ROI x4.
