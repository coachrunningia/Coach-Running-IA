# F-17 — PM Tech : Allures dynamiques ou statiques ?

**Question Romane** : "Les allures sont TOUJOURS DYNAMIQUES, il suffit d'actualiser ?"
**Verdict court** : **Romane a tort sur la techno actuelle, raison sur l'intention produit.** Les allures sont **STATIQUES** dans Firestore (string figé par Gemini), MAIS une infrastructure de recalibrage existe DÉJÀ (`handleRecalculateVMA`) et fait exactement ce que F-17 demande.

---

## 1. Verdict statique vs dynamique (par champ)

### `targetPace` — **STATIQUE en Firestore**
- **Stockage** : `Session.targetPace?: string` (`types.ts:191`) — ex `"8:57"` figé à la génération Gemini.
- **Rendu** : `SessionCard.tsx:88` `const raw = session.targetPace;` → parsing format (mm:ss / km/h) + conversion unité **uniquement** (`L100-115`). **Aucun calcul depuis `plan.vma`** côté affichage.
- **Origine** : `geminiService.ts:1118-1133` (post-process LLM) ou `L1048` (fallback) — toujours écrit en dur sur l'objet `session`.

### `mainSet` — **STATIQUE en Firestore**
- **Rendu** : `SessionCard.tsx:371` `{formatText(session.mainSet)}` — affiche tel quel, juste conversion min/km↔km/h via regex (`L70-77`).
- Aucun rebuild dynamique. Le texte `"6×400m à allure 4:30/km récup 1'30"` est gravé par Gemini puis lu brut.

### Fractionnés (Fractionné / VMA / Seuil) — **STATIQUE, pas de champ séparé**
- **Pas de `intervalPace` ni `mainSetPace`**. L'allure des intervalles est **embarquée dans la string `mainSet`** + dupliquée dans `targetPace`.
- Conséquence : si on change la VMA, l'allure visible sur la carte (`targetPace`) peut bouger SANS que le détail du `mainSet` (ex : `"à allure 4:30/km"`) bouge → **incohérence** si on ne regénère pas le texte.

---

## 2. Réponse aux 5 questions

| # | Question | Réponse | File:line |
|---|---|---|---|
| 1 | `targetPace` dynamique ? | **NON, lu statique** | `SessionCard.tsx:88` |
| 2 | `mainSet` regénéré ? | **NON, lu statique** | `SessionCard.tsx:371` |
| 3 | Champ séparé pour fractionnés ? | **NON**, allure dans `targetPace` ET hardcodée dans string `mainSet` | `types.ts:179-196` |
| 4 | Si je change `plan.vma` en Firestore sans rien d'autre ? | **RIEN ne se met à jour** côté user. Le user voit toujours les anciennes allures `targetPace` + l'ancien texte `mainSet`. | n/a |
| 5 | Stratégie minimale F-17 | **L'infra existe déjà** : `handleRecalculateVMA` (`App.tsx:1046-1303`). Voir §3. | `App.tsx:1046` |

---

## 3. Stratégie minimale F-17 — **NE RIEN CODER, ÇA EXISTE DÉJÀ**

### Le code complet est déjà là :

**Trigger UI** : `PlanView.tsx:2505-2643` (Modal "Recalculer mes allures", 2 modes : VMA manuelle ou ressenti).

**Handler** : `App.tsx:1046-1303` `handleRecalculateVMA(newVMA)` :
1. Recalcule toutes les paces via `calculateAllPaces(newVMA)` (`L1074`).
2. Pour les **semaines déjà vécues (avec feedback)** : applique `updateSessionPaces` (`App.tsx:1208-1234`) qui patche **uniquement `targetPace`** par mapping type/intensité → `recoveryPace` / `seuilPace` / `vmaPace` / `efPace`. **`mainSet` non touché** dans les semaines passées (volontaire, ne pas réécrire l'historique).
3. Pour les **semaines futures (sans feedback)** : appelle `generateRemainingWeeks(previewPlan, ...)` (`L1199`) qui regénère via Gemini avec le nouveau `generationContext.paces` → **`mainSet` ET `targetPace` cohérents tous deux**.
4. `savePlan(fullPlan)` (`L1258`) + `setPlan(fullPlan)` → Firestore + state React.

### Ce qui manque (zéro) :
- Aucun regex sur `mainSet` à écrire — `generateRemainingWeeks` s'en charge.
- Aucune migration Firestore — le handler fait save + update state.
- Aucun helper `paceFromVMA` à ajouter — `calculateAllPaces` (`geminiService.ts`) existe.

### Limitation actuelle connue (à arbitrer) :
- Les semaines **avec feedback** gardent leur `mainSet` d'origine (anciennes allures dans le texte) MAIS `targetPace` mis à jour → **incohérence visuelle** : la carte affiche l'allure cible neuve mais le bloc "Séance Principale" expanded affiche l'ancienne allure dans `"6×400m à 4:30/km"`. (`App.tsx:1208-1234` ne touche pas `mainSet`.)
  - **Si F-17 veut tout aligner** : étendre `updateSessionPaces` pour faire un regex sur `mainSet` qui remplace `\d+:\d{2}/km` par la nouvelle allure correspondante au type de séance. Risque : casse les allures spécifiques course intégrées dans le texte.
  - **Compromis raisonnable** : laisser `mainSet` figé sur les semaines vécues (cohérent avec doctrine "Patch live = plans du jour uniquement", ne pas réécrire le passé).

---

## 4. Cas Robine : `plan.vma` 8.3 → 10 en Firestore manuel

**Si tu modifies UNIQUEMENT `plan.vma`** dans la console Firestore :
- **Côté user, rien ne change visuellement.** Toutes les séances gardent `targetPace: "8:57"`, `mainSet: "...à allure 10:47/km"` (anciennes valeurs Gemini).
- Le champ `plan.vma` est lu pour : le modal recalibrage (default value, `PlanView.tsx:2555`), le bouton VMA dans le header. Pas pour le rendu des séances.

**Si tu veux que ça mette à jour** :
- Option A (canonique) : ouvrir le plan dans l'app → bouton "Recalculer mes allures" → entrer 10 → ça appelle `handleRecalculateVMA(10)` qui fait tout le boulot.
- Option B (admin direct Firestore) : il faut écrire AUSSI `plan.paces` (les 9 paces recalculées) ET `plan.generationContext.paces` ET regénérer manuellement chaque `session.targetPace` + `session.mainSet` Gemini. Hors de question manuellement.

---

## 5. Conclusion PM

- Romane a **raison sur l'intention** : F-17 = "user change VMA → tout se met à jour". Cette feature **EXISTE déjà à 95%** via `handleRecalculateVMA`.
- Romane a **tort techniquement** : les allures ne sont **PAS dynamiques** côté rendu. Elles sont figées en Firestore et regénérées **uniquement** lors du recalcul explicite (modal VMA).
- **Ce qu'il reste à arbitrer pour F-17** :
  1. **Doit-on aligner `mainSet` des semaines vécues** sur la nouvelle VMA ? (Doctrine actuelle : NON, on garde l'historique.)
  2. **Doit-on déclencher le recalcul automatiquement** dès que `plan.vma` est modifié quelque part (ex : Strava update), ou rester opt-in via modal ? (Recommandation : opt-in, le user doit consentir à la régénération qui consomme Gemini.)
  3. **UI à améliorer** : exposer la modal "Recalculer" plus visiblement si la VMA stockée diffère de la VMA "détectée" (Strava récente, performances récentes).

**Aucune ligne de code à écrire pour faire fonctionner le pipeline.** F-17 = essentiellement un travail UX/produit, pas tech.
