# AUDIT POST-DÉSABONNEMENT — georgeslor1@gmail.com

**Date audit** : 2026-05-18 10:40 (heure script)
**Type** : Audit post-désabonnement 5 dimensions (lecture seule)
**Source** : `audit-georgeslor1.txt` + `audit-georgeslor1.json` + investigation `src/services/`

---

## 1. IDENTITÉ UTILISATEUR

| Champ | Valeur |
|---|---|
| Email | georgeslor1@gmail.com |
| UID Firebase | `oWrcHj2F1CQsL34K3KS0ZMc7Olg1` |
| Display name | Georges Lor1 |
| Email vérifié | Oui |
| `isPremium` | **true** (a payé) |
| Compte créé | 2026-05-18 07:29:04 UTC |
| Génération preview | 2026-05-18 07:31:33 UTC (+2min30) |
| **Dernière connexion** | **2026-05-18 07:44:44 UTC (+15min après inscription)** |
| Plan ID | `1779089493075` |
| Plan name | "Préparation Marathon en 4h45 — 22 sem." |
| `isPreview` | **true** |
| `fullPlanGenerated` | **false** ← jamais déclenché le full plan |

### Inputs questionnaireData (snapshot)

```json
{
  "age": 57,
  "weight": 90,
  "height": 180,
  "bmi": "27.78",
  "level": "Expert (Performance)",
  "goal": "Course sur route",
  "subGoal": "Marathon",
  "targetTime": "4h45",
  "raceDate": "2026-10-18",
  "frequency": 5,
  "currentWeeklyVolume": 45,
  "injuries": { "hasInjury": false },
  "recentRaceTimes": {
    "distance10km": "1h00",
    "distanceMarathon": "5h15"
  },
  "vmaInput": 10.685,
  "vmaSource": "Moyenne 10km en 1h00 et Marathon en 5h15"
}
```

### Lecture comportementale critique

- Georges a payé (`isPremium=true`).
- Il a généré la preview à T+2min30.
- Sa dernière connexion remonte à T+15min après inscription.
- Il n'a jamais cliqué sur "Générer le plan complet" (`fullPlanGenerated=false`).
- Verdict : **il a ouvert la preview, l'a lue, et est parti immédiatement.** La décision de désabonnement s'est prise à la lecture des **séances de la semaine 1** + du **welcomeMessage** + du statut de faisabilité **affiché "BON"** alors qu'il a en lui un objectif extrêmement ambitieux.

---

## 2. ANALYSE 5 DIMENSIONS

### Dimension 1 — Allures (cohérence VMA / paces / chrono cible)

- VMA calculée : 10.69 km/h. Cohérent avec les paces stockées (efPace 8:23 ↔ VMA dérivée 10.68 km/h, écart 0).
- Pace cible marathon : 6:45/km = **83 % VMA** (fourchette tolérée 78–86 %) → cohérent en surface.
- **MAIS** : son PB marathon réel est **5h15**, soit 7:28/km = **5.66 km/h moyenne = 75.4 % VMA tenue en vrai**. L'objectif 4h45 demande +9.5 % d'allure (-30 min) et un saut de 75.4 → 83 % VMA sur 42 km. **Le modèle de cohérence "% VMA cible" est satisfait, mais le delta avec la performance réelle marathon n'est pas testé** — un Expert de 57 ans qui a couru 5h15 ne tiendra physiologiquement quasi jamais 83 % VMA sur 42 km dans 5 mois sans entraînement très spécifique.
- Les 4 séances visibles S1 sont toutes à efPace 8:23/km : conformes au type (footing/SL), aucun mismatch d'allure dans la séance.

**Verdict dimension 1** : pace formellement cohérent, **mais l'écart entre PB réel et cible n'est pas reflété dans le statut de faisabilité.**

### Dimension 2 — Sortie longue (SL)

