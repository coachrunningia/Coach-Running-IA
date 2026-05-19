# Review PM senior J3 — 112 patches audit dev senior
Date: 2026-05-17 | Reviewer: PM senior (historique complet du produit)
Audit source : `AUDIT-DEV-SENIOR-J3-COMPLET.md` (1629 L)
Méthodologie : lecture des lignes visées + contexte (±20L) + grep occurrences voisines + check doctrine + check historique bugs.

---

## Synthèse exec

| Verdict | Compte / 112 | % |
|---|---|---|
| ✅ VALIDÉS | 56 | 50% |
| ⚠️ CONDITIONNELS | 24 | 21% |
| ❌ CHALLENGÉS | 20 | 18% |
| 🔄 RÉORIENTÉS | 12 | 11% |

Note : l'audit dev contient 28 entrées "🟢 OK / RAS / hors scope" qui ne sont pas des propositions de patch — je les compte comme ✅ VALIDÉS pour le statu quo. Les VRAIS patches activement proposés sont environ 60. Sur ces 60 :
- 26 patches sont vraiment SAFE (gain réel, doctrine non touchée).
- 18 sont CONDITIONNELS (à appliquer avec garde-fou ou test A/B).
- 16 sont CHALLENGÉS (refus catégorique pour raison historique/doctrine).
- 12 sont RÉORIENTÉS (le dev a visé la mauvaise ligne ou la mauvaise formulation).

### Patches refusés ferme (refus catégorique, je protège un acquis produit)
- **#A1.7** (condensation "PAS de seuil/frac/VMA" → "PAS d'intensité") — la formulation longue a été RAJOUTÉE après le bug Pierre (fartlek injecté en S2 fondamental). Le code convertit, mais le RE-WORK coûte une 2e passe → garder verbose en Preview, OK condenser Remaining seulement.
- **#A1.8** (condensation max 1 SL) — la mention "JAMAIS 2 SL la même semaine" a été ajoutée après le plan Lisa (2 SL le mardi+samedi). Le code dédup mais l'advice tournait autour de la 2e SL. Garder verbose.
- **#A1.15 / #A4.16** (suppression formule allure EF embarquée) — cette formule a été ajoutée le 12 mai après le plan Manon (mainSet "1h20 de course" pour duration="45 min"). La formule force Gemini à reposer le calcul. Garder.
- **#A1.23** (suppression "Récup SL -30%") — c'est une mention pédagogique pour l'EFFORT PERÇU dans l'advice, pas pour le calcul volume (qui est dans `weeklyVolumes`). Le dev mélange contenu prompt et calcul code.
- **#A3.R1** (condensation RÈGLES ABSOLUES 8L→5L) — refus en bloc : chacune des 5 lignes 🔴 a une histoire. Patch ciblé par sous-règle OK (#A1.16, #A1.17, #A1.18), pas refonte du header.
- **#A4.5** (refonte INSTRUCTIONS 7→5 items) — refus : la liste numérotée 1-7 est un repère pédagogique pour le code (chaque item porte un test produit). Refonte = risque énorme de régression silencieuse.
- **#A4.10 / #A2.5 / #A2.10** (factorisation) — doctrine "pas de factorisation" maintenue.
- **#A4.24** (template JSON neutralisé) — refus : les commentaires inline ("Nom réel du lieu", "Titre unique") ont été ajoutés après des cas où Gemini mettait `"name": "Plan"` ou `"title": "Séance"`. Ils SERVENT.
- **#A4.25** (`═══` → `###`) — refus : le séparateur ASCII est un repère VISUEL pour MOI (Romane) dans le code source. Le gain ~700 tokens existe, mais ça casse mon UX dev. Si on doit vraiment l'appliquer, V7+ après tout le reste.
- **#A4.38** (header → systemInstruction) — refus : changement d'API routing, hors périmètre cleanup prompt. Risque caching/comportement Gemini, à ne PAS mélanger avec patches doctrine.
- **#A5.9** (suppression branche hyroxFreq≥5) — sur 110 plans audités J1 = 0 cas, mais on n'a pas encore lancé la com Hyrox dédiée. Si un coureur s'inscrit demain en 5 séances Hyrox, la branche `=== 4` sous-couvre. Garder.

---

## Trous produit détectés (récap critique)

Patches CHALLENGÉS avec justification métier produit + bug historique qui a justifié l'ajout :

1. **#A1.7 condensation "PAS d'intensité"** — la version actuelle dit explicitement "PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale." Cette précision a été ajoutée après le plan Pierre (15 mai) qui contenait un fartlek injecté par Gemini en S2 fondamental "parce que le coureur a un bon niveau". Le code post-process convertit, MAIS Gemini avait alors mis dans l'advice "Cette séance prépare ton seuil" → l'utilisateur a vu une incohérence (Type=Footing, advice=seuil). Donc le verbose Preview reste utile.

2. **#A1.8 max 1 SL/sem** — bug Lisa (12 mai) : Gemini a généré 2 SL la même semaine en pensant qu'une "Sortie Longue Trail" était différente d'une "Sortie Longue route". Le mot "JAMAIS 2 Sortie Longue la même semaine" a été ajouté pour bloquer ce raisonnement. Sa suppression peut faire rejaillir le bug.

3. **#A1.15 / #A4.16 formule allure EF** — bug Manon (12 mai) : mainSet "1h20 de course" alors que duration="45 min". La formule embarquée force le LLM à reposer le calcul. Suppression = retour du bug.

4. **#A3.R4.b suppression PROGRESSION VOLUME HEBDO PdP** — le dev dit "couvert par `enforceFullPlanConstraints`". Faux. `enforceFullPlanConstraints` applique +15% week-to-week (cap), mais ne PRESCRIT pas les RANGES "1h20-1h40 / 1h40-2h00 / 2h00-2h20". Ces ranges guident Gemini sur le PROFIL volume PdP (séances ~40-50min vs ~30min). Sans ce bloc, Gemini peut faire S1=3h cumulé → cap code à 2h20 → plan déçoit l'utilisateur qui voulait progresser doucement.

5. **#A3.R4.c suppression SIGNAUX D'ALERTE PdP** — dev dit "couvert par buildSafetyInstructions". Faux pour ce cas précis : `buildSafetyInstructions` met la sécurité dans le WELCOMEMESSAGE, pas dans l'ADVICE de la 1ère séance. Le bloc L3567-3568 force l'instruction dans l'advice. Différent canal d'attention utilisateur.

6. **#A4.31 condensation PdP IMC overweight** — dev propose `Intensité limitée (cf. règles surpoids globales).` Refus net : la version actuelle énumère "fractionné, fartlek, côtes, haute intensité". `buildSafetyInstructions` ne dit QUE "pas de pliométrie/sauts" → "fractionné" et "côtes" ne sont PAS couverts ailleurs. La condensation crée un trou doctrine.

7. **#A1.18 + #A1.17 condensation RÈGLES** — chaque emphase "🔴" et chaque chiffre (±5%, 30-40%, durée mini) a été ajouté en réaction à un plan qui dérivait. L'audit dev mélange "couvert par code" (vrai pour la valeur finale) et "utile pour orienter la GÉNÉRATION" (vrai aussi). Le code ré-cape, mais si Gemini se trompe lourdement, le re-cap dégrade la qualité (ex : SL=80min poussée à 50min après cap → mainSet décrit toujours 80min).

8. **#A4.2 retrait "OBLIGATOIRE" massif** — le mot "OBLIGATOIRE" porte un signal de gravité. 10 retraits = dilution générale. Accepter 3-4 retraits ciblés (les plus redondants), refuser le batch.

9. **#A1.11 suppression mentions Hyrox renfo** — la 2e mention "le titre du renfo est généré par le code, NE PAS le réécrire" sert spécifiquement à empêcher Gemini de pré-écrire un titre Hyrox-flavored sur le renfo (ex "Renfo spécial sled push"). Suppression = retour possible du bug. Garder.

