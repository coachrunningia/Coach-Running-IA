# Synthèse cross-experts — 6 plans 27/05/2026

Format demandé Romane : Col1 Freelance externe · Col2 Inputs contexte · Col3 Coach FFA externe (challenge) · Col4 Coach interne (chiffres précis).

---

## 🔴 Plan 1 — `1779892027140` desbonnet.julien (Marathon) — CRITIQUE P0

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| 🔴 **Dangereux** : pic 29 km insuffisant marathon | H 42a 170/90 (IMC 31.1) Intermédiaire — Marathon Finisher — cv **15** freq 4 — VMA 9.66 (PB 5K 33min + 10K 1h08) — race 25/10 — start 01/06 — comments "matin" | "Mode marche-course S1 défendable sur ce profil. **Re-gen post-patch** plan #1 1779889214538 → user a modifié inputs (46→42a, PB améliorés cv 7→15) pour contourner safeguards. À re-flagger." | RISQUÉ 45 **légitime** (cv 15 + IMC 31.1 marathon Finisher) — **PAS faux-positif F-13**. SL projetée ~20 km vs ref 28-32 marathon = sous-dim sécurité. **TRIGGER F-15** (Intermédiaire + cv<30). PIC 29 ↘ FFA 40-50 |

**🚨 ACTION P0 — re-paque & re-applique safeguards** (manuelle ce soir) :
- `userId` → `_PAUSED_SAFETY_*` (même mécanisme que Julien #1)
- Appliquer welcomeMessage v.B (semi recommandé) + safetyWarning enrichi + score 32 + `requiresMedicalClearance: true` + S1-S6 marche/course
- Romane → contacter Julien pour expliquer pourquoi on patche aussi cette version

**P1 backlog** : détection back-end « même email re-gen <24h après patch RISQUÉ/IRRÉALISTE » → re-applique safeguards auto.

---

## 🔴 Plan 2 — `1779898894672` robineregina (10K) — FAUX-POSITIF F-13

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| 🔴 **Dangereux** : VMA ajustée manu + objectif infaisable | F 47a 170/80 (IMC 27.7) Confirmé — 10K target **1h15** (7:30/km très lent) — cv 20 freq 4 — VMA 10 **ajustée 8.3→10** (+20%) — race 27/12 — `isPreview: false` Premium | "Ajustement VMA +20% > tolérance ±10%. Status IRRÉALISTE et allures utilisent **VMA brute 8.3** → user voit IRRÉALISTE alors qu'il a poussé sa VMA à 10. Logique incohérente." | **FAUX-POSITIF F-13** : score 5 calculé sur VMA brute (8.3 → 96% VMA = IRRÉALISTE). Sur VMA ajustée 10 → 80% = AMBITIEUX. Pic=cv=20 sur 16 sem = **anomalie périodisation** (0 progression volume). TRIGGER F-15 (Confirmé + cv<30) |

**🟡 ACTION P0 — patch live + fix code** :
- Patch plan live : recalculer feasibility sur VMA effective (ajustée si présente) → score 50-55 AMBITIEUX
- Fix code `geminiService.ts` ou `feasibility.ts` : standardiser source unique VMA (ajustée prioritaire) pour score + allures + welcomeMessage
- Investiguer périodisation : pourquoi pic=cv=20 sur 16 sem (pas de montée en charge)

---

## 🔴 Plan 3 — `1779900008615` lucasducharlet (10K) — INCOHÉRENCE MESSAGE

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| 🔴 **Dangereux** : 96% VMA soutenu = impossible | H 23a 174/75 (IMC 24.8) Intermédiaire — 10K target **40min** (4:00/km) — cv 20 freq 3 — VMA 13.4 **ajustée 12.9→13.4** (+4%) ou 10.9 (brute ?) — race 27/09 — `isPreview: false` Premium | "Ajustement +4% acceptable, MAIS la VMA brute calculée est 10.9 (PB ?) qui apparaît dans welcomeMessage. Pic 15 < cv 20 = **régression de volume** sur 16 sem = bug." | **IRRÉALISTE 5 légitime** (40min/10K = 15 km/h > VMA 13.4). MAIS **`message` cite VMA 13.4 et `welcomeMessage` cite VMA 10.9 → deux référentiels contradictoires**. Pic 15 < cv 20 = régression anormale |

**🟡 ACTION P0 — patch live wording cohérence** :
- Patch live `message` + `welcomeMessage` : aligner sur **VMA ajustée 13.4** (référentiel unique)
- Wording welcomeMessage : "objectif 40min très ambitieux même avec VMA 13.4 ; sur 16 sem on vise 42-43min réaliste ; recalibre après S1-S2"
- D17 opt-in front si IRRÉALISTE
- Fix code périodisation : pic ≥ cv obligatoire (jamais régression volume)

---

## ⚠️ Plan 4 — `1779872965757` terebeu (Marathon) — VIGILANCE BUG VMA

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| ⚠️ Suspect : pic 60 km tout juste pour H55 IMC 29 + marathon | H **55a** 192/108 (IMC **29.3**) Confirmé Compétition — Marathon 4h30 — cv 40 freq 5 — VMA 12.85 (PB 5K **24:35**) — race 25/10 — preview | "**BUG VMA** : 24:35 / 5K = 4:55/km → VMA Riegel ≈ 14, pas 12.85. Sous-estime probablement le potentiel. **Mode marche-course S1 sur Confirmé Compétition = hors scope doctrine** (marche/course = Débutants only). SL S1 14 km OK." | BON 70 légitime — théo 4h06 vs cible 4h30 marge +9% (sécurité 55a + IMC>27). **F-14 DOUBLE TRIGGER géré** (safetyWarning âge + certif médical en place). **À vérifier : SL S10-S13 — si >32 km, clamper** (IMC 29.3 + 55 ans) |

**🟡 ACTION P1 — investiguer + monitorer** :
- Debug formule VMA depuis PB 5K — 24:35 doit sortir VMA 14, pas 12.85 (impacte toute la cohorte avec PB 5K)
- Retirer mode marche-course S1 si level ≥ Intermédiaire (doctrine scope)
- Vérifier SL S10-S13 dans plan complet — clamp si > 32 km

---

## ✅ Plan 5 — `1779874303413` noemie507 (Trail 10K)

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| ✅ OK — feasibility message excellent, 7 sem courtes | F 37a 175/70 (IMC 22.9) Intermédiaire — Trail 10K target 1h25 — cv 15 freq 3 — VMA 8.33 (PB 10K plat 1h20) — race 15/07 — 7 sem | "AMBITIEUX bien argumenté (réf Minetti 1h28 vs cible 1h25). EF 10:45/km dans clous Daniels. Manque PPS côtes S3-S5 à vérifier. lundi imposé au-delà de préférence Mercredi → expliciter welcome." | AMBITIEUX 55 cohérent. TRIGGER F-15 (cv 15 < 30 Intermédiaire) mais justifié par doctrine plans <13 sem allégés. SL ~12 km cohérent race 10K. **RAS** |

**🟢 ACTION P1 cosmétique** :
- D17 opt-in front car AMBITIEUX + plan court 7 sem
- Welcome : expliciter pic 17 km/sem volontairement bas vu doctrine plans courts + jour Lundi pourquoi ajouté
- Check-in S2 pour ajuster si surcharge/sous-stim

---

## ⭐ Plan 6 — `1779900993196` thibaud.mathys (Marathon Expert)

| Col 1 Freelance | Col 2 Inputs | Col 3 Coach FFA externe | Col 4 Coach interne |
|---|---|---|---|
| ✅ OK — "plan de manuel", cohérent | H 41a 172/65 (IMC 22.0) Expert Performance — Marathon 3h10 — cv 60 freq 6 — VMA 17.05 (PB 10K 39:30 + Semi 1h26) — race 08/11 — 24 sem | "Profil Expert authentique. Pic 90 km bon haut du range. SL S1 21.8 km = 36% marathon = calibrage Expert. RAS majeur. Cosmétique : envisager pic 95-100 si feedback Expert demande." | EXCELLENT 93 légitime. Théo 3h06 vs cible 3h10 (marge prudente). Pic 90 dans range Expert/Élite (80-110). SL projetée 30-32 km OK. Aucun F-trigger. **PLAN PARFAIT** |

**🟢 ACTION** : RAS, plan robuste.

---

## 📊 Patterns transverses détectés (Freelance + FFA + Interne convergents)

| Pattern | Plans concernés | Sévérité | Action |
|---|---|---|---|
| **Bug VMA cascade** (formule, ajustée vs brute, message vs welcome) | terebeu, robineregina, lucasducharlet | 🔴 P0 | Fix code feasibility + welcome (référentiel VMA unique) |
| **Allures EF sous-calibrées 65% VMA** (au lieu 70-75%) | terebeu, noemie, julien #2 | 🟡 P1 | Doctrine Daniels : EF 70-75% VMA standard, pas 65% |
| **Re-gen post-patch contournement safeguards** (F-15 dérivé) | julien #2 | 🔴 P0 | Détection back-end re-gen <24h |
| **Mode marche-course S1 hors scope Débutants** | terebeu (Confirmé), julien #2 (Intermédiaire) | 🟡 P1 | Gate `level === 'Débutant'` strict |
| **VMA ajustée >+10%** (tolérance dépassée non flagguée) | robineregina (+20%), lucasducharlet (+4% acceptable mais brute 10.9 utilisée ailleurs) | 🔴 P0 | Welcome warning + recalibrage S1-S2 |
| **Plans IRRÉALISTES/RISQUÉS générés sans D17 opt-in front** | julien #2, robineregina, lucasducharlet | 🔴 P0 | F-16bis Sprint G modal double-confirmation |
| **Pic ≤ cv** (régression volume sur plan long) | robineregina (pic=cv=20 sur 16 sem), lucasducharlet (pic 15 < cv 20) | 🟡 P1 | Fix périodisation : pic ≥ cv obligatoire |
| **F-14 BMI>27 + age>50** | terebeu (DOUBLE trigger géré) | 🟢 | Déjà géré, valider |
| **F-15 Intermédiaire/Confirmé + cv<30** | noemie, julien #2, robineregina, lucasducharlet | 🟡 P1 | Soft-flag wording transparence |