- Seule la S1 est générée (preview).
- SL S1 : 13.2 km / 111 min / 0 m D+ à 8:23/km.
- Pour un marathonien Expert avec 45 km/sem actuel et un PB marathon de 5h15, une SL semaine 1 à 13.2 km est **trop molle / sous-dimensionnée**.
- Une SL d'entrée de plan marathon pour ce profil devrait être ~16–20 km. Ici 13.2 km = ~30 % du marathon, et plus grave : **la SL pic du plan complet (extrapolée via `weeklyVolumes`) est estimée autour de 25–28 km — insuffisant pour un marathonien Expert visant 4h45.**
- Audit affiche "SL pic attendu marathon: 28–35 km / 140–210 min" → la SL pic du plan ne respecte pas cette fourchette.

**Verdict dimension 2** : SL S1 trop modeste pour le profil, et pic SL plan probablement insuffisant pour un marathon.

### Dimension 3 — Volume hebdo + volume pic

- `currentWeeklyVolume` = 45 km. Volume S1 plan = 37.7 km → **saut S1 = -16 %** (plan en-dessous du courant). C'est OK en absolu (pas de saut +30 % qui ferait peur), mais **pour un Expert qui court déjà 45 km/sem**, descendre à 37.7 km la première semaine envoie un signal "ce plan est mou".
- `weeklyVolumes` plan : `[38,41,44,34,39,45,39,45,48,37,43,48,37,43,48,37,43,48,37,33,29,25]`.
- Volume pic = **48 km/sem** seulement (sem 9, 12, 15, 18).
- Pour un marathon en 4h45 par un Expert avec PB 5h15, **un pic à 48 km/sem est très bas** — référentiel coaching standard 55–75 km/sem pour ce profil + objectif. Plan sous-dosé.
- Affûtage : `[37, 33, 29, 25]` → ratio dernier affûtage / pic = 25/48 = 52 %. (L'audit affiche "100 % affûtage insuffisant" en raison de la lecture preview à 1 sem ; c'est un faux positif d'audit, mais en théorie pp l'affûtage est correct.)

**Verdict dimension 3** : volume global plan **trop bas** pour le profil/objectif. Le saut S1 négatif est rassurant pour un débutant mais frustrant pour un Expert.

### Dimension 4 — welcomeMessage (doctrine)

Texte complet (726 caractères) :

> Félicitations pour ton engagement dans la préparation de ce Marathon avec un objectif de 4h45 ! Ce plan de 22 semaines est conçu pour t'accompagner pas à pas, en construisant une base solide d'endurance fondamentale. La première semaine est dédiée à l'établissement de tes bases. Nous allons progresser de manière douce et régulière pour préparer ton corps à l'effort marathonien, en intégrant des séances d'endurance et du renforcement musculaire. Chaque session est une étape vers ton objectif. Nous te recommandons vivement de consulter un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. À partir de 57 ans, un bilan cardio-vasculaire est particulièrement conseillé.

**Conformité doctrine** :
- Aucun mot poids/IMC/minceur : OK.
- Pas commercial / pas d'embellissement direct : OK.
- Tutoiement : OK.
- Mention sécurité (médecin / 57 ans / certificat) : OK.

**MAIS problèmes pédagogiques** :
- Le message dit "intégrant des séances d'endurance **et du renforcement musculaire**" — sauf que **la semaine 1 ne contient AUCUN renforcement** (4 footings, 0 renfo). Cf. mémoire `project_coach_running_ia_frequence` : freq 5 = 4 course + 1 renfo. **Promesse non tenue dès la S1.**
- Aucun mot sur la **faisabilité ambitieuse de l'objectif** : -30 min vs PB marathon est passé sous silence. Un Expert de 57 ans peut percevoir ça comme "l'app ne m'a pas regardé sérieusement" → perte de confiance.
- `raceDate` 2026-10-18 jamais cité (5 mois pile pour −30 min sur marathon : une mention chiffrée du calendrier aurait construit de la crédibilité).

### Dimension 5 — Faisabilité R2

```json
{
  "status": "BON",
  "score": 79,
  "message": "Avec ta VMA de 10.7 km/h, ton temps théorique sur marathon est d'environ 4h56min. Viser 4h45min est un bel objectif. Avec un entraînement régulier, c'est tout à fait atteignable."
}
```

