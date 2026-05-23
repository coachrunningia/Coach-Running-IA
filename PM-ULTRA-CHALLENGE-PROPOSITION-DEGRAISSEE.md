# PM ultra critique challenge — Proposition dégraissée Bug 17
Date : 2026-05-23

## Verdict global business + UX

**GO tel quel, avec 2 ajustements micro (pas de complications).** La proposition
dégraissée à 9 sujets / ~1h50 est la bonne dose. Elle résout le cas Arnaud
proprement, couvre les futurs cas (dim/sam/mar), et refuse correctement les
gold-plating timezone/DST/toast du dev 30 ans. Les 2 ajustements ci-dessous
ne complexifient pas, ils ferment des trous concrets.

**Risque vrai produit safe** : couvert. **Risque over-engineering** : évité.

---

## Sujet par sujet (verdict court)

1. Suppression align Monday backend `geminiService.ts:4883-4892` — OK. Coeur du fix. Doit partir.
2. Suppression `alignToMonday` dans `dateUtils.ts:22-29` — OK conditionnel. Une fois les 2 consumers (L33, L52) refactorés, plus aucun appelant (vérifié `grep` : 3 hits, tous dans `dateUtils.ts`). Suppression nette.
3. Refonte `calculateSessionDate` cyclique modulo 7 — OK. Code correct, sémantique conforme à la nouvelle doctrine "startDate = J1 réel". Compatible plans existants startDate=Lundi (testé mentalement : Lun→Lun = +0j ✓).
4. Refonte `getWeekNumberForDate` sans `alignToMonday` — OK. Nécessaire pour cohérence (sinon S1 J1 dim 24/05 affiché en S0 si on garde align Monday côté lecture).
5. Nettoyer 5 sites inline `PlanView.tsx` — OK. Centralisation = moins de surface bug. Les 5 sites sont des copies du même bloc daysToMonday → 1 helper remplace tout.
6. Vérif `handleStartDateChange` L913-958 — OK avec lecture rapide. Le code utilise déjà `new Date(newStartDate)` pour un calcul `availableWeeks` qui n'est PAS sensible au DOW → no-op confirmé. **Pas besoin de test dédié**, c'est de la paranoia.
7. Tests `dateUtils.test.ts` (10 cas, sans DST/traversée année) — OK. Voir ajout mini en section "manque".
8. Audit batch post-ship (mesure seulement, pas de patch) — REPORT Sprint suivant. Voir section "peut attendre".
9. Doctrine `feedback_startdate_input_strict` post-ship — OK post-ship. Voir section 6.

---

## Ce qui est juste assez

- **Suppressions 1+2** : 10 lignes backend + 8 lignes utilitaire = net.
- **`calculateSessionDate` cyclique modulo 7** : la version proposée est mathématiquement propre, lisible en 6 lignes. Pas de `(getDay()+6)%7` étalé partout, pas de helper supplémentaire `getMondayBasedDow` (refus du gold-plating dev 30 ans).
- **5 sites PlanView nettoyés** : on remplace 5×6 lignes par 5×1 appel à `getSessionDate`/`calculateSessionDate`. Vrai gain dette technique.
- **10 tests sans DST** : couvre cas Arnaud (dim→lun), cas Lun→Lun (régression), cas Sam, cas Mar. Le scope tests = scope code. Pas de tests futuristes pour bugs imaginaires.
- **~1h50 effort** : timebox réaliste, pas de slip dev.

---

## Ce qui est encore trop

- **Sujet 6 (vérif `handleStartDateChange`)** : si "probable no-op" et lecture confirme (L920 `availableWeeks` est un calcul ms-based insensible au DOW), pas besoin de l'ériger en sujet. C'est 5 min de lecture, à fusionner dans Sujet 5 sous "vérification visuelle ≠ sujet de sprint". **À dégraisser** : retirer de la liste à 9, passer à 8 sujets.

- **Aucun autre dégraissage justifié.** La liste est déjà courte. Si on coupe ailleurs (tests, refacto PlanView), on dégrade la qualité.

---

## Ce qui manque (SEULEMENT si vraiment nécessaire)

1. **1 test "startDate=Lundi → Lundi" (régression plans existants)** parmi les 10. Crucial : 100% des plans en base ont startDate=Lundi (hérité du bug align Monday). Le test doit prouver que l'ancien comportement est strictement préservé pour ces plans. Si déjà dans les 10 cas → RAS. Si non → l'ajouter, c'est gratuit.

