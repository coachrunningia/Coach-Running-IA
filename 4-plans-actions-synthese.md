# Synthèse 6 actions — Suite audit 4 plans (Delph, Al1, Sandy, Sacha)

Document de référence pour validation par Coach expert + PM senior.

---

## Contexte rappel

4 plans audités le 16/05/2026 :
- **Delph** (delphine2107) : 55yo F, mara 4h30 12 sem, vol curr 30, freq 5, niveau Conf déclaré (sans chrono saisi → VMA estimée 12,31 km/h)
- **Al1 Kasongo** : 45yo H Conf, semi 1h30 22 sem, vol curr 60, freq 4, chronos cohérents (10k 43, semi 1h34, mara 3h31)
- **Sandy (Nanarebelle)** : 35yo F IMC 27, PdP 12 sem Finisher, vol curr inconnu, freq 3, "Confirmé" déclaré mais chronos = Débutante (5k 31, 10k 1h03)
- **Sacha** : 25yo H, semi 1h25 18 sem, vol 50, freq 5, "Expert" déclaré mais 10k 38:13 = Confirmé (patches Sprint 1 déjà appliqués)

6 problèmes identifiés → 6 actions proposées :

---

## ACTION 1 (CODE) — Détection footingVariants élargie

### Constat
`footingVariants` (variantes de footing pour casser la monotonie) ne s'applique qu'aux sessions `type === 'Jogging'` strict (`geminiService.ts:3871` et `4548`). Gemini mistype parfois des footings progressifs en "Sortie Longue" → variation perdue.

### Exemple
Al1 S1 Mardi : "Sortie Longue · Footing progressif" 17,9 km / 1h45. Mistype Gemini. Résultat : 2 SL la même semaine (Mardi + Dimanche), surcharge sur 2 weekends consécutifs.

### Patch proposé
Élargir détection comme on a fait pour `enforceSLDay` :
```ts
if (
  (session.type === 'Jogging' || /footing|fartlek/i.test(session.title || '')) &&
  (session.intensity === 'Facile' || !session.intensity) &&
  parseDurationMin(session.duration) < 75  // au-delà = vraie SL
) {
  // appliquer buildFootingVariant
}
```
+ retyper la session en `'Jogging'` à la passe.

### Risque
Bas — si une vraie SL est retypée par erreur, l'enforcement SL (post-Sprint 1) la corrige après.

