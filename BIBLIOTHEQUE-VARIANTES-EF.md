# Bibliothèque de variantes — Footing aérobie / Endurance fondamentale

> Validée par agent coach expert. Objectif : casser la monotonie de la phase
> fondamentale en gardant 100 % du travail en zone aérobie. La variété vient
> de la FORME, jamais de l'intensité.

## Socle universel (4 variantes — passent tous les filtres)

| Slug | Titre affiché | Durée | Contre-indications |
|---|---|---|---|
| `footing_classique` | Footing en endurance fondamentale | 35-50 min | aucune |
| `footing_negative_split` | Footing progressif (négative split) | 40-50 min | aucune |
| `footing_fractionne_marche` | Footing en blocs souples | 35-55 min | aucune |
| `footing_lignes_droites` | Footing + lignes droites | 40-50 min | aucune |

## Variantes conditionnelles (4 variantes)

| Slug | Titre affiché | Durée | Contre-indications | goalFit |
|---|---|---|---|---|
| `footing_educatifs` | Footing + gammes athlétiques | 45-55 min | jointInjury, kneeInjury, ankleInjury, muscleTear, isOverweight, beginner | Trail, Route, Maintien |
| `footing_cotes_douces` | Footing vallonné | 45-55 min | jointInjury, kneeInjury, isOverweight, isSenior60 | Trail, Route, Maintien |
| `footing_terrain_varie` | Footing nature, terrain varié | 45-55 min | ankleInjury, jointInjury | Trail, Route, Maintien, PerteDePoids |
| `footing_fartlek_souple` | Footing au ressenti (fartlek doux) | 45-50 min | beginner | Trail, Route, Maintien, PerteDePoids |

## Détail des structures

### 1. footing_classique (universal)
- Warmup : 5 min marche active + montée progressive vers EF
- MainSet : 25-40 min EF, allure régulière confortable, conversation possible
- Cooldown : 5 min footing très lent puis marche
- Advice : Construit le moteur aérobie (capillarisation, cœur, tendons). La régularité de l'allure est l'objectif.

### 2. footing_negative_split (universal)
- Warmup : 5 min marche + 5 min footing très lent
- MainSet : 30 min en 2 moitiés — 1ère en bas de l'EF, 2ème en haut de l'EF (toujours conversationnel)
- Cooldown : 5 min footing lent + marche
- Advice : Apprendre à finir mieux qu'on a commencé — gestion d'effort. Reste en aérobie.

### 3. footing_fractionne_marche (universal)
- Warmup : 5 min marche active
- MainSet : 5-8 blocs de 5 min footing EF, entrecoupés de 1 min marche
- Cooldown : 5 min marche
- Advice : Découper l'effort accumule du volume aérobie en réduisant la charge mécanique. Idéal pour progresser sans casser.

### 4. footing_lignes_droites (universal)
- Warmup : 5 min marche + 10 min footing EF
- MainSet : 20-30 min footing EF puis 4-6 lignes droites (~60-80m, accélération souple/progressive, récup complète)
- Cooldown : 5 min footing lent + marche
- Advice : Réveillent la coordination sans coût cardiovasculaire — trop courtes pour être du travail de vitesse.

### 5. footing_educatifs (conditionnel)
- Warmup : 5 min marche + 10 min footing EF
- MainSet : 20-25 min footing EF puis circuit éducatifs (talons-fesses, montées genoux, pas chassés, foulées bondissantes légères, jambes tendues — 2x20-30m chacun)
- Cooldown : 5 min footing lent + marche
- Advice : Améliore l'économie de course et la qualité de foulée.
- Exclu si : blessure articulaire/genou/cheville, déchirure musculaire, IMC élevé, débutant (impact des bondissements + besoin de bagage technique)

### 6. footing_cotes_douces (conditionnel)
- Warmup : 10 min footing EF sur plat
- MainSet : 25-35 min parcours légèrement vallonné — montée: foulée courte effort EF maintenu / descente: relâché contrôlé. Pas de côte raide.
- Cooldown : 5-10 min footing plat + marche
- Advice : Le relief renforce les chaînes musculaires naturellement. L'effort reste constant, pas la vitesse.
- Exclu si : blessure articulaire/genou, IMC élevé, senior 60+ (descente = travail excentrique + contraintes genou)

### 7. footing_terrain_varie (conditionnel)
- Warmup : 10 min footing EF sur chemin roulant
- MainSet : 25-35 min terrain varié non technique (chemins, sentiers larges, herbe, sous-bois). Éviter racines/cailloux/dévers.
- Cooldown : 5-10 min terrain roulant + marche
- Advice : Sollicite les stabilisateurs et la proprioception en douceur. Renforcement "gratuit".
- Exclu si : blessure cheville, blessure articulaire (irrégularités du sol). Note: le sol meuble RÉDUIT l'impact → pertinent perte de poids.

### 8. footing_fartlek_souple (conditionnel)
- Warmup : 10 min footing EF
- MainSet : 25-30 min alternance libre au ressenti entre bas et haut de l'EF (jamais d'essoufflement, conversationnel partout)
- Cooldown : 5 min footing lent + marche
- Advice : Écouter ses sensations plutôt que sa montre. Jeu d'allure 100% aérobie.
- Exclu si : débutant (risque de transformer les portions toniques en allure trop élevée sans repère)

## Cas limites validés

- **Profil ultra-contraint** (PerteDePoids + isOverweight + hasKneeInjury + beginner) → conserve les 4 universelles. Jamais "footing classique" en boucle.
- **Trail non blessé** → accède à terrain_varie, cotes_douces, fartlek_souple (spécificité).
- **Senior 60+ sans blessure** → perd cotes_douces, garde 4 universelles + educatifs + terrain_varie + fartlek_souple.
- **Règle poids** : isOverweight agit comme filtre SILENCIEUX — le coureur reçoit juste une autre variante, aucune mention.
