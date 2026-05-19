# Brief V4 FINAL — Suite outils Nutrition Course

**Date** : 2026-05-17
**Auteurs** : Romane (PM) + 4 experts (2 nutritionnistes route/trail + coach course à pied senior + docteur PhD nutrition du sport) + synthèse Claude
**Statut** : Prêt pour pass PM + dev → code
**Sources** : 57 références scientifiques (DOI complets — voir §11)
**Périmètre doctrine CRIA respecté** : sécurité > conversion, course exclusivement (pas pré/post), zéro mention poids/IMC/minceur dans messages user, zéro contact direct client, scope strict en course pendant l'effort.

---

## 0. Synthèse exec (évolutions V3 → V4)

**Inputs** :
- Coach Phase 2 : 29 deltas (mode "Premier", warning EAH dosé, articulation outil↔plan, profils sub-5h30/sub-6h, UX mobile/PDF/PWA, lassitude/plan B ultra, gut training intégré).
- Docteur Phase 2 : 20 corrections scientifiques + 57 références DOI.

**Changements clés V3 → V4** :

| # | Item | V3 | V4 |
|---|---|---|---|
| 1 | Glucides marathon sub-2h30 | 90-120 g/h | **90-110 g/h** (cible 100, 120 = gut-trained 6-8 sem documenté) |
| 2 | Glucides trail 3-6h | 60-90 g/h | **75-100 g/h** (gut-trained) |
| 3 | Ratio glucose:fructose | 2:1 seul | **2:1 OU 1:0.8** (1:0.8 = moins GI distress chez coureur, King 2018) |
| 4 | Sodium salty sweater | 1500-2000 mg/L | **1200-1600 mg/L** (Baker 2017 ; 1600-2000 = top 5% labo) |
| 5 | Caféine pré-course | 3-6 mg/kg | **3-5 mg/kg** (cible 3) ; dose mini ergogène **2-3 mg/kg** (Spriet 2014) ; plafond 6 mg/kg/24h |
| 6 | Caféine timing | "60 min avant" dogme | **Fenêtre 30-90 min** selon habitude/forme |
| 7 | Protéines ultra | "recommandé 5-10 g/h" | **"Optionnel"** (preuves perf limitées, Tiller 2019) |
| 8 | Gut training durée | 6-8 sem pour tous | **2-3 sem si <60 g/h ; 3-5 sem si 60-90 ; 6-8 sem si 90-120** |
| 9 | Altitude | "+10% si >1500m" | **Aigu vs acclimaté** distingués (Mawson 2000) |
| 10 | Disclaimer pathologies | Diabète/TCA/cardio/rénal/grossesse | **+ RGO, IBS, intolérance fructose, asthme effort, HTA traitée, allergies, hyperinsulinisme, gluten** |
| 11 | Formule Minetti trail | Coeffs non sourcés | **Coefficient grimpée ~0.011 kcal/m/kg documenté** (Minetti 2002 + Vernillo 2017) ; descente ignorée par défaut |
| 12 | Plages marathon long | s'arrête à sub-5h | **+ sub-5h30 (25-40 g/h), sub-6h (20-35 g/h)** |
| 13 | Plages semi long | s'arrête à 2h30+ | **+ sub-3h (25-40), sub-3h30 (20-30)** |
| 14 | Mode "Premier marathon/semi/ultra" | absent | **Input obligatoire si Niveau=Débutant** ; plafonne plage haute + message anti-rigidité |
| 15 | Warning EAH | "cause #1 décès ultra" pour tous | **Ton informatif <5h** (marathon/semi) ; **ton appuyé >6h** (trail/ultra) |
| 16 | Warning gut training | encart bas | **Tête de page**, bouton "Compris, montre-moi les chiffres" |
| 17 | Articulation outil ↔ plan | absente | **Welcome message plan + carte "Quand tester" + CTA générateur de plans** |
| 18 | UX jour J | non traitée | **MVP : mobile-first + PDF A5 + URL partageable** ; V2 : PWA offline |
| 19 | Cycle menstruel | non traité | **Message générique** (Option B) — vigilance EAH phase lutéale |
| 20 | Mini-questionnaire scoré sudation | absent | **5 questions binaires → profil auto** |

---

## 1. POSITIONNEMENT (depuis V3, enrichi)

### Promesse user
> *« Calcule ta stratégie nutritive en course en quelques clics — adaptée à ton chrono, ton poids, la météo et tes conditions individuelles. »*

### Ce que l'outil EST
- Un **simulateur d'apports théoriques** basé sur le consensus scientifique 2024 (ACSM/AND 2016, IAAF Consensus 2019, ISSN Position Stands, méta-analyses Naderi 2023, Cermak 2013).
- Une **aide à la décision pour la stratégie nutritive PENDANT l'effort uniquement**.
- Un **point de départ** à adapter selon expérience individuelle, gut training, retours terrain, sensations digestives.

### Ce que l'outil N'EST PAS
- Pas une vérité absolue (les besoins varient selon ~15 paramètres individuels, ±15-25% sur la plupart des recommandations).
- Pas un plan nutrition pré-course (carb-loading, dernier repas, hydratation J-1) → outil dédié futur.
- Pas un plan nutrition post-course (récupération immédiate, reconstruction 24-48h) → outil dédié futur.
- Pas un substitut à un diététicien du sport (surtout pathologies, grossesse, diabète, TCA, IBS, RGO).

### Warning OBLIGATOIRE, en haut de page (cadre coloré, lisible mobile)

> **Cet outil traite UNIQUEMENT la nutrition PENDANT la course.**
>
> Les phases **avant-course** (carb-loading 48-72h, dernier repas 3-4h avant, hydratation J-1) et **après-course** (récupération immédiate dans les 30 min, reconstruction 24-48h) sont **tout aussi primordiales pour ta performance et ta santé**.
>
> Ces deux phases méritent une approche distincte — consulte ton coach, un diététicien du sport, ou ta fédération.
>
> Les valeurs calculées sont des **estimations théoriques ±15-25%**, à adapter selon ton expérience, ton gut training, ta tolérance digestive et les conditions du jour.

### Warning gut training en TÊTE de page (nouveau — coach delta #16)

> **AVANT de regarder les chiffres** — si tu n'as jamais utilisé de gel ou de boisson énergétique en course, **NE COMMENCE PAS par ta course objectif**. Teste sur 3-5 sorties longues d'au moins 1h30, en augmentant progressivement la quantité. Sinon : 80 % de probabilité de troubles digestifs (Costa 2017). C'est la 1ère cause d'abandon en marathon amateur.
>
> [ Bouton — *« Compris, montre-moi les chiffres »* ]

---

## 2. ARCHITECTURE TECHNIQUE (depuis V3, sans changement)

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
  durationRange: [1, 30],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfter: true,
  warningGutTrainingTop: true,            // NOUVEAU V4
  premierModeAvailable: true,             // NOUVEAU V4
  pdfExport: true,                        // NOUVEAU V4
  shareableUrl: true,                     // NOUVEAU V4
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
  durationRange: [2, 6.5],                // V4 étendu sub-6h
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfter: true,
  warningGutTrainingTop: true,
  premierModeAvailable: true,
  pdfExport: true,
  shareableUrl: true,
  H1: "Calculateur Nutrition Marathon — Glucides, eau et sel personnalisés",
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
  warningGutTrainingTop: true,
  premierModeAvailable: true,
  pdfExport: true,
  shareableUrl: true,
  H1: "Calculateur Nutrition Semi-Marathon — Honnête, précis, adapté à ton chrono",
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
└── Nutrition Course
    ├── Calculateur Nutrition Trail
    ├── Calculateur Nutrition Marathon
    └── Calculateur Nutrition Semi-Marathon
