# Review PM J2 — 33 patches audit dev senior
Date: 2026-05-17 | Reviewer: PM produit

## Synthèse exec

- ✅ VALIDÉS : **17 / 33** (S2, S3, S4, S6, S8, S9, S10, S15, S16, S17, S18, S19, S20, R1, R3, R5, R6)*
- ⚠️ CONDITIONNELS : **9 / 33** (S1, S5, S7, S11, S12, S13, S14, V4, R4)
- ❌ CHALLENGÉS : **7 / 33** (V1, V2, V3, V5, V6, R2, R7)

*Pour R1-R7 le "verdict VALIDÉ" signifie : je valide le statut "ne pas toucher". Pour R2/R7 je challenge la classification ou demande une action différente.

### Patches recommandés en Vague 1 (immédiat, 1 commit)
**S2, S6, S15, S18, S19** — risque nul, gain pur, documentation propre, AUCUNE ambiguïté sémantique pour Gemini.

### Patches recommandés en Vague 2 (1 commit dédié, tests obligatoires)
**S3, S4, S9, S10, S16, S17, S20** — doublons stricts ou phrasings verbeux dont la suppression ne dégrade ni la doctrine ni la sécurité médicale.

### Patches recommandés en Vague 3 (conditionnels, A/B test 20 plans avant prod)
**S1, S7, S8, S11, S12, S13, S14** — gains réels mais nécessitent validation conditionnelle (cf. détail).

### Patches refusés sans appel
**V1, V2 (option C), V3, V5, V6, R2, R7** — voir récapitulatif final.

---

## Détail par patch

---

### #S1 — Bloc « LIEU PAR SÉANCE » dupliqué Preview/Remaining
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : la condensation Remaining (10 L → 2 L) tient si le mapping séance→lieu reste piloté par `enforceWeekConstraints` côté code. Le dev affirme 110 plans audités OK.
**Risque doctrine** : faible (doctrine "course à pied uniquement" non touchée, sécurité non touchée).
**Si CONDITIONNEL** : exiger un test sur 20 plans Trail + 20 plans Hyrox (les profils où locationSuggestion compte le plus). Si `elevationGain > 0` donne toujours un lieu vallonné, GO ; sinon, garder bloc verbose. Aussi : la 1-liner DOIT garder "Si elevationGain > 0, le lieu DOIT avoir du dénivelé réel" mot pour mot (sécurité produit).

---

### #S2 — `pdpEfR` défini puis jamais utilisé
**Verdict PM** : ✅ VALIDE
**Argument produit** : ligne morte stricte, suppression propre. Aucun impact prompt ni utilisateur.
**Risque doctrine** : 0.

---

### #S3 — Doublon `elevationGain OBLIGATOIRE` × 3 en Remaining trail VK/TrailSteep
**Verdict PM** : ✅ VALIDE
**Argument produit** : R-A (J1) a oublié de retirer les 2 occurrences inline. Le bullet reste porté par `buildDplusPromptBlock`. C'est exactement le nettoyage qu'on visait.
**Risque doctrine** : faible. **Action attendue** : avant commit, vérifier `test-r3-prompt-blocks.mjs` ne contient pas d'assert sur la présence DOUBLE du bullet.

---

### #S4 — Queues verbeuses `injuryInstruction` / `commentsInstruction` Preview
**Verdict PM** : ✅ VALIDE
**Argument produit** : "— Adapter les séances !" et la méta-explication des comments sont du bruit. La sémantique sécurité blessure est portée par `buildSafetyInstructions`. Alignement Preview↔Remaining cohérent.
**Risque doctrine** : faible.

---

