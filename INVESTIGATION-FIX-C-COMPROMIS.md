# Investigation Fix C — Compromis pic Confirmé/Expert
Date : 2026-05-21
Mode : Lecture seule (zéro modif code)
Dataset : `all-plans-batch-audit.json` (dump 18/05) + `audit-2105-1779267211924.json` (plan Arnaud du 20/05 08:53)

---

## TL;DR

**Le bug est DÉJÀ corrigé dans le code actuel** (commits `61fe3b1` du 20/05 11:16 et `2b5093d` P0c du 20/05 22:37). Les plans Arnaud-like générés AUJOURD'HUI auront un pic = 49 km (et non 28). Le plan Arnaud actuel (`1779267211924`, généré 20/05 08:53 — 3 h AVANT le commit fix) est victime de cette fenêtre temporelle.

Aucun nouveau patch code n'est nécessaire. Tout le travail restant est de **patcher les plans live sous-dim générés AVANT les fixes**, en respectant la doctrine `feedback_patch_live_plans_jour_seulement`.

---

## Audit batch ampleur

### Méthode
- N=268 plans Confirmé/Expert Semi/Marathon (tous, peu importe weeks count)
- Filtrage aberrants (VMA>25, cv<0, NaN) → **N=215 plans clean**
- Comparaison `picStored` (=max(weeklyVolumes) stocké) vs `vmaCapCurrent` (=cap algo recalculé avec le CODE ACTUEL post-fixes)

### Distribution `picStored / vmaCapCurrent`
| Bucket    | N   | %     |
|-----------|-----|-------|
| <50%      | 4   | 1.9%  |
| 50-60%    | 12  | 5.6%  |
| 60-70%    | 29  | 13.5% |
| 70-80%    | 26  | 12.1% |
| 80-95%    | 31  | 14.4% |
| 95-110%   | 24  | 11.2% |
| >110%     | 89  | 41.4% |

- **<60% sous-dim "vrai bug" : 16 / 215 = 7.4 %**
- <70% (sous-dim + zone grise) : 45 / 215 = 20.9 %
- ≥95% : 113 / 215 = 52.6 % (la majorité des plans matchent ou dépassent le cap actuel)

### Verdict ampleur
**Marginal (7.4 %) avec ces réserves importantes :**
- Tous les plans du dump sont **pré-fixes** (dump du 18/05, fixes 61fe3b1+P0c le 20/05).
- Pour les nouveaux plans (post-20/05 11:16), aucune donnée disponible dans le dump → mais théoriquement le bug ne devrait plus se manifester.
- Le bug n'a jamais été **massif** (>50 %) — il touchait surtout les profils freq=3 Semi/Marathon Confirmé.

---

## Cause technique scale-up échoué

### Le diagnostic du brief est PARTIELLEMENT inexact

Le brief suppose que `enforceWeekConstraints:1421-1795` échoue à scale-up les séances pour matcher le pic algo. **Vérifié faux** : le pic stocké d'Arnaud (28 km) provient **directement du `calculatePeriodizationPlan`** — c'est l'algo théorique lui-même qui produit 28 km, PAS un scale-up loupé en aval.

### Trace pour Arnaud (1779267211924, VMA=16.07 cv=25 freq=3, Semi 1h35)

**Cap VMA-durée AVANT 61fe3b1 (20/05 11:16) :**
- `slMaxDur = 115 min` (Semi conf, table MAX_SL_DURATION:1206)
- `nonSlMaxDur = round(115 × 0.75) = 86 min`
- `efSpeedKmH = 16.07 × 0.75 = 12.05 km/h`
- `realisticFactor = 0.70` (avant 61fe3b1)
- `volumeCapSessions = 2` (avant P0c : `= runningSessions = freq-1`)
- `slMaxKm = (115 × 0.70 / 60) × 12.05 = 16.2 km`
- `otherMaxKm = (1 × 86 × 0.70 / 60) × 12.05 = 12.1 km`
- **`vmaBasedMaxVolume = 28 km`** ← MATCH le pic stocké

**Cap VMA-durée AVEC le code actuel (post-fixes) :**
- `realisticFactor = 0.85` (Semi/Marathon, commit 61fe3b1)
- `volumeCapSessions = max(2, 3) = 3` (Semi/Marathon freq ≤ 3, commit P0c)
- `slMaxKm = (115 × 0.85 / 60) × 12.05 = 19.6 km`
- `otherMaxKm = (2 × 86 × 0.85 / 60) × 12.05 = 29.4 km`
- **`vmaBasedMaxVolume = 49 km`** ← Match les attentes Pfitzinger

### Le coupable historique : `realisticFactor` ET `volumeCapSessions`
Ces deux paramètres ont été corrigés le 20/05 par commits `61fe3b1` et `ec55892`/`2b5093d`. Aucun cap aval (`MAX_SESSION_KM`, `MAX_WEEKLY_VOLUME`, `slMaxDur`) n'a été le coupable.

