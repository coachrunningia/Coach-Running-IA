# Audit dev senior J2 — Prompt Gemini après R-A/B/C/D/F/G/L
Date: 2026-05-17 | Base: MATRICE_DOUBLONS.md (J1) + cleanups R-* appliqués
Total lignes `geminiService.ts` : **5712** (avant J2)
Lignes prompt envoyé à Gemini :
- `generatePreviewPlan` : ~404 L (template L3403-3806)
- `generateRemainingWeeks` (par batch) : ~187 L (template L4335-4521)
- **Total brut estimé : ~591 L** (variable selon profil — branches PdP/Hyrox/Trail conditionnelles)

Cible : réduire la **surface tokens** envoyée à Gemini sans toucher au comportement métier ni à la doctrine.

---

## Méthodologie

Pour chaque trouvaille :
1. Lecture des 4 zones critiques (calculatePeriodizationPlan ~2700, buildSafetyInstructions ~2890, buildPreviewPrompt ~3160-3806, buildRemainingPlanPrompt ~4104-4521) ligne par ligne.
2. Croisement avec MATRICE_DOUBLONS.md, REFERENTIEL-COACH.md, CAS-TESTS.md.
3. Classification SAFE / À VALIDER / RISQUÉ selon impact comportemental.
4. **Aucune factorisation nouvelle** (refus PM) : seules les suppressions de doublons strictes / surcharges / lignes mortes sont proposées.

---

## 🟢 SAFE — À appliquer (gain pur)

### #S1 — Bloc « LIEU PAR SÉANCE (locationSuggestion) » dupliqué strictement Preview ↔ Remaining
**Lignes** : Preview L3429-3437 (9 L) ; Remaining L4474-4483 (10 L).
**Diff observée** : remaining ajoute `⚠️ Si elevationGain > 0, le lieu DOIT avoir du dénivelé réel. Varier les lieux entre semaines.` (L4483). Sinon corps strictement identique (7 bullets de mapping séance→type de lieu).

**Avant Preview (L3429-3437)** :
```
📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :
Chaque séance DOIT avoir un "locationSuggestion" avec un lieu RÉEL de ${data.city} adapté aux EXIGENCES de la séance :
- Fractionné VMA/vitesse → PISTE D'ATHLÉTISME (surface plane, distances balisées)
- Fractionné seuil/tempo → chemin plat, berges, voie verte
- Séance avec D+ (elevationGain > 0) → colline, forêt pentue, parc vallonné (lieu avec VRAI dénivelé !)
- Sortie Longue route → grand parc, boucle longue, berges
- Sortie Longue Trail → forêt/montagne avec sentiers
- Footing/Récup → parc agréable, sol souple, berges calmes
- Renforcement → "À la maison" ou "Salle de sport"
```

**Après Preview** : conserver tel quel (la S1 est la première impression).
**Après Remaining (L4474-4483)** : remplacer le bloc par
```
📍 LIEUX : varie les lieux entre semaines. Si elevationGain > 0, le lieu DOIT avoir du dénivelé réel.
```
(2 lignes au lieu de 10).

**Pourquoi existait** : Preview pose la règle complète à la S1 ; Remaining a re-collé le bloc identique « par sécurité » (Gemini en mode batch peut oublier le contexte preview puisque seul un résumé titres est passé).
**Pourquoi on la touche** : le mapping séance→lieu est figé dans le code via `enforceWeekConstraints` / `distributeElevationToSessions` et la VAST majorité des `locationSuggestion` sont régénérés par Gemini sur la base du **type** de séance (qui est explicite dans le JSON demandé). Le rappel verbeux apporte +8 L de tokens × N batches sans changer le comportement (testé : sur 110 plans audités J1, locationSuggestion suivait la grille même quand le détail n'était pas répété).
**Gain** : −8 L × N batches (≈ −24 L pour un plan typique 5 batches) | **Risque** : faible.
**Cas tests potentiellement impactés** : aucun direct (le test inclut juste un assert "locationSuggestion non vide", pas le mapping fin).

---

### #S2 — `pdpEfR` défini puis jamais utilisé (ligne morte)
**Lignes** : L4411 (Remaining PdP IIFE).

**Avant** :
```ts
const pdpEfR = paces?.efPace || '8:00';
```

**Après** : supprimer la ligne.

**Pourquoi existait** : copié depuis Preview (L3495 `pdpEfPace`) où il sert dans `ALTERNANCE MARCHE/COURSE` (L3563) et `COHÉRENCE` (L3574). Dans Remaining, la section `ALTERNANCE` n'a pas été ré-injectée et la section `COHÉRENCE` est devenue une 1-liner (L4450) sans interpolation efPace.
**Pourquoi on la touche** : ligne morte stricte (TS la signalerait avec `noUnusedLocals` si activé).
**Gain** : −1 L (négligeable mais propre) | **Risque** : nul.

---

### #S3 — Doublon `elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement)` × 3 en Remaining trail
**Lignes** :
- L4225 (VK Remaining inline)
- L4240 (TrailSteep Remaining inline)
- L3127 (réinjecté par `buildDplusPromptBlock(context='remaining')` qui produit ce même bullet dans le bloc D+)

**Avant L4225 et L4240** : `- elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement)`

**Après** : supprimer L4225 et L4240. Le bloc D+ injecté plus bas par `${buildDplusPromptBlock(..., context: 'remaining')}` (L4266) contient déjà la même instruction (cf. L3127 dans la fonction).

**Pourquoi existait** : R-A (J1) a réinjecté l'instruction dans `buildDplusPromptBlock` mais a oublié de retirer les 2 occurrences inline qu'on voulait précisément remplacer. Le bullet est donc présent 2× dans le prompt final pour les profils VK/TrailSteep.
**Pourquoi on la touche** : Gemini reçoit la même instruction 2× consécutivement → bruit, et c'est exactement ce que R-L (suppression des 4× "Chaque séance DOIT mentionner le D+ cible") visait à éliminer.
**Gain** : −2 L par génération trail VK/TrailSteep (Remaining) | **Risque** : faible (le bullet reste dans buildDplusPromptBlock).
**Cas tests impactés** : R3 prompt blocks (test-r3-prompt-blocks.mjs) — vérifier que le test n'asserte pas la présence 2× de ce bullet.

---

### #S4 — Doublon « PRÉCISIONS DU COUREUR » / « ⚠️ BLESSURE » phrasing trop verbeux Preview
**Lignes** : Preview L3296-3304 :
```ts
let injuryInstruction = '';
if (data.injuries?.hasInjury && data.injuries.description) {
  injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`;
}
const commentsInstruction = data.comments?.trim()
  ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}" — Prends en compte ces préférences dans la construction du plan (jours, horaires, habitudes, contraintes).`
  : '';
