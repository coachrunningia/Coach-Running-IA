# Expert Dev Review — F-11 (gemini-3.1-pro-preview + normalizeFlaggedWeeks)
Date : 2026-05-27
Reviewer : Expert TypeScript/Node 15+ ans, regard neuf
Patch : `src/services/planValidator.ts` (Modif 1 = MODEL_ID, Modif 2 = normalizer)
Tests : `src/services/__tests__/plan-validator-flagged-weeks.test.ts` (11 tests)

---

## VERDICT GLOBAL : **GO-CONDITIONNEL**

Le patch est **fonctionnellement correct** et **safe pour la prod**. Les 11 tests couvrent les chemins critiques. Le code aval (Layer 3) est intégralement protégé par la normalisation. Aucun call site externe à planValidator.ts ne touche `flaggedWeeks`.

**Conditions au GO** (non-bloquantes, mais à faire dans la foulée) :
1. Renforcer le typage : éviter `(review as any).flaggedWeeks` au profit d'un type narrow safe (cf. Q1).
2. Ajouter 2-3 tests de robustesse sur regex piégeux (cf. Q1).
3. Aligner le commit message ou ajouter une note : la décou-verte “Pro 3.1 strings” est validée par 1 appel E2E — c'est statistiquement faible mais le normalizer est défensif et idempotent donc rétro-compatible (cf. Q3, Q4).
4. Surveiller logs prod pendant 24h post-deploy pour confirmer le taux de strings.

Pas d'urgence à refacto en zod (cf. Q6), mais à mettre dans le backlog technique.

---

## Q1 — Le code TypeScript est-il correct ?

### Verdict : **OK avec 2 améliorations recommandées**

#### 1.1 Le cast `(review as any).flaggedWeeks` — **acceptable mais perfectible**

Le cast `as any` est nécessaire ici parce que `AIReviewResult.flaggedWeeks` est typé `number[]` et qu'on reçoit potentiellement `string[]`. Sans `as any`, TS refuserait de passer `string[]` à `normalizeFlaggedWeeks(raw: unknown)` — non, en fait c'est faux, `unknown` accepte tout. **Le cast `as any` est donc inutile.**

```ts
// AVANT (patch actuel) :
review.flaggedWeeks = normalizeFlaggedWeeks((review as any).flaggedWeeks);

// MIEUX (pas de any) :
review.flaggedWeeks = normalizeFlaggedWeeks(review.flaggedWeeks);
```

`unknown` étant le type le plus large possible, le compilateur TS accepte n'importe quel type d'argument sans cast. Pas grave fonctionnellement, mais c'est du dead-cast qui ajoute du bruit et désactive le type-checking en aval inutilement.

**Encore mieux** : typer le retour de `JSON.parse` en `unknown` plutôt qu'en `AIReviewResult` (cf. Q6), puis valider la structure. Mais c'est un autre sujet.

#### 1.2 Le filtre `Number.isInteger(n) && n > 0` — **complet**

Test mental des cas suspects :
- `1.5` (number direct) → `Number.isInteger(1.5)` = false → filtré ✓
- `Infinity`, `-Infinity` → `Number.isInteger(Infinity)` = false → filtré ✓
- `NaN` → `Number.isInteger(NaN)` = false → filtré ✓
- `2147483648` (> MAX_SAFE_INT non, mais > 2^31) → `Number.isInteger(2147483648)` = true ✓ — kept, mais `cw.weekNumber === 2147483648` ne matche jamais → no-op silencieux. Pas de crash.
- `Number.MAX_SAFE_INTEGER` → idem, no-op.
- `0`, `-1` → filtrés par `n > 0` ✓
- `"1.5"` via regex `\d+` → match `"1"` → parseInt → 1 ; **légère asymétrie** avec le cas number `1.5` (filtré) mais inoffensif (cas réaliste = LLM ne renvoie pas "1.5").

Filtre OK. Pas de hole exploitable en pratique.

#### 1.3 Le regex `\d+` peut-il matcher des cas indésirés ?

