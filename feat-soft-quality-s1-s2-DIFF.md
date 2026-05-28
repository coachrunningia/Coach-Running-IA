# Feature — Séances qualité douces S1/S2 pour profils Inter+ cv ≥ 25 km/sem

**Demande Romane 29/05/2026 00:30** : profils Intermédiaire+ avec cv assez important frustrés de voir aucune séance qualité en S1/S2. Ajouter possibilité 1 séance qualité DOUCE par sem dès S1/S2.

**Doctrine validée Romane** :
- Critère : cv ≥ **25 km/sem** (toutes distances)
- Pas de filtre âge
- Pas de filtre Finisher
- Filtre level Inter+ (déjà existant via `!isBeginnerLevel`)
- Garder filtres existants : `!needsMarcheCourse`, `fitnessSubGoal ≠ 'Reprendre après une pause'`, `lastActivity ≠ 'Plus de 6 mois'`
- **MODULATION Marathon cv < 35** → strides only (Pfitzinger 18/55 plancher base 40 mpw). Coach FFA validé.

## Wording final corrigé par Coach FFA 25 ans (29/05 01:00)

```
⚠️ NIVEAU INTERMÉDIAIRE+ / cv ≥ 25 km/sem : DÈS S1, 1 séance par semaine PEUT inclure
du travail neuromusculaire DOUX (sensation, jamais chrono) :
  • Strides — footing EF 40-50 min + 6 à 8 lignes droites accélérées 80-100 m en fin
    (allure ~3 km, JAMAIS sprint), récup marche retour complète 60-90 s. Dès S1.
  • OU Fartlek souple — footing EF 35-45 min avec 5-6 accélérations libres de 30-45 s
    à sensation "allure 10 km confortable", récup trot 1'30-2'. Dès S2.
  • OU Progression douce sur SL — 8-10 km EF puis 2 km à allure Marathon "facile"
    (parler en phrases courtes), retour calme 1 km. Dès S2, jamais S1.
EXCEPTION Marathon cv < 35 km/sem : strides UNIQUEMENT (pas fartlek ni progression).
JAMAIS de seuil, tempo soutenu, VMA courte (200/400), ni fractionné long en S1-S2.
Une seule séance qualité douce par semaine. Si fatigue : remplacer par EF.
```

## Régex finale corrigée par Coach FFA (whitelist)

```ts
const isSoftQuality =
  /stride|ligne[s]?\s*droite[s]?|gamme[s]?\s*de\s*vitesse|accélération[s]?\s*libre[s]?|fartlek\s*(souple|libre|court)|progression\s*douce|allure\s*marathon\s*(facile|douce)/i
  .test(title);

// Sous-détection Strides (pour modulation Marathon cv<35)
const isStrides =
  /stride|ligne[s]?\s*droite[s]?|gamme[s]?\s*de\s*vitesse|accélération[s]?\s*libre[s]?/i
  .test(title);
```

## Diff exact à appliquer (7 lignes ajoutées, 2 modifiées)

### Zone 1 — Prompt builder (`geminiService.ts:4740-4746`)

**Avant** :
```ts
${(!isBeginnerLevel && !needsMarcheCourse && data.frequency >= 4 && data.fitnessSubGoal !== 'Reprendre après une pause' && data.lastActivity !== 'Plus de 6 mois') ?
     `⚠️ NIVEAU CONFIRMÉ+ / 4+ SÉANCES : à partir de la SEMAINE 3 du fondamental, 1 séance par semaine DOIT inclure du travail de vitesse léger :
       • Fartlek libre (5-6 accélérations de 30s à allure 10km, récup 1min30 trottée) — type "Fractionné", intensité "Modéré"
       • OU Footing avec gammes de vitesse (8-10 lignes droites de 80-100m en fin de footing)
       • OU Côtes courtes (6-8 × 20s en côte, récup descente trottée)
       Cela maintient les qualités neuromusculaires sans casser la base aérobie. Les semaines 1-2 restent 100% EF.` :
     `PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale.`}
```