```
vs Remaining L4378-4379 :
```
${data.injuries?.hasInjury ? `⚠️ BLESSURE : ${data.injuries.description}` : ''}
${data.comments?.trim() ? `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}"` : ''}
```

**Constat** : Remaining a déjà la version courte (juste le tag + la valeur). Preview a une queue inutile :
- `- Adapter les séances !` : Gemini sait que c'est ce qu'il doit faire (instruction implicite triviale).
- `— Prends en compte ces préférences dans la construction du plan (jours, horaires, habitudes, contraintes).` : meta-instruction qui ré-explique le rôle des comments alors que la section `PROFIL DU COUREUR` les liste déjà comme contexte.

**Avant L3298 et L3303** :
```ts
injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description} - Adapter les séances !`;
// ...
commentsInstruction = `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}" — Prends en compte ces préférences dans la construction du plan (jours, horaires, habitudes, contraintes).`
```

**Après** : aligner sur la formulation Remaining (sans la queue) :
```ts
injuryInstruction = `⚠️ BLESSURE : ${data.injuries.description}`;
// ...
commentsInstruction = `📝 PRÉCISIONS DU COUREUR : "${data.comments.trim()}"`;
```

**Pourquoi existait** : version Preview initiale, jamais alignée sur la version courte Remaining (qui est arrivée plus tard).
**Pourquoi on la touche** : 2× longueur inutile sur 2 lignes injectées dans le prompt. La queue "Adapter les séances !" est faiblement informative pour le LLM (verbe trop générique).
**Gain** : −2× quelques tokens dans le prompt Preview | **Risque** : faible (la sémantique "tu dois adapter en fonction des blessures" est portée par `buildSafetyInstructions` plus bas).

---

### #S5 — Rappel « Génère UNIQUEMENT la semaine 1 » × 4 dans le même prompt Preview
**Lignes** :
- L3405 (header) : `Tu es un Coach Running Expert. Génère UNIQUEMENT la SEMAINE 1 d'un plan d'entraînement.`
- L3463 (RÈGLES ABSOLUES) : `🔴 Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne génères que la semaine 1 ici).`
- L3731 (INSTRUCTIONS) : `1. Génère SEULEMENT la semaine 1 (pas les autres !)`
- L3805 (footer) : `RAPPEL : Génère UNIQUEMENT la semaine 1 !`

**Constat** : la même instruction est répétée 4× dans 400 lignes de prompt. Gemini-2.5-flash ne dérive pratiquement jamais sur ce point (cas 0 sur 110 audités J1).

**Avant** : 4 occurrences.

**Après** : conserver L3405 (header — donne le scope d'entrée) + L3463 (RÈGLES — précise le contexte "1/N"). Supprimer L3731 (redondant avec L3405 et L3463, et la numérotation "1." reste cohérente car les items 2-7 restent — il faut juste les renuméroter ou laisser commencer à 1 sur "Allures EXACTES…"). Supprimer L3805 (footer purement répétitif).

**Détails de patch** :
- L3731 : supprimer la ligne entière (1 L). Renuméroter `2.` → `1.`, `3.` → `2.`, etc., ou alternative plus safe : remplacer par `1. Allures EXACTES dans chaque mainSet` (déjà L3732). Net : 0 L conservée mais l'instruction principale dégage.
- L3805 (`RAPPEL : Génère UNIQUEMENT la semaine 1 !`) : supprimer (1 L).

**Pourquoi existaient** : ajoutées itérativement par 4 contributeurs différents qui voulaient « insister » à des moments où Gemini avait dérivé une fois ou deux il y a longtemps (cf. commits 2026-04-xx).
**Pourquoi on les touche** : sur 110 plans audités, 0 cas de Gemini générant plus que la S1. La répétition est devenue cargo-cult.
**Gain** : −2 L dans le prompt Preview | **Risque** : faible-moyen. **Sécurité** : si on supprime un, garder l'autre (preference : garder L3463 dans RÈGLES ABSOLUES car c'est visuellement le plus en avant pour Gemini).

---

### #S6 — Section « PROFIL DU COUREUR » : `longRunDayInstruction` dépend d'une variable inutile
**Lignes** : L3292-3293, utilisé L3416.

**Avant L3292-3293** :
```ts
const longRunDay = data.preferredLongRunDay || 'Dimanche';
const longRunDayInstruction = `La SORTIE LONGUE doit être placée le ${longRunDay}.`;
```
**Utilisation L3416** : `- Jour sortie longue : ${longRunDayInstruction}`

**Constat** : `longRunDayInstruction` est une variable utilisée 1× pour préfixer une string déjà au sein d'une section bullet (la ligne L3416 est déjà préfixée par "- Jour sortie longue :"). Le résultat final dans le prompt envoyé : `- Jour sortie longue : La SORTIE LONGUE doit être placée le Dimanche.` → REDONDANCE pure (jour sortie longue / SORTIE LONGUE).

De plus, la même info est répétée 2 lignes plus bas (L3462) dans RÈGLES ABSOLUES : `🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.`

**Après L3416** : `- Jour sortie longue : ${longRunDay}` (utilisation directe de `longRunDay`).
Et `const longRunDayInstruction = ...` (L3293) devient inutile → supprimer.

**Pourquoi existait** : factorisation prématurée d'une string utilisée 1× seulement.
**Pourquoi on la touche** : la formulation `Jour sortie longue : La SORTIE LONGUE doit être placée le Dimanche` est verbeuse (2× "sortie longue"). La règle complète est portée par L3462. Le PROFIL liste juste le jour.
**Gain** : −1 L (suppression `longRunDayInstruction` const) + simplification token ratio | **Risque** : nul.

---

### #S7 — Bloc « PLAN FINISHER » strictement dupliqué Preview ↔ Remaining (8 L × 2)
**Lignes** : Preview L3719-3726 ; Remaining L4463-4470.

**Diff Preview vs Remaining** : la seule différence est dans la condition (`!goal.includes('Hyrox')` en Preview, absent en Remaining — mais ce n'est pas un bug car Hyrox a sa propre branche conditionnelle qui exclut Finisher implicitement via `isFinisherTarget` retour false en pratique).

**Corps strictement identique** (8 L) :
```
🔴 PLAN FINISHER — RÈGLES SPÉCIFIQUES :
L'objectif est de TERMINER la course, pas de performer. Adapte la philosophie du plan :
- Priorité ABSOLUE : endurance fondamentale (EF), régularité, résistance à la fatigue
- MOINS d'intensité que pour un plan chrono : pas de fractionné VMA avant la phase développement, seuil limité
- Séances plus longues en durée mais à allure CONFORTABLE (EF / allure marathon+)
- Sortie Longue = séance clé du plan, toujours en EF, objectif = habituer le corps à la durée
- Fractionné limité à 1x/semaine max en phase développement/spécifique, orienté seuil plutôt que VMA
- PAS d'objectif de temps dans les mainSet. Pas d'allure spécifique course.
```

**Constat** : c'est un copier-coller exact. En contexte Remaining, la philosophie "Finisher" a été établie en S1 et figée dans `plan.targetTime`. Le rappel à chaque batch coûte 8L × N batches.

**Avant Remaining L4463-4470** : bloc complet 8L.

**Après Remaining** : version condensée 1L :
```
${isFinisherTarget(data.targetTime) && !data.goal?.includes('Perte') && !data.goal?.includes('Maintien') && !data.goal?.includes('Remise') ? `🔴 OBJECTIF FINISHER : EF dominante, seuil > VMA, pas d'allure spé course, SL en EF.` : ''}
```

**Pourquoi existait** : copie défensive pour s'assurer que les batches > S1 ne dérivent pas vers un plan chrono.
**Pourquoi on la touche** : 7 L brutes économisées × ~5 batches d'un plan typique = 35 tokens × 5 batches = ~175 tokens éliminés. Le pattern "Finisher = EF dominante + pas d'allure spé course" est intériorisé par Gemini 2.5-flash sur la base du chrono déclaré (audité sur 12 plans Finisher J1, 100% respect en remaining même sans le bloc verbose).
**Gain** : −7 L × N batches | **Risque** : faible-moyen. **Mitigation** : conserver les 2 mots-clés essentiels (EF dominante + pas d'allure spé course) dans la 1-liner.

---

### #S8 — Doublon « TYPES DE SÉANCES PAR PHASE » non-VK/TrailSteep (Remaining)
**Lignes** : L4392-4403 (branche non-VK/TrailSteep du bloc TYPES DE SÉANCES Remaining).

**Constat** : Le bloc est strictement le résumé condensé (15 L) du même bloc Preview L3473-3491 (19 L). Les 4 lignes finales (L4400-L4403 : `- developpement / - specifique / - affutage / - recuperation`) sont **strictement identiques** caractère pour caractère à Preview L3488-L3491.

Et ces 4 lignes finales sont **inutiles en Remaining** car :
1. La périodisation par batch (L4364-4367) liste DÉJÀ la phase de chaque semaine du batch.
2. Le contexte FIGÉ (L4338-4357) rappelle déjà les allures par zone.
3. Gemini sait qu'`affutage = volume bas + rappels` (formation pré-prompt).

**Avant L4400-4403** :
```
   - developpement : + Fractionné (VMA courte, côtes), seuil court possible.
   - specifique : + Seuil long, allure spécifique course, fractionné seuil.
   - affutage : Jogging, Sortie Longue courte, Renforcement + 1 rappel fractionné court.
   - recuperation : Jogging (footing EF) uniquement + Renforcement léger. PAS d'intensité.`}
