# COL3 — COACH FFA EXTERNE V2 (audit 28 mai)

**Posture** : Coach FFA route + senior + prévention blessure + biomécanique débutants.
Mission : challenger 2 freelances, valider/contester chaque point au référentiel chiffré, identifier le manqué, sortir 3 actions priorisées par plan.

Doctrines projet appliquées : pas de mention poids/IMC dans wording utilisateur ; allure cible user immuable ; pas de cross-training ; pas de suggestion de changer la fréquence.

---

## PLAN #3 — yvanperez42 (Marathon 3h40, H 57a Confirmé) — 1779949737926

### Tableau d'arbitrage des avis freelance

| # | Avis freelance #3 | Verdict FFA | Justification chiffrée référentiel |
|---|---|---|---|
| 1 | Seuil 5:15 > Marathon 5:13 = aberration physiologique | **VALIDÉ — CRITIQUE** | Référentiel FFA route : marathon = 88–92 % VMA, seuil = 85–88 % VMA. Marathon DOIT être ≥ 5–15 s/km PLUS LENT que seuil. Avec VMA 13.79, seuil ~4:43 et marathon-target ~5:13 cohérent ; donc c'est le **Seuil 5:15 qui est faux** (devrait être ~4:43–4:50). Bug calcul paces — physiologiquement impossible de tenir 42 km plus vite qu'on ne tient 20 min. Risque mur 30 km + démotivation totale. |
| 2 | Enchaînement Jeu 8.6 + Ven 12 + Dim 18 = 38.6 km en 4 j = asphyxie à 57 ans | **VALIDÉ partiellement** | Doctrine FFA M+50 : ≥ 48 h entre deux séances qualitatives, ≥ 1 j de récup avant SL. Ici Jeu/Ven dos-à-dos puis SL J+2 = 3 charges en 5 j. Pour Confirmé jeune OK ; à 57 ans le tissu conjonctif récupère 30–40 % plus lentement (litt. masters). **Action** : insérer repos Ven OU déplacer 12 km en EF court le Lun. Le total 50 km est OK (cv user = 50). |
| 3 | 24 sem trop long → pic forme août au lieu novembre | **CONTESTÉ** | Plan macro 24 sem pour M3h40 chez Confirmé 57 a = standard FFA marathon (Daniels/Pfitzinger 18–24). Le pic est piloté par `weeklyVolumes` [50→71 S15→47 S22→36 S24], pic km S11+S15=71, affûtage clair S22–S24. La lassitude se gère par variation cycles 3+1, pas par raccourcissement. **Réfuté**. |
| 4 | Réduire la fréquence des séances | **CONTESTÉ — doctrine projet** | freq = input client immuable (cf. doctrine "jamais suggérer de changer la fréquence"). 5 séances/sem = 4 course + 1 renfo = parfaitement standard Confirmé Compétition. Le problème n'est pas le nombre mais la **répartition** (cf. ligne 2). |

### Manqué par le freelance

- **Charge S7–S11 pour 57 ans** : pic 71 km en S11 puis re-pic 71 km en S15 (4 sem plus tard), volume hebdo moyen 60+ km de S9 à S20. Pour H 57a Confirmé avec cv déclaré 50, on est **+40 % au-dessus du cv habituel** sur 12 semaines consécutives. Référentiel ACSM masters : montée > 10 %/sem ou plateau > +20 % cv pendant > 4 sem = risque tendinopathie achille/fascia plantaire x2.5. **Le freelance n'a pas vu le double pic**.
- **F-14 / F-15** : BMI 23.1 < 27, donc F-14 (BMI) ne s'applique pas. Age 57 > 50 active bien le profil masters mais PAS F-15 (qui est BMI-driven). Cohérent avec doctrine projet — pas de mention IMC au user.
- **Aberration Seuil/Marathon = bug code calc paces** (pas faute coach freelance, mais à remonter en bug critique générateur).
- **PB Semi 1h48** (5:07/km) → projection marathon Riegel = 5:08 × 1.06 = ~5:26/km soit ~3h49. La cible 3h40 (5:13/km) est **AMBITIEUSE mais pas IRRÉALISTE** : feasibility 60 cohérent, pas de patch silencieux nécessaire (cible user respectée — doctrine input client obligatoire).

### Actions priorisées

- **P0 — Bug paces Seuil/Marathon** : auditer le code calcul `seuilPace` vs `marathonPace`. Forcer invariant `seuilPace < marathonPace - 8s/km` minimum. Régression à tester sur tout profil Marathon Confirmé.
- **P1 — Recalibrer enchaînement S1 (et template Confirmé 50+ M)** : insérer 1 j de récup avant SL pour profils age ≥ 50. Schéma cible : Mar qualité / Mer renfo / Jeu EF court / Ven repos / Sam EF / Dim SL. Patch live S1 OK (S1 non vécue au 28/05, raceDate 8/11 → ~24 sem devant).
- **P2 — Lisser double pic S11/S15** : amortir le 2e pic à 67 km au lieu de 71, ou intercaler 1 sem décharge à 57 km entre les deux. À cadrer dans `weeklyVolumes` génération M50+.

### Verdict final Plan #3
Plan **structurellement correct mais avec 1 bug critique paces** + 1 risque masters sur enchaînement S1 et double pic. La cible 3h40 est tenable au regard du PB Semi 1h48 si paces recalibrées. **Action P0 bloquante avant envoi.**

---

## PLAN #4 — terry.lucile (Finisher, F 21a Débutant, GENOU FRAGILE) — 1779974805135

### Tableau d'arbitrage des avis freelance

