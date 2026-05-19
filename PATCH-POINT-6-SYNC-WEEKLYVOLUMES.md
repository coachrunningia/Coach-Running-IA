# Patch point 6 — sync weeklyVolumes vs séances
Date : 2026-05-19
Commit : `38a066a9b3b897e6aeb4acde47fc2fff9842495d`
Branche : `main` (commit local, **pas pushé**, pas déployé)

---

## 1. Cause racine

`enforceWeekConstraints` (`src/services/geminiService.ts` L1199-1841) mute `session.duration` et `session.distance` à travers 9 sections de caps successifs :

| Section | Lignes | Mutation |
|---|---|---|
| 1. Cap SL duration | 1212-1241 | `s.distance` proportionnel au facteur de cap durée |
| 1a-bis. Garde-fou SL min km | 1250-1287 | `slInWeek.distance = targetKm` |
| 1b. Cap durée non-SL | 1291-1305 | `s.distance` proportionnel |
| 1c. SL proportion + min duration | 1307-1397 | Plusieurs `s.distance` |
| 2. Cap session km | 1399-1414 | `s.distance = maxKm` |
| 5. Cap volume hebdo absolu | 1488-1509 | `s.distance` proportionnel |
| 6. Recalibrage ±10% target | 1511-1570 | scale UP/DOWN multiple `s.distance` |
| 7. Conversion micro-séances → Repos | 1572-1655 | distance supprimée + redistribution |
| 9. Variation footings | 1736-1780 | swap distances |

Aucune de ces sections ne touche `generationContext.periodizationPlan.weeklyVolumes`. Conséquence : l'UI lit `weeklyVolumes[weekIdx]` (valeur de périodisation initiale) qui diverge de `sum(session.distance)` (valeur effective post-cap).

Le bug est structurel depuis l'introduction des caps. Audit Thomas (`audit-thomas-plan-parsed.json`) confirme : drift réel à -7% sur S15.

## 2. Modifs appliquées

### Fichier : `src/services/geminiService.ts`

**A. Signature étendue** (L1199-1208) — ajout de 2 paramètres optionnels :

```ts
export const enforceWeekConstraints = (
  week: any,
  targetVolume: number,
  questionnaireData: any,
  weeklyVolumes?: number[],
  weekIdx?: number,
): void => { ... }
```

Optionnel ⇒ rétrocompatible. Les 3 callers existants sont mis à jour pour passer `weeklyVolumes` + `idx`.

**B. Bloc de sync** (ajouté à la toute fin de la fonction, après la sync mainSet) — recalcule `weeklyVolumes[weekIdx]` post-mutations :

```ts
if (weeklyVolumes && weekIdx !== undefined && weekIdx >= 0 && weekIdx < weeklyVolumes.length) {
  const sumCourseKm = week.sessions
    .filter((s: any) => s.type !== 'Renforcement' && s.type !== 'Repos')
    .reduce((sum: number, s: any) => {
      const km = parseKm(s.distance);
      return sum + (km > 0 ? km : 0);
    }, 0);

  const oldVolume = weeklyVolumes[weekIdx];
  const newVolume = Math.round(sumCourseKm);

  if (Math.abs(newVolume - oldVolume) >= 2) {
    console.log(`[Enforce] weeklyVolumes[${weekIdx}] resync: ${oldVolume}km → ${newVolume}km (post-enforceWeekConstraints, sum=${sumCourseKm.toFixed(1)}km)`);
    weeklyVolumes[weekIdx] = newVolume;
  }
}
```

Précautions respectées :
- Renforcement et Repos exclus du calcul (km=0 par convention, ou non-applicable).
- Seuil 2 km pour éviter de muter sur du bruit d'arrondi (≤1 km).
- Log structuré `[Enforce]` pour traçabilité.
- Mutation in-place du tableau passé par référence (cohérent avec le pattern de la fonction).

**C. Mise à jour des 3 callers** :
- L4180 (Preview pipeline)
- L4959 (Full plan pipeline pass 1)
- L4991 (Full plan pipeline post-Layer3)

### Fichier nouveau : `src/services/__tests__/enforceWeekConstraints-syncWeeklyVolumes.test.ts`

6 tests anti-régression couvrant les 5 cas demandés + 1 cas dérivé (week mixte renfo+course).

## 3. Validation runtime Thomas

Simulation locale du sync sur `audit-thomas-plan-parsed.json` (plan final stocké en base, donc déjà après tous les caps) :

