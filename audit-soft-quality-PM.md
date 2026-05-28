# Audit PM — Feature "Séance qualité douce S1/S2 cv ≥ 25" (29/05/2026)

## 1. VERDICT GLOBAL : **REVISE** (bloquant : 4 angles morts critiques)

Le diff est intellectuellement correct mais **incomplet techniquement**. Il ne compile pas en l'état, oublie le bloc symétrique "remaining weeks", et entre en collision avec 2 systèmes downstream (footingVariants + paceForType). À corriger avant tout merge.

---

## 2. CONTRADICTIONS DÉTECTÉES

| # | Fichier:Ligne | Problème |
|---|---|---|
| **C1 BLOQUANT** | `geminiService.ts:987-994, 1036` | Le diff utilise `questionnaireData.currentWeeklyVolume` dans `postProcessWeekQuality`, mais cette fonction ne reçoit PAS `questionnaireData` dans sa signature actuelle (params : `week, pacesObj, defaultWeekGoal, planGoal, trailDistance, bmi`). **Ne compile pas**. Il faut soit étendre la signature, soit passer `cv` directement. Appelants L5212 et L6017 à mettre à jour. |
| **C2 BLOQUANT** | `geminiService.ts:5256-5283` | Après le safety net, `buildFootingVariant` est injecté sur TOUTES les sessions `type === 'Jogging' && intensity === 'Facile'` en S1 (phase fondamental). Si Gemini type la séance soft "Strides" en Jogging Facile → **footingVariants écrase title/warmup/mainSet/cooldown/advice** → la séance qualité est REMPLACÉE par un footing classique. Le patch est invisible côté user. À résoudre : skip la session si `isSoftQuality(title)`. |
| **C3** | `geminiService.ts:5657-5664` | Bloc prompt symétrique pour les **semaines restantes** (gen continuée) n'est PAS patché dans le diff. Garde l'ancienne logique `data.frequency >= 4` + "à partir SEMAINE 3" + verbe `DOIT` + options fartlek/côtes. **Incohérence** S1 (preview, nouveau prompt) vs S2-S3+ (remaining, ancien prompt) sur le MÊME plan. |
| **C4** | `geminiService.ts:1126-1134` (Patch C fartlek doux) | Si Gemini type "VMA douce 6×200m" en `Fractionné` + intensity `Modéré`/`Facile`, `Patch C` force `targetPace = efPace` au lieu de `vmaPace`. **L'allure VMA réclamée par le brief disparaît**. Soit on accepte (VMA douce = pas vraie VMA), soit on whitelist le pattern soft pour garder vmaPace. À trancher explicitement. |
| **C5** | `geminiService.ts:153` (paceRecalibration) | "Strides (footing EF + 6 lignes droites)" ne matche aucun pattern `isFractioneOrSeuil` → traité comme EF → recalibration EF appliquée sur la portion strides. Mineur (strides courts) mais à noter. |
| **C6 régression silencieuse** | Diff zone 1 | Suppression de `data.frequency >= 4` au profit de cv ≥ 25. **Profil freq 3 cv 30** (ex : Conf trail running 2x/sem long) déclenchait JAMAIS la séance qualité, maintenant DÉCLENCHE. Cohérent avec l'intention Romane mais à valider explicitement. |
| **C7 régression possible** | Diff zone 1 | Profil **freq 4 cv 18** (Inter motivé débutant en volume) déclenchait AVANT (≥ 4), ne déclenchera PLUS (cv < 25). **Régression invisible** pour ces profils. À confirmer voulu. |

---

## 3. DOCTRINES IMPACTÉES

