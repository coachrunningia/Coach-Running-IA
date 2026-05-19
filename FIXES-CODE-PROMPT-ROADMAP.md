# Fixes code + prompt — roadmap consolidée
Date : 2026-05-18
Périmètre : CODE + PROMPT GEMINI uniquement (les patches Firestore live = sujet séparé)

---

## Synthèse exec

- **Total bugs identifiés : 14**
  - **CODE : 9** (planUtils, geminiService cascade, parsing, caps, monitoring)
  - **PROMPT : 4** (back-to-back ultra 100+, sortie nuit, welcomeMessage Master ultra, blessure)
  - **PROCESS : 1** (Stripe / régénération post-conversion)

- **Recommandation ordre d'exécution** : commencer par les 2 P0 (BUG #1 + BUG #2) en un seul commit `planUtils.ts` + `geminiService.ts` (le calcul D+ est dupliqué entre les deux), puis enchaîner les 2 P1 prompt (BUG #3 + BUG #4) qui sont triviaux (15-30 lignes de string template, zéro risque code). Les fixes P2 cascade (BUG #5 à #9) demandent un sprint dédié avec tests unitaires multi-profils. Les fixes prompt qualitatifs (BUG #10-#12) peuvent partir avec le sprint P1. Process (BUG #13-#14) en backlog.

---

## Tableau récap (1 ligne par fix)

| ID | Bug | Type | Sévérité | Fichier:Ligne | Effet user | Priorité |
|---|---|---|---|---|---|---|
| #1 | Hard cap `maxStart = Math.min(1500, ...)` écrase `currentWeeklyElevation` user | CODE | 🔴 CRITIQUE | `planUtils.ts:134` + miroir `geminiService.ts:2009-2024` | Rich D+ S1 = 1500 m au lieu de 3000 m (ratio 0.5). Tous les Trail Confirmé/Expert avec current D+ > 1500 m régressent silencieusement | P0 |
| #2 | Cap `maxWeeklyElevation = Math.min(raceElevation, 3500)` Expert trop bas pour ultra long | CODE | 🔴 CRITIQUE | `planUtils.ts:121-125` + miroir geminiService | Mathématiquement impossible d'atteindre doctrine UTMB 3× race D+ sur un ultra 12 000 m D+. Cumul cycle 2.22× au lieu de ≥3× | P0 |
| #3 | `ULTRA70_BACK_TO_BACK_BULLETS` injecté pour 70-99 km mais PAS pour 100+ km | PROMPT | 🟠 MAJEUR | `geminiService.ts:3455-3465` + branche `remaining` ~L4335 | Les ultras les plus dangereux ont le prompt BTB le plus pauvre (1 bullet inline isolé vs 6 bullets enrichis) | P1 |
| #4 | Sortie nuit ABSENTE de tout le code/prompt (0 match grep) | PROMPT | 🟠 MAJEUR | `geminiService.ts` (nouvelle constante à créer ~L3189) | Ultra 60+ km traverse la nuit, mais Gemini n'a aucune instruction explicite → risque safety (chute, désorientation) + DNF | P1 |
| #5 | `detectLevelFromData` downgrade silencieux Expert → Débutant sans message UI | CODE | 🟠 MAJEUR | `geminiService.ts:1174-1232` | georgeslor1 (10K 1h00, Marathon 5h15, 57 ans) classé `deb` → maxVolume 45 au lieu de 65-85. Désabonnement | P2 |
| #6 | `timeToSeconds` rejette les formats libres "37min" / "58min" / "50km (6h50)" | CODE | 🟡 MINEUR | `geminiService.ts` helper (centraliser, ~L1156) | armando (10K "37min") reste Expert au lieu de conf → pic 92 au lieu de 75. jeremy : input pollué accepté comme 6h50 → bug critique | P2 |
| #7 | Cap `startVolume = Math.min(..., maxVolume × 0.65)` peut écraser le floor 100% | CODE | 🟡 MINEUR (résiduel) | `geminiService.ts:2666` | 12 cas extrêmes observés (audit 1156 plans) où `current > maxVolume × 0.90` produit S1 < current malgré commit 26b3d3a | P2 |
| #8 | `sessionFactor` multiplicatif sans plafond Expert | CODE | 🟡 MINEUR | `geminiService.ts:2285-2295` | Conf Marathon freq 6 → 75×1.20 = 90 (dépasse cap Expert 85). antoine 92, armando 92 | P2 |
| #9 | `finisher × 0.75` mécanique sur tous les profils | CODE | 🟡 MINEUR | `geminiService.ts:2305-2308` | alan (current 30/race 35 = ratio 0.86) pénalisé inutilement à -25%. Sébastien-like : pic 6 au lieu de 9 (cas extrême) | P2 |
| #10 | Prompt welcomeMessage ne cite PAS le PB si Finisher + PB | PROMPT | 🟡 MINEUR | `geminiService.ts` prompt welcome | Justine/Alan/Valentine welcomes génériques. Sébastien post-patch manuel = référence (cite PB → individualisation perçue) | P1 |
| #11 | Prompt welcomeMessage ne cite PAS la blessure déclarée | PROMPT | 🟡 MINEUR | `geminiService.ts` prompt welcome | Justine (algodystrophie cheville) → welcome n'en parle pas → perte confiance "l'app ne m'a pas lu" | P1 |
| #12 | Pas de bloc `welcomeMessage` / `safetyWarning` dédié ultra haute montagne (Master 55+) | PROMPT | 🟡 MINEUR | `feasibilityService.ts:1399-1401` + prompt welcome | Rich reçoit le MÊME safety warning qu'un marathon route. Pas de mention BTB / nuit / matériel / résistance excentrique | P2 |
| #13 | Pas d'alerte monitoring si `weeklyVolumes[0] / sum(sessions[0].distance) > 1.3` | PROCESS | 🟡 MINEUR | nouveau guard `planValidator.ts` | Aurait détecté immédiatement l'incohérence Plan 2 Rich (51 km sessions vs 70 km annoncés) | P3 |
| #14 | Stripe webhook post-conversion ne déclenche pas régénération full plan | PROCESS | 🟡 MINEUR | infra (webhook Stripe) | Rich resté en `isPreview: true` pendant 24h+ après conversion Premium | P3 |

---

## Détail par bug

### BUG #1 — Hard cap `maxStart = Math.min(1500, X)` écrase le D+ déclaré user

**Type** : CODE
**Sévérité** : 🔴 CRITIQUE
**Fichier:Ligne** : `src/services/planUtils.ts:133-139` + code miroir `src/services/geminiService.ts:2009-2024` (`distributeElevationToSessions` consomme le même calcul L121-125)

**Pourquoi ça n'a pas marché**
Le hard cap `maxStart = Math.min(1500, maxWeeklyElevation × 0.60)` est une borne absolue qui s'applique AVANT toute prise en compte du `currentWeeklyElevation` déclaré. Cas Rich (Expert, 12 000 m race, 3 000 m current) :
- `maxWeeklyElevation = Math.min(12000, 3500) = 3500` (cap Expert L125)
- `maxStart = Math.min(1500, 3500 × 0.60 = 2100) = 1500`
- `rawStart = Math.min(currentWeeklyElevation=3000, maxStart=1500) = 1500`
- `minStartElevation = round(12000 × 0.15) = 1800` mais recapé à `maxStart=1500`
- `startElevation = max(1500, min(1800, 1500)) = 1500`

Résultat factuel observé :
- **Plan 1 Rich INITIAL : S1 D+ = 1 500 m / déclaré 3 000 m → ratio 0.5**
- **Plan 2 Rich INITIAL : S1 D+ = 1 500 m / déclaré 3 000 m → ratio 0.5**

