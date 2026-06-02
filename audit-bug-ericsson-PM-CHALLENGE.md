# PM CHALLENGE — Bug Ericsson 1779998376847 (28/05 19:59)

PM tech senior 15 ans SaaS LLM. Verdict sans complaisance. Analyse code confirmée par lecture (`geminiService.ts:4262-4297`, `:5083`, `:5202-5205`, `:2511-2546`, `planValidator.ts:404-417`, `:1170`).

---

## 1. Challenge analyse dev (verdict 5 causes)

| # | Cause dev | Verdict PM | Note |
|---|-----------|------------|------|
| 1 | `PREVIEW_RESPONSE_SCHEMA.sessions[]` sans `minItems` | **VALIDE** | Confirmé L4270-4291. `required` n'inclut PAS `sessions` non-vide. JSON Schema permet `[]` ou `[1 item]`. |
| 2 | Post-process tronque `>freq` mais ne complète pas `<freq` | **VALIDE et CRITIQUE** | L5202-5205 confirmé. Asymétrie inacceptable en prod. |
| 3 | `session_count` = `warning` → Layer 3 skip | **VALIDE** | L411 + L1170 confirmé. Doctrine inversée : structure cassée = warning, charge = error. C'est l'inverse qu'il faut. |
| 4 | `maxOutputTokens: 8192` saturé | **VALIDE — c'est probablement le détonateur** | L5083 = 8192 preview, L5835 = 65536 remaining. **Asymétrie x8** scandaleuse. Marathon Expert 24 sem × 6 sess × welcomeMessage 800c + safetyWarning + locationSuggestion + mainSet riche dépasse aisément 8192. |
| 5 | Vitest = faux positif (LLM jamais appelé) | **VALIDE** | Doctrine `validation_n_profils_avant_sprint` contournée pour F-18. **Angle mort répété** : Sprint G + F-17 v2 + F-18 + F-18.1 = 4 PRs en 36h sans run E2E. |

### 6e cause MANQUÉE par l'analyse dev (angle mort)

**6. Aucune détection de truncation Gemini** : pas de check `finishReason === 'MAX_TOKENS'` sur la réponse. Le code parse `response.text()` directement L5096-5098. Si Gemini sort `{"weeks":[{"sessions":[{...}` (tronqué), `JSON.parse` jette OU pire — accepte un objet partiel si la dernière clé a un guillemet fermant fortuit. **Bug silencieux par design.** C'est ça qui fait passer le plan en prod sans alarme.

**7. Layer 3 = skip silencieux** : `validateAndCorrectPlan` (planValidator L1185) ne se déclenche que si `allFlagged.length <= 5`. Un plan totalement cassé (24 sem warning) = `allFlagged=0` car warnings filtrés. **Le filet ne s'arme jamais quand il faudrait le plus.**

### Trigger F-18 : confirmation partielle

L'analyse dev pointe F-18 = +500 tokens prompt → saturation 8192. **Plausible mais non-prouvé sans replay**. Suspects co-conspirateurs :
- **F-17 paceRecalibration** : ajoute logique mais le prompt s'allonge peu. À écarter sauf preuve.
- **F-11 Gemini 3.1 pro preview** : si modèle changé, le tokenizer peut différer → comptage prompt obsolète. **À vérifier en P0.**
- **Cumul réel = prompt input + output** : Gemini compte les deux dans `maxOutputTokens` UNIQUEMENT pour l'output. Donc F-18 prompt input n'impacte PAS 8192 directement. **L'analyse dev a un bug logique ici.** Le vrai détonateur c'est que **l'output exigé** (welcomeMessage + safetyWarning F-18 + CTA + 6 sess) a grossi, pas le prompt.

**Verdict trigger** : F-18 a augmenté la **taille de l'output attendu** (instructions plus longues → Gemini génère plus de texte par séance + welcomeMessage). C'est ça qui sature 8192 output, pas l'input prompt. Nuance importante pour le fix.

---

## 2. Décision revert : **CONFIRM avec réserve**

REVERT F-18.1 + F-18 OK car :
- Ericsson bloqué, Cyrielle couverte par patch live → pas de régression user-facing
- Pas de validation E2E LLM → on ne sait pas combien d'autres plans sont cassés depuis 18:50

**MAIS** : le revert ne fixe PAS les 5 causes latentes (toutes pré-F-18). **Le revert achète du temps, ne résout rien.** Si on re-déploie n'importe quoi sans les fixes P0 ci-dessous, le bug reviendra au prochain prompt qui pousse l'output au-delà de 8192.

**Alternative rejetée** : patch chirurgical sans revert (bump 8192→16384 + minItems). Trop risqué à 22h sans tests E2E. Le revert est le bon move ce soir.

---

## 3. Roadmap priorisée

