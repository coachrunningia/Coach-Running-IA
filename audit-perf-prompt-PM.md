# Audit Perf Prompt Preview — Cible 30s → ≤15s (29/05 PM)

Profil worst case retenu : **Marathon Expert freq=6 cv=60 IMC>25 + PB + blessure mineure + Trail D+/km>50** (cumul de tous les gates).
Estimations en tokens (Gemini ≈ 4 chars/token français-français + JSON).

## 1. Audit taille prompt actuel (preview)

| # | Bloc (L code) | Tokens worst | Notes |
|---|---|---|---|
| A | Profil + paces + périodisation (L4700-4735) | ~450 | incompressible (data) |
| B | Règles absolues + types phases (L4738-4772) | ~600 | dont **soft quality 250 tk** (L4754-4761) |
| C | RACE_DAY_INSTRUCTION (L4180) | ~110 | |
| D | MAINSET_COHERENCE_RULES (L4160) | ~190 | |
| E | buildDisciplineBlock (par subGoal) | ~250-400 | varie |
| F | **Bloc Perte de poids** (L4780-4855) | ~1100 | exclu si goal ≠ perte |
| G | **Bloc Hyrox** (L4858-4982) | ~1500 | exclu si goal ≠ hyrox |
| H | Finisher block (L4984-4991) | ~120 | optionnel |
| I | Instructions + format JSON (L4993-5040) | ~450 | |
| J | trailSectionPreview + feasibility + welcomeTone (L5017-5020) | ~300-600 | varie statut |
| K | **buildSafetyInstructions** (L3791-4113) — empilage IMC + senior + restart + diversity + débutant + plan long + PB + blessure + Marathon tendu + no-weight + no-cross | ~1400-2200 | **plus gros consommateur conditionnel** |
| L | buildLocationPromptBlock (L1363) | ~150 | |

**Total worst case Marathon Expert riche (sans Perte/Hyrox)** : ≈ **4 500 – 5 200 tokens input**.
**Total output attendu (6 séances + welcomeMessage 800c + safetyWarning + advice riches + suggestedLocations)** : **6 800 – 8 500 tokens** → **sature 8192**.

Section qui pèse le plus dynamiquement : **K (safetyInstructions cumulé)**, suivi de **B (soft quality + types phases)**.

## 2. Top 5 optimisations (gain × risque)

| # | Action | Gain tokens | Risque | Effort |
|---|---|---|---|---|
| **O1** | **Compresser bloc soft quality** L4754-4761 (cf §4) — 1× au lieu de répété dans remaining (L5697+) | **-300 in / -0 out** | Faible si wording garde mots-clés "strides/fartlek souple/progression douce" | 15 min |
| **O2** | **Externaliser FORMAT JSON L5024-5040** (déjà via responseSchema) — supprimer rappel texte "sessions[].type ∈ {…}" et "suggestedLocations[].type ∈ {…}" (le schema le valide déjà) | **-180 in** | Très faible (schema enforce) | 10 min |
| **O3** | **Factoriser safetyInstructions multi-blocs** : NO_WEIGHT + NO_CROSS + DIVERSITY OBLIGATOIRE répétés et verbosité IMC. Compresser les 3 paliers IMC en 1 bloc paramétré (1 ligne par règle au lieu de 8) | **-400 to -700 in** | Moyen — re-test 10 profils IMC obligatoire | 1h |
| **O4** | **Couper exemples advice Hyrox L4964-4972** (5 exemples → 1) + couper "ADVICE PAR SÉANCE INTERDICTION COPY-PASTE" déjà couvert ailleurs | **-200 in (Hyrox uniquement)** | Faible | 10 min |
| **O5** | **Raccourcir MAINSET_COHERENCE_RULES + RACE_DAY_INSTRUCTION** : 2 exemples → 1, supprimer redondance L4167-4173 (allure cohérence déjà en règles absolues L4744) | **-150 in** | Faible | 10 min |

**Gain cumulé prompt input : -1 050 à -1 400 tokens (-25 à -30 %)**. Allège la "cognitive load" du LLM, réduit latency 15-25 %.

> Note clé : la latence Gemini Flash est dominée par l'**output** (~50-80 tok/s) >> input parsing. Cf. §3.

## 3. Verdict bump maxOutputTokens 8192 → 16384

| Aspect | Verdict |
|---|---|
| Impact temps génération | **NEUTRE à POSITIF**. Le modèle ne génère pas plus de tokens parce qu'on lève le cap : il s'arrête au "STOP" naturel. AUJOURD'HUI il atteint le cap (truncation silencieuse — cf audit-bug-ericsson §6). Lever le cap = il termine au lieu de réfléchir-pour-rentrer = **gain 2-5s en réduisant retries/truncation**. |
| Coût Gemini | x2 max théorique sur output (en pratique +20-30 % réel). Non critique (Flash très cheap). |
| Cohérence remaining 65536 | Asymétrie x8 documentée (audit-bug-ericsson §1 cause 4). Bump 16384 réduit asymétrie x4. Acceptable. |

