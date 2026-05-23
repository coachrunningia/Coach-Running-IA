# Challenge dev 30 ans — Proposition dégraissée Bug 17
Date : 2026-05-23

## Verdict global

**GO + 3 ajustements précis.**

Pas de timezone, pas de DST, pas de toast — rejets Romane respectés. La proposition est techniquement correcte. Le modèle "cyclique startDate au jour réel + offset modulo 7" est cohérent et résout le bug Arnaud. Mathématiquement vérifié (3 cas edge ci-dessous).

## Vérification math du modèle cyclique (Sujet 3)

| startDate | dayName | startIdx | targetIdx | (target-start+7)%7 | sessionDate |
|-----------|---------|----------|-----------|---------------------|-------------|
| Sam 23/05 | Vendredi | 5 | 4 | 6 | Ven 29/05 ✓ |
| Lun 25/05 | Lundi | 0 | 0 | 0 | Lun 25/05 ✓ |
| Dim 24/05 | Mardi | 6 | 1 | 2 | Mar 26/05 ✓ |
| Dim 24/05 (Arnaud) | Lundi | 6 | 0 | 1 | Lun 25/05 ✓ |
| Dim 24/05 (Arnaud) | Vendredi | 6 | 4 | 5 | Ven 29/05 ✓ |
| Mar 26/05 | Lundi week 2 | 1 | 0 | 6 + 7 | Lun 08/06 ✓ |

Modèle cyclique correct. **Note d'attention** : pour startDate non-lundi, la "semaine N" affichée contient des jours qui ne sont pas strictement Lun→Dim. Ex. startDate=Mar 26/05 → S1 contient Mar 26 → Lun 01. **Acceptable** car cohérent + `getWeekNumberForDate` symétrique + tri par date dans PlanView L1589 garantit affichage chronologique.

## Sujet 1 — Suppression alignment monday backend `geminiService.ts:4883-4892`
✅ OK. Code à supprimer en bloc, plan.startDate = data.startDate (input user). Vérifié : aucun autre site backend ne ré-aligne (fullPlan L5836 ne touche pas startDate, juste endDate).

## Sujet 2 — Suppression `alignToMonday` `dateUtils.ts:22-29`
✅ OK. Plus de call externe (vérifié grep). Suppression nette.

## Sujet 3 — Refonte `calculateSessionDate`
✅ OK code correct. Modulo 7 mathématiquement validé (table ci-dessus). Cohérent avec `getWeekNumberForDate` refondu.

## Sujet 4 — Refonte `getWeekNumberForDate`
⚠️ OK code, **1 ajustement** : ajouter `startDate.setHours(0, 0, 0, 0)` après `parseLocalDate` n'est pas nécessaire car `parseLocalDate` retourne déjà minuit local (vérifié L18). Mais **NE PAS oublier** que la comparaison `target` vs `startDate` doit rester en local time (les deux le sont). ✓ pas de change.

Edge : si `date < planStartDate`, retourne weekNumber = 0 ou négatif. Comportement identique à l'ancien code (ancien retournait aussi 0 si date < startMonday). Pas de régression.

## Sujet 5 — Nettoyer 5 sites inline `PlanView.tsx`
⚠️ OK, **1 ajustement précis** : le pattern à remplacer ne fait pas que parser — il calcule aussi `weekStart`/`weekEnd`. Le remplacement doit être :

```ts
// Avant :
const rawStartDate = new Date(plan.startDate);
const startDayOfWeek = rawStartDate.getDay();
const daysToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
const startDate = new Date(rawStartDate);
startDate.setDate(rawStartDate.getDate() + daysToMonday);
// puis weekStart = startDate + (weekNum-1)*7

// Après :
const startDate = parseLocalDate(plan.startDate);
// puis weekStart = startDate + (weekNum-1)*7  ← inchangé
```

Sites précis :
- L553-557 (`progressStats.currentWeekNumber`) : remplacer le bloc, garder `diffTime / now` logic
- L609-619 (`raceWeekIdx`) : remplacer `new Date(plan.startDate) + align` par `parseLocalDate(plan.startDate)`. **Aussi** `new Date(rawRaceDate)` → préférer `parseLocalDate(rawRaceDate)` si raceDate est au format `YYYY-MM-DD` (cohérence). Vérifier le format avant patch.
- L676-687 (`getSessionDate` fallback) : **dead code** (toujours appelé avec session, ligne 1594). Possible simplification = supprimer la branche fallback et la fonction utilise directement `resolveSessionDate`. Sinon a minima remplacer par `parseLocalDate`.
- L697-708 (`getWeekStatus`) : remplacer le bloc d'alignement.
- L1742-1750 (preview weeks display) : remplacer le bloc.

