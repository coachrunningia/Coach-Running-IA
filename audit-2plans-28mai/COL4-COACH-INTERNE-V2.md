# COL4 — COACH INTERNE V2 — Audit plans #3 & #4 (28 mai)

Auditeur : Coach interne (D1-D19, F-1 à F-15 + règle Δ>+12% rouge déduite plan thibaud).
Méthodo héritée de V1 : tableau `[W, vol, Δ%]`, SL%hebdo, F-13/14/15 systématique, recalcul `effective_level`, décomposition D18.

---

## Plan #3 — yvanperez42 — Marathon 3h40 — 24 sem.

**Profil** : H 57 ans, 165cm/63kg (BMI 23.1), VMA 13.79 km/h dérivée Semi 1h48, cv=50 km/sem, freq=5, level Confirmé (Compétition), raceDate 2026-11-08, injuries=false.

### Métriques

| Métrique | Valeur plan | Référentiel | Verdict | Patch |
|---|---|---|---|---|
| feasibility.score | 60 / AMBITIEUX | Cible 3h40 ≈ 11.51 km/h ; VMA proj 3h45-3h49 (Riegel Semi 1h48 → 3h45 ; VMA Léger → 3h49) | Justifié, écart 5-9 min docté | RAS |
| VMA vs PB Semi | VMA 13.79 dérivée Semi 1h48 (Semi = 11.72 km/h ≈ 85% VMA) | Cohérent doctrine Léger | OK | RAS |
| **Bug paces — Seuil 5:15 vs %VMA** | 87%×13.79 = 12.00 km/h = **5:00/km** théorique ; stocké **5:15** | Plan stocke 5:15 = 11.43 km/h ≈ 83% VMA (sous-estimation) | **Bug code formule** | **P1** |
| **Bug paces — Marathon 5:13 vs %VMA** | 80%×13.79 = 11.03 km/h = **5:26/km** théorique ; stocké **5:13** = 11.51 km/h = chrono cible 3h40 | Plan stocke = target time, PAS calc %VMA | Source mixte (target vs VMA-based) | Décision : aligner sur target time (D1 chrono cible) **OK doctrinalement** mais inversion Seuil>Marathon en chrono | P1 |
| **Inversion Seuil < Marathon** | Seuil 5:15 (11.43 km/h) < Marathon 5:13 (11.51 km/h) en allure | Seuil DOIT être plus rapide que Marathon (Seuil 87% > Marathon 80% VMA) | **Incohérence sémantique** : la séance "seuil" sera courue PLUS LENTEMENT que la séance "marathon" → bug pédagogique | **P0 code** (formule paces) |
| weeklyVolumes Δ% | [50,55,61,49,56,64,67,54,62,67,71,57,66,67,71,57,66,67,71,57,66,47,41,36] — Δ% : +10/+10.9/-19.7/+14.3/+14.3/+4.7/-19.4/+14.8/+8/+6/-19.7/+15.8/+1.5/+6/-19.7/+15.8/+1.5/+6/-19.7/+15.8/-29/-13/-12 | Règle FFA +10% / max +15% post-récup | **3 sauts +15.8% post-récup** (S12→S13, S16→S17, S20→S21) **borderline** mais conformes ; **2 sauts +14.3% consécutifs S4→S6** sortie de récup = même angle mort que thibaud (≤12% maxi déduit) | **P1** lisser à +12% strict post-récup |
| **Monotonie blocs** | Pattern **57/66/67/71** répété **3 fois** (S12-S15 / S16-S19 / S20-S23 partiel) | Même défaut que thibaud (72/83/86/90 ×3) | Manque variation intra-bloc, aucun pic 75-77 | **P2 prompt periodization** |
| cv vs goal min | 50 vs Min Marathon Confirmé 45-60 | OK borderline-bas | RAS sur cv ; volume plan adapté | RAS |
| Pic hebdo | 71 (S11,S15,S19) | 60-80 cible Confirmé Marathon | OK | RAS |
| SL S1 | 18 km / 117 min ; 36% du hebdo 50 | 25-30% Confirmé Marathon | **36% un peu haut** S1 (mais Confirmé + cv 50 base → tolérable) | À surveiller |
| Cohérence Level vs cv | Confirmé + cv 50 + PB Semi 1h48 | F-15 inactif (cv ≥ min) | OK | RAS |
| F-14 trigger | age 57 (>50) **seul** ; BMI 23.1 OK | Trigger AGE → vigilance cardio + articulaire | **safetyWarning couvre cardio** (test effort, certificat) mais **rien sur charge S1 36% SL** | Enrichir P2 |
| S1 enchaînement Mar/Jeu/Ven | Mar 11.4 EF (1h14) + Mer renfo + Jeu 8.6 vallonné (56min) + Ven 12 km/1h34 + gammes + Dim 18 SL (1h57) | 5 séances dont 1 renfo, doctrine OK | **Jeu+Ven enchaînés = 8.6+12 km = 20.6 km / 2j30** (1ère semaine pour 57 ans) | **Risque articulaire** Jeu vallonné→Ven 1h34 sans récup interposée |
| D18 décompo math Ven 12km/1h34 | EF 6:30 × 79 min = 12.15 km ; 15 min gammes hors compta km | Décomposé OK | Faux positif D18 | RAS |
| Affûtage S22-S24 | 66→47→41→36 = -29% / -13% / -12% | Classique | OK | RAS |

