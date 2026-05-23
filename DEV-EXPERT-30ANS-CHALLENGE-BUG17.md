# Challenge dev expert 30 ans — Bug 17 V2 Strategy C light
Date : 2026-05-23

## Verdict global

**GO ajusté** : Strategy C light est conceptuellement correcte (sémantique cyclique day-from-startDate). Mais elle masque 4 pièges latents que les juniors ratent. Aucun n'est P0 bloquant mais 2 sont P1 et doivent être traités dans le MÊME sprint, sinon on déploie un fix qui révèle un autre bug invisible aujourd'hui (timezone UTC vs local) et qui se déclenchera sur un user à fuseau négatif ou un user qui choisit le 1er du mois pile.

Verdict : GO C light **+ 5 ajustements obligatoires** ci-dessous, **avant** code.

---

## Pièges dates non couverts (Dimension 1)

### Piège #1 — `new Date("YYYY-MM-DD")` parse UTC, pas local (P1)

Constat code : 12 sites utilisent `new Date(plan.startDate)` au lieu de `parseLocalDate(plan.startDate)` :

- `geminiService.ts:4885` (align Monday backend — sera supprimé)
- `geminiService.ts:4897` (endDate calc)
- `geminiService.ts:1144` (`computePlanDurationWeeks` startDate parse)
- `geminiService.ts:1143` (raceDate parse)
- `geminiService.ts:5837-5838` (fullPlan endDate)
- `PlanView.tsx:553, 611, 676, 698, 1742` (4 sites inline + 1 progressStats)
- `PlanView.tsx:610` (raceDt = `new Date(rawRaceDate)`)
- `PlanView.tsx:918-919` (handleStartDateChange diffWeeks)
- `raceDayInject.ts:204-205` (raceDate + startDate parse)
- `exportService.ts:32` (raceDateObj parse)
- `Questionnaire.tsx:31` (todayStr via `toISOString()` — décale en fuseau horaire négatif)

**Sémantique** : `new Date("2026-05-24")` = ISO 2026-05-24T00:00:00.000Z. En France (UTC+2 en mai, DST été) → c'est sam 23 mai 22:00 LOCAL. `.getDay()` retourne **6 (samedi)** au lieu de **0 (dimanche)**.

**Impact sur cas Arnaud (post-fix)** :
- plan.startDate = "2026-05-24" stocké
- PlanView L553 `new Date("2026-05-24").getDay()` en France = 6 (sam) au lieu de 0 (dim)
- Le `currentWeekNumber` est calculé avec un décalage 1 jour
- En zone UTC-X (LA UTC-7 par ex.), `.getDay()` retourne 5 (vendredi)

**Sévérité** : P1. Bug LATENT non détecté car les plans existants avaient startDate=Lundi → `new Date("2026-05-18").getDay()` en France = 0 (dim) au lieu de 1 (lun), MAIS l'align Monday inline recalculait `daysToMonday=-6` (lundi précédent = même date par hasard). Avec startDate=Lundi vrai, le bug compensait. Avec startDate variable, le bug se révèle.

**Reco** : remplacer TOUS les `new Date(stringISO)` par `parseLocalDate(stringISO)` dans les 12 sites. C'est une ligne de change par site. À faire DANS le même sprint sinon Strategy C light déploie un nouveau bug invisible.

### Piège #2 — DST shift (Mars 28→29 / Octobre 25→26 2026) (P2)

Les manipulations type `setDate(x.getDate() + N)` traversent les DST. Test :
```
new Date(2026, 2, 27).setDate(d.getDate() + 4) // 27 mars + 4j = 31 mars 00:00
// Mais en passant le 29 mars (DST +1h), si on travaille en UTC ms : 4*86400000 = 4j exactement
// setDate manipule en local : OK, pas de drift
```

**Sémantique** : `setDate()` est local-aware, donc DST-safe. **MAIS** `(target.getTime() - start.getTime()) / 86400000` (utilisé L616 PlanView, L210 raceDayInject, L56 dateUtils.getWeekNumberForDate) peut donner 13.958 jours pour 14 jours calendaires sur un passage DST. `Math.floor()` retourne 13 au lieu de 14 → weekNumber décalé d'1 sem.

