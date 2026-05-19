# État des lieux Rich — Roadmap code/prompt à corriger
Date : 2026-05-18
User : Rich (rauroy@yahoo.fr), 55 ans, 68 kg, Expert Performance, marathon PB 3h00.
Race cible : Ultra-Trail 110 km / 12 000 m D+ le 14/08/2026.
Volume actuel déclaré : **70 km/sem + 3 000 m D+/sem**, freq 5 sessions/sem.
Conversion Premium 18/05.

## 0. Sources / méthode

| Source | Rôle |
|---|---|
| `backup-rich-NEW-pre-patch-summary.json` | Valeurs Plan 1 (13 sem) AVANT premier patch (backup brut écrasé) |
| `backup-rich-PLAN2-pre-patch.json` | Plan 2 (19 sem) entièrement intact AVANT patch |
| `after-rich-PLAN1-post-cash-message.json` | Plan 1 état final actuel en Firestore |
| `after-rich-PLAN2-post-cash-message.json` | Plan 2 état final actuel en Firestore |
| `src/services/geminiService.ts` | Périodisation, prompts, post-processing D+ |
| `src/services/planUtils.ts` | `calculateWeekTargetElevation` (cause racine D+) |
| `src/services/feasibilityService.ts` | R2 gates, safetyWarning |

Plan 1 (13 sem) créé 18/05 = code récent (R2 gates + `weeklyElevationTarget` actifs).
Plan 2 (19 sem) créé 08/04 = code legacy (commit `75d5884` du 17/05 a introduit R2 gates).
Aucun des deux n'est `fullPlanGenerated` → on n'analyse que la S1 + la periodization.

---

## 1. SYNTHÈSE EXÉCUTIVE (tableau)

| # | Dimension | Plan 1 initial | Plan 2 initial | Verdict global | Priorité code |
|---|---|---|---|---|---|
| 1 | Volumes hebdo pic | 84 km | 99 km | 🟢 P1 conforme doctrine Master 55 Finisher. ❌ P2 dépassait le cap | P2 ✓ |
| 2 | Renforcement S1 | Renfo Trail Focus A excellent | Identique excellent | 🟢 OK doctrine ultra | rien |
| 3 | welcomeMessage | Générique, pic incohérent 130 | Aucune mention sécurité 55 ans | 🟡 améliorable | P2 |
| 4 | D+ S1 vs declared | 1500 / 3000 = **ratio 0.5** | 1500 / 3000 = **ratio 0.5** | ❌ CATA cap maxStart=1500 | **P0** |
| 5 | Progression D+ cycle | 26 634 m = 2.22× race | absent (legacy) | ❌ CATA <3× UTMB | **P0** |
| 6 | Back-to-back | inline 1 ligne L3459 | inline 1 ligne L3459 | ❌ CATA bloc faible | **P1** |
| 7 | Sortie nuit ultra | 0 mention code | 0 mention code | ❌ Lacune totale | P1 |
| 8 | safetyWarning sénior | Générique senior+long | Générique senior+long | 🟡 améliorable | P2 |
| 9 | Cohérence S1 vs periodization post-patch P2 | n/a | **S1 = 51 km / 1500 m alors que weeklyVolumes[0]=70, weeklyElevationTarget[0]=3000** | ❌ INCOHÉRENCE actuelle critique | **P0** |

---

## 2. 🟢 DIMENSIONS OK À LA BASE (rien à toucher code)

### OK #1 — Volumes hebdo Plan 1 (pic 84 km initial)

| Élément | Valeur |
|---|---|
| Plan 1 INITIAL `weeklyVolumes` | `[70, 78, 84, 67, 77, 80, 84, 67, 77, 80, 84, 53, 42]` → **pic 84 km** |
| Plan 1 FINAL `weeklyVolumes` (après tes patches) | `[70, 73, 78, 65, 80, 85, 70, 82, 85, 72, 85, 68, 50]` → **pic 85 km** |

