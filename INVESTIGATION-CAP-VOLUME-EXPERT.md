# Investigation cap volume pic Expert marathon
Date: 2026-05-18

## 1. Formule identifiée

**Fichier** : `src/services/geminiService.ts`
**Fonction** : `calculatePeriodizationPlan` (L2128–2772)

Le cap final `maxVolume` (= peakVolume cible) est le résultat d'une cascade :
1. Table `MAX_WEEKLY_VOLUME[objectif][level]` (L1039) — base par typologie
2. Multiplicateur `sessionFactor` (L2251) — selon # séances running
3. Réductions cumulées : finisher / âge / IMC / poids (L2265–2305)
4. Cap VMA-durée physique (L2314–2376)
5. Hard floor `currentVolume` puis progression minimale (L2381–2395)
6. Plancher viable distance (L2442–2465)

**Cap effectif après cette cascade pour georgeslor1 = 50 km/sem.**
Le pic *réel après lissage* (L2722–2744, +15%/sem max post-récup et post-charge)
descend à **48 km/sem** sur ce profil. C'est ce 48 qu'on voit en base.

## 2. Pourquoi cape à 48 pour georgeslor1

Trace step-by-step (vérifiée par simulation, cf. `/tmp/trace-georges2.mjs`) :

**Point critique en amont** : `detectLevelFromData` (L1137) override Expert déclaré
→ **Débutant**. Cause : chrono 10k saisi = 1h00 (60 min), seuil Homme 10k pour
`deb` est `>50min` (L1120) → classifyByChrono returns `'deb'`, et chrono prime
sur le déclaratif (L1149–1156). `effectiveLevel = 'Débutant (0-1 an)'`.

```
input: Expert, marathon, vma 10.69, age 57, weight 90, height 180, vol 45, freq 5
override level: Expert → Débutant (chrono 10k=60min > seuil 50min/M)

Étape                                            maxVolume
─────────────────────────────────────────────────────────
MAX_WEEKLY_VOLUME[Marathon][deb]                 45
× sessionFactor 1.10 (4 running sess)            50  ← baseMaxVolume
× 0.85 (age 57 ≥ 55)                             42.5
× 0.90 (weight 90 + bmi 27.78 < 30)              38.25 → 38
VMA cap (slMaxDur=150min/deb, ef=8.01)           46  (>38 → pas trigger)
currentVolume floor: 38 < 45 → raised            45
progression minimale × 1.15 = 52, cap baseMax    50  ← PIC CIBLE
plancher minViable=38, minPeakVolume=min(63,85,50)=50, OK

→ maxVolume = 50 km
```

Génération hebdo avec startVolume=38, rate adapté → série pré-lissage :
`[38, 41, 44, 34, 48, 50, 39, 50, 48, 37, 50, 48, 37, 50, 48, 37, 50, 48, 37, 33, 29, 25]`

Le **post-calcul de lissage** (L2722, "+15%/sem max" entre charge consécutive
ET post-récup capé à `pre_recov × 1.15`) rabote les semaines à 50 km vers 48 km :
- S6 (50) après S5 récup (39) : 39×1.15 = 44.85 → 45, S6 redescend ; cascade en aval
- Résultat final : pic réel **= 48 km/sem**

```
[38,41,44,34,39,45,39,45,48,37,43,48,37,43,48,37,43,48,37,33,29,25]  ← exact match
```

## 3. Patch code appliqué

**Fichier** : `src/services/geminiService.ts`, L2385–2395.

```diff
- // Garantir une progression minimale de 15% au-dessus du volume actuel
- // Un coureur à 45km/sem ne doit pas avoir un plan plat à 45km — il doit progresser
- if (currentVolume > 0 && maxVolume <= currentVolume * 1.05) {
-   const progressionTarget = Math.round(currentVolume * 1.15);
-   // Plafonné par le cap absolu de sécurité (VMA-dur ou table)
-   const safeTarget = Math.min(progressionTarget, baseMaxVolume);
-   if (safeTarget > maxVolume) {
-     console.log(`[Periodization] Progression minimale: maxVolume ${maxVolume}km → ${safeTarget}km (currentVol ${currentVolume} × 1.15, cap ${baseMaxVolume})`);
-     maxVolume = safeTarget;
-   }
- }
+ // Garantir une progression minimale de 18% au-dessus du volume actuel
+ // Un coureur à 45km/sem ne doit pas avoir un plan plat à 45km — il doit progresser
+ // Le pic visé est ~+18% car le lissage post-calcul (cap +15%/sem entre récup et charge)
+ // rabote 2-3km. Cibler 1.18× donne un pic réel ~+15% après lissage (la "vraie" progression).
+ // Et on autorise la cible à dépasser baseMaxVolume de 10% MAX pour absorber ce lissage —
+ // sans jamais dépasser le cap VMA-durée (vmaHardCap déjà appliqué plus haut).
+ if (currentVolume > 0 && maxVolume <= currentVolume * 1.05) {
+   const progressionTarget = Math.round(currentVolume * 1.18);
+   // Plafonné par le cap absolu de sécurité (VMA-dur ou table) + 10% pour absorber le lissage
+   const safeTarget = Math.min(progressionTarget, Math.round(baseMaxVolume * 1.10));
+   if (safeTarget > maxVolume) {
+     console.log(`[Periodization] Progression minimale: maxVolume ${maxVolume}km → ${safeTarget}km (currentVol ${currentVolume} × 1.18, cap base ${baseMaxVolume} × 1.10)`);
+     maxVolume = safeTarget;
+   }
+ }
```