**Impact réel** : plan 16 sem démarré dim 22/02/2026, week 5 (S5 commence 22 mars, traverse DST 29 mars). `getWeekNumberForDate(new Date(2026, 3, 5), "2026-02-22")` : diffMs = (5 avril - 22 fév) * 86400000 - 3600000 (heure DST perdue) → diffDays = floor(42.958) = 42 → weekNum = floor(42/7)+1 = 7. **Correct par chance** (le -1h ne suffit pas à passer un seuil 7j × 24h). Edge case réel : start = 22 fév 00:00, target = 29 mars 00:00 (jour DST exact). diffMs = 35*86400000 - 3600000. /86400000 = 34.958 → floor = 34. Attendu = 35.

**Reco** : utiliser `Math.round` au lieu de `Math.floor` pour diffDays. Tolère les ±1h DST. Ligne unique change dans `dateUtils.ts` getWeekNumberForDate.

### Piège #3 — Locale Sunday=0 vs Monday=0 (P2)

JS native `Date.getDay()` retourne 0=Dimanche, 1=Lundi. Le code utilise partout la conversion `(getDay() + 6) % 7` pour passer en base Lundi=0, mais certains sites omettent (raceDayInject L36-38 : conversion correcte ; PlanView L554 : utilise raw getDay() avec daysToMonday=-6/1-day, équivalent à conversion).

**Sémantique** : pas de bug actuel, mais la nouvelle `calculateSessionDate` du C light pseudo-spec L218 manipule `(start.getDay() + 6) % 7`. Risque de mauvaise interprétation si dev junior fait `start.getDay()` direct.

**Reco** : centraliser dans dateUtils un helper `getMondayBasedDow(date: Date): 0..6`. Pas de bug, juste anti-régression code-review.

### Piège #4 — Today client vs serveur (P2)

Questionnaire L31 `todayStr = new Date().toISOString().split('T')[0]` :
- France 23h59 : returns "2026-05-23" (UTC = 21h59 le 23) → min=23/05 ✓
- France 02h00 (24/05 local) : returns "2026-05-23" (UTC = 00h00 le 24… wait, en été UTC+2 = 24/05 00h00 UTC) → "2026-05-24" ✓
- LA 17h00 23/05 = UTC 24/05 00h00 → returns "2026-05-24" alors que l'utilisateur est encore le 23/05 LA. **min affiché = demain LA**. Inoffensif mais étrange.
- Sydney 06h00 24/05 = UTC 23/05 20h00 → returns "2026-05-23" alors que l'utilisateur est déjà le 24/05 Sydney. **L'user peut choisir 23/05 = passé chez lui**.

**Impact** : utilisateurs en zones EXTRÊMES (NZ/Sydney/LA) peuvent voir un `min={todayStr}` décalé d'1 jour. Question philosophique : startDate="2026-05-23" pour un user NZ qui est déjà le 24/05 Sydney = plan dans le passé.

**Reco** : pour Sprint Bug 17, **accepter** (cas extrême non Romane). Documenter pour audit V3.

---

## Compatibilité plans existants (Dimension 2)

**Plans existants en base** :
- 100% ont `plan.startDate` aligné Lundi (à cause du bug align Monday backend en place depuis des mois)
- Sémantique `session.day` = "jour ISO Lun..Dim" identique à la nouvelle logique cyclique quand startDate=Lundi

**Test sémantique** : startDate=Lundi 18/05, nouvelle `calculateSessionDate("2026-05-18", 1, "Lundi")` :
- start = lundi 18/05
- startDowMon0 = (1+6)%7 = 0 ✓ (Lundi=0)
- targetDowMon0 = DAY_TO_INDEX["Lundi"] = 0
- daysFromStart = (0-0+7)%7 = 0
- résultat = 18/05 ✓ IDENTIQUE à l'ancien

**Conclusion** : **ZÉRO migration nécessaire** pour les plans existants où startDate=Lundi (cas 100% actuel). Affichage strictement identique post-deploy.

