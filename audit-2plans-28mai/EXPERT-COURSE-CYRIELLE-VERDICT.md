# EXPERT COURSE — VERDICT cyrielle (Semi 2h00, cv=2, VMA 10.55)

**Profil** : H 43a, IMC 19.8, Intermédiaire (déclaré), VMA 10.55, cv 2 km/sem, PB Marathon 5h00, freq 3, 20 sem.
**Cible** : Semi 2h00 = 5:41/km = ~100% VMA → IRRÉALISTE (feasibility 5).
**Pic actuel** : 14 km/sem en S19 = **66% race distance**.

---

## 1. Verdict sur volumes actuels

**Catastrophique. Inacceptable même opt-in IRRÉALISTE.**

- Pfitzinger/Daniels Semi *novice* : pic 25-35 km/sem (peak/race ≈ 120-160%).
- Pic 14 km pour 21.1 km le jour J = **sortie longue jamais répétée** avant la course.
- Risque épidémiologique : ACWR jour J ≈ 21/14 = **1.5 (zone rouge)** pour la séance race elle-même → ITBS, fasciite, fracture stress quasi-certains s'il finit.
- PB Marathon 5h00 = "mémoire d'endurance" musculaire à >5 ans probablement décalée ; **ne compense PAS** un déconditionnement à cv 2. Capital aérobie central conservé, capital ostéo-tendineux NON.

Conclusion : 14 km pic = on l'envoie à la **blessure ou à l'abandon**. Indéfendable.

---

## 2. Volume minimum sécuritaire Semi 21.1 km

**Pic minimum NON-NÉGOCIABLE = 18 km** (SL 12-13 km le pic, 85% race).

- 22 km (doctrine actuelle hard floor) : idéal mais saut cv2 → 22 en 18 sem = ×11 → rampe = 14%/sem soutenu = **borderline ACWR** sur 18 sem mais possible.
- 25 km : trop ambitieux pour cv 2, rampe dangereuse.
- 30 km : impossible sans blessure depuis cv 2 en 20 sem.

**Plancher absolu vie/mort = 18 km** (SL la plus longue ≈ 12 km = 57% race, équivalent test "20K simulé" = critère ACSM minimal admission Semi).

---

## 3. Compromis doctrinal cv user immuable vs sécurité

`feedback_input_client_obligatoire` (cv=2 immuable) vs `feedback_securite_avant_conversion` (devoir d'alerter + ne pas faire courir un blessé) — **sécurité prime quand le plan est structurellement dangereux**, pas seulement irréaliste sur le chrono.

Le cv user est respecté **comme baseline de départ S1** (S1 = 3 km OK). **Pas comme plafond de pic**. La doctrine `input_client_obligatoire` parle d'allure cible et de freq/dates, **pas** d'un toit sur la progression de volume. La rampe est notre métier.

`feedback_courte_duree_charge_allegee` ne s'applique PAS (20 sem ≥ 13 sem).

**Précédent identique** : Margaux/Bertrand (audit 2026-05-20) → hard floor Semi 22 instauré PRÉCISÉMENT pour ce cas. Le code l'a, il est bypassé.

---

## 4. Recommandation

**Option A modifiée : hard floor pic = 18 km (pas 22) + welcomeMessage explicite + opt-in IRRÉALISTE renforcé.**

Pourquoi 18 et pas 22 :
- 22 = saut cv2 → 22 en 18 sem progression = ×11, rate 14.4%/sem. Limite ACWR mais conforme garde-fou L3500 (cap 20%).
- 18 = compromis pragmatique : ×9 sur 18 sem = rate ~13%/sem. Plus sûr ostéo-tendineux. SL pic 12 km = répétition utile.
- En-dessous de Pfitzinger novice (25) mais cohérent doctrine `feedback_courte_duree_charge_allegee` esprit (charge allégée volontaire quand profil très limité).

**Welcome obligatoire** :
> "Ton volume actuel (2 km/sem) est très éloigné d'un Semi (21.1 km). Le plan te fait passer de 2 à 18 km/sem progressivement — c'est la rampe minimum pour arriver au départ sans blessure. **Le jour J sera ta plus longue distance jamais courue**, à 17% au-dessus de ton plus gros entraînement. Risque blessure réel. Cible 2h00 inatteignable, regénère avec **2h28** depuis ton profil pour un plan calibré pour réussir."

---

## 5. Patch code

### Bug racine : `effectiveVmaCap` cascade non bornée par hard floor pic

`geminiService.ts:3171` calcule `minPeakVolume = min(rawMin, absoluteCap, effectiveVmaCap)`. Puis L3180 lève à 22 si < 22. Puis L3217 `maxVolume = minPeakVolume`. **Math OK.** Le bug est en aval : **rate adaptatif L3439-3450** + **garde-fou pic L3495-3525** se court-circuitent quand `progressionRate` initial est déjà bas, ce qui empêche d'atteindre maxVolume=22 (ou 18) sur le pic réel.

**Patch minimal** (`geminiService.ts:3180-3187`) :

```ts
// Hard floor pic volume Semi/Marathon — JAMAIS bypassé en aval
const HARD_FLOOR_PEAK = { Semi: 18, Marathon: 28, '10K': 15, '5K': 12 };
const floor = HARD_FLOOR_PEAK[objectiveKey];
if (floor && minPeakVolume < floor) {
  console.log(`[Periodization] Hard floor ${objectiveKey} pic: ${minPeakVolume} → ${floor}`);
  minPeakVolume = floor;
}
```

**Patch garde-fou pic L3495** (assurer qu'il s'applique TOUJOURS) :

```ts
if (actualPeak < minPeakVolume * 0.95) {  // au lieu de 0.85
  const neededRate = Math.pow(minPeakVolume / startVolume, 1 / Math.max(1, progressionWeeks - 1)) - 1;
  const adjustedRate = Math.min(neededRate, 0.20);
  // FIX : forcer même si adjustedRate ≤ progressionRate (cas rate adaptatif déjà bas)
  effectiveRate = Math.max(effectiveRate, adjustedRate);
  // … recalcul boucle
}
```

**Patch welcomeMessage IRRÉALISTE** (`geminiService.ts:3747-3762`) : déjà identifié COL4 V3 bug #4, ajouter call-to-action regen + warning blessure explicite si `pic < race × 1.0`.

### Patch live cyrielle (S1 plan du jour, non vécue)

1. Forcer regen pic 18 km via override volumes.
2. Sinon (si pas regen) : enrichir welcomeMessage + safetyWarning avec wording du §4 ci-dessus.

---

**Verdict tranchant** : plan actuel **INDÉFENDABLE** à pic 14 km. Hard floor 18 km minimum applicable au code + welcome explicite. Le compromis Romane "volume MINIMUM sécuritaire" prime la doctrine cv immuable sur le toit du pic — la doctrine cv immuable s'arrête au S1.
