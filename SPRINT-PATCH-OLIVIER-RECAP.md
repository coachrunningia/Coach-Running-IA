# Sprint patch Olivier 126 km — Récap
Date : 2026-05-23
Auteur : Dev senior (intégration corrections coach FFA/UTMB + dev senior)

## Statut : ⏸ ATTENTE — token gcloud expiré, ré-auth user requise

Le dry-run n'a pas pu être exécuté car le token `gcloud` impersonant `firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com` est expiré. Romane doit lancer manuellement :

```bash
gcloud auth login
# puis
cd /Users/romanemarino/Coach-Running-IA
node patch-olivier-126km-live.mjs --dry
# si OK → node patch-olivier-126km-live.mjs
```

Le script (V1) est prêt, valide syntaxiquement (`node --check` OK), et intègre toutes les corrections coach + dev validées.

---

## Modifications appliquées au script `patch-olivier-126km-live.mjs`

### Corrections COACH intégrées (livrable `COACH-CHALLENGE-PATCH-OLIVIER.md`)
1. **WelcomeMessage** remplacé par la version exacte du coach (lignes 38-58 du livrable) :
   - D+ test 50 km recalibré : 500 D+ au lieu de 1500 (spécificité 126 km / 850 D+)
   - Retrait phrase fausse "dimanche = repos en ultra senior"
   - Ajout ligne 4 recommandant bascule SL Lun→Dim manuelle
   - Suggestion test 50 km reformulée "check-point" et non "objectif intermédiaire"
2. **weeklyVolumes** S23 ajusté 80 → 70 km (raffinement coach, sécurité affûtage senior)
3. **Repos complet** conservé (validé coach)
4. **Swap SL Lun ↔ Repos Dim S2-S9** : Option max coach implémentée (preview, patchable)

### Modifications DEV P0+P1 intégrées (livrable `DEV-CHALLENGE-SCRIPT-OLIVIER.md`)
- **P0-1** : détection vécu via `session.feedback?.completed === true` (signal robuste App.tsx)
- **P0-2** : re-fetch immédiat avant patch + détection race-condition (count `feedback.completed`) + re-merge feedback S1 pour préserver tout RPE/Strava arrivé entre fetch initial et patch
- **P1-1** : rescaling proportionnel des distances de sessions S10-S23 pour cohérence avec `weeklyVolumes` (survie au prochain `enforceWeekConstraints`)
- **P1-2** : regex `VELO_RE` étendue à `cooldown`+`advice`, retrait `p[ée]dal` (faux positif "pédaler la foulée"), ajout `home-trainer`, `elliptique`, `natation`, `swim`
- **Modif #3** : vérif post-patch robuste (snapshot pré-patch, assertion régression `feedback.completed`, exit 2 si invariants KO)
- **Modif #4** : `daysSinceStart > 7` → exit 1 par défaut (override `--force-s2-aware`)
- **Modif #5** : commentaire sur resync futur weeklyVolumes
- **Modif #6** : snapshot pré-patch des séances vécues

### Doctrines préservées (commentaires inline)
- `feedback_patch_live_plans_jour_seulement` : S1 Lun-Ven INTOUCHÉ (signal `feedback.completed`)
- `feedback_coach_running_ia_que_course` : toutes Vélo → Repos
- `feedback_input_client_obligatoire` : cible 126km, freq 5, cv 30, raceDate, Trail goal NON touchés
- `feedback_chaque_ligne_justifiee` : chaque section commentée avec justification
- `feedback_jamais_poids_minceur` : zéro mention IMC/poids dans le welcome

---

## Conditions GO EXEC (10 checks DEV)

| # | Check | Statut |
|---|-------|--------|
| 1 | Modif #1 (`feedback.completed` au lieu d'index) | ✅ Appliquée L207 |
| 2 | Modif #2 (regex étendue + `pédal` retiré) | ✅ Appliquée L191 (`VELO_RE`) |
| 3 | Modif #3 (vérif post-patch avec assertion régression) | ✅ Appliquée L400-435 |
| 4 | Modif #4 (`daysSinceStart > 7` = exit 1) | ✅ Appliquée L114-117 |
| 5 | Modif #5 (commentaire resync futur) | ✅ Appliquée L153-157 |
| 6 | Modif #6 (snapshot pré-patch) | ✅ Appliquée L83-93 |
| 7 | Tests 1-5 dry-run passés sans erreur | ⏸ Bloqué : token gcloud expiré |
| 8 | Coach trail ultra validé welcome + weeklyVolumes | ✅ Validé (livrable coach) |
| 9 | Romane confirme `isPreview=true && fullPlanGenerated=false` | ⏸ À confirmer côté Romane |
| 10 | Olivier non-connecté au moment exec | ⏸ À vérifier côté Romane (mitigation : re-fetch race-check intégré) |

**Décision : NO GO tant que #7, #9, #10 non validés.**

---

## Vérification post-patch (sera produite par le script automatiquement)

Le script imprime :
- Hash backup : `backup-olivier-126km-<timestamp>.json`
- Vélo restants : doit être 0
- Régressions séances vécues : doit être 0
- weeklyVolumes pic : doit être 80
- weeklyVolumes S23 : doit être 70
- Swap SL Lun↔Dim S2-S9 : doit être 8/8
- updateTime Firestore : retourné par PATCH

Si une seule assertion KO → exit 2, ticket à rouvrir.

---

## Procédure exec (à lancer par Romane)

```bash
# 1. Ré-auth gcloud (token expiré)
gcloud auth login

# 2. Dry-run obligatoire
cd /Users/romanemarino/Coach-Running-IA
node patch-olivier-126km-live.mjs --dry

# 3. Si dry-run OK (10 conditions vertes) → exec
node patch-olivier-126km-live.mjs

# 4. Vérification post-patch automatique (script imprime résumé final + updateTime)
```

## Fichiers livrés
- `/Users/romanemarino/Coach-Running-IA/patch-olivier-126km-live.mjs` (V1, refondu)
- `/Users/romanemarino/Coach-Running-IA/SPRINT-PATCH-OLIVIER-RECAP.md` (ce fichier)