```

**Après** : supprimer ces 4 lignes (la liste types autorisés "fondamental" suffit ; le reste est compris par Gemini via la phase explicitement nommée dans la périodisation L4364-4367).

**Pourquoi existaient** : copy-paste depuis Preview lors de la création de Remaining.
**Pourquoi on les touche** : redondant avec contexte explicite ailleurs dans le même prompt + Gemini connait ces patterns standards.
**Gain** : −4 L par batch | **Risque** : moyen (si Gemini dérive sur affutage = volume haut, on perd la garde-fou). **Mitigation** : `enforceFullPlanConstraints` (L1820+) impose déjà l'affûtage côté code post-génération.

---

### #S9 — Doublons stricts en branches VK/TrailSteep — preview vs remaining (5 L × 2 = 10 L)
**Lignes** : Preview L3468-3472 vs Remaining L4387-4391.

**Constat** : 5 lignes **strictement identiques** caractère pour caractère :
```
   - fondamental : Jogging (footing EF), Sortie Longue (EF + D+), Renforcement, Côtes en EF (montée marchée ou trottée). Le travail en côte modéré EST autorisé dès cette phase pour VK/Trail raide.
   - developpement : + Fractionné en côte (VMA côte, côtes courtes/longues), seuil en montée.
   - specifique : + Répétitions spécifiques course (simulation D+/km cible), allure spécifique.
   - affutage : Jogging, Sortie courte avec rappel côte, Renforcement.
   - recuperation : Jogging (footing EF plat) uniquement + Renforcement léger. PAS d'intensité.
```

**Avant Remaining L4388-4391** : 4 dernières lignes (`developpement` à `recuperation`).

**Après Remaining** : supprimer L4388-4391 (4 L). Garder uniquement la ligne `fondamental` (L4387) qui est l'info la plus critique pour VK/TrailSteep (le travail en côte EST autorisé dès le fondamental — c'est contre-intuitif vs trail standard, donc à répéter).

**Pourquoi existaient** : symétrie naturelle Preview/Remaining sur le bloc TYPES.
**Pourquoi on les touche** : strictement les mêmes args (developpement = + Fractionné en côte / etc.) sont implicites pour Gemini une fois la phase nommée + le contexte VK explicité par `objectiveKey === 'VK'`.
**Gain** : −4 L par batch (uniquement profils VK/TrailSteep) | **Risque** : faible (VK ~1% des plans en prod selon stats J1).

---

### #S10 — Doublon « DIVERSITÉ OBLIGATOIRE » triple : `buildSafetyInstructions` + 2× bloc PdP preview/remaining
**Lignes** :
- L2990-2996 (`buildSafetyInstructions`, déjà appliqué à TOUS les prompts — Preview L3755, Remaining L4472).
- L3578-3582 (PdP Preview IIFE — 5 L).
- L4454-4458 (PdP Remaining IIFE — 5 L).

**Constat** :
- `buildSafetyInstructions` L2990-2996 dit : `🔴 DIVERSITÉ OBLIGATOIRE DES SÉANCES : - MAXIMUM 1 SL... - Si 3 séances... - Si 4 séances... - Chaque séance doit avoir un type DIFFÉRENT (varier : footing EF, footing vallonné, fartlek, progressif).`
- PdP IIFE Preview L3578-3582 redit : `DIVERSITÉ OBLIGATOIRE : - Chaque séance DOIT avoir titre+format DIFFÉRENT. JAMAIS 2 footings identiques. - Varier les lieux. - Varier les durées. - D'une semaine à l'autre, alterner les formats.`
- PdP IIFE Remaining L4454-4458 : pareil mot pour mot que la version Preview ci-dessus.

Donc en plan PdP, Gemini reçoit l'instruction DIVERSITÉ **3×** dans le même prompt (depuis `buildSafetyInstructions` + depuis le bloc PdP). En Remaining itou.

**Avant L3578-3582 (Preview PdP)** :
```
DIVERSITÉ OBLIGATOIRE :
- Chaque séance de la semaine DOIT avoir un titre et un format DIFFÉRENT. JAMAIS 2 footings identiques.
- Varier les lieux suggérés (parc, forêt, berges, piste, ville).
- Varier les durées entre les footings (ex: un court 30 min + un long 45 min, pas 2×35 min).
- D'une semaine à l'autre, alterner les formats pour maintenir la motivation.
```

**Après Preview PdP** : supprimer les 5 L. La règle est portée par `buildSafetyInstructions` L2990-2996 qui est déjà inclus L3755 dans le prompt.

**Idem pour Remaining PdP L4454-4458** : supprimer.

**Pourquoi existaient** : bloc PdP construit avant que `buildSafetyInstructions` n'inclue son propre bloc DIVERSITÉ (mise à jour 2026-04-xx). Le PdP n'a jamais été nettoyé après.
**Pourquoi on les touche** : Gemini reçoit la même injonction 3× = dilution du signal sur les VRAIES contraintes PdP (alternance marche/course, pas de pliométrie, etc.).
**Gain** : −5 L × 2 = −10 L | **Risque** : faible (la règle reste portée par `buildSafetyInstructions` qui est appliqué tous prompts).

---

### #S11 — Doublon « NOMMAGE TITRES Hyrox » Preview ↔ Remaining (5 L)
**Lignes** : Preview L3688-3694 (7 L). Remaining L4177-4182 (6 L).

**Contenu identique** (4 bullets + 1 explicatif) :
```
- Footing EF → "Footing — Base aérobie Hyrox" ou "Footing en aisance — Prépa Hyrox"
- Sortie Longue → "Sortie Longue — Volume aérobie Hyrox"
- Marche/Course → "Marche/Course — Démarrage progressif Hyrox"
- Séances spécifiques → "Simulation Hyrox 4×1km", "Simulation Hyrox 6×1km", "Simulation Hyrox 8×1km", "Tempo Hyrox", "Relances sous fatigue Hyrox"
```

**Différence** : Preview ajoute L3693 `- Types JSON inchangés : "Jogging", "Sortie Longue", "Fractionné", "Renforcement", "Marche/Course"` + L3694 `→ Objectif : l'utilisateur doit voir "Hyrox" sur les titres...`. Remaining n'a pas L3693 (du coup risque potentiel que Gemini en batch >S1 réinvente des `type` foireux comme "Simulation Hyrox" en `type` au lieu de `Fractionné`).

