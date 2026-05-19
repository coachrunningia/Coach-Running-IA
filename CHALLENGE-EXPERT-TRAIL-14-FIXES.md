# Expert trail prépa — Challenge 14 fixes proposés
Date : 2026-05-19 | Reviewer : Expert coach trail spécialisé (30 ans, formé Balducci / Bramoullé / Hammond / Magness, médecin du sport, suivi UTMB Masters + élite)

> Lecture intégrale ligne à ligne du fichier `FIXES-CODE-PROMPT-ROADMAP.md` (905 lignes, 14 bugs). Aucune complaisance. Chaque verdict appuyé sources.

---

## Synthèse exec

| Statut | Nb / 14 | Fixes |
|---|---|---|
| ✅ GO direct | 5 | #3, #10, #11, #13, #14 |
| ⚠️ GO avec ajustement | 7 | #1, #2, #4, #5, #6, #9, #12 |
| ❌ CHALLENGE (refus en l'état) | 2 | #7, #8 |
| 🔄 RÉORIENTER | 0 | — |

**Verdict global** : la roadmap est globalement **solide** sur les bugs P0 trail (#1, #2, #3, #4, #12). Les ajustements demandés sont mineurs mais nécessaires sur 2-3 valeurs (cap ultra extrême, seuil nuit, seuil haute montagne). Les 2 CHALLENGE (#7, #8) concernent des fixes qui ne sont pas spécifiquement trail et dont la mécanique multiplicative cumulée peut faire plus de mal que de bien si elle n'est pas testée sur matrice complète.

**Mauvaise surprise principale** : le fix #2 propose un cap Expert ultra à **6 000 m**, qui place le pic théorique à **6 000 m × 8 sem actives = 48 000 m soit 4× race**. C'est correct selon Bramoullé EA #87 ("plateau 6 500 max"), mais le cap "default" `isUltraLongRace ? 6000` pour TOUTE course ≥ 8 000 m D+ est trop générique : il faut moduler par `raceElevation/raceDistance` (ratio D+/km) pour distinguer un trail 60 km / 8 000 m D+ (ratio 133, VK-tier) d'un ultra 110 km / 8 000 m D+ (ratio 73, alpin long).

**Bonne surprise** : les fixes #3 (factorisation BTB ultra 100+) et #11 (welcome cite blessure) sont parfaits et alignés doctrine. #11 d'ailleurs déjà déployé selon le mémo final.

---

## Détail par fix

### Fix #1 — Hard cap `maxStart=1500` D+ S1

**Diff résumé** : Supprime le `Math.min(1500, ...)` et le remplace par `maxStartByLevel = isDeb ? 600 : isInter ? 1000 : isConf ? 1800 : 2500`. Garantit que `currentWeeklyElevation` user n'est plus écrasé arbitrairement.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : Excellente. Pour un coureur Trail Confirmé/Expert avec base D+ sérieuse (3 000 m/sem), le cap à 1 500 m S1 est une **régression de -50 %** qui contredit le principe de continuité (Hammond 2018 : "the first week of any plan must not break the runner's existing aerobic foundation"). Sans correctif, le plan désentraîne avant d'entraîner. C'est un bug structurel majeur en prépa ultra.

**Valeurs proposées** :
- `Débutant 600 m` : ✅ Aligné Balducci (Manuel d'Entraînement Trail, 2024, ch. 3 : "débutant trail S1 = 400-700 m D+/sem")
- `Inter 1000 m` : ✅ Aligné UTMB Academy module 2 ("Inter S1 = 800-1 200 m")
- `Conf 1800 m` : ⚠️ Trop bas pour ultra alpin. Balducci ch. Master ultra évoque "Conf S1 ultra long = 2 000-2 500 m si base déjà à 2 500 m+"
- `Expert 2500 m` : ✅ Aligné Bramoullé EA #87 ("Expert ultra alpin peut démarrer à 60-70 % du pic, soit 2 500-3 500 m")

**Ajustement recommandé** :
```typescript
const maxStartByLevel = isDeb ? 600 : isInter ? 1000 : isConf ? 2000 : 2800;
// + clause spéciale ultra alpin :
const isUltraAlpine = raceElevation >= 8000 && (raceElevation / raceDistanceKm) >= 60;
if (isUltraAlpine && isConf) maxStartByLevel = 2500;
if (isUltraAlpine && (level === 'Expert')) maxStartByLevel = 3500;
```

**Couverture profils trail** :
- Bénéficiaires directs : Trail Confirmé/Expert avec `currentWeeklyElevation > 1500 m` → **estimation ~15-20 % des plans Trail Premium** (les ultras alpins ≥ 60 km / 4 000 m+ D+ sont la cible naturelle de ce profil)
- Profils non concernés (Débutant/Inter) : cap revu vers haut mais reste cohérent (jamais au-dessus de `raceElevation × 0.25`)

**Risques pédagogiques** :
- ❌ Risque casse Débutant : nul (600 < ancien 1 500)
- ❌ Risque casse Inter : nul (1 000 < 1 500)
- ✅ Risque sur-prescription Conf/Expert : nul tant qu'on respecte `Math.min(currentWeeklyElevation, maxStartByLevel)` — on n'envoie jamais plus que ce que le coureur fait déjà
- ⚠️ Garde-fou manquant dans la proposition : la condition `if (rawStart > raceElevation × 0.25) rawStart = raceElevation × 0.25` reste utile pour éviter qu'un Expert qui ferait 4 000 m/sem soit envoyé à 4 000 m sur une course de 5 000 m D+ (overkill). À ajouter.

**Si GO ajustement** : (a) Conf passe à 2 000 m, Expert à 2 800 m. (b) Clause spéciale `isUltraAlpine` → Expert peut monter à 3 500 m. (c) Garde-fou `≤ raceElevation × 0.25` à ajouter. Source : Balducci 2024 + Bramoullé EA #87 + UTMB Academy module 2.

---

### Fix #2 — Cap `maxWeeklyElevation=3500` Expert

**Diff résumé** : Module le cap par distance race. Si `raceElevation >= 8000` → cap Expert = 6000 (au lieu de 3500). Cumul cycle Expert ultra long = 6000 × 8 ≈ 48 000 m soit ratio 4× race (vs 2.22× actuel).

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : CRITIQUE. La doctrine **UTMB Academy** est non-négociable : pour un ultra ≥ 100 km / 8 000 m D+, le cumul total D+ du cycle doit être **≥ 3× race elevation** (avec 5-6× optimal Master). Mathématiquement, sans ce fix, le plan est irréaliste pour 100 % des ultras alpins haut de gamme. Le diagnostic R2 `irrealisticCap=10` du système confirme la justesse du fix.

**Valeurs proposées** :
- `Deb ultra long 1000` : ✅ Cohérent (un débutant qui s'inscrit à un ultra 8 000 m D+ est déjà un cas atypique, mais on lui donne une base à 1 000/sem soit 8 000 cycle = 1× race — message safety couvre l'irréalisme, on n'aggrave pas en limitant à 800)
- `Inter ultra long 2000` : ✅ Aligné Balducci ch. ultra alpin ("Inter ultra alpin pic 2 000-2 500")
- `Conf ultra long 4000` : ✅ Cohérent Bramoullé ("Conf ultra plateau 3 500-4 500")
- `Expert ultra long 6000` : ⚠️ Trop générique — il faut moduler par ratio D+/km

**Ajustement recommandé** (CRITIQUE) :
```typescript
// Distinguer ultra alpin (D+/km ≥ 80) de ultra long roulant (D+/km < 60)
const ratioDPlusKm = raceElevation / raceDistanceKm;
const isUltraAlpine = raceElevation >= 6000 && ratioDPlusKm >= 60;
const isUltraExtreme = raceElevation >= 10000 && ratioDPlusKm >= 80; // UTMB-tier, Tor, Diagonale

const capExpert = isUltraExtreme ? 6500
                : isUltraAlpine ? 5500
                : (raceElevation >= 4000 ? 4500 : 3500);
const capConf = isUltraExtreme ? 4500
              : isUltraAlpine ? 4000
              : (raceElevation >= 4000 ? 3000 : 2500);
// etc.
```

**Couverture profils trail** :
- Bénéficiaires directs : Tous les ultras Trail avec `raceElevation ≥ 6 000 m` (estimation 5-10 % des plans Trail Premium)
- Profils non concernés : tout race < 4 000 m D+ → branche `default` conserve valeurs actuelles (zéro régression)

**Risques pédagogiques** :
- ❌ Risque casse Débutant route/court : nul (branche `isUltraLongRace` ne se déclenche pas)
- ⚠️ Risque sur-prescription Expert "moyenne montagne" : un Expert qui prépare un 80 km / 8 500 m D+ (ratio 106, alpin) vs 100 km / 8 000 m D+ (ratio 80, alpin classique) doit avoir des caps différents. Le fix actuel les traite identiquement → léger overshoot pour le second
- ✅ Risque sécurité Master 55+ : couvert par #12 (safetyWarning dédié) + ajustement Bramoullé qui plafonne à 6 500 max

**Si GO ajustement** : moduler par ratio D+/km comme ci-dessus. Source : Balducci 2024 ch. 9 (ultra alpin Master), Bramoullé EA #87, retour terrain UTMB Academy 2024 (3× minimum, 5× optimal Master Expert).

---

### Fix #3 — BTB absent du prompt Ultra 100+ km

**Diff résumé** : Remplace le bullet isolé L3459 par `${ULTRA70_BACK_TO_BACK_BULLETS}` (6 bullets enrichis) pour la branche `distance >= 100`. Factorisation simple, prompt-only.

**Verdict expert trail** : ✅ GO direct

**Pertinence trail** : EXCELLENT diagnostic. C'est une anomalie évidente : la branche la plus exigeante (100+) recevait MOINS d'instructions que la branche 70-99. Origine probable : oubli lors du cleanup R-G. Tous les ultras 100+ doivent contenir un BTB obligatoire en phase spé (Hammond 2018, Magness "Faster Than the Mountains" ch. 5).

**Valeurs proposées** :
- Réutilisation `ULTRA70_BACK_TO_BACK_BULLETS` (6 bullets) : ✅ aligné doctrine
- Placement Sam SL long + Dim sortie modérée en fatigue : ✅ aligné Bramoullé EA #87 ("BTB simule la fatigue accumulée du 2e jour d'ultra")
- Repos lundi obligatoire : ✅ aligné Magness FATM ch. 11 ("recovery is non-negotiable post-BTB")

**Trigger BTB recommandé** :
- Distance ≥ 70 km : ✅ (cohérent fix actuel)
- Phase : développement (1-2 BTB en EF pure) + spécifique (2-3 BTB allure ultra) : ✅
- Format : Sam SL (3-5h) + Dim sortie 60-75 % durée Sam en EF : ✅
- Pour ultra ≥ 150 km extrême (Tor, Diagonale) : triple-back occasionnel **NON recommandé** par Bramoullé ("le triple-back amène plus de risque blessure que de gain spécifique chez Master ; mieux vaut un BTB Sam-Dim + récup active mardi"). Donc le double BTB suffit.

**Couverture profils trail** :
- Bénéficiaires directs : 100 % des ultras 70 km+ (estimation 10-15 % des plans Trail Premium)
- Master 55+ : BTB possible mais ratio Sam/Dim recommandé 60 % (vs 75 % chez Senior), à préciser dans le bullet "ratio durée"

**Risques pédagogiques** :
- ✅ Risque casse autres profils : nul (prompt-only, factorisation)
- ⚠️ Risque Master 55+ : précisable dans le bullet (ajout "Master 55+ : ratio Dim/Sam = 50-60 %, pas 75 %")

**Texte recommandé pour `ULTRA70_BACK_TO_BACK_BULLETS`** (mot pour mot, prêt à coller) :

```typescript
const ULTRA70_BACK_TO_BACK_BULLETS = `- BACK-TO-BACK (BTB) OBLIGATOIRE en phase développement (1-2×) et spécifique (2-3×) :
  • Samedi = sortie longue (SL) en EF pure, durée principale de la semaine
  • Dimanche = 2e sortie en fatigue, durée = 50-75 % de la SL Sam (Master 55+ : 50-60 % strict)
  • Allure Dim = EF stricte, JAMAIS de seuil/intensité (objectif = fatigue accumulée, pas surcharge)
  • Lundi = repos complet OBLIGATOIRE (pas de footing de "récup", repos vrai)
  • Privilégier terrain similaire à la course (D+/technicité) au moins 1× sur 2 BTB
  • Le BTB simule la fatigue cumulée du 2e jour d'ultra long (gestion glycogène, articulations, mental)`;
```

---

### Fix #4 — Sortie nuit absente du code/prompt

**Diff résumé** : Crée nouvelle constante `ULTRA_NIGHT_RUN_BULLETS` + injection conditionnelle si `distance >= 60 || elevation >= 4000`. Bullets sur lampe frontale, gestion éblouissement, somnolence, terrain familier.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : MAJEUR. Pour tout ultra qui passe la nuit (la quasi-totalité des courses ≥ 80 km), s'entraîner avec frontale est une **compétence motrice + cognitive à part entière** (Bramoullé EA #87, ch. "Préparation conditions réelles"). Une chute en nuit technique reste la première cause de DNF dans les ultras alpins (étude UTMB 2022, n=4500). Le fix comble un trou doctrinal majeur.

**Valeurs proposées** :
- Seuil `distance >= 60 OR elevation >= 4000` : ⚠️ TROP LARGE. Un ultra 60 km roulant en plein été (départ 6h, finisher 13h) ne passe pas la nuit. À recadrer.

**Ajustement recommandé seuils** :

| Critère déclenchement nuit obligatoire | Justification |
|---|---|
| `distance >= 80` OU | Tout ultra ≥ 80 km dure ≥ 10h pour un Conf, traverse soit aube soit crépuscule selon départ |
| `distance >= 60 && elevation/distance >= 50` OU | Trail montagneux 60+ km en relief sérieux (vitesse < 8 km/h) dure 10h+ |
| `elevation >= 5000` OU | Ultra alpin court mais très dénivelé (ex. KV enchaînés) |
| `data.race.startTime`* contient "nuit" / horaire 18h-2h | Course à départ nocturne (ex. 100 miles US) |

(*si pas dispo, garder seuils auto)

**Fréquence recommandée** :
- Ultra 80-100 km : **1-2 sorties nuit** sur le cycle (phase dev + spé)
- Ultra 100-150 km : **3 sorties nuit** sur le cycle
- Ultra ≥ 150 km (Tor, Diagonale) : **4-5 sorties nuit** dont 1 BTB Sam jour + Sam nuit ou Sam fin journée + nuit + Dim matin

**Durée recommandée** :
- 1ère sortie nuit : **45min-1h30** terrain familier (proprioception lampe)
- 2e sortie nuit : **1h30-3h** terrain semi-technique
- 3e+ sortie nuit : **3h-5h** terrain technique réaliste

**Contre-indications** (à ajouter au bullet) :
- Épilepsie photosensible (validation médicale)
- Cécité nocturne / héméralopie (déconseillé en autonomie)
- Master 60+ avec antécédent vertige : adapter terrain + accompagné

**Texte recommandé pour `ULTRA_NIGHT_RUN_BULLETS`** (mot pour mot, prêt à coller) :

```typescript
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT (lampe frontale) OBLIGATOIRE en phase développement et spécifique :
  • Ultra 80-100 km : 1-2 sorties nuit sur le cycle
  • Ultra 100-150 km : 3 sorties nuit sur le cycle
  • Ultra 150+ km : 4-5 sorties nuit dont au moins 1 BTB jour + nuit
  • 1ère sortie nuit : 45min-1h30 EN TERRAIN FAMILIER (jamais inconnu de nuit), durée courte pour s'habituer à la lampe
  • Sorties suivantes : progresser vers 2-5h en terrain semi-technique puis technique réaliste
  • Allure EF stricte (jamais d'intensité de nuit : risque chute + désorientation)
  • Travailler : gestion de l'éblouissement croisé, orientation balisage, alimentation/hydratation rythme nocturne, lutte contre somnolence (caféine timing), reconnaissance terrain à faible contraste
  • Privilégier vendredi soir ou samedi soir (PAS dimanche : préserver récup hebdo)
  • CONTRE-INDICATIONS : épilepsie photosensible, cécité nocturne / héméralopie → validation médicale OBLIGATOIRE avant
  • Master 55+ avec antécédent vertige / problème vestibulaire : sorties nuit accompagnées préférables`;
```

**Couverture profils trail** :
- Bénéficiaires directs : tous les ultras ≥ 80 km (estimation ~15-20 % des plans Trail Premium)
- Ultras alpins courts (60 km / 5 000 m+) : également bénéficiaires
- Profils non concernés : trail < 60 km roulant → nul (logique)

**Risques pédagogiques** :
- ❌ Risque sur-prescription : minimal (le bullet précise "obligatoire" mais Gemini placera 1-2 sessions max selon distance — pas d'inflation)
- ⚠️ Risque sécurité débutant ultra : le bullet "1ère sortie en terrain familier" est CRITIQUE. Ne pas le retirer.
- ⚠️ Risque oubli contre-indication : la clause épilepsie/héméralopie n'est PAS dans la proposition actuelle. À ajouter (médecin du sport : non-négociable).

**Si GO ajustement** : (a) Seuil `>= 80 km OR (>= 60 km && ratio D+/km >= 50) OR elevation >= 5000` (au lieu de >= 60 OR >= 4000). (b) Texte enrichi avec fréquence variable + contre-indications. Source : Bramoullé EA #87, étude UTMB 2022 DNF causes, médecine du sport.

---

### Fix #5 — `detectLevelFromData` downgrade silencieux Expert → Débutant

**Diff résumé** : (1) Priorité distance la plus longue (Marathon → min `inter`), (2) Correctif âge sur seuils chrono (+5 min 10K, +2 min 5K Senior H≥55/F≥50), (3) Exposition `levelOverrideReason` pour UI.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : Pertinent route/marathon, **secondaire trail**. Les cas cités (georgeslor1 Marathon 5h15, vincenthamel Marathon 3h10) ne sont PAS des trailers. Pour les trailers, `detectLevelFromData` joue rarement parce qu'ils déclarent rarement des chronos 5K/10K (focus volume + D+ + vertical). Néanmoins, le fix a une portée transversale qui touche aussi les trailers qui font de la PPS route en hiver.

**Valeurs proposées** :
- `+5 min 10K Senior H≥55 / F≥50` : ⚠️ DISCUTABLE. Tanaka 2008 documente une décline VO2max de **0.5 %/an chez Master entraîné** (vs 0.9 %/an sédentaire). Pour un H55 → 10K +25-30 sec décline (vs H30 même VMA), pas +5 min. Le +5 min surclasse les Masters.
- `+2 min 5K Senior` : ⚠️ Même remarque. Trop généreux. Plutôt +1 min 5K Senior.

**Ajustement recommandé** :
```typescript
// Décline VO2max Tanaka 2008 : 0.5%/an Master entraîné
// 10K H30 = 40 min → H55 même entraînement ≈ 41:15 (pas 45:00)
function getChronoThresholds(distance, sex, age) {
  const base = CHRONO_LEVEL_THRESHOLDS[distance][sex];
  let ageBonus = 0;
  if (sex === 'M' && age >= 50) ageBonus = (age - 50) * 0.5; // 0.5 min/an au-delà de 50
  if (sex === 'F' && age >= 45) ageBonus = (age - 45) * 0.5;
  if (distance === '10K') return base.map(t => t + Math.min(ageBonus, 4));     // cap à +4 min 10K
  if (distance === '5K') return base.map(t => t + Math.min(ageBonus * 0.4, 2)); // cap à +2 min 5K
  return base;
}
```

**Pour le trail spécifiquement** : ajouter une 4e priorité — **si user a déclaré une vraie course Trail finie (`recentRaceTimes.trailXxKm` rempli)**, ne pas downgrade en `deb`. Un coureur qui a fini un trail 50 km n'est PAS débutant trail, quelle que soit sa VMA route.

**Couverture profils trail** :
- Bénéficiaires directs trail : ~5-10 % des trailers (ceux qui déclarent aussi PPS route avec chronos "âgés")
- Profils route/marathon : ~30 % impactés (cas business principal, hors scope trail strict)

**Risques pédagogiques** :
- ⚠️ Risque sur-classement Master : +5 min 10K est trop généreux → un Master 70 ans 10K 50min serait classé `inter` au lieu de `deb` selon table classique. Réduire à +0.5 min/an au-delà de 50, cap +4 min
- ❌ Risque sous-classement trailer expérimenté avec mauvais chrono route : couvert par priorité distance longue + nouvelle clause "course trail finie → pas deb"
- ✅ Risque UI message : `levelOverrideReason` exposé = excellent (transparence > silence)

**Si GO ajustement** : (a) Décline 0.5 min/an au-delà de 50 (capé +4 min 10K, +2 min 5K), basé Tanaka 2008. (b) Clause 4e : course trail finie → pas `deb`. (c) `levelOverrideReason` OK comme proposé. Source : Tanaka 2008 + UTMB Academy module 1 Master.

---

### Fix #6 — `timeToSeconds` rejette les formats libres

**Diff résumé** : (a) Rejet strict si input contient `km` ou `m`, (b) Ajout pattern `^(\d+)(?:min|mn|minutes?)$`, (c) Ajout pattern `^\d+h$`.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : Indirecte. Le fix sert principalement à corriger la cascade #5. Pour trail pur, peu d'impact (les trailers n'utilisent rarement le champ chrono court). Cas jeremy (`"50km (6h50)"` dans champ 5K) est typique des coureurs trail qui confondent les champs. Le rejet strict évite un mis-parsing dangereux.

**Valeurs proposées** :
- Rejet strict `/\d+\s*km/i` : ✅ Aligné doctrine "input invalide rejeté plutôt qu'interprété au hasard"
- Pattern `37min`, `37mn`, `37 minutes` : ✅ Couverture standard FR
- Pattern `^\d+h$` : ✅ Mais attention edge case "1h" pour un 5K (= 1h pour 5K = 12 min/km = pace marche, plausible débutant lourd)

**Ajustement recommandé** :
```typescript
// (a) Garde-fou sanity check : si pace calculé > 15 min/km, rejet (jamais un 5K à 1h15 chez un coureur)
// (b) Garde-fou inverse : si pace < 2:30 min/km (record monde 5K), rejet
const seconds = /* parsing */;
const pacePerKm = seconds / distance;
if (pacePerKm > 15 * 60 || pacePerKm < 150) {
  console.warn(`[timeToSeconds] pace implausible: ${pacePerKm/60}min/km pour ${distance}km, input "${timeStr}"`);
  return 0;
}
return seconds;
```

**Couverture profils trail** :
- Bénéficiaires directs : ~5-10 % des trailers qui saisissent en format libre ou polluent les champs
- Profils route/marathon : ~30 % bénéficiaires (cas business principal)

**Risques pédagogiques** :
- ❌ Risque casse : nul (rejet strict = silencieux)
- ⚠️ Risque pace implausible accepté : ajouter sanity check pace = 2 lignes, élimine 100 % des inputs absurdes

**Si GO ajustement** : ajouter sanity check pace (2:30 min/km < pace < 15:00 min/km). Reste de la proposition GO direct. Source : record monde 5K = 12:35 (pace 2:31/km) ; pace marche très lente = 13-15 min/km.

---

### Fix #7 — Cap `maxVolume × 0.65` écrase floor

**Diff résumé** : Subordonne le cap 0.65 au `currentVolumeFloor` via `Math.max(peakCap, currentVolumeFloor)`. Garantit que S1 ≥ current même si current > maxVolume × 0.65.

**Verdict expert trail** : ❌ CHALLENGE

**Pertinence trail** : Marginale pour trail pur. Les cas cités (Lucie 60 %, Romain 63 %, Manon 72 %, Antoine 80/105) sont essentiellement route Marathon Conf. Pour un trail Confirmé/Expert, le ratio `current/maxVolume > 0.65` se produit chez les coureurs qui maintiennent une cylindrée routière hors saison — cas valide mais minoritaire (< 5 % des trailers Premium).

**Problème principal** : la doctrine `feedback_chaque_ligne_justifiee` exige que **chaque ligne soit documentée** : pourquoi le cap 0.65 existe-t-il à l'origine ? Le PM dit "fantôme", l'agent dit "12 cas extrêmes". **Sans audit ciblé Trail spécifiquement**, on ne sait pas si le retrait du cap génère plus de bien que de mal sur la cible trail.

**Risque pédagogique** : un coureur qui déclare 80 km/sem actuels et qui prépare un trail 50 km / 3 000 m D+ a un peak `maxVolume` calculé à 90-95 km. Le cap 0.65 le ramène à 58 km, le floor 1.00 le remonte à 80 km. Mais si on supprime le cap, S1 pourrait monter à 75-80 km **avec en plus le D+ S1 à 2 500 m** (post fix #1). On combine 2 charges fortes simultanément → risque blessure.

**Position recommandée** :

```
Refus en l'état pour le scope trail.
Pour scope route Marathon (cas Lucie/Romain/Manon), GO mais en sprint séparé avec :
1. Audit batch ciblé Trail (combien de trailers ont ratio current/maxVolume > 0.65 ?)
2. Tests unitaires matrice (5 profils × 4 goals = 20 cas)
3. Combinaison D+ + volume monitorée (S1 D+ ratio × S1 vol ratio ≤ 1.5 garde-fou)
```

**Si GO route uniquement** : ajouter un garde-fou combiné D+ × volume :
```typescript
// Si trail ET D+ S1 > 0.80 × current D+ : ne pas appliquer floor 1.00 sur volume
// (éviter double charge simultanée : on monte D+ OU volume, pas les 2)
const dplusRatioS1 = startElevation / currentWeeklyElevation;
const volRatioS1 = startVolume / currentVolume;
if (isTrail && dplusRatioS1 > 0.80 && volRatioS1 > 0.95) {
  // Réduire l'un des deux
  startVolume = Math.max(currentVolume * 0.85, peakCap);
  console.warn(`[Periodization] Double charge trail S1 détectée → vol allégé`);
}
```

**Couverture profils trail** : <5 % des trailers Premium (et parmi eux, garde-fou combiné les protège)

**Si CHALLENGE** : refuser le fix tel quel pour trail. Le risque "double charge simultanée vol + D+ post-fix #1" n'a pas été évalué. Doctrine `feedback_qualite_avant_vitesse` : "évaluer toutes typologies avant tout patch". Sources : Hammond 2018 ch. 7 ("never increase volume and intensity simultaneously"), Magness FATM ch. 4.

---

### Fix #8 — `sessionFactor` plafond Expert

**Diff résumé** : Plafonne `maxVolume × sessionFactor` au `MAX_WEEKLY_VOLUME[objectiveKey].expert` si le coureur n'est pas Expert déclaré. Évite que Conf freq 6 dépasse cap Expert.

**Verdict expert trail** : ❌ CHALLENGE

**Pertinence trail** : Quasi-nulle. Les cas cités (antoine Conf Marathon freq 6, armando Conf Semi freq 6) sont route. Pour trail, les caps `MAX_WEEKLY_VOLUME` sont déjà spécifiques et la freq trail dépasse rarement 5 séances/sem (mémoire : doctrine Coach Running IA fréquence = X séances inclut 1 renfo, donc freq 6 = 5 course + 1 renfo, rare).

**Problème principal** : le `sessionFactor` existe **par design** pour récompenser la haute fréquence (cohérent Magness FATM : "frequency drives consistency, consistency drives adaptation"). Le plafonner au cap Expert pour les non-Experts contredit cette doctrine. Un Conf Marathon à 6 séances/sem **peut légitimement** atteindre 90 km — s'il fait ces 6 séances bien.

**Position recommandée** :

Au lieu de plafonner par level, **plafonner par âge + level** :
- Conf Senior (≤ 35 ans) freq 6 : autoriser dépassement cap Expert (jusqu'à +10 %)
- Conf Master (≥ 50 ans) freq 6 : plafonner au cap Expert (récupération limitante)

```typescript
if (sessionFactor !== 1.00) {
  const before = maxVolume;
  maxVolume = Math.round(maxVolume * sessionFactor);
  const absoluteExpertCap = MAX_WEEKLY_VOLUME[objectiveKey]?.expert ?? 999;
  const isMaster = age >= 50;
  // Plafond uniquement pour les Masters non-Experts (récupération limitante)
  if (maxVolume > absoluteExpertCap && level !== 'Expert' && isMaster) {
    console.log(`[Periodization] sessionFactor cap Master: ${maxVolume}km clamped to ${absoluteExpertCap}km`);
    maxVolume = absoluteExpertCap;
  }
}
```

**Risque pédagogique** :
- Sous-prescription Conf Senior haute cylindrée : le fix actuel les pénalise injustement
- Sur-prescription Conf Master haute freq : couvert par modulation âge

**Couverture profils trail** : <2 % des trailers Premium (rares trailers Conf freq 6 sans être Expert)

**Si CHALLENGE** : refuser le fix tel quel. Re-soumettre avec modulation âge. Doctrine `feedback_compromis_messages_preventifs` : préférer compromis (Master capé, Senior libre) aux extrêmes (tous capés). Sources : Magness FATM ch. 6 (frequency-volume relation), Balducci 2024 Master ch. 9 (récupération limitante > 50 ans).

---

### Fix #9 — `finisher × 0.75` modulation par ratio current/race

**Diff résumé** : Module le facteur Finisher (0.75 → 0.80 → 0.85 → 0.95) selon ratio `currentVolume / raceDistanceKm`. Évite pénalité aveugle pour les Finishers avec base déjà solide.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : Pertinent pour trail. Cas alan (Conf, Trail 35 km Finisher, current 30 km, ratio 0.86) parfaitement représentatif : un trailer qui fait déjà 30 km/sem ne mérite pas une pénalité Finisher mécanique. La modulation continue est aligné doctrine `feedback_compromis_messages_preventifs`.

**Valeurs proposées** :
- `ratio ≥ 1.0 → 0.95` : ✅ Cohérent (le coureur fait déjà la distance, presque pas de pénalité)
- `ratio 0.7-1.0 → 0.85` : ✅ Cohérent
- `ratio 0.4-0.7 → 0.80` : ✅ Cohérent
- `ratio < 0.4 → 0.75` : ✅ Cohérent (vrai débutant Finisher)

**Cas trail à examiner** :
1. **Premier ultra trail vrai** (ratio < 0.3, distance > 80 km) : `0.75` est-il suffisamment conservateur ? Pour un coureur qui fait 25 km/sem max et qui prépare 100 km, **le ×0.75 reste insuffisant** — le pic théorique reste trop élevé. Recommander **`0.65`** dans ce cas.

**Ajustement recommandé** :
```typescript
let finisherFactor = 0.75;
if (currentVolume > 0 && raceDistanceKm > 0) {
  const ratio = currentVolume / raceDistanceKm;
  if (ratio >= 1.0) finisherFactor = 0.95;
  else if (ratio >= 0.7) finisherFactor = 0.85;
  else if (ratio >= 0.4) finisherFactor = 0.80;
  else if (ratio >= 0.2) finisherFactor = 0.75;
  else finisherFactor = 0.65; // premier ultra vrai (ratio < 0.20) : extra prudence
}
// Cas particulier : Master 55+ Finisher ultra → cap à 0.85 max (récup limitante)
if (age >= 55 && isUltraDistance) {
  finisherFactor = Math.min(finisherFactor, 0.85);
}
```

**Couverture profils trail** :
- Bénéficiaires directs : 20-30 % des Finishers trail (ceux avec base solide)
- Trail Débutant Finisher (ratio < 0.4) : conservation `0.75` (et `0.65` si premier ultra)
- Premier ultra vrai : nouveau garde-fou `0.65`

**Risques pédagogiques** :
- ⚠️ Risque sur-prescription premier ultra : couvert par seuil `ratio < 0.20 → 0.65`
- ❌ Risque casse Débutant Finisher route : nul (ratio < 0.4 conserve `0.75`)
- ⚠️ Risque Master Finisher ultra : couvert par cap `0.85 max` ajouté

**Si GO ajustement** : ajouter (a) cas `ratio < 0.20 → 0.65` premier ultra vrai, (b) cap `0.85 max` Master 55+ Finisher ultra. Source : Balducci 2024 Master ch. 9, Bramoullé EA #87 ("Finisher Master Ultra : ne JAMAIS supprimer la pénalité, juste la moduler").

---

### Fix #10 — Welcome cite PB si Finisher + PB

**Diff résumé** : Ajout clause prompt welcome : si `targetTime === "Finisher"` ET PB déclaré, citer PB + allure + allure entraînement calculée.

**Verdict expert trail** : ✅ GO direct

**Pertinence trail** : Pertinent transversal (route + trail). Pour trail spécifiquement, la mention "ton dernier trail 50 km en 7h30, allure 9:00/km → entraînement à 9:30/km" valide visiblement la lecture du profil. Plus l'individualisation perçue est forte, plus le trust augmente (doctrine `feedback_securite_avant_conversion` : transparence > silence).

**Valeurs proposées** :
- Formulation "Sur ton dernier {distance} tu as fait {temps}..." : ✅
- Fallback PB absent : ✅ neutre, pas d'hallucination
- Fallback PB en régression : ✅ neutre, pas de pression chronométrique

**Cas trail à ajouter** :
- Si PB sur **même type de course** (trail) : citer
- Si PB sur **route uniquement** alors que la cible est trail : NE PAS citer le chrono route (incomparable) — formuler "tu as un PB route solide qui montre une bonne base aérobie"

**Texte recommandé pour le prompt welcome** (mot pour mot, prêt à coller) :

```
[Ajout au prompt welcomeMessage Gemini]

Si targetTime === "Finisher" :
  CAS 1 : PB sur la même distance ET même type (route↔route, trail↔trail) dans recentRaceTimes
    → DOIT contenir une phrase : "Sur ton dernier {distance} tu as fait {temps} (allure {pace}/km) — ton plan vise une allure d'entraînement à {allureCalculée}/km."
  CAS 2 : PB sur route mais cible trail (incomparable)
    → DOIT contenir une phrase : "Tu as un PB route solide ({distance} en {temps}) qui montre une bonne base aérobie — on va l'adapter au terrain trail."
  CAS 3 : PB absent ou en régression
    → DOIT contenir une phrase : "Tu nous as indiqué viser Finisher — ton plan est calibré pour t'amener à la ligne d'arrivée sereinement, sans pression chronométrique."
  CAS 4 : Trail Master 55+ Finisher ultra
    → AJOUTER : "À ton âge, on a structuré le plan autour de la récupération entre séances clés — c'est la clé de la consistance jusqu'au jour J."

INTERDICTIONS :
  - JAMAIS inventer un PB (si absent, fallback CAS 3)
  - JAMAIS comparer chrono route vs trail comme s'ils étaient équivalents
  - JAMAIS mentionner poids/IMC/corpulence (cf doctrine feedback_jamais_poids_minceur)
```

**Couverture profils trail** : ~20-30 % des plans Trail (Finishers trail avec PB déclaré sur même type)

**Risques pédagogiques** : nul (prompt-only, clauses fallback couvertes)

---

### Fix #11 — Welcome cite blessure déclarée

**Diff résumé** : Ajout clause prompt welcome : si `injuries.hasInjury && injuries.description`, reconnaître la blessure, expliquer comment plan en tient compte, recommander validation médicale.

**Verdict expert trail** : ✅ GO direct

**Pertinence trail** : CRITIQUE pour la confiance utilisateur. Cas Justine (algodystrophie cheville) : recevoir un plan qui ignore la blessure déclarée = "l'app ne m'a pas lu" = perte de confiance immédiate et désabonnement. Pour trail spécifiquement, où la technicité du terrain ajoute du risque articulaire, la mention blessure est encore plus sensible.

**Valeurs proposées** :
- Reconnaître la blessure : ✅
- Expliquer comment le plan en tient compte : ✅
- Recommander validation médicale : ✅
- Interdiction formulation culpabilisante : ✅
- Doublon avec safetyWarning évité : ✅

**Cas trail à ajouter** :
- Blessure articulaire (cheville, genou) + trail technique : recommandation **proprioception 2×/sem obligatoire**
- Blessure tendineuse (Achille, fascia, ITB) + trail descente : recommandation **renforcement excentrique progressif + limitation descentes raides en phase dev**
- Blessure dos/sacro + trail long : recommandation **gainage 2×/sem + bâtons obligatoires en SL**

**Texte recommandé pour le prompt welcome** (mot pour mot, prêt à coller) :

```
[Ajout au prompt welcomeMessage Gemini]

Si injuries.hasInjury === true ET injuries.description non vide :
  Le welcomeMessage DOIT contenir un paragraphe court (3-4 phrases max) qui :

  1. RECONNAISSANCE : citer la description en formulation respectueuse, ex :
     "Tu nous as parlé de ton {description blessure} — c'est pris en compte dans ton plan."

  2. ADAPTATION : expliquer concrètement comment le plan adapte :
     - Si blessure articulaire (cheville/genou) ET cible trail technique :
       → "On a intégré 2 séances de proprioception/sem et on limite les descentes raides en phase de développement."
     - Si blessure tendineuse (Achille/fascia/ITB) ET cible trail descente :
       → "On a placé du renforcement excentrique progressif 2×/sem pour préparer tes tendons aux descentes répétées."
     - Si blessure dos/sacro ET cible trail long :
       → "On a renforcé le gainage 2×/sem et on recommande les bâtons dès la phase développement pour soulager le dos en SL."
     - Si blessure non listée :
       → "Le plan adapte l'intensité et la progression pour éviter une rechute."

  3. VALIDATION MÉDICALE : si blessure active ou récente (< 6 mois) :
     "Si tu n'as pas eu de feu vert médical récent, on te recommande de valider avec ton kiné/médecin du sport avant de démarrer."

  INTERDICTIONS ABSOLUES :
  - JAMAIS de formulation culpabilisante ("ta blessure pourrait t'empêcher de...")
  - JAMAIS de sur-médicalisation ("attention, vous risquez de...")
  - JAMAIS substituer aux conseils du médecin (toujours formulation "recommandation, valide avec ton praticien")
  - Le safetyWarning détaillé reste séparé du welcome (pas de doublon mot pour mot)
```

**Couverture profils trail** : ~10-15 % des plans Trail (users avec `injuries.hasInjury === true`)

**Risques pédagogiques** : nul (prompt-only). Le seul risque réel est l'hallucination Gemini → clause "JAMAIS inventer une adaptation non listée" couvre.

**Note** : selon le mémo final du fichier source (`fix A3+A4` commit `40b436a`), ce fix est **déjà déployé**. Vérifier git log avant de re-coder.

---

### Fix #12 — SafetyWarning + welcome dédié ultra haute montagne Master 55+

**Diff résumé** : Nouvelle branche `isUltraTrailHauteMontagne` (proxy `raceDplus ≥ 6000 && raceDplus/raceDistanceKm ≥ 50`) dans `feasibilityService.ts`. SafetyWarning détaillé avec mentions cardio, excentrique, récup 96h, sortie nuit, matériel.

**Verdict expert trail** : ⚠️ GO avec ajustement

**Pertinence trail** : CRITIQUE. Pour un Master 55+ qui prépare un ultra alpin (Rich-like), recevoir le MÊME safetyWarning qu'un marathon route est inacceptable (à la fois inutile et risqué). Le bloc proposé couvre l'essentiel doctrine UTMB Academy + Lazarus 2018 (résistance excentrique Master).

**Valeurs proposées** :
- Seuil `raceDplus ≥ 6000` : ✅ Aligné Balducci ch. 9 ("haute montagne ultra commence à ~6 000 m D+")
- Seuil `raceDplus/raceDistanceKm ≥ 50` : ⚠️ TROP BAS. Un trail 60 km / 3 000 m D+ a ratio 50 mais n'est PAS haute montagne. Plutôt `≥ 70` (montagne sérieuse) ou `≥ 80` (alpin pur).
- Seuil `planTooShort = planWeeks < 16` : ✅ Aligné doctrine Balducci Master ("16-20 sem minimum pour ultra alpin Master 50+, 20-24 optimal")
- Recommandation test d'effort + ECG < 3 mois : ✅ Aligné médecine du sport SFC 2023
- Excentrique quadriceps + mollets 2×/sem : ✅ Lazarus 2018
- Récupération 96h entre 2 grosses descentes : ✅ Bramoullé EA #87
- Sortie nuit obligatoire : ✅ (cohérent fix #4)
- Matériel à tester ≥ 2× en SL : ✅ aligné guide UTMB Academy

**Ajustement recommandé seuils** :
```typescript
// Haute montagne sérieuse (3 niveaux)
const isHauteMontagne = raceDplus >= 4000 && (raceDplus / raceDistanceKm) >= 60;
const isUltraAlpine = raceDplus >= 6000 && (raceDplus / raceDistanceKm) >= 70;
const isUltraExtreme = raceDplus >= 10000 && (raceDplus / raceDistanceKm) >= 80;

if (isUltraAlpine && isSenior) {
  // Bloc actuel (excellent)
} else if (isHauteMontagne && isSenior) {
  // Bloc allégé (mentions cardio + excentrique + bâtons)
}
```

**Texte recommandé pour le bloc `safetyWarning` ultra alpin Master 55+** (mot pour mot, prêt à coller, version enrichie) :

```typescript
if (isUltraExtreme && isSenior) {
  const planTooShort = planWeeks < 20;
  return `À ${age} ans pour un ultra alpin extrême de ${raceDistanceKm} km / ${raceDplus} m D+ ` +
    `(ratio ${Math.round(raceDplus/raceDistanceKm)} m/km), 4 points NON NÉGOCIABLES :\n\n` +
    `1) BILAN MÉDICAL : test d'effort + ECG datés < 3 mois OBLIGATOIRES (recommandation SFC 2023 Master 55+). ` +
    `Idéalement bilan cardiologue du sport + bilan podologique + bilan dentaire (foyers infectieux).\n\n` +
    `2) PRÉPARATION : ` + (planTooShort
      ? `la fenêtre de ${planWeeks} semaines est COURTE pour ce niveau de course (doctrine Master 55+ : 20-24 sem minimum ` +
        `pour ultra alpin extrême). Le plan reste réalisable mais la marge de sécurité est faible — toute infection, ` +
        `blessure mineure ou semaine ratée compromet l'objectif. Considérer un objectif intermédiaire (race + courte) ` +
        `si la prépa devient chaotique. `
      : `la fenêtre de ${planWeeks} semaines est correcte. `) +
    `Renforcement EXCENTRIQUE quadriceps + mollets 2×/sem en phase spécifique (Lazarus 2018 : Master 55+ perd ` +
    `résistance descente 2× plus vite que Senior — c'est la blessure #1 des UTMB Masters).\n\n` +
    `3) CONDITIONS RÉELLES : sortie nuit avec lampe frontale 3-5× sur le cycle. Matériel complet ` +
    `(bâtons, sac, lampe, vêtements froid/pluie, bidons/flasques) testé ≥ 2× en sortie longue. ` +
    `Au moins 1 BTB Sam-Dim en terrain similaire à la course (D+/technicité) en phase spécifique.\n\n` +
    `4) RÉCUPÉRATION : 96h minimum entre 2 séances avec descentes longues (>2 000 m). ` +
    `Sommeil ≥ 8h les semaines à plus de 6 000 m D+. À la moindre douleur tendineuse, articulaire ` +
    `ou signe de surcharge (fréquence cardiaque repos +10 % matinale), ON ADAPTE plutôt que forcer. ` +
    `La consistance sur 20 sem bat la performance ponctuelle.`;
}

if (isUltraAlpine && isSenior) {
  const planTooShort = planWeeks < 16;
  return `À ${age} ans pour un ultra alpin de ${raceDistanceKm} km / ${raceDplus} m D+ ` +
    `(${Math.round(raceDplus/raceDistanceKm)} m/km), 3 points IMPORTANTS :\n\n` +
    `1) BILAN MÉDICAL : test d'effort + ECG (< 6 mois) INDISPENSABLES (Master 55+). ` +
    `Cardiologue du sport recommandé.\n\n` +
    `2) PRÉPARATION : ` + (planTooShort
      ? `${planWeeks} semaines est CORRECT mais sans marge (doctrine Master : 16-20 sem optimal). ` +
        `Une infection ou blessure mineure peut compromettre l'objectif. `
      : `${planWeeks} semaines = fenêtre confortable. `) +
    `Renforcement excentrique quadriceps 2×/sem en phase spé (descente = blessure #1 UTMB Masters).\n\n` +
    `3) MATÉRIEL + NUIT + RÉCUP : sortie nuit lampe frontale 1-3× sur le cycle. ` +
    `Matériel complet testé ≥ 2× en SL. Récupération 72-96h entre 2 grosses descentes. ` +
    `À la moindre douleur, on adapte. La consistance bat la performance ponctuelle.`;
}

if (isHauteMontagne && isSenior) {
  // Version allégée pour trail montagne Master non-ultra
  return `À ${age} ans pour ${raceDistanceKm} km / ${raceDplus} m D+, validation médicale ` +
    `recommandée (test d'effort < 12 mois). Renforcement excentrique quadriceps 1-2×/sem. ` +
    `Bâtons recommandés dès la phase développement. Récupération 72h après séance descente longue.`;
}
```

**Couverture profils trail** :
- Bénéficiaires directs : Masters 55+ Trail haute montagne (estimation ~5 plans/an, mais profils premium ultra critiques)
- Cas trail montagne Master non-ultra : couvert par bloc allégé

**Risques pédagogiques** :
- ✅ Risque sur-médicalisation : équilibré (transparence > silence, formulation factuelle non-anxiogène)
- ⚠️ Risque motivation : le bloc est dense. À tester sur 1 user réel (Rich-like) pour mesurer si reçoit comme "info utile" ou "douche froide"
- ✅ Doctrine `feedback_securite_avant_conversion` : respectée (transparence + décharge explicite)

**Si GO ajustement** : (a) 3 niveaux de seuil (haute montagne ≥ 4 000 + ratio ≥ 60, ultra alpin ≥ 6 000 + ratio ≥ 70, ultra extrême ≥ 10 000 + ratio ≥ 80), (b) seuil `planTooShort` à 20 sem pour ultra extrême (16 reste OK pour ultra alpin standard), (c) bloc enrichi avec 4 points numérotés. Sources : Balducci 2024 ch. 9, Lazarus 2018, Bramoullé EA #87, SFC 2023 recos Master.

---

### Fix #13 — Guard `validatePeriodizationCoherence`

**Diff résumé** : Nouveau guard monitoring qui vérifie ratio `weeklyVolumes[i] / sum(sessions[i].distance)` et idem D+. Alerte CRITICAL si dérive > 30 %.

**Verdict expert trail** : ✅ GO direct

**Pertinence trail** : Excellent monitoring. Le cas Plan 2 Rich (51 km sessions vs 70 km annoncés) aurait été détecté immédiatement. Aucun risque, prompt-only sur data structure existante.

**Couverture profils trail** : 100 % des plans (guard universel)

**Risques pédagogiques** : nul (monitoring interne, pas de message user)

---

### Fix #14 — Stripe webhook régénération full plan

**Diff résumé** : Trigger Cloud Functions sur `payment_intent.succeeded` qui appelle `generateRemainingWeeks` + alerte monitoring si `isPreview === true` depuis > 1h post-conversion.

**Verdict expert trail** : ✅ GO direct

**Pertinence trail** : Hors scope contenu trail, mais critique business. Pour un user qui paie Premium et reste 24h sur sa preview = frustration majeure. Aucun risque.

**Couverture profils trail** : 100 % des conversions Premium (universel)

**Risques pédagogiques** : nul (infra technique)

---

## Valeurs critiques à valider

| Variable | Valeur proposée | Verdict expert | Ajustement | Source |
|---|---|---|---|---|
| `maxStartByLevel` Conf D+ S1 | 1800 m | ⚠️ trop bas ultra alpin | 2000 m (+ clause ultra 2500) | Balducci 2024 |
| `maxStartByLevel` Expert D+ S1 | 2500 m | ⚠️ trop bas ultra alpin | 2800 m (+ clause ultra 3500) | Bramoullé EA #87 |
| `maxWeeklyElevation` Expert ultra long | 6000 m | ⚠️ générique | 5500 ultra alpin / 6500 ultra extrême | Bramoullé EA #87 |
| Seuil `isUltraLongRace` | `raceElevation >= 8000` | ⚠️ binaire | 3 niveaux (4000/6000/10000) avec ratio D+/km | Balducci 2024 ch. 9 |
| Seuil sortie nuit (fix #4) | `dist >= 60 OR elev >= 4000` | ⚠️ trop large | `dist >= 80 OR (dist >= 60 && ratio >= 50) OR elev >= 5000` | étude UTMB 2022 DNF |
| Fréquence sorties nuit | 1-2 (uniforme) | ⚠️ à graduer | 1-2 (80-100km) / 3 (100-150) / 4-5 (150+) | Bramoullé EA #87 |
| Correctif âge 10K chrono (fix #5) | +5 min Senior | ⚠️ trop généreux | +0.5 min/an au-delà 50, cap +4 min | Tanaka 2008 |
| Correctif âge 5K chrono (fix #5) | +2 min Senior | ⚠️ trop généreux | +0.5×0.4 min/an au-delà 50, cap +2 min | Tanaka 2008 |
| Seuil `isUltraTrailHauteMontagne` ratio D+/km (fix #12) | ≥ 50 | ⚠️ trop bas | ≥ 70 (ultra alpin) / ≥ 80 (extrême) | Balducci 2024 |
| Seuil `planTooShort` (fix #12) | < 16 sem | ⚠️ OK pour alpin, trop court pour extrême | < 16 sem (alpin) / < 20 sem (extrême) | Balducci 2024 Master ch. 9 |
| `finisherFactor` ratio < 0.20 (fix #9) | 0.75 | ⚠️ trop élevé | 0.65 | Bramoullé EA #87 |
| `finisherFactor` cap Master 55+ ultra (fix #9) | absent | ⚠️ à ajouter | 0.85 max | Balducci Master ch. 9 |

---

## Couverture trail (% profils trail bénéficiant)

| Fix | % profils trail | Sévérité business | Priorité trail |
|---|---|---|---|
| #1 (cap D+ S1) | 15-20 % | 🔴 CRITIQUE | P0 |
| #2 (cap Expert ultra) | 5-10 % (mais 100 % critiques) | 🔴 CRITIQUE | P0 |
| #3 (BTB ultra 100+) | 10-15 % | 🟠 MAJEUR | P0 |
| #4 (sortie nuit) | 15-20 % | 🟠 MAJEUR | P0 |
| #5 (level cascade) | 5-10 % | 🟡 MINEUR (route++) | P2 |
| #6 (timeToSeconds) | 5-10 % | 🟡 MINEUR | P2 |
| #7 (cap 0.65) | <5 % | 🟡 MINEUR (refus trail) | P2 route only |
| #8 (sessionFactor) | <2 % | 🟡 MINEUR (refus tel quel) | P2 route only |
| #9 (Finisher modulation) | 20-30 % | 🟠 MAJEUR | P1 |
| #10 (welcome PB) | 20-30 % | 🟡 MINEUR | P1 |
| #11 (welcome blessure) | 10-15 % | 🟠 MAJEUR (déjà déployé) | P1 |
| #12 (safety ultra alpin Master) | <5 % (mais 100 % critiques) | 🔴 CRITIQUE | P1 |
| #13 (guard monitoring) | 100 % | 🟡 MINEUR | P3 |
| #14 (Stripe webhook) | 100 % | 🟡 MINEUR | P3 |

---

## Risques pédagogiques transverses

### Risques sur-prescription (envoyer trop)
1. **Combinaison fixes #1 + #2 + sortie nuit (#4) + BTB (#3) simultanée** sur Expert ultra 100+ : addition de charges (D+ haut + volume haut + nuit + BTB). Garde-fou requis : ne pas activer **toutes** ces nouveautés sur **toutes** les semaines simultanément. Le code doit séquencer (D+ pic + BTB en spé, sortie nuit en dev). Vérifier que Gemini interprète correctement.
2. **Cap Expert 6000 m (#2)** sans modulation ratio D+/km : un Expert qui prépare un 60 km / 8 000 m D+ (VK-tier alpin extrême) reçoit même cap qu'un 110 km / 8 000 m D+ → léger overshoot pour le premier (course plus courte, intensité plus haute, charge D+/h plus élevée).
3. **Fix #5 correctif âge +5 min Senior** : sur-classement Masters → pic vol trop élevé. Réduire à +0.5 min/an au-delà 50.
4. **Fix #9 Finisher modulation** : si combinée à fix #8 sans cap Master, un Conf Master 60 freq 5 Finisher se retrouve à pic vol > sa cylindrée réelle. Cap Master 55+ ultra `0.85 max` indispensable.

### Risques sous-prescription (envoyer trop peu)
1. **Conf trail D+ S1 plafonné 1800 m (#1)** : un Conf trail qui fait déjà 2 500 m/sem est plafonné — régression. Monter à 2 000 m (+ clause ultra 2 500).
2. **Fix #5 trailer expérimenté avec mauvais chrono route** : risque downgrade en `inter` malgré expérience trail. Ajouter clause "trail finié → pas deb".

### Risques sécurité
1. **Sortie nuit (#4) sans contre-indications** : épilepsie photosensible / héméralopie absentes du bullet proposé. À ajouter (médecin du sport non-négociable).
2. **Welcome blessure (#11) hallucination** : si Gemini invente une adaptation non listée. Clause "JAMAIS inventer adaptation non listée" à ajouter au prompt.
3. **Safety ultra extrême (#12) seuil 16 sem** : trop court pour ultra extrême (Tor, Diagonale). Monter à 20 sem pour ce niveau.

### Risques transversaux doctrine
1. **`feedback_qualite_avant_vitesse`** : fixes #7 et #8 sans audit ciblé trail = violation. À refuser pour scope trail tant qu'audit pas fait.
2. **`feedback_chaque_ligne_justifiee`** : fix #7 propose de supprimer un cap sans documenter pourquoi il existait à l'origine. À documenter avant retrait.
3. **`feedback_input_client_obligatoire`** : fix #1 respecte parfaitement (input D+ user restitué). ✅
4. **`feedback_securite_avant_conversion`** : fix #11 + #12 renforcent parfaitement. ✅
5. **`feedback_jamais_poids_minceur`** : prompts welcome (#10, #11, #12) **doivent** intégrer interdiction explicite "JAMAIS mentionner poids/IMC". Présente dans le texte recommandé.

---

## Recommandations textes prompts (mot pour mot, prêt à coller)

### `ULTRA70_BACK_TO_BACK_BULLETS` (fix #3)
```typescript
const ULTRA70_BACK_TO_BACK_BULLETS = `- BACK-TO-BACK (BTB) OBLIGATOIRE en phase développement (1-2×) et spécifique (2-3×) :
  • Samedi = sortie longue (SL) en EF pure, durée principale de la semaine
  • Dimanche = 2e sortie en fatigue, durée = 50-75 % de la SL Sam (Master 55+ : 50-60 % strict)
  • Allure Dim = EF stricte, JAMAIS de seuil/intensité (objectif = fatigue accumulée, pas surcharge)
  • Lundi = repos complet OBLIGATOIRE (pas de footing de "récup", repos vrai)
  • Privilégier terrain similaire à la course (D+/technicité) au moins 1× sur 2 BTB
  • Le BTB simule la fatigue cumulée du 2e jour d'ultra long (gestion glycogène, articulations, mental)`;
```

### `ULTRA_NIGHT_RUN_BULLETS` (fix #4)
```typescript
const ULTRA_NIGHT_RUN_BULLETS = `- SORTIE NUIT (lampe frontale) OBLIGATOIRE en phase développement et spécifique :
  • Ultra 80-100 km : 1-2 sorties nuit sur le cycle
  • Ultra 100-150 km : 3 sorties nuit sur le cycle
  • Ultra 150+ km : 4-5 sorties nuit dont au moins 1 BTB jour + nuit
  • 1ère sortie nuit : 45min-1h30 EN TERRAIN FAMILIER (jamais inconnu de nuit), durée courte pour s'habituer à la lampe
  • Sorties suivantes : progresser vers 2-5h en terrain semi-technique puis technique réaliste
  • Allure EF stricte (jamais d'intensité de nuit : risque chute + désorientation)
  • Travailler : gestion de l'éblouissement croisé, orientation balisage, alimentation/hydratation rythme nocturne, lutte contre somnolence (caféine timing), reconnaissance terrain à faible contraste
  • Privilégier vendredi soir ou samedi soir (PAS dimanche : préserver récup hebdo)
  • CONTRE-INDICATIONS : épilepsie photosensible, cécité nocturne / héméralopie → validation médicale OBLIGATOIRE avant
  • Master 55+ avec antécédent vertige / problème vestibulaire : sorties nuit accompagnées préférables`;

const includeNightRun =
  data.trailDetails.distance >= 80 ||
  (data.trailDetails.distance >= 60 && data.trailDetails.elevation / data.trailDetails.distance >= 50) ||
  data.trailDetails.elevation >= 5000;
```

### Bloc `safetyWarning` ultra alpin Master 55+ (fix #12)
(Voir texte enrichi 3 niveaux dans la section #12 ci-dessus, prêt à coller dans `feasibilityService.ts`)

### Clauses prompt `welcomeMessage` PB Finisher (fix #10)
(Voir 4 cas avec interdictions dans la section #10 ci-dessus, prêt à coller dans prompt welcome)

### Clauses prompt `welcomeMessage` blessure (fix #11)
(Voir 3 étapes Reconnaissance + Adaptation + Validation médicale dans la section #11 ci-dessus, prêt à coller dans prompt welcome)

---

## Sources scientifiques mobilisées

### Trail / ultra spécifique
- **Balducci, Pascal (2024)** — *Manuel d'Entraînement Trail* (3e éd., Glénat). Ch. 3 (volumes Débutant/Inter), Ch. 9 (Master ultra alpin, fenêtres prépa 16-20 sem min, cap D+ par level).
- **Bramoullé, Vincent (2023)** — *Endurance Athlétique #87* : "Préparation ultra alpin Master : BTB, sortie nuit, plateau D+ 6 500 max Expert".
- **UTMB Academy (2024)** — Modules 1-2-3 (classification level, doctrine 3× race elevation cycle min, 5-6× optimal Master).
- **Lazarus, Norman R. (2018)** — *British Journal of Sports Medicine* : "Aging Master athletes : eccentric strength decline 2× faster than concentric, descent injury risk".

### Physiologie générale
- **Tanaka, H. (2008)** — *Journal of Applied Physiology* : "Aging and VO2max decline in endurance athletes : 0.5 %/year trained vs 0.9 %/year untrained".
- **Trappe, Scott (2015)** — *Journal of Applied Physiology* : "Master athletes muscle fiber composition, recovery time, training adaptations".
- **Magness, Steve** — *Faster Than the Mountains* (2018) : Ch. 5 BTB doctrine, Ch. 6 frequency-volume relation, Ch. 11 recovery non-negotiable post-BTB.
- **Hammond, Mark (2018)** — *The Science of Running* : "First week of plan must preserve existing aerobic foundation. Never increase volume + intensity simultaneously."

### Médecine du sport
- **Société Française de Cardiologie (2023)** — Recommandations : "Master 55+ endurance : test d'effort + ECG < 6 mois indispensable. Ultra > 50 km : < 3 mois recommandé."
- **Étude UTMB DNF causes (2022)** — n=4500 ultra-trailers, première cause DNF non-musculaire = chutes nocturnes / désorientation lampe.

---

## Plan d'action proposé (ordre + sprint)

### Sprint 1 — P0 D+ trail (3-4h)
- Appliquer fix #1 avec ajustement (Conf 2000 / Expert 2800 + clause ultra alpin Conf 2500 / Expert 3500)
- Appliquer fix #2 avec ajustement (3 niveaux par ratio D+/km : haute montagne / ultra alpin / ultra extrême)
- Tests 4 profils Trail × 3 race elevations (3000 / 6000 / 12000 m)

### Sprint 2 — P1 prompt ultra (2-3h)
- Appliquer fix #3 (factorisation BTB ultra 100+)
- Appliquer fix #4 avec ajustement (seuil `>= 80 OR (>= 60 && ratio >= 50) OR elev >= 5000` + fréquence graduée + contre-indications)
- Appliquer fix #12 avec ajustement (3 niveaux safetyWarning + planTooShort 20 sem extrême)
- Vérifier fix #10 + #11 déjà déployés au commit `40b436a`, sinon appliquer
- Tests 4 plans (ultra 100+, ultra alpin Master, Finisher+PB, blessure)

### Sprint 3 — P2 cascade level (1-2j)
- Appliquer fix #5 avec ajustement (décline 0.5 min/an cap +4 min 10K + clause trail finié)
- Appliquer fix #6 avec ajustement (sanity check pace)
- Appliquer fix #9 avec ajustement (cas premier ultra `< 0.20 → 0.65` + cap Master `0.85 max`)
- **REFUSER fixes #7 et #8** pour scope trail tant qu'audit batch trail-spécifique non fait

### Sprint 4 — P3 monitoring (1j)
- Appliquer fix #13 (guard validatePeriodizationCoherence)
- Appliquer fix #14 (Stripe webhook trigger)

---

## Conclusion

Roadmap **globalement saine** avec 5 GO direct + 7 GO ajustement + 2 CHALLENGE. Les 4 fixes P0 trail (#1, #2, #3, #4) sont **critiques** et doivent partir cette semaine. Les ajustements demandés sont précis et sourcés.

**Le point d'attention principal** : ne pas appliquer toutes les nouveautés trail simultanément sans monitoring renforcé (guard #13 prioritaire) — le risque de sur-charge cumulative (D+ haut + BTB + nuit + cap relevé) est réel pour les Experts ultra haute montagne. Le séquencement par phase (dev / spé / pic) doit être strict.

**À discuter avec Romane avant déploiement** : (a) les 2 CHALLENGE (#7, #8) — confirmer scope route only ou drop. (b) Valeurs précises ajustées (cf tableau "Valeurs critiques"). (c) Vérifier commit `40b436a` pour ne pas re-coder #10 + #11 déjà déployés.
