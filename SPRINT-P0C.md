# P0c — Ajustements coach 20 ans Pfitzinger Lab

Date : 2026-05-20
Commit : `2b5093d`
Base : P0b (`ec55892`) + P0a (`2017ca4`) + `bb31b47` blog/déploiement

## Contexte

Verdict Coach 20 ans Pfitzinger Lab sur P0b (commit ec55892) :
- P0b avait modifié `runningSessions` Semi/Marathon freq ≤ 3 → 3 séances course.
- Mais doctrine `project_coach_running_ia_frequence` : freq=3 = **TOUJOURS** 2 course + 1 renfo.
- → P0b violait la doctrine fréquence.

3 ajustements obligatoires avant push.

## 3 modifs appliquées

### 1. Découplage `runningSessions` vs `volumeCapSessions` (doctrine fréquence)
- **Fichier** : `src/services/geminiService.ts` (calculatePeriodizationPlan, ~L2515)
- `runningSessions = sessionsPerWeek - 1` (doctrine : freq=3 → 2 course + 1 renfo, toujours).
- `volumeCapSessions = 3` pour Semi/Marathon freq ≤ 3, sinon = `runningSessions`.
- Le calcul `vmaBasedMaxVolume` et `maxAchievable` utilisent `volumeCapSessions` UNIQUEMENT (cap théorique densifié sans ajouter de slot course).

### 2. Warning Marathon freq ≤ 3 + cv < 25 km/sem (welcomeMessage)
- **Fichier** : `src/services/geminiService.ts` (buildSafetyInstructions, ~L3362+)
- Mention obligatoire dans welcomeMessage : "préparation a minima, vigilance mur 30e km, rampe ≤ 10 %/sem".
- Bienveillant, transparent, jamais culpabilisant. Ne dégrade pas l'objectif user (doctrine `feedback_jamais_baisser_allure_cible`).
- Pas de cross-training (doctrine `feedback_coach_running_ia_que_course`).

### 3. Garde-fou faisabilité pic/cv > 2.0 (ratio Gabbett ACWR)
- **Fichier** : `src/services/feasibilityService.ts`
- Champ `peakVolume?: number` ajouté à `FeasibilityParams` (optionnel, rétrocompat).
- Path `calculateFeasibility` (général) : si `peakVolume / currentVolume > 2.0` → `score = min(score, 50)`.
- Path `buildFinisherFeasibility` : même cap + raison explicite injectée dans `reasons[]` ("pic ${peakVolume}km plus de 2× ton volume actuel ${currentVolume}km — rampe très exigeante, risque blessure significatif").
- Callsites peakVolume mis à jour :
  - `src/App.tsx` (recalcul faisabilité utilisateur)
  - `src/components/PlanView.tsx` (recalcul plan live)
  - `src/services/geminiService.ts` (previewPrompt feasibilityResultPreview)
- Source : `Math.max(...periodizationPlan.weeklyVolumes)`.

## Tests

**402 → 411 verts** (+9 anti-régression).

- 4 tests P0c dans `src/services/__tests__/semi-marathon-volume-floor.test.ts` :
  - P0c-1 : Marathon Inter VMA 11 cv=20 freq=3 → pic ≥ 32 (hard floor + cap densifié)
  - P0c-2 : Marathon cv=10 freq=3 → pic ≥ 32 + ratio pic/cv > 2.0 (déclenche garde-fou aval)
  - P0c-3 : Semi freq=2 → volumeCapSessions=2 (limite découplage)
  - P0c-4 : Marathon Confirmé freq=5 → non-régression (P0c neutre hors freq ≤ 3)
- Tests 11/12 ajustés pour refléter `volumeCapSessions` (au lieu de `runningSessions`).
- 5 tests dans nouveau fichier `src/services/__tests__/feasibility-p0c-peak-volume-guard.test.ts` :
  - 1. Marathon cv=10 pic=32 ratio 3.2 → score ≤ 50
  - 2. Message contient mention "pic plus de 2×"
  - 3. Ratio 1.6 → garde-fou inactif (cv=20 pic=32)
  - 4. Semi cv=15 pic=22 (ratio 1.47) → garde-fou inactif
  - 5. peakVolume undefined → rétrocompat OK, pas de crash

## Commit

- Hash: `2b5093d`
- main ahead origin by **3 commits** (P0a, P0b, P0c).
- **PAS de push, PAS de deploy.**

## Validation doctrine

- [x] `project_coach_running_ia_frequence` : freq=3 = 2 course + 1 renfo (runningSessions= sessionsPerWeek - 1).
- [x] `feedback_jamais_baisser_allure_cible` : objectif marathon utilisateur préservé.
- [x] `feedback_securite_avant_conversion` : warning transparent, jamais culpabilisant.
- [x] `feedback_coach_running_ia_que_course` : pas de cross-training proposé en substitution.
- [x] `feedback_chaque_ligne_justifiee` : tous les commentaires P0c référencent doctrine + bug observé.
- [x] `feedback_input_client_obligatoire` : cv/freq/allure user respectés tels quels.

## Build

`npm run build` OK (prerender 39 pages, 0 erreurs).
