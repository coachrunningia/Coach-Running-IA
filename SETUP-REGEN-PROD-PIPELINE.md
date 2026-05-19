# Regen Plan from Snapshot — Setup

Permet d'appeler `generatePreviewPlan` (le pipeline prod) **depuis Node**, sans navigateur, pour un test de non-régression sur N profils.

## Quickstart

```bash
# 1. Une fois : esbuild + dotenv déjà installés ; rien à faire.

# 2. Lancer un regen sur un profil
cd ~/Coach-Running-IA
node regen-plan-from-snapshot.mjs \
  --input test-profile-fixture.json \
  --output /tmp/plan.json
```

Le bundle prod (`scripts/regen/.build/pipeline.mjs`) est (re)généré automatiquement à la première exécution, ou si `src/services/geminiService.ts` est plus récent que le bundle.

## Format du fichier `--input`

Même schéma que `questionnaireSnapshot` dans Firestore :
```json
{
  "email": "test@test.local",
  "sex": "Homme",
  "age": 35,
  "weight": 70,
  "height": 175,
  "currentWeeklyVolume": 30,
  "goal": "Course sur route",
  "subGoal": "10 km",
  "level": "Confirmé (Compétition)",
  "frequency": 4,
  "targetTime": "45min",
  "raceDate": "2026-09-01",
  "startDate": "2026-05-19",
  "recentRaceTimes": { "distance5km": "21:30", "distance10km": "45:00" },
  "injuries": [],
  "trainingEnvironment": "Route",
  "hilliness": "Mixte"
}
```
Voir `test-profile-fixture.json` (10K Confirmé) et `test-profile-fixture-marathon.json` (Marathon Finisher) pour des templates concrets.

## Variables d'environnement

Lues automatiquement depuis `~/Coach-Running-IA/.env` :
- `VITE_GEMINI_API_KEY` (obligatoire)
- `VITE_R2_GATES_ENABLED` (optionnel, défaut activé)
- `VITE_R3_PROMPT_DPLUS_ENABLED` (optionnel, défaut activé)

## Architecture (option C retenue)

**Approches tentées :**
- **A. `tsx` + custom Node loader pour patcher `import.meta.env` à la volée** → échec : tsx route une partie des modules via CJS, ce qui bypass un loader ESM custom. tsx CLI a aussi un bug `?namespace=` qui empêche la résolution de `@google/generative-ai`.
- **B. Import direct du bundle Vite `dist/assets/`** → écarté : Vite utilise un manifest `__vite__mapDeps` et split en chunks, pas consommable hors navigateur sans gymnastique.
- **C. Re-bundle ciblé avec esbuild + `define` pour remplacer `import.meta.env.X` → `process.env.X`** → **retenu**. Robuste, déterministe, ne touche pas le source.

**Pipeline :**
```
src/services/geminiService.ts (+ deps : planUtils, feasibility, renfo, footing,
  sessionScale, planValidator, types)
                ↓ esbuild (scripts/regen/build-pipeline.mjs)
                ↓ define: import.meta.env.X → process.env.X
scripts/regen/.build/pipeline.mjs (ESM, ~420 KB)
                ↓ dynamic import depuis regen-plan-from-snapshot.mjs
generatePreviewPlan(profile) → plan JSON
```

## Limitations connues

1. **Modèle Gemini** : le code prod cible `gemini-3-flash` (constante dans `geminiService.ts`). Si la clé API utilisée n'a pas accès à ce modèle (cas observé en mai 2026 → 404), passer un override **au build** :
   ```bash
   REGEN_MODEL_OVERRIDE=gemini-2.5-flash node scripts/regen/build-pipeline.mjs
   # puis relancer regen-plan-from-snapshot.mjs --rebuild=false
   # ou en une commande:
   REGEN_MODEL_OVERRIDE=gemini-2.5-flash node regen-plan-from-snapshot.mjs ... --rebuild
   ```
   À utiliser **uniquement** pour valider l'infra ; pour un vrai test de non-régression, utiliser le même modèle que la prod.

2. **Bundle externe** : `@google/generative-ai`, `@google/genai`, `firebase`, `firebase-admin` sont marqués `external` (résolus à l'exécution depuis `node_modules`). Si une nouvelle dépendance prod apparaît, l'ajouter à la liste `external` dans `build-pipeline.mjs`.

3. **Pas de Firebase ni Brevo** : le script appelle uniquement `generatePreviewPlan` (pure compute + appel Gemini). Pas d'écriture Firestore, pas d'envoi mail. Le plan retourné est le JSON brut tel que la prod le persisterait.

4. **`generateRemainingWeeks` non testé ici** : exporté par le bundle (donc importable) mais non couvert par le script principal. Pour tester le plan complet (toutes semaines), il faudrait étendre `regen-plan-from-snapshot.mjs` à 2 appels successifs.

5. **Bundle invalide après modif du source** : le script vérifie `mtime` et rebuild si `geminiService.ts` est plus récent. Pour forcer : `--rebuild`.

## Fichiers livrés

- `regen-plan-from-snapshot.mjs` — script principal (CLI)
- `scripts/regen/build-pipeline.mjs` — bundler esbuild (rerun manuellement ou auto)
- `scripts/regen/.build/pipeline.mjs` — bundle généré (gitignored)
- `test-profile-fixture.json` — fixture 10K Confirmé H35
- `test-profile-fixture-marathon.json` — fixture Marathon Finisher F55
- `SETUP-REGEN-PROD-PIPELINE.md` — ce fichier

## Vérification que ça marche

Sur fixture 1 (10K Confirmé) puis fixture 2 (Marathon Finisher F55, avec PB) :
```bash
REGEN_MODEL_OVERRIDE=gemini-2.5-flash node regen-plan-from-snapshot.mjs --input test-profile-fixture.json --output /tmp/p1.json --rebuild
REGEN_MODEL_OVERRIDE=gemini-2.5-flash node regen-plan-from-snapshot.mjs --input test-profile-fixture-marathon.json --output /tmp/p2.json
```
Attendu : exit 0, fichier JSON parsable contenant `feasibility`, `weeks`, `paces`, `welcomeMessage`. Temps ~20-25s par profil.

## Batch de N profils (template)

```bash
for f in profiles/*.json; do
  out="results/$(basename $f .json)-plan.json"
  node regen-plan-from-snapshot.mjs --input "$f" --output "$out"
done
```
À ~25s/profil et avec rate-limit Gemini : prévoir `sleep 2` entre appels pour 30+ profils.
