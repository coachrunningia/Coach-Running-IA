# Challenge croisé DEV + Expert Trail — 14 fixes
Date : 2026-05-19
Source challengée : `FIXES-CODE-PROMPT-ROADMAP.md` (2026-05-18, 905 lignes)
Méthode : double verdict DEV (validité technique, edge cases, casse) + TRAIL (Balducci 2024, Bramoullé EA, UTMB Academy, doctrine projet)

---

## 1. Synthèse exec (tableau 14 lignes)

| # | Bug | Dev | Trail | Action recommandée |
|---|---|---|---|---|
| 1 | Hard cap `maxStart=1500` | OK avec modif | OK avec modif | GO — ajuster valeurs `maxStartByLevel` (2200 au lieu de 2500) |
| 2 | Cap `maxWeeklyElevation` Expert | OK | OK | GO — retenir 6500 Expert (pas 6000) ; revoir seuil `isUltraLongRace` à 6000 D+ pas 8000 |
| 3 | BTB absent prompt ultra 100+ | OK | OK | GO direct — code-miroir L4335 à corriger aussi |
| 4 | Sortie nuit absente | OK | CHALLENGE seuil | GO avec seuil ajusté : 80 km OU durée prévue ≥ 12h (pas 60 km) |
| 5 | `detectLevelFromData` downgrade silencieux | CHALLENGE | OK avec modif | MODIF — séparer correctif âge (P1, sûr) de exposition `levelOverrideReason` (P2, structurel) |
| 6 | `timeToSeconds` formats libres | DÉJÀ FAIT (partiel) | OK | MODIF — seul le rejet "50km (6h50)" reste à ajouter ; "37min" déjà géré |
| 7 | Cap 0.65 écrase floor | OK avec modif | OK | GO — réécrire en 1 expression au lieu de cumul min/max contradictoire |
| 8 | `sessionFactor` sans plafond Expert | OK avec modif | CHALLENGE | MODIF — clamp à `MAX_WEEKLY_VOLUME[goal].expert × 1.05`, pas brut (laisse marge Inter+ haute fréq) |
| 9 | `finisher × 0.75` mécanique | OK | OK | GO — seuils 0.4/0.7/1.0 cohérents Bramoullé "specificity" |
| 10 | Welcome ne cite pas PB | OK | OK | DÉJÀ DÉPLOYÉ (commit `40b436a` mentionné L899) — vérifier git log avant re-patch |
| 11 | Welcome ne cite pas blessure | OK | OK | DÉJÀ DÉPLOYÉ idem #10 |
| 12 | Safety ultra haute montagne Master 55+ | OK | OK avec modif | GO — texte fourni ci-dessous, ajouter "test cardio ≥ 6 mois pas 3" |
| 13 | Guard validation cohérence | OK | N/A | GO — seuils 1.3/0.77 trop larges, resserrer à 1.1/0.91 |
| 14 | Stripe webhook | N/A (infra) | N/A | P3 — hors scope ce challenge |

---

## 2. Détail par fix

### Fix #1 — Hard cap `maxStart=1500` (planUtils.ts:133-139)

**Diff résumé** : Remplacer `Math.min(1500, ...)` par `maxStartByLevel` paramétré (600/1000/1800/2500).

**[DEV] Verdict** : OK avec modif
- Validité syntaxe : la chaîne `Math.max(rawStart, minStartElevation)` proposée supprime le `Math.min(minStartElevation, maxStart)` du code actuel. Conséquence : si `minStartElevation = raceElevation × 0.15` > `maxStartByLevel`, `startElevation` peut dépasser le cap level. Cas Débutant race 8000 m D+ : `minStart = 1200`, `maxStartByLevel = 600` → `startElevation = max(rawStart, 1200) = 1200 m` (cap éclaté). Le code actuel le bornait correctement.
- Edge cases : `currentWeeklyElevation = 0` (non renseigné) → bascule sur `defaultStart` capé, OK. Mais si user inter déclare 4000 m D+/sem (irréaliste) → `rawStart = min(4000, 1000) = 1000`, OK.
- Risque casse : MOYEN. `calculateWeekTargetElevation` est utilisée 3 endroits (planUtils + geminiService L2811, L4116, L4770). Aucun n'est dupliqué (import partagé), donc 1 seul fix. Le rapport est faux quand il parle de "code miroir geminiService.ts:2009-2024" : c'est `distributeElevationToSessions`, fonction différente.
- Tests requis : 4 niveaux × 3 raceElevations (1500 / 5000 / 12000) × 2 currentWeeklyElevation (0 / élevé) = 24 cas.

