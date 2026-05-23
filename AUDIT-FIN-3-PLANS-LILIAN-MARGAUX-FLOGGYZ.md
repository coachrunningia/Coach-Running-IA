# Audit fin 3 plans post-patches
Date : 2026-05-20

Plans audités (post-patch live ce soir) :
- Lilian (Plan 2 — 10K Finisher Débutant 20 sem, id `1779296358366`)
- Margaux (Plan 4 — Semi 2h20 Inter 19 sem, id `1779291819180`)
- floggyz (Plan 5 — 10K Finisher Expert 30 sem, id `1779291643754`)

Source données : Firestore re-fetch via service-account (`_3plans-{name}-full.json`, `_3plans-{name}-user.json`), backups pre-patch (`backup-{name}-*.json`), code de référence (`/Users/romanemarino/Coach-Running-IA/src/services/geminiService.ts`).

Note méthodologique : `isPreview=true` et `fullPlanGenerated=false` sur les 3 plans. **Seule W1 est matérialisée** ; W2-Sn ne seront générées que sur conversion premium via `generateRemainingWeeks` (geminiService.ts L4605). Les questions sur les blocs AS21 / variété phase spécifique sont donc partiellement non vérifiables aujourd'hui car ces semaines n'existent pas encore en Firestore.

---

## Lilian (Plan 2) — 10K Finisher Débutant 20 sem

### Profil
- `currentWeeklyVolume` = **0** km/sem (vérifié dans `questionnaireSnapshot` ET dans `users/{uid}.questionnaireData`)
- Niveau : Débutant (0-1 an), Homme 18 ans, 88 kg / 183 cm → BMI = **26.3** (normal+)
- VMA : 11 (estimation niveau Débutant, aucun chrono validé)
- Frequence : 3 → 2 course + 1 renfo (doctrine OK)
- targetTime = Finisher, raceDate = 2026-10-04 (4.5 mois)
- Blessure : ampoule récurrente (cutané, pas structurel)

### Q1 — currentWeeklyVolume = 0 ou 15 ?
**Verdict : Romane a raison.** `questionnaireData.currentWeeklyVolume = 0` (entier, dans le doc user et dans le snapshot du plan). Le post-patch a baissé la S1 de 18 → 13 km mais reste **+13 km depuis 0** = un saut considérable pour un coureur déclaré "0 km/sem", surtout 88 kg.

### Q2 — S1 actuelle (post-patch)
3 séances (1 SL Mardi + 1 Renfo Jeudi + 1 SL Dimanche) :
- S1.1 Mardi "Footing technique et progressif" : type=Sortie Longue, distance="6.6 km", duration="1h00", targetPace="9:05", mainSet = `8 reps de 1 min course à 8:08 + 2 min marche active`.
- S1.2 Jeudi : Renfo 30 min.
- S1.3 Dimanche "Sortie Longue - Endurance Fondamentale" : distance="6.6 km", duration="1h00", targetPace="9:05", mainSet = `10 reps de 1 min course à 8:08 + 2 min marche active`.

**Incohérence critique** : mainSet décrit du marche-course (8×(1+2)=24 min, 10×(1+2)=30 min de travail) MAIS l'en-tête de séance affiche `distance="6.6 km"` et `duration="1h00"`. À 8:08 min/km pure course, 6.6 km = 53 min de course + warmup/cooldown ≈ 1h08. Le total marche-course (avec marche à 6 km/h) donnerait ~3.5-4 km en 1h00, pas 6.6 km. **Le champ `distance` est calculé sur l'allure cible affichée (9:05) sans prendre en compte la part de marche → distance gonflée**. Romane lit "6.6 km en 1h00" et le coureur le verra aussi.

L'affichage UI est donc trompeur : la séance est techniquement OK en charge réelle (marche-course progressive) mais l'utilisateur voit un objectif "6.6 km" qui n'est pas atteignable en course continue à son niveau.

