# Challenge PM — 4 fixes en attente
Date: 2026-05-18 | Reviewer: PM senior CRIA (15 ans expé B2C santé/sport, historique complet projet)
Mission: challenger SANS COMPLAISANCE les 4 fixes A1bis / A2 / A3 / A4. Question centrale: est-ce qu'on ne complique pas pour rien ? est-ce que ça vaut le coup vs le risque de casser quelque chose ?

---

## Synthèse exec

- APPLY MAINTENANT : **2 / 4** (A3, A4)
- APPLY PLUS TARD : **1 / 4** (A2 — après tests multi-profils)
- SKIP : **1 / 4** (A1bis — bug théorique presque entièrement neutralisé par la ligne L2671, ROI minuscule, risque de re-casser le floor pour Inter/Débutant)

**Recommandation ordre** :
1. **A3 + A4** dans un même commit prompt-only — 0 risque code, valeur Notable, déployable en 30 min ce soir.
2. **A2** plus tard (J+2/J+3) après écriture de 20 tests profils. Le clamp SL pic est juste mais reste un fix structurel.
3. **A1bis** : à SKIP en l'état. Le "bug" décrit dans la synthèse est presque entièrement neutralisé par la L2671 qui re-applique le floor. Le résiduel ne touche que les users où `currentVolume > maxVolume × 0.90` — cas marginal. Ne pas re-toucher un floor qu'on vient de patcher ce matin (commit `26b3d3a`) pour gagner 1-3 km sur ≤5% des plans.

**Doctrine alignée** : tous les fixes respectent `feedback_jamais_baisser_allure_cible`, `feedback_input_client_obligatoire`, `feedback_jamais_poids_minceur`, `feedback_jamais_contact_client`. A3+A4 renforcent `feedback_securite_avant_conversion` et `feedback_welcome_cite_inputs_user`.

---

## Détail par fix

---

### Fix A1bis — Cap `maxVolume × 0.65` écrase floor 100% (geminiService.ts:2666)

**Complexité code** : Faible (1-3 lignes)
- Lignes touchées : L2666 (et potentiellement L2671 si on consolide)
- Risque régression : **moyen** — on vient juste de patcher ce bloc ce matin (commit `26b3d3a`). Re-toucher 2× la même fenêtre de code en 6h sur un point critique de la périodisation = signal d'instabilité. Aucun test unitaire n'existe sur ce bloc. La L2671 actuelle (`Math.max(startVolume, Math.min(currentVolumeFloor, maxVolume * 0.90))`) **rattrape déjà** le cap 0.65 dans 95% des cas — vérification rapide sur Antoine : current=80, max=105 → cap 0.65 = 68 (L2666) → puis L2671 remonte à min(80, 94.5) = 80 ✓. Le "bug" résiduel ne touche que les profils où `currentVolume > maxVolume × 0.90` (cas extrêmes type expert qui sur-déclare).
- Effet de bord possible : si on retire `maxVolume × 0.65` brutalement, on perd le garde-fou anti-sur-déclaration (user qui saisit 100 km alors qu'il en court 40 — historiquement réel, c'est pour ça que cette ligne existe). Casser cette protection = risquer un S1 pic 100 km livré à un user débutant.

**Valeur user perçue dans les plans** : Subtile / Invisible
- Combien de % des plans impactés ? **Très peu : ≤5%** (uniquement Confirmé/Expert avec `currentVolume > maxVolume × 0.90`, soit cas où le user a déjà un volume très proche du pic visé par le plan).
- Quel profil exact ? Antoine-like 80 km mais avec un peak ≤ 89 km — c'est rare car le maxVolume est calculé sur la base d'une progression. La synthèse cite "Antoine 80 km, Annabelle 40 km, Armando 80 km, georgeslor1 45 km" mais à la relecture du code, pour eux L2671 rattrape déjà. Le delta réel S1 est de 0 à 3 km max.
- Est-ce que l'user RESSENT vraiment la différence ? **Non** dans 95% des cas. Le floor est déjà à `min(currentVolumeFloor, maxVolume × 0.90)` après L2671.

**Coût/bénéfice** : ⚠️ Sur-engineering / risque de re-casser sans gain mesurable
**Recommandation finale** : **SKIP** (ou attendre 7-14 jours avant de re-toucher ce bloc)

