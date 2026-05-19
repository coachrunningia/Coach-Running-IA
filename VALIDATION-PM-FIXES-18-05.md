# Validation PM senior — 8 fixes audit 18/05
Date: 2026-05-18 | Reviewer: PM senior CRIA (15 ans expé, historique complet)

## Synthèse exec

- ✅ GO : **3/8** (A1, A3, A4)
- ⚠️ GO avec ajustement : **2/8** (A2, B1)
- ❌ CHALLENGE : **0/8**
- ⏸️ DIFFÉRER : **3/8** (A5, B2, B3 — déjà actés "no-op", à reconfirmer)

**Recommandation globale** :
1. **Sprint 1 (immédiat)** — Apply A1 + A3 + A4 en un seul commit + deploy (risque très faible, gain immédiat sur tous les futurs plans). Ce trio résout les 3 patterns qui ont fait partir georgeslor1.
2. **Sprint 2 (J+1 à J+3)** — Apply A2 après tests multi-profils. C'est le seul fix qui touche structurellement la calibration plan : refactor + 8-10 simulations avant deploy.
3. **Sprint 3 (J+1, parallèle)** — Décision B1 case-by-case sur les 11 plans Premium actifs, **arbitrée selon raceDate**. Romain (5 sem) = patch live obligatoire. Lucie/Manon (18-21 sem) = patch live opportun. Les 7 autres = arbitrage volume/temps.
4. **B2 + B3 + A5** sont des non-actions correctement justifiées — confirmer le statu quo.

**Doctrine clé respectée par tous les fixes** : aucun ne contredit `feedback_jamais_baisser_allure_cible`, `feedback_input_client_obligatoire`, `feedback_jamais_poids_minceur`, `feedback_jamais_contact_client`. Tous renforcent `feedback_securite_avant_conversion`.

---

## Détail par fix

### Fix A1 — `geminiService.ts:2666` cap `maxVolume × 0.65` écrase floor 100%

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0
**Risque conversion** : 0 (gain conversion attendu sur Confirmé/Expert)
**Risque rétention** : 0 (n'affecte que les futurs plans, pas l'existant)
**Risque support** : 0

**Justification PM** : C'est LE fix racine du désabonnement georgeslor1 et du pattern observé sur 8/8 plans S1 audités (Antoine -12 km, Armando -12 km, Annabelle -6 km, Alan -4 km, Valentine -4 km). La doctrine "respecter currentWeeklyVolume user" est explicitement actée (`feedback_input_client_obligatoire`). Tant que ce cap reste, n'importe quel Expert/Confirmé qui rentre dans le funnel voit S1 < current et part. Le commit `26b3d3a` (floor à 100% L2655) est neutralisé par L2666 pour exactement la typologie qu'on cherchait à protéger — **bug logique au sens strict**, pas un trade-off. L'historique des cleanups R-A→R-L et J2/J3 a constamment privilégié les garde-fous cohérents avec les inputs user. Aucun risque produit identifiable.

**Si ajustement** : préférer la **variante explicite** sur la variante "retirer le cap". L'ancienne ligne existait probablement pour éviter qu'un user qui sur-déclare son volume (ex: 100 km saisis alors qu'il en court 40) fasse exploser le pic. Garder cette intention via :
```ts
const peakCap = maxVolume * 0.65;
startVolume = Math.min(
  startVolume,
  volumeCap,
  Math.max(peakCap, currentVolumeFloor) // never under user-declared floor
);
```
Cette forme **documente l'intention** (cf. `feedback_chaque_ligne_justifiee` : on garde l'ancien garde-fou mais on le subordonne au floor user). Plus simple à relire dans 6 mois.

