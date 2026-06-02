# F-18 — VERDICT COACH PRO FFA 25 ANS

**Auditeur** : Coach pro route/senior/prévention/obésité.
**Scope** : course à pied uniquement (pas trail).
**Délai** : urgence prod.

---

## VERDICT FINAL

> **PATCH F-18.1 IMMÉDIAT** — ne pas revert, ne pas laisser tel quel.

F-18 résout réellement le bug Cyrielle (Semi pic 14 km < 21.1 km = blessure jour J).
Mais l'implémentation écrase 3 protections critiques (BMI ≥30, âge ≥55, hasInjury) en remontant `maxVolume` au plancher brut. Pour un user sain ces planchers sont OK. Pour un user fragile, c'est une **bombe à retardement orthopédique**.

---

## 1. Table MIN_WEEKLY_VOLUME — user JEUNE SAIN

Référentiel coach FFA (pic hebdo prépa, sans modulation) :

| Distance | Coach FFA standard (deb) | F-18 (deb) | Verdict |
|---|---|---|---|
| 5K | 18-22 km | **15 km** | LÉGÈREMENT BAS mais OK (5K = intensité-driven, pas volume) |
| 10K | 25-30 km | **20 km** | UN POIL BAS (norme 2.5× race), acceptable si charge intensité |
| Semi | 30-35 km | **25 km** | LIMITE BASSE mais OK débutant (SL ≈ 15-16 km = 70-75 % race) |
| Marathon | 45-55 km | **35 km** | BAS pour un marathon (norme 50-60). SL pic ≈ 12-13 km = **30 % race seulement** → RISQUE wall + blessure km 30 |

**Cyrielle (35 ans BMI 19.8 cv=2 Semi)** : F-18 force 25 km. SL pic ≈ 8 km × MIN_SL_PROPORTION 0.32 = 8 km ? Non, 25 × 0.32 = **8 km** → soit ~38 % race. **Insuffisant pour finir un semi sans casse.** La norme FFA = SL ≥ 16 km avant un semi. → Le plancher Semi deb=25 reste **trop bas** pour la safety jour J annoncée par F-18 lui-même. Devrait être **30 km deb**.

**Constat 1** : le plancher Marathon deb=35 et Semi deb=25 sont **techniquement insuffisants** pour finir sans blessure. Mais ils sont mieux que rien (pic Cyrielle pré-F-18 = 14 km). Compromis acceptable phase 1.

---

## 2. Cas critiques — verdict honnête

| Cas | Profil | F-18 force | Verdict | Justification |
|---|---|---|---|---|
| A | Marathon deb 57 a BMI 30 cv 5 | 35 km | **DANGEREUX** | BMI 30 + 57 ans → tendons fragilisés. 30 km était déjà optimiste. 35 km = +17 % de stress sur appareil locomoteur surchargé. **Risque fasciite, périostite, rupture méniscale.** |
| B | Semi deb 35 a BMI 19 cv 3 | 25 km | **ACCEPTABLE** | Jeune sain, BMI normal. Le saut cv 3→25 km est rude mais étalé sur 13+ sem = +0.5-1 km/sem. Norme respectée. **OK si plan ≥ 12 sem.** Si plan < 10 sem = revoir. |
| C | 10K deb 65 a BMI 22 cv 5 | 20 km | **ACCEPTABLE limite** | 65 ans = senior réel (vs senior FFA = 35+). Os/tendons en involution. 20 km est le strict minimum, mais BMI normal + sain. Le pipeline original aurait fait 17 km (×0.85 senior). Différence = 3 km. **Pas dangereux mais aurait dû rester 17 km.** |
| D | Marathon Inter 45 a BMI 28 cv 20 | 50 km | **OK** | BMI 28 = surpoids modéré sans déclencheur, cv 20 = base solide, 45 ans = pas senior. Le pipeline original n'aurait pas réduit (pas de trigger). 50 km = norme Inter Marathon. **GO.** |
| E | Marathon deb 30 a BMI 32 cv 15 | 35 km | **DANGEREUX** | BMI 32 + débutant marathon = profil le PIRE pour blessure. Pré-F-18 : 45 × 0.80 = 36 km. Post-F-18 : 35 km. Différence faible MAIS le user obèse classe 1 a besoin de **MOINS, pas du plancher Marathon**. La cible aurait dû être 28-30 km max (charge pondérale × course = stress articulaire genoux/chevilles × 3-5). Surtout : un Marathon BMI 32 débutant **ne devrait probablement pas faire marathon tout court** — séparer scope. |

