# Challenge dev senior — Script patch Olivier 126 km
Date : 2026-05-23

## Verdict global
**CORRECTIONS REQUISES** — Le script est bien structuré (backup, dry-run, helpers Firestore, vérif post-patch) mais comporte **2 risques P0 bloquants** (détection "vécu" heuristique, write-back complet de `weeks` qui ignore le signal Strava) et **3 P1 importants** (resync `weeklyVolumes` au prochain `generateRemainingWeeks`, faux positif regex sur cooldown/advice, fragilité vérif post-patch). Pas d'exec tant que P0 non patchés.

## Risques P0 (bloquants)

### P0-1 — Détection "vécu vs non-vécu" purement heuristique (L172)
Le code utilise `weekIdx === 0 && sessionIdx < (week.sessions.length - 1)` comme proxy "séance S1 vécue". **Faux** dans plusieurs cas :
- Si `frequency=5` produit 5 sessions + 1 renfo = 6 sessions → `sessionIdx 4` (la SL Dim donc dernière utile course) devient `length-1=5` (la dernière). OK par chance, mais aucune garantie d'ordre.
- Si LLM met SL en idx 0 (Lundi placé par `enforceSLDay` après coup) → notre Vélo Dim peut être à idx ≠ 4.
- **Signal robuste existant ignoré** : `session.feedback?.completed === true` est le marqueur officiel dans App.tsx (L291, L644, L1081). Le script aurait dû filtrer là-dessus.

Risque concret : si l'ordre des sessions Olivier dans Firestore diffère de l'hypothèse "vélo = dernière session", on patche par accident une séance vécue Lun-Ven OU on rate la vélo Dim.

