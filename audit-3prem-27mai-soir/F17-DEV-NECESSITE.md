# F-17 — Dev Senior : NÉCESSITÉ technique des 3 garde-fous

Dev 15 ans pragmatique. 12 min. Verdict tranché.
Stack constatée : Firestore Rules existent (`firestore.rules`), AUCUN `functions/` dir = pas de Cloud Functions Firebase déjà en place. `handleRecalculateVMA` (App.tsx:1046-1145) déjà tout en client.

---

## 1. Verdict par condition

| # | Garde-fou | % users touchés | Gravité | Coût annoncé | Coût réel ULTRA-SIMPLE | YAGNI ? | Verdict V1 |
|---|-----------|----------------|---------|--------------|------------------------|---------|------------|
| 1 | Snapshot complet `weeks` TTL 30j | 0.5-2 % (rollback réel) | 3 / 5 | 3 h | **30 min** (snapshot LIGHT : vma+paces+ts dans `plan._recalibrationHistory[]`) | OUI sur version complète, NON sur version light | **LIGHT GO** |
| 2 | Cloud Function compteur 4 + warning ≥25 % | 0.1 % (devtools) | 2 / 5 | 4 h | **20 min** (Firestore Rules — gratuit, instantané, déjà déployé) | OUI sur CF, NON sur Rules | **RULES GO** |
| 3 | Filter `weekStartDate >= today` + delta=0 | ~30 % (recalibrage mid-week) | 4 / 5 | 1 h 30 | **45 min** (1 ligne filter + 1 garde delta=0 déjà dans App.tsx:1064) | NON — bloquant doctrine `feedback_patch_live_plans_jour_seulement` | **GO obligatoire** |

---

## 2. Alternative ULTRA-SIMPLE pour chaque

### Condition 1 — Snapshot LIGHT vs complet

**PM annonce 550 LOC** pour dump 22 sem × 5 séances × 5 champs. **Faux problème** : on n'a JAMAIS besoin de rollback les `weeks` complètes, car le service est PURE et DÉTERMINISTE (cf. `paceRecalibrationService.ts:121-163`). Re-appliquer `recalibrateSession(currentWeeks, newPaces, oldPaces)` reconstruit l'état précédent à partir des paces snapshot. C'est mathématiquement équivalent.

**Plan B (30 min) :**
```ts
// Dans handleRecalculateVMA, avant le swap :
plan._recalibrationHistory = [
  ...(plan._recalibrationHistory || []),
  { at: Date.now(), fromVMA: oldVMA, toVMA: newVMA, fromPaces: oldPaces, toPaces: newPaces }
].slice(-4); // garde 4 dernières, aligne avec compteur
```

Coût stockage : 4 × ~250 octets = 1 ko/plan. Rollback = pop dernier + reverse swap. Une seule Cloud Function NON nécessaire. Pas de TTL non plus (auto-cap à 4 entrées).

### Condition 2 — Firestore Rules vs Cloud Function

**Cloud Function = overkill** :
- Coût 4 h dev + déploi
- Cold start ~500 ms latence ajoutée à chaque recalibrage
- Coût runtime $$
- Nouveau service à monitorer
- AUCUN `functions/` directory dans le repo aujourd'hui = bootstrap complet à faire (firebase.json, package.json, deploy, IAM)

**Firestore Rules suffisent** pour 95 % des cas. Ajout dans `firestore.rules` match `plans/{planId}` :

```
allow update: if request.auth != null
  && resource.data.userId == request.auth.uid
  && (request.resource.data._paceRecalibrationCount == null
      || request.resource.data._paceRecalibrationCount <= 4)
  && (request.resource.data._paceRecalibrationCount == null
      || request.resource.data._paceRecalibrationCount >=
         (resource.data._paceRecalibrationCount == null ? 0 : resource.data._paceRecalibrationCount));
```

Garantit : (a) compteur jamais > 4 côté serveur, (b) compteur jamais décrémenté côté client (anti-bypass devtools). 20 min écrire + tester via emulator. Le delta VMA ≥+25 % n'a pas besoin d'être validé serveur — c'est UX consentement, pas safety critique. Si user contourne le checkbox via devtools = doctrine `feedback_securite_avant_conversion` couvre le warning, on ne se substitue pas à l'utilisateur consentant.

**Risque résiduel devtools** : un user dev brute-force `_paceRecalibrationCount = 0` à chaque write. Mais : il aurait à recoder lui-même tout le `calculateAllPaces` + swap map + welcome — soit ré-implémenter F-17 entier. Coût d'attaque > bénéfice. Acceptable.

### Condition 3 — Filter `weekStartDate >= today`

**PM annonce 1 h 30. Réel : 15 min.**

Dans `handleRecalculateVMA` (App.tsx:1145+) au moment d'appliquer le swap, AVANT `plan.weeks.map(...)` :

```ts
const today = new Date(); today.setHours(0,0,0,0);
const isWeekFuture = (w: Week) => {
  const wDate = new Date(w.startDate);
  return wDate >= today;
};
// Sessions passées : intactes. Futures : swap.
const newWeeks = plan.weeks.map(w =>
  isWeekFuture(w)
    ? { ...w, sessions: w.sessions.map(s => recalibrateSession(s, oldPaces, newPaces, { freezeRaceSpecificPaces })) }
    : w
);
```

