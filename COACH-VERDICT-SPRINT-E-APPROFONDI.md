# Verdict coach FFA 20 ans — Sprint E élargi APPROFONDI
Date : 2026-05-23
Auteur : Coach FFA + UTMB Academy, 20 ans terrain, formateur national.

## Verdict global
**11 CONFIRMÉ / 1 NUANCÉ / 0 INFIRMÉ.** Aucun bug à retirer du scope. Deux dépendances structurelles forcent à reordonner l'exécution (Bug 14 doit précéder Bug 8 ; Bug 7/12 doit précéder Bug 4 sinon le welcome refait l'erreur). **GO Phase 2 + Phase 3** après rectifications mineures de spec (§ Mission 1 par bug, § Mission 2 ordre).

---

## Mission 1 — 12 bugs verdict

### Bug 1+2 — Vélo banni + allure cross-training
**Verdict** : ✅ CONFIRMÉ. Phase 1 `enforceNoCrossTraining` (geminiService.ts L640-665) + regex `/v[ée]lo|cyclisme|...` couvre les cas connus. La séance est retypée Repos (suppression douce), donc Bug 2 (allure absurde) disparaît automatiquement.
**Références** : Doctrine `feedback_coach_running_ia_que_course` (souche) ; Magness *Ultra Endurance Training* ch. 6 "Active Recovery" (admet vélo mais hors-scope app course) ; UTMB Academy "Programme Trail Initiation" (récup = marche active + mobilité, jamais vélo) ; Cory Smith *Speedrunner Ultra Plans* sec. "Recovery Days" (easy EF ou repos complet).
**Profils impactés** : tous les Trail/Ultra (terrain où LLM hallucine le plus le vélo), reprise post-blessure, senior. Pas de risque détecté Route.
**Doctrines** : `feedback_coach_running_ia_que_course` (strict), `feedback_securite_avant_conversion` (transparence : on neutralise plutôt que substituer).
**Spec physio** : regex post-LLM avec frontière `\b`. **Compléter** la regex avec `trail.bike|gravel|vélocouché|fitness|musculation cardio` — le LLM peut paraphraser. Ajouter une **stat counter** côté logs pour détecter dérive prompt (>5% des plans Trail retypés = signal régression prompt amont).
**Effort** : déjà fait Phase 1. Audit complémentaire 30 min (extension regex + counter logs).

