# Validation Coach FFA wording A3 + A4
Date: 2026-05-18
Validateur : Coach FFA 25 ans (mode expert wording)
Scope : valider/challenger le wording EXACT injecté par `buildSafetyInstructions`
(geminiService.ts L3092–L3133). **Aucune modif code ici** — uniquement wording.

---

## Verdict global

- **A3 (welcome cite PB Finisher)** : ⚠️ GO avec 2 modifs mineures (1 critique, 1 cosmétique)
- **A4 (welcome cite blessure)** : ⚠️ GO avec 3 modifs (1 critique scope marche-course, 1 important débutant, 1 mineur exemples blessures)
- **Recommandation finale** : **MODIF AVANT PUSH** — les 2 corrections critiques (A3 "sans risque" + A4 "marche autorisée") sont bloquantes pour la doctrine. Modifs proposées en bas du doc, prêtes à coller.

---

## A3 — Welcome cite PB (Finisher + PB déclaré)

**Verdict coach wording** : ⚠️ GO avec modifs
**Validité pédagogique** : ✅ aligné consensus FFA
**Effet motivationnel** : neutre → positif si modifs appliquées (négatif risque sur "sans risque")

### Points forts du wording actuel
- Structure 3 niveaux (phrase suggérée + variantes récent/ancien + garde-fou "jamais culpabiliser") = pédagogiquement carré.
- L'instruction "format suggéré, ne pas copier littéralement" évite l'effet template robotique chez Gemini Flash.
- Le rappel "présenter l'allure d'entraînement comme une protection, pas comme une révision à la baisse" est aligné `feedback_finisher_plus_pb_allure` (+5% cushion = pédagogie, pas régression).
- L'accroche par référence aux "ALLURES OBLIGATOIRES plus haut" = sécurise contre les allures inventées par Flash.

### Problèmes identifiés

**[CRITIQUE] "pour t'entraîner sans risque"**
> Le user qui lit "à 9:30/km pour t'entraîner sans risque" déduit en miroir : "donc 9:00/km c'est risqué ?". Or 9:00/km est SON ALLURE PB — déclarée par lui. On crée un message anxiogène + on contredit implicitement `feedback_input_client_obligatoire` (le PB est un input client respecté).
>
> Le coach FFA dit jamais "allure sans risque" en entraînement. Il dit "allure de travail", "allure d'entraînement spécifique", "allure de fond". La notion de risque est portée par la PROGRESSIVITÉ et la TECHNIQUE, pas par un chiffre absolu.
>
> **Risque collatéral** : conflit avec `feedback_securite_avant_conversion` qui prêche transparence — ici on insinue un risque flou non documenté.

**[COSMÉTIQUE] "ton dernier {subGoal} tu as fait {pbValue}"**
> Question soulevée : stigmatisant pour Sébastien-like qui a régressé ?
>
> Réponse coach : non, **à condition que la variante "PB ancien"** soit clairement déclenchée. Le mot "dernier" est factuel et le user a lui-même saisi cette donnée. MAIS on peut rendre la formulation plus universelle en utilisant "ton meilleur temps connu sur {subGoal}" par défaut, qui couvre les 2 cas (récent ET ancien) sans déclencher Flash sur la distinction temporelle qu'il sait mal gérer.
>
> Argument contre : "ton meilleur temps" peut sonner valorisant à tort si le PB est vieux de 5 ans et hors-forme. Mais c'est moins pire que "ton dernier" qui peut sonner accusatoire si dernière course = contre-perf récente.
>
> **Décision coach** : remplacer "ton dernier {subGoal}" par "ton meilleur temps connu sur {subGoal}" dans le format suggéré. La variante "PB récent / PB ancien" reste utile en sous-section pour calibrer le ton, mais le format de base devient universel.

### Vérification doctrine

| Mémoire | Aligné ? |
|---|---|
| feedback_finisher_plus_pb_allure | ✅ explicite |
| feedback_jamais_baisser_allure_cible | ✅ le wording dit bien "protection", "marge" — pas "on baisse ta cible" |
| feedback_input_client_obligatoire | ⚠️ "sans risque" contredit indirectement le respect du PB |
| feedback_securite_avant_conversion | ⚠️ "sans risque" = sécurité floue non sourcée |
| feedback_compromis_messages_preventifs | ✅ message préventif, pas blocage |

---

## A4 — Welcome cite blessure

**Verdict coach wording** : ⚠️ GO avec modifs
**Validité pédagogique** : ✅ structure 3 piliers excellente
**Effet motivationnel** : positif si modifs appliquées (sinon risque conflit doctrine sur "marche autorisée")

