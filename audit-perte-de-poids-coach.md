# Audit coach — Programme Perte de Poids 12 sem (ID 1778521479387)

**Profil athlète :** Homme 38 ans • 172 cm / 70 kg • **IMC 23.7** (normal) •
Niveau « Confirmé (Compétition) » • **Marathon 3h10 / Semi 1h34** •
VMA 16.17 km/h (recalculée) • 3 séances/sem • 2h+ dispo •
Pas de blessure • Mardi/Jeudi/Dimanche • Saint-Pierre-de-Côle.

**Verdict global : C — plan inadapté à l'athlète et défaillant techniquement.**

---

## 🔴 Problèmes critiques (par ordre de gravité)

### 1. Calibrage volume totalement inadapté au niveau athlète
Volume moyen réel : **16,7 km/sem** sur 12 semaines (oscille entre 14 et 19).

Pour un coureur **Marathon 3h10** :
- Volume baseline minimum attendu : 45–55 km/sem
- Volume cible perte de poids (déficit calorique par course) : 50–70 km/sem
- Le plan propose **3× moins** que ce qu'il fait probablement déjà au quotidien.

À ~16 km/sem × 700 kcal/h × ~1.5h = **~1000 kcal brûlées/sem en course**, soit
~130 g de gras théorique. Insuffisant comme stimulus métabolique unique.

### 2. Le pipeline ne respecte PAS sa propre périodisation
| Sem | Phase déclarée | Vol cible | Vol réel | Écart |
|-----|----------------|----------:|---------:|------:|
| 1   | fondamental    | 30        | 19       | **−38%** |
| 2   | fondamental    | 33        | 18       | **−44%** |
| 3   | fondamental    | 35        | 16       | **−53%** |
| 7   | développement  | 35        | 14       | **−59%** |
| 11  | développement  | 35        | 17       | **−51%** |

Confirmé par `guardStats.volumeScaledDown: 11` et `postValidatorFixes: 12` —
le guard réduit systématiquement les volumes en post-validation. **Bug structurel :
le générateur ou le validateur sous-dimensionne les séances vs le plan théorique.**

### 3. Aucune progression sur 12 semaines
Volumes réels : `19, 18, 16, 19, 16, 16, 14, 16, 14, 17, 17, 19`.

C'est un **plateau**, pas une périodisation. Les phases « fondamental →
développement » sont cosmétiques : mêmes séances, mêmes allures, même volume.
La règle des 10 % n'a aucun sens à appliquer ici puisqu'il n'y a pas de progression.

### 4. Incohérence distance × allure ≠ durée — 15 / 24 séances
| Sem | Séance | km | Allure | Durée attendue | Durée déclarée | Écart |
|-----|--------|---:|--------|---------------:|---------------:|------:|
| S3 Mardi | Footing Vallonné | 8,2 | 5:32 | 45 min | 70 min | **+54%** |
| S6 Dim | SL Collines | 8,0 | 5:32 | 44 min | 70 min | **+58%** |
| S7 Dim | SL Sentiers | 7,1 | 5:32 | 39 min | 70 min | **+78%** |
| S10 Dim | SL Berges | 8,4 | 5:32 | 46 min | 70 min | **+51%** |

Cause probable : la durée affichée inclut warmup + main + cooldown, mais la
distance n'inclut que le main set — alors que l'allure affichée est celle du main.
L'utilisateur lit des chiffres incohérents → perte de crédibilité immédiate.

### 5. Aucune séance qualité sur 12 semaines
Allures pratiquées : `5:32` (EF, 67%VMA) et `6:11` (récup, 60%VMA).
- 0 séance à seuil (cible 85–90%VMA, 4:16 prévue dans `paces.seuilPace`)
- 0 séance VMA (cible 95–105%, 3:43 prévue dans `paces.vmaPace`)
- 0 séance à allure spécifique

Les séances étiquetées **« Fractionné »** (S6, S7, S9, S10) ont une allure
cible EF avec « accélérations » — c'est du fartlek très léger, pas du fractionné.

Pour un confirmé : perdre du poids **sans** maintenir l'économie de course
casse les acquis. Au minimum 1 séance allure soutenue / 10 jours.

### 6. Toutes les sorties étiquetées « Sortie Longue » (29/36 séances)
Une SL est définie par sa durée relative à la semaine (~25–35 % du volume hebdo).
Ici, le Mardi et le Dimanche font la même distance/durée → une seule des deux
est une vraie SL. Tagging des types de séance défaillant.

### 7. Fréquence réelle = 2 séances course (vs 3 déclarées)
3 séances/sem = 2 course + 1 renfo. Acceptable si explicité côté UI, mais
incohérent avec la périodisation théorique qui suppose 3 séances course.

