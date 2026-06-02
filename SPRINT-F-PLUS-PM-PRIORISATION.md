# SPRINT F+ PHASE 2 — PRIORISATION PM TECHNIQUE

**Date** : 2026-05-27
**Auteur** : PM Technique Coach Running IA
**Statut** : Phase 1 déployée ce matin (F-5, F-7, F-11). Reste 7 bugs à séquencer.
**Verdict global** : **3 vagues** sur 10 jours ouvrés, avec gate de batterie 15+ profils entre chaque.

---

## SECTION 1 — Matrice Priorisation (Impact × Effort × Risque × ROI)

| Bug | Impact (0-10) | Users touchés | Effort (h) | Risque régression | ROI (Impact/h) | Rang |
|------|--------------|---------------|------------|-------------------|----------------|------|
| **F-10** Premium feasibility BON auto-chain | **10** | 100 % users qui payent après preview MAUVAIS | 3-4 h | **Faible** (front-only, branche conditionnelle) | **2.86** | **#1** |
| **F-1** Stagnation linéaire macro >20 sem | **8** | Débutants cv=0 + tous plans Marathon/Ultra long | 6-8 h | **Moyen** (rampe weeklyVolumes, touche le cœur) | **1.14** | **#2** |
| **F-3** D18b plat-équivalent non explicitée | **7** | 100 % plans trail vallonné (D+ > 30 m/km) | 4-5 h | **Moyen** (postProcess, contamine allures) | **1.56** | **#3** |
| **F-9** Pas de gestion races intermédiaires | **6** | ~5-10 % users (déclarent course inter) | 8-10 h | **Élevé** (nouvelle logique tapering local) | **0.67** | **#4** |
| **F-2** Affûtage Ultra insuffisant >200 km | **5** | Ultra >200km : ~1-2 % users (niche) | 3-4 h | **Moyen** (touche postProcess Ultra, isolable) | **1.43** | **#5** |
| **F-4** SL Dimanche figée Débutant cv=0 | **4** | Trail Débutant cv=0 dim-only : niche dans niche (~1 %) | 2-3 h | **Faible** (front placement, isolé) | **1.60** | **#6** |
| **F-8** suggestedLocations topographie aveugle | **3** | Cosmétique, tous users de l'outil | 6-8 h | **Faible** (dataset géo, no-op si vide) | **0.43** | **#7** |

**Lecture** :
- F-10 **explose le tableau** : impact 10, faible risque, effort 3 h. C'est un fix Premium qui paye et n'a pas son plan recalibré. **Doit partir EN PREMIER, possiblement en hotfix isolé**.
- F-1 et F-3 sont les **deux fix coach** prioritaires : ils touchent le moteur, ils demandent une batterie sérieuse, mais leur impact qualité plan est massif.
- F-9 a un effort élevé et un risque élevé : c'est **le plus gros chantier**, à isoler.
- F-2 + F-4 sont des fixes niche mais peu chers : opportunistes.
- F-8 ne mérite pas la Phase 2. **Le déprioriser en Phase 3**.

---

## SECTION 2 — Ordre Déploiement Recommandé (3 Vagues)

### **VAGUE 1 — HOTFIX PREMIUM** (J+1, demain)
**Périmètre** : F-10 uniquement.
**Justification** : Cas terebeu = user qui paye Premium APRÈS preview MAUVAIS et reçoit le même plan sans recalibration. Saignement business + doctrine D17 transparence violée. **Isolable, front-only, 3 h dev + 2 h test.**
**Critère succès** : Sur 5 users premium fictifs avec preview feasibility ≤ 30, après paiement le plan est régénéré avec calibration adaptée + warning.

