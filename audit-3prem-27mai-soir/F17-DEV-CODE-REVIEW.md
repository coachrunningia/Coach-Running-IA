# F-17 — Code Review Dev Senior (audit chirurgical)

Auditeur : Dev senior 15 ans React/TS/regex/Firebase
Date : 2026-05-28 (soir)
Périmètre : service pur + tests + script admin (Robine + Lucas live ce soir)

---

## 1. Code review du service `paceRecalibrationService.ts`

### 1.1 Regex P1/P2/P3 — analyse

`paceRecalibrationService.ts:78-87`

**P1** `/\b(\d{1,2}):([0-5]\d)\s*(?:min\s*)?\/\s*km\b/g` — OK.
- `\b` côté gauche bloque `15:07` → `5:07` (test 9 valide).
- `\b` côté droit après `km` OK.
- Pas de backtracking pathologique : tout est borné (`\d{1,2}`, `\s*` non-imbriqué).

**P2** `/(?:^|[^A-Za-zÀ-ÿ])(à|allure\s*:?)\s+(\d{1,2}):([0-5]\d)\b(?!\s*[:.\/])/g` — RISQUE.
- **Bug latent ligne 84** : `[^A-Za-zÀ-ÿ]` consomme le caractère précédent (pas un lookbehind). Si deux paces se suivent dans le texte (ex. `"à 8:57 à 8:57"`), le premier match consomme l'espace avant le 2e `"à"` → 2e occurrence pas matchée par P2. **Heureusement P1/P3 ou ré-itération de `replace` global peut sauver**, mais risque faux-négatif réel sur des chaînes comme `" à 8:57 à 6:00"` selon le pas du moteur regex JS. À tester explicitement.
- Le lookahead négatif `(?!\s*[:.\/])` empêche `à 8:57:00` mais autorise `à 8:57,` `à 8:57.` (point fermé). OK.
- `allure\s*:?` matche `allure`, `allure:`, `allure :`. Mais pas `allure-cible 8:57`. OK pour scope actuel.

**P3** `/\((?:allure\s*:\s*)?(\d{1,2}):([0-5]\d)(?:\s+en\s+r[ée]f[ée]rence)?\s*(?:min\s*\/\s*km)?\s*[^)]*\)/g` — RISQUE moyen.
- `[^)]*` glouton jusqu'à `)` : si la parenthèse contient PLUSIEURS paces ex. `(8:57 à 10:00)`, **seule la 1re est remplacée** car le `match.replace(old, new)` ligne 108 remplace la 1re occurrence du `old` dans le match. Faux-négatif réel.
- `(?:min\s*\/\s*km)?` mais `\s*[^)]*` après = chevauchement potentiel avec P1 si parenthèse contient `(8:57 min/km)` — P1 matche en 1er pass, mais P3 ne re-matche pas une 2e fois sur du déjà remplacé (idempotence OK).

### 1.2 Tolérance ±1 sec — RISQUE COLLISION

`admin-recalibrate-paces.mjs:118-127` (la tolérance est dans le SCRIPT, pas dans le service prod).

**Bug détecté** : si `oldPaces.efPace=8:13` et `oldPaces.eaPace=8:14`, le swap pour efPace pose `8:13/8:14/8:12 → efNew`, puis swap pour eaPace pose `8:13/8:14/8:15 → eaNew`. Le `!swap.has(variant)` ligne 124 empêche l'écrasement → mais conséquence : **`8:14` reste mappé sur efNew (le 1er servi), pas sur eaNew (la vraie pace correspondante)**. Ordre dépendant de `TRAINING_KEYS`. Pour VMA Robine/Lucas l'écart entre zones est suffisant (≥10 s) pour qu'il n'y ait pas collision, mais le risque est réel pour profils intermédiaires où eaPace et efPace sont proches.

Recommandation : avant de mettre les variants ±1, vérifier qu'aucun variant ne tombe SUR une `oldVal` exacte d'une autre clé. Ou alors n'appliquer la tolérance que si pas de collision détectée.

