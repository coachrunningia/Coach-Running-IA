# Audit dev senior 20 ans — 8 bugs Trail/Ultra
Date : 2026-05-23

## Verdict global
**GO SPRINT E** mais avec **réordonnancement** : 3 bugs ont une cause racine code triviale (1, 4, 8) qui doit être fix avant toute action prompt — et le Bug 1 a une cause racine inattendue (gating mort) qui change toute la stratégie.

## Bug par bug

---

### Bug 1 — Vélo banni
**Localisation code** : `src/services/geminiService.ts:3443` (gating `needsNoCrossTraining`) + injection L3640
**Cause actuelle (DORMANT BUG MAJEUR)** :
```ts
const isLongDistance = data.distance === 'Marathon'
  || data.distance === 'Semi-marathon'
  || (data.distance === 'Trail' && data.trailDistance && parseInt(data.trailDistance) >= 30);
```
`data.distance` et `data.trailDistance` **n'existent pas** dans `QuestionnaireData` (cf. `src/types.ts:17-69`). Les champs réels sont `data.subGoal` et `data.trailDetails.distance` (number). Donc cette ligne est **toujours `false` pour Trail/Semi/Marathon** → `needsNoCrossTraining` ne passe jamais à `true` via cette branche → `NO_CROSS_TRAINING_RULE` (L3370) n'est **jamais injecté** sauf pour `imcTier >= 2` (IMC ≥ 30). Olivier BMI 26.5 = imcTier 1 → règle muette → LLM libre d'inventer "Vélo".

C'est aussi pourquoi le contre-exemple "marche ailleurs" tient : sur les profils BMI ≥ 30 la règle est injectée.

**Fix proposé** :
```ts
const trailDistKm = data.goal === 'Trail' ? data.trailDetails?.distance : undefined;
const sub = (data.subGoal || '').toLowerCase();
const isLongDistance = sub === 'marathon'
  || sub === 'semi-marathon'
  || (trailDistKm !== undefined && trailDistKm >= 30);
```
Et **rendre la règle inconditionnelle** dans `buildSafetyInstructions` (doctrine `feedback_coach_running_ia_que_course` = 100 % course). Le coût token est négligeable (1 ligne, ~30 tokens).

Pour défense en profondeur : **post-process filter** dans `postProcessWeekQuality` (geminiService.ts L763) — détecter `/vélo|velo|natation|cyclisme|elliptique|rameur|home.?trainer/i` dans `title|mainSet|warmup|cooldown|advice` et réécrire vers footing récup EF (template existant L813 réutilisable).

**Effort** : 20 min code + 30 min tests (3 fixtures Trail ≥30km, Trail <30, Semi, BMI 24)
**Risque régression** : très faible — la règle existante L3640 reste, on étend juste son activation
**Tests à ajouter** :
- `buildSafetyInstructions` retourne NO_CROSS_TRAINING_RULE pour Trail 50km + BMI 22
- Post-process : session `{title:'Récup Vélo', type:'Récupération'}` → réécrite footing EF
- Edge case : Maintien en forme (pas long distance, pas BMI ≥30) — règle inconditionnelle
**Priorité dev** : **P0** (gating cassé depuis longtemps, dette silencieuse)

---

### Bug 2 — Allure cross-training (incohérence type/title/pace)
**Localisation code** : `src/services/geminiService.ts:881-898` (paceForType mapping)
**Cause actuelle** : quand LLM génère `type:'Récupération'` + `title:'Vélo'`, le mapping L885 assigne `pacesObj.recoveryPace` (allure course) à `targetPace`. Aucun check de cohérence type vs title. Bug **couplé à Bug 1** — disparait dès que le titre "Vélo" est filtré.
**Fix proposé** : pas de fix dédié. Le post-process du Bug 1 normalise titre + type avant que paceForType s'applique. Si on veut une vraie ceinture+bretelle :
```ts
// Avant paceForType, sanity check titre
if (/vélo|natation|cyclisme/i.test(session.title)) {
  session.title = 'Footing de Récupération';
  session.type = 'Récupération';
}
```
**Effort** : 0 min si Bug 1 fix livré (couplage). Sinon 10 min.
**Risque régression** : nul (Bug 1 traite déjà la cause)
**Tests à ajouter** : couvert par tests Bug 1
**Priorité dev** : **P0 (couplé)** — ne pas livrer Bug 1 sans validation que Bug 2 disparait

