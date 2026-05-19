# Review COACH expert J3 — 112 patches audit dev senior
Date: 2026-05-17 | Reviewer: coach expert course à pied (20 ans, UTMB Academy + Pfitzinger/Daniels + spécialiste running santé)
Source code vérifié: `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` (5677 L post J2)
Audit dev senior: `/Users/romanemarino/Coach-Running-IA/AUDIT-DEV-SENIOR-J3-COMPLET.md` (1629 L, 112 patches)

---

## Synthèse exec

- **✅ VALIDÉS** : 56 / 112 (50%) — patches sains, économie nette sans perte pédagogique
- **⚠️ CONDITIONNELS** : 31 / 112 (28%) — applicables sous garde-fous explicites
- **❌ CHALLENGÉS** : 17 / 112 (15%) — refus motivé par doctrine pédagogie/sécurité
- **🔄 RÉORIENTÉS** : 8 / 112 (7%) — patch mal ciblé, voici la bonne formulation

**Économie tokens consolidée coach** : ~1800-2200 tokens/preview (vs 2950 annoncés par dev), ~150-250 tokens/batch remaining (vs 250) → **~3000-3500 tokens/plan total** (vs 4000 dev). La doctrine pédagogique exige de conserver certains garde-fous que le code post-process ne couvre PAS sur 100% des cas (notamment welcome message, advice, intent pédagogique).

**Principe coach fondamental** : un patch qui supprime une règle prompt sous prétexte que `enforceWeekConstraints` la couvre côté code IGNORE que le prompt sert AUSSI à orienter `welcomeMessage`, `advice`, `intent` séance et titre. Le code force la STRUCTURE (durées, distances, jours), pas le DISCOURS pédagogique de Gemini envers l'utilisateur. Tout patch qui supprime une règle prompt sans vérifier l'impact sur le narratif coach = risque.

---

## Trous pédagogiques détectés (récap critique)

Patches CHALLENGÉS qui auraient cassé la pédagogie ou la sécurité s'ils étaient appliqués sans réflexion :

1. **❌ #A1.7 (condenser "PAS de seuil/frac/VMA" en "PAS d'intensité")** : "intensité" est ambigu pour Gemini — il peut générer du fartlek doux qu'il considère "non-intense". La formulation explicite "PAS de seuil, PAS de fractionné, PAS de VMA" verrouille les 3 zones d'intensité Daniels. RISQUE : Gemini glisse du fartlek/intervalle en fondamental, le code post-process L684-700 catches "seuil|fractionn|vma|intervalle|tempo" mais loupe "fartlek" si le titre dit juste "Footing dynamique". Garder la liste explicite.

2. **❌ #A4.25 (séparateurs ═══ → ###)** : Gemini 2.5-flash a un attention pattern documenté sur les séparateurs visuels. Les `═══` augmentent le poids attentionnel sur les blocs RÈGLES ABSOLUES + sécurité. Passer en `###` markdown dilue ces blocs au même niveau que les sections cosmétiques (PROFIL, FORMAT JSON). Patch dangereux pour économiser 700 tokens. Tests J1 (110 plans) ne valident PAS cette migration — aucun A/B fait.

3. **❌ #A3.R4.b (supprimer PROGRESSION VOLUME PdP)** : la règle prompt n'est PAS strictement redondante avec `enforceFullPlanConstraints` (qui force +15% max). Le bloc L3533-3538 donne à Gemini les volumes textuels EN MINUTES ("1h00-1h20") qu'il utilise pour rédiger les `mainSet`, `welcomeMessage` et `advice` qui parlent à l'utilisateur en cohérence. Sans ce bloc, Gemini parle en distances (km) alors que la doctrine PdP = focus DURÉE (lipolyse). Risque sémantique.

4. **❌ #A3.R4.a (supprimer RENFORCEMENT CADRAGE PdP entièrement)** : `buildRenfoMainSet` écrase bien `title/mainSet/warmup/cooldown/duration`, MAIS l'`advice` reste écrit par Gemini. Sans le cadrage "exercices poids de corps uniquement, PAS de pliométrie lourde", Gemini peut produire un advice qui parle de box jumps ou burpees → contradiction avec le contenu effectif (squats/fentes). Garder 2 lignes minimum dans le prompt pour cohérence advice.

5. **❌ #A5.9 (supprimer branche hyroxFreq>=5)** : "0 cas en prod J1" ne veut pas dire "0 cas demain". L'app vise grand public + athlètes compétiteurs. Un athlète Hyrox élite avec fréquence 5+ est légitime. Supprimer la branche = générer un plan dégradé (fallback hyroxFreq=4 ne distribue PAS le volume 35-50 km correctement). Coût de garder : 8 L. Bénéfice doctrine : pédagogie respectée si un Hyroxer compétiteur arrive demain.

6. **❌ #A4.2 patch 6 (EFFORT PERÇU OBLIGATOIRE → EFFORT PERÇU)** : retirer "OBLIGATOIRE" sur cette règle = Gemini cesse d'inclure systématiquement le RPE dans les mainSet. Or RPE = pierre angulaire de la pédagogie PdP/débutant (substitut de la VMA chez profils non-chronométrés). Garder l'emphase.

7. **❌ #A1.20 (condenser ≤45min beginner)** : la formulation actuelle "les 4 PREMIÈRES semaines" est pédagogique (transition progressive). La condenser en "≤45min S1-S4" perd la nuance temporelle pour Gemini quand il rédige l'`advice` de la S5 ("tu peux maintenant aller au-delà"). À garder.

8. **❌ #A4.13 (Hyrox ADVICE 5 exemples → 2)** : les 5 exemples couvrent 5 types de séances DIFFÉRENTS (Footing, Renfo, SL, MC, Séance clé). Réduire à 2 = perte de guidance Gemini sur 3 types restants → advice répétitifs ou hors-sujet. Coût : 5 L. Bénéfice doctrine : variété pédagogique préservée.

9. **❌ #A3.R6.b (supprimer légende "SL ~58%" Remaining)** : le code `distributeElevationToSessions` écrase bien les chiffres MAIS Gemini doit savoir COMMENT distribuer pour cohérence avec mainSet/advice. Si Gemini met "200m de D+ sur ce footing" alors que le code force à 0, l'advice/mainSet textuel devient incohérent.

10. **❌ #A3.R1 patch global RÈGLES ABSOLUES (8 L → 5 L)** : la formulation "🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨" est intentionnellement maximaliste. C'est l'unique zone du prompt où l'on tape sur la salience à fond car ces règles sont les 6 NON-NÉGOCIABLES (fréquence, jours, SL, total, volume, plus longue). Réduire l'emphase = Gemini les traite comme du contexte normal. Le 8L→5L proposé condense aussi la SL en 1 ligne ("séance la plus longue, ≥${min}min") perdant le "30-40% du volume" qui guide Gemini sur la PROPORTION (non couverte 100% par code car `enforceWeekConstraints` n'ajuste que si runningSessions.length > 1).

11. **❌ #A4.5 INSTRUCTIONS 7 → 5 items** : le patch propose de supprimer "1. Génère SEULEMENT la semaine 1" et "4. Évaluation faisabilité HONNÊTE". Or "1." est CRITIQUE pour le preview (sinon Gemini génère 12 semaines, latence +20s + tokens 5×) — la règle existe parce qu'observée à de multiples reprises avant patch S5 J2. La règle "4. Évaluation HONNÊTE" sert à orienter le `welcomeMessage` même si le feasibility.message est écrasé.

12. **❌ #A4.31 (PdP overweight L3512 condensé)** : la doctrine PdP overweight est PLUS STRICTE que `buildSafetyInstructions` IMC 30-35 (qui dit juste "Pas de sauts/pliométrie"). Le bloc PdP interdit en plus "fractionné, fartlek, côtes, haute intensité". Condenser en "intensité limitée (cf. règles surpoids globales)" = perte stricte d'interdictions spécifiques PdP. Cas typique : femme 60 ans, IMC 32, VMA 9 → si on perd cette ligne, Gemini peut générer un fartlek "doux" qui aggrave les douleurs articulaires.

