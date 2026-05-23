# Patch live Lilian V2
Date : 2026-05-20
Plan : `1779296358366` (Lilian, 10K Débutant Finisher, 20 sem)

## 3 modifs appliquées

1. **S1 séances course** (Mardi + Dimanche, type "Sortie Longue")
   - duration : `1h00` → `45 min`
   - distance : `6.6 km` → `4 km`
   - mainSet : 8/10 reps → 6 reps (1 min course / 2 min marche)
   - warmup/cooldown ajustés (5 min)
   - Jeudi (Renforcement) : non touchée

2. **weeklyVolumes** (longueur 20 préservée)
   - Avant : `[13,16,17,14,16,17,14,16,17,14,16,17,14,16,17,14,16,17,14,9]` — pic 17 stagnant
   - Après : `[13,14,15,12,16,17,14,18,19,15,19,20,16,20,21,16,21,22,14,10]` — progression 13→22, pic S18=22, affût S19=14, S20 (course)=10

3. **welcomeMessage** réécrit : cite séances "45 min, environ 4 km" + "pic d'entraînement autour de 22 km/semaine en S18" + maintien rappel médical + ampoule + cv=0

## Exec

- Backup : `/Users/romanemarino/Coach-Running-IA/backup-lilian-v2-1779312629414.json`
- Dry-run : OK
- Exec live : OK
- updateTime Firestore : `2026-05-20T21:30:30.395538Z`
- Dump post-patch : `/Users/romanemarino/Coach-Running-IA/post-patch-lilian-v2.json`
- updateMask : `weeks`, `generationContext`, `welcomeMessage`

## Vérifs post-patch

- S1 Mardi : duration=45 min, distance=4 km
- S1 Dimanche : duration=45 min, distance=4 km
- weeklyVolumes pic : 22 km, length=20
- welcomeMessage contient "45 min", "4 km", "22 km"

## Doctrine respectée

- `feedback_input_client_obligatoire` : targetTime "Finisher", vma=11, paces, cv=0 (questionnaireSnapshot) — INCHANGÉS
- `feedback_jamais_baisser_allure_cible` : targetTime intact
- `feedback_jamais_poids_minceur` : preflight FORBIDDEN passé sur tous les nouveaux textes
- `feedback_patch_live_plans_jour_seulement` : S1 = preview non vécue (isPreview=true, fullPlanGenerated=false)
- `feedback_jamais_contact_client` : silencieux, aucune notif
- Préservés : distance "10 km", durationWeeks=20, sessionsPerWeek=3, feasibility V1 (AMBITIEUX/60), confidenceScore=60, phases, recoveryWeeks
