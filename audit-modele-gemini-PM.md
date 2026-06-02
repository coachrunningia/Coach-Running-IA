# Audit modèle Gemini — PM tech senior (challenge Dev expert)

Date: 2026-05-29 | Reviewer: PM 15 ans SaaS LLM-driven
Scope: Challenger verdict Dev "swap `gemini-3-flash-preview` → stable = -8-12s, 60-70% du problème"

---

## 1. Historique du choix preview (vérifié git)

**Accident industriel, pas choix techno.** Confirmé sur 3 commits :
- `62416ec` (Sprint 4, 19/05) : migration `2.5-flash → 3-flash` (string sans suffix).
- `35e20ab` (hotfix 17h même jour) : `3-flash` retourne 404 → patch d'urgence `-preview` ajouté sur 9 sites. Le commit mentionne déjà `gemini-3-flash-lite` et `3.1-pro-preview` comme upgrades futurs — **jamais fait sur Flash**.
- `717b2d8` (F-11, 27/05) : seul `aiReviewPlan` upgradé `3-pro-preview → 3.1-pro-preview` car déprécié. Flash oublié 10 jours.

Aucun commentaire dans le code ne justifie le suffixe `-preview` autre que "404 prod fix". **Pas de feature preview-only utilisée**.

---

## 2. Risques cassure — angles morts du Dev

### 2a. ResponseSchema strict (geminiService L4197-4267) — RISQUE MOYEN
Le fallback `catch` L5056-5063 retombe sur `responseMimeType` seul si le schema est rejeté. **Donc** même si `gemini-3-flash` stable rejetait le schema, fallback transparent. **Mais** : aucune télémétrie sur taux de fallback → on saurait pas si le stable downgrade silencieusement. **Mitigation** : logger `model+fallback=true` Sentry pré-déploiement.

### 2b. Tests Vitest — RISQUE FAIBLE
~893 tests revendiqués, mais audit révèle qu'**aucun test ne mocke `GoogleGenerativeAI`** (grep zéro résultat). Les tests valident la **logique déterministe en aval** (`postProcessWeekQuality`, `enforceWeekConstraints`, `applyDistanceOverride`). Donc un changement de modèle ne casse PAS la batterie verte. **Angle mort du Dev** : ça ne valide RIEN sur la sortie LLM. Faux sentiment de sécurité.

### 2c. Cohérence F-11 aiReview — RISQUE FAIBLE
F-11 a migré `aiReviewPlan` vers `3.1-pro-preview` (Pro déprécié). Avoir Flash stable + Pro preview n'est PAS incohérent : la doctrine du projet est "stable où dispo, preview où c'est la seule option" (cf 35e20ab). Pro stable n'existe pas → on garde Pro preview. **Pas de migration forcée**.

### 2d. Soft quality S1/S2 (déployée 28/05 23h) — RISQUE FAIBLE
`postProcessWeekQuality` (L987) tourne **en aval** du LLM, indépendant du modèle. Tests `soft-quality-s1-s2.test.ts` n'appellent jamais Gemini. **OK**.

### 2e. F-17 paceRecalibration / Sprint G Strava — RISQUE FAIBLE
`paceRecalibrationService` traite plan déjà généré. `stravaAnalysisService:259` aussi en `gemini-3-flash-preview` → **swap doit inclure ce 4e site oublié par le Dev** (qui en mentionne 3). + `types.ts:299` commentaire + `geminiService:3715` modelUsed metadata. **5 sites au total**, pas 3.

---

## 3. Coût comparé (100 plans/jour ≈ 3000/mois)

Source Expert IA (audit-modele-gemini-EXPERT-IA.md §3-4) :

| Modèle | $/mois 3 appels/plan | Δ vs actuel |
|---|---|---|
| `gemini-3-flash-preview` (actuel) | ~$36 | baseline |
| `gemini-3-flash` (stable) | **~$36 (iso)** | **0%** |
| `gemini-2.5-flash` (fallback) | ~$27 | -25% |
| `gemini-3.1-pro-preview` | ~$450 | **+1150%** |

