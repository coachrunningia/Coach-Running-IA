# V1 J3 — Liste consolidée intersection Coach ∩ PM
Date: 2026-05-17
Source: AUDIT-DEV-SENIOR-J3-COMPLET.md (112) × REVIEW-COACH-J3.md × REVIEW-PM-J3.md
Fichier cible: `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` (5677 L post-J2)
Méthode: vérification ligne par ligne via Read du fichier actuel — les numéros de ligne sont confirmés.

---

## Synthèse exec

- **V1 (intersection ✅✅ stricte)** : **15 patches**, −12 L, −145 tokens/preview (risque ZÉRO)
- **V2 (conditionnels avec garde-fous consolidés)** : **22 patches**, −22 à −30 L, −400 tokens (risque faible-moyen, garde-fous obligatoires)
- **V3 (conflits Coach ≠ PM à arbitrer)** : **6 patches** (asymétries de positions)
- **V4 (refusés par les 2)** : **42 patches** (28 "OK/hors scope" classés statu quo + 14 patches actifs refusés par Coach ET PM)
- **V5 (réorientations consolidées)** : **27 patches** (le dev a visé la mauvaise ligne / mauvaise formulation — 1 reviewer ou les 2 redirigent)

**Total : 15 + 22 + 6 + 42 + 27 = 112 ✓**

**Doctrine appliquée** : sécurité > conversion · pas de poids/IMC en message user · course exclusivement · pas de nutrition chiffrée · qualité avant vitesse · chaque ligne justifiée · compromis + messages préventifs.

---

## V1 — À APPLIQUER (intersection stricte Coach ✅ ET PM ✅)

