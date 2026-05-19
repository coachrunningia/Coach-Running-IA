# PM senior — Challenge patches Rich (perception user + business)

Date : 2026-05-18  
Auteur : PM senior Coach Running IA (15 ans B2C santé/sport)  
Sujet : Patches appliqués aujourd'hui sur les 2 plans actifs de **Rich (rauroy@yahoo.fr, UID `eSVsxhsqU2en9sbXbIAmL4xA72A3`)**, Premium converti la veille à 20:18.  
Plans concernés :
- **Plan 1** : `plans/1779135832271` (13 sem, créé 18/05, nouveau)
- **Plan 2** : `plans/1775644846100` (19 sem, créé 08/04 free trial, patché aujourd'hui)

---

## Synthèse exec

| Dimension | Verdict | Niveau de risque |
|---|---|---|
| Q1 — Convaincant pour Rich ? | OK avec réserves | Faible |
| Q2 — Cohérence 2 plans en parallèle | **Modif requise** | **Élevé** |
| Q3 — Plan 2 patché silencieusement | **Modif requise** | Moyen |
| Q4 — Doctrine 1 user = 1 stratégie | Échec partiel | Moyen |
| Q5 — Conversion / rétention | OK avec réserves | Faible |
| Q6 — Risque régénération full | **Modif requise** | **Élevé bloquant** |

**Verdict global : MODIFICATIONS REQUISES AVANT EXPOSITION USER**

3 problèmes bloquent :

1. **Incohérence factuelle Plan 2** : `name` et `distance` field disent "11 000 m D+" alors que `welcomeMessage` / `feasibility.message` / `safetyWarning` disent "12 000 m D+". La carte plan dans le dashboard affichera "110km / 11000m D+" pendant que le coach IA parle de "12 000 m D+". Pour un user qui vient de claquer un abonnement à 20:18 et qui ouvre ses 2 plans frais dimanche matin, c'est du gravier dans l'engrenage.
2. **2 plans actifs en parallèle quasi identiques** sur la même course (110 km / 12 000 m D+, raceDate 14/08/2026, même VMA 17,5, même pic 85 km / 5800 m D+). UX confuse : "lequel je suis ?".
3. **Modification silencieuse Plan 2** : un plan créé 08/04 voit son welcomeMessage, sa feasibility, sa safetyWarning réécrits aujourd'hui sans aucune trace user-visible. Pas de risque RGPD direct (c'est SON plan), mais risque CSAT si Rich a screenshot l'ancien ou s'en souvient.

---

## Q1 — Le message est-il convaincant POUR LE USER ?

### Ton CASH — analyse phrase par phrase

**`feasibility.message` (Plan 1, 13 sem)** :  
> "Ce trail de 110 km / 12 000 m D+ n'est pas optimal dans les conditions actuelles. 13 semaines pour un ultra de cette ampleur est très court — 20-24 semaines sont le strict minimum recommandé pour ce type de course."

Verdict : **juste cash, pas alarmiste**. Trois raisons :
- "n'est pas optimal" est mesuré (pas "impossible", pas "dangereux"). Master Expert l'encaisse.
- Le repère 20-24 semaines pose un cadre objectif, vérifiable, non-pifométrique. Rich va aller chercher ce repère ailleurs, le retrouvera, conclura "ils sont sérieux".
- "Point positif : ton volume actuel de 70 km/sem est une excellente base" referme positivement. Sandwich classique mais efficace.

**`feasibility.message` (Plan 2, 19 sem)** :  
> "Cet ultra de 110 km / 12 000 m D+ est ambitieux. 19 semaines de préparation, c'est dans la fenêtre minimum acceptable (20-24 semaines restent idéales pour ce type d'effort)."

Verdict : **plus doux que Plan 1, justifié** — 19 sem c'est limite-mais-OK vs 13 sem qui est franchement court. Bien.

**`safetyWarning`** (les 2 plans) :  
> "⚠️ Sécurité PRIORITAIRE : à 55 ans + ultra de haute montagne (12 000 m D+), un bilan cardio-vasculaire complet (test d'effort + ECG) avant de débuter est INDISPENSABLE."

Verdict : **juste honnête, pas culpabilisant**. C'est de la médecine du sport standard pour un Master 55 attaquant un ultra alpin. Un Expert Performance le sait déjà — il sera content que la marque l'écrive en toutes lettres (différenciateur vs Strava AI, Runna).

### Perception Master 55 Expert

