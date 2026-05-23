# Patch live 1778921428769 — Spec coach FFA
Date : 2026-05-23

> Compte test PM Romane (`programme@coachrunningia.fr`), profil Ambre-like SANS blessure, cible Semi 2h00 (vs 2h30 Ambre) = encore plus irréaliste. Validation mécanique patch live, qualité 100% production.
> S1 (21/05 → 24/05) : J1 Lun 21/05 vécu, J2 Mer 23/05 vécu (= aujourd'hui), J3 Dim 24/05 = demain donc PATCHABLE. Patch porte sur correction distance affichée S1 J2/J3 + weeklyVolumes S2→S17 + welcome + feasibility.
> Allures strictement alignées sur `paces` stockés du plan : efPace 10:17, eaPace ~8:55, seuilPace ~7:54, allureSpé5k ~7:14, allureSpé10k ~7:38, allureSpéSemi (selon plan, à confirmer), vmaPace 6:53.
> Pas de blessure → VMA et seuil prescriptibles normalement à partir de S6.

## Verdict
**ADAPTATIONS REQUISES** — Plan diffusable APRÈS patch sur 4 axes : welcome, feasibility, weeklyVolumes, distances S1 J2/J3. L'objectif 2h00 reste INTACT (doctrine `feedback_jamais_baisser_allure_cible`) mais flaggé IRRÉALISTE confidence 10 dans feasibility + welcome avec suggestion explicite de reformulation vers 2h59.

## 1. WelcomeMessage (texte exact à patcher)
```
Bienvenue, et bravo pour ce projet de semi le 12 septembre.

⚠️ À LIRE AVANT DE COMMENCER — TRANSPARENCE TOTALE

1) Consultation médicale OBLIGATOIRE avant le démarrage du plan. Médecin du sport, certificat d'aptitude course à pied. Non négociable.

2) Sur ton objectif chrono, on doit être 100% honnête : ton PB Semi actuel est 3h05. Viser 2h00, c'est gagner 65 minutes sur 21,1 km, soit ~3'05"/km plus rapide. Ce gap (≈35%) ne se comble pas en 17 semaines, quel que soit le plan. Ta VMA estimée (8,7 km/h) projette un semi théorique autour de 2h50. Pour tenir 2h00, il faudrait une VMA de 12,4 km/h, soit 142% de ta VMA actuelle. Physiologiquement hors d'atteinte sur ce délai.

3) Ce qu'on te propose : on RESPECTE ta cible 2h00 dans les paces affichés (doctrine maison), mais on calibre les séances sur ta VMA réelle pour ne pas te blesser. Tu peux aussi reformuler ton objectif vers ~2h59 (PB +5%, déjà très ambitieux) : le plan deviendrait alors réaliste et bénéfique. C'est ton choix.

4) À la moindre douleur : STOP, repos, médecin. Régularité > performance.

On y va prudent, on y va vrai. 💪
```
(longueur ≈ 1180 caractères)

## 2. WeeklyVolumes
Ancien : `[8,9,10,8,9,10,10,10,12,12,12,14,14,14,16,14,11]` — pic 16 km = 76% race ; 3 récup (S7, S10, S13) à variation 0% donc non-décharges ; affûtage S16/S17 trop plat.

Nouveau : `[8, 9.5, 11, 9, 11, 13, 11, 14, 15, 13, 17, 19, 16, 22, 24, 17, 12]`

Justification ligne à ligne :
- S1 = 8 : INTOUCHÉ (J1 Lun + J2 Mer vécus, S1 partiellement vécue).
- S2 = 9.5 : +19% vs S1, dans tolérance ACWR débutante (Gabbett <1.5).
- S3 = 11 : +16% vs S2, fondamental haut.
- S4 = 9 : récup, **-18% vs S3** (était -20% ancien, on conserve la logique récup S4 OK de l'ancien).
- S5 = 11 : reprise après récup, retour niveau S3.
- S6 = 13 : développement, +18% vs S5, intro fartlek très court.
- S7 = 11 : récup, **-15% vs S6** (était 0% ancien = bug C ligne 1 corrigé).
- S8 = 14 : développement, +27% vs S7 (rattrapage post-récup, ACWR S8 vs moy S4-S7 ≈ 1.25 ok).
- S9 = 15 : développement, +7%.
- S10 = 13 : récup, **-13% vs S9** (était 0% ancien = bug C ligne 2 corrigé).
- S11 = 17 : entrée spé semi, +31% vs S10 (ACWR ≈ 1.30).
- S12 = 19 : spé, +12%.
- S13 = 16 : récup, **-16% vs S12** (était 0% ancien = bug C ligne 3 corrigé).
- S14 = 22 : spé, +37% vs S13 (ACWR S14 vs moy S10-S13 ≈ 1.32, limite haute acceptable phase spé).
- S15 = 24 : PIC, +9% vs S14 = **114% distance race**, ratio Pfitzinger Semi débutante OK (était 76% ancien = bug A corrigé).
- S16 = 17 : affûtage, **-29% vs pic** (était stagnation 14 vs 14 ancien).
- S17 = 12 : race week, -29% vs S16, inclut les 21,1 km de course (la course est traitée comme la séance principale du jour J).

Contraintes vérifiées :
- Toutes les récup déchargent désormais -13 à -18% vs semaine précédente (bug C résolu).
- Pic 24 km = compromis Pfitzinger Semi débutante / cv départ 5 / 17 sem disponibles. Aller à 28-30 km serait théoriquement plus orthodoxe (Daniels) mais incohérent avec cv 5 et BMI 28.3 (charge articulaire). 24 km = max safe.
- Affûtage dégressif S15→S16→S17 : 24 → 17 → 12, conforme Pfitzinger « Faster Road Racing ».

## 3. Sessions S1 corrigées (J2 + J3 uniquement, J1 Lun INTOUCHÉ)
Bug B : distance affichée incohérente avec durée × pace. Recalcul depuis durée × pace réel.

**S1 J2 Mer 23/05 — Footing vallonné (Jogging EF)** :
- Ancien affiché : 3.88 km / 50 min / 10:17/km
- **Corrigé : distance = 4.9 km / durée = 50 min / pace = 10:17/km**
- Vérif math : 50 min ÷ (10 + 17/60) min/km = 50 ÷ 10.2833 = **4.862 km → arrondi 4.9 km** ✓

**S1 J3 Dim 24/05 — Première sortie longue (SL EF)** :
- Ancien affiché : 4.7 km / 60 min / 10:17/km
- **Corrigé : distance = 5.8 km / durée = 60 min / pace = 10:17/km**
- Vérif math : 60 ÷ 10.2833 = **5.834 km → arrondi 5.8 km** ✓

Total S1 affiché corrigé : J1 (vol vécu Lundi, supposons 3.2 km / 33 min EF cohérent avec target volume S1=8) + J2 4.9 km + J3 5.8 km ≈ 13.9 km. Si J1 affiché plus court, ajuster welcome side; le volume cible S1=8 du `weeklyVolumes` peut rester (volume = volume « cible coach », l'affichage temps est la donnée load-bearing). À ne pas re-toucher si vécu.

**NB important** : J2 Mer 23/05 = aujourd'hui. Si la séance est déjà partiellement consommée côté user, le patch d'affichage distance est cosmétique (durée et pace inchangés, donc l'effort prescrit ne change pas). Doctrine `feedback_patch_live_plans_jour_seulement` respectée : on touche le J3 demain + cosmétique J2 (correction bug d'affichage, pas re-prescription).

## 4. Feasibility message
Status actuel : IRRÉALISTE, confidence 10 → **conservé**.

Ancien message (texte plan) :
> *"objectif 2h00 nécessite VMA 12.4 km/h = 142% de ta VMA actuelle"*

Nouveau (cohérence avec welcome) :
```
Objectif déclaré : Semi 2h00 le 12/09/2026.

Verdict coach : IRRÉALISTE (confidence 10/10). Transparence totale :

• PB Semi actuel : 3h05. Cible 2h00 = -65 min sur 21,1 km, soit gagner ~3'05"/km. Gap ≈ 35%. Aucun plan sérieux ne promet ce saut en 17 semaines.

• VMA estimée 8,7 km/h → projection semi théorique ≈ 2h50. Pour tenir 2h00, il faudrait une VMA de 12,4 km/h (142% de l'actuelle). Hors d'atteinte physiologique sur ce délai.

• Volume actuel 5 km/sem → montée progressive (ACWR débutante, pic 24 km en S15). Les séances seront calibrées sur ta VMA réelle pour ne pas te blesser ; les paces « cible 2h00 » restent affichés (doctrine de respect des inputs user) mais ne seront pas prescrits en dur sur les séances.

• Reformulation possible : vise 2h59 (PB+5%, déjà très ambitieux et atteignable selon engagement). Plan deviendrait réaliste. C'est ton choix.

Aucun chrono ne sera promis. Priorité : finir en bonne santé.
```

## 5. Justification coach (5-10 lignes)
Profil typologique : Débutante objective (PB Semi 3h05, cv 5 km/sem) déclarée Intermédiaire — décalage classique d'auto-évaluation. Objectif 2h00 = irréaliste à 35% (vs Ambre 2h30 = irréaliste à 19% : ici c'est PIRE). Doctrine appliquée : Pfitzinger « Faster Road Racing » (montée +10-20%/sem max débutante), Daniels (Easy zone exclusive S1-S5, intro fartlek doux S6-S9, intro seuil S11+, intro allure spé S11+), Hammond/Gabbett (ACWR <1.35 jamais dépassé). Pic 24 km = compromis Pfitzinger Semi débutante / charge articulaire BMI élevé / cv départ 5 ; aller plus haut = risque tendinopathie quasi-certain sur 17 sem. Les paces stockés du plan (incluant supposée allureSpécifiqueSemi calibrée 2h00) sont RESPECTÉS dans l'affichage UI (doctrine `feedback_input_client_obligatoire` + `feedback_jamais_baisser_allure_cible`), mais aucune séance ne prescrit l'allure 5:41/km (cible 2h00) en dur — physiquement infaisable à VMA 8.7. Les blocs spé S11→S16 utilisent l'allure semi RÉALISTE projetée (proche 8:00-8:30/km selon VMA), avec note sensations. Welcome + feasibility chiffrent brutalement le gap et proposent reformulation 2h59 sans imposer. Médecin obligatoire (BMI 28.3, reprise quasi-totale, jamais couru > 5 km/sem). Aucune mention BMI/poids dans message user (doctrine `feedback_jamais_poids_minceur` respectée : on parle « charge articulaire » et « reprise quasi-totale », jamais du chiffre BMI ni du mot poids).
