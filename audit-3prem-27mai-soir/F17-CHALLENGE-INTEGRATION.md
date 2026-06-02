# F-17 — Challenge intégration `paceRecalibrationService` dans `handleRecalculateVMA`

Audit hostile bienveillant. Question : remplacer `generateRemainingWeeks(Gemini)` par swap pur ?

---

## 1. Verdict 1-ligne

**HYBRIDE (Option C dégradée → C').** Swap pur **partout par défaut** + **régénération Gemini opt-in** sur clic explicite "Régénérer la prose" (toast post-swap). Le 30-60s d'attente n'est PAS la valeur produit ; la cohérence chiffres/`targetPace` l'est.

---

## 2. Risques concrets identifiés

1. **Narratif obsolète post-swap.** Gemini écrit `"ce footing à 8:57 prépare ton seuil à 5:30"`. Si VMA monte → swap donne `"footing à 8:08 prépare ton seuil à 5:05"`. Numériquement OK, mais la **logique pédagogique** (prépare quoi) peut devenir bancale sur de gros écarts (>1.5 km/h). Risque cosmétique, pas fonctionnel.
2. **Trail D+ Cory Smith (D16).** `targetPace` trail est déjà patché par séance selon D+/km, **dérivé d'une formule Minetti**, pas linéaire VMA. Le swap map traite ces paces comme des paces normales → écrasement silencieux du patch D16. **BLOQUANT V1.** Mitigation : skip si `session.elevationGain > 150` OU `goal === 'trail'`.
3. **Race day (`_raceDay:true`).** `targetPace` lié au `targetTime`, pas à la VMA. Le swap, si `freezeRaceSpecificPaces:true`, exclut allureSpecifique*, mais `raceDayInject` peut avoir mis une pace race custom. **À tester explicitement** — le service ne le gère pas.
4. **Faux-positif durées 3:00-3:59.** Si VMA élite (vmaPace ~3:30), une durée "Repos 3:30" pourrait matcher swap. Mitigation `swap.has()` aide MAIS si oldPaces.vmaPace == "3:30" ET texte = "Repos 3:30", collision. Edge case élite, faible probabilité, mais existe.
5. **Niveau effectif change (deb→inter).** Code actuel L1114-1132 réduit les volumes périodisation de 12% par cran. Le swap pur **ne touche pas la périodisation** ni les volumes. Si user passe expert→inter avec VMA en baisse, plan reste structuré "expert" → surcharge potentielle. **Doctrine sécurité > UX, point critique.**

---

## 3. Bénéfices

1. **UX instantanée** (<100ms vs 30-60s). Romane voit le changement en live, plus de "ça charge dans le vide".
2. **Zéro coût Gemini** sur recalibrage (économie quota + résilience offline).
3. **Idempotent par construction** (45 tests valident A→B→C, A→A no-op). Plus robuste que regen Gemini qui peut produire un plan légèrement différent à chaque appel.
4. **Préserve la prose vécue** des séances complétées (feedback) — cohérent avec doctrine `feedback_patch_live_plans_jour_seulement`.
5. **Source unique** : élimine la divergence actuelle `targetPace` patché (L1208-1234) vs `mainSet` non touché — bug visible aujourd'hui.

---

## 4. Recommandation finale

**Option C' = swap pur autoritaire + bouton Gemini opt-in.**

Justification : le bug **prioritaire** que Romane voit n'est PAS "le narratif Gemini est moins beau", c'est "ça charge dans le vide 30s et je ne sais pas si ça marche". Le swap pur résout ce bug **immédiatement** ET règle l'incohérence `targetPace`/`mainSet` qui existe déjà (cf. F17-CHALLENGE-DEV constate `targetPace=10:47` + mainSet "10:47" sur W1 Robine). Garder Gemini regen par défaut = persister l'attente + ne PAS résoudre l'incohérence (le service n'est pas branché). L'Option B (loader visible seulement) est un pansement qui ne corrige rien. L'Option D (regen S1-S3) garde une attente significative pour zéro bénéfice sur le risque #1 (le narratif obsolète est cosmétique, pas safety). Le **risque sécurité #5 (volumes périodisation après bascule de niveau)** n'est résolu par AUCUNE des 4 options — il faut le traiter séparément, indépendamment du choix swap vs regen, en gardant la logique L1114-1132 active. Le bouton "Régénérer la prose" opt-in (post-swap, async toast) couvre le risque #1 sans bloquer l'UX. **NO-GO bouton automatique trail D+** : skip explicite tant que D16-compat pas testé (cf. risque #2).

---

## 5. Plan code minimal (file:line)

### A. `src/App.tsx` L1182-1259 — Remplacer le bloc `generateRemainingWeeks`

```ts
// Remplacer L1182-1259 par :
const { recalibrateSession } = await import('./services/paceRecalibrationService');
const oldPaces = plan.generationContext?.paces;

const recalWeeks = plan.weeks.map((week, wIdx) => {
  // Doctrine patch_live : ne pas toucher les semaines avec feedback déjà vécu
  // (en réalité ici on patch QUAND MÊME les paces affichées car targetPace
  // obsolète casse la confiance — cf. F17-CHALLENGE-DEV)
  return {
    ...week,
    sessions: week.sessions.map(s => {
      // Skip trail D+ patché Cory Smith (D16) — incompatible swap V1
      if ((s as any)._raceDay) return s; // ne jamais toucher race day
      if ((s as any).elevationGain && (s as any).elevationGain > 150) return s;
      return recalibrateSession(s, oldPaces, newPaces, { freezeRaceSpecificPaces: true });
    }),
  };
});

const updatedPlan: TrainingPlan = {
  ...plan,
  weeks: recalWeeks,
  vma: newVMA,
  vmaSource: updatedContext.vmaSource,
  paces: newPaces,
  generationContext: updatedContext,
  ...(newFeasibility ? { feasibility: newFeasibility } : {}),
};
await savePlan(updatedPlan);
setPlan(updatedPlan);
```

### B. `src/App.tsx` ~L1291 — Toast post-swap + CTA opt-in

```ts
setAdaptationMessage(
  `Allures recalibrées instantanément. VMA ${oldVMA.toFixed(1)} → ${newVMA.toFixed(1)} km/h. ` +
  `Allure EF : ${newPaces.efPace}.` + levelChangeInfo + feasibilityWarning + bigChangeWarning
  // PAS de "X semaines conservées" — toutes sont swappées (cohérent doctrine).
);
// Bouton "Régénérer la prose Gemini" → trigger generateRemainingWeeks en background SEULEMENT si user clique.
```

### C. `src/App.tsx` L1114-1132 — **NE PAS TOUCHER**

La logique de réduction des volumes périodisation reste active (risque #5). Indépendante du swap.

### D. Smoke test obligatoire avant merge

- 3 plans réels : floggyz (EF dans mainSet), mxjulien02 (multi-pace fractionné), 1 plan trail D+ Cory Smith → vérifier skip propre.
- Cas Robine : VMA 8.3 → 10.0 ré-applique le swap, W1 cohérent.

**Estimation : 30 min code + 30 min smoke test = 1h.** Le service est déjà testé (45 tests). Le risque résiduel #1 (narrative obsolète) est ACCEPTABLE en V1 car cosmétique ; le bouton opt-in le couvre proprement.