### Q3 — welcomeMessage post-patch
> "Tu nous as indiqué 0 km/semaine actuels. On calibre ta première semaine à **13 km** — c'est un peu plus que ton volume actuel mais reste progressif pour atteindre ton objectif."

OK, "13 km" est bien le chiffre post-patch. Mais 0 → 13 km cumulé = ~+infini%, "progressif" est un euphémisme dangereux.

### Q4 — Volumes S2-S18 actuels
`weeklyVolumes = [13, 16, 17, 14, 16, 17, 14, 16, 17, 14, 16, 17, 14, 16, 17, 14, 16, 17, 14, 9]`. Pic = **17 km/sem (S3,S6,S9,S12,S15,S18)**. Progression réelle S1→pic = **+4 km en 14 semaines hors récup = ridicule**. C'est un plateau, pas une progression. **Romane a raison.**

### Q5 — 25 km/sem suffit-il pour 10K Débutant ?
Le pic réel du plan = **17 km, pas 25**. Référentiel Pfitzinger/Daniels pour 10K Débutant : 25-35 km/sem peak. **17 km/sem en pic pour préparer un 10K sur 20 semaines est sous-dosé**. Romane a raison ; le plan ne progresse pas.

### Cause racine (code)
1. **`currentVolume = 0` neutralise la progression** : dans `geminiService.ts` L2587 `if (currentVolume > 0 && maxVolume <= currentVolume * 1.05)` → branche skip. Pas de plancher de progression appliqué.
2. **VMA-duration cap dominant** : VMA=11, freq=3, runningSess=2, slMaxDur(10K deb)=60 min, factor=0.70 → vmaBasedMaxVolume ≈ 10 km. Comme `currentVolume=0`, pas de rescue → maxVolume cappé à 10 km.
3. Le hard floor `minPeakVolume` pour 10K **n'existe pas** (cf. L2678-2685, seuls Semi et Marathon ont un hard floor). Donc `maxVolume = min(15, 65, 10) = 10`. Puis `if (maxVolume < minPeakVolume)` → 10 ≥ 10, pas de remontée.
4. Le hard floor Débutant 10K Finisher **manque dans le code** → le pic est étranglé par le cap VMA-durée + le réducteur Finisher 0.75 + le réducteur poids 0.90. **C'est le même bug que celui qui a frappé Margaux/Bertrand côté Semi**, mais pour 10K Débutant Finisher il n'a jamais été patché.

### Patch code proposé
Dans `geminiService.ts` ~L2685, ajouter analogue Semi/Marathon :
```ts
if (objectiveKey === '10K' && minPeakVolume < 22) {
  console.log(`[Periodization] 10K pic hard floor: ${minPeakVolume} → 22 km (anti-bug Lilian)`);
  minPeakVolume = 22;
}
if (objectiveKey === '5K' && minPeakVolume < 15) {
  minPeakVolume = 15;
}
```
+ Optionnel : forcer un plancher d'effort minimum quand `currentVolume === 0` (idem progression minimale) pour éviter le `else` qui ne donne aucun signal de progression :
```ts
} else {
  // Pas de cv déclaré : viser ≥ 1.5× startVolume au pic
  startVolume = Math.min(startVolume, maxVolume * 0.65);
  // (laisser le reste tel quel, le hard floor minPeakVolume ci-dessus prend le relais)
}
```

### Patch live restant
- weeklyVolumes : pic 17 → 22-25 km (progression douce ~+5 % / sem hors récup). Proposition : `[13,14,15,12,15,17,14,17,19,15,18,21,17,20,22,18,20,22,18,12]` (pic 22 S15, hard floor 10K Débutant).
- W1 sessions : **clarifier `distance` et `duration`** pour aligner avec la charge réelle marche-course. Soit baisser `distance` à `~3.5 km` (réel marche-course), soit raccourcir `duration` à `40 min`, soit changer le `type` en "Marche/Course" pour que l'UI n'affiche pas une distance trompeuse.

