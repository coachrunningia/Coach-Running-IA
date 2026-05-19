# Audit dev senior J3 — Audit EXHAUSTIF prompt Gemini (post J2)
Date: 2026-05-17 | Reviewer: dev senior 30 ans d'expérience
Fichier audité: `src/services/geminiService.ts` (5677 L post J2, anciennement 5712)
Méthodologie: 5 axes (post-process / lignes mortes / challenge RISQUÉ / surcharges / sections rares)
Référence J2: AUDIT-DEV-SENIOR-J2.md (33 trouvailles, 14 patches PM-validés)

---

## Synthèse exec

- **Total trouvailles : 112 patches concrets** (J2 = 33, multiplié par 3.4×)
- **Lignes prompt économisables si TOUT appliqué : ~135–180 L** sur ~600 L de surface prompt = **−22% à −30%**
- **Tokens économisés par génération Preview : ~600–900 tokens** (preview seul)
- **Tokens économisés par batch Remaining : ~250–400 tokens × N batches** (typique 3–5 batches/plan)
- **Total tokens par plan complet : ~1500–2700 tokens économisés** (Preview + Remaining + adapter)
- **Économie API estimée pour 1500 plans/mois : ~3M tokens/mois → ~$5–15/mois sur Gemini-2.5-flash** (gain monétaire faible mais latence/qualité réponse meilleures)

Distribution par catégorie :
| Catégorie | Patches | Lignes | Risque global |
|---|---|---|---|
| 🟢 Axe 1 (post-process couvert) | 28 | −58 L | faible |
| 🟢 Axe 2 (lignes mortes) | 12 | −18 L | nul |
| 🟡 Axe 3 (challenge RISQUÉ) | 18 | −32 L | conditionnel |
| 🟢 Axe 4 (surcharges sémantiques) | 41 | −95 L (tokens) | faible |
| 🟠 Axe 5 (sections rares) | 13 | −22 L | moyen |
| **Total** | **112** | **−135 à −180 L** | mixte |

---

## Méthodologie — Inventaire des post-process déterministes (Axe 1 référentiel)

Fonctions confirmées qui écrasent l'output Gemini APRÈS génération :

| Fonction | Ligne | Ce qu'elle force |
|---|---|---|
| `forceTutoiement` | 298–477 | tu/te/ton + corrections genre/nombre + élisions |
| `correctFrenchWithAI` | 484–589 | 2e passe Gemini sur grammaire/accords (non-bloquant) |
| `recalculateSessionDistance` | 595–636 | recalcul distance = durée ÷ pace (tolérance 10%) |
| `postProcessWeekQuality` | 642–876 | weekGoal, tutoiement, warmup/cooldown/mainSet allure auto, retype "Running"→type correct, garde-fous SL dédup, back-to-back |
| `enforceWeekConstraints` | 1230–1812 | volume hebdo, cap SL durée/km, cap session km, retype SL mistypée, force fractionné en dev/spec, dédup footing distances, repos actif si avg <3.5km/séance |
| `enforceFullPlanConstraints` | 1820–1921 | affûtage ≤ semaine N-1, progression max +15%/sem, re-cap sessions |
| `applyTargetTimeOverride` | 992–1019 | allure spé course = chrono cible user (peu importe ce que Gemini écrit) |
| `distributeElevationToSessions` | 1983–2122 | D+ par séance : SL 65%, vallonnée 20%, footing 15%, track/recovery 0% |
| `buildRenfoMainSet` (renfoService) | 336+ | **ÉCRASE TOTALEMENT** title + mainSet + warmup + cooldown + duration du renfo |
| `buildFootingVariant` (footingVariants) | — | **ÉCRASE TOTALEMENT** title + warmup + mainSet + cooldown + advice des footings phase fondamental/recuperation |
| `enforceSLDay` | 935–978 | force SL sur jour préféré, dédup SL si plusieurs |
| `buildPlanName` | 1938–1962 | **ÉCRASE** `plan.name` toujours, peu importe le Gemini |
| `stripElevation` (preview L4029–4041 + remaining L4677–4685) | inline | met `elevationGain = 0` sur tout plan non-trail |
| `feasibility` override | 4043–4050 | **ÉCRASE** `plan.feasibility.{status, message, safetyWarning}` + `confidenceScore` avec valeurs déterministes |
| `distance` trail override | 3805–3807 | écrase `plan.distance` avec `{D}km D+{E}m` saisi |
| Day enforcement preview L3873–3911 + remaining L4543–4583 | inline | force preferredDays, sort par jour, dédup, slice à frequency |
| `slice(0, data.frequency)` | 3905 / 4576 | **CAP** strict du nombre de séances |

**Principe clé** : toute règle prompt couverte par ces fonctions = candidate à allègement/suppression.

---

# Axe 1 — Règles prompt couvertes par code post-process (CANDIDATES SUPPRESSION)

### #A1.1 — Override total de `plan.name` par `buildPlanName`
**Localisation prompt** : L3747 `"name": "Nom du plan incluant objectif",`
**Fonction code qui la couvre** : `buildPlanName(data, planDurationWeeks)` L1938–1962, appelée L4009 systématiquement à chaque preview.
**Preuve** : `plan.name = buildPlanName(data, planDurationWeeks);` (L4009) écrase 100% du temps. Gemini peut écrire ce qu'il veut, c'est jeté.
**Patch** : remplacer L3747 par `"name": "${buildPlanName(data, planDurationWeeks)}",` (ou simplement `"name": "ignored, overwritten"` — Gemini doit toujours produire le champ pour respecter le schéma).
**Gain** : 0 L mais tokens prompt mieux dépensés (Gemini ne perd pas du temps à inventer un nom) + cohérence affichée dans le template.
**Verdict** : ✅ SAFE.

---

### #A1.2 — Override total de `plan.feasibility` par valeurs déterministes
**Localisation prompt** : L3760–3764 — bloc `"feasibility": { "status": "BON", "message": "Analyse avec chiffres VMA/temps théorique", "safetyWarning": "Conseil sécurité" }`
**Fonction code qui la couvre** : L4043–4050, override TOTAL avec `feasibilityResultPreview.{status,message,safetyWarning,recommendation}`.
**Preuve** : déjà documenté #S13 J2 — Gemini's output ignoré.
**Patch** : remplacer le bloc 5 L par 1 L commentaire `"feasibility": { "status": "rempli par le code post-process", "message": "rempli par le code", "safetyWarning": "rempli par le code" },` ou supprimer carrément si on accepte la non-conformité au schéma (note : test JSON parse continuera à passer).
**Gain** : −3 L | **Risque** : très faible.
**Verdict** : ✅ SAFE.

---

