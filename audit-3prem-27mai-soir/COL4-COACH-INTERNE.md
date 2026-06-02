# Audit Col 4 — Coach Interne — Plans générés 2026-05-27 (soir)

Source : `/tmp/audit-3prem-27mai-soir/all-plans-context.json` (6 plans).
Doctrines de référence : D1, D17, D18b, F-13/F-14/F-15, ZÉRO poids/IMC en wording user.
Note transversale : IMC et âge audités **en interne uniquement**, jamais cités dans messages aux utilisateurs.

---

## Plan `1779872965757` — terebeu@gmail.com

Marathon 4h30 — Confirmé — 55 ans — Homme — H192 / P108 — cv 40 — fréquence 5 — 16 sem.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 70 (BON) | Marathon Confirmé 4h30, VMA 12.85, théo 4h06 → marge 24min, plan 16 sem, cv 40 → cohérent | OK | — |
| feasibility.status | BON | théo 4h06 vs cible 4h30 = +9% → BON correct, pas EXCELLENT (âge 55 + IMC 29.3 abaissent) | OK | — |
| VMA calculée vs déclarée | 12.85 km/h (source 5K 24:35) | calcul Léger cohérent, pas d'ajustement manuel | OK | — |
| Allure cible (EF) vs VMA | 6:58/km = 8.61 km/h = 67% VMA | EF doctrinaire 65-70% VMA → OK | OK | — |
| cv (km/sem) | 40 | Marathon Confirmé ref 60-80, cv réel 40 sous-réf | Acceptable (entrée plan, montée vers pic 60) | — |
| Pic hebdo | 60 km | Marathon Confirmé 60-80 → bas du range | OK (sécuritaire vu âge 55 + IMC>27) | — |
| SL max projetée (~70% pic) | ~42 km (SL S13 estim. via pic 60) | ref 28-32 km Marathon Confirmé | **Risque dépassement** : SL projetée > ref FFA, à vérifier sur S10-S13 du plan complet | Auditer SL réelles S10-S13 dans plan-1779872965757.json |
| Cohérence Level vs cv | "Confirmé" + cv=40 | F-15 trigger si Intermédiaire/Confirmé + cv<30 → cv=40, **pas de trigger** | OK | — |
| BMI / Age (interne) | IMC 29.3, 55 ans | F-14 trigger si BMI>27 + age>50 → **DOUBLE trigger F-14** | safetyWarning bien présent (test effort, certif médical) | RAS — safety déjà en place |
| Affichage S1 | 5 séances, SL Dim 14 km / 98 min | S1 cap ratio ≈ cv → 7+9+10+14 = 40 km ✓ | OK (parfaite équivalence cv) | — |

**Synthèse** : Plan globalement BON et sécurisé, safetyWarning âge en place. **P0 : vérifier SL S10-S13** dans plan complet — si SL > 32 km, F-14 doit clamper à 30 km max (IMC 29.3 + 55 ans). **P1 : ajouter mention "marche active dans dernier 1/3 SL longues" dans welcomeMessage** pour cohérence avec safetyWarning.

---

## Plan `1779874303413` — noemie507@hotmail.com