**Cas spécial Arnaud** : son plan a déjà été patché live (`patch-arnaud-startdate-live.mjs`, `repatch-arnaud-startdate-dim.mjs`) → startDate=2026-05-24 (dim). Après deploy, S1 J1 day="Lundi" → 25/05 ✓ (au lieu de 24/05 affiché aujourd'hui sous hack). À VÉRIFIER que les patches scripts ne stockaient pas dateOverride parallèlement, car L924-929 storageService reset les dateOverride uniquement via `updatePlanStartDate` ; si Arnaud a des dateOverride existants pré-fix sur sessions S1 ils SUBSISTERONT et masqueront la nouvelle logique.

**Vérification effectuée** : `grep -c '"dateOverride"' backup-arnaud-startdate-{,-v2-}*.json` → **0** dans les deux backups. Aucun script reset nécessaire pour Arnaud.

**Sévérité** : RAS (vérifié).

---

## Changement date PlanView (Dimension 3)

### Cas 1 — Changement Lundi → Samedi

`handleStartDateChange("2026-06-13")` (sam). L920 calcule `availableWeeks = floor((race - newStart)/7j)` avec `new Date(newStartDate)` (UTC). Pour newStart=sam, race=dim : diff en France = 1j (UTC) au lieu de 1j local. Idempotent.

L940 `updatePlanStartDate(plan.id, "2026-06-13")` → écrit en base.
L942-949 reset local des dateOverride : tous les `dateOverride: undefined`. ✓

**Avec nouvelle dateUtils** :
- S1 J1 day="Lundi" → `calculateSessionDate("2026-06-13", 1, "Lundi")` :
  - start = sam 13/06 (parseLocalDate)
  - startDowMon0 = (6+6)%7 = 5
  - targetDowMon0 = 0
  - daysFromStart = (0-5+7)%7 = 2
  - résultat = sam 13 + 2j = lun 15/06 ✓

Cohérent. ZÉRO bug.

### Cas 2 — dateOverride PRÉ-EXISTANT lors d'un changement startDate

Sémantique actuelle (L924-929 storageService) : reset BRUT de TOUS les dateOverride. Comportement préservé post-fix. ✓ Aucune corruption possible car on wipe avant recalcul.

### Cas 3 — Edge case session déplacée AVANT changement startDate

User déplace S1 J1 lun→jeu via `updateSessionDate` (dateOverride="2026-05-28"), puis change startDate de "2026-05-25" → "2026-06-01". Le reset L924 wipe le dateOverride → S1 J1 day="Lundi" affiché sur lun 01/06 (sa "true" position). User PERD son déplacement.

**Question UX** : faut-il prévenir l'user ? Actuel = silent reset.
**Reco** : ajouter ligne dans toast L952 : `"Les dates des séances ont été recalculées (déplacements manuels remis à zéro)"`. P2 polish, à pousser dans même sprint pour transparence.

---

## Impact LLM (Dimension 4)

Audit prompt L4385-4738 : le LLM reçoit `startDate=...` UNIQUEMENT dans le bloc FORMAT DE SORTIE (L4729). Aucune RÈGLE ABSOLUE ne mentionne startDate. Les `day` sont contraints par `preferredDays` (L4394, L4440) + `longRunDay` (L4441).

**Vérification empirique nécessaire** : le LLM avec startDate=dim 24/05 + preferredDays=[Lun,Mer,Ven] va-t-il générer S1 sessions sur Lun/Mer/Ven (= 25, 27, 29 mai) ou tenter S1 sessions sur dim 24 + 2 autres ?

**Mon verdict** : LLM ignore startDate jour-semaine (il n'a aucune instruction de croisement). Génère sur preferredDays. Post-process L4838-4847 force `session.day = prefDays[idx]` quoi qu'il arrive. **Risque résiduel zéro**.

**Sub-question** : faut-il enrichir le prompt ? Spec V2 dit "OPTIONNEL". 
**Reco** : NON. Le post-process est suffisant. Ajouter une instruction = risquer une hallucination du LLM sur la semaine 1 du plan. Doctrine `feedback_pas_de_micro_expert` : ne pas raffiner ce qui marche.

**Sévérité** : RAS.

---

## Régression tests (Dimension 5)

595/599 tests verts actuellement. Recensement tests touchés :

- `raceDayInject.test.ts` L25, L41, L54 : utilise `startDate = lundi 2026-04-06`. **Pas de régression** (lundi = comportement identique).
- `sprint-e-phase1-p0-transversaux.test.ts`, `validation-10-profils-trail-ultra.test.ts`, `plan-duration-cap.test.ts` : utilisent startDate string. À grep pour vérifier que `getDay()` n'est jamais appelé directement.
- AUCUN test unitaire sur `dateUtils.ts` (alignToMonday, calculateSessionDate, getWeekNumberForDate). **Trou de couverture**.

**Reco P1** : créer `dateUtils.test.ts` avec 12 cas :
1. calculateSessionDate startDate=Lun, day=Lun → S1 J1 ✓
2. calculateSessionDate startDate=Lun, day=Dim → +6j ✓
3. calculateSessionDate startDate=Dim, day=Lun → +1j ✓ (cas Arnaud)
4. calculateSessionDate startDate=Sam, day=Sam → +0j ✓
5. calculateSessionDate startDate=Mar 30/12/2026, weekNumber=1, day=Lun → +6j = 05/01/2027 (traversée année)
6. calculateSessionDate weekNumber=4, startDate=Mar 24/02/2026, day=Lun → traversée DST 29 mars
7. getWeekNumberForDate(today, startDate=Dim 24/05/2026) → semaine en cours bien calculée
8. getWeekNumberForDate avec target en DST → assertion sur weekNumber correct
9. resolveSessionDate avec dateOverride priorité ✓
10. parseLocalDate("2026-05-24") = date locale 24/05 00:00, pas UTC
11. Edge case startDate="2026-12-31" (31 déc), 16 sem plan → endDate calc
12. Edge case raceDate dans semaine 1 (raceDayInject weekIdx)

**Sévérité** : P1. Ne pas déployer sans ces tests.

---

## Schéma DB dateOverride (Dimension 6)

`session.dateOverride: string` (ISO YYYY-MM-DD). 

**Sémantique** : si présent, remplace le calcul. Insensible au refacto.

**Question** : après changement startDate, faut-il invalider ?
- `updatePlanStartDate` L924-929 wipe tous les dateOverride. ✓ Comportement déjà bon.
- `updateSessionDate` L853-876 : écrit un dateOverride. Pas concerné.
- `shiftSessionDates` L879-912 : convertit la position calculée → dateOverride pour shift cohérent. ✓

**Risque** : dateOverride stale si :
1. User déplace S2 J3 (dateOverride = "2026-06-04")
2. Plan a startDate "2026-05-25"
3. Coach IA propose `updatePlanStartDate` (qui wipe) — OK
4. Mais si on créé une route ALTERNATIVE genre `bulk update`, attention à wipe.

**Action** : aucune actuellement. Documenter dans le commentaire de `Session.dateOverride` (types.ts L169) : "si on change `plan.startDate`, `updatePlanStartDate` doit être appelé qui wipe tous les overrides — toute autre route doit faire de même".

**Sévérité** : P2 (commentaire docu).

---

## Performances (Dimension 7)

`calculateSessionDate` est `O(1)` (3 ops Date + un modulo). Appelé pour chaque session de chaque rendu PlanView.

- Plan 16 semaines × 4 sessions = 64 calls par render
- React useMemo dépend de `plan` → re-render seulement sur changement plan
- 64 × O(1) = négligeable (<1ms)

**Recalcul cascade lors changement startDate** : `setPlan` triggers full re-render → 64 recalculs. Acceptable.

**Sortie longue 27 semaines** : 27 × 4 = 108 calls par render. Toujours <2ms. RAS.

**Sévérité** : aucune. Pas d'optimisation requise.

---

## Modifications EXACTES recommandées avant code

1. **Inclure remplacement `new Date(stringISO)` → `parseLocalDate(stringISO)`** dans le scope du sprint (12 sites listés Dim 1 #1). Sinon Strategy C light déploie un nouveau bug invisible sur tous fuseaux ≠ UTC+2 d'été. **P1 obligatoire**.

2. **Changer `Math.floor(diffMs/86400000)` → `Math.round(...)`** dans `dateUtils.getWeekNumberForDate` (L56) et autres calculs de diffDays. DST-safe. **P2 recommandé**.

3. **Créer `dateUtils.test.ts`** avec 12 cas avant deploy. Couvre Lundi/Dimanche/Samedi/Mardi en startDate + DST + traversée année + dateOverride priorité. **P1 obligatoire**.

4. ~~Vérifier état dateOverride Arnaud~~ : VÉRIFIÉ (0 dateOverride dans les 2 backups). Aucun script reset nécessaire.

5. **Toast handleStartDateChange enrichi** : signaler à l'user que les déplacements manuels sont wipe. **P2 polish**.

6. **Ne PAS toucher au prompt LLM** (L4729). Doctrine `feedback_pas_de_micro_expert`. RAS.

---

## Plan exec ajusté

1. **(20 min)** Écrire `dateUtils.test.ts` (12 cas listés Dim 5). Lancer tests : ils échouent (logique pas encore refacto). RED.

3. **(15 min)** Refacto `dateUtils.ts` :
   - `calculateSessionDate` selon pseudo-spec V2 L213-219 (sémantique cyclique).
   - `getWeekNumberForDate` : `Math.round(diffMs/86400000)` au lieu de `Math.floor`.
   - Conserver `alignToMonday` exporté mais marquer `@deprecated` (zéro consumer après refacto PlanView).
   - Helper exporté `getMondayBasedDow(date)` pour réutilisation.
   - Helper exporté `getWeekStartDate(planStartDate, weekNumber)` : `parseLocalDate(planStartDate) + (weekNumber-1)*7`.

4. **(15 min)** Refacto `geminiService.ts` :
   - **SUPPRIMER L4883-4892** (align Monday backend).
   - Remplacer L4885 (legacy si encore là), L4897, L1144 : `new Date(...)` → `parseLocalDate(...)`.
   - L5837-5838 idem.
   - **L4729 prompt LLM** : ne PAS toucher.

5. **(30 min)** Refacto `PlanView.tsx` :
   - L553-561 : remplacer par `const currentWeekNumber = Math.max(1, Math.min(totalWeeks, getWeekNumberForDate(new Date(), plan.startDate)));`
   - L609-619 : remplacer raceDt par `parseLocalDate(rawRaceDate)`, calculer `raceWeekIdx = getWeekNumberForDate(raceDt, plan.startDate) - 1`. Garde-fou `diffDays >= 0` via vérification preChain.
   - L671-687 getSessionDate fallback : remplacer le bloc inline par `return calculateSessionDate(plan.startDate, weekNumber, dayName);`
   - L696-723 getWeekStatus : remplacer calcul weekStart inline par `const weekStart = getWeekStartDate(plan.startDate, week.weekNumber);` et `weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);`
   - L918-919 handleStartDateChange : remplacer `new Date(newStartDate)` et `new Date(raceDate)` par parseLocalDate.
   - L1742-1750 previewWeeks : idem getWeekStartDate.
   - L952 toast : enrichir message.

6. **(10 min)** Refacto `raceDayInject.ts` :
   - L204-205 : `new Date(raceDateRaw)` → `parseLocalDate(raceDateRaw)`. Idem startDate.

7. **(10 min)** Refacto `exportService.ts` :
   - L32 raceDateObj : parseLocalDate.
   - L40-49 : OK, fallback non lié à plan.startDate (utilise plan.createdAt).

8. **(20 min)** Lancer tous tests. Vérifier dateUtils.test.ts GREEN. Vérifier 595/599 → 595/599 (zéro régression) + dateUtils tests = 607/611.

9. **(20 min)** Test manuel 4 profils (Lun/Mer/Sam/Dim startDate) + changement date PlanView + plan avec raceDate. Vérifier display dates + raceDay injection.

10. **(15 min)** Deploy + monitoring : log `[Plan] startDate=X stored as=Y` côté geminiService L4729 (avant LLM) et L4901 (après endDate calc). Confirmer X===Y systématiquement.

11. **Hors-sprint immédiat** : audit batch base (script `audit-startdate-drift.mjs`) pour comparer `questionnaireSnapshot.startDate` vs `plan.startDate` sur ~50 plans. Si plan.startDate ≠ qs.startDate ET S1 non commencée ET plan.startDate < today → `updatePlanStartDate(plan.id, qs.startDate)`. Voir doctrine `feedback_patch_live_plans_jour_seulement`.

**Total estimé** : 2h45 (au-delà du timebox 1h30 du spec V2, mais c'est la conséquence d'intégrer le piège timezone P1 dans le même sprint — refus d'intégrer = déploiement d'un bug latent).
