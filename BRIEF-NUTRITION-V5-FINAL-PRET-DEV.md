# Brief V5 FINAL — Suite outils Nutrition Course — PRÊT DEV

**Date** : 2026-05-17
**Auteurs** : Romane (PM) + 4 experts (2 nutritionnistes route/trail + coach senior + docteur PhD nutrition sport) + PM senior + dev équipe + UX designer mobile-first
**Statut** : 🟢 READY FOR DEV (Marathon MVP en Sprint 1+2, livrable J+6/7)
**Sprints** : 4 sprints, 10-12 jours dev total
**Doctrine intacte** : sécurité > conversion · course-only · pas de poids/IMC/minceur dans aucun output user (PDF compris) · pas de cross-training · pas de contact direct client · scope strict en course pendant l'effort
**Mémoires références** :
- `feedback_outil_nutrition_chiffres_ok_hors_plan` (créée 2026-05-17) — autorise chiffres dans l'outil
- `feedback_pas_de_nutrition_dans_plan` (mise à jour 2026-05-17) — exception "mention sans chiffres" + frontière outil/plan
- `project_coach_running_ia_outil_nutrition` (mise à jour 2026-05-17) — pointeur vers ce brief
- `feedback_jamais_poids_minceur` · `feedback_securite_avant_conversion` · `feedback_jamais_contact_client` (non impactées, à respecter)

**Source de vérité scientifique** : voir V4 §11 (57 références DOI). Non recopié ici.
**Source de vérité contenu/formules détaillées** : `BRIEF-NUTRITION-V4-FINAL.md` (926 L). Ce V5 = surcouche d'exécution + wireframe + spec dev.

---

## 0. CHANGEMENTS V4 → V5 (récap)

### 0.1 Décisions Romane tranchées (11)

| # | Décision | Effet sur V5 |
|---|---|---|
| 1 | H3 chrono = même page (pas routes dédiées) | §7 : H3 sub-3h…sub-6h dans `/outils/nutrition-marathon`. Économie scope ×2 (21 routes évitées). |
| 2 | Analytics = **GA4** (`G-P0641L8TPT`), pas Plausible | §12 : 10 events `gtag('event', …)`. Aligné stack `index.html`. |
| 3 | Mode Premier = pré-coché + non décochable si Niveau=Débutant | §3 + §9 : UI lock obligatoire (`disabled + checked + tooltip`). |
| 4 | Email capture = reporté V1.5 | Hors MVP. |
| 5 | Périmètre MVP V1 = **Marathon uniquement** | Trail + Semi décalés Sprint 3 / V1.5 après validation users réels. |
| 6 | PDF = `window.print()` + CSS print pour MVP | §10 : 0 ko bundle. jsPDF lazy reporté V1.5. |
| 7 | URL partage = V1.5 | Hors MVP. localStorage seul pour persistance V1. |
| 8 | PWA offline = V2 | Hors MVP/V1.5. |
| 9 | Cycle menstruel input = conditionnel `Sexe=F` obligatoire | §3 : caché si Sexe=H/Préfère pas dire. Évite bug perception. |
| 10 | Disclaimer pathologies = accordéon replié par défaut | §6 : `<details>` Tailwind, label clair. |
| 11 | CTA "Créer mon plan" = uniquement en post-synthèse | §8 : SUPPRIMER bandeau haut, garder uniquement carte §5.5 + FAQ. |

### 0.2 Ajustements PM intégrés (7 P1)

| # | Item PM | Action V5 |
|---|---|---|
| PM-1 | Cycle menstruel conditionnel Sexe=F | Cf. décision Romane #9. Intégré §3.1 + §6.7. |
| PM-2 | Mode Premier UI lock débutant | Cf. décision Romane #3. Intégré §3.1 + §9.1. |
| PM-3 | Disclaimer médical accordéon | Cf. décision Romane #10. Intégré §6.5. |
| PM-4 | CTA "Créer mon plan" post-synthèse uniquement | Cf. décision Romane #11. Intégré §8. |
| PM-5 | PDF MVP = print CSS | Cf. décision Romane #6. Intégré §10. |
| PM-6 | Wireframe mobile 4 écrans défini | **Nouveau §8 wireframe** ci-dessous. |
| PM-7 | Mémoire `feedback_outil_nutrition_chiffres_ok_hors_plan` créée | À acter Romane avant ouverture ticket — déjà mémorisée 2026-05-17. |

### 0.3 Ajustements dev intégrés (8)

| # | Item dev | Action V5 |
|---|---|---|
| DEV-1 | H3 chrono = même page | Cf. décision Romane #1. Aucun ajout route. |
| DEV-2 | GA4 confirmé, 10 events nommés | §12 nouvelle section. |
| DEV-3 | Mode Premier = clamp final unique (`applyPremierClamps`) | §10 spec dev — pattern container/orchestrator. |
| DEV-4 | Wizard mobile 4 étapes nommées | §8 wireframe. |
| DEV-5 | Pack nutrition = mention générique (pas marque) | §5 carte 3 reformulée. |
| DEV-6 | Seuil EAH = cut hard à 5h00:00 (`durationSec >= 18000`) | §6.3 testé unitaire. |
| DEV-7 | Vitesse Minetti = moyenne globale (`distance / durée_visée`) | §4.2 formule clarifiée. |
| DEV-8 | Modification générateur plan (§8.3 V4) = sprint séparé hors MVP | Reportée. Welcome message plan = Sprint 5 ou ticket dédié, **PAS dans MVP nutrition**. |

### 0.4 11 risques techniques dev (mitigations)

