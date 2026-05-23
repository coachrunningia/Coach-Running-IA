# PM ultra critique — Challenge backlog
Date : 2026-05-21

## TL;DR
- Items KEEP : **3/10** (P0-1, P0-2, P1-6 ampoule)
- Items DOWNGRADE : **4/10** (P0-3, P1-1, P1-4, P1-7)
- Items WONTFIX : **3/10** (P1-2, P1-3, P1-5 message inversé, P2-3)

> Note : la mission liste 10 items numérotés. Je m'aligne sur ses libellés (P1-5 = message "très chargée volume" inversé, P1-6 = ampoule vs blessure structurelle), les deux apparaissent dans le backlog source.

---

## Item par item

### P0-1 handleRecalculateVMA ne save pas feasibility
- **User-visible ?** OUI directement. User clique "recalculer VMA", paces bougent, mais message de feasibility cite l'ancienne VMA. Confusion garantie → ticket support ou perte confiance.
- **Déjà patché live ?** Julian Jobert patché manuellement ce soir. Mais c'est le SEUL cas observé sur 10+ patches. Tous les futurs recalculs VMA reproduiront le bug.
- **Vrai bug ?** OUI sans ambiguïté. Code calcule `newFeasibility` puis l'utilise UNIQUEMENT dans un toast volatile. Oubli pur. Pas de débat doctrinal.
- **Coût/bénéfice :** 5 min code + 15 min tests. Probabilité re-survenue = 100% pour chaque user qui recalcule VMA. ROI massif.
- **Risque dette tech :** 1 ligne ajoutée (`fullPlan.feasibility = newFeasibility;`). Zéro complexité. Respecte `feedback_chaque_ligne_justifiee`.
- **Verdict : 🟢 KEEP — sprint demain matin, top priorité**

### P0-2 Doublon Strava activityId
- **User-visible ?** Partiellement. Stats RPE faussées (1 sortie comptée 2×), affichage UI doublon. User attentif le voit, user moyen probablement pas. Touche uniquement users Strava-connectés (sous-segment).
- **Déjà patché live ?** Julian uniquement. Aucun autre cas remonté sur 10+ patches.
- **Vrai bug ?** OUI. Une activity ne peut pas matcher 2 séances logiquement. Unicité = invariant data.
- **Coût/bénéfice :** 30 min. Préventif futurs cas Strava. Impact moyen (data hygiene).
- **Risque dette tech :** Set d'IDs déjà assignés par plan. ~10 lignes. Justifié par cas Julian.
- **Verdict : 🟢 KEEP — sprint demain, mais après P0-1**

### P0-3 D+ Trail branche secondaire %VMA
- **User-visible ?** Wording feasibility uniquement. Bertrand et Cyril ne se sont JAMAIS plaints du "95% VMA" — c'est le Coach 20 ans (analyste interne) qui le flag. User réel ne lit pas pctVmaPercent comme un coach.
- **Déjà patché live ?** Bertrand et Cyril audités, plans OK ce soir. Donc cas closés.
- **Vrai bug ?** Hypothétique. Flag dit "PROBABLEMENT un bug d'affichage". On n'a pas reproduit. C'est une investigation, pas un fix identifié. Risque : 45 min pour découvrir que tout va bien.
- **Coût/bénéfice :** 45 min investigation pour 2 cas closés et zéro plainte user. Mauvais ROI.
- **Risque dette tech :** Si on touche `feasibilityService.ts` sans bug reproductible → on viole `feedback_chaque_ligne_justifiee`. On code par anticipation théorique.
- **Verdict : 🟡 DOWNGRADE — reporter 1 mois, attendre 3e cas réel pour confirmer le pattern**

