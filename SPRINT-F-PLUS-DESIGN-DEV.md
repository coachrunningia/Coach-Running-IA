# Sprint F+ — Design Dev des 7 bugs restants

**Auteur** : Expert Dev Senior (regard neuf, externe Sprints précédents)
**Date** : 2026-05-27
**Périmètre** : F-1 / F-2 / F-3 / F-4 / F-8 / F-9 / F-10 (F-5/F-7/F-11 déjà déployés ce matin)
**Stack** : Next.js + Firebase, TypeScript, Vitest, Gemini 3 Flash (preview) + 3.1 Pro (review)
**Code source principal** : `src/services/geminiService.ts` (6924 l.), `src/services/planValidator.ts` (1229 l.)

---

## Vue globale — Ordre de déploiement recommandé

| Ordre | Bug | Priorité | Effort | Pourquoi en cette position |
|---|---|---|---|---|
| 1 | **F-10** Premium auto-chain | P1 | 1.5 h | UX immédiat, zéro impact moteur, isolé dans App.tsx |
| 2 | **F-3** Plat-équivalent injection | P1 | 2 h | Post-process pur, pas de régression sur weeklyVolumes |
| 3 | **F-2** Affûtage Ultra > 200 km | P1 | 3 h | Code chirurgical dans `calculatePeriodizationPlan`, scope étroit (filtre `distance>200 && elevation>10000`) |
| 4 | **F-1** Stagnation pic plans > 20 sem | P1 | 5 h | Refonte rate adaptatif + détection plateau ; tests massifs requis car touche TOUS les plans long |
| 5 | **F-4** SL Dim figée Débutant Trail | P2 | 3 h | Dépend de F-1 (SL est dérivée du volume hebdo via MIN_SL_PROPORTION) |
| 6 | **F-9** Races intermédiaires | P1 | 6 h | Touche types + Questionnaire UI + prompt + génération séances — gros lift, mais isolé fonctionnellement |
| 7 | **F-8** Topographie locale | P2 | 2 h MVP (8 h dataset complet) | Dernier car cosmétique (MVP = phrase générique welcomeMessage) |

**Effort total dev hors review/E2E** : **22.5 h MVP** (F-8 simple) ou **28.5 h** version dataset complet.

**Dépendances** :
- F-4 dépend de F-1 (la SL est resync via `enforceWeekConstraints` après modification de `weeklyVolumes`).
- F-2 doit passer AVANT F-1 (sinon F-1 risque de masquer les régressions affûtage ultra).
- F-10 et F-3 sont strictement indépendants : merge en parallèle possible.

**Risque transverse critique** : F-1 et F-4 modifient `calculatePeriodizationPlan` — toute modification doit conserver les 30+ hard floors / caps déjà accumulés (cf. AUDIT-DEV-SENIOR-J3-COMPLET.md). Validation 10+ profils OBLIGATOIRE avant deploy (doctrine `feedback_validation_n_profils_avant_sprint`).

---

## F-1 — Stagnation linéaire macro plans > 20 sem (P1)

### Cause racine confirmée

Lecture `geminiService.ts:3388-3424` :

```ts
let currentVol = startVolume;
let weeksAtPeak = 0;
for (let i = 0; i < totalWeeks; i++) {
  // ... récup / affûtage / charge
  } else {
    const atPeak = currentVol >= maxVolume * 0.98;
    if (atPeak) {
      weeksAtPeak++;
      const ondulationFactor = weeksAtPeak % 2 === 0 ? 0.95 : 1.0;
      weeklyVolumes.push(Math.round(maxVolume * ondulationFactor));
    } else {
      weeklyVolumes.push(Math.round(currentVol));
    }
    currentVol = Math.min(currentVol * (1 + effectiveRate), maxVolume);
  }
}
```

Le `Math.min(currentVol * (1+rate), maxVolume)` clamp dur sur `maxVolume` dès qu'on l'atteint → toutes les semaines de charge restantes oscillent 95/100 % du même `maxVolume` (cas marquilie68 : 17 km figé S3→S27, **24 semaines au pic**).

Le calcul `targetPeakAt = Math.round(progressionWeeks * 0.70)` (L3378) vise un pic à 70 % du plan, donc sur 27 sem actives (30 sem - 3 affûtage), pic visé à S19. Pour marquilie68, ça serait OK… mais `effectiveRate` est plafonné à `progressionRate` (L3382 : `if (neededRate < progressionRate)`), donc le rate déclaré (8 %/sem Débutant) explose `maxVolume` dès S5-S6 → plateau 24 semaines.

### Design technique

**Fichier** : `src/services/geminiService.ts`
**Fonction modifiée** : `calculatePeriodizationPlan` (L2720-3518)
**Zone précise** : L3375-3424 (calcul de `effectiveRate` + boucle de remplissage `weeklyVolumes`)

**Nouvelle logique en 2 axes** :

#### Axe 1 — Rate adaptatif bidirectionnel (L3375-3386)

Actuellement le code ne réduit le rate (`neededRate < progressionRate`) mais ne l'**augmente jamais** quand un plan court atteint le pic trop tard. Pour les plans LONGS (`> 20 sem`), le rate doit aussi être **plafonné à la baisse** pour éviter l'atteinte du pic en S5.

Remplacer L3382 :
```ts
if (neededRate < progressionRate && neededRate > 0.05) {
  effectiveRate = neededRate;
}
```

par :
```ts
// F-1 : pour les plans longs (>20 sem), on accepte un rate plus bas que progressionRate.
// Sans ce garde-fou, un Débutant à 8 %/sem atteint maxVolume en S5-S7 puis stagne 20 sem.
// Le rate minimum descend à 3 % (au lieu de 5 %) pour permettre la rampe.
const minRate = totalWeeks > 20 ? 0.03 : 0.05;
if (neededRate < progressionRate && neededRate > minRate) {
  effectiveRate = neededRate;
}
```

#### Axe 2 — Détection plateau et ondulation amplifiée (L3411-3422)

Remplacer le bloc :
```ts
const atPeak = currentVol >= maxVolume * 0.98;
if (atPeak) {
  weeksAtPeak++;
  const ondulationFactor = weeksAtPeak % 2 === 0 ? 0.95 : 1.0;
  weeklyVolumes.push(Math.round(maxVolume * ondulationFactor));
} else {
  weeklyVolumes.push(Math.round(currentVol));
}
```

par :
```ts
// F-1 : si on est sur un plan LONG et qu'on touche maxVolume trop tôt,
// on AMPLIFIE l'ondulation pour éviter la stagnation linéaire.
// Référence Daniels Running Formula : sur 24+ sem, on doit toujours avoir
// un cycle 3 sem charge / 1 sem décharge OU une ondulation ±15 % au pic.
const atPeak = currentVol >= maxVolume * 0.98;
if (atPeak) {
  weeksAtPeak++;
  // Cycle ondulation amplifié pour plans longs : 4 niveaux au lieu de 2.
  // Cas marquilie68 : 95 / 100 / 90 / 100 → pic monte/descend 4 km au lieu d'1 km.
  const isLongPlan = totalWeeks > 20;
  const pattern = isLongPlan ? [1.00, 0.92, 0.97, 0.88] : [1.00, 0.95];
  const factor = pattern[weeksAtPeak % pattern.length];
  weeklyVolumes.push(Math.round(maxVolume * factor));
} else {
  weeklyVolumes.push(Math.round(currentVol));
}
```

#### Axe 3 — Pic dans le dernier tiers (nouveau garde-fou post-calcul, L3461+)

Après le bloc lissage existant (L3467-3490), ajouter :

```ts
// F-1 : garde-fou anti-stagnation plans longs (>20 sem) avec cv bas.
// Pour les plans très longs, on veut que le PIC réel arrive dans le DERNIER TIERS
// (zone 67-90 % du plan), pas en S3-S5 où il stagne ensuite 20+ semaines.
if (totalWeeks > 20 && currentVolume < 10) {
  const actualPeakIdx = weeklyVolumes.indexOf(Math.max(...weeklyVolumes));
  const lastThirdStart = Math.floor(totalWeeks * 2 / 3);
  const firstAffutageIdx = totalWeeks - affutageWeeks;

  if (actualPeakIdx < lastThirdStart) {
    // Pic trop tôt : abaisser les volumes de la zone précoce et remonter ceux du dernier tiers.
    // Stratégie : on aplatit les volumes [S3-S{lastThirdStart}] à 85 % du max et on garde
    // le pic dans [S{lastThirdStart}-S{firstAffutageIdx-1}] à 100 %.
    const peak = weeklyVolumes[actualPeakIdx];
    const earlyCap = Math.round(peak * 0.85);
    for (let i = 2; i < lastThirdStart; i++) {
      if (recoveryWeeks.includes(i + 1)) continue;
      if (weeklyVolumes[i] > earlyCap) {
        weeklyVolumes[i] = earlyCap;
      }
    }
    console.log(`[Periodization F-1] Long plan ${totalWeeks} sem : pic décalé en dernier tiers, early weeks clampées à ${earlyCap} km`);
  }
}
```

### Tests vitest à ajouter

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug1-long-plan-progression.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

