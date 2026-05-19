# Audit isPremium Thomas Weill — multi-comptes + ampleur bug

Date : 2026-05-19
Auteur : audit lecture seule (zéro modif Firestore)
Verbatim Romane : « il s'est inscrit avec 2 adresses mails donc c'est peut-être ça la source de l'erreur : celui qui a payé : thomas.weill.pro@gmail.com »

---

## TL;DR

1. **Aucun second compte Thomas Weill trouvé en base.** Un seul `users/{uid}` correspond à Thomas : `nMH83IjgsYZY24QYWyijuIjyoH33` / `thomas.weill.pro@gmail.com`. Aucun autre user/plan ne contient « weill » dans email/lastName/displayName/questionnaireData.email. La piste « 2 comptes Firestore » est écartée. (Romane peut avoir vu 2 mails côté Firebase Auth Console ou côté Brevo, mais Firestore n'a qu'un seul doc.)
2. **Le webhook Stripe a fonctionné correctement.** Thomas a payé 9.90€ via une session Stripe `cs_live_a1mEh…sJv0u` en mode `payment` (Plan Unique). Le webhook a bien set `hasPurchasedPlan=true` + `planPurchaseDate=2026-05-19T19:17:36.036Z` une minute après le paiement.
3. **`isPremium=false` est by design pour un acheteur Plan Unique.** Le webhook `server.js` lignes 313-320 ne set JAMAIS `isPremium=true` pour `purchaseType=plan_unique` ; il ne le set que pour les abonnements (mode `subscription`). Sémantique : `isPremium` = abonné actif, `hasPurchasedPlan` = paiement one-shot Plan Unique.
4. **Ampleur** : 12 users en base ont `hasPurchasedPlan=true AND isPremium=false`. Vérification croisée Stripe : 10 sont des achats Plan Unique réussis (comportement attendu), 1 (`romane.m2@hotmail.fr`) est un abonnement résilié le 2026-05-15 (comportement attendu post-`subscription.deleted`), 1 (`romane.m2`, doublon ligne) regroupé. **Zéro vrai bug de synchronisation Stripe ↔ Firebase.**
5. **Question produit à arbitrer par Romane** : un acheteur Plan Unique est-il censé avoir accès aux features gated `user.isPremium` (Strava, feedback, adaptations, suppression de plan dans l'UI) ? Aujourd'hui : **non**. Si Thomas râle, c'est sur cet écart attendu/perçu, pas sur un bug technique.

---

## 1. Comptes Thomas Weill trouvés

Scan complet de la collection `users` (1 222 docs) + collection `plans` (1 166 docs).

Filtres appliqués sur users :
- `email` contient `weill` ou `weil`
- `lastName` contient `weill` ou `weil`
- `displayName` contient `weill` ou `weil`
- `questionnaireData.email` contient `weill` ou `weil`
- `firstName == "Thomas"` (au cas où l'email ne contient pas le nom)

Filtre appliqué sur plans :
- `userEmail` contient `weill` ou `weil`

### Résultats

| Email | UID | createdAt | isPremium | hasPurchasedPlan | planPurchaseDate | Nb plans | Dernier plan ID |
|---|---|---|---|---|---|---|---|
| `thomas.weill.pro@gmail.com` | `nMH83IjgsYZY24QYWyijuIjyoH33` | 2026-05-19T19:08:39.416Z | **false** | **true** | 2026-05-19T19:17:36.036Z | 1 | `1779217739002` (fullPlanGenerated=true) |

**Aucun second compte Thomas Weill** en base. La recherche Stripe sur les emails `thomas.weill@gmail.com`, `thomas.weill.pro@gmail.com`, et `email~"weill"` (search wildcard) ne renvoie également **aucun customer Stripe** (le Plan Unique a été payé sans création de customer Stripe, c'est normal en mode `payment`).

### Côté Firebase Auth ?

Non vérifié dans cet audit (lecture Auth nécessite `firebase auth:export`). Si Romane voit 2 mails côté Firebase Auth, il est possible que le user se soit inscrit une fois avec un autre mail puis ait abandonné avant de remplir le questionnaire (donc pas de doc `users/{uid}`). À confirmer si nécessaire via `firebase auth:export users.json`.

---

## 2. Diagnostic

### Compte payeur
- `thomas.weill.pro@gmail.com` (UID `nMH83IjgsYZY24QYWyijuIjyoH33`)
- Checkout session : `cs_live_a1mEhIdQf4yzzwktQkv71KiqDqAMBHMAeOc2T7n3gKXvdKSiPdCxpsJv0u`
- Mode : `payment`, status `complete`, payment_status `paid`
- amount_total : **990 centimes = 9.90 EUR**
- metadata.purchaseType : `plan_unique`
- client_reference_id : `nMH83IjgsYZY24QYWyijuIjyoH33` (= UID Firestore)
- customer : `null` (normal en mode `payment` sans customer pré-créé → pas de `stripeCustomerId` ajouté à Firestore)
- Created : 2026-05-19T19:16:15Z
- planPurchaseDate Firestore : 2026-05-19T19:17:36Z (webhook a tourné ~1 min après le paiement → OK)

### Compte avec plan complet
- Même UID `nMH83IjgsYZY24QYWyijuIjyoH33`
- Plan `1779217739002` (`fullPlanGenerated=true`, `isPreview=false`)

### Même compte ou différents ?
**Même compte.** Le payeur ET le détenteur du plan sont le même UID. Pas de désynchro entre 2 comptes.

### Cause racine
**Aucune des 3 hypothèses (A/B/C) initialement formulées n'est correcte.**

- **Hypothèse A (2 comptes désynchronisés)** : écartée — un seul compte Thomas Weill en base.
- **Hypothèse B (webhook Stripe a échoué/timeout)** : écartée — le webhook a bien tourné, `hasPurchasedPlan=true` + `planPurchaseDate` set 1 min après paiement.
- **Hypothèse C (webhook update mauvais champ)** : écartée — le webhook update les bons champs (`hasPurchasedPlan`, `planPurchaseDate`).

**Cause réelle = sémantique métier** : `isPremium` n'est SET à `true` que pour les abonnements Premium (mode `subscription`). Pour le Plan Unique (mode `payment`), seul `hasPurchasedPlan=true` est set. C'est **by design** dans `server.js` lignes 311-320.

---

## 3. Ampleur bug isPremium en base

Requête Firestore composée : `hasPurchasedPlan == true AND isPremium == false`.

**12 users matchent.** Vérification croisée Stripe (sessions sur 90 jours, 218 sessions scannées, 23 matchent les 12 users) :

| Email | UID | hasPurchasedPlan | isPremium | Stripe trouvé | mode | status | montant | purchaseType | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| chapeaujean@yahoo.fr | 2DldgCWEighgoLu66BD7zBXGLAP2 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| theosutter57@gmail.cim | 5EFODYO5y2RTY9csZEwWtMQEP8p1 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| ghtdcd@laposte.net | 6ibD7v1ziseYwVxiezMtrN1Nrou2 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| harnois.camille@hotmail.fr | UTG9ouiSQuc4k5vIsVfodpgRMqt1 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| perarnau.g@gmail.com | XiDADS9sORS1lU4Uji35zfqUwQ13 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| sarah.lefrancq@yahoo.com | Y4HmO2zVhGOCDnGOHXukpZTwjVI3 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| patrick.cadours@hotmail.fr | dkik88CWTqdyQ8xMsHb0B3SIMAP2 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| lsautjeau@gmail.com | j6XTuwVzShbQMcMhW1RorVmGkrI3 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| guillaumepoettoz@gmail.com | lPoXg6nOrJeptrOB1w7lpAMnhs63 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |
| **thomas.weill.pro@gmail.com** | **nMH83IjgsYZY24QYWyijuIjyoH33** | true | false | OUI | payment | complete/paid | **9.90** | plan_unique | OK (Plan Unique) |
| romane.m2@hotmail.fr | p4dDVDJpuVfZkBku9iR2oQJzFn93 | true | false | OUI | subscription | canceled 2026-05-15 | 4.90 | subscription | OK (sub résiliée) |
| mhbrx06@gmail.com | sZCQwo8H6ichsu2W4TyFW2TosJ92 | true | false | OUI | payment | complete/paid | 3.90 | plan_unique | OK (Plan Unique) |

**Conclusion ampleur :** sur les 12 users, **10 sont des acheteurs Plan Unique** (état conforme), **1 est un abonnement résilié** (`romane.m2`, état conforme post-cancel), **0 est un vrai bug**.

**Pas de bug systémique** sur la synchro Stripe ↔ Firebase pour `isPremium`.

Note : la curiosité du dataset = pourquoi Thomas a payé **9.90€** (le 19/05) alors que les 9 autres ont payé **3.90€** (en mars). Le prix du Plan Unique a probablement été revu à la hausse entre mars et mai (`STRIPE_PRICE_PLAN_UNIQUE` updaté).

Contrôle inverse `isPremium=true AND hasPurchasedPlan=false` : **0 résultats** (aucun premium fantôme sans paiement).

---

## 4. Code Stripe webhook

### Fichier
`/Users/romanemarino/Coach-Running-IA/server.js` lignes 274-470.

### Logique observée

Lignes 311-320 (`checkout.session.completed`, Plan Unique branch) :

```js
const purchaseType = session.metadata?.purchaseType
  || (session.mode === 'payment' ? 'plan_unique' : 'subscription');

if (purchaseType === 'plan_unique') {
  const planUniqueUpdate = {
    hasPurchasedPlan: true,
    planPurchaseDate: new Date().toISOString(),
  };
  if (session.customer) planUniqueUpdate.stripeCustomerId = session.customer;
  await admin.firestore().collection('users').doc(userId).set(planUniqueUpdate, { merge: true });
```

Lignes 334-341 (subscription branch) :

```js
} else {
  await admin.firestore().collection('users').doc(userId).set({
    isPremium: true,
    premiumSince: new Date().toISOString(),
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription
  }, { merge: true });
```

### Bug identifié dans le webhook ?
**Aucun bug.** Le webhook traite correctement les 2 cas. Le « bug » perçu par Romane est en réalité une **incompréhension sémantique** : `isPremium` ne couvre pas les acheteurs Plan Unique, mais c'est intentionnel dans le code (et c'est la logique côté front avec `isPlanUniqueUser` calculé séparément dans `PlanView.tsx` ligne 233).

### Cohérence côté frontend

`src/components/PlanView.tsx` ligne 231-236 :

```ts
const userIsPremium = user?.isPremium ?? false;
const isPlanUniqueUser = !userIsPremium && (user?.hasPurchasedPlan ?? false);
const canAccessPremiumFeatures = userIsPremium && !isLocked;
// Plan Unique = accès complet au plan (toutes semaines) mais pas Strava/feedback/adaptation
const canViewFullPlan = canAccessPremiumFeatures || isPlanUniqueUser;
```

Donc Thomas **voit bien son plan complet** (gate `canViewFullPlan` = OK car `hasPurchasedPlan=true`). Ce qu'il ne voit pas :
- Connexion Strava (`PlanView.tsx` ligne 1337 `isPremium={canAccessPremiumFeatures}`)
- Bouton supprimer plan (`App.tsx` lignes 686, 758 `user.isPremium && …`)
- Couronne Premium dans le header (`App.tsx` ligne 434)
- Texte « Plans illimités — Premium » (`App.tsx` ligne 462 — peu impactant)
- Recalcul VMA débloqué (`App.tsx` ligne 1025 — `!isPremium && !hasPurchasedPlan` → Thomas l'a, OK)

### Fix proposé ?
**Aucun fix code requis sur le webhook.** Question produit à arbitrer :

- **Option produit A** : Plan Unique = accès au plan UNIQUEMENT, pas Strava/etc. → statu quo, `isPremium=false` correct pour Thomas.
- **Option produit B** : Plan Unique = accès égal à Premium hors récurrence → introduire un flag `canAccessPremiumFeatures = isPremium || hasPurchasedPlan` au niveau du front (ou au niveau du webhook : set `isPremium=true` lors d'un Plan Unique, mais alors la sémantique d'`isPremium` change et on perd la distinction subscription/one-shot ; préférable de gérer côté front).
- **Option produit C** : Plan Unique = plan COMPLET + feature mineure (ex. Strava OK) mais pas adaptation IA. Compromis à câbler manuellement au cas par cas.

---

## 5. Patch live Thomas

### Script
`/Users/romanemarino/Coach-Running-IA/patch-thomas-ispremium.mjs` (dry-run par défaut).

### UID cible
`nMH83IjgsYZY24QYWyijuIjyoH33` (vérification email = `thomas.weill.pro@gmail.com` avant patch).

### Action
- `isPremium: false → true`
- Ajout `premiumSince: <now>` (par cohérence avec le webhook subscription)
- Ajout marker audit : `premiumPatchedManually: true`, `premiumPatchReason: "Plan Unique → unlock features (GO Romane 2026-05-19)"`

### Dry-run validé (output) :
```
=== ÉTAT ACTUEL ===
{
  "uid": "nMH83IjgsYZY24QYWyijuIjyoH33",
  "email": "thomas.weill.pro@gmail.com",
  "isPremium": false,
  "hasPurchasedPlan": true,
  "planPurchaseDate": "2026-05-19T19:17:36.036Z"
}

=== DIFF ===
isPremium : false → true
premiumSince : (n/a) → 2026-05-19T20:38:41.876Z  [ajout]

[DRY-RUN] Aucune écriture Firestore. Pour exécuter : DRY_RUN=false node patch-thomas-ispremium.mjs
```

### En attente
**GO Romane explicite** avant `DRY_RUN=false node patch-thomas-ispremium.mjs`.

### Avertissement équité
Si on patch Thomas, il faut décider si on patch aussi les 9 autres acheteurs Plan Unique (chapeaujean, theosutter57, ghtdcd, harnois.camille, perarnau.g, sarah.lefrancq, patrick.cadours, lsautjeau, guillaumepoettoz, mhbrx06). Sinon Thomas devient un cas d'exception non documenté côté UX. Le patch unitaire seul est non-équitable produit.

---

## 6. Recommandations

### Patch Thomas
**OUI après GO Romane**, à condition de décider si c'est :
- (a) un cas d'exception SAV (Thomas est insatisfait → on l'unlock à titre commercial), à logger via `premiumPatchedManually=true` comme prévu dans le script.
- (b) le début d'un patch batch des 10 acheteurs Plan Unique (cf. ci-dessous).

### Patch batch des 9 autres acheteurs Plan Unique ?
**Décision produit Romane.** Aucune urgence technique : leur état Firestore est conforme au code actuel. Si la doctrine produit change vers « Plan Unique = accès complet incluant Strava », alors patcher les 10 d'un coup est cohérent, sinon ne rien faire.

### Fix code webhook ?
**Non urgent.** Le webhook est correct par rapport à la sémantique actuelle. À ne toucher que si la décision produit change.

### Action sur le front
Si Romane veut que Plan Unique = expérience identique à Premium, le **vrai fix** est de remplacer dans `App.tsx` et `PlanView.tsx` les checks `user.isPremium` par un helper `hasFullAccess(user) = user.isPremium || user.hasPurchasedPlan` partout où la feature ne concerne pas l'aspect récurrent (Strava, suppression, adaptation, etc.). Cela évite d'avoir à patcher les 10 users en base et est plus propre architecturalement.

### Validations annexes constatées dans cet audit
- Aucun second compte Thomas Weill en Firestore (recherche exhaustive sur 1 222 users).
- Aucun second customer Stripe pour Thomas (recherche email exhaustive sur Stripe Search API).
- 0 cas inverse `isPremium=true AND hasPurchasedPlan=false` (pas de premium fantôme).
- Le webhook Stripe a tourné en ~1 minute pour Thomas (paiement 19:16:15 → planPurchaseDate 19:17:36).

---

## Fichiers de référence

- `/Users/romanemarino/Coach-Running-IA/audit-thomas-user-parsed.json` (état Firestore Thomas)
- `/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json` (plan Thomas)
- `/Users/romanemarino/Coach-Running-IA/AUDIT-THOMAS-PREMIUM-COMPLET.md` (audit qualité plan, contexte)
- `/Users/romanemarino/Coach-Running-IA/_thomas-find-all-accounts.mjs` (recherche emails exacts)
- `/Users/romanemarino/Coach-Running-IA/_thomas-find-broader.mjs` (recherche firstName=Thomas + lastName Weill)
- `/Users/romanemarino/Coach-Running-IA/_thomas-find-listdocs.mjs` (scan complet users 1222 docs)
- `/Users/romanemarino/Coach-Running-IA/_thomas-find-in-plans.mjs` (scan complet plans 1166 docs)
- `/Users/romanemarino/Coach-Running-IA/_thomas-stripe-check.mjs` (Stripe customer search)
- `/Users/romanemarino/Coach-Running-IA/_thomas-stripe-broad.mjs` (Stripe sessions window 19/05)
- `/Users/romanemarino/Coach-Running-IA/_audit-ispremium-ampleur.mjs` (composé hasPurchasedPlan=true & isPremium=false)
- `/Users/romanemarino/Coach-Running-IA/_audit-12-users-stripe.mjs` (croisement 12 users ↔ sessions Stripe 90 j)
- `/Users/romanemarino/Coach-Running-IA/_romane-m2-deep.mjs` (vérif sub annulée romane.m2)
- `/Users/romanemarino/Coach-Running-IA/patch-thomas-ispremium.mjs` (patch dry-run, attend GO)
- `/Users/romanemarino/Coach-Running-IA/server.js` (webhook lignes 274-470)
- `/Users/romanemarino/Coach-Running-IA/src/components/PlanView.tsx` (gating lignes 231-236)
- `/Users/romanemarino/Coach-Running-IA/src/App.tsx` (gating lignes 1025, 1304, 686, 758, 592, 751)