**Après** :
```ts
${(!isBeginnerLevel && !needsMarcheCourse && (data.currentWeeklyVolume ?? 0) >= 25 && data.fitnessSubGoal !== 'Reprendre après une pause' && data.lastActivity !== 'Plus de 6 mois') ?
     `⚠️ NIVEAU INTERMÉDIAIRE+ / cv ≥ 25 km/sem : DÈS S1 ou S2, 1 séance par semaine PEUT inclure du travail de qualité DOUX :
       • Strides (footing EF + 6 lignes droites accélérées 80m en fin, récup marche retour)
       • OU VMA douce (échauffement 20 min + 6×200m allure VMA récup 1'30 marche + 10 min retour calme)
       • OU Progression sur SL (10 km EF + 2 km à allure Marathon doux, sans forcer)
       Cette séance reste DOUCE (sensation, pas chrono). PAS de seuil/tempo/fractionné long en S1-S2.` :
     `PAS de seuil, PAS de fractionné, PAS de VMA. Séances 100% endurance fondamentale.`}
```

**Changements** :
1. Condition : `data.frequency >= 4` → `(data.currentWeeklyVolume ?? 0) >= 25` (cv prime sur freq)
2. Title : `NIVEAU CONFIRMÉ+ / 4+ SÉANCES` → `NIVEAU INTERMÉDIAIRE+ / cv ≥ 25 km/sem`
3. Trigger : `à partir SEMAINE 3` → `DÈS S1 ou S2`
4. Verbe : `DOIT inclure` → `PEUT inclure` (plus souple)
5. Options : fartlek/lignes droites/côtes → strides/VMA douce 6×200m/progression SL
6. Suppression : `Les semaines 1-2 restent 100% EF` (contradiction nouvelle doctrine)

### Zone 2 — Safety net post-LLM (`geminiService.ts:1036-1054`)

**Avant** :
```ts
// Safety net : pas de seuil/fractionné/VMA en phase fondamentale ou récupération
const phase = (week.phase || '').toLowerCase();
if (phase === 'fondamental' || phase === 'recuperation') {
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement') return;
      const title = (s.title || '').toLowerCase();
      const isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === 'Fractionné';
      if (isSeuil && pacesObj) {
        console.log(`[PostProcess] Phase ${phase}: converting "${s.title}" to footing EF`);
        ...
      }
    });
}
```

**Après** :
```ts
// Safety net : pas de seuil/fractionné/VMA en phase fondamentale ou récupération
// EXCEPTION 29/05 Romane : qualité DOUCE (strides / VMA courte 6×200 / progression)
// autorisée UNIQUEMENT en fondamental (jamais en recuperation) pour profils cv ≥ 25 km/sem.
const phase = (week.phase || '').toLowerCase();
const cvForSoftQuality = (questionnaireData.currentWeeklyVolume ?? 0);
if (phase === 'fondamental' || phase === 'recuperation') {
    week.sessions.forEach((s: any) => {
      if (s.type === 'Renforcement') return;
      const title = (s.title || '').toLowerCase();
      const isSeuil = /seuil|fractionn|vma|intervalle|tempo/i.test(title) || s.type === 'Fractionné';
      const isSoftQuality = phase === 'fondamental' && /stride|ligne droite|6\s*[x×]\s*200|progression|vma douce/i.test(title);
      const eligibleSoft = isSoftQuality && cvForSoftQuality >= 25;
      if (isSeuil && !eligibleSoft && pacesObj) {
        console.log(`[PostProcess] Phase ${phase}: converting "${s.title}" to footing EF`);
        ...
      }
    });
}
```

**Changements** :
1. Ajout 3 lignes commentaires explicatifs
2. Ajout `const cvForSoftQuality = ...` (lecture data)
3. Ajout `const isSoftQuality = ...` (détection titre soft via regex)
4. Ajout `const eligibleSoft = ...` (combinaison conditions)
5. Modification condition : `if (isSeuil && pacesObj)` → `if (isSeuil && !eligibleSoft && pacesObj)`

## Effet attendu

| Profil | Avant | Après |
|---|---|---|
| Cyrielle Semi Déb cv 2 | Footings EF only | Identique ✅ (cv < 25) |
| Ericsson Marathon Expert cv 60 | Footings EF S1-S2 | Peut avoir 1 séance qualité douce ✅ |
| jeanluc 10K Conf 66a cv 35 | Footings EF S1-S2 | Peut avoir 1 séance qualité douce ✅ |
| Inter Marathon cv 22 | Footings EF | Identique ✅ (cv < 25) |
| Conf Trail Reprise après pause | Footings EF | Identique ✅ (filtre reprise) |
| Inter cv 30 + Finisher | Footings EF | Peut avoir 1 séance qualité douce ✅ (pas de filtre Finisher) |

## Tests prévus

5 tests Vitest unitaires + batterie 10 profils E2E LLM (réel Gemini).

## Effort total : 3h dev + 2h tests = demi-journée