**[TRAIL] Verdict** : OK avec modif
- Pertinence pédagogique : OK — respecter le D+ déclaré du user est doctrine projet (`feedback_input_client_obligatoire`). Le hard cap 1500 viole effectivement cette règle pour les Trail Conf/Expert avec base D+ ≥ 1500 m.
- Valeurs Balducci/Bramoullé : Balducci 2024 (ch. 14 Trail/Ultra) suggère pour Master Expert ultra alpin une fenêtre de **départ S1 = 60-75 % du current**, pas le current strict. La valeur 2500 m proposée pour Expert est OK si current ≤ 2500. Pour Rich (current 3000), permettre 2500 m = `min(current, 2500)` est conservateur-prudent (ratio 0.83 cité dans le rapport). UTMB Academy module 4 confirme : "le démarrage doit refléter la charge habituelle, pas la réduire arbitrairement".
- Risque profils trail : un Inter Trail nouveau avec current 1500 m/sem se retrouverait à 1000 m S1 (vs 1500 avant). Régression de -33 % pour ce profil intermédiaire. Recommandation : monter Inter à **1200 m** au lieu de 1000, Conf à **1800 m** (OK rapport), Expert à **2200 m** (au lieu de 2500 — plus prudent, et de toute façon le `min(current, ...)` ne brisera pas Rich avec current 3000).

**Alternative précise** : valeurs `maxStartByLevel = isDeb ? 600 : isInter ? 1200 : isConf ? 1800 : 2200`. ET conserver le `Math.min(minStartElevation, maxStartByLevel)` autour du floor 15 % pour ne pas éclater le cap level avec un raceElevation extrême.

---

### Fix #2 — Cap `maxWeeklyElevation` Expert trop bas (planUtils.ts:121-125)

**Diff résumé** : Moduler cap par flag `isUltraLongRace = raceElevation >= 8000`, monter Expert à 6000 m.

