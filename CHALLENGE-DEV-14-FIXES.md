# Dev expert challenge — 14 fixes proposés
Date : 2026-05-19
Auteur : Dev senior Coach Running IA (lecture seule, zéro modif)
Périmètre : challenge technique de chaque diff vs code actuel (`planUtils.ts`, `geminiService.ts`, `feasibilityService.ts`)

---

## Synthèse exec

| Verdict | Count | IDs |
|---|---|---|
| ✅ GO direct | 3/14 | #3, #4, #13 |
| ⚠️ GO avec modif | 6/14 | #1, #2, #5, #8, #9, #12 |
| ❌ CHALLENGE | 2/14 | #6, #7 |
| 🔄 RÉORIENTER | 1/14 | #14 |
| 🟢 DÉJÀ DÉPLOYÉ — retirer du backlog | 2/14 | #10, #11 |

**Erreurs factuelles du rapport à corriger AVANT exécution** :
1. **BUG #1 / #2** : le rapport parle de "code miroir geminiService.ts:2009-2024". **C'est faux.** Les lignes 2009-2024 contiennent `distributeElevationToSessions` (répartition par séance), pas un calcul de cap. `calculateWeekTargetElevation` est centralisé dans `planUtils.ts` et importé L7 de geminiService. **Pas de duplication à patcher** → 1 seul commit `planUtils.ts` suffit.
2. **BUG #6** : le rapport prétend que `timeToSeconds` "rejette '37min' / '58min'". **C'est faux** : le `timeToSeconds` local geminiService.ts:15 (la version utilisée par `detectLevelFromData` L1179) match déjà `^(\d+)\s*min/` L45 et retourne 2220s pour "37min", 3480s pour "58min". Test runtime confirmé.
3. **BUG #6 (suite)** : le rapport prétend que "50km (6h50)" est "interprété comme 6h50 = 24 600s". **C'est faux** : le pattern `^(\d+)h:?` requiert le match en début de chaîne. "50km (6h50)" ne commence pas par `\d+h` → retourne 0 (déjà rejeté).
4. **BUG #6 (suite)** : il existe **DEUX** `timeToSeconds` : un dans `planUtils.ts` (exporté, lignes 26-84) ET un local dans `geminiService.ts:15-94`. Le rapport ignore cette duplication. Toute modif doit toucher les deux ou centraliser.
5. **BUG #10 / #11** : le rapport les liste en "P1 à coder" mais les marque aussi "déjà déployés commit 40b436a". **Code lu** geminiService.ts:3107-3155 = blocs `RÈGLE PB EXPLICITE` + `RÈGLE BLESSURE EXPLICITE` déjà en place. **À retirer du backlog**.
6. **BUG #9** : le diff référence `raceDistanceKm` à L2306-2308 ; or cette variable n'est définie que **L2444** dans le code actuel. Compile-error TypeScript garantie si on applique le diff tel quel. Voir détail #9.

---

## Détail par fix

### Fix #1 — Hard cap `maxStart = Math.min(1500, ...)` écrase `currentWeeklyElevation`

**Diff proposé** : remplacer `maxStart = Math.min(1500, maxWeeklyElevation × 0.60)` par un cap modulé par level (`maxStartByLevel = 600/1000/1800/2500`) + `maxStart = Math.min(maxStartByLevel, raceElevation × 0.70)`, et reprendre `currentWeeklyElevation` capé par level.

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** : OK (variables locales, types préservés)

**Edge cases couverts** :
- `currentWeeklyElevation = 0` → fallback `defaultStart` ✅ (préservé)
- `currentWeeklyElevation` absent (undefined) → idem ✅
- `raceElevation = 0` → early return L114 ✅
- Trail court Débutant (race 300 m D+, current 0) : `maxStartByLevel=600`, `maxStart = min(600, 210) = 210`, `defaultStart=150`, `minStartElevation = 45`, `startElevation = max(150, 45) = 150`. Identique au comportement actuel ✅
- Profil non-Expert (Inter race 2000 m, current 400) : `maxStartByLevel=1000`, `maxStart=min(1000, 1400)=1000`, `rawStart=min(400,1000)=400`, `minStartElevation=300`, `startElevation=max(400, 300)=400` ✅
- **EDGE CRITIQUE NON COUVERT par le diff** : `startElevation = Math.max(rawStart, minStartElevation)` — sans **borne supérieure** `maxStartByLevel`. Si `minStartElevation` (= 15% raceElevation) dépasse `maxStartByLevel` (ex: raceElevation=20000, minStart=3000, mais Expert maxStartByLevel=2500 → startElevation=3000 > 2500 hard cap level). Le code actuel L139 a `Math.min(minStartElevation, maxStart)` qui borne ; le diff l'enlève. **Risque de violation cap level pour ultras XXL**.

**Risque régression** :
- Tests existants : aucun (`periodization.test.ts` ne teste pas `calculateWeekTargetElevation`)
- Profils potentiellement cassés :
  - Confirmé Trail race 5000 m : actuel maxStart=1500, nouveau=1800. Si current=2000 → S1 passe de 1500 à 1800. Délicat à valider sans simulation batch.
  - Expert Trail race 4000 m, current=3000 : actuel S1=1500, nouveau `maxStartByLevel=2500, maxStart=min(2500, 4000×0.70=2800)=2500`, rawStart=min(3000, 2500)=2500. S1 passe de 1500 à 2500 (+66%). Validation coach indispensable.
- Tests anti-régression à ajouter : 4 profils × 2 race D+ (3000/12000) × 3 currentWeeklyElevation (0/1000/3000) = 24 cas

**Code mort potentiel** : la variable `maxStart` (calcul de borne supérieure) devient moins centrale puisque `startElevation` n'est plus borné par elle dans le diff. À documenter.

**Cohérence avec code adjacent** :
- L142 `target = startElevation + (maxWeeklyElevation - startElevation) × progress` : si `startElevation > maxWeeklyElevation` (cas Trail Steep race 1500 m, Expert current 2000) → `target` décroît au lieu de croître. Le diff ne prévient pas cet inverse.
- Le diff `maxStartByLevel = 2500` pour Expert DÉPASSE `maxWeeklyElevation` Expert non-ultra (= 3500) seulement de 0.71×. OK.
- **CRITIQUE** : pour Trail court avec raceElevation=2000 (Inter), `maxWeeklyElevation = 1500`. Le diff calcule `maxStart = min(1000, 2000×0.70=1400) = 1000`. Si `currentWeeklyElevation=1200`, `rawStart=min(1200, 1000)=1000`. `minStartElevation=300`. `startElevation=max(1000, 300)=1000`. Progression vers `maxWeeklyElevation=1500` sur N semaines → OK. Acceptable.

