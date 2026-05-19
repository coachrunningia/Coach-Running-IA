# Audit batch renfo manquant
Date: 2026-05-18

## Contexte

Bug remonté via georgeslor1@gmail.com (plan 1779089493075, freq=5) : S1 sans aucun renfo.
Doctrine : freq X = (X-1) course + 1 renfo (renfo obligatoire dès freq=2 dans le code L2249 de geminiService.ts).
Le prompt L3714 instruit Gemini "OBLIGATOIRE : 1 séance Renforcement par semaine", mais **aucune fonction enforce ne FORCE l'ajout si Gemini l'oublie**.

## Audit code — enforceWeekConstraints / enforceFullPlanConstraints

Inspection de `src/services/geminiService.ts` :
- **enforceWeekConstraints (L1230)** : traite SL caps, proportion, durée, fractionné. Renforcement → `if (s.type === 'Renforcement') return;` (SKIP uniquement, **JAMAIS d'injection**).
- **enforceFullPlanConstraints (L1820)** : traite affûtage cross-semaines, progression +15%, re-cap sessions. Renforcement → SKIP. **Aucune injection.**
- **Conclusion code** : si Gemini omet le renfo, aucun garde-fou ne le rattrape côté serveur.

## Synthèse

- Total plans audités : **39**
- Période : **2026-05-15 → 2026-05-18**
- Plans avec renfo S1 MANQUANT (freq >=3) : **0 (0.0%)**
- Plans avec renfo S1 MANQUANT (toutes freq >=2) : **0 (0.0%)**

### Baseline (avant deploy J3 du 17/05) vs Post J3

| Période | Total plans | Sans renfo S1 (freq>=3) | % |
|---|---|---|---|
| Baseline (15-16 mai) | 22 | 0 | 0.0% |
| Post J3 (>=17 mai) | 17 | 0 | 0.0% |
| Δ post J3 vs baseline | | | 0.0 pp |

## Distribution par jour

| Date | Total | Sans renfo S1 (freq>=3) | Sans renfo S1 (any freq) | % |
|---|---|---|---|---|
| 2026-05-15 | 9 | 0 | 0 | 0% |
| 2026-05-16 | 13 | 0 | 0 | 0% |
| 2026-05-17 | 11 | 0 | 0 | 0% |
| 2026-05-18 | 6 | 0 | 0 | 0% |

## Distribution par frequency

| Freq | Total | Sans renfo S1 | % |
|---|---|---|---|
| 2 | 3 | 0 | 0% |
| 3 | 15 | 0 | 0% |
| 4 | 9 | 0 | 0% |
| 5 | 8 | 0 | 0% |
| 6 | 4 | 0 | 0% |

## Liste des plans impactés (freq >=3, S1 sans renfo) — top 50

| Email | Plan ID | Date | Freq | Goal | isPreview | fullPlan | S1 types |
|---|---|---|---|---|---|---|---|

## Audit historique élargi (TOUS les plans Firestore)

Pour valider qu'il ne s'agit pas d'un bug latent rare, audit étendu sur les 1154 plans en base :

| Mois | Total plans | S1 sans renfo | % |
|---|---|---|---|
| 2026-02 | 323 | 23 | 7.1% |
| 2026-03 | 576 | 1 | 0.2% |
| 2026-04 | 121 | 0 | 0.0% |
| 2026-05 | 134 | 0 | 0.0% |
| **TOTAL** | **1154** | **24** | **2.1%** |

Les 24 plans sans renfo S1 sont tous concentrés en **février 2026** (23/24) plus 1 en mars. Aucun cas en avril/mai. Types observés à l'époque : "Endurance Fondamentale", "Endurance", "Cross-training", "Marche/Course", "Récupération Active" → vocabulaire pré-doctrine actuelle, plans générés avant la consolidation prompt.

## Vérification cas georgeslor1 (cité dans le brief)

Plan `1779089493075` (preview, freq=5, Marathon, createdAt=2026-05-18T07:31:33) → **S1 CONTIENT bien un renfo** : `[Sortie Longue, Jogging, Renforcement, Jogging, Jogging]`.

La prémisse du brief ("Sa S1 ne contient AUCUNE séance renfo") est **incorrecte** dans l'état actuel des données Firestore. Hypothèses :
1. Le plan a été régénéré entre l'observation initiale et cet audit.
2. L'observation initiale s'appuyait sur un rendu UI buggé (affichage côté front qui masque le renfo).
3. Confusion avec un autre plan.

## Verdict

- Régression J3 : **NON**
- Diagnostic : **RAS sur la période 2026-05-15 → 2026-05-18 (0/39 plans sans renfo S1)**
- Aucun bug actif depuis avril 2026. Le problème historique de février 2026 (7%) a disparu après refonte du prompt (vocabulaire EF/Cross-training → Jogging/Renforcement).
- Pattern : (aucun pattern net détecté sur la fenêtre demandée)
- Action recommandée : **AUCUNE régénération nécessaire. Pas de patch urgent.**
- Garde-fou code recommandé en préventif : ajouter une INJECTION renfo dans `enforceWeekConstraints` si Gemini en oublie un (cf section Patch ci-dessous) — utile pour robustesse future, pas urgence J3.

## Patch recommandé

Ajouter dans `enforceWeekConstraints` (geminiService.ts L1230) un bloc d'INJECTION :

```ts
// --- Garde-fou : INJECTER 1 renfo par semaine si manquant ---
// Doctrine : freq X = (X-1) course + 1 renfo (cf L3714 du prompt)
// Sans ce garde-fou, si Gemini omet le renfo, aucune correction côté code.
const hasRenfo = week.sessions.some((s: any) => s.type === 'Renforcement');
const freq = questionnaireData?.frequency || 0;
if (!hasRenfo && freq >= 2) {
  // Construire séance renfo via buildRenfoMainSet (déjà importé L5)
  // + insérer sur jour OFF ou remplacer footing le moins prioritaire
  // (logique à définir avec Romane)
}
```

## Données brutes

Voir `audit-renfo-missing.json` pour la liste complète et les détails par plan.