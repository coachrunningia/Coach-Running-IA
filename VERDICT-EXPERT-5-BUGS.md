# Verdict expert FFA 20 ans — 5 bugs systémiques candidats
Date : 2026-05-22
Plans audités : Guliver 1779433945589 (72 ans, M 3h55, plan 24 sem, S1 non commencée) — Clémentine 1779433173116 (30 ans F M 4h50, plan 10 sem, S1 en cours, NON patchable)

---

## Bug #1 — `targetPace` unique par séance (variations écrasées)

### Verdict
⚠️ **NUANCÉ** — bug réel mais sur **un sous-ensemble étroit de titres** (négative split, fartlek, progressif, allure spé sur SL marathon). Sur les 4 footings S1 de Guliver à 6:38/km : 3 sont des footings continus (vallonné, gammes, négative split), 1 est une SL avec alternance MC.
- Daniels (RFC 4e éd, ch. 5) : négative split = 2 zones d'allure distinctes (EF puis tempo), une seule allure perd la pédagogie.
- Pfitzinger Marathoning (3e éd, ch. 4) : SL avec « finish miles à M-pace » = 2 allures **obligatoirement** distinctes.
- Magness (Science of Running, ch. fartlek) : fartlek = oscillation explicite, pas une allure moyenne.
- **MAIS** : on a déjà `warmup`, `mainSet`, `cooldown` qui portent du texte d'allure. Le bug n'est pas le schéma mais le **fallback ligne 852-869** qui force `targetPace` au pace unique du type quand le LLM le laisse vide. C'est là qu'on rate.

### Spec de fix
Fichier : `src/services/geminiService.ts:840-870`
- Modifier le fallback `mainSet`/`targetPace` pour les titres qui matchent `/négative split|progressif|fartlek|allure spé|finish miles|M-pace|tempo/i` : **ne pas écraser**, laisser `targetPace = ''` (UI affichera alors le détail du mainSet) et **enrichir mainSet** avec les 2 allures si LLM ne l'a pas fait. Exemple :
```ts
const VARIATION_TITLE_RE = /n[ée]gative split|progressif|fartlek|allure sp[éeè]|finish miles|tempo doux|m-pace/i;
const isVariation = VARIATION_TITLE_RE.test(session.title || '');
if (!session.targetPace && pacesObj) {
  if (isVariation && session.type === 'Sortie Longue') {
    // 2 allures : EF départ → seuilPace/M-pace arrivée
    session.targetPace = `${pacesObj.efPace} → ${pacesObj.seuilPace || pacesObj.efPace}`;
  } else if (isVariation && session.type === 'Jogging') {
    session.targetPace = `${pacesObj.recoveryPace} → ${pacesObj.efPace}`;
  } else {
    // logique actuelle
    session.targetPace = paceForType[session.type] || pacesObj.efPace;
  }
}
```
- Côté **prompt LLM** (ligne 4150 + ligne 4170-4173) : ajouter une règle :
```
🔴 ALLURES MULTIPLES SUR SÉANCE VARIATION : si le titre contient "négative split", "progressif",
"fartlek", "finish miles", "allure spé" → `targetPace` DOIT être au format "X:XX → Y:YY" (départ → fin)
ou "X:XX (récup Y:YY)" (fractionné). NE PAS donner une allure moyenne unique.
```
- Côté UI : déjà robuste — la chaîne `"6:38 → 6:00"` s'affiche telle quelle sans crash (testé `audit-pace-bug.mjs`).

### Test anti-régression
1. Footing classique "Footing en aisance respiratoire" → targetPace = `pacesObj.efPace` (1 seule allure) ✅ inchangé.
2. SL "Sortie Longue négative split 18 km" → targetPace = `"6:38 → seuilPace"` ✅ nouveau.
3. "Fractionné 6×800m" → targetPace contient `vmaPace` + récup ✅ déjà OK (cas existant).
4. Cas Guliver S1 : 4 footings différents → 2 footings continus (1 allure) + 2 footings variation (2 allures).