---

## Margaux (Plan 4) — Semi 2h20 Inter 19 sem

### Profil
- `currentWeeklyVolume` = **17** km/sem (déclaré)
- Niveau : Intermédiaire (Régulier), Femme 32 ans, 82 kg / 167 cm → BMI = **29.4** (surpoids, en-dessous du seuil obésité 30)
- VMA : 10.93 (recalculée depuis 10 km en 1h01)
- targetTime = 2h20 (allureSpecifiqueSemi = 6:38 min/km)
- Frequence : 3, raceDate = 2026-10-04

### Q1 — Pourquoi pic = 25 km ?
**Décomposition réelle (post-patch)** :

Pre-patch (backup-margaux-1779310904877.json) : pic réel = **18 km** (`weeklyVolumes max = 18`). Post-patch live : pic forcé à **25 km** via `patch-margaux-semi-live.mjs`. Le "25 km max" actuel n'est pas une sortie du code, c'est une intervention manuelle Romane.

**Mais pourquoi le code produit 18 km nativement ?** Trace du calcul (geminiService.ts) :
1. `baseMaxVolume` Semi Inter = **55** (L2391 `else if (isSemi) maxVolume = 55`)
2. Session factor freq=3 (2 running) → ×0.85 = **47**
3. Pas de Finisher (chrono précis), pas de Sénior, BMI 29.4 < 30 → **0 réducteur appliqué**. Weight=82 < 85 → pas de penalty poids non plus. maxVolume reste à **47**.
4. **VMA-duration cap (DOMINANT)** : vma=10.93, efSpeed=10.93×0.75=8.20 km/h, slMaxDur Semi Inter=105 min, nonSlMaxDur=79 min, realisticFactor Semi=0.85, runningSess=2, volumeCapSessions=3 (Semi freq≤3 → relèvement P0c) :
   - slMaxKm = 105×0.85/60 × 8.20 = **12.2 km**
   - otherMaxKm = 2×79×0.85/60 × 8.20 = **18.4 km** (2 séances supplémentaires théoriques)
   - vmaBasedMaxVolume = round(30.6) = **31 km**
   - 31 < 47 → maxVolume = 31. currentVolume=17, `safeVmaCap = max(31, min(17, achievable@85% ≈ 35)) = 31`. maxVolume **= 31**.
5. `minPeakVolume = min(32, 70, 31) = 31`. Semi hard floor 22 → reste 31.
6. **MAIS** le calcul de `startVolume` (L2834-2865) + lissage progression rate ~8% sur 12 semaines effectives part de 17 km : 17 × 1.08^11 ≈ 39 km théorique → mais cappé à 31. Le `post-calcul smoothing` (L2962-2998) lisse les sauts post-récup et plafonne `+15% post-récup` ce qui peut faire stagner le pic. Le résultat observé pre-patch = **pic 18** (≪ 31 théorique).

**Le bug** : entre `maxVolume=31` et le `pic réel=18`, **il y a un écart de 13 km que ni le code ni le commentaire L2671-2685 (hard floor 22) n'explique entièrement**. L'hypothèse principale = le `post-calcul smoothing` (`weeklyVolumes[i + 1] = Math.round(curr * 1.15)` post-récup, L2982) borne brutalement la croissance après chaque récup, et avec récup tous les 3 weeks (S4,7,10,13,16) le pic n'a pas la place mathématique de remonter à 31 → il stagne à ~18 km.

**Verdict Q1** : ✅ Romane a raison sur le constat. Le cap réel "25" est manuel ; le cap système est 31 km mais le smoothing post-récup le sabote à 18 km pré-patch. **Le code a 2 bugs cumulés** :
- (a) VMA-duration cap trop agressif pour Semi Inter freq=3 (31 km est court vs Pfitzinger 36-45 km pour Inter Semi)
- (b) Post-récup smoothing `× 1.15` empêche d'atteindre le cap calculé (écart 13 km perdu).

