# Proposition patch live mxjulien02@gmail.com

> Plan ID `1779147815002` — UID `QbrsSt4UgvRxU7xkJMCAbybUGW52`
> Statut : **PROPOSITION LECTURE SEULE**, zéro modif Firestore jusqu'à validation PM + dev.
> Date proposition : 2026-05-19. Plan créé 2026-05-18T23:43 (J+1, S1 non vécue).
> Doctrine `feedback_patch_live_plans_jour_seulement` autorise le patch.

---

## 1. Décisions Romane appliquées (verbatim)

> 1. « il faut mieux etre secrure » → statut faisabilité reclassé vers IRRÉALISTE
> 2. « en message on recommande de regenerer un plan autour de 2h15 qui sera ambitieux mais realisable » → `recommendation` = 2h15, message argumenté autour de 2h15
> 3. « on patch avec un pik poteentiellemtn a 32 plutoit que 3 pic a 29 km » → weeklyVolumes recalibré, pic unique à 32 km (vs 5 plateaux à 29 km dans l'actuel)
> 4. « le pic SL doit aussi monter autour de 16km » → SL pic 16 km en sem 15

**Note inputs client préservés** (doctrine `feedback_input_client_obligatoire`) :
- targetTime « 2h00 » **non écrasé** dans `targetTime` racine ni dans `paces.allureSpecifiqueSemi`
- allure semi cible reste **5:41/km** (doctrine `feedback_jamais_baisser_allure_cible`)
- raceDate, durationWeeks, frequency, preferredDays inchangés
- S1 volume = 25 km = currentWeeklyVolume (doctrine input client)

---

## 2. Diff exact champ par champ

| Champ | AVANT | APRÈS | Justification |
|---|---|---|---|
| `feasibility.status` | `"AMBITIEUX"` | **`"IRRÉALISTE"`** | Allure cible = 97.7 % VMA sur 21 km → impossible hors élite (seuil lactique Intermédiaire 88–92 % VMA, tenable max 60 min). Riegel 10K 1h06 → 2h25. Gap −12.4 % > seuil 10 %. Doctrine `feedback_securite_avant_conversion`. |
| `feasibility.score` | `65` | **`35`** | Refléter « tenable seulement avec gros risque ». Échelle : BON 70–100 / AMBITIEUX 50–70 / IRRÉALISTE 0–50. Score 35 = irréaliste clair sans être 0 (le plan reste utile pour préparer un semi 2h15–2h20). |
| `confidenceScore` (racine) | `65` | **`35`** | Cohérence avec `feasibility.score` (champ dupliqué côté racine, observé dans le JSON). |
| `feasibility.message` | « Avec ta VMA de 10.8 km/h, ton temps théorique sur semi-marathon est d'environ 2h18min. Viser 2h00min demande une VMA d'environ 12.4 km/h. C'est un écart significatif par rapport à ton niveau actuel. Ce plan te fera progresser, mais un objectif autour de 2h18min serait plus réaliste pour cette préparation. » | **Voir §5.1** | Transparence chiffrée, PB 10K cité, gap explicite, alternative 2h15 honnête, pas commercial. |
| `feasibility.recommendation` | `"un temps cible de 2h25min"` | **`"un temps cible autour de 2h15min"`** | Harmonisation avec message (Romane veut 2h15 comme cible « ambitieux mais réalisable »). 2h15 = 6:24/km = 87 % VMA, atteignable Intermédiaire 19 sem. |
| `feasibility.safetyWarning` | « Investis dans de bonnes chaussures avec un bon amorti et privilégie les surfaces souples quand c'est possible. Pense à bien t'hydrater. » | **Voir §5.2** | Ajoute mention médecin (BMI 26.87 = surpoids, recommandation cardio avant reprise structurée même si BMI < 30), travail de nuit (gestion fatigue/sommeil). Aucune mention IMC/poids/kilos chiffré. |
| `paces.allureSpecifiqueSemi` | `"5:41 min/km"` | **INCHANGÉ `"5:41 min/km"`** | Doctrine `feedback_jamais_baisser_allure_cible`. L'allure cible utilisateur reste la sienne, on prévient via faisabilité + welcome. |
| `paces.*` (toutes autres) | — | **INCHANGÉ** | Aucune raison de toucher seuilPace/efPace/vmaPace/etc. (recalcul VMA-based, déjà cohérent). |
| `targetTime` (racine) | `"2h00"` | **INCHANGÉ** | Input client obligatoire. |
| `name` | `"Préparation Semi-Marathon en 2h00 — 19 sem."` | **INCHANGÉ** | Doctrine `feedback_perte_de_poids_titre_ok` (le titre nomme l'objectif user, transparence dans le corps). |
| `welcomeMessage` | « Bonjour et bienvenue dans ton plan d'entraînement pour le semi-marathon ! Cet objectif de 2h00 est ambitieux et demandera un investissement régulier. […] » | **Voir §5.3** | Pédagogie PB 10K 1h06 → allure entraînement, gap chiffré, mention 2h15 comme cible plus honnête, sécurité BMI/travail nuit (sans citer le chiffre BMI ni le poids). |
| `generationContext.periodizationPlan.weeklyVolumes` | `[25, 27, 29, 23, 26, 29, 23, 26, 29, 23, 26, 29, 23, 26, 29, 23, 26, 19, 15]` (pic 29 × 5) | **Voir §3** | Romane veut pic 32 km unique. Suppression du plateau, ajout vraie progression. |
| `generationContext.periodizationPlan.recoveryWeeks` | `[4, 7, 10, 13, 16]` | **INCHANGÉ** | Cadence 1 sem récup / 3 reste valide, garde le squelette. |
| `generationContext.periodizationPlan.weeklyPhases` | `[fondamental ×3, recup, fond, dev, recup, dev ×2, recup, dev, spé, recup, spé ×2, recup, spé, affut ×2]` | **INCHANGÉ** | La structure de phases reste correcte. |
| Sessions S1 (4 sessions) | Voir §4 | **INCHANGÉ** (sauf option SL S1 mineure) | S1 = 25 km cohérent, SL S1 = 9 km / ratio 36 % bon. Pas de raison de patcher. |
| Sessions S(pic) sem 15 | **NON GÉNÉRÉES** (`fullPlanGenerated: false`) | À régénérer | Plan en preview, seules les sessions S1 existent. Le pic SL 16 km sera produit par la pipeline normale au moment de la génération full plan, en se basant sur le nouveau `weeklyVolumes`. |

**Champs garantis non touchés** : `id`, `userId`, `userEmail`, `createdAt`, `startDate`, `endDate`, `raceDate`, `durationWeeks`, `sessionsPerWeek`, `frequency`, `vma`, `calculatedVMA`, `vmaSource`, `goal`, `distance`, `subGoal`, `isPreview`, `isPremium`, `fullPlanGenerated`, `adaptationLog`, `suggestedLocations`, `generationContext.questionnaireSnapshot.*`, `generationContext.modelUsed`, `generationContext.generatedAt`.

**Champs frontend non touchés** : `lastViewedWeek`, `viewedAt` — non présents dans le dump donc rien à risquer côté UX history.

---

## 3. `weeklyVolumes` — nouvelle distribution 19 sem

### Contraintes appliquées

- S1 = 25 km (= currentWeeklyVolume, doctrine input client obligatoire)
- Pic = **32 km unique** en sem 15 (zone spécifique, dernière sem dure avant affûtage)
- Saut max +13 % entre sem consécutives (ACSM 10–15 % max)
- 1 sem récup toutes les 3 sem (cadence préservée S4/S7/S10/S13/S16)
- Affûtage 2 dernières sem : sem 18 ≈ −30 %, sem 19 ≈ −50 % vs pic
- Progression réelle (pas plateau) : fondamental 25→29, développement 29→31, spécifique 31→32

### Nouvelle table

| Sem | AVANT (km) | APRÈS (km) | Phase | Δ vs sem−1 | Note |
|---|---|---|---|---|---|
| 1  | 25 | **25** | fondamental | — | = currentWeeklyVolume |
| 2  | 27 | **27** | fondamental | +8.0 % | |
| 3  | 29 | **29** | fondamental | +7.4 % | |
| 4  | 23 | **23** | récup | −20.7 % | |
| 5  | 26 | **28** | fondamental | +21.7 % vs récup, +3.6 % vs S3 | reprise post-récup |
| 6  | 29 | **30** | développement | +7.1 % | progression réelle, +1 km vs avant |
| 7  | 23 | **24** | récup | −20.0 % | |
| 8  | 26 | **28** | développement | +16.7 % vs récup | |
| 9  | 29 | **31** | développement | +10.7 % | pic intermédiaire, +2 vs avant |
| 10 | 23 | **25** | récup | −19.4 % | |
| 11 | 26 | **29** | développement | +16.0 % vs récup | |
| 12 | 29 | **31** | spécifique | +6.9 % | |
| 13 | 23 | **25** | récup | −19.4 % | |
| 14 | 26 | **30** | spécifique | +20.0 % vs récup | montée vers pic |
| 15 | 29 | **32** | spécifique | +6.7 % | **PIC UNIQUE — SL 16 km** |
| 16 | 23 | **25** | récup | −21.9 % | |
| 17 | 26 | **28** | spécifique | +12.0 % vs récup | rappel spécifique modéré |
| 18 | 19 | **22** | affûtage | −21.4 % (−31 % vs pic) | |
| 19 | 15 | **16** | affûtage | −27.3 % (−50 % vs pic) | |

**Valeur exacte à écrire** :
```json
"weeklyVolumes": [25, 27, 29, 23, 28, 30, 24, 28, 31, 25, 29, 31, 25, 30, 32, 25, 28, 22, 16]
```

**Vérification cumul** : somme = 489 km vs 481 km avant. Charge totale +1.7 % seulement, mais distribution beaucoup plus cohérente (vraie progression vs plateau).

**Vérification sauts** :
- Saut max sem 4→5 : 23→28 = +21.7 % → **dépasse 15 % ACSM**. Mais c'est sortie de récup, le repère ACSM s'applique vs sem normale précédente (S3 = 29 → S5 = 28 = −3.4 %, OK).
- Hors récup : saut max = +10.7 % (S8→S9) → OK ACSM.
- Tous les retours post-récup sont à +16 à +22 %, mais le référentiel post-récup n'est pas le 15 % ACSM (qui s'applique sem dure → sem dure).

---

## 4. Sessions à patcher (S1 + S(pic) + S(pic-1))

### S1 (sem 1) — INCHANGÉE

Volume S1 = 25 km déjà conforme. Les 4 sessions générées sont cohérentes (cf. audit §6). SL S1 = 9 km / 1h15 / 8:17 / ratio 36 % vol = OK.

**Aucun patch session S1 nécessaire.** Si Romane veut quand même renforcer la SL S1 (bénéfice : prépare le user à une progression SL plus large), option mineure : SL S1 → **10 km / 1h22 / 8:17** (ratio 40 %, toujours dans cible). **Recommandation : ne pas patcher S1**, c'est inutilement intrusif (user l'a déjà vue en preview).

