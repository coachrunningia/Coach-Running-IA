# COACH PATCH LIVE — Laurence `1779563548769`

> **Contexte** : plan Marathon "cible 4h00", 20 sem., freq 5, cv 25 km, **tendinite ischio active déclarée**. Plan S1 (preview) contient 3 séances "Footing vallonné, côtes en marche" → aggravation directe de la tendinopathie ischio (excentrique en côte = mécanisme blessant principal). Welcome dit "surfaces souples" mais plan dit "vallonné" → contradiction qui invalide la confiance utilisateur.
>
> **Vécu** : startDate 18/05, today 23/05 = J+5. J1 (lun) et J3 (mer) potentiellement vécus → **on n'y touche pas**. J4 (jeu) → J7 (dim) PAS vécus → patchables (doctrine `feedback_patch_live_plans_jour_seulement` : preview vue, S1 non terminée).
>
> **Doctrines pivots** :
> - `feedback_securite_avant_conversion` (prime — danger ischio = bloquant)
> - `feedback_jamais_baisser_allure_cible` (4h00 = 5:41/km conservée)
> - `feedback_input_client_obligatoire` (freq 5, cv 25 respectés)
> - `feedback_chaque_ligne_justifiee` (chaque modif documentée)
> - `feedback_jamais_poids_minceur` (zéro mention IMC dans welcome)
> - `feedback_jamais_contact_client` (Romane communique, pas le code)

---

## 1. WelcomeMessage (texte exact remplaçant l'ancien)

```
Bienvenue Laurence ! Tu te prépares pour ton Marathon en 4h00, et on adapte le plan dès la première semaine pour tenir compte de ta tendinite ischio.

Compte tenu de cette blessure active, la S1 a été repensée : aucune côte, aucun terrain vallonné cette semaine. Uniquement des footings sur terrain plat — bords de rivière, piste, chemins lisses — et le renforcement ciblé sur la chaîne postérieure (ischios, fessiers) pour stabiliser la zone sans la traumatiser.

Avant de te lancer, valide impérativement avec ton kiné ou ton médecin que tu peux reprendre une activité de course progressive. Si tu sens la moindre tension dans l'ischio pendant un footing, tu ralentis ou tu marches — pas de "je serre les dents". L'objectif des 3 premières semaines, c'est de retrouver de la mécanique propre sur du plat ; les côtes reviendront quand la tendinite sera consolidée.

Ton objectif 4h00 reste la cible — on construit la base prudemment pour la tenir en sécurité.
```

**Justification** :
- Reconnaît la blessure (pilier 1 RÈGLE BLESSURE EXPLICITE) avec mots user
- Adapte (pilier 2) : plat strict, surfaces lisses, renfo postérieur
- Recommande FORTE (pilier 3) : tendinite ACTIVE → kiné/médecin avant reprise
- Signal STOP explicite si tension → empêche escalade
- Pas de "vous", tutoiement strict
- Aucune mention IMC/poids
- Cible 4h00 préservée (jamais baisser allure cible)

---

## 2. Feasibility message (texte exact)

**Status conservé : `RISQUÉ`** (cv 25 km → marathon 4h = ratio cv/objectif limite + blessure active).

```
Avec ta VMA estimée et ta tendinite ischio actuelle, le plan marathon 4h00 est faisable mais en mode prudent. Ton volume actuel (25 km/sem) impose une montée en charge graduelle, et la blessure réclame des 3 premières semaines 100% sur terrain plat pour ne pas réactiver la zone. La cible 4h00 reste atteignable si tu valides la reprise avec ton kiné, si tu respectes le signal douleur à chaque footing, et si la rampe progressive est tenue (+10%/sem max). Un suivi kiné en parallèle des semaines 1-6 est fortement recommandé.
```

**Justification** :
- Status RISQUÉ conservé (doctrine `feedback_securite_avant_conversion` : on ne maquille pas)
- Intègre tendinite explicitement (manque dans feasibility actuelle)
- Pas de cross-training (vélo/natation) en substitution
- Cible 4h00 préservée
- Recommandation kiné explicite + signal douleur

---

## 3. Sessions S1 J4 + J5 + J6 + J7 (patchables, non vécues)

