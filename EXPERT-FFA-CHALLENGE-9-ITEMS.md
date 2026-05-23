# Expert FFA challenge 9 items (Christopher + Sprint A+B residus)
Date : 2026-05-22
Auditeur : coach FFA 20 ans, formateur national.
Sources : `AUDIT-DEV-EXPERT-SPRINT-AB.md`, plan Christopher (1779456984279), `feasibilityService.ts`, `geminiService.ts`.

## Verdict global
**6 CONFIRMÉ / 2 NUANCÉ / 1 INFIRMÉ.** Le code est safe en prod (aucun risque utilisateur immédiat), mais Christopher cristallise un trou structurel : freq=3 + Semi sub-1h45 = bottleneck physique non assumé par le produit. Sprint C requis sous 72 h, pas urgent ce soir.

---

## Items P1 dev expert (audit interne)

### Item 1 — Faux ami tests Bug #5
**Verdict** : ✅ CONFIRMÉ.
**Coach** : Bug réel et grave en termes process. La fonction prod `buildTransparencyBlock` dans `geminiService.ts:4137-4163` est inlinée dans le pipeline preview (variable locale). La réplique dans `sprint-b-p1-fixes.test.ts:253-280` et `validation-sprint-ab-10-profils.test.ts:40` est byte-pour-byte la même logique mais déclarée DANS le fichier de test. Si demain on change le palier 1.5→1.6 dans la prod, les 6 tests Bug #5 restent verts. Doctrine `feedback_securite_avant_conversion` violée : on se ment sur la couverture. Pas Pfitzinger/Daniels ici, c'est de l'hygiène test pure.
**Fix** : extraire `buildTransparencyBlock(cvForRatio, s1VolForRatio): string` en fonction exportée dans `geminiService.ts` (avant L4119), importer dans les 2 fichiers de tests, supprimer les répliques inline. Garder la signature minimale (2 args numériques) pour rendre le test léger.
**Effort** : 20 min (15 extraction + 5 vérif tests).
**Risque** : nul. Pure refacto. Les outputs sont identiques (le test va simplement les vérifier sur la vraie fonction).

### Item 2 — `buildFinisherFeasibility` ignore Bug #2b + #2c
**Verdict** : ⚠️ NUANCÉ.
**Coach** :
- **Cap senior 60/70/75 en Finisher** : OUI il faut l'appliquer. Hammond *Endurance Masters* est explicite : la dégradation VO2max (0.5-1%/an dès 55 ans, 1-1.5%/an après 70 ans) ET la récupération inter-séance (2-3× plus lente à 75 ans) sont indépendantes de la cible. Un senior "Finisher" sur Marathon a la MÊME contrainte cardio que celui qui vise sub-4h, sauf qu'il n'a pas de pression chrono. Donc le score doit refléter le risque cardio/récupération, même Finisher. Pfitzinger *Faster Road Racing* chap. "Masters Athletes" recommande explicitement de cap la confidence "réussite" sans toucher l'allure cible (cohérent doctrine `feedback_jamais_baisser_allure_cible`).
- **Cross-check PB (Riegel) en Finisher** : NON, pas applicable. Le sens de Bug #2c = "ta cible est plus rapide que ton PB → on alerte". Finisher n'a pas de cible chronométrée, donc le concept n'a pas de sens. Faux problème de ce côté-là.
**Fix** : dans `feasibilityService.ts:1466-1473` (zone Sprint 3a), étendre le cap senior `Math.min(score, 90/75/70)` selon les 3 paliers de Bug #2b, pas seulement le cap 84. Pseudo-code :
```
if (params.age >= 75) score = Math.min(score, 70);
else if (params.age >= 70) score = Math.min(score, 75);
else if (params.age >= 60) score = Math.min(score, 90);
```
À insérer après ligne 1494 (`pbCheck` existant), avant le P0c ramp guard. **Ne PAS dupliquer Bug #2c côté Finisher**, c'est par design inapplicable.
**Effort** : 20 min (5 code + 5 commentaire doctrine + 10 test Finisher 72 ans Marathon).
**Risque** : faible. Profils touchés = 60+ ans en mode Finisher qui partaient à 80+ → ils descendent à 90/75/70 selon âge. Cohérent avec ce qui se fait déjà côté path chronométré. Aucune régression sur < 60 ans.