### Confirmer/Contester

- **Validé** : Seuil/Marathon paces incohérentes (inversion sémantique). **Bug code formule paces**.
- **Validé** : monotonie 3 blocs identiques S12-S23 (même défaut thibaud — pattern récurrent prompt periodization).
- **Validé partiellement** : feasibility AMBITIEUX 60 justifié (Riegel 3h45 vs cible 3h40 = écart 5 min réaliste sur 24 sem ; le message indique 3h49 par formule VMA pure = un peu pessimiste).
- **Contesté** : enchaînement Mar/Jeu/Ven n'est PAS 3 jours consécutifs (Mer renfo intercalé, Mar séparé de Jeu/Ven). Le vrai souci est **Jeu vallonné + Ven 12km/1h34 consécutifs** = double charge endurance en 24h pour un 57 ans S1.

### Manqué par freelance (probable)

- F-14 partiel : age>50 seul → safetyWarning a couvert cardio mais **pas chargé S1 36% SL**.
- Inversion Seuil/Marathon en allure : **bug structurel à signaler en P0 code**.

### Actions P0/P1/P2

- **P0 code (formule paces)** : ajouter validation `seuilPace < marathonPace` (allure plus rapide = chiffre min/km plus petit). Si violation, recalcul forcé Seuil = 87%×VMA, Marathon = chrono target OU 80%×VMA selon priorité doctrine D1.
- **P0 patch live S1** (D5 sécurité, S1 non vécue 2026-05-28 = ajd) : reformuler Ven 12km en **footing récup 8 km/52 min** OU déplacer gammes au Mar pour libérer Ven repos. Justification : Jeu vallonné + Ven endurance 1h34 consécutifs pour 57 ans = sur-charge articulaire évitable.
- **P1 code** : règle `Δ% ≤ +12%` (au lieu +15%) post-récup ; ajouter pic 75-77 km dans 1 sem dev3/spec3 pour briser monotonie.
- **P1 prompt** : safetyWarning F-14 doit ajouter ligne sur charge progressive S1 (limite SL 30% hebdo).
- **P2** : variation intra-bloc dev/spec (cf thibaud).

### Autocritique

Plan visuellement "propre" (Confirmé + cv 50 + PB Semi cohérent → halo positif). **L'inversion Seuil/Marathon en chrono aurait été ratée sans recalcul %VMA forcé**. Ajouter au pipeline : check obligatoire `seuilPace numérique < marathonPace numérique`.

---

## Plan #4 — terry.lucile — Finisher 5K — 12 sem.

**Profil** : F 21 ans, 173cm/67kg (BMI 22.4), VMA 8.15 km/h dérivée 5K 38:46, cv=4, freq=3, level Débutant (0-1 an), **injuries=true (genou + Osgood + Sever + hyperlaxité)**, goal "Perte de poids".

### Métriques

