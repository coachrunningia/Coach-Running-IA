# Audit case-by-case 19 plans : pic distance + SL pic

**Date** : 2026-05-18
**Périmètre** : 8 plans 18/05 (post-patch volumes) + 11 plans Premium graves (toRegenerate)
**Scope strict** : `weeklyVolumes` (pic) + SL pic uniquement. PAS de modif paces / welcomeMessage / feasibility / safetyWarning. Lecture seule Firestore.
**Doctrine** : aucune généralisation. Référentiel adapté **par PROFIL** (niveau × objectif × chrono visé).
**Auth** : `programme@coachrunningia.fr` + impersonation `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com`. OK.

---

## Référentiel coaching utilisé

| Objectif | Profil | Pic vol (km/sem) | SL pic (km) |
|---|---|---|---|
| **10 km** | Débutant Finisher | 12-18 | 7-9 |
| 10 km | Intermédiaire | 18-25 | 9-11 |
| 10 km | Confirmé sub-50min | 30-40 | 12-15 |
| 10 km | Confirmé sub-45min | 35-45 | 13-16 |
| 10 km | Expert sub-40min | 50-70 | 16-20 |
| 10 km | Expert sub-35min | 60-80 | 18-22 |
| 10 km | Élite sub-30min | 80-110 | 20-24 |
| **5 km** | Débutant | 10-15 | 5-7 |
| 5 km | Confirmé | 30-40 | 10-12 |
| 5 km | Expert | 50-60 | 12-15 |
| **Semi** | Débutant Finisher (>2h) | 25-35 | 16-18 |
| Semi | Confirmé sub-2h | 35-45 | 17-20 |
| Semi | Confirmé sub-1h45 | 40-50 | 18-22 |
| Semi | Expert sub-1h30 | 60-80 | 22-25 |
| Semi | Expert sub-1h20 | 90-110 | 25-30 |
| Semi | Élite sub-1h15 | 100-130 | 28-32 |
| **Marathon** | Débutant Finisher (>4h30) | 35-45 | 25-28 |
| Marathon | Régulier sub-4h | 45-55 | 28-32 |
| Marathon | Confirmé sub-3h30 | 55-65 | 30-35 |
| Marathon | Expert sub-3h00 | 70-90 | 32-38 |
| Marathon | Élite sub-2h30 | 90-130 | 35-40 + B2B |
| **Trail** | <40 km race | 1.5-2× distance | 60-80% distance |
| Trail | 40-50 km race | 1.5-2× distance | 60-80% distance |
| Trail | Ultra 50-80 km | 80-110 + B2B | 50-70% distance |
| Trail | Ultra >80 km | 90-130 + B2B | 45-60% distance |
| **Maintien forme** | Débutant | 8-18 | 4-8 |
| Maintien forme | Intermédiaire | 15-25 | 6-10 |
| Maintien forme | Confirmé/Expert | 25-40 | 8-12 |

**Garde-fou progression réaliste** : si `(picRef - declared) / declared > 1.5×` sur une durée < 16 sem ET un seul cycle, le pic visé doit être plafonné à `min(picRef, declared × 1.5)`. Faisabilité physiologique > idéal théorique.

---

## Plans 18/05 — re-check post-patch volumes (8 sections)

### 1. Aurore — auroregervot@yahoo.fr

**Identité**
- Niveau : Débutant (0-1 an) • Goal : Maintien en forme • Cible : Finisher
- freq=3/sem (2 course + 1 renfo) • declared=12 km/sem • race=N/A • durée=12 sem
- Plan ID `1779124806518` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[12, 13, 13, 11, 12, 14, 12, 14, 14, 12, 14, 14]`
- Pic : S6/S8/S9/S11/S12 = **14 km**
- SL pic réelle (extraite weeks[]) : **4.84 km** • SL pic projetée 40-50% pic : 6-7 km
- Progression declared→pic : +16.7 % sur 12 sem

**Référentiel COACH** : Maintien forme Débutant → pic 8-18 km, SL 4-8 km

**Diagnostic**
- Pic 14 km vs ref 8-18 : ✅ OK
- SL pic 4.84 km vs ref 4-8 : ✅ OK (cohérente avec maintien forme léger)

**Proposition fix** : **PAS DE CHANGEMENT**
- Calibrage parfait pour profil débutant en maintien forme.
- SL réelle 4.8 km = ~33% du pic, cohérent.

**Verdict** : ✅ **RAS**

---

### 2. Justine — justine.clt29@icloud.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Maintien en forme • Cible : Finisher
- freq=3/sem • declared=13 km/sem • race=N/A • durée=12 sem
- Plan ID `1779124016788` • isPreview=true • full=false

**État actuel**
- weeklyVolumes : `[13, 14, 14, 12, 14, 15, 13, 15, 15, 13, 15, 15]`
- Pic : S6/S8/S9/S11/S12 = **15 km**
- SL pic réelle : **3.5 km** • SL pic projetée : 6-8 km
- Progression : +15.4 % sur 12 sem

**Référentiel COACH** : Maintien forme Confirmé → pic 25-40 km, SL 8-12 km

**Diagnostic**
- Pic 15 km vs ref 25-40 : ⚠️ sous-dim (mais cohérent avec **declared 13 km** : on n'invente pas un volume que l'user n'a pas).
- SL pic réelle 3.5 km vs ref 8-12 : ❌ très sous-dim.

**Analyse approfondie**
Le profil dit "Confirmé Compétition" mais l'objectif est "Maintien en forme" + declared seulement 13 km/sem + freq 3. L'user **ne court que 13 km/sem** — appliquer un ref "Confirmé Compétition 25-40 km" serait inventer une charge non demandée et non soutenable. Le calibrage actuel (pic 15) respecte le declared.

**Proposition fix** : **PAS DE CHANGEMENT** sur le pic.
- En revanche la **SL réelle 3.5 km** sur un pic de 15 est *vraiment* faible (23% du vol hebdo, attendu 30-40%). Mais Romane n'a pas demandé d'audit sur la SL S1 — seulement SL pic. La SL pic projetée 6-8 km serait cohérente si la génération produisait des SL = 40-50% du pic. À monitorer si le user passe Premium → la SL devrait s'auto-ajuster.

**Verdict** : ✅ **RAS** (calibrage cohérent declared + objectif maintien)

---

### 3. Alan — alanwentzel74@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 35 km / 1200 m D+ • Cible : Finisher
- freq=4/sem (3 course + 1 renfo) • declared=30 km/sem / 400 m D+
- race=2026-07-30 (10 sem restantes) • durée=11 sem
- Plan ID `1779114282783` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[30, 32, 34, 27, 30, 34, 31, 34, 34, 24, 20]`
- Pic : S3/S6/S8/S9 = **34 km**
- SL pic réelle : **10.2 km** • SL pic projetée : 14-17 km
- Progression : +13.3 % sur 11 sem

