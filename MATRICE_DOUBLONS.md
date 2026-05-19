J'ai maintenant assez de matériel. Construisons la matrice complète AVANT/APRÈS.

# MATRICE AVANT/APRÈS — 7 DOUBLONS Coach Running IA

Périmètre : 4 fichiers (`geminiService.ts` 5683 L, `planValidator.ts` 1065 L, `feasibilityService.ts` 1164 L, `planUtils.ts` 149 L orphelin).
Économie globale visée : ~505-700 lignes (sans toucher au comportement métier).

---

# DOUBLON D1 — `parseDurationMin` × 3 versions

## AVANT (état actuel)

### Version V1 — `geminiService.ts:1945-1954`
```ts
const parseDurationMin = (d: any): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};
```
**Call sites V1** dans `geminiService.ts` (24 occurrences) : L694, L800, L803, L804, L820, L830, L847, L856, L1271, L1333, L1348, L1376, L1405, L1434, L1435, L1461, L1498, L1555, L1581, L1604, L1695, L1732, L1733, L1738, L1825, L1871, L1936, L2132, L2197.
**Pourquoi V1 existe** : fonction canonique la plus tolérante (gère "1h30", "1h", "45 min", "120", "120 minutes" → minutes).

### Version V2 — `geminiService.ts:938-944` (appelée `parseDurMin`)
```ts
const parseDurMin = (durStr: string | undefined): number => {
  if (!durStr) return 0;
  const m = String(durStr).match(/(\d+)h\s*(\d+)?|(\d+)\s*min/);
  if (!m) return 0;
  if (m[1]) return parseInt(m[1]) * 60 + parseInt(m[2] || '0');
  return parseInt(m[3]);
};
```
**Call sites V2** : `geminiService.ts:L974` uniquement (1 occurrence — tri secondaire dans `enforceSLDay`).
**Pourquoi V2 existe** : créée localement le 2026-05-16 dans le patch de dédup SL (cf. comment L952-954), l'auteur n'avait pas vu V1 plus bas.
**Bug latent** : `parseInt(m[3])` renvoie `NaN` quand l'input est "120" sans suffixe ("h" ou "min") car `m` est `null` → return 0 OK. Mais "1h" sans minutes : `m[1]="1"`, `m[2]=undefined` → `parseInt('1')*60 + parseInt('0') = 60` OK. Différence réelle vs V1 : V2 ne gère PAS le nombre seul ("90" → 0 alors que V1 → 90). C'est un sous-ensemble strict.

### Version V3 — `planValidator.ts:76-85` (appelée `parseDurationMinValidator`)
```ts
const parseDurationMinValidator = (d: any): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};
```
**Call sites V3** : `planValidator.ts:L188, L699, L719` (3 occurrences).
**Pourquoi V3 existe** : clone byte-à-byte de V1, renommé pour éviter un collision name si jamais import. Pure duplication évitable.

### Version V4 (orpheline) — `planUtils.ts:7-16`
```ts
export const parseDurationMin = (d: any): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};
```
**Call sites V4** : aucun. Fichier confirmé orphelin (`grep planUtils` retourne 0 import).
**Pourquoi V4 existe** : `planUtils.ts` a été créé "pour être testable unitairement" (cf. JSDoc L1-4) mais l'auteur n'a jamais migré les call sites.

## APRÈS (état proposé)

### Nouvelle architecture
Créer `src/services/utils/parsers.ts` (ou réutiliser `planUtils.ts` en le renommant) :
```ts
// src/services/utils/parsers.ts
/** Parse une durée en minutes ("1h30" → 90, "45 min" → 45, "120" → 120, "" → 0) */
export const parseDurationMin = (d: unknown): number => {
  if (!d) return 0;
  const s = d.toString().toLowerCase();
  const hMatch = s.match(/(\d+)\s*h\s*(\d*)/);
  if (hMatch) return parseInt(hMatch[1]) * 60 + (hMatch[2] ? parseInt(hMatch[2]) : 0);
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]);
  const num = parseInt(s);
  return num > 0 ? num : 0;
};
```

### Migration des call sites
- `geminiService.ts:L938-944` : supprimer la définition de `parseDurMin`. Remplacer l'unique appel L974 (`parseDurMin(b.duration)` / `parseDurMin(a.duration)`) par `parseDurationMin(...)` (déjà importé).
- `geminiService.ts:L1945-1954` : supprimer la définition locale, ajouter `import { parseDurationMin } from './utils/parsers';` en tête de fichier. Tous les autres call sites (L694, L800, ...) ne changent pas (même nom).
- `planValidator.ts:L76-85` : supprimer `parseDurationMinValidator`. Remplacer les 3 appels (L188, L699, L719) par `parseDurationMin`. Ajouter import.
- `planUtils.ts` : option A) supprimer le fichier. Option B) y déplacer la fonction et faire pointer le nouvel import vers `planUtils.ts` au lieu de créer `utils/parsers.ts`. **Recommandation : B** (moins de fichiers, le commentaire JSDoc "fonctions critiques testables unitairement" est exact, on capitalise).

### Code supprimé (preuve qu'il est mort)
- `geminiService.ts:938-944` : `parseDurMin` (7 L) — un seul call site, sous-ensemble strict de V1.
- `geminiService.ts:1945-1954` : `parseDurationMin` local (10 L) — remplacé par import.
- `planValidator.ts:76-85` : `parseDurationMinValidator` (10 L) — clone exact de V1.

Économie : ~27 lignes.

## JUSTIFICATION LIGNE PAR LIGNE

| Ligne | Code AVANT | Code APRÈS | Raison |
|---|---|---|---|
| `geminiService.ts:938-944` | `const parseDurMin = ...` | (supprimée + appel L974 utilise `parseDurationMin`) | Sous-ensemble buggé de V1, créé par inadvertance (l'auteur n'avait pas vu V1 à L1945 dans le même fichier) |
| `geminiService.ts:1945-1954` | `const parseDurationMin = ...` | `import { parseDurationMin } from './utils/parsers'` (1L) | Canonique, à publier comme source unique |
| `planValidator.ts:76-85` | `const parseDurationMinValidator = ...` | `import { parseDurationMin } from './utils/parsers'` (1L) | Clone byte-à-byte de V1 |
| `planValidator.ts:188, 699, 719` | `parseDurationMinValidator(s.duration)` | `parseDurationMin(s.duration)` | Rename simple |
| `geminiService.ts:974` | `parseDurMin(b.duration) - parseDurMin(a.duration)` | `parseDurationMin(b.duration) - parseDurationMin(a.duration)` | Rename + fix bug latent sur "90" (sans suffixe) |
| `planUtils.ts:7-16` | `export const parseDurationMin` | (conserver, devient source canonique) | Déjà export, déjà testable |

## COUVERTURE DES CAS

| Input | V1 | V2 (parseDurMin) | V3 (validator) | V4 (planUtils) | Décision |
|---|---|---|---|---|---|
| `"1h30"` | 90 | 90 | 90 | 90 | conservé |
| `"1h"` | 60 | 60 | 60 | 60 | conservé |
| `"45 min"` | 45 | 45 | 45 | 45 | conservé |
| `"45min"` | 45 | 45 | 45 | 45 | conservé |
| `"120"` | 120 | **0** ❌ | 120 | 120 | **fix bug V2** |
| `"120 minutes"` | 120 | 120 | 120 | 120 | conservé |
| `""` / `undefined` | 0 | 0 | 0 | 0 | conservé |
| `"2h05"` | 125 | 125 | 125 | 125 | conservé |
| `"abc"` | 0 | 0 | 0 | 0 | conservé |
| `null` | 0 | 0 | 0 | 0 | conservé |

Conclusion : V1 (= V3 = V4) couvre tous les cas. V2 a un bug latent silencieux. **Aucune régression possible**.

## TESTS À ÉCRIRE AVANT
`utils/parsers.test.ts` (10 cas ci-dessus + edge cases : nombres négatifs, virgule décimale, h sans nombre).

## RISQUES IDENTIFIÉS
- **Risque tech** : nul si V1 reprise. Le seul comportement modifié est l'appel L974 qui passe de "buggé sur '90' isolé" à "correct". Or aucune session n'a `duration: "90"` (toujours suffixé "min" ou "h") → pas d'impact runtime.
- **Risque pédagogique** : nul, parseur pur.
- **Mitigation** : tests unitaires + grep `parseDurMin\|parseDurationMinValidator` doit retourner 0 après migration.

## QUESTIONS POUR LES CHALLENGERS
- Au coach : aucun impact, c'est un parseur.
- Au dev 30 ans : "OK pour `planUtils.ts` comme bibliothèque utilitaire canonique plutôt que créer `utils/parsers.ts` ?"
- Au PM : "Connais-tu un format de durée inhabituel qu'on aurait vu en prod (ex: '1:30' pour 1h30) qui ne passerait dans aucune version ?"

