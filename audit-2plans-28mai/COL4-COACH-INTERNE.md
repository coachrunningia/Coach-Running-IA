# COL4 — COACH INTERNE — Audit 2 plans (28 mai)

Auditeur : Coach interne Coach Running IA (doctrines D1-D20, F-1 à F-15).
Mode : indépendant + autocritique vs audit 27 mai soir (`COL4-COACH-INTERNE.md` qui validait thibaud à 93).

---

## Plan #1 — thibaud.mathys — Marathon 3h10 — 24 sem.

**Profil** : H 41 ans, 172cm/65kg (BMI 22.0), VMA 17.05 km/h dérivée 10k 39:30 + Semi 1h26, Marathon PB 3h08. cv=60 km/sem, freq=6, level Expert Performance, raceDate 2026-11-08.

### Métriques

| Métrique | Valeur plan | Référentiel FFA Marathon Expert | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 93 / EXCELLENT | Cible 3h10 vs proj VMA 3h06 + PB 3h08 → réaliste | OK (légèrement optimiste : seulement -2min de marge sur 24 sem) | RAS |
| VMA + PB cohérence | 17.05 km/h dérivée 10k+Semi | PB Marathon 3h08 → projection M 3h06 cohérente | OK | RAS |
| Allure EF vs VMA | 5:15 (≈67% VMA) | 65-72% standard | OK | RAS |
| cv vs goal minimum | 60 km/sem | Min Marathon Expert ≈45-50 | OK confortable | RAS |
| Pic hebdo | 90 (S11/S15/S19) | 80-110 cible Expert | OK dans la fourchette | RAS |
| **Progression S1→S7** | 60→66→73→58(récup)→67→77→**89** | FFA +10%/sem max | **S6→S7 : 77→89 = +15.6%** | À surveiller |
| **Progression S5→S7** | 67→77→89 | +10%/sem | **+15% puis +15.6% sur 2 sem consécutives** | Lisser S7 à 85 max (+10% de S6) |
| Saut "réel" charge | S4 récup 58 → S7 89 = +53% en 3 sem | Comparaison invalide (S4 est volontairement basse) | Faux signal | — |
| Mais S3→S7 vs cv | 60(cv)→89(S7) en 6 sem = +48% | Acceptable si gradient régulier ; ici 2 sauts de +15% | **À lisser** | S7 : 85, redistribuer ailleurs |
| SL max projetée (S11 pic) | ≈30-32 km (28% de 90) | 30-35 cible Expert, 25-30% hebdo | OK | RAS |
| Cohérence Level vs cv | Expert + cv 60 + PB M 3h08 | F-15 inverse OK (cv > minimum) | OK | RAS |
| BMI / Age | 22.0 / 41 | F-14 inactif (BMI<27, age<50) | OK | RAS |
| S1 structure | Lun jog 11.5 / Mar jog+LD 8.6 / Mer renfo / Jeu vallonné 10.1 / Sam récup 8 / Dim SL 21.8 | 6 séances dont 1 renfo OK (doctrine) | Équilibré, aucun enchaînement risqué (qualité-jour-suivant-qualité absente) | RAS |
| S1 polarisation | 100% EF (37 km route) + récup (8 km) + vallonné + SL — zéro VMA/seuil S1 | Doctrine fondamental S1 OK (montée progressive) | OK conforme phase fondamentale | RAS |
| Volume hebdo plateau S11-S19 | 72/83/86/90 répété 3 cycles | Monotonie : 3 blocs IDENTIQUES en développement+spécifique | Manque de variation, pas de bloc choc à 95-100 km en spécifique | À discuter (P2) |
| Affûtage S22-S24 | 60→53→45 sur 3 sem avant J | -33% / -12% / -15% | OK structure classique | RAS |

### Confirmes-tu les points du freelance ?

- **Validé** : saut S6→S7 = +15.6% (77→89) **dépasse la règle FFA +10%/sem**. Confirmé. P1.
- **Contesté** : "+53% en 3 semaines S4→S7 (58→89)" → **chiffré juste mais lecture biaisée**. S4 est une semaine de récup volontaire (-21% vs S3). La vraie référence est S3=73 ou S5=67. Comparé à S5 : 67→89 = +33% en 2 sem (S5→S7), soit deux sauts de +15%. **Reformulation** : pas un saut unique +53%, mais **2 sauts consécutifs >15%** non lissés en sortie de récup → équivalent risque, mais formulation à corriger pour ne pas perdre crédibilité.
- **Validé** : monotonie du cycle 72/83/86/90 répété 3 fois est suboptimal en développement+spécifique.

