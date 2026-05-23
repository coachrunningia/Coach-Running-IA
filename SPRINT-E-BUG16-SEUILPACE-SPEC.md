# SPRINT E — Bug 16 : `seuilPace` collé à `allureSpecifiqueSemi` pour profils Elite

> **Découvert sur** : plan Armando `1779071910169` (VMA 18.26, semi 1h20).
> `seuilPace = 3:47` ET `allureSpecifiqueSemi = 3:47` → **identiques**.
> **Sévérité** : **P1 pédagogique** (touche profils Elite uniquement, niche).
> **Phase** : **Sprint E Phase 2** (P1 — pas urgence sécurité).

---

## Diagnostic racine

`calculateAllPaces(vma=18.26)` produit nativement :
- `seuilPace` = `secondsToPace(3600 / (18.26 × 0.87))` = `secondsToPace(226.65)` → **3:47**
- `allureSpecifiqueSemi` = `secondsToPace(3600 / (18.26 × 0.85))` = `secondsToPace(231.97)` → **3:52**

Soit nativement Δ = +5 sec/km (seuil plus rapide que semi : NORMAL pour la majorité des profils où semi tenu < 85% VMA pur).

**Bug réel** : `applyTargetTimeOverride` (l. 1248-1312 `geminiService.ts`) écrase `allureSpecifiqueSemi` par l'allure dérivée du `targetTime` user :
```
targetTime "1h20" → 4800 sec / 21.0975 km = 227.49 sec/km = 3:47
```
Donc `allureSpecifiqueSemi` est **forcée à 3:47** (allure de course visée), et le `seuilPace` reste **lui aussi 3:47** (calcul VMA inchangé).

**Conséquence pédagogique** : le user voit "Seuil = Allure semi" → la séance "Tempo @ seuil" lui demande de courir à allure course en entraînement → contradiction Daniels (le seuil d'entraînement doit être SOUS l'allure course pour rester soutenable sans casse).

Le bug existait avant l'override (Elite "pur" sans targetTime aurait Δ +5 sec qui est déjà très faible). L'override aggrave : il aligne les deux pour les cibles ambitieuses (sub-1h25 = profils où allure semi → 85%+ VMA).

---

## Logique fix

**Doctrine** : `seuilPace` est l'allure d'entraînement (qualité tenable 20-40 min). Doit être **SOUS** l'allure spécifique semi (= course visée) — la course se court plus vite que les séances seuil. Marge cible **≥ 5 sec/km plus LENT que `allureSpecifiqueSemi`** pour profils Elite (Daniels Running Formula : T-pace = HM-pace + 5-10 sec/km pour 1h20-1h30 finishers).

### Patch — dans `applyTargetTimeOverride` (`geminiService.ts` l. 1310)

```ts
const targetPaceStr = secondsToPace(targetPaceSec);
const previous = paces[info.paceKey] as string;
if (previous !== targetPaceStr) {
  const vmaPaceSec = 3600 / vma;
  const ratio = vmaPaceSec / targetPaceSec;
  const ratioInfo = ratio > 1 ? ` (cible = ${(ratio * 100).toFixed(0)}% VMA, ambitieux)` : '';
  console.log(`[Paces] Allure spé ${data.subGoal} : ${previous} → ${targetPaceStr} (cible ${data.targetTime})${ratioInfo}`);
  (paces as any)[info.paceKey] = targetPaceStr;

  // Bug 16 Sprint E — Garantir pédagogie seuil < allure course.
  // Si l'override rapproche l'allure spécifique du seuilPace VMA-based,
  // le seuil doit rester ≥ 5 sec/km plus LENT que l'allure course visée
  // (Daniels T-pace = HM-pace + 5-10 sec/km).
  if (info.paceKey === 'allureSpecifiqueSemi' || info.paceKey === 'allureSpecifique10k') {
    const seuilSec = parseDurationToSec(paces.seuilPace); // helper existant
    const minSeuilSec = targetPaceSec + 5; // seuil ≥ allure cible + 5 sec/km
    if (seuilSec < minSeuilSec) {
      const newSeuil = secondsToPace(minSeuilSec);
      console.log(`[Paces] seuilPace adjusté pour respect pédagogie : ${paces.seuilPace} → ${newSeuil} (allure cible ${targetPaceStr} + 5 sec/km)`);
      paces.seuilPace = newSeuil;
    }
  }
}
```

> `parseDurationToSec("3:47")` doit retourner 227 — utiliser le helper `paceToSeconds` déjà présent dans le fichier (recherche : `min/km` → `sec`).

### Cas où NE PAS ajuster

- `targetTime === 'Finisher'` : pas d'override allure → pas de risque télescopage → ne rien faire.
- Profils débutants VMA < 12 : `seuilPace` naturellement très lent (≥ 5:30), `allureSpecifiqueSemi` très lente aussi (≥ 6:30), Δ déjà large → ajustement no-op.
- Profils où `seuilPace > allureSpecifiqueSemi + 5` déjà : condition `seuilSec < minSeuilSec` faux → no-op.

---

## Tests

`src/services/__tests__/sprint-e-bug16-seuilpace-elite.test.ts` :

1. **Profil Armando (VMA 18.26, cible semi 1h20)** :
   - Expected post-fix : `seuilPace = "3:52"` (= 3:47 + 5 sec), `allureSpecifiqueSemi = "3:47"`
   - Δ = +5 sec/km ✓

2. **Profil Elite VMA 20 + cible 10k en 32min** :
   - allure10k = 3:12, seuilPace VMA-based = 3:27
   - Expected : seuilPace inchangé (3:27 ≥ 3:12 + 5 = 3:17) ✓

3. **Profil débutant VMA 9 + cible semi 2h15** :
   - allureSemi = 6:24, seuilPace VMA-based = 7:39
   - Expected : seuilPace inchangé (7:39 ≥ 6:24 + 5 = 6:29) ✓ (no-op)

4. **Profil Finisher (pas de targetTime)** :
   - Expected : aucun ajustement appliqué, paces.seuilPace = calculateAllPaces output natif

5. **Profil cible marathon 2h45 VMA 18** :
   - allureMarathon = 3:54, seuilPace VMA-based = 3:50
   - Expected : seuilPace ajusté à 3:59 (= 3:54 + 5)
   - **Note** : seuil > allure marathon est inhabituel mais cohérent (le seuil reste sous l'allure 10K, pas sous l'allure marathon). À vérifier coach FFA si on étend la logique au marathon.

---

## Statut Sprint E

**Phase 2 (P1 niche Elite)** — Bug 16 = **P1**. Pas un blocant sécurité. Touche moins de 5% des plans (profils VMA > 17 avec cible chrono ambitieuse). Aucune contre-indication immédiate (l'allure 3:47 est tenable par Armando, c'est juste pédagogiquement incohérent en séance seuil).

**À shipper** : Sprint E Phase 2 avec Bug 4 (pic Trail Ultra) et Bug 3 (SL Lundi) déjà ciblés Phase 2.

**Risques** : élargir au marathon (`allureSpecifiqueMarathon`) pourrait déclencher des ajustements indésirables sur profils Confirmé. **Limiter strictement à `allureSpecifiqueSemi` et `allureSpecifique10k`** en première itération. Marathon = revue Coach FFA séparée.