Trail 10K 1h25 (D+349m) — Intermédiaire — 37 ans — Femme — H175 / P70 — cv 15 (avec D+500/sem actif) — fréquence 3 — 7 sem.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 55 (AMBITIEUX) | PB 1h20 plat + pénalité Minetti 5min → réf 1h28, cible 1h25 = gap 3min | OK | — |
| feasibility.status | AMBITIEUX | gap +3min sur référence Minetti, raisonnable | OK | — |
| VMA calculée vs déclarée | 8.33 km/h (source 10K 1h20) | conversion plat cohérente | OK | — |
| Allure cible (EF) vs VMA | 10:45/km = 5.58 km/h = 67% VMA | EF 65-70% → OK | OK | — |
| cv (km/sem) | 15 km + D+500m/sem | Trail court ref 30-50 km/sem mais profil "Intermédiaire" trail + D+ actif compense partiellement | **Sous-référentiel** (15 km route brut) mais doctrine plans <13 sem = charge allégée volontaire → OK | — |
| Pic hebdo | 17 km | Trail court ref 30-50 | Très bas mais plan 7 sem = volontaire (cf. doctrine courte durée) | — |
| SL max projetée | ~12 km (70% pic 17) | ref trail dépend D+, race = 10 km | OK (SL ≈ distance race) | — |
| Cohérence Level vs cv | "Intermédiaire" + cv=15 | F-15 trigger si Intermédiaire + cv<30 → **TRIGGER F-15** | cv=15 brut < 30, mais cv trail réel (avec D+) compense ; safetyWarning explicite la marge zéro | Justifié, RAS |
| BMI / Age (interne) | IMC 22.9, 37 ans | Pas de F-14 | OK | — |
| Affichage S1 | 3 séances : SL 5 km/55 min (200 D+), Footing 6.3 km, Renfo | cap ratio ok (5+6.3=11.3 vs cv 15) | OK | — |

**Synthèse** : Plan AMBITIEUX mais argumenté (référence Minetti explicitée + safetyWarning marge zéro). **P0 : ajouter D17 transparence opt-in front** car safety mentionne "pas de marge d'erreur" + plan 7 sem court — utiliser CTA opt-in plutôt qu'enrôlement automatique. **P1 : préciser dans welcomeMessage que pic 17 km/sem est volontairement faible** vu doctrine plans <13 sem allégés (transparence sur le sous-référentiel).

---

## Plan `1779892027140` — desbonnet.julien@gmail.com (Julien #2 — RE-GEN APRÈS PATCH)

Marathon Finisher — Intermédiaire — 42 ans — Homme — H170 / P90 — cv 15 — fréquence 4 — 21 sem.

**Contexte critique** : Julien a re-soumis son questionnaire **après** le patch du plan #1 (1779889214538, 46 ans). Différences clés :
- Age : 46 → **42** (rajeuni de 4 ans)
- PB 5K : 35min → **33min** (−2min)
- PB 10K : 1h10 → **1h08** (−2min)
- VMA calc plan #1 ≈ 9.0 → plan #2 9.66 (+0.66 km/h)

→ Modification questionnaire POST-PATCH = contournement des safeguards du plan #1.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 45 (RISQUÉ) | Marathon Finisher, cv 15, IMC 31.1 | **Cohérent — pas faux-positif F-13** car cv 15 < 30 minimum marathon | — |
| feasibility.status | RISQUÉ | cv 15 vs ref 40-50 (débutant prudent) + IMC 31.1 → **RISQUÉ légitime** | OK | — |
| VMA calculée vs déclarée | 9.66 km/h (moyenne 5K 33min + 10K 1h08) | calcul cohérent avec inputs modifiés | **À flagger** : VMA gonflée par inputs nouveaux | — |
| Allure cible (EF) vs VMA | 9:16/km = 6.47 km/h = 67% VMA | EF doctrinaire 65-70% → OK | OK | — |
| cv (km/sem) | 15 | Marathon débutant ref ≥30 → cv largement insuffisant | **CRITIQUE** (légitime RISQUÉ) | — |
| Pic hebdo | 29 km | Marathon Finisher ref 40-50 minimum | Très bas mais cohérent avec progression cv 15 → pic 29 (+93%) sur 21 sem | — |
| SL max projetée (~70% pic) | ~20 km | ref marathon 28-32 km | **Sous-dimensionnée** vs ref, mais cohérent vu profil RISQUÉ — pas de surcharge sécurité | OK (sécurité prime) |
| Cohérence Level vs cv | "Intermédiaire" + cv=15 | F-15 trigger si Intermédiaire + cv<30 → **TRIGGER F-15** | Légitime, status RISQUÉ déjà reflète | — |
| BMI / Age (interne) | IMC 31.1, 42 ans | F-14 partiel (BMI>27, age<50) → trigger BMI seul | safetyWarning mentionne "vigilance articulaire, amorti renforcé, surfaces souples" → OK | — |
| Affichage S1 | 4 séances : Footing 5.5 km, Renfo, SL 6.4 km, Footing vallonné 4.1 km | cap ratio 5.5+6.4+4.1 = 16 km ≈ cv 15 ✓ | OK | — |

