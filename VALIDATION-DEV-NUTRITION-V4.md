# Validation Dev équipe — Brief V4 FINAL Nutrition Course
Date: 2026-05-17
Reviewer: Dev équipe CRIA (auteur des autres outils `src/components/tools/*`)
Source brief: `~/Coach-Running-IA/BRIEF-NUTRITION-V4-FINAL.md` (926 L, 13 sections)

---

## Synthèse exec

- VALIDÉS : 6/13 sections (§0, §1, §4, §8, §11, §12)
- CONDITIONNELS : 6/13 sections (§2, §3, §5, §6, §7, §10)
- CHALLENGÉS : 1/13 section (§9 — pas sur le fond, sur l'implémentation chiffrée du clamp)
- Recommandation globale : GO après ajustements (warm GO). Aucun blocker structurel. 8 ajustements brief avant pass code, listés en bas.
- Estimation MVP réaliste : 9-12 jours dev (1.8-2.4 semaines à 5j/semaine), hors review PM et tests utilisateurs.

Rappel architecture existante observée :
- React 18 + Vite 5 + TypeScript + Tailwind, routing `react-router-dom` v6 BrowserRouter.
- SEO : prerender Puppeteer en post-build (`scripts/prerender.mjs`) → SSG-like, routes listées en dur. Pas de SSR.
- Analytics : GA4 (`G-P0641L8TPT` dans `index.html`), **PAS Plausible** malgré ce que sous-entend la consigne PM. À clarifier avec Romane.
- Tests : `vitest` installé, 1 seul test existant (`src/services/__tests__/periodization.test.ts`). Pas de Playwright.
- Pattern outil existant : 1 fichier monolithique `~14-18 kB` brut (~5 ko gzip), `useState` local, calcul à la demande sur bouton, `<Helmet>` SEO + `application/ld+json` FAQ, hero gradient, 1 carte calculateur, 1 carte résultat, sections SEO en dessous. **Aucune abstraction partagée entre outils.**
- Pas de jsPDF, react-pdf, html2canvas, idb-keyval, workbox dans `package.json`. Pas de service worker. Pas de `useSearchParams` utilisé dans les outils existants.
- Lazy loading systématique des routes outils dans `App.tsx` (`lazy(() => import(...))`).

---

## Architecture proposée

```
src/
├── components/
│   └── tools/
│       └── nutrition/
│           ├── NutritionTrailPage.tsx              # ~3-5 ko (config + SEO + intro spécifique)
│           ├── NutritionMarathonPage.tsx           # ~3-5 ko
│           ├── NutritionSemiPage.tsx               # ~3-5 ko
│           ├── shared/
│           │   ├── NutritionCalculator.tsx        # Container principal (orchestrateur, ~8-10 ko)
│           │   ├── inputs/
│           │   │   ├── InputsWizard.tsx           # Mobile step-by-step, Desktop tout-en-un
│           │   │   ├── CommonInputsStep.tsx       # Sexe/poids/niveau/chrono/T°/humidité/sudation/expérience/caféine/Premier
│           │   │   ├── TrailInputsStep.tsx        # Distance/D+/D-/altitude/acclimaté/bases vie/heure départ
│           │   │   ├── MarathonInputsStep.tsx     # Météo simple + ravitos officiels
│           │   │   ├── SudationQuestionnaire.tsx  # 5 questions binaires § 3.5
│           │   │   └── inputValidation.ts         # Règles soft § 6.8
│           │   ├── results/
│           │   │   ├── CardSynthesis.tsx          # Carte 1 (anti-rigidité incluse)
│           │   │   ├── CardTimeline.tsx           # Carte 2 (zone rouge H-30 → H-0)
│           │   │   ├── CardPack.tsx               # Carte 3 (produits concrets)
│           │   │   ├── CardSafety.tsx             # Carte 4 (warnings + EAH + cycle)
│           │   │   ├── CardFAQ.tsx                # Carte 5 (FAQ + ld+json)
│           │   │   ├── CardWhenToTest.tsx         # Carte cross-promo plan § 5.5
│           │   │   ├── CardMethodology.tsx        # Carte 6 § 5.6
│           │   │   └── trail/
│           │   │       ├── CardAidStations.tsx    # § 5.2.6 bases de vie
│           │   │       ├── CardFatigue.tsx        # § 5.2.7 lassitude/plan B
│           │   │       └── CardAltitude.tsx       # § 5.2.8
│           │   ├── warnings/
│           │   │   ├── WarningGutTrainingGate.tsx # Tête de page, bouton accept
│           │   │   ├── WarningPreCoursePost.tsx   # Tête de page (§1)
│           │   │   ├── PremierModeMessage.tsx     # Mode Premier message anti-rigidité
│           │   │   └── DisclaimerMedical.tsx      # §6.5 — collapsible mobile
│           │   ├── pdf/
│           │   │   └── PdfExportButton.tsx        # Lazy-loaded jsPDF
│           │   └── share/
│           │       └── ShareUrlButton.tsx         # Sérialisation URL
│           ├── lib/
│           │   ├── formulas/
│           │   │   ├── energy.ts                  # § 4.1 Minetti, § 4.2 kcal
│           │   │   ├── carbs.ts                   # § 4.3 + caps Mode Premier + caps expérience
│           │   │   ├── hydration.ts               # § 4.4 + ajustements altitude/humidité
│           │   │   ├── sodium.ts                  # § 4.5
│           │   │   ├── caffeine.ts                # § 4.6
│           │   │   ├── proteins.ts                # § 4.7 (trail only)
│           │   │   ├── ratios.ts                  # § 4.8 G:F
│           │   │   ├── mouthRinse.ts              # § 4.9
│           │   │   └── aidStations.ts             # § 4.10 déduction ravitos
│           │   ├── profiles/
│           │   │   ├── sudationScoring.ts         # § 3.5 mini-questionnaire
│           │   │   └── premierMode.ts             # § 9 caps + plafonds
│           │   ├── types.ts                       # NutritionInputs, NutritionResult, Config
│           │   ├── urlState.ts                    # encode/decode inputs ↔ URL
│           │   ├── analytics.ts                   # wrapper GA4 events (cf. §12)
│           │   └── __tests__/                     # Vitest sur toutes formules
│           │       ├── energy.test.ts
│           │       ├── carbs.test.ts
│           │       ├── hydration.test.ts
│           │       ├── sodium.test.ts
│           │       ├── caffeine.test.ts
│           │       ├── premierMode.test.ts
│           │       └── urlState.test.ts
│           └── content/
│               ├── trailContent.tsx               # H2/H3 SEO + FAQ (1500-2500 mots)
│               ├── marathonContent.tsx
│               └── semiContent.tsx
└── App.tsx  → +3 routes : /outils/nutrition-trail, /outils/nutrition-marathon, /outils/nutrition-semi-marathon
scripts/prerender.mjs → +3 routes statiques à ajouter dans STATIC_ROUTES
src/components/Layout.tsx → toolsLinks[] enrichi avec sous-section Nutrition (5 items + 3)
```

**Single source of truth** : `NutritionCalculator.tsx` reçoit `config: NutritionConfig` (props), appelle uniformément les fonctions pures de `lib/formulas/*`, et fait du conditional rendering des cartes via `config.showXxx`. Aucune duplication par type de course. Risque god component **maîtrisé** si on respecte l'extraction en sous-composants par carte (12 cartes max). Lui-même reste un container de ~250-400 lignes.

---

## Verdict par section (§0 à §12)

### §0 — Synthèse exec (évolutions V3 → V4)
**Verdict dev** : VALIDÉ
**Complexité dev** : N/A (méta)
**Cohérence avec existant** : N/A
**Note** : Le tableau des 20 deltas servira de checklist QA. À utiliser comme base pour `__tests__/*.test.ts` (1 test = 1 delta = 1 valeur attendue).

---

### §1 — Positionnement (promesse + warnings ouverture)
**Verdict dev** : VALIDÉ
**Complexité dev** : faible (~2h pour 2 composants Warning + texte)
**Cohérence avec existant** : OK — `<Helmet>` + hero gradient déjà standard. Les warnings sont 2 components simples.
**Note dev** : Le warning gut training avec bouton "Compris, montre-moi les chiffres" implique un état `gutTrainingAcknowledged: boolean` à persister en `localStorage` (clé `nutrition_gut_ack_v1`) pour ne pas l'afficher à chaque visite. Sinon : friction insupportable. **À ajouter au brief** : ack persistant 30 jours.

---

### §2 — Architecture technique (composant partagé + config + sous-menu)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : moyen (~6-8h pour `<NutritionCalculator>` + types + config + 3 pages-instances + ajout 3 routes + maj Layout)
**Cohérence avec existant** : Divergence justifiée (jusqu'ici 1 outil = 1 fichier monolithique sans abstraction ; pour 3 outils ce serait du copier-coller catastrophique). C'est la 1ère vraie abstraction inter-outils du projet → précédent à documenter dans `CLAUDE.md`.
**Si CONDITIONNEL — ajustements demandés** :
1. **Sous-menu Outils niveau 2 dans `Layout.tsx`** : le pattern actuel est un dropdown simple plat. Pour ajouter "Nutrition Course ► [3 sous-items]" il faut un mini-cascade. Mobile est déjà compliqué (deux `isMobile*Open` states). Proposer plutôt : section "Nutrition Course" comme **header non cliquable** dans le dropdown, suivie des 3 items indentés. Pas de vrai sous-dropdown niveau 2 (UX cassée mobile). 1h dev supplémentaire vs cascade.
2. **`toolsLinks[]` passe de 5 à 8 items** : vérifier hauteur dropdown desktop (actuellement `w-64`) → 8 items + header section restent OK (~400px).
3. **Config trail `distanceRange: [5, 300]`** manque dans le snippet brief — préciser. Idem `dPlusRange: [0, 15000]`.

---

### §3 — Inputs du calculateur (10-12 inputs communs + spécifiques + mini-questionnaire)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : élevé (~10-12h : 10 inputs typés + validation + 5 questions scorées + wizard mobile)
**Cohérence avec existant** : Divergence — outils existants ont 1 à 3 inputs sur 1 seul écran. Ici on saute à 10-12 inputs. Le wizard mobile (3-4 écrans) est obligatoire (cf. §10) sinon abandon massif.
**Si CONDITIONNEL — ajustements demandés** :
1. **Inputs prioritaires vs optionnels** : sur desktop on peut tout afficher en 1 page (3 colonnes), mais sur mobile le wizard est obligatoire. Brief demande "wizard step-by-step mobile" en §10 → préciser dans §3 le **groupement** :
   - Étape 1 (Profil) : sexe, poids, niveau, expérience nutrition, habitude caféine, mode Premier (auto-coché si Débutant).
   - Étape 2 (Course) : chrono visé + inputs spécifiques (distance/D+/D-/altitude/acclimaté/bases vie pour trail ; météo + ravitos pour marathon ; chrono seul pour semi).
   - Étape 3 (Conditions) : T°, hygrométrie, profil sudation (+ accès questionnaire scoré), cycle menstruel optionnel.
   - Étape 4 (Synthèse + bouton Calculer).
2. **Champ "Chrono visé"** : input `<time>` HTML est buggé sur Safari iOS, préférer 3 champs séparés `<input type="number">` h/m/s comme dans `MarathonPacePage.tsx` (`parseTimeToSeconds`).
3. **Input "Heure départ"** trail optionnel — préciser format (24h `<input type="time">` OK mobile).
4. **Input "Acclimaté altitude"** : conditionnel à altitude>1500m. Préciser : se cache si altitude≤1500m (logique React standard, pas de bug).
5. **Validation `min/max` HTML5** insuffisante (Safari mobile ignore parfois) — prévoir validation JS au `calculate()` + message inline rouge.

---

### §4 — Formules de calcul (10 sous-sections, scientifiquement corrigées V4)
**Verdict dev** : VALIDÉ
**Complexité dev** : moyen (~10-14h : 10 fonctions pures + 7-10 fichiers de tests unitaires avec 100% couverture branches)
**Cohérence avec existant** : Réutilisable — les outils existants ont leurs fonctions de calcul en haut du fichier (ex. `parseTimeToSeconds` dans `MarathonPacePage`). Ici on les externalise dans `lib/formulas/*` (best practice). Aucune divergence problématique.
**Note dev** :
- Toutes les formules sont **pures, déterministes, testables au snapshot**.
- Format des outputs à figer dans `types.ts` : `{ value: number, range: [min, max], unit: string, sources: string[] }` pour permettre affichage "60-80 g/h" partout.
- Tableaux §4.3.A/B/C, §4.4, §4.5 doivent être en `const TABLES = ...` exportés depuis `carbs.ts/hydration.ts/sodium.ts` — pas hardcodés dans le JSX. Sinon impossible à tester.
- Risque caché : la formule Minetti §4.2 trail mentionne "vitesse_km/h × Cw_plat" — vitesse moyenne ou vitesse instantanée par segment ? **À clarifier brief** : on calcule `vitesse_moy = distance / durée_visée` (moyenne globale, pas par segment). Sinon il faudrait découper en sections et c'est 5j supplémentaires.
- Mode Premier (cf. §9) **clamp ses plages dans `carbs.ts`** via flag `isPremier: boolean` — pas un mode séparé. Critique pour single-source-of-truth.

---

### §5 — Cartes de résultat (5-10 cartes selon outil)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : élevé (~14-18h : 12 composants cartes + variations conditionnelles trail/marathon/semi)
**Cohérence avec existant** : OK — pattern carte Tailwind déjà identique (`rounded-2xl shadow-xl border border-slate-100 p-8`). Mais 12 cartes vs 1-2 carte par outil existant.
**Si CONDITIONNEL — ajustements demandés** :
1. **Carte "Pack nutrition concret"** (5.1.3) cite "X gels marque type" — **danger juridique** : citer Maurten / SiS / Decathlon par nom = risque pub clandestine + désinformation si formulation change. **Proposer** : mention générique ("type maltodextrine 25-30g, ratio 2:1 ou 1:0.8") + lien Comparatif blog si existe. À valider Romane (compatible doctrine `feedback_securite_avant_conversion`).
2. **Carte Timeline** : ligne temporelle visuelle avec gel/boisson/sodium toutes les N min sur 1h-30h ? Sur trail 24h+ ça devient illisible. **Proposer** : timeline réduite (1ère heure détaillée + résumé "puis idem toutes les 25 min") + collapse "voir tout".
3. **Carte "Quand tester" §5.5** = CTA vers générateur plan. OK techniquement. Mais **vérifier route exacte** : on a `/plan-marathon`, `/plan-semi-marathon`, etc. (landing pages). Le générateur lui-même = `/questionnaire` ? À confirmer App.tsx.
4. Nombre de cartes affichées **mobile** : 12 cartes scrollables = page ~8000-12000px → catastrophe UX. Proposer **tabs/sections collapsibles mobile** ("Plan nutrition", "Timeline", "Sécurité", "FAQ" — 4 onglets max).

---

### §6 — Warnings & garde-fous sécurité (8 sous-sections)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : moyen (~6-8h : 5 components warning + logique conditionnelle d'affichage)
**Cohérence avec existant** : OK pattern, mais profusion de warnings à gérer.
**Si CONDITIONNEL — ajustements demandés** :
1. **Disclaimer médical §6.5** : 10+ pathologies + situations physiologiques = bloc texte long. Sur mobile 320px = ~2 écrans. **Imposer collapse fermé par défaut** sur mobile, ouvert desktop. Sinon "scared off" des débutants.
2. **Warning EAH conditionnel** §6.3 a 2 formulations selon durée < ou >5h. La logique d'affichage : `if (estimatedDuration < 5 * 3600) showSoftEAH() else showHardEAH()`. **À tester en unit test** (frontière exacte = 5h ? 4h59 → soft, 5h00 → hard ? 5h01 → hard ?). Préciser brief.
3. **Validation logique §6.8** : "inputs incohérents" — préciser les règles exactes. Ex donné = "60kg + 2h marathon + sudation Faible + 30°C". Faut-il un score pondéré ou des règles hard-coded ? Proposer : 3-5 règles hard-coded simples qu'on documente. Pas de ML.
4. **Mode Premier désactive certains warnings** §6.2 — implique que `<WarningEAH>` reçoit `isPremier` en prop ET `estimatedDuration` ET `chrono`. État cross-cutting à propager partout. Risque : oubli d'un warning. **Mitigation** : factoriser tous les warnings dans `<SafetyOrchestrator inputs={...} isPremier={...}>` qui décide qui afficher.

---

### §7 — SEO & contenu (1500-2500 mots par page)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : moyen côté dev (~4-6h infra) + élevé côté rédaction (estimé 3-5j rédacteur, hors scope dev)
**Cohérence avec existant** : OK — `MarathonPacePage`/`VMACalculatorPage` ont déjà ~300-400 lignes dont la moitié est du contenu SEO en bas. Le prerender Puppeteer existant prend en charge l'indexation (attend `networkidle2`).
**Si CONDITIONNEL — ajustements demandés** :
1. **H3 chrono "sub-3h / sub-3h30 / sub-4h / sub-4h30 / sub-5h / sub-5h30 / sub-6h"** = 7 H3 par page marathon (cf. §7.2) + 7 H3 par page semi. Sur même page = OK (juste du contenu SEO additionnel). **Si le brief voulait des pages dédiées** ("Plan nutrition marathon sub-3h" comme route séparée) = 7×3 = **21 routes nouvelles** → 1-2j dev de plus + prerender + sitemap. **À clarifier brief** : H3 sur la même page (recommandé), pas routes dédiées.
2. **Contenu 1500-2500 mots** : à stocker en `tsx` (composants JSX) ou MDX ? Recommander **TSX** (cohérent avec pattern existant qui inline tout dans le composant page). Pas besoin d'introduire MDX.
3. **FAQ schema `ld+json`** : pattern déjà utilisé dans `MilesKmConverterPage.tsx` (l. 69-106) — copier ce pattern. 12-15 questions × 3 pages = 36-45 entrées schema.org/FAQPage à rédiger.
4. **Prerender** : ajouter les 3 routes dans `scripts/prerender.mjs` `STATIC_ROUTES[]`. Vérifier que Puppeteer attend bien le render complet (cartes calculateur dépendent d'inputs vides → afficher placeholder par défaut sinon prerender capture vide). 30 min dev.

---

### §8 — Maillage interne + articulation outil ↔ plan
**Verdict dev** : VALIDÉ
**Complexité dev** : faible (~2h : 1 bloc maillage shared + 3 CTA vers `/questionnaire`)
**Cohérence avec existant** : OK
**Note dev** : §8.3 demande de modifier le **générateur de plans existant** (welcome message du plan + advice fin de plan). **Hors scope nutrition stricto sensu** : c'est un patch sur le prompt Gemini (`src/services/geminiService.ts` ou un fichier prompt). Estimer +1-2h séparément, à coordonner avec doctrine `feedback_pas_de_nutrition_dans_plan` (mémoire à mettre à jour). À ne PAS livrer dans le sprint outil nutrition pour éviter scope creep.

---

### §9 — Mode "Premier marathon/semi/ultra"
**Verdict dev** : CHALLENGÉ (sur l'implémentation, pas sur le besoin produit)
**Complexité dev** : moyen (~4-5h logique + tests dédiés)
**Cohérence avec existant** : N/A nouveau
**Raison du challenge** : Le brief parle de "flag config simple" mais c'est une **logique cross-cutting** :
- Plafonne plages haute glucides (différemment selon type course)
- Désactive certains warnings (lesquels exactement ?)
- Plafonne sodium (1300 mg/L)
- Plafonne caféine (3 mg/kg)
- Ajoute message anti-rigidité en tête synthèse

Ce n'est pas un flag → c'est **5 modifications dispersées** dans le calcul. Risque : un calcul oubliera le clamp en mode Premier → utilisateur débutant reçoit reco 110g/h → catastrophe doctrinale (`feedback_securite_avant_conversion`).
**Alternative recommandée** :
1. Créer fonction `applyPremierClamps(rawResult: NutritionResult, isPremier: boolean, type: Type): NutritionResult` dans `lib/profiles/premierMode.ts`.
2. **Toutes les fonctions du `lib/formulas/*` retournent leur résultat BRUT** (sans Premier).
3. **Une seule étape finale** dans `NutritionCalculator.tsx` : `const final = isPremier ? applyPremierClamps(raw, type) : raw`.
4. Tests unitaires obligatoires dans `premierMode.test.ts` qui vérifient : pour chaque type (trail<12h / marathon / semi), pour chaque catégorie (glucides, sodium, caféine), le clamp est appliqué. 6+ tests.

Cette approche garantit **zero bypass possible** du Mode Premier (audit unique = audit total). Conforme `feedback_chaque_ligne_justifiee` + `feedback_ecouter_instructions_explicites`.

---

### §10 — UX jour J (MVP : mobile-first + PDF A5 + URL partageable ; V2 : PWA offline)
**Verdict dev** : CONDITIONNEL
**Complexité dev** : élevé (~16-22h : mobile-first wizard 6-8h + PDF export 6-8h + URL partageable 2-3h + sticky button 1h + tests cross-browser 3-4h)
**Cohérence avec existant** : Divergence majeure — aucun outil existant n'a wizard mobile, PDF, ou URL partageable. C'est la 1ère fois.
**Si CONDITIONNEL — ajustements demandés** :

#### 10.1 Mobile-first wizard
- Matrices hydratation 4×4 sur 320px : **infaisable en tableau**. Confirmer "cards verticales mobile" comme dans le brief. Tableau visible uniquement à `md:` (≥768px).
- Wizard 3-4 étapes : utiliser un simple state `currentStep: 1|2|3|4` + animations Tailwind transition. Pas besoin de lib (`react-hook-form` overkill, déjà ~70 ko gzip).
- Sticky button "Recalculer" mobile : `fixed bottom-0` avec safe-area-inset (iPhone notch).

#### 10.2 PDF A5 export
- **Lib recommandée** : `jsPDF` (300 ko brut, ~85 ko gzip) en **import dynamique** (`const { jsPDF } = await import('jspdf')`) pour ne pas plomber le bundle initial. Alternative `react-pdf` = 700 ko (NO).
- A5 = 148×210mm. Format imprimable noir/blanc OK.
- **Coût bundle initial** : 0 ko (lazy). **Coût au clic** : ~85 ko gzip. Acceptable.
- **Risque** : génération côté client = polices custom non garanties. Utiliser polices PDF standard (Helvetica). Pas d'emoji dans le PDF (Helvetica n'a pas Unicode complet).
- **Alternative à considérer** : window.print() + media query `@media print` → 0 ko ajouté. Limite : moins contrôlable visuellement, dépend du navigateur. **À discuter avec PM** : print CSS d'abord, jsPDF en V2 si demande.

#### 10.3 URL partageable
- Sérialisation : `URLSearchParams` natif (pas de lib). 10-12 inputs encodés = ~120-180 chars URL → OK, sous la limite 2048 chars.
- Format : `?s=H&w=72&n=R&c=14400&t=18&h=S&su=M&exp=H&caf=1&prem=0` (codes courts pour rester compact).
- Pas de backend ✓.
- Pas de tracking PII ✓.
- À implémenter dans `lib/urlState.ts` avec test unitaire roundtrip (encode → decode = identité).

#### 10.4 V2 PWA offline
- **Confirmé V2**, pas MVP. Nécessite : `manifest.json` (déjà OK pour PWA de base mais à enrichir), service worker (workbox ~30 ko gzip), stratégie cache (NetworkFirst pour API, CacheFirst pour assets). 3-4j dev. Reporter post-MVP.

---

### §11 — Bibliographie 57 références DOI
**Verdict dev** : VALIDÉ
**Complexité dev** : faible (~2h : 1 composant accordion + data en JSON)
**Cohérence avec existant** : Réutilisable (pattern `<details>` Tailwind ou accordion lucide-react existe).
**Recommandation** :
- **Bloc collapsible en bas de page** (pas page séparée — diluerait jus SEO). Replié par défaut.
- Format : groupé par catégorie (Glucides 12, Hydratation 9, Caféine 5, etc. — déjà structuré dans le brief).
- DOI cliquables : `https://doi.org/{doi}` (target=_blank rel=noopener).
- Stocker dans `nutrition/lib/references.ts` (export `const REFERENCES`) pour réutilisation cross-cartes.
- **Bonus SEO** : `schema.org/MedicalScholarlyArticle` ou `ScholarlyArticle` pour Google Scholar (optionnel, V2).

---

### §12 — Points à valider PM + Dev (Phase 3)
**Verdict dev** : VALIDÉ
**Complexité dev** : N/A (méta)
**Cohérence avec existant** : N/A
**Note dev** :
- §12.2 point 4 (recalcul debounced vs bouton) : **vote bouton Calculer**. Cohérent avec tous les outils existants (`onClick={calculate}`). Évite confusion débutants.
- §12.2 point 5 (localStorage) : OK, clé `nutrition_${type}_inputs_v1`. Préchargement au mount → si pas d'URL params, lire localStorage.
- §12.2 point 9 (i18n) : **à reporter V2 international**. Pas de `react-i18next` aujourd'hui dans `package.json`. Coût migration : ~2-3j si on tente avant.

---

## Risques techniques cachés

1. **GA4 vs Plausible** : le brief mentionne "Plausible events" (§12.1) mais la stack actuelle est GA4 (`gtag` dans `index.html`). **Bloquer pour clarification** : si Romane veut Plausible, c'est une migration GA4→Plausible séparée. Sinon : on tracke via `gtag('event', 'nutrition_calc', { type, premier_mode })`. 30 min dev.

2. **Pages dédiées par chrono ?** Le brief §7 liste "Plan nutrition marathon sub-3h, sub-3h30..." comme **H3 sur la même page** (lecture la plus probable). Si Romane veut **routes séparées** (1 page par chrono pour booster SEO longue traîne) = **21 nouvelles routes** (7 chronos × 3 outils) + prerender + sitemap. **Risque scope x2.** Confirmer brief : H3 only.

3. **Sous-menu Layout cascade niveau 2** : pas de précédent dans `Layout.tsx`. Le pattern dropdown actuel ne supporte pas la cascade. Mobile = 3 niveaux d'imbrication (Menu → Outils → Nutrition → 3 items). Risque accessibilité ARIA + UX cassée tactile. **Mitigation** : afficher les 8 outils en liste plate avec headers visuels ("--- Nutrition ---") ou créer une vraie cascade (3-4h dev). Préfère liste plate.

4. **Wizard mobile interrompu** : si user navigue, perd inputs. **Solution** : autosave localStorage à chaque step transition. Déjà couvert par §10/12 (persistance). À ne pas oublier.

5. **PDF export Safari iOS** : `jsPDF` save() ne déclenche pas toujours le download iOS (popup blocker, Safari behavior). Fallback : ouvrir blob dans `<a target="_blank">`. À tester explicitement iPhone réel.

6. **`<input type="time">` Safari iOS** : input HTML5 time, comportement variable. Préférer 3 `<input type="number">` h/m/s comme pattern existant `MarathonPacePage`.

7. **Bundle gzipé total estimé** :
   - 3 pages-instances : ~3 ko gzip × 3 = ~9 ko
   - `NutritionCalculator` shared chunk : ~12 ko gzip
   - Cartes + warnings + inputs : ~15 ko gzip
   - Contenu SEO (3 fichiers) : ~8 ko gzip
   - Lib formules + premier mode + url state : ~4 ko gzip
   - **Total nouveau code initial : ~48 ko gzip** (au-dessus de l'estimation 20-30 ko brief). jsPDF lazy = +85 ko au clic export uniquement.
   - **Mitigation** : `lazy()` chaque page nutrition individuellement (déjà standard) + lazy import du contenu SEO long (composant `<NutritionSEOContent>` lazy). Réduction possible à ~25 ko gzip initial par page.

8. **Test couverture** : aucun test n'existe sur les outils (juste `periodization.test.ts`). Imposer Vitest unit sur **toutes** les fonctions de `lib/formulas/*` + `premierMode.ts` + `urlState.ts` = ~30-40 tests, ~6h dev. Playwright e2e non installé (devDep manquante) → V2 ou skip et tests manuels.

9. **Mémoire `feedback_pas_de_nutrition_dans_plan`** : §8.4 demande de patcher cette doctrine pour autoriser "mention sans chiffres" dans le plan. À valider Romane AVANT de modifier le prompt Gemini. Bloquant pour livrer §8.3.

10. **Mode "course officielle ravitos = Je ne sais pas"** : §3.3 marathon — par défaut on n'applique pas la déduction. Préciser comportement : afficher message "On a estimé sans ravito officiel — si tu connais ta course, coche Oui pour ajuster". 15 min dev.

11. **Doctrine `feedback_jamais_poids_minceur`** : input "Poids" est nécessaire au calcul. Brief précise "JAMAIS affiché ailleurs". À auditer : **aucun output, message, PDF ne mentionne le poids saisi** (même indirectement type "pour ton poids de 72kg..."). Tests E2E ou checklist QA.

---

## Modifications brief V4 demandées avant pass code

Par priorité :

1. **[CRITIQUE] Clarifier H3 chrono = même page ou routes dédiées** (§7). Recommandation : H3 same page. Sinon scope ×2.
2. **[CRITIQUE] Confirmer GA4 vs Plausible** pour tracking (§12.1). Recommandation : GA4 (existant). Nommer 6-8 events précis (`nutrition_calc_complete`, `nutrition_premier_mode_on`, `nutrition_pdf_export`, `nutrition_url_share`, `nutrition_gut_ack`, `nutrition_recalc`).
3. **[CRITIQUE] Valider §9 implémentation Mode Premier en clamp final** (vs flag dispersé) — décision dev mais impacte structure code.
4. **[IMPORTANT] Définir groupement inputs wizard mobile** (§3 + §10.1) en 3-4 étapes nommées. Recommandation : Profil / Course / Conditions / Calculer.
5. **[IMPORTANT] Carte Pack nutrition §5.1.3** : valider générique (mention type produit, pas marque) ou mention marque (risque pub clandestine).
6. **[IMPORTANT] Préciser §6.3 seuil EAH exact** : 5h00:00 cut hard ou progressif ?
7. **[IMPORTANT] Préciser §4.2 trail** : vitesse moyenne globale (recommandé) ou par segment.
8. **[MOYEN] Décision PDF**: jsPDF lazy (~85 ko au clic) vs `window.print()` CSS (~0 ko, moins joli). Recommandation : print CSS MVP, jsPDF V2.
9. **[MOYEN] §8.3-8.4** : exclure modification générateur plan du MVP nutrition (sprint séparé), valider mémoire `feedback_pas_de_nutrition_dans_plan` à patcher avec Romane.
10. **[MOYEN] Confirmer cap mobile 4 cartes/tabs vs 12 cartes scroll** (§5).

---

## Découpage en sprints proposé

### Sprint 1 — Fondations (3 jours)
- `lib/formulas/*` (10 modules purs) + types
- `lib/profiles/sudationScoring.ts` + `premierMode.ts`
- `lib/urlState.ts`
- Tests unitaires Vitest sur tout `lib/` (~30 tests, couverture 90%+ branches)
- Décisions PM intégrées (clarifications 1-8 ci-dessus)
**Livrable** : moteur de calcul validé scientifiquement, indépendant de l'UI.

### Sprint 2 — Composant shared + 1ère page (Marathon en premier) (4 jours)
- `<NutritionCalculator>` container
- 3 inputs steps (CommonInputs, MarathonInputs, SudationQuestionnaire)
- 5 cartes shared (Synthesis, Timeline, Pack, Safety, FAQ)
- Warnings (GutTrainingGate, PreCoursePost, PremierMode, DisclaimerMedical)
- `NutritionMarathonPage.tsx` + route + ajout Layout sous-menu
- Mobile wizard step-by-step + sticky button
- Contenu SEO marathon (1500-2500 mots + 15 FAQ + ld+json)
- localStorage persist + URL state
**Livrable** : `/outils/nutrition-marathon` complet, déployable.

### Sprint 3 — Trail + Semi (3 jours)
- `NutritionTrailPage.tsx` + `TrailInputsStep` + 3 cartes trail (AidStations, Fatigue, Altitude)
- `NutritionSemiPage.tsx` + contenu SEO semi
- CardWhenToTest + CardMethodology (shared, ajoutées aux 3 pages)
- Bloc bibliographie 57 réfs (collapsible)
- Maillage interne (cross-links 3 outils + ToolsIndexPage maj + footer)
- Prerender routes ajoutées
**Livrable** : 3 outils en ligne.

### Sprint 4 — Polish + QA (1-2 jours)
- PDF export (décision MVP : print CSS minimal)
- Tests cross-browser (Safari iOS, Chrome Android, Firefox)
- Audit doctrine (poids jamais affiché, anti-rigidité affiché en Premier, warnings calibrés)
- GA4 events
- Audit perf Lighthouse (objectif >90 mobile)
- Audit a11y (aria-labels, contraste, navigation clavier)
**Livrable** : MVP prêt prod.

### Sprint 5 V2 (post-traffic, 3-6 mois plus tard)
- PWA installable (manifest enrichi + workbox)
- Service worker offline
- jsPDF si demande user remontée
- Mode "course en cours" timeline temps réel
- i18n EN/ES si SEO international
- Pages dédiées chronos (sub-3h, sub-4h…) si trafic le justifie via Search Console

**Total MVP : 11 jours (sprints 1-4)**. Marge 1 jour : **10-12 jours réalistes**.

---

## Stack technique recommandée

### Composant partagé
- **Design pattern** : Container/Presentational. `<NutritionCalculator>` = container (état + orchestration calculs). Sous-composants cartes + warnings = presentational pures (`React.memo` pour éviter re-renders).
- Props : `config: NutritionConfig` (type, distance, ranges, flags).
- État local : `useState` pour inputs (pas Redux/Zustand, overkill — cohérent existant).
- Pas de Context provider sauf si on découvre prop drilling > 3 niveaux (probable pour `isPremier` traversant warnings + cartes → `NutritionContext` léger acceptable, 30 min).

### Routing
- React Router v6 (existant). 3 routes en `lazy()` ajoutées à `App.tsx` + 3 entrées dans `prerender.mjs` STATIC_ROUTES.
- Pas de routes dynamiques (`/outils/nutrition-marathon/:chrono`) — H3 sur même page.

### PDF
- **MVP** : `@media print` CSS + bouton `window.print()`. 0 ko bundle. Moins joli mais zéro friction.
- **V2 si demande** : `jsPDF` en `await import('jspdf')` dynamique. +85 ko gzip uniquement au clic.
- Rejeter `react-pdf` (700 ko) et `html2canvas` (lourd + qualité variable).

### URL partageable
- `URLSearchParams` natif. Encodage codes courts (1-3 chars/clé). Roundtrip testé en unit.
- Pas de raccourcisseur externe. Pas de backend.

### PWA
- **V2 only**. Aujourd'hui `manifest.json` minimal (à vérifier). Workbox via `vite-plugin-pwa` (~3-4j dev + tests offline).

### SEO indexation 1500-2500 mots
- **Pattern existant suffit** : prerender Puppeteer (`scripts/prerender.mjs`) génère HTML statique au build. Google indexe le HTML complet. Confirmé fonctionnel sur les 5 outils actuels.
- 3 routes nutrition à ajouter dans `STATIC_ROUTES[]` (1 ligne chacune).
- Vérifier que le calculateur affiche un **placeholder propre** quand inputs vides (sinon Puppeteer capture un état vide laid). Recommandation : `<NutritionCalculator>` rend ses cartes en mode "exemple" si pas encore calculé.
- FAQ schema `application/ld+json` dans `<Helmet>` (pattern `MilesKmConverterPage` ligne 69).
- Pas besoin de SSR vrai (Next.js) — surcout migration énorme, pas justifié.

### Tests
- **Unit Vitest** : obligatoire sur `lib/formulas/*` + `premierMode` + `urlState`. ~30 tests minimum. Couverture branches 90%+. Pre-commit hook bienvenu (pas implémenté aujourd'hui, ajouter `.husky/` ou hook simple via `scripts/`).
- **E2E Playwright** : `package.json` n'a pas Playwright. Coût installation : 1 outil + 1 navigateur (~150 Mo download dev). Recommandation : **skip MVP**, tests manuels avec checklist QA documentée. Ajouter en V2 si bug récurrent.
- **Tests doctrine** : checklist QA manuelle (10 items) :
  - [ ] Poids n'apparaît dans aucun output/PDF/message
  - [ ] Mode Premier affiche message anti-rigidité
  - [ ] Mode Premier clamp glucides/sodium/caféine
  - [ ] Warning EAH soft <5h, hard >5h
  - [ ] Disclaimer médical collapsé mobile
  - [ ] FAQ ld+json bien injecté (vérifier `view-source:`)
  - [ ] Prerender capture toutes les cartes
  - [ ] URL partageable roundtrip identité
  - [ ] localStorage restore au reload
  - [ ] Aucune mention marque produit dans pack nutrition

---

## Conclusion

Brief V4 est **mûr et précis** scientifiquement. Aucun blocker structurel. Les 8 ajustements demandés sont des **clarifications de scope/UX**, pas des refontes. Le MVP est livrable en **~11 jours dev** avec un dev senior connaissant déjà la stack.

Le **vrai risque** est le scope mobile (wizard 4 étapes + 12 cartes + 4 warnings + PDF + URL state simultanément) — d'où le découpage en 4 sprints incrémentaux qui permet de **livrer marathon seul d'abord** (sprint 2 = MVP minimum viable), valider auprès d'utilisateurs réels, puis enchaîner trail+semi.

Recommandation finale : **GO** après réponses aux 8 clarifications brief + validation Romane sur GA4 vs Plausible + validation mémoire `feedback_pas_de_nutrition_dans_plan` à patcher.