| Prio | Catégorie | Action | Effort | Risque si pas fait |
|------|-----------|--------|--------|-------------------|
| **P0** | G | Bump `maxOutputTokens: 8192 → 16384` preview (L5083, L5091) | 5 min | Bug se reproduit dès retry F-18 |
| **P0** | B | Ajouter `minItems: data.frequency` dynamique sur `sessions[]` du schema | 30 min | Plan freq=6 accepte 1 séance |
| **P0** | D | `session_count` mismatch → `severity: 'error'` (L411) | 5 min | Layer 3 ne se déclenche jamais |
| **P0** | G | Check `response.candidates[0].finishReason` après generateContent — si `MAX_TOKENS` → throw + alert | 20 min | Truncation silencieuse permanente |
| **P0** | A | Re-run batterie 10 profils diversifiés AVANT tout re-deploy | 1h | Régression invisible |
| **P1** | C | Logger `promptTokenCount` + `candidatesTokenCount` sur chaque appel Gemini (`response.usageMetadata`) | 1h | Aveugle sur budget |
| **P1** | C | Alert si `candidatesTokenCount > 0.85 * maxOutputTokens` | 30 min | Pas de signal proche-saturation |
| **P1** | B | Post-LLM : si `plan.weeks[0].sessions.length < data.frequency` → throw `IncompleteGeneration` + retry 1× | 1h | Le bug ericsson aurait été bloqué |
| **P1** | A | Tests E2E LLM nightly : 10 profils (Marathon×Semi×Trail×5k × Débutant/Inter/Expert) → assertions session_count, volume monotone, allure cohérence ±5% | 1 jour | F-18 retry sans filet |
| **P1** | E | Interdiction `gh pr merge --admin` sur main. Self-approve OK mais après CI vert E2E LLM | 15 min | Cumul PRs sans audit |
| **P1** | F | Sentry/console error sur `finishReason !== 'STOP'` + `session_count !== frequency` | 1h | Pas de visibilité prod |
| **P1** | D | Promouvoir `error` : missing_renfo, missing_recovery, structure de phase | 30 min | Filet inversé |
| **P2** | A | Snapshot regression : comparer chaque nouveau plan généré vs plan de référence stocké (diff session_count, pic, allure) | 2 jours | Régression silencieuse subtile |
| **P2** | F | Dashboard token budget Gemini (Grafana/Datadog) — rolling 7 jours | 1 jour | Pas de tendance |
| **P2** | E | 1 sprint = 1 PR — ou si plusieurs PRs, audit cumul prompt obligatoire (diff token count) | doc | Régressions cumulées |
| **P2** | G | Refacto : extraire `callGeminiWithGuards()` qui wrappe generateContent + finishReason + usageMetadata + retry | 1 jour | Code dupliqué = futurs bugs idem |
| **P2** | B | Schema validation côté code (Zod/Yup) post-Gemini — pas que confiance Gemini | 1 jour | Belt-and-suspenders |
| **P2** | A | Tests E2E sur preview ET remaining (les deux paths Gemini) | 1 jour | Bug remaining latent |

---

## 4. Plan d'exécution post-revert

### Ce soir (post-revert immédiat)
1. **Revert F-18.1 puis F-18** (dans cet ordre, sinon conflicts).
2. **Vérifier que main = état Sprint G + F-17 v2 stable**.
3. **Patch ericsson en live** (safety lock 22:10 déjà fait).
4. **Ne PAS retoucher au code ce soir.** Romane dort.

### Demain matin (P0 — 2h max)
1. Bump `maxOutputTokens: 16384` preview.
2. `session_count` → `error`.
3. `minItems` dynamique schema (note : Gemini ResponseSchema ne supporte pas `minItems` paramétré → fallback validation post-LLM L5170).
4. Check `finishReason === 'MAX_TOKENS'` → throw `GeminiTruncatedError`.
5. **Run 10 profils E2E manuel** (Marathon Expert freq6, Semi Inter freq4, Trail Débutant freq3, etc.).
6. Si vert : push P0 en main sous PR séparée avec CI.

### Mardi-Vendredi (P1 — sprint tech debt)
- E2E nightly CI (Vitest + script `test-e2e-vague-1-10profils.mjs` étendu)
- Logging token + alerts
- Promotion severity warnings → errors structure
- Retry logic si session_count mismatch
- Sentry sur finishReason

### Conditions pour retry F-18
F-18 NE doit PAS être re-tenté tant que :
- [ ] P0 mergés et déployés
- [ ] Tests E2E 10 profils verts (3 runs consécutifs)
- [ ] Logging token actif depuis ≥48h sans alert
- [ ] PR F-18 isolée (pas cumulée avec F-18.1) avec diff token estimé documenté
- [ ] Validation coach que motif Cyrielle (CTA regen IRRÉALISTE) tient toujours

### Sprint roadmap suggéré (2 sem tech debt avant prochain feature)
- **S1 (semaine 1-7 juin)** : P0 + P1 catégories A/B/C/D/G
- **S2 (semaine 8-14 juin)** : P1 E/F + P2 refacto callGemini + dashboard
- **Retry F-18** : 15 juin minimum si tout vert

---

## Angles morts de l'analyse dev à retenir

1. **Confusion input/output tokens** — F-18 n'impacte pas le budget 8192 (qui est output-only).
2. **Pas de mention `finishReason`** — c'est LE signal qui aurait dû lever l'alerte.
3. **Layer 3 auto-correction filtré <=5 weeks flagged** — quand TOUT est cassé, rien n'est flag → skip silencieux.
4. **Asymétrie 8192 vs 65536** preview/remaining jamais questionnée — révèle dette tech ancienne.
5. **Pas de test "fuzz" sur frequency × duration × goal** — 3×3×3 = 27 combos minimum, on en couvre <5.

Romane : revert ce soir, on attaque P0 demain 9h. Pas de feature avant 15 juin.
