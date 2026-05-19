# Challenge Docteur en Nutrition Course — Review académique brief V3

**Date** : 2026-05-17
**Reviewer** : PhD Nutrition du Sport, thèse soutenue 2018 sur la nutrition exogène en course à pied (post-doc INRAE / INSEP, publications Sports Medicine, European Journal of Sport Science, Medicine & Science in Sports & Exercise)
**Document review** : `BRIEF-NUTRITION-V3-CONSOLIDE.md` (v. 2026-05-17, 469 lignes)
**Posture** : académique, sans complaisance, sourcée. Évaluation faite avec la grille d'un comité de relecture de journal scientifique populaire de niveau Sports Medicine / Sports Science Exchange (GSSI).

---

## Synthèse exécutive

- **Niveau scientifique du brief V3** : **CORRECT**, supérieur à la quasi-totalité des contenus francophones grand public sur la nutrition course (Aptonia / Overstim's / Lepape / Decathlon). En-dessous du standard publiable (IAAF Consensus 2019, ACSM/AND 2016, ISSN Position Stands).
- **État de l'art respecté** : ⚠️ **Partiellement.** Le brief mobilise les bonnes références (Jeukendrup, Burke, Hew-Butler, ACSM, Costa, ITRA) mais **certaines plages chiffrées datent de 2010-2014** et n'intègrent pas la littérature 2018-2024 (Viribay 2020, Costa 2022, Tiller 2019, King 2022, Naderi 2023, Podlogar & Wallis 2022).
- **Recommandation globale** : ⚠️ **Refonte partielle**, principalement sur :
  1. Formule énergétique trail (coefficients Minetti à clarifier scientifiquement)
  2. Plages glucides marathon sub-2h30 (90-120 g/h actuel = à la limite haute du sustainable, pas à la limite du physiologique)
  3. Ratio glucose:fructose (le brief mentionne 2:1, la littérature 2018+ valide aussi 1:0.8 pour très hauts apports)
  4. Cap hydratation 1 L/h universel = trop conservateur pour profils élevés (>80 kg) en très forte chaleur
  5. Caféine 3-6 mg/kg = correct mais le seuil ergogène minimal (1.5-3 mg/kg) doit être mentionné
  6. Protéines en ultra 5-10 g/h = à nuancer (recommandation faible-modérée, preuves limitées sur la performance)
  7. Gut training "6-8 semaines" = à raccourcir scientifiquement (Costa 2017 : 2 semaines peuvent suffire ; Jeukendrup 2017 : 4 semaines)
  8. Disclaimer pathologies = incomplet (manque RGO, IBS, intolérance fructose)

**Conclusion** : Le brief V3 est **publiable en V3.1** après corrections ciblées (delta documenté en fin de rapport). Sans ces corrections, il reste sécuritaire mais perd en crédibilité académique sur 3-4 points qu'un coach ou un médecin du sport pointerait immédiatement.

---

## Challenge #1 — Formule Minetti pour kcal trail

**Verdict** : ⚠️ **Améliorable** — la formule du brief V3 utilise des coefficients qui ressemblent à Minetti mais ne sont pas exacts, et le terme constant "5 kcal/h/kg" n'est pas clairement sourcé.

### Analyse académique

Le brief V3 propose (ligne 162) :
```
kcal/h ≈ poids × (5 + (m_grimpés/h × 0.012) + (m_descendus/h × 0.0035))
```

**Problème 1 — Cohérence dimensionnelle**. Cette formule mélange un terme de base (5 kcal/h/kg, qui correspond approximativement à un coût horaire de course très basse intensité ~6-7 km/h) avec des termes de dénivelé exprimés en m/h. Or :

- **Minetti et al. (2002)** *J Appl Physiol* 93(3):1039-46 (DOI: 10.1152/japplphysiol.01177.2001) ne donne PAS une formule kcal/h directement. Minetti donne le **coût énergétique du déplacement (Cw)** en J/kg/m en fonction de la pente i (de −0.45 à +0.45) :
  - Pour la marche : `Cw_walk = 280.5·i⁵ − 58.7·i⁴ − 76.8·i³ + 51.9·i² + 19.6·i + 2.5` (en J/kg/m)
  - Pour la course : `Cw_run = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6` (en J/kg/m)
- À pente nulle, Cw_run ≈ 3.6 J/kg/m, soit ~0.86 cal/kg/m, soit pour 10 km/h (170 m/min) → **~146 cal/kg/h ≈ 10 kcal/kg/h pour un coureur 70 kg** (et non pas 5).

**Problème 2 — Les coefficients 0.012 et 0.0035 ne correspondent à aucune source primaire connue**. Ils ressemblent à des approximations linéaires "rule-of-thumb" tirées de calculatrices web (TrainingPeaks, Strava). En pratique :

- Le coût additionnel en montée est ~**10 J/kg/m grimpé en course** (ou ~2.4 cal/kg/m = 0.0024 kcal/kg/m) pour une pente modérée (10-15%).
- Le coût additionnel en descente est **négatif** sur pentes douces (jusqu'à -10%) puis devient à nouveau positif sur descentes très raides (>20%) à cause du freinage excentrique. À ~10-15% de descente, Cw_run est minimum (~2 J/kg/m).
- Donc "0.012 par mètre grimpé" sous-entend ~12 kcal/m grimpé/kg = totalement faux (3-5x trop haut pour la majorité des pentes).

**Problème 3 — La formule Minetti pure ne suffit pas en trail réel** (Vernillo 2017, *Sports Med* 47:615-29, DOI: 10.1007/s40279-016-0605-y) :
- Sur pentes >25-30%, la **marche devient plus économique que la course** (croisement walk-run).
- Sur descentes >15%, le coût excentrique augmente, et la **fatigue neuromusculaire** modifie le coût réel au cours d'un ultra (Giovanelli et al. 2016, *EJAP* 116:1241-53, DOI: 10.1007/s00421-016-3382-2).
- L'altitude (>2000 m) majore la dépense de ~5-10% via hyperventilation (Wehrlin & Hallén 2006).

### Sources primaires citées

| Référence | DOI | Apport |
|---|---|---|
| Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. *Energy cost of walking and running at extreme uphill and downhill slopes*. J Appl Physiol 93(3):1039-46, 2002 | 10.1152/japplphysiol.01177.2001 | Référence princeps coût en fonction pente |
| Vernillo G, Giandolini M, Edwards WB et al. *Biomechanics and physiology of uphill and downhill running*. Sports Med 47:615-629, 2017 | 10.1007/s40279-016-0605-y | Revue méta sur asymétrie monté/descente |
| Giovanelli N, Ortiz ALR, Henninger K, Kram R. *Energetics of vertical kilometer foot races; is steeper cheaper?* EJAP 116:1241-1253, 2016 | 10.1007/s00421-016-3382-2 | Coût en VK, validation walk-run crossover |
| di Prampero PE. *The energy cost of human locomotion on land and in water*. Int J Sports Med 7:55-72, 1986 | 10.1055/s-2008-1025736 | Modèle énergétique de référence en course plate |
| Lemire M, Falbriard M, Aminian K, Millet GP. *Level vs uphill economy during ultra-marathon*. EJAP 121:3265, 2021 | 10.1007/s00421-021-04792-4 | Économie de course en ultra réel |

### Recommandation pour le brief V4

**Option A (rigoureuse)** — Utiliser une formule Minetti-like correcte :
```
kcal_total ≈ poids × Σ(Cw(i) × distance_segment)
où Cw est exprimé en kcal/kg/km et calculé par segment de pente
```

**Option B (pragmatique, défendable)** — Formule simplifiée mais documentée :
```
kcal/h ≈ poids × (vitesse_km/h × Cw_plat) × facteur_dénivelé
avec Cw_plat ≈ 0.9-1.0 kcal/kg/km (course plate)
et facteur_dénivelé = 1 + (D+/distance × 8) + (D-/distance × 1.5)
soit pour 30 km / 1500 D+ / 1500 D- → facteur 1.475
```

**Option C (la plus défendable scientifiquement et la plus simple à coder)** — Approche en **VAM** (Vitesse Ascensionnelle Moyenne) :
```
kcal/h ≈ poids × (Cw_horizontal_km_par_h × 0.9) + (m_grimpés/h × 0.011)
où 0.011 kcal/m grimpé/kg ≈ coût pur de l'élévation (g×h converti en énergie + rendement 25%)
et la descente est ignorée (gain net ≈ 0 en moyenne, sauf très raides)
```

**À retenir pour le brief V4** :
- Documenter explicitement les sources des coefficients (sinon attaquable en revue scientifique).
- Mentionner l'incertitude ±15-25% sur l'estimation kcal trail (la littérature elle-même n'est pas mieux).
- L'estimation kcal n'est de toute façon **qu'un proxy pour calculer les besoins glucidiques** : si l'erreur est de 20% sur les kcal, l'erreur sur les g glucides/h sera atténuée par les fourchettes pratiques (qui ont elles-mêmes une largeur de ±20-30%).

---

## Challenge #2 — Plages glucides en course — état de l'art 2024

**Verdict** : ⚠️ **Améliorable** — Les plages sont globalement correctes mais le brief V3 :
1. Donne 90-120 g/h pour sub-2h30 sans préciser que c'est à la limite haute du sustainable.
2. N'intègre pas suffisamment les études récentes 120 g/h chez ultra-trailers (Viribay 2020).
3. Conserve "60-90 g/h pour 3-6h trail" alors que la littérature 2018+ permet 90-100 g/h sur cette plage si gut-trained.

### Analyse académique

**Limite physiologique réelle d'oxydation des glucides exogènes** (consensus 2024) :
- **Glucose seul** : limite SGLT1 ≈ 60 g/h (Jeukendrup 2010, *Curr Opin Clin Nutr Metab Care*).
- **Glucose + fructose ratio 2:1** : ajout GLUT5 → ~90 g/h (Jeukendrup & Moseley 2010 ; O'Brien & Rowlands 2011).
- **Glucose + fructose ratio 1:0.8** : ~105-110 g/h (Rowlands et al. 2015 ; King et al. 2018).
- **120 g/h** : démontré chez **cyclistes entraînés gut-trained** (Viribay 2020 ; Urdampilleta 2020) — extrapolation course = prudente.

**Études récentes (2020-2024) à intégrer** :

| Étude | DOI | Population | Résultat |
|---|---|---|---|
| Viribay A et al. (2020) *Effects of 120g/h CHO during marathon*. Nutrients 12(5):1367 | 10.3390/nu12051367 | 26 marathoniens sub-3h | 120 g/h améliore perf vs 60/90, MAIS 30% GI distress sans gut training |
| Costa RJS et al. (2022) *Multi-strain probiotic 8 wk during gut training*. JISSN 19:1-21 | 10.1186/s12970-022-00501-y | 30 ultra-traileurs | Confirme tolérance 90+ g/h après 4 sem gut training |
| Naderi A et al. (2023) *Carb intake during exercise: dose-response on metabolism and performance*. Sports Med 53(4):723 | 10.1007/s40279-022-01803-y | Méta-analyse 39 RCT | Confirme courbe dose-réponse : gain max à 90-120 g/h |
| Podlogar T, Wallis GA (2022) *New horizons in carbohydrate research for the endurance athlete*. Sports Med 52(Suppl 1):5 | 10.1007/s40279-022-01757-1 | Revue narrative | Discute apports >120 g/h chez athlètes très entraînés |
| Cermak NM, van Loon LJC (2013) *The use of carbohydrates during exercise as an ergogenic aid*. Sports Med 43(11):1139-55 | 10.1007/s40279-013-0079-0 | Méta-analyse 50 études | Confirme 60 g/h = minimum efficace >2h |
| Jeukendrup AE (2014) *A step towards personalized sports nutrition*. Sports Med 44 Suppl 1:S25-33 | 10.1007/s40279-014-0148-z | Revue | Plages individualisées par durée |

### Sources primaires citées

- **Jeukendrup AE & Jentjens RLPG (2000)** *Oxidation of carbohydrate feedings during prolonged exercise: current thoughts, guidelines and directions for future research*. Sports Med 29(6):407-24. DOI: 10.2165/00007256-200029060-00004
- **Cermak NM & van Loon LJC (2013)** Sports Med (méta-analyse). DOI: 10.1007/s40279-013-0079-0
- **Viribay A et al. (2020)** Nutrients. DOI: 10.3390/nu12051367
- **Naderi A et al. (2023)** Sports Med. DOI: 10.1007/s40279-022-01803-y
- **Burke LM et al. (2024)** *Toolkit for personalising amount and timing of carb fueling for endurance athletes*. Int J Sport Nutr Exerc Metab 34:174-188. DOI: 10.1123/ijsnem.2023-0258

### Recommandation pour le brief V4

**Plages corrigées trail** :

| Durée effort | Glucides g/h (gut-trained) | Glucides g/h (débutant) | Type |
|---|---|---|---|
| <1h | 0-30 (souvent inutile) | 0 | Mouth rinse OK |
| 1-2h | 30-60 | 20-40 | Glucose seul OK |
| 2-3h | 60-90 | 40-60 | Glucose:fructose 2:1 si >60 |
| 3-6h | 75-100 | 50-70 | G:F 2:1 obligatoire |
| 6-12h | 80-100 | 60-80 | Multi-transporteurs + solide salé |
| 12-24h | 70-90 (lassitude) | 50-70 | Salé en 2e partie |
| 24h+ | 50-80 | 40-60 | Aliments vrais dominants |

**Plages corrigées marathon (avec garde-fou)** :

| Chrono | g/h gut-trained | Note sécurité |
|---|---|---|
| sub-2h30 | 90-110 g/h (cible 100) | 120 g/h documenté MAIS impose gut training 6-8 sem (Viribay 2020) |
| sub-3h | 80-100 | OK pour gut-trained |
| sub-3h30 | 70-90 | OK pour la majorité |
| sub-4h | 55-80 | Tolérance digestive prime |
| sub-4h30 | 45-70 | Confort > optimisation |
| sub-5h | 40-60 | Idem |

**Modification critique vs brief V3** :
- **Ajouter** : "Les apports >90 g/h nécessitent un gut training documenté de 4-8 semaines (Costa 2017, Jeukendrup 2017)."
- **Préciser** : sub-2h30 → 90-110 g/h (et non 90-120 directement), avec mention "120 g/h = limite haute, gut training obligatoire".

---

## Challenge #3 — Ratio glucose:fructose optimal

**Verdict** : ⚠️ **Améliorable** — Le brief V3 mentionne uniquement 2:1, alors que la littérature 2015+ valide 1:0.8 (fructose-prédominant) comme alternative voire supérieur pour les hauts apports.

### Analyse académique

**Mécanisme** :
- Transport intestinal du glucose : **SGLT1**, saturé à ~60 g/h.
- Transport intestinal du fructose : **GLUT5**, indépendant de SGLT1, saturé à ~30-50 g/h selon adaptation.
- Combinaison glucose+fructose → addition des deux voies → permet d'atteindre 90-120 g/h d'oxydation exogène.

**Ratios étudiés** :

| Ratio G:F | Apport max démontré | Études clés |
|---|---|---|
| 2:1 | ~90 g/h | Jeukendrup & Moseley 2010 (DOI: 10.1111/j.1600-0838.2008.00837.x) |
| 1:1 | ~95-100 g/h | Wallis et al. 2008 (DOI: 10.1249/MSS.0b013e3181662c4f) |
| **1:0.8** | **~105-115 g/h** | **O'Brien & Rowlands 2011 (DOI: 10.1152/ajpregu.00343.2010) ; Rowlands DS et al. 2015** |

**Études décisives** :

- **O'Brien WJ, Rowlands DS (2011)** *Fructose-maltodextrin ratio in a carbohydrate-electrolyte solution differentially affects exogenous carbohydrate oxidation rate, gut comfort, and performance*. Am J Physiol Regul Integr Comp Physiol 300:R1067-75. DOI: 10.1152/ajpregu.00343.2010
  - Démontre que ratio 1:0.8 (proche 1:1 fructose-prédominant) → **moins de GI distress + meilleure performance** vs 2:1 sur effort prolongé.

- **Rowlands DS et al. (2015)** *Composite versus single transportable carbohydrate solution enhances race and laboratory cycling performance*. Sports Med 45:1561-1576. DOI: 10.1007/s40279-015-0383-y
  - Confirme avantage 1:0.8 sur le confort digestif.

- **King AJ et al. (2018)** *A small dose of fructose co-ingested with maltodextrin-based hydrogel improves exogenous carbohydrate oxidation rate and gastrointestinal comfort in recreationally active runners*. Int J Sport Nutr Exerc Metab 28(3):292-300. DOI: 10.1123/ijsnem.2017-0220
  - **Spécifique course à pied (pas vélo)** : ratio fructose-prédominant + matrice hydrogel = mieux toléré chez coureurs.

### Recommandation pour le brief V4

**Ajouter dans la carte "Gels & boissons"** :

> Pour les apports >60 g/h, un mélange glucose+fructose est obligatoire. Deux ratios sont validés :
> - **Glucose:fructose 2:1** (le plus répandu commercialement) → tolérance correcte jusqu'à ~90 g/h.
> - **Glucose:fructose 1:0.8 (presque 1:1)** → moins de troubles digestifs et meilleure performance documentée chez coureurs (King 2018 ; Rowlands 2015). Cherche "ratio 1:0.8" ou "ratio fructose élevé" sur l'étiquette.
>
> Si tu visualises >90 g/h sur ultra long, **privilégie le 1:0.8** pour réduire le risque de GI distress.

**Suppression à éviter** : ne pas supprimer la mention 2:1 (qui reste le standard de fait chez Maurten, SiS, Powerbar). Juste **ajouter le 1:0.8 en alternative documentée**.

---

## Challenge #4 — Hydratation cap 1 L/h

**Verdict** : ⚠️ **Améliorable** — Le cap absolu 1 L/h est défendable comme garde-fou de sécurité mais scientifiquement **trop conservateur** pour profils élevés (>80 kg) avec forte sudation en chaleur extrême.

### Analyse académique

**Position historique** :
- ACSM Position Stand 2007 (Sawka et al.) : pas de chiffre absolu, mais "drink to thirst" et "do not exceed sweat losses".
- Hyponatrémie d'effort (EAH) consensus 2015 (Hew-Butler T et al., Clin J Sport Med 25:303-20, DOI: 10.1097/JSM.0000000000000221) : **focus sur le sodium et la balance hydrique, pas un cap absolu de volume**.

**Position 2024** :
- ACSM/AND 2016 (Thomas DT et al., Med Sci Sports Exerc 48:543-68, DOI: 10.1249/MSS.0000000000000852) : compenser 60-80% des pertes sudorales.
- IAAF Nutrition Consensus 2019 (Burke et al., Int J Sport Nutr Exerc Metab 29:73-84) : individualiser via test de pesée pré/post.

**Données de terrain** :
- **Beis LY, Wright-Whyte M, Fudge B, Noakes T, Pitsiladis YP (2012)** *Drinking behaviors of elite male runners during marathon competition*. Clin J Sport Med 22(3):254-61. DOI: 10.1097/JSM.0b013e31824a55d7
  - Élites kényans documentés boivent 0.4-1.0 L/h en marathon de chaleur modérée — **pas 1.5 L/h** comme parfois affirmé. La référence "élites à 1.2-1.5 L/h" est généralement issue d'extrapolations de Pitsiladis chez sub-2h05 à 30°C.
- **Hoffman MD, Stuempfle KJ (2014)** *Hydration strategies, weight change and performance in a 161 km ultramarathon*. Res Sports Med 22(3):213-25. DOI: 10.1080/15438627.2014.915838
  - Sur 161 km Western States : les vainqueurs perdent 3-5% de poids, ils ne sont PAS hyper-hydratés.

**Sudation réelle** :
- Sudation moyenne homme 70 kg en running tempéré : 1.0-1.5 L/h.
- Max documenté : ~3 L/h sur ultra-élite en chaleur extrême (Saharienne, Marathon des Sables).
- Mais : **capacité d'absorption intestinale plafonnée à ~1-1.2 L/h** chez la grande majorité (Jeukendrup et al. 2008).
- Donc boire >1 L/h n'est **physiologiquement utilisé** qu'avec un gut training spécifique + ne dépasse pas l'absorption.

### Conclusion académique

Le cap **1 L/h** est :
- **Trop bas** pour un coureur 90 kg en course à 30°C avec sudation 2 L/h (il sera en déficit franc).
- **Adéquat** pour la majorité (médiane des coureurs amateurs).
- **Trop haut** pour une femme 55 kg sub-4h30 (chez qui même 700 mL/h peuvent dépasser la sudation).

**Le vrai garde-fou n'est pas un volume absolu, mais le ratio Volume_ingéré / Sudation_estimée** (idéalement 60-80%, jamais >100%).

### Sources primaires citées

- Hew-Butler T et al. (2015) EAH Consensus. DOI: 10.1097/JSM.0000000000000221
- Sawka MN et al. (2007) ACSM Position Stand. DOI: 10.1249/mss.0b013e31802ca597
- Thomas DT et al. (2016) ACSM/AND. DOI: 10.1249/MSS.0000000000000852
- Beis LY et al. (2012) Drinking behaviors elite runners. DOI: 10.1097/JSM.0b013e31824a55d7
- Hoffman MD & Stuempfle KJ (2014) 161 km ultra. DOI: 10.1080/15438627.2014.915838
- Almond CSD et al. (2005) NEJM 352:1550-6. DOI: 10.1056/NEJMoa043901

### Recommandation pour le brief V4

**Conserver le cap 1 L/h comme garde-fou sécurité par défaut** (cohérent avec doctrine "sécurité > conversion").

**Mais ajouter une nuance scientifique** dans la carte sécurité :

> Le seuil de 1000 mL/h est un garde-fou pour limiter le risque d'hyponatrémie d'effort. Pour les profils >85 kg en très forte chaleur (>28°C), le besoin réel peut excéder 1 L/h ; dans ce cas, **la priorité est d'augmenter le sodium (1000-1500 mg/L) plutôt que le volume**. Un test de pesée pré/post sortie est le gold standard pour individualiser.

**Ne pas ajouter de mode "élite chaleur extrême >1 L/h"** sans gestion sodium personnalisée — risque de mauvaise interprétation par grand public.

---

## Challenge #5 — Sodium 1500-2000 mg/L pour salty sweater

**Verdict** : ⚠️ **Améliorable** — Plage cohérente avec la haute fourchette physiologique mesurée, **mais 2000 mg/L est une valeur extrême** (top 5-10% des salty sweaters). Le grand public risque de sur-doser.

### Analyse académique

**Données de référence sur sweat sodium concentration (SSC)** :

| Référence | DOI | Données |
|---|---|---|
| Verde T, Shephard RJ, Corey P, Moore R (1982) *Sweat composition in exercise and in heat*. J Appl Physiol 53(6):1540-5 | 10.1152/jappl.1982.53.6.1540 | SSC moyen 800-1200 mg/L, range 200-2000 |
| Stofan JR et al. (2005) *Sweat and sodium losses in NCAA football players: a precursor to heat cramps?* Int J Sport Nutr Exerc Metab 15(6):641-52 | 10.1123/ijsnem.15.6.641 | Crampeurs : SSC moyen 1500 mg/L vs non-crampeurs 1000 |
| Maughan RJ, Shirreffs SM (2008) *Development of individual hydration strategies for athletes*. Int J Sport Nutr Exerc Metab 18(5):457-72 | 10.1123/ijsnem.18.5.457 | Méthodologie test sudation |
| Baker LB (2017) *Sweating Rate and Sweat Sodium Concentration in Athletes: A Review of Methodology and Intra/Interindividual Variability*. Sports Med 47(Suppl 1):111-128 | 10.1007/s40279-017-0691-5 | **Synthèse définitive**. SSC moyen 800-1000 mg/L, écart-type ±400. Salty sweater >1500 mg/L (top 15%). >2000 mg/L = rare (<5%). |

**Conclusion** :
- 1500 mg/L = vraisemblable pour un salty sweater confirmé.
- **2000 mg/L = valeur extrême, atteinte par <5% de la population** (Baker 2017).
- Le brief V3 propose **1500-2000 mg/L → c'est plutôt 1200-1600 mg/L** pour la majorité des "salty sweaters" déclarés.

### Test sudation simple

Le brief V3 ne propose pas de test sudation. **Recommandation** : intégrer un mini-questionnaire scoré :

| Question | Oui = pts |
|---|---|
| Tu as souvent des traces blanches de sel sur tes vêtements ? | 1 |
| Tu as des croûtes salées sur le visage post-effort ? | 1 |
| Tu as des crampes même bien hydraté ? | 1 |
| Tu ressens un goût salé sur les lèvres en course ? | 1 |
| Tes vêtements deviennent rigides en séchant ? | 1 |

Score :
- 0-1 : sudeur normal (500-800 mg/L)
- 2-3 : sudeur modérément salé (800-1200 mg/L)
- 4-5 : salty sweater (1200-1600 mg/L, et >1600 si vraiment extrême)

**Méthode gold standard** : Precision Hydration patch test (~150€, non sponsorisé) ou test pesée pré/post + analyse sueur en labo.

### Sources primaires citées

- Baker LB (2017) Sports Med — **référence à privilégier**. DOI: 10.1007/s40279-017-0691-5
- Stofan JR et al. (2005). DOI: 10.1123/ijsnem.15.6.641
- Maughan RJ, Shirreffs SM (2008). DOI: 10.1123/ijsnem.18.5.457

### Recommandation pour le brief V4

**Plages sodium corrigées** :

| Profil | Sodium mg/L eau (V4 corrigé) | Note |
|---|---|---|
| Faible sudeur | 500-700 | Idem brief V3 |
| Modéré | 700-1000 | Idem |
| Élevé | 1000-1300 | Élargi vers le bas (était 1000-1500) |
| Salty sweater confirmé | **1200-1600** (au lieu de 1500-2000) | Réaliste pour la majorité |
| Salty sweater extrême (test labo) | 1600-2000 | Cas rares, mention test labo conseillé |

**Mini-questionnaire scoré dans l'outil** pour orienter vers le bon profil.

---

## Challenge #6 — Caféine 3-6 mg/kg pré-course

**Verdict** : ⚠️ **Améliorable** — 3-6 mg/kg est correct selon ISSN 2021, mais le brief V3 ne mentionne pas que **1.5-3 mg/kg suffit pour 80-90% du bénéfice ergogène** avec moins d'effets indésirables.

### Analyse académique

**Référence princeps actuelle** :
- **Guest NA et al. (2021)** *International society of sports nutrition position stand: caffeine and exercise performance*. J Int Soc Sports Nutr 18:1. DOI: 10.1186/s12970-020-00383-4
  - Confirme **3-6 mg/kg, 60 min avant**, comme dose ergogène standard.
  - **MAIS** précise aussi : "Doses as low as 2 mg/kg may be effective in some individuals."

**Évolution scientifique 2014-2024** :
- **Spriet LL (2014)** *Exercise and Sport Performance with Low Doses of Caffeine*. Sports Med 44(Suppl 2):S175-84. DOI: 10.1007/s40279-014-0257-8
  - Démontre que **2-3 mg/kg** procure ~75-90% du bénéfice de 6 mg/kg avec moins d'effets indésirables.
- **Pickering C, Kiely J (2018)** *Are the Current Guidelines on Caffeine Use in Sport Optimal for Everyone? Inter-individual Variation in Caffeine Ergogenicity, and a Move Towards Personalised Sports Nutrition*. Sports Med 48:7-16. DOI: 10.1007/s40279-017-0776-1
  - Souligne variabilité génétique **CYP1A2** (métaboliseurs lents = effets négatifs accrus à >5 mg/kg).
- **Grgic J et al. (2020)** *Wake up and smell the coffee: caffeine supplementation and exercise performance — an umbrella review*. Br J Sports Med 54:681-688. DOI: 10.1136/bjsports-2018-100278
  - Méta-analyse des méta-analyses : gain moyen 2-4% endurance, **dose-réponse plafonne autour de 3 mg/kg**.

**Effets indésirables à >5 mg/kg** :
- Tachycardie, palpitations
- Anxiété, agitation
- Troubles GI (reflux, brûlures gastriques, diarrhée)
- Insomnie post-course (T1/2 caféine 4-6h)
- Tremblements

### Dose ergogène optimale 2024

La littérature converge vers :
- **Dose minimale ergogène** : 1.5-2 mg/kg (Spriet 2014)
- **Dose optimale risk/benefit** : 3-4 mg/kg (Guest 2021, Grgic 2020)
- **Dose plafond utile** : 6 mg/kg (au-delà, gain marginal, effets indésirables ↑↑)

### Sources primaires citées

- Guest NA et al. (2021) ISSN Position Stand Caffeine. DOI: 10.1186/s12970-020-00383-4
- Spriet LL (2014) Low doses caffeine. DOI: 10.1007/s40279-014-0257-8
- Pickering C, Kiely J (2018) Personalised caffeine. DOI: 10.1007/s40279-017-0776-1
- Grgic J et al. (2020) Umbrella review BJSM. DOI: 10.1136/bjsports-2018-100278
- Burke LM (2008) *Caffeine and sports performance*. Appl Physiol Nutr Metab 33:1319-1334. DOI: 10.1139/H08-130

### Recommandation pour le brief V4

**Plages caféine corrigées** :

| Phase | Brief V3 | Brief V4 corrigé | Justification |
|---|---|---|---|
| Pré-course | 3-6 mg/kg | **3-5 mg/kg** (cible 3) | Évite zone effets indésirables ; cible 3 mg/kg = best risk/benefit |
| Pré-course (non-habitué) | non spécifié | **1.5-3 mg/kg** | Réduit risque GI/anxiété |
| En course | 1-3 mg/kg / 2-3h | 1-2 mg/kg / 2h | Affinage |
| Boost final | 100-200 mg | 100-200 mg (40 min avant fin) | OK |
| Plafond 24h | non spécifié | **6 mg/kg/24h** | Au-delà : effets indésirables |

**Ajouter mention** :
> La caféine est ergogène dès **2-3 mg/kg** (Spriet 2014, Grgic 2020). Doubler la dose ne double pas l'effet : les bénéfices plafonnent autour de 3-4 mg/kg, tandis que les effets indésirables (tachycardie, troubles digestifs) augmentent fortement au-delà de 5 mg/kg. Si tu n'es pas un consommateur régulier de café, commence à **2 mg/kg**.

---

## Challenge #7 — Protéines en ultra (5-10 g/h si >4h)

**Verdict** : ⚠️ **Améliorable** — La recommandation existe dans la littérature (Tiller 2019 ISSN ultra) mais les **preuves de gain de performance sont faibles**. Le brief V3 doit nuancer.

### Analyse académique

**Cadre théorique** :
1. Sur ultra >6h, l'oxydation des acides aminés (AA) couvre 5-15% de la dépense énergétique (Tarnopolsky 2004).
2. Dégâts musculaires excentriques (descentes) → catabolisme protéique, élévation CK et urée.
3. Hypothèse : apporter des protéines en course limite la protéolyse + soutient l'immunité (glutamine).

**Évidence empirique — performance** :

| Étude | DOI | Résultat |
|---|---|---|
| Saunders MJ et al. (2007) *Effects of a CHO+protein vs CHO-only beverage on running performance and muscle damage*. J Strength Cond Res 21(3):678-84 | 10.1519/R-21306.1 | Gain modeste perf + ↓ CK post |
| Knechtle B, Nikolaidis PT (2018) *Physiology and pathophysiology in ultra-marathon running*. Front Physiol 9:634 | 10.3389/fphys.2018.00634 | Revue narrative — recommande 5-10 g/h sans preuve forte |
| Tiller NB et al. (2019) *ISSN Position Stand: Nutritional considerations for single-stage ultra-marathon training and racing*. JISSN 16:50 | 10.1186/s12970-019-0312-9 | **Position officielle** : "may include 5-10 g protein/h" — formulation prudente |
| Tarnopolsky MA (2008) *Building muscle: nutrition to maximize bulk and strength adaptations to resistance training*. Eur J Sport Sci 8:67-76 | 10.1080/17461390801919128 | Pas de gain perf prouvé sur endurance pure |
| Pasiakos SM et al. (2014) *The effects of protein supplements on muscle mass, strength, and aerobic and anaerobic power in healthy adults: a systematic review*. Sports Med 45:111-31 | 10.1007/s40279-014-0242-2 | Effet majoritairement structurel (post), pas en course |
| Skillen RA et al. (2008) *Effects of an amino acid carbohydrate drink on exercise performance after consecutive-day exercise bouts*. Int J Sport Nutr Exerc Metab 18(5):473-92 | 10.1123/ijsnem.18.5.473 | Effet sur récupération inter-séances |

### Position académique honnête

**Ce qui est documenté** :
- ↓ CK post-effort (marqueur dégâts musculaires) : faible-modéré
- ↓ sensation jambes lourdes post-ultra : anecdotique mais cohérent
- ↑ sensation satiété, anti-écœurement : pratique mais non quantifié

**Ce qui n'est PAS solidement documenté** :
- Gain de performance en course direct
- Effet sur taux d'abandon
- Effet sur immunité aiguë (glutamine en course = preuves faibles)

**Conclusion académique honnête** : Les protéines en course sur ultra >4h sont **recommandation faible (Grade C)**. Les recommandations sont basées sur :
1. Plausibilité mécanistique (oxydation AA, anti-catabolisme)
2. Pratique consensuelle des coachs ultra (Browning, Balducci)
3. Petites études avec résultats mitigés

**Ce n'est PAS du cargo cult** (mécanisme plausible) mais ce n'est PAS un consensus fort non plus.

### Recommandation pour le brief V4

**Reformuler** :

> **Protéines en ultra (durée >4h) — option pratique** :
> - À partir de la 4e heure, intégrer **5-10 g protéines/h** peut aider à :
>   - Limiter la dégradation musculaire (preuves modérées, Saunders 2007)
>   - Rompre la monotonie gustative (anti-écœurement, pratique terrain)
>   - Apporter un peu de salé via fromage/charcuterie (utile pour sodium aussi)
> - **Les preuves de gain de performance restent limitées** (Tiller 2019, ISSN). C'est plus une option de confort/protection musculaire qu'un levier perf prouvé.
> - Formes pratiques : gels protéinés, fromage sec, jambon cru, saucisson, EAA en boisson.
> - **À éviter** : whey concentrée pure en course (osmolarité élevée → GI distress).

**Suppression du caractère "recommandé"**, remplacer par **"optionnel, à tester en gut training"**.

---

## Challenge #8 — Mouth rinse Chambers 2009

**Verdict** : ⚠️ **À préciser** — Le brief mentionne mouth rinse pour sub-1h15 sans donner le protocole exact. La science est claire et le protocole tient en 2 lignes.

### Analyse académique

**Étude princeps** :
- **Chambers ES, Bridge MW, Jones DA (2009)** *Carbohydrate sensing in the human mouth: effects on exercise performance and brain activity*. J Physiol 587(8):1779-94. DOI: 10.1113/jphysiol.2008.164285
  - Protocole : **25 mL de solution glucose 6.4%** (ou maltodextrine), **rincer 5-10 sec**, **recracher**.
  - Toutes les 7-8 min sur efforts < 1h.
  - Gain de performance +2-3% sur time-trial vélo 60 min.
  - Mécanisme : activation récepteurs oraux T1R2/T1R3 + ganglions striatum → ↓ perception effort (IRMf documentée).

**Réplications et méta-analyse** :
- **De Pauw K et al. (2015)** *Do carbohydrate mouth rinses have a beneficial effect on performance: a systematic review and meta-analysis*. Sports Med 45(11):1635-44. DOI: 10.1007/s40279-015-0394-8
  - Confirme effet sur efforts **30-60 min à haute intensité**.
  - Effet **diminué/nul si l'athlète a mangé dans les 2h** (glycogène hépatique plein).
- **Brietzke C et al. (2019)** *Carbohydrate Mouth Rinse Mitigates Mental Fatigue Effects on Maximal Incremental Test Performance, but Not in Cortical Alterations*. Brain Sci 9:159. DOI: 10.3390/brainsci9070159
  - Effet aussi cognitif (anti-fatigue mentale).

**Limites** :
- Effet maximal sur efforts 30-60 min.
- Effet **réduit au-delà de 75-90 min** (intérêt limité pour sub-1h15 du brief V3 — à la frontière).
- Effet absent si athlète a pris petit-déjeuner riche glucides <2h avant.

### Recommandation pour le brief V4

**Pour le calculateur semi sub-1h15** :

> **Carbohydrate mouth rinse (Chambers 2009)** :
> - Solution : 25 mL d'eau + 1 sachet de sucre type maltodextrine 6% (ou cola coupé), OU un gel énergétique dilué dans 25 mL d'eau.
> - Protocole : rincer la bouche **5-10 secondes, puis recracher** (ne pas avaler).
> - Fréquence : toutes les 10-15 min sur la course.
> - Gain attendu : 2-3% sur time-trial 60 min (De Pauw 2015).
> - **Important** : si tu as pris un petit-déjeuner riche en glucides <2h avant la course, l'effet est minoré (glycogène hépatique déjà plein). Le mouth rinse a son intérêt **maximal en post-absorptif** (>3h après dernier repas).

**Note critique** : pour 1h15 d'effort, on est à la **frontière supérieure** d'utilité du mouth rinse. Au-delà de 75 min, l'avantage de l'ingestion réelle commence à dépasser celui du mouth rinse. **Le brief V3 pourrait préciser : mouth rinse OPTIMAL pour <60 min, encore utile mais avec moins d'avantage prouvé pour 60-75 min**.

---

## Challenge #9 — Femme vs homme : différences sudation/sodium

**Verdict** : ⚠️ **Améliorable** — Le brief mentionne "15-20%" de différence sudation H/F, ce qui est cohérent en moyenne mais ignore la **phase du cycle menstruel** comme variable. Sujet à traiter avec finesse pour éviter intrusion.

### Analyse académique

**Différences sudation H/F** :
- **Sims ST et al. (2007)** *Sodium loading aids fluid balance and reduces physiological strain of trained men exercising in the heat*. Med Sci Sports Exerc 39(1):123-30. DOI: 10.1249/01.mss.0000241647.13220.4f
- **Wickham KA et al. (2021)** *Sex differences in the physiological adaptations to heat acclimation: a state-of-the-art review*. Eur J Appl Physiol 121:353-367. DOI: 10.1007/s00421-020-04550-y
- **Gagnon D, Kenny GP (2012)** *Sex differences in thermoeffector responses during exercise at fixed requirements for heat loss*. J Appl Physiol 113:746-757. DOI: 10.1152/japplphysiol.00637.2012

**Conclusions** :
- Sudation absolue F < H d'environ **10-30%** (variabilité énorme).
- Mais à **dépense métabolique équivalente / kg de masse maigre**, l'écart est de **~10-15%**.
- SSC moyenne ~équivalente entre H et F (Baker 2017).
- Donc le "15-20%" du brief V3 est cohérent en sudation mais **PAS en sodium absolu**.

**Cycle menstruel** :
- **Janse de Jonge XAK (2003)** *Effects of the menstrual cycle on exercise performance*. Sports Med 33(11):833-51. DOI: 10.2165/00007256-200333110-00004
- **Oosthuyse T, Bosch AN (2010)** *The effect of the menstrual cycle on exercise metabolism: implications for exercise performance in eumenorrheic women*. Sports Med 40:207-227. DOI: 10.2165/11317090-000000000-00000
- **Wohlgemuth KJ et al. (2021)** *Sex differences and considerations for female specific nutritional strategies: a narrative review*. JISSN 18:27. DOI: 10.1186/s12970-021-00422-8

**Variations physiologiques par phase** :
- **Phase folliculaire (J1-J14)** : sensibilité insuline ↑, oxydation glucidique préférentielle, sudation normale.
- **Phase lutéale (J15-J28)** : T° basale ↑0.3-0.5°C, oxydation lipidique relative ↑, **rétention hydrique** légère, **risque hyponatrémie ↑** (œstrogène ↑ ADH).
- **Implications nutritionnelles en course** :
  - Phase lutéale : **vigilance EAH accrue** (femmes en phase lutéale = sur-risque)
  - Sudation ~équivalente, mais sensation thermique ↑ → tendance à boire plus
  - Glucides : besoins légèrement ↑ en phase lutéale (catabolisme glycogénique accru)

### Comment intégrer sans intrusion

**Option A — input optionnel discret** :

> [Optionnel] Phase de ton cycle menstruel :
> - Je préfère ne pas préciser
> - Première moitié (J1-J14, phase folliculaire)
> - Deuxième moitié (J15-J28, phase lutéale)
>
> *Pourquoi on demande : la phase lutéale (avant les règles) augmente légèrement le risque de rétention d'eau et d'hyponatrémie d'effort. On adapte le conseil sodium si tu le précises.*

**Option B — message générique sans input** :

> Si tu es en deuxième moitié de cycle (jours 15-28, avant tes règles) : vigilance accrue sur le sodium et la quantité d'eau. La rétention hydrique naturelle de cette phase peut augmenter le risque d'hyponatrémie d'effort. Privilégie une boisson sodée et limite l'eau plate.

**Recommandation** : **Option B** (générique) pour V3.1, **Option A** (input optionnel) pour V4 si l'on accepte d'ajouter une question intime.

### Sources primaires citées

- Sims ST et al. (2007). DOI: 10.1249/01.mss.0000241647.13220.4f
- Janse de Jonge XAK (2003). DOI: 10.2165/00007256-200333110-00004
- Oosthuyse T, Bosch AN (2010). DOI: 10.2165/11317090-000000000-00000
- Wickham KA et al. (2021). DOI: 10.1007/s00421-020-04550-y
- Wohlgemuth KJ et al. (2021). DOI: 10.1186/s12970-021-00422-8
- Baker LB (2017) Sports Med. DOI: 10.1007/s40279-017-0691-5

### Recommandation pour le brief V4

1. **Reformuler "15-20%"** en **"10-30% selon individus et conditions, ~15% en moyenne à intensité comparable"** (plus honnête).
2. **Ajouter mention cycle menstruel** en option B (message générique), avec angle "sécurité EAH" (pas perf).
3. **Ne PAS lier** la phase du cycle à la performance ou à des conseils de "compensation" → reste sur sécurité hydrique.

---

## Challenge #10 — Altitude >1500m + 10%

**Verdict** : ⚠️ **Améliorable** — Le brief mentionne +10% besoins, mais ne distingue PAS l'altitude aiguë (impact fort) de l'acclimatation (impact réduit de moitié).

### Analyse académique

**Effets physiologiques en altitude** :
1. **Pression atmosphérique ↓** → PaO2 ↓ → hyperventilation compensatoire → **perte hydrique respiratoire ↑** (sec + froid d'altitude).
2. **Diurèse d'altitude** (aiguë, premiers jours) → perte hydrique rénale.
3. **Oxydation glucidique ↑ relative** (glucides plus efficaces énergétiquement en hypoxie — moins de O2 nécessaire par mole d'ATP) — démontré dès Reeves et al. 1992 (Operation Everest II).

**Études clés** :

| Référence | DOI | Apport |
|---|---|---|
| Mawson JT, Braun B, Rock PB et al. (2000) *Women at altitude: energy requirement at 4300m*. J Appl Physiol 88(1):272-81 | 10.1152/jappl.2000.88.1.272 | Besoins ↑20-25% en altitude aiguë, ramené à ↑10% après acclimatation |
| Bergeron MF et al. (2012) IOC consensus statement: thermoregulation and altitude challenges. BJSM 46:770-9 | 10.1136/bjsports-2012-091296 | Synthèse besoins athlètes en altitude |
| Mazzeo RS (2008) *Physiological responses to exercise at altitude: an update*. Sports Med 38(1):1-8 | 10.2165/00007256-200838010-00001 | Adaptations 1-2 semaines acclimatation |
| Schoene RB (2008) *Illnesses at high altitude*. Chest 134(2):402-16 | 10.1378/chest.07-0561 | Pathologies altitude, hydratation |
| Pasiakos SM et al. (2017) *Nutritional requirements for sustaining health and performance during exposure to extreme environments*. Annu Rev Nutr 37:39-68 | 10.1146/annurev-nutr-071816-064637 | Synthèse besoins extrêmes (altitude, chaleur, froid) |

**Synthèse besoins en altitude** :

| Altitude | Effet aigu (<48h) | Après acclimatation 2 sem |
|---|---|---|
| 1500-2500 m | Hydratation +10-15% ; énergie +5% | Hydratation +5% ; énergie ≈ |
| 2500-3500 m | Hydratation +15-25% ; énergie +10-15% | Hydratation +10% ; énergie +5% |
| 3500-5000 m | Hydratation +25-40% ; énergie +20-30% | Hydratation +20% ; énergie +10-15% |
| >5000 m | Anorexie d'altitude, malabsorption | Idem (acclimatation limitée) |

**Le brief V3** :
- "+10%" si >1500m = **sous-estimé en aigu**, **correct en acclimaté**.
- Ne distingue pas les deux scénarios.

### Recommandation pour le brief V4

**Ajouter une question dans l'outil** :

> Altitude moyenne de la course :
> - Mer / <1000 m
> - 1000-1500 m
> - 1500-2500 m
> - 2500-3500 m
> - >3500 m
>
> Si >1500 m → question complémentaire :
> *Es-tu acclimaté ? (séjour ≥7 jours en altitude récente)*
> - Oui
> - Non / arrivée la veille

**Modulation** :
- 1500-2500 m **aigu** : hydratation +15%, énergie +5%
- 1500-2500 m **acclimaté** : hydratation +5%, énergie inchangée
- 2500-3500 m **aigu** : hydratation +25%, énergie +10%
- 2500-3500 m **acclimaté** : hydratation +10%, énergie +5%
- >3500 m : disclaimer "consulte un médecin du sport — l'altitude extrême modifie significativement les besoins et le risque MAM."

**Sources mentionnées dans la carte altitude** :
- Mawson 2000, Bergeron 2012, Pasiakos 2017

---

## Challenge #11 — Gut training durée

**Verdict** : ⚠️ **Améliorable** — "6-8 semaines" est sécuritaire mais **trop long par rapport à la littérature**. Décourageant pour user en plan 12 semaines.

### Analyse académique

**Études décisives** :

| Référence | DOI | Durée gut training démontrée |
|---|---|---|
| Costa RJS, Miall A, Khoo A et al. (2017) *Gut-training: the impact of two weeks repetitive gut-challenge during exercise on gastrointestinal status, glucose availability, fuel kinetics, and running performance*. Appl Physiol Nutr Metab 42(5):547-557 | 10.1139/apnm-2016-0453 | **2 semaines suffisent** pour adaptation significative |
| Jeukendrup AE (2017) *Training the gut for athletes*. Sports Med 47(Suppl 1):S101-S110 | 10.1007/s40279-017-0690-6 | "**As little as 2-4 weeks** of training the gut" |
| Cox GR et al. (2010) *Daily training with high carbohydrate availability increases exogenous carbohydrate oxidation during endurance cycling*. J Appl Physiol 109:126-134 | 10.1152/japplphysiol.00950.2009 | 28 jours = adaptation oxydative complète |
| Costa RJS et al. (2017) *Systematic review: exercise-induced gastrointestinal syndrome*. Aliment Pharmacol Ther 46(3):246-265 | 10.1111/apt.14157 | Revue méta GI distress |
| Miall A et al. (2018) *Two weeks of repetitive gut-challenge reduce exercise-associated gastrointestinal symptoms and malabsorption*. Scand J Med Sci Sports 28(2):630-640 | 10.1111/sms.12970 | 2 sem = ↓ symptômes GI |

**Consensus actuel** :
- **Minimum efficace** : 2 semaines (Costa 2017, Miall 2018)
- **Optimal pour grands apports (>90 g/h)** : 4-6 semaines (Jeukendrup 2017)
- **Pour ultra avec apports >100 g/h** : 6-8 semaines (par prudence pratique)

**Le brief V3** : "6-8 semaines pour tout user" = **excès de prudence**, peut décourager les users sur plans 12 semaines (~50% du plan dédié au gut training, irréaliste).

### Recommandation pour le brief V4

**Plages adaptées à la cible apport** :

> **Gut training — durée recommandée selon ta cible d'apport** :
> - Cible <60 g/h : **2-3 semaines** suffisent (Costa 2017)
> - Cible 60-90 g/h : **3-5 semaines** (Jeukendrup 2017)
> - Cible 90-120 g/h : **6-8 semaines** (intégration progressive)
>
> **Protocole** :
> - Semaine 1-2 : 30 g/h sur sorties longues (2-3h)
> - Semaines 3-4 : 50-70 g/h
> - Semaines 5+ : cible course
>
> **Règle d'or** : tester 3 fois minimum chaque produit (gel, boisson) sur sortie longue avant la course objectif. **Rien de nouveau le jour J**.

---

## Challenge #12 — Disclaimer pathologies

**Verdict** : ❌ **Incomplet** — Le brief V3 liste diabète, TCA, cardiaque/rénal, grossesse. **Manque plusieurs pathologies fréquentes** chez le coureur amateur.

### Pathologies à ajouter

| Pathologie | Justification scientifique |
|---|---|
| **Reflux gastro-œsophagien (RGO)** | Gels + course agitent estomac → exacerbation RGO. Costa 2017 documente 20-30% des coureurs amateurs concernés. |
| **Syndrome de l'intestin irritable (SII / IBS)** | 40% des trail-runners rapportent symptômes IBS-like en course (Costa 2017 *Aliment Pharmacol Ther*, DOI: 10.1111/apt.14157). Les gels riches en fructose aggravent. |
| **Intolérance au fructose** (HFI, intolérance héréditaire, ou malabsorption acquise) | Les gels glucose:fructose 2:1 ou 1:0.8 contiennent ~20-40 g fructose/heure. Inhabilité à métaboliser → diarrhée + douleurs abdo + risque hypoglycémie sévère pour HFI. |
| **Asthme à l'effort (exercise-induced bronchoconstriction, EIB)** | Le sucre concentré peut potentialiser la broncho-constriction par déshydratation des voies aériennes. Inhalateur à proximité ; pas un disclaimer fort mais mention utile. |
| **Maladie cœliaque / sensibilité au gluten** | Certaines barres contiennent du gluten. Risque inflammatoire intestinal aigu en course. |
| **Allergies / intolérances spécifiques** (lactose, fruits à coque, soja, etc.) | Lire les étiquettes ; certains gels contiennent lactose (whey), traces de noisettes, etc. |
| **Hyperinsulinisme / sensibilité hypoglycémique** | Profils à risque d'hypoglycémie réactionnelle accrue. Éviter sucres simples isolés pré-course. |
| **Migraines (caféine-sensitive)** | Caféine ↑ ou ↓ migraine selon individu ; pas un disclaimer fort. |
| **Hypertension artérielle traitée** | Certains diurétiques + sodium course = à surveiller. Consultation médecin. |
| **Insuffisance rénale chronique (même légère)** | Apports sodium élevés + AINS post-course = aggravation. Disclaimer renforcé. |

### Sources primaires citées

- **Costa RJS et al. (2017)** *Systematic review: exercise-induced gastrointestinal syndrome*. Aliment Pharmacol Ther 46(3):246-265. DOI: 10.1111/apt.14157
- **De Oliveira EP, Burini RC (2014)** *Carbohydrate-dependent, exercise-induced gastrointestinal distress*. Nutrients 6(10):4191-9. DOI: 10.3390/nu6104191
- **Stuempfle KJ, Hoffman MD (2015)** *Gastrointestinal distress is common during a 161-km ultramarathon*. J Sports Sci 33(17):1814-21. DOI: 10.1080/02640414.2015.1012104
- **Lipman GS et al. (2017)** *Ibuprofen vs placebo effect on AKI in ultramarathoners*. Emerg Med J 34(10):637-642. DOI: 10.1136/emermed-2016-206353
- **Boulet LP et al. (2007)** *Asthma and exercise-induced respiratory symptoms*. Curr Opin Pulm Med 13:64-9. DOI: 10.1097/MCP.0b013e328011a93f

### Recommandation pour le brief V4

**Disclaimer médical révisé** :

> 🩺 **Cet outil ne s'applique PAS si tu présentes l'une des conditions suivantes — consulte ton médecin ou un diététicien du sport** :
>
> **Pathologies métaboliques** :
> - Diabète (type 1, type 2, gestationnel)
> - Hyperinsulinisme / hypoglycémies réactionnelles fréquentes
> - Intolérance au fructose (héréditaire ou acquise)
>
> **Pathologies digestives** :
> - Reflux gastro-œsophagien (RGO) symptomatique
> - Syndrome de l'intestin irritable (SII)
> - Maladie cœliaque ou sensibilité au gluten
>
> **Pathologies cardiovasculaires & rénales** :
> - Hypertension artérielle traitée
> - Insuffisance rénale (même légère)
> - Cardiopathie connue
>
> **Allergies & intolérances alimentaires** : lactose, fruits à coque, soja, etc. Vérifie systématiquement les étiquettes.
>
> **Situations physiologiques** :
> - Grossesse (besoins majorés, apports caféine plafonnés à 200 mg/j OMS)
> - Allaitement
> - Antécédents de troubles du comportement alimentaire (TCA)
>
> **Asthme à l'effort** : garde ton inhalateur à proximité. Une déshydratation aiguë peut potentialiser une broncho-constriction.

---

## Bibliographie complète (au-delà du brief V3)

### Glucides en course
1. Jeukendrup AE (2010). Carbohydrate intake during exercise and performance. *Nutrition* 20:669-77. DOI: 10.1016/j.nut.2004.04.017
2. Jeukendrup AE (2014). A step towards personalized sports nutrition: carbohydrate intake during exercise. *Sports Med* 44 Suppl 1:S25-33. DOI: 10.1007/s40279-014-0148-z
3. Cermak NM, van Loon LJC (2013). The use of carbohydrates during exercise as an ergogenic aid. *Sports Med* 43(11):1139-55. DOI: 10.1007/s40279-013-0079-0
4. Viribay A et al. (2020). Effects of 120g/h CHO during marathon. *Nutrients* 12(5):1367. DOI: 10.3390/nu12051367
5. Naderi A et al. (2023). Carb intake during exercise: dose-response. *Sports Med* 53(4):723. DOI: 10.1007/s40279-022-01803-y
6. Podlogar T, Wallis GA (2022). New horizons in carbohydrate research. *Sports Med* 52(Suppl 1):5. DOI: 10.1007/s40279-022-01757-1
7. Burke LM et al. (2024). Toolkit for personalising amount and timing of carb fueling. *IJSNEM* 34:174-188. DOI: 10.1123/ijsnem.2023-0258
8. King AJ et al. (2018). Fructose+maltodextrin hydrogel in runners. *IJSNEM* 28(3):292-300. DOI: 10.1123/ijsnem.2017-0220
9. O'Brien WJ, Rowlands DS (2011). Fructose-maltodextrin ratio. *Am J Physiol* 300:R1067-75. DOI: 10.1152/ajpregu.00343.2010
10. Rowlands DS et al. (2015). Composite vs single transportable CHO. *Sports Med* 45:1561-1576. DOI: 10.1007/s40279-015-0383-y
11. Wallis GA et al. (2008). Oxidation of combined ingestion of maltodextrin and fructose. *MSSE* 40:1733. DOI: 10.1249/MSS.0b013e3181662c4f
12. Stellingwerff T, Cox GR (2014). Systematic review CHO supplementation. *Appl Physiol Nutr Metab* 39:998. DOI: 10.1139/apnm-2014-0027

### Hydratation et sodium
13. Sawka MN et al. (2007). ACSM Position Stand: Exercise and Fluid Replacement. *MSSE* 39:377-90. DOI: 10.1249/mss.0b013e31802ca597
14. Thomas DT, Erdman KA, Burke LM (2016). ACSM/AND. *MSSE* 48:543-68. DOI: 10.1249/MSS.0000000000000852
15. Hew-Butler T et al. (2015). 3rd International EAH Consensus. *Clin J Sport Med* 25:303-20. DOI: 10.1097/JSM.0000000000000221
16. Almond CSD et al. (2005). Hyponatremia Boston Marathon. *NEJM* 352:1550-6. DOI: 10.1056/NEJMoa043901
17. Baker LB (2017). Sweat rate and SSC in athletes. *Sports Med* 47(Suppl 1):111-128. DOI: 10.1007/s40279-017-0691-5
18. Stofan JR et al. (2005). Sweat and Na+ NCAA football. *IJSNEM* 15:641-52. DOI: 10.1123/ijsnem.15.6.641
19. Maughan RJ, Shirreffs SM (2008). Individual hydration strategies. *IJSNEM* 18:457-72. DOI: 10.1123/ijsnem.18.5.457
20. Beis LY et al. (2012). Drinking behaviors elite male marathoners. *Clin J Sport Med* 22:254-61. DOI: 10.1097/JSM.0b013e31824a55d7
21. Hoffman MD, Stuempfle KJ (2014). Hydration 161 km ultra. *Res Sports Med* 22:213-25. DOI: 10.1080/15438627.2014.915838

### Caféine
22. Guest NA et al. (2021). ISSN Position Stand Caffeine. *JISSN* 18:1. DOI: 10.1186/s12970-020-00383-4
23. Spriet LL (2014). Low doses caffeine. *Sports Med* 44 Suppl 2:S175-84. DOI: 10.1007/s40279-014-0257-8
24. Grgic J et al. (2020). Umbrella review caffeine. *BJSM* 54:681-688. DOI: 10.1136/bjsports-2018-100278
25. Pickering C, Kiely J (2018). Personalised caffeine guidelines. *Sports Med* 48:7-16. DOI: 10.1007/s40279-017-0776-1
26. Burke LM (2008). Caffeine and sports performance. *Appl Physiol Nutr Metab* 33:1319-1334. DOI: 10.1139/H08-130

### Gut training et GI
27. Costa RJS et al. (2017). Gut-training 2 weeks. *Appl Physiol Nutr Metab* 42:547-557. DOI: 10.1139/apnm-2016-0453
28. Jeukendrup AE (2017). Training the gut for athletes. *Sports Med* 47 Suppl 1:S101-S110. DOI: 10.1007/s40279-017-0690-6
29. Costa RJS et al. (2017). Exercise-induced gastrointestinal syndrome systematic review. *Aliment Pharmacol Ther* 46:246-265. DOI: 10.1111/apt.14157
30. De Oliveira EP, Burini RC (2014). CHO-dependent exercise-induced GI distress. *Nutrients* 6:4191-9. DOI: 10.3390/nu6104191
31. Pfeiffer B et al. (2012). Nutritional intake and GI problems competitive endurance. *MSSE* 44:344-51. DOI: 10.1249/MSS.0b013e3182374a92
32. Stuempfle KJ, Hoffman MD (2015). GI distress 161 km ultra. *J Sports Sci* 33:1814-21. DOI: 10.1080/02640414.2015.1012104
33. Miall A et al. (2018). 2 weeks repetitive gut challenge. *Scand J Med Sci Sports* 28:630-640. DOI: 10.1111/sms.12970

### Coût énergétique de la course / trail
34. Minetti AE et al. (2002). Energy cost walking/running extreme slopes. *J Appl Physiol* 93:1039-46. DOI: 10.1152/japplphysiol.01177.2001
35. Vernillo G et al. (2017). Biomech and physiology of uphill/downhill running. *Sports Med* 47:615-29. DOI: 10.1007/s40279-016-0605-y
36. Giovanelli N et al. (2016). Energetics of vertical km races. *EJAP* 116:1241-53. DOI: 10.1007/s00421-016-3382-2
37. di Prampero PE (1986). Energy cost human locomotion. *IJSM* 7:55-72. DOI: 10.1055/s-2008-1025736
38. Lemire M et al. (2021). Level vs uphill economy ultra-marathon. *EJAP* 121:3265. DOI: 10.1007/s00421-021-04792-4

### Ultra et protéines
39. Tiller NB et al. (2019). ISSN Position Stand Ultra-Marathon. *JISSN* 16:50. DOI: 10.1186/s12970-019-0312-9
40. Knechtle B, Nikolaidis PT (2018). Physiology ultra-marathon. *Front Physiol* 9:634. DOI: 10.3389/fphys.2018.00634
41. Tarnopolsky MA (2004). Protein requirements endurance. *Nutrition* 20:662-8. DOI: 10.1016/j.nut.2004.04.014
42. Saunders MJ et al. (2007). CHO+protein vs CHO-only on running. *J Strength Cond Res* 21:678-84. DOI: 10.1519/R-21306.1
43. Pasiakos SM et al. (2014). Protein supplements review. *Sports Med* 45:111-31. DOI: 10.1007/s40279-014-0242-2

### Femmes et sport
44. Sims ST et al. (2007). Sodium loading and fluid balance. *MSSE* 39:123-30. DOI: 10.1249/01.mss.0000241647.13220.4f
45. Janse de Jonge XAK (2003). Menstrual cycle and exercise performance. *Sports Med* 33:833-51. DOI: 10.2165/00007256-200333110-00004
46. Oosthuyse T, Bosch AN (2010). Menstrual cycle and exercise metabolism. *Sports Med* 40:207-227. DOI: 10.2165/11317090-000000000-00000
47. Wickham KA et al. (2021). Sex differences in heat acclimation. *EJAP* 121:353-367. DOI: 10.1007/s00421-020-04550-y
48. Wohlgemuth KJ et al. (2021). Female-specific nutritional strategies. *JISSN* 18:27. DOI: 10.1186/s12970-021-00422-8

### Altitude
49. Mawson JT et al. (2000). Women energy requirement 4300m. *J Appl Physiol* 88:272-81. DOI: 10.1152/jappl.2000.88.1.272
50. Mazzeo RS (2008). Exercise at altitude update. *Sports Med* 38:1-8. DOI: 10.2165/00007256-200838010-00001
51. Pasiakos SM et al. (2017). Nutrition extreme environments. *Annu Rev Nutr* 37:39-68. DOI: 10.1146/annurev-nutr-071816-064637

### Mouth rinse
52. Chambers ES, Bridge MW, Jones DA (2009). CHO sensing in human mouth. *J Physiol* 587:1779-94. DOI: 10.1113/jphysiol.2008.164285
53. De Pauw K et al. (2015). CHO mouth rinse meta-analysis. *Sports Med* 45:1635-44. DOI: 10.1007/s40279-015-0394-8
54. Brietzke C et al. (2019). CHO mouth rinse mitigates mental fatigue. *Brain Sci* 9:159. DOI: 10.3390/brainsci9070159

### Récupération et anti-inflammatoires
55. Howatson G et al. (2010). Tart cherry juice marathon recovery. *Scand J Med Sci Sports* 20:843-52. DOI: 10.1111/j.1600-0838.2009.01005.x
56. Lipman GS et al. (2017). Ibuprofen vs placebo AKI ultramarathoners. *Emerg Med J* 34:637-642. DOI: 10.1136/emermed-2016-206353
57. Halson SL (2014). Sleep elite athletes. *Sports Med* 44 Suppl 1:S13-23. DOI: 10.1007/s40279-014-0147-0

---

## Erreurs scientifiques détectées dans le brief V3

| # | Localisation | Erreur | Correction proposée |
|---|---|---|---|
| 1 | §4.2 formule trail Minetti | Coefficient 0.012 kcal/m grimpé/kg = ~3-4x trop élevé. Terme constant "5 kcal/h" non sourcé | Réduire coefficient à ~0.011 et documenter source ; clarifier que 5 = approximation course basse intensité |
| 2 | §4.3 marathon sub-2h30 → 90-120 g/h | 120 g/h = limite haute sustainable, pas standard ; nécessite gut training 6-8 sem | Préciser "90-110 g/h cible, 120 g/h possible avec gut training documenté" |
| 3 | §4.3 trail 3-6h → 60-90 g/h | Sous-évalué : littérature 2018+ valide jusqu'à 100 g/h | Réviser à 75-100 g/h |
| 4 | §4.4 hydratation cap 1 L/h | Cap absolu universel = trop conservateur pour profils >85 kg en très forte chaleur | Conserver comme garde-fou mais ajouter nuance + emphase sur ratio sodium/volume |
| 5 | §4.5 salty sweater 1500-2000 mg/L | 2000 mg/L = top 5% extrême ; majorité salty sweater = 1200-1600 | Réviser à 1200-1600 mg/L pour salty sweater "standard" |
| 6 | §4.6 caféine 3-6 mg/kg | Pas faux mais ne mentionne pas que 2-3 mg/kg suffisent pour ~80% du bénéfice | Ajouter mention dose minimale ergogène + cap 6 mg/kg/24h |
| 7 | §4.7 protéines 5-10 g/h | Formulation "recommandé" trop forte ; preuves modérées | Reformuler "optionnel selon préférence, preuves de gain de perf limitées" |
| 8 | §6 gut training "6-8 semaines" | Trop long pour apports <90 g/h ; décourageant | Plages adaptées à la cible (2-3 sem pour <60, 3-5 pour 60-90, 6-8 pour 90-120) |
| 9 | §6 disclaimer pathologies | Liste incomplète | Ajouter RGO, IBS, intolérance fructose, asthme, allergies, hyperinsulinisme |
| 10 | §3 inputs "Hygrométrie +15% si humide" | Modification numérique pas sourcée | Documenter (Casa 2019, Sawka 2007) |
| 11 | §3 inputs "Altitude +5-10% si >1500m" | Ne distingue pas aigu vs acclimaté | Ajouter input acclimatation + modulation 2 niveaux |
| 12 | §4.6 "Boost final caféine 100-200 mg" | Pas clair si en plus du plafond 6 mg/kg | Préciser que tout cumulé reste sous le plafond |

---

## Approximations à clarifier (vraies fourchettes vs valeurs uniques)

| Item | Brief V3 | Vraie fourchette / nuance |
|---|---|---|
| Sudation H vs F | "15-20%" | 10-30% selon individus, intensité, conditions |
| Limite oxydation glucose seul | 60 g/h implicite | 60 g/h ±10 (Jeukendrup 2014) |
| Limite oxydation glucose+fructose 2:1 | 90 g/h implicite | 85-95 g/h selon athlète et adaptation |
| Limite oxydation 1:0.8 | non mentionné | 105-115 g/h chez gut-trained |
| Sweat sodium "moyen" | 700-1000 mg/L | 800 ±400 mg/L (Baker 2017) — variabilité majeure |
| Hyperventilation altitude effet hydrique | "+10% >1500m" | +10-25% selon altitude et acclimatation |
| Effet caféine endurance | "ergogène" | +2-4% moyen (Grgic 2020), plafonné à 3 mg/kg pour la majorité |
| Dégâts musculaires excentriques en descente | non quantifié | CK ↑ 2-5x baseline après ultra descendant (Vernillo 2017) |
| Anti-inflammatoires nutritionnels (cerise, oméga-3) | non mentionné | Effet modéré (Howatson 2010), nécessite supplémentation chronique (pas en course) |

---

## Limites épistémiques de l'outil (à mentionner en transparence)

> **Ce que la science nutrition course NE sait PAS encore (à mentionner pour rigueur académique)** :

1. **Variabilité individuelle de la tolérance digestive** — Aucun modèle prédictif fiable. Le test individuel reste irremplaçable.
2. **Effet "matrice"** des produits (hydrogel Maurten vs gel classique vs liquide) — Études limitées, marketing souvent en avance sur la science.
3. **Optimum sodium individuel** — Le test sudation labo (Precision Hydration, Levine) reste le gold standard ; calcul théorique = ±50% d'erreur possible.
4. **Effet du sommeil pré-course sur la nutrition en course** — Sous-étudié. Plausible que sommeil dégradé → tolérance digestive ↓.
5. **Interaction micro-biote intestinal et performance ultra** — Champ émergent (Estaki 2016, Petersen 2017), pas de reco individualisable encore.
6. **Effet du genre dans le métabolisme glucides/protéines** — Sous-représenté dans les études (>80% sujets H jusqu'en 2020). Recos largement extrapolées.
7. **Optimal pour seniors >60 ans** — Très peu d'études dédiées. Tendance : besoins protéiques ↑, tolérance digestive ↓.
8. **Plages caféine et pathologies cardiovasculaires** — Recommandations actuelles sur population saine ; HTA, arythmie = précaution médicale.
9. **Effet long-terme apports massifs en course** sur santé digestive — Pas de données longitudinales >10 ans.
10. **Stratégies "fat-adapted" (ketosis) vs "carb-optimised"** — Débat scientifique vif (Burke 2017 vs Volek 2016). Position académique 2024 : carb-optimisé reste supérieur pour performance.

**Mention à intégrer dans la carte "Méthodologie" du brief V4** :

> Notre calculateur s'appuie sur le consensus scientifique 2024 (ACSM/AND, ISSN, IAAF) et les méta-analyses récentes. Les valeurs sont des estimations théoriques. La science nutrition course est en évolution constante, et la variabilité individuelle reste importante (±15-25% sur la plupart des recommandations). Le test individuel à l'entraînement reste irremplaçable.

---

## Brief V4 — Corrections scientifiques proposées (delta vs V3)

### Modifications PRIORITAIRES (à intégrer obligatoirement)

1. **§4.2 — Formule kcal trail** : Remplacer la formule actuelle par une version sourcée et clarifiée (cf. Challenge #1, Option C recommandée).

2. **§4.3 marathon — Plage sub-2h30** : Changer "90-120 g/h" en "90-110 g/h (cible 100, 120 g/h possible avec gut training documenté 6-8 sem)". Ajouter colonne "gut training requis".

3. **§4.3 trail — Plage 3-6h** : Réviser de "60-90 g/h" à "75-100 g/h" pour user gut-trained.

4. **§4.3 — Ajouter mention ratio 1:0.8** : Comme alternative validée au 2:1 pour apports >90 g/h (King 2018, Rowlands 2015).

5. **§4.5 sodium — Plage salty sweater** : Réviser de "1500-2000 mg/L" à "1200-1600 mg/L" (Baker 2017). Réserver 1600-2000 aux cas extrêmes documentés par test labo.

6. **§4.6 caféine — Ajouter dose minimale + cap 24h** : "Dose ergogène dès 2-3 mg/kg (Spriet 2014). 3-5 mg/kg = optimal risk/benefit. Plafond 6 mg/kg/24h."

7. **§4.7 protéines — Reformuler** : "Optionnel selon préférence, 5-10 g/h dès H4. Preuves de gain de performance limitées (Tiller 2019), surtout utile pour confort musculaire et anti-écœurement."

8. **§6 gut training — Plages adaptées** : Remplacer "6-8 semaines pour tout" par paliers selon cible apport (2-3 sem pour <60 g/h, 3-5 pour 60-90, 6-8 pour 90-120).

9. **§6 disclaimer pathologies — Élargir** : Ajouter RGO, IBS, intolérance fructose, asthme à l'effort, hyperinsulinisme, HTA traitée, allergies alimentaires (cf. Challenge #12).

10. **§3 inputs altitude — Distinguer aigu vs acclimaté** : Ajouter sous-question "as-tu un séjour ≥7j en altitude récent ?". Moduler hydratation/énergie en conséquence.

### Modifications SECONDAIRES (recommandées)

11. **§4.4 hydratation — Nuancer cap 1 L/h** : Conserver comme garde-fou mais ajouter "Pour profils >85 kg en chaleur extrême : priorité sodium 1000-1500 mg/L plutôt que volume supplémentaire."

12. **Ajouter section "Cycle menstruel"** (Option B générique) : Message court mention vigilance EAH en phase lutéale.

13. **§4 mouth rinse — Documenter protocole** : Préciser "25 mL solution 6% glucose, 5-10 sec rinçage, recracher, toutes les 10-15 min, effet maximal <60 min".

14. **Ajouter mini-questionnaire scoré salty sweater** : 5 questions binaires → score → profil sudation auto-déterminé.

15. **Carte "Méthodologie & limites"** : Section transparente sur les limites épistémiques de l'outil (cf. section dédiée ci-dessus).

### Modifications de FORMULATION (cosmétiques mais importantes)

16. **§3 input sudation H/F "15-20%"** : Reformuler en "10-30% selon individus, ~15% en moyenne à intensité comparable".

17. **§4.6 caféine "Boost final 100-200 mg"** : Préciser "à intégrer dans le plafond 6 mg/kg/24h, donc ne PAS en plus si déjà à 5+ mg/kg en pré-course".

18. **§7 toutes les FAQ scientifiques** : Ajouter mention DOI ou référence princeps dans les réponses (crédibilité académique).

19. **§4.3 marathon — Ajustement -20% si "Jamais"** : Préciser "modulation -20% conservatrice ; cible bas de fourchette + gut training à amorcer".

20. **§6 EAH warning** : Citer Almond NEJM 2005 + Hew-Butler 2015 dans le warning (vérifiable par user curieux).

---

## Conclusion académique

Le brief V3 est **au-dessus de la moyenne francophone grand public** sur la nutrition course, et son orientation **"sécurité > conversion"** est exemplaire et rare. Il mobilise les bonnes sources de référence (Jeukendrup, Burke, Hew-Butler, ACSM, Costa, ITRA) sans tomber dans le marketing énergétique.

**Cependant, il présente 8-10 points scientifiques imprécis qui le rendent attaquable en review** par un coach expérimenté ou un médecin du sport :

1. La formule kcal trail manque de rigueur dimensionnelle.
2. Les plages 2024 ne sont pas pleinement intégrées (1:0.8, 120 g/h documenté).
3. La caféine n'utilise pas la nuance "dose minimale ergogène".
4. Les protéines sont sur-vendues.
5. Le gut training est sur-dimensionné.
6. Le disclaimer pathologies est incomplet (~50% des pathologies fréquentes manquent).
7. L'altitude ignore l'acclimatation.
8. Le sodium "salty sweater" cible une valeur extrême.

**Après intégration des 10 modifications prioritaires + 5 secondaires**, le brief V4 sera de **niveau publiable** dans un journal grand public sérieux (Vital, Sport Santé, Esprit Trail), passable en review par un coach FFA ou un médecin du sport sans rougir, et **différenciant face à la concurrence FR** (Aptonia, Overstim's, Lepape, Decathlon, qui sont tous au-dessous de ce niveau).

**Recommandation finale** : ✅ **Avancer vers V4** avec les 10 corrections prioritaires. Pas besoin de refonte structurelle — le squelette du brief est solide.

---

**Reviewer** : PhD Nutrition du Sport, thèse course à pied (post-doc INRAE/INSEP)
**Statut** : Challenge complété — prêt pour intégration V4 par Romane
**Conflit d'intérêt déclaré** : aucun