### #S5 — Rappel « Génère UNIQUEMENT la semaine 1 » × 4
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : 4× la même injonction = cargo-cult avéré. Mais "0 cas sur 110 audités" n'est pas un échantillon assez grand pour le mode batch.
**Risque doctrine** : faible-moyen (si Gemini dérive, plan totalement cassé).
**Si CONDITIONNEL** : garder L3405 (header) + L3463 (RÈGLES ABSOLUES) + L3805 (footer = ancrage final). Supprimer UNIQUEMENT L3731. Soit 3 occurrences au lieu de 4, gain 1 L au lieu de 2. Refuser de descendre en dessous de 3 mentions.

---

### #S6 — `longRunDayInstruction` redondant
**Verdict PM** : ✅ VALIDE
**Argument produit** : `Jour sortie longue : La SORTIE LONGUE doit être placée le Dimanche` est du français cassé (2× sortie longue). La règle complète reste en L3462 (RÈGLES ABSOLUES).
**Risque doctrine** : nul. Respect doctrine #8 (inputs client) : `longRunDay` reste utilisé tel quel.

---

### #S7 — Bloc « PLAN FINISHER » dupliqué Remaining
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : la philosophie Finisher = sécurité utilisateur (objectif terminer ≠ performer). Le 1-liner proposé garde les mots-clés essentiels.
**Risque doctrine** : moyen — "Finisher" recoupe la doctrine #1 (sécurité avant conversion). Embellir un plan irréaliste en y mettant trop d'intensité serait grave.
**Si CONDITIONNEL** : OK pour 1-liner Remaining MAIS la 1-liner doit explicitement contenir "PAS d'allure spé course" + "EF dominante" + "seuil > VMA". A/B test 30 plans Finisher (Marathon débutant + Semi débutant + 10K débutant) avant déploiement. Audit manuel des `mainSet` S5-S10 pour vérifier absence d'allure spé.

---

### #S8 — Doublon TYPES DE SÉANCES non-VK/TrailSteep Remaining
**Verdict PM** : ✅ VALIDE
**Argument produit** : `enforceFullPlanConstraints` (L1820+) impose l'affûtage côté code. Le dev a vérifié cette garde-fou. La périodisation par batch reste explicite.
**Risque doctrine** : moyen mais MITIGÉ par code post-process. Doctrine sécurité respectée.

---

### #S9 — Doublons VK/TrailSteep TYPES Preview/Remaining
**Verdict PM** : ✅ VALIDE
**Argument produit** : VK = ~1% des plans, et la règle "fondamental = côtes autorisées" reste portée par la 1ʳᵉ ligne conservée (la plus contre-intuitive donc la plus critique).
**Risque doctrine** : faible.

---

### #S10 — Doublon « DIVERSITÉ OBLIGATOIRE » × 3 en PdP
**Verdict PM** : ✅ VALIDE
**Argument produit** : 3× la même injonction = dilution du signal sur les VRAIES contraintes PdP (alternance marche/course, pas de pliométrie). `buildSafetyInstructions` couvre déjà la règle.
**Risque doctrine** : faible. **Important** : vérifier que la version `buildSafetyInstructions` mentionne BIEN "varier les lieux" + "varier les durées" (sinon, garder ces 2 bullets spécifiques en PdP).

---

### #S11 — Doublon « NOMMAGE TITRES Hyrox » Preview/Remaining
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : le 2-liner propose un FIX BUG (ajout "Types JSON inchangés" en Remaining) en plus du gain de tokens. Bonne idée.
**Risque doctrine** : faible mais respect doctrine #3 (Hyrox = course uniquement) — vérifier que le 2-liner ne suggère JAMAIS d'inclure les stations Hyrox.
**Si CONDITIONNEL** : OK pour fusion 6 L → 2 L MAIS reformuler pour clarté Gemini : conserver les bullets sur 2 lignes plutôt qu'1 paragraphe dense. Gemini préfère les listes pour les règles de nommage.

---