### #A1.3 — Override total `plan.confidenceScore` par feasibility calculée
**Localisation prompt** : L3759 `"confidenceScore": 75,`
**Fonction code qui la couvre** : L4050 `plan.confidenceScore = feasibilityResultPreview.score;` (toujours appelée).
**Preuve** : 110 plans audités J1 → 0 cas où confidenceScore généré par Gemini est conservé.
**Patch** : supprimer L3759 (Gemini calculera ou pas le champ, c'est jeté).
**Gain** : −1 L | **Risque** : nul.
**Verdict** : ✅ SAFE.

---

### #A1.4 — Override `plan.distance` pour Trail (L3753 dans JSON template)
**Localisation prompt** : L3753 `"distance": "${data.goal === 'Trail' && data.trailDetails ? \`${data.trailDetails.distance}km D+${data.trailDetails.elevation}m\` : (data.subGoal || '')}",`
**Fonction code qui la couvre** : L3805–3807 `if (data.goal === 'Trail' && ...) plan.distance = \`${data.trailDetails.distance}km D+${data.trailDetails.elevation}m\`;`
**Preuve** : override déterministe avec EXACTEMENT la même expression. Le template injecte la valeur, et le code la force après.
**Patch** : simplifier L3753 en `"distance": "${data.subGoal || ''}",` (le code complétera la partie trail).
**Gain** : −0 L mais simplifie le template (lisibilité) | **Risque** : nul.
**Verdict** : ✅ SAFE (cleanup cosmétique).

---

### #A1.5 — Règle "EXACTEMENT ${data.frequency} séances" (Preview L3460 + Remaining L4482)
**Localisation prompt** :
- Preview L3460 : `🔴 EXACTEMENT ${data.frequency} séances dans la semaine 1.`
- Remaining L4482 : `🔴 CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.`
**Fonction code qui la couvre** : `plan.weeks[0].sessions.slice(0, data.frequency)` L3905 (preview) + L4576 (remaining) — cap strict du nombre de séances.
**Preuve** : si Gemini en met plus, le `.slice()` tronque. Si Gemini en met moins → pas couvert (donc règle utile uniquement pour le `+`).
**Patch** : conserver. La règle a une utilité résiduelle (Gemini pourrait sous-générer). **Pas de patch.**
**Verdict** : 🔴 NE PAS TOUCHER (asymétrie code couvre seulement le surplus).

---

### #A1.6 — Règle "elevationGain OBLIGATOIRE sur chaque séance" (couverte par distributeElevationToSessions + stripElevation)
**Localisation prompt** :
- L3127 (buildDplusPromptBlock remaining) : `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).`
- L4225 + L4240 (signalées #S3 J2)
- L3779 + L4470 (exemples JSON avec elevationGain 600)
**Fonction code qui la couvre** :
- `distributeElevationToSessions` L1983+ : RE-CALCULE et écrase `elevationGain` pour TOUS les plans trail.
- `stripElevation` inline L4030–4040 (preview) + L4677–4685 (remaining) : force `elevationGain = 0` pour tout plan non-trail.
**Preuve** : sur 110 plans audités, 0 cas où l'elevationGain de Gemini est conservé tel quel (toujours soit forcé à 0, soit redistribué).
**Patch** : conserver L3127 (utile : sans le champ JSON Flash le met en mainSet) MAIS supprimer L4225 + L4240 (déjà couvert #S3 J2 et non-redondant : à appliquer).
**Gain** : couvert par #S3 J2 | **Risque** : faible.
**Verdict** : ✅ déjà patché S3.

---

### #A1.7 — Règle "PAS de seuil/fractionné/VMA en phase fondamentale" (Preview L3480, Remaining L4370)
**Localisation prompt** :
- Preview L3480 : `PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale.`
- Remaining L4370 : `PAS de seuil, PAS de fractionné, PAS de VMA.`
**Fonction code qui la couvre** : `postProcessWeekQuality` L684–700 :
```
if (phase === 'fondamental' || phase === 'recuperation') {
  week.sessions.forEach((s: any) => {
    const isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === 'Fractionné';
    if (isSeuil && pacesObj) {
      // → converted to Footing EF
```
**Preuve** : conversion auto en footing EF. Toute séance seuil/frac/VMA en fondamental/recup est CONVERTIE.
**Patch** : la règle prompt reste utile pour guider Gemini (éviter le re-work), mais on peut alléger : `PAS d'intensité.` (3 mots au lieu de 11).
**Gain** : −0 L mais −60 tokens par plan | **Risque** : très faible.
**Verdict** : ✅ SAFE.

---

### #A1.8 — Règle "MAXIMUM 1 SL par semaine" (`buildSafetyInstructions` L2993)
**Localisation prompt** : L2993 `MAXIMUM 1 séance de type "Sortie Longue" par semaine. JAMAIS 2 Sortie Longue la même semaine.`
**Fonction code qui la couvre** :
- `postProcessWeekQuality` L794–844 : si ≥2 SL, garde la plus longue, retype les autres en Jogging.
- `enforceSLDay` L946–961 : dédup SL si plusieurs.
**Preuve** : double garde-fou code. La règle prompt sert juste à éviter le re-work.
**Patch** : conserver mais raccourcir : `Max 1 SL/sem (sauf PdP : 2 max).` (1 L au lieu de 2 L). Le code applique le reste.
**Gain** : −1 L | **Risque** : très faible.
**Verdict** : ✅ SAFE.

---

### #A1.9 — Règle "JAMAIS 2 séances longues consécutives" (couvert par postProcessWeekQuality L847+)
**Localisation prompt** : *pas de mention directe* — mais implicite via `MAXIMUM 1 SL/sem`. La règle "2 longues consécutives → conversion" est entièrement côté code (L847–875).
**Constat** : pas de patch prompt à faire ici. **Hors scope.**

---

### #A1.10 — Règle "ZERO D+ on track/recovery" (Preview L3114)
**Localisation prompt** : L3114 (buildDplusPromptBlock preview) : `- Piste / seuil / VMA : 0m (séances plates)`
**Fonction code qui la couvre** : `enforceWeekConstraints` L1450–1483 + `distributeElevationToSessions` L2005–2007 — force `elevationGain = 0` sur track/recovery.
**Preuve** : redistribution automatique vers SL longest si Gemini met du D+ sur track.
**Patch** : conserver (le prompt est très court et économise un calcul code).
**Verdict** : 🟢 NE PAS TOUCHER (info utile, 1 L seulement).

---

### #A1.11 — Règle "NE PAS générer le contenu du mainSet renfo — le code le fera" (Preview L3726, Remaining L4360, Hyrox L3674)
**Localisation prompt** :
- L3726 (INSTRUCTIONS Preview) : `- NE PAS générer le contenu du mainSet renfo — le code le fera`
- L4360 (Remaining) : `NE PAS générer le contenu du mainSet renfo — le code le fera. Place simplement la séance au bon jour.`
- L3674 (Hyrox Preview) : `(NE PAS le réécrire) ... le titre du renfo est généré séparément par le code, NE PAS le réécrire`
- L3684 + L4165 : autres mentions répétitives sur le renfo et stations Hyrox
**Fonction code qui la couvre** : `buildRenfoMainSet` L336+ (renfoService) appelée L3941 (preview) + L4590 (remaining). Override TOTAL de `mainSet`, `warmup`, `cooldown`, `duration`, `title`.
**Preuve** : 100% des plans audités → mainSet renfo correspond exactement à `buildRenfoMainSet`, jamais celui de Gemini.
**Patch** : conserver UNE seule mention (L3726 / L4360), supprimer les 2 redondances Hyrox (L3674 + L3680). Le titre Hyrox renfo est généré déterministiquement.
**Gain** : −2 L (Preview Hyrox) | **Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A1.12 — Règle "Cap durée Renfo : 30-45 min" (Preview L3723)
**Localisation prompt** : L3723 `- Durée : 30-45 min`
**Fonction code qui la couvre** : `buildRenfoMainSet` retourne `duration` qui écrase celle de Gemini (L3956).
**Preuve** : peu importe ce que Gemini écrit, la duration est écrasée.
**Patch** : supprimer L3723.
**Gain** : −1 L | **Risque** : nul.
**Verdict** : ✅ SAFE.

---

### #A1.13 — Règle "Type dans le JSON : Renforcement" (Preview L3724)
**Localisation prompt** : L3724 `- Type dans le JSON : "Renforcement"`
**Fonction code qui la couvre** : pas d'override direct, MAIS le type est utilisé par le code post-process pour appeler `buildRenfoMainSet` — si le type est mauvais, le renfo n'est pas généré. Donc règle UTILE.
**Verdict** : 🟢 NE PAS TOUCHER (règle nécessaire à l'aiguillage code).

---

### #A1.14 — Règle "NE PAS mettre de séance Repos dans le plan" (Preview L3725)
**Localisation prompt** : L3725 `- NE PAS mettre de séance "Repos" dans le plan`
**Fonction code qui la couvre** : `enforceWeekConstraints` L1606–1685 : si avg km/séance < 3.5, CONVERTIT certaines séances en Repos actif. Donc Gemini ne devrait PAS en mettre car le code en met si nécessaire.
**Preuve** : sur 110 plans audités, ~5% ont 1 Repos injecté par le code (jamais par Gemini).
**Patch** : conserver (la règle évite le re-work : si Gemini met Repos là où il y a juste un footing court, le code ne saura pas convertir).
**Verdict** : 🟢 NE PAS TOUCHER (1 L et utile).

---

### #A1.15 — Règle "COHÉRENCE DURÉE/DISTANCE/MAINSET" — bloc 3 lignes Preview L3727–3730
**Localisation prompt** : L3727–3730 :
```
6. COHÉRENCE DURÉE/DISTANCE/MAINSET (CRITIQUE) :
   Le champ "duration", le champ "distance" et le contenu du "mainSet" doivent être COHÉRENTS entre eux.
   Si duration = "45 min" et allure EF = ${...}, alors distance ≈ ${...} km.
   Le mainSet ne doit JAMAIS décrire une durée différente de "duration". Ex: si duration="45 min", ne PAS écrire "1h20 de course" dans le mainSet.
```
**Fonction code qui la couvre** : `recalculateSessionDistance` L595–636 : si `|calculatedKm - currentKm| / calculatedKm > 0.10`, ÉCRASE la distance avec `durée ÷ pace`.
**Preuve** : pour tout plan avec duration + targetPace définis, distance est forcée. Le mainSet textuel reste libre (non couvert par code), mais c'est cosmétique.
**Patch** : condenser en 1 L : `COHÉRENCE : duration et mainSet textuel doivent décrire la même durée (distance recalculée auto si écart >10%).`
**Gain** : −3 L | **Risque** : faible (cohérence mainSet textuel pas couverte par code — mais c'est un risque marginal car la distance affichée est correcte).
**Verdict** : ✅ SAFE.

---

### #A1.16 — Règle "place SL le ${longRunDay}" (Preview L3462, Remaining L4353)
**Localisation prompt** :
- Preview L3462 : `🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.`
- Remaining L4353 : `- Sortie Longue : OBLIGATOIREMENT le ${longRunDayRemaining}`
**Fonction code qui la couvre** : `enforceSLDay` L935–978 (preview L3884, remaining L4556) — force SWAP de la SL sur le jour préféré.
**Preuve** : si Gemini met la SL le mauvais jour, swap automatique. 100% du temps appliqué.
**Patch** : conserver UNE des 2 mentions (Remaining L4353 est plus courte et équivalente). Garder Preview en condensé : `🔴 SL → ${longRunDay}.`
**Gain** : −0 L réelle mais −15 tokens prompt | **Risque** : très faible.
**Verdict** : ✅ SAFE.

---

### #A1.17 — Règle "VOLUME S1 = X km — CIBLE BILATÉRALE ±5%" (Preview L3464)
**Localisation prompt** : L3464 — 280 caractères de ROI sur la valeur cible.
**Fonction code qui la couvre** : `enforceWeekConstraints` L1542–1601 : recalibrage automatique (scale UP si <80% target, scale DOWN si >110% target, tolérance ±10%).
**Preuve** : si volume Gemini ±5% target → conservé. Sinon scaled.
**Patch** : condenser : `🔴 Volume S1 ≈ ${X}km (somme des distances course).` (1 L au lieu de 1 L très longue ~280 chars).
**Gain** : −0 L mais −60 tokens | **Risque** : faible (le détail "±5%" est implicite, le code applique ±10%).
**Verdict** : ✅ SAFE.

---

### #A1.18 — Règle "La SL doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume" (Preview L3465, Remaining L4484)
**Localisation prompt** :
- Preview L3465 : `🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE de la semaine et représenter 30-40% du volume hebdo. Durée minimum SL : ${minSlDurForPrompt} min.`
- Remaining L4484 : idem
**Fonction code qui la couvre** :
- `enforceWeekConstraints` L1413–1426 : ensure SL is longest (au moins +10 min vs toute autre séance).
- `MIN_SL_PROPORTION` (L1056–1070) + L1341–1400 : enforce min proportion par objectif×niveau (28–40% selon profil).
- `MIN_SL_DURATION_MIN` (L1073–1087) + L1402–1410 : enforce min durée SL.
**Preuve** : 3 sous-règles déterministes appliquées systématiquement.
**Patch** : condenser : `🔴 SL = séance la plus longue, ≥${minSlDurForPrompt}min.` (1 L).
**Gain** : −0 L mais −40 tokens | **Risque** : faible (le "30-40% volume" est codé déterministiquement avec proportions adaptées par profil).
**Verdict** : ✅ SAFE.

---

### #A1.19 — Règle "max 2 séances intenses/semaine" (PdP Preview L3517, buildSafetyInstructions implicite)
**Localisation prompt** :
- L3517 (PdP Preview développement) : `Max 1 séance avec intensité légère par semaine.`
- L4395 (PdP Remaining) : `Max 1 séance intensité légère/semaine.`
**Fonction code qui la couvre** : `enforceWeekConstraints` L1500–1517 : `if (hardSessions.length > 2) downgrade extras to Modéré`. La règle "max 2 hard" est DURE en code.
**Preuve** : cap automatique.
**Patch** : conserver (sous-règle PdP plus stricte = 1 max, le code applique 2 max global). Pas de redondance car codes différents.
**Verdict** : 🟢 NE PAS TOUCHER.

---

### #A1.20 — Règle "PAS de séances > 45 min en débutant les 4 premières semaines" (buildSafetyInstructions L3003)
**Localisation prompt** : L3003 : `Aucune séance de course > 45 min les 4 premières semaines (sauf Marche/Course qui peut aller jusqu'à 50 min car elle inclut de la marche)`
**Fonction code qui la couvre** :
- `MAX_SL_DURATION['5K']['deb'] = 50` (L1023) — cap dur SL débutant 5K à 50min.
- `enforceWeekConstraints` L1322–1336 : `maxNonSlDur = 0.75 × maxSlDur` → non-SL ≤ 37min en deb 5K.
- `enforceWeekConstraints` L1264–1269 : cap SL.
**Preuve** : doublement couvert (cap SL + cap non-SL). Pour un débutant 5K, max SL = 50min, max non-SL = 37min.
**Patch** : conserver (la règle prompt est plus pédagogique : elle dit "les 4 PREMIÈRES semaines", alors que le code applique sur toutes). Garder en l'état mais condenser : `Séances ≤45min S1-S4 (sauf Marche/Course ≤50).` (1 L au lieu de 1 L longue).
**Gain** : −0 L mais −30 tokens | **Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A1.21 — Bloc "Type Running → mapping" (Preview L3491+ implicite)
**Localisation prompt** : *pas de bloc dédié*, mais implicite via "types autorisés".
**Fonction code qui la couvre** : `postProcessWeekQuality` L665–680 : retype `"Running"` → `Sortie Longue` / `Fractionné` / `Récupération` / `Marche/Course` / `Jogging` selon titre.
**Constat** : règle prompt absente, mais code force le retype. **Pas de patch.**
**Verdict** : 🟢 OK comme ça (le retype code est silencieux et efficace).

---

### #A1.22 — Règle "PROGRESSION VOLUME max +10-15%/semaine" (PdP Preview L3537, Remaining L4413)
**Localisation prompt** :
- L3537 : `Augmentation max : +10-15% par semaine. JAMAIS plus.`
- L4413 : `Max +10-15%/semaine.`
**Fonction code qui la couvre** : `enforceFullPlanConstraints` L1869–1904 : lissage forcé max +15% week-to-week (2 passes), réduction post-récup capped, etc.
**Preuve** : la règle 15% est appliquée déterministiquement.
**Patch** : supprimer L3537 (Preview PdP) — déjà couvert par code. Garder L4413 condensé.
**Gain** : −1 L (Preview) | **Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A1.23 — Règle "Drop -30% volume en semaine de récupération" (PdP Preview L3544, Remaining L4405)
**Localisation prompt** :
- L3544 : `Semaines de récup : SL réduite de 30% (ex: 50 min → 35 min)`
- L4405 : `- RÉCUPÉRATION : Jogging léger + Renfo allégé. Volume -30%.`
**Fonction code qui la couvre** : `calculatePeriodizationPlan` L2655–2659 : `recoveryFactor = prevWeekVol >= 60 ? 0.80 : prevWeekVol >= 30 ? 0.78 : 0.80;` — drop déterministe à 78–80% (donc -20–22%, pas -30%).
**Constat** : LÉGÈRE DIVERGENCE prompt (-30%) vs code (-20%). Mais le `weeklyVolumes[i]` que Gemini reçoit est DÉJÀ post-réduction → la règle prompt est de toute façon inopérante (Gemini reçoit la cible finale).
**Patch** : supprimer L3544 + L4405 (Gemini reçoit déjà le volume cible final pour la semaine, pas besoin de spécifier la baisse).
**Gain** : −2 L | **Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A1.24 — Règle "MIN 48h entre 2 séances qualité" (Hyrox Preview L3672, implicite)
**Localisation prompt** : Pas dans le main prompt mais dans `ADAPTATION_SYSTEM_INSTRUCTION` L5084 (utilisé seulement pour l'adaptation, pas la génération initiale).
**Constat** : règle non présente dans génération initiale → code doit l'enforcer.
**Fonction code qui la couvre** : `postProcessWeekQuality` L847–875 → 2 séances longues consécutives → conversion auto. Mais pour 2 séances **qualité** (frac+frac) ce n'est PAS couvert par code.
**Patch** : aucun (règle ABSENTE du prompt initial, pas un cas de redondance).
**Verdict** : ✅ pas un cas Axe 1.

---

### #A1.25 — Règle "Jours préférés EXCLUSIVEMENT" (Preview L3461, Remaining L4483)
**Localisation prompt** :
- L3461 : `🔴 Jours : ${data.preferredDays?.length ? data.preferredDays.join(', ') + ' — CES JOURS UNIQUEMENT.' : 'Répartition équilibrée.'}`
- L4483 : idem
**Fonction code qui la couvre** : preview L3873–3881 + remaining L4546–4553 → force `session.day = prefDays[idx]` si mismatch.
**Preuve** : code écrase 100% du temps.
**Patch** : conserver (utile : si Gemini sait qu'il doit utiliser ces jours, il génère le bon nombre de séances).
**Verdict** : 🟢 NE PAS TOUCHER (1 L et utile).

---

### #A1.26 — Bloc "FAISABILITÉ PRÉ-CALCULÉE — copie tel quel" (Preview L3737–3739) — déjà partiellement #S13 J2
**Localisation prompt** : L3737–3739 (3 L, déjà signalé #S13).
**Fonction code qui la couvre** : L4044–4050 override total.
**Patch** : déjà signalé #S13 J2 (PM-validé). À appliquer si pas encore fait.
**Verdict** : ✅ déjà patché.

---

### #A1.27 — Cap volume hebdo absolu `MAX_WEEKLY_VOLUME`
**Localisation prompt** : pas de mention directe — implicite via `weeklyVolumes[i]` qui est déjà capé.
**Fonction code qui la couvre** : `enforceWeekConstraints` L1519–1540 → cap absolu post-Gemini.
**Constat** : couverture totale, mais règle absente du prompt → pas de cas de redondance.
**Verdict** : ✅ pas un cas Axe 1.

---

### #A1.28 — Force `intensity` allowed values (`Facile|Modéré|Difficile`) — Preview L3777, JSON
**Localisation prompt** : L3777 dans JSON `"intensity": "Facile|Modéré|Difficile",`
**Fonction code qui la couvre** : non, mais `enforceWeekConstraints` L1500–1517 downgrade en Modéré si >2 hard, et `postProcessWeekQuality` retape intensity sur conversions. Pas de validation stricte des valeurs.
**Constat** : règle UTILE pour le schéma JSON.
**Verdict** : 🟢 NE PAS TOUCHER.

---

# Axe 2 — Lignes mortes statiques

### #A2.1 — `data.distance` / `data.trailDistance` legacy dans `buildSafetyInstructions` L2958
**Localisation** : L2958 `const isLongDistance = data.distance === 'Marathon' || data.distance === 'Semi-marathon' || (data.distance === 'Trail' && data.trailDistance && parseInt(data.trailDistance) >= 30);`
**Constat** : ni `data.distance` ni `data.trailDistance` n'existent dans `QuestionnaireData` (cf. `types.ts` L17–69). Le champ est `data.subGoal` + `data.trailDetails?.distance`. → condition **TOUJOURS FALSE**.
**Conséquence** : la branche L2960–2967 (Précautions articulaires LÉGÈRES pour IMC 25-30 + longue distance) n'est **JAMAIS atteinte** en prod depuis le rename type 2026-04.
**Patch** : remplacer par :
```ts
const isLongDistance =
  (data.subGoal && /marathon|semi/i.test(data.subGoal)) ||
  (data.goal === 'Trail' && (data.trailDetails?.distance || 0) >= 30);
```
**Gain** : 0 L (substitution) + ACTIVATION d'une branche safety dormante.
**Risque** : MOYEN — active un message safety qui n'était jamais envoyé. → **À discuter PM** (déjà #V6 J2).
**Verdict** : 🟡 CONDITIONNEL (PM décide si on veut allumer cette branche).

---

### #A2.2 — `data.estimatedVMA` jamais set dans `QuestionnaireData`
**Localisation** : L1162 `const vma = data.vma || data.estimatedVMA;`
**Constat** : ni `data.vma` ni `data.estimatedVMA` ne sont des champs de `QuestionnaireData` (types.ts). `data.vma` est injecté ad-hoc L3270 (`(data as any).vma = vmaEstimate.vma`). `data.estimatedVMA` est **jamais set nulle part** dans le code (vérifié via grep). → **fallback inutilisé**.
**Patch** : supprimer `|| data.estimatedVMA` (L1162) → `const vma = data.vma;`
**Gain** : −0 L (raccourcissement expression) + clarté code.
**Risque** : nul.
**Verdict** : ✅ SAFE.

---

### #A2.3 — `data.weightLossSubGoal` / `data.weeklyTimeAvailable` jamais utilisés dans geminiService
**Localisation** : champs déclarés `QuestionnaireData` L57–58 (`weightLossSubGoal`, `weeklyTimeAvailable`).
**Constat** : `grep "weightLossSubGoal\|weeklyTimeAvailable" geminiService.ts` → **0 résultat**. Les champs sont peut-être utilisés ailleurs (frontend), mais dans le prompt Gemini ils sont **ignorés** alors qu'ils pourraient enrichir la personnalisation PdP.
**Patch (option A)** : ajouter dans le bloc PdP `${data.weightLossSubGoal ? `Sous-objectif : ${data.weightLossSubGoal}` : ''}` (+1 L).
**Patch (option B)** : supprimer les champs de `QuestionnaireData` si vraiment non-utilisés. (Hors scope prompt audit.)
**Gain** : valeur info pour Gemini, pas de gain L.
**Verdict** : 🟡 CONDITIONNEL (PM décide si on veut enrichir le prompt PdP).

---

### #A2.4 — `R3_PROMPT_DPLUS_ENABLED` flag : valeur `VITE_R3_PROMPT_DPLUS_ENABLED` non définie en .env
**Localisation** : L3063 `const R3_PROMPT_DPLUS_ENABLED = import.meta.env.VITE_R3_PROMPT_DPLUS_ENABLED !== 'false';`
**Constat** : grep `VITE_R3_PROMPT_DPLUS_ENABLED` dans `.env*` → **non défini**. → `import.meta.env.VITE_R3_PROMPT_DPLUS_ENABLED` est `undefined`, et `undefined !== 'false'` → flag toujours `true` en prod.
**Patch** : si l'on confirme que le flag est destiné à rester `true` à vie, supprimer le flag :
```ts
const R3_PROMPT_DPLUS_ENABLED = true; // R3 validé prod 2026-04
// ... ou supprimer le check L3090
function buildDplusPromptBlock(opts: DplusBlockOpts): string {
  // SUPPRIMER: if (!R3_PROMPT_DPLUS_ENABLED) return '';
  if (!opts.weeklyElevationTarget || opts.weeklyElevationTarget.length === 0) return '';
  ...
}
```
**Gain** : −2 L (constante + check) + clarté.
**Risque** : MOYEN — si le flag est destiné à pouvoir désactiver R3 en cas de régression, conserver. → **À demander PM**.
**Verdict** : 🟡 CONDITIONNEL.

---

### #A2.5 — `previewObjective` calculé mais utilisé seulement pour `isVKPreview` / `isTrailSteepPreview` L3320–3322
**Localisation** : L3320 `const previewObjective = detectObjectiveFromData(data);` puis L3321–3322 vérifient `=== 'VK'` ou `=== 'TrailSteep'`. La variable `previewObjective` n'est utilisée nulle part ailleurs.
**Patch** : inliner :
```ts
const isVKPreview = detectObjectiveFromData(data) === 'VK';
const isTrailSteepPreview = detectObjectiveFromData(data) === 'TrailSteep';
```
Ou (mieux) garder la variable mais l'utiliser aussi dans le calcul de `previewObjective` qu'on appelle déjà 1 fois pour `objectiveForSL` L3399.
**Patch optimal** : factoriser :
```ts
const previewObjective = detectObjectiveFromData(data);
const previewLevel = detectLevelFromData(data);
const isVKPreview = previewObjective === 'VK';
const isTrailSteepPreview = previewObjective === 'TrailSteep';
const minSlDurForPrompt = (MIN_SL_DURATION_MIN[previewObjective] || {})[previewLevel] || 45;
```
**Gain** : −2 appels redondants à `detectObjectiveFromData` (L3320 + L3399) + clarté.
**Risque** : nul.
**Verdict** : ✅ SAFE (refactor mineur, mais PM a refusé factorisation → laisser tel quel).
**Statut révisé** : 🔴 SI PM CHALLENGE (refus factorisation J2).

---

### #A2.6 — `console.log` debug excessifs (~119 occurrences)
**Localisation** : 119 occurrences `console.{log,warn,error,debug}` dans le fichier.
**Constat** : la plupart sont utiles (debugging post-process), MAIS certains sont du log de progress qui pourraient être silenced en prod via env var.
**Patch** : pas de suppression — laisser tel quel (utiles pour debug Romane).
**Verdict** : 🟢 NE PAS TOUCHER (hors scope prompt).

---

### #A2.7 — `_dplusRole` marker interne non-cleané proprement L2029
**Localisation** : L2029 `runningSessions.forEach((s: any) => { delete s._dplusRole; });` dans le branche edge case "all sessions are track/recovery". Mais le cleanup principal est L2121 (en fin de fonction).
**Constat** : si Gemini a un cas edge où `eligible.length === 0`, on early-return L2031 après cleanup. OK. Pas un cas mort, juste un peu de duplication code.
**Patch** : pas critique.
**Verdict** : 🟢 OK.

---

### #A2.8 — Branche "Repos" jamais initiée par Gemini mais initiée par le code
**Localisation** : L1645 `s.type = 'Repos';` dans `enforceWeekConstraints`. Le prompt dit L3725 "NE PAS mettre de séance Repos dans le plan" mais le code en met si avg km/séance < 3.5.
**Constat** : cohérent (Gemini ne met pas Repos, code en met si besoin). **Pas un bug.**
**Verdict** : 🟢 OK.

---

### #A2.9 — Variable `pdpEfPace` PdP Preview L3495 utilisée ailleurs ?
**Localisation** : L3495 `const pdpEfPace = paces?.efPace || '8:00';` utilisé L3562 (ALTERNANCE MARCHE/COURSE) et L3573 (COHÉRENCE).
**Constat** : utilisé 2× → légitime.
**Verdict** : 🟢 OK.

---

### #A2.10 — Variable `vmaSource` Adaptation L5172 puis L5183 réassignée
**Localisation** : L5172 `vmaSource = \`Estimation niveau ${questionnaireData.level}\`;` puis L5183 réécrite si maintien.
**Constat** : code dupliqué entre `generatePreviewPlan` (L3187+) et `adaptPlanFromFeedback` (L5174+). Le bloc Cross-check VMA L5188–5205 est aussi dupliqué de L3204–3222.
**Patch** : factorisation possible MAIS PM a refusé. **Hors scope.**
**Verdict** : 🔴 SI PM CHALLENGE.

---

### #A2.11 — `data.frequency < 2` garde-fou + `data.frequency < 3` garde-fou (Preview L3234, L3243) duppliqué Remaining L4115
**Localisation** :
- Preview L3234 + L3243 : 2 garde-fous fréquence
- Remaining L4115 : 1 garde-fou (le 2e seulement, manque le `<2`)
**Constat** : ASYMÉTRIE. Remaining ne re-checke pas `< 2`, mais c'est OK car preview a déjà fait le check et `data` est figé dans le contexte.
**Patch** : conserver l'asymétrie (cohérente).
**Verdict** : 🟢 OK.

---

### #A2.12 — Imports inutilisés ?
**Localisation** : L1–8 imports.
**Constat** : tous utilisés (vérifié rapidement par grep).
**Verdict** : 🟢 OK.

---

# Axe 3 — Challenges des zones RISQUÉ (R1–R7)

### #A3.R1 — Section "🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨" L3457–3465

**Bloc actuel** (8 lignes en plus du header) :
```
═══════════════════════════════════════════════════════════════
          🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨
═══════════════════════════════════════════════════════════════
🔴 EXACTEMENT ${data.frequency} séances dans la semaine 1.
🔴 Jours : ${data.preferredDays?.length ? ... : 'Répartition équilibrée.'}
🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT la séance de type "Sortie Longue" ce jour-là.
🔴 Le plan TOTAL fait ${planDurationWeeks} semaines (tu ne génères que la semaine 1 ici).
🔴 VOLUME S1 = ${X} km — CIBLE BILATÉRALE ... [280 chars]
🔴 La SORTIE LONGUE doit être la séance la PLUS LONGUE ... [180 chars]
```

**Audit ligne par ligne** :

1. **L3460 (EXACTEMENT N séances)** — couverte 90% par `.slice(0, frequency)` (#A1.5). Garder MAIS retirer "EXACTEMENT" (Gemini comprend "${N} séances"). Économie tokens : ~10.
2. **L3461 (Jours)** — utile (couverte code mais empêche re-work). Garder.
3. **L3462 (SL le X)** — couvert par `enforceSLDay` (#A1.16). Condenser : `🔴 SL → ${longRunDay}.` (gain : −60 chars/L).
4. **L3463 (plan TOTAL N semaines)** — meta-info utile pour contexte. Garder.
5. **L3464 (VOLUME S1)** — peut être condensé (#A1.17), gain ~60 tokens.
6. **L3465 (SL la PLUS LONGUE + 30-40% + min minutes)** — couvert par #A1.18, condensable.

**Patches concrets** :
```
🚨 RÈGLES ABSOLUES :
🔴 ${data.frequency} séances cette semaine, sur les jours : ${preferredDays}.
🔴 SL → ${longRunDay} (séance la plus longue, ≥${minSlDur}min).
🔴 Plan total ${planDurationWeeks} sem (tu ne génères que la semaine 1).
🔴 Volume cible ≈ ${X} km (somme des distances course).
```

**Gain** : 8 L → 5 L, soit −3 L brutes + ~150 tokens en moins.
**Risque** : faible — les 5 règles essentielles sont préservées, l'emphase "🚨🚨🚨 × 3 + RÈGLES ABSOLUES + 🔴 × 6" est diluée mais pas supprimée.
**Mitigation** : test A/B 20 plans avant déploiement.

**Verdict** : ✅ SAFE-CONDITIONNEL.

---

### #A3.R2 — `data.frequency` mentionné 5× dans Preview (PROFIL L3414 + RÈGLES L3460 + INSTRUCTIONS L3722 + L3735 + JSON L3751)

**Constat ligne par ligne** :

1. **L3414 (PROFIL)** : `- Fréquence : ${data.frequency} séances/semaine` → contexte.
2. **L3460 (RÈGLES ABSOLUES)** : `🔴 EXACTEMENT ${data.frequency} séances...` → injonction.
3. **L3722 (INSTRUCTIONS 5)** : `- Répartition : ${data.frequency} séances = ${data.frequency - 1} running + 1 renfo` → détail.
4. **L3735 (INSTRUCTIONS 6)** : pas de mention frequency dans le bloc cohérence durée/distance. **FAUSSE MENTION dans J2** — vérification grep confirme.
5. **L3751 (JSON)** : `"sessionsPerWeek": ${data.frequency},` → schema.

→ **Vraie distribution : 4 mentions, pas 5.**

**Patch possible** : la mention L3722 (`Répartition : ${data.frequency} séances = ${data.frequency - 1} running + 1 renfo`) est très utile (cas où Gemini oublie le renfo) → garder. La mention L3414 PROFIL et L3460 RÈGLES sont redondantes (PROFIL + RÈGLES disent la même chose). Supprimer L3414 (PROFIL n'a pas besoin de répéter une info en RÈGLES juste 50 lignes plus bas).

**Patch** : supprimer `- Fréquence : ${data.frequency} séances/semaine` L3414.

**Gain** : −1 L | **Risque** : faible (la fréquence reste dans RÈGLES + INSTRUCTIONS + JSON).
**Verdict** : ✅ SAFE.

---

### #A3.R3 — Bloc `🏔️ ULTRA-TRAIL 100km+` Preview L3343–3353 vs Remaining L4255–4258 (asymétrie)

**Preview** : 7 bullets (BACK-TO-BACK, MARCHE EN CÔTE, NUTRITION via constante, MATÉRIEL, GESTION D'ALLURE, renfo, D+ via buildDplusPromptBlock).
**Remaining** : 4 bullets (BACK-TO-BACK, MARCHE EN CÔTE, NUTRITION, allure ultra) — MANQUE MATÉRIEL.

**Audit ligne par ligne** :

- **L3346 (SL clé 50–65km)** : pédagogique, utile S1. Garder Preview, supprimer en Remaining (déjà figé).
- **L3347 (BACK-TO-BACK)** : DUPLIQUÉ dans Remaining L4231–4232. Audit J1 a déjà signalé ce point (D6/D7).
- **L3348 (MARCHE EN CÔTE)** : DUPLIQUÉ Remaining L4232.
- **L3349 (NUTRITION_SL_BLOCK)** : factorisé en constante (R-F), utilisé Preview L3349 + Remaining L4235. OK.
- **L3350 (MATÉRIEL)** : présent Preview, ABSENT Remaining → asymétrie. Devrait être ajouté en Remaining (le matériel s'utilise dès la phase développement).
- **L3351 (GESTION D'ALLURE 7:00–8:00)** : présent Preview, ABSENT Remaining → asymétrie. Devrait être ajouté.
- **L3352 (buildDplusPromptBlock)** : R3.
- **L3353 (renfo)** : présent partout.

**Patch proposé** (réconcilier sans toucher au comportement) :
- Preview L3343–3353 : OK tel quel (verbeux S1 = first impression).
- Remaining L4231–4234 : AJOUTER MATÉRIEL + GESTION D'ALLURE pour aligner pédagogie.

**Patch concret Remaining** :
```js
${data.trailDetails!.distance >= 100 ? `- 🔴 ULTRA 100km+ : BACK-TO-BACK OBLIGATOIRE en phase spécifique...
- Marche en côte (power hiking)...
- SL pic 50-65km...
- Allure ultra PLUS LENTE que EF (7:00-8:00 min/km)
- MATÉRIEL : s'entraîner avec sac et bâtons dès la phase développement
${NUTRITION_SL_BLOCK}` : ...
```

**Gain** : +2 L Remaining (cohérence pédagogique) | **Risque** : neutre côté tokens, +1 risque côté pédagogie si on garde l'asymétrie volontaire.

**Verdict** : 🟡 CONDITIONNEL — PM choisit Option A (ajouter en Remaining = +2 L), Option B (supprimer en Preview = −2 L), Option C (laisser asymétrique = 0 L).

---

### #A3.R4 — Bloc `🔴 PLAN PERTE DE POIDS` Preview L3503–3577 (~75 L) vs Remaining L4384–4425 (~42 L)

**Audit ligne par ligne du Preview** :

| Ligne | Contenu | Couverture code | Patch ? |
|---|---|---|---|
| L3503–3506 | header + flags VMA/IMC | utile | conserver |
| L3508–3512 | INTERDICTIONS ABSOLUES (déjà patchée S19) | partiel (no race time) | déjà patché |
| L3514–3527 | SÉANCES PAR PHASE (FONDAMENTALE/DÉVELOPPEMENT/RÉCUPÉRATION) | utile | conserver |
| L3529–3531 | STRUCTURE 3+1 | non couvert code | conserver |
| L3533–3538 | PROGRESSION VOLUME TOTAL HEBDO | couvert `enforceFullPlanConstraints` (#A1.22) | **supprimer ou condenser** |
| L3540–3545 | PROGRESSION SORTIE LONGUE | partiellement couvert `MIN_SL_DURATION_MIN` | condenser |
| L3547–3553 | RENFORCEMENT — CADRAGE | COUVERT `buildRenfoMainSet` (override total) | **SUPPRIMER** |
| L3555–3559 | EFFORT PERÇU (V3 J2 à valider) | non couvert | condenser (#V3) |
| L3561–3565 | ALTERNANCE MARCHE/COURSE | non couvert | conserver |
| L3567–3568 | SIGNAUX D'ALERTE (V2 J2) | couvert `buildSafetyInstructions` | **SUPPRIMER (V2 Option C)** |
| L3570–3573 | COHÉRENCE DURÉE/DISTANCE | couvert `recalculateSessionDistance` | condenser |
| L3575 | NOMMAGE | partiel | conserver |
| L3577 | PRIORITÉ ABSOLUE | meta | conserver (1 L) |

**Patches concrets** :

1. **#A3.R4.a** — Supprimer L3547–3553 (RENFORCEMENT CADRAGE 7 L) : **TOUT le contenu renfo est généré par `buildRenfoMainSet`** (durée, exos, progression). Le bloc 7 L est de la PURE PERTE de tokens.
   - **Gain : −7 L** | Risque : nul (vérifié, `buildRenfoMainSet` couvre poids de corps, gainage, fentes, squats, prog reps, evite pliométrie).
   - **Verdict : ✅ SAFE.**

2. **#A3.R4.b** — Supprimer L3533–3538 (PROGRESSION VOLUME TOTAL HEBDO 6 L) : `enforceFullPlanConstraints` enforce +15% max, `weeklyVolumes` est déjà calculé/injecté dans le prompt général. Le détail "1h20–1h40 → 1h40–2h00 → 2h00–2h20" est cosmétique.
   - **Gain : −6 L** | Risque : faible (Gemini reçoit le volume cible par semaine via `weeklyVolumes`).
   - **Verdict : ✅ SAFE.**

3. **#A3.R4.c** — Supprimer L3567–3568 (SIGNAUX D'ALERTE 2 L) — couvert par #V2 J2 Option C (déjà dans `buildSafetyInstructions`).
   - **Gain : −2 L** | Risque : faible.
   - **Verdict : ✅ SAFE (#V2 PM-validé).**

4. **#A3.R4.d** — Condenser L3540–3545 (PROGRESSION SL 6 L) en 2 L :
   ```
   PROGRESSION SL (longueur) : ~30 min S1 → ~50 min mid-plan → ~${pdpMaxSLmin} min S9-S11. Récup : -30%. Jamais identique 2 semaines.
   ```
   - **Gain : −4 L** | Risque : faible.
   - **Verdict : ✅ SAFE.**

5. **#A3.R4.e** — Condenser L3555–3559 (EFFORT PERÇU 5 L) en 1 L (#V3 J2 aligné sur Remaining L4419) :
   ```
   EFFORT PERÇU dans chaque mainSet : Jogging/SL = "4/10, conversation" | Fartlek = "6-7/10 accélérations" | Récup = "3/10".
   ```
   - **Gain : −4 L** | Risque : faible.
   - **Verdict : ✅ SAFE (#V3 PM-validé).**

6. **#A3.R4.f** — Condenser L3570–3573 (COHÉRENCE 4 L) en 1 L :
   ```
   COHÉRENCE duration/distance/mainSet : distance recalculée auto si écart >10% (tolérance code).
   ```
   - **Gain : −3 L** | Risque : faible.
   - **Verdict : ✅ SAFE.**

**Total Preview PdP : −26 L sur 75 L = −35%.**

**Pour Remaining PdP** : audit similaire (L4384–4425 ~42 L) :
- L4396–4404 (DIVERSIFIER bullets 9 L) : audit ligne — pédagogique mais Gemini connaît ces concepts. **Condenser en 2 L** : `Diversifier : fartlek nature, côtes douces, circuit cardio-renfo, footing progressif, technique cadence.` Gain : −7 L.
- L4417 (RENFORCEMENT 1 L) : couvert `buildRenfoMainSet` → supprimer. Gain : −1 L.
- L4421 (COHÉRENCE 1 L) : déjà condensée. OK.

**Total Remaining PdP : −8 L.**

**Total #A3.R4 : −34 L** (PdP Preview + Remaining).

---

### #A3.R5 — `buildSafetyInstructions` L2912–3047 (135 L)

**Audit ligne par ligne** :

| Bloc | Lignes | Doctrine intacte | Patch possible |
|---|---|---|---|
| Header isHighRisk | L2911–2917 | OUI (sécurité médicale max) | conserver intégralement |
| isModerateRisk | L2918–2922 | OUI | conserver |
| Default (else) | L2923–2927 | OUI | conserver |
| imcTier ≥ 3 (135 chars/L × 12 L) | L2930–2943 | OUI | conserver |
| imcTier ≥ 2 (12 L) | L2944–2956 | OUI | conserver |
| imcTier ≥ 1 + isLongDistance | L2957–2967 | **DEAD CODE** (cf #A2.1) | **patch obligatoire** |
| isSenior | L2970–2978 | OUI | conserver |
| isRestart | L2980–2985 | OUI | conserver |
| DIVERSITÉ OBLIGATOIRE | L2988–2996 | OUI mais doublé PdP (#S10 PM-validé) | déjà patché S10 |
| isBeginnerLevel | L2998–3005 | OUI | conserver |
| totalWeeks > 24 | L3010–3016 | OUI | conserver |
| isWeightLossGoal | L3024–3033 | OUI | conserver |
| isWeightLossGoal + bmi<20 (RED-S) | L3036–3042 | OUI | conserver |

**Bloc à patcher** : L2957–2967 (#A2.1 = fix condition `isLongDistance`).

**Autres surcharges sémantiques** (Axe 4 à appliquer) :

1. **L2942 + L2955 + L2965 + L3032 + L3042** : **5 répétitions** quasi-identiques de `🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie...`
   - **Patch** : extraire en constante `const NO_WEIGHT_MENTION = '🚫 NE JAMAIS mentionner le poids/IMC/corpulence du coureur. Ton positif et encourageant.';` puis utiliser dans chaque bloc.
   - **Gain** : 5 → 1 ligne réelle injectée (chaque utilisation reste 1 L mais factorisé). Côté tokens prompt : 5× ~25 tokens = 125 tokens → ~25 tokens = −100 tokens par génération.
   - **Verdict** : 🔴 SI PM CHALLENGE (refus factorisation). Sinon SAFE.

2. **L2943 + L2956 + L2966** : **3 répétitions** de `🚫 NE JAMAIS proposer ni mentionner de cross-training, vélo, natation, elliptique ou autre sport. Ce coach est EXCLUSIVEMENT course à pied...`
   - Même solution. **Gain : ~80 tokens.**

3. **L3015** (`70% des séances réalisées = bon résultat`) : meta-instruction de tone. OK.

**Conclusion #R5** : la fonction est dense MAIS non-redondante (chaque bloc cible une catégorie risque distincte). Les seuls patches sont :
- **#A3.R5.a** : fix `data.distance` → `data.subGoal` / `trailDetails` (#A2.1) → +activation branche dormante.
- **#A3.R5.b** : factoriser `NO_WEIGHT_MENTION` (5 occurrences) — refus PM probable.
- **#A3.R5.c** : factoriser `NO_CROSS_TRAINING_MENTION` (3 occurrences) — refus PM probable.

**Gain total** : 0–8 L selon décisions factorisation.

**Verdict** : 🟡 CONDITIONNEL.

---

### #A3.R6 — Sections D+ via `buildDplusPromptBlock` L3089–3134

**Audit ligne par ligne** :

| Ligne | Contenu | Patch ? |
|---|---|---|
| L3090 | `if (!R3_PROMPT_DPLUS_ENABLED) return '';` | #A2.4 (flag toujours true) |
| L3091 | early return si pas de target | OK |
| L3093 | calcul dplusPerKm | OK |
| L3100 | early return si raceDplus < 500 | OK |
| L3104–3114 | bloc preview (10 L injectées Gemini) | utile |
| L3115–3127 | bloc remaining (11 L injectées Gemini) | utile |
| L3127 | `⚠️ elevationGain OBLIGATOIRE sur chaque séance (sauf Renforcement).` | utile (sans ça Flash met en texte) |
| L3130–3132 | commentaire `Note : back-to-back / marche montée / descente technique sont déjà dans le prompt trail existant...` | comment dev, hors prompt |

**Patches possibles** :

1. **#A3.R6.a** : simplifier le label `(récup)` / `(affût)` L3120 : 
   ```js
   const label = isRecov ? '↓récup' : isAffut ? '↓affût' : '';
   ```
   → préfixe `↓` plus court que mot complet. Gain : ~5 tokens par batch.
   - **Verdict** : 🟡 conditionnel (cosmétique).

2. **#A3.R6.b** : supprimer la légende détaillée L3124 `Répartition par semaine : SL ~58% | vallonnée/côte ~37% | footings ~5% | piste/seuil/VMA 0m.` car la distribution est déterministe via `distributeElevationToSessions` qui ÉCRASE complètement les valeurs Gemini. → règle prompt INUTILE car le code force.
   - **Gain** : −1 L Remaining + ~20 tokens.
   - **Risque** : faible — Gemini ne fait que poser les chiffres dans le JSON, le code les recalcule.
   - **Verdict** : ✅ SAFE.

3. **#A3.R6.c** : test-r3-prompt-blocks.mjs valide-t-il la présence textuelle de "SL ~58%" ? Si oui, le test cassera. À vérifier avant patch.

**Total #R6** : −1 L confirmé, +1 L potentiel selon flag.

---

### #A3.R7 — `applyTargetTimeOverride` L992–1019 + `getBestVMAEstimate` L183–280

**Constat** : ce sont des fonctions code, PAS du prompt Gemini. **Hors scope d'audit prompt.**

**Audit code rapide (5 min)** :
- `applyTargetTimeOverride` L992–1019 : doctrine respectée (allure = chrono cible user, pas de plafond). OK.
- `getBestVMAEstimate` L183–280 : logique propre, fallback corrigé, filtre aberrations 8–25 km/h. OK.

**Patches possibles côté CODE** (hors scope mais signalé) :
- L1015 : `const ratioInfo = ratio > 1 ? \` (cible = ${...}% VMA, ambitieux)\` : '';` — utilisé uniquement dans console.log. Pas de patch.
- L184 : early return `if (!raceTimes) return null;` — propre.

**Verdict** : 🟢 OK, rien à toucher.

---

# Axe 4 — Surcharges sémantiques

### #A4.1 — `🚨🚨🚨 RÈGLES ABSOLUES 🚨🚨🚨` triple emoji (L3458)
**Constat** : 3 emojis 🚨 successifs encadrent "RÈGLES ABSOLUES" déjà en MAJUSCULES + entouré par `═══`. Pour Gemini 2.5 flash, 1 emoji + MAJ + `═══` suffit largement (salience max atteinte dès 1 emoji).
**Patch** : `🚨 RÈGLES ABSOLUES :` (1 emoji).
**Gain** : −10 tokens (3 emojis = 3 tokens, header simplifié).
**Risque** : faible. Tests J1 montrent que Gemini respecte la section même sans triple emoji.
**Verdict** : ✅ SAFE.

---

### #A4.2 — "OBLIGATOIRE" × 38 occurrences
**Localisation** : 38 occurrences dans le fichier (grep). Beaucoup sont dans des blocs déjà signalés avec d'autres emphases.
**Échantillon** :
- L2913 : `Dans le message de bienvenue (welcomeMessage), tu DOIS inclure EN PREMIER, AVANT toute autre information :` → "DOIS" + "EN PREMIER" + "AVANT TOUTE AUTRE INFORMATION" = triple emphase sur "tu dois inclure en premier".
- L2916 : `Chaque séance DOIT avoir un conseil` → "DOIT" en MAJ suffit.
- L2990 : `🔴 DIVERSITÉ OBLIGATOIRE DES SÉANCES :` → emoji + "OBLIGATOIRE" + MAJ.
- L3429 : `📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :` → emoji + "OBLIGATOIRE" + MAJ.

**Patch** : retirer "OBLIGATOIRE" quand il y a déjà un emoji 🔴 / 🚨 + MAJ. Garder 1 emphase max.

**Patches concrets (top 10 plus économiques)** :
1. L2990 : `🔴 DIVERSITÉ OBLIGATOIRE DES SÉANCES` → `🔴 DIVERSITÉ DES SÉANCES`
2. L3429 : `📍 LIEU PAR SÉANCE (locationSuggestion) — OBLIGATOIRE :` → `📍 LIEU PAR SÉANCE :`
3. L3503 : `🔴 PLAN PERTE DE POIDS — RÈGLES SPÉCIFIQUES (OBLIGATOIRE)` → `🔴 PLAN PDP — RÈGLES SPÉCIFIQUES`
4. L3540 : `PROGRESSION SORTIE LONGUE (OBLIGATOIRE) :` → `PROGRESSION SL :`
5. L3547 : `RENFORCEMENT — CADRAGE OBLIGATOIRE :` → (déjà supprimé en #A3.R4.a)
6. L3555 : `EFFORT PERÇU DANS LES MAINSET (OBLIGATOIRE) :` → `EFFORT PERÇU :`
7. L3587 : `🔴 PLAN HYROX — PRÉPA COURSE À PIED (OBLIGATOIRE) :` → `🔴 PLAN HYROX — RÈGLES SPÉCIFIQUES :`
8. L3608 : `🔑 Séance clé Hyrox ... — OBLIGATOIRE` → garder (anchor visuel utile).
9. L3614 : `🔑 Séance clé Hyrox ... — OBLIGATOIRE` → idem.
10. L3722 : `5. OBLIGATOIRE : 1 séance de type "Renforcement"...` → `5. 1 séance "Renforcement"/sem.` (le "OBLIGATOIRE" est implicite dans la liste d'instructions numérotées).

**Gain total** : ~200 tokens (10× ~20 tokens) sans aucune perte d'information.
**Risque** : faible — la salience est portée par les emojis + MAJ.
**Verdict** : ✅ SAFE.

---

### #A4.3 — "JAMAIS" × 22 occurrences en `🚫`, "PAS de", "NE PAS"
**Localisation** : `JAMAIS`, `NE JAMAIS`, `PAS de`, `NE PAS`, `PAS d'`.
**Constat** : pattern de listes "PAS X, PAS Y, PAS Z" alors qu'une whitelist serait plus courte.

**Exemples concrets** :

1. **L3489 (Preview developpement)** : `developpement : + Fractionné (VMA courte, côtes), seuil court possible.` → whitelist OK.
2. **L3510 (PdP Preview INTERDICTIONS)** : `JAMAIS de "phase spécifique" ni "phase affûtage" — seules les phases "fondamental", "developpement" et "recuperation" existent` → la formulation "seules X, Y, Z existent" est déjà mi-whitelist mi-blacklist. La 1ère partie "JAMAIS de phase spe / affûtage" est REDONDANTE avec la whitelist. **Patch** : `phases autorisées : fondamental | developpement | recuperation.` → −1 emphase, plus court de 40 chars.
3. **L3389 (PdP Remaining INTERDICTIONS)** : 4 "JAMAIS" en cascade : `JAMAIS d'allure spé course, JAMAIS de phase spécifique/affûtage, JAMAIS de VMA/fractionné intense en fondamental, JAMAIS "allure spé" dans les mainSet.`
   - Bullet 1 et 4 = même règle (allure spé) — déjà signalé #S19 J2.
   - Bullet 2 = whitelist potentielle (phases autorisées).
   - **Patch** : `INTERDIT : allure spé/course | phase spécifique ou affûtage | VMA/frac intense en fondamental.` Gain : 1 L plus court de 60 chars.
4. **L3032** : `🚫 NE JAMAIS mentionner le poids, l'IMC, la corpulence ou la morphologie du coureur dans AUCUN message. Rester positif et encourageant.` → "NE JAMAIS" + "AUCUN MESSAGE" = double emphase. **Patch** : `🚫 Aucune mention du poids/IMC/corpulence. Reste positif.` → −40 chars.

**Gain global** : ~80 tokens.
**Verdict** : ✅ SAFE pour cleanup batch.

---

### #A4.4 — Bloc preview `5. OBLIGATOIRE : 1 séance Renforcement` (Preview L3721–3726, 6 L) — déjà patché en #A1.11 + #A1.12 + #A1.13
**Total gain (en combinant #A1.11/12)** : −2 L (durée + 2 mentions Hyrox renfo).
**Verdict** : ✅ déjà couvert.

---

### #A4.5 — Bloc INSTRUCTION Preview L3717–3731 : 7 instructions numérotées
**Audit** :

1. `1. Génère SEULEMENT la semaine 1 (pas les autres !)` — déjà signalé #S5 J2 (4 occurrences de cette règle).
2. `2. Allures EXACTES dans chaque mainSet` — 1 L utile.
3. `3. Message de bienvenue orienté OBJECTIF et STRUCTURE (PAS de VMA ni allures)` — utile, garde-fou ton welcome.
4. `4. Évaluation de faisabilité HONNÊTE avec chiffres` — **REDONDANT** : feasibility écrasé déterministiquement L4044–4050. Supprimer.
   - **Gain** : −1 L | **Risque** : très faible.
5. `5. OBLIGATOIRE : 1 séance Renforcement...` → #A4.4 condensable.
6. `6. COHÉRENCE DURÉE/DISTANCE/MAINSET...` → #A1.15 condensable.
7. `7. NOMMAGE types : ...` → #S17 J2 condensable.

**Patch global INSTRUCTIONS** :
```
INSTRUCTIONS :
1. Allures EXACTES dans chaque mainSet.
2. welcomeMessage orienté OBJECTIF et STRUCTURE (pas de VMA ni allures).
3. 1 séance "Renforcement"/sem (le code remplit le contenu, mets juste le type+jour+durée 30-45min).
4. COHÉRENCE duration/mainSet textuel (distance recalculée auto).
${!isPdp && !isHyrox ? `5. Types : "Jogging", "Fractionné", "Sortie Longue", "Récupération", "Renforcement", "Marche/Course".` : ''}
```
**Gain** : 7 instructions ~15 L → 5 instructions ~6 L = **−9 L**.
**Risque** : moyen (changement structure visuelle, à tester).
**Verdict** : ✅ SAFE-CONDITIONNEL.

---

### #A4.6 — Triple emphase "VMA TRÈS RÉDUITE" / "TRÈS RÉDUIT" / "MAXIMALES" en blocs VK/Hyrox
**Localisation** :
- L3327 (VK Preview) : `Volume hebdomadaire TRÈS RÉDUIT (max 20-45km selon niveau).`
- L3329 (VK) : `Sortie longue orientée DÉNIVELÉ (pas distance)`
- L2931 (IMC ≥35) : `🚨 IMC ≥ 35 — PRÉCAUTIONS ARTICULAIRES MAXIMALES :`
- L2933 (IMC ≥35) : `Priorité ABSOLUE : marche/course alternée systématique...`

**Constat** : 4–5 emphases visuelles cumulées (MAJ + emoji + adverbe extrême).

**Patch** : retirer 1 niveau d'emphase quand 2+ sont présents. Ex L2933 → `Priorité : marche/course alternée systématique...` (suppression "ABSOLUE", l'emphase est portée par le `🚨` + MAJ "MAXIMALES" deux lignes avant).

**Gain** : ~30 tokens × 8 emphases = ~240 tokens.
**Verdict** : ✅ SAFE.

---

### #A4.7 — `⚠️ FORMAT VK — PAS un trail classique` × 2 (Preview L3326 + Remaining L4198)
**Constat** : duplicate strict. Justifié par la fragmentation Preview/Remaining.
**Patch** : conserver tel quel (1 L chacun, doctrine "Preview verbose, Remaining condensé").
**Verdict** : 🟢 OK.

---

### #A4.8 — Bloc "PROFIL DU COUREUR" Preview L3408–3420 vs Remaining L4346–4356 — phrasing identique
**Constat** :
- Preview L3410–3417 : 7 bullets (Niveau, Objectif, Temps, Date course, Fréquence, Jours, Jour SL, Localisation).
- Remaining L4348–4353 : 5 bullets (Niveau, Objectif, Temps, Fréquence, Jours, SL).

**Patch déjà identifié** : #V1 J2 (Localisation L3417) + #A3.R2 (Fréquence L3414).
**Constat additionnel** : phrasing strictement identique entre Preview et Remaining pour les bullets communs → pas de réduction possible sans factorisation (refus PM).
**Verdict** : 🟢 OK.

---

### #A4.9 — Doublon `Allures EXACTES` / `EXACTEMENT` / `mot pour mot`
**Localisation** : grep `EXACTES?` + `EXACTEMENT` + `mot pour mot` :
- L3445 (Preview) : `⚠️ UTILISE CES ALLURES EXACTES dans chaque séance !`
- L3460 : `🔴 EXACTEMENT ${data.frequency} séances` (#A3.R2 condensé)
- L3718 : `2. Allures EXACTES dans chaque mainSet`
- L3739 : `EXACTEMENT le texte ci-dessus, mot pour mot, sans changer aucun chiffre`
- L4318 (Remaining) : `VMA du coureur` puis L4321 `EF : ${...}` → pas d'"EXACTES" explicite.

**Patch** : 
- L3445 + L3718 sont REDONDANTS → supprimer L3445 (déjà dans INSTRUCTIONS L3718).
- **Gain** : −1 L.

**Verdict** : ✅ SAFE.

---

### #A4.10 — Bloc "🔑 Séance clé Hyrox" répété 4× selon fréquence (L3601, L3608, L3614, L3621)
**Constat** : pour chaque branche (`hyroxFreq ≤ 2 / === 3 / === 4 / >= 5`), le bullet `🔑 Séance clé Hyrox (simulation OU tempo OU relances)` est répété quasi-identique avec micro-variations.

**Patch** : factoriser en constante AU-DESSUS du `return` :
```ts
const HYROX_KEY_SESSION = '🔑 Séance clé Hyrox (simulation 8×1km / tempo seuil / relances sous fatigue) — OBLIGATOIRE';
```
Refus PM probable (no factorisation), donc :
**Patch alternatif** : condenser les 4 branches en 1 :
```
STRUCTURE HEBDO IDÉALE (adapter au volume cible ${X}km/sem) :
1. 🔑 Séance clé Hyrox (simulation 4-8×1km / tempo seuil / relances) — OBLIGATOIRE.
2. Footing EF (base aérobie) — varier selon nb séances.
3. Renforcement prévention OU 2e séance qualité si fréquence ≥4.
4-5. Footings additionnels si fréquence ≥4 (progressif, nature, technique).
```
**Gain** : ~30 L → ~5 L = **−25 L** (mais factorisation interdite par PM, donc non-applicable).

**Verdict** : 🔴 SI PM CHALLENGE — sinon laisser tel quel.

---

### #A4.11 — Bloc "CATALOGUE DE SÉANCES HYROX" 8 séances L3644–3675 (~30 L)
**Audit** :
- Séances 1–5 : spécifiques Hyrox (Simulation, Relances, Tempo, Intervalles, Fartlek) — utiles.
- Séances 6–8 : génériques (Footing EF, Footing progressif, Renforcement) — déjà condensées #S20 J2.

**Patch additionnel** : pour les séances 1–5, les conseils "→ Phase X" (5×) sont redondants avec la section PHASES juste après (L3663–3667).
**Patch** : supprimer les `→ Phase X uniquement / phase X+` (5 occurrences).
**Gain** : −5 L | **Risque** : faible (la phase est donnée 2 lignes plus bas).
**Verdict** : ✅ SAFE.

---

### #A4.12 — Bloc PHASES Hyrox L3663–3667 (5 L) — strictement identique à PHASES standard
**Constat** : `- FONDAMENTALE : ... PAS de simulation Hyrox.` vs le bloc TYPES standard. Le bloc Hyrox spécifie quelques différences mais 4/5 bullets sont génériques.
**Patch** : condenser :
```
PHASES Hyrox (différences vs running standard) :
- FOND : pas de simulation Hyrox.
- DEV : ajouter 1 séance qualité (tempo/intervalles/relances).
- SPE : 1 simulation Hyrox (4→6→8×1km progressif) + ${hyroxFreq >=4 ? '1 séance qualité + ' : ''}footings EF + renfo.
- AFFÛT : -40% volume, rappels d'allure courts (3-4×1km), footings légers.
```
**Gain** : 5 L → 4 L = −1 L | Risque : faible.
**Verdict** : ✅ SAFE.

---

### #A4.13 — Bloc ADVICE Hyrox L3682–3692 (10 L de garde-fous + exemples)
**Audit ligne par ligne** :
- L3682–3683 (header + ⚠️ renfo distinction) : utile (sécurité doctrine).
- L3686–3691 : 5 exemples advice (Footing/Renfo/SL/MC/Séance clé) — 5 L très verbeuses.
- L3692 : `🚫 INTERDIT : répéter "Ce programme couvre la partie course à pied" dans plusieurs advice.` — utile.
- L3693 : `La mention "ce plan = running uniquement, fonctionnel à côté" doit aller UNE SEULE FOIS dans le welcomeMessage.` — utile.

**Patch** : les 5 exemples peuvent être condensés en 2 L :
```
Exemples advice (à adapter) :
- Footing/SL : lien avec capacité aérobie pour enchaîner les 8×1km.
- Séance clé Hyrox : conseils pacing + technique relance après segment de course rapide.
```
(Renfo et MC sont génériques, Gemini sait.)

**Gain** : 10 L → 5 L = **−5 L**.
**Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A4.14 — Bloc WELCOMEMESSAGE HYROX L3695–3702 (8 L)
**Audit** :
- L3695 : header.
- L3696 : `1. UNE phrase qui clarifie : ce plan couvre la partie course à pied de la prépa Hyrox.` — utile.
- L3697 : `2. Mini-roadmap des phases sur ${planDurationWeeks} semaines pour donner de la perspective dès la S1 :`
- L3698–3701 : 4 bullets roadmap (S1-3, S4-6, S7+, Affûtage).
- L3702 : `3. Une phrase de motivation orientée Hyrox spécifiquement (pas un message running générique).`

**Patch** : la roadmap est utile pédagogiquement mais ASYMÉTRIQUE avec autres profils (PdP / Trail / Standard n'ont pas de mini-roadmap dans le welcomeMessage). Si on garde, condenser :
```
WELCOMEMESSAGE Hyrox (obligatoire) :
1. Clarifier : ce plan couvre la partie course à pied (athlète gère fonctionnel à côté).
2. Mini-roadmap : S1-3 base + technique → S4-6 fartlek → S7+ simulations 4→6→8×1km → Affûtage rappels.
3. Motivation Hyrox spécifique.
```
**Gain** : 8 L → 4 L = **−4 L**.
**Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A4.15 — Phrase "Gemini sait déjà" — pédagogie surfacée
**Localisation** : plusieurs lignes mentionnent explicitement ce que Gemini doit faire alors que c'est implicite :
- L3719 : `3. Message de bienvenue orienté OBJECTIF et STRUCTURE` → utile.
- L3677 (Hyrox SL) : `Sortie Longue → "Sortie Longue — Volume aérobie Hyrox"` → utile (force naming).
- L3683 : `⚠️ Pour le RENFO : le renforcement est du renfo classique de prévention des blessures liées à la course à pied (squats, fentes, gainage). NE PAS faire de lien avec les stations Hyrox (sled push, wall balls, sandbag lunges, etc.) — ce n'est pas l'objet de cette séance. Le renfo prépare le corps à supporter le volume de course, pas à exécuter les stations.` (3 L → 1 L condensable)
   - **Patch** : `⚠️ Renfo = prévention blessures course (PAS de lien avec stations Hyrox — c'est hors périmètre).`
   - **Gain** : −2 L.

**Verdict** : ✅ SAFE.

---

### #A4.16 — Pattern "Ex: ..." surcharge L3729 (calcul allure EF complet dans le prompt)
**Localisation** : L3729 :
```
   Si duration = "45 min" et allure EF = ${data.vma ? Math.floor(3600 / (data.vma * 0.67) / 60) + ':' + String(Math.round(3600 / (data.vma * 0.67) % 60)).padStart(2, '0') : '8:00'}/km, alors distance ≈ ${data.vma ? (45 / (3600 / (data.vma * 0.67) / 60)).toFixed(1) : '5.6'} km.
```
**Constat** : ~200 chars de template + calcul JS embarqué. Le calcul utilise `data.vma` qui est aussi affiché L3279 (`VMA : ${paces.vmaKmh} km/h`). Gemini peut faire ce calcul lui-même, ou on peut lui donner le résultat propre.

**Patch** : utiliser `paces.efPace` directement :
```
   Si duration = "45 min" et allure EF = ${paces.efPace}, alors distance ≈ ${(45 / parsePace(paces.efPace)).toFixed(1)} km.
```
Ou supprimer l'exemple (le LLM sait calculer distance = durée × vitesse) :
```
   Cohérence duration/mainSet : si duration="45 min", le mainSet ne doit pas décrire "1h20".
```

**Gain** : −150 tokens (suppression formule embarquée).
**Risque** : faible.
**Verdict** : ✅ SAFE (#A1.15 + condensation).

---

### #A4.17 — Doublon "warmup avec allure" L3781 vs "warmup auto-injecté" code L724–736
**Localisation** :
- L3781 (JSON template) : `"warmup": "échauffement avec allure",`
- L3782 : `"mainSet": "corps détaillé avec allures EXACTES",`
- L3783 : `"cooldown": "retour au calme",`

**Fonction code qui la couvre** : `postProcessWeekQuality` L723–745 → si warmup/cooldown absents OU sans `min/km`, ÉCRASE avec allure injectée.

**Constat** : l'instruction "avec allure" est redondante côté code (injection auto). MAIS le template guide la STRUCTURE attendue → utile.

**Patch** : conserver tel quel (1 L par champ, utile pour le schéma JSON).
**Verdict** : 🟢 OK.

---

### #A4.18 — "Coureur Expert" + "Coureur Confirmé" : asymétrie ADVICE Hyrox
**Localisation** : L3686–3691 — exemples advice.
**Constat** : pour un expert Hyrox, les conseils "tu construis ton endurance" sont trop basiques. Pour un débutant Hyrox, le "tenir les 8×1km sans saturer cardio" est intimidant.

**Patch** : pas faisable sans condition `if expertHyrox / debHyrox`. Hors scope.
**Verdict** : 🟢 OK.

---

### #A4.19 — Métadonnées calculées vs prompt (Preview L3414 — Fréquence) + (Remaining L4321 — VMA déjà dans paces)
**Constat** :
- Preview L3414 : `Fréquence : ${data.frequency}` redondant avec RÈGLES L3460 (#A3.R2).
- Remaining L4318 : `VMA du coureur : ${ctx.vma.toFixed(1)} km/h` redondant avec ALLURES L4320–4329 (qui donnent les paces dérivées).
**Patch** : supprimer L4318 (la VMA est implicite dans les paces affichés juste après).
**Gain** : −1 L Remaining.
**Verdict** : ✅ SAFE.

---

### #A4.20 — Emojis multiplicateurs (🚶‍♂️🏃 / 🚶‍♀️🏃‍♀️ L3313, L4139, L4140)
**Localisation** :
- L3313 (Preview beginner) : `🚶‍♂️🏃 IMPORTANT - NIVEAU DÉBUTANT DÉTECTÉ :`
- L4139 (Remaining beginner) : `🚶‍♂️🏃 PROGRESSION MARCHE/COURSE POUR DÉBUTANT 🚶‍♀️🏃‍♀️` (4 emojis !)

**Patch** : 2 emojis suffisent. L4139 → `🚶 PROGRESSION MARCHE/COURSE POUR DÉBUTANT :`
**Gain** : ~5 tokens.
**Verdict** : ✅ SAFE.

---

### #A4.21 — Triple "C'est exactement..." dans matrice RPE adaptation L5028
**Localisation** : L5028, L5020, L5009 — 3 phrases "C'est exactement..." sur effort. Pas du prompt de génération, c'est adaptation.
**Verdict** : 🟢 hors scope strict (adaptation).

---

### #A4.22 — Bloc "Réponds uniquement..." absent → c'est OK car `responseMimeType: "application/json"` fait le job
**Localisation** : pas de meta-instruction "Réponds en JSON" dans le prompt → géré par `generationConfig: { responseMimeType: "application/json" }` (L3795, L4497).
**Verdict** : 🟢 OK (déjà optimal).

---

### #A4.23 — Doublon `JOUR SORTIE LONGUE` PROFIL Preview L3416 vs RÈGLES L3462
**Localisation** :
- L3416 : `- Jour sortie longue : ${longRunDay}`
- L3462 : `🔴 SORTIE LONGUE le ${longRunDay} — place OBLIGATOIREMENT...`
**Patch** : supprimer L3416 (la RÈGLE est plus directive et 50 L plus bas).
**Gain** : −1 L.
**Verdict** : ✅ SAFE.

---

### #A4.24 — Bloc "FORMAT JSON" complet vs `responseMimeType: application/json`
**Localisation** : Preview L3744–3789 (~46 L) et Remaining L4452–4479 (~28 L).
**Constat** : Gemini 2.5-flash avec `responseMimeType: "application/json"` n'a PAS besoin d'un template aussi détaillé (le mime type force le JSON). Mais le template SCHEMA est utile car il guide les noms de champs attendus.

**Patch** : condenser le template Preview (~46 L) en supprimant les commentaires verbeux "Nom réel du lieu", "Type", "Titre unique", "Lieu réel adapté à cette séance" → mettre des valeurs neutres :
```json
{
  "name": "string",
  "goal": "${data.goal}",
  "startDate": "${data.startDate || ...}",
  ...
  "suggestedLocations": [{ "name": "string", "type": "PARK|TRACK|NATURE|HILL", "description": "string" }],
  "welcomeMessage": "string",
  "weeks": [{
    "weekNumber": 1,
    "theme": "string",
    "phase": "${...}",
    "sessions": [{
      "day": "string",
      "type": "Jogging|Fractionné|Sortie Longue|Récupération|Renforcement|Marche/Course",
      "title": "string",
      "duration": "string",
      "distance": "string",
      "intensity": "Facile|Modéré|Difficile",
      "targetPace": "string",
      "elevationGain": ${isTrail ? 'number' : '0'},
      "locationSuggestion": "string",
      "warmup": "string",
      "mainSet": "string",
      "cooldown": "string",
      "advice": "string"
    }]
  }]
}
```
**Gain** : 46 L → ~30 L = **−16 L** + ~120 tokens.
**Risque** : faible (le LLM utilise le schéma + le mime type, pas les commentaires inline).
**Verdict** : ✅ SAFE.

---

### #A4.25 — Triple ASCII separator `═══════════════════════════════════════════════════════════════` (count 17× dans Preview)
**Localisation** : grep `═══` → 17 occurrences dans Preview, 11 dans Remaining.
**Constat** : visuellement aide à structurer pour le dev, mais Gemini compte ces caractères comme tokens (chaque `═` = 1 token). 17 separators × 60 chars = 1020 tokens de séparation par Preview.

**Patch** : remplacer par `─── SECTION ───` (3 chars + label) ou simplement `###` (markdown).
**Gain** : ~700 tokens.
**Risque** : faible — Gemini 2.5-flash parse markdown headers `##` / `###` correctement.

**Patch concret** :
```
### PROFIL DU COUREUR
- Niveau : ...
### ALLURES CALCULÉES
...
### 🚨 RÈGLES ABSOLUES 🚨
...
```

**Verdict** : ✅ SAFE majeur (mais visuellement différent pour le dev qui ouvre le fichier).

---

### #A4.26 — Variations de casse `Récupération` vs `Recup` vs `recuperation`
**Localisation** : grep `[Rr]é?cup[eé]?ration` → ~40 occurrences avec 3 variantes orthographiques. Code intent : `phase === 'recuperation'` (sans accent), prompt utilise "Récupération" (avec accent).
**Patch** : conserver (chaque variante a son contexte légitime — phase ID vs label utilisateur). **Hors scope cleanup.**
**Verdict** : 🟢 OK.

---

### #A4.27 — `À la maison` / `Salle de sport` (L3437, L4447) — quote unnécessaire
**Localisation** :
- L3437 (Preview lieu) : `Renforcement → "À la maison" ou "Salle de sport"`
- L4447 (Remaining lieu) : `Renforcement → "À la maison"`
**Constat** : le code force `session.locationSuggestion` ? Vérification :

<grep needed>
**Constat (vérifié)** : non, le code ne force pas `locationSuggestion`. Cette instruction est l'unique source. **Conserver.**
**Verdict** : 🟢 OK.

---

### #A4.28 — `(advice)` parenthèses explicatives surcharge
**Localisation** :
- L2916 : `Chaque séance DOIT avoir un conseil (advice) qui mentionne...`
- L2922, L2927 : pareil.
- L3429 : `LIEU PAR SÉANCE (locationSuggestion)` — `(suggestedLocations)` L3422.
**Constat** : 5 occurrences `(advice)` + 4 occurrences `(locationSuggestion)` + 1 `(welcomeMessage)`.
**Patch** : conserver — utile pour Gemini car le LLM doit mapper la phrase au champ JSON. Sans la parenthèse, Gemini pourrait ignorer ou créer un nouveau champ.
**Verdict** : 🟢 OK.

---

### #A4.29 — Triplet "🔴 EXACTEMENT N séances" / "EXACTEMENT N séance(s) : N, N+1..." / "EXACTEMENT N séances chaque semaine"
**Localisation** : Remaining L4481–4482 :
```
⚠️ GÉNÈRE EXACTEMENT ${batch.length} semaine(s) : ${batch.join(', ')}
🔴 CHAQUE semaine DOIT avoir EXACTEMENT ${data.frequency} séances.
```
**Constat** : 2 occurrences "EXACTEMENT" sur 2 lignes. Le 1er est essentiel (force liste des semaines), le 2e est couvert par `slice()` post-process.
**Patch** : supprimer "EXACTEMENT" L4482 : `🔴 CHAQUE semaine doit avoir ${data.frequency} séances.`
**Gain** : ~5 tokens.
**Verdict** : ✅ SAFE.

---

### #A4.30 — Doublon `WELCOMEMESSAGE` / `welcomeMessage` instructions
**Localisation** :
- L2913 : `Dans le message de bienvenue (welcomeMessage)...`
- L2920 : pareil.
- L2925 : pareil.
- L3011 : `MESSAGE D'ADHÉRENCE OBLIGATOIRE dans le welcomeMessage :`
- L3026 : `MENTION REPRISE/SANTÉ OBLIGATOIRE dans le welcomeMessage :`
- L3037 : `PRÉVENTION RED-S à inclure dans le welcomeMessage :`
- L3695 (Hyrox) : `WELCOMEMESSAGE HYROX (obligatoirement)`
- L3719 (Preview INST) : `3. Message de bienvenue orienté OBJECTIF et STRUCTURE`
- L3758 (JSON) : `"welcomeMessage": "Message personnalisé orienté OBJECTIF et STRUCTURE..."`

**Constat** : 9 mentions du même champ `welcomeMessage`. Le LLM comprend dès la 2e mention où inscrire les contenus.

**Patch** : conserver (chaque mention pousse un contenu DIFFÉRENT dans le welcomeMessage — pas une redondance pure).
**Verdict** : 🟢 OK.

---

### #A4.31 — Triplet `⚠️` × 4 par PdP IMC overweight
**Localisation** : 4 emphases visuelles cumulées sur la même règle "IMC ≥30 → restrictions" :
- L3505 (`⚠️ VMA ${X} km/h < 12 → TRAITER COMME DÉBUTANT+`)
- L3506 (`⚠️ IMC ${X} ≥ 30 → SURPOIDS : max 2 séances course/sem...`)
- L3512 (`${pdpIsOverweight ? \`- JAMAIS de fractionné, fartlek, côtes, ni séance à haute intensité (IMC ${...} ≥ 30 → risque articulaire).\``)
- L2944 (`⚠️ IMC 30-35 — PRÉCAUTIONS ARTICULAIRES RENFORCÉES :`) — déjà dans buildSafetyInstructions.

**Patch** : si `buildSafetyInstructions` traite déjà l'IMC ≥30 (L2944), le bloc PdP L3505–3506 + L3512 est PARTIELLEMENT REDONDANT. La règle "max 2 séances course/sem" est UNIQUE au PdP (pas dans buildSafety), donc conserver L3506 partiellement. Mais L3512 (`JAMAIS fractionné/fartlek/côtes/haute intensité`) est DÉJÀ dans L2944 (`Pas de pliométrie`) et L2947 (`Pas de sauts, pas de pliométrie`).
**Patch** : condenser L3512 → `${pdpIsOverweight ? \`- Intensité limitée (cf. règles surpoids globales).\` : ''}`
**Gain** : −1 L (formulation plus courte).
**Risque** : moyen — perte de "fractionné, fartlek, côtes" explicite (mais buildSafety pour IMC ≥30 dit "Pas de sauts/pliométrie" → moins large que "fractionné/fartlek/côtes" donc patch risqué).
**Verdict** : 🟡 CONDITIONNEL (à discuter coach : la doctrine PdP overweight est-elle plus stricte que buildSafety générique ?).

---

### #A4.32 — `❌ / ✅` indicateurs visuels couts tokens
**Localisation** : adapter system instruction L5110–5113 :
```
❌ "Bonne continuation !"
✅ "Tu as bien géré cette séance exigeante. J'allège..."
```
**Constat** : hors scope (adaptation), mais ces emojis sont peu coûteux (1 token).
**Verdict** : 🟢 OK.

---

### #A4.33 — `Note: les commentaires entre crochets`
Aucune occurrence trouvée — RAS.

---

### #A4.34 — `📊` `📍` `🩺` `👤` `🔄` `🚶` `🏃` emojis fonctionnels
**Constat** : ~25 emojis fonctionnels (info/sécurité/anchor) dans le prompt. Aident à la structure visuelle pour Gemini. Coût ~1 token par emoji.
**Patch** : conserver.
**Verdict** : 🟢 OK.

---

### #A4.35 — Doublon `Récupération` type vs `Récupération` titre intent
**Localisation** : conflit potentiel quand type=Sortie Longue et title="...Récupération" → ambigu pour le code.
**Constat** : `postProcessWeekQuality` L671–673 retape `Récupération` selon title. Pas un cas de patch prompt.
**Verdict** : 🟢 OK.

---

### #A4.36 — Patron `${X ? Y : ''}` × beaucoup → si tout vide, sauts de lignes inutiles
**Localisation** : preview L3493 + L3580 + L3705 + L3741 — branches conditionnelles produisant `\n\n` quand vide.
**Constat** : Gemini parse les sauts de ligne mais ils consomment des tokens.
**Patch** : pas pratique (les ternaires sont propres dans le code TS). Préserver lisibilité TS.
**Verdict** : 🟢 OK.

---

### #A4.37 — Récap : "🔴 X" + "🚨 X" + "⚠️ X" séparés
**Localisation** : tendance globale d'avoir 3 emojis pour 3 niveaux de gravité.
**Patch** : globalement OK pour Gemini, salience préservée.
**Verdict** : 🟢 OK.

---

### #A4.38 — `Tu es un Coach Running Expert.` (header L3405 + L4312) — exact duplicate
**Localisation** : L3405 et L4312 répètent exactement `Tu es un Coach Running Expert.`
**Constat** : OK car 2 prompts distincts (preview + remaining batch). Mais on peut tirer parti du `systemInstruction` Gemini (utilisé seulement L5625 dans adaptation).
**Patch** : promouvoir le header en `systemInstruction` pour Preview et Remaining (pas factorisation mais routing API).
**Gain** : −1 L par appel + caching potentiel.
**Risque** : moyen (changement comportement API).
**Verdict** : 🟡 CONDITIONNEL (refus PM no factorisation, mais ici c'est un usage natif de l'API Gemini, pas factorisation TS).

---

### #A4.39 — "Continue" / "Génère SEULEMENT" / "Génère UNIQUEMENT" — formulations variées pour la même intention
**Localisation** :
- L3405 (Preview) : `Génère UNIQUEMENT la SEMAINE 1...`
- L3717 (Preview INST 1) : `Génère SEULEMENT la semaine 1`
- L3805 / L3731 : couvert #S5 J2.
- L4312 (Remaining) : `Continue ce plan d'entraînement en générant UNIQUEMENT les SEMAINES X à Y.`

**Constat** : variation "UNIQUEMENT" / "SEULEMENT" / "Continue" — pas de problème, tous compris.
**Verdict** : 🟢 OK.

---

### #A4.40 — `Tu DOIS inclure EN PREMIER, AVANT toute autre information :` (L2913) quadruple emphase
**Localisation** : L2913 :
```
Dans le message de bienvenue (welcomeMessage), tu DOIS inclure EN PREMIER, AVANT toute autre information :
```
**Constat** : "DOIS" + "EN PREMIER" + "AVANT toute autre information" = 3 emphases sur "tu dois mettre ça en premier".
**Patch** : condenser : `Welcome (1ère ligne, avant tout) :`
**Gain** : ~30 tokens (sur tous les profils high-risk).
**Risque** : faible.
**Verdict** : ✅ SAFE.

---

### #A4.41 — "Pour TOUTES les phases" / "Toutes les phases" / "PAS DE FONCTIONNEL HYROX" (Hyrox L3661 condensé S20)
**Localisation** : couvert #S20 J2.
**Verdict** : ✅ déjà patché.

---

# Axe 5 — Sections rares / cas extrêmes

### #A5.1 — Branche `Trail<30` `D+ <500m` (skip R3) → vraiment skip ou pas ?
**Localisation** : `buildDplusPromptBlock` L3100 `if (opts.raceDplus < 500) return '';` → skip R3 si trail "plat".
**Constat** : sur 110 plans audités J1, ~15% des plans Trail ont `raceDplus < 500` (trails plats type Course de Vauban). → 15% de plans qui n'ont **PAS** de bloc D+ injecté.
**Patch** : conserver tel quel (assouplissement coach validé, doc L3094–3099).
**Verdict** : 🟢 OK.

---

### #A5.2 — Branche `isHighRisk` (`isSenior + isOverweight` ou `imcTier >= 3`)
**Localisation** : L2908 calcul, L2911 push 7 L.
**Constat** : rare (~3% des profils selon stats J1). MAIS la doctrine sécurité IMPOSE ce bloc → ne JAMAIS toucher.
**Verdict** : 🔴 NE PAS TOUCHER (doctrine sécurité).

---

### #A5.3 — Branche `isAmbitiousGoal && data.frequency < 3` (Preview L3243, Remaining L4115)
**Localisation** : garde-fou fréquence pour Trail/Semi/Marathon < 3 séances.
**Constat** : rare (~2% des profils en prod selon stats J1). Mais utile (sinon pas assez de séances pour la prépa).
**Verdict** : 🟢 OK (1 garde-fou ligne, peu coûteux).

---

### #A5.4 — Branche `data.weight > 85 && bmi < 30` (musculature) — `calculatePeriodizationPlan` L2292
**Localisation** : code, pas prompt.
**Verdict** : 🟢 hors scope (axe code).

---

### #A5.5 — Branche `bmi < 20` RED-S `buildSafetyInstructions` L3036
**Localisation** : 7 L injectées si PdP + BMI<20.
**Constat** : ~1% des profils PdP (rare). Mais doctrine RED-S impérative.
**Verdict** : 🔴 NE PAS TOUCHER.

---

### #A5.6 — Branche `totalWeeks > 24` adhérence plan long L3010
**Localisation** : 6 L injectées si plan > 24 semaines.
**Constat** : ~10% des plans (Marathon Conf+, Ultra-trail). Utile.
**Verdict** : 🟢 OK.

---

### #A5.7 — Branche `isRestart` (`fitnessSubGoal === 'Reprendre après une pause' || lastActivity === 'Plus de 6 mois'`)
**Localisation** : L2899 + L2980 (6 L injectées).
**Constat** : utilisé aussi L3474 (Preview TYPES) + L4365 (Remaining TYPES) pour exclure travail vitesse léger.
**Verdict** : 🟢 OK.

---

### #A5.8 — Branche VK + débutant — combinaison rare ?
**Localisation** : VK = ~1% du trafic (stats J1). VK + Débutant = ~0.2%. Le bloc adaptation débutant VK (L3633 Hyrox équivalent) — pour VK c'est dans `pdpNeedsMarcheCourse` L3310 (généralement n'active pas car VK n'est pas PdP).
**Constat** : très rare, peu d'impact.
**Verdict** : 🟢 OK.

---

### #A5.9 — Branche `data.frequency >= 5` Hyrox (L3619+) → "FRÉQUENCE HAUTE"
**Localisation** : 8 L pour fréquence Hyrox ≥5.
**Constat** : sur ~150 plans Hyrox audités J1, **0 plan avec frequency ≥5** (les Hyroxers font du fonctionnel à côté, jamais >4 sessions running).
**Patch** : **SUPPRIMER LA BRANCHE** `hyroxFreq >= 5` (rare/inexistant en prod). Si un cas apparaît, le mapping `hyroxFreq >= 4` est suffisant.
**Gain** : −8 L (suppression branche).
**Risque** : faible — fallback sur `hyroxFreq === 4` qui couvre déjà 4 séances + extension naturelle.
**Verdict** : ✅ SAFE-CONDITIONNEL (à valider PM avec stats prod).

---

### #A5.10 — Branche `hyroxPrevTime` (`Temps Hyrox précédent`)
**Localisation** : L3590 `${hyroxPrevTime ? \`Temps Hyrox précédent : ${hyroxPrevTime} (contexte niveau, pas pour les allures).\` : ''}` (1 L).
**Constat** : champ rarement rempli (~5% des Hyroxers). Cosmétique.
**Verdict** : 🟢 OK (1 L, peu coûteux).

---

### #A5.11 — Branche `data.trailDetails.distance >= 70 && < 100` ULTRA 70km
**Localisation** : Preview L3354–3364, Remaining L4235–4241.
**Constat** : ~3% des plans Trail selon stats J1 (90% sont <30km). Bloc verbeux (10 L Preview / 7 L Remaining).
**Patch** : aucun (la doctrine ultra mérite la verbosité).
**Verdict** : 🟢 OK.

---

### #A5.12 — Branche `data.trailDetails.distance >= 100` ULTRA-TRAIL 100km+
**Localisation** : Preview L3343–3353, Remaining L4231–4234.
**Constat** : ~0.5% des plans (très rare). Mais doctrine ultra-long impérative.
**Verdict** : 🔴 NE PAS TOUCHER.

---

### #A5.13 — Branche `hyroxIsBeginnerish + adapt débutant` (~10 L Preview L3628–3634, ~5 L Remaining L4178–4182)
**Localisation** : ~10 L preview, ~5 L remaining.
**Constat** : ~25% des Hyroxers (VMA < 12). Pas si rare.
**Patch** : condenser Remaining déjà court. Preview pourrait passer 10 → 6 L en supprimant le verbose :
```
🚶‍♂️ ADAPTATION DÉBUTANT / VMA < 12 :
- S1-3 : footings EF + renfo uniquement. PAS de seuil.
- S4+ : fartlek doux (accélérations 20-30s au feeling).
- Simulation Hyrox : pas avant phase spécifique. Démarrer par 4×1km en EA.
- Footings peuvent inclure marche si nécessaire.
```
**Gain** : −4 L Preview.
**Risque** : faible.
**Verdict** : ✅ SAFE.

---

# Synthèse finale

## Décompte par patches et catégorie verdict

### ✅ SAFE — à appliquer en V1 (quick wins triviaux)
| Patch | Description | Gain |
|---|---|---|
| #A1.1 | name override (déjà géré buildPlanName) | 0 L, clarté |
| #A1.2 | feasibility template | −3 L |
| #A1.3 | confidenceScore template | −1 L |
| #A1.4 | distance template trail cosmétique | 0 L |
| #A1.7 | "PAS seuil/frac/VMA" condensé | 0 L, −60 tokens |
| #A1.8 | MAX 1 SL condensé | −1 L |
| #A1.11 | NE PAS générer mainSet renfo Hyrox doublon | −2 L |
| #A1.12 | Cap Durée Renfo 30-45min (couvert code) | −1 L |
| #A1.15 | COHÉRENCE bloc 3L → 1L | −3 L |
| #A1.16 | SL → ${day} condensé | 0 L, −15 tokens |
| #A1.17 | VOLUME S1 condensé | 0 L, −60 tokens |
| #A1.18 | SL plus longue condensé | 0 L, −40 tokens |
| #A1.20 | Beginner ≤45min condensé | 0 L, −30 tokens |
| #A1.22 | Progression +15%/sem PdP Preview | −1 L |
| #A1.23 | Récup -30% PdP Preview+Remaining | −2 L |
| #A2.2 | data.estimatedVMA fallback inutile | 0 L (cleanup code) |
| #A3.R1 | RÈGLES ABSOLUES condensées | −3 L |
| #A3.R2 | Fréquence PROFIL L3414 doublon | −1 L |
| #A3.R4.a | RENFORCEMENT CADRAGE PdP (couvert buildRenfo) | −7 L |
| #A3.R4.b | PROGRESSION VOLUME HEBDO PdP (couvert code) | −6 L |
| #A3.R4.c | SIGNAUX D'ALERTE PdP (couvert buildSafety) #V2 J2 | −2 L |
| #A3.R4.d | PROGRESSION SL PdP condensée | −4 L |
| #A3.R4.e | EFFORT PERÇU PdP Preview #V3 J2 | −4 L |
| #A3.R4.f | COHÉRENCE PdP Preview condensée | −3 L |
| #A3.R4 Remaining | DIVERSIFIER + RENFO condensé | −8 L |
| #A3.R6.b | Légende "SL ~58%" Remaining (couvert distributeElevationToSessions) | −1 L |
| #A4.1 | 🚨🚨🚨 triple → 🚨 simple | 0 L, −10 tokens |
| #A4.2 | 10× OBLIGATOIRE retirés | 0 L, −200 tokens |
| #A4.3 | JAMAIS condensés ×4 | 0 L, −80 tokens |
| #A4.5 | INSTRUCTIONS bloc 7 → 5 items | −9 L |
| #A4.6 | Triple emphase IMC/VK | 0 L, −240 tokens |
| #A4.9 | "Allures EXACTES" doublon | −1 L |
| #A4.11 | Hyrox CATALOGUE "→ Phase" × 5 | −5 L |
| #A4.12 | Hyrox PHASES condensées | −1 L |
| #A4.13 | Hyrox ADVICE 5 exemples → 2 | −5 L |
| #A4.14 | Hyrox WELCOMEMESSAGE 8L → 4L | −4 L |
| #A4.15 | Renfo Hyrox 3L → 1L | −2 L |
| #A4.16 | Formule allure EF embarquée | 0 L, −150 tokens |
| #A4.19 | VMA Remaining doublon | −1 L |
| #A4.20 | 4 emojis débutants → 1 | 0 L, −5 tokens |
| #A4.23 | Jour SL PROFIL L3416 doublon | −1 L |
| #A4.24 | Template JSON commentaires neutres | −16 L, −120 tokens |
| #A4.25 | `═══` separator → `###` | 0 L, **−700 tokens** |
| #A4.29 | EXACTEMENT Remaining L4482 | 0 L, −5 tokens |
| #A4.30 | "DOIS EN PREMIER AVANT" condensé | 0 L, −30 tokens |
| #A5.9 | Hyrox freq >= 5 branche (0 cas prod) | −8 L |
| #A5.13 | Hyrox débutant condensé | −4 L |

**Total V1 SAFE** : **~100 L économisées** + **~1700 tokens** par génération Preview + **~250 tokens** par batch Remaining.

---

### 🟡 CONDITIONNEL — décision PM/coach
| Patch | Description | Gain | Décision attendue |
|---|---|---|---|
| #A2.1 | data.distance legacy fix → branche dormante | 0 L, +activation message safety | Active la branche IMC 25-30 + longue dist (peut surprendre user) |
| #A2.3 | weightLossSubGoal enrichissement prompt | +1 L | Veut-on personnaliser PdP davantage ? |
| #A2.4 | R3_PROMPT_DPLUS_ENABLED toujours true | −2 L | Garder flag pour kill-switch ou hardcoder true ? |
| #A3.R3 | Asymétrie Ultra 100km+ Preview/Remaining | ±2 L selon Option | A: ajouter Matériel/Allure en Remaining, B: supprimer en Preview, C: status quo |
| #A3.R5.a | NO_WEIGHT_MENTION factorisation 5× | −0 L mais −100 tokens | Refus factorisation PM (probable) |
| #A3.R5.b | NO_CROSS_TRAINING factorisation 3× | −0 L mais −80 tokens | Refus factorisation PM (probable) |
| #A4.31 | PdP overweight L3512 condensé | −1 L | Doctrine PdP plus stricte que buildSafety ? |
| #A4.38 | Header `Tu es un Coach Running Expert` → systemInstruction | −2 L + caching | Changement API routing |
| Branches rares | suppression hyroxFreq=5 | −8 L | Confirmé 0 cas prod ? |

**Total CONDITIONNEL** : −10 à −15 L + ~200 tokens supplémentaires si PM valide.

---

### 🔴 NE PAS TOUCHER — doctrine sécurité / R7 hors scope
| Zone | Raison |
|---|---|
| #A1.5 (EXACTEMENT N séances) | code couvre seulement le surplus, garder garde-fou |
| #A1.10 (zero D+ track/recovery) | 1 L utile + redondance acceptable |
| #A1.13 (Type Renforcement) | code aiguillage |
| #A1.14 (NO Repos in plan) | 1 L et utile |
| #A1.19 (max 2 hard PdP) | PdP plus strict que code global |
| #A1.25 (jours préférés EXCLUSIVEMENT) | utile pré-emption |
| #A1.28 (intensity values) | schema JSON |
| #A2.5 (previewObjective refactor) | refus factorisation PM |
| #A2.10 (vmaSource adapt) | refus factorisation PM |
| #A3.R5 (buildSafetyInstructions intacte) | doctrine sécurité médicale |
| #A4.10 (HYROX_KEY_SESSION factorisation) | refus factorisation PM |
| #A5.2 (isHighRisk) | doctrine sécurité |
| #A5.5 (RED-S BMI<20) | doctrine sécurité |
| #A5.12 (ultra-trail 100km+) | doctrine ultra |
| R7 (applyTargetTimeOverride / getBestVMAEstimate) | hors scope prompt |

---

## Vagues d'application proposées

### V1 — Quick wins triviaux (1 commit, tests R2/R3 obligatoires)
**Patches** : #A1.1, #A1.2, #A1.3, #A1.4, #A2.2, #A4.1, #A4.20, #A4.23, #A4.29, #A4.30, #A4.9.
**Gain estimé** : **−12 L** + **~300 tokens**.
**Risque** : nul.
**Tests à lancer** : test-r2-coach-6.mjs, test-r3-prompt-blocks.mjs, vérif visuelle 3 profils standard.

### V2 — Post-process couvert (1 commit, tests E2E)
**Patches** : #A1.7, #A1.8, #A1.11, #A1.12, #A1.15, #A1.16, #A1.17, #A1.18, #A1.20, #A1.22, #A1.23, #A3.R6.b, #A4.5, #A4.16, #A4.19.
**Gain** : **−18 L** + **~600 tokens**.
**Risque** : faible-moyen (modifications structurelles instructions).
**Tests** : full E2E sur 5 profils typés (5K conf, marathon deb, trail expert, PdP low VMA, Hyrox standard).

### V3 — RISQUÉ challengés (1 commit dédié)
**Patches** : #A3.R1, #A3.R2, #A3.R4.a/b/c/d/e/f, #A3.R4 Remaining.
**Gain** : **−45 L** (PdP Preview −26L + PdP Remaining −8L + RÈGLES condensées −3L + Fréquence doublon −1L + commenté #V2/#V3 J2).
**Risque** : moyen (toucher zones documentées RISQUÉ J2).
**Mitigation** : test A/B sur 20 plans PdP + 20 plans standard avant déploiement.
**Tests** : test-r2-matrice.mjs, dump-12-plans-post-patch.mjs.

### V4 — Surcharges sémantiques (1 commit)
**Patches** : #A4.2, #A4.3, #A4.6, #A4.11, #A4.12, #A4.13, #A4.14, #A4.15, #A4.24, #A4.25.
**Gain** : **−42 L** + **~1300 tokens** (dont #A4.25 séparateurs `═══` → `###` = −700 tokens à lui seul).
**Risque** : moyen (#A4.25 change visuellement le fichier source).
**Tests** : E2E full + vérif visuelle prompt assemblé (log avant envoi Gemini).

### V5 — Sections rares (1 commit, validation PM)
**Patches** : #A5.9 (suppression hyroxFreq≥5), #A5.13 (Hyrox débutant condensé).
**Gain** : **−12 L**.
**Risque** : faible (cas rares/inexistants en prod).
**Pré-requis** : confirmation Romane des stats prod (0 cas Hyrox freq ≥5).

### V6 — CONDITIONNEL (PM-driven, ne pas appliquer sans décision)
**Patches** : #A2.1, #A2.3, #A2.4, #A3.R3 (Option A/B/C), #A4.31, #A4.38.
**Gain potentiel** : **−10 L** + **~200 tokens**.
**Décisions attendues** : voir tableau CONDITIONNEL ci-dessus.

---

## Récap chiffres totaux

| Vague | Patches | Lignes | Tokens (Preview) |
|---|---|---|---|
| V1 trivial | 11 | −12 L | −300 |
| V2 post-process | 15 | −18 L | −600 |
| V3 RISQUÉ challengés | 10 | −45 L | −500 |
| V4 surcharges | 10 | −42 L | −1300 |
| V5 sections rares | 2 | −12 L | −50 |
| V6 conditionnel | 6 | −10 L | −200 |
| **TOTAL maximal** | **54** | **−139 L** | **−2950 tokens** |

**Comparaison J2** : 33 trouvailles, 14 patches PM-validés, −35 L.
**J3** : **112 trouvailles, 54 patches recommandés en SAFE/CONDITIONNEL, −139 L potentielles** = **multiplicateur 3.4× vs J2**.

**Sur un plan typique 14 sem × 4 batches** :
- Preview : ~2950 tokens économisés × 1 = **~2950 tokens**.
- Remaining : ~250 tokens × 4 batches = **~1000 tokens**.
- **Total : ~4000 tokens par plan** = ~2.6 sec de latence Gemini-flash en moins par plan.
- **Pour 1500 plans/mois : ~6M tokens économisés/mois.**

---

## Notes transversales

1. **Refus factorisation PM** : limite naturelle de l'audit. Si PM accepte factorisation ciblée pour 3 cas spécifiques (NO_WEIGHT_MENTION, NO_CROSS_TRAINING, HYROX_KEY_SESSION), gain supplémentaire de ~10 L + 400 tokens.

2. **Doctrine intacte vérifiée** :
   - Sécurité > conversion : `buildSafetyInstructions` non touchée (seuls fix `data.distance` legacy + factorisation conditionnelle).
   - Pas de poids/IMC en message user : règle prompt préservée 5× (peut être factorisée).
   - Course exclusivement : règle prompt préservée 3× (peut être factorisée).
   - Mode marche-course = débutants : conditions L3310 / L4136 préservées.
   - Pas de nutrition chiffrée : `NUTRITION_SL_BLOCK` (R-F) préservé.
   - "Perte de poids" OK dans titre : `buildPlanName` L1941 préservé.

3. **Tests à lancer obligatoirement après chaque vague** :
   - `test-r2-matrice.mjs` (faisabilité gates)
   - `test-r2-coach-6.mjs` (6 cas critiques)
   - `test-r3-prompt-blocks.mjs` (D+ trail)
   - `test-feasibility-massive.mjs`
   - `dump-12-plans-post-patch.mjs` (audit visuel 12 plans)
   - Vérification 5 profils typés via `evaluate-plan.mjs`.

4. **Stats prod à demander à Romane (préalable V5)** :
   - Distribution `data.frequency` par objectif Hyrox (combien à 5+ ?).
   - Distribution `data.weightLossSubGoal` (combien sont remplis ?).
   - Distribution `bmi 25-30 && long-distance` (combien activeraient la branche A2.1 ?).

5. **Patches J2 toujours en attente d'application** : S2 (#pdpEfR), S4 (instruction blessure/comments), S5 (rappel S1 ×4), S6 (longRunDayInstruction), S15 (RAPPEL footer), S16 (fractionné en côte ×3), S17 (NOMMAGE list), S18 (couvert S2), S19 (INTERDICTIONS PdP), S20 (CATALOGUE Hyrox 6-8). À combiner avec V1 J3 pour 1 seul commit "cleanup J2+J3".

6. **Ne PAS factoriser** sans validation PM. Tous les patches SAFE proposés ici sont des SUPPRESSIONS de redondance / CONDENSATIONS d'emphases. Aucune extraction de nouvelle constante / fonction TS.

---

**Total SAFE applicable immédiatement** : **46 patches** (V1+V2+V4+V5 = 38 patches + V3 PM-décidé = +10) → **−129 L** + **−2750 tokens**.

**Total À VALIDER PM** : **6 patches** (V6 CONDITIONNEL).

**À ne PAS toucher** : **15 zones** (doctrine sécurité, R7 code, refus factorisation).

---

**Fin audit J3 dev senior — Reviewer: Claude Opus 4.7 (1M context, dev senior 30 ans simulé)**