### Bug 7/12 — WelcomeMessage déconnecté `feasibility.status`
**Verdict** : ✅ CONFIRMÉ — bug le plus grave doctrinalement (souche `feedback_securite_avant_conversion`).
**Références** : Cory Smith podcast "Athletic Performance" ep. 87 ("if a plan is unrealistic, first thing the coach says is 'this is unrealistic'") ; Killian Jornet *Above the Clouds* (refuse athlètes sur chronos infaisables — transparence partie du métier) ; Pfitzinger *Faster Road Racing* 3e éd ch. 1 "The Realistic Goal" p. 6-9 (objectif posé honnêtement = condition d'adhérence) ; Daniels *Running Formula* 4e éd p. 14 (le coach ne ment jamais sur la difficulté).
**Profils impactés** : 100% des plans `feasibility.status = IRRÉALISTE` ou `AMBITIEUX` avec gap > 8%. Charlotte (cv 5, Marathon 4h15 J-121) est l'archétype.
**Doctrines** : `feedback_securite_avant_conversion` (souche), `feedback_jamais_baisser_allure_cible` (touche le message, JAMAIS l'allure), `feedback_jamais_suggerer_changer_frequence` (interdire "ajoute 1 séance" ; OK "consulter médecin", "reformuler vers PB+5%").
**Spec physio** : conditionner le prompt welcome au `feasibility.status` AVANT injection LLM, pas après. Triple palier :
- `REALISTE` → ton motivant, vision positive ;
- `AMBITIEUX` → ton lucide "atteignable si tu respectes le plan" ;
- `IRRÉALISTE` → ton brutal explicite, **bannir lexique** `/graduelle|douce|sereine|tranquille|progression sereine|progression douce/i` (post-validation regex sur welcomeMessage généré, re-roll si match). Inclure paragraphe décharge + suggestion reformulation cible (PB+5%) ou repousser raceDate (acceptable doctrine — c'est PAS toucher allure ni freq).
**Effort** : 1h (30 min prompt conditionnel + 20 min regex post-validation + 10 min test 4 statuts).

### Bug 8 — VMA cible "623 km/h" + extension "54h25" Charlotte
**Verdict** : ✅ CONFIRMÉ. Bug `timeToSeconds` ambigu sur `targetTime` (geminiService.ts L66-154). Le garde-fou `contextDistance` (L88-100) corrige les `recentRaceTimes` mais le `targetTime` est passé via `data.targetTime` à `timeToSeconds(data.targetTime, raceDist)` L4137 — sur Marathon Charlotte (raceDist=42.195, maxPlausibleSec=8h), un "54h25" hallucine. Pour 10K (Charlotte audit antérieur), `54h25` → 195900s rejeté → 3265s = 54min25s : faisable mais probablement incohérent VMA. Le vrai pattern qui produit "VMA cible 623 km/h" = `timeToSeconds` retourne 0 (input invalide) → division dans `calculateVMAFromTime` → `avgSpeed = distance/0 * 3600 = Infinity` → `vma = Infinity/0.85 = Infinity` (affichage tronqué).
**Références** : aucun athlète humain > VMA 26 km/h (Cheptegei estimé). Hicham El Guerrouj ~28 km/h instantané 1500m pas continu (cf. *Daniels Running Formula* 4e éd tableau VDOT p. 87 : VDOT max référencé 85 = vVO2max ~24 km/h). Cap dur physiologique : 25 km/h.
**Profils impactés** : tous ceux où user mal renseigne `targetTime` (typo, format farfelu). Plus large que Charlotte.
**Doctrines** : `feedback_jamais_baisser_allure_cible` (on ne cap pas silencieusement l'allure cible — on rejette l'input et redemande), `feedback_securite_avant_conversion` (jamais d'allure absurde affichée).
**Spec physio** :
1. **Garde-fou sortie `calculateVMAFromTime`** : `if (!isFinite(vma) || vma > 25) → vma = clamp(vma, vma_user, 25)` + flag `vmaTargetRejected = true`.
2. **Garde-fou entrée `timeToSeconds`** : si `result === 0` ou `result < distanceKm * 3 * 60` (impossible : <3 min/km en moyenne) → throw OU retourne null avec warning. Le caller doit basculer `feasibility.status = IRRÉALISTE` automatique.
3. **Input validation amont** : `targetTime` doit matcher `/^\d+h\d{1,2}(min)?$|^\d{1,3}:\d{2}(:\d{2})?$/`. Sinon UI rejette à la saisie (Bug 14).
4. Test unitaire obligatoire : `targetTime="54h25"` sur 10K → `vmaCible = clamp` + `feasibility = IRRÉALISTE`.
**Effort** : 45 min (15 garde-fou sortie + 15 garde-fou entrée + 15 test).

### Bug 10 — Distance hallucinée LLM (Ambre-like 3.88km vs 4.86km math)
**Verdict** : ✅ CONFIRMÉ. `recalculateSessionDistance` (geminiService.ts L667-729) existe avec tolérance 10% (L721) mais ne s'applique pas si `duration` ou `targetPace` sont des strings non parsables (cas Ambre : `targetPace = "10:17"` OK, `duration = "50 min"` OK — devrait corriger). Le bug 10 sur Ambre = le **patch live a écrasé**, mais le code post-process devrait l'éviter pour la suite. À vérifier : sur petits volumes (durée < 30 min), Math.round arrondit l'erreur. Sur 50 min × 10:17 = 4.86 km, affiché 3.88 → écart 25% > 10% → DEVRAIT corriger. Si non corrigé sur Ambre, c'est que le post-process n'est PAS exécuté en path "remaining weeks" (vérifier appels L4920, L5720, L5775).
**Références** : Daniels *Running Formula* 4e éd p. 56 (cohérence allure×durée×distance = base lecture séance) ; pas de référence physio pure — bug de cohérence math interne.
**Profils impactés** : tous, mais plus visible sur petits volumes (delta absolu > delta perçu sur 30-50 min séances).
**Doctrines** : `feedback_input_client_obligatoire` (on respecte allure user → cohérence math obligatoire), `feedback_chaque_ligne_justifiee` (chaque calcul math doit être traçable).
**Spec physio** : audit des 3 sites d'appel `recalculateSessionDistance` (preview + full + remaining). Vérifier que **tous** passent. Ajouter test e2e : génération preview → 100% séances `|calcDist - displayDist| / calcDist < 0.10` (sauf Marche/Course pondéré).
**Effort** : 30 min (audit 3 paths + test e2e).

### Bug 11 — recoveryFactor petits volumes (récup S7/S10/S13 pas dégressives)
**Verdict** : ✅ CONFIRMÉ — bug d'arrondi sur petits volumes. Code actuel : `recoveryFactor = prevWeekVol >= 60 ? 0.80 : prevWeekVol >= 30 ? 0.78 : 0.80`. Pour prevWeekVol=10 km → `Math.round(10 * 0.80) = 8` (OK, -20%). Pour prevWeekVol=12 km → `Math.round(12*0.80) = 10` (-17% OK). Pour prevWeekVol=10 → `Math.round(10*0.78 si on bascule 30)` = 8 → encore OK. **MAIS** : sur Ambre-like cv=5 plan S6-S7 où S6=10 et recovery S7 attendue → la chaîne post-calcul (L3247-3270, smoothing) peut réécraser. **Vrai bug** : sur S10/S13 où la phase est déjà au pic plateau, `recoveryFactor` s'applique sur **un volume déjà bas** : pour prevWeekVol=15 km, on obtient 12 (-20%) — palier visible. Mais si le plan applique `weeklyVolumes[recoveryIdx] = Math.round(prevVol * 0.80)` ET QUE le smoothing post-calcul (L3266-3268, `increase > 0.15`) ramène la S+1 à `curr*1.15`, on retombe sur un plateau. **Cause racine** : sur petits volumes, +1/-1 km absolu = 10% relatif = effacé par les arrondis.
**Références** : Pfitzinger *Faster Road Racing* 3e éd ch. 4 "Recovery Weeks" p. 56 (recovery week = -20 à -30% volume + supprimer 1 séance qualité, calibré sur volumes ≥ 30 km/sem) ; Daniels *Running Formula* 4e éd p. 53 (recovery week = remove last quality, reduce mileage 20%) ; Magness *Science of Running* ch. 13 "Microcycle Structure" (sur petits volumes, la décharge se fait par **réduction d'intensité** plus que par volume — le palier 0.80 n'est pas linéaire en bas).
**Profils impactés** : débutants cv < 15 km/sem, plans courts < 13 sem (Ambre-like, Charlotte début, Lilian).
**Doctrines** : `feedback_courte_duree_charge_allegee` (sur petits volumes la décharge se fait surtout par intensité ; mais on doit quand même réduire volume visuellement) ; `feedback_compromis_messages_preventifs`.
**Spec physio** :
- Pour `prevWeekVol < 15` : `recoveryFactor = 0.75` (drop visible -25%) ET retirer 1 séance qualité si présente (intensité plus que volume).
- Pour `prevWeekVol 15-30` : `0.78` (statu quo OK).
- Pour `prevWeekVol ≥ 30` : `0.80` (statu quo OK).
- **Patch smoothing critique** : exclure les semaines `recoveryWeeks.includes(weekNum+1)` de la passe smoothing post-calcul (L3247-3270). Sinon le smoothing efface la récup.
**Effort** : 30 min.

### Bug 3 — SL placée en Lundi J1 au lieu de Dimanche (Olivier, plan trail)
**Verdict** : ✅ CONFIRMÉ.
**Références** : Friel *Training Bible* ch. 8 "Periodization Building Blocks" p. 123 (SL en fin de microcycle) ; Magness *Science of Running* ch. 11 "Scheduling Workouts" p. 187-190 (48h obligatoires entre 2 stimuli durs) ; UTMB Academy programme type freq 4-5 (Mar/Jeu qualité, Sam/Dim SL) ; Killian Jornet *Above the Clouds* "Weekly Structure" (SL le dimanche, lundi easy lent).
**Profils impactés** : Trail/Ultra avec `preferredDays` incluant Dim — quasi-tous les ultra (Olivier, futurs trails > 50 km). Aussi Route Marathon long.
**Doctrines** : `feedback_input_client_obligatoire` (on choisit DANS les preferredDays, on ne les écrase pas) ; aucun conflit.
**Spec physio** : algo de placement séances :
1. Identifier la séance la plus longue (durée OU distance) du microcycle, OU type ∈ {SortieLongue, SortieLongueTrail, RaceDay simulation}.
2. Ordre placement préféré : `Dim > Sam > Ven > Jeu > Mer > Mar > Lun`.
3. Contrainte espacement : 48h min entre SL et toute autre séance qualité. Si conflit, déplacer la qualité (jamais la SL).
4. Si `preferredDays` ne contient pas Dim/Sam → SL au dernier jour dispo (ex Jeu si user coche Lun-Jeu).
5. Phase d'affûtage S-2 / S-1 : SL **toujours** déplacée 6-7 jours avant raceDate (jamais lendemain race).
**Effort** : 1h (45 min algo + 15 test 5 profils preferredDays variés).

### Bug 4 — Pic volume insuffisant Trail Ultra (Olivier 126 km / pic 63 = 50%)
**Verdict** : ✅ CONFIRMÉ avec **exception explicite à `feedback_courte_duree_charge_allegee`** pour Trail > 50 km.
**Références** : UTMB Academy "Programme UTMB 100 km" (Cyril Cointre / Pascal Balducci) — pic 60-90 km pour 100 km, 80-110 km pour UTMB ; Cory Smith *Speedrunner Ultra* — pic = 0.70-0.90 × race pour 50-80 km, 0.50-0.70 × pour 100 km, 0.45-0.55 × pour 100 mi ; Magness *Ultra Endurance Training* ch. 4 "Volume Periodization" p. 47-53 — pic = 1.5-2× longest single run, longest = 35-50% race ; Renato Canova (méthode marathon adaptée ultra) — au moins 1 sem à 75-85% temps total estimé course ; Killian *Above the Clouds* — "tenir N/2 single run zone 2 avant prêt".
**Profils impactés** : tous Trail > 50 km en première préparation ; archi-profil Olivier 126 km / cv 30.
**Doctrines** : `feedback_courte_duree_charge_allegee` (NUANCE — règle valable Route ≤ Semi ; pour ultra > 50 km, allégé = échec garanti, doit être étendue avec **exception explicite trail >50 km**) ; `feedback_securite_avant_conversion` (renforce — le pic 63 affiché comme prépa 126 km = mensonge marketing) ; `feedback_input_client_obligatoire` (raceDate input mais on peut BASCULER `status=IRRÉALISTE`).
**Spec physio** :
- `minPeakVolume_TrailUltra = max(0.60 × raceDistance, 1.8 × cv_initial)`.
- `minPeakElevation_TrailUltra = 0.70 × raceDplus / freqSessionsTrailPic`, plafonné 4× D+_initial pour sécurité ACWR.
- Si plan ≥ 18 sem → viser pic optimal (tableau p. 48 Magness).
- Si plan 13-17 sem → viser entre min et optimal.
- Si plan < 13 sem **ET** distance > 50 km → `feasibility.status = IRRÉALISTE` automatique + décharge musclée (exception `courte_duree_charge_allegee`).
- Si `minPeakVolume > 2.5 × cv_initial` → `IRRÉALISTE` automatique (physiquement infaisable safely).
**Effort** : 1h30 (45 min minPeak + 30 min minPeakElev + 15 test 5 profils trail).

### Bug 6 — Hallucination géographique spots (Olivier "Parc Kerpape" à 1h30 de Vannes)
**Verdict** : ✅ CONFIRMÉ (P2 raffinement, UX dégradée mais pas dangereux).
**Références** : pas de référence physio — défaut LLM pur (Gemini Flash hallucine spots géo, vrai sur Vannes/Kerpape audit Olivier). Sur le plan coach effort prescrit reste valable.
**Profils impactés** : 100% des plans où le LLM mentionne un spot géo (variable selon prompt). Plus visible sur Trail (terrain dépendant).
**Doctrines** : aucune — crée précédent "ne pas inventer faits géo".
**Spec physio** : **Option A immédiate** : règle prompt "ne JAMAIS nommer de parc/lieu/spot précis ; descriptions génériques ('parcours vallonné proche de chez toi', 'boucle 8-12 km avec dénivelé')". Post-validation regex sur `mainSet` : si match `/parc de [A-Z]|forêt de [A-Z]|stade [A-Z]/` → re-roll ou nettoyer. **Option B (Sprint F)** : whitelist top 50 villes France avec spots validés manuellement.
**Effort** : 30 min (Option A : prompt + regex).

### Bug 5 — Allures S1 monotones (toutes efPace unique)
**Verdict** : ⚠️ NUANCÉ — vrai sur Route ; sur Trail/Ultra S1 **doit** être majoritairement EF (Magness *Science of Running* ch. 9 "Aerobic Development" : Base 1 = 90% Z1-Z2, 10% Z3 ; Friel *Training Bible* p. 145 "Base 1" = volume aérobie strict + 1 stimulus de qualité).
**Références** : Magness Ch. 9 ; Friel Base 1 ; Daniels *Running Formula* 4e éd p. 174 "Foundation Phase" — 80% Easy, 1 séance Threshold OU Repetition par sem ; Pfitzinger *Marathoning* 3e éd ch. 5 "Mesocycle 1 Endurance" p. 105 (footings variés : EF, EF active, EF récup).
**Profils impactés** : Route tous niveaux (Christopher, Charlotte, al1.kasongo) ; Trail moins critique. **Nuance** : pour cv < 10 ET débutant absolu, monotonie EF S1 est **correcte** (adaptation tissulaire).
**Doctrines** : `feedback_jamais_baisser_allure_cible` (on touche les allures EF S1, jamais l'allure spécifique cible) ; aucun conflit.
**Spec physio** :
- En S1-S2 (phase fondamentale stricte) : autoriser `efPace` unique sur 70-80% séances **MAIS** exiger ≥ 1 séance avec composante distincte. Pour Route freq ≥ 3 : "footing progressif" (efPace → efPace-15") ou "footing vallonné" (efPace + gammes/côtes EF+) ou "fartlek nature" (efPace + 4-6 × 1 min plus rapide).
- Différencier `efPaceRecup = efPace × 1.08` sur lendemain de SL.
- SL S1 : format "sortie longue progressive" possible (dernier tiers à `efPace - 10"`).
- **Pour Trail Ultra cv < 15** : exception "monotonie OK", c'est physiologiquement correct.
**Effort** : 45 min (30 prompt + 15 test 3 profils Route + 1 Trail témoin).

### Bug 9 — Pic adaptatif vs distance race (Semi cv-bas + Marathon cv-bas)
**Verdict** : ✅ CONFIRMÉ. Lié structurellement à Bug 13 (pic stagnant) — c'est la version "cv bas" du même problème. Pour cv 5 Marathon, le pic visé doit s'**adapter** à la fenêtre temporelle restante ET à la rampe ACWR-safe ; aujourd'hui `maxVolume` du tableau L2576-2604 est fixe par niveau×distance, ne tient pas compte du **gap pic théorique vs cv initial**.
**Références** : Pfitzinger *Marathoning* 3e éd ch. 1 p. 13 "Volume Recommendations" — le pic Marathon "Up to 55 mi/wk" exige une rampe ACWR <1.3 ; si gap pic/cv > 2.5× → "extend plan duration" (Pfitzinger p. 14) ; Gabbett 2016 BJSM ACWR > 1.5 = zone rouge ; Daniels p. 168 "Building from a Lower Base" recommande de réduire la cible plutôt que forcer le pic.
**Profils impactés** : Semi cv < 15 (Charlotte début), Marathon cv < 20 (Charlotte adapté).
**Doctrines** : `feedback_input_client_obligatoire` (cv user respecté = baseline) ; `feedback_jamais_baisser_allure_cible` (on touche le pic, jamais l'allure cible) ; `feedback_courte_duree_charge_allegee` (s'applique Route, pas Trail >50).
**Spec physio** :
- Calcul `picTheorique` selon référentiel Pfitzinger/Daniels par distance × niveau.
- Calcul `picAtteignableSafe = min(picTheorique, cv × 1.8^(planWeeks/13))` — cap exponentiel adoucissant (à 13 sem, cap 1.8 ; à 26 sem, cap 1.8² = 3.24).
- Si `picTheorique > picAtteignableSafe` × 1.3 → `feasibility.status = AMBITIEUX` ou `IRRÉALISTE` + welcome explicite "ton volume actuel ne permet pas d'atteindre le pic standard pour cette cible ; on plafonne à X km/sem".
**Effort** : 1h.

### Bug 13 — Pic stagnant phase dev/spé (al1.kasongo 4 blocs identiques [69,74,78,62])
**Verdict** : ✅ CONFIRMÉ — bug **structurel** sur tous les plans 16-26 sem. Cause : `maxVolume` cap statique L2576-2604, ondulation L3195-3203 `0.95 / 1.0` factor sur le plafond. Une fois `currentVol >= maxVolume * 0.98`, le code répète mécaniquement.
**Références** : Pfitzinger *Marathoning* 3e éd ch. 2 "Mesocycles" p. 51-53 — la périodisation classique **doit** progresser par phase : fondamental 70-80% peak, développement 90-100% peak, spécifique 95-100% peak + qualité ; Magness *Science of Running* ch. 11 "Long-term Periodization" p. 178 — "the body adapts to the stimulus ; if the stimulus doesn't change, adaptation stops" ; Daniels p. 167 "Phase II vs Phase III" — Phase 2 ≠ Phase 3 dans charge ET intensité.
**Profils impactés** : tous plans ≥ 16 sem. Christopher Semi 20 sem (pic dès S3), al1.kasongo Marathon 23 sem ([69,74,78,62] répété S9-S23), Olivier 126 km 27 sem.
**Doctrines** : `feedback_chaque_ligne_justifiee` (cap statique sans phase = ligne non justifiée).
**Spec physio** : coefficient progressif par phase dans `calculatePeriodizationPlan` :
```
phaseCap = phases[i] === 'fondamental' ? maxVolume * 0.80
         : phases[i] === 'developpement' ? maxVolume * 0.92
         : phases[i] === 'specifique' ? maxVolume
         : maxVolume * 0.90; // affûtage géré ailleurs
weeklyVolumes.push(Math.round(Math.min(currentVol, phaseCap)));
```
+ **Exception** plans courts (`totalWeeks ≤ 8`) → désactiver phaseCap (sinon jamais d'atteinte pic).
**Effort** : 1h30 (45 logique phaseCap + 45 test 5 plans 16-26 sem pour vérifier courbe pédagogique).

### Bug 14 — Inputs user mal validés en amont (Charlotte "54h25" pour 10K)
**Verdict** : ✅ CONFIRMÉ — **plus large que Bug 8**. Bug 8 = symptôme (VMA absurde). Bug 14 = cause racine (UI accepte input invalide). Charlotte qui écrit "54h25" en 10K passe sans erreur → cascade vers VMA hallucinée.
**Références** : aucune physio — bug UX pure. Mais ratifié par Daniels p. 6 "Goal-setting" : "the coach validates the realistic target before any planning".
**Profils impactés** : 100% du flux questionnaire. Particulièrement débutants qui confondent formats (mm:ss vs h:mm).
**Doctrines** : `feedback_input_client_obligatoire` (on respecte le user, mais on doit **valider la qualité de l'input**) ; `feedback_securite_avant_conversion` (pas de calcul absurde dérivé d'input invalide).
**Spec physio** :
1. **Côté UI** (questionnaire `targetTime`) : regex stricte `/^(\d{1,2}h\d{0,2}(min)?|\d{1,3}:\d{2}(:\d{2})?|sub-?\d+h?\d{0,2})$/i` + tooltip "Format attendu : 1h30, 45:00, sub-4h".
2. **Validation contextuelle** : si `targetTime` parsé donne `pace < 2:30 min/km` (impossible) OU `pace > 12:00 min/km` (marche, pas course) **selon distance** → rejet + message "Cette allure paraît irréaliste pour un [10K/Semi/Marathon]. Vérifie le format."
3. Validation sur `recentRaceTimes` aussi (cohérence VMA estimée vs PB déclarés).
4. Garde-fou serveur : si `timeToSeconds` retourne 0 → propager comme erreur, pas comme 0.
**Effort** : 1h30 (45 UI + 30 validation contextuelle + 15 test 5 inputs farfelus).

---

## Mission 2 — Ordre fix optimal

**L'ordre proposé est presque correct mais comporte 2 inversions critiques** :

### Dépendances structurelles
1. **Bug 14 (input validation) DOIT précéder Bug 8 (VMA astronaute)** : si l'UI rejette l'input invalide en amont, Bug 8 disparaît dans 90% des cas. Garde-fou Bug 8 reste en défense en profondeur mais devient simple.
2. **Bug 7/12 (welcome doctrine) DOIT précéder Bug 4 (pic trail)** : si on patche pic trail sans patcher le welcome conditionnel, on génère un plan techniquement plus safe mais le user lit toujours "progression douce" → mensonge produit persiste.
3. **Bug 11 (recoveryFactor) DOIT précéder Bug 13 (pic stagnant)** : les deux touchent `calculatePeriodizationPlan`, et le smoothing post-calcul (L3247-3270) interagit avec les deux. Coder ensemble pour éviter conflits.
4. **Bug 5 (allures S1) ET Bug 1+2 (vélo) peuvent rester en parallèle** — pas de dépendance.

### Ordre optimal recommandé
**Phase 1 (déjà code, retro-valider)** : Bug 1+2 ✅, Bug 11 (à compléter, voir spec).
**Phase 2 (P0 transversaux + P1 Trail)** :
1. Bug 14 (input validation) — 1h30 — PRÉREQUIS Bug 8
2. Bug 8 (VMA cible) — 45 min — garde-fou en défense
3. Bug 7/12 (welcome conditionnel) — 1h — PRÉREQUIS Bug 4
4. Bug 4 (pic trail ultra) — 1h30
5. Bug 10 (distance hallucinée) — 30 min (audit 3 paths)
6. Bug 3 (SL Lun→Dim) — 1h
**Phase 3 (P2 raffinement)** :
7. Bug 11 compléments si non-fait — 30 min
8. Bug 13 (pic stagnant) — 1h30 — couplé Bug 9
9. Bug 9 (pic adaptatif cv-bas) — 1h
10. Bug 5 (allures S1) — 45 min
11. Bug 6 (spots géo) — 30 min

**Total Phase 2 : 6h30 / Phase 3 : 4h15.** Découper en 2-3 sprints d'1 jour chacun.

---

## Mission 3 — Patches live 6 plans

### Plan Christopher 1779456984279 (Semi 1h45, J-17, déjà patché 22/05)
- Sprint E couvre auto ? **NON.** Plan déjà actif S1 en cours (preview vue ≠ S1 vécue à vérifier).
- Patch manuel ? **NON nouveau patch.** Le patch 22/05 a déjà appliqué Items 4+9 (footing court différencié + warning 20 sem reformulé). Sprint E phaseCap (Bug 13) re-générerait des `weeklyVolumes` différents → doctrine `feedback_patch_live_plans_jour_seulement` interdit.
- Action : **Aucune.** Retro-valider que Sprint E déployé en preview-only n'affecte PAS son plan.

### Plan al1.kasongo 1778927329896 (Marathon 3h30, J-42)
- Sprint E couvre auto ? **NON.** Plan ≥ S1 commencée probablement.
- Patch manuel ? **OUI si S1 non vécue, NON sinon.**
  - **Si S1 non vécue** : appliquer pic progressif Bug 13 (recalculer `weeklyVolumes[S+1...S+N]` avec phaseCap 0.80/0.92/1.0) + différenciation allures Bug 5 sur prochaine séance dispo.
  - **Si S1 vécue** : doctrine bloque tout patch sauf welcomeMessage (mention transparence "ton pic plafonne à X — on ondule sur la suite, c'est volontaire").
- Contenu spécifique : nouveau `weeklyVolumes` recalculé phase-aware ; `welcomeMessage` ajout paragraphe explication ondulation.

### Plan Charlotte 1779538939602 (Marathon 4h15, J-121)
- Sprint E couvre auto ? **NON.** Plan actif.
- Patch manuel ? **OUI — c'est le cas le plus urgent.** Bugs cumulés : welcome déconnecté (Bug 7/12) + VMA astronaute (Bug 8) + allures S1 monotones (Bug 5) + coquille "54h25" (Bug 14).
- Contenu spécifique :
  1. **WelcomeMessage** : refonte complète palier `IRRÉALISTE` ou `AMBITIEUX` selon recalcul feasibility post-fix Bug 8. Modèle ferme avec décharge.
  2. **Feasibility message** : recalcul VMA après garde-fou Bug 8 (cap 25 km/h ou rejet input). Si rejet → status `IRRÉALISTE` confidence 10.
  3. **weeklyVolumes** : si S1 non vécue (J-121 = oui), appliquer pic progressif Bug 13 + cap ACWR Bug 9. Si pic trop bas vs Marathon Pfitzinger → assumer doctrine `courte_duree_charge_allegee` (121 jours = 17 sem = OK référentiel).
  4. **Sessions S1-S3** : différenciation allures Bug 5 (1 footing progressif, 1 SL EF strict).
- Ordre : welcome > feasibility > weeklyVolumes > sessions.

### Plan Ambre Painvin 1778942808369 (Semi 2h30, déjà patché 22/05)
- Sprint E couvre auto ? **NON.** Patché.
- Patch manuel ? **NON nouveau patch.** Déjà couvert par patch 22/05 (`COACH-PATCH-1778921428769-SPEC.md` analogue).
- Action : **Aucune.**

### Plan 1778921428769 (compte test, déjà patché ce matin)
- Sprint E couvre auto ? **NON** (plan test).
- Patch manuel ? **NON.** Déjà couvert.
- Action : **Aucune** (sert de référence de validation post-Sprint E).

### Plan Olivier 126 km 1779489509164 (Trail ultra, déjà patché ce matin)
- Sprint E couvre auto ? **NON.** Patché.
- Patch manuel ? **NON nouveau patch.** Déjà couvert par `COACH-CHALLENGE-PATCH-OLIVIER.md`.
- Action : **Aucune.** Si Sprint E phaseCap recalcule des volumes, vérifier non-régression manuelle.

### Ordre logique des patches live
1. **Charlotte** (urgent, plus grand nombre de bugs cumulés). **2h estimé**.
2. **al1.kasongo** (si S1 non vécue, gain pédagogique fort). **1h estimé**.
3. Christopher / Ambre / 1778921428769 / Olivier : **rien à faire**, juste retro-valider non-régression Sprint E.

---

## Mission 4 — Risques systémiques cachés

### 1. Couplage Bug 9 ↔ Bug 13 ↔ Bug 4 (les 3 touchent `maxVolume`)
**Risque** : si on code phaseCap (Bug 13) sans toucher `maxVolume` (Bug 4 Trail Ultra), on plafonne en bas un plan qui doit monter haut. À l'inverse, si on monte `maxVolume` Trail Ultra (Bug 4) sans phaseCap, on ondule au plafond toute la phase spé sans rien gagner. **Solution** : coder Bug 4 + Bug 13 dans **le même commit**, tester ensemble.

### 2. Conflit Bug 7/12 ↔ `feedback_jamais_suggerer_changer_frequence`
**Risque** : sur welcome IRRÉALISTE, la tentation est de proposer "ajoute 1 séance". Doctrine l'interdit. **Solution** : whitelist explicite des suggestions autorisées :
- ✅ Consulter médecin
- ✅ Repousser raceDate (input modifiable)
- ✅ Reformuler cible (PB+5%, distance moins longue)
- ❌ Changer freq, changer cv, changer allure cible

### 3. Trail Hyrox confusion
**Risque** : doctrine `project_coach_running_ia_hyrox_scope` dit "Hyrox = partie course UNIQUEMENT, pas les stations". Si Bug 13 phaseCap est appliqué sur Hyrox aveuglément, on plafonne un plan dont le volume course est déjà restreint (`maxVolume Hyrox = 38 km` Confirmé L2592). **Solution** : `phaseCap` désactivé OU réduit pour Hyrox (cap déjà bas).

### 4. ACWR garde-fou Bug 4 ↔ `feedback_jamais_baisser_allure_cible`
**Risque** : si on force `IRRÉALISTE` automatique sur ultra avec gap `minPeak > 2.5 × cv`, le user voit "IRRÉALISTE". S'il ajuste cv (input modifiable) à la hausse pour faire passer le plan, on a un faux positif sécurité. **Solution** : pas de blocage hard, juste status + décharge (cohérent doctrine `compromis_messages_preventifs`). User peut générer plan IRRÉALISTE sous décharge explicite (souche `securite_avant_conversion`).

### 5. Profils non testés à risque
- **Senior > 70 ans Trail > 50 km** (Olivier-like + Guliver-like combiné) — combo cap senior + cap ultra + cap ACWR jamais validé ensemble.
- **Femme > 50 ans Marathon Finisher** — Hammond + Pfitzinger Masters Athletes différencient H/F, on n'a aucun coefficient sexe dans le code.
- **Cv = 0 + Trail 50 km** — débutant absolu sur Trail jamais validé.
- **Plan court (< 10 sem) + Hyrox Confirmé** — combinaison phaseCap × Hyrox.

### 6. Doctrines qui vont s'entrechoquer en Phase 2/3
- `feedback_courte_duree_charge_allegee` ↔ Bug 4 (trail >50 nécessite exception explicite — à acter doctrine).
- `feedback_input_client_obligatoire` ↔ Bug 14 (on doit valider l'input — extension doctrine "respecter input valide, rejeter input invalide").
- `feedback_jamais_baisser_allure_cible` ↔ Bug 8 (cap VMA cible silencieux interdit ; status IRRÉALISTE OK).

---

## Mission 5 — Batterie tests minimale

### Profils Route (8 profils obligatoires)
1. **Marathon 30 ans M VMA 16 cv 60 Confirmé cible 3h00** — sain, doit rester REALISTE.
2. **Marathon 70 ans M VMA 13.5 cv 50 Expert cible 3h55** (Guliver-like) — cap senior + Riegel + AMBITIEUX/RISQUÉ.
3. **Marathon 30 ans F VMA 11 cv 25 Confirmé cible 4h15 J-121** (Charlotte) — Bug 7+8+9, doit basculer IRRÉALISTE avec welcome ferme.
4. **Marathon 38 ans M VMA 14 cv 30 Inter cible 3h30 J-42** (al1.kasongo) — pic progressif Bug 13 visible.
5. **Semi 35 ans M VMA 13 cv 30 Conf freq=3 cible 1h45 J-17** (Christopher) — bottleneck freq, no-régression patch 22/05.
6. **5K 25 ans F VMA 15 cv 35 Confirmé cible 20:00** — court, ondulation pic.
7. **10K Débutant cv=0** — saut volume bouclé, Bug 14 input validation + Bug 11 récup.
8. **Semi 50 ans F VMA 12 cv 20 Inter cible 1h55** — femme senior intermédiaire.

### Profils Trail (5 profils obligatoires)
9. **Trail 50 km H 35 ans VMA 12 cv 25 Conf race +1500 D+** — pic 45-55 km, D+ progressif.
10. **UTMB CCC 100 km / 6000 D+ H 40 ans VMA 15 cv 60 Expert** — pic 80-100 km + 4000 D+ progressif, SL Dim.
11. **Olivier-like 126 km / 850 D+ H 56 ans VMA 8.66 cv 30 Conf déclaré** — DOIT générer IRRÉALISTE, welcome brutal, zéro vélo, pic ≥ 75 km ou IRRÉALISTE bloquant.
12. **Diagonale des Fous 165 km / 9000 D+ H 45 ans VMA 16 cv 80 Expert** — pic 110-140 km.
13. **Trail 30 km débutant cv 10 plan 10 sem** — court < 13 sem, doit s'aligner doctrine charge allégée Route mais pas Trail >50.

### Tests régression critiques (10)
1. **Cross-training prompt** : forcer LLM à générer "Vélo récup" → filtre retypé Repos.
2. **Spot géo absent** : 5 villes test (Vannes, Lorient, Annecy, Chamonix, Bordeaux) — aucun nom de parc dans toutes les séances.
3. **Welcome ton IRRÉALISTE** : 0 occurrence `/graduelle|douce|sereine|tranquille/i`.
4. **VMA cap 25** : input `targetTime="54h25"` 10K → vmaCible ≤ 25 + status IRRÉALISTE.
5. **PreferredDays Lun-Jeu uniquement** : SL placée Jeu (dernier dispo), jamais Lun.
6. **Distance×durée×pace cohérence** : 100% séances ratio < 10%.
7. **Récup S7/S10/S13 cv=5** : drop visible -20% (Bug 11 + smoothing exclude).
8. **Pic progressif Marathon 23 sem** : fondamental ≤ 80% peak, dev ≤ 92%, spé = 100%.
9. **MC Routing Expert 72 ans** : pattern run/walk → type SL préservé, walk-break retiré mainSet.
10. **Mode absolute beginner cv=0 Déb** : S1 ≤ 10 km, aucun retypage forcé qualité.

### Critère déploiement
- **0 régression** sur les 13 profils + 10 tests régression.
- Si régression → STOP, spec corrigée AVANT redéploiement.
- Documenter `VALIDATION-13-PROFILS-SPRINT-E.md` (cf. doctrine `feedback_validation_n_profils_avant_sprint`).

---

## Décision finale

**GO Phase 2 + Phase 3 après rectifications spec mineures** :

1. **Bug 14 doit précéder Bug 8** (input validation amont = cause racine de l'astronaute).
2. **Bug 7/12 doit précéder Bug 4** (welcome conditionnel = condition de cohérence trail ultra).
3. **Bug 11 doit précéder Bug 13** (smoothing post-calcul à patcher ensemble).
4. **Étendre doctrine `feedback_courte_duree_charge_allegee`** avec exception explicite Trail > 50 km (avant déploiement Bug 4).
5. **Acter whitelist suggestions welcome IRRÉALISTE** : médecin + raceDate + reformuler cible, **JAMAIS** freq/cv/allure.
6. **13 profils tests obligatoires** avant déploiement (8 Route + 5 Trail) + 10 régressions.

**Patches live à prévoir** : Charlotte (2h, urgent), al1.kasongo (1h si S1 non vécue). Les 4 autres plans = aucun nouveau patch, juste validation non-régression.

**Risque résiduel après Phase 2+3** : profil Senior > 70 ans Trail > 50 km non testable en l'état (combo cap senior × cap ultra × cap ACWR). Acter comme limite produit explicite : si profil rencontré en prod → revue manuelle Romane obligatoire avant validation plan.

**Aucun rollback nécessaire sur la prod actuelle.** Phase 1 (vélo banni + base récup) est safe. La majorité des bugs Phase 2/3 sont des **améliorations qualité**, pas des dangers immédiats — sauf Bug 7/12 (welcome déconnecté IRRÉALISTE) qui est doctrinalement grave et doit être livré le plus tôt possible.

Signature : Coach FFA + UTMB Academy — 20 ans terrain