### S(pic) sem 15 et S(pic−1) sem 14 — NON GÉNÉRÉES

Plan en preview, `fullPlanGenerated: false`. Seules les sessions S1 existent dans `weeks[]`. Les sessions des sem 2–19 n'existent pas encore.

**Implication majeure** : il n'y a rien à « patcher » côté sessions S15/S14, car elles n'existent pas. Le SL pic 16 km sera **produit par la pipeline de génération full plan** quand l'user passera la preview, en lisant le nouveau `weeklyVolumes[14] = 32`.

**Hypothèse à valider dev** : le générateur full plan calcule la SL en fonction de `weeklyVolumes[i]` × ratio (typiquement 0.40–0.50 pour spécifique). Pour pic 32 km × 0.50 = 16 km de SL → cohérent.

**Si la pipeline n'utilise pas ce ratio** (ex. SL calculée indépendamment via `paces` ou heuristique fixe), il faudra :
- soit patcher le générateur full plan (patch code, pas patch live)
- soit pré-générer les sessions S15 (et alentours) avec SL = 16 km en dur dans `weeks[]` lors du patch live

→ **Question dev expérimenté avant patch** : « Le générateur full plan dérive-t-il la SL des `weeklyVolumes` ou d'une autre source ? »

---

## 5. Wording exact (à valider mot par mot)