### **VAGUE 2 — MOTEUR PLANS (rampe + post-process)** (J+3 à J+6)
**Périmètre** : F-1 + F-3 + F-2 groupés.
**Justification** :
- F-1 et F-3 touchent tous deux la phase post-génération (rampe weeklyVolumes pour F-1, allures plat-équivalent pour F-3). **Conflit potentiel sur l'ordre d'application**.
- F-2 est dans la même famille (postProcess Ultra affûtage) : si on touche affûtage Ultra, autant grouper avec F-3 plat-équivalent.
- **Test commun** : batterie 15+ profils diversifiés OBLIGATOIRE (doctrine `validation_n_profils_avant_sprint`).

**Sous-séquence interne** :
1. F-1 d'abord (rampe weeklyVolumes corrige la stagnation, base saine pour la suite)
2. F-3 ensuite (post-process plat-équivalent appliqué APRÈS rampe, sinon les allures sont recalculées sur des volumes faux)
3. F-2 en dernier (affûtage Ultra ne touche que les 3-4 dernières semaines, indépendant)

**Critère succès** : Batterie 15 profils (3 Débutants long-format, 3 Marathon 16 sem, 3 Ultra >200 km, 3 Trail vallonné, 3 Hyrox) sans régression vs baseline Phase 1.

### **VAGUE 3 — RACES INTERMÉDIAIRES + NICHE** (J+7 à J+10)
**Périmètre** : F-9 + F-4.
**Justification** :
- F-9 est le **plus gros morceau** (tapering local sur courses intermédiaires) : effort 8-10 h, risque élevé. À isoler pour ne pas le mélanger avec les fix moteur.
- F-4 est petit, niche, et front-only (placement SL Débutant cv=0). Peut profiter du même cycle de validation que F-9.

**Critère succès** : 5 profils avec course intermédiaire (10k inter dans plan Semi, Semi inter dans plan Marathon, etc.) + 3 profils Trail Débutant cv=0 préférant Dimanche.

### **VAGUE 4 — DÉPRIORISÉ PHASE 3** (pas dans Sprint F+)
**Périmètre** : F-8 (suggestedLocations topo).
**Justification** : Cosmétique pur, aucun user ne se plaint, dataset géo à construire. **À reporter dans Sprint G** avec d'autres améliorations UX outils.

---

## SECTION 3 — Tests Requis par Vague

### Vague 1 (F-10)
- **E2E** : 5 users Premium fictifs avec preview feasibility ∈ {15, 22, 28, 30, 31}. Vérifier que ≤ 30 déclenche recalibration post-paiement, > 30 garde le plan preview.
- **Non-régression** : 5 users Premium avec preview feasibility > 80 (BON) ne doivent PAS être recalibrés inutilement (perte du plan validé).
- **Smoke post-deploy** : Monitorer 24 h les paiements Premium, vérifier qu'aucun plan recalibré ne casse (taux erreur génération).
- **Edge case critique** : User qui paye Premium ET change ses inputs entre preview et paiement (cv, freq) — F-10 doit prendre les inputs ACTUELS, pas ceux de la preview.

### Vague 2 (F-1 + F-3 + F-2)
- **Batterie obligatoire** : **15+ profils diversifiés** (doctrine `validation_n_profils_avant_sprint`). Composition recommandée :
  - 3 Débutants cv=0 sur Marathon 24 sem (cible F-1)
  - 3 Confirmés cv=4 sur Ultra 28 sem (cible F-1 + F-2)
  - 3 Trail vallonné D+ > 50 m/km (cible F-3)
  - 3 Marathon 16 sem (non-régression Phase 1)
  - 3 Semi 12 sem (non-régression Phase 1)
- **Comparaison baseline** : diff JSON plan-par-plan vs sortie post-Phase 1 sur les 110 plans déjà audités (R11 acté). Tolérance : zéro régression sur warnings feasibility, dates startDate, freq, allures cibles.
- **Smoke post-deploy** : 48 h de génération, alerte si % plans avec feasibility ≤ 30 augmente de >5 % (signe de régression rampe).
- **Test spécifique F-3** : 3 plans Trail avec D+ identique et freq différents → l'allure plat-équivalent doit être expliquée dans le welcomeMessage (doctrine D18b).