**[DEV] Verdict** : OK
- Validité syntaxe : ternaire propre, branche `isUltraLongRace` n'affecte que les valeurs cap. Pas de risque NaN (raceElevation déjà gardé L114).
- Edge cases : seuil exactement 8000 → `isUltraLongRace = true`. Race 7999 m D+ → `false` (Expert reste à 3500). Risque : ratio D+/km > 50 (ex : VK 26 km 8000 m) bascule comme "ultra long" alors que ce n'est PAS un ultra. Faible incidence (VK Expert rare).
- Risque casse : NUL pour les race < 8000 m (branche `false` conserve l'existant strict). Excellent design défensif.
- Tests requis : 4 niveaux × 2 raceElevations (5000 / 12000) = 8 cas + 1 cas-frontière 7999/8001.

**[TRAIL] Verdict** : OK avec ajustement
- Pertinence pédagogique : conformité doctrine UTMB Academy module 6 (préparation UTMB) : "cumul cycle ≥ 3× D+ race, optimal 4-6×". Le cap 3500 plafonne mathématiquement à 2.33× pour Rich → impossible. Le fix débloque.
- Valeurs Balducci/Bramoullé :
  - Balducci 2024 ch. 14, plans UTMB-tier : pic recommandé 5500-7000 m pour Master Expert
  - Bramoullé EA #87 : "plateau 6500 m max sur Master 50+"
  - Le rapport mentionne déjà ces sources
- Le cap **6000 Expert** est trop conservateur : il bloque la fenêtre haute Bramoullé/Balducci. Retenir **6500** (déjà cité dans le rapport L139 comme alternative).
- Le seuil de bascule `raceElevation >= 8000` est trop élevé : un trail 80 km / 6000 m D+ (ratio 75 m/km, type Ergysport Tour des Fiz) est un VRAI ultra alpin qui nécessite déjà un cycle ≥ 3× race = 18 000 m sur 8 semaines actives = pic 2250 m/sem, OK avec cap actuel 2500 Conf. MAIS pour un Expert dessus, il faut > 3500 (atteindre pic 4-5000 réaliste). Seuil recommandé : **`raceElevation >= 6000` OU `raceDplus/raceDistance >= 50`**.

**Alternative précise** :
```typescript
const isUltraLongRace = raceElevation >= 6000 || (raceElevation > 0 && raceDistance > 0 && raceElevation / raceDistance >= 50);
const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, isUltraLongRace ? 1000 : 800) :
    isInter ? Math.min(raceElevation, isUltraLongRace ? 2000 : 1500) :
    isConf ? Math.min(raceElevation, isUltraLongRace ? 4000 : 2500) :
    Math.min(raceElevation, isUltraLongRace ? 6500 : 3500);
```
Note : `raceDistance` doit être passé en param (extension signature `calculateWeekTargetElevation`).

---

### Fix #3 — BTB ultra 100+ pauvre (geminiService.ts:3455-3465)

**Diff résumé** : Remplacer le 1 bullet BTB inline par `${ULTRA70_BACK_TO_BACK_BULLETS}` (6 bullets enrichis).

**[DEV] Verdict** : OK
- Validité syntaxe : la constante existe L3184. Substitution template literal triviale.
- Edge cases : la branche `remaining` (L4335) contient aussi un BTB inline (vérifié L4335 : "🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE..."). DOIT être patchée aussi. Le rapport le note correctement.
- Risque casse : NUL (factorisation prompt, branche 70-99 utilise déjà cette constante).
- Tests requis : générer 1 plan ultra 110 km, vérifier que weeks[].sessions phase spé contient pattern Sam SL + Dim BTB ≥ 2 occurrences.

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : back-to-back est LA spécificité ultra (Balducci 2024 ch. 14, Bramoullé EA #82 "le BTB simule la cumulée"). Avoir un BTB plus riche pour 70-99 km que pour 100+ km est aberrant.
- Valeurs : les 6 bullets de la constante existante sont conformes (placement Sam/Dim, ratio 50-60 % durée, EF strict, lundi repos). RAS.
- Risque profils trail : aucun.

---

### Fix #4 — Sortie nuit absente (créer `ULTRA_NIGHT_RUN_BULLETS`)

**Diff résumé** : Nouvelle constante + injection conditionnelle preview L3455 et remaining L4335.

**[DEV] Verdict** : OK
- Validité syntaxe : pattern identique à `NUTRITION_SL_BLOCK` / `ULTRA70_BACK_TO_BACK_BULLETS`. Conditionnelle `${includeNightRun ? X : ''}` standard.
- Edge cases : `data.trailDetails.distance` peut être 0 / undefined sur formulaire incomplet → fallback `false`, OK.
- Risque casse : NUL (prompt-only, ajout d'une instruction non-bloquante).
- Tests requis : 1 plan ultra 80 km + 1 plan ultra 100 km → présence "Sortie nuit" / "lampe frontale" dans ≥ 1 session phase dev ou spé.

**[TRAIL] Verdict** : CHALLENGE sur le seuil
- Pertinence pédagogique : la sortie nuit est unanimement reconnue compétence cruciale (UTMB Academy module 7 "stratégie nocturne", Bramoullé EA #91). RAS sur le fond.
- Valeurs Balducci/Bramoullé : Balducci recommande nuit "dès que la course implique > 12h d'effort". Bramoullé : "ultra ≥ 80 km en montagne OU ≥ 100 km plat".
- **Challenge seuil 60 km** : trop large. Un trail 60 km plat (type Maxi-Race XL) à 8 h pour un Inter ne nécessite PAS sortie nuit dédiée. Pas non plus de course "60 km traversant la nuit" en doctrine commune. Romane a explicitement dit "100km+ ultra bénéfique, voir si en dessous".
- **Recommandation** : seuil **`distance >= 80 || (distance >= 60 && elevation >= 4000)`**. Couvre les UTMR/CCC-tier (80+ km technique) ET les TDS-like (60+ km mais 4000+ D+ = effort ≥ 14h).

**Texte précis prêt à coller** (`ULTRA_NIGHT_RUN_BULLETS`) :
```typescript
// R-H : sortie nuit pour ultras ≥80 km OU ≥60 km + ≥4000 m D+ (durée prévue ≥12h)
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT avec lampe frontale en phase développement OU spécifique :
  • 1 à 2 sorties nuit obligatoires dès que la course passe la nuit (≥12h d'effort prévu)
  • Lampe frontale OBLIGATOIRE — terrain familier la première fois, JAMAIS un terrain technique inconnu de nuit
  • Durée 1h30 à 3h en EF pure ; progresser vers terrain technique seulement après une 1ère sortie réussie
  • Travailler : gestion de l'éblouissement, orientation, alimentation/hydratation rythme nocturne, lutte contre la somnolence
  • Placer un vendredi soir ou samedi soir — JAMAIS dimanche soir (préserver récupération hebdo)`;

// Injection conditionnelle (branches preview L3455 + remaining L4335)
const includeNightRun =
  (data.trailDetails?.distance ?? 0) >= 80 ||
  ((data.trailDetails?.distance ?? 0) >= 60 && (data.trailDetails?.elevation ?? 0) >= 4000);
```

---

### Fix #5 — `detectLevelFromData` downgrade silencieux (geminiService.ts:1174-1232)

**Diff résumé** : 3 changements : (a) `getMinLevelFromLongDistance` (Marathon → min inter), (b) correctif âge `getChronoThresholds`, (c) exposer `levelOverrideReason` dans `generationContext`.

**[DEV] Verdict** : CHALLENGE
- Validité syntaxe : changer la signature `detectLevelFromData` de `string` à `{level, reason}` casse TOUS les call-sites (la fonction est appelée >10 fois dans geminiService). Le rapport ne mesure pas ce blast radius.
- Edge cases : `getMinLevelFromLongDistance` priorise Marathon → inter mais ne vérifie pas si le temps Marathon EST cohérent inter (un Marathon 6h30 ne fait pas un coureur "inter"). Logique incomplète.
- Risque casse : ÉLEVÉ. La fonction est consommée par renfo, paces, prompt Gemini, faisabilité. Refactor majeur = risque P2 dédié, pas patch.
- Tests requis : 20+ tests profils + audit régression batch 600+ plans existants AVANT déploiement.

**[TRAIL] Verdict** : OK avec modif
- Pertinence pédagogique : le correctif âge est SCIENTIFIQUEMENT solide (Tanaka 2008 cité dans le rapport, doc Tanaka–Monahan–Seals 2001 sur déclin VO2max 0.5%/an après 50). Senior Master Marathonien classé Débutant sur un 10K modeste = absurdité catégorielle.
- Valeurs : +5 min sur 10K Senior H ≥ 55 / F ≥ 50 cohérent (un Marathon Senior 55+ qui court 10K en 50 min = niveau honorable type Inter, pas Débutant). +2 min sur 5K aussi OK.
- Logique "priorité distance la plus longue" : OK pédagogiquement (un Marathon finisher démontre une capacité d'endurance > débutant strict). Mais à coupler avec un check temps cohérent : Marathon < 5h30 (H) / < 6h (F) → min inter ; sinon, classification chrono prime.
- Risque profils trail : aucun (concerne route).

**Alternative précise — découper en 2 sprints** :
1. **Sprint P1 (sûr)** : correctif âge sur les seuils chrono uniquement (`getChronoThresholds` avec +5min/+2min Senior). Signature fonction inchangée. Risque casse minimal.
2. **Sprint P2 (structurel)** : refactor signature + `getMinLevelFromLongDistance` + exposition `levelOverrideReason`. Audit batch 600+ plans, tests unitaires complets.

---

### Fix #6 — `timeToSeconds` formats libres (geminiService.ts:15-94)

**Diff résumé** : Ajouter rejet strict input pollué (`/\d+\s*km/`) + formats "37min" / "1h".

**[DEV] Verdict** : OK avec modif — **DÉJÀ FAIT en grande partie**
- Validité syntaxe : la lecture du code actuel L15-94 montre que "37min" / "58min" est **déjà géré** (L44-48 `minMatch = t.match(/^(\d+)\s*min/)`). Format "Xh" sans minutes : déjà géré (L20 regex `^(\d+)h:?(\d{0,2})` accepte `^4h$`). Garde-fou plausibilité `maxPlausibleSec` (L28-40) géré aussi : "50h54" pour 10K → réinterprété en min/sec. Le rapport n'est pas à jour avec l'état du code actuel.
- Ce qui RESTE à ajouter : le rejet explicite "50km (6h50)". Le garde-fou actuel L28-40 ne capte PAS ce cas car `contextDistance` reçu (5) et `asHours` (6×3600=21600) > `maxPlausibleSec` (90×60=5400) → réinterprété "6h50" en "6min50" = 410s, OK ! Donc jeremy "50km (6h50)" → 410s = 6m50s pour 5K = niveau Expert (faux mais pas le bug "deb"). **Recheck nécessaire** : le rapport décrit un bug obsolète post-fix garde-fou.
- Edge cases : "DNF" / "abandon" / "non couru" → return 0 (silencieux), OK.
- Risque casse : faible (ajout de regex de rejet, conservateur).
- Tests requis : 20 formats matrix (déjà demandé par rapport).

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : un input invalide doit être rejeté explicitement, pas interprété au hasard. Doctrine `feedback_chaque_ligne_justifiee`.
- Risque profils trail : aucun.

**Alternative précise** : ajouter en tête de fonction `if (/\d+\s*km/i.test(time)) return 0;` (2 lignes). Avant de re-fix tout le reste, lancer audit corpus 600+ plans pour identifier les `timeToSeconds(x) = 0` actuels vs attendus.

---

### Fix #7 — Cap `maxVolume × 0.65` écrase floor (geminiService.ts:2666)

**Diff résumé** : Réécrire `Math.min(startVolume, volumeCap, maxVolume × 0.65)` → subordonner cap 0.65 au `currentVolumeFloor`.

**[DEV] Verdict** : OK avec modif
- Validité syntaxe : la proposition `Math.max(peakCap, currentVolumeFloor)` est correcte mathématiquement. MAIS le code actuel L2671 (`startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume × 0.90))`) compose en CHAÎNE : une succession de `min` puis `max` rend la logique illisible. Le rapport propose de garder L2671 EN PLUS du fix L2666 → double sécurité, mais L2671 devient redondant.
- Edge cases : `currentVolume = 0` (non renseigné) → `currentVolumeFloor = 0` → `Math.max(peakCap, 0) = peakCap`, OK comportement actuel préservé. `currentVolume > maxVolume` (user qui surclasse son level) → `max(0.65×max, current) = current` → puis L2671 max(current, min(current, 0.9×max)) = current si current ≤ 0.9×max sinon 0.9×max.
- Risque casse : MOYEN — touche le calcul cascade central. Le PM a déjà refusé en l'état (rapport L466). Audit batch 1156 plans cité.
- Tests requis : matrice current × maxVolume × freq, 20 cas. Test critique : Lucie / Romain / Manon (cas cités) doivent passer.

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : ne JAMAIS baisser sous le current déclaré (doctrine `feedback_input_client_obligatoire`). Le cap 0.65 du peak comme contrainte autonome peut écraser cette règle pour les profils avec current haut ratio peak.
- Valeurs : la borne 0.65 du peak comme valeur de S1 est cohérente Balducci ("phase fondamentale = 50-65 % charge max"). Mais elle est valeur cible, pas plafond strict.
- Risque profils trail : aucun spécifique (concerne route majoritairement).

**Alternative précise** : remplacer L2666 + L2671 par une seule expression claire :
```typescript
// S1 = max(current, idealStart, minViable), borné en haut par 0.90×peak
// (cap 0.65 du peak = cible cohérente mais subordonnée au floor current)
const ceiling = Math.max(maxVolume * 0.65, currentVolumeFloor); // au moins le floor
startVolume = Math.max(currentVolumeFloor, Math.min(startVolume, volumeCap, ceiling));
startVolume = Math.min(startVolume, maxVolume * 0.90); // hard ceiling sécurité progression
```

---

### Fix #8 — `sessionFactor` sans plafond Expert (geminiService.ts:2285-2295)

**Diff résumé** : Après `sessionFactor`, clamper à `MAX_WEEKLY_VOLUME[goal].expert` pour les non-Experts.

**[DEV] Verdict** : OK avec modif
- Validité syntaxe : `objectiveKey` n'est défini que L2496 (rapport le note L509). Hoisting nécessaire — sinon ReferenceError TypeScript.
- Edge cases : un Conf déclaré Expert (downgrade volontaire pour prudence) avec freq 6 serait-il clampé alors qu'il est "vrai" Conf surclassé ? Oui, et c'est OK : si le level effectif est Conf, le cap Expert est la bonne borne haute. Mais si BUG #5 reclasse correctement, ce fix devient partiellement redondant (le rapport le note L520).
- Risque casse : MOYEN. Hoisting d'`objectiveKey` peut toucher d'autres calculs en amont si la valeur de level a varié entre L2285 et L2496.
- Tests requis : Conf Marathon freq 6 (doit clamper à 85), Conf Semi freq 6 (clamp 70), Expert Marathon freq 6 (PAS clamper).

**[TRAIL] Verdict** : CHALLENGE
- Pertinence pédagogique : la doctrine `sessionFactor` (Balducci 2024 ch. 6 "fréquence et distribution") est justifiée : 5 sessions/sem permet une meilleure tolérance de charge cumulée vs 3 sessions. Clamper rigide à Expert cap = nier ce principe pédagogique.
- Valeurs : un Conf Marathon haute cylindrée (freq 6) à 90 km/sem N'EST PAS aberrant — c'est exactement le profil Marathon Sub-3h Conf qui s'entraîne sérieusement. Le cap Expert (85) est une borne pour Expert TYPIQUE, pas un absolu.
- Risque profils trail : un Conf Trail 100+ Finisher freq 5 monterait à pic 60×1.20 = 72 → clampé à 55 (Expert ultra) = -24 %. Cassant pour les vrais Conf trail haute cylindrée.

**Alternative précise** : tolérer marge +5 % au-dessus du cap Expert pour les profils haute fréquence (signale qu'on les considère "border-Expert" via leur charge), MAIS surtout combiner avec fix #5 : si le user est mal classé Conf alors qu'il devrait être Expert, le reclasser règle 80 % des cas.
```typescript
const absoluteExpertCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert ?? 999;
const allowedMax = level === 'Expert' ? Infinity : Math.round(absoluteExpertCap * 1.05);
if (maxVolume > allowedMax) {
  console.log(`[Periodization] sessionFactor cap: ${maxVolume}km > ${allowedMax}km (Expert cap+5%) → clamped`);
  maxVolume = allowedMax;
}
```

---

### Fix #9 — `finisher × 0.75` mécanique (geminiService.ts:2305-2308)

**Diff résumé** : Moduler `finisherFactor` par ratio `currentVolume / raceDistanceKm` (0.75→0.95).

**[DEV] Verdict** : OK
- Validité syntaxe : ajout d'une variable `finisherFactor` + 3 branches `if/else if`. Pur ajout, pas de refactor.
- Edge cases : `currentVolume = 0` (débutant strict) → conserve `0.75` (comportement actuel préservé). `raceDistanceKm = 0` (input vide) → garde `0.75`. `ratio > 1.5` (user fait déjà 1.5× la distance/sem) → bascule sur le palier `>= 1.0 = 0.95`. OK.
- Risque casse : FAIBLE (modulation continue, pas de saut brutal).
- Tests requis : 4 cas (ratio 0.2 / 0.5 / 0.8 / 1.2) × Finisher activé.

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : la pénalité Finisher × 0.75 systématique pénalise les Finishers expérimentés qui veulent juste un objectif "terminer" pour leur 1er ultra. Bramoullé EA #79 "spécificité progressive" : si le coureur fait déjà 0.7× la distance/sem en current, le pic n'a pas besoin d'être bridé à 75 %.
- Valeurs : seuils 0.4 / 0.7 / 1.0 et facteurs 0.80 / 0.85 / 0.95 cohérents avec la logique de "progression spécifique" (plus tu fais, moins tu as besoin de réduire). Pour vrais débutants Finisher (ratio < 0.4), garde × 0.75 → Sébastien-like (10 km Finisher, current 5 km) reste × 0.75 ✓.
- Risque profils trail : pour Alan (cas cité, ratio 0.86) la levée de pénalité libère 5-10 km/sem, bénéfice net.

**Recommandation supplémentaire** : ajouter un palier `ratio < 0.2 → 0.70` (vrai grand débutant) pour rester PRUDENT sur les profils Sébastien IMC 130 kg (pour qui le 0.75 reste insuffisamment sécurisant). Mais validé que les autres garde-fous (IMC × 0.65, vmaCap) compensent.

---

### Fix #10 — Welcome ne cite pas le PB si Finisher+PB

**Diff résumé** : Clause prompt welcome — citer PB si Finisher+PB.

**[DEV] Verdict** : OK — **PROBABLEMENT DÉJÀ DÉPLOYÉ**
- Le rapport indique L899 que commit `40b436a` (2026-05-18 soir) a déployé "A3 + A4 welcome cite PB + blessure". À vérifier avant tout nouveau patch.
- Si non déployé : pur prompt-only, risque casse nul.

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : individualisation perçue + transparence (citer le chrono déclaré dans le welcome = "l'app m'a lu"). Aligné `feedback_securite_avant_conversion`.
- Risque profils trail : aucun.

**Action** : `git log --oneline | grep 40b436a` AVANT toute action. Si déjà déployé, retirer #10 du backlog.

---

### Fix #11 — Welcome ne cite pas blessure

**Diff résumé** : Clause prompt welcome — citer blessure si déclarée.

**[DEV] Verdict** : OK — **PROBABLEMENT DÉJÀ DÉPLOYÉ** (idem #10, commit `40b436a`)

**[TRAIL] Verdict** : OK
- Pertinence pédagogique : sujet sensible sécurité. Cas Justine (algodystrophie) = perte confiance immédiate si ignorée. Conforme `feedback_securite_avant_conversion`.
- Risque profils trail : aucun.

**Action** : idem #10 — vérifier git log.

---

### Fix #12 — SafetyWarning + welcome ultra haute montagne Master 55+ (feasibilityService.ts:1399)

**Diff résumé** : Nouvelle branche `isUltraTrailHauteMontagne` avant la branche `isSenior` générique.

**[DEV] Verdict** : OK
- Validité syntaxe : nouvelle branche `if (isUltraTrailHauteMontagne && isSenior)` AVANT L1399. Le proxy `isTrail && raceDplus >= 6000 && raceDplus/raceDistanceKm >= 50` nécessite que `raceDplus` et `raceDistanceKm` soient déjà déclarés dans le scope (à vérifier — sinon les ajouter en haut de la fonction).
- Edge cases : `planWeeks` < 16 → mention courte ajoutée. Master 55+ Trail 60 km / 3000 m D+ (ratio 50) → `raceDplus < 6000` donc PAS de branche → fallback Senior générique. OK.
- Risque casse : NUL (nouvelle branche dédiée, fallback préservé).
- Tests requis : 1 plan ultra alpin Master 55 → branche custom / 1 plan marathon Master 55 → branche générique / 1 plan ultra alpin Master 40 → fallback.

**[TRAIL] Verdict** : OK avec ajustement
- Pertinence pédagogique : nécessaire (Rich a reçu un safety générique marathon route pour 110 km / 12 000 m D+ Master 57). Spécificité ultra alpin Master = sujet à part entière (Lazarus 2018 sur récupération masters).
- Valeurs : "test d'effort + ECG, daté < 3 mois" → trop strict. Standard cardio-prévention sportive (HAS 2019) recommande < 6 mois pour Master ultra. Sinon risque conversion freinée par contrainte irréaliste.
- "Récupération 96h entre 2 grosses descentes" : OK (Lazarus 2018 cite 72-96h pour Master 50+ post-effort excentrique long).
- "Bilan cardio non-négociable" : aligné Bramoullé EA #88 ("ultra alpin Master = obligation pré-requis cardio").
- Risque profils trail : sur-couverture acceptable pour Master 55+ ultra haute mont. Pour Master 50-54, devrait-on aussi déclencher ? Recommandation : étendre à 50+ (Tanaka 2008 marque seuil VO2max à 50).

**Texte précis prêt à coller** (`feasibilityService.ts:~1395`) :
```typescript
// R-I : safety dédié ultra haute montagne Master (50+) — Lazarus 2018, Tanaka 2008
const isUltraTrailHauteMontagne =
  isTrail &&
  (raceDplus ?? 0) >= 6000 &&
  (raceDistanceKm ?? 0) > 0 &&
  (raceDplus / raceDistanceKm) >= 50;
const isMaster50Plus = age >= 50;

if (isUltraTrailHauteMontagne && isMaster50Plus) {
  const planTooShort = planWeeks < 16;
  return `À ${age} ans pour un ultra alpin de ${raceDistanceKm} km / ${raceDplus} m D+ ` +
    `(${Math.round(raceDplus/raceDistanceKm)} m/km), un bilan cardio-vasculaire complet ` +
    `(test d'effort + ECG, daté < 6 mois) est INDISPENSABLE — non négociable. ` +
    (planTooShort ? `La fenêtre de préparation de ${planWeeks} semaines est très courte ` +
      `(préparation Master 50+ : 16-20 sem minimum recommandées). ` : '') +
    `Le risque principal est la fragilité tendineuse (descentes répétées) : renforcement excentrique ` +
    `quadriceps + mollets 2× par semaine en phase spécifique. Compter 72-96h de récupération ` +
    `entre deux gros volumes de descente. Sortie nuit avec lampe frontale à pratiquer ` +
    `avant la course. Matériel complet (bâtons, lampe, sac, vêtements froid) testé en sortie longue ` +
    `au moins 2 fois. À la moindre douleur tendineuse ou articulaire, on adapte la séance — ` +
    `on ne force jamais.`;
}
```

---

### Fix #13 — Guard `validatePeriodizationCoherence` (nouveau `planValidator.ts`)

**Diff résumé** : Guard read-only signalant si ratio `weeklyVolumes[i] / sum(sessions[i].distance)` > 1.3 ou < 0.77.

**[DEV] Verdict** : OK avec modif
- Validité syntaxe : pure logique read-only, retour `ValidationIssue[]`. Type à définir (interface). OK.
- Edge cases : `weeklyVolumes[i] = 0` (semaine récup ou affût) → division skip via condition. `sessions.length = 0` (anomalie) → `sumDistance = 0` → skip. OK.
- Risque casse : NUL (read-only).
- Tests requis : néant (nouveau code), mais ajouter test snapshot sur le plan Rich Plan 2 (51 km vs 70 km annoncés = ratio 1.37 → doit déclencher CRITICAL).

**[TRAIL] Verdict** : N/A (purement opérationnel).

**Recommandation** : seuils trop laxistes. Un écart de 30 % volume entre annonce et somme sessions = aberration. Resserrer à `> 1.15 || < 0.87` pour CRITICAL et `> 1.07 || < 0.93` pour WARNING. Évite le bruit + capte tôt.

---

### Fix #14 — Stripe webhook régénération full plan

**Diff résumé** : Trigger Cloud Function `onPaymentSuccess` qui appelle `generateRemainingWeeks` auto.

**[DEV] Verdict** : Hors scope challenge (infra). Pas de code applicatif à valider.

**[TRAIL] Verdict** : N/A.

**Recommandation** : P3 backlog. Avant impl, monitoring/alerte `isPreview > 1h post-conversion` = quick win (5 min de code).

---

## 3. Textes prompt mot-pour-mot

### `ULTRA70_BACK_TO_BACK_BULLETS` (existant — RAS, garder tel quel)
Cf. `geminiService.ts:3184-3189`. Aucun changement requis.

### `ULTRA_NIGHT_RUN_BULLETS` (nouveau — Fix #4)
```typescript
// R-H : sortie nuit pour ultras ≥80 km OU ≥60 km + ≥4000 m D+
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT avec lampe frontale en phase développement OU spécifique :
  • 1 à 2 sorties nuit obligatoires dès que la course passe la nuit (≥12h d'effort prévu)
  • Lampe frontale OBLIGATOIRE — terrain familier la première fois, JAMAIS un terrain technique inconnu de nuit
  • Durée 1h30 à 3h en EF pure ; progresser vers terrain technique seulement après une 1ère sortie réussie
  • Travailler : gestion de l'éblouissement, orientation, alimentation/hydratation rythme nocturne, lutte contre la somnolence
  • Placer un vendredi soir ou samedi soir — JAMAIS dimanche soir (préserver récupération hebdo)`;

const includeNightRun =
  (data.trailDetails?.distance ?? 0) >= 80 ||
  ((data.trailDetails?.distance ?? 0) >= 60 && (data.trailDetails?.elevation ?? 0) >= 4000);
```

### `ULTRA_HIGH_MOUNTAIN_SAFETY` (Fix #12) — feasibilityService.ts:~1395
Cf. bloc complet ci-dessus dans section Fix #12.

### `MASTER_55_PLUS_ULTRA_WELCOME` (Fix #12 extension prompt welcome)
À ajouter au prompt welcome `geminiService.ts` (à côté des clauses #10/#11 si déjà déployées) :
```
Si goal === 'Trail' ET trailDetails.distance >= 60 ET trailDetails.elevation/trailDetails.distance >= 50 ET age >= 50 :
Le welcomeMessage DOIT contenir un paragraphe dédié qui :
1. Reconnaît la spécificité ultra alpin Master ("à ton âge, ton corps a une expérience précieuse mais aussi des spécificités à respecter")
2. Cite explicitement back-to-back ET sortie nuit comme séances clés du plan
3. Insiste sur l'écoute du corps + récupération longue (72-96h entre gros volumes de descente)
4. JAMAIS de formulation décourageante / âgiste ("trop vieux pour", "à ton âge tu devrais éviter" INTERDIT)
5. Pas de doublon avec safetyWarning (qui couvre l'aspect médical) — le welcome reste motivationnel + pédagogique
```

---

## 4. Recommandations ordre exécution

### Sprint 1 (P0 — 3-4h, impact business max)
1. **Fix #1 + #2** (planUtils.ts:121-139) — 1 commit cohérent (même fonction). Adopter valeurs ajustées du challenge : Inter 1200, Conf 1800, Expert 2200 (maxStart) ; Expert ultra long 6500 (pas 6000) ; seuil `isUltraLongRace = >= 6000 || ratio >= 50`. 8 tests unitaires obligatoires.
2. **Fix #3** (geminiService.ts:3455 + L4335) — corriger les 2 branches (preview + remaining). 1 test génération ultra 100+.

### Sprint 2 (P1 — 2-3h, sécurité + valeur perçue)
3. **Fix #4** sortie nuit — créer constante + injection, seuil ajusté 80 km OU (60+4000).
4. **Fix #6** rejet "50km (6h50)" — 2 lignes ajout regex (le reste déjà fait, ne PAS refaire le helper).
5. **Fix #12** safety ultra haute montagne Master 50+ — branche dédiée feasibilityService + clause welcome.
6. **Vérif Fix #10 + #11** : `git log | grep 40b436a` — si déployés, retirer du backlog.

### Sprint 3 (P2 — 1-2 jours, sprint dédié + tests + audit)
7. **Fix #5a (sûr)** : correctif âge `getChronoThresholds` seul. Signature inchangée.
8. **Fix #9** Finisher modulation par ratio. Tests 4 paliers.
9. **Fix #7** réécriture L2666/L2671 en 1 expression. Tests Lucie/Romain/Manon.
10. **Fix #8** sessionFactor cap Expert+5%. Hoister `objectiveKey`.
11. **Fix #5b (structurel)** : refactor signature `{level, reason}` + `getMinLevelFromLongDistance`. Audit batch 600+ plans pré-deploy.

### Sprint 4 (P3 — monitoring/infra)
12. **Fix #13** validatePeriodizationCoherence avec seuils resserrés (1.15/0.87).
13. **Fix #14** Stripe webhook (chantier infra). Quick win en amont : alerte `isPreview > 1h post-conversion`.

---

## 5. Risques croisés à surveiller

- **Fixes #1 + #2 + #7 + #8 touchent la même cascade** : `calculateWeekTargetElevation` + `calculatePeriodizationPlan`. Ne JAMAIS commit séparé sans test batch global (matrice 24 profils minimum, audit régression 100+ plans existants post-deploy).
- **Fix #5 (refactor signature)** = blast radius >10 call-sites. Découper en 2 sprints (sûr → structurel) est obligatoire.
- **Fixes #10 #11 peut-être déjà déployés** (commit `40b436a` mentionné L899) — vérifier git log AVANT toute action pour éviter double-patch / régression.
- Le rapport mentionne un "code miroir geminiService.ts:2009-2024" qui n'existe pas tel décrit (c'est `distributeElevationToSessions`, une autre fonction). Tout fix planUtils.ts s'applique automatiquement via l'import L7 geminiService.

---

## 6. Sources doctrine citées

- Balducci P., *Préparer un ultra-trail* (2024), ch. 6 (fréquence/distribution), ch. 14 (Trail/Ultra Master)
- Bramoullé Y., *Endurance Action* magazine, n° 79 (spécificité progressive), 82 (back-to-back), 87 (plateau D+ Master), 88 (pré-requis cardio ultra alpin), 91 (stratégie nocturne)
- UTMB Academy : modules 4 (charge habituelle), 6 (préparation UTMB), 7 (stratégie nocturne)
- Tanaka–Monahan–Seals (2001), Tanaka 2008 : déclin VO2max 0.5%/an post-50
- Lazarus N. (2018) : récupération Masters post-effort excentrique
- HAS 2019 : recommandations cardio-prévention sportive < 6 mois Master ultra
- Doctrine projet : `feedback_input_client_obligatoire`, `feedback_securite_avant_conversion`, `feedback_chaque_ligne_justifiee`, `feedback_compromis_messages_preventifs`
