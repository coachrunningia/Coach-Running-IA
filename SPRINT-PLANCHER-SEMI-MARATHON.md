# Sprint plancher Semi/Marathon

Date : 2026-05-20
Auteur : Coder (validation Coach 20 ans Pfitzinger Lab)
Statut : Commit local, EN ATTENTE GO Romane pour push + deploy

---

## Contexte

Audit 2 plans Semi (Morgane Déb 3× cv=7 → pic 14 km ; Louleroy Semi (deb détecté
chrono) 4× cv=10 → pic 17 km) : volume hebdo TROP BAS même pour plans < 13 sem
où on calibre volontairement sous Pfitzinger (cible ~65% Pfitzinger).

Cause racine identifiée dans `INVESTIGATION-PLANCHER-VOLUME-SEMI.md` :
`realisticFactor=0.70` universel (geminiService.ts:2458) plafonnait trop bas
le `maxVolume` sur Semi/Marathon où le volume est driver #1 d'adaptation aérobie
(Pfitzinger AM3 + FRR, Daniels Running Formula).

Coach 20 ans refuse 0.90 nu (risque blessure tendineuse), valide 0.85 + garde-fous
SL Débutant.

---

## Modifs appliquées (1 fichier source)

`src/services/geminiService.ts:2462` (bloc CAP VMA-DURÉE) :

### 1. realisticFactor 0.70 → 0.85 (Semi+Marathon uniquement)
```ts
// AVANT
const realisticFactor = 0.70;
// APRÈS
const realisticFactor = (objectiveKey === 'Semi' || objectiveKey === 'Marathon') ? 0.85 : 0.70;
```

### 2. Cap SL Semi Déb cv<10 → slMaxKm ≤ 12 km
Protège tissus tendineux non préparés (ratio SL/volume hebdo Hanson).

### 3. Cap SL Marathon Déb cv<20 freq≤3 → slMaxKm ≤ 18 km
Cas le plus tendu (peu de séances + cv bas) : évite SL pleine 22 km = 60% volume
hebdo = zone rouge tissulaire.

---

## Doctrine respectée

- Pas de modif inputs user (level/cv/target/VMA/freq préservés)
- Pas de modif allure cible (cf. [[feedback_jamais_baisser_allure_cible]])
- Pas de modif détection niveau (cf. [[feedback_input_client_obligatoire]])
- Cible plans courts <13sem reste ~65% Pfitzinger
- Sprint 6 `currentVolume × 1.6` reste plafond ultime S1 (inchangé)

---

## Simulation 10+ profils

| # | Profil | Baseline | Post-patch | Delta | Note |
|---|--------|----------|------------|-------|------|
| 1 | Morgane Semi Déb cv=7 VMA=11 3× | 14 | 16 | +14% | SL ≤ 12 km |
| 2 | Louleroy Semi Déb cv=10 VMA=9.66 4× | 17 | 21 | +24% | cv≥10 pas cap SL |
| 3 | Semi Régulier cv=25 VMA=14 4× | 32 | 37 | +16% | progression saine |
| 4 | Semi Confirmé cv=40 VMA=16 4× | 47 | 45 | -4% | cap MAX_WEEKLY_VOLUME |
| 5 | Marathon Déb 3× cv=15 VMA=11 | 24 | 24 | 0% | cap SL=18 actif (filet) |
| 6 | Marathon Conf 5× cv=50 VMA=16 | 62 | 62 | 0% | cap baseMaxVolume |
| 7 | 10K Régulier cv=20 VMA=13 3× | 24 | 24 | 0% | factor 0.70 conservé |
| 8 | 5K Confirmé cv=30 VMA=15 3× | 35 | 35 | 0% | factor 0.70 conservé |
| 9 | Trail Inter cv=25 VMA=13 3× | 30 | 30 | 0% | factor 0.70 conservé |
| 10 | Semi Déb cv=8 VMA=13 3× | 14 | 18 | +29% | cap SL=12 bite |

---

## Tests

- **Avant** : 295 verts (baseline)
- **Après** : 310 verts (+15 anti-régression nouveau fichier)
- **Build** : OK (`npm run build` exit 0, 166s prerender 37/37 OK)

### Fichier nouveau
`src/services/__tests__/realistic-factor-semi-marathon.test.ts`

15 tests couvrant :
1. Pic relevé sur cas réels (Morgane, Louleroy)
2. Pic relevé sur profils typiques Semi Inter/Conf
3. Pic conservé sur cas Marathon Déb/Conf
4. Pic INCHANGÉ pour 10K/5K/Trail (factor 0.70 conservé)
5. Cap SL Semi Déb cv<10 actif (VMA=13 → bite la SL)
6. Cap SL Marathon Déb cv<20 freq≤3 actif
7. Cap SL désactivé hors scope (cv≥20, level≠Déb, freq>3)

### Fichier ajusté
`src/services/__tests__/minStartVolume-input-respect.test.ts`

1 test ajusté (Expert cv=50 Marathon) : S1 49 km au lieu de 50.
- Cause : baseline triggerait VMA-cap (52km) → progression minimale (59km) → S1=50.
  Post-patch, vmaBasedMaxVolume=63 > maxVolume=54 → cap ne bite plus (correct).
  S1 = max(35, min(50, 54×0.9=48.6)) = 49.
- Doctrine : hard floor cv=50 vs cap 90% peak. S1 ~ 98% cv reste cohérent.
- Test mis à jour avec commentaire explicatif et assertion ≥ 48 (tolérance peak×0.9).

---

## Commit

- Hash : `61fe3b1`
- Branche : `main` ahead origin/main by 1
- Files : 3 (1 source + 2 tests), +255 / -6 lignes

---

## Validation requise avant push

1. **PM 10 ans** : relire diff + check vérité Sprint 6 (currentVolume × 1.6 plafond)
2. **Romane** : décide push + firebase deploy
3. **Audit live** : après deploy, re-fetch 2 plans audités (Morgane/Louleroy) et
   vérifier que les nouveaux plans générés montrent les pics relevés
   (uniquement si user re-génère ou nouveau client similaire ; ne PAS toucher
   aux plans existants S1 commencée — cf. [[feedback_patch_live_plans_jour_seulement]])

---

## Notes pour relecture

- Le cap SL Marathon Déb cv<20 freq≤3 ne bite pas pour VMA bas (~11 km/h). C'est
  voulu : pour VMA bas, le calcul brut slMaxKm est déjà < 18. Le cap reste un
  filet de sécurité pour les rares cas Déb détectés avec VMA élevée (ex : override
  chrono qui détecte Déb sur un coureur avec VMA 13+).
- Le profil 4 (Semi Conf cv=40) baisse de 47→45 : oscillation 2 km due à
  re-calibration en cascade (rate adaptatif, lissage). Reste largement au-dessus
  du seuil viable (45 ≥ minPeakVolume Semi = 32). Pas de régression doctrinale.
- Le profil 5 (Marathon Déb cv=15 VMA=11) ne bouge pas (24 km). C'est OK : le
  système est déjà capé par baseMaxVolume Déb Marathon = 45 et currentVolume×1.6
  = 24. Le patch ne dégrade rien et le cap SL=18 reste en filet de sécurité.

---

## Doctrine cross-références

- `feedback_input_client_obligatoire` : inputs user respectés
- `feedback_jamais_baisser_allure_cible` : allures intactes
- `feedback_patch_live_plans_jour_seulement` : S1 vécue non touchée
- `feedback_jamais_contact_client` : pas de communication client direct
- Sprint 6 : currentVolume×1.6 plafond ultime S1 (préservé)
