# F-18.1 COMPROMIS 16 km/sem — Avis Expert FFA 25 ans

## Q1 — 16 km/sem safe pour cyrielle ?

**Profil** : 35 ans, BMI 19.7 (sain), VMA 10.55 (faible adulte), base 2 km/sem (quasi-sédentaire course), freq 3.

**Audit charge** :
- 16 km / 3 séances = **5.3 km/séance moyen**
- SL plafond doctrine (≤ 2× moy hebdo) = **10.6 km théorique**, pour préparer 21.1 km on viserait SL ~10-11 km en pic — **cohérent**
- VMA 10.55 → EF 75% = 7.9 km/h → 8 km EF = **60 min** (sortie soutenable débutante)
- Saut volume : 2 → 16 km = **×8 en 20 sem** — au-dessus règle 10%/sem stricte mais ramp-up OK si S1=4-5 km et montée graduelle

**Risque tendineux** : modéré-acceptable SI (a) progression 10-15%/sem max, (b) pas de SL > 10 km avant S12, (c) chaussures adaptées. **Verdict : safe sous conditions de ramp-up**.

## Q2 — A vs B vs C

| Scénario | Pic | Risque blessure | Préparation 21 km | Verdict |
|---|---|---|---|---|
| **A. 14 km** | Cap VMA pur | Très faible | **Insuffisante** (SL max ~9 km, mur km 12+) | Sous-prép dangereuse course |
| **B. 16 km** | +14% cap | Faible-modéré | Limite acceptable (SL ~10 km, finish probable souffrance km 15+) | **Compromis optimal** |
| **C. 18 km** | +28% cap | Modéré-élevé | Meilleure (SL ~11 km) | Trop pour VMA 10.5 freq 3 — surcharge tendineuse |

**Justif médicale** : à VMA 10.5, le temps passé en course pour 18 km dépasse 2h15/sem cumulé en EF. Pour un sujet 2 km/sem actuel = **risque périostite/tendinopathie achilléenne élevé** (Nielsen 2014, charge externe vs capacité tissulaire). 16 km plafonne charge ~2h/sem — seuil tenable novice adulte.

**Verdict : B (16 km/sem) = meilleur compromis sécurité/prép.** Reste sous-optimal pour 21 km mais évite blessure.

## Q3 — Scope

**Tranche : B (modif code)** avec nuance.

Le cap VMA pur F-18.1 (`effectiveVmaCap` = 2×75min×75%×VMA) est **physiologiquement correct pour intensité soutenue**, mais en EF débutant on tolère **+15% au-dessus** car l'allure réelle est plus basse (70% VMA pratique, pas 75%). Donc :

```
floorSemiMarathonDebVmaFaible = min(plancher_Pfitzinger_25km, cap_VMA × 1.15)
```

Applicable : **Semi/Marathon Déb, VMA < 12, freq 3**. Au-dessus VMA 12 ou freq 4+, le cap VMA pur n'est plus contraignant.

Le patch live cyrielle ≠ hack ponctuel, c'est révélateur d'un cas générique sous-couvert. **Modif code recommandée**, pas juste live.

## Q4 — Wording welcomeMessage

**Correction proposée** (clarté + débutant + médicalement juste) :

> "Ton plan est calibré à 16 km/semaine maximum. Vu ta VMA actuelle (10.5 km/h) et tes 3 séances/sem, monter plus haut t'exposerait à un risque de blessure (tendons, périoste tibial) car ton corps n'a pas encore l'adaptation tissulaire pour absorber plus de charge.
>
> Pour info, un semi se prépare idéalement avec un pic de 22-25 km/sem. Avec 16 km tu peux finir tes 21 km, mais les 5-6 derniers km seront durs. Deux leviers pour mieux préparer : passer à **4 séances/sem** ou **travailler ta VMA** (séances VMA courtes) pendant les 20 semaines."

**Corrections vs version Romane** :
- "limité" → "calibré à...maximum" (positif, pas restrictif)
- "physiquement" → précisé "adaptation tissulaire" (juste médicalement)
- Ajout "tendons, périoste tibial" (concret, pas alarmiste)
- "atteignable avec freq 4" → reformulé en leviers concrets actionnables
- Reconnait honnêtement "5-6 derniers km durs" — cohérent doctrine transparence

## Tranche finale : **B**

Modif code F-18.1 → ajouter floor `cap_VMA × 1.15` pour Semi/Marathon Déb VMA<12 freq 3. Patcher cyrielle live avec nouveau welcome. Statut IRRÉALISTE conservé (2h00 reste inatteignable, 16 km ne change pas ça). Opt-in front maintenu.
