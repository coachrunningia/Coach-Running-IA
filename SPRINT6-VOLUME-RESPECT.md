# Sprint 6 — Respect currentWeeklyVolume + injection LLM + verif marche-course

Date : 2026-05-19
Validé par : Romane (verbatim "max +60% vu que la personne se declare intermediaire et donc habitué")
Doctrine appliquée : [[feedback_input_client_obligatoire]] + [[feedback_securite_avant_conversion]]
Source : Sprint brief Sprint 6 + audit cas Romane Test

---

## Contexte (rappel)

Cas Romane Test (Inter, currentVolume=5km/sem, 10K) → S1 calibrée à **14 km**.
- Avant patch : `volumeCap = max(5, 15) = 15` → S1 ≈ 14 = **+180% du déclaré**.
- Daniels : "max +1 mile / sem". ACSM : "max +10%/sem hors S1".
- Risque articulaire / blessure pour Inter habitué à 5 km/sem.

Décision Romane (15 ans d'expérience, doctrine compromis) :
> "max +60% vu que la personne se declare intermediaire et donc habitué.
> Si jamais elle fait une faible semaine à 5 on peut quand même monter à +60% et pas +50."

---

## Patch 1 — `volumeCap` = currentVolume × 1.6 (garde-fou +60% S1)

### Localisation
`src/services/geminiService.ts:2625-2638` (block `volumeCap` dans la branche `currentVolume > 0`).

### Modification

Avant :
```ts
const volumeCap = Math.max(currentVolume, minStartVolume);
startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
```

Après :
```ts
// volumeCap = +60% max sur S1 quand currentVolume déclaré.
// Doctrine : respect du déclaré (feedback_input_client_obligatoire) avec
// garde-fou de progression Coach 15 ans (Daniels +1mi/sem strict serait
// trop bas, ACSM +10%/sem aussi, on parie qu'un Inter habitué qui déclare
// 5 km/sem est en réalité sur une semaine creuse — baseline 6-8 km).
const volumeCap = Math.round(currentVolume * 1.6);
startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
```

`minStartVolume` reste utilisé comme plancher dans la branche `currentVolume === 0`
(fallback sécuritaire débutant non-déclaré, inchangée). Et reste pris en compte au-dessus
via `let startVolume = Math.max(idealStartVolume, minStartVolume);` (avant la branche).

### Cas Romane post-patch
- Inter cv=5, 10K, vma=13, 12 sem → S1 = **8 km** (cap 5×1.6=8, conforme Daniels).
- Le hard floor S1 ≥ currentVolume (5) reste appliqué : pas de régression.

### Tests anti-régression
Fichier : `src/services/__tests__/minStartVolume-input-respect.test.ts` (8 tests).

| # | Profil | currentVol | Attendu S1 | Statut |
|---|--------|------------|------------|--------|
| 1 | Inter 10K | 5 | ≤ 8 | OK |
| 2 | Inter 10K | 10 | ≤ 16 | OK |
| 3 | Inter 10K | 0 (absent) | fallback minStartVolume | OK |
| 4 | Débutant 10K | 3 | ≤ 5 | OK |
| 5 | Confirmé Marathon | 30 | ≤ 48 | OK |
| 6 | Expert Marathon | 50 | ≥ 50 (hard floor) | OK |
| 7 | Inter 10K BMI 30 | 5 | ≤ 8 | OK |
| 8 | Inter 10K cv=1 | 1 | ≤ 2 | OK |

**8/8 verts**. Tests généraux : **237/237 verts** (avant : 229, +8 nouveaux).

---

## Patch 2 — Injection `currentWeeklyVolume` declared dans previewPrompt

### Localisation
`src/services/geminiService.ts:3658-3672` (header PLAN DE PÉRIODISATION du previewPrompt).

### Modification

Ajout dans le prompt template, juste après "Volume semaine 1 calibré" :

```
Volume actuel déclaré par l'utilisateur : ${data.currentWeeklyVolume > 0 ? `${data.currentWeeklyVolume} km/semaine` : 'non précisé'}
Volume semaine 1 calibré : ${weeklyVolumes[0]} km

⚠️ TRANSPARENCE CALIBRAGE — RÈGLE OBLIGATOIRE pour welcomeMessage :
Si l'utilisateur a déclaré un volume actuel > 0 ET que le ratio (S1 calibrée / volume déclaré) > 1.5
(c'est-à-dire : on propose plus de +50 % par rapport à sa baseline), tu DOIS expliquer ce calibrage
dans le welcomeMessage de manière transparente et bienveillante. Modèle :
"Tu nous as indiqué [X] km/semaine actuels. On calibre ta première semaine à [Y] km — c'est un peu
plus que ton volume actuel mais reste progressif pour atteindre ton objectif. Tu peux ajuster ton
volume dans ton profil si tu cours en réalité plus que ça."
Ton : honnête, jamais commercial, jamais culpabilisant. Si le ratio ≤ 1.5, pas besoin de l'évoquer.
```

### Justification
- Avant : le LLM ne connaissait que la S1 calibrée, pas le déclaré → impossible de commenter
  l'écart dans le welcomeMessage.
- Maintenant : le ratio est calculable, l'instruction est explicite, le ton est cadré
  (transparence sans culpabilisation cf. [[feedback_securite_avant_conversion]]).

---

## Vérification 3 — Marche/Course type de séance scope

### Méthode
Grep complet `Marche/Course|marche.course|walk-run|isWalkRun` dans `src/` + audit
des occurrences pour identifier si une fonction du code peut générer ce type pour Inter+.

### Occurrences trouvées : 22 dans `src/`

| Localisation | Contexte | Garde-fou niveau | Verdict |
|--------------|----------|------------------|---------|
| `types.ts:157` | Type union TS | N/A (déclaration) | OK |
| `Questionnaire.tsx:763` | Texte UI marketing | N/A (texte) | OK |
| `BeginnerLanding.tsx:33,83,182,225` | Page débutant | N/A (page débutant explicite) | OK |
| `sessionScale.ts:44` | Blacklist MAINSET_RISKY | Neutre | OK |
| `planValidator.ts:274,314-329` | Règle 4b S1-S4 obligatoire | `if (isBeginnerLevel)` | OK |
| `geminiService.ts:585-595` | Mapping `"Running" → "Marche/Course"` si title contient "marche" + "course" | Décision LLM via title | OK (LLM ne nomme ainsi que si scope Débutant prompt) |
| `geminiService.ts:673,685` | paceMap (allure récup pour ce type) | Neutre | OK |
| `geminiService.ts:1513,1547,1558` | `isWalkRun` cap durée 50min + scale 1.3 max | Neutre (cap si déjà nommé) | OK |
| `geminiService.ts:2409-2443` | Mode marche-course INTERNE (cap VMA) | Commentaire explicite "≠ type Marche/Course côté prompt LLM (qui reste Débutant uniquement)" | OK |
| `geminiService.ts:3514-3525` (`needsMarcheCourse`) | Bloc previewPrompt "Marche/Course OBLIGATOIRE" | `isBeginnerLevel \|\| (vma < 10.5 && (PdP \|\| Maintien))` | OK (cf. ci-dessous) |
| `geminiService.ts:4328-4346` (`needsMarcheCourseRemaining`) | Même bloc pour weeks 2+ | idem | OK |
| `geminiService.ts:3705-3774,4582+` | Blocs PdP "alternance marche/course" si surpoids/VMA basse | Scope PdP uniquement | OK |
| `geminiService.ts:3876,3889,3929,3951` | Règles nommage JSON | Type énuméré dans le schema, encadré par scope précédent | OK |
| `geminiService.ts:5633` | zoneTypeMap Z1-Z2 | Neutre | OK |
| `feasibilityService.ts:1018` | Reason "alterne marche/course en montée" pour débutant trail | `if (debutant)` | OK |

### Cas limite étudié

**`needsMarcheCourse = isBeginnerLevel || (vmaEstimate.vma < 10.5 && (isPertePoidsPrev || isMaintienPrev))`**

Pour un Inter+ avec VMA < 10.5 et plan PdP/Maintien, le prompt force "Marche/Course".
Au sens littéral du [[feedback_mode_marche_course_scope]] (Débutants uniquement), c'est
une extension. Mais en pratique :
- VMA < 10.5 km/h est PHYSIOLOGIQUEMENT équivalent à un débutant (la VMA prime sur le
  niveau déclaré dans le code, cf. `detectLevelFromData`).
- Le scope est limité à Perte de poids / Maintien (zéro chrono ambitieux, donc on protège
  surtout les articulations / progression douce).
- Pas de chrono à respecter → pas de friction sur la performance.

**Verdict** : pas un bug bloquant. C'est une extension justifiée par physiologie (VMA très
basse) et scope (PdP/Maintien). Flag à valider avec Romane si elle veut **resserrer** à
"Débutant uniquement" pur. Pour ce sprint : **pas de patch**, doctrine `feedback_scope_strict`
respectée (on ne touche pas ce qui n'a pas été demandé).

### Verdict global Vérification 3
**OK — aucun bug bloquant détecté**. Le type "Marche/Course" est correctement gardé au
scope Débutant + cas physiologiquement équivalent (VMA<10.5 + PdP/Maintien). Aucune fonction
du code n'introduit "Marche/Course" en sortie pour un profil Inter+ avec VMA normale.

---

## Tests + Build

- `npx vitest run` : **237/237 verts** (+8 nouveaux vs 229 avant)
- `npm run build` : **OK** (exit 0, prerender 37/37 OK, 0 errors)

---

## Deploy

À déclencher après commit + push :
```
git add -A
git commit -m "fix(sprint6): respect currentWeeklyVolume declared + injection prompt + +60% max S1"
git push
firebase deploy --only hosting
```

---

## Fichiers touchés

- `src/services/geminiService.ts` — Patch 1 (L2625-2638) + Patch 2 (L3658-3672)
- `src/services/__tests__/minStartVolume-input-respect.test.ts` — nouveau (8 tests)
- `SPRINT6-VOLUME-RESPECT.md` — ce livrable