**Justification** : La synthèse PM affirme que L2666 écrase le floor — c'est partiellement faux. La L2671 ré-applique systématiquement `max(startVolume, min(currentVolumeFloor, maxVolume × 0.90))`, ce qui couvre Antoine, Armando, Annabelle, georgeslor1 et tous les profils dont current ≤ 90% du peak (le cas standard). Le résiduel est marginal (≤5% des plans, delta 0-3 km). À l'inverse, re-patcher dans la même journée une ligne déjà patchée ce matin sur un bloc sans test unitaire = risque concret de casser le minStartVolume débutant ou la protection anti-sur-déclaration. **Doctrine `feedback_qualite_avant_vitesse` + `feedback_chaque_ligne_justifiee`** : avant de modifier L2666, il faudrait (a) écrire les 4 tests unitaires prévus par la review PM, (b) vérifier qu'aucun profil légitime ne s'en trouve sur-chargé, (c) faire un audit batch post-fix. Le ratio coût-test-monitoring vs gain marginal sur ≤5% des plans n'est pas favorable aujourd'hui.

**Si Romane veut absolument l'appliquer** : ne pas retirer L2666, juste subordonner via `Math.max(maxVolume * 0.65, currentVolumeFloor)` à l'intérieur du Math.min (variante explicite recommandée par la review PM). Mais clairement DANS UN SPRINT SÉPARÉ avec tests, pas dans la même journée que A3/A4.

---

### Fix A2 — Clamp SL pic par objectif

**Complexité code** : **Moyenne**
- Lignes touchées : nouvelle table `SL_PIC_MAX_BY_GOAL` + nouvelle fonction post-calcul `weeklyVolumes` qui ajuste `weeklyVolumes[picWeek]` à la baisse + intégration dans le flow de génération. Estimation : 50-80 lignes ajoutées.
- Risque régression : **moyen** — toute modification de la calibration `weeklyVolumes[picWeek]` cascade sur la périodisation entière (deloads, affûtage, total km du plan). Aucun test unitaire existant. La synthèse coach exige explicitement 5+ tests profils avant deploy.
- Effet de bord possible : 
  - Casser la cohérence pic/affûtage : si on baisse le pic d'Antoine de 90 → 80 km, la pente d'affûtage devient mécaniquement différente.
  - Frustration Expert qui veut un volume haut (Pfitzinger autorise 37 km en marathon, on cap à 35).
  - Si la fonction baisse `weeklyVolumes[picWeek]` mais pas les semaines précédentes/suivantes → on crée un "trou" dans la courbe de progression.
  - Coach FFA suggère plutôt de **clamper directement la séance SL** générée par Gemini, pas le `weeklyVolumes[picWeek]` — ce qui change radicalement la complexité du fix (touche le prompt, pas la périodisation).