### 1.3 Idempotence

- Service prod (`paceRecalibrationService.ts`) : OK strict. `swap.has(old)` garantit qu'un texte déjà recalibré (contenant déjà la `newVal`) ne sera pas re-touché si `newVal ∉ swap.keys`. Test 13 valide.
- **MAIS** : si on rappelle le service avec oldPaces=newPaces (cas identité), le swap contient `8:57 → 8:57` — pas de no-op explicite. Pas de bug fonctionnel, mais O(N) opérations inutiles.

### 1.4 Type safety — `as any` warmup/cooldown

`paceRecalibrationService.ts:152-159` : utilise `(session as any).warmup` alors que `types.ts:187,189` déclare ces champs **first-class non-optionnels** sur `Session`. Le cast `as any` est inutile et masque les futures évolutions du type. **À nettoyer** : remplacer par `session.warmup` typé.

### 1.5 Performance

Profil typique : 30 sem × 6 séances × 4 fields × 3 regex × ~3 matches/regex = ~6 480 `match.replace`. Texte mainSet ~200 chars. Coût total < 50 ms sur Node moderne. **Aucun souci**.

---

## 2. Code review `admin-recalibrate-paces.mjs`

### 2.1 Port de `calculateAllPaces` — divergence subtile

- Prod (`geminiService.ts:188-193`) : `Math.max(0, Math.round(seconds))` puis split via `normalizePace` qui gère le débordement `s>=60` → m+=1.
- Script (`admin-recalibrate-paces.mjs:58-64`) : `Math.floor(s/60)` + `Math.round(s%60)` + correction manuelle `if (sec>=60)`.

Cas litigieux : `seconds=59.9` → prod : `Math.round=60` → `mins = Math.floor(60/60)=1, secs = 60%60=0` → `1:00`. Script : `min=Math.floor(59.9/60)=0, sec=Math.round(59.9%60)=Math.round(59.9)=60` → correction `min=1, sec=0` → `1:00`. OK.

Cas `seconds=119.5` : prod `Math.round=120` → `2:00`. Script : `min=Math.floor(119.5/60)=1, sec=Math.round(119.5%60)=Math.round(59.5)=60` → correction `min=2, sec=0` → `2:00`. OK.

**Tolérance ±1 sec dans `buildPaceSwapMap` script** absorbe les éventuels off-by-one résiduels. Pragmatique mais cf. §1.2 collision.

### 2.2 `secondsToPaceLocal` vs `secondsToPace`

Le script déclare `secondsToPace` (ligne 58) ET `secondsToPaceLocal` (ligne 98). Deux fonctions quasi-identiques. **Code smell** : duplication. La 2e accepte `s<0` (renvoie null), la 1re renvoie `'0:00'`. Pas bloquant ; à dédupliquer.

### 2.3 Mask Firestore — OK

`admin-recalibrate-paces.mjs:279` : mask = `['generationContext', 'weeks', 'welcomeMessage', '_paceRecalibrationCount', '_lastRecalibratedAt']`. Préserve `userEmail`, dates, etc. **Correct**.

### 2.4 Gestion erreurs fetch

`admin-recalibrate-paces.mjs:53` : `JSON.parse(execSync(curl ...))`. **Aucun try/catch**, aucune validation `res.error`. Si Firestore renvoie 401/404/quota, `execSync` peut renvoyer du HTML ou un JSON d'erreur → `JSON.parse` crash ou `f.userEmail` undefined → mismatch jeté. Pas de retry, pas de log diagnostic. **Acceptable pour usage manuel one-shot, à durcir si automatisé.**

### 2.5 Backup avant écriture — OK

`admin-recalibrate-paces.mjs:220` : `before.json` écrit AVANT toute modification, en mode DRY ou EXEC. `proposed.json` écrit en DRY seulement. **Bon.** Backup dir = `audit-3prem-27mai-soir/backups-recalibrate-{user}-{ts}` — traceable.