| Doctrine | Statut | Note |
|---|---|---|
| `feedback_qualite_avant_vitesse` | ⚠️ À respecter | Batterie 10+ profils OBLIGATOIRE avant merge (cf §4) |
| `feedback_validation_n_profils_avant_sprint` | ⚠️ Bloquant | Idem, exigence explicite |
| `feedback_securite_avant_conversion` | ✅ Compatible | Verbe `PEUT` (non `DOIT`), reste DOUX, scope opt-in côté prompt |
| `feedback_courte_duree_charge_allegee` | ⚠️ À vérifier | Plan < 13 sem = charge allégée. Activer qualité S1 sur plan 8 sem cv 30 pourrait casser la doctrine. **Ajouter clause `durationWeeks >= 13` ?** À trancher Romane. |
| `feedback_mode_marche_course_scope` | ✅ OK | Filtre `!needsMarcheCourse` préservé |
| `feedback_courte_duree_charge_allegee` (D18b) | ✅ OK | Pas d'impact distance |

---

## 4. TESTS OBLIGATOIRES AVANT MERGE

### Unit (Vitest) — safety net `postProcessWeekQuality`
1. **cv=2 cyrielle Déb** → soft quality "Strides" en S1 → DOIT être convertie en footing EF (cv < 25)
2. **cv=60 ericsson Expert** → "VMA douce 6×200" S1 → DOIT être préservée
3. **cv=24 Inter** → seuil dur "Seuil tempo 4×1km" S1 → DOIT être convertie EF (eligibleSoft=false car cv<25)
4. **cv=25 Inter** → "Seuil tempo 4×1km" S1 (Gemini hors instruction) → DOIT être convertie EF (regex isSeuil match, isSoftQuality false)
5. **cv=25 Inter** → "VMA douce 6×200m récup 1'30" S1 → DOIT être préservée
6. **cv=30 freq=3 Inter** (régression C6) → soft quality OK
7. **cv=18 freq=4 Inter** (régression C7) → AUCUNE séance qualité (filtre cv)
8. **Phase = recuperation + soft quality** → DOIT être convertie EF (jamais en récup, eligibleSoft.fondamental gate)
9. **Plan PdP cv=25** → soft quality bloquée (le bloc PdP L4783 interdit fractionné/VMA, vérifier non-régression)
10. **Trail VK cv=30** → vérifier non-collision avec bloc `isVKPreview` L4734 (court en fondamental autorisé)

### Snapshot prompt
- **Profil cv=30 Inter Marathon** : vérifier prompt contient nouveau bloc soft
- **Profil cv=20 Inter Marathon** : vérifier prompt contient "100% EF"
- **Diff prompt avant/après** sur même profil cv 30 (vérifier qu'on n'a pas cassé la suite)

### E2E LLM réel (déjà prévu — 10 profils)
- Ajouter monitoring : compter qu'au plus 1 séance qualité/sem, jamais en S2 récup, jamais en récup hebdo

### Tests intégration — collision footingVariants (C2)
- **cv=30 Inter S1** : Gemini sort "Strides" type=Jogging Facile → vérifier que footingVariants NE l'écrase PAS

---

## 5. RISQUES DOWNSTREAM IDENTIFIÉS

1. **footingVariants écrase soft quality** (C2) — critique
2. **Patch C fartlek doux force EF pace sur VMA douce** (C4) — l'allure perd son sens
3. **Bloc remaining weeks non patché** (C3) — incohérence S2+
4. **Adaptation/RPE sliders** : la séance VMA douce 6×200m a `intensity=Modéré` mais effort réel court intense. Si user note "trop dur", le système d'adaptation doit-il baisser le volume ou supprimer les strides ? Comportement non spécifié. À documenter.
5. **paceRecalibration** : strides EF → recalcul EF appliqué (mineur)
6. **planValidator Rule 4** : skip déjà car `isBeginnerLevel` filtré en amont — OK
7. **Combo `_raceDay` + S1 soft quality** : si user a une course très tôt et la S1 contient une séance qualité, vérifier que `weeklyVolumes` exclut bien la course (cf doctrine D19) — pas d'impact direct mais à check

### Recommandation finale
**Ne pas merger en l'état**. Corriger C1+C2+C3 (bloquants), trancher C4 (allure VMA douce), trancher clause `durationWeeks >= 13`, puis batterie 10 profils + 5 unit tests minimum. **Effort réel estimé : 5h dev + 3h tests = 1 jour, pas demi-journée**.