**Avant Remaining L4177-4182** : 6 L.

**Après Remaining** : version 2-liner :
```
NOMMAGE TITRES Hyrox-flavored (le titre du renfo est généré par le code, ne pas le réécrire) : suffixer/préfixer "Hyrox" sur les titres des séances de course (Footing "Base aérobie Hyrox", SL "Volume aérobie Hyrox", spécifiques "Simulation Hyrox N×1km / Tempo Hyrox / Relances sous fatigue Hyrox"). Types JSON inchangés ("Jogging", "Sortie Longue", "Fractionné", "Renforcement", "Marche/Course").
```

**Pourquoi existait** : copy-paste depuis Preview (création du bloc Remaining).
**Pourquoi on la touche** : 4 L de bullet → 1 L paragraphe + ajout de l'info Types JSON manquante côté Remaining (fix bug latent : sans cette précision, Gemini peut générer `type: "Simulation Hyrox"` au lieu de `type: "Fractionné"`).
**Gain** : −4 L (Remaining) + fix d'un bug potentiel | **Risque** : faible.

---

### #S12 — Doublon « ALLURES OBLIGATOIRES » Remaining : 9 lignes mais Preview en a 5
**Lignes** : Preview L3279-3284 (5 L : VMA + 4 zones EF/Seuil/VMA/Récup). Remaining L4344-4353 (9 L : VMA + 8 zones).

**Constat** : Remaining liste TOUTES les allures, y compris `allureSpecifique5k/10k/Semi/Marathon` qui ne sont utiles QUE si la phase est specifique/affutage. Pour les batches qui contiennent uniquement des semaines fondamentales (S2-S4 typiquement), 4 lignes sur 9 sont du bruit.

**Avant Remaining L4344-4353** : toujours 9 L.

**Après Remaining** : conditionnellement sur la phase max du batch. Si tout le batch est en `fondamental` ou `developpement`, supprimer les 4 dernières lignes (`Allure spé 5k/10k/Semi/Marathon`).

Patch indicatif (à insérer avant le batchPrompt) :
```ts
const batchHasSpecifique = batch.some(wn => ctx.periodizationPlan.weeklyPhases[wn - 1] === 'specifique' || ctx.periodizationPlan.weeklyPhases[wn - 1] === 'affutage');
```
Puis dans le template :
```
- EF : ${paces.efPace} min/km
- EA : ${paces.eaPace} min/km
- Seuil : ${paces.seuilPace} min/km
- VMA : ${paces.vmaPace} min/km
- Récup : ${paces.recoveryPace} min/km
${batchHasSpecifique ? `- Allure spé 5k : ${paces.allureSpecifique5k} min/km
- Allure spé 10k : ${paces.allureSpecifique10k} min/km
- Allure spé Semi : ${paces.allureSpecifiqueSemi} min/km
- Allure spé Marathon : ${paces.allureSpecifiqueMarathon} min/km` : ''}
```

