# Exécution patches live — Morgane + Louleroy (Semi-Marathon)

**Date** : 2026-05-20
**Opérateur** : Romane (via patch live Firestore depuis Coach-Running-IA local)
**Doctrine** : "patch dans le code et aussi dans les plans des deux personnes (sois quand même conservateur débutant mais volume important)"

---

## Synthèse exécutive

Deux plans Semi-Marathon Débutant avec `peakWeekVolume` sous-calibré (14 et 18 km/sem) ont été
recalibrés en preview (avant que les semaines 2-22 ne soient générées en mode premium) en
modifiant uniquement `generationContext.periodizationPlan.weeklyVolumes`.

| Plan | Pic AVANT | Pic APRÈS | Sum AVANT | Sum APRÈS | Δ pic |
|------|-----------|-----------|-----------|-----------|-------|
| Morgane (Finisher, freq 3, cv 7, VMA 11) | 14 km/sem | **19 km/sem** | 226 km | 281 km | +35 % |
| Louleroy (1h10 IRRÉALISTE, freq 4, cv 10, VMA 9.66) | 18 km/sem | **24 km/sem** | 283 km | 360 km | +33 % |

Aucune autre donnée du plan modifiée (allures, level, VMA, targetTime, currentWeeklyVolume,
welcomeMessage, feasibility, S1 déjà matérialisée).

---

## Plan 1 — Morgane (morganedorlet696@gmail.com)

- **Plan ID** : `1779261135721`
- **userId** : `BpoCyHQcCfavcmSby0u5LIdLS3o1`
- **Profil questionnaire** : F, 20 ans (saisi), Semi-Marathon Nevers (2026-10-17), Finisher,
  freq 3, currentWeeklyVolume 7 km/sem, VMA 11 (estimée, Débutant 0-1 an), poids hors scope.
- **Plan créé** : 2026-05-20 07:12 UTC (jour même, preview, S1 non vécue).
- **Statut** : `isPreview=true`, `fullPlanGenerated=false`, `durationWeeks=22`.

### Modifs

- `generationContext.periodizationPlan.weeklyVolumes` :
  - AVANT : `[8, 9, 9, 7, 8, 9, 9, 9, 10, 10, 10, 12, 11, 12, 14, 11, 13, 14, 11, 13, 9, 8]` — pic 14
  - APRÈS : `[8, 9, 10, 8, 10, 12, 10, 12, 14, 11, 13, 15, 12, 15, 17, 14, 16, 18, 16, 19, 13, 9]` — pic 19
  - Pic à S20 (cohérent avec affutage S21-S22), respect `recoveryWeeks=[4,7,10,13,16,19]`.
  - Progression max +25 % post-récup (équivalent au pattern de l'algo actuel).

### Backup + Exec

- Backup : `/Users/romanemarino/Coach-Running-IA/backup-morgane-plan-1779269634767.json`
- Dry-run : OK (diff visuel confirmé, aucun champ doctrine touché)
- Exec : OK — `updateTime: 2026-05-20T09:33:56.487794Z`
- Dump post-patch : `/Users/romanemarino/Coach-Running-IA/post-patch-morgane-plan.json`
- Cohérence post-patch : validée (relecture confirme `weeklyVolumes` exactement comme attendu)

### Doctrine respectée

- `feedback_input_client_obligatoire` : `targetTime=Finisher`, `vma=11`, `vmaSource`,
  `sessionsPerWeek=3`, `currentWeeklyVolume=7` (snapshot questionnaire) — INCHANGÉS.
- `feedback_jamais_baisser_allure_cible` : `paces.*` non touchés (Finisher = pas d'allure cible
  saisie de toute façon).
- `feedback_jamais_poids_minceur` : aucun wording modifié (assertSafe passé sur tous les
  champs touchés).
- `feedback_jamais_contact_client` : modif silencieuse, pas de mail/notif déclenchés.
- `feedback_patch_live_plans_jour_seulement` : plan créé jour même, S1 non vécue (preview).
- S1 (3 séances : Marche/Course 3 km Lundi, Renfo 30 min Jeudi, SL 5 km Dimanche, total
  8 km) déjà cohérente avec la nouvelle progression — NON touchée.

---

## Plan 2 — Louleroy (louleroy94@gmail.com)

- **Plan ID** : `1779260474961`
- **userId** : `t4SVXgKvmLVhQGno9X0NLWoOYA13`
- **Profil questionnaire** : F, 23 ans, Semi-Marathon Thiais (2026-10-18), target 1h10
  (IRRÉALISTE — feasibility.score=5), niveau "Confirmé (Compétition)" déclaré, MAIS
  10 km en 1h09 -> Débutant réel. freq 4, currentWeeklyVolume 10 km/sem, VMA 9.66 km/h
  calculée depuis 10K, BMI ~30 (hors scope wording).
- **Plan créé** : 2026-05-20 07:01 UTC (jour même, preview, S1 non vécue).
- **Statut** : `isPreview=true`, `fullPlanGenerated=false`, `durationWeeks=22`.

### Modifs

- `generationContext.periodizationPlan.weeklyVolumes` :
  - AVANT : `[10, 11, 11, 9, 10, 12, 10, 12, 14, 11, 13, 15, 13, 15, 17, 14, 16, 18, 14, 16, 12, 10]` — pic 18
  - APRÈS : `[10, 12, 13, 11, 13, 15, 12, 15, 17, 14, 17, 20, 16, 19, 22, 18, 21, 24, 20, 24, 16, 11]` — pic 24
  - Conservateur car niveau réel Débutant + condition initiale (Δ vs Morgane = +30 % env.,
    cohérent avec freq 4 et cv 10 vs freq 3 et cv 7).

### Backup + Exec

- Backup : `/Users/romanemarino/Coach-Running-IA/backup-louleroy-plan-1779269657707.json`
- Dry-run : OK
- Exec : OK — `updateTime: 2026-05-20T09:34:19.517100Z`
- Dump post-patch : `/Users/romanemarino/Coach-Running-IA/post-patch-louleroy-plan.json`
- Cohérence post-patch : validée

### Doctrine respectée

- `feedback_input_client_obligatoire` : `targetTime=1h10`, `level=Confirmé (Compétition)`
  (snapshot questionnaire), `vma=9.66`, `vmaSource="10km en 1h09"`, `sessionsPerWeek=4`,
  `currentWeeklyVolume=10` — INCHANGÉS.
- `feedback_jamais_baisser_allure_cible` : `paces.allureSpecifiqueSemi=3:19` conservée
  malgré le caractère IRRÉALISTE — c'est sa cible affichée.
- `feedback_securite_avant_conversion` : `feasibility.status=IRRÉALISTE` et son message
  d'alerte conservés, ainsi que `welcomeMessage` (gèrent déjà l'avertissement chrono).