Aussi : le `dayToIndex` local L655-658 dans PlanView devient inutile si on simplifie getSessionDate. À supprimer si fallback supprimé.

## Sujet 6 — Vérif `handleStartDateChange` L913-958
✅ OK. Lu lignes 913-958. Aucun alignement Monday. `updatePlanStartDate` (storageService L915-934) écrit `newStartDate` tel quel. **No-op confirmé.**

## Sujet 7 — Tests `dateUtils.test.ts` (10 cas)
✅ OK. Pas de DST/traversée année. 10 cas suffisent. **Recommandation cas à couvrir** :
1. startDate=Lundi, day=Lundi week 1 → offset 0
2. startDate=Lundi, day=Dimanche week 1 → offset 6
3. startDate=Mardi, day=Lundi week 1 → offset 6 (jour suivant cyclique)
4. startDate=Samedi, day=Vendredi week 1 → offset 6
5. startDate=Dimanche, day=Lundi week 1 → offset 1
6. startDate=Dimanche (Arnaud), day=Vendredi week 1 → offset 5
7. Week 2 cyclique : startDate=Mardi, day=Lundi week 2 → offset 13
8. `resolveSessionDate` priorise `dateOverride`
9. `getWeekNumberForDate` symétrique avec `calculateSessionDate` (round-trip)
10. `getWeekNumberForDate` date avant startDate → 0 ou négatif (documenté)

## Sujet 8 — Audit batch post-ship (mesure seulement)
✅ OK. Script lecture seule comparant `plan.startDate` vs `questionnaireSnapshot.startDate` (vérifié L3433, snapshot contient bien la valeur user). Aucun patch. Bon move.

## Sujet 9 — Doctrine `feedback_startdate_input_strict`
✅ OK. À acter post-deploy, en cohérence avec doctrine existante "Inputs client = obligatoires" (déjà en mémoire). Cohérent.

## Pièges restants détectés

1. **Confusion visuelle pour startDate non-Lundi** : S1 d'Arnaud va de Dim 24/05 (startDate technique) à Sam 30/05 — mais la première séance est Lun 25/05. **Pas un bug**, juste un affichage du `dateRange` à L715 qui montrera "24/05 - 30/05". Cosmétique, peut être ignoré (rejet toast confirmé). Si Romane veut afficher seulement la plage des jours avec sessions, on verra plus tard.

2. **`new Date(rawRaceDate)` L610** : si raceDate est `YYYY-MM-DD`, `new Date()` parse en UTC. Approximatif mais pas un bug nouveau (déjà présent). Si on touche au site L609-619 (Sujet 5), utiliser `parseLocalDate(rawRaceDate)` pour cohérence — **ajustement bonus, pas obligatoire**.

3. **Fallback dead code L676-687** : profitons-en pour supprimer (Sujet 5 ajustement).

## Modifications EXACTES à intégrer avant code

1. Sujet 4 : pas d'ajustement, code tel quel.
2. Sujet 5 : remplacement = `const startDate = parseLocalDate(plan.startDate);` (pas juste "parseLocalDate" seul — préciser le bloc complet remplacé).
3. Sujet 5 bonus : supprimer fallback dead code dans `getSessionDate` L676-687 + `dayToIndex` local L655-658 (devient inutilisé).
4. Sujet 5 bonus optionnel : `parseLocalDate(rawRaceDate)` au lieu de `new Date(rawRaceDate)` L610 si format `YYYY-MM-DD`.

Aucune autre modif. Pas de garde-fou. Pas de safeguard initiative non-demandé (doctrine "Écouter instructions explicites").

## Plan exec final

1. `dateUtils.ts` : supprimer `alignToMonday` (Sujet 2), refondre `calculateSessionDate` (Sujet 3), refondre `getWeekNumberForDate` (Sujet 4).
2. `geminiService.ts:4883-4892` : delete bloc (Sujet 1).
3. `PlanView.tsx` : 5 sites + dead code cleanup (Sujet 5 avec ajustement).
4. `handleStartDateChange` : aucune action, no-op confirmé (Sujet 6).
5. `dateUtils.test.ts` : 10 cas (Sujet 7).
6. Build + lancement tests.
7. Audit batch post-ship lecture seule (Sujet 8).
8. Acter doctrine `feedback_startdate_input_strict` (Sujet 9).

Aucun écart à la spec dégraissée. Aucune sur-ingéniérie.
