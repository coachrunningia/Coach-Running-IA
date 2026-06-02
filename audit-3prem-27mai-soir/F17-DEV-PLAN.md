# F-17 — Recalibrer mes allures Premium — Dev Plan

Audit pré-code. Approche : **hybride autoritaire `targetPace` + cosmétique regex-replace sur `mainSet`/`warmup`/`cooldown`** sans re-prompter Gemini.

## 1. Constat

- `Session.targetPace` (canonique) → déjà recalculé par `updateSessionPaces` (`App.tsx:1208-1234`).
- `Session.mainSet` (texte Gemini) → **non touché** → incohérence visible. Cas réels : `"82 min à 8:12 min/km"`, `"(5:07 en référence)"`, `"(allure : 5:17 min/km)"`, `"allure EF (8:08 min/km)"`.
- `warmup`/`cooldown` contiennent aussi des paces (ex floggyz : `"à 5:43 min/km très lent"`). **À inclure** sinon incohérence partielle pire.

Scope F-17 = patch des **semaines conservées (avec feedback)** uniquement ; semaines régénérées par Gemini reçoivent déjà `newPaces` dans le prompt.

## 2. Structure fichiers

- **NEW** `src/services/paceRecalibrationService.ts` (pure, zéro Firebase) exporte :
  - `recalibrateSession(session, oldPaces, newPaces): Session` — patche warmup/mainSet/cooldown/targetPace
- **NEW** `src/services/__tests__/paceRecalibrationService.test.ts`
- **MODIFIED** `src/App.tsx` (~L1208) : remplacer la logique inline `updateSessionPaces` par 1 appel `recalibrateSession`. Single source of truth.
- **Aucun changement** : `PlanView.tsx` (modal existe L2505), `storageService.ts`, `types.ts`.

## 3. Algorithme (pseudo-code)

```ts
// Mapping type → paceKey (priorité haut → bas, scan sur type+intensity+title)
const PROFILE_RULES = [
  [/r[ée]cup/i,                                  'recoveryPace'],            // 60%
  [/\bvma\b|fraction|cô?te(s)? courte|30\/30/i,  'vmaPace'],                 // 100%
  [/seuil|tempo/i,                               'seuilPace'],               // 87%
  [/allure marathon|sp[ée]cifique marathon/i,    'allureSpecifiqueMarathon'],
  [/allure semi|sp[ée]cifique semi/i,            'allureSpecifiqueSemi'],
  [/allure 10\s?k|sp[ée]cifique 10/i,            'allureSpecifique10k'],
  [/allure 5\s?k|sp[ée]cifique 5/i,              'allureSpecifique5k'],
  [/endurance active|\bEA\b/i,                   'eaPace'],                  // 77%
  [/.*/,                                         'efPace'],                  // 67% (fallback)
];

// Clé : on NE suppose PAS un paceKey unique par session (cas mxjulien02 : EF apparaît 2× ;
// fractionné : VMA + récup). On construit un swap GLOBAL old→new sur TOUTES les paces.
function buildSwapMap(oldPaces, newPaces): Map<string,string> {
  // Strip " min/km" : oldPaces.efPace = "8:12" stocké tel quel.
  // Itère sur toutes les keys, return Map { "8:12"→"7:48", "6:16"→"5:55", … }
}

function recalibrateText(text, swap): string {
  if (!text) return text;
  return PATTERNS.reduce((acc, re) => acc.replace(re, (match, mm, ss) => {
    const old = `${mm}:${ss}`;
    return swap.has(old) ? match.replace(old, swap.get(old)) : match;
  }), text);
}
```

Filtre `swap.has(old)` = **garde-fou anti-faux-positif** : si `mm:ss` n'est pas dans les anciennes paces, on laisse intact (évite de toucher `"Repos 1:30"`, `"6×3:00"`).

## 4. Regex patterns

```ts
// P1 — "8:12 min/km" / "8:12/km" / "8:12 min /km"
const P1 = /\b(\d{1,2}):([0-5]\d)\s*(?:min\s*)?\/\s*km\b/g;

// P2 — "à 8:12" sans /km (prefix français)
const P2 = /\b(à|allure\s*:?)\s+(\d{1,2}):([0-5]\d)\b(?!\s*\/)/g;

// P3 — "(8:12)" "(8:12 en référence)" "(allure : 8:12)"
const P3 = /\((?:allure\s*:\s*)?(\d{1,2}):([0-5]\d)(?:\s+en\s+r[ée]f[ée]rence)?\s*(?:min\s*\/\s*km)?\s*[^)]*\)/g;
```

Garde-fous : `\b` aux bornes (évite `15:07` matché en `5:07`), `[0-5]\d` rejette `:60+`, filtre `swap.has()` évite collisions avec durées.