---

# DOUBLON D2 — `parseKm` × 3 versions

## AVANT

### Version V1 — `geminiService.ts:898-903`
```ts
const parseKm = (d: unknown): number => {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};
```
**Call sites V1** : 30 occurrences dans `geminiService.ts` (L624, L1288, L1321, L1352, L1377, L1381, L1393, L1402, L1443, L1457, L1546, L1552, L1568, L1578, L1596, L1631, L1639, L1640, L1651, L1663, L1686, L1691, L1794, L1795, L1822, L1830 (×2), L1856, L1867, L1932, L4722).
**Pourquoi V1** : parseur générique, accepte "12.5 km", "12,5 km", "12.5", "12.5km".

### Version V2 — `geminiService.ts:930-935` (appelée `parseDistKm`)
```ts
const parseDistKm = (distStr: string | undefined): number => {
  if (!distStr) return 0;
  const m = String(distStr).match(/(\d+(?:\.\d+)?)\s*km/i);
  return m ? parseFloat(m[1]) : 0;
};
```
**Call sites V2** : `geminiService.ts:L971, L972` (2 occurrences dans `enforceSLDay`).
**Pourquoi V2** : créée le 2026-05-16 dans le patch de dédup SL (même cause que `parseDurMin`).
**Différence comportementale** : V2 EXIGE le suffixe "km" → "12.5" seul → 0. V1 → 12.5. Pour l'usage dans `enforceSLDay`, V1 ferait pareil ou mieux.

### Version V3 — `planValidator.ts:49-53` (appelée `parseDistance`)
```ts
const parseDistance = (dist?: string): number => {
  if (!dist) return 0;
  const n = parseFloat(dist.replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
```
**Call sites V3** : `planValidator.ts:L58, L219, L449, L640` (4 occurrences).
**Pourquoi V3** : clone quasi-exact de V1 ; seule différence : `isNaN(n) ? 0 : n` au lieu de `isFinite(n) && n > 0 ? n : 0`. V1 est strictement plus sûre (rejette `Infinity` et valeurs ≤ 0).

## APRÈS

### Nouvelle architecture
Ajouter dans `planUtils.ts` (à côté de `parseDurationMin`) :
```ts
/** Parse "12.5 km" / "12,5 km" / "12.5" / "12.5km" → 12.5 (0 si invalide ou ≤ 0) */
export const parseKm = (d: unknown): number => {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};
```

### Migration
- `geminiService.ts:L898-903` : supprimer V1 + import depuis `planUtils.ts`. Tous call sites inchangés.
- `geminiService.ts:L930-935` : supprimer `parseDistKm`. Remplacer L971, L972 par `parseKm`.
- `planValidator.ts:L49-53` : supprimer `parseDistance`. Remplacer L58, L219, L449, L640 par `parseKm`. Import.

### Code supprimé
- `geminiService.ts:898-903` : `parseKm` local (6 L)
- `geminiService.ts:930-935` : `parseDistKm` (6 L)
- `planValidator.ts:49-53` : `parseDistance` (5 L)

Économie : ~14 lignes.

## COUVERTURE DES CAS

| Input | V1 parseKm | V2 parseDistKm | V3 parseDistance | Décision |
|---|---|---|---|---|
| `"12.5 km"` | 12.5 | 12.5 | 12.5 | conservé |
| `"12,5 km"` | 12.5 | **0** ❌ | 12.5 | V1 sup à V2 |
| `"12.5"` | 12.5 | **0** ❌ | 12.5 | V1 sup à V2 |
| `"8km"` | 8 | 8 | 8 | conservé |
| `""` | 0 | 0 | 0 | conservé |
| `"abc"` | 0 | 0 | 0 | conservé |
| `"-5 km"` | 0 (≤0) | 5 (!) | 5 (!) | V1 plus safe |
| `"0 km"` | 0 | 0 | 0 | conservé |

V1 est strictement supérieure : couvre virgule, tolère absence de "km", rejette négatifs.

## TESTS À ÉCRIRE
`utils/parsers.test.ts` : 8 cas distance.

## RISQUES
- Risque tech : très faible. La substitution `parseDistance → parseKm` change le comportement sur "-5 km" (passe de 5 à 0). En pratique, aucune distance négative ne devrait exister → impact = strict resserrement de la validation (côté planValidator, ça veut dire qu'une distance "-5km" était traitée comme 5km dans `getWeekVolume`, ce qui est probablement un bug latent).
- Risque pédagogique : nul.
- Mitigation : tests + grep zéro résultat post-migration.

## QUESTIONS CHALLENGERS
- Au dev 30 ans : "Le strict `> 0` vs `!isNaN` change la sémantique pour les distances négatives. C'est plutôt un fix qu'un risque, non ?"
- Au PM : "A-t-on déjà vu Gemini produire `distance: \"-5 km\"` ? Sinon, RAS."

---

# DOUBLON D3 — Recalcul VMA × 2 (Preview + Adapt)

## AVANT

### Version V1 — `geminiService.ts:3127-3183` (dans `generatePreviewPlan`)
~57 lignes : calcul VMA (chronos > déclaratif), fallback par niveau, correction -15% Remise/Maintien, cross-check vs targetTime, `applyTargetTimeOverride`.
```ts
let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
let paces: TrainingPaces;
let vmaSource: string;

if (vmaEstimate) {
  paces = calculateAllPaces(vmaEstimate.vma);
  vmaSource = vmaEstimate.source;
} else {
  let defaultVma: number;
  switch (data.level) {
    case 'Débutant (0-1 an)': defaultVma = 11.0; break;
    case 'Intermédiaire (Régulier)': defaultVma = 13.5; break;
    case 'Confirmé (Compétition)': defaultVma = 15.5; break;
    case 'Expert (Performance)': defaultVma = 17.5; break;
    default: defaultVma = 12.5;
  }
  paces = calculateAllPaces(defaultVma);
  vmaSource = `Estimation niveau ${data.level}`;
  vmaEstimate = { vma: defaultVma, source: vmaSource };
}

// Correction VMA pour Remise en forme / Maintien : -15%
const goalForVma = (data.goal || '').toLowerCase();
if (goalForVma.includes('maintien') || goalForVma.includes('remise')) {
  const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
  console.log(`[VMA] Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} → ${reducedVma.toFixed(1)} (-15%)`);
  vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajustée -15% remise en forme)` };
  paces = calculateAllPaces(reducedVma);
  vmaSource = vmaEstimate.source;
}

// Cross-check VMA vs targetTime
const hasRealChrono = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
if (data.targetTime && data.subGoal && vmaEstimate && !hasRealChrono) {
  const raceDistances: Record<string, number> = { '5 km': 5, '10 km': 10, 'Semi-Marathon': 21.1, 'Marathon': 42.195 };
  const raceDist = raceDistances[data.subGoal];
  if (raceDist) {
    const targetSeconds = timeToSeconds(data.targetTime, raceDist);
    if (targetSeconds > 0) {
      const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
      if (vmaEstimate.vma > targetVma * 1.15) {
        console.warn(`[VMA] VMA estimée (${vmaEstimate.vma.toFixed(1)}) incohérente avec targetTime ${data.targetTime} pour ${data.subGoal} (VMA implicite: ${targetVma.toFixed(1)}). Recalcul.`);
        const correctedVma = targetVma * 1.05;
        paces = calculateAllPaces(correctedVma);
        vmaSource = `Recalculée depuis objectif ${data.subGoal} en ${data.targetTime}`;
        vmaEstimate = { vma: correctedVma, source: vmaSource };
      }
    }
  }
}

applyTargetTimeOverride(paces, data, vmaEstimate.vma);
```

### Version V2 — `geminiService.ts:5162-5214` (dans `adaptPlanFromFeedback`)
~53 lignes : strictement identiques logique-pour-logique. Différences cosmétiques :
- `data` → `questionnaireData`
- log tag `[VMA]` → `[VMA Batch]`
- Source identique

C'est un copier-coller pur (probablement réalisé un jour où `adaptPlanFromFeedback` a été ajoutée comme nouvelle entrypoint sans factoriser).

## APRÈS

### Nouvelle architecture
Extraire dans `geminiService.ts` (PAS dans utils pour éviter cycles d'imports — la fonction dépend de `getBestVMAEstimate`, `calculateAllPaces`, `timeToSeconds`, `calculateVMAFromTime`, `applyTargetTimeOverride` qui sont locaux au fichier) :

```ts
// geminiService.ts (à insérer après calculateAllPaces, vers L200)
interface ComputedPaces {
  paces: TrainingPaces;
  vmaEstimate: { vma: number; source: string };
  vmaSource: string;
}