### Manqué par le freelance

- **Aucun trigger F-14 / F-15 manqué** (BMI 22, age 41, level cohérent avec cv).
- Plan ne contient PAS de séance trail (D16 inactif).
- **Pas de SL chiffrée S7+ dans données reçues** (S1 seule). Impossible de vérifier SL%hebdo réel sur pic — projection 28% sur S11 calculée. À auditer sur full plan généré.

### 3 actions

- **P0 (patch live possible — D5)** : aucune. S1 déjà bien construite, plan non vécu au-delà S1 (preview).
- **P1 (bug code / prompt)** : `weeklyVolumes` du prompt génération autorise sauts >15% après semaine récup. Ajouter règle dure : `next_load_week ≤ previous_load_week × 1.10` (et non pas relative à la récup intermédiaire). Concerne `periodizationPlan`.
- **P2 (qualité)** : pattern 72/83/86/90 répété 3x en développement+spécifique = manque de variation intra-bloc (manque pic 95-100 sur 1 sem dev3/spec3). Évolution prompt periodization.

### Autocritique — pourquoi notre audit du 27 mai a raté

1. **Erreur méthodologique** : on a regardé `feasibility.score`, `vma`, `paces`, `BMI`, `age`, `cv vs goal`, **pas la série `weeklyVolumes` semaine par semaine**. La règle FFA +10%/sem n'a jamais été appliquée comme check automatique.
2. **Halo Expert** : profil "Expert + Marathon 3h08 + cv 60" → biais de confirmation, le score 93 a verrouillé la lecture.
3. **Absence de check `delta_pct(W[n], W[n-1])` dans nos audits**. Ajouter aux templates : tableau `[W, vol, Δ%, phase]` systématique.
4. **Manqué** : ne pas avoir relevé la monotonie 72/83/86/90 dupliquée 3 cycles.

**Action interne** : ajouter au pipeline d'audit checklist obligatoire `progression FFA <=10%/sem hors transition récup→charge où max +15%`.

---

## Plan #2 — coralievandevelde — Semi 2h45 — 20 sem.

**Profil** : F 35 ans, 170cm/83kg (**BMI 28.7**), VMA 9.48 dérivée de l'objectif (PAS de PB), cv=14, freq=3, level **"Confirmé (Compétition)"**, raceDate 2026-10-11.

### Métriques

| Métrique | Valeur plan | Référentiel FFA Semi Débutant (vrai niveau) | Verdict | Patch reco |
|---|---|---|---|---|
| feasibility.score | 43 / RISQUÉ | Cohérent (pas de PB + cv faible + level incohérent) | OK, déjà flaggué transparence opt-in (D17) | RAS sur le score |
| VMA + PB cohérence | VMA 9.48 dérivée objectif 2h45 / pas de PB | F-13 risque faux positif inverse : VMA estimée FROM target time = circular | **Tag explicite "VMA estimée, non mesurée" déjà dans feasibility.message** | OK |
| Allure EF vs VMA | 9:27 (67% VMA 9.48) | Math correct mais 6.35 km/h ≈ marche rapide soutenue | **Allure techniquement valide mais peu réaliste à courir** | Voir verdict spécifique ci-dessous |
| Allure spé Semi | 7:49/km = 7.68 km/h pour 2h45 | Cohérent avec target (21.1 × 7:49 = 2h45) | OK | RAS |
| cv vs goal minimum | 14 km/sem | Min Semi Débutant 25-30 | **Sous-dimensionné** mais c'est l'input user (immuable) | RAS sur cv ; volume plan adapté |
| Pic hebdo | 22 (S15, S18) | Réf Semi Débutant 30-45 ; on est volontairement sous (plan court 20 sem + cv 14 base) | OK doctrine "plans <13 sem charge allégée" — ici 20 sem mais cv très bas justifie | RAS |
| Progression volumes | 14→15→16→13→15→17→14→16→18→16→18→21→18→21→22→18→21→22→14→12 | +7% / +7% / -19% / +15% / +13% etc. | Globalement **conforme +10% (sauts max +15% en sortie récup)** | OK |
| SL max projetée | S15/S18 pic 22 : SL ≈ 9-10 km (≈45% hebdo) | Réf 30-40% Semi Débutant → **48% trop élevé sur 3 séances/sem** | **Dilemme freq 3 vs SL volume** | Discuter (P2) |
| SL S1 | 9 km / 85 min déjà en S1 | Avec cv 14 et 3 séances/sem, SL S1 = 9 km = 64% du cv hebdo | **SL S1 trop ambitieuse pour Confirmé/Compétition mascarade Débutant** | **P0 à discuter** |
| Cohérence Level vs cv | "Confirmé Compétition" + cv 14 | **F-15 trigger : level incohérent avec cv** | **Vrai niveau = Débutant** | Recalibrage interne `effective_level=Débutant` |
| BMI / Age | **28.7 / 35** | **F-14 partiel** : BMI>27 mais age<50 → trigger BMI seul | **Encart vigilance articulaire à enrichir** : safetyWarning actuel ("chaussures + amorti + surfaces souples") couvre déjà l'esprit, mais pas explicite sur charge | RAS (déjà tagué) |
| S1 structure | Mar jog 5km / Jeu renfo / Sam SL 9km | 3 séances dont 1 renfo OK doctrine | **Sortie longue 85 min S1 sans préparation = lourd** pour un effective_level Débutant | Réduire SL S1 à 50-60 min (P1) |
| S1 polarisation | 100% EF + renfo | OK fondamental S1 | OK | RAS |

