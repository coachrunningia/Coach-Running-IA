# Patches CODE proposés (validés coach) — à valider avant déploiement

Date : 2026-05-16
Source : audit 125 plans + validation coach sur 12 plans patches base.

**⚠️ Principes directeurs (à ne PAS oublier en codant)**
- Aucun de ces patches ne doit **élargir le scope** ou contredire les règles produit déjà actées :
  - Aucune mention IMC/poids/minceur dans messages utilisateur
  - Aucun protocole nutrition chiffré
  - Hyrox = course uniquement
  - Pas de cross-training
  - Allures sur VMA actuelle, pas la cible
  - Sécurité > conversion (alerte + score honnête, jamais bloquant)
- Chaque patch doit être **isolé et minimal** — pas de refactor opportuniste.
- Cohérence : si un patch touche `calculatePeriodizationPlan`, ne pas modifier `calculateAllPaces` dans le même PR.
- **Risque principal à éviter** : surcharger le prompt Gemini avec des règles redondantes. Plusieurs de ces patches s'appliquent en post-processing ou en input du `calculatePeriodizationPlan`, **pas dans le prompt LLM**.

---

## Patch 1 — [CRITIQUE] Re-bind niveau effectif sur chronos

### Constat
3 cas observés (Bruno, Nanarebelle, Sacha) où le niveau auto-déclaré est **supérieur** au niveau réel déductible des chronos. Conséquence : allures EF/seuil calibrées sur le mauvais niveau → soit trop rapides (débutant·e à 67% VMA), soit trop lentes (Confirmé·e calibré comme Expert).

### Fix proposé
Dans `detectLevelFromData` (`geminiService.ts`), si chronos saisis cohérents → écraser `data.level` par le niveau effectif déduit AVANT d'utiliser `data.level` pour le calcul des paces et de la périodisation.

Règle :
- Si chronos donnent niveau > level déclaré : on prend chronos (ex : amateur se sous-estime → on lui donne ses vraies allures)
- Si chronos donnent niveau < level déclaré : on prend chronos (= cas Bruno/Sacha) ET on logge un warning pour transparence

### Risque / contre-indication
- ⚠️ Si chronos très anciens et non plus représentatifs (ex : "j'ai fait 18min sur 5k il y a 10 ans") → re-bind peut induire des allures trop rapides aujourd'hui. **Mitigation** : ce cas est couvert par `getBestVMAEstimate` qui filtre les chronos aberrants ; le niveau effectif suit la VMA recalculée.
- ⚠️ Aucun impact sur le prompt LLM (le niveau passé à Gemini change mais pas la structure des règles).

### Effort estimé
~30 lignes dans `detectLevelFromData`.

---

## Patch 2 — [CRITIQUE] Bug durée affichée vs main set / nb cycles × durée

### Constat
2 cas observés (Nanarebelle, Sacha) où :
- Nanarebelle Mercredi : "50 min" annoncés vs main set "40 cycles × 3 min = 120 min"
- Sacha Lundi : "52 min" annoncés vs main set "27 min" → réel ≈ 37 min

Le générateur LLM produit parfois une `duration` qui ne correspond ni au main set ni à la somme (échauf + main + retour).

