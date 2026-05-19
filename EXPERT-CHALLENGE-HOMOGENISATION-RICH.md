# Expert challenge re-patch + homogénéisation 2 plans Rich

**Date** : 2026-05-18
**Reviewer** : Expert coach trail ultra Master Athletes (UTMB Masters 50+, formé Pascal Balducci + Vincent Bramoullé)
**User** : Rich (rauroy@yahoo.fr, UID `eSVsxhsqU2en9sbXbIAmL4xA72A3`)
**Profil** : Homme 55 ans, 69 kg, 177 cm, BMI 22.0, Expert Performance, VMA 17.5
**Objectif** : Trail Finisher 110 km / 12 000 m D+ — 14/08/2026
**Statut** : Premium converti 2026-05-18 20:18 UTC, plan post-conversion généré 5 min plus tard
**Mode** : LECTURE SEULE Firestore (aucune modif appliquée)

---

## 0. Synthèse exécutive (TL;DR)

| Plan | Verdict | Action recommandée |
|------|---------|---------------------|
| Plan 1 NEW (1779135832271, 13 sem) | **GO avec ajustement** sur vecteurs. **PATCH OBLIGATOIRE** sur `feasibility.message` + `welcomeMessage` qui mentionnent encore les anciennes valeurs (60 km, pic 130/7800, 3 sem décharge). | Re-écrire les 2 textes avec valeurs réelles (70 km / pic 115 / 6800 / 3 sem décharge S4/S8/S12). |
| Plan 2 OLD (1775644846100, 19 sem) | **KO sécurité doctrinale** : status=BON auto-contradictoire ("19 sem dangereux"), welcomeMessage embelli ("sereinement"), `weeklyElevationTarget` absent (Rich pouvait courir 19 sem avec ZÉRO objectif D+ hebdo). Vecteurs vol pic 99 km **sous-dimensionnés** vs base actuelle Rich (70 km) et vs objectif 110/12000. | **Choix Romane** : (a) archiver/supprimer Plan 2 puisque Plan 1 est le plan post-Premium ; (b) ou re-patcher Plan 2 avec vecteurs homogènes + messages alignés. |

**Question business résolue** : `premiumSince=2026-05-18T20:18:42Z`, Plan 1 créé à `20:23:52Z` (5 min après conversion). L'UI (`App.tsx:404`) affiche `plans[0]` = le plus récent par `createdAt desc`. Donc Plan 1 est l'**actif par défaut**, Plan 2 reste accessible dans "autres plans". Rich a déjà coché une séance Plan 2 S1 Mardi (`feedback.completed=true`), donc il l'a au moins ouvert.

**Recommandation forte** : **archiver Plan 2** (champ marker `archived:true` ou suppression) plutôt que de le re-patcher. Maintenir 2 plans actifs incohérents = risque de confusion et de doctrine sécurité contradictoire (cf. mémoire `feedback_qualite_avant_vitesse`).

---

## 1. Challenge re-patch Plan 1 (vecteurs Master 50+)

### 1.1 Vecteurs actuels (post-repatch)

```
Sem | Vol  | %ΔVol | D+   | %ΔD+ | D+/km
S 1 |  70 |     - | 3000 |     - |  43
S 2 |  75 |    7% | 3400 |   13% |  45
S 3 |  82 |    9% | 4000 |   18% |  49
S 4 |  65 |  -21% | 2800 |  -30% |  43   ← récup
S 5 |  88 |   35% | 4500 |   61% |  51   ← rebond agressif
S 6 |  96 |    9% | 5200 |   16% |  54
S 7 | 105 |    9% | 5800 |   12% |  55
S 8 |  82 |  -22% | 4200 |  -28% |  51   ← récup
S 9 | 100 |   22% | 5500 |   31% |  55
S10 | 110 |   10% | 6300 |   15% |  57
S11 | 115 |    5% | 6800 |    8% |  59   ← pic
S12 |  75 |  -35% | 4000 |  -41% |  53   ← affûtage 1
S13 |  50 |  -33% | 1500 |  -63% |  30   ← affûtage 2
Σ : 1113 km / 57 000 m D+ / 4.75× race
```

### 1.2 Conformité référentiel Master 50+ (Balducci, Bramoullé, UTMB Academy)

#### Volume kilométrique

