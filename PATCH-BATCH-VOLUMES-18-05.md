# Patch live volumes 8 plans 18/05

**Date :** 2026-05-18
**Opérateur :** Claude Code (agent)
**Script :** `~/Coach-Running-IA/patch-batch-volumes-18-05.mjs`
**Backup dir :** `~/Coach-Running-IA/backup-vol-patch/`
**Log brut :** `~/Coach-Running-IA/backup-vol-patch/_batch-log-apply.json`

## Synthèse

| Statut | Nombre |
|---|---|
| Plans patchés OK | **7 / 8** |
| Plans skip (déjà OK / volontaire) | 1 / 8 |
| Erreurs | 0 |

Tous les patches ciblent **uniquement** `generationContext.periodizationPlan.weeklyVolumes` via `updateMask.fieldPaths`. Backup brut systématique avant write. Re-read confirmation systématique post-write. Vérifications sémantiques sur 5 champs racine critiques : tous **inchangés**.

## Méthodologie

Pour chaque plan :

1. **Read** Firestore (REST `projects/coach-running-ia/databases/(default)/documents/plans/<planId>`).
2. **Backup** brut → `backup-vol-patch/<email>-pre.json` (idempotent).
3. **Skip si S1 ≥ declared** (idempotence).
4. **Recalcul** : `factor = declared / S1_actuel` → `newVolumes = oldVolumes.map(v => round(v * factor))`.
5. **Force S1 exact** = declared (au cas où l'arrondi diverge).
6. **Plafond** : aucune semaine > `pic_original × 1.05` (sécurité progression).
7. **Sanity** : refuse si max progression intra-plan > 30% (hors taper/récup).
8. **PATCH** Firestore avec `updateMask.fieldPaths=generationContext.periodizationPlan.weeklyVolumes`.
9. **Re-read** + vérifications canoniques (deep-equal après tri des clés) sur :
   - `weeklyPhases`, `recoveryWeeks`, `totalWeeks` (intra periodizationPlan)
   - `feasibility`, `paces`, `welcomeMessage`, `safetyWarning`, `confidenceScore` (racine)

## Détail par client

### 1. Aurore — auroregervot@yahoo.fr

- Plan : `1779124806518` (Remise en Forme — 12 sem.)
- Declared : 12 km/sem, S1 avant : **10**, S1 après : **12** ✅
- Factor : 1.200 (12/10)
- Pic original 13 km → plafond 14 km. 2 semaines plafonnées.
- Max progression intra-plan : +16.7%
- `[10, 11, 11, 9, 10, 12, 10, 12, 13, 10, 12, 13]`
- `[12, 13, 13, 11, 12, 14, 12, 14, 14, 12, 14, 14]`

### 2. Justine — justine.clt29@icloud.com

- Plan : `1779124016788` (Remise en Forme — 12 sem.)
- Declared : 13 km/sem, S1 avant : **11**, S1 après : **13** ✅
- Factor : 1.182 (13/11)
- Pic original 14 km → plafond 15 km. 3 semaines plafonnées.
- Max progression intra-plan : +16.7%
- `[11, 12, 12, 10, 12, 14, 11, 13, 14, 11, 13, 14]`
- `[13, 14, 14, 12, 14, 15, 13, 15, 15, 13, 15, 15]`

### 3. Alan — alanwentzel74@gmail.com

- Plan : `1779114282783` (Trail 35km / 1200m D+ — 11 sem.)
- Declared : 30 km/sem, S1 avant : **26**, S1 après : **30** ✅
- Factor : 1.154 (30/26)
- Pic original 32 km → plafond 34 km. 4 semaines plafonnées.
- Max progression intra-plan : +13.3%
- `[26, 28, 30, 23, 26, 30, 27, 30, 32, 21, 17]`
- `[30, 32, 34, 27, 30, 34, 31, 34, 34, 24, 20]`

### 4. Sébastien — sebastien.sailly@outlook.fr **(SKIP FORCÉ)**

- Plan : `1779099564353` (10 km — 7 sem.)
- Declared : 5 km/sem, S1 actuel : **4** (volontaire)
- État actuel `[4, 5, 6, 7, 8, 9, 5]` correspond **exactement** au vecteur validé par Romane + expert FFA (cf. brief).
- **Aucun write** — skip respecté pour préserver la validation expert.
- Note : si on appliquait le factor 1.25, on aurait un saut intra-plan +33% (S2 6 → S3 8), au-dessus du seuil 30%. La décision experte de garder S1=4 km pour ce profil débutant à très haut BMI (40.1) est cohérente.

### 5. Antoine — antoineg.gde@outlook.fr

- Plan : `1779086346189` (Marathon 3h00 — 22 sem.)
- Declared : 80 km/sem, S1 avant : **68**, S1 après : **80** ✅
- Factor : 1.176 (80/68)
- Pic original 90 km → plafond 95 km. 12 semaines plafonnées.
- Max progression intra-plan : +14.1%
- `[68, 75, 82, 66, 76, 86, 90, 72, 83, 86, 90, 72, 83, 86, 90, 72, 83, 86, 90, 60, 53, 45]`
- `[80, 88, 95, 78, 89, 95, 95, 85, 95, 95, 95, 85, 95, 95, 95, 85, 95, 95, 95, 71, 62, 53]`

### 6. Annabelle — nabou57@hotmail.fr

- Plan : `1779085742508` (Semi 1h45 — 7 sem.)
- Declared : 40 km/sem, S1 avant : **34**, S1 après : **40** ✅
- Factor : 1.176 (40/34)
- Pic original 43 km → plafond 45 km. 2 semaines plafonnées.
- Max progression intra-plan : +15.8%
- `[34, 37, 41, 32, 37, 43, 23]`
- `[40, 44, 45, 38, 44, 45, 27]`

### 7. Armando — arenaarmando@hotmail.com

- Plan : `1779071910169` (Semi 1h20 — 13 sem.)
- Declared : 80 km/sem, S1 avant : **68**, S1 après : **80** ✅
- Factor : 1.176 (80/68)
- Pic original 80 km → plafond 84 km. 7 semaines plafonnées.
- Max progression intra-plan : +12.0%
- `[68, 75, 80, 64, 74, 76, 80, 64, 74, 76, 53, 47, 40]`
- `[80, 84, 84, 75, 84, 84, 84, 75, 84, 84, 62, 55, 47]`

### 8. Valentine — valentinemery2004@gmail.com

- Plan : `1779029895523` (Trail 20km / 1000m D+ — 7 sem.)
- Declared : 25 km/sem, S1 avant : **21**, S1 après : **25** ✅
- Factor : 1.190 (25/21)
- Pic original 25 km → plafond 26 km. 3 semaines plafonnées.
- Max progression intra-plan : +13.0%
- `[21, 23, 24, 19, 22, 25, 15]`
- `[25, 26, 26, 23, 26, 26, 18]`

## Vérifications post-patch (deep-equal canonique)

Vérification ré-exécutée après le batch avec tri canonique des clés (la 1re passe affichait des faux positifs dus à l'ordre des clés non-déterministe entre 2 reads Firestore consécutifs sur les `mapValue`).

| Client | S1 reread | feasibility | paces | welcomeMessage | safetyWarning | confidenceScore |
|---|---|---|---|---|---|---|
| Aurore    | 12 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Justine   | 13 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alan      | 30 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Antoine   | 80 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Annabelle | 40 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Armando   | 80 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valentine | 25 ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Vérifications intra-`periodizationPlan` pour les 7 plans patchés :
- `weeklyPhases` inchangées : **7/7 ✅**
- `recoveryWeeks` inchangées : **7/7 ✅**
- `totalWeeks` inchangé : **7/7 ✅**

## Doctrine respectée

- ✅ Touche **uniquement** `weeklyVolumes` (updateMask Firestore ciblé)
- ✅ Pas de contact client (`feedback_jamais_contact_client`)
- ✅ Backup systématique par client
- ✅ Re-read confirmation systématique
- ✅ Idempotent (relancer le script → tous status = `skip_already_ok`)
- ✅ Plafond de sécurité respecté (pic × 1.05 max)
- ✅ Pas de saut intra-plan > 30%
- ✅ Skip Sébastien (validé Romane + expert FFA)
- ✅ Pas de modification feasibility/paces/welcomeMessage/safetyWarning/confidenceScore

## Notes & artefacts

- Script : `~/Coach-Running-IA/patch-batch-volumes-18-05.mjs`
- Backups bruts : `~/Coach-Running-IA/backup-vol-patch/<email>-pre.json` (8 fichiers, Sébastien inclus pour traçabilité)
- Log JSON brut : `~/Coach-Running-IA/backup-vol-patch/_batch-log-apply.json`
- Log dry-run précédent : `~/Coach-Running-IA/backup-vol-patch/_batch-log-dry.json`

**Bug code racine** : non corrigé par ce patch. Le code à 85% (`L2666` résiduel après commit `26b3d3a`) produira encore le bug pour les nouveaux plans tant qu'un patch code n'est pas appliqué. Ce batch corrige uniquement les 8 plans live du 18/05.
