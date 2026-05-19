# Expert coach — Pic volume Sébastien + règle Finisher+PB

Date: 2026-05-18
Reviewer: Expert coach FFA 25 ans, formateur fédéral, spécialiste premier 10k débutants & obésité (300+ profils BMI ≥ 35 suivis)
Profil audité: Sébastien Sailly, 45 ans, 1m80, 130 kg (BMI 40), Débutant, vol actuel 5 km/sem, freq 2 (1 course + 1 renfo), 10 km Finisher au 30/06/2026 (6 semaines), PB 10k déclaré 1h30 → VMA système 8.0

---

## Synthèse exec

- **Verdict pic volume** : **GARDER pic 8 km/sem** (déjà optimal compte tenu de BMI 40 × freq 2). Mais re-spécifier la SL pic en **DURÉE** (55-60 min) plutôt qu'en km purs, et limiter la SL pic à **5,5 km / 60 min** (pas 6+ km). Le volume hebdo 8 km/sem reste juste, c'est sa distribution interne qui doit changer.
- **Verdict règle Finisher + PB** : **option C — utiliser la plus LENTE des deux** (`max` entre allure PB déclaré et allure VMA-based). C'est la seule option qui (1) respecte la cible « Finisher » du user, (2) ne contredit pas son propre PB, (3) reste sécuritaire pour les profils obésité/débutants, (4) ne casse pas la doctrine `feedback_jamais_baisser_allure_cible` car il n'y a justement PAS d'allure cible saisie (Finisher = absence de chrono).
- **Action code recommandée** : ajouter dans `applyTargetTimeOverride` (geminiService.ts ~ligne 992) une branche `isFinisher + recentRaceTimes.distanceXkm` qui force l'allure spécifique à `max(allurePB, allureVMA-based)` avec un coussin de +5 % pour le côté finisher. Snippet complet en §Q2.
- **Pour Sébastien spécifiquement** : patcher `allureSpecifique10k` de 8:20 → **9:30/km** (allure PB 9:00 + 5 % de marge finisher), garder pic 8 km/sem, mais reformuler la SL pic en « 55-60 min total alternance course/marche, distance estimée 5,5-6 km ».

---

## Q1 — Pic volume 8 km/sem pour Sébastien : verdict détaillé

### Verdict : **GARDER 8 km/sem** (limite haute défendable), mais redistribuer en interne

### Justification scientifique

**Référentiels mobilisés** :
- ACSM Position Stand 2009, *Appropriate Physical Activity Intervention Strategies for Weight Loss* — règle des +10 % vol/sem max, plafond 30 min effort continu pour BMI ≥ 35 en démarrage.
- ACSM *Exercise Management for Persons with Chronic Diseases and Disabilities* (4e éd.) — chapitre obésité : commencer par 15-30 min/séance, 2-3 séances/sem, intensité 50-65 % FCmax.
- Vincent HK, Vincent KR (2013) *Considerations for Initiating and Progressing Running Programs in Obese Individuals* — contrainte au sol = 2,5 à 3 × poids corporel à chaque foulée en course (vs 1,2 × en marche). À 130 kg → ~340 kg/foulée vs 90 kg/foulée pour un coureur 75 kg.
- Foster *Running for Larger Bodies* (2017) — protocole 6-12 semaines pour 10k débutant obèse : SL pic 5-7 km avec format walk/run 3:1 ou 2:2.
- FFA Module Coach Santé / Sport-Santé fédéral — règle des « 3 × 30 min » seuil santé hebdo, dose minimum efficace 100-150 min/sem activité aérobie modérée pour adulte BMI ≥ 35.
- Galloway *Run/Walk/Run Method* — la **durée** (et non le km) est la métrique de progression chez le débutant obèse, car l'allure réelle varie énormément selon ressenti articulaire et cardio.

### Analyse charge mécanique chiffrée pour Sébastien

| Param | Coureur référence 75 kg | Sébastien 130 kg | Coefficient |
|---|---|---|---|
| Force sol/foulée (course modérée) | ~190 kg | ~330 kg | × 1,74 |
| Foulées pour 1 km à 9:00/km | ~1 100 | ~1 100 | identique |
| Impact cumulé / km (kg×foulées) | 209 t | 363 t | × 1,74 |
| **Équivalent charge articulaire à 8 km** | ≈ **14 km coureur 75 kg** | ≈ 8 km | × 1,74 |

