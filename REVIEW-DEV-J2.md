# Review dev d'équipe J2 — 33 patches audit dev senior
Date: 2026-05-17 | Reviewer: dev équipe (auteur initial du code)
Base de revue : `geminiService.ts` 5712 L post R-A/B/C/D/F/G/L appliqués.
Source vérifiée ligne par ligne : tous les numéros de ligne de l'audit J2 ont été recroisés avec l'état actuel du fichier.

---

## Synthèse exec

- **VALIDÉS** : 18/33 (S1, S2, S3, S4, S6, S8, S9, S10, S11, S13, S15, S16, S17, S18, S19, S20 + V5, V6)
- **CONDITIONNELS** : 9/33 (S5, S7, S12, S14 + V1, V2, V3, V4 + R3 commenté)
- **CHALLENGÉS** : 6/33 (R1, R2, R4, R5, R6, R7 — couvert "ne pas toucher" ; pas de challenge sur SAFE)

### Bugs silencieux découverts en vérifiant
1. **V6 CONFIRMÉ** : `data.distance` et `data.trailDistance` **n'existent PAS** dans `QuestionnaireData` (types.ts L17-69 vérifié). La branche `imcTier >= 1 + isLongDistance` (geminiService L2958-2967) est **morte en prod depuis la refonte du type `QuestionnaireData` autour de `trailDetails: { distance, elevation }`**. Le message safety "PRÉCAUTIONS ARTICULAIRES LÉGÈRES" n'a jamais été envoyé à aucun utilisateur IMC 25-30 / longue distance.
2. **test-r3-prompt-blocks.mjs DÉSYNCHRONISÉ** : la fonction `buildDplusPromptBlock` réinjectée dans le test (L7-36) NE contient PAS l'instruction R-A `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).` ajoutée par R-A à la version réelle (L3127). Test passera mais ne valide PAS le nouveau comportement. **Hors scope J2 mais à signaler PM**.
3. **S11 fix latent** : le bloc Remaining Hyrox L4177-4182 omet la précision `Types JSON inchangés` — Gemini pourrait générer `type: "Simulation Hyrox"` au lieu de `type: "Fractionné"`. Confirmé en lisant L4181 : seul le NOM est patché, pas le contrat de type. Audit a raison.

---

## Détail par patch

### #S1 — Bloc « LIEU PAR SÉANCE » dupliqué Preview ↔ Remaining
**Verdict dev** : VALIDE
**Analyse technique** : Preview L3429-3437 et Remaining L4474-4483 vérifiés présents. Le bloc Remaining ajoute bien L4483 (`⚠️ Si elevationGain > 0...`). Le mapping séance→lieu est effectivement déductible par Gemini depuis le `type` JSON demandé. Côté code, aucun assert sur le détail du mapping (uniquement présence `locationSuggestion` non vide via planValidator).
**Risque bug silencieux** : faible — sur batches Remaining, Gemini conserve le contexte du week1Summary (L4358) qui contient les locationSuggestion déjà placés par S1. Pas de risque de location absurde.
**Tests requis avant apply** : aucun test unitaire ne string-asserte ce bloc. Validation manuelle : 5 plans de profils différents (route 5K, marathon, trail 30/1500, ultra 100km, Hyrox) → vérifier que les `locationSuggestion` des S2+ restent cohérents avec le type. OK pour apply.
**Si CONDITIONNEL** : —

---

### #S2 — `pdpEfR` défini puis jamais utilisé (ligne morte)
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L4411 (`const pdpEfR = paces?.efPace || '8:00';`). Grep exhaustif sur `pdpEfR` dans le fichier → **1 seule occurrence** (la déclaration). Aucune utilisation aval. Variable copy-paste depuis le bloc Preview où `pdpEfPace` sert L3563 (ALTERNANCE) et L3574 (COHÉRENCE) — sections non ré-injectées en Remaining.
**Risque bug silencieux** : nul. TypeScript ne compile pas plus mal sans (pas de `noUnusedLocals` dans tsconfig actuel mais la ligne disparaît proprement).
**Tests requis avant apply** : `npm run build` doit toujours passer. Aucun test runtime impacté.
**Si CONDITIONNEL** : —

---

