# COL3 — COACH FFA EXTERNE V3 (audit 28 mai — Plans #5 Trail 100K + #6 Semi 2h00)

**Posture** : Coach FFA 25a route+trail+débutants. Mission : challenger freelances, focus volumes hebdo + D+ progression + pic + adaptation allure montée (sujets Romane), vérifier que l'app gère IRRÉALISTE 5 %.
Doctrines : input client immuable (cv/raceDate/freq/allure), pas poids/IMC dans wording user, on génère TOUJOURS même IRRÉALISTE, D16 trail Cory Smith.

---

## PLAN #5 — raph.courjault (Trail 100K/4500m, Nantes, Expert) — 1779985567416

H 39a Expert VMA 15.24, cv 50 km/sem 500m D+, freq 5, 21 sem. PB route solides (M 3h32). Feas AMBITIEUX 60.

### Arbitrage avis freelance

| # | Avis freelance #5 | Verdict FFA | Justification chiffrée |
|---|---|---|---|
| 1 | Allure 5:53 demandée en montée = absurde | **CONTESTÉ — faux-positif** | Le mainSet Jeudi dit littéralement : *"5:53 en référence sur le plat, la vitesse baisse en côte c'est normal"*. Et Mardi : *"tu laisses la vitesse fluctuer avec le terrain"*. La consigne EXISTE dans mainSet, conforme D16 + doctrine `feedback_d18b`. Le freelance a lu `targetPace` sans ouvrir mainSet. Code OK. |
| 2 | D+ hebdo "invisible" | **CONTESTÉ — faux-positif** | `weeklyElevationTarget` existe (21 valeurs : 675→3926). C'est juste pas affiché dans la vue séance UI ; mais la donnée est là côté plan et utilisée par génération. Demande UI (afficher D+ hebdo dans WeeklyOverview), pas un défaut de plan. |
| 3 | Enchaînement Ven Renfo excentrique + Sam EF + Dim SL = destructeur | **VALIDÉ partiellement** | Réel risque musculaire Expert + Trail : renfo excentrique lourd (squats excentrique 4s, step-down excentrique, Bulgare 3×10) déclenche DOMS J+24 à J+48 → Sam touché → Dim SL avec D+ sur fibres pré-lésées. Litt. trail (Millet, Hoffman) : excentrique J-3 minimum avant SL D+. **Action : déplacer Renfo en Mar/Mer OU alléger composante excentrique en S avec SL D+ marquée**. PAS un blocage S1 (S1 D+ Dim = 439m, raisonnable), mais à corriger à partir de S9 (SL Dim avec D+ > 1500m). |

### Focus volumes hebdo + D+ progression (sujets Romane)

Cv user : 50 km/sem + **500m D+/sem**. Pic course : 100 km / 4500m D+ (45 m/km).

| S | Vol km | ΔVol% | D+ m | ΔD+% | D+/km | Phase | Δ vol vs cv | Δ D+ vs cv |
|---|---|---|---|---|---|---|---|---|
| 1 | 50 | — | 675 | — | 13 | fond | =cv | +35% |
| 2 | 53 | +6% | 866 | **+28%** | 16 | fond | +6% | +73% |
| 3 | 55 | +4% | 1058 | **+22%** | 19 | fond | +10% | +112% |
| 4 | 43 | -22% | 687 | -35% | 16 | récup | -14% | +37% |
| 5 | 49 | +14% | 1440 | **+110%** | 29 | fond | -2% | ×2.9 |
| 6 | 56 | +14% | 1631 | +13% | 29 | fond | +12% | ×3.3 |
| 7 | 64 | +14% | 1823 | +12% | 29 | déve | +28% | ×3.6 |
| 8 | 51 | -20% | 1108 | -39% | 22 | récup | +2% | ×2.2 |
| 9 | 59 | +16% | 2205 | **+99%** | 37 | déve | +18% | ×4.4 |
| 10 | 68 | +15% | 2396 | +9% | 35 | déve | +36% | ×4.8 |
| 11 | 75 | +10% | 2588 | +8% | 35 | déve | +50% | ×5.2 |
| 12 | 60 | -20% | 1528 | -41% | 25 | récup | +20% | ×3.1 |
| 13 | 69 | +15% | 2970 | **+94%** | 43 | déve | +38% | ×5.9 |
| 14 | 75 | +9% | 3161 | +6% | 42 | spéc | +50% | ×6.3 |
| 15 | **79** | +5% | 3353 | +6% | 42 | spéc | **+58%** | ×6.7 |
| 16 | 63 | -20% | 1949 | -42% | 31 | récup | +26% | ×3.9 |
| 17 | 72 | +14% | 3735 | **+92%** | 52 | spéc | +44% | ×7.5 |
| 18 | 75 | +4% | **3926** | +5% | 52 | spéc | +50% | **×7.85 pic** |
| 19 | 53 | -29% | 2883 | -27% | 54 | affût | +6% | ×5.8 |
| 20 | 46 | -13% | 2155 | -25% | 47 | affût | -8% | ×4.3 |
| 21 | 40 | -13% | 1800 | -16% | 45 | affût | -20% | ×3.6 |

