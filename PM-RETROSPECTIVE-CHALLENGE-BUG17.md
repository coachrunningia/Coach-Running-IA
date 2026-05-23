# PM rétrospective challenge — Bug 17 V2 Strategy C light
Date : 2026-05-23

## Verdict business

**GO ajusté.** Strategy C light = correcte sur le fond (`feedback_input_client_obligatoire`
appliqué), MAIS l'ordre/le couplage proposé par l'agent dev est sous-optimisé. **À shipper
en Sprint E Phase 2 SOUS Bug 15 (P0 sécurité)**, pas avant. Pas d'urgence patch live
batch sur les ~50 plans : silent fix code suffit + welcome conditionné. Le cas Arnaud
(payant premium) reste le seul vrai dommage, déjà résolu.

---

## Cohérence Sprint E (A)

**Chevauchements identifiés** :
- Bug 17 ne croise PAS Bug 1+2 (cross-training), Bug 7+12 (welcome), Bug 8 (VMA), Bug 10
  (distance), Bug 11 (recoveryFactor) — déjà déployés Phase 1.
- Bug 17 ne croise PAS Bug 3 (SL placement) tant qu'on garde la sémantique "session.day =
  nom du jour de semaine" en Strategy C light. **Confirme le choix C vs B**.
- Bug 17 **touche** `raceDayInject.ts` et `getWeekNumberForDate` qui sont aussi consommés
  par Bug 4 (pic Trail Ultra calcule sur weekNumber). À shipper **avant** Bug 4 pour
  éviter rework.
- Bug 17 **n'interfère pas** avec Bug 15 (injuries blacklist) ni Bug 16 (seuilPace) :
  ces deux derniers opèrent en post-LLM sur sessions, indépendants de startDate.

**Phase** : Bug 17 doit être **Phase 2** (pas Phase 1 déjà déployé). Phase 1 est
livrée et stable, n'y toucher = risque régression injustifié pour un bug latent depuis
des mois (Arnaud est le 1er user à se plaindre, donc pas une urgence brûlante).

**Ordre code Phase 2** :
1. Bug 15 (P0 sécurité Laurence) — indépendant, ship first
2. Bug 17 (refacto dateUtils) — refacto utilitaire propre AVANT touches périodisation
3. Bug 4 (pic Trail Ultra) — utilise les helpers refactorés Bug 17
4. Bug 3 (SL placement) — sémantique day préservée par C light, dernier
5. Bug 6 (spots) — kill-switch trivial, parallèle
6. Bug 16 (seuilPace Elite) — niche P1, dernier

---

## Priorisation business (B)

**ROI Bug 17 vs Bug 15** :

| Critère | Bug 17 startDate | Bug 15 injuries |
|---|---|---|
| Sévérité | Cosmétique + déception payant | **Aggravation blessure physique** |
| Fréquence estimée | ~80/mois (43%) MAIS asymptomatique si user saisit lundi | Niche déclarée (Laurence type), ~5%/mois |
| Détection user | Faible (regarde S1 J1 = passé seulement si dim) | **Critique** (douleur ressentie en séance) |
| Cas réel | Arnaud (1) | Laurence (1) + tendinopathies déclarées |
| Réputation | Mail "ma date est fausse" | Mail "votre app m'a blessé(e)" |

**Verdict** : Bug 15 > Bug 17 sur sécurité. **Bug 15 ship en premier**. Bug 17 OK
en parallèle code car file différent (geminiService.ts L3737 vs L4883).

**80 plans/mois "impactés"** : trompeur. Sur les ~80 :
- ~70% startDate = lundi naturellement (cas Lun/Mar saisi proche du début de semaine) →
  réalignement invisible
- ~20% startDate saisi Sam/Dim → décalage 1-5 jours = "S1 commence un peu avant"
- ~10% (~8 plans/mois) cas Arnaud type "dim demain" → S1 J1 dans le PASSÉ = vrai bug

**~8 plans/mois en vrai dommage** = ROI fix élevé mais pas critique vs Bug 15. C'est un
bug **réputation premium** (Arnaud paye) plus que volume.

---

## UX changement date (C)

**`handleStartDateChange` L913-958 PlanView** :
- Pas d'analytics actuels — Romane n'a pas instrumenté
- Cas réels observés : Arnaud (changement post-création via mail), patches live
  startDate Olivier/Laurence (Romane patche, pas user)