### Item 3 — Bug #5 faux positif petits volumes
**Verdict** : ✅ CONFIRMÉ.
**Coach** : Gabbett ACWR (Br J Sports Med 2016) est calibré sur des cohortes d'athlètes à charges absolues significatives. Le seuil 1.5 = "zone rouge" est statistiquement pertinent à partir de ~30-50 unités de charge hebdo (variables selon métrique). Sur cv=2 km → S1=5 km, le delta absolu est 3 km — soit une sortie unique. Crier "risque de blessure significatif Gabbett 2.5" sur 3 km est ridicule cliniquement et VIOLE la doctrine `feedback_securite_avant_conversion` à l'envers : on dramatise au lieu d'embellir. Daniels *Running Formula* (4e éd., chap. 1) : la règle 10%/sem n'a de sens qu'à partir de ~15 km/sem, en-dessous on est dans la phase d'initiation où les sauts absolus dominent les ratios.
**Fix** : dans `geminiService.ts:4137`, ajouter un guard avant le branchement palier :
```
const ABSOLUTE_DELTA_THRESHOLD_KM = 8; // sous ce delta absolu, ratio non pertinent
if (s1DeltaKm < ABSOLUTE_DELTA_THRESHOLD_KM && cvForRatio < 10) {
  // Petits volumes : pas de wording alarmiste, bloc vide.
  // Le saut existe mais reste cliniquement gérable (delta < 1 séance moyenne).
  return ''; // ou wording neutre minimal
}
```
Garde le ratio en logique pour cv ≥ 10 (où Gabbett devient pertinent). **À ne PAS étendre cv=0 (déjà géré par cv≤0 → '').**
**Effort** : 15 min (5 code + 10 test cv=2 S1=5 + cv=3 S1=6 → bloc vide).
**Risque** : nul. Le seul effet = retirer un wording alarmiste là où il ne s'applique pas. Ne dégrade aucun cas légitime (cv ≥ 10 ou delta ≥ 8 km gardent leur palier).

---

## Items Christopher (plan 1779456984279)

**Contexte rappel** : Confirmé Semi 1h45, freq=3 (2 course + 1 renfo), cv=30, VMA 13.0, PB semi 2h04, 20 sem. Pic plan = 33 km. Status AMBITIEUX 60.

### Item 4 — Two-shot S1 (2 séances quasi-identiques 13 km)
**Verdict** : ✅ CONFIRMÉ.
**Coach** : C'est un bug LLM induit par l'absence d'instruction de différenciation. Pfitzinger *Faster Road Racing* (chap. 4 "The Schedules — Half Marathon") + Daniels *Running Formula* (4e éd., chap. 11) imposent une **hiérarchie des séances** sur freq=3 :
- 1 SL (séance pilier endurance, 30-35% du volume),
- 1 séance "milieu" (footing tempo / progressif / mix court-rapide selon phase),
- (1 séance qualité — mais ici renfo donc N/A).

La règle "SL 30-40% volume hebdo" du prompt (`geminiService.ts:4231`) est respectée techniquement (13/26 = 50%, légèrement au-dessus) mais **mécaniquement** : si le prompt dit "VOLUME S1 = 26 km" + "SL ≥ 30%" + 2 séances course, le LLM cherche un équilibre 50/50 par défaut. Il manque l'instruction "la séance non-SL doit faire 50-70% de la durée/distance de la SL". Magness *Science of Running* (chap. 9) : la variabilité intra-semaine est aussi importante que le volume — 2 sorties identiques crée une réponse adaptative pauvre.
**Fix** : ajouter dans le prompt preview (`geminiService.ts` après L4231) un bloc :
```
🔴 HIÉRARCHIE OBLIGATOIRE des séances course (quand freq course ≥ 2) :
- 1 Sortie Longue (la plus longue) : 30-40% du volume hebdo, durée selon table SL.
- Autres séances course = FOOTING (Jogging) : entre 35% et 60% de la distance de la SL.
- INTERDIT : 2 séances de durée ou distance identique (± 10%). Le footing court doit être visiblement plus court que la SL (au minimum -25% distance).
```
**Effort** : 30 min (10 prompt + 20 test 3 profils freq=3 Semi/10K/Marathon pour valider que le LLM respecte).
**Risque** : moyen. Sur cv très bas (Débutant 3 séances cv=10), forcer un footing court (40% SL) peut sous-stimuler. À tester avec un floor "footing ≥ 4 km" pour éviter une séance de 3 km dérisoire. Pas de régression sur freq ≥ 4 (déjà bien différencié dans la doctrine actuelle).