### Cas spécifique — verdict argumenté allure EF 9:27 / 6.35 km/h

**Contexte doctrinal** :
- `feedback_jamais_baisser_allure_cible` : protège l'allure CHRONO objectif (5k/10k/semi/marathon). L'EF dérivée n'est PAS visée.
- `feedback_mode_marche_course_scope` : marche/course = Débutants uniquement. Coralie est **déclarée** Confirmée mais **effective_level = Débutant** (F-15).
- D17 : plan RISQUÉ → transparence opt-in (déjà appliqué, score 43).

**Analyse du dilemme** :
- Math : VMA dérivée d'un objectif PEU réaliste (Semi 2h45 = 7:49/km est largement atteignable pour quiconque court 30 min sans s'arrêter, donc VMA 9.48 est sous-estimée). **VMA réelle de coralie est probablement >9.48** (peut-être 10-11). Donc EF réelle plus rapide que 9:27.
- Conséquence : courir 9:27/km imposé = effort sous-EF réel = **marche rapide soutenue, démotivant et biomécaniquement inefficace** (foulée trop lente pour être courue, pas assez rapide pour marcher activement).
- BMI 28.7 : marcher activement est meilleur biomécaniquement que trottiner à 6.35 km/h à 83 kg.

**Verdict** :

**On bascule en mode marche/course pour S1-S4 (phase fondamentale) PUIS on re-teste.**

Justifications :
1. `feedback_mode_marche_course_scope` autorise marche/course pour **Débutants** ; F-15 nous dit que coralie est **effective_level Débutant** malgré déclaration "Confirmée". On respecte la doctrine en lui appliquant le traitement réel (pas le déclaratif).
2. `feedback_jamais_baisser_allure_cible` ne s'applique PAS ici : l'allure cible chrono (Semi 7:49) reste intacte. On adapte l'EF (allure d'entraînement dérivée), ce qui est explicitement hors scope de la doctrine.
3. BMI 28.7 + jamais couru avant + SL S1 = 85 min : recommander course continue à 6.35 km/h est un risque articulaire pour 0 bénéfice cardio (frequence cardiaque sera basse aussi).
4. Compromis (`feedback_compromis_messages_preventifs`) : on N'IMPOSE PAS marche/course, on **propose** dans welcomeMessage + safetyWarning : "Si courir à cette allure te paraît inconfortable, alterne 3 min course / 1 min marche active". Et on attend feedback S1 pour rebascule course continue ou maintien marche/course.
5. À S4 (récup) : refaire le point ; si elle tient l'EF en continu, on bascule. Sinon on reste alterné.