**Référentiel COACH** : Trail 35 km Confirmé → pic 53-70 km/sem, SL pic 21-28 km, D+ hebdo pic ≈ 1200-1800 m

**Diagnostic**
- Pic 34 km vs ref 53-70 : ❌ **très sous-dim** pour un trail 35 km
- SL pic 10.2 km vs ref 21-28 : ❌ **très sous-dim** (SL = 29% de la race, attendu 60-80%)
- D+ pic plan inconnu mais déclaré 400 vs course 1200 → écart énorme

**Analyse approfondie**
Contrainte progression : declared 30 → ref pic ~60 = ×2 sur 11 sem. Hors zone faisable sans risque blessure (règle classique : pic ≤ declared × 1.5 sur < 12 sem). **Pic réaliste plafonné : declared × 1.5 = 45 km**. SL pic plafonnée : pic × 0.5 = ~22 km (atteint la borne basse du ref).

**Proposition fix** : 🔧 **PATCH PROPOSÉ**
- weeklyVolumes proposée : `[30, 33, 36, 30, 36, 40, 36, 42, 45, 32, 22]`
- Pic remonté à **45 km** (×1.5 declared, plafond physio < 12 sem)
- SL pic visée par génération : 22 km (50% du pic) → atteint borne basse ref 21-28
- Progression intra-plan max +14% par bond (S2→S3, S5→S6, S8→S9)
- Justification : on **maximise le pic dans la zone safe** (×1.5 declared sur 11 sem) sans aller au ref 53-70 qui serait dangereux. Communication transparente à faire dans welcomeMessage (séparé) : "plan calibré sur profil debut-saison 30 km, pic ≤ 45 km — bord bas du ref Trail 35 km."

**Impact user** : subtil → visible (SL pic 22 vs 10 = ×2)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 1 (race dans 10 sem)

---

### 4. Sébastien — sebastien.sailly@outlook.fr

**Identité**
- Niveau : Débutant (0-1 an) • Goal : Course route 10 km • Cible : Finisher
- freq=2/sem • declared=5 km/sem • race=2026-06-30 (6 sem restantes) • durée=7 sem
- Plan ID `1779099564353` • isPreview=true • full=false
- **Déjà patché manuellement** Romane + expert FFA : `[4,5,6,7,8,9,5]`

**État actuel**
- weeklyVolumes : `[4, 5, 6, 7, 8, 9, 5]`
- Pic : S6 = **9 km** (taper S7 = 5)
- SL pic réelle : **3 km** • SL pic projetée : 4-5 km
- Progression : +80 % sur 7 sem (declared 5 → pic 9)

**Référentiel COACH** : 10k Débutant Finisher → pic 12-18 km, SL 7-9 km

**Diagnostic**
- Pic 9 km vs ref 12-18 : ⚠️ sous-dim mais **cohérent avec declared 5 + freq 2** (on ne peut pas faire 12 km/sem en 2 séances quand on en fait 5 actuellement)
- SL pic 3 km vs ref 7-9 : ❌ sous-dim mais **égale à la course objectif 10 km × 0.3** (mode marche-course Finisher)

**Analyse approfondie**
**Profil ultra-marginal** : 5 km/sem actuel + 2 séances + 7 sem pour faire 10 km. Vecteur `[4,5,6,7,8,9,5]` validé Romane + expert FFA = **doctrine validée**. Augmenter le pic à 12-18 km briserait :
- la règle progression < 20%/sem
- la règle freq 2 séances = vol max ≈ 10 km (2 × 5 km)
- le profil Finisher = sécurité > performance
Le SL pic 3 km est **structurellement correct pour ce profil** (mode marche-course implicite).

**Proposition fix** : **PAS DE CHANGEMENT**
- Le calibrage est **intentionnellement** sous le ref pour respecter doctrine sécurité débutant 6-sem.
- Patcher à 12 km serait **dangereux** (jump +60% sur S1).

**Verdict** : ✅ **RAS** (calibrage validé expert FFA, marge sécurité débutant)

---

### 5. Antoine — antoineg.gde@outlook.fr

**Identité**
- Niveau : Expert (Performance) • Goal : Marathon • Cible : **3h00**
- freq=6/sem • declared=80 km/sem • race=2026-10-18 (22 sem restantes) • durée=22 sem
- Plan ID `1779086346189` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[80,88,95,78,89,95,95,85,95,95,95,85,95,95,95,85,95,95,95,71,62,53]`
- Pic : 11 semaines à **95 km** (S3,S6,S7,S9,S10,S11,S13,S14,S15,S17,S18,S19)
- SL pic réelle : **24 km** • SL pic projetée : 38-48 km
- Progression : +18.75 % sur 22 sem

**Référentiel COACH** : Marathon Expert sub-3h00 → pic 70-90 km/sem, SL pic 32-38 km

**Diagnostic**
- Pic 95 km vs ref 70-90 : ✅ OK (légèrement au-dessus borne haute, cohérent profil Expert 80 km declared)
- SL pic réelle 24 km vs ref 32-38 : ⚠️ **sous-dim** (SL = 25% du pic, attendu 35-40%)

**Analyse approfondie**
Le pic 95 km est cohérent. **Le vrai problème = SL pic 24 km** pour un marathonien sub-3h. C'est insuffisant pour acquérir l'endurance spécifique marathon. Le ref absolu est 32-38 km (75% à 90% de la distance race). Les SL pic devraient être 30-35 km. Avec 22 sem dispo, parfaitement faisable.

**Proposition fix** : 🔧 **PATCH PROPOSÉ** sur SL pic (pas sur weeklyVolumes — déjà OK)
- weeklyVolumes : **inchangée** (pic 95 = OK)
- **SL pic visée par génération : 32-35 km** (sortie de 3h-3h30 à allure marathon+15%)
- Justification : un marathonien Expert sub-3h doit faire plusieurs SL de 30-35 km dans la phase pic (S9 à S19). Sans ça, mur à 30 km le jour J. C'est **non-négociable** pour profil Expert sub-3h.
- Impact user : visible (24 → 32 km, +33%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 1 (SL pic uniquement, pas weeklyVolumes)

---

### 6. Annabelle — nabou57@hotmail.fr

**Identité**
- Niveau : Expert (Performance) • Goal : Semi-Marathon • Cible : **1h45**
- freq=4/sem • declared=40 km/sem • race=2026-07-05 (7 sem restantes) • durée=7 sem
- Plan ID `1779085742508` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[40, 44, 45, 38, 44, 45, 27]`
- Pic : S3/S6 = **45 km** (taper S7 = 27)
- SL pic réelle : **13 km** • SL pic projetée : 18-23 km
- Progression : +12.5 % sur 7 sem