**Synthèse PRIORITÉ MAX** : Plan RISQUÉ score 45 légitime (cv 15 + IMC 31.1 + objectif marathon Finisher) — **PAS faux-positif F-13**. **P0 BLOQUANT : appliquer les MÊMES safeguards que plan #1 patché ce soir** (marche/course S1-S6, pic clampé, requiresMedicalClearance=true, welcomeMessage enrichi avec mention "objectif Finisher, pas de chrono") — Julien a contourné via inputs modifiés. **P1 : ajouter détection back-end "même email re-gen <24h après patch RISQUÉ" → re-appliquer safeguards automatiquement** (anti-contournement). Action manuelle Romane : patcher ce plan #2 ce soir.

---

## Plan `1779898894672` — robineregina@gmail.com

10K Confirmé 1h15 — 47 ans — Femme — H170 / P80 — cv 20 — fréquence 4 — 16 sem — `isPreview: false`.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 5 (IRRÉALISTE) | 10K 1h15 = 7:30/km = 8 km/h. VMA brute 8.3 → 96% VMA. **MAIS** VMA déclarée ajustée à 10 → 80% VMA (faisable) | **FAUX-POSITIF F-13** : le score utilise VMA brute (8.3), pas VMA ajustée user (10) | Patcher logique feasibility : si vma_source contient "Ajustée manuellement", utiliser VMA ajustée pour scoring |
| feasibility.status | IRRÉALISTE | sur VMA 10 km/h, 1h15 = 80% VMA = AMBITIEUX au pire | **Sur-évalué négatif** | recalculer status sur VMA effective |
| VMA calculée vs déclarée | 8.3 calc → 10 ajustée manuellement (+20%) | écart +20% > tolérance ±10% | **Ajustement user excessif** (+20%) | Welcome devrait flagger : "Tu as ajusté VMA +20%, on calibre sur 10 mais préviens si trop dur S1-S2" |
| Allure cible (EF) vs VMA | 10:47/km = 5.56 km/h = **67% VMA brute (8.3)** ou 55% VMA ajustée (10) | EF 65-70% → utilise VMA brute, pas l'ajustée | **Incohérence interne** : score utilise VMA brute, allure aussi → l'ajustement user à 10 n'est PAS pris en compte côté allure | Clarifier : si user ajuste VMA, allures doivent suivre OU rejeter ajustement |
| cv (km/sem) | 20 | 10K Confirmé ref 40-60 → sous-réf | Acceptable (entrée plan, plan 16 sem) | — |
| Pic hebdo | 20 km | 10K Confirmé ref 40-60 | **Pic = cv** → aucune progression de volume, anormal | Vérifier pourquoi periodization plat 15-20 km tout du long |
| SL max projetée | ~14 km | ref 15-18 km SL 10K Confirmé | OK (en deçà ref) | — |
| Cohérence Level vs cv | "Confirmé" + cv=20 | F-15 trigger si Confirmé + cv<30 → **TRIGGER F-15** | Le label "Confirmé (Compétition)" est probablement sur-déclaré (cv 20 ≠ profil Compétition) | Flagger auto-réajustement Level si cv<30 + Confirmé |
| BMI / Age (interne) | IMC 27.7, 47 ans | F-14 partiel (BMI tout juste >27, age<50) | safetyWarning âge 47 présent | — |
| Affichage S1 | 4 séances : SL Dim 5.6 km/1h, Renfo, Footing prog 4.1 km, Footing 5 km | cap ratio 5.6+4.1+5 = 14.7 km < cv 20 | OK (légère sous-charge sécurité) | — |

