# F-17 — Recalibrer mes allures Premium — Audit UX PM

Contexte : user a plan actif, modifie VMA dans profil, modal lui propose recalibrage allures.
Doctrines clés : `feedback_securite_avant_conversion`, `feedback_jamais_baisser_allure_cible`, `feedback_input_client_obligatoire`, `feedback_jamais_contact_client`, `feedback_patch_live_plans_jour_seulement`.

---

## 1. Wording finalisé — écran par écran

### A. Modal "VMA modifiée" (déclenché à la sauvegarde profil)

```
Titre : Ta VMA a changé
Sous-titre : Ancienne 10.9 → Nouvelle 13.4 km/h (+23%)

Que veux-tu faire pour ton plan en cours ?

[ Garder les allures de mon plan ]        ← default, neutre
   Tes séances restent calibrées comme avant.

[ ⭐ Recalibrer mes allures (Premium) ]    ← CTA principal Premium
   Toutes les allures de ton plan seront
   recalculées sur ta nouvelle VMA.

(petit lien gris en bas)
ⓘ La VMA reste enregistrée dans ton profil
   dans tous les cas.
```

Notes :
- Pas de fermeture implicite : un choix est obligatoire (bouton X = "Garder").
- Ancienne / nouvelle VMA TOUJOURS affichées avec delta % calculé.
- L'étoile ⭐ avant "Recalibrer" = seul marqueur Premium, pas de badge agressif.

### B. Warning ajustement > 15% (Robine +20%, Lucas +23%)

Encadré jaune INSÉRÉ entre sous-titre et boutons, JAMAIS masquable :

```
⚠ Ajustement important détecté (+23%)

  Une hausse de VMA de cette ampleur en peu de
  temps est rare. Si ta nouvelle VMA n'est pas
  confirmée par un test récent (VMA, 5K, 10K),
  recalibrer rendra tes allures BEAUCOUP plus
  rapides — risque de blessure ou de séances
  intenables.

  Si tu n'es pas sûr·e : garde tes allures
  actuelles. Tu pourras recalibrer plus tard.
```

Seuils :
- delta ≥ +15% → warning jaune (ci-dessus)
- delta ≥ +25% → warning ROUGE + le CTA "Recalibrer" devient secondaire (style bordure, plus de fond plein). User doit cocher "Je confirme avoir testé ma VMA" avant d'activer le bouton.
- delta ≤ -15% (baisse VMA) → warning informatif gris : "Tes allures vont ralentir. Normal après blessure / coupure ?"

### C. Toast post-recalibrage (1-3s loading préalable)

```
✓ Tes allures ont été mises à jour
   sur la base de ta nouvelle VMA (13.4 km/h).
```

Durée : 4s, dismissable au tap.

### D. Welcome enrichi (haut de page plan, persistant 7j)

```
ⓘ VMA ajustée le 27/05 (10.9 → 13.4 km/h).
  Allures du plan recalibrées en conséquence.

  [ Revenir à mes anciennes allures ] (lien)
```

Le lien rollback reste 7 jours, puis disparaît (souvenir des anciennes allures conservé côté back 30j).

### E. Free user qui tape "Recalibrer mes allures"

NE PAS désactiver le bouton (frustrant, invisible). Pricing modal léger :

```
⭐ Recalibrer tes allures est une fonction Premium

  Ta VMA est bien enregistrée. Avec Premium,
  toutes les allures de ton plan se recalculent
  automatiquement quand ta forme évolue.

  [ Découvrir Premium ]   [ Plus tard ]
```

Choix "Plus tard" = équivaut à "Garder les allures" (silencieux, pas de re-modal).

---

## 2. Cas Junior plan IRRÉALISTE/RISQUÉ (D17)

Si plan actif a `safetyWarning` actif (feasibility ≤ 30, doctrine `feedback_d17_feasibility_transparence_optin`) :

→ Le bouton "Recalibrer" reste visible MAIS un bloc rouge supplémentaire s'affiche AU-DESSUS des deux CTA :

```
⛔ Ton plan actuel est déjà marqué comme RISQUÉ
   pour ton niveau. Recalibrer sur une VMA plus
   haute le rendrait encore plus exigeant.

   Recommandation : garde les allures actuelles
   et termine d'abord ce bloc.
```

Le CTA "Recalibrer" devient secondaire (bordure). Pas de blocage dur — doctrine = transparence + opt-in, jamais patch silencieux.

---

## 3. Trois safeguards UX critiques

1. **Sécurité avant conversion** (doctrine `feedback_securite_avant_conversion`) : warning > 15% non masquable, opt-in coché obligatoire si > 25%. La modale Premium ne doit JAMAIS embellir une recalibration dangereuse. Robine et Lucas DOIVENT voir le rouge avant de pouvoir confirmer.

2. **Rollback toujours accessible 7j** : le bouton "Revenir à mes anciennes allures" dans le welcome enrichi est obligatoire. Aucune action irréversible côté user, surtout pour un acte payant Premium qui peut casser une semaine d'entraînement. Côté back : snapshot des `targetPace` pré-recalibrage stocké 30j.

3. **Patch live = plans du jour uniquement** (doctrine `feedback_patch_live_plans_jour_seulement`) : recalibrage applique les nouvelles allures à partir d'AUJOURD'HUI inclus. Séances déjà vécues (dates < J) restent intactes dans l'historique avec leurs anciennes allures. Préciser en petit dans la modal : "Les séances passées ne sont pas modifiées."

---

## 4. Tap targets mobile (44pt min)

| Élément | Taille recommandée | Note |
|---|---|---|
| Bouton "Garder les allures" | hauteur 52pt, full-width - 32pt | Default, style outlined gris foncé |
| Bouton "⭐ Recalibrer (Premium)" | hauteur 56pt, full-width - 32pt | CTA principal, fond plein |
| Checkbox "Je confirme avoir testé ma VMA" (>25%) | 28pt visuel + 44pt tap zone | Padding invisible autour |
| Lien "Revenir à mes anciennes allures" | hauteur 44pt min, underline visible | Pas un simple texte gris |
| Bouton X fermer modal | 44x44pt | Équivaut à "Garder" |
| Toast tap-to-dismiss | full toast = tap zone | 60pt hauteur min |

Espacement vertical entre les 2 CTA modal : 12pt minimum (évite mistap).

---

## 5. Doctrine `feedback_jamais_contact_client`

Aucune notif push, mail, SMS auto envoyé à l'utilisateur suite à recalibrage. Tout reste IN-APP :
- Toast (visible immédiatement)
- Welcome enrichi (visible à la prochaine ouverture plan)
- Snapshot dans historique paramètres profil

Si Romane veut communiquer un changement majeur (ex : algo recalibrage modifié), elle le fait elle-même, jamais le système.

---

## Récap décisions

| Question | Décision |
|---|---|
| Rollback ? | OUI, 7j visible welcome, 30j côté back |
| Warning > 15% ? | OUI, jaune ; rouge + opt-in > 25% |
| Free user "Recalibrer" ? | Pricing modal léger, pas disabled |
| Junior plan risqué ? | Warning rouge supplémentaire, pas de blocage dur |
| Notif user auto ? | NON, in-app only |
| Default modal ? | "Garder les allures" (safe) |
