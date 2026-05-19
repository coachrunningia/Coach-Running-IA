# Cartographie previewPrompt — 3 catégories
Date : 2026-05-19
Source : `src/services/geminiService.ts` L3490-3863 (374 lignes) + helpers interpolés

---

## Synthèse 30 secondes

Le `previewPrompt` n'est pas un monolithe. C'est :
- **Un squelette CORE assez court** (~70 lignes / ~18% du prompt) : profil + allures + structure JSON.
- **Une accumulation de blocs PATCH_DEFENSIF gigantesques** (~210 lignes / ~56% du prompt), tous activés conditionnellement selon le profil — donc l'utilisateur moyen n'en voit qu'une partie, mais ce qui s'affiche est dense.
- **Une mince couche DOCTRINE_PEDAGOGIQUE** (~25 lignes / ~7% du prompt) : variété, originalité, ton coach.
- Le reste (~70 lignes / ~19%) = **interpolations dynamiques** (allures, périodisation, jours, etc.) qu'on ne peut pas vraiment classifier comme texte de prompt — elles sont par nature CORE/dynamique.

### Estimation tokens (374 lignes × ~50 chars × 0.25 tok/char ≈ 4 700 tokens pour un user MOYEN, jusqu'à ~10 000 pour un user multi-flags)

| Catégorie | Lignes (cas pire) | Tokens estimés | % du prompt complet |
|---|---|---|---|
| CORE structurel | ~70 | ~1 700 | 18% |
| Interpolations dynamiques (allures, périodisation, jours, profil) | ~70 | ~1 700 | 19% |
| PATCH_DEFENSIF — 🟢 suppression probable | ~80 | ~2 000 | 21% |
| PATCH_DEFENSIF — 🟡 à tester | ~75 | ~1 900 | 20% |
| PATCH_DEFENSIF — 🔴 garder | ~55 | ~1 400 | 15% |
| DOCTRINE_PEDAGOGIQUE | ~24 | ~600 | 7% |
| **TOTAL prompt (cas pire activable)** | **~374** | **~9 300** | **100%** |

**Gain potentiel avec gemini-3-pro** :
- Suppression 🟢 seule : prompt **-21%** (~2 000 tokens). Latence : -10 à -20% selon Gemini.
- Suppression 🟢+🟡 (après tests) : prompt **-41%** (~3 900 tokens). Latence : -25 à -40%.