---

### Bug 3 — SL placement Lundi J1
**Localisation code** : `src/services/geminiService.ts:1111-1161` (`enforceSLDay`) + L4683-4692 (call site preview)
**Cause actuelle** : `enforceSLDay` détecte la SL UNIQUEMENT via `type === 'Sortie Longue'` OU titre regex `/sortie\s*longue|long\s*run/i` (L1122-1125). Si le LLM trail-ultra renomme la SL ("Sortie Trail Longue", "Sortie en montagne", "Endurance Trail 4h") sans matcher la regex stricte, **la SL n'est pas détectée → reste sur Lundi** (assigné par L4683 prefDays[0]).

Probable sur Olivier 126km : LLM trail ultra a libellé la SL "Sortie Endurance Trail" — type peut-être resté "Jogging" ou "Sortie Longue", mais l'ordre dans le array LLM met la SL en idx=0, et L4683 écrase day à prefDays[0]=Lundi. Si type est "Sortie Longue", enforceSLDay aurait dû swap — donc soit type !== 'Sortie Longue', soit `preferredLongRunDay !== 'Dimanche'`.

**Fix proposé** :
1. Élargir détection SL dans `enforceSLDay` :
```ts
const allSL = week.sessions.filter((s: any) =>
  s.type === 'Sortie Longue' ||
  /sortie\s*longue|long\s*run|endurance\s*longue|sortie\s*trail/i.test(s.title || '') ||
  // Fallback: la séance la plus longue (km) si aucune marquée
  false
);
// Si toujours vide, fallback: prendre la session avec max(distance), si > 1.5× moyenne
if (allSL.length === 0) {
  const sessions = week.sessions.filter((s: any) => s.type !== 'Renforcement');
  if (sessions.length >= 2) {
    const sorted = [...sessions].sort((a,b) => (parseKm(b.distance)||0) - (parseKm(a.distance)||0));
    const meanOthers = sorted.slice(1).reduce((s,x) => s+(parseKm(x.distance)||0), 0) / (sorted.length-1);
    if ((parseKm(sorted[0].distance)||0) > meanOthers * 1.5) allSL.push(sorted[0]);
  }
}
```
2. Inverser ordre d'opérations dans `generatePreviewPlan` : appeler `enforceSLDay` AVANT `L4683` (prefDays assignment), pour que la SL ait priorité sur l'idx position. Aujourd'hui : prefDays écrase day par idx, puis enforceSLDay swap. Si SL pas détectée → SL reste écrasée.

**Effort** : 45 min code + 1h tests (matrice : LLM met SL en idx=0 vs idx=N, titre standard vs trail-libre, preferredLongRunDay défini vs absent)
**Risque régression** : moyen — toucher à enforceSLDay impacte tous les goals. Tests d'intégration sur Semi/Marathon obligatoires.
**Tests à ajouter** :
- SL détectée via fallback "plus longue" sur Trail (titre libre)
- SL trail "Endurance en montagne" → enforceSLDay la matche
- Non-régression Semi/Marathon avec titre "Sortie Longue" classique
- `preferredLongRunDay` undefined + Dimanche absent de preferredDays → ne crée pas de jour fantôme
**Priorité dev** : **P0**

---

### Bug 4 — Pic volume insuffisant Trail Ultra
**Localisation code** : `src/services/geminiService.ts:2845-2887` (hard floors minPeakVolume)
**Cause actuelle** : Le code applique un hard floor SEULEMENT pour Semi (22km), Marathon (32km), 10K (18km), 5K (15km). **AUCUN hard floor Trail** quel que soit le distanceKm de course. Donc pour Trail 60+ / 100+ avec CV bas + freq basse, l'`effectiveVmaCap` (L2802) plafonne et `minPeakVolume = min(raceDistanceKm*1.5, absoluteCap, effectiveVmaCap)` peut tomber sous le seuil tissulaire.

Olivier 126 km / pic 63 km : `rawMinPeakVolume = 189 km`, `absoluteCap Trail100+ expert = 120 km`, donc minPeakVolume = min(189, 120, effectiveVmaCap). Pic réel 63 → effectiveVmaCap était à 63 → minPeakVolume = 63. Pour préparer un 126 km, ratio pic/race = 0.5 = très en-dessous des standards UTMB Academy (0.55-0.65 minimum).

