# F-17 "Recalibrer mes allures" — Challenge dev (architecte 30 ans)

Inputs lus : `src/types.ts`, `src/App.tsx` L1100-1270 (recalcul VMA existant, partiel), `src/components/SessionCard.tsx` L75-122 (rendu pace), `src/services/storageService.ts` L193, plan Robine `/tmp/audit-3prem-27mai-soir/plan-1779898894672.json`.

État Robine confirmé : `calculatedVMA=8.3`, `vma=10.0`, `vmaSource="Ajustée manuellement : 8.3 → 10.0"`. W1 sessions encore `targetPace="10:47"` ET mainSet contient `"allure 10:47 min/km"`. W2+ ont `targetPace="8:57"` ET mainSet `"8:57"`. Le code App.tsx l.1208-1234 (`updateSessionPaces`) touche UNIQUEMENT `targetPace` des semaines avec feedback, JAMAIS le mainSet, et utilise un mapping regex titre/intensity faillible. La régénération Gemini est déjà déclenchée pour les semaines sans feedback. **L'approche proposée par F-17 est donc une régression** (re-patch d'un truc déjà à moitié patché).

---

## 1. Verdict approche actuelle

**REJET de l'approche 1 (regex-replace mainSet)**. Raisons :

- `mainSet` est du langage naturel Gemini : `"5 blocs de 5 min de footing en endurance fondamentale (8:57)"`, `"50 min en deux moitiés...autour de 8:57"`, `"débuter très lentement à 12:02 min/km puis stabiliser à 10:47"`. Plusieurs paces par phrase, parenthèses, gammes, allures secondaires (warmup/cooldown). Aucun regex robuste sur 6 plans audités.
- Régex-replace `\d+:\d+ min/km` casse les cas où Gemini cite `12:02` (allure récup ou échauffement, dérivée différente de l'EF). Cf. plan Robine W1 session "Footing progressif vallonné".
- Du code existe déjà (App.tsx l.1208) qui patche `targetPace` via détection titre/intensity → produit l'incohérence visible aujourd'hui (`targetPace` neuf, `mainSet` ancien). Ajouter regex par-dessus = empilement de hacks.
- Doctrine `feedback_chaque_ligne_justifiee` : on ne peut pas justifier la suppression du mainSet original sans archivage.

## 2. Approche alternative recommandée

**Hybride à deux niveaux, ordre de préférence :**

**A — Court terme (1-2j, low risk) : autorité `targetPace`, mainSet déclassé en cosmétique.**
- `SessionCard` affiche déjà un encadré pace dédié dérivé de `session.targetPace` (l.87-122). C'est la source autoritaire.
- Ajouter dans `convertPacesInText` (mainSet rendering) un *strikethrough + tooltip* sur les paces du mainSet quand `plan.vmaSource` contient "Ajustée" ET le pace mainSet diffère du `targetPace`. Message : "Allure mise à jour, voir encart ci-dessus".
- Patch `targetPace` propre via la VRAIE source (cf. point B ci-dessous), pas via regex titre.

**B — Moyen terme (1 sem) : `paceRole` figé sur Session à la génération.**
- Ajouter `Session.paceRole: 'EF' | 'EA' | 'SEUIL' | 'VMA' | 'RECUP' | 'SPE_5K' | 'SPE_10K' | 'SPE_SEMI' | 'SPE_MARATHON' | 'NONE'` produit par Gemini OU déduit dans `geminiService` au post-process (l.829-1048 le fait déjà partiellement).
- Recalibrage = O(N) : `session.targetPace = newPaces[session.paceRole]`. **Zéro regex, zéro ambiguïté**. La détection titre/intensity actuelle de l.1220-1231 disparaît.
- mainSet reste inchangé textuellement mais SessionCard peut wrapper les paces affichées avec le pace recalculé via `paceRole`.

**C — Rejet long terme** : pas de régénération Gemini complète (coût + 30s UX + perte de la séance vécue), pas de calcul dynamique pur (perte de la prose Gemini qui est l'identité produit).

## 3. Cinq risques majeurs identifiés

1. **Allures spécifiques course** (5k/10k/semi/marathon) dérivent de `targetTime`, PAS de la VMA. Le code l.1215 le sait. Un regex aveugle écraserait l'allure marathon par EF. Risque haut. Mitigation = `paceRole`.
2. **Allures trail D+ patchées Cory Smith** (D16 doctrine `project_coach_running_ia_d16_modificateur_dplus_corysmith`). `targetPace` trail est déjà modifié séance par séance selon D+/km. Un recalibrage VMA naïf RÉ-écraserait cet ajustement. À skipper si `session.goal === TRAIL && session.elevationGain > seuil`.
3. **Race day session** (`_raceDay:true`, doctrine D19 `weeklyVolumes`). `raceDayInject.ts` injecte un `targetPace` lié au `targetTime`, pas à la VMA. Ne JAMAIS patcher.
4. **Mode marche-course** (débutants/petite VMA). Pace EF peut être 12:00+, parfois clampé. Recalibrer à la hausse vers 8:57 peut casser le scope marche-course (doctrine `feedback_mode_marche_course_scope`). Vérifier que le user reste dans le scope marche-course après recalcul.
5. **Feasibility post-recalcul** (D17 doctrine `feedback_d17_feasibility_transparence_optin`). VMA qui monte → objectif devient peut-être faisable, OU VMA qui baisse → IRRÉALISTE. Le code l.1145-1180 le fait déjà. **Mais** `welcomeMessage` n'est PAS régénéré → reste obsolète. À régénérer ou flagger.

## 4. Specs idempotence + rollback

**Idempotence** :
- Ajouter `plan.vmaHistory: Array<{vma:number, vmaSource:string, at:string, paces:Paces}>` (append-only).
- `calculatedVMA` reste la VMA d'origine inférée du chrono / questionnaire (immuable, doctrine `feedback_input_client_obligatoire`).
- `plan.vma` (live) = dernière entrée de l'historique.
- 2e recalibrage part TOUJOURS de `plan.vma` courant + reconstruit les paces, JAMAIS de `calculatedVMA`. Logique pure → idempotente : recalibrer 10→10 est un no-op détecté avant write Firestore (économie quota).
- Garde : `if (Math.abs(newVMA - plan.vma) < 0.05) return;` (cf. App.tsx — à ajouter, manquant aujourd'hui).

**Rollback** :
- Bouton "Annuler le recalibrage" visible 24h après la dernière entrée `vmaHistory`. Pop la dernière entrée, restore `plan.vma`, `plan.paces`, `plan.feasibility` depuis `vmaHistory[-2]`.
- Snapshot Firestore du plan AVANT recalibrage dans sous-collection `plans/{id}/snapshots/{ts}` (TTL 30j). Indépendant du `vmaHistory` (qui ne stocke pas les weeks).
- UI : modal "Vraiment recalibrer ? Cette action peut être annulée 24h." (transparence, doctrine `feedback_securite_avant_conversion`).

## 5. Couverture tests minimum

**Unitaires (Vitest, `services/__tests__/recalibrate.test.ts`)** :
- `recalibratePaces(plan, newVMA)` retourne un plan avec `paces` cohérents (5 ratios VMA × 1 cas).
- `paceRole` mapping exhaustif : EF, EA, Seuil, VMA, Récup, Spé 5/10/semi/marathon → assert `targetPace` correct (8 cas).
- Idempotence : `recalibrate(recalibrate(p, 10), 10) === recalibrate(p, 10)` (deep equal).
- No-op si delta < 0.05.
- Pas de mutation `calculatedVMA`.
- Pas de mutation sur sessions avec `paceRole === 'NONE'` (renfo) ou `_raceDay:true`.
- Trail D+ : sessions avec `elevationGain > 150` gardent leur `targetPace` patché Cory Smith.
- Marche-course : session avec `type === 'Marche/Course'` recalcul EF mais clamp ≥ pace marche-course min.

**Intégration (1 test sur plan Robine réel)** :
- Charge `plan-1779898894672.json`, applique recalibrage 10 → 9, assert : tous `targetPace` cohérents avec VMA=9, `vmaHistory.length === 2` (entrée 8.3→10 + 10→9), feasibility recalculée, welcomeMessage flaggé pour régénération.

**Snapshot mainSet** : sur 10 plans du `audit-3prem-27mai-soir/`, run le recalibrage, dump `{id, paceRole, targetPace, mainSet}` pour chaque session, diff humain. Goal : 100% des `targetPace` cohérents (zéro silencieux), mainSet inchangé (et flaggé "obsolète" en UI uniquement).

**Couverture régex mainSet** : SI on garde l'approche A, mesurer sur 10 plans le % de paces du mainSet qui matchent `\d{1,2}:\d{2}(\s*min/km)?`. Hypothèse : 70-85%. **15-30% rate silencieusement** → INACCEPTABLE sans `paceRole`. C'est l'argument définitif pour l'approche B.

---

**Recommandation finale** : approche A déployée immédiatement (autorité `targetPace` + barré mainSet) pour stopper l'incohérence Robine + sprint d'1 semaine sur `paceRole` (B). Aucune régex sur mainSet, jamais.