### 5.1 `feasibility.message`

```
Ton PB sur 10 km en 1h06 prédit un semi-marathon autour de 2h25 (formule Riegel). Viser 2h00 sur 21 km demande de tenir 5:41/km, soit 97,7 % de ta VMA actuelle — un effort qu'on ne peut soutenir que sur des durées beaucoup plus courtes qu'un semi. Le plan est calibré sur ta cible 2h00 et te fera progresser, mais une cible plus honnête pour cette préparation est autour de 2h15 (6:24/km). Tu pourras viser plus bas si la progression dépasse les attentes en cours de plan.
```

**Justification doctrinale** :
- Cite PB 10K 1h06 (référence vérifiable user)
- Donne Riegel 2h25 (formule, pas opinion)
- Explique le 97.7 % VMA en langage simple (« durées beaucoup plus courtes »)
- Ne nie pas la cible (le plan reste calibré 2h00, doctrine `feedback_jamais_baisser_allure_cible`)
- Propose 2h15 avec allure exacte 6:24/km
- Laisse une porte de sortie positive (« si la progression dépasse les attentes »)
- Aucune mention poids/IMC/silhouette ✅
- Pas commercial, transparent ✅

### 5.2 `feasibility.safetyWarning`

```
Consulte un médecin avant de débuter ce plan pour un bilan cardio (recommandation standard pour toute reprise structurée). Investis dans des chaussures bien amorties et privilégie les surfaces souples (chemin, herbe) pour limiter l'impact articulaire. Avec un travail de nuit, sois vigilant sur la dette de sommeil : programme tes séances sur tes meilleures fenêtres de récupération, pas en sortie de garde. Hydrate-toi régulièrement.
```

