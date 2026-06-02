# F-17 — PM SIMPLIFICATEUR (challenge des 3 conditions bloquantes)

PM produit 15 ans, école "ship early, simplify later". Mission : challenger les 3 conditions posées par le PM conservateur pour shipper self-serve cette semaine.

---

## 0. Synthèse tableau

| # | Condition | Verdict | Risque réel sans | Reco scope V1 | Effort dev |
|---|-----------|---------|-------------------|---------------|------------|
| 1 | Snapshot complet `weeks` Firestore TTL 30j | **SUR-INGÉNIERIE** | Faible (rollback rare, on a déjà `_vmaHistory`) | `_vmaHistory` array (4 entrées max, ~800 octets) — replay swap inverse côté client | 0.5j |
| 2 | Compteur 4 + warning ≥+25% en Cloud Function | **NICE-TO-HAVE** | Moyen (devtools bypass = 1 user technicien sur 1000) | Firestore Security Rules sur `_paceRecalibrationCount` (refus write si ≥ 4) + UI garde-fou | 0.5j |
| 3 | Filter `date >= today` + delta=0 no-op | **ESSENTIEL** | Élevé (casse doctrine `patch_live_plans_jour_seulement`, S1 vécue trahie) | À FAIRE — version simple : `weeks.flatMap.filter(s => s.date >= today)` + early return delta=0 | 0.5j |

**Total V1 défendable : ~1.5j dev**. Reco PM finale en §4.

---

## 1. Condition 1 — Snapshot `weeks` Firestore TTL 30j

### Verdict : SUR-INGÉNIERIE

### Risque réel sans
- User clique "Revenir aux allures précédentes" → on doit reconstituer l'état.
- **Mais** : le service est PURE et déterministe. Si on log `(fromVMA, toVMA, fromPaces, toPaces)` dans `_vmaHistory` (4 entrées, ~800 octets), on peut **rejouer le swap inverse** côté client en ~50ms. Pas besoin de snapshoter 16 semaines × 5 sessions × N champs.
- Cas pathologique : si le user a fait une modif manuelle entre 2 recalibrages (commentaire perso sur séance ?). Aujourd'hui le user **ne peut pas éditer** ses sessions côté app (vérif : aucun endpoint user-write sur sessions hors recalibrage). Donc reconstitution = parfaite.
- Volume estimé : ~5% Premium utilisent recalibrage, dont ~10% rollback = 0.5% des users. Snapshot 30j × 16 semaines × tous ces users = **plusieurs MB Firestore** pour ~50 rollback/mois.

### Alternative plus simple (RECO)
`_vmaHistory: Array<{at, fromVMA, toVMA, fromPaces, toPaces}>` (max 4 entrées, FIFO). Bouton rollback = appel `recalibrateSession(s, toPaces, fromPaces)` sur les sessions futures. Idempotent, testé, gratuit.

### Doctrine en jeu
- `feedback_pas_de_micro_expert` : empiler "snapshot complet + TTL + Cloud Function nettoyage" pour une feature utilisée par 0.5% des users = textbook micro-expert.
- `feedback_securite_avant_conversion` : la sécurité ici concerne le PLAN d'entraînement, pas un transfert bancaire. Pas besoin de garantie 30j.

