# Verdict PM senior — Sprint E élargi APPROFONDI
Date : 2026-05-23
PM senior 12 ans, expertise SaaS B2C critique (santé / fitness / finance)
Contexte : 13 bugs identifiés, Phase 1 (5 P0) en code background, double-vérif PM avant Phase 2/3 + patches live

---

## Verdict global business

**GO Sprint E Phase 1 en cours → Phase 2 conditionnelle → Phase 3 reportée + scope réduit. ARRÊT patches live sur 5/6 plans.**

Le sujet n'est pas "tout faire", c'est de **ne pas créer une dette défensive** qui rend le code intuable. Trois bugs portent 80% du risque réputationnel (1+2 vélo, 8 VMA astronaute, 7 welcome déconnecté). Les autres relèvent du polish ou du Trail-niche.

---

## Mission 1 — Tableau priorisation business

| # | Bug | Impact user | Fréquence | Visibility | ROI fix | Priorité PM |
|---|---|---|---|---|---|---|
| 1+2 | Vélo banni + allure cross-training | **Crédibilité morte** : doctrine "que course" trahie. User voit "Vélo récup à 5:30/km" → screenshot + désabo | ~5-10 % plans (gating cassé sur BMI<30, donc tous les profils Marathon/Semi/Trail sains) | Immédiate (S1 visible en preview) | 30 min code, x100 effet brand | **P0 critique** |
| 7+12 | WelcomeMessage déconnecté feasibility | User IRRÉALISTE lit "tu vas y arriver" → on **vend du faux espoir**. Casse doctrine sécurité>conversion | ~15-20 % plans (tout statut ≠ FAISABLE) | Immédiate (1er écran) | 1h30 code, doctrine pure | **P0 critique** |
| 8 | VMA astronaute (parseTargetTime "54h25" + 623 km/h) | Encadré jaune ridiculise le produit. User screenshote, partage en mode "regardez l'IA débile" | Edge case (~1-2 % inputs ambigus) MAIS **viralité négative** disproportionnée | Immédiate (preview) | 2h code, anti-humiliation | **P0 critique** |
| 10 | Distance hallucinée LLM | Plan affiche "10 km à 5:00/km" alors qu'aurait dû être "8 km". Casse cohérence allure/distance/objectif | ~5 % plans (rare mais quand ça arrive, séance entière fausse) | Visible en cours (user qui pratique) | 1-2h (post-process validator) | **P0** |
| 11 | recoveryFactor petits volumes | Récup mal calibrée pour cv<10 → S2 surchargée vs S1 douce | ~10 % plans (vrais débutants cv<10) | Cours de plan (semaine 2-3) | 1h code (clamp) | **P1 (rétrogradé)** |
| 3 | SL placée en J1 (Lundi) | UX décevante : SL censée être week-end ou jour custom. User Trail confus. | ~5 % plans (LLM trail libre dans nommage) | Immédiate (planning visible) | 45 min code + 1h tests | **P1** |
| 4 | Pic volume insuffisant Trail Ultra | Plan Ultra 126 km avec pic 63 km = sous-préparation. **Risque physique réel** (Olivier-like) | Niche (<2 % users = Trail Ultra), MAIS critique sur ces cas (DNF, blessure) | Cours de plan + course | 30 min code + revue Coach FFA | **P1** |
| 6 | Hallucination géo spots | User à Vannes voit "Spot Kerpape" (1h30 de route). Casse confiance locale | ~30-40 % plans Trail (LLM invente) | Cours de plan (semaine où le user veut s'y rendre) | 1h kill-switch / 4h whitelist | **P1** |
| 5 | Allures S1 monotones | 5 footings tous à 9:33 sur petite VMA = ennui. Pas safety, juste polish | ~50 % S1 (toutes les petites VMA) | Cours de plan (S1) | 1h30 code | **P2 vrai polish** |
| 9 | Pic adaptatif vs distance race | Marathon 42 km avec pic 30 km = sous-calibré pour certains profils | Couplé Bug 4 (même mécanique) | Cours de plan | Inclus dans Bug 4 | **P2 (fold dans #4)** |
| 13 | Pic stagnant phase dev/spé (4 blocs identiques) | Périodisation plate = pas d'effet entraînement | À chiffrer (audit à faire) | Cours de plan | Inconnu | **P1 sous condition audit** |
| 14 | Inputs user mal validés en amont | Cause racine de #8 et autres. Validation `targetTime` / `vma` / `pb` faible | ~5 % users (saisie ambiguë) | Immédiate | 1h validation form-side | **P0 (couplé #8)** |

**Synthèse priorisation PM** : 4 vrais P0 (1+2, 7+12, 8+14, 10) — 4 P1 (3, 4, 6, 11, 13) — 2 P2 reportés/foldés (5, 9).

**Glissements vs le plan initial** :
- Bug 11 → P1 (pas P0, freq faible et visible mid-plan)
- Bug 14 → P0 (cause racine de Bug 8, à fixer en amont sinon on patche le symptôme)
- Bug 9 → fold dans #4 (même problème de calibrage pic vs distance, pas un bug indépendant)
- Bug 13 → conditionnel : doit être audité (combien de plans réellement plats ?) avant de coder

---

## Mission 2 — Risque vs effort par phase

### Phase 1 (P0 transversaux — 5 bugs en background)

**Risque régression** : MOYEN. Trois fix touchent le pipeline central (`buildSafetyInstructions`, `calculateFeasibility`, `parseTargetTime`). Le `VALIDATION-10-PROFILS-TRAIL-ULTRA.md` ne couvre PAS les fix de Phase 1 (validation Sprint A/B/C/D antérieurs).

**Gain user** : MAXIMAL. Ces 5 bugs concentrent l'impact réputationnel (vélo + VMA astronaute + welcome déconnecté = les 3 captures d'écran qui circulent sur Twitter coach).

**Verdict PM** : **GO PHASE 1 avec exigence ferme** : avant deploy, batterie 10 profils variés (5 sains + 5 cas-bugs) tournée sur le vrai code (`feedback_validation_n_profils_avant_sprint`). Le 100 % vert Vitest est non-négociable.

### Phase 2 (Trail — bugs 3, 4, 6)

**Risque régression** : MOYEN (touche `enforceSLDay`, `minPeakVolume`, prompt locationSuggestion). Le bug 4 nécessite revue Coach FFA 20 ans (valeurs floors à valider sur référentiel UTMB Academy).

**Gain user** : MOYEN-FAIBLE en volume (Trail Ultra = <2 % users), MAIS HAUT en gravité sur les cas concernés (Olivier 126 km mal préparé = blessure ou DNF). C'est un fix de **sécurité physique** sur une niche, pas un fix UX large.

**Verdict PM** : **GO Phase 2 mais reporter Bug 6 (spots) en kill-switch Option A**. La whitelist Option C (4h) est sur-engineering pour un bug crédibilité non-safety. Désactiver l'output `locationSuggestion` sur Trail jusqu'à V2 = ROI immédiat.

### Phase 3 (raffinement — bugs 5, 9, 11, 13)

**Risque régression** : FAIBLE (footingVariants isolé, recoveryFactor isolé), MAIS Bug 13 nécessite audit (combien de plans réellement impactés ?).

**Gain user** : POLISH. Bug 5 = ennui visuel (pas safety). Bug 9 = doublon Bug 4. Bug 11 = niche débutants.

**Verdict PM** : **REPORTER Phase 3 de 2 semaines** post-Sprint E. Raisons :
1. Bug 5 (allures variées) = sur-spécificité prête à déraper. Le LLM peut très bien produire des allures variées avec un meilleur prompt, sans coder une mécanique de `PaceModulation` qui ajoute de la dette.
2. Bug 9 = à folder dans Bug 4 (Phase 2), pas un sprint indépendant.
3. Bug 11 = OK à coder mais sans urgence.
4. Bug 13 = à AUDITER d'abord (combien de plans plats sur 100 ? Si <5 %, c'est P2 réel ; si >20 %, ça remonte P0).

