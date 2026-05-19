# Brief V3 consolidé — Suite outils Nutrition Course

**Date** : 2026-05-17
**Auteurs** : Romane (PM) + 2 nutritionnistes experts (trail + route) + synthèse Claude
**Statut** : à challenger Phase 2 (coach course à pied expert + nutritionniste docteur thèse course)
**Source** : `CHALLENGE-NUTRITIONNISTE-TRAIL.md` + `CHALLENGE-NUTRITIONNISTE-ROUTE.md` + directives Romane post-challenge

---

## 1. POSITIONNEMENT (cœur du produit)

### Promesse user
> **« Calcule ta stratégie nutritive en course en quelques clics — adaptée à ton chrono, ton poids, la météo et tes conditions individuelles. »**

### Ce que l'outil EST
- Un **simulateur d'apports théoriques** basé sur la littérature scientifique (ACSM 2024, IAAF Consensus 2019, Jeukendrup, Burke)
- Une **aide à la décision pour la stratégie nutritive EN COURSE** (pendant l'effort uniquement)
- Un **point de départ** à adapter selon expérience individuelle, gut training, retours terrain

### Ce que l'outil N'EST PAS
- ❌ Une vérité absolue (les besoins varient selon ~15 paramètres individuels)
- ❌ Un plan nutrition pré-course (carb-loading, dernier repas, hydratation J-1)
- ❌ Un plan nutrition post-course (récupération, fenêtre métabolique, reconstruction musculaire)
- ❌ Un substitut à un diététicien (surtout pour pathologies, grossesse, diabète, TCA)

### Warning OBLIGATOIRE, visible en haut de page (cadre coloré, pas en bas perdu)

> ⚠️ **Cet outil traite UNIQUEMENT la nutrition PENDANT la course.**
>
> Les phases **avant-course** (carb-loading 48-72h, dernier repas 3-4h avant, hydratation J-1) et **après-course** (récupération immédiate dans les 30 min, reconstruction sur 24-48h) sont **tout aussi primordiales pour ta performance et ta santé**.
>
> Ces deux phases méritent une approche distincte — consulte ton coach, un diététicien du sport, ou ta fédération.
>
> Les valeurs calculées par cet outil sont des **estimations théoriques ±15%**, à adapter selon ton expérience, ton gut training, ta tolérance digestive et les conditions du jour.

---

## 2. ARCHITECTURE TECHNIQUE

### Composant partagé
1 composant React `<NutritionCalculator config={config} />` + 3 pages-instances.

### Config par instance
```js
// /outils/nutrition-trail
config = {
  type: "trail",
  distanceEditable: true,
  distanceDefault: 30,
  showDPlus: true,
  showDMinus: true,
  durationRange: [1, 30],         // h
  showCarbLoading: false,         // hors scope
  showRecovery: false,            // hors scope
  warningPreCourseAfter: true,    // affiche le warning
  H1: "Calculateur Nutrition Trail — Aide à ta stratégie pendant la course",
  metaTitle: "Calculateur Nutrition Trail | Aide stratégie en course | Coach Running IA",
  metaDescription: "Calcule tes apports théoriques en course (glucides, eau, sodium, caféine) selon distance, D+, météo et profil. Aide à la stratégie nutritive trail.",
}

// /outils/nutrition-marathon
config = {
  type: "marathon",
  distanceEditable: false,
  distanceFixed: 42.2,
  showDPlus: false,
  showDMinus: false,
  durationRange: [2, 6],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfter: true,
  H1: "Calculateur Nutrition Marathon — Glucides, eau et sel personnalisés",
  metaTitle: "Calculateur Nutrition Marathon | Aide stratégie en course | Coach Running IA",
}

// /outils/nutrition-semi-marathon
config = {
  type: "semi",
  distanceEditable: false,
  distanceFixed: 21.1,
  showDPlus: false,
  showDMinus: false,
  durationRange: [1, 3.5],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfter: true,
  H1: "Calculateur Nutrition Semi-Marathon — Honnête, précis, adapté à ton chrono",
  metaTitle: "Calculateur Nutrition Semi-Marathon | Faut-il manger ? | Coach Running IA",
}
```

### Sous-menu Outils
```
Outils
├── Convertisseur d'allure
├── Calculateur VMA
├── Prédicteur de temps
├── Allure marathon
├── Convertisseur miles/km
└── Nutrition Course ← NOUVEAU
    ├── Calculateur Nutrition Trail
    ├── Calculateur Nutrition Marathon
    └── Calculateur Nutrition Semi-Marathon
```

### V2 future (selon traffic)
Ajouter Ultra-Trail (>100km) et 10km séparés si data analytics le justifie après 3-6 mois.

---

## 3. INPUTS DU CALCULATEUR (8-10 selon outil)

### Inputs COMMUNS aux 3 outils

| Input | Type | Required | Validation |
|---|---|---|---|
| **Sexe** | select (H/F) | ✅ | différences sudation 15-20% |
| **Poids** | number (kg) | ✅ | 40-150 kg, **JAMAIS affiché ailleurs** |
| **Niveau** | select (Débutant/Régulier/Confirmé/Expert) | ✅ | impact intensité + tolérance |
| **Chrono visé** (ou durée prévue) | time | ✅ | hh:mm:ss |
| **Température estimée jour J** | number (°C) | ✅ | -10 à +45 |
| **Hygrométrie estimée** | select (Sec <40% / Standard 40-70% / Humide >70%) | ✅ | impact sudation+15% si humide |
| **Profil sudation perçu** | select (Faible / Modéré / Élevé / "Salty sweater"*) | ✅ | détermine sodium |
| **Expérience nutrition en course** | select (Jamais / Occasionnel / Habitué) | ✅ | ajustement -20% glucides si "Jamais" |
| **Habitude caféine quotidienne** | select (Aucune / 1-2 cafés/j / 3+ cafés/j) | ✅ | dose caféine ajustée |

*Tooltip "Salty sweater" : « Tu as souvent des traces blanches de sel sur tes vêtements après l'effort ? Tu as parfois des crampes même bien hydraté ? Tu es probablement un "salty sweater". »

### Inputs SPÉCIFIQUES Trail
| Input | Type | Required | Notes |
|---|---|---|---|
| **Distance course** | number (km) | ✅ | 5-300 km |
| **D+ total** | number (m) | ✅ | 0-15000 m |
| **D- total** | number (m) | optional | 0-15000 m (par défaut = D+) |
| **Altitude moyenne course** | select (Mer / 500-1500m / 1500-2500m / >2500m) | ✅ | impact +5-10% besoins si >1500m |
| **Bases de vie prévues** | number (count) | optional | 0-10, conseils dédiés si >0 |
| **Heure départ** | time | optional | impact chaleur + caféine |

### Inputs SPÉCIFIQUES Marathon
| Input | Type | Required | Notes |
|---|---|---|---|
| **Météo prévue départ** | select (Frais <10°C / Standard 10-20°C / Chaud 20-25°C / Très chaud >25°C) | ✅ | duplique T° pour UX simple |

### Inputs SPÉCIFIQUES Semi-Marathon
| Input | Type | Required | Notes |
|---|---|---|---|
| (mêmes que communs) | | | Outil le plus simple |

---

## 4. FORMULES DE CALCUL (transparentes, citées en bas de page)

### 4.1 Distance équivalente Trail
```
D_eq (ITRA) = Distance + (D+/100) + (D-/400)
```
**Source** : International Trail Running Association (ITRA) — Performance Index.

### 4.2 Estimation énergétique (kcal totales)
**Trail** (Minetti pondéré) :
```
kcal/h ≈ poids × (5 + (m_grimpés/h × 0.012) + (m_descendus/h × 0.0035))
```
**Marathon/Semi** :
```
kcal/h ≈ poids × allure_km/h × 0.95 (running flat, ACSM 2024)
```

### 4.3 Glucides recommandés (g/h) — par profil

#### Trail
| Durée effort | Glucides g/h | Notes |
|---|---|---|
| <1h | 0-30 g | Mouth rinse possible |
| 1-2h | 30-60 g | Glucose seul OK |
| 2-3h | 60-90 g | Glucose:fructose 2:1 |
| 3-6h | 60-90 g | + protéines 5-10 g/h optionnel |
| 6-12h | 70-100 g | Alternance liquide/solide |
| 12-24h | 60-90 g (lassitude) | Salé en 2e partie, plan B |
| 24h+ | 50-80 g (digestion saturée) | Stratégie individuelle |

**Sources** : Jeukendrup 2014, Costa 2017, Tiller 2019.

#### Marathon (par chrono)
| Chrono | Glucides g/h | Total course |
|---|---|---|
| sub-2h30 | 90-120 g/h | 225-300 g |
| sub-3h | 80-100 g/h | 240-300 g |
| sub-3h30 | 60-90 g/h | 210-315 g |
| sub-4h | 50-80 g/h | 200-320 g |
| sub-4h30 | 40-70 g/h | 180-315 g |
| sub-5h | 40-60 g/h | 200-300 g |

**Ajustement -20%** si "Expérience nutrition en course = Jamais".
**Sources** : ACSM 2024, IAAF Consensus 2019, Jeukendrup 2010-2014.

#### Semi-Marathon (par chrono)
| Chrono | Glucides | Notes |
|---|---|---|
| sub-1h15 | 0 g (mouth rinse) | Chambers 2009 — rinçage bouche suffit |
| 1h15-1h30 | 20-25 g (1 gel optionnel) | Vers km 12 |
| 1h30-1h45 | 30-50 g (1-2 gels) | Optionnel |
| 1h45-2h | 40-60 g (2 gels) | Recommandé |
| 2h-2h30 | 45-75 g (2-3 gels) | Recommandé |
| 2h30+ | 60-90 g (gels + boisson) | Approche marathon |

**Sources** : Chambers 2009, Burke 2017.

### 4.4 Hydratation (mL/h)

#### Matrice par profil × température
| Sudation | Frais <10°C | Standard 10-20°C | Chaud 20-25°C | Très chaud >25°C |
|---|---|---|---|---|
| Faible (H<70kg, F) | 300-400 | 400-500 | 500-600 | 600-700 |
| Modéré | 400-500 | 500-650 | 650-800 | 800-1000 |
| Élevé (H>80kg) | 500-600 | 600-800 | 800-1000 | 1000-1200 |

⚠️ **Cap absolu : 1000 mL/h max** (au-delà, risque hyponatrémie d'effort EAH).

**Ajustements** :
- Humidité >70% : **+15%**
- Altitude >1500m : **+10%**

**Sources** : ACSM Position Stand 2007 + 2016, Hew-Butler 2015.

### 4.5 Sodium (mg/h) — par profil sudation
| Profil | Sodium mg/h | Sodium mg/L eau |
|---|---|---|
| Faible | 200-400 | 500-700 |
| Modéré | 400-700 | 700-1000 |
| Élevé | 700-1000 | 1000-1500 |
| Salty sweater | 1000-1500 | 1500-2000 |

**Sources** : Hew-Butler 2015 — IMM PS on EAH.

### 4.6 Caféine (mg)
| Phase | Quantité | Timing |
|---|---|---|
| Pré-course | 3-6 mg/kg | 60 min avant départ |
| En course (durée >2h) | 1-3 mg/kg | Toutes les 2-3h |
| Boost final | 100-200 mg | 30-45 min avant fin |

**Ajustement** : si habitude quotidienne ≥3 cafés → réduire de 30% (tolérance).
**Sources** : Guest 2021 (ISSN Position Stand), Grgic 2020.

### 4.7 Protéines (Trail uniquement, effort >4h)
```
5-10 g/h, à partir de la 4e heure
Formes : BCAA, EAA, whey hydrolysée, gels protéinés (Spring, Hammer)
```
**Sources** : Saunders 2007, Knechtle 2018.

---

## 5. CARTES DE RÉSULTAT (5-9 selon outil)

### Cartes COMMUNES
1. **Synthèse** : récapitulatif total course (kcal, g glucides, mL eau, mg sodium, mg caféine)
2. **Timeline** : ligne temporelle visuelle (gel toutes les 25 min, boisson tous les 20 min, sodium toutes les 30 min)
3. **Pack nutrition** : exemple concret de produits (X gels marque type, Y bidons isotoniques, Z caps sel)
4. **Sécurité & garde-fous** :
   - Hyponatrémie : signes + prévention
   - Hypoglycémie réactionnelle : éviter gel <15 min départ
   - Troubles digestifs : importance gut training
   - Disclaimer médical : diabète/grossesse/pathologies → consulter médecin
5. **FAQ tabulée** : 12-15 questions intentionnelles SEO

### Cartes SPÉCIFIQUES Trail
6. **Conseils ravitos / bases de vie** : si bases de vie >0, planning de prise
7. **Lassitude gustative & plan B** : timing alternance + "estomac fermé" (rinçages, soupes, températures différentes)
8. **Altitude** : ajustement si >1500m

### Cartes SPÉCIFIQUES Marathon
6. **Caféine pré-course** : stratégie 60 min avant
7. **Mur du 30e km** : pourquoi + comment l'éviter par nutrition

### Cartes SPÉCIFIQUES Semi
6. **Faut-il manger ?** : réponse honnête selon chrono (carte forte SEO)

---

## 6. WARNINGS & GARDE-FOUS SÉCURITÉ (obligatoires affichés)

### Hyponatrémie d'effort (EAH) — affiché si hydratation >800 mL/h
> ⚠️ **Attention** : tu vises plus de 800 mL/h. L'hyponatrémie d'effort (sodium sanguin trop bas) est la **cause #1 de décès en ultra-trail** (Almond NEJM 2005). Symptômes : nausées, maux de tête, confusion, prise de poids pendant la course. **Limite-toi à 1000 mL/h max**, et combine avec sodium suffisant (voir tableau).

### Hypoglycémie réactionnelle — si gel pris <15 min départ
> ⚠️ Évite de prendre ton premier gel <15 min avant le départ. Le pic d'insuline peut provoquer une chute glycémique en début de course.

### Gut training — si "Expérience nutrition en course = Jamais"
> 🧪 **Entraîne ton estomac avant la course.** Les apports calculés ici nécessitent un système digestif habitué. Teste tes gels et boissons à l'entraînement sur tes sorties longues pendant **au moins 6-8 semaines** avant ta course objectif.

### Disclaimer médical — toujours affiché en bas
> 🩺 Ces calculs ne s'appliquent **pas** aux personnes atteintes de diabète, troubles du comportement alimentaire, pathologies cardiaques/rénales, ou aux femmes enceintes. Consulte ton médecin ou un diététicien du sport.

### Estimation ±15% — toujours affiché
> Les valeurs calculées sont des **estimations théoriques ±15%**. Adapte selon ton expérience individuelle et les retours terrain de tes entraînements.

---

## 7. SEO & CONTENU (1500-2500 mots par page)

### Page Trail — `/outils/nutrition-trail`
**KW principaux** (8) : nutrition trail (480), nutrition ultra trail (140), pack nutrition trail (70), plan nutrition trail (70), gels trail (50), hydratation trail (40), sodium course trail (30), caféine trail (30)

**KW longue traîne à intégrer** (top 20) :
- "combien de gels pour 50 km trail"
- "pack nutrition Saintélyon"
- "que manger en base de vie UTMB"
- "comment éviter les crampes en trail"
- "pourquoi mal au ventre en ultra"
- "stratégie nutrition trail 30 km"
- "alternance liquide solide trail"
- "ravitaillement trail 80 km"
- "salé sucré en trail"
- "plan B nutrition ultra"
- "gut training trail"
- "hyponatrémie trail"
- "altitude et nutrition trail"
- "boisson isotonique trail"
- "purée patate douce trail"
- "saucisson en trail"
- "déshydratation trail signes"
- "combien boire en trail chaud"
- "nutrition trail femme"
- "nutrition trail débutant"

**H2/H3** :
1. À quoi sert ce calculateur (intro + warning pré/post)
2. Comment marche le calculateur (formules ITRA + Minetti expliquées)
3. Glucides en trail : combien par heure selon distance et D+ (tableau par durée)
4. Hydratation et sodium en trail : éviter crampes et hyponatrémie
5. Caféine en trail : pré-course et boost final
6. Pack nutrition trail 30 km / 50 km / 80 km / 100 km / UTMB 170 km (5 H3 longue traîne)
7. Gut training : pourquoi tester sa nutrition à l'entraînement
8. Altitude et nutrition trail (>1500m)
9. Lassitude gustative et plan B "estomac fermé"
10. FAQ trail (15 questions)

**FAQ — 15 vraies questions** :
1. Combien de gels pour un trail de 30/50/80/100/170 km ?
2. Faut-il boire plus en altitude ?
3. Combien de sodium pour éviter les crampes ?
4. Pourquoi j'ai mal au ventre en ultra ?
5. Que manger à une base de vie ?
6. Caféine en trail : combien et quand ?
7. Saucisson, fromage, soupes en trail : oui ou non ?
8. Comment gérer la lassitude gustative après 8h d'effort ?
9. Quelle stratégie si je n'arrive plus à manger (estomac fermé) ?
10. Différence entre boisson isotonique et eau plate en trail ?
11. Hyponatrémie en trail : symptômes et prévention ?
12. Faut-il prendre des protéines en ultra-trail (>4h) ?
13. Comment s'entraîner à manger en course (gut training) ?
14. Nutrition trail femme vs homme : quelles différences ?
15. Premier trail : comment ne pas se planter sur la nutrition ?

### Page Marathon — `/outils/nutrition-marathon`
**KW principaux** (8) : nutrition marathon (390), marathon nutrition (110), plan nutrition marathon (90), gels marathon (70), hydratation marathon (60), caféine marathon (50), mur du 30e km (40), boisson isotonique marathon (30)

**KW longue traîne** (top 15) :
- "plan nutrition marathon sub 3h / 3h30 / 4h / 4h30 / 5h" (5 KW chrono)
- "combien de gels pour un marathon"
- "quand prendre son premier gel marathon"
- "caféine avant marathon dosage"
- "comment éviter le mur du marathon"
- "ravitaillement marathon Paris/New York/Berlin"
- "boisson énergétique marathon"
- "nutrition marathon femme"
- "nutrition marathon premier"
- "isotonique vs gels marathon"

**H2/H3** :
1. À quoi sert ce calculateur (intro + warning pré/post)
2. Comment marche le calculateur (formules ACSM/Jeukendrup)
3. Glucides par heure en marathon : 40 à 120 g/h selon ton chrono (tableau 5 paliers)
4. Hydratation marathon : matrice 4 profils × 4 températures
5. Sodium en marathon : pourquoi c'est sous-estimé
6. Caféine et marathon : dosage et timing
7. Plan nutrition marathon sub-3h / sub-3h30 / sub-4h / sub-4h30 / sub-5h (5 H3 longue traîne)
8. Mur du 30e km : pourquoi et comment l'éviter par la nutrition
9. Gut training avant marathon
10. FAQ marathon (15 questions)

### Page Semi-Marathon — `/outils/nutrition-semi-marathon`
**KW principaux** (5) : nutrition semi marathon (170), semi marathon nutrition (110), plan nutrition semi (50), faut-il manger semi marathon (30), gels semi marathon (30)

**KW longue traîne** (top 12) :
- "plan nutrition semi sub-1h30 / sub-1h45 / sub-2h / sub-2h30" (4 KW chrono)
- "faut-il prendre des gels en semi"
- "mouth rinse semi marathon"
- "hydratation semi marathon chaud"
- "premier semi-marathon nutrition"
- "isotonique semi marathon"
- "combien boire en semi marathon"
- "caféine avant semi marathon"

**H2/H3** :
1. À quoi sert ce calculateur (intro + warning pré/post)
2. Comment marche le calculateur (formules + paliers)
3. **Faut-il vraiment manger pendant un semi-marathon ?** (intention forte, peu adressée) — réponse honnête
4. Hydratation en semi : selon météo et chrono visé
5. Sodium en semi (rarement nécessaire mais cas particuliers)
6. Plan nutrition semi sub-1h15 / sub-1h30 / sub-1h45 / sub-2h / sub-2h30 (5 H3 longue traîne)
7. Mouth rinse (rinçage bouche) : la solution méconnue pour <1h15
8. FAQ semi (12 questions)

---

## 8. MAILLAGE INTERNE

En bas de chaque page, bloc visuel "Outils nutrition complémentaires" :
- Tu prépares un autre format ? → cross-links entre les 3 outils nutrition
- Outils performance liés → Convertisseur d'allure, Prédicteur de temps, Allure marathon, Calculateur VMA

---

## 9. POINTS À CHALLENGER (Phase 2)

### Pour le COACH course à pied expert
1. **Cohérence avec produit principal** : l'outil contredit-il la doctrine "pas de nutrition dans le plan" ? Comment la cross-promotion fonctionne ?
2. **Pédagogie pour débutants** : les warnings sont-ils assez visibles ? Le débutant qui découvre les gels va-t-il faire des erreurs ?
3. **Profils ignorés** : freq 2-3 séances / Régulier en marathon = majorité user CRIA, l'outil colle ?
4. **Lien avec gut training** : l'outil doit-il pousser vers le plan d'entraînement (CTA "intègre des SL avec test nutrition") ?
5. **Sécurité débutant** : on impose pas le warning EAH s'il ne court qu'1h ?

### Pour le NUTRITIONNISTE DOCTEUR (thèse course à pied)
1. **Validité formule Minetti** pour estimer kcal trail : adéquate ou faut autre chose ?
2. **Plages glucides** : sont-elles à jour vs littérature 2024 (notamment études 120 g/h grand public) ?
3. **Sodium 1500-2000 mg/L pour salty sweater** : trop / pas assez selon dernières études ?
4. **Caféine 3-6 mg/kg pré-course** : on a vu des études récentes recommandant 2-4 mg/kg avec moins d'effets secondaires
5. **Protéines en ultra** : 5-10 g/h est-il scientifiquement fondé ou cargo cult ?
6. **Mouth rinse Chambers 2009** : protocole exact à mentionner ?
7. **Femme vs homme** : différences sudation/sodium suffisamment intégrées ?
8. **Altitude >1500m +10%** : sourcé correctement ?
9. **Gut training 6-8 semaines** : durée validée par littérature ?
10. **Disclaimer pathologies** : assez exhaustif ? Manque-t-on des cas (asthme effort, ulcère, RGO, IBS) ?

---

## 10. POINTS À CHALLENGER (Phase 3 — PM + dev)

### Pour le PM
1. **Conversion** : qu'est-ce qui fait revenir le user 2-3-N fois ? (favoris pack ? export PDF ? alertes nouvelle course ?)
2. **Cross-sell vers le plan d'entraînement payant** : comment l'outil amène vers le générateur de plans ?
3. **Tracking analytics** : quels événements Plausible/GA prioriser (chronos visés, distances trail, T° saisies) ?
4. **Mobile-first** : tableau 4×4 hydratation tient-il sur mobile ?
5. **Partage social** : générer une carte "Ma stratégie pour le Marathon de Paris en 3h45" pour partage ?

### Pour le DEV
1. **Réutilisation existant** : `MarathonPacePage.tsx` etc. exposent quels patterns ?
2. **i18n** : utile pour SEO international plus tard ?
3. **State management** : Redux/Context/local ?
4. **Tests** : unitaires sur formules (jest), e2e sur calcul complet (Playwright) ?
5. **Performance** : recalcul à chaque input ou button "Calculer" ?
6. **Persistance** : localStorage pour ré-ouvrir avec dernières valeurs ?

---

## Synthèse

**Brief V3** = scope strict (course only) + warning pré/post + 15 paramètres adaptables + 5-9 cartes résultat + 1500-2500 mots SEO + 12-15 FAQ + garde-fous sécurité explicites + transparence ±15%.

**Ce qui change vs V2** :
- Scope rétréci (pas pré/post, c'est ailleurs)
- Variables d'adaptation explicites (météo, sudation, altitude, gut training, caféine quotidienne)
- Positionnement "aide à la décision" et non "vérité absolue"
- Warning sécurité EAH/hypo systématique
- SEO doublé en volume (1500-2500 vs 700-900)
