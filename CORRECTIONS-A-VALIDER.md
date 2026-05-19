# Récap exhaustif des corrections à apporter aux 6 plans

> Document de validation avant application en base Firestore.
> Source : audit expert + consignes utilisateur du 13 mai 2026.

---

## Consignes utilisateur (rappel)

| # | Consigne |
|---|---|
| 1 | Drapeau rouge médical : NE PAS bloquer, MAIS baisser le score → la modal de validation existante (`FeasibilityWarningModal`) se déclenchera, l'utilisateur clique "OK" pour générer la suite. |
| 2 | IRRÉALISTE : pas de blocage non plus, mais prévention dans message d'accueil + score bas. |
| 3 | Course récente détectée → S1 (et S2 en plan complet) en récupération active (pas SL). Renommer phases. |
| 4 | Volume actuel non déclaré : reformuler message "basé sur ton niveau et fréquence déclaré, on estime que tu fais X km/sem. Si ce n'est pas le cas, régénère pour éviter blessures." |
| 5 | D+ à 0 sur séance vallonnée : calculer D+ optimal et corriger dans le plan. |
| 6 | Champ "course récente" dans questionnaire à ajouter (futur). |
| 7 | IMC ≥ 27 → warning médical dans intro (sans mentionner poids/IMC explicitement). |

---

## CORRECTIONS PLAN PAR PLAN

### 📌 Plan A — deugnilson freemium (1778648613186)

**Profil** : 44 ans, 113 kg / 201 cm → **IMC 28**, Trail 20km/1300m D+ 2h55, VMA 15.5 estimée.

**Corrections** :
1. **Warning IMC** : ajouter au `feasibility.safetyWarning` (sans nommer poids/IMC)
   - Texte à ajouter : *"Compte tenu de ta morphologie, sois progressif sur les volumes et privilégie les surfaces souples ; un avis médical est recommandé avant cet objectif trail intense."*
2. **Pas d'autre correction** : volume estimé déjà mentionné dans le message original ("VMA estimée, marge d'incertitude").

---

### 📌 Plan B — bruno.grange (1778673418021)

**Profil** : 43 ans, 90 kg / 181 cm → **IMC 27.5**, 5km en 20min, VMA 13.6 (chronos solides).

**Corrections** :
1. **Warning IMC** : ajouter au `feasibility.safetyWarning`
   - Texte : *"Compte tenu de ta morphologie, sois progressif sur les volumes et privilégie les surfaces souples ; un avis médical est recommandé avant un objectif compétitif intense."*
2. **D+ à 0 sur "Footing vallonné" S1 Lundi** (6.0 km, 40 min)
   - D+ actuel : 0m → D+ recommandé : **60-90m** (~15 m/km)
   - Application : `session.elevationGain = 75`

---

### 📌 Plan C — mainmain (1778675188561)

**Profil** : 49 ans, 85 kg / 187 cm (IMC 24.3 OK), Semi 1h45, marathon 3h58, VMA 13.3.

**Corrections** :
1. **BUG DOUBLON SL** — séance Jeudi
   - Actuel : `type=Sortie Longue`, titre "Footing vallonné en aisance", 1h45 / 15.6 km
   - À corriger : `type=Jogging` (au lieu de Sortie Longue) — c'est un footing long, pas la SL
   - La vraie SL reste celle du Dimanche (1h04 / 9.5 km)
2. **D+ à 0 sur "Footing vallonné" Jeudi** (15.6 km, 1h45)
   - D+ recommandé : **150-235m** (~10-15 m/km pour vallonné modéré)
   - Application : `session.elevationGain = 180`
3. **D+ sur "Sortie longue" Dimanche** (9.5 km, 1h04)
   - Si maintien intention "endurance fondamentale" plat → garder 0m
   - À valider : si on doit ajouter du D+ ou pas

---

### 📌 Plan D — lameymichel@yahoo (1778654000218)

**Profil** : 42 ans, 175 cm / 72 kg (IMC 23.5 OK), Trail 105km/4000m D+, VMA 14.8 (10km 45min), **fracture fatigue tibiale il y a 1 an**.

**Faisabilité actuelle** : IRRÉALISTE (correct).

**Corrections** :
1. **Reformuler mention volume dans `feasibility.message`**
   - Actuel : *"Volume actuel de 35km/sem insuffisant pour un trail de 105km..."*
   - Nouveau : *"On estime ton volume à 35km/sem (basé sur ton niveau Confirmé et fréquence 5sé/sem). Si tu cours réellement plus, régénère ton plan en saisissant ton volume pour des recommandations adaptées."*
2. **Pas de correction S1** : la S1 est déjà raisonnable (5 séances, total 30 km, SL 15.5 km / 585 m D+), et le statut IRRÉALISTE est cohérent.

---

### 📌 Plan E — lamey.michel@gmail (1778669503908)

**Profil** : 42 ans, 175 cm / 71 kg (IMC 23.2 OK), Trail 105km/4000m D+, VMA 14.5, **fracture fatigue tibiale + 62km/2600m D+ terminé il y a ~4 jours**.

**Faisabilité actuelle** : RISQUÉ.

