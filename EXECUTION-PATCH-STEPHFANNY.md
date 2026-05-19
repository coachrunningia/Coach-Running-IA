# Exécution Patch Live — steph-fanny@laposte.net

**Plan ID** : `1779185876450`
**Date exécution** : 2026-05-19
**Auth** : `programme@coachrunningia.fr` (Firestore REST API + gcloud token)
**updateTime Firestore post-patch** : `2026-05-19T11:22:06.760697Z`
**Statut global** : OK

## Backup
`/Users/romanemarino/Coach-Running-IA/backup-1779185876450-pre-patch-20260519-131611.json`

## Dump post-patch
`/Users/romanemarino/Coach-Running-IA/post-patch-stephfanny-plan.json`

## Script
`/Users/romanemarino/Coach-Running-IA/patch-stephfanny-live.mjs` (dry-run + exec OK)

## Diff champ par champ

| Champ | AVANT | APRÈS | Statut |
|---|---|---|---|
| `feasibility.status` | `EXCELLENT` | `BON` | OK |
| `feasibility.score` | `95` | `75` | OK |
| `confidenceScore` (racine) | `95` | `75` | OK |
| `feasibility.message` | "Ton profil est très bien adapté à ce 10 km..." | "Ton plan 10 km Finisher sur 21 semaines est très bien structuré. Quelques points d'attention honnêtes : ta VMA "8 km/h corrigée"..." (réserves PB 5K + 60 ans, viser 1h40-1h55) | OK |
| `feasibility.safetyWarning` | "À 60 ans, on te recommande de consulter ton médecin... 48h minimum..." | conservé (déjà bon) | OK |
| `paces.allureSpecifique10k` | `8:20` | `10:00` (règle `feedback_finisher_plus_pb_allure` : max(PB+5%, VMA-based) = ~10:00) | OK |
| `generationContext.paces.allureSpecifique10k` | `8:20` | `10:00` (mirror pour cohérence) | OK |
| `welcomeMessage` | "Bienvenue dans ton plan d'entraînement de 21 semaines... 60 ans, bilan cardio-vasculaire conseillé." | Réécrit : PB 5K 46 min cité, allure entraînement 11:12 EF expliquée, allure course 10:00 mentionnée, médecin/test cardio 60 ans, 48h récup, marche/raccourci OK | OK |
| `weeks[0].sessions[0]` Mardi `duration` | `1h00` | conservé `1h00` | OK |
| `weeks[0].sessions[0]` Mardi `distance` | `5.4 km` | conservé `5.4 km` | OK |
| `weeks[0].sessions[0]` Mardi `mainSet` | `"116 min en deux moitiés..."` | `"42 min en deux moitiés : la 1re très tranquille (bas EF), la 2e dans le haut de l'EF autour de 11:12 min/km, toujours conversationnel. Si fatigue, raccourcis sans culpabiliser."` | OK |
| `weeks[0].sessions[1]` Jeudi (Renforcement) | (intact) | (intact) | OK |
| `weeks[0].sessions[2]` Dimanche `duration` | `1h00` | `1h30` (modif coach 15 ans) | OK |
| `weeks[0].sessions[2]` Dimanche `distance` | `5.3 km` | `8.0 km` (cohérent avec mainSet) | OK |
| `weeks[0].sessions[2]` Dimanche `mainSet` | `"8.0 km de course continue en endurance fondamentale (EF) à l'allure de 11:12 min/km..."` | conservé (déjà cohérent avec nouveau 8.0 km / 1h30) | OK |

## Volume S1 post-patch

| Séance | Distance | Durée |
|---|---|---|
| Mardi (Footing EF) | 5.4 km | 1h00 |
| Jeudi (Renfo) | 0.0 km | 30 min |
| Dimanche (SL EF) | 8.0 km | 1h30 |
| **Total course** | **13.4 km** | 2h30 |

vs `currentWeeklyVolume` déclaré = 20 km/sem (S1 -33% en cours de mise en route, validé coach pour Finisher 60 ans).

## Doctrines vérifiées

- `feedback_finisher_plus_pb_allure` : allure 10K passée à 10:00 (max PB+5% / VMA-based)
- `feedback_securite_avant_conversion` : status BON (75) honnête vs EXCELLENT (95) optimiste
- `feedback_jamais_baisser_allure_cible` : N/A (Finisher = pas de cible chrono saisie)
- `feedback_input_client_obligatoire` : 20 km/sem déclaré respecté autant que possible (13.4 km S1 acceptable pour 60 ans, validé coach)
- `feedback_jamais_poids_minceur` : preflight `assertSafe` PASS sur les 3 wordings (feasibility.message, welcomeMessage, mardi.mainSet)
- `feedback_patch_live_plans_jour_seulement` : plan créé 2026-05-19 10:17Z, S1 commence Mardi → patchable
- `feedback_jamais_contact_client` : aucun contact direct, patch Firestore uniquement
- `fullPlanGenerated: false` : pas de propagation aux semaines suivantes nécessaire (seules S1 + métadonnées visibles utilisateur)

## Vérif post-patch (re-fetch Firestore)

```
feasibility.status        : BON
feasibility.score         : 75
confidenceScore           : 75
paces.allureSpecifique10k : 10:00
welcomeMessage            : "Bienvenue dans ton plan 10 km — Finisher sur 21 semaines..."
Mardi     | 1h00   | 5.4 km   | mainSet="42 min en deux moitiés..."
Jeudi     | 30 min | 0.0 km   | (renfo intact)
Dimanche  | 1h30   | 8.0 km   | mainSet="8.0 km de course continue..."
```

Tous champs conformes aux décisions validées coach + Romane.
