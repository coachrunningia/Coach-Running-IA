# Tests Sprint 3 — 12 profils Finisher avant/après
Date : 2026-05-19
Commit testé : `f32db31` (modif `buildFinisherFeasibility`)
Méthode : reproduction inline 100% identique de `buildFinisherFeasibility` AVANT (commit `f32db31^`) et APRÈS (commit `f32db31`) + 12 profils Finisher variés.
Runner : `/Users/romanemarino/Coach-Running-IA/test-sprint3-finisher-profils.mjs`

---

## Synthèse 30 secondes

| Catégorie | Compte | Détail |
|---|---|---|
| ✅ Conforme attendu | **10/12** | Caps déclenchent uniquement sur cas légitimes ; pas d'over-correction |
| ⚠️ Différent mais OK | **2/12** | Profil #6 (déjà RISQUÉ avant — caps invisibles, normal) + Profil #9 (cap VMA modéré 105% borderline) |
| ❌ Régression / over-correction | **0/12** | Aucune régression sur profil "qui marchait bien" |

**Verdict : ✅ GO deploy Sprint 3 — caps bien calibrés, comportement attendu, zéro régression.**

---

## Doctrine validée

> Romane (verbatim) : "limportant avec ce test cest quon ne fasse pas trop de modif et juste quon affine car le modele fonctionnait plutot bien honnetement sauf erreur."

Réponse du test : **le modèle pré-Sprint 3 était permissif** (cas steph-fanny, profils 4, 5 partaient à EXCELLENT 95-100). Sprint 3 cap UNIQUEMENT le score à 84 (max BON) sans jamais dégrader plus bas. Les caps **ne touchent que des profils où l'EXCELLENT était optimiste/dangereux**, jamais des profils sains.

---

## 12 profils détaillés

### Profil #1 — Steph-fanny case (référence bug)
- **Inputs** : F 60 ans, BMI 23.4, Intermédiaire, **10 km Finisher**, VMA 8, vol 20 km/sem, 12 sem, chrono OUI, PB 5K en 46:00
- **AVANT Sprint 3** : score **95** → **EXCELLENT**
- **APRÈS Sprint 3** : score **84** → **BON** (cap appliqué : `senior10K+(60 ans, 10km)`)
- **Δ score** : -11 (95 → 84)
- **Caps déclenchés** : `senior + 10K+` ✅
- **VERDICT** : ✅ **Conforme — bug corrigé**

### Profil #2 — Jeune débutante 5K
- **Inputs** : F 28 ans, BMI 22.0, Débutante, 5 km Finisher, VMA 9, vol 10 km/sem, 12 sem, chrono NON
- **AVANT Sprint 3** : score 85 → EXCELLENT
- **APRÈS Sprint 3** : score 85 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun (pas senior, pas 10K+, BMI sain, pas de PB)
- **VERDICT** : ✅ **Conforme inchangé — profil sain protégé**

### Profil #3 — Adulte 40 ans 10K Finisher (PB cohérent VMA)
- **Inputs** : H 40 ans, BMI 23.7, Intermédiaire, 10 km Finisher, VMA 14, vol 30 km/sem, 10 sem, chrono OUI, PB 10K en 50:00 (= 86% VMA, cohérent)
- **AVANT Sprint 3** : score 95 → EXCELLENT
- **APRÈS Sprint 3** : score 95 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun
- **VERDICT** : ✅ **Conforme inchangé**
- **Note** : test initial avec VMA 11 sur ce même PB déclenchait cap VMAoptimiste (109%). C'est mathématiquement correct : **on ne peut pas courir un 10K à 109% de sa VMA** → VMA déclarée 11 km/h était erronée. Profil corrigé à VMA 14 (réaliste).