### Lignes
~8 lignes modifiées (pas d'ajout)

---

## ACTION 2 (CODE) — Plancher SL peak Marathon/Semi pour Finisher

### Constat
`MIN_SL_PROPORTION Marathon = 33%` produit pour Delph (peak vol 45) une SL peak théorique de 15 km. **Insuffisant pour préparer un marathon 42 km** (norme Pfitzinger : SL peak = 70-85% durée course = 24-28 km min).

### Patch proposé
Pour Marathon Finisher, plancher absolu : `slPeak = max(0.50 × peakVol, 22 km)` (mais cap à 28 km pour ne pas exploser).
Pour Semi Finisher : `slPeak = max(0.45 × peakVol, 14 km)` (cap 18 km).

Ajout dans `calculatePeriodizationPlan` après le calcul de peakVol :
```ts
if (objective === 'Marathon' && isFinisher) {
  const slFloor = Math.min(28, Math.max(22, Math.round(peakVolumeKm * 0.50)));
  // utilisé downstream pour cibler la SL peak
}
```

### Risque
Modéré — toucher au calcul peakVol. À snapshot test avant déploiement sur 5 profils mara.

### Lignes
~15 lignes (ajout règle ciblée)

---

## ACTION 3 (CODE) — Cap MAX_WEEKLY_VOLUME +15% si chrono ambitieux

### Constat
`MAX_WEEKLY_VOLUME Semi conf = 60` plafonne Al1 (vol curr 60 → peak 60 = aucune progression possible) et Sacha (vol 50 → peak 60 = +20% mais limité).

Pour viser **sub-1h30 semi (Al1) ou sub-1h25 (Sacha)**, norme coach Pfitzinger = **70-80 km/sem** au peak.

### Patch proposé
Dans `calculatePeriodizationPlan`, si `targetTime` présent ET niveau ≥ Confirmé :
- Semi cap : 60 → **70**
- Marathon cap : 75 → **85**
- 10K cap : 55 → **65**

Reste à 60/75/55 pour Finisher (sans chrono).

```ts
const hasChronoTarget = !isFinisherTarget(targetTime);
const isHighLevel = ['conf', 'expert'].includes(levelKey);
const capBoost = (hasChronoTarget && isHighLevel) ? 1.15 : 1.0;
maxVolume = Math.round(MAX_WEEKLY_VOLUME[objective][levelKey] * capBoost);
```

### Risque
Modéré — augmenter le cap pourrait sur-doser certains profils. **Mitigation** : on garde le cap VMA-durée (qui plafonne par capacité physique réelle).

### Lignes
~6 lignes

---

## ACTION 4 (BASE) — Al1 retyper Mardi Sortie Longue → Jogging

### Constat
Mardi S1 typée "Sortie Longue" mais contenu = "Footing progressif" + 17,9 km. 2e SL la même semaine que Dimanche.

### Patch base
- `weeks[0].sessions[Mardi].type = 'Jogging'`
- Conserver le contenu (durée, distance, main set) — ce n'est qu'un type
- Recalculer total km hebdo : inchangé

### Risque
Nul

### Effort
1 min (1 PATCH Firestore)

---

## ACTION 5 (BASE) — Sandy remplacer plio par low-impact

### Constat
Renfo S1 Lundi : `Squats sautés (3×11), Fentes sautées alternées (3×9/jambe), Mountain climbers (3×18)`. **Inapproprié** pour débutante IMC 27 (risque articulaire).

### Cause
Plan créé avant Sprint 1 → `level="Confirmé"` (déclaré) au lieu de `"Débutant"` (effectif chronos). `renfoService.ts:495` exclut plio si débutant → Sandy passait à travers.

### Patch base
Remplacer les exercices plio par version low-impact :
- Squats sautés (3×11) → **Squats poids du corps (3×15)**
- Fentes sautées (3×9/jambe) → **Fentes marchées (3×10/jambe)**
- Mountain climbers (3×18) → **Marche dynamique sur place + montées de genoux modérées (3×30s)**
- Garder : Fentes marchées (déjà OK)

### Risque
Nul (substitution low-impact uniforme)

### Effort
5 min

---

## ACTION 6 (BASE) — Sandy varier les 2 marche-course

### Constat
Mercredi et Dimanche : structure **strictement identique** (16 cycles × 3 min). Monotonie démotivante pour débutante.

### Patch base
- **Mercredi** garde : `16 × (1 min course EF + 2 min marche récup)` → standard introduction
- **Dimanche** devient : **structure pyramide** :
  - 5 × (1 min course + 1 min marche) — échauffement progressif
  - 4 × (2 min course + 1 min marche) — phase principale
  - 5 × (1 min course + 1 min marche) — décroissance
  → variation effort, total ≈ 45 min, même volume km
- Renommer titre Dimanche : "Sortie Longue Pyramide — Variation Marche/Course"
- Adapter le main set + advice

### Risque
Nul

### Effort
5 min

### Note importante
PAS de patch code (pas de bibliothèque marche-course créée). On attend si d'autres utilisateurs PdP débutants se plaignent de monotonie avant de coder une bibliothèque (règle d'or : pas d'ajout de helper sans 20 lignes supprimées net).

---

# RÉCAP

| # | Type | Action | Effort | Risque | Lignes |
|---|---|---|---|---|---|
| 1 | CODE | Détection footingVariants élargie | XS | Bas | ~8 |
| 2 | CODE | Plancher SL peak mara/semi finisher | S | Modéré | ~15 |
| 3 | CODE | Cap MAX_WEEKLY_VOLUME +15% si chrono | XS | Modéré | ~6 |
| 4 | BASE | Al1 retyper Mardi → Jogging | 1 min | Nul | 0 |
| 5 | BASE | Sandy renfo low-impact | 5 min | Nul | 0 |
| 6 | BASE | Sandy varier 2 marche-course | 5 min | Nul | 0 |

**Total code ajouté : ~29 lignes nettes**
**Bilan vs Sprint 2 refacto prévu (−170 lignes) : bilan global −141 lignes** ✅ conforme à la règle d'or.

---

# Contraintes produit non négociables (rappel)

- ❌ Aucune mention IMC/poids/minceur/cross-training dans messages utilisateur
- ❌ Pas de programme nutrition chiffrée
- ❌ Hyrox = course uniquement
- ✅ Sécurité > conversion
- ✅ Calibrage allures sur VMA actuelle, pas cible
- ⚠️ Contrainte présente (NON dogme) : éviter d'ajouter du code pour le plaisir. MAIS si l'ajout apporte une valeur démontrable (conversion utilisateur, sécurité, expérience débutant), c'est justifié. La règle est : "Justifier l'ajout par la valeur métier", pas "ne jamais ajouter".