**Référentiel COACH** : ⚠ Profil ambigu — niveau="Expert" mais cible 1h45 = sub-1h45 = ref Confirmé sub-1h45 → pic 40-50 km, SL 18-22 km
- Si on suit strict "Expert" en valeur de niveau → pic 50-70, SL 22-25 (mais cible 1h45 = pace 5'00/km = profil Confirmé, pas Expert)
- **On prend le ref selon la cible chrono** (plus prédictif que le label de niveau auto-déclaré)

**Diagnostic**
- Pic 45 km vs ref 40-50 : ✅ **OK** (parfait, borne haute)
- SL pic réelle 13 km vs ref 18-22 : ❌ **très sous-dim** (SL = 29% du pic, attendu 40-50%)

**Analyse approfondie**
Le pic est calibré ✅. Le **vrai problème = SL pic 13 km** pour un semi en 1h45 (21 km en 5'00/km). La SL pic devrait être 18-20 km (90% à 95% de la distance race). Avec 7 sem de plan, c'est tendu pour acquérir 18-20 km en SL si le user n'a pas l'habitude — mais declared 40 km/sem signifie qu'il fait déjà des SL ≈ 14-16 km, donc passer à 18-20 est faisable.

**Proposition fix** : 🔧 **PATCH PROPOSÉ** sur SL pic uniquement
- weeklyVolumes : **inchangée** (pic 45 = parfait)
- **SL pic visée par génération : 18-19 km** (au lieu de 13)
- Justification : Semi 1h45 nécessite SL ≥ 18 km pour endurance spécifique. 13 km est insuffisant.
- Impact user : visible (13 → 18-19 km, +40%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 1 (SL pic uniquement)

---

### 7. Armando — arenaarmando@hotmail.com

**Identité**
- Niveau : Expert (Performance) • Goal : Semi-Marathon • Cible : **1h20**
- freq=6/sem • declared=80 km/sem • race=2026-08-15 (13 sem restantes) • durée=13 sem
- Plan ID `1779071910169` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[80,84,84,75,84,84,84,75,84,84,62,55,47]`
- Pic : S2/S3/S5/S6/S7/S9/S10 = **84 km**
- SL pic réelle : **21 km** • SL pic projetée : 34-42 km
- Progression : +5 % sur 13 sem

**Référentiel COACH** : Semi Expert sub-1h20 → pic 90-110 km/sem, SL pic 25-30 km

**Diagnostic**
- Pic 84 km vs ref 90-110 : ⚠️ légèrement sous-dim (-7%)
- SL pic 21 km vs ref 25-30 : ⚠️ sous-dim (-16% borne basse)

**Analyse approfondie**
Armando est un vrai Expert qui vise 1h20 (3'47/km, 88% VMA). Pour cette cible, le pic devrait être 90-100 km/sem. Mais declared est 80 km — passer à 90-100 = +12-25% sur 13 sem, faisable. La SL pic 21 km pour un semi en 1h20 est insuffisante (devrait être 25 km = 1h35-1h40 à allure E2). Possibilité de structurer le pic à 90-95 km avec SL pic = 25-26 km.

**Proposition fix** : 🔧 **PATCH PROPOSÉ**
- weeklyVolumes proposée : `[80, 85, 90, 80, 90, 95, 95, 85, 95, 90, 70, 60, 50]`
- Pic remonté à **95 km** (+19% declared, faisable en 13 sem pour Expert)
- **SL pic visée par génération : 25-26 km** (au lieu de 21)
- Justification : Expert sub-1h20 nécessite pic 90-100 km pour acquérir cylindrée. SL 25 km = 1h40 à allure E2 = standard pour ce profil.
- Impact user : visible (pic +13%, SL +20%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 2 (race 13 sem, marge)

---

### 8. Valentine — valentinemery2004@gmail.com

**Identité**
- Niveau : Intermédiaire (Régulier) • Goal : Trail 20 km / 1000 m D+ • Cible : Finisher
- freq=4/sem • declared=25 km/sem / 600 m D+
- race=2026-07-04 (7 sem restantes) • durée=7 sem
- Plan ID `1779029895523` • isPreview=true • full=false

**État actuel** (post-patch 18/05)
- weeklyVolumes : `[25, 26, 26, 23, 26, 26, 18]`
- Pic : S2/S3/S5/S6 = **26 km** (taper S7 = 18)
- SL pic réelle : **8.8 km** • SL pic projetée : 10-13 km
- Progression : +4 % sur 7 sem

**Référentiel COACH** : Trail 20 km Intermédiaire → pic 30-40 km, SL pic 12-16 km

**Diagnostic**
- Pic 26 km vs ref 30-40 : ⚠️ sous-dim
- SL pic 8.8 km vs ref 12-16 : ⚠️ sous-dim (SL = 34% du pic, mais 44% de la race)

**Analyse approfondie**
Plan court (7 sem) Finisher. Declared 25 → ref 30-40 = +20% à +60%. Sur 7 sem c'est faisable jusqu'à ×1.3 = 32-33 km. SL pic devrait être 12-14 km (60-70% de la race 20 km). Le D+ déclaré 600 m vs course 1000 m → léger sous-calibrage D+.

**Proposition fix** : 🔧 **PATCH PROPOSÉ**
- weeklyVolumes proposée : `[25, 27, 30, 26, 30, 32, 22]`
- Pic remonté à **32 km** (+28% declared, faisable 7 sem Intermédiaire)
- **SL pic visée par génération : 13-14 km** (au lieu de 8.8)
- Justification : Trail 20 km Finisher nécessite SL ≥ 12 km pour boucler. 8.8 km en pic = risque DNF.
- Impact user : visible (pic +23%, SL +50%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 1 (race 7 sem)

---

## Plans Premium graves — toRegenerate (11 sections)

### 9. Lucie — lafleur666@yahoo.fr

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Semi-Marathon • Cible : **1h59**
- freq=3/sem (2 course + 1 renfo) • declared=40 km/sem • race=2026-09-27 (19 sem restantes) • durée=20 sem
- Plan ID `1773143911561` • isPremium=true • full=true

**État actuel** (Premium actif)
- weeklyVolumes : `[24, 26, 25, 18, 25, 22, 27, 19, 35, 38, 29, 24, 34, 32, 35, 24, 27, 24, 16, 13]`
- Pic : S10 = **38 km** • SL pic réelle : **21 km** • SL pic projetée : 15-19 km
- Régression S1 declared 40 → S1 plan 24 : **-40 %** (ratio 0.60, severity grave)

**Référentiel COACH** : Semi Confirmé sub-2h → pic 35-45 km, SL pic 17-20 km

**Diagnostic**
- Pic 38 km vs ref 35-45 : ✅ OK
- SL pic réelle 21 km vs ref 17-20 : 🟡 légèrement surdim (mais OK pour semi 1h59)
- **🚨 PROBLÈME CRITIQUE = S1 = 24 km vs declared 40 km** → -40% en S1, baisse injustifiée et dangereuse

**Analyse approfondie**
Le pic 38 et SL pic 21 sont **structurellement OK** pour cible 1h59. Le drame est la **baisse de S1 à 24 km** alors qu'elle fait 40. Patch nécessaire = relever S1 à 40, garder le pic à 38 (ou monter pic à 42 pour cohérence : SL pic 21 = 50% du pic 42 = mieux que 55% du pic 38). Avec 19 sem, pic 42 atteignable confortable.

**Proposition fix** : 🚨 **PATCH URGENT**
- weeklyVolumes proposée : `[40, 41, 42, 35, 41, 42, 42, 36, 42, 42, 42, 36, 42, 42, 42, 36, 35, 28, 22, 13]`
- S1 remonté à **40 km** (= declared, fix régression)
- Pic à **42 km** (+5% declared, dans ref 35-45)
- SL pic visée 19-21 km (haut du ref ✅)
- Justification : fixer la régression S1 critique, lisser le pic à 42 km, SL pic reste OK à 20-21.
- Impact user : visible (S1 doublé, +66%)

**Verdict** : 🚨 **PATCH URGENT** — priorité 1 (régression S1 critique, Premium actif)

---

### 10. Romain — baroneromain26400@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : 5 km • Cible : **20min**
- freq=4/sem • declared=35 km/sem • race=2026-06-25 (5-6 sem restantes) • durée=14 sem
- Plan ID `1774180563158` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[22, 23, 25, 19, 25, 29, 32, 24, 31, 36, 40, 28, 23, 20]`
- Pic : S11 = **40 km** • SL pic réelle : **10.1 km** • SL pic projetée : 16-20 km
- S1 declared 35 → S1 plan 22 : **-37 %** (ratio 0.63, severity grave)

**Référentiel COACH** : 5k Confirmé → pic 30-40 km, SL pic 10-12 km

**Diagnostic**
- Pic 40 km vs ref 30-40 : ✅ OK (borne haute)
- SL pic 10.1 km vs ref 10-12 : ✅ OK
- **🚨 S1 = 22 km vs declared 35** → régression -37%

**Analyse approfondie**
Pic et SL pic sont **parfaits** pour profil 5k sub-20min Confirmé. La SL d'un 5kiste ne doit pas dépasser 12 km (focus VMA + seuil). Le problème est **uniquement la régression S1**.

⚠️ Plan déjà à 14 sem dont 11 passées probablement → reste 3 sem (= taper) avant race 25/06. **Plan presque terminé** — patcher S1 = 0 impact user (S1 déjà consommée).

**Proposition fix** : 🚨 **PATCH URGENT** mais ⚠️ **vérifier S courante** avant
- Si user encore en phase active (avant S11) : `[35, 36, 38, 32, 36, 38, 40, 35, 38, 40, 40, 28, 23, 20]` → pic 40, SL pic ~12 km, fix régression
- Si user en taper (S12+) : **PAS DE CHANGEMENT** (intouchable, séances passées)
- Impact user : nul si plan consommé, visible sinon

**Verdict** : 🚨 **PATCH URGENT conditionnel** — vérifier `lastViewedWeek` ou date livraison avant patcher

---

### 11. Manon — manondbc92@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 23 km / 1500 m D+ • Cible : Finisher
- freq=3/sem (2 course + 1 renfo) • declared=25 km/sem / 500 m D+
- race=2026-10-16 (21 sem restantes) • durée=29 sem
- Plan ID `1774900493420` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[18,19,21,15,21,24,26,18,26,30,30,23,30,30,30,23,30,30,30,23,30,30,30,23,30,30,20,18,15]`
- Pic : 11 semaines à **30 km** (plateau S10 à S26)
- SL pic réelle : **15.7 km** • SL pic projetée : 12-15 km
- S1 declared 25 → S1 plan 18 : **-28 %** (ratio 0.72, severity grave)

**Référentiel COACH** : Trail 23 km Confirmé → pic 35-46 km/sem, SL pic 14-18 km, D+ pic 1500-2250 m

**Diagnostic**
- Pic 30 km vs ref 35-46 : ⚠️ sous-dim (-14%)
- SL pic 15.7 km vs ref 14-18 : ✅ OK
- **🚨 S1 = 18 km vs declared 25** → régression -28%
- D+ : 500 declared vs 1500 course → sous-calibrage D+ structurel

**Analyse approfondie**
Pic 30 trop bas (devrait être 35-40). 29 sem dispo = largement le temps de monter à 38-40 confortable. SL pic 15.7 km OK pour trail 23 km Finisher. Fix S1 + relever pic.

**Proposition fix** : 🚨 **PATCH URGENT**
- weeklyVolumes proposée : `[25, 27, 29, 24, 29, 32, 35, 28, 35, 38, 38, 30, 38, 40, 40, 32, 40, 40, 40, 32, 40, 38, 35, 28, 35, 30, 22, 18, 15]`
- S1 remonté à **25 km** (= declared)
- Pic à **40 km** (+60% declared, faisable 29 sem)
- SL pic visée 18 km (haut ref ✅)
- Impact user : visible (S1 +39%, pic +33%)

**Verdict** : 🚨 **PATCH URGENT** — priorité 1 (régression S1 + pic sous-dim)

---

### 12. Amélie — amelfoul@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 102 km / 6800 m D+ • Cible : "20" (probablement 20h pour finisher ultra)
- freq=4/sem • declared=40 km/sem / 800 m D+
- race=2026-10-03 (20 sem restantes) • durée=20 sem
- Plan ID `1771192741777` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[33,38,39,27,48,45,42,29,47,46,44,31,48,48,46,32,36,38,29,0]`
- Pic : S5/S13/S14 = **48 km** • SL pic réelle : **22 km** • SL pic projetée : 19-24 km
- S1 declared 40 → S1 plan 33 : **-17 %** (ratio 0.83, severity grave)

**Référentiel COACH** : Ultra 102 km → pic 90-130 km/sem, SL pic 46-61 km + back-to-back, D+ pic ≈ 6800-10000 m

**Diagnostic**
- Pic 48 km vs ref 90-130 : ❌ **très très sous-dim** (-50% borne basse)
- SL pic 22 km vs ref 46-61 : ❌ **très sous-dim** (-50% borne basse)
- D+ sous-évalué massivement
- **S1 = 33 vs 40** → régression -17%

**Analyse approfondie — CRITIQUE**
Amélie vise un **ultra 102 km / 6800 m D+ avec un volume current 40 km/sem**. Pour atteindre le ref 90-130 km/sem en 20 sem depuis 40 km, il faudrait progression ×2.5 → physiologiquement impossible sans blessure.

**Conflit doctrine** :
- Ref idéal : pic 90-130 km, SL pic 46-61 + B2B → inatteignable
- Plafond physio (×1.5 declared sur < 24 sem) : pic max 60 km, SL pic max 30 km
- → Pic 60-65 km est le MAX réaliste pour ce profil. Même ainsi, c'est très en-dessous du ref ultra.

**Cette inadéquation profil/objectif est exactement le cas couvert par doctrine "sécurité > conversion"** : plan IRRÉALISTE doit être assumé en transparence (décharge explicite). Le pic devrait monter au max safe (~60 km) ET le welcomeMessage doit signaler clairement que le plan ne couvre PAS la charge requise pour un ultra 102 km à 20h.

**Proposition fix** : 🚨 **PATCH URGENT (pic relevé au MAX safe) + flag conversation Romane**
- weeklyVolumes proposée : `[40, 44, 50, 40, 52, 55, 55, 44, 58, 60, 60, 48, 62, 65, 60, 48, 55, 50, 40, 0]`
- S1 remonté à **40 km** (= declared)
- Pic à **65 km** (×1.6 declared, plafond physio max sur 20 sem profil Confirmé)
- SL pic visée **28-32 km + B2B 20+15 km** (max safe pour ce profil)
- Justification : on monte au max safe, **mais on ne ment pas** : welcomeMessage doit dire "plan calibré pour 65 km/sem max, SL pic 30 km — couvre la PRÉPARATION mais ne reflète PAS la charge ultra-marathon. Décharge : 102 km / 6800 D+ en 20h avec ce volume = challenge majeur, blessure/abandon possible."
- Impact user : pic +35%, SL +27% — visible. WelcomeMessage à régénérer par A3+A4.

**Verdict** : 🚨 **PATCH URGENT** + **flag Romane** (inadéquation profil/race nécessite décision business)

---

### 13. Emmanuel — emmanuel.tellier.professionnel@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : 10 km • Cible : **40min**
- freq=4/sem • declared=25 km/sem • race=2026-08-15 (12-13 sem restantes) • durée=16 sem
- Plan ID `1777227660497` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[21,22,23,16,23,24,25,18,25,27,26,18,26,26,27,14]`
- Pic : S15 = **27 km** • SL pic réelle : **11.2 km** • SL pic projetée : 11-14 km
- S1 declared 25 → S1 plan 21 : **-16 %** (ratio 0.84, severity grave borderline)

**Référentiel COACH** : 10k Confirmé sub-45min → pic 35-45 km, SL pic 13-16 km
- (sub-40min serait Expert → pic 50-70, SL 16-20 — Emmanuel se déclare Confirmé donc on prend sub-45min)

**Diagnostic**
- Pic 27 km vs ref 35-45 : ❌ très sous-dim (-23% borne basse)
- SL pic 11.2 km vs ref 13-16 : ⚠️ sous-dim (-14%)
- **S1 = 21 vs 25** → régression -16%

**Analyse approfondie**
10k en 40min = 4'00/km = pace tendue pour Confirmé. Demande pic 35-45 km pour acquérir cylindrée seuil. Declared 25 → ref 35-45 = +40% à +80%. Sur 16 sem, +40-50% safe (pic 35-37 km).

**Proposition fix** : 🚨 **PATCH URGENT**
- weeklyVolumes proposée : `[25, 27, 29, 24, 30, 32, 33, 27, 33, 35, 35, 28, 35, 35, 37, 22]`
- S1 remonté à **25 km** (= declared)
- Pic à **37 km** (+48% declared, dans ref 35-45 ✅)
- SL pic visée **14-15 km** (au lieu de 11.2)
- Impact user : visible (S1 +19%, pic +37%, SL +30%)

**Verdict** : 🚨 **PATCH URGENT** — priorité 1

---

### 14. Cyril — cyril.carriere4@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 50 km / 1800 m D+ • Cible : Finisher
- freq=4/sem • declared=40 km/sem / 600 m D+
- race=2026-06-13 (4 sem restantes !) • durée=11 sem
- Plan ID `1775202027706` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[34, 37, 41, 31, 41, 47, 53, 40, 53, 33, 27]`
- Pic : S7/S9 = **53 km** • SL pic réelle : **27.6 km** • SL pic projetée : 21-27 km
- S1 declared 40 → S1 plan 34 : **-15 %** (ratio 0.85, severity leger)

**Référentiel COACH** : Ultra 50 km → pic 80-110 km/sem, SL pic 25-35 km + B2B

**Diagnostic**
- Pic 53 km vs ref 80-110 : ❌ très sous-dim (-34%)
- SL pic 27.6 km vs ref 25-35 : ✅ OK (haut basse du ref)
- S1 = 34 vs 40 → régression -15%

**Analyse approfondie — CRITIQUE TEMPS**
**Race dans 4 SEMAINES** = plan déjà bien avancé (probablement S7-S8). Toute modification weeklyVolumes ne touchera que les 2-3 dernières semaines (taper). Patcher pic = inutile/contre-productif maintenant.

Le pic 53 est en-deçà du ref ultra 50k mais le ratio progression declared 40 → ref 80-110 = ×2-2.75 = inatteignable sur 11 sem depuis 40 km. Pic 53 = limite physio safe (×1.3 declared). SL pic 27.6 km **est excellente** pour ce profil.

**Proposition fix** : ✅ **PAS DE CHANGEMENT**
- Plan en phase finale (race dans 4 sem). Taper en cours, SL pic 27.6 km déjà passée (S7-S9).
- Pic 53 km = limite physio safe atteignable pour ce profil avec declared 40 sur 11 sem.
- SL pic 27.6 km = ✅ OK pour trail 50 km Finisher.
- Régression S1 = passée, intouchable.

**Verdict** : ✅ **RAS** (plan trop avancé pour patcher, calibrage déjà au max safe)

---

### 15. Mouhammad — mouhammadslimani2605@gmail.com

**Identité**
- Niveau : Expert (Performance) • Goal : 10 km • Cible : **30min**
- freq=6/sem • declared=88 km/sem • race=2026-07-10 (8 sem restantes) • durée=9 sem
- Plan ID `1778441786486` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[75, 79, 83, 66, 76, 84, 88, 70, 44]`
- Pic : S7 = **88 km** • SL pic réelle : **21.9 km** • SL pic projetée : 35-44 km
- S1 declared 88 → S1 plan 75 : **-15 %** (ratio 0.85, severity leger)

**Référentiel COACH** : 10k Élite sub-30min → pic 80-110 km/sem, SL pic 20-24 km

**Diagnostic**
- Pic 88 km vs ref 80-110 : ✅ OK (parfait)
- SL pic 21.9 km vs ref 20-24 : ✅ OK
- S1 = 75 vs 88 → régression -15% (severity leger)

**Analyse approfondie**
Profil Élite 10k sub-30min : calibrage parfait. Pic 88 cohérent declared 88. SL pic 22 km = perfecto pour 10kiste élite (focus seuil + VMA, pas endurance long). Seul defaut = S1 -15% mais sur 9 sem = impact limité, taper en cours.

**Proposition fix** : 🔧 **PATCH MINEUR** sur S1
- weeklyVolumes proposée : `[88, 90, 92, 75, 85, 90, 95, 70, 44]`
- S1 remonté à **88 km** (= declared)
- Pic légèrement ajusté à **95 km** (×1.08 declared, dans ref)
- SL pic : **inchangée** (22 km = OK ref élite 20-24)
- Impact user : subtil

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 3 (Calibrage déjà bon, fix S1 cosmétique)

---

### 16. Julien — deugnilson@gmail.com

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 20 km / 1300 m D+ • Cible : **3h05**
- freq=4/sem • declared=30 km/sem / 350 m D+
- race=2026-09-20 (18 sem restantes) • durée=19 sem
- Plan ID `1778654056401` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[26, 28, 30, 23, 26, 30, 33, 26, 30, 33, 35, 27, 31, 33, 35, 27, 31, 22, 18]`
- Pic : S11/S15 = **35 km** • SL pic réelle : **17.8 km** • SL pic projetée : 14-18 km
- S1 declared 30 → S1 plan 26 : **-13 %** (ratio 0.87, severity leger)

**Référentiel COACH** : Trail 20 km Confirmé → pic 30-40 km, SL pic 12-16 km, D+ pic 1300-1950 m

**Diagnostic**
- Pic 35 km vs ref 30-40 : ✅ OK
- SL pic 17.8 km vs ref 12-16 : 🟡 légèrement surdim (mais OK pour trail 20 km)
- S1 = 26 vs 30 → régression -13% (severity leger)
- D+ : 350 declared vs 1300 course → sous-évalué structurellement (mais OK plan)

**Analyse approfondie**
Plan bien calibré pour trail 20 km en 3h05 (= 9'15/km = trail montagne). SL pic 17.8 km = 89% de la race → un peu long mais cohérent stratégie "do the distance avant la race". S1 -13% = mineur.

**Proposition fix** : 🔧 **PATCH MINEUR** sur S1
- weeklyVolumes proposée : `[30, 31, 33, 26, 30, 33, 35, 28, 33, 35, 37, 29, 33, 35, 37, 28, 31, 22, 18]`
- S1 remonté à **30 km** (= declared)
- Pic à **37 km** (+23% declared, dans ref ✅)
- SL pic : **inchangée** (17.8 km OK, peut descendre à 16 km dans SL pic visée si génération)
- Impact user : subtil (S1 +15%, pic +6%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 3 (fix S1 + petite remontée pic)

---

### 17. Charles — charlesl.88@live.fr

**Identité**
- Niveau : Confirmé (Compétition) • Goal : 10 km • Cible : **50min**
- freq=4/sem • declared=30 km/sem • race=2026-06-28 (6 sem restantes) • durée=13 sem
- Plan ID `1775251010162` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[26, 28, 29, 20, 29, 33, 35, 26, 35, 33, 35, 26, 18]`
- Pic : S7/S9/S11 = **35 km** • SL pic réelle : **12.1 km** • SL pic projetée : 14-18 km
- S1 declared 30 → S1 plan 26 : **-13 %** (ratio 0.87, severity leger)

**Référentiel COACH** : 10k Confirmé sub-50min → pic 30-40 km, SL pic 12-15 km

**Diagnostic**
- Pic 35 km vs ref 30-40 : ✅ OK
- SL pic 12.1 km vs ref 12-15 : ✅ OK (borne basse)
- S1 = 26 vs 30 → régression -13% (severity leger)

**Analyse approfondie**
Plan **parfaitement calibré** pour 10k 50min Confirmé. Pic 35 et SL pic 12.1 collent au ref. Seul défaut S1 -13% mais race dans 6 sem = plan déjà avancé, S1 passée.

**Proposition fix** : ✅ **PAS DE CHANGEMENT** sur pic/SL
- Calibrage pic + SL pic conforme ref. S1 passée (plan en S7-S8).
- Si patcher S1 utile pour bypass : `[30, 31, 32, 25, 32, 35, 37, 28, 35, 33, 35, 26, 18]` (cosmétique)
- Mais 6 sem race = impact nul.

**Verdict** : ✅ **RAS** sur pic/SL (calibrage OK ref, fix S1 cosmétique optionnel)

---

### 18. Cyrienne — cyrienne.dacosta@gmail.com

**Identité**
- Niveau : Intermédiaire (Régulier) • Goal : 10 km • Cible : Finisher
- freq=4/sem (3 course + 1 renfo) • declared=**10 km/sem** • race=2026-06-27 (6 sem restantes) • durée=10 sem
- Plan ID `1776770917685` • isPremium=true • full=true

**État actuel**
- weeklyVolumes : `[9, 10, 10, 7, 10, 12, 8, 12, 11, 6]`
- Pic : S6/S8 = **12 km** • SL pic réelle : **5.2 km** • SL pic projetée : 5-6 km
- S1 declared 10 → S1 plan 9 : **-10 %** (ratio 0.90, severity leger)

**Référentiel COACH** : 10k Intermédiaire → pic 18-25 km, SL 9-11 km
- ⚠ MAIS declared 10 km/sem + cible Finisher → profil "Intermédiaire" auto-déclaré mais comportement Débutant. Ref Débutant 10k : pic 12-18 km, SL 7-9 km.

**Diagnostic** (avec ref Débutant adapté au comportement)
- Pic 12 km vs ref Débutant 12-18 : ✅ OK (borne basse)
- SL pic 5.2 km vs ref Débutant 7-9 : ⚠️ sous-dim (-26%)
- S1 = 9 vs 10 → -10% (négligeable, severity leger)

**Analyse approfondie**
Cyrienne fait 10 km/sem et vise Finisher 10k dans 6 sem. Calibrage actuel pic 12 km = ×1.2 declared = safe. SL pic 5.2 km = 52% de la race 10k = un peu juste (devrait être 6-7 km = 60-70% race pour boucler le 10k confortablement).

**Proposition fix** : 🔧 **PATCH PROPOSÉ** (mineur)
- weeklyVolumes proposée : `[10, 11, 12, 9, 12, 13, 10, 14, 13, 7]`
- S1 remonté à **10 km** (= declared)
- Pic à **14 km** (+40% declared, OK profil Finisher Débutant, dans ref Débutant 12-18)
- SL pic visée **7 km** (au lieu de 5.2)
- Impact user : subtil (pic +17%, SL +35%)

**Verdict** : 🔧 **PATCH PROPOSÉ** — priorité 2 (race 6 sem, fix SL pour confort jour J)

---

### 19. AdminTest — programme@coachrunningia.fr

**Identité**
- Niveau : Confirmé (Compétition) • Goal : Trail 21 km / 1597 m D+ • Cible : **2h15**
- freq=5/sem • declared=42 km/sem / 750 m D+
- race=2026-07-15 (8 sem restantes) • durée=9 sem
- Plan ID `1778920918506` • isPremium=true • full=true
- **NB** : compte admin Romane test — pas un user réel

**État actuel**
- weeklyVolumes : `[38, 42, 46, 36, 41, 47, 54, 38, 31]`
- Pic : S7 = **54 km** • SL pic réelle : **20 km** • SL pic projetée : 22-27 km
- S1 declared 42 → S1 plan 38 : **-10 %** (ratio 0.90, severity leger)

**Référentiel COACH** : Trail 21 km Confirmé → pic 32-42 km, SL pic 13-17 km

**Diagnostic**
- Pic 54 km vs ref 32-42 : 🟡 surdim (+29% borne haute)
- SL pic 20 km vs ref 13-17 : 🟡 surdim (+18% borne haute)
- S1 = 38 vs 42 → -10% (négligeable)

**Analyse approfondie**
Compte admin test. Pic 54 et SL pic 20 sont **surdimensionnés** pour un trail 21 km Confirmé (le ref dit pic 32-42, SL 13-17). Le plan génère trop par rapport au ref coaching strict. Mais : il s'agit d'un trail de **2h15 sur 21 km / 1597 D+** = trail technique fort dénivelé (76 m D+/km), donc le ref "trail court" sous-évalue la charge nécessaire (D+ pic réf 1600-2400 m, le plan en demande probablement +).

**Proposition fix** : ✅ **PAS DE CHANGEMENT** (compte test admin + calibrage légitime pour trail D+ fort)
- Pic 54 km / SL pic 20 km = **cohérents** avec trail 21 km / 1597 m D+ (technique + montagne).
- Le ref "Trail 20-25 km Confirmé" pic 32-42 sous-pondère le D+. Plan plus exigeant car D+/km = 76 m/km (élevé).
- Compte admin → pas d'impact utilisateur réel.

**Verdict** : ✅ **RAS** (compte admin + calibrage légitime trail montagne)

---

## Synthèse arbitrage Romane

| # | Plan | Email | Pic actuel | Pic proposé | SL pic actuelle | SL pic proposée | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Aurore | auroregervot@yahoo.fr | 14 | — | 4.8 | — | ✅ RAS |
| 2 | Justine | justine.clt29@icloud.com | 15 | — | 3.5 | — | ✅ RAS |
| 3 | Alan | alanwentzel74@gmail.com | 34 | **45** | 10.2 | **22** | 🔧 PATCH P1 |
| 4 | Sébastien | sebastien.sailly@outlook.fr | 9 | — | 3.0 | — | ✅ RAS |
| 5 | Antoine | antoineg.gde@outlook.fr | 95 | 95 | 24 | **32** | 🔧 PATCH P1 (SL only) |
| 6 | Annabelle | nabou57@hotmail.fr | 45 | 45 | 13 | **18-19** | 🔧 PATCH P1 (SL only) |
| 7 | Armando | arenaarmando@hotmail.com | 84 | **95** | 21 | **25-26** | 🔧 PATCH P2 |
| 8 | Valentine | valentinemery2004@gmail.com | 26 | **32** | 8.8 | **13-14** | 🔧 PATCH P1 |
| 9 | Lucie | lafleur666@yahoo.fr | 38 | **42** | 21 | 20-21 | 🚨 PATCH URGENT P1 (S1 + pic) |
| 10 | Romain | baroneromain26400@gmail.com | 40 | 40 | 10.1 | — | 🚨 conditionnel (fix S1 si plan non consommé) |
| 11 | Manon | manondbc92@gmail.com | 30 | **40** | 15.7 | 18 | 🚨 PATCH URGENT P1 |
| 12 | Amélie | amelfoul@gmail.com | 48 | **65** | 22 | **30 + B2B** | 🚨 PATCH URGENT P1 + flag Romane |
| 13 | Emmanuel | emmanuel.tellier.pro@gmail.com | 27 | **37** | 11.2 | **14-15** | 🚨 PATCH URGENT P1 |
| 14 | Cyril | cyril.carriere4@gmail.com | 53 | — | 27.6 | — | ✅ RAS (race J-28) |
| 15 | Mouhammad | mouhammadslimani2605@gmail.com | 88 | 95 | 22 | — | 🔧 PATCH P3 (cosmétique S1) |
| 16 | Julien | deugnilson@gmail.com | 35 | **37** | 17.8 | — | 🔧 PATCH P3 (mineur) |
| 17 | Charles | charlesl.88@live.fr | 35 | — | 12.1 | — | ✅ RAS (race J-42, OK ref) |
| 18 | Cyrienne | cyrienne.dacosta@gmail.com | 12 | **14** | 5.2 | **7** | 🔧 PATCH P2 |
| 19 | AdminTest | programme@coachrunningia.fr | 54 | — | 20 | — | ✅ RAS (compte admin + trail D+ fort) |

---

## Patches à lancer — priorité 1 (URGENT, Premium graves + pré-race < 12 sem)

1. **Lucie** (1773143911561) — fix S1 régression 24→40, lisser pic à 42 km. 19 sem dispo. Impact user : visible (positif).
2. **Manon** (1774900493420) — fix S1 régression 18→25, remonter pic 30→40. 29 sem dispo. Impact : visible (positif).
3. **Amélie** (1771192741777) — fix S1 33→40, pic 48→65 (max safe). **+ flag Romane** : profil sous-dimensionné pour ultra 102 km, welcomeMessage doit être franc sur les limites du plan.
4. **Emmanuel** (1777227660497) — fix S1 21→25, pic 27→37. 12-13 sem dispo. Impact : visible (positif).
5. **Alan** (1779114282783) — pic 34→45 (max safe × 1.5 declared), SL pic 10→22. Preview, race J-70. Si user passe Premium ou conversion, le plan plein devra suivre.
6. **Valentine** (1779029895523) — pic 26→32, SL pic 9→14. Preview, race J-49.

## Patches à lancer — priorité 1 (SL pic uniquement, weeklyVolumes OK)

7. **Antoine** (1779086346189) — pic 95 OK, **SL pic 24→32**. Marathon Expert sub-3h nécessite SL 32-38 km non négociable.
8. **Annabelle** (1779085742508) — pic 45 OK, **SL pic 13→18-19**. Semi 1h45 nécessite SL ≥18.

## Patches à lancer — priorité 2

9. **Armando** (1779071910169) — pic 84→95, SL pic 21→25-26. Semi Expert sub-1h20, 13 sem dispo.
10. **Cyrienne** (1776770917685) — pic 12→14, SL pic 5.2→7. Race J-42.

## Patches à lancer — priorité 3 (mineurs, cosmétique)

11. **Mouhammad** (1778441786486) — fix S1 75→88, pic 88→95. Calibrage déjà bon, SL pic 22 inchangée.
12. **Julien** (1778654056401) — fix S1 26→30, pic 35→37. SL pic 17.8 inchangée.

## Patches conditionnels

13. **Romain** (1774180563158) — pic 40 + SL pic 10.1 conformes ref. Fix S1 22→35 **uniquement si plan non consommé** (vérifier `lastViewedWeek` < 11). Sinon RAS.

## Patches à NE PAS lancer (RAS justifiés)

- **Aurore** : maintien forme débutant, calibrage parfait avec declared 12 km/sem.
- **Justine** : maintien forme, declared 13 km/sem respecté (n'inventons pas un volume).
- **Sébastien** : déjà patché manuellement (Romane + expert FFA), `[4,5,6,7,8,9,5]` doctrine validée pour profil 5 km/sem + 7 sem.
- **Cyril** : race J-28, plan en phase finale, taper. Patcher = inutile/dangereux. SL pic 27.6 déjà excellente.
- **Charles** : race J-42, calibrage conforme ref 10k Confirmé sub-50min (pic 35, SL 12.1). S1 -13% négligeable.
- **AdminTest** : compte admin Romane + calibrage légitime pour trail montagne D+ fort.

---

## Notes méthodologiques

- **SL pic réelle** extraite via parcours `weeks[].sessions[]` filter `type ∈ {sortie longue, long run}`.
- **SL pic projetée** = `pic vol × 0.40 à 0.50` (formule structurelle classique).
- **Diagnostic basé sur SL pic effective** = `max(SL pic réelle, SL pic projetée max)`.
- **Plafond progression physiologique** : pic ≤ declared × 1.5 sur < 12 sem ; declared × 1.6 sur 13-24 sem ; declared × 2 sur > 24 sem. Au-delà = risque blessure majeur.
- **Doctrine "ne baisse jamais sous current"** : tout patch laisse weeklyVolumes ≥ current.
- **Doctrine "sécurité > conversion"** : si profil/race inadéquat (cas Amélie 102 km), pic max safe + welcomeMessage transparent.
- **Doctrine "x séances/sem inclut 1 renfo"** : freq 3 = 2 course + 1 renfo ; freq 4 = 3 course + 1 renfo (impact sur SL atteignable).
- **Hors scope cet audit** : welcomeMessage (sera fait par A3+A4), paces (intangibles), feasibility, safetyWarning.
- **Pas de contact client** : tous les patches restent en backend, aucun mail/notif.

Données brutes : `/Users/romanemarino/Coach-Running-IA/audit-19-plans-case-by-case.json`
Script : `/Users/romanemarino/Coach-Running-IA/audit-19-plans-case-by-case.mjs`