**Calculs vérifiés** :
- Temps théorique = 42.195 / (10.69 × 0.80) × 60 = **296 min = 4h56** → cohérent avec `getVmaFactor` (`feasibilityService.ts:153-161`).
- Seuil score : `score 79 → ≥70 → BON` (`feasibilityService.ts:1441-1447`).
- Gate "chrono cible" : `pctVMA 83.13 %` dans 78–86 % → "cohérent".

**MAIS** : la fonction `calculateFeasibility` **ne croise pas le PB marathon réel (5h15) avec la cible (4h45)**. Elle ne compare que :
1. Temps théorique VMA-based (4h56)
2. Temps cible (4h45)
3. Différence (-11 min) → jugée "atteignable"

**Le PB marathon réel de 5h15 est dans `recentRaceTimes` mais n'est pas utilisé pour rabaisser le score.** Or :
- 5h15 marathon = 75.4 % VMA tenu réellement
- 4h45 marathon = 83 % VMA à tenir
- Saut d'efficacité +10 % à 57 ans en 22 sem ≈ irréaliste sans antécédents d'entraînement structuré spécifique

**Le statut "BON" + message "tout à fait atteignable" est un MENSONGE doctrinal** — contredit la mémoire `feedback_securite_avant_conversion` ("JAMAIS embellir un plan IRRÉALISTE"). Pour un coach humain, ce profil mérite **AMBITIEUX** ou **RISQUÉ**, avec proposition d'objectif alternatif (~4h55–5h00).

---

## 3. TOP 3 DÉFAUTS CRITIQUES — VERDICT EXPERT

### Défaut #1 (CRITIQUE) — Faisabilité "BON" mensongère ignore le PB marathon réel