**Si GO modif** :
1. Conserver la borne supérieure : `startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStartByLevel))` (réintroduire le `Math.min`).
2. Garde-fou anti-inverse : `if (startElevation > maxWeeklyElevation) startElevation = maxWeeklyElevation` (cas Trail Steep court avec D+ déclaré disproportionné).
3. Valeurs `maxStartByLevel` 600/1000/1800/2500 : à valider avec Coach. Personnellement, 2500 pour Expert me semble cohérent avec Balducci Master ; 1800 Confirmé OK ; 1000 Inter ajusté ; 600 Débutant OK.
4. Couvrir aussi le cas `defaultStart > maxStartByLevel` (Trail Expert raceElev=300 → `defaultStart=800` mais `maxStartByLevel=2500` OK ; aucun risque).

---

### Fix #2 — Cap `maxWeeklyElevation = Math.min(raceElevation, 3500)` Expert trop bas pour ultra long

**Diff proposé** : introduire `isUltraLongRace = raceElevation >= 8000` et moduler le cap (1000/2000/4000/6000 si ultra long).

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** : OK

**Edge cases couverts** :
- `raceElevation = 7999` → `isUltraLongRace = false`, cap actuel (problème : effet de seuil brutal à 8000)
- `raceElevation = 8000` → cap monte. Discontinuité de +71% pour Expert (3500 → 6000) à l'unité près. **À atténuer par lissage** ?
- Trail Débutant race 8000 m D+ : cap passe de 800 à 1000. Acceptable mais : un Débutant ne devrait jamais avoir un plan IRRÉALISTE pour ultra alpin → R2 gate déjà cap statut, donc safe.
- `raceElevation = 0` → early return ✅
- Premier mode : OK

**Risque régression** :
- Tests existants : aucun
- Profils potentiellement cassés : tous les ultras alpins ≥ 8000 m D+ verront leur cap monter (effet voulu). Vérifier R2 gates feasibilityService.ts:269 `r1Min = 3 × raceDplus` → pour Rich, `r1Min = 36000 m`. Actuel cycle ~26 000 → IRRÉALISTE. Avec le fix, cycle ~48 000 → PASS. **Effet en cascade attendu sur la R2 gate IRRÉALISTE** : moins de plans IRRÉALISTES. Vérifier que ça n'introduit pas de faux négatifs.
- Tests à écrire : (a) ultra 12000 Expert → cap=6000, (b) ultra 5000 Expert → cap=3500 (inchangé), (c) ultra 8000 Inter → cap=2000, (d) ultra 8000 Débutant → cap=1000

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- `defaultStart` L127-131 reste inchangé (Expert 800). Pour ultra long, le diff #1 monterait `maxStartByLevel` à 2500 mais `defaultStart` reste 800 → pour Expert ultra long sans current declared, S1 reste à 800. OK (un Expert ultra qui ne déclare rien est un cas dégénéré, fallback safe).
- Tests existants `periodization.test.ts` n'utilisent pas `calculateWeekTargetElevation`. Aucune régression directe.

**Si GO modif** :
1. **Lissage du seuil 8000** : utiliser une fonction continue plutôt qu'un step. Ex : `cap = level==='expert' ? Math.min(raceElevation, 3500 + Math.max(0, (raceElevation - 6000) × 0.5))` → pour raceElev=8000 cap=4500, raceElev=10000 cap=5500, raceElev=12000 cap=6000. Évite la discontinuité à l'unité près. Alternative : 2 seuils (4000-8000 et ≥8000) pour graduer.
2. Valider avec Coach que les valeurs (1000/2000/4000/6000) sont cohérentes avec Balducci/Bramoullé pour Inter/Conf. Pour Expert, 6000-6500 a été validé Expert Master Athletes.
3. Sprint commun avec #1 (mêmes fonctions) → 1 seul commit logique, 1 PR.

---

### Fix #3 — Back-to-back absent du prompt Ultra 100km+

**Diff proposé** : remplacer le bullet inline L3459 par `${ULTRA70_BACK_TO_BACK_BULLETS}` (constante L3184 déjà existante).

**Verdict dev** : ✅ GO direct

**Compilation TypeScript** : OK (template string interpolation)

**Edge cases couverts** :
- Distance 99.9 km → branche 70-99, déjà OK
- Distance 100 km exactement → branche 100+, fix actif
- Premier mode (preview) : ✅
- Generation remaining (L4335) : à patcher aussi en miroir — **le rapport mentionne L4335 mais ne donne pas le diff exact pour cette branche**. À ne pas oublier : la branche remaining utilise un bullet inline encore plus pauvre ("🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE...").

**Risque régression** :
- Tests existants : aucun (les prompts ne sont pas testés)
- Risque casse profils : nul (factorisation, on remplace 1 bullet par 6 identiques à 70-99)
- Tests à écrire : générer 1 plan ultra 100+ km test et vérifier que `weeks[].sessions` en phase spécifique contient bien un pattern Sam SL + Dim 2e SL.

**Code mort potentiel** : néant (constante déjà existante, juste réutilisée)

**Cohérence avec code adjacent** :
- L3469 (preview 70-99) utilise déjà `${ULTRA70_BACK_TO_BACK_BULLETS}` ✅
- L4340 (remaining 70-99) utilise déjà `${ULTRA70_BACK_TO_BACK_BULLETS}` ✅
- L3459 (preview 100+) bullet inline ❌ → à fixer
- L4335 (remaining 100+) bullet inline ❌ → à fixer

**Si GO direct** : appliquer aussi la modif L4335 dans le même commit. Renommer la constante pour qu'elle ne soit pas spécifique à "70+" → `ULTRA_BACK_TO_BACK_BULLETS` (puisqu'on l'utilise désormais pour 70 ET 100+). Refactor cosmétique, low risk.

**Tokens supplémentaires** : 6 bullets × ~25 mots = ~150 tokens additionnels par génération ultra 100+. Coût Gemini négligeable.

---

### Fix #4 — Sortie nuit ABSENTE de tout le code/prompt

**Diff proposé** : créer `ULTRA_NIGHT_RUN_BULLETS` constante, injection conditionnelle `includeNightRun = distance >= 60 || elevation >= 4000`.

**Verdict dev** : ✅ GO direct

**Compilation TypeScript** : OK

**Edge cases couverts** :
- Distance 59 km D+ 3500 → `includeNightRun = false` (pas de nuit). OK (course probable < 12h).
- Distance 60 km D+ 1000 → `includeNightRun = true` (par distance). OK (ultra trail "court", peut faire jour entier mais marathon des sables/etc. justifie).
- Distance 30 km D+ 4500 → `includeNightRun = true` (par D+). À discuter : un trail 30 km dur ne passe pas la nuit. **Le seuil D+ ≥ 4000 m génère des faux positifs**. Recommandation : combiner avec distance : `includeNightRun = (distance >= 60) || (distance >= 30 && elevation >= 4000 && hoursTarget >= 10)`.
- Trail route (PdP, Maintien) : `goal !== 'Trail'` → branche trail non atteinte ✅
- VK / TrailSteep (très court mais raide) : déjà filtré par les branches `isVKPreview` / `isTrailSteepPreview` antérieures ✅
- Distance NaN/undefined : `data.trailDetails.distance >= 60` → false avec NaN ✅