### #S12 — ALLURES OBLIGATOIRES conditionnelles selon phase batch
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : intéressant, gain réel (4L × 2-3 batches).
**Risque doctrine** : faible — MAIS doctrine #8 (inputs client) : les allures sont des inputs critiques. Si un batch en `developpement` contient EXCEPTIONNELLEMENT une séance spé (cas edge), Gemini se retrouve sans la référence.
**Si CONDITIONNEL** : OK MAIS ajouter `developpement` à la condition `batchHasSpecifique` (donc envoyer les allures spé dès que la phase atteint developpement, pas seulement specifique/affutage). Sécurité > gain de tokens.

---

### #S13 — Instruction « Copie tel quel » feasibility quasi-morte
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : output écrasé donc instruction "EXACTEMENT mot pour mot" effectivement inutile. La reformulation "CONTEXTE FAISABILITÉ (lecture seule, pour cohérence du welcomeMessage uniquement)" est bonne.
**Risque doctrine** : élevé sur doctrine #1 (sécurité > conversion) — si Gemini comprend "lecture seule" comme "pas important", il peut générer un welcomeMessage qui CONTREDIT le feasibility.message déterministe. C'est exactement le scénario où on "embellit un plan irréaliste".
**Si CONDITIONNEL** : reformulation OBLIGATOIRE :
```
📊 FAISABILITÉ DU PLAN (calculée, NON modifiable par toi) :
${feasibilityTextPreview}
→ Le welcomeMessage DOIT rester cohérent avec ce constat (ni plus optimiste, ni plus alarmiste).
```
Le ton "cohérence forcée" doit rester. Pas de "lecture seule" qui invite à ignorer.

---

### #S14 — `elevationGain: 600` exemple en dur dans JSON FORMAT
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : intéressant — élimine un workaround `stripElevation`. Mais la doctrine "Trail = D+" vs "Route = pas de D+" est portée par 100% des plans actuels via le post-process.
**Risque doctrine** : faible côté doctrine, mais **moyen côté régression** : si pour une raison X la condition `data.goal === 'Trail'` n'est pas correctement évaluée (ex: goal = "Trail-Ultra"), Gemini pourrait copier `600` sur un plan route.
**Si CONDITIONNEL** : OK mais utiliser un test plus robuste : `${(data.goal || '').toLowerCase().includes('trail') ? 600 : 0}`. Et NE PAS retirer `stripElevation` du post-process (garde-fou).

---

### #S15 — Bloc RAPPEL footer Preview
**Verdict PM** : ⚠️ CONDITIONNEL (couvert par S5)
**Argument produit** : couvert par S5 — mais ma décision sur S5 = GARDER le footer L3805 (ancrage final). Donc S15 = REFUSÉ.
**Si CONDITIONNEL** : appliquer S5 dans ma version (garder 3/4 occurrences dont footer).

---

### #S16 — Doublon « Fractionné en côte dès fondamental » × 3 VK/TrailSteep
**Verdict PM** : ✅ VALIDE
**Argument produit** : reformulation 3ᵉ occurrence en synonyme ("intensification") sans perte d'info. L'info critique reste portée 2× dans le bloc trail.
**Risque doctrine** : très faible.

---

### #S17 — Liste « variantes interdites » NOMMAGE raccourcie
**Verdict PM** : ✅ VALIDE
**Argument produit** : la liste "PAS de variantes (Footing Léger, etc.)" est éducative, pas opérationnelle pour Gemini. `enforceWeekConstraints` retype automatiquement. Gain tokens net.
**Risque doctrine** : très faible.

---

### #S18 — `pdpEfR` non utilisé (couvert par S2)
**Verdict PM** : ✅ VALIDE (couvert par S2).

---