const computePacesAndVMA = (data: QuestionnaireData, logTag: string): ComputedPaces => {
  let vmaEstimate = getBestVMAEstimate(data.recentRaceTimes);
  let paces: TrainingPaces;
  let vmaSource: string;

  if (vmaEstimate) {
    paces = calculateAllPaces(vmaEstimate.vma);
    vmaSource = vmaEstimate.source;
  } else {
    let defaultVma: number;
    switch (data.level) {
      case 'Débutant (0-1 an)': defaultVma = 11.0; break;
      case 'Intermédiaire (Régulier)': defaultVma = 13.5; break;
      case 'Confirmé (Compétition)': defaultVma = 15.5; break;
      case 'Expert (Performance)': defaultVma = 17.5; break;
      default: defaultVma = 12.5;
    }
    paces = calculateAllPaces(defaultVma);
    vmaSource = `Estimation niveau ${data.level}`;
    vmaEstimate = { vma: defaultVma, source: vmaSource };
  }

  const goalForVma = (data.goal || '').toLowerCase();
  if (goalForVma.includes('maintien') || goalForVma.includes('remise')) {
    const reducedVma = Math.round(vmaEstimate.vma * 0.85 * 10) / 10;
    console.log(`${logTag} Remise en forme: VMA ${vmaEstimate.vma.toFixed(1)} → ${reducedVma.toFixed(1)} (-15%)`);
    vmaEstimate = { vma: reducedVma, source: `${vmaEstimate.source} (ajustée -15% remise en forme)` };
    paces = calculateAllPaces(reducedVma);
    vmaSource = vmaEstimate.source;
  }

  const hasRealChrono = !!(data.recentRaceTimes?.distance5km || data.recentRaceTimes?.distance10km || data.recentRaceTimes?.distanceHalfMarathon || data.recentRaceTimes?.distanceMarathon);
  if (data.targetTime && data.subGoal && vmaEstimate && !hasRealChrono) {
    const raceDistances: Record<string, number> = { '5 km': 5, '10 km': 10, 'Semi-Marathon': 21.1, 'Marathon': 42.195 };
    const raceDist = raceDistances[data.subGoal];
    if (raceDist) {
      const targetSeconds = timeToSeconds(data.targetTime, raceDist);
      if (targetSeconds > 0) {
        const targetVma = calculateVMAFromTime(raceDist, targetSeconds);
        if (vmaEstimate.vma > targetVma * 1.15) {
          console.warn(`${logTag} VMA (${vmaEstimate.vma.toFixed(1)}) incohérente avec targetTime ${data.targetTime} pour ${data.subGoal} (impl: ${targetVma.toFixed(1)}). Recalcul.`);
          const correctedVma = targetVma * 1.05;
          paces = calculateAllPaces(correctedVma);
          vmaSource = `Recalculée depuis objectif ${data.subGoal} en ${data.targetTime}`;
          vmaEstimate = { vma: correctedVma, source: vmaSource };
        }
      }
    }
  }

  applyTargetTimeOverride(paces, data, vmaEstimate.vma);
  return { paces, vmaEstimate, vmaSource };
};
```

### Migration
- `geminiService.ts:3127-3183` (Preview) : remplacer le bloc par
  ```ts
  const { paces, vmaEstimate, vmaSource } = computePacesAndVMA(data, '[VMA]');
  ```
  (3 variables `let` → `const` du destructuring).
- `geminiService.ts:5162-5214` (Adapt) : idem avec
  ```ts
  const { paces, vmaEstimate, vmaSource } = computePacesAndVMA(questionnaireData, '[VMA Batch]');
  ```

### Code supprimé
- `geminiService.ts:3128-3183` : 56 L → 1 L
- `geminiService.ts:5163-5214` : 52 L → 1 L
- `geminiService.ts:~210` : ajout de `computePacesAndVMA` (~50 L)

Économie nette : ~57 lignes (108 supprimées – 51 ajoutées).

## JUSTIFICATION LIGNE PAR LIGNE

| Lignes AVANT | Action | Raison |
|---|---|---|
| 3128-3147 | factorisé | bloc init VMA (fallback niveau) IDENTIQUE à 5163-5182 |
| 3149-3157 | factorisé | bloc -15% remise/maintien IDENTIQUE à 5184-5192 |
| 3159-3180 | factorisé | cross-check targetTime IDENTIQUE à 5194-5211 |
| 3183 | factorisé | `applyTargetTimeOverride` IDENTIQUE à 5214 |
| Log tag `[VMA]` | conservé via param `logTag` | seule différence cosmétique |

## COUVERTURE DES CAS

| Cas | V1 (Preview) | V2 (Adapt) | computePacesAndVMA |
|---|---|---|---|
| Chronos saisis → getBestVMAEstimate | VMA chronos | VMA chronos | VMA chronos |
| Pas de chronos, niveau Débutant | 11.0 | 11.0 | 11.0 |
| Pas de chronos, niveau Expert | 17.5 | 17.5 | 17.5 |
| Pas de chronos, niveau autre/null | 12.5 | 12.5 | 12.5 |
| Remise en forme | VMA × 0.85 | VMA × 0.85 | VMA × 0.85 |
| Maintien | VMA × 0.85 | VMA × 0.85 | VMA × 0.85 |
| targetTime cohérent | inchangé | inchangé | inchangé |
| targetTime > 15% trop ambitieux + chronos | inchangé (skip car hasRealChrono) | inchangé | inchangé |
| targetTime > 15% trop ambitieux + pas de chronos | recalcul × 1.05 | recalcul × 1.05 | recalcul × 1.05 |

V1 et V2 sont strictement équivalentes (vérifié ligne à ligne) → factorisation sans perte.

## TESTS À ÉCRIRE
`computePacesAndVMA.test.ts` (12 cas) :
1. Chronos 10K 40min → VMA chrono
2. Pas de chronos, déclaré Débutant → 11.0
3. Pas de chronos, niveau inconnu → 12.5
4. goal "Remise en forme" + VMA 14 → 11.9
5. goal "Maintien" + VMA 12 → 10.2
6. targetTime 5K 17:00 + niveau Débutant déclaré → recalcul VMA
7. targetTime cohérent → pas de recalcul
8. Chronos + targetTime incohérent → pas de recalcul (chronos priment)
9. data null/undefined → fallback 12.5
10-12. Combinaisons remise + targetTime + chronos

## RISQUES IDENTIFIÉS
- **Risque tech** : copy/paste = comportement identique garanti. Le seul piège est la mutation de `data` (l'appelant passe une référence). Or `computePacesAndVMA` ne mute pas `data` (lit `data.recentRaceTimes`, `data.level`, `data.goal`, etc.). `applyTargetTimeOverride` mute `paces` (in-place), comportement préservé.
- **Risque pédagogique** : nul.
- **Mitigation** : tests + snapshot tests sur 5 profils typés (5K confirmé, marathon débutant, trail expert, perte de poids low VMA, maintien).

## QUESTIONS CHALLENGERS
- Au coach : "Cette logique de -15% Maintien/Remise est appliquée 2× (Preview + Adapt). Confirmes-tu qu'elle doit l'être à chaque appel d'adaptation, ou bien la VMA réduite est déjà figée dans `ctx.vma` pour les batches remaining ?"
- Au dev 30 ans : "Y a-t-il un risque que le log tag soit utilisé par un monitoring (Sentry, Grafana) qui filtre sur `[VMA]` exact ? Si oui, garder la chaîne complète."
- Au PM : "L'adaptation feedback doit-elle recalculer la VMA depuis zéro (cas où le coureur ajoute des chronos en cours de plan) ? Si oui, OK. Si non, on devrait lire `plan.paces` au lieu de recalculer."

---

# DOUBLON D4 — `forceTutoiement` (8 doublons internes + entrées catch-all redondantes)

## AVANT (`geminiService.ts:297-476`, ~180 L)

Bloc `imperatives: [string, string][]` (L302-333) contient **174 paires**, dont :

### 4a. Doublons exacts intra-tableau (8 entrées)
| Verbe | Ligne 1ère | Ligne 2e | Statut |
|---|---|---|---|
| `'concentrez'` | L305 | L325 | doublon exact |
| `'arrêtez'` | L306 | L326 | doublon exact |
| `'adaptez'` | L305 | L326 | doublon exact |
| `'hydratez'` | L304 | L326 | doublon exact |
| `'privilégiez'` | L305 | L327 | doublon exact |
| `'gérez'` | L306 | L327 | doublon exact |
| `'pensez'` | L307 | L329 | doublon exact |
| `'reposez'` | L307 | L329 | doublon exact |

Ces 8 lignes sont littéralement présentes 2 fois (re-déclaration en L325-329 oubliée du commit précédent).

### 4b. Catch-all redondant — L378-384
```ts
result = result.replace(/(?<=^|[\s'"(\-])([A-Za-zÀ-ÿ]+)ez(?=[\s,.:;!?'"()\-]|$)/g, (match, stem) => {
  const skipWords = ['chez', 'assez', 'rez', 'nez'];
  if (skipWords.includes(match.toLowerCase())) return match;
  return stem + 'e';
});
```
Ce catch-all couvre TOUT verbe régulier du 1er groupe en `-ez` → `-e`. Donc :
- `'écoutez'/'écoute'` (L304) : redondant, le catch-all le ferait
- `'hydratez'/'hydrate'` : idem
- `'alimentez'/'alimente'` : idem
- … toutes les paires `-ez/-e` simples (pas d'alternance vocalique)

**Cas où le catch-all NE SUFFIT PAS (à conserver explicitement)** :
1. **Alternance vocalique e→è** : `accélérez/accélère`, `récupérez/récupère`, `intégrez/intègre`, `préférez/préfère`, `appuyez/appuie`, `descendez/descends`, `gérez/gère`, `privilégiez/privilégie`. Le catch-all donnerait `accélèrez → accélère`-e = `accélèree`. **À garder.**
2. **Verbes irréguliers (2e/3e groupe)** : `soyez/sois`, `faites/fais`, `prenez/prends`, `mettez/mets`, `courez/cours`, `partez/pars`, `sentez/sens`, `maintenez/maintiens`, `finissez/finis`, `réduisez/réduis`, `ressentez/ressens`, `ralentissez/ralentis`, `choisissez/choisis`, `raccourcissez/raccourcis`, `buvez/bois`, `n'hésitez/n'hésite`, `n'oubliez/n'oublie`. **À garder.**
3. **Élision `n'-`** : déjà traités via paires `n'hésitez`, `n'oubliez`. **À garder.**
4. **Verbes en -yez** : `essayez/essaie`, `appuyez/appuie`. Catch-all donnerait `essaye`-e → `essaye` (faux : impératif tu = `essaie`). **À garder.**

### 4c. Entrées strictement couvertes par le catch-all (à supprimer)
Liste des paires où `stem + 'e'` donne le bon résultat (donc redondantes avec le catch-all L378) :
- `'écoutez'/'écoute'`, `'hydratez'/'hydrate'`, `'alimentez'/'alimente'`, `'adaptez'/'adapte'`, `'arrêtez'/'arrête'`, `'effectuez'/'effectue'`, `'emportez'/'emporte'`, `'pensez'/'pense'`, `'reposez'/'repose'`, `'étirez'/'étire'`, `'respectez'/'respecte'`, `'commencez'/'commence'`, `'augmentez'/'augmente'`, `'diminuez'/'diminue'`, `'terminez'/'termine'`, `'portez'/'porte'`, `'forcez'/'force'`, `'échauffez'/'échauffe'`, `'alternez'/'alterne'`, `'consultez'/'consulte'`, `'veillez'/'veille'`, `'profitez'/'profite'`, `'entraînez'/'entraîne'`, `'continuez'/'continue'`, `'marchez'/'marche'`, `'notez'/'note'`, `'gardez'/'garde'`, `'préparez'/'prépare'`, `'variez'/'varie'`, `'contrôlez'/'contrôle'`, `'assurez'/'assure'`, `'utilisez'/'utilise'`, `'planifiez'/'planifie'`, `'évitez'/'évite'`, `'travaillez'/'travaille'`, `'restez'/'reste'`, `'surveillez'/'surveille'`, `'montez'/'monte'`, `'poussez'/'pousse'`, `'ajustez'/'ajuste'`, `'respirez'/'respire'`.

**~41 entrées supprimables** sans changement de comportement (validées par : `verbe-ez.replace(/ez$/, 'e')` ≡ valeur attendue).

### 4d. Entrées à GARDER (alternance vocalique ou irréguliers)
- `'accélérez'/'accélère'`, `'récupérez'/'récupère'`, `'intégrez'/'intègre'`, `'préférez'/'préfère'`, `'gérez'/'gère'`, `'privilégiez'/'privilégie'` (alternance e→è) — 6 paires
- `'essayez'/'essaie'`, `'appuyez'/'appuie'` (y→i) — 2 paires
- `'choisissez'/'choisis'`, `'ralentissez'/'ralentis'`, `'finissez'/'finis'`, `'réduisez'/'réduis'`, `'raccourcissez'/'raccourcis'` (-issez) — 5 paires
- `'soyez'/'sois'`, `'faites'/'fais'`, `'prenez'/'prends'`, `'mettez'/'mets'`, `'courez'/'cours'`, `'partez'/'pars'`, `'sentez'/'sens'`, `'maintenez'/'maintiens'`, `'ressentez'/'ressens'`, `'descendez'/'descends'`, `'buvez'/'bois'` (irréguliers) — 11 paires
- `"n'hésitez"/"n'hésite"`, `"n'oubliez"/"n'oublie"` (élision) — 2 paires

**Total à garder : 26 paires.**

### 4e. Cas dangereux du catch-all
Le catch-all transforme TOUT mot finissant par -ez. Faux positifs potentiels :
- `'chez'` → `che` : géré (skipWords)
- `'assez'` → `asse` : géré
- `'nez'` → `ne` : géré
- `'rez'` (rez-de-chaussée) → `re` : géré
- **MANQUANT** : `'gaz'` ? non, finit par `z` pas `ez`. `'allez'` → `alle` ? mais `'allez'` doit devenir "vas" (cf. hybridFixes L436 `allez-y → vas-y`). Or le catch-all transforme `'allez'` seul → `'alle'` qui est faux. À TESTER.
- `'restez'` → `reste` : OK
- `'pez'`, `'fez'` (nom) → `pe`, `fe` : très rare, acceptable
- Conjugaisons "vous" déjà tutoyées en hybridFixes : pas de risque

## APRÈS

### Optimisation conservative
```ts
const imperatives: [string, string][] = [
  // === 1. Alternance vocalique e → è (catch-all les casserait) ===
  ['accélérez', 'accélère'], ['récupérez', 'récupère'], ['intégrez', 'intègre'],
  ['préférez', 'préfère'], ['gérez', 'gère'], ['privilégiez', 'privilégie'],
  // === 2. Verbes en -yez (y → i) ===
  ['essayez', 'essaie'], ['appuyez', 'appuie'],
  // === 3. Verbes en -issez (2e groupe) ===
  ['choisissez', 'choisis'], ['ralentissez', 'ralentis'], ['finissez', 'finis'],
  ['réduisez', 'réduis'], ['raccourcissez', 'raccourcis'],
  // === 4. Irréguliers 3e groupe ===
  ['soyez', 'sois'], ['faites', 'fais'], ['prenez', 'prends'],
  ['mettez', 'mets'], ['courez', 'cours'], ['partez', 'pars'],
  ['sentez', 'sens'], ['maintenez', 'maintiens'], ['ressentez', 'ressens'],
  ['descendez', 'descends'], ['buvez', 'bois'],
  // === 5. Élisions ===
  ["n'hésitez", "n'hésite"], ["n'oubliez", "n'oublie"],
];
// → Le catch-all L378 gère tous les autres verbes en -ez régulièrement.
```
26 paires au lieu de ~70 effectives (174 / 2.5 doublons).

Ajout d'une entrée `skipWords` pour bloquer `'allez'` du catch-all (qui doit aller en `vas` via hybridFixes après) :
```ts
const skipWords = ['chez', 'assez', 'rez', 'nez', 'allez'];
```

### Migration
Aucune. Fonction purement interne au fichier `geminiService.ts`.

### Code supprimé
- L302-333 : ~32 L → 12 L (gain ~20 L sur le tableau)
- Pas de changement du moteur `wordRegex`, `hybridFixes`, etc.

Économie : ~20 lignes (modeste, plus important : lisibilité maintenance).

## JUSTIFICATION LIGNE PAR LIGNE

| Verbe | Statut | Raison |
|---|---|---|
| `écoutez/écoute` | supprimer | catch-all `[stem]+e` = `écoute` ✓ |
| `hydratez/hydrate` | supprimer | catch-all OK |
| `accélérez/accélère` | **garder** | catch-all donne `accélèree` ❌ |
| `récupérez/récupère` | **garder** | catch-all donne `récupèree` ❌ |
| `soyez/sois` | **garder** | catch-all donne `soye` ❌ |
| `faites/fais` | **garder** | irrégulier 3e groupe |
| `concentrez` (×2 L305+L325) | **supprimer doublon + supprimer entrée** | catch-all OK |
| `arrêtez` (×2 L306+L326) | **supprimer doublon + supprimer entrée** | catch-all OK |
| `essayez/essaie` | **garder** | catch-all donne `essaye` ❌ |
| `n'hésitez/n'hésite` | **garder** | catch-all ne matche pas l'apostrophe |

## COUVERTURE DES CAS

Tests sanitaires (texte → résultat attendu) :
| Input | AVANT | APRÈS (proposé) |
|---|---|---|
| "Hydratez-vous bien" | "Hydrate-toi bien" | "Hydrate-toi bien" (catch-all) ✓ |
| "Accélérez progressivement" | "Accélère progressivement" | "Accélère progressivement" (entrée gardée) ✓ |
| "Soyez attentif" | "Sois attentif" | "Sois attentif" (entrée gardée) ✓ |
| "Essayez de finir" | "Essaie de finir" | "Essaie de finir" (entrée gardée) ✓ |
| "N'hésitez pas" | "N'hésite pas" | "N'hésite pas" (entrée gardée) ✓ |
| "Récupérez bien" | "Récupère bien" | "Récupère bien" (entrée gardée) ✓ |
| "Chez toi" | "Chez toi" (skipWord) | "Chez toi" (skipWord) ✓ |
| "Allez-y !" | "Vas-y !" (hybridFix après catch-all) | **À VÉRIFIER** : ordre catch-all → hybridFixes |
| "Travaillez la cadence" | "Travaille la cadence" | "Travaille la cadence" (catch-all) ✓ |

**Point d'attention "allez"** : le catch-all (L378) tourne AVANT les hybridFixes (L394+). Donc "allez" → "alle" → hybridFix `\ballez-y\b` ne matche plus. **Bug existant probable**. Solution : ajouter `'allez'` à skipWords pour laisser hybridFixes faire le job.

## TESTS À ÉCRIRE
`forceTutoiement.test.ts` (~25 cas) :
1. Tous les verbes catch-all (10 cas)
2. Tous les irréguliers gardés (11 cas)
3. Tous les e→è (6 cas)
4. Élisions n' (2 cas)
5. allez-y / vas-y (bug actuel à corriger)
6. Possessifs (votre/vos → ton/tes/ta) (3 cas)

## RISQUES IDENTIFIÉS
- **Risque tech** : faible si tests passent. Le bug "allez" est PRÉ-EXISTANT (déjà cassé) — la refacto le révèle et le corrige.
- **Risque pédagogique** : nul (post-processing texte).
- **Mitigation** : tests d'intégration sur 50 séances Gemini réelles + diff visuel.

## QUESTIONS CHALLENGERS
- Au coach : "On garde les 6 entrées 'e→è' (accélère, récupère, intègre, préfère, gère, privilégie). Y a-t-il d'autres verbes courants à allure (ex: 'modérez/modère', 'tolérez/tolère') qui auraient le même problème ?"
- Au dev 30 ans : "Le catch-all transforme 'allez' en 'alle' avant que hybridFix puisse faire 'vas'. Bug pré-existant. Confirmes-tu le fix via skipWords ?"
- Au PM : "Connais-tu un texte coach historique où la suppression d'une de ces 41 entrées aurait visiblement régressé ?"

---

# DOUBLON D5 — Caps volumes : `planValidator` vs `geminiService` + extract `detectObjectiveFromData`/`detectLevelFromData`

## AVANT

### 5a. Caps en double
**`geminiService.ts:1060-1074`** (source canonique) : `MAX_WEEKLY_VOLUME` indexé par objectif (13 clés) × niveau (4 clés) = 52 valeurs.
```ts
const MAX_WEEKLY_VOLUME: Record<string, Record<string, number>> = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  // ... 13 lignes au total
};
```

**`planValidator.ts:376-414`** : reduplique les mêmes valeurs en if/else imbriqués + tolérance +10%, mais :
- ne distingue PAS `VK` vs `TrailSteep` vs `Trail<30` (loupe les caps pour Trail raide / VK)
- ne couvre PAS `Hyrox` (loupe complètement les caps Hyrox)
- duplique `MAX_SESSION_KM` (L416-425) avec la même logique fragmentaire

Conséquence : un plan Hyrox passé par validation peut dépasser `MAX_WEEKLY_VOLUME['Hyrox'].expert = 42` car le validator applique le cap `5K` par défaut (60).

### 5b. Détection objectif/niveau dupliquée implicitement
`planValidator.ts` reconstruit ses booléens `isMarathon`, `isSemi`, `is10k`, `isUltra`, `isTrail`, `isPertePoids`, `isMaintien` (L362-373) au lieu d'appeler `detectObjectiveFromData(data)`. Risque de divergence (déjà observé : VK/TrailSteep non traités).

**Pourquoi ce n'est pas factorisé déjà** : import circulaire potentiel. `planValidator.ts` est importé par `geminiService.ts` (post-validation Layer 1). Si `planValidator` importait `detectObjectiveFromData` depuis `geminiService`, ça ferait un cycle.

## APRÈS

### Nouvelle architecture
Créer `src/services/objectiveDetection.ts` :
```ts
// src/services/objectiveDetection.ts
import { timeToSeconds } from './planUtils';

// === CONSTANTES PARTAGÉES ===
export const MAX_WEEKLY_VOLUME: Record<string, Record<string, number>> = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'VK':        { deb: 20, inter: 30, conf: 35, expert: 45 },
  'TrailSteep':{ deb: 25, inter: 35, conf: 45, expert: 55 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 25, inter: 40, conf: 50, expert: 60 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};

export const MAX_SESSION_KM: Record<string, Record<string, number>> = { /* idem */ };
export const MIN_SL_PROPORTION = { /* idem */ };
export const MIN_SL_DURATION_MIN = { /* idem */ };

// === DÉTECTION OBJECTIF/NIVEAU ===
export const labelToLevelKey = (label?: string): 'deb' | 'inter' | 'conf' | 'expert' => { /* idem */ };
export const detectObjectiveFromData = (data: any): string => { /* idem L1111-1137 */ };
export const detectLevelFromData = (data: any): string => { /* idem L1158-1216 */ };
export const getEffectiveLevel = (data: any): string => { /* idem L1225-1233 */ };

// === HELPERS DE CAPPING ===
/** Renvoie le cap volume hebdo (avec tolérance optionnelle pour validation) */
export const getMaxWeeklyKm = (data: any, tolerancePercent = 0): number => {
  const obj = detectObjectiveFromData(data);
  const lvl = detectLevelFromData(data) as 'deb' | 'inter' | 'conf' | 'expert';
  const base = MAX_WEEKLY_VOLUME[obj]?.[lvl] || 60;
  return Math.round(base * (1 + tolerancePercent / 100));
};

export const getMaxSessionKm = (data: any, tolerancePercent = 0): number => {
  const obj = detectObjectiveFromData(data);
  const lvl = detectLevelFromData(data) as 'deb' | 'inter' | 'conf' | 'expert';
  const base = MAX_SESSION_KM[obj]?.[lvl] || 20;
  return Math.round(base * (1 + tolerancePercent / 100));
};
```

### Migration
- `geminiService.ts:L1060-1108` : supprimer les déclarations `MAX_WEEKLY_VOLUME`, `MIN_SL_PROPORTION`, `MIN_SL_DURATION_MIN`, et les imports depuis `./objectiveDetection`.
- `geminiService.ts:L1111-1137` : supprimer `detectObjectiveFromData`, importer.
- `geminiService.ts:L1158-1216` : supprimer `detectLevelFromData`, importer (rester `export` côté nouveau fichier).
- `geminiService.ts:L1225-1233` : supprimer `getEffectiveLevel`, importer.
- `geminiService.ts:L914-928` : supprimer `labelToLevelKey` + `LEVEL_LABEL`, importer.
- `geminiService.ts:1140-1156` : déplacer `CHRONO_LEVEL_THRESHOLDS`, `LEVEL_RANK`, `LEVEL_NAMES`, `classifyByChrono` dans `objectiveDetection.ts`.
- Tous call sites `geminiService.ts` (L1232, L1258, L1259, L1848, L1849, L2415, L2557, L2866, L3219, L3278, L3360, L3361, L3995, L4168, L4294, L4295, L4671, L5219, L5220) : import seulement.
- `planValidator.ts:L376-425` : supprimer `getMaxWeeklyKm` et `getMaxSessionKm` locaux. Importer depuis `objectiveDetection.ts` avec tolerance=10 :
  ```ts
  import { getMaxWeeklyKm, getMaxSessionKm, detectObjectiveFromData } from './objectiveDetection';
  // ...
  const maxWeeklyKm = getMaxWeeklyKm(data, 10);
  const maxSessionKm = getMaxSessionKm(data, 10);
  ```
- `planValidator.ts:L362-373` : remplacer les booléens locaux `isMarathon`, etc. par
  ```ts
  const objective = detectObjectiveFromData(data);
  ```
  et adapter les conditions de message d'erreur.

### Code supprimé
- `planValidator.ts:L376-425` : ~50 L de duplication
- `geminiService.ts:L1060-1108, L1111-1137, L1158-1216, L1225-1233, L914-928, L1140-1156` : déplacés (pas supprimés)

Économie nette : ~50 lignes (par suppression côté validator) + couverture Hyrox/VK/TrailSteep manquante = **fix bug**.

## JUSTIFICATION LIGNE PAR LIGNE

| Lignes AVANT | Action | Raison |
|---|---|---|
| `planValidator.ts:376-414` | supprimé | duplication des valeurs `MAX_WEEKLY_VOLUME`, fragmentaire (manque Hyrox/VK/TrailSteep) |
| `planValidator.ts:416-425` | supprimé | duplication `MAX_SESSION_KM` |
| `planValidator.ts:362-373` | factorisé | détection objectif inline, redondant avec `detectObjectiveFromData` |
| `geminiService.ts:1060-1108` | déplacé | source unique côté objectiveDetection |
| `geminiService.ts:1111-1216` | déplacé | source unique |

## COUVERTURE DES CAS

| Cas (obj × lvl) | AVANT validator | AVANT geminiService | APRÈS unifié |
|---|---|---|---|
| 5K × deb | 28 (cap +10%) | 25 | 28 (tolerance 10) ✓ |
| 5K × expert | 66 | 60 | 66 ✓ |
| Marathon × expert | 94 | 85 | 94 ✓ |
| Trail100+ × expert | 110 (label "ultra") | 120 | 132 ⚠️ (régression : validator était plus strict) |
| Hyrox × expert | **65** (fallback 5K) | 42 | 46 ✓ (fix : validator caplait à 65, hors policy) |
| VK × expert | **66** (fallback 5K) | 45 | 50 ✓ (fix) |
| TrailSteep × expert | **72** (fallback Trail) | 55 | 61 ✓ (fix) |

**3 fixes critiques** (Hyrox, VK, TrailSteep) où la validation laissait passer des plans hors policy.
**1 régression à arbitrer** (Trail100+) : validator était 110, geminiService 120. Si on prend geminiService comme source (+10% = 132), on assouplit. Si on garde 110, on durcit. **Recommandation : aligner sur geminiService (source du générateur) — sinon, des plans valides côté geminiService seraient rejetés en validation, ce qui est incohérent.**

## TESTS À ÉCRIRE
`objectiveDetection.test.ts` :
- 52 cas matrice MAX_WEEKLY_VOLUME (13 obj × 4 lvl)
- 52 cas MAX_SESSION_KM
- 8 cas `detectObjectiveFromData` (5K, 10K, Semi, Marathon, Trail, VK, TrailSteep, Hyrox, PertePoids, Maintien)
- 12 cas `detectLevelFromData` (chronos override, VMA override, déclaratif fallback)

## RISQUES IDENTIFIÉS
- **Risque tech** : import circulaire est ÉLIMINÉ (objectiveDetection ne dépend que de planUtils). PlanValidator devient consommateur, plus déclareur.
- **Risque pédagogique** : Hyrox/VK/TrailSteep deviennent CAPÉS dans la validation (étaient passifs). Plans déjà générés non impactés (validation = post-process layer 1).
- **Mitigation** : grep `MAX_WEEKLY_VOLUME` doit retourner uniquement `objectiveDetection.ts` après migration.

## QUESTIONS CHALLENGERS
- Au coach : "Faut-il garder le +10% de tolérance sur la validation, ou aligner strict ? Le validator a une tolérance car les variations de Gemini sont normales."
- Au dev 30 ans : "Le découpage `objectiveDetection.ts` casse-t-il le import circular ? Confirme l'arborescence : planUtils ← objectiveDetection ← {geminiService, planValidator}."
- Au PM : "Quel est l'historique du gap Trail100+ entre 110 (validator) et 120 (gemini) ? Lequel est la vraie policy ?"

---

# DOUBLON D6 — Prompts PdP & Hyrox preview vs remaining

## AVANT

### Bloc PdP Preview — `geminiService.ts:3454-3546` (~93 L)
Définit `pdpVma`, `pdpBmi`, `pdpIsLowVMA`, `pdpIsOverweight`, `pdpNeedsMarcheCourse`, `pdpMaxSLmin`, `pdpFondWeeks`, puis template string :
```
🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES :
Ce plan est un plan PERTE DE POIDS, PAS une préparation course.
[VMA low warning si applicable]
[BMI overweight warning si applicable]

INTERDICTIONS ABSOLUES : [...]
SÉANCES AUTORISÉES PAR PHASE : [...]
STRUCTURE 3+1 OBLIGATOIRE : [...]
PROGRESSION DU VOLUME TOTAL HEBDO : [...]
PROGRESSION SORTIE LONGUE : [...]
RENFORCEMENT — CADRAGE OBLIGATOIRE : [...]
EFFORT PERÇU DANS LES MAINSET : [...]
ALTERNANCE MARCHE/COURSE : [...]
SIGNAUX D'ALERTE À MENTIONNER : [...]
COHÉRENCE DURÉE/DISTANCE/MAINSET : [...]
NOMMAGE : [...]
DIVERSITÉ OBLIGATOIRE : [...]
PRIORITÉ ABSOLUE : sécurité > régularité > progression > plaisir > dépense calorique.
```

### Bloc PdP Remaining — `geminiService.ts:4378-4434` (~57 L)
Définit `pdpVmaR`, `pdpBmiR`, `pdpIsLowVMAR`, etc. (mêmes variables avec suffixe R), template plus condensé :
```
🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES :
[mêmes warnings]
INTERDICTIONS : [version compactée]
SÉANCES PAR PHASE : [mêmes]
STRUCTURE 3+1 : [1 ligne au lieu de 4]
PROGRESSION VOLUME TOTAL HEBDO : [identique]
PROGRESSION SL : [1 ligne au lieu de 5]
RENFORCEMENT : [1 ligne]
EFFORT PERÇU : [1 ligne]
COHÉRENCE : [1 ligne]
NOMMAGE : [identique]
DIVERSITÉ OBLIGATOIRE : [identique]
PRIORITÉ : [identique]
```

**Différences sémantiques détectées** :
1. Preview ajoute **"SIGNAUX D'ALERTE À MENTIONNER"** (sécurité douleur articulaire) → ABSENT en remaining.
2. Preview ajoute **"ALTERNANCE MARCHE/COURSE (semaines 1-3)"** détaillée → résumée en 1 ligne en remaining.
3. Preview verbose vs remaining condensé (50% de la longueur).
4. Preview interdit "phase spécifique / phase affûtage" → remaining même règle mais formulée plus court.
5. Variables préfixées différemment (`pdpVma` vs `pdpVmaR`) pour éviter collision lexicale → indicateur que c'est du COPY/PASTE manuel.

### Bloc Hyrox Preview — `geminiService.ts:3548-3678` (~131 L)
- Définit `hyroxFreq`, `hyroxVma`, `hyroxLevel`, `hyroxIsBeginnerish`, `hyroxPrevTime`, `hyroxVolActuel`
- Sections : FORMAT, GESTION PAR FRÉQUENCE (4 branches), ADAPTATION DÉBUTANT, VOLUME ACTUEL, CATALOGUE SÉANCES (8 types), PHASES, VOLUME RUNNING, NOMMAGE TITRES, ADVICE, WELCOMEMESSAGE

### Bloc Hyrox Remaining — `geminiService.ts:4131-4165` (~35 L)
- Bien plus court : juste NOMMAGE TITRES, ADVICE, PROGRESSION SIMULATION, ADAPTATION DÉBUTANT, VOLUME max.
- MANQUE par rapport au preview : FORMAT, GESTION PAR FRÉQUENCE, CATALOGUE SÉANCES, PHASES, WELCOMEMESSAGE.

C'est en partie justifié (le batch n'a pas besoin de regénérer le welcomeMessage), mais c'est en partie une PERTE DE COHÉRENCE pédagogique : les batches remaining ne savent pas que la simulation Hyrox 8×1km est la séance reine, ne connaissent pas les 8 types de séance HYROX, ne savent pas que le RPE doit être tel ou tel.