**Verdict coût** : swap stable = iso ($36). Pas d'argument financier contre. Pro = ruineux solo founder.

---

## 4. Tests OBLIGATOIRES avant swap (doctrine validation_N_profils_avant_sprint)

Le Dev n'a PAS exigé cette validation. C'est mon ajout PM **bloquant** :

1. **Curl ListModels Google** (cf 35e20ab) : confirmer `gemini-3-flash` GA aujourd'hui. Si 404 → Plan B Expert IA (2.5-flash). 5 min.
2. **10 profils diversifiés génération réelle** (pré-swap baseline + post-swap diff) :
   - Marathon Expert PB / Semi Inter / 10K Inter / 5K Débutant / Trail Ultra D+ / Hyrox / Finisher senior / Remise en forme / Marathon Débutant freq3 / Trail vallonné débutant.
   - Snapshot JSON output → diff structure + welcomeMessage + safetyWarning + feasibility.status + mainSet cohérence.
3. **Vérif responseSchema fallback rate** : logger 50 plans pré/post pour détecter si stable rejette plus souvent (signal silencieux).
4. **Vérif paceRecalibration F-17 + Strava Sprint G** : 1 profil utilisant chaque feature, vérifier réponse Gemini cohérente.
5. **Stress Soft Quality S1/S2** : cyrielle, ericsson, jeanluc, arnaud (4 profils réels test soft-quality-s1-s2.test.ts) → reproduire en réel.

**Temps total : 2-3h dev, pas 1h comme dit le Dev**.

---

## 5. Process déploiement — feature flag, canary, monitoring

Le Dev a sauté ces étapes. Non négociable :

1. **Feature flag** `GEMINI_FLASH_MODEL_ID` (env var) → permet rollback en <5 min sans redéploiement. Default = `gemini-3-flash-preview` (sécu), passer à `gemini-3-flash` en prod.
2. **Canary 10%** : `Math.random() < 0.1 ? stable : preview` pendant 48h. Loguer `model_used+latency+fallbackSchema` par génération.
3. **Monitoring P95 latence preview** : seuil alerte 25s (vs 17s historique 2.5-flash). Si p95 stable > 25s → rollback auto.
4. **Monitoring qualité** : taux `feasibility.status='IRRÉALISTE'` (doit rester stable). Taux `flaggedWeeks.length > 0` (doit pas exploser). 7 jours observation.
5. **Re-check ListModels hebdo** (script `_audit-list-models.mjs`) : détecte dépréciations Google.

---

## 6. Verdict final — REVISE (pas GO direct)

**Le Dev a raison sur le diagnostic** (preview = pool throttlé, stable = -8-12s). MAIS son verdict est incomplet sur 3 angles :

| Angle mort | Conséquence si ignoré |
|---|---|
| **5 sites pas 3** (stravaAnalysisService + types + modelUsed) | Incohérence partielle, Strava analyzer reste lent |
| **Aucun test LLM réel** dans Vitest | "Tests verts" ne prouvent RIEN sur sortie LLM |
| **Pas de canary ni feature flag** | Rollback = redéploiement complet si régression |

**Décision PM** :
- **GO sur principe** (gain UX énorme, coût iso, risque code nul).
- **REVISE process** : (a) 5 sites swap pas 3, (b) feature flag env var, (c) canary 10% 48h, (d) 10 profils validation manuelle pré-merge, (e) logger taux fallback responseSchema.
- **Délai réaliste** : 3-4h dev + 48h observation canary, pas 5 min comme le Dev suggère.
- **Plan B documenté** : si `gemini-3-flash` indispo ou régression qualité >5% → bascule env var `gemini-2.5-flash` (perd +60 ELO français, mais `forceTutoiement` rattrape déjà 90% selon AUDIT-UTILITE-7-APPELS-LLM.md).

Le Dev expert dit "60-70% du problème en 5 min". Vrai sur le gain. **Faux sur le délai et le scope**. Validation N profils + canary = doctrine non-négociable, déjà rappelée plusieurs fois dans la mémoire projet.