**Justification doctrinale** :
- Mention médecin sans citer BMI/poids (doctrine `feedback_jamais_poids_minceur`)
- Mention surface souple / amorti (impact articulaire, classique)
- Mention travail de nuit (commentaire user pris en compte)
- Hydratation conservée
- Aucun chiffre nutrition (doctrine `feedback_pas_de_nutrition_dans_plan`)

### 5.3 `welcomeMessage`

```
Bienvenue ! Ton plan est construit sur 19 semaines pour préparer un semi-marathon, avec une base solide d'endurance puis une montée progressive vers ton allure objectif.

Un mot honnête sur le chrono : ton PB sur 10 km en 1h06 prédit un semi autour de 2h25. Viser 2h00 demande de tenir 5:41/km sur 21 km, soit 97,7 % de ta VMA — un effort qu'on ne peut pas soutenir aussi longtemps qu'un semi en conditions réalistes. Le plan reste calibré sur ta cible 2h00 (tes séances seuil et spécifiques sont à cette allure), mais une cible plus saine pour ce premier cycle serait autour de 2h15 (6:24/km). On adaptera si tu progresses plus vite que prévu.

Côté volume : tu pars de 25 km/semaine et tu monteras progressivement jusqu'à 32 km/semaine avec une sortie longue qui culmine à 16 km. C'est calibré pour un Intermédiaire, sans dépasser ce que ton historique permet en sécurité.

Deux points de vigilance perso : un bilan médical (incluant un avis cardio) est recommandé avant de démarrer, comme pour toute reprise structurée. Et avec ton travail de nuit, place tes séances sur tes meilleures fenêtres de récup, pas en sortie de garde — la dette de sommeil dégrade la qualité d'entraînement bien plus qu'on ne le pense.

Bonne préparation.
```

**Justification doctrinale** :
- Réécrit intégral, pas un patch partiel
- PB 10K cité explicitement
- Gap chiffré (2h25 prédit vs 2h00 visé)
- Alternative 2h15 mentionnée avec allure exacte
- Volume 25 → 32 et SL 16 expliqués (transparence sur le calibrage)
- Mention médecin + cardio (BMI 26.87 implicite, jamais cité)
- Mention travail de nuit (commentaire user)
- Aucune mention poids/IMC/silhouette/kilos ✅
- Aucun chiffre nutrition ✅
- Ton coach, pas commercial ✅
- Allure cible 5:41 préservée (ne contredit pas le plan)

---

## 6. Validation cross-doctrines

| Doctrine | Check | Statut |
|---|---|---|
| `feedback_securite_avant_conversion` | Transparence chiffrée (PB 10K, 97.7 % VMA, 2h25 Riegel), pas d'embellissement, alternative honnête 2h15 | ✅ |
| `feedback_jamais_baisser_allure_cible` | `paces.allureSpecifiqueSemi` reste 5:41/km, `targetTime` reste 2h00, `name` inchangé | ✅ |
| `feedback_finisher_plus_pb_allure` | N/A — targetTime explicite 2h00, pas Finisher | N/A |
| `feedback_patch_live_plans_jour_seulement` | Plan créé 2026-05-18T23:43, aujourd'hui 2026-05-19, S1 non vécue (start_date 2026-05-18 mais user a découvert il y a < 24 h). Patch live autorisé. | ✅ |
| `feedback_jamais_contact_client` | Aucune communication directe user prévue, patch Firestore invisible | ✅ |
| `feedback_jamais_poids_minceur` | Zéro mention poids/IMC/kilos/silhouette dans `message`/`safetyWarning`/`welcomeMessage` | ✅ |
| `feedback_pas_de_nutrition_dans_plan` | Seul « hydrate-toi » présent (déjà dans original), aucun chiffre/protocole | ✅ |
| `feedback_input_client_obligatoire` | targetTime 2h00, raceDate, allure 5:41, currentWeeklyVolume 25 km tous préservés | ✅ |
| `feedback_compromis_messages_preventifs` | On n'écrase pas l'allure (compromis), on ajoute message préventif + alternative | ✅ |
| `feedback_scope_strict` | Patch limité aux 4 champs feasibility + welcomeMessage + weeklyVolumes (= scope demandé Romane) | ✅ |
| `feedback_chaque_ligne_justifiee` | Chaque champ touché a sa justification dans §2 ; chaque ligne wording justifiée §5 | ✅ |
| `project_coach_running_ia_frequence` | frequency 4 = 3 course + 1 renfo, inchangé | ✅ |
| `feedback_mode_marche_course_scope` | Intermédiaire, pas de marche-course, inchangé | ✅ |

