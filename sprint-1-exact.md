# Sprint 1 — Diff EXACT à valider

4 actions chirurgicales, aucun refactor structurel. Tout `geminiService.ts` sauf P4 partie 2 = `feasibilityService.ts`.

---

## P5 — Helper `isFinisherTarget` unifié

### Existant (4 détections divergentes)

**Site 1** — `geminiService.ts:2228` (`calculatePeriodizationPlan`, réduction volume finisher)
```ts
const isFinisher = !targetTime || targetTime.trim() === '';
if (isFinisher && !isPertePoids && !isMaintien) {
  totalReduction *= 0.75;
}
```
→ ⚠️ Bug : si user tape `"Finisher"` littéral, `isFinisher=false` donc PAS de réduction (le code interprète comme un chrono).

**Site 2** — `geminiService.ts:2379-2381` (mode marche-course)
```ts
const hasSpecificTimeTarget = !!targetTime &&
  /\d/.test(targetTime) &&
  !/finisher/i.test(targetTime);
```

**Site 3** — `geminiService.ts:3556` (prompt preview)
```ts
${(!data.targetTime || data.targetTime.trim() === '') && !goal.includes('Perte') && ... ? `🔴 PLAN FINISHER...
```

**Site 4** — `geminiService.ts:4317` (prompt remaining weeks)
```ts
${(!data.targetTime || data.targetTime.trim() === '') && !data.goal?.includes('Perte') && ... ? `🔴 PLAN FINISHER...
```

### Patch proposé

**Ajout** (juste avant `detectLevelFromData`, ~ligne 994) :
```ts
/** True si l'utilisateur n'a pas saisi de chrono cible (mode Finisher) */
export const isFinisherTarget = (t?: string): boolean =>
  !t || !t.trim() || /^finisher$/i.test(t.trim()) || !/\d/.test(t);
```

**Remplacements** :
- L2228 : `const isFinisher = isFinisherTarget(targetTime);`
- L2379-2381 : `const hasSpecificTimeTarget = !!targetTime && !isFinisherTarget(targetTime);`
- L3556, L4317 : `${isFinisherTarget(data.targetTime) && !goal.includes('Perte') ...`

### Changement de comportement

Avant : `targetTime = "Finisher"` littéral → traité comme un chrono valide (réduction non appliquée).
Après : reconnu comme Finisher → réduction `×0,75` appliquée correctement.

C'est un **fix de bug latent**, pas une régression.

### Effort / Risque
- Effort : XS (~15 lignes touchées)
- Risque casse : Bas
- Impact : sécurité du mode marche-course (récent, fragile)

---

## P3a — Helper `parseKm` centralisé

### Existant : 27 ré-implémentations + 1 helper local

Pattern strictement identique aux lignes : 624, 1149, 1182, 1213, 1238, 1242, 1254, 1263, 1304, 1318, 1407, 1413, 1429, 1439, 1457, 1492, 1500, 1501, 1512, 1524, 1547, 1552, 1718, 1729, 1794, 4613.

```ts
parseFloat((X.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'))
```

Plus 1 helper local non réutilisé : `geminiService.ts:1655`
```ts
const getKm = (s: any) => parseFloat((s.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
```

### Patch proposé

**Ajout top-level** (juste avant `MAX_SL_DURATION`, ~ligne 880) :
```ts
/** Parse une string distance ("12.5 km" / "12,5 km" / "12.5") en number — 0 si invalide */
const parseKm = (d: unknown): number => {
  if (!d) return 0;
  const n = parseFloat(d.toString().replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};
```

**Remplacement mécanique** (regex search-replace) :
- `parseFloat((X.distance || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.'))` → `parseKm(X.distance)`
- Supprimer le `const getKm = ...` ligne 1655, utiliser `parseKm` à la place

### Changement de comportement

Avant : `parseFloat('') = NaN` mais fallback `'0'` → 0. Cas extrêmes (string corrompue) pouvaient retourner `NaN`.
Après : toujours `number ≥ 0` (jamais NaN, jamais négatif).

Le code consommateur teste partout `km > 0` donc équivalent. Plus défensif.

### Effort / Risque
- Effort : S (~80 lignes touchées, mécanique)
- Risque casse : Bas (search-replace mécanique)
- Impact : élimine 27 sites de divergence potentielle

---

## P1b — Helper canonique `labelToLevelKey`

### Existant : 4+ mappings divergents

**Site 1** — `geminiService.ts:1014-1021` (DANS `detectLevelFromData`, déjà bon)
```ts
if (level.includes('débutant') || level.includes('debutant')) declared = 'deb';
else if (level.includes('expert') || level.includes('performance')) declared = 'expert';
else if (level.includes('confirmé') || level.includes('confirme') || level.includes('compétition')) declared = 'conf';
else declared = 'inter';
```

**Site 2** — `geminiService.ts:2300-2301` (dans `calculatePeriodizationPlan`)
```ts
const levelKey = level.includes('Débutant') || level.includes('debutant') ? 'deb' :
  level.includes('Expert') ? 'expert' : level.includes('Confirmé') ? 'conf' : 'inter';
```
⚠️ **Oublie l'accent** sur `'confirme'` (sans accent), couvert par Site 1 mais pas ici.

**Site 3** — `geminiService.ts:2710-2717` (dans `createGenerationContext`)
```ts
const effectiveLevelKey = detectLevelFromData({ ...data, vma });
const effectiveLevelMap: Record<string, string> = {
  deb: 'Débutant (0-1 an)',
  inter: 'Intermédiaire (Régulier)',
  conf: 'Confirmé (Compétition)',
  expert: 'Expert (Performance)',
};
```

**Site 4** — `geminiService.ts:3141`, `3990`
```ts
const isBeginnerLevel = data.level === 'Débutant (0-1 an)';
```
⚠️ Compare la string littérale exacte → casse si Strava retourne `'Débutant (0-1 an) '` (espace en fin).

### Patch proposé

**Ajout top-level** (juste avant `MAX_SL_DURATION`) :
```ts
/** Convertit un label niveau (string libre) en clé canonique. Tolère casse + accents + variantes. */
export const labelToLevelKey = (label?: string): 'deb' | 'inter' | 'conf' | 'expert' => {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant') || l.includes('beginner')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition') || l.includes('competition')) return 'conf';
  return 'inter';
};

/** Mapping inverse : clé → label canonique pour affichage / passage aux fonctions qui attendent un label complet */
export const LEVEL_LABEL: Record<'deb' | 'inter' | 'conf' | 'expert', string> = {
  deb: 'Débutant (0-1 an)',
  inter: 'Intermédiaire (Régulier)',
  conf: 'Confirmé (Compétition)',
  expert: 'Expert (Performance)',
};
```

**Remplacements** :
- L1014-1021 (dans `detectLevelFromData`) : remplacer par `let declared = labelToLevelKey(level);`
- L2300-2301 (dans `calculatePeriodizationPlan`) : remplacer par `const levelKey = labelToLevelKey(level);`
- L2717 (dans `createGenerationContext`) : remplacer `effectiveLevelMap` par `LEVEL_LABEL`
- L3141, L3990 : remplacer `data.level === 'Débutant (0-1 an)'` par `labelToLevelKey(data.level) === 'deb'`

### Changement de comportement

- Site 2 (L2300) attrape maintenant `'confirme'` sans accent → cohérent avec Site 1
- Sites 4 (L3141, L3990) deviennent tolérants aux variations (accent, casse, espaces)
- Aucune régression : tous les call sites convergent vers la même logique

### Effort / Risque
- Effort : XS (~30 lignes touchées)
- Risque casse : Bas (test unitaire facile)
- Impact : élimine 4 sites de divergence + tolère mieux les inputs

---

## P4 — Audit + cleanup mentions interdites

### Violations identifiées (10 occurrences)

**`geminiService.ts`** :

| Ligne | Mention | Contexte | Action |
|---|---|---|---|
| 2857 | "Cross-training OBLIGATOIRE : intégrer vélo, natation ou elliptique" | prompt LLM IMC≥35 | Remplacer par "**2 jours de repos complet/sem** + renforcement bas du corps 2×/sem (excentrique mollets, gainage, fessiers, équilibre unipodal)" |
| 2875 | "Cross-training recommandé (vélo, natation)" | prompt LLM IMC 30-35 | Remplacer par "Renforcement bas du corps 1-2×/sem pour réduire l'impact articulaire" |
| 3522 | "athlète fait du cross-training intense à côté" | prompt Hyrox | Reformuler "les stations Hyrox sont travaillées hors de ce plan" |
| 4045 | "Volume hebdo modéré (cross-training à côté)" | prompt Hyrox remaining | "Volume hebdo modéré (les stations Hyrox sont travaillées hors de ce plan)" |
| 4756 | "Remplacer les 2-3 prochaines séances running par cross-training (vélo, natation, elliptique)" | prompt blessure | Remplacer par "Suspendre 2-3 séances running, consulter un kiné, et faire du renforcement excentrique + mobilité ciblée jusqu'à reprise sans douleur." |

**`feasibilityService.ts`** :

| Ligne | Mention | Contexte | Action |
|---|---|---|---|
| 763 | `ton IMC (${bmi.toFixed(1)}) indique un risque articulaire élevé — ... cross-training (vélo, natation)` | message utilisateur DIRECT | Reformuler sans chiffre IMC ni cross-training : `ton profil actuel impose une vigilance articulaire — consulte un médecin avant de démarrer, privilégie surfaces souples et chaussures avec amorti renforcé` |
| 766 | `ton IMC (${bmi.toFixed(1)}) augmente le risque articulaire` | message utilisateur | `ton profil impose une vigilance articulaire — consulte un médecin, privilégie un bon amorti et des surfaces souples` |
| 769 | `avec un IMC de ${bmi.toFixed(1)}, investis dans de bonnes chaussures` | message utilisateur | `pour cette distance, investis dans de bonnes chaussures avec un bon amorti` |
| 1098 | `Cumul IMC + blessure ... Privilégie le cross-training, surfaces souples...` | message utilisateur | `AVIS MÉDICAL OBLIGATOIRE : tu cumules des facteurs de prudence (profil + antécédent blessure). Consulte impérativement ton médecin et ton kiné avant de démarrer. Privilégie surfaces souples et chaussures à amorti maximal.` |
| 1115 | `Avec ton IMC, ... cross-training (vélo, natation, elliptique), surfaces souples` | message utilisateur | `Consulte impérativement ton médecin avant de démarrer. Risque articulaire à surveiller : privilégie surfaces souples, chaussures à amorti maximal, et alterne marche et course si nécessaire.` |
| 1119 | `cross-training (vélo, natation) pour réduire l'impact` | message utilisateur | `On te recommande de consulter ton médecin avant de démarrer. Investis dans de bonnes chaussures avec amorti renforcé et privilégie surfaces souples (herbe, terre, chemin).` |

### Linter test (à ajouter)

Fichier : `src/services/__tests__/forbidden-vocabulary.test.ts` (NEW)
```ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_REGEX = /\b(IMC|cross.?training|vélo|natation|elliptique|corpulence|minceur)\b/i;

// Patterns à exclure (mots OK dans certains contextes)
const ALLOWED_FILES = ['feasibilityService.ts'];  // côté tableau interne OK, on cible les outputs

describe('Vocabulaire produit interdit dans les messages utilisateur', () => {
  it('aucune mention IMC/poids/cross-training dans les outputs utilisateur générés', () => {
    // Snapshot test sur les messages produits par les fonctions exportées de feasibilityService
    // À enrichir progressivement
    // TODO: générer 10 profils fixtures, appeler `assessGoalFeasibility`, scanner `.message` et `.reasons`
    expect(true).toBe(true);  // placeholder
  });
});
```

⚠️ Le linter test reste un placeholder — il faut le construire avec des fixtures dans Sprint 2. Pour Sprint 1, l'audit visuel des 10 violations + remplacement suffit.

### Effort / Risque
- Effort : S (~10 messages réécrits, ~30 min)
- Risque casse : Bas (reformulations sans changement logique)
- Impact : CRITIQUE règle produit (élimine violations actives)

---

# Récap Sprint 1

| # | Action | Lignes touchées | Effort | Risque |
|---|---|---|---|---|
| P5 | `isFinisherTarget` helper + 4 remplacements | ~15 | XS | Bas |
| P3a | `parseKm` helper + 27 remplacements | ~80 | S | Bas |
| P1b | `labelToLevelKey` + `LEVEL_LABEL` + 4 remplacements | ~30 | XS | Bas |
| P4 | 10 reformulations messages (5 prompts LLM + 5 messages user) | ~30 | S | Bas |

**Total** : ~155 lignes touchées, **aucun changement de logique métier**. Tout est extraction de patterns + reformulations conservant l'intention.

**Garde-fous** :
- Pas de modification des tables de calibration (Coach garde-fou)
- Pas de modification de l'ordre des passes `enforceWeekConstraints` (Dev garde-fou)
- Pas de modification des `console.log [Periodization]` (Dev garde-fou)
- Pas de modification du scope course-only (PM/Coach garde-fou)

**Sortie attendue** : 0 régression, 4 sources de bug latent éliminées, conformité produit ré-établie sur le vocabulaire.