describe('F-1 — Stagnation pic plans long >20 sem', () => {
  it('marquilie68 (Trail 29km Débutant 55a cv=0 30 sem) → pas de plateau de 20+ sem', () => {
    const plan = calculatePeriodizationPlan(
      30, 0, 'Débutant (0-1 an)', 'Trail',
      undefined, 29, 1200, undefined, 55, 70, 11, 4,
      { height: 170 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    // Compter le nombre de semaines à >=95 % du pic (zone "plateau")
    const plateauWeeks = plan.weeklyVolumes.filter(v => v >= peak * 0.95 && v <= peak).length;
    expect(plateauWeeks).toBeLessThanOrEqual(8); // max 8 sem au plateau (vs 24 avant)
  });

  it('Plan 30 sem cv=0 : pic atteint dans le dernier tiers (S20-S27)', () => {
    const plan = calculatePeriodizationPlan(
      30, 0, 'Débutant (0-1 an)', 'Trail',
      undefined, 29, 1200, undefined, 55, 70, 11, 4,
      { height: 170 },
    );
    const peakIdx = plan.weeklyVolumes.indexOf(Math.max(...plan.weeklyVolumes));
    expect(peakIdx).toBeGreaterThanOrEqual(19); // S20+
    expect(peakIdx).toBeLessThanOrEqual(26);    // avant affûtage
  });

  it('Plan 30 sem : volumes[lastNonTaperWeek] >= volumes[3] × 1.4 (progression nette)', () => {
    const plan = calculatePeriodizationPlan(
      30, 0, 'Débutant (0-1 an)', 'Trail',
      undefined, 29, 1200, undefined, 55, 70, 11, 4,
      { height: 170 },
    );
    // S3 et dernier non-affûtage (~S27)
    expect(plan.weeklyVolumes[26]).toBeGreaterThanOrEqual(plan.weeklyVolumes[2] * 1.4);
  });

  it('Plan COURT (12 sem) Confirmé : comportement INCHANGÉ (non-régression)', () => {
    const plan = calculatePeriodizationPlan(
      12, 35, 'Confirmé (Compétition)', 'Course sur route',
      'Marathon', undefined, undefined, '3h30', 35, 70, 16, 4,
      { height: 178 },
    );
    // Vérifier que les plans courts ne sont pas affectés par l'amplification ondulation longue.
    const peak = Math.max(...plan.weeklyVolumes);
    expect(peak).toBeGreaterThanOrEqual(50); // garde référentiel marathon
    expect(peak).toBeLessThanOrEqual(85);
  });
});
```

### Effort dev estimé : **5 h**

- Modification code : 1.5 h (3 zones bien isolées)
- Écriture tests : 2 h (4 tests + 2 non-régression)
- Debug rampe rate adaptatif (zone fragile, déjà 3 patches accumulés L3375-3386) : 1.5 h

### Risques régression

| Risque | Mitigation |
|---|---|
| Plans courts (≤20 sem) cassés par l'amplification ondulation | Pattern `[1.00, 0.95]` conservé strict pour `totalWeeks ≤ 20` |
| Hard floor minPeakVolume (Semi/Marathon 22/32, Trail Ultra 60%) court-circuité | Modification du PIC FINAL, pas du calcul minPeakVolume. Les caps L3116-3151 restent en place |
| Décalage pic en dernier tiers + affûtage = pic trop bas | Garde-fou : `firstAffutageIdx` reste la borne haute. Si conflit → affûtage prime (déjà testé bug 4) |
| `currentVolume > 0` (coureur expérimenté) impacté | Garde-fou `currentVolume < 10` sur l'axe 3 : seul les "absolute beginners cv bas" ont le décalage forcé |

### Tests E2E avant deploy

**6 profils minimum** :
1. marquilie68 réel (Trail 29 km Débutant cv=0 30 sem) — fix cible
2. Trail 50 km Confirmé cv=20 24 sem — long plan profil moyen
3. Marathon Inter cv=35 28 sem — long plan route
4. Semi Débutant cv=8 16 sem — non-régression plan court
5. 10K Expert cv=60 12 sem — non-régression court haut niveau
6. Ultra 100 km Confirmé cv=40 24 sem — interaction avec F-2 (affûtage ultra)

---

## F-2 — Affûtage Ultra insuffisant > 200 km (P1)

### Cause racine

`calculatePeriodizationPlan` L3406-3410 calcule l'affûtage :
```ts
} else if (phases[i] === 'affutage') {
  const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
  const reductionFactor = 1 - (0.25 + affutageProgress * 0.25); // De -25% à -50%
  weeklyVolumes.push(Math.round(currentVol * reductionFactor));
}
```

→ Affûtage va de **-25 % à -50 %**, soit ratios `0.75 / 0.625 / 0.50` pour 3 semaines.

Pour Plan B Lion Mathieu Tor (330 km), pic 132 km → affûtage 0.75/0.625/0.50 = **99/82/66 km**. Mais le code actuel produit **132/116/99** parce que `currentVol` est figé à `maxVolume` ET le `reductionFactor` n'est appliqué qu'en partant de S{N-3}, alors que `phases[N-3]` est encore "specifique" dans ce cas (pic 14 semaines fondamental+développement+spécifique pour 17 sem total → affûtage commence S16).

**Vrai problème** : pour ultra > 200 km, **3 sem d'affûtage = pas assez**, et le ratio -25 % en S-3 est **trop faible**. Doctrine Krissy Moehl/Karl Meltzer = -25 % en S-3, -50 % en S-2, -70 % en S-1.

### Design technique

**Fichier** : `src/services/geminiService.ts`
**Zone 1** : Configuration nb semaines affûtage (L3193 environ)
**Zone 2** : Bloc affûtage de la boucle (L3406-3410 + duplicat L3451-3454)

#### Patch 1 — Forcer 4 semaines d'affûtage pour ultra > 200 km

Après L3193 (`const maxAffutageByDist`...) :
```ts
const maxAffutageByDist = raceDistanceKm <= 10 ? 1 : raceDistanceKm <= 21.1 ? 2 : raceDistanceKm <= 42.2 ? 3 : 4;
```

Ajouter :
```ts
// F-2 : pour ultra-trail > 200 km / D+ > 10 000m, on a besoin de 4 sem d'affûtage
// (Krissy Moehl / Karl Meltzer doctrine). Et on prend obligatoirement les 4 sem,
// pas le min entre max et calculé.
const isXtremeUltra = isTrail && (trailDistance || 0) > 200 && (trailElevation || 0) > 10000;
if (isXtremeUltra && affutageWeeks < 4) {
  const wantedExtra = 4 - affutageWeeks;
  const fromSpec = Math.min(wantedExtra, Math.max(0, specifiqueWeeks - 2));
  const fromDev = Math.min(wantedExtra - fromSpec, Math.max(0, developpementWeeks - 2));
  affutageWeeks += (fromSpec + fromDev);
  specifiqueWeeks -= fromSpec;
  developpementWeeks -= fromDev;
  console.log(`[Periodization F-2] Ultra >200km/>10000mD+ : affûtage forcé à ${affutageWeeks} sem`);
}
```

#### Patch 2 — Ratio affûtage progressif Krissy Moehl (zones L3406-3410 ET L3451-3454)

Créer une fonction helper (à insérer juste avant `calculatePeriodizationPlan` ~L2715) :

```ts
/**
 * F-2 : Calcule le facteur de réduction de l'affûtage pour la semaine donnée.
 *
 * Standard (route, trail < 200 km) :
 *   3 sem : -25 % / -37.5 % / -50 %
 *
 * Ultra extrême (> 200 km ET D+ > 10 000m) — doctrine Krissy Moehl / Karl Meltzer :
 *   4 sem : 0.75 / 0.50 / 0.30 / 0.15 (S-3 / S-2 / S-1 / S-0)
 *
 * Note : le S-0 (semaine de la course) sera de toute façon écrasé par injectRaceSession
 * pour les plans avec raceDate. Le ratio 0.15 est un placeholder.
 */
const computeAffutageFactor = (
  weekIdxInTaper: number,    // 0 = première semaine d'affûtage, taperWeeks-1 = semaine course
  taperWeeks: number,
  isXtremeUltra: boolean,
): number => {
  if (isXtremeUltra && taperWeeks === 4) {
    const moehlPattern = [0.75, 0.50, 0.30, 0.15];
    return moehlPattern[Math.min(weekIdxInTaper, 3)];
  }
  // Comportement actuel : -25 % à -50 % linéaire
  const progress = (weekIdxInTaper + 1) / taperWeeks;
  return 1 - (0.25 + progress * 0.25);
};
```

Puis dans la boucle L3406-3410, remplacer :
```ts
} else if (phases[i] === 'affutage') {
  const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
  const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
  weeklyVolumes.push(Math.round(currentVol * reductionFactor));
}
```

par :
```ts
} else if (phases[i] === 'affutage') {
  const weekIdxInTaper = weekNum - (totalWeeks - affutageWeeks) - 1; // 0-indexed
  const reductionFactor = computeAffutageFactor(weekIdxInTaper, affutageWeeks, isXtremeUltra);
  weeklyVolumes.push(Math.round(currentVol * reductionFactor));
}
```

Et la duplication L3451-3454 (bloc "Recalculer les volumes avec le nouveau taux") :
```ts
} else if (phases[i] === 'affutage') {
  const affutageProgress = (weekNum - (totalWeeks - affutageWeeks)) / affutageWeeks;
  const reductionFactor = 1 - (0.25 + affutageProgress * 0.25);
  weeklyVolumes[i] = Math.round(adjustedVol * reductionFactor);
}
```

par :
```ts
} else if (phases[i] === 'affutage') {
  const weekIdxInTaper = weekNum - (totalWeeks - affutageWeeks) - 1;
  const reductionFactor = computeAffutageFactor(weekIdxInTaper, affutageWeeks, isXtremeUltra);
  weeklyVolumes[i] = Math.round(adjustedVol * reductionFactor);
}
```

### Tests vitest à ajouter

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug2-ultra-taper-moehl.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { calculatePeriodizationPlan } from '../geminiService';

describe('F-2 — Affûtage Ultra >200 km doctrine Moehl/Meltzer', () => {
  it('TOR 330 km / D+ 24000 / Expert cv=80 / 24 sem → affûtage S-3 ≤ 0.75×pic, S-2 ≤ 0.50, S-1 ≤ 0.30', () => {
    const plan = calculatePeriodizationPlan(
      24, 80, 'Expert (Performance)', 'Trail',
      undefined, 330, 24000, '110h', 38, 68, 17, 6,
      { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    const N = plan.weeklyVolumes.length;

    // 4 semaines d'affûtage forcées
    expect(plan.weeklyPhases.slice(-4).every(p => p === 'affutage')).toBe(true);

    // Ratios Moehl/Meltzer (tolérance ±5 km pour arrondi)
    expect(plan.weeklyVolumes[N - 4]).toBeLessThanOrEqual(Math.round(peak * 0.78));
    expect(plan.weeklyVolumes[N - 3]).toBeLessThanOrEqual(Math.round(peak * 0.53));
    expect(plan.weeklyVolumes[N - 2]).toBeLessThanOrEqual(Math.round(peak * 0.33));
  });

  it('Trail 100 km / D+ 5000 → affûtage STANDARD 3 sem (-25/-50%), pas Moehl', () => {
    const plan = calculatePeriodizationPlan(
      20, 40, 'Confirmé (Compétition)', 'Trail',
      undefined, 100, 5000, undefined, 32, 68, 15, 5,
      { height: 178 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    const N = plan.weeklyVolumes.length;
    // 3 sem d'affûtage (pas 4 — condition >200km/>10000mD+ pas remplie)
    const taperPhases = plan.weeklyPhases.filter(p => p === 'affutage').length;
    expect(taperPhases).toBeLessThanOrEqual(3);
    // S-1 reste autour de 50 % (pas 30 %)
    expect(plan.weeklyVolumes[N - 1]).toBeGreaterThanOrEqual(Math.round(peak * 0.35));
  });

  it('Marathon Expert non-régression : affûtage 3 sem -25/-50%', () => {
    const plan = calculatePeriodizationPlan(
      16, 60, 'Expert (Performance)', 'Course sur route',
      'Marathon', undefined, undefined, '2h45', 30, 65, 18, 5,
      { height: 175 },
    );
    const peak = Math.max(...plan.weeklyVolumes);
    const N = plan.weeklyVolumes.length;
    expect(plan.weeklyVolumes[N - 1]).toBeGreaterThanOrEqual(Math.round(peak * 0.40));
  });
});
```

