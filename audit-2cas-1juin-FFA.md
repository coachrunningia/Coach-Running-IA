# Audit 2 cas — 1/06/2026 — Expert Coach FFA 25 ans

---

## CAS 1 — SEMENT.FRANCOIS (Trail 31 km / 750 D+ / 20 sem)

**Verdict : 🟡 LIMITE — patch P1 recommandé pour profil injury Achille**

### Justification doctrine

- Ratio S1→PIC = 1.70 sur 20 semaines = **+5%/sem géométrique moyen** ; sur 14 sem de progression effective (hors récup+affûtage) ça reste ~+4%/sem. **Sous le 10%/sem ACSM** et sous la zone rouge Gabbett ACWR (>1.5 hebdo). Doctrine Pfitzinger Advanced (cumul +25-30% sur 8-12 sem) ne s'applique pas en 1:1 ici car la rampe est ÉTALÉE sur 20 sem → progression cumul plus douce que Pfitzinger Marathon strict.
- Profil Confirmé Marathon 3h45 (VMA 14.06) + cv 40 km/sem freq 4 = utilisateur HABITUÉ. Le S1=40 km = currentVolume strict (doctrine `feedback_input_client_obligatoire`).
- Pic 68 km sur cv 40 = ratio 1.70 mais en 20 sem = ~+2.7% lissé/sem effectif → **sain pour profil sain**.

### MAIS : injury Achille = facteur aggravant

**Vérification code `geminiService.ts` L2984-3023 (block `totalReduction`) :**

```ts
let totalReduction = 1.0;
if (isFinisher && !isPertePoids && !isMaintien) totalReduction *= 0.75; // Finisher
if (age < 18) totalReduction *= 0.70;       // Ado
else if (age >= 55) totalReduction *= 0.85; // Senior
if (bmi >= 35) totalReduction *= 0.65;      // Obésité 2+
else if (bmi >= 30) totalReduction *= 0.80; // Obésité 1
else if (weight > 85 && bmi < 30) totalReduction *= 0.85/0.90; // Poids élevé
```

**Verdict code : ❌ AUCUNE modulation `hasInjury` dans `totalReduction`.** Le code applique Finisher + Age + BMI/poids uniquement. La doctrine "F-18.1 modulation BMI/age/poids/injury × 0.75 pour le pic" évoquée par Romane **n'existe PAS dans le code** — F-18.1 dans le repo = feature feasibility transparence opt-in, pas modulation volume.

→ Le pic 68 km est livré tel quel même avec tendinopathie Achille déclarée. Pour ce profil :
- 68 km/sem × 1.70 ratio sur 20 sem = OK sans injury
- AVEC Achille : tendon calcanéen sensible aux progressions volume + impact, surtout en trail (D+). Pfitzinger Lab + Schwellnus : injury active = réduire pic 15-25% OU étaler progression 1.3-1.5×.

### Actions concrètes

- **P0** (patch live) : pour SEMENT.FRANCOIS, audit visuel si plan déjà vécu (>S1) → si non vécu, patcher pic à **55 km** (1.38 ratio, doctrine `feedback_courte_duree_charge_allegee` adaptée injury). Si vécu, monitorer + safety message preview.
- **P1** (code) : ajouter dans `totalReduction` un facteur `if (hasInjury && injuryType ∈ {tendon, fascia, IT-band}) totalReduction *= 0.85`. Pas 0.75 (trop sévère pour Confirmé/Expert tendons rodés) — 0.85 = compromis. Tester sur 10 profils diversifiés avant push (doctrine `feedback_validation_n_profils_avant_sprint`).

---

## CAS 2 — MERCIRIRE (Trail 26 km / 1100 D+ / 7 sem)

**Verdict : 🟢 OK — doctrine respectée**

### Justification sécurité tendineuse

- **currentWeeklyElevation = 1300m/sem déclaré** → user fait DÉJÀ +18% du D+ race chaque semaine. SL S1 = 845m sur une sortie = 65% de son hebdo habituel concentré, MAIS sur 22.8 km à 5:07/km = pace très EF (efSpeed 11.7 km/h vs VMA 17.5 × 0.75 = 13.1). Allure conservatrice.
- Profil Expert 20 ans 60 kg BMI 18.7 freq 5 cv 80 = **tendons jeunes optimaux**, capacité encaisse confirmée par cv haut.
- Code `planUtils.calculateWeekTargetElevation` L138-149 : floor = `currentWeeklyElevation` (1300m) jamais écrasé. Cap Expert 6500m mais on est loin. **Doctrine `feedback_input_client_obligatoire` respectée**.
- 845m sur SL S1 = répartition normale Trail 26 km/1100 D+ : la SL DOIT préparer le D+ race. À 845m elle est à 77% race D+ S1, ce qui est conservateur vu cv user (Expert qui fait 1300m/sem).
- Risque tendineux : faible. 845m sur sortie de 1h56 = 7.3 m/min D+ = pente moyenne ~7-8% = trail roulant standard, pas montagne raide.

### Nuances

- VMA 17.5 ESTIMÉE (aucun chrono saisi) = incertitude réelle niveau → si VMA réelle <16, allure SL 5:07 deviendrait trop ambitieuse mais ça ne change pas la sécurité D+.
- Plan 7 sem compressé = peu de marge pour étaler, mais user vient avec base solide donc OK.
- S1 = 35% volume hebdo sur SL = au-dessus seuil Hanson 30% mais Expert = tolérance plus large.

### Actions concrètes

- **Aucun patch nécessaire.** Plan validé.
- Backlog : confirmer en welcomeMessage la stratégie "S1 calibrée sur ton vécu D+ 1300m/sem" — message déjà standard mais vérifier qu'il s'imprime pour ce cas.

---

## SYNTHÈSE

| Cas | Verdict | Action |
|---|---|---|
| SEMENT.FRANCOIS | 🟡 Limite | P0 patch live si plan non vécu (pic 68→55) + P1 code injury factor 0.85 |
| MERCIRIRE | 🟢 OK | Rien |

**Découverte clé code** : la modulation `hasInjury` sur `totalReduction` (peak volume) **n'existe pas** dans `geminiService.ts:2984-3023`. Trou de doctrine F-18.1 vs implémentation. À combler P1.