| Métrique | Valeur plan | Référentiel Finisher Débutant | Verdict | Patch |
|---|---|---|---|---|
| feasibility.score | 70 / BON | Finisher 5K sans chrono = atteignable | OK score | Voir D17 ci-dessous |
| **D17 transparence opt-in malgré BON ?** | Score 70 + injuries=true (4 antécédents) | Doctrine D17 stricte = RISQUÉ/IRRÉALISTE. Sécurité > UX → **devrait trigger opt-in dès `hasInjury=true`** | **Trou doctrinal** : injuries ignorées dans la logique opt-in | **P0 code** : ajouter `hasInjury=true` aux triggers opt-in |
| VMA vs PB 5K | VMA 8.15 dérivée 5K 38:46 (5K pace 7:45 = 7.73 km/h ≈ 95% VMA) | Cohérent doctrine PB-based | OK | RAS |
| Allure EF 11:00 (5.45 km/h) | 67% VMA = math correct | Allure techniquement valide | **Mode marche/course déjà appliqué** (type session = "Marche/Course") ✅ | OK doctrine |
| Allure EF "sautillement" sur genou fragile ? | 11:00/km en course continue à 67 kg avec Osgood+Sever+hyperlax | Risque articulaire si course continue | **Mode marche/course = solution doctrinalement correcte** (Débutant + injuries) | OK |
| Doctrine mode marche/course | Appliquée ✅ | `feedback_mode_marche_course_scope` Débutants uniquement | Conforme | RAS |
| weeklyVolumes Δ% | [5,5,5,4,6,6,5,7,7,6,7,7] — Δ : 0/0/-20/**+50**/0/-16.7/**+40**/0/-14.3/+16.7/0 | Règle +12% rouge | **2 sauts +50%/+40%** en % MAIS sur petits volumes (+2 km absolu post-récup) | **Règle Δ% à raffiner pour bas volumes** : ignorer si Δ absolu ≤ 2 km |
| Pic hebdo | 7 km | Finisher Débutant 15-25 | **Très sous-dimensionné** mais cohérent cv=4 + injuries (charge allégée volontaire `feedback_courte_duree_charge_allegee`) | OK doctrine |
| SL S1 (samedi 2.8) | 55% du hebdo 5.1 | Trop haut en % mais 2.8 km = ~34 min | OK en valeur absolue Débutant injuries | RAS |
| **Inversion S1** : Sam 2.8 > Lun 2.3 | Sam = SL fin de semaine, Lun = première sortie | Logique : SL en fin de semaine = OK design intentionnel | **PAS un bug**, progression intra-semaine conforme | RAS |
| Cohérence Level vs cv | Débutant + cv 4 | F-15 inactif (cohérent) | OK | RAS |
| F-14 / F-15 | BMI 22.4 / age 21 → ni F-14 ni F-15 | Standard | OK | RAS |
| **Injuries reflétées safetyWarning ?** | "Fais valider la reprise avec ton kiné/médecin avant de démarrer ce plan. Adapte les séances si nécessaire." | Doctrine sécurité > UX | **Trop générique** : ne nomme PAS genou/Osgood/Sever/hyperlax | **P1 reformulation safetyWarning** |
| **Injuries reflétées welcomeMessage ?** | "Compte tenu de ta douleur au genou et de tes antécédents de syndromes d'Osgood et de Sever ainsi que de ton hyperlaxité, nous avons conçu un démarrage très progressif..." | Doctrine | **Conforme et explicite** ✅ | RAS |
| **Violation `feedback_jamais_poids_minceur`** | welcomeMessage : *"Ton objectif de **perte de poids** est une excellente motivation..."* | Doctrine : zéro mention poids dans tout message utilisateur, sauf nom programme | **VIOLATION** : "perte de poids" écrit dans body du welcomeMessage | **P0 patch live** |
| Nom programme "Programme Perte de Poids — 12 semaines" | `feedback_perte_de_poids_titre_ok` autorise | OK | OK | RAS |

### Confirmer/Contester

- **Validé** : feasibility 70 BON math-OK mais **injuries=true doit déclencher opt-in** indépendamment du score (sécurité > conversion).
- **Validé** : mode marche/course **déjà bien appliqué** (D5 doctrine respectée).
- **Validé** : welcomeMessage explicite sur injuries (bon).
- **Contesté** : "Inversion charge S1 (samedi 2.8 > lundi 2.3) = bug" → **NON**, c'est design intentionnel (SL en fin de semaine, première sortie reprise plus courte). Lecture freelance incorrecte.
- **Découvert** : violation `feedback_jamais_poids_minceur` dans le welcomeMessage ("Ton objectif de perte de poids..."). À patcher LIVE.

### Manqué par freelance

- Violation **doctrine poids/minceur** dans welcomeMessage (clé pour vérif texte généré).
- safetyWarning **trop générique** vs injuries détaillés du questionnaire.
- D17 ne trigger PAS sur `hasInjury=true` → **trou code structurel**.