### #S3 — Doublon `elevationGain OBLIGATOIRE` × 3 en Remaining trail
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé : L4225 (VK Remaining) et L4240 (TrailSteep Remaining) répètent la ligne, et L3127 dans `buildDplusPromptBlock(context='remaining')` (réinjecté par R-A) la produit aussi. `buildDplusPromptBlock` est appelé L4266 dans `trailSectionRemaining` — donc oui, pour profils VK/TrailSteep le bullet apparaît 2× consécutivement dans le prompt final.
**Risque bug silencieux** : faible. Le bullet R-A dans buildDplusPromptBlock reste actif → l'instruction reste portée 1×.
**Tests requis avant apply** : `test-r3-prompt-blocks.mjs` à mettre à jour pour refléter la version réelle du code (cf. bug silencieux #2). Vérifier que la branche VK/TrailSteep continue à produire `elevationGain` non-zéro dans 100% des séances course. Audit J1 → 100% conforme.
**Si CONDITIONNEL** : —

---

### #S4 — Doublon « PRÉCISIONS / BLESSURE » phrasing verbose Preview
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3298 (`⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`) et L3303 (`📝 PRÉCISIONS DU COUREUR : ... — Prends en compte ces préférences...`). En Remaining L4378-4379, version courte déjà en place. La queue `- Adapter les séances !` est tautologique (Gemini sait que c'est ce qu'il doit faire). La meta-instruction sur les comments est portée par PROFIL DU COUREUR + buildSafetyInstructions.
**Risque bug silencieux** : faible. La sémantique « blessure → adapter » est portée également par les advice systématiques imposés par `buildSafetyInstructions` (L2916, L2922, L2927 : "Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur").
**Tests requis avant apply** : aucun. Validation manuelle 1 plan avec `injuries.hasInjury=true` pour confirmer que l'advice mentionne bien l'adaptation.
**Si CONDITIONNEL** : —

---

### #S5 — Rappel « Génère UNIQUEMENT la semaine 1 » × 4 dans le même prompt Preview
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Vérifié — seulement 3 occurrences trouvées en réalité (et non 4) : L3405 (header), L3463 (RÈGLES), L3731 (INSTRUCTIONS item 1), L3805 (footer). La 4ᵉ est bien L3463 selon comptage. Au final 4 = OK, audit correct.
La proposition de supprimer L3731 + L3805 en gardant L3405 + L3463 est saine côté ratio bruit/signal.
**Risque bug silencieux** : faible-MOYEN. Gemini-2.5-flash en mode JSON strict a tendance à respecter la 1ère contrainte explicite — supprimer 50% des emphases est OK. **MAIS** : la suppression de L3731 implique renumérotation des items 2-7 dans le bloc INSTRUCTIONS (ou laisser `1.` commencer sur `Allures EXACTES`). Si on supprime mal, on casse la numérotation lue par Gemini.
**Tests requis avant apply** : générer 10 plans Preview consécutifs, vérifier que `plan.weeks.length === 1` dans 100% des cas. Si 1 seul cas génère S2+, REVERT.
**Si CONDITIONNEL** : faire la renumérotation des items INSTRUCTIONS proprement (item 1 = "Allures EXACTES…", item 2 = "Message de bienvenue…" etc.) — ne pas laisser un trou ni un `1.` orphelin. Garder L3805 OU le condenser en `🔴 SEMAINE 1 UNIQUEMENT.` (1 emoji-ligne courte).

---

### #S6 — `longRunDayInstruction` factorisation inutile + redondance Preview
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3292-3293 (déclaration `const longRunDayInstruction = ...`) + L3416 (utilisation `- Jour sortie longue : ${longRunDayInstruction}` qui produit le rendu absurde `- Jour sortie longue : La SORTIE LONGUE doit être placée le Dimanche.`). Et L3462 redit la règle dans RÈGLES ABSOLUES (`🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT...`). Remplacer L3416 par `${longRunDay}` direct + supprimer la const.
**Risque bug silencieux** : nul. La règle "SL le ${longRunDay}" reste portée par L3462 + Remaining L4377 (`- Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}`).
**Tests requis avant apply** : aucun.
**Si CONDITIONNEL** : —

---

### #S7 — Bloc « PLAN FINISHER » Preview ↔ Remaining (7 L identiques)
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé Preview L3719-3726 et Remaining L4463-4470. Corps strictement identique (6 bullets). Différence : Preview a `!goal.includes('Hyrox')` dans la condition L3719 et Remaining ne l'a pas L4463 (réel — vérifié à la lecture). Cohérent car `isFinisherTarget(targetTime)` est false pour Hyrox en pratique (targetTime au format "1h15" et non "Finisher").
Condensation proposée en 1 ligne : reprend les 2 clés essentielles (EF dominante + pas d'allure spé course + SL EF).
**Risque bug silencieux** : faible-MOYEN. La philosophie Finisher est portée par `plan.targetTime === 'Finisher'` + le contexte figé dans week1Summary, **MAIS** Gemini en batch S6-S9 (phase spécifique) a tendance à introduire un seuil long ou une simulation chrono — c'est précisément la dérive que le rappel verbose voulait éviter. Risque de régression silencieuse sur les profils Finisher avancés.
**Tests requis avant apply** : générer 5 plans Finisher (Semi + Marathon, niveaux Inter et Confirmé), batches complets, vérifier qu'aucune séance n'a `targetPace` égale à une `allureSpecifique*` en phase spécifique. Si dérive observée → renforcer la 1-liner avec `+ pas de simulation chrono`.
**Si CONDITIONNEL** : condenser à 2 lignes au lieu de 1 pour conserver les 3 anchors `EF dominante / pas d'allure spé course / pas de simulation chrono / SL toujours EF`.

---

### #S8 — Doublon TYPES DE SÉANCES par phase Remaining (non-VK/TrailSteep)
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L4400-4403 dans buildRemainingPlanPrompt. Strictement identique à Preview L3488-3491. En Remaining, la `phase` de chaque semaine du batch est explicitement listée L4364-4367 + le contexte allures L4344-4353 — ces 4 lignes sur "developpement = +Fractionné, specifique = +Seuil long..." sont redondantes avec la sémantique standard que Gemini infère du nom de phase.
**Risque bug silencieux** : MOYEN. `enforceFullPlanConstraints` (L1820) impose effectivement l'affûtage côté code (vérifié) et `enforceWeekConstraints` (L1230) limite la SL. Le filet de sécurité existe. Toutefois, si Gemini propose `Fractionné VMA` en phase `affutage` (au lieu de `affutage = volume bas + rappels`), le code ne retypera pas la séance — l'utilisateur recevra un affûtage chargé. À surveiller.
**Tests requis avant apply** : générer 3 plans Marathon Confirmé (14 sem), vérifier qu'en S12-S13 (affûtage), le volume hebdo respecte `weeklyVolumes[12-13]` (-30% à -50% du pic). Si dérive volume affûtage > +10% → revert.
**Si CONDITIONNEL** : garder uniquement la ligne `recuperation` (la plus à risque de dérive) :  `- recuperation : footing EF uniquement + Renforcement léger. PAS d'intensité.`

---

### #S9 — Doublon TYPES VK/TrailSteep Preview ↔ Remaining (5 L)
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé Preview L3468-3472 et Remaining L4387-4391 strictement identiques caractère pour caractère. Garder uniquement la ligne `fondamental` (L4387) car elle contient l'info contre-intuitive (côtes dès le fondamental pour VK/Trail raide, contre-doctrine trail standard). Les phases dev/spé/affût/récup sont déductibles.
**Risque bug silencieux** : faible. VK ~1% du trafic prod (audit J1).
**Tests requis avant apply** : générer 2 plans VK + 2 plans TrailSteep complets, vérifier qu'aucune phase `recuperation` ne contient de Fractionné. `enforceFullPlanConstraints` ne filtre PAS l'intensité en récup → c'est précisément le risque.
**Si CONDITIONNEL** : —

---

### #S10 — Doublon « DIVERSITÉ OBLIGATOIRE » × 3 (buildSafetyInstructions + PdP × 2)
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé : `buildSafetyInstructions` L2990-2996 (avec `isPertePoids` check pour MAX SL — c'est le BLOC LE PLUS RICHE des 3), PdP Preview L3578-3582 (5 L), PdP Remaining L4454-4458 (5 L). Les versions PdP-internes sont moins riches que la version safety (qui distingue freq 3 vs 4 et a une logique SL × isPertePoids). Donc supprimer les 2 versions PdP **n'enlève rien d'unique** ; on garde la meilleure.
**Risque bug silencieux** : faible. La version `buildSafetyInstructions` est appliquée à TOUS les prompts (Preview L3755, Remaining L4472, vérifié).
**Tests requis avant apply** : générer 3 plans PdP, vérifier que chaque semaine a 0 doublon titre+format (déjà testé J1 → 100% conforme). OK pour apply.
**Si CONDITIONNEL** : —

---

### #S11 — Doublon « NOMMAGE TITRES Hyrox » Preview ↔ Remaining + fix bug latent Types JSON
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé Preview L3688-3694 (7 L) et Remaining L4177-4181 (5 L). Différence cruciale : L3693 Preview spécifie `- Types JSON inchangés : "Jogging", "Sortie Longue", "Fractionné", "Renforcement", "Marche/Course"` — **ABSENT** côté Remaining. Bug latent confirmé : Gemini en batch S2+ pourrait écrire `type: "Simulation Hyrox 8×1km"` au lieu de `type: "Fractionné"`, ce qui casse `enforceWeekConstraints` (qui matche sur le type).
**Risque bug silencieux** : faible mais **bug fix réel inclus**. La 1-liner proposée par l'audit condense + corrige.
**Tests requis avant apply** : générer 1 plan Hyrox 12 sem complet (avec phase spécifique = simulations). Vérifier que toutes les séances `Simulation Hyrox` ont `type: "Fractionné"` (et non `type: "Simulation Hyrox"`). Si dérive → bug pré-existant qu'on aurait découvert.
**Si CONDITIONNEL** : —

---

### #S12 — ALLURES OBLIGATOIRES Remaining conditionnelles (phase specifique/affutage)
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé L4344-4353 — toujours 9 L (5 zones de base + 4 allures spé). Pour les premiers batches (S2-S5 ou S2-S4 selon plan), la phase est `fondamental` ou `developpement`, donc les 4 allures `allureSpecifique*` sont effectivement inutilisées par Gemini.
**Risque bug silencieux** : faible. Mais ajout d'une condition `batchHasSpecifique` augmente la surface de code. Risque MOYEN : un plan court 8 sem peut avoir `phase[3]=specifique` (S4) qui tombe dans le batch S2-S4 (BATCH_SIZE=3) — il faut vérifier que la condition couvre `affutage` ET `specifique` (et idéalement le batch précédent l'attaque spé, pour préparer Gemini à introduire la notion).
**Tests requis avant apply** : générer plans 8/12/16/20 sem en isolant les batches générés, vérifier qu'aucune séance phase `specifique` ne mentionne une allure absente du prompt (ce qui ferait paniquer Gemini ou produirait une allure inventée).
**Si CONDITIONNEL** : ajouter une marge : si le batch CONTIENT specifique/affutage OU si le batch SUIVANT en contient, injecter les 4 allures spé. Evite l'effet "Gemini ne connaît plus l'allure marathon en S5 alors que S6 va l'utiliser". Patch sûr = injecter dès que le batch contient phase `developpement` (qui prépare à spé).

---

### #S13 — `feasibilityTextPreview` instruction « Copie-le tel quel »
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3751-3753 (3 L verbose) + L4059-4066 (override déterministe complet : `plan.feasibility = { status, message, safetyWarning, recommendation }` + `plan.confidenceScore = feasibilityResultPreview.score`). Donc oui, tout ce que Gemini produit dans `feasibility` est jeté. L'instruction "copie tel quel" sert uniquement à conditionner le ton du welcomeMessage (cohérence indirecte).
**Risque bug silencieux** : très faible. La version condensée audit conserve la sémantique (contexte pour welcomeMessage).
**Tests requis avant apply** : 5 plans → vérifier que `plan.feasibility.message === feasibilityResultPreview.message` (devrait être 100%). OK pour apply.
**Si CONDITIONNEL** : —

---

### #S14 — JSON FORMAT : `"elevationGain": 600` exemple en dur
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé L3793 (`"elevationGain": 600,` dans le template JSON exemple). Sur plans NON-trail, le `stripElevation` post-process L4046-4056 force à 0 — donc le 600 en exemple est techniquement compensé. Substitution conditionnelle proposée : `${data.goal === 'Trail' ? 600 : 0}` — saine.
**Risque bug silencieux** : faible. **MAIS** : `stripElevation` ne s'exécute que pour la Preview (L4046) — vérifier qu'il existe une logique équivalente pour Remaining batches. Grep `stripElevation\|non-trail.*D+` → uniquement L4046 trouvé. Donc en Remaining, si Gemini copie `600` sur un plan non-trail, c'est conservé. La substitution conditionnelle **résout un vrai bug en Remaining** (audit n'a pas vu cette dimension).
**Tests requis avant apply** : grep dans 110 plans audités J1 → vérifier qu'aucun plan non-trail n'a `elevationGain > 0` en S2+. Si oui, on a une régression silencieuse pré-existante que ce patch corrige.
**Si CONDITIONNEL** : appliquer ET ajouter le `stripElevation` équivalent en Remaining (geste défensif). Sinon, modifier le template L4505 (Remaining JSON) aussi pour mettre `0` par défaut sur non-trail.

---

### #S15 — Bloc RAPPEL footer Preview (couvert par S5)
**Verdict dev** : VALIDE (déjà inclus dans S5)
**Analyse technique** : Identique à la 4ᵉ occurrence de S5. Pas de risque additionnel.
**Risque bug silencieux** : nul (couvert S5).
**Tests requis avant apply** : couvert par S5.
**Si CONDITIONNEL** : —

---

### #S16 — Doublon « Fractionné en côte dès fondamental » × 3 VK/TrailSteep
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé Preview L3332 (bloc VK), L3341 (bloc TrailSteep), L3469 (TYPES). Et Remaining L4222, L4237, L4388. Sur un plan VK Preview, l'info "côtes dès fondamental" apparaît 3× textuellement. Le remplacement L3469 par `developpement : + intensification (côtes courtes/longues, seuil en montée).` retire la répétition explicite tout en gardant le contenu phase developpement.
**Risque bug silencieux** : très faible. L'info reste dans le bloc trail (L3332/L3341) qui est le plus visible structurellement.
**Tests requis avant apply** : générer 1 plan VK 12 sem, vérifier que S1-S3 (fondamental) contient au moins 1 séance côtes/fractionné en côte.
**Si CONDITIONNEL** : —

---

### #S17 — Bloc 7. NOMMAGE Preview : liste interdits raccourcie
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3745 (1 L conditionnelle ~280 chars). `enforceWeekConstraints` L1258-1260 retype automatiquement les "Sortie Longue" mal typées (`Running` → `Sortie Longue`). Le post-process couvre les cas critiques. La liste éducative "Footing Léger / Endurance Fondamentale / VMA / Seuil" est cargo-cult.
**Risque bug silencieux** : très faible. Le retype automatique côté code reste actif.
**Tests requis avant apply** : générer 5 plans variés, vérifier qu'aucune session n'a `type` hors enum autorisé (déjà testé J1).
**Si CONDITIONNEL** : —

---

### #S18 — Variables PdP Remaining (couvert S2)
**Verdict dev** : VALIDE (déjà inclus dans S2)
**Analyse technique** : Audit exhaustif vérifié : `pdpVmaR, pdpIsLowVMAR, pdpBmiR, pdpIsOverweightR, pdpMaxSLminR, pdpNeedsMCR` tous utilisés. Seul `pdpEfR` est mort. Pas de variable additionnelle à supprimer.
**Risque bug silencieux** : nul.
**Tests requis avant apply** : `npm run build` (TS strict).
**Si CONDITIONNEL** : —

---

### #S19 — INTERDICTIONS ABSOLUES PdP : bullets 1+4 fusionnés
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3509 (`JAMAIS d'allure spécifique semi/marathon/course/5k/10k dans les mainSet`) et L3512 (`JAMAIS "allure spé" ou "allure course" dans aucun mainSet`). Doublon strict (formulation différente, sémantique identique). Fusion saine. **NOTE** : version Remaining L4418 a déjà fusionné les deux interdictions en 1 ligne (`INTERDICTIONS : JAMAIS d'allure spé course, JAMAIS de phase spécifique/affûtage, JAMAIS de VMA/fractionné intense en fondamental, JAMAIS "allure spé" dans les mainSet.`) — Preview est en retard de cette factorisation.
**Risque bug silencieux** : nul.
**Tests requis avant apply** : générer 1 plan PdP, vérifier qu'aucun mainSet ne contient "allure spé" / "allure marathon" / "allure 5k" / "allure 10k".
**Si CONDITIONNEL** : —

---

### #S20 — CATALOGUE Hyrox : séances 6-8 condensées
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3668-3675 (séances 6 Footing EF, 7 Footing progressif, 8 Renforcement prévention). Ces 3 séances sont du running standard non-spécifique Hyrox — Gemini les connaît. La condensation en 1 ligne est raisonnable.
**Risque bug silencieux** : faible. **MAIS** la note L3675 "PAS de fonctionnel Hyrox (il le fait à côté). Focus protection articulaire" est doctrine produit critique (cf. doctrine "course à pied uniquement", `feedback_jamais_contact_client` + scope Hyrox = course seulement). La condensation proposée par l'audit préserve cette mention. Bon.
**Tests requis avant apply** : générer 1 plan Hyrox, inspecter les advice des séances Renforcement : aucune mention de wall balls/sled/burpees.
**Si CONDITIONNEL** : —

---

### #V1 — PROFIL : « Localisation : ${data.city || 'Non renseignée'} »
**Verdict dev** : CONDITIONNEL
**Analyse technique** : L3417 confirmé. Lorsque `data.city` est vide, le PROFIL affiche `Localisation : Non renseignée` — utile pour empêcher Gemini d'inventer une ville. Si `data.city` est rempli, le bloc L3421-3438 (`📍 LIEUX D'ENTRAÎNEMENT` + `📍 LIEU PAR SÉANCE`) prend le relais avec 17 lignes verbeuses.
**Risque bug silencieux** : faible-MOYEN. Sans la ligne PROFIL, si `data.city` vide, Gemini pourrait inventer ("Paris" par défaut) car aucun signal explicite "pas de ville".
**Tests requis avant apply** : générer 5 plans `data.city = undefined` → vérifier `plan.location === ''` et aucune mention ville inventée dans welcomeMessage/locationSuggestion.
**Si CONDITIONNEL** : garder L3417 — coût 1 L négligeable vs risque ville inventée. Sinon, ajouter un guard `${!data.city ? '⚠️ Aucune ville renseignée — locationSuggestion="" pour toutes les séances.' : ''}`.

---

### #V2 — Bloc SIGNAUX D'ALERTE PdP Preview asymétrique
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé Preview L3568-3569. Remaining n'a pas de bloc équivalent. La doctrine "buildSafetyInstructions impose advice qui mentionne d'écouter son corps" (L2916/2922/2927) est appliquée à TOUS les prompts. Donc l'**Option C audit (suppression Preview)** tient techniquement.
**MAIS** : la formulation spécifique "douleur au genou/cheville/tibia → marcher" est PLUS riche que le générique "écouter son corps / ne pas forcer en cas de douleur" de buildSafetyInstructions. Pour un profil PdP (souvent reprise après pause, articulations peu sollicitées), c'est une info à VALEUR coach réelle.
**Risque bug silencieux** : MOYEN. Supprimer = perdre une formulation médicalement utile pour le public le plus vulnérable. Garder asymétrique = OK doctrine (S1 = première impression).
**Tests requis avant apply** : aucun (décision PM/coach).
**Si CONDITIONNEL** : recommandation perso = garder Preview (Option A = status quo). La doctrine `feedback_securite_avant_conversion` valorise la transparence sécurité, pas la concision. -2L ne vaut pas la perte d'un signal sécurité spécifique à un public à risque.

---

### #V3 — EFFORT PERÇU PdP Preview verbose vs Remaining 1L
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé Preview L3556-3560 (5 L) et Remaining L4448 (1 L). L'asymétrie est de la dette technique (Remaining condensé plus tard sans backport). La version 1L de Remaining est complète (couvre Jogging/SL/Fartlek/Récup).
**Risque bug silencieux** : faible. Gemini comprend "effort perçu 4/10 — conversation facile" sans avoir besoin du format multi-lignes.
**Tests requis avant apply** : générer 1 plan PdP Preview avec et sans la version verbose. Comparer si les mainSet S1 mentionnent bien l'effort perçu (sans tomber dans le piège "effort 8/10" pour un Jogging).
**Si CONDITIONNEL** : aligner Preview sur Remaining (1L) — gain net −4L, risque pédagogique faible. Test A/B 20 plans recommandé par audit, OK pour valider en interne.

---

### #V4 — Asymétrie Hyrox Preview verbose vs Hyrox Remaining condensé
**Verdict dev** : CONDITIONNEL
**Analyse technique** : Confirmé Preview L3587-3717 (~131 L) vs Remaining L4170-4204 (~35 L). Doctrine "Preview = first impression verbose, Remaining = condensé" respectée. Sauf doublon ADAPTATION DÉBUTANT (Preview L3635-3642 vs Remaining L4198-4202).
**Risque bug silencieux** : MOYEN sur la suppression Remaining ADAPTATION DÉBUTANT. Le bloc Hyrox-débutant inclut "Semaines 1-3 PAS de séance seuil. Simulation Hyrox PAS AVANT phase spécifique" — règles dures que Gemini en batch S2-S4 (phase developpement) pourrait violer si on retire l'ancre.
**Tests requis avant apply** : générer 5 plans Hyrox VMA<12 (débutant), 12 sem complets. Vérifier qu'aucune séance Simulation Hyrox 8×1km n'apparaît en phase fondamental/developpement (S1-S6 typiquement). Si dérive → garder l'ADAPTATION DÉBUTANT Remaining.
**Si CONDITIONNEL** : NE PAS supprimer ADAPTATION DÉBUTANT Remaining. Garder asymétrie globale (Preview verbose OK) mais cette sous-section spécifique est un garde-fou comportemental, pas un doublon pédagogique.

---

### #V5 — Bloc PROGRESSION VOLUME PdP Preview L3539 (1 L additionnelle)
**Verdict dev** : VALIDE
**Analyse technique** : Confirmé L3539 (`Les FOOTINGS doivent aussi progresser (pas seulement la SL) : de 25-30 min (S1) à 35-45 min (S9-S11).`). Remaining L4442 a une formulation équivalente plus courte (`Max +10-15%/semaine. Les FOOTINGS progressent aussi (25-30 min → 35-45 min).`). La règle est donc déjà portée Remaining. En Preview, la PROGRESSION VOLUME L3534-3538 + PROGRESSION SL L3541-3546 couvrent déjà l'idée (volume hebdo augmente + SL augmente). La ligne footings est implicitement portée par "augmenter +10-15% par semaine".
**Risque bug silencieux** : faible. Gemini 2.5-flash distribue naturellement la progression sur tous les types quand on dit "+10-15% par semaine".
**Tests requis avant apply** : générer 1 plan PdP Preview 12 sem, vérifier que la durée des footings S1 vs S9 montre bien une progression (25min → 35-45min).
**Si CONDITIONNEL** : —

---

### #V6 — `data.distance` legacy dans buildSafetyInstructions L2958
**Verdict dev** : VALIDE — BUG SILENCIEUX CONFIRMÉ
**Analyse technique** : Vérifié dans `/Users/romanemarino/Coach-Running-IA/src/types.ts` L17-69 : `QuestionnaireData` ne contient ni `distance` ni `trailDistance`. La condition L2958 est **TOUJOURS FALSE en prod**. Le bloc `imcTier >= 1 + isLongDistance` (L2960-2966) "PRÉCAUTIONS ARTICULAIRES LÉGÈRES" n'a JAMAIS été envoyé. Une catégorie d'utilisateurs (IMC 25-30 préparant Marathon/Semi/Trail 30+) ne reçoit pas le message sécurité prévu pour eux.
**Risque bug silencieux** : MOYEN (côté impact safety). Si on corrige la condition (`data.subGoal === 'Marathon'...`), on **active** un message safety dormant — comportement nouveau pour des utilisateurs existants.
**Tests requis avant apply** : 1) confirmer avec la base prod combien d'utilisateurs IMC 25-30 + subGoal Marathon/Semi-Marathon ou trailDetails.distance >= 30 existent (estimation impact). 2) générer 1 plan profil cible (IMC=27, subGoal=Marathon) → vérifier que le bloc safety apparaît bien et que le ton est encourageant (pas stigmatisant).
**Si CONDITIONNEL** : appliquer le fix de l'audit. ATTENTION : la doctrine `feedback_jamais_poids_minceur` interdit toute mention IMC/poids/corpulence dans le message utilisateur final — relire le bloc activé pour s'assurer qu'il respecte cette règle. Le bloc audit L2960-2966 actuel se termine par `🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence...` — donc le bloc est déjà doctrine-compliant, OK.

---

### #R1 — Section RÈGLES ABSOLUES Preview L3457-3465
**Verdict dev** : CHALLENGE (mais audit a raison de ne PAS toucher)
**Analyse technique** : Confirmé L3457-3465 (encadré `═══` + `🚨🚨🚨` + 5 bullets `🔴`). Cet encadré est l'ancre principale de salience visuelle pour Gemini. Tout test J1 sans cet encadré → drift fréquence +10/110.
**Risque bug silencieux** : élevé (si on touchait).
**Tests requis avant apply** : N/A — ne pas toucher.
**Si CHALLENGE** : aucun défi. Confirmer "ne pas toucher" — l'audit est correct, c'est une zone "load-bearing prompt".

---

### #R2 — Doublon `data.frequency` × 5 dans Preview
**Verdict dev** : CHALLENGE (audit a raison de ne PAS toucher)
**Analyse technique** : Vérifié grep `data.frequency` Preview : L3414 (PROFIL), L3460 (RÈGLES), L3735 + L3736 (INSTRUCTIONS), L3765 (JSON sessionsPerWeek). Chaque mention sert une fonction distincte (contexte, injonction, calcul renfo, schema output).
**Risque bug silencieux** : élevé (la fréquence est la contrainte la plus violée par Gemini avant les patches répétitifs).
**Tests requis avant apply** : N/A.
**Si CHALLENGE** : aucun défi. Confirmer.

---

### #R3 — Bloc ULTRA-TRAIL 100km+ Preview L3343-3353 vs Remaining L4255-4258
**Verdict dev** : CHALLENGE (en attente arbitrage PM)
**Analyse technique** : Confirmé Preview L3343-3353 a 7 anchors (BACK-TO-BACK, MARCHE EN CÔTE, NUTRITION, MATÉRIEL, GESTION D'ALLURE, Renfo, D+). Remaining L4255-4258 a 4 anchors (BACK-TO-BACK, marche montée, SL pic, allure ultra) — MATÉRIEL et GESTION D'ALLURE absents. Asymétrie réelle.
**Risque bug silencieux** : élevé (perdre MATÉRIEL = utilisateur ne s'entraîne pas avec sac/bâtons → blessure/inadaptation course).
**Tests requis avant apply** : N/A (en attente PM).
**Si CHALLENGE** : recommander à PM de **trancher Option B** = ajouter MATÉRIEL + GESTION D'ALLURE en Remaining (+3L par batch ultra100). Coût négligeable, sécurité utilisateur gagnée. Ne pas appliquer J2.

---

### #R4 — Bloc PLAN PERTE DE POIDS Preview vs Remaining (asymétrie volontaire)
**Verdict dev** : CHALLENGE (audit a raison de ne PAS toucher)
**Analyse technique** : Asymétrie volontaire (cf. MATRICE_DOUBLONS D6). Preview L3503-3584 (~80 L verbose pour cadrer philosophie S1) vs Remaining L4413-4460 (~48 L condensé). C'est la doctrine "Preview verbose / Remaining condensé".
**Risque bug silencieux** : élevé si on touche.
**Tests requis avant apply** : N/A.
**Si CHALLENGE** : aucun défi.

---

### #R5 — `buildSafetyInstructions` L2912-3047
**Verdict dev** : CHALLENGE (audit a raison de ne PAS toucher)
**Analyse technique** : Confirmé L2890-3049 (~160 L). Chaque bloc est métier (RED-S, IMC tiers, senior, reprise, weight loss). Toucher = risque safety. Audit J1 validé.
**Risque bug silencieux** : très élevé (safety = produit critique).
**Tests requis avant apply** : N/A.
**Si CHALLENGE** : aucun défi. **EXCEPTION** : V6 corrige une ligne morte dans cette fonction → c'est légitime car restauration de comportement initialement voulu, pas modification.

---

### #R6 — `buildDplusPromptBlock` L3089-3134
**Verdict dev** : CHALLENGE (audit a raison de ne PAS toucher la logique)
**Analyse technique** : Confirmé L3089-3134. R3 récent + R-A vient d'y ajouter la ligne `elevationGain OBLIGATOIRE`. Test `test-r3-prompt-blocks.mjs` désynchronisé (cf. bug silencieux #2).
**Risque bug silencieux** : élevé (touche le calcul D+ qui pilote la fidélité Trail).
**Tests requis avant apply** : N/A.
**Si CHALLENGE** : aucun défi sur la fonction. **MAIS** noter le bug silencieux #2 (test à resync) — hors scope J2 mais à reporter PM.

---

### #R7 — `applyTargetTimeOverride` + `getBestVMAEstimate`
**Verdict dev** : CHALLENGE (audit a raison — hors scope prompt)
**Analyse technique** : L992-1020 et L183-280. Cœur du calcul VMA/allures. Pas une zone prompt.
**Risque bug silencieux** : élevé si touché.
**Tests requis avant apply** : N/A.
**Si CHALLENGE** : aucun défi.

---

## Patches refusés (récapitulatif)

Aucun patch SAFE (S1-S20) entièrement refusé.

**5 patches CONDITIONNELS avec contrepartie technique** :

| ID | Condition à remplir |
|---|---|
| S5 | Renuméroter items INSTRUCTIONS proprement ; garder OU le footer OU un emoji-ligne courte. |
| S7 | Condenser à 2L (pas 1L) pour garder `pas de simulation chrono` + tester sur 5 Finisher avancés. |
| S8 | Garder la ligne `recuperation` (la plus à risque de dérive intensité). |
| S12 | Marge sécurité : injecter allures spé dès phase `developpement` (préparation au batch suivant). |
| S14 | Ajouter `stripElevation` équivalent en Remaining OU forcer template Remaining L4505 aussi. |

**4 patches À VALIDER (V) avec recommandation** :

| ID | Recommandation |
|---|---|
| V1 | **Garder** L3417 (coût 1L vs risque ville inventée). |
| V2 | **Garder Preview** (Option A — la formulation est plus riche que le générique buildSafety). |
| V3 | **Aligner Preview sur Remaining** (1L) — gain −4L, risque pédagogique faible. |
| V4 | **NE PAS supprimer** ADAPTATION DÉBUTANT Remaining (garde-fou comportemental). |
| V5 | **Appliquer** (règle déjà portée par PROGRESSION VOLUME + PROGRESSION SL). |
| V6 | **Appliquer** — bug silencieux confirmé, branche dormante depuis refonte type. Aligne sur subGoal/trailDetails. |

**R1-R7** : ne pas toucher (audit a raison). Voir notes sur R3 (action recommandée pour PM séparément).

---

## Bugs silencieux à reporter au PM (hors scope audit J2)

### Bug #1 — V6 confirmé : message safety IMC 25-30 + longue distance DORMANT en prod
**Sévérité** : MOYEN (impact safety, mais bloc encourageant — pas un blocker).
**Trace** : `geminiService.ts` L2958 utilise `data.distance` et `data.trailDistance` qui n'existent PAS dans `types.ts` L17-69 (`QuestionnaireData`). Refonte du type vers `subGoal` + `trailDetails: { distance, elevation }` n'a pas été propagée à cette condition. La branche IMC 25-30 + Marathon/Semi/Trail 30+ → message "PRÉCAUTIONS ARTICULAIRES LÉGÈRES" (chaussures amorti, surfaces souples, hydratation, warmup marche) n'a JAMAIS été envoyée à aucun utilisateur de ce profil.
**Estimation impact** : à confirmer avec PM (combien d'utilisateurs IMC 25-30 + Marathon/Semi en base prod). Probable 5-15% des utilisateurs adultes selon stats France.
**Fix proposé** : V6 audit.

### Bug #2 — test-r3-prompt-blocks.mjs DÉSYNCHRONISÉ depuis R-A
**Sévérité** : MOYEN (faux positif — test passe mais ne valide pas le nouveau comportement R-A).
**Trace** : `test-r3-prompt-blocks.mjs` L7-36 réimplémente `buildDplusPromptBlock` MAIS sans la ligne `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).` ajoutée par R-A en L3127 du fichier réel.
**Conséquence** : si on touche à cette ligne ou si elle disparaît accidentellement, le test ne le détectera pas.
**Fix proposé** : ajouter L34 dans le test (avant `return block;`) :
```js
block += `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).\n`;
```
Et ajouter un test assertion qui check la présence de cette ligne en context remaining.

### Bug #3 — `stripElevation` non-trail ABSENT en Remaining
**Sévérité** : FAIBLE-MOYEN (cosmétique mais peut afficher D+ aberrant).
**Trace** : `geminiService.ts` L4046-4056 force `elevationGain=0` sur plans non-trail UNIQUEMENT pour Preview (S1). Aucun équivalent en Remaining. Si Gemini copie le `600` du template JSON L4505 sur un plan non-trail en S2+, c'est conservé tel quel dans le plan final → UI peut afficher `+600m` pour un Jogging route.
**Estimation impact** : audit J1 n'a pas spécifiquement audité ce point (sur 110 plans). À tester.
**Fix proposé** : ajouter une boucle `stripElevation` équivalente après merge `allGeneratedWeeks` dans `generateRemainingWeeks` (autour de L4769 ou avant enforce). Couplé avec S14.

### Bug #4 — `pdpEfR` est un témoin d'un copy-paste plus large
**Sévérité** : NÉGLIGEABLE.
**Trace** : La section ALTERNANCE MARCHE/COURSE (Preview L3562-3567) n'a JAMAIS été ré-injectée en Remaining alors que c'est une consigne S1-3 → si un utilisateur PdP+lowVMA reçoit son Preview avec alternance, puis le batch S2-S4 sans la consigne, Gemini peut dériver vers "course continue" prématurément.
**Estimation impact** : faible (transition vers continue S4-S5 prévue dans la section Preview, et `pdpNeedsMCR` reste vrai en Remaining si on l'utilise).
**Fix proposé** : hors scope J2 — soit on supprime aussi `pdpNeedsMCR` Remaining (cohérent), soit on backporte la section ALTERNANCE. À arbitrer PM.

---

## Annexes — vérification ligne par ligne post R-A/B/C/D/F/G/L

Tous les numéros de ligne de l'audit J2 ont été recroisés avec l'état actuel de `geminiService.ts` (5712 L). Aucun déphasage détecté. Les cleanups R-* précédents ont préservé la structure générale du fichier (suppression in-place, pas de refactoring de blocs).

**Fichiers consultés** :
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` (5712 L)
- `/Users/romanemarino/Coach-Running-IA/src/types.ts` (L17-69 QuestionnaireData)
- `/Users/romanemarino/Coach-Running-IA/test-r3-prompt-blocks.mjs` (108 L, désynchronisé)
- `/Users/romanemarino/Coach-Running-IA/test-r2-matrice.mjs` (standalone, pas d'impact)
- `/Users/romanemarino/Coach-Running-IA/AUDIT-DEV-SENIOR-J2.md` (767 L, base de revue)

**Ordre d'application recommandé** (cohérent avec audit) :

1. **Vague 1 (quick wins risque nul)** : S2 → S6 → S15 → S18 → S19 → S13 → S17 → S16 → S4
2. **Vague 2 (doublons stricts Remaining)** : S1 → S3 → S9 → S10 → S11 (avec test Hyrox)
3. **Vague 3 (optimisations conditionnelles)** : S5 (avec renum) → S7 (2L pas 1L) → S8 (garder récup) → S12 (marge developpement) → S20 → S14 (+ stripElevation Remaining)
4. **Vague 4 (À VALIDER avec PM)** : V5, V6 (à appliquer avec validation PM) ; V1, V2, V4 = NE PAS toucher ; V3 = aligner Preview sur Remaining
5. **Hors vagues — bugs PM** : reporter bugs #1 (V6 active), #2 (test resync), #3 (stripElevation Remaining), #4 (ALTERNANCE PdP Remaining)