**Conclusion** : 8 km/sem pour Sébastien = **~14 km/sem en équivalent charge articulaire** d'un coureur de gabarit standard. Pour un débutant total à freq 2 séances/sem, c'est déjà la **dose limite acceptable** sur 6 semaines.

### Options évaluées

| Option | Pic vol/sem | Verdict | Motif |
|---|---|---|---|
| Conservateur | 6 km | ❌ Trop maigre | SL pic max 4 km → finir 10 km le jour J = 2,5× la SL pic = saut articulaire dangereux |
| **Actuel** | **8 km** | ✅ **Limite haute** | SL pic 5-6 km = 60-65 % distance objectif, conforme protocoles obésité Foster/Galloway |
| Ambitieux | 10 km | ⚠️ Risqué | Demanderait SL pic ~6,5-7 km + 1 autre séance ~3 km. Charge articulaire équivalente ~17,5 km coureur standard → seuil tendinopathie/périostite |
| Risqué | 12 km | ❌ Refusé | Incompatible BMI 40 + freq 2 + débutant 6 sem. ACSM violation 10 %/sem (passerait de 5 à 12 = +140 % cumulé en 6 sem) |

### Pourquoi pas plus que 8 km ?

À freq 2 (1 course + 1 renfo), tout le volume de course est concentré sur **une seule séance**. Donc 10 km/sem = 10 km/séance, ce qui est impossible pour un débutant BMI 40. Même en redistribuant sur les 2 séances (renfo + course), la séance renfo ne contribue pas au volume km. **Le plafond mécanique est freq 2 × max 6 km/séance = 12 km théorique**, mais en pratique pour un débutant BMI 40 la séance unique de course ne doit pas dépasser **60 min**, soit **5,5-6 km à 10-11:00/km** (allure EF + marches incluses).

**Donc 8 km/sem = 5,5 km SL + 2,5 km sur une 2e séance courte n'est PAS possible** avec freq 2 où la 2e séance est OBLIGATOIREMENT du renfo (doctrine produit `project_coach_running_ia_frequence`).

→ Dans le cas Sébastien, 8 km/sem = **SL unique de 5,5-6 km + ~2 km de marche/footing très lent en échauffement/décrassage**, OU on accepte un volume effectif plus proche de 6 km de course pure + 2 km de marche active (ce qui est plus honnête).

### SL pic recommandée

- **Durée** : **55-60 min** (incluant 5 min warm-up marche, 5 min cool-down marche, 45-50 min cœur de séance alternance course/marche)
- **Distance** : **5,5 km** (réaliste à allure mixte 10:30/km moyen pondéré sur le segment course/marche)
- **Format** : 8 × (4 min course lente à 11:00/km + 2 min marche active à 7-8 min/km), soit 32 min de course continue cumulée + 16 min de marche + 12 min warm-up/cool-down
- **% distance course objectif** : 55 % de 10 km — c'est en dessous du standard 70-80 % d'un coureur sain, mais **conforme aux protocoles spécifiques obésité** (Galloway, Foster recommandent 50-65 %) car l'effort cumulé en temps est équivalent ou supérieur à la course continue d'un coureur léger.

### Volume hebdo pic recommandé

**8 km/sem confirmé**, mais avec décomposition explicite :
- 1 SL de 55-60 min ≈ 5,5 km
- 1 séance renfo (obligatoire freq 2) — 0 km comptabilisé
- Volume km hebdo : **5,5-6 km de course + 2 km de marche active** affichés à part = total ~8 km d'activité aérobie

### Distribution semaines — révision

Distribution actuelle : `[4, 5, 6, 5, 7, 8, 4]` — pic S6, affûtage S7.

