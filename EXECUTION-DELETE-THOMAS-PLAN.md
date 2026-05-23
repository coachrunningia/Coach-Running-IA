# Delete plan Thomas Weill — exec live
Date : 2026-05-20 12:32 (heure locale)

## Contexte
Thomas s'est trompé de nombre de séances au questionnaire (freq 4 alors
qu'il visait autre). Plan supprimé pour qu'il puisse régénérer.
`hasPurchasedPlan: true` conservé → full plan automatique à régen,
pas de re-paiement.

## Backup
- Fichier : `/Users/romanemarino/Coach-Running-IA/backup-thomas-plan-PRE-DELETE-2026-05-20T10-32-13.json`
- Taille  : 206.1 KB (211 026 octets)
- Backup secondaire du dry-run : `backup-thomas-plan-PRE-DELETE-2026-05-20T10-31-41.json` (identique)

## Plan supprimé
- planId         : `1779217739002`
- userId         : `nMH83IjgsYZY24QYWyijuIjyoH33`
- userEmail      : `thomas.weill.pro@gmail.com`
- name           : "Préparation Marathon en 3h20 — 19 sem."
- distance       : 42.195 km (Marathon)
- targetTime     : 03:20:00
- sessionsPerWeek: 4
- durationWeeks  : 19
- createTime     : 2026-05-19T19:08:59.597997Z
- updateTime     : 2026-05-19T22:38:21.196414Z (dernière modif = patch live d'hier soir)
- Réponse DELETE : `{}` (succès Firestore REST)
- Fetch direct post-delete : `404 NOT_FOUND` ✓

## Vérifs post-delete user (users/nMH83IjgsYZY24QYWyijuIjyoH33)
- email             : thomas.weill.pro@gmail.com ✓
- hasPurchasedPlan  : `true` ✅ (flag paiement conservé)
- planPurchaseDate  : `2026-05-19T19:17:36.036Z` ✅
- isPremium         : `false` (normal pour Plan Unique)
- Plans actifs      : 0 ✓
- Sous-collections users/{uid} : aucune (vérifié pré-delete)

## Action Romane
Thomas peut maintenant régénérer un nouveau plan via le questionnaire.
Le flag `hasPurchasedPlan: true` débloquera automatiquement le full plan
sans nouvelle facturation (cf App.tsx:1025, 1298, 1304).
Romane à prévenir Thomas (hors scope Claude, doctrine
`feedback_jamais_contact_client`).

## Garde-fous appliqués
1. Backup obligatoire AVANT delete (1 fichier dry-run + 1 fichier exec)
2. Dry-run préalable, validé
3. Sanity checks runtime (anti-erreur identité) :
   - userEmail user + plan == thomas.weill.pro@gmail.com
   - userId plan == UID hardcodé
   - questionnaire : sex=Homme, age=31, subGoal=Marathon
   - plan : distance=42.195 km, goal=Course sur route, name contient "Marathon"
   - 1 seul plan trouvé (sinon STOP demander GO Romane)
4. `users/{uid}` non touché (hasPurchasedPlan + planPurchaseDate intacts post-delete)

## Rollback possible
Le backup contient le document Firestore complet (format REST). Pour
restaurer, soit :
- `POST plans` avec le body `fields` du backup (nouveau planId), soit
- `PATCH plans/1779217739002` en re-créant l'ID (si Firestore permet la
  re-création du même ID, sinon nouveau timestamp ID + lien user).
Script de restore non écrit (pas demandé), à créer au besoin.

## Fichiers liés
- Script delete : `/Users/romanemarino/Coach-Running-IA/delete-thomas-plan-live.mjs`
- Backup        : `/Users/romanemarino/Coach-Running-IA/backup-thomas-plan-PRE-DELETE-2026-05-20T10-32-13.json`