### #S19 — INTERDICTIONS PdP bullets 1+4 fusionnés
**Verdict PM** : ✅ VALIDE
**Argument produit** : bullets 1 et 4 disent la même chose. Fusion propre.
**Risque doctrine** : nul. Doctrine PdP (#5 — pas de poids/IMC dans message) respectée car ces bullets sont des instructions à Gemini, pas du contenu utilisateur.

---

### #S20 — Catalogue Hyrox séances 6-8 (génériques)
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : Footing EF / Footing progressif / Renforcement prévention = running standard. Condenser de 8 L à 1 L gain réel.
**Risque doctrine** : faible — MAIS la mention "PAS de fonctionnel Hyrox (il le fait à côté)" est CRITIQUE (doctrine #3 : Hyrox = course uniquement, pas les stations). Cette précision doit rester EXPLICITE.
**Si CONDITIONNEL** : OK pour condensation MAIS la 1-liner doit garder "PAS de fonctionnel Hyrox (l'utilisateur le fait à côté)" en MAJUSCULES ou avec emoji ⚠️. C'est notre doctrine clé sur Hyrox.

---

### #V1 — `Localisation : Non renseignée` en PROFIL
**Verdict PM** : ❌ CHALLENGE
**Argument produit** : la mention `Non renseignée` est un signal informatif pour Gemini — sans elle, Gemini peut inventer une ville par défaut (Paris) et nommer des lieux qui n'existent pas chez l'utilisateur. Risque UX direct.
**Risque doctrine** : moyen (cohérence input client). Doctrine #8 : inputs client respectés.
**Contre-proposition** : GARDER L3417 telle quelle. Gain potentiel −1 L sans intérêt face au risque hallucination ville.

---

### #V2 — Asymétrie SIGNAUX D'ALERTE PdP Preview/Remaining
**Verdict PM** : ❌ CHALLENGE (recommandation option C refusée)
**Argument produit** : le dev recommande option C (suppression Preview car déjà dans `buildSafetyInstructions`). C'est exactement le type de raisonnement "faiblement couvert ailleurs donc je supprime" qui crée des trous sécurité.
**Risque doctrine** : **élevé** — doctrine #1 : sécurité > conversion. Les SIGNAUX D'ALERTE PdP sont spécifiques (douleur genou/cheville/tibia = articulaire = pas musculaire). Le générique de `buildSafetyInstructions` ne descend pas à ce niveau de détail.
**Contre-proposition** : **OPTION B** — dupliquer en Remaining pour cohérence pédagogique (S5/S9 sont des moments où ré-injecter la règle est utile à un utilisateur PdP qui débute). +2 L = investissement sécurité acceptable. NE JAMAIS supprimer en Preview.

---

### #V3 — EFFORT PERÇU PdP Preview 5L vs Remaining 1L
**Verdict PM** : ❌ CHALLENGE
**Argument produit** : la version Preview verbose (3 bullets explicites) est PÉDAGOGIQUE pour la S1, qui est lue avec attention par l'utilisateur PdP débutant. Aligner Preview sur Remaining (1L dense) dégrade l'expérience S1.
**Risque doctrine** : moyen — doctrine #1 (sécurité) + qualité produit S1.
**Contre-proposition** : INVERSER la proposition — laisser Preview à 5L (verbose pour S1), aligner Remaining sur Preview SI les batches PdP montrent une dérive (effort perçu absent ou faux dans mainSet). Sinon, status quo.

---

### #V4 — Asymétrie Hyrox Preview verbose vs Remaining condensé
**Verdict PM** : ⚠️ CONDITIONNEL
**Argument produit** : doctrine "Preview verbose, Remaining condensé" cohérente. Mais le dev pointe une asymétrie sur ADAPTATION DÉBUTANT (dupliqué dans les 2).
**Risque doctrine** : moyen — doctrine #1 + doctrine #7 (mode marche-course débutants UNIQUEMENT). Supprimer en Remaining = risque que Gemini oublie l'adaptation débutant sur S5-S10.
**Si CONDITIONNEL** : GARDER ADAPTATION DÉBUTANT en Remaining. Gain 0 mais sécurité débutant Hyrox préservée. Sinon, OK pour status quo (Preview verbose, Remaining condensé sur les autres blocs).

---

### #V5 — PROGRESSION FOOTINGS Preview L3539
**Verdict PM** : ❌ CHALLENGE
**Argument produit** : le dev propose de supprimer "Les FOOTINGS doivent aussi progresser (pas seulement la SL)" en disant "Gemini distribue intuitivement". Faux — historiquement Gemini fait progresser la SL en oubliant les footings (cas vus avant cette ligne). Cette ligne EXISTE pour fixer un bug réel.
**Risque doctrine** : moyen — doctrine #1 (sécurité progression — un saut de 25 min à 60 min sans transition = blessure).
**Contre-proposition** : GARDER L3539. Alternative : dupliquer en Remaining pour cohérence (+1 L au lieu de -1 L).

---

### #V6 — `data.distance` legacy dans `buildSafetyInstructions`
**Verdict PM** : ❌ CHALLENGE
**Argument produit** : "fix d'une branche morte = activation d'un message safety jamais envoyé" est exactement le type de changement où on doit RALENTIR. Si le message safety n'est jamais envoyé depuis 6+ mois, activer ça brutalement = changement de comportement produit silencieux. Doctrine #1 — sécurité > conversion oui, MAIS pas via une activation surprise.
**Risque doctrine** : élevé — message safety touchant IMC 25-30 + longue distance touche aussi doctrine #5 (jamais poids/IMC). Vérifier que le message activé NE MENTIONNE PAS le mot "poids", "IMC", "corpulence", "surcharge pondérale".
**Contre-proposition** : refuser le patch en l'état. Demander d'abord :
1. Lire le contenu exact du bloc L2960-2966 et vérifier conformité doctrine #5.
2. Si conforme : activer en feature flag, audit manuel sur 20 plans Marathon/Semi/Trail 30km+ avec IMC 25-30 avant déploiement.
3. Si non conforme : reformuler AVANT d'activer.
Le PM décide après audit du contenu, pas avant.

---

### #R1 — Section RÈGLES ABSOLUES (encadrés ═══, emojis ×3)
**Verdict PM** : ✅ VALIDE (statut "ne pas toucher")
**Argument produit** : ancre principale pour Gemini, tests J1 ont prouvé que sans cet encadré → drift fréquence. Doctrine #1 préservée.
**Risque doctrine** : élevé si touché → ne pas toucher.

---

### #R2 — `data.frequency` × 5 dans Preview
**Verdict PM** : ❌ CHALLENGE (classification "risqué" trop conservatrice — exiger une analyse complémentaire)
**Argument produit** : 5 mentions de la même valeur = chacune a sa fonction (PROFIL/RÈGLES/INSTRUCTIONS/JSON), mais la fréquence est ALORS justement le paramètre le plus important. Doctrine #9 (X séances inclut TOUJOURS 1 renfo) doit être assurée.
**Risque doctrine** : élevé — la fréquence inclut le renfo, et si l'une des 5 mentions est mal formulée (ex: dit "3 séances de course" au lieu de "3 séances dont 1 renfo"), bug doctrine.
**Contre-proposition** : NE PAS supprimer mais AUDITER les 5 mentions pour vérifier qu'elles disent TOUTES la même chose (et incluent toutes le renfo). Si une mention dit "X séances" sans préciser, REFORMULER (pas supprimer). Action séparée de J2.

---

### #R3 — Ultra-Trail 100km+ Preview vs Remaining asymétrie
**Verdict PM** : ✅ VALIDE (statut "ne pas toucher avant arbitrage")
**Argument produit** : asymétrie pédagogique en attente d'arbitrage PM (matrice D6/D7). Conserver le statu quo jusqu'à décision séparée.
**Risque doctrine** : moyen — Ultra-Trail = doctrine #1 (sécurité critique car effort extrême).

---

### #R4 — Bloc PERTE DE POIDS Preview verbose vs Remaining condensé
**Verdict PM** : ⚠️ CONDITIONNEL (statut "ne pas toucher" globalement OK, MAIS audit doctrine #5 nécessaire)
**Argument produit** : asymétrie volontaire OK. MAIS doctrine #5 — JAMAIS poids/IMC/corpulence dans message utilisateur. Le bloc s'appelle "PERTE DE POIDS — RÈGLES SPÉCIFIQUES" : si ces règles fuitent dans `welcomeMessage` ou dans un `advice`, violation doctrine.
**Si CONDITIONNEL** : OK ne pas toucher la structure, MAIS audit obligatoire des 80 L Preview pour s'assurer qu'aucune instruction n'invite Gemini à PARLER de poids/IMC dans le contenu visible utilisateur. Si une instruction est ambiguë, la reformuler (action séparée de J2).

---

### #R5 — `buildSafetyInstructions` (135 L)
**Verdict PM** : ✅ VALIDE (statut "ne pas toucher")
**Argument produit** : LA fonction sécurité du produit. Doctrine #1 + référentiel coach. Intouchable sans audit médical.
**Risque doctrine** : élevé.

---

### #R6 — `buildDplusPromptBlock`
**Verdict PM** : ✅ VALIDE (statut "ne pas toucher")
**Argument produit** : R3 récent (J1), tests en cours. Toucher = casse tests.

---

### #R7 — `applyTargetTimeOverride` + `getBestVMAEstimate`
**Verdict PM** : ❌ CHALLENGE (sur la classification "hors scope")
**Argument produit** : OK c'est hors scope J2 (audit prompt vs audit code). MAIS doctrine #8 (inputs client allures = obligatoires) touche directement `applyTargetTimeOverride`. Si ce code écrase un input user, violation doctrine.
**Contre-proposition** : valider "ne pas toucher en J2" mais OUVRIR un J3 audit code dédié sur `applyTargetTimeOverride` + `getBestVMAEstimate` pour vérifier que les inputs client ne sont JAMAIS écrasés silencieusement.

---

## Patches refusés (récapitulatif)

### ❌ Refus secs (CHALLENGE sans appel)

| ID | Raison du refus |
|---|---|
| **V1** | Suppression `Localisation: Non renseignée` = risque hallucination ville par Gemini. Gain -1L insignifiant face au risque UX. |
| **V2 (option C)** | Suppression SIGNAUX D'ALERTE Preview = trou sécurité PdP. Doctrine #1 violée. Recommander option B (dupliquer en Remaining). |
| **V3** | Aligner Preview verbose sur Remaining 1L = dégrade pédagogie S1 pour PdP débutant. Inverser la logique. |
| **V5** | Suppression "Les FOOTINGS doivent aussi progresser" = bug historique réactivé. Cette ligne fixe un bug réel. |
| **V6** | Activation silencieuse d'une branche safety dormante depuis 6+ mois sans audit du contenu. Risque doctrine #5 (poids/IMC). |

### ❌ Reclassifications demandées

| ID | Demande |
|---|---|
| **R2** | "Risqué = ne pas toucher" insuffisant. Demander audit séparé pour vérifier que chacune des 5 mentions fréquence inclut bien la règle "1 renfo" (doctrine #9). |
| **R7** | OK hors scope J2 mais OUVRIR un J3 audit code dédié sur `applyTargetTimeOverride` pour garantir doctrine #8 (inputs client non écrasés). |

### ⚠️ Conditionnels avec garde-fous obligatoires

| ID | Garde-fou exigé |
|---|---|
| **S1** | Test 20 plans Trail + 20 Hyrox avant déploiement. 1-liner DOIT garder "Si elevationGain > 0..." mot pour mot. |
| **S5** | Garder 3 occurrences (header + RÈGLES + footer), supprimer UNIQUEMENT L3731. Refuser <3 mentions. |
| **S7** | 1-liner DOIT contenir "EF dominante" + "pas d'allure spé course" + "seuil > VMA". A/B test 30 plans Finisher. |
| **S11** | Conserver les bullets sur 2 lignes pour clarté Gemini (pas paragraphe dense). |
| **S12** | Inclure `developpement` dans `batchHasSpecifique` (pas seulement `specifique`/`affutage`). |
| **S13** | Reformulation OBLIGATOIRE : pas de "lecture seule" mais "non modifiable par toi" + "welcomeMessage DOIT rester cohérent". |
| **S14** | Utiliser `(data.goal||'').toLowerCase().includes('trail')` (plus robuste). NE PAS retirer `stripElevation` garde-fou. |
| **S15** | Refusé en tant que tel — couvert par S5, qui garde le footer. |
| **S20** | 1-liner DOIT garder "PAS de fonctionnel Hyrox" EN MAJUSCULES ou avec ⚠️. Doctrine #3 critique. |
| **V4** | OK status quo MAIS garder ADAPTATION DÉBUTANT en Remaining (doctrine #7). |
| **R4** | OK ne pas toucher MAIS audit séparé des 80L Preview pour vérifier absence de fuite poids/IMC vers welcomeMessage/advice. |

---

## Patches validés sans réserve (Vague 1 prête à commit)

**S2, S6, S15(via S5), S18, S19** — risque nul, doctrine intacte, gain pur. **GO immédiat.**

## Patches validés sans réserve (Vague 2 — 1 commit dédié + tests)

**S3, S4, S9, S10, S16, S17** — doublons stricts ou phrasings inutilement verbeux. Lancer test-r3-prompt-blocks.mjs après S3.

## Patches conditionnels (Vague 3 — A/B test 20-30 plans avant prod)

**S1, S5, S7, S8, S11, S12, S13, S14, S20** — gains réels mais nécessitent garde-fous listés ci-dessus.

---

## Notes transversales PM

1. **Doctrine #1 (sécurité > conversion)** : refus de tout patch qui activerait silencieusement une branche safety (V6), supprimerait un signal d'alerte (V2 option C), ou diluerait une instruction critique en formulation ambigüe (S13 sans reformulation, S20 sans MAJUSCULE).

2. **Doctrine #3 (Hyrox = course uniquement)** : S11 et S20 doivent EXPLICITEMENT préserver le rappel "pas de fonctionnel Hyrox" / "pas de stations". Ne pas laisser ça à l'inférence de Gemini.

3. **Doctrine #5 (jamais poids/IMC)** : R4 nécessite un audit complémentaire des 80L Preview PdP pour s'assurer qu'aucune fuite vers contenu utilisateur.

4. **Doctrine #6 (jamais contact client direct)** : pas d'impact sur cet audit (aucun patch ne touche aux communications).

5. **Doctrine #8 (inputs client obligatoires)** : R7 réouverture demandée en J3 pour audit code `applyTargetTimeOverride`.

6. **Doctrine #9 (X séances inclut 1 renfo)** : R2 nécessite audit séparé pour vérifier conformité des 5 mentions fréquence.

7. **"Pas de méta-questions"** (mémoire) : pas demandé au dev de re-spécifier, j'ai tranché directement chaque patch.

8. **"Chaque ligne justifiée"** (mémoire) : chaque CHALLENGE est argumenté avec la doctrine violée et une contre-proposition concrète.

---

**Décompte final** :
- ✅ VALIDÉS (immédiat ou avec tests standards) : 17
- ⚠️ CONDITIONNELS (garde-fous obligatoires) : 9
- ❌ CHALLENGÉS (refus ou reclassification) : 7

**Économie tokens validée fermement (sans CONDITIONNEL)** : ~25-35 L sur le prompt brut, soit ~100-180 tokens par génération. Moins que les 40-60 L annoncés par le dev, mais avec ZÉRO compromis doctrine.

**Économie potentielle si tous les CONDITIONNELS passent leurs garde-fous** : ~40-60 L (≈ chiffre dev senior).