### Points forts du wording actuel
- Structure 3 piliers (RECONNAÎTRE / ADAPTER / RECOMMANDER) = exactement ce qu'enseigne la FFA dans la formation entraîneur niveau 2 sur la communication post-blessure.
- Le garde-fou "JAMAIS écrire ta blessure t'empêche / TOUJOURS on adapte" = essentiel, c'est LE biais classique des coachs débutants.
- Modulation mineure/significative = bon réflexe pédagogique.
- L'instruction "utiliser les mots du user" respecte `feedback_input_client_obligatoire`.

### Problèmes identifiés

**[CRITIQUE] "marche autorisée" dans la liste d'exemples ADAPTER**
> Conflit direct avec `feedback_mode_marche_course_scope` : le mode marche-course est RÉSERVÉ aux Débutants/petites VMA. Si un Intermédiaire (Fred-like) avec ITBS lit "marche autorisée" dans son welcomeMessage, il va attendre des séances marche-course dans son plan — qu'il n'aura pas (et heureusement). Création d'un gap promesse/livraison.
>
> **Pire scénario** : un Confirmé en reprise post-tendinite voit "marche autorisée" et croit qu'on lui propose un plan dégradé. Effet conversion négatif + sentiment de non-respect du niveau déclaré.
>
> **Correctif** : retirer "marche autorisée" de la liste générique. Si applicable (Débutant + blessure significative), le mode marche-course se déclenche déjà par la logique TS — pas besoin de l'annoncer ici comme une promesse universelle.

**[IMPORTANT] "intensité progressive" risque de contagion débutants**
> Question soulevée : un débutant SANS blessure qui lit ce conseil va-t-il croire que SON plan est en mode dégradé ?
>
> Non — l'instruction A4 est **gated par `injuries.hasInjury && description`**. Un débutant sans blessure ne déclenche pas cette instruction → pas de fuite vers son welcomeMessage.
>
> MAIS : "intensité progressive" est un exemple générique faible. TOUT plan FFA bien fait est progressif. Le mentionner comme adaptation spécifique blessure = banal et n'apporte aucune valeur perçue. Mieux vaut donner des exemples ADAPTÉS À LA BLESSURE :
> - tendinite achille → "remplacement des montées explosives par des côtes longues douces, surface plate"
> - ITBS → "renfo fessiers ciblé, pas de descente technique"
> - fasciite plantaire → "footings sur surface souple, étirements ciblés"
> - périostite → "réduction du volume sur dur, focus surface souple"
>
> Mais on ne peut pas demander à Flash de TOUT générer — donc l'astuce est de **lister 2-3 exemples génériques solides** ("progression douce du volume", "renfo ciblé selon la zone", "surface souple privilégiée") et laisser Flash adapter au cas par cas.

**[MINEUR] Liste d'exemples blessures (tendinite, fasciite, fracture stress, ITBS)**
> Question soulevée : manque-t-on des fréquentes (genou coureur, périostite, lombalgie) ?
>
> Oui, le **syndrome rotulien (genou coureur)** est statistiquement la blessure #1 du coureur loisir (≈ 25 % des consultations sport). Périostite est aussi très fréquente débutants. Lombalgie = moins fréquente mais souvent mal prise en charge.
>
> Effet sur Flash : pas dramatique (la liste n'est qu'illustrative), mais ajouter 2-3 mots couvre mieux le spectre et améliore la calibration "blessure significative".

### Points OK qui ont été questionnés
- **"avis médical ou kiné AVANT de débuter"** : excellent, c'est exactement la formulation FFA recommandée. ✅
- **"JAMAIS culpabiliser"** : indispensable. ✅
- **Blessures CHRONIQUES (asthme, cardio, diabète)** : HORS SCOPE `injuries`. Le champ `injuries.description` cible musculo-squelettique selon les autres usages du code (L3387, L4436, L5636). Une instruction séparée serait nécessaire pour les contre-indications médicales chroniques — mais ce n'est PAS le scope de A4. Ne pas mélanger.

### Vérification doctrine

| Mémoire | Aligné ? |
|---|---|
| feedback_securite_avant_conversion | ✅ recommandation médicale forte |
| feedback_mode_marche_course_scope | ❌ "marche autorisée" contredit |
| feedback_input_client_obligatoire | ✅ "utiliser les mots du user" |
| feedback_compromis_messages_preventifs | ✅ message préventif structuré |
| feedback_jamais_poids_minceur | ✅ pas de mention poids |