### Item 5 — SL 1h30 mardi S1 trop long
**Verdict** : ⚠️ NUANCÉ.
**Coach** : Pas un bug absolu mais pas optimal non plus.
- Pour Christopher Confirmé Semi : MAX_SL_DURATION Semi/Confirmé = **115 min** (L1245). Pfitzinger FRR plans "Semi 2h+" semaine 1 = SL 13 km = ~75-80 min à allure EF. Donc **90 min S1 est plus long que le standard Pfitzinger** d'environ 12-15 min, mais reste sous le plafond système.
- Pfitzinger principe "long run = 20-25% peak weekly volume during base phase, building to 30%" : 13/26 = 50% S1 = **OUI trop long en proportion**, mais c'est lié au bug Item 4 (deux séances confondues). Si une vraie séance courte 6-8 km était proposée à côté, la SL à 13 km / 90 min serait défendable.

Le vrai problème n'est PAS la durée de 90 min en absolu — c'est la combinaison "S1 phase fondamentale + freq=3 + pas de différenciation" qui fait gonfler chaque sortie.
**Fix** : pas besoin de cap dur "S1 ≤ 60 min" — ça contredirait MAX_SL pour Confirmé Semi. À la place, dans le prompt preview ajouter une règle phase fondamentale S1-S2 :
```
🔴 PHASE FONDAMENTALE S1-S2 (calibrage doux Pfitzinger Building Base) :
La SL en S1 doit être à 65-75% de la durée SL maximale (table MAX_SL). 
Pour ton profil : SL S1 entre 75 et 90 min max. NE PAS commencer au plafond.
```
Et fixer Item 4 (footing court) en priorité — c'est lui qui pollue Item 5.
**Effort** : 15 min (intégrer dans le même patch prompt qu'Item 4).
**Risque** : faible. Mais attention pour Débutants cv=0 : ce cap 65-75% peut donner SL 30-40 min — c'est déjà l'esprit de `MIN_SL_DURATION_MIN` (40 min Semi/déb). Pas de conflit.

### Item 6 — Pic 33 km insuffisant Semi 1h45 freq=3
**Verdict** : ✅ CONFIRMÉ (mais le fix recommandé = (b), pas (a)).
**Coach** : Christopher VMA 13.0, cible 1h45 demande VMA ~14.2 (gap 9%). Pfitzinger FRR "Half Marathon Schedule — Up to 47 mi/week" (le moins exigeant chez Pfitzinger pour sub-1h45) demande **47-65 mi/sem = 75-105 km/sem** au pic. Daniels VDOT 49 (= 1h45 semi) recommande 60-90 km/sem.

Avec freq=3 (2 course + 1 renfo), même en allongeant à 90 min/séance, à 12-13 km/h en EF :
- SL 22 km (165 min) + 1 footing 13 km (~95 min) = **35 km max**.
- Pour atteindre 45-50 km pic, il faudrait soit 2 SL de ~22 km (irréaliste hebdo), soit freq=4.

C'est un **bottleneck physique réel**, pas un bug code. Le code fait ce qu'il peut : pic 33 km est le maximum tenable en freq=3 sans risque. Le vrai problème = on a accepté un objectif sub-1h45 sur freq=3 alors que la combinaison est structurellement insuffisante.

**Options analyse** :
- (a) **REJETÉ** : forcer 22 km × 2 = SL doublée → contradit Hanson <30% volume hebdo, doctrine `feedback_securite_avant_conversion`, et techniquement bloque les autres caps.
- (b) **RECOMMANDÉ** : Welcome explicite + faisabilité plus dure. Le `feasibility.status = AMBITIEUX 60` est correct mais le message ne dit pas "freq=3 est insuffisante pour cet objectif". Ajouter un message ciblé Semi/Marathon + freq ≤ 3 + targetPaceVsVMAneed > 8% : "Pour ce temps cible, 4 séances course/sem sont fortement recommandées. Avec 3 séances + renfo, ton plan plafonne à ~33 km/sem alors que les standards Pfitzinger pour 1h45 demandent 45-65 km/sem."
- (c) **REJETÉ** : downgrade auto = viole doctrine `feedback_jamais_baisser_allure_cible`.
- (d) Possibilité : modal optionnel "passer à freq=4" pré-génération avec accord user (UX-heavy, hors scope code).

**Fix** : dans `feasibilityService.ts` (zone messages AMBITIEUX/RISQUÉ L948+), ajouter un warn structuré dans `reasons` quand :
- `(isSemi || isMarathon) && params.frequency <= 3 && (gapPercent > 5 || (isMarathon && gapPercent > 3))`.

Texte : "freq ${frequency} séances/sem est juste pour viser ${targetFormatted} sur ${distance} — les standards (Pfitzinger FRR, Daniels Running Formula) recommandent 4-5 séances/sem pour cette intensité. Le plan fera ce qu'il peut mais le pic restera limité à ~33 km/sem."
**Effort** : 30 min (10 logique + 5 message + 15 test 3 profils Semi/Marathon freq=3).
**Risque** : faible. Profils freq=4-5 non touchés. Le message est informationnel, pas bloquant.

### Item 7 — Stagnation S5-S18 (pic dès S3, plateau 14 sem)
**Verdict** : ✅ CONFIRMÉ.
**Coach** : Audit weeklyVolumes : `[26,32,33,26,30,31,24,28,31,24,28,31,24,28,31,24,28,31,21,17]`. Pic 33 km atteint S3, ensuite oscillation 24-31 km jusqu'à S18 (affûtage). C'est une **stagnation structurelle** (15 sem sans nouveau plafond).

Cause : `calculatePeriodizationPlan` à L3148 : `currentVol = Math.min(currentVol * (1 + effectiveRate), maxVolume)`. Avec maxVolume = 33 (capé par VMA-duration freq=3 Semi Confirmé), une fois atteint, le code "ondule" autour du plafond. Pfitzinger FRR (chap. 5 "Building the Base") + Magness *Science of Running* : la périodisation classique exige une **progression entre phases** — phase fondamentale doit atteindre 70-80% peak, développement 90-100%, spécifique 95-100% avec touches qualité. Là on plafonne dès S3 = phase fondamentale → aucun headroom pour développement/spécifique.

Le problème n'est PAS le code de progression — c'est que **maxVolume est trop bas dès le départ** (cap VMA-durée freq=3). La fonction fait ce qu'on lui demande : monter le plus haut possible et y rester. Le bug = **maxVolume trop bas crée une fausse impression de "ça stagne"**.

**Fix** : double piste, fais les deux.
1. **Coefficient progressif par phase** dans `calculatePeriodizationPlan` L3119+ : appliquer un cap implicite phase × phase.
   ```
   // Phase fondamentale : cap à 80% maxVolume (laisse headroom)
   // Phase developpement : cap à 92% maxVolume
   // Phase specifique : cap à 100% maxVolume (vrai pic ici)
   const phaseCap = phases[i] === 'fondamental' ? maxVolume * 0.80
                  : phases[i] === 'developpement' ? maxVolume * 0.92
                  : maxVolume;
   weeklyVolumes.push(Math.round(Math.min(currentVol, phaseCap)));
   ```
2. (Lié à Item 6) : revoir le cap VMA-durée freq=3 Semi Conf pour permettre un maxVolume ~40 (au lieu de 33). Cf. Item 6.

Pfitzinger note explicitement : "the long run grows in PHASES, not linearly". L'oscillation autour du plafond est CORRECTE quand on est en spécifique. Elle est FAUSSE quand on est en fondamental.

**Effort** : 1h (30 logique phase cap + 30 test 3 profils plans 16-20 sem pour vérifier la courbe).
**Risque** : moyen. Phase cap 80% sur plans très courts (< 8 sem) peut bloquer l'atteinte du pic — désactiver pour `totalWeeks ≤ 8`. Sur plans 16-20 sem, c'est l'inverse : la courbe devient enfin pédagogique.

### Item 8 — Welcome "mou" vs S1 "brutale"
**Verdict** : ❌ INFIRMÉ (problème UX cosmétique, pas un bug systémique).
**Coach** : Le welcome dit "construire progressivement" + "objectif ambitieux qui demande de la rigueur". S1 réelle = 2× 90 min EF. C'est **cohérent**, pas contradictoire :
- "progressivement" = la périodisation est globalement progressive (vrai : 26→33→ondulation).
- 2× 90 min EF en phase fondamentale = c'est CE QU'EST une phase fondamentale Pfitzinger : footing long, allure aérobie, pas d'intensité.

L'impression "brutale" vient d'Item 4 (deux séances identiques) qui crée une perception de "déjà gros tout de suite". **Fix Item 4 → résout Item 8.** Pas besoin d'un patch dédié au welcome.

Exception : si on veut être vraiment propre, le welcome devrait mentionner le volume réel S1 (cf. transparencyBlock Bug #5). Ici cvForRatio=30, S1=26 → ratio 0.87 < 1.15 → bloc vide légitime. Le welcome n'a aucune transparence volume à donner.
**Fix** : aucun. Fixer Item 4 suffit.
**Effort** : 0.
**Risque** : 0.

### Item 9 — Alerte "20 sem c'est long" contradictoire
**Verdict** : ✅ CONFIRMÉ (bug logique + UX).
**Coach** : Vérification code : `feasibilityService.ts:974-979` et `1614-1619` :
```
const maxRecommendedWeeks = isMarathon ? 20 : isSemi ? 18 : isTrail ? 20 : 14;
if (planWeeks > maxRecommendedWeeks && !beginner) {
  longPlanWarning = `⚠️ DURÉE DU PLAN : ${planWeeks} semaines, c'est long pour ton profil. La plupart des coureurs de ton niveau préparent cette distance en ${maxRecommendedWeeks} semaines maximum...`
}
```

Pour Christopher : Semi + Confirmé + 20 sem → 20 > 18 → warning FIRE. **Et c'est faux dans son cas précis.**

Pourquoi le warning existe : valide en théorie (Pfitzinger FRR plans Semi typiques 8-12 sem, plus c'est long plus la lassitude/stagnation menacent — confirmé Daniels et Magness sur la fenêtre "peaking"). Mais Christopher **a besoin** des 20 sem car :
- Cible 1h45 vs niveau actuel 2h04 = gap 15% sur le temps → préparation longue justifiée.
- VMA gap +9% = nécessite construction aérobie progressive.

Donc le warning est **théorique-correct mais contextuel-faux** : il manque la condition "user a-t-il besoin de cette durée vu son gap PB/cible ?". Pfitzinger lui-même recommande 18-24 sem quand le gap PB/cible > 10%.

**Fix** : conditionner le warning au gap PB/cible.
```
// Dans buildMessage / calculateFeasibility autour L974 :
const pbGapJustifiesLong = pbCheck && pbCheck.gapPct >= 8; // gap PB→cible > 8% justifie plan long
const needsLongRamp = (params.peakVolume ?? 0) / (currentVolume ?? 1) >= 1.5;
if (planWeeks > maxRecommendedWeeks && !beginner && !pbGapJustifiesLong && !needsLongRamp) {
  // warning seulement si plan long ET pas justifié par gap PB ni rampe volume
  longPlanWarning = ...
}
```

Le warning reste utile pour les cas "Confirmé 20 sem Semi PB cohérent" (lassitude réelle), il disparaît pour Christopher (gap 15% PB→cible).

**Effort** : 30 min (15 logique + 10 vérif 2 paths buildFinisherFeasibility + 5 test Christopher).
**Risque** : faible. Le warning devient plus rare = moins d'alerte mais aucun cas dangereux ouvert (le warning n'est pas un garde-fou sécurité, c'est un conseil d'optimisation).

---

## Hiérarchisation Sprint C

### P0 urgent (sous 24h, bloque rien mais visible)
- **Item 9** (alerte 20 sem contradictoire) : 30 min. Visible immédiatement sur tous les plans longs Confirmé/Expert avec PB-gap > 8%. UX déceptive si on le laisse tel quel pendant un plan PM-validé comme celui de Christopher.

### P1 important (sous 72h)
- **Item 1** (faux ami tests Bug #5) : 20 min. Process risk, pas user risk. Doit être fait avant tout autre patch du transparencyBlock.
- **Item 3** (faux positif petits volumes Bug #5) : 15 min. Évite le wording brutal sur cv=2 S1=5. Trivial.
- **Item 2** (cap senior Finisher) : 20 min. Profils 60+ Finisher actuellement non capés. Fix simple.
- **Item 4** (two-shot S1 freq=3) : 30 min. Bug LLM induit, affecte tous les plans freq=3 sub-Semi. Plus haute valeur UX.
- **Item 6** (warning freq=3 insuffisante Semi sub-1h45) : 30 min. Honnêteté faisabilité, doctrine `feedback_securite_avant_conversion`.

### P2 nice-to-have (sous 1-2 semaines)
- **Item 7** (coefficient progressif phase × phase) : 1h. Impact sur 100% des plans 16+ sem. Test à 3 profils minimum avant déploiement.
- **Item 5** (cap SL S1 phase fondamentale) : 15 min, à packager avec Item 4.

### Hors scope
- **Item 8** (welcome mou) : INFIRMÉ, fix Item 4 résout collatéralement.

**Total Sprint C estimé** : 3h-3h30 sur 1 semaine.

---

## Décision globale

**Le produit actuel est safe en prod.** Les 9 items identifiés ne créent aucun risque utilisateur immédiat (pas de plan dangereux généré, pas de blessure encourue, pas d'allure baissée). Christopher reçoit un plan AMBITIEUX 60 honnête sur la cible, juste sous-optimal sur l'exécution intra-semaine.

**Pas de Sprint C urgent ce soir.** Les items P0 et P1 peuvent être planifiés sur les 72 h suivantes. Aucun rollback nécessaire.

**Recommandation Sprint C planifié** :
- J+1 (demain) : Items 1 + 3 + 9 (1h cumulée, faible risque). Tests anti-régression standard.
- J+2 : Items 2 + 4 + 6 (1h30). Tests sur 5 profils Semi/Marathon freq=3 + 2 Finisher senior.
- J+5-7 : Item 7 (refacto phase cap). Audit 10 plans existants pour vérifier non-régression.

**Le seul vrai chantier de fond = Item 7** (stagnation pic). Tout le reste est du polish.

---

## Recommandation patch live Christopher (J-17 startDate 08/06)

**GO patch live** — la S1 n'a pas été vécue, le user peut encore voir une préview corrigée.

Modifs exactes recommandées (sans toucher allure cible, sans baisser objectif, doctrine `feedback_input_client_obligatoire`) :

1. **S1 footing court différencié** : remplacer la 2e SL 13 km / 1h30 par un footing 7-8 km / 50-55 min EF allure 6:53. Sauve l'effet two-shot Item 4. Pas de vélo, pas de cross-training (doctrine `feedback_coach_running_ia_que_course`). La SL principale reste 13 km / 90 min.
2. **Volume S1 ajusté** : 26 → ~21 km (13 SL + 8 footing court + renfo séparé). Plus cohérent avec cv=30 (ratio 0.7, footing court de reprise progressif).
3. **Ne pas toucher** : weeklyVolumes S2-S20 (l'ondulation pic 33 est cohérente avec freq=3 — Item 7 reste un chantier code, pas un patch live).
4. **Welcome** : ajouter un paragraphe transparence freq=3 → "Avec 3 séances/sem (2 course + 1 renfo), ton plan plafonnera autour de 33 km/sem. Pour viser 1h45 dans des conditions Pfitzinger optimales, 4 séances course/sem seraient préférables (45-50 km/sem). On va construire au mieux dans tes contraintes — focus régularité et qualité du moindre footing." (≈ Item 6 manuel pour Christopher).
5. **Ne PAS supprimer l'alerte "20 sem c'est long"** : remplacer le wording — "20 sem est plus long que le standard Semi (8-12 sem), mais cohérent avec ton gap PB 2h04 → 1h45. On profite de cette marge pour une construction progressive." (≈ Item 9 manuel pour Christopher).

Effort patch live Christopher : 30 min.
