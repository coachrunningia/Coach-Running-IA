# Spec Patch Live — Olivier 126 km (1779489509164)
Date : 2026-05-23
**À FAIRE CHALLENGER PAR EXPERT TRAIL ULTRA + DEV AVANT EXEC**

## Contexte
- 56 ans H, BMI 26.5, cv 30 km/sem, D+ 50 m/sem, VMA 8.66
- Confirmé déclaré (PB Marathon 5h45 = niveau objectivement Régulier)
- Course 126 km / 850 D+ le **21/11/2026** — Finisher
- Plan créé 22/05, startDate **18/05** (mais isPreview=true / fullPlanGenerated=false)
- S1 vécue Lundi → Vendredi (séances Lun/Mer/Jeu/Ven). Dimanche **pas encore vécu**

## État actuel à corriger

### Bug systémique #1 — Cross-training Vélo sur TOUTES semaines
9 séances "Récupération (Vélo)" sur S1-S9 :
- S1 Dim : 6.5 km / 75 min / 11:33 (running pace)
- S2 Dim : 22 km à vélo / 11:33
- S3 Dim : 24 km à vélo / 11:33
- S4 Dim : 18 km / 11:33
- S5 Dim : 25 km / 11:33
- S6-S9 : Vélo avec distance 0 km mais pace 11:33 + mainSet cyclisme

**Violation doctrine `feedback_coach_running_ia_que_course`** sur ~~1 séance~~ **9 séances**.

### Bug systémique #2 — Volume pic 63 km insuffisant
Pour ultra 126 km, référentiel UTMB Academy = pic minimum 75-80 km, optimal 90-110 km.
Ici pic 63 = -25 % sous minimum. Mais cv user = 30 → ACWR sur 27 sem permet d'aller jusqu'à 75-80.

### Bug #3 — SL en Lundi J1 (déjà vécue, intouchable pour S1)
Mais on peut prévenir le user dans welcome de basculer la SL au Dimanche pour S2+.

### Bug #7 — WelcomeMessage déconnecté de feasibility IRRÉALISTE
Welcome dit "construire une base solide" alors que feasibility dit IRRÉALISTE confidence 10.

## Spec PATCH proposé

### Partie A — Sessions S1 à S9 : remplacer Vélo
**Pour S1 Dimanche** (pas vécue J+1) :
- type : `Repos` (jour off complet)
- title : `Repos complet`
- distance : `N/A` 
- duration : `N/A`
- targetPace : `N/A`
- mainSet : `Jour de repos complet — pas de séance. Étirements doux + mobilité genou/cheville si envie. Hydratation et nutrition normales. Le repos est une SÉANCE à part entière dans un cycle ultra-trail.`

**Pour S2-S9 séances Vélo** :
- Option 1 : Repos (idem)
- Option 2 : Footing récup ultra court (4-5 km à recoveryPace 11:33 — l'allure existe et est légitime ici)

⚠️ **À TRANCHER PAR COACH** : Repos vs footing récup ? Pour senior 56 ans en ultra-trail, le repos est-il plus pertinent que footing récup ?

### Partie B — WeeklyVolumes recalibrés
Actuel : `[30, 32, 34, 27, 31, 36, 41, 32, 37, 43, 49, 38, 44, 51, 59, 46, 53, 60, 63, 50, 57, 60, 63, 43, 39, 35, 32]`
Pic 63 → cible **80 km** (compromis ACWR sain pour 27 sem + senior 56 + minimum UTMB Academy).
Affûtage 4 sem → conservé OK pour senior, baisse plus marquée (-25%/-30%/-35%/-45%).

Proposition : `[30, 35, 40, 30, 38, 44, 50, 38, 45, 53, 60, 45, 53, 62, 70, 53, 62, 72, 80, 60, 70, 76, 80, 60, 48, 38, 30]`
- Pic S15 = 70 km (premier vrai pic dev)
- Pic S19 = 80 km (pic spécifique 1)
- Pic S23 = 80 km (pic spécifique 2)
- Affûtage S24-S27 : 60 → 48 → 38 → 30

⚠️ **À TRANCHER PAR COACH** : 80 km suffisant pour 126 km ? Ou pousser à 90 km ?

### Partie C — WelcomeMessage reformulé brutal
```
Bienvenue Olivier. Ce plan prépare un trail de 126 km avec 850 m de dénivelé, le 21 novembre 2026.

⚠️ TRANSPARENCE ABSOLUE — À LIRE AVANT TOUTE SÉANCE

Notre analyse objective de la faisabilité est IRRÉALISTE (confidence 10/100). Les chiffres :
- Tu cours actuellement 30 km/sem avec 50 m de D+/sem.
- La course demande 126 km en une seule fois avec 850 m de D+ accumulé.
- Ton volume hebdo va devoir tripler en 27 semaines. Ton D+ hebdo devra être multiplié par 17.
- À 56 ans, BMI 26.5, ton appareil locomoteur tient mal des charges aussi soutenues sans casse.

CE QUE NOUS RECOMMANDONS FORTEMENT (sans modifier ton objectif si tu maintiens) :
1) Consultation médecin du sport AVANT démarrage : bilan cardio + évaluation articulaire genoux/chevilles.
2) Objectif intermédiaire : viser un 50 km / 1500 D+ en septembre comme test grandeur réelle. Si tu le finis correctement, le 126 km est envisageable. Sinon, on adapte.
3) Repos strict : pas de cross-training imposé dans ton plan (course à pied uniquement, c'est notre périmètre coach). Le dimanche reste un jour OFF dans nos plans ultra senior.
4) Médecin OBLIGATOIRE si douleur articulaire ou tendineuse > 48h.

Le plan a été recalibré (pic 80 km/sem au lieu de 63) pour s'approcher du minimum vital UTMB Academy, sans franchir le mur ACWR. Tu peux nous interroger via le support si tu veux discuter d'un objectif plus accessible.

L'objectif 126 km reste le tien. On respecte. Mais on te dit la vérité — ce n'est pas un plan où on te ment pour vendre.
```

### Partie D — Feasibility (déjà OK)
- status : IRRÉALISTE ✅
- confidence : 10 ✅
- message : présent ✅
**Aucune modification**.

## Décisions à trancher avec coach trail ultra
1. **Vélo → Repos ou Footing récup ultra-court** ?
2. **Pic 80 km optimal ou pousser 90 km** ?
3. **WelcomeMessage suggère "viser 50 km d'abord"** — c'est suggérer un changement d'objectif. Doctrine `feedback_input_client_obligatoire` interdit-elle ? Ou exception `feedback_securite_avant_conversion` ?
4. **Quel placement séances** : reconstruire S2-S9 avec SL en Dim ? Ou laisser comme actuel et le système se réajustera quand `fullPlanGenerated` est déclenché ?

## Décisions à trancher avec dev
1. Patcher 9 semaines × 1 séance Vélo = 9 modifs : OK gérer ?
2. Backup obligatoire avant patch — confirmé.
3. Doctrine `feedback_patch_live_plans_jour_seulement` : S1 Lun-Ven vécue (intouchable). S1 Dim (J+1, pas vécu) = patchable. S2-S9 = patchable (preview, non vécus). ✅
4. Si on patche les sessions weeks[i], le sync `weeklyVolumes` depuis sessions est-il automatique ? Ou faut-il forcer ?