### Q2 — Plan affiche-t-il EF + Développement sans bloc AS21 ?
**Non vérifiable aujourd'hui** : `fullPlanGenerated=false`, seule W1 (`phase=fondamental`) est dans Firestore. Les semaines specifique (S12, S14, S15, S17) seront générées plus tard via `generateRemainingWeeks` (L4605). 

Inspection du prompt LLM pour ces phases (L3998-4000, L4894) : `- specifique : + Seuil long, allure spécifique course, fractionné seuil.` → l'instruction de **mentionner AS21 en specifique est bien dans le prompt**. Donc en théorie le LLM devrait inclure AS21 dans S12-S17. Mais ce n'est qu'une instruction, pas un guard post-process → si le LLM dérape (comme historiquement chez d'autres plans), aucun filet ne le force.

**Verdict Q2** : ⚠️ partiel. L'instruction est là, on ne peut pas vérifier en preview. **À recontrôler quand Margaux passera premium et que generateRemainingWeeks tournera**.

### Q3 — Si non, pourquoi ? Prompt LLM mentionne-t-il AS21 ?
Cf. Q2 : oui le prompt mentionne `allure spécifique course` en phase specifique (L3999, L4894). Pas de bloc spécifique "tu DOIS faire X km à AS21 en S14" — c'est plus narratif que prescriptif. Risque : LLM peut se contenter d'un seuil et oublier AS21.

### Q4 — IMC Margaux + réducteur appliqué
- BMI réel : 82 / (1.67²) = **29.4**
- Code (L2440-2451) : `if (bmi >= 30)` → ×0.80. BMI=29.4 **< 30** → **0 réducteur IMC appliqué**.
- `else if (weight > 85 && bmi < 30)` → weight=82 **< 85** → **0 réducteur poids non plus**.
- Conclusion : **Romane se trompe sur "à cause de l'IMC"**. Margaux est juste en-dessous des seuils, aucune réduction IMC/poids ne lui est appliquée. La restriction vient à 100 % du VMA-duration cap + du post-récup smoothing.

### Cause racine (code)
Idem Lilian/Bertrand : le VMA-duration cap (L2552-2571) ne sait pas que Margaux a un objectif Semi qui demande structurellement plus de volume. Le hard floor Semi 22 (L2678-2681) ne suffit pas — il ne corrige que le cas `minPeakVolume < 22`. Pour Margaux on a `minPeakVolume = 31` (>22), donc le hard floor ne s'applique pas, et le post-récup smoothing étrangle ensuite la progression.

### Patch code proposé
Deux pistes complémentaires :
1. **Relever le plancher Semi Inter** (au lieu de 22 km, viser 32 km min en pic) — analogue au correctif Marathon à 32 :
```ts
// L2678
if (objectiveKey === 'Semi' && minPeakVolume < 32 && level !== 'Débutant (0-1 an)') {
  minPeakVolume = 32; // était 22 — trop bas pour Inter/Conf/Expert visant un chrono
}
```
2. **Relever le `realisticFactor` Semi de 0.85 → 0.90** (L2528) : la durée tenable des séances course en Semi est sous-estimée vs Pfitzinger (qui valide 1h30 SL Inter sans souci).
3. **Smoothing post-récup** (L2974-2982) : autoriser `+18%` au lieu de `+15%` post-récup quand `phases[i+1] === 'developpement' || 'specifique'`. Le `+15%` est juste pour Débutant mais pénalise les Inter qui doivent progresser plus vite après récup.

### Patch live restant (Margaux)
- Aucun patch volume supplémentaire (25 km est un compromis Coach prudent, < cap système 31 mais ≥ hard floor 22 et acceptable Pfitzinger pour Inter Semi cv=17). 
- À vérifier post-conversion : que la phase specifique (S12-S17) injecte bien des séances AS21 6:38 — sinon patcher S14/S15/S17 manuellement.