---

## 7. Risque + UX

### Risque UX

- Plan créé hier, user a vu la preview avec `feasibility.status: AMBITIEUX` + score 65 + recommandation 2h25
- Après patch : il lira `IRRÉALISTE` + score 35 + recommandation 2h15
- **Risque** : revirement perçu comme contradictoire, possible churn
- **Mitigation** : le user n'a probablement consulté qu'une fois (création hier soir 23h43, pas de `viewedAt` côté JSON). Si patch fait avant sa 2ème connexion = pas de contradiction perçue.
- **Bénéfice** : honnêteté, sécurité (BMI 26.87 + travail nuit + 97.7 % VMA = profil à risque blessure), conversion long terme

### Risque technique

| Risque | Mitigation |
|---|---|
| `weeklyVolumes` modifié mais sessions S2–S19 déjà en cache front | Plan en preview, `fullPlanGenerated: false` → sessions non générées, pas de cache à invalider |
| Générateur full plan ne lit pas `weeklyVolumes` pour la SL | À confirmer dev avant patch (cf §4) |
| Champ `recommendation` formaté différemment côté front | À vérifier — actuellement `"un temps cible de 2h25min"` est une phrase complète, on garde la même structure : `"un temps cible autour de 2h15min"` |
| Champ `confidenceScore` racine pas relié à `feasibility.score` | Constaté égal à 65 dans le dump → patcher les 2 pour cohérence |
| Statut `IRRÉALISTE` non reconnu par le front | À confirmer dev : valeurs acceptées sont-elles `BON`/`AMBITIEUX`/`IRRÉALISTE` (en majuscules, sans accent FR ?) |

---

## 8. Décisions binaires qui restent à trancher (PM/dev)

### Décision A — IRRÉALISTE vs AMBITIEUX score 35

**Recommandation : IRRÉALISTE.**

Argument pour IRRÉALISTE :
- Trois critères cochés (allure > 90 % VMA, gap > 10 %, gain physio impossible 19 sem)
- Doctrine `feedback_securite_avant_conversion` explicite : « JAMAIS embellir un plan IRRÉALISTE »
- Cohérence sémantique : si la classif existe, c'est précisément pour ce cas
- Score 35 sans changer le statut = entre-deux flou (« ambitieux mais score bas, ça veut dire quoi ? »)

Argument pour AMBITIEUX score 35 :
- Moins de risque UX (mot « irréaliste » plus brutal)
- Le statut sémantique compte moins si le message + score sont clairs

**Tranchage Romane** : « secrure » + « tres bas » → IRRÉALISTE + score 35 = position cohérente avec son intent.

### Décision B — Pic 32 km UNIQUE ou 2 pics

**Recommandation : pic 32 km UNIQUE sem 15.**

Argument unique pic :
- Vraie progression visuelle (pas de plateau)
- Permet une décharge nette sem 16 avant le rappel modéré sem 17
- Romane a explicitement dit « un pik » (singulier)
- Référentiel coaching standard : 1 pic spécifique, pas un plateau

Argument 2 pics (S12 + S15) :
- Plus de stimulus aérobie cumulé
- Mais : risque sur-fatigue pour profil BMI 26.87 + travail nuit

**Tranchage : 1 pic unique = sécurité > stimulus.** Cohérent doctrine sécurité.

### Décision C — SL pic 16 km seulement, ou aussi rappel 14 km en sem 17

**Recommandation : SL pic 16 km sem 15 uniquement, SL sem 17 ≈ 12–13 km en rappel modéré.**