⚠️ Important : les vrais gains dépendent du profil user. Un user "Marathon Inter" sans blessure et sans Hyrox/Perte/Trail utilise déjà < 50% de ces tokens (les gros blocs Hyrox L3666-3781 et Perte L3586-3656 ne s'injectent pas). **Les vrais leviers** sont les blocs `buildSafetyInstructions` (toujours injecté) + les "RÈGLES ABSOLUES" L3540-3574 (toujours injecté).

---

## Détail par bloc

### Bloc 1 — L3491 : Rôle système
```
Tu es un Coach Running Expert. Génère UNIQUEMENT la SEMAINE 1 d'un plan d'entraînement.
```
**Catégorie** : CORE. **Garder absolument.** 1 ligne, ~15 tokens.

---

### Bloc 2 — L3493-3504 : Profil du coureur
```
- Niveau / Objectif / Temps visé / Date / Jours / Localisation
${injuryInstruction} ${commentsInstruction} ${beginnerInstructionPreview}
```
**Catégorie** : CORE (données). 11 lignes, ~80 tokens (hors interpolations).
**Garder.** C'est le contexte minimum.

---

### Bloc 3 — L3505-3522 : Suggestions de lieux (`suggestedLocations` + `locationSuggestion`)
```
📍 LIEUX D'ENTRAÎNEMENT : Tu DOIS proposer 2-3 lieux RÉELS à ${data.city}...
- Exemples pour Paris : Bois de Vincennes...
- Exemples pour Lyon : Parc de la Tête d'Or...
📍 LIEU PAR SÉANCE — OBLIGATOIRE :
- Fractionné VMA → PISTE
- Sortie Longue → grand parc
- Footing/Récup → parc agréable
- Renforcement → "À la maison"
```
**Catégorie** : DOCTRINE_PEDAGOGIQUE (proposer des lieux réels = valeur produit).
**Lignes** : 18 (~450 tokens). Activé seulement si `data.city`.
**Note** : conservé tel quel — c'est de la doctrine produit, pas du patch défensif.

---

### Bloc 4 — L3524-3527 : Allures calculées (`pacesSection`)
```
VMA : X km/h | EF | Seuil | VMA pace | Récup
```
**Catégorie** : CORE. 4 lignes, ~80 tokens.
**Garder.** C'est l'input quantitatif principal.
⚠️ **Anomalie détectée** : la règle PB L3074 (dans `buildSafetyInstructions`) pointe vers "Allure spé ${data.subGoal}" mais le `pacesSection` ne la fournit PAS au preview (seulement EF/Seuil/VMA/Récup). L'instruction Gemini lui demande de citer un champ absent → fallback hallucination ou ignore. **Bug latent à patcher indépendamment**.

---

### Bloc 5 — L3530-3538 : Plan de périodisation pré-calculé
```
Durée totale : N semaines
Semaine 1 : Phase "X"
Volume semaine 1 : Y km
Phases du plan : S1: ... S2: ... etc.
```
**Catégorie** : CORE. 9 lignes, ~120 tokens.
**Garder.** Contexte structurel obligatoire.

---

### Bloc 6 — L3540-3548 : RÈGLES ABSOLUES (header 🚨🚨🚨)
```
🔴 EXACTEMENT N séances dans la semaine 1.
🔴 Jours : ...
🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT...
🔴 Le plan TOTAL fait N semaines (tu ne génères que la semaine 1 ici).
🔴 VOLUME S1 = X km — CIBLE BILATÉRALE (somme...) ±5%, ni en dessous, ni au-dessus
🔴 SORTIE LONGUE = séance la PLUS LONGUE, 30-40% du volume hebdo, durée min Y min
```
**Catégorie** : PATCH_DEFENSIF — mais structurant.
**Lignes** : 9 (~250 tokens).
**Verdict** :
- 🔴 GARDER : Nombre séances exact, jours imposés, jour SL imposé, semaine 1 only, durée min SL.
- 🟡 TESTER : "CIBLE BILATÉRALE ±5%" (formulation lourde post-mortem — 3-pro devrait viser le volume sans qu'on précise "ni en-dessous ni au-dessus"). ~50 tokens.
- 🟡 TESTER : "30-40% du volume hebdo" (3-pro connaît la règle Daniels). ~25 tokens.

**Origine probable** : Sprint S1-S2 (vague J2 selon les commentaires "S6: longRunDayInstruction const supprimée" en L3376).

---

### Bloc 7 — L3550-3574 : TYPES DE SÉANCES AUTORISÉS PAR PHASE
Deux branches : trail VK/raide vs route classique.

#### Branche trail VK/steep (L3551-3555, 5 lignes)
```
- fondamental : Jogging, SL+D+, Renfo, Côtes EF
- developpement : + intensification
- specifique : + Répétitions spé
- affutage : Jogging, Sortie courte, Renfo
- recuperation : Jogging plat uniquement
```
**Catégorie** : PATCH_DEFENSIF — métier spécifique trail.
**Verdict** : 🔴 GARDER. La règle "côte modéré dès fondamental pour VK" est non-évidente (un LLM générique éviterait l'intensité en fondamental). ~120 tokens.

#### Branche route (L3556-3574, 19 lignes)
La partie "PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale." (L3563) est 🔴.
Mais le sous-bloc L3557-3562 (~6 lignes, ~180 tokens) "NIVEAU CONFIRMÉ+/4+ SÉANCES : à partir de S3..." est un **patch très spécifique post-mortem** (Sprint J3 probable).

Le sous-bloc L3564-3570 "VARIÉTÉ OBLIGATOIRE en phase fondamentale" (7 lignes, ~200 tokens) :
- "chaque footing doit avoir un thème DIFFÉRENT"
- Exemples : "Footing en aisance respiratoire", "Footing vallonné", "Footing progressif", "Footing nature/trail doux", "Footing technique"
- "NE PAS répéter le même intitulé ou le même format deux fois dans la même semaine"

**Catégorie** : DOCTRINE_PEDAGOGIQUE (variété = valeur produit).
**Verdict** :
- 🟡 TESTER : L3564-3570 peut probablement se condenser en 2 lignes avec 3-pro ("varier les thèmes/intitulés des footings, ne pas répéter"). Gain ~150 tokens.
- 🟡 TESTER : L3557-3562 (CONFIRMÉ+ vitesse légère dès S3) — règle conditionnelle compliquée que 3-pro pourrait déduire. ~180 tokens.

---

### Bloc 8 — L3576-3657 : PLAN PERTE DE POIDS (mega-bloc conditionnel)
**Activé seulement si `goal.includes('Perte')`.** 82 lignes, ~2 100 tokens.

Sous-blocs identifiés :
- L3586-3589 (4 lignes) : header + flags VMA basse / IMC ≥30. **CORE conditionnel**. 🔴 GARDER.
- L3591-3595 (5 lignes) : INTERDICTIONS ABSOLUES (allure spé / phase spé / VMA fond / fractionné si obèse). **PATCH_DEFENSIF**. 🔴 GARDER (règle métier sécurité articulaire).
- L3597-3610 (14 lignes) : SÉANCES PAR PHASE détaillées + variation par phase (FOND/DEV/RECUP). **PATCH_DEFENSIF** lourd. ~350 tokens.
  - 🟡 TESTER : la partie "DIVERSIFIER les séances" L3601-3609 est trop verbeuse. 3-pro peut condenser en 1 phrase. Gain ~150 tokens.
  - 🔴 GARDER : structure phases.
- L3612-3614 (3 lignes) : STRUCTURE 3+1. 🟡 TESTER (règle Daniels classique). ~80 tokens.
- L3616-3628 (13 lignes) : PROGRESSION VOLUME + PROGRESSION SL paliers chiffrés. **PATCH_DEFENSIF** très chiffré.
  - 🟡 TESTER : les paliers exacts ("1h00-1h20/sem", "S5-S7 : SL 40-50 min"). 3-pro peut produire une progression cohérente sans ces paliers explicites. Gain ~300 tokens.
- L3630-3636 (7 lignes) : RENFORCEMENT CADRAGE. 🟢 SUPPRESSION (règle générique, 3-pro la connaît : pas de pliométrie lourde pour profils IMC élevé). ~180 tokens.
- L3638 (1 ligne) : EFFORT PERÇU avec exemples. 🟡 TESTER. ~50 tokens.
- L3640-3645 (5 lignes) : ALTERNANCE MARCHE/COURSE. 🔴 GARDER (règle métier non-évidente : ratio 2min course/1min marche pour S1-3).
- L3646-3647 (2 lignes) : SIGNAUX D'ALERTE médicaux à inclure dans advice. 🔴 GARDER (sécurité produit explicite).
- L3649-3652 (4 lignes) : COHÉRENCE DURÉE/DISTANCE/MAINSET avec calcul. **Doublon partiel avec L3805-3808 (`Bloc 16`)**. 🟢 SUPPRESSION (gardé une fois, pas deux). ~100 tokens.
- L3654 (1 ligne) : NOMMAGE types. 🔴 GARDER.
- L3656 (1 ligne) : PRIORITÉ ABSOLUE séquence sécurité>régularité>... 🔴 GARDER (doctrine).

**Gain bloc Perte de Poids estimé** : ~700-1 000 tokens si 🟢+🟡 supprimés.

---

### Bloc 9 — L3659-3782 : PLAN HYROX (mega-bloc conditionnel)
**Activé seulement si `goal.includes('Hyrox')`.** 124 lignes, ~3 100 tokens.
**Le plus gros bloc du prompt.**

Sous-blocs :
- L3666-3674 (9 lignes) : Header + clarification "course uniquement, fonctionnel à côté" + format Hyrox (8×1km). 🔴 GARDER (doctrine produit unique). ~250 tokens.
- L3676-3705 (30 lignes) : GESTION PAR FRÉQUENCE avec 4 branches (≤2 / 3 / 4 / ≥5). **PATCH_DEFENSIF** très verbeux.
  - 🟢 SUPPRESSION CANDIDAT : 3-pro peut adapter à la fréquence sans qu'on lui dicte chaque structure hebdo. ~700 tokens.
  - 🟡 TESTER : on peut garder un résumé "1 séance clé Hyrox obligatoire + footings EF + renfo, adapté à la fréquence".
- L3707-3714 (8 lignes) : ADAPTATION DÉBUTANT / VMA BASSE. 🔴 GARDER (règle métier : pas de simulation 8×1km avant phase spé). ~200 tokens.
- L3716-3721 (6 lignes) : VOLUME ACTUEL DÉCLARÉ avec 4 branches selon volume. 🟡 TESTER (3-pro infère la progression sans paliers explicites). ~180 tokens.
- L3723-3740 (18 lignes) : CATALOGUE DE SÉANCES HYROX (8 types). 🔴 GARDER (catalogue spécifique = valeur produit Hyrox). ~450 tokens.
- L3742-3746 (5 lignes) : PHASES Hyrox. 🔴 GARDER. ~130 tokens.
- L3748-3751 (4 lignes) : VOLUME RUNNING HYROX (cap SL 1h15 / 12-15km). 🔴 GARDER (règle métier spécifique). ~100 tokens.
- L3753-3759 (7 lignes) : NOMMAGE TITRES Hyrox-flavored. 🟡 TESTER (3-pro peut déduire "titre = X + Hyrox"). ~180 tokens.
- L3761-3763 (3 lignes) : ADVICE PAR SÉANCE — INTERDICTION COPY-PASTE + clarification renfo ≠ stations. 🔴 GARDER (la clarification renfo = anti-bug). ~100 tokens.
- L3765-3772 (8 lignes) : EXEMPLES advice + INTERDIT répéter "couvre la partie course à pied". 🟡 TESTER (exemples = bon, mais 3-pro peut auto-varier). ~200 tokens.
- L3774-3781 (8 lignes) : WELCOMEMESSAGE HYROX spécifique. 🟡 TESTER (3-pro peut produire un welcome adapté sans script détaillé). ~200 tokens.

**Gain bloc Hyrox estimé** : ~1 200 tokens si 🟢+🟡 supprimés (sur 3 100 → -39%).

---

### Bloc 10 — L3784-3791 : PLAN FINISHER
**Activé si Finisher + pas Perte/Maintien/Remise/Hyrox.** 8 lignes, ~250 tokens.
```
- Priorité : EF, régularité, résistance fatigue
- MOINS d'intensité que chrono
- Séances longues à allure confortable
- SL = clé du plan
- Fractionné max 1x/sem en phase dev/spé orienté seuil
- PAS d'objectif temps dans mainSet
```
**Catégorie** : PATCH_DEFENSIF — doctrine produit explicite.
**Verdict** : 🟡 TESTER. 3-pro peut probablement gérer "Finisher" implicitement (pas de pression chrono, plus d'EF). Mais la règle "fractionné orienté seuil pas VMA" est non-évidente → garder partiellement.

---

### Bloc 11 — L3793-3809 : INSTRUCTIONS (8 items numérotés)
17 lignes, ~400 tokens.

- L3796 "1. Génère SEULEMENT la semaine 1" : 🔴 CORE (redondant avec L3491 mais validé par doctrine "pas supprimer sans justifier" — peut éventuellement fusionner).
- L3797 "2. Allures EXACTES dans chaque mainSet" : 🔴 CORE.
- L3798 "3. Message bienvenue orienté OBJECTIF/STRUCTURE (PAS VMA ni allures)" : 🔴 DOCTRINE produit (jamais montrer le calcul à l'user).
- L3799 "4. Évaluation faisabilité HONNÊTE avec chiffres" : 🔴 DOCTRINE sécurité.
- L3800-3804 "5. Renfo obligatoire + répartition + ne pas générer mainSet renfo" : 🔴 GARDER (règle métier critique — sinon Gemini va générer un mainSet renfo qui sera écrasé). ~100 tokens.
- L3805-3808 "6. COHÉRENCE DURÉE/DISTANCE/MAINSET" : 🟡 TESTER (3-pro est meilleur sur la cohérence). Doublon avec L3649-3652 bloc Perte. ~120 tokens.
- L3809 "7. NOMMAGE types" : 🔴 GARDER (contrat JSON).

---

### Bloc 12 — L3811-3816 : TRAIL & FAISABILITÉ
6 lignes (hors interpolations) + le `trailSectionPreview` qui peut atteindre 50+ lignes (bloc ultra100 ou ultra70).

#### Sub-section trail (L3407-3454, hors prompt principal mais injecté)
- VK : 8 lignes 🔴 GARDER (règle métier : volume très réduit 20-45km, priorité côte). ~250 tokens.
- Trail raide : 7 lignes 🔴 GARDER. ~200 tokens.
- Ultra100 : ULTRA70_BB + ULTRA_NIGHT + NUTRITION_SL + buildDplusPromptBlock. 🔴 GARDER (métier ultra non-inférable). ~600 tokens cumulés.
- Ultra70 : idem hors night optionnel. 🔴 GARDER. ~500 tokens.
- Trail standard : buildDplusPromptBlock seul. 🔴 GARDER. ~200 tokens.

**Verdict** : tout trail-related = 🔴 GARDER (métier hyper spécifique, formules D+/km, etc.).

#### feasibilityTextPreview (L3815-3816)
```
📊 CONTEXTE FAISABILITÉ (le welcomeMessage DOIT rester cohérent avec ce texte) :
${feasibilityTextPreview}
```
🔴 GARDER (le calcul de faisabilité est côté code, injecté en texte).

---

### Bloc 13 — L3818 : `buildSafetyInstructions(...)` injecté
**TOUJOURS INJECTÉ.** Lignes équivalent prompt : 30-50 selon profil (~1 200-1 800 tokens dans le cas standard).

Sous-blocs de la fonction (L2898-3119) :

- **Tier risque médical** (L2916-2933, 7-8 lignes) : welcomeMessage doit contenir mention médicale + advice mention douleur. 🔴 GARDER (doctrine sécurité critique). ~250 tokens.
- **Tier IMC ≥35** (L2935-2948, 13 lignes) : précautions articulaires max. 🔴 GARDER. ~350 tokens.
- **Tier IMC 30-35** (L2949-2961, 13 lignes) : précautions renforcées. 🔴 GARDER. ~300 tokens.
- **Tier IMC 25-30 + longue distance** (L2962-2972, 10 lignes) : précautions légères. 🟡 TESTER. ~200 tokens.
- **Senior** (L2975-2982, 8 lignes) : échauffement long, récup 48-72h, max 2 séances intenses, +8%/sem. 🟡 TESTER (3-pro connaît la physiologie senior). ~180 tokens.
- **Reprise après pause** (L2985-2990, 6 lignes) : progression lente, marche/course même pour Inter. 🔴 GARDER (la marche/course pour Inter en reprise est non-évidente). ~120 tokens.
- **DIVERSITÉ SÉANCES** (L2995-3001, 7 lignes) : "MAX 1 SL/sem" + structure 3 freq / 4 freq / 5 freq. 🟢 SUPPRESSION CANDIDAT : 3-pro infère "pas 2 SL/sem" et adapte la répartition. ~180 tokens.
- **Protection débutant** (L3003-3009, 7 lignes) : jamais > 3 séances course, +10%/sem, séance < 45 min. 🔴 GARDER (règle métier). ~150 tokens.
- **Plan long > 24 sem** (L3015-3020, 6 lignes) : message adhérence. 🟡 TESTER (3-pro peut générer un welcome empathique sans script). ~150 tokens.
- **Perte de poids reprise/santé** (L3030-3037, 8 lignes) : mention reprise + signaux d'alerte + ne pas mentionner poids. 🔴 GARDER (doctrine produit explicite "jamais poids"). ~250 tokens.
- **RED-S BMI<20** (L3041-3047, 7 lignes) : prévention RED-S. 🔴 GARDER (clinique). ~200 tokens.
- **Règle PB Finisher** (L3073-3085, 13 lignes) : très précis avec wording validé, variantes PB récent/ancien/régression. 🔴 GARDER (validation Coach FFA selon commentaire L2997). ~350 tokens.
- **Règle blessure explicite** (L3100-3112, 13 lignes) : 3 piliers RECONNAÎTRE/ADAPTER/RECOMMANDER + variantes sévérité + JAMAIS formulation limitante. 🔴 GARDER (validation PM senior + Coach FFA). ~400 tokens.

**Gain `buildSafetyInstructions`** : ~330 tokens si 🟢+🟡 supprimés (sur ~3 000 → -11%). Bloc beaucoup plus dur à dégraisser — sécurité.

---

### Bloc 14 — L3820-3862 : FORMAT JSON
43 lignes, ~600 tokens.
**Catégorie** : CORE structurel.
**Verdict** : 🔴 GARDER intégralement. Sans schema explicite, Gemini hallucine la structure.

Note : on pourrait passer en `responseSchema` API native côté config Gemini → -600 tokens hors prompt. À investiguer indépendamment.

---

## Redondances détectées

### 1. `buildDplusPromptBlock` × 3 (L3436, L3447, L3453)
**Résultat de l'investigation** : **PAS de redondance**. Les 3 appels sont dans une chaîne ternaire imbriquée mutuellement exclusive :
- L3436 : branche `distance >= 100` (ultra100)
- L3447 : branche `distance >= 70` (ultra70)
- L3453 : branche else (trail standard)

Un seul est injecté par génération. ✅ Code clean.

### 2. Double règle COHÉRENCE DURÉE/DISTANCE/MAINSET
- L3649-3652 (dans bloc Perte de Poids, conditionnel) avec calcul détaillé
- L3805-3808 (dans Instructions, toujours injecté) avec calcul détaillé identique

→ Un plan **Perte de Poids voit la règle 2 fois**. **🟢 SUPPRESSION** L3649-3652 (gardé dans Instructions globales). Gain ~100 tokens pour profils Perte.

### 3. Mentions "ne pas mentionner poids/IMC"
Répété au moins **4 fois** dans `buildSafetyInstructions` :
- L2947 (IMC ≥35)
- L2960 (IMC 30-35)
- L2970 (IMC 25-30 long)
- L3037 (Perte de poids)
- L3047 (RED-S)

→ Un user "Perte de poids + IMC 32" voit la règle **3 fois**. 🟢 **CONSOLIDATION POSSIBLE** : extraire en constante `NO_WEIGHT_MENTION` injectée 1 fois en fin de safety. Gain ~150 tokens cumulés.

### 4. Mentions "cross-training interdit"
Identique : L2948, L2961, L2971. Même règle, 3 fois pour profils IMC élevé. 🟢 **CONSOLIDATION**. Gain ~100 tokens cumulés.

### 5. "PAS de fractionné/VMA en phase fondamentale"
- Bloc 7 route L3563
- Bloc 8 Perte de poids L3594
Pour profils Perte de poids = double injection. 🟡 Pas grave (cohérence renforcée), mais consolidable.

---

## Liste candidats 🟢 (suppression probable avec 3-pro)

| # | Bloc | Lignes | Tokens | Raison |
|---|---|---|---|---|
| 1 | Hyrox — GESTION PAR FRÉQUENCE branches détaillées | L3679-3705 (27) | ~700 | 3-pro adapte la structure hebdo à la fréquence sans script |
| 2 | Doublon COHÉRENCE DURÉE/DISTANCE (bloc Perte) | L3649-3652 (4) | ~100 | Déjà dit dans Instructions L3805-3808 |
| 3 | DIVERSITÉ SÉANCES — structure freq 3/4/5 dans buildSafetyInstructions | L2995-3001 (7) | ~180 | "Max 1 SL/sem" + 3-pro infère répartition |
| 4 | Perte de Poids — RENFORCEMENT CADRAGE détaillé | L3630-3636 (7) | ~180 | Règle générique (pas de pliométrie pour IMC élevé), 3-pro la connaît |
| 5 | Consolidation 4× "ne pas mentionner poids/IMC" → 1 constante | dispersé | ~150 | Doctrine répétée inutilement |
| 6 | Consolidation 3× "cross-training interdit" → 1 constante | dispersé | ~100 | Idem |
| 7 | Bloc 7 — Sous-section "VARIÉTÉ phase fondamentale" verbeux | L3564-3570 (7) | ~150 | 3-pro varie naturellement les intitulés footings (à condenser en 1 phrase) |
| 8 | Perte de Poids — DIVERSIFIER les séances exemples détaillés | L3601-3609 (9) | ~250 | Liste exhaustive remplaçable par 1 directive "varier" |

**Total candidats 🟢** : ~1 810 tokens (~19% du prompt cas pire).

---

## Liste candidats 🟡 (à tester sur 5 profils)

| # | Bloc | Lignes | Tokens | Profil de test |
|---|---|---|---|---|
| A | Bloc 6 — "CIBLE BILATÉRALE ±5%" + "30-40% volume hebdo" | L3547-3548 (2) | ~75 | Inter Marathon Finisher : vérifier volume S1 et % SL |
| B | Bloc 7 — CONFIRMÉ+ 4+ séances : vitesse légère S3 | L3557-3562 (6) | ~180 | Confirmé Marathon 4 séances, vérifier S3 contient bien fartlek/gammes |
| C | Bloc 8 Perte — STRUCTURE 3+1 explicite | L3612-3614 (3) | ~80 | Perte 12 sem, vérifier récup S4/S8/S12 |
| D | Bloc 8 Perte — PROGRESSION VOLUME + SL paliers chiffrés | L3616-3628 (13) | ~300 | Perte VMA basse, vérifier volume S1 et SL plafonnée |
| E | Bloc 8 Perte — EFFORT PERÇU exemples | L3638 (1) | ~50 | Vérifier ressenti dans mainSet sans script |
| F | Bloc 9 Hyrox — VOLUME ACTUEL 4 branches | L3716-3721 (6) | ~180 | Hyrox vol 0 / vol 20 / vol 40 |
| G | Bloc 9 Hyrox — NOMMAGE TITRES script | L3753-3759 (7) | ~180 | Hyrox 3 séances, vérifier titres "— Hyrox" |
| H | Bloc 9 Hyrox — EXEMPLES advice détaillés | L3765-3772 (8) | ~200 | Hyrox 4 séances, vérifier diversité advice |
| I | Bloc 9 Hyrox — WELCOMEMESSAGE script roadmap | L3774-3781 (8) | ~200 | Hyrox 16 sem, vérifier welcome structuré |
| J | Bloc 10 Finisher — règles détaillées | L3784-3791 (8) | ~250 | Marathon Inter Finisher sans PB |
| K | Bloc 11 Instructions — COHÉRENCE DURÉE/DISTANCE | L3805-3808 (4) | ~120 | Tous profils, vérifier mainSet vs duration |
| L | Safety — IMC 25-30 longue distance | L2962-2972 (10) | ~200 | Marathon IMC 27 |
| M | Safety — Senior adaptations | L2975-2982 (8) | ~180 | 52 ans Marathon Inter |
| N | Safety — Plan long > 24 sem | L3015-3020 (6) | ~150 | Marathon 28 sem |

**Total candidats 🟡** : ~2 345 tokens (potentiel gain additionnel ~25% si tests OK).

**Critère de validation général** : si bug typologie `mxjulien02` (cas particulier) ou autre régression connue réapparaît, on remet le bloc concerné.

---

## Liste 🔴 (garder même avec 3-pro)

| Bloc | Pourquoi non-supprimable |
|---|---|
| L3491 Rôle système | Identité du modèle |
| L3493-3504 Profil | Données contextuelles |
| L3505-3522 Lieux | Doctrine produit (suggestedLocations + locationSuggestion = différenciation) |
| L3524-3527 pacesSection | Inputs quantitatifs |
| L3530-3538 Périodisation | Contexte structurel |
| L3543-3546 RÈGLES nb séances/jours/SL day/durée totale/min SL | Contrat utilisateur |
| L3551-3555 Phases trail VK/steep | Métier spécifique, règle côte fondamental non-évidente |
| L3563 "PAS seuil/fractionné/VMA en fond" (route) | Doctrine d'entraînement |
| L3586-3595 Perte — header + INTERDICTIONS | Métier sécurité |
| L3597-3610 Perte — séances par phase (sauf détails 🟡) | Structure plan |
| L3640-3645 Perte — MARCHE/COURSE ratios | Règle métier non-évidente |
| L3646-3647 Perte — SIGNAUX D'ALERTE médicaux | Sécurité produit |
| L3654 Perte — NOMMAGE types | Contrat JSON |
| L3656 Perte — PRIORITÉ ABSOLUE | Doctrine |
| L3666-3674 Hyrox header + format 8×1km | Doctrine produit unique |
| L3707-3714 Hyrox débutant adaptation | Règle non-évidente (4→6→8 km progression) |
| L3723-3740 Hyrox catalogue séances | Catalogue spécifique = valeur produit |
| L3742-3746 Hyrox phases | Structure |
| L3748-3751 Hyrox VOLUME cap (SL 1h15) | Règle métier critique |
| L3761-3763 Hyrox advice + renfo ≠ stations | Anti-bug renfo Hyrox |
| L3796-3804 Instructions 1-5 | Contrat de génération |
| L3809 Instructions 7 NOMMAGE | Contrat JSON |
| L3811-3816 Trail/Faisabilité injectés | Métier + calculs code |
| L3820-3862 FORMAT JSON | Schema (ou passer en responseSchema API) |
| Safety — Tier risque médical (toutes versions) | Sécurité critique |
| Safety — IMC ≥35 + 30-35 précautions | Sécurité articulaire |
| Safety — Reprise après pause marche/course | Règle non-évidente Inter |
| Safety — Protection débutant 3 séances max | Règle métier |
| Safety — Perte poids reprise/santé + NEVER poids | Doctrine produit (validation Coach FFA) |
| Safety — RED-S BMI<20 | Clinique |
| Safety — Règle PB Finisher (wording validé Coach FFA) | Doctrine produit + validation experte |
| Safety — Règle blessure explicite 3 piliers (wording validé Coach FFA) | Doctrine produit + validation experte |
| Trail VK / steep / ultra100 / ultra70 / standard | Métier spécialisé non-inférable |
| `buildDplusPromptBlock` D+ par séance | Calcul code, instructions structurées elevationGain |

**Total 🔴** : ~5 200 tokens (~55% du prompt cas pire). Le **vrai socle non-compressible**.

---

## Estimation gain potentiel

| Scenario | Tokens prompt | Réduction vs cas pire | Latence estimée (Flash baseline) |
|---|---|---|---|
| Prompt actuel (cas pire — user multi-flags) | ~9 300 | — | référence |
| Suppression 🟢 seule | ~7 490 | **-19%** | -10 à -15% |
| Suppression 🟢 + 🟡 (si tests OK) | ~5 145 | **-45%** | -25 à -40% |
| Plancher dur 🔴 + interpolations | ~5 200 | -44% | similaire à 🟢+🟡 |

**Recommandation tactique** :
1. Démarrer par 🟢 (gains certains, risque faible).
2. Tester 🟡 par lots thématiques : (A,B,K) volume/cohérence d'abord, puis (D,F) chiffrés profil, puis (G,H,I) Hyrox scripts.
3. **Investiguer Bloc 4 séparément** : ajouter "Allure spé ${subGoal}" au `pacesSection` du preview, car la règle PB L3074 y fait référence sans qu'elle existe (bug latent indépendant des gains de tokens).

---

## Recommandation tests (5 profils prioritaires)

Pour valider 🟡 sans régression :

1. **`mxjulien02` régression test** : profil historique (selon mémoire "bug type mxjulien02"). Catch les régressions de cohérence.
2. **Marathon Inter Finisher + PB déclaré** : valide bloc 4 + règle PB + bloc 10 Finisher.
3. **Hyrox Inter 4 séances, vol actuel 30km, prev time 1h25** : valide blocs 9 (fréquence + volume + nommage + welcome).
4. **Perte de poids VMA 11, IMC 32, débutant** : valide bloc 8 + safety IMC tier 2 + RED-S faux pour cet IMC.
5. **Ultra100 confirmé 30 sem + blessure ITBS ancienne** : valide trail ultra + buildDplusPromptBlock + règle blessure (variante ancienne → suggestion souple).

**Critères de validation par test** :
- ✅ Volume S1 dans ±5% de la cible.
- ✅ Type renfo présent et non-running.
- ✅ Pas de séance "Repos" dans le plan.
- ✅ Pour Finisher+PB : welcomeMessage cite le PB ET une allure d'entraînement.
- ✅ Pour blessure active : welcomeMessage contient recommandation kiné/médecin.
- ✅ Pour Hyrox : titres séances course mentionnent "Hyrox", pas le titre renfo.
- ✅ Variété footings (pas 2 fois le même intitulé/format).
- ✅ Locations cohérentes avec type de séance (piste pour VMA, etc.).
- ✅ Jamais de mention poids/IMC/corpulence dans aucun champ user-facing.
- ✅ JSON valide avec tous les champs obligatoires remplis.

---

## Annexes — Notes sur les helpers injectés

- **`buildSafetyInstructions`** (`geminiService.ts:2898-3119`) : 220 lignes de code TS, génère ~30-50 lignes de prompt selon flags. Plus gros levier de consolidation (4× "no weight" + 3× "no cross-training").
- **`buildDplusPromptBlock`** (`geminiService.ts:3170-3215`) : 45 lignes, génère ~6 lignes preview. Pas de redondance détectée. Gated par feature flag `VITE_R3_PROMPT_DPLUS_ENABLED` (cleanly désactivable).
- **`NUTRITION_SL_BLOCK`** (`geminiService.ts:3139`) : constante d'1 ligne, déjà extraite proprement.
- **`ULTRA70_BACK_TO_BACK_BULLETS`** (`geminiService.ts:3142-3147`) : constante 6 lignes, déjà extraite.
- **`ULTRA_NIGHT_RUN_BULLETS`** (`geminiService.ts:3153-3157`) : constante 5 lignes, déjà extraite.