---

## floggyz (Plan 5) — 10K Finisher Expert 30 sem

### Profil
- `currentWeeklyVolume` = **36** km/sem (déclaré)
- Niveau : Expert (Performance), Homme 32 ans, 81 kg / 181 cm → BMI = 24.7 (normal)
- VMA : 17.5 (estimation Expert, **aucun chrono validé**)
- Frequence : 5, raceDate = 2027-04-17 (11 mois !)
- targetTime = Finisher

### Q1 — S1 actuelle : nombre de séances et allures
S1 = **5 séances** (4 course + 1 renfo) :

| Jour | Type | Titre | Distance | Duration | targetPace |
|------|------|-------|----------|----------|------------|
| Lundi | Jogging | Footing + lignes droites | 9.1 km | 47 min | **5:07** |
| Mardi | Jogging | Footing progressif (négative split) | 6.9 km | 35 min | **5:07** |
| Mercredi | Renforcement | Renfo Focus A | - | 40-45 min | - |
| Jeudi | Jogging | Footing vallonné | 8.0 km | 41 min | **5:07** |
| Samedi | Sortie Longue | SL fondamentale | 12.0 km | 62 min | **5:07** |

**Total course = 36 km, 4 séances toutes à 5:07 (efPace) — confirmé.** ✅ Romane a raison.

### Q2 — Bug critique de variation ?
Oui. Les 4 footings sont tous calibrés au même `targetPace 5:07 = efPace 67% VMA`. Pour un Expert VMA 17.5, **aucune séance VMA (pace 3:26), seuil (3:56), ni allure spé 10K (3:49)**. Daniels Q1+Q2 prescrit pour un Expert : minimum 1 séance qualité/semaine dès le début de la prépa. **Ici S1 = 0 % qualité, 100 % EF**.

L'argument biomécanique de Romane (syndrome essuie-glace, perte d'élasticité) est valide pour un Expert habitué à varier les intensités et qui se retrouve à 5×/sem à la même allure.

### Q3 — Pourquoi la S1 Expert n'a pas de variété ?
**Cause racine (code) — DEUX verrous cumulés** :

1. **Verrou 1 — `periodizationPlan.weeklyPhases`** pour floggyz : `["fondamental","fondamental","fondamental","recuperation","fondamental","fondamental","fondamental","recuperation","fondamental","developpement",...]` → **9 premières semaines = fondamental**.
2. **Verrou 2 — Post-process safety net (geminiService.ts L673-691)** :
```ts
if (phase === 'fondamental' || phase === 'recuperation') {
  // ... isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === 'Fractionné';
  if (isSeuil && pacesObj) {
    // convert to footing EF
  }
}
```
→ **Toute séance VMA/seuil/fractionné en phase fondamentale est forcée à EF par le post-process**. Même si le LLM essayait d'en générer une, elle serait convertie.

3. **Verrou 3 — Prompt LLM** (L3985-3989) : `NIVEAU CONFIRMÉ+ / 4+ SÉANCES : à partir de la SEMAINE 3 du fondamental, 1 séance par semaine DOIT inclure du travail de vitesse léger`. Donc **S1-S2 = 100 % EF imposé par le prompt** ; intensité légère autorisée seulement à partir de S3.

**Le bug systémique** : la phase "fondamental" est traitée pareil pour un Débutant 0 km/sem et un Expert 36 km/sem. **Le périodisation algorithm sur-applique "fondamental" pour les plans longs** (9 semaines de fondamental sur 30 = trop pour un Expert).

### Q4 — Référentiel coach 10K Expert
- Daniels Running Formula : système Q1+Q2 dès la S1, minimum 1 VMA + 1 seuil/semaine pour Expert.
- Pfitzinger 10K Advanced : VO2max intervals dès S2, threshold runs dès S1.
- **Verdict** : ✅ Romane a raison. Un plan 30 semaines de prépa 10K pour Expert qui démarre par 9 semaines pures EF est aberrant. La désadaptation neuromusculaire commence dès 2-3 semaines sans intensité.