## APRÈS — DEUX OPTIONS

### OPTION STRICT (fusion complète)
Créer 2 builders qui retournent EXACTEMENT le même bloc pour preview et remaining :
```ts
// geminiService.ts (nouveau, après les imports)
const buildPertePoidsBlock = (
  data: QuestionnaireData,
  vmaEstimate: { vma: number },
  paces: TrainingPaces,
  variant: 'preview' | 'remaining'
): string => {
  const vma = vmaEstimate?.vma || (data as any).vma || 12;
  const bmi = (data.weight && data.height) ? data.weight / ((data.height / 100) ** 2) : 0;
  const isLowVMA = vma < 12;
  const isOverweight = bmi >= 30;
  const needsMarcheCourse = vma < 10.5 || isOverweight || (paces?.efPace || '8:00') > '7:30';
  const maxSLmin = isLowVMA ? 60 : 65;
  const efPace = paces?.efPace || '8:00';
  const totalWeeks = (data as any).durationWeeks || 12;
  const fondWeeks = Math.max(1, Math.floor(totalWeeks * 0.45));
  
  return `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES (OBLIGATOIRE) :
[CORPS UNIFIÉ — version preview (la plus longue, suffisamment détaillée)]
${variant === 'preview' ? `
SIGNAUX D'ALERTE À MENTIONNER :
Dans l'advice de la première séance, inclure : "Si tu ressens une douleur..."` : ''}
PRIORITÉ ABSOLUE : sécurité > régularité > progression > plaisir > dépense calorique.`;
};

const buildHyroxBlock = (
  data: QuestionnaireData,
  paces: TrainingPaces,
  vmaEstimate: { vma: number },
  planDurationWeeks: number,
  variant: 'preview' | 'remaining'
): string => { /* idem */ };
```