### Risque régression
- LLM peut écrire `targetPace = "6:38"` même sur une variation, ce qui re-tombe dans le bug. Mitigation : le code ci-dessus **enrichit** au lieu d'écraser uniquement quand `targetPace` est vide. Si le LLM a déjà rempli `"6:38"`, on **détecte le pattern** (`!session.targetPace.includes('→') && isVariation`) et on enrichit en concaténant : `targetPace = "${current} → ${seuilOrEf}"`.
- Pas de risque sur Trail / Hyrox (titres ne matchent pas VARIATION_TITLE_RE).

### Effort
**30 min** (10 lignes code + 1 bloc prompt + 1 test snapshot).

---

## Bug #2 — `confidenceScore` aveugle à l'âge + ACWR + saut volume global

### Verdict
✅ **CONFIRMÉ partiellement** — mais pas comme tu l'as formulé. Le score est aveugle à **l'âge seul** (Hammond : VO2max -10%/décennie après 40 = un Guliver 72 ans VMA 13.5 vs un 30 ans VMA 13.5 = profils incomparables). Sur ACWR S1, **R2 règle 4 existe déjà** (`feasibilityService.ts:322-333`) mais elle utilise une **estimation `s1Volume = currentVolume × 1.10`** au lieu de la **S1 réelle de la périodisation** → règle 4 désactivée de fait. Pour Clémentine : règle 4 vue 25→27.5 (sautPct 10%) au lieu de 25→40 (sautPct 60%, IRRÉALISTE). Le saut pic/cv > 2.0 est déjà géré ligne 804-809 (cap 50).
- Pfitzinger Masters (chap. "Older Marathoners") : un homme >70 ans qui n'a jamais couru < 4h10 et qui vise 3h55 = ambition très exigeante, score ne peut pas être 99.
- Gabbett (ACWR 2016 BJSM) : ratio S1/baseline > 1.5 = zone rouge (risque blessure ×3-4).

### Spec de fix
Fichier : `src/services/feasibilityService.ts`