### Note sur le mécanisme scale-up `enforceWeekConstraints` (L1773-1794)
Le scale-up fait son travail correctement : il prend `currentVolume vs targetVolume * 0.80` et augmente proportionnellement les séances, en respectant `slMaxDur` et `nonSlMaxDur`. Le problème n'est PAS là — il est en amont, dans `targetVolume` lui-même qui vaut déjà 28 km (sortie de `calculatePeriodizationPlan` pré-fix).

---

## 4 compromis évalués

### A — Relever `MAX_SESSION_KM` (table:967)
- Action : `Semi.conf 25→28`, `Marathon.conf 35→38`, etc.
- Effet : permet à `enforceWeekConstraints` de produire des séances plus longues
- **Verdict : INUTILE.** Le scale-up ne bloque pas sur `MAX_SESSION_KM` (Arnaud bloque à 28 km/sem global, soit 14 km/séance SL — bien sous le cap 25 km). C'est `vmaBasedMaxVolume` au niveau `targetVolume` qui plafonne, pas le cap par séance.
- Risque régression : moyen (plans Expert qui ne veulent pas 25+ km/séance).

### B — Augmenter `slMaxDur` ou `nonSlMaxDur` Confirmé/Expert (table:1206)
- Action : `Semi.conf 115→130`, `Marathon.conf 190→200`
- Effet : SL et autres séances peuvent être plus longues, donc plus de km/sem
- **Verdict : INUTILE.** Même raisonnement. `slMaxDur=115` n'est pas activé pour Arnaud (sa SL fait 13.9 km / 76 min, bien sous le cap). C'est `realisticFactor` qui multiplie cette durée max théorique pour la calibrer — déjà passée de 0.70 à 0.85.
- Risque régression : élevé (profils tendineux fragiles, doctrine Hanson).

### C — Cap ACWR posé en pre-scaling (Coach 20 ans)
- Action : ajouter `pic_cible = min(pic_algo, cv × facteur_niveau)` où Confirmé/Expert = 1.8
- Effet : Arnaud cv=25 → pic visé min(49, 45) = 45 km
- **Compatible Thomas Weill resync ?** Oui — la resync L2044-2058 réajuste `weeklyVolumes[weekIdx]` post-enforce. Si pre-scaling fixe un pic plus haut (45 vs 28 actuel), les séances tireront plus vers ce 45, et la resync corrigera l'écart restant. PAS de cassure.
- **Verdict : SUPERFLU.** Le code actuel produit déjà 49 km (donc < 1.96 × cv=25). L'ACWR cap remplacerait un mécanisme déjà fonctionnel par une garde-fou différente, sans bénéfice.
- Risque régression : moyen (cv=0 → pic forcé à 0 ; need fallback).

### D — Forcer scale-up plus agressif en Confirmé+ (L1771-1794)
- Action : changer le seuil `< targetVolume * 0.80` → `< targetVolume * 0.95` pour Conf/Expert
- Effet : scale-up déclenché plus tôt
- **Verdict : INUTILE.** Le scale-up actuel fonctionne. Le problème est en amont (le `targetVolume` 28 est déjà trop bas dans les plans pré-fix).
- Risque régression : moyen.

---

## Compromis recommandé

### **AUCUN nouveau patch code.**

**Justification :**
1. Le bug racine est **déjà corrigé** par deux commits récents (`61fe3b1` + `2b5093d`).
2. Les nouveaux plans (post-20/05 11:16) produiront des pics calibrés correctement (~49 km pour Arnaud).
3. Ajouter un Compromis A/B/C/D = empiler un fix sur un bug déjà résolu = doctrine `feedback_pas_de_micro_expert` violée.
4. Risque régression non nul pour A et B (toucher aux tables MAX_SESSION_KM ou slMaxDur peut casser des profils Expert légitimes).

### Action recommandée à la place
**Patcher les plans live sous-dim générés AVANT fixes**, en respectant strictement `feedback_patch_live_plans_jour_seulement` :
- Si S1 commencée → NE PAS toucher (doctrine stricte).
- Si preview seulement (`fullPlanGenerated=false`) → régénération côté client appliquera le nouveau code automatiquement → aucun patch nécessaire.
- Si fullPlan + S1 non commencée → patchable.

**Effort minimal, YAGNI respecté, doctrine Romane respectée, Thomas Weill resync intacte.**

---

## Patches live ciblés

### Analyse 46 plans sous-dim <70% Confirmé/Expert Semi/Marathon

| Plan ID         | Email                          | Type          | Pic stocké / Cap actuel | Statut       | Patchable ? |
|-----------------|--------------------------------|---------------|-------------------------|--------------|-------------|
| 1771621613399   | rgna79@gmail.com               | Marathon conf | 48 / 91 (53%)           | S1 commencée (start 20/02) | **NON** (doctrine NO TOUCH) |
| 1772487285227   | rgna79@gmail.com               | Marathon conf | 64 / 92 (70%)           | S1 commencée (start 02/03) | **NON** |
| 1778392497932   | azkaine24@gmail.com            | Marathon conf | 41 / 61 (67%)           | S1 commencée (start 10/05) | **NON** |
| 1776111554147   | annesophie.perret1982@gmail.com | Marathon expert | 55 / 107 (51%)        | S1 non commencée (start 05/09) | **OUI** |
| **TOUS LES AUTRES (42)** | — | — | — | `fullPlanGenerated=false` (preview seul) | **NON nécessaire** (regen client = code post-fix) |