Migration :
- L3454-3546 (Preview PdP IIFE) → `${buildPertePoidsBlock(data, vmaEstimate, paces, 'preview')}`
- L4378-4434 (Remaining PdP IIFE) → `${buildPertePoidsBlock(data, { vma: ctxVma }, paces, 'remaining')}`
- L3548-3678 (Preview Hyrox IIFE) → `${buildHyroxBlock(data, paces, vmaEstimate, planDurationWeeks, 'preview')}`
- L4131-4165 (Remaining Hyrox section) → `${buildHyroxBlock(data, paces, { vma: ctxVma }, totalWeeks, 'remaining')}`

Économie : ~150-180 lignes (les 4 IIFE → 4 appels + 2 builders mutualisés ~120 L).

### OPTION HYBRIDE (recommandée pour challengers)
```ts
const buildPertePoidsCore = (data, vmaEstimate, paces): string => { /* corps commun 70-80 L */ };

const buildPertePoidsPreviewExtras = (data, vmaEstimate): string => { 
  return `SIGNAUX D'ALERTE À MENTIONNER :
[...]
ALTERNANCE MARCHE/COURSE (semaines 1-3) DÉTAILLÉE :
[...]`;
};

// Preview :
${buildPertePoidsCore(data, vmaEstimate, paces)}
${buildPertePoidsPreviewExtras(data, vmaEstimate)}

// Remaining :
${buildPertePoidsCore(data, { vma: ctxVma }, paces)}
```