| # | Risque | Mitigation V5 |
|---|---|---|
| R1 | GA4 vs Plausible | Tranché GA4 (décision #2). |
| R2 | Routes dédiées par chrono | Tranché H3 same page (décision #1). |
| R3 | Sous-menu cascade Layout | Liste plate avec headers visuels "── Nutrition ──" (§10 spec). |
| R4 | Wizard interrompu = perte inputs | Autosave localStorage à chaque step transition. |
| R5 | PDF Safari iOS | `window.print()` MVP = pas concerné. |
| R6 | `<input type="time">` Safari iOS | 3 inputs `number` h/m/s (pattern `MarathonPacePage`). |
| R7 | Bundle gzipé total ~48 ko | `lazy()` chaque page + lazy contenu SEO long. Cible <30 ko initial/page. |
| R8 | Couverture tests | Vitest unit obligatoire sur `lib/formulas/*` + `premierMode` + `urlState` (~30 tests). Playwright skip V1. |
| R9 | Doctrine `feedback_pas_de_nutrition_dans_plan` à patcher | Acté 2026-05-17 (mémoire mise à jour). |
| R10 | "Course ravitos = Je ne sais pas" | Défaut = sans déduction + message UI "coche Oui si tu sais". |
| R11 | Poids jamais dans output | Checklist QA §13 (10 items). Test unitaire `no_weight_in_output.test.ts`. |

---

## 1. PÉRIMÈTRE MVP V1 (Marathon uniquement)

### 1.1 Inclus MVP V1 (Sprint 1+2+4 = ~7-8 j dev)

- **1 page** : `/outils/nutrition-marathon` complète.
- **1 composant shared** : `<NutritionCalculator config={configMarathon} />` (architecture multi-outil prête, mais utilisée par 1 instance).
- 10-12 inputs (cf. §3) en **wizard mobile 4 écrans** + tout-en-un desktop.
- 5 cartes résultat (Synthèse / Timeline / Pack / Sécurité accordéon / FAQ) + 2 cartes cross-promo (Quand tester + Méthodologie).
- Warnings hiérarchisés : gut training gate (top, ack persistant 30j localStorage), pré/post (top), Mode Premier message anti-rigidité, EAH dosé selon durée, disclaimer médical accordéon.
- Mode Premier auto si Niveau=Débutant (UI lock), toggle manuel sinon. Clamp final unique (`applyPremierClamps`).
- Mini-questionnaire scoré sudation (5 questions binaires).
- SEO 1500-2500 mots + 15 FAQ + `application/ld+json` FAQ.
- localStorage persist inputs (clé `nutrition_marathon_inputs_v1`).
- `window.print()` + `@media print` CSS pour export résumé.
- GA4 events (10 events listés §12).
- Vitest unit ~30 tests sur formules + Premier mode + checklist doctrine.
- Bibliographie 57 réfs en accordion replié bas de page.

### 1.2 Décalé V1.5 (Sprint 3 + Sprint 5)

- Pages Trail (`/outils/nutrition-trail`) + Semi (`/outils/nutrition-semi-marathon`) avec inputs spécifiques (D+/D-/altitude/acclimaté/bases vie / mouth rinse).
- jsPDF lazy A5 design custom (vs print CSS) si demande utilisateur remontée.
- URL partageable query string (sérialisation 10-12 inputs, lib `urlState.ts`).
- Email capture optionnel post-synthèse (à arbitrer Romane, touche `feedback_jamais_contact_client`).
- Cross-sell renforcé selon analytics V1.
- Welcome message plan + advice fin de plan (§8.3 V4) = ticket séparé (modif générateur Gemini, hors scope nutrition).

### 1.3 Décalé V2 (3-6 mois post-V1, selon traffic)

- PWA installable + mode offline jour J (workbox).
- Mode "course en cours" timeline scrollable temps réel.
- Outils Ultra-Trail (>100km) et 10km séparés.
- Outils nutrition pré-course (carb-loading) et post-course (récup).
- i18n EN/ES.
- Pages dédiées chronos (sub-3h, sub-4h…) si Search Console le justifie.

---

## 2. ARCHITECTURE TECHNIQUE (depuis V4, précisée dev)

### 2.1 Stack confirmée

- React 18 + Vite 5 + TypeScript + Tailwind, React Router v6 BrowserRouter.
- SEO : prerender Puppeteer post-build (`scripts/prerender.mjs`).
- Analytics : **GA4** (`G-P0641L8TPT` déjà dans `index.html`).
- Tests : Vitest (déjà installé). Pas de Playwright (skip V1).
- Lazy loading routes outils (pattern existant `App.tsx`).
- Pas de Redux/Zustand : `useState` local + `useContext` léger si prop drilling > 3 niveaux.

### 2.2 Arborescence fichiers à créer (Sprint 1+2 MVP)

```
src/
├── components/
│   └── tools/
│       └── nutrition/
│           ├── NutritionMarathonPage.tsx              [MVP, ~3-5 ko]
│           ├── NutritionTrailPage.tsx                 [V1.5]
│           ├── NutritionSemiPage.tsx                  [V1.5]
│           ├── shared/
│           │   ├── NutritionCalculator.tsx           [MVP, container ~250-400 L]
│           │   ├── NutritionContext.tsx              [MVP, isPremier + inputs cross-cutting]
│           │   ├── inputs/
│           │   │   ├── InputsWizardMobile.tsx        [MVP, 4 écrans + progress bar]
│           │   │   ├── InputsAllInOneDesktop.tsx     [MVP, ≥768px]
│           │   │   ├── Step1Profil.tsx               [MVP]
│           │   │   ├── Step2Course.tsx               [MVP]
│           │   │   ├── Step3Affinages.tsx            [MVP]
│           │   │   ├── Step4Resultats.tsx            [MVP, render des 5 cartes]
│           │   │   ├── SudationQuestionnaire.tsx     [MVP, modal 5 questions]
│           │   │   ├── ChronoInput.tsx               [MVP, 3 inputs h/m/s — pattern MarathonPacePage]
│           │   │   └── inputValidation.ts            [MVP, règles soft §6.8]
│           │   ├── results/
│           │   │   ├── CardSynthesis.tsx             [MVP]
│           │   │   ├── CardTimeline.tsx              [MVP, zone rouge H-30 → H-0]
│           │   │   ├── CardPack.tsx                  [MVP, mention générique]
│           │   │   ├── CardSafety.tsx                [MVP, EAH dosé + cycle + accordéon disclaimer]
│           │   │   ├── CardFAQ.tsx                   [MVP, 15 Q + ld+json]
│           │   │   ├── CardWhenToTest.tsx            [MVP, CTA "Créer mon plan"]
│           │   │   └── CardMethodology.tsx           [MVP]
│           │   ├── warnings/
│           │   │   ├── WarningGutTrainingGate.tsx    [MVP, ack persist 30j]
│           │   │   ├── WarningPreCoursePost.tsx      [MVP, top]
│           │   │   ├── PremierModeMessage.tsx        [MVP, anti-rigidité]
│           │   │   ├── DisclaimerMedical.tsx         [MVP, accordéon replié]
│           │   │   └── SafetyOrchestrator.tsx        [MVP, décide qui afficher]
│           │   ├── print/
│           │   │   └── printStyles.css               [MVP, @media print]
│           │   └── share/
│           │       └── ShareUrlButton.tsx            [V1.5, lazy URL params]
│           ├── lib/
│           │   ├── formulas/
│           │   │   ├── energy.ts                     [MVP, §4.1+4.2]
│           │   │   ├── carbs.ts                      [MVP, §4.3 + tables export]
│           │   │   ├── hydration.ts                  [MVP, §4.4 + ajustements]
│           │   │   ├── sodium.ts                     [MVP, §4.5]
│           │   │   ├── caffeine.ts                   [MVP, §4.6]
│           │   │   ├── proteins.ts                   [V1.5 trail only]
│           │   │   ├── ratios.ts                     [MVP, G:F 2:1 vs 1:0.8]
│           │   │   ├── mouthRinse.ts                 [V1.5 semi only]
│           │   │   └── aidStations.ts                [MVP, déduction ravitos officiels]
│           │   ├── profiles/
│           │   │   ├── sudationScoring.ts            [MVP, 5 questions scorées]
│           │   │   └── premierMode.ts                [MVP, applyPremierClamps()]
│           │   ├── types.ts                          [MVP, NutritionInputs/Result/Config]
│           │   ├── urlState.ts                       [V1.5]
│           │   ├── localState.ts                     [MVP, localStorage helpers]
│           │   ├── analytics.ts                      [MVP, wrapper GA4 events]
│           │   ├── references.ts                     [MVP, 57 réfs DOI export const]
│           │   └── __tests__/
│           │       ├── energy.test.ts                [MVP]
│           │       ├── carbs.test.ts                 [MVP]
│           │       ├── hydration.test.ts             [MVP]
│           │       ├── sodium.test.ts                [MVP]
│           │       ├── caffeine.test.ts              [MVP]
│           │       ├── premierMode.test.ts           [MVP, 6+ tests]
│           │       ├── sudationScoring.test.ts       [MVP]
│           │       ├── aidStations.test.ts           [MVP]
│           │       └── no_weight_in_output.test.ts   [MVP, doctrine — scan résultats/PDF/messages]
│           └── content/
│               ├── marathonContent.tsx               [MVP, 1500-2500 mots + 15 FAQ]
│               ├── trailContent.tsx                  [V1.5]
│               └── semiContent.tsx                   [V1.5]
└── App.tsx                                            [MODIFIER : +1 route MVP, +2 routes V1.5]
scripts/prerender.mjs                                  [MODIFIER : +1 route STATIC_ROUTES MVP]
src/components/Layout.tsx                              [MODIFIER : toolsLinks[] +1 MVP, +2 V1.5, headers visuels]
```

### 2.3 Modifications fichiers existants

#### `src/App.tsx` (Sprint 2 — MVP)

```tsx
// Ajout après ligne 51
const NutritionMarathonPage = lazy(() => import('./components/tools/nutrition/NutritionMarathonPage'));
// V1.5 :
// const NutritionTrailPage = lazy(() => import('./components/tools/nutrition/NutritionTrailPage'));
// const NutritionSemiPage = lazy(() => import('./components/tools/nutrition/NutritionSemiPage'));

// Ajout après ligne 248 dans <Routes>
<Route path="/outils/nutrition-marathon" element={<NutritionMarathonPage />} />
// V1.5 :
// <Route path="/outils/nutrition-trail" element={<NutritionTrailPage />} />
// <Route path="/outils/nutrition-semi-marathon" element={<NutritionSemiPage />} />
```

#### `src/components/Layout.tsx` (Sprint 2 — MVP)

```tsx
// Remplacer toolsLinks[] ligne 10 par :
const toolsLinks = [
  { name: "Convertisseur Allure", path: "/outils/convertisseur-allure", desc: "min/km ↔ km/h" },
  { name: "Calculateur VMA", path: "/outils/calculateur-vma", desc: "Estimez votre VMA" },
  { name: "Prédicteur Temps", path: "/outils/predicteur-temps", desc: "5km → Marathon" },
  { name: "Allure Marathon", path: "/outils/allure-marathon", desc: "Objectif → Pace" },
  { name: "Convertisseur Miles/Km", path: "/outils/convertisseur-miles-km", desc: "Miles ↔ Kilomètres" },
  // ── header visuel non cliquable (header: true) ──
  { name: "Nutrition Course", isHeader: true },
  { name: "Nutrition Marathon", path: "/outils/nutrition-marathon", desc: "Glucides, eau, sodium personnalisés" },
  // V1.5 :
  // { name: "Nutrition Trail", path: "/outils/nutrition-trail", desc: "Stratégie trail/ultra" },
  // { name: "Nutrition Semi-Marathon", path: "/outils/nutrition-semi-marathon", desc: "Faut-il manger ?" },
];
// Dans le rendu dropdown (l. 137 + l. 254) : si tool.isHeader → render <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-200 mt-1 pt-2">── {tool.name} ──</div>
```

**Justification dev** : pas de vraie cascade niveau 2 (UX cassée mobile + ARIA complexe). Liste plate avec header visuel "── Nutrition Course ──" = aussi clair, 1h dev vs 4h cascade.

#### `scripts/prerender.mjs` (Sprint 2 — MVP)

```js
// Ajout dans STATIC_ROUTES (l. 22-40) après ligne 40
'/outils/nutrition-marathon',
// V1.5 :
// '/outils/nutrition-trail',
// '/outils/nutrition-semi-marathon',
```

**Risque dev (R7)** : prerender capture l'état avant clic "Calculer". Mitigation : `<NutritionCalculator>` rend ses cartes en mode "exemple" (chrono 4h par défaut) si pas encore calculé. Sinon Puppeteer capture HTML vide = no SEO.

### 2.4 Configs TypeScript (3 outils — preset pour V1.5)

```ts
// src/components/tools/nutrition/lib/types.ts
export type NutritionType = 'marathon' | 'trail' | 'semi';

export interface NutritionConfig {
  type: NutritionType;
  distanceFixed?: number;            // marathon 42.2 / semi 21.1
  distanceEditable: boolean;          // trail true
  distanceRange?: [number, number];   // trail [5, 300]
  showDPlus: boolean;
  showDMinus: boolean;
  dPlusRange?: [number, number];      // trail [0, 15000]
  durationRangeHours: [number, number];
  showCarbLoading: false;             // jamais — outil pré-course = V2
  showRecovery: false;                // jamais — outil post-course = V2
  warningPreCourseAfterTop: true;
  warningGutTrainingTop: true;
  premierModeAvailable: true;
  showMouthRinse: boolean;            // semi+marathon courts
  showAidStations: boolean;           // marathon+semi (ravitos officiels)
  showProteins: boolean;              // trail >4h
  showAltitude: boolean;              // trail
  showCycleMenstruel: boolean;        // tous, conditionnel sexe=F
  pdfPrintEnabled: boolean;           // MVP : true (window.print)
  shareableUrlEnabled: boolean;       // MVP : false, V1.5 : true
  H1: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
}

// ──── Config Marathon (MVP) ────
export const CONFIG_MARATHON: NutritionConfig = {
  type: 'marathon',
  distanceFixed: 42.2,
  distanceEditable: false,
  showDPlus: false,
  showDMinus: false,
  durationRangeHours: [2, 6.5],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfterTop: true,
  warningGutTrainingTop: true,
  premierModeAvailable: true,
  showMouthRinse: false,
  showAidStations: true,
  showProteins: false,
  showAltitude: false,
  showCycleMenstruel: true,
  pdfPrintEnabled: true,
  shareableUrlEnabled: false,        // V1.5
  H1: "Calculateur Nutrition Marathon — Glucides, eau et sel personnalisés",
  metaTitle: "Calculateur Nutrition Marathon | Stratégie en course | Coach Running IA",
  metaDescription: "Calcule ta stratégie nutritive marathon (glucides, eau, sodium, caféine) selon ton chrono, météo et profil. 57 références scientifiques. Mobile-first.",
  ogImage: "/og-nutrition-marathon.jpg",
};

// ──── Config Trail (V1.5) ────
export const CONFIG_TRAIL: NutritionConfig = {
  type: 'trail',
  distanceEditable: true,
  distanceRange: [5, 300],
  showDPlus: true,
  showDMinus: true,
  dPlusRange: [0, 15000],
  durationRangeHours: [1, 30],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfterTop: true,
  warningGutTrainingTop: true,
  premierModeAvailable: true,
  showMouthRinse: false,
  showAidStations: false,
  showProteins: true,
  showAltitude: true,
  showCycleMenstruel: true,
  pdfPrintEnabled: true,
  shareableUrlEnabled: true,
  H1: "Calculateur Nutrition Trail — Aide à ta stratégie pendant la course",
  metaTitle: "Calculateur Nutrition Trail | Aide stratégie en course | Coach Running IA",
  metaDescription: "Calcule tes apports théoriques en course (glucides, eau, sodium, caféine) selon distance, D+, météo et profil. Aide à la stratégie nutritive trail.",
  ogImage: "/og-nutrition-trail.jpg",
};

// ──── Config Semi (V1.5) ────
export const CONFIG_SEMI: NutritionConfig = {
  type: 'semi',
  distanceFixed: 21.1,
  distanceEditable: false,
  showDPlus: false,
  showDMinus: false,
  durationRangeHours: [1, 3.5],
  showCarbLoading: false,
  showRecovery: false,
  warningPreCourseAfterTop: true,
  warningGutTrainingTop: true,
  premierModeAvailable: true,
  showMouthRinse: true,
  showAidStations: true,
  showProteins: false,
  showAltitude: false,
  showCycleMenstruel: true,
  pdfPrintEnabled: true,
  shareableUrlEnabled: true,
  H1: "Calculateur Nutrition Semi-Marathon — Honnête, précis, adapté à ton chrono",
  metaTitle: "Calculateur Nutrition Semi | Faut-il manger ? | Coach Running IA",
  metaDescription: "Calcule ta nutrition semi-marathon : gels, hydratation, sodium selon ton chrono. Mouth rinse sub-1h15. 57 références.",
  ogImage: "/og-nutrition-semi.jpg",
};
```

---

## 3. INPUTS (depuis V4, conditionnels affinés)

### 3.1 Inputs MVP Marathon (12 max)

| # | Input | Type | Required | Conditionnel | Validation | Notes V5 |
|---|---|---|---|---|---|---|
| 1 | Sexe | radio (H/F/Préfère pas dire) | Oui | — | — | Déclenche §3.1.cycle si F |
| 2 | Poids | number (kg) | Oui | — | 40-150 | **JAMAIS affiché en output, PDF, message (R11)**. localStorage + URL (V1.5) uniquement. |
| 3 | Niveau | select (Débutant/Régulier/Confirmé/Expert) | Oui | — | — | Si Débutant → Mode Premier auto-coché + non-décochable (PM-2) |
| 4 | Mode Premier marathon | toggle (Oui/Non) | Oui | — | `disabled={niveau==='Débutant'} checked={niveau==='Débutant'||userToggle}` | UI lock obligatoire débutant + tooltip "Activé automatiquement, recommandé pour ton premier marathon" |
| 5 | Chrono visé | 3 inputs number (h/m/s) | Oui | — | total 2h-6h30 | Pattern `MarathonPacePage` (`parseTimeToSeconds`). PAS `<input type="time">` (Safari iOS R6). |
| 6 | Météo prévue départ | select (Frais <10°C / Standard 10-20°C / Chaud 20-25°C / Très chaud >25°C) | Oui | — | — | UX simple |
| 7 | Température exacte | number (°C) | Non | si météo "Très chaud" → required | -10 à 45 | Précision optionnelle |
| 8 | Hygrométrie | select (Sec <40% / Standard 40-70% / Humide >70%) | Oui | — | — | +15% sudation si humide |
| 9 | Expérience nutrition course | select (Jamais / Occasionnel / Habitué) | Oui | — | — | Caps : Jamais=60 g/h, Occ=80, Hab=plage complète |
| 10 | Course officielle avec ravitos iso ? | select (Oui / Non / Je ne sais pas) | Non | — | défaut = "Non" | Si "Je ne sais pas" → afficher conseil UI (R10). Si "Oui" → déduit 60-72 g §4.10. |
| 11 | Profil sudation | select (Faible/Modéré/Élevé/Salty sweater confirmé/Je ne sais pas) | Oui | — | — | "Je ne sais pas" → ouvre modal questionnaire 5Q (§3.5 V4) |
| 12 | Habitude caféine quotidienne | select (Aucune / 1-2 cafés/j / 3+ cafés/j) | Oui | — | — | Dose pré-course adaptée |
| 13 | Phase cycle menstruel | select (Préfère pas dire / Folliculaire J1-J14 / Lutéale J15-J28) | Non | **`if sexe==='F'`** | — | Décision Romane #9. Caché sinon. Si Lutéale → message sodium vigilance (§6.7). |

### 3.2 Inputs spécifiques V1.5

- **Trail** (Sprint 3) : distance (km, 5-300), D+ (m, 0-15000), D- (m, défaut=D+), altitude moyenne (5 paliers), acclimaté (toggle si alt>1500m), bases de vie (count), heure départ.
- **Semi** (Sprint 3) : identique commun + ravitos officiels.

### 3.3 Validation logique inputs (§6.8 V4 — soft, non bloquant)

Règles hard-codées dans `lib/inputs/inputValidation.ts`. Pas de ML. Pas de blocage.

```ts
// Exemples règles (à compléter en Sprint 1)
function validateInputs(i: NutritionInputs): SoftWarning[] {
  const warnings: SoftWarning[] = [];
  // Règle 1 : 60kg + sub-2h + sudation Faible + 30°C = incohérent
  if (i.poids < 65 && i.chronoSec < 2*3600 && i.sudation === 'faible' && i.temperatureC > 28) {
    warnings.push({ field: 'sudation', msg: 'Sub-2h à 30°C avec sudation Faible : vérifie tes saisies.' });
  }
  // Règle 2 : Chrono sub-2h30 + Niveau Débutant = très improbable
  if (i.chronoSec < 2.5*3600 && i.niveau === 'Débutant') {
    warnings.push({ field: 'niveau', msg: 'Sub-2h30 + Débutant : combinaison inhabituelle, vérifie tes saisies.' });
  }
  // Règle 3 : Premier marathon + Habitude nutrition "Habitué" + viser 100 g/h
  if (i.premierMode && i.experienceNutrition === 'habitué' && /* cible glucides */ > 80) {
    warnings.push({ field: 'experienceNutrition', msg: 'Premier marathon : reste sur la fourchette basse, même si tu es habitué aux gels.' });
  }
  return warnings;
}
```

Affichage : icône `info` orange à côté du champ, pas de blocage du calcul. Respect `feedback_compromis_messages_preventifs`.

---

## 4. FORMULES (depuis V4, références)

**Voir V4 §4.1 à §4.10 — formules complètes et 57 réfs DOI**. Précisions dev V5 :

| Sous-section V4 | Précision V5 dev |
|---|---|
| §4.1 Distance équiv. trail | `Deq = distance + (DPlus/100) + (DMinus/400)`. V1.5. |
| §4.2 Énergie | **DEV-7** : `vitesse = distance / durée_visée` (moyenne globale, pas segments). Trail : clamp coeff grimpée à `0.011 kcal/m/kg` (Minetti 2002). Marathon : `kcal/h = poids × vitesse × 0.95`. |
| §4.3 Glucides | Tables `const TABLE_MARATHON_BY_CHRONO`, `TABLE_TRAIL_BY_DURATION`, `TABLE_SEMI_BY_CHRONO` exportées de `carbs.ts`. Renvoie `{ min, max, target, sources }`. Caps expérience appliqués AVANT Premier clamp. |
| §4.4 Hydratation | Matrice 4×4 en `const TABLE_HYDRATION[sudation][temp]`. Cap 1000 mL/h. Ajustements humidité/altitude appliqués séquentiellement. |
| §4.5 Sodium | Table par profil sudation. Si Premier → max 1300 mg/L. |
| §4.6 Caféine | Calcul `dose_mg = poids × dose_mg_per_kg`. Si Premier → max 3 mg/kg + boost final désactivé (PM-P2 #11). Plafond 24h : 6 mg/kg cumulés (test à écrire). |
| §4.7 Protéines | V1.5 trail only. |
| §4.8 Ratio G:F | Si `target > 90 g/h` → message "privilégie 1:0.8" dans CardPack. |
| §4.9 Mouth rinse | V1.5 semi only. |
| §4.10 Déduction ravitos | Si user coche Oui → `targetGels = (totalCarbsNeeded - 66) / 25`. Affiché dans CardSynthesis. |

**Format output unifié** :
```ts
// lib/types.ts
export interface RangeValue {
  value: number;        // cible
  min: number;
  max: number;
  unit: string;         // "g/h", "mL/h", "mg/L", "mg"
  source: string;       // ex : "ACSM/AND 2016"
}
export interface NutritionResult {
  durationSec: number;
  kcalPerHour: RangeValue;
  carbsPerHour: RangeValue;
  hydrationPerHour: RangeValue;
  sodiumPerLiter: RangeValue;
  caffeinePreRace: RangeValue;
  caffeineInRace?: RangeValue;
  caffeineBoostFinal?: RangeValue;
  aidStationDeduction?: { gobelets: number; carbsGrams: number };
  softWarnings: SoftWarning[];
  premierModeActive: boolean;
  // ⚠️ AUCUN champ "poids" ni dérivé direct du poids visible
}
```

---

## 5. CARTES RÉSULTAT (depuis V4, accordéon disclaimer + CTA post-synthèse)

### 5.1 Cartes communes MVP (5)

1. **CardSynthesis** — récap totaux (kcal, g glucides, mL eau, mg sodium, mg caféine), déduction ravitos si applicable, **message anti-rigidité en pied** (§5.1.1 V4), message Mode Premier en tête si actif (§9.3 V4). **Aucune mention poids**.

2. **CardTimeline** — ligne temps visuelle (gel 25min, boisson 20min, sodium 30min). **Zone ROUGE H-30 → H-0** (anti-hypoglycémie réactionnelle). Sur mobile : 1ère heure détaillée + résumé "puis idem" + collapse "voir tout" (R-DEV-CARTE).

3. **CardPack** — exemples concrets **GÉNÉRIQUES** (DEV-5) : `"6 gels de 25g glucides (type maltodextrine, ratio 2:1 ou 1:0.8)"`, `"2 bidons 500mL d'isotonique 60-80 g/L"`, `"3 caps sel 500mg"`. **Pas de marque** (Maurten, SiS, Decathlon) pour éviter pub clandestine + maj formulation cassée.

4. **CardSafety** — accordéon multi-section :
   - Hyponatrémie (formulation soft <5h / appuyée ≥5h — DEV-6, §6.3 V4)
   - Hypoglycémie réactionnelle
   - Troubles digestifs (renvoi gut training)
   - Test pesée pré/post SL
   - Conditions extrêmes (>30°C + acclimatation)
   - Cycle menstruel (affiché uniquement si Sexe=F)
   - **DisclaimerMedical = accordéon REPLIÉ par défaut** (Romane #10) avec label `"⚠️ Cet outil ne s'applique pas si tu as une condition médicale (cliquer pour voir la liste)"`. 10+ pathologies §6.5 V4.

5. **CardFAQ** — 15 Q tabulées + `<script type="application/ld+json">` schema.org/FAQPage (pattern `MilesKmConverterPage.tsx` ligne 69-106). H3 par chrono (sub-3h…sub-6h) inclus en H3 dans cette carte ou cartes parallèles SEO.

### 5.2 Cartes cross-promo MVP (2)

6. **CardWhenToTest** (§5.5 V4) — gut training durée selon cible + protocole + CTA **principal** `"→ Génère ton plan gratuit en 2 min"` lien vers `/questionnaire` **PRÉ-REMPLI** (sexe, poids, niveau, chrono passés en URL params au générateur, cf. PM-recommendation #8). **C'est le seul placement CTA "Créer mon plan"** (décision Romane #11 + PM-P1 #4).

7. **CardMethodology** (§5.6 V4) — transparence : consensus 2024, limites épistémiques ±15-25%, gold standard test individuel.

### 5.3 Cartes V1.5 Trail (3 additionnelles)

8. CardAidStations (bases de vie courte/moyenne/longue).
9. CardFatigue (lassitude gustative + plan B protocole 4 étapes).
10. CardAltitude (aigu vs acclimaté).

### 5.4 Carte V1.5 Semi (1 additionnelle)

11. CardSemiManger ("Faut-il vraiment manger ?" réponse selon chrono + mouth rinse protocole Chambers 2009).

### 5.5 Affichage cartes mobile (R-DEV-CARTE)

12 cartes scrollables = page ~10000px = catastrophe UX. **Mobile (<768px)** : **tabs/accordéons** en 4 sections : `Plan` (Synthesis+Pack), `Timeline`, `Sécurité` (Safety+Methodology), `Aller plus loin` (WhenToTest+FAQ). **Desktop (≥768px)** : scroll complet 7 cartes côte à côte (grid 2 col).

---

## 6. WARNINGS DOSÉS (EAH dosé contexte/ultra, ranges hydratation OK)

Repris de V4 §6 + précisions V5 :

| # | Warning | Affichage | Doctrine |
|---|---|---|---|
| 6.1 | **Pré/post course** (haut page, encadré coloré) | Toujours, top page | `feedback_securite_avant_conversion` |
| 6.2 | **Gut training gate** (top page, bouton "Compris") | Si `!localStorage.getItem('nutrition_gut_ack_v1') OR ack > 30j` | Friction utile, non bypass |
| 6.3 | **Mode Premier message** (en tête CardSynthesis si actif) | `if premierMode` | Anti-rigidité, anti-TCA soft |
| 6.4 | **EAH dosé** (CardSafety) | Si `durationSec < 5*3600` → ton soft + signes basiques. Si `durationSec >= 5*3600` → ton appuyé (signes gonflement doigts, nausées, confusion). **DEV-6** : cut hard exactement à 18000 sec. Test unitaire frontière 17999/18000/18001. | Sécurité ultra réelle |
| 6.5 | **Disclaimer médical** (CardSafety) | Accordéon **replié par défaut**. Label clair. | Décision Romane #10 + PM-P1 #3 |
| 6.6 | **Estimation ±15-25%** | Pied CardSynthesis | Transparence |
| 6.7 | **Cycle menstruel** | `if sexe==='F'`. Si Lutéale → message vigilance sodium en surbrillance. | Décision Romane #9 |
| 6.8 | **Validation logique soft** | Inline icône info à côté champ. **Pas de blocage.** | `feedback_compromis_messages_preventifs` |

**Mode Premier — désactivations** (centralisé dans `SafetyOrchestrator.tsx`) :
- Désactive warning EAH hard si chrono <5h (rare en Premier)
- Désactive mention sodium "salty sweater extrême"
- Boost final caféine désactivé (PM-P2 #11)
- Plafond caféine 3 mg/kg max

---

## 7. SEO (1500-2500 mots, H3 chrono = même page, FAQ schema)

### 7.1 Page Marathon MVP — `/outils/nutrition-marathon`

- **KW principaux** (8) : nutrition marathon (390), marathon nutrition (110), plan nutrition marathon (90), gels marathon (70), hydratation marathon (60), caféine marathon (50), mur du 30e km (40), boisson isotonique marathon (30).
- **KW longue traîne** (17) : voir V4 §7.2.
- **H2** (10 sections) : voir V4 §7.2 (intro / comment ça marche / glucides chrono / hydratation matrice / sodium / caféine / plans par chrono / mur 30km / gut training / FAQ).
- **H3 chrono = MÊME PAGE** (DEV-1) : `sub-3h / sub-3h30 / sub-4h / sub-4h30 / sub-5h / sub-5h30 / sub-6h` (7 H3 dans H2 "Plans nutrition par chrono").
- **FAQ schema** `application/ld+json` (pattern `MilesKmConverterPage.tsx` ligne 69-106). 15 Q.

### 7.2 Pages V1.5

- Trail : V4 §7.1 (8 KW + 20 longue traîne + 15 FAQ).
- Semi : V4 §7.3 (5 KW + 14 longue traîne + 12 FAQ + mini-FAQ Hyrox).

### 7.3 Indexation

- **Prerender Puppeteer suffit** (DEV-stack). Ajouter routes dans `scripts/prerender.mjs > STATIC_ROUTES[]`.
- Mode "exemple" `<NutritionCalculator>` rend cartes pré-remplies (chrono 4h défaut marathon) si pas encore calculé → Puppeteer capture HTML complet (R7 mitigation).
- `<Helmet>` standard : `<title>`, `<meta name="description">`, `<link rel="canonical">`, OG + Twitter cards, `application/ld+json` FAQ.

---

## 8. WIREFRAME MOBILE 4 ÉCRANS — Marathon (NOUVEAU)

**Contexte UX** : viewport iPhone SE (320×568) → Pro Max (430×932). Wizard step-by-step obligatoire (PM-P1 #6 + DEV-4). Desktop (≥768px) = tout-en-un 3 colonnes (pas de wizard).

**Pattern global** : header sticky (logo + progress 1/4 → 4/4) · contenu scrollable · sticky button bas (`fixed bottom-0` + `safe-area-inset-bottom` iPhone notch).

**Autosave localStorage à chaque transition d'écran** (R4) : clé `nutrition_marathon_step_v1` + `nutrition_marathon_inputs_v1`.

### 8.1 Écran 1 — Profil de base (Step1Profil.tsx)

```
┌─────────────────────────────────────────┐
│ ← Retour     [●○○○] 1/4 Profil         │  ← progress bar (4 dots)
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ ATTENTION — Cet outil traite UNIQUE- │  ← WarningPreCoursePost (encart amber)
│ MENT la nutrition PENDANT la course.    │     replié en accordéon "Lire le warning complet"
│ ▼ Lire le warning complet               │
│                                         │
│ ⚠️ AVANT — gut training obligatoire     │  ← WarningGutTrainingGate
│ Si tu n'as jamais utilisé de gel, NE    │     bloque l'écran si non acknowledged
│ COMMENCE PAS par ta course objectif.    │
│ [ ✓ Compris, montre-moi les chiffres ]  │  ← bouton acknowledged, persist localStorage 30j
│                                         │
├─────────────────────────────────────────┤
│ TON PROFIL                              │
│                                         │
│ Sexe                                    │
│ ┌─────────┬─────────┬────────────────┐ │
│ │   ○ H   │   ○ F   │ ○ Préfère pas  │ │  ← radio horizontal
│ └─────────┴─────────┴────────────────┘ │
│                                         │
│ Poids                                   │
│ ┌───────────────────────────────────┐  │
│ │  [    72    ] kg                  │  │  ← input number, 40-150
│ └───────────────────────────────────┘  │
│ ℹ️ Utilisé uniquement pour le calcul    │  ← reassurance doctrine
│                                         │
│ Niveau                                  │
│ ┌───────────────────────────────────┐  │
│ │ ○ Débutant                         │  │  ← radio vertical, 4 options
│ │ ○ Régulier                         │  │
│ │ ○ Confirmé                         │  │
│ │ ○ Expert                           │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ┌───────────────────────────────────┐  │
│ │ [✓] C'est ton premier marathon ?  │  │  ← Mode Premier
│ │     (recommandé pour Débutants)   │  │     Si Niveau=Débutant : checked + disabled + tooltip
│ │     ⓘ Activé automatiquement —    │  │     "Activé automatiquement pour ta sécurité"
│ │       garde-fous + plage basse    │  │
│ └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│ [        Suivant — Course →        ]   │  ← sticky bottom, full-width primary
└─────────────────────────────────────────┘
```

**Inputs collectés** : sexe, poids, niveau, modePremier (auto si Débutant, lock UI).
**Validation avant transition** : tous required. Bouton "Suivant" disabled si incomplet.
**Note dev** : `WarningGutTrainingGate` bloque réellement (overlay) tant que pas cliqué "Compris" ET ack < 30j.

### 8.2 Écran 2 — Course objectif (Step2Course.tsx)

```
┌─────────────────────────────────────────┐
│ ← Retour     [○●○○] 2/4 Course         │
├─────────────────────────────────────────┤
│                                         │
│ TA COURSE                               │
│                                         │
│ Chrono visé                             │
│ ┌────────┬────────┬────────┐           │
│ │ [03] h │ [45] m │ [00] s │           │  ← 3 inputs number (pattern MarathonPacePage)
│ └────────┴────────┴────────┘           │     PAS <input type="time"> (Safari iOS R6)
│ ℹ️ Entre 2h et 6h30                     │     validation min/max au calcul
│                                         │
│ Météo prévue départ                     │
│ ┌───────────────────────────────────┐  │
│ │ ○ Frais (<10°C)                    │  │
│ │ ○ Standard (10-20°C)               │  │  ← radio, défaut Standard
│ │ ○ Chaud (20-25°C)                  │  │
│ │ ○ Très chaud (>25°C)               │  │     Si "Très chaud" → champ T° précise apparaît
│ └───────────────────────────────────┘  │
│                                         │
│ ▼ Température exacte (si tu sais)       │  ← collapsible, optionnel
│ ┌───────────────────────────────────┐  │
│ │  [   22   ] °C                     │  │
│ └───────────────────────────────────┘  │
│                                         │
│ Hygrométrie                             │
│ ┌───────────────────────────────────┐  │
│ │ ○ Sec (<40%)                       │  │
│ │ ○ Standard (40-70%)                │  │  ← radio, défaut Standard
│ │ ○ Humide (>70%)                    │  │
│ └───────────────────────────────────┘  │
│                                         │
│ Expérience nutrition en course          │
│ ┌───────────────────────────────────┐  │
│ │ ○ Jamais (cap 60 g/h)              │  │
│ │ ○ Occasionnel (cap 80 g/h)         │  │  ← radio
│ │ ○ Habitué (plage complète)         │  │
│ └───────────────────────────────────┘  │
│                                         │
│ Course officielle avec ravitos iso ?    │
│ ┌───────────────────────────────────┐  │
│ │ ○ Oui (déduit 60-70g du calcul)    │  │
│ │ ○ Non                              │  │  ← défaut "Non"
│ │ ○ Je ne sais pas                   │  │     Si "Je ne sais pas" → tooltip "On calcule
│ └───────────────────────────────────┘  │     sans déduction. Si tu connais ta course,
│                                         │     coche Oui pour ajuster."
├─────────────────────────────────────────┤
│ [ ← Retour ]    [ Suivant — Affinages ]│  ← sticky bottom
└─────────────────────────────────────────┘
```

**Inputs collectés** : chronoSec, météo, temperatureC?, hygrométrie, expérienceNutrition, ravitosOfficiels.
**Validation** : chronoSec ∈ [7200, 23400] (2h-6h30). Si "Très chaud" → temperatureC required ∈ [25, 45].

### 8.3 Écran 3 — Affinages (Step3Affinages.tsx)

```
┌─────────────────────────────────────────┐
│ ← Retour     [○○●○] 3/4 Affinages      │
├─────────────────────────────────────────┤
│                                         │
│ AFFINE TON CALCUL                       │
│                                         │
│ Profil sudation                         │
│ ┌───────────────────────────────────┐  │
│ │ ○ Faible                           │  │
│ │ ○ Modéré                           │  │  ← radio
│ │ ○ Élevé                            │  │
│ │ ○ Salty sweater confirmé           │  │
│ │ ○ Je ne sais pas →                 │  │  ← ouvre modal SudationQuestionnaire (5 Q binaires)
│ └───────────────────────────────────┘  │     score → profil auto-suggéré (§3.5 V4)
│                                         │
│ Habitude caféine quotidienne            │
│ ┌───────────────────────────────────┐  │
│ │ ○ Aucune                           │  │
│ │ ○ 1-2 cafés/jour                   │  │  ← radio, défaut "1-2 cafés/j"
│ │ ○ 3+ cafés/jour                    │  │
│ └───────────────────────────────────┘  │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ ⓘ Affiché UNIQUEMENT si Sexe = F        │  ← caché si H/Préfère pas dire (décision #9)
│                                         │
│ Phase cycle menstruel (optionnel)       │
│ ┌───────────────────────────────────┐  │
│ │ ○ Préfère ne pas dire (défaut)     │  │
│ │ ○ Folliculaire (J1-J14)            │  │  ← radio, défaut "Préfère pas"
│ │ ○ Lutéale (J15-J28, avant règles)  │  │     Si "Lutéale" → message vigilance sodium
│ └───────────────────────────────────┘  │     dans CardSafety (§6.7)
│ ℹ️ Adapte les conseils sodium si Lutéale │
│                                         │
├─────────────────────────────────────────┤
│ [ ← Retour ]   [ Calculer ma stratégie ]│  ← sticky bottom, primary action
└─────────────────────────────────────────┘
```

**Inputs collectés** : sudation, habitudeCaféine, cycleMenstruel?.
**Validation** : sudation + habitudeCaféine required. Cycle optionnel (défaut "Préfère pas dire").
**Note dev** : `SudationQuestionnaire` = modal full-screen mobile avec 5 toggles + bouton "Voir mon profil suggéré" → affecte champ sudation au close.

### 8.4 Écran 4 — Résultats (Step4Resultats.tsx — 5 cartes + CTA bas)

```
┌─────────────────────────────────────────┐
│ ← Modifier   [○○○●] 4/4 Ta stratégie   │
├─────────────────────────────────────────┤
│                                         │
│ [ Tabs mobile : Plan | Timeline |       │  ← 4 tabs mobile, sticky sous header
│   Sécurité | Aller plus loin ]          │     (R-DEV-CARTE — pas 12 cartes scroll)
│                                         │
├─────────────────────────────────────────┤
│ ▼ TAB "PLAN" actif ▼                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🍽️ TA SYNTHÈSE — Marathon 3h45      │ │  ← CardSynthesis
│ │                                     │ │
│ │ [Si Mode Premier actif]             │ │     Message Premier en tête (§9.3)
│ │ « Premier marathon : ces chiffres   │ │
│ │ sont une cible. Ta priorité = finir │ │
│ │ confortable. Mieux vaut 50 g/h      │ │
│ │ bien digérés que 80 g/h vomis. »    │ │
│ │                                     │ │
│ │ Total course (3h45) :               │ │
│ │ • Énergie : ~2400 kcal              │ │     ⚠️ AUCUNE mention poids 72 kg
│ │ • Glucides : 225-280 g (cible 250)  │ │     (doctrine R11)
│ │ • Eau : 2.0-2.6 L                   │ │
│ │ • Sodium : 600-900 mg/L             │ │
│ │ • Caféine pré : 220-290 mg          │ │
│ │                                     │ │
│ │ [Si ravitos coché Oui]              │ │     §4.10 déduction
│ │ ℹ️ Ta course a des ravitos iso :    │ │
│ │ ~6 gobelets (60-70g glucides). Ton  │ │
│ │ complément en gels propres : 7 gels │ │
│ │ de 25g.                             │ │
│ │                                     │ │
│ │ ─────────────────────────────────── │ │
│ │ Estimation ±15-25% — adapte selon   │ │     §6.6 affiché toujours
│ │ ton expérience et retours terrain.  │ │
│ │                                     │ │
│ │ « Ces chiffres sont théoriques. Ton │ │     Message anti-rigidité (§5.1.1 V4)
│ │ corps reste le meilleur juge. Si la │ │     anti-TCA soft, doctrine
│ │ nutrition devient angoisse, parle-  │ │     `feedback_jamais_poids_minceur`
│ │ en à un pro. »                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🛒 TON PACK NUTRITION CONCRET       │ │  ← CardPack (GÉNÉRIQUE pas marque)
│ │                                     │ │
│ │ Pour ton marathon 3h45 :            │ │
│ │ • 10 gels de 25g glucides (type     │ │
│ │   maltodextrine, ratio 2:1 ou 1:0.8)│ │     DEV-5 — pas Maurten/SiS
│ │ • 4 bidons 500mL isotonique         │ │
│ │   (60-80 g/L)                       │ │
│ │ • 6 caps sel 500mg si chaud         │ │
│ │ • Café/caféine pré-course (cf       │ │
│ │   Sécurité)                         │ │
│ │                                     │ │
│ │ [Si target > 90g/h, message]        │ │     §4.8 ratio
│ │ ℹ️ Pour >90 g/h, cherche "ratio     │ │
│ │ 1:0.8" sur l'étiquette (moins       │ │
│ │ d'inconfort digestif).              │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ ▼ TAB "TIMELINE" (tap pour switch) ▼    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⏱️ TON TIMING JOUR J                │ │  ← CardTimeline
│ │                                     │ │
│ │ ┌───────────────────────────────┐  │ │
│ │ │ 🔴 H-30 → H-0 ZONE ROUGE       │  │ │     §5.1.2 V4 anti-hypo
│ │ │ Ne touche à rien de sucré      │  │ │
│ │ │ sauf eau plate. Pas de gel !   │  │ │
│ │ └───────────────────────────────┘  │ │
│ │                                     │ │
│ │ H+15 min : 1 gel 25g + 100mL eau    │ │
│ │ H+30 min : 100mL eau iso            │ │
│ │ H+40 min : 1 gel 25g + 100mL eau    │ │     1ère heure détaillée
│ │ H+55 min : 100mL eau iso + sel      │ │
│ │ ▼ Voir toute la course (jusqu'à     │ │     collapse — affiche tout
│ │   H+3h45)                           │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ ▼ TAB "SÉCURITÉ" ▼                      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🛡️ SÉCURITÉ & GARDE-FOUS            │ │  ← CardSafety
│ │                                     │ │
│ │ Hyponatrémie d'effort               │ │
│ │ [Si chrono <5h — ton soft]          │ │     DEV-6 + §6.3
│ │ Tu vises X mL/h, cohérent profil.   │ │
│ │ Bois selon ta soif, sodium associé. │ │
│ │ Ne dépasse jamais 1 L/h.            │ │
│ │                                     │ │
│ │ Hypoglycémie réactionnelle          │ │
│ │ Évite ton 1er gel <15 min départ.   │ │
│ │                                     │ │
│ │ Troubles digestifs                  │ │
│ │ Importance gut training (3-5 SL).   │ │
│ │                                     │ │
│ │ [Si Sexe=F et Lutéale]              │ │     §6.7 cycle
│ │ ⚠️ Phase lutéale = vigilance sodium.│ │     Surbrillance jaune
│ │ Boisson sodée, limite l'eau plate.  │ │
│ │                                     │ │
│ │ ▶ Test pesée pré/post SL (lire +)   │ │     accordéons individuels
│ │ ▶ Conditions extrêmes (>30°C)       │ │
│ │                                     │ │
│ │ ─────────────────────────────────── │ │
│ │ ▶ ⚠️ Cet outil ne s'applique PAS si │ │     DisclaimerMedical
│ │   tu as une condition médicale      │ │     ACCORDÉON REPLIÉ DÉFAUT
│ │   (cliquer pour voir la liste)      │ │     (Romane #10 + PM-P1 #3)
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📖 MÉTHODOLOGIE & LIMITES           │ │  ← CardMethodology
│ │ Consensus 2024 (ACSM, ISSN, IAAF).  │ │     §5.6 V4
│ │ Estimation ±15-25%. Test individuel │ │
│ │ irremplaçable.                      │ │
│ │ ▶ Voir 57 références scientifiques  │ │     ouvre accordéon biblio bas page
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ ▼ TAB "ALLER PLUS LOIN" ▼               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 QUAND TESTER TA STRATÉGIE        │ │  ← CardWhenToTest §5.5
│ │                                     │ │
│ │ Le calcul ci-dessus = cible.        │ │
│ │ Pour qu'il marche jour J, tu dois   │ │
│ │ entraîner ton estomac.              │ │
│ │                                     │ │
│ │ Durée gut training selon cible :    │ │     §4.3 caps
│ │ • <60 g/h : 2-3 semaines             │ │
│ │ • 60-90 g/h : 3-5 semaines           │ │
│ │ • 90-120 g/h : 6-8 semaines          │ │
│ │                                     │ │
│ │ Protocole :                         │ │
│ │ 1. SL >1h30 dans ton plan           │ │
│ │ 2. Commence 30 g/h                  │ │
│ │ 3. +10-15 g/h toutes les 2 sem      │ │
│ │ 4. Teste 3× chaque produit          │ │
│ │ Règle d'or : RIEN DE NOUVEAU JOUR J │ │
│ │                                     │ │
│ │ Pas encore de plan structuré ?      │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ → Crée ton plan gratuit en 2min │ │ │     CTA POST-SYNTHÈSE UNIQUEMENT
│ │ │   (pré-rempli avec tes infos)   │ │ │     (Romane #11 + PM-P1 #4)
│ │ └─────────────────────────────────┘ │ │     onclick: lien /questionnaire?
│ │                                     │ │     sexe=F&poids=72&niveau=Reg&chrono=03:45
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ❓ FAQ MARATHON (15 questions)      │ │  ← CardFAQ
│ │                                     │ │
│ │ ▶ Combien de gels pour un marathon ?│ │     accordéon par question
│ │ ▶ Quand prendre son premier gel ?   │ │     ld+json FAQPage injecté
│ │ ▶ Plan nutrition sub-3h ?           │ │     7 H3 chrono dedans (DEV-1)
│ │ ▶ Plan nutrition sub-3h30 ?         │ │
│ │ ▶ Plan nutrition sub-4h ?           │ │
│ │ ▶ Plan nutrition sub-4h30 ?         │ │
│ │ ▶ Plan nutrition sub-5h ?           │ │
│ │ ▶ Plan nutrition sub-5h30 ?         │ │
│ │ ▶ Plan nutrition sub-6h ?           │ │
│ │ ▶ Caféine avant marathon ?          │ │
│ │ ▶ Comment éviter le mur du 30e ?    │ │
│ │ ▶ Ravitos officiels Paris/Berlin ?  │ │
│ │ ▶ Premier marathon : nutrition ?    │ │
│ │ ▶ Nutrition marathon femme ?        │ │
│ │ ▶ Isotonique vs gels ?              │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ [ 🖨️ Imprimer ma stratégie ]            │  ← bouton window.print() (CSS @media print)
│ [ ↶ Modifier mes inputs ]                │  ← retour Step1 (inputs préservés localStorage)
└─────────────────────────────────────────┘
```

**Actions disponibles** :
- Tap tab → switch carte (4 tabs visibles)
- Scroll dans une tab → affichage cartes
- Tap "Imprimer" → `window.print()` (impression A5 propre via `printStyles.css`)
- Tap "Modifier" → `setCurrentStep(1)` + inputs restaurés localStorage
- Tap CTA "Créer mon plan" → `navigate('/questionnaire?sexe=...&poids=...&niveau=...&chrono=...')`

**Note dev critique** : la CTA "Créer mon plan" est **uniquement** dans CardWhenToTest (tab "Aller plus loin"). **AUCUNE CTA en haut, au milieu, ou en bandeau** (décision Romane #11 + PM-P1 #4). C'est le SEUL placement autorisé.

### 8.5 Desktop (≥768px) — Pas de wizard

Layout 3 colonnes :
- Colonne 1 (1/3) : tous les inputs (Step1+2+3 fusionnés) avec bouton "Calculer ma stratégie" en bas
- Colonne 2 (2/3) : 7 cartes empilées (Synthesis, Pack, Timeline, Safety, Methodology, WhenToTest, FAQ)
- Sticky : bouton "Imprimer" + bouton "Modifier" en haut à droite

Warnings (Pré/post, Gut training, DisclaimerMedical) en pleine largeur en haut.

---

## 9. MAILLAGE INTERNE + CTA POST-SYNTHÈSE (depuis V4, CTA replacé)

### 9.1 Maillage classique (V4 §8.1 conservé)

Bloc visuel bas de page "Outils complémentaires" :
- Cross-link interne nutrition (V1.5 : marathon ↔ trail ↔ semi)
- Liens performance : Convertisseur d'allure, Prédicteur de temps, Allure marathon, VMA

### 9.2 CTA cross-sell "outil → plan" (V5 — placement contrôlé)

**Une seule CTA principale** : CardWhenToTest (tab "Aller plus loin", post-synthèse).
- Texte : `"Pas encore de plan d'entraînement structuré ? Crée ton plan personnalisé gratuit en 2 min (pré-rempli avec tes infos)."`
- Bouton : `"→ Créer mon plan gratuit"`
- Lien : `/questionnaire?sexe={s}&poids={w}&niveau={n}&chrono={c}` (URL params passés au générateur)
- Tracking GA4 : `nutrition_cta_plan_click`

**CTA tertiaire FAQ** (1 question dédiée) :
- Question : `"Combien de temps avant ma course je dois tester ma nutrition ?"`
- Réponse : `"… Lance ton plan 12-16 semaines avant ta course objectif → tu auras 8-10 SL pour tester. → [Plan personnalisé gratuit]"`

**ZÉRO autre CTA** "Créer mon plan" ailleurs sur la page (interdit en haut sous warning, interdit en milieu de page, interdit en bandeau flottant).

### 9.3 CTA "plan → outil nutrition" (V1.5 — sprint séparé)

Welcome message du plan généré + advice fin de plan. **Hors MVP nutrition** (DEV-8). Ticket dédié modif `geminiService` après MVP. Doctrine `feedback_pas_de_nutrition_dans_plan` actée pour exception "mention sans chiffres" (mémoire 2026-05-17).

---

## 10. SPEC DEV PRÉCISE (fichiers, routes, configs, types)

### 10.1 Fichiers à créer (récap arborescence §2.2)

**Sprint 1 (Fondations, 2 j)** :
- `src/components/tools/nutrition/lib/types.ts`
- `src/components/tools/nutrition/lib/formulas/energy.ts | carbs.ts | hydration.ts | sodium.ts | caffeine.ts | ratios.ts | aidStations.ts`
- `src/components/tools/nutrition/lib/profiles/sudationScoring.ts | premierMode.ts`
- `src/components/tools/nutrition/lib/localState.ts | analytics.ts | references.ts`
- `src/components/tools/nutrition/lib/__tests__/*.test.ts` (8 fichiers, ~30 tests)

**Sprint 2 (Marathon MVP livrable, 3-4 j)** :
- `src/components/tools/nutrition/NutritionMarathonPage.tsx`
- `src/components/tools/nutrition/shared/NutritionCalculator.tsx`
- `src/components/tools/nutrition/shared/NutritionContext.tsx`
- `src/components/tools/nutrition/shared/inputs/InputsWizardMobile.tsx | InputsAllInOneDesktop.tsx | Step1Profil.tsx | Step2Course.tsx | Step3Affinages.tsx | Step4Resultats.tsx | SudationQuestionnaire.tsx | ChronoInput.tsx | inputValidation.ts`
- `src/components/tools/nutrition/shared/results/CardSynthesis.tsx | CardTimeline.tsx | CardPack.tsx | CardSafety.tsx | CardFAQ.tsx | CardWhenToTest.tsx | CardMethodology.tsx`
- `src/components/tools/nutrition/shared/warnings/WarningGutTrainingGate.tsx | WarningPreCoursePost.tsx | PremierModeMessage.tsx | DisclaimerMedical.tsx | SafetyOrchestrator.tsx`
- `src/components/tools/nutrition/shared/print/printStyles.css`
- `src/components/tools/nutrition/content/marathonContent.tsx`
- Modif `src/App.tsx` (1 route)
- Modif `src/components/Layout.tsx` (toolsLinks +1)
- Modif `scripts/prerender.mjs` (STATIC_ROUTES +1)

**Sprint 3 (Trail + Semi V1.5, 3 j)** :
- `NutritionTrailPage.tsx | NutritionSemiPage.tsx`
- `TrailInputsStep.tsx | SemiInputsStep.tsx`
- `CardAidStations.tsx | CardFatigue.tsx | CardAltitude.tsx | CardSemiManger.tsx`
- `lib/formulas/proteins.ts | mouthRinse.ts`
- `lib/urlState.ts` (V1.5)
- `content/trailContent.tsx | semiContent.tsx`

**Sprint 4 (Polish, 2 j)** :
- Tests cross-browser
- Lighthouse audit
- A11y audit
- GA4 events validation
- Checklist QA doctrine (§13)

### 10.2 Routes App.tsx

Voir §2.3 spec exacte. **MVP** : +1 route. **V1.5** : +2 routes.

### 10.3 Sous-menu Layout.tsx

Voir §2.3 spec exacte. Liste plate + header visuel "── Nutrition Course ──" (pas de cascade niveau 2 — UX cassée mobile, R3).

### 10.4 Configs TypeScript

Voir §2.4 (`CONFIG_MARATHON` MVP, `CONFIG_TRAIL` / `CONFIG_SEMI` V1.5).

### 10.5 Stratégie SEO indexation

**Prerender Puppeteer suffit** (DEV-stack, R7 mitigé). Ajouter routes dans `scripts/prerender.mjs > STATIC_ROUTES[]`. Vérifier que `<NutritionCalculator>` rend cartes en mode "exemple" (chrono 4h défaut) si pas calculé → Puppeteer capture HTML complet.

### 10.6 Implémentation Mode Premier (DEV-3 — critique doctrine)

**Pattern** : `applyPremierClamps(rawResult, isPremier, type)` dans `lib/profiles/premierMode.ts`. **TOUTES** les fonctions `lib/formulas/*` retournent leur résultat BRUT (sans Premier). **Une seule étape finale** dans `NutritionCalculator.tsx` :

```tsx
// shared/NutritionCalculator.tsx (extrait)
const raw: NutritionResult = useMemo(() => ({
  durationSec: chronoSec,
  kcalPerHour: computeKcal(inputs),
  carbsPerHour: computeCarbs(inputs),          // brut
  hydrationPerHour: computeHydration(inputs),
  sodiumPerLiter: computeSodium(inputs),
  caffeinePreRace: computeCaffeinePre(inputs),
  caffeineInRace: computeCaffeineIn(inputs),
  caffeineBoostFinal: computeCaffeineBoost(inputs),
  aidStationDeduction: inputs.ravitos === 'oui' ? deductAidStations(inputs) : undefined,
  softWarnings: validateInputs(inputs),
  premierModeActive: inputs.modePremier,
}), [inputs]);

const final: NutritionResult = useMemo(
  () => inputs.modePremier ? applyPremierClamps(raw, config.type) : raw,
  [raw, inputs.modePremier, config.type]
);
```

**Tests obligatoires** `premierMode.test.ts` :
1. Marathon Premier → carbs max ≤ 70 g/h (peu importe chrono)
2. Semi Premier → carbs max ≤ 60 g/h
3. Trail Premier <12h → carbs max ≤ 70 g/h
4. Premier → sodium max ≤ 1300 mg/L (jamais 1600+)
5. Premier → caféine pré max ≤ 3 mg/kg
6. Premier → `caffeineBoostFinal === undefined`
7. NON-Premier → aucun clamp appliqué (égalité raw === final)

### 10.7 GA4 events (10 events)

Voir §12 ci-dessous.

### 10.8 Tests unitaires Vitest (~30 tests)

| Fichier test | Tests | Couverture |
|---|---|---|
| `energy.test.ts` | 4 tests | trail Minetti / marathon flat / clamp coeff grimpée / vitesse moyenne |
| `carbs.test.ts` | 6 tests | tableaux marathon par chrono (sub-3h…sub-6h) + caps expérience (Jamais/Occ/Habitué) |
| `hydration.test.ts` | 5 tests | matrice 4×4 + ajustements humidité + altitude (V1.5) + cap 1000 mL/h |
| `sodium.test.ts` | 3 tests | par profil + Premier clamp |
| `caffeine.test.ts` | 4 tests | dose par habitude + plafond 24h + Premier clamp + boost désactivé Premier |
| `premierMode.test.ts` | 7 tests | (voir §10.6) |
| `sudationScoring.test.ts` | 3 tests | score 0/3/5 → Faible/Modéré/Salty |
| `aidStations.test.ts` | 2 tests | déduction ~66g si oui + 0 si non |
| `inputValidation.test.ts` | 3 tests | règles soft (60kg+sub-2h+30°C, etc.) |
| `no_weight_in_output.test.ts` | **3 tests doctrine** | scan que NutritionResult ne contient JAMAIS le poids saisi (numérique ou stringifié), scan PDF output, scan messages user |

**Couverture cible** : 90%+ branches sur `lib/formulas/*` et `premierMode.ts`. Pre-commit hook recommandé.

### 10.9 Checklist QA — "Le poids ne doit JAMAIS apparaître"

Voir §13 ci-dessous.

---

## 11. DÉCOUPAGE SPRINTS (4 sprints détaillés)

### Sprint 1 — Fondations (2 jours, J1-J2)

**Livrable** : moteur de calcul validé scientifiquement, indépendant de l'UI.

**Tâches** :
- [ ] J1 matin : `types.ts` complet (NutritionInputs, NutritionResult, NutritionConfig, RangeValue, SoftWarning)
- [ ] J1 matin : `lib/formulas/energy.ts` + tests (4 tests)
- [ ] J1 après-midi : `lib/formulas/carbs.ts` + `ratios.ts` + tests (6 tests carbs + ratios)
- [ ] J1 fin : `lib/formulas/hydration.ts` + `sodium.ts` + `caffeine.ts` + tests (5+3+4 = 12 tests)
- [ ] J2 matin : `lib/formulas/aidStations.ts` + tests (2 tests)
- [ ] J2 matin : `lib/profiles/sudationScoring.ts` + tests (3 tests)
- [ ] J2 après-midi : `lib/profiles/premierMode.ts` (`applyPremierClamps`) + tests (7 tests) — **critique doctrine**
- [ ] J2 après-midi : `lib/inputs/inputValidation.ts` + tests (3 tests)
- [ ] J2 fin : `lib/localState.ts` + `lib/analytics.ts` (wrapper GA4) + `lib/references.ts` (57 réfs export const)
- [ ] J2 fin : `no_weight_in_output.test.ts` (3 tests doctrine R11)

**Validation** : `npm test` → ~30 tests verts, couverture 90%+ branches.
**Aucune UI**, aucun composant React.

### Sprint 2 — Marathon MVP livrable (3-4 jours, J3-J6)

**Livrable** : `/outils/nutrition-marathon` complet, déployable en preview.

**Tâches** :
- [ ] J3 matin : `NutritionCalculator.tsx` container + `NutritionContext.tsx` + intégration formulas Sprint 1
- [ ] J3 matin : `ChronoInput.tsx` (3 inputs h/m/s pattern `MarathonPacePage`)
- [ ] J3 après-midi : `Step1Profil.tsx` (sexe/poids/niveau/Mode Premier UI lock)
- [ ] J3 après-midi : `Step2Course.tsx` (chrono/météo/T°/hygro/expérience/ravitos)
- [ ] J3 fin : `Step3Affinages.tsx` (sudation/caféine/cycle conditionnel F)
- [ ] J4 matin : `SudationQuestionnaire.tsx` modal 5 Q binaires + scoring
- [ ] J4 matin : `InputsWizardMobile.tsx` (4 écrans + progress + autosave)
- [ ] J4 après-midi : `InputsAllInOneDesktop.tsx` (≥768px tout-en-un 3 col)
- [ ] J4 après-midi : `Step4Resultats.tsx` (4 tabs mobile / grid desktop)
- [ ] J4 fin : `CardSynthesis.tsx` + `CardPack.tsx` (avec mention générique, message Premier, anti-rigidité)
- [ ] J5 matin : `CardTimeline.tsx` (zone rouge + 1ère heure + collapse)
- [ ] J5 matin : `CardSafety.tsx` (EAH dosé + cycle + accordéons + DisclaimerMedical replié)
- [ ] J5 après-midi : `CardFAQ.tsx` + 15 questions + ld+json schema FAQPage
- [ ] J5 après-midi : `CardWhenToTest.tsx` (CTA UNIQUE vers `/questionnaire` pré-rempli)
- [ ] J5 fin : `CardMethodology.tsx` + biblio 57 réfs accordion
- [ ] J6 matin : `WarningGutTrainingGate.tsx` (ack persist 30j localStorage) + `WarningPreCoursePost.tsx` + `PremierModeMessage.tsx`
- [ ] J6 matin : `SafetyOrchestrator.tsx` (décide quels warnings afficher selon contexte)
- [ ] J6 après-midi : `marathonContent.tsx` (1500-2500 mots SEO + H3 chrono same page DEV-1)
- [ ] J6 après-midi : `NutritionMarathonPage.tsx` (page-instance assemblant tout)
- [ ] J6 fin : modif `App.tsx` (route) + `Layout.tsx` (toolsLinks +1) + `prerender.mjs` (STATIC_ROUTES +1)
- [ ] J6 fin : test build prerender → vérifier HTML capturé contient cartes mode exemple

**Validation** : preview deploy, parcours wizard 4 écrans complet mobile + desktop, calcul cohérent, doctrine respectée (poids absent, anti-rigidité affiché en Premier, etc.).

### Sprint 3 — Trail + Semi (V1.5, 3 jours, J7-J9)

**Livrable** : 3 outils nutrition en ligne, MVP complet V1.5.

**Tâches** :
- [ ] J7 matin : `lib/formulas/proteins.ts` (trail >4h) + `mouthRinse.ts` (semi sub-1h15) + tests
- [ ] J7 matin : `lib/urlState.ts` (sérialisation URL query string) + tests roundtrip
- [ ] J7 après-midi : `TrailInputsStep.tsx` (distance/D+/D-/altitude/acclimaté/bases vie/heure départ)
- [ ] J7 fin : `CardAidStations.tsx` (bases de vie 3 cas) + `CardFatigue.tsx` (plan B 4 étapes) + `CardAltitude.tsx`
- [ ] J8 matin : `NutritionTrailPage.tsx` + `content/trailContent.tsx` (1500-2500 mots + 15 FAQ trail)
- [ ] J8 après-midi : `SemiInputsStep.tsx` + `CardSemiManger.tsx` (faut-il manger + mouth rinse)
- [ ] J8 fin : `NutritionSemiPage.tsx` + `content/semiContent.tsx` (1500-2500 mots + 12 FAQ + Hyrox)
- [ ] J9 matin : modif `App.tsx` (+2 routes) + `Layout.tsx` (+2 toolsLinks) + `prerender.mjs` (+2 STATIC_ROUTES)
- [ ] J9 après-midi : `ShareUrlButton.tsx` (V1.5) sur les 3 outils
- [ ] J9 fin : tests build prerender 3 routes

**Validation** : 3 outils déployés, cross-links inter-outils OK, URL partageable testée roundtrip.

### Sprint 4 — Polish + QA (2 jours, J10-J11)

**Livrable** : MVP prêt prod (Marathon V1) ou MVP+V1.5 (3 outils) prêt prod.

**Tâches** :
- [ ] J10 matin : `printStyles.css` `@media print` + bouton "Imprimer" → `window.print()` → test print preview Chrome/Safari/Firefox
- [ ] J10 matin : GA4 events implémentés + testés (10 events §12)
- [ ] J10 après-midi : audit doctrine checklist (10 items §13)
- [ ] J10 après-midi : tests cross-browser (Safari iOS via TestFlight ou device réel, Chrome Android, Firefox)
- [ ] J10 fin : audit perf Lighthouse mobile (objectif >90 perf, >95 accessibility, >95 best practices, >95 SEO)
- [ ] J11 matin : audit a11y (aria-labels, contraste, navigation clavier, focus visible)
- [ ] J11 matin : revue FAQ schema `ld+json` injection (`view-source:` vérification)
- [ ] J11 après-midi : revue contenu SEO 3 pages (lecture intégrale, corrections typos)
- [ ] J11 après-midi : Romane validation finale (parcours utilisateur complet sur chaque outil)
- [ ] J11 fin : merge main + déploiement prod

**Validation** : prod live, checklist QA verte, Lighthouse >90, doctrine respectée.

### Sprint 5 — V2 (post-traffic, 3-6 mois plus tard, hors planning MVP)

- jsPDF lazy A5 design custom (si demande user remontée)
- PWA installable + manifest enrichi + workbox service worker
- Mode "course en cours" timeline scrollable temps réel
- Pages dédiées par chrono (sub-3h, sub-4h…) si Search Console le justifie
- Outils nutrition pré-course + post-course
- Outil Ultra-Trail (>100km) + 10km séparés
- i18n EN/ES
- Welcome message plan + advice fin de plan (ticket Gemini séparé)

**Total MVP Marathon V1** : Sprints 1+2+4 = **7-8 jours dev**.
**Total V1.5 (Marathon+Trail+Semi)** : Sprints 1+2+3+4 = **10-12 jours dev**.

---

## 12. GA4 EVENTS (10 events à tracker)

**Stack** : GA4 déjà installé (`G-P0641L8TPT` dans `index.html`). Wrapper dans `lib/analytics.ts`.

```ts
// lib/analytics.ts
declare global {
  interface Window {
    gtag: (command: string, eventName: string, params?: Record<string, any>) => void;
  }
}

export function trackNutritionEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...params,
      tool_version: 'v1.0',
    });
  }
}
```

**10 events à implémenter** :

| # | Event name | Trigger | Params |
|---|---|---|---|
| 1 | `nutrition_page_view` | Mount `NutritionMarathonPage` | `{ type: 'marathon' }` |
| 2 | `nutrition_gut_ack` | Clic bouton "Compris, montre-moi les chiffres" | `{ type }` |
| 3 | `nutrition_step_complete` | Transition Step 1→2, 2→3, 3→4 | `{ type, step: 1|2|3 }` |
| 4 | `nutrition_calc_complete` | Calcul terminé (entrée Step 4) | `{ type, chrono_minutes, niveau, premier_mode: boolean, sudation, meteo }` (**JAMAIS poids**) |
| 5 | `nutrition_premier_mode_on` | Mode Premier activé (auto ou manuel) | `{ type, niveau, source: 'auto'|'manual' }` |
| 6 | `nutrition_sudation_questionnaire_open` | Modal ouvert | `{ type }` |
| 7 | `nutrition_sudation_questionnaire_complete` | Modal validé | `{ type, score: 0-5, profil_suggere }` |
| 8 | `nutrition_cta_plan_click` | Clic "Créer mon plan" dans CardWhenToTest | `{ type, chrono_minutes }` |
| 9 | `nutrition_print_click` | Clic bouton "Imprimer ma stratégie" | `{ type }` |
| 10 | `nutrition_disclaimer_medical_open` | Clic accordéon DisclaimerMedical | `{ type }` |

**Bonus V1.5** :
- `nutrition_url_share_copy` (clic ShareUrlButton)
- `nutrition_inputs_modify` (clic "Modifier" depuis Step 4)
- `nutrition_aid_station_yes` (user coche ravitos = Oui)

**Doctrine RGPD/poids** :
- AUCUN event ne loggue le poids (R11 — checklist QA §13 item 1).
- Aucune PII (sexe = catégorie OK, poids = NON).

---

## 13. CHECKLIST QA (doctrine : jamais poids dans outputs)

À exécuter manuellement à la fin de Sprint 4 (ou avant déploiement prod). Pré-rempli en Markdown pour cocher direct.

**Doctrine `feedback_jamais_poids_minceur` + R11** :

- [ ] **Item 1** — Le poids saisi (ex: 72 kg) n'apparaît dans **AUCUN output** :
  - [ ] Pas dans `CardSynthesis` ("Pour ton poids de 72 kg..." → INTERDIT)
  - [ ] Pas dans `CardTimeline`
  - [ ] Pas dans `CardPack`
  - [ ] Pas dans `CardSafety`
  - [ ] Pas dans `CardFAQ`
  - [ ] Pas dans `CardWhenToTest`
  - [ ] Pas dans `CardMethodology`
  - [ ] Pas dans `PremierModeMessage`
  - [ ] Pas dans `DisclaimerMedical`
  - [ ] Pas dans output `window.print()` (PDF imprimé)
  - [ ] Pas dans aucun event GA4 envoyé (console réseau ouverte, vérifier `nutrition_calc_complete` ne contient pas `weight` ou `poids`)
  - [ ] Pas dans URL params si V1.5 (`?w=72` interdit, sauf hash chiffré opt-in)
  - [ ] Pas dans tooltips / labels / placeholders dynamiques

- [ ] **Item 2** — Aucune mention "perte de poids", "minceur", "maigrir", "IMC", "corpulence" :
  - [ ] grep récursif `src/components/tools/nutrition/` → 0 occurrence
  - [ ] grep dans `content/marathonContent.tsx` (SEO) → 0 occurrence
  - [ ] FAQ 15 questions → aucune n'évoque ces termes

**Doctrine `feedback_securite_avant_conversion`** :

- [ ] **Item 3** — Mode Premier auto-coché + non décochable si Niveau=Débutant (`disabled + checked + tooltip explicatif`)
- [ ] **Item 4** — Mode Premier affiche message anti-rigidité en tête CardSynthesis
- [ ] **Item 5** — Mode Premier clamp effectif : test manuel avec Niveau=Débutant + chrono=2h45 → carbs affichés ≤ 70 g/h (jamais 110)
- [ ] **Item 6** — Mode Premier désactive boost caféine final (`caffeineBoostFinal === undefined` dans output)
- [ ] **Item 7** — Warning EAH soft si chrono <5h, appuyé si ≥5h (test frontière : 4h59 → soft, 5h00 → hard)
- [ ] **Item 8** — DisclaimerMedical collapsé par défaut (`<details>` sans `open`)
- [ ] **Item 9** — WarningGutTrainingGate bloque réellement (overlay) tant que pas acknowledged + persiste 30j localStorage

**Doctrine `feedback_jamais_contact_client`** :

- [ ] **Item 10** — Aucune notification push, aucun email, aucune capture email V1 (V1.5 reportée arbitrage Romane)

**Doctrine `feedback_compromis_messages_preventifs`** :

- [ ] **Item 11** — Validation logique inputs (§3.3) = messages soft inline, JAMAIS de blocage du calcul

**Doctrine `feedback_pas_de_nutrition_dans_plan` (exception actée)** :

- [ ] **Item 12** — L'outil nutrition affiche bien des chiffres (g/h, mL, mg) — OK par exception mémoire 2026-05-17
- [ ] **Item 13** — Aucune modification du générateur de plan n'a été déployée dans ce sprint (DEV-8 → ticket séparé)

**SEO & technique** :

- [ ] **Item 14** — `application/ld+json` FAQPage présent dans `<head>` (vérifier `view-source:`)
- [ ] **Item 15** — Prerender capture HTML complet avec cartes en mode "exemple" (vérifier `dist/outils/nutrition-marathon/index.html`)
- [ ] **Item 16** — Lighthouse mobile >90 perf, >95 a11y/best/SEO
- [ ] **Item 17** — Test Safari iOS (device réel ou TestFlight) : wizard 4 écrans OK, chrono input 3 fields OK, `window.print()` déclenche dialog
- [ ] **Item 18** — Test Chrome Android : sticky button bas avec safe-area-inset OK
- [ ] **Item 19** — Couverture tests Vitest ≥90% branches sur `lib/formulas/*` + `premierMode.ts`
- [ ] **Item 20** — CTA "Créer mon plan" UNIQUE dans CardWhenToTest (post-synthèse) — aucun autre placement (grep `Créer mon plan` → 1 résultat dans `CardWhenToTest.tsx` + 1 réponse FAQ tertiaire max)

---

## 14. RÉFÉRENCES BIBLIO

**Voir `BRIEF-NUTRITION-V4-FINAL.md` §11 — 57 références DOI complètes** (Glucides 12, Hydratation 9, Caféine 5, Gut training 7, Coût énergétique 5, Ultra/protéines 5, Femmes 5, Altitude 3, Mouth rinse 3, Récupération 3).

À implémenter dans `lib/references.ts` comme `export const REFERENCES: Reference[]` (52 entrées). Affichage : accordéon replié bas de page, groupé par catégorie, DOI cliquables (`https://doi.org/{doi}` target=_blank rel=noopener).

```ts
// lib/references.ts (extrait, à compléter Sprint 1)
export interface Reference {
  id: number;
  category: 'carbs' | 'hydration' | 'caffeine' | 'gut' | 'energy' | 'ultra' | 'women' | 'altitude' | 'mouth_rinse' | 'recovery';
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi: string;
}

export const REFERENCES: Reference[] = [
  { id: 1, category: 'carbs', authors: 'Jeukendrup AE', year: 2010, title: 'Carbohydrate intake during exercise and performance', journal: 'Nutrition 20:669-77', doi: '10.1016/j.nut.2004.04.017' },
  // ... 56 autres entrées (cf V4 §11)
];
```

---

## 15. POINTS À VALIDER ROMANE

Avant ouverture ticket dev :

1. **Mémoire `feedback_outil_nutrition_chiffres_ok_hors_plan`** : confirmer formulation (mémorisée 2026-05-17). Contenu = "chiffres OK dans outils séparés, INTERDITS dans plan d'entraînement".
2. **Mémoire `feedback_pas_de_nutrition_dans_plan`** : confirmer ajout exception "mention sans chiffres ≤40 mots OK dans plan" (mémorisée 2026-05-17).
3. **Mémoire `project_coach_running_ia_outil_nutrition`** : confirmer pointeur vers ce brief V5 (à mettre à jour si pas déjà fait).
4. **CTA pré-remplissage `/questionnaire`** : valider format URL params (`?sexe=&poids=&niveau=&chrono=`) et que le générateur de plan **les consomme bien au mount**. Sinon friction = abandon. **Dev coordonné avec dev du générateur**.
5. **Périmètre Sprint 2 = Marathon SEUL** : confirmer go déploiement prod après Sprint 1+2+4 (7-8 j) sans attendre Trail+Semi. **Permet validation utilisateurs réels avant V1.5**.
6. **Email capture V1.5** : oui / non / arbitré post-V1 selon analytics ? (Touche `feedback_jamais_contact_client`).
7. **Tests utilisateurs post-MVP** : prévoir 3-5 entretiens débutants après mise en ligne Marathon V1 pour valider qu'aucun warning n'a "scared off".
8. **Nom de domaine OG image** : créer 3 OG images (`/og-nutrition-marathon.jpg`, trail, semi) — 1200×630px branding CRIA.
9. **Pas d'autre arbitrage produit nécessaire** : tout le reste est tranché et exécutable.

**ETA validation Romane** : ~15-20 min (lecture brief + check 9 points). **GO dev derrière**.

---

## Synthèse finale V5

**Brief V5 FINAL** = brief V4 (926 L, 57 réfs DOI, 29 deltas coach + 20 corrections docteur) **+ 11 décisions Romane tranchées** (H3 same page, GA4, Mode Premier UI lock, no email V1, Marathon-only MVP, print CSS, no URL share V1, no PWA V1, cycle conditionnel F, disclaimer accordéon, CTA post-synthèse unique) **+ 7 ajustements PM senior P1** (intégrés) **+ 8 ajustements dev équipe** (intégrés) **+ 11 risques techniques mitigés** **+ wireframe mobile 4 écrans détaillé** **+ spec dev exécutable (arborescence 30+ fichiers, configs TS, 30+ tests Vitest, 10 events GA4, 20-item QA checklist)** **+ découpage 4 sprints (10-12 j total, Marathon MVP livrable J6/7)**.

**Statut** : 🟢 **READY FOR DEV**. Lecture PM 15-20 min, ouverture ticket Sprint 1 immédiat possible.

**Position concurrentielle V5** : aucun outil francophone (Aptonia, Overstim's, Lepape, Decathlon) ne combine simultanément crédibilité scientifique (57 réfs DOI), pédagogie coach (Mode Premier UI lock), cohérence produit (CTA post-synthèse unique pré-rempli vers générateur de plan), UX jour J (mobile-first wizard 4 écrans + print CSS), doctrine CRIA stricte (sécurité>conversion, zéro mention poids, zéro contact direct, course exclusivement). Différenciation maximale, scope MVP raisonnable (7-8 j Marathon V1, 10-12 j V1.5 complet).

**Conflit d'intérêt déclaré** : aucun.