---

## Texte final proposé (à substituer dans `buildSafetyInstructions`)

### A3 — Version corrigée

```
🎯 RÈGLE PB EXPLICITE — Finisher + PB déclaré ({subGoal} en {pbValue})
Le welcomeMessage DOIT contenir une phrase qui cite explicitement le PB du coureur ET l'allure d'entraînement calculée sur ce subGoal (voir "ALLURES OBLIGATOIRES" plus haut dans ce prompt, champ "Allure spé {subGoal}").
Format suggéré (à adapter, ne pas copier littéralement) :
"Ton meilleur temps connu sur {subGoal} est {pbValue} — ton plan vise une allure d'entraînement à {allure spé calculée}/km pour te laisser de la marge et progresser durablement."

Variantes selon contexte :
- PB récent (< 12 mois) : ton normal "ton dernier" / "ta meilleure performance"
- PB ancien (> 12 mois) ou non précisé : ton encourageant "ton meilleur temps connu"
- Ne JAMAIS culpabiliser le user qui aurait régressé. Toujours présenter l'allure d'entraînement comme une protection ("plus douce pour garder de la marge"), pas comme une révision à la baisse.
- Ne JAMAIS écrire "allure sans risque" ou "sans danger" — utiliser "allure de travail", "allure d'entraînement spécifique", "marge de progression".
```

**Diff vs original** :
- "Sur ton dernier {subGoal} tu as fait {pbValue}" → "Ton meilleur temps connu sur {subGoal} est {pbValue}" (universel, non-stigmatisant)
- "pour t'entraîner sans risque" → "pour te laisser de la marge et progresser durablement" (positif, pédagogique, pas anxiogène)
- Ajout d'une 4e puce garde-fou contre "sans risque" (verrouille Flash)

### A4 — Version corrigée

```
🩹 RÈGLE BLESSURE EXPLICITE — blessure déclarée : "{description user}"
Le welcomeMessage DOIT contenir une mention structurée en 3 piliers (factuelle, non-alarmiste, non-culpabilisante) :
1. RECONNAÎTRE : citer la blessure (utiliser les mots du user, ex : "Compte tenu de ton {description}...")
2. ADAPTER : expliquer brièvement comment le plan en tient compte. Exemples génériques à adapter selon la blessure : progression douce du volume, renfo ciblé selon la zone, surface souple privilégiée, pas de descente technique, pas de côtes explosives sur tendinopathie. NE PAS promettre "marche autorisée" (réservé aux profils débutants où la logique plan le déclenche déjà automatiquement).
3. RECOMMANDER : suggérer un avis médical ou kiné AVANT de débuter (ex : "Avant de te lancer, valide avec ton kiné/médecin que tu peux reprendre une activité de course progressive.")

Si la blessure est mineure ou ancienne (mention type "léger" / "ancien") → garder mention courte. Si blessure significative (syndrome rotulien / genou coureur, tendinite, périostite, fasciite plantaire, ITBS, fracture de fatigue, lombalgie, etc.) → mention plus appuyée avec recommandation médicale forte.

JAMAIS écrire : "ta blessure t'empêche de...", "tu ne devrais pas..." (jamais culpabiliser). TOUJOURS : "le plan tient compte de...", "on adapte pour..." (factuel, soutien).
```

**Diff vs original** :
- ADAPTER : retrait de "intensité progressive" (banal) et "marche autorisée" (conflit scope). Ajout d'exemples plus discriminants + verrou explicite "NE PAS promettre marche autorisée".
- Liste blessures significatives : ajout syndrome rotulien (#1 stat coureur loisir), périostite, lombalgie. Réordonnée par fréquence décroissante.
- Le reste = identique (3 piliers, ton, garde-fous JAMAIS/TOUJOURS).

---

## Synthèse push

| Item | Statut | Bloquant push ? |
|---|---|---|
| A3 wording original | ⚠️ "sans risque" anxiogène | OUI |
| A3 wording corrigé | ✅ | — |
| A4 wording original | ⚠️ "marche autorisée" conflit doctrine | OUI |
| A4 wording corrigé | ✅ | — |

**Action attendue** : appliquer les 2 substitutions ci-dessus dans `src/services/geminiService.ts` L3108–L3116 (A3) et L3124–L3132 (A4), puis push.

Aucune autre modif code/logique nécessaire — la logique TS (`applyTargetTimeOverride` L992+, gating injuries L3123) est correcte et reste inchangée.