Oui, théoriquement :
- `"v1.2.3"` → match `"1"` → renvoie 1 (premier run de chiffres)
- `"test100"` → match `"100"` → renvoie 100
- `"abc12def34"` → match `"12"` → renvoie 12 (ignore 34)
- `"S 0"` → match `"0"` → filtré par `n > 0` ✓
- `"-3"` → match `"3"` → renvoie 3 (le `-` est ignoré ; on perd le signe négatif, mais ce n'est pas un cas LLM probable)
- `"2026-05-27"` (si LLM hallucine une date) → match `"2026"` → renvoie 2026 → kept silencieusement → no-op aval

**Risque réaliste : faible.** Le prompt demande des numéros de semaine, et même si Pro 3.1 hallucine quelque chose comme `"v1"`, le résultat (1) est plausible. Le seul danger serait `"2026-05-27"` ou `"plan500"` qui passerait → no-op aval. **Pas bloquant** mais on pourrait restreindre :

```ts
// Optionnel — plus strict :
const m = String(v).match(/^[^\d]*(\d{1,3})(?:\D|$)/);
```

Limite à 1-3 chiffres en début ou après non-digit, ce qui couvre S1/S52/Semaine 12/Week 5 sans laisser passer `2026`. **Recommandation : à faire mais pas bloquant.**

#### 1.4 Side effect de `.filter()` après `.map()`

Aucun. Les deux opérations sont pures sur arrays. `.map()` retourne un nouvel array, `.filter()` aussi. Pas de mutation. ✓

### Tests à ajouter pour Q1 :
1. `normalizeFlaggedWeeks([1.5, 2.7])` → `[]` (numbers non-entiers filtrés)
2. `normalizeFlaggedWeeks([Infinity, -Infinity])` → `[]`
3. `normalizeFlaggedWeeks(['v1.2.3'])` → `[1]` (documenter le comportement)
4. `normalizeFlaggedWeeks(['2026-05-27'])` → `[2026]` (documenter — no-op aval)

---

## Q2 — Risque de régression sur le code aval

### Verdict : **AUCUN RISQUE**

Recherche `grep -rn "flaggedWeeks\|aiReviewPlan" src/` confirme que `flaggedWeeks` est **exclusivement consommé dans planValidator.ts**. Aucune UI, aucun autre service.

Audit ligne par ligne, lignes 1138-1210 (`validateAndCorrectPlan`) :

| Ligne | Code | Type attendu | Post-normalize OK ? |
|---|---|---|---|
| 1162 | `const aiFlagged = aiReview.flaggedWeeks \|\| []` | `number[]` | ✓ — toujours array (jamais null/undefined post-normalize) |
| 1163 | `[...new Set([...errorWeeks, ...aiFlagged])]` | `number[]` | ✓ — Set dedup sur primitives number, semantically correct |
| 1166 | `allFlagged.length > 0 && allFlagged.length <= 5` | `number` | ✓ |
| 1173 | `aiFlagged[i] \|\| allFlagged[0]` | `number` | ✓ |
| 1180 | `generateCorrectedWeeks(plan, allFlagged, ...)` | param `flaggedWeeks: number[]` | ✓ |
| 1186 | `correctedWeeks.find((cw) => cw.weekNumber === w.weekNumber)` | strict equality number === number | ✓ — **C'EST LE BUG ORIGINAL** ; fix confirmé |

Et dans `generateCorrectedWeeks` (lignes 981-1112) :
- L.997 : `flaggedWeeks.includes(i.weekNumber)` — `Array.includes` strict equality sur numbers ✓
- L.1003 : `!flaggedWeeks.includes(w.weekNumber)` ✓
- L.1012 : `flaggedWeeks.map((wn) => ...)` ✓
- L.1035 : `flaggedWeeks.join(', ')` ✓ — string OK aussi mais peu importe, on a numbers

**Le `aiFlagged \|\| []` continue de marcher** : `normalizeFlaggedWeeks` retourne toujours un array (jamais undefined), donc le `\|\|` est défensif redondant — pas de risque.

### Point d'attention pré-existant (HORS scope F-11) :
Ligne 1172, `aiReview.suggestions.map(...)` accède directement à `.suggestions` sans normalize. Si Pro 3.1 retourne `suggestions: null` ou `suggestions: {a: "x"}` (object au lieu d'array), crash. À surveiller mais pas le sujet de cette review.

---

## Q3 — Le test E2E : 1 seul échantillon = généralisation hâtive ?

### Verdict : **OUI, généralisation hâtive — MAIS le patch est défensif donc safe**

#### 3.1 Le problème statistique

Un seul appel à `gemini-3.1-pro-preview` montrant `["S1", "S2"]` ne prouve pas que :
- Pro 3.1 retourne **systématiquement** des strings (ça pourrait être stochastique : 50% du temps strings, 50% numbers)
- Le format est **toujours `"SN"`** vs parfois `"Week N"`, `"Semaine N"`, `"1"`, etc.
- L'API ne va pas changer son comportement dans 2 semaines (preview = instable)

Les LLM sont **non-déterministes** sur la structure du JSON même avec `responseMimeType: 'application/json'`. Une seule observation = anecdote, pas une généralité.

#### 3.2 Pourquoi c'est OK quand même

Le normalizer est **conçu défensivement** :
- Si Pro 3.1 renvoie `[1, 2]` (numbers) → idempotent, passe through
- Si Pro 3.1 renvoie `["S1", "S2"]` → normalisé
- Si Pro 3.1 renvoie `["Semaine 1", "Week 2", 3]` (mix) → normalisé
- Si Pro 3.1 renvoie n'importe quoi → filtré, fallback array vide → couche L2 inactive mais L3 fonctionne via `errorWeeks` (Layer 1)

**Le normalizer est rétro-compatible et future-compatible.** Même si Pro 3.1 change demain pour renvoyer `[{week: 1}, {week: 2}]` (objects), on aurait juste un fallback `[]` sans crash.

#### 3.3 Recommandation

**Ajouter 3-5 tests E2E supplémentaires** (curl ou run du vrai code en sandbox) sur :
- Plan court (4 sem) avec 0 issue Layer 1 → voir si Pro flag vide ou non
- Plan moyen (8 sem) avec 1 issue manifeste → voir si Pro flag la semaine correcte
- Plan long (16 sem) avec issue subtile → voir si Pro raisonne
- Plan en anglais (si tu en as) → voir si Pro renvoie "Week N" plutôt que "S N"
- 1 plan déjà clean → vérifier que `flaggedWeeks: []` est bien retourné

Logger dans chaque cas le format brut de `flaggedWeeks` avant normalize, pour avoir un échantillon statistique.

**Pas bloquant pour le deploy** — mais à faire dans les 24-48h post-deploy avec monitoring actif.

---

## Q4 — Risque de fallout : le bug existait-il avec Pro 3.0 ?

### Verdict : **TRÈS PROBABLE — mais sans conséquence**

Investigation git history :
- Commit `62416ec` (Sprint 4) : migration Flash 2.0 → Pro 3 (gemini-3-pro)
- Commit `717b2d8` : Pro 3 → Pro 3.1 (le patch F-11 actuel, mais commit ne contient PAS le normalizer — modif 2 est uncommitted)
- `git log -p` montre que `JSON.parse(text) as AIReviewResult` puis usage direct de `review.flaggedWeeks` était la pratique depuis l'origine

**Conclusion technique :**

Le commit message du F-11 dit :
> "Pro 3 tombait silencieusement en fallback `{score:70}` depuis dépréciation Google → on perdait la couche L2 review sur 100 % des plans."

Ce qui implique que **avant la dépréciation**, Pro 3.0 fonctionnait et retournait des `flaggedWeeks`. Si Pro 3.0 retournait déjà des strings (très probable — c'est un comportement commun aux modèles Gemini-3 quand le prompt dit "numéros des semaines"), alors :

1. **Le bug `cw.weekNumber === w.weekNumber` (number vs string) existait déjà avec Pro 3.0** → Layer 3 ne matchait pas → on régénérait 0 semaine → no-op silencieux.
2. **Personne ne l'a vu** parce que le fallback était toujours `correctedPlan` = plan original (via le branchement `if (correctedWeeks.length > 0)` ligne 1182).
3. **Le commit message attribue F-11 à Pro 3.1**, ce qui est **historiquement incomplet** — c'est plus probablement un bug Pro 3.0 latent qu'on découvre maintenant en testant Pro 3.1.

**Conséquences :**
- Le normalizer est **rétroactivement utile** : il aurait corrigé un bug Pro 3.0 silencieux depuis Sprint 4.
- **Aucun risque de fallout** sur les plans déjà générés : ils ont été produits SANS Layer 3 correction (parce que jamais matché), donc rien à régénérer.
- Le commit message gagne à être corrigé : "bug latent Pro 3 strings flaggedWeeks, exposé par migration Pro 3.1" plutôt que "bug Pro 3.1".

**Action recommandée** : amender le commit message pour ne pas créer de faux historique. Pas bloquant.

**Pour investigation rigoureuse** : si tu as des logs prod du `console.log [PlanValidator] AI Review: score=X, flagged=Y`, vérifier si `Y` contient des strings (ex: `flagged=S1,S2`) sur les plans antérieurs au 27/05. Si oui → confirmation que c'est bien Pro 3.0 qui le faisait déjà. Le `.join(',')` ligne 963 marche sur strings comme sur numbers donc les logs sont parlants.

---

## Q5 — Idempotence et sécurité

### Verdict : **IDEMPOTENT ✓ — petit trou sur Symbol**

#### 5.1 Idempotence

`normalizeFlaggedWeeks(normalizeFlaggedWeeks(x))` = `normalizeFlaggedWeeks(x)` pour tout `x`.

Preuve par cas :
- `x = [1, 2, 3]` → premier appel → `[1, 2, 3]` → second appel → `[1, 2, 3]` ✓
- `x = ["S1", "S2"]` → premier appel → `[1, 2]` → second appel → `[1, 2]` ✓
- `x = null` → premier appel → `[]` → second appel → `[]` ✓
- `x = ["abc"]` → premier appel → `[]` → second appel → `[]` ✓

**Strictement déterministe sur tout input pur.** Le test #2 du fichier de tests valide explicitement l'idempotence sur `[1, 2, 3]`. ✓

#### 5.2 Sécurité sur inputs exotiques

`typeof v === 'number'` est strict, pas de coercion. Pour les non-numbers, on passe par `String(v)`. Problèmes potentiels :

| Input | `String(input)` | Risque |
|---|---|---|
| `Symbol("x")` | **TypeError thrown** | ⚠️ Crash dans `.map()` |
| `Promise.resolve(1)` | `"[object Promise]"` → no match | NaN → filtré ✓ |
| Proxy `{get: () => 1}` | trap `.toString` → dépend | imprévisible mais filtré si pas de digits |
| BigInt `1n` | `"1"` → match `"1"` → 1 | ✓ (mais pas un cas réel JSON) |
| Date object | `"Wed May 27 2026..."` → match `"27"` ou pareil | renvoie un number "weekNumber" 27 ≠ vrai weekNumber → no-op aval |

**Le seul vrai trou : Symbol.** En pratique, `JSON.parse` ne produit JAMAIS de Symbol (les Symbols ne sont pas serialisables JSON), donc ce trou est purement théorique. **Pas bloquant.**

**Pour être 100% safe** :
```ts
.map((v): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'symbol') return NaN; // protection
  const m = String(v).match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
})
```

**Test à ajouter** :
```ts
it('12. Inputs exotiques (Symbol) → filtrés sans crash', () => {
  expect(() => normalizeFlaggedWeeks([Symbol('x'), 1])).not.toThrow();
});
```

---

## Q6 — Le `as AIReviewResult` cast sans validation

### Verdict : **Risque réel mais pré-existant — pas du scope F-11**

Le cast `JSON.parse(cleanedText.trim()) as AIReviewResult` est un **type assertion**, pas une **type assertion runtime**. TS croit aveuglément à la structure ; à runtime, si Pro 3.1 retourne `{rating: 80, weeks_flagged: [1]}` (clés différentes), on aurait :

- `review.overallScore` → `undefined` → loggé `undefined` (pas crash)
- `review.flaggedWeeks` → `undefined` → normalize → `[]` → safe ✓ (le normalizer protège !)
- `review.suggestions` → `undefined` → ligne 1172 `aiReview.suggestions.map(...)` → **CRASH** `TypeError: Cannot read properties of undefined`

**Le normalizer F-11 protège partiellement** mais le risque reste sur `suggestions`, `criteria`, `overallScore`. Et ce risque pré-existait avant F-11.

### Recommandations :

#### Option A : minimal (recommandée pour ce deploy)

Ajouter 2 garde-fous défensifs ligne 958-962, dans la même PR si possible :

```ts
const raw = JSON.parse(cleanedText.trim()) as Partial<AIReviewResult>;
const review: AIReviewResult = {
  overallScore: typeof raw.overallScore === 'number' ? raw.overallScore : 70,
  criteria: raw.criteria ?? { progression: 7, injuryRisk: 7, difficulty: 7, variety: 7, specificity: 7 },
  flaggedWeeks: normalizeFlaggedWeeks(raw.flaggedWeeks),
  suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.filter((s): s is string => typeof s === 'string') : [],
};
```

Coût : 8 lignes, 0 dépendance. Couvre 95% des cas pathologiques.

#### Option B : zod (à mettre en backlog)

Importer zod et définir un `AIReviewResultSchema` avec `.safeParse()`. Plus propre, plus testable, mais ajoute une dépendance. À faire dans un sprint qualité dédié, pas dans ce hotfix.

### Verdict Q6 : **non bloquant pour F-11** (le normalizer protège `flaggedWeeks`), **mais Option A fortement conseillée** dans la même PR si bande passante. Sinon, ticket de suivi.

---

## SYNTHÈSE — Tests à ajouter avant deploy

### Bloquants : **AUCUN**

### Recommandés (à faire dans la PR ou ticket de suivi immédiat) :

1. **Tests unitaires `plan-validator-flagged-weeks.test.ts`** :
   - `[1.5, 2.7]` → `[]` (non-entiers)
   - `[Infinity, -Infinity]` → `[]`
   - `[Symbol('x'), 1]` → ne throw pas (sécu inputs exotiques)
   - `['2026-05-27']` → `[2026]` (documenter le comportement regex)

2. **Tests E2E supplémentaires** (Q3) : 3-5 appels Pro 3.1 sur plans diversifiés (4/8/16 sem) pour confirmer que le format `"SN"` est systématique vs stochastique. Logger le format brut.

3. **Monitoring 24h post-deploy** : surveiller logs `[PlanValidator] AI Review: score=X, flagged=Y` pour vérifier que `Y` est bien des numbers normalisés et que Layer 3 corrige effectivement quelque chose.

---

## SYNTHÈSE — Refacto recommandée

### Dans cette PR (5 min de boulot) :
- **Retirer le `(review as any)` cast** ligne 961 → utiliser `review.flaggedWeeks` directement (le type `unknown` du paramètre accepte tout).
- **Si possible** : Option A de Q6 (validation minimale des autres champs).

### À mettre en backlog (pas urgent) :
- Schéma zod pour `AIReviewResult` (Q6 Option B).
- Restreindre le regex `\d+` pour rejeter les nombres > 99 (Q1.3).
- Patch `typeof v === 'symbol' → NaN` (Q5.2).
- Amender le commit message F-11 pour refléter la possibilité que le bug existait avec Pro 3.0 (Q4).

---

## RECOMMANDATION FINALE

### **GO-CONDITIONNEL — Deploy autorisé après ces 2 actions rapides :**

1. **Retirer le cast `as any` inutile** ligne 961 (1 min de boulot, code plus propre).
2. **Logger temporairement le format brut** de `flaggedWeeks` AVANT normalize, sur 24h post-deploy, pour valider statistiquement que Pro 3.1 retourne bien systématiquement des strings et que le patch s'active. Exemple :

```ts
console.log('[PlanValidator F-11] flaggedWeeks raw=', JSON.stringify((review as any).flaggedWeeks));
review.flaggedWeeks = normalizeFlaggedWeeks(review.flaggedWeeks);
```

Ce log est temporaire, à retirer après 7 jours quand on aura assez de données.

3. **Bonus optionnel** : appliquer Option A de Q6 pour blinder aussi `suggestions`, `criteria`, `overallScore` contre les changements schema futurs de Pro 3.1.

Le patch est techniquement solide. Il corrige rétroactivement un bug latent qui dormait probablement depuis le Sprint 4. Le risque de régression est nul (production scope contenue à planValidator.ts, normalizer idempotent et défensif). Les 11 tests sont pertinents et couvrent les cas observés en E2E + edge cases raisonnables.

Le seul vrai reproche : **la généralisation à partir d'1 seul appel E2E est faible** d'un point de vue méthodologique. Mais comme le normalizer est défensif (idempotent sur input clean, fallback safe sur input dirty), ce manque rigueur statistique n'a aucun impact pratique. Le code est plus robuste APRÈS le patch qu'avant, quel que soit le format réel de Pro 3.1.

**GO sous condition d'observabilité post-deploy.**