Format décimal (`5.5/km`) : **non observé en prod** (tout passe par `secondsToPace`). 1 test asserte no-op si décimal apparaît.

## 5. Edge cases

| Cas | Comportement |
|---|---|
| Renfo mainSet (`"Circuit 3 tours : Squats…"`) | No-op, aucun pattern ne matche. |
| Multi-paces (`"4×800 à 4:30 récup à 6:00"`) | Swap map remplace les 2 indépendamment. |
| Multi-occurrence même pace (cas mxjulien02 : 2× `8:17`) | Les 2 occurrences swappées. |
| Pace inconnue (`"6:00/km"` mais oldPaces.* ≠ `6:00`) | No-op + `console.warn` observabilité. |
| Collision EF==Seuil après recalibrage (très basse VMA) | OK car swap = `old→new`, idempotent. |
| Plan legacy sans `generationContext.paces` | Bail-out (déjà guard `App.tsx:1077`). |
| Durée non-pace `"Repos 1:30"` | Filtre `swap.has("1:30")` = false → intact. |
| `targetPace="9:16 min/km"` vs interne `"9:16"` | Strip `" min/km"` au build swap. |
| Marche/Course | type→efPace ; pace marche souvent sans `/km` donc no-op acceptable. |
| Session sans `mainSet` (Repos) | No-op. |

## 6. Idempotence

Garantie par construction : `recalibrateSession` lit `oldPaces` (état actuel plan) et écrit `newPaces`. App.tsx doit appeler **AVANT** d'écraser `plan.paces = newPaces`.

Chaîne A→B→C : 1er appel swap A→B (texte contient B), 2e appel swap B→C (oldPaces=B donc match). ✅
Identité (old=new) : swap est l'identité → texte inchangé. ✅

## 7. Tests (20)

`src/services/__tests__/paceRecalibrationService.test.ts` :

1. EF simple `"82 min à 8:12 min/km"` → swap.
2. Format `(8:12)` sans min/km — cas louleroy.
3. `(allure : 5:17 min/km)` — cas mxjulien02.
4. `(8:17 en référence)` — variante texte.
5. Prefix `à 9:16 min/km`.
6. Fractionné multi-pace `"4×800 à 4:30 récup à 6:00"` → 2 swaps.
7. Renfo `"Circuit 3 tours…"` → no-op.
8. warmup `"5 min à 5:43 min/km très lent"` → swap.
9. cooldown `"10 min à 5:43 min/km + étirements"` → swap.
10. Pace inconnue (`"6:00/km"`, oldPaces sans 6:00) → no-op + warn.
11. Durée préservée `"Repos 1:30 entre tours"` → intact.
12. VMA pace → swap vmaPace.
13. Seuil `"30 min seuil à 4:45/km"` → swap seuilPace.
14. Allure spécifique marathon → swap correct (pas EF).
15. Idempotence A→B→C, valeur finale = C.
16. Idempotence identité (old=new) → byte-equal.
17. Plan legacy sans paces → no-op safe.
18. Collision EF==Seuil dans newPaces → OK.
19. Borne `\b` : `"15:07 min/km"` matché en `15:07` (pas `5:07`).
20. Multi-occurrence même pace (mxjulien02) → toutes swappées.

## 8. Intégration App.tsx

Remplacer `updateSessionPaces` (L1208-1234) par :

```ts
const { recalibrateSession } = await import('./services/paceRecalibrationService');
const oldPaces = plan.generationContext?.paces;
const updateSessionPaces = (s: Session) => recalibrateSession(s, oldPaces, newPaces);
```

N'appliquer QUE sur `weeksWithFeedback` (cf. L1236-1245). Les semaines régénérées par Gemini sont déjà cohérentes.

## 9. GO / NO-GO

**GO.**

- Bug visible, doctrine "transparence > silence" — incohérence mainSet vs targetPace casse la confiance.
- Patch chirurgical, 1 service pure, 0 dépendance Firebase/Gemini, backward-compat OK.
- Idempotent par construction.

Risques résiduels (faibles) : faux-positif sur durée 3:00-3:59 si élite avec paces dans cette zone. Mitigation `\b` + `swap.has()` suffisante. YAGNI sur lookbehind `Repos|récup`.

## 10. Estimation

- Service + regex : **45 min**
- 20 tests : **1 h**
- Intégration App.tsx + cleanup : **20 min**
- Validation manuelle 3 plans réels (floggyz, lilian, mxjulien02) : **25 min**

**Total ~2 h 30.** Pas de touche UI ni storage.

---

Path : `/Users/romanemarino/Coach-Running-IA/audit-3prem-27mai-soir/F17-DEV-PLAN.md`
