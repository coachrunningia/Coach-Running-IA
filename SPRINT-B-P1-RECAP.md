# Sprint B P1 — Récap (3 fixes coach FFA major impact)

**Date** : 2026-05-22
**Hash commit** : `481bd26f2b3fba03697767a9320884519a2b199c`
**Branche** : `main`
**Push** : `d4fa636..481bd26 main -> main`
**Deploy** : `firebase deploy --only hosting` → OK
**Hosting URL** : https://coach-running-ia.web.app

---

## Fichiers modifiés

| Fichier | Lignes ajoutées | Type |
|---|---|---|
| `src/services/feasibilityService.ts` | +97 (Fix #2b L820-839 ; Fix #2c L841-902) | Modif |
| `src/services/geminiService.ts` | +55 (transparencyBlock L4124-4173) / -9 (ancien bloc statique) | Modif |
| `src/services/__tests__/sprint-b-p1-fixes.test.ts` | +328 (19 tests) | Nouveau |

## Tests ajoutés

19 tests dans `sprint-b-p1-fixes.test.ts` :
- **Bug #2b** (6 tests) : 30/60/70/75 ans + Guliver 72 ans + garde-fou 59 ans.
- **Bug #2c** (7 tests) : Guliver, sain 40 ans, raisonnable 35 ans, hors limite 30 ans, Riegel semi, Riegel 10K, senior 65 ans gap négatif.
- **Bug #5** (6 tests) : cv=S1, ratio ≤1.15, prudent 1.23, dur 1.40, brutal Clémentine 1.6, cv=0.

**Total suite** : 500 tests verts (481 Sprint A + 19 Sprint B P1).

## Build / Deploy

- `npx vitest run` → 500/500 verts.
- `npm run build` → OK, 39/39 pages prerendered, 0 errors.
- `firebase deploy --only hosting` → release complete.

## Effets théoriques sur profils audités

### Guliver (72 ans, PB Marathon 4h10, cible Marathon 3h55, plan 24 sem)
Avec le nouveau code (en preview d'un plan régénéré) :
1. Calcul brut : confidence ~99 (cible 3h55 proche du théorique pour VMA 13.5).
2. **Fix #2b** : 72 ans ≥ 70 → cap 75.
3. **Fix #2c** : pbGap = (250-235)/250 = 6% ; senior + gap > 4% → cap 70.
4. **Score final** : `min(99, 75, 70) = 70` → statut RISQUÉ ou AMBITIEUX selon resolveStatus.

Le 99% disparaît. Le plan reste généré (allure cible 3h55 respectée, doctrine `feedback_jamais_baisser_allure_cible`), mais la confidence est transparente.

### Clémentine (30 ans, Marathon 4h50, cv=25, S1=40, plan 10 sem)
Plan EXISTANT non patchable (doctrine `feedback_patch_live_plans_jour_seulement` — S1 en cours).
Pour un futur plan régénéré dans le même cas :
1. `s1Ratio = 40/25 = 1.6` → palier **BRUTAL** (zone rouge Gabbett).
2. Le `transparencyBlock` injecté dans le prompt contient :
   - `+60%`, `Gabbett 1.6`, `risque de blessure`, `vigilance accrue`, `lecture obligatoire`.
   - Modèle de message : "Ta S1 démarre à 40km, soit +60% au-dessus de ton volume actuel (25km). C'est un saut violent en zone rouge Gabbett (ratio 1.6 > 1.5)…"
3. Plus de wording "un peu plus" / "reste progressif" — chiffrage brut imposé au LLM.

## Doctrines respectées

- `feedback_jamais_baisser_allure_cible` — on touche scores + welcome, l'allure cible reste intacte.
- `feedback_input_client_obligatoire` — currentVolume, PB, allures, dates : aucun input écrasé.
- `feedback_securite_avant_conversion` — wording brutal sur palier rouge, mention risque + lecture obligatoire.
- `feedback_jamais_poids_minceur` — testé (modèle ne contient ni poids/IMC/silhouette).
- `feedback_chaque_ligne_justifiee` — commentaire inline sur chaque condition (cap senior, cap PB, paliers).
- `feedback_compromis_messages_preventifs` — paliers 3 niveaux > tout-ou-rien.

## Verif post-deploy

- Console Firebase : `https://console.firebase.google.com/project/coach-running-ia/overview`
- Hosting URL : `https://coach-running-ia.web.app`
- Tests live : à valider en générant un preview Guliver-like et Clémentine-like dans l'app.
- Les plans EXISTANTS en base ne sont pas touchés (doctrine `feedback_patch_live_plans_jour_seulement`).

## Sprint suivant (P2)

Reste **Bug #1** (targetPace variations "X → Y" pour négative split / progressif / fartlek) — 1h estimée, polish UI, hors scope P1.
