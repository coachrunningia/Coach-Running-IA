# Sprint Nutrition Trail V2 finale
Date : 2026-05-20

## Contexte

Refonte complète de l'outil **NutritionTrailPage.tsx** suite à audit 3 experts indépendants :
- Expert #1 — coach trail performance 20 ans (ISSN/ITRA/UTMB Academy)
- Expert #2 — nutrition clinique sport (SFNS/IOC, sécurité EAH/GI)
- Expert #3 — trail elite terrain 25 ans (UTMB/Tor/Hardrock)

**Bug critique corrigé** : Trail 27 km / 4 h donnait 14 gels (V1) → 3-7 gels (V2).
Cause : la formule gels ignorait l'apport boisson isotonique (~22-28 g/h selon palier).

## Modifs appliquées (22 ajustements)

### Structure paliers (1)
- **L60-70** : type `DurationPalier` + `getDurationPalier()` — 5 paliers (vs 7 V1)
  - Court <2 h / Moyen 2-5 h / Long 5-8 h / TrèsLong 8-18 h / Ultra >18 h

### Tables glucides (2-3)
- **L78-86** : `CARBS_TARGET_BY_PALIER` — cibles 40/60/70/75/75 g/h (vs cibles V1 dispersées)
- **L91-93** : `DRINK_CARBS_BY_PALIER` — apport boisson g/h par palier (NEW V2)

### Hydratation (4)
- **L97-103** : `HYDRATION_RANGE_BY_PALIER` — plages mL/h par palier (350-850)
- **L516-528** : plafond F<65kg=850, F<55kg+climat frais=750, cap absolu 1000

### Sodium (5)
- **L108-117** : `SODIUM_RANGE_BY_PALIER` — ration mg/h critique EAH (300-1000)
- **L569-584** : chaleur >25°C → borne haute palier, sweat-salty heavy → 1000-1400 mg/h

### Gels (6-7)
- **L121-126** : `GEL_PALIER_CAP` + `GEL_HOURLY_CAP=1.33` (1 gel / 45 min)
- **L668-679** : formule corrigée déduit boisson + solides + BV (bug 14 gels résolu)

### Bases de vie (8)
- **L189-195** : `getNbBVRecommande(durationHours, denivelePos)` — seuils palier + D+
- Exposé via `result.basesDeVieRecommande`

### Solides (9-10)
- **L131-178** : 4 listes — H3+, H6+, BV_ONLY, INTERDITS H<6
  - Ajouts : boudoirs, fruits secs moelleux, Coca dégazé, soupe instantanée
- **L183-189** : `SOLIDES_MAX_BY_PALIER` (base / hauteMontagne D+>4500)

