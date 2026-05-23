# Sprint E Bug 17 — startDate alignment

Date : 2026-05-23
Statut : Spec ready for dev validation
Référence incident : Arnaud (plan `1779554515397`) — patch live appliqué (`patch-arnaud-startdate-live.mjs`).

---

## 1. Cause racine

`src/services/geminiService.ts` L4883-4893 — fonction `generatePreviewPlan` :

```js
if (plan.startDate) {
  const rawSD = new Date(plan.startDate);
  const dow = rawSD.getDay();              // 0=dim, 1=lun, …, 6=sam
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  if (daysToMon !== 0) {
    rawSD.setDate(rawSD.getDate() + daysToMon);
    plan.startDate = rawSD.toISOString().split('T')[0];
  }
}
```

`daysToMon = 1 - dow` est **toujours négatif** sauf le lundi (dow=1 → 0) :
- mar (2) → -1, mer (3) → -2, …, sam (6) → -5, dim (0) → -6.

Algorithme recule TOUJOURS au **lundi précédent**, jamais au lundi suivant.

Cas Arnaud : `data.startDate = "2026-05-24"` (dim) → `dow=0` → `daysToMon=-6` → `plan.startDate = "2026-05-18"` (lundi 5 jours dans le passé).

Bug existant aussi en **6 autres call sites front** (`PlanView.tsx` L555, L613, L678, L700, L1744 ; `dateUtils.ts:alignToMonday` L22-29) — voir §3. Côté front c'est cohérent (le front réaligne en LECTURE sur le même lundi passé que le storage), donc le bug est invisible si startDate déjà = lundi propre, MAIS s'il faut un fix de fond on doit choisir une seule sémantique.

---

## 2. Fix proposé exact (geminiService.ts L4883-4893)

```js
// Aligner startDate sur le LUNDI SUIVANT (ou même lundi si déjà lundi)
// Bug 17 (2026-05-23) : ancienne logique alignait au lundi PRÉCÉDENT (passé).
// Cas Arnaud "demain dim 24/05" → S1 J1 stocké = lun 18/05 (passé) → fix.
if (plan.startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rawSD = new Date(plan.startDate);
  rawSD.setHours(0, 0, 0, 0);
  const dow = rawSD.getDay();
  // 0=dim → +1, 1=lun → 0, 2=mar → +6, 3=mer → +5, …, 6=sam → +2
  const daysToMon = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  if (daysToMon !== 0) {
    rawSD.setDate(rawSD.getDate() + daysToMon);
  }
  // Garde-fou anti-passé : si lundi calculé < aujourd'hui, prendre lundi suivant
  while (rawSD < today) rawSD.setDate(rawSD.getDate() + 7);
  plan.startDate = rawSD.toISOString().split('T')[0];
  console.log(`[Gemini Preview] startDate aligned to next Monday: ${plan.startDate}`);
}
```

**Note timezone** : `new Date('YYYY-MM-DD')` parse en UTC. `getDay()` retourne le jour selon le fuseau local. En France (UTC+1/+2) la date est bien interprétée comme minuit UTC → 1h ou 2h locale du même jour, donc `getDay()` reste correct. Pas de regression timezone vs ancien comportement.

---

## 3. Call sites impactés (recherche exhaustive)

### Modifié par le fix (1 site BACKEND, persiste la valeur)
- `src/services/geminiService.ts` L4883-4893 (`generatePreviewPlan`) — alignement preview.

### Hérite automatiquement (pas de réalignement)
- `src/services/geminiService.ts` L5836-5842 (`generateRemainingWeeks` recalcul `endDate`) — `fullPlan.startDate` provient du preview déjà aligné, donc le fix backend suffit.
- `src/services/geminiService.ts` L4895-4901 (recalcul `endDate` preview) — utilise `plan.startDate` après alignement, cohérent.
- `src/services/geminiService.ts` L4204/4208 (`computePlanDurationWeeks.adjustedStartDate`) — peut produire un startDate non-lundi qui sera ENSUITE aligné par le fix. OK.

### Front (lecture / affichage uniquement — pas dans le scope du fix backend)
Tous utilisent `daysToMon = startDow === 0 ? -6 : 1 - startDow` (BUG identique en lecture) :
- `src/utils/dateUtils.ts` L22-29 `alignToMonday()` (utilisé par `calculateSessionDate` et `getWeekNumberForDate`).
- `src/components/PlanView.tsx` L555 (currentWeekNumber).
- `src/components/PlanView.tsx` L613 (raceWeekIdx preview).
- `src/components/PlanView.tsx` L678 (`getSessionDate` fallback).
- `src/components/PlanView.tsx` L700 (`getWeekStatus`).
- `src/components/PlanView.tsx` L1744 (rendu previewWeeks).

**Status front** : une fois `plan.startDate` réellement aligné sur un lundi (post-fix), tous ces sites convergent (`dow=1 → 0`), aucun deviendra incorrect. **PAS de modification front nécessaire**. Conservés pour idempotence défensive.