Économie : ~120 lignes, préserve la divergence "warm-up safety en preview only".

## JUSTIFICATION LIGNE PAR LIGNE

| Bloc | AVANT | APRÈS Option STRICT | APRÈS Option HYBRIDE | Raison |
|---|---|---|---|---|
| L3454-3546 PdP Preview | 93 L IIFE | `${buildPertePoidsBlock(...,'preview')}` | `${buildPertePoidsCore(...)}${buildPertePoidsPreviewExtras(...)}` | doublon vs L4378 |
| L4378-4434 PdP Remaining | 57 L IIFE | `${buildPertePoidsBlock(...,'remaining')}` | `${buildPertePoidsCore(...)}` | doublon |
| L3548-3678 Hyrox Preview | 131 L IIFE | `${buildHyroxBlock(...,'preview')}` | `${buildHyroxCore(...)}${buildHyroxPreviewExtras(...)}` | doublon |
| L4131-4165 Hyrox Remaining | 35 L IIFE | `${buildHyroxBlock(...,'remaining')}` | `${buildHyroxCore(...)}` | **divergence à arbitrer** |

## COUVERTURE DES CAS

| Profil | Preview génère | Remaining génère | Diff observée |
|---|---|---|---|
| PdP VMA 11 | Bloc verbose + warning low VMA + signaux alerte | Bloc condensé + warning low VMA | Signaux alerte absent remaining |
| PdP IMC 32 | Bloc verbose + warning overweight + marche/course détaillée | Bloc condensé + warning overweight + marche/course 1 ligne | Marche/course moins détaillée remaining |
| Hyrox freq 2, beginner | FORMAT + CATALOGUE + PHASES + WELCOME | Juste NOMMAGE + ADVICE + ADAPTATION + VOLUME | Catalogue séances absent remaining → Gemini doit deviner |
| Hyrox freq 5, expert | Idem complet | Idem condensé | Idem |