**Risque Phase 3 si on la fait quand même** : empilement de garde-fous qui complexifie le code → exactement la dette défensive contre laquelle Romane alerte.

---

## Mission 3 — Patches live ROI

Doctrine `feedback_patch_live_plans_jour_seulement` : seuls les plans du jour patchables. `feedback_jamais_contact_client` : patch silencieux uniquement.

| # | Plan | Statut | Verdict patch | Justification |
|---|---|---|---|---|
| 1 | Christopher Semi 1h45 | Déjà patché 22/05 | **STOP — ne pas re-patcher** | Plan déjà touché. Re-patch = risque d'incohérence S1 vécue. Si bug résiduel → laisser tel quel, fix code futur protège les suivants. |
| 2 | al1.kasongo Marathon 3h30 J-42 | Plan en cours, J-42 | **NE PAS PATCHER** | Doctrine claire : plan généré avant aujourd'hui = pas toucher. J-42 = S1 vécue depuis longtemps. Casse l'entraînement en cours. |
| 3 | Charlotte Marathon 4h15 J-121 | Plan en cours, J-121 | **NE PAS PATCHER** | Idem. J-121 = early plan, mais S1 démarrée. Doctrine non-négociable. |
| 4 | Ambre Painvin Semi 2h30 | Déjà patché 22/05 | **STOP** | Idem Christopher. |
| 5 | 1778921428769 (test) | Compte test, patché ce matin | **OK si test interne uniquement** | Pas de user réel impacté. Validation tool, pas patch business. |
| 6 | Olivier 126 km Trail Ultra | Patché ce matin | **STOP — observer** | Patch en cours, attendre retour. Re-patch = bruit. |