**Synthèse** : Plan IRRÉALISTE score 5 = **FAUX-POSITIF F-13 partiel** — le scoring utilise VMA brute 8.3 alors que user a ajusté à 10. Sur VMA 10, 1h15 = 80% = AMBITIEUX, pas IRRÉALISTE. **P0 : patcher logique feasibility pour utiliser VMA effective (ajustée si présente, brute sinon) ET cohérence allures (idem source que score)** — sinon user a un plan stigmatisant IRRÉALISTE injustifié + allures qui ne suivent pas son ajustement. **P1 : déclencher D17 transparence opt-in front + warning "ajustement +20% détecté, recalibrer après S1-S2 si trop facile/dur"** — éviter que user croie son cas désespéré alors qu'il est juste AMBITIEUX. NB : pic=cv=20 sur 16 sem = anomalie périodisation à investiguer.

---

## Plan `1779900008615` — lucasducharlet@outlook.fr

10K Intermédiaire 40min — 23 ans — Homme — H174 / P75 — cv 20 — fréquence 3 — 16 sem — `isPreview: false`.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 5 (IRRÉALISTE) | 10K 40min = 4:00/km = 15 km/h. Sur VMA ajustée 13.4 → 112% VMA. Sur VMA brute 10.9 → 138% VMA | **Légitime IRRÉALISTE** sur les deux VMA — mais message incohérent (cf. plus bas) | — |
| feasibility.status | IRRÉALISTE | objectif 15 km/h > VMA 13.4 → impossible physiologiquement | OK | — |
| VMA calculée vs déclarée | 10.9 brute → **13.4 ajustée (+23%)** | écart +23% > tolérance ±10% | **Ajustement user excessif** (+23%) — pattern similaire à robineregina | — |
| Allure cible (EF) vs VMA | 8:12/km = 7.32 km/h = **67% VMA ajustée 13.4** ou 55% VMA brute 10.9 | EF 65-70% → utilise VMA **ajustée** ici (différent du plan robineregina où elle utilise la brute) | **Incohérence inter-plans** : ce plan utilise VMA ajustée pour allures, robineregina utilise VMA brute → bug logique | Standardiser logique VMA effective |
| cv (km/sem) | 20 | 10K Intermédiaire ref 25-35 (entre déb et conf) | OK proche ref | — |
| Pic hebdo | 15 km | 10K Intermédiaire ref 25-35 | **Pic < cv** (15 < 20) → **anomalie** : régression de volume tout au long du plan | Investiguer pourquoi pic=15<cv=20 |
| SL max projetée | ~10 km | ref 12-15 km | OK (en deçà) | — |
| Cohérence Level vs cv | "Intermédiaire" + cv=20 | F-15 trigger si Intermédiaire + cv<30 → **TRIGGER F-15** | Légitime mais 23 ans + cv 20 + Intermédiaire = profil tout début compétition | — |
| BMI / Age (interne) | IMC 24.8, 23 ans | Aucun F-14 | OK | — |
| Affichage S1 | 3 séances : SL 7.3 km/1h, Renfo, Footing 5.5 km | cap ratio 7.3+5.5 = 12.8 < cv 20 | OK | — |

**Incohérence message critique** : Le `message` feasibility dit "112% de ta VMA (13.4 km/h)" → utilise VMA ajustée. Le `welcomeMessage` dit "153% de ta capacité actuelle (10.9 km/h)" → utilise VMA brute. **Deux référentiels contradictoires dans le même plan**.

**Synthèse** : Plan IRRÉALISTE score 5 légitime (40min sur 10K est inatteignable même sur VMA gonflée à 13.4), MAIS **incohérence message vs welcome** (VMA 13.4 dans score, VMA 10.9 dans welcome). **P0 : aligner toutes les références VMA sur la même valeur (ajustée OU brute, jamais les deux dans le même plan)** + déclencher D17 transparence opt-in front. **P1 : flagger anomalie pic 15 < cv 20** dans periodization (régression de volume = bug). NB : 23 ans + Intermédiaire + VMA ajustée +23% = pattern "jeune ambitieux qui sur-estime VMA" — adapter wording welcome vers "on calibre sur ta VMA ajustée, recalibre si écart S1-S3".

---

## Plan `1779900993196` — thibaud.mathys@gmail.com