**Lecture coach FFA route+trail** :

- **Volumes** : pic 79 km = +58 % cv. Référentiel trail long (Millet, Hoffman, Roche) tolère +60 à +80 % cv chez Expert avec cv ≥ 50 et fenêtre 21 sem. **Sain.** Sauts hebdo ≤ +16 % (sauf récup) = règle 10 % respectée à la maille macro (les +14/+16 % sont juste après récup -20 %, soit retour au niveau précédent +5 %, normal). **RAS sur volumes.**
- **D+** : **C'EST ICI QUE ÇA COINCE — mais pas où le freelance le voit.** Le pattern est : récup tous les 4 semaines puis **rebond +90 à +110 %** (S4→S5 : +110 %, S8→S9 : +99 %, S12→S13 : +94 %, S16→S17 : +92 %). C'est la signature d'un cycle 3+1 OK sur volumes mais sur D+ ces rebonds sont **musculairement violents** : passer de 1100m à 2200m en 1 sem = 2× la charge excentrique en descente. Réf. Easthope et al. 2010 : DOMS post-trail corrélés au D+ négatif, fenêtre adaptation tissulaire fibres rapides quadri = 10–14 j. Un saut ×2 chaque cycle = ré-éclatement à chaque rebond.
- **Pic D+ 3926m en S18** = 87 % de la course (4500m). **Sain** (réf. trail Expert : pic SL D+ entre 75–90 % course). Le pic en SOI n'est pas critique. **Le critique c'est la TRAJECTOIRE pour y arriver**, avec ces rebonds +90 % toutes les 4 sem.
- **D+/km** : passe de 13 m/km (S1) à 52 m/km (S17/S18) = match parfait course (45 m/km). Spécificité correcte. ✅
- **Cohérence vol/D+ par phase** : fondamental 13–29 m/km (route+vallon doux) ✅ / développement 22–37 m/km (vallon ↑) ✅ / spécifique 30–54 m/km (course-like) ✅. Logique de périodisation propre.

