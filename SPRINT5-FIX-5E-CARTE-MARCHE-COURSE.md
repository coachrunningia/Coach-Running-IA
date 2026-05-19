# Sprint 5 — Fix 5e carte allure + marche-course Débutant

Date : 2026-05-19
Commit : `5a2a21b`
URL prod : https://coach-running-ia.web.app

---

## Contexte

Audit du plan test de Romane (Semi 2h00, 60 ans, VMA 8.3) a révélé deux bugs critiques :
1. La 5e carte "Allure Semi" / "Allure Marathon" était invisible depuis le commit `db7f765` (17 mai 2026) — TOUS les plans Semi et Marathon générés depuis 2 jours en sont impactés.
2. Le mode marche-course se déclenchait pour Intermédiaire / Confirmé / Expert, en violation directe de la doctrine `feedback_mode_marche_course_scope`.

---

## Fix 1 — UI 5e carte (PlanHero + PlanView)

### Fichiers
- `src/components/PlanHero.tsx` (fonction `getRaceSpecificPace`, lignes ~33-59)
- `src/components/PlanView.tsx` (fonction `getRaceSpecificPace`, lignes ~57-83)

### Avant
```ts
const dist = (plan.distance || '').toLowerCase();
if (/marathon/.test(dist) && !/semi/.test(dist)) return ...; // ❌ plan.distance = "21.1 km"
if (/semi/.test(dist)) return ...;                            // ❌ pas le mot "semi"
```
`plan.distance` est numérique (`"21.1 km"`, `"42.2 km"`) — il ne contient JAMAIS les mots "semi" ou "marathon", donc la 5e carte chrono cible ne s'affichait jamais pour Semi/Marathon.

### Après
```ts
const subGoal = ((plan as any).generationContext?.questionnaireSnapshot?.subGoal || '').toLowerCase();
const dist = (plan.distance || '').toLowerCase();
if (/marathon/.test(subGoal) && !/semi/.test(subGoal)) return ...;
if (/semi/.test(subGoal)) return ...;
if (/10/.test(subGoal) || /\b10\s*km\b|\b10k\b/.test(dist)) return ...;
if (/\b5\b/.test(subGoal) || /\b5\s*km\b|\b5k\b/.test(dist)) return ...;
```
Détection prioritaire via `subGoal` (explicite : `"Semi-Marathon"`, `"Marathon"`, `"10 km"`, `"5 km"`), fallback sur `plan.distance` pour 5K / 10K.

### Impact
Tous les plans Semi et Marathon affichent désormais correctement la 5e carte chrono cible (Allure Semi / Allure Marathon).

---

## Fix 2 — Marche-course Débutant uniquement (geminiService)

### Fichier
- `src/services/geminiService.ts` (~L2416)

### Avant
```ts
const isLowVolForTimedLongRace = currentVolume > 0 &&
  currentVolume < minViableVolume * 0.30 &&
  raceDistanceKm >= 15 &&
  hasSpecificTimeTarget;
```
Mode marche-course activé pour TOUS les niveaux (Inter, Confirmé, Expert inclus). Viole la doctrine `feedback_mode_marche_course_scope` ("Mode marche-course = débutants / petite VMA UNIQUEMENT").

### Après
```ts
// Garde-fou doctrine feedback_mode_marche_course_scope :
// Mode marche-course UNIQUEMENT pour Débutant (jamais Intermédiaire/Confirmé/Expert).
const isLevelEligibleForWalkRun = level === 'Débutant (0-1 an)';
const isLowVolForTimedLongRace = isLevelEligibleForWalkRun &&
  currentVolume > 0 &&
  currentVolume < minViableVolume * 0.30 &&
  raceDistanceKm >= 15 &&
  hasSpecificTimeTarget;
```
Pattern `level === 'Débutant (0-1 an)'` strictement aligné sur les autres usages du fichier (lignes 2141, 2178, 2595, 2548, etc.).

### Impact
Un Intermédiaire+ à très bas volume momentané reprendra désormais en course continue (75% VMA cap classique) sans glisser dans un mode walk-run réservé aux profils sans base aérobie.

---

## Tests
- `npx vitest run` : **229/229 verts** (13 test files)
- `npm run build` : **OK** (37/37 prerender pages, 0 errors)

---

## Commit + push
- Hash : `5a2a21b`
- Branche : `main`
- Push : OK (`35e20ab..5a2a21b main -> main`)

---

## Deploy
- Firebase hosting : OK
- 169 files uploaded
- URL : https://coach-running-ia.web.app

---

## À tester par Romane (post-deploy)

1. **Plan Semi** — Régénérer un plan Semi avec chrono cible
   → Vérifier que la 5e carte "Allure Semi" apparaît dans le bloc "Mes allures d'entraînement".
2. **Plan Marathon** — Régénérer un plan Marathon avec chrono cible
   → Vérifier que la 5e carte "Allure Marathon" apparaît.
3. **Plan Intermédiaire bas volume** — Profil Intermédiaire à 3 km/sem qui prépare un Semi 1h45
   → Vérifier dans les logs (console) qu'on N'A PAS `[Periodization] Mode marche-course activé`.
4. **Plan Débutant bas volume** — Profil Débutant à 3 km/sem qui prépare un Semi 2h30
   → Vérifier que le mode marche-course se déclenche TOUJOURS (régression non introduite).

---

## Note importante

La prod attend un **reload des users existants** pour voir la 5e carte (le cache navigateur peut servir l'ancien JS). Les nouveaux plans générés seront calibrés correctement côté backend (fix 2) dès la prochaine génération. Le fix UI (fix 1) s'applique aussi aux plans existants déjà en base — il suffit de rouvrir la page du plan après un hard refresh.
