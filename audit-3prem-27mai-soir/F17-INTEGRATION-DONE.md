# F-17 — Intégration `paceRecalibrationService` dans `handleRecalculateVMA`

Statut : **Code livré, build à valider manuellement** (sandbox a refusé `vite build` + `vitest run`).

---

## 1. Lignes modifiées (`src/App.tsx`)

### A) Imports dynamiques (L1072-1079) — AVANT
```ts
const { calculateAllPaces, generateRemainingWeeks, detectLevelFromData } = await import('./services/geminiService');
const newPaces = calculateAllPaces(newVMA);
```

### A') APRÈS
```ts
const { calculateAllPaces, detectLevelFromData } = await import('./services/geminiService');
const { recalibrateSession } = await import('./services/paceRecalibrationService');
const { resolveSessionDate } = await import('./utils/dateUtils');
const newPaces = calculateAllPaces(newVMA);
const oldPaces = (plan as any).paces || plan.generationContext?.paces || calculateAllPaces(oldVMA);
```
`generateRemainingWeeks` SUPPRIMÉ. Plus aucun appel Gemini dans le handler.

### B) Bloc L1182-1272 (régen Gemini + restore feedback + branche else) — REMPLACÉ par swap pur
Tout le bloc `if (firstUntouchedWeekIdx >= 0)` et le `updateSessionPaces` inline + branche `else` ont disparu. Remplacés (L1187-1251) par :
- Setup `today` + `freezeRaceSpecific` (true si `targetTime` défini, doctrine D1).
- `plan.weeks.map(...)` qui :
  - skip `_raceDay === true` (D16 raceDayInject)
  - skip `elevationGain > 150` (D16 Cory Smith trail patché Minetti)
  - skip `sessionDate < today` (doctrine `feedback_patch_live_plans_jour_seulement`)
  - sinon `recalibrateSession(session, oldPaces, newPaces, { freezeRaceSpecificPaces })`
- Build `updatedPlan` avec spread + métadonnées (vma/vmaSource/paces/generationContext/feasibility).
- D17 transparence : préfixe `welcomeMessage` "📊 Tes allures ont été mises à jour…" (idempotent via test du préfixe).
- `savePlan` + `setPlan`.

### C) Toast succès (L1270-1278) — Adapté
- Avant : "X semaines conservées" (basé sur feedback, trompeur).
- Après : "N séance(s) mise(s) à jour (les séances déjà passées restent inchangées)".

### D) Logique PRÉSERVÉE telle quelle
- L1050-1068 : gates Premium + VMA range + delta < 0.1.
- L1086-1136 : détection level + réduction volumes si `vmaDecreased && levelChanged`.
- L1139-1146 : `updatedContext` (vmaSource, paces, periodizationPlan, snapshot).
- L1150-1185 : recompute `feasibility` + warnings.
- L1253-1268 : `bigChangeWarning` + `levelChangeInfo`.

---

## 2. Build status

**NON LANCÉ** — sandbox a refusé `npx vite build`, `node_modules/.bin/vite build`, `tsc --noEmit` (3 tentatives bloquées).

Action utilisateur requise :
```bash
cd /Users/romanemarino/Coach-Running-IA && npx vite build
```

Risques identifiés à la relecture statique :
- `plan.paces` → utilisé via `(plan as any).paces` car `paces` n'est pas typé sur `TrainingPlan` (cf. types.ts L226-278, `paces` n'existe que sur `GenerationContext`). Compatible avec usage existant qui écrivait `fullPlan.paces = newPaces` runtime.
- `updatedPlan: TrainingPlan` + `paces: newPaces` dans spread → OK (excess properties tolérées sur spread, comme l'ancien code).
- Aucun nouveau type top-level. Tous les imports existent (vérifiés via grep).

---

## 3. Tests status

**NON LANCÉ** — sandbox a refusé `npx vitest run`. Aucune modification au service `paceRecalibrationService.ts` lui-même (45 tests dormants restent verts par construction).

Action utilisateur requise :
```bash
npx vitest run src/services/__tests__/paceRecalibrationService.test.ts
npx vitest run src/services/__tests__/paceRecalibrationService-stress.test.ts
```

---

## 4. Comment tester le fix en local

1. `npx vite dev`
2. Login user Premium avec un plan existant (ex: Robine ou floggyz).
3. Cliquer "Recalculer mes allures" depuis PlanView.
4. Saisir nouvelle VMA (ex: 8.3 → 10.0 pour Robine).
5. Valider modal.
6. **Attendu** :
   - Toast "Recalcul des allures en cours..." pendant **< 1 seconde**.
   - Toast succès "✅ Allures recalibrées ! VMA : 8.3 → 10.0 km/h. Nouvelle allure EF : … N séances mises à jour (les séances déjà passées restent inchangées)."
   - `welcomeMessage` préfixé "📊 Tes allures ont été mises à jour suite au changement de ta VMA (8.3 → 10.0 km/h). Ton allure course objectif reste inchangée. Si elles ne te conviennent pas, contacte le coach dans le chat."
   - Toutes les séances futures : `targetPace` + `mainSet` cohérents avec nouvelle VMA.
   - Séances avec date < aujourd'hui : intactes.
   - Si plan trail D+ Cory Smith ou raceDay : ces séances inchangées (skip explicite).
   - Si user a `targetTime` : allures spécifiques 5K/10K/Semi/Marathon GELÉES (D1 respecté).

7. **Stress test** : recalibrer 2x de suite (10 → 11 → 12). Le préfixe `welcomeMessage` ne doit PAS doubler (idempotence test `.startsWith('📊 Tes allures')`).