### P1-1 Smoothing ×1.15 étrangle Inter+ (Margaux)
- **User-visible ?** OUI : pic Semi 18 km au lieu de 25. Mais Margaux est patchée live + hard floor Semi ≥22 déjà déployé Sprint P0b. Le plancher absorbe déjà 80% du problème.
- **Déjà patché live ?** Margaux OUI + hard floor sprint P0b protège tous les futurs cas Semi.
- **Vrai bug ?** Le smoothing est une heuristique, pas un bug. Le toucher demande recalibrage profil par profil. Risque régression sur autres cas équilibrés.
- **Coût/bénéfice :** 1h investigation + risque casser autres profils. Le hard floor existant est déjà la ceinture de sécurité.
- **Risque dette tech :** Modifier formule mathématique = risque massif. Pas tant qu'on n'a pas 3+ cas observés post-hard-floor.
- **Verdict : 🟡 DOWNGRADE — attendre 2-3 cas après hard floor pour valider qu'il subsiste un trou**

### P1-2 Expert phase fondamental + safety net (floggyz)
- **User-visible ?** OUI fortement : 4 footings identiques à 5:07/km = ennui + perte d'élasticité. Expert va le voir et râler.
- **Déjà patché live ?** floggyz patché. Aucun autre Expert VMA>15 30 sem signalé.
- **Vrai bug ?** Frontière floue : c'est plus une "pédagogie coach" qu'un bug technique. Le code FAIT ce qu'on lui demande (EF en fondamental). C'est la doctrine qui doit évoluer.
- **Coût/bénéfice :** 1h refacto prompt + code + tests sur 1 cas observé. Profil Expert VMA>15 + 30 sem = très rare (probable <2% users). Cumulatif : Expert + 10K Finisher + 30 sem = configuration improbable.
- **Risque dette tech :** Toucher safety net L673-691 = casse possible sur les Inter/Confirmés qui en bénéficient. Forte régression.
- **Bonus :** P1-7 (cap planWeeks 10K à 16) résoudrait 80% du cas floggyz en upstream sans toucher au safety net.
- **Verdict : 🔴 WONTFIX dans cette forme — résoudre via P1-7 cap planWeeks à la place**

### P1-3 Hard floor pic Trail par distance
- **User-visible ?** Possible mais aucun cas Trail signalé sous-dimensionné. C'est une généralisation "par symétrie" depuis Semi/Marathon.
- **Déjà patché live ?** Non — parce qu'aucun cas observé.
- **Vrai bug ?** Préventif pur. Aucune plainte, aucun audit Trail flagué pour pic insuffisant. On code "au cas où".
- **Coût/bénéfice :** 20 min + dette définition "Trail court/long/ultra". Zéro cas réel à protéger.
- **Risque dette tech :** Ajout de seuils arbitraires sans terrain de validation. Viole `feedback_chaque_ligne_justifiee` frontalement.
- **Verdict : 🔴 WONTFIX — pas de cas observé, pas de code**

### P1-4 Warning freq=2 Marathon
- **User-visible ?** Si user choisit freq=2 Marathon : oui. Mais quelle proportion ? Aucun cas Marathon freq=2 dans les 10+ patches mentionnés. Thomas Marathon était freq≥3.
- **Déjà patché live ?** Non, parce que cas inexistant dans le corpus.
- **Vrai bug ?** Plus un garde-fou UX qu'un bug. Doctrine `feedback_compromis_messages_preventifs` autorise les messages préventifs, mais pas de bloquer.
- **Coût/bénéfice :** 20 min UI. Touchera <1% users (freq=2 Marathon est déjà autosélectionné rarement). ROI faible.
- **Risque dette tech :** Composant warning supplémentaire dans questionnaire. Faible mais cumule.
- **Verdict : 🟡 DOWNGRADE — facile à faire mais pas urgent, à grouper avec autres warnings UX**

### P1-5 Message "très chargée en volume" inversé (Bertrand)
- **User-visible ?** OUI directement : Bertrand a lu "très chargée" sur un plan 5 km/séance = absurde, perte confiance immédiate. Wording exposé dans message feasibility = front-line UX.
- **Déjà patché live ?** Bertrand patché. Mais condition `freq≤3 && planWeeks>16` se redéclenchera sur N futurs cas.
- **Vrai bug ?** OUI clair : logique de condition incomplète (regarde freq+durée mais pas volume). Fix conceptuel propre.
- **Coût/bénéfice :** 10 min code + test. Probabilité re-survenue : élevée (freq=3 + plan long = combo fréquent).
- **Risque dette tech :** 1 condition `&& kmParSeance >= 10` + reformulation wording. Faible.
- **Verdict : 🟢 KEEP — à grouper avec P0-1/P0-2 sprint demain. Très petit, vrai bug, exposé front-line.**