**Verdict global patches live** : **arrêt total des patches live sur ces 6 plans**. 5 sont déjà patchés ou intouchables. 1 est un compte test. **Effort 30 min/plan × 6 = 3h investies pour 0 user notifié (doctrine jamais_contact_client) = ROI négatif**.

**Stratégie alternative** : laisser le fix code Sprint E protéger TOUS les futurs plans. C'est le levier scalable. Les 6 plans listés sont des bug reports historiques, pas une priorité d'action.

**Exception possible** : si un user PRESENT (mail, support) se plaint d'un plan généré ce jour-même, patch case-by-case discrétion Romane. Pas de patch préventif sans signal user.

---

## Mission 4 — Qualité globale vs sur-spécificité

### Analyse honnête : Sprint E élargi protège-t-il ?

**OUI sur Phase 1** : les 5 bugs P0 sont des **causes racines transversales** (gating cassé Bug 1, parser ambigu Bug 8, instruction LLM faible Bug 7). Les fix sont localisés (10-50 lignes par bug) et impactent un point unique du pipeline → faible surface de régression.

**RISQUE sur Phase 2** : Bug 4 (pic Trail Ultra) ajoute des `if/else` par niveau×distance dans `calculatePeriodizationPlan`. C'est exactement le pattern "cascade de garde-fous" que Romane redoute. Mitigation : extraire un objet `MIN_PEAK_VOLUME_TRAIL` (cf. recommandation dev L290), pas des conditionnelles en cascade.

**RISQUE majeur sur Phase 3** : Bug 5 (allures variées) propose d'introduire un type `PaceModulation` avec 3 variantes. C'est de la **micro-expertise** au sens `feedback_pas_de_micro_expert`. Le LLM doit produire ce résultat par prompt, pas par mécanique code.

### Les fix Sprint E dégradent-ils les profils sains ?

D'après `VALIDATION-10-PROFILS-TRAIL-ULTRA.md` : aucune régression Sprint A/B/C/D sur Trail/Ultra. **Mais cette validation ne couvre PAS Phase 1 Sprint E** (qui n'a pas encore tourné les tests).

**Exigence PM avant deploy Phase 1** :
1. Faire tourner les 10 profils Trail/Ultra existants en anti-régression
2. Ajouter 5 profils nouveaux qui ciblent les bugs Sprint E (Olivier-like cross-training, Semi user "2:24", Marathon BMI<30 freq3, Débutant cv<10, Trail libre nommage SL)
3. Documenter dans `VALIDATION-15-PROFILS-SPRINT-E.md`
4. 0 régression = condition de deploy