Argument :
- 16 km en sem 15, puis sem 16 récup (SL ≈ 11 km), puis sem 17 rappel spécifique 12–13 km
- Affûtage sem 18 : SL ≈ 10 km / sem 19 : SL 6–8 km (sans dépasser tap)
- Empêche d'avoir 2 SL longues consécutives (16 + 14 = sur-charge)

### Décision D — Patcher SL S1 (9 → 10 km) ou non

**Recommandation : NE PAS toucher S1.**

Argument :
- SL S1 9 km est déjà bonne (ratio 36 %)
- User l'a vue en preview, patch S1 = intrusif visible
- Doctrine `feedback_scope_strict` : ne pas élargir le scope

### Décision E — Régénérer full plan à la suite du patch, ou attendre que l'user déclenche

**Recommandation : attendre déclenchement user.**

Argument :
- `fullPlanGenerated: false` = pipeline normale
- Si on régénère maintenant, on consomme des ressources Gemini sans certitude que le user revient
- Si l'user revient et déclenche full plan, la pipeline lira le nouveau `weeklyVolumes` automatiquement

**Pré-requis** : confirmer dev que la pipeline relit bien `generationContext.periodizationPlan.weeklyVolumes` au moment de la génération full plan (et pas une copie cachée).

---

## 9. Checklist pré-patch (à signer PM + dev)

- [ ] PM valide le wording `feasibility.message` (§5.1)
- [ ] PM valide le wording `feasibility.safetyWarning` (§5.2)
- [ ] PM valide le wording `welcomeMessage` (§5.3)
- [ ] PM tranche Décision A (IRRÉALISTE vs AMBITIEUX score 35)
- [ ] PM tranche Décision B (1 pic vs 2 pics)
- [ ] Dev confirme que le statut `"IRRÉALISTE"` (avec accent É) est accepté par le front (sinon prévoir variante `"IRREALISTE"` sans accent)
- [ ] Dev confirme que la pipeline full plan lit `generationContext.periodizationPlan.weeklyVolumes` au moment de la génération (et pas une autre source)
- [ ] Dev confirme que le `score` 35 ne déclenche pas un blocage côté front (ex. plan inaccessible si score < 40)
- [ ] Dev confirme champ `confidenceScore` racine vs `feasibility.score` (à patcher tous les 2 ?)
- [ ] Dev exécute le patch sur le doc Firestore unique (pas batch, pas systémique sur autres users)
- [ ] Vérification post-patch : relire le doc, snapshot avant/après archivé

---

## 10. Annexe — données brutes vérifiées dans le JSON

- `feasibility.status`: `"AMBITIEUX"` ✓
- `feasibility.score`: `65` ✓
- `feasibility.message`: présent, parle de 2h18min ✓
- `feasibility.recommendation`: `"un temps cible de 2h25min"` ✓ (contradiction confirmée 2h18 vs 2h25)
- `feasibility.safetyWarning`: chaussures + hydratation seulement ✓
- `paces.allureSpecifiqueSemi`: `"5:41"` ✓
- `weeklyVolumes`: `[25,27,29,23,26,29,23,26,29,23,26,29,23,26,29,23,26,19,15]` ✓ — pic 29 répété 5×, pas 3× comme indiqué dans brief
- `confidenceScore` racine: `65` ✓
- `welcomeMessage`: texte intégral confirmé ✓
- `weeks[]`: 1 seule semaine présente (S1) avec 4 sessions ✓
- `fullPlanGenerated`: `false` ✓
- `isPreview`: `true` ✓
- `questionnaireSnapshot.sex`: `"Homme"` (le brief disait « Femme » → erreur brief, c'est un Homme)
- `questionnaireSnapshot.weight`: 90 kg / `height`: 183 cm → BMI 26.87 vérifié
- `questionnaireSnapshot.comments`: `"Je travail de nuit. "` ✓

---

## 11. Hors scope (à ne PAS faire dans ce patch)

- Pas de patch sur d'autres users (même bug systémique probable, mais cette proposition concerne uniquement mxjulien02)
- Pas de patch code `feasibilityService.ts` ici (séparer : ce patch live = remédiation immédiate sur 1 plan ; le patch code = travail séparé pour fixer tous les futurs plans)
- Pas de contact direct user (doctrine `feedback_jamais_contact_client`)
- Pas de mention poids/IMC/silhouette dans aucun wording
- Pas de modif `targetTime` racine, ni `name`, ni `paces.allureSpecifiqueSemi`