Delta=0 : déjà géré App.tsx:1064 (`Math.abs(newVMA - oldVMA) < 0.1` → early return). Aucun ajout nécessaire.

**Non négociable** car contredit doctrine `feedback_patch_live_plans_jour_seulement` sinon. C'est le SEUL garde-fou à coût quasi-nul ET impact doctrinal réel.

---

## 3. Reco scope V1 minimal

**Garder** :
1. Snapshot LIGHT in-plan `_recalibrationHistory[]` (4 entries max) — **30 min**
2. Firestore Rules cap compteur ≤ 4 + monotone croissant — **20 min**
3. Filter futures weeks — **15 min**
4. Test régression battery 5 profils diversifiés (doctrine `feedback_validation_n_profils_avant_sprint`) — **45 min**

**TOTAL V1 : 1 h 50 dev + 45 min QA = ~2 h 35**.

LOC ajoutées : ~30 lignes service/App + 6 lignes Rules + 5 tests = **~70 LOC bien justifiées** (doctrine `feedback_chaque_ligne_justifiee`).

**Skipper en V1** :
- Cloud Function (overkill, Rules font le job)
- Snapshot complet `weeks` Firestore (pure function suffit)
- TTL 30j (auto-cap 4 entries élimine besoin)
- UI bouton rollback complet (V1 = juste history exposée pour Romane debug ; UX rollback = V2 si demand)

---

## 4. Risque résiduel acceptable ?

**OUI**, avec 3 conditions explicites :

1. **Devtools bypass count : <0.1 % users, attaque coûteuse, dommage limité au plan de l'attaquant.** Doctrine `feedback_securite_avant_conversion` respectée car warning UX présent. Romane voit dans console Firestore si un plan dépasse 4 (Rules bloquent côté serveur de toute façon).
2. **Pas de rollback UI V1** : si user regrette, history existe dans Firestore → Romane peut rollback manuel via script admin (déjà existant `admin-recalibrate-paces.mjs` + `_recalibrationHistory[].fromPaces`). Doctrine `feedback_jamais_contact_client` respectée — Romane gère.
3. **Trail D16 (Cory Smith) reste un trou** (cf. `F17-DEV-CODE-REVIEW.md §4.2`). PAS lié aux 3 garde-fous mais bloquant pour ouvrir aux profils trail. À gérer Sprint G+1. Pour Robine/Lucas/Julien (non-trail) = sans impact V1.

---

## 5. Réponse question stratégique PM

**PM penche SKIP condition 1 et 2** → je suis **partiellement d'accord** :

- **SKIP condition 1 version complète** : OK. Mais **NE PAS SKIP totalement** — il faut le `_recalibrationHistory[]` light (30 min, 1 ko/plan, débloque rollback admin via script). Skipper TOTALEMENT = doctrine `feedback_securite_avant_conversion` à risque (zero trace si plan vrillé).
- **SKIP condition 2 version Cloud Function** : OK ferme. Mais **ajouter les Firestore Rules** (20 min, gratuit, déjà infra en place). Skipper TOTALEMENT = doctrine `feedback_securite_avant_conversion` violée (compteur 4 est juste cosmétique côté client).
- **GO ferme condition 3** : doctrine `feedback_patch_live_plans_jour_seulement` non négociable. PM doit la garder dans V1.

**Risque tech catastrophique que PM ne voit PAS** : aucun à mon sens, MAIS attention au **piège dev-éclair de zero-trace** sur le snapshot. Si Robine recalibre et que son plan est vrillé (regex P2/P3 bug latents identifiés `F17-DEV-CODE-REVIEW.md §1.1`), sans `_recalibrationHistory` on ne peut PAS rollback : oldPaces sont perdus, on a juste `oldVMA` mais pas les `paces` exactes (formule `calculateAllPaces` peut évoluer entre 2 deploys → reconstruction non-déterministe). Donc le LIGHT history n'est pas optionnel, c'est une assurance dev minimaliste.

---

## TL;DR Dev

| Item | PM dit | Dev dit | LOC | Temps |
|------|--------|---------|-----|-------|
| Snapshot complet TTL 30j | SKIP | SKIP version complète, GARDE light history in-plan (4 entries) | ~10 | 30 min |
| Cloud Function compteur | SKIP | SKIP CF, GARDE via Firestore Rules | ~6 (rules) | 20 min |
| Filter mid-week + delta=0 | GARDE | GARDE (doctrine non négociable) | ~15 | 15 min |
| Battery tests N profils | non-listé | OBLIGATOIRE (doctrine `feedback_validation_n_profils_avant_sprint`) | ~50 (tests) | 45 min |

**Total V1 : ~2 h 35** (vs 8 h 30 PM initial). **YAGNI respecté** sur 50 % du scope, doctrines `feedback_pas_de_micro_expert` + `feedback_securite_avant_conversion` toutes les deux satisfaites.

**SHIP V1 self-serve après ces 2 h 35.** Bugs P2/P3/collision (cf. `F17-DEV-CODE-REVIEW.md §5`) sont Sprint G+1, non bloquants pour Robine/Lucas/Julien (écarts inter-zones ≥ 15 s).