- Hypothèse usage user : faible (<2% des plans modifiés via UI), majoritairement Romane
  côté ops

**Si user change lundi → dimanche** : il attend que S1 J1 = dimanche choisi. Logique
Strategy C light répond correctement (cyclique depuis startDate). **OK conceptuellement**.

**Risque UX** : la spec dit "S1 J1 day=Lundi devient le LUNDI SUIVANT le nouveau
startDate". Pour le user qui change date → s'il a un plan avec session "Lundi PPS+EF",
elle se décale à lundi 8 jours plus tard. **Cohérent** mais à expliquer dans un petit
tooltip si on devient ambitieux post-fix (pas blocant Sprint).

---

## Communication users impactés (D)

**Doctrine `feedback_jamais_contact_client`** appliquée strictement :
- Pas de mail mass aux ~50 users
- Romane gère cas par cas (Arnaud fait, autres = silence sauf plainte)

**Stratégie recommandée** :
1. **Silent code fix** (déploy Bug 17 sans annonce)
2. **Pas de patch batch live** sur ~50 plans existants : l'agent dev propose `~50 plans
   à patcher` — JE DIS NON. Raison : `feedback_patch_live_plans_jour_seulement` interdit
   de toucher plans S1 commencée. Le ratio "plans non commencés" sur ces 80 est faible
   (la majorité a déjà entamé S1 ou S2). Risque : repatch = écrasement de dateOverride
   silencieux pour user qui s'est adapté à son calendrier.
3. **Welcome message updated** sur regen futurs : déjà conditionné `feasibility.status`
   (Phase 1 Bug 7+12), inutile d'ajouter une mention startDate.
4. **Tracking inbox Romane** : si ≥3 plaintes startDate dans les 30 jours → audit batch
   ciblé manuel sur les plans concernés.

**Référence patches semaine** : sur les 8 plans patchés (Guliver, Clémentine, Christopher,
Ambre, Olivier, 1778921428769, Laurence, Arnaud), 1/8 = startDate (Arnaud). 12.5% des
patches live de la semaine = startDate. Confirme : bug réel mais pas tsunami.

---

## Doctrine acté (E)

**Nouvelle doctrine Romane (2026-05-23)** :
> "La date saisie par l'user DOIT être la date du J1 du plan, peu importe le jour."

**Remplace** : "plans commencent toujours lundi" (ancienne doctrine implicite,
**jamais formalisée dans `MEMORY.md`**, juste cristallisée dans le code via alignToMonday).

**Implications pédagogiques** :
- Cycle hebdo de coaching n'est plus "lundi-dimanche ISO" mais "J1-J7 plan-relatif"
- Rapports hebdo / statistiques (s'ils existent) doivent indexer sur `weekNumber` du
  plan, pas sur `getISOWeek()` de la date. **Vérifier futur dev analytics**
- Repos "Dimanche" en preferredDays = repos le 7e jour de la semaine plan, pas le 7e
  jour calendaire ISO. Documentation user à clarifier (si Romane veut)

**Impact futurs développements** :
- Tout dev qui assume "lun = J1" doit lire `feedback_input_client_obligatoire` + ce doc
- Ajouter ligne `MEMORY.md` : `Coach Running IA — startDate = J1 réel, jamais aligné lundi`
  → **à faire après ship Bug 17**

**Risque doctrine** : élargissement vers "user choisit aussi le jour du SL, le jour du
seuil, etc." → non, scope strict (`feedback_scope_strict`). startDate uniquement.

---

## Métriques succès (F)

1. **0 nouveau plan** avec `plan.startDate < createdAt` (audit quotidien J+7 post-deploy)
2. **0 nouveau plan** avec `plan.startDate !== questionnaireSnapshot.startDate` (drift
   sémantique zéro)
3. **0 plainte premium** sur dates dans les 30 jours (inbox Romane)
4. **Tests anti-régression 10 cas** verts en CI (`tests-startdate-alignment.spec.ts`)
5. **Pas de spike support** sur changement date PlanView (proxy : pas de patch live ops
   startDate sauf demande explicite user)
6. **Plans non-lundi en base** : tracker via Looker / BQ si dispo → vérifier que les
   plans dim/sam ont taux complétion ≥ moyenne (sinon il y a un drag UX caché)

---

## Risques business (G)

1. **Silent fix change startDate des plans existants** : NON, le code fix n'écrit pas en
   base les plans déjà créés. Seul un patch batch live le ferait. **Mitigation** : pas
   de batch live (cf. section D).

2. **Plans existants avec startDate déjà lundi** : 0 régression visible (Strategy C light
   est compatible — cf. spec L262 "cas dominant, comportement identique").

3. **Plans existants avec startDate non-lundi (alignToMonday a écrasé)** : ils restent
   stockés "lundi écrasé" → après refacto dateUtils côté front, le rendu reste cohérent
   (S1 J1 day="Lundi" → ce lundi stocké). **0 régression rendu**.

4. **Confusion utilisateur "j'ai dit dim, je vois lun"** sur plans existants : ne se
   résout pas par le fix code seul. Acceptable : ces users ont 90%+ chance de ne pas
   noter (regardent S1 globalement, pas le jour pile). Arnaud = exception payant attentif.

5. **Risque perte confiance** : faible si silent + welcome déjà solide (Phase 1). Élevé
   si Romane communique mal-à-propos. **Stratégie** : pas de communication produit
   (cohérent doctrine).

6. **Risque dev refacto dateUtils casse 4 sites PlanView** : la spec compte 4 copies
   inline align Monday. Tests manuels 4 profils + 2 changements date dans plan (spec
   L329-332) sont **non-négociables avant ship**. `feedback_qualite_avant_vitesse`.

7. **Risque export ICS/PDF** : passes par `resolveSessionDate` refacto → si bug dans le
   refacto utilitaire, exports cassés silencieusement. **Mitigation** : ajouter 1 test
   manuel export ICS d'un plan startDate=dimanche (5 min).

---

## Phase 2 réorganisée (H)

**Ordre code optimisé (séquentiel, 1 PR par bug)** :

1. **Bug 15 injuries blacklist** (P0 sécurité) — 1 fichier `geminiService.ts` + tests.
   Ship en premier, indépendant.
2. **Bug 17 startDate refacto** (Strategy C light) — `dateUtils.ts` + `geminiService.ts`
   L4883-4892 + `PlanView.tsx` cleanup inline + 10 tests. ~1h dev + 30min test manuel.
3. **Bug 4 pic Trail Ultra** — bénéficie des helpers `getWeekStartDate` de Bug 17.
   Revue Coach FFA 20 ans en parallèle pour floors UTMB Academy.
4. **Bug 3 SL placement** — sémantique day préservée par C light. Code post-LLM,
   indépendant.
5. **Bug 6 spots Trail** — kill-switch Option A (désactive `locationSuggestion`), 1h.
   Indépendant des autres, peut être shipé en // de Bug 4.
6. **Bug 16 seuilPace Elite** — P1 niche, 1 patch `applyTargetTimeOverride` + tests.
   Dernier.

**Bugs à coupler** :
- Bug 17 ⇔ Bug 4 (utilitaires dateUtils communs) — **dépendance technique**
- Bug 3 ⇔ Bug 17 (sémantique day) — **vérification couplée**, pas dépendance code
- Bug 15 ⇔ Bug 17 — aucun couplage, peuvent shipper en parallèle si 2 devs

**Bugs à NE PAS coupler** :
- Bug 17 + patch batch live = NON. Code fix only, ops séparé (et probablement éviter).

**Audit batch préalable Bug 17** : oui, mais pour **mesure** pas pour patch. Script
`audit-startdate-bug17.mjs` à lancer **avant** ship pour confirmer 43%/80 plans/mois.
Si chiffre réel < 20 plans/mois → bug retombe P2, on reporte derrière Bug 4.

---

## Décision PM finale

**GO Bug 17 Strategy C light en Sprint E Phase 2, position 2 (après Bug 15).**

Pas de patch batch live. Pas de communication mass. Audit batch en mesure pré-ship pour
confirmer ampleur. Silent fix + tests anti-régression 10 cas. ~3h dev total + 30min QA
manuel. Arnaud déjà résolu. Doctrine `feedback_input_client_obligatoire` + nouvelle
doctrine "startDate = J1 réel" formalisées dans `MEMORY.md` post-ship.

**Bug 17 n'est pas la priorité Phase 2. Bug 15 l'est.** L'agent dev a fait un travail
d'audit pipeline excellent (386 lignes spec exhaustive) — il faut maintenant respecter
le scope, ne pas patcher le rétroactif et ship dans l'ordre sécurité d'abord.
