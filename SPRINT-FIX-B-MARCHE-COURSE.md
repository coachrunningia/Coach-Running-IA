# Sprint Fix B + patches live
Date : 2026-05-21

## Fix B code

### Modifs
1. **`RUN_WALK_PATTERNS`** (geminiService.ts L693-702) : `(?:de\s+|en\s+)?` optionnel + fenêtre 40→60 + `\s+` requis (au lieu de `\s*`).
2. **`extractRunRatio`** (L589-611) : 3 sous-patterns m1/m2/m3 idem assouplis. m1/m2 utilisent désormais `[^,.;\n]*?` pour tolérer texte intermédiaire type "à 9:15" entre course et le séparateur (cas Alexandre).
3. **`recalculateSessionDistance`** (L622+) : nouveau paramètre optionnel `bmi`. Si BMI > 35 et `type === 'Marche/Course'` → cap `runRatio ≤ 0.5` (sécurité débutant obèse classe II, doctrine coach 20 ans).
4. **Propagation `bmi`** via `postProcessWeekQuality` aux 2 sites d'appel (Preview L4637 + Full L5430).

### Validation
- **Tests** : 467/467 verts (suite complète), dont 17 nouveaux ciblés (`marche-course-routing-french.test.ts`).
- **Build** : OK (39 pages pré-rendues, 0 erreur).
- **Hash commit** : `e85ed93`
- **Push** : OK → `coachrunningia/Coach-Running-IA@e85ed93`
- **Deploy hosting** : ❌ Firebase auth expirée — à relancer manuellement par Romane :
  ```
  firebase login --reauth
  firebase deploy --only hosting
  ```

## Patches live

### Alexandre Hyrox `1779381807357` — Jeudi S1 ✅
- Backup : `backup-alexandre-hyrox-1779386268943.json`
- `type` : `Sortie Longue` → **`Marche/Course`**
- `distance` : `3.2 km` → **`5.0 km`**
- `targetPace` : `10:20` → **`9:15`**
- `mainSet` / `duration` : conservés tels quels.
- updateTime Firestore : `2026-05-21T17:57:49.731229Z`
- Post-patch verif : OK 4/4.

### Dimanche S1 Alexandre — NON patché (scope strict)
- Constaté pendant fetch : `type=Sortie Longue` + `distance=undefined` + mainSet `14 reps (1 min de course en aisance à 9:15 + 2 min de marche)`. Même bug.
- Mission explicite "Modifs Jeudi S1" → doctrine `feedback_scope_strict` respectée, Dimanche non patché.
- À décider par Romane : patch séparé recommandé (distance undefined = bug UI).

### Arnaud `1779267211924` — ❌ NON patché
- Doctrine `feedback_patch_live_plans_jour_seulement` : plan créé 19/05, S1 commencée 18/05 → plans antérieurs au jour J = intouchables.

### Autres plans 24h
- Lilian V2 (`1779296358366`) : déjà patché 20/05.
- Aucun autre plan signalé par mission.

## Confirmation 3 experts
- **Dev senior YAGNI** : GO (6 caractères regex + 1 clamp 5 lignes).
- **PM ultra critique** : GO minimal (scope strict respecté).
- **Coach 20 ans** : GO + clamp BMI > 35 ajouté (sécurité débutant obèse).

## Suivi à faire
1. `firebase deploy --only hosting` après réauth (le code en main mais pas en prod).
2. Décider sort de Dimanche S1 Alexandre (même bug, hors scope mission).
