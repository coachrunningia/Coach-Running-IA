# Sprint Fix A + B feasibility Trail + preview course
Date : 2026-05-20

## Contexte

Audit Coach 20 ans sur les profils Cyril (Trail 45 km / 1900 m D+) et Bertrand
(Trail 16 km / 1000 m D+) a remonté deux bugs UI/UX :

- **A** — feasibility message cite des labels inadaptés sur Trail
  (Bertrand : "Sur marathon, le seuil 88 % VMA…" / Cyril : "Sur 64 km…" sans
  contexte). Le user ne comprend pas d'où sort "marathon" ni "64 km" alors qu'il a
  saisi "Trail 16 km" ou "Trail 45 km". Crédibilité produit cassée.
- **B** — preview de la semaine course affiche un volume (`weeklyVolumes[7] = 44 km`)
  qui exclut la séance course officielle (skip `_raceDay` par `getWeekKm`).
  Cyril : "où est mon 45 km ?".

Validation Coach 20 ans : P1+P3 fusionnés (Fix A), S5 (Fix B). P2/P4/S6 écartés.

## Fix A — feasibilityService.ts

Fichier : `src/services/feasibilityService.ts` (zone L470-510 — branche IRRÉALISTE
sur seuils %VMA tenu).

- **Avant** : message utilisait `Sur ${distanceThresholds.label}` où `label` est
  dérivé de la distance effective (`distance + D+/100`, règle Kilian) →
  "marathon" pour un Trail 16 km + 1000 m D+, "64 km" pour un Trail 45 km + 1900 m
  D+. Aucune explicitation que c'est un équivalent effort plat.
- **Après** : pour Trail (`isTrail && trailElevation > 0`), libellé
  `Sur ton trail de ${distance} km avec ${dPlus} m de dénivelé
  (≈ ${effortKm} km d'effort équivalent)`. Pour route (5K/10K/Semi/Marathon) :
  libellé classique `Sur ${distanceThresholds.label}` inchangé.
- **Calcul (effectiveDistanceKm, seuil VMA, score) strictement identique** —
  seul le LIBELLÉ affiché change. Zéro incidence métier.
- Tests : +5 anti-régression dans `src/services/__tests__/feasibility-trail-label.test.ts` :
  1. Bertrand Trail 16 km + 1000 m D+ → message contient "trail" / "16 km" /
     "1000 m" / "26 km d'effort équivalent" ; ne contient PAS "Sur marathon".
  2. Cyril Trail 45 km + 1900 m D+ → message contient "trail" / "45 km" /
     "1900 m" / "64 km d'effort équivalent" ; ne contient PAS "Sur 64 km,".
  3. Trail 30 km + 0 m D+ (cas rare plat) → fallback libellé classique route, pas
     de mention "effort équivalent".
  4. Marathon 42.195 km route → label "Sur marathon" inchangé (non-régression).
  5. Semi 21.1 km route (mxjulien02) → label "Sur semi-marathon" inchangé
     (non-régression Fix C précédent).

## Fix B — PlanView.tsx

Fichier : `src/components/PlanView.tsx` (zone L575-650 + L1755-1772 rendering).

- **Avant** : preview de la semaine course (= semaine contenant `raceDate`)
  affichait juste `~44 km` ; aucune mention que la course officielle
  (45 km par exemple) sera injectée dedans au moment du full plan via
  `injectRaceSession`. User confondu.
- **Après** : pour la semaine contenant `raceDate`, ajout d'une mention
  conditionnelle inline : `~44 km + 🏁 Course officielle 45 km`.
- **Visuel seulement** : `weeklyVolumes[]` non modifié, aucune incidence
  sur la projection / le full plan.
- **Conditionnel et robuste** :
  - `raceWeekIdx = floor((raceDate.monday - startDate.monday) / 7)`
  - `raceDate` lu via `plan.raceDate || generationContext.questionnaireSnapshot.raceDate`
  - `raceDistanceKm` lu via `questionnaireSnapshot.trailDetails.distance` (Trail prioritaire)
    sinon parse `plan.distance` (`"21 km"` → 21).
  - Fallback gracieux : si `raceDate` ou distance absent → pas d'affichage,
    pas de crash.
- Tests : pas de test composant React ajouté (mocking complexe non rentable
  vs valeur — flag levé conformément au cahier des charges). Vérifié
  manuellement côté logique (helper raceWeekIdx + condition rendering).

## Validation

- `npx vitest run` : **315 / 315 verts** (310 baseline + 5 nouveaux).
- `npm run build` : **OK** (Prerender 37 pages, 0 erreur).

## Commit local

- **Hash** : `f4efc4b`
- **Branch** : `main` ahead `origin/main` by 1 commit
- **PAS de push, PAS de deploy** — Romane décide après validation Dev.

## Fichiers modifiés

```
M  src/components/PlanView.tsx                                  (+44 / -2)
M  src/services/feasibilityService.ts                           (+11 / -2)
A  src/services/__tests__/feasibility-trail-label.test.ts       (+141)
```

Total : 3 fichiers, 196 insertions / 4 suppressions.