| # | Avis freelance #4 | Verdict FFA | Justification chiffrée référentiel |
|---|---|---|---|
| 1 | Allure 11:00/km = sautillement, danger genou hyperlax + Osgood | **VALIDÉ — point biomécanique réel** | Cadence à 11:00/km chez F 173 cm = typiquement 145–155 ppm avec amplitude pas faible et temps d'appui long → contrainte rotulienne ↑. Pour Osgood séquelle + hyperlaxie, recommandation kiné/podo course : **cadence ≥ 165 ppm** et alternance marche/course pour réduire impact. Le bénéfice "sautiller doucement" est nul si la cadence n'est pas tenue. Reco : forcer rappel cadence dans description séance + maintenir séquence marche/course. |
| 2 | Volume "tout course" — pas d'alternance marche/course | **CONTESTÉ — faux-positif freelance** | Lecture incomplète : `type: 'Marche/Course'`, mainSet `"1 min course + 2 min marche"`. L'alternance EST appliquée. Le freelance a confondu le format affiché ou n'a pas ouvert le mainSet. Doctrine projet : mode Marche/Course bien scope Débutant + petite VMA (VMA 8.15 ≤ seuil), application correcte. |
| 3 | Inversion S1 : SL 2.8 km Sam avant Lun 2.3 km | **CONTESTÉ partiellement** | Le J1 est Lundi 2.3 km, la séance Sam 2.8 km est la SL de la semaine. C'est cohérent (progression intra-semaine courte → longue). Le freelance lit dans le mauvais sens. **Cependant** : pour profil genou fragile + Débutant, on pourrait inverser pour démarrer ENCORE plus doux (1ʳᵉ séance = la plus courte au monde = 2.3 km, déjà le cas). RAS. |
| 4 | Transformer en "Rando-Course" progressif | **CONTESTÉ** | C'est déjà le cas. "Marche/Course 1 min / 2 min marche" sur 2.3 km = exactement le format Galloway débutant. Suggestion redondante. |

### Manqué par le freelance

- **INJURIES déclarées + feasibility 70 BON = D17 non déclenchée**. Or doctrine D17 : feasibility ≤ 30 = opt-in obligatoire. Ici 70 = BON, donc D17 ne s'applique pas en l'état. **MAIS** la présence de `hasInjury: true` avec genou hyperlax + Osgood + Sever devrait déclencher un **flag séparé "blessure déclarée"** indépendant du score feasibility, avec safetyWarning + recommandation avis médical. Aujourd'hui : aucun garde-fou injuries-driven distinct → trou doctrine.
- **Allure 11:00/km est cohérente VMA 8.15** : recoveryPace 12:17 et efPace 11:00 = 55–65 % VMA, parfaitement étalonné pour Débutant 0–1 an. Le point freelance "sautillement" n'est pas une erreur de calibration mais une **alerte cadence/biomécanique** : à traiter par message conseil, pas par modification de l'allure (doctrine "jamais baisser allure cible" → ici allure générée correcte, on ne touche pas, on ajoute conseil cadence).
- **PB 5K 38:46** = 7:45/km. Le user court déjà à 7:45 sur 5K, donc 11:00/km en EF est très conservateur (-3:15/km vs PB 5K). Sécuritaire pour genou — OK doctrine projet plans courte durée < 13 sem = charge allégée volontaire (ici 12 sem).
- **Cv 4 km/sem → pic 7 km/sem** : progression +75 % sur 12 sem, soit ~5 %/sem. Conforme règle des 10 %. Volume sécure.
- **Pas de mention poids/minceur dans le plan** : à vérifier dans `welcomeMessage` et descriptions séances. Le `targetTime: "Finisher perte poids"` est OK en TITRE programme (doctrine "perte de poids OK dans titre"). Aucun coaching nutritionnel à ajouter (doctrine "pas de nutrition dans plan").

### Actions priorisées

- **P0 — Doctrine D-injuries** : créer flag déclenché par `hasInjury === true` indépendamment du score feasibility. Effet : safetyWarning explicite + recommandation "valider avec ton kiné/médecin du sport avant de démarrer" dans `welcomeMessage`, + opt-in front si blessure articulaire majeure (genou/cheville/hanche). À spec avec Romane.
- **P1 — Conseil cadence dans description séance Marche/Course** : ajouter dans `description` des séances course "vise 170 ppm petits pas rapides" pour profils Débutant + injuries genou. Pas de modification d'allure (doctrine), enrichissement texte uniquement.
- **P2 — Rejeter avis freelance #2/#3/#4** : non-lecture du JSON. Renvoyer au freelance avec le mainSet annoté. Pas de patch plan.

### Verdict final Plan #4
Plan **techniquement bien calibré** (mode Marche/Course correctement appliqué, allure conforme VMA, volume sécure). Le freelance a mal lu 3 points sur 4. **Le seul vrai trou est doctrinal** : aucune doctrine projet n'attrape spécifiquement `hasInjury=true` pour ce profil. **P0 à ouvrir avec Romane.**

---

## Synthèse cross-plans

| Item | Plan #3 | Plan #4 |
|---|---|---|
| Bug code | Paces Seuil > Marathon | RAS |
| Trou doctrine | Charge masters 50+ (enchaînement, double pic) | Flag `hasInjury` indépendant feasibility |
| Avis freelance pertinents | 2/4 (lignes 1, 2 partiel) | 1/4 (ligne 1 sur cadence) |
| Patch live possible | Oui (S1 non vécue, 24 sem devant) | Oui (S1 non vécue, 12 sem devant) |
| Cible user à respecter | M 3h40 (PB Semi 1h48 cohérent) | Finisher (très conservateur, OK) |

**Priorité absolue** : P0 Plan #3 (bug paces) > P0 Plan #4 (doctrine injuries). Tout le reste est P1/P2.
