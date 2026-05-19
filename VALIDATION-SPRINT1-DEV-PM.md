# Validation Sprint 1 — Commit `0435796` (avant deploy hosting)

Commit : `Sprint 1 — 4 fixes Trail Ultra + Senior (#1+#2+#4+#5a+#6)`
Auteur : Romane Marino — 2026-05-19
Scope : `planUtils.ts` (Fix #1+#2), `geminiService.ts` (Fix #4+#5a+#6), 3 fichiers tests (+22 tests).
Périmètre revue : lecture seule, vérification contre code RÉEL, 2 rôles (Dev senior + PM senior).

---

## Rôle 1 — Dev expert senior

### Fix #1 — Caps D+ Master/Expert (`planUtils.ts:126-130`) — ✅ GO

- **Syntaxe** : OK. Triple ternaire propre, types implicites `number` cohérents.
- **Diff réel** : `isConf` cap passe 2500 → 4500 ; `else` (expert) cap 3500 → 6500. `raceElevation` reste un `Math.min` → race ≤ cap prime toujours. Aucun cap n'a été supprimé.
- **Edge cases couverts** : Expert race < 6500 (race prime), Confirmé UTMB CCC 6000 → 4500 (testé), trail court Expert 300m (race prime testé), Débutant inchangé (800).
- **Edge cases NON couverts** : Master (cap reste implicite via Expert) ; aucun test où `level` est `undefined` ou string vide (tomberait sur `else` = 6500, un débutant masqué obtiendrait alors un plan ultra alpin — risque très faible vu validation amont mais pas testé).
- **Risque casse code adjacent** : 0. Aucun appel externe ne dépend des valeurs littérales (3500/2500).
- **Tests adéquats** : OK pour les cas usuels (5 tests). Manque : niveau intermédiaire entre cap et race (déjà testé indirectement), volume cap = 6500 strict si race = 6500.
- **Verdict** : ✅ GO.

### Fix #2 — Floor 100 % `currentWeeklyElevation` (`planUtils.ts:138-155`) — ⚠️ GO avec note

- **Syntaxe** : OK. `idealStart` est un `number`, ternaire propre, `Math.max(idealStart, Math.min(minStartElevation, maxStart))` correct.
- **Diff réel** : maxStart plafond 1500 → 3500. `rawStart` (clamp par maxStart) supprimé au profit de `idealStart` non clampé. Le `Math.max` ne descend JAMAIS sous `currentWeeklyElevation` — conforme doctrine `feedback_input_client_obligatoire`.
- **Edge cases couverts** : Rich current=3000 ≥ 3000 préservé (testé S1), Inter current=600 préservé, no-current → defaultStart, phase récup *0.55 (testé).
- **Edge cases NON couverts (à risque)** :
  - **`currentWeeklyElevation > maxWeeklyElevation` (cap niveau)** : ex. Confirmé déclare 5000/sem (> cap 4500). `startElevation = 5000`, `maxWeeklyElevation = 4500`. Alors `target(S1) = 5000 > target(Sfinal) = 4500` → progression INVERSÉE (plan qui décroît). Non testé, non garde-fou. Probabilité faible mais cas Expert > 6500 envisageable.
  - **`currentWeeklyElevation` rentré en `string` vs `number`** : pas de coercion. Mais c'est typé `number` upstream donc OK.
- **Risque casse code adjacent** : faible. La phase récup/affûtage est appliquée APRÈS, donc une `startElevation` enflée subit ensuite *0.55 → reste cohérent en valeur de récup.
- **Tests adéquats** : 5 tests valides. Manque test : `currentWeeklyElevation > maxWeeklyElevation` → progression inversée à documenter ou clamper.
- **Verdict** : ⚠️ GO avec note (ajouter en patch futur : `idealStart = Math.min(currentDeclared, maxWeeklyElevation)` OU laisser tel quel + warning console si current > max — décision PM/Romane).

### Fix #4 — BTB ≥ 80 km + `ULTRA_NIGHT_RUN_BULLETS` (`geminiService.ts:3212-3221`, L3488-3503, L4368-4380) — ✅ GO

- **Syntaxe** : OK. Constante template literal, injections via `${}` propres. Le ternaire `data.trailDetails.distance >= 80 ? ULTRA_NIGHT_RUN_BULLETS + '\n' : ''` est correct (concaténation `\n` avant `- SL pic…`).
- **Diff réel** :
  - 100km+ (preview L3488 + remaining L4368) : ligne inline BACK-TO-BACK SUPPRIMÉE, remplacée par `${ULTRA70_BACK_TO_BACK_BULLETS}` + `${ULTRA_NIGHT_RUN_BULLETS}` (toujours, car 100 ≥ 80).
  - 70-99 km (preview L3502 + remaining L4374) : `ULTRA70_BACK_TO_BACK_BULLETS` déjà présent (non modifié) ; ajout conditionnel `${data.trailDetails.distance >= 80 ? ULTRA_NIGHT_RUN_BULLETS + '\n' : ''}`.
- **Edge cases couverts** : `>= 80` couvre 80, 81…99. < 80 (70-79) reçoit BTB sans nuit (cohérent : 70km en journée).
- **Edge cases NON couverts** : trail raide >= 80 km mais < 70 km en distance (impossible vu la classification trail/ultra). Aucun test unitaire prompt (mais difficile à tester sans framework de snapshot).
- **Risque casse code adjacent** : 0. Le `'- SL pic doit atteindre…'` reste accroché sans saut de ligne quand night OFF (cohérent avec rendu Markdown du prompt).
- **Tests adéquats** : aucun test sur Fix #4. Manque test : génération d'un plan ultra 80km et vérification présence du bloc `SORTIE NUIT obligatoire` dans le prompt envoyé à Gemini (test d'intégration léger). Acceptable car prompt-only.
- **Verdict** : ✅ GO.

### Fix #5a — Senior ≥ 55 préserve déclaré (`geminiService.ts:1186-1196`) — ⚠️ GO avec note

- **Syntaxe** : OK. Early return propre, `const age = data.age || 0` safe (gère `undefined`/`null`).
- **Diff réel** : early return AVANT le chrono override ET avant la VMA override. Condition `age >= 55 && declared && declared !== 'deb'`. Si user a coché Intermédiaire / Confirmé / Expert ET âge ≥ 55 → retour direct du déclaratif.
- **Edge cases couverts** : 57 Expert 10K 1h00 (georgeslor1), 55 Expert (limite basse), 60 Confirmé, 65 Inter femme, 60 Débutant inchangé (5 tests). Non-régression : 30/45/54 ans non senior, `age=0` non-déclenché (4 tests).
- **Edge cases NON couverts (à risque modéré)** :
  - **`data.level` undefined ET senior** : `labelToLevelKey('')` retourne `'inter'` par défaut (default branch L923). Donc un senior 60 ans sans déclaration de niveau verrait son plan figé en `inter` quel que soit son chrono réel. Probabilité faible (le questionnaire force le niveau), mais non testé.
  - **Senior 56 ans vraiment Débutant qui se sur-déclare Expert** : aucune protection. C'est un trade-off accepté (doctrine "input client obligatoire") mais à confirmer côté PM.
  - **`age` saisi en string** : pas de coercion. Si `data.age = "57"` (string), comparison `>= 55` lexicographique TS — en JS coercion auto avec `>=` → fonctionne MAIS subtile.
- **Risque casse code adjacent** : 0. Early return n'altère pas le reste de la fonction.
- **Tests adéquats** : 9 tests, très bonne couverture. Manque : `level` undefined + senior, `age` string.
- **Verdict** : ⚠️ GO avec note (envisager `Number(data.age) >= 55` pour robustesse).

### Fix #6 — `timeToSeconds` rejette `"km"` (`geminiService.ts:19-26`) — ⚠️ GO avec note

- **Syntaxe** : OK. Regex `/\d+\s*km/i` matche `"50km"`, `"50 km"`, `"10KM"`. `console.warn` non bloquant.
- **Diff réel** : ajout en tête de fonction (juste après `t = time.trim().toLowerCase()`). Retourne 0 immédiat → fallback VMA dans `detectLevelFromData` (déjà géré L1207 `chronoLevels.length > 0`).
- **Edge cases couverts** : "50km (6h50)", "50 km en 6h50", "10KM en 45min", "1h30 sur 21km", parsings valides "1h30", "45min", "3h00" (7 tests).
- **Edge cases NON couverts** :
  - **`"5k"` (sans "m") ou `"5K"`** : non matché. Inputs réels possibles (raccourci). Mineur.
  - **`"km"` dans nom de ville pollué (`"Karkmenistan 1h30"`)** : faux positif possible (mais `\d+\s*km` exige un chiffre devant — donc improbable).
  - **`"km/h"` (allure plutôt que distance)** : matche `\d+\s*km` → rejeté. C'est ok pour ce champ (chrono), pas une allure.
- **Risque casse code adjacent** : 0. Fonction utilisée uniquement pour parsing chronos, fallback déjà prévu.
- **Tests adéquats** : 7 tests OK. ⚠️ ATTENTION : le test ne fait PAS un `import { timeToSeconds }` (fonction non exportée) mais REPRODUIT la logique dans le fichier test (L15-41). Risque de dérive : si quelqu'un modifie la vraie fonction sans toucher le test, le test continue de passer. Pattern explicitement documenté L13-14 ("cohérent avec test formatTime précédent") mais à durcir un jour (exporter `timeToSeconds` pour tests).
- **Verdict** : ⚠️ GO avec note (exporter `timeToSeconds` en futur cleanup pour test direct).

---

## Rôle 2 — PM senior 15 ans

### Fix #1 — Caps D+ ultra Master/Expert — ✅ GO

- **Impact user** : ~2-5 % des plans (Experts/Confirmés trail ultra alpin type UTMB, Diagonale, Hardrock). Sur ce segment : ENORME (passage de 29 % à 54 % du race D+ hebdo = plan crédible).
- **Risque conversion** : élève la crédibilité auprès des coureurs expérimentés (segment premium). Pas de risque sur autres segments (caps inférieurs inchangés).
- **Risque support** : faible. Les Confirmés/Experts qui étaient frustrés (cas Rich) seront satisfaits. Pas de canal d'arrivée massive d'utilisateurs débutants.
- **Cohérence doctrine** : conforme `qualité avant vitesse` (basé Balducci 2024, validé Coach FFA). Plans plus réalistes = sécurité maintenue car niveau Expert assume.
- **Verdict PM** : ✅ GO.

### Fix #2 — Floor 100 % `currentWeeklyElevation` — ✅ GO (avec vigilance)

- **Impact user** : ~5-10 % des plans (utilisateurs ayant déclaré un D+ courant > defaultStart de leur niveau). Sur ces cas : passage d'un plan sous-calibré à un plan respectant le vécu utilisateur.
- **Risque conversion** : positif. Doctrine `feedback_input_client_obligatoire` honorée → utilisateur "ne sent pas écrasé" par la machine.
- **Risque support** : VIGILANCE — cas `current > max niveau` (ex. Confirmé déclare 5000/sem > cap 4500). Le plan démarre à 5000 et FINIT à 4500 = progression décroissante visible par utilisateur. Question support probable : "pourquoi mon plan baisse en D+ semaine après semaine ?". → Recommandation PM : à minima warning message d'accueil "Tu déclares X m D+/sem, on cap à Y m car au-dessus on entre dans la zone à risque blessure pour ton niveau".
- **Cohérence doctrine** : input respecté ✅. Mais doctrine `sécurité avant conversion` mérite arbitrage si user déclare 8000/sem en Confirmé (peu probable mais réel sur quelques cas extrêmes).
- **Verdict PM** : ✅ GO mais ajouter un patch léger (clamp `currentWeeklyElevation` à `maxWeeklyElevation` OU warning message d'accueil pour cas extrême).

### Fix #4 — BTB partout + Sortie nuit ≥ 80 km — ✅ GO

- **Impact user** : ~3-5 % des plans (ultra 80+ km). Sur ce segment : énorme amélioration (sortie nuit = élément manquant critique pour UTMB, TDS, Diagonale, Andorra Ultra).
- **Risque conversion** : très positif. Les coureurs ultra savent qu'une sortie nuit est non-négociable — son absence faisait perdre en crédibilité. Maintenant alignement avec UTMB Academy.
- **Risque support** : faible. Possibles questions sur "comment placer une sortie nuit en pratique" → les bullets répondent déjà (terrain connu, frontale, intégration BTB). Romane n'aura quasi rien à arbitrer.
- **Cohérence doctrine** :
  - ✅ `coach_running_ia_que_course` : sortie nuit reste de la course à pied.
  - ✅ `qualité avant vitesse` : basé UTMB Academy 2024 + Hammond 2018.
  - ✅ `sécurité avant conversion` : bullets incluent "terrain connu" et matériel obligatoire.
- **Verdict PM** : ✅ GO.

### Fix #5a — Senior ≥ 55 préserve niveau déclaré — ✅ GO

- **Impact user** : ~5-8 % des plans (≥ 55 ans, segment Masters croissant). Sur ce segment : LIBÉRATION (cas georgeslor1 passe de "deb" à "expert" → plan réellement adapté).
- **Risque conversion** : très positif. Segment Masters est fidèle, paye, recommande. Un plan rétrogradé à débutant pour un Expert 57 ans = abandon assuré.
- **Risque support** : faible-moyen. Cas où un senior 60 ans qui SE SUR-DÉCLARE Expert mais est vraiment Débutant → plan inadapté, risque blessure. À mitiger via message d'accueil ("Ton niveau déclaré est X, basé sur cela on construit Y. Si tu te sens vite débordé, n'hésite pas…"). Doctrine `sécurité > conversion` à respecter.
- **Cohérence doctrine** : ✅ `input_client_obligatoire` + ✅ `Hammond 2018` source. Léger conflit potentiel avec `sécurité avant conversion` (pas de safeguard si senior auto-évalue trop haut), mais Romane peut couvrir via message d'accueil.
- **Verdict PM** : ✅ GO. Recommandation : phrase préventive dans message d'accueil seniors ("À ton âge l'écoute du corps prime, n'hésite pas à reculer une séance si fatigue inhabituelle").

### Fix #6 — Rejet inputs pollués "km" — ✅ GO

- **Impact user** : < 1 % des plans (mauvaises saisies utilisateur type Jeremy "50km (6h50)" dans champ 10km). Sur ces cas : passage d'un chrono mal parsé (incohérent) à un fallback VMA propre.
- **Risque conversion** : neutre (utilisateur ne voit pas le bug). Mais sans le fix : plans incohérents → désengagement silencieux.
- **Risque support** : faible. Plutôt RÉDUIT (moins de plans cassés à expliquer).
- **Cohérence doctrine** : ✅ `qualité avant vitesse`. Aucun conflit doctrine.
- **Verdict PM** : ✅ GO.

---

## Synthèse finale

| #  | Dev                | PM | Action                                                                                              |
|----|--------------------|----|-----------------------------------------------------------------------------------------------------|
| 1  | ✅ GO              | ✅ GO | Deploy immédiat.                                                                                    |
| 2  | ⚠️ GO avec note    | ✅ GO (vigilance) | Deploy OK. Patch futur : clamp ou warning si `currentWeeklyElevation > maxWeeklyElevation`.        |
| 4  | ✅ GO              | ✅ GO | Deploy immédiat.                                                                                    |
| 5a | ⚠️ GO avec note    | ✅ GO | Deploy OK. Patch futur léger : `Number(data.age) >= 55` pour robustesse + couvrir `level` undefined. |
| 6  | ⚠️ GO avec note    | ✅ GO | Deploy OK. Cleanup futur : exporter `timeToSeconds` pour test direct (pas reproduit).               |

---

## Verdict global (Dev + PM)

**✅ GO HOSTING** — les 5 fixes sont validés, syntaxe correcte, code cohérent avec les diff annoncés, doctrine respectée. Les 3 notes "⚠️ GO avec note" sont des améliorations futures, PAS des bloquants. Aucun risque casse code adjacent. Couverture tests : 22 nouveaux tests verts (mais Fix #4 prompt-only sans test d'intégration, Fix #6 par reproduction et non import — à durcir un jour).

**Recommandations post-deploy (non-bloquantes, ordre de priorité)** :
1. (PM) Ajouter clamp ou warning message d'accueil pour cas `currentWeeklyElevation > maxWeeklyElevation` (Fix #2 — réduit support).
2. (PM) Phrase préventive seniors dans message d'accueil (Fix #5a — protège sur-déclaration).
3. (Dev) `Number(data.age) >= 55` (Fix #5a robustesse).
4. (Dev) Exporter `timeToSeconds` et passer le test en import direct (Fix #6 anti-dérive).
5. (Dev) Test d'intégration prompt ultra ≥ 80 km vérifie présence `SORTIE NUIT obligatoire` (Fix #4).