**Fix 2a — Passer la vraie S1 (et non l'estimée) :**
Ligne 758-768 (preview) + ligne 1298-1307 (finisher) : ajouter param `s1ActualVolume?: number` à `FeasibilityParams`. Dans `geminiService.ts:4049-4072`, passer `s1ActualVolume: generationContext.periodizationPlan.weeklyVolumes[0]`. Dans feasibilityService :
```ts
const s1VolEstimate = params.s1ActualVolume && params.s1ActualVolume > 0
  ? params.s1ActualVolume   // priorité absolue : vraie S1 calibrée
  : currentVolume && currentVolume > 0
    ? Math.round(currentVolume * 1.10)
    : Math.round(peakVolEstimate * 0.30);
```
**Effet** : règle 4 R2 (déjà en place) déclenche pour Clémentine → `irrealisticCap = 10` → score 50→10, statut RISQUÉ→IRRÉALISTE. (On ne crée AUCUNE nouvelle règle ; on alimente correctement celle qui existe.)

**Fix 2b — Cap senior (Hammond) :**
Après la pénalité VMA basse (ligne 608), ajouter :
```ts
// Hammond Endurance Masters : VO2max -10%/décennie après 40. Senior + objectif ambitieux
// (gap > 0 = objectif plus rapide que théorique) → cap confiance même si VMA matche.
// La VMA d'un Master n'est plus prédictive comme à 30 ans (récupération + plus lente,
// adaptation aérobie 2-3× plus lente). Cf. Pfitzinger Masters ch. "Older Marathoners".
if (params.age !== undefined && hasTimeTarget) {
  // Cap progressif : 90 à 60ans, 80 à 65, 75 à 70, 70 à 75+
  let ageCap: number | undefined;
  if (params.age >= 75) ageCap = 70;
  else if (params.age >= 70) ageCap = 75;
  else if (params.age >= 65) ageCap = 80;
  else if (params.age >= 60) ageCap = 90;
  // Le cap ne s'applique QUE si l'objectif est plus rapide que le PB (gap user vs PB)
  // ou plus rapide que le théorique (gapPercent > 0). Sinon objectif confortable = pas de cap.
  if (ageCap !== undefined && gapPercent > -5) {
    score = Math.min(score, ageCap);
  }
}
```
**Justification chaque ligne** : on ne touche pas le score quand le senior vise confortable (`gapPercent < -5`, objectif > 5% au-dessus théorique = un 72 ans qui vise 4h30, c'est OK). On cap UNIQUEMENT quand il vise au moins son théorique → marge progression senior insuffisante.

**Fix 2c — Cross-check PB vs cible (Guliver) :**
On a déjà `recentRaceTimes` dans les params. Ajouter après Fix 2b :
```ts
// Cross-check PB déclaré vs cible : pour Marathon/Semi/10K si PB existe et cible plus rapide
// que PB de plus de X% → confiance plafonnée (un user qui n'a jamais fait moins de PB
// ne va pas gagner 6-7% en N sem, surtout senior).
if (isMarathon && params.recentRaceTimes?.distanceMarathon && hasTimeTarget) {
  const pbMin = parseTargetTime(params.recentRaceTimes.distanceMarathon);
  if (pbMin && pbMin > 0) {
    const pbGapPct = ((pbMin - targetMinutes) / pbMin) * 100; // > 0 = cible + rapide que PB
    const maxGainExpected = params.age !== undefined && params.age >= 60 ? 4 : 8; // % réalistes
    if (pbGapPct > maxGainExpected) {
      score = Math.min(score, 70);
    }
    if (pbGapPct > maxGainExpected * 1.5) {
      score = Math.min(score, 55);
    }
  }
}
```
Guliver : PB 4h10 = 250 min, cible 235 min → pbGapPct = 6%, age 72 → maxGain=4 → 6% > 4 → cap 70. 6%>6 (1.5×4) → cap 55. Score final ≤ 55, statut AMBITIEUX/RISQUÉ. **Le 99% disparaît.**

### Test anti-régression
1. **Guliver fictif 30 ans** mêmes inputs → pas de cap âge, cap PB seul → score plafonné ~70 (au lieu de 99). Acceptable.
2. **Senior 65 ans VMA 14 cible 4h10 PB 4h05** (-1.6% gain réaliste) → pas de cap (gain < 4%). Score reste élevé.
3. **Clémentine** → règle 4 R2 déclenche via vraie S1 (40 vs cv 25) → score 10.
4. **Marathon 30 ans VMA 16 sans PB cible 3h00** théorique 3h05 → gap +2.7% acceptable → score 80-85 inchangé.
5. **Senior 72 ans vise sub-objectif (5h00 marathon avec théorique 3h54)** → gapPercent -28% → pas de cap âge (objectif confort). Score reste haut.

### Risque régression
- Casse les plans seniors actifs (>60 ans) qui ont actuellement score ≥ 90 et vise leur théorique. Mitigation : déployer **uniquement pour previews neufs**, pas de migration plans existants (doctrine `feedback_patch_live_plans_jour_seulement`).
- Faux positifs sur PB ancien (PB il y a 10 ans, niveau actuel meilleur) : on n'a pas de date PB. Acceptable, plus prudent vaut mieux qu'embellir (doctrine `feedback_securite_avant_conversion`).

### Effort
**2h** (Fix 2a 30 min + 2b 20 min + 2c 30 min + tests 30 min + revue + doc).

### Doctrines impactées
`feedback_securite_avant_conversion` (transparence > conversion), `feedback_jamais_baisser_allure_cible` (on touche le **score**, PAS l'allure cible — respecté), `feedback_input_client_obligatoire` (on n'écrase pas vol/allures/cible, on informe via score+welcome).

---

## Bug #3 — Calibrage S1 ignore ACWR Gabbett

### Verdict
✅ **CONFIRMÉ** mais **PARTIELLEMENT** déjà géré : la **détection** existe (R2 règle 4) mais elle **n'agit pas sur la périodisation** — elle plafonne juste le score de feasibility. Pour Clémentine, S1 = 40 km est posée par `calculatePeriodizationPlan` (geminiService.ts:3275), et **rien ne re-cap S1 à 1.2× le vol actuel**.
- Gabbett 2016 (BJSM) : ACWR > 1.5 = zone rouge. Ratio 1.6 = bordure haute.
- Pfitzinger Marathoning : règle 10%/sem MAX entre semaines successives. 25→40 = +60% en une étape, hors limite.
- **MAIS** : doctrine `feedback_courte_duree_charge_allegee` dit : sous 13 sem, charge allégée volontairement. Donc cap 1.2× currentVolume seul **NON** — pour un plan 10 sem Marathon il faut une rampe rapide pour préparer (sinon on ne dépasse jamais 30 km/sem, infaisable). La bonne réponse est **double** : cap S1 + **prévenir/refuser** le plan en feasibility quand cap S1 < volume minimal préparation distance.

### Spec de fix
Fichier : `src/services/geminiService.ts` — fonction `calculatePeriodizationPlan` (autour ligne 2766-2802 et 2993+).

Ajouter, **après tous les calculs maxVolume**, juste avant retour :
```ts
// ACWR Gabbett — cap S1 à 1.3× currentVolume (compromis : 1.2 trop strict pour plans
// courts <13 sem, 1.5 = zone rouge Gabbett ; 1.3 = bordure verte/jaune).
// Si le cap rend la rampe S1→pic infaisable (cap S1 > 50% du pic), c'est la
// FAISABILITÉ qui doit bloquer, pas la périodisation qui doit lisser à perte.
const S1_ACWR_CAP = 1.3;
if (currentVolume && currentVolume > 0 && weeklyVolumes.length > 0) {
  const s1Raw = weeklyVolumes[0];
  const s1Cap = Math.round(currentVolume * S1_ACWR_CAP);
  if (s1Raw > s1Cap) {
    const delta = s1Raw - s1Cap;
    weeklyVolumes[0] = s1Cap;
    // Redistribuer le delta sur S2-S4 (rampe douce vers le pic d'origine)
    for (let i = 1; i <= Math.min(3, weeklyVolumes.length - 1); i++) {
      // Ne pas dépasser maxVolume sur S2-S4
      weeklyVolumes[i] = Math.min(weeklyVolumes[i] + Math.round(delta / 3), maxVolume);
    }
    console.log(`[Periodization] ACWR cap S1 : ${s1Raw}km → ${s1Cap}km (currentVol ${currentVolume}×${S1_ACWR_CAP}). Delta ${delta}km redistribué S2-S4.`);
  }
}
```
**Justification chaque ligne** :
- Seuil 1.3 et non 1.2 (Gabbett zone verte stricte) car notre population vise des courses, pas de la santé pure. Compromis (doctrine `feedback_compromis_messages_preventifs`).
- Redistribution **vers S2-S4** car la doctrine `feedback_courte_duree_charge_allegee` admet une charge allégée mais on ne peut pas perdre tout le volume cycle (on veut atteindre le pic). Mitigation : on étale, on ne supprime pas.
- Cap S2-S4 sur maxVolume pour ne pas créer de surcharge ailleurs.

**Effet Clémentine** : S1 25→32 (au lieu de 40). Reste +28% (encore limite mais sortie zone rouge). S2-S4 absorbent +3 km chacun.
**Effet Guliver** : currentVolume 50, S1 50 → ratio 1.0 → pas de cap (déjà OK).

### Test anti-régression
1. **Clémentine** : S1 40→32, S2-S4 +3 chacune, pic 56 inchangé.
2. **Guliver** : pas de cap (S1=50, cv=50). Plan inchangé.
3. **Débutant cv=0** : pas de cap (condition `currentVolume > 0`). Logique existante préservée.
4. **Profil 30 ans cv 60 km, plan Marathon S1=70** : ratio 1.16 < 1.3 → pas de cap. OK.
5. **Profil avec cv=10 plan Marathon S1=30** : ratio 3.0, cap S1=13, delta 17 redistribué S2-S4 +5/6. Vérifier que c'est cohérent (le pic 60 reste atteignable).

### Risque régression
- **Plan court (8-10 sem) où la rampe S1→pic devient mathématiquement infaisable** après cap. Ex : Marathon 10 sem cv=10, S1 capée à 13, pic théorique 60 → progression 13→60 en 10 sem = +46 km = +35%/sem moyen, hors règle 10%. Mitigation : la **feasibility** doit refuser/dégrader le score (déjà cap pic/cv > 2.0 ligne 804-809). Pas besoin de toucher la périodisation : le user verra RISQUÉ + welcome message transparent.
- Ne pas appliquer en mode débutant Vol 0 (déjà condition `currentVolume > 0`).

### Effort
**30 min** (15 lignes code + 1 test).

### Doctrines impactées
`feedback_courte_duree_charge_allegee` (respect : on tend vers le pic mais on lisse S1), `feedback_input_client_obligatoire` (respect : currentVolume du user est la base, on ne l'écrase pas), `feedback_compromis_messages_preventifs` (seuil 1.3 compromis), `feedback_securite_avant_conversion` (sécurité avant tout).

---

## Bug #4 — Routing Marche/Course pour Expert 72 ans

### Verdict
✅ **CONFIRMÉ** — bug clair et grave. `applyMarcheCourseRouting()` (geminiService.ts:715) est un **post-process runtime** qui force `type = Marche/Course` dès qu'il détecte un pattern `/X min course / Y min marche/i` dans le mainSet, **SANS vérifier le niveau ni le contexte**. Le LLM, pour une SL "vallonnée" 18 km pour un 72 ans, peut générer "alternance trot/marche en montée" → routing force le label MC → Expert 72 ans se retrouve avec une SL MC.
- Doctrine `feedback_mode_marche_course_scope` : MC = Débutants UNIQUEMENT.
- Pfitzinger Masters : SL avec **walk breaks** (Galloway-style) est légitime pour Masters, **mais le label séance reste "Long Run"** car la dominante est la course. Le routing actuel est trop agressif.

### Spec de fix
Fichier : `src/services/geminiService.ts:715-728`

```ts
export const applyMarcheCourseRouting = (week: any, data?: { level?: string; age?: number; currentWeeklyVolume?: number; vma?: number }): void => {
  if (!week || !Array.isArray(week.sessions)) return;
  // Garde-fou doctrine : MC réservé Débutants (cf. feedback_mode_marche_course_scope).
  // Ne JAMAIS forcer le label MC pour Intermédiaire/Confirmé/Expert.
  // Exception : si LLM a explicitement nommé la séance "Marche/Course" dans le titre,
  // c'est intentionnel (rare), on laisse.
  const lvl = (data?.level || '').toLowerCase();
  const isBeginner = lvl.includes('débutant') || lvl.includes('debutant');
  const vmaVeryLow = (data?.vma ?? 99) < 10;
  const cvVeryLow = (data?.currentWeeklyVolume ?? 99) < 10;
  // Routing autorisé UNIQUEMENT si Débutant OU (VMA<10 ET cv<10) — profil reprise/santé.
  const routingAllowed = isBeginner || (vmaVeryLow && cvVeryLow);

  for (const session of week.sessions) {
    if (!session || !session.mainSet || typeof session.mainSet !== 'string') continue;
    if (session.type === 'Marche/Course') continue;
    const matches = RUN_WALK_PATTERNS.some((re) => re.test(session.mainSet));
    if (matches) {
      if (routingAllowed) {
        console.log(`[Routing] Force type Marche/Course pour "${session.title || '(sans titre)'}" (level=${data?.level}, vma=${data?.vma}, cv=${data?.currentWeeklyVolume})`);
        session.type = 'Marche/Course';
      } else {
        // Profil non-débutant : on NE force PAS le label. On laisse type tel quel et
        // on retire la mention walk-breaks (anti-régression Guliver) du mainSet pour
        // ne pas afficher un type incohérent. Doctrine feedback_que_course.
        console.log(`[Routing] Pattern run/walk détecté MAIS niveau ${data?.level} non-débutant — pattern supprimé du mainSet, type "${session.type}" conservé.`);
        // Optionnel : nettoyer la phrase walk-break du mainSet (regex ciblée).
        session.mainSet = session.mainSet.replace(/[^.;]*\b(?:alternance|run.walk)[^.;]*[.;]?/gi, '').trim();
      }
    }
  }
};
```
Et tous les appels (4648, 5446, 5500) :
```ts
plan.weeks.forEach((week: any) => applyMarcheCourseRouting(week, data));
```

**Justification chaque ligne** :
- `isBeginner` strict via `.includes('débutant')` (cohérent avec `feasibilityService.ts:206`).
- `vmaVeryLow + cvVeryLow` cumulé (et non OU) car un Expert sénior peut avoir VMA 13 ET cv 50, il ne doit jamais tomber dans MC.
- Suppression de la phrase walk-break côté mainSet : sinon on laisse texte incohérent avec type. La regex `\b(?:alternance|run.walk)[^.;]*[.;]?` retire la phrase fautive sans casser le reste.
- Log explicite des deux branches pour audit post-déploiement.

### Test anti-régression
1. **Débutant VMA 9 cv 0** : routing autorisé → SL "1 min course / 2 min marche" → type MC ✅ inchangé.
2. **Guliver Expert 72 ans VMA 13.5 cv 50** : routing refusé → type SL préservé + walk-break retiré du mainSet ✅ corrigé.
3. **Confirmé 30 ans VMA 11 cv 25 (Clémentine)** : routing refusé → ✅ pas de MC injecté.
4. **Reprise post-blessure VMA 9.5 cv 8 niveau "Intermédiaire (1-3 ans)"** : VMA<10 ET cv<10 → routing autorisé. OK (exception reprise santé).

### Risque régression
- Plans Hyrox débutant : MC très utile S1-S3 (cf. ligne 4842 prompt). Pas de risque car routing reste actif pour Débutants.
- Plans Perte de poids cv 0 VMA 9 niveau Régulier : VMA<10 ET cv<10 → autorisé. OK.
- Plans seniors actifs (>60 ans) déclarés Régulier/Intermédiaire qui font Galloway officiel : on bloque le label mais on retire aussi la phrase mainSet. **Ce n'est pas correct si l'utilisateur veut vraiment du run-walk.** Mitigation : exposer le run-walk dans le **questionnaire** (case à cocher "Je préfère alterner course/marche") qui ouvre le routing. Hors scope ce sprint — on documente.

### Effort
**30 min** (15 lignes code + propagation 3 appels + 3 tests).

### Doctrines impactées
`feedback_mode_marche_course_scope` (respect strict), `feedback_chaque_ligne_justifiee` (chaque branche justifiée), `feedback_input_client_obligatoire` (on respecte le niveau déclaré Expert, on ne le downgrade pas en MC).

---

## Bug #5 — WelcomeMessage minimise saut volume

### Verdict
⚠️ **NUANCÉ** — le prompt **demande déjà** la transparence si ratio > 1.5 (geminiService.ts:4131-4138). Pour Clémentine ratio = 40/25 = 1.6 → la règle a déclenché. Le message dit "c'est un peu plus que ton volume actuel mais reste progressif". **Le wording "un peu plus" pour +60% est faux.** Le bug n'est pas l'absence d'instruction mais le **seuil unique** (>1.5) et le **modèle de phrase trop doux**.
- Pfitzinger : "10% rule" est la règle, +60% = **breach explicite** à mentionner clairement, pas "un peu plus".
- Doctrine `feedback_securite_avant_conversion` : ne pas embellir.

### Spec de fix
Fichier : `src/services/geminiService.ts:4131-4138`

Remplacer le bloc actuel par un **wording paliers** :
```ts
// Calcul ratio AVANT injection prompt
const s1Vol = generationContext.periodizationPlan.weeklyVolumes[0];
const cv = data.currentWeeklyVolume ?? 0;
const s1Ratio = cv > 0 ? s1Vol / cv : 1;
const s1Delta = s1Vol - cv;

const transparencyBlock = cv === 0 || s1Ratio <= 1.15
  ? '' // ratio < 15% : pas besoin d'évoquer
  : s1Ratio <= 1.3
    ? `
⚠️ TRANSPARENCE CALIBRAGE — wording mesuré (ratio ${s1Ratio.toFixed(2)} = +${Math.round((s1Ratio-1)*100)}%) :
Le welcomeMessage DOIT mentionner que la S1 (${s1Vol}km) est supérieure au vol actuel (${cv}km), mais
la progression reste dans la zone confortable. Modèle : "Ta S1 démarre à ${s1Vol}km, légèrement au-dessus
de ton volume actuel (${cv}km). Si tu cours réellement plus, ajuste dans ton profil."`
    : s1Ratio <= 1.5
      ? `
⚠️ TRANSPARENCE CALIBRAGE — wording ferme (ratio ${s1Ratio.toFixed(2)} = +${Math.round((s1Ratio-1)*100)}%) :
Le welcomeMessage DOIT mentionner EXPLICITEMENT le saut. Modèle : "On démarre ta S1 à ${s1Vol}km alors
que ton vol actuel est ${cv}km — c'est ${Math.round((s1Ratio-1)*100)}% de plus, à la limite de la rampe
recommandée (Gabbett). Écoute ton corps et ralentis si fatigue inhabituelle."`
      : `
🚨 TRANSPARENCE CALIBRAGE — saut violent (ratio ${s1Ratio.toFixed(2)} = +${Math.round((s1Ratio-1)*100)}%, +${s1Delta}km) :
Le welcomeMessage DOIT prévenir SANS EMBELLIR. Modèle : "Ta S1 démarre à ${s1Vol}km, soit ${Math.round((s1Ratio-1)*100)}%
de plus que ton volume actuel (${cv}km). C'est un saut important — risque accru de surcharge (règle Gabbett ACWR>1.5).
Si tu cours réellement plus que ${cv}km/sem, ajuste dans ton profil. Sinon on te recommande d'allonger ton plan
ou de revoir l'objectif. Décharge claire : suivre cette S1 nécessite vigilance."`;
```
Et l'injecter dans le prompt à la place du bloc ligne 4131-4138.

**Justification chaque ligne** :
- Paliers 1.15/1.30/1.50 collés sur Gabbett (zone verte/jaune/rouge).
- Seuil 1.15 (au lieu de 1.5) car +15-20% est déjà notable pour qui suit un plan.
- Wording explicite (chiffres + ratio + km absolu) — doctrine `feedback_securite_avant_conversion`.
- Mention "décharge claire" sur palier rouge — doctrine sécurité.
- PAS de mention de l'allure cible (doctrine `feedback_jamais_baisser_allure_cible`).
- PAS de mention "perte de poids/minceur" (doctrine `feedback_jamais_poids_minceur`).

### Test anti-régression
1. **Clémentine cv 25 S1 40 ratio 1.6** : palier rouge → message ferme avec "+60%, +15km, risque accru". ✅ corrigé.
2. **User cv 50 S1 50** : ratio 1.0 → pas de bloc. ✅ pas de bruit.
3. **User cv 0 S1 30** : early return ('') → pas de bloc. Le user débutant a déjà son onboarding spécifique.
4. **User cv 30 S1 33** : ratio 1.1 → pas de bloc. OK.
5. **User cv 30 S1 38** : ratio 1.27 → palier vert, wording mesuré. OK.

### Risque régression
- LLM peut paraphraser et adoucir le ton. Mitigation : ajouter dans la règle "INCLURE textuellement le chiffre `+X%` et `+Ykm`". On peut aussi vérifier post-génération (regex `/\+\d+%/` dans welcomeMessage si ratio > 1.5) et logger un warning si absent. Pas bloquant.
- Casse l'impression "le plan est facile" pour les nouveaux users qui ont mal renseigné leur cv. Pas un bug, c'est le but (doctrine sécurité).

### Effort
**30 min** (20 lignes code dans 1 bloc + 2-3 snapshots).

### Doctrines impactées
`feedback_securite_avant_conversion` (transparence ferme), `feedback_compromis_messages_preventifs` (paliers > extrême binaire), `feedback_jamais_poids_minceur` (vérifié dans wording), `feedback_jamais_baisser_allure_cible` (on ne touche pas aux allures).

---

## Hiérarchisation prioritaire

**P0 — À coder immédiatement (sprint A, 2-3h)**
1. **Bug #2a (passer vraie S1)** — 30 min — **débloque mécaniquement la règle 4 R2 déjà existante**. Effet majeur sans nouvelle règle. **Le plus simple**, le plus rentable.
2. **Bug #4 (routing MC Expert)** — 30 min — bug doctrine pure, lignes peu nombreuses, test évident. **Empêche un retour terrain négatif immédiat** (Guliver Expert 72 ans avec SL MC = perte de confiance).
3. **Bug #3 (cap S1 ACWR)** — 30 min — couplé naturellement à 2a, à coder ensemble. Idem peu de lignes.

**P1 — Sprint B (2-3h)**
4. **Bug #2b+2c (cap senior + cross-check PB)** — 1h30 — apport coach FFA majeur, mais nécessite plus de tests anti-régression (cap des plans seniors actifs).
5. **Bug #5 (welcome paliers)** — 30 min — quick win après le sprint A, profite du fait que la S1 réelle est déjà passée correctement.

**P2 — Sprint C (1h)**
6. **Bug #1 (targetPace variations)** — 30 min — NUANCÉ : utilité réelle mais sur sous-ensemble. À faire après #2/#3 pour le polish UI.

---

## Sprint dev recommandé

### Sprint A — Faisabilité réaliste (j+1, 2h30)
- Bug #2a : passer `s1ActualVolume` à `calculateFeasibility` (feasibility + gemini preview/remaining) — **30 min**
- Bug #3 : cap S1 dans `calculatePeriodizationPlan` à 1.3× currentVolume avec redistribution — **30 min**
- Bug #4 : durcir `applyMarcheCourseRouting` avec garde-fou niveau — **30 min**
- Tests : ajouter 6 snapshots (Clémentine pré/post, Guliver pré/post, débutant vol 0, expert 30 ans) — **45 min**
- Revue Romane + déploiement preview only (jamais sur plans live commencés) — **15 min**

### Sprint B — Senior-aware + welcome (j+2, 2h30)
- Bug #2b : cap progressif âge ≥ 60 — **20 min**
- Bug #2c : cross-check PB vs cible (Marathon/Semi/10K) — **40 min**
- Bug #5 : welcome 3 paliers ACWR — **30 min**
- Tests : 5 profils seniors + Clémentine welcome — **45 min**
- Revue + déploiement preview only — **15 min**

### Sprint C — Polish UI allures (j+3, 1h)
- Bug #1 : variation `targetPace` "X → Y" pour titres variation — **30 min**
- Test snapshot UI + 1 footing classique + 1 SL négative split — **20 min**
- Revue + déploiement — **10 min**

---

## Vérité brutale coach FFA
- Le plan Guliver à 99% confiance est **dangereux** : on dit OK à un 72 ans qui n'a jamais fait moins de 4h10 pour viser 3h55 à 24 sem (+6% PB, +30%/décennie de la régression VO2max attendue). Verdict coach : **AMBITIEUX/RISQUÉ**, jamais EXCELLENT.
- Le plan Clémentine est **patché trop tard** : S1 en cours, doctrine `feedback_patch_live_plans_jour_seulement` interdit toucher. La leçon = corriger le pipeline AVANT, pas patcher après. Sprint A est urgent pour les futurs profils similaires.
- **L'ordre A → B → C est non négociable** : sans Sprint A, Sprint B ne corrige rien car la S1 réelle n'est pas vue par feasibility.