### Effort dev estimé : **3 h**

- Refacto helper `computeAffutageFactor` + 2 sites d'appel : 1 h
- Modification calcul `affutageWeeks` : 0.5 h
- Tests : 1 h
- Validation manuelle sur backup `_audit-3-trails-ultra` : 0.5 h

### Risques régression

| Risque | Mitigation |
|---|---|
| 3 sem affûtage standard cassé (Marathon/Semi) | Condition `isXtremeUltra` très étroite (>200 ET >10 000 ET trail). Helper retourne comportement actuel sinon |
| `injectRaceSession` (L5147-5153, race-day cap) override le S-1 | OK : `_raceDay` désactive cap (cf. commentaire L5149-5152). Le ratio 0.15 S-0 sera de toute façon écrasé par la course |
| Ultras < 200 km affectés (ex: TDS 145 km D+ 9000) | Non : condition >200 ET >10000. TDS reste sur affûtage standard 3 sem |
| Hyrox / VK > 200 km virtuel | Impossible (Hyrox ≤ 8 km, VK ≤ 5 km par construction) |

### Tests E2E avant deploy

**3 profils suffisent** (scope étroit) :
1. Plan B Lion Mathieu Tor 330 km — fix cible
2. Trail 100 km Confirmé cv=40 — non-régression standard taper
3. Marathon Expert sub3h — non-régression route taper

---

## F-3 — Plat-équivalent non explicité systématique (P1)

### Cause racine

Plan B Lion Mathieu : seuls les jours avec D+/km extrême (>91 m/km soit Dimanche) contenaient la phrase "effort qui compte, pas la vitesse". Mardi/Jeudi/Vendredi avec D+/km moindre (mais > 30 m/km cumulé) n'en avaient pas → le freelance se trompe sur l'allure attendue.

Le prompt LLM (L4499+) instruit déjà sur le plat-équivalent pour les **plans** VK / Trail Raide, mais ne contraint pas à l'inscrire dans CHAQUE `mainSet` séance par séance. Et le LLM ne suit pas la consigne de manière fiable (cf. doctrine `feedback_pas_de_micro_expert` : on ne va pas raffiner le prompt indéfiniment).

### Design technique

**Solution** : post-process déterministe, pas de modification de prompt.

**Fichier** : `src/services/geminiService.ts`
**Fonction modifiée** : `postProcessWeekQuality` (L923-1280 environ)
**Nouvelle fonction** : `enforceFlatEquivalentNote`

#### Patch — Nouvelle fonction (à ajouter avant `postProcessWeekQuality` ~L920)

```ts
/**
 * F-3 : injecte une note "plat-équivalent" dans le mainSet pour toute séance trail
 *       dont le D+/km > 30 m/km (seuil au-delà duquel l'allure plate ne fait plus sens).
 *
 * Doctrine D18b : pour TOUTE séance avec D+/km > 30 m/km, on doit prévenir le coureur
 * que la distance affichée correspond au plat-équivalent (sinon il pense aller à l'allure
 * écrite et explose la séance ou se sent en échec à juste titre).
 *
 * Seuils :
 *   - 30-60 m/km    : phrase douce "Ralentis dans les montées, l'allure indiquée est plat-équivalent"
 *   - 60-90 m/km    : phrase ferme "L'allure indiquée est plat-équivalent ; sur ce terrain, c'est l'effort qui compte, pas la vitesse"
 *   - > 90 m/km     : phrase extrême "Ignore la vitesse — terrain raide. Marche les portions à >10 % de pente"
 *
 * Détection "déjà présente" : on cherche les chaines normalisées
 *   - "plat-équivalent" / "plat equivalent" / "plat eq"
 *   - "effort qui compte"
 *   - "distance affichée sur le plat" / "équivalent plat"
 *   - "ignore la vitesse" / "ignore l'allure"
 */
const FLAT_EQ_MARKERS = [
  'plat-équivalent', 'plat equivalent', 'plat eq',
  'effort qui compte', 'distance affichée sur le plat',
  'équivalent plat', 'ignore la vitesse', "ignore l'allure",
];

const hasFlatEquivalentNote = (text: string): boolean => {
  if (!text) return false;
  const norm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return FLAT_EQ_MARKERS.some(m =>
    norm.includes(m.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
  );
};

const enforceFlatEquivalentNote = (session: any): void => {
  if (!session || session.type === 'Renforcement' || session.type === 'Repos') return;
  const km = parseKm(session.distance);
  const elevation = session.elevationGain;
  if (!km || km <= 0 || !elevation || elevation <= 0) return;
  const dPlusPerKm = elevation / km;
  if (dPlusPerKm < 30) return; // En dessous du seuil, allure standard OK

  if (hasFlatEquivalentNote(session.mainSet || '') ||
      hasFlatEquivalentNote(session.advice || '')) {
    return; // Déjà présent → on ne duplique pas
  }

  let note: string;
  if (dPlusPerKm > 90) {
    note = ' ⛰️ Terrain très raide : ignore l\'allure indiquée, c\'est l\'effort qui compte. Marche les portions à plus de 10 % de pente.';
  } else if (dPlusPerKm > 60) {
    note = ' ⛰️ L\'allure indiquée est plat-équivalent — sur ce dénivelé, c\'est l\'effort qui compte, pas la vitesse.';
  } else {
    note = ' ⛰️ L\'allure indiquée est plat-équivalent : ralentis dans les montées sans culpabiliser.';
  }

  session.mainSet = (session.mainSet || '') + note;
};
```

#### Patch — Appel dans `postProcessWeekQuality` (L1077 environ, juste après la boucle des sessions)

Après la boucle `week.sessions.forEach((session: any) => { ... });` (vers L1076), ajouter :

```ts
// F-3 : enforce plat-équivalent pour toutes les séances trail à D+/km > 30
week.sessions.forEach((s: any) => enforceFlatEquivalentNote(s));
```

### Tests vitest à ajouter

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug3-flat-equivalent.test.ts`

```ts
import { describe, it, expect } from 'vitest';

// On va exposer enforceFlatEquivalentNote — soit la rendre exportée temporairement
// soit tester via postProcessWeekQuality complet.
// Recommandation : exporter pour tests, en signaler /** @internal — exposed for tests */

import { enforceFlatEquivalentNote } from '../geminiService';