### Vague 3 (F-9 + F-4)
- **E2E F-9** : 5 profils avec course intermédiaire à 4, 6, 8, 10 semaines de la course principale. Vérifier tapering local 5-7 jours, retour charge normale post-course inter, pas de double affûtage avec course principale.
- **E2E F-4** : 3 profils Trail Débutant cv=0 préférant Dimanche uniquement. SL doit être placée le Samedi (recovery dimanche), pas figée le Dimanche.
- **Non-régression complète** : re-passer la batterie 15 profils Vague 2 + 5 profils Vague 3 pour valider l'absence de régression croisée.
- **Smoke post-deploy** : 7 jours de génération, focus sur les plans avec course inter (rare mais critique).

---

## SECTION 4 — Dépendances et Conflits

### Dépendances entre fixes
| De | Vers | Type | Action |
|----|------|------|--------|
| F-1 (rampe) | F-3 (allures post-process) | **Ordre d'application** | F-1 doit s'appliquer AVANT F-3, sinon F-3 calcule allures sur volumes non rampés. |
| F-1 (rampe) | F-2 (affûtage Ultra) | **Ordre d'application** | F-1 rampe → F-2 affûte les 3-4 dernières semaines. Inversé, l'affûtage est écrasé. |
| F-3 (plat-équivalent) | F-2 (affûtage Ultra) | **Indépendant** | F-3 sur allures, F-2 sur volumes. Pas de conflit direct. |
| F-9 (races inter) | F-1 (rampe) | **Dépendance forte** | Le tapering local F-9 doit s'insérer DANS la rampe F-1 sans casser la cohérence macro. À tester ensemble en Vague 3 (re-passer batterie Vague 2). |
| F-10 | Tous les autres | **Aucune** | F-10 est front-only, sur le trigger de recalibration. Indépendant. |
| F-4 | F-8 | **Aucune** | F-4 sur placement SL, F-8 sur suggestedLocations (UI). Indépendants. |

### Conflits potentiels identifiés
1. **F-1 + F-3 sur postProcess** : si les deux modifient la même fonction `applyPostProcess(plan)`, attention à l'ordre des transformations. **Recommandation : chaîner explicitement `applyRampVolumes` → `applyFlatEquivalentPace` → `applyUltraTaper`**, jamais en parallèle.
2. **F-9 vs doctrine D2 (inputs immuables)** : si une course intermédiaire est dans les inputs user, on ne la touche pas. Mais le tapering local autour DOIT modifier les semaines générées. À documenter clairement : "on ne touche pas la course, on adapte les semaines autour".
3. **F-10 vs doctrine `patch_live_plans_jour_seulement`** : si un user paye Premium APRÈS avoir commencé sa S1 (preview vécue), F-10 ne doit PAS recalibrer rétroactivement. **À tester explicitement** : preview générée J-3, paiement J+1, S1 commencée → garder S1 telle quelle, recalibrer S2+.

---

## SECTION 5 — Risques Résiduels (que le dev senior n'a probablement PAS vus)

### Risque 1 — F-10 ne couvre QUE la création post-paiement, pas le changement Premium en cours de plan
**Description** : Le fix F-10 trigger la recalibration au moment du paiement Premium. Mais un user Free qui devient Premium **en cours de plan** (S3, S5...) ne voit RIEN se passer. Le plan reste calibré Free pour les semaines restantes.
**Impact** : Premium en cours de plan = plan sous-calibré = doctrine D17 violée (transparence pas respectée car warning generated AVANT le paiement).
**Recommandation** : Spec explicite "F-10 ne couvre que premium-at-creation". Ouvrir ticket séparé F-12 "Premium-mid-plan recalibration" pour Sprint G. **NE PAS** scope-creep en Vague 1.