**Fix proposé** :
```ts
// Hard floors Trail (à ajouter après L2882)
if (objectiveKey === 'Trail<30' && minPeakVolume < 28) minPeakVolume = 28;
if (objectiveKey === 'Trail30+' && minPeakVolume < 35) minPeakVolume = 35;
if (objectiveKey === 'Trail60+' && minPeakVolume < 45) minPeakVolume = 45;
if (objectiveKey === 'Trail100+' && minPeakVolume < 55) minPeakVolume = 55;
// VK / TrailSteep restent intensité-driven, pas de hard floor distance
```
Cohérent doctrine `feedback_courte_duree_charge_allegee` : on plafonne au plancher coach, on ne pousse pas vers le référentiel UTMB Academy 80-120 km/sem.

**ATTENTION garde-fou Coach 20 ans P0c (L808-830)** : pic/cv > 2.0 déjà capé. Sur Olivier cv=30, pic floor 55 km → ratio 1.83 (acceptable). Mais sur Trail100+ cv=10 → ratio 5.5 → P0c clampe pic à 20 km → conflit avec floor 55. **Logique à clarifier** : floor trail prime sur P0c, ou inverse ? Recommandation : floor prime mais déclenche un warning IRRÉALISTE dans feasibility (ce qui existe déjà via `applyR2Gates`).

**Effort** : 30 min code + 45 min tests + revue Coach 20 ans (recommandée, valeurs floor à valider)
**Risque régression** : moyen — touche périodisation Trail. Tester sur fixtures existantes (Olivier, plans Ambre/Larbac trail).
**Tests à ajouter** :
- Trail 126km cv=30 freq=5 expert → pic ≥ 55km
- Trail 80km cv=20 freq=4 inter → pic ≥ 45km
- Trail 25km cv=15 freq=3 deb → pic ≥ 28km
- VK 5km cv=15 → pas de floor (intensité-driven)
- Interaction floor + P0c clamp pic/cv : floor gagne, feasibility passe IRRÉALISTE
**Priorité dev** : **P1** (impact tissulaire réel mais pas hallucination flagrante)

---

### Bug 5 — Allures S1 monotones
**Localisation code** : `src/services/footingVariants.ts:60-165` (variantes) + L294-354 (`buildFootingVariant`)
**Cause actuelle** : Toutes les variantes appellent `buildMainSet(bodyMin, efPace)` avec UN SEUL `efPace`. Aucune variante n'introduit de variation tactique (progressif → 10:00 puis 9:00, vallonné → adapter au terrain, gammes → segments à allure VMA-zone légère). Sprint C Item 1 a été reporté P2 — bug confirmé non-traité.

Plan 3 efPace 9:33 (VMA basse → allure lente) : 5 footings = 5 fois 9:33 = monotonie réelle.

**Fix proposé** :
1. Ajouter à `FootingVariant.buildMainSet` un paramètre optionnel `paceModulation` :
```ts
type PaceModulation =
  | { type: 'flat', pace: string }
  | { type: 'progressive', start: string, end: string }
  | { type: 'fartlek', base: string, surge: string };
```
2. 2-3 variantes (progressif, fartlek doux, gammes) reçoivent une modulation différente. Le `efPace` reste l'ancre, on génère start/end par +/- 30s/km via `calculateAllPaces`.
3. Étendre `pacesObj` injection L877 pour respecter la modulation déjà présente dans le mainSet (skip si modulation déjà présente).

**Effort** : 1h30 (helper modulation + 3 variantes mises à jour + tests)
**Risque régression** : moyen-faible (footingVariants est isolé). Attention au post-process L870 qui injecte allure si absente.
**Tests à ajouter** :
- 5 footings S1 → au moins 2 allures différentes affichées
- Progressif : start lent, end ~efPace
- Doctrine respect : pas d'allure spé course injectée par erreur dans mainSet EF
- Faibles VMA : pas de start aberrant (clamp à recoveryPace+30s minimum)
**Priorité dev** : **P2** (esthétique / confort UX, pas safety)

---

### Bug 6 — Hallucination spots LLM
**Localisation code** : `src/services/geminiService.ts:4242-4259` + L5286-5297 (prompt locationSuggestion)
**Cause actuelle** : Le prompt demande des lieux "RÉELS de ${data.city}" mais **aucune vérification** post-LLM. Le LLM hallucine des spots cohérents nominalement (Kerpape) mais géographiquement faux (1h30 de Vannes pour le user de plan 3). Aucune intégration de service de géocoding (Google Places, OSM Nominatim).

