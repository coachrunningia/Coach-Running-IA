# Validation PM senior — 14 fixes
Date : 2026-05-19 | Reviewer : PM senior CRIA (15 ans expé)
Sources : `FIXES-CODE-PROMPT-ROADMAP.md` (905 L) + `CHALLENGE-DEV-TRAIL-14-FIXES.md` (428 L)

---

## Synthèse exec

- ✅ **GO direct** : 6/14 (#3, #4, #6, #9, #10, #11)
- ⚠️ **GO conditionnel** : 5/14 (#1, #2, #7, #12, #13)
- ❌ **CHALLENGE / découper** : 2/14 (#5, #8)
- ⏸ **DIFFÉRER** : 1/14 (#14)

**Fixes #10 + #11 sont DÉJÀ DÉPLOYÉS** (commit `40b436a`, 2026-05-18) → à retirer du périmètre actif. Verdict conservé pour mémoire et vérification post-deploy.

**Recommandation produit** : démarrer Sprint 1 (P0 #1+#2) cette semaine, Sprint 2 prompt (#3+#4+#12) dans la foulée. Sprint 3 cascade (#5/#7/#8/#9) doit obligatoirement passer par batch audit 100+ plans avant prod — c'est là que se loge le risque rétention.

---

## Détail 14 fixes

### Fix #1 — Hard cap `maxStart=1500` D+

**Verdict PM** : ⚠️ GO conditionnel
**Risque doctrine** : 0 (corrige une violation `feedback_input_client_obligatoire`)
**Risque conversion** : faible (côté positif : ultras D+ haut deviennent achetables)
**Risque rétention** : faible (impact unilatéral positif sur Trail Conf/Expert)
**Risque support** : faible

**Justification PM** : fix CORRECT sur le principe (Rich-like + tous Trail Conf/Expert current D+ > 1500 m). Mais valeur Expert 2500 trop agressive pour le 1er déploiement — retenir 2200 (challenge Dev) qui couvre Rich (current 3000 → S1 = 2200, ratio 0.73 acceptable) sans risquer surcharge sur les Confirmés qui se déclarent Expert. Le Trail court 10-30 km n'est PAS impacté (raceElevation modéré → caps level restent < raceElevation). RAS sur ce périmètre.

**Condition** : adopter valeurs challenge (600/1200/1800/2200), pas (600/1000/1800/2500). Conserver `Math.min(minStartElevation, maxStartByLevel)` autour du floor 15% (sinon cap level éclate sur race extrême — bug pointé par Dev).

---

### Fix #2 — Cap `maxWeeklyElevation` Expert (3500 → 6500 si ultra long)

**Verdict PM** : ⚠️ GO conditionnel
**Risque doctrine** : 0 (débloque doctrine UTMB 3× race, aujourd'hui mathématiquement impossible)
**Risque conversion** : faible positif (ultras 100+ premium achetables sans patch manuel)
**Risque rétention** : faible (volume estimé 5-10 plans/an, mais ultra valeur)
**Risque support** : faible (réduit besoin patch manuel Romane)

**Justification PM** : indispensable pour stopper le patch manuel systématique sur ultras alpins (cas Rich). Valeur 6500 Expert (vs 6000 rapport) alignée Bramoullé EA #87 + Balducci ch. 14. Le seuil `raceElevation >= 8000` est trop élevé — il rate UTMR (~6000-7000 D+), CCC, TDS. Seuil challenge `>= 6000 || ratio ≥ 50 m/km` plus correct.

**Condition** : (a) retenir 6500 Expert + seuil 6000/ratio 50, (b) commit COMBINÉ avec Fix #1 (même fonction `calculateWeekTargetElevation`), (c) 8 tests unitaires min couvrant Trail court (5K D+) / mid (5000) / ultra long (12000). Pas de déploiement séparé.

---

### Fix #3 — BTB ultra 100+ km (réutiliser `ULTRA70_BACK_TO_BACK_BULLETS`)

**Verdict PM** : ✅ GO direct
**Risque doctrine** : 0
**Risque conversion** : 0
**Risque rétention** : 0
**Risque support** : 0

**Justification PM** : factorisation pure prompt. Remplace 1 bullet pauvre par 6 bullets déjà testés sur la branche 70-99 km. Aberration logique corrigée (branche extrême plus pauvre que branche intermédiaire). Pas besoin de challenger. Penser à patcher AUSSI la branche `remaining` L4335 (le rapport le note, Dev confirme).

---

### Fix #4 — Sortie nuit (`ULTRA_NIGHT_RUN_BULLETS`)

**Verdict PM** : ✅ GO direct (seuil ajusté)
**Risque doctrine** : 0
**Risque conversion** : 0 (renforce crédibilité plans ultra)
**Risque rétention** : 0
**Risque support** : faible (pourrait générer des questions "j'habite en ville, comment je fais ?" — texte couvre déjà via "terrain familier")

**Justification PM** : seuil 60 km du rapport trop large (un Maxi-Race XL 60 km plat ne demande pas sortie nuit dédiée). Retenir seuil challenge **`>= 80 || (>= 60 && elev >= 4000)`** — couvre 100% des ultras qui passent réellement la nuit, exclut les trails courts/mid plats. Estim ~15-20% des plans Trail concernés.

---

### Fix #5 — `detectLevelFromData` downgrade silencieux

**Verdict PM** : ❌ CHALLENGE — découper obligatoirement
**Risque doctrine** : 0 sur le principe (Senior Marathonien classé Débutant = absurdité)
**Risque conversion** : moyen négatif tant que pas fixé (cas Georgeslor1 = désabonnement effectif)
**Risque rétention** : ÉLEVÉ si refactor signature mal testé (blast radius >10 call-sites)
**Risque support** : moyen (override silencieux = "pourquoi j'ai un plan débutant ?")

**Justification PM** : le fix est légitime mais le rapport mélange 3 changements de risques très différents :
1. Correctif âge `getChronoThresholds` (sûr, contenu).
2. `getMinLevelFromLongDistance` (logique nouvelle, à valider Coach).
3. Refactor signature `{level, reason}` (blast radius énorme — refactor structurel).

Mettre les 3 dans un même commit = risque rétention élevé sur 600+ plans existants.

**Condition (découpage obligatoire)** :
- **Sprint P1** : correctif âge SEUL (+5min 10K / +2min 5K pour H≥55, F≥50). Signature inchangée. Tests : 5 profils Senior.
- **Sprint P2** : refactor signature + `getMinLevelFromLongDistance` + exposition `levelOverrideReason`. Audit batch 600+ plans AVANT prod, tests unitaires complets, message UI "ton niveau a été ajusté" en parallèle.

---

### Fix #6 — `timeToSeconds` formats libres

**Verdict PM** : ✅ GO direct (réduit à 2 lignes)
**Risque doctrine** : 0
**Risque conversion** : 0
**Risque rétention** : 0
**Risque support** : 0 positif

**Justification PM** : le rapport est **obsolète** — le Dev a vérifié que "37min" / "58min" / format "Xh" sont DÉJÀ gérés (L44-48 / L20). Seul reste à ajouter le rejet input pollué `/\d+\s*km/` (cas Jeremy "50km (6h50)"). 2 lignes triviales, GO immédiat. Ne PAS refactorer tout le helper comme le suggère le rapport — risque casse pour zéro gain.

---

### Fix #7 — Cap `maxVolume × 0.65` écrase floor

**Verdict PM** : ⚠️ GO conditionnel
**Risque doctrine** : 0 (corrige violation `feedback_input_client_obligatoire`)
**Risque conversion** : faible (impact ~5-10% nouveaux Conf/Expert)
**Risque rétention** : ÉLEVÉ si mal testé — touche cascade centrale, retouche 2× la même fenêtre code en 7j (commit 26b3d3a était le 1er)
**Risque support** : faible

**Justification PM** : tranche entre PM précédent (≤5%, fantôme) et l'audit batch (11 actifs + 17 previews) :
**l'audit batch a raison**. 11+17 = 28 plans avec ratio S1/current < 0.85 sur batch 1156 = 2.4% mesurés, MAIS sur les seuls Conf/Expert avec current haute fenêtre, c'est ~5-10%. Le PM précédent sous-estimait parce qu'il regardait l'écart moyen (0-3 km) et pas la prévalence (28 plans c'est largement assez pour justifier le fix).

**Condition** : (a) écrire les 4 tests unitaires nommés (Antoine / Armando / Lucie-like / cas extrême) AVANT de toucher la ligne, (b) adopter la version 1-expression du challenge (plus lisible que le double min/max), (c) déployer en sprint dédié, pas avec Fix #1/#2 (pas la même fonction).

---

### Fix #8 — `sessionFactor` plafond Expert

**Verdict PM** : ❌ CHALLENGE
**Risque doctrine** : moyen (clamp brut nie le principe "freq haute = tolérance haute" Balducci ch. 6)
**Risque conversion** : faible
**Risque rétention** : moyen — un Conf Marathon Sub-3h freq 6 sous-entraîné à 85 km est un cas tangible (cf. Dev)
**Risque support** : faible

**Justification PM** : la position du rapport "clamper rigide à Expert cap" est trop sévère. Un Conf Marathon haute cylindrée freq 6 à 90 km/sem N'EST PAS aberrant. Vrai problème = double cause : (a) sessionFactor mal plafonné OU (b) user mal classé Conf au lieu d'Expert (Fix #5). Si #5 reclasse correctement, 80% des cas #8 disparaissent.

**Alternative** : adopter la version Dev/Trail `Expert cap × 1.05` (allowedMax) plutôt que cap brut. Et **fixer #5 AVANT #8** — sinon on traite le symptôme. Si après #5 le problème persiste sur > 3% des profils, alors faire #8.

---

### Fix #9 — `finisher × 0.75` modulation par ratio

**Verdict PM** : ✅ GO direct
**Risque doctrine** : 0 (compromis vs extrême, doctrine `feedback_compromis_messages_preventifs`)
**Risque conversion** : faible positif
**Risque rétention** : faible (touche Finishers ratio ≥ 0.4, ~20-30% des Finishers)
**Risque support** : 0

**Justification PM** : sur Sébastien-like (Débutant 130 kg, ratio 0.5) : oui il bascule à finisherFactor=0.80 au lieu de 0.75, mais les autres garde-fous (IMC ×0.65, vmaCap=5) COMPENSENT. Le pic Sébastien resterait ~6-7 km, patché manuellement à 9 reste justifié par Fix #5 (mauvaise classif initiale), pas par #9. Donc fix #9 ne casse PAS le premier marathon Sébastien-like.

**Recommandation supplémentaire (challenge Trail)** : ajouter palier `ratio < 0.2 → 0.70` pour vrais grands débutants. Trivial à ajouter, sécurise davantage.

---

### Fix #10 — Welcome cite PB si Finisher+PB

**Verdict PM** : ✅ GO direct (DÉJÀ DÉPLOYÉ commit `40b436a`)
**Risque doctrine** : 0
**Risque conversion** : 0 positif (individualisation perçue)
**Risque rétention** : 0
**Risque support** : faible (réduit "le plan ne m'a pas lu")

**Justification PM** : retirer du périmètre actif. Action : `git log --oneline | grep 40b436a` pour confirmer déploiement. Si confirmé, faire test régression sur 1 plan Finisher+PB pour vérifier que la clause est bien active en prod.

---

### Fix #11 — Welcome cite blessure

**Verdict PM** : ✅ GO direct (DÉJÀ DÉPLOYÉ commit `40b436a`)
**Risque doctrine** : 0 (renforce `feedback_securite_avant_conversion`)
**Risque conversion** : 0 positif (sujet sensible bien traité = trust)
**Risque rétention** : 0
**Risque support** : faible

**Justification PM** : idem #10, retirer du périmètre. Test régression cas Justine-like obligatoire post-vérif déploiement.

---

### Fix #12 — Safety + welcome ultra haute montagne Master 50+

**Verdict PM** : ⚠️ GO conditionnel
**Risque doctrine** : 0 (renforce sécurité, conforme `feedback_securite_avant_conversion`)
**Risque conversion** : faible négatif — "test cardio + ECG < 3 mois" pourrait freiner certains users si trop strict
**Risque rétention** : 0
**Risque support** : faible positif (Romane n'a plus à expliquer manuellement)

**Justification PM** : "Master" n'est PAS stigmatisant dans la communauté trail/running (terminologie officielle FFA + AIMS — c'est la catégorie d'âge, pas un jugement). Le terme "à ton âge" en revanche doit rester factuel et non culpabilisant (le texte challenge respecte cela). Ajustements challenge à retenir : (a) ECG < **6 mois** (pas 3, aligné HAS 2019, sinon barrière artificielle conversion), (b) seuil **50+** (pas 55+, aligné Tanaka).

**Condition** : adopter texte challenge intégral (+ extension prompt welcome `MASTER_55_PLUS_ULTRA_WELCOME` du challenge). Pas de mention âgiste. JAMAIS de "poids" / "minceur" / "IMC" dans le texte (vérifier — doctrine `feedback_jamais_poids_minceur`).

---

### Fix #13 — Guard `validatePeriodizationCoherence`

**Verdict PM** : ⚠️ GO conditionnel (monitoring interne seul)
**Risque doctrine** : 0
**Risque conversion** : 0
**Risque rétention** : 0
**Risque support** : 0 positif (détection précoce incohérences)

**Justification PM** : guard read-only sans impact user. Seuils rapport (1.3/0.77) trop laxistes — les utilisateurs voient l'incohérence Rich Plan 2 à ratio 1.37 mais une incohérence à 1.2 passerait inaperçue alors qu'elle reste choquante côté user. Retenir seuils challenge : **CRITICAL 1.15/0.87, WARNING 1.07/0.93**.

**Condition** : (a) sortie console + alerte interne UNIQUEMENT (jamais message UI user), (b) intégrer dans pipeline de patch + à l'ouverture du plan côté admin, (c) ajouter test snapshot Rich Plan 2 (ratio 1.37 doit déclencher CRITICAL).

---

### Fix #14 — Stripe webhook régénération full plan

**Verdict PM** : ⏸ DIFFÉRER
**Risque doctrine** : 0
**Risque conversion** : moyen — Rich en preview 24h+ post-conversion = perception "j'ai payé pour rien"
**Risque rétention** : moyen sur les Premium fraîchement convertis
**Risque support** : moyen (questions clients "j'ai payé pourquoi je ne vois pas mon plan")

**Justification PM** : critique en valeur business MAIS lourd à coder (Cloud Functions, retry, idempotency, webhook signature verify, gestion d'erreur). Quick win en attendant : **alerte monitoring `isPreview === true && tier === 'premium' > 1h`** (5 min de code Romane peut traiter manuellement). C'est ce qu'il faut faire MAINTENANT. Le trigger auto = Sprint 4 dédié quand la cascade P2 est stable.

**Condition** : déployer alerte monitoring quick win d'abord (priorité haute), Cloud Function trigger en backlog Q3 2026.

---

## Risques transverses identifiés

1. **Concentration cascade `calculatePeriodizationPlan`** : fixes #5, #7, #8, #9 touchent tous la même fonction. Risque cumul d'effets non testés. **OBLIGATION** : aucun déploiement sans batch audit 100+ plans pré-prod ET 100+ plans post-prod (vérifier régression).

2. **Fix #5 = bug racine de #8** : si on fixe #5 (Senior Marathonien reclassé inter au lieu de deb), #8 (sessionFactor cap Expert sur Conf surclassé) perd 80% de son utilité. **Faire #5 AVANT #8**, et probablement annuler #8 après mesure d'impact #5.

3. **Doctrine `feedback_chaque_ligne_justifiee`** : le rapport propose dans plusieurs fixes (notamment #7) de garder du code existant en plus du nouveau (double sécurité L2666 + L2671). Cela viole la doctrine. **Recommandation** : adopter les versions "1 expression claire" du challenge.

4. **Fix #4 sortie nuit + Fix #12 safety Master** : un user peut recevoir 2 messages "tu vas courir la nuit" (welcome + safety). Vérifier non-doublon dans QA.

5. **Aucun fix ne touche les utilisateurs existants ayant déjà un plan généré**. Tous concernent les nouveaux plans. Bonne nouvelle pour rétention — pas besoin de régénérer la base.

6. **Risque produit non couvert dans le rapport** : aucune mention de la cohérence affichage UI post-fix #1/#2 (le user a déclaré 3000 m current D+, il verra S1 = 2200 → est-ce que l'écart de -27% est expliqué dans le welcome ? À ajouter dans le sprint prompt).

---

## Reco priorisation PM

### Sprint 1 (cette semaine, 3-4h) — UNBLOCK ultra trail
- Fix #1 + #2 commit unique avec valeurs challenge (Inter 1200 / Conf 1800 / Expert 2200 maxStart ; Expert 6500 ultra long ; seuil 6000/ratio 50).
- Fix #3 (BTB ultra 100+) + Fix #6 (rejet "50km" 2 lignes) — prompts triviaux à embarquer.
- **Sortie** : Rich-like ne nécessite plus de patch manuel D+, jeremy-like n'est plus classé deb.

### Sprint 2 (cette semaine, 2-3h) — Prompt safety + perception
- Fix #4 sortie nuit (seuil 80 ou 60+4000).
- Fix #12 safety ultra Master 50+ (ECG < 6 mois pas 3).
- Vérif #10 + #11 déjà déployés (git log) + test régression.
- **Sortie** : ultras alpins ont safety dédié, plans premium ressentis comme experts.

### Sprint 3 (dans 2-3 semaines, 1-2 jours + audit batch) — Cascade level
- Fix #5a SEUL (correctif âge Senior, signature inchangée).
- Fix #9 Finisher modulation.
- Fix #7 réécriture L2666/L2671 1 expression.
- AUDIT BATCH 100+ plans pré + 100+ post déploiement.
- **Décision après mesure** : si Fix #5a règle 80% des Conf surclassés, ANNULER Fix #8.

### Sprint 4 (Q3 2026, backlog) — Structurel + infra
- Fix #5b refactor signature + `levelOverrideReason` + message UI.
- Fix #8 si nécessaire après mesure #5a (probable : non).
- Fix #13 guard cohérence (seuils 1.15/0.87).
- Fix #14 Stripe webhook (avec quick win alerte monitoring déployée AVANT).

### Hors backlog
- Aucun fix à abandonner. Aucun fix à transformer en feature.

### Risque produit majeur si rien ne bouge
- Désabonnement Trail Conf/Expert (Rich-like) sur ultras alpins faute de D+ correct = priorité business #1.
- Désabonnement Marathoniens Senior mal classés (Georgeslor1-like) = #2.
- Le reste est qualité incrémentale, important mais non critique court terme.