### Risque 2 — Batterie 15 profils PRE-VAGUE 2 risque de ne pas couvrir l'interaction F-1 × F-3
**Description** : La batterie standard teste chaque profil isolément. L'interaction rampe×plat-équivalent sur un même plan (ex: Trail Marathon Débutant 24 sem D+ 60 m/km) peut produire des plans aberrants que les profils mono-axe ne révèlent pas.
**Recommandation** : Ajouter 3 profils **cross-axe** à la batterie Vague 2 :
- Débutant cv=0 + Trail vallonné + 24 sem (F-1 × F-3)
- Confirmé cv=4 + Ultra >200 km + D+ 80 m/km (F-1 × F-2 × F-3, le triple combo)
- Intermédiaire cv=2 + Trail 16 sem D+ 40 m/km (F-3 baseline)

### Risque 3 — Re-passer 110 plans audités R11 va consommer ~6-8 h CPU/dev
**Description** : R11 a acté la batterie 110 plans comme référence. Re-passer cette batterie après chaque vague est coûteux. Si on le fait 3 fois (Vague 1, 2, 3), c'est 18-24 h cumulées.
**Recommandation** :
- **Vague 1** : NON, F-10 est front-only, ne touche pas la génération plan → skip batterie 110, seulement smoke 5 users Premium.
- **Vague 2** : OUI, obligatoire (cœur moteur).
- **Vague 3** : Partiel, 30 plans représentatifs suffisent (F-9 est niche, F-4 ne touche pas le moteur).

### Risque 4 — F-9 (races intermédiaires) interagit avec F-1 et rampe macro
**Description** : Un tapering local sur course intermédiaire = creux dans la rampe macro. Si F-1 calcule la rampe SANS connaître les courses inter, on a une rampe qui ignore les creux. Si F-9 s'applique APRÈS, on a des sauts de volume incohérents.
**Recommandation** : Spec F-9 doit déclarer "F-9 s'applique en input de la rampe F-1, pas en post". Concrètement : marquer les semaines de course inter AVANT le calcul de rampe, puis rampe calcule sur les semaines non-marquées, puis tapering local applique le creux. **Architecture critique à valider AVANT de coder F-9**.

### Risque 5 — Doctrine D2 (inputs immuables) vs welcomeMessage F-3
**Description** : Doctrine D18b sur plat-équivalent : on explique au user que ses allures sont adaptées au D+. Mais doctrine D2 dit que les allures sont des inputs immuables. **Faux conflit** mais à clarifier dans le welcomeMessage : on NE MODIFIE PAS l'allure cible (D2), on l'AFFICHE adaptée au terrain (D18b) en commentaire.
**Recommandation** : Template welcomeMessage F-3 doit dire littéralement : "Ton allure cible 5'30/km reste la même. Sur ton parcours D+ 60 m/km, ça équivaut à ~5'45/km en plat équivalent — c'est normal, on adapte." **Jamais "on baisse ton allure à 5'45"**.

### Risque 6 — F-4 (SL Dimanche Débutant cv=0) risque doctrine "compromis vs extrême"
**Description** : Forcer la SL hors Dimanche pour un Débutant cv=0 qui préfère Dimanche peut être perçu comme un input écrasé (D2 violation). Le user préfère Dimanche = preferredDays.
**Recommandation** : Pas écraser, **proposer en welcomeMessage** : "Tu préfères courir le dimanche, on a placé ta SL le samedi avec récup dimanche pour mieux récupérer la semaine. Si tu préfères vraiment dimanche, c'est ton choix." → respecte doctrine "compromis + messages préventifs" (`feedback_compromis_messages_preventifs`). **PAS d'écrasement silencieux**.