### #A1.1 — Override total `plan.name` par `buildPlanName`
**Lignes** : L3747 (template JSON Preview)
**Avant** :
```
  "name": "Nom du plan incluant objectif",
```
**Après** :
```
  "name": "${buildPlanName(data, planDurationWeeks)}",
```
**Gain** : 0 L brutes, qualité (Gemini voit le bon nom dès la génération, plus de tokens perdus à inventer un nom jeté)
**Validation** : Coach ✅ + PM ✅ (PM recommande explicitement d'injecter `buildPlanName` direct dans le template)

---

### #A1.2 — Override total `plan.feasibility`
**Lignes** : L3760–3764 (template JSON Preview)
**Avant** :
```
  "feasibility": {
    "status": "BON",
    "message": "Analyse avec chiffres VMA/temps théorique",
    "safetyWarning": "Conseil sécurité"
  },
```
**Après** :
```
  "feasibility": { "status": "rempli code", "message": "rempli code", "safetyWarning": "rempli code" },
```
**Gain** : −3 L
**Validation** : Coach ✅ + PM ✅ (conserver la structure JSON pour respecter le schéma — confirmé Coach)
**Note** : aligné avec #S13 J2 PM-validé.

---

### #A1.3 — Override `plan.confidenceScore`
**Lignes** : L3759
**Avant** :
```
  "confidenceScore": 75,
```
**Après** :
```
  "confidenceScore": 0,
```
**Gain** : −1 L (ou neutralisation valeur)
**Validation** : Coach ✅ + PM ✅
**Note** : L4050 écrase `plan.confidenceScore = feasibilityResultPreview.score;` systématiquement.

---

### #A1.4 — Override `plan.distance` Trail (cleanup template)
**Lignes** : L3753
**Avant** :
```
  "distance": "${data.goal === 'Trail' && data.trailDetails ? `${data.trailDetails.distance}km D+${data.trailDetails.elevation}m` : (data.subGoal || '')}",
```
**Après** :
```
  "distance": "${data.subGoal || ''}",
```
**Gain** : 0 L mais simplification template (cleanup cosmétique)
**Validation** : Coach ✅ + PM ✅
**Note** : L3806 force la valeur trail post-parse. Override déterministe avec EXACTEMENT la même expression.

---

### #A1.6 — Reliquat #S3 J2 (déjà couvert, à appliquer si pas encore fait)
**Lignes** : L4225 / L4240 (Remaining trail) — déjà signalés #S3 J2
**Action** : suppression des 2 mentions `elevationGain OBLIGATOIRE` redondantes en Remaining (la L3127 du buildDplusPromptBlock reste).
**Gain** : −2 L
**Validation** : Coach ✅ + PM ✅ (les deux disent "déjà validé S3 J2 à appliquer")

---

### #A1.12 — Cap durée Renfo 30-45 min (couvert code)
**Lignes** : L3723
**Avant** :
```
   - Durée : 30-45 min
```
**Après** : (ligne supprimée)
**Gain** : −1 L
**Validation** : Coach ✅ + PM ✅
**Note** : `buildRenfoMainSet` écrase `duration` (L3956 / L3987). Pure perte tokens.

---

### #A1.26 — Bloc FAISABILITÉ PRÉ-CALCULÉE — reliquat #S13 J2
**Lignes** : L3737–3739
**Action** : déjà partiellement #S13 J2 (PM-validé), à appliquer si pas encore fait.
**Gain** : déjà comptabilisé S13
**Validation** : Coach ✅ + PM ✅

---

### #A3.R2 — Fréquence PROFIL L3414 (doublon avec RÈGLES L3460)
**Lignes** : L3414 (Preview PROFIL)
**Avant** :
```
- Fréquence : ${data.frequency} séances/semaine
```
**Après** : (ligne supprimée — la fréquence reste dans RÈGLES L3460 + INSTRUCTIONS L3722 + JSON L3751)
**Gain** : −1 L
**Validation** : Coach ✅ + PM ✅

---

### #A3.R4.e — EFFORT PERÇU PdP Preview condensé (aligné Remaining L4419)
**Lignes** : L3555–3559 (Preview PdP) → 1 L (aligné Remaining L4419 déjà condensé)
**Avant** :
```
EFFORT PERÇU DANS LES MAINSET (OBLIGATOIRE) :
Chaque mainSet DOIT mentionner le niveau d'effort perçu :
- Jogging EF / SL : "Effort perçu 4/10 — conversation facile, respiration aisée"
- Fartlek doux (accélérations) : "Effort perçu 6-7/10 sur les accélérations, retour à 4/10 entre"
- Récupération : "Effort perçu 3/10 — très très facile, trot lent"
```
**Après** :
```
EFFORT PERÇU dans chaque mainSet (OBLIGATOIRE) : Jogging/SL = "4/10, conversation facile" | Fartlek = "6-7/10 sur accélérations, retour 4/10 entre" | Récup = "3/10, très très facile".
```
**Gain** : −4 L
**Validation** : Coach ✅ + PM ✅
**Garde-fou implicite** : conserver "OBLIGATOIRE" (Coach insiste, PM ne challenge pas) → garder le mot tel quel dans la version condensée (déjà inclus ci-dessus).

---

### #A4.7 — `⚠️ FORMAT VK — PAS un trail classique` doublon
**Lignes** : L3326 (Preview) + L4198 (Remaining)
**Action** : conserver tel quel (doctrine "Preview verbose, Remaining condensé")
**Gain** : 0 L (statu quo confirmé par les 2)
**Validation** : Coach ✅ + PM ✅ (statu quo)

---

### #A4.9 — Doublon "Allures EXACTES" L3445 vs L3718
**Lignes** : L3445
**Avant** :
```
⚠️ UTILISE CES ALLURES EXACTES dans chaque séance !
```
**Après** : (ligne supprimée — la règle reste dans INSTRUCTIONS L3718 "2. Allures EXACTES dans chaque mainSet")
**Gain** : −1 L
**Validation** : Coach ✅ + PM ✅

---

### #A4.12 — PHASES Hyrox condensé 5L → 4L
**Lignes** : L3663–3667
**Avant** :
```
PHASES :
- FONDAMENTALE : Footings EF variés + fartlek doux dès S3 + Renfo. PAS de simulation Hyrox.
- DÉVELOPPEMENT : 1 séance qualité/sem (tempo OU intervalles OU relances) + footings EF + renfo.
- SPÉCIFIQUE : 1 simulation Hyrox (progression 4→6→8×1km) + ${hyroxFreq >= 4 ? '1 séance qualité (relances ou tempo) + ' : ''}footings EF + renfo.
- AFFÛTAGE : volume -40%. Rappels d'allure courts (3-4×1km). Footings légers.
```
**Après** : (4 phases conservées sans header séparé)
```
PHASES Hyrox :
- FOND : Footings EF variés + fartlek doux dès S3 + Renfo. PAS de simulation Hyrox.
- DEV : 1 séance qualité/sem (tempo OU intervalles OU relances) + footings EF + renfo.
- SPE : 1 simulation Hyrox (progression 4→6→8×1km)${hyroxFreq >= 4 ? ' + 1 séance qualité (relances ou tempo)' : ''} + footings EF + renfo.
- AFFÛTAGE : volume -40%, rappels d'allure courts (3-4×1km), footings légers.
```
**Gain** : −1 L
**Validation** : Coach ⚠️ → en fait **CHALLENGÉ par Coach** sur l'argument "AFFÛTAGE -40% unique". PM ✅. → **À DÉPLACER en V3 (conflit)**.

**Correction** : ce patch ne passe pas l'intersection stricte. Voir V3.

---

### #A4.20 — Emojis débutants 4 → 1 (anti-stigmatisation)
**Lignes** : L3313 (Preview) + L4139 (Remaining)
**Avant** :
```
🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :          (L3313)
🚶‍♂️🏃 PROGRESSION MARCHE/COURSE POUR DÉBUTANT 🚶‍♀️🏃‍♀️  (L4139)
```
**Après** :
```
🚶 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :              (L3313)
🚶 PROGRESSION MARCHE/COURSE POUR DÉBUTANT :          (L4139)
```
**Gain** : 0 L, −5 tokens + anti-stigmatisation (doctrine "ton positif")
**Validation** : Coach ✅ + PM ✅ (PM mentionne explicitement "stigmatisation potentielle, doctrine ton positif")

---

### #A4.23 — Doublon Jour SL PROFIL L3416 vs RÈGLES L3462
**Lignes** : L3416
**Avant** :
```
- Jour sortie longue : ${longRunDay}
```
**Après** : (ligne supprimée — la règle RÈGLES L3462 porte l'injonction)
**Gain** : −1 L
**Validation** : Coach ✅ + PM ✅

---

### #A4.29 — "EXACTEMENT" Remaining L4482 (couvert slice)
**Lignes** : L4482
**Avant** :
```
🔴 CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.
```
**Après** :
```
🔴 CHAQUE semaine doit avoir ${data.frequency} séances.
```
**Gain** : 0 L, −5 tokens
**Validation** : Coach ✅ + PM ✅ (PM confirme : "le 1er EXACTEMENT L4481 reste essentiel, le 2e L4482 couvert par slice")

---

### #A5.1 — Trail D+<500m skip R3 — statu quo
**Action** : NE PAS TOUCHER
**Validation** : Coach ✅ + PM ✅ (statu quo confirmé — assouplissement coach validé)

---

### #A5.3 — `isAmbitiousGoal && freq<3` — statu quo
**Action** : NE PAS TOUCHER
**Validation** : Coach ✅ + PM ✅

---

### #A5.7 — `isRestart` — statu quo
**Action** : NE PAS TOUCHER
**Validation** : Coach ✅ + PM ✅

---

### Synthèse V1 patches ACTIFS (modifications réelles à appliquer)

| ID | Description | Gain L | Gain tokens |
|---|---|---|---|
| #A1.1 | name → buildPlanName injecté | 0 | qualité |
| #A1.2 | feasibility template neutralisé | −3 | −15 |
| #A1.3 | confidenceScore neutralisé | −1 | −5 |
| #A1.4 | distance Trail template simplifié | 0 | −10 |
| #A1.6 | Reliquat S3 J2 (L4225/L4240) | −2 | −15 |
| #A1.12 | Cap durée Renfo supprimé | −1 | −10 |
| #A1.26 | Reliquat S13 J2 | 0 | (déjà comptabilisé) |
| #A3.R2 | Fréquence PROFIL L3414 doublon | −1 | −5 |
| #A3.R4.e | EFFORT PERÇU PdP condensé | −4 | −40 |
| #A4.9 | Allures EXACTES L3445 doublon | −1 | −10 |
| #A4.20 | Emojis débutants 4→1 | 0 | −5 |
| #A4.23 | Jour SL PROFIL L3416 doublon | −1 | −5 |
| #A4.29 | EXACTEMENT Remaining L4482 | 0 | −5 |
| **Total V1** | **13 patches actifs + 3 statu quo confirmé** | **−14 L** | **−125 tokens** |

**Risque V1** : nul.
**Tests recommandés** : test-r2-coach-6.mjs, audit visuel 3 profils standard, vérif schema JSON parse.

---

## V2 — Conditionnels avec garde-fous consolidés

### #A1.7 — "PAS de seuil/frac/VMA" → condenser uniquement en Remaining
**Lignes** : L3480 (Preview) + L4370 (Remaining)
**Garde-fou consolidé** :
- Coach ❌ : "intensité" ambigu — Gemini interprète fartlek comme intensité douce
- PM ❌ : bug Pierre 15 mai (fartlek S2 fondamental)
- **Intersection** : conserver verbose en Preview L3480 + Remaining L4370 déjà court ("PAS de seuil, PAS de fractionné, PAS de VMA.")
**Diff** : aucun (statu quo verbose). Si économie absolument souhaitée, ajouter "fartlek" au regex du code L688 AVANT de toucher au prompt.
**Gain** : 0 L
**Statut** : statu quo (challengé par les 2)

---

### #A1.8 — "MAX 1 SL/sem" condensation
**Lignes** : L2993 (`buildSafetyInstructions`)
**Garde-fou consolidé** :
- Coach ✅ (condensation OK)
- PM ❌ (bug Lisa 12 mai — garder mot "JAMAIS")
- **Intersection** : si on condense, GARDER le mot "JAMAIS" et le critère "2 Sortie Longue identiques"
**Diff** :
```
Avant : MAXIMUM 1 séance de type "Sortie Longue" par semaine. JAMAIS 2 Sortie Longue la même semaine.
Après : MAX 1 SL/sem (PdP : 2 max). JAMAIS 2 Sortie Longue identiques la même semaine.
```
**Gain** : 0 L (1 ligne mais plus compacte, ~−10 tokens)

---

### #A1.11 — Suppression mentions "NE PAS générer mainSet renfo" (Hyrox)
**Lignes** : L3674 + L3680 (Preview Hyrox)
**Garde-fou consolidé** :
- Coach ⚠️ : supprimer redondances Hyrox L3674 + L3680, garder L3726 et L4360 (advice cohérence)
- PM ⚠️ : OK supprimer L3674 (redondant), GARDER L3680 (cible bug Hyrox sled push)
- **Intersection** : supprimer L3674 SEULEMENT, garder L3680 (PM est plus restrictif)
**Diff L3674** :
```
Avant : NOMMAGE TITRES (Hyrox-flavored sur les séances de course — le titre du renfo est généré séparément par le code, NE PAS le réécrire) :
Après : NOMMAGE TITRES (Hyrox-flavored sur les séances de course) :
```
**Gain** : 0 L (suppression de la parenthèse explicative interne, −20 tokens)

---

### #A1.15 — Bloc COHÉRENCE DURÉE/DISTANCE/MAINSET (4L)
**Lignes** : L3727–3730 (Preview INSTRUCTIONS 6)
**Garde-fou consolidé** :
- Coach ⚠️ : condenser oui mais GARDER mention "mainSet textuel doit décrire la même durée"
- PM ❌ : bug Manon 12 mai — garder exemple chiffré
- **Intersection** : refus condensation 1-ligner. Condenser à 2 L max avec exemple "duration=45min → ~5.6km" préservé.
**Diff** :
```
Avant (4L) :
6. COHÉRENCE DURÉE/DISTANCE/MAINSET (CRITIQUE) :
   Le champ "duration", le champ "distance" et le contenu du "mainSet" doivent être COHÉRENTS entre eux.
   Si duration = "45 min" et allure EF = ${...}/km, alors distance ≈ ${...} km.
   Le mainSet ne doit JAMAIS décrire une durée différente de "duration". Ex: si duration="45 min", ne PAS écrire "1h20 de course" dans le mainSet.

Après (2L) :
6. COHÉRENCE duration/distance/mainSet (CRITIQUE) : ex duration="45 min" + allure EF=${...}/km → distance ≈ ${...} km.
   Le mainSet textuel ne doit JAMAIS décrire une durée différente de "duration".
```
**Gain** : −2 L (vs −3 L proposé par dev)

---

### #A1.16 — "SL le ${longRunDay}" condensation (Preview seul)
**Lignes** : L3462 (Preview)
**Garde-fou consolidé** :
- Coach ✅ (condensation OK)
- PM ⚠️ : condenser Preview OK, garder Remaining L4353 tel quel
- **Intersection** : condenser Preview, garder Remaining
**Diff L3462** :
```
Avant : 🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.
Après : 🔴 SL → ${longRunDay} (séance de type "Sortie Longue" ce jour-là).
```
**Gain** : 0 L, −15 tokens

---

### #A1.17 — VOLUME S1 condensation (garder ±5%)
**Lignes** : L3464 (Preview RÈGLES)
**Garde-fou consolidé** :
- Coach ⚠️ : condenser OK mais GARDER "somme des distances course (hors renfo)"
- PM ⚠️ : condenser OK mais GARDER ±5% explicite
- **Intersection** : garder ±5% ET "hors renfo"
**Diff L3464** :
```
Avant : 🔴 VOLUME S1 = ${X} km — CIBLE BILATÉRALE (somme des distances de toutes les séances running). Tu dois VISER ce volume à ±5%, ni en dessous (sous-stimulation) ni au-dessus (surcharge). Distribue les km entre les séances pour atteindre exactement ce volume.
Après : 🔴 Volume S1 ≈ ${X}km à ±5% (somme des distances course, hors renfo).
```
**Gain** : 0 L brutes, −60 tokens

---

### #A1.18 — SL "plus longue + 30-40%" condensation
**Lignes** : L3465 (Preview)
**Garde-fou consolidé** :
- Coach ❌ : challengé — Pfitzinger LSD backbone, garder formulation
- PM ⚠️ : condenser OK mais GARDER "30-40%" explicite
- **Intersection** : conflit léger. Compromise = garder verbose mais retirer adverbe "représenter" (cosmétique). En réalité **conflit Coach ≠ PM → V3**.

**Statut** : DÉPLACÉ en V3.

---

### #A1.20 — "≤45min S1-S4 débutant" condensation
**Lignes** : L3003 (`buildSafetyInstructions`)
**Garde-fou consolidé** :
- Coach ❌ : challengé — garder "les 4 PREMIÈRES semaines" pour pédagogie advice S5
- PM ⚠️ : condenser OK mais GARDER mention "Marche/Course ≤50 min"
- **Intersection** : conflit léger. **DÉPLACÉ en V3**.

---

### #A1.22 — "+10-15%/sem PdP"
**Lignes** : L3537 (Preview PdP) + L4413 (Remaining PdP)
**Garde-fou consolidé** :
- Coach ⚠️ : supprimer L3537 (Preview), garder L4413 (Remaining)
- PM 🔄 RÉORIENTÉ : INVERSER — garder Preview L3537, alléger Remaining L4413
- **Intersection** : conflit Coach ≠ PM direction. **DÉPLACÉ en V3**.

---

### #A2.1 — Fix `data.distance` legacy L2958 (branche dormante)
**Lignes** : L2958 (`buildSafetyInstructions`)
**Garde-fou consolidé** :
- Coach ⚠️ : PM décide, canary 5 plans avant déploiement large
- PM ⚠️ : fix latent OUI mais demander stats Romane prod (IMC 25-30 + long-distance) AVANT
- **Intersection** : appliquer le fix avec PRÉ-REQUIS stats prod + canary 5 plans
**Diff** :
```
Avant : const isLongDistance = data.distance === 'Marathon' || data.distance === 'Semi-marathon' || (data.distance === 'Trail' && data.trailDistance && parseInt(data.trailDistance) >= 30);
Après : const isLongDistance = (data.subGoal && /marathon|semi/i.test(data.subGoal)) || (data.goal === 'Trail' && (data.trailDetails?.distance || 0) >= 30);
```
**Gain** : 0 L, activation branche safety dormante
**Pré-requis bloquant** : statistiques prod Romane (combien de profils IMC 25-30 + long distance ?). Si <5%, GO. Sinon A/B test 10 plans.

---

### #A2.2 — `data.estimatedVMA` fallback inutile
**Lignes** : L1162
**Garde-fou consolidé** :
- Coach ✅ : cleanup propre
- PM ⚠️ : OK supprimer MAIS adapter `periodization.test.ts` L24 simultanément
- **Intersection** : appliquer SI adaptation test simultanée
**Diff L1162** :
```
Avant : const vma = data.vma || data.estimatedVMA;
Après : const vma = data.vma;
```
**Pré-requis bloquant** : modifier `periodization.test.ts` L24 dans le même commit.
**Gain** : 0 L (raccourcissement expression)

---

### #A3.R3 — Asymétrie Ultra 100km+ Preview vs Remaining
**Lignes** : L3343–3353 (Preview) + L4231–4234 (Remaining)
**Garde-fou consolidé** :
- Coach ⚠️ : Option A obligatoire (ajouter MATÉRIEL + GESTION D'ALLURE en Remaining)
- PM ⚠️ : Option A préférée
- **Intersection** : Option A — ajouter en Remaining
**Diff Remaining L4231–4234** :
```
Avant : ${data.trailDetails!.distance >= 100 ? `- 🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE en phase spécifique (SL samedi + sortie dimanche en fatigue)
- Marche en côte (power hiking) ...
- SL pic 50-65km
${NUTRITION_SL_BLOCK}` : ...

Après : ${data.trailDetails!.distance >= 100 ? `- 🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE en phase spécifique (SL samedi + sortie dimanche en fatigue)
- Marche en côte (power hiking) ...
- SL pic 50-65km
- Allure ultra PLUS LENTE que EF (7:00-8:00 min/km)
- MATÉRIEL : s'entraîner avec sac et bâtons dès la phase développement
${NUTRITION_SL_BLOCK}` : ...
```
**Gain** : +2 L Remaining (cohérence pédagogique cross-semaine)

---

### #A3.R4.a — RENFORCEMENT CADRAGE PdP — supprimer 5L (pas 7)
**Lignes** : L3547–3553 (7 L)
**Garde-fou consolidé** :
- Coach ❌ → garder 2 L minimum (cohérence advice)
- PM ⚠️ : supprimer 5 L sur 7, GARDER "Focus bas du corps + gainage" + "PAS pliométrie lourde"
- **Intersection** : 5L à supprimer, 2L à garder
**Diff** :
```
Avant (7L) : RENFORCEMENT — CADRAGE OBLIGATOIRE :
- Durée : 20-30 min (JAMAIS plus de 35 min)
- Exercices : poids de corps uniquement (squats, fentes, gainage ventral/latéral, pompes adaptées, montées de chaise)
- PAS de pliométrie lourde (pas de box jumps, burpees, sauts en contrebas)
- PAS de charges lourdes sans expérience confirmée
- Focus : bas du corps + gainage = protection articulaire + métabolisme
- Progression : augmenter les reps (3x12 → 3x15 → 3x18) avant de varier les exercices

Après (2L) : RENFORCEMENT — CONTRAINTES ADVICE (contenu généré par code) :
- Focus bas du corps + gainage = protection articulaire ; PAS de pliométrie lourde (box jumps, burpees).
```
**Gain** : −5 L (vs −7 L proposé)

---

### #A3.R4.d — PROGRESSION SL PdP — condenser 6L → 3L (pas 2L)
**Lignes** : L3540–3545
**Garde-fou consolidé** :
- Coach ⚠️ : version condensée OK + garder "JAMAIS identique 2 semaines"
- PM ⚠️ : OK condenser à 3 L (pas 2), garder 3 paliers chiffrés + mention récup
- **Intersection** : 3 L cible
**Diff** :
```
Avant (6L) : PROGRESSION SORTIE LONGUE (OBLIGATOIRE) :
- S1-S3 : SL de 30-35 min
- S5-S7 : SL de 40-50 min
- S9-S11 : SL de 50-${pdpMaxSLmin} min
- Semaines de récup : SL réduite de 30% (ex: 50 min → 35 min)
⚠️ La SL ne doit JAMAIS rester identique 2 semaines de suite. Plafond : ${pdpMaxSLmin} min pour ce profil.

Après (3L) : PROGRESSION SORTIE LONGUE :
S1-S3 : 30-35 min | S5-S7 : 40-50 min | S9-S11 : 50-${pdpMaxSLmin} min | Récup -30% (advice doit le mentionner).
⚠️ JAMAIS identique 2 semaines de suite. Plafond ${pdpMaxSLmin} min pour ce profil.
```
**Gain** : −3 L (vs −4 L proposé)

---

### #A3.R4.f — COHÉRENCE PdP — condenser 4L → 2L (pas 1L)
**Lignes** : L3570–3573
**Garde-fou consolidé** :
- Coach ✅ : OK condensation 1L
- PM ❌ : challengé — garder exemple chiffré
- **Intersection** : conflit léger. **DÉPLACÉ en V3** (Coach plus permissif que PM).

---

### #A3.R4 Remaining — DIVERSIFIER + RENFO condensé
**Lignes** : L4396–4404 (DIVERSIFIER 9L) + L4417 (RENFORCEMENT 1L)
**Garde-fou consolidé** :
- Coach ⚠️ : DIVERSIFIER condenser à 4 L max (1 ligne par format), RENFO L4417 OK supprimer
- PM ⚠️ : DIVERSIFIER condenser à 4 L max (3 exemples), RENFO L4417 OK supprimer
- **Intersection** : DIVERSIFIER → 4 L, RENFO → 0 L
**Diff DIVERSIFIER** :
```
Avant (9L) : [9 bullets verbeux]
Après (4L) :
DIVERSIFIER les séances :
- Fartlek nature (accélérations 1-3 min sur sentiers)
- Côtes douces / circuit cardio-renfo
- Footing progressif (10 dernières min légèrement plus rapide)
```
**Gain** : −5 L DIVERSIFIER + −1 L RENFO = −6 L

---

### #A4.2 — Retirer "OBLIGATOIRE" — 4 cibles validées (pas 10)
**Lignes** : L2990 / L3429 / L3503 / L3540
**Garde-fou consolidé** :
- Coach ⚠️ : valide patches 1-5, 7-10 ; refuse #6 (RPE)
- PM ⚠️ : valide 4 cibles (L2990, L3429, L3503, L3540) ; refuse 6 (L3608/L3614/L3621 séances clé, L3722 renfo, L3547 RENFO bloc, L3587 PdP HYROX)
- **Intersection** : 4 cibles communes (PM plus restrictif)
**Diffs** :
```
L2990 : 🔴 DIVERSITÉ OBLIGATOIRE DES SÉANCES :  →  🔴 DIVERSITÉ DES SÉANCES :
L3429 : 📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :  →  📍 LIEU PAR SÉANCE :
L3503 : 🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES (OBLIGATOIRE) :  →  🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES :
L3540 : PROGRESSION SORTIE LONGUE (OBLIGATOIRE) :  →  PROGRESSION SORTIE LONGUE :
```
**Gain** : 0 L, −60 tokens (4 occurrences × ~15 tokens)

---

### #A4.3 — Retirer "JAMAIS" — 2 cibles validées (pas 4)
**Lignes** : L3510 + L3489
**Garde-fou consolidé** :
- Coach ⚠️ : valide L3510, L3389, L3032 (3 cibles)
- PM ⚠️ : valide L3510 + L3389 (2 cibles), REFUSE L3032 (NO_WEIGHT doctrine)
- **Intersection** : L3510 + L3489 (whitelist phases). L3389 PdP Remaining déjà aligné S19.
**Diffs** : appliquer whitelist sur L3510 + L3489 (formulations détaillées dans audit dev #A4.3).
**Gain** : 0 L, ~−40 tokens

---

### #A4.6 — Triple emphase VK (refus IMC)
**Lignes** : L3327 + L3329 (VK)
**Garde-fou consolidé** :
- Coach ❌ : challengé global (doctrine sécurité)
- PM ⚠️ : VK OK (L3327, L3329), IMC REFUSÉ (L2931, L2933)
- **Intersection** : conflit. Coach challenge global, PM accepte VK seul. → **DÉPLACÉ en V3** ou statu quo prudent.

---

### #A4.11 — Hyrox CATALOGUE "→ Phase X" — retirer 3 sur 5
**Lignes** : L3644–3675 (CATALOGUE 8 séances)
**Garde-fou consolidé** :
- Coach ✅ : valide retrait 5 sur 5
- PM ⚠️ : retirer 3 (séances 2-3-4), GARDER pour séance 1 (Simulation = phase spé) et séance 5 (Fartlek = dès S3+)
- **Intersection** : retrait des 3 séances 2-3-4 uniquement (PM plus restrictif)
**Gain** : −3 L (vs −5 L proposé)

---

### #A4.14 — Hyrox WELCOMEMESSAGE 8L → 5L (pas 4L)
**Lignes** : L3695–3702
**Garde-fou consolidé** :
- Coach ❌ : challengé global (garder roadmap)
- PM ⚠️ : OK condenser à 5 L MAX (pas 4), garder 1 bullet par phase
- **Intersection** : conflit. Coach refuse, PM accepte avec garde-fou. → **DÉPLACÉ en V3**.

---

### #A4.15 — Renfo Hyrox 3L → 2L (pas 1L)
**Lignes** : L3683 (3 L : `⚠️ Pour le RENFO ...`)
**Garde-fou consolidé** :
- Coach ⚠️ : condenser à 2 L max (garder anti-confusion stations)
- PM ⚠️ : 2 L max (2 messages : renfo=prévention course + PAS lien stations)
- **Intersection** : 2 L cible
**Diff** :
```
Avant (3L) : ⚠️ Pour le RENFO : le renforcement est du renfo classique de prévention des blessures liées à la course à pied (squats, fentes, gainage). NE PAS faire de lien avec les stations Hyrox (sled push, wall balls, sandbag lunges, etc.) — ce n'est pas l'objet de cette séance. Le renfo prépare le corps à supporter le volume de course, pas à exécuter les stations.

Après (2L) : ⚠️ Pour le RENFO : prévention blessures liées à la course (squats, fentes, gainage).
PAS de lien avec les stations Hyrox (sled push, wall balls, etc.) — c'est hors périmètre de cette séance.
```
**Gain** : −1 L

---

### #A4.40 — "Tu DOIS EN PREMIER AVANT" L2913 condensation
**Lignes** : L2913 (`buildSafetyInstructions`)
**Garde-fou consolidé** :
- Coach ⚠️ : garder "EN PREMIER", retirer "AVANT toute autre information"
- PM ⚠️ : garder "EN PREMIER" explicite
- **Intersection** : compromis aligné
**Diff** :
```
Avant : Dans le message de bienvenue (welcomeMessage), tu DOIS inclure EN PREMIER, AVANT toute autre information :
Après : Dans le welcomeMessage, tu DOIS inclure EN PREMIER (1ère ligne) :
```
**Gain** : 0 L, ~−15 tokens

---

### #A5.13 — Hyrox débutant Preview 10L → 7L (pas 6L)
**Lignes** : L3628–3635
**Garde-fou consolidé** :
- Coach ⚠️ : condenser à 7 L au lieu de 6 (garder marche autorisée + allure EA explicite)
- PM ⚠️ : 7 L (pas 6) en gardant `${paces?.eaPace}` + 4 bullets actuels
- **Intersection** : 7 L cible
**Gain** : −3 L (vs −4 L proposé)

---

### Synthèse V2 patches à appliquer (avec garde-fous)

| ID | Description | Gain L | Notes garde-fou |
|---|---|---|---|
| #A1.7 | PAS de seuil/frac/VMA | 0 | Statu quo verbose (les 2 refusent condensation) |
| #A1.8 | Max 1 SL condensation | 0 | Garder mot "JAMAIS" + critère identiques |
| #A1.11 | Mention Hyrox renfo (L3674 seul) | 0 | Supprimer L3674, GARDER L3680 |
| #A1.15 | COHÉRENCE 4L → 2L | −2 | Garder exemple chiffré |
| #A1.16 | SL → ${day} Preview seul | 0 | Garder Remaining tel quel |
| #A1.17 | VOLUME S1 condensation | 0 | Garder ±5% + "hors renfo" |
| #A2.1 | Fix data.distance legacy | 0 | Pré-requis: stats prod + canary 5 plans |
| #A2.2 | estimatedVMA fallback | 0 | Pré-requis: adapter test simultanément |
| #A3.R3 | Ultra 100km+ Option A | +2 | Ajout Remaining (pas suppression) |
| #A3.R4.a | RENFO PdP −5L (pas −7) | −5 | Garder 2 L Focus + pliométrie |
| #A3.R4.d | PROGRESSION SL PdP −3L | −3 | Garder 3 paliers + récup mention |
| #A3.R4 Rem | DIVERSIFIER PdP + RENFO | −6 | DIVERSIFIER → 4L, RENFO 0L |
| #A4.2 | OBLIGATOIRE 4 cibles | 0 | L2990, L3429, L3503, L3540 |
| #A4.3 | JAMAIS 2 cibles | 0 | L3510, L3489 (whitelist) |
| #A4.11 | Hyrox → Phase X (3 sur 5) | −3 | Garder séances 1+5 |
| #A4.15 | Renfo Hyrox 3L → 2L | −1 | Garder 2 messages |
| #A4.40 | DOIS EN PREMIER condensé | 0 | Garder "EN PREMIER" explicite |
| #A5.13 | Hyrox débutant 10L → 7L | −3 | Garder allure EA + marche |
| **Total V2** | **18 patches** | **−21 L (+2 ajout)** | **~−330 tokens** |

**Risque V2** : faible-moyen, garde-fous obligatoires.
**Tests obligatoires** : test-r2-matrice.mjs, test-r3-prompt-blocks.mjs, dump-12-plans-post-patch.mjs, audit 5 profils typés (5K conf, marathon deb, trail expert, PdP low VMA, Hyrox standard), + canary pour #A2.1.

---

## V3 — Conflits non résolus (Coach ≠ PM)

### #A1.18 — SL "plus longue + 30-40%" condensation
**Coach** : ❌ CHALLENGÉ — Pfitzinger LSD backbone, garder formulation intacte
**PM** : ⚠️ CONDITIONNEL — OK condenser MAIS GARDER "30-40%" explicite
**Recommandation** : suivre Coach (plus prudent). Si PM insiste, accepter condensation MINIMALE :
```
Avant : 🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume hebdo. Durée minimum SL : ${minSlDurForPrompt} min.
Après : 🔴 SL = séance la PLUS LONGUE, ~30-40% du volume hebdo, ≥${minSlDurForPrompt}min.
```
Gain potentiel : 0 L, −30 tokens.

---

### #A1.20 — "≤45min S1-S4 débutant" condensation
**Coach** : ❌ CHALLENGÉ — garder "les 4 PREMIÈRES semaines" pour pédagogie advice S5
**PM** : ⚠️ CONDITIONNEL — condenser OK, garder "Marche/Course ≤50 min"
**Recommandation** : suivre Coach (raison pédagogique tone advice). Statu quo.

---

### #A1.22 — "+10-15%/sem PdP" cible inversée
**Coach** : ⚠️ supprimer Preview L3537, garder Remaining L4413
**PM** : 🔄 RÉORIENTÉ — INVERSER : garder Preview L3537, alléger Remaining L4413
**Recommandation** : suivre PM (argument plus historique — Preview pédagogie tonalité, Remaining moins critique). Action : supprimer L4413 Remaining, conserver Preview L3537.

---

### #A3.R4.f — COHÉRENCE PdP condensation
**Coach** : ✅ VALIDÉ condensation 4L → 1L
**PM** : ❌ CHALLENGÉ — garder exemple chiffré (cf #A1.15 même argument)
**Recommandation** : suivre PM. Condensation 4L → 2L max avec exemple "duration=45min → ~5.6km" préservé.

---

### #A4.6 — Triple emphase VK/IMC
**Coach** : ❌ CHALLENGÉ global (doctrine sécurité)
**PM** : ⚠️ CONDITIONNEL — VK OK (L3327, L3329), IMC REFUSÉ (L2931, L2933)
**Recommandation** : suivre Coach (plus prudent — sécurité). Statu quo total.

---

### #A4.12 — PHASES Hyrox 5L → 4L
**Coach** : ❌ CHALLENGÉ — garder 5 L (AFFÛTAGE -40% unique)
**PM** : ✅ VALIDÉ — condensation préserve 4 phases
**Recommandation** : suivre Coach (argument doctrine Hyrox -40% spécifique). Statu quo 5 L.

---

### #A4.14 — Hyrox WELCOMEMESSAGE 8L → 4/5L
**Coach** : ❌ CHALLENGÉ — garder roadmap intacte (pédagogie 12 sem)
**PM** : ⚠️ CONDITIONNEL — 5 L max (pas 4) avec 1 bullet par phase
**Recommandation** : suivre Coach. Statu quo 8 L (la roadmap est valeur perçue forte pour Hyroxer).

---

### Synthèse V3 — Décision PM finale requise

| ID | Coach | PM | Reco arbitrage |
|---|---|---|---|
| #A1.18 | ❌ | ⚠️ | Suivre Coach (statu quo) ou condensation minimale |
| #A1.20 | ❌ | ⚠️ | Suivre Coach (statu quo) |
| #A1.22 | ⚠️ inv. | 🔄 inv. | Suivre PM : Preview garde, Remaining allège |
| #A3.R4.f | ✅ | ❌ | Suivre PM (4L→2L avec exemple) |
| #A4.6 | ❌ | ⚠️ partiel | Suivre Coach (statu quo total) |
| #A4.12 | ❌ | ✅ | Suivre Coach (statu quo 5L) |
| #A4.14 | ❌ | ⚠️ | Suivre Coach (statu quo 8L) |

**6 patches conflits réels** (#A1.18, #A1.20, #A1.22, #A3.R4.f, #A4.6, #A4.12, #A4.14 = 7 patches mais on aligne sur 6 actifs principaux ; #A1.22 nécessite décision claire entre Coach et PM sur direction).

---

## V4 — Refusés par les 2 reviewers (traçabilité)

### Patches activement refusés (Coach ❌ ET PM ❌)

- **#A1.7** : "PAS d'intensité" — Coach: fartlek ambigu / PM: bug Pierre. → Statu quo verbose.
- **#A1.8** : Max 1 SL condensé sans "JAMAIS" — Coach: garder verbose / PM: bug Lisa. → Garder verbose, OK condenser MAIS le mot "JAMAIS" reste.
- **#A1.15** : COHÉRENCE 1-liner — Coach: garder mainSet textuel / PM: bug Manon. → 2L max avec exemple.
- **#A1.23** : Récup -30% PdP — Coach: garder L3544+L4405 / PM: pédagogie advice non couverte code. → Statu quo.
- **#A2.3 (option A)** : enrichir prompt PdP avec weightLossSubGoal — Coach: hors scope / PM: doctrine "qualité avant vitesse". → REFUS.
- **#A2.4** : Suppression flag R3_PROMPT_DPLUS_ENABLED — Coach: conditionnel kill-switch / PM: garder kill-switch. → Garder.
- **#A2.5** : Refactor previewObjective — Coach: refus factorisation / PM: refus factorisation. → REFUS.
- **#A2.10** : Factorisation vmaSource Adaptation — refus factorisation × 2. → REFUS.
- **#A3.R1** : Refonte globale RÈGLES ABSOLUES 8L→5L — Coach: dilution emphase / PM: chaque ligne a une histoire. → Refus refonte holistique (patches individuels OK).
- **#A3.R4.b** : Suppression PROGRESSION VOLUME PdP 6L — Coach: doctrine PdP focus durée / PM: ranges 1h20-1h40 guidance. → Garder.
- **#A3.R4.c** : Suppression SIGNAUX D'ALERTE PdP 2L — Coach: déjà OK supprimer (V1)... — en fait Coach ✅, PM ❌. → DÉPLACER en V3.

  **Correction** : #A3.R4.c — Coach ✅ + PM ❌. **DÉPLACÉ en V3 conflit**.
  - PM dit `buildSafetyInstructions` met sécurité en welcomeMessage, pas en advice 1ère séance. Différent canal d'attention.
  - **Recommandation** : suivre PM (statu quo).

- **#A3.R5.b** : Factorisation NO_WEIGHT_MENTION — refus factorisation × 2.
- **#A3.R5.c** : Factorisation NO_CROSS_TRAINING — refus factorisation × 2.
- **#A3.R6.b** : Suppression légende SL ~58%/vall ~37% — Coach: cohérence advice/mainSet / PM: textuel non écrasé. → Garder.
- **#A4.1** : Triple 🚨🚨🚨 → 🚨 — Coach ✅ accepte, PM ❌ refuse (ancre visuelle max délibérée). → **DÉPLACER en V3 conflit**.

  **Correction** : #A4.1 — Coach ✅ + PM ❌. **DÉPLACÉ en V3 conflit** (4 → 7 patches V3 réels).
  - PM propose compromis : 🚨🚨 (2×) au lieu de 1×.
  - **Recommandation** : suivre PM (compromis 2× emoji).

- **#A4.5** : Refonte INSTRUCTIONS 7→5 — Coach: garder item "1. Génère SEULEMENT S1" / PM: items 1, 4, 7 essentiels. → Refus refonte globale. Patches granulaires OK uniquement.
- **#A4.10** : Factorisation HYROX_KEY_SESSION — refus factorisation × 2.
- **#A4.13** : ADVICE Hyrox 5→2 — Coach: variété pédagogique / PM: bug Hyrox 14 mai exemples uniformes. → Garder 5.
- **#A4.16** : Formule allure EF supprimée — Coach: exemple chiffré pédagogique / PM: bug Manon. → Garder.
- **#A4.19** : VMA Remaining doublon L4318 — Coach: garder repère psy / PM: garder source allures. → Garder.
- **#A4.24** : Template JSON neutralisé — Coach: garder commentaires orienteurs / PM: bug Plan/Séance générique. → Garder commentaires inline.
- **#A4.25** : `═══` → `###` — Coach: pas d'A/B test / PM: UX dev Romane impactée. → REFUS V1-V5. Reporté V8+.
- **#A4.31** : PdP overweight L3512 condensé — Coach: doctrine PdP plus stricte / PM: trou doctrine. → Garder.
- **#A4.38** : Header → systemInstruction — Coach: risque API / PM: changement routing hors scope. → REFUS V1-V6.
- **#A5.9** : Suppression branche hyroxFreq≥5 — Coach: athlète compétiteur légitime / PM: pas encore lancé com Hyrox. → Garder 8 L.

### Patches statu quo (28 "OK/RAS/hors scope" confirmés par les 2)

#A1.5, #A1.9, #A1.10, #A1.13, #A1.14, #A1.19, #A1.21, #A1.24, #A1.25, #A1.27, #A1.28, #A2.6, #A2.7, #A2.8, #A2.9, #A2.11, #A2.12, #A3.R7, #A4.4 (couvert), #A4.8, #A4.17, #A4.18, #A4.21, #A4.22, #A4.26, #A4.27, #A4.28, #A4.30, #A4.32, #A4.33, #A4.34, #A4.35, #A4.36, #A4.37, #A4.39, #A4.41, #A5.1, #A5.2, #A5.3, #A5.4, #A5.5, #A5.6, #A5.7, #A5.8, #A5.10, #A5.11, #A5.12.

### Synthèse V4 (refusés actifs)
**13 patches activement refusés** (après reclassement de #A3.R4.c et #A4.1 vers V3) — gains "non économisés" : ~−100 L. La doctrine "compromis + messages préventifs + chaque ligne justifiée" PRÉSERVE 100 L de prompt qui portent des acquis produit historiques (bugs Pierre/Lisa/Manon/Hyrox sled/Plan/Séance).

---

## V5 — Réorientations consolidées

### #A1.11 — Mention Hyrox renfo
**Dev voulait** : supprimer L3674 + L3680 (2 mentions Hyrox)
**Réorientation Coach/PM** : supprimer L3674 SEULEMENT, garder L3680 (cible spécifique bug Hyrox "Renfo Hyrox sled push")
**Diff corrigé** : voir V2 #A1.11

---

### #A1.15 — COHÉRENCE bloc 4L
**Dev voulait** : condenser à 1L
**Réorientation Coach/PM** : 2L max avec exemple chiffré "duration=45min → ~5.6km" préservé
**Diff corrigé** : voir V2 #A1.15

---

### #A1.16 — SL → ${day}
**Dev voulait** : condenser Preview + Remaining
**Réorientation PM** : Preview seul, garder Remaining L4353 tel quel
**Diff corrigé** : voir V2 #A1.16

---

### #A1.17 — VOLUME S1
**Dev voulait** : condensation simple
**Réorientation Coach + PM** : garder ±5% explicite ET mention "hors renfo"
**Diff corrigé** : voir V2 #A1.17

---

### #A1.18 — SL "plus longue + 30-40%"
**Dev voulait** : condensation 1L
**Réorientation Coach (refus) / PM (garder 30-40%)** : statu quo prudent OU condensation minimale
**Diff corrigé** : voir V3 #A1.18

---

### #A1.20 — Beginner ≤45min
**Dev voulait** : condensation "≤45min S1-S4 (sauf Marche/Course ≤50)"
**Réorientation Coach (refus) / PM (garder Marche/Course)** : statu quo (Coach insiste sur pédagogie temporelle advice S5)

---

### #A1.22 — PROGRESSION +15%/sem PdP
**Dev voulait** : supprimer Preview L3537
**Réorientation PM** : INVERSER — garder Preview L3537, alléger Remaining L4413
**Diff corrigé** :
```
Supprimer L4413 (Remaining), conserver L3537 (Preview pour pédagogie tonalité PdP).
```

---

### #A2.1 — Fix data.distance legacy
**Dev voulait** : appliquer le fix directement
**Réorientation Coach + PM** : appliquer AVEC pré-requis stats prod + canary 5 plans
**Diff corrigé** : voir V2 #A2.1

---

### #A2.2 — data.estimatedVMA fallback
**Dev voulait** : supprimer directement
**Réorientation PM** : supprimer + adapter `periodization.test.ts` L24 simultanément (test casserait sinon)
**Diff corrigé** : voir V2 #A2.2 + commit doit toucher 2 fichiers.

---

### #A3.R1 — Refonte globale RÈGLES ABSOLUES
**Dev voulait** : 8L → 5L rewrite massif
**Réorientation Coach + PM** : refus refonte. Patches individuels OK (#A1.16 SL, #A1.17 VOLUME, etc.). Conserver structure 8L + ═══ separators pour cette section.

---

### #A3.R3 — Asymétrie Ultra 100km+
**Dev voulait** : 3 options (A ajouter Remaining, B supprimer Preview, C statu quo)
**Réorientation Coach + PM** : Option A obligatoire (cohérence pédagogique cross-semaine)
**Diff corrigé** : voir V2 #A3.R3

---

### #A3.R4.a — RENFO PdP CADRAGE 7L
**Dev voulait** : supprimer 7L entièrement
**Réorientation Coach + PM** : supprimer 5L, GARDER 2L (Focus bas du corps + Pas pliométrie lourde)
**Diff corrigé** : voir V2 #A3.R4.a

---

### #A3.R4.d — PROGRESSION SL PdP 6L → 2L
**Dev voulait** : condenser à 2L
**Réorientation PM** : 3L (garder 3 paliers chiffrés + récup mention)
**Diff corrigé** : voir V2 #A3.R4.d

---

### #A3.R4.f — COHÉRENCE PdP 4L → 1L
**Dev voulait** : condenser à 1L
**Réorientation PM** : 2L avec exemple chiffré préservé (cf V3 conflit avec Coach)

---

### #A3.R4 Remaining — DIVERSIFIER 9L → 2L
**Dev voulait** : 2L (3 exemples)
**Réorientation Coach + PM** : 4L (1 ligne par format, 3 exemples concrets)
**Diff corrigé** : voir V2 #A3.R4 Remaining

---

### #A3.R6.b — Légende SL ~58%/vall ~37%
**Dev voulait** : supprimer
**Réorientation Coach + PM (PM 🔄)** : NE PAS supprimer (cohérence textuelle mainSet/advice non couverte code)

---

### #A4.1 — Triple 🚨🚨🚨
**Dev voulait** : 1 emoji
**Réorientation PM** : compromis 2 emojis (2× au lieu de 3×) — voir V3 conflit avec Coach (Coach valide 1×)

---

### #A4.2 — OBLIGATOIRE × 10 retraits
**Dev voulait** : retirer 10 occurrences
**Réorientation Coach + PM** : 4 cibles seulement (L2990, L3429, L3503, L3540) — PM plus restrictif
**Diff corrigé** : voir V2 #A4.2

---

### #A4.3 — JAMAIS condensation × 4
**Dev voulait** : 4 condensations
**Réorientation Coach + PM** : 2 cibles (L3510 + L3489), REFUS L3032 (doctrine #5 NO_WEIGHT)
**Diff corrigé** : voir V2 #A4.3

---

### #A4.5 — INSTRUCTIONS 7→5 items
**Dev voulait** : refonte globale
**Réorientation Coach + PM** : refus refonte. Patches granulaires OK (couverts par #A1.11 + #A1.12 + #A1.15).

---

### #A4.6 — Triple emphase VK/IMC
**Dev voulait** : retirer 1 niveau d'emphase batch
**Réorientation PM** : VK OK, IMC REFUSÉ (cf V3 conflit avec Coach)

---

### #A4.11 — Hyrox CATALOGUE "→ Phase X" × 5
**Dev voulait** : retirer 5
**Réorientation PM** : retirer 3 (séances 2-3-4), GARDER séances 1 (Simulation) + 5 (Fartlek)
**Diff corrigé** : voir V2 #A4.11

---

### #A4.13 — ADVICE Hyrox 5→2
**Dev voulait** : 2 exemples
**Réorientation Coach + PM** : garder 5 (variété pédagogique). Si gain absolument nécessaire : condenser SL+Séance clé en 1L chacun (gain −2L au lieu de −5L).

---

### #A4.14 — WELCOMEMESSAGE Hyrox 8L → 4L
**Dev voulait** : 4L
**Réorientation PM** : 5L max (Coach refuse, cf V3 conflit)

---

### #A4.15 — Renfo Hyrox 3L → 1L
**Dev voulait** : 1L
**Réorientation Coach + PM** : 2L (garder 2 messages : prévention course + PAS lien stations)
**Diff corrigé** : voir V2 #A4.15

---

### #A4.16 — Formule allure EF embarquée
**Dev voulait** : supprimer
**Réorientation Coach + PM** : garder. Si simplification : utiliser `paces.efPace` au lieu de re-calcul JS (Coach propose).

---

### #A4.24 — Template JSON commentaires neutralisés
**Dev voulait** : tout neutraliser (16 L)
**Réorientation Coach + PM** : neutraliser SEULEMENT triviaux ("string", "Type"), garder orienteurs ("titre unique", "lieu réel adapté"). Gain : −8L au lieu de −16L.

---

### #A4.40 — DOIS EN PREMIER AVANT
**Dev voulait** : condensation "Welcome (1ère ligne, avant tout)"
**Réorientation Coach + PM** : garder "EN PREMIER" explicite (sécurité welcomeMessage 1ère ligne)
**Diff corrigé** : voir V2 #A4.40

---

### #A5.13 — Hyrox débutant 10L → 6L
**Dev voulait** : 6L
**Réorientation Coach + PM** : 7L (garder `${paces?.eaPace}` explicite + marche autorisée)
**Diff corrigé** : voir V2 #A5.13

---

### Synthèse V5
**27 réorientations** documentées (dev a visé la mauvaise ligne ou la mauvaise formulation, ou a sous-estimé l'impact pédagogique/historique). La majorité des patches V2 sont en réalité des V5 (réorientation) avec garde-fous → comptabilisation croisée.

---

## Récap final

| Catégorie | Patches | Lignes économisées | Tokens économisés | Risque |
|---|---|---|---|---|
| V1 (intersection stricte) | 13 actifs + 3 statu quo | −14 L | −125 | nul |
| V2 (conditionnels garde-fous) | 18 | −21 L (+2 ajout) | −330 | faible-moyen |
| V3 (conflits arbitrage PM) | 7 | 0 à −10 L (selon arbitrage) | 0 à −150 | variable |
| V4 (refusés actifs) | 13 | (refusés) | (refusés) | n/a |
| V4 (statu quo "OK/hors scope") | 47 | 0 | 0 | nul |
| V5 (réorientations) | 27 (croisés V2) | (intégrés V2) | (intégrés V2) | n/a |
| **TOTAL** | **112** | **−35 à −45 L** | **−455 à −605 tokens** | mixte |

**Comparaison vs audit dev senior** :
- Dev annonçait −139 L et −2950 tokens.
- Coach + PM consolidé : **−35 à −45 L et −455 à −605 tokens** (~30% du dev).
- Le delta (−95 L "non économisés") = **PROTECTION doctrine** historique (bugs Pierre/Lisa/Manon/Hyrox/Adrien) + factorisation refusée + emphases sécurité préservées.

**Sur 1500 plans/mois** : économie réaliste consolidée ~700K à 900K tokens/mois (vs 6M dev). Le vrai gain reste la **qualité préservée**, pas l'économie monétaire.

---

## Pré-requis d'application

### V1 — combiner avec reliquats J2 en attente
Reliquats J2 mentionnés dans l'audit dev : S2, S4, S5, S6, S15, S16, S17, S18, S19, S20 — à inclure dans le même commit "Cleanup J2+J3 SAFE".

### V2 — tests obligatoires avant push
- `test-r2-matrice.mjs` (faisabilité gates)
- `test-r2-coach-6.mjs` (6 cas critiques)
- `test-r3-prompt-blocks.mjs` (D+ trail)
- `test-feasibility-massive.mjs`
- `dump-12-plans-post-patch.mjs` (audit visuel 12 plans)
- Vérification 5 profils typés via `evaluate-plan.mjs`
- Pour #A2.1 : statistiques prod (IMC 25-30 + long-distance) + canary 5 plans

### V3 — décision Romane (PM finale) requise par patch
Sept arbitrages explicites listés ci-dessus.

### Doctrine vérifiée respectée (intersection Coach + PM)
- Sécurité > conversion : `buildSafetyInstructions` quasi-intouchée (seul fix #A2.1 legacy avec garde-fou)
- Pas de poids/IMC dans message user : règle préservée 5× (refus factorisation + refus condensation L3032)
- Course exclusivement : `NO_CROSS_TRAINING` préservée 3×
- Mode marche-course = débutants uniquement : conditions intactes
- Pas de nutrition chiffrée : `NUTRITION_SL_BLOCK` préservé
- "Perte de poids" OK dans titre : `buildPlanName` L1941 préservé
- X séances/sem inclut 1 renfo : règle L3722 INSTRUCTION 5 conservée
- Inputs client = obligatoires : allures/dates jamais touchées
- Chaque ligne justifiée : 25 lignes refusées V4 avec justification historique
- Compromis + messages préventifs : préféré au minimalisme dev (V3+V4)

---

**Fin V1 J3 consolidé — Reviewer: dev senior (Claude Opus 4.7) après intersection Coach + PM.**