Marathon 3h10 — Expert (Performance) — 41 ans — Homme — H172 / P65 — cv 60 — fréquence 6 — 24 sem.

| Métrique | Valeur | Référentiel FFA | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 93 (EXCELLENT) | Marathon Expert 3h10, VMA 17.05, théo 3h06 → marge négative +4min (cible plus lente que théo) | **Légitime EXCELLENT** | — |
| feasibility.status | EXCELLENT | théo 3h06 < cible 3h10 (cible plus prudente) | OK | — |
| VMA calculée vs déclarée | 17.05 km/h (10K 39:30 + Semi 1h26) | calcul Léger sur les deux PB cohérent | OK | — |
| Allure cible (EF) vs VMA | 5:15/km = 11.43 km/h = 67% VMA | EF 65-70% → OK | OK | — |
| cv (km/sem) | 60 | Marathon Expert ref 60-80 | OK bas du range | — |
| Pic hebdo | 90 km | Marathon Expert/Élite ref 80-110 | **OK haut du range Expert**, dans Élite | OK (profil 39:30 sur 10K justifie) |
| SL max projetée (~70% pic) | ~30-32 km (SL S10-S18 estim. sur pic 90) | ref 30-35 km Expert/Élite | OK | — |
| Cohérence Level vs cv | "Expert" + cv=60 | F-15 NON-trigger (cv≥30 et Expert) | OK | — |
| BMI / Age (interne) | IMC 22.0, 41 ans | Aucun F-14 | OK | — |
| Affichage S1 | 6 séances : Footing 11.5, Footing+LD 8.6, Renfo, Footing vallonné 10.1, Récup 8, SL 21.8 | cap ratio 11.5+8.6+10.1+8+21.8 = 60 km = cv 60 ✓ | **Parfait** | — |

**Synthèse** : Plan EXCELLENT cohérent — profil Expert authentique (PB 10K 39:30 + Semi 1h26 → VMA 17 réelle), cv 60 → pic 90 progression saine sur 24 sem, SL S1 21.8 km déjà à 36% de marathon (calibrage Expert). **P0 : RAS, plan robuste**. **P1 (cosmétique) : envisager d'enrichir welcomeMessage avec mention "fenêtre 88-92 km au pic, on calibrera selon ton ressenti S6-S10"** — transparence sur la latitude haute volume. NB : safetyWarning générique (hydratation/échauffement) → suffisant vu absence de F-14 et profil performant.

---

## Synthèse transversale (6 plans)

**Patches P0 prioritaires (action ce soir / cette semaine)** :
1. **Plan #3 Julien (1779892027140)** — appliquer manuellement les MÊMES safeguards que plan #1 patché ce soir (marche/course, requiresMedicalClearance, welcome enrichi). Anti-contournement via re-gen.
2. **Plans #4 robineregina + #5 lucasducharlet** — bug logique VMA effective : standardiser une source unique (ajustée prioritaire) pour score + allures + welcomeMessage. Faux-positif IRRÉALISTE sur #4.
3. **Plan #3 + #4 + #5** — déclencher D17 transparence opt-in front sur tout status RISQUÉ ou IRRÉALISTE.

**Patches P1 (sprint prochain)** :
- Détecter back-end "même email re-gen <24h après patch RISQUÉ/IRRÉALISTE" → ré-appliquer safeguards (anti-contournement Julien-like).
- Investiguer périodisation : plans #4 (pic=cv=20) et #5 (pic 15 < cv 20) = régression de volume sur 16 sem → vérifier algo periodization sur petits volumes.
- F-15 trigger ferme sur Confirmé/Intermédiaire + cv<30 : 3 plans concernés (Noemie, Julien, Robine, Lucas) — déjà appliqué partiellement, à systématiser dans wording welcome.

**Plans propres (aucun patch)** :
- Plan #1 terebeu (BON, safety âge 55 en place — vérifier SL S10-S13 quand même).
- Plan #6 thibaud.mathys (EXCELLENT, profil Expert authentique).

Audit terminé — 0 mention poids/IMC/minceur dans tout wording proposé. Audit interne uniquement.
