# Audit 3 nouveaux clients S1 (18/05/2026)
Date: 2026-05-18
Source: `audit-3-nouveaux-s1.mjs` (lecture seule, zéro modif Firestore)

> Note méthode : le script initial avait un bug de construction de variantes email pour Armando (`${baseEmail}@${d}` produisait `arenaarmando@com` au lieu de `arenaarmando@hotmail.com`). Corrigé (signature `lookupEmailVariants('arenaarmando@hotmail', [...tlds])`). Armando finalement résolu sur `arenaarmando@hotmail.com`.

---

## Client 1 — antoineg.gde@outlook.fr (Antoine)

**Identité & inputs**
- UID `G1QYJ1KzqqWXoB5BbcjKQFmORC02` • compte créé 2026-05-18 06:38 UTC
- Plan : « Préparation Marathon en 3h00 — 22 sem. » (full=false, plan léger S1)
- 32 ans • IMC 22.2 • Niveau **Expert (Performance)** • VMA **17.59 km/h**
- Volume actuel : **80 km/sem** • aucune blessure
- Chronos récents : 10 km 38:06 / Semi 1h24 / **Marathon 3h12**
- Cible : **3h00** sur Marathon le 18/10/2026 • 6 séances/sem

**1. Allures — VERDICT ✅**
- paces théoriques cohérentes (efPace 5:05, eaPace 4:26, seuilPace 3:55, vmaPace 3:25, marathonSpé 4:16)
- 5/5 séances course de S1 à efPace exact (Δ 0s) — phase fondamentale, normal
- Cohérence chrono cible : VMA 17.59 km/h → temps théorique marathon ≈ 2h59min ; cible 3h00 alignée. Mais ATTENTION : le calcul ignore le chrono Marathon récent (3h12). L'objectif suppose un gain de 12 min en 22 sem (faisable mais ambitieux, jamais signalé au client).

**2. Volume pic + progression — VERDICT ✅**
- Saut S1 : 80→68 km = **−15 %** ✅ (atterrissage doux conforme)
- Pic 90 km en S7 (puis 3 plateaux à 90 km en S11, S15, S19)
- Max augmentation hebdo : +15 % (S8→S9) 🟡 (limite haute mais acceptable Expert)
- Decloads tous les 4 sem (S4, S8, S12, S16) ✅
- Affûtage S20/S21/S22 = 60/53/45 km, soit 50 % du pic en S22 ✅

**3. SL S1 — VERDICT 🟡 (acceptable, mais en haut de cible)**
- SL = **24 km en 2h01** à 5:05/km, D+0
- 35 % du volume S1 (cible 30-40 %) — limite haute ; 30 % du volume actuel user ✅
- Pour un Expert qui court déjà 80 km/sem, 24 km en SL S1 est cohérent et non-risqué.

**4. Faisabilité (R2) — VERDICT ⚠️ BUG D'AFFICHAGE**
- `feasibility.status` = EXCELLENT, `confidenceScore` = 100
- **Message livré au client** : « Avec ta VMA de 17.6 km/h, ton temps théorique sur marathon est d'environ **2h60min**. Ton objectif de 3h00min est cohérent... »
- **Bug critique** : « 2h60min » est mathématiquement faux (60 min = nouvelle heure). Doit afficher « 3h00min » ou « 2h59min ».
- safetyWarning ajoute un avertissement « 22 sem c'est long, viser 20 sem max » — OK doctrine (transparence).

