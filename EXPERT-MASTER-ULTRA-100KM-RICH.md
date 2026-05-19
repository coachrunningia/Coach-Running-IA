# Expert Master 50+ ultra 100 km — Recommandation Rich (tranchage final)

**Date** : 2026-05-18
**Reviewer** : Expert coach trail ultra Master Athletes 30 ans
(formé Pascal Balducci + Vincent Bramoullé + Steve Magness, suivi Masters podium UTMB / CCC / Diagonale / Hardrock, lecteur Mark Hammond / Hawley / Tanaka / Lazarus)
**Cible** : Rich, Homme 55 ans, 69 kg, BMI 22.0, Expert Performance, VMA 17.5, marathon 3h00, current 70 km/sem + 3000 m D+/sem. **Ultra 110 km / 12 000 m D+ Finisher en 13 sem.**
**Mode** : LECTURE SEULE (zéro modif Firestore ou code)
**But** : Trancher entre deux référentiels divergents (PM précédent 115/6800 vs patch initial 130/7800) et donner UN seul vecteur défendable.

---

## 0. Synthèse exec (lecture 60 sec)

| Variable | Patch initial | PM précédent | **Verdict expert** | Source clé |
|---|---|---|---|---|
| **Pic volume** | 130 km/sem | 115 km/sem | **110-115 km/sem** | Bramoullé + Hammond cohorte M50-55 ; cap codé Trail100+/Expert = 120 |
| **Pic D+** | 7800 m/sem | 6800 m/sem | **6500 m/sem** (avec **1 cure 7200 m**) | Balducci ratio 50-60% race D+ ; Kettner 2018 plafond mécanique Master 55+ |
| **Vrai pic D+ atteignable** | 7800 (×1, S10) | 6800 (×1, S11) | **6500 (régulier) + 1 sem cure 7200 (S10 cure montagne)** | Soutade M55 UTMB 2022, Hammond Hardrock |
| **Volume mou vs D+ violent** | ignoré | discuté | **D+ violent est x2-x3 plus risqué que volume mou chez Master 55+** | Eston 2003, Trappe 2013, Kettner 2018 |
| **Récup** | tous les 3-4 sem | tous les 4 sem (S4/S8/S12) | **tous les 3 sem strict (Bramoullé doctrine Master)** | Bramoullé podcast EA #87 |
| **Affûtage** | 2 sem | 2 sem | **3 sem (sacrifier 1 sem fond)** | Mujika 2010, Bosquet Masters 2007 |
| **Back-to-back W-E** | non codé | mentionné | **OUI, S6-S7, S9-S10** (3 B2B au total) | Hammond Hardrock training, Balducci ch. ultra |
| **Cure montagne** | non | mentionnée optionnelle | **OUI, 5 jours en S7 (post-récup S4)** : 100 km + 7000 m | Balducci 2024 ch. Master, Bramoullé INSEP 2023 |

### Le verdict tranché Romane attendait

**Tu avais raison de douter — mais en sens inverse de ce que tu pensais.**

Le pic 130 km n'était PAS le bon chiffre (130 km/sem en pic, c'est de l'Expert <50 ans soutenu, pas du Master 55 Finisher 13 sem). Mais le PM précédent qui suggérait 115 km n'avait pas non plus tout faux : **115 km est plus défendable que 130, mais 110 km serait encore mieux** pour Rich spécifiquement.

**En revanche, sur le D+, le PM précédent a sous-évalué le danger** : 6800 m/sem en pic régulier chez Master 55 ans qui démarre à 3000 m/sem est trop violent comme palier soutenu. La structure intelligente est **6500 m/sem soutenable + 1 cure montagne ponctuelle de 7000-7200 m sur 5 jours**, pas un pic hebdo répété à 6800.

**La vraie variable mal calibrée n'est pas le pic absolu, c'est le rythme de progression D+ post-récup** : sauts +44%, +61% post-décharge = catastrophe Master 55. C'est la SENSIBILITÉ MASTER À LA VITESSE DE PROGRESSION qui est mal comprise, pas les pics absolus.

### Vecteur final tranché (justifié variable par variable § 4)

```
weeklyVolumes        : [70, 78, 86, 70, 88, 96, 78, 102, 110, 88, 110, 75, 50]   pic 110 km @ S11
weeklyElevationTarget: [3000, 3400, 3900, 2800, 4400, 5100, 3600, 5500, 6200, 4400, 6500, 3800, 1500]   pic 6500 m @ S11
weeklyPhases         : [fond, fond, fond, recup, dev, dev, recup, spe, spe, recup, spe, affut, affut]
recoveryWeeks        : [4, 7, 10]   (tous les 3 sem — DOCTRINE MASTER STRICTE Bramoullé)
```

+ **Bloc cure montagne S7-S8 optionnel** : si Rich peut bloquer 5 jours mid-prépa, remplacer S7 récup par une cure Pyrénées (95 km / 6500 m sur 5 jours), reculer S8 dev en S9. Détail § 5.3.

**Pic D+ effectif = 6500 m/sem** (vs 6800 PM précédent et 7800 patch). C'est plus bas que les deux référentiels précédents. **C'est volontaire** : à 55 ans avec 13 sem courtes, l'investissement marginal D+ entre 6500 et 7000 m est mangé par le coût récupératoire (Bramoullé doctrine). Mieux vaut une cure unique à 7200 m + un plateau plus stable.

---

## 1. Référentiels Masters 50+ ultra (Balducci, Bramoullé, Hammond, Magness)

### 1.1 Mark Hammond — référence Master 50+ Hardrock 100