Quel que soit l'input user, S1 D+ ne peut JAMAIS dépasser 1 500 m. Violation directe de la doctrine `feedback_input_client_obligatoire` ("inputs client respectés tels quels").

**Comment modifier**

```typescript
// AVANT (planUtils.ts:133-139)
const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
const minStartElevation = Math.round(raceElevation * 0.15);
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));

// APRÈS — supprimer le hard 1500, cap par level, respecter input client
const maxStartByLevel = isDeb ? 600 : isInter ? 1000 : isConf ? 1800 : 2500;
const maxStart = Math.min(maxStartByLevel, Math.round(maxWeeklyElevation * 0.70));
const minStartElevation = Math.round(raceElevation * 0.15);
// Inputs client = obligatoires : respecter currentWeeklyElevation (clamp safe par level)
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStartByLevel)
    : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, minStartElevation);
```

Effet vérifié pour Rich (Expert, 3 000 m declared, 12 000 m race, post BUG #2 aussi) :
- `maxStartByLevel = 2500`, `maxStart = min(2500, 6000×0.70) = 2500`
- `rawStart = min(3000, 2500) = 2500`
- `minStartElevation = 1800`
- `startElevation = max(2500, 1800) = 2500 m` (vs 1500 actuel → ratio 0.83, respect déclaré)

**Impact**
- **Qui est touché** : tous les plans Trail Confirmé + Expert dont `currentWeeklyElevation > 1500 m`. Audit batch n'a pas chiffré cette catégorie spécifique mais on sait que tous les Trail 60+/100+ Expert avec base D+ sérieuse sont impactés (Rich = cas type).
- **Effet immédiat post-fix** : S1 D+ aligné sur déclaré (ratio ≥ 0.83). Plus de régression silencieuse de -50 % du D+ habituel.

**Risque modification**
- **Risque casse autres profils** : Faible. Les niveaux Débutant/Inter ont des `maxStartByLevel` (600/1000) cohérents avec leurs caps actuels. Le Confirmé monte de 1500 à 1800 (raisonnable). L'Expert monte de 1500 à 2500 (correctif principal).
- **Tests anti-régression** : 4 profils types à simuler : Débutant Trail 500 m D+ race / Inter Trail 2 000 m race / Confirmé Trail 5 000 m / Expert Trail 12 000 m. Vérifier S1 ne descend pas sous declared ET ne dépasse pas `raceElevation × 0.25`.

**Validation requise**
- GO direct si Romane valide les 4 valeurs `maxStartByLevel` (600/1000/1800/2500). Pas besoin de PM/Coach (la doctrine est claire : respecter inputs client).

---

### BUG #2 — Cap `maxWeeklyElevation = Math.min(raceElevation, 3500)` Expert trop bas pour ultra long

**Type** : CODE
**Sévérité** : 🔴 CRITIQUE
**Fichier:Ligne** : `src/services/planUtils.ts:121-125` + code miroir `src/services/geminiService.ts:2009-2024`

**Pourquoi ça n'a pas marché**
Pour Expert, `maxWeeklyElevation` est plafonné à 3 500 m peu importe la distance de course. Pour un ultra alpin 12 000 m D+ sur 13 sem (8 sem actives après récup/affut), le cumul théorique max = 8 × 3 500 = **28 000 m, soit 2.33× race**. Or doctrine UTMB Academy / Balducci exige **≥ 3× race minimum, 5-6× optimal** pour Masters Experts ultra alpin.

Cas Rich Plan 1 INITIAL : cumul `weeklyElevationTarget` = **26 634 m = 2.22× race** → IRRÉALISTE (R2 gates `feasibilityService.ts:264-272` ont correctement diagnostiqué irrealisticCap=10, c'est ce qui a déclenché l'intervention manuelle).

Romane a patché manuellement à pic 5 800 m / cumul 49 800 m (ratio 4.15×), confirmant que le cap 3 500 est inadapté.

**Comment modifier**

```typescript
// AVANT (planUtils.ts:121-125)
const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 2500) :
    Math.min(raceElevation, 3500);

// APRÈS — moduler par distance de race (ultra alpin ≥ 8000 m D+)
const isUltraLongRace = raceElevation >= 8000;
const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, isUltraLongRace ? 1000 : 800) :
    isInter ? Math.min(raceElevation, isUltraLongRace ? 2000 : 1500) :
    isConf ? Math.min(raceElevation, isUltraLongRace ? 4000 : 2500) :
    Math.min(raceElevation, isUltraLongRace ? 6000 : 3500);
```

Effet vérifié pour Rich (Expert, 12 000 m D+) :
- `maxWeeklyElevation = min(12000, 6000) = 6000` (vs 3500 actuel)
- Pic théorique ~6 000 m, cycle ~48 000 m → ratio 4× ✅
- Aligné Balducci 2024 ch. Master 13 sem (pic 5 500-7 000) et Bramoullé EA #87 ("plateau 6 500 max").

Pour Rich variante 2 sem affut, l'expert Master Athletes recommande pic 6 500 m (cf `EXPERT-MASTER-ULTRA-100KM-RICH.md` § 4.1). Le cap 6 000 reste légèrement conservateur — alternative : `isUltraLongRace ? 6500` pour Expert.

**Impact**
- **Qui est touché** : tous les plans Trail Expert/Confirmé avec `raceElevation ≥ 8 000 m` (typiquement UTMB-tier, Diagonale, Tor des Géants, etc.). Sur la base actuelle : ratio faible (~5-10 plans/an estimé), mais ces plans sont les plus critiques niveau sécurité ET les plus susceptibles d'être Premium.
- **Effet immédiat post-fix** : un Expert qui prépare un ultra 12 000 m D+ obtient un cycle cumulé ≥ 3× race (conforme doctrine UTMB Academy). Plus besoin de patcher manuellement comme Rich.

**Risque modification**
- **Risque casse autres profils** : Nul pour `raceElevation < 8 000 m` (branche `isUltraLongRace = false` conserve les valeurs actuelles 800/1500/2500/3500). Cap modulé uniquement quand pertinent.
- **Tests anti-régression** : simuler (a) Trail Expert race 5 000 m D+ → cap reste 3 500 m, (b) Trail Expert race 12 000 m D+ → cap monte à 6 000 m, (c) Trail Débutant race 8 000 m D+ → cap monte modérément à 1 000 m (un débutant ne devrait pas s'inscrire à un UTMB mais si oui, sécurité respectée).

**Validation requise**
- Coach (pour valider les valeurs 1000/2000/4000/6000 par level vs doctrine Balducci/Bramoullé). Expert Master a déjà validé 6 000-6 500 pour Expert. GO direct si Romane confirme alignment.

---

### BUG #3 — Back-to-back absent du prompt Ultra 100km+ (constante `ULTRA70_BACK_TO_BACK_BULLETS` non réutilisée)

**Type** : PROMPT
**Sévérité** : 🟠 MAJEUR
**Fichier:Ligne** : `src/services/geminiService.ts:3455-3465` (branche preview Ultra 100+) et branche miroir `remaining` ~L4335

**Pourquoi ça n'a pas marché**
La constante `ULTRA70_BACK_TO_BACK_BULLETS` (L3184-3189) contient 6 bullets enrichis avec détails opérationnels (placement Sam/Dim, ratio durée, allure EF strict, repos lundi, etc.). Elle est correctement injectée pour `distance >= 70` (L3469) mais **PAS pour `distance >= 100`** (L3455-3465) où on retrouve à la place 1 bullet inline isolé L3459 :

```
- BACK-TO-BACK OBLIGATOIRE en phase spécifique : SL samedi (longue) + sortie dimanche (modérée en fatigue). Le back-to-back simule la fatigue cumulée de l'ultra.
```

**Anomalie** : plus la course est dure (100+ km vs 70-99), moins le prompt est riche → contre-intuitif. Origine probable : oubli de factorisation lors du cleanup R-G (commentaire L3183).

Pour Rich (Plan 1 et Plan 2, distance 110 km), aucune semaine `fullPlanGenerated`, donc on ne peut pas confirmer empiriquement que Gemini omet le BTB en S2-Sn — mais le risque est élevé.

**Comment modifier**

```typescript
// AVANT (geminiService.ts:3455-3465)
} : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. Elle doit progresser vers 50-65km ou 6-8h au pic d'entraînement.
- BACK-TO-BACK OBLIGATOIRE en phase spécifique : SL samedi (longue) + sortie dimanche (modérée en fatigue). Le back-to-back simule la fatigue cumulée de l'ultra.
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL. Sur un ultra, on marche 30-50% du temps.
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec le sac, les bâtons, le matériel obligatoire dès la phase développement.
- GESTION D'ALLURE : l'allure ultra est PLUS LENTE que l'EF. Prévoir des sections à 7:00-8:00 min/km.
${buildDplusPromptBlock({...})}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception

// APRÈS — réutiliser ULTRA70_BACK_TO_BACK_BULLETS au lieu du bullet isolé
} : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. Elle doit progresser vers 50-65km ou 6-8h au pic d'entraînement.
${ULTRA70_BACK_TO_BACK_BULLETS}
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL. Sur un ultra, on marche 30-50% du temps.
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec le sac, les bâtons, le matériel obligatoire dès la phase développement.
- GESTION D'ALLURE : l'allure ultra est PLUS LENTE que l'EF. Prévoir des sections à 7:00-8:00 min/km.
${buildDplusPromptBlock({...})}
- Renforcement : excentrique quadriceps (descente), gainage, proprioception
```

Idem dans la branche `remaining` (~L4335) — vérifier qu'elle utilise aussi `ULTRA70_BACK_TO_BACK_BULLETS` pour `distance >= 100`.

**Impact**
- **Qui est touché** : tous les ultras ≥ 100 km (Rich-like). Volume estimé : faible (<10 % des plans Trail) mais profils premium ultra haute valeur.
- **Effet immédiat post-fix** : Gemini reçoit instructions structurées sur le BTB → probabilité élevée que les semaines spécifiques contiennent un BTB code (Sam SL + Dim 2e SL en fatigue), au lieu d'un bullet vague que Gemini peut ignorer.

**Risque modification**
- **Risque casse autres profils** : Nul (factorisation : on remplace 1 bullet par 6 bullets identiques à la branche 70-99 déjà testée).
- **Tests anti-régression** : générer 1 plan test ultra 100+ km et vérifier que `weeks[].sessions` contient bien un pattern Sam SL + Dim 2e SL en phase spécifique.

**Validation requise**
- GO direct (prompt-only, zéro risque code, alignement évident).

---

### BUG #4 — Sortie nuit ABSENTE de tout le code/prompt

**Type** : PROMPT
**Sévérité** : 🟠 MAJEUR
**Fichier:Ligne** : `src/services/geminiService.ts` (nouvelle constante à créer ~L3189, injection conditionnelle ~L3455 + L4335)

**Pourquoi ça n'a pas marché**
Grep exhaustif sur tout `geminiService.ts` + `feasibilityService.ts` :
```bash
grep -n "nuit|night|frontale|nocturne|lampe" → 0 résultats
```

Pour un ultra qui dure typiquement 20-30 h (110 km / 12 000 m D+), le runner court forcément en pleine nuit. S'entraîner avec lampe frontale en conditions réelles est une compétence à part entière :
- gestion de l'éblouissement / contraste
- orientation terrain technique de nuit
- gestion fatigue + somnolence
- alimentation + hydratation rythme nocturne

Cas Rich : welcomeMessage Plan 1 INITIAL ne mentionne pas la nuit. Welcome Plan 2 idem. Aucune session future n'est codée pour la nuit.

**Comment modifier**

```typescript
// AJOUTER à côté de ULTRA70_BACK_TO_BACK_BULLETS (geminiService.ts ~L3189)
// R-H : sortie nuit obligatoire pour ultras > 60 km ou D+ > 4000 m (course passe la nuit)
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT (lampe frontale) en phase développement et spécifique :
  • 1 à 2 sorties nuit obligatoires (la course passe la nuit dès qu'elle dépasse ~12h d'effort)
  • Lampe frontale OBLIGATOIRE, terrain familier la première fois (pas terrain technique inconnu de nuit)
  • Durée 1h30-3h en EF pure, progresser vers terrain technique
  • Travailler la gestion de l'éblouissement, l'orientation, l'alimentation nocturne, la lutte contre la somnolence
  • Privilégier samedi soir (pas dimanche pour préserver récupération hebdo)`;

// INJECTION CONDITIONNELLE — modifier les branches preview + remaining
const includeNightRun =
  data.trailDetails.distance >= 60 ||
  data.trailDetails.elevation >= 4000;

// Dans la branche Ultra 100+ km (L3455-3465 + L4335) :
` : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. ...
${ULTRA70_BACK_TO_BACK_BULLETS}
${includeNightRun ? ULTRA_NIGHT_RUN_BULLETS : ''}
- MARCHE EN CÔTE ...

// Dans la branche Ultra 70-99 km (L3466-3476) :
` : data.trailDetails.distance >= 70 ? `
🏔️ ULTRA-TRAIL 70km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA — Règles spécifiques :
${ULTRA70_BACK_TO_BACK_BULLETS}
${includeNightRun ? ULTRA_NIGHT_RUN_BULLETS : ''}
- SL pic doit atteindre 4h30-6h au pic d'entraînement
...
```

**Seuil ≥ 60 km** retenu (pas 80) : beaucoup d'ultras 60-80 km partent en soirée ou tôt le matin et un finisher 8-10h peut traverser la nuit selon timing. Mieux vaut sur-couvrir.

**Impact**
- **Qui est touché** : tous les ultras ≥ 60 km OU ≥ 4 000 m D+. Estimation : ~20-30 % des plans Trail. Plus 100 % des ultras alpins type Rich.
- **Effet immédiat post-fix** : Gemini intègre 1-2 sessions nuit dans les phases dev/spé. WelcomeMessage peut aussi être enrichi (séparément) pour citer cette compétence comme règle d'or.

**Risque modification**
- **Risque casse autres profils** : Nul (instruction prompt-only ; pas de logique de calcul affectée).
- **Tests anti-régression** : générer 1 plan ultra 60 km + 1 plan ultra 100 km → vérifier que la phase spé contient au moins 1 session intitulée explicitement "Sortie nuit" ou "Footing nuit lampe frontale".

**Validation requise**
- GO direct (prompt-only, doctrine évidente). Coach peut affiner les bullets si besoin (placement vendredi/samedi, durée, etc.).

---

### BUG #5 — `detectLevelFromData` downgrade silencieux Expert → Débutant sans message UI

**Type** : CODE
**Sévérité** : 🟠 MAJEUR (impact business prouvé)
**Fichier:Ligne** : `src/services/geminiService.ts:1174-1232`

**Pourquoi ça n'a pas marché**
La cascade `detectLevelFromData` applique 3 priorités :
1. **L1182-1193** — Chronos 5K/10K classifient déterministe via `CHRONO_LEVEL_THRESHOLDS`. Si chrono implique level **plus bas** que déclaré → override silencieux (downgrade only).
2. **L1199-1228** — VMA injectée si pas de chrono / chrono = déclaré. `maxDrop=1` par défaut (2 si VMA très basse).
3. **L1231** — Sinon, garde le déclaré.

**Cas concrets observés (4/10 profils dans l'investigation cascade)** :

| User | Chrono | Déclaré | Effective | Effet pic vol |
|---|---|---|---|---|
| **georgeslor1** (57 ans, M 90 kg) | 10K 1h00, Marathon 5h15 | Expert | **deb** (10K > 50 min) | maxVolume 85 → 45 → patché manuellement à 50. Désabonnement effectif |
| **vincenthamel** (52 ans, Marathon 3h10) | aucun 5K/10K, VMA 16.66 | Expert | **conf** (VMA < 17) | Maxvolume 70 → 60 |
| **jeremy** (Trail 100km) | "50km (6h50)" dans le champ `distance5km` | Expert | **deb** (BUG #6 cascade) | maxVolume 120 → 55 |
| **rija** (5K 15 min, Marathon 2h45) | 10K 34:36 | Expert | expert (OK) | OK |

Aucun message UI ne dit au user "Vous avez coché Expert mais vos chronos suggèrent Débutant".

**Comment modifier**

```typescript
// detectLevelFromData (geminiService.ts:1174-1232)

// 1. Priorité à la distance la plus longue déclarée
// Si user a un PB Marathon ou Semi, NE PAS classer en `deb` sur la base d'un 10K isolé
// (un débutant n'arrive pas à finir un marathon sans préparation conséquente)
function getMinLevelFromLongDistance(times): LevelKey | null {
  if (times.distanceMarathon) return 'inter'; // au minimum
  if (times.distanceHalfMarathon) return 'inter';
  return null;
}

// 2. Correctif âge sur les seuils chrono
// Pour H ≥ 55 / F ≥ 50 : assouplir +5 min sur chaque cran 10K (VO2max décline 0.5%/an Tanaka 2008)
function getChronoThresholds(distance, sex, age) {
  const base = CHRONO_LEVEL_THRESHOLDS[distance][sex];
  if ((sex === 'M' && age >= 55) || (sex === 'F' && age >= 50)) {
    return base.map(t => t + (distance === '10K' ? 5 : distance === '5K' ? 2 : 0));
  }
  return base;
}

// 3. Logger + exposer la raison dans generationContext
// Permet à l'UI d'afficher "Vous vous êtes déclaré Expert, mais vos chronos suggèrent Confirmé..."
return { level: effective, reason: `chrono=${chronoLevel}, vma=${vmaLevel}, declared=${declared}` };
```

**Impact**
- **Qui est touché** : tous les Marathoniens Senior ET les profils dont la VMA est en limite de cran. Audit batch n'a pas chiffré exact, mais investigation 10 profils → **3/10 = 30 %** ont un override actif. Sur le batch 1156 plans : ~340 plans potentiellement concernés (estimation).
- **Effet immédiat post-fix** : georgeslor1-like reclassé `inter` (Marathon prim + correctif âge) → pic vol Marathon Inter = 65 km (vs 45 deb actuel). Désabonnement évité.

**Risque modification**
- **Risque casse autres profils** : Moyen. Cette fonction est appelée à plusieurs endroits (renfo, paces, prompt Gemini). À tester sur le corpus de 600+ plans existants.
- **Tests anti-régression** : créer `detectLevelFromData.test.ts` couvrant matrice age × chronos × VMA × declared. Ajouter param facultatif `strictMode=false` (default new behaviour), garder l'ancien comportement accessible si besoin.

**Validation requise**
- PM + Coach (changement structurel de logique de classification). Valider :
  - Les nouveaux seuils chrono Senior (+5 min sur 10K, +2 min sur 5K)
  - La priorité distance la plus longue (Marathon → min `inter`)
  - L'exposition `levelOverrideReason` dans `generationContext` pour UI message

---

### BUG #6 — Parser `timeToSeconds` rejette les formats libres "37min" / "58min"

**Type** : CODE
**Sévérité** : 🟡 MINEUR (mais cause #5 cascade)
**Fichier:Ligne** : `src/services/geminiService.ts` helper local (à centraliser, ~L1156)

**Pourquoi ça n'a pas marché**
Formats acceptés : `XhYY`, `H:M:S`, `M:SS`. Tout autre format → `return 0` (silencieux).

**Cas observés** :
- **armando** (10K = "37min") → parser retourne 0 → pas de chrono override → reste Expert (au lieu de conf). Pic vol 92 (au lieu de ~75).
- **alanwentzel** (5K = "25min", 10K = "58min") → tous rejetés → fallback VMA override → classé `inter` au lieu de `deb` (l'absence de parsing est ici "accidentellement correcte" mais fragile).
- **jeremy** (`distance5km = "50km (6h50)"`) → match pattern `\d+h\d{0,2}` sur "6h50" → 6×3600+50×60 = 24 600s = **410 min**. Classé `deb` (au lieu de Expert) car ce n'est PAS un 5K à 6h50, c'est un input pollué (le user a saisi un ultra dans le champ 5K).

**Comment modifier**

```typescript
function timeToSeconds(timeStr: string, distance: number): number {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase().replace(/\s+/g, '');

  // ── REJET STRICT : input pollué (contient "km", "m" non lié au temps) ──
  // Évite jeremy "50km (6h50)" mal interprété comme 6h50
  if (/\d+\s*km/i.test(timeStr) || /\d+\s*m\b/.test(timeStr)) {
    console.warn(`[timeToSeconds] input pollué rejeté: "${timeStr}" pour ${distance}km`);
    return 0;
  }

  // 1. Format "XhYY" ou "XhYYmin"
  const hm = s.match(/^(\d+)h(\d{0,2})/);
  if (hm) { const h = parseInt(hm[1]); const m = hm[2] ? parseInt(hm[2]) : 0; return h * 3600 + m * 60; }

  // 2. Format "H:M:S"
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);

  // 3. Format "M:SS" (ou "H:MM" pour les longues distances)
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) {
    if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60;
    return parseInt(ms[1])*60 + parseInt(ms[2]);
  }

  // 4. NEW — Format libre "37min" / "37mn" / "37 minutes"
  const minOnly = s.match(/^(\d+)(?:min|mn|minutes?)$/);
  if (minOnly) return parseInt(minOnly[1]) * 60;

  // 5. NEW — Format "1h" sans minutes
  if (/^\d+h$/.test(s)) return parseInt(s) * 3600;

  console.warn(`[timeToSeconds] format non reconnu: "${timeStr}" pour ${distance}km`);
  return 0;
}
```

**Impact**
- **Qui est touché** : tous les users qui saisissent en format libre. Investigation 10 profils → 3/10 = 30 % impactés.
- **Effet immédiat post-fix** : classification chrono fonctionne, classification level plus précise. À combiner avec BUG #5 (sinon armando passe de Expert à conf et son pic chute brutalement de 92 à 75 — Romane validera si OK).

**Risque modification**
- **Risque casse autres profils** : Faible. La regex rejet strict (km/m) est conservatrice. Le pattern "37min" est ajouté sans toucher aux 3 formats existants.
- **Tests anti-régression** : `timeToSeconds.test.ts` avec 20+ formats : "1h00", "1H00", "1:00", "01:00", "37min", "37 min", "37mn", "50km (6h50)", "DNF", "1h", "1:00:00", etc.

**Validation requise**
- GO direct (fix de parsing, doctrine évidente : un input invalide doit être rejeté, pas interprété au hasard).

---

### BUG #7 — Cap `startVolume = Math.min(..., maxVolume × 0.65)` peut écraser le floor 100 % (résiduel)

**Type** : CODE
**Sévérité** : 🟡 MINEUR (résiduel après commit `26b3d3a`)
**Fichier:Ligne** : `src/services/geminiService.ts:2666`

**Pourquoi ça n'a pas marché**
Le commit `26b3d3a` a corrigé le bug majeur `currentVolumeFloor = currentVolume × 0.85` → `× 1.00` (L2655). Mais la ligne L2666 conserve `startVolume = Math.min(startVolume, volumeCap, maxVolume × 0.65)` qui peut écraser le floor pour les profils où `currentVolume > maxVolume × 0.90`.

**Position PM (Challenge PM `CHALLENGE-PM-4-FIXES-EN-ATTENTE.md`)** : la L2671 `startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume × 0.90))` rattrape déjà dans 95 % des cas (Antoine : current=80, max=105 → 0.65×105=68 → L2671 remonte à min(80, 94.5) = 80 ✓). Bug résiduel ≤ 5 % des plans, delta 0-3 km.

**Position contraire (12 cas extrêmes batch)** : l'audit 1156 plans (`AUDIT-BATCH-BAISSE-VOL-S1.md`) identifie 11 plans Premium actifs ratio S1/current < 0.85 (top : Lucie 60 %, Romain 63 %, Manon 72 %) ET 17 plans Premium previews idem. Ce n'est PAS marginal. Cas type : Antoine current 80 km, peak 105 km → 0.65 × 105 = 68 → S1=68 au lieu de 80.

**Comment modifier**

```typescript
// AVANT (geminiService.ts:2666)
startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
// L2671 rattrape :
startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90));

// APRÈS — subordonner explicitement le cap 0.65 au floor
const peakCap = maxVolume * 0.65;
startVolume = Math.min(
  startVolume,
  volumeCap,
  Math.max(peakCap, currentVolumeFloor) // ne jamais sous le floor
);
// Conserver L2671 comme garde-fou supplémentaire
startVolume = Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90));
```

Effet : élimine le besoin du "rattrapage" L2671 et rend l'intention explicite (la doctrine `feedback_input_client_obligatoire` est codée en clair, pas par accident).

**Impact**
- **Qui est touché** : 11 plans Premium actifs (ratio < 0.85, course future) + 17 previews actifs. Total mesuré (audit batch). Estimation forward : ~5 % des nouveaux plans Confirmé/Expert (cohérent position PM).
- **Effet immédiat post-fix** : tous les nouveaux plans Confirmé/Expert auront S1 ≥ current. Plus de désabonnement type Lucie/Romain/Manon.

**Risque modification**
- **Risque casse autres profils** : Faible (ajout d'un garde-fou cohérent avec la doctrine). Le PM a explicitement exprimé une réserve : "ne pas re-toucher 2× la même fenêtre de code en 6h sans tests unitaires". À respecter : faire en sprint séparé après écriture de 4 tests (Antoine / Armando / Lucie-like / cas extrême).
- **Tests anti-régression** : `calculatePeriodizationPlan.test.ts` matrice current × freq × level × goal. Vérifier que minStartVolume Débutant n'est jamais cassé par le retrait du cap.

**Validation requise**
- PM (Challenge PM `CHALLENGE-PM-4-FIXES-EN-ATTENTE.md` a tranché SKIP en l'état mais sur la base d'un sous-estimé de la prévalence). Re-soumettre avec les données audit batch (11 actifs + 17 previews) qui invalident le "≤ 5 %" supposé.

---

### BUG #8 — `sessionFactor` multiplicatif sans plafond Expert

**Type** : CODE
**Sévérité** : 🟡 MINEUR
**Fichier:Ligne** : `src/services/geminiService.ts:2285-2295`

**Pourquoi ça n'a pas marché**
`runningSess=5 → ×1.20` permet à un Conf Marathon (table 75) d'atteindre 90 km brut. Plus la "Progression min" L2428 (+15-18 %). Plus le lissage. Résultat : on dépasse de >15 % le cap Expert (85) avec un coureur Conf.

Cas observés :
- **antoine** (Conf Marathon, freq 6, ×1.20) : 75 → 90 (puis bump 90→92)
- **armando** (Conf Semi, freq 6, ×1.20) : 60 → 72 (puis bump 72→92, dépasse Expert Semi cap 70)

C'est par design (commentaire L2280-2284 : "Plus de sessions = meilleure distribution = plus de volume supportable"), mais le sessionFactor s'applique AVANT les reductions, donc se compose mal sans plafond.

**Comment modifier**

```typescript
// AVANT (geminiService.ts:2289-2294)
if (sessionFactor !== 1.00) {
  const before = maxVolume;
  maxVolume = Math.round(maxVolume * sessionFactor);
  console.log(`[Periodization] Session factor: ...`);
}

// APRÈS — plafonner par cap absolu Expert pour ce goal
if (sessionFactor !== 1.00) {
  const before = maxVolume;
  maxVolume = Math.round(maxVolume * sessionFactor);
  // NEW : ne jamais dépasser le cap absolu Expert pour ce goal (sauf si déclaré Expert)
  const absoluteExpertCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert ?? 999;
  if (maxVolume > absoluteExpertCap && level !== 'Expert (Performance)') {
    console.log(`[Periodization] sessionFactor cap: ${maxVolume}km > Expert cap ${absoluteExpertCap}km → clamped`);
    maxVolume = absoluteExpertCap;
  }
  console.log(`[Periodization] Session factor: ${runningSess} → ×${sessionFactor} → ${before}km → ${maxVolume}km`);
}
```

Note : `objectiveKey` est défini plus tard L2496, il faut le hoister.

**Impact**
- **Qui est touché** : Conf/Inter avec freq ≥ 5 dont la combinaison sessionFactor × maxVolume dépasse le cap Expert. Investigation 10 profils → 2/10 (antoine, armando). Estimation 5-10 % des Conf/Inter avec haute fréquence.
- **Effet immédiat post-fix** : antoine pic 90 → 85 (Expert Marathon cap), armando pic 92 → 70 (Expert Semi cap). Si le current est plus élevé, la L2418 `maxVolume = max(maxVolume, currentVolume)` rattrape.

**Risque modification**
- **Risque casse autres profils** : Faible. Le clamp ne déclenche que pour les non-Experts qui dépassent l'Expert cap.
- **Tests anti-régression** : couvrir Conf Marathon freq 6 / Conf Semi freq 6 / Expert Marathon freq 6 (ne doit PAS être clampé).

**Validation requise**
- Coach (vérifier que clamper un Conf Marathon à 85 km au lieu de 90 reste réaliste pour les vrais Confirmés haute cylindrée). Pourrait être combiné avec BUG #5 (vrais Experts mal classés Conf seraient automatiquement reclassés Expert, plus besoin de clamp).

---

### BUG #9 — `finisher × 0.75` mécanique sur tous les profils

**Type** : CODE
**Sévérité** : 🟡 MINEUR
**Fichier:Ligne** : `src/services/geminiService.ts:2305-2308`

**Pourquoi ça n'a pas marché**
Pénalité Finisher ×0.75 appliquée systématiquement, même quand le coureur fait déjà la distance / est dans une logique de cycle approchant ses capacités. Cas observés :
- **alan** (Confirmé, Trail 35 km Finisher, current 30 km/sem, 21 ans) : `currentVolume / raceDistance = 0.86`. Pénalité Finisher → 60 (Conf Trail30+) → ×0.75 = 45. **Sans la pénalité, ce serait 60 km** — plus réaliste pour un Finisher qui fait déjà 30 km/sem.
- **Sébastien** (Débutant, 130 kg, 10 km Finisher, freq 2, VMA 8) : cumul Finisher ×0.75 + IMC ×0.65 + vmaCap=5 → pic 6 km. Patché manuellement à 9 km.

Doctrine `feedback_compromis_messages_preventifs` : préférer compromis aux extrêmes. ×0.75 systématique = extrême.

**Comment modifier**

```typescript
// AVANT (geminiService.ts:2305-2308)
const isFinisher = isFinisherTarget(targetTime);
if (isFinisher && !isPertePoids && !isMaintien) {
  totalReduction *= 0.75;
  console.log(`[Periodization] Finisher detected → factor ×0.75`);
}

// APRÈS — moduler par ratio current/race (si user fait déjà X% de la distance, allègement)
const isFinisher = isFinisherTarget(targetTime);
if (isFinisher && !isPertePoids && !isMaintien) {
  let finisherFactor = 0.75; // défaut
  if (currentVolume > 0 && raceDistanceKm > 0) {
    const ratio = currentVolume / raceDistanceKm;
    if (ratio >= 1.0) finisherFactor = 0.95;       // fait déjà la distance → quasi pas de pénalité
    else if (ratio >= 0.7) finisherFactor = 0.85;  // proche de la distance
    else if (ratio >= 0.4) finisherFactor = 0.80;  // mi-chemin
    // sinon 0.75 (débutant pur, comme aujourd'hui)
  }
  totalReduction *= finisherFactor;
  console.log(`[Periodization] Finisher (ratio=${(currentVolume/raceDistanceKm).toFixed(2)}) → factor ×${finisherFactor}`);
}
```

**Impact**
- **Qui est touché** : Finishers avec base solide (ratio current/race ≥ 0.4). Estimation 20-30 % des Finishers.
- **Effet immédiat post-fix** : alan pic 41 → 48 (sans Finisher ×0.75). Sébastien inchangé (ratio 0.5 → 0.80, mais cappé par vmaCap=5 / IMC ×0.65 ; pic resterait ~6-7, patché manuellement à 9 reste justifié par BUG #5 secondaire).

**Risque modification**
- **Risque casse autres profils** : Faible. Pure modulation continue. Les vrais débutants Finisher (ratio < 0.4) conservent ×0.75 actuel.
- **Tests anti-régression** : tester (Finisher current 0) → ×0.75, (Finisher current = race) → ×0.95, (Finisher current = 0.5×race) → ×0.80.

**Validation requise**
- Coach (validation seuils 0.4 / 0.7 / 1.0 et facteurs 0.80 / 0.85 / 0.95).

---

### BUG #10 — Prompt welcomeMessage ne cite PAS le PB si Finisher + PB

**Type** : PROMPT
**Sévérité** : 🟡 MINEUR (valeur perçue Notable)
**Fichier:Ligne** : `src/services/geminiService.ts` prompt welcome (section générique)

**Pourquoi ça n'a pas marché**
Le prompt Gemini ne demande pas explicitement de citer le PB déclaré quand `targetTime === "Finisher"` ET un PB existe sur la distance. Cas Justine / Alan / Valentine : leurs welcomes ne citent pas leur PB déclaré. Sébastien post-patch manuel est la référence ("ton dernier 10K en 1h30, allure 9:00/km → entraînement à 9:30/km").

**Comment modifier**

```
[Ajout au prompt welcomeMessage Gemini]

Si targetTime === "Finisher" ET le user a déclaré un PB sur la même distance dans recentRaceTimes :
Le welcomeMessage DOIT contenir une phrase au format :
"Sur ton dernier {distance} tu as fait {temps} (allure {pace}/km) — ton plan vise une allure d'entraînement à {allureCalculée}/km."

Si PB absent : NE PAS inventer, formuler "tu nous as indiqué viser Finisher : ton plan est calibré pour t'amener à la ligne d'arrivée sereinement".

Si PB en régression (PB > targetTime visé) : formuler neutre "ton plan vise une allure douce pour t'entraîner sereinement, sans pression chronométrique".
```

(Variante 3-cas neutre vs version unique : le Coach FFA a proposé une 3-formulation. La variante minimale acceptable = 1 formulation neutre.)

**Impact**
- **Qui est touché** : ~20-30 % des plans (Finishers avec PB déclaré).
- **Effet immédiat post-fix** : individualisation perçue, sentiment "le plan m'a lu" → +trust.

**Risque modification**
- **Risque casse autres profils** : Nul (prompt-only, clause fallback "ne pas inventer" couverte).
- **Tests anti-régression** : générer 2 plans test (1 Finisher+PB type Sébastien / 1 Finisher sans PB).

**Validation requise**
- GO direct (validé Challenge PM `CHALLENGE-PM-4-FIXES-EN-ATTENTE.md` : APPLY MAINTENANT).

---

### BUG #11 — Prompt welcomeMessage ne cite PAS la blessure déclarée

**Type** : PROMPT
**Sévérité** : 🟡 MINEUR (valeur perçue Notable, sensible sécurité)
**Fichier:Ligne** : `src/services/geminiService.ts` prompt welcome

**Pourquoi ça n'a pas marché**
Le prompt Gemini ne demande pas de citer la blessure déclarée dans le welcomeMessage. Le check `data.injuries?.hasInjury && data.injuries.description` existe déjà L3344-3345 (utilisé pour `safetyWarning`), mais pas pour welcome.

Cas Justine (algodystrophie cheville déclarée) : welcomeMessage n'en parle pas → "l'app ne m'a pas lu" → perte confiance immédiate sur un sujet sensible.

**Comment modifier**

```
[Ajout au prompt welcomeMessage Gemini]

Si injuries.hasInjury === true ET injuries.description non vide :
Le welcomeMessage DOIT contenir une phrase qui :
1. Reconnaît la blessure (citer la description user, formulation respectueuse)
2. Explique comment le plan en tient compte (réduction intensité, séance renfo ciblée, marche autorisée, etc.)
3. Recommande validation médicale si pertinent

JAMAIS de formulation culpabilisante / sur-médicalisante ("ta blessure pourrait t'empêcher de..." INTERDIT).

Le safetyWarning détaillé reste séparé du welcome — pas de doublon.
```

**Impact**
- **Qui est touché** : ~10-15 % des plans (users avec `injuries.hasInjury === true`).
- **Effet immédiat post-fix** : doctrine `feedback_securite_avant_conversion` renforcée. Trust user blessé +++.

**Risque modification**
- **Risque casse autres profils** : Nul (prompt-only).
- **Tests anti-régression** : générer 1 plan test type Justine (algodystrophie) + 1 plan sans blessure (vérifier pas d'hallucination).

**Validation requise**
- GO direct (validé Challenge PM : APPLY MAINTENANT, ratio valeur/coût le plus haut des 4 fixes A1-A4).

---

### BUG #12 — Pas de bloc `safetyWarning` / `welcomeMessage` dédié ultra haute montagne Master 55+

**Type** : PROMPT
**Sévérité** : 🟡 MINEUR
**Fichier:Ligne** : `src/services/feasibilityService.ts:1399-1401` (safetyWarning) + `src/services/geminiService.ts` (prompt welcome)

**Pourquoi ça n'a pas marché**
Pour Rich (isSenior=true, isLongDistance=true), le code renvoie le MÊME safetyWarning qu'un marathon route :

```typescript
if (isSenior && (isMarathon || isLongDistance)) {
  return `À ${age} ans, on te recommande vivement de consulter ton médecin et de réaliser un test d'effort avant de démarrer cette préparation. Un certificat médical d'aptitude est indispensable pour cette distance. Privilégie la récupération (48-72h entre séances intenses), hydrate-toi bien et écoute ton corps.`;
}
```

Manques pour ultra haute montagne 12 000 m D+ :
- Aucune branche `ultraTrailHauteMontagne` (proxy `isTrail && raceDplus/raceDistanceKm ≥ 50 && raceDplus ≥ 6000`)
- Pas de mention résistance excentrique descente (Lazarus 2018)
- Pas de mention matériel obligatoire / froid / nuit
- Pas de mention durée prépa courte si < 16 sem (doctrine Master 50+ Balducci)

**Comment modifier**

```typescript
// AJOUTER avant la branche isSenior générique (feasibilityService.ts:1395+)
const isUltraTrailHauteMontagne =
  isTrail &&
  raceDplus >= 6000 &&
  raceDplus / raceDistanceKm >= 50;

if (isUltraTrailHauteMontagne && isSenior) {
  const planTooShort = planWeeks < 16;
  return `À ${age} ans pour un ultra alpin de ${raceDistanceKm} km / ${raceDplus} m D+ ` +
    `(${Math.round(raceDplus/raceDistanceKm)} m/km), un bilan cardio-vasculaire complet ` +
    `(test d'effort + ECG, daté < 3 mois) est INDISPENSABLE — non négociable. ` +
    (planTooShort ? `La fenêtre de préparation de ${planWeeks} semaines est très courte ` +
      `(doctrine Master 50+ : 16-20 sem minimum pour ce type de course). ` : '') +
    `Le risque #1 est la fragilité tendineuse (descentes répétées) : renforcement excentrique ` +
    `quadriceps + mollets 2 séances/sem en phase spé. Récupération 96h entre 2 grosses ` +
    `descentes. Sortie nuit obligatoire avec lampe frontale avant la course. ` +
    `Matériel complet (bâtons, lampe, sac, vêtements froid) à tester ≥ 2× en SL. ` +
    `À la moindre douleur tendineuse ou articulaire, on adapte plutôt que forcer.`;
}

// Conserver branche isSenior générique pour les autres cas
if (isSenior && (isMarathon || isLongDistance)) {
  return `À ${age} ans, on te recommande...`; // (texte actuel)
}
```

**Impact**
- **Qui est touché** : Masters 55+ Trail haute montagne (ratio D+/km ≥ 50). Volume faible (<5 plans/an estimé) mais cas premium critiques.
- **Effet immédiat post-fix** : Rich-like recevrait un safetyWarning ciblé, plus un welcomeMessage dédié (si on étend en parallèle au prompt welcome).

**Risque modification**
- **Risque casse autres profils** : Nul (nouvelle branche dédiée, ne change pas les autres).
- **Tests anti-régression** : 1 plan test ultra alpin Master 55 + 1 plan marathon Master 55 (vérifier qu'on ne mélange pas).

**Validation requise**
- Coach (Expert Master Athletes a déjà validé le contenu : `EXPERT-MASTER-ULTRA-100KM-RICH.md` § 8 → bloc safetyWarning + welcomeMessage prêt à intégrer).

---

### BUG #13 — Pas d'alerte monitoring si `weeklyVolumes[0] / sum(sessions[0].distance) > 1.3`

**Type** : PROCESS
**Sévérité** : 🟡 MINEUR
**Fichier:Ligne** : nouveau guard à ajouter dans `src/services/planValidator.ts`

**Pourquoi ça n'a pas marché**
Le patch `patch-rich-PLAN2-homogenize.mjs` a modifié `weeklyVolumes[0]=70` et `weeklyElevationTarget[0]=3000` mais a explicitement laissé `weeks[].sessions` intacts (ligne 216 : `console.log('NB: weeks[].sessions NON touchés')`). Résultat Firestore Plan 2 actuel :
- `weeklyVolumes[0] = 70` ✅
- `weeklyElevationTarget[0] = 3000` ✅
- mais `sum(weeks[0].sessions.distance) = 51` km / `sum(elevationGain) = 1500` m

Rich va voir S1 = 51 km au lieu de 70 km. Aucune alerte n'a remonté l'incohérence avant que Romane ne l'observe manuellement.

**Comment modifier**

```typescript
// Nouveau guard dans planValidator.ts (à appeler après tout patch periodization)
export function validatePeriodizationCoherence(plan: Plan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const weeklyVolumes = plan.generationContext?.periodizationPlan?.weeklyVolumes ?? [];
  const weeklyElevationTarget = plan.generationContext?.periodizationPlan?.weeklyElevationTarget ?? [];

  for (let i = 0; i < plan.weeks.length; i++) {
    const week = plan.weeks[i];
    const sumDistance = week.sessions.reduce((s, x) => s + (x.distance ?? 0), 0);
    const sumElevation = week.sessions.reduce((s, x) => s + (x.elevationGain ?? 0), 0);

    if (weeklyVolumes[i] && sumDistance > 0) {
      const volRatio = weeklyVolumes[i] / sumDistance;
      if (volRatio > 1.3 || volRatio < 0.77) {
        issues.push({
          week: i + 1,
          severity: 'CRITICAL',
          message: `Incohérence volume S${i+1} : weeklyVolumes=${weeklyVolumes[i]} vs sum(sessions)=${sumDistance} (ratio ${volRatio.toFixed(2)})`
        });
      }
    }

    if (weeklyElevationTarget[i] && sumElevation > 0) {
      const elevRatio = weeklyElevationTarget[i] / sumElevation;
      if (elevRatio > 1.5 || elevRatio < 0.67) {
        issues.push({
          week: i + 1,
          severity: 'CRITICAL',
          message: `Incohérence D+ S${i+1} : weeklyElevationTarget=${weeklyElevationTarget[i]} vs sum(sessions)=${sumElevation} (ratio ${elevRatio.toFixed(2)})`
        });
      }
    }
  }

  return issues;
}
```

À appeler systématiquement après tout script de patch + à l'ouverture du plan côté UI (warning admin uniquement, pas user).

**Impact**
- **Qui est touché** : ops (Romane). Détection précoce des incohérences post-patch.
- **Effet immédiat post-fix** : aurait détecté immédiatement le bug Plan 2 Rich.

**Risque modification**
- **Risque casse autres profils** : Nul (guard read-only).
- **Tests anti-régression** : néant (nouveau code).

**Validation requise**
- GO direct (monitoring interne).

---

### BUG #14 — Stripe webhook post-conversion ne déclenche pas régénération full plan

**Type** : PROCESS
**Sévérité** : 🟡 MINEUR
**Fichier:Ligne** : infra Stripe webhook (hors src/services/)

**Pourquoi ça n'a pas marché**
Rich a converti Premium le 18/05 mais son Plan 1 est resté en `isPreview: true` pendant 24h+ (jusqu'au moment où Romane a déclenché manuellement). Le webhook Stripe `payment_intent.succeeded` ne semble pas déclencher la régénération automatique vers `fullPlanGenerated: true`.

**Comment modifier**
Hors scope code applicatif. À investiguer côté Cloud Functions / serverless Stripe handler. Vraisemblablement :
1. Ajouter trigger `onPaymentSuccess` qui :
   - Identifie le plan actif en preview du user (premier `isPreview: true` créé < 7 jours)
   - Appelle `generateRemainingWeeks(plan, ...)` automatiquement
   - Met à jour `fullPlanGenerated: true`
2. Ajouter alerte monitoring si `user.subscriptionTier === 'premium' && plan.isPreview === true` depuis > 1h.

**Impact**
- **Qui est touché** : tous les nouveaux Premium dont la conversion n'aboutit pas à un full plan dans la foulée. Volume non chiffré mais Rich = cas avéré.
- **Effet immédiat post-fix** : conversion Premium → full plan généré automatiquement < 5 min. Évite frustration "j'ai payé mais je n'ai que la preview".

**Risque modification**
- **Risque casse autres profils** : Faible si trigger bien isolé.
- **Tests anti-régression** : simuler webhook Stripe sur user test (preview existante) → vérifier que full plan généré.

**Validation requise**
- Dev (chantier infra).

---

## Priorisation finale

### P0 — À coder IMMÉDIATEMENT (impact maximal, casse business)

- **BUG #1** — Hard cap `maxStart=1500` (planUtils.ts:134 + miroir geminiService.ts:2009-2024). Sans ce fix, tous les Trail Confirmé/Expert avec base D+ > 1500 m régressent silencieusement.
- **BUG #2** — Cap `maxWeeklyElevation=3500` Expert (planUtils.ts:121-125 + miroir). Sans ce fix, doctrine UTMB 3× race impossible mathématiquement → tous les ultras 100+ km nécessitent patch manuel.

**Pourquoi P0 ensemble** : les 2 fixes touchent la même fonction `calculateWeekTargetElevation`, dupliquée entre `planUtils.ts` et `geminiService.ts`. Un seul commit cohérent, tests communs.

### P1 — À coder cette semaine

- **BUG #3** — Back-to-back ultra 100+ km (réutiliser `ULTRA70_BACK_TO_BACK_BULLETS`). Prompt-only, zéro risque.
- **BUG #4** — Sortie nuit (nouvelle constante `ULTRA_NIGHT_RUN_BULLETS` + injection conditionnelle). Prompt-only.
- **BUG #10** — WelcomeMessage cite PB si Finisher+PB. Prompt-only. Validé Challenge PM.
- **BUG #11** — WelcomeMessage cite blessure. Prompt-only. Validé Challenge PM.

**Pourquoi P1 ensemble** : tous prompt-only, déployables dans un même commit en 1-2 h. Tests = générer 4 plans types (1 ultra 100+, 1 ultra 70+, 1 Finisher+PB, 1 user blessure) et vérifier que welcome / sessions contiennent les mentions attendues.

### P2 — À coder ce mois (sprint dédié avec tests unitaires)

- **BUG #5** — `detectLevelFromData` downgrade silencieux (correctif âge + priorité distance longue). Structurel, risque régression moyen.
- **BUG #6** — `timeToSeconds` formats libres. Lié à #5.
- **BUG #7** — Cap `maxVolume × 0.65` écrase floor (résiduel). Re-soumettre PM avec données audit batch (11 actifs + 17 previews).
- **BUG #8** — `sessionFactor` plafond Expert. Lié à #5 (peut être obviated si #5 reclasse correctement).
- **BUG #9** — `finisher × 0.75` modulation par ratio current/race.
- **BUG #12** — SafetyWarning + welcomeMessage dédié ultra haute montagne Master 55+. Contenu prêt (Expert Master).

**Pourquoi P2 sprint dédié** : ces fixes touchent la cascade `calculatePeriodizationPlan` qui n'a aucun test unitaire. Avant de toucher, écrire 20 tests profils (5K/10K/Semi/Marathon/Trail<30/Trail30+/Trail60+/Trail100+/VK/Hyrox × Débutant/Inter/Conf/Expert) + audit batch post-deploy.

### P3 — Optimisations futures

- **BUG #13** — Guard `validatePeriodizationCoherence`. Monitoring interne.
- **BUG #14** — Stripe webhook régénération full plan. Chantier infra.

---

## Sprint exécution proposé

### Sprint 1 — P0 D+ trail (estim. 3-4 h)
1. Patch `planUtils.ts:121-125` (BUG #2) + `:133-139` (BUG #1)
2. Patch miroir `geminiService.ts:2009-2024` (mêmes lignes équivalentes)
3. Tests unitaires : 4 profils Trail (Deb/Inter/Conf/Expert) × 2 race elevations (3 000 m / 12 000 m). Vérifier S1 ≥ declared, cap cycle ≥ 3× race pour ultra long.
4. Génération test : 1 plan ultra Expert 12 000 m D+ → comparer à Rich attendu (pic ~6 000, cycle ~48 000, S1 ~2 500).
5. Déploiement.

### Sprint 2 — P1 prompt ultra + individualisation (estim. 2-3 h)
1. Patch `geminiService.ts:3455-3465` (BUG #3) + créer constante `ULTRA_NIGHT_RUN_BULLETS` (BUG #4) + injection conditionnelle preview + remaining.
2. Patch prompt welcome (BUG #10 + #11) : ajout clauses PB-Finisher + blessure.
3. Génération test : 4 plans (ultra 100+, ultra 70+, Finisher+PB type Sébastien, user blessure type Justine).
4. Déploiement.

### Sprint 3 — P2 cascade level + caps (estim. 1-2 j)
1. Écrire 20 tests unitaires matrice profils × goals.
2. Patch BUG #5 (`detectLevelFromData` correctif âge + priorité distance) + BUG #6 (`timeToSeconds`).
3. Patch BUG #7 (cap 0.65 subordonné au floor) + BUG #8 (sessionFactor plafond Expert) + BUG #9 (Finisher modulation).
4. Patch BUG #12 (safetyWarning + welcome ultra alpin Master).
5. Audit batch post-deploy sur 100 plans pour vérifier non-régression.
6. Déploiement progressif (rollback préparé).

### Sprint 4 — P3 monitoring + infra (estim. 1 j)
1. BUG #13 — `validatePeriodizationCoherence` + intégration ops scripts.
2. BUG #14 — Stripe webhook investigation + trigger automatique régénération full plan + alerte monitoring `isPreview > 1h` post-conversion.

---

## Anti-patterns observés (à généraliser dans tous les sprints)

- **Hard cap masqué dans `Math.min`** : tout `Math.min(X, hardcoded)` qui touche un input user doit être documenté avec sa source doctrine + faire l'objet d'un test (cf. doctrine `feedback_chaque_ligne_justifiee`).
- **Cap par niveau non-modulé par distance de race** : un Expert Trail 30 km vs ultra 110 km n'a pas les mêmes besoins. Toujours moduler.
- **Branches de prompt inversées en richesse** : la branche "extrême" doit être ≥ riche que la branche "intermédiaire" (cas Ultra 100+ vs 70+ inversé).
- **Patches partiels qui créent incohérence** : modifier `periodization` sans toucher `sessions[0]` laisse état Firestore corrompu. Helper `patchPeriodizationCoherent(planId, ...)` forcerait les deux.
- **Override silencieux sans message UI** : `detectLevelFromData` downgrade Expert→Débutant sans aucun feedback user. Toujours logger + exposer la raison.

---

## Fixes déjà déployés (rappel — ne pas recommencer)

| Fix | Commit | Date | Statut |
|---|---|---|---|
| A1 floor S1 100 % (au lieu de × 0.85) | `26b3d3a` | 2026-05-18 matin | ✅ Déployé |
| formatTime "2h60min" → "3h00min" | `26b3d3a` | 2026-05-18 | ✅ Déployé |
| Finisher + PB allure (applyTargetTimeOverride) | `26b3d3a` | 2026-05-18 | ✅ Déployé |
| A3 + A4 welcome cite PB + blessure | `40b436a` | 2026-05-18 soir | ✅ Déployé (BUG #10 + #11 ci-dessus = mémo état déployé) |

**Note BUG #10/#11** : si déjà déployés au commit `40b436a`, les déplacer dans cette section et retirer de P1. À vérifier dans le git log.

---

**Fin du rapport — Romane décide l'ordre d'exécution sur la base de cette priorisation.**