### Fix proposé
Post-processing dans `enforceFullPlanConstraints` (ou ajout d'une fonction dédiée) :
1. Parser le main set pour extraire (a) "X cycles × Y min" si présent, (b) la durée explicite "Z min de course"
2. Recalculer `duration = warmup_min + main_min + cooldown_min`
3. Si écart > 10% entre durée affichée et recalculée → écraser `duration` par la valeur recalculée

### Risque / contre-indication
- ⚠️ Le parser doit être tolérant aux formats variés ("40 cycles", "20 fois", "8 répétitions de"). **Mitigation** : regex simple sur les patterns fréquents, fallback = somme échauf+main+retour si parsing échoue.
- ⚠️ Aucun impact prompt LLM.

### Effort estimé
~80 lignes (parser + fonction recalc).

---

## Patch 3 — [HAUTE] Cap score si blessure tendineuse active + trail > 40 km

### Constat
Adrien : tendinopathie Achille active déclarée, plan trail 63 km, score initial 82 BON. Aberrant — la blessure active est ignorée par le scoring.

### Fix proposé
Dans la fonction de scoring (`assessGoalFeasibility` ou équivalent), ajouter une règle hard :
```
if (hasInjury && injuryKeywords.match(/tendinopathie|tendinite|achille|fasciite/i)
    && goal.includes('Trail') && trailDistance > 40) {
  score = Math.min(score, 40);
  status = score < 35 ? 'RISQUÉ' : 'AMBITIEUX';
  // peakVol *= 0.80 dans le calculatePeriodizationPlan
}
```

### Risque / contre-indication
- ⚠️ Ne PAS bloquer la génération — uniquement plafonner score + réduire vol. L'utilisateur reste libre.
- ⚠️ Le réduction `peakVol *= 0,80` doit se faire dans `calculatePeriodizationPlan` au moment de l'application des réductions (déjà fait pour finisher/âge/IMC). **Risque** : double-réduction si la blessure était déjà comptée → vérifier qu'il n'y a pas de double facteur.
- ⚠️ Liste de keywords blessures à valider en coach (tendinopathie, tendinite, Achille, fasciite plantaire, périostite, syndrome essuie-glace).

### Effort estimé
~25 lignes scoring + 10 lignes dans réductions périodisation.

---

## Patch 4 — [HAUTE] Cap ratio SL / volume hebdo en phase fondamentale

### Constat
Sacha : SL S1 = 15,65 km sur volume hebdo 43 km = ratio 33%. Norme coach en phase fondamentale = max 30%. La SL "tape déjà fort" alors qu'on est en S1.

### Fix proposé
Dans `enforceFullPlanConstraints` ou `calculatePeriodizationPlan`, en phase **fondamental** uniquement :
```
if (phase === 'fondamental' && slKm / weekVolume > 0.30) {
  slKm = Math.round(weekVolume * 0.30);
  duration adapted accordingly
}
```

### Risque / contre-indication
- ⚠️ Pour les profils avec gros currentWeeklyVolume (ex : Adrien 50 km/sem), 30% peut être restrictif. **Mitigation** : exception si `currentVolume * 0.4 > weekVolume * 0.3` → garder la valeur la plus haute des deux pour respecter le vécu du coureur.
- ⚠️ Phase spécifique : pas de cap (la SL peut monter à 35-40%).
- ⚠️ Aucun impact prompt LLM.

### Effort estimé
~20 lignes.

---

## Patch 5 — [MOYENNE] Cap score si délai marathon < 12 sem + 1ère fois

### Constat
Hippolyte : marathon 3h15 en 7 sem, score 75 BON. Aberrant — 7 sem = délai d'affûtage, pas de prépa marathon.

### Fix proposé
Dans le scoring :
```
const hasMarathonExp = !!recentRaceTimes?.distanceMarathon;
if (subGoal.includes('Marathon') && durationWeeks < 12 && !hasMarathonExp) {
  score = Math.min(score, 35);
  status = 'RISQUÉ';
}
```
Idem pour semi <10 sem, ultra <20 sem.

### Risque / contre-indication
- ⚠️ Ne pas pénaliser un coureur qui a déjà fait des marathons (juste préparation reduce/affûtage) → la condition `!hasMarathonExp` est essentielle.
- ⚠️ Pas de modif prompt LLM.

### Effort estimé
~15 lignes scoring.

---

## Patch 6 — [MOYENNE] Cap score Hyrox target chrono + niveau débutant

### Constat
Soumaya : débutante visant 1h05 Hyrox, score 80 BON. Cible irréaliste pour profil débutant.

### Fix proposé
```
if (goal.includes('Hyrox') && targetTime && level === 'Débutant (0-1 an)') {
  // estimer si targetTime < 1h15 → cap score
  const targetMinutes = parseTimeToMinutes(targetTime);
  if (targetMinutes < 75) {
    score = Math.min(score, 60);
    status = 'AMBITIEUX';
  }
}
```

### Risque / contre-indication
- ⚠️ Pas de modif prompt LLM.
- ⚠️ Seuil 1h15 à valider coach (typique = finisher amateur 1h20-1h30).

### Effort estimé
~15 lignes.

---

## Patch 7 — [MOYENNE] Template conseils tendinopathie : drop chaussure

### Constat
Adrien (tendinopathie Achille) : aucune mention de chaussures à drop élevé (≥ 8 mm) dans les conseils des sessions.

### Fix proposé
Ajouter dans le prompt système (section "conseils blessures") une règle :
```
Si tendinopathie Achille active déclarée :
- Mentionner dans le conseil de la première séance qualité S1-S4 : "Privilégie une chaussure à drop élevé (≥ 8 mm) et amorti renforcé pour décharger ton tendon d'Achille."
- Mentionner dans le conseil de la SL : "Échauffement long (15 min footing + 10 min mobilité cheville/mollet) obligatoire avant toute SL."
```

### Risque / contre-indication
- ⚠️ **C'est le seul patch qui touche au prompt LLM**. Il faut le formuler comme une règle conditionnelle pour ne pas alourdir le prompt sur tous les profils.
- ⚠️ Mitigation : section "conseils contextuels blessures" déjà dans le prompt, on étend cette section sans la dupliquer ailleurs.
- ⚠️ Risque marginal de contre-indication avec la règle "scope course uniquement" : la mention chaussure est purement matérielle, pas de cross-training.

### Effort estimé
~10 lignes prompt + tests sur 3-4 profils tendinopathiques.

---

## Sanity-check parallèle (pas un patch — juste un test)

Sur 1-2 plans complets régénérés post-patches, vérifier :
- Test intermédiaire (10 km à mi-prépa pour Bruno/Hippolyte/Sacha)
- Séances qualité spécifiques (10×400 m VMA pour Lukas en S5-S6)
- Renfo détaillé par phase pour Nanarebelle
- SL peak adéquate pour Karine (ultra 105 km : 35-45 km en S18-S20)
- Tests trail pour Christophe (sortie 25 km / 1500 D+ en S12)

→ Si ces éléments sont déjà bien gérés par le moteur actuel, **pas de patch supplémentaire nécessaire**.

---

## Ordre de déploiement recommandé

1. **Patch 1** (re-bind niveau) — critique, impact systémique 25% des plans
2. **Patch 2** (bug durée) — critique, perte de confiance produit
3. **Patch 3** (blessure tendineuse trail) — sécurité utilisateur
4. **Patch 4** (cap SL ratio fondamental)
5. **Patches 5/6** (caps score délai aberrant)
6. **Patch 7** (template conseils tendinopathie) — dernier, car touche prompt LLM

Chaque patch en PR séparée, tests sur 5-10 profils variés avant merge.
