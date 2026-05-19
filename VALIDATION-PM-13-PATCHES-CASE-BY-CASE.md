# Validation PM — 13 patches case-by-case
Date: 2026-05-18
Auteur: PM senior Coach Running IA (15 ans d'expérience produit)
Source: `AUDIT-19-PLANS-PIC-SL-CASE-BY-CASE.md`
Périmètre: validation arbitrale **case-by-case** des 13 patches proposés. Aucun code/Firestore modifié.

---

## Synthèse exec

| Verdict | Compte |
|---|---|
| GO direct | **6/13** |
| GO avec modif | **3/13** |
| CHALLENGE | **2/13** |
| DIFFÉRER | **2/13** |

**Ratio executable immédiat (GO + GO modif) : 9/13 (69 %)**
**Patches refusés / décalés (CHALLENGE + DIFFÉRER) : 4/13 (31 %)**

Priorisation finale :
- **Vague 1 (URGENT, Premium graves)** : Lucie, Manon, Emmanuel — 3 patches sains, à lancer immédiatement.
- **Vague 1 bis (SL pic uniquement)** : Antoine, Annabelle — 2 patches GO mais riskier techniquement (touche `weeks[].sessions`).
- **Vague 2 (Preview/secondaires)** : Valentine, Alan (avec modif), Cyrienne — patches OK.
- **Vague 3 (mineurs)** : Julien — fix S1 cosmétique acceptable.
- **DIFFÉRER** : Amélie (besoin décision business), Romain (besoin vérif état consommation).
- **CHALLENGE** : Armando (progression trop agressive), Mouhammad (ROI faible).

---

## Référentiel de décision PM

Critères d'arbitrage utilisés (par ordre de poids) :
1. **Doctrine sécurité** : pas de saut > +50 % declared sur < 24 sem.
2. **Doctrine "qualité avant vitesse"** : on ne patche pas sous pression. Si un doute → différer.
3. **Doctrine "écouter inputs client"** : declared/freq/race respectés, pas écrasés.
4. **Doctrine "compromis + préventif"** : préférer un patch modéré + transparence à un patch agressif silencieux.
5. **Doctrine "pas de contact client direct"** : aucune communication. Tout reste backend.
6. **Risque support / confiance** : un patch visible sur un Premium actif = potentiel ticket support.
7. **Risque conversion (Preview)** : un Preview "trop mou" perd l'achat, un Preview "trop dur" effraie.

---

## Détail par patch (13 sections)

### Patch 1 — Alan (alanwentzel74@gmail.com) — Preview Trail 35 km

**Patch proposé** : pic 34→**45 km** (+32 %), SL pic 10.2→**22 km** (+115 %), weeklyVolumes `[30,33,36,30,36,40,36,42,45,32,22]`.

**Verdict PM** : ⚠️ **GO avec modif**
**Risque doctrine** : faible (pic × 1.5 declared = exactement le plafond physio safe documenté).
**Risque user** : moyen — Alan est Preview, donc le plan **change avant** qu'il le consomme. Pas de risque de plainte d'un user qui a déjà vu le plan. En revanche, doubler la SL pic (10→22) sur un Finisher Confirmé qui ne court que 30 km/sem peut effrayer à la conversion s'il voit "SL pic 22 km" affiché.
**Risque conversion** : moyen — c'est précisément le levier de conversion. Un SL trop élevée dans le Preview = friction.
**Cohérence avec décisions précédentes** : ✅ aligné avec la décision Alan MIX welcome (transparence). Et aligné avec georgeslor1 désabonné car "plan mou" — on a une preuve qu'un plan sous-calibré coûte des Premium.
**Justification PM** : Le ref Trail 35 km Confirmé veut 53-70 km de pic. On plafonne à 45 km (×1.5 declared) = doctrine. Doubler la SL d'un coup est cohérent côté coaching mais visuellement violent. Solution : monter SL pic à **18-20 km** (au lieu de 22) — toujours +80 % vs actuel, déjà énorme, plus digeste, et techniquement suffisant pour un Finisher 35 km. On garde la marge sécurité Finisher.

**Modif proposée si GO avec modif** :
- weeklyVolumes : `[30, 33, 36, 30, 36, 40, 36, 42, 45, 32, 22]` ✅ inchangée
- **SL pic visée : 18-20 km** (au lieu de 22). 50 % du pic 40, raisonnable.
- Note interne (sans contact client) : si Alan passe Premium, A3+A4 régénèrent le welcome MIX et ajustent.

---

### Patch 2 — Antoine (antoineg.gde@outlook.fr) — Preview Marathon sub-3h00

**Patch proposé** : pic **inchangé** à 95 km, **SL pic 24→32 km** uniquement (+33 %).

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — Antoine est Expert Performance, declared 80 km, ref Marathon Expert sub-3h00 demande SL 32-38 km. Strictement aligné.
**Risque user** : faible — Preview, plan pas encore consommé. SL pic 32 km est attendu par le profil (un sub-3h sait qu'il faut courir 32+ km en SL).
**Risque conversion** : 0 — au contraire, **+ de valeur perçue** (SL 32 km crédibilise le plan).
**Cohérence avec décisions précédentes** : ✅ aligné avec patch bug Antoine "2h60" (déjà identifié comme cas critique). Et avec la doctrine "qualité avant vitesse" : c'est non-négociable pour un Expert sub-3h.
**Justification PM** : Sans SL pic ≥ 32 km, un sub-3h va **mur à 30 km** le jour J. C'est un défaut de produit non-acceptable pour un profil Expert. Patcher = obligation produit. **Réserve technique** : ce patch touche `weeks[].sessions[].duration/distance/mainSet` (pas juste `weeklyVolumes`). Demander à A3+A4 un test de régénération propre avant déploiement.

---

### Patch 3 — Annabelle (nabou57@hotmail.fr) — Preview Semi 1h45

**Patch proposé** : pic **inchangé** à 45 km, **SL pic 13→18-19 km** (+40 %).

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — ref Semi Confirmé sub-1h45 demande SL 18-22, on entre dans la borne basse.
**Risque user** : faible — Preview, plan pas encore consommé. SL pic 18-19 km est en-dessous de la distance race (21 km), donc psychologiquement OK.
**Risque conversion** : 0 — gain de valeur perçue.
**Cohérence avec décisions précédentes** : ✅ aligné doctrine "patch sécurité = patch produit".
**Justification PM** : Semi 1h45 = pace 5'00/km = un Confirmé qui doit avoir fait au moins une SL ≥ 18 km avant la course. 13 km en pic = insuffisant. Patch est un **must-have** sécurité produit.
**Même réserve technique qu'Antoine** : patch touche `weeks[].sessions`, demander test régénération avant push.

---

### Patch 4 — Armando (arenaarmando@hotmail.com) — Preview Semi 1h20

**Patch proposé** : pic 84→**95 km** (+13 %), SL pic 21→**25-26 km** (+24 %).

**Verdict PM** : ❌ **CHALLENGE**
**Risque doctrine** : faible-moyen — declared 80, pic 95 = ×1.19 (OK), mais le ref Semi Expert sub-1h20 demande 90-110. La progression existante (declared→pic 84 = +5 %) est cohérente sur 13 sem.
**Risque user** : faible — Preview.
**Risque conversion** : moyen — un sub-1h20 (= top 5 % coureurs FR) **connaît son volume**. Lui proposer 95 km/sem dans un Preview alors qu'il déclare 80 = il va se dire "ce plan ne me comprend pas, je fais déjà 80, je ne ferai pas 95 en 13 sem en pic". Risque de **lose conversion** par surenchère.
**Cohérence avec décisions précédentes** : ⚠️ tension avec doctrine "écouter inputs client". Armando déclare 80, on propose 95. Léger écrasement.
**Justification PM** : Le patch est **mal calibré pour le profil**. Un Expert qui fait déjà 80 km/sem et vise 1h20 n'a probablement **pas besoin de 95 km/sem** pour atteindre l'objectif — il a besoin de **séances qualitatives** (seuil long, VMA courte). Le ref 90-110 est théorique. Patcher la SL pic à 25 km est OK (besoin réel), patcher le pic à 95 = surenchère qui ne sert pas l'objectif et peut effrayer.

**Alternative si CHALLENGE** :
- weeklyVolumes : **inchangée** (84 km = OK, respecte declared 80)
- **SL pic visée : 24-25 km** (au lieu de 21, plus modéré que les 25-26 proposés)
- Justification : on respecte le declared, on patche uniquement la SL où le bénéfice produit est réel.

---

### Patch 5 — Valentine (valentinemery2004@gmail.com) — Preview Trail 20 km

**Patch proposé** : pic 26→**32 km** (+23 %), SL pic 8.8→**13-14 km** (+50 %), weeklyVolumes `[25,27,30,26,30,32,22]`.

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — declared 25, pic 32 = ×1.28, dans la zone safe.
**Risque user** : faible — Preview, race J-49. Patch invisible (pas consommé).
**Risque conversion** : faible-positif — un Trail Finisher 20 km a besoin d'une SL crédible pour boucler. SL 8.8 km en pic = signal "je vais DNF". Patch = signal de confiance.
**Cohérence avec décisions précédentes** : ✅ aligné doctrine sécurité Finisher.
**Justification PM** : SL pic 8.8 km pour un trail 20 km = 44 % de la race = risque DNF réel. Patch à 13-14 km = 65-70 % race = standard Finisher trail. Patch propre, faible risque, bénéfice produit clair.

---

### Patch 6 — Lucie (lafleur666@yahoo.fr) — Premium actif Semi 1h59

**Patch proposé** : S1 24→**40 km** (fix régression -40 %), pic 38→**42 km**, SL pic 19-21 km (inchangée). weeklyVolumes `[40,41,42,35,41,42,42,36,42,42,42,36,42,42,42,36,35,28,22,13]`.

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — la régression S1 -40 % est un **bug structurel**, le fix remet le declared 40.
**Risque user** : **élevé** — Premium **actif**, plan déjà vu. Si Lucie est déjà en S2-S5, patcher S1 et les semaines passées = elle voit des chiffres rétroactifs changer. **CRITIQUE** : il faut **vérifier `lastViewedWeek`** avant de patcher.
**Risque conversion** : N/A (déjà Premium).
**Cohérence avec décisions précédentes** : ✅ aligné doctrine "compromis + messages préventifs" et doctrine "qualité avant vitesse" — c'est exactement le type de régression dangereuse identifiée historiquement.
**Justification PM** : La régression S1 = -40 % est **inacceptable produit** sur un Premium payant. Patch obligatoire. **Mais** : il faut patcher **uniquement les semaines non encore consommées**. Stratégie :
1. Vérifier `lastViewedWeek` Lucie.
2. Si lastViewedWeek ≤ S1 : patcher tout le plan, S1 incluse.
3. Si lastViewedWeek ≥ S2 : patcher **uniquement S(lastViewed+1) à S20**. Les semaines passées restent intouchées (immutabilité historique).
4. Pas de communication user (doctrine "jamais contact client").

**Modif proposée** : valider la stratégie d'immutabilité historique avant patch. Le vecteur proposé est OK pour les semaines futures.

---

### Patch 7 — Romain (baroneromain26400@gmail.com) — Premium actif 5 km sub-20

**Patch proposé** : si plan non consommé, S1 22→**35 km** (fix régression -37 %), pic inchangé à 40. weeklyVolumes `[35,36,38,32,36,38,40,35,38,40,40,28,23,20]`.

**Verdict PM** : ⏸ **DIFFÉRER**
**Risque doctrine** : 0 si fix S1 propre.
**Risque user** : **très élevé** si patché sans vérif. Romain est à race J-38, plan 14 sem, probablement en S10-S11 = phase pic. Patcher S1-S6 = changer ses séances passées. **Inacceptable produit**.
**Risque conversion** : N/A (déjà Premium).
**Cohérence avec décisions précédentes** : ✅ aligné doctrine "qualité avant vitesse" — pas de patch à la va-vite.
**Justification PM** : Le pic et la SL pic sont **déjà OK ref** (40 km / 10.1 km, conformes au ref 5k Confirmé). Le seul défaut = régression S1. **Comment vérifier l'état de consommation** :
- Champ `lastViewedWeek` ou `currentWeek` dans le doc Firestore plan.
- Champ `completedSessions` ou tableau de sessions avec flag `done: true`.
- Fallback : timestamp création plan + durée écoulée = estimation semaine en cours.
- Si aucun de ces champs n'existe → impossible de patcher safely → différer définitivement.

**Condition si DIFFÉRER** :
1. Identifier le champ Firestore qui trace l'avancée user.
2. Si lastViewed ≥ S7 (donc S1 passée) → **NE PAS PATCHER**, accepter la régression historique (immutable).
3. Si lastViewed ≤ S3 → patcher S(current+1) à S14 avec le vecteur proposé.
4. Tant que cette vérif n'est pas faite : **NE PAS TOUCHER**.

---

### Patch 8 — Manon (manondbc92@gmail.com) — Premium actif Trail 23 km

**Patch proposé** : S1 18→**25 km** (fix -28 %), pic 30→**40 km** (+33 %), SL pic 15.7→**18 km**. weeklyVolumes longue (29 sem).

**Verdict PM** : ⚠️ **GO avec modif**
**Risque doctrine** : 0 — declared 25, pic 40 = ×1.6 sur 29 sem (largement dans le plafond > 24 sem).
**Risque user** : moyen-élevé — Premium **actif**, 29 sem de plan, race J-147. Si Manon est en S1-S5 = OK patcher. Si en S6+ = risque rétroactif.
**Risque conversion** : N/A (déjà Premium).
**Cohérence avec décisions précédentes** : ✅ aligné.
**Justification PM** : Pic 30 km est clairement sous-dim pour Trail 23 km Confirmé (ref 35-46). Patch légitime. **Même contrainte d'immutabilité historique que Lucie** : vérifier `lastViewedWeek`.

**Modif proposée si GO avec modif** :
1. Vérifier `lastViewedWeek` Manon.
2. Patcher uniquement S(current+1) à S29.
3. SL pic visée 18 km uniquement sur les semaines futures patchées.
4. Race J-147 = on a le temps, pas de précipitation.

---

### Patch 9 — Amélie (amelfoul@gmail.com) — Premium actif Ultra 102 km

**Patch proposé** : S1 33→**40 km**, pic 48→**65 km** (+35 %), SL pic 22→**30 km + B2B**.

**Verdict PM** : ⏸ **DIFFÉRER** (avec flag Romane immédiat)
**Risque doctrine** : **élevé conceptuellement** — inadéquation profil/race documentée. Patch à 65 km respecte le plafond physio (×1.6 declared 40 sur 20 sem) mais reste **massivement en-dessous du ref ultra 102 km** (90-130). On va vendre un plan dont on sait qu'il **ne couvre pas la charge race**.
**Risque user** : **très élevé** — Amélie est Premium **active**, race ultra dans 20 sem. Si elle suit le plan patché à 65 km et **abandonne à 60 km le jour J / se blesse à 80 km** → ticket support sévère + plainte. Doctrine "sécurité > conversion" + "JAMAIS embellir un plan IRRÉALISTE" s'applique directement.
**Risque conversion** : N/A (Premium).
**Cohérence avec décisions précédentes** : 🚨 **conflit direct** avec doctrine "sécurité > conversion" et "transparence + décharge explicite". Patcher en silence = embellir un plan irréaliste.
**Justification PM** : Le patch technique est **correct** (pic 65 = max safe). MAIS la question n'est pas technique : **est-ce que Coach Running IA assume vendre un plan ultra 102 km à un user qui ne court que 40 km/sem ?** C'est une **décision business**, pas une décision PM technique. Patcher silencieusement = engager la responsabilité produit. Refuser le user = perte Premium.

**Condition si DIFFÉRER** :
1. **Flag Romane immédiat** : décision binaire requise.
   - Option A : on patche au max safe (pic 65) + Romane envoie un message **directement** (jamais l'IA, doctrine "jamais contact client direct") expliquant les limites du plan + propose remboursement ou changement d'objectif.
   - Option B : on refuse le profil et on rembourse (cas extrême).
   - Option C : on patche au max safe (pic 65) + on régénère le welcomeMessage via A3+A4 avec décharge explicite ("plan calibré 65 km/sem max, ne reflète pas la charge ultra-marathon, blessure/abandon possible").
2. Tant que Romane n'a pas tranché : **NE PAS PATCHER**.

---

### Patch 10 — Emmanuel (emmanuel.tellier.professionnel@gmail.com) — Premium actif 10 km 40min

**Patch proposé** : S1 21→**25 km** (fix -16 %), pic 27→**37 km** (+37 %), SL pic 11.2→**14-15 km**. weeklyVolumes `[25,27,29,24,30,32,33,27,33,35,35,28,35,35,37,22]`.

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — declared 25, pic 37 = ×1.48, dans le plafond (declared × 1.5 sur < 12 sem ; ici 16 sem donc encore plus safe).
**Risque user** : moyen — Premium actif, race J-90, plan 16 sem. Probablement en S4-S6. **Vérifier `lastViewedWeek`** comme Lucie/Manon.
**Risque conversion** : N/A.
**Cohérence avec décisions précédentes** : ✅ aligné doctrine sécurité et "compromis".
**Justification PM** : Pic 27 km pour viser 10k en 40min = clairement sous-dim. 4'00/km demande de la cylindrée. Patch à 37 = dans le ref (35-45 borne basse). SL 14-15 km = standard. **Bonne cible de patch**, à condition de respecter l'immutabilité historique.

**Stratégie identique Lucie/Manon** : vérifier lastViewedWeek, patcher uniquement les semaines futures.

---

### Patch 11 — Cyrienne (cyrienne.dacosta@gmail.com) — Premium actif 10k Finisher

**Patch proposé** : pic 12→**14 km** (+17 %), SL pic 5.2→**7 km** (+35 %), S1 9→10. weeklyVolumes `[10,11,12,9,12,13,10,14,13,7]`.

**Verdict PM** : ✅ **GO**
**Risque doctrine** : 0 — declared 10, pic 14 = ×1.4, safe.
**Risque user** : faible — Premium actif mais plan court (10 sem), race J-40. Probablement en S5-S6. Les modifs sont mineures, peu visibles côté user.
**Risque conversion** : N/A.
**Cohérence avec décisions précédentes** : ✅ aligné. Et important : Cyrienne est Finisher, doctrine "compromis + sécurité" = on lui donne juste ce qu'il faut pour boucler, pas plus.
**Justification PM** : Patch légitime sécurité (SL 5.2 km pour boucler un 10k = juste). +35 % de SL = visible mais raisonnable. Race J-40 = temps OK.

**Note** : vérifier lastViewedWeek pour ne pas patcher S1-S5 si déjà consommées. Patch principalement utile sur S6-S9.

---

### Patch 12 — Mouhammad (mouhammadslimani2605@gmail.com) — Premium actif 10k sub-30 Élite

**Patch proposé** : S1 75→**88 km** (fix -15 %), pic 88→**95 km** (+8 %), SL pic 22 inchangée.

**Verdict PM** : ❌ **CHALLENGE**
**Risque doctrine** : 0 (changement marginal).
**Risque user** : moyen — Premium actif, race J-56, plan 9 sem. Très probablement en S5-S7 (phase pic). Patcher S1-S4 = rétroactif inutile. Patcher S5+ = micro-ajustements visibles sur un user Élite qui **connaît son corps mieux que l'IA**.
**Risque conversion** : N/A.
**Cohérence avec décisions précédentes** : ✅ aligné doctrine "pas de micro-expert" — quand validé à 90 %, avancer, ne pas empiler des raffinements.
**Justification PM** : Le plan **est déjà conforme ref** (pic 88 dans 80-110, SL 22 dans 20-24). Patcher pour gagner 7 km de pic sur un Élite qui court déjà 88/sem = **micro-ajustement sans valeur produit**. La régression S1 -15 % = légère et déjà consommée. ROI patch = quasi-nul, risque support = non-nul. **Refus**.

**Alternative si CHALLENGE** :
- **PAS DE PATCH**. Accepter le calibrage actuel.
- Si Romane tient à fixer la régression S1 pour cohérence du dataset, le faire **uniquement sur les semaines futures non consommées** (probablement S8-S9 = taper, donc patch nul).

---

### Patch 13 — Julien (deugnilson@gmail.com) — Premium actif Trail 20 km 3h05

**Patch proposé** : S1 26→**30 km** (fix -13 %), pic 35→**37 km** (+6 %), SL pic 17.8 inchangée.

**Verdict PM** : ⚠️ **GO avec modif**
**Risque doctrine** : 0.
**Risque user** : faible — Premium actif, race J-126 (18 sem), plan 19 sem. Probablement en S2-S5. Modifs marginales.
**Risque conversion** : N/A.
**Cohérence avec décisions précédentes** : ✅ aligné.
**Justification PM** : Le plan **est déjà OK** (pic 35 dans ref 30-40, SL 17.8 dans ref 12-16 borne haute mais OK). Le patch est cosmétique (S1 + 2 km de pic). On peut **se contenter du fix S1** sans toucher au pic.

**Modif proposée si GO avec modif** :
- **Patcher S1 uniquement** : 26→30 (fix régression cohérence dataset).
- **Ne pas toucher au pic** : 35 → laisser à 35.
- **Ne pas toucher à la SL pic** : 17.8 → laisser.
- Vérifier `lastViewedWeek` ; si S1 déjà passée, ne rien patcher du tout.
- Justification : minimiser le risque support sur un Premium calibré correctement.

---

## Synthèse arbitrage final pour Romane

| # | Plan | Email | Patch proposé (résumé) | Verdict PM | Action recommandée |
|---|---|---|---|---|---|
| 1 | Alan | alanwentzel74@gmail.com | pic 34→45, SL 10→22 | ⚠️ GO modif | Patcher pic 45, **SL pic 18-20** (pas 22). Preview, race J-70. |
| 2 | Antoine | antoineg.gde@outlook.fr | pic 95 OK, SL 24→32 | ✅ GO | Patcher SL pic uniquement. Test régénération `weeks[].sessions` avant push. |
| 3 | Annabelle | nabou57@hotmail.fr | pic 45 OK, SL 13→18-19 | ✅ GO | Patcher SL pic uniquement. Même réserve technique qu'Antoine. |
| 4 | Armando | arenaarmando@hotmail.com | pic 84→95, SL 21→25-26 | ❌ CHALLENGE | Garder pic à 84, patcher **uniquement SL pic à 24-25** (modéré). Respect declared 80. |
| 5 | Valentine | valentinemery2004@gmail.com | pic 26→32, SL 9→14 | ✅ GO | Patcher tel quel. Preview, race J-49. |
| 6 | Lucie | lafleur666@yahoo.fr | S1 24→40, pic 38→42 | ✅ GO | **Vérifier lastViewedWeek** avant. Patcher uniquement semaines futures. |
| 7 | Romain | baroneromain26400@gmail.com | conditionnel S1 22→35 | ⏸ DIFFÉRER | Identifier champ Firestore `lastViewedWeek`. Si ≥ S7 : NE PAS PATCHER. |
| 8 | Manon | manondbc92@gmail.com | S1 18→25, pic 30→40 | ⚠️ GO modif | Vérifier lastViewedWeek. Patcher uniquement S(current+1) à S29. Race J-147 = pas urgent. |
| 9 | Amélie | amelfoul@gmail.com | pic 48→65, SL 22→30+B2B | ⏸ DIFFÉRER | **Flag Romane décision business** : option A/B/C. NE PAS PATCHER en silence. |
| 10 | Emmanuel | emmanuel.tellier.pro@gmail.com | S1 21→25, pic 27→37 | ✅ GO | Vérifier lastViewedWeek. Patcher uniquement semaines futures. |
| 11 | Cyrienne | cyrienne.dacosta@gmail.com | pic 12→14, SL 5.2→7 | ✅ GO | Vérifier lastViewedWeek. Patcher semaines futures. |
| 12 | Mouhammad | mouhammadslimani2605@gmail.com | S1 75→88, pic 88→95 | ❌ CHALLENGE | **PAS DE PATCH**. Calibrage déjà bon, ROI nul, risque support non-nul. |
| 13 | Julien | deugnilson@gmail.com | S1 26→30, pic 35→37 | ⚠️ GO modif | Patcher **S1 uniquement**, ne pas toucher pic ni SL. |

---

## Patches refusés (récap)

### CHALLENGE (refus net)

- **Armando** — Le patch propose de surenchérir sur un Expert qui sait ce qu'il fait. Doctrine "écouter inputs client" + risque conversion. **Alternative validée** : patcher uniquement la SL pic (24-25 km), ne pas toucher au pic 84.
- **Mouhammad** — Le plan est conforme ref. Patcher pour gagner 7 km de pic = micro-expert sans valeur produit. Doctrine "pas de micro-expert".

### DIFFÉRER (en attente de condition)

- **Romain** — Condition : trouver le champ Firestore qui trace l'état de consommation du plan (`lastViewedWeek`, `currentWeek`, `completedSessions`). Sans ça, patcher = risque rétroactif inacceptable.
- **Amélie** — Condition : décision business Romane sur l'inadéquation profil/race ultra. Trois options à arbitrer (patch + message Romane, refus+remboursement, patch + welcome décharge). Doctrine "sécurité > conversion" en jeu.

---

## Risques transverses identifiés

### 1. Immutabilité historique (CRITIQUE)

**6 patches sur 13 touchent des Premium actifs** (Lucie, Romain, Manon, Amélie, Emmanuel, Cyrienne, Mouhammad, Julien = 8 en réalité). Pour TOUS, la doctrine produit doit être : **on ne modifie jamais une semaine déjà consommée**.

**Action requise avant tout patch Premium** :
1. Identifier le champ Firestore qui trace l'avancée user (`lastViewedWeek` / `currentWeek` / `completedSessions[]` / autre).
2. Implémenter une fonction `patchOnlyFutureWeeks(planId, newWeeklyVolumes, currentWeek)` qui ne remplace que `weeklyVolumes[currentWeek+1:]`.
3. Tester sur un plan dummy avant de toucher Lucie/Manon/Emmanuel.

**Si ce champ n'existe pas** : aucun patch Premium ne peut être lancé safely. C'est un **bloqueur produit majeur** à remonter à Romane.

### 2. Patches SL pic touchant `weeks[].sessions` (TECHNIQUE)

Antoine et Annabelle (et potentiellement les 8 autres SL-pic patches) demandent de toucher la structure `weeks[].sessions[].duration/distance/mainSet`, **pas juste `weeklyVolumes`**. C'est un patch :
- Plus invasif (touche le coeur du plan)
- Plus risqué (peut casser la cohérence intra-semaine, ex: SL = 40 % de hebdo qui devient incohérent)
- Demande une **régénération propre par A3+A4**, pas un patch brut.

**Action** : avant de lancer les patches SL pic, faire un test de régénération A3+A4 sur 1 plan (Antoine recommandé car le plus clair). Vérifier que la régénération respecte le pic `weeklyVolumes` + le ref SL pic + les paces existantes (intangibles).

### 3. Risque conversion sur les Preview (3 patches)

Alan, Valentine, Armando sont Preview. Les patches augmentent le volume/SL visible. Risque :
- Alan/Valentine : SL doublée = visuellement violent → mitigé par la modif proposée (SL 18-20 au lieu de 22 pour Alan).
- Armando : sub-1h20 qui voit 95 km/sem proposé alors qu'il déclare 80 = potentiel "ce plan ne me comprend pas" → mitigé par refus du patch pic.

### 4. Doctrine "qualité avant vitesse" appliquée

Sur 13 patches, **4 sont décalés ou refusés** (Romain DIFFÉRER, Amélie DIFFÉRER, Armando CHALLENGE, Mouhammad CHALLENGE). C'est le bon ratio : on ne patche pas à la va-vite. Les 9 GO/GO modif restent solides et exécutables.

### 5. Doctrine "pas de contact client direct" respectée

Aucun des 13 patches ne propose de message/mail/notif au user. Tout reste backend. Le cas Amélie (DIFFÉRER) renvoie explicitement la décision communication à Romane.

### 6. Cohérence avec décisions historiques

- ✅ georgeslor1 désabonné car plan mou → renforce la nécessité de patcher Lucie/Manon/Emmanuel (régression S1 + sous-dim).
- ✅ Sébastien BMI 40 calibré sain → confirmé en RAS (déjà patché expert FFA), pas re-touché.
- ✅ Antoine bug 2h60 patché → on garde Antoine en GO (sécurité produit non-négociable).
- ✅ Alan welcome MIX → on garde Alan en GO modif (SL 18-20 cohérent avec mix transparence).

---

## Recommandation finale d'exécution

**Vague 1 (immédiat, faible risque)** :
1. Antoine (SL pic 32) — Preview, test régénération A3+A4
2. Annabelle (SL pic 18-19) — Preview, test régénération A3+A4
3. Valentine (vecteur complet) — Preview
4. Alan (vecteur + SL 18-20) — Preview, avec modif

**Vague 2 (après implémentation `patchOnlyFutureWeeks`)** :
5. Lucie (vecteur, semaines futures uniquement)
6. Emmanuel (vecteur, semaines futures uniquement)
7. Manon (vecteur, semaines futures uniquement)
8. Cyrienne (vecteur, semaines futures uniquement)
9. Julien (S1 uniquement, si non consommée)

**Vague 3 (refus / décision)** :
10. Armando — alternative SL pic 24-25 seulement
11. Mouhammad — PAS DE PATCH
12. Romain — DIFFÉRER jusqu'à check `lastViewedWeek`
13. Amélie — DIFFÉRER, flag Romane décision business

**Total exécutable Vague 1+2 : 9 patches.**
**Total refusés/différés : 4 patches.**

---

## Bloqueurs produit identifiés (à remonter Romane)

1. **Champ Firestore d'avancée user introuvé documenté** : sans `lastViewedWeek` ou équivalent, **aucun patch Premium ne peut être lancé safely**. Bloqueur Vague 2 entière.
2. **Décision business Amélie** : option A/B/C à trancher. Doctrine sécurité vs perte Premium.
3. **Stratégie SL pic patch** : Antoine/Annabelle (et autres) demandent régénération A3+A4, pas patch brut. Process à valider.

Fin de la validation PM.