| Semaine | Phase | weeklyVolumes avant | sum réelle | drift avant | weeklyVolumes après patch | drift après |
|---|---|---|---|---|---|---|
| S1 | fondamental | 40 | 40.0 | 0.0% | 40 | 0.0% |
| S2 | fondamental | 43 | 43.0 | 0.0% | 43 | 0.0% |
| S3 | fondamental | 47 | 47.0 | 0.0% | 47 | 0.0% |
| S4 | recuperation | 37 | 37.0 | 0.0% | 37 | 0.0% |
| S5 | fondamental | 43 | 43.0 | 0.0% | 43 | 0.0% |
| S6 | developpement | 49 | 49.0 | 0.0% | 49 | 0.0% |
| S7 | developpement | 56 | 56.0 | 0.0% | 56 | 0.0% |
| **S8** | **recuperation** | **48** | **46.0** | **4.2%** | **46** ← SYNC | **0.0%** |
| S9 | developpement | 55 | 55.0 | 0.0% | 55 | 0.0% |
| S10 | developpement | 63 | 63.0 | 0.0% | 63 | 0.0% |
| S11 | developpement | 67 | 67.0 | 0.0% | 67 | 0.0% |
| S12 | recuperation | 54 | 54.0 | 0.0% | 54 | 0.0% |
| S13 | specifique | 62 | 62.0 | 0.0% | 62 | 0.0% |
| **S14** | **specifique** | **67** | **64.0** | **4.5%** | **64** ← SYNC | **0.0%** |
| **S15** | **specifique** | **71** | **66.0** | **7.0%** | **66** ← SYNC | **0.0%** |
| S16 | recuperation | 57 | 57.0 | 0.0% | 57 | 0.0% |
| S17-19 | affutage | 47/41/36 | 47/41/36 | 0.0% | inchangé | 0.0% |

**Conclusion** : 3 semaines en drift (S8/S14/S15), toutes ramenées à drift=0% par le patch. Les 16 autres semaines sont inchangées (drift initial < seuil 2 km, donc no-op).

Note : sur le plan stocké, la valeur de `weeklyVolumes` reflète la périodisation initiale (avant caps). Le patch déplace cette valeur vers la somme effective des séances. C'est exactement ce qui résout le mismatch UI.

## 4. Tests

```
Test Files  15 passed (15)
     Tests  245 passed (245)
```

Baseline pré-patch : 239 tests. Après patch : 245 (+6). Aucune régression sur les 239 existants.

Les 6 nouveaux tests couvrent :
1. Week avec session cap → resync OK
2. Week renfo-only + targetVolume=0 → early-return préservé (sync skip, pas de crash)
2b. Week mixte renfo+course → renfo exclu du calcul, sync OK
3. Pas de mutation distance → weeklyVolumes inchangé (pas de bruit < seuil 2 km)
4. `weeklyVolumes` undefined ou `weekIdx` hors borne → pas de crash, no-op
5. Drift Thomas S15 reproduit → sync vers somme réelle (< 71 km original)

## 5. Build

```
npm run build → exit 0
[Prerender] Done in 165.2s — 37 OK, 0 errors
```

Build vert.

## 6. Commit

- Hash : `38a066a9b3b897e6aeb4acde47fc2fff9842495d`
- Branche : `main`
- Statut : **commit local uniquement, pas pushé, pas déployé**
- En attente Romane pour push + deploy

## 7. Risques identifiés / à flagger

### A. enforceFullPlanConstraints (geminiService.ts L1815-1916) — **NON PATCHÉ**

`enforceFullPlanConstraints` est appelé APRÈS `enforceWeekConstraints` à chaque pipeline (L4183, L4963, L4995). Il mute des distances via :
- `scaleWeekVolume` (affûtage, post-recovery, progression +15%) → L1844 `s.distance = ${newKm} km`
- Re-cap session max km (section 3) → L1909 `s.distance = ${maxKm} km`

**Ces mutations ne syncent PAS `weeklyVolumes`**. Si elles se déclenchent (cas : plan avec affûtage trop volumineux, progression > +15%, post-recovery rebond), le sync fait par `enforceWeekConstraints` est invalidé.

Sur Thomas, ces mutations n'ont apparemment pas été déclenchées (sinon le drift aurait persisté différemment). Mais sur d'autres profils, c'est un risque.

**Recommandation** : Romane décide si on patche aussi `enforceFullPlanConstraints`. Patch équivalent = même bloc de sync à la fin du `scaleWeekVolume` interne, ou un dernier passage `weeks.forEach((w, i) => syncWeeklyVolumes(w, i, weeklyVolumes))` à la fin de la fonction. Je ne le fais pas dans ce commit pour rester chirurgical.

### B. applySessionScale (sessionScale.ts L98)

Utilisé uniquement à l'intérieur de `enforceWeekConstraints` (L1802) pour resync `mainSet`. Il prend en entrée des `newDur/newKm` déjà fixés et n'introduit pas de nouvelle mutation distance par lui-même. **Pas de risque additionnel**.

### C. buildFootingVariant (footingVariants.ts)

Pas de mutation `.distance` détectée (grep négatif). **Pas de risque**.

### D. Renforcement avec distance non-nulle

Si Gemini hallucinait une distance > 0 sur une Renforcement (bug LLM), elle serait **ignorée** dans le calcul (filtre `type !== 'Renforcement'`). Comportement intentionnel : Renfo = pas de km running.

### E. Ordre dans le pipeline post-Layer3

À L4989, `enforceWeekConstraints` est rappelé après Layer 3 (Gemini regen). Comme le sync est inclus dans la fonction et est appelé avec le même `weeklyVolumes` (mutation in-place), chaque appel resync correctement. **Pas de risque**.

---

## Décision attendue de Romane

- [ ] Valider le patch tel quel et autoriser `git push origin main` + déploiement
- [ ] Demander un patch supplémentaire sur `enforceFullPlanConstraints` (point 7.A) avant deploy
- [ ] Autre direction