### Actions P0/P1/P2

- **P0 patch live welcomeMessage** (D5, plan du jour, S1 non vécue) : remplacer "Ton objectif de perte de poids est une excellente motivation..." par : *"Bienvenue dans ton programme ! Ton objectif d'arriver finisher est une excellente motivation pour structurer une routine durable. Compte tenu de ta douleur au genou..."* — supprime mention poids body, conserve "Perte de Poids" dans le NOM programme.
- **P0 code (D17 + injuries)** : étendre triggers transparence opt-in à `hasInjury=true || age>60 || BMI>30` même si score ≥ 70. Cohérent `feedback_securite_avant_conversion`.
- **P1 prompt safetyWarning** : injecter description injuries dans le prompt safetyWarning pour qu'il nomme les antécédents (cf welcomeMessage qui le fait déjà). Aujourd'hui safetyWarning et welcomeMessage divergent (incohérence interne).
- **P1 code prompt** : ajouter check texte généré "if /poids|minceur|IMC|silhouette/.test(welcomeMessage|safetyWarning|mainSet|advice) → reject + regen". Filtre lexical post-génération.
- **P2 règle Δ%** : raffiner règle Δ% > +12% pour ignorer si Δ absolu ≤ 2 km (sinon faux positifs sur petits volumes Finisher/Débutant).

### Autocritique

J'ai d'abord interprété "inversion S1" comme bug (lu en diagonale). **Reconstruction** : SL = sortie longue = naturellement en fin de semaine. Pas un bug. **Leçon** : toujours lire les `title` + `type` (ici "Sortie longue : Construire la base" → évident) avant de qualifier de "bug". À ajouter check méthodo : sortie nommée "SL" doit être en fin de semaine.

Violation `feedback_jamais_poids_minceur` aurait pu passer inaperçue sans check texte ciblé. **Ajouter au pipeline** : grep lexical poids/minceur/IMC sur welcomeMessage + safetyWarning + advice + mainSet de tout plan généré.

---

## Synthèse 2 plans

| Sujet | Plan #3 yvanperez | Plan #4 terry |
|---|---|---|
| feasibility | 60 AMBITIEUX justifié | 70 BON mais devrait trigger opt-in (injuries) |
| Doctrines violées | Inversion Seuil/Marathon (bug paces) | `jamais_poids_minceur` dans welcomeMessage |
| FFA progression | 3 sauts +15.8% post-récup borderline + monotonie 3 blocs | Sauts +40/+50% absorbés par valeurs absolues OK |
| S1 sécurité | Jeu vallonné + Ven 1h34 enchaînés (57 ans) | Marche/course bien appliqué ✅ |
| Verdict global | Bon plan, **P0 inversion paces + P0 reformuler Ven** | Plan acceptable, **P0 reformuler welcomeMessage + P0 trigger D17 injuries** |

### Top actions consolidées

- **P0 patch live** :
  - yvan : reformuler Ven 12km/1h34 → 8km récup OU déplacer gammes.
  - terry : welcomeMessage supprimer mention "perte de poids" dans body.
- **P0 code** :
  - Validation paces `seuilPace < marathonPace` (chiffre min/km).
  - D17 trigger sur `hasInjury=true || age>60 || BMI>30` même si score ≥ 70.
- **P1 code** :
  - Règle `Δ% ≤ +12%` strict post-récup (ignorer si Δ absolu ≤ 2 km).
  - Filtre lexical post-gen : `/poids|minceur|IMC|silhouette/` reject.
  - Injection description injuries dans prompt safetyWarning.
- **P1 prompt** : safetyWarning F-14 ajouter charge progressive S1.
- **P2** : variation intra-bloc dev/spec (récurrent thibaud + yvan).

### Correctif méthodologique audit V2

Ajouts au pipeline d'audit après V1 :

1. **Check `seuilPace < marathonPace` numérique** (bug structurel détecté yvan).
2. **Grep lexical poids/minceur/IMC** sur tous champs texte plan.
3. **Lire `title` + `type` avant qualifier "inversion"/"bug"** (faux positif terry).
4. **Δ% relatif** à pondérer par Δ absolu (règle Δ%>+12% sans seuil km = faux positifs Débutants).
5. **D17 trigger** ne doit plus dépendre uniquement de feasibility.score, ajouter `hasInjury || age>60 || BMI>30`.