### Patch code proposé
1. **Réduire la part fondamental pour Expert plans longs** (L2693-2750 distribution phases). Cap fondamental à 35 % du plan pour Expert (vs ~30 % actuellement appliqué de façon uniforme). 30 sem × 0.35 = 10.5, mais surtout : commencer la phase developpement dès la S4 pour un Expert avec cv > 30 km.
2. **Relâcher le safety net L675 pour Expert** :
```ts
if (phase === 'fondamental' || phase === 'recuperation') {
  // EXCEPTION Expert : autoriser 1 séance qualité courte par semaine dès S2
  const isExpertEarly = level === 'Expert (Performance)' && phase === 'fondamental' && weekNumber >= 2;
  if (!isExpertEarly) {
    // ... convert isSeuil to EF
  }
}
```
3. **Prompt LLM L3985** : abaisser le seuil "à partir de la SEMAINE 3" → "à partir de la SEMAINE 2" pour Expert. Et autoriser strides + 6×30s VMA dès S1 (≠ vraie séance VMA, juste rappel neuromusculaire).
4. **Variation EF Footing** : le code injecte déjà des `footingVariants` (footingVariants.ts) mais ils sont **purement décoratifs** (même allure EF, juste thème différent : "vallonné", "progressif", "lignes droites"). Ajouter une variante "Footing avec accélérations courtes" (6×20s vite-modéré) qui change la pace cible 30s/km plus rapide sur les accélérations.

### Patch live restant (floggyz)
- W1 S1.1 "Footing + lignes droites" : ajouter dans mainSet `puis 6×80m en accélération progressive (montée fréquence)` avec `targetPace` resté à 5:07 mais une mention "accélérations à allure ressentie ~3:40-3:50" pour ne pas désadapter. **Déjà présent en partie** (4-6 lignes droites mentionnées en mainSet, mais sans pace cible explicite).
- W1 S1.4 "Footing vallonné" : remplacer par **Footing avec 6×30s ressenti 10K** dès S1 (intensité Modéré, targetPace 5:07 mais inserts à 3:49-3:56). Cohérent avec le prompt L3985-3989 ; juste anticipé d'1 semaine.
- Bonus : `welcomeMessage` actuel ne prévient pas le coureur Expert qu'il a 9 semaines de fondamental pur. Sa frustration probable. Ajouter "Les 8 premières semaines posent une base aérobie large avant d'introduire VMA/seuil dès la S9-S10. Variation de séances dans les footings (vallonné, progressif, lignes droites) pour préserver la qualité de foulée."

---

## Synthèse bugs systémiques identifiés

### Bug A — Hard floor `minPeakVolume` manquant pour 10K et 5K
- Code : `geminiService.ts` L2678-2685 — uniquement Semi (22) et Marathon (32) ont un hard floor.
- Impact : Lilian (10K Débutant Finisher cv=0) pic à 17 km, sous Pfitzinger.
- Sévérité : ⚠️ Modérée pour 10K Finisher (le plan est terminable même à 17 km), grave si appliqué à 10K avec chrono.

### Bug B — VMA-duration cap trop agressif pour Semi Inter freq=3
- Code : L2528 `realisticFactor=0.85` pour Semi/Marathon.
- Impact : Margaux Inter VMA 10.9 cv=17 → cap natif 31 km (vs 36-45 km Pfitzinger).
- Sévérité : ⚠️ Modérée. Hard floor Semi 22 limite la casse, mais reste sous-dosé pour Inter+.