### P0-2 — Le `weeks` est ré-envoyé EN ENTIER avec `updateMask=weeks` (L188, L228-230)
Le PATCH Firestore avec `updateMask.fieldPaths=weeks` **remplace l'array `weeks` complet** par notre version. Donc :
- Tout `feedback.stravaData` / `feedback.rpe` / `feedback.completedAt` que Olivier aurait ajouté entre le fetch (ligne 71) et le patch (ligne 231) **est écrasé silencieusement** (race condition).
- Tout champ caché de session non-mappé par `parseFs` (ex : nouveaux flags ajoutés par d'autres jobs) serait préservé via le re-encode `toFs(plan.weeks)`... sauf que les helpers `parseFs/toFs` ne savent pas faire `geoPointValue`, `referenceValue`, `bytesValue` → silencieusement remplacés par `{stringValue: String(v)}` (L66).

Le risque race-condition est faible (plan utilisé par une seule personne, et S1 Lun-Ven déjà vécue donc feedback fait), mais la **doctrine `feedback_input_client_obligatoire`** est en jeu : si Olivier a marqué un RPE entre fetch et patch, on l'écrase.

## Risques P1 (importants)

### P1-1 — `weeklyVolumes` sera ré-écrasé par `generateRemainingWeeks` au prochain trigger
`src/services/geminiService.ts:2085-2099` resync `weeklyVolumes[weekIdx]` depuis la somme des sessions (seuil 2 km) DANS `enforceWeekConstraints`, lui-même appelé par `generateRemainingWeeks` (L5580, L5635). Olivier est en `isPreview:true`, `fullPlanGenerated:false` → la prochaine fois qu'il déclenche la génération complète, **nos `[30,35,40,30,38,44,50,38,...,80,...]` seront remplacés par la somme réelle des sessions générées par le LLM**, qui n'ira probablement pas à 80 km/sem (puisque le LLM réutilise `ctx.periodizationPlan.weeklyVolumes` comme cible, donc on espère qu'il génère vers 80... mais l'autre direction : si LLM génère moins, on retombe sous 80).

Conclusion technique : patcher `weeklyVolumes` à 80 sans patcher les **distances de sessions** dans les semaines S10-S23 est une **modification cosmétique** qui ne survivra pas au prochain `generateRemainingWeeks`. Soit on accepte ce risque (le user déclenche full generation et le LLM régénère cohérent), soit on documente que ce patch est éphémère.

### P1-2 — Regex `isVelo` (L163-164) — faux positifs sur cooldown/advice
La regex teste UNIQUEMENT `session.title` et `session.mainSet`. Mais d'autres champs peuvent contenir "vélo" sans que la séance soit du cross-training :
- `session.cooldown` : "10 min vélo home-trainer en récup" → non détecté → on ne patche pas → Vélo reste.
- `session.advice` : "tu peux compléter par du vélo léger" → non détecté → mauvaise persistance.

À l'inverse, **faux positif possible** : si `mainSet` contient "pédaler la foulée" (terme technique de pied), `/p[ée]dal/` matche → on transforme une séance course légitime en Repos.

### P1-3 — Vérif post-patch fragile (L259-261)
- `weeks[0].sessions[4]` suppose 5 sessions exactement → crash possible.
- Pas d'assertion sur non-régression `feedback.completed` (validation P0-2).
- `Math.max(...arr_vide)` = `-Infinity` → log trompeur. Couvert par Modif #3.

### P1-4 — `updateMask.fieldPaths=weeks` au niveau racine (pas chirurgical)
Le path `weeks` réécrit l'array entier. Idéal : `updateMask.fieldPaths=weeks.0.sessions.4` chirurgical → pas de race-condition, pas d'écrasement de champs non-mappés par `parseFs/toFs` (qui ne gèrent pas geoPointValue/referenceValue/bytesValue). Effort : 30 min. Acceptable pour ce patch one-shot, mais à noter.

## Risques P2 (raffinement)

- **P2-1** — `daysSinceStart > 7` (L96-98) ne fait que warn, devrait exit. Couvert par Modif #4.
- **P2-2** — Pas de `try/catch` sur `fs.writeFileSync` backup (L82). Mineur, throw avant patch = safe.
- **P2-3** — Pas de `--confirm` interactif pour exec. Acceptable (Romane gère manuellement).
- **P2-4** — `Math.max(...arr)` (L216, L257) crashe sur array vide. Couvert par Modif #3.

## Points forts du script

1. Backup obligatoire (L80-83) bien fait, JSON parseable, timestamp dans nom.
2. Dry-run (L36, L221-224) clair, exit 0 sans patch.
3. Helpers `parseFs/toFs` corrects sur les cas usuels (string/int/double/bool/array/map/null).
4. Sanity check date (L88-98) protège contre exec sur plan pas commencé.
5. Détection vélo défense en profondeur : `type === 'Récupération' AND title/mainSet match` évite faux positifs feasibility/welcome.
6. Structure Firestore correcte : `weeklyVolumes` confirmé uniquement sous `generationContext.periodizationPlan` (vérifié sur backup-ambre — pas de duplicata top-level).
7. Commentaires inline doctrines respectent `feedback_chaque_ligne_justifiee`.
8. UpdateMask présent (L229) — pas un full doc replace.

## Modifications EXACTES à apporter avant exec

### Modif #1 — Utiliser `feedback.completed` au lieu de l'index heuristique
**Lignes** : 169-176
**Avant** :
```js
// S1 (weekIdx=0) : session vécue Lun-Ven = NO TOUCH (doctrine).
// Seule la session Vélo S1 (Dim, dernière séance = index 4) est patchable.
// Pour S1, on patche QUE si c'est la dernière session (Dim non vécu).
if (weekIdx === 0 && sessionIdx < (week.sessions.length - 1)) {
  console.log(`  ⚠️ S1 session ${sessionIdx} vélo détecté mais vécue (J<7) — NO TOUCH doctrine`);
  return session;
}
```
**Après** :
```js
// Signal robuste : feedback.completed === true marque une séance vécue
// (cf. App.tsx L291, L644, L1081 — c'est le marqueur officiel utilisé partout
// dans le code pour distinguer vécu vs preview). Doctrine
// `feedback_patch_live_plans_jour_seulement` : on ne touche JAMAIS à une
// séance avec feedback.completed=true, même si la regex vélo matche.
if (session.feedback?.completed === true) {
  console.log(`  ⚠️ S${weekIdx+1} session ${sessionIdx+1} "${session.title}" vélo détecté mais vécue (feedback.completed=true) — NO TOUCH doctrine`);
  return session;
}
```
**Pourquoi** : élimine la dépendance à l'ordre des sessions, robuste si LLM réordonne, conforme doctrine.

### Modif #2 — Étendre la regex aux champs cooldown/advice + retirer `p[ée]dal`
**Lignes** : 162-165
**Avant** :
```js
const isVelo = session.type === 'Récupération' && (
  /v[ée]lo|cyclisme|cycling|bike/i.test(session.title || '') ||
  /v[ée]lo|cyclisme|cycling|bike|p[ée]dal/i.test(session.mainSet || '')
);
```
**Après** :
```js
// Détection vélo : type=Récupération + mention vélo dans title/mainSet/cooldown/advice.
// On RETIRE `p[ée]dal` pour éviter faux positif "pédaler la foulée" (terme course
// légitime). On ajoute cooldown/advice pour ne pas rater les cas où le LLM
// place "complète par 20 min de vélo" dans le cooldown.
const VELO_RE = /v[ée]lo|cyclisme|cycling|bike|home.?trainer|elliptique|natation/i;
const isVelo = session.type === 'Récupération' && (
  VELO_RE.test(session.title || '') ||
  VELO_RE.test(session.mainSet || '') ||
  VELO_RE.test(session.cooldown || '') ||
  VELO_RE.test(session.advice || '')
);
```
**Pourquoi** : couverture cross-training élargie (doctrine `feedback_coach_running_ia_que_course` = QUE course), zéro faux positif "pédal", défense en profondeur sur tous les champs textuels.

### Modif #3 — Vérif post-patch robuste + assertion S1 vécue intacte
**Lignes** : 249-261
**Avant** :
```js
const verifVeloRemaining = verifPlan.weeks.reduce((acc, w) => {
  return acc + (w.sessions || []).filter(s =>
    s.type === 'Récupération' && /v[ée]lo|cyclisme/i.test(s.title || '')
  ).length;
}, 0);

console.log(`\n🔍 VÉRIFICATION POST-PATCH :`);
console.log(`  - welcomeMessage updated : ${verifPlan.welcomeMessage?.length} chars`);
console.log(`  - weeklyVolumes pic : ${Math.max(...(verifPlan.generationContext?.periodizationPlan?.weeklyVolumes || []))} km`);
console.log(`  - Séances Vélo restantes : ${verifVeloRemaining} (doit être 0)`);
console.log(`  - S1 J1 Lun (vécu) inchangé : ${verifPlan.weeks[0].sessions[0].title}`);
console.log(`  - S1 Dim (patché) : ${verifPlan.weeks[0].sessions[4].title}`);
console.log(`  - S2 Dim (patché) : ${verifPlan.weeks[1].sessions[4].title}`);
```
**Après** :
```js
// Régression check : aucune séance vécue ne doit avoir été modifiée.
// On stocke un snapshot des feedback.completed AVANT patch et on compare.
// (À placer ligne ~80, après le fetch initial, avant le backup) :
//   const completedSnapshot = (plan.weeks || []).flatMap((w, wi) =>
//     (w.sessions || []).map((s, si) => ({
//       wi, si, completed: s.feedback?.completed === true,
//       title: s.title, type: s.type,
//     }))
//   ).filter(x => x.completed);

const verifVeloRemaining = (verifPlan.weeks || []).reduce((acc, w) => {
  return acc + (w.sessions || []).filter(s =>
    s.type === 'Récupération' && /v[ée]lo|cyclisme|cycling|bike|home.?trainer/i.test(`${s.title||''} ${s.mainSet||''} ${s.cooldown||''} ${s.advice||''}`)
  ).length;
}, 0);

const verifVolumes = verifPlan.generationContext?.periodizationPlan?.weeklyVolumes || [];
const peak = verifVolumes.length ? Math.max(...verifVolumes) : null;

// Assertion : toute séance avec feedback.completed=true doit avoir conservé son type et son title.
let regressionsCompleted = 0;
for (const snap of completedSnapshot) {
  const cur = verifPlan.weeks?.[snap.wi]?.sessions?.[snap.si];
  if (!cur || cur.type !== snap.type || cur.title !== snap.title) {
    regressionsCompleted++;
    console.error(`  ❌ REGRESSION S${snap.wi+1} sess${snap.si+1} : "${snap.title}" (${snap.type}) → "${cur?.title}" (${cur?.type})`);
  }
}

console.log(`\n🔍 VÉRIFICATION POST-PATCH :`);
console.log(`  - welcomeMessage updated : ${verifPlan.welcomeMessage?.length || 0} chars`);
console.log(`  - weeklyVolumes pic : ${peak !== null ? peak + ' km' : 'ARRAY VIDE ❌'}`);
console.log(`  - Séances Vélo restantes : ${verifVeloRemaining} (doit être 0)`);
console.log(`  - Séances vécues régressées : ${regressionsCompleted} (doit être 0)`);
console.log(`  - S1 Lun (vécu) title : ${verifPlan.weeks?.[0]?.sessions?.[0]?.title || 'N/A'}`);
console.log(`  - S1 dernière session : ${verifPlan.weeks?.[0]?.sessions?.slice(-1)[0]?.title || 'N/A'}`);
console.log(`  - S2 dernière session : ${verifPlan.weeks?.[1]?.sessions?.slice(-1)[0]?.title || 'N/A'}`);

if (verifVeloRemaining > 0 || regressionsCompleted > 0 || peak !== 80) {
  console.error(`\n❌ POST-PATCH INVALIDE — vérifier manuellement avant de fermer le ticket.`);
  process.exit(2);
}
```
**Pourquoi** : assertion forte sur non-régression des séances vécues (P0-2), tolère absence de session 4, log informatif sur le dernier session de la semaine (qui correspond au Dim peu importe l'index).

### Modif #4 — Hardener `daysSinceStart > 7` en erreur fatale par défaut, sauf `--force-s2`
**Lignes** : 96-98
**Avant** :
```js
if (daysSinceStart > 7) {
  console.error(`⚠️ Plan vécu depuis ${daysSinceStart}j — patch S2+ uniquement, doctrine S1 vécue NO TOUCH`);
}
```
**Après** :
```js
// Plan vécu > 7j : S2+ peut être en cours. Doctrine `feedback_patch_live_plans_jour_seulement`
// : on doit s'arrêter sauf override explicite. Aujourd'hui 23/05 startDate 18/05 → 5j → OK.
if (daysSinceStart > 7 && !process.argv.includes('--force-s2-aware')) {
  console.error(`❌ Plan vécu depuis ${daysSinceStart}j — S2+ peut être en cours. Relancer avec --force-s2-aware si vraiment voulu (avec audit feedback.completed renforcé).`);
  process.exit(1);
}
```
**Pourquoi** : transforme un warn en bloquant. Aujourd'hui non-déclenché (5j) mais protège contre re-run dans 1 semaine si Romane veut re-patcher.

### Modif #5 — Commentaire sur resync futur `weeklyVolumes`
**Ligne 124**, ajouter avant `NEW_WEEKLY_VOLUMES` :
```js
// ⚠️ Ces valeurs sont CIBLES. Au prochain `generateRemainingWeeks`,
// `enforceWeekConstraints` (geminiService.ts:2085) resync weeklyVolumes[i]
// depuis sum(sessions.distance) (seuil 2km). LLM utilise ces cibles comme
// objectif (geminiService.ts:6248,6421) donc devrait viser 80, mais
// pas garanti. Patch durable = patcher aussi distances S10-S23.
```
**Pourquoi** : doctrine `feedback_chaque_ligne_justifiee`.

### Modif #6 — Snapshot des séances vécues avant patch
À insérer entre L78 et L80 (avant backup) :
```js
const completedSnapshot = (plan.weeks || []).flatMap((w, wi) =>
  (w.sessions || []).map((s, si) => ({
    wi, si, title: s.title, type: s.type,
    completed: s.feedback?.completed === true,
  }))
).filter(x => x.completed);
console.log(`📸 Snapshot ${completedSnapshot.length} séances vécues`);
```
**Pourquoi** : prérequis Modif #3.

## Tests minimaux à faire AVANT exec

1. **Dry-run** : `node patch-olivier-126km-live.mjs --dry` → log montre :
   - Backup créé (vérifier que le fichier existe et est non-vide)
   - Snapshot N séances vécues (attendu 4 : Lun/Mer/Jeu/Ven)
   - 9 séances vélo détectées
   - 0 séance vécue marquée "vélo détecté mais vécue" (les Lun-Ven ne sont PAS Vélo, donc 0)
   - Pic weeklyVolumes 80
2. **Inspecter le backup généré** : `jq '.weeks[0].sessions | map({type, title, feedback: .feedback.completed})' backup-olivier-*.json` → confirmer 4 sessions avec `feedback.completed:true` + 1 Dim sans feedback.
3. **Test régression regex** : grep `pédal|natation` dans backup → vérifier aucune session course légitime ne contiendrait ces termes.
4. **Diff entre `updates.weeks` et `plan.weeks` en mode dry** : ajouter un log temporaire `console.log(JSON.stringify(newWeeks).length, JSON.stringify(plan.weeks).length)` → confirmer écart cohérent (delta lié aux 9 sessions transformées).
5. **Test "no-op idempotent"** : relancer le script en dry après un premier patch → 0 vélo détecté, 0 patch attendu. Confirme l'idempotence.

## Conditions GO EXEC

- [ ] Modif #1 appliquée (`feedback.completed` au lieu d'index)
- [ ] Modif #2 appliquée (regex étendue + `pédal` retiré)
- [ ] Modif #3 appliquée (vérif post-patch avec assertion régression)
- [ ] Modif #4 appliquée (`daysSinceStart > 7` = exit 1)
- [ ] Modif #5 appliquée (commentaire sur resync futur)
- [ ] Modif #6 appliquée (snapshot avant backup)
- [ ] Tests 1-5 passés en dry-run sans erreur
- [ ] Coach trail ultra a validé le contenu (welcomeMessage + weeklyVolumes) en parallèle
- [ ] Romane confirme `isPreview=true && fullPlanGenerated=false` côté Olivier (sinon scope différent)
- [ ] Au moment de l'exec : vérifier qu'Olivier n'est pas connecté actuellement (réduit risque race-condition Modif P0-2)

**Sans ces 10 checks, NO GO.**
