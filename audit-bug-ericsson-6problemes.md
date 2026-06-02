# AUDIT 6 problèmes — Plan 1779998376847 ericsson (28/05/2026)

## Profil
Marathon 3h20 / VMA 15.7 / 50 ans / cv=60 / freq=6 / 24 sem / startDate 2026-06-21 / no injury / BMI 21.8.
Référence comparable : `thibaud.mathys` plan `1779900993196-before.json` (Marathon Expert, freq=6, cv=60, age 41) → mêmes `weeklyVolumes` SAUF S1=60 (ericsson S1=15).

## Cause racine commune
**Gemini Flash 3 (preview) a généré 1 seule séance pour S1 au lieu de 6.**
→ `enforceWeekConstraints` (L2433-2448) resync `weeklyVolumes[0]` 60→15 (sum de la séance unique 14.6km).
→ Toutes les anomalies S1 + S1→S2 cascadent depuis ce point.

## Tableau diagnostic

| # | Diagnostic | Cause racine (fichier:ligne, commit) | Fix proposé |
|---|------------|---------------------------------------|-------------|
| **1 — Pic 90 km > MAX 85** | **Vrai bug léger (cosmétique projection)** : la projection `weeklyVolumes` dans `periodizationPlan` dépasse `MAX_WEEKLY_VOLUME.Marathon.expert=85`. Mais les sessions générées sont cappées à 85 par `enforceWeekConstraints` L2101-2122. Le `90` visible UI = projection seule (S2-S24 sans sessions). | `geminiService.ts:2942` — sessionFactor 1.20 sur 6 sess multiplie maxVolume 85→102. Aucun cap absolu sur `maxVolume` après. Présent depuis Sprint Marathon mai (avant F-18). | Ajouter après L2945 : `maxVolume = Math.min(maxVolume, MAX_WEEKLY_VOLUME[objectiveKey]?.expert || maxVolume * 1.2)` pour aligner projection sur enforce. Impact : pic projeté 90→85 (cohérent avec sessions). |
| **2 — Saut S1→S2 = +340%** | **Faux positif (cascade Problème 4)** : S2=66 est la projection théorique. S1=15 vient du resync post-LLM (1 séance générée). Si Gemini avait sorti 6 séances S1, weeklyVolumes[0] resterait à 60 → saut S1→S2 = 60→66 = +10% conforme doctrine. Le lissage L3577-3600 fonctionne sur la projection AVANT resync (passé sur [60→66] OK). `enforceFullPlanConstraints` (L2511-2546) ne peut pas re-smoother car la preview n'a qu'une seule semaine de sessions (L2462 `weeks.length < 2` early return). | `geminiService.ts:5201-5205` post-LLM tronque si LLM sort >freq mais NE COMPLÈTE PAS si <freq. + Schema preview L4262-4291 sans `minItems`. | Fix Problème 4 résout celui-ci automatiquement. |
| **3 — EF 5:42 anormal** | **Faux positif** : doctrine `efPace = 67% VMA` (L243, comment L228 "65-70% VMA"). Calc : 15.7×0.67=10.52 km/h → 60/10.52=5:42 ✓. Romane a utilisé 75% (mauvaise formule). | N/A | Aucun. Doctrine respectée. |
| **4 — S1 = 1 séance (au lieu de 6)** | **VRAI BUG ROOT-CAUSE (déjà identifié dans audit-bug-s1-1seance-28mai.md)** : Gemini Flash 3 preview truncate. Schema `PREVIEW_RESPONSE_SCHEMA` L4262-4291 sans `minItems` sur sessions[]. Post-process L5201-5205 tronque si > freq mais ne complète JAMAIS si < freq. Validator L408 `severity:'warning'` filtré par `severity==='error'` L1170. Probable cause : prompt preview ~5000 tokens + `maxOutputTokens:8192` L5083 + injectRaceSession + welcome IRRÉALISTE F-18 → JSON truncation silencieuse. | `geminiService.ts:5201-5205` (commit unchanged depuis Sprint Marathon). Aggravé par F-18 ec4f44e qui rallonge prompt CTA regen + welcomeMessage IRRÉALISTE template. | **Patch L5205** : ajouter symétrie : `if (plan.weeks[0].sessions.length < data.frequency) { throw new Error('PREVIEW_S1_INCOMPLETE') }` → trigger retry pipeline OU fallback déterministe template S1 (footing EF × N + 1 SL + 1 renfo). Compromis : retry 1 fois avec `maxOutputTokens: 16384`. Impact : 0 S1 incomplète. |
| **5 — Incohérence dates** | **Faux positif** : startDate 2026-06-21 = dimanche, raceDate 2026-12-06 = dimanche, exactement 24×7=168j d'écart. "Sem.1 21-27 juin + séance Lundi 22 juin" = cohérent (S1 = dim→sam, premier jour utile = lundi 22). | N/A | Aucun. À reconfirmer avec Romane : qu'a-t-elle vu de problématique ? |
| **6 — Affûtage incohérent** | **Faux positif** : doctrine affûtage = `1 - (0.25 + progress×0.25)` (L3510-3511). S22 progress=0.33 → ×0.67 → 90×0.67=60 ✓. S23 progress=0.67 → ×0.583 → 90×0.583=52.5 ≈ 53 ✓. S24 progress=1.0 → ×0.5 → 90×0.5=45 ✓. Phases L443-450 du JSON : S22/23/24 tous = "affutage" ✓. | N/A | Aucun. Math affûtage conforme. |

## Synthèse
**1 vrai bug critique = Problème 4 (S1 = 1 séance, Gemini truncate)**.
Problèmes 2 et 1 = cascades / cosmétiques (downstream du #4 et du sessionFactor).
Problèmes 3, 5, 6 = **faux positifs** (math doctrine conforme).

## Action immédiate
1. **Hotfix L5201-5205** symétrie sessions length (retry ou fallback déterministe). Voir audit-bug-s1-1seance-28mai.md pour patch déjà rédigé.
2. **Optionnel L2945** : capper `maxVolume` par `MAX_WEEKLY_VOLUME[obj].expert` (cosmétique projection).
3. **Plan ericsson est déjà pausé** (`patch-ericsson-pause-safety-28mai.mjs` exécuté). Pas de risque utilisateur immédiat.
4. **Communication Romane** : Problèmes 3, 5, 6 sont des perceptions, pas des bugs. Ne pas patcher.

## Fichiers clés
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts:5201-5205` — patch principal
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts:4262-4291` — schema preview (ajouter minItems possible)
- `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts:2433-2448` — resync weeklyVolumes (à laisser, c'est correct sauf si S1 a moins que freq sessions)
- `/Users/romanemarino/Coach-Running-IA/audit-bug-s1-1seance-28mai-backups-1779998999785/1779998376847.json` — plan ericsson capturé
- `/Users/romanemarino/Coach-Running-IA/audit-2plans-28mai/backups-1779977778104/1779900993196-before.json` — plan référence Marathon Expert OK (thibaud)
- `/Users/romanemarino/Coach-Running-IA/audit-bug-s1-1seance-28mai.md` — investigation antérieure même bug (hypothèse H1 confirmée ici par comparaison thibaud)
