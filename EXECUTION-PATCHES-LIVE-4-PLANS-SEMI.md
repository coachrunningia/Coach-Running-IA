# Patches live 4 plans buggés Semi/10K
Date : 2026-05-20

## Contexte

4 plans créés le 2026-05-20 entre 15:40 et 17:00 UTC, S1 non vécue → patchables
selon doctrine `feedback_patch_live_plans_jour_seulement`.

Code prod corrigé (P0a+b+c déployés). Ce patch corrige les plans déjà créés en base.

Auth : `programme@coachrunningia.fr` (gcloud impersonation
`firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com`).

---

## Plan 1 — floggyz (10K Expert) — `1779291643754`

- **Backup** : `/Users/romanemarino/Coach-Running-IA/backup-floggyz-1779310932282.json`
- **Modifs (1)** :
  - `distance` : `"36 km"` → `"10 km"`
- **Préservés (input client doctrine)** : targetTime "Finisher", durationWeeks 30,
  sessionsPerWeek 5, vma 17.5, confidenceScore 65, feasibility (status/score/message inchangés),
  paces, weeks
- **Décision** : Plan a d'autres bizarreries (Expert sans chrono + 30 sem) — backlog.
  Seule la distance est patchée ici (cf brief contrainte #8).
- **Exec** : OK — updateTime `2026-05-20T21:02:13.410345Z`
- **Post-patch dump** : `/Users/romanemarino/Coach-Running-IA/post-patch-floggyz.json`

---

## Plan 2 — Margaux (Semi 2h20) — `1779291819180`

- **Backup** : `/Users/romanemarino/Coach-Running-IA/backup-margaux-1779310940009.json`
- **Modifs (3)** :
  - `distance` : `"16 km"` → `"21.1 km (Semi-Marathon)"`
  - `generationContext.periodizationPlan.weeklyVolumes` :
    - AVANT : `[16,17,18,14,16,17,14,16,17,14,16,17,14,16,17,14,16,11,9]` (pic 18)
    - APRES : `[17,19,21,17,20,22,18,21,24,19,22,25,20,23,25,20,22,18,12]` (pic 25, hard floor Semi 22 OK)
  - `feasibility.message` : reformulé pour cohérence (gap chrono négatif + bas volume = risque
    musculo-squelettique, pas chrono). Le message AVANT disait "objectif confortable" tout en
    flagant volume bas — incohérent. Nouveau message recentre sur la charge.
- **Préservés (input client + doctrine `feedback_jamais_baisser_allure_cible`)** :
  targetTime "2h20", vma 10.93, durationWeeks 19, sessionsPerWeek 3,
  paces.allureSpecifiqueSemi "6:38", feasibility.status "AMBITIEUX", feasibility.score 65,
  confidenceScore 65, welcomeMessage, weeks
- **Exec** : OK — updateTime `2026-05-20T21:02:21.136473Z`
- **Post-patch dump** : `/Users/romanemarino/Coach-Running-IA/post-patch-margaux.json`

---

## Plan 3 — Bertrand (Semi Finisher) — `1779292771055`

- **Backup** : `/Users/romanemarino/Coach-Running-IA/backup-bertrand-1779310964934.json`
- **Modifs (3)** :
  - `distance` : `"14 km"` → `"21.1 km (Semi-Marathon)"`
  - `generationContext.periodizationPlan.weeklyVolumes` :
    - AVANT : `[14,16,16,13,15,15,12,14,15,12,14,15,12,14,15,12,14,10,8]` (pic 16)
    - APRES : `[15,17,19,15,18,20,16,18,21,17,20,22,17,20,22,17,19,16,11]` (pic 22, hard floor Semi 22 OK)
  - `feasibility.message` : retiré "très chargée en volume" (faux à 15 km/sem) ;
    reformulé Finisher (construction volume, mention 51 ans + signaux musculo-squelettiques).
- **welcomeMessage** : INCHANGÉ. L'audit demandait de vérifier s'il dit "19 sem c'est long" —
  vérification du texte actuel : il dit "structuré sur 19 semaines pour progression ultra-douce",
  ce qui est cohérent avec une vraie distance semi. Pas de modification nécessaire.
- **Préservés** : targetTime "Finisher", vma 9.52, durationWeeks 19, sessionsPerWeek 3,
  feasibility.status "AMBITIEUX", feasibility.score 65, confidenceScore 65,
  feasibility.safetyWarning (mention 51 ans + test d'effort, déjà bonne)
- **Exec** : OK — updateTime `2026-05-20T21:02:46.139302Z`
- **Post-patch dump** : `/Users/romanemarino/Coach-Running-IA/post-patch-bertrand.json`

---

## Plan 4 — Lilian (10K Débutant) — `1779296358366`

- **Backup** : `/Users/romanemarino/Coach-Running-IA/backup-lilian-1779310986942.json`
- **Modifs (4)** :
  - `distance` : OK déjà `"10 km"` — pas touché
  - `feasibility.status` : `"RISQUÉ"` → `"AMBITIEUX"` (ampoule = frottement, pas blessure structurelle)
  - `feasibility.score` : `30` → `60`
  - `confidenceScore` (root) : `30` → `60` (cohérence)
  - `feasibility.message` : retiré "très chargée en volume" + "minimum confortable 22 semaines"
    (ampoule récurrente ≠ blessure structurelle nécessitant +2 sem). Nouveau message
    mentionne ampoule comme problème de frottement (chaussettes/chaussures), pas blessure.
  - `welcomeMessage` : remplacement chirurgical "15 km" → "13 km" (S1 réelle = 2 séances × 6.6 km).
    Reste du message inchangé.
- **Préservés** : distance "10 km", targetTime "Finisher", vma 11, durationWeeks 20,
  sessionsPerWeek 3, paces, weeks, generationContext.periodizationPlan.weeklyVolumes
  (déjà cohérents pic 17 ≥ hard floor 10K 12), feasibility.safetyWarning ("Fais valider la
  reprise avec ton kiné/médecin"), feasibility.recommendation
- **Exec** : OK — updateTime `2026-05-20T21:03:08.020234Z`
- **Post-patch dump** : `/Users/romanemarino/Coach-Running-IA/post-patch-lilian.json`

---

## Vérifications post-patch

| Plan      | distance OK | weeklyVolumes OK | feasibility cohérent | Inputs client préservés |
|-----------|-------------|------------------|----------------------|--------------------------|
| floggyz   | 10 km       | n/a (pas touché) | n/a (pas touché)     | targetTime, vma, paces, durationWeeks |
| margaux   | 21.1 km Semi | pic 25 (≥22)    | reformulé cohérent   | targetTime 2h20, pace semi 6:38, vma |
| bertrand  | 21.1 km Semi | pic 22 (≥22)    | reformulé cohérent   | targetTime Finisher, vma, paces |
| lilian    | 10 km (inch.)| inchangé (OK)   | RISQUÉ→AMBITIEUX +msg| distance, targetTime, vma, paces |

---

## Doctrine respectée

- ✅ `feedback_input_client_obligatoire` : targetTime / level / cv / paces inchangés sur les 4
- ✅ `feedback_jamais_baisser_allure_cible` : allures préservées (notamment Margaux 6:38 pour 2h20)
- ✅ `feedback_jamais_poids_minceur` : preflight FORBIDDEN words sur tous les nouveaux wordings
- ✅ `feedback_jamais_contact_client` : modif silencieuse, aucun message envoyé aux utilisateurs
- ✅ `feedback_patch_live_plans_jour_seulement` : 4 plans créés 2026-05-20, S1 non vécue
- ✅ Backup obligatoire effectué pour chaque plan avant écriture
- ✅ Dry-run effectué pour chaque plan avant exec live

## Scripts

- `/Users/romanemarino/Coach-Running-IA/patch-floggyz-distance-live.mjs`
- `/Users/romanemarino/Coach-Running-IA/patch-margaux-semi-live.mjs`
- `/Users/romanemarino/Coach-Running-IA/patch-bertrand-semi-live.mjs`
- `/Users/romanemarino/Coach-Running-IA/patch-lilian-10k-live.mjs`
