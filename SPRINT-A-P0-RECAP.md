# Sprint A P0 — Récap exécution

Date : 2026-05-22
Source : `VERDICT-EXPERT-5-BUGS.md` (verdict expert FFA 20 ans)

---

## Commit

- Hash : `d4fa6360a363b64665926b43a607e3fc7ee46b57`
- Branche : `main`
- Push : ✅ poussé sur `origin/main`
- Message : `fix(planning): Sprint A P0 — 3 fixes critiques validés expert FFA`

---

## Fichiers modifiés

| Fichier | Lignes touchées | Bug |
|---|---|---|
| `src/services/feasibilityService.ts` | +6 (champ `s1ActualVolume` FeasibilityParams) ; +5 / -2 (calculateFeasibility) ; +5 / -2 (buildFinisherFeasibility) | #2a |
| `src/services/geminiService.ts` | applyMarcheCourseRouting réécriture (~40 lignes) ; cap S1 ACWR dans calculatePeriodizationPlan (~10 lignes) ; 3 call sites MC mis à jour ; passage `s1ActualVolume` à `calculateFeasibility` Preview | #2a, #3, #4 |
| `src/services/__tests__/sprint-a-p0-fixes.test.ts` | **Nouveau** — 14 tests anti-régression | #2a, #3, #4 |
| `src/services/__tests__/marche-course-routing.test.ts` | 5 tests patchés (passage ctx Débutant) | #4 |
| `src/services/__tests__/marche-course-routing-french.test.ts` | 5 tests patchés (passage ctx Débutant) | #4 |
| `src/services/__tests__/semi-marathon-volume-floor.test.ts` | P0c-2 mis à jour (pic dégradé par cap ACWR cv=10 Marathon) | #3 |
| `src/services/__tests__/realistic-factor-semi-marathon.test.ts` | Louleroy cv=10 mis à jour (pic ≥ 17 au lieu de ≥ 20) | #3 |

---

## Tests

- **Nouveau fichier** : `src/services/__tests__/sprint-a-p0-fixes.test.ts` (14 cas)
  - Bug #2a : 3 cas (Clémentine, cas sain, rétrocompat sans s1ActualVolume)
  - Bug #3 : 4 cas (Clémentine cv=25 cap≤33 ; Conf cv=50 pas de cap ; senior cv=50 ACWR 1.0 ; cv=0 pas de cap)
  - Bug #4 : 7 cas (Débutant VMA 8 cv 5 actif ; Guliver Expert VMA 13.5 cv 50 désactivé ; Clémentine Conf VMA 11 cv 25 désactivé ; Débutant VMA 11 cv 12 actif ; reprise Inter VMA 9.5 cv 8 actif ; idempotent ; legacy fallback sans ctx)

- **Suite complète Vitest** : `481/481 verts` (33 fichiers)
- **Build** : OK (39 prerenders, 0 erreurs)

---

## Vérification post-deploy

⚠️ **Déploiement Firebase à exécuter manuellement** : la session `firebase` CLI a expiré (Authentication Error). À lancer :
```bash
firebase login --reauth
firebase deploy --only hosting
```
URL attendue : `https://coach-running-ia.web.app` (cf. `firebase.json`).

Build artefact prêt dans `dist/` (39 routes pré-rendues).

---

## Effets attendus sur les profils audités (si re-génération)

### Guliver (72 ans, Expert VMA 13.5, cv 50, Marathon 3h55, 24 sem)
- **Bug #2a** : pas d'effet majeur (S1≈50, sautPct ~ 0, règle 4 ne mord pas).
- **Bug #3** : pas de cap (S1 raw ≤ 1.3×50=65 OK).
- **Bug #4** : ✅ corrigé — la SL 18 km ne sera **plus** typée Marche/Course. Type "Sortie Longue" conservé, phrase walk-break retirée du mainSet.
- Score feasibility : ce sprint A ne touche pas le score senior+PB (Sprint B). Score reste ≈ 99 pour l'instant.

### Clémentine (30 ans, Confirmé VMA 11, cv 25, Marathon 4h50, 10 sem)
- **Bug #3** : ✅ S1 calibrée passe de 40 → **32 km** (cap 1.3×25). Le pic du plan est dégradé (rampe S1→pic limitée par S1 plus basse) mais reste cohérent avec doctrine ACWR.
- **Bug #2a** : ✅ avec S1=32 et cv=25, sautPct = 0.28 (< 0.50, > 0.30 → pénalité 10 mais pas cap 10). Statut probable : RISQUÉ (score ~ 50-70) au lieu de l'ancien excellent.
  - Si l'ancien plan avait S1=40 (avant Bug #3) → sautPct=0.60 → cap 10 (IRRÉALISTE strict).
  - Après Bug #3 le cap ACWR ramène S1=32 → la situation est mécaniquement plus saine, le statut sera proportionnellement moins sévère mais pas EXCELLENT.
- Plan live de Clémentine **non touché** (doctrine `feedback_patch_live_plans_jour_seulement` : S1 commencée). Le fix s'applique aux NOUVEAUX plans similaires.

### Profils sains (cv=50 S1=55 ACWR 1.10, ou cv=40 S1=45 ACWR 1.125)
- **Aucun changement** : ratio < 1.3, pas de cap ; sautPct < 0.30, pas de pénalité ; niveau Confirmé/Expert, pas de routing MC injecté.

---

## Garde-fous doctrine respectés

- `feedback_input_client_obligatoire` : currentVolume utilisateur respecté comme baseline, jamais écrasé.
- `feedback_jamais_baisser_allure_cible` : ce sprint ne touche **pas** les allures (5k/10k/Semi/Marathon).
- `feedback_mode_marche_course_scope` : routing MC ré-aligné Débutants uniquement (+ exception reprise santé VMA<10 ET cv<10).
- `feedback_securite_avant_conversion` : feasibility prévient désormais correctement sur saut S0→S1 violent (règle 4 R2 vivante).
- `feedback_chaque_ligne_justifiee` : chaque ligne ajoutée commentée avec référence Bug # + VERDICT-EXPERT-5-BUGS.md.
- `feedback_patch_live_plans_jour_seulement` : code-only, aucun plan existant modifié.
- `feedback_compromis_messages_preventifs` : cap ACWR 1.3 (zone verte/jaune) plutôt que 1.2 strict ou 1.5 rouge.

---

## Sprint B / C (suite recommandée)

Hors scope ce sprint, à coder ensuite :
- **Sprint B** : Fix #2b (cap senior ≥60 + gapPercent) + Fix #2c (cross-check PB) + Fix #5 (welcomeMessage paliers ACWR).
- **Sprint C** : Fix #1 (targetPace variations "X:XX → Y:YY" pour titres négative split / progressif / fartlek).

Sans Sprint B, Guliver garde un score ~99 (pas de cap senior + PB). Sprint A débloque la **mécanique** R2 règle 4 pour Sprint B.