### Risque 7 — Sprint F+ Phase 2 sur 10 jours = pas de buffer si bug critique
**Description** : 3 vagues sur 10 jours = enchaînement sans marge. Un bug en Vague 2 (cœur moteur) peut bloquer Vague 3.
**Recommandation** : Insérer **gate explicite** post-Vague 2 : si batterie 15 profils trouve >2 régressions, **STOP Vague 3, on patch Vague 2 avant**. Pas de Vague 3 si Vague 2 instable. Communiquer cette gate clairement avant de lancer.

---

## SECTION 6 — Décisions PM à Trancher (3 maximum)

### Décision 1 — F-10 hotfix isolé OU groupé avec Vague 2 ?
**Recommandation PM** : **Hotfix isolé Vague 1 demain**.
**Argument** : Cas terebeu est un user Premium qui a payé et reçu un plan non-recalibré. C'est du saignement business + doctrine D17 violée + Premium qui paye ≠ Free. Effort 3 h, risque faible. **Pas de raison d'attendre 6 jours**.
**Décision attendue** : OUI / NON hotfix Vague 1.

### Décision 2 — F-9 (races intermédiaires) dans Sprint F+ ou repoussé Sprint G ?
**Recommandation PM** : **Garder en Sprint F+ Vague 3, mais valider l'architecture AVANT de coder**.
**Argument** : F-9 a un impact 5-10 % users (pas niche), mais l'effort 8-10 h + risque élevé d'interaction avec F-1 (rampe). Si on coupe Sprint F+ après Vague 2, on libère F-9 pour Sprint G avec specs propres.
**Trade-off** : Si on garde, risque dérive planning. Si on repousse, 5-10 % users continuent à avoir des plans sans tapering local sur courses inter pendant 2-3 semaines.
**Décision attendue** : KEEP Vague 3 / DEFER Sprint G.

### Décision 3 — Batterie 110 plans R11 : on la re-passe à chaque vague ou seulement Vague 2 ?
**Recommandation PM** : **Vague 2 oui (obligatoire), Vague 1 non, Vague 3 partielle (30 plans représentatifs)**.
**Argument** : Coût 6-8 h CPU/dev par passage. F-10 est front-only (skip). F-9/F-4 touchent peu le cœur (30 plans suffisent). Vague 2 est le cœur moteur, batterie complète obligatoire.
**Décision attendue** : Confirmer la stratégie batterie par vague (full Vague 2, smoke Vague 1, partielle Vague 3).

---

## ROADMAP EXÉCUTABLE (résumé tranchant)

| Jour | Action | Owner | Gate |
|------|--------|-------|------|
| J+1 (demain) | **Vague 1** : F-10 hotfix, 5 tests Premium, deploy + smoke 24 h | Dev senior | Décision 1 |
| J+3 | **Vague 2** kickoff : F-1 + F-3 + F-2 en parallèle code, batterie 15+3 profils prête | Dev senior + PM | Architecture F-1×F-3 validée |
| J+5 | **Vague 2** : batterie 15+3 profils + 110 plans baseline | PM + Dev | Zéro régression vs Phase 1 |
| J+6 | **Vague 2** deploy + smoke 48 h | Dev senior | Taux feasibility ≤ 30 stable |
| J+7 | **Gate** : Vague 2 stable ? Si OUI → Vague 3. Si NON → patch. | PM | Décision 2 |
| J+7 à J+10 | **Vague 3** : F-9 + F-4, 8 profils E2E + 30 plans non-régression | Dev senior + PM | Architecture F-9 dans rampe validée |
| J+10 | **Vague 3** deploy + smoke 7 j | Dev senior | Premières courses inter générées sans warning |
| Sprint G | **F-8** (cosmétique) + **F-12** Premium-mid-plan (issue Risque 1) | Backlog | — |

**Verdict final** : F-10 demain, batterie 15+3 profils non-négociable avant Vague 2, gate stricte avant Vague 3. F-8 sort de Sprint F+. F-12 (Premium-mid-plan) ouvert comme dette technique pour Sprint G.