13. **❌ #A4.16 (formule allure EF embarquée)** : la formule explicite L3729 sert à montrer à Gemini un EXEMPLE NUMÉRIQUE concret (45 min × 5.6 km/h = 5.6 km). C'est un patron pédagogique pour qu'il fasse de même sur ses propres séances. Supprimer ou remplacer par paces.efPace = perd l'exemple chiffré → Gemini revient à inventer des distances incohérentes.

14. **❌ #A4.14 (Hyrox WELCOMEMESSAGE roadmap 8L → 4L)** : la roadmap S1-3 / S4-6 / S7+ / Affûtage est PÉDAGOGIQUE pour donner une perspective à l'utilisateur dès la S1. La condenser en 1 ligne perd la rythmique des phases. Doctrine Hyrox : l'athlète doit visualiser sa progression sur 12 semaines pour adhérer.

15. **❌ #A1.18 (condenser SL "plus longue + 30-40% + min minutes" en 1 ligne)** : le "30-40% du volume hebdo" est CLÉ pour la pédagogie Pfitzinger (LSD = backbone marathon training). Le code force min duration MAIS pas la proportion sur tous les profils (#1c L1338-1410 seulement si runningSessions > 1 AND proportion rule existe). Supprimer = Gemini peut générer SL = 45min sur 4 séances × 60min = 25% du volume → sous-stimulation.

16. **❌ #A4.6 (Triple emphase VMA TRÈS RÉDUITE / MAXIMALES → simple)** : ces emphases sont les blocs SÉCURITÉ pour IMC ≥35, VK volume réduit, etc. Diluer l'emphase sur ces zones DOCTRINE risque sécurité = Gemini les traite comme info contextuelle normale.

17. **❌ #A4.12 (PHASES Hyrox 5L → 4L)** : la phase AFFÛTAGE Hyrox -40% volume + rappels d'allure courts est UNIQUE Hyrox (vs affutage standard -25%). La condenser perd cette spécificité pédagogique.

---

## Détail par patch

### Axe 1 — Règles prompt couvertes par code post-process

### #A1.1 — Override total de `plan.name` par `buildPlanName`
**Lignes vérifiées** : L3747 (prompt JSON template) + L4009 (`plan.name = buildPlanName(...)`) + L1938-1962 (fonction `buildPlanName` lue intégralement).
**Constat technique** : `buildPlanName` ÉCRASE 100% du temps. Logique propre : 6 branches (Perte, Maintien/Remise, Trail, Hyrox, subGoal, fallback) avec format `formatTargetTime`.
**Verdict coach** : ✅ VALIDÉ.
**Pédagogie/Sécurité** : nulle (le name n'est pas pédagogique, c'est cosmétique).
**Trou potentiel** : 0 — le name est utilisé seulement pour affichage.
**Note** : le patch dev propose `"name": "ignored, overwritten"` ce qui PERT la lisibilité du template TS pour les futurs devs. Préférer un commentaire JSON-safe : `"name": "rempli par buildPlanName()"`.

---

### #A1.2 — Override total `plan.feasibility`
**Lignes vérifiées** : L3760-3764 (template) + L4043-4050 (écrasement par `feasibilityResultPreview`) + L3374-3393 (calcul `calculateFeasibility`).
**Constat technique** : 4 champs (status, message, safetyWarning, recommendation) écrasés systématiquement L4044-4048. Confirmé : Gemini's output jeté.
**Verdict coach** : ✅ VALIDÉ avec garde-fou : conserver la structure JSON dans le template (Gemini doit produire le champ pour respecter le schéma sinon parse erreur potentielle sur certains profils edge). Remplacer le contenu par valeurs neutres.
**Pédagogie/Sécurité** : 0 — la pédagogie feasibility est entièrement portée par `calculateFeasibility` côté code.
**Trou potentiel** : faible. Risque schéma JSON si Gemini retourne `null` ou champ manquant. Garder le template avec `"status": "rempli code"` etc.

---

### #A1.3 — Override `plan.confidenceScore`
**Lignes vérifiées** : L3759 (`"confidenceScore": 75`) + L4050 (override).
**Constat technique** : confirmé déterministe.
**Verdict coach** : ✅ VALIDÉ.
**Pédagogie/Sécurité** : nul.
**Trou potentiel** : 0.

---

### #A1.4 — Override `plan.distance` Trail
**Lignes vérifiées** : L3753 (template inline) + L3805-3807 (écrasement post-parse).
**Constat technique** : redondance pure. L3805 ré-écrit avec EXACTEMENT la même expression que le template.
**Verdict coach** : ✅ VALIDÉ (cleanup cosmétique).
**Pédagogie/Sécurité** : 0.
**Trou potentiel** : 0.

---

### #A1.5 — "EXACTEMENT N séances"
**Lignes vérifiées** : L3460 (Preview) + L4482 (Remaining) + L3905 + L4576 (slice).
**Constat technique** : `slice(0, frequency)` cap PAR LE HAUT uniquement. Si Gemini sous-génère (frequency=4 mais retourne 3 séances), le code ne complète PAS. La règle prompt est donc essentielle pour le BOTTOM.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — comme dev recommande).
**Pédagogie/Sécurité** : haute. Sous-génération = utilisateur frustré.
**Trou potentiel** : élevé si supprimé (asymétrie code).

---

### #A1.6 — `elevationGain` OBLIGATOIRE chaque séance
**Lignes vérifiées** : L3127 (buildDplusPromptBlock remaining) + L4225/L4240 références dev + L4030-4040 (stripElevation preview) + L4677-4685 (stripElevation remaining) + L1983-2122 (distributeElevation).
**Constat technique** : double couverture code (force=0 non-trail, redistribute trail). MAIS L3127 reste utile car sans la mention `elevationGain` Flash met le D+ en texte libre dans mainSet sans remplir le champ structuré (déjà documenté L3058-3059).
**Verdict coach** : ✅ VALIDÉ (statu quo — déjà patché S3 J2 selon dev).
**Pédagogie/Sécurité** : 0 (cosmétique JSON structure).
**Trou potentiel** : 0.

---

### #A1.7 — "PAS de seuil/fractionné/VMA" en phase fondamentale
**Lignes vérifiées** : L3480 (Preview) + L4370 (Remaining) + L682-700 (postProcessWeekQuality safety net).
**Constat technique** : le code L688 catches `/seuil|fractionn|vma|intervalle|tempo/i.test(title)` mais NE catches PAS "fartlek". Or "fartlek" est explicitement listé comme intensité dans la doctrine Daniels.
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : élevée. La règle explicite verrouille les 3 zones d'intensité Daniels (seuil, fractionné court, VMA). La condenser en "PAS d'intensité" est ambigu (Gemini interprète fartlek comme "intensité douce" = autorisé). Garder la liste explicite.
**Trou potentiel** : moyen. Cas typique : débutant 5K en S2, Gemini génère "Footing fartlek découverte" en phase fondamentale → le code post-process loupe (titre ne contient pas "seuil/fractionn/vma") → séance d'intensité en S2 sur un débutant.
**Si CHALLENGÉ** : garder la formulation actuelle. Si économie tokens souhaitée, ajouter "fartlek" à la regex L688 du code AVANT de toucher au prompt.

---

### #A1.8 — "MAX 1 SL par semaine"
**Lignes vérifiées** : L2993 (buildSafetyInstructions) + L794-844 (postProcess dédup SL) + L946-961 (enforceSLDay dédup).
**Constat technique** : double garde-fou code. La règle prompt sert à éviter le re-work + cohérence advice.
**Verdict coach** : ✅ VALIDÉ (condensation OK : "Max 1 SL/sem, sauf PdP : 2 max").
**Pédagogie/Sécurité** : faible. Le code couvre 100%.
**Trou potentiel** : faible. Garder la mention "sauf PdP : 2 max" pour cohérence advice PdP.