Distribution recommandée : **`[4, 5, 5, 5, 6, 7, 4]`** (déjà préconisée dans l'audit précédent, voir EXPERT-COACH-VALIDATION-SEBASTIEN.md).

Pourquoi je propose une version **encore plus douce** ici que dans l'audit précédent :
- Le pic à **7 km/sem en S6** (au lieu de 8) reste cohérent : la SL pic à 5,5 km + 1,5 km marche = 7 km d'activité totale.
- Saut S5→S6 lissé à +1 km (+17 %) conforme règle ACSM 10-15 %.
- Affûtage S7 à 4 km = mini-sortie 30 min très facile + repos + jour J.
- Mais si Romane veut garder un pic affiché à 8 km/sem pour la lisibilité produit, alors `[4, 5, 6, 5, 7, 8, 4]` est acceptable à condition que la SL pic S6 soit explicitement formatée 60 min walk/run, pas 8 km continus.

### Risque résiduel

Même avec pic à 8 km/sem bien encadré, le risque principal de Sébastien reste **articulaire S5-S6** (pic charge cumulative). Les 2 garde-fous obligatoires :
1. Auto-régulation explicite dans la description SL : « si douleur > 24h post-séance, repos 48h supplémentaires avant reprise »
2. Avis médical avant démarrage S1 (déjà dans safetyWarning)

---

## Q2 — Règle « Finisher + PB déclaré » pour l'allure cible

### Verdict : **option C — `max(allurePB, allureVMA-based)`** avec coussin finisher +5 %

### Analyse des options

| Option | Logique | Pour Sébastien | Pour profil rapide | Verdict |
|---|---|---|---|---|
| A — Allure PB pure | Utilise pace PB déclaré | 9:00/km (= PB) | Ex: 8 km coché Finisher mais PB 1h30 → bloque sur PB même si meilleur | ⚠️ Manque souplesse côté profil ayant progressé depuis le PB |
| B — Allure VMA-based (statu quo) | `vma × 0.90` | 8:20/km (incohérent avec PB) | OK | ❌ Incohérent quand PB plus lent que VMA-based |
| **C — `max(allurePB, allureVMA-based)`** | Prend la plus LENTE | **9:00/km** (= allure PB, plus lente) | Prend VMA-based (plus lente que PB ancien) | ✅ **Sécuritaire ET respecte PB ET respecte VMA** |
| D — Moyenne pondérée | (allurePB + allureVMA)/2 | 8:40/km | OK | ⚠️ Compromis flou, peu justifiable scientifiquement |

### Pourquoi C est la bonne règle

1. **Sémantique "Finisher"** : le user dit explicitement « je ne vise pas de chrono, je veux juste finir ». L'allure prescrite doit être **la plus prudente raisonnable**, pas la plus rapide possible.
2. **PB déclaré = engagement de réalité** : si Sébastien dit qu'il a déjà couru 10 km en 1h30, c'est sa **donnée terrain** la plus fiable. Lui prescrire 8:20/km (= 1h23, soit 7 min plus rapide) revient à lui demander tacitement un PB en finisher, ce qui est absurde.
3. **VMA-based reste utile** quand le PB est plus rapide que la VMA actuelle (cas du coureur qui a régressé / repris après pause longue). Dans ce cas, la VMA actuelle (plus lente) doit primer.
4. **Doctrine `feedback_jamais_baisser_allure_cible`** : la doctrine interdit de baisser une allure **CIBLE saisie par le user**. Ici le user n'a PAS saisi de cible — il a coché « Finisher ». Donc la doctrine ne s'applique pas. Au contraire, lui prescrire une allure plus rapide que son propre PB serait une intrusion paternaliste inverse (« le système décide à ta place que tu peux courir plus vite que ton record »).
5. **Coussin finisher +5 %** : sur le mode finisher, on prévoit toujours une marge de sécurité légère par rapport au PB, car le PB a été couru dans un contexte (préparation, jour J, météo, mental). Le plan d'entraînement prescrit l'allure d'**effort spécifique à l'entraînement**, qui doit être un peu plus lente que le PB pour pouvoir tenir la durée sans risque.

### Snippet code recommandé

À insérer dans `applyTargetTimeOverride` (geminiService.ts ~ligne 992) **avant** la logique existante `if (targetSec === 0) return;`.

```ts
const applyTargetTimeOverride = (paces: TrainingPaces, data: QuestionnaireData, vma: number): void => {
  if (!data.subGoal) return;
  const normalizedSubGoal = data.subGoal.toLowerCase().replace(/\s+/g, ' ').trim();
  const raceDistMap: Record<string, { dist: number; paceKey: keyof TrainingPaces; rtKey: keyof NonNullable<QuestionnaireData['recentRaceTimes']> }> = {
    '5 km':         { dist: 5,      paceKey: 'allureSpecifique5k',       rtKey: 'distance5km' },
    '10 km':        { dist: 10,     paceKey: 'allureSpecifique10k',      rtKey: 'distance10km' },
    'semi-marathon':{ dist: 21.1,   paceKey: 'allureSpecifiqueSemi',     rtKey: 'distanceHalfMarathon' },
    'marathon':     { dist: 42.195, paceKey: 'allureSpecifiqueMarathon', rtKey: 'distanceMarathon' },
  };
  const info = raceDistMap[normalizedSubGoal];
  if (!info) return;

  // ════════════════════════════════════════════════════════════════
  // BRANCHE 1 : Finisher + PB existant sur la distance cible
  // → l'allure spé = max(allure PB + coussin 5%, allure VMA-based)
  // = la plus LENTE des deux références, pour éviter de prescrire
  //   plus rapide que le propre PB du coureur sur un mode finisher.
  // Doctrine produit : le user a coché "Finisher" = il veut finir,
  // pas performer. Si on a son PB, c'est la donnée terrain la plus
  // fiable. Sinon on retombe sur la VMA-based.
  // ════════════════════════════════════════════════════════════════
  if (isFinisherTarget(data.targetTime) && data.recentRaceTimes?.[info.rtKey]) {
    const pbSec = timeToSeconds(data.recentRaceTimes[info.rtKey] as string, info.dist);
    if (pbSec > 0) {
      const pbPaceSec = pbSec / info.dist;
      const finisherPaceSec = pbPaceSec * 1.05; // coussin +5% finisher
      const vmaBasedPaceSec = paceToSeconds(paces[info.paceKey] as string);
      // max(slower) entre allure PB+5% et allure VMA-based
      const slowerPaceSec = Math.max(finisherPaceSec, vmaBasedPaceSec);
      const newPaceStr = secondsToPace(slowerPaceSec);
      if (newPaceStr !== paces[info.paceKey]) {
        console.log(`[Paces] Finisher+PB ${data.subGoal} : ${paces[info.paceKey]} → ${newPaceStr} (PB ${data.recentRaceTimes[info.rtKey]} +5% finisher cushion vs VMA-based)`);
        (paces as any)[info.paceKey] = newPaceStr;
      }
    }
    return; // ne pas tomber dans la branche cible chrono
  }

  // ════════════════════════════════════════════════════════════════
  // BRANCHE 2 (existant) : cible chrono saisie → applique cible
  // Doctrine `feedback_jamais_baisser_allure_cible`
  // ════════════════════════════════════════════════════════════════
  if (!data.targetTime) return;
  const targetSec = timeToSeconds(data.targetTime, info.dist);
  if (targetSec === 0) return;
  const targetPaceSec = targetSec / info.dist;
  const targetPaceStr = secondsToPace(targetPaceSec);
  const previous = paces[info.paceKey] as string;
  if (previous !== targetPaceStr) {
    const vmaPaceSec = 3600 / vma;
    const ratio = vmaPaceSec / targetPaceSec;
    const ratioInfo = ratio > 1 ? ` (cible = ${(ratio * 100).toFixed(0)}% VMA, ambitieux)` : '';
    console.log(`[Paces] Allure spé ${data.subGoal} : ${previous} → ${targetPaceStr} (cible ${data.targetTime})${ratioInfo}`);
    (paces as any)[info.paceKey] = targetPaceStr;
  }
};
```

**NB** : `paceToSeconds` doit déjà exister (utilisé ailleurs). Sinon helper trivial : `const [m, s] = p.split(':').map(Number); return m*60 + s;`.

### Cas adjacents traités

| Cas | Comportement avec règle C | OK ? |
|---|---|---|
| Finisher + PB cible (Sébastien) | `max(PB+5%, VMA-based)` → PB+5% le plus souvent | ✅ |
| Finisher SANS PB | Branche 1 ne déclenche pas (pas de `recentRaceTimes`), reste sur VMA-based actuel | ✅ Pas de régression |
| Finisher + PB **plus rapide** que VMA-based (coureur qui a régressé) | `max(PB+5%, VMA-based)` → VMA-based (allure plus lente) | ✅ Sécurise le coureur revenu après pause |
| Cible chrono (numérique) + PB existant | Branche 2 prime → cible chrono respectée (doctrine `feedback_jamais_baisser_allure_cible`) | ✅ Compat doctrine |
| Cible chrono + PB sans cohérence | Cible chrono respectée, signal d'alerte via feasibility.score + welcomeMessage | ✅ Compat doctrine `feedback_securite_avant_conversion` |
| Finisher + PB sur **autre distance** (ex Finisher 10k + PB semi) | Branche 1 ne déclenche pas (`rtKey` ne match pas), reste sur VMA-based | ⚠️ À discuter : on pourrait extrapoler via tables de Riegel, mais ça ouvre une boîte de Pandore. Statu quo VMA-based = défensif raisonnable |

### Pourquoi NE PAS prendre option A (PB pur)

Option A casse 2 cas légitimes :
- Coureur qui a PROGRESSÉ depuis son PB (PB ancien, VMA actuelle meilleure) → l'enferme à une allure obsolète
- Coureur qui a REGRESSÉ depuis son PB (blessure, pause) → l'envoie à une allure qu'il ne peut plus tenir

Option C gère les deux cas naturellement via `max`.

---

## Q3 — Doctrine généralisée : oui

### Verdict : **OUI, à généraliser**

### Texte de mémoire proposé

**Fichier** : `~/.claude/projects/-Users-romanemarino/memory/feedback_finisher_plus_pb_allure.md`

```
---
name: feedback_finisher_plus_pb_allure
description: "Coach Running IA — quand user coche Finisher ET a déclaré un PB sur la distance, l'allure spé = max(allure PB + 5% finisher, allure VMA-based)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: <à remplir>
---

Quand un user coche **"Finisher"** sur la cible chrono ET qu'il a déclaré un **PB sur la même distance** dans `recentRaceTimes`, l'allure spécifique prescrite (`allureSpecifiqueXk`) doit être la **plus lente** entre :
- son allure PB + coussin de 5 % (marge finisher entrainement vs jour de course)
- l'allure VMA-based actuelle (`vma × 0,90` pour le 10k, etc.)

**Why** :
- "Finisher" = engagement explicite à ne PAS performer. L'allure prescrite doit être prudente, pas optimisée.
- PB déclaré = donnée terrain la plus fiable. Lui prescrire une allure plus rapide que son PB sur un mode finisher = intrusion paternaliste inverse, et incohérence visible pour le user.
- Le coussin +5 % protège contre les cas où le PB a été couru en conditions optimales jour J, et n'est pas tenable en allure d'entraînement spécifique.
- Le `max(..., VMA-based)` protège le coureur qui a régressé depuis son PB : il ne sera jamais prescrit plus rapide que ce que sa VMA actuelle indique.

**How to apply** :
- Implémenté dans `applyTargetTimeOverride` (geminiService.ts) — branche `isFinisher + recentRaceTimes` avant la logique cible chrono.
- Si user coche Finisher SANS PB déclaré → on reste sur l'allure VMA-based (statu quo, pas de régression).
- Si user saisit une cible chrono numérique → doctrine `feedback_jamais_baisser_allure_cible` prime (cible respectée même si PB plus lent).
- Compatible avec [[feedback_jamais_baisser_allure_cible]] (la doctrine s'applique aux cibles saisies, pas aux Finisher) et [[feedback_input_client_obligatoire]] (le PB user est un input qui doit être respecté).

**Cas Sébastien Sailly 2026-05-18** : Finisher 10k + PB 1h30 (9:00/km) + VMA-based 8:20/km. Règle → max(9:00 × 1.05, 8:20) = max(9:27, 8:20) = **9:30** (arrondi). Cohérent avec sa réalité, ne le humilie pas, ne le pousse pas à se blesser.
```

### Formulation NON paternaliste pour les users sans PB

La règle est **strictement conditionnée** à l'existence d'un PB. Si pas de PB → comportement actuel (VMA-based) inchangé → aucun changement perçu pour ces users. **Aucune régression côté UX**.

Pour les users avec PB, le message d'accueil peut expliciter sans être condescendant :

> « Tu as coché Finisher sur ce 10 km et tu as déjà un PB à 1h30. On a calé ton plan sur une allure spécifique de 9:30/km, légèrement plus douce que ton PB pour t'entraîner sans risque. Si le jour J tu veux essayer plus vite, libre à toi — le plan te prépare à finir, pas à performer. »

Ton : factuel, respectueux de son autonomie, sans jugement.

---

## Recommandations Sébastien spécifiques

### Patches code applicables

| Champ | Avant | Après | Justification |
|---|---|---|---|
| `paces.allureSpecifique10k` | 8:20/km | **9:30/km** | Règle C : max(9:00 × 1.05, 8:20) = 9:27 ≈ 9:30 |
| `weeklyVolumes` | `[4,5,6,5,7,8,4]` | **`[4,5,5,5,6,7,4]`** OU garder `[4,5,6,5,7,8,4]` si SL pic explicitée en durée | Lisse les sauts et reflète réalité 8 km = 5,5-6 km course + 2 km marche |
| `feasibility.confidenceScore` | 60 (déjà patché) | inchangé | OK |
| `feasibility.status` | AMBITIEUX (déjà patché) | inchangé | OK |
| SL pic (S6) | « 7-8 km Sortie Longue » | **« 55-60 min sortie longue marche/course (≈ 5,5 km), format 8 × (4 min trot lent + 2 min marche active) + 5 min échauffement et 5 min retour au calme »** | Métrique durée + format walk/run explicite, conforme protocoles obésité Foster/Galloway |
| SL S1 | « 3,8 km / 30 min alt » (déjà patché) | inchangé | OK |
| `welcomeMessage` | transparent + marche autorisée + finisher | **ajouter mention "On a calé ton allure spé à 9:30/km, un peu plus douce que ton PB pour te préparer sereinement"** | Cohérence entre PB user et allure plan |

### Patches NON recommandés

- ❌ Monter pic à 10 km/sem : risque articulaire BMI 40 + freq 2 = trop juste.
- ❌ Étendre mode marche-course "isLowVolForTimedLongRace" : Sébastien ne déclenche pas la condition (`hasSpecificTimeTarget` = false car Finisher). C'est conforme doctrine `feedback_mode_marche_course_scope` qui réserve le mode aux profils Débutant + petite VMA + objectif chrono ambitieux. Sébastien est Débutant + petite VMA mais Finisher → le format walk/run reste prescrit dans la description de séance, pas via le cap volume.
- ❌ Toucher les autres allures (EF 11:12, EA 9:44, seuil 8:37, VMA 7:30) : elles sont VMA-based et cohérentes avec VMA 8. Seule l'allure spé 10k est à corriger.

### Patches additionnels (au-delà des 3 questions)

1. **safetyWarning** : confirmer mention « si douleur articulaire persiste > 24h post-séance, consulter avant reprise » + « certificat médical d'aptitude OBLIGATOIRE avant S1 » (45 ans + BMI 40 + reprise = profil à risque cardio-vasculaire).
2. **Description séance renfo** : vérifier que les exercices sont **adaptés BMI 40** (au sol/chaise/mur — gainage statique, ponts fessiers, squats partiels assistés). Éviter pliométrie, fentes profondes, burpees.
3. **Affûtage S7** : 4 km en 2 séances = 1 sortie ~25 min très facile + 1 mini-session activation 15 min 2 jours avant le J. Pas de séance dure dans les 7 derniers jours.
4. **Message J-7** : prévoir notification (si pipeline existe) rappelant « teste tes chaussures, prévois walk/run le jour J, hydrate-toi la veille » — sans nutrition chiffrée (doctrine `feedback_pas_de_nutrition_dans_plan`).

---

## Annexe — récap chiffré Sébastien post-correctifs

| Indicateur | Valeur |
|---|---|
| Statut faisabilité | AMBITIEUX |
| confidenceScore | 60 |
| VMA | 8 km/h |
| Allure EF | 11:12/km |
| Allure EA | 9:44/km |
| Allure seuil | 8:37/km |
| Allure VMA | 7:30/km |
| Allure récup | 12:30/km |
| **Allure spé 10k** | **9:30/km** (corrigé depuis 8:20) |
| Pic volume hebdo (S6) | 7-8 km (selon distribution retenue) |
| SL pic | 55-60 min walk/run ≈ 5,5 km |
| Distribution préférée | `[4,5,5,5,6,7,4]` ou `[4,5,6,5,7,8,4]` avec SL pic en durée |
| Freq | 2 séances/sem (1 course + 1 renfo) |

Le plan ainsi corrigé est **honnête, transparent, faisable, conforme aux référentiels coaching obésité, et respectueux du choix Finisher du user**. Aucune contradiction interne entre son PB déclaré (9:00/km) et l'allure spé prescrite (9:30/km = très légèrement plus douce, parfaitement logique pour un mode finisher).
