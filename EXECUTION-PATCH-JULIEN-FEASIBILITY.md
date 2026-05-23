# Patch live Julian feasibility VMA 12.3
Date : 2026-05-21

## Cible
- Email : julian.jobert@hotmail.fr
- UID : bNTAkiezfzf21NFdqapqIvx5YRw2
- planId : 1778935995789

## Modifs appliquées
- `feasibility.message` : réécrit (mention VMA 12,3 km/h + test demi-Cooper 18/05 1230 m / 6 min + estimation Riegel ~57 min + marge ~2 min via seuil/spécifique trail + rappel aponévrosite plantaire)
- `feasibility.recommendation` : "un temps cible de 1h06min" -> "Objectif réaliste 55-57 min selon progression"

## Conservé strictement
- `targetTime` = "55min" (input user, doctrine feedback_input_client_obligatoire)
- `paces.*` (efPace 7:17, allureSpecifique10k 5:25 — déjà recalculé sur VMA 12.3)
- `vma` = 12.3
- `vmaSource` = "Ajustée manuellement : 11.8 → 12.3 km/h"
- `feasibility.status` = "AMBITIEUX"
- `feasibility.safetyWarning` (kiné/médecin — déjà bon)
- `feasibility.score` : N'existait pas dans le doc pré-patch, non créé

## Exec
- Backup : backup-julian-plan-pre-feasibility-fix-20260521-003228.json + raw
- Script : patch-julian-feasibility-live.mjs
- Dry-run : OK (assert état avant patch validé)
- Exec : OK
- updateTime : 2026-05-20T22:33:41.183110Z
- Dump post-patch : post-patch-julian.json

## Vérification post-patch (re-fetch Firestore)
- feasibility.message contient "12,3 km/h" : OK
- feasibility.message contient "test demi-Cooper du 18/05" : OK
- feasibility.recommendation : "Objectif réaliste 55-57 min selon progression" OK
- targetTime = "55min" : inchangé
- vma = 12.3 : inchangé
- paces.efPace / paces.allureSpecifique10k : inchangés
- feasibility.status = "AMBITIEUX" : inchangé

## Doctrine respectée
- feedback_input_client_obligatoire : targetTime/paces/vma inchangés
- feedback_jamais_baisser_allure_cible : objectif 55 min préservé (cible user)
- feedback_jamais_poids_minceur : preflight FORBIDDEN OK (aucun mot interdit)
- feedback_jamais_contact_client : modif silencieuse, aucun mail/notif émis
- feedback_securite_avant_conversion : message honnête, rappelle aponévrosite + nature ambitieuse de la cible