**Recalcul cap théorique** (geminiService.ts L2234-2247 + L2306-2317) :
- ultraLong Expert → `maxVolume = 120`
- ×1.10 (freq 5 → 4 run) = 132
- Finisher ×0.75 × Senior 55 ×0.85 = ×0.6375, plafonné à 0.60 → **~79 km**
- currentVolume 70 ≥ cap → maintient à 70+1.18 = 82, plafonné à `baseMaxVolume × 1.10` ≈ 132×0.60×1.10 = 87
- → **pic théorique ~80-87 km**

Le pic INITIAL 84 km était **dans la doctrine code** (Master 55 Expert ultra Finisher). 
L'écart entre 84 et 85 km final est négligeable (1 km).

**🟢 Conclusion** : tu as oscillé 130→115→100→85, mais le pic 84 km initial était DÉJÀ correct. Le code a fait son travail. **Aucune action code requise sur le cap Plan 1.**

### OK #2 — Renforcement S1 (les 2 plans)

Session Mercredi `Renfo Trail Focus A - Quadriceps & Excentrique (S1)` (renfoService.ts L809+) :
```
Circuit 4 tours : Squats poids de corps (3x18), Squat bulgare (3x12/jambe), 
Fentes avant (3x12/jambe), Gainage ventral (3x35-60s), Dead bug (3x12/côté), 
Extensions mollets debout (3x23), Squat excentrique (descente 4s) (3x12), 
Step-down excentrique (3x9/jambe), Sauts directionnels multi-axes (3x9), 
Mollets debout unipodal (3x14/jambe), Pompes (3x18), Dips sur banc (3x14), 
Tirage élastique horizontal (3x18). Repos 1 min entre tours.
advice : "Contrôle la phase excentrique de chaque mouvement (descente lente). 
         Ça renforce les muscles pour les descentes en trail. Écoute ton corps."
```

Check doctrine Master 55 ultra trail :
- ✅ Squat excentrique descente 4s (priorité descente)
- ✅ Step-down excentrique (quadriceps descente)
- ✅ Mollets debout (gastrocnémien + soléaire)
- ✅ Mollets unipodal (proprioception cheville)
- ✅ Sauts directionnels multi-axes (réactivité, pliométrie)
- ✅ Gainage profond (Dead bug)
- ✅ Bulgare + fentes (unilatéral)
- ✅ Advice excentrique explicite

**🟢 Conclusion** : renfo Trail Focus A est de **qualité Master ultra**. **Aucune action code requise.**

### OK #3 — Détection IRRÉALISTE Plan 1 par R2 gates

La règle 1 trail (feasibilityService.ts L264-272) :
```typescript
const r1Multiplier = distanceKm < 20 ? 5 : distanceKm < 50 ? 4 
                   : distanceKm < 100 ? 3.5 : 3;
const r1Min = r1Multiplier * raceDplus;
if (totalDplusCycle < r1Min) → irrealisticCap = 10;
```

Pour Plan 1 (110 km / 12 000 D+, 13 sem) :
- r1Min = 3 × 12 000 = **36 000 m**
- totalDplusCycle calculé = **26 634 m**
- → **26 634 < 36 000 → IRRÉALISTE** ✅

Le code a parfaitement diagnostiqué Plan 1 comme IRRÉALISTE (score 10). Tu l'as vu, c'est ce qui a déclenché ton intervention. **R2 gates fonctionnent correctement.** Aucune action.

---

## 3. 🟡 DIMENSIONS AMÉLIORABLES

### Améliorable #1 — welcomeMessage Plan 1 INITIAL

Message initial (avant tes patches) :
```
"Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec 12 000 m de D+ 
en moins de 13 semaines de préparation. Ton expérience Expert (marathon 3h00) et ton volume actuel 
(60 km/sem + 3 000 m D+/sem) sont une base solide pour aborder ce défi.

Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic à ~130 km/sem 
et ~7 800 m D+/sem en phase spécifique, pour t'amener prêt à finisher. ..."
```