### Cas Arnaud (1779093258648, dump 18/05 — preview)
- `pic=33 vs cap_actuel=49` (ratio 67%)
- `fullPlanGenerated=false`, preview seulement
- → Sera régénéré côté client → nouveau pic ~49 km. **Pas de patch nécessaire.**

### Cas Arnaud actuel (1779267211924, plan du 20/05 08:53)
- Plan généré 3h AVANT fix 61fe3b1
- VMA=16.07, cv=25, freq=3, Semi 1h35
- Pic stocké = 28 km, cap actuel calculable = 49 km, **ratio 57%**
- startDate = 2026-05-20, today = 2026-05-21 → **S1 commencée depuis 1 jour**
- Doctrine `feedback_patch_live_plans_jour_seulement` : "S1 commencée → NE PAS toucher"
- → **NON patchable**

### Synthèse patchables
- **1 plan patchable** sur 46 sous-dim : annesophie.perret1982@gmail.com (1776111554147).
- Tous les autres : soit doctrine NO TOUCH (S1 commencée), soit non nécessaire (preview qui sera regen).

---

## Tests anti-régression nécessaires

**Si Romane choisit malgré tout de patcher (annesophie.perret) :**
1. Vérifier que `enforceWeekConstraints` produit des séances dont la somme matche `weeklyVolumes[i]` (Thomas Weill resync).
2. Vérifier qu'aucune séance ne dépasse `MAX_SESSION_KM.Marathon.expert = 38 km`.
3. Vérifier que `slMaxDur Marathon expert = 200 min` n'est pas dépassé.
4. Régénérer ou ré-aligner les `weeklyVolumes` stockés pour qu'ils suivent le pic = 107 km cible.
5. Vérifier que les phases (fondamental/dev/spec/affutage) restent cohérentes.

**Si Romane ne patche pas (recommandation) :**
- Aucun test code.
- Aucun risque régression sur Thomas Weill resync (zéro modif).

---

## Décision Romane attendue

**Choix binaire :**

### Option 1 — Statu quo (RECOMMANDÉ)
- Aucun patch code, aucun patch live.
- Les nouveaux plans bénéficient des fixes 61fe3b1 + P0c.
- Les rares plans live patchables (1 seul : annesophie.perret) restent sous-dim mais le user a accepté son plan, et la doctrine Romane est respectée.
- **Effort : 0**. **Risque : 0**.

### Option 2 — Patcher annesophie.perret (1776111554147) uniquement
- Script `patch-anne-sophie-perret-marathon-live.mjs` (modèle = `patch-thomas-marathon-live.mjs`).
- Régénérer le plan avec le code actuel (qui produira pic ~107 km).
- Notifier Romane (PAS le user, doctrine `feedback_jamais_contact_client`).
- **Effort : ~30 min**. **Risque : faible** (S1 non commencée).

### Option 3 — Patch code (NON RECOMMANDÉ)
- Aucun des Compromis A/B/C/D apporte de valeur :
  - A/B touchent les mauvais leviers (le bug n'est pas là)
  - C/D sont superflus (le code actuel résout déjà le problème)
- Violerait `feedback_pas_de_micro_expert` et `feedback_chaque_ligne_justifiee`.

**Recommandation : Option 1 (statu quo). Option 2 acceptable si Romane veut maximiser la qualité pour le seul user concerné.**

---

## Annexe — Code paths vérifiés (lecture seule)

| Path                                                        | Rôle                                  | État         |
|-------------------------------------------------------------|---------------------------------------|--------------|
| `geminiService.ts:2044-2058`                                | Thomas Weill resync weeklyVolumes     | INTACT       |
| `geminiService.ts:1773-1794`                                | Scale-up séances enforceWeekConstraints | Fonctionnel |
| `geminiService.ts:2696-2697`                                | Calcul vmaBasedMaxVolume              | Corrigé par 61fe3b1 + P0c |
| `geminiService.ts:2666-2668`                                | volumeCapSessions Semi/Marathon freq≤3 | Corrigé par P0c |
| `geminiService.ts:2675`                                     | realisticFactor 0.70→0.85             | Corrigé par 61fe3b1 |
| `geminiService.ts:967-980` (MAX_SESSION_KM)                 | Cap km/séance                         | OK, pas coupable |
| `geminiService.ts:1203-1217` (MAX_SL_DURATION)              | Cap durée SL                          | OK, pas coupable |
| `geminiService.ts:1220-1234` (MAX_WEEKLY_VOLUME)            | Cap volume hebdo                      | OK, pas coupable |

---

**Conclusion :** Le bug Arnaud reflète un état du code antérieur aux fixes du 20/05 11:16/22:37. Il n'y a rien à corriger en code. Les plans live concernés sont soit non patchables (S1 commencée), soit non concernés (preview qui sera régénérée).