**Fix proposé (options graduées)** :
- **Option A (1h)** : Rendre `locationSuggestion` OPTIONAL côté prompt + UI affiche seulement si fourni avec confiance. Désactiver via feature flag par défaut sur Trail (où le user connaît mieux que le LLM ses spots).
- **Option B (2-3 jours)** : Intégration Google Places API ou OSM Nominatim — vérifier que le lieu existe dans un rayon X km du user. Coût API + latence + RGPD.
- **Option C (4h)** : Whitelist de spots curated par ville (top 30 villes FR) côté code. Le LLM doit choisir dans cette liste OU laisser vide. Curateur Romane.

Recommandation : **Option A immédiate** (kill switch) + Option C en V2 si ROI prouvé.

**Effort** : A = 1h. C = 4h + 2h curation top villes.
**Risque régression** : Option A nul. Option C dépend de la couverture villes (Vannes pas dans top 30 = no spot → acceptable).
**Tests à ajouter** :
- Option A : feature flag OFF → champ vide accepté
- Option C : ville non whitelistée → locationSuggestion vide, pas de fallback hallucination
**Priorité dev** : **P1** (crédibilité produit, mais non-bloquant safety)

---

### Bug 7 — Welcome déconnecté feasibility.status
**Localisation code** : `src/services/geminiService.ts:4559-4560` (instruction prompt) + 4876-4882 (injection feasibility post-LLM)
**Cause actuelle** : Instruction prompt = `"le welcomeMessage DOIT rester cohérent avec ce texte"` (faible). Le `feasibility.message` est injecté APRÈS-coup côté code (L4879), mais le `welcomeMessage` est LLM-généré sans contrainte forte par status. Sur IRRÉALISTE, le ton n'est pas forcé brutal (le bloc transparencyBlock force la tonalité UNIQUEMENT pour les ratios Gabbett, pas pour le status feasibility).

Doctrine `feedback_securite_avant_conversion` : welcomeMessage IRRÉALISTE = devrait être transparent + décharge. Aujourd'hui = lénifiant possible.

**Fix proposé** : ajouter dans le prompt, conditionnel au statut :
```ts
const welcomeToneBlock = (() => {
  const s = feasibilityResultPreview.status;
  if (s === 'IRRÉALISTE') return `
🔴 STATUT IRRÉALISTE — welcomeMessage OBLIGATOIRE :
- Mentionner explicitement que l'objectif chrono est physiologiquement hors d'atteinte sur la durée du plan
- Pas d'embellissement, pas de "tu vas y arriver", pas de "c'est ambitieux mais faisable"
- Inclure : "Ce plan ne te permettra PAS d'atteindre ${data.targetTime}. Tu vas progresser, mais l'objectif réaliste est ${feasibilityResultPreview.alternativeTarget}."
- Doctrine securite_avant_conversion : transparence > conversion`;
  if (s === 'AMBITIEUX') return `