> Hypothèse mapping J = jour calendaire à partir de startDate=2026-05-18 (lun).
> J4=jeu 21/05, J5=ven 22/05, J6=sam 23/05 (today), J7=dim 24/05.
> Today=23/05. J6 = today → **NE PAS toucher** (preview lue, journée engagée). Patcher J4, J5, J7 uniquement.
>
> Correction : sur 3 séances "Footing vallonné" en S1, on n'identifie pas la position exacte sans la S1 brute — patcher chaque occurrence "Footing vallonné, côtes en marche" restante (J4, J5, J7 si non vécues). J3 mer si flag "vécu" en base → laisser, sinon patcher aussi.

### Template séance footing plat (à appliquer à chaque "Footing vallonné" non vécu en S1)

```json
{
  "title": "Footing EF plat",
  "type": "Jogging",
  "distance": "<conserver km original>",
  "duration": "<conserver min original>",
  "pace": "6:00 min/km (EF stricte, conservation tendinite)",
  "mainSet": "Footing en endurance fondamentale sur terrain STRICTEMENT plat (bords de rivière, piste, chemin lisse). Aucune côte, aucune descente. Si tension ischio > 2/10 pendant l'effort → tu ralentis ou tu marches. Pas de relance, pas d'accélération. Objectif : entretenir la mécanique sans solliciter l'excentrique ischio."
}
```

**Justification médicale** :
- Excentrique en côte = mécanisme #1 d'aggravation tendinite ischio (référence : Cook & Purdam, Lorimer & Hume, FFA biomécanique)
- "Côtes en marche" reste un mythe : la descente sollicite aussi l'ischio (freinage excentrique) — donc "marche" en côte ne neutralise rien
- Plat strict = unique surface compatible reprise tendinopathie proximale
- Allure EF (5:50-6:10) = sub-seuil tendineux
- Seuil douleur 2/10 = standard rééducation tendinopathie (Silbernagel)

---

## 4. WeeklyVolumes — patcher le pic 68 km ?

**Actuel** : `[26, 29, 32, 25, 29, 33, 38, 34, 38, 44, 51, 44, 51, 59, 68, 60, 68, 55, 48, 42]`
Pic à 68 km (S15+S17), cv=25 → ratio pic/cv = **2.72**.

**Référentiel** :
- Gabbett ACWR sain = 0.8–1.3 (ratio aigu/chronique semaine à semaine — OK ici, montée +10%/sem)
- Pic/cv "agressif" mais standard marathon Confirmé : pic 2.5-3× cv tolérable SANS blessure préexistante
- **Avec tendinite ischio active, 2.72 = trop**

**Proposition** : abaisser le pic à **60 km** (ratio 2.4, marge sécurité) + lisser :

```
[26, 29, 32, 25, 29, 33, 36, 33, 36, 41, 47, 41, 47, 53, 60, 54, 60, 50, 44, 39]
```

**Justification** :
- Pic 68 → 60 km (–12%) = sortie d'une zone documentée à risque (>2.5× cv + blessure)
- S20 (taper marathon) : 42 → 39 km (cohérence affûtage)
- Total cumul : 757 → 690 km (–9%), proche du minimum efficace marathon 4h
- Montée progressive conservée +10%/sem max
- Si kiné valide à S6 → on peut **rétablir** le pic original via patch live ultérieur

**Si Romane veut conserver l'agressivité** : laisser `[26, 29, 32, 25, 29, 33, 38, 34, 38, 44, 51, 44, 51, 59, 68, 60, 68, 55, 48, 42]` et durcir uniquement le welcome (signal douleur strict). Décision Romane.

---

## Justification coach (synthèse 8 lignes)

Tendinite ischio active + 3 séances vallonnées en S1 = **erreur biomécanique majeure**. Le tendon ischio sous-stress excentrique (côte montée et descente) déclenche la cascade inflammatoire → réactivation garantie à 80% en 7-10 jours. Le patch corrige 3 axes : (1) **S1 plat strict** pour ne pas casser la reprise ; (2) **welcome cohérent** avec le plan livré (fin de la contradiction "surfaces souples" vs "vallonné") ; (3) **kiné avant reprise** non négociable pour tendinopathie active. La cible 4h00 reste préservée — doctrine `feedback_jamais_baisser_allure_cible`. Le pic 68 km est abaissé à 60 km comme marge de sécurité par défaut, ajustable au retour kiné en S6. Aucune mention de cross-training ni de poids. Communication = Romane uniquement (doctrine `feedback_jamais_contact_client`).