---

## 🟡 Points de vigilance

### 8. Allure « Récupération » à 6:11 min/km (60% VMA) trop lente
À 60 % VMA pour un coureur dont l'EF est à 67 %, c'est de la marche-jogging.
Aucun stimulus cardio. En semaine de décharge (S4, S8), il vaut mieux
**réduire le volume** que **ralentir l'allure**.

### 9. Plan 12 semaines pour objectif « Finisher / Perte de poids »
Aucun pic, aucun test, aucun affûtage. Si pas de course cible → un plan
glissant 4-semaines récurrent serait plus pertinent qu'un programme fini.

### 10. Renforcement = HIIT pliométrique
Squats sautés, fentes sautées : OK pour IMC 23.7, mais lourd 1×/semaine
sur 12 semaines sans variation (toujours le « Circuit Métabolique HIIT »).
Manque travail force lente (gainage isométrique, force fonctionnelle).

### 11. Champ `coachTip` vide pour 24/24 séances
Champ `advice` rempli, mais `coachTip` absent. Soit redondance, soit feature
prévue non implémentée.

---

## ✅ Points positifs à conserver

- **Périodisation théorique présente** : phases fond/dév/récup, décharges S4 et S8 ✓
- **VMA recalculée intelligemment** depuis records (semi 1h34, marathon 3h10) ✓
- **Feasibility check présent** avec safetyWarning (mention médecin) ✓
- **warmup / cooldown 24/24 séances** ✓
- **`mainSet` toujours décrit** avec consignes claires ✓
- **`locationSuggestion` personnalisé** à Saint-Pierre-de-Côle ✓
- **Renforcement = HIIT métabolique** : pertinent pour perte de poids (afterburn) ✓
- **`guardStats` instrumenté** : on voit ce que le validateur a corrigé ✓

---

## 📌 Recommandations actionables (par priorité)

### Priorité 1 — Corriger le générateur de séances
1. **Calibrer le volume au niveau athlète** : utiliser `currentVolume`, ou à
   défaut, des heuristiques par VMA × fréquence × niveau. Pour VMA 16+ et
   « Confirmé », plancher 35 km/sem minimum.
2. **Faire respecter `periodizationPlan.weeklyVolumes`** : si le validateur
   doit réduire de 50 % toutes les semaines, c'est que le plan théorique
   n'est jamais réalisable → revoir l'algo de génération ou le plan.
3. **Cohérence distance × allure = durée** : imposer une contrainte dure
   en post-validation. `Math.abs(km × paceSec/60 − durMin) / durMin < 0.08`.
4. **Clarifier ce que `duration` inclut** : warmup + main + cooldown ?
   Si oui, la distance doit inclure aussi. Si non, indiquer « hors W/U + C/D ».

### Priorité 2 — Qualité pédagogique
5. **Imposer 1 séance qualité / 10 jours** quand niveau ≥ Confirmé,
   même en plan « perte de poids ». Sinon perte des acquis aérobie.
6. **Différencier vraiment fondamental / développement** : intensité, volume,
   ou type de séance. Sans cela, la périodisation est cosmétique.
7. **Tagger correctement les séances** : 1 seule SL par semaine. Le reste
   en « EF » ou « Footing ». Idéalement, la SL = 30–35 % du volume hebdo.
8. **En décharge** : −20 à −30 % de volume, pas −20 % d'allure.

### Priorité 3 — Spécificité « perte de poids »
9. **Augmenter la fréquence** (4-5 séances/sem) ou **ajouter cross-training**
   non couru pour atteindre déficit calorique pertinent.
10. **Ajouter une dimension nutrition** dans le `welcomeMessage` (le coach
    doit rappeler qu'80 % du déficit vient de l'alimentation).
11. **Pas de date de fin si pas de course** : plan glissant 4 semaines avec
    auto-régénération sur retours utilisateur.

### Priorité 4 — Robustesse pipeline
12. **Logger `guardStats` agressivement** et alerter dès que
    `volumeScaledDown > N/2` (cas actuel : 11/12).
13. **Re-générer la séance** si écart distance×allure-durée > 15 %, plutôt
    que de l'envoyer en l'état.
14. **Champ `coachTip`** : soit le supprimer, soit le remplir avec un conseil
    spécifique par type de séance (différent de `advice` qui est générique).

---

## 🎯 Conclusion coach (en une phrase)

> *Bonne intention, structure prometteuse, mais le générateur livre un plan
> 3× sous-dimensionné pour le niveau de l'athlète, avec des séances dont les
> chiffres ne sont pas cohérents entre eux et zéro travail de qualité —
> un coureur confirmé qui suit ce plan régresse.*