**Concrètement** :
- Ne PAS modifier `targetPace` dans le JSON (reste 9:27 = référence math).
- AJOUTER dans `mainSet` de chaque footing S1-S4 : "Tu peux alterner course/marche (ex. 3 min course 9:27 / 1 min marche) si l'allure te semble trop lente à courir".
- AJOUTER au welcomeMessage : "Si l'allure 9:27 te paraît être de la marche rapide, c'est normal — tu peux alterner course et marche jusqu'à ce que ton corps trouve son rythme".

### Confirmes-tu les points du freelance ?

- **Validé** : EF 9:27 = quasi-marche → action requise (proposition marche/course doctrinalement compatible).
- **Validé** : objectif 2h45 sans base est très conservateur, presque trop : faisabilité réelle probablement bien meilleure (VMA sous-estimée) → mais doctrine **`feedback_input_client_obligatoire` + `feedback_jamais_baisser_allure_cible`** : on ne touche pas le 2h45.
- **À ajouter** : F-14 partiel (BMI 28.7 sans age>50) → safetyWarning à enrichir si pas déjà couvert.

### Manqué par le freelance

- **F-15 trigger explicite** : level "Confirmé Compétition" + cv 14 = incohérent. Le freelance n'a probablement pas tagué `effective_level=Débutant` comme étant la clé de résolution du dilemme allure EF.
- **SL S1 = 85 min sans préparation** : risque articulaire en BMI 28.7. À adoucir S1 même si techniquement le plan est en preview.

### 3 actions

- **P0 (patch live S1 — D5 sécurité)** : modifier S1 SL de 85 min / 9 km → **65 min / 6.5-7 km** en alternant course/marche. Justification D5 : BMI>27 + cv 14 + 1ère séance jamais vécue = sécurité prime. Plus ajouter mention marche/course dans `mainSet` de chaque footing.
- **P1 (bug code)** : F-15 doit déclencher recalibrage automatique `effective_level` côté backend pour piloter (a) volume SL S1, (b) message marche/course optionnelle, (c) revue safetyWarning. Aujourd'hui F-15 semble silencieux.
- **P2 (prompt)** : périodisation `weeklyVolumes` `[14,15,16,13,...]` correcte ; mais SL 45-48% du hebdo sur freq 3 = mécaniquement trop. Règle : `SL_max = min(volume_hebdo × 0.40, 1h45)` pour effective_level Débutant.

### Autocritique — pourquoi notre audit du 27 mai a raté (si applicable à coralie)

Coralie n'était pas dans le batch du 27 mai (plan généré le 28). Mais le manque côté thibaud (pas d'analyse `delta_pct(W[n], W[n-1])`) est le même angle mort qui aurait fait passer le saut SL S1 inaperçu sur coralie.

**Correctif méthodologique commun aux 2 plans** : tout audit interne doit dorénavant produire :

1. Tableau `[Semaine, volume, Δ% vs W-1, phase]` complet.
2. Tableau `[Semaine, SL_km, SL_min, SL%hebdo]`.
3. Check explicite F-13, F-14, F-15 même si scoring `feasibility` semble OK.
4. Vérification `effective_level` (recalcul interne) systématique pour piloter doctrines spécifiques (marche/course, SL max %, charge).

---

## Synthèse 2 plans

| Sujet | Plan #1 thibaud | Plan #2 coralie |
|---|---|---|
| feasibility | 93 / EXCELLENT (légèrement optimiste) | 43 / RISQUÉ (correctement flaggué) |
| Doctrines violées | Aucune | F-15 silencieux (à activer), F-14 partiel à enrichir |
| FFA progression | 2 sauts +15% consécutifs S5→S7 | OK |
| S1 sécurité | OK | SL 85 min trop lourde BMI 28.7 → P0 |
| Verdict global | Plan bon mais lissage S6-S7 à -10% requis (P1 code) | Plan acceptable si bascule marche/course optionnelle S1-S4 + réduction SL S1 (P0 live) |

**Top actions consolidées** :
- **P0** : patch live S1 coralie (SL réduite + mention marche/course optionnelle).
- **P1 code** : règle dure `W[n]/W[n-1] ≤ 1.10` post-récup ; F-15 activation effective_level.
- **P1 méthodo audit** : checklist obligatoire `weeklyVolumes` Δ% + SL%hebdo + F-13/14/15 systématiques.
- **P2 prompt** : variation intra-bloc dev/spec ; SL_max % pour Débutants.