---

### #A1.9 — "JAMAIS 2 séances longues consécutives"
**Lignes vérifiées** : L847-875 (postProcess back-to-back conversion).
**Constat technique** : entièrement géré côté code. Pas de mention prompt directe.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — hors scope).
**Pédagogie/Sécurité** : couverte code.
**Trou potentiel** : 0.

---

### #A1.10 — ZERO D+ track/recovery
**Lignes vérifiées** : L3114 (preview prompt) + L1450-1483 (enforceWeekConstraints sanitize) + L2005-2007 (distribute).
**Constat technique** : couverture code totale + 1 ligne prompt utile pédagogiquement.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — 1 L utile).
**Pédagogie/Sécurité** : faible.
**Trou potentiel** : 0.

---

### #A1.11 — "NE PAS générer le contenu du mainSet renfo"
**Lignes vérifiées** : L3726 (Preview) + L4360 (Remaining) + L3674 (Hyrox Preview) + L3680 (Hyrox Preview "le titre du renfo est généré séparément") + L3941+L4590 (buildRenfoMainSet appel).
**Constat technique** : `buildRenfoMainSet` (renfoService L336+) écrase title+mainSet+warmup+cooldown+duration. Mais l'`advice` reste à Gemini.
**Verdict coach** : ⚠️ CONDITIONNEL — supprimer les 2 redondances Hyrox L3674 et L3680 OK mais GARDER L3726 ET L4360 (le code couvre la STRUCTURE mais pas l'advice — Gemini doit savoir qu'il ne doit pas écrire le contenu détaillé pour générer un advice cohérent).
**Pédagogie/Sécurité** : faible si on garde 1 mention/contexte.
**Trou potentiel** : faible.
**Si CONDITIONNEL** : conserver L3726 + L4360, supprimer L3674 + L3680.

---

### #A1.12 — Cap durée Renfo 30-45 min
**Lignes vérifiées** : L3723 (preview INSTRUCTIONS bullet) + buildRenfoMainSet duration écrasement.
**Constat technique** : `buildRenfoMainSet` retourne sa propre `duration` qui écrase celle de Gemini L3956. Bullet purement informatif.
**Verdict coach** : ✅ VALIDÉ.
**Pédagogie/Sécurité** : nul.
**Trou potentiel** : 0.

---

### #A1.13 — "Type dans le JSON : Renforcement"
**Lignes vérifiées** : L3724 + L3940 (aiguillage `if (session.type === 'Renforcement')`).
**Constat technique** : règle NÉCESSAIRE pour l'aiguillage code. Sans le type correct, `buildRenfoMainSet` n'est pas appelé.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER).
**Pédagogie/Sécurité** : haute (sans cette règle, le renfo entier disparaît).
**Trou potentiel** : élevé si supprimé.

---

### #A1.14 — "NE PAS mettre Repos dans le plan"
**Lignes vérifiées** : L3725 + L1645 (`s.type = 'Repos'` code injection).
**Constat technique** : Gemini ne doit pas en mettre, le code en met si nécessaire (avg<3.5km).
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — 1 L utile).
**Pédagogie/Sécurité** : moyenne (sinon doublon Repos).
**Trou potentiel** : faible.

---

### #A1.15 — "COHÉRENCE DURÉE/DISTANCE/MAINSET" 3L
**Lignes vérifiées** : L3727-3730 + L595-636 (recalculateSessionDistance).
**Constat technique** : `recalculateSessionDistance` écrase distance si écart >10%, MAIS le texte du mainSet reste libre (le code ne corrige PAS "1h20 de course" si duration="45 min" — c'est cosmétique). La règle prompt est l'unique garde-fou sur le mainSet TEXTUEL.
**Verdict coach** : ⚠️ CONDITIONNEL — condenser oui mais GARDER la mention "mainSet textuel doit décrire la même durée" car c'est NON couvert par code.
**Pédagogie/Sécurité** : moyenne. Cas utilisateur : voit "45 min" en durée et lit "1h20 de course" dans le mainSet → confusion.
**Si CONDITIONNEL** : `COHÉRENCE : duration et mainSet textuel doivent décrire la MÊME durée (distance recalculée auto si écart >10%).`

---

### #A1.16 — "SL le ${longRunDay}"
**Lignes vérifiées** : L3462 (Preview) + L4353 (Remaining) + L935-978 (enforceSLDay).
**Constat technique** : swap automatique 100% du temps. Règle prompt sert juste à minimiser le re-work.
**Verdict coach** : ✅ VALIDÉ (condensation OK).
**Pédagogie/Sécurité** : nulle.
**Trou potentiel** : 0.

---

### #A1.17 — "VOLUME S1 ${X} km CIBLE BILATÉRALE ±5%"
**Lignes vérifiées** : L3464 + L1542-1601 (enforceWeekConstraints scale up/down).
**Constat technique** : le code applique ±10% tolérance (vs ±5% prompt). Le prompt plus strict que le code = OK (Gemini vise plus serré, le code laisse passer la dérive).
**Verdict coach** : ⚠️ CONDITIONNEL — condenser OK mais GARDER le rappel "somme des distances course" car Gemini compte parfois renfo dans le volume (bug observé).
**Pédagogie/Sécurité** : faible.
**Si CONDITIONNEL** : `🔴 Volume S1 ≈ ${X}km (somme des distances course, hors renfo).`

---

### #A1.18 — "SL plus longue + 30-40% volume + min minutes"
**Lignes vérifiées** : L3465 + L1338-1410 (MIN_SL_PROPORTION + MIN_SL_DURATION_MIN + L1413-1426 must be longest) + L1056-1087 (rules).
**Constat technique** : 3 sous-règles déterministes appliquées. MAIS le code L1354 a un GARDE `if (slSession && runningSessions.length > 1)`. Si frequency=2 (1 SL + 1 renfo, donc 1 running), la règle proportion ne s'applique PAS côté code.
**Verdict coach** : ❌ CHALLENGÉ. Garder la formulation actuelle.
**Pédagogie/Sécurité** : haute (LSD = backbone Pfitzinger marathon).
**Trou potentiel** : moyen. Si supprimé, sur frequency=2 (cas plan PdP) le ratio 30-40% n'est plus pédagogié à Gemini.
**Si CHALLENGÉ** : conserver L3465 intacte. Si condensation absolument souhaitée, retirer juste "représenter 30-40% du volume hebdo" en gardant "séance la plus longue ≥X min".

---

### #A1.19 — "max 2 séances intenses/semaine" (PdP)
**Lignes vérifiées** : L3517 (PdP Preview) + L4395 (PdP Remaining) + L1500-1517 (enforceWeekConstraints max 2 hard).
**Constat technique** : PdP plus strict (1 max) vs code global (2 max). Pas redondant.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER).
**Pédagogie/Sécurité** : haute.
**Trou potentiel** : élevé si supprimé.

---

### #A1.20 — "≤45min S1-S4 débutant"
**Lignes vérifiées** : L3003 (buildSafetyInstructions) + L1023 (MAX_SL_DURATION deb 5K = 50) + L1322-1336 (cap non-SL 75% maxSlDur).
**Constat technique** : code cap dur. MAIS prompt mentionne "les 4 PREMIÈRES semaines" → pédagogie temporelle (Gemini écrit l'advice en S5 "tu peux maintenant aller au-delà").
**Verdict coach** : ❌ CHALLENGÉ. Garder la formulation pédagogique temporelle.
**Pédagogie/Sécurité** : moyenne (advice tone).
**Trou potentiel** : faible mais réel. Condenser perdrait la nuance "les 4 premières semaines" → Gemini ne saura plus quand "relâcher" l'advice.

---

### #A1.21 — Mapping Running → type
**Lignes vérifiées** : L665-680 (postProcess retype).
**Constat technique** : entièrement code, pas de prompt.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — hors scope).
**Trou potentiel** : 0.

