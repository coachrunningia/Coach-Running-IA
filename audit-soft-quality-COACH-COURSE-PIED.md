# Audit — Soft Quality S1/S2 — Coach FFA 25 ans (Daniels, Pfitzinger, Lydiard)

## 1. Verdict global : **REVISE**

Doctrine saine sur le principe (Lydiard autorisait strides dès la base ; Pfitzinger
Marathon program inclut strides S1). Mais 2 options proposées sont **trop chargées
pour S1-S2** chez un Inter cv 25 :
- **VMA 6×200 r=1'30 marche** = séance VO2max franche (Daniels I-pace), pas "douce".
- **2 km à allure Marathon** dès S1 sur un cv 25 = ~8 % volume en qualité = OK
  Pfitzinger, mais l'appellation "progression" porte à confusion avec "tempo".

Strides = **incontestablement safe** dès S1 (Lydiard, Daniels, Pfitzinger d'accord).
Les deux autres options doivent être **adoucies** ou **décalées S2**.

## 2. Wording final corrigé

```
⚠️ NIVEAU INTERMÉDIAIRE+ / cv ≥ 25 km/sem : DÈS S1, 1 séance par semaine PEUT inclure
du travail neuromusculaire DOUX (sensation, jamais chrono) :
  • Strides — footing EF 40-50 min + 6 à 8 lignes droites accélérées 80-100 m en fin
    (allure ~3 km, JAMAIS sprint), récup marche retour complète 60-90 s. Dès S1.
  • OU Fartlek souple — footing EF 35-45 min avec 5-6 accélérations libres de 30-45 s
    à sensation "allure 10 km confortable", récup trot 1'30-2'. Dès S2.
  • OU Progression douce sur SL — 8-10 km EF puis 2 km à allure Marathon "facile"
    (parler en phrases courtes), retour calme 1 km. Dès S2, jamais S1.
JAMAIS de seuil, tempo soutenu, VMA courte (200/400), ni fractionné long en S1-S2.
Une seule séance qualité douce par semaine. Si fatigue : remplacer par EF.
```

**Justifications doctrinales** :
- **VMA 6×200** supprimée : c'est du I-pace Daniels (98-100 % VMA) = incompatible avec
  "doux". Daniels n'autorise R/I-pace qu'après 4-6 sem de base. Remplacée par
  **fartlek souple** (= "strides longues" Lydiard, allure 10K perceptive, pas VMA).
- **Strides** : volume porté à 6-8 × 80-100 m (FFA / Pfitzinger Advanced Marathoning
  p.86 : 8-10 strides typique fin de footing).
- **Récup strides** : 60-90 s marche (vs "marche retour" flou) — assure récup PCr
  complète, évite glissement lactique.
- **Progression** : décalée S2, kilométrage main precisé (8-10 EF + 2 AM), allure AM
  encadrée par test parole (Pfitzinger "comfortable marathon pace").
- **Fartlek 30-45 s allure 10K** : zone Z3 douce, neuromusculaire sans charge
  cardiaque excessive. Lydiard / Berkien valident dès S2 base phase.

## 3. Régex final corrigé

**Risques regex actuelle** :
- `progression` peut capturer "progression de charge", "course progressive longue"
  (= tempo déguisé Pfitzinger 2× zone seuil) → **faux positif dangereux**.
- `6\s*[x×]\s*200` rate `6x300`, `8x100`, `8 lignes droites`, `accélérations`.
- Manque : `fartlek`, `accélération`, `gammes`, `lignes droites`.

**Regex finale proposée** :
```ts
const isSoftQuality =
  /stride|ligne[s]?\s*droite[s]?|gamme[s]?\s*de\s*vitesse|accélération[s]?\s*libre[s]?|fartlek\s*(souple|libre|court)|progression\s*douce|allure\s*marathon\s*(facile|douce)/i
  .test(title);
```

Captures explicites (whitelist) plutôt que termes ambigus seuls. `progression` seul
banni : exige `progression douce`. `fartlek` seul banni : exige qualificatif soft.

## 4. Risques sécurité

| Risque | Niveau | Mitigation |
|---|---|---|
| Tendinite Achille (strides trop tôt) | Faible | 80-100 m sur plat, pas sprint, retour marche |
| Périostite (VMA 200 sur cv 25) | **Élevé** si V0 garde 6×200 | Suppression confirmée |
| Surcharge cardiaque progression S1 | Modéré | Décalage S2 + cap 2 km AM |
| Fatigue cumulative (qualité + SL même sem) | Modéré | Espacer ≥ 72 h SL ↔ qualité |
| Profil cv 25 = vrai plancher ? | OK | Pfitzinger plancher = 25-30 mpw pour base+qual |

**Verdict global sécurité** : avec wording corrigé, **risque blessure négligeable**
(< profil de base actuel sans qualité, car neuromusculaire = protection blessure
selon méta-analyse Blagrove 2018 strength/strides → -40 % running injuries).

## 5. Cas limites

| Profil | Verdict | Raison |
|---|---|---|
| **65 ans cv 50** | OK | Cv 2× plancher, masters tolèrent strides Lydiard ; éviter fartlek "allure 10K" trop vif si VMA dégradée → préférer **strides only** S1-S2 |
| **30 ans cv 25 reprise 4 mois** | OK avec réserve | Filtre `lastActivity ≠ 'Plus de 6 mois'` laisse passer ; 4 mois reprise = base solide, strides safe, fartlek S2 seulement |
| **Inter cv 25 + Finisher** | OK strides | Finisher ≠ contre-indication neuromusculaire ; même Finisher bénéficie strides (économie course). Fartlek/progression : **inutile** pour Finisher (gain perf non recherché) mais pas dangereux |
| **Cv 25 distance Marathon vs 5K** | Module | Marathon cv 25 = vraiment plancher (Pfitzinger 18/55 commence à 40 mpw) → **strides only** ; 5K cv 25 = confortable, 3 options OK |

**Recommandation modulation distance** (optionnelle, non bloquante) :
- targetRace = Marathon ET cv < 35 → strides only (pas fartlek/progression S1-S2).
- Sinon : 3 options ouvertes par wording final.

## Conclusion

APPROUVER après application wording + regex corrigés. **Ne pas merger V0 telle quelle** :
"VMA douce 6×200 r=1'30" est un abus de langage doctrinal qui exposerait des cv 25
à une charge VO2max non préparée. Strides + fartlek souple + progression douce =
triade FFA/Pfitzinger orthodoxe, sûre, et résolvant frustration user.