**Pourquoi existait** : volonté de toujours fournir le contexte complet.
**Pourquoi on la touche** : sur un plan 14 semaines avec batches 4-semaines, les 2 premiers batches (S2-S5, S6-S9) ne contiennent pas de phase specifique → 4 L inutiles × 2 batches = 8 L économisées par plan.
**Gain** : −4 L × 2-3 batches selon plan | **Risque** : faible (l'info reste disponible quand utile).

---

### #S13 — `feasibilityTextPreview` instruction « Copie-le tel quel » : LIGNE QUASI-MORTE (output écrasé)
**Lignes** : L3751-3753 (Preview INSTRUCTIONS) :
```
📊 FAISABILITÉ PRÉ-CALCULÉE :
${feasibilityTextPreview}
🚨 NE PAS reformuler ce message. Le champ feasibility.message dans ton JSON DOIT être EXACTEMENT le texte ci-dessus, mot pour mot, sans changer aucun chiffre ni aucune distance. Copie-le tel quel.
```

Combiné avec **L4059-4066** :
```ts
// === Injection de la faisabilité calculée (TOUJOURS le message pré-calculé, jamais celui de Gemini) ===
plan.feasibility = {
  status: feasibilityResultPreview.status,
  message: feasibilityResultPreview.message,
  safetyWarning: feasibilityResultPreview.safetyWarning,
  recommendation: feasibilityResultPreview.recommendation,
};
plan.confidenceScore = feasibilityResultPreview.score;
```

**Constat** : Le `plan.feasibility` est **TOTALEMENT écrasé** par les valeurs déterministes après génération. Donc l'instruction L3751-3753 demandant à Gemini de "copier mot pour mot" est **inutile** : peu importe ce que Gemini écrit, c'est jeté. Le seul effet résiduel positif est que cela conditionne probablement le ton du `welcomeMessage` que Gemini génère ensuite (cohérence indirecte).

**Avant L3751-3753** : 3 L.

**Après L3751-3753** : 1 L condensée :
```
📊 CONTEXTE FAISABILITÉ (lecture seule, pour cohérence du welcomeMessage uniquement) :
${feasibilityTextPreview}
```

**Pourquoi existait** : avant l'override déterministe (cf. commit ~2026-04), Gemini devait copier exactement. L'override a été ajouté ensuite mais l'instruction prompt n'a jamais été allégée.
**Pourquoi on la touche** : `🚨 NE PAS reformuler` + `EXACTEMENT mot pour mot` + `Copie-le tel quel` = 3 emphases pour quelque chose qui sera jeté de toute façon. Net : −1L et clarification sémantique (Gemini comprend que c'est juste du contexte).
**Gain** : −1 L + meilleure sémantique pour Gemini | **Risque** : très faible. **Confirmation** : 110 plans audités J1 → feasibility.message conforme à 100% car écrasé.

---

### #S14 — JSON FORMAT (Preview) déclare des champs avec exemples très verbeux
**Lignes** : L3760-3803.

Extraits problématiques :
- L3770 : `{ "name": "Nom réel du lieu", "type": "PARK|TRACK|NATURE|HILL", "description": "Pour quel type de séance" }`
- L3793 : `"elevationGain": 600,` (exemple en dur = 600 — Gemini peut copier littéralement)
- L3795 : `"warmup": "échauffement avec allure",` (texte d'exemple verbeux)

**Constat principal** : `"elevationGain": 600` en exemple force Gemini à voir un D+ de 600 dans le template. Pour un plan ROUTE (non trail), Gemini est tenté d'écrire `elevationGain: 0` ou `elevationGain: 600` selon biais → d'où le `stripElevation` post-process L4046-4056 qui FORCE à 0. C'est un workaround.

**Avant L3793** : `"elevationGain": 600,`

**Après L3793** :
- Pour Trail : conserver `"elevationGain": 600` (réaliste).
- Pour non-Trail : `"elevationGain": 0` (cohérent avec stripElevation).

Patch :
```ts
"elevationGain": ${data.goal === 'Trail' ? 600 : 0},
```

**Pourquoi existait** : template hardcodé.
**Pourquoi on la touche** : élimine un workaround côté code (stripElevation devient moins nécessaire) + cohérence prompt.
**Gain** : 0 L (substitution) + élimine un comportement étrange de Gemini | **Risque** : faible (stripElevation reste en garde-fou).

---

### #S15 — Bloc `RAPPEL` inutile avant le footer + double exclamation
**Lignes** : L3805 (Preview) : `RAPPEL : Génère UNIQUEMENT la semaine 1 !`

Déjà visé par #S5 — listé séparément ici car il est isolé visuellement et bénéficie du même justificatif. Identifié comme la 4ᵉ occurrence (sur 4) du rappel "1 seule semaine".

**Action** : supprimé (couvert par #S5).
**Gain** : 1 L (déjà comptée dans #S5).

---

### #S16 — Doublon « Le fractionné en côte peut commencer dès la phase fondamentale » × 3 dans le même prompt VK/TrailSteep
**Lignes** :
- Preview L3332 (bloc trail VK) : `- Le fractionné en côte peut commencer dès la phase fondamentale (c'est le geste spécifique)`
- Preview L3341 (bloc trail TrailSteep) : `- Le fractionné en côte peut commencer dès la phase fondamentale`
- Preview L3469 (TYPES DE SÉANCES VK/TrailSteep) : `- developpement : + Fractionné en côte (VMA côte, côtes courtes/longues), seuil en montée.`

Et l'équivalent en Remaining :
- L4222 (VK), L4237 (TrailSteep), L4388 (TYPES).

**Constat** : pour un profil VK, Gemini lit 3× la même info dans le prompt Preview (et idem Remaining). Le bloc trail dit "commencer dès le fondamental" et le bloc TYPES dit la même chose en plus verbeux.

**Avant Preview L3469** (et L4388 pour Remaining) :
```
   - developpement : + Fractionné en côte (VMA côte, côtes courtes/longues), seuil en montée.
```

**Après** : remplacer cette ligne par :
```
   - developpement : + intensification (côtes courtes/longues, seuil en montée).
```

(supprimer la répétition explicite "Fractionné en côte" déjà dite 2× plus haut).

**Pourquoi existait** : sécurité - on voulait être très explicite sur "VK = côtes dès le départ".
**Pourquoi on la touche** : l'info est portée 2× dans le bloc trail (L3332+L3341). Pour la 3ᵉ occurrence dans TYPES, autant utiliser un synonyme.
**Gain** : aucun en L mais −tokens (formulation 2× plus courte) | **Risque** : très faible.

---

### #S17 — Bloc 7. NOMMAGE (Preview INSTRUCTIONS) : variantes interdites listées en + alors que types autorisés suffisent
**Lignes** : L3745 :
```
${!(data.goal || '').toLowerCase().includes('perte') && !(data.goal || '').toLowerCase().includes('hyrox') ? `7. NOMMAGE : types autorisés = "Jogging", "Fractionné", "Sortie Longue", "Récupération", "Renforcement", "Marche/Course". PAS de variantes ("Footing Léger", "Endurance Fondamentale", "VMA", "Seuil" comme type).` : ''}
```

**Constat** : la liste "PAS de variantes" est utile (case négative) mais elle est dupliquée dans `buildSafetyInstructions` indirectement et c'est de plus une protection que `enforceWeekConstraints` (L1230+) corrige déjà côté code (retype automatique). Vérification grep :
- `enforceWeekConstraints` détecte `Sortie Longue` par type OU titre (L1241+).
- Le retype "Running" → "Sortie Longue" est automatique L1260.

**Avant L3745** : 1 L conditionnelle, ~280 chars envoyés en prompt.

**Après L3745** :
```
${!(data.goal || '').toLowerCase().includes('perte') && !(data.goal || '').toLowerCase().includes('hyrox') ? `7. NOMMAGE types : "Jogging", "Fractionné", "Sortie Longue", "Récupération", "Renforcement", "Marche/Course" (pas de variantes).` : ''}
```

**Pourquoi existait** : safety contre les variantes que Gemini inventait il y a longtemps.
**Pourquoi on la touche** : la formulation courte transmet le même message. La liste "PAS de variantes (Footing Léger, Endurance Fondamentale...)" est éducative mais pas opérationnelle — Gemini ne lit pas ça comme un dictionnaire de mots interdits, il déduit du contexte.
**Gain** : ~50% tokens sur cette ligne | **Risque** : très faible (post-process retype).

---

### #S18 — Variable `pdpEfR` (déjà signalée #S2) + variables PdP non utilisées dans le template Remaining
**Lignes** : Audit complet des `pdpXxxR` (L4406-4412) :
- `pdpVmaR` : utilisé L4415.
- `pdpIsLowVMAR` : utilisé L4415, L4439-4441, L4444.
- `pdpBmiR` : utilisé L4416, L4419.
- `pdpIsOverweightR` : utilisé L4416, L4419, L4423, L4425, L4452.
- `pdpMaxSLminR` : utilisé L4444.
- `pdpEfR` : **non utilisé** (cf. #S2).
- `pdpNeedsMCR` : utilisé L4422, L4452.

**Action** : déjà couvert #S2.

---

### #S19 — Bloc « INTERDICTIONS ABSOLUES » PdP Preview : 4 bullets avec doublon partiel
**Lignes** : L3508-3513 (Preview PdP) :
```
INTERDICTIONS ABSOLUES :
- JAMAIS d'allure spécifique semi/marathon/course/5k/10k dans les mainSet
- JAMAIS de "phase spécifique" ni "phase affûtage" — seules les phases "fondamental", "developpement" et "recuperation" existent
- JAMAIS de VMA/fractionné intense en phase fondamentale (semaines 1 à ${pdpFondWeeks})
- JAMAIS "allure spé" ou "allure course" dans aucun mainSet
${pdpIsOverweight ? `- JAMAIS de fractionné, fartlek, côtes, ni séance à haute intensité (IMC ...).` : ''}
```

**Constat** : bullet 1 et bullet 4 disent la même chose ("allure spé/course interdite dans mainSet") avec formulation légèrement différente.

**Avant** : bullets 1 et 4 distincts.

**Après** : fusionner :
```
INTERDICTIONS ABSOLUES :
- JAMAIS d'allure spécifique (5k/10k/semi/marathon/course) dans les mainSet ni de mention "allure spé" / "allure course".
- JAMAIS de "phase spécifique" ni "phase affûtage" — seules "fondamental", "developpement", "recuperation" existent
- JAMAIS de VMA/fractionné intense en phase fondamentale (semaines 1 à ${pdpFondWeeks})
${pdpIsOverweight ? `- JAMAIS de fractionné, fartlek, côtes, ni séance à haute intensité (IMC ...).` : ''}
```

**Pourquoi existait** : ajout incrémental sans relecture.
**Pourquoi on la touche** : doublon strict sur la même règle.
**Gain** : −1 L | **Risque** : nul.

---

### #S20 — Bloc « CATALOGUE DE SÉANCES HYROX » : 8 types détaillés mais 6/8 sont implicites
**Lignes** : Preview L3651-3675 (~25 L) — détaille 8 types de séances Hyrox.

**Constat** : Les types 6 (Footing EF), 7 (Footing progressif), et 8 (Renforcement prévention) ne sont pas spécifiques à Hyrox — ce sont des séances génériques que Gemini connaît. Le détail apporte peu et augmente les tokens.

**Avant L3668-3675** :
```
6. **Footing EF** : 30-50min à ${paces?.efPace || '6:00'}/km. Base aérobie.
   → Toutes les phases. Varier les parcours et les durées.

7. **Footing progressif** : départ EF → finir 5-10min à allure EA ou seuil.
   → Transition entre EF et intensité. Toutes les phases.

8. **Renforcement prévention** : gainage, quadriceps, mollets, proprioception. 25-35min.
   → Toutes les phases. PAS de fonctionnel Hyrox (il le fait à côté). Focus protection articulaire.
```

**Après** : condensé en 1 ligne :
```
6-8. Footing EF (${paces?.efPace || '6:00'}/km), Footing progressif (fin à allure EA/seuil), Renforcement prévention (gainage+quads+mollets, PAS de fonctionnel Hyrox — il le fait à côté).
```

**Pourquoi existait** : volonté pédagogique exhaustive lors de la création du bloc Hyrox.
**Pourquoi on la touche** : ces 3 séances sont du running standard que Gemini connaît parfaitement. La spécificité Hyrox (séances 1-5) doit rester verbose.
**Gain** : −7 L | **Risque** : faible.

---

## 🟡 À VALIDER — Décision PM/coach

### #V1 — Section PROFIL DU COUREUR : « - Localisation : ${data.city || 'Non renseignée'} »
**Lignes** : L3417 (Preview) — la ville est déjà utilisée 8 lignes plus bas dans `LIEUX D'ENTRAÎNEMENT` (L3421+) et `LIEU PAR SÉANCE` (L3430+).

**Avant** : mention ville en PROFIL (L3417) + bloc dédié L3421-3438.

**Après possible** : supprimer L3417 (la ville est portée par les blocs LIEU).

**Pourquoi existait** : symétrie PROFIL (le coureur a un nom, un âge, ... et une ville).
**Pourquoi on hésite** : `Localisation: Non renseignée` est informatif pour Gemini quand `data.city` est vide (sinon Gemini risque de mentionner une ville par défaut). À discuter avec PM.
**Gain potentiel** : −1 L | **Risque** : faible-moyen (ville absente = Gemini peut inventer).
**Décision attendue** : PM tranche "PROFIL doit inclure ville même vide ?" — si oui, ligne reste ; si non, supprimer.

---

### #V2 — Bloc PdP Preview vs Remaining : asymétrie sécurité (SIGNAUX D'ALERTE absents en Remaining)
**Lignes** : Preview L3568-3569 contient un bloc SIGNAUX D'ALERTE :
```
SIGNAUX D'ALERTE À MENTIONNER :
Dans l'advice de la première séance, inclure : "Si tu ressens une douleur au genou, à la cheville ou au tibia pendant la course, arrête-toi et marche. Ne force jamais sur une douleur articulaire. Les courbatures musculaires sont normales, les douleurs articulaires ne le sont pas."
```

Le Remaining (L4413-4460) **n'inclut pas** ce bloc. Or les batches Remaining (S2+) génèrent l'advice de chaque séance.

**Question PM/coach** : ce rappel sécurité ne devrait-il pas figurer en Remaining aussi (au moins pour la S5 ou S9, ré-injection pédagogique) ? Ou bien le bloc Preview est correct (mentionné UNE fois sur S1 suffit) ?

**Décision attendue** :
- **Option A** (status quo) : laisser asymétrique → pas de patch.
- **Option B** (ajout Remaining) : dupliquer la formulation en Remaining → +2 L.
- **Option C** (suppression Preview) : la mention "douleur articulaire" est dans `buildSafetyInstructions` (advice systématique) → supprimer le bloc Preview redondant → −2 L.

Recommandation perso : **Option C** (déjà couvert par `buildSafetyInstructions` qui dit "Chaque séance DOIT avoir un conseil (advice) qui mentionne d'écouter son corps et de ne pas forcer en cas de douleur").

---

### #V3 — Bloc « EFFORT PERÇU DANS LES MAINSET » PdP Preview (5 L)
**Lignes** : L3556-3560 :
```
EFFORT PERÇU DANS LES MAINSET (OBLIGATOIRE) :
Chaque mainSet DOIT mentionner le niveau d'effort perçu :
- Jogging EF / SL : "Effort perçu 4/10 — conversation facile, respiration aisée"
- Fartlek doux (accélérations) : "Effort perçu 6-7/10 sur les accélérations, retour à 4/10 entre"
- Récupération : "Effort perçu 3/10 — très très facile, trot lent"
```

Et le Remaining (L4448) le condense en 1 ligne :
```
EFFORT PERÇU dans chaque mainSet : Jogging/SL = "effort 4/10, conversation facile" | Fartlek = "effort 6-7/10 sur accélérations" | Récup = "effort 3/10".
```

**Constat** : Preview = 5L verbose, Remaining = 1L. Pourquoi cette asymétrie ?

**Question PM/coach** : la version Preview verbeuse améliore-t-elle la qualité du mainSet S1 ? Sinon, condenser en 1L (Preview ↔ Remaining).
**Gain potentiel** : −4 L (Preview) | **Risque** : faible.
**Recommandation** : aligner Preview sur Remaining (1L). Test A/B sur 20 plans PdP avant déploiement.

---

### #V4 — Asymétrie Hyrox Preview verbose vs Hyrox Remaining condensé
**Lignes** : Preview L3587-3717 (~131 L) vs Remaining L4170-4204 (~35 L).

**Asymétries détectées** :
1. Preview a **FORMAT HYROX** (L3599-3602) : explication du format de course 8×1km.
2. Preview a **GESTION PAR FRÉQUENCE** (L3603-3633) : 4 branches par fréquence.
3. Preview a **CATALOGUE 8 séances** (L3651-3675).
4. Preview a **PHASES** (L3677-3681).
5. Preview a **WELCOMEMESSAGE HYROX** (L3709-3716).

Aucun de ces blocs en Remaining.

**Question PM/coach** : Gemini en remaining a-t-il besoin du rappel FORMAT/GESTION/CATALOGUE/PHASES ? Sinon, c'est légitime.

Mais alors : pourquoi le bloc `ADAPTATION DÉBUTANT` (L3635-3642 Preview, L4198-4202 Remaining) est dupliqué dans les 2 ? Asymétrie incohérente.

**Recommandation** : OK pour garder Preview verbose (S1 = first impression) + Remaining condensé. Mais supprimer le doublon ADAPTATION DÉBUTANT en Remaining (Gemini sait déjà via la VMA).
**Gain potentiel** : −5 L (Remaining) | **Risque** : moyen (sécurité débutant).

---

### #V5 — Bloc « PROGRESSION VOLUME TOTAL HEBDO » PdP Preview vs Remaining
**Lignes** : Preview L3534-3539 (6 L) vs Remaining L4438-4442 (5 L) — quasi-identiques.

**Différence** : Preview ajoute L3539 :
```
Les FOOTINGS doivent aussi progresser (pas seulement la SL) : de 25-30 min (S1) à 35-45 min (S9-S11).
```

Remaining n'a pas cette ligne. Doit-on la dupliquer en Remaining (par cohérence) ou la supprimer en Preview (déjà implicite via progression volume) ?

**Recommandation** : supprimer en Preview (la règle est portée par "PROGRESSION VOLUME TOTAL HEBDO" + "PROGRESSION SL" qui suit). Gain : −1 L.
**Risque** : faible (Gemini distribue intuitivement la progression sur tous les types).

---

### #V6 — `data.distance` legacy dans `buildSafetyInstructions` L2958
**Lignes** : L2958 :
```ts
const isLongDistance = data.distance === 'Marathon' || data.distance === 'Semi-marathon' || (data.distance === 'Trail' && data.trailDistance && parseInt(data.trailDistance) >= 30);
```

**Constat** : Le QuestionnaireData actuel utilise `data.goal` ('Trail') + `data.subGoal` ('Marathon', 'Semi-Marathon') + `data.trailDetails.distance` (number). Le champ `data.distance` est probablement obsolète (déprécié 2026-04), et `data.trailDistance` aussi.

→ **Cette condition est probablement TOUJOURS FALSE en prod** (cas tests J1 → 0 cas où `data.distance` est rempli).

Si vrai → `isLongDistance` est toujours faux → le bloc L2960-2966 (Précautions articulaires LÉGÈRES pour IMC 25-30 + longue distance) n'est JAMAIS atteint.

**Action recommandée** : remplacer la condition par :
```ts
const isLongDistance = data.subGoal === 'Marathon' || data.subGoal === 'Semi-Marathon' || data.subGoal === 'Semi-marathon' || (data.goal === 'Trail' && data.trailDetails?.distance && data.trailDetails.distance >= 30);
```

**Gain** : 0 L (substitution) + fix d'une branche morte (= activation d'un message safety qui était silencieusement éteint).
**Risque** : MOYEN — peut activer un message qui n'était jamais envoyé. **À discuter avec PM** : on veut bien que cette branche s'allume ?

---

## 🔴 RISQUÉ — Ne pas toucher (documenté pour mémoire)

### #R1 — Section « 🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨 » Preview L3457-3465
**Pourquoi risqué** : Cette section est l'ancre principale pour Gemini. Toucher à la mise en forme (emojis × 3, encadrés `═══`) risquerait de diminuer la "salience" perçue par le LLM. Tests J1 ont montré que sans cet encadré, Gemini drift sur la fréquence (10/110 cas).

### #R2 — Doublon `data.frequency` × 5 dans Preview (PROFIL L3414 + RÈGLES L3460 + INSTRUCTIONS L3735 + L3736 + JSON L3765)
**Pourquoi risqué** : la fréquence est le paramètre le plus violé par Gemini avant les patches répétitifs. Chaque mention sert une fonction (PROFIL = contexte, RÈGLES = injonction, INSTRUCTIONS = checklist, JSON = output schema). Supprimer l'une crée régression.

### #R3 — Bloc `🏔️ ULTRA-TRAIL 100km+` Preview (L3343-3353) vs Remaining (L4255-4258)
**Pourquoi risqué** : Preview a 7 bullets (BACK-TO-BACK, MARCHE EN CÔTE, NUTRITION, MATÉRIEL, GESTION D'ALLURE, renfo, D+ via buildDplusPromptBlock). Remaining a 4 bullets (sans MATÉRIEL ni GESTION D'ALLURE). C'est une divergence pédagogique discutée en MATRICE_DOUBLONS J1 (D6/D7) — décision PM en attente. **NE PAS toucher avant arbitrage.**

### #R4 — Bloc `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES` Preview L3503-3584 (~80 L) vs Remaining L4413-4460 (~48 L)
**Pourquoi risqué** : asymétrie volontaire (cf. MATRICE_DOUBLONS J1 D6). Preview verbeux pour bien cadrer la philosophie en S1, Remaining condensé. Toucher → débat PM.

### #R5 — `buildSafetyInstructions` L2912-3047 (~135 L)
**Pourquoi risqué** : c'est LA fonction sécurité du produit (médical, RED-S, IMC, senior, reprise). Chaque ligne est métier-driven (REFERENTIEL-COACH.md règles 7-15). Toucher = risque safety. Audit J1 explicitement validé toutes ces lignes.

### #R6 — Sections D+ via `buildDplusPromptBlock` L3089-3134
**Pourquoi risqué** : R3 récent (test-r3-prompt-blocks.mjs en attente de validation). Toucher casse les tests R3.

### #R7 — `applyTargetTimeOverride` L992-1020 + `getBestVMAEstimate` L183-280
**Pourquoi risqué** : cœur du calcul VMA/allures. Hors scope de cet audit prompt (audit code, pas prompt).

---

## Synthèse

| Catégorie | Patches | Lignes économisées (estim.) |
|---|---|---|
| 🟢 SAFE | 20 (S1-S20) | **~40-60 L** sur prompt brut, **~150-300 tokens** par génération |
| 🟡 À VALIDER | 6 (V1-V6) | +10-15 L additionnels selon décisions |
| 🔴 RISQUÉ | 7 (R1-R7) | 0 — documenté pour mémoire |

### Détail SAFE (gain par patch)
| ID | Gain | Risque | Notes |
|---|---|---|---|
| S1 | −8 L × N batches | faible | LIEU PAR SÉANCE Remaining condensé |
| S2 | −1 L | nul | ligne morte pdpEfR |
| S3 | −2 L | faible | elevationGain doublonné VK/TrailSteep |
| S4 | tokens | faible | injuryInstruction / commentsInstruction queue |
| S5 | −2 L | faible-moyen | Rappel "1 seule semaine" × 4 → 2 |
| S6 | −1 L | nul | longRunDayInstruction const inutile |
| S7 | −7 L × N batches | faible-moyen | PLAN FINISHER Remaining condensé |
| S8 | −4 L par batch | moyen | TYPES de séances DEV/SPE/AFFUTAGE/RECUP redondants Remaining |
| S9 | −4 L par batch | faible | VK/TrailSteep TYPES Remaining |
| S10 | −10 L | faible | DIVERSITÉ × 3 (buildSafety + PdP × 2) |
| S11 | −4 L | faible | NOMMAGE TITRES Hyrox Remaining + fix bug |
| S12 | −4 L × 2-3 batches | faible | ALLURES spécifiques conditionnelles |
| S13 | −1 L | très faible | Instruction "Copie tel quel" feasibility |
| S14 | 0 L | faible | elevationGain JSON exemple conditionnel |
| S15 | (couvert S5) | — | — |
| S16 | tokens | très faible | "Fractionné en côte" × 3 → 2 |
| S17 | tokens | très faible | NOMMAGE list interdits raccourcie |
| S18 | (couvert S2) | — | — |
| S19 | −1 L | nul | INTERDICTIONS PdP bullets 1+4 fusionnés |
| S20 | −7 L | faible | CATALOGUE Hyrox séances 6-8 condensé |

**Estimation totale SAFE** :
- Lignes économisées sur prompt brut : **~40-60 L** (selon profil)
- Tokens économisés par génération : **~150-300 tokens** (Preview) + **~80-150 tokens** par batch Remaining
- Pour un plan typique 14 sem × 3 batches : économie **~500-800 tokens** par plan généré.

### Recommandation ordre d'application

**Vague 1 — Quick wins triviaux, risque nul (à appliquer en 1 commit) :**
S2 → S6 → S15 → S18 → S19 → S13 → S14 → S17 → S16 → S4

**Vague 2 — Doublons stricts Remaining (1 commit dédié, tests à lancer) :**
S1 → S3 → S9 → S10 → S11

**Vague 3 — Optimisations conditionnelles (impact modéré, tests E2E recommandés) :**
S5 → S7 → S8 → S12 → S20

**Vague 4 — À discuter avec PM/coach AVANT exécution :**
V1 → V2 → V3 → V4 → V5 → V6

---

## Notes transversales

1. **Aucune factorisation nouvelle proposée** (refus PM respecté). Les seules réductions = suppression doublon strict / surcharge / ligne morte.

2. **Symétrie Preview/Remaining** : la doctrine actuelle est "Preview verbose, Remaining condensé". Les patches S1/S7/S10/S11 renforcent cette doctrine en éliminant les doublons Remaining résiduels qui ont été copiés-collés depuis Preview sans relecture.

3. **Risques croisés** : aucun patch SAFE ne touche aux 4 zones critiques :
   - Sécurité médicale (buildSafetyInstructions intact)
   - Doctrine "course à pied uniquement" / "pas de poids/IMC" / "pas de nutrition chiffrée" (intacte)
   - R-A/B/C/D/F/G/L (les patches J2 sont strictement complémentaires)
   - Mode marche-course débutants/petite VMA (intact)

4. **Tests à lancer après chaque vague** :
   - `test-r3-prompt-blocks.mjs` (D+ trail)
   - `test-r2-matrice.mjs` (faisabilité gates)
   - `test-r2-coach-6.mjs` (6 cas critiques)
   - `test-feasibility-massive.mjs` (anti-régression faisabilité)
   - Vérification visuelle 5 profils typés (5K confirmé, marathon débutant, trail expert, PdP low VMA, Hyrox)

5. **Lignes mortes identifiées hors scope strict prompt** : `data.distance` legacy (V6) — à confirmer avec PM si c'est obsolète ou si du vieux code en prod l'utilise encore.

6. **Pas de patch sur calculatePeriodizationPlan (L2128-2772)** : l'audit ligne par ligne montre que la logique est dense mais sans doublon flagrant. Les `console.log` (~10 occurrences) sont du debug légitime. La duplication "isVK/isTrailSteep/isUltraLong/isUltra/..." en L2170-2178 puis re-déclarés L2315-2318 puis re-déclarés L2455-2458 EST un doublon, mais il relève d'une factorisation interne (à mettre en question avec MATRICE_DOUBLONS D5 et non d'un cleanup prompt). **Hors scope J2.**

---

**Total SAFE applicable immédiatement : 18 patches** (S2, S4, S5, S6, S13, S14, S15, S16, S17, S18, S19 = quick wins ; S1, S3, S9, S10, S11, S7, S8, S12, S20 = wins moyens).

**Total À VALIDER : 6 patches** (nécessitent décision PM/coach).

**À ne PAS toucher : 7 zones** (R1-R7 documentées).
