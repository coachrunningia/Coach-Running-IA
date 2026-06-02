# F-18 — PM CHALLENGE POST-DEPLOY (Romane 28/05)

> **TL;DR — VERDICT : GO PATCH (modulateur safety urgent).** F-18 force un plancher pic agressif sur des profils fragiles (BMI 30+, hasInjury, age ≥ 55), en bypassant **2 garde-fous existants** (`effectiveVmaCap`, garde-fou pic « plafonné à +20%/sem »). Risque blessure réel sur 4 cas concrets identifiés. **Revert NON** (le bug Coralie/Cyrielle reste prioritaire), **PATCH OUI** (modulateur safety sur MIN_WEEKLY_VOLUME).

---

## Q1 — F-18 écrase-t-il les protections existantes ?

| Protection existante | File:line | Module qui ? | F-18 écrase ? |
|---|---|---|---|
| **hasInjury → -volume** | `geminiService.ts:4044, 4582, 5672` | **Non, jamais.** Injecte uniquement texte LLM (welcomeMessage + prompt warning). AUCUN facteur volume hebdo réduit. | N/A (vide à l'origine) |
| **BMI ≥ 35 → -35% pic** | `geminiService.ts:2973-2975` | `totalReduction *= 0.65` sur `maxVolume` | **OUI** : F-18 L3213 remonte minPeakVolume au plancher table **après** réduction BMI. Le ×0.65 est annulé. |
| **BMI 30-35 → -20% pic** | `geminiService.ts:2976-2978` | `totalReduction *= 0.80` | **OUI** : idem. |
| **BMI ≥ 35 → rate ≤ 5%/sem** | `geminiService.ts:2840-2842` | progressionRate plafonné | **PARTIELLEMENT** : F-18 (B) garde-fou pic L3527 plafonne `adjustedRate ≤ 0.20` → peut **quadrupler** le rate BMI 35+ (5%→20%) pour rejoindre le plancher. |
| **BMI 30-35 → rate ≤ 6%/sem** | `geminiService.ts:2843-2845` | idem | **PARTIELLEMENT** : idem (6%→20%). |
| **Senior ≥ 55 ans → -15% pic** | `geminiService.ts:2965-2968` | `totalReduction *= 0.85` | **OUI** : F-18 annule via plancher table. |
| **`vmaHardCap`** | `geminiService.ts:3133` | Cap physique : sessionsPerWeek × duréeMax × 75% VMA. Sécurité tendineuse débutants (VMA basse). | **OUI** : `minPeakVolume = Math.min(rawMinPeakVolume, absoluteCap, effectiveVmaCap)` ligne **3202**, puis L3213-3216 F-18 réécrit `minPeakVolume = minHebdoForLevel` **sans re-cap par effectiveVmaCap**. Bug critique. |
| **`effectiveVmaCap` (mode marche-course)** | `geminiService.ts:3150-3182` | Cap VMA élevé UNIQUEMENT débutant + chrono précis + cv ultra-bas | **OUI** : même mécanique bypass L3213. |
| **age < 18 → -30% pic** | `geminiService.ts:2962-2964` | `totalReduction *= 0.70` | **OUI** : annulé par F-18. |

**Pas de modulation `hasInjury` volume existante** (juste texte LLM). Donc F-18 ne « casse » pas une protection inexistante, **mais le plancher dur ignore une blessure**.

---

## Q2 — Cas concrets risqués

### Cas 1 : Marathon Débutant 57 ans cv 5 BMI 30 (VMA ~9)
- Avant F-18 : maxVolume Marathon Déb = 45 × senior 0.85 × BMI30 0.80 = **30 km**. vmaHardCap ~22 km. minPeakVolume = min(63, 100, 22) = **22 km**. Pic réel ~22-25.
- F-18 : plancher Marathon Déb = **35 km**. Garde-fou L3520 force `effectiveRate` jusqu'à 20%/sem pour y arriver.
- **Risque** : passer de 5 km → 35 km/sem = **+700% sur progressionWeeks**. Sur 16 sem ça fait du ~12%/sem, mais L2841 disait **5% max** pour BMI 30+. **F-18 multiplie le rate par 2.4×**. Blessure quasi-garantie (overuse, fracture stress, ITBS).

### Cas 2 : Semi Débutant 35 ans cv 3 hasInjury=tendinite achille active
- Avant F-18 : maxVolume Semi Déb 35, vmaHardCap variable. Pic ~22-25 km. Prompt LLM injecte ⛔ contre-indication côtes S1-S4 (L4063), surfaces souples (L4070).
- F-18 : plancher Semi Déb = **25 km**. Rate forcé pour y aller.
- **Risque** : tendinite achille active + ramp agressif = **réactivation pathologie**. Le texte LLM (surface souple, no hill) NE PROTÈGE PAS du volume hebdo brut. Le plan dira « gentil sur les côtes » mais 25 km/sem sur tendon enflammé = recidive.

### Cas 3 : Trail 100K Expert 45 ans BMI 28 cv 60
- Avant F-18 : maxVolume Trail100+ Expert 120, pic ~100. Plancher Bug 4 Sprint E = 60% × 100 = **60 km**.
- F-18 : plancher Trail100+ Expert = **80 km**. Cv 60 → 80 = **+33%** sur la durée du plan.
- **Risque** : Expert encaisse, rampe ~13%/sem est sous le 20% safety, BMI 28 = surpoids léger. **GO**. Profil le plus safe des 4.

### Cas 4 : Marathon Débutant 60 ans cv 20 PB Marathon 5h
- Avant F-18 : senior 0.85 + déclaré Déb (PB 5h cohérent) → pic ~30 km cappé.
- F-18 : plancher Marathon Déb = **35 km**. Senior 60 ans → ramp de 20 → 35 = +75%.
- **Risque** : modéré. 60 ans = articulations fragiles. Sans réduction senior post-F-18, on pousse 17% au-dessus du cap senior calculé. **À risque** sur 12-16 sem.

---

## Q3 — Modulation manquante

**OUI, indispensable.** Ajouter L3211 (entre lookup table et application) :

```ts
const f18LevelKey = labelToLevelKey(level);
let minHebdoForLevel = MIN_WEEKLY_VOLUME[objectiveKey]?.[f18LevelKey];
if (typeof minHebdoForLevel === 'number') {
  let safetyFactor = 1.0;
  if (data?.injuries?.hasInjury) safetyFactor *= 0.75; // patho active = -25%
  if (bmiForRate >= 35) safetyFactor *= 0.75;          // obésité 2+ = -25%
  else if (bmiForRate >= 30) safetyFactor *= 0.85;     // obésité 1 = -15%
  if (age >= 60) safetyFactor *= 0.85;
  else if (age >= 50 && bmiForRate >= 27) safetyFactor *= 0.90;
  // Plancher : ne pas descendre sous 60% du plancher table (le bug Coralie/Cyrielle
  // reste protégé : SL pic ≥ ~42% race vs 0% sans F-18).
  safetyFactor = Math.max(safetyFactor, 0.60);
  minHebdoForLevel = Math.round(minHebdoForLevel * safetyFactor);
  // Re-cap par effectiveVmaCap (CRITIQUE — bug actuel : F-18 ignore le cap VMA)
  minHebdoForLevel = Math.min(minHebdoForLevel, effectiveVmaCap);
}
```

**Bonus critique** : la ligne 3213 actuelle compare `minPeakVolume < minHebdoForLevel` puis `minPeakVolume = minHebdoForLevel` **sans Math.min(effectiveVmaCap)**. C'est le **vrai bug safety** de F-18 (B). Le re-cap par `effectiveVmaCap` à la fin du bloc est obligatoire.

---

## Q4 — Verdict

**GO PATCH** (sous 2h, avant régénérations nocturnes).

- **REVERT non** : le bug origine (Coralie/Cyrielle pic Semi 14 km = 33% race) reste safety-critical, le plancher est légitime.
- **GO seul non** : 3 cas sur 4 (Q2) montrent un dépassement de garde-fous existants (vmaHardCap, BMI rate cap, senior factor). Doctrine `feedback_securite_avant_conversion` impose modulateur.
- **PATCH = ajouter `safetyFactor` + re-cap `effectiveVmaCap` L3215**.

**Préventif** : audit batterie 10 profils Q2 (typologies BMI/age/injury × distances) **avant** prochain merge — règle `feedback_validation_n_profils_avant_sprint`.

---

## Files audités
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts:1607-1621` (MIN_WEEKLY_VOLUME)
- `geminiService.ts:2840-2845` (rate cap BMI)
- `geminiService.ts:2961-2984` (totalReduction age+BMI+poids)
- `geminiService.ts:3133, 3150-3182` (vmaHardCap, effectiveVmaCap)
- `geminiService.ts:3202-3216` (F-18 application — re-cap manquant)
- `geminiService.ts:3520-3540` (F-18 garde-fou pic 0.95 + rate ≤ 20%)
- `geminiService.ts:4044-4073` (hasInjury → texte LLM uniquement, AUCUN volume)