**Résumé** : 2 cas dangereux (A, E) = profils obèses/seniors. F-18 retire la protection BMI/age sur le plancher.

---

## 3. Patch F-18.1 — modulation du plancher

```ts
const adjustedMin = Math.round(minHebdoForLevel * totalReduction);
if (minPeakVolume < adjustedMin) {
  minPeakVolume = adjustedMin;
}
```

**Validation coach** : **OUI, je valide ce patch**. C'est l'approche correcte.

Vérifications :
- **Cas A** : 35 × 0.80 × 0.85 = 24 km → cohérent avec fragilité BMI 30 + 57 ans. OK.
- **Cas E** : 35 × 0.80 = 28 km → cohérent obèse classe 1 débutant. OK (toujours risqué mais doctrinaire).
- **Cas B** : 25 × 1.0 = 25 km (pas de réduction) → inchangé. OK.
- **Cas D** : 50 × 1.0 = 50 km → inchangé. OK.
- **Cas C** : 20 × 0.85 = 17 km → revient à la protection senior. OK.
- **Cyrielle** : 25 × 1.0 = 25 km → bug résolu. OK.

**Le plafonnement `totalReduction ≥ 0.60`** garantit que le plancher ne descend jamais sous 60 % du plancher brut (ex: Marathon deb min = 35 × 0.60 = 21 km → ce n'est toujours pas le 14 km de Cyrielle). **Cohérence maintenue.**

**Alternative considérée et REJETÉE** : caps durs séparés par injury/BMI/age. Trop de matrices à maintenir. Le `totalReduction` existe déjà, le réutiliser est élégant et auditable.

---

## 4. Cas hasInjury=true

**Constat** : F-18 ne lit pas `hasInjury`. Aucune réduction appliquée. Cas Marathon deb 30 a hasInjury=true cv 5 → forcé à 35 km. **DANGEREUX.**

**Reco** : ajouter dans le bloc `totalReduction` (L2961-2984) :
```ts
if (hasInjury) {
  totalReduction *= 0.75; // -25 % sur le plancher si blessure active
  console.log(`[Periodization] hasInjury → factor ×0.75`);
}
```

Justification FFA : un coureur avec injury en cours = phase de reprise progressive. La règle d'or = **+10 % volume/semaine max** sur sa base actuelle, JAMAIS un plancher externe. Le 0.75 est conservateur (cohérent avec Finisher 0.75).

Avec patch F-18.1 + hasInjury : Marathon deb 30 a injury cv 5 = 35 × 0.75 = **26 km**. Toujours haut pour un blessé mais déclenchera la borne `totalReduction ≥ 0.60` si cumul BMI/age.

---

## 5. Action immédiate recommandée

1. **PATCH F-18.1** (modulation `totalReduction` sur `minPeakVolume`) — DÉPLOI URGENT (< 1 h).
2. **Ajout `hasInjury` dans `totalReduction`** — même PR.
3. **Monitoring 48 h** : alerter sur tout plan Marathon/Semi user BMI ≥ 30 ou âge ≥ 55 généré post-déploi pour audit a posteriori.
4. **Phase 2 (semaine prochaine)** : remonter planchers Marathon deb à 40 km et Semi deb à 30 km pour vrai respect norme FFA 70 % SL/race. À discuter Romane.

---

**Signé** : Coach FFA pro 25 ans. Le risque blessure des cas A et E est réel et documenté en littérature (BMI > 30 × course longue = 3-5× risque blessure overuse). Patch obligatoire avant fin de journée.