### P1-6 Cap planWeeks par objectif (floggyz 30 sem 10K)
- **User-visible ?** OUI : floggyz a un plan 30 sem pour un 10K Finisher = absurde et démotivant. Affiché dans le calendrier dès l'ouverture du plan.
- **Déjà patché live ?** floggyz oui. Pattern reproductible : tout user qui met une date cible >6 mois pour 10K/5K.
- **Vrai bug ?** OUI doctrinal : durée plan doit être cohérente avec objectif. Pas une coquetterie.
- **Coût/bénéfice :** 15 min code + tests. Bonus : résout 80% du cas floggyz P1-2 sans toucher au safety net. Double gain.
- **Risque dette tech :** Un objet `maxWeeksByGoal` constant. Très propre, facilement extensible. 5 lignes.
- **Verdict : 🟢 KEEP — petit fix, gros impact, sprint demain. Bonus résout indirectement P1-2.**

### P2-3 UX modal confirmation chrono format
- **User-visible ?** Edge case : user qui tape "39h20" pour 10K. Quelle proportion ? Signalé une fois par Romane elle-même, pas par user externe.
- **Déjà patché live ?** N/A — c'est upstream questionnaire.
- **Vrai bug ?** Non, c'est une feature UX. Le système actuel parse, ne bloque pas, marche.
- **Coût/bénéfice :** 1h composant React + tests pour un edge case auto-détecté en interne.
- **Risque dette tech :** Nouveau composant modal pour 1 cas. Sur-ingénierie pure.
- **Verdict : 🔴 WONTFIX — vraie réponse = améliorer placeholder input "ex: 50:30 ou 1:25:00", 2 min**

---

## Synthèse finale

### Sprint demain matin (KEEP — 3 items, ~1h cumulé)
1. **P0-1** handleRecalculateVMA save feasibility — 20 min
2. **P1-5** Message "très chargée en volume" inversé — 15 min
3. **P0-2** Doublon Strava activityId — 30 min
4. **P1-6** Cap planWeeks par objectif — 20 min (bonus: résout P1-2)

(P1-6 reclassé KEEP même s'il est numéroté P1 : 15 min, gros impact, résout floggyz upstream)

### Reportés (DOWNGRADE — 4 items, à revoir dans 1 mois)
- **P0-3** D+ Trail branche secondaire — attendre 3e cas
- **P1-1** Smoothing ×1.15 — hard floor Semi protège déjà, attendre données
- **P1-4** Warning freq=2 Marathon — grouper avec autres UX warnings
- (Réserve de capacité non utilisée)

### Abandonnés (WONTFIX — 3 items)
- **P1-2** Expert phase fondamental refacto — résolu indirectement par P1-6 cap planWeeks
- **P1-3** Hard floor pic Trail — préventif sans cas réel, viole `feedback_chaque_ligne_justifiee`
- **P2-3** Modal confirmation chrono — sur-ingénierie, fix = améliorer placeholder

---

## Économie estimée

- **Effort gagné** en évitant WONTFIX : ~2h30 (P1-2 1h + P1-3 20min + P2-3 1h + tests)
- **Effort gagné** en reportant DOWNGRADE : ~2h15 (P0-3 45min + P1-1 1h + P1-4 20min)
- **Total économisé demain matin :** ~4h45 sur 7h backlog initial
- **Dette tech évitée :** ~80-120 lignes de code conditionnel/heuristique non justifiées par cas observés

## Doctrines mobilisées
- `feedback_chaque_ligne_justifiee` → tue P1-3 (zéro cas Trail observé)
- `feedback_pas_de_micro_expert` → tue P1-2 (refacto safety net pour 1 cas Expert improbable)
- `feedback_compromis_messages_preventifs` → soutient P1-4 mais ne le rend pas urgent
- `feedback_qualite_avant_vitesse` → impose de NE PAS toucher smoothing P1-1 sans 3 cas validés