### Bug C — Post-récup smoothing `× 1.15` étrangle progression Inter+
- Code : L2974-2982 `weeklyVolumes[i+1] = maxPostRecov = min(preRecov, curr × 1.15)`.
- Impact : Margaux pre-patch pic 18 km (système autorisait 31) — 13 km perdus en lissage.
- Sévérité : 🔴 Sévère. Bug le plus visible côté coach.

### Bug D — `currentVolume = 0` ne déclenche aucun mode "vrai débutant"
- Code : L2587 `if (currentVolume > 0)` skip → pas de plancher progression.
- Impact : Lilian (cv=0) — pic 17 km, S1 affichant `6.6 km` alors que mainSet = 30 min de marche-course (24 min de course réelle).
- Sévérité : 🔴 Sévère. Affichage trompeur côté user.

### Bug E — Phase "fondamental" trop longue + post-process anti-intensité trop strict pour Expert
- Code : L673-691 safety net + L3985 prompt LLM `à partir de S3`.
- Impact : floggyz Expert 30 sem → 9 semaines pures EF, 100 % à 5:07 sur 4 footings/sem.
- Sévérité : 🔴 Sévère pour Expert+. Modérée pour Inter, OK pour Débutant.

### Bug F — Mismatch UI `distance` vs `mainSet` marche-course
- Code : enforceWeekConstraints calcule `distance` sur `targetPace` pure course, ignorant la part marche du mainSet.
- Impact : Lilian S1 affiche `6.6 km en 1h00` mais le mainSet décrit 24-30 min de course alternée → distance réelle ~3.5-4 km.
- Sévérité : 🟡 Mineure techniquement, 🔴 Sévère côté trust user.

---

## Patches code proposés (récap)

### P0 — Hard floor 10K (bloque Lilian-like)
`geminiService.ts` L2685, ajouter :
```ts
if (objectiveKey === '10K' && minPeakVolume < 22) {
  minPeakVolume = 22; // anti-bug Lilian Débutant Finisher cv=0
}
if (objectiveKey === '5K' && minPeakVolume < 15) {
  minPeakVolume = 15;
}
```

### P1 — Hard floor Semi Inter+ (bloque Margaux-like)
`geminiService.ts` L2678, durcir :
```ts
if (objectiveKey === 'Semi') {
  const minSemi = (level === 'Débutant (0-1 an)') ? 22 : 32;
  if (minPeakVolume < minSemi) minPeakVolume = minSemi;
}
```

### P2 — Post-récup smoothing : 15 % → 18 % pour Inter+ developpement/specifique
`geminiService.ts` L2977-2980, conditionnel :
```ts
const isFromRecovery = recoveryWeeks.includes(i + 1) || phases[i] === 'recuperation';
if (isFromRecovery) {
  const preRecovVol = i > 0 ? weeklyVolumes[i - 1] : curr;
  // +18% si on entre en phase chargée (dev/spec) et niveau ≥ Inter, sinon +15%
  const isLoadPhase = phases[i + 1] === 'developpement' || phases[i + 1] === 'specifique';
  const isInterPlus = level !== 'Débutant (0-1 an)';
  const recovBoost = (isLoadPhase && isInterPlus) ? 1.18 : 1.15;
  const maxPostRecov = Math.min(preRecovVol, Math.round(curr * recovBoost));
  // ...
}
```

### P3 — Mode "vrai débutant" `currentVolume === 0`
`geminiService.ts` L2587, ajouter une branche `else if (currentVolume === 0)` :
```ts
} else if (currentVolume === 0 && level === 'Débutant (0-1 an)') {
  // Forcer mode marche-course strict : pic ≤ 1.5× distance race, type "Marche/Course" obligatoire S1-S3
  // (Logique séance à porter aussi dans le prompt LLM pour générer type=Marche/Course)
}
```
+ corollaire : si `type === 'Marche/Course'`, **ne PAS écraser `distance` avec `duration / pace`**, mais calculer une distance pondérée run+walk.