**Verdict volumes/D+** : volumes parfaits. **D+ : trajectoire à lisser sur les rebonds post-récup**. Au lieu de récup→×2, viser récup→×1.5 max, soit S5 = 1700m (pas 1440 c'est déjà OK, mais S9 devrait être ~1700m pas 2205, S13 ~2300m pas 2970, S17 ~2900m pas 3735). Le freelance a flairé un truc mais l'a mal nommé : ce n'est pas "D+ invisible", c'est "rebonds D+ post-récup trop violents".

### Bug réels code à corriger

- **P0 — Lisser rebonds D+ post-récup** : dans `weeklyElevationTarget`, après une semaine recovery, capper le rebond à **+50 % max** (pas +100 %). Réf. ACSM masters/trail tissue adaptation. Touche `periodizationPlan.weeklyElevationTarget` génération côté `trailVolumesService`/équivalent.
- **P1 — Déplacer Renfo excentrique** : à partir de S9 (SL D+ > 1500m), forcer Renfo en Mar/Mer pour laisser 72h avant SL. Schéma cible Expert trail S9+ : Mar EF / Mer Renfo / Jeu vallon / Ven repos / Sam EF / Dim SL D+. À cadrer côté `weekTemplate` trail.
- **P2 — Afficher D+ hebdo dans UI** : remonter `weeklyElevationTarget[i]` dans WeeklyOverview à côté du volume km. Évite le faux-positif freelance, et aide user à monitorer.

### Verdict final Plan #5
Plan **trail Expert structurellement solide**, calibration paces+terrain conforme doctrine (D16, D18b, mainSet montée). 2 freelances/3 = faux-positifs (non-lecture mainSet, non-lecture `weeklyElevationTarget`). **Le seul vrai sujet, c'est les rebonds D+ post-récup +90/+110 %**. P0 = lisser ces rebonds. La S1 est OK telle quelle (D+ Dim 439m, mainSet montée conforme), pas de patch live S1 requis.

---

## PLAN #6 — menot.cyrielle (Semi 2h00, Toulouse) — 1779986074728

H 43a Inter (Régulier), VMA 10.55, **cv 2 km/sem**, freq 3, 20 sem, PB Marathon 5h00. Target 2h00 sur Semi = **5:41/km = 100 % VMA**. Feas IRRÉALISTE 5.

### Arbitrage avis freelance

| # | Avis freelance #6 | Verdict FFA | Justification |
|---|---|---|---|
| 1 | Générer malgré IRRÉALISTE 5 = incohérent, "jeter le plan" | **CONTESTÉ — méconnaissance doctrine app** | Doctrine projet explicite (`feedback_securite_avant_conversion`, D17) : on **génère TOUJOURS**, transparence + opt-in, jamais blocage. Ce n'est pas un bug, c'est un choix produit assumé. Le freelance ignore la doctrine. |
| 2 | S18 = 12 km TOTAL → impossible de préparer 21.1 km | **VALIDÉ — alerte chiffrée correcte** | Pic SL S19 ≤ 10 km (sur 14 km/sem). Référentiel Semi : pic SL ≥ 16–18 km (75–85 % distance course) OU pic SL durée ≥ 1h45. Ici on plafonne à 10 km / ~85 min. **Sous-préparation distance objective.** Mais : c'est la conséquence DIRECTE de cv=2, doctrine `feedback_input_client_obligatoire` interdit de gonfler artificiellement. Cohérent avec choix de sous-calibrer plans courte durée + IRRÉALISTE. |
| 3 | Allure Semi 5:41 = 100 % VMA impossible / re-calibrer Seuil 6:32 | **CONTESTÉ — doctrine `jamais baisser allure cible`** | L'allure 5:41 est calculée depuis target 2h00 user. Doctrine D1 : on ne touche JAMAIS l'allure cible chrono. C'est welcomeMessage + feas.message + modal warning qui préviennent. Allure code = inchangeable. ✅ |

### Cas critique cv=2 + target 2h00 + IRRÉALISTE 5 — comment l'app gère ?

**3 niveaux d'alerte** déjà en place, vérifiés sur ce plan :

1. **`feasibility.message`** (score 5, status IRRÉALISTE) : *"Ton objectif demande 100 % VMA pendant toute la course... seuil physiologiquement soutenable ~93 % VMA. Ton temps théorique 2h21, réaliste 2h28."* — **explicite, chiffré, parfait.**
2. **`feasibility.recommendation`** : `"un temps cible de 2h28min"` — exploité par modal.
3. **`welcomeMessage`** : *"Ce plan ne te permettra PAS d'atteindre 2h00... physiologiquement hors d'atteinte... 2h21 théorique, 2h28 réaliste. Avis médical INDISPENSABLE."* — ton brutal, conforme `buildFeasibilityToneInstructions` IRRÉALISTE.
4. **`FeasibilityWarningModal`** (score < 15) : 
   - badge "Indice de confiance 5/100"
   - bloc contraste "Ton objectif 2h00" / "Estimation honnête 2h28"
   - **CTA PRIMARY orange** : *"Refaire un plan avec 2h28 (recommandé)"*
   - CTA SECONDARY noir avec checkbox attestation obligatoire : *"Générer quand même (risque accepté)"*

**Verdict app** : le dispositif est **excellent et déjà très explicite sur "regénère avec autre target"**. Le bouton primary du modal dit littéralement *"Refaire un plan avec 2h28"*. Le freelance ne l'a pas testé en preview UI.

### welcomeMessage assez fort ?

Lecture critique : *"Ce plan ne te permettra PAS d'atteindre 2h00... Ton temps théorique 2h21 et cible réaliste 2h28... Avis médical INDISPENSABLE..."* + *"Nous allons structurer tes 20 semaines autour d'un socle fondamental pour bâtir ton endurance de manière sécurisée."*

- ✅ Reconnait explicitement "PAS atteindre"
- ✅ Chiffrage gap + alternative (2h21/2h28)
- ✅ Avis médical "INDISPENSABLE"
- ⚠️ **Manque UNE phrase** : invitation explicite à regénérer. La phrase finale *"nous allons structurer..."* enchaîne sur le plan tel quel, sans poser de stop "tu peux refaire un plan avec 2h28 en cliquant ci-dessous".

Mais cette invitation EST dans le modal qui se déclenche au clic "Générer la suite". Donc le funnel est : welcomeMessage prévient → user clique Générer → modal "Refaire avec 2h28" PRIMARY. **Le flow est complet.**

### Volumes pic 14 km/sem pour Semi 21.1 km — patch ?

**Non.** Doctrine `feedback_courte_duree_charge_allegee` ET `feedback_input_client_obligatoire` : cv=2 est input immuable, on ne gonfle pas. Pic 14 = ×7 cv (sain en termes de progression), mais 66 % distance course = sous-prépa objective.

C'est **exactement** ce que le dispositif IRRÉALISTE adresse : on génère le plan le plus sûr possible pour le cv déclaré, et on dit clairement au user "ça ne fera pas 2h00". Si user persiste, c'est sous attestation. **Pas de patch volumes.**

### Recommandation welcomeMessage : ajouter ligne explicite ?

**Recommandation P1** : ajouter une ligne dans le template `buildFeasibilityToneInstructions` (IRRÉALISTE) du type :

> *"Tu peux générer ce plan en l'état, mais nous te recommandons FORTEMENT de revenir au questionnaire et de saisir [recommendation] comme objectif — tu auras un plan calibré pour réussir, pas pour échouer."*

Plus-value marginale (modal déjà fort), mais redondance pédagogique utile pour les users qui ferment le modal sans lire.

### Vrais bugs / actions Plan #6

- **P0 — Aucun.** Le dispositif IRRÉALISTE fonctionne comme conçu, conformément à doctrine projet.
- **P1 — Renforcer welcomeMessage IRRÉALISTE** : ajouter ligne explicite *"reviens au questionnaire avec [recommendation]"*. Patch côté `buildFeasibilityToneInstructions`.
- **P2 — Aucune action sur volumes/allures** : intouchables par doctrine.

### Verdict final Plan #6
**App fait son boulot correctement.** Feasibility 5 + welcomeMessage brutal + modal avec CTA "Refaire avec 2h28" PRIMARY = dispositif aligné doctrine `feedback_securite_avant_conversion`. Le freelance a critiqué le plan en ignorant le dispositif de sécurité front. Seule amélioration : renforcer la ligne "regénère" dans welcomeMessage pour ceux qui ferment le modal.

---

## Synthèse cross-plans

| Item | Plan #5 Trail | Plan #6 Semi |
|---|---|---|
| Bug code réel | Rebonds D+ post-récup +90/+110 % | Aucun |
| Avis freelance pertinents | 1/3 (renfo excentrique) | 1/3 (sous-prépa distance — mais by-design) |
| App fait BIEN | mainSet montée D16/D18b, cohérence vol/D+ par phase, pic D+ 87% course, calibration paces solide | dispositif IRRÉALISTE complet : feas+welcome+modal CTA "Refaire avec 2h28" |
| Patch live S1 | NON (S1 OK) | NON (S1 OK + plan non commencé) |
| Doctrine respectée | ✅ D1/D16/D18b/input client | ✅ D17/jamais-baisser-allure/input-client |

**Priorité absolue** : P0 Plan #5 (lisser rebonds D+ post-récup). Plan #6 = RAS, dispositif déjà solide, juste un P1 cosmétique.

**Note honnêteté** : freelance Plan #5 a sur-critiqué (2/3 faux-positifs par non-lecture). Freelance Plan #6 a mal arbitré (doctrine app inconnue). Mais chacun a identifié 1 vrai sujet — à valoriser, pas à dénigrer.