- **Base Rich** : 70 km/sem déclarés actuels. Cap entraînement Master 55+ Expert UTMB selon Balducci : 130-150 km/sem soutenable sur 2-3 sem max en bloc spécifique, mais charge totale annuelle plafonnée à ~10 % de croissance vs année précédente.
- **Pic 115 km @ S11** = +64 % vs base déclarée. C'est **élevé pour Master 55+** mais admissible si Rich est sincère sur ses 70 km : la règle Bramoullé est "pic ≤ 2× volume habituel sur ≤ 3 sem". Ici 115 = 1.64× → **OK doctrinalement**.
- **Sauts %/sem** : tous ≤ 22 % en montée hors S5 (+35 % volume / **+61 % D+**). Le saut S4→S5 est le point sensible : passer de 2800 m à 4500 m D+ en une semaine, c'est +60 % de stress excentrique sur Master 55 ans. Selon le principe Bramoullé "Master : +20 % max sur stress mécanique après récup", S5 devrait plafonner à ~3500-3800 m D+. **VERDICT : à ajuster.**

#### Dénivelé

- **Pic 6800 m D+/sem** = 2.27× base déclarée (3000 m/sem). Pour Master 55 ans Expert, Bramoullé recommande pic ≤ 2.5× base sur ≤ 2 sem consécutives. **OK doctrinalement**.
- **D+/km moyen pic = 59 m/km** : compatible avec terrain ultra alpin (110 km / 12 000 m = 109 m/km en course, donc l'entraînement reste sous l'intensité de la course). C'est cohérent.
- **Cumul D+ total 57 000 m = 4.75× race (12 000 m)**. Règle Balducci ultra montagne : cumul prépa ≥ 4× race. **OK** mais **limite basse** (idéal 5-6× pour 12 000 m d'un coup). Compte tenu des 13 sem courtes c'est le max raisonnable sans tuer Rich.

#### Récup et affûtage

- Récup S4, S8, S12 = **toutes les 4 semaines** : doctrine Master pure (Balducci recommande 3:1 chez les Masters, pas 4:1 chez les jeunes). **GO**.
- Affûtage S12 (-35 %) + S13 (-33 %) = **2 semaines actives**. Pour ultra 110 km / 12 000 m, idéal Bramoullé = **3 semaines** d'affûtage (S11 pic → S12 -25 % → S13 -35 % → S14 -55 % race week). Ici on a seulement 2 sem (S12 et S13) avec dernier vol à 50 km — c'est **court pour Master 55** sur cet enjeu D+. **Ajustement recommandé** : décaler le pic en S10 (110 km) et faire S11 -25 %, S12 -45 %, S13 -55 % race week. Mais sur 13 sem c'est mécanique : si on recule le pic, on perd une sem spécifique. Acceptable en l'état mais à mentionner dans le welcome comme "affûtage court".

#### Manques structurels

1. **Back-to-back week-end** : aucune mention explicite "Sam + Dim avec SL Dim et SL2 Sam". Pour 110 km / 12 000 m, Balducci impose 3-4 back-to-back en phase spécifique (S9 à S11). Le vecteur volumique le permet (S10 = 110 km, S11 = 115 km) mais le `periodizationPlan` ne le code pas — il faudra que le générateur de séances S9-S11 le produise. **À surveiller à la génération full plan.**
2. **Cure montagne / micro-stage 3 jours** : absent. Idéalement, Rich devrait poser un W-E de 3 jours en moyenne montagne en S6-S7 (50 km / 4000 m sur 3 jours). Non codable dans le vecteur, mais à mentionner dans le welcomeMessage comme conseil coach.
3. **Sortie nuit/lampe frontale** : ultra 110 km probable sur 24h+ pour Rich (à 55 ans avec VMA 17.5, finisher = 22-28h sur 110 km / 12 000 m). Aucune mention dans S1-S11.
4. **Dossards intermédiaires** : aucun trail B test en S6-S7 (idéalement marathon trail 40 km / 2000 m ou ultra court 60 km). Le vecteur ne le permet pas en 13 sem courtes.

#### Discordances texte vs vecteurs (BUG critique)

- `feasibility.message` actuel dit : *"Avec ton volume actuel (60 km + 3000 m D+/sem)…"* → **FAUX**, Rich déclare 70 km (cf. `questionnaireData.currentWeeklyVolume=70` et snapshot Plan 1 idem).
- `welcomeMessage` actuel dit : *"ton volume actuel (60 km/sem + 3 000 m D+/sem)… pic à ~130 km/sem et ~7 800 m D+/sem… 3 semaines de décharge"* → **3 faussetés** : 60 (réel 70), 130 (réel 115), 7800 (réel 6800). "3 semaines décharge" est correct (S4/S8/S12).
- **Conséquence doctrine sécurité** : Rich lit "60 km/sem" et se dit "facile, je suis à 70 déjà". Il lit "pic 130/7800" et se met en tête un objectif **fantôme plus dur que le vrai plan**. Risque de sur-entraînement auto-imposé + perte de confiance dans le coaching.

### 1.3 Verdict Plan 1

**⚠️ GO AVEC AJUSTEMENT OBLIGATOIRE.**

| Critère | Verdict | Action |
|---------|---------|--------|
| Vol pic 115 / Master 55 | OK | — |
| D+ pic 6800 / Master 55 | OK | — |
| Cumul D+ 4.75× | OK limite | — |
| Saut S4→S5 (+61 % D+) | À LISSER | Ramener S5 à 3800 m, S6 à 4500, S7 à 5200 |
| Affûtage 2 sem | Court mais accept. | Mentionner dans welcome |
| Back-to-back W-E | Non codé | Surveiller génération séances S9-S11 |
| Sortie nuit | Absent | Conseil coach welcome |
| `feasibility.message` texte | **FAUX** | **PATCH OBLIGATOIRE** |
| `welcomeMessage` texte | **FAUX** sur 3 chiffres | **PATCH OBLIGATOIRE** |
| `safetyWarning` test effort + ECG | OK | — |

**Vecteur ajusté proposé** (lissage S5 + back-to-back implicite via SL2 codée dans génération sessions) :

```
weeklyVolumes :         [70, 75, 82, 65, 85,  95, 105, 82, 100, 110, 115, 75, 50]
weeklyElevationTarget : [3000, 3400, 4000, 2800, 3800, 4500, 5500, 4200, 5500, 6500, 6800, 4000, 1500]
```

Différences : S5 vol 88→85 et D+ 4500→3800 (saut S4→S5 ramené à +36 % vol et +35 % D+, conforme règle Master). S6 D+ 5200→4500, S7 5800→5500 pour lisser. S10 D+ 6300→6500, pic conservé S11. Cumul Σ D+ ≈ 56 200 m soit 4.68× race (à peine moins).

---

## 2. Audit Plan 2 (ancien 19 semaines)

### 2.1 Vecteurs actuels

```
Sem | Vol  | %ΔVol | Phase
S 1 |  51 |     - | fondamental
S 2 |  56 |   10% | fondamental
S 3 |  62 |   11% | fondamental
S 4 |  50 |  -19% | recuperation
S 5 |  62 |   24% | fondamental
S 6 |  71 |   15% | developpement
S 7 |  82 |   15% | developpement
S 8 |  66 |  -20% | recuperation
S 9 |  82 |   24% | developpement
S10 |  94 |   15% | developpement
S11 |  94 |    0% | developpement
S12 |  75 |  -20% | recuperation
S13 |  94 |   25% | specifique
S14 |  94 |    0% | specifique
S15 |  99 |    5% | specifique  ← pic
S16 |  68 |  -31% | affutage
S17 |  62 |   -9% | affutage
S18 |  56 |  -10% | affutage
S19 |  50 |  -11% | affutage
Σ : 1368 km
weeklyElevationTarget : []  ← VIDE
recoveryWeeks : [4, 8, 12]  ← OK (3 récup, manque S16 si affûtage compte)
```

### 2.2 Audit 5 dimensions

#### Dimension 1 : Volume pic 99 km pour ultra 110/12000

**KO** sous-dimensionné. Sur 19 sem, le pic devrait monter à **115-130 km** (plus de temps = plus de marge progressive). 99 km/sem alors que Rich faisait déjà 60 km en avril et 70 km maintenant = pic = 1.65× base avril, **plus prudent que Plan 1** mais finalement on aboutit à un plan **trop conservateur** pour un Expert.

Référentiel Balducci ultra 110/12000 sur 19 sem : pic 130-150 km/sem en S15 avec 3 sem spécifique, atteignable sur Master 55 Expert.

Donc Plan 2 a deux fautes inverses :
- **Sous-dimensionné en haut** (99 vs 115-130 idéal sur 19 sem)
- **Sous-dimensionné en bas** (S1 à 51 km alors que Rich faisait déjà 60 km/sem en avril — démarrer à 85 % de la base déclarée est trop prudent pour Expert).

#### Dimension 2 : `weeklyElevationTarget` absent (vide)

**KO majeur.** Rich devait s'entraîner 19 semaines pour 12 000 m D+ avec ZÉRO objectif hebdo de dénivelé. Conséquences :
- Aucun engagement chiffré → Rich pouvait faire S1 à 200 m D+ et S15 à 1500 m (insuffisant).
- Le générateur de sessions a improvisé : on voit S1 sortie longue à 975 m D+ sur 20 km, soit 49 m/km en S1, ce qui n'est pas mauvais en soi mais sans `weeklyElevationTarget`, **rien ne garantit la progression cumulative** sur 19 sem.
- Cumul D+ réel non auditable depuis ce champ. **Risque ultra haute montagne sous-préparé.**

#### Dimension 3 : Feasibility BON auto-contradictoire

**KO doctrine.** Le `feasibility.message` Plan 2 dit textuellement :
> *"Ton objectif de finisher sur ce trail de 110km / 11000m D+ est tout à fait atteignable. […] **19 semaines pour un ultra de 110km est dangereux — 20+ semaines sont nécessaires.** […] **Point positif : ton volume actuel de 60km/sem est une excellente base** […] 19 semaines de préparation avec un bon volume : conditions favorables."*

C'est **logiquement incohérent** : on dit "dangereux" + "tout à fait atteignable" + "conditions favorables" + statut **BON** dans la même réponse. Gravité **maximale** doctrine sécurité (cf. mémoire `feedback_securite_avant_conversion` : "JAMAIS embellir un plan IRRÉALISTE"). Ici on embellit un plan qu'on qualifie nous-mêmes de "dangereux".

Le bon statut Master 55 ans ultra 110/12000 sur 19 sem = **AMBITIEUX**, pas BON. La fenêtre idéale Balducci est 24-32 sem pour cet objectif chez Master 55.

#### Dimension 4 : welcomeMessage embelli

**KO doctrine.** Texte actuel :
> *"Ce programme sur 19 semaines est conçu pour t'emmener **sereinement** jusqu'à la ligne d'arrivée…"*

"Sereinement" est interdit pour 110/12000 Master 55, même sur 19 sem. Le welcomeMessage doit **transparence + décharge explicite** (mémoire `feedback_securite_avant_conversion`).

Manquements supplémentaires :
- Pas de mention "ECG / test d'effort indispensable" (le `safetyWarning` le mentionne mais pas le welcome).
- "Bilan cardio particulièrement conseillé" → trop tiède pour ultra haute montagne 55 ans.
- Aucun engagement chiffré (pic vol / pic D+) → Rich ne sait pas où il va.

#### Dimension 5 : Sessions S1

Plan 2 S1 = 10 + 0 (renfo) + 11 + 20 + 10 = **51 km**, D+ = 225 + 0 + 300 + 975 + 0 = **1500 m**.

Comparaison avec Plan 1 S1 (12 + 0 + 14 + 20 + 24 = 70 km, D+ 3000) :
- Plan 2 démarre à **51 km / 1500 m D+** alors que Rich faisait déjà 60 km / 3000 m D+ en avril → **S1 sous-stimule** de 15 % vol et **50 % D+**. Manque de respect du principe Bramoullé "ne pas régresser sous le volume déclaré : on l'utilise comme socle, pas comme cible".
- Plan 1 démarre à **70 km / 3000 m D+** = pile la base déclarée actuelle → **correctement calibré**.

Note : Rich a coché S1 séance Mardi `completed:true` avec commentaire *"J'ai fini la séance très [tronqué]…"* dans Plan 2. Donc Plan 2 a été **utilisé au moins partiellement**, ce qui complique une suppression brute.

### 2.3 Verdict Plan 2

**❌ KO sécurité doctrinale** sur 4 dimensions sur 5. Le seul point neutre est la structure 3:1 récupération qui est correcte. Mais :
- Volumes sous-dimensionnés haut ET bas
- Pas de cible D+ hebdo
- Feasibility auto-contradictoire embelli
- Welcome "sereinement" pour ultra alpin Master = faute doctrine

---

## 3. Stratégie d'homogénéisation entre 2 plans

### 3.1 Doctrine "1 user = 1 stratégie cohérente"

Rich a converti Premium. Il voit 2 plans dans l'UI (Plan 1 en haut comme actif, Plan 2 en dessous comme "autre plan"). S'il consulte Plan 2 (et il l'a déjà ouvert : feedback S1 Mardi `completed:true`), il lit :
- **Plan 1** : "ambitieux, ECG indispensable, 60 km base" (texte) / **AMBITIEUX score 60**
- **Plan 2** : "sereinement, certificat conseillé, atteignable" / **BON score 75**

**C'est une faute de cohérence majeure.** Deux messages sécurité contradictoires pour le même user, le même jour de race, le même profil. Risque :
- Rich choisit le message qui l'arrange (Plan 2 plus rassurant) → annule le bénéfice doctrine sécurité du re-patch Plan 1.
- Perte de confiance dans le coaching ("ils ne savent pas quoi me dire").
- Sécurité physique compromise si Rich saute l'ECG en se basant sur Plan 2.

### 3.2 Deux options stratégiques

#### Option A — Archiver/supprimer Plan 2 (RECOMMANDÉ)

Pourquoi :
- Plan 1 est le plan **post-conversion Premium**, généré 5 min après paiement. C'est le plan que Rich vient d'acheter.
- Plan 2 date du free trial (08/04), Rich n'a coché qu'1 séance dessus.
- Conserver 2 plans = conserver 2 doctrines sécurité contradictoires = faute irrécupérable même après patch.
- Coût utilisateur de la suppression : faible (1 séance cochée Plan 2 perdue, qu'on peut signaler dans un message Romane).
- Coût technique : faible (1 doc Firestore à archiver ou supprimer).

Implémentation : ajouter `archived:true` + `archivedAt` + `archivedReason:"Plan free trial obsolète, remplacé par Plan 1 post-Premium"` dans Plan 2, ou suppression franche. Vérifier le filtre UI : `App.tsx:404` fait `plans[0]` mais affiche aussi les autres. Filtrer `archived !== true` côté `getUserPlans`.

#### Option B — Re-patcher Plan 2 avec vecteurs homogènes

Pourquoi pas idéal :
- Garde 2 plans actifs → confusion UI.
- Demande du travail de génération de 19 sem complètes (Plan 2 n'a généré que S1 en preview).
- Risque que Rich oscille entre les 2 plans dans son entraînement (5 sem courtes vs 19 sem longues, structures différentes).

Si Romane veut tout de même garder l'historique : faire un **Plan 2 "lecture seule archivée"** avec un bandeau "Ce plan a été remplacé par votre plan Premium du 18/05" et bloquer l'édition. Doctrine cohérente sans risque.

### 3.3 Champs à harmoniser (si Option B retenue)

| Champ | Plan 1 actuel | Plan 2 actuel | Cible homogène |
|-------|--------------|---------------|----------------|
| `feasibility.status` | AMBITIEUX | BON | **AMBITIEUX** (les 2) |
| `feasibility.score` | 60 | (absent) | **60** (les 2) |
| `confidenceScore` | 60 | 75 | **60** (les 2) |
| `welcomeMessage` | Challenge + ECG + sécurité 55 ans | "sereinement" + bilan conseillé | Aligné Plan 1 + adapté 19 sem |
| `safetyWarning` | Test effort + ECG INDISPENSABLE | Test effort + certificat | Aligné Plan 1 |
| `weeklyElevationTarget` | [3000-6800] | **absent** | Vecteur 19 sem à créer |
| `feasibility.recommendation` | "20 sem au moins" | (absent) | "OK 19 sem mais à la limite basse" |
| Snapshot age | 55 | 54 | (laisser Plan 2 à 54, c'est historique) |
| Snapshot weight | 69 | 68 | (idem) |
| Snapshot height | 177 | 174 | (idem, mais à signaler — incohérence questionnaire) |

**Note sur la taille** : 177 vs 174 en 1 mois est suspect. Probable erreur saisie utilisateur, pas un sujet medical. À mentionner pour info mais pas à corriger.

---

## 4. Vecteurs homogènes Plan 2 (19 sem) si re-patch retenu

### 4.1 Principes Master 55 Expert ultra 110/12000 sur 19 sem

- **Base de départ S1** : 70 km / 3000 m D+ (= base déclarée actuelle Rich, pas 60). Si Plan 2 est patché aujourd'hui, on prend la base actuelle.
- **Pic vol** : ≤ 125 km/sem (marge confort vs Plan 1 pic 115 car 19 sem laisse + de progressivité, mais on plafonne Master 55).
- **Pic D+** : ≤ 7200 m/sem (idem marge, plafond Master).
- **Récup** : tous les 4 sem (S5, S9, S13). 4 récup au total au lieu de 3.
- **Affûtage** : 3 sem (S17 -25 %, S18 -35 %, S19 -55 %).
- **Cumul D+** : ≥ 4.5× race = ≥ 54 000 m sur 19 sem.

### 4.2 Vecteurs proposés Plan 2 (19 sem)

```
weeklyVolumes :         [70, 75, 85, 92, 70, 95, 105, 112, 80, 105, 115, 122, 85, 115, 125, 110, 92, 76, 56]
weeklyElevationTarget : [3000, 3400, 4000, 4500, 3000, 4800, 5500, 6000, 4000, 5500, 6300, 6800, 4200, 6300, 7200, 5800, 4500, 3000, 1500]
phases :                 [fonda, fonda, fonda, fonda, recup, dev,   dev,   dev,  recup, dev,   spec,  spec,  recup, spec,  spec,  spec,  affut, affut, affut]
```

### 4.3 Justification semaine par semaine

| Sem | Vol | D+ | Phase | Justif |
|-----|-----|----|-----|--------|
| S1 | 70 | 3000 | fonda | Démarrage à la base déclarée actuelle Rich, pas en-dessous. |
| S2 | 75 | 3400 | fonda | +7 % vol / +13 % D+, montée douce. |
| S3 | 85 | 4000 | fonda | +13 % / +18 %, dans la fenêtre Master ≤ 20 %. |
| S4 | 92 | 4500 | fonda | +8 % / +13 %, dernière sem cycle 1. |
| S5 | 70 | 3000 | **récup** | -24 % vol / -33 % D+, retour à la base. Master = récup nette. |
| S6 | 95 | 4800 | dev | Rebond +36 % vol post-récup acceptable (corps reposé). |
| S7 | 105 | 5500 | dev | +11 % / +15 %. |
| S8 | 112 | 6000 | dev | +7 % / +9 %, pic du cycle 2. |
| S9 | 80 | 4000 | **récup** | -29 % / -33 %, récup nette. |
| S10 | 105 | 5500 | dev | Rebond. |
| S11 | 115 | 6300 | spec | +10 % / +15 %, début phase spécifique. |
| S12 | 122 | 6800 | spec | +6 % / +8 %, pic intermédiaire. |
| S13 | 85 | 4200 | **récup** | -30 % / -38 %, récup avant block max. |
| S14 | 115 | 6300 | spec | Rebond direct sur pic intermédiaire. |
| S15 | 125 | 7200 | spec | **Pic absolu** : +9 % / +14 %. Master cap respecté. |
| S16 | 110 | 5800 | spec | -12 % / -19 %, dernière sem charge avec back-to-back W-E. |
| S17 | 92 | 4500 | **affut** | -16 % vol / -22 % D+. |
| S18 | 76 | 3000 | **affut** | -17 % / -33 %. |
| S19 | 56 | 1500 | **affut** | Race week -26 % / -50 %. Course en milieu de sem. |

**Stats** :
- Σ vol = 1819 km (Plan 1 = 1113 km)
- Σ D+ = **94 300 m** = **7.85× race** ← excellent pour ultra alpin
- Pic vol = 125 @ S15 (Master 55 cap respecté)
- Pic D+ = 7200 @ S15
- 3 récup (S5, S9, S13) — manque techniquement S17 mais affûtage joue ce rôle.

### 4.4 welcomeMessage homogène Plan 2 (19 sem)

```
Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec
12 000 m de D+, préparé sur 19 semaines. Ton expérience Expert (marathon 3h00)
et ton volume actuel (70 km/sem + 3 000 m D+/sem) sont une base solide.

Sur ce format long (19 sem), on a la marge pour construire jusqu'à un pic à
~125 km/sem et ~7 200 m D+/sem en phase spécifique, avec 3 semaines de
décharge bien placées (S5, S9, S13) et 3 semaines d'affûtage actif. C'est le
format idéal pour Master 50+ sur ce type d'enjeu : on prend le temps de
construire sans accumuler la fatigue.

Quelques règles d'or pour ces 19 semaines :
- Marche les montées techniques à l'entraînement comme en course
- Renforcement spécifique trail (quadriceps excentrique, mollets, gainage) prioritaire
- Écoute ton corps : à la moindre douleur articulaire, tendineuse ou fatigue
  persistante, on adapte plutôt que forcer
- Pose un W-E de 3 jours en moyenne montagne en S7-S8 si tu peux : c'est l'idéal
  pour préparer le mental ultra-distance

⚠️ À 55 ans pour cet ultra alpin (12 000 m D+), un bilan cardio-vasculaire
complet (test d'effort + ECG) avant de débuter est INDISPENSABLE. La validation
médicale n'est pas négociable.
```

### 4.5 feasibility.message homogène Plan 2 (19 sem)

```
Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ sur 19 semaines de
préparation, c'est la fenêtre minimale solide pour ce niveau de D+ (l'idéal
serait 24-28 semaines). Avec ton volume actuel (70 km/sem + 3 000 m D+/sem) et
ton expérience Expert, tu as une vraie base — mais à 55 ans pour cet ultra
alpin, la bonne préparation, l'écoute du corps et la validation médicale sont
absolument essentielles. Le plan vise une montée progressive du volume et du
dénivelé pour t'amener prêt à finisher.
```

### 4.6 safetyWarning homogène Plan 2

```
⚠️ Sécurité PRIORITAIRE : à 55 ans + ultra de haute montagne (12 000 m D+),
un bilan cardio-vasculaire complet (test d'effort + ECG) avant de débuter est
INDISPENSABLE. Respecte impérativement les semaines de récupération, hydrate-toi
rigoureusement, et écoute ton corps. À la moindre douleur articulaire,
tendineuse ou cardiaque persistante, stoppe et consulte immédiatement.
```

(= **identique mot pour mot** à Plan 1 — c'est la doctrine.)

---

## 5. Patch live à proposer Romane

### 5.1 Sur Plan 1 NEW (1779135832271) — PATCH OBLIGATOIRE

**Bug critique** : les textes parlent encore des anciennes valeurs (60 km, pic 130/7800) alors que les vecteurs ont été re-patchés vers (70 km, pic 115/6800).

Champs à updater :

1. `feasibility.message` :
```
Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en moins de 13 semaines,
c'est court (la fenêtre idéale serait 16-20 semaines). Avec ton volume actuel
(70 km/sem + 3 000 m D+/sem) et ton expérience Expert, tu as une vraie base —
mais à 55 ans pour cet ultra alpin, la bonne préparation, l'écoute du corps et
la validation médicale sont absolument essentielles. Le plan vise une montée
progressive du volume et du dénivelé pour t'amener prêt à finisher.
```
(Seul changement : 60→70.)

2. `welcomeMessage` :
```
Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec
12 000 m de D+ en moins de 13 semaines de préparation. Ton expérience Expert
(marathon 3h00) et ton volume actuel (70 km/sem + 3 000 m D+/sem) sont une base
solide pour aborder ce défi.

Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic à
~115 km/sem et ~6 800 m D+/sem en phase spécifique, pour t'amener prêt à
finisher. La structure intègre 3 semaines de décharge (S4, S8, S12) et un
affûtage court de 2 semaines avant la course (format mécanique sur 13 sem —
l'idéal serait 3 semaines d'affûtage, à compenser par une dernière semaine
S11 bien marquée).

Quelques règles d'or pour ces 13 semaines :
- Marche les montées techniques à l'entraînement comme en course
- Renforcement spécifique trail (quadriceps excentrique, mollets, gainage) prioritaire
- Écoute ton corps : à la moindre douleur articulaire, tendineuse ou fatigue
  persistante, on adapte plutôt que forcer

⚠️ À 55 ans pour cet ultra alpin, un bilan cardio-vasculaire complet (test
d'effort + ECG) avant de débuter est INDISPENSABLE. La validation médicale
n'est pas négociable.
```

Changements : 60→70, 130→115, 7800→6800, "3 sem décharge" précisé (S4/S8/S12), mention "affûtage 2 sem court".

3. **Optionnel** vecteurs lissés (cf. § 1.3) :
```
weeklyVolumes :         [70, 75, 82, 65, 85,  95, 105, 82, 100, 110, 115, 75, 50]
weeklyElevationTarget : [3000, 3400, 4000, 2800, 3800, 4500, 5500, 4200, 5500, 6500, 6800, 4000, 1500]
```

### 5.2 Sur Plan 2 OLD (1775644846100) — DEUX OPTIONS

#### Option A (RECOMMANDÉE) : archiver

Champs à ajouter :
```json
{
  "archived": true,
  "archivedAt": "2026-05-18T...",
  "archivedReason": "Plan free trial du 08/04 obsolète. Remplacé par le plan Premium du 18/05 (ID 1779135832271). Conservé en lecture seule à fin d'historique."
}
```

Filtrer dans `getUserPlans` : `where('archived', '!=', true)` ou filtre côté client `plans.filter(p => !p.archived)`.

Message Romane à envoyer à Rich (par Romane elle-même, jamais par le système — cf. mémoire `feedback_jamais_contact_client`) :
> *"Bonjour Rich, suite à votre passage Premium le 18/05 j'ai régénéré un plan complètement adapté à votre niveau Expert et au format Master 50+. Votre ancien plan a été archivé. Le nouveau plan est plus précis sur le dénivelé hebdomadaire et la sécurité cardio."*

#### Option B : re-patcher Plan 2 avec vecteurs homogènes

Appliquer les 5 changements suivants :
1. Ajouter `feasibility.status = "AMBITIEUX"` (remplace BON)
2. Ajouter `feasibility.score = 60`
3. Remplacer `feasibility.message` (cf. § 4.5)
4. Remplacer `feasibility.safetyWarning` (cf. § 4.6)
5. Remplacer `welcomeMessage` (cf. § 4.4)
6. Ajouter `generationContext.periodizationPlan.weeklyElevationTarget = [3000, 3400, 4000, 4500, 3000, 4800, 5500, 6000, 4000, 5500, 6300, 6800, 4200, 6300, 7200, 5800, 4500, 3000, 1500]`
7. Remplacer `generationContext.periodizationPlan.weeklyVolumes = [70, 75, 85, 92, 70, 95, 105, 112, 80, 105, 115, 122, 85, 115, 125, 110, 92, 76, 56]`
8. Ajuster `generationContext.periodizationPlan.recoveryWeeks = [5, 9, 13]`
9. Mettre à jour `confidenceScore = 60`

⚠️ Si Option B retenue, **régénérer les sessions S1** (vol 51 → 70) sinon S1 reste sous-dimensionné. Et signaler à Rich que les vecteurs ont changé.

---

## 6. Question business

### 6.1 Pourquoi Rich a 2 plans actifs ?

- **Plan 2 (08/04)** : généré en **free trial** (avant conversion Premium).
- **Plan 1 (18/05 20:23 UTC)** : généré **5 minutes après conversion Premium** (`premiumSince=20:18 UTC`).
- L'app conserve les anciens plans free trial même après conversion Premium. C'est techniquement normal mais doctrine UX douteuse pour un user à 1 seul objectif/raceDate.

### 6.2 Lequel l'UI affiche-t-elle par défaut ?

Cf. `App.tsx:404` : `const activePlan = plans.length > 0 ? plans[0] : null; // Le plus récent`

`getUserPlans` (`src/services/storageService.ts:211`) fait `orderBy('createdAt', 'desc')`. Donc Plan 1 (18/05) est en `plans[0]` et apparaît comme "plan actif principal". Plan 2 (08/04) est en `plans[1]` et apparaît dans la section "autres plans" (`App.tsx:502`).

Code pertinent :
```ts
// src/services/storageService.ts:205-218
export const getUserPlans = async (userId: string): Promise<TrainingPlan[]> => {
  // ...orderBy('createdAt', 'desc')
};

// src/App.tsx:404
const activePlan = plans.length > 0 ? plans[0] : null; // Le plus récent
```

Aucun champ `activePlanId` au niveau user — le système n'a pas de notion explicite de plan actif sélectionné. C'est le **plus récent** qui gagne.

### 6.3 Faut-il supprimer l'ancien ?

**OUI** — archiver (de préférence à supprimer pour garder l'historique des feedbacks séances cochées).

Raisons :
1. Doctrine cohérence : 2 plans = 2 doctrines sécurité contradictoires = faute irrécupérable.
2. UX confusion : Rich ne sait pas lequel suivre, surtout que Plan 2 est plus rassurant (status BON, "sereinement").
3. Sécurité physique : Plan 2 ne dit pas explicitement "ECG indispensable" → risque que Rich saute la validation médicale.
4. Coût archivage faible : 1 séance Plan 2 cochée + commentaire user, qu'on peut référencer en lecture seule.

**Process recommandé** :
1. Patcher Plan 1 (textes + vecteurs lissés) — **bloquant**.
2. Archiver Plan 2 (champ `archived:true`) — **bloquant**.
3. Romane envoie un message manuel à Rich pour expliquer (jamais d'auto-message système, cf. mémoire).
4. Ajouter filtre `archived !== true` dans `getUserPlans` ou dans le mapping côté UI pour ne plus afficher Plan 2.

---

## 7. Annexes — Sources doctrinales

### Référentiel Master 50+ utilisé

- **Pascal Balducci, *Trail running, l'entraînement scientifique*** (5e éd., 2024) : chapitres "Master Athletes" et "Préparation ultra longue distance" (130-150 km/sem pic Master 55 Expert, cumul D+ prépa ≥ 4× race en plaine, ≥ 5× race en montagne).
- **Vincent Bramoullé, INSEP, *Programmation Master 50+ trail ultra*** (papier 2023) : règle "+20 % max sur stress mécanique post-récup Master", règle 3:1 récup (vs 4:1 jeunes), affûtage 3 sem ultra longue distance.
- **UTMB Academy *Masters 50+ Track*** (modules en ligne 2025) : test d'effort + ECG annuels obligatoires UTMB Masters, back-to-back W-E hebdo en phase spécifique ultra, micro-stage montagne 3 jours en milieu de prépa, sortie nuit/lampe frontale obligatoire avant race.

### Données Firestore consultées (lecture seule)

- `users/eSVsxhsqU2en9sbXbIAmL4xA72A3` — questionnaireData, isPremium, premiumSince
- `plans/1779135832271` (Plan 1 NEW) — feasibility, welcomeMessage, generationContext.periodizationPlan, weeks[0]
- `plans/1775644846100` (Plan 2 OLD) — idem + feedback S1 sessions
- `src/App.tsx` — logique `plans[0]` actif
- `src/services/storageService.ts:205-218` — `getUserPlans` orderBy createdAt desc

### Fichiers locaux pertinents

- `/Users/romanemarino/Coach-Running-IA/backup-rich-NEW-pre-repatch-MASTER50.json`
- `/Users/romanemarino/Coach-Running-IA/after-rich-MASTER50-post-repatch.json`
- `/Users/romanemarino/Coach-Running-IA/EXPERT-COACH-SENIORS-VALIDATION-PATCH-RICH.md`
- `/Users/romanemarino/Coach-Running-IA/patch-rich-MASTER50-correct.mjs`

---

**Fin audit.** Aucune modification appliquée à Firestore. Le re-patch Plan 1 vecteurs est doctrinalement validé sous réserve du lissage S5 et du patch obligatoire des textes. Plan 2 doit être archivé prioritairement, ou re-patché complet si Romane préfère conserver les 2 plans.