### P4 — Expert : autoriser intensité dès S1-S2
1. Prompt LLM L3985 : `à partir de la SEMAINE 3 du fondamental` → `à partir de la SEMAINE 2 (Expert) ou 3 (Confirmé)`.
2. Safety net L675 : `if (phase === 'fondamental' && !(level === 'Expert (Performance)' && weekNumber >= 2)) { ... convert ... }`.
3. Distribution phases L2695-2750 : pour Expert, cap fondamental à 35 % du plan (vs ~45 % observé chez floggyz).

### P5 — Affichage `distance` cohérent avec mainSet marche-course
`enforceWeekConstraints` (~L1888) : si `type === 'Marche/Course'` ou si `mainSet` contient `marche active` ou `marche/course` → recalculer `distance` avec une vitesse moyenne pondérée (50 % course efPace, 50 % marche 6 km/h).

---

## Patches live additionnels (si pertinent)

### Lilian (urgent — séance Mardi 21/05 vue par user)
- `weeks[0].sessions[0].distance` : `6.6 km` → `4 km` (réaliste pour marche-course)
- `weeks[0].sessions[0].duration` : `1h00` → `45 min` 
- `weeks[0].sessions[2].distance` : `6.6 km` → `4 km`
- `weeks[0].sessions[2].duration` : `1h00` → `50 min`
- `generationContext.periodizationPlan.weeklyVolumes` : remonter pic à 22 km. Suggestion : `[10,12,14,11,14,16,13,15,17,14,17,19,15,18,21,17,20,22,18,12]` (progression +1-2 km/sem, hard floor 10K Finisher Débutant 22).
- `welcomeMessage` : corriger "13 km" → "10 km" (cohérent avec nouveau S1) ET mentionner explicitement "Tu démarres en marche-course progressive : la S1 alterne 1 min de course et 2 min de marche pour habituer tes tendons. Le compteur de distance que tu verras (4 km) intègre la marche."

### Margaux
- Pas d'action immédiate sur W1 (W1=fondamental, charge OK 17 km).
- **Surveiller post-conversion** : quand `generateRemainingWeeks` tournera, vérifier que les W12-W17 (specifique) contiennent bien des séances `targetPace: 6:38 min/km` avec mainSet AS21. Si absent, patcher manuellement.

### floggyz
- W1 S1.4 (Jeudi "Footing vallonné") : reformuler en **Footing avec 6×20s accélérations** (intensité Modéré, mention `6×20s en accélération progressive vers ressenti 10k 3:49-3:56, récup 1min trot, reste à 5:07`). Conserve la phase fondamental mais introduit le travail neuromusculaire dès S1.
- `welcomeMessage` : ajouter une phrase prévenant que les 8 premières semaines sont volontairement en EF pour préserver les tendons après potentielle pause Strava non visible (vu que pas de chrono validé), et que la VMA dès S9 introduit l'intensité.

---

## Verdict global

| Plan | Verdict Romane | Bug code | Patch live restant ? |
|------|----------------|----------|----------------------|
| Lilian | ✅ raison sur Q1, Q2, Q4. Q5 nuancé (le pic est 17, pas 25) | P0 (10K floor) + P3 (cv=0) + P5 (distance marche-course) | OUI urgent |
| Margaux | ✅ raison sur Q1 (25 km trop bas), ❌ sur Q4 (BMI 29.4 < seuil 30, **aucun réducteur IMC appliqué**) | P1 (Semi floor Inter) + P2 (smoothing) | NON immédiat ; surveiller post-conversion |
| floggyz | ✅ raison sur Q1, Q2, Q4 | P4 (Expert intensité) | OUI (modif W1 S1.4) |

**Bugs prioritaires à corriger** : P3 (mode vrai débutant cv=0) + P4 (Expert) + P5 (distance marche-course). P0/P1/P2 sont des ajustements quantitatifs ; P3/P4/P5 sont des bugs qualitatifs avec impact direct sur la sécurité et la confiance utilisateur.