2. **Vérifier que `raceDayInject.ts:204-205` n'est PAS impacté** (utilise `new Date(raceDateRaw)` + `new Date(startDateRaw)` pour calcul `weekIdx` basé sur ms / 7j, insensible au DOW). Lecture confirmée : le calcul `floor((raceDate - startDate)/msPerDay/7)` ne dépend pas de `getDay()`. **No-op pour Bug 17**, pas de modification nécessaire. À noter dans le commit pour traçabilité (1 ligne dans le PR), pas un sujet de sprint.

**Refus explicites** (gold-plating dev 30 ans rejeté à juste titre) :
- Remplacement des 12 sites `new Date(stringISO)` → `parseLocalDate` : NON. Le bug timezone est latent depuis des mois, n'a jamais émergé en prod (France UTC+1/+2, pas de user signalé). Hors scope Bug 17. À traiter quand un user étranger se plaint, pas avant.
- `Math.round` vs `Math.floor` pour DST : NON. 0 plainte DST historique. Procrastination déguisée en rigueur.
- Toast UX "déplacements wipe" : NON. Le user qui change startDate l'attend déjà. Pollution message.
- Helper `getMondayBasedDow` : NON. 1 fonction abstraite pour 1 appelant = sur-abstraction.

---

## Ce qui peut attendre Sprint suivant

1. **Audit batch post-ship (Sujet 8)** : décorrélé du code fix. La rétro PM disait "mesure pour confirmer 43%/80, si <20/mois → P2 retombe". Mais le code est déjà décidé GO. Donc l'audit batch ne change PLUS la décision code. Son seul usage = sizing prochains bugs similaires (ROI exploration). **REPORT** : à lancer dans Sprint F avec les autres audits (post-Bug 15/4/3/6/16). Pas de risque à reporter, les plans existants ne sont PAS patchés (doctrine `feedback_patch_live_plans_jour_seulement`).

2. **Doctrine `feedback_startdate_input_strict` (Sujet 9)** : voir section 6.

3. **Refacto timezone 12 sites** : Sprint G dédié "robustesse dates" si un user étranger se plaint un jour. Pas maintenant.

4. **Logging `[Plan] startDate=X stored as=Y`** (proposé dev 30 ans étape 10) : NON. On audite post-ship si on a un doute. Pas de log défensif sans cas d'usage.

---

## Sur la doctrine — avant ou après le code (Sujet 6 du brief) ?

**AVANT le code, en une ligne dans le PR description / commit message.** Pas un doc à part.

Raison : la doctrine "startDate = J1 réel, jamais aligné lundi" CADRE le code (sinon le dev peut être tenté de garder un fallback align Monday "au cas où"). 1 ligne en tête du PR = explicite. Le doc complet `feedback_startdate_input_strict` dans `MEMORY.md` se fait **après ship** (verbatim PM rétro L127). Pas de doc avant ship car risque de pré-empter et figer une mauvaise tournure si le code révèle un edge case (ex : `dateOverride` priorité).

Compromis = ligne PR (cadre) + ajout MEMORY.md post-ship (acte officiel). Pas de doc séparé en double.

---

## Décision PM finale

**GO code maintenant, 8 sujets effectifs** (pas 9) :

1. Suppression align Monday backend (sujet 1)
2. Suppression `alignToMonday` dateUtils (sujet 2)
3. Refonte `calculateSessionDate` (sujet 3)
4. Refonte `getWeekNumberForDate` (sujet 4)
5. Nettoyer 5 sites PlanView inline (sujet 5)
6. ~~Sujet 6 supprimé~~ (fusionné en lecture rapide dans 5, no-op confirmé)
7. Tests dateUtils 10 cas dont 1 régression Lun→Lun explicite (sujet 7)
8. Ligne PR : "doctrine startDate = J1 réel"
9. Post-ship : `MEMORY.md` ajout + audit batch décorrélé

**Cohérence Sprint E** : Bug 17 reste #2 dans l'ordre (Bug 15 P0 sécurité d'abord, Bug 17 ensuite car Bug 4 en dépend pour les helpers dateUtils). Aucun changement à l'ordre rétro PM.

**Tests Arnaud (cas réel)** : à VÉRIFIER post-ship que Arnaud voit S1 J1 = lun 25/05 (et non 24/05 ni 18/05). C'est le seul test live qui compte.

**Effort confirmé** : ~1h40 dev + 20min test manuel = 2h max. Bug 17 fermé, Sprint E avance.