### Code défensif = dette ?

**OUI partiellement**. Bug 11 (recoveryFactor clamp petits volumes) et Bug 13 (pic stagnant) sont des "patches sur patches" si on n'audite pas avant. Sans data sur fréquence réelle de Bug 13, coder un fix = ajouter de la complexité pour un problème mal cerné. **Auditer d'abord, coder ensuite**.

---

## Mission 5 — Communication user

### Faut-il un message public "on a amélioré X, Y, Z" ?

**NON, pas maintenant**. Raisons PM :

1. **Doctrine `feedback_jamais_contact_client`** : Romane gère la comm, pas Claude / pas le produit automatisé. Pas de notif in-app.

2. **Risque communication** : annoncer "on a fixé un bug VMA astronaute" = aveu public que le produit avait un bug grave. C'est légitime quand on a une base user fidèle qui a vu le bug, mais sur Coach Running IA (early stage, growth phase), c'est un risque réputationnel net positif d'annoncer rien et de laisser le produit s'améliorer silencieusement.

3. **Exception** : si un user impacté écrit à Romane, réponse personnalisée. Pas de communication batch.

### Mettre en pause les inscriptions le temps de Sprint E ?

**NON. Challenge fort mais verdict net** : Sprint E Phase 1 est en code background → quelques heures à 1 jour de prod. Couper l'inscription = perte de revenu + mauvais signal "le produit est cassé". Les bugs ne sont pas catastrophiques (pas de perte de données, pas de risque de blessure systématique — sauf Trail Ultra niche).

**Action préventive** : si un user récent (J-2 max) a un plan avec VMA astronaute ou Vélo, Romane peut le contacter pour proposer une régénération post-fix. **Action manuelle Romane uniquement, jamais automatique**.

### Stratégie de communication post-Sprint E

**Court terme (post-deploy)** :
- Mettre à jour le changelog interne (markdown projet)
- Pas de publication user-facing

**Moyen terme (après 2 semaines avec 0 incident remonté)** :
- Article blog/newsletter "Comment on calibre vos plans" = positionnement expertise, sans aveu de bug. Mentionne ACWR Gabbett, doctrine que course, anti-VMA astronaute (sous angle "on protège votre input").

**Risque à anticiper** : si un user post-bug Sprint E (Olivier ?) écrit publiquement (Twitter, Trustpilot), Romane prépare un template de réponse honnête transparent (cohérent doctrine `feedback_securite_avant_conversion`).

---

## Mission 6 — Métriques succès Sprint E

### Métriques techniques (objectives, automatisables)

- **0 régression Vitest** sur la batterie 15 profils (10 trail/ultra existants + 5 nouveaux Sprint E)
- **0 occurrence du pattern `Vélo|natation|cyclisme|elliptique`** dans plans générés post-deploy (script grep quotidien sur 100 derniers plans)
- **0 vmaNeeded > 30 km/h** dans les feasibility post-deploy (log warning)
- **welcomeMessage IRRÉALISTE contient au moins 1 marqueur** "PAS"/"alternative"/"ne te permettra pas" — vérifié par regex sur 50 plans IRRÉALISTE

### Métriques user (à observer 4 semaines)

- **Taux de régénération de plans** (proxy "user pas satisfait") : baseline actuelle vs post-Sprint E. Cible : baisse de 10-20 %.
- **Taux de plaintes Romane (mail, Insta DM, support)** : tracker manuellement, comparer 14 jours pré/post.
- **NPS spontané** : trop tôt pour stat sig, mais tracking commencé.

### Métriques business (à observer 8 semaines)

- **Taux conversion preview → Premium** : si stable ou up, Sprint E n'a pas dégradé ; si down, investiguer (le welcome plus dur peut dissuader).
- **Churn Premium** : si stable ou down, fix réussi ; up = problème.
- **Reviews Trustpilot/Insta** : tracker mentions "bug", "Vélo", "irréaliste".

### Métriques qualité globale produit (qualitative, audit Romane)