**5. WelcomeMessage — VERDICT ✅**
- 593 chars, ton motivant + recommandation médicale
- Pas de poids/IMC/minceur ✅
- Pas de nutrition ✅
- Aucune allure user citée (cohérent : on n'écrase pas, mais ici on ne mentionne pas non plus → OK car aucune custom pace fournie)
- Titre du plan : « Préparation Marathon en 3h00 — 22 sem. » ✅

**Synthèse & action**
- Plan globalement bien calibré pour Expert 17.59 VMA, mais **objectif 3h00 alors qu'il a fait 3h12 récemment** = gain 12 min jamais explicité dans le message au client. Le calcul théorique VMA→3h00 surestime parce qu'il ne tient pas compte du chrono réel.
- **Action : ne pas régénérer**. Le plan est solide. Surveiller la progression réelle entre S1 et S7. Bug d'affichage « 2h60min » à patcher (cf. synthèse globale).

---

## Client 2 — nabou57@hotmail.fr (Annabelle)

**Identité & inputs**
- UID `Zdxq3nSp88WYjhQ7ghVM4Z51aQA2` • compte créé 2026-05-18 06:28 UTC
- Plan : « Préparation Semi-Marathon en 1h45 — 7 sem. »
- 45 ans • IMC 19.9 • Niveau **Expert (Performance)** • VMA **13.86 km/h**
- Volume actuel : **40 km/sem** • aucune blessure
- Chronos récents : 5 km 23:10 / 10 km 46:54 / **Semi 1h45**
- Cible : **1h45** sur Semi le 05/07/2026 • 4 séances/sem

**1. Allures — VERDICT ✅**
- paces cohérentes (efPace 6:28, semiSpé 4:59)
- 3/3 séances course S1 à efPace exact (phase fondamentale, normal)
- Cohérence chrono cible : 21.097 km en 1h45 → 4:59/km = 87 % VMA, dans la zone 82-90 % VMA ✅
- ⚠️ La cible **= chrono actuel** sur Semi (1h45). Pas une amélioration, donc faisable même sur 7 sem courtes.

**2. Volume pic + progression — VERDICT 🟡 (affûtage agressif)**
- Saut S1 : 40→34 km = **−15 %** ✅
- Pic 43 km en S6 (un seul pic ; pas de double-pic, OK pour 7 sem)
- Max augmentation : +16 % (S5→S6) 🟡 (limite haute)
- Une seule décharge en S4 (−22 %) — cohérent en 7 sem
- **Affûtage S6→S7 : 43→23 km = −47 %** ⚠️ : agressif (cible idéale −25 à −35 %). Comme c'est le seul affûtage, il fonctionne, mais c'est borderline. À surveiller que la fraîcheur reste optimale le jour J.

**3. SL S1 — VERDICT 🟡 (limite)**
- SL = **13 km en 1h24** à 6:28/km
- 38 % du volume S1 (cible 30-40 %) — proche du plafond ✅ tout juste
- 33 % du volume actuel user ✅

**4. Faisabilité (R2) — VERDICT ✅**
- status BON, confidenceScore **73**
- Message : « VMA 13.9 → théorique 1h47, viser 1h45 atteignable ; attention 7 sem = court, plan condensé »
- Honnêteté : le plan signale ouvertement la durée courte ✅ doctrine sécurité > conversion
- safetyWarning : âge 45 → certificat médical + test d'effort ✅

**5. WelcomeMessage — VERDICT ✅**
- 709 chars, ton encourageant, mention explicite « score 73/100 »
- Pas de poids/IMC/minceur ✅
- Pas de nutrition ✅
- Mention bilan cardio-vasculaire pour 45+ ✅ doctrine sécurité
- Titre : « Préparation Semi-Marathon en 1h45 — 7 sem. » ✅

**Synthèse & action**
- Plan honnête et bien transparenté (7 sem signalées comme courtes), faisabilité 73/100 explicite, allure cible = chrono actuel donc faible risque.
- **Action : ne pas régénérer**. Surveiller que le drop S6→S7 (−47 %) ne fait pas perdre trop de fond — c'est un compromis acceptable sur 7 sem.

---

## Client 3 — arenaarmando@hotmail.com (Armando)

**Identité & inputs**
- UID `rZwYWXDBJbMDbaRmZ2yAVcSLVED2` • compte créé 2026-05-18 02:37 UTC
- Plan : « Préparation Semi-Marathon en 1h20 — 13 sem. »
- 48 ans • IMC 22.3 • Niveau **Expert (Performance)** • VMA **18.26 km/h**
- Volume actuel : **80 km/sem** • aucune blessure
- Chronos récents : 10 km 37:00 / **Semi 1h20**
- Cible : **1h20** sur Semi le 15/08/2026 • 6 séances/sem

**1. Allures — VERDICT ✅**
- paces cohérentes (efPace 4:54, semiSpé 3:47, vmaPace 3:17)
- 5/5 séances course à efPace exact + 1 renfo (correct freq=6 → 5 course + 1 renfo ✅)
- Cohérence chrono cible : 21.097 km en 1h20 → 3:48/km = 87 % VMA ✅
- Cible = chrono actuel sur semi (1h20) → faisable, pas une amélioration

**2. Volume pic + progression — VERDICT ✅**
- Saut S1 : 80→68 km = **−15 %** ✅
- Pic 80 km en S3 (très tôt !) puis maintien double-pic à 80 km en S7, plateau S9-S10 à 76 km
- Max augmentation : +16 % (S4→S5) 🟡 (limite haute)
- Decloads S4 et S8 ✅
- Affûtage S11→S13 : 53/47/40 km (−30/−11/−15 %), 50 % du pic ✅

**3. SL S1 — VERDICT ✅**
- SL = **21 km en 1h43** à 4:54/km
- 31 % du volume S1 (cible 30-40 %) ✅ pile dans la cible
- 26 % du volume actuel ✅

**4. Faisabilité (R2) — VERDICT ✅**
- status EXCELLENT, confidenceScore **94**
- Message : « VMA 18.3 → théorique 1h22, cible 1h20 cohérente »
- safetyWarning : âge 48 → certificat médical + test d'effort ✅

**5. WelcomeMessage — VERDICT ✅**
- 845 chars, ton motivant + description phase fondamentale
- Pas de poids/IMC/minceur ✅
- Pas de nutrition ✅
- Bilan cardio-vasculaire 48 ans cité ✅
- Titre : « Préparation Semi-Marathon en 1h20 — 13 sem. » ✅

**Synthèse & action**
- Plan irréprochable. Profil cohérent (Expert, gros vol, chrono déjà au niveau cible).
- **Action : RAS.**

---

## Synthèse globale

### Bugs détectés sur les 3

| Bug | Sévérité | Clients touchés | Localisation |
|---|---|---|---|
| `formatTime` produit `XhYYmin` avec YY=60 (ex. « 2h60min ») | 🔴 Critique (message client trompeur) | Antoine (et tout plan où temps théorique ≈ pile sur l'heure) | `src/services/feasibilityService.ts:119-128` |
| Faisabilité ignore le chrono récent réel (Marathon 3h12) pour calculer la cohérence (utilise seulement VMA→temps théorique) | 🟠 Moyen | Antoine (gain 12 min jamais explicité) | `src/services/feasibilityService.ts:1247-1308` (zone construction message) |
| Affûtage agressif sur plans courts (Annabelle −47 % en 1 sem) | 🟡 Mineur | Annabelle | Logique périodisation (`planUtils.ts` ou `geminiService.ts` selon où l'affûtage est calculé) |
| Saut hebdo +15-16 % récurrent (limite supérieure) | 🟡 Mineur | les 3 (Antoine S8→9, Annabelle S5→6, Armando S4→5) | Périodisation — cohérent doctrine Expert mais à monitorer |

### Patches code/prompt à prévoir

**Patch 1 — `formatTime` bug `XhYYmin` (PRIORITÉ HAUTE)**

Fichier : `src/services/feasibilityService.ts:119-128`

Avant :
```ts
export function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  ...
}
```

Bug : si `minutes = 179.7`, `Math.floor(179.7/60) = 2` et `Math.round(179.7 % 60) = Math.round(59.7) = 60` → « 2h60min ».

Justification de l'existant : la fonction sépare h et min séparément pour affichage lisible. Pourquoi remplacer : `Math.floor` sur les heures + `Math.round` sur les minutes ne sont pas cohérents quand le résultat arrondi des minutes franchit 60.

Patch suggéré (arrondir D'ABORD le total, puis splitter) :
```ts
export function formatTime(minutes: number): string {
  const total = Math.round(minutes); // arrondi unique
  if (total >= 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Patch 2 — Prise en compte du chrono récent dans la faisabilité (PRIORITÉ MOYENNE)**

Quand un user fournit un chrono récent sur la distance cible (ex. `distanceMarathon` pour un goal Marathon), la faisabilité doit comparer cible vs chrono récent (et pas uniquement vs temps théorique VMA). Sinon on encourage des objectifs irréalistes sans le dire (ex. Antoine 3h12→3h00).

Fichier : `src/services/feasibilityService.ts:1247-1308` (construction message). Ajouter une branche : si `recent[distanceCible]` existe, calculer le gain demandé et le mentionner explicitement dans le message (doctrine transparence + sécurité).

**Patch 3 — Affûtage minimum sur plans courts (PRIORITÉ BASSE)**

Pour des plans ≤ 7 sem, plafonner le drop d'affûtage à −35 % en un saut pour préserver l'allure spécifique. À évaluer (compromis < tradition d'affûtage long).

### Action immédiate par client

| Client | Action | Régénération ? |
|---|---|---|
| Antoine | RAS plan. Patcher bug « 2h60min » côté code pour futurs plans Marathon | Non |
| Annabelle | RAS plan. Monitorer drop affûtage S6→S7 | Non |
| Armando | RAS, plan irréprochable | Non |

Aucun bug critique sur le plan (allures, volume, SL) chez les 3 clients. Le seul bug bloquant est le **message « 2h60min »** côté faisabilité Antoine — à patcher proactivement avant que ce client (ou tout autre dans le même cas) ne le voie. Aucun contact client direct (doctrine respectée).
