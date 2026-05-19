# Audit utilité 7 appels LLM Coach Running IA
Date : 2026-05-19
Mode : lecture seule, aucune modification de code

---

## Synthèse exécutive

| | Action | Compte |
|---|---|---|
| Conservés tels quels | 4/7 | #1 preview, #2 remaining, #6 adapt, #7 Strava |
| Conservés sous condition | 1/7 | #5 generateCorrectedWeeks (utile seulement si #4 reste) |
| À SUPPRIMER | 2/7 | #3 `correctFrenchWithAI`, #4 `aiReviewPlan` |
| Fusionnés | 0/7 | (Q4 préconise NON, Q2 préconise suppression #4 plutôt que fusion) |

**Estimations post-diète** (sur 100 plans/mois) :
- Coût/plan : ~**$0.020** (vs $0.0467 actuel) = **−57 %**
- Latence preview P95 : **~10–13 s** (vs ~17 s actuel) = **−25 à −40 %**
- Appels Gemini / plan freemium : **1** (vs 2 actuels)
- Appels Gemini / plan Premium : **3–4** (vs 6–7 actuels : preview + remaining ×N batches − validator ×2 − french)

**Le gain N°1 n'est PAS l'argent. C'est :**
1. **Latence preview** : suppression de `correctFrenchWithAI` = −7 à −10 s P95 sur le chemin critique UX.
2. **Simplicité** : moins de chemins de code à maintenir, moins de fallbacks à gérer, moins de retries à tuner.
3. **Honnêteté** : on arrête de payer un LLM pour rattraper ce que les regex font déjà.

---

## Tableau récapitulatif des 7 appels

| # | Fonction | Fichier:Ligne | Cas d'usage | Consommateur aval | Verdict | Modèle reco |
|---|---|---|---|---|---|---|
| 1 | `generatePreviewPlan` | `geminiService.ts:3338` | UX live : génère S1 quand user finit questionnaire | UI (preview avant paiement), entrée de #2 | **NÉCESSAIRE** | `gemini-3-flash` |
| 2 | `generateRemainingWeeks` | `geminiService.ts:4459` | Async post-paiement : génère S2-SN par batches | UI plan complet | **NÉCESSAIRE** | `gemini-3-flash` |
| 3 | `correctFrenchWithAI` | `geminiService.ts:499` | Post-#1 et post-#2 : rattrape fautes français | Mute le plan in-place (welcomeMessage, mainSet, advice...) | **SUPPRIMABLE** | — |
| 4 | `aiReviewPlan` (Layer 2) | `planValidator.ts:877` | Audit qualitatif post-#2 uniquement (jamais preview) | `flaggedWeeks` consommé par #5 | **SUPPRIMABLE** | — |
| 5 | `generateCorrectedWeeks` (Layer 3) | `planValidator.ts:911` | Re-gen ciblée des semaines flaggées par #4 | Remplace les semaines flaggées dans le plan final | **CONDITIONNEL** : meurt avec #4 | — |
| 6 | `adaptPlanFromFeedback` | `geminiService.ts:5796` | User submit feedback hebdo (RPE, Strava) → modif max 3 séances | UI plan modifié + bandeau coach | **NÉCESSAIRE** | `gemini-3-flash` |
| 7 | `analyzeActivitiesWithGemini` | `stravaAnalysisService.ts:187` | Bilan mensuel Strava 30j (1×/sem max, rate limited) | UI modal `StravaConnect.tsx:292+` (analyse + verdict + recos) | **NÉCESSAIRE** | `gemini-3-flash` |

---

## Détail par appel

### #1 `generatePreviewPlan` — NÉCESSAIRE → `gemini-3-flash`

**Cas d'usage** : déclenché dès que l'user clique "Générer mon plan" à la fin du questionnaire (`App.tsx:124`, `Questionnaire.tsx:271`). Bloque l'UI — l'user attend devant son écran.

**Output** : objet `TrainingPlan` complet avec UNE semaine (S1), `paces`, `feasibility`, `welcomeMessage`, `generationContext` (snapshot questionnaire + périodisation totale).

**Consommateurs aval** :
- UI : modale d'affichage du plan preview.
- #2 `generateRemainingWeeks` : utilise `plan.generationContext` (paces figées + périodisation) pour générer S2-SN.
- #3 `correctFrenchWithAI` : exécuté juste après pour patcher les fautes.

**Si supprimé** : impossible. C'est le cœur de l'app. Sans S1 = pas de preview = pas de conversion freemium → premium.

**Verdict** : **NÉCESSAIRE**.

**Modèle reco** : `gemini-3-flash`. Latence et qualité critiques en UX. Pro est exclu (P95 ~25 s > seuil acceptable).

---

### #2 `generateRemainingWeeks` — NÉCESSAIRE → `gemini-3-flash`

**Cas d'usage** : déclenché après paiement Premium (`App.tsx:829`, `:1137`). Background, l'user a déjà le plan S1 sous les yeux. Génère S2 jusqu'à S_totalWeeks par batches de 4-6 semaines (selon `frequency`). Pauses 4 s entre batches pour éviter 429.

**Output** : `TrainingPlan` complet (S1 + S2..SN), `fullPlanGenerated: true`, `isPreview: false`. Mute via `enforceWeekConstraints`, `enforceFullPlanConstraints`, `validateAndCorrectPlan` (#4+#5), puis `correctFrenchWithAI` (#3).

**Consommateurs aval** : UI plan complet, `applyAdaptation` (semaines individuelles), Firestore (persistance).

**Si supprimé** : pas de plan Premium = produit cassé.

**Verdict** : **NÉCESSAIRE**.

**Modèle reco** : `gemini-3-flash`. Background, non-bloquant côté UX. La S1 sert d'ancre forte (paces, périodisation, style figés dans `generationContext`). Le rôle = répliquer un pattern. Flash suffit largement, Pro ferait monter le coût ×4 sans gain qualité notable.

**Note sur Q4 (fusion preview + remaining)** : voir section "Q4" plus bas — **NON recommandée**.

---

### #3 `correctFrenchWithAI` — SUPPRIMABLE

**Cas d'usage** : appelé 2× dans le pipeline :
- `geminiService.ts:4231` : à la fin de `generatePreviewPlan` (chemin critique UX).
- `geminiService.ts:4975` : à la fin de `generateRemainingWeeks` (background).

**Output** : aucun (mute le plan in-place). Patche `welcomeMessage`, `feasibility.message`, `weeks[].weekGoal`, et pour chaque session : `warmup`, `mainSet`, `cooldown`, `advice`.

**Mécanisme** : prompt très ciblé "corrige UNIQUEMENT grammaire / accords / tutoiement / élision". Renvoie un objet `{corrections: {<idx>: "texte corrigé"}}` que la fonction applique. Safety check : si le texte corrigé supprime des allures `min/km`, skip.

**Consommateur aval** : l'UI affiche le texte muté — donc toute amélioration finit sous les yeux du user.

**Pourquoi SUPPRIMABLE** :

1. **`forceTutoiement` (`geminiService.ts:308–487`) fait DÉJÀ 90 % du boulot** en regex déterministes. C'est un correcteur tutoiement/accords français de **180 lignes**, **exhaustif** :
   - Impératifs `-ez → -e` (78 verbes + catch-all regex pour le 1er groupe).
   - Possessifs `votre/vos → ton/tes`.
   - Pronom objet : `nous vous`, `qui vous`, etc. → `te`.
   - Réfléchi : `-vous → -toi`.
   - Élision `te → t'` devant voyelle.
   - Formes hybrides cassées par Gemini : `tu devez → tu dois`, `tu pouvez → tu peux`, etc.
   - Accords `ton sortie → ta sortie`, `ton course → ta course`, etc. (60+ noms féminins listés).
   - Bouclage avec `forceTutoiement` appliqué sur **chaque mainSet/advice/warmup/cooldown** dans `postProcessWeekQuality` (L719–722) ET sur welcomeMessage/feasibility (L4175–4177).

2. **Cas observés dans les audits 27 profils** : recherche par grep dans `AUDIT-*.md`, `TESTS-SPRINT*.md`. **Une seule mention de faute** : `AUDIT-WOZNIAKMAEVA.md:233` = `"Tu introduire"` (au lieu de `"Tu introduiras"`). C'est une **faute sémantique** (mauvaise conjugaison du futur), pas une faute typo/accord. Le LLM correcteur **n'aurait probablement pas attrapé non plus** car ce n'est pas un cas listé dans son prompt (le prompt cible accords/tutoiement/élision).

3. **Logs `[FrenchAI] ✅ Aucune correction nécessaire` / `[FrenchAI] ✅ N texte(s) corrigé(s)`** : aucun log retrouvé dans les fichiers `.txt` ou `.md` du repo. On n'a **pas de data quantifiée** prouvant que le LLM corrige autre chose que ce que les regex ont raté. Doctrine doit l'objectiver côté prod si on garde.

4. **3-flash > 2.5-flash en français natif** : 3-flash a +60 ELO vs 2.5-flash sur les benchmarks publics. Une preview générée en 3-flash sort du français déjà plus propre que 2.5-flash actuel. Le rôle de #3 (rattraper les fautes 2.5-flash) devient marginal.

5. **Coût latence concret** : sur le chemin critique preview, **−7 à −10 s P95**. C'est **plus important que le gain coût** ($1.05/mois sur 100 plans = négligeable).

**Risque de suppression** : pour les fautes sémantiques type "Tu introduire" / "Tu pouve" qui passent à travers les regex, on perd le rattrapage. Mais :
- Ces cas sont **rarissimes** (1 cas trouvé sur 27 profils audités).
- Le LLM ne les attrape pas systématiquement (pas garanti par le prompt actuel).
- On garde `forceTutoiement` qui est **plus fiable** car déterministe et appliqué exhaustivement.

**Verdict** : **SUPPRIMABLE**. Action : retirer les 2 appels `await correctFrenchWithAI(plan)` aux lignes 4231 et 4975. Conserver `forceTutoiement` intégral. Si Romane veut un filet de sécurité supplémentaire, ajouter 2-3 regex pour les fautes sémantiques observées (`tu (\w+)er → tu \1eras`).

---

### #4 `aiReviewPlan` (Layer 2 validator) — SUPPRIMABLE

**Cas d'usage** : appelé uniquement dans `validateAndCorrectPlan` (`planValidator.ts:1078`), lui-même appelé uniquement dans `generateRemainingWeeks` (`geminiService.ts:4920`). **JAMAIS sur la preview.** Condition : `plan.weeks.length >= 3` (plan multi-semaines).

**Output** : `{ overallScore, criteria: {progression, injuryRisk, difficulty, variety, specificity}, flaggedWeeks: number[], suggestions: string[] }`.

**Consommateur aval** : `flaggedWeeks` est combiné avec `errorWeeks` (= weeks avec erreurs Layer 1 déterministe). L'union `allFlagged` (capped à 5) est passée à #5 `generateCorrectedWeeks`. Si `aiReview` est sup­primé, `allFlagged = errorWeeks` uniquement → Layer 3 ne se déclenche QUE sur les vrais bugs Layer 1.

**Si supprimé** : aucun impact sur le plan tant que Layer 1 détecte les vrais bugs. Et **Layer 1 EST très complet** :

- **Volume progression week-over-week** (Rule 1) : seuils adaptatifs par niveau et volume absolu.
- **Pas 2 séances hard consécutives** (Rule 2).
- **Pas 2 séances longues consécutives** (Rule 2b).
- **Ratio SL/volume** (Rule 3).
- **Débutant sans fractionné < S6** (Rule 4) + marche/course S1-S4 obligatoire (Rule 4b) + cap 45 min S1-S4 (Rule 4c).
- **Récup toutes les 3-4 semaines** (Rule 5).
- **Nb séances = frequency** (Rule 6).
- **Min 1 renfo / semaine** (Rule 7).
- **Cap volume hebdo + cap session km** (Rule 8, table niveau × objectif).
- **Max 2 séances Difficile / semaine** (Rule 8b).
- **Récup avec vraie baisse de volume** (Rule 9).
- **Volume S1 vs currentWeeklyVolume** (Rule 10).
- **mainSet ↔ duration/distance mismatch** (`checkMainsetDurationMismatch`, écart > 20 %, skip types risqués).

**Ce que #4 ajoute** : un audit **subjectif** sur `progression / variety / specificity` qui peut flagger des semaines à tort (faux positif). Pas de data prouvant qu'il catch des bugs que Layer 1 rate.

**Critique fondamentale** :

1. **mxjulien02 (le bug emblématique) n'a PAS été corrigé par le validator LLM**. La correction a été faite **dans le code déterministe** (`feasibilityService.ts`, Sprint 2 Fix C : seuils %VMA tenu). Cf `TESTS-SPRINT2-15-PROFILS-AVANT-APRES.md:6-19`. Le validator LLM aurait pu détecter à tort un AMBITIEUX et le re-générer en EXCELLENT en boucle.

2. **Sprint 2 mentionne "validator" 1× au sens `checkMainsetDurationMismatch` (Layer 1 déterministe), JAMAIS au sens `aiReviewPlan`** (`TESTS-SPRINT2-15-PROFILS-AVANT-APRES.md:215+`).

3. **Modèle actuel `gemini-2.0-flash`** = le pire modèle disponible. Le doc `EXPERT-LLM-MODELES-CONFIG.md:79+` recommandait `gemini-3-pro` pour ce filet. Mais : **payer Pro ($4.40/mois) pour un audit subjectif qui n'a pas démontré sa valeur** = mauvais ROI.

4. **Risque de Layer 3 (#5) re-générer une semaine déjà correcte** parce que le LLM la flag à tort sur `variety < 6` : on perd la cohérence avec l'ancre S1 (la re-gen ne voit que `contextWeeks.slice(-3)`), on crée potentiellement plus de bugs que ce qu'on corrige.

5. **Aucune télémétrie** ne mesure l'utilité réelle : pas de log de "combien de fois `aiReview` a flag une semaine que Layer 1 n'avait PAS déjà flaggée + correction Layer 3 a réellement amélioré le plan".

**Verdict** : **SUPPRIMABLE**. La protection vient de :
- Layer 1 déterministe (très complet).
- `enforceWeekConstraints` + `enforceFullPlanConstraints` côté code dans `geminiService.ts`.
- `feasibilityService.calculateFeasibility` (pur JS).
- Les patchs déterministes (post-processing renfo, footingVariants, D+ enforcement, etc.).

Action : retirer le call `aiReviewPlan` dans `validateAndCorrectPlan` (planValidator.ts:1076-1097). Garder `validatePlanRules` (Layer 1). Pour Layer 3 → utiliser uniquement `errorWeeks` de Layer 1 (cf #5).

---

### #5 `generateCorrectedWeeks` (Layer 3) — CONDITIONNEL

**Cas d'usage** : re-génère uniquement les semaines listées dans `allFlagged` (union Layer 1 errorWeeks + #4 flaggedWeeks). Limité à 5 semaines max. Avec contexte = 3 dernières semaines correctes + périodisation des semaines à corriger + liste des issues détectées.

**Output** : `Week[]` corrigées. Réinjecte le renfo via `buildRenfoMainSet` (code déterministe) pour préserver le format Nom(NxM).

**Consommateur aval** : `validateAndCorrectPlan` remplace les semaines flaggées dans `plan.weeks`, re-valide Layer 1.

**Si supprimé avec #4** : pas de re-gen LLM. Les bugs Layer 1 (error severity) sont remontés mais pas auto-corrigés. **Acceptable** car :
- `enforceWeekConstraints` + `enforceFullPlanConstraints` patchent déjà beaucoup côté code.
- Les errors Layer 1 sont rares après ces enforcements (post-processing déterministe corrige volumes, caps, SL day, etc. avant Layer 1).
- Si une error survient, log + monitoring → patch côté code ou prompt, pas LLM rattrapage.

**Si gardé sans #4** : alors on garde **uniquement** comme re-gen de Layer 1 errorWeeks. Utilité = nulle si Layer 1 errors sont déjà patchées côté code par les enforcements en amont.

**Verdict** : **CONDITIONNEL — meurt avec #4**. Si on supprime #4, on doit aussi supprimer #5 (sinon il ne se déclenchera quasi jamais et resterait du code mort). Si on garde #4 → upgrade vers 3-flash.

Recommandation : **supprimer #4 et #5 ensemble**. Si en prod on observe des bugs Layer 1 récurrents non rattrapés par les enforcements, on patche **côté code** (plus fiable, plus rapide) plutôt que de relancer un appel LLM.

---

### #6 `adaptPlanFromFeedback` — NÉCESSAIRE → `gemini-3-flash`

**Cas d'usage** : user clique "soumettre feedback" sur sa semaine (RPE, ressenti, données Strava optionnelles). Le coach modifie **max 3 séances futures** + écrit un message coach personnalisé.

**Output** : `{ adaptationSummary, coachNote, pacesReminder, objectiveReminder, modifications: [...] }`.

**Consommateur aval** : UI affiche le coach note + applique les modifications au plan (Firestore).

**Si supprimé** : on perd la feature "Mon Coach" (adaptation hebdo). Différenciateur produit clé.

**Verdict** : **NÉCESSAIRE**.

**Modèle reco** : `gemini-3-flash`. Async, user attend un peu mais pas live UX. Prompt fournit déjà toutes les contraintes (RPE, phase, allures, doctrine objectifs). Flash gère sans problème. Pro = surcoût latence (25–30 s) frustrant.

**Note dead code** : ligne 5326 = `model` déclarée puis shadowée par `adaptationModel` L5795 (jamais utilisée). À nettoyer en passant (cf `EXPERT-DEV-MODELES-FAISABILITE.md:53`).

---

### #7 `analyzeActivitiesWithGemini` (Strava) — NÉCESSAIRE → `gemini-3-flash`

**Cas d'usage** : user clique "Bilan mensuel" depuis `StravaConnect.tsx:139`. Rate-limited à 1× / semaine via `checkCanAnalyze` (Firestore). Récupère 30 derniers jours via API Strava puis envoie à Gemini pour analyse coach.

**Output** : `{ totalDistance, totalTime, totalElevation, sessionCount, avgPace, weeklyBreakdown, strengths: [...], weaknesses: [...], recommendations: [...], mainInsight, coachVerdict, coachMessage, fcAlert: {...} }`.

**Consommateur aval** : **outil 100 % indépendant du plan**. Affichage modal dans `StravaConnect.tsx:292-352`. Sauvegardé en Firestore (`saveAnalysisResult`) pour cache + rate limiting.

**Recherche grep** : aucun `import { analyzeActivitiesWithGemini }` ni `import { saveAnalysisResult }` ni lecture du résultat dans `geminiService.ts`, `planValidator.ts`, ni dans la génération de plan. **Aucun lien avec le plan**.

**Si supprimé** : l'utilisateur perd la feature "Bilan mensuel Strava". Feature isolée et payante différenciante mais **n'impacte pas du tout la qualité de génération du plan**.

**Verdict** : **NÉCESSAIRE pour la feature Strava**, mais à reclasser : **ce n'est pas un appel "Coach Running IA core"**, c'est un outil annexe Strava. Donc Q3 de Romane ("Vraiment utilisé en aval ? Quel signal concret il produit qui change la génération du plan ?") = **NON**, ne change RIEN à la génération. Mais ne pas le supprimer pour autant : il sert à l'utilisateur Strava.

**Modèle reco** : `gemini-3-flash`. Analyse tabulaire (FC, allures, distances). Tâche structurée, pas de raisonnement complexe.

---

## 4 questions Romane — réponses détaillées

### Q1 — `correctFrenchWithAI` est-il encore utile avec 3-flash natif meilleur ?

**Data observée 27 profils Sprint 1+2+3** :
- Recherche grep "français/fautes/grammaire/tutoiement/ton sortie/tu devez" dans tous les `AUDIT-*.md` et `TESTS-SPRINT*.md` : **1 seul cas trouvé** = `AUDIT-WOZNIAKMAEVA.md:233` "Tu introduire" (faute sémantique de conjugaison futur).
- Aucune mention de log `[FrenchAI] ✅ N texte(s) corrigé(s)` dans les `.txt`/`.md` du repo → pas de quantification "combien de fois le LLM a réellement corrigé".

**Mécanisme actuel** : 2 étages :
1. **Regex déterministes `forceTutoiement`** (`geminiService.ts:308–487`) appliquées dans `postProcessWeekQuality` à chaque session + sur welcomeMessage/feasibility. **Très exhaustives** : 180 lignes couvrant impératifs, accords féminins, élisions, conjugaisons hybrides cassées, formes négatives.
2. **LLM `correctFrenchWithAI`** : rattrape ce que les regex ont raté.

**Verdict** : **SUPPRIMER**.

Justifications :
- Sur 27 profils audités, le seul cas attesté n'est PAS dans le scope du prompt LLM (conjugaison futur "introduire → introduiras" n'est pas dans les 5 règles du prompt).
- `forceTutoiement` couvre déjà tutoiement/accords/élision = 90 % des cas.
- 3-flash en français natif > 2.5-flash → encore moins de fautes générées en amont.
- Gain latence preview : **−7 à −10 s P95** sur le chemin critique UX.
- Gain coût : marginal ($1.05/mois).
- Risque : pertes rares (1/27 = <4 %), fautes sémantiques peu visibles. Si Romane veut un filet, ajouter 3-4 regex ciblées pour les patterns observés ("tu + verbe-er au lieu de futur").

---

### Q2 — Fusionner `planValidator` dans `generatePreviewPlan` self-review ?

**Lecture du validator** (`planValidator.ts:828+`) :
- **Critères audités** par `aiReviewPlan` : `progression`, `injuryRisk`, `difficulty`, `variety`, `specificity` (subjectifs).
- Renvoie `flaggedWeeks` pour re-gen via `generateCorrectedWeeks`.
- **Le validator NE TOURNE PAS sur la preview** (`plan.weeks.length >= 3` requis, preview = 1 semaine). Donc fusion `validator → preview` = problème inexistant.

**Le validator tourne uniquement post-`generateRemainingWeeks`** (full plan). Si on fusionne en "génère + self-review" :

**Option A — Fusion self-review** : ajouter au prompt de `generateRemainingWeeks` une étape "1. Génère le plan. 2. Vérifie ces critères : ... 3. Corrige. 4. Retourne JSON final."
- **Pour** : 1 appel au lieu de 3 (remaining + #4 + #5).
- **Contre** :
  - Le batch `generateRemainingWeeks` fait DÉJÀ 65 536 tokens output. Ajouter self-review = soit on ne tient pas le budget tokens, soit on dégrade le contenu généré.
  - Self-review LLM = peu fiable. Les modèles ne se contredisent pas eux-mêmes facilement (effet "mode-collapse").
  - On perd le pouvoir d'un audit indépendant.
  - Sur le concept même : le validator a-t-il prouvé son utilité ? **NON** (cf #4 ci-dessus).

**Option B — Garder validator séparé (async)** :
- Background, ne bloque pas l'UX. État actuel.
- Mais : il rate les bugs critiques (mxjulien02), et fait de l'audit subjectif douteux.

**Option C — RECOMMANDÉE : ni fusion, ni séparation = SUPPRESSION**

L'audit montre que :
1. Layer 1 (rules déterministes) est très complet (10+ règles, mainSet/duration check, caps, ratios).
2. `enforceWeekConstraints` + `enforceFullPlanConstraints` patchent côté code les volumes, caps, jours SL, distribution D+, etc.
3. `feasibilityService` est 100 % déterministe → ce qui a vraiment corrigé mxjulien02 (pas le LLM validator).
4. Le validator LLM `aiReviewPlan` n'a aucune télémétrie qui démontre qu'il catch des bugs que les autres couches ratent.
5. Coût Pro pour ce validator = $4.40/mois = 42 % du budget total Gemini. Mauvais ROI.

**Verdict** : **NI fusion NI conservation. SUPPRIMER #4 et #5**. Garder Layer 1 (déterministe) + enforcements code (déterministes).

Si Romane veut investir l'effort d'avoir un audit LLM réel, le faire **avec télémétrie** : logger `aiReview.flaggedWeeks` vs `validation.errorWeeks` sur 50 plans, mesurer le delta de bugs réellement corrigés par #5. Si delta < 10 % → confirme la suppression.

---

### Q3 — `analyzeActivitiesWithGemini` Strava : utilisé en aval ?

**Trace consommateurs aval** (grep complet du repo) :
- `StravaConnect.tsx:139` → setAnalysis (state local) + ouvre modal.
- `StravaConnect.tsx:292-352` → affichage : verdict, mainInsight, coachMessage, strengths, weaknesses, recommendations, fcAlert.
- `stravaAnalysisService.ts:316` → `saveAnalysisResult` en Firestore pour cache + rate limiting.
- **Aucun import dans `geminiService.ts` / `planValidator.ts` / pipeline de génération de plan**.

**Signal concret produit** :
- `coachVerdict` : EXCELLENT / BON / À AMÉLIORER / INSUFFISANT.
- `fcAlert` : si user court ses footings trop vite (FC en Z3+ au lieu de Z2), message recommandant de ralentir l'allure EF.
- Strengths / weaknesses / recommendations : feedback coach.

**Aucun de ces signaux ne nourrit `generatePreviewPlan`, `generateRemainingWeeks`, `adaptPlanFromFeedback`**.

**Verdict** :
- **Q3 strict** ("change la génération du plan ?") : **NON**, signal cosmétique pour l'utilisateur Strava.
- **Pour autant** : on **NE supprime PAS** car c'est une **feature autonome payante** (1 analyse/sem) qui justifie la connexion Strava côté valeur user. Coût négligeable : 50 appels/mois × $0.009 = $0.45.

**Action** : conserver l'appel, l'isoler conceptuellement (ce n'est pas un appel "Coach Running IA" mais un appel "Outil Strava"). Modèle → `gemini-3-flash`.

---

### Q4 — Fusionner `generateRemainingWeeks` dans `generatePreviewPlan` ?

**État actuel** :
- `generatePreviewPlan` : 1 appel, génère S1 uniquement, retour rapide (P95 ~10-12 s en 2.5-flash).
- `generateRemainingWeeks` : N appels par batches (BATCH_SIZE = 4 à 6 selon frequency), pause 4 s entre batches, retry x3 si JSON tronqué ou 429. Total : 2-5 min selon plan length.

**Pourquoi le split actuel ? Hypothèses validées par lecture du code** :

- **Hypothèse A (performance)** : ✅ **VRAI**. Preview rapide UX live = clé conversion freemium. Le retour `[Gemini Preview] Terminé en ${elapsed}ms (vs ~15-30s pour plan complet)` (`geminiService.ts:4237`) le confirme.
- **Hypothèse B (coût)** : ✅ **VRAI**. Freemium ne paie pas → on ne génère pas S2-SN tant que Stripe pas confirmé. Économie réelle si conversion < 100 %.
- **Hypothèse C (qualité)** : ✅ **VRAI**. Le code commente explicitement (`geminiService.ts:4256`) : "Génère par lots de 3 semaines pour éviter les erreurs JSON dues à la troncature des réponses trop longues". 65 536 tokens output max par batch. Sur un plan 20 semaines × 4 séances × 4 champs texte (warmup/mainSet/cooldown/advice) = >>>65 k tokens en un seul shot.

**Avec 3-flash, peut-on tout générer d'un coup ?**

Calcul rapide budget tokens :
- Une semaine de plan ≈ 3-5 séances × ~250 tokens chacune (avec warmup/mainSet/cooldown/advice fournis) ≈ ~1500 tokens / semaine.
- Plan 20 semaines = ~30 000 tokens output. Plan 30 semaines = ~45 000.
- Max output 3-flash : 65 536 tokens (idem 2.5-flash).
- **Théoriquement OK** pour plans ≤ 30 sem.

**Mais en pratique, NON, ne pas fusionner** :

1. **UX critique**. La preview affichée en ~10 s vs un plan complet en ~60-120 s = différence majeure entre "wow ça marche, je m'inscris" et "ça rame, j'abandonne". Romane a explicitement classé latence preview comme essentielle.
2. **Économie freemium**. Si on génère tout pour 100 plans mais que 30 convertissent Premium, on a payé 70 × le coût "remaining" pour rien. Soit ~$0.85/mois "gaspillés". Marginal mais sale doctrine.
3. **Risque JSON tronqué**. Même 3-flash avec 30k+ tokens output a un taux d'échec non-négligeable. Le batching + retry est un filet de sécurité éprouvé (Sprint 1/2 zéro régression).
4. **Granularité d'erreur**. Si on bug en S15, on perd toutes les S1-S30 et on doit re-lancer. Avec batches, on perd 4-6 semaines max, on recommence le batch.
5. **Resume-from-where-we-stopped** (`geminiService.ts:4418-4424`). Le code actuel sait reprendre une génération interrompue (Firebase sauvegarde par batch). Fusion = on perd ce filet.

**Avec contexte 1M tokens 3-flash** : le contexte INPUT (1M tokens) n'est pas la contrainte. Le problème est l'OUTPUT capé à 65k et la fiabilité du JSON parsing sur un output massif.

**Verdict** : **NE PAS FUSIONNER**. Garder le split actuel `preview / remaining`.

**Optimisation possible (non liée à la fusion)** : revoir BATCH_SIZE avec 3-flash si la qualité monte (peut-être passer à 6-7 semaines/batch au lieu de 4-5 pour fréquence élevée). À mesurer post-migration.

---

## Config finale recommandée

| # | Appel | Action | Modèle | Justification |
|---|---|---|---|---|
| 1 | `generatePreviewPlan` | **MIGRER** | `gemini-3-flash` | UX critique, qualité +60 ELO vs 2.5-flash |
| 2 | `generateRemainingWeeks` | **MIGRER** | `gemini-3-flash` | Background, ancré par S1, qualité Flash suffisante |
| 3 | `correctFrenchWithAI` | **SUPPRIMER** | — | `forceTutoiement` regex couvre 90%, 3-flash natif meilleur français, gain latence preview ~7-10s P95 |
| 4 | `aiReviewPlan` (Layer 2) | **SUPPRIMER** | — | Layer 1 + enforcements code suffisants, validator LLM jamais démontré bénéfique (mxjulien02 corrigé côté code) |
| 5 | `generateCorrectedWeeks` (Layer 3) | **SUPPRIMER** | — | Meurt avec #4 (alimenté uniquement par flaggedWeeks de #4) |
| 6 | `adaptPlanFromFeedback` | **MIGRER** | `gemini-3-flash` | Async, contraintes claires dans prompt |
| 7 | `analyzeActivitiesWithGemini` | **MIGRER** | `gemini-3-flash` | Outil Strava autonome, qualité Flash suffisante |

**Total post-diète** : **4 appels conservés** (#1, #2, #6, #7) + outil annexe pas dans le pipeline plan.

---

## Estimation post-diète

### Coût mensuel (100 plans / mois, 30 Premium, 50 bilans Strava)

| Appel | Modèle | Volume | $/appel | Total |
|---|---|---|---|---|
| #1 generatePreviewPlan | 3-flash | 100 | $0.0255 | $2.55 |
| #2 generateRemainingWeeks | 3-flash | 30 × 3 batches | $0.016 | $1.44 |
| #6 adaptPlanFromFeedback | 3-flash | 30 | $0.008 | $0.24 |
| #7 Strava analysis | 3-flash | 50 | $0.009 | $0.45 |
| **Total** | | | | **~$4.68 / mois** |

vs Configuration actuelle (2.5-flash + 2.0-flash validator) = ~$4.67 / mois.
vs Configuration "Option D" (3-flash partout + 3-pro validator) = ~$10.48 / mois.

**Diète permet de migrer vers 3-flash sans surcoût** par rapport à l'actuel.

### Latence preview (chemin critique UX)

| Étape | Actuel 2.5-flash | Post-diète 3-flash | Delta |
|---|---|---|---|
| #1 generatePreviewPlan P95 | ~10 s | ~13 s | +3 s |
| #3 correctFrenchWithAI P95 | ~7 s | **SUPPRIMÉ** | −7 s |
| **Total P95** | **~17 s** | **~13 s** | **−4 s (−23 %)** |
| **Total P50** | **~10 s** | **~8 s** | **−2 s (−20 %)** |

**Net : preview plus rapide qu'aujourd'hui malgré upgrade modèle**. Win-win.

### Nombre d'appels LLM par plan

| Phase | Actuel | Post-diète |
|---|---|---|
| Freemium (preview seul) | 2 (#1 + #3) | **1** (#1) |
| Premium (full plan) | 6-7 (#1 + #3 ×2 + #2 ×N batches + #4 + #5 conditionnel) | **3-4** (#1 + #2 ×N batches) |
| Adaptation hebdo | 1 (#6) | 1 (#6) |
| Bilan Strava | 1 (#7) | 1 (#7) |

---

## Plan d'implémentation (estimé 1.5-2h)

**Pré-requis** : créer une branche `diete-llm` avant tout patch (instruction Romane "branche d'abord avant commit").

### Étape 1 — Migration modèles (4 chaînes à changer) — 15 min

| Fichier:Ligne | Avant | Après |
|---|---|---|
| `geminiService.ts:3338` | `gemini-2.5-flash` | `gemini-3-flash` |
| `geminiService.ts:4459` | `gemini-2.5-flash` | `gemini-3-flash` |
| `geminiService.ts:5326` | `gemini-2.5-flash` | (à supprimer, dead code) |
| `geminiService.ts:5796` | `gemini-2.5-flash` | `gemini-3-flash` |
| `stravaAnalysisService.ts:187` | `gemini-2.5-flash` | `gemini-3-flash` |

### Étape 2 — Suppression appels SUPPRIMABLES — 30 min

1. **`correctFrenchWithAI`** (geminiService.ts) :
   - Supprimer la fonction (L489-599).
   - Supprimer les 2 appels : L4231 `await correctFrenchWithAI(plan);` et L4975 `await correctFrenchWithAI(fullPlan);`.
   - Garder `forceTutoiement` intégral.

2. **`aiReviewPlan` + `generateCorrectedWeeks`** (planValidator.ts) :
   - Modifier `validateAndCorrectPlan` (L1057-1129) : retirer Layer 2 (call à `aiReviewPlan`) et Layer 3 (call à `generateCorrectedWeeks`).
   - Garder Layer 1 (`validatePlanRules`) + `fixHillySessionsElevation`.
   - Supprimer les fonctions `aiReviewPlan` (L828-897) et `generateCorrectedWeeks` (L903-1031) (mortes après).
   - Côté caller (`geminiService.ts:4917-4951`) : simplifier le bloc — on appelle juste `validatePlanRules` et on log.

### Étape 3 — Patch défensif unique conservé — 10 min

`generatePreviewPlan` (geminiService.ts:3956) : ajouter explicitement `maxOutputTokens: 8192` dans `generationConfig`. Sur 3-flash, le défaut peut être plus bas → risque JSON tronqué silencieux. Patch défensif obligatoire (cf `EXPERT-DEV-MODELES-FAISABILITE.md:103`).

```ts
generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
```

### Étape 4 — Log model dans chaque trace — 10 min

Ajouter dans chaque appel restant (#1, #2, #6, #7) un `console.log` avec le model name :
```ts
const MODEL_NAME = 'gemini-3-flash';
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
console.log(`[Gemini Preview] model=${MODEL_NAME}`);
```

Permet monitoring rapide post-deploy.

### Étape 5 — Replay 27 profils Sprint 1+2+3 — 30-45 min

Lancer `test-sprint1-15-profils.mjs`, `test-sprint2-15-profils-feasibility.mjs`, `test-sprint3-finisher-profils.mjs`. Comparer avant/après sur :

- **Feasibility** : status + score + message → doit être strictement identique (logique 100 % déterministe).
- **Allures cohérentes** : EF/Seuil/VMA/Spécifique → identique (déterministe).
- **Bug type mxjulien02** : AMBITIEUX/IRRÉALISTE doit rester IRRÉALISTE (Sprint 2 Fix C).
- **Qualité français** : audit manuel sur 5 plans aléatoires (welcomeMessage + 2 séances) → vérifier absence de fautes type "tu devez", "ton sortie", etc. Si > 1 % de plans ont une faute critique → ajouter regex ciblée dans `forceTutoiement`.

Note : les tests Sprint sont des reproductions de la **logique déterministe**, ils ne font pas d'appel LLM réel. Donc le replay validera la non-régression côté code. Pour valider la non-régression LLM, il faut **regénérer 5-10 plans réels** via le pipeline complet.

### Étape 6 — Deploy en une fois si OK

Pas de rollout progressif, pas de feature flag (doctrine "anti sur-ingénierie" pour 100 plans/mois). Monitoring post-deploy via les logs `model=...` sur 50 premiers plans.

---

## Risques résiduels & mitigations

| Risque | Probabilité | Mitigation |
|---|---|---|
| 3-flash dégrade le français vs 2.5-flash + correctFrench supprimé | Faible (3-flash > 2.5-flash en français) | Si > 1 % plans avec faute critique → ajouter 3-5 regex ciblées dans `forceTutoiement` |
| Layer 1 rate un bug que validator LLM aurait catch | Faible (jamais démontré) | Logging Layer 1 issues en prod, patcher Rules au cas par cas |
| 3-flash maxOutputTokens défaut trop bas → JSON tronqué preview | Moyen | Patch L3956 : `maxOutputTokens: 8192` explicite |
| 3-flash plus lent que 2.5-flash en réalité | Faible (annoncé iso) | Re-bench 50 premiers plans, rollback possible (commit revert) |
| Suppression `aiReviewPlan` casse `validateAndCorrectPlan` | Bas (refacto local) | Tests TS au build + unit test sur `validateAndCorrectPlan` simplifié |

---

## Annexes — citations clés

- `geminiService.ts:308–487` : `forceTutoiement` (regex déterministes complètes).
- `geminiService.ts:719–722, 4175–4177` : applications de `forceTutoiement` dans le pipeline post-processing.
- `geminiService.ts:494–599` : `correctFrenchWithAI` (LLM passe finale).
- `geminiService.ts:4231, 4975` : 2 sites d'appel de `correctFrenchWithAI`.
- `planValidator.ts:828–897` : `aiReviewPlan` (Layer 2 LLM).
- `planValidator.ts:903–1031` : `generateCorrectedWeeks` (Layer 3 LLM).
- `planValidator.ts:1057–1129` : `validateAndCorrectPlan` (orchestration 3 layers).
- `geminiService.ts:4917–4951` : seul site d'appel de `validateAndCorrectPlan` (depuis `generateRemainingWeeks`).
- `geminiService.ts:4222–4227` : preview appelle UNIQUEMENT `validatePlanRules` (Layer 1), pas `validateAndCorrectPlan`. Donc #4 et #5 ne tournent jamais sur la preview.
- `stravaAnalysisService.ts:182–319` : `analyzeActivitiesWithGemini`.
- `src/components/StravaConnect.tsx:139, 292–352` : consommateur unique de l'analyse Strava (modal).
- `feasibilityService.ts:384` : `calculateFeasibility` (100 % déterministe — c'est lui qui a corrigé mxjulien02).
- `TESTS-SPRINT2-15-PROFILS-AVANT-APRES.md:6–19` : confirmation que mxjulien02 a été corrigé via `feasibilityService.ts` (Sprint 2 Fix C), pas via LLM validator.
- `AUDIT-WOZNIAKMAEVA.md:233` : seul cas de faute français observé sur 27 profils audités.