```

### V2 future (selon traffic)
- Ultra-Trail (>100km) et 10km séparés si analytics le justifient (3-6 mois).
- PWA installable + mode offline jour J.
- Outils nutrition pré-course et post-course (voir mémoire `project_coach_running_ia_outil_nutrition`).

---

## 3. INPUTS DU CALCULATEUR

### 3.1 Inputs COMMUNS aux 3 outils

| Input | Type | Required | Validation / Notes |
|---|---|---|---|
| Sexe | select (H/F) | Oui | Différences sudation ~10-30% selon individu (Wickham 2021) |
| Poids | number (kg) | Oui | 40-150 kg, **JAMAIS affiché ailleurs**, jamais cité en message |
| Niveau | select (Débutant / Régulier / Confirmé / Expert) | Oui | Impact intensité + tolérance |
| Chrono visé (ou durée prévue) | time | Oui | hh:mm:ss |
| Température estimée jour J | number (°C) | Oui | -10 à +45 |
| Hygrométrie estimée | select (Sec <40% / Standard 40-70% / Humide >70%) | Oui | +15 % sudation si humide (Casa 2019, Sawka 2007) |
| Profil sudation perçu | select (Faible / Modéré / Élevé / Salty sweater confirmé) | Oui | + mini-questionnaire scoré V4 (cf. §3.4) |
| Expérience nutrition en course | select (Jamais / Occasionnel / Habitué) | Oui | Caps automatiques cf. §4 |
| Habitude caféine quotidienne | select (Aucune / 1-2 cafés/j / 3+ cafés/j) | Oui | Dose + timing caféine ajustés |
| **Mode "Premier marathon/semi/ultra"** (V4) | toggle (Oui/Non) | Required si Niveau=Débutant | Active garde-fous spécifiques cf. §6 |
| **Phase cycle menstruel** (V4, optionnel) | select (Préfère ne pas dire / Folliculaire J1-J14 / Lutéale J15-J28) | Non | Adapte message sodium si lutéale (vigilance EAH ↑) |

### 3.2 Inputs SPÉCIFIQUES Trail

| Input | Type | Required | Notes |
|---|---|---|---|
| Distance course | number (km) | Oui | 5-300 km |
| D+ total | number (m) | Oui | 0-15 000 m |
| D- total | number (m) | Optional | 0-15 000 m (défaut = D+) |
| Altitude moyenne course | select (Mer/<1000m / 1000-1500m / 1500-2500m / 2500-3500m / >3500m) | Oui | Plus granulaire que V3 (5 paliers vs 4) |
| **Acclimaté altitude (séjour ≥7j récent)** (V4) | toggle (Oui/Non) | Required si altitude >1500m | Module +5 % (acclimaté) ou +15-25 % (aigu) (Mawson 2000) |
| Bases de vie prévues | number (count) | Optional | 0-10, conseils dédiés si >0 |
| Heure départ | time | Optional | Impact chaleur + caféine |

### 3.3 Inputs SPÉCIFIQUES Marathon

| Input | Type | Required | Notes |
|---|---|---|---|
| Météo prévue départ | select (Frais <10°C / Standard 10-20°C / Chaud 20-25°C / Très chaud >25°C) | Oui | Duplique T° pour UX simple |
| **Course officielle avec ravitos boisson iso ?** (V4) | select (Oui / Non / Je ne sais pas) | Optional | Si Oui : déduit apports ravitos du calcul gels (cf. §5) |

### 3.4 Inputs SPÉCIFIQUES Semi-Marathon

| Input | Type | Required | Notes |
|---|---|---|---|
| (mêmes que communs) | | | Outil le plus simple |
| Course officielle avec ravitos iso ? | select | Optional | Idem marathon |

### 3.5 Mini-questionnaire SCORÉ sudation (V4 — docteur Challenge #5)

Affiché si l'user clique "Je ne sais pas" sur Profil sudation :

| Question | Oui = 1 pt |
|---|---|
| Tu as souvent des traces blanches de sel sur tes vêtements après l'effort ? | |
| Tu as des croûtes salées sur le visage post-effort ? | |
| Tu as parfois des crampes même bien hydraté ? | |
| Tu ressens un goût salé sur les lèvres en course ? | |
| Tes vêtements deviennent rigides en séchant ? | |

**Score → profil auto-suggéré** :
- 0-1 → Faible (500-800 mg/L)
- 2-3 → Modéré (800-1200 mg/L)
- 4-5 → Salty sweater (1200-1600 mg/L)
- "Salty sweater confirmé extrême" requiert test labo (Precision Hydration patch ou pesée + analyse), pas attribué automatiquement.

**Source** : Baker 2017 (DOI: 10.1007/s40279-017-0691-5) — synthèse définitive sweat rate et SSC.

### 3.6 Borne basse Trail (V4 — coach delta #5)

Si distance saisie <10 km en trail → afficher message d'orientation :
> *« Pour les courses <10 km, la nutrition en course n'est généralement pas nécessaire. Concentre-toi sur ton petit-déjeuner et ton hydratation pré-course. Veux-tu quand même voir les recommandations ? »*

Évite des chiffres absurdes (« tu as besoin de 0 g glucides ») qui semblent buggés.

---

## 4. FORMULES DE CALCUL (V3 corrigée scientifiquement — docteur Challenges #1-10)

### 4.1 Distance équivalente Trail
```
D_eq (ITRA) = Distance + (D+/100) + (D-/400)
```
**Source** : International Trail Running Association (ITRA) — Performance Index.

### 4.2 Estimation énergétique (kcal totales) — formule corrigée V4

**Trail** (Minetti pondéré, V4 corrigé — docteur Challenge #1) :
```
kcal/h ≈ poids × [(vitesse_km/h × Cw_plat) + (m_grimpés/h × 0.011)]
avec Cw_plat ≈ 0.9-1.0 kcal/kg/km (course plate, di Prampero 1986)
descente ignorée par défaut (gain net ≈ 0 sauf pentes très raides — Vernillo 2017)
incertitude affichée ±20-25 %
```

**Marathon/Semi** :
```
kcal/h ≈ poids × allure_km/h × 0.95   (running flat, ACSM/AND 2016)
```

**Sources** : Minetti 2002 (DOI: 10.1152/japplphysiol.01177.2001), Vernillo 2017 (DOI: 10.1007/s40279-016-0605-y), di Prampero 1986 (DOI: 10.1055/s-2008-1025736), Lemire 2021 (DOI: 10.1007/s00421-021-04792-4).

### 4.3 Glucides recommandés (g/h)

#### Tableau 4.3.A — Trail (V4 corrigé)

| Durée effort | Gut-trained | Débutant (non gut-trained) | Type / Note |
|---|---|---|---|
| <1h | 0-30 g (souvent inutile) | 0 g | Mouth rinse possible |
| 1-2h | 30-60 g | 20-40 g | Glucose seul OK |
| 2-3h | 60-90 g | 40-60 g | Glucose:fructose 2:1 si >60 |
| 3-6h | **75-100 g** (V4 ↑ vs V3 60-90) | 50-70 g | G:F 2:1 ou 1:0.8 obligatoire |
| 6-12h | 80-100 g | 60-80 g | Multi-transporteurs + solide salé |
| 12-24h | 70-90 g (lassitude) | 50-70 g | Salé en 2e partie, plan B |
| 24h+ | 50-80 g (digestion saturée) | 40-60 g | Aliments vrais dominants |

**Sources** : Jeukendrup 2014 (DOI: 10.1007/s40279-014-0148-z), Costa 2017 (DOI: 10.1139/apnm-2016-0453), Tiller 2019 (DOI: 10.1186/s12970-019-0312-9), Naderi 2023 (DOI: 10.1007/s40279-022-01803-y), Burke 2024 (DOI: 10.1123/ijsnem.2023-0258).

#### Tableau 4.3.B — Marathon par chrono (V4 corrigé)

| Chrono | g/h gut-trained | Total course | Note sécurité |
|---|---|---|---|
| sub-2h30 | **90-110 g/h** (cible 100) | 225-275 g | 120 g/h documenté MAIS impose gut training 6-8 sem (Viribay 2020) |
| sub-3h | 80-100 g/h | 240-300 g | OK pour gut-trained |
| sub-3h30 | 70-90 g/h | 245-315 g | OK pour la majorité |
| sub-4h | 55-80 g/h | 220-320 g | Tolérance digestive prime |
| sub-4h30 | 45-70 g/h | 200-315 g | Confort > optimisation |
| sub-5h | 40-60 g/h | 200-300 g | Oxydation lipidique dominante |
| **sub-5h30** (V4) | **25-40 g/h** | 140-220 g | Marche-course / premier marathon |
| **sub-6h** (V4) | **20-35 g/h** | 120-210 g | Idem ; aucune caféine systématique (sommeil) |

**Ajustement V3 conservé + précisé V4** :
- "Jamais" → cap dur **60 g/h max**, peu importe chrono.
- "Occasionnel" → cap **80 g/h max**.
- "Habitué" → plage complète.

**Sources** : ACSM/AND 2016 (DOI: 10.1249/MSS.0000000000000852), IAAF Consensus 2019, Jeukendrup 2014, Viribay 2020 (DOI: 10.3390/nu12051367), Cermak & van Loon 2013 (DOI: 10.1007/s40279-013-0079-0).

#### Tableau 4.3.C — Semi-Marathon par chrono (V4 étendu)

| Chrono | Glucides | Notes |
|---|---|---|
| sub-1h15 | 0 g (mouth rinse) | Chambers 2009 — rinçage bouche suffit |
| 1h15-1h30 | 20-25 g (1 gel optionnel) | Vers km 12 |
| 1h30-1h45 | 30-50 g (1-2 gels) | Optionnel |
| 1h45-2h | 40-60 g (2 gels) | Recommandé |
| 2h-2h30 | 45-75 g (2-3 gels) | Recommandé |
| **sub-3h** (V4) | **25-40 g/h** | Premier semi / marche-course |
| **sub-3h30** (V4) | **20-30 g/h** | Idem ; focus mental + plan B walk-run |

**Sources** : Chambers 2009 (DOI: 10.1113/jphysiol.2008.164285), De Pauw 2015 (DOI: 10.1007/s40279-015-0394-8), Burke 2024.

### 4.4 Hydratation (mL/h)

#### Matrice par profil × température (V3 conservé)

| Sudation | Frais <10°C | Standard 10-20°C | Chaud 20-25°C | Très chaud >25°C |
|---|---|---|---|---|
| Faible (H<70kg, F) | 300-400 | 400-500 | 500-600 | 600-700 |
| Modéré | 400-500 | 500-650 | 650-800 | 800-1000 |
| Élevé (H>80kg) | 500-600 | 600-800 | 800-1000 | 1000-1200 |

**Cap absolu : 1000 mL/h par défaut** (au-delà = risque hyponatrémie d'effort, EAH).

**Ajustements** :
- Humidité >70 % : +15 % (Casa 2019, Sawka 2007)
- Altitude 1500-2500 m aigu : +15 % ; acclimaté : +5 % (Mawson 2000, Pasiakos 2017)
- Altitude 2500-3500 m aigu : +25 % ; acclimaté : +10 %
- Altitude >3500 m : disclaimer "consulte médecin du sport"

**Nuance scientifique V4 (docteur Challenge #4)** ajoutée dans la carte sécurité :
> *« Le seuil 1000 mL/h est un garde-fou pour limiter le risque d'hyponatrémie. Pour les profils >85 kg en très forte chaleur (>28°C), le besoin réel peut excéder 1 L/h ; dans ce cas, **la priorité est d'augmenter le sodium (1000-1500 mg/L) plutôt que le volume**. Un test de pesée pré/post sortie longue est le gold standard pour t'individualiser. »*

**Sources** : ACSM Position Stand 2007 (DOI: 10.1249/mss.0b013e31802ca597), Thomas 2016 (DOI: 10.1249/MSS.0000000000000852), Hew-Butler 2015 (DOI: 10.1097/JSM.0000000000000221), Beis 2012 (DOI: 10.1097/JSM.0b013e31824a55d7), Hoffman & Stuempfle 2014 (DOI: 10.1080/15438627.2014.915838).

### 4.5 Sodium (mg/h) — par profil sudation (V4 corrigé — docteur Challenge #5)

| Profil | Sodium mg/h | Sodium mg/L eau (V4) | Note |
|---|---|---|---|
| Faible | 200-400 | 500-700 | Idem V3 |
| Modéré | 400-700 | 700-1000 | Idem V3 |
| Élevé | 700-1000 | **1000-1300** (V3: 1000-1500) | Élargi vers le bas |
| Salty sweater confirmé | 1000-1500 | **1200-1600** (V3: 1500-2000) | Réaliste pour majorité (Baker 2017) |
| Salty sweater extrême (test labo) | 1500-1800 | 1600-2000 | Cas rares <5 %, mention test Precision Hydration |

**Sources** : Hew-Butler 2015, Baker 2017 (DOI: 10.1007/s40279-017-0691-5 — synthèse définitive), Stofan 2005 (DOI: 10.1123/ijsnem.15.6.641), Maughan & Shirreffs 2008 (DOI: 10.1123/ijsnem.18.5.457), Sims 2007 (DOI: 10.1249/01.mss.0000241647.13220.4f).

### 4.6 Caféine (mg) (V4 corrigé — docteur Challenge #6 + coach delta #11)

| Phase | Quantité V4 | Timing | Notes |
|---|---|---|---|
| Pré-course (non-habitué : 0 café/j) | **1.5-3 mg/kg** | 60-90 min avant | Réduit risque GI/anxiété |
| Pré-course (1-2 cafés/j) | 3-4 mg/kg | 45-75 min avant | Standard ISSN |
| Pré-course (3+ cafés/j) | 4-5 mg/kg (jusqu'à 6 si tolérance prouvée) | 30-60 min avant | Tolérance ↓ effet ergogène |
| En course (durée >2h) | 1-2 mg/kg | Toutes les 2h | Affinage V4 vs V3 (1-3 / 2-3h) |
| Boost final | 100-200 mg | 30-45 min avant fin | **Inclus dans plafond 24h** |
| Plafond 24h cumulé | **6 mg/kg/24h** | — | Au-delà : tachycardie, GI, insomnie |

**Forme** :
- Café noir → cinétique lente, ~60 min
- Gélule liquide (NoDoz, ProPlus) → cinétique rapide, 30-45 min
- Gel caféiné → 30 min

**Génétique CYP1A2** : 20-30 % métaboliseurs lents (pic à 90-120 min) — non testable côté outil mais mentionné pour transparence.

**Test obligatoire** : impérativement sur 2-3 SL avant course objectif (effets secondaires possibles : tachycardie, troubles digestifs, anxiété, palpitations).

**Sources** : Guest 2021 (DOI: 10.1186/s12970-020-00383-4 — ISSN Position Stand), Spriet 2014 (DOI: 10.1007/s40279-014-0257-8), Grgic 2020 (DOI: 10.1136/bjsports-2018-100278), Pickering & Kiely 2018 (DOI: 10.1007/s40279-017-0776-1), Burke 2008 (DOI: 10.1139/H08-130).

### 4.7 Protéines (Trail uniquement, effort >4h) — V4 reformulé

> **Protéines en ultra (durée >4h) — option pratique, pas reco forte** :
> - À partir de la 4e heure, intégrer **5-10 g protéines/h** peut aider à :
>   - Limiter la dégradation musculaire (preuves modérées, Saunders 2007)
>   - Rompre la monotonie gustative (anti-écœurement, pratique terrain)
>   - Apporter un peu de salé via fromage/charcuterie (sodium utile)
> - **Les preuves de gain de performance restent limitées** (Tiller 2019, ISSN).
> - Formes pratiques : gels protéinés, fromage sec, jambon cru, saucisson, EAA en boisson.
> - À éviter : whey concentrée pure en course (osmolarité élevée → GI distress).

**Sources** : Tiller 2019 (DOI: 10.1186/s12970-019-0312-9), Saunders 2007 (DOI: 10.1519/R-21306.1), Knechtle & Nikolaidis 2018 (DOI: 10.3389/fphys.2018.00634), Tarnopolsky 2004, Pasiakos 2014 (DOI: 10.1007/s40279-014-0242-2).

### 4.8 Ratio glucose:fructose (V4 nouveau — docteur Challenge #3)

Pour les apports >60 g/h, un mélange glucose+fructose est obligatoire. Deux ratios validés :

- **Glucose:fructose 2:1** — répandu commercialement (Maurten 160, SiS Beta Fuel, Powerbar). Tolérance correcte jusqu'à ~90 g/h.
- **Glucose:fructose 1:0.8** (presque 1:1) — moins de troubles digestifs et meilleure perf documentée chez coureurs (King 2018, Rowlands 2015). Cherche "ratio 1:0.8" ou "ratio fructose élevé" sur l'étiquette.

**Reco V4** : si tu vises >90 g/h sur ultra long → privilégie le **1:0.8**.

**Sources** : O'Brien & Rowlands 2011 (DOI: 10.1152/ajpregu.00343.2010), Rowlands 2015 (DOI: 10.1007/s40279-015-0383-y), King 2018 (DOI: 10.1123/ijsnem.2017-0220), Jeukendrup & Moseley 2010, Wallis 2008 (DOI: 10.1249/MSS.0b013e3181662c4f).

### 4.9 Mouth rinse (V4 protocole précisé — docteur Challenge #8)

Pour semi sub-1h15 (et marathon élite court) :
- Solution : 25 mL d'eau + 1 sachet de maltodextrine 6 % (ou cola coupé), OU gel énergétique dilué dans 25 mL d'eau.
- Protocole : **rincer la bouche 5-10 secondes, puis recracher** (ne pas avaler).
- Fréquence : toutes les 10-15 min.
- Gain : 2-3 % sur time-trial 60 min (De Pauw 2015).
- **Important** : effet **minoré si petit-déjeuner riche en glucides <2h avant** (glycogène hépatique plein). Optimal en post-absorptif (>3h après dernier repas).
- Effet **maximal <60 min**, encore utile mais avec moins d'avantage prouvé pour 60-75 min.

**Sources** : Chambers 2009 (DOI: 10.1113/jphysiol.2008.164285), De Pauw 2015 (DOI: 10.1007/s40279-015-0394-8), Brietzke 2019 (DOI: 10.3390/brainsci9070159).

### 4.10 Déduction ravitos officiels (V4 — coach delta #8)

Si l'user coche "Course officielle avec ravitos boisson iso = Oui" :
- Hypothèse : ~6 ravitos sur marathon ASO (Paris, Nantes, Berlin), gobelets 150 mL × concentration 60-80 g/L = **60-72 g glucides "gratuits"** sur la course.
- Affichage carte synthèse : *« Sur cette course, prévois X gobelets iso aux ravitos (~Y g glucides). Ton complément en gels propres : Z gels. »*
- Évite le sur-dosage en gels.

---

## 5. CARTES DE RÉSULTAT (5-10 selon outil)

### 5.1 Cartes COMMUNES aux 3 outils

1. **Synthèse** : récapitulatif total course (kcal, g glucides, mL eau, mg sodium, mg caféine) + déduction ravitos si coché.
   - **V4** : message anti-rigidité en pied de carte synthèse (anti-TCA soft, coach delta #15 / risque #1) :
     > *« Ces chiffres sont des cibles théoriques (±15-25 %). Ton corps et ton ressenti restent les meilleurs juges. Manger trop strict ne te rendra pas plus performant. Si la nutrition devient une source d'angoisse, parle-en à un professionnel. »*

2. **Timeline** : ligne temporelle visuelle (gel toutes les 25 min, boisson tous les 20 min, sodium toutes les 30 min).
   - **V4** : zone "ROUGE" entre H-30 et H-0 (« ne touche à rien de sucré sauf eau ») — coach delta anti-hypo réactionnelle.

3. **Pack nutrition** : exemple concret de produits (X gels marque type, Y bidons isotoniques, Z caps sel). Mention ratio 1:0.8 pour apports >90 g/h.

4. **Sécurité & garde-fous** :
   - Hyponatrémie : signes + prévention (formulation adaptée selon durée — cf. §6)
   - Hypoglycémie réactionnelle : éviter gel <15 min départ
   - Troubles digestifs : importance gut training (renvoi vers carte dédiée §5.2.7)
   - Test pesée pré/post SL (gold standard hydratation individualisée)
   - **V4** : section "Conditions extrêmes (>30°C + acclimatation)" (coach delta #10 / docteur Challenge #4)
   - **V4** : mention cycle menstruel — vigilance EAH phase lutéale (docteur Challenge #9)
   - Disclaimer médical élargi (cf. §6 V4)

5. **FAQ tabulée** : 12-15 questions intentionnelles SEO (cf. §7).

### 5.2 Cartes SPÉCIFIQUES Trail

6. **Conseils ravitos / bases de vie** (V4 enrichi — coach delta #14) :
   - **BdV courte <5 min** : 1 banane + 1 morceau fromage + boisson iso + bouillon chaud.
   - **BdV moyenne 5-10 min** : bol soupe + tranche pain-fromage + boisson iso + 2 gorgées eau salée + sortie avec gel propre.
   - **BdV longue >15 min** : repas chaud (riz, pâtes, omelette) + boisson récup partielle (50 g glucides + 10 g protéines) + sieste possible si nuit + change chaussettes + reprise progressive 5 min marche.

7. **Lassitude gustative & plan B** (V4 enrichi massivement — coach delta #13) :
   - **Anticipation** : alternance liquide/solide, températures contrastées (chaud/froid), rinçages eau pure entre prises.
   - **Quand ça arrive — protocole en 4 étapes** :
     1. Marcher 10-15 min (baisse intensité = digestion reprend).
     2. Petite gorgée eau salée tiède.
     3. Cola dégazé (60-90 mL) OU capsule gingembre OU bonbon menthe.
     4. Si ça ne passe pas en 30 min → arrêt en base de vie, repos 30-45 min, médecin si possible.
   - **Kit anti-écœurement à emporter** : comté en cube, saucisson sec en tranches, pickles, citron, gingembre bonbon, bouillon en sachet, eau gazeuse, cola dégazé.

8. **Altitude** : ajustement aigu vs acclimaté (cf. §4.4).

### 5.3 Cartes SPÉCIFIQUES Marathon

6. **Caféine pré-course** : stratégie selon habitude (cf. §4.6).

7. **Mur du 30e km** : pourquoi (épuisement glycogène ~30-32 km) + comment l'éviter par la nutrition (apports glucides dès km 5-8, ne pas attendre le mur, déduction ravitos si officielle).

### 5.4 Cartes SPÉCIFIQUES Semi

6. **Faut-il manger ?** : réponse honnête selon chrono (carte forte SEO).
   - <1h15 : non, mouth rinse possible.
   - 1h15-1h45 : optionnel, 1-2 gels confort.
   - >1h45 : oui, recommandé.

### 5.5 Carte "Quand tester ta stratégie" (V4 nouvelle — coach delta #12, principale opportunité cross-promo)

Affichée sur les 3 outils, post-synthèse :

> **Le calcul ci-dessus n'est qu'une cible théorique. Pour qu'il marche le jour J, tu dois entraîner ton estomac.**
>
> **Durée gut training selon ta cible** (docteur Challenge #11) :
> - Cible <60 g/h : **2-3 semaines** suffisent (Costa 2017)
> - Cible 60-90 g/h : **3-5 semaines** (Jeukendrup 2017)
> - Cible 90-120 g/h : **6-8 semaines** (intégration progressive)
>
> **Protocole** :
> - Choisis une sortie longue (SL) >1h30 dans ton plan.
> - Commence à 30 g/h sur la 1ère SL test.
> - Augmente +10-15 g/h toutes les 2 semaines, jusqu'à atteindre ta cible course 4 semaines avant.
> - Teste **3 fois minimum** chaque produit (gel, boisson, caféine) avant la course objectif.
> - **Règle d'or — Rien de nouveau le jour J.**
>
> **Test pesée pré/post SL** : pèse-toi avant et après une SL d'1h à effort cible, dans conditions proches du jour J. La perte de poids ≈ ton volume sudation. Compense 60-80 % par hydratation en course (gold standard ACSM/AND 2016).
>
> **Tu n'as pas encore de plan structuré ?** → [ CTA : Génère ton plan gratuit en 2 min ]

### 5.6 Carte "Méthodologie & limites" (V4 nouvelle — docteur transparence)

> Notre calculateur s'appuie sur le consensus scientifique 2024 (ACSM/AND 2016, ISSN, IAAF 2019) et les méta-analyses récentes (Naderi 2023, Burke 2024, Cermak 2013). Les valeurs sont des estimations théoriques.
>
> **Limites épistémiques** :
> - Variabilité individuelle de tolérance digestive : ±15-25 % sur la plupart des recommandations.
> - Effet "matrice" des produits (hydrogel, gel classique, liquide) : études limitées.
> - Optimum sodium individuel : test labo (Precision Hydration patch) = gold standard.
> - Métabolisme caféine : génétique CYP1A2 fait varier l'effet (20-30 % métaboliseurs lents).
>
> **Le test individuel à l'entraînement reste irremplaçable.**

---

## 6. WARNINGS & GARDE-FOUS SÉCURITÉ (V4 — coach Challenge #5 + docteur Challenge #12)

### 6.1 Warning gut training en TÊTE de page (V4 nouveau, coach delta #16)

Voir §1 (warning ouverture obligatoire).

### 6.2 Mode "Premier marathon/semi/ultra" (V4 nouveau, coach delta #1 + #7)

Si user coche "Oui" au mode "Premier" :

- **Plafond plage haute** : jamais >70 g/h marathon, jamais >60 g/h semi, jamais >70 g/h trail <12h.
- **Désactiver warnings techniques anxiogènes** (mention "décès" EAH, sodium 1500+ salty sweater extrême) — sauf vraiment pertinents pour le chrono.
- **Message pédagogique en TÊTE de la carte synthèse** :
  > *« Premier marathon : ces chiffres sont une cible théorique. **Ta vraie priorité, c'est de finir confortable, pas optimal.** Mieux vaut 50 g/h bien digérés que 80 g/h vomis. Reste sur la fourchette basse, teste tout sur 2-3 SL minimum, et ne change rien le jour J. »*

### 6.3 Warning hyponatrémie d'effort (EAH) — formulation adaptée selon contexte (V4, coach delta #9)

**Marathon / Semi (<5h)** — affiché si hydratation calculée >800 mL/h :
> *« Tu vises >800 mL/h. C'est élevé mais cohérent avec ton profil et la chaleur prévue. **À retenir** :*
> *- Bois selon ta soif, pas en forçant.*
> *- Combine toujours avec du sodium (voir ci-dessous, sinon risque hyponatrémie).*
> *- Ne dépasse jamais 1 L/h. »*

**Trail / Ultra (>6h)** — ton appuyé conservé (risque statistiquement réel) :
> *« **Hyponatrémie d'effort** : sur les ultras longs, c'est un risque sérieux. Symptômes à surveiller : nausées, maux de tête, confusion, prise de poids pendant la course (urines très claires + abondantes = OVER-hydratation, pas l'inverse). Si suspicion → arrête l'eau, prends du sodium (capsule + aliment salé), repose-toi 30 min. Plus de détails sur la carte Sécurité. »*
>
> Sources citées : Almond 2005 (DOI: 10.1056/NEJMoa043901), Hew-Butler 2015 (DOI: 10.1097/JSM.0000000000000221).

### 6.4 Hypoglycémie réactionnelle — si gel pris <15 min départ
> *« Évite de prendre ton premier gel <15 min avant le départ. Le pic d'insuline peut provoquer une chute glycémique en début de course. Zone ROUGE H-30 → H-0 : ne touche à rien de sucré sauf eau. »*

### 6.5 Disclaimer médical V4 — élargi (docteur Challenge #12)

> **Cet outil ne s'applique PAS si tu présentes l'une des conditions suivantes — consulte ton médecin ou un diététicien du sport** :
>
> **Pathologies métaboliques** :
> - Diabète (type 1, type 2, gestationnel)
> - Hyperinsulinisme / hypoglycémies réactionnelles fréquentes
> - Intolérance au fructose (héréditaire ou acquise)
>
> **Pathologies digestives** :
> - Reflux gastro-œsophagien (RGO) symptomatique
> - Syndrome de l'intestin irritable (SII / IBS)
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
> - Grossesse (besoins majorés, caféine plafonnée à 200 mg/j OMS)
> - Allaitement
> - Antécédents de troubles du comportement alimentaire (TCA)
>
> **Asthme à l'effort** : garde ton inhalateur à proximité. Une déshydratation aiguë peut potentialiser une broncho-constriction.

**Sources** : Costa 2017 (DOI: 10.1111/apt.14157), De Oliveira & Burini 2014 (DOI: 10.3390/nu6104191), Boulet 2007 (DOI: 10.1097/MCP.0b013e328011a93f), Lipman 2017 (DOI: 10.1136/emermed-2016-206353).

### 6.6 Estimation ±15-25 % — toujours affiché
> *« Les valeurs calculées sont des estimations théoriques ±15-25 %. Adapte selon ton expérience individuelle et les retours terrain de tes entraînements. »*

### 6.7 Cycle menstruel (V4 — Option B générique, docteur Challenge #9)

Affiché en carte sécurité, sans input intime imposé :
> *« Si tu es en deuxième moitié de cycle (jours 15-28, avant tes règles) : vigilance accrue sur le sodium. La rétention hydrique naturelle de cette phase peut augmenter le risque d'hyponatrémie d'effort. Privilégie une boisson sodée et limite l'eau plate. »*

Si user coche input optionnel "Phase lutéale" : on ajoute juste ce message en surbrillance — pas de modulation chiffrée (sujet sous-étudié).

**Sources** : Janse de Jonge 2003, Oosthuyse & Bosch 2010 (DOI: 10.2165/11317090-000000000-00000), Wickham 2021 (DOI: 10.1007/s00421-020-04550-y), Wohlgemuth 2021 (DOI: 10.1186/s12970-021-00422-8).

### 6.8 Validation logique inputs (V4 — risque #5)

Si inputs incohérents (ex : poids 60 kg + vise 2h marathon + sudation Faible + 30°C) → message d'orientation soft :
> *« Certaines de tes valeurs semblent inhabituelles ensemble. Vérifie tes saisies — ou continue si tu sais ce que tu fais. »*

Pas de blocage, pas de jugement. Respect doctrine "compromis + messages préventifs".

---

## 7. SEO & CONTENU (1500-2500 mots par page)

### 7.1 Page Trail — `/outils/nutrition-trail`

**KW principaux** (8) : nutrition trail (480), nutrition ultra trail (140), pack nutrition trail (70), plan nutrition trail (70), gels trail (50), hydratation trail (40), sodium course trail (30), caféine trail (30).

**KW longue traîne** (top 20) :
- "combien de gels pour 50 km trail" / "pack nutrition Saintélyon" / "que manger en base de vie UTMB"
- "comment éviter les crampes en trail" / "pourquoi mal au ventre en ultra"
- "stratégie nutrition trail 30 km" / "alternance liquide solide trail" / "ravitaillement trail 80 km"
- "salé sucré en trail" / "plan B nutrition ultra" / "gut training trail" / "hyponatrémie trail"
- "altitude et nutrition trail" / "boisson isotonique trail" / "purée patate douce trail"
- "saucisson en trail" / "déshydratation trail signes" / "combien boire en trail chaud"
- "nutrition trail femme" / "nutrition trail débutant"

**H2/H3** :
1. À quoi sert ce calculateur (intro + warning pré/post)
2. Comment marche le calculateur (formules ITRA + Minetti V4 expliquées, sources citées)
3. Glucides en trail : combien par heure selon distance et D+ (tableau §4.3.A)
4. Hydratation et sodium en trail : éviter crampes et hyponatrémie
5. Caféine en trail : pré-course, en course, boost final
6. Pack nutrition trail 30 km / 50 km / 80 km / 100 km / UTMB 170 km (5 H3 longue traîne)
7. Gut training : pourquoi tester sa nutrition à l'entraînement (renvoi carte §5.5)
8. Altitude et nutrition trail (aigu vs acclimaté)
9. Lassitude gustative et plan B "estomac fermé" (renvoi carte §5.2.7)
10. FAQ trail (15 questions)

**FAQ — 15 vraies questions** :
1. Combien de gels pour un trail de 30/50/80/100/170 km ?
2. Faut-il boire plus en altitude ? (aigu vs acclimaté)
3. Combien de sodium pour éviter les crampes ?
4. Pourquoi j'ai mal au ventre en ultra ?
5. Que manger à une base de vie ? (3 cas : courte/moyenne/longue)
6. Caféine en trail : combien et quand ? (selon habitude)
7. Saucisson, fromage, soupes en trail : oui ou non ?
8. Comment gérer la lassitude gustative après 8h d'effort ? (protocole 4 étapes)
9. Quelle stratégie si je n'arrive plus à manger (estomac fermé) ?
10. Différence entre boisson isotonique et eau plate en trail ?
11. Hyponatrémie en trail : symptômes et prévention ?
12. Faut-il prendre des protéines en ultra-trail (>4h) ? (réponse honnête : optionnel)
13. Comment s'entraîner à manger en course (gut training) ?
14. Nutrition trail femme vs homme : quelles différences ? (cycle inclus)
15. Premier trail : comment ne pas se planter sur la nutrition ?

### 7.2 Page Marathon — `/outils/nutrition-marathon`

**KW principaux** (8) : nutrition marathon (390), marathon nutrition (110), plan nutrition marathon (90), gels marathon (70), hydratation marathon (60), caféine marathon (50), mur du 30e km (40), boisson isotonique marathon (30).

**KW longue traîne V4** (top 17 — +2 vs V3 pour profils long) :
- "plan nutrition marathon sub 3h / 3h30 / 4h / 4h30 / 5h / **sub-5h30 / sub-6h**" (7 KW chrono — V4 étendus)
- "combien de gels pour un marathon"
- "quand prendre son premier gel marathon"
- "caféine avant marathon dosage"
- "comment éviter le mur du marathon"
- "ravitaillement marathon Paris / New York / Berlin" (déduction ravitos)
- "boisson énergétique marathon"
- "nutrition marathon femme" / "nutrition marathon premier"
- "isotonique vs gels marathon"

**H2/H3** :
1. À quoi sert ce calculateur (intro + warning pré/post)
2. Comment marche le calculateur (formules ACSM/Jeukendrup, sources citées)
3. Glucides par heure en marathon : 20 à 110 g/h selon ton chrono (tableau §4.3.B — 8 paliers V4)
4. Hydratation marathon : matrice 4 profils × 4 températures + nuance >85 kg chaleur extrême
5. Sodium en marathon : pourquoi c'est sous-estimé (questionnaire scoré)
6. Caféine et marathon : dosage et timing selon habitude (3 paliers)
7. Plan nutrition marathon sub-3h / sub-3h30 / sub-4h / sub-4h30 / sub-5h / **sub-5h30 / sub-6h** (7 H3 longue traîne — V4)
8. Mur du 30e km : pourquoi et comment l'éviter par la nutrition
9. Gut training avant marathon (renvoi carte §5.5)
10. FAQ marathon (15 questions)

### 7.3 Page Semi-Marathon — `/outils/nutrition-semi-marathon`

**KW principaux** (5) : nutrition semi marathon (170), semi marathon nutrition (110), plan nutrition semi (50), faut-il manger semi marathon (30), gels semi marathon (30).

**KW longue traîne V4** (top 14 — +2 vs V3) :
- "plan nutrition semi sub-1h30 / sub-1h45 / sub-2h / sub-2h30 / **sub-3h / sub-3h30**" (6 KW chrono — V4 étendus)
- "faut-il prendre des gels en semi"
- "mouth rinse semi marathon" / "protocole mouth rinse Chambers"
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
6. Plan nutrition semi sub-1h15 / sub-1h30 / sub-1h45 / sub-2h / sub-2h30 / **sub-3h / sub-3h30** (7 H3 longue traîne — V4)
7. Mouth rinse (rinçage bouche) : protocole précis Chambers 2009 (cf. §4.9)
8. **Mini-FAQ Hyrox** (V4 coach delta #27) : 1-2 questions ("Hyrox : faut-il manger pendant ? Non, effort total <90 min. Concentre-toi sur petit-déjeuner et hydratation.")
9. FAQ semi (12 questions)

---

## 8. MAILLAGE INTERNE + ARTICULATION OUTIL ↔ PLAN (V4 nouveau — coach Challenges #1 + #4)

### 8.1 Maillage classique (V3 conservé)

En bas de chaque page, bloc visuel "Outils nutrition complémentaires" :
- Cross-links entre les 3 outils nutrition (trail ↔ marathon ↔ semi).
- Outils performance liés → Convertisseur d'allure, Prédicteur de temps, Allure marathon, Calculateur VMA.

### 8.2 Sens "Outil nutrition → Plan d'entraînement" (V4 nouveau)

1. **CTA principal en haut de l'outil** (sous le warning gut training) :
   > *« Pas encore de plan d'entraînement structuré ? Notre générateur te crée un plan personnalisé en 2 min — gratuit. → [ Créer mon plan ] »*

2. **CTA secondaire dans la carte "Quand tester ta stratégie" (§5.5)** :
   > *« Pas encore de SL programmées dans ta semaine ? Notre générateur t'en intègre selon ton objectif. → [ Créer mon plan ] »*

3. **CTA tertiaire dans la FAQ "Combien de temps avant la course tester ?"** :
   > *« Lance ton plan 12-16 semaines avant ta course objectif → tu auras 8-10 SL pour tester ta nutrition. → [ Plan personnalisé gratuit ] »*

### 8.3 Sens "Plan d'entraînement → Outil nutrition" (V4 nouveau — coach delta #23)

À intégrer dans le générateur de plans existant :

1. **Welcome message du plan** (mention courte, ≤ 40 mots, pas de chiffres) :
   > *« Ta nutrition en course n'est pas dans ce plan — c'est volontaire. Pour la calculer et la tester sur tes sorties longues, va sur notre outil dédié : /outils/nutrition-marathon (ou trail/semi selon ton objectif). À regarder 6-8 semaines avant ta course. »*

2. **Advice fin de plan** (dernière semaine, optionnel) :
   > *« J-7 : as-tu testé ta stratégie nutrition ? Si non → [outils nutrition]. Si oui, ne change rien le jour J. »*

### 8.4 Documentation doctrine (V4 — coach delta #24)

Ajouter au mémoire `feedback_pas_de_nutrition_dans_plan` (à valider Romane) :
> *« Exception : le plan peut MENTIONNER (sans chiffres) l'existence des outils nutrition séparés et inviter à les utiliser pour tester sur SL. »*

Compatible avec :
- `feedback_pas_de_nutrition_dans_plan` (mention ≠ chiffres dans plan)
- `feedback_jamais_contact_client` (cross-sell soft via UI, pas mail/notif)
- `feedback_securite_avant_conversion` (CTA soft, outil reste utilisable seul)

---

## 9. MODE "PREMIER" (V4 nouveau — coach Challenges #2 + #3)

### 9.1 Activation
- **Auto-activé** si Niveau = Débutant.
- **Toggle manuel** ("C'est mon premier marathon / semi / ultra ?") visible pour tous, permet Régulier/Confirmé de l'activer aussi (cas premier ultra pour un coureur route confirmé).

### 9.2 Effets sur le calcul

| Item | Mode standard | Mode "Premier" |
|---|---|---|
| Plage haute glucides marathon | jusqu'à 110 g/h | **plafonnée à 70 g/h** |
| Plage haute glucides semi | jusqu'à 75 g/h | **plafonnée à 60 g/h** |
| Plage haute glucides trail (<12h) | jusqu'à 100 g/h | **plafonnée à 70 g/h** |
| Warning EAH | selon seuil | désactivé sauf vraiment pertinent au chrono |
| Sodium salty sweater | jusqu'à 1600 mg/L | plafonné à 1300 mg/L (pas de "extrême") |
| Caféine | plage complète | **plafonnée à 3 mg/kg max** |
| Message anti-rigidité en tête synthèse | absent | **affiché** |

### 9.3 Message anti-rigidité (en tête de carte synthèse, en mode Premier)

> *« Premier marathon : ces chiffres sont une cible théorique. **Ta vraie priorité, c'est de finir confortable, pas optimal.** Mieux vaut 50 g/h bien digérés que 80 g/h vomis. Reste sur la fourchette basse, teste tout sur 2-3 SL minimum, et ne change rien le jour J. »*

Cohérent avec doctrine `feedback_securite_avant_conversion` + anti-TCA soft.

---

## 10. UX JOUR J — MVP V4 (V4 nouveau — coach Challenge #10)

### 10.1 MVP (à inclure dans le brief V4 pour dev)

1. **Mobile-first responsive** — obligatoire :
   - Matrices hydratation 4×4 → **cards verticales sur mobile**, pas tableau réduit illisible.
   - Inputs en **wizard step-by-step** sur mobile (3-4 écrans avec progress bar), pas 10 inputs sur 1 écran.
   - Outputs en **cards séparées scrollables** sur mobile.
   - Bouton "Recalculer" **sticky en bas d'écran** mobile.

2. **Export PDF 1 page A5 — "Ma stratégie nutrition"** :
   - Header : nom de la course (saisissable), chrono visé, date.
   - Tableau résumé : à H+X min → prendre Y g glucides + Z mL boisson + W mg sodium.
   - Timeline visuelle compacte.
   - Liste shopping pack (gels, caps sel, boisson iso, kit anti-écœurement si trail).
   - 3 warnings essentiels en pied (1 phrase chacun) : gut training / hypoglycémie pré-course / EAH si pertinent.
   - Format imprimable propre (noir/blanc lisible, repliable en 2).

3. **URL partageable avec query string** :
   - Tous les inputs sérialisés en params URL.
   - L'athlète sauvegarde l'URL, la rouvre n'importe quand, partage avec coach/compagnon.
   - Pas de backend, pas de compte, pas de tracking PII.

### 10.2 V2 (selon traffic, après 3-6 mois)

4. **PWA installable** (icône home screen, manifest.json) — économie dev vs app native.
5. **Mode offline** (service worker cache la dernière session) — utile jour J en montagne sans réseau.
6. **Mode "course en cours"** : interface simplifiée timeline qui scroll au temps réel selon heure de départ saisie.

### 10.3 Cohérence doctrine

- **Aucune notif push** (respect `feedback_jamais_contact_client`).
- Format léger, pas d'app native (économie dev).
- Pas de tracking PII en URL partagée.

---

## 11. BIBLIOGRAPHIE COMPLÈTE (57 références DOI — fournies par docteur Phase 2)

### Glucides en course (12)
1. Jeukendrup AE (2010). *Carbohydrate intake during exercise and performance*. Nutrition 20:669-77. DOI: 10.1016/j.nut.2004.04.017
2. Jeukendrup AE (2014). *A step towards personalized sports nutrition: carbohydrate intake during exercise*. Sports Med 44 Suppl 1:S25-33. DOI: 10.1007/s40279-014-0148-z
3. Cermak NM, van Loon LJC (2013). *The use of carbohydrates during exercise as an ergogenic aid*. Sports Med 43(11):1139-55. DOI: 10.1007/s40279-013-0079-0
4. Viribay A et al. (2020). *Effects of 120g/h CHO during marathon*. Nutrients 12(5):1367. DOI: 10.3390/nu12051367
5. Naderi A et al. (2023). *Carb intake during exercise: dose-response*. Sports Med 53(4):723. DOI: 10.1007/s40279-022-01803-y
6. Podlogar T, Wallis GA (2022). *New horizons in carbohydrate research*. Sports Med 52(Suppl 1):5. DOI: 10.1007/s40279-022-01757-1
7. Burke LM et al. (2024). *Toolkit for personalising amount and timing of carb fueling*. IJSNEM 34:174-188. DOI: 10.1123/ijsnem.2023-0258
8. King AJ et al. (2018). *Fructose+maltodextrin hydrogel in runners*. IJSNEM 28(3):292-300. DOI: 10.1123/ijsnem.2017-0220
9. O'Brien WJ, Rowlands DS (2011). *Fructose-maltodextrin ratio*. Am J Physiol 300:R1067-75. DOI: 10.1152/ajpregu.00343.2010
10. Rowlands DS et al. (2015). *Composite vs single transportable CHO*. Sports Med 45:1561-1576. DOI: 10.1007/s40279-015-0383-y
11. Wallis GA et al. (2008). *Oxidation of combined ingestion of maltodextrin and fructose*. MSSE 40:1733. DOI: 10.1249/MSS.0b013e3181662c4f
12. Stellingwerff T, Cox GR (2014). *Systematic review CHO supplementation*. Appl Physiol Nutr Metab 39:998. DOI: 10.1139/apnm-2014-0027

### Hydratation et sodium (9)
13. Sawka MN et al. (2007). *ACSM Position Stand: Exercise and Fluid Replacement*. MSSE 39:377-90. DOI: 10.1249/mss.0b013e31802ca597
14. Thomas DT, Erdman KA, Burke LM (2016). *ACSM/AND Position*. MSSE 48:543-68. DOI: 10.1249/MSS.0000000000000852
15. Hew-Butler T et al. (2015). *3rd International EAH Consensus*. Clin J Sport Med 25:303-20. DOI: 10.1097/JSM.0000000000000221
16. Almond CSD et al. (2005). *Hyponatremia Boston Marathon*. NEJM 352:1550-6. DOI: 10.1056/NEJMoa043901
17. Baker LB (2017). *Sweat rate and SSC in athletes*. Sports Med 47(Suppl 1):111-128. DOI: 10.1007/s40279-017-0691-5
18. Stofan JR et al. (2005). *Sweat and Na+ NCAA football*. IJSNEM 15:641-52. DOI: 10.1123/ijsnem.15.6.641
19. Maughan RJ, Shirreffs SM (2008). *Individual hydration strategies*. IJSNEM 18:457-72. DOI: 10.1123/ijsnem.18.5.457
20. Beis LY et al. (2012). *Drinking behaviors elite male marathoners*. Clin J Sport Med 22:254-61. DOI: 10.1097/JSM.0b013e31824a55d7
21. Hoffman MD, Stuempfle KJ (2014). *Hydration 161 km ultra*. Res Sports Med 22:213-25. DOI: 10.1080/15438627.2014.915838

### Caféine (5)
22. Guest NA et al. (2021). *ISSN Position Stand Caffeine*. JISSN 18:1. DOI: 10.1186/s12970-020-00383-4
23. Spriet LL (2014). *Low doses caffeine*. Sports Med 44 Suppl 2:S175-84. DOI: 10.1007/s40279-014-0257-8
24. Grgic J et al. (2020). *Umbrella review caffeine*. BJSM 54:681-688. DOI: 10.1136/bjsports-2018-100278
25. Pickering C, Kiely J (2018). *Personalised caffeine guidelines*. Sports Med 48:7-16. DOI: 10.1007/s40279-017-0776-1
26. Burke LM (2008). *Caffeine and sports performance*. Appl Physiol Nutr Metab 33:1319-1334. DOI: 10.1139/H08-130

### Gut training & GI (7)
27. Costa RJS et al. (2017). *Gut-training 2 weeks*. Appl Physiol Nutr Metab 42:547-557. DOI: 10.1139/apnm-2016-0453
28. Jeukendrup AE (2017). *Training the gut for athletes*. Sports Med 47 Suppl 1:S101-S110. DOI: 10.1007/s40279-017-0690-6
29. Costa RJS et al. (2017). *Exercise-induced gastrointestinal syndrome systematic review*. Aliment Pharmacol Ther 46:246-265. DOI: 10.1111/apt.14157
30. De Oliveira EP, Burini RC (2014). *CHO-dependent exercise-induced GI distress*. Nutrients 6:4191-9. DOI: 10.3390/nu6104191
31. Pfeiffer B et al. (2012). *Nutritional intake and GI problems competitive endurance*. MSSE 44:344-51. DOI: 10.1249/MSS.0b013e3182374a92
32. Stuempfle KJ, Hoffman MD (2015). *GI distress 161 km ultra*. J Sports Sci 33:1814-21. DOI: 10.1080/02640414.2015.1012104
33. Miall A et al. (2018). *2 weeks repetitive gut challenge*. Scand J Med Sci Sports 28:630-640. DOI: 10.1111/sms.12970

### Coût énergétique course / trail (5)
34. Minetti AE et al. (2002). *Energy cost walking/running extreme slopes*. J Appl Physiol 93:1039-46. DOI: 10.1152/japplphysiol.01177.2001
35. Vernillo G et al. (2017). *Biomech and physiology of uphill/downhill running*. Sports Med 47:615-29. DOI: 10.1007/s40279-016-0605-y
36. Giovanelli N et al. (2016). *Energetics of vertical km races*. EJAP 116:1241-53. DOI: 10.1007/s00421-016-3382-2
37. di Prampero PE (1986). *Energy cost human locomotion*. IJSM 7:55-72. DOI: 10.1055/s-2008-1025736
38. Lemire M et al. (2021). *Level vs uphill economy ultra-marathon*. EJAP 121:3265. DOI: 10.1007/s00421-021-04792-4

### Ultra & protéines (5)
39. Tiller NB et al. (2019). *ISSN Position Stand Ultra-Marathon*. JISSN 16:50. DOI: 10.1186/s12970-019-0312-9
40. Knechtle B, Nikolaidis PT (2018). *Physiology ultra-marathon*. Front Physiol 9:634. DOI: 10.3389/fphys.2018.00634
41. Tarnopolsky MA (2004). *Protein requirements endurance*. Nutrition 20:662-8. DOI: 10.1016/j.nut.2004.04.014
42. Saunders MJ et al. (2007). *CHO+protein vs CHO-only on running*. JSCR 21:678-84. DOI: 10.1519/R-21306.1
43. Pasiakos SM et al. (2014). *Protein supplements review*. Sports Med 45:111-31. DOI: 10.1007/s40279-014-0242-2

### Femmes & sport (5)
44. Sims ST et al. (2007). *Sodium loading and fluid balance*. MSSE 39:123-30. DOI: 10.1249/01.mss.0000241647.13220.4f
45. Janse de Jonge XAK (2003). *Menstrual cycle and exercise performance*. Sports Med 33:833-51. DOI: 10.2165/00007256-200333110-00004
46. Oosthuyse T, Bosch AN (2010). *Menstrual cycle and exercise metabolism*. Sports Med 40:207-227. DOI: 10.2165/11317090-000000000-00000
47. Wickham KA et al. (2021). *Sex differences in heat acclimation*. EJAP 121:353-367. DOI: 10.1007/s00421-020-04550-y
48. Wohlgemuth KJ et al. (2021). *Female-specific nutritional strategies*. JISSN 18:27. DOI: 10.1186/s12970-021-00422-8

### Altitude (3)
49. Mawson JT et al. (2000). *Women energy requirement 4300m*. J Appl Physiol 88:272-81. DOI: 10.1152/jappl.2000.88.1.272
50. Mazzeo RS (2008). *Exercise at altitude update*. Sports Med 38:1-8. DOI: 10.2165/00007256-200838010-00001
51. Pasiakos SM et al. (2017). *Nutrition extreme environments*. Annu Rev Nutr 37:39-68. DOI: 10.1146/annurev-nutr-071816-064637

### Mouth rinse (3)
52. Chambers ES, Bridge MW, Jones DA (2009). *CHO sensing in human mouth*. J Physiol 587:1779-94. DOI: 10.1113/jphysiol.2008.164285
53. De Pauw K et al. (2015). *CHO mouth rinse meta-analysis*. Sports Med 45:1635-44. DOI: 10.1007/s40279-015-0394-8
54. Brietzke C et al. (2019). *CHO mouth rinse mitigates mental fatigue*. Brain Sci 9:159. DOI: 10.3390/brainsci9070159

### Récupération & anti-inflammatoires (3)
55. Howatson G et al. (2010). *Tart cherry juice marathon recovery*. Scand J Med Sci Sports 20:843-52. DOI: 10.1111/j.1600-0838.2009.01005.x
56. Lipman GS et al. (2017). *Ibuprofen vs placebo AKI ultramarathoners*. Emerg Med J 34:637-642. DOI: 10.1136/emermed-2016-206353
57. Halson SL (2014). *Sleep elite athletes*. Sports Med 44 Suppl 1:S13-23. DOI: 10.1007/s40279-014-0147-0

---

## 12. POINTS À VALIDER PM + DEV (Phase 3)

### 12.1 Pour Romane (PM) — validation produit & doctrine

1. **Mode "Premier marathon/semi/ultra"** : valider l'activation auto si Niveau=Débutant + le toggle manuel + les plafonds chiffrés (§9.2).
2. **Message anti-rigidité** en mode Premier : valider la formulation (§9.3) — vérifier qu'on respecte `feedback_jamais_poids_minceur`, qu'on ne tombe pas dans le micro-expert (`feedback_pas_de_micro_expert`).
3. **Articulation outil ↔ plan** : valider le welcome message du plan (§8.3.1) — exception doctrine à documenter dans `feedback_pas_de_nutrition_dans_plan` (§8.4).
4. **Warnings EAH différenciés** marathon/semi vs trail/ultra (§6.3) : valider les deux formulations.
5. **Disclaimer médical élargi** (§6.5) : 10+ pathologies — vérifier que la longueur reste lisible mobile.
6. **Cycle menstruel** (§6.7) : valider Option B générique (message dans carte sécurité) plutôt qu'Option A (input intime obligatoire).
7. **CTA cross-sell vers générateur de plans** : valider la formulation et le placement (§8.2).
8. **Conversion** : qu'est-ce qui fait revenir l'user 2-N fois ? (favoris pack ? export PDF ? URL partagée ?)
9. **Tracking analytics Plausible/GA** : quels événements prioriser (chronos visés, distances trail, T° saisies, mode Premier activé, export PDF cliqué) ?
10. **Revue tous les libellés UI** : warnings, messages, ton — sécurité doctrine (`feedback_securite_avant_conversion`, `feedback_jamais_poids_minceur`, `feedback_ecouter_instructions_explicites`).
11. **Tests utilisateurs post-MVP** : prévoir 3-5 entretiens débutants après mise en ligne pour valider qu'aucun warning n'a "scared off".

### 12.2 Pour le dev — implémentation

1. **Réutilisation existant** : `MarathonPacePage.tsx`, `VMACalculatorPage.tsx` exposent quels patterns ? Composant `<NutritionCalculator config={config} />` aligné sur ces patterns.
2. **State management** : Redux / Context / local — choix à confirmer.
3. **Tests** : unitaires sur formules (jest) — couverture obligatoire sur §4.1 à §4.10 ; e2e sur calcul complet (Playwright).
4. **Performance** : recalcul à chaque input (debounced 300ms) ou bouton "Calculer" → décision UX.
5. **Persistance localStorage** pour ré-ouvrir avec dernières valeurs (en plus de l'URL query string).
6. **Export PDF** : librairie cliente (jsPDF ou react-pdf) — pas de backend.
7. **URL partageable** : sérialisation inputs en query string, parsing au load.
8. **Mobile-first** : matrices en cards verticales, wizard step-by-step, sticky button.
9. **i18n** : pas prioritaire V1 (FR only), prévoir hooks pour V2 international SEO.
10. **PWA + offline** : V2 selon traffic.
11. **Mini-questionnaire scoré sudation** (§3.5) : logic côté client, profil auto-suggéré modifiable.
12. **Validation logique inputs** (§6.8) : règles soft, message non bloquant.

### 12.3 Pour Romane (mémoires à mettre à jour)

1. `feedback_pas_de_nutrition_dans_plan` → ajouter exception "Le plan peut MENTIONNER (sans chiffres) l'existence des outils nutrition séparés."
2. `project_coach_running_ia_outil_nutrition` → mettre à jour avec lien vers ce brief V4 FINAL.
3. Aucune autre doctrine impactée (sécurité>conversion, course-only, jamais poids/minceur, jamais contact client : toutes respectées).

---

## Synthèse finale

**Brief V4** = brief V3 (scope strict course only + 15 paramètres + warning pré/post) **+ 29 deltas coach** (mode Premier, warning EAH dosé, UX mobile/PDF, articulation plan, profils long, lassitude/plan B ultra enrichi, gut training intégré aux SL) **+ 20 corrections scientifiques docteur** (formule Minetti sourcée, glucides sub-2h30 90-110, ratio 1:0.8 ajouté, sodium salty sweater 1200-1600, caféine 3-5 cible 3 + dose mini 2-3, gut training 2 sem si <60 g/h, altitude aigu/acclimaté, disclaimer enrichi RGO/IBS/asthme, cycle menstruel, protéines optionnelles) **+ 57 références DOI**.

**Position concurrentielle** : aucun outil francophone (Aptonia, Overstim's, Lepape, Decathlon) ne combine simultanément :
1. Crédibilité scientifique (57 réfs DOI, consensus 2024)
2. Pédagogie coach (mode Premier, warnings calibrés débutant)
3. Cohérence produit principal (plan ↔ outil articulés)
4. UX jour J (mobile-first + PDF A5 + URL partagée)
5. Doctrine CRIA (sécurité > conversion, jamais poids/minceur, jamais contact client, course exclusivement)

**Statut** : Prêt pour pass PM (Romane, validation §12.1) + dev (§12.2) → code.

**Reviewers Phase 2** :
- Coach course à pied senior (20 ans expé, UTMB Academy, méthodes Pfitzinger/Daniels) — 29 deltas intégrés
- PhD Nutrition du Sport (post-doc INRAE/INSEP, publications Sports Medicine, EJSS, MSSE) — 20 corrections intégrées + 57 réfs

**Conflit d'intérêt déclaré** : aucun.