**Corrections** :
1. **Reformuler mention volume** (idem Plan D)
2. **🚨 RECONSTRUCTION COMPLÈTE DE LA S1** selon protocole récup post-ultra (validation coach effectuée)

   **S1 actuelle** (à remplacer) :
   ```
   Mardi    | Jogging       | 41 min / 6.7 km / D+75m
   Jeudi    | Jogging       | 31 min / 5.1 km / D+200m
   Vendredi | Renforcement  | 45-50 min — Renfo Trail Focus excentrique (4 tours, 13 exos, sauts dirs)
   Samedi   | Jogging       | 36 min / 5.9 km / D+75m
   Dimanche | Sortie Longue | 1h41 / 16.4 km / D+650m
   ────────
   Total : 34 km / 1000m D+
   ```

   **S1 cible** (selon coach expert, phase "Récupération active post-course longue") :
   ```
   Mardi    | Cross-training | Vélo 40 min Z1 (60-65% FCM) — souple plat, draine déchets métaboliques
   Jeudi    | Jogging        | 25 min / 4 km / D+30m / 65-70% FCM — 1er test plat surface souple
   Vendredi | Renforcement   | 30-40 min mobilité + gainage isométrique (PAS d'excentrique, PAS de sauts)
   Samedi   | Jogging récup  | 30 min / 5 km / D+50m / 65-70% FCM
   Dimanche | Cross-training | Vélo endurance 1h15 Z1-Z2 (65-72% FCM) — recharge aérobie sans impact
   ────────
   Total course : 9 km / 80m D+ + 2h vélo
   ```

   **Justification** :
   - Fenêtre de récupération biologique post-ultra 62km/2600D+ = **14 jours minimum** selon coach
   - Risque osseux résiduel élevé vu ATCD fracture fatigue tibiale
   - Renfo Trail Focus excentrique à J+11 (S1 actuelle) = inadapté → reporter à S3 minimum

3. **Renommer la phase de la S1** : `phase: "récupération"` au lieu de `"fondamental"`
4. **Renommer le `theme` S1** : `"récupération post-course longue"` au lieu de `"fondamental"`

---

### 📌 Plan F — estenoza.tom (1778677412470)

**Profil** : 25 ans, 184 cm / 83 kg (IMC 24.5 OK), Trail 87km/2000m D+, VMA 15.5 **estimée (sans chrono)**, **"Douleur osseuse à la hanche"** déclarée.

**Faisabilité actuelle** : BON (anormal vu douleur osseuse).

**Corrections** :
1. **Baisser le score à 25** → statut **RISQUÉ** (forcer recalcul ou écrire directement)
2. **Reformuler `feasibility.message`** :
   - Retirer : *"Ton volume actuel de 60km/sem est une excellente base"* (volume estimé, pas déclaré)
   - Ajouter en tête : *"Une douleur osseuse à la hanche déclarée nécessite un avis médical avec imagerie avant tout démarrage. Ce diagnostic peut révéler une fracture de stress, une ostéonécrose ou un conflit fémoro-acétabulaire — un feu vert médical est indispensable."*
   - Reformuler le volume : *"On estime ton volume à 60km/sem (basé sur ton niveau Confirmé, fréquence 5sé/sem et objectif ultra). Si ce n'est pas le cas, régénère ton plan."*
3. **Renforcer `safetyWarning`** :
   - Ajouter : *"Fracture de stress, ostéonécrose ou conflit articulaire doivent être écartés par imagerie avant de démarrer. La modal de validation indiquera la contre-indication."*
4. **Pas de correction structurelle de la S1** (déjà déclarée RISQUÉE, l'utilisateur cliquera "OK" pour bypass — c'est la consigne 1).

---

### 📊 Synthèse des plans à corriger

| Plan | Patch volume estimé | Warning IMC | D+ ajustements | Reconstruction S1 | Score / Statut | Reclassement séance |
|---|---|---|---|---|---|---|
| **A** deugnilson freemium | — | ✅ | — | — | — | — |
| **B** bruno.grange | — | ✅ | ✅ (1 séance) | — | — | — |
| **C** mainmain | — | — | ✅ (1-2 séances) | — | — | ✅ (Jeudi SL→Jogging) |
| **D** lameymichel@yahoo | ✅ | — | — | — | — | — |
| **E** lamey.michel@gmail | ✅ | — | (intégré dans recompo S1) | ✅ | — | — |
| **F** estenoza.tom | ✅ | — | — | — | ✅ (BON→RISQUÉ) | — |

---

## QUESTIONS POUR L'AGENT COACH EXPERT

1. **Bruno.grange** — D+ = 75m sur "Footing vallonné" 6 km en S1 phase fondamentale (objectif 5 km en 20min) : valide ou trop ?
2. **Mainmain** — Reclasser Jeudi "Footing vallonné 1h45" comme `type=Jogging` au lieu de `Sortie Longue` : valide ? Ou faut-il aussi raccourcir cette séance ?
3. **Mainmain** — D+ = 180m sur cette même séance "vallonné" 15.6 km : valide ?
4. **Lamey.michel** — S1 reconstruite (vélo Z1 + 2 footings test + renfo isométrique) : valide la structure ? Manque-t-il quelque chose ?
5. **Lamey.michel** — Renommer phase "fondamental" → "récupération" pour S1 : pertinent ?
6. **Estenoza.tom** — Forcer le statut RISQUÉ via score 25 alors que le coureur est jeune (25 ans) avec uniquement une douleur à la hanche : justifié ?
7. **Tous** — Warning IMC ≥ 27 sans nommer le poids : reformulation acceptable d'un point de vue coach ?

---

## PATCHES CODE À DISCUTER APRÈS

(À voir après application des corrections plan)

1. `feasibilityService.ts` : ajouter `MEDICAL_RED_FLAGS` regex pour blessures osseuses → forcer score ≤ 25
2. `feasibilityService.ts` : reformuler messages "Volume actuel" → "On estime"
3. `feasibilityService.ts` : ajouter `reasons.push` pour IMC ≥ 27 (avec wording sans mention poids)
4. `planValidator.ts` : auto-correction D+ sur séance "vallonnée" (titre contient "vallonn|colline|côte")
5. `geminiService.ts` (prompt) + `validator` : détection course récente + structure récup post-ultra
6. `questionnaire.tsx` : ajouter champ `lastRace { date, distance, elevation, type }`
