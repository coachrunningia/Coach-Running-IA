# SPRINT F+ — VALIDATION COACH EXPERT (F-1 / F-2 / F-3 / F-4)

> **Auteur** : Coach course à pied 25+ ans, FFA N5, doctrines Pfitzinger / Daniels / Galloway / Hammond / Krissy Moehl / Karl Meltzer / Friel / Cory Smith / Berkien.
> **Date** : 2026-05-27
> **Périmètre** : programmation d'entraînement uniquement (F-1/2/3/4). F-5/F-7/F-8/F-9/F-10/F-11 = hors scope coach.
> **Méthode** : verdict GO / RAFFINER / KO par fix, références littérature explicites, batterie profils-tests pré-deploy.

---

## SECTION 1 — VERDICT GLOBAL

| Fix | Intention | Verdict | Raison synthèse |
|-----|-----------|---------|-----------------|
| **F-1** Rampe macro plans >20 sem | GO logique, **RAFFINER chiffres** | Le `×1.4` est trop pauvre pour Débutant cv=0 (qui *doit* progresser plus), et trop chaud pour Expert sur ultra long (déjà saturé). Module obligatoire par niveau + cap absolu. |
| **F-2** Affûtage Ultra >200 km | GO, **RAFFINER seuils** | 0.75/0.50/0.30 = trop agressif pour S-3 (Moehl & Meltzer descendent moins vite). Le plus gros défaut = ne pas durcir le **D+** en parallèle (c'est le D+ qui casse, pas les km). |
| **F-3** D18b plat-équivalent | **GO direct**, raffiner wording | Seuil 30 m/km bon (Pfitzinger seuil "rolling vs hilly"). Wording à standardiser (3 variantes par niveau). Auto-injection OK. |
| **F-4** SL Dim figée Trail Débutant | GO logique, **RAFFINER plafonds** | Le `0.40 × distance race` casse à partir de Trail Long (50km → 20 km SL pour un Débutant = irréaliste cv=0). Besoin d'un plafond absolu par niveau (Hammond, Galloway). |

**Verdict global** : **3 GO avec raffinements** + **1 GO direct (F-3)**. **Aucun KO**. Les 4 fix touchent à des bugs réels documentés (marquilie68, Lion Mathieu, hugo) — leur intention est saine. Les chiffres proposés par le dev sont approximatifs, à recaler.

**Condition préalable au merge** : exécuter la batterie de 15 profils-tests (Section 6). Tant que pas validé sur les 15, pas de prod.

---

## SECTION 2 — F-1 : RAMPE MACRO PLANS >20 SEM

### 2.1 Diagnostic coach du bug

Cas marquilie68 (Trail 29km / D+800 / Débutant / 88kg / cv=0 / VMA 11 / 30 sem) : pic 17 km figé S3 → S27. **Erreur fondamentale du plan** : viol direct du principe Pfitzinger de surcharge progressive ("Advanced Marathoning" ch. 1) et du principe Lydiard ("aerobic base building should progress 3-6 months"). Quand on a 30 sem on a *l'opportunité* d'amener un Débutant cv=0 de zéro à 22-25 km hebdo en toute sécurité. Le plan figeait à 17 km = il sous-utilisait massivement la fenêtre.

### 2.2 Évaluation du fix proposé

**Proposition dev** : `weeklyVolumes[lastNonTaperWeek] >= weeklyVolumes[3] × 1.4` + pic dans le dernier tiers.

**Problèmes** :
1. Le `×1.4` est **uniforme tous niveaux** → faux. Un Débutant cv=0 peut/doit progresser **×2 à ×2.5** sur 30 sem (Hammond, "Beginning Running" — règle "double base in 6 months"). Un Expert avec base solide ne devrait progresser que **×1.3 à ×1.5** (loi de rendements décroissants Pfitzinger ch. 3).
2. "Dernier tiers du plan" = OK si on parle de pic *km*, mais le **pic D+** trail doit arriver dès le 2e tiers, pour laisser place au pic spécifique (back-to-back) en fin (Moehl, "Running Your First Ultra" — affûtage trail = "peak elevation 3 weeks before, peak distance 2 weeks before").
3. Pas de **MAX** → risque de sur-dimensionnement Débutant. Marquilie cv=0 ne doit JAMAIS dépasser ≈ 25 km/sem sur 30 sem.

### 2.3 Raffinement proposé

**Règle modulée par niveau** :

| Niveau | Ratio min `pic / S3` | Plafond absolu km pic | Justif |
|--------|----------------------|------------------------|--------|
| Débutant cv=0 | **×1.8** | 25-28 km/sem | Hammond règle "doubler la base" / Galloway Run-Walk progression. Cv=0 sur 30 sem = on prend le temps. |
| Débutant cv 5-15 | ×1.6 | 30-35 km/sem | Standard ACSM "10% rule" cumulé sur 6 mois ≈ ×1.7. |
| Intermédiaire | ×1.5 | Cf REFERENTIEL-COACH selon goal | Pfitzinger ch. 1 surcharge progressive. |
| Confirmé | ×1.4 | Cf REFERENTIEL-COACH | Daniels Running Formula ch. 4 — gain marginal au-delà. |
| Expert | ×1.3 | Cf REFERENTIEL-COACH | Loi rendements décroissants. |

**Règle position du pic** :
- **Route (5/10/semi/marathon)** : pic km dans la fenêtre `[durationWeeks × 0.65 ; durationWeeks - tapering]`. Pfitzinger 18/55 et 18/70 plans → pic en S14-S15 sur 18 sem ≈ 78-83 % → OK.
- **Trail / Ultra** : pic km en `[0.65 ; 0.85]` MAIS pic D+ en `[0.55 ; 0.80]` (Moehl). Le D+ pique plus tôt pour laisser la place à un back-to-back final en spé.

**Garde-fou Trail vs Route — distinct** :
- Trail : autoriser jusqu'à 3 pics quasi-équivalents (oscillation back-to-back) au lieu d'un pic strict. Friel "The Triathlete's Training Bible" / Moehl confirment : phase spécifique trail = 3 semaines hautes consécutives plutôt qu'un pic unique.
- Route marathon : 1 pic franc, suivi décharge, puis affûtage 3 sem (Pfitzinger 18/70).

### 2.4 Sur la rampe Expert appliquée hier au plan marquilie

`[8,9,11,8,10,13,10,13,15,12,15,17,13,16,18,14,17,19,15,19,21,16,19,22,17,20,22,16,12,8]`

**Analyse coach** :
- S3 = 11 km, pic S24/S27 = 22 km → ratio **×2.0**. Pour un cv=0 Débutant sur 30 sem, c'est **correct mais sur la limite haute**. Acceptable car on est très bas en absolu (22 km pic).
- Saut S3→S4 = 11→8 (-27 %) **trop violent** comme décharge en début de cycle, Lydiard recommande -15 à -20 % max les premières décharges. **Mineur, à corriger si on re-livre une rampe Expert**.
- 3 cycles 3+1 (S1-4 / S5-8 / S9-12 ...) cohérent Pfitzinger.
- Affûtage S28-30 = 16/12/8 → ratio à pic = 0.73/0.55/0.36. **Affûtage standard 3 sem Pfitzinger** — bon.

**Conclusion plan marquilie** : la rampe livrée hier était **acceptable** (juste rétro-corriger les -27% en première décharge si on re-touche).

### 2.5 Profils-tests F-1 (sous-ensemble Section 6)

Tester en priorité :
1. Marquilie68 (Trail Débutant cv=0 30 sem) — cas d'origine
2. Marathon Débutant cv=5 26 sem
3. Marathon Expert 22 sem cv=70 (vérifier ne PAS sur-progresser)
4. Trail Long 80km Confirmé 24 sem
5. Hyrox Intermédiaire 20 sem (tout petit pic, ne pas casser)

---

## SECTION 3 — F-2 : AFFÛTAGE ULTRA >200 km

### 3.1 Diagnostic coach

Cas Lion Mathieu (Tor des Géants 330 km / D+ 24 000 m / 16 sem / cv=70 / D+cv 2000 m). Affûtage initial : 132/116/99 km → **incohérent**. Pour un ultra de cette envergure, **l'affûtage doit être PLUS LONG, pas plus dur**. Karl Meltzer ("Made for the Long Run") explicite : "for races 200+ miles, taper begins 4 weeks out, not 3" et "taper depth on elevation must be steeper than on distance — your quads need to forget the descent before race day".

### 3.2 Évaluation du fix proposé

**Proposition dev** : si `distance > 200 && elevation > 10000` → S-3 ≤ 0.75 × pic, S-2 ≤ 0.50, S-1 ≤ 0.30.

**Problèmes** :
1. **S-3 à 0.75 = trop chargé**. Krissy Moehl ("Running Your First Ultra" ch. affûtage) : "three weeks out, drop volume by ~30 %" → 0.70 × pic. Meltzer : 0.65-0.70 pour 200+ mi. **0.70 plus prudent**.
2. **S-1 à 0.30 = trop élevé**. Pour 330 km en 16 sem cv=70, S-1 doit être ≈ 20-25 % du pic (Friel "Going Long" ch. 9). Sinon les fibres ne récupèrent pas le glycogène nécessaire. **0.25 mieux**.
3. **Critique majeure** : le fix ne traite QUE les km, **pas le D+**. Sur Tor des Géants (D+ 24 000 m) le facteur cassant n'est pas le km mais les contraintes excentriques sur quadriceps (descente). Affûtage doit aussi taper le D+ : **S-3 ≤ 0.50 × D+pic, S-2 ≤ 0.25 × D+pic, S-1 ≤ 0.10 × D+pic**. Cory Smith ("Trail Runner" magazine, taper protocols) : "drop elevation faster than distance — your descending muscles need 21 days minimum to fully repair micro-tears".
4. Pas de différenciation par sévérité. Un 100 km / D+ 5000 m n'a pas besoin du même affûtage qu'un 330 km / D+ 24 000 m.

### 3.3 Raffinement proposé — table multi-tier

| Tier course | Critère | S-3 (% pic km) | S-2 (% pic km) | S-1 (% pic km) | S-3 D+ | S-2 D+ | S-1 D+ |
|-------------|---------|----------------|----------------|----------------|--------|--------|--------|
| Ultra court | 50-100km, D+ < 5000m | 0.80 | 0.60 | 0.40 | 0.70 | 0.40 | 0.15 |
| Ultra moyen | 100-160km OU D+ 5000-10000m | 0.75 | 0.55 | 0.35 | 0.60 | 0.30 | 0.12 |
| **Ultra long** | **>160km OU D+ >10000m** | **0.70** | **0.45** | **0.25** | **0.50** | **0.25** | **0.10** |
| Ultra extrême | >250km OU D+ >18000m | 0.65 | 0.40 | 0.20 | 0.40 | 0.20 | 0.08 |

**Plan Lion Mathieu (Tor 330km / D+ 24000m)** → Ultra extrême. Pic km supposé ≈ 130 km. Affûtage cible :
- S-3 : 85 km / D+ 4500m (vs 132/24000 actuel = catastrophe)
- S-2 : 52 km / D+ 2200m
- S-1 : 26 km / D+ 900m

Le patch live d'hier (100/65/35) est **plus dur que ma reco** sur S-3 (100 vs 85) mais **plus laxiste** sur S-1 (35 vs 26). **Net** : le patch live est acceptable mais pas optimal. Si on re-touche le plan, viser 85/52/26.

### 3.4 Back-to-back race (2 ultras à 8 sem)

Cas non explicitement gérés. Reco coach :
- Si race 2 dans `[6 ; 10] semaines` après race 1 → **race 1 = pic "test"**, race 2 = vrai objectif. Affûtage race 1 standard. Reprise post-race 1 : 2 semaines très allégées (-50 % vol, 0 intensité), puis ré-attaque charge sur 4 sem, puis affûtage race 2 sur 2 sem (pas 3 — pas assez de fenêtre).
- Si race 2 < 6 sem → bloquer / warning : "fenêtre trop courte pour deux pics, race 2 sera sous-préparée" (Meltzer recommandation explicite).
- Si race 2 > 10 sem → plan séparé, traiter comme deux blocs indépendants.

### 3.5 Profils-tests F-2

1. Lion Mathieu / Tor des Géants — cas d'origine
2. UTMB 170 km D+ 10 000 m Confirmé 20 sem (ultra moyen→long)
3. CCC 100 km D+ 6100 m Intermédiaire 16 sem (ultra court→moyen)
4. Diagonale des Fous 165 km D+ 9600 m Expert 22 sem (ultra moyen→long)
5. Back-to-back : Maxi Race 87km puis UTMB 170km à 7 sem d'écart (cas gestion 2 races)

---

## SECTION 4 — F-3 : DOCTRINE D18B PLAT-ÉQUIVALENT NON EXPLICITÉE

### 4.1 Diagnostic coach

Cas hugo (Ultra 100km, séances trail à targetPace 5:23 sans phrase de désambiguïsation). C'est **le bug le plus dangereux** du Sprint F+ : un user qui prend les targetPaces au pied de la lettre sur sentier technique va se cramer en montée, casser les quadriceps en descente, et arriver au jour J épuisé.

D18b "distance = horizontal plat-équivalent IMMUABLE" est une **doctrine projet correcte** : la distance affichée correspond à un effort plat. Sur un sentier raide, **on doit ralentir** selon la formule Cory Smith / Naismith : `+3 à +5 s/km par 10 m de D+/km`.

### 4.2 Évaluation du fix proposé

**Proposition dev** : pour TOUTE session avec `D+/km > 30 m/km`, mainSet doit contenir une phrase parmi 4 variantes. Auto-injection si manquant.

**Verdict** : **GO direct**. Mécanisme post-process check + auto-injection = approche correcte (pas de risque de régression LLM). Approbation immédiate.

### 4.3 Raffinement seuil

Le seuil **30 m/km est bon** mais à **affiner par contexte** :
- 30 m/km = Pfitzinger seuil "rolling course" (chap. terrain considerations). Niveau "vallonné net".
- 50 m/km = "hilly". À partir de là, la pénalité Cory Smith atteint déjà +15-25 s/km, donc le mention est CRITIQUE.
- < 20 m/km = "flat to undulating", phrase facultative (mais bonne pratique).

**Reco** : conserver `> 30 m/km` comme seuil d'**auto-injection obligatoire**. Au-dessus de `> 50 m/km`, **doubler** : ajouter une phrase quantifiée Cory Smith (cf. wording ci-dessous).

### 4.4 Wording standard recommandé

**3 niveaux de message** selon `D+/km` et niveau coureur :

**Variante A — Léger (30 ≤ D+/km < 50, tous niveaux)** :
> "Distance affichée = plat-équivalent. Sur le terrain, c'est l'**effort qui compte, pas la vitesse au GPS**. Ralentis en montée, profite des descentes."

**Variante B — Quantifiée (D+/km ≥ 50, Intermédiaire+)** :
> "Cette séance est en plat-équivalent. Sur le terrain réel : compte **+3 à +5 s/km par 10 m de D+/km** (méthode Cory Smith). Sur cette portion (~X m D+/km), vise +Y s/km par rapport au pace affiché. **L'effort cardio reste constant**, pas la vitesse GPS."

**Variante C — Débutant simplifiée (toute D+/km > 30, level=Débutant)** :
> "La distance et l'allure indiquées correspondent au plat. **En vrai sur sentier, ça grimpe / ça descend → tu ralentis en montée, tu ne forces jamais.** L'objectif n'est pas le chrono GPS, c'est l'effort. Si tu peux parler par phrases courtes, c'est bon."

**Variante D — Marche/course (level=Débutant + mode marche-course actif)** :
> "Cette séance alterne marche et course. **Sur les montées, la marche est encouragée**, même sur les courtes pentes. Distance = plat-équivalent. Pas de chrono à tenir."

**Logique d'injection** :
```
if mainSet ne contient AUCUNE phrase parmi A/B/C/D candidates :
   selon (D+/km, level, mode marche-course) → injecter la variante adéquate
   placement : APRÈS la description séance, AVANT les blocs Échauffement
```

### 4.5 Cas spéciaux

- **Marche/course Débutant en trail** : variante D obligatoire dès `D+/km > 20` (seuil abaissé, car un Débutant marche-course est encore plus vulnérable au mauvais dosage en montée).
- **Hyrox** : la doctrine ne s'applique PAS (parcours plat connu, pas de D+). Skip.
- **Route avec dénivelé léger** (D+/km 20-30) : pas d'injection obligatoire, mais OK de laisser le coach commenter dans le welcome message uniquement.

### 4.6 Profils-tests F-3

1. Hugo Ultra 100km cas d'origine
2. UTMB 170 km (multiples séances D+/km > 80)
3. Trail court 25 km D+ 1500m Débutant (D+/km = 60 = quantifié)
4. Marathon route plat (D+/km < 10) — vérifier PAS d'injection
5. Trail court Débutant marche-course (variante D)

---

## SECTION 5 — F-4 : SL DIMANCHE FIGÉE TRAIL DÉBUTANT cv=0 PLANS LONGS

### 5.1 Diagnostic coach

Cas marquilie68 : SL Dim **figée 8 km / 65 min de S1 à S27**. **Erreur grave** : sur 27 semaines de charge, un Débutant cv=0 préparant un Trail 29 km doit voir sa SL au pic à **12-14 km minimum** (réf REFERENTIEL-COACH "Trail Court Débutant SL pic 14-18"). 8 km figé = sous-préparation totale → DNF garanti.

### 5.2 Évaluation du fix proposé

**Proposition dev** : si `Trail && Débutant && cv<10 && durationWeeks>20` :
- SL_pic_Dim ≥ 0.40 × distance_race
- SL_pic > SL_S1 × 2

**Problèmes** :
1. **0.40 × distance race** marche pour Trail Court (29 km → 11.6 km ≈ correct) mais **casse pour Trail Long et Ultra** :
   - Trail 50 km → SL pic 20 km : **trop pour un Débutant cv=0** (REFERENTIEL Trail Moyen Débutant SL pic 18-22 → 20 max acceptable mais limite haute)
   - Trail 100 km → SL pic 40 km : **complètement irréaliste cv=0** (REFERENTIEL Trail Long Débutant déconseillé, SL pic 25-30 max si override). Hammond, "Beginning Running" ch. ultra : "for absolute beginners, never exceed 25 km long run before first ultra — pacing for time, not distance".
2. Le `×2` minimum est trop pauvre pour des plans de 27 semaines. Réf Hammond "double base in 6 months" → SL devrait passer **×3 à ×4** sur cv=0 / 30 sem.

### 5.3 Raffinement proposé — fonction par tier de course

**Formule recommandée — SL pic Dim Débutant cv=0 / plan ≥ 20 sem** :

| Goal | SL pic cible | Plafond absolu | Floor (vs SL_S1) |
|------|-------------|----------------|------------------|
| 5 km route | 7 km | 8 | ×2.5 |
| 10 km route | 9 km | 10 | ×2.5 |
| Semi route | 14 km | 16 | ×3 |
| Marathon route | 24 km (en distance) OU **2h30 time-based** | 28 km / 2h45 | ×3.5 |
| Trail court (<30) | 0.45 × distance race | 14 km | ×3 |
| Trail moyen (30-60) | min(18 km, 0.35 × distance race) | 20 km | ×3 |
| Trail long (60-100) | 25 km (override only) | 28 km | ×3 |
| **Trail ultra (>100)** | **refus dur Débutant** (cf D17) | — | — |
| Hyrox | 8 km | 9 | ×2 |

**Pour Trail 29 km marquilie68** :
- Goal = Trail court (<30) → SL pic = 0.45 × 29 = 13 km, plafond 14 → **SL pic 13 km**, floor 8 × 3 = 24... or SL_S1 ≈ 4-5 km → ×3 = 12-15 km. **Donc 13 km cohérent**.
- Bien meilleur que le `0.40` proposé qui donnait 11.6 km. Le `0.45` donne 13 km plus aligné REFERENTIEL "Trail Court Débutant SL pic 14-18" (juste sous la limite basse, raisonnable cv=0).

**Pour Marathon Débutant cv=0 (cas Aurélien)** :
- SL pic = **24 km en distance** ou **2h30 time-based** (Pfitzinger 18/55 plan Débutant) selon ce qui rend l'allure EF tenable. **Règle transversale 16 du REFERENTIEL** déjà actée : "Sortie longue temps-based pour Marathon Débutant fréquence ≤ 3x : durée 2h30-2h45 à allure EF (pas km-based si la fréquence limite la distance)". On RESPECTE cette règle.

### 5.4 Progression SL — pas seulement valeur pic

Le fix dev ne traite QUE la valeur pic. **Il manque la trajectoire** :
- SL doit progresser **par paliers de 1-2 km tous les 2-3 semaines** (Galloway "Marathon: You can Do It" ch. 6). Pas de saut > 25 % entre 2 SL consécutives, sauf après décharge.
- Décharge SL : tous les 3-4 cycles, SL = ×0.6 du dernier pic SL (Pfitzinger).
- SL ne dépasse JAMAIS 35 % du volume hebdo (règle Pfitzinger "no long run > 1/3 of weekly mileage").

Donc fix complet F-4 :
```
SL_pic ≤ table ci-dessus  (plafond absolu)
SL_pic ≥ SL_S1 × ratio table  (floor progression)
∀ semaine, SL[i] ≤ SL[i-1] × 1.25  (saut max)
∀ semaine, SL[i] ≤ 0.35 × weeklyVolume[i]  (Pfitzinger 1/3 rule)
Décharge SL toutes les 3-4 sem : SL[décharge] = SL[pic précédent] × 0.6
```

### 5.5 Profils-tests F-4

1. Marquilie68 Trail 29km Débutant cv=0 30 sem (cas d'origine)
2. Marathon Débutant cv=0 24 sem (vérifier 2h30 time-based, pas km-based)
3. Aurélien Marathon (si profil existe)
4. Trail moyen 45 km Débutant cv=5 22 sem (vérifier plafond 18 km)
5. Trail long 80 km Intermédiaire cv=10 26 sem (cv low, mais Inter — vérifier 0.35 × 80 = 28 km cohérent REFERENTIEL Inter 30-40)
6. Semi Débutant cv=0 20 sem (SL pic 14, floor ×3)

---

## SECTION 6 — 15 PROFILS-TESTS PRÉ-DEPLOY

> **Méthodologie obligatoire** (cf. feedback_validation_n_profils_avant_sprint.md) : faire tourner les 15 profils sur le code post-fix avant tout deploy. Pour chaque profil : valider (a) rampe volume, (b) SL pic, (c) affûtage, (d) wording plat-équivalent injecté quand pertinent.

| # | Profil | Goal | Distance | Niv | Âge | VMA | cv | Freq | Durée | Touche fix |
|---|--------|------|----------|-----|-----|-----|----|----|-------|-----|
| 1 | Marquilie68 | Trail | 29km D+800 | Déb | 55 | 11 | 0 | 4 | 30 sem | F-1, F-4 |
| 2 | Lion Mathieu | Ultra Trail | 330km D+24000 | Exp | 39 | 18.5 | 70 | 6 | 16 sem | F-1, F-2, F-3 |
| 3 | Hugo | Ultra Trail | 100km D+4500 | Conf | 35 | 16 | 50 | 5 | 18 sem | F-2, F-3 |
| 4 | Aurélien | Marathon | 42.2km route | Déb | 42 | 11.5 | 0 | 3 | 24 sem | F-1, F-4 (rule 16 timebased) |
| 5 | Sébastien-like | Semi | 21.1km | Conf | 33 | 16 | 50 | 4 | 12 sem | F-1 (vérif pas sur-rampe Confirmé) |
| 6 | Senior calm | 10km route | 10km | Inter | 62 | 12 | 25 | 3 | 14 sem | F-1 (modéré senior) |
| 7 | Jeune Expert | 5km | 5km piste | Exp | 24 | 21 | 80 | 5 | 10 sem | F-1, F-3 (D+ faible, NO inject) |
| 8 | Trail court débutante | Trail | 25km D+1500 | Déb | 38 | 12 | 5 | 4 | 16 sem | F-3 (D+/km=60 → quantifié), F-4 |
| 9 | UTMB Confirmé | Ultra Trail | 170km D+10000 | Conf | 41 | 17 | 60 | 5 | 22 sem | F-1, F-2, F-3 |
| 10 | CCC Intermédiaire | Ultra Trail | 100km D+6100 | Inter | 36 | 15 | 30 | 5 | 20 sem | F-2 (limite ultra court/moyen), F-3 |
| 11 | Hyrox débutant | Hyrox | — | Déb | 29 | 13 | 10 | 4 | 14 sem | F-1 (petit volume, pas casser), F-3 skip |
| 12 | Marche-course trail | Trail | 21km D+700 | Déb | 48 | 8.5 | 0 | 3 | 18 sem | F-3 variante D, F-4 |
| 13 | Femme Marathon cycle | Marathon | 42.2km | Inter | 31 | 14 | 35 | 4 | 16 sem | F-1, F-4, vérif règle 14 REFERENTIEL |
| 14 | Maintien forme cyclique | Maintien | — | Conf | 45 | 15 | 40 | 4 | 12 sem | F-1 (PAS d'affûtage, pas de pic forcé) |
| 15 | Back-to-back races | 2× Ultra Trail | 87km puis 170km à 7 sem | Conf | 38 | 16.5 | 55 | 5 | 20 sem | F-1, F-2 (gestion deux pics) |

### 6.1 Critères de PASS par profil

Pour chaque profil, le plan généré doit valider TOUTES les checks suivantes :

- [ ] `weeklyVolumes[lastNonTaperWeek] / weeklyVolumes[3]` ≥ ratio table Section 2.3 selon niveau
- [ ] `weeklyVolumes[lastNonTaperWeek]` ≤ plafond absolu Section 2.3 selon niveau+goal
- [ ] Pic km dans la fenêtre `[0.65 ; 0.85] × durationWeeks`
- [ ] Si Ultra : pic D+ dans `[0.55 ; 0.80] × durationWeeks` (avant pic km)
- [ ] Si Ultra long ou extrême : affûtage S-3/S-2/S-1 sur km ET D+ selon table Section 3.3
- [ ] Pour CHAQUE session avec `D+/km > 30` : mainSet contient une phrase A/B/C/D Section 4.4
- [ ] SL pic Dim ≤ plafond table Section 5.3
- [ ] SL pic Dim ≥ `SL_S1 × ratio` floor table Section 5.3
- [ ] `∀i, SL[i] ≤ SL[i-1] × 1.25`
- [ ] `∀i, SL[i] ≤ 0.35 × weeklyVolume[i]` (Pfitzinger 1/3 rule)
- [ ] Doctrines D1 (allure cible non baissée), D6 (zéro poids), D9 (freq=X-1 course + 1 renfo), D10 (zéro cross-training), D17 (transparence si feasibility ≤ 30) intactes

### 6.2 Profils particuliers à challenger

- **Profil 11 (Hyrox débutant)** : risque de sur-corriger F-1 et imposer un pic excessif sur un goal qui a un volume nominal très bas. **Garde-fou** : Hyrox conserve les volumes REFERENTIEL (Déb 4x = 25 km pic), F-1 ne doit PAS imposer ratio ×1.6 si plafond REFERENTIEL est déjà atteint.
- **Profil 14 (Maintien)** : NE PAS appliquer F-1 (pas de pic, plans cycliques, plafond 150 % vol base). F-1 doit s'auto-désactiver pour goals "Maintien", "Perte de poids", "Remise en forme".
- **Profil 15 (back-to-back)** : tester la logique des deux affûtages, vérifier que la fenêtre 7 sem entre les 2 races déclenche bien le scénario "race 1 = pic test" décrit Section 3.4.

---

## SECTION 7 — POINTS DURS POUR LE DEV (à ne pas sur-simplifier)

1. **F-1 ratio uniforme ×1.4 = piège**. La progression DOIT être modulée par niveau ET clampée par un plafond absolu km. Sinon on régressera sur Débutant (sous-progresse) ou sur Expert ultra (sur-progresse).
2. **F-2 affûtage ne peut PAS être uniquement sur km**. Le D+ casse les ultra-runners, pas les km. La table doit avoir 2 colonnes parallèles (km% / D+%).
3. **F-3 auto-injection = bonne approche, MAIS** la phrase quantifiée Cory Smith (variante B) doit calculer le `+Y s/km` à partir du `D+/km` réel de la séance. Pas juste une phrase générique.
4. **F-4 plafond absolu indispensable**. Le `0.40 × distance race` casse au-delà du Trail moyen. Table par tier de course obligatoire.
5. **Ordre d'application des fix** : F-1 (rampe) → F-2 (affûtage, qui dépend du pic) → F-4 (SL, qui dépend de la rampe) → F-3 (injection wording, indépendant). Sinon F-2 peut être calculé sur un pic mal placé par F-1.
6. **Cas Maintien/Perte de poids/Remise en forme** : F-1 et F-2 doivent s'auto-désactiver. Plans cycliques, pas de pic ni d'affûtage.
7. **Doctrines projet** D1/D2/D6/D9/D10/D14/D16/D17/D18b/D20 doivent toutes rester intactes après application des 4 fix. Aucune des règles proposées ici ne contredit ces doctrines — vérification croisée faite.

---

## RÉFÉRENCES LITTÉRATURE CITÉES

- **Pfitzinger, P. & Douglas, S.** — *Advanced Marathoning* (3rd ed.). Plans 18/55, 18/70, 18/85, 24/55 etc. Surcharge progressive ch. 1, affûtage ch. 7, rolling/hilly course ch. 10, "no long run > 1/3 weekly mileage".
- **Daniels, J.** — *Daniels' Running Formula* (4th ed.). VDOT tables, ch. 4 phases of training, loi rendements décroissants.
- **Galloway, J.** — *Marathon: You Can Do It* / Run-Walk-Run method. Progression SL par paliers de 1-2 km, débutants.
- **Hammond, J.** — *Beginning Running* / "Train Like a Mother". Règle "doubler la base en 6 mois", cv=0 progressions.
- **Moehl, K.** — *Running Your First Ultra*. Affûtage trail "peak elevation 3 weeks before peak distance".
- **Meltzer, K.** — *Made for the Long Run*. Ultras 200+ mi, taper depth on elevation.
- **Friel, J.** — *The Triathlete's Training Bible* / *Going Long*. Phases spécifique trail = 3 sem hautes consécutives. Ch. 9 affûtage.
- **Smith, C.** — Trail Runner Magazine, taper protocols. Formule pénalité D+ (+3-5 s/km par 10m D+/km), descending muscles 21 days repair.
- **Lydiard, A.** — *Running with Lydiard*. Aerobic base building 3-6 months, décharge -15 à -20 %.
- **Berkien (renfo)** — protocoles renforcement musculaire coureur, 1×/sem compound.
- **REFERENTIEL-COACH.md v2** (projet interne) — tables volumes / SL pic par niveau / goal, règles transversales 1-16.

---

**Fin du livrable. Prêt pour discussion sur les chiffres précis avant code freeze.**