**Risque régression** :
- Tests existants : aucun (prompt-only)
- Risque casse autres profils : nul (variable nouvelle, injection isolée)
- Tests à écrire : (a) ultra 100 km D+ 6000 → contient bullets nuit, (b) ultra 70 km D+ 2000 → contient bullets nuit, (c) trail 30 km D+ 1500 → ne contient PAS bullets nuit, (d) marathon route → ne contient PAS bullets nuit.

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- Branches préview 100+ (L3455), 70+ (L3466), remaining 100+ (L4335), remaining 70+ (L4339) → 4 injection sites à patcher. **Le rapport propose 2** ; il faut aussi traiter remaining pour cohérence avec la doctrine "branche extrême ≥ branche intermédiaire".
- La constante `NUTRITION_SL_BLOCK` (L3181) suit le même pattern → cohérent stylistiquement.

**Si GO direct** :
1. Resserrer le seuil pour éviter faux positifs : `includeNightRun = data.trailDetails.distance >= 60` (purement distance, plus simple et plus safe). Le rapport mentionne `>= 60 || >= 4000 m D+` mais ce dernier prête à faux positif pour un VK/TrailSteep dur sans durée.
2. **Patcher aussi remaining L4335 + L4339** (le rapport n'est pas explicite).
3. Coach peut affiner les bullets (placement sam/ven, durée).
4. Tokens : ~120 tokens × 2 branches (preview + remaining) × 2 niveaux (70+/100+) = ~480 tokens par génération ultra. Coût Gemini négligeable.

---

### Fix #5 — `detectLevelFromData` downgrade silencieux Expert → Débutant

**Diff proposé** : (a) `getMinLevelFromLongDistance` pour respecter Marathon → min Inter, (b) correctif âge Senior (+5 min 10K), (c) exposer `levelOverrideReason` dans context.

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** :
- Le diff montre une fonction `getChronoThresholds` qui retourne un tableau. La vraie struct `CHRONO_LEVEL_THRESHOLDS` (L1156) est `Record<'10K'|'5K', { M: readonly number[], F: readonly number[] }>` avec **`as const`** → les tableaux sont **readonly**. Le `.map(t => t + ...)` retourne un nouveau tableau (OK, pas de mutation) mais le type de retour doit être typé explicitement.
- `return { level: effective, reason: ... }` change la signature de `detectLevelFromData` (actuellement `string` → `object`). **Tous les appelants** (geminiService.ts:2840, getEffectiveLevel L1248, etc.) doivent être mis à jour. **Compile-break massif si signature changée**. Mieux : garder `string` en retour, exposer la raison via un side-channel (cache module ou param `out`).

**Edge cases couverts** :
- `times.distanceMarathon` présent mais format pollué (cas jeremy "50km (6h50)") : la fonction `getMinLevelFromLongDistance` ne fait pas de validation du format → retourne `'inter'` même si pollué. **À combiner avec un check de validité** (`timeToSeconds(times.distanceMarathon, 42.2) > 0`).
- Femme age=50 : correctif âge `(sex === 'F' && age >= 50)`. Mais femmes seuils déjà différents (`CHRONO_LEVEL_THRESHOLDS['10K'].F = [60, 50, 42]`). Ajouter +5 min Senior femme → [65, 55, 47]. Une femme 50 ans qui court 10K en 50 min reste `conf` au lieu de `inter`. OK cohérent doctrine Tanaka.
- Profil non-Expert (Inter déclaré) : la cascade ne downgrade que `< declared`. Si chrono implique `inter` et déclaré `inter`, pas de changement ✅
- Premier mode : OK

**Risque régression** :
- Tests existants `periodization.test.ts:107` "Homme VMA 14.5 déclaré Expert → conf (drop 1)" : la cascade VMA reste inchangée → test reste vert ✅
- Tests `periodization.test.ts:57` "Femme VMA 10.87 (semi 2h17) déclarée Confirmée → reste inter" : le profil a `recentRaceTimes.distanceHalfMarathon = '2h17'` → `getMinLevelFromLongDistance` retourne 'inter'. Test reste vert (inter ≥ inter requested).
- **Cas régression CRITIQUE** : profil Senior Femme 55+ qui court 10K en 55 min, déclare Expert. Actuel : chrono > 60 (deb F) → false ; chrono < 50 (inter F max) → conf si <42 ; sinon inter. Avec correctif Senior +5 → seuils [65,55,47] → 55 min = inter. Pas de drop, garde `inter`. Si elle déclare `expert` et VMA cohérente → garde `inter` (drop 2 max). Acceptable mais à valider Coach.
- Sur le cas type **georgeslor1 (M 57 ans, 10K 1h00, Marathon 5h15, Expert déclaré)** : avec correctif Senior +5 min → seuils 10K [55, 47, 41]. 1h00 = 60 min > 55 → reste `deb`. **Le correctif âge ne suffit pas à le reclasser** ! Il faut **AUSSI** appliquer `getMinLevelFromLongDistance` (Marathon → min Inter). Avec ce floor, georgeslor1 reclassé `inter` ✅. Mais pic vol Inter Marathon = 65 km (audit batch montre patché à 50). Toujours pas Expert. **Vérifier que ce cap reclassé est suffisant pour l'usage business** (georgeslor1 souhaitait Expert mais Inter est plus sûr).

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- `detectLevelFromData` appelé de **multiples endroits** (L2840, L4115, L4767, L1248). Si la signature change, refactor cross-fichier.
- `getEffectiveLevel` L1241 dépend de `detectLevelFromData`. La logique de level est crititque pour : `MAX_WEEKLY_VOLUME`, `MAX_SL_DURATION`, `MIN_SL_DURATION_MIN`, etc. Cascade complète.
- **`labelToLevelKey(data.level)` L1175** : peut retourner `'inter'` par défaut si label vague. Si `declared = 'inter'` et `getMinLevelFromLongDistance` retourne aussi `'inter'`, le floor est neutralisé. OK.

**Si GO modif** :
1. **NE PAS changer la signature de retour** : garder `string`. Logger la raison via console.log + stocker dans un cache module si besoin UI ultérieur.
2. `getMinLevelFromLongDistance` doit valider le format (timeToSeconds > 0) **avant** d'appliquer le floor. Sinon jeremy "50km (6h50)" → floor inter à tort.
3. Appliquer le floor `getMinLevelFromLongDistance` **AVANT** la cascade chrono : si user a un Marathon valide, son chrono 10K isolé peut être "off day" et ne pas refléter sa capacité.
4. Coach doit valider seuils correctifs Senior (+5 10K, +2 5K) — Tanaka 2008 dit -0.5%/an VO2max donc -5% à 60 ans ≈ +1.5 min sur 10K (pas +5). À ajuster.
5. Sprint dédié avec **20 tests unitaires** matrix avant deploy. Risque régression cascade = élevé.

---

### Fix #6 — Parser `timeToSeconds` rejette "37min" / "58min" / "50km (6h50)"

**Diff proposé** : ajouter rejet strict des inputs pollués (regex `\d+km`/`\d+m`), ajouter format "37mn"/"37 minutes", "1h" seul.

**Verdict dev** : ❌ CHALLENGE

**Pourquoi CHALLENGE** :
1. **Le rapport est factuellement faux sur l'état actuel**. Tests runtime que j'ai effectués :
   - `timeToSeconds("37min", 10)` = **2220** ✅ (déjà OK, géré par regex L45)
   - `timeToSeconds("58 min", 10)` = **3480** ✅ (déjà OK)
   - `timeToSeconds("50km (6h50)", 5)` = **0** ✅ (déjà rejeté, le pattern `^(\d+)h:?` impose début de chaîne)
   - `timeToSeconds("1h", 10)` = **3600** ✅ (déjà OK, regex match avec mins vide)
   - `timeToSeconds("37 minutes", 10)` = **2220** ✅ (géré par embeddedMin L73)
2. Le SEUL cas non géré est `timeToSeconds("37mn", 10)` = 0. C'est ultra marginal.
3. La fonction est **DUPLIQUÉE** : `planUtils.ts:26` (exporté, utilisé par autres modules) ET `geminiService.ts:15` (local, utilisé par `detectLevelFromData`). Le rapport ne mentionne PAS cette duplication. Toute modif doit toucher LES DEUX ou centraliser.

**Compilation TypeScript** : OK (si appliqué)

**Edge cases couverts** par le diff proposé :
- "37mn" → 2220 (nouveau cas géré). Bénéfice : ultra marginal.
- "1h" → 3600 (déjà géré, redondant)
- "50km (6h50)" → 0 (déjà géré, redondant)
- Risque : rejet strict `/\d+\s*m\b/` matche "50m" → ce n'est PAS un format de chrono valide normalement mais : "10K 50m" = mal formé. Faux positifs improbables.

**Risque régression** :
- Tests existants : aucun pour `timeToSeconds` directement
- La regex de rejet `/\d+\s*m\b/` : risque de matcher "10K 45min" ? Test : `\d+\s*m\b` sur "45min" → `\b` = word boundary, "45m" suivi de "in" pas de `\b` après `m`. Donc no match ✅. Mais "1h45m" (rare) → `45m\b` ? "45m" suivi de fin de chaîne ? oui, match. Régression possible.
- **Code mort** : la branche "1. Format XhYY" déjà gère "1h", donc la nouvelle branche "5. NEW Format 1h sans minutes" est redondante.

**Si CHALLENGE — alternative** :
1. **AVANT toute modif, écrire un test exhaustif** (`timeToSeconds.test.ts` 25 cas) qui documente le comportement actuel. Constater empiriquement quels formats sont rejetés vraiment.
2. Si après tests aucun cas critique n'est rejeté à tort → **NE PAS MERGER ce fix**.
3. Si on confirme que "37mn" (sans 'i') ou similaires sont rencontrés en prod → ajouter UNIQUEMENT la regex `^(\d+)\s*(min|mn|minutes?)\b` (consolider). Pas besoin du rejet strict km/m (déjà naturel par les regex `^`).
4. **PRIORITÉ ABSOLUE** : **centraliser** les 2 versions de `timeToSeconds` (planUtils + geminiService). Un seul export, un seul code, un seul test. La duplication actuelle est un bug latent garanti tôt ou tard.

---

### Fix #7 — Cap `startVolume = Math.min(..., maxVolume × 0.65)` peut écraser le floor

**Diff proposé** : `startVolume = Math.min(startVolume, volumeCap, Math.max(peakCap, currentVolumeFloor))` + conserver L2671 garde-fou.

**Verdict dev** : ❌ CHALLENGE

**Pourquoi CHALLENGE** :
1. **Le rapport reconnaît lui-même que le Challenge PM a tranché SKIP** ("la L2671 rattrape déjà dans 95 % des cas"). Le rapport pousse à re-soumettre PM avec données audit 11+17 plans.
2. **Lecture du code actuel L2650-2671** : le pattern est déjà :
   - L2661 `currentVolumeFloor = currentVolume` (100%, déjà patché commit `26b3d3a`)
   - L2662 `startVolume = Math.max(startVolume, currentVolumeFloor)` (impose floor)
   - L2666 `startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65)` (potentiel écrasement)
   - L2671 `startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90))` (rattrapage final)
3. Le rattrapage L2671 fonctionne : si `currentVolumeFloor ≤ maxVolume × 0.90`, on revient au floor. Le seul cas où ça casse : `currentVolume > maxVolume × 0.90` (typique cas Antoine current=80, maxVolume=85 → 90% = 76.5 < 80 → S1 plafonné à 76.5, perte de 3.5 km).
4. Le diff proposé `Math.max(peakCap, currentVolumeFloor)` : si `currentVolumeFloor=80` et `peakCap=68` → resultat=80. OK, conserve current. Mais si `currentVolume=110` et `maxVolume=100` (cas dégénéré post `maxVolume = max(maxVolume, currentVolume)` L2418-2420) → `peakCap=65`, `currentVolumeFloor=110` → resultat=110, et `volumeCap=Math.max(currentVolume=110, minStartVolume)=110`. `startVolume = min(currentVol_max, 110, 110) = startVol_max`. Si `startVol_max ≥ 110` → S1 = 110. Acceptable mais pas de progression (S1 = peak).
5. **Risque caché** : pour un `maxVolume × 0.65` qui définit la marge de progression, le bypass complet du cap pourrait conduire à des plans PLATS (S1 = peak, pas de courbe). Le rapport ne traite pas cet aspect.

**Compilation TypeScript** : OK

**Edge cases couverts** :
- `currentVolume=0` : branche `else` L2672-2676 ne change pas → ✅
- `currentVolume=80, maxVolume=85` (Antoine) : `peakCap=55.25`, `currentVolumeFloor=80`, `Math.max(55, 80)=80`, `startVolume = min(start, 80, 80) = 80` ✅
- `currentVolume=80, maxVolume=120` (Lucie hypothétique) : `peakCap=78`, `currentVolumeFloor=80`, `Math.max(78,80)=80`, `startVolume = min(start, 80, 80) = 80` ✅
- `currentVolume=80, maxVolume=200` (cas absurde mais possible) : `peakCap=130`, `currentVolumeFloor=80`, `Math.max(130, 80)=130`, `startVolume = min(start, 80, 130) = 80` (volumeCap limite) ✅. **Mais** : si on respecte le diff, plus de progression S1→peak ratio 1:2.5 dans une seule semaine si `idealStartVolume > 80`. À tester.
- Premier mode : OK

**Risque régression** :
- Test existant `periodization.test.ts:158` "Profil Expert dégradé Débutant + senior + surpoids + vol45 → peakVolume ≥ 50" : ne teste pas S1 directement. Reste vert.
- **Mais** : sans test S1-vs-current ciblé, on déploie à l'aveugle. Le rapport demande "matrice current × freq × level × goal" sans détailler.

**Si CHALLENGE — alternative** :
1. **Garder le SKIP du PM** mais **ajouter un test unitaire** qui capture le cas Antoine (current=80, expected S1≥80) avant tout patch.
2. Si le test échoue (S1 sort < current), alors merger le fix avec confiance.
3. Si le test passe (rattrapage L2671 fonctionne pour ce cas) → **SKIP confirmé**, le rapport est sur-estimé sur la prévalence.
4. Re-soumettre PM avec les chiffres bruts batch (11+17 plans) + analyse détaillée des deltas (kilomètres réels) pour décision business.

---

### Fix #8 — `sessionFactor` multiplicatif sans plafond Expert

**Diff proposé** : après `maxVolume *= sessionFactor`, ajouter clamp `maxVolume > MAX_WEEKLY_VOLUME[obj].expert && level !== 'Expert' → clamp`.

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** :
- `objectiveKey` est utilisé MAIS défini L2496 (après ce point). Le rapport reconnaît "il faut le hoister".
- Le diff `MAX_WEEKLY_VOLUME[objectiveKey]?.expert ?? 999` → OK syntaxiquement.
- `level !== 'Expert (Performance)'` : OK (chaîne exacte du label complet).

**Edge cases couverts** :
- Conf Marathon freq 6 sessions : `runningSess=5`, `sessionFactor=1.20`, `maxVolume = 75×1.20 = 90`. Expert cap Marathon = 85. Clamp → 85. ✅
- Expert Marathon freq 6 : `level === 'Expert (Performance)'` → pas de clamp, `maxVolume = 85×1.20 = 102`. **102 > Expert cap 85, mais non clampé**. C'est cohérent avec l'idée que les Experts peuvent dépasser leur cap nominal grâce à fréquence haute → mais alors **l'invariant "cap absolu de sécurité" se fissure**. Si on clamp Conf à 85, pourquoi accepter Expert à 102 ? Doctrine incohérente.
- Conf Trail Ultra freq 6 : `maxVolume = 70×1.20 = 84`. Expert cap Trail60+ = 100. Pas clamp (84 < 100). OK.
- Conf 5K freq 6 : `maxVolume = 46×1.20 = 55`. Expert cap 5K = 60. Pas clamp. OK.
- `sessionsPerWeek = 0` : early return du bloc L2285. ✅
- `objectiveKey` calcul L2352-2375 (PdP/Maintien remap) : doit être effectué AVANT le clamp si on hoiste. Logique : hoister L2352-2375 plus tôt, ou simplement utiliser un objectiveKey de base (non remappé) pour le clamp — moins précis mais plus simple.

**Risque régression** :
- Tests existants : aucun ne teste sessionFactor avec cap absolu.
- Profils potentiellement cassés : Conf/Inter haute fréquence vont voir leur pic baisser (effet voulu). antoine pic 90→85 (-5km), armando pic 92→70 (-22km). Le cas armando est BRUTAL → vérifier que la suite (`maxVolume = max(maxVolume, currentVolume)` L2418-2420) rattrape correctement si current > 70. **Si current armando = 60, pic descend de 92 à 70 → -24% peak vs ce qu'il a aujourd'hui**. Acceptable si on accepte la logique "Conf ne devrait pas dépasser cap Expert", mais à valider Coach.

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- Conflit avec L2418-2420 `if (currentVolume > 0 && maxVolume < currentVolume) → maxVolume = currentVolume`. Si on clampe à 85 puis current=88 → remontée à 88. Cycles cohérents ✅
- L2428 progression minimale `progressionTarget = Math.round(currentVolume * 1.18)` capé par `baseMaxVolume × 1.10` : si on clampe avant, `baseMaxVolume` reste le max non clampé ? À vérifier : `baseMaxVolume = maxVolume` L2302 (AVANT sessionFactor), donc le clamp post-sessionFactor n'affecte pas `baseMaxVolume`. OK.
- **Edge sneaky** : pour Conf Marathon freq 6 current=78, le diff clampe à 85, puis L2428 baseMaxVolume=75, `progressionTarget=92`, `safeTarget=min(92, 75×1.10=82.5)=82.5`. Donc maxVolume final = max(85, 82) = 85. OK, mais l'effet "clamp ne descend pas sous current" est nuancé.

**Si GO modif** :
1. **Hoister `objectiveKey`** plus tôt (déplacer le calcul L2496-2499 et remap L2352-2375 avant L2285) — ou créer une fonction helper `computeObjectiveKey(...)`.
2. **Coach doit valider** : Conf Marathon haut volume (freq 6) plafonné à 85 km vs vraie capacité 90-95 km. Sébastien Conf qui s'entraîne 6×/sem peut tenir 90 km — le clamp 85 le freine. Risque "sous-entraînement perçu".
3. **Alternative** : au lieu de clamper, ne **pas appliquer sessionFactor au-delà de 1.10** pour les non-Experts (`if (level !== Expert) sessionFactor = Math.min(sessionFactor, 1.10)`). Plus doux que clamp absolu.
4. Le rapport note "Pourrait être combiné avec #5" → vrai : si #5 reclasse les vrais Experts mal classés en `conf`, ils ne seraient plus capés ici. Sprint cohérent.

---

### Fix #9 — `finisher × 0.75` mécanique sur tous les profils

**Diff proposé** : moduler `finisherFactor` selon `ratio = currentVolume / raceDistanceKm` (0.75 si ratio<0.4, 0.80 si <0.7, 0.85 si <1.0, 0.95 sinon).

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** : **❌ COMPILE ERROR** — le diff utilise `raceDistanceKm` à L2306-2308, mais `raceDistanceKm` n'est **défini que L2444** dans le code actuel. ReferenceError au runtime.

**Edge cases couverts** :
- `currentVolume = 0` : `ratio` non calculé (gardé `0.75` par défaut) ✅
- `raceDistanceKm = 0` : protection `if (currentVolume > 0 && raceDistanceKm > 0)` ✅
- Trail 35 km Finisher current 30 (alan) : ratio=0.86 → factor 0.85 (au lieu de 0.75). Pic Conf Trail<30 = 55 × 0.85 = 47 (vs 55 × 0.75 = 41). Le rapport mentionne pic 60 → 45 mais ma lecture du code dit Conf Trail<30 = 55 (L2258), pas 60. **Petit décalage chiffré dans le rapport**, à reconfirmer.
- Sébastien (Débutant Trail 10 km, current 5, ratio=0.5) → factor 0.80. Pic Deb Trail = 35 × 0.80 × (IMC 0.65) × (vmaCap=5) → effectif 5. Bug Sébastien NON résolu par #9 seul (vmaCap reste le bottleneck).
- Marathon Finisher current 40 race 42.2, ratio=0.95 → factor 0.85 (palier <1.0). Différence 75 × 0.85 - 75 × 0.75 = +7.5 km. Bonus significatif pour Finisher proche du target.
- PdP / Maintien : la condition `!isPertePoids && !isMaintien` reste, donc pas touché ✅

**Risque régression** :
- Tests existants : aucun spécifique Finisher
- Profils potentiellement cassés : Finishers avec base solide vont voir leur pic monter. Effet voulu. Mais risque "plan trop ambitieux" pour qui a coché Finisher = signal de prudence. **Doctrine ambiguë** : si user veut être Finisher mais court déjà la distance, faut-il vraiment lui pousser 95% du pic non-Finisher ? Avis Coach indispensable.

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- `totalReduction` cumulé avec âge L2311, IMC L2323, etc. Le cap `Math.max(totalReduction, 0.60)` L2337 garantit qu'on ne descend pas sous -40%. Si Finisher passe de 0.75 à 0.95, on a 0.20 de marge pour les autres réducteurs. OK.
- **Le calcul `raceDistanceKm` L2444 est dépendant de `isTrail`, `isMarathon`, etc., déjà définis L2206-2215**. On peut le hoister L2300 sans souci.

**Si GO modif** :
1. **HOISTER `raceDistanceKm`** L2444 au-dessus L2305 (avant le bloc Finisher). Garde-fou trivial.
2. **Test unitaire** : Finisher ratio 0/0.3/0.5/0.7/0.95/1.0/1.2 → vérifier factor 0.75/0.75/0.80/0.85/0.85/0.95/0.95 (graduation continue).
3. **Coach** : valider les seuils 0.4/0.7/1.0 et facteurs 0.80/0.85/0.95. Le saut 0.85 → 0.95 à ratio=1.0 est brutal — préférer 0.90 ou continue ?
4. **Cas extrême** : si user déclare current=200 km/sem pour trail 30 km (incohérent) → ratio=6.7 → factor 0.95. Pic Conf Trail<30 = 55 × 0.95 = 52 km. Mais L2418 `maxVolume = max(maxVolume, currentVolume)` rattrape → 200 km. **Cap absolu de sécurité absent ici**. Le user ne devrait pas pouvoir déclarer 200 km/sem mais l'app n'a pas de validation. Risque marginal.

---

### Fix #10 — Welcome cite PB si Finisher + PB

**Verdict dev** : 🟢 **DÉJÀ DÉPLOYÉ — RETIRER DU BACKLOG**

**Preuve dans le code actuel** : `geminiService.ts:3093-3128` contient déjà le bloc `🎯 RÈGLE PB EXPLICITE — Finisher + PB déclaré`. Wording finalisé (post Coach FFA 25 ans, mention "Ton meilleur temps connu sur", variantes PB récent/ancien/régression, garde-fou "JAMAIS écrire allure sans risque"). Le rapport l'inclut dans P1 mais reconnaît en fin de doc qu'il est déployé (commit `40b436a`).

**Action** : confirmer en `git log -- src/services/geminiService.ts | grep 40b436a` et supprimer la ligne du tableau récap + des sprints P1.

---

### Fix #11 — Welcome cite blessure

**Verdict dev** : 🟢 **DÉJÀ DÉPLOYÉ — RETIRER DU BACKLOG**

**Preuve dans le code actuel** : `geminiService.ts:3141-3155` contient le bloc `🩹 RÈGLE BLESSURE EXPLICITE`. 3 piliers (RECONNAÎTRE/ADAPTER/RECOMMANDER) finalisés, distinction blessure active vs ancienne, exemples discriminants (syndrome rotulien, tendinite, périostite, ITBS, lombalgie), garde-fou formulation factuelle vs limitante. Wording finalisé même date (`40b436a`).

**Action** : idem #10.

---

### Fix #12 — SafetyWarning + welcomeMessage dédié ultra haute montagne Master 55+

**Diff proposé** : nouvelle branche `isUltraTrailHauteMontagne = isTrail && raceDplus >= 6000 && raceDplus/raceDistanceKm >= 50` dans `buildSafetyWarning` (feasibilityService.ts).

**Verdict dev** : ⚠️ GO avec modif

**Compilation TypeScript** :
- **❌ COMPILE ERROR** : la signature actuelle `buildSafetyWarning(beginner, isMarathon, isSemi, hasInjury, status, weight?, height?, age?, isTrail?, isLongDistance?)` (L1368-1379) ne reçoit PAS `raceDplus`, `raceDistanceKm`, `planWeeks`. Le diff référence ces variables → ReferenceError.
- Il faut **étendre la signature** : `buildSafetyWarning(..., raceDplus?: number, raceDistanceKm?: number, planWeeks?: number)` ET mettre à jour les **3 appelants** (L432, L772, L1175).

**Edge cases couverts** :
- Rich (age=57, isTrail=true, raceDplus=12000, raceDistanceKm=110) : ratio 109 m/km ≥ 50, raceDplus ≥ 6000 → branche active ✅
- Trail Master 55 sur 30 km D+ 1500 (ratio 50) : raceDplus=1500 < 6000 → branche inactive ✅
- VK Master 55 (2 km D+ 1000 ratio 500) : raceDplus < 6000 → inactive ✅. Bon, le VK n'est PAS de la "haute montagne longue".
- Marathon Master 55 D+ 0 : isTrail=false → inactive ✅
- planWeeks < 16 : mention prép courte ajoutée ✅
- Premier mode (preview) : appelé via L432 + L772 (1ère appelle pré-validation) ✅

**Risque régression** :
- Tests existants : aucun pour `buildSafetyWarning`.
- Risque casse autres profils : nul (nouvelle branche prioritaire, ne touche pas les autres).
- Tests à écrire : (a) ultra Master 12000 D+ → contient mention BTB + nuit + matériel, (b) marathon Master → branche générique préservée, (c) trail Master 5500 D+ → branche générique préservée.

**Code mort potentiel** : néant

**Cohérence avec code adjacent** :
- Le diff propose de placer la branche **AVANT** `isSenior && (isMarathon || isLongDistance)` L1399. **Mais** la branche `hasInjury && bmi ≥ 30` L1386 reste prioritaire (cumul facteurs). Vérifier l'ordre exact souhaité : un Master 55+ avec blessure + ultra alpin = quel message wins ? Doctrine "blessure + cumul" → kiné/médecin obligatoire. Recommandation : garder L1386 prioritaire, insérer #12 entre L1397 (hasInjury sans bmi) et L1399 (isSenior).
- Le diff mentionne "sortie nuit obligatoire avec lampe frontale" → doublon avec #4 prompt ULTRA_NIGHT_RUN_BULLETS. Cohérent (renforcement croisé) mais redondance accepter.
- `welcomeMessage` côté Gemini : le rapport mentionne "+ prompt welcome dédié" mais ne donne PAS le diff exact pour ce volet. À spécifier avant exécution.

**Si GO modif** :
1. **Étendre signature** `buildSafetyWarning` + mettre à jour 3 appelants. Refactor mécanique mais à ne pas oublier.
2. **Ordre des branches** : insérer juste après L1397 (`hasInjury` simple) pour ne pas écraser les blessures prioritaires.
3. **Seuils** `raceDplus ≥ 6000` et `ratio ≥ 50` : Coach doit valider. Pour Rich (110/12000 = 109 m/km), OK. Mais 70/4500 (UTMB Mont-Blanc CCC) ratio 64 raceDplus 4500 → NON couvert (raceDplus < 6000). Faut-il abaisser ? `raceDplus ≥ 4500 && distance ≥ 50` peut-être.
4. **Volet welcomeMessage Gemini** : à spécifier avant exécution. Constante `ULTRA_HAUTE_MONTAGNE_WELCOME_NOTE` injectée dans `buildAdditionalInstructions` ?
5. Tokens : safetyWarning ajoute ~80 mots = ~120 tokens. Welcome équivalent. Total ~240 tokens supp pour ces profils ultra-niche. OK.

---

### Fix #13 — Guard `validatePeriodizationCoherence`

**Diff proposé** : nouvelle fonction `validatePeriodizationCoherence(plan)` qui vérifie ratio weeklyVolumes[i] / sum(sessions[i].distance) dans [0.77, 1.30].

**Verdict dev** : ✅ GO direct

**Compilation TypeScript** : OK (nouveau fichier ou nouvelle fonction exportée)

**Edge cases couverts** :
- `weeklyVolumes[i] = 0` ou `sumDistance = 0` : `if (weeklyVolumes[i] && sumDistance > 0)` skip ✅
- Plan sans `generationContext` : `?? []` fallback ✅
- Plan sans `weeks` : `plan.weeks.length = 0` → no iteration ✅
- Plan PdP/Maintien (pas de D+) : `weeklyElevationTarget` peut être absent → check `if (weeklyElevationTarget[i])` ✅
- Trail plan : ratio D+ check applicable ✅

**Risque régression** :
- Tests existants : néant (nouveau code)
- Risque casse profils : nul (validateur read-only, n'écrit rien dans Firestore)
- Tests à écrire : (a) plan cohérent vol et D+ → 0 issue, (b) plan Rich Plan 2 (70/51) → 1 issue ratio 1.37, (c) plan avec weeklyVolumes vide → 0 issue.

**Code mort potentiel** : néant (nouveau code)

**Cohérence avec code adjacent** :
- Le rapport mentionne `src/services/planValidator.ts` comme nouveau fichier. Vérifier qu'il n'existe pas déjà. **Test** : `ls src/services/planValidator.ts` → fichier inexistant. OK pour création.
- Doit être appelé par tous les scripts `patch-rich-*.mjs` etc. Et idéalement par l'UI admin (warning visible).

**Si GO direct** :
1. Créer `planValidator.ts` minimal (juste cette fonction + types `ValidationIssue`).
2. Intégrer comme post-step dans les scripts ops (template `patch-*.mjs`).
3. Optionnel UI : log dans admin dashboard si plans actifs avec issues.
4. Pas urgent, monitoring interne — P3 OK.

---

### Fix #14 — Stripe webhook post-conversion ne déclenche pas régénération full plan

**Verdict dev** : 🔄 RÉORIENTER (hors scope `src/services/`)

**Pourquoi RÉORIENTER** :
- Le diff vise des Cloud Functions / webhook handlers Stripe non décrits dans le repo `src/services/`.
- Le rapport reconnaît "Hors scope code applicatif. À investiguer côté Cloud Functions / serverless Stripe handler."
- Sans accès au code Stripe webhook actuel (`firebase-functions/` ou équivalent), impossible de challenger un diff.

**Bonne direction** :
1. Investiguer **avant** : `find . -name "*stripe*" -type f` pour trouver le handler actuel.
2. Vérifier si `generateRemainingWeeks` est déjà appelable depuis backend Node (vs client only).
3. Pattern recommandé : event-driven `paymentIntent.succeeded` → enqueue job → `generateRemainingWeeks(plan)` + Firestore update.
4. Alternative simple : guard côté client à l'ouverture plan : si `user.subscriptionTier === 'premium' && plan.isPreview === true` → bouton "Générer le plan complet" qui appelle l'API. Évite Stripe webhook + plus testable.

**Sprint** : P3 / backlog confirmé. Pas de risque court terme tant qu'il y a un fallback manuel ops (Romane).

---

## Tests anti-régression à écrire (consolidés)

### Critiques (à ajouter AVANT déploiement P0)
1. `planUtils.test.ts` — `calculateWeekTargetElevation` matrice (4 levels × 3 raceElevations × 3 currentWeeklyElevations × 2 phases) = 72 cas
2. `timeToSeconds.test.ts` — 25 formats (rapport propose 20, ajouter "37mn", "1h", "1H00", "DNF", "abandonné", "blanc", null, undefined)
3. `detectLevelFromData.test.ts` — matrice (age × declared × chronos validés vs invalides × VMA présente vs absente) = 32 cas minimum

### Importants (P1/P2)
4. Prompt test — 4 plans générés : ultra 100+ / ultra 70+ / Finisher+PB / user blessure → vérifier présence mentions BTB + nuit + PB + blessure
5. `calculatePeriodizationPlan` matrice 20 profils (5K/10K/Semi/Marathon/Trail<30/Trail30+/Trail60+/Trail100+/VK/Hyrox × Deb/Inter/Conf/Expert) — vérifier S1, peak, progression

### Préventifs (P3)
6. `planValidator.test.ts` — cohérence weeklyVolumes vs sessions
7. `buildSafetyWarning.test.ts` — branche ultra haute montagne Master vs branches existantes

---

## Risques transverses

1. **Cascade level → caps → volumes** : modifier `detectLevelFromData` (#5) impacte tout (MAX_WEEKLY_VOLUME, MIN_SL_DURATION_MIN, MAX_SL_DURATION, paces, prompt). Sprint dédié avec tests massifs **impératif**.

2. **Duplication `timeToSeconds`** : le rapport ignore que la fonction existe en 2 copies (planUtils + geminiService). Patcher l'une sans l'autre = bug latent. **Centraliser EN PREMIER** (refactor avant patches).

3. **Sessionnage du calcul `calculateWeekTargetElevation`** : la fonction est appelée 3× (planUtils L106, geminiService L2811 via import, L4116, L4770). Modifier `planUtils.ts` propage partout. **Pas de duplication** (le rapport se trompe). Avantage : un seul patch suffit.

4. **Erreurs factuelles du rapport** : Au moins 6 erreurs factuelles identifiées (faux miroir geminiService.ts:2009-2024, faux bug timeToSeconds 37min/58min/50km, faux bug jeremy 6h50, BUG #10/#11 déjà déployés mais dans P1, raceDistanceKm hors scope L2306). **Sans relecture critique, on aurait poussé des fixes inutiles ou cassants.**

5. **Effets de seuil discontinus** : BUG #2 introduit un step à raceElevation=8000 (cap 3500→6000 pour Expert). Préférer fonction continue ou 2 seuils intermédiaires.

6. **Coût Gemini tokens** : les fixes prompt (#3, #4, #12) ajoutent ~600-800 tokens par génération ultra. Négligeable (<1% du contexte total ~80k tokens). Mais à monitorer en aggrégé si volume grandit.

7. **Validation Coach** : la doctrine "feedback_input_client_obligatoire" justifie #1. Les valeurs `maxStartByLevel` (#1), `isUltraLongRace` cap (#2), seuils Senior age (#5), facteurs Finisher modulés (#9) → tous demandent validation Coach. Sans elle, on remplace un mauvais cap par un autre.

8. **Pas de tests E2E plan complet** : tous les fixes sont validés en unité. Le seul vrai test : **générer 10 plans réels post-fix et faire revue Coach**. Indispensable avant ouvrir au public.

---

## Ordre exécution recommandé (révisé)

### Sprint 0 — Pré-requis (1h)
- **Retirer #10 et #11 du backlog** (déjà déployés `40b436a` à confirmer par `git log`).
- **Centraliser `timeToSeconds`** : un seul export dans `planUtils.ts`, supprimer le duplicat geminiService L15. **CRITIQUE car #6 dépend de cette centralisation**.
- Écrire `timeToSeconds.test.ts` (25 cas) pour documenter le comportement actuel.

### Sprint 1 — P0 D+ trail (3-4 h)
- BUG #2 (cap maxWeeklyElevation par level + isUltraLongRace) — préférer fonction continue
- BUG #1 (suppression hard 1500, maxStartByLevel par level) — réintroduire Math.min(minStartElevation, maxStartByLevel)
- 1 seul commit `planUtils.ts` (pas de duplication geminiService à patcher)
- Tests `planUtils.test.ts` matrice
- **Risque** : Confirmé/Expert Trail S1 monte significativement. Audit Coach 5 plans avant prod.

### Sprint 2 — P1 prompt ultra (2 h)
- BUG #3 (réutiliser `ULTRA70_BACK_TO_BACK_BULLETS` pour 100+ preview ET remaining) + renommer constante
- BUG #4 (`ULTRA_NIGHT_RUN_BULLETS` + injection 4 sites preview/remaining 70+/100+) — seuil simple `>= 60 km` (pas D+)
- Génération test 4 plans → revue Coach
- **Zéro risque code**

### Sprint 3 — P2 cascade level (2-3 jours)
- Avant : 20 tests unitaires periodization
- BUG #6 (#5 préalable inutile car déjà OK) : **SKIP recommandé** sauf découverte format en prod
- BUG #5 : `getMinLevelFromLongDistance` + correctif age Senior (consulter Tanaka pour seuils)
- BUG #8 : sessionFactor clamp + hoister `objectiveKey`
- BUG #9 : Finisher modulé + hoister `raceDistanceKm`
- BUG #12 : étendre signature `buildSafetyWarning`, nouvelle branche ultra haute montagne, + volet welcome prompt
- Audit batch post-deploy sur 100 plans
- Déploiement progressif rollback préparé

### Sprint 4 — P3 monitoring + infra (1 jour)
- BUG #13 : `planValidator.ts` + intégration scripts ops
- BUG #7 : **MAINTENIR SKIP PM** sauf si test unitaire Antoine montre régression réelle
- BUG #14 : investigation Stripe webhook (hors `src/services/`)

---

## Verdicts groupés (cheat sheet)

```
#1 ⚠️ GO modif    | restaurer Math.min(minStartElevation, maxStartByLevel)
#2 ⚠️ GO modif    | lisser le seuil 8000m (fonction continue)
#3 ✅ GO direct   | + patcher remaining L4335 + renommer ULTRA_BACK_TO_BACK_BULLETS
#4 ✅ GO direct   | seuil simple ≥60 km, patcher 4 sites preview+remaining
#5 ⚠️ GO modif    | NE PAS changer signature retour, valider format avant floor
#6 ❌ CHALLENGE   | les bugs cités sont déjà résolus, prioriser centralisation duplicat
#7 ❌ CHALLENGE   | maintenir SKIP PM sauf preuve test unitaire Antoine
#8 ⚠️ GO modif    | hoister objectiveKey, valider Coach Conf clampage
#9 ⚠️ GO modif    | hoister raceDistanceKm (compile-break sinon)
#10 🟢 DÉPLOYÉ    | retirer du backlog (commit 40b436a)
#11 🟢 DÉPLOYÉ    | retirer du backlog (commit 40b436a)
#12 ⚠️ GO modif   | étendre signature buildSafetyWarning + 3 appelants
#13 ✅ GO direct  | nouveau fichier planValidator.ts
#14 🔄 RÉORIENTER | hors scope src/services, investiguer Cloud Functions
```

---

## Synthèse Romane

**À faire absolument** :
1. **Confirmer commit `40b436a`** déployé en prod (BUG #10/#11) → retirer du backlog
2. **Centraliser `timeToSeconds`** (Sprint 0, 1h, zéro risque)
3. **Sprint 1 D+ trail** avec valeurs Coach validées (3-4h)
4. **Sprint 2 prompt ultra** (2h, zéro risque)

**À discuter avec Coach** :
- Valeurs `maxStartByLevel` 600/1000/1800/2500 (BUG #1)
- Valeurs `isUltraLongRace` 1000/2000/4000/6000 (BUG #2)
- Seuils correctifs Senior +5 min 10K +2 min 5K (BUG #5)
- Conf Marathon freq 6 clamp à 85 km (BUG #8) — vs 90-95 km vraie capacité
- Seuils Finisher modulés 0.4/0.7/1.0 et facteurs 0.80/0.85/0.95 (BUG #9)

**À ne PAS faire (challenge dev)** :
- BUG #6 tel quel : les cas "37min", "50km (6h50)" sont déjà gérés. Centraliser d'abord.
- BUG #7 tel quel : SKIP PM justifié, écrire test Antoine avant ré-ouvrir.
- BUG #1 + #2 "miroir geminiService.ts:2009-2024" : faux, pas de miroir, code centralisé via import.
