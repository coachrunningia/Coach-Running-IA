# F-17 — Recalibrer mes allures (Audit Coach FFA 20 ans)

## Verdict global
Mapping globalement cohérent avec Daniels (VDOT) et école FFA (Cottereau / Billat / Gindre). **3 ajustements nécessaires** sur SL, Tempo et Spécifique Marathon. Le reste tient la route.

## Référentiel croisé (FFA + Daniels VDOT + Billat)
- Daniels parle en %VO2max → conversion en %VMA via : `%VMA ≈ %VO2max + 6 à 8 points` (E=59→65%VMA, M=75-84%VO2 → 78-85%VMA, T=83-88%VO2 → 85-90%VMA, I=95-100%VO2 → 95-100%VMA, R=105-120%VO2 → 105-115%VMA).
- FFA piste : VMA = 100% sur 6 min ; allure 10K ≈ 92-95% VMA ; seuil ≈ 85-88% VMA ; SL classique 65-72% VMA.
- Billat : EF utile = 60-70% VMA. En-dessous = trop bas (perte stimulus aérobie), au-dessus = dérive lactique sur sortie longue.

## Tableau finalisé séance → % VMA

| Séance | % VMA Débutant | % VMA Confirmé | % VMA Expert | Notes coach |
|---|---|---|---|---|
| Récup / décrassage | 60-65% | 60-65% | 60-65% | Allure conversation, FC < 70% FCM. |
| Footing / EF | **65-70%** | 68-72% | 70-74% | Proposition 67% OK mais **borne basse Débutant**, monte à 70-74% chez l'Expert (zone "EF haute" Daniels). |
| Sortie Longue (SL) | **65-70%** progressif | 68-72% progressif | 70-75% progressif | Proposition 68-72% **OK pour SL "vanilla"**. Le split 67%→72% style Maffetone est cohérent. **NE PAS dépasser 75% VMA même Expert** (sinon SL devient tempo long → blessure). |
| SL avec finish HMP/MP | dernière fraction 75-80% | 78-82% | 80-83% | Cas spécifique semi/marathon en phase spécifique. |
| Tempo (continu 20-40 min) | **78-82%** | 80-84% | 82-86% | Proposition 80-85% **OK Confirmé/Expert**. **Pour Débutant : baisser à 78-82%** sinon dérive lactique → séance ratée. |
| Seuil (cruise/par fractions) | 83-86% | 85-88% | 87-90% | Proposition 85-88% **OK**. Format 2×20 ou 3-5×6-10 min r=1-2 min. |
| Allure spécifique Marathon (MP) | **72-76%** | 75-80% | 78-82% | **Proposition 75-80% trop haute pour Débutant Marathon** (terminerait épuisé en S8). Calibrer plutôt sur chrono visé que sur %VMA brut. |
| Allure spécifique Semi (HMP) | 82-85% | 84-88% | 86-89% | Proposition 85% **OK milieu de fourchette**. |
| Allure spécifique 10K | 90-93% | 92-95% | 94-96% | Proposition 95% **OK Confirmé+**, abaisser à 90-93% Débutant. |
| Allure spécifique 5K | 95-98% | 96-100% | 98-102% | À ajouter si plan 5K. |
| Fractionné long VO2 (3-5 min) | **92-95%** | 95-100% | 98-102% | Proposition 92-96% **OK Débutant/Confirmé**. Expert peut taper 100-102%. |
| Fractionné court VMA (30s-2 min) | 100-105% | 102-108% | 105-115% | Proposition 100-105% **OK Débutant**. Expert va jusqu'à 110-115% sur 200-400m. |
| Lignes droites / strides (10-20s) | 110-120% | 115-125% | 120-130% | À expliciter dans la grille si on en programme. |
| Marche active (cycles) | — | — | — | Pas d'allure cible. FC < 70% FCM. Mode Débutants/petite VMA uniquement (cf. doctrine projet). |

## 3 écueils classiques à éviter

1. **SL trop rapide = blessure n°1 du coureur amateur.** Plafonner SL à 75% VMA *même* chez l'Expert. Le bénéfice aérobie d'une SL vient de la **durée**, pas de l'intensité. Au-delà de 75% VMA on transforme une SL en tempo long → fatigue cumulée, charge ingérable, risque tendineux (Achille, soléaire) ×2.
2. **Tempo trop lent = stimulus seuil raté.** Si le coureur tourne à 75% VMA en croyant faire un "tempo", il fait juste un footing rapide. Le seuil lactique se travaille **à partir de 83% VMA minimum** (Confirmé/Expert). Vérifier que `tempoPace` ≠ `efPace` (écart minimum 25-35 s/km).
3. **VMA dérivée d'un test trop ancien = allures fausses.** Une VMA bouge de ±0,5 km/h en 4-6 semaines de bloc qualité. Recalibrer sur une VMA > 8 semaines = soit allures trop dures (VMA réelle plus basse → blessure), soit trop molles (VMA réelle plus haute → pas de progrès). **Borne F-17 : recalibrage autorisé si nouveau test < 8 semaines.**

## Tolérance recommandée

- **± 5 s/km** sur EF / Récup / SL (zone aérobie large, l'organisme tolère).
- **± 3 s/km** sur Tempo / Seuil (fenêtre métabolique étroite, ±3 s = passage entre 2 zones).
- **± 2 s/km** sur VMA / spécifique 5K-10K (intensité haute, peu de marge).
- En trail / dénivelé : abandonner s/km, passer en **FC ou RPE** (cohérent avec doctrine D16 modificateur D+).

## 1 reco UX coach (livrable F-17)

**Afficher un encart "Pourquoi tes allures changent"** au moment du recalibrage, format 3 lignes max :
> Ta nouvelle VMA = X,X km/h (+0,4 vs précédente).
> Tes allures Seuil et VMA accélèrent de ~5 s/km. Ton EF et SL accélèrent de ~3 s/km.
> Ton allure chrono objectif reste **identique** (c'est ta cible, pas une allure d'entraînement). [D1 respectée]

**+ Garde-fou silencieux back** : si delta VMA > +1 km/h en < 8 semaines → flag suspect (test raté ou auto-déclaratif gonflé), demander confirmation avant d'écraser les allures du plan en cours.

---
*Coach FFA — 2026-05-27*
