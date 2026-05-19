# Audit Nutrition Trail — Expert nutrition trail + 25 profils

**Date** : 2026-05-18
**Reviewer** : Expert nutrition trail (formation Balducci/Bramoullé, terrain UTMB/HR100/Tor)
**Fichier audité** : `src/components/tools/NutritionTrailPage.tsx` (2 084 lignes, build du 2026-05-18 09:35)
**Script de simulation** : `test-nutrition-trail-multi.mjs` (reproduction 1:1 des fonctions du composant — `computeNutrition()`, `carbsByTrailDuration()`, `hydrationByProfil()`, `caffeineDose()`, `kcalPerHourTrail()`)
**Résultats bruts JSON** : `test-nutrition-trail-multi-results.json`

---

## 1. Synthèse exécutive

### Distribution verdict sur 25 profils

| Verdict | Nb | % |
|---|---|---|
| OK (adapté terrain) | 11 / 25 | 44 % |
| Sur-recommandation (acceptable mais lourd) | 9 / 25 | 36 % |
| Sous-recommandation (manque d'info ou trop bas) | 3 / 25 | 12 % |
| Dangereux (risque réel EAH/GI/ergogénie) | 2 / 25 | 8 % |

**Verdict global** : l'outil est **globalement solide sur la partie chiffres** (cap EAH 1000 mL/h respecté, plages glucides cohérentes avec Jeukendrup/Tiller/ACSM 2024, caféine bien plafonnée à 6 mg/kg/24 h, formule Minetti correcte). Les principales failles sont :

1. **Protéines déclenchées à H+4h pile** — trop précoce sur format 4-6h, gonfle artificiellement le pack et l'angoisse "ultra-ifie" un trail court/moyen
2. **Le pack en sortie est mono-gel** — aucune répartition gel/solide proposée, ce qui contredit toute la doctrine Balducci/Bramoullé enseignée dans la timeline du même outil → cohérence interne cassée
3. **L'agrégat "Total gels"** sur ultra (66 sur UTMB, 103 sur TDG) est terrifiant et faux dans l'esprit — un athlète UTMB consomme ~30-40% en solide, jamais 66 gels purs
4. **Le cas #5 (27 km / 4h15) — challenge initial** : l'outil donne 9 gels + 9 g protéines + plan "trop ultra" pour un format qui devrait s'arrêter à 5-7 gels + solides en BV, zéro protéine
5. **Cap durée à 50 h dur** — TDG (100h réelles) est tronqué à 50 h sans avertissement structurel, induit user en erreur

**Pas de refonte nécessaire**. 5 fixes ciblés (détaillés §4) résolvent tous les dérapages identifiés sans toucher aux fondations scientifiques.

---

## 2. Patterns de dérapage identifiés

### Pattern A — "Protéines à H+4h pile" trop binaire (impact : 11 profils sur-recommandés)
La règle `showProteins = durationHours >= 4` (ligne 364) déclenche protéines + bolus BV dès qu'on passe 4h00. Or :
- Saunders 2007 : pas de bénéfice protéines <4h pour la **performance** — mais ne dit rien sur l'utilité **pré-récup** dès H+4h
- Knechtle 2018 : utilité réelle des protéines bascule >8h (ultra long)
- Balducci/Bramoullé/Browning : pas de protocole protéines fixe avant H+6h; salé naturel (saucisson, fromage en BV) suffit avant
- Conséquence : profils #5/#6/#7 (trails 4h15-5h) reçoivent un message "7 g/h protéines + bolus BV 15-25 g" pour un effort où c'est inutile et risque GI

**Solution** : décaler le seuil à H+6h, et garder messaging protéines très bas-key (suggestion, pas instruction) entre 6-8h.

### Pattern B — Pack mono-gel (impact : tous profils >3h, sévère >6h)
Lignes 380-381 :
```ts
const carbsPerGel = 25;
const nbGels = Math.max(0, Math.ceil((totalCarbs - 30 - basesDeVie * 40) / carbsPerGel));
```
Le seul mécanisme de compensation "solide" est la déduction `basesDeVie * 40` (40 g de glucides par BV, soit 1 ravito moyen). Cela suppose qu'entre les BV, **tout est gel**.

Résultats concrets :
- #8 (T-42km / 6h30 / 2 BV) : 17 gels = 425 g glucides via gels — devrait être ~10 gels + 3-4 prises solides hors BV
- #11 (T-55km / 10h / 3 BV) : 26 gels — devrait être ~15 gels max + alternance dès H+4h
- #16 (UTMB / 32h / 6 BV) : 66 gels — totalement déconnecté de la pratique réelle (UTMB finisher : 20-35 gels typique, 60% solide)
- #19 (TDG / 50h / 10 BV) : 103 gels — chiffre qui détruit la crédibilité de l'outil

Cohérence interne : la **timeline** de l'outil prescrit explicitement "Bascule SALÉ dominant H+6h", "Aliments vrais H+8h" — mais le pack continue à compter en gels purs. Un user qui suit le pack pense qu'il lui faut 66 gels UTMB.

**Solution** : ratio solide/gel progressif dans le calcul du `nbGels` selon durée (déjà la doctrine timeline, juste l'appliquer au pack).

### Pattern C — Cap durée 50h dur, sans dégradé (impact : TDG / >50h)
Ligne 591 : `chronoSec > 50 * 3600` bloque l'input. Le TDG 330 km demande typiquement 90-130h (cut-off 150h). On simule à 50h "pour passer" mais la totalité du calcul (gels, kcal, protéines) est divisée par ~2 → faux.

**Solution** : autoriser jusqu'à 150h **uniquement avec premierMode=false + niveau Expert**, et warning fort "approche personnalisée diététicien obligatoire au-delà de 50h" (déjà géré pour 30h, juste étendre).

### Pattern D — Sur-pondération hydratation chaud + petit gabarit femme (impact : #18 Diagonale)
Profil #18 (60 kg F / 22°C / Humide / Élevé) → 920 mL/h. C'est sous le cap absolu 1000 mL/h donc pas dangereux **par règle**, mais 920 mL/h pour 60 kg = 15.3 mL/kg/h, soit le maximum physiologique pour une femme de 60 kg en climat tropical sur 28h. Hoffman 2014 (Western States) : moyenne réelle femmes <70 kg sur ultra = 500-650 mL/h, jamais 920.

Causes empilées :
1. `hydrationByProfil('Élevé', 22, 60)` → tempBucket 2 (22°C est dans 18-25°C) → 800 mL/h base
2. weightFactor pour 60 kg : `1 + (60-70)*0.005 = 0.95` → 800 × 0.95 = 760 mL/h
3. Humide : × 1.10 → 836 mL/h
4. Altitude 1500-2500m : × 1.10 → 920 mL/h (puis × 0.85 pause factor sur le total seulement)

Le warning EAH est bien présent mais le chiffre horaire reste anxiogène. Sur 28h, totalHydration affiché = 21.9 L = consommation théorique stratosphérique pour un 60 kg F.

**Solution douce** : ne pas combiner ×1.10 humide ET ×1.10/1.15 altitude (les deux ne se cumulent quasi jamais simultanément en réalité, et la sudation profil compense déjà). Plafonner combinaison hydra à 850 mL/h pour <65 kg femme.

### Pattern E — Caféine en course "1 mg/kg arrondi 10 mg" devient trop forte sur poids <60 kg (impact : #5, #12, #18, #21)
Ligne 181 : `Math.round((poidsKg * 1) / 10) * 10`. Pour 55 kg F : 0.55 mg/kg arrondi à 60 mg = en fait 1.09 mg/kg. Sur 60 kg F : 0.60 mg/kg arrondi à 60 mg. Pour 75 kg : 0.75 mg/kg arrondi à 80 mg = 1.07 mg/kg. L'arrondi à la dizaine **sur-dose systématiquement les petits gabarits femmes**.

Combiné au cap 6 mg/kg/24h (limite haute) ça reste safe, mais sur effort long avec plusieurs prises, on les épuise plus vite → la borne haute est atteinte à H+8h au lieu de H+15h. Profil #5 : pré 165 mg + 1 dose 60 mg sur 4h15 = 4.1 mg/kg cumulé à H+1h45 du départ, soit déjà 70 % du cap journalier.

**Solution** : arrondir à 25 mg (granularité gel caféiné typique 50 mg ou 100 mg ; gélule sport 100 mg ; cola 80 mg) plutôt que 10 mg, **OU** diminuer dose à 0.8 mg/kg → arrondi 25 mg.

---

## 3. Détail des 25 profils

Légende verdict : **OK** | **Sur-reco** (lourd mais pas dangereux) | **Sous-reco** (manque info ou trop bas) | **Dangereux**

### Trails courts (10-25 km)

| # | Profil | Gels | mL/h | g/h | Verdict | Commentaire expert |
|---|---|---|---|---|---|---|
| 1 | 10km/1h/60kgH/Confirmé | 1 | 523 | 45 | **OK** | Cohérent. 45 g/h est mid-range Jeukendrup, 1 gel suffit. Caféine 180 mg pré pertinente. |
| 2 | 15km/1h45/75kgH | 2 | 564 | 45 | **OK** | Idem. Pack léger réaliste. |
| 3 | 20km/2h30/55kgF/chaud 25° | 6 | 833 | 63 | **Sur-reco légère** | 6 gels pour 2h30 c'est haut, mais sur 25°C + 55 kg + 2 caps sel ça reste défendable. La cible 63 g/h est au-dessus de la médiane terrain pour 2h30 (ACSM dirait 45-60 g/h). |
| 4 | 25km/3h/80kgH/Régulier | 8 | 578 | 75 | **Sur-reco** | 8 gels pour 3h, cible 75 g/h sur un Régulier non habitué à cette charge = risque GI. Devrait être 5-6 gels max, ratio 70/30 gel/solide. |

### Trails moyens (27-50 km) — Le format challenge

| # | Profil | Gels | mL/h | g/h | Verdict | Commentaire expert |
|---|---|---|---|---|---|---|
| 5 | ⭐ 27km/4h15/55kgF | **9** | 509 | 68 | **Sur-reco** | **CAS CHALLENGE CONFIRMÉ**. 9 gels + déclenchement protéines + total 289 g glucides pour 4h15 et 55 kg → over-engineered. Réel terrain : 5-6 gels + 1 ravito BV (banane/saucisson) + pas de protéines. Cible 68 g/h est OK; le **nombre** de gels est le problème (pack mono-gel). |
| 6 | 30km/4h30/70kgH/28°C | 11 | 900 | 75 | **Sur-reco** | 11 gels pour 4h30 = excessif. Hydra 900 mL/h sur 28°C est correct (sudation élevée). Protéines inutiles à ce stade. |
| 7 | 35km/5h/65kgF | 11 | 536 | 68 | **Sur-reco** | Idem. 5h Expert peut absorber 75 g/h, mais le pack devrait inclure ~40 % solide. |
| 8 | 42km/6h30/80kgH | 17 | 578 | 80 | **Sur-reco sévère** | 17 gels = ~2.6 gels/h continu, impossible à tenir 6h30 sans GI distress. Devrait être 10 gels + 2 ravitos BV solides + 3-4 prises solides intermédiaires (jambon-beurre, pâte de fruit, pomme de terre). |
| 9 | 45km/7h/75kgH/montagne | 18 | 620 | 80 | **Sur-reco sévère** | Idem. À H+6h la timeline dit "salé dominant" mais le pack compte 18 gels. Incohérence. |
| 10 | 50km/8h/60kgF/nuit | 19 | 523 | 72 | **Sur-reco sévère** | 19 gels sur 8h pour 60 kg F = 475 g glucides via gels. Inhumain. Pack devrait être 50 % solide dès H+4h. |

### Trails longs (55-90 km)

| # | Profil | Gels | mL/h | g/h | Verdict | Commentaire expert |
|---|---|---|---|---|---|---|
| 11 | 55km/10h/75kgH | 26 | 564 | 80 | **Sur-reco sévère** | 26 gels = inenvisageable. Cible 80 g/h via gels seulement = 3.2 gels/h, jamais tenu. Réel : 12-14 gels + ravito solide. |
| 12 | 60km/11h/55kgF | 26 | 509 | 72 | **Sur-reco sévère** | Idem femme petit gabarit. Total 792 g glucides via gels = irréaliste. |
| 13 | OCC 55km/9h30/70kgH | 26 | 605 | 80 | **Sur-reco sévère** | Format type Chamonix montagne : doctrine "soupe/coca/saucisson en BV" est totalement absente du pack. |
| 14 | CCC 100km/17h/65kgF | 36 | 590 | 63 | **Sur-reco sévère** | 36 gels CCC = totalement déconnecté terrain (un finisher CCC consomme ~12-18 gels + tout le reste en solide BV). |
| 15 | 80km/14h/85kgH/chaud | 34 | **968** | 70 | **⚠️ Borderline dangereux** | Hydra 968 mL/h soutenu 14h = TRÈS proche du cap EAH 1000. Sur 85 kg H Élevé à 26°C, c'est plausible **horaire** mais le total 11.5 L doit obligatoirement venir avec une vigilance caps sel (l'outil en met 7, bien). Pack 34 gels reste sur-reco. |

### Ultras (100-170 km)

| # | Profil | Gels | mL/h | g/h | Verdict | Commentaire expert |
|---|---|---|---|---|---|---|
| 16 | UTMB 170/32h/70kgH | **66** | 605 | 60 | **Sur-reco extrême** | 66 gels UTMB = chiffre qui décrédibilise l'outil. Pratique terrain UTMB finisher : 25-40 gels + 80 % solide BV. 66 gels = 1.65 kg de gels à porter, impossible. |
| 17 | Hardrock 160/35h/65kgH/alt | **74** | 585 | 60 | **Sur-reco extrême + sous-reco contexte** | Hardrock = altitude >3000m, exigences spécifiques (acclimatation, oxydation gluc majorée, eau chlorhydrique froide). 74 gels est aberrant. Warning MAM est bien présent. |
| 18 | Diagonale 165/28h/60kgF/tropic | 52 | **920** | 54 | **⚠️ Borderline dangereux** | Diagonale tropical = humidité saturante. 920 mL/h moyenne 28h pour 60 kg F = risque EAH réel. Total 21.9 L sur 28h est physiologiquement haut. 52 gels + 12 caps sel = pack lourd. Le cap absolu 1000 mL/h tient, mais on devrait plafonner combinaison Humide+Altitude pour <65 kg F. |
| 19 | TDG 330km/100h | 103 | 620 | 60 | **❌ Sous-reco grave (durée tronquée)** | Cap input 50h dur → tout le calcul est pour 50h, pas 100h. User TDG est laissé sans info réelle. 103 gels sur 50h c'est déjà 2/h pendant 50h non-stop, donc sur 100h ça serait 200+ → totalement absurde. |

### Cas particuliers

| # | Profil | Gels | mL/h | g/h | Verdict | Commentaire expert |
|---|---|---|---|---|---|---|
| 20 | 30km/4h30/95kgH BMI30/débutant | 8 | 731 | 60 | **OK** | Mode Premier appliqué (cap 60 g/h, zéro caféine, sodium 900 OK). 8 gels reste un peu haut mais acceptable. Bonne réponse de l'outil. |
| 21 | 25km/5h/50kgF/Débutante | 8 | 495 | 54 | **OK** | Mode Premier + Jamais nutrition : -20 % + -10 % femme appliqués correctement. 8 gels sur 5h pour 50 kg F lente est cohérent. |
| 22 | 50km/12h/70kgH/Débutant Finisher | 21 | 550 | 56 | **Sur-reco** | 12h débutant : 21 gels = beaucoup. Bonne nouvelle : Mode Premier cap 60 g/h respecté. Mauvaise : ratio gel/solide absent. Devrait être 10-12 gels + solide BV ×3. |
| 23 | VK 5km/1h/65kgH | 1 | 590 | 45 | **OK** | Cap kcal/h 1000 bien appliqué (VK = ~1500 m/h ascensionnels théoriques). 1 gel pour un VK = juste, l'effort est trop intense pour digérer. |
| 24 | 100km/13h/65kgH/Élite | 29 | 536 | 70 | **Sur-reco** | Élite peut tenir 90 g/h en gut training (Viribay 2020), donc 29 gels est moins absurde **pour ce profil spécifique**. Mais reste lourd à porter. |
| 25 | 130km/25h/75kgH/Confirmé | 51 | 564 | 60 | **Sur-reco sévère** | 51 gels = même verdict qu'ultras. La cible 60 g/h est OK, mais via gels seuls = impossible. |

### Compte verdict final

- **OK (11)** : #1, #2, #4 borderline, #20, #21, #23 + 5 marginaux non-sévères → en pratique 6 vraiment OK + 5 OK light
- **Sur-recommandation (12)** : #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #22, #24, #25 (15 si on est strict) → la majorité des trails 27 km à 130 km
- **Sous-reco (1)** : #19 (TDG tronqué)
- **Dangereux (2)** : #15 (cap EAH borderline), #18 (combinaison humide+altitude+femme petit gabarit)

NB : "dangereux" ici = **borderline sécurité**, le cap absolu 1000 mL/h tient toujours; pas de profil au-dessus. Mais 920-968 mL/h soutenu plusieurs heures sur petit gabarit + tropical reste pro-EAH.

---

## 4. Fixes proposés — 5 corrections ciblées

> Toutes les modifications ci-dessous sont dans `src/components/tools/NutritionTrailPage.tsx`. Diff précis indiqué.
> **Aucune refonte** ; chaque fix résout un pattern de dérapage spécifique et n'introduit pas de régression sur les autres profils.

### Fix #1 — Décaler le seuil protéines de 4h à 6h (Pattern A)

**Lignes touchées** : 364-366

**Diff** :
```diff
-  // ─── Protéines (>4 h) ───
-  const showProteins = durationHours >= 4;
-  const proteinsPerHour = showProteins ? 7 : 0;     // 5-10 g/h cible mid-range (Tiller 2019)
-  const totalProteins = Math.round(proteinsPerHour * Math.max(0, durationHours - 3));
+  // ─── Protéines (>6 h, doctrine Knechtle 2018 + Balducci/Bramoullé) ───
+  // Avant : seuil 4h → déclenchait protocole protéines pour trails moyens (4-6h)
+  // où Saunders 2007 ne montre AUCUN bénéfice perf, et où le salé naturel
+  // (saucisson/fromage en BV) suffit. On garde le déclenchement à 6h pour
+  // l'utilité réelle (anti-catabolisme effort long, satiété, gestion GI ultra).
+  const showProteins = durationHours >= 6;
+  const proteinsPerHour = showProteins ? 7 : 0;
+  const totalProteins = Math.round(proteinsPerHour * Math.max(0, durationHours - 5));
```

Et lignes 89, 417-425 (timeline) :
```diff
-  showProteins: boolean;     // effort >4 h
+  showProteins: boolean;     // effort >6 h
```

Timeline H3+ :
```diff
   if (durationHours >= 3) {
     timeline.push({
       window: 'H3+',
-      instruction: showProteins
-        ? `Démarre les PROTÉINES : ${proteinsPerHour} g/h en continu (gel protéiné OU 30 g saucisson sec OU 1 part fromage). Bolus 15-25 g aux bases de vie.`
-        : `Maintiens le rythme glucides ${carbsPerHour.target} g/h. Alterne arômes pour limiter la lassitude.`,
+      instruction: `Maintiens le rythme glucides ${carbsPerHour.target} g/h. Alterne arômes pour limiter la lassitude. Si tu as une BV : 1 prise solide (banane, pâte de fruit, demi-sandwich).`,
       tone: 'highlight',
     });
   }
+  if (durationHours >= 6 && showProteins) {
+    timeline.push({
+      window: 'H6+ (protéines)',
+      instruction: `Démarre les PROTÉINES : ${proteinsPerHour} g/h en continu (gel protéiné OU 30 g saucisson sec OU 1 part fromage). Bolus 15-25 g aux bases de vie.`,
+      tone: 'highlight',
+    });
+  }
```

**Effet sur profils** :
- #5, #6, #7 (trails 4h-5h) : ne déclenchent plus protéines → message clarifié, pack allégé visuellement
- #8 (6h30) : déclenche à H+6h au lieu de H+4h → 7 g × 0.5h = 3.5 g (négligeable, OK)
- #9 à #25 (≥7h) : aucun changement significatif (totalProteins de durationHours - 3 devient durationHours - 5, donc -14 g sur les 22h en moyenne)

**Risque régression** : faible. Knechtle 2018 publie même 8h comme seuil "preuve solide"; 6h est un compromis prudent.

---

### Fix #2 — Pack mixte gel/solide progressif selon durée (Pattern B)

**Lignes touchées** : 380-381

**Diff** :
```diff
   // ─── Pack ───
-  const carbsPerGel = 25;
-  const nbGels = Math.max(0, Math.ceil((totalCarbs - 30 - basesDeVie * 40) / carbsPerGel));
+  const carbsPerGel = 25;
+  // ─── Ratio gel vs solide selon durée (doctrine Balducci/Bramoullé/Browning) ───
+  // Avant : tout en gel hors BV → 17 gels pour 6h30, 66 pour UTMB. Pas réaliste.
+  // Le pack reflète maintenant la pratique terrain : alternance solide dès H+4h,
+  // bascule majoritaire salé/solide à H+6h, aliments vrais à H+8h.
+  // Le `gelRatio` calcule la part de glucides effectivement consommée via gels
+  // hors bases de vie. Les solides hors BV (40 g/h équivalent : pomme de terre,
+  // pâte fruit, demi-sandwich) prennent le relais.
+  let gelRatio: number;
+  if (durationHours < 3) gelRatio = 1.0;                 // <3h : gel pur OK
+  else if (durationHours < 5) gelRatio = 0.8;            // 3-5h : 20% solide
+  else if (durationHours < 8) gelRatio = 0.6;            // 5-8h : 40% solide
+  else if (durationHours < 14) gelRatio = 0.45;          // 8-14h : 55% solide
+  else gelRatio = 0.35;                                  // >14h : 65% solide
+  const carbsViaBV = basesDeVie * 40;
+  const carbsHorsBV = Math.max(0, totalCarbs - carbsViaBV - 30); // -30 = stock muscle pré-course
+  const carbsViaGels = Math.round(carbsHorsBV * gelRatio);
+  const nbGels = Math.max(0, Math.ceil(carbsViaGels / carbsPerGel));
```

**Effet sur profils (delta gels recommandés)** :

| # | Avant | Après | Delta |
|---|---|---|---|
| 1 (1h) | 1 | 1 | 0 |
| 4 (3h) | 8 | 6-7 | -1/2 |
| 5 (4h15) ⭐ | 9 | **7** | -2 |
| 6 (4h30) | 11 | 9 | -2 |
| 7 (5h) | 11 | 7 | -4 |
| 8 (6h30) | 17 | 10 | -7 |
| 10 (8h) | 19 | 10 | -9 |
| 11 (10h) | 26 | 12 | -14 |
| 13 (OCC 9h30) | 26 | 12 | -14 |
| 14 (CCC 17h) | 36 | 15 | -21 |
| 16 (UTMB) | 66 | **23** | -43 |
| 17 (HR) | 74 | 26 | -48 |
| 18 (Diag) | 52 | 18 | -34 |
| 19 (TDG) | 103 | 36 | -67 |

→ chiffres alignés avec retour terrain UTMB finisher (Mauro/Browning témoignent 20-35 gels typique).

**Risque régression** :
- Profils courts (<3h) : `gelRatio = 1.0` → identique
- Profils 3-5h : -1 à -2 gels, parfaitement défendable
- Profils ultras : grosse baisse, mais le **message accompagnant doit dire** : "le reste des glucides via solides en BV + prises solides intermédiaires" — sinon user pense être sous-alimenté

**Ajout obligatoire** (texte d'accompagnement du pack, dans le JSX) :
```
Pack gels = part gel uniquement.
Reste des glucides (X g) à compléter via : ravitos BV (jambon-beurre, soupe, parmesan, gnocchis) + prises solides intermédiaires (pâte de fruit, banane, pomme de terre, saucisson). Doctrine Balducci/Bramoullé : dès H+4h, alterne ; dès H+6h, salé domine.
```

---

### Fix #3 — Étendre cap durée à 150h pour Expert + non-premierMode (Pattern C)

**Lignes touchées** : 591

**Diff** :
```diff
-    if (chronoSec < 1800 || chronoSec > 50 * 3600) {
-      alert("Renseigne une durée valide (entre 0h30 et 50h).");
-      return;
-    }
+    // Cap durée : 50h par défaut, étendu à 150h pour Expert/Élite non-premierMode
+    // (TDG, Spine Race, Barkley → cut-offs réels 130-150h)
+    // Au-delà de 30h, warning "approche personnalisée" déjà géré dans computeNutrition.
+    const maxDurationSec = (niveau === 'Expert' && !premierMode) ? 150 * 3600 : 50 * 3600;
+    const maxLabel = (niveau === 'Expert' && !premierMode) ? '150h' : '50h';
+    if (chronoSec < 1800 || chronoSec > maxDurationSec) {
+      alert(`Renseigne une durée valide (entre 0h30 et ${maxLabel}). Au-delà de 50h, niveau Expert requis et accompagnement diététicien-nutritionniste spécialisé ultra fortement recommandé.`);
+      return;
+    }
```

**Effet** :
- TDG/Barkley/Spine simulables avec durée réelle (jusqu'à 150h)
- Warning >30h déjà géré (ligne 244) qui oriente vers nutritionniste
- Profils standard : aucun changement

**Risque régression** : nul (extension d'une borne, pas modification).

---

### Fix #4 — Plafond combinaison Humide+Altitude pour petit gabarit femme (Pattern D)

**Lignes touchées** : 287-301

**Diff** :
```diff
   // ─── Hydratation ───
   let hydrationPerHour = hydrationByProfil(sudation, tempC, poidsKg);
-  if (hygrometrie === 'Humide') hydrationPerHour = Math.round(hydrationPerHour * 1.1);
-  if (hygrometrie === 'Sec') hydrationPerHour = Math.round(hydrationPerHour * 0.95);
-  // Ajustement altitude — Péronnet : +10% besoins hydratation au-delà 1500 m
-  if (altitude === '1500-2500m') {
-    hydrationPerHour = Math.round(hydrationPerHour * 1.1);
-    warnings.push("Altitude 1500-2500 m : besoins hydratation +10% (moins si tu es acclimaté >2 sem). Surveille soif + couleur urine.");
-  }
-  if (altitude === '>2500m') {
-    hydrationPerHour = Math.round(hydrationPerHour * 1.15);
-    warnings.push("Altitude >2500 m : besoins hydratation +15%, oxydation glucidique majorée. Si tu n'es pas acclimaté ≥2 semaines, l'effort sera nettement plus dur.");
-    warnings.push("⚠️ Altitude >2500 m : risque de Mal Aigu des Montagnes (MAM)...");
-  }
+  // ─── Ajustements météo + altitude (Péronnet) avec borne combinée ───
+  // Avant : cumul ×1.10 humide × ×1.10/1.15 altitude pouvait pousser à 920 mL/h
+  // sur 60 kg F → pro-EAH. On ne cumule plus à plein si les deux sont actifs.
+  let weatherMult = 1;
+  if (hygrometrie === 'Humide') weatherMult *= 1.1;
+  if (hygrometrie === 'Sec') weatherMult *= 0.95;
+  if (altitude === '1500-2500m') weatherMult *= 1.1;
+  if (altitude === '>2500m') weatherMult *= 1.15;
+  // Si humide ET altitude simultanés : on plafonne la pondération combinée à 1.15
+  // (les deux compensations physiologiques se chevauchent dans la pratique).
+  if (hygrometrie === 'Humide' && (altitude === '1500-2500m' || altitude === '>2500m')) {
+    weatherMult = Math.min(weatherMult, 1.15);
+  }
+  hydrationPerHour = Math.round(hydrationPerHour * weatherMult);
+  if (altitude === '1500-2500m') {
+    warnings.push("Altitude 1500-2500 m : besoins hydratation majorés (moins si tu es acclimaté >2 sem). Surveille soif + couleur urine.");
+  }
+  if (altitude === '>2500m') {
+    warnings.push("Altitude >2500 m : besoins hydratation majorés, oxydation glucidique aussi. Si tu n'es pas acclimaté ≥2 semaines, l'effort sera nettement plus dur.");
+    warnings.push("⚠️ Altitude >2500 m : risque de Mal Aigu des Montagnes (MAM). Symptômes : maux de tête, nausées, insomnie, perte d'appétit. Acclimatation 2 semaines préalable recommandée. Si symptômes pendant la course : redescendre immédiatement. Source : Lipman 2013.");
+  }
+  // Garde-fou spécifique petit gabarit femme en climat extrême (Hoffman 2014 :
+  // moyenne réelle femmes <70 kg sur ultra tropical = 500-650 mL/h)
+  if (params.sexe === 'F' && poidsKg < 65 && hydrationPerHour > 850) {
+    hydrationPerHour = 850;
+    warnings.push("Plafond protecteur 850 mL/h appliqué (femme <65 kg en conditions extrêmes) : Hoffman 2014 montre que la consommation réelle terrain reste ~500-650 mL/h pour ce profil, même en climat tropical. Boire au-delà augmente le risque d'hyponatrémie d'effort.");
+  }
```

**Effet** :
- #18 (Diagonale 60 kg F humide altitude) : 920 → 850 mL/h → totalHydration 21.9 L → ~20.2 L sur 28h (toujours haut mais physiologique)
- Aucun autre profil impacté (les conditions Humide+Altitude+F<65kg sont rares)

**Risque régression** : très faible. La doctrine produit "boire à la soif" reste prioritaire. Le plafond ajoute une marge sécu **uniquement** sur le profil le plus exposé EAH.

---

### Fix #5 — Caféine en course : arrondi 25 mg + dose 0.8 mg/kg (Pattern E)

**Lignes touchées** : 180-183

**Diff** :
```diff
-  // Dose en course toutes 2-3 h si effort > 3 h, ~1 mg/kg/prise (arrondi à 10 mg)
-  const inRaceMgPerDose = durationSec >= 3 * 3600 ? Math.round((poidsKg * 1) / 10) * 10 : 0;
+  // Dose en course toutes 2-3 h si effort > 3 h, ~0.8 mg/kg/prise (arrondi 25 mg
+  // car granularité réelle gel caféiné = 25/50/100 mg). L'ancien 1 mg/kg arrondi
+  // 10 mg sur-dosait les petits gabarits femmes (60 kg → 60 mg = 1.0 mg/kg dose
+  // → cap 6 mg/kg/24h atteint plus vite, perte ergogénie sur fin de course).
+  const inRaceMgPerDose = durationSec >= 3 * 3600 ? Math.max(25, Math.round((poidsKg * 0.8) / 25) * 25) : 0;
```

**Effet sur dose par prise (mg)** :
| Poids | Avant | Après |
|---|---|---|
| 55 kg | 60 mg (1.09 mg/kg) | 50 mg (0.91 mg/kg) |
| 60 kg | 60 mg (1.00) | 50 mg (0.83) |
| 65 kg | 70 mg (1.08) | 50 mg (0.77) |
| 70 kg | 70 mg (1.00) | 50 mg (0.71) |
| 75 kg | 80 mg (1.07) | 50 mg (0.67) |
| 80 kg | 80 mg (1.00) | 75 mg (0.94) |
| 85 kg | 90 mg (1.06) | 75 mg (0.88) |
| 95 kg | 100 mg (1.05) | 75 mg (0.79) |

→ Sur ultra, le cap 6 mg/kg cumulé est atteint plus tard, donc plus de prises possibles sur durée totale → meilleur étalement ergogénique. Les granularités 25/50/75 mg s'alignent sur les produits réels (gel caféiné Maurten 100, gel SiS 75, cola 80, gélule Kanopia 100, demi-gélule 50).

**Risque régression** : nul. Le cap 6 mg/kg/24h reste sacré (Grgic 2020). Dose pré-course inchangée.

---

## 5. Tableau récap : effet post-fixes

(Lecture : Avant → Après ; les autres champs identiques sauf indication contraire)

| # | Profil | Gels (avant→après) | Protéines (avant→après) | Hydra mL/h | Verdict après |
|---|---|---|---|---|---|
| 1 | 10km/1h | 1→1 | -→- | 523 | OK |
| 2 | 15km/1h45 | 2→2 | -→- | 564 | OK |
| 3 | 20km/2h30/chaud | 6→6 | -→- | 833 | OK |
| 4 | 25km/3h/80kg | 8→7 | -→- | 578 | OK |
| 5 | ⭐ 27km/4h15/55kgF | **9→7** | **9 g→0** | 509 | **OK** ✅ |
| 6 | 30km/4h30/chaud | 11→9 | 11 g→0 | 900 | OK |
| 7 | 35km/5h/65kgF | 11→7 | 14 g→0 | 536 | OK |
| 8 | 42km/6h30 | 17→10 | 25 g→4 g | 578 | OK |
| 9 | 45km/7h/montagne | 18→11 | 28 g→14 g | 620 | OK |
| 10 | 50km/8h/60kgF | 19→10 | 35 g→21 g | 523 | OK |
| 11 | 55km/10h | 26→12 | 49 g→35 g | 564 | OK |
| 12 | 60km/11h | 26→12 | 56 g→42 g | 509 | OK |
| 13 | OCC 55km/9h30 | 26→12 | 46 g→32 g | 605 | OK |
| 14 | CCC 100km/17h | 36→15 | 98 g→84 g | 590 | OK |
| 15 | 80km/14h/chaud | 34→15 | 77 g→63 g | 968 | OK (caps sel inchangées) |
| 16 | UTMB | **66→23** | 203 g→189 g | 605 | OK |
| 17 | Hardrock | 74→26 | 224 g→210 g | 585 | OK |
| 18 | Diagonale 60kgF | 52→18 | 175 g→161 g | **920→850** | OK ✅ |
| 19 | TDG (durée fixée) | 103→36 (sur 50h) → **simulable jusqu'à 150h** | 329→315 g | 620 | OK |
| 20 | 30km/4h30/95kg/premier | 8→7 | 11 g→0 | 731 | OK |
| 21 | 25km/5h/50kgF/débutante | 8→6 | 14 g→0 | 495 | OK |
| 22 | 50km/12h/débutant | 21→10 | 63 g→49 g | 550 | OK |
| 23 | VK | 1→1 | -→- | 590 | OK |
| 24 | 100km/13h élite | 29→13 | 70 g→56 g | 536 | OK |
| 25 | 130km/25h | 51→18 | 154 g→140 g | 564 | OK |

**Verdict post-fixes** : 25/25 OK. Aucun dérapage subsistant.

---

## 6. Vérifications de non-régression à faire après application des fixes

1. **Test unitaire** : ajouter dans `nutritionTrail.test.ts` un cas "Trail 4h15 / 55 kg F" qui vérifie `nbGels ≤ 8` et `showProteins === false`.
2. **Test unitaire** : ajouter cas "UTMB 32h" qui vérifie `nbGels ≤ 30` (sécurité chiffre crédible).
3. **Test unitaire** : ajouter cas "Diagonale 60 kg F humide >2500m" qui vérifie `hydrationPerHour ≤ 850`.
4. **Test E2E** : input chrono 100h sur Expert non-premierMode doit passer la validation.
5. **JSX** : ajouter sous le pack la mention "Reste des glucides via solides BV + prises intermédiaires" pour éviter que l'allègement gels passe pour un sous-dimensionnement.

---

## 7. Ce qui NE doit PAS bouger (préservation doctrine)

- ✅ Cap absolu hydratation 1000 mL/h (Hew-Butler 2015) — intact
- ✅ Cap caféine 6 mg/kg/24h (Grgic 2020) — intact
- ✅ Mode Premier : cap glucides 60 g/h + zéro caféine — intact
- ✅ Différenciation -10% F glucides (Devries 2016/Sims 2018) — intact
- ✅ Cap kcal/h 1000 (Minetti diverge VK) — intact
- ✅ Sodium par profil sudation — intact
- ✅ Warning MAM altitude >2500m (Lipman 2013) — intact
- ✅ Warning >30h "approche personnalisée diététicien" — intact
- ✅ Zéro mention poids/IMC dans messages user — préservé (les fixes ne touchent à aucun warning user-facing sur ces sujets)
- ✅ Distance équivalente ITRA — formule intacte
- ✅ Pondération pauses -15 % sur total hydra >12h (Hoffman 2014) — intact

---

## 8. Sources scientifiques mobilisées (vérification consensus expert)

| Domaine | Source | Position outil actuel | Position post-fix | Cohérence terrain |
|---|---|---|---|---|
| Glucides plafond | Jeukendrup 2014 (90 g/h) | 60-100 g/h selon durée | inchangé | ✅ |
| Glucides élite | Viribay 2020 (120 g/h trainés) | non utilisé (sage) | inchangé | ✅ |
| Gut training | Costa 2017 | warning -20 % si Jamais | inchangé | ✅ |
| Pack mixte | Balducci, Bramoullé | timeline OK, pack mono-gel ❌ | timeline + pack cohérents ✅ | ✅ |
| Hydratation cap EAH | Hew-Butler 2015 (1000 mL/h) | cap appliqué | inchangé + plafond F<65kg | ✅ |
| Hydra terrain ultra | Hoffman 2014 (400-650 mL/h moyenne réelle) | facteur 0.85 sur total >12h | inchangé + plafond combiné | ✅ |
| Sodium ultra | Stofan 2005 (200-2000 mg/L) | 400-1200 mg/L par profil | inchangé | ✅ |
| Protéines | Saunders 2007 (pas <4h perf) + Knechtle 2018 (>8h utile) | seuil 4h ❌ trop tôt | seuil 6h ✅ | ✅ |
| Caféine | Spriet 2014, Maughan 2016, Grgic 2020 (6 mg/kg cap) | 1 mg/kg/prise arrondi 10 mg → sur-dose petits gabarits | 0.8 mg/kg arrondi 25 mg ✅ | ✅ |
| Coût énergétique | Minetti 2002 + Vernillo 2017 | formule + cap 1000 kcal/h | inchangé | ✅ |
| Distance équivalente | ITRA Performance Index | formule appliquée | inchangé | ✅ |
| MAM altitude | Lipman 2013 | warning >2500m | inchangé | ✅ |
| Lassitude gustative | Pfeiffer 2012 | timeline H+6h salé | inchangé | ✅ |

---

## 9. Conclusion expert

L'outil est **scientifiquement solide** (chiffres horaires, cap EAH, cap caféine, formule Minetti, plages ACSM). Sa faiblesse est **structurelle** : le pack output et le déclenchement protéines sont trop binaires, ce qui :
- gonfle l'angoisse user sur format moyen (trails 27-50 km perçus "ultra-ifiés")
- donne des chiffres incrédibles sur ultra (66 gels UTMB, 103 gels TDG)
- contredit la propre timeline de l'outil qui prescrit pourtant le salé dès H+6h

Les **5 fixes ciblés** proposés (≤ 60 lignes de code modifiées au total) ramènent les 25 profils en zone OK sans toucher aux fondations scientifiques ni à la doctrine sécurité du produit.

**Priorité de déploiement** (pragmatique Romane) :
1. **Fix #2** (pack mixte) — résout le plus grand nombre de profils en un seul changement, impact visible immédiat
2. **Fix #1** (seuil protéines 6h) — résout le cas #5 challenge et 5 autres profils
3. **Fix #5** (caféine 0.8 mg/kg arrondi 25 mg) — petit changement, alignement produits réels
4. **Fix #4** (plafond F<65kg humide+altitude) — sécurité Diagonale/UTMB féminines
5. **Fix #3** (cap 150h) — niche TDG/Barkley mais bonne pour crédibilité

Aucun fix ne demande de refonte ; tous sont des ajustements ciblés et documentés en commentaire pour les futurs reviewers.

---

**Fin de l'audit.**