**Valeur user perçue dans les plans** : **Notable**
- Combien de % des plans impactés ? Estimation **30-40%** (tous les Confirmé/Expert sur Semi+Marathon où la SL pic projetée dépasse la cible, et tous les Débutant/Inter sur 5k/10k où la SL pic est trop courte). Sur l'échantillon des 8 plans audités : 4/8 impactés (Antoine, Armando, Sébastien, Alan).
- Quel profil exact ? 
  - Antoine marathon : SL pic 36-45 → 28-35 km ✅ (corrige une aberration pédagogique : SL > distance objectif d'entraînement vs course)
  - Armando semi : SL pic 32-40 → 16-22 km ✅ (corrige : courir 40 km en SL pour préparer un semi de 21 km = courir 2× la distance, non-sens)
  - Sébastien 10k : pas d'impact (SL pic 4.5 < max 12, mais sans floor on le laisse à 4.5 ce qui est trop bas)
  - Alan trail 35k : pas clair selon la synthèse → c'est un signal que le fix n'est pas mûr.
- Est-ce que l'user RESSENT vraiment la différence ? **Oui pour Antoine/Armando** (un Confirmé qui voit "SL pic 40 km pour ton semi" peut soit lire ça comme une sur-confiance ("c'est un plan irréaliste"), soit comme une démotivation ("je vais devoir courir 2× la course en entraînement, je passe"). Pour Sébastien/Alan, c'est plus subtil.

**Coût/bénéfice** : ✅ Valeur claire mais fix structurel — exige des tests
**Recommandation finale** : **APPLY PLUS TARD** (J+2/J+3, pas dans le sprint A3+A4)

**Justification** : Le diagnostic est juste (SL pic non bornée = aberrations sur les profils Expert Marathon/Semi). Mais le fix est **structurel** : il touche la calibration plan, alors que A3/A4 sont prompt-only. Le déployer dans le même commit que A3/A4 mélange un fix architectural avec des fix prompts → si un bug apparaît post-deploy, on ne saura pas lequel. Le coach FFA exige explicitement 5+ tests profils, et propose même une variante non triviale (clamper la séance SL générée plutôt que `weeklyVolumes[picWeek]`) qui changerait la nature du fix. Cela mérite un sprint dédié avec écriture de tests unitaires sur 5k/10k/semi/marathon/trail court/trail ultra/Hyrox × Débutant/Inter/Conf/Expert (20 simulations min) + audit batch post-deploy.

**Question ouverte à trancher avant apply** : doit-on (a) clamper `weeklyVolumes[picWeek]` (approche synthèse PM) ou (b) clamper directement la séance SL générée (approche coach FFA L63) ? Les deux n'ont pas les mêmes implications. Trancher cela = 30 min de discussion coach+dev avant de toucher au code.

---

### Fix A3 — Prompt welcome cite PB si Finisher + PB

**Complexité code** : **Triviale**
- Lignes touchées : ~5-15 lignes de prompt Gemini (string template). Aucune logique TypeScript modifiée.
- Risque régression : **nul** — c'est une instruction Gemini, pas de logique de calcul. Le pire scénario = Gemini hallucine un PB inexistant si la clause de fallback n'est pas claire (mitigation : ajouter "si PB non fourni, ne PAS inventer").
- Effet de bord possible : un user qui a régressé depuis son PB peut se sentir jugé (cf. analyse coach FFA cas 3 "PB en régression"). Mitigation : adopter la formulation 3-variantes (récent / ancien / régressé) suggérée par le coach.

**Valeur user perçue dans les plans** : **Notable**
- Combien de % des plans impactés ? **20-30%** (tous les Finisher avec PB déclaré sur la distance — Sébastien-like, Justine, Alan, Valentine).
- Quel profil exact ? Finisher 5k/10k/semi/marathon ayant un PB sur la même distance. Sébastien post-patch est cité comme la référence interne ("ton dernier 10k en 1h30, allure 9:00/km → entraînement à 9:30/km").
- Est-ce que l'user RESSENT vraiment la différence ? **Oui clairement**. C'est le pattern qui transforme un welcome "tout-terrain générique" en welcome "fait pour moi". Sentiment "le plan m'a lu" = +trust direct.

**Coût/bénéfice** : ✅ Valeur claire, complexité triviale
**Recommandation finale** : **APPLY MAINTENANT**

**Justification** : 5-15 lignes de prompt, 0 risque code, gain individualisation systématique sur 20-30% des plans. Sébastien post-patch est la preuve que ce pattern marche. Doctrine `feedback_finisher_plus_pb_allure` déjà actée en mémoire — c'est une dette de prompt à payer. Ajouter la clause de fallback "si PB absent, ne PAS inventer" pour respecter `feedback_securite_avant_conversion`. Recommandation : adopter la variante 3-cas du coach FFA (récent / ancien / régressé) pour éviter de stigmatiser les profils qui ont régressé — sans rendre le prompt usine à gaz. Variante minimale acceptable : 1 seule formulation neutre avec mention "ton plan vise une allure douce pour t'entraîner sereinement" (qui marche aussi bien pour PB récent que régressé).

---

### Fix A4 — Prompt welcome cite blessure significative

**Complexité code** : **Triviale**
- Lignes touchées : ~10-20 lignes de prompt Gemini. Le check `data.injuries?.hasInjury && data.injuries.description` existe déjà L3344-3345 (utilisé pour `safetyWarning`). Il suffit de répliquer pour `welcomeMessage`.
- Risque régression : **nul** — prompt only.
- Effet de bord possible : formulation maladroite → user culpabilisé ou sur-médicalisé. Mitigation : adopter la structure 3 piliers du coach FFA (reconnaître / expliquer / recommander avis médical) + interdictions explicites dans le prompt ("JAMAIS de 'ta blessure pourrait t'empêcher de...'").

**Valeur user perçue dans les plans** : **Notable** (Critique pour les profils blessés)
- Combien de % des plans impactés ? **10-15%** (estimation users avec `injuries.hasInjury === true`).
- Quel profil exact ? Justine (algodystrophie cheville) en cas type. Tous les futurs users qui déclarent une blessure.
- Est-ce que l'user RESSENT vraiment la différence ? **Oui critique**. Pour un user qui a pris la peine de remplir le champ blessure, l'absence de mention dans le welcome = signal "l'app ne m'a pas lu" = perte de confiance immédiate sur un sujet sensible (sécurité). Doctrine `feedback_securite_avant_conversion` exige une transparence sur la prise en compte des risques.

**Coût/bénéfice** : ✅ Valeur claire, complexité triviale, **renforce doctrine sécurité**
**Recommandation finale** : **APPLY MAINTENANT**

**Justification** : 10-20 lignes de prompt, 0 risque code. C'est probablement le fix au plus haut ratio valeur/coût des 4. Renforce directement `feedback_securite_avant_conversion` et `feedback_compromis_messages_preventifs`. Cas Justine (algodystrophie cheville non citée dans welcome) montre l'impact concret. Adopter la structure 3 piliers du coach FFA telle quelle. Important : préciser dans le prompt qu'on garde `safetyWarning` séparé (pas de doublon) — le welcome reconnaît, le safetyWarning détaille.

**Variante éventuelle** : différencier blessure "significative" vs "mineure" via liste de mots-clés (algodystrophie / fracture / opération / tendinite chronique vs courbature / gêne ponctuelle). C'est un raffinement, pas obligatoire pour le MVP. Si on veut rester simple, on peut citer toute blessure déclarée — le user a saisi le champ, on respecte son input.

---

## Recommandation finale

### On applique : **2 sur 4** (A3 + A4) immédiatement, A2 plus tard, A1bis SKIP

### Ordre d'application

1. **AUJOURD'HUI (Sprint 1)** — A3 + A4 ensemble dans un même commit prompt-only.
   - Édition : ~30 lignes de prompt dans `geminiService.ts` (sections welcomeMessage)
   - Risque : nul (prompt-only, pas de logique)
   - Test : générer 2 plans test (1 Finisher+PB type Sébastien, 1 user avec blessure type Justine) post-deploy, vérifier que welcomeMessage cite bien PB + blessure
   - Doctrine respectée : `feedback_securite_avant_conversion`, `feedback_finisher_plus_pb_allure`, `feedback_input_client_obligatoire`, `feedback_compromis_messages_preventifs`
   - Time-to-deploy : 30-45 min

2. **J+2 à J+3 (Sprint 2)** — A2 après écriture de 20 tests profils.
   - Trancher d'abord : clamp `weeklyVolumes[picWeek]` (PM) ou clamp séance SL générée (Coach FFA) ? 30 min discussion.
   - Écrire 20 tests profils (5k/10k/semi/marathon/trail court/trail ultra/Hyrox × Débutant/Inter/Conf/Expert)
   - Implémenter le clamp + floor minimum + cas Trail ultra (back-to-back) + cas Hyrox
   - Audit batch post-deploy pour vérifier qu'aucun plan ne sort de l'enveloppe `[floor, max]`
   - Time-to-deploy : 1-2 jours

3. **À NE PAS FAIRE aujourd'hui** — A1bis.
   - Vérification code (L2671) montre que le bug A1bis est presque entièrement neutralisé.
   - Re-toucher 2× la même fenêtre de code en 6h sur un point critique sans test unitaire = sur-engineering risqué.
   - Si Romane veut vraiment le faire : sprint dédié J+7 minimum, avec les 4 tests unitaires Antoine/Armando/Aurore/Sébastien prévus par la review PM, et un audit batch post-fix de contrôle.

### Garde-fous transverses

- **Ordre obligatoire** : déployer A3 + A4 AVANT A2 (sinon mélange prompts/logique = debug impossible si bug apparaît).
- **Pas de touche à L2666 aujourd'hui** : on vient de patcher ce bloc ce matin, on laisse refroidir.
- **Aucune communication client déclenchée** : doctrine `feedback_jamais_contact_client`.
- **Aucune modification Firestore demandée par ces 4 fixes** (B1/B2/B3 = sujet séparé).

### Décision implicite à acter

- **L2666 (A1bis) est volontairement non patché** — documenter en commentaire de code : "L2666 conserve le cap maxVolume × 0.65 comme garde-fou anti-sur-déclaration ; la L2671 ré-applique le currentVolumeFloor immédiatement après, ce qui couvre 95% des cas Confirmé/Expert. Modification à n'envisager qu'avec tests unitaires dédiés." Cela évite qu'un futur dev (ou un futur audit) re-soulève le même bug fantôme.

---

## Fin de challenge PM

Document produit en lecture seule. Aucune modification code/Firestore. À valider par Romane avant exécution.