**Verdict : GO 16384 immédiat**. C'est le quick-win le plus fort. À coupler avec **check `finishReason === 'MAX_TOKENS'`** (déjà P0 audit Ericsson).

## 4. Wording compressé soft quality (final)

Proposition Romane validée + ajustements coach-friendly :

```
⚠️ NIVEAU INTER+ / cv ≥ 25 km/sem — DÈS S1, 1 séance/sem PEUT être qualité DOUCE (sensation, pas chrono) :
  • Strides : footing EF + 6-8 lignes droites 80-100m allure ~3km, récup marche (S1+). Type "Jogging".
  • Fartlek souple : footing EF + 5-6 accél 30-45s allure 10K, récup trot 1'30 (S2+). Type "Fractionné" Modéré.
  • Progression douce SL : 10km EF + 2km allure Marathon facile (S2+, jamais S1). Type "Sortie Longue".
${marathonCvSub35 ? `EXCEPTION Marathon cv<35 : STRIDES UNIQUEMENT.` : ''}
JAMAIS de seuil/tempo/VMA 200-400/fractionné long en S1-S2. 1 seule séance qualité/sem.
```

- **Tokens : ~120** (vs ~250 actuel par injection × 2 injections = -260 total).
- **Info perdue** : justification physiologique (Pfitzinger 18/55 plancher base), wording long "JAMAIS sprint" sur strides, mention "si fatigue remplacer par EF" (déjà dans doctrine globale "écoute du corps"). **Tout récupérable via le safety net post-LLM (déjà en place).**
- **Suffisant pour Gemini** : OUI — les 3 patterns nommés ("Strides", "Fartlek souple", "Progression douce") sont les déclencheurs whitelist regex côté code, c'est ce qui compte. Le LLM ne "raisonne" pas la physiologie, il copie le label.

## 5. Process anti-régression tokens prompt

| # | Action | Effort | Priorité |
|---|---|---|---|
| P1 | **Logger systématique** `response.usageMetadata.{promptTokenCount, candidatesTokenCount, totalTokenCount}` à CHAQUE appel Gemini (preview + remaining). Console + Sentry/Datadog tag. | 30 min | **P0** |
| P2 | **Alert** si `candidatesTokenCount > 0.85 × maxOutputTokens` (proche saturation) OU `promptTokenCount > 5 000` | 30 min | **P0** |
| P3 | **Snapshot prompt test** : 10 profils fixtures (Marathon Expert, Semi Inter, Trail Ultra, 5K Déb, Hyrox, Perte Poids surpoids, Finisher+PB, Blessure tendineuse, Senior+IMC, Reprise). Asserter `promptTokenCount < BUDGET` par profil. Fail CI si dépassement | 4h | **P1** |
| P4 | **Bloquer merge** si delta `promptTokenCount` moyen > **+10 %** sur la batterie 10 profils vs baseline `main` | 1h CI | **P1** |
| P5 | **Audit token obligatoire** dans toute PR qui touche `geminiService.ts` zone L3700-5800 — checklist PR template avec ligne "delta tokens estimé : ±X" | 15 min doc | P1 |
| P6 | Dashboard rolling 7j tokens prompt/output + p95 latency Gemini | 1j | P2 |

## Roadmap exécution (proposée, 1 sprint)

1. **Aujourd'hui 30 min** : bump 16384 preview (L5053, L5061) + finishReason check + logger usageMetadata (P1).
2. **Demain 2h** : O1 (compress soft quality 2 injections) + O2 (drop FORMAT JSON texte) + O5 (mainset/raceday). Re-run batterie 10 profils.
3. **Mardi 4h** : O3 safetyInstructions consolidation (re-test 10 profils ciblés IMC/senior/blessure obligatoire — doctrine `validation_n_profils_avant_sprint`).
4. **Mercredi** : P3 snapshot CI + P4 budget guard merge.
5. **Cible mesurée** : preview Marathon Expert riche **30s → 12-14s** réaliste (bump + compressions). Si pas atteint, investigation modèle (Flash → Flash-Lite ?).

## Angles morts à surveiller

- Le vrai bottleneck pourrait être **l'output** (séances 6×{warmup+mainSet+cooldown+advice riche} + welcomeMessage 800c). Bump 16384 + check finishReason le rendra visible via logs.
- **F-18 a allongé l'OUTPUT** (safetyWarning + welcomeMessage transparent) plus que l'input. Mesurer `candidatesTokenCount` AVANT de re-toucher au prompt input.
- Compresser TROP le prompt peut dégrader la qualité (Gemini Flash sensible à la verbosité des consignes critiques). Toujours valider 10 profils E2E.
