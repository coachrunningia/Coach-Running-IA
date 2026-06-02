# AUDIT URGENT — Plan Marathon Julien Desbonnet (1779889214538)

**Auditeur** : Coach FFA — spécialiste débutants / senior+ / prévention blessure
**Date** : 27/05/2026 — soir (S1 démarre AUJOURD'HUI)
**Statut admin** : plan en pause Firestore, preview vue côté user, Julien a "sonné" Romane
**Doctrine appliquée** : D17 transparence opt-in, D1 allures intouchables, scope strict course à pied, ZÉRO mention poids/IMC/minceur dans wording user

---

## 1. DIAGNOSTIC SÉCURITÉ — verdict honnête

Verdict global : **plan IRRÉALISTE en l'état, ratio de risque blessure très élevé, non négociable sans avis médical préalable et restructuration S1-S6.**

### 1.1 Risques majeurs ordonnés par gravité

| # | Risque | Donnée chiffrée | Niveau |
|---|--------|------------------|--------|
| 1 | **Cardio / asymptomatique 46 ans + sédentaire** | cv 7 km/sem, premier marathon, pas de test d'effort déclaré | CRITIQUE |
| 2 | **Overuse musculo-tendineux (Achille, fascia plantaire, périosté tibial)** | Pic 24 km/sem = **3.43× cv actuel**. Règle FFA : +10 %/sem max. Ici +13 % moyen mais saut S1 (9 km) vs cv (7 km) = +28 % d'entrée | CRITIQUE |
| 3 | **Articulaire genou/hanche** | 46 ans + démarrage cv bas + impacts répétés footing continu sans préparation excentrique | ÉLEVÉ |
| 4 | **Pic de volume marathon sous-dimensionné → mur réel le jour J** | Pic 24 km/sem, **standard FFA marathon débutant = 40-50 km/sem minimum**, soit pic à **0.5× du référentiel**. Le plan calibre sous le seuil de blessure mais aussi sous le seuil de réussite marathon | ÉLEVÉ |
| 5 | **Sortie longue S1 trop longue** | 1h09 / 6.8 km en continu, 9:43 min/km. À 46 ans + cv 7 km, une SL S1 doit être en alternance marche/course max 45 min OU footing très court 25-30 min | ÉLEVÉ |
| 6 | **Incohérence S1 vs safetyWarning** | safetyWarning dit explicitement "alterner marche et course" — **AUCUNE séance S1 n'applique cette consigne**. Contradiction interne du plan | ÉLEVÉ (cohérence produit) |
| 7 | **VMA déclarée 11 vs VMA calculée 9.22** | Écart +19 %. Si plan calibré sur 11, allures réelles intenables → surcharge. Si calibré sur 9.22 (cas actuel), OK mais user croit avoir 11 → risque qu'il pousse | MOYEN |

### 1.2 Cohérence physiologique

- **PB 5K en 35 min** → VMA estimée ≈ 9.5 km/h (formule Léger/Mercier).
- **PB 10K en 1h10** → VMA estimée ≈ 9.0 km/h.
- Convergence à **9.22 km/h**, allure de footing autour 9:30-10:00 min/km — profil **débutant lent typique**, pas intermédiaire.
- **VMA 11 km/h déclarée en verbatim = bruit user, à ignorer.** Garder 9.22 calculée.

### 1.3 Level "Intermédiaire (Régulier)" → diagnostic erreur questionnaire

- cv 7 km/sem + PB 35 min sur 5K = profil **DÉBUTANT** sans ambiguïté (FFA : Intermédiaire = cv ≥ 25 km/sem + PB 5K < 25 min).
- Hypothèse haute confiance : Julien a auto-évalué "régulier" parce qu'il sort 4x/sem, mais la régularité ≠ niveau. **Le questionnaire devrait clamper level=Débutant quand cv < 15 km/sem**, indépendamment du déclaratif. À traiter produit, pas patch live.

### 1.4 Spécificités 46 ans (audit interne, ZÉRO dans wording user)

- VO2max décline ~1 %/an après 30 ans → marge cardio réduite.
- Tendons et fascias moins élastiques, récupération +30-50 % vs 25 ans.
- Risque osseux et articulaire majoré sur impacts répétés non préparés.
- **Recommandation FFA stricte** : test d'effort obligatoire avant tout plan marathon à partir de 40 ans pour un primo-finisher avec cv bas.

---

## 2. RECOMMANDATIONS COACH — 3 scénarios

### Tableau comparatif

| Critère | Scénario A — Marathon recalibré | Scénario B — Bascule semi/10K | Scénario C — Pré-plan remise en forme |
|---|---|---|---|
| **Objectif final** | Marathon 25/10/26 | Semi ou 10K oct/nov 26 | Marathon repoussé 2027 ou semi 2027 |
| **Sécurité** | Acceptable si avis médical OK | ÉLEVÉE | MAXIMALE |
| **Cohérence physio** | Tendue (pic devrait être 35-40 km/sem) | Excellente (semi ok avec pic 22-28) | Parfaite |
| **Satisfaction user** | Haute (garde son rêve) | Moyenne (déception possible) | Basse (frustration forte) |
| **Effort dev (code/prompt)** | MOYEN — re-génération avec level=Débutant forcé + injection marche/course S1-S6 | FAIBLE — bascule subGoal côté questionnaire, re-génération standard | ÉLEVÉ — nouvel objet plan "remise en forme 12 sem" à créer, pas de template existant |
| **Risque produit** | Si on patche silencieux et il se blesse = responsabilité | Mineur, message clair | Mineur mais churn possible |
| **Conformité doctrine D17** | OK si transparence opt-in + double confirm | OK natif | OK natif |

### Détail Scénario A — Marathon recalibré

Patches techniques nécessaires (voir §4) :
- weeklyVolumes ré-étalés avec pic 32-38 km/sem, S1 démarrant à 6 km en alternance marche/course
- Sessions S1-S6 : toutes les sorties course injectées en intervals marche/course (3 min C / 2 min M)
- safetyWarning enrichi (voir §3)
- welcomeMessage refondu (voir §3)
- feasibility.status reste RISQUÉ mais score remonté à ~60 (acceptable opt-in)

Prérequis bloquant : **avis médical avec test d'effort signé OU décharge explicite user via modal double-confirmation**.

### Détail Scénario B — Bascule semi-marathon

- Volume marathon (40-50 km/sem standard) hors de portée en 22 semaines depuis cv 7.
- Semi-marathon → pic 22-28 km/sem suffit, parfaitement atteignable progressivement depuis cv 7.
- Recommandation feasibility.recommendation interne du système elle-même = "semi-marathon comme première expérience longue distance". **Le système le dit déjà.**

### Détail Scénario C — Pré-plan remise en forme

- 12 semaines marche/course progressive → cv objectif 20 km/sem fin de bloc.
- Re-questionnaire ensuite, plan semi à l'automne 2026 envisageable.
- Honnête mais frustrant ; Julien a déjà projeté son marathon 25/10.

### VERDICT COACH

**Scénario B recommandé** (bascule semi-marathon octobre 26 ou 10K novembre 26).

Justification :
1. Cohérent avec la recommandation interne du système (feasibility.recommendation).
2. Sécurité maximale sans frustration totale.
3. Effort dev minimal côté Romane.
4. Marathon reste accessible en 2027 sur base saine.
5. Premier marathon réussi >>> premier marathon survécu blessé.

**Scénario A acceptable** uniquement si Julien refuse B après explication ET fournit un avis médical favorable ET accepte la modal opt-in D17.

**Scénario C** à garder en backup si Julien signale déjà des douleurs ou refuse l'avis médical.

---

## 3. WORDING SAFETY ENRICHI

### safetyWarning (proposition)

> **À lire avant de démarrer.** Tu démarres avec 7 km/sem en moyenne et tu vises un premier marathon dans 5 mois : c'est un projet ambitieux qui demande quelques précautions non-négociables.
>
> **Avant toute séance** : prends rendez-vous avec ton médecin pour un test d'effort. À 46 ans avec un premier dossard marathon, ce n'est pas une option, c'est la base. Si tu as la moindre douleur articulaire ou tendineuse en cours de plan, consulte un kiné du sport sans attendre.
>
> **Les 6 premières semaines** : on alterne marche et course (3 min de course / 2 min de marche) sur toutes les sorties. Ce n'est pas une régression, c'est la seule méthode validée pour construire un socle solide sans casser tes tendons. Si une séance prévue te semble trop dure, tu réduis et tu me préviens via Romane.
>
> **Les 3 règles d'or — j'arrête immédiatement et je consulte si** :
> 1. **Douleur articulaire ou tendineuse** qui persiste après 48h de repos (genou, Achille, tibia, hanche).
> 2. **Essoufflement anormal, oppression thoracique ou palpitations** à l'effort modéré.
> 3. **Fatigue qui dure plus de 72h** après une séance, ou sommeil perturbé plusieurs nuits.
>
> Le plan reste un guide, pas un ordre. Ton corps a toujours raison.

### welcomeMessage (proposition — scénario B, bascule semi)

> Salut Julien,
>
> Bienvenue. J'ai regardé ton dossier avec attention et je veux être honnête avec toi avant qu'on démarre.
>
> Ton objectif marathon en 5 mois depuis 7 km/sem, c'est trop court et trop dense pour un premier dossard à 46 ans. Je ne te dis pas ça pour te freiner : je te le dis parce que les plans que je connais sur ce type de profil finissent trop souvent en tendinopathie ou en blessure de genou avant même la ligne de départ.
>
> **Ma recommandation** : on bascule sur un **semi-marathon en octobre**, même date, même excitation, même médaille. Le semi te permet de construire un socle propre, de passer la ligne en pleine forme, et de viser un marathon sur base saine en 2027 si l'envie est toujours là. C'est le chemin que je conseillerais à mon frère.
>
> **Si tu veux malgré tout tenter le marathon** : Romane peut te débloquer le plan, mais sous trois conditions strictes (test d'effort médecin + alternance marche/course les 6 premières semaines + signalement immédiat de toute douleur). Le plan sera marqué RISQUÉ et tu valides en connaissance de cause.
>
> Dis-nous ce que tu préfères et on cale ça ensemble.
>
> Bon vent, on est là.

### welcomeMessage (proposition — scénario A, marathon maintenu)

> Salut Julien,
>
> Bienvenue. On part sur ton marathon du 25 octobre comme tu l'as demandé, mais je dois être franc avec toi : c'est un projet ambitieux pour un premier dossard à 46 ans, et on va le construire ensemble en mode prudence absolue.
>
> **Les 6 premières semaines, on alterne marche et course** sur toutes les sorties. Pas de footing continu avant qu'on en ait parlé. C'est la condition pour passer la ligne en pleine forme et pas sur les genoux.
>
> **Avant la première séance** : test d'effort chez ton médecin. Non négociable.
>
> Le plan est marqué RISQUÉ : tu le sais, je le sais, on avance les yeux ouverts. À la moindre douleur qui persiste 48h, tu stoppes et tu consultes un kiné du sport.
>
> On est là, Romane et moi. Bon vent.

---

## 4. PATCHES TECHNIQUES (si scénario A retenu)

**Rappel doctrine** : on ne touche JAMAIS l'allure cible chrono (D1), les inputs user immuables (cv, frequency, raceDate, startDate). On agit sur volume hebdo, contenu sessions, wording, feasibility.

### 4.1 weeklyVolumes

Actuel : `[9, 10, 11, 9, 10, 12, 11, 12, 14, 14, 14, 16, 17, 16, 18, 21, 18, 21, 24, 21, 19, 16]` — pic 24, total 312 km.

Proposé : `[6, 7, 8, 7, 9, 10, 12, 13, 15, 14, 17, 18, 16, 20, 22, 20, 24, 27, 25, 32, 22, 14]` — pic 32, total 358 km.

Justification :
- S1 démarre à **6 km** (alternance marche/course), ratio 0.86× cv = sous le cv, normal pour primo-débutant 46 ans.
- Montée +10-15 %/sem hors semaines de récup (S4, S7, S10, S13, S16 = -10 à -15 %).
- Pic à **32 km en S20** (3 sem avant course), aligné sur référentiel FFA marathon débutant prudent.
- Affûtage S21 = 22 km, S22 (semaine course) = 14 km **hors course** (doctrine D19, `_raceDay` exclu).

### 4.2 Sessions S1-S6 — injection marche/course

Pour toutes les sorties course (footings + SL) :
- Format alterné : **3 min course / 2 min marche**, répété pendant la durée prévue.
- `targetPace` course conservée (D1 intouchable), mais explicitation dans `description` : "Tu cours 3 min à allure footing 9:43, puis tu marches 2 min, et tu répètes."
- `mainSet` enrichi pour refléter le pattern, `distance` plat-équivalent ajustée car la marche compte aussi (doctrine D18b : explicitation, pas falsification).

S7-S12 : transition progressive vers footing continu, alternance résiduelle uniquement sur SL.
S13+ : footings continus standards.

**S1 réécrite** :
- Lundi : Repos Actif 20-30 min marche douce — OK conserver.
- Mercredi : Renfo 35-45 min — OK conserver (renfo Cory Smith style, gainage + chaîne postérieure).
- Vendredi (SL) : 45 min en **9 cycles (3 C / 2 M)** au lieu de 1h09 continu. Distance ≈ 4.5 km plat-équivalent.
- Dimanche : 25 min en **5 cycles (3 C / 2 M)**. Distance ≈ 2.5 km.
- **Total course S1 ≈ 7 km** (égal cv user, démarrage iso-charge, plus safe que 9.1 km).

### 4.3 welcomeMessage

Régénérer avec wording §3 (scénario A ou B selon décision Romane).

### 4.4 safetyWarning

Remplacer par version enrichie §3.

### 4.5 feasibility

- Conserver `status: "RISQUÉ"` (honnêteté, doctrine D17).
- Remonter `score` de 45 → **58-62** après patches (volume re-étalé + marche/course + wording).
- Conserver `recommendation` mentionnant semi-marathon comme alternative préférable.
- Ajouter champ `requiresMedicalClearance: true` si pas déjà présent.

### 4.6 Modal opt-in (front)

Avant que Julien puisse activer le plan :
1. Écran 1 : safetyWarning enrichi, bouton "J'ai lu et je comprends".
2. Écran 2 : 3 cases à cocher OBLIGATOIRES :
   - "J'ai pris RDV pour un test d'effort avec mon médecin."
   - "Je m'engage à alterner marche/course les 6 premières semaines."
   - "Je m'arrête et je consulte au moindre signal (douleur 48h, oppression, fatigue 72h)."
3. Écran 3 : signature électronique simple (case "Je décharge l'application de toute responsabilité médicale").

### 4.7 _pausedReason

Retirer **uniquement après** Romane a validé scénario choisi + patches appliqués + (si scénario A) modal opt-in front déployé.

---

## VERDICT FINAL (1 ligne)

> Plan marathon actuel IRRÉALISTE et DANGEREUX pour Julien 46 ans cv 7 km/sem premier dossard ; bascule semi-marathon recommandée (scénario B), marathon maintenu acceptable uniquement avec patches §4 + avis médical + modal opt-in D17.

### Scénario recommandé

**Scénario B — Bascule semi-marathon 25/10/26**, même date, même médaille, projet sain. Marathon 2027 sur base solide si l'envie persiste.

### 3 actions immédiates pour Romane

1. **Contacter Julien** (Romane uniquement, jamais nous, doctrine [[feedback_jamais_contact_client]]) : lui présenter scénario B comme recommandation prioritaire, scénario A en option sous conditions strictes (test d'effort + modal opt-in + marche/course S1-S6).
2. **Préparer côté produit** : flag `requiresMedicalClearance` + composant modal opt-in 3 écrans si scénario A retenu. Bascule subGoal `semi-marathon` côté questionnaire si scénario B.
3. **Backlog produit (non bloquant ce soir)** : clamp `level=Débutant` quand cv < 15 km/sem indépendamment du déclaratif, pour éviter la répétition du cas Julien sur d'autres users.