### 2.6 Idempotence script (relance) — PROBLÈME

- `_paceRecalibrationCount` est **incrémenté à chaque exécution**, y compris DRY. Si Romane fait 3 DRY + 1 EXEC, compteur monte de 4 alors qu'un seul vrai patch a eu lieu. **Bug** : `admin-recalibrate-paces.mjs:271-272` doit être conditionné `if (!DRY_RUN)`.
- Wait, en réalité DRY n'écrit PAS dans Firestore (ligne 281-284 = dump proposed.json seulement). Donc l'incrément en mémoire ne persiste pas en DRY. **OK fonctionnellement**, mais le log ligne 274 affiche un compteur fantôme en DRY → confusion possible.
- Vraie idempotence relance EXEC : si on relance EXEC avec mêmes VMA, le script va re-swap les paces (`oldPaces` recalculé depuis `conf.oldVMA` qui n'a pas changé en config) → texte déjà patché ne contient plus les anciennes paces → `swap.has` false partout → `totalPatched=0`. **OK**.
- En revanche, `welcomeMessage` préfixe : protection ligne 262 vérifie `startsWith('📊 Tu as ajusté ta VMA')` → pas de double-injection. **OK**.

### 2.7 Détection `targetTime` — `:208`

`docPeek.fields?.generationContext?.mapValue?.fields?.questionnaireSnapshot?.mapValue?.fields?.targetTime?.stringValue`. **Fragile** si la structure Firestore diffère (ex. targetTime stocké en `mapValue` pour `subGoal=Finisher`). À cross-checker avec doc Robine/Lucas réelles avant EXEC.

---

## 3. Couverture tests — 17 tests existants, manques pour 95%

Présents (`paceRecalibrationService.test.ts`) : 1-17.

**Manquants critiques** :
- **NaN/Infinity dans paces** : `vmaPace='NaN:00'` ou `'Infinity'` (cas dégradé LLM) — non testé.
- **Pace `00:60` / `99:99`** : la regex `[0-5]\d` filtre, mais aucun test vérifie le no-op.
- **String vide / null mainSet** : test 12 utilise mainSet renfo non-vide. Cas `session.mainSet=''` → test 11 le couvre partiellement (mais `targetPace` undefined non testé).
- **Multi-paces dans 1 parenthèse** : `(8:57 à 10:00)` → bug §1.1-P3, à ajouter test régression.
- **Deux `à X:XX à Y:YY` consécutifs** : bug §1.1-P2, à ajouter.
- **Idempotence stricte byte-equal** : test 13 vérifie identité old=new ; manque `recalibrateSession(recalibrateSession(s, old, new), new, new) === step1`.
- **freezeRaceSpecificPaces avec targetPace=allureSpecifique10k** : test 17 couvre le texte, pas le `session.targetPace`. À ajouter : si targetPace='8:02' (allure 10K) et freeze=true → `targetPace` doit rester `'8:02'`.
- **Concurrence** : pure function, pas de risque concret. Coverage non requise.
- **Plan trail avec D+ modifier** : voir §4.

---

## 4. Robustesse multi-plans

### 4.1 Plan sans `targetPace`
Service `:137` : `if (session.targetPace)` garde. **OK no-op**.

### 4.2 Plan trail (D16 Cory Smith)
Le modificateur D+ patche `targetPace` à un format `mm:ss` valide (cf. mémoire D16). Le service swap par valeur stripée — donc si `targetPace='9:30'` (efPace patché +1:30 par Cory Smith) et `oldPaces.efPace='8:00'`, `swap.has('9:30')` = false → **no-op silencieux sur targetPace trail**. Concrètement : sur un plan trail recalibré, `targetPace` ne sera pas mis à jour si le modificateur D+ a été appliqué (l'allure stockée n'est plus une allure de référence). **Bug fonctionnel pour trail** mais hors scope MVP (Robine + Lucas ne sont pas trail). À documenter dans backlog G+1.

### 4.3 `isPreview: true` (plan en cours de génération)
Le script lit `weeks?.arrayValue?.values || []`. Si weeks vide, boucle vide, `totalPatched=0`. **OK no-op**. Mais : si une semaine est partiellement générée (sessions sans `mainSet`), `sf.mainSet?.stringValue` undefined → garde ligne 169 OK. **Robuste**.

### 4.4 Elite VMA > 22 km/h
Pace vma = 3600/22 = 163.6 s = 2:44. Tous mm:ss valides. **OK format**.

### 4.5 Beginner VMA < 8 km/h
recoveryPace = 3600/(8×0.60) = 750 s = 12:30. `\d{1,2}` autorise jusqu'à 99:59. **OK format**. Mais regex P2 `[0-5]\d` rejette `:60+` côté seconds, et `\d{1,2}` autorise 2 digits côté minutes — donc `12:30` matche bien. **OK**.

---

## 5. Verdict deploy GO / NO-GO

### Bugs bloquants — AUCUN pour Robine + Lucas
- VMA Robine 8.3→10.0, écarts inter-zones ≥15 s → pas de collision §1.2.
- VMA Lucas 10.9→13.4, idem.
- Plans non-trail → §4.2 non-applicable.
- Pas de `targetTime` litigieux suspecté (cf. §2.7 à confirmer lecture before.json).

### Bugs non bloquants Sprint G+1
1. **P2 consume-leading-char** (`paceRecalibrationService.ts:84`) → migrer vers lookbehind `(?<=^|[^A-Za-zÀ-ÿ])` pour préserver le séparateur. Test régression à ajouter.
2. **P3 single-replace-in-paren** (`paceRecalibrationService.ts:108`) → boucle sur `swap.entries()` ou regex per-pace au lieu de `match.replace(old, new)` une fois.
3. **Collision ±1 sec** (`admin-recalibrate-paces.mjs:122-127`) → vérifier non-écrasement croisé avant set.
4. **Cast `as any` warmup/cooldown** (`paceRecalibrationService.ts:152-159`) → retirer, types OK.
5. **Duplication `secondsToPace` / `secondsToPaceLocal`** (`admin-recalibrate-paces.mjs:58, 98`) → unifier.
6. **Trail D+ non couvert** (§4.2) → décision produit : doit-on swap targetPace trail ou non ?

### Tests à AJOUTER avant deploy (recommandé même ce soir)
- **Test régression P2 consécutifs** : `recalibrateText('à 8:57 à 8:57 min/km', swap)` doit donner deux `7:28`.
- **Test régression P3 multi-paces** : `recalibrateText('(8:57 à 10:00)', swap)` doit donner `'(7:28 à 8:20)'`.
- **Test freeze + targetPace=allure10K** (§3).

Si pas le temps ce soir : **OK pour exec live Robine + Lucas** (cas simples couverts par les 17 tests + DRY mode + before.json backup + mask Firestore). Les 3 bugs P2/P3/collision ont une probabilité quasi nulle sur ces 2 plans précis.

### Refacto nécessaire ?
**Non bloquant**. Le script duplique la logique du service en JS pur volontairement (zéro dépendance ESM Vite/TS dans un .mjs Node) — choix pragmatique pour ce soir. Refacto possible G+1 : extraire le service en `.cjs` ou compiler en `.js` pour partage.

---

## Conclusion — GO conditionnel

**GO pour Robine + Lucas ce soir** sous conditions :
- DRY run d'abord, lecture `proposed.json` pour vérifier (a) `totalPatched > 0`, (b) `welcomeMessage` non doublé, (c) `targetTime` détecté correctement (§2.7).
- Backup `before.json` archivé git ou cloud.
- En cas d'anomalie : restore depuis `before.json` via PATCH inverse avec même mask.

**NO-GO si** : un des 2 plans est trail (Cory Smith D+) → §4.2 risque.

Sprint G+1 : 5 fixes listés + 3 tests régression.