### Prompt LLM
- `src/services/geminiService.ts` L4729 : `startDate = "${data.startDate || today}"` injecté dans le prompt. Le LLM retourne cette valeur tel quel dans le JSON, donc le fix L4883 nettoie. Aucun changement de prompt nécessaire.

---

## 4. Tests anti-régression (12 cas)

À implémenter dans `tests-v1/` ou un nouveau `tests-startdate-alignment.spec.ts`. On extrait la logique dans une fonction pure `alignStartDateForward(input, today)` testable :

| # | Input `data.startDate` | `today` simulé | Output attendu | Justification |
|---|---|---|---|---|
| 1 | 2026-05-25 (lun) | 2026-05-23 (sam) | 2026-05-25 | Lundi futur → inchangé |
| 2 | 2026-05-26 (mar) | 2026-05-23 (sam) | 2026-06-01 | Mardi → lundi suivant |
| 3 | 2026-05-23 (sam) | 2026-05-23 (sam) | 2026-05-25 | Samedi today → lundi suivant |
| 4 | 2026-05-24 (dim) | 2026-05-23 (sam) | 2026-05-25 | **Cas Arnaud** : dim demain → lun |
| 5 | 2026-05-18 (lun passé) | 2026-05-23 (sam) | 2026-05-25 | Garde-fou : jamais passé → lun suivant |
| 6 | 2026-07-27 (lun +2 mois) | 2026-05-23 | 2026-07-27 | Lundi futur loin → inchangé (pas de saut +7j) |
| 7 | 2026-08-01 (sam) | 2026-05-23 | 2026-08-03 | Samedi futur loin → lundi suivant |
| 8 | 2026-05-23 (lun ?) — vérif: 2026-05-23 EST samedi | — | — | Sanity check : `new Date('2026-05-23').getDay() === 6` |
| 9 | 2026-12-31 (jeu) | 2026-05-23 | 2027-01-04 | Bascule année |
| 10 | 2026-05-22 (ven, hier) | 2026-05-23 (sam) | 2026-05-25 | Hier → lundi suivant (garde-fou actif) |
| 11 | 2026-05-25 (lun) — endDate check | — | endDate = startDate + 15×7 = 2026-09-07 | Cohérence `endDate` après réalignement |
| 12 | Arnaud actuel raceDate 2026-09-13, durationWeeks=15, startDate user=dim 24/05 | 2026-05-23 | startDate=2026-05-25, diffSemaines startDate→raceDate = 15.86 ≈ 16 — pas de `adjustedStartDate` (sous cap Semi 20) | Pas d'interaction avec `computePlanDurationWeeks.adjustedStartDate` |

**Mock `today`** : injecter `Date.now()` ou passer `today` en param de la fonction pure (cleaner pour tests).

---

## 5. Risque régression

### Profils à surveiller (regen ou next plan généré)
- **User saisit dimanche/samedi (jour course typique)** : avant fix → S1 J1 passé. Après fix → S1 J1 lundi futur. Comportement souhaité.
- **User saisit lundi exact futur** : avant fix → inchangé. Après fix → inchangé. **0 régression**.
- **User saisit lundi PASSÉ (via raceDate très proche + `adjustedStartDate`)** : avant fix → startDate déjà lundi mais possiblement passé. Après fix → garde-fou avance au lundi futur. **Léger changement de durée plan** : si raceDate fixe et startDate décalé +7j, on perd 1 semaine. Cas rare (raceDate < 6 sem bloqué par questionnaire L173-174).
- **User raceDate = lundi exact à distance > cap** : `computePlanDurationWeeks` produit `adjustedStartDate = raceDate - cap*7d` (raceDate étant lundi, adjusted est lundi aussi). Fix garde-fou pas déclenché si `adjusted > today`. **0 régression**.