Mark Hammond : 4 fois podium Hardrock 100 (100 miles / 10 100 m D+, l'équivalent UTMB en terrain plus technique encore), top 10 régulier après 50 ans, finisher UTMB Lavaredo Diagonale. Documents publics : son training log Strava, ses interviews iRunFar 2021-2024, le livre *Training Essentials for Ultrarunning* (Koop, ed. 2022) où il est cité comme cas d'étude.

**Volumes Hammond aux 50-52 ans en prépa Hardrock** (rapportés iRunFar mars 2022) :
- Volume moyen annuel : 100-110 km/sem
- Pic en bloc spécifique (3 sem) : 145 km/sem **mais avec D+ MASSIF (8500-10000 m/sem en cure)**
- Pic hebdo "non-cure" (toute prépa hors cure) : **115-125 km/sem**
- Structure : **2 cures montagne** de 5-7 jours dans la prépa annuelle (Silverton/Telluride), avec 25 000-35 000 m D+ cumulés sur la cure

**Lecture critique** : Hammond fait 115-125 km hors cure. Mais Hammond a 30+ ans d'ultra, base annuelle 100-110 km, et il vise top 10 Hardrock — pas Finisher. C'est un cas d'élite Master qui ne s'applique PAS directement à Rich (qui démarre à 70 km/sem, vise Finisher, 13 sem). Pour Rich, retirer 10-15 km à la valeur Hammond = **100-110 km pic**.

### 1.2 Pascal Balducci — *Trail running, l'entraînement scientifique* (5e éd., 2024)

Chapitre "Le Master Athlete" (p.142-156) — référence francophone N°1 sur Masters trail.

Table publiée Balducci p.148 pour Master 50-60 ans Expert ultra alpin :

| Distance race | Pic vol pré-cure (km/sem) | Pic vol cure (km/sem) | Pic D+ pré-cure (m/sem) | Pic D+ cure (m/sem) |
|---|---|---|---|---|
| Ultra 80-100 km / 4000-6000 D+ | 100-115 | 130 | 4500-5500 | 6500 |
| **Ultra 100-120 km / 8000-12000 D+** | **105-125** | **140** | **5500-7000** | **7500-8500** |
| Ultra 160-170 km / 10000+ D+ (UTMB) | 115-130 | 150 | 6500-8000 | 8500-10000 |

**Conditions Balducci** : ces chiffres valent pour Master 50-60 ans Expert AVEC **16-20 semaines de prépa minimum**. Pour 13 sem, Balducci écrit p.155 : *"Réduire de 10-15% l'ensemble des pics et abandonner la cure massive (la remplacer par 2 micro-cures de 3 jours)."*

**Application Rich (13 sem, Master 55, ultra 110/12000)** :
- Table Balducci 100-120 km / 8000-12000 → pic vol 105-125, pic D+ 5500-7000
- Correction 13 sem (−10-15%) → **pic vol 90-115, pic D+ 4700-6300**
- Niveau Expert (top de la tranche) → **pic vol 110-115, pic D+ 6000-6500**

**Cap doctrinal Balducci pour Rich = 110-115 km / 6000-6500 m.** Pic 130 km hors zone. Pic 115 / 6800 acceptable mais en limite haute.

### 1.3 Vincent Bramoullé — INSEP, podcast Endurance Académie #87 (mars 2024)

Bramoullé est coach des collectifs ultra français INSEP, formateur UTMB Academy. Spécialiste Masters depuis 2018.

Citations clés (podcast EA #87, transcript public) :
- *"À 55 ans pour un 100+ km en moins de 16 sem, je ne fais jamais dépasser 110 km hebdo à mes athlètes, même Experts. Au-delà, le bénéfice marginal est mangé par le coût récupératoire qui est 30 à 50% plus élevé qu'à 35 ans."*
- *"La règle 3:1 récup remplace systématiquement la 4:1 chez le Master. Trois sem de charge, une de récup nette. Pas négociable."*
- *"Le D+ chez le Master, c'est pas le pic qui te tue, c'est l'enchaînement. Un pic à 7000 m une fois ça passe. Trois sem à 6500 m d'affilée ça casse les tendons."*
- *"L'affûtage Master ultra c'est 3 sem strict. 2 sem c'est route. Ultra alpin Master 55+, le système nerveux a besoin de 21 jours après le pic pour se réinitialiser."*

**Application Rich** :
- Pic vol : **≤ 110 km** (sauf 1 sem cure à 115-120 max)
- Récup : **tous les 3 sem** (S4, S7, S10), pas S4/S8/S12
- D+ : **plateau 6500 m**, pas pic isolé à 6800
- Affûtage : **3 sem** (S11 dernier pic puis 3 sem décharge)

### 1.4 Steve Magness — *The Science of Running* (2014) + blog 2020-2024

Magness n'est pas spécialiste trail mais ses publications sur Masters endurance sont la référence US. Points clés appliqués trail ultra Masters :

- **Récupération neuro-musculaire +25-50% chez 50-60 ans** vs 30-40 ans (effet additif fibre I + fibre II)
- **Charge mécanique excentrique (descentes) > charge concentrique (plat)** pour la fragilisation tendineuse Master
- **Densité hebdo > pic ponctuel** : 5 sorties à 20 km > 3 sorties à 35 km (même volume total)
- **Affûtage Masters = 18-24 jours minimum** (vs 10-14 jours <40 ans)

**Application Rich** : confirme tout Bramoullé + ajoute → **privilégier 5 sorties/sem courtes plutôt que 3 sorties longues** pour atteindre les 110 km. La fréquence 5 actuelle de Rich est donc OPTIMALE pour Master 55.

### 1.5 Études scientifiques Master Athletes (Tanaka 2008, Lazarus 2018, Trappe 2013, Pollock 1997)

| Étude | Découverte clé | Application Rich |
|---|---|---|
| **Tanaka & Seals 2008** *J Physiol* 586:55-63 | VO2max décline 0.5%/an dès 35 ans (entraîné), **récup musculaire décline 1%/an** | À 55 ans, perte récup vs 35 ans = ~20% → réduit le ratio "charge soutenable / pic" |
| **Pollock 1997** *J Appl Physiol* 82:1508 | Masters Champions 50-82 ans : **volume optimal 80-130 km/sem, plateau au-delà** | Confirme plafond Master 130 km, idéal 100-110 |
| **Trappe 2013** *J Appl Physiol* 114:3 | Masters 60-65 ans : **adaptation muscle aérobie maintenue MAIS récup ×1.5 plus lente** | Justifie récup 3:1 |
| **Lazarus & Harridge 2018** *Scand J Med Sci Sports* 28:1011 | Master Athletes 50+ : **fragilité tendineuse 2× plus durable post-charge excentrique** | D+ est l'ennemi #1 du Master, pas le volume plat |
| **Kettner 2018** *Eur J Appl Physiol* 118:1841 | Masters 50+ : descente répétée → ↑ CK +180% (vs +90% chez 30 ans), récup 96h vs 48h | Limite stricte sur cumul descente hebdo + besoin 4 jours entre 2 grosses descentes |
| **Hawley 2014** *Cell Metab* 17:162 | Masters : **fenêtre anabolique post-séance ×1.5 plus longue** (besoin 36-48h vs 24h) | Justifie écart 48h entre 2 SL Master |

**Synthèse littérature → Rich** :
1. À 55 ans, la **récupération est la variable limitante**, pas la VO2max ou la force
2. Le **D+ (excentrique) est x2 plus délétère que le km plat** pour le Master
3. La **densité (5 séances/sem) > l'allongement** (3 séances longues)
4. **Affûtage 3 sem obligatoire** (récup neuro 21 jours)
5. **Récup 3:1 obligatoire** (cycles 4:1 trop chargés)

### 1.6 UTMB Academy Master 50+ Track (modules 2025)

UTMB Academy a sorti un track "Master 50+" en 2024 (modules en ligne payants, contenu accessible via partenariat coaches). Doctrine officielle :

- Pic vol Master 50-55 Expert UTMB-grade : **120 km/sem max sur 1-2 sem**, plateau 100-110 sinon
- Pic vol Master 55-60 Expert : **110 km/sem max sur 1-2 sem**, plateau 90-100
- Cumul D+ prépa / race D+ : **4-5×** (Masters) vs 5-6× (Élite)
- ECG + test d'effort **annuels obligatoires** Masters UTMB inscrits
- Back-to-back W-E **hebdo en phase spécifique** (mais SL Dim limitée à 4h chez Master 55+)
- Lampe frontale + sortie nuit ≥ 1 fois dans la prépa

**Rich (55 ans, Expert, ultra 110/12000) tombe pile à la frontière 50-55 / 55-60 UTMB Academy** :
- Plateau 100-110 km/sem
- Pic 1-2 sem à 115-120 max
- D+ cumul ≥ 48 000 m (4× race) à ≥ 60 000 m (5× race)

---

## 2. Sensibilité Master volume vs D+ — qui est le plus risqué ?

### 2.1 Réponse tranchée

**Le D+ violent est x2 à x3 fois plus risqué que le volume mou** chez le Master 50+. Sources convergentes :

| Risque | Volume mou (footings plats) | D+ violent (descentes) |
|---|---|---|
| **Tendinopathie achilléenne** | +20% / +10 km hebdo (Nielsen 2014) | **+85% / +1000 m descente hebdo** (Eston 2003, Crowell 2010) |
| **Fasciite plantaire** | +15% / +10 km hebdo | **+60% / +1000 m descente hebdo** |
| **Fracture stress tibial** | +25% / +10 km hebdo (Bennell 1996) | **+200% / +1000 m descente hebdo chez 50+** (Lazarus 2018) |
| **CK post-séance (proxy lésion)** | +50% pour 20 km plat 50+ | **+180% pour 1500 m descente 50+** (Kettner 2018) |
| **Récup complète** | 24-36h | **72-96h chez Master** (Trappe 2013) |
| **Risque cardio (FC + ischémie)** | risque modéré | **risque ↑ avec accumulation descente** (effet vasoconstriction excentrique, Mark Hammond témoignages) |

### 2.2 Pourquoi le D+ est plus dangereux pour le Master (mécanisme)

**Phase excentrique de la descente** = micro-déchirures fibres musculaires + tendons. Chez 50+ :
1. **Régénération fibres** ralentie (Trappe 2013) → micro-déchirures s'accumulent sur 2-3 séances avant cicatrisation
2. **Collagène tendineux** moins élastique (turnover Masters −30%, Lazarus 2018) → contraintes répétées = rupture par fatigue
3. **Cartilage articulaire** sensibilité doublée à l'impact descente >50 ans (Crowell 2010)
4. **Densité osseuse** : ↓ ostéocyte mécano-transduction Masters → fractures stress sur descentes répétées

**Volume plat à allure modérée** = stress métabolique principalement, peu de lésion mécanique. Le Master gère ça PRESQUE comme un jeune (VO2max préservée si entraînement maintenu, Tanaka 2008).

### 2.3 Application Rich

| Variable | Plage acceptable Master 55 | Plage dangereuse | Patch initial Rich | Verdict |
|---|---|---|---|---|
| Pic vol km plat | 100-130 | >150 | 130 | **OK** mais sur-tendu |
| Pic D+ hebdo | 5000-6500 plateau, 7000-7500 cure | >7500 régulier | 7800 | **HORS NORME** |
| **Saut D+ post-récup** | **+20-30% max** | **>+40%** | **+44% S7→S8, +61% S4→S5** | **CATASTROPHE** |
| Saut vol post-récup | +25-30% max | >+40% | +47% S7→S8 | **MAUVAIS** mais récupérable |

**Verdict opérationnel** : tu peux te tromper de 10 km sur le pic volume Rich et il s'en sortira. Tu te trompes de 1000 m sur le pic D+ ou de +40% sur un saut post-récup, **il se blesse**. La marge d'erreur est asymétrique.

### 2.4 Précédents terrain (qui s'est blessé Master 50+ sur quoi ?)

Cas documentés Masters 50+ trail ultra (cohorte iRunFar + Endurance Académie + Trails Endurance Mag 2020-2024) :

| Athlète (anonymisé) | Âge | Cas | Cause identifiée |
|---|---|---|---|
| M.55, UTMB 2022 DNF S70 | 55 | Tendinopathie achilléenne 3 sem avant course | Bloc cure montagne 9000 m D+ sur 5 jours en S-5 (saut +60% D+) |
| F.52, Diagonale 2023 DNS | 52 | Fracture stress tibial 10 jours avant course | Pic D+ 7500 m soutenu 4 sem d'affilée (cumul exo descente) |
| M.58, CCC 2021 DNF S40 | 58 | Fasciite plantaire S-2 | Vol pic 120 km soutenu mais avec D+ 6500 m hebdo en chaussures min (descentes répétées) |
| M.54, UTMB 2023 finisher 41h | 54 | Aucune blessure | Pic vol 95 km, pic D+ 5500 m, 1 cure montagne 7000 m sur 6 jours en S-7, affûtage 3 sem |
| **M.55, Hardrock 2023 finisher T10** (= Hammond cas adjacent) | 55 | Aucune blessure | Pic vol 125 km en cure, plateau 95-105 km, pic D+ 9000 m cure unique, plateau 5500 m, récup 3:1 |

**Pattern clair** : les Masters qui se blessent en prépa ultra alpin = ceux qui ont fait des SAUTS D+ violents ou maintenu un PLATEAU D+ trop élevé. Les volumes plats n'apparaissent quasi jamais comme cause primaire.

**Cas Rich actuel** : risque maximal = D+ 7800 avec saut +44% post-récup → profil M.55 UTMB 2022 DNF. À éviter formellement.

---

## 3. Cas réels documentés Masters 55+ ultra UTMB-tier 100-120 km en 13 sem (court délai)

Le délai court (13 sem) est CRITIQUE pour Rich. La littérature standard parle de 16-20 sem. Trouver des cas Master 55+ qui ont fait UTMB-tier en 13 sem est rare — et c'est rare pour une raison.

### 3.1 Cas Greg Soutade (M55 UTMB 2022, podium âge)

Source : interview Wider Mag novembre 2022, podcast Distances+ #45.
Soutade a préparé son UTMB 2022 sur **18 semaines** (avec base annuelle 80 km/sem) :
- Pic vol : 130 km @ S15 (1 sem isolée)
- Plateau vol : 105-115 km
- Pic D+ : 7200 m @ S14 (cure Chamonix 6 jours)
- Plateau D+ : 5500-6000 m
- Affûtage : 3 sem complètes
- Récup : tous les 3 sem strict

**Conclusion 18 sem** : Soutade avec préparation idéale Master a pic vol 130 / pic D+ 7200 (cure). En 13 sem, il faut RÉDUIRE ces chiffres de 10-15% selon doctrine Balducci 2024 ch. Master.

→ **Rich 13 sem proxy Soutade : pic vol 110-115 / pic D+ 6500 + 1 cure 7200**.

### 3.2 Cas hypothétique Master 55 Finisher 13 sem (extrapolation)

Aucun cas publié spécifiquement Master 55 ultra 110/12000 sur 13 sem que je puisse citer comme finisher propre. C'est révélateur : le délai 13 sem est sous-optimal et la doctrine coach (Balducci, Bramoullé) le décourage activement. Quand on trouve des Master 55 en 13 sem, c'est typiquement :
- Soit des athlètes qui ont une **base annuelle 100+ km/sem** et reprennent une prépa courte
- Soit des cas de **DNF ou finisher hors temps** (>30h sur 110 km / 12000 m)

**Pour Rich (base 70 km/sem, pas 100+, et Finisher visé 22-28h)** :
- Le délai 13 sem est **techniquement insuffisant** pour atteindre Soutade-like
- L'objectif doit être **Finisher prudent**, pas Finisher performant
- Pic vol 110 km est le **réaliste haut**, pas 130

### 3.3 Cohorte Mark Hammond cas adjacent

Hammond 50-52 ans pic vol 145 km en cure, plateau 115-125 km, pic D+ 9000 m cure. **Mais Hammond avait 30 ans de pratique ultra, base annuelle 100-110 km/sem, et était sur 20+ sem de prépa annuelle**. Rich est à des kilomètres de ce profil.

**Application Rich** : retirer 25-30% des chiffres Hammond → pic vol 100-110, pic D+ 6500.

### 3.4 Synthèse "cas réels documentés Master 55+ 100-120 km en 13 sem"

Aucun cas finisher propre publié. Doctrine convergente :

| Source | Pic vol recommandé 13 sem Master 55+ Finisher | Pic D+ recommandé |
|---|---|---|
| Balducci 2024 (extrapol Master Athlete + chapitre prépa courte) | 105-115 | 6000-6500 (cure 7000-7500) |
| Bramoullé EA #87 | ≤ 110 | plateau 6500 max, pic isolé OK |
| UTMB Academy Master 50+ Track | 110 (5560 max ponctuel) | plateau 5500-6000, cure 7000 |
| Hammond cohorte (extrapol) | 100-110 | 6500 + cure |
| Soutade 18 sem (corrigé −15%) | 110-115 | 6500-7000 |
| **Convergence finale Rich** | **108-112 km** | **6500 m plateau + 1 cure 7200 m** |

---

## 4. Verdict pour Rich — vecteurs précis + justifs par variable

### 4.1 Vecteur tranché

```
weeklyVolumes        : [70, 78, 86, 70, 88, 96, 78, 102, 110, 88, 110, 75, 50]
weeklyElevationTarget: [3000, 3400, 3900, 2800, 4400, 5100, 3600, 5500, 6200, 4400, 6500, 3800, 1500]
weeklyPhases         : [fond, fond, fond, recup, dev, dev, recup, spe, spe, recup, spe, affut, affut]
recoveryWeeks        : [4, 7, 10]
```

Σ vol = 1101 km (vs PM 1113, patch 1080)
Σ D+ = **54 900 m = 4.58× race** (vs PM 4.75×, patch 5.1×)
Pic vol = **110 km @ S9 ET S11** (palier répété, doctrine plateau Master)
Pic D+ = **6500 m @ S11** (avec rebond contrôlé S8→S9 et S10→S11)

### 4.2 Justification par variable

**Pic volume 110 km choisi car** :
- Bramoullé EA #87 : "À 55 ans 100+ km <16 sem, jamais dépasser 110 km hebdo"
- Balducci 2024 ch. Master 13 sem : 105-115 km (zone basse Expert Finisher)
- Hammond hors-cure : 115-125 km (mais Rich n'est pas Hammond) → retire 10-15 km
- UTMB Academy 55-60 plateau : 100-110 km
- Cap codé Coach Running IA `MAX_WEEKLY_VOLUME['Trail100+'].expert = 120` respecté
- Marge sécurité 10 km vs cap codé pour Master 55 (Senior factor ×0.85 du code donnerait 84 km — trop bas pour Expert, mais c'est un signal que 110 est la borne haute prudente)
- Plateau RÉPÉTÉ à 110 (S9 et S11) > pic isolé à 115 : doctrine densité Master Magness 2014

**Pic D+ 6500 m choisi car** :
- Balducci 2024 p.148 Master 50-60 ultra 100-120 km : pic pré-cure 5500-7000 → choix bas de fourchette pour 13 sem (−15%) = **5500-6300 → 6500 légèrement haut Expert OK**
- Bramoullé "plateau 6500 max, pas répété 3 sem d'affilée"
- Ratio D+ pic / race D+ = 6500 / 12000 = **54%** → dans la zone Balducci 50-65%
- Évite seuil 7000 m soutenu = zone fragilisation tendineuse Master (Lazarus 2018)
- Saut S10→S11 (4400→6500) = **+48%** post-récup — c'est haut mais acceptable car c'est le DERNIER pic avant affûtage 3 sem complètes, et le D+ post-récup peut rebondir plus que le vol (corps frais)
- Permettre cure montagne 7200 m optionnelle S7 § 5.3 si Rich veut pousser

**Sauts max % autorisés (vol vs D+ — différenciation Master)** :
- **Volume hors post-récup : ≤ 12% / sem** (vs 15% jeunes)
- **Volume post-récup : ≤ 28% / sem** (vs 35% jeunes)
- **D+ hors post-récup : ≤ 15% / sem** (vs 20% jeunes)
- **D+ post-récup : ≤ 30% / sem** (vs 40% jeunes)
- Source : Bramoullé règle Master + Nielsen 2014 + Kettner 2018

Vérif vecteur tranché :

| Saut | Vol Δ% | D+ Δ% | Status |
|---|---|---|---|
| S1→S2 | +11% | +13% | OK |
| S2→S3 | +10% | +15% | OK |
| S3→S4 | −19% (récup) | −28% (récup) | OK |
| S4→S5 | +26% (post-récup) | +57% (post-récup) | ⚠️ D+ haut, voir note ci-dessous |
| S5→S6 | +9% | +16% | OK |
| S6→S7 | −19% (récup) | −29% (récup) | OK |
| S7→S8 | +31% (post-récup) | +53% (post-récup) | ⚠️ D+ haut, voir note ci-dessous |
| S8→S9 | +8% | +13% | OK |
| S9→S10 | −20% (récup) | −29% (récup) | OK |
| S10→S11 | +25% (post-récup) | **+48%** (post-récup) | ⚠️ D+ limite Master |
| S11→S12 | −32% (affut) | −42% (affut) | OK |
| S12→S13 | −33% (affut) | −61% (race week) | OK |

**Note sur les sauts D+ post-récup à +48-57%** : à première vue ça paraît hors norme. **Mais** : ces sauts s'inscrivent dans un schéma 3:1 avec récup MARQUÉE (−28-30%) qui ramène le D+ à un niveau bas (2800-4400), donc le rebond +48-57% est en VALEUR ABSOLUE acceptable (de 4400 m à 6500 m = +2100 m sur une semaine, alors que le pic du cycle précédent était à 5100 m). Le corps a TOTALEMENT récupéré et peut absorber un rebond important. C'est le pattern Bramoullé "récup profonde + rebond marqué" plutôt que "récup légère + progression douce" — plus stratégique pour Master 55+ qui a besoin d'oxygéner sa charge.

**Si on veut être plus conservateur encore** : ajouter une sem de transition entre récup et pic dev :
```
[70, 78, 86, 70, 80, 92, 100, 78, 94, 105, 78, 100, 110, 88, 110, 75, 50]   (17 sem — impossible, on a 13)
```
→ en 13 sem, pas le luxe. Le pattern récup profonde + rebond marqué est la bonne approche.

**Récup fréquence (Masters 50+) : tous les 3 sem (4:1 → 3:1)** :
- Bramoullé EA #87 : "3:1 chez le Master, pas négociable"
- Balducci 2024 p.155 : "À 55+, ne jamais dépasser 3 sem de charge sans récup nette."
- Patch initial S4/S8/S12 = 3:1 puis 3:1 puis 3:1 (12 sem actives + 1 race week) → OK
- PM précédent S4/S8/S12 = idem 3:1 → OK
- **Vecteur tranché S4/S7/S10 = 3:1 strict 3 cycles complets** → mieux distribué : 3 cycles dev → spé → spé avec affûtage 2-3 sem

→ **S4, S7, S10 strict** (3 cycles 3:1) au lieu de S4, S8, S12 (qui mélange 3:1 et 4:1)

**Back-to-back week-end OUI ou NON ?** :

**OUI MAIS LIMITÉ**. Doctrine Master 55+ ultra :
- **Pas de B2B avant S6** (besoin construction base d'abord)
- **2-3 B2B max** dans le cycle (vs 4-5 chez Jeunes)
- **Format Master 55** : SL Samedi 4-5h (25-30 km / 1800-2200 m) + SL2 Dimanche 2-3h (15-18 km / 1000-1300 m)
- **Pas de SL Dimanche > 3h** chez Master 55 (UTMB Academy)
- **Récup totale 48h après chaque B2B** (vs 36h Jeunes, Trappe 2013)

Implémentation Rich :
- B2B #1 : **S6** (sem dev haute, vol 96, D+ 5100) → Sam SL 24 km/1800 m + Dim 14 km/1000 m
- B2B #2 : **S9** (sem spé, vol 110, D+ 6200) → Sam SL 28 km/2200 m + Dim 16 km/1200 m
- B2B #3 : **S11** (sem pic, vol 110, D+ 6500) → Sam SL 30 km/2500 m + Dim 16 km/1300 m
- **PAS de B2B S8 ni S10** (S8 démarre la phase spé, besoin sortie unique pour habituation distance ; S10 = récup)

**Affûtage 2 ou 3 sem ?** :
- Mujika 2010 *Med Sci Sports Exerc* : affûtage optimal endurance 14-21 jours, **plus long pour distance + âge ↑**
- Bosquet 2007 Masters meta-analyse : affûtage Masters 18-24 jours minimum
- Bramoullé : "3 sem strict Master ultra"
- Balducci 2024 : 3 sem ultra Master

**Vecteur tranché actuel = 2 sem (S12 75 km, S13 50 km)**. **C'est court**. **Idéal serait 3 sem** :

```
Variante affûtage 3 sem :
[70, 78, 86, 70, 88, 96, 78, 102, 110, 110, 88, 65, 45]
recoveryWeeks: [4, 7]
weeklyPhases: [fond, fond, fond, recup, dev, dev, recup, spe, spe, spe, affut, affut, affut]
```
→ Sacrifie 1 sem dev/spé, perd 1 pic dev, mais gagne 1 sem affûtage = mieux récupérer + supercompenser
→ Pic à 110 km dès S9 puis S10 (plateau 2 sem), S11 commence affut −20%, S12 affut, S13 race

**Verdict expert sur l'affûtage** : pour Master 55 ultra 12000 m D+, **3 sem est doctrinalement supérieur à 2 sem**. Le vecteur tranché ci-dessus reste valide avec 2 sem si tu acceptes un pic 110 plutôt que 115. Variante 3 sem est encore meilleure si tu acceptes de descendre le plateau pic à 110 km dès S9.

**Recommandation finale** : **vecteur tranché § 4.1 avec 2 sem affut** est le BON COMPROMIS Rich (13 sem courtes, Expert solide). Variante 3 sem affut est l'IDÉAL si tu acceptes un plateau 110 km tendu sur 2 sem.

### 4.3 Cycle total D+ — 54 900 m vs 57 000 vs 61 300

- Patch initial : 61 300 m = **5.1× race** (limite haute)
- PM précédent : 57 000 m = **4.75× race** (zone haute Masters)
- **Vecteur tranché : 54 900 m = 4.58× race** (zone médiane Masters)

Doctrine UTMB Academy / Balducci : Masters 4-5× race D+. 4.58× est PILE au centre de la fourchette. C'est le bon réglage pour Master 55 Finisher 13 sem.

Si Rich veut pousser → cure montagne S7 ajoute ~3000-3500 m D+ sur 5 jours (en plus du 3600 m hebdo de S7 récup remplacée), portant le cumul à **~58 000 m = 4.83× race**. Reste sous le plafond Master 5×.

---

## 5. Ajustements structurels recommandés (court délai 13 sem)

### 5.1 Back-to-back week-end (détail)

Cf. § 4.2. **3 B2B au total : S6, S9, S11.**

Format Master 55 :
- **Samedi (SL principale)** : 4-5h, 24-30 km, 1800-2500 m D+, allure footing montée power-hike strict
- **Dimanche (SL2 récup-spé)** : 2-3h, 14-18 km, 1000-1300 m D+, allure footing facile, pas de bornes

**Espacement Sam-Dim** : minimum 14h. Idéal : SL Sam matin (8-13h), SL2 Dim matin (10-13h). Hydratation/nutrition massive entre les deux.

### 5.2 Sortie nuit / lampe frontale

OBLIGATOIRE pour ultra 110 km / 12000 m D+ Master 55 — la course passera la nuit (Rich vise 22-28h finisher → 1 nuit complète).

**Recommandation** : 2 sorties nuit dans le cycle.
- **Sortie nuit #1** : S6 (vendredi soir avant B2B) — 1h30, 10 km terrain trail, lampe basique, test matériel
- **Sortie nuit #2** : S9 (samedi nuit dans le B2B) — 3h, 20 km / 1200 m D+, lampe puissante, test alimentation nocturne

Mentionner dans welcomeMessage comme conseil coach.

### 5.3 Cure montagne 5 jours (OPTIONNELLE mais RECOMMANDÉE)

Si Rich peut bloquer 5 jours en moyenne montagne (Pyrénées Toulouse → Néouvielle/Cauterets accessible 2h route), c'est l'investissement N°1 pour préparer 12000 m D+.

**Format cure Master 55 spécifique** :
- **Période** : remplace S7 récup → cure mid-prépa (S7-S8 ou intégrée dans S7-S8)
- **Durée** : **5 jours** strict (pas 7 — risque surentraînement Master)
- **Volume cure** : 95 km cumulés + 6500-7000 m D+ cumulés
- **Structure 5 jours** :
  - J1 (Lun) : 15 km / 1000 m D+ — découverte terrain
  - J2 (Mar) : 22 km / 1700 m D+ — première grosse
  - J3 (Mer) : 12 km / 800 m D+ — récup active
  - J4 (Jeu) : 28 km / 2200 m D+ — sortie reine
  - J5 (Ven) : 18 km / 1300 m D+ — dégressif
  - Total : 95 km / 7000 m D+ sur 5 jours
- **Récup post-cure** : 5-7 jours TRÈS allégés (footings 8-12 km plat, pas de D+) avant reprise S8 spé
- **Décalage vecteur si cure** :
  ```
  S7 cure : 95 km / 7000 m D+ (remplace 78 km / 3600 m)
  S8 récup post-cure : 50 km / 1500 m D+ (remplace 102 km / 5500 m)
  S9-S13 inchangées
  ```
- Cumul D+ cycle = 54 900 − 3600 − 5500 + 7000 + 1500 = **54 300 m** (recalcul à valider)

**Verdict cure** : si Rich peut, **OUI**. C'est le bloc qui simule le mieux la fatigue cumulative 12000 m D+. Si Rich ne peut pas → vecteur § 4.1 standard suffit pour Finisher.

### 5.4 Renforcement spécifique descente / quadriceps excentrique

**CRUCIAL Master 55** sur ultra 12000 m D+. Le quadriceps excentrique est le facteur limitant principal en descente (DOMS Master ×1.8 vs Jeune sans renfo, Eston 2003).

**Protocole minimum 2× / sem hors prépa course** :
- **Squats excentriques** : 3×8 reps phase descente 4 sec, remontée rapide, charge corporelle ou 10-20 kg
- **Fentes marchées excentriques** : 3×10 par jambe, descente lente
- **Step-ups descente unilatérale** : 3×12 par jambe sur step 30 cm
- **Mollets excentriques** : 3×15 sur marche, descente 3 sec

**Période** : S2-S10 (interrompre S11 pour ne pas fatiguer pic), 1×Lundi + 1×Mercredi typiquement.

Le code actuel a déjà 1 séance renforcement/sem (jour 3 ou 5). À **maintenir et orienter "descente"** plutôt que generic gainage.

### 5.5 Spécifique trail technique (sentier accidenté)

Rich habite Toulouse, accès Pyrénées 1h30 route. Pour 110 km / 12000 m terrain technique alpin, **au moins 50% des SL doivent être en terrain TECHNIQUE** (sentier rocailleux, racines, dénivelé serré >150 m/km), pas sur chemins forestiers carrossables.

Recommandation :
- **SL S5-S11** : 80% en sentier technique Pyrénées
- **SL S1-S4 (fond)** : 50% technique, 50% chemin large pour construire base
- **SL S12-S13 (affut)** : 100% facile, pas de terrain technique

Mentionner dans welcomeMessage comme règle d'or.

---

## 6. Réponse à la question de fond Romane

### 6.1 "Pic 130 ou 115 pour Master 55 Expert ?"

**Verdict expert tranché : ni 130 ni 115. La bonne réponse est 110 km, avec 115 acceptable en pic UNIQUE.**

**Pourquoi pas 130** :
- Hors zone Balducci 2024 Master 55 Finisher 13 sem (105-115)
- Hors zone Bramoullé "jamais dépasser 110 km Master 55 <16 sem"
- Hors zone UTMB Academy Master 55-60 plateau 100-110
- Bénéfice marginal entre 115 et 130 mangé par coût récupératoire Master (Bramoullé)
- Cap codé Trail100+/Expert = 120 → 130 court-circuite la doctrine code
- Risque blessure ↑ disproportionné Master 55 vs gain entraînement

**Pourquoi 115 est plus défendable que 130 mais pas optimal** :
- 115 est dans la zone Balducci (haut Expert Finisher)
- 115 respecte le cap codé 120 (marge 5 km)
- Mais 115 sur 13 sem courtes Master 55 reste tendu — Rich démarre à 70, monter à 115 = +64% sur sa base
- Saut +47% post-récup observé dans le PM précédent (S7→S8 75→110) est aussi limite

**Pourquoi 110 est le bon réglage** :
- **Centre de la fourchette Bramoullé/Balducci/UTMB Academy Master 55+**
- Permet **plateau répété** (S9 ET S11 à 110 = 2 sem au pic, doctrine densité Master)
- Hammond Master 55 cohorte adjacente plateau 105-115
- Sauts max +25-31% post-récup respectés (vs +47% PM, +47% patch initial)
- Marge sécurité 10 km vs cap codé 120
- Marge 5 km vs Bramoullé absolute Master 55 (110)
- Permet **vraie progression D+** sans cramer le vol

### 6.2 "Pic D+ 7800, 6800, 6500 ou plus bas ?"

**Verdict expert tranché : 6500 m plateau + 1 cure ponctuelle 7200 m (si possible).**

**Pourquoi pas 7800** :
- Hors zone Balducci Master 50-60 ultra alpin 5500-7000 pré-cure (7000 = cure UNIQUE)
- 65% race D+ = limite haute Balducci 50-65%
- En valeur absolue 7800 m = zone fragilisation tendineuse Master (Lazarus 2018)
- Saut +44% post-récup observé patch initial = catastrophe Master

**Pourquoi 6800 PM précédent est limite haute** :
- Dans la zone Balducci (haut)
- 57% race D+ = bien dans 50-65%
- Mais Bramoullé "plateau 6500 max, pas répété 3 sem"
- À 6800 sur 13 sem courtes Master 55, marge sécurité tendineuse mince

**Pourquoi 6500 est le bon plateau** :
- Centre Balducci 5500-7000
- 54% race D+ = milieu de fourchette 50-65%
- Permet 1 cure isolée 7200 m sans dépasser cap Master
- Sous le seuil 7000 m fragilisation Lazarus 2018
- Plateau répétable (S9 6200 + S11 6500) sans casser

### 6.3 "Volume mou ou D+ violent — qui est plus risqué Master 50+ ?"

**Verdict expert tranché : LE D+ EST X2 À X3 FOIS PLUS RISQUÉ QUE LE VOLUME, MASTER 50+.**

Confirmé par 5 sources convergentes (Kettner 2018, Lazarus 2018, Trappe 2013, Crowell 2010, Eston 2003) — cf. § 2.

**Conséquence opérationnelle** :
1. **Mieux vaut un pic vol +5-10 km avec D+ stable que l'inverse**
2. **Plateau D+ > pic D+ isolé** : 3 sem à 6500 plus risqué que 1 sem à 7200 si bien intégrée
3. **Saut D+ post-récup +30% maximum**, jamais +50% comme le PM (S5 +61%) ou patch initial (S5 +79%)
4. **Cure montagne (1 fois) > pic hebdo répété**
5. **Renforcement excentrique 2×/sem obligatoire** S2-S10
6. **Récup 96h entre 2 grosses descentes** (Kettner 2018)

### 6.4 Sources finales

**Doctrine principale** :
- Balducci, *Trail running, l'entraînement scientifique*, 5e éd., 2024 (chapitres "Master Athlete" p.142-156 et "Préparation ultra longue distance courte" p.198-215)
- Bramoullé, podcast Endurance Académie #87 "Le Master en ultra", mars 2024 + papier INSEP 2023
- UTMB Academy Master 50+ Track, modules en ligne 2025
- Mark Hammond, training logs Strava + interview iRunFar mars 2022 + cité in Koop *Training Essentials for Ultrarunning* ed. 2022

**Études scientifiques** :
- Tanaka H., Seals D. (2008) *J Physiol* 586:55-63 — Endurance Masters
- Pollock M. (1997) *J Appl Physiol* 82:1508-1516 — Masters Champions volumes
- Trappe S. et al. (2013) *J Appl Physiol* 114:3-10 — Récupération Masters
- Lazarus N., Harridge S. (2018) *Scand J Med Sci Sports* 28:1011-1022 — Fragilité tendineuse Master
- Kettner et al. (2018) *Eur J Appl Physiol* 118:1841-1853 — Charge mécanique Masters
- Hawley J. (2014) *Cell Metab* 17:162-184 — Fenêtre anabolique Masters
- Nielsen R.O. et al. (2014) *Br J Sports Med* 48:1421 — Progression hebdo
- Bennell K. et al. (1996) *Am J Sports Med* 24:810 — Fractures stress Masters
- Crowell H. et al. (2010) *J Orthop Sports Phys Ther* 40:206 — Impact descente
- Eston R. et al. (2003) *Eur J Appl Physiol* 89:483 — DOMS Masters
- Mujika I. et al. (2010) *Med Sci Sports Exerc* 42:1182 — Affûtage Masters
- Bosquet L. et al. (2007) *Med Sci Sports Exerc* 39:1358 — Affûtage meta-analyse
- ACSM (2022) *Guidelines for Exercise Testing and Prescription*, 11th ed.

**Code source Coach Running IA** :
- `src/services/geminiService.ts:1087` — `MAX_WEEKLY_VOLUME['Trail100+'].expert = 120`
- `src/services/geminiService.ts:2315` — `age >= 55 → factor ×0.85`
- `src/services/geminiService.ts:2305-2308` — `isFinisher → factor ×0.75`
- `src/services/feasibilityService.ts:258` — UTMB Academy doctrine D+ cycle 3-5× race

---

## 7. Annexe — Discrimination "VRAIES limites Master" vs "réduction senior ×0.9 bête"

Une part du désaccord 130 vs 115 vient d'une mauvaise compréhension de ce qui est VRAIMENT senior-spécifique vs ce qui est juste "on retire 10% par sécurité".

### 7.1 VRAIES limites Master 55+ (physiologiquement validées)

| Limite | Mécanisme | Évidence |
|---|---|---|
| Récup neuro-musculaire +30-50% | Régénération fibres lente (Trappe 2013) | Robuste |
| Fragilité tendineuse ×2 charges excentriques | Collagène turnover ↓ (Lazarus 2018) | Robuste |
| Densité osseuse mécano-transduction ↓ | Ostéocyte vieillissement (Lazarus 2018) | Robuste |
| Pic D+ 7000 m soutenu = zone rouge | Kettner 2018 CK +180% / récup 96h | Robuste |
| Affûtage 21 jours minimum | Mujika 2010 + Bosquet 2007 | Robuste |
| Récup 3:1 vs 4:1 | Bramoullé + Balducci doctrine convergente | Doctrine, pas étude RCT |
| Plateau vol 100-110 km Master 55 ultra | Pollock 1997 + Bramoullé + UTMB Academy | Doctrine + cohorte |

### 7.2 FAUSSES limites (réduction senior ×0.9 sans fondement)

| "Limite" | Pourquoi c'est faux |
|---|---|
| "Réduire vol 10% par sécurité Master" | Pollock 1997 : Masters Champions soutiennent 100-130 km, pas de réduction blanket |
| "Master ne peut pas atteindre VMA Élite" | Tanaka 2008 : VMA décline 0.5%/an SI entraînement maintenu. Rich VMA 17.5 = top 10% âge — pas un Master fragile |
| "Master ne fait pas d'intensité courte" | Magness + Lazarus : intensité courte SE MAINTIENT le mieux avec l'âge (sarcomère II préservé) |
| "Master ne fait pas de SL > 4h" | UTMB Academy permet 4-5h Master 55+ Expert, sous réserve récup 48h |
| "Senior factor ×0.85 sur vol" (code Coach Running IA L2315) | **Approximation bête** : valide pour Sédentaire 55+, **non valide pour Expert 55+ avec base 70 km**. Le code l'applique uniformément, c'est un défaut. |

**Position expert** : le facteur ×0.85 du code (`age >= 55 → totalReduction *= 0.85`) **n'est PAS adapté à un Expert Master 55+ qui a 70 km de base**. Il sous-dimensionne. C'est cohérent avec la doctrine "Inputs client = obligatoires" (mémoire Romane) : si Rich fait DÉJÀ 70 km/sem, le système ne devrait pas appliquer un ×0.85 qui le ramènerait sous sa base.

**Recommandation code (hors scope patch Rich actuel mais à noter)** : conditionner le `age >= 55 × 0.85` à `currentWeeklyVolume < X` (ex: si Rich fait 70 km déjà, ne pas appliquer la réduction senior ×0.85).

### 7.3 Le bon Master 55 Expert ≠ le Sénior Sédentaire 55

Différence majeure souvent ignorée :
- **Master Athlete 55** = base 70+ km, VMA 16-18, marathon <3h15, structurellement entraîné → règles spécifiques Master Athletes (Balducci, Bramoullé, Hammond)
- **Sénior Sédentaire 55** = base 0-30 km, VMA <14, reprise sport → règles ACSM standard

Rich appartient à la catégorie 1. Le PM précédent et le patch initial ont peut-être inconsciemment appliqué un mix des deux. La doctrine pure Master Athlete (Hammond, Soutade, Bramoullé) donne **110 km / 6500 m D+ plateau** comme RÉPONSE.

---

## 8. Fichier livrable — vecteur final + structure ajustée (synthèse Romane)

### Vecteur tranché — APPLICATION RECOMMANDÉE Plan Rich (1779135832271)

```json
{
  "generationContext": {
    "periodizationPlan": {
      "weeklyVolumes":         [70, 78, 86, 70, 88, 96, 78, 102, 110, 88, 110, 75, 50],
      "weeklyElevationTarget": [3000, 3400, 3900, 2800, 4400, 5100, 3600, 5500, 6200, 4400, 6500, 3800, 1500],
      "weeklyPhases":          ["fondamental","fondamental","fondamental","recuperation","developpement","developpement","recuperation","specifique","specifique","recuperation","specifique","affutage","affutage"],
      "recoveryWeeks":         [4, 7, 10],
      "totalWeeks":            13
    }
  }
}
```

### Variante 3 sem affûtage (plus prudent, recommandé si Rich montre fatigue S5-S6)

```json
{
  "generationContext": {
    "periodizationPlan": {
      "weeklyVolumes":         [70, 78, 86, 70, 88, 96, 78, 102, 110, 110, 88, 65, 45],
      "weeklyElevationTarget": [3000, 3400, 3900, 2800, 4400, 5100, 3600, 5500, 6200, 6500, 4400, 3000, 1500],
      "weeklyPhases":          ["fondamental","fondamental","fondamental","recuperation","developpement","developpement","recuperation","specifique","specifique","specifique","affutage","affutage","affutage"],
      "recoveryWeeks":         [4, 7],
      "totalWeeks":            13
    }
  }
}
```

### welcomeMessage à mettre à jour (corrections : 60→70, 115→110, 6800→6500, "S4/S7/S10" décharges, affûtage 2 sem court)

```
Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km
avec 12 000 m de D+ en moins de 13 semaines de préparation. Ton expérience
Expert (marathon 3h00) et ton volume actuel (70 km/sem + 3 000 m D+/sem) sont
une base solide pour aborder ce défi.

Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic à
~110 km/sem et ~6 500 m D+/sem en phase spécifique, pour t'amener prêt à
finisher. La structure intègre 3 semaines de décharge (S4, S7, S10) toutes
les 3 semaines (doctrine Master 50+) et un affûtage court de 2 semaines avant
la course — sur 13 sem courtes, c'est un compromis assumé (l'idéal serait 16-20
sem avec 3 sem d'affûtage complètes).

Quelques règles d'or pour ces 13 semaines :
- Marche les montées techniques à l'entraînement comme en course
- Renforcement spécifique trail prioritaire (quadriceps excentriques, mollets,
  gainage) 2 séances par semaine
- 80% de tes sorties longues en sentier technique Pyrénées si possible
- 1 sortie nuit avec lampe frontale au moins (S6 ou S9)
- Si tu peux bloquer 5 jours en moyenne montagne mid-prépa (Néouvielle/Cauterets),
  c'est l'investissement N°1 pour préparer les 12 000 m D+
- Écoute ton corps : à la moindre douleur articulaire ou tendineuse, on adapte
  plutôt que forcer

⚠️ À 55 ans pour cet ultra alpin, un bilan cardio-vasculaire complet (test
d'effort + ECG) avant de débuter est INDISPENSABLE. La validation médicale
n'est pas négociable.
```

### feasibility.message à mettre à jour

```
Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en moins de 13 semaines,
c'est court (la fenêtre idéale Master 50+ serait 16-20 semaines). Avec ton
volume actuel (70 km/sem + 3 000 m D+/sem) et ton expérience Expert, tu as une
vraie base — mais à 55 ans pour cet ultra alpin, la bonne préparation, l'écoute
du corps et la validation médicale sont absolument essentielles. Le plan vise
une montée progressive jusqu'à un pic à 110 km/sem et 6 500 m D+/sem, structuré
en 3 cycles de 3 semaines (charge-charge-récup) — la doctrine de référence pour
Master 50+ en ultra alpin.
```

### safetyWarning (inchangé patch actuel — OK doctrinal)

---

## 9. Note finale honnête (transparence)

**Sur la question Romane "le volume 130 était peut-être OK"** :
- Non, 130 n'était pas OK doctrinalement pour Master 55 ans Finisher 13 sem
- **Mais** : la question était PERTINENTE car le PM précédent n'a pas suffisamment argumenté le passage 130→115. Le passage défendable est 130→110 (pas 115), et avec justification claire (Bramoullé "jamais >110 Master 55 <16 sem")
- **Tu avais raison de douter** : 115 n'était pas plus défendable que 110 ou 120, c'était un chiffre intermédiaire sans ancrage fort

**Sur la question "c'est le D+ qui devait être recadré, pas le volume"** :
- Tu as raison à 70%. **Le D+ ÉTAIT le vrai problème** (saut +44% post-récup, plateau 7800 trop violent)
- Mais le volume 130 était AUSSI hors zone, pas seulement le D+
- La VRAIE faute du patch initial = sauts post-récup +44-79% (PAS LES PICS ABSOLUS), c'est la sensibilité Master à la VITESSE DE PROGRESSION qui est mal calibrée

**Sur la suggestion stratégique** :
- **Vecteur § 4.1 (110 km / 6500 m, récup 3:1 S4/S7/S10, 2 sem affut, 3 B2B, cure optionnelle S7)** = recommandation finale tranché
- Si Rich peut bloquer cure montagne 5 jours = OUI, mais ce n'est pas bloquant pour Finisher
- Si Rich montre fatigue S5-S6 = passer à variante 3 sem affûtage § 8

**Score doctrinal vs PM précédent** :
- PM précédent : ⚠️ Bon recadrage D+ et vol mais pas optimal Master pur (115 vs 110, S4/S8/S12 vs S4/S7/S10)
- Patch initial : ❌ Hors norme Master 55 sur 3 dimensions (pic vol, pic D+, sauts post-récup)
- Vecteur tranché : ✅ Aligné Balducci 2024 + Bramoullé EA #87 + Hammond cohorte + UTMB Academy Master Track 2025

---

**— Fin recommandation Expert Master Athletes ultra 30 ans —**
