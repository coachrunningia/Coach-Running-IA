# Exécution patch Maeva Wozniak — 2026-05-19

Plan ID : `1779188625574`
Path Firestore : `plans/1779188625574`
Email : wozniak.maeva2@gmail.com — UID : `sRLuCBE8yKMxlmWczdTAGcoL0H42`

## Backup créé
`/Users/romanemarino/Coach-Running-IA/backup-wozniakmaeva-pre-patch-20260519-145324.json` (24 503 octets)

## Dry-run : ✅
Commande : `DRY_RUN=true node patch-wozniakmaeva-live.mjs`
Sortie : AVANT/APRÈS imprimés, aucune écriture Firestore.

## Exec : ✅
Commande : `DRY_RUN=false node patch-wozniakmaeva-live.mjs`
HTTP 200 sur PATCH Firestore. Re-fetch confirmé.
Dump post-patch : `/Users/romanemarino/Coach-Running-IA/post-patch-wozniakmaeva-plan.json`

## Confirmation Firestore : ✅ champ par champ

| Champ | AVANT | APRÈS (Firestore confirmé) |
|---|---|---|
| `feasibility.status` | `BON` | `AMBITIEUX` ✅ |
| `feasibility.score` | `70` | `40` ✅ |
| `feasibility.confidenceScore` | (absent) | `40` ✅ |
| `feasibility.message` | "Ton objectif de finisher… atteignable" (mensonger) | Réécrit transparent 672 chars : pace 5:37/km > 89% VMA, blessure justifie vol bas, chrono réaliste 1h45-1h55 ✅ |
| `feasibility.recommendation` | (absent) | "un chrono cible autour de 1h45-1h55" ✅ |
| `feasibility.safetyWarning` | "Fais valider la reprise avec ton kiné/médecin…" (392 chars) | **CONSERVÉ identique** (mention kiné/médecin déjà présente) ✅ |
| `confidenceScore` (racine) | `70` | `40` ✅ |
| `welcomeMessage` | "Bonjour ! …conçue pour te mener à ton objectif d'1h30…" (mensonger + typo "Tu introduire") | Réécrit 1200 chars : objectif honnête (1h45-1h55), scope course pure (stations à part), blessure prise en compte (12 km/sem max + kiné), pas de poids/nutrition/cross-training ✅ |

## Champs patchés
- `feasibility.status` : BON → AMBITIEUX ✅
- `feasibility.score` : 70 → 40 ✅
- `feasibility.confidenceScore` : ajouté = 40 ✅
- `feasibility.message` : réécrit transparent ✅
- `feasibility.recommendation` : ajouté ✅
- `confidenceScore` (racine) : 70 → 40 ✅
- `welcomeMessage` : réécrit transparent ✅

## Champs intentionnellement NON touchés
- `targetTime` : `"1h30"` conservé ✅ (doctrine `feedback_jamais_baisser_allure_cible`)
- `weeklyVolumes` : conservé (10-12 km/sem pic) ✅ (blessure — doctrine sécurité)
- Sessions S1 (3 séances) : conservées ✅ (adaptation blessure excellente)
- `paces` / `calculatedVMA` / `vma` : conservés ✅
- `feasibility.safetyWarning` : conservé ✅ (déjà mention kiné/médecin)

## Sanity checks runtime
- ✅ status === "AMBITIEUX"
- ✅ score === "40"
- ✅ rootConfidence === "40"
- ✅ targetTimePreserved === "1h30"
- ✅ welcomeUpdated (commence par "Bienvenue dans ton plan Hyrox")

## Conformité doctrines
- ✅ `feedback_jamais_baisser_allure_cible` : targetTime "1h30" préservé
- ✅ `feedback_securite_avant_conversion` : transparence pleine + décharge explicite (chrono réaliste 1h45-1h55 énoncé, pas embellissement)
- ✅ `feedback_jamais_poids_minceur` : zéro mention poids/IMC/silhouette dans nouveau message/welcome
- ✅ `feedback_coach_running_ia_que_course` : zéro cross-training suggéré
- ✅ `project_coach_running_ia_hyrox_scope` : scope course pure explicité, stations à compléter à part
- ✅ `feedback_pas_de_nutrition_dans_plan` : zéro chiffre/protocole nutrition
- ✅ `feedback_jamais_contact_client` : aucun contact direct — Romane gère

## Artefacts
- Backup pré-patch : `backup-wozniakmaeva-pre-patch-20260519-145324.json`
- Script : `patch-wozniakmaeva-live.mjs`
- Dump post-patch : `post-patch-wozniakmaeva-plan.json`
