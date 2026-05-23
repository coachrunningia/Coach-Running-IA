# Audit dev senior 20 ans — Sprint A + B + Validation 10 profils
Date : 2026-05-22
Auditeur : dev senior 20 ans (TS/Next/Firebase, SaaS critique).
Sources auditées : commits `d4fa6360` (A) + `481bd26f` (B), code en place, 3 fichiers de tests, recaps + verdict expert.

## Verdict global
**GO PROD avec correctifs mineurs P1 sous 48 h.** Les 6 fixes sont solides au cœur, mais 3 angles morts dégradent la confiance "globale" et exigent un Sprint C correctif léger (≤ 2 h). Pas de rollback nécessaire.

## Score qualité par dimension (1-10)

| Dimension | Score | Critique principale |
|---|---|---|
| Architecture / SOLID | 6/10 | Constantes magiques inlinées (1.3, 60/70/75, 4/8/15, 1.15/1.30/1.50). Cap empilé `Math.min(...)` non factorisé. Pas de dépendance circulaire mais couplage `geminiService → feasibilityService` accru par `s1ActualVolume`. |
| Robustesse cas limites | 5/10 | Fuites identifiées (Finisher senior, cv≈1-2 km, vmaFromTarget, Trail #2c). `params.age ?? 0` masque un comportement. Bug #5 wording brutal sur 3 km absolus. |
| Tests | 5/10 | **Faux ami critique** : Bug #5 testé via une RÉPLIQUE inline (`buildTransparencyBlock` local), pas la vraie fonction prod. 19/19 verts mais 0 % de couverture sur le vrai bloc injecté dans le prompt. 14 + 19 = 33 tests Sprint A/B, mais peu de tests croisent feasibility ↔ periodization end-to-end. |
| Doctrines respectées | 9/10 | Excellente discipline (allure cible jamais touchée, poids jamais mentionné, input client respecté, chaque ligne commentée). Une seule légère entorse : le wording prudent palier 1.15-1.30 (vert/jaune) est un ajout maison non strictement adossé à Pfitzinger. |
| Effets de bord | 6/10 | Profils 7-10 OK selon QA, mais 3 zones non testées : Finisher (Trail/Marathon sans target), Hyrox preview, plans Perte de poids cv=0 BMI haut. Le `transparencyBlock` change le prompt LLM → comportement Gemini non testé (le test valide le code TS, pas l'output LLM). |
| Maintenabilité | 7/10 | Commentaires inline excellents (références VERDICT-EXPERT, doctrines, justifications coach). Mais 200+ lignes ajoutées dans deux fonctions déjà géantes (`calculateFeasibility` 500 lignes, `calculatePeriodizationPlan` 400 lignes). Aucune extraction. |
| Production readiness | 8/10 | Build OK 39/39, deploy Firebase confirmé Sprint B (recap), 500/500 tests verts. Plans live épargnés (doctrine `feedback_patch_live_plans_jour_seulement` respectée). Risque utilisateur en cours de génération : nul (S0 only). |

**Score moyen : 6.6 / 10**

## Constats positifs

1. **Bug #2a** est le fix le plus élégant du lot : 5 lignes par site, débloque mécaniquement une règle morte (R2 règle 4) sans en créer de nouvelle. Pattern propre (param optionnel + fallback rétro-compatible).
2. **Doctrine `feedback_chaque_ligne_justifiee` réellement appliquée** : chaque bloc a un commentaire référencé VERDICT-EXPERT + source coach (Pfitzinger Masters, Hammond, Gabbett, Daniels, Riegel) + doctrine impactée.
3. **Bug #4 garde-fou** : la double branche (routing forcé OU phrase nettoyée) est défensible — on évite à la fois le label aberrant ET l'incohérence type/mainSet.
4. **Bug #3 cap ACWR avec skip `isAbsoluteBeginner`** : la condition `currentVolume > 0 && !isAbsoluteBeginner` est correcte. Le mode débutant absolu reste opérant.
5. **Tests anti-régression Sprint A** (`sprint-a-p0-fixes.test.ts:80-95`) : le cas "sans s1ActualVolume" valide explicitement la rétrocompatibilité — geste pro rare.
6. **Le clamp final (`clamp(score, 10, 100)`) limite le risque** que les caps empilés produisent un score négatif.
7. **`s1ActualVolume` passé en option** — pas de cassure du contrat API existant ; les anciens call-sites continuent de fonctionner.
8. **Sprint B Bug #2c Riegel fallback** : la matrice des conversions (semi×2.1, 10K×4.6, etc.) est cohérente avec la formule standard et permet de couvrir le cas Guliver sans PB marathon. Bon raisonnement.

## Risques identifiés (par priorité)

### P0 — bloquant
**Aucun.** Les fixes ne cassent rien selon QA, les tests passent, le deploy est confirmé. Les angles morts ci-dessous n'invalident pas la prod.

### P1 — important (Sprint C correctif sous 48 h)

1. **[Tests] Bug #5 testé en réplique inline (faux ami)** — `sprint-b-p1-fixes.test.ts:253` et `validation-sprint-ab-10-profils.test.ts:40` redéfinissent localement `buildTransparencyBlock`. Le vrai code de production (`geminiService.ts:4137-4163`) n'est jamais exécuté par un test. Si demain quelqu'un change le bloc dans `geminiService` sans toucher le test, **le test reste vert et la régression passe en prod**. Coût correctif : extraire le bloc en fonction exportée + importer dans le test (15 min).

2. **[Robustesse] Finisher senior ignore Bug #2b + #2c** — `buildFinisherFeasibility` (ligne 1113) n'inclut PAS le cap senior 60/70/75 ni le cross-check PB. Un Guliver-like qui choisit "Finisher" sur Marathon retombe à score 80+ sans cap. C'est exactement le scénario que Bug #2b veut prévenir (Hammond : VO2max -10%/décennie). Coût correctif : dupliquer les deux blocs (20-30 lignes) ou extraire en fonction partagée (30 min). Justification verdict expert n'a pas tranché ce path explicitement.

3. **[Robustesse] Bug #5 faux positif sur très petits volumes** — cv=2 S1=5 → ratio 2.5 → palier BRUTAL "+150%, Gabbett 2.5, risque de blessure". Le delta absolu (3 km) est négligeable mais le wording est alarmiste. Doctrine `feedback_securite_avant_conversion` dit de ne pas embellir, mais ici on fait l'inverse : on dramatise. Ajouter un seuil minimum absolu (`s1DeltaKm < 5 → bloc vide` ou wording prudent). Coût : 5 min.

4. **[Tests] Validation 10 profils P4 cap ACWR non observé** — le testeur QA note honnêtement que sur P4 (plan 16 sem) le cap ACWR ne mord pas car `maxVolume*0.65` ou `volumeCap=1.6×cv` cap avant. Ce n'est pas un bug du fix, mais ça veut dire que **le cap 1.3 ACWR est mort sur la majorité des profils** (il ne mord que sur plans courts 10-12 sem avec rampe agressive). À documenter dans le code : `currentVolume * 1.3` vient APRÈS `volumeCap = currentVolume * 1.6` ligne 3056 — incohérence implicite (1.3 < 1.6, donc 1.3 prime, le 1.6 devient mort). Coût : commentaire de clarification (10 min) ou refacto en cap unifié (1 h).

5. **[Architecture] Constantes magiques** — `1.3` (cap ACWR), `60/70/75/90` (caps âge), `4/8/15` (paliers gain PB), `1.15/1.30/1.50` (paliers Gabbett wording), `2.1/4.6/9.8/2.2/4.667` (ratios Riegel) — toutes inlinées. Aucun fichier `feasibilityConstants.ts`. Conséquence : si Romane veut tester un 1.2 ou 1.4 demain, il faut grep dans 2 fichiers. Coût refacto : 30 min (extraire en `const SENIOR_AGE_CAPS = {60: 90, 70: 75, 75: 70} as const` etc.).

### P2 — amélioration (Sprint D+ non urgent)

6. **[Maintenabilité] `calculateFeasibility` dépasse 500 lignes** — Bug #2b + #2c ajoutent 100 lignes dans une fonction déjà bondée. Extraction recommandée : `applySeniorCap()`, `applyPbCrossCheck()`, `applyVolumePeakRatioCap()`. Effort 1 h.

7. **[Tests] Faiblesse de couverture cross-pipeline** — les 3 fichiers de tests (Sprint A, Sprint B, validation 10 profils) testent chaque fonction isolée. Pas un seul test ne fait `calculatePeriodizationPlan(...) → s1 = result.weeklyVolumes[0] → calculateFeasibility({s1ActualVolume: s1, ...})` en bout-à-bout. Le test Profil 1 du fichier validation S'EN APPROCHE mais sépare encore les deux appels. Conséquence : si demain la sortie de `calculatePeriodizationPlan` change de format, `calculateFeasibility` reçoit n'importe quoi sans qu'aucun test ne tombe.

8. **[Robustesse] `vmaFromTarget = true`** — Si VMA estimée depuis le targetTime, on a un effet circulaire : on évalue la faisabilité de la cible avec une VMA qui vient de la cible. Le code a un message à part (ligne 933-935) mais les caps Bug #2b/#2c sont quand même appliqués sur ce score circulaire. Pas catastrophique mais ajoute du bruit dans le score.

9. **[Doctrine] Regex P5 trop étroite** — `applyMarcheCourseRouting` regex `alternance[\s\S]{0,20}?(?:course[...]marche|marche[...]course)` ne matche pas "alternance trot/marche". Pas bloquant (type préservé), mais wording incohérent visuel. QA l'a noté. Élargir avec `(?:course|trot)` et `(?:marche|trot)` (10 min).

10. **[Sécurité] `console.debug` Bug #2c en prod** — `feasibilityService.ts:910` log un PB de coureur en clair en prod via `console.debug`. Si la console est exposée (dashboard admin, Sentry, etc.), c'est de la donnée fitness personnelle. Vérifier la stratégie de log.

## Recommandations actionables

### 1. Sprint C correctif urgent (≤ 2 h, sous 48 h)

| # | Quoi | Où | Effort |
|---|---|---|---|
| 1 | Extraire `buildTransparencyBlock` de `geminiService.ts:4133-4163` en fonction exportée, importer dans les 2 fichiers de tests Sprint B et validation 10 profils. Supprimer la réplique inline. | `geminiService.ts` + `sprint-b-p1-fixes.test.ts` + `validation-sprint-ab-10-profils.test.ts` | 15 min |
| 2 | Dupliquer (ou extraire en helper partagé) les blocs Bug #2b et #2c dans `buildFinisherFeasibility`. Cap senior 60/70/75 doit s'appliquer même en Finisher (cohérent Hammond). Bug #2c PB cross-check : décider si on l'applique en Finisher (verdict : oui pour Marathon/Semi déclaré Finisher, sinon le PB n'a pas de cible à comparer). | `feasibilityService.ts:1113+` | 30 min |
| 3 | Ajouter un floor absolu dans Bug #5 : si `s1DeltaKm < 5`, ne pas escalader au palier BRUTAL même si ratio > 1.5. Wording PRUDENT au minimum. | `geminiService.ts:4137` | 5 min |
| 4 | Tests pour les 3 fixes ci-dessus. Au minimum : (a) Finisher 72 ans Marathon → cap appliqué (b) Bug #5 cv=2 S1=5 → bloc PRUDENT (pas BRUTAL). | nouveaux tests | 30 min |

Total Sprint C : **~1 h 20 min**.

### 2. Refactos suggérés (non urgent)

- Extraire `const FEASIBILITY_CAPS` (objet centralisé) dans `feasibilityConstants.ts`. Effort 30 min.
- Découper `calculateFeasibility` en 5 helpers (`applySeniorCap`, `applyPbCheck`, `applyR2`, `applyVolumeCaps`, `buildMessage`). Effort 2 h.
- Unifier la doctrine "cap S1 max" : aujourd'hui on a `volumeCap = currentVolume * 1.6` (ligne 3056) ET `acwrCap = currentVolume * 1.3` (ligne 3095). Le second prime mais le premier est mort code. Décider : on garde 1.3 strict (ACWR) et on supprime 1.6, ou on documente que 1.6 est un cap supérieur "raisonnable" et 1.3 le cap "sain". Effort discussion + code 15 min.

### 3. Tests à ajouter

- 1 test end-to-end : `calculatePeriodizationPlan → calculateFeasibility` chaîné (cas Clémentine, cas Guliver, cas sain). 30 min.
- 1 test Finisher senior Marathon (anti-régression P1 #2). 10 min.
- 1 test Bug #5 cv petit (cv=2, cv=3, cv=5) — anti-faux-positif. 10 min.
- 1 test Bug #5 cv intermédiaire (cv=30, S1=33 ratio 1.10) → bloc vide. Déjà couvert par le test inline mais à porter sur la vraie fonction. 5 min.

### 4. Documentation à mettre à jour

- `VERDICT-EXPERT-5-BUGS.md` n'a pas tranché Finisher → ajouter une note explicite. 5 min.
- `SPRINT-B-P1-RECAP.md` mentionne "19 tests verts" — ajouter "dont X testés sur le vrai code de production et Y via réplique inline". 5 min. Cette transparence est cohérente avec doctrine `feedback_securite_avant_conversion`.

## Décision finale

**Le code est safe en prod aujourd'hui.** Les fixes #2a/#3/#4/#2b/#2c font ce qu'ils annoncent sur les cas testés. Aucun risque utilisateur en cours. Plans existants intacts (doctrine respectée).

**MAIS** : la confiance "qualité globale" demandée par Romane n'est pas à 9/10. Les 3 angles morts (Finisher senior, test Bug #5 en réplique, faux positif Bug #5 petits volumes) sont des fuites latentes : un nouveau profil utilisateur peut les déclencher demain et personne ne s'en rendra compte avant le prochain audit terrain.

**Recommandation finale : ne pas rollback, mais lancer un Sprint C correctif de 1 h 20 min sous 48 h** pour :
1. Vérifier que le bloc Bug #5 est testé sur le vrai code (et non sur une réplique).
2. Étendre Bug #2b/#2c au path Finisher.
3. Garder un cran de prudence sur les très petits volumes (anti-faux-positif wording).

Sans ce Sprint C, on accepte consciemment que le prochain Guliver-Finisher passe à 99 % et qu'un user reprise post-blessure cv=2 reçoive un wording "risque de blessure significatif" pour +3 km. C'est défendable mais c'est ce que la doctrine `feedback_securite_avant_conversion` cherche justement à éviter — dans les deux sens (ni embellir, ni dramatiser).
