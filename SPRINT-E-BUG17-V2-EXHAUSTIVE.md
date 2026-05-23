# Bug 17 startDate — Spec exhaustive (doctrine input client strict)
Date : 2026-05-23
Statut : spec dev/PM, aucun code écrit ici. TimeBox 1h30 audit pipeline complet.

## Doctrine confirmée Romane PM (2026-05-23)

> « La date saisie par l'user DOIT être la date du J1 du plan, peu importe le jour
> de la semaine. Et la fonctionnalité "changer la date" dans PlanView doit
> fonctionner avec n'importe quelle date. »

Application directe `feedback_input_client_obligatoire` : la date saisie est un INPUT
client, jamais écrasée. Cas Arnaud (24/05 dim) : actuellement réaligné sur lun 18/05
(date PASSÉE) → bug majeur : on lui montre une S1 dont le J1 est déjà historique.

## Audit pipeline complet

### Étape Questionnaire (src/components/Questionnaire.tsx)
- L31 `todayStr = new Date().toISOString().split('T')[0]`
- L41 `startDate: todayStr` dans initial state QuestionnaireData
- L1051 `<input type="date" value={data.startDate} min={todayStr}>` → garde-fou
  côté front "pas dans le passé", strictement OK. Aucun alignement Monday ici.
- `data.startDate` est passé tel quel à `generatePreviewPlan(data)`.

### Backend src/services/geminiService.ts

1. **L4204** `computePlanDurationWeeks({ startDate: data.startDate, raceDate, subGoal })`
   - L1138-1155 : utilisé pour clamper la durée (cap par subGoal). Si `diffWeeks > cap`,
     **adjustedStartDate** = `raceDate - cap*7j` → décalage légitime côté plan trop long.
     Cet ajustement N'A RIEN À VOIR avec l'alignement Monday : il sert à couper la durée
     d'entraînement, conserve `getTime()` brut sans toucher au jour de semaine.
   - **Préserve le jour de semaine** : si user saisit dim 24/05 et raceDate-cap=mardi,
     l'ajustement passe à un mardi → écrase le dim. C'est cohérent (plan trop long
     mathématiquement) MAIS le fait que ce soit un mardi/jeudi/dimanche est aléatoire.
   - Conséquence : si on adopte la nouvelle doctrine, `adjustedStartDate` reste valide
     tel quel — il décale par soustraction de jours, pas de réalignement Lundi.

2. **L4248** `preferredDaysInstruction` (= `"Séances UNIQUEMENT sur : Lundi, Mercredi, Vendredi"`).

3. **L4252** `longRunDay = data.preferredLongRunDay || 'Dimanche'`

4. **L4729 prompt LLM** : `startDate = "${data.startDate}"` → la chaîne ISO est passée
   AU LLM, mais aucune instruction explicite "semaine = Lundi à Dimanche" → le LLM
   n'utilise pas startDate pour deviner les jours de séances ; il se fie à
   `preferredDays` (L4394 + L4440).

5. **L4813-4877 post-processing preview** : `prefDays` force `session.day` séance i
   = `prefDays[i]` triés `DAYS_ORDER_PREV = [Lundi..Dimanche]`. Tri alphabétique-semaine
   appliqué L4874 → indépendant de startDate.

6. **L4883-4892 ALIGN MONDAY BACKEND (BUG)** :
   ```
   if (plan.startDate) {
     const rawSD = new Date(plan.startDate);
     const dow = rawSD.getDay();
     const daysToMon = dow === 0 ? -6 : 1 - dow;
     if (daysToMon !== 0) { rawSD.setDate(...); plan.startDate = ...; }
   }
   ```
   → C'est ICI que `dim 24/05` devient `lun 18/05`. **À supprimer.**

7. **L4895-4901** `plan.endDate = plan.startDate + durationWeeks * 7j` → pas de Monday
   ici, simple addition. **OK à conserver** (cohérent avec nouvelle doctrine).

8. **L5836-5841 fullPlan endDate recalc** : même logique, addition de jours, pas de
   Monday. **OK à conserver**.

9. **L3884-3954 PREVIEW_RESPONSE_SCHEMA** : `startDate: STRING`, `weeks[].sessions[].day: STRING`.
   Le schéma laisse libre. **OK, aucun changement requis**.