10. **#A4.13 condensation ADVICE Hyrox 5→2 exemples** — bug Hyrox du 14 mai : tous les advices identiques "Cette séance prépare ton Hyrox". Les 5 exemples actuels VARIENT volontairement pour montrer la DIVERSITÉ attendue. Réduire à 2 exemples = exemples plus pauvres = copies plus probables.

---

## Détail par patch

---

### #A1.1 — Override total de `plan.name` par `buildPlanName`
**Lignes vérifiées** : L3747 (template JSON) + L1938-1962 (buildPlanName) + L4009 (appel systématique).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0 (`buildPlanName` respecte le titre "Perte de poids" cf. doctrine #5 acceptée).
**Risque produit** : nul. Gemini perd des tokens à inventer un nom qui est jeté. Le patch (mettre une valeur explicite "ignored, overwritten" ou injecter le buildPlanName dans le template) est propre.
**Recommandation** : remplacer L3747 par `"name": "${buildPlanName(data, planDurationWeeks)}",` — Gemini voit le bon nom dès la génération, c'est plus propre.

---

### #A1.2 — Override total de `plan.feasibility`
**Lignes vérifiées** : L3760-3764 (template JSON) + L4043-4050 (override total post-Gemini) + #S13 J2 (déjà conditionnel).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0 — la doctrine sécurité IMPOSE feasibility déterministe (calculée par `calculateFeasibility`), pas LLM-generated.
**Risque produit** : nul. Cohérent avec #S13 J2 que j'avais validé en conditionnel.
**Recommandation** : appliquer le patch proposé (3 L → 1 L commentaire neutre).

---

### #A1.3 — Override `plan.confidenceScore`
**Lignes vérifiées** : L3759 (template JSON) + L4050 (override systématique).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : nul. Aligné avec #S13 J2 et #A1.2.

---

### #A1.4 — Override `plan.distance` Trail
**Lignes vérifiées** : L3753 (template JSON Preview) + L3805-3807 (override post-Gemini exactement même expression).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : nul. Cosmétique pur (le template injecte déjà la bonne valeur, le code la force). Recommandation : simplifier le template ET garder l'override en safety net.

---

### #A1.5 — Règle "EXACTEMENT N séances"
**Lignes vérifiées** : L3460 (Preview) + L4482 (Remaining) + L3905/L4576 (slice cap).
**Verdict PM** : ✅ VALIDÉ (= statu quo "ne pas toucher")
**Risque doctrine** : faible — la slice ne couvre que le surplus. Si Gemini sous-génère (5 jours préférés mais 3 séances seulement), pas de re-augmentation auto.
**Risque produit** : moyen si on retire la mention. Garder.
**Recommandation** : le dev a raison de classer en "ne pas toucher" — c'est l'asymétrie code/prompt qui justifie la persistance.

---

### #A1.6 — `elevationGain` OBLIGATOIRE
**Lignes vérifiées** : L3127 (block D+) + L4225/L4240 (Remaining trail) + #S3 J2 (déjà validé).
**Verdict PM** : ✅ VALIDÉ (déjà couvert par #S3 J2 que j'ai validé)
**Risque doctrine** : 0.
**Action** : à appliquer en même commit que les patches J2 en attente.

---

### #A1.7 — Condensation "PAS de seuil/fractionné/VMA"
**Lignes vérifiées** : L3480 (Preview) + L4370 (Remaining) + L684-700 (postProcessWeekQuality conversion auto).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : moyen (pilier #1 sécurité progressivité).
**Risque produit** : élevé. La forme actuelle "PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale." a été ajoutée le 16 mai après l'audit du plan Pierre (fartlek injecté par Gemini en S2 fondamental). Le code post-process CONVERTIT, MAIS le mainSet textuel et l'advice généré par Gemini gardaient des traces "seuil" → incohérence affichée à l'utilisateur. La version condensée "PAS d'intensité" est ambiguë : Gemini peut considérer "fartlek doux" comme non-intense.
**Si CHALLENGÉ** : garder la version verbose Preview (L3480). Condenser UNIQUEMENT en Remaining (L4370 déjà au format "PAS de seuil, PAS de fractionné, PAS de VMA." — c'est déjà court, ne pas y toucher).

---

### #A1.8 — "MAXIMUM 1 SL par semaine"
**Lignes vérifiées** : L2993 (buildSafetyInstructions) + L794-844 (postProcessWeekQuality dédup) + L946-961 (enforceSLDay dédup) + plan Lisa 12 mai (bug historique).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : moyen (pilier sécurité progressivité).
**Risque produit** : moyen. Bug Lisa : Gemini a généré 2 SL (1 "trail" + 1 "route") en pensant qu'elles étaient différentes. La phrase "JAMAIS 2 Sortie Longue la même semaine" a été ajoutée précisément pour bloquer ce raisonnement linguistique. La condensation du dev ("Max 1 SL/sem (sauf PdP : 2 max).") perd l'emphase qui bloque le bug.
**Si CHALLENGÉ** : garder tel quel. Si Romane veut absolument économiser, condenser MAIS garder le mot "JAMAIS" : `MAXIMUM 1 SL/sem (PdP : 2 max). JAMAIS 2 SL Sortie Longue identiques la même semaine.`

---

### #A1.9 — "JAMAIS 2 séances longues consécutives"
**Lignes vérifiées** : L847-875 postProcessWeekQuality.
**Verdict PM** : ✅ VALIDÉ (= hors scope, pas de patch proposé)
**Notes** : le dev classe comme "hors scope" correctement.

---

### #A1.10 — "ZERO D+ on track/recovery"
**Lignes vérifiées** : L3114 (buildDplusPromptBlock) + L1450-1483 + L2005-2007 (forçage code).
**Verdict PM** : ✅ VALIDÉ (= statu quo "ne pas toucher")
**Notes** : 1 ligne utile, ne casse rien à le garder.

---

### #A1.11 — Mentions "NE PAS générer mainSet renfo" Hyrox
**Lignes vérifiées** : L3674 + L3680 + L3726 (Preview) + L4360 (Remaining) + L4161 (Hyrox remaining) + buildRenfoMainSet L336+ (override total).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : moyen sur la 2e mention Hyrox. Bug historique : un plan Hyrox du 14 mai a généré un renfo "Renfo Hyrox spécial sled push" en mainSet — la 2e mention sur L3680 (`le titre du renfo est généré séparément par le code, NE PAS le réécrire`) sert spécifiquement à empêcher ça.
**Si CONDITIONNEL** : OK supprimer L3674 (1 occurrence redondante), GARDER L3680 (cible spécifique du bug Hyrox sled push). Net : −1 L au lieu de −2 L.

---

### #A1.12 — Cap durée Renfo 30-45 min
**Lignes vérifiées** : L3723 (Preview INSTRUCTIONS 5) + buildRenfoMainSet L956 (force duration).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : faible. Confirmé : `buildRenfoMainSet` écrase la duration. Le prompt est pure perte.

---

### #A1.13 — Type "Renforcement" dans JSON
**Lignes vérifiées** : L3724 + retype postProcessWeekQuality L665-680.
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher)
**Notes** : le type EST utilisé par le code pour aiguillage buildRenfoMainSet. Garder.

---

### #A1.14 — "NE PAS mettre de séance Repos"
**Lignes vérifiées** : L3725 + L1606-1685 enforceWeekConstraints (Repos auto si avg<3.5).
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher)
**Notes** : règle utile pour éviter re-work code. 1 ligne, garder.

---

### #A1.15 — Bloc COHÉRENCE DURÉE/DISTANCE/MAINSET (4 L)
**Lignes vérifiées** : L3727-3730 + L595-636 recalculateSessionDistance + bug Manon 12 mai.
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : élevé. Bug Manon (12 mai) : duration="45 min" mais mainSet décrit "1h20 de course". `recalculateSessionDistance` corrige la DISTANCE (km), mais ne touche pas le MAINSET TEXTUEL. L'utilisateur voit duration=45min ET mainSet="1h20" → confusion. Le bloc 4L a été ajouté précisément pour ça.
**Si CHALLENGÉ** : garder la version 4 L. La condensation 1-liner du dev perd l'exemple chiffré "Si duration=45min ET allure EF=X, alors distance ≈ Y km" qui ANCRE le raisonnement Gemini. Si on doit gagner, condenser à 2 L max avec exemple préservé.

---

### #A1.16 — Place SL le ${longRunDay}
**Lignes vérifiées** : L3462 (Preview) + L4353 (Remaining) + enforceSLDay L935-978 (force swap).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : faible si bien fait. Le code force le swap, donc la mention prompt est de la safety net pour éviter re-work. Condensation OK.
**Si CONDITIONNEL** : OK condenser PREVIEW à `🔴 SL → ${longRunDay}.` MAIS garder Remaining tel quel (déjà court). Pas de gain L net mais ~15 tokens.

---

### #A1.17 — VOLUME S1 = X km CIBLE BILATÉRALE ±5%
**Lignes vérifiées** : L3464 (280 chars) + enforceWeekConstraints L1542-1601 (scale auto à ±10%).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : moyen. La précision "±5%" a été ajoutée (J1 R-B) pour éviter que Gemini under-shoot à -20% (cas observé sur plans débutant marathon). Si on supprime la valeur cible chiffrée, on perd cet ancrage.
**Si CONDITIONNEL** : OK condenser à `🔴 Volume S1 ≈ ${X}km (somme des distances course, ±5%).` Garder le ±5% explicite. Gain ~60 tokens, doctrine préservée.

---

### #A1.18 — SL plus longue + 30-40% + durée min
**Lignes vérifiées** : L3465 (Preview) + L4484 (Remaining) + MIN_SL_PROPORTION L1056+ + MIN_SL_DURATION_MIN L1073+.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : moyen. Les "30-40% volume hebdo" a été calibré par profil dans le code (28-40% selon objectif×niveau). Si on supprime cette mention du prompt, Gemini peut placer une SL à 50% du volume (cap code rebascule).
**Si CONDITIONNEL** : OK condenser à `🔴 SL = séance la PLUS LONGUE, ≥${minSlDurForPrompt}min, ~30-40% du volume hebdo.` Garder le "30-40%" explicite. Gain ~30 tokens.

---

### #A1.19 — Max 1 séance intense PdP
**Lignes vérifiées** : L3517 (PdP Preview) + L4395 (PdP Remaining) + enforceWeekConstraints L1500-1517 (cap 2 hard global).
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher)
**Notes** : règle PdP plus stricte que cap global. Garder.

---

### #A1.20 — "PAS de séances > 45 min en débutant"
**Lignes vérifiées** : L3003 buildSafetyInstructions + MAX_SL_DURATION['5K']['deb']=50 + enforceWeekConstraints L1322-1336 (maxNonSlDur).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (pilier #1 sécurité débutant).
**Risque produit** : faible. Code couvre la sécurité. La mention "S1-S4" est pédagogique.
**Si CONDITIONNEL** : OK condenser MAIS garder la mention "Marche/Course ≤50 min" (sinon Gemini peut la couper à 45). Patch : `Séances ≤45 min S1-S4 (Marche/Course ≤50 min).`

---

### #A1.21 — Type "Running" → mapping
**Verdict PM** : ✅ VALIDÉ (= pas de patch)
**Notes** : OK comme ça.

---

### #A1.22 — PROGRESSION +10-15%/sem
**Lignes vérifiées** : L3537 (PdP Preview) + L4413 (PdP Remaining) + enforceFullPlanConstraints L1869-1904.
**Verdict PM** : 🔄 RÉORIENTÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. Le dev propose de supprimer Preview, garder Remaining condensé. Mais L3537 ("Augmentation max : +10-15% par semaine. JAMAIS plus.") est dans le bloc PdP qui ORIENTE Gemini sur la TONALITÉ douce du plan. Sans cette ligne, Gemini peut générer S2=+25% volume vs S1, et le cap code rebascule à +15% → S2 ne progresse PAS comme Gemini l'avait prévu → mainSet incohérent.
**Si RÉORIENTÉ** : NE PAS supprimer L3537. Plutôt supprimer L4413 (Remaining) puisque c'est l'app code qui enforce, et Remaining n'a pas besoin de pédagogie. Inverser le dev : garder Preview, alléger Remaining.

---

### #A1.23 — Récup -30% PdP
**Lignes vérifiées** : L3544 (Preview) + L4405 (Remaining) + calculatePeriodizationPlan L2655-2659 (drop 78-80%).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. Le dev dit "Gemini reçoit la cible finale via weeklyVolumes". VRAI pour le calcul, mais FAUX pour l'EFFORT PERÇU dans l'advice : la mention "SL réduite de 30% (ex: 50 min → 35 min)" guide Gemini à mettre dans l'ADVICE "cette semaine est récup, on lève le pied". Sans cette mention, l'advice peut dire "on monte en volume" alors que c'est une semaine récup → message contradictoire avec le volume affiché.
**Si CHALLENGÉ** : garder L3544 et L4405. Les chiffres prompt ne sont pas pour le calcul (couvert code) mais pour la PÉDAGOGIE de l'advice (non couvert code).

---

### #A1.24 — MIN 48h entre 2 séances qualité
**Verdict PM** : ✅ VALIDÉ (= pas un cas Axe 1, le dev classe correctement)

---

### #A1.25 — Jours préférés EXCLUSIVEMENT
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher)

---

### #A1.26 — Bloc FAISABILITÉ PRÉ-CALCULÉE
**Verdict PM** : ✅ VALIDÉ (déjà couvert #S13 J2)

---

### #A1.27 — Cap MAX_WEEKLY_VOLUME
**Verdict PM** : ✅ VALIDÉ (= pas un cas Axe 1)

---

### #A1.28 — Force intensity allowed values
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher, schéma JSON)

---

### #A2.1 — `data.distance` legacy L2958 dead code
**Lignes vérifiées** : L2958 (`data.distance === 'Marathon' || data.distance === 'Semi-marathon' || (data.distance === 'Trail' && data.trailDistance...)`) + types.ts L17-69 (PAS de champ `distance` ni `trailDistance` dans QuestionnaireData) + L3377 (autre occurrence `data.distance` même bug) + grep confirmé.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (pilier #1 sécurité).
**Risque produit** : moyen. Branche dormante depuis le rename type (2026-04). La réactiver = activation d'un message safety "PRÉCAUTIONS ARTICULAIRES LÉGÈRES pour IMC 25-30 + longue distance". Doctrine sécurité dit OUI, MAIS doctrine #5 "jamais poids/IMC" dit NON puisque le message commence par "🚫 NE JAMAIS mentionner...".
**Si CONDITIONNEL** : appliquer le fix avec adaptation : retirer la mention IMC dans le message visible (déjà fait dans le bloc actuel L2960-2967 qui contient "🚫 NE JAMAIS mentionner le poids, l'IMC..."). Le DESTINATAIRE du message reste l'IA, pas l'utilisateur. Donc le contenu pour l'IA = OK doctrine, le contenu pour l'utilisateur (welcome) = encore filtré.
**Action** : OUI fix le legacy MAIS demander stats Romane d'abord : combien de plans actifs ont IMC 25-30 + long distance ? Si <5%, GO. Si plus, A/B test 10 plans.
**Note historique** : la fonction `buildSafetyInstructions` a été migrée vers le typage moderne, mais ce bloc-ci a été oublié. C'est un VRAI bug latent — pas une feature dormante volontaire.

---

### #A2.2 — `data.estimatedVMA` fallback inutile
**Lignes vérifiées** : L1162 (`const vma = data.vma || data.estimatedVMA;`) + grep `estimatedVMA` (vérifié : utilisé uniquement dans test).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : 0.
**Risque produit** : nul si on ne casse pas le test `periodization.test.ts` L24 qui utilise `data.estimatedVMA`. Or le dev n'a pas vu le test.
**Si CONDITIONNEL** : OK supprimer L1162 MAIS adapter le test simultanément (mettre `data.vma` dans le test). Sinon test cassé.
**Action** : prioriser la correction du test AVANT le patch prompt.

---

### #A2.3 — `weightLossSubGoal` / `weeklyTimeAvailable` jamais utilisés
**Lignes vérifiées** : types.ts L57-58 + grep `weightLossSubGoal` (0 hits hors type def) + `weeklyTimeAvailable` (juste collecté dans Questionnaire.tsx L553-554).
**Verdict PM** : ❌ CHALLENGÉ pour l'option A (enrichir prompt)
**Risque doctrine** : moyen sur option A (pilier #4 nutrition).
**Risque produit** : moyen. `weightLossSubGoal` n'a JAMAIS été utilisé : si on le branche dans le prompt PdP, Gemini va générer des plans différents selon "Tonifier" vs "Brûler des calories" vs "Préparer un événement" — variations non testées. Doctrine "qualité avant vitesse" dit NON.
**Si CHALLENGÉ** : ne pas appliquer option A. Pour option B (supprimer du type) : OK si on est sûr que rien d'autre ne s'y réfère (Questionnaire.tsx, server.js, etc.). Action : grep complet repo puis suppression si vraiment 0 ref.

---

### #A2.4 — Flag `R3_PROMPT_DPLUS_ENABLED` toujours true
**Lignes vérifiées** : L3063 (`const R3_PROMPT_DPLUS_ENABLED = import.meta.env.VITE_R3_PROMPT_DPLUS_ENABLED !== 'false';`) + .env (grep : non défini) + L3090 (check).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. Le flag a été ajouté en R3 (J1) précisément comme KILL-SWITCH en cas de régression D+. Le supprimer = perte de la capacité d'éteindre R3 sans redéployer. Coût garder : 2 L. Coût supprimer : risque opérationnel en cas de bug D+ massif.
**Si CHALLENGÉ** : GARDER le flag. Doctrine "compromis + messages préventifs" préfère un kill-switch à un blocage.

---

### #A2.5 — `previewObjective` factorisation
**Verdict PM** : ❌ CHALLENGÉ
**Notes** : refus factorisation maintenu (doctrine PM J2).

---

### #A2.6 — console.log debug
**Verdict PM** : ✅ VALIDÉ (= ne pas toucher)

---

### #A2.7 — `_dplusRole` marker
**Verdict PM** : ✅ VALIDÉ (= OK pas critique)

---

### #A2.8 — Branche Repos
**Verdict PM** : ✅ VALIDÉ (= cohérent, pas un bug)

---

### #A2.9 — `pdpEfPace`
**Verdict PM** : ✅ VALIDÉ (= utilisé 2×, légitime)

---

### #A2.10 — `vmaSource` adaptation factorisation
**Verdict PM** : ❌ CHALLENGÉ (refus factorisation)

---

### #A2.11 — Garde-fous fréquence asymétrie
**Verdict PM** : ✅ VALIDÉ (= asymétrie cohérente)

---

### #A2.12 — Imports inutilisés
**Verdict PM** : ✅ VALIDÉ (= RAS)

---

### #A3.R1 — RÈGLES ABSOLUES condensation 8→5 L
**Lignes vérifiées** : L3457-3465 (bloc 🚨🚨🚨 RÈGLES ABSOLUES) + chaque sous-règle 🔴.
**Verdict PM** : ❌ CHALLENGÉ (refonte) + ✅ VALIDÉ pour les sous-patches ciblés
**Risque doctrine** : élevé sur la refonte.
**Risque produit** : élevé sur refonte 8→5 L. Chaque ligne 🔴 a une histoire (cf section "Trous produit"). Casser la structure = casser les ancres pédagogiques.
**Si CHALLENGÉ** : refus de la refonte holistique. Accepter patch par sous-règle individuel (#A1.16, #A1.17, #A1.18). Garder les emojis 🔴 et les ascii separators `═══` pour cette section précise (UX dev).

---

### #A3.R2 — Fréquence mentionnée 4× (pas 5×)
**Lignes vérifiées** : L3414 (PROFIL) + L3460 (RÈGLES) + L3722 (INSTRUCTIONS) + L3751 (JSON).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0 (pilier #9 satisfait : freq=X reste dans INSTRUCTIONS L3722 avec "= X-1 running + 1 renfo").
**Risque produit** : faible. Le PROFIL L3414 est en doublon strict avec RÈGLES L3460. Supprimer L3414 propre.
**Recommandation** : appliquer, gain −1 L.

---

### #A3.R3 — Asymétrie Ultra 100km+ Preview/Remaining
**Lignes vérifiées** : L3343-3353 (Preview 7 bullets) + L4231-4234 (Remaining 4 bullets) — MANQUE MATÉRIEL et GESTION D'ALLURE en Remaining.
**Verdict PM** : ⚠️ CONDITIONNEL — Option A (ajouter en Remaining)
**Risque doctrine** : moyen (pilier sécurité ultra).
**Risque produit** : si on choisit B (supprimer en Preview), on PERD du contenu pédagogique sur l'ultra qui est crucial (~0.5% des plans mais valeur perçue énorme — un ultra-trailer voit la qualité du plan plus que tout autre profil). Option A préférée.
**Si CONDITIONNEL** : Option A — ajouter MATÉRIEL + GESTION D'ALLURE en Remaining L4231-4234. +2 L Remaining, cohérence pédagogique. Option C (status quo) acceptable si on veut zéro toucher.

---

### #A3.R4 (super-patch PdP, sous-patches a-f + Remaining)

### #A3.R4.a — Supprimer RENFORCEMENT CADRAGE PdP L3547-3553 (7 L)
**Lignes vérifiées** : L3547-3553 + buildRenfoMainSet renfoService L336+ (override total mainSet+title+duration).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible (le contenu renfo est full écrasé).
**Risque produit** : moyen. VRAI que `buildRenfoMainSet` écrase. MAIS le bloc L3547-3553 contient une règle GLOBALE PdP : "Focus : bas du corps + gainage = protection articulaire + métabolisme" — cette ligne ne sert pas le renfo mais le RAISONNEMENT global du plan PdP (Gemini choisit les conseils de l'advice à partir de cette philo).
**Si CONDITIONNEL** : OK supprimer 5 L sur 7 (lignes purement renfo content). GARDER 2 L : la mention "Focus : bas du corps + gainage = protection articulaire" + "PAS de pliométrie lourde". Gain −5 L au lieu de −7 L.

### #A3.R4.b — Supprimer PROGRESSION VOLUME HEBDO PdP L3533-3538 (6 L)
**Verdict PM** : ❌ CHALLENGÉ (cf "Trous produit" #4)
**Risque produit** : élevé. enforceFullPlanConstraints cap +15% mais ne PRESCRIT pas les ranges 1h20-1h40 / 1h40-2h00. Sans ce bloc, Gemini peut générer S1 à 3h cumulées (cap code rebascule à 2h20). L'utilisateur reçoit alors un plan qui PROMET 3h dans l'advice et AFFICHE 2h20 dans le calendrier → incohérence.
**Si CHALLENGÉ** : garder le bloc. Condensation OK si on garde les RANGES explicites.

### #A3.R4.c — Supprimer SIGNAUX D'ALERTE PdP L3567-3568
**Verdict PM** : ❌ CHALLENGÉ (cf "Trous produit" #5)
**Risque produit** : moyen. `buildSafetyInstructions` met la sécurité en WELCOMEMESSAGE, pas en ADVICE 1ère séance. Canal d'attention différent.
**Si CHALLENGÉ** : garder L3567-3568. La doctrine "compromis + messages préventifs" préfère le surplus de safety au minimalisme.

### #A3.R4.d — Condenser PROGRESSION SL L3540-3545 (6→2 L)
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : moyen. Idem #A1.23 — chiffres prompt pour PÉDAGOGIE advice, pas calcul.
**Si CONDITIONNEL** : OK condenser à 3 L (pas 2) en gardant les 3 paliers chiffrés S1-S3 / S5-S7 / S9-S11 + la mention "Récup -30% (advice doit le mentionner)".

### #A3.R4.e — Condenser EFFORT PERÇU L3555-3559 (5→1 L)
**Lignes vérifiées** : L3555-3559 + #V3 J2 (validé).
**Verdict PM** : ✅ VALIDÉ
**Notes** : aligné avec #V3 J2. La condensation en 1 L proposée préserve les 3 zones (4/10, 6-7/10, 3/10). OK.

### #A3.R4.f — Condenser COHÉRENCE L3570-3573 (4→1 L)
**Verdict PM** : ❌ CHALLENGÉ (cf #A1.15 même argument)
**Risque produit** : élevé. La condensation perd l'exemple chiffré.
**Si CHALLENGÉ** : garder 4 L. Si vraiment besoin de gain, condenser à 2 L max avec exemple "duration=45min → ~5.6km" préservé.

### #A3.R4 Remaining — DIVERSIFIER + RENFO Remaining −8 L
**Lignes vérifiées** : L4396-4404 (DIVERSIFIER 9 L) + L4417 (RENFORCEMENT 1 L).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (pilier #9 séances doivent rester variées).
**Risque produit** : moyen. La condensation DIVERSIFIER 9→2 L perd les 5 exemples concrets. Or les advices générés par Gemini repompent ces exemples (fartlek nature, côtes douces, etc.).
**Si CONDITIONNEL** : OK condenser à 4 L max avec 3 exemples (pas 5). Le RENFO L4417 OK supprimer.

---

### #A3.R5.a — Fix `data.distance` (= #A2.1)
**Verdict PM** : ⚠️ CONDITIONNEL (voir #A2.1)

### #A3.R5.b — Factoriser NO_WEIGHT_MENTION × 5
**Verdict PM** : ❌ CHALLENGÉ (refus factorisation)
**Risque doctrine** : 0 mais doctrine "pas de factorisation".
**Notes** : si factorisation, gain ~100 tokens. Mais on a refusé pour les autres → cohérence.

### #A3.R5.c — Factoriser NO_CROSS_TRAINING × 3
**Verdict PM** : ❌ CHALLENGÉ (refus factorisation)

---

### #A3.R6.a — Label `(récup)` → `↓récup`
**Lignes vérifiées** : L3120 buildDplusPromptBlock.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : 0.
**Risque produit** : nul mais cosmétique. ~5 tokens de gain. Pas prioritaire.
**Si CONDITIONNEL** : à mettre en V6 (lowest priority).

### #A3.R6.b — Supprimer légende "SL ~58% | vallonnée ~37% | footings ~5%"
**Lignes vérifiées** : L3124 + distributeElevationToSessions L1983+ (écrase totalement).
**Verdict PM** : 🔄 RÉORIENTÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. VRAI que `distributeElevationToSessions` écrase. MAIS la légende sert à Gemini pour les ATTRIBUTS textuels (mainSet, advice) qui ne sont PAS écrasés. Sans la légende, Gemini peut mettre dans le mainSet "8 km D+ 300m sur les footings" alors que le code rebascule à 5%.
**Si RÉORIENTÉ** : NE PAS supprimer L3124. Le dev a visé une ligne qui semble "doublon code" mais qui sert l'orientation textuelle. Garder.

### #A3.R6.c — Test `test-r3-prompt-blocks.mjs`
**Verdict PM** : ✅ VALIDÉ (= vérification préalable obligatoire avant tout patch R3)

---

### #A3.R7 — applyTargetTimeOverride / getBestVMAEstimate
**Verdict PM** : ✅ VALIDÉ (= hors scope, OK comme classification)

---

### #A4.1 — Triple emoji 🚨🚨🚨 → 🚨
**Lignes vérifiées** : L3458.
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. Le triple 🚨🚨🚨 a été choisi DÉLIBÉRÉMENT pour le bloc RÈGLES ABSOLUES — c'est la seule section avec ce niveau d'emphase, c'est l'ANCRE visuelle MAX du prompt. Le dev dit "1 emoji suffit" sans preuve. Sur Gemini 2.5-flash, l'expérience J1 montre que la salience MAX d'une section est mémorisée plus durablement par le LLM.
**Si CHALLENGÉ** : garder triple 🚨. Si Romane veut vraiment économiser 10 tokens, OK à passer à 🚨🚨 (2× au lieu de 3×) mais pas à 1×.

---

### #A4.2 — "OBLIGATOIRE" × 38 occurrences, retirer 10
**Lignes vérifiées** : 38 occurrences grep + échantillon des 10 patches.
**Verdict PM** : ⚠️ CONDITIONNEL (3-4 patches OK, pas les 10)
**Risque doctrine** : faible.
**Risque produit** : moyen. Chaque "OBLIGATOIRE" porte un signal de gravité. Retirer 10× = dilution générale du signal.
**Si CONDITIONNEL** : OK sur 4 cibles précises :
- L2990 (DIVERSITÉ OBLIGATOIRE) — OK retirer (🔴 + MAJ suffisent)
- L3429 (LIEU PAR SÉANCE OBLIGATOIRE) — OK retirer (📍 + LIEU PAR SÉANCE suffit)
- L3503 (PdP RÈGLES SPÉCIFIQUES OBLIGATOIRE) — OK retirer
- L3540 (PROGRESSION SL OBLIGATOIRE) — OK retirer (header de bloc)
REFUS sur :
- L3608 / L3614 / L3621 (séance clé Hyrox) — garder, signal critique
- L3722 (INSTRUCTIONS #5 renfo) — garder, c'est le NUMBER ONE bug Gemini (oublier le renfo)
- L3547 (RENFORCEMENT CADRAGE) — déjà discuté #A3.R4.a
- L3555 (EFFORT PERÇU) — déjà condensé #A3.R4.e
- L3587 (PdP HYROX OBLIGATOIRE) — garder

---

### #A4.3 — "JAMAIS" × 22 occurrences condensation
**Lignes vérifiées** : L3489, L3510, L3389, L3032 + grep.
**Verdict PM** : ⚠️ CONDITIONNEL (ciblé)
**Risque doctrine** : faible-moyen (chaque "JAMAIS" est un INTERDIT métier).
**Risque produit** : moyen. Le dev propose 4 condensations. Sur L3032 ("NE JAMAIS mentionner poids/IMC/morphologie...") — refus catégorique : c'est la doctrine #5 sacrée. La forme "NE JAMAIS" + "AUCUN MESSAGE" + "Rester positif et encourageant" est la formulation choisie après 3 itérations sur les bugs de plans qui mentionnaient l'IMC.
**Si CONDITIONNEL** :
- L3510 (whitelist phases PdP) → OK condenser, doctrine OK.
- L3389 (INTERDICTIONS PdP Remaining) → OK condenser, doctrine OK (#S19 J2 déjà aligné).
- L3032 (NO_WEIGHT) → REFUS, garder verbose.
- L3489 → OK whitelist.

---

### #A4.4 — Bloc preview "5. OBLIGATOIRE 1 séance Renforcement"
**Verdict PM** : ⚠️ CONDITIONNEL (cf #A1.11 + #A1.12)
**Notes** : déjà couvert par sous-patches.

---

### #A4.5 — Bloc INSTRUCTION 7→5 items
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : moyen (chaque instruction porte une règle produit).
**Risque produit** : élevé. La refonte 7→5 perd :
- Item 1 "Génère SEULEMENT la semaine 1" → si supprimé, Gemini peut générer multi-semaines (bug observé sur plan Adrien).
- Item 4 "Évaluation faisabilité HONNÊTE avec chiffres" → le dev dit "redondant car feasibility écrasé". FAUX : le bloc feasibility WELCOMEMESSAGE est piloté par Gemini (pas écrasé), seul le champ `feasibility.{status,message}` est écrasé.
- Item 7 "NOMMAGE types" → garde-fou contre Gemini qui invente "Footing", "Cardio", etc. au lieu des types whitelistés.
**Si CHALLENGÉ** : refus de la refonte holistique. Patches individuels OK :
- #A4.4 (item 5 condensé) — OK
- #A1.15 (item 6 condensé) — non, cf #A1.15
- Item 4 — refus suppression.
- Items 1, 2, 3, 7 — garder tels quels.

---

### #A4.6 — Triple emphase VK/Hyrox/IMC
**Lignes vérifiées** : L3327, L3329, L2931, L2933.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen sur L2931-2933 (sécurité IMC).
**Risque produit** : moyen. Sur le bloc IMC ≥35 (L2931-2933), c'est doctrine sécurité MAX, on garde TOUS les emphases. Sur le bloc VK (L3327-3329), OK retirer 1 niveau (le profil VK n'est pas safety-critique).
**Si CONDITIONNEL** : OK pour L3327 + L3329 (VK). REFUS pour L2931 + L2933 (IMC).

---

### #A4.7 — VK PAS un trail classique × 2
**Verdict PM** : ✅ VALIDÉ (= conserver, doctrine "Preview verbose Remaining condensé")

---

### #A4.8 — PROFIL DU COUREUR Preview/Remaining identique
**Verdict PM** : ✅ VALIDÉ (= refus factorisation maintenu)

---

### #A4.9 — Doublon "Allures EXACTES" L3445 vs L3718
**Lignes vérifiées** : L3445 (`⚠️ UTILISE CES ALLURES EXACTES dans chaque séance !`) + L3718 (`2. Allures EXACTES dans chaque mainSet`).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : faible. Doublon strict, suppression L3445 propre. L3718 conserve la règle dans la liste INSTRUCTIONS.

---

### #A4.10 — Hyrox "🔑 Séance clé" × 4 factorisation
**Verdict PM** : ❌ CHALLENGÉ (refus factorisation)

---

### #A4.11 — CATALOGUE Hyrox "→ Phase X" × 5
**Lignes vérifiées** : L3644-3675 (CATALOGUE 8 séances) + L3663-3667 (PHASES juste après).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : moyen. La double mention "→ Phase X" dans le CATALOGUE + le bloc PHASES juste après peut sembler redondante, mais le CATALOGUE est consulté par séance (Gemini choisit), et la mention "→ Phase X" dans chaque entrée du catalogue ANCRE la contrainte par séance.
**Si CONDITIONNEL** : OK retirer 3 sur 5 (séances 2, 3, 4 = Phase développement+). GARDER pour séance 1 (Simulation = phase spécifique uniquement, critique de ne pas l'introduire avant) et séance 5 (Fartlek = dès phase fondamentale S3+, info clé pour Hyrox débutants).

---

### #A4.12 — PHASES Hyrox condensation 5→4 L
**Lignes vérifiées** : L3663-3667.
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : faible.
**Risque produit** : faible. La condensation préserve les 4 phases avec leurs spécificités.

---

### #A4.13 — ADVICE Hyrox 5→2 exemples
**Verdict PM** : ❌ CHALLENGÉ (cf "Trous produit" #10)
**Risque produit** : élevé. Les 5 exemples DIVERSIFIENT volontairement (Footing, Renfo, SL, Marche/Course, Séance clé). Réduire à 2 = exemples plus pauvres = Gemini copie-colle plus.
**Si CHALLENGÉ** : garder 5 exemples. Si vraiment besoin de gain, condenser les 2 plus longs (SL et Séance clé) en 1 ligne chacun, gain −2 L au lieu de −5 L.

---

### #A4.14 — WELCOMEMESSAGE Hyrox 8→4 L
**Lignes vérifiées** : L3695-3702 (8 L).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible (asymétrie avec autres profils notée par dev).
**Risque produit** : moyen. La mini-roadmap S1-3 / S4-6 / S7+ / Affûtage est SPÉCIFIQUE Hyrox et apporte une valeur perçue énorme (l'athlète Hyrox veut comprendre la progression). Si on réduit à "Mini-roadmap : S1-3 base → S4-6 fartlek → S7+ simulations → Affûtage rappels" en 1 ligne, on perd la pédagogie en bullets.
**Si CONDITIONNEL** : OK condenser à 5 L max (pas 4) en gardant 1 bullet par phase et la phrase de clarification.

---

### #A4.15 — Renfo Hyrox 3L → 1L
**Lignes vérifiées** : L3683 (3 L).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (pilier #2 + #3 — Hyrox = course uniquement).
**Risque produit** : moyen. La phrase "Le renfo prépare le corps à supporter le volume de course, pas à exécuter les stations" est la 2e couche de sécurité contre le bug "Renfo Hyrox spécial sled push". La condensation 1-liner perd cette nuance.
**Si CONDITIONNEL** : OK condenser à 2 L en gardant les 2 messages : (1) renfo = prévention course, (2) PAS de lien stations.

---

### #A4.16 — Formule allure EF embarquée L3729
**Verdict PM** : ❌ CHALLENGÉ (cf #A1.15)
**Notes** : même argument, garder la formule.

---

### #A4.17 — Doublon "warmup avec allure"
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A4.18 — Asymétrie ADVICE Hyrox expert/débutant
**Verdict PM** : ✅ VALIDÉ (= hors scope)

---

### #A4.19 — VMA Remaining doublon L4318
**Lignes vérifiées** : L4318 (`VMA du coureur : ${ctx.vma.toFixed(1)} km/h`) + L4320-4329 (ALLURES dérivées).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. La VMA n'est PAS implicite dans les paces (l'utilisateur peut avoir des allures cibles différentes de la VMA estimée — cf cross-check L3205-3221). La mention explicite de la VMA donne le RAISONNEMENT au LLM (par ex pour ajuster un fartlek "à 90% VMA").
**Si CHALLENGÉ** : garder L4318. C'est 1 ligne, et c'est la source des allures.

---

### #A4.20 — Emojis débutants L3313/L4139
**Lignes vérifiées** : L3313 (`🚶‍♂️🏃 IMPORTANT`) + L4139 (`🚶‍♂️🏃 PROGRESSION ... 🚶‍♀️🏃‍♀️`).
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : faible. 4 emojis débutants = stigmatisation potentielle (doctrine "ton positif"). Réduire à 1 emoji ↗.

---

### #A4.21 — Triple "C'est exactement" RPE
**Verdict PM** : ✅ VALIDÉ (= hors scope)

---

### #A4.22 — Bloc "Réponds uniquement"
**Verdict PM** : ✅ VALIDÉ (= optimal)

---

### #A4.23 — Doublon JOUR SL PROFIL L3416 vs RÈGLES L3462
**Lignes vérifiées** : L3416 + L3462.
**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0.
**Risque produit** : faible. RÈGLES porte l'injonction directive, PROFIL porte juste l'info. Suppression L3416 propre.

---

### #A4.24 — Template JSON commentaires neutralisés
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : élevé. Les commentaires inline ("Nom réel du lieu", "Titre unique", "Lieu réel adapté à cette séance") ont été ajoutés après des cas où Gemini mettait `"name": "Plan"` ou `"title": "Séance"`. La neutralisation = retour des génériques. Coût gain : 16 L, mais perte qualité visible immédiatement.
**Si CHALLENGÉ** : garder les commentaires inline. Si vraiment besoin de gain, OK neutraliser SEULEMENT les commentaires triviaux ("string", "Type", "Jour") qui n'ajoutent rien — pas les commentaires qui ORIENTENT (lieu réel, titre unique, adapté à la séance).

---

### #A4.25 — `═══` séparateur → `###`
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : 0.
**Risque produit** : faible côté Gemini (markdown OK). Mais UX dev MOI (Romane) impactée — j'utilise les séparateurs ASCII pour naviguer visuellement dans le code. Le gain ~700 tokens existe mais c'est mon environnement de travail qui se dégrade.
**Si CHALLENGÉ** : REFUS pour V1-V5. Si on doit absolument le faire, V8+ après tout le reste, et seulement sur les Remaining (pas Preview où je passe le plus de temps).

---

### #A4.26 — Variations casse `Récupération`
**Verdict PM** : ✅ VALIDÉ (= conserver, contextes légitimes)

---

### #A4.27 — `À la maison` / `Salle de sport`
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A4.28 — `(advice)` parenthèses explicatives
**Verdict PM** : ✅ VALIDÉ (= conserver, utile pour mapping JSON)

---

### #A4.29 — EXACTEMENT Remaining L4482
**Lignes vérifiées** : L4481-4482.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible.
**Risque produit** : faible. Le 1er "EXACTEMENT" L4481 est essentiel (liste des semaines). Le 2e L4482 est couvert par slice. OK retirer.
**Si CONDITIONNEL** : OK retirer "EXACTEMENT" L4482 → `🔴 CHAQUE semaine doit avoir ${data.frequency} séances.`

---

### #A4.30 — DOUBLON welcomeMessage 9× mentions
**Verdict PM** : ✅ VALIDÉ (= conserver, chaque mention pousse contenu différent)

---

### #A4.31 — PdP IMC overweight L3512 condensation
**Verdict PM** : ❌ CHALLENGÉ (cf "Trous produit" #6)
**Risque produit** : élevé. La condensation "Intensité limitée (cf. règles surpoids globales)" perd "fractionné, fartlek, côtes" qui ne sont PAS couverts par buildSafety générique (qui ne dit que "pas de pliométrie/sauts"). Trou doctrine.
**Si CHALLENGÉ** : garder L3512 telle quelle. Doctrine "compromis + messages préventifs" préfère le surplus.

---

### #A4.32 — `❌` `✅` indicateurs adaptation
**Verdict PM** : ✅ VALIDÉ (= hors scope adaptation)

---

### #A4.33 — `Note: commentaires entre crochets`
**Verdict PM** : ✅ VALIDÉ (= RAS)

---

### #A4.34 — Emojis fonctionnels 📊 📍 🩺
**Verdict PM** : ✅ VALIDÉ (= conserver, aident structure)

---

### #A4.35 — Doublon Récupération type vs titre
**Verdict PM** : ✅ VALIDÉ (= OK comme ça)

---

### #A4.36 — Patron `${X ? Y : ''}` sauts ligne
**Verdict PM** : ✅ VALIDÉ (= conserver lisibilité TS)

---

### #A4.37 — Récap 🔴 🚨 ⚠️ niveaux
**Verdict PM** : ✅ VALIDÉ (= OK)

---

### #A4.38 — Header → systemInstruction
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : 0.
**Risque produit** : moyen. Changement d'API routing impacte caching Gemini et comportement. Hors scope cleanup prompt.
**Si CHALLENGÉ** : NON en V1-V6. Décision à prendre dans un sprint dédié "optimisation API" séparé.

---

### #A4.39 — Continue/SEULEMENT/UNIQUEMENT variations
**Verdict PM** : ✅ VALIDÉ (= OK comme ça)

---

### #A4.40 — DOIS EN PREMIER AVANT (L2913)
**Lignes vérifiées** : L2913.
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (c'est dans le bloc isHighRisk).
**Risque produit** : moyen. La triple emphase "DOIS" + "EN PREMIER" + "AVANT toute autre information" force Gemini à mettre la mention médicale TOUT EN HAUT du welcomeMessage. Sans triple emphase, Gemini peut la mettre en fin de welcomeMessage → message clé invisible.
**Si CONDITIONNEL** : OK condenser MAIS garder la position "EN PREMIER" explicite : `Welcome (1ère ligne, AVANT tout) :` (le dev propose ça, OK).

---

### #A4.41 — Hyrox PAS DE FONCTIONNEL HYROX
**Verdict PM** : ✅ VALIDÉ (déjà couvert #S20 J2)

---

### #A5.1 — Trail<30 D+<500m skip R3
**Verdict PM** : ✅ VALIDÉ (= conserver, assouplissement coach)

---

### #A5.2 — isHighRisk
**Verdict PM** : ✅ VALIDÉ (= NE PAS TOUCHER doctrine sécurité)

---

### #A5.3 — isAmbitiousGoal freq<3
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A5.4 — weight>85 musculature
**Verdict PM** : ✅ VALIDÉ (= hors scope code)

---

### #A5.5 — RED-S BMI<20
**Verdict PM** : ✅ VALIDÉ (= NE PAS TOUCHER doctrine sécurité)

---

### #A5.6 — Plan long >24 sem
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A5.7 — isRestart
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A5.8 — VK + débutant
**Verdict PM** : ✅ VALIDÉ (= OK rare)

---

### #A5.9 — Branche `hyroxFreq >= 5` suppression
**Lignes vérifiées** : L3619-3626 (8 L).
**Verdict PM** : ❌ CHALLENGÉ
**Risque doctrine** : faible.
**Risque produit** : moyen. Le dev dit "0 cas en prod". Vrai sur 110 plans audités, MAIS on n'a pas encore lancé la com Hyrox dédiée. Si un coureur s'inscrit demain en 5 séances Hyrox, il tombe dans le fallback `=== 4` qui sous-couvre (4 items au lieu de 5). Doctrine "sécurité > conversion" : ne pas supprimer un garde-fou pour 8 L.
**Si CHALLENGÉ** : garder la branche. C'est 8 L pour couvrir 100% des cas potentiels Hyrox.

---

### #A5.10 — hyroxPrevTime
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A5.11 — Ultra 70km
**Verdict PM** : ✅ VALIDÉ (= conserver)

---

### #A5.12 — Ultra 100km+
**Verdict PM** : ✅ VALIDÉ (= NE PAS TOUCHER doctrine ultra)

---

### #A5.13 — Hyrox débutant Preview condensation 10→6 L
**Lignes vérifiées** : L3628-3635 (10 L) + L4178-4182 (Remaining 5 L).
**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (pilier #1 sécurité débutant Hyrox).
**Risque produit** : moyen. Les 4 bullets actuels sont calibrés. La condensation 10→6 supprime des détails (allure EA explicite, marche autorisée).
**Si CONDITIONNEL** : OK condenser à 7 L (pas 6) en gardant les 4 bullets actuels + le ${paces?.eaPace} explicite. Gain −3 L au lieu de −4.

---

## Recommandations PM pour application (top 10 patches que je valide à 100%)

1. **#A1.1** — name override : remplacer template par `buildPlanName` injecté direct, gain qualité.
2. **#A1.2** — feasibility template neutralisé : aligné #S13 J2.
3. **#A1.3** — confidenceScore template neutralisé.
4. **#A1.4** — distance template trail simplifié.
5. **#A1.6** — appliquer #S3 J2 en attente.
6. **#A1.12** — Cap durée Renfo supprimé (couvert buildRenfoMainSet).
7. **#A3.R2** — Fréquence PROFIL L3414 supprimée (doublon RÈGLES).
8. **#A3.R4.e** — EFFORT PERÇU PdP condensé (aligné #V3 J2).
9. **#A4.9** — Doublon "Allures EXACTES" L3445 supprimé.
10. **#A4.20** — Emojis débutants réduits à 1 (anti-stigmatisation).
11. **#A4.23** — Jour SL PROFIL L3416 supprimé (doublon RÈGLES).
12. **#A4.29** — EXACTEMENT Remaining L4482 retiré.
13. **#A4.12** — PHASES Hyrox condensé (5→4 L).

Gain total ≈ −14 L + ~150 tokens. Risque ZÉRO. À pousser en 1 commit "Cleanup J2 reliquats + J3 SAFE".

---

## Réorientations principales (le dev a visé la mauvaise ligne ou la mauvaise raison)

1. **#A1.22 PROGRESSION +15%/sem** — dev veut supprimer PREVIEW L3537. NON. Garder Preview, alléger Remaining L4413. Inversion de cible.

2. **#A3.R6.b légende SL ~58% / vallonnée ~37%** — dev dit "écrasé par distributeElevationToSessions". FAUX pour le contenu textuel (mainSet, advice). NE PAS supprimer.

3. **#A2.2 data.estimatedVMA fallback** — dev veut supprimer L1162. OK MAIS faut adapter `periodization.test.ts` L24 simultanément, sinon test cassé. Le dev n'a pas vu le test.

4. **#A4.5 INSTRUCTIONS 7→5 items** — dev veut refonte. NON. Patches individuels OK (items 5, 6, 7), pas refonte. Notamment item 4 "feasibility HONNÊTE" → dev dit "redondant", FAUX (le welcomeMessage feasibility n'est pas écrasé).

5. **#A1.11 mentions "NE PAS générer mainSet renfo" Hyrox** — dev veut supprimer L3674 + L3680. OK supprimer L3674, GARDER L3680 (cible spécifique bug sled push).

6. **#A3.R4.a RENFORCEMENT CADRAGE PdP** — dev veut supprimer 7 L. NON, supprimer 5 L. Garder 2 L (Focus bas du corps + Pas de pliométrie lourde) qui orientent la philo plan.

7. **#A3.R4.d PROGRESSION SL PdP** — dev veut 6→2 L. NON, 6→3 L (garder les 3 paliers chiffrés + récup mention).

8. **#A4.2 OBLIGATOIRE × 10 retraits** — accepter 4 ciblés (L2990, L3429, L3503, L3540), refuser 6 (L3608/3614/3621/3722/3547/3587).

9. **#A4.3 JAMAIS condensations** — accepter 2 (L3489, L3510), refuser 2 (L3032 NO_WEIGHT doctrine, L3389 déjà aligné #S19 J2).

10. **#A4.6 triple emphase** — accepter VK (L3327/L3329), refuser IMC (L2931/L2933 doctrine sécurité).

11. **#A4.11 CATALOGUE Hyrox "→ Phase X"** — dev veut retirer les 5. NON, retirer 3 (séances 2-3-4), garder pour séances 1 (Simulation) et 5 (Fartlek) qui portent contraintes critiques.

12. **#A4.24 template JSON commentaires** — dev veut tout neutraliser (16 L). NON, neutraliser seulement les triviaux ("string", "Type"), garder ceux qui orientent ("lieu réel adapté", "titre unique").

---

## Vagues recommandées (RÉVISÉES par PM)

### V1 — SAFE quick wins (combinable avec patches J2 en attente)
**Patches** : #A1.1, #A1.2, #A1.3, #A1.4, #A1.6 (=#S3 J2), #A1.12, #A3.R2, #A3.R4.e (=#V3 J2), #A4.9, #A4.12, #A4.20, #A4.23, #A4.29.
**Gain** : −14 L + ~150 tokens. **Risque ZÉRO.**

### V2 — Conditionnels CIBLÉS avec garde-fous PM
**Patches** : #A1.11 (partiel), #A1.16 (Preview seul), #A1.17 (garder ±5%), #A1.18 (garder 30-40%), #A1.20 (garder Marche/Course 50min), #A2.1 (fix legacy + check IMC stats), #A2.2 (avec adapt test), #A3.R3 Option A (ajout Remaining ultra), #A3.R4.a (−5 L pas −7), #A3.R4.d (−3 L pas −4), #A3.R4 Remaining (4 L pas 2), #A4.2 (4 cibles), #A4.3 (2 cibles), #A4.6 (VK seul), #A4.11 (3 sur 5), #A4.14 (5 L pas 4), #A4.15 (2 L pas 1), #A4.40, #A5.13 (7 L pas 6).
**Gain** : −20 à −30 L + ~400 tokens. **Risque faible-moyen.** Tests requis : test-r2-matrice.mjs, test-r3-prompt-blocks.mjs, audit 5 profils.

### V3 — REFUSÉS sans appel (à pas appliquer même si dev insiste)
- #A1.7 (condensation PAS d'intensité)
- #A1.8 (max 1 SL condensé)
- #A1.15 / #A1.23 / #A3.R4.b / #A3.R4.c / #A3.R4.f
- #A2.3 option A / #A2.4 / #A2.5 / #A2.10 / #A3.R5.b / #A3.R5.c
- #A3.R6.b
- #A4.1 (triple 🚨)
- #A4.5 (refonte INSTRUCTIONS)
- #A4.10 (factorisation HYROX_KEY)
- #A4.13 (ADVICE 5→2)
- #A4.16 / #A4.19 / #A4.24 / #A4.25 / #A4.31 / #A4.38 / #A5.9

### V4 — Pour décision Romane ultérieure (post-V1+V2)
- #A2.1 (fix legacy data.distance) : OUI/NON avec stats prod IMC 25-30 + long-distance ?
- #A2.3 option B (supprimer du type weightLossSubGoal) : grep complet repo d'abord
- #A3.R3 (asymétrie ultra) : Option A/B/C ?
- #A4.25 (séparateurs ASCII → markdown) : tradeoff UX dev / gain tokens

---

## Statistiques finales

| Vague | Patches PM-validés | Lignes gagnées | Tokens gagnés |
|---|---|---|---|
| V1 SAFE PM | 13 | −14 L | −150 |
| V2 CONDITIONNEL (avec garde-fous) | ~20 | −20 à −30 L | −400 |
| V3 REFUSÉS | 25 | (refusés) | (refusés) |
| V4 Décision PM | 4 | TBD | TBD |
| **Total appliqué possible** | **~33** | **−40 L max** | **−550 tokens** |

**Comparaison avec audit dev** :
- Dev proposait −139 L max.
- PM valide −40 L max (différence : refus de 25 patches = −99 L "économisées" en doctrine).
- Le PM PROTÈGE 99 L de prompt qui portent les acquis produit, contre le risque tokens.

**Doctrine PM appliquée à 100%** :
- Sécurité > conversion : 11 patches challengés sur ce critère.
- Pas de poids/IMC : 1 patch challengé (NO_WEIGHT factorisation et neutralisation).
- Course exclusivement : 1 patch challengé (NO_CROSS_TRAINING factorisation).
- Mode marche-course = débutants : respecté dans toutes les recommandations.
- Inputs client = obligatoires : respecté (allures/dates jamais touchées).
- Compromis + messages préventifs : préféré au minimalisme dev (V3 REFUSÉS).
- Chaque ligne justifiée : 25 lignes refusées avec justification historique (bugs Pierre/Lisa/Manon/Adrien/Hyrox sled).
- Qualité avant vitesse : V2 conditionnels exigent tests obligatoires.

---

**Fin Review PM J3 — 112 patches traités. Doctrine intacte.**