- **Score 79/BON** affiché alors qu'un coach humain dirait **AMBITIEUX/RISQUÉ**.
- Le calcul ne pondère pas `recentRaceTimes.distanceMarathon` (5h15) qui contredit factuellement la cible (4h45 = −30 min, −9.5 % d'allure).
- Message commercial "c'est tout à fait atteignable" → Georges lit ça, se sent pris pour un débutant, **perd confiance dans l'expertise de l'app**. Un Expert sait ce que vaut un PB marathon : si on lui dit "facile" alors que c'est −30 min, il sait qu'on lui ment ou qu'on n'a pas regardé.

### Défaut #2 (CRITIQUE) — Plan sous-dosé pour profil Expert visant marathon en 4h45

- Volume pic 48 km/sem pour préparer marathon 4h45 = **−25 à −35 % vs standard coaching** (référentiel 60–70 km/sem).
- SL S1 = 13.2 km pour quelqu'un qui court déjà 45 km/sem hebdo : démotivant.
- S1 = 4 séances *toutes en footing facile à 8:23/km*, zéro séance qualité, zéro renfo. **Aucune signature "Expert".**
- Saut S1 = **−16 %** (37.7 < 45 km actuel) : un Expert n'attend pas qu'on lui baisse son volume en S1.
- Pour Georges qui a fait l'effort de payer en attendant un plan ambitieux : ce qu'il voit en preview ressemble à un plan débutant. Verdict immédiat : "ça ne va pas me faire passer de 5h15 à 4h45".

### Défaut #3 (MAJEUR) — Promesse non tenue dans le welcomeMessage : renfo absent S1

- Le welcomeMessage affirme : *"en intégrant des séances d'endurance **et du renforcement musculaire**"*.
- Or S1 contient **0 séance renfo** sur 4 séances visibles (et il a demandé `frequency=5`, donc 1 séance non générée dans la preview — probablement le renfo, mais Georges ne le voit pas).
- Doctrine mémoire : `freq X = (X-1) course + 1 renfo`. Pour freq 5 : 4 course + 1 renfo. **La preview ne montre que 4 footings, pas le renfo annoncé.**
- Georges peut compter et constater "il manque une séance et il manque le renfo qu'on m'a promis" → rupture de confiance, justifiant le désabonnement immédiat.

---

## 4. RECOMMANDATIONS PATCH

### Patch A (priorité 1) — `feasibilityService.ts` : intégrer PB marathon réel dans le scoring

**Fichier** : `/Users/romanemarino/Coach-Running-IA/src/services/feasibilityService.ts`

**Problème** : `calculateFeasibility` calcule un temps théorique VMA-based mais n'utilise pas `recentRaceTimes.distanceMarathon` comme contradicteur de la cible.

**Patch** :
- Si l'utilisateur a un PB sur la **même distance** que `subGoal` (ici marathon), ajouter une règle :
  - Si `targetTime < PB × (1 − 0.10)` (cible plus rapide de >10 % vs PB) → **plafonner le score à 60 (AMBITIEUX)** et inclure dans `message` la mention chiffrée du delta (« Tu vises 30 min de moins que ton PB marathon, c'est ambitieux »).
  - Si `targetTime < PB × (1 − 0.15)` → plafonner à 45 (RISQUÉ) et **proposer un `alternativeTarget`** auto-généré (par ex. PB − 10 %).
- Conformité doctrine `feedback_securite_avant_conversion` : transparence > vente.

### Patch B (priorité 2) — `geminiService.ts` : sortir le renfo dans la preview pour freq ≥ 3

**Fichier** : `/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts` (autour ligne 3815 où la preview est marquée)

**Problème** : la preview ne génère que les séances course, pas le renfo de la semaine. Or le welcomeMessage le promet et la doctrine `project_coach_running_ia_frequence` l'impose.

**Patch** :
- Forcer la génération de la séance renfo dans la S1 preview (même placeholder simple : « Renforcement 30 min — gainage + chaîne postérieure »), pour que la promesse welcomeMessage soit visible dès la preview.
- Sinon : retirer du welcomeMessage la mention "renforcement musculaire" tant que le renfo n'est pas affiché.

### Patch C (priorité 3) — `geminiService.ts` : volume + SL adaptés au niveau Expert + objectif

**Problème** : pour profil Expert / marathon / freq 5 / currentVol 45, le plan généré reste calé sur un référentiel "intermédiaire". Volume pic 48 et SL pic <20 km insuffisants.

**Patch** :
- Dans la construction de `periodizationPlan`, ajouter une règle multiplicative liée au level :
  - Si `level=Expert` ET `subGoal in {Marathon, Semi-marathon}` ET `targetTime ambitieux (cible <5% < PB)` → augmenter `peakVolume` de +20 % et `peakSL` à 28–32 km.
- S1 : ne **jamais** descendre sous `currentWeeklyVolume × 0.95` pour Expert (autoriser seulement saut −5 %, pas −16 %).
- Forcer au moins 1 séance qualité (allure spé / seuil court / fartlek) en S1 pour Expert, même en phase fondamentale.

### Patch D (UI/prompt) — Bandeau honnêteté objectif

Dans le welcomeMessage généré, **si feasibility.status ∈ {AMBITIEUX, RISQUÉ}** :
- Ajouter une phrase explicite et non-commerciale : « Ton objectif est ambitieux : tu vises X min de moins que ton meilleur temps sur la distance. Le plan est conçu pour t'amener au plus près, mais une cible alternative à <alternativeTarget> est plus sûre. »
- Conforme à `feedback_securite_avant_conversion` et `feedback_compromis_messages_preventifs`.

---

## 5. CONCLUSION COACH

**Pourquoi Georges s'est désabonné après 15 minutes** :
1. Il a vu un statut "**BON / tout à fait atteignable**" sur un objectif qu'il sait personnellement irréaliste (il a couru le marathon en 5h15 récemment). → Perte de confiance immédiate dans l'expertise de l'app.
2. Il a vu une **S1 avec 4 footings à allure très lente (8:23/km)** et un **volume inférieur à son volume actuel** → impression que l'app ne le respecte pas en tant qu'Expert.
3. Il a vu un welcomeMessage **promettant du renfo qui n'apparaît nulle part** → rupture de promesse.

**Coupable principal** : la fonction de faisabilité qui n'utilise pas le PB marathon comme contradicteur. C'est la pièce la plus à risque doctrinal (embellissement d'un plan irréaliste) et la plus rapide à patcher.

**Action immédiate recommandée** : appliquer **Patch A** (feasibility + recentRaceTimes) avant le prochain user Expert qui passe par le funnel.