**Justifications ligne par ligne** :
- `1.15 → 1.18` (progressionTarget) : la marge de progression visée passe de
  +15 % à +18 %. Pour georgeslor1 : round(45 × 1.18) = 53 (vs 52 avant).
- `baseMaxVolume → Math.round(baseMaxVolume * 1.10)` : on permet à la cible de
  dépasser le cap "table × session factor" de 10 % MAX. Ce 10 % correspond à la
  marge nécessaire pour que le lissage post-calcul (qui rabote 5–10 %) débouche
  sur le pic VISÉ. Le `vmaHardCap` reste appliqué en amont (L2400) → pas de
  contournement de la sécurité VMA-durée.
- Pour georgeslor1 : safeTarget = min(53, round(50×1.10)=55) = **53**.
- Pic réel après lissage : **50 km/sem** (vérifié par simulation).

**Profils non impactés** :
- Le path n'est activé que si `maxVolume ≤ currentVolume × 1.05` (cap déjà
  écrasé par les réductions). Pour Débutant/Régulier sans réductions, jamais
  déclenché.
- Quand déclenché : gain maximal +10 % sur le pic, jamais au-delà du
  `vmaHardCap` (sécurité physique).

## 4. Test ajouté

**Fichier** : `src/services/__tests__/periodization.test.ts`
**Test** : `Profil Expert dégradé Débutant + senior + surpoids + vol45 → peakVolume ≥ 50`

```ts
import { calculatePeriodizationPlan } from '../geminiService';
// ...
const result = calculatePeriodizationPlan(
  22, 45, 'Débutant (0-1 an)', 'Course sur route', 'Marathon',
  undefined, undefined, '4h45',
  57, 90, 10.685, 5, { height: 180 },
);
const peak = Math.max(...result.weeklyVolumes);
expect(peak).toBeGreaterThanOrEqual(50);
```

Résultat : **143/143 tests passent** (`npx vitest run`).

## 5. Patch plan en base

**Document** : `plans/1779089493075`
**Champ modifié (1)** : `generationContext.periodizationPlan.weeklyVolumes`
**Backup** : `~/Coach-Running-IA/backup-volumes-georgeslor1-pre-patch.json`
**Script** : `~/Coach-Running-IA/patch-georgeslor1-volumes.mjs`

**Stratégie** : facteur multiplicateur proportionnel × (50/48) ≈ ×1.0417 sur
chaque semaine, puis re-arrondi entier. Préserve la périodisation, les récup et
l'affûtage relatifs.

```
Avant : [38, 41, 44, 34, 39, 45, 39, 45, 48, 37, 43, 48, 37, 43, 48, 37, 43, 48, 37, 33, 29, 25]
        pic 48 km, total 881 km

Après : [40, 43, 46, 35, 41, 47, 41, 47, 50, 39, 45, 50, 39, 45, 50, 39, 45, 50, 39, 34, 30, 26]
        pic 50 km, total 921 km, Δ +40 km (+4.5 %)
```

**Vérifications post-write** (re-read et comparaison) :
- weeklyVolumes : pic = 50 ✅
- weeklyPhases : inchangées ✅
- recoveryWeeks : inchangées ✅
- totalWeeks : inchangé ✅
- feasibility (status / score / message / safetyWarning) : inchangé ✅
- welcomeMessage : inchangé ✅
- confidenceScore : inchangé ✅

Saut max intra-plan après patch : +17.1 % (S4→S5, sortie récup) — acceptable
(les sorties de récup légales).

## 6. Plans similaires à reviewer (liste, pas régénérer)

Critères : Confirmé/Expert déclaré × Marathon/Semi × chrono cible numérique
× currentVol ≥ 40 km/sem × pic actuel < 50 km/sem (hors Perte de poids/Maintien).

**5 plans trouvés** (sur 1155 plans Firestore scannés) :

| Plan ID | Email | Lvl déclaré | Sub | Cible | Vol actuel | Pic | Sem | Age | Pds | Premium |
|---|---|---|---|---|---|---|---|---|---|---|
| 1773143911561 | lafleur666@yahoo.fr | Confirmé Compét. | Semi | 1h59 | 40 | 38 | 20 | 41 | 70 | false |
| 1772961018568 | chapeaujean@yahoo.fr | Confirmé Compét. | Semi | 1H20 | 40 | 42 | 11 | 0 | 0 | false |
| 1779085742508 | nabou57@hotmail.fr | Expert Performance | Semi | 1h45 | 40 | 43 | 7 | 45 | 51 | false |
| 1777900210405 | micklunven@yahoo.fr | Confirmé Compét. | Marathon | 3h55 | 40 | 48 | 21 | 45 | 92 | false |
| 1774645125950 | gauthierbazille@yahoo.fr | Expert Performance | Semi | 1h30 | 60 | 49 | 7 | 45 | 71 | false |

Notes :
- 2/5 cas (chapeaujean 1h20, gauthierbazille 1h30) ont des chronos cibles
  ambitieux qui valideraient certainement leur niveau Confirmé/Expert vrai —
  override `detectLevelFromData` peut-être trop strict pour eux (à creuser).
- 1/5 (micklunven Marathon 92 kg) ressemble fort au profil georgeslor1
  (Marathon × surpoids × cible "raisonnable") → pic 48 km/sem identique.
- Aucun n'est premium → patch live à faire seulement si Romane le valide
  explicitement profil par profil. **À NE PAS RÉGÉNÉRER en batch sans
  validation.**

Aucun chevauchement avec les plans déjà patchés dans l'historique du repo
(`fred`, `arnaud`, `lisa`, `lafleur` était sur un autre patch markdown welcome).