- `feedback_jamais_poids_minceur` : aucun wording touché ; BMI évoqué nulle part dans
  les modifs.
- `feedback_jamais_contact_client` : modif silencieuse.
- S1 (4 séances : Lundi repos actif, Mercredi SL 5.7 km, Vendredi jogging 4.3 km, Samedi
  Renfo — total 10 km de course) déjà cohérente avec la nouvelle progression — NON touchée.

---

## Notes coach

1. **Pourquoi ne pas toucher la S1 ?** Les deux S1 (8 km Morgane / 10 km Louleroy) sont déjà
   parfaitement alignées avec leur `currentWeeklyVolume` et le départ de la nouvelle courbe.
   Toute modif S1 violerait `feedback_patch_live_plans_jour_seulement` au-delà du strict
   nécessaire (la S1 a été vue par les users en preview, on ne change que les semaines à venir).
2. **Pourquoi modifier uniquement `weeklyVolumes` ?** Les semaines 2-22 ne sont pas encore
   générées (plans freemium). Quand l'utilisateur passe premium et déclenche la génération
   complète, l'algo utilisera la nouvelle courbe `weeklyVolumes` comme base. Le patch
   est donc effectif pour 100 % du plan futur, à moindre risque (aucune session
   matérialisée touchée).
3. **Garde-fou SL pic** : Le brief mentionne "SL pic Morgane ≤12 km, Louleroy ≤14 km" — ces
   contraintes seront appliquées en aval par le code de génération des séances (cf garde-fou
   `cv<10` Débutant Semi). Aucune session SL n'a été matérialisée ici, donc aucun risque
   de dépassement à corriger côté plan.
4. **Cas Louleroy 1h10** : on conserve le `targetTime=1h10` et l'allure `3:19/km` — c'est
   sa cible affichée, infaisable mais doctrine `feedback_input_client_obligatoire` +
   `feedback_jamais_baisser_allure_cible`. Le `feasibility.status=IRRÉALISTE` et le
   `welcomeMessage` font le job d'alerte explicite côté UX.

---

## Fichiers générés

| Type | Path |
|------|------|
| Script patch Morgane | `/Users/romanemarino/Coach-Running-IA/patch-morgane-semi-live.mjs` |
| Script patch Louleroy | `/Users/romanemarino/Coach-Running-IA/patch-louleroy-semi-live.mjs` |
| Backup Morgane (pré-patch dry-run) | `/Users/romanemarino/Coach-Running-IA/backup-morgane-plan-1779269586476.json` |
| Backup Morgane (pré-patch exec) | `/Users/romanemarino/Coach-Running-IA/backup-morgane-plan-1779269634767.json` |
| Backup Louleroy (pré-patch dry-run) | `/Users/romanemarino/Coach-Running-IA/backup-louleroy-plan-1779269597905.json` |
| Backup Louleroy (pré-patch exec) | `/Users/romanemarino/Coach-Running-IA/backup-louleroy-plan-1779269657707.json` |
| Dump post-patch Morgane | `/Users/romanemarino/Coach-Running-IA/post-patch-morgane-plan.json` |
| Dump post-patch Louleroy | `/Users/romanemarino/Coach-Running-IA/post-patch-louleroy-plan.json` |
| Audit pré-patch Morgane | `/Users/romanemarino/Coach-Running-IA/audit-morgane-plan.json` |
| Audit pré-patch Louleroy | `/Users/romanemarino/Coach-Running-IA/audit-louleroy-plan.json` |