---

### #A1.22 — "+10-15%/semaine PdP"
**Lignes vérifiées** : L3537 (Preview) + L4413 (Remaining) + L1869-1904 (enforceFullPlanConstraints +15% smoothing).
**Constat technique** : code applique +15% max. Règle prompt PdP +10-15% est cohérente.
**Verdict coach** : ⚠️ CONDITIONNEL. Supprimer L3537 OK car explicitement redondant. GARDER L4413 (le code remaining n'a pas le bloc PdP du preview).
**Pédagogie/Sécurité** : faible.
**Si CONDITIONNEL** : supprimer L3537 uniquement.

---

### #A1.23 — Drop -30% récupération PdP
**Lignes vérifiées** : L3544 + L4405 + L2655-2659 (calculatePeriodizationPlan recoveryFactor 0.78-0.80).
**Constat technique** : DIVERGENCE prompt (-30%) vs code (-20%). MAIS comme Gemini reçoit `weeklyVolumes[i]` DÉJÀ post-réduction, la règle prompt est inopérante — confirmé en lisant L2655-2659.
**Verdict coach** : ✅ VALIDÉ.
**Pédagogie/Sécurité** : nulle (Gemini reçoit le volume cible final).
**Trou potentiel** : 0.

---

### #A1.24 — MIN 48h entre 2 qualités
**Lignes vérifiées** : prompt absent en génération initiale, présent dans ADAPTATION L5084.
**Constat technique** : pas un cas Axe 1 (règle absente prompt génération).
**Verdict coach** : ✅ VALIDÉ (RAS — hors scope).
**Trou potentiel** : 0.

---

### #A1.25 — "Jours préférés EXCLUSIVEMENT"
**Lignes vérifiées** : L3461 + L4483 + L3873-3881 / L4546-4553 (force day).
**Constat technique** : code écrase. Règle prompt utile pour orienter génération initiale.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — 1 L utile).
**Trou potentiel** : 0.

---

### #A1.26 — Bloc FAISABILITÉ PRÉ-CALCULÉE (3L)
**Lignes vérifiées** : L3737-3739 + L4044-4050 (override).
**Constat technique** : déjà partiellement #S13 J2.
**Verdict coach** : ✅ VALIDÉ (à appliquer si pas encore fait).
**Trou potentiel** : 0.

---

### #A1.27 — `MAX_WEEKLY_VOLUME` cap absolu
**Lignes vérifiées** : L1519-1540 + pas de prompt.
**Verdict coach** : ✅ VALIDÉ (RAS — pas de cas redondance).
**Trou potentiel** : 0.

---

### #A1.28 — Force `intensity` values
**Lignes vérifiées** : L3777 (JSON template).
**Constat technique** : utile pour schéma JSON.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER).
**Trou potentiel** : 0.

---

### Axe 2 — Lignes mortes statiques