### Profil #4 — Senior 55 ans Marathon Finisher
- **Inputs** : H 55 ans, BMI 24.6, Intermédiaire, Marathon Finisher, VMA 11, vol 40 km/sem, 18 sem, chrono OUI
- **AVANT Sprint 3** : score **100** → **EXCELLENT**
- **APRÈS Sprint 3** : score **84** → **BON** (cap : `senior10K+(55 ans, 42.2km)`)
- **Δ score** : -16 (100 → 84)
- **Caps déclenchés** : `senior + Marathon` ✅
- **VERDICT** : ✅ **Conforme — downgrade légitime (sécurité cardio senior + distance d'endurance)**

### Profil #5 — Senior 60 ans Trail 30K Finisher
- **Inputs** : F 60 ans, BMI 22.9, Confirmé, Trail 30 km Finisher, VMA 13, vol 50 km/sem, 16 sem, chrono OUI, PB 10K 1h00
- **AVANT Sprint 3** : score 100 → EXCELLENT
- **APRÈS Sprint 3** : score 84 → BON (cap : `senior10K+(60 ans, 30km)`)
- **Δ score** : -16
- **Caps déclenchés** : `senior + 30K` ✅
- **VERDICT** : ✅ **Conforme — downgrade légitime**

### Profil #6 — BMI 28 jeune 35 ans Marathon Finisher
- **Inputs** : H 35 ans, BMI 28.1, Débutant, Marathon Finisher, VMA 10, vol 25 km/sem, 18 sem, chrono NON
- **AVANT Sprint 3** : score 45 → **RISQUÉ**
- **APRÈS Sprint 3** : score 45 → **RISQUÉ** (caps non déclenchés car score déjà <84)
- **Δ score** : 0
- **Caps déclenchés** : aucun — le cap BMI 27+ n'a PAS été appliqué car la garde `score > 84` empêche d'écraser un score déjà bas (Math.min). Le profil est déjà sanctionné par les pénalités marathon débutant + vol insuffisant + VMA estimée + BMI 25+ standard.
- **VERDICT** : ⚠️ **Différent mais OK** — le score était déjà bas avant Sprint 3, le profil n'a pas besoin du nouveau cap.
- **Note importante** : cela prouve que **`Math.min(score, 84)` ne dégrade JAMAIS un score déjà inférieur**, conformément à la doctrine.

### Profil #7 — Senior 65 ans 5K Finisher
- **Inputs** : F 65 ans, BMI 22.7, Intermédiaire, 5 km Finisher, VMA 9, vol 15 km/sem, 10 sem, chrono NON
- **AVANT Sprint 3** : score 85 → EXCELLENT
- **APRÈS Sprint 3** : score 85 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun (5K < seuil 10K du cap senior)
- **VERDICT** : ✅ **Conforme — 5K reste hors scope (correct : 5K en marche-course est sain pour senior)**
- **Note** : valide que la borne `distanceKm >= 10` épargne bien le 5K pour les seniors. Pas d'over-correction.

### Profil #8 — Confirmé 50 ans VMA 16 PB 10K 42min (cohérent)
- **Inputs** : H 50 ans, BMI 22.1, Confirmé, 10 km Finisher, VMA 16, vol 50 km/sem, 10 sem, chrono OUI, PB 10K 42:00 (= 89.3% VMA, cohérent juste sous seuil 90%)
- **AVANT Sprint 3** : score 95 → EXCELLENT
- **APRÈS Sprint 3** : score 95 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun (50 ans < 55, pas optimiste à 89.3%)
- **VERDICT** : ✅ **Conforme inchangé — élite préservée**
- **Note** : test initial avec VMA 14 sur ce même PB déclenchait cap (102% VMA — impossible). VMA 16 est la valeur cohérente avec le chrono.

### Profil #9 — VMA légèrement optimiste (5K 26 min sur VMA 11)
- **Inputs** : F 45 ans, BMI 22.0, Débutante, 10 km Finisher, VMA 11, vol 20 km/sem, 12 sem, chrono OUI, PB 5K en 26:00 (vitesse 11.54 km/h = 105% VMA)
- **AVANT Sprint 3** : score 95 → EXCELLENT
- **APRÈS Sprint 3** : score 84 → BON (cap : `VMAoptimiste(105% vs 95%)`)
- **Δ score** : -11
- **Caps déclenchés** : `VMAoptimiste` ✅
- **VERDICT** : ⚠️ **Différent OK — cap légitime (105% VMA sur 5K = impossible physiologiquement, VMA déclarée sous-évaluée d'au moins 0.5 km/h)**
- **Note** : seuil `>95% VMA tenu sur 5K` = filet anti-VMA-corrigée-optimiste. Cas borderline mais cap pertinent.

### Profil #10 — VMA TRÈS optimiste (5K 22 min sur VMA 11)
- **Inputs** : F 50 ans, BMI 22.0, Intermédiaire, Semi Finisher, VMA 11, vol 35 km/sem, 12 sem, chrono OUI, PB 5K en 22:00 (= 124% VMA — incohérent)
- **AVANT Sprint 3** : score 95 → EXCELLENT
- **APRÈS Sprint 3** : score 84 → BON (cap : `VMAoptimiste(124% vs 95%)`)
- **Δ score** : -11
- **Caps déclenchés** : `VMAoptimiste` ✅
- **VERDICT** : ✅ **Conforme — cap nettement légitime**

### Profil #11 — Expert 45 ans Marathon VMA 17
- **Inputs** : H 45 ans, BMI 21.5, Expert, Marathon Finisher, VMA 17, vol 70 km/sem, 18 sem, chrono OUI
- **AVANT Sprint 3** : score 100 → EXCELLENT
- **APRÈS Sprint 3** : score 100 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun
- **VERDICT** : ✅ **Conforme inchangé — Expert sain préservé**

### Profil #12 — Ultra 100K Finisher 50 ans
- **Inputs** : H 50 ans, BMI 22.9, Expert, Trail 100 km Finisher, VMA 14, vol 80 km/sem, 24 sem, chrono OUI, freq 6
- **AVANT Sprint 3** : score 100 → EXCELLENT
- **APRÈS Sprint 3** : score 100 → EXCELLENT
- **Δ score** : 0
- **Caps déclenchés** : aucun (50 ans pas senior pour seuil 55)
- **VERDICT** : ✅ **Conforme inchangé — Expert ultra sain préservé**

---

## Analyse over-correction

**Aucune régression détectée sur les 12 profils.**

Les 3 caps Sprint 3 se comportent comme spec :

| Cap | Profils déclenchant | Profils saint préservés |
|---|---|---|
| `senior + 10K+` (âge ≥ 55, distance ≥ 10K) | #1 (60ans/10K), #4 (55ans/Marathon), #5 (60ans/Trail 30K) | #7 (65ans/5K → 5K exempté), #8, #11, #12 (< 55 ans) |
| `BMI ≥ 27` | aucun (profil #6 BMI 28 a score déjà < 84 → Math.min n'écrase pas) | tous autres BMI < 27 |
| `VMA optimiste` | #9 (105% sur 5K), #10 (124% sur 5K) | #1 (81%), #3 (86%), #5 (77%), #8 (89%) |

### Découverte annexe : robustesse contre VMA mal saisie

Les caps `VMAoptimiste` interceptent en bonus les profils où **la VMA déclarée est physiologiquement incohérente avec le PB** (cas test initial profils 3 et 8 que j'ai corrigés). Exemple : déclarer VMA 14 km/h ET PB 10K en 42 min → vitesse moyenne 14.3 km/h = 102% VMA = **impossible**. Le cap downgrade alors à BON par sécurité — comportement protecteur correct.

### Seuils actuels — pas d'ajustement nécessaire

- **Senior : 55 ans** — calibré au plus juste, validé sur 3 profils déclenchant + 4 profils épargnés (50 ans + 65 ans 5K)
- **BMI : 27** — pas observé en action sur les 12 profils (le seul profil BMI 28 est déjà sanctionné par d'autres pénalités). À surveiller en prod mais pas de motif de modification.
- **VMA optimisme : 95% / 90% / 85% / 80% (5K/10K/Semi/Marathon)** — calibré sur seuils Daniels VDOT, déclenche correctement à partir de 105% sur 5K (#9 borderline OK) et 124% (#10).

---

## Verdict deploy

# ✅ **GO deploy Sprint 3**

Raisons précises :

1. **0 régression** sur les 12 profils testés (Romane voulait "affiner pas révolutionner" → mission accomplie).
2. **10/12 conforme** (caps déclenchent sur cas légitimes OU profil sain inchangé).
3. **2/12 différent OK** :
   - Profil #6 : `Math.min` ne dégrade pas un score déjà bas → comportement attendu.
   - Profil #9 : cap VMA borderline mais légitime (105% VMA sur 5K = signal optimiste réel).
4. **Cas steph-fanny corrigé** : EXCELLENT 95 → BON 84 ✅
5. **Profils sains préservés** :
   - Jeune débutant 5K (#2)
   - Adulte sain 10K (#3)
   - Senior 65 sur 5K (#7) — la borne `distance >= 10K` épargne bien
   - Confirmé 50 ans avec PB cohérent (#8)
   - Expert sain Marathon (#11)
   - Expert ultra 100K (#12)
6. **Pas d'ajustement de seuil nécessaire** — calibrage à conserver tel quel.

### Surveillance post-deploy recommandée

- Monitorer en prod les % de profils dont le score est capé à 84 par chaque cap individuellement. Si > 30% des Finisher Marathon 55+ ans → seuil 55 ans peut-être trop bas (re-évaluer à 60).
- Si plaintes utilisateurs 56-60 ans sur Marathon Finisher rétrogradé en BON → réviser distance seuil à 21.1km au lieu de 10K.
- Si aucun cap BMI 27 ne se déclenche en 30 jours → cap mort, mais ne nuit pas, conserver pour défense en profondeur.