### Plans existants en base
- Plans avec `startDate` déjà lundi (cas dominant) → 0 régression (le fix n'altère pas un lundi).
- Plans déjà commencés (S1 vécue) → **NE PAS toucher** (doctrine `feedback_patch_live_plans_jour_seulement.md`).
- Plans en preview avec startDate dans le passé non encore commencés → patches live cas par cas (cf §7).

---

## 6. Audit batch — plans en base avec startDate < createdAt

### Script d'audit
```js
// audit-startdate-bug17.mjs
// Compter les plans des 30 derniers jours où plan.startDate < createdAt (jour de création)
// → indicateur certain que l'alignement a reculé au lundi précédent.
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
// Query Firestore collection 'plans' where createTime > cutoff
// Pour chaque plan : parser plan.startDate (string YYYY-MM-DD) et plan.createdAt (timestamp)
// Si new Date(plan.startDate) < new Date(plan.createdAt).setHours(0,0,0,0) → bug confirmé
```

### Estimation a priori (sans run script)
- Fréquence statistique : user saisit `data.startDate` libre. Probabilité que `data.startDate` tombe sur un lundi pile = ~1/7 = 14%.
- Sur les ~6/7 restants (~86%), l'algo a reculé. SI `data.startDate` était today ou demain → `plan.startDate` est passé.
- Hypothèse : ~50% des users saisissent today/demain (commencer vite). Donc ~50% × 86% = **~43% des plans ont startDate antérieur à createdAt**.
- Sur 30 derniers jours, si ~200 plans créés → estimation **~80 plans affectés**.

**À confirmer par audit batch avant de décider du périmètre patches**.

---

## 7. Patches live nécessaires

### Critères de patch
1. `plan.startDate < createdAt` (date stockée dans le passé par rapport au jour de création).
2. ET plan **non encore commencé** : aucune `session.feedback.completed === true` dans S1 OU `now < plan.startDate + 7j` (encore dans S1 mais aucune validation).
3. ET plan **non-preview commercialisé** (`fullPlanGenerated === true` OU `isPreview === true` mais user a vu son aperçu).

### Action par plan
- Nouveau `startDate` = lundi suivant ≥ today selon même logique que le fix.
- Recalcul `endDate = startDate + durationWeeks × 7j`.
- Décalage `raceDate` **interdit** (doctrine `feedback_input_client_obligatoire.md` : raceDate user respecté).
- Si nouveau `raceDate - startDate < durationWeeks × 7j` (cas Arnaud limite) → on accepte simplement que la dernière semaine se chevauche partiellement avec la course (déjà géré par périodisation).

### Doctrine `feedback_patch_live_plans_jour_seulement.md`
- Plans dont la **S1 a commencé** (>= 1 séance validée) : **NE PAS toucher**. Romane décide cas par cas.
- Plans dont la S1 n'a pas encore commencé (date du jour < S1 prévue ou aucune validation) : patcher en batch OK.

### Volume estimé
~80 plans (cf §6) → filtrer ceux non commencés → estimation **~50 plans à patcher**. Script `patch-batch-startdate-bug17-live.mjs` à écrire sur le modèle de `patch-arnaud-startdate-live.mjs`.

---

## 8. Communication user

### Doctrine `feedback_jamais_contact_client.md`
- Pas de mail/notif auto.
- Romane gère cas par cas. Surface possible : pour les plans patchés où le user A déjà vu son startDate, lui notifier que le plan a été décalé "au lundi suivant pour cohérence affichage".

### Risque UX
- User qui a noté "mon plan commence dim 24/05" voit maintenant "lun 25/05". **Décalage de 1 jour → acceptable** vs alternative "S1 J1 = 18/05 (passé)" qui est cassé.
- Cas Arnaud (plaintes premium) déjà patché individuellement.

---

## 9. Métriques succès

| Métrique | Cible | Source |
|---|---|---|
| Plans avec `startDate < createdAt` (nouveaux) | 0 | Audit batch quotidien post-déploiement |
| Plaintes startDate via mail premium | 0 | Inbox Romane |
| Tests anti-régression (§4) | 12/12 pass | CI Vitest |
| Plans existants à patcher | Liste figée (J+1) | `audit-startdate-bug17.mjs` |

---

## 10. GO/NO-GO

### Dev (architecture)
- **GO** : fix localisé 1 site backend, 0 changement front, 0 changement schéma data, 0 changement prompt.
- Risque régression isolé sur le cas extrême "lundi passé via adjustedStartDate" (cas rare, déjà bloqué par contrainte questionnaire `raceDate >= 6 sem`).
- Test unitaire de la fonction d'alignement = trivial à écrire.

### PM (business)
- **GO sous condition** : audit batch (§6) lancé AVANT déploiement code pour figer la liste des plans à patcher.
- Pas de communication mass → Romane gère.
- Doctrine `feedback_patch_live_plans_jour_seulement.md` respectée (plans commencés intouchés).

### Ordre d'exécution recommandé
1. **J0** (auj) : audit batch — liste exhaustive plans affectés non commencés.
2. **J0** : déployer fix code (1 commit, 1 fichier).
3. **J0+1h** : patch batch des plans listés (script live identique à `patch-arnaud-startdate-live.mjs` × N).
4. **J+1** : re-audit batch → vérifier compteur à 0 sur les nouveaux plans.
5. **J+7** : test anti-régression Vitest validé en CI.

---

## Annexes

### Fichiers à modifier
- `src/services/geminiService.ts` L4883-4893 (fix unique).
- Nouveau `tests-v1/startdate-alignment.spec.ts` (12 cas).

### Fichiers à créer (scripts ops)
- `audit-startdate-bug17.mjs` (audit batch).
- `patch-batch-startdate-bug17-live.mjs` (patches live filtrés).

### Backup individuel Arnaud (déjà fait)
- `backup-arnaud-startdate-1779568228453.json`
- `patch-arnaud-startdate-live.mjs` appliqué.