### #A2.1 — `data.distance` legacy dans buildSafetyInstructions L2958
**Lignes vérifiées** : L2958 (vérifié en lecture) + types.ts à grepper.
**Constat technique** : champ `data.distance` et `data.trailDistance` n'existent pas dans `QuestionnaireData` selon dev. Condition L2958 = TOUJOURS FALSE → branche L2960-2967 jamais atteinte.
**Verdict coach** : ⚠️ CONDITIONNEL — PM décide.
**Pédagogie/Sécurité** : OUVERTURE d'une branche safety dormante (IMC 25-30 + longue distance → recommandations chaussures+surfaces souples). Pédagogiquement légitime.
**Trou potentiel** : moyen (active un message qui n'était jamais envoyé — peut surprendre PM si pas anticipé).
**Si CONDITIONNEL** : appliquer le fix `data.distance` → `data.subGoal` + valider avec Romane via canary 5 plans avant déploiement large.

---

### #A2.2 — `data.estimatedVMA` fallback inutile L1162
**Lignes vérifiées** : L1162 + grep `data.estimatedVMA` (jamais set selon dev).
**Constat technique** : vérifié en lecture L1162, le fallback `|| data.estimatedVMA` est mort code.
**Verdict coach** : ✅ VALIDÉ (cleanup code propre).
**Trou potentiel** : 0.

---

### #A2.3 — `data.weightLossSubGoal` / `data.weeklyTimeAvailable` jamais utilisés
**Lignes vérifiées** : grep zéro résultat dans geminiService.ts.
**Verdict coach** : ⚠️ CONDITIONNEL — PM décide d'enrichir prompt PdP ou pas.
**Pédagogie/Sécurité** : enrichissement potentiel pédagogie PdP.
**Si CONDITIONNEL** : Option A (ajouter +1L PdP) recommandée si PM veut personnaliser plus.

---

### #A2.4 — `R3_PROMPT_DPLUS_ENABLED` flag non défini
**Lignes vérifiées** : L3063 + L3090 (early return).
**Constat technique** : flag toujours `true` en prod (variable env undefined).
**Verdict coach** : ⚠️ CONDITIONNEL — kill-switch utile en cas de régression R3.
**Pédagogie/Sécurité** : 0.
**Si CONDITIONNEL** : garder le flag même si hardcoded true (coût 2 L, bénéfice = kill switch d'urgence).

---

### #A2.5 — `previewObjective` refactor
**Lignes vérifiées** : L3320 + L3399.
**Constat technique** : 2 appels redondants à `detectObjectiveFromData`.
**Verdict coach** : ❌ CHALLENGÉ. PM a refusé factorisation en J2 — respecter la décision.
**Trou potentiel** : 0.

---

### #A2.6 — `console.log` debug excessifs
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER).

---

### #A2.7 — `_dplusRole` marker cleanup
**Verdict coach** : ✅ VALIDÉ (RAS).

---

### #A2.8 — Branche "Repos" Gemini vs code
**Verdict coach** : ✅ VALIDÉ (OK comportement cohérent).

---

### #A2.9 — `pdpEfPace` 2 utilisations
**Verdict coach** : ✅ VALIDÉ (OK légitime).

---

### #A2.10 — `vmaSource` Adaptation duplication
**Verdict coach** : ❌ CHALLENGÉ (PM refuse factorisation).

---

### #A2.11 — Garde-fous fréquence asymétriques
**Verdict coach** : ✅ VALIDÉ (asymétrie cohérente).

---

### #A2.12 — Imports inutilisés
**Verdict coach** : ✅ VALIDÉ (RAS).

---

### Axe 3 — Challenges des zones RISQUÉ

### #A3.R1 — Section RÈGLES ABSOLUES 8L → 5L
**Lignes vérifiées** : L3457-3465 (intégralement) + chaque ligne tracée vers son patch Axe1 individuel.
**Constat technique** : le patch global propose `🚨 RÈGLES ABSOLUES :` (1 emoji) + 5 lignes condensées. Or chaque ligne est patchée individuellement avec un risque résiduel (#A1.17 condense VOLUME S1, #A1.18 condense SL, etc.).
**Verdict coach** : ❌ CHALLENGÉ globalement. Préférer les patches INDIVIDUELS (#A1.16 SL, #A1.17 VOLUME, #A4.1 single emoji) plutôt qu'un rewrite massif du bloc.
**Pédagogie/Sécurité** : haute. Ce bloc concentre les 6 NON-NÉGOCIABLES. Diluer l'emphase = Gemini déclasse.
**Trou potentiel** : élevé sur la SL ratio 30-40% (#A1.18) qui disparaît dans la version proposée.
**Si RÉORIENTÉ** : appliquer #A1.16 (SL → jour court), #A4.1 (1 emoji au lieu de 3), MAIS GARDER les 6 lignes structurellement. Gain réaliste : −0 L brutes, −80 tokens (vs −150 promis).

---

### #A3.R2 — `data.frequency` mention 5×
**Lignes vérifiées** : L3414 (PROFIL) + L3460 (RÈGLES) + L3722 (INSTRUCTIONS bullet 5) + L3751 (JSON sessionsPerWeek). Vérifié 4 mentions effectives.
**Constat technique** : dev a corrigé (4 mentions, pas 5 — la mention L3735 n'existe pas).
**Verdict coach** : ✅ VALIDÉ. Supprimer L3414 PROFIL OK (la fréquence reste dans RÈGLES + INSTRUCTIONS + JSON).
**Pédagogie/Sécurité** : nulle.
**Trou potentiel** : 0.

---

### #A3.R3 — Ultra 100km+ Preview vs Remaining asymétrie
**Lignes vérifiées** : L3343-3353 (Preview ultra100) + L4231-4234 (Remaining ultra100).
**Constat technique** : Preview a MATÉRIEL + GESTION D'ALLURE 7:00-8:00, Remaining ne les a pas. Le Remaining est rebattu à chaque batch (S2-N) — l'absence de MATÉRIEL en Remaining = pédagogie ultra incomplète sur les semaines 2+.
**Verdict coach** : ⚠️ CONDITIONNEL — Option A (ajouter MATÉRIEL + ALLURE en Remaining = +2L). Doctrine ultra impose cohérence pédagogique cross-semaine. Préférer Option A à Option B (supprimer en Preview).
**Pédagogie/Sécurité** : moyenne. Pour 100km+, le matériel (sac, bâtons) est CLÉ — à mentionner dès phase développement.
**Trou potentiel** : moyen si pas Option A.
**Si CONDITIONNEL** : Option A obligatoire.

---

### #A3.R4 — Bloc PLAN PERTE DE POIDS Preview L3503-3577

#### #A3.R4.a — RENFORCEMENT CADRAGE PdP 7L
**Lignes vérifiées** : L3547-3553 (lu intégralement) + buildRenfoMainSet renfoService.ts L336+.
**Constat technique** : `buildRenfoMainSet` écrase title+mainSet+warmup+cooldown+duration. MAIS l'`advice` reste à Gemini.
**Verdict coach** : ❌ CHALLENGÉ. Supprimer les 7 L = Gemini écrit un advice qui peut parler de box jumps, burpees → contradiction.
**Pédagogie/Sécurité** : haute (cohérence advice ↔ contenu effectif renfo).
**Trou potentiel** : moyen.
**Si CHALLENGÉ** : garder 2 lignes minimum :
```
RENFORCEMENT — CONTRAINTES ADVICE :
- Poids de corps uniquement, PAS de pliométrie lourde. Le contenu détaillé est généré par le code, mais ton advice doit refléter ce cadrage.
```
Gain net : 7L → 2L = −5L (vs −7L proposé), pédagogie advice préservée.

---

#### #A3.R4.b — PROGRESSION VOLUME HEBDO PdP 6L
**Lignes vérifiées** : L3533-3538 + enforceFullPlanConstraints +15% smoothing + weeklyVolumes injection.
**Constat technique** : Gemini reçoit weeklyVolumes en km. MAIS le bloc PdP donne les volumes en MINUTES ("1h00-1h20") car la doctrine PdP = focus DURÉE (lipolyse) pas DISTANCE.
**Verdict coach** : ❌ CHALLENGÉ. Supprimer = Gemini revient à parler en km dans mainSet/advice/welcome.
**Pédagogie/Sécurité** : moyenne (doctrine PdP).
**Trou potentiel** : moyen (cohérence narrative PdP).
**Si CHALLENGÉ** : condenser à 3L max :
```
PROGRESSION VOLUME (en DURÉE, pas distance — focus lipolyse) :
- S1-S3 : ${pdpIsLowVMA ? '1h00-1h20' : '1h20-1h40'}/sem | S5-S7 : ${'1h20-1h45/1h40-2h00'} | S9-S11 : ${'1h40-2h00/2h00-2h20'}.
- Footings progressent aussi (25-30 → 35-45 min). +15% max/sem auto-cappé par code.
```
Gain net : 6L → 3L = −3L (vs −6L proposé).

---

#### #A3.R4.c — SIGNAUX D'ALERTE PdP 2L
**Lignes vérifiées** : L3567-3568 + L3028 (buildSafetyInstructions weightLoss).
**Constat technique** : couvert par buildSafetyInstructions PdP (#V2 J2 Option C).
**Verdict coach** : ✅ VALIDÉ.
**Trou potentiel** : 0.

---

#### #A3.R4.d — PROGRESSION SL PdP 6L → 2L
**Lignes vérifiées** : L3540-3545 + MIN_SL_DURATION_MIN code.
**Constat technique** : code force min duration mais pas progression. Pédagogie utile mais oui condensable.
**Verdict coach** : ⚠️ CONDITIONNEL.
**Pédagogie/Sécurité** : faible.
**Si CONDITIONNEL** : version condensée acceptable. Garder mention "JAMAIS identique 2 semaines de suite" (variation pédagogique).

---

#### #A3.R4.e — EFFORT PERÇU PdP 5L → 1L
**Lignes vérifiées** : L3555-3559 + L4419 (Remaining déjà condensé).
**Constat technique** : aligner Preview sur Remaining = cohérence.
**Verdict coach** : ✅ VALIDÉ.
**Pédagogie/Sécurité** : faible (la pédagogie RPE est préservée en 1 ligne).
**Trou potentiel** : faible.

---

#### #A3.R4.f — COHÉRENCE PdP 4L → 1L
**Lignes vérifiées** : L3570-3573 + recalculateSessionDistance.
**Constat technique** : condensation acceptable.
**Verdict coach** : ✅ VALIDÉ.
**Trou potentiel** : faible.

---

#### #A3.R4 Remaining — DIVERSIFIER + RENFO −8L
**Lignes vérifiées** : L4396-4404 + L4417.
**Constat technique** : DIVERSIFIER bullets 9 L pédagogiques (fartlek nature, côtes douces, circuit cardio-renfo, footing progressif, technique). Condenser en 2 L = perte de la guidance bullet par bullet → Gemini répète "fartlek doux" sans variation.
**Verdict coach** : ⚠️ CONDITIONNEL.
**Pédagogie/Sécurité** : moyenne (variété = clé motivation PdP).
**Si CONDITIONNEL** : condenser à 4 L max (1 ligne par format) au lieu de 2. RENFO L4417 OK supprimer.

---

### #A3.R5 — buildSafetyInstructions L2912-3047

#### #A3.R5.a — Fix `data.distance` L2958
**Verdict coach** : ⚠️ CONDITIONNEL (cf #A2.1).

#### #A3.R5.b — Factoriser NO_WEIGHT_MENTION (5×)
**Verdict coach** : ❌ CHALLENGÉ. PM refuse factorisation. Respecter.

#### #A3.R5.c — Factoriser NO_CROSS_TRAINING (3×)
**Verdict coach** : ❌ CHALLENGÉ. PM refuse factorisation.

**Note coach sur buildSafetyInstructions globale** : la fonction est DENSE mais chaque bloc cible une catégorie risque distincte. Doctrine sécurité = NE PAS TOUCHER hormis #A2.1 fix bug legacy. Vérifié L2893-3047 intégralement, aucun bloc supprimable.

---

### #A3.R6 — `buildDplusPromptBlock` L3089-3134

#### #A3.R6.a — Label `↓récup` / `↓affût`
**Verdict coach** : ⚠️ CONDITIONNEL (cosmétique 5 tokens — pas prioritaire).

#### #A3.R6.b — Supprimer légende "SL ~58% | vall ~37% | foot ~5%"
**Lignes vérifiées** : L3124 + L1983-2122 (distributeElevation écrase).
**Constat technique** : code écrase chiffres, mais Gemini doit savoir COMMENT distribuer pour cohérence mainSet/advice (Gemini écrit "tu vas faire 200m de D+ sur ce footing").
**Verdict coach** : ❌ CHALLENGÉ. Garder.
**Pédagogie/Sécurité** : faible mais réelle (cohérence advice mainSet).
**Trou potentiel** : faible. Cas typique : Gemini écrit "footing avec D+ progressif" dans le titre alors que le code force à 0m → titre incohérent.
**Si CHALLENGÉ** : garder la légende (1 L) ou condenser à : `Distribution auto-recalculée par code : SL ~58%, vallonnée ~37%, footings ~5%, piste 0m.`

#### #A3.R6.c — test cassera ?
**Verdict coach** : à vérifier avant patch (le coach n'a pas accès aux tests).

---

### #A3.R7 — applyTargetTimeOverride + getBestVMAEstimate
**Lignes vérifiées** : L992-1019 + L183-280.
**Constat technique** : doctrine respectée. Aucun safeguard/clamp ajouté contraire à doctrine.
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — code propre, hors scope prompt).

---

### Axe 4 — Surcharges sémantiques

### #A4.1 — `🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨` triple emoji
**Lignes vérifiées** : L3458.
**Constat technique** : 3 emojis encadrent un texte déjà MAJ + ═══.
**Verdict coach** : ✅ VALIDÉ. Passer à 1 emoji `🚨 RÈGLES ABSOLUES :` est safe car les ═══ portent la salience structurelle.
**Pédagogie/Sécurité** : faible.
**Trou potentiel** : 0 si ═══ conservés (cf #A4.25 challenged).

---

### #A4.2 — "OBLIGATOIRE" × 38 occurrences
**Lignes vérifiées** : 10 patches concrets proposés. Vérifié L2990, L3429, L3503, L3540, L3547, L3555, L3587, L3608, L3614, L3722.
**Constat technique** : retirer "OBLIGATOIRE" quand 🔴/🚨 + MAJ déjà présents.
**Verdict coach** : ⚠️ CONDITIONNEL granulaire (10 sous-patches).
- Patch 1 (L2990 DIVERSITÉ) : ✅ VALIDÉ.
- Patch 2 (L3429 LIEU) : ✅ VALIDÉ.
- Patch 3 (L3503 PdP) : ✅ VALIDÉ.
- Patch 4 (L3540 PROGRESSION SL) : ✅ VALIDÉ.
- Patch 5 (L3547 RENFORCEMENT) : couvert par #A3.R4.a CHALLENGÉ — donc N/A.
- Patch 6 (L3555 EFFORT PERÇU) : ❌ CHALLENGÉ — retirer "OBLIGATOIRE" sur RPE = Gemini cesse de l'inclure systématiquement. RPE = pierre angulaire PdP.
- Patch 7 (L3587 PLAN HYROX) : ✅ VALIDÉ.
- Patch 8-9 (L3608/3614 Séance clé Hyrox) : ✅ VALIDÉ (anchor visuel utile garder).
- Patch 10 (L3722 INSTRUCTION 5 renfo) : ✅ VALIDÉ.
**Pédagogie/Sécurité** : faible sauf patch 6 (RPE = haute pédagogie).
**Trou potentiel** : faible global, moyen pour RPE.

---

### #A4.3 — "JAMAIS" × 22 occurrences
**Verdict coach** : ⚠️ CONDITIONNEL granulaire. Patches L3510, L3389, L3032 OK. Garder formulation "JAMAIS d'allure spécifique" L3509 PdP (pédagogie stricte PdP doctrine).
**Trou potentiel** : faible.

---

### #A4.4 — Bloc INSTRUCTION renfo Preview
**Verdict coach** : ✅ VALIDÉ (couvert #A1.11+12+13).

---

### #A4.5 — INSTRUCTIONS 7 → 5 items
**Lignes vérifiées** : L3717-3731 intégralement.
**Constat technique** : le patch supprime "1. Génère SEULEMENT la semaine 1" et "4. Évaluation faisabilité HONNÊTE".
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : haute pour "1. Génère SEULEMENT la S1" (sinon Gemini génère 12 semaines, latence ×5, tokens ×5). La règle existe parce qu'observée bugée.
**Trou potentiel** : élevé sur "1.". Faible sur "4." (mais le 4. oriente le welcomeMessage).
**Si RÉORIENTÉ** : garder "1." absolument. Supprimer juste "4." (faisabilité écrasée). Condenser "5.", "6.", "7." OK. Gain réaliste : 7L → 6L = −1L (vs −9L proposé).

---

### #A4.6 — Triple emphase VMA/IMC/VK
**Lignes vérifiées** : L3327, L3329, L2931, L2933.
**Constat technique** : 4-5 emphases cumulées sur blocs SÉCURITÉ.
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : haute (zones IMC ≥35, VK volume réduit).
**Trou potentiel** : moyen (la doctrine sécurité impose la salience max sur ces blocs).
**Si CHALLENGÉ** : garder l'emphase actuelle. Seules réductions acceptables : sur emphases NON-sécurité (cosmétique titres).

---

### #A4.7 — `⚠️ FORMAT VK — PAS un trail classique` × 2
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A4.8 — PROFIL Preview vs Remaining phrasing
**Verdict coach** : ✅ VALIDÉ (RAS hormis #A3.R2 + #V1 J2 déjà patché).

---

### #A4.9 — "Allures EXACTES" doublon
**Lignes vérifiées** : L3445 + L3718.
**Constat technique** : redondance directe.
**Verdict coach** : ✅ VALIDÉ. Supprimer L3445.

---

### #A4.10 — Hyrox CLÉ répété 4×
**Verdict coach** : ❌ CHALLENGÉ. PM refuse factorisation. Garder.

---

### #A4.11 — Hyrox CATALOGUE "→ Phase X" × 5
**Lignes vérifiées** : L3644-3675 + L3663-3667 (PHASES juste après).
**Constat technique** : redondance directe (les phases sont listées 4 lignes plus bas).
**Verdict coach** : ✅ VALIDÉ.
**Trou potentiel** : faible.

---

### #A4.12 — Hyrox PHASES 5L → 4L
**Lignes vérifiées** : L3663-3667.
**Constat technique** : la phase AFFÛTAGE Hyrox -40% volume + rappels d'allure courts est UNIQUE Hyrox.
**Verdict coach** : ❌ CHALLENGÉ. Garder 5 L (chaque phase distincte).
**Pédagogie/Sécurité** : moyenne (doctrine Hyrox).

---

### #A4.13 — Hyrox ADVICE 5 exemples → 2
**Lignes vérifiées** : L3686-3691.
**Constat technique** : 5 exemples = 5 types séances DIFFÉRENTS.
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : moyenne (variété advice).
**Trou potentiel** : moyen.

---

### #A4.14 — Hyrox WELCOMEMESSAGE 8L → 4L
**Lignes vérifiées** : L3695-3702.
**Constat technique** : roadmap S1-3 / S4-6 / S7+ / Affûtage pédagogique pour user.
**Verdict coach** : ❌ CHALLENGÉ. Garder roadmap.
**Pédagogie/Sécurité** : moyenne (perspective utilisateur Hyrox 12 sem).

---

### #A4.15 — Renfo Hyrox 3L → 1L
**Lignes vérifiées** : L3683 + L4165 (Remaining déjà court).
**Constat technique** : la 3-liner est explicite anti-confusion stations Hyrox.
**Verdict coach** : ⚠️ CONDITIONNEL. Condenser à 2L max (garder explication anti-confusion stations).

---

### #A4.16 — Formule allure EF embarquée L3729
**Lignes vérifiées** : L3729 (200 chars formule JS).
**Constat technique** : la formule sert d'exemple chiffré pour Gemini.
**Verdict coach** : ❌ CHALLENGÉ. Garder l'exemple chiffré (Gemini a besoin du patron).
**Si RÉORIENTÉ** : utiliser `paces.efPace` directement au lieu de re-calculer : `Si duration = "45 min" et allure EF = ${paces.efPace}/km, distance ≈ ${calc} km.` Gain net : −100 tokens (vs −150).

---

### #A4.17 — "warmup avec allure" template
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A4.18 — Asymétrie ADVICE Hyrox expert vs débutant
**Verdict coach** : ✅ VALIDÉ (hors scope sans condition `if`).

---

### #A4.19 — VMA Remaining doublon L4318
**Lignes vérifiées** : L4318 + L4320-4329 (paces affichées juste après).
**Constat technique** : la VMA est implicite dans les paces.
**Verdict coach** : ⚠️ CONDITIONNEL. La VMA en chiffre brut donne un repère psychologique au narrateur (Gemini comprend mieux le profil). Garder peut être utile.
**Si CONDITIONNEL** : tester A/B avant suppression. Sans test : conserver.

---

### #A4.20 — Emojis débutants 4 → 1
**Verdict coach** : ✅ VALIDÉ.

---

### #A4.21 — Matrice RPE adaptation
**Verdict coach** : ✅ VALIDÉ (hors scope).

---

### #A4.22 — `responseMimeType` JSON
**Verdict coach** : ✅ VALIDÉ (RAS).

---

### #A4.23 — Doublon Jour SL PROFIL L3416 vs RÈGLES L3462
**Verdict coach** : ✅ VALIDÉ. Supprimer L3416.

---

### #A4.24 — Template JSON commentaires neutres
**Lignes vérifiées** : L3744-3789 (intégralement).
**Constat technique** : remplacer "Nom réel du lieu", "Type", "Titre unique" par "string" générique.
**Verdict coach** : ⚠️ CONDITIONNEL. Les commentaires inline guident Gemini sur le STYLE attendu (ex: "Titre unique" évite les titres dupliqués). Supprimer = risque titres bateau.
**Si CONDITIONNEL** : ne supprimer QUE les commentaires purement descriptifs (`"Type"` → `"Type"`). Garder ceux qui orientent le style (`"Titre unique"`, `"Lieu réel adapté"`).
**Gain réaliste** : −8 L (vs −16 L proposé).

---

### #A4.25 — `═══` separator → `###`
**Lignes vérifiées** : 17 occurrences Preview + 11 Remaining.
**Constat technique** : économie 700 tokens annoncée. MAIS : aucun A/B test n'a été conduit, et Gemini 2.5-flash a un attention pattern documenté sur séparateurs visuels (les `═══` augmentent le poids sur les blocs RÈGLES ABSOLUES + SAFETY).
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : élevée (impact attention sur blocs sécurité).
**Trou potentiel** : MOYEN — risque que les blocs RÈGLES ABSOLUES soient noyés dans le markdown standard.
**Si CHALLENGÉ** : pré-requis A/B test 20 plans (10 sur 3 profils sécurité haute : isHighRisk + IMC ≥35 + débutant) AVANT patch. Sinon refuser.

---

### #A4.26 — Variations `Récupération`/`Recup`
**Verdict coach** : ✅ VALIDÉ (OK chaque variante son contexte).

---

### #A4.27 — "À la maison"/"Salle de sport" lieu renfo
**Verdict coach** : ✅ VALIDÉ (OK conserver).

---

### #A4.28 — Parenthèses `(advice)` `(locationSuggestion)`
**Verdict coach** : ✅ VALIDÉ (OK conserver — mapping JSON nécessaire).

---

### #A4.29 — "EXACTEMENT" Remaining L4482
**Verdict coach** : ✅ VALIDÉ. OK supprimer.

---

### #A4.30 — Doublon `welcomeMessage` (9 mentions)
**Verdict coach** : ✅ VALIDÉ (OK conserver — chaque mention pousse contenu différent).

---

### #A4.31 — PdP overweight L3512 condensé
**Lignes vérifiées** : L3512 + L2944 (buildSafetyInstructions IMC 30-35).
**Constat technique** : doctrine PdP overweight INTERDIT "fractionné, fartlek, côtes" alors que buildSafety IMC 30-35 dit juste "Pas de pliométrie". Stricte ≠ générique.
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : haute (doctrine PdP).
**Trou potentiel** : moyen. Cas typique : femme 60 ans, IMC 32, VMA 9 → fartlek "doux" en S3 = aggravation douleurs articulaires.

---

### #A4.32 — `❌ / ✅` emojis adapter
**Verdict coach** : ✅ VALIDÉ (hors scope).

---

### #A4.33 — Pas d'occurrence
**Verdict coach** : ✅ VALIDÉ (RAS).

---

### #A4.34 — Emojis fonctionnels
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A4.35 — Récupération type vs titre
**Verdict coach** : ✅ VALIDÉ (OK code gère).

---

### #A4.36 — Patron ternaire `${X ? Y : ''}`
**Verdict coach** : ✅ VALIDÉ (OK lisibilité TS).

---

### #A4.37 — Récap niveaux gravité 🔴/🚨/⚠️
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A4.38 — Header → systemInstruction
**Verdict coach** : ⚠️ CONDITIONNEL. Changement API risqué sans test.

---

### #A4.39 — "Continue"/"SEULEMENT"/"UNIQUEMENT" variations
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A4.40 — "Tu DOIS EN PREMIER AVANT" quadruple emphase
**Lignes vérifiées** : L2913.
**Constat technique** : 3 emphases cumulées sur "tu dois mettre en premier".
**Verdict coach** : ⚠️ CONDITIONNEL. Garder "EN PREMIER" car CRITIQUE (la mention sécurité doit être 1ère ligne du welcome). Retirer juste "AVANT toute autre information".
**Si CONDITIONNEL** : `Dans le welcomeMessage, tu DOIS inclure EN PREMIER :`

---

### #A4.41 — "Toutes les phases" Hyrox
**Verdict coach** : ✅ VALIDÉ (déjà patché S20).

---

### Axe 5 — Sections rares

### #A5.1 — Trail D+ <500m skip R3
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A5.2 — isHighRisk branche
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — doctrine sécurité).

---

### #A5.3 — isAmbitiousGoal + freq<3
**Verdict coach** : ✅ VALIDÉ (OK garder garde-fou).

---

### #A5.4 — weight>85 + bmi<30
**Verdict coach** : ✅ VALIDÉ (hors scope code).

---

### #A5.5 — RED-S BMI<20
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — doctrine sécurité RED-S).

---

### #A5.6 — totalWeeks>24
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A5.7 — isRestart
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A5.8 — VK + débutant combinaison rare
**Verdict coach** : ✅ VALIDÉ (OK garder).

---

### #A5.9 — hyroxFreq>=5 suppression branche
**Lignes vérifiées** : L3619-3626 (8 L) + L3611 (hyroxFreq===4 fallback).
**Constat technique** : "0 cas prod J1" mais l'app vise compétiteurs Hyrox. Fallback `hyroxFreq===4` distribue 30-45 km/sem MAX, pas 35-50 km/sem.
**Verdict coach** : ❌ CHALLENGÉ.
**Pédagogie/Sécurité** : moyenne (athlète compétiteur Hyrox = profil légitime).
**Trou potentiel** : moyen. Demain un Hyroxer compétiteur arrive (5×/sem) → fallback dégradé.
**Si CHALLENGÉ** : garder. Coût 8 L = négligeable.

---

### #A5.10 — hyroxPrevTime
**Verdict coach** : ✅ VALIDÉ (OK garder 1L).

---

### #A5.11 — Trail 70-100km
**Verdict coach** : ✅ VALIDÉ (OK garder verbosité doctrine ultra).

---

### #A5.12 — Trail 100km+
**Verdict coach** : ✅ VALIDÉ (NE PAS TOUCHER — doctrine ultra).

---

### #A5.13 — Hyrox débutant 10L → 6L
**Lignes vérifiées** : L3628-3634 (Preview) + L4178-4182 (Remaining déjà court).
**Constat technique** : condensation acceptable.
**Verdict coach** : ⚠️ CONDITIONNEL. Garder mention "Footings peuvent inclure marche si nécessaire" (clé Hyrox débutant) et "Allure des 1km : commencer à allure EA" (technique spécifique).
**Si CONDITIONNEL** : condensation à 7L au lieu de 6L (garder les 2 mentions critiques).

---

## Recommandations coach pour PM

### Top 10 patches que je VALIDE à 100% (à pousser sans hésiter)

1. **#A1.2** — feasibility template neutre (−3 L, risque nul, déjà écrasé)
2. **#A1.3** — confidenceScore template suppression (−1 L)
3. **#A1.4** — distance Trail template cleanup (0 L, lisibilité)
4. **#A1.23** — Drop -30% PdP (Gemini reçoit déjà weeklyVolumes finaux) (−2 L)
5. **#A2.2** — `data.estimatedVMA` mort code (cleanup propre)
6. **#A3.R2** — Fréquence PROFIL L3414 doublon (−1 L)
7. **#A4.1** — `🚨🚨🚨` → `🚨` simple (−10 tokens, salience préservée par ═══)
8. **#A4.9** — "Allures EXACTES" doublon (−1 L)
9. **#A4.20** — Emojis débutants 4 → 1 (−5 tokens, lisibilité)
10. **#A4.23** — Jour SL PROFIL L3416 doublon (−1 L, on garde RÈGLES L3462)

**Total V1 trivial coach-validé** : ~10 L, −60 tokens, **risque pédagogique nul**.

### Patches V2 à appliquer avec garde-fous (CONDITIONNELS)

- **#A1.11** : 4 mentions renfo → 2 (conserver L3726+L4360, supprimer L3674+L3680)
- **#A1.15** : condenser cohérence 3L→1L MAIS garder mention "mainSet textuel"
- **#A1.16, #A1.17** : condenser SL et VOLUME S1 (formulations courtes acceptables)
- **#A1.22** : supprimer L3537 Preview (garder L4413 Remaining)
- **#A4.5** : INSTRUCTIONS partielle (garder absolument "1. Génère SEULEMENT la S1", supprimer juste "4. Évaluation HONNÊTE")
- **#A4.2 patches 1-5, 7-10** : retirer "OBLIGATOIRE" sauf RPE (#6)

### Patches à REFUSER (doctrine en danger)

- **#A1.7** : "PAS de seuil/frac/VMA" → "PAS d'intensité" (Gemini interprète fartlek comme intensité douce)
- **#A1.18** : SL "30-40% du volume" suppression (Pfitzinger LSD backbone)
- **#A1.20** : "les 4 PREMIÈRES semaines" condensé (perd nuance pédagogique temporelle)
- **#A3.R1** : RÈGLES ABSOLUES bloc global rewrite (préférer patches Axe1 individuels)
- **#A3.R4.a** : RENFO PdP cadrage entièrement supprimé (garder 2L cohérence advice)
- **#A3.R4.b** : PROGRESSION VOLUME PdP (doctrine focus DURÉE pas distance)
- **#A3.R6.b** : Légende SL ~58% (cohérence titre/advice avec D+ forcé code)
- **#A4.5** : INSTRUCTIONS rewrite global (garder "1. Génère SEULEMENT la S1")
- **#A4.6** : Triple emphase IMC/VK (doctrine sécurité = salience max)
- **#A4.12** : PHASES Hyrox 5→4 (perte spécificité AFFÛTAGE -40%)
- **#A4.13** : ADVICE Hyrox 5→2 (perte guidance variété)
- **#A4.14** : WELCOMEMESSAGE Hyrox roadmap 8→4 (pédagogie 12 sem)
- **#A4.16** : Formule allure EF supprimée (Gemini perd l'exemple chiffré — préférer paces.efPace)
- **#A4.25** : ═══ → ### sans A/B test (impact attention sur sécurité non testé)
- **#A4.31** : PdP overweight L3512 (doctrine plus stricte que buildSafety)
- **#A5.9** : Hyrox freq≥5 suppression (athlète compétiteur légitime)

### Trous pédagogiques transversaux identifiés (à corriger en bonus)

1. **Phase AFFÛTAGE Hyrox** : la règle "-40% volume" doit rester DANS le prompt (pas seulement code) pour cohérence advice "tu réduis pour arriver frais".
2. **Mention RPE PdP** : `EFFORT PERÇU OBLIGATOIRE` à conserver intact — RPE est la pierre angulaire pédagogique PdP (substitut de la VMA pour non-chronométrés).
3. **MATÉRIEL ultra Remaining** : ajouter en Remaining pour cohérence pédagogie cross-semaine (#A3.R3 Option A obligatoire).
4. **Cohérence advice ↔ contenu renfo** : garder 2L cadrage renfo PdP même si `buildRenfoMainSet` écrase la structure (l'advice reste à Gemini).

### Économie tokens consolidée RÉALISTE coach-validée

| Vague | Patches coach-validés | Gain L | Gain tokens |
|---|---|---|---|
| V1 trivial (10 patches top) | 10 | ~10 L | ~60 |
| V2 conditionnel coach | 12 | ~15 L | ~250 |
| V3 PdP condensations partielles | 4 | ~10 L | ~150 |
| V4 surcharges patches granulaires | 8 | ~8 L | ~120 |
| V5 Hyrox condensations partielles | 2 | ~6 L | ~80 |
| **Total coach-validé** | **36** | **~49 L** | **~660 tokens/preview** |

**Comparaison dev senior** : dev annonçait −139 L et −2950 tokens. Coach valide −49 L et −660 tokens (~35% du dev), le reste étant CHALLENGÉ pour doctrine ou CONDITIONNEL en attente de tests A/B.

**Sur 1500 plans/mois** : économie réaliste ~1M tokens/mois (vs 6M dev) → impact monétaire mineur. Le vrai gain reste la **qualité préservée**, pas l'économie.

---

## Note finale au PM

L'audit J3 du dev senior est techniquement précis (vérification post-process exhaustive, lignes pointées correctement). MAIS le dev raisonne en code (écrasement = redondance) sans toujours considérer les 3 dimensions narratives où le prompt sert encore : `welcomeMessage`, `advice` par séance, et `mainSet` textuel.

**Doctrine intacte vérifiée** :
- ✅ Sécurité > conversion : `buildSafetyInstructions` quasi-intouchée (sauf fix bug legacy #A2.1)
- ✅ Course exclusivement : règles `NO_CROSS_TRAINING` préservées (refus factorisation respecté)
- ✅ Pas de poids/IMC : règle préservée 5× (refus factorisation respecté)
- ✅ Mode marche-course = débutants uniquement : conditions `pdpNeedsMarcheCourse` L3499 + `needsMarcheCourse` L3310 intactes
- ✅ Pas de nutrition chiffrée : `NUTRITION_SL_BLOCK` préservé
- ✅ "Perte de poids" OK dans titre : `buildPlanName` L1941 préservé
- ✅ X séances/sem inclut 1 renfo : règle L3722 INSTRUCTION 5 conservée

**Recommandation transversale** : avant de toucher au prompt, lancer un A/B test sur 20 plans (couvrant les 5 typologies critiques : 5K débutant, marathon confirmé, trail expert, PdP low VMA + IMC élevé, Hyrox standard) pour chaque vague. Le gain de tokens ne vaut RIEN s'il dégrade un seul plan PdP ou un seul welcomeMessage sécurité.
