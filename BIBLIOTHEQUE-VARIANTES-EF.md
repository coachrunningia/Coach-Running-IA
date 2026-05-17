# Bibliothèque de variantes — Footing aérobie / Endurance fondamentale

> Validée par agent coach expert. Objectif : casser la monotonie des footings EF
> des premières semaines. C'est **purement décoratif** — on ne change que
> l'habillage (titre, warmup, mainSet, cooldown, advice). La structure de la
> séance (durée, distance, intensité, **dénivelé**) reste TOUJOURS intacte.
> Tout reste 100 % en zone aérobie EF : la variété vient de la FORME.

## Règle musclée — le terrain de la séance est sacré

Chaque variante a un `terrain` : `flat` ou `relief`.

- Séance avec **D+ voulu** (`elevationGain > 0` ou titre vallonné/côte/D+) → pool **relief uniquement**. Ne peut jamais être rendue plate.
- Séance **plate** (`elevationGain === 0`, titre neutre) → pool **flat uniquement**.

On ne mélange jamais les terrains : aucun ajout ni retrait de dénivelé. Un plan trail à 3000/4000 D+ avec 3 séances vallonnées/semaine garde ses 3 séances, chacune recevant une variante relief **différente**.

**Hors scope total** : débutants (séances Marche/Course) — ils alternent déjà marche et course.

## Pool PLAT (6 variantes)

| Slug | Titre affiché | Univ. | Contre-indications | goalFit |
|---|---|---|---|---|
| `footing_classique` | Footing en endurance fondamentale | ✓ | aucune | all |
| `footing_negative_split` | Footing progressif (négative split) | ✓ | aucune | all |
| `footing_fractionne_marche` | Footing en blocs souples | ✓ | aucune | all |
| `footing_lignes_droites` | Footing + lignes droites | — | hasMuscleTear, beginner | Route, Maintien |
| `footing_educatifs` | Footing + gammes athlétiques | — | hasJointInjury, hasKneeInjury, hasAnkleInjury, hasMuscleTear, beginner | Trail, Route, Maintien |
| `footing_fartlek_souple` | Footing au ressenti (fartlek doux) | — | beginner | Trail, Route, Maintien |

## Pool RELIEF (4 variantes)

| Slug | Titre affiché | Contre-indications | goalFit |
|---|---|---|---|
| `footing_cotes_douces` | Footing vallonné | hasJointInjury, hasKneeInjury, isOverweight, isSenior60 | Trail, Route, Maintien |
| `footing_cotes_courtes_marche` | Footing vallonné, côtes en marche | hasKneeInjury | Trail, Route, Maintien |
| `footing_terrain_varie` | Footing nature, terrain varié | hasAnkleInjury, hasJointInjury, isSenior60, beginner | Trail, Maintien |
| `footing_sentier_roulant` | Footing sur sentier roulant | hasAnkleInjury, beginner | Trail, Maintien |

## Pourquoi des contre-indications

- **IMC élevé (`isOverweight`)** : exclut `footing_cotes_douces` — montée chargée + descente excentrique = facteur de risque articulaire. Les autres variantes relief restent accessibles (`cotes_courtes_marche` = montée en marche, `sentier_roulant` = D+ diffus sans pic excentrique). Filtre **silencieux** : aucune mention du poids dans les messages.
- **Senior 60+** : exclut `cotes_douces` et `terrain_varie` — descente excentrique marquée + sol irrégulier. Garde `cotes_courtes_marche` et `sentier_roulant`.
- **Blessure genou/articulaire** : exclut côtes et terrain technique (charge + travail excentrique).
- **Blessure cheville** : exclut terrain varié et sentier (sollicitation proprioceptive, risque d'entorse).
- **Déchirure musculaire** : exclut lignes droites et éducatifs (pics de tension).
- **Débutant** : exclut tout ce qui demande un dosage d'allure au ressenti ou un bagage technique — mais de toute façon hors scope (Marche/Course).

## Rotation / fréquence

Rotation déterministe `(weekNumber - 1) + sessionIndex + seedOffset` sur le pool éligible :
- 2 footings d'une même semaine reçoivent des variantes différentes (`sessionIndex`) ;
- 2 plans ne démarrent pas sur la même variante (`seedOffset` dérivé du planId) ;
- interleave universelles / conditionnelles → pas 3 footings de base d'affilée.

## Fallback (jamais de violation du terrain)

- Séance plate sans variante éligible → `footing_classique` (passe toujours).
- Séance relief sans variante éligible (profil très contraint) → on **garde le relief** et on pioche la variante relief la **moins contre-indiquée**. On ne flatten jamais.

## Cas limites validés (dry-run 10 derniers plans, 27/27 cohérents)

- **Trail + hasJointInjury + hasAnkleInjury** (adrien) → seul `cotes_courtes_marche` éligible en relief : les séances vallonnées le reçoivent (diversité réduite mais sécurité respectée, jamais de séance plate).
- **Trail senior 62 ans** (albertpiro) → `cotes_courtes_marche` + `sentier_roulant`, variantes relief douces.
- **Route, séance titrée "vallonné" mais D+0** → le regex titre la détecte comme relief → reçoit une variante relief cohérente (la structure D+0 décidée par le générateur reste intacte).