Points OK :
- ✅ Mention âge 55 + certificat médical INDISPENSABLE
- ✅ Bilan cardio-vasculaire mentionné
- ✅ Marche montée stratégie ultra
- ✅ Renfo excentrique mentionné
- ✅ Doctrine "écouter corps"

Points pas OK :
- ❌ "pic à ~130 km/sem et ~7 800 m D+/sem" : valeur générée par Gemini SANS savoir que le pic réel allait être 84 km (incohérence Gemini vs `weeklyVolumes` du code)
- ❌ Pas de mention back-to-back (alors que c'est dans le prompt L3459)
- ❌ Pas de mention sortie nuit
- ❌ Pas de mention "13 sem trop court pour ultra de cette ampleur"

### Améliorable #2 — welcomeMessage Plan 2 INITIAL

```
"Bienvenue dans ton plan d'entraînement Trail Finisher pour l'ultra de 110km avec 11000m de D+ ! 
Ce programme sur 19 semaines est conçu pour t'emmener sereinement jusqu'à la ligne d'arrivée, 
en mettant l'accent sur l'endurance fondamentale, la résistance à la fatigue et la gestion du dénivelé. 
La première phase, 'fondamentale', vise à construire une base solide sans intensité excessive. 
Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, 
notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 54 ans, 
un bilan cardio-vasculaire est particulièrement conseillé."
```

Plan 2 welcome :
- ❌ Trop générique, AUCUNE mention back-to-back
- ❌ AUCUNE mention résistance excentrique descente
- ❌ AUCUNE mention sortie nuit
- ❌ "consulter un médecin" mais pas "INDISPENSABLE"
- ✅ Mention 54 ans + bilan cardio (mais trop discret)

Code legacy n'imposait pas les bullets "règles d'or" que la version récente intègre indirectement.

### Améliorable #3 — safetyWarning des 2 plans (feasibilityService.ts L1399-1401)

Pour Rich (isSenior=true, isTrail=true, distanceKm=110 ≥ 21 donc isLongDistance=true) :
```typescript
if (isSenior && (isMarathon || isLongDistance)) {
  return `À ${age} ans, on te recommande vivement de consulter ton médecin 
          et de réaliser un test d'effort avant de démarrer cette préparation. 
          Un certificat médical d'aptitude est indispensable pour cette distance. 
          Privilégie la récupération (48-72h entre séances intenses), 
          hydrate-toi bien et écoute ton corps.`;
}
```

Manques pour ultra haute montagne 12 000 m D+ :
- Aucune branche spécifique `ultraTrailHauteMontagne` (D+/km ≥ 50)
- Pas de mention résistance excentrique descente (point #1 sur ultra alpin)
- Pas de mention durée de prépa trop courte
- Pas de mention matériel obligatoire / froid / nuit
- Le message est le MÊME pour un marathon route que pour un ultra 110km 12000m D+ alors que les risques sont radicalement différents

---

## 4. ❌ DIMENSIONS CATASTROPHIQUES (priorité absolue code/prompt)

### Cata #1 — D+ S1 divisé par 2 vs declared (CAP maxStart=1500)

**Données factuelles** :
| Plan | currentWeeklyElevation déclaré | S1 D+ généré | Ratio |
|---|---|---|---|
| Plan 1 INITIAL | 3 000 m/sem | 1 500 m (300+0+225+0+975) | **0.5** |
| Plan 2 INITIAL | 3 000 m/sem | 1 500 m (225+0+300+975+0) | **0.5** |

Romane disait "divisé par 3". En réalité c'est **divisé par 2 exactement** sur les deux plans (cohérent avec le bug code).

**CAUSE RACINE CODE — `calculateWeekTargetElevation` (planUtils.ts L106-157)** :

```typescript
const maxWeeklyElevation = 
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 2500) :
    Math.min(raceElevation, 3500);            // Expert : cap absolu 3500 m/sem

const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));  // ⚠️ HARD CAP 1500
const minStartElevation = Math.round(raceElevation * 0.15);              // 12000×0.15 = 1800
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)      // min(3000, 1500) = 1500 ❌
    : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));
                       // = max(1500, min(1800, 1500)) = max(1500, 1500) = 1500
```

**Le hard cap `maxStart = Math.min(1500, ...)` écrase la valeur déclarée 3000 m** de Rich. Et `minStartElevation` (1800) est lui aussi recapé à `maxStart` (1500).

**Conséquence** : peu importe ce que le user déclare, S1 D+ ne peut JAMAIS dépasser 1500 m. Pour un coureur Expert habitué à 3000+ m D+/sem, c'est une régression brutale qui contredit la doctrine "respecter les inputs client" + "ne pas faire régresser un athlète qui fait déjà X".

**Fix proposé (planUtils.ts L133-139)** :
```typescript
// AVANT
const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
const minStartElevation = Math.round(raceElevation * 0.15);
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));

// APRÈS — supprimer le hard cap 1500 du maxStart pour Expert/Confirmé
const maxStartByLevel = isDeb ? 600 : isInter ? 1000 : isConf ? 1800 : 2500;
const maxStart = Math.min(maxStartByLevel, Math.round(maxWeeklyElevation * 0.70));
const minStartElevation = Math.round(raceElevation * 0.15);
// Inputs client = obligatoires : si user déclare X, on respecte (clamp safe par level)
const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStartByLevel)  // cap par level seulement, pas hard 1500
    : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, minStartElevation);
```

Effet pour Rich (Expert, 3000m declared, 12000m D+ race) :
- maxStartByLevel = 2500, maxStart = min(2500, 3500×0.70) = min(2500, 2450) = 2450
- rawStart = min(3000, 2500) = 2500
- minStartElevation = 1800
- startElevation = max(2500, 1800) = **2500 m** (vs 1500 actuel → ratio 0.83 ≈ respect declared)

**VÉRIFICATION POST-PATCH (Romane veut être sûre)** :

| Plan | weeklyVolumes actuel | weeklyElevationTarget actuel | S1 totalKm sessions | S1 totalD+ sessions | Cohérent ? |
|---|---|---|---|---|---|
| Plan 1 | `[70,73,78,65,80,85,70,82,85,72,85,68,50]` pic 85 | `[3000,3200,3500,2700,4000,4500,3500,4800,5500,4000,5800,3800,1500]` pic 5800 | **70 km** | **3000 m** | ✅ ALIGNÉ |
| Plan 2 | `[70,73,78,65,78,82,68,82,85,72,82,85,75,82,85,68,60,48,35]` pic 85 | `[3000,3200,3500,2700,3500,4000,3200,4000,4500,3500,4500,5000,3800,5000,5800,4000,3200,2000,1200]` pic 5800 | **51 km** ❌ | **1500 m** ❌ | ❌ **INCOHÉRENT** |

**🚨 ALERTE CRITIQUE PLAN 2** :
- `weeklyVolumes[0] = 70` et `weeklyElevationTarget[0] = 3000` ✅ (corrigés par tes patches periodization)
- **MAIS les sessions[0] de la S1 restent à 51 km / 1500 m D+** (jamais régénérées)
- Source : `patch-rich-PLAN2-homogenize.mjs` ligne 216 : `console.log('NB: weeks[].sessions NON touchés (volumes/élev seulement)');`

Rich va donc OUVRIR son Plan 2 et voir une S1 à 51 km / 1500 m D+ alors que la roadmap dit pic 85 km / 5800 m D+. **C'est un saut brutal S1=51 → S2=73 inattendu** et incohérent avec les valeurs déclarées dans la periodization.

### Cata #2 — Progression D+ vers race insuffisante (< 3× UTMB doctrine)

**Données factuelles** :

| Plan | cumul `weeklyElevationTarget` | race D+ | ratio cycle/race | Doctrine UTMB Academy |
|---|---|---|---|---|
| Plan 1 INITIAL | 26 634 m | 12 000 m | **2.22×** ❌ | ≥ 3× minimum |
| Plan 2 INITIAL | absent (legacy) | 12 000 m | n/a | ≥ 3× |
| Plan 1 FINAL (patché) | 49 800 m | 12 000 m | **4.15×** ✅ | conforme |
| Plan 2 FINAL (patché) | 69 600 m | 12 000 m | **5.80×** ✅ | conforme |

**CAUSE RACINE CODE** : `calculateWeekTargetElevation` plafonne `maxWeeklyElevation = Math.min(raceElevation, 3500)` pour Expert. Pour un ultra 12 000 m D+, le pic hebdo est plafonné à 3500 m peu importe le profil. Sur 13 sem (5 récup+affut donc ~8 actives) ça donne au mieux 8×3500 = 28 000 m soit 2.33× race. **Mathématiquement impossible d'atteindre 3× sur 13 sem avec le code actuel.**

Tes patches ont contourné en mettant manuellement `weeklyElevationTarget = [3000, ..., 5800]` (pic 5800 = bien au-dessus du cap 3500 code).

**Fix proposé (planUtils.ts L121-125 — relever caps Expert/Confirmé pour ultra long)** :
```typescript
// AVANT
const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 2500) :
    Math.min(raceElevation, 3500);

// APRÈS — relever caps selon distance race (ultra 100+ km Expert)
const isUltraLongRace = raceElevation >= 8000;  // proxy ultra alpin
const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, isUltraLongRace ? 1000 : 800) :
    isInter ? Math.min(raceElevation, isUltraLongRace ? 2000 : 1500) :
    isConf ? Math.min(raceElevation, isUltraLongRace ? 4000 : 2500) :
    Math.min(raceElevation, isUltraLongRace ? 6000 : 3500);
```

Effet pour Rich (Expert, 12000m D+) :
- maxWeeklyElevation = min(12000, 6000) = **6000** (vs 3500 actuel)
- Pic théorique ~6000, cycle ~48 000 m → ratio 4× ✅
- Aligné avec ce que tu as patché manuellement

### Cata #3 — Back-to-back absent dans le prompt ULTRA 100+ km

**Code actuel (geminiService.ts L3455-3465 — branche Ultra 100km+ preview)** :
```typescript
} : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- La SORTIE LONGUE est la séance CLÉ. Elle doit progresser vers 50-65km ou 6-8h au pic d'entraînement.
- BACK-TO-BACK OBLIGATOIRE en phase spécifique : SL samedi (longue) + sortie dimanche (modérée en fatigue). Le back-to-back simule la fatigue cumulée de l'ultra.
- MARCHE EN CÔTE (power hiking) : intégrer des sections de marche rapide en montée dans les SL.
${NUTRITION_SL_BLOCK}
- MATÉRIEL : s'entraîner avec le sac, les bâtons...
${buildDplusPromptBlock({...})}
- Renforcement : excentrique quadriceps...
```

vs **branche Ultra 70-99km (L3466-3476)** qui injecte `ULTRA70_BACK_TO_BACK_BULLETS` (6 bullets enrichis L3184-3189) :
```typescript
` : data.trailDetails.distance >= 70 ? `
🏔️ ULTRA-TRAIL 70km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA — Règles spécifiques :
${ULTRA70_BACK_TO_BACK_BULLETS}        // 6 bullets enrichis avec détails
```

**Anomalie** : la version "enrichie" (BTB 6 bullets) ne sert que pour 70-99 km. Pour ≥ 100 km (Plan 1 Rich), on retombe sur un **bullet inline isolé**, beaucoup moins prescriptif. Plus la course est dure, moins le prompt est riche → contre-intuitif.

Pour la S1 (preview), aucun BTB n'est exigé car la phase est `fondamental`. Logique. **Le bug n'est visible qu'en `remaining` (S2-S13) qui n'a jamais été généré pour Rich (`fullPlanGenerated: false`).** Donc on ne peut pas confirmer empiriquement que Gemini n'a pas généré BTB — mais le risque est élevé.

**Fix proposé (geminiService.ts L3455-3465 + L4335-4338)** :
```typescript
// Réutiliser ULTRA70_BACK_TO_BACK_BULLETS dans la branche ultra 100km+ aussi
} : data.trailDetails.distance >= 100 ? `
🏔️ ULTRA-TRAIL 100km+ : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m
⚠️ FORMAT ULTRA LONG — Règles spécifiques :
- SORTIE LONGUE = séance CLÉ. Progresser vers 50-65km ou 6-8h au pic.
${ULTRA70_BACK_TO_BACK_BULLETS}        // ← ajouter ici (au lieu du bullet inline isolé)
- MARCHE EN CÔTE (power hiking) : sections marche rapide montée dans SL ≥ 2h30
${NUTRITION_SL_BLOCK}
...
```

Diagnostic bug/origin : **bug code** (oubli de factorisation lors de l'extraction de la constante R-G cleanup au L3183). Le commentaire L3242-3243 dit "back-to-back déjà dans le prompt trail existant (lignes 3258, 4254+)" mais ces lignes contiennent désormais juste 1 bullet inline, pas un bloc structuré.

### Cata #4 — Sortie nuit ABSENTE (lacune totale)

**Vérification grep** :
```bash
grep -n "nuit|night|frontale|nocturne|lampe" src/services/geminiService.ts src/services/feasibilityService.ts
# → 0 résultats
```

Pour un ultra qui dure typiquement 20-30h (110 km / 12 000 m D+), le runner court forcément en pleine nuit. S'entraîner avec lampe frontale en conditions réelles est une compétence à part :
- gestion de l'éblouissement / contraste
- orientation terrain technique de nuit
- gestion fatigue + somnolence
- alimentation + hydratation rythme nocturne

**Fix proposé — nouvelle constante + injection conditionnelle (geminiService.ts vers L3189)** :

```typescript
// Nouveau bloc à côté de ULTRA70_BACK_TO_BACK_BULLETS
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT (lampe frontale) en phase développement/spécifique :
  • 1 à 2 sorties nuit obligatoires si la course passe la nuit (typique ultra >12h)
  • Lampe frontale OBLIGATOIRE, terrain familier la première fois
  • Durée 1h30-3h en EF pure, terrain technique progressivement
  • Travailler la gestion de l'éblouissement, l'orientation, l'alimentation nocturne
  • Privilégier samedi soir (pas dimanche pour préserver récupération)`;

// Injection : ajouter aux branches isUltraLong (≥100km) ET ultra70 (≥70km)
// Condition : raceDplus ≥ 4000 OU raceDistanceKm ≥ 60 (proxy "course passe la nuit")
const includeNightRun = data.trailDetails.distance >= 60 || data.trailDetails.elevation >= 4000;
```

Seuil recommandé : **≥ 60 km de course** (raisonnement : un 60 km moyennement vallonné = 8-10h pour un finisher, peut traverser une nuit si départ après-midi ; un 100+ km traverse forcément). **Pas 80 km** car beaucoup de races 60-80 km partent en soirée et durent jusqu'au matin.

### Cata #5 — Plan 2 S1 sessions JAMAIS régénérées (incohérence actuelle Firestore)

**État Firestore actuel Plan 2** :
- `weeklyVolumes[0] = 70` ✅
- `weeklyElevationTarget[0] = 3000` ✅
- mais `weeks[0].sessions` = `[Footing 10km/225m, Renfo 0/0, Footing 11km/300m, SL 20km/975m, Footing 10km/0m]` = **51 km / 1500 m D+**

Rich va voir un saut S1=51km → S2=73km incompréhensible.

**Fix immédiat (operations)** : régénérer la S1 du Plan 2 en aligning sur les targets `weeklyVolumes[0]=70` / `weeklyElevationTarget[0]=3000`. Soit via :
1. Script de patch direct (comme `patch-rich-NEW-urgent.mjs` qui a fait Plan 1 — il a touché les sessions, ce qui a marché)
2. Soit régénérer Gemini avec contexte forcé

**Fix code racine** : le bug d'origine est le même que Cata #1 (cap maxStart=1500). En corrigeant Cata #1, à la prochaine génération, S1 D+ atteindrait ~2500 m pour Rich et `distributeElevationToSessions` distribuerait correctement. Mais pour Plan 2 actuel **il faut un patch manuel** car les sessions sont figées.

---

## 5. VÉRIFICATION D+ POST-PATCH ACTUELLE (CRITIQUE — Romane demande)

Format demandé strict :

| Métrique | Plan 1 (1779135832271) | Plan 2 (1775644846100) |
|---|---|---|
| `weeklyElevationTarget` actuel | `[3000, 3200, 3500, 2700, 4000, 4500, 3500, 4800, 5500, 4000, 5800, 3800, 1500]` | `[3000, 3200, 3500, 2700, 3500, 4000, 3200, 4000, 4500, 3500, 4500, 5000, 3800, 5000, 5800, 4000, 3200, 2000, 1200]` |
| Pic D+ cible | 5 800 m | 5 800 m |
| Cumul cycle D+ | 49 800 m (4.15× race) | 69 600 m (5.80× race) |
| **S1 sessions totalKm** | **70.0 km** ✅ | **51.0 km** ❌ |
| **S1 sessions totalD+** | **3 000 m** ✅ | **1 500 m** ❌ |
| Cohérence S1 vs periodization | ✅ aligné | ❌ **DÉCALAGE** |
| Doctrine UTMB ≥ 3× | ✅ 4.15× | ✅ 5.80× |

**Verdict global** :
- **Plan 1 : ✅ corrigé proprement.** S1 + cycle alignés.
- **Plan 2 : ⚠️ corrigé sur la periodization mais ❌ INCOHÉRENT sur la S1 affichée.** À repatcher (cf. Cata #5).

---

## 6. ROADMAP CODE/PROMPT (priorités)

### P0 — CRITIQUE (à patcher avant qu'un autre Expert ultra signe)

1. **planUtils.ts L121-125** — relever `maxWeeklyElevation` Expert pour ultra long (`raceElevation ≥ 8000` → cap 6000 m, vs 3500 actuel). Sinon doctrine UTMB 3× impossible mathématiquement.
2. **planUtils.ts L133-139** — supprimer le hard cap `maxStart = Math.min(1500, ...)` qui écrase `currentWeeklyElevation` déclaré. Remplacer par cap par level (Expert : 2500). Respecte la doctrine "inputs client = obligatoires".
3. **OPS — Plan 2 (1775644846100) S1 sessions à régénérer** pour aligner sur `weeklyVolumes[0]=70 / weeklyElevationTarget[0]=3000`. Sinon Rich voit S1=51km/1500m incohérent avec sa periodization patchée.

### P1 — MAJEUR (à coder ASAP)

4. **geminiService.ts L3455-3465 + L4335-4338** — injecter `ULTRA70_BACK_TO_BACK_BULLETS` (constante 6 bullets enrichis) dans la branche Ultra 100km+ aussi, pas seulement 70-99 km. Sinon les ultras les plus dangereux ont le prompt BTB le plus faible.
5. **geminiService.ts vers L3189** — créer constante `ULTRA_NIGHT_RUN_BULLETS` + injection conditionnelle (`distance ≥ 60` ou `elevation ≥ 4000`). Couvre Rich + 90% des ultras qui passent la nuit.

### P2 — AMÉLIORATIONS

6. **feasibilityService.ts L1399-1401** — créer branche dédiée `isUltraTrailHauteMontagne` (proxy `isTrail && raceDplus/raceDistanceKm ≥ 50 && raceDplus ≥ 6000`). Message safety enrichi : résistance excentrique, matériel obligatoire, durée prépa, nuit.
7. **geminiService.ts welcomeMessage prompt** — bloc instructions pour Master 55+ ultra haute montagne : doit mentionner explicitement (a) durée prépa courte si <16 sem, (b) BTB, (c) sortie nuit, (d) renfo excentrique, (e) certificat médical INDISPENSABLE.
8. **Audit code défensif** — chercher tous les `Math.min(X, hardcoded)` qui peuvent écraser des inputs user (potentiels Cata cousins de #1). Documenter chaque cap : pourquoi cette valeur, à partir de quelle doctrine.

### P3 — Monitoring

9. **planValidator.ts ou nouveau guard post-patch** — alerter si `weeklyVolumes[0] / sum(sessions[0].distance) > 1.3` ou `weeklyElevationTarget[0] / sum(sessions[0].elevationGain) > 1.5`. Aurait détecté l'incohérence Plan 2 immédiatement.
10. **Métrique offline** : pour tous les plans Trail ≥ 60km existants, calculer `sum(weeklyElevationTarget) / raceElevation`. Lister les < 3× (potentiels candidats à régénérer post-fix P0#1).

---

## 7. SYNTHÈSE "ce qu'on a appris de Rich"

### Anti-patterns CODE identifiés
- **Hard cap masqué dans Math.min** (`maxStart = Math.min(1500, X*0.60)`) : écrase silencieusement les inputs user. Doctrine "inputs client = obligatoires" violée.
- **Cap par niveau non-modulé par distance de race** : un Expert ultra 110 km n'a pas les mêmes besoins qu'un Expert trail 30 km, mais `maxWeeklyElevation` les traite pareil (3500 m max).
- **Branches de prompt inversées en richesse** : plus la course est extrême, moins le prompt est prescriptif (Ultra 100+ km moins détaillé que Ultra 70+ km sur BTB).
- **Patches partiels qui créent incohérence** : modifier la `periodization` sans toucher aux `sessions[0]` laisse un état Firestore corrompu (Plan 2 actuel).

### Anti-patterns PROMPT identifiés
- **Bullets dupliqués (preview/remaining) qui divergent** : la constante extraite n'est pas appliquée partout (Cata #3). Fragile aux régressions.
- **0 mention sortie nuit** alors que c'est une compétence de base pour tout ultra >50 km.
- **Conditionnement BTB sur `phase=spécifique`** : OK en théorie mais aucune vérification que le plan généré a effectivement ces phases au bon endroit (Rich Plan 1 INIT n'avait que 3 weeks spécifique sur 13).

### Bug Gemini-Flash vs bug code vs bug prompt
| Symptôme Rich | Origine |
|---|---|
| D+ S1 = 1500 m | **Bug CODE** (`distributeElevationToSessions` écrase Gemini avec `calculateWeekTargetElevation` cappé) |
| D+ cycle 2.22× | **Bug CODE** (`maxWeeklyElevation` cap 3500 expert) |
| BTB absent | **Bug PROMPT** (branche 100+ km ne réutilise pas constante enrichie) |
| Sortie nuit absente | **Bug PROMPT** (constante inexistante) |
| welcomeMessage générique | **Bug PROMPT** (pas de bloc dédié ultra haute montagne) |
| Plan 2 S1 incohérente | **Bug PROCESS** (patches Romane n'ont pas régénéré sessions) |
| Pic 84 km Plan 1 init | **Pas un bug** — code conforme doctrine Master 55 Finisher |
| Renfo Trail Focus A | **Pas un bug** — qualité Master ultra OK |

### Bonnes pratiques à généraliser
- Tout `Math.min(X, hardcoded)` qui touche un input user doit être commenté avec sa source doctrine et faire l'objet d'un test.
- Toute branche `data.trailDetails.distance >= N` doit avoir un test E2E qui vérifie que la branche est réellement atteinte ET que les constantes attendues sont bien injectées.
- Tout patch de periodization (`weeklyVolumes`, `weeklyElevationTarget`) DOIT s'accompagner d'un patch ou regen des `weeks[*].sessions` correspondantes — sinon incohérence Firestore. Créer un helper `patchPeriodizationCoherent(planId, ...)` qui force les deux.