🟠 STATUT AMBITIEUX — welcomeMessage TON FERME :
- Reconnaitre l'ambition, prévenir des conditions de réussite (régularité, sommeil, nutrition)
- Pas d'enthousiasme excessif. Cadre attendu.`;
  return ''; // FAISABLE / OPTIMAL : pas de contrainte supplémentaire
})();
```
À injecter juste avant `${buildSafetyInstructions(...)}` L4562.

**Effort** : 1h code + 30 min tests
**Risque régression** : faible (ajoute contrainte LLM, ne modifie pas calcul). Attention : sur fixtures existantes le LLM peut produire un wording différent → revalider snapshot tests s'il y en a.
**Tests à ajouter** :
- Plan IRRÉALISTE → welcomeMessage contient "PAS" / "alternative" / chiffre alternativeTarget
- Plan FAISABLE → pas de bloc fermeture imposé
**Priorité dev** : **P0** (doctrine safety > conversion explicite)

---

### Bug 8 — VMA cible astronaute (623 km/h)
**Localisation code** : `src/services/feasibilityService.ts:83-130` (`parseTargetTime`) + L225-229 (`requiredVmaForTarget`) + L455 (message)
**Cause actuelle** : 2 causes cumulées.

**Cause #1 — parser ambigu MM:SS vs HH:MM** : L116 `(\d{1,3}):(\d{2})` matche "2:24" → 2.4 minutes. Si user tape "2:24" voulant 2h24, le parser le traite comme 2 min 24 sec. Sur Semi 21.1 km : speed = 21.1 / (2.4/60) = 527 km/h → vmaNeeded = 527/0.85 = **620 km/h** ✓ corrobore le screenshot 623.

**Cause #2 — aucun cap sanity sur requiredVmaForTarget** : la fonction calcule sans borne. Une VMA physiologique max est ~25 km/h (Bekele/Kipchoge). Au-delà = clairement input invalide.

Aucun test pour ce cas extrême.

**Fix proposé** :
1. **Parser strict** : exiger format unambigu pour `targetTime`. Le format actuel `"XhYY"` du questionnaire (L100) garantit "2h24" → 144 minutes, mais si data importée d'API/Firestore en "2:24" → ambigu. Ajout :
```ts
// Dans parseTargetTime, AVANT le match MM:SS L116-121
// Sanity check : si format MM:SS et MM > 30, c'est probablement HH:MM mal saisi
if (msMatch) {
  const m = parseInt(msMatch[1], 10);
  const s = parseInt(msMatch[2], 10);
  if (m >= 30) {
    // Probablement HH:MM → reformater
    console.warn(`[parseTargetTime] Format ambigu "${target}" — interprété HH:MM`);
    return m * 60 + s;
  }
  return m + s / 60;
}
```
2. **Cap sanity dans requiredVmaForTarget** :
```ts
function requiredVmaForTarget(targetMinutes: number, distanceKm: number): number {
  const factor = getVmaFactor(distanceKm);
  const requiredSpeed = distanceKm / (targetMinutes / 60);
  const rawVma = requiredSpeed / factor;
  // Cap physiologique : VMA max humaine ≈ 24 km/h (élite mondiale).
  // Au-delà = input aberrant, on retourne 30 pour déclencher status IRRÉALISTE
  // sans afficher de chiffres absurdes dans le message.
  if (rawVma > 30) {
    console.error(`[requiredVma] Aberration: ${rawVma.toFixed(0)}km/h sur ${distanceKm}km en ${targetMinutes}min`);
    return 30; // suffit à déclencher la gate 130% pour toute VMA réelle
  }
  return rawVma;
}
```
3. **Garde-fou côté message** : si vmaRatioPercent > 200, swap message vers "objectif impossible — vérifie ton temps cible".

**Effort** : 1h code + 1h tests (cas extrêmes)
**Risque régression** : faible — touche un edge case uniquement. Mais le warn parser MM:SS peut impacter les recentRaceTimes 5K (ex "22:30" est légitime). **À limiter à `parseTargetTime`, pas aux PB**.
**Tests à ajouter** :
- `parseTargetTime("2:24")` → 144 min (HH:MM) avec warn
- `parseTargetTime("22:30")` (5K) → 22.5 min (MM:SS) — non touché car m=22 < 30
- `requiredVmaForTarget(2.4, 21.1)` → cap 30, pas 620
- feasibility Semi targetTime "2:24" → status IRRÉALISTE, message lisible
**Priorité dev** : **P0** (UX catastrophique sur encadré jaune)

---

## Dépendances entre bugs

- **Bug 1 ↔ Bug 2** : Bug 2 disparait dès que Bug 1 est fix (le titre "Vélo" ne sort plus du LLM, ou est filtré post-process). **Tester Bug 1 sans patcher Bug 2** pour confirmer.
- **Bug 3 ↔ Bug 1** : indépendants mais détectables dans les mêmes fixtures (Olivier 126km a les deux).
- **Bug 7 ↔ Bug 8** : Bug 8 (parser) produit feasibility IRRÉALISTE → Bug 7 (welcome lénifiant) amplifie l'impact. Fix Bug 8 d'abord, puis Bug 7 sur statut réel.
- **Bug 4 ↔ Bug 7** : Trail Ultra avec pic insuffisant → feasibility devrait être IRRÉALISTE/AMBITIEUX → welcomeMessage doit refléter. Donc Bug 4 + 7 forment un pipeline cohérent.
- **Bug 5 ↔ Bug 6** : indépendants, P2/P1 respectivement.

## Architecture / Refacto potentiel

1. **Centraliser les "rules anti-LLM"** : aujourd'hui éparpillé entre buildSafetyInstructions (L3375), postProcessWeekQuality (L763), planValidator. Créer `src/services/postProcess/llmRulesEnforcer.ts` consolidant :
   - filtre cross-training (Bug 1+2)
   - filtre poids/IMC (déjà existe en règle prompt)
   - filtre allure spé sur EF (existe)
   - filtre VMA en fondamental (existe L806)
   Pas urgent mais limite la duplication.

2. **Détection SL robuste** : `enforceSLDay` mérite d'être promu en helper exporté + testé indépendamment. Aujourd'hui couplé au flow generatePreviewPlan.

3. **Encapsuler `parseTargetTime`** : ambiguïté MM:SS/HH:MM est piège récurrent. Ajouter type retour `{ minutes: number, confidence: 'high'|'low' }` pour propager le doute aux consommateurs.

4. **Constantes peakFloor extractées** : tableau `MIN_PEAK_VOLUME` par objectiveKey, pas des `if` cascadés (Bug 4). Aligne avec le pattern de `MAX_WEEKLY_VOLUME` / `MIN_SL_PROPORTION` existants L1259-1290.

## Hiérarchisation Sprint E

**P0 dev (à shipper en premier)** :
- Bug 1 (gating mort) — 20 min code
- Bug 2 (couplé Bug 1) — 0 min
- Bug 3 (SL placement) — 45 min code + 1h tests
- Bug 7 (welcome IRRÉALISTE) — 1h code + 30 min tests
- Bug 8 (VMA astronaute) — 1h code + 1h tests

**Total P0** : ~5h de code + tests, livrable en 1 journée.

**P1 dev** :
- Bug 4 (pic Trail Ultra) — 30 min code + 45 min tests + revue Coach 20 ans (peut bloquer 24-48h sur dispo Coach)
- Bug 6 (hallucination spots) Option A — 1h ; Option C en V2

**P2 dev** :
- Bug 5 (allures variées) — 1h30 code + tests

## Plan d'attaque recommandé

**Phase 1 — Quick wins safety (J1, ~3h)**
1. Bug 1 : fix gating L3443 + rendre NO_CROSS_TRAINING_RULE inconditionnel + post-process filter
2. Bug 8 : fix parser MM:SS + cap VMA
3. Run tests existants (525 verts) → cible 525 + 8 nouveaux verts

**Phase 2 — Doctrine alignment (J1 fin, ~2h)**
4. Bug 7 : welcomeToneBlock basé sur status feasibility
5. Bug 3 : élargir détection SL + inverser ordre L4683/4692

**Phase 3 — Trail spécifique (J2, ~2h)**
6. Bug 4 : hard floors trail (en attente validation Coach 20 ans sur valeurs floor) + interaction P0c
7. Bug 6 Option A : feature flag kill switch sur locationSuggestion Trail

**Phase 4 — V2 (Sprint F)**
8. Bug 5 : modulation pace dans footingVariants
9. Bug 6 Option C : whitelist spots curated
10. Refacto llmRulesEnforcer

## Risques globaux

1. **Effet papillon prompt** : ajouter blocs welcomeToneBlock + NO_CROSS_TRAINING_RULE inconditionnel rallonge le prompt de ~150 tokens. Sur des plans déjà longs (Trail100+ multi-blocs), risque d'éclatement context window 3-flash. **Mitigation** : mesurer tokens avant/après sur fixtures critiques (Olivier 126km, ultra70).

2. **Coach 20 ans non-disponible 24-48h** : Bug 4 valeurs floor (28/35/45/55) sont des best-guess. Pas critique : on peut shipper Phase 1+2 sans, et Bug 4 attend validation Coach.

3. **Tests snapshot welcomeMessage** : Bug 7 va modifier la sortie LLM sur fixtures existantes. Si des tests font assert sur welcomeMessage exact (peu probable car LLM non-déterministe), updates nécessaires.

4. **Doctrine `feedback_chaque_ligne_justifiee`** : chaque suppression/remplacement de prompt doit être documentée. Bug 1 enlève L3443 obsolète, Bug 7 ajoute un bloc. Commentaires inline obligatoires pour la postérité.

5. **Doctrine `feedback_patch_live_plans_jour_seulement`** : ces fixes touchent generatePreviewPlan + generateRemainingWeeks. Les plans existants (Olivier, plan 3) ne seront PAS rétro-patchés automatiquement. À traiter via patch live si nécessaire, sinon S1 commencée = on laisse.