### Protéines (11)
- **L154-181** : `PROTEINS_BY_PALIER` — refonte BV-centric (expert #3)
  - Court/Moyen : 0 ; Long : optionnel ; TrèsLong/Ultra : obligatoire
  - Apport CONCENTRÉ en BV (15/25/30 g) pas continu
  - Œuf dur / fromage frais autorisés UNIQUEMENT en BV réfrigérée

### Ratio glucose:fructose (12)
- **L451-455** : warning ratio 2:1 obligatoire si target ≥ 60 g/h
- Traduction UX : "maltodextrine + fructose" sur étiquette

### Règle gel + eau (13)
- **L631** : "1 gel = 100-150 mL eau dans 5 min, JAMAIS à sec"

### Anti-métronome (14)
- **L636-638** : repères mémorables + alarme backup 30-40 min

### Mode "Premier ultra" (15, 22)
- **L398-410** : param `isPremierUltra?: boolean`
- **L443-447** : cap auto 60 g/h sur TrèsLong/Ultra, force borne haute hydratation
- **L658-660** : force solides H2 (vs H3) palier Moyen/Long
- UI L879-901 : checkbox dédiée

### Warnings cliniques (16)
- **L629-639** : `clinicalWarnings[]` séparé de `warnings[]`
  - gut training (Costa 2017), hypoglycémie pré-départ, sodium dans boisson
  - cap caféine 400 mg/24 h, femme cold rain plafond 750 mL/h
  - sweat-salty heavy 1000-1400 mg/h Long+

### UX (17-21)
- **L1207-1240** : panneau "Palier détecté" + 4 cards glucides/hydra/sodium/BV reco
- **L1187-1216** : carte "Règles cliniques (sécurité)" séparée
- **L1218-1244** : carte "Solides recommandés" selon palier
- **L724-726** : saucisson 1-2 tranches fines (timeline H≥6 h)
- **L741** : Coca dégazé apparaît dans timeline H≥8 h aliments "vrais"

## Tests

- **Avant** : 47 tests trail baseline (`nutritionTrail.test.ts`) + 330 autres = **377 verts**
- **Après** : 47 tests trail baseline INCHANGÉS + **62 nouveaux V2** (`nutrition-trail-v2.test.ts`) = **377 + 62 = ne casse rien** *(en fait total 439 cf ci-dessous)*
- Confirmé : `npx vitest run` → **439 / 439 verts (23 fichiers)**

### Couverture nouveaux tests V2 (62)

| Catégorie | Tests |
|---|---|
| Paliers durée (5) | 5 |
| Cibles glucides par palier | 5 |
| Bug 27 km gels (régression critique) | 2 |
| Caps gels (palier + horaire) | 4 |
| Hydratation plages + F<55kg | 4 |
| Sodium ration mg/h palier | 4 |
| Mode Premier ultra dédié | 4 |
| Protéines par palier BV-centric | 5 |
| Solides liste élargie | 5 |
| Warnings cliniques | 7 |
| Bases de vie seuils | 5 |
| Œuf dur / saucisson restriction BV | 2 |
| Profils référence (tests 11 profils) | 4 |
| Champs CalcResult V2 exposés | 5 |
| Doctrine pas de poids dans output | 1 |

## Vérification 11 profils (chiffres clés)

| Profil | Distance | D+ | Durée | Palier V2 | Gels V2 | BV reco |
|---|---|---|---|---|---|---|
| #1 | 10 km | 500 | 1h05 | Court | 0-1 | 0 |
| #2 | 27 km | 1500 | 3h50 | Moyen | 3-4 | 0 |
| #3 | 27 km | 3000 | 4h45 | Moyen | 4-6 | 0-1 |
| #4 | 47 km | 3000 | 7h30 | Long | 6-12 | 1 |
| #5 | 55 km | 4000 | 9h40 | TrèsLong | 12-15 | 2 |
| #6 | 75 km | 4300 | 14h | TrèsLong | 15-20 | 2 |
| #7 | 100 km | 6500 | 19h | Ultra | 14-28 | 3 |
| #8 | 130 km | 7500 | 27h | Ultra | 20-30 | 4-5 |

**Bug 27 km résolu** : Profil #2 passe de 14 gels (V1) à 3-7 gels (V2) — alignement
physiologique avec apport boisson isotonique réel.

## Build

```
npm run build
✓ 39 routes prerendered, 0 errors
✓ TypeScript : aucune erreur
✓ Vite production bundle OK
```

## Commit local

```
git add -A
git commit -m "feat(nutrition-trail): refonte V2 finale 5 paliers + sodium + ratio G:F + 22 ajustements 3 experts"
```

Branch `main` ahead origin by 1.

## Compatibilité

- Exports préservés : `computeNutrition`, `carbsByTrailDuration`, `hydrationByProfil`,
  `sodiumByProfil`, `caffeineDose`, `distanceEquivalenteITRA`, `kcalPerHourTrail`,
  `KCAL_PER_HOUR_TRAIL_CAP`.
- Signature `computeNutrition()` : ajout d'un paramètre OPTIONNEL `isPremierUltra` (rétrocompat).
- `CalcResult` enrichi (champs additifs) — aucun champ supprimé/renommé.
- Tests baseline trail (47) inchangés et VERTS.

## Doctrine respectée

- `feedback_outil_nutrition_chiffres_ok_hors_plan` : chiffres OK dans cet outil (palier, mg/h, g/h, mL/h).
- `feedback_jamais_poids_minceur` : zéro mention poids/IMC/minceur dans tous les wordings UX
  (test `JSON.stringify(r)` exclut `/poids|weight|imc/i`).
- `feedback_chaque_ligne_justifiee` : chaque ligne de code commentée avec sa justification expert.
- `feedback_copier_outils_existants_comme_base` : structure monolithique conservée (pas d'abstraction).

## À valider avant push

1. Romane relit le rapport et le diff (`git show HEAD --stat`).
2. Smoke test manuel UI : `npm run dev` → /outils/nutrition-trail
   - Checkbox "Premier ultra" visible
   - Panneau "Palier détecté" affiché
   - Cartes "Règles cliniques" + "Solides recommandés" affichées
3. Décision deploy (PAS de push sans GO).
