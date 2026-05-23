# Audit rapide 11 plans 20/05
Date : 2026-05-20
Scope : 11 plans créés le 20/05/2026 (tous en preview, S1 seulement)
Méthode : fetch Firestore via service account, lecture seule

## Note méthodologique

Tous les plans sont en `isPreview=true` / `fullPlanGenerated=false` → seule S1 est générée. Les dimensions "Volume pic + évolution" sont évaluées via :
- `feasibility.message` (qui annonce le pic visé)
- `durationWeeks` + cohérence cible

Distance S1 calculée à partir des sessions (le champ `weeklyVolumes` n'existe pas en preview).

## Tableau synthèse

| # | Email | Goal / Cible | Welcome | Allure paces | Vol S1 | Feasibility | Diversité S1 | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | n.r***@gma | Trail 40k/2000D+ Finisher 10sem | OK | OK | OK 30km=curVol | RISQUÉ (cohérent) | OK 4 séances 3 types | OK |
| 2 | lil***@gma | 10km Finisher 20sem (déb 0km, BMI 26.3) | OK | OK | OK 8km marche/course | AMBITIEUX 60 | WARN 2x type "Sortie Longue" sur séances marche-course 4km | WARN |
| 3 | ber***@gma | Semi Finisher 19sem (51a, VMA 9.5, vol 15) | OK (médecin 51+) | OK | OK 14km | AMBITIEUX 65 | OK 3 séances 3 types | OK |
| 4 | mar***@out | Semi 2h20 19sem (IMC 29.4) | OK (pas de mention poids) | OK 2h20=6:38/km matche allureSpecifiqueSemi | OK 16km vs curVol 17 | AMBITIEUX 65 (cohérent) | OK 3 séances 3 types | OK |
| 5 | flo***@out | 10km Finisher 30sem (Expert VMA 17.5 sans PB) | OK | OK | OK 36km=curVol | AMBITIEUX 65 | WARN aucune qualité S1 (que footings/SL) mais 30sem permet | WARN |
| 6 | cyr***@yah | 10km 1h00 8sem (PB 10k 57min) | OK | OK 1h00=6:00 matche allureSpecifique10k | OK 15.8km vs curVol 20 | EXCELLENT 95 (cohérent) | WARN 2 "Sortie Longue" identiques + 0 séance qualité | WARN |
| 7 | cyr***@hot | Trail 45k/1900D+ 4h05 8sem (Expert VMA 17.5) | OK | OK paces VMA-based | OK 65km=curVol | IRRÉALISTE 5 (calcul %VMA faux: dit 90% au lieu 63% mais target trail ambitieux justifié) | OK 5 séances 3 types | WARN |
| 8 | pac***@gma | Trail 16k/1000D+ 2h15 15sem (Conf VMA 12.1) | OK | OK | OK 15km=curVol | BUG IRRÉALISTE 5 (calc dit 95%VMA, réalité 59%VMA, 2h15 = ULTRA conservateur sur 1000D+) | OK 3 types | BUG |
| 9 | mor***@gma | Semi Finisher 22sem (déb 7km, 20a) | OK | OK | OK 8km marche/course | AMBITIEUX 55 | OK type "Marche/Course" bien posé | OK |
| 10 | lou***@gma | Semi 1h10 22sem (Conf VMA 9.7, vol 10, BMI 30.4) | OK | BUG allureSpecifiqueSemi=3:19/km (target injecté brut sans plafond VMA) | OK 10km=curVol | IRRÉALISTE 5 (cohérent : 220% VMA) | OK 4 séances 4 types | BUG |
| 11 | phi***@gma | NO PLAN (questionnaire commencé, pas généré) | n/a | n/a | n/a | n/a | n/a | n/a |

Légende verdict : OK = aligné doctrine ; WARN = non-bloquant ; BUG = à investiguer code

## Findings critiques

### BUG 1 — louleroy94 : pace cible injectée sans plafond (CRITIQUE)
- `paces.allureSpecifiqueSemi = "3:19"` alors que `vmaPace = "6:13"`
- VMA déclarée 9.7 km/h → cadence physiologique max ~6:13/km
- Target 1h10 sur semi = 21.1 km/h théorique = 220% VMA
- Le système calcule allure = distance/temps SANS vérifier que c'est tenable
- Risque : si une séance future référence `allureSpecifiqueSemi`, elle prescrira du 3:19/km — IMPOSSIBLE
- Le plan est déjà flag IRRÉALISTE, mais la pace reste dans le doc
- **Action code** : clamp `allureSpecifique*` ≥ `vmaPace` (ou au moins ≥ `seuilPace`) quand `feasibility.status === 'IRRÉALISTE'`

### BUG 2 — paccaud.bertrand : feasibility IRRÉALISTE injustifié (CRITIQUE)
- Target 2h15 sur trail 16km / 1000m D+
- Vitesse cible : 16 / 2.25 = 7.11 km/h = 8:26/km
- VMA 12.1 km/h → 7.11/12.1 = **59% VMA**, pas 95% comme le dit le message
- Sur trail 1000m D+ pour 16km, 2h15 est très conservateur (allure équivalente plat ~9:30-10:00/km)
- Le système ne décompte pas le D+ : il calcule %VMA en plat alors que c'est un trail montagneux
- L'utilisateur reçoit "objectif impossible, essaie 2h49" alors qu'il devrait avoir EXCELLENT
- **Action code** : le calc %VMA en feasibility doit prendre en compte le `trailDetails.elevation` (formule type Naismith / Minetti)

### BUG 3 — cyril.berger : calcul %VMA trail ignore D+ (MÊME CAUSE QUE BUG 2)
- Target 4h05 sur 45km / 1900m D+, VMA 17.5
- Le message dit "90% VMA", réalité plat = 63% VMA
- Verdict IRRÉALISTE peut être justifié (45km trail demande spécifique), mais l'argumentaire chiffré est faux
- Si Berger lit "90% VMA" il sait que c'est faux et perd confiance
- **Action code** : même fix que BUG 2

## Warnings

- **WARN lilian.raymond2007 dim Diversité** : 2 séances type `Sortie Longue` sur des marche-courses 4km. Type incorrect — devrait être `Marche/Course` comme morgane.
- **WARN floggyz dim Diversité** : Expert VMA 17.5, 5 séances S1 toutes en EF. Justifié en phase fondamentale sur 30 sem, mais 30 sem est long pour 10km Finisher (10-12 sem standard).
- **WARN cyril.conilleau dim Diversité** : 8 sem pour 1h00/10km (PB 57min existe). S1 : 2 sorties identiques en EF + Renfo, zéro qualité. Sur 8 sem, S1 sans préparation à allure spé peut être trop tardif.
- **WARN cyril.berger dim Feasibility** : verdict IRRÉALISTE plausible (45km trail Expert sans PB validé), mais raison chiffrée fausse (cf BUG 3).
- **WARN bertrandcassin44 dim Niveau déclaré** : Confirmé (Compétition) déclaré mais PB 10km 1h10 + VMA 9.5 + vol 15 = profil clairement Débutant/Intermédiaire. Le plan a heureusement adapté (EF only). Pas bloquant mais incohérence questionnaire.
- **WARN louleroy94 dim Niveau déclaré** : Confirmé (Compétition) déclaré mais PB 10k 1h09 + VMA 9.7 + vol 10 = idem Bertrand, niveau gonflé.

## Stats globales

- **5/11 OK** parfaits : n.r, ber, mar, mor + (philippe = no plan, exclu)
- **4/11 WARN** non bloquants : lil, flo, cyr.con, cyr.ber
- **2/11 BUG critique** : louleroy94 (paces non plafonnées), paccaud (feasibility %VMA trail faux)
- **1/11 NO PLAN** : philippetaupin21 (questionnaire pas finalisé)

## Actions recommandées

### Patches live urgents
- **AUCUN** patch live nécessaire : tous les plans sont en preview (S1 seulement), aucune semaine n'a été "vécue". L'utilisateur n'a pas encore vu son plan complet → toute correction se fera à la génération du plan full, post-paiement.
- Exception louleroy94 : si elle paie, le pace 3:19 sera utilisé en spécifique → à corriger AVANT génération full ou par patch pre-paiement.

### Bugs code à investiguer (priorité décroissante)
1. **Calc %VMA en feasibility ignore le D+ trail** (touche pac, cyr.ber, n.r potentiellement). Fix : intégrer correction d'allure équivalente flat selon `trailDetails.elevation`.
2. **`allureSpecifique*` non plafonné quand IRRÉALISTE** : `paces.allureSpecifiqueSemi: "3:19"` pour louleroy. Clamp ≥ vmaPace.
3. **Typage séance marche-course mal posé** pour lilian (type=Sortie Longue au lieu de Marche/Course). Vérifier que le routing type fonctionne pour `level=Débutant + currentVol=0`.
4. **Welcome floggyz** ne mentionne pas que 30 sem est long pour 10km Finisher. Pas critique.