**Test unitaire obligatoire avant deploy** :
- `currentVolume=80, maxVolume=105, peakWeek=7` → assert `startVolume ≥ 80` (cas Antoine)
- `currentVolume=80, maxVolume=90` → assert `startVolume ≥ 80` (cas Armando)
- `currentVolume=12, maxVolume=14, débutant` → assert `startVolume ≥ 12` (cas Aurore — vérifier qu'on ne casse pas le minStartVolume débutant)
- `currentVolume=5, maxVolume=9, BMI 40` → assert `startVolume ≥ 5` (cas Sébastien — vérifier qu'on ne pousse pas un débutant fragile au-dessus)

---

### Fix A2 — Clamp SL pic par objectif

**Verdict PM** : ⚠️ **GO avec ajustement**
**Risque doctrine** : faible
**Risque conversion** : faible (corrige Antoine/Armando qui voient SL projetée trop longue = peur ; corrige Alan/Sébastien qui voient SL trop courte = doute crédibilité)
**Risque rétention** : moyen — touche la calibration plan, donc tout user actif qui re-clique "Générer plan complet" verra une SL pic différente. Risque de plainte "le plan a changé".
**Risque support** : faible

**Justification PM** : Le diagnostic est juste (cas Armando : SL pic 40 km pour préparer un semi 21 km = aberrant pédagogiquement ; cas Sébastien : SL pic 4.5 km pour finir 10 km = juste-juste). Mais c'est le seul fix qui modifie la **logique de structure plan** vs les 4 autres qui modifient des prompts ou des garde-fous chiffrés isolés. Cela impose un niveau de test plus élevé. La doctrine "compromis > extrêmes" (`feedback_compromis_messages_preventifs`) plaide pour le clamping plutôt que pour laisser dériver.

**Si ajustement** :
1. **Ne pas baisser `weeklyVolumes[picWeek]` pour clamper la SL**. C'est un effet de bord dangereux : baisser le pic km pour préserver SL max va impacter charge totale, structure des deloads, affûtage. Préférer **clamper directement la valeur SL générée** au moment où le code construit la séance SL pic. Le volume hebdo pic reste, la SL est juste plafonnée, le différentiel passe en footings/séances qualité.
2. **Doctrine Hyrox = course seulement** (`project_coach_running_ia_hyrox_scope`) : ajouter `Hyrox` dans la table de clamps (SL max ~10-12 km côté course).
3. **Doctrine Trail** : `0.8 × distance` est OK pour trails courts (20-35 km), mais sur trail long (50-80 km) c'est irréaliste de courir 40-64 km en SL. Plafonner Trail à **min(0.8 × distance, 35 km)** ou **min(0.7 × distance, 40 km)** — calibrer avec l'historique R2/R3 des 5 releases trail.
4. **Floor minimum SL pic** : pour le cas Sébastien (10k pic 4.5 km), définir un floor (ex: 7 km pour 10k, 16 km pour semi, 28 km pour marathon). Sans floor, le fix corrige le "trop long" mais pas le "trop court".
5. **Tests obligatoires multi-profils** avant deploy : 5k/10k/semi/marathon/trail × débutant/inter/conf/expert = 20 simulations minimum. Vérifier qu'aucune SL générée ne sort de l'enveloppe `[floor, max]`.

**Communication** : déployer A2 **après A1**, en commit séparé. Si on déploie les deux ensemble et qu'un user se plaint, on ne saura pas lequel a causé l'effet.

---

### Fix A3 — Prompt welcome : exiger mention PB si Finisher+PB

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0
**Risque conversion** : faible positif (individualisation perçue = +trust)
**Risque rétention** : 0
**Risque support** : 0

**Justification PM** : Sébastien post-patch (welcome citant "ton dernier 10 km en 1h30, allure 9:00/km → entraînement à 9:30/km") est cité dans l'audit comme **référence**. C'est un pattern qui transforme un welcome "tout-terrain" en welcome "fait pour moi". Coût d'implémentation = 5 lignes de prompt. Pas de risque code (instruction Gemini). Aligné avec doctrine `feedback_finisher_plus_pb_allure` déjà actée.

**Si ajustement** : ajouter une **clause de fallback** dans le prompt : si Gemini ne dispose pas du PB formaté (ex: champ vide ou bug), ne PAS halluciner — préférer une phrase générique. Doctrine `feedback_securite_avant_conversion` > individualisation forcée. Format suggéré dans le prompt :
```
Si recentRaceTimes.distance{X} EST FOURNI (non null/vide) :
  Inclure la phrase "Sur ton dernier {X} tu as fait {temps} ({pace}/km) —
  ton plan vise une allure d'entraînement à {alluteCalc}/km, légèrement
  plus douce pour t'entraîner sans risque."
Sinon : ne PAS inventer de PB, passer cette section.
```

---

### Fix A4 — Prompt welcome : citer blessure significative

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 (renforce `feedback_securite_avant_conversion`)
**Risque conversion** : faible positif
**Risque rétention** : 0
**Risque support** : faible négatif — un user qui voit sa blessure citée pourra écrire à Romane pour préciser le diagnostic. Mais c'est positif (engagement), pas négatif.

**Justification PM** : Justine (algodystrophie cheville) est l'exemple type : la blessure est dans `safetyWarning` mais absente du `welcomeMessage`. Pour un user qui a pris la peine de remplir le champ blessure, ne pas le citer dans le message principal = signal "l'app ne m'a pas lu". Le fix est exactement aligné avec la doctrine "sécurité > conversion" et `feedback_compromis_messages_preventifs` (message préventif plutôt que blocage).

**Si ajustement** :
1. **Liste de mots-clés "significatif"** à formaliser dans le prompt pour éviter de faire un drama d'une "petite gêne au mollet de temps en temps" :
   - **Significatif** (mention obligatoire + recommandation kiné/médecin) : algodystrophie, fracture, opération, rupture, tendinite chronique, hernie, syndrome rotulien, périostite, fasciite plantaire
   - **Mineur** (mention possible mais ton léger) : courbature persistante, gêne ponctuelle, raideur
2. **Préciser le ton** dans le prompt : "citer la blessure factuellement, sans dramatiser, sans promesse de guérison, en recommandant validation médicale". Cf. doctrine `feedback_jamais_poids_minceur` qui a montré qu'un prompt non cadré dérive vers du commercial ou du moralisateur.
3. **Garder safetyWarning séparé** (ne pas faire de doublon). Le welcome reconnaît, le safetyWarning détaille.

---

### Fix A5 — Étendre Finisher+PB au Trail

**Verdict PM** : ⏸️ **DIFFÉRER** (= confirmer le statu quo "pas d'action")
**Risque doctrine** : 0
**Risque conversion** : 0
**Risque rétention** : 0
**Risque support** : 0

**Justification PM** : La synthèse propose elle-même "laisser tel quel" et c'est la bonne décision. L'argument est solide : un trail 20 km / 800 D+ n'est pas comparable à un trail 35 km / 1200 D+ — la comparaison PB → allure n'a pas de sens en trail. Tenter l'extension forcerait à introduire un schéma complexe (`recentTrailRaces` avec distance + D+ + type terrain) pour un gain marginal, et risquerait d'embarquer des allures faussées (ce qui contredirait `feedback_jamais_baisser_allure_cible`).

**Condition de re-évaluation** : si dans 3-6 mois on observe ≥10 désabonnements/plaintes de users trail Finisher avec PB déclarable, alors investiguer un schéma léger genre "type effort similaire" (catégorie trail court/moyen/long), pas un PB chiffré.

**À acter en mémoire** : ajouter une note "PB trail non utilisé pour calcul allure — distances trop hétérogènes pour comparaison fiable" pour ne pas re-débattre dans 2 semaines.

---

### Fix B1 — 11 plans Premium ACTIFS à régénérer

**Verdict PM** : ⚠️ **GO avec ajustement** (arbitrage case-by-case obligatoire — voir section "Décision B1 détaillée")
**Risque doctrine** : faible (modifier un plan déjà acheté est délicat, mais doctrine `feedback_securite_avant_conversion` prime — un plan sous-dimensionné = mensonge implicite)
**Risque conversion** : 0 (users déjà payants)
**Risque rétention** : **moyen à élevé** — un plan modifié sans préavis peut perturber les users qui ont déjà commencé. Risque réel de support et de plaintes.
**Risque support** : **élevé** — si un user constate que son plan a changé, il écrira à Romane. Or doctrine `feedback_jamais_contact_client` interdit la pré-notification.

**Justification PM** : C'est la décision la plus lourde du lot. Le cas **Romain (5k, 25/06, dans 5 semaines, ratio 63%)** est urgent : il a payé pour préparer un 5k dans 5 semaines et son plan démarre à 63% de son volume — c'est exactement le profil georgeslor1 qui a déjà claqué la porte. À l'inverse, **un user Trail à 18 semaines de course (Manon, Lucie)** peut accepter un patch progressif sans s'en rendre compte (les semaines déjà entamées restent identiques, ajustement futur). Le coût "ne rien faire" = 11 désabonnements potentiels. Le coût "régénérer tout" = 11 plaintes potentielles à Romane + perturbation de ceux déjà engagés.

**Si ajustement (RECOMMANDÉ)** : **Option B1.b — patch live `weeklyVolumes` uniquement** (pas régénération complète). Avantages :
- Préserve la structure des séances (un user qui a fait sa S1 garde son historique)
- Modifie uniquement les volumes hebdo futurs (S courante + suivantes)
- Pas de nouveau welcomeMessage généré, donc pas de signal "ton plan a changé"
- Pas de re-call Gemini = pas de risque hallucination
- Coût technique faible (1 script `.mjs` paramétrable, ~50 lignes)

**Règles à appliquer pour le patch live** :
1. **Ne JAMAIS toucher la semaine en cours** (calculée depuis `planStartDate` + semaine actuelle). Le user doit terminer sa semaine entamée à l'ancienne.
2. **Recalculer `weeklyVolumes[currentWeek+1 .. end]`** avec floor 100% currentVolume + progression cohérente avec la phase déjà en cours.
3. **Préserver `weeklyVolumes[picWeek]`** si déjà cohérent. Ne re-calculer que ce qui doit l'être.
4. **Logger chaque patch dans Firestore** (champ `patches: [{date, reason, before, after}]`) pour traçabilité.
5. **Aucune notification user**. Romane décide quoi communiquer.

**Si CHALLENGE** : si Romane n'est pas confortable avec l'idée de modifier 11 plans live sans préavis, alternative = **B1.c (laisser tel quel) sauf pour Romain** (course 25/06, 5 semaines, ratio 63% = situation type georgeslor1 reproduite). Le coût de NE PAS patcher Romain est trop élevé.

---

### Fix B2 — 17 plans Premium previews actifs

**Verdict PM** : ⏸️ **DIFFÉRER** (= confirmer statu quo "self-fix au prochain clic")
**Risque doctrine** : 0
**Risque conversion** : faible — un user qui ouvre la preview verra encore S1 baissée jusqu'à ce qu'il clique "Générer le plan complet". Si A1 est déployé, le clic fixera tout.
**Risque rétention** : 0 (preview = pas encore engagé pleinement)
**Risque support** : 0

**Justification PM** : La logique self-fix est correcte, **à condition impérative que A1 soit déployé AVANT**. Sinon le clic "Générer plan complet" reproduirait exactement le bug. C'est donc une **dépendance** à respecter dans l'ordre de déploiement : A1 (deploy) → puis B2 (no-op).

**À surveiller** : parmi les 17 previews, georgeslor1 est listé (ratio 89%, course 18/10). Son cas est différent : il a déjà été patché manuellement dans la session (feasibility BON→AMBITIEUX + welcomeMessage transparent). Donc B2 ne s'applique PAS à georgeslor1, et c'est correct. Vérifier que le script B2 (si jamais on en fait un) exclut explicitement les plans déjà patchés manuellement aujourd'hui (cf. C — fixes déjà appliqués).

**Condition de re-évaluation** : monitorer le taux de clic "Générer plan complet" sur ces 17 previews dans les 7 jours. Si <50% cliquent, l'auto-fix n'a aucun effet et il faut considérer un patch live actif. Si ≥80% cliquent, statu quo confirmé.

---

### Fix B3 — 8 plans nouveaux du 18/05

**Verdict PM** : ⏸️ **DIFFÉRER** (= confirmer décision déjà prise par Romane)
**Risque doctrine** : 0 (décision actée par la fondatrice)
**Risque conversion** : 0
**Risque rétention** : faible — ces 8 users ont leur S1 baissée mais la S2/S3 remonte mécaniquement au current selon l'audit (sauf bug structural). Le coup dur est passé, plus rien à corriger côté plan.
**Risque support** : 0

**Justification PM** : Romane a explicitement décidé "tant pis ils ont déjà commencé pour leur semaine 1 on laisse tel quel". C'est cohérent avec :
- `feedback_input_client_obligatoire` (les inputs sont respectés, juste la traduction en volume initial est imparfaite)
- `feedback_jamais_contact_client` (pas de message qui dirait "on a modifié ton plan")
- Le principe `feedback_compromis_messages_preventifs` (compromis = laisser la S1 telle quelle, fixer pour les suivants)

L'audit a confirmé que 7/8 ont un welcome conforme, 5/8 ont des structures pic/déloads/affûtage correctes, et le seul vrai gros enjeu (Alan trail 35k SL pic insuffisante) ne se corrige pas par patch S1 mais par régénération complète — disproportionné à 5 jours après inscription.

**Cas Antoine** : patch déjà appliqué aujourd'hui (2h60→3h00). Son plan est désormais cohérent. RAS.

**À surveiller** : si l'un des 8 (Aurore, Justine, Alan, Sébastien, Armando, Annabelle, Valentine — Antoine déjà patché) se désabonne dans les 7 jours, alerte = revoir la doctrine "laisser tel quel pour S1 baissée".

---

## Décision B1 détaillée (11 plans Premium actifs)

Arbitrage par plan, ordonné par **urgence (raceDate proche → loin)** et **gravité (ratio S1 bas)**.

| # | Client | Race date | Sem restantes | Ratio S1 | Niveau / Goal | Vol curr | Vol S1 | Décision PM | Justification |
|---|--------|-----------|---------------|----------|---------------|----------|--------|-------------|---------------|
| 2 | **Romain** | 2026-06-25 | **5 sem 🔴** | **63%** | Confirmé / 5k | 35 | 22 | **PATCH LIVE B1.b OBLIGATOIRE** | Cas type georgeslor1 : course très proche, ratio catastrophique. Tout retard = abandon probable. Recalibrer weeklyVolumes S2-S5 sur floor 100% (≥35 km/sem). |
| 6 | **Cyril** | 2026-06-13 | **4 sem 🔴** | 85% | Confirmé / Trail | 40 | 34 | **PATCH LIVE B1.b** | Course imminente, ratio léger mais le user est déjà en plein dedans. Recalibrer S2-S4 sur floor 100% (≥40 km/sem). |
| 5 | emmanuel.tellier | 2026-08-15 | 13 sem | 84% | Confirmé / 10k | 25 | 21 | **PATCH LIVE B1.b** | Délai correct mais le ratio reste sous le seuil acceptable. Patch invisible côté user (juste vol futur recalibré). |
| 9 | **Charles** | 2026-06-28 | **6 sem 🔴** | 87% | Confirmé / 10k | 30 | 26 | **PATCH LIVE B1.b** | Course proche, ratio léger mais l'écart cumulé sur 6 sem est handicapant. |
| 10 | **Cyrienne** | 2026-06-27 | **6 sem 🔴** | 90% | Inter / 10k | 10 | 9 | **LAISSER TEL QUEL** | Ratio limite OK, vol absolu très bas (1 km de delta), profil Intermédiaire 10 km/sem = faible enjeu de progression brute. Patcher ferait gagner 1 km/sem = bruit. |
| 7 | **Mouhammad** | 2026-07-10 | 8 sem | 85% | Expert / 10k | 88 | 75 | **PATCH LIVE B1.b** | Expert = exigent. Ratio 85% sur 88 km current = -13 km absolu, énorme. Cas susceptibilité élevée. |
| 11 | Admin programme | 2026-07-15 | 8 sem | 90% | Confirmé / Trail | 42 | 38 | **LAISSER TEL QUEL** | Compte Romane elle-même. Pas un user payant à risque. |
| 1 | **Lucie** | 2026-09-27 | 18 sem | **60%** | Confirmé / Semi | 40 | 24 | **PATCH LIVE B1.b** | Ratio très bas (60%, -16 km absolu) sur Confirmé Semi. Même si délai long, la S1 actuelle (24 km) est sous le vol current de 40 km, c'est démotivant. Délai long = patch sans pression. |
| 4 | **Amelie** | 2026-10-03 | 19 sem | 83% | Confirmé / Trail | 40 | 33 | **PATCH LIVE B1.b** | Profil similaire Confirmé Trail 40 km current, écart -7 km. Patch léger, gain net. |
| 8 | **Julien** | 2026-09-20 | 18 sem | 87% | Confirmé / Trail | 30 | 26 | **LAISSER TEL QUEL** | Ratio limite OK, vol absolu correct (4 km delta), 18 sem = la progression naturelle S2-S5 va combler. |
| 3 | **Manon** | 2026-10-16 | 21 sem | **72%** | Confirmé / Trail | 25 | 18 | **PATCH LIVE B1.b** | Ratio bas (72%, -7 km absolu sur 25), 21 sem permet patch tranquille. |

**Récap décision B1** :
- **7 plans à patcher live (B1.b)** : Romain, Cyril, emmanuel.tellier, Charles, Mouhammad, Lucie, Amelie, Manon — recalibrer `weeklyVolumes` depuis semaine suivante uniquement
- **3 plans à laisser tel quel** : Cyrienne (delta négligeable), Admin (Romane), Julien (ratio acceptable)
- **1 cas absolument prioritaire** : **Romain** (5 sem, 63%) — si on ne fait qu'une chose dans B1, c'est lui

**Méthode d'application proposée à coordonner avec Romane** :
1. Apply A1 + deploy
2. Vérifier que les nouveaux plans générés post-A1 ont bien S1 ≥ current (1-2 test users)
3. Lancer script `patch-live-b1.mjs` ciblé sur les 7 plans confirmés, **après accord explicite Romane sur la liste finale**
4. Logger chaque patch dans Firestore avec audit trail
5. Romane décide indépendamment de toute communication client (doctrine)

**Doctrine à respecter pendant le patch** :
- `feedback_input_client_obligatoire` : ne JAMAIS écraser une allure ou date saisie user
- `feedback_jamais_baisser_allure_cible` : les paces restent
- `feedback_chaque_ligne_justifiee` : commenter dans le script chaque modification
- `feedback_jamais_contact_client` : zéro mail/notif déclenché côté code
- `feedback_compromis_messages_preventifs` : patch minimal (weeklyVolumes seulement)

---

## Risques transverses identifiés

### Risque #1 — Ordre de déploiement
A1 doit impérativement être déployé AVANT toute action B1/B2. Sinon les patches live recalibreraient avec le code buggé et reproduiraient le problème. **Séquence obligatoire** : A1 (code + test) → deploy prod → vérif sur 1-2 plans tests → A3 + A4 (commit suivant) → script B1 → B2 self-fix → A2 (plus tard, après tests).

### Risque #2 — Doctrine "jamais contact client" en tension avec B1
Patcher 7 plans live sans préavis = irréprochable du point de vue technique (les volumes augmentent, c'est positif), mais un user attentif peut détecter. **Mitigation** : Romane prépare un éventuel mail générique "amélioration continue du calibrage volume" qu'elle déclencherait UNIQUEMENT si un user demande. Pas de mail spontané.

### Risque #3 — Effet "plan qui change" perçu négativement
Même sur des deltas positifs (vol qui remonte = bonne nouvelle pédagogiquement), un user en plein cycle peut voir ça comme de l'instabilité. **Mitigation** : ne JAMAIS toucher la semaine en cours, ne toucher que les semaines futures. Garder structure séances inchangée.

### Risque #4 — A2 trop ambitieux pour Sprint 1
La tentation d'ajouter A2 au même commit que A1 doit être combattue. A2 touche la calibration plan globale, c'est un fix architectural. Le déployer après tests dédiés.

### Risque #5 — Auto-fix B2 non-monitoré
Les 17 previews "self-fixent" au prochain clic. Si seuls 5 cliquent, 12 users restent avec une preview baissée et peuvent claquer la porte comme georgeslor1. **Mitigation** : monitorer le taux de clic "Générer plan complet" sur ces 17 cohortes pendant 7 jours.

### Risque #6 — Pas de doctrine pour "score absent dans schéma" (pattern #2 audit)
6/8 plans audités ont `feasibility.score = undefined`. Le commit `26b3d3a` corrige ça, mais aucun fix dans la liste A/B ne couvre la **rétro-application** sur les 6 plans audités. Décision implicite = laisser tel quel (cohérent avec décision B3). À confirmer.

### Risque #7 — Faux positifs regex audit "velo"
3/8 welcome flaggés "velo" sont des faux positifs (substring `développement`). **Aucun fix code prod**, mais améliorer les scripts d'audit pour éviter de générer des faux signaux qui pollueraient les prochains audits. À traiter en parallèle (P3 dans patches audit), pas dans Sprint 1 prod.

---

## Doctrine à acter en mémoire (nouveaux apprentissages)

1. **PB Trail non comparable** — Ne JAMAIS étendre la règle Finisher+PB au Trail. Distances/D+ trop hétérogènes. Mémo `feedback_pb_trail_non_comparable` à créer si pas déjà fait.

2. **Patch live plan = `weeklyVolumes` uniquement** — Modifier la structure séances ou le welcomeMessage d'un plan déjà payé = signal "plan instable" pour le user. Préférer patch volume futur (= invisible). Mémo `feedback_patch_live_volumes_only`.

3. **Ne JAMAIS toucher la semaine en cours** — Un user qui a déjà commencé sa S(N) doit la terminer à l'identique. Patch live affecte uniquement S(N+1)..S(end). Mémo `feedback_patch_jamais_semaine_en_cours`.

4. **Order matter : code fix avant data fix** — Toujours déployer le fix code (A1) avant de lancer des scripts data (B1). Sinon les patches data reproduisent le bug. Mémo `feedback_ordre_deploy_code_avant_data`.

5. **Welcome doit citer ce que le user a déclaré** — PB, blessure, volume, D+ — ce sont les inputs principaux. Welcome qui ne les cite pas = signal "tu n'as pas été lu". Renforce `feedback_input_client_obligatoire` côté UI. Mémo `feedback_welcome_cite_inputs_user`.

6. **Clamps SL pic par objectif = pédagogie** — La SL pic doit être proportionnée à la distance de course (jamais > 80% de la distance pour route, jamais < floor pédagogique). Mémo `project_coach_running_ia_sl_pic_clamps`.

7. **Pour profils ambitieux (cible >>PB), feasibility doit utiliser le PB réel** — Le bug racine georgeslor1 (status BON sur cible -30 min vs PB) montre que `recentRaceTimes.distance{X}` doit pondérer le score, pas juste la VMA théorique. À ajouter à la feuille de route après A1/A2/B1. Mémo `project_coach_running_ia_feasibility_use_pb`.

---

## Plan d'action chronologique recommandé

**J0 (aujourd'hui)** :
- Apply A1 (avec ajustement = forme explicite Math.max(peakCap, currentVolumeFloor))
- Ecrire 4 tests unitaires (Antoine, Armando, Aurore, Sébastien profils)
- Apply A3 + A4 (prompts)
- Commit unique, deploy prod
- Vérifier sur 1-2 plans test post-deploy que S1 ≥ current

**J+1** :
- Préparer script `patch-live-b1.mjs` (7 plans confirmés)
- Validation explicite Romane sur la liste finale
- Lancer le script avec audit trail Firestore
- Monitorer pour 24h

**J+2 à J+3** :
- Préparer A2 avec tests multi-profils (20 simulations min.)
- Apply A2 + deploy après validation
- Monitorer pendant 48h

**J+7** :
- Vérifier taux de clic "Générer plan complet" sur les 17 previews B2
- Si <50% → considérer patch live actif
- Vérifier qu'aucun des 8 plans B3 n'a généré de désabonnement
- Vérifier qu'aucun des 7 plans B1 patchés n'a généré de ticket support

**J+14** :
- Acter les 7 nouveaux mémos doctrine identifiés
- Lancer audit batch équivalent à celui du 18/05 pour vérifier qu'aucun nouveau plan ne reproduit la baisse S1

---

## Fin de validation PM

Document produit en lecture seule. Aucune modification code/Firestore. À valider par Romane avant exécution.