**Risque pédagogique de la STRICT** : si Preview est plus verbeux pour une raison (genre "Gemini en mode première fois a besoin de plus de structure"), la remaining serait alourdie inutilement → plus de tokens, plus cher.
**Risque de la HYBRIDE** : on entérine la divergence sans la justifier. Si demain on doit faire évoluer, 2 endroits à toucher.

## TESTS À ÉCRIRE
- `buildPertePoidsBlock.test.ts` : 8 cas (combinaisons low VMA × overweight × needs marche/course × variant)
- `buildHyroxBlock.test.ts` : 8 cas (4 fréquences × beginner ou pas)
- Snapshot tests : générer le bloc pour 4 profils types, geler la sortie.

## RISQUES IDENTIFIÉS
- **Risque tech** : faible si tests snapshot. Risque de drift token (option STRICT alourdit le batch prompt → coût Gemini + risque de troncature à 65536 tokens output).
- **Risque pédagogique** : critique. Le PM dit "divergence volontaire", le dev dit "accidentelle". **Doit être tranché par les challengers avant exécution.**
- **Mitigation** : commencer par Option HYBRIDE (safest), basculer STRICT seulement si données prod prouvent que la remaining détaillée améliore la qualité.

## QUESTIONS CHALLENGERS
- Au coach : "Préfères-tu la STRICT (remaining = preview, même contenu pédagogique) ou HYBRIDE (preview a en plus les warnings sécurité douleur articulaire) ? Sécurité = preview une seule fois suffit, ou doit être rappelée chaque batch ?"
- Au dev 30 ans : "Coût token : STRICT alourdit chaque batch remaining d'environ 100 L (≈ 1000 tokens), x 5 batches = 5000 tokens/plan. Acceptable ou ajout d'un cap ?"
- Au PM : "L'historique : qui a fait la version remaining ? Est-ce un raccourci volontaire (les batches savent déjà la philosophie depuis preview) ou un oubli ?"

---

# DOUBLON D7 — Block Trail preview vs remaining

## AVANT

### Block Trail Preview — `geminiService.ts:3277-3331` (~55 L)
Branches : VK / TrailSteep / Ultra 100+ / Ultra 70+ / Trail standard.
Format : message court à inclure DANS le prompt (en-tête emoji + bullet points règles).
Exemple VK :
```
🏔️ VK / COURSE DE CÔTE : ${dist} km, D+ ${elev} m (${ratio} m D+/km)
⚠️ FORMAT VK — PAS un trail classique. Plan spécifique :
- Volume hebdomadaire TRÈS RÉDUIT (max 20-45km selon niveau).
- Priorité ABSOLUE : puissance en côte
- Sortie longue orientée DÉNIVELÉ
- Renforcement SPÉCIFIQUE : gainage, squats, mollets, fentes, proprioception
- Séances courtes et intenses > séances longues. Pas de footing > 10km.
- Le fractionné en côte peut commencer dès la phase fondamentale
- Chaque séance DOIT mentionner le D+ cible
```

### Block Trail Remaining — `geminiService.ts:4167-4231` (~65 L)
Mêmes branches : VK / TrailSteep / standard (avec sous-branche ultra 100+/70+ inline).
Format : encadré ASCII `═══` (plus visuel).
Exemple VK :
```
═══════════════════════════════════════
       SPÉCIFICITÉS VK / COURSE DE CÔTE
═══════════════════════════════════════
Distance course : ${dist} km | D+ : ${elev} m
Ratio D+/km : ${ratio} m/km

⚠️ FORMAT VK — PAS un trail classique :
- Volume hebdomadaire TRÈS RÉDUIT. Pas de footing > 10km.
- Priorité ABSOLUE : puissance en côte
- Sortie longue orientée DÉNIVELÉ
- Le fractionné en côte EST AUTORISÉ dès la phase fondamentale
- Renforcement spécifique : squats, fentes, mollets, gainage, proprioception
- Chaque séance DOIT mentionner le D+ cible
- elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement)
```

### Différences sémantiques détectées
1. Preview : pas de mention `elevationGain OBLIGATOIRE`. Remaining : OUI.
2. Preview : "Plan spécifique" verbose. Remaining : encadré + bullets concis.
3. Preview : précise volume range (`max 20-45km selon niveau`). Remaining : ne précise pas (laisse au volumeTarget du batch).
4. Branches Ultra 100+ et Ultra 70+ : Preview a 2 blocs séparés (3301-3326), Remaining a 1 bloc unifié avec ternaire inline (4216-4230).
5. Mention nutrition SL ≥ 2h : présent dans les deux, formulé identiquement (probablement copy-paste).
6. Back-to-back ultra : Preview = 7 bullets très détaillés. Remaining = 5 bullets condensés.