- **Cohérence doctrine sur 20 plans aléatoires post-deploy** : audit manuel Romane sur 1h, grille de 10 critères doctrine (que course, anti-poids, anti-VMA astronaute, welcome cohérent, etc.)
- **Taux de plans avec confidenceScore > 90 sur targetTime ambitieux** : devrait baisser (Sprint A/B avait déjà entamé) — confirmer baisse continue

**Gate de succès Sprint E** : 0 régression + 0 occurrence vélo + 0 vmaNeeded aberrant + audit Romane 20 plans satisfait = succès. Si un de ces 4 fail → rollback partiel.

---

## Décision PM finale

### GO / NO-GO

**GO Sprint E Phase 1 (P0)** — avec exigence validation 15 profils avant deploy.
**GO Sprint E Phase 2 (Trail) restreinte** — Bug 3 + Bug 4. Bug 6 → kill-switch Option A uniquement.
**REPORT Sprint E Phase 3 (P2 raffinement)** — sauf Bug 11 si effort < 1h. Bug 5, 9, 13 reportés post-audit data.
**STOP patches live 5/6 plans** — laisser le fix code protéger les futurs.

### Ordre des phases (chronologique)

1. **J0 (aujourd'hui)** : finir Phase 1 background. Lancer validation 15 profils. Audit Bug 13 (combien de plans plats sur dernier mois).
2. **J0-J1** : revue Romane des résultats validation + audit Bug 13. Si 0 régression → deploy Phase 1.
3. **J1-J2** : Phase 2 Bug 3 + Bug 4 (avec revue Coach FFA sur valeurs floors). Bug 6 kill-switch en parallèle.
4. **J3-J4** : Bug 11 si vite fait + monitoring Sprint E (logs, métriques techniques).
5. **J5+** : observation 2 semaines, métriques user. Phase 3 reconsidérée selon data.

### Garde-fous PM non-négociables

1. **`feedback_validation_n_profils_avant_sprint`** : 15 profils variés avant chaque phase deploy
2. **`feedback_chaque_ligne_justifiee`** : chaque if/else ajouté doit avoir un commentaire justifiant son existence et son scope
3. **`feedback_pas_de_micro_expert`** : refuser Bug 5 si la solution introduit un type `PaceModulation` complexe → reformuler côté prompt LLM
4. **`feedback_patch_live_plans_jour_seulement`** : aucun patch sur plan généré avant aujourd'hui sans signal user explicite
5. **`feedback_jamais_contact_client`** : aucun message user automatique post-Sprint E

### Risques résiduels à monitorer

- **Sur-spécificité Trail Ultra** : Bug 4 valeurs floors calibrées sur 1 cas (Olivier). Risque que d'autres profils Trail Ultra (cv haute, freq haute) soient pénalisés. Mitigation : 5 profils Trail Ultra variés dans batterie validation.
- **Welcome ton ferme dégrade conversion** : Bug 7 force "PAS atteignable" sur IRRÉALISTE. Risque que user se désengage de la preview. Mitigation : tracker taux conversion 4 semaines, rollback si baisse > 20 %.
- **Bug 14 (validation inputs)** : si on patche seulement parser côté `parseTargetTime` sans validation form-side, on traite le symptôme. Recommandation : ajouter validation Zod ou native sur le formulaire (`targetTime` doit matcher `\d+h\d{2}` ou refusé).

---

## TL;DR exécutif Romane

1. **GO Phase 1** (5 P0) avec validation 15 profils obligatoire avant deploy
2. **GO Phase 2 light** : Trail Bug 3 + 4, mais Bug 6 en kill-switch (pas whitelist 4h)
3. **REPORT Phase 3** sauf Bug 11 ; auditer Bug 13 avant de coder
4. **STOP patches live** : 5/6 plans intouchables (doctrine + déjà patchés) ; le fix code Sprint E est le levier scalable
5. **0 communication user** automatique ; Romane gère case-by-case si remontée
6. **Métriques succès** : 0 régression + 0 occurrence vélo + 0 VMA aberrante + audit 20 plans Romane satisfait

**Le vrai risque n'est pas de ne pas tout fixer, c'est de tout fixer en empilant des garde-fous qui maintiennent la dette défensive et complexifient le code à moyen terme.**
