# Validation PM wording A3 + A4
Date: 2026-05-18
PM senior Coach Running IA (15 ans)

## Verdict global
- **A3** : ⚠️ GO avec modifs (2 changements wording mineurs mais bloquants doctrine)
- **A4** : ⚠️ GO avec modifs (1 nuance médecin/kiné + 1 assouplissement structure)
- **Recommandation** : **MODIF AVANT PUSH** — 15 min de rework wording, puis GO deploy. Les 2 instructions sont structurellement justes mais 3 tournures actuelles créent un risque doctrine (alarmiste / paternaliste / médicalisation excessive).

---

## A3 — Welcome cite PB

**Verdict PM wording** : ⚠️ GO avec modifs
**Risque user perception** : faible-moyen
**Cohérence doctrine** :
- `feedback_input_client_obligatoire` ✅ (PB cité tel quel, jamais écrasé)
- `feedback_jamais_baisser_allure_cible` ✅ (Finisher = pas de cible chrono saisie, donc règle ne s'applique pas — cohérent avec `feedback_finisher_plus_pb_allure`)
- `feedback_finisher_plus_pb_allure` ✅ (logique max(PB+5%, VMA) bien reflétée dans le wording)
- `feedback_securite_avant_conversion` ⚠️ ("sans risque" promet trop — voir modif 1)
- `feedback_jamais_poids_minceur` ✅ (pas de mention corporelle)

### Modifs proposées

**MODIF 1 (bloquant)** — Remplacer "pour t'entraîner sans risque"
- Problème : "sans risque" est une **promesse absolue** que la course à pied ne peut jamais tenir. Crée un risque légal (décharge) ET un risque marque (sur-promesse). Contradiction directe avec `feedback_securite_avant_conversion` qui demande transparence sur le risque, pas son effacement.
- Remplacer par : `"pour t'entraîner avec une marge de progression"` ou `"pour t'entraîner sans te griller"` (registre plus oral, honnête).
- Texte final phrase suggérée :
  > "Sur ton dernier {subGoal} tu as fait {pbValue} — ton plan vise une allure d'entraînement à {allure spé calculée}/km, pour garder une marge de progression sans te griller."

**MODIF 2 (recommandée)** — Ajouter un exemple POSITIF dans les variantes
- Problème : "Ne JAMAIS culpabiliser le user qui aurait régressé" est juste, mais Gemini reçoit uniquement une consigne négative (quoi éviter), pas un modèle positif. Risque réel : sur un user qui a vraiment régressé (ex PB 10k 1h30 il y a 3 ans, VMA actuelle donne 9:30), Gemini peut bricoler une formulation maladroite.
- Ajouter une 3e variante explicite :
  > - PB plus rapide que l'allure cible calculée (potentielle régression) : présenter l'allure comme un **palier de reprise** ("on repart sur une base saine pour reconstruire", "ton plan te place sur une allure de relance, sans pression sur ton ancien chrono")

**MODIF 3 (mineure)** — "voir 'ALLURES OBLIGATOIRES' plus haut dans ce prompt" : OK mais ajouter un fallback si la section n'a pas été générée ("si non calculée, mentionner le PB seul sans allure inventée") — protection contre hallucination Gemini.

### Justification
A3 est doctrinalement aligné à 90%. Le seul vrai bloquant est "sans risque" qui crée un engagement marketing implicite incompatible avec la décharge produit. L'exemple positif sur régression évite que Gemini improvise sur un cas sensible.

---

## A4 — Welcome cite blessure

**Verdict PM wording** : ⚠️ GO avec modifs
**Risque user perception** : moyen
**Cohérence doctrine** :
- `feedback_securite_avant_conversion` ✅ (transparence + recommandation médicale)
- `feedback_input_client_obligatoire` ✅ (mots du user cités)
- `feedback_compromis_messages_preventifs` ⚠️ (recommandation médicale systématique peut friction conversion — voir modif 1)
- `feedback_jamais_contact_client` ✅ (juste du wording dans welcome, pas de mail/notif)
- `feedback_jamais_poids_minceur` ✅

### Modifs proposées

**MODIF 1 (bloquant)** — Conditionner la recommandation médicale à la sévérité
- Problème : "RECOMMANDER : suggérer un avis médical ou kiné AVANT de débuter" en règle systématique est **trop fort** pour une mention type "petite gêne au genou gauche" ou "tendinite il y a 2 ans, soignée". Crée friction conversion injustifiée + dilue le signal quand c'est vraiment grave. Contradiction `feedback_compromis_messages_preventifs` qui demande message préventif proportionné.
- Réécrire le pilier 3 en 2 modes :
  > 3. RECOMMANDER (selon sévérité) :
  >    - Blessure **active / récente / significative** (tendinite en cours, fasciite, ITBS, fracture stress, post-op, douleur actuelle) → recommandation médicale FORTE et explicite avant reprise.
  >    - Blessure **ancienne, soignée, ou mineure** (gêne légère, ancienne entorse, "j'ai eu") → suggestion souple ("écoute ton corps, si la gêne revient, lève le pied et consulte") — PAS de "valide avec ton kiné avant de débuter" qui dramatise.

**MODIF 2 (recommandée)** — Assouplir le format "3 piliers"
- Problème : "RECONNAÎTRE / ADAPTER / RECOMMANDER" est utile comme **checklist mentale** pour Gemini, mais si Gemini l'applique littéralement en 3 phrases numérotées, le welcome devient scolaire et froid. Risque ton "fiche médicale" au lieu de coach humain.
- Préciser explicitement :
  > Ces 3 piliers sont une **checklist de contenu** (les 3 points doivent être présents), PAS un format imposé. Intégrer naturellement dans 2-3 phrases fluides du welcome, jamais en liste numérotée visible.

**MODIF 3 (mineure mais importante)** — "JAMAIS écrire ta blessure t'empêche de"
- La règle est bonne mais la formulation est ambigüe (Gemini peut interpréter "ne jamais utiliser le mot blessure" → contradiction avec pilier 1 qui demande de la citer).
- Reformuler :
  > JAMAIS de formulation **limitante centrée sur le user** : "ta blessure t'empêche de...", "tu ne devrais pas...", "à cause de ta blessure tu ne peux plus...".
  > TOUJOURS formulation **factuelle centrée sur le plan** : "le plan tient compte de...", "on adapte la progression pour...", "on protège ce point en...".

### Justification
A4 a une intention juste (sécurité + transparence) mais la version actuelle médicalise systématiquement et risque un ton clinique. Le mode binaire (sévère vs léger) sur la reco médicale + l'assouplissement format suffit à corriger sans dénaturer.

---

## Risque concentration (1 insertion, 2 prompts preview + batch)
**Verdict** : ✅ acceptable, mais **prévoir 1 review post-deploy à J+3** sur 5 plans Finisher+PB et 5 plans avec blessure pour vérifier que Gemini applique les 2 règles sans interférence (risque welcome surchargé si les 2 cas coexistent : Finisher+PB+blessure → welcome peut devenir trop long).
- Si surcharge constatée : prioriser blessure > PB dans la hiérarchie welcome (sécurité > conversion).

---

## Texte final proposé

### A3 — version finale recommandée

```
🎯 RÈGLE PB EXPLICITE — Finisher + PB déclaré ({subGoal} en {pbValue})
Le welcomeMessage DOIT contenir une phrase qui cite explicitement le PB du coureur ET l'allure d'entraînement calculée sur ce subGoal (voir "ALLURES OBLIGATOIRES" plus haut dans ce prompt, champ "Allure spé {subGoal}").
Si l'allure n'a pas été calculée dans cette section, mentionner uniquement le PB — ne JAMAIS inventer une allure.

Format suggéré (à adapter, ne pas copier littéralement) :
"Sur ton dernier {subGoal} tu as fait {pbValue} — ton plan vise une allure d'entraînement à {allure spé calculée}/km, pour garder une marge de progression sans te griller."

Variantes selon contexte :
- PB récent (< 12 mois) : ton normal "ton dernier" / "ta meilleure performance"
- PB ancien (> 12 mois) ou non précisé : ton encourageant "ton meilleur temps connu"
- PB plus rapide que l'allure cible calculée (potentielle régression) : présenter l'allure comme un palier de reprise ("on repart sur une base saine pour reconstruire", "allure de relance, sans pression sur ton ancien chrono")
- Ne JAMAIS culpabiliser le user qui aurait régressé. Toujours présenter l'allure d'entraînement comme une marge ("plus douce pour garder une réserve"), pas comme une révision à la baisse.
```

### A4 — version finale recommandée

```
🩹 RÈGLE BLESSURE EXPLICITE — blessure déclarée : "{description user}"
Le welcomeMessage DOIT contenir une mention structurée autour de 3 piliers (checklist de contenu, PAS format imposé — intégrer naturellement en 2-3 phrases fluides, jamais en liste numérotée visible) :

1. RECONNAÎTRE : citer la blessure avec les mots du user (ex : "Compte tenu de ton {description}...")
2. ADAPTER : expliquer brièvement comment le plan en tient compte (intensité progressive, focus renfo ciblé, marche autorisée, surface souple, pas de descente technique, etc. — adapter selon la blessure)
3. RECOMMANDER (selon sévérité) :
   - Blessure ACTIVE / RÉCENTE / SIGNIFICATIVE (tendinite en cours, fasciite, ITBS, fracture stress, post-op, douleur actuelle, ou termes type "en cours" / "actuellement") → recommandation médicale FORTE et explicite avant reprise ("Avant de te lancer, valide avec ton kiné/médecin que tu peux reprendre une activité de course progressive.")
   - Blessure ANCIENNE / SOIGNÉE / MINEURE (mention type "léger" / "ancien" / "j'ai eu" / "résolu") → suggestion souple ("Écoute ton corps : si la gêne revient, lève le pied et consulte.") — PAS de validation kiné systématique qui dramatise.

JAMAIS de formulation limitante centrée sur le user : "ta blessure t'empêche de...", "tu ne devrais pas...", "à cause de ta blessure tu ne peux plus...".
TOUJOURS formulation factuelle centrée sur le plan : "le plan tient compte de...", "on adapte la progression pour...", "on protège ce point en...".
```

---

## Recommandation finale push

1. Appliquer les 3 modifs A3 + 3 modifs A4 ci-dessus (15 min wording, zéro code).
2. Push + deploy.
3. Review J+3 : auditer 5 plans Finisher+PB + 5 plans avec blessure (+ 2 plans qui cumulent les 2 cas) pour vérifier que Gemini applique sans surcharger le welcome.
4. Si OK → close. Si surcharge → patch hiérarchie blessure>PB.