## APRÈS — DEUX OPTIONS

### OPTION STRICT
```ts
const buildTrailBlock = (data: QuestionnaireData, variant: 'preview' | 'remaining'): string => {
  if (!data.trailDetails) return '';
  const objective = detectObjectiveFromData(data);
  const isVK = objective === 'VK';
  const isTrailSteep = objective === 'TrailSteep';
  const isUltra100 = (data.trailDetails.distance || 0) >= 100;
  const isUltra70 = (data.trailDetails.distance || 0) >= 70;
  
  const header = variant === 'remaining'
    ? `═══════════════════════════════════════\n       SPÉCIFICITÉS ${isVK ? 'VK / COURSE DE CÔTE' : isTrailSteep ? 'TRAIL RAIDE' : 'TRAIL'}\n═══════════════════════════════════════`
    : `🏔️ ${isVK ? 'VK / COURSE DE CÔTE' : isTrailSteep ? 'TRAIL RAIDE' : 'TRAIL'} : ${data.trailDetails.distance} km, D+ ${data.trailDetails.elevation} m`;
  
  // ... corps unifié
};
```

### OPTION HYBRIDE (recommandée)
```ts
const buildTrailCore = (data): string => { /* règles métier identiques entre preview/remaining */ };

const buildTrailPreviewWrapper = (core): string => `🏔️ TRAIL ...\n${core}`;
const buildTrailRemainingWrapper = (core): string => `═══...\n       SPÉCIFICITÉS TRAIL\n═══...\n${core}`;
```

Conserve les différences de formatting (en-tête emoji preview vs encadré ASCII remaining) tout en mutualisant le corps métier.

## JUSTIFICATION LIGNE PAR LIGNE

| Lignes AVANT | Action | Raison |
|---|---|---|
| L3282-3291 (VK Preview) | factorisé via buildTrailCore | corps identique à L4172-4186 sauf elevationGain OBLIGATOIRE (à harmoniser : mettre dans les deux) |
| L3292-3300 (TrailSteep Preview) | factorisé | corps identique à L4187-4201 |
| L3301-3326 (Ultra 100+ et 70+ Preview) | factorisé | unifiable avec L4216-4230 |
| L4172-4186 (VK Remaining) | factorisé | doublon |
| L4187-4201 (TrailSteep Remaining) | factorisé | doublon |
| L4216-4230 (Ultra Remaining) | factorisé | doublon |

## COUVERTURE DES CAS

| Cas | Preview AVANT | Remaining AVANT | Unifié APRÈS |
|---|---|---|---|
| VK 5km 1500m D+ | Bloc VK preview (sans elevationGain) | Bloc VK remaining (avec elevationGain) | Bloc unifié (elevationGain partout) |
| Trail raide 12km 1000m | Bloc TrailSteep preview | Bloc TrailSteep remaining | Bloc unifié |
| Trail std 20km 600m | Bloc générique court | Bloc générique avec elevationGain | Bloc unifié |
| Ultra 70km | Bloc ultra70 preview 13 bullets | Bloc ultra70 remaining 5 bullets | À harmoniser (preserve verbose ou condensé ?) |
| Ultra 100km | Bloc ultra100 preview détaillé | Bloc ultra100 remaining inline | À harmoniser |

**Question critique** : Preview = niveau de détail X (haut). Remaining = niveau Y (moyen). Lequel garder ? **PM doit trancher** : "preview est verbose pour aider Gemini à comprendre le contexte la première fois, remaining peut être plus court car Gemini a déjà la semaine 1 en référence" OU "remaining doit avoir le même niveau de rigueur sinon Gemini drift".

## TESTS À ÉCRIRE
- `buildTrailBlock.test.ts` : 10 cas (5 objectifs × 2 variants)
- Snapshot tests : 4 profils trail (VK 4km/800m, TrailSteep 10km/1200m, Trail 30km/1500m, Ultra 100km/5000m)

## RISQUES IDENTIFIÉS
- **Risque tech** : faible.
- **Risque pédagogique** : MODÉRÉ. Si on fusionne et que Gemini perd les "rappels de rigueur" plus longs en preview, les plans risquent de driver. **Mitigation : conserver l'option HYBRIDE le temps de prouver par A/B test que la version condensée suffit.**
- **Mitigation** : commencer par option HYBRIDE.

## QUESTIONS CHALLENGERS
- Au coach : "Pour un ultra-trail 100km+, le bloc preview détaille 7 règles (back-to-back, power hiking, nutrition, matériel, allure ultra, D+ cible, renfo excentrique). Le bloc remaining n'en a que 5 (manque allure ultra explicite et certaines mentions matériel). Est-ce que ces 2 manques sont critiques pour la qualité du plan dans les batches > S1 ?"
- Au dev 30 ans : "Si on factorise, on duplique potentiellement le bloc unifié dans les 2 prompts → tokens identiques. Confirme-tu que ce n'est pas un piège ?"
- Au PM : "L'historique : as-tu vu des cas client où la divergence preview vs remaining a posé problème (ex: plan ultra où les semaines 4+ perdent le focus back-to-back) ?"

---

# RÉSUMÉ EXÉCUTIF

| ID | Doublon | Lignes économisées | Risque | Recommandation |
|---|---|---|---|---|
| D1 | parseDurationMin × 3 | ~27 | Faible (fix bug latent) | EXÉCUTER |
| D2 | parseKm × 3 | ~14 | Faible | EXÉCUTER |
| D3 | Recalcul VMA × 2 | ~57 | Très faible | EXÉCUTER |
| D4 | forceTutoiement entrées redondantes | ~20 | Moyen (révèle bug 'allez') | EXÉCUTER avec tests |
| D5 | Caps validator vs gemini + detect | ~50 + fix 3 bugs Hyrox/VK/TrailSteep | Faible (fix bug) | EXÉCUTER (PRIORITÉ) |
| D6 | Prompts PdP/Hyrox | ~120-180 | Moyen-élevé (divergence à arbitrer) | DÉBAT — Option HYBRIDE |
| D7 | Block Trail | ~50-80 | Moyen (idem) | DÉBAT — Option HYBRIDE |

**Total min** (D1-D5 + Option HYBRIDE D6+D7) : ~338 lignes économisées + 4 bugs latents fixés.
**Total max** (D1-D5 + Option STRICT D6+D7) : ~478 lignes économisées + 4 bugs.

## ORDRE D'EXÉCUTION RECOMMANDÉ
1. **D5 en premier** (fix de 3 bugs Hyrox/VK/TrailSteep critiques, casse import circular)
2. **D1 + D2** (parsers, prérequis pour D5)
3. **D3** (factorisation locale geminiService)
4. **D4** (tests préalables sur 50 séances Gemini)
5. **D6 et D7** : ARBITRAGE par challengers AVANT exécution. Recommandation : Option HYBRIDE.

## FICHIERS À CRÉER
- `src/services/utils/parsers.ts` OU réutiliser `src/services/planUtils.ts` (recommandé)
- `src/services/objectiveDetection.ts` (D5)
- Tests : `src/services/__tests__/parsers.test.ts`, `objectiveDetection.test.ts`, `forceTutoiement.test.ts`, `computePacesAndVMA.test.ts`, `buildPertePoidsBlock.test.ts`, `buildHyroxBlock.test.ts`, `buildTrailBlock.test.ts`

## FICHIERS À MODIFIER
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` — toutes les sections référencées
- `/Users/romanemarino/Coach-Running-IA/src/services/planValidator.ts` — sections L49-85, L362-425
- `/Users/romanemarino/Coach-Running-IA/src/services/planUtils.ts` — étendre avec `parseKm` (et garder `parseDurationMin`)

## NOTES TRANSVERSALES POUR LES CHALLENGERS
- Les fichiers `.BACKUP-NUTRITION-PATCH` et `.BACKUP-PRE-PATCH` à la racine `src/services/` polluent les `grep`. Recommandation orthogonale : ajouter `*.BACKUP-*` au `.gitignore` ou les supprimer.
- `feasibilityService.ts` (1164 L) n'apparaît dans aucun des 7 doublons examinés. Vérifier en passe 2 si des `parseDistance` ou `parseDuration` y existent (grep négatif sur les fichiers ciblés → probable que feasibility utilise ses propres parseurs ou aucun).
- Le fichier `planUtils.ts` est ORPHELIN aujourd'hui. La factorisation D1+D2 lui donne enfin une raison d'exister, transformant ce qui est aujourd'hui une dette technique (code mort) en un asset (lib de parseurs testés).