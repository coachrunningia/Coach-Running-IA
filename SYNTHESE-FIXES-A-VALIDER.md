# Synthèse fixes à valider — PM + Coach
Date: 2026-05-18 | Pour décision avant action

Synthèse exhaustive des **fixes proposés** issus des audits du 18/05 (georgeslor1 désabonné + 5 plans S1 + 8 plans S1 + audit batch 1156 plans). Pour chaque fix : **contexte / problème détecté / solution proposée**.

---

## A — FIXES CODE (geminiService.ts / feasibilityService.ts)

### A1 — `geminiService.ts:2666` — Cap `maxVolume × 0.65` écrase le floor 100% (P1 CRITIQUE — résiduel après commit `26b3d3a`)

**Situation avant** :
```ts
// L2655 (déjà patché aujourd'hui)
const currentVolumeFloor = currentVolume; // 100% (avant 0.85)
startVolume = Math.max(startVolume, currentVolumeFloor);

// L2666 (NON patché)
startVolume = Math.min(startVolume, volumeCap, maxVolume * 0.65);
```

**Problème détecté** :
8/8 plans nouveaux du 18/05 ont encore S1 baisse de -13 à -20 % vs current. Cause : pour Confirmé/Expert dont `currentVolume > maxVolume × 0.65`, le `Math.min(..., maxVolume * 0.65)` écrase le floor 100% que je viens de mettre. Ex : Antoine current 80 km, peak 105 km → cap `0.65 × 105 = 68` → S1 = 68 (au lieu de 80).

**Solution proposée** :
Conditionner le cap `maxVolume × 0.65` pour qu'il **ne descende JAMAIS sous le `currentVolumeFloor`** :
```ts
// L2666 fix
const peakCap = maxVolume * 0.65;
startVolume = Math.min(
  startVolume,
  volumeCap,
  Math.max(peakCap, currentVolumeFloor) // ne jamais sous le floor
);
```
Ou plus simple : retirer `maxVolume * 0.65` du Math.min et laisser la ligne L2670 (`Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90))`) gérer.

**Effet attendu** : tous les futurs Confirmé/Expert auront S1 ≥ current. Les Débutants/Inter ne sont pas impactés (minStartVolume prime déjà).

**Risque** : faible (ajout d'un garde-fou cohérent avec la nouvelle doctrine).

---

### A2 — Clamp SL pic par objectif (P2 — important)

**Situation avant** :
Pas de clamp sur la SL pic projetée. Calculée comme `weeklyVolumes[picWeek] × 0.4-0.5`. Variabilité énorme selon le vol pic.

**Problème détecté** (audit 8 plans) :
| Client | Objectif | SL pic projetée | Référentiel | Verdict |
|---|---|---|---|---|
| Alan | Trail 35k | 12-16 km | 21-28 km | ❌ trop court |
| Sébastien | 10k | 3.6-4.5 km | 7-8 km | ❌ trop court |
| Antoine | Marathon | 36-45 km | 28-35 km | ❌ trop long (surcharge) |
| Armando | Semi | 32-40 km | 16-22 km | ❌ trop long (surcharge) |

**Solution proposée** :
Ajouter une étape post-calcul `weeklyVolumes` qui clamp la SL pic projetée selon `subGoal` :
```ts
const SL_PIC_MAX_BY_GOAL: Record<string, number> = {
  '5 km': 8,
  '10 km': 12,
  'semi-marathon': 25,
  'marathon': 35,
  // Trail : calculé dynamiquement = 80% de trailDetails.distance
};
```
Si SL pic projetée > max → ajuster `weeklyVolumes[picWeek]` à la baisse pour cibler SL pic ≤ max.

**Effet attendu** : Antoine pic 90→80 km (pour cibler SL pic ≤ 35), Armando pic 80→55 km (SL pic ≤ 22). Côté trop court : impose un floor minimal.

**Risque** : moyen — touche la calibration globale du plan, peut frustrer Expert qui veut volume haut. À tester sur multiples profils avant deploy.

---

### A3 — Prompt welcome : exiger mention PB si Finisher+PB (P4 — mineur)

**Situation avant** :
Le prompt Gemini pour `welcomeMessage` ne demande pas explicitement de citer le PB déclaré quand `targetTime === "Finisher"` et qu'un PB existe sur la distance.

**Problème détecté** :
Justine, Alan (avant patch), Valentine — leurs welcomes ne citent pas leur PB déclaré. Manqué d'individualisation perceptible. Sébastien (après patch manuel) le cite explicitement — c'est devenu la référence.

**Solution proposée** :
Enrichir la section `welcomeMessage` du prompt Gemini :
```
Si targetTime === "Finisher" ET le user a déclaré un PB sur la même distance,
le welcomeMessage DOIT contenir une phrase au format :
"Sur ton dernier {distance} tu as fait {temps} (allure {pace}/km) — ton plan
vise une allure d'entraînement à {allureCalculée}/km."
```

**Effet attendu** : individualisation systématique, sentiment "le plan me regarde vraiment".

**Risque** : nul — c'est une instruction Gemini, n'affecte pas la logique code.

---

### A4 — Prompt welcome : citer blessure significative (P5 — mineur)

**Situation avant** :
Le prompt Gemini ne demande pas de citer la blessure déclarée dans le welcomeMessage.

**Problème détecté** :
Justine a déclaré une **algodystrophie cheville** dans `injuries.description`, mais son welcomeMessage n'en parle pas. L'user voit qu'on n'a pas pris en compte sa blessure → perte confiance.

**Solution proposée** :
Enrichir prompt Gemini :
```
Si injuries.hasInjury === true ET injuries.description non vide,
le welcomeMessage DOIT contenir une phrase qui :
- Reconnaît la blessure (citer la description user)
- Explique comment le plan en tient compte (réduction intensité, séance renfo ciblée, marche autorisée, etc.)
- Recommande validation médicale si pertinent
```

**Effet attendu** : individualisation, sécurité perçue, doctrine `feedback_securite_avant_conversion`.

**Risque** : nul — instruction prompt uniquement.

---

### A5 — Doctrine "Finisher + PB" : appliquer aussi à Marathon/Semi/Trail (P3 — pour cohérence)

**Situation avant** :
Le fix `applyTargetTimeOverride` (commit `26b3d3a`) gère Finisher+PB pour 5k, 10k, semi-marathon, marathon. **Mais pas pour Trail** (pas de clé `recentRaceTimes.distanceTrail` dans le schéma).

**Problème détecté** :
Un user trail qui coche "Finisher" et a fait un trail similaire → pas de référence PB applicable.

**Solution proposée** :
Étendre `recentRaceTimes` pour inclure `distanceTrail` (avec distance variable). OU laisser tel quel car les distances trail sont trop hétérogènes (impossible de comparer un 20k/500 D+ avec un 50k/2500 D+).

**Recommandation** : **laisser tel quel** (le PB trail n'est pas comparable, pas d'enjeu). Documenter en mémoire.

**Risque** : nul (pas d'action).

---

## B — FIXES PLANS LIVE (Firestore)

### B1 — 11 plans Premium ACTIFS à régénérer (course future, ratio S1 < 0.85)

**Situation avant** :
Audit batch 1156 plans → 11 plans Premium avec :
- `fullPlanGenerated === true`
- `raceDate > 2026-05-18`
- Ratio `volS1 / currentWeeklyVolume < 0.85`

**Top 3 graves** :
| Client | Plan | Race date | Ratio S1 |
|---|---|---|---|
| **Romain** | 5k | 25/06 (5 sem) | 63% 🔴 |
| **Lucie** | Semi | 27/09 (18 sem) | 60% 🔴 |
| **Manon** | Trail | 16/10 | 72% 🔴 |

**Problème détecté** :
Ces users premium ont payé pour un plan qui démarre **sous leur volume actuel** → frustration probable, risque désabonnement (cf. georgeslor1).

**Solutions possibles** :
| Option | Description | Risque |
|---|---|---|
| **B1.a** | Régénérer les 11 plans (full plans) avec nouveau code post-fix L2666 | Moyen : recalibrage = nouveau plan, peut perturber qui a déjà commencé |
| **B1.b** | Patcher live uniquement `weeklyVolumes` (recalculer sans tout régénérer) | Faible : juste ajustement vol, garde structure séances |
| **B1.c** | Laisser tel quel | Aucun (passif), mais user pas satisfait |

**Recommandation** : faire valider par PM + coach quel niveau de patch pour les 11 (B1.a vs B1.b vs B1.c, peut-être case-by-case selon raceDate proche ou loin).

---

### B2 — 17 plans Premium previews actifs (preview only)

**Situation avant** :
17 plans Premium en `isPreview=true` (jamais `fullPlanGenerated=true`) avec ratio S1 < 0.85.

**Problème détecté** :
Quand le user clique "Générer le plan complet", le code actuel (post-déploiement 18/05) recalcule avec floor 100% → la baisse S1 disparaît automatiquement à ce moment.

**Solution proposée** : **laisser tel quel**. Le bug se corrigera tout seul au prochain clic. À condition d'avoir fixé A1 (L2666) avant.

**Risque** : nul si A1 fait avant.

---

### B3 — 8 plans nouveaux du 18/05 (Aurore, Justine, Alan, Sébastien, Antoine, Annabelle, Armando, Valentine)

**Situation avant** :
8 plans audités, créés AVANT le commit `26b3d3a` (deploy 17:59) ET sans le fix A1 (L2666). Tous ont S1 baisse -13 à -20%.

**Problème détecté** :
Les users ont déjà vu leur preview. La doctrine respectée (8/8 OK welcome), mais S1 démarre sous current.

**Solutions possibles** :
| Option | Description |
|---|---|
| **B3.a** | Patcher live les 8 weeklyVolumes (floor 100%) après fix A1 deployé |
| **B3.b** | Laisser tel quel — S2/S3 remontent naturellement au current ensuite |
| **B3.c** | Patcher SEULEMENT ceux qui ont course très proche |

**Décision Romane déjà prise pendant cette session** :
> "concernant les autres plans, tant pis ils ont déjà commencé pour leur semaine 1 on laisse tel quel"

→ **B3.b retenu** ✅ (laisser tel quel).

---

## C — FIXES DÉJÀ APPLIQUÉS (rappel session du 18/05)

| Client | Fix appliqué | Statut |
|---|---|---|
| **georgeslor1** (désabonné) | feasibility BON→AMBITIEUX + welcomeMessage transparent + weeklyVolumes pic 48→50 | ✅ Live en base |
| **Antoine** | feasibility.message "2h60min" → "3h00min" | ✅ Live en base |
| **Sébastien** | feasibility status BON→AMBITIEUX + score 60 + welcomeMessage enrichi PB + safetyWarning enrichi + allure 10k 9:30 + weeklyVolumes pic 9 km | ✅ Live en base |
| **Alan** | welcomeMessage MIX (pédagogique + alertes 11 sem courte + D+ sous-dim, sans violence) | ✅ Live en base |

---

## D — TABLEAU RÉCAP DÉCISION

| ID | Fix | Type | Sévérité | Effet | Recommandation immédiate |
|---|---|---|---|---|---|
| **A1** | L2666 cap `maxVolume × 0.65` écrase floor 100% | Code | 🔴 P1 | Tous futurs Confirmé/Expert | **Valider + apply** |
| **A2** | Clamp SL pic par objectif | Code | 🟠 P2 | Tous futurs plans (Alan/Sebastien/Antoine/Armando-like) | Valider + apply après test multi-profils |
| **A3** | Prompt welcome cite PB si Finisher+PB | Prompt | 🟡 P4 | Futurs welcomes plus individualisés | Valider + apply |
| **A4** | Prompt welcome cite blessure | Prompt | 🟡 P5 | Doctrine sécurité renforcée | Valider + apply |
| **A5** | Étendre Finisher+PB au Trail | Code | ⚪ Skip | — | Pas d'action (PB trail non comparable) |
| **B1** | 11 plans Premium actifs S1 baisse | Plans live | 🔴 P1 | 11 users (Romain/Lucie/Manon top urgents) | **Décision PM/coach** |
| **B2** | 17 plans Premium previews S1 baisse | Plans live | ⚪ Skip | — | Self-fix au prochain "Générer plan complet" si A1 fait |
| **B3** | 8 plans nouveaux 18/05 S1 baisse | Plans live | ⚪ Décision Romane | — | Laisser tel quel (validé Romane) |

---

## E — PROCHAINES ÉTAPES PROPOSÉES

1. **PM + Coach valident** ce document
2. Si validé : appliquer A1 + A3 + A4 (faible risque, gain immédiat) en 1 commit + deploy
3. Apply A2 après tests multi-profils (5k/10k/semi/marathon/trail × débutant/inter/conf/expert)
4. Décision B1 séparée (case-by-case ou batch ?) — coordonner avec Romane sur communication client (rappel : `feedback_jamais_contact_client`, c'est Romane qui gère)

---

## Doctrine respectée

- `feedback_input_client_obligatoire` ✅ (allures/dates user respectées)
- `feedback_jamais_baisser_allure_cible` ✅ (aucun fix ne touche les paces saisies)
- `feedback_finisher_plus_pb_allure` ✅ (règle déjà codée, prompt à enrichir)
- `feedback_jamais_poids_minceur` ✅ (aucun message proposé n'utilise poids/IMC)
- `feedback_securite_avant_conversion` ✅ (transparence renforcée, A4 cite blessure)
- `feedback_jamais_contact_client` ✅ (modifs Firestore uniquement, comm = Romane)
- `feedback_compromis_messages_preventifs` ✅ (recommandations équilibrées vs extrêmes)