describe('F-3 — Injection plat-équivalent', () => {
  it('Session 10km / 700m D+ (70 m/km) → injecte note ferme', () => {
    const s: any = {
      type: 'Sortie Longue',
      distance: '10 km',
      elevationGain: 700,
      mainSet: '10 km en endurance fondamentale à 6:00 min/km.',
    };
    enforceFlatEquivalentNote(s);
    expect(s.mainSet.toLowerCase()).toMatch(/effort qui compte/);
  });

  it('Session 8km / 730m D+ (91 m/km) → note "ignore l\'allure"', () => {
    const s: any = {
      type: 'Sortie Longue',
      distance: '8 km',
      elevationGain: 730,
      mainSet: '8 km à 7:00 min/km.',
    };
    enforceFlatEquivalentNote(s);
    expect(s.mainSet.toLowerCase()).toMatch(/ignore l'allure|effort qui compte/);
  });

  it('Session 12km / 400m D+ (33 m/km) → note douce ajoutée', () => {
    const s: any = {
      type: 'Jogging',
      distance: '12 km',
      elevationGain: 400,
      mainSet: '12 km footing EF.',
    };
    enforceFlatEquivalentNote(s);
    expect(s.mainSet.toLowerCase()).toMatch(/plat-équivalent|equivalent plat|plat equivalent/);
  });

  it('Session 12km / 200m D+ (17 m/km) → PAS de note (seuil <30)', () => {
    const s: any = {
      type: 'Jogging',
      distance: '12 km',
      elevationGain: 200,
      mainSet: '12 km footing EF.',
    };
    const before = s.mainSet;
    enforceFlatEquivalentNote(s);
    expect(s.mainSet).toBe(before);
  });

  it('Note déjà présente → pas de duplication', () => {
    const s: any = {
      type: 'Sortie Longue',
      distance: '10 km',
      elevationGain: 700,
      mainSet: '10 km à 7:00 min/km — c\'est l\'effort qui compte, pas la vitesse.',
    };
    const before = s.mainSet;
    enforceFlatEquivalentNote(s);
    expect(s.mainSet).toBe(before); // inchangé
  });

  it('Session Renforcement → ignorée même avec faux elevationGain', () => {
    const s: any = {
      type: 'Renforcement',
      distance: '0 km',
      elevationGain: 100,
      mainSet: 'Squats, gainage...',
    };
    const before = s.mainSet;
    enforceFlatEquivalentNote(s);
    expect(s.mainSet).toBe(before);
  });
});
```

### Effort dev estimé : **2 h**

- Fonction + appel : 30 min
- Tests : 1 h
- Validation sur Plan B Lion Mathieu (rejouer post-process sur plan existant) : 30 min

### Risques régression

| Risque | Mitigation |
|---|---|
| Sessions plates (D+/km < 30) modifiées | Garde-fou `if (dPlusPerKm < 30) return` |
| Renforcement / Repos modifiés | Garde-fou `type === 'Renforcement' \|\| 'Repos'` |
| Duplication si LLM a déjà mis la phrase | `hasFlatEquivalentNote` détecte 8 variantes normalisées |
| Cascading sur `enforceWeekConstraints` qui resync mainSet | Appel APRÈS la boucle sessions de postProcessWeekQuality mais AVANT enforceWeekConstraints. La note est protégée car `enforceWeekConstraints` ne resync mainSet que sur les SL recadrées (cf. L1042-1050) — il faudra peut-être déplacer l'appel encore plus en aval. **À tester explicitement** : faire un test E2E qui passe par tout le pipeline preview |

**Recommandation** : déplacer l'appel `enforceFlatEquivalentNote` APRÈS `enforceWeekConstraints` (L5129) pour garantir que les SL recadrées (qui réécrivent le `mainSet`) ne perdent pas la note. Donc l'appel canonique est dans `generatePreviewPlan` et `generateRemainingWeeks`, pas dans `postProcessWeekQuality`. Ré-architecture :

```ts
// Dans generatePreviewPlan (~L5145, juste après enforceFullPlanConstraints)
plan.weeks.forEach((week: any) => {
  week.sessions.forEach((s: any) => enforceFlatEquivalentNote(s));
});
```

Idem pour `generateRemainingWeeks` (~L5945).

### Tests E2E avant deploy

**2 profils** :
1. Plan B Lion Mathieu (Tor 330 km, déjà existant) — fix cible
2. Trail 50 km D+ 1500m Inter — vérifier injection sur séances modérées

---

## F-4 — SL Dim figée Débutant cv=0 plans longs (P2)

### Cause racine

Plan A marquilie : SL Dim figée à 8 km / 65 min de S1 à S27. Cause = `weeklyVolumes` figé à 17 km (cf. F-1) → SL = `MIN_SL_PROPORTION['Trail<30']['deb'] = 0.33` × 17 = **5.6 km**, mais `enforceWeekConstraints` L1768-1804 a un `minSLRatios['Trail<30'] = 0.55` qui boost à 16 km RACE × 0.55 = **16 km** … mais seulement si on est `isLatePhase` (L1789). Or pour marquilie68 on doit aussi remonter pour les semaines fondamental (sinon SL S1 = 8 km, jamais SL S25 = 16 km).

Pour Trail Débutant cv=0 plan long, **la SL doit progresser DURANT le plan**, pas être figée. Le ratio SL/volume_hebdo (0.33 pour Trail<30 deb) reste constant, mais comme `weeklyVolumes` stagne (F-1), la SL stagne aussi.

**F-4 est en grande partie résolu par F-1.** Reste néanmoins à garantir un **plancher SL pic** indépendant du `weeklyVolumes` pour les profils cv=0.

### Design technique

**Dépendance** : F-1 doit être mergé avant.

**Fichier** : `src/services/geminiService.ts`
**Fonction modifiée** : `enforceWeekConstraints` (L1715+)
**Zone précise** : L1768-1804 (bloc `minSLRatios`)

#### Patch — Étendre minSLRatios aux phases fondamentales pour Trail Débutant cv=0 plans longs

Modifier L1786-1804 :

```ts
if (slInWeek) {
  const slKm = parseKm(slInWeek.distance);
  // Ne booste la SL que si on est en phase spécifique ou pic (pas en fondamental S1)
  const isLatePhase = ['specifique', 'spécifique', 'developpement', 'développement'].includes((week.phase || '').toLowerCase());
  if (slKm > 0 && slKm < minSLKm && isLatePhase) {
    // ... boost actuel
  }
}
```

par :
```ts
if (slInWeek) {
  const slKm = parseKm(slInWeek.distance);
  const phaseLc = (week.phase || '').toLowerCase();
  const isLatePhase = ['specifique', 'spécifique', 'developpement', 'développement'].includes(phaseLc);

  // F-4 : pour Trail Débutant cv=0 plans longs (≥20 sem), on autorise la
  // progression de la SL DÈS le fondamental (avec rampe progressive sur les semaines).
  // Sinon la SL stagne à 8 km de S1 à S15 puis tente un saut brutal en S16.
  const isTrailDebLongPlan =
    /trail/.test(objective.toLowerCase()) &&
    level === 'deb' &&
    (questionnaireData?.currentWeeklyVolume ?? -1) < 5 &&
    Array.isArray(weeklyVolumes) && weeklyVolumes.length >= 20;

  const allowEarlyBoost = isTrailDebLongPlan && phaseLc === 'fondamental';

  if (slKm > 0 && slKm < minSLKm && (isLatePhase || allowEarlyBoost)) {
    const efSpeed = (questionnaireData?.vma || 13) * 0.67;
    const maxSlKmFromDur = slDurRules ? Math.round((slDurRules[level] || slDurRules.inter) / 60 * efSpeed * 10) / 10 : minSLKm;

    // F-4 : pour fondamental + Trail Déb cv=0, rampe progressive selon weekIdx
    // S1 = 50 % minSLKm, S{lastFonda} = 90 % minSLKm
    let targetKm: number;
    if (allowEarlyBoost && typeof weekIdx === 'number' && Array.isArray(weeklyVolumes)) {
      const totalWeeks = weeklyVolumes.length;
      const phaseRatio = Math.min(1, weekIdx / Math.max(1, totalWeeks * 0.30)); // 0 → 1 sur la phase fondamentale
      const rampedMin = Math.round(minSLKm * (0.50 + phaseRatio * 0.40));
      targetKm = Math.min(rampedMin, maxSlKmFromDur);
    } else {
      targetKm = Math.min(minSLKm, maxSlKmFromDur);
    }

    if (targetKm > slKm) {
      const factor = targetKm / slKm;
      slInWeek.distance = `${targetKm} km`;
      const currentDur = parseDurationMin(slInWeek.duration);
      const newDur = Math.round(currentDur * factor);
      slInWeek.duration = formatDurationStr(newDur);
      console.log(`[Enforce F-4] SL boostée ${phaseLc}: ${slKm}km/${currentDur}min → ${targetKm}km/${newDur}min`);
    }
  }
}
```

### Tests vitest à ajouter

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug4-sl-trail-deb-longue.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { enforceWeekConstraints } from '../geminiService';

const makeWeek = (weekNum: number, phase: string, slDist: string, slDur: string) => ({
  weekNumber: weekNum,
  phase,
  sessions: [
    { type: 'Renforcement', duration: '30 min' },
    { type: 'Jogging', distance: '5 km', duration: '35 min', mainSet: '' },
    { type: 'Sortie Longue', distance: slDist, duration: slDur, mainSet: '' },
  ],
});

describe('F-4 — SL Trail Débutant cv=0 plans longs', () => {
  it('marquilie68 S25 (specifique) → SL pic >= 16 km (40 % de 29 km race)', () => {
    const week = makeWeek(25, 'specifique', '8 km', '1h05');
    const weeklyVolumes = Array(30).fill(17); // simu cv=0 plan stagnant
    const data = {
      goal: 'Trail',
      level: 'Débutant (0-1 an)',
      trailDetails: { distance: 29, elevation: 1200 },
      currentWeeklyVolume: 0,
      vma: 11,
    };
    enforceWeekConstraints(week, 17, data, weeklyVolumes, 24);
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    const slKm = parseFloat((sl as any).distance);
    expect(slKm).toBeGreaterThanOrEqual(14); // 14 = 29×0.50 (ratio Trail<30 deb)
  });

  it('marquilie68 S1 (fondamental) → SL >= 7 km (rampe progressive)', () => {
    const week = makeWeek(1, 'fondamental', '5 km', '35 min');
    const weeklyVolumes = Array(30).fill(17);
    const data = {
      goal: 'Trail',
      level: 'Débutant (0-1 an)',
      trailDetails: { distance: 29, elevation: 1200 },
      currentWeeklyVolume: 0,
      vma: 11,
    };
    enforceWeekConstraints(week, 14, data, weeklyVolumes, 0);
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    const slKm = parseFloat((sl as any).distance);
    expect(slKm).toBeGreaterThanOrEqual(7);  // rampe 50 % de 14 km min
    expect(slKm).toBeLessThanOrEqual(10);    // pas plus que pic
  });

  it('Trail Inter cv=20 (PAS débutant) → comportement INCHANGÉ (non-régression)', () => {
    const week = makeWeek(2, 'fondamental', '6 km', '40 min');
    const weeklyVolumes = Array(20).fill(35);
    const data = {
      goal: 'Trail',
      level: 'Intermédiaire (Régulier)',
      trailDetails: { distance: 30, elevation: 1500 },
      currentWeeklyVolume: 20,
      vma: 13,
    };
    enforceWeekConstraints(week, 30, data, weeklyVolumes, 1);
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    const slKm = parseFloat((sl as any).distance);
    expect(slKm).toBe(6); // pas boosté en phase fondamental pour Inter cv=20
  });

  it('Marathon Débutant cv=0 → PAS de rampe (uniquement Trail Déb cv<5 long)', () => {
    const week = makeWeek(2, 'fondamental', '4 km', '30 min');
    const weeklyVolumes = Array(20).fill(20);
    const data = {
      goal: 'Course sur route',
      subGoal: 'Marathon',
      level: 'Débutant (0-1 an)',
      currentWeeklyVolume: 0,
      vma: 10,
    };
    enforceWeekConstraints(week, 20, data, weeklyVolumes, 1);
    const sl = week.sessions.find((s: any) => s.type === 'Sortie Longue');
    const slKm = parseFloat((sl as any).distance);
    expect(slKm).toBe(4); // Marathon route → pas la même règle
  });
});
```

### Effort dev estimé : **3 h**

- Modification `enforceWeekConstraints` : 1 h (zone fragile, déjà 5+ patches)
- Tests : 1.5 h
- Validation manuelle marquilie68 backup : 0.5 h

### Risques régression

| Risque | Mitigation |
|---|---|
| SL boostée en S1 dépasse `slDurRules` (cap durée) | `Math.min(rampedMin, maxSlKmFromDur)` borne explicite |
| SL > 1/2 du volume hebdo en S1 (déséquilibre) | `MIN_SL_PROPORTION` reste appliqué après. Si SL > 40 % du volume, redistribution se fait dans le bloc L1850+ |
| Trail Inter / Confirmé affecté | Condition `level === 'deb'` ET `currentWeeklyVolume < 5` ET `weeklyVolumes.length >= 20` |
| Marathon / Semi Débutant cv=0 affecté | Condition `/trail/.test(objective)` |

### Tests E2E avant deploy

**3 profils** :
1. marquilie68 (Trail 29 km Déb cv=0 30 sem) — fix cible
2. Trail 50 km Déb cv=10 22 sem — extension d'usage
3. Marathon Déb cv=0 16 sem — non-régression route

---

## F-8 — suggestedLocations topographie aveugle (P2)

### Recommandation : MVP minimal + dataset complet plus tard

Le dataset {ville → topographie} est un travail data non-trivial (5 000 communes FR à classifier, sources INPN/IGN). Pour Sprint F+, on livre le **MVP minimal** : phrase générique préventive dans le `welcomeMessage` pour les plans Trail à fort D+ race.

### Design technique MVP

**Fichier** : `src/services/geminiService.ts`
**Zone** : Bloc construction prompt welcomeMessage (~L3760-3900, dans les `parts.push(...)`)

#### Patch — Ajouter un bloc instruction welcomeMessage pour Trail D+ élevé

Dans la fonction qui construit le `welcomeBlock` (~L3700-3900), ajouter :

```ts
// F-8 : pour Trail dont la course demande >50 m/km de D+, prévenir le coureur que
// sa ville locale peut être inadaptée. Pas de dataset (MVP), juste un message coach.
if (data.goal === 'Trail' && data.trailDetails?.distance && data.trailDetails?.elevation) {
  const dPlusPerKmRace = data.trailDetails.elevation / data.trailDetails.distance;
  if (dPlusPerKmRace > 50) {
    parts.push(`🏔️ TOPOGRAPHIE LOCALE — MESSAGE PRÉVENTIF dans welcomeMessage :
Le coureur prépare une course à ${Math.round(dPlusPerKmRace)} m D+/km. Sans connaître la topographie exacte de "${data.city || 'sa ville'}", inclure dans le welcomeMessage UNE phrase concrète du type :
"Si ${data.city || 'ta ville'} est principalement plate, planifie une sortie hebdomadaire dans un massif accessible (collines/forêt en relief, escaliers d'une butte/parking, sorties trail organisées le weekend). Le dénivelé en montée n'est PAS optionnel pour cette course : ${data.trailDetails.elevation} m D+ sur ${data.trailDetails.distance} km nécessite un entraînement vertical régulier."
Ne JAMAIS suggérer une ville précise (risque hallucination). Rester sur des conseils GÉNÉRIQUES : escaliers, collines locales, salles avec tapis inclinés, etc.`);
  }
}
```

### Design technique complet (futur, hors Sprint F+)

Pour un fix complet futur :
1. Créer `src/data/cityTopography.ts` avec dataset INSEE × IGN (estimation D+/km atteignable dans un rayon de 10 km de la ville).
2. Fonction `getLocalElevationCapacity(city: string): { tier: 'plat' | 'vallonné' | 'montagne', maxDPlusPerKm: number }`.
3. Si `dPlusPerKmRace > maxDPlusPerKm × 1.5` → injection dans `suggestedLocations` d'une suggestion "Déplace-toi vers {massif proche}".

**Effort estimé fix complet** : 8 h (4 h dataset, 2 h algo, 2 h tests).

### Tests vitest à ajouter (MVP)

**Test indirect via prompt builder** — vérifier que le bloc est bien injecté pour les profils éligibles. Le contenu réel du welcomeMessage est généré par Gemini, donc on teste la PRÉSENCE de l'instruction dans le prompt assemblé, pas le résultat LLM.

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug8-topography-mvp.test.ts`

```ts
import { describe, it, expect } from 'vitest';
// Si la fonction qui construit le prompt n'est pas exportée, l'exporter avec /** @internal */
import { buildWelcomeToneBlock /* à exporter pour tests */ } from '../geminiService';

describe('F-8 MVP — Message topographie locale dans welcomeMessage', () => {
  it('Trail Hugo Nevers 100 km / 3000 D+ (30 m/km) → PAS de bloc topo (seuil <50)', () => {
    const data = {
      goal: 'Trail',
      trailDetails: { distance: 100, elevation: 3000 },
      city: 'Nevers',
    };
    // Builder à factoriser pour test ; assertion que le bloc topo n'est pas présent
    // Si difficile à isoler, faire un test E2E qui inspecte le prompt généré par generatePreviewPlan
    // (mocker Gemini, intercepter le prompt envoyé)
  });

  it('Trail Hugo Nevers 100 km / 6000 D+ (60 m/km) → bloc topo présent', () => {
    // Idem, mais avec elevation 6000m → 60 m/km > seuil 50
  });
});
```

### Effort dev estimé MVP : **2 h**

- Patch prompt : 30 min
- Tests : 1 h
- Validation manuelle 2 plans existants : 30 min

### Risques régression MVP

| Risque | Mitigation |
|---|---|
| LLM hallucine un nom de ville/massif dans welcomeMessage | Instruction explicite "Ne JAMAIS suggérer une ville précise" + post-process déjà en place L583+ (audit hallucinations LLM) |
| Doublon avec autres blocs prompt elevation | Le bloc actuel parle d'ENTRAÎNEMENT (D+/km du PLAN), pas de LOCALISATION. F-8 = pure topographie locale |
| Coureur en haute montagne lit "si plat..." → confusion | Le `if ${data.city || 'ta ville'} est principalement plate` évite l'affirmation directe |

### Tests E2E avant deploy

**2 profils** :
1. hugo Nevers Ultra 100 km D+ 3000 — bordure seuil (30 m/km < 50)
2. Trail Inter Paris D+ 5000 sur 50 km (100 m/km) — fix cible

---

## F-9 — Gestion races intermédiaires (P1)

### Périmètre fonctionnel

Cas Arnaud (1779554515397) :
- startDate = 24/05/2026
- raceDate principale = 30/08/2026
- Race intermédiaire 1 = 10 km officiel le 05/06/2026 (S2 du plan)
- Race intermédiaire 2 = Trail 15 km / D+ 500m le 28/06/2026 (S5 du plan)

Actuellement le `QuestionnaireData` ne permet PAS de déclarer ces races inter → le plan ne prévoit ni affûtage léger pré-course, ni récup post-course.

### Design technique en 4 couches

#### Couche 1 — Types

**Fichier** : `src/types.ts`
**Modification** : ajouter à `QuestionnaireData` (après L67, avant `comments`) :

```ts
  /**
   * F-9 : Courses intermédiaires entre startDate et raceDate.
   * Pour chacune, on prévoit un affûtage léger en S{n-1} et une récup légère en S{n+1}
   * sans recalibrer la périodisation principale (le plan reste orienté vers raceDate).
   */
  intermediateRaces?: Array<{
    date: string;              // ISO YYYY-MM-DD
    distance: number;          // km
    type: 'route' | 'trail';
    elevation?: number;        // m D+, optionnel (route = 0)
    targetTime?: string;       // optionnel, ex: "45min"
  }>;
```

#### Couche 2 — UI Questionnaire

**Fichier** : `src/components/Questionnaire.tsx`
**Modification** : ajouter une sous-section dans `renderStep2` (après `raceDate` input, ~L 500+, à identifier).

Vu la complexité (UI dynamique liste éditable), **proposition technique** :
- Ajouter un bouton "+ J'ai d'autres courses prévues entre maintenant et la course principale" dans le step 2
- Au clic, ouvrir un sub-block avec form `<date> <distance> <type> <elevation?>`
- Stockage : `data.intermediateRaces: Array<{date, distance, type, elevation}>`
- Validation : `date > startDate && date < raceDate`, max 5 courses

**Pseudo-code** (composant interne à `Questionnaire.tsx`) :

```tsx
const [showInterRaces, setShowInterRaces] = useState(false);

// Helper validation
const validateInterRace = (r: any): string | null => {
  if (!r.date) return "Date manquante";
  if (data.startDate && new Date(r.date) <= new Date(data.startDate)) return "Date avant le début du plan";
  if (data.raceDate && new Date(r.date) >= new Date(data.raceDate)) return "Date après la course principale";
  if (!r.distance || r.distance <= 0) return "Distance manquante";
  return null;
};

// Dans renderStep2, après le bloc raceDate :
<div className="mt-4 p-4 bg-slate-50 rounded-xl">
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={showInterRaces} onChange={e => setShowInterRaces(e.target.checked)} />
    <span className="text-sm">J'ai d'autres courses prévues d'ici la course principale</span>
  </label>
  {showInterRaces && (
    <div className="mt-3 space-y-2">
      {(data.intermediateRaces || []).map((r, idx) => (
        <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-white rounded-lg">
          <input type="date" value={r.date} onChange={e => updateInterRace(idx, 'date', e.target.value)} />
          <input type="number" placeholder="km" value={r.distance || ''} onChange={e => updateInterRace(idx, 'distance', parseFloat(e.target.value))} />
          <select value={r.type} onChange={e => updateInterRace(idx, 'type', e.target.value)}>
            <option value="route">Route</option>
            <option value="trail">Trail</option>
          </select>
          {r.type === 'trail' && (
            <input type="number" placeholder="D+ m" value={r.elevation || ''} onChange={e => updateInterRace(idx, 'elevation', parseFloat(e.target.value))} />
          )}
          <button onClick={() => removeInterRace(idx)}>×</button>
        </div>
      ))}
      <button onClick={addInterRace} className="text-accent text-sm font-bold">+ Ajouter une course</button>
    </div>
  )}
</div>
```

#### Couche 3 — Prompt Gemini

**Fichier** : `src/services/geminiService.ts`
**Zone** : Prompt preview (~L4400-4700)

Ajouter dans le bloc construction prompt (juste après la déclaration de `raceDate` dans le prompt, ~L4470) :

```ts
// F-9 : injection courses intermédiaires
if (data.intermediateRaces && data.intermediateRaces.length > 0) {
  const interBlock = data.intermediateRaces.map((r, i) => {
    const weekNum = Math.floor((new Date(r.date).getTime() - new Date(data.startDate || new Date()).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const typeStr = r.type === 'trail' ? `Trail ${r.distance} km / D+ ${r.elevation || 0} m` : `Course route ${r.distance} km`;
    return `  - S${weekNum} (${r.date}) : ${typeStr}`;
  }).join('\n');

  const interPrompt = `
🏁 COURSES INTERMÉDIAIRES DÉCLARÉES (entre startDate et raceDate) :
${interBlock}

INSTRUCTIONS pour chaque course intermédiaire :
1. Semaine de la course (S{n}) : la séance du jour de la course REMPLACE la séance prévue (cf. format raceDay).
2. Semaine PRÉCÉDENTE (S{n-1}) : affûtage léger = volume hebdo réduit de 15 %, suppression du fractionné intense, SL raccourcie de 20 %.
3. Semaine SUIVANTE (S{n+1}) : récup légère = volume hebdo réduit de 15 %, séance principale = footing EF (pas de seuil/VMA), SL réduite à 60 % de la SL normale prévue.
4. Le plan global reste orienté vers la raceDate principale — ne pas recalibrer la périodisation.
5. Dans le welcomeMessage, mentionner les courses intermédiaires et l'adaptation prévue.
`;
  // Insérer interPrompt dans le contexte LLM
}
```

#### Couche 4 — Post-process déterministe

Le LLM peut ignorer ou mal appliquer les instructions. Pour garantir l'affûtage/récup, on ajoute un post-process :

**Fichier** : `src/services/geminiService.ts`
**Nouvelle fonction** : `applyIntermediateRaceAdjustments` (à appeler après `enforceFullPlanConstraints`)

```ts
/**
 * F-9 : applique l'affûtage S-1 et la récup S+1 autour de chaque course intermédiaire.
 *
 * Stratégie :
 *  - Identifier la semaine de chaque course (basé sur date - startDate / 7 jours)
 *  - S-1 : multiplier weeklyVolumes[n-1] par 0.85, retyper fractionnés en jogging
 *  - S+1 : multiplier weeklyVolumes[n+1] par 0.85, capper SL à 60 % de SL S+1 normale
 */
const applyIntermediateRaceAdjustments = (
  weeks: any[],
  weeklyVolumes: number[],
  data: any,
): void => {
  if (!data.intermediateRaces || data.intermediateRaces.length === 0) return;
  if (!data.startDate) return;

  const startMs = new Date(data.startDate).getTime();
  data.intermediateRaces.forEach((race: any) => {
    if (!race.date) return;
    const raceMs = new Date(race.date).getTime();
    const weekOffset = Math.floor((raceMs - startMs) / (7 * 24 * 60 * 60 * 1000));
    if (weekOffset < 0 || weekOffset >= weeks.length) return;

    // S-1 affûtage léger
    if (weekOffset - 1 >= 0) {
      const w = weeks[weekOffset - 1];
      weeklyVolumes[weekOffset - 1] = Math.round(weeklyVolumes[weekOffset - 1] * 0.85);
      w.sessions.forEach((s: any) => {
        if (s.type === 'Fractionné') {
          s.type = 'Jogging';
          s.intensity = 'Facile';
          s.title = "Footing d'Endurance Fondamentale (affûtage pré-course)";
        }
      });
      w.weekGoal = `Affûtage léger avant la course intermédiaire du ${race.date}`;
    }

    // Semaine course (inject)
    // → réutilise injectRaceSession existante ? À adapter pour les races inter (cf. raceDayInject.ts)

    // S+1 récup
    if (weekOffset + 1 < weeks.length) {
      const w = weeks[weekOffset + 1];
      weeklyVolumes[weekOffset + 1] = Math.round(weeklyVolumes[weekOffset + 1] * 0.85);
      const sl = w.sessions.find((s: any) => s.type === 'Sortie Longue');
      if (sl) {
        const km = parseKm(sl.distance);
        if (km > 0) {
          sl.distance = `${Math.round(km * 0.6 * 10) / 10} km`;
          const dur = parseDurationMin(sl.duration);
          sl.duration = formatDurationStr(Math.round(dur * 0.6));
        }
      }
      w.weekGoal = `Récupération légère après la course intermédiaire du ${race.date}`;
    }
    console.log(`[F-9] Course inter S${weekOffset + 1} ${race.date} : affûtage S${weekOffset} + récup S${weekOffset + 2}`);
  });
};
```

Appel : juste après `enforceFullPlanConstraints(plan.weeks, ...)` à L5145 et L5945 :

```ts
applyIntermediateRaceAdjustments(plan.weeks, generationContext.periodizationPlan.weeklyVolumes, data);
```

#### Couche 5 — Injection de la course intermédiaire elle-même (jour J)

Le système actuel a `injectRaceSession` (cf. import `raceDayInject.ts` ligne ~5150) qui gère UNE course (raceDate). Pour F-9 il faut soit :
- (a) Boucler sur `intermediateRaces` et appeler `injectRaceSession` adaptée pour chaque
- (b) Une nouvelle fonction `injectIntermediateRaceSessions`

**Recommandation (a)** : adapter la fonction existante avec un paramètre `raceMeta: {date, distance, elevation, type}`. C'est moins de code que (b).

### Tests vitest à ajouter

**Fichier nouveau** : `src/services/__tests__/sprint-f-plus-bug9-intermediate-races.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { applyIntermediateRaceAdjustments } from '../geminiService';

const makeWeek = (n: number, vol: number, hasFract = false) => ({
  weekNumber: n,
  phase: 'developpement',
  weekGoal: '',
  sessions: [
    { type: 'Renforcement', duration: '30 min' },
    { type: 'Fractionné', distance: hasFract ? '8 km' : '0 km', duration: hasFract ? '50 min' : '0' },
    { type: 'Jogging', distance: '6 km', duration: '40 min' },
    { type: 'Sortie Longue', distance: `${Math.round(vol * 0.35)} km`, duration: `${Math.round(vol * 0.35 * 6)} min` },
  ],
});

describe('F-9 — Courses intermédiaires Arnaud', () => {
  it('Arnaud : 10k 05/06 (S2) + Trail 15 28/06 (S5) → S1 affûtage, S3 récup, S4 affûtage, S6 récup', () => {
    const weeks = Array.from({ length: 14 }, (_, i) => makeWeek(i + 1, 30, true));
    const weeklyVolumes = Array(14).fill(30);
    const data = {
      startDate: '2026-05-24',
      intermediateRaces: [
        { date: '2026-06-05', distance: 10, type: 'route' as const },
        { date: '2026-06-28', distance: 15, type: 'trail' as const, elevation: 500 },
      ],
    };

    applyIntermediateRaceAdjustments(weeks, weeklyVolumes, data);

    // S1 (idx 0) = affûtage pré-10k S2
    expect(weeklyVolumes[0]).toBe(Math.round(30 * 0.85));
    expect(weeks[0].sessions.find((s: any) => s.type === 'Fractionné')).toBeUndefined();

    // S3 (idx 2) = récup post-10k
    expect(weeklyVolumes[2]).toBe(Math.round(30 * 0.85));

    // S4 (idx 3) = affûtage pré-Trail15
    expect(weeklyVolumes[3]).toBe(Math.round(30 * 0.85));

    // S6 (idx 5) = récup post-Trail15
    expect(weeklyVolumes[5]).toBe(Math.round(30 * 0.85));
  });

  it('Pas d\'intermediateRaces → noop', () => {
    const weeks = Array.from({ length: 10 }, (_, i) => makeWeek(i + 1, 30));
    const weeklyVolumes = Array(10).fill(30);
    const data = { startDate: '2026-05-24' };
    applyIntermediateRaceAdjustments(weeks, weeklyVolumes, data);
    expect(weeklyVolumes.every(v => v === 30)).toBe(true);
  });

  it('Course inter en S{N} hors plage → ignorée silencieusement', () => {
    const weeks = Array.from({ length: 5 }, (_, i) => makeWeek(i + 1, 30));
    const weeklyVolumes = Array(5).fill(30);
    const data = {
      startDate: '2026-05-24',
      intermediateRaces: [{ date: '2027-01-01', distance: 10, type: 'route' as const }],
    };
    applyIntermediateRaceAdjustments(weeks, weeklyVolumes, data);
    expect(weeklyVolumes.every(v => v === 30)).toBe(true);
  });
});
```

### Effort dev estimé : **6 h**

- Types + Couche 1 : 30 min
- UI Questionnaire (Couche 2) : 2 h (composant dynamique, validation date)
- Prompt Gemini (Couche 3) : 30 min
- Post-process `applyIntermediateRaceAdjustments` (Couche 4) : 1.5 h
- Adaptation `injectRaceSession` (Couche 5) : 1 h
- Tests : 1 h
- Tests E2E avec Arnaud réel : 0.5 h

### Risques régression

| Risque | Mitigation |
|---|---|
| Plans sans `intermediateRaces` cassés | `if (!data.intermediateRaces \|\| data.intermediateRaces.length === 0) return` |
| Course inter le même jour que la course principale | Validation côté UI (`r.date < raceDate`) |
| 2 courses inter à 7 jours d'écart → conflit affûtage/récup | Si S+1 d'une course = S-1 de la suivante → on prend MAX des réductions (×0.85, pas ×0.72 cumulé) |
| Génération `remainingWeeks` resync incohérent avec adjustments | `applyIntermediateRaceAdjustments` doit être appelé DEUX fois (preview + remaining), avec `data.intermediateRaces` provenant de `generationContext.questionnaireSnapshot` |
| Doctrine `feedback_startdate_input_strict` : startDate = J1 réel | Le calcul `weekOffset = (raceMs - startMs) / 7j` respecte startDate strict ; on ne réaligne pas lundi |

### Tests E2E avant deploy

**3 profils** :
1. Arnaud réel — fix cible (2 courses inter)
2. Marathon 16 sem avec 1 course inter (10k mi-prépa) — cas usage standard
3. Plan sans courses inter — non-régression

---

## F-10 — Premium feasibility BON auto-chain (P1)

### Symptôme

terebeu (Premium, feasibility BON 70) crée un plan via questionnaire → arrive sur `/plan/:planId` en mode `isPreview=true` → doit cliquer manuellement sur "Générer" (PlanView.tsx L1684-1699). UX confuse : terebeu a cru que son paiement Premium ne fonctionnait pas.

### Design technique

**Fichier principal** : `src/App.tsx`
**Zone** : `handlePlanGeneration` (L95-173)

#### Patch — Auto-chain pour Premium avec feasibility OK

Modifier `handlePlanGeneration` (L132 environ, après `await savePlan(plan)`) :

Actuel :
```ts
await savePlan(plan);
await saveUserQuestionnaire(user.id, data);

// Redirection vers le plan nouvellement créé
console.log("[Gen] Succès ! Redirection vers /plan/" + plan.id);

setTimeout(() => {
  setIsGenerating(false);
  navigate(`/plan/${plan.id}`);
}, 500);
```

Remplacer par :
```ts
await savePlan(plan);
await saveUserQuestionnaire(user.id, data);

// F-10 : si Premium ET feasibility OK (BON/EXCELLENT) ET confidenceScore ≥ 15
// → auto-chain generateRemainingWeeks. Sinon (AMBITIEUX/RISQUÉ/IRRÉALISTE) → garder
// le warning obligatoire (doctrine D17 : opt-in conscient).
const feasibilityStatus = plan.feasibility?.status;
const confidence = plan.confidenceScore ?? 100;
const shouldAutoChain =
  user.isPremium &&
  plan.isPreview &&
  feasibilityStatus !== 'AMBITIEUX' &&
  feasibilityStatus !== 'RISQUÉ' &&
  feasibilityStatus !== 'IRRÉALISTE' &&
  confidence >= 15;

if (shouldAutoChain) {
  console.log(`[Gen F-10] Premium + feasibility ${feasibilityStatus} ${confidence}% → auto-chain remaining weeks`);
  try {
    const { generateRemainingWeeks } = await import('./services/geminiService');
    // Note : on bloque la navigation jusqu'à la fin pour éviter le flicker preview → full
    setProcessingMessage?.('Génération du plan complet en cours...');
    const fullPlan = await generateRemainingWeeks(plan, async (partialPlan) => {
      // Sauvegarde intermédiaire pour ne pas perdre le travail en cas de plantage
      const ppWithUser = { ...partialPlan, userId: user.id, userEmail: plan.userEmail } as any;
      await savePlan(ppWithUser);
    });
    fullPlan.userId = user.id;
    fullPlan.userEmail = plan.userEmail;
    await savePlan(fullPlan);
    console.log(`[Gen F-10] Auto-chain complete : plan ${fullPlan.id} fully generated`);
  } catch (chainErr) {
    // Si l'auto-chain plante, on ne casse pas la création du plan : le user pourra
    // cliquer manuellement sur "Générer" depuis PlanView.
    console.warn('[Gen F-10] Auto-chain failed, fallback to manual:', chainErr);
  }
}

// Redirection vers le plan (preview ou full selon auto-chain)
console.log("[Gen] Succès ! Redirection vers /plan/" + plan.id);
setTimeout(() => {
  setIsGenerating(false);
  navigate(`/plan/${plan.id}`);
}, 500);
```

### Note doctrine

- Doctrine D17 (warning obligatoire AMBITIEUX/RISQUÉ/IRRÉALISTE) : **respectée** car la condition exclut ces 3 statuts.
- Doctrine `feedback_securite_avant_conversion` : **respectée** car on garde l'opt-in conscient pour les profils à risque.
- Doctrine `feedback_jamais_contact_client` : **non concernée** (pas de mail/notif).

### Tests vitest à ajouter

**Fichier nouveau** : `src/__tests__/sprint-f-plus-bug10-premium-auto-chain.test.tsx`

Note : tester `handlePlanGeneration` directement est compliqué (React state + Firestore mocks). Recommandation : tester la **logique de décision** isolée dans un helper exportable.

**Refacto** : extraire la décision dans `src/services/autoChainPolicy.ts` :

```ts
// src/services/autoChainPolicy.ts
import type { TrainingPlan, User } from '../types';

export const shouldAutoChainPlan = (user: User, plan: TrainingPlan): boolean => {
  if (!user.isPremium) return false;
  if (!plan.isPreview) return false;
  const status = plan.feasibility?.status;
  if (status === 'AMBITIEUX' || status === 'RISQUÉ' || status === 'IRRÉALISTE') return false;
  const confidence = plan.confidenceScore ?? 100;
  return confidence >= 15;
};
```

**Tests** : `src/services/__tests__/sprint-f-plus-bug10-autochain-policy.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { shouldAutoChainPlan } from '../autoChainPolicy';

const premium = { isPremium: true } as any;
const freemium = { isPremium: false } as any;
const previewPlan = (status: string, score: number) => ({
  isPreview: true, feasibility: { status }, confidenceScore: score,
} as any);

describe('F-10 — Auto-chain policy', () => {
  it('Premium + BON + 70% → auto-chain', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('BON', 70))).toBe(true);
  });

  it('Premium + EXCELLENT + 95% → auto-chain', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('EXCELLENT', 95))).toBe(true);
  });

  it('Premium + AMBITIEUX + 50% → PAS auto-chain (warning D17)', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('AMBITIEUX', 50))).toBe(false);
  });

  it('Premium + RISQUÉ + 30% → PAS auto-chain', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('RISQUÉ', 30))).toBe(false);
  });

  it('Premium + IRRÉALISTE + 10% → PAS auto-chain', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('IRRÉALISTE', 10))).toBe(false);
  });

  it('Premium + BON + 10% (confidence <15) → PAS auto-chain', () => {
    expect(shouldAutoChainPlan(premium, previewPlan('BON', 10))).toBe(false);
  });

  it('Freemium + BON + 70% → PAS auto-chain (gate Premium)', () => {
    expect(shouldAutoChainPlan(freemium, previewPlan('BON', 70))).toBe(false);
  });

  it('Premium + plan déjà full (isPreview=false) → PAS auto-chain', () => {
    expect(shouldAutoChainPlan(premium, { isPreview: false, feasibility: { status: 'BON' }, confidenceScore: 80 } as any)).toBe(false);
  });

  it('Premium + plan sans feasibility (legacy) → auto-chain (fallback OK)', () => {
    expect(shouldAutoChainPlan(premium, { isPreview: true } as any)).toBe(true);
  });
});
```

### Effort dev estimé : **1.5 h**

- Extraction helper + intégration App.tsx : 45 min
- Tests : 30 min
- Validation manuelle avec compte Premium test : 15 min

### Risques régression

| Risque | Mitigation |
|---|---|
| Auto-chain plante et user reste bloqué sur loader | `try/catch` autour de `generateRemainingWeeks` ; fallback redirige vers PlanView preview où bouton "Générer" reste cliquable |
| Premium freemium hybride (hasPurchasedPlan=true mais isPremium=false) | Volontairement EXCLU : F-10 cible uniquement les vrais Premium abonnés. hasPurchasedPlan = plan unique = il a déjà payé un plan, pas besoin d'auto-chain (il sait ce qu'il fait) |
| LoadingScreen affiché trop longtemps (preview + remaining = ~60s) | Mettre à jour `processingMessage` avec progression du `generateRemainingWeeks` (callback `partialPlan`) |
| Doctrine D17 court-circuitée par erreur | Tests exhaustifs sur les 3 statuts à warning |

### Tests E2E avant deploy

**4 profils** :
1. Compte Premium réel + plan Inter Marathon BON 75 — fix cible
2. Compte Premium + plan AMBITIEUX 50 — warning toujours présent
3. Compte Freemium + plan BON — pas d'auto-chain (gate Premium)
4. Compte Premium + Hyrox EXCELLENT — non-régression goals non-running

---

## Risques transverses critiques (Sprint global)

### 1. Validation 10+ profils OBLIGATOIRE avant deploy

Doctrine `feedback_validation_n_profils_avant_sprint`. F-1 + F-4 touchent `calculatePeriodizationPlan` et `enforceWeekConstraints` — fonctions au cœur du moteur. Tout patch sur ces 2 fonctions doit être validé sur une batterie de 10+ profils représentatifs :

**Matrice profils minimum** :

| # | Profil | Pourquoi |
|---|---|---|
| 1 | marquilie68 Trail 29 km Déb cv=0 30 sem | F-1 + F-4 cible |
| 2 | Lion Mathieu Tor 330 km Expert cv=80 24 sem | F-2 cible |
| 3 | Arnaud Marathon 14 sem 2 races inter | F-9 cible |
| 4 | terebeu Premium Marathon BON 16 sem | F-10 cible |
| 5 | Hugo Ultra 100 km Nevers | F-8 cible |
| 6 | Margaux Semi Inter cv=17 freq=3 | non-régression Sprint E |
| 7 | georgeslor1 Expert senior 10K | non-régression Fix #5a |
| 8 | Sébastien Marathon Finisher + PB | non-régression Sprint 3 |
| 9 | Olivier Trail 126 km Confirmé | non-régression Bug 4 phase 2 |
| 10 | Lilian 10K Débutant cv=0 | non-régression P1d absolute beginner |

### 2. Ordre de merge sans interférence

Les fixes F-3 / F-8 / F-10 sont **strictement indépendants** et peuvent être mergés en parallèle (PR séparées).

F-2 / F-1 / F-4 touchent la même fonction `calculatePeriodizationPlan` → **merger séquentiellement** (1 PR à la fois, validation entre chaque).

F-9 modifie types + Questionnaire + prompt + post-process : **PR isolée**, mais migration types backward-compatible (champ `intermediateRaces?` optionnel → pas de breaking).

### 3. Doctrine "chaque ligne justifiée" (`feedback_chaque_ligne_justifiee`)

Toutes les modifications proposées :
- Conservent les commentaires-historique existants (cf. patches accumulés Bug 4, Bug 11, Bug 17, Fix #5a, P1d, etc.)
- Ajoutent un commentaire `F-{n}` pour chaque nouvelle ligne expliquant le pourquoi
- Ne suppriment AUCUNE ligne existante sans commentaire de justification de remplacement

Exemple : pour F-2 patch L3406-3410, le commit message doit expliquer :
> "Remplace le calcul inline `1 - (0.25 + p × 0.25)` par `computeAffutageFactor()` (helper extrait). La logique standard reste rigoureusement identique (`isXtremeUltra=false`). Le helper ajoute la branche Moehl/Meltzer pour ultras >200 km / >10 000 m D+ uniquement. Aucune ligne supprimée sans remplacement équivalent ou ajout fonctionnel justifié."

### 4. Aucun safeguard ajouté de ma propre initiative

Doctrine `feedback_ecouter_instructions_explicites`. Tous les seuils proposés sont :
- soit issus de doctrines existantes (Moehl/Meltzer pour F-2, Hammond pour F-4, D17 pour F-10)
- soit alignés sur des règles déjà présentes dans le code (MIN_SL_PROPORTION pour F-4, ondulation pour F-1)
- soit explicitement demandés par le brief utilisateur (F-3 seuil 30 m/km, F-9 intermediateRaces, F-10 confidence ≥ 15)

Aucun "garde-fou ajouté de moi-même" (ex: pas de clamp arbitraire sur progressionRate, pas de cap sur intermediateRaces.length sans demande).

---

## Récapitulatif effort + ordre

| Bug | Effort dev | Effort tests | Effort E2E | Total |
|---|---|---|---|---|
| F-1 | 1.5 h | 2 h | 1.5 h | **5 h** |
| F-2 | 1.5 h | 1 h | 0.5 h | **3 h** |
| F-3 | 0.5 h | 1 h | 0.5 h | **2 h** |
| F-4 | 1 h | 1.5 h | 0.5 h | **3 h** |
| F-8 MVP | 0.5 h | 1 h | 0.5 h | **2 h** |
| F-9 | 4.5 h | 1 h | 0.5 h | **6 h** |
| F-10 | 0.75 h | 0.5 h | 0.25 h | **1.5 h** |
| **TOTAL** | **10.25 h** | **8 h** | **4.25 h** | **22.5 h** |

**Ordre déploiement final** :
1. F-10 (premium auto-chain) — 1.5 h, zéro risque moteur
2. F-3 (plat-équivalent) — 2 h, post-process pur
3. F-2 (taper ultra Moehl) — 3 h, condition étroite
4. F-1 (stagnation long plan) — 5 h, fonction critique, validation 10 profils
5. F-4 (SL Trail Déb long) — 3 h, dépend F-1, validation 10 profils
6. F-9 (races intermédiaires) — 6 h, lift transverse types+UI+moteur
7. F-8 MVP (topographie) — 2 h, finition prompt

**Sprint timeline réaliste** : 4-5 jours dev solo avec validation intercalée.

---

## Fichiers principaux impactés

| Fichier | Bugs concernés |
|---|---|
| `src/services/geminiService.ts` | F-1, F-2, F-3, F-4, F-8, F-9 |
| `src/services/autoChainPolicy.ts` (nouveau) | F-10 |
| `src/types.ts` | F-9 |
| `src/components/Questionnaire.tsx` | F-9 |
| `src/App.tsx` | F-10 |
| `src/services/__tests__/*` (7 nouveaux fichiers) | tous |

**Aucun fichier non listé ne devrait être modifié.** Si une PR touche un autre fichier, c'est un signal de scope creep (doctrine `feedback_scope_strict`).