10. **L5550-5589 post-processing remaining** : même logique forçage `session.day`
    selon `preferredDays`. Pas d'alignement Monday ici.

11. **src/services/raceDayInject.ts L200-215** : weekIdx = floor((raceDate-startDate)/7j),
    dayName = `dayNameFromDate(raceDate)`. Si on supprime l'align Monday du backend,
    cette logique reste correcte : weekIdx est calculé en jours bruts depuis startDate.
    **Aucun changement requis** SI on respecte la convention "semaine i = [startDate+(i-1)*7, startDate+i*7-1]".

### Front src/utils/dateUtils.ts

1. **L22-29 alignToMonday** : recule au lundi de la semaine ISO. Utilisé par
   `calculateSessionDate` (L33) et `getWeekNumberForDate` (L52).
   → **À neutraliser** dans la nouvelle doctrine.

2. **L32-40 calculateSessionDate(planStartDate, weekNumber, dayName)** :
   - weekStart = `alignToMonday(parseLocalDate(planStartDate)) + (weekNumber-1)*7`
   - sessionDate = `weekStart + DAY_TO_INDEX[dayName]` (Lundi=0..Dimanche=6)
   - Hypothèse implicite : `session.day` est UN JOUR DE LA SEMAINE ISO commençant au Lundi.

3. **L43-48 resolveSessionDate** : `dateOverride` si présent, sinon calculateSessionDate.
   `dateOverride` = date ISO absolue → **insensible** à l'align Monday. Une session avec
   `dateOverride` a une date fixe quoi qu'on fasse.

4. **L51-58 getWeekNumberForDate** : utilise `alignToMonday(startDate)` comme ancre
   pour calculer le numéro de semaine d'une date arbitraire. **À refacto** pour utiliser
   `parseLocalDate(startDate)` sans align.

### Front src/components/PlanView.tsx

Tous les sites où `alignToMonday` est ré-implémenté inline (anti-pattern, copie-collée
4 fois) :
- **L553-557** : calcul `currentWeekNumber` dans `progressStats` useMemo
- **L609-619** : calcul `raceWeekIdx` dans `previewWeeks` useMemo
- **L673** : fallback `getSessionDate` sans session → `resolveSessionDate` OK
- **L676-687** : fallback inline avec align Monday → idem alignToMonday
- **L697-708** : `getWeekStatus` → ancre weekStart sur Monday
- **L1589-1591** : tri sessions par date → resolveSessionDate, sensible à l'align
- **L1742-1750** : preview weeks (semaines verrouillées) date range affichage
- **L809-816** : `handleDateSelected` → `resolveSessionDate` + `getWeekNumberForDate`
  (donc dépendant de align Monday)
- **L870** : `shiftSessionDates(plan.id, weekNumber, sessionId, daysDiff, plan.startDate)`
- **L887** : recalcul local `resolveSessionDate(s, prev.startDate, w.weekNumber)`
- **L915-958** : `handleStartDateChange` → `updatePlanStartDate(plan.id, newStartDate)`,
  reset des `dateOverride`. **Aucun garde-fou Monday ici** — la fonction accepte déjà
  n'importe quelle date. Tout dépend de la lecture amont via `dateUtils`.

### Front src/services/storageService.ts L853-934

- `updateSessionDate` : écrit `dateOverride` brut sur la session. **OK**.
- `shiftSessionDates(planId, fromWeek, fromSessionId, daysDiff, planStartDate)` L879-912 :
  utilise `resolveSessionDate` → dépend de align Monday actuelle. Si on neutralise
  alignToMonday, le shift respectera désormais la sémantique "session.day relative
  à startDate sans align".
- `updatePlanStartDate` L915-934 : `await updateDoc(planRef, { startDate, weeks })`
  + reset de tous les `dateOverride`. **Aucun garde-fou Monday**. ✅

### Front src/components/StartDatePickerModal.tsx + DatePickerModal.tsx

- StartDatePickerModal : `<input type="date">`, aucun garde-fou jour de semaine. ✅
- DatePickerModal : idem, accepte toute date. ✅

### Front src/services/exportService.ts L39-56

