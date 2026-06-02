# F-17 — PM NEUTRE : Faut-il des Firestore Rules sur `_paceRecalibrationCount` ?

**Question** : Bloquer côté serveur le compteur ≤ 4, ou laisser l'UI seule garder la porte ?

---

## 1. Chiffres bruts

| Métrique | Valeur estimée | Source |
|---|---|---|
| Probabilité abus (% users qui tentent F12 + Firestore call) | **0.05 – 0.2 %** | Base users grand public running, pas dev-heavy |
| Gravité abus (1-5) si non bloqué | **2/5** | Plan se dégrade pour CE user, pas de fuite data, pas de coût $ |
| Effort B (Rules) | **20 min** réels (10 lignes + déploi + test) | Infra firestore.rules déjà active |
| Effort C (monitoring) | **25 min** + 1 alerte/an à traiter | Surcoût mental Romane |
| Valeur ajoutée B vs A | Bloque 0.1 % × N users × 1 plan dégradé | Faible en absolu, infini en marginal |

---

## 2. Pour / Contre

| | Option A (skip) | Option B (Rules) | Option C (monitoring) |
|---|---|---|---|
| **Effort** | 0 min | 20 min | 25 min |
| **Risque résiduel** | Faible mais réel | Nul | Faible + réactif |
| **Maintenance** | 0 | 0 (config statique) | 1 alerte/an à trier |
| **Doctrine sécurité>conversion** | KO (UI-only = porte ouverte) | OK | OK partiel (réactif, pas préventif) |
| **Doctrine pas-de-micro-expert** | OK | OK (10 lignes ≠ sur-ingé) | KO (ajoute charge mentale) |
| **Cohérence stack** | N/A | Naturel (rules déjà là) | Naturel aussi |
| **Réversibilité** | Patch live possible | Trivial (changer le 4) | Trivial |

---

## 3. Analyse rationnelle

**Le seuil de décision** : effort ≤ 30 min + maintenance nulle + doctrine sécurité explicite + infra déjà en place = **B domine A et C arithmétiquement**.

- A est tentant SEULEMENT si Rules coûtait > 1h ou maintenance récurrente. Ici 20 min one-shot.
- C est strictement dominée par B : plus d'effort, moins de protection, charge mentale ajoutée. Aucune raison rationnelle de la choisir hors cas où on veut DATA sur les tentatives (pas le cas ici).
- B n'est PAS du micro-expert : 10 lignes de config sur une infra déjà déployée pour une feature payante = ratio effort/valeur largement positif même à 0.1 % d'abus.

**Le piège A** : "très faible proba" est un argument valable pour skipper un dev de 2 jours, pas pour skipper 20 min sur une feature Premium.

**Le piège B** : aucun, sauf si on découvre que les Rules cassent un edge case legit (testable en 5 min).

---

## 4. Verdict

# **OPTION B — GARDE Rules V1**

**Justification 1 phrase** : 20 min one-shot sur infra firestore.rules déjà active, zéro maintenance, ferme proprement la doctrine `sécurité > conversion` sans tomber dans le micro-expert — A et C sont strictement dominées par B sur le ratio effort/protection.

**Condition** : tester 1 cas legit avant déploi (user qui recalibre #4 → doit passer). Si OK, ship.