Rich = profil :
- Master 55, marathon 3h00 (Boston-qualifier-grade), 70 km/sem + 3 000 D+/sem
- A fait un Saintélyon, des trails moyens
- Premier 100km alpin

Ce qu'il VEUT lire :
1. "On a vu ton CV, tu es solide" ✅ — "Ton expérience Expert (marathon 3h00) et ton volume actuel (70 km/sem + 3 000 m D+/sem) sont une base solide"
2. "On t'épargne le bla-bla, voici les chiffres" ✅ — VMA 17,6 / EF 5:07 / Seuil 3:56 / pic 85 km / 5800 D+
3. "On t'avertit là où ça pique vraiment" ✅ — cardio à 55, descente excentrique, marche montées
4. "On respecte ton choix sans le valider à 100 %" ✅ — "n'est pas optimal" + "le plan vise à limiter le risque"

Ce qu'il NE veut PAS lire :
- "Tu es vieux" → le mot "Master 55" est utilisé 4 fois (1× nom plan, 3× welcomeMessage). C'est BEAUCOUP. Voir Q5.
- "Tu n'y arriveras pas" → absent ✅
- "Renonce" → absent ✅

### Risque de renoncement

**Faible** sur l'abonnement Premium (le message reste constructif).  
**Faible** sur la course (Rich est Expert engagé, pas un débutant qu'on dissuade en 3 phrases).

**MAIS** un risque sous-estimé : Rich pourrait se dire "OK ils me proposent de refaire un plan en 20 sem… ah merde le Plan 2 EST déjà à 19 sem, qu'est-ce qui se passe ?". Voir Q2.

### Recommandation Q1

GO sur le ton et la structure des messages. **2 micro-ajustements** :
- Réduire la répétition "Master 55" dans le welcomeMessage (3× actuellement → 1×).
- Ouvrir le welcomeMessage par un compliment court sur le marathon 3h00 plutôt que par "Tu te lances dans un projet ambitieux" qui projette immédiatement la difficulté.

---

## Q2 — Cohérence entre les 2 plans en parallèle

### Ce que Rich voit dans son dashboard

Code vérifié (`src/App.tsx` lignes 211, 404, 492-497) :
- Plans triés `createdAt DESC` → **Plan 1 (18/05) = "Plan en cours"** affiché en grand via `ActivePlanCard`.
- **Plan 2 (08/04) = section "Historique"** affiché en petite carte.
- Both `endDate = 2026-08-17` → both comptés "actifs" → CTA Nouveau Plan est remplacé par "Limite atteinte — Contactez le support" (Premium cap = 2).

### Les 2 plans disent-ils la même chose ?

| Champ | Plan 1 | Plan 2 | Cohérent ? |
|---|---|---|---|
| Distance (course) | 110 km | 110 km | ✅ |
| D+ course (welcomeMessage/feasibility) | 12 000 m | 12 000 m | ✅ |
| **D+ course (`name` + `distance` field)** | **12 000 m** | **11 000 m** | ❌ **INCOHÉRENCE INTRA-PLAN 2** |
| raceDate | 2026-08-14 | 2026-08-14 | ✅ |
| Durée | 13 sem | 19 sem | OK (assumé) |
| VMA | 17,5 | 17,58 | ✅ équivalent |
| vmaSource | Estimation Expert | Marathon 3h00 | ⚠️ rédactionnel différent |
| Pic volume | 85 km | 85 km | ✅ |
| Pic D+ | 5 800 m | 5 800 m | ✅ |
| Status feasibility | AMBITIEUX | AMBITIEUX | ✅ |
| Score | 60 | 60 | ✅ |
| Phrase pivot welcome | "approche consistance privilégiée pour Master 55 ans" | idem (formule reprise) | ✅ |
| safetyWarning recovery | "S4, S7, S10" | "S4, S7, S10, S13" | ⚠️ Plan 2 mentionne S13 — vérifier que la périodisation Plan 2 (`recoveryWeeks: [4, 8, 12]`) est bien alignée → **MISMATCH** : Plan 2 safetyWarning dit "S4, S7, S10, S13" mais le contexte de génération dit `[4, 8, 12]`. |
| `feasibility.recommendation` | `"une durée de préparation d'au moins 20 semaines"` | **`None`** (absent) | ❌ asymétrie modale |

### UX concrète si Rich ouvre les 2 plans dimanche matin

Scénario réaliste :
1. Rich ouvre l'app → voit "Plan en cours" = "Préparation Trail 110km / **12000m** D+ — Finisher — 13 sem.", coach IA dit "12 000 m D+". Cohérent.
2. Il scrolle, voit "Historique" → carte "Préparation Trail 110km / **11000m** D+ — Finisher — 19 sem.".
3. Il clique sur l'historique → welcomeMessage dit "ultra de 110 km avec 12 000 m de D+", feasibility dit "Cet ultra de 110 km / 12 000 m D+".
4. → **"Pourquoi le titre dit 11 000 m et le coach 12 000 m ? Lequel est juste ?"**

Pour un client Premium qui vient de payer, c'est exactement le type de friction qui érode la confiance dans le moteur. Le risque ici n'est pas qu'il se désabonne (improbable sous 24h post-conversion), c'est qu'il **doute des autres chiffres** : "si le D+ est faux, est-ce que les allures sont fausses aussi ?".

### Faut-il archiver l'un des 2 ?

**OUI, archiver Plan 2 (le 19 sem ancien).**

Arguments POUR archivage Plan 2 :
- Plan 1 a été généré post-conversion Premium → c'est le plan que Rich a "validé" en payant.
- Plan 2 a été généré en free trial il y a 6 semaines avec des données antérieures (`age: 54`, `currentWeeklyVolume: 60`, location `Toulouse` vs `Paulhac` actuelle).
- 2 plans même course = bruit cognitif, jamais une feature.
- Plan 2 a perdu une donnée importante post-patch : `feasibility.recommendation` est `None` → la modale FeasibilityWarning n'affichera pas le CTA "Refaire un plan avec X" (cf. `FeasibilityWarningModal.tsx` l.141).
- Doctrine confirmée : "1 user actif = 1 plan principal".

Arguments CONTRE (faibles) :
- Plan 2 contient peut-être un historique de séances cochées par Rich entre 08/04 et 18/05 ? → À vérifier dans `weeks[0].sessions` ou collection séparée. Si oui, l'archivage doit préserver l'historique de progression (toggle "completed").

### Quel plan l'UI affiche par défaut ?

**Plan 1 (le plus récent)** — pas d'ambiguïté côté code, mais l'historique reste visible dans la même vue → ne résout pas la confusion.

### Recommandation Q2

**Action 1 (URGENTE, avant que Rich ouvre l'app)** : Corriger l'incohérence 11000 vs 12000 sur Plan 2 :
- soit patcher `name`, `distance`, `generationContext.questionnaireSnapshot.trailDetails.elevation` à 12000
- soit archiver Plan 2 (recommandé).

**Action 2 (recommandée)** : Archiver Plan 2 (soft-delete ou flag `archived: true` qu'il faudrait ajouter au modèle ou simplement utiliser un statut). À défaut de flag, on peut :
- supprimer Plan 2 via `deletePlan()` (qui trace dans `planDeletions`) — mais c'est destructif et Rich pourrait s'en plaindre s'il s'en souvient
- OU le laisser et ajouter un badge "ARCHIVÉ — plan free trial avant Premium" sur la carte historique
- OU patcher `endDate` à hier pour qu'il sorte du compteur "actifs" → libère le slot pour un nouveau plan et le déclasse visuellement (déjà géré par le filtre `endDate < now` côté CTA "Nouveau plan", mais Plan 2 resterait visible dans "Historique").

**Recommandation finale Q2 : NE PAS supprimer Plan 2. Le laisser visible mais corriger l'incohérence 11000/12000 a minima. Idéalement, ajouter dans son welcomeMessage une phrase d'ouverture : "Ce plan a été initié en avril (free trial). Depuis ton passage Premium, ton plan de référence est désormais le plan 13 semaines actualisé."**

---

## Q3 — Cas business "Plan 2 ancien patché silencieusement"

### Faits

- Plan 2 créé 2026-04-08 (free trial Rich)
- `updateTime` Firestore = 2026-05-18T21:45:42Z → **patché aujourd'hui, sans notification user**.
- Le patch a touché des contenus de communication majeurs : `welcomeMessage` (réécrit), `feasibility.message` (réécrit), `feasibility.safetyWarning` (réécrit, dont une référence "S13" qui n'existait probablement pas avant).

### Le user va-t-il comprendre ?

**Non, il n'a aucun moyen de comprendre.** Aucun changelog plan-level, pas de notification, pas de mention "Plan révisé le 18/05" dans la carte. Si Rich avait lu son Plan 2 il y a une semaine, il verra des phrases différentes aujourd'hui sans explication.

### Risque "modif sans mon consentement"

- Risque RGPD : **inexistant** (c'est SON plan, sur SA donnée, et le patch est une amélioration éditoriale du moteur, pas une modification de données personnelles).
- Risque CSAT : **moyen** si Rich est un client analytique (profil Expert = souvent analytique). Probabilité ~15-25 %.
- Risque marque "ils touchent à mes affaires sans me prévenir" : **moyen-faible**. Master Expert engagé → tolère mieux les itérations produit qu'un débutant.

### Alternative : archiver Plan 2 plutôt que le patcher

C'est la recommandation propre du point de vue PM. Raisons :
- Plan 2 est **caduc fonctionnellement** : Rich a maintenant Plan 1 post-Premium qui est son plan de référence.
- Toucher à un contenu "historique" pour l'aligner sur la doctrine actuelle est un anti-pattern. C'est rétroactif.
- L'effort de patch (réécrire welcomeMessage + feasibility) > effort d'archivage.
- Risque inférieur : archiver = "ce plan est terminé/figé", c'est une étiquette honnête ; patcher = "ce plan a changé sous tes yeux", c'est trouble.

### Recommandation Q3

**Reverter le patch Plan 2 et l'archiver à la place.**

Si impossible (déjà appliqué et pas de snapshot), au minimum :
- Ajouter en tête du `welcomeMessage` Plan 2 : *"Note : ce plan a été initialisé en avril 2026 et mis à jour le 18/05 pour intégrer les apports de ton passage Premium. Ton plan principal est désormais celui à 13 semaines."*
- Corriger la dérive `S4, S7, S10, S13` (incompatible avec `periodizationPlan.recoveryWeeks: [4, 8, 12]`).

---

## Q4 — Doctrine "1 user = 1 stratégie cohérente"

Checklist d'alignement des 2 plans :

| Critère doctrine | Plan 1 | Plan 2 | Aligné ? |
|---|---|---|---|
| Status AMBITIEUX | ✅ | ✅ | ✅ |
| Score 60 | ✅ | ✅ | ✅ |
| Pic volume 85 km/sem | ✅ | ✅ | ✅ |
| Pic D+ 5 800 m/sem | ✅ | ✅ | ✅ |
| Approche "consistance plutôt que pics ponctuels" | ✅ | ✅ | ✅ |
| Phrase "calibré Master 55 pour limiter le risque" dans feasibility | ✅ | ✅ | ✅ |
| Mention "20-24 semaines idéales" | ✅ | ✅ | ✅ |
| Mention cardio + ECG | ✅ | ✅ | ✅ |
| Mention marche montées | ✅ | ✅ | ✅ |
| Mention renforcement excentrique | ✅ | ✅ | ✅ |
| Mention 2-3 week-ends back-to-back | ✅ | ✅ | ✅ |
| Mention 1-2 sorties nuit | ✅ | ✅ | ✅ |
| `feasibility.recommendation` présente | ✅ | ❌ | ⚠️ asymétrie modale |
| `safetyWarning` referenced recovery weeks alignées avec `periodizationPlan.recoveryWeeks` | ✅ | ❌ (dit S13, prévoit S12) | ⚠️ |
| `name` / `distance` aligné avec texte | ✅ (12000) | ❌ (11000) | ⚠️ |

**Score doctrine : 12/15 critères alignés** → cohérence éditoriale très bonne, **mais 3 défauts factuels** :

1. `feasibility.recommendation` manquante sur Plan 2 → impacte la modale FeasibilityWarning (perte du CTA "Refaire un plan").
2. safetyWarning S13 vs perio S12 → erreur factuelle interne.
3. distance/name 11000 vs welcomeMessage 12000 → erreur factuelle exposée.

Le travail rédactionnel d'homogénéisation est de **haute qualité** — mais les 3 trous factuels font perdre la rigueur du livrable.

---

## Q5 — Conversion / rétention Rich

### Va-t-il utiliser activement son plan ?

**Probabilité forte (~80 %)** sur le court terme (J+1 à J+15) :
- Welcomes messages structurés, calibrés son niveau → pas de "ils m'ont sous-évalué".
- Allures fournies (EF 5:07, Seuil 3:56) → un Expert ouvre directement la séance 1 pour vérifier ça.
- Mention 110km/12000m → on lui parle DE SA course, pas d'un trail générique.
- Premium fraîchement payé → biais d'engagement.

**Risque** : Plan 1 est encore en `isPreview: true` avec **1 seule semaine générée**. Si Rich attend une semaine sans cliquer "Générer", il pourrait se demander si l'abonnement Premium est actif. Le CTA "Générer" doit être ultra visible (vérifié dans PlanView.tsx l.1641 : oui, bouton orange Zap).

### Risque "85 km c'est peu pour un ultra 110km !"

Profil Expert qui a fait des recherches : il sait que ratio volume hebdo / distance course = ~0,75-1,0 sur ultra. 85/110 = 0,77. **C'est dans la fenêtre**. Mais un Master Expert peut connaître des plans de Coros / Final Surge qui poussent à 100-110 km/sem.

**Mitigation déjà présente dans le welcomeMessage** :  
> "À ton âge, mieux vaut tenir 80-85 km plusieurs semaines que viser des pics ponctuels à 100 km/sem qui augmenteraient le risque de blessure sans vraiment améliorer la préparation."

C'est la bonne justification. **Mais** :
- Le mot "à ton âge" répété (3 fois "Master 55") → voir ci-dessous.
- "85 km en plateau plusieurs semaines" est en réalité une approche scientifique valide pour Master + ultra. Bien.

### Risque "on me prend pour un vieux"

**Risque modéré.** Comptage occurrences sur welcomeMessage Plan 1 :
- "Master 55 ans" — 1 fois
- "À ton âge" — 1 fois
- "55 ans" — 1 fois (dans le safetyWarning)
- "Master" dans nom plan — 0

Soit **3 références à l'âge dans le message d'accueil** + 1 dans le safetyWarning. Pour un coureur 3h00 marathon qui se vit comme "encore jeune dans sa pratique", c'est borderline. Master 55 Expert est susceptible : il préfère "ton volume actuel solide" à "à ton âge".

**Recommandation rédactionnelle** :
- Garder "Master 55" 1× dans le contexte stratégique (justification du choix 85 km plateau plutôt que pic 100).
- Remplacer "À ton âge" par "Pour un coureur Expert sur ultra" ou simplement le retirer (la justif scientifique tient sans).
- Le mot dans `safetyWarning` est OK (contexte médical → légitime).

### Le mot "Master 55" stigmatisant ?

**Non en soi**, c'est même un code FFA-grade qui valide l'expertise du moteur. **Mais en répétition, oui**.

### Recommandation Q5

GO conversion. **2 micro-fix UX** :
- Réduire répétition "Master 55" / "à ton âge" dans welcomeMessage (3→1).
- Mettre en avant la base solide ("marathon 3h00 = excellent pré-requis") avant la mise en garde (ordre actuel : "projet ambitieux" puis "base solide" → inverser).

---

## Q6 — Risque "Rich régénère son full plan demain"

### Analyse du code (`src/services/geminiService.ts` `generateRemainingWeeks`)

Le moteur de génération des semaines restantes (lignes 4192-4900) fonctionne ainsi :
- Lit `plan.generationContext` (figé à la création) : `ctx.vma`, `ctx.paces`, `ctx.periodizationPlan` (totalWeeks, weeklyVolumes, weeklyElevationTarget, recoveryWeeks, weeklyPhases).
- Génère semaines 2-N via Gemini.
- À la fin (lignes ~4793) : `fullPlan = { ...plan, weeks: [plan.weeks[0], ...generatedWeeks], isPreview: false, fullPlanGenerated: true }`.

**Bonne nouvelle** : Le spread `...plan` **préserve** les champs root patchés aujourd'hui :
- `welcomeMessage` ✅ préservé
- `feasibility` (avec `message`, `safetyWarning`, `recommendation`) ✅ préservé
- `confidenceScore` ✅ préservé
- `vma` ✅ préservé
- `name`, `distance` ✅ préservés

→ Les patches PM/coach d'aujourd'hui SURVIVRONT à un clic "Générer".

**Mauvaise nouvelle (Plan 2 spécifique)** : Le moteur lit `ctx.vma`, `ctx.paces` et `ctx.periodizationPlan` pour générer les semaines 2-19. Si ces structures du `generationContext` n'ont **pas** été patchées aujourd'hui (et l'inspection Firestore confirme qu'elles ont conservé leurs valeurs initiales `ctx.vma: 17.58125`, `ctx.questionnaireSnapshot.trailDetails.elevation: 11000`, `ctx.questionnaireSnapshot.age: 54`, `currentWeeklyVolume: 60`), alors :

- Les semaines générées vont se baser sur **D+ course = 11 000 m** (logique trail D+ dans le moteur, ligne 4774-4787 `calculateWeekTargetElevation`).
- Les allures sont OK (différence VMA 17,5 vs 17,58 négligeable).
- Le moteur pourrait régénérer un plan dont les **semaines** sont calibrées 11000 m total, mais dont le welcomeMessage/feasibility (root) parlent de 12 000 m. → Incohérence cachée mais réelle dans le détail des séances.

**Pire scénario UX** :
- Rich clique "Générer" sur Plan 2.
- Modale FeasibilityWarning s'ouvre (status AMBITIEUX) → mais **pas de bouton "Refaire un plan avec X"** car `recommendation` est `None` → CTA secondaire absent (`FeasibilityWarningModal.tsx` l.141 : `{recommendation && ...}`).
- Il coche la décharge, clique "Générer".
- 1 minute de génération.
- Le résultat : plan complet 19 sem dont les D+ hebdo cibles sont basés sur 11 000 m, pas 12 000 m. Pic 5 800 quand même (cap hardcodé par périodisation existante). Mais distribution intra-semaine légèrement décalée.
- Le welcomeMessage continue à dire "12 000 m" → **incohérence persistante**.

### Scénario "Plan 1, clic Générer"

- `ctx.vma`, `ctx.paces`, `ctx.periodizationPlan` cohérents avec les patches root (tout dit 12 000 m, pic 5 800).
- Le full plan sera cohérent.
- **Mais** : Rich va voir la modale FeasibilityWarning avec :
  - Primary CTA : "Générer la suite de ce plan"
  - Secondary CTA : "Je veux faire un autre plan avec **une durée de préparation d'au moins 20 semaines**"
- Si Rich clique secondary, il atterrit sur `/` (nouveau questionnaire) → il va se dire "j'AI déjà un plan en 19 sem dans mon historique, pourquoi on me propose ça ?". Friction.

### Recommandation Q6

**Action prioritaire** : Aligner `generationContext.questionnaireSnapshot.trailDetails.elevation` à 12 000 sur Plan 2 (et idéalement aussi `age: 55` et `currentWeeklyVolume: 70`), pour éviter qu'une régénération produise des semaines basées sur des inputs périmés.

**Action complémentaire** : Soit retirer Plan 2 du dashboard "actifs" (cf. Q2/Q3 — archiver), soit ajouter une notice "Plan principal = Plan 13 sem post-Premium" qui dissuade Rich de cliquer Générer sur Plan 2.

**Action UX** : Pour Plan 1, reconsidérer le CTA secondaire "Refaire un plan avec une durée de préparation d'au moins 20 semaines". Quand le user a DÉJÀ un autre plan qui matche cette recommandation, l'UI devrait le détecter et reformuler en "Tu as déjà un plan 19 semaines dans ton historique — l'ouvrir" plutôt que "Refaire un plan".

---

## Risques business identifiés

| # | Risque | Probabilité | Impact | Sévérité |
|---|---|---|---|---|
| R1 | Incohérence 11000/12000 sur Plan 2 visible côté user dimanche matin | Élevée | Moyen (CSAT, doute moteur) | **Haut** |
| R2 | Confusion 2 plans en parallèle "lequel je suis ?" | Moyenne | Moyen (engagement) | Moyen |
| R3 | Patch silencieux Plan 2 ressenti comme intrusion | Faible-Moyenne | Faible (Master Expert tolère) | Moyen |
| R4 | Plan 2 sans `feasibility.recommendation` → modale FeasibilityWarning incomplète | Élevée si Rich clique Générer sur Plan 2 | Faible (perte d'une option CTA) | Moyen |
| R5 | Plan 2 safetyWarning mentionne S13 alors que perio prévoit S12 | Élevée (déjà en base) | Faible (incohérence interne, rarement remarquée) | Bas |
| R6 | Génération full Plan 2 produit des semaines basées sur trailDetails.elevation=11000 mais welcomeMessage dit 12000 | Élevée si Rich clique Générer Plan 2 | Moyen (cohérence séances vs message) | Moyen |
| R7 | Répétition "Master 55" / "à ton âge" perçue comme stigmatisante | Faible-Moyenne | Faible (irritation) | Bas |
| R8 | Rich désabonne <72h post-conversion (effet georgeslor1) si déçu par UX dimanche matin | Faible (Master Expert engagé, plan honnête) | Très haut (revenu + cas client) | **Haut** |
| R9 | CTA "Refaire un plan avec 20 semaines" sur Plan 1 alors que Plan 2 dans historique fait déjà 19 sem | Moyenne | Faible-Moyen (friction) | Moyen |

---

## Recommandations PM (par priorité)

### P0 — À faire avant que Rich ouvre l'app

1. **Corriger l'incohérence 11000 m / 12000 m sur Plan 2** :
   - Patcher `name` : "...110km / 12000m D+..."
   - Patcher `distance` : "110km D+12000m"
   - Patcher `generationContext.questionnaireSnapshot.trailDetails.elevation` : 12000
   - Vérifier toutes les autres mentions internes
2. **Aligner `feasibility.recommendation` sur Plan 2** avec la même valeur que Plan 1 (`"une durée de préparation d'au moins 20 semaines"`) — actuellement `None`, casse la modale.
3. **Corriger le safetyWarning Plan 2** : remplacer "S4, S7, S10, S13" par "S4, S8, S12" (cohérent avec `periodizationPlan.recoveryWeeks: [4, 8, 12]`).

### P1 — Recommandations stratégiques (dans la semaine)

4. **Stratégie 2 plans en parallèle** : 3 options à arbitrer (cf. Q2/Q3) :
   - (a) Archiver Plan 2 proprement (action destructive, à fast-track si Rich n'a pas d'historique de séances cochées dessus)
   - (b) Laisser Plan 2 mais ajouter en tête de son welcomeMessage : *"Ce plan a été initialisé en avril (free trial). Depuis ton passage Premium, ton plan principal est désormais le plan 13 semaines actualisé."*
   - (c) Patcher `endDate` Plan 2 à 2026-05-17 pour le retirer du compteur "actifs" tout en gardant la trace
   - **Reco PM : (b)** — non destructif, transparent, conserve la confiance.
5. **Réduire la répétition "Master 55" / "à ton âge"** dans les 2 welcomeMessages (3→1).
6. **Réordonner le welcomeMessage** pour ouvrir par le compliment ("Marathon 3h00 = excellent pré-requis pour ce défi") avant la mise en garde sur la durée.

### P2 — Améliorations produit transversales (post-Rich)

7. **Versioning des plans** : ajouter `lastEditedAt` + `editReason` + `editedBy` sur le plan pour tracer les patches manuels (et éventuellement les exposer dans une vue "Historique des révisions" pour les Premium).
8. **Smart CTA "Refaire un plan avec X"** : avant de proposer "refaire un plan avec 20 sem", vérifier si l'user a déjà un plan matchant cette recommandation dans son historique → reformuler en "Ouvrir ton plan 19 sem".
9. **Doctrine "1 user actif = 1 plan principal"** : créer un statut `isPrimary` ou un sélecteur explicite "Plan principal" pour les Premium multi-plans, plutôt que de se reposer sur l'ordre `createdAt DESC`.
10. **Garde-fou cohérence post-patch** : ajouter un script de validation qui vérifie l'alignement entre `name`/`distance` (root), `welcomeMessage`, `feasibility.message`, `safetyWarning`, et `generationContext.questionnaireSnapshot.trailDetails`. Run après chaque patch manuel.

---

## Conclusion

Le travail rédactionnel des patches d'aujourd'hui est de **bonne qualité éditoriale** :
- Ton cash mais juste, calibré Expert Master.
- Sandwich transparence / motivation bien dosé.
- Sécurité explicite sans alarmisme.
- Cohérence stratégique entre les 2 plans (status, score, pic, approche).

**Mais 3 défauts factuels** (Plan 2 distance 11000 vs message 12000, recommendation manquante, safetyWarning S13 vs perio S12) cassent la perception de rigueur. Pour un user Premium fraîchement converti, ces frictions micro-mais-visibles risquent d'éroder la confiance dans le moteur — pas au point de provoquer un désabonnement façon georgeslor1, mais au point de planter une graine de doute.

**Action immédiate recommandée : P0 (3 corrections factuelles Plan 2) avant exposition user dimanche matin.**

Le reste (archivage stratégique Plan 2, micro-fix rédactionnels, garde-fous transversaux) peut suivre dans la semaine sans risque business critique.