- L39/L45 `getDay()` : utilisés pour export ICS/PDF, **calcul d'index local seulement**
  (positionnement dans le calendrier d'export), non liés à startDate plan. ✅

## Sémantique "day: Lundi" cartographiée — état ACTUEL

| Étape | Sémantique de `session.day` |
|---|---|
| Génération LLM (preview L4385+) | Le LLM reçoit `preferredDays` (ex: ["Lundi","Mercredi","Vendredi"]) ET `longRunDay`. Aucune mention de startDate dans les "RÈGLES ABSOLUES". |
| Post-process L4838-4877 | `session.day` est ÉCRASÉ par `prefDays[idx]` (i-ème préféré). |
| Post-process L4883-4892 | `plan.startDate` est aligné Lundi → ✗ écrase l'input user. |
| Affichage front | `calculateSessionDate(planStartDate, weekNumber, session.day)` = `alignToMonday(planStartDate) + (weekNumber-1)*7 + DAY_INDEX[day]`. Donc S1 J="Lundi" = Lundi de la semaine de startDate. |

**Conséquence sémantique** : `session.day` n'est PAS « le N-ième jour à partir de startDate »,
c'est « ce jour-là dans la semaine ISO du startDate aligné Monday ». D'où le besoin
d'aligner Monday pour que ça « tombe juste ». Le concept et l'align Monday sont CO-DÉPENDANTS.

## Stratégie recommandée : Stratégie C (light) — startDate = J1 + day cosmétique

Justification :
- **A (suppression brute)** casse la sémantique « SL sur Dimanche » : si startDate=Mardi
  et user demande SL Dimanche, on aurait besoin d'un jour-offset >= 5. Calcul à faire
  partout. Nécessite refacto profonde + risque régression S2..Sn (post-process
  preferredDays force `session.day` à un nom de jour fixe → si plan démarre mardi 19/05,
  S1 J1=Mardi=19/05 mais S1 J3="Vendredi" = 22/05 OK. Pour S2 J1="Lundi" = 25/05.
  Donc l'align Monday backend est en réalité utilisée pour FAIRE COÏNCIDER le « Lundi »
  ISO du LLM avec un vrai lundi calendaire). Aucun avantage à supprimer si on conserve
  les noms de jours.

- **B (dayOffset)** = bonne archi mais re-write tous les schémas, post-processing, UI,
  storage, migrations, exportService, raceDayInject, stravaAnalysis… trop large pour le
  bug ; hors scope `feedback_scope_strict`.

- **C light recommandée** :
  1. **Backend** : SUPPRIMER l'align Monday L4883-4892. `plan.startDate` reste = entrée user.
  2. **Frontend dateUtils** : MODIFIER `calculateSessionDate` pour calculer `weekStart`
     à partir de la **semaine calendaire ANCRÉE sur le jour de startDate**, pas sur
     Lundi : `weekStart = parseLocalDate(planStartDate) + (weekNumber-1)*7`
     puis `sessionDate = weekStart + (DAY_INDEX[day] - DAY_INDEX[startDayName] + 7) % 7`
     où `startDayName = INDEX_TO_DAY[(parseLocalDate(planStartDate).getDay()+6) % 7]`.
     Cela signifie : si startDate=Dim 24/05, S1 J1 (day="Dimanche") = 24/05, S1 J2
     (day="Lundi") = 25/05, ..., S1 J7 (day="Samedi") = 30/05. La semaine "tourne" autour
     du jour de démarrage.
  3. **Post-process preferredDays** : aucun changement requis. Le LLM continue à produire
     `day: "Lundi"|"Mardi"|...` selon `preferredDays`. Le front les place dans l'ordre
     **cyclique depuis startDate**.
  4. **getWeekNumberForDate** : `weekStart = parseLocalDate(planStartDate)` sans align,
     `diffDays = (target - weekStart)/86400000`, `weekNumber = floor(diffDays/7)+1`.
  5. **PlanView inline align** : supprimer aux L553-557, L609-615, L676-687, L697-708,
     L1742-1750 ; remplacer par appel à `calculateSessionDate` / `getWeekNumberForDate`.
  6. **alignToMonday** : conservée si utilisée ailleurs (NON : seul l'utilitaire interne
     dateUtils l'utilise + 4 copies inline PlanView). À supprimer aussi (mort code).

**Avantages** :
- 1 seul point backend modifié + 1 seul fichier utilitaire (+ nettoyage inline PlanView).
- Sémantique `session.day` = nom du jour de semaine **maintenue** → compatibilité
  totale plans en base (pas de migration de schéma).
- `dateOverride` continue à fonctionner sans changement.
- Anti-régression : si startDate = Lundi (cas dominant), comportement identique à
  l'ancien (la semaine cyclique commence par Lundi).

**Inconvénient mineur** : « S1 Lundi » d'un plan démarré dim 24/05 est désormais le
lun 25/05, pas le lun 18/05. C'est précisément la doctrine demandée.

## Fix code exhaustif (description, pas de diff binaire)

### Fichier 1 — src/services/geminiService.ts
- **L4883-4892** : SUPPRIMER intégralement le bloc `if (plan.startDate) { ... }` qui
  aligne sur Monday. Remplacer par 1 ligne `// (Doctrine 2026-05-23) plan.startDate
  conservé tel que saisi user — sémantique J1 = jour exact.`
- **L4729 prompt LLM** : conserver tel quel (la chaîne ISO suffit). OPTIONNEL :
  enrichir d'1 ligne `IMPORTANT : startDate ci-dessus = jour exact où le coureur
  veut commencer. Les `day` des séances suivront ses preferredDays.` — UTILE
  uniquement si on observe le LLM générer des `day` aberrants, sinon skip
  (post-process L4838 corrige déjà).
- **L4895-4901 endDate calc** : OK, conserver.
- **L5836-5842 fullPlan endDate** : OK, conserver.

### Fichier 2 — src/utils/dateUtils.ts
Refondre `calculateSessionDate`, `getWeekNumberForDate`, supprimer (ou marquer @deprecated)
`alignToMonday`. Pseudo-spec :
```
calculateSessionDate(planStartDate, weekNumber, dayName):
  start = parseLocalDate(planStartDate)
  startDowMon0 = (start.getDay() + 6) % 7         // 0=Lundi … 6=Dimanche
  targetDowMon0 = DAY_TO_INDEX[dayName] ?? 0
  daysFromStart = (targetDowMon0 - startDowMon0 + 7) % 7
  return start + (weekNumber-1)*7 + daysFromStart days

resolveSessionDate(session, planStartDate, weekNumber):
  inchangé (utilise calculateSessionDate)

getWeekNumberForDate(date, planStartDate):
  start = parseLocalDate(planStartDate)
  diffDays = floor((date - start)/86400000)
  return floor(diffDays/7) + 1
```

### Fichier 3 — src/components/PlanView.tsx
- **L553-561 (progressStats currentWeekNumber)** : remplacer le bloc
  `rawStartDate273.getDay() / daysToMonday273 / setDate` par
  `const currentWeekNumber = Math.max(1, Math.min(totalWeeks, getWeekNumberForDate(new Date(), plan.startDate)));`
- **L609-619 (raceWeekIdx)** : remplacer par
  `const weekNum = getWeekNumberForDate(raceDt, plan.startDate); raceWeekIdx = weekNum - 1;`
  (avec garde-fou diffDays >= 0).
- **L671-687 getSessionDate fallback** : remplacer le bloc inline par
  `return calculateSessionDate(plan.startDate, weekNumber, dayName);`
- **L696-723 getWeekStatus** : remplacer calcul `weekStart` inline par
  `const weekStart = calculateSessionDate(plan.startDate, week.weekNumber, INDEX_TO_DAY[(parseLocalDate(plan.startDate).getDay()+6)%7]);`
  ou plus simple, exposer un helper `getWeekStartDate(planStartDate, weekNumber)` dans
  dateUtils retournant `parseLocalDate(planStartDate) + (weekNumber-1)*7`.
- **L1742-1750 previewWeeks date range** : idem, remplacer par helper `getWeekStartDate`.

### Fichier 4 — aucune modif requise
- `storageService.ts` L853-934 : passe par `resolveSessionDate` qui sera refacto → OK.
- `raceDayInject.ts` : utilise `floor((raceDate-startDate)/7j)` brut → OK avec nouvelle
  doctrine (cohérence "semaine i = [startDate+(i-1)*7, startDate+i*7-1]").
- `exportService.ts` : utilise `resolveSessionDate` côté refacto, et `getDay()` sur la
  date résolue, pas sur startDate plan → OK.
- `Questionnaire.tsx` L1051 `min={todayStr}` : conserver tel quel (interdit le passé).
- `StartDatePickerModal.tsx`, `DatePickerModal.tsx` : aucun changement.

## Tests anti-régression (10 cas précis)

1. **User saisit Lundi 25/05** (preferredDays=[Lun,Mer,Ven], SL Dim) :
   - plan.startDate = "2026-05-25"
   - S1 J1 day="Lundi" → 25/05 ✓
   - S1 J2 day="Mercredi" → 27/05 ✓
   - S1 J3 day="Vendredi" → 29/05 ✓
   - S1 J_SL day="Dimanche" → 31/05 ✓
   - Comportement identique à l'ancien (régression zéro).

2. **User saisit Mardi 26/05** (preferredDays=[Mar,Jeu,Sam], SL Sam) :
   - plan.startDate = "2026-05-26"
   - S1 J1 day="Mardi" → 26/05 ✓
   - S1 J2 day="Jeudi" → 28/05 ✓
   - S1 J3 day="Samedi" → 30/05 ✓
   - S2 J1 day="Mardi" → 02/06 ✓
   - **Avant fix** : startDate aligné à lun 25/05, S1 J1 Mar=26/05 (idem). Différence
     visible si l'user laissait preferredDays=[Lundi,...] : avant son Lundi = lun 25/05
     (avant son input!) ; après son Lundi = lun **suivant** 01/06. **Doctrine confirme.**

3. **User saisit Samedi 23/05** (preferredDays=[Sam,Lun,Mer], SL Sam) :
   - plan.startDate = "2026-05-23"
   - S1 J1 day="Samedi" → 23/05 ✓
   - S1 J2 day="Lundi" → 25/05 (le lundi suivant samedi) ✓
   - S1 J3 day="Mercredi" → 27/05 ✓
   - SL day="Samedi" → 23/05 (collision ce qui est OK : SL = J1)
   - S2 J1 day="Samedi" → 30/05 ✓

4. **User saisit Dimanche 24/05** (cas Arnaud, preferredDays=[Lun,Mer,Ven]) :
   - plan.startDate = "2026-05-24" ✓ (avant : 18/05 passé ✗)
   - S1 J1 day="Lundi" → 25/05 ✓ (avant : 18/05, dans le passé !)
   - S1 J2 day="Mercredi" → 27/05 ✓
   - S1 J3 day="Vendredi" → 29/05 ✓
   - **Bug Arnaud résolu.**

5. **User saisit date passée (24/05 mais aujourd'hui = 30/05)** :
   - `min={todayStr}` du Questionnaire bloque côté input.
   - Si bypass (admin/test) : `computePlanDurationWeeks` calcule diffWeeks
     normalement ; `adjustedStartDate` peut écraser si plan trop long.
   - **Pas de garde-fou supplémentaire à ajouter** (cf. doctrine
     `feedback_ecouter_instructions_explicites`).

6. **Changement date PlanView lundi → samedi** :
   - `handleStartDateChange("2026-06-13")` (samedi) :
     - vérification raceDate > newStart, OK
     - `updatePlanStartDate(plan.id, "2026-06-13")`, reset dateOverride
     - S1 J1 day="Lundi" → recalcul `(0 - 5 + 7) % 7 = 2` → 15/06 (lun) ✓
     - **Avant fix** : startDate stocké = "2026-06-13" mais affichage aligné lun 08/06 ✗.

7. **Changement date PlanView dimanche → mardi** :
   - newStart="2026-06-09" (mar). S1 J1 day="Lundi" → 15/06 ; J="Mardi"=09/06 ✓.

8. **raceDate intact** : aucun cas ci-dessus ne touche `plan.raceDate`. `raceDayInject`
   conserve sa logique. À tester explicitement : plan starts dim 24/05, raceDate = sam
   05/09 → weekIdx = floor((105j)/7) = 15, session du sam dans S15 forcée Course. ✓

9. **Plan où raceDate tombe dans S1** (cas plan court < 1 sem) :
   - `injectRaceSession` raceDayInject.ts L185-220 : weekIdx=0, dayName=dayNameFromDate(raceDate),
     remplace ou ajoute session ce jour. **Inchangé**.

10. **Session avec dateOverride existant + changement startDate** :
    - `updatePlanStartDate` reset tous les dateOverride (L924-929 storageService).
    - Comportement préservé. ✓

## Plan exec (étapes ordonnées)

1. **Dev — refacto utilitaire dateUtils.ts** (15 min)
   - Modifier `calculateSessionDate` selon pseudo-spec.
   - Modifier `getWeekNumberForDate`.
   - Ajouter helper `getWeekStartDate(planStartDate, weekNumber)`.
   - Marquer `alignToMonday` @deprecated (ou supprimer si zéro consumer après refacto).
2. **Dev — backend geminiService.ts** (5 min)
   - Supprimer L4883-4892.
   - Test unitaire computePlanDurationWeeks inchangé.
3. **Dev — PlanView.tsx cleanup inline** (20 min)
   - Refacto L553-561, L609-619, L676-687, L696-723, L1742-1750 → helpers dateUtils.
4. **Test manuel** (30 min)
   - 4 profils questionnaire (Lun/Mer/Sam/Dim startDate) → vérifier dates affichées S1-S3.
   - 2 changements date dans PlanView (lun→sam, dim→mar).
   - 1 plan avec raceDate → vérifier weekIdx course inchangé.
5. **Audit batch base** (1h, voir section dédiée)
6. **Deploy + monitoring** : log `[Plan] startDate=X stored as=X` (vérifier 0 drift).

## Risque régression

- **Plans existants en base** : leur startDate déjà aligné Lundi → le refacto dateUtils
  les affichera AVEC LA NOUVELLE LOGIQUE (S1 J1 day="Lundi" sur le Lundi de startDate
  = identique à avant). **Aucune régression visuelle** pour les plans créés avant fix
  où startDate était déjà Lundi.
- **Plans dont startDate = Lundi mais user voulait autre jour** : avant fix, startDate
  écrasé silencieusement → plan correct visuellement mais user input perdu. Avec fix,
  plans à venir respecteront le choix.
- **Plans live audit nécessaire** : voir section suivante.
- **dateOverride** : insensibles, OK.
- **Exports ICS/PDF** : passent par resolveSessionDate → cohérence préservée.
- **Strava match** : passe par `resolveSessionDate(session, plan.startDate, weekNumber)`,
  match date-based — préservé.

## Audit batch nécessaire

**Critère 1 — Plans dont startDate stockée ≠ startDate user demandée**
- Source : `questionnaireSnapshot.startDate` (input user d'origine) vs `plan.startDate`.
- Script `audit-startdate-drift.mjs` à créer : pour chaque plan en base,
  comparer `qs.startDate` et `plan.startDate`. Filtrer ceux où ≠.
- **Cas Arnaud déjà détecté** (backup : `backup-arnaud-startdate-1779568228453.json`,
  `backup-arnaud-startdate-v2-1779568451578.json` + script `patch-arnaud-startdate-live.mjs`
  + `repatch-arnaud-startdate-dim.mjs` existants).

**Critère 2 — Plans S1 commencée**
- `feedback_patch_live_plans_jour_seulement` : ne PAS toucher les plans dont S1 est
  déjà entamée (feedback complété sur ≥1 session).
- Pour ceux-là : laisser tel quel, planVersion suivante propre.

**Critère 3 — Plans dont S1 n'a pas commencé**
- Si `plan.startDate < today` ET aucun feedback : repatch `plan.startDate = qs.startDate`
  + reset dateOverride (utilise `updatePlanStartDate` du storageService).
- Si `plan.startDate >= today` (cas attendu après fix) : skip.

**Critère 4 — Documenter dans une 2e spec d'audit batch**
Hors scope de ce sprint, mais à programmer immédiatement après deploy fix.
Estimation : 10-50 plans concernés (toutes les créations où user voulait un jour ≠ Lundi
ET creationDate < deploy-fix). Audit à faire pour confirmer ampleur.

## Notes finales

- **Doctrine `feedback_input_client_obligatoire`** : appliquée intégralement —
  startDate user respecté, jamais écrasé.
- **Doctrine `feedback_qualite_avant_vitesse`** : audit complet 5 fichiers
  (geminiService, dateUtils, PlanView, storageService, raceDayInject), 10 cas tests
  documentés, 0 ligne supprimée sans justification (`feedback_chaque_ligne_justifiee`).
- **Doctrine `feedback_scope_strict`** : Stratégie C choisie pour minimiser refacto.
  Stratégie B (dayOffset) jugée hors scope.
- **`raceDate` JAMAIS touché** dans toute la spec (Étape 5 cas 8).