### Coût/Bénéfice
- **Effort PM conservateur** : Cloud Function nettoyage + struct snapshots + TTL config + tests = 2-3j dev + 1j ops.
- **Effort reco** : étendre `_vmaHistory` (déjà mentionné dans F17-CHALLENGE-FINAL §2 #12) = 0.5j.
- **Bénéfice user** : identique (rollback fonctionne dans les 2 cas).

**Verdict : SKIP Cloud Function. Ship avec `_vmaHistory`.**

---

## 2. Condition 2 — Compteur 4 + ≥+25% défendus côté serveur

### Verdict : NICE-TO-HAVE (version Cloud Function), ESSENTIEL (version Firestore Rules)

### Risque réel sans
- User dev ouvre devtools, modifie `_paceRecalibrationCount` à 0 → fait 50 recalibrages.
- Population cible : **utilisateurs qui savent ouvrir Firestore + comprennent le modèle**. Sur Coach Running IA, c'est probablement < 1 user sur 5000. Romane peut détecter via monitoring (`_recalibrationHistory.length > 4`).
- Gravité : si ce user se blesse, c'est l'app qui sera pointée publiquement, MÊME s'il a triché. Risque réputationnel réel.

### Alternative plus simple (RECO)
**Firestore Security Rules** (pas Cloud Function). 10 lignes :
```
match /plans/{planId} {
  allow update: if request.resource.data._paceRecalibrationCount <=
                    resource.data._paceRecalibrationCount + 1
             && request.resource.data._paceRecalibrationCount <= 4;
}
```
Pas de Cloud Function (cold start, ops, latence). Les rules tournent côté Firestore natif, gratuit, instantané.

Pour le ≥+25% : on garde côté UI (warning + double opt-in cf. F17-PM-CHALLENGE-FINAL #1). Pas besoin de serveur — c'est un consentement, pas un blocage. Si user contourne, il a explicitement voulu : doctrine `feedback_securite_avant_conversion` = transparence + décharge explicite, suffisant.

### Doctrine en jeu
- `feedback_securite_avant_conversion` : OUI on défend, mais avec la couche minimale qui marche (rules > Cloud Function).
- `feedback_pas_de_micro_expert` : Cloud Function pour 1 vérif scalaire = overengineering.

### Coût/Bénéfice
- **Cloud Function PM conservateur** : code + deploy + monitoring + cold start = 1j dev + dette ops.
- **Firestore Rules** : 10 lignes + 1 test emulator = 2h dev.
- **Bénéfice sécurité** : identique sur le compteur. Le +25% reste côté UI dans les 2 cas (pas un risque tech, un risque pédago).

**Verdict : SKIP Cloud Function. Ship avec Firestore Rules pour le compteur. Warning ≥+25% reste UI.**

---

## 3. Condition 3 — Filter sessions `date >= today` + delta=0 no-op

### Verdict : ESSENTIEL

### Risque réel sans
- User Premium est mercredi soir S15, a déjà fait sa séance lundi à l'ancienne allure 5:30/km.
- Il recalibre VMA +10% → service patche TOUTES les `weeks` indistinctement → séance lundi affiche maintenant 5:00/km.
- **Conséquence** : l'historique d'entraînement ment. Doctrine `feedback_patch_live_plans_jour_seulement` directement violée. User pense avoir mal tourné lundi alors qu'il a respecté la consigne d'alors.
- Gravité : trahison de confiance, immédiate, visible. Tous les users mid-plan concernés (~80% des users qui vont utiliser la feature, vs 0.5% pour rollback).

Pour delta=0 (même VMA) :
- User retape la même VMA par erreur → service incrémente le compteur (3/4 → 4/4) pour rien. UX terrible.
- Pas critique sécurité mais critique UX, et trivial à coder.

### Alternative plus simple (RECO)
Aucune. Cette condition EST déjà la version minimale. C'est juste un filtre avant boucle + un early return :
```ts
if (samePaces(old, new)) return { noop: true };
const sessionsToPatch = plan.weeks
  .flatMap(w => w.sessions)
  .filter(s => s.date >= today());
```
**3 lignes**. Coût négligeable, valeur énorme.

### Doctrine en jeu
- `feedback_patch_live_plans_jour_seulement` : explicite. Plans du jour OK (preview vu), plans antérieurs NON.
- `feedback_input_client_obligatoire` : ce que l'user a vécu lundi reste tel quel, on ne réécrit pas son passé.

### Coût/Bénéfice
- Effort : 0.5j (incluant tests). Plus de tests que de code.
- Bénéfice : évite la régression doctrine la plus probable et la plus visible.

**Verdict : SHIP. Non négociable.**

---

## 4. Reco scope V1 minimal (PM final)

### À shipper cette semaine pour self-serve self-confiance

1. **Filter sessions `date >= today`** + delta=0 no-op (Condition 3). NON NÉGOCIABLE.
2. **Firestore Security Rules** sur `_paceRecalibrationCount <= 4` (allégé Condition 2).
3. **`_vmaHistory` array** (4 entrées max) pour rollback déterministe (allégé Condition 1).
4. **Warning ≥+25% côté UI** avec double opt-in (cf. F17-PM-CHALLENGE-FINAL #1) — déjà spec'd.
5. **Filter sessions `_raceDay !== true`** (doctrine D19, gratuit, 1 ligne).

### À NE PAS faire pour V1
- Cloud Function nettoyage snapshots TTL 30j → skip.
- Cloud Function compteur → remplacée par Firestore Rules.
- Snapshot complet `weeks` → remplacé par `_vmaHistory` + replay.

### À monitorer post-ship pour décider V2
- Nb users qui rollback / total users qui recalibrent (si > 20%, V2 envisager snapshot complet).
- Nb mails Romane "j'ai paumé mes allures" (si > 3/semaine, idem).
- Détection compte triché : query Firestore hebdo `_recalibrationHistory.length > 4`.

### Estimation totale V1
- Service & filter : 0.5j (déjà 80% fait dans service pur).
- `_vmaHistory` + rollback button : 0.5j.
- Firestore Rules + test : 0.5j (rules + 1 test emulator).
- UI warning + double opt-in (déjà spec) : 0.5j.
- QA Robine/Lucas réel + 3 profils de batterie (`feedback_validation_n_profils_avant_sprint` : on prend 10 profils diversifiés dont 2 trail mais BLOQUÉS V1, cf. F17-CHALLENGE-FINAL #6) : 1j.

**Total : 3j dev. Shippable jeudi/vendredi cette semaine.**

---

## 5. Désaccord assumé avec le PM conservateur

Le PM conservateur a raison sur LE PRINCIPE (défense en profondeur, snapshot, serveur). Il a tort sur l'INTENSITÉ : il a transformé une feature self-serve d'1 semaine en chantier de 2-3 semaines pour couvrir des risques < 1% des users.

Doctrine `feedback_pas_de_micro_expert` : on ship V1 défendable, on apprend du terrain, on durcit V2 si nécessaire. La doctrine NE dit PAS "ship un truc dangereux" — elle dit "ne pas empiler des raffinements théoriques avant feedback réel".

**Les 3 garde-fous V1 (filter date + rules count + vmaHistory) suffisent pour Robine, Lucas et 200 premiers Premium. Si fail, on apprend, on patch. Si pas fail, on a gagné 2 semaines de ship.**

---

**TL;DR** : Condition 3 ESSENTIELLE (ship). Condition 2 allégée en Firestore Rules (ship). Condition 1 SKIP (remplacée par `_vmaHistory` 4 entrées). Total 3j dev, live cette semaine.
