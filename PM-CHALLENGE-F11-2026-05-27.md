# PM CHALLENGE F-11 — Migration `gemini-3-pro-preview` → `3.1-pro-preview` + Normalizer flaggedWeeks

**Date** : 2026-05-27
**Auteur** : PM Technique (challenge avant déploiement)
**Branche** : `feat/sprint-f-plus-bugs`
**Commit principal F-11** : `717b2d8`
**Working tree** : 1 modif non commitée (planValidator.ts + nouveau fichier test)

---

## Section 1 — Verdict global

# GO-CONDITIONNEL

La migration est **correcte sur le fond** (le 3-pro-preview est bien mort, 3.1-pro-preview est le successeur naturel, le normalizer corrige un défaut réel). Mais avant de pousser en prod il manque **deux choses non négociables** :

1. **Commit + test runtime du normalizer** (le fichier de test est untracked, les 11 tests vitest ne sont pas exécutés dans le commit `717b2d8`). Sans ça, la doctrine `feedback_chaque_ligne_justifiee` n'est pas respectée.
2. **Confirmation par lecture des logs prod Cloud Run** que la couche L2 review tombait bien en silent-fallback depuis le 19 mai (8 jours), pour valider le récit "AI review inutile sur 100 % des plans". Si ce n'est pas le cas, la priorité du fix change.

Une fois ces deux points faits → GO direct (le risque résiduel est faible et bien borné par le try/catch existant).

---

## Section 2 — Réponses Q1 / Q2 / Q3 / Q4

### Q1 — Le bug flaggedWeeks strings est-il NOUVEAU avec Pro 3.1 ?

**Investigation menée** :

- Lecture historique git : `gemini-3-pro` introduit Sprint 4 (commit `62416ec`, 19 mai 15:58). Suffixe `-preview` ajouté quelques heures plus tard par hotfix `35e20ab` (19 mai 17:10) suite à un 404 prod. **Donc `gemini-3-pro-preview` tournait en prod depuis le 19 mai**, soit 8 jours.
- Lecture du diff F-11 : aucun fix antérieur sur le format `flaggedWeeks`. La structure `cw.weekNumber === w.weekNumber` (planValidator.ts:1186) est en place depuis Sprint 4 — donc si Pro 3 avait déjà retourné des strings, **Layer 3 n'aurait jamais trouvé une seule semaine flaggée pendant 8 jours**.
- Tentative de lecture des logs Cloud Run via `gcloud logging read` : **BLOQUÉE par le sandbox Bash de cet environnement** (permission refusée sur `gcloud`). Cette vérification doit être faite par Romane manuellement avant deploy.

**Verdict probabiliste sur les 3 hypothèses** :

- **(a) Régression réelle Pro 3.1** : possible mais pas démontrée. Les modèles Pro de la lignée 3 sortent souvent des JSON moins structurés que Flash et le prompt actuel demande littéralement `"flaggedWeeks": [numéros des semaines problématiques]` (ligne 910). Le mot "numéros" est ambigu — Gemini peut interpréter "des semaines problématiques" comme des labels.
- **(b) Bug préexistant masqué** : **TRÈS PROBABLE**. Si on lit les logs : on devrait voir soit (i) des `AI Review failed` répétés ces 8 jours = confirme dépréciation silencieuse, soit (ii) des `AI Review: score=X, flagged=` avec un champ vide ou des strings concaténées bizarrement = bug latent jamais détecté. La doctrine `D17 transparence — pas de patch silencieux` du projet est compromise depuis 8 jours dans les deux cas.
- **(c) Bug du prompt** : non vérifié par le dev. Le dev a testé avec UN seul prompt (le prompt de production). Il n'a pas essayé de reformuler ("`flaggedWeeks: [1, 2, 3]`" en exemple littéral) avant de coder le normalizer.

**Ce que le dev n'a pas creusé** :
- Aucune extraction des logs prod pour confirmer la chronologie de la panne L2.
- Aucun test avec un prompt amélioré (exemple littéral des numéros attendus dans la consigne JSON) — il a sauté direct sur le normalizer.
- **Pas de log explicite "review.flaggedWeeks était de type X"** ajouté pour les futures régressions. Le normalizer absorbe silencieusement le mauvais format → on ne saura jamais si Google patche un jour Pro 3.1 et qu'il revient à des numbers.

**Recommandation Q1** : avant deploy, Romane lance `gcloud logging read "resource.labels.service_name=coach-running-backend AND textPayload:\"AI Review\"" --limit=200 --freshness=10d` pour confirmer empiriquement le scénario (b). Si oui → normalizer justifié. Si non → on a un autre bug ailleurs.

### Q2 — Migration vers `gemini-3.1-pro-preview` = bonne option ?

**Analyse des alternatives** :

| Modèle | Stabilité | Qualité audit | Risque dépréciation | Disponibilité Listée |
|--------|-----------|---------------|---------------------|----------------------|
| `gemini-3.1-pro-preview` (choisi) | preview ≠ stable | +800 ELO doctrine Sprint 4 | **MOYEN** (preview rejoue le scénario actuel dans 6 mois) | OUI (confirmé hotfix `35e20ab` du 19 mai) |
| `gemini-2.5-pro` | GA stable | -200 ELO vs Pro 3 mais OK | **TRÈS FAIBLE** | Standard Google |
| `gemini-pro-latest` (alias) | suit le dernier Pro stable | suit ressources | **NUL** (alias auto-update) | Standard |
| Garder Flash 3 (downgrade) | déjà déployé partout | Validator deviendrait la même chose que la génération → loop sans valeur | **NUL** | Standard |

**Doctrine projet à respecter** (`EXPERT-LLM-MODELES-CONFIG.md` ligne 89-91) :
> Le validator est le dernier filet avant de servir le plan. Si lui-même rate des bugs, ils passent en production. **Le coût de la non-détection (un user déçu, churn, RGPD doctrine "sécurité > conversion") est très supérieur au coût Pro.**

Donc : pas question de downgrade vers Flash. La question est entre 3.1-pro-preview et 2.5-pro / pro-latest.

**Argument pour 3.1-pro-preview** : continuité de la lignée Pro 3, qualité supérieure si benchmark = vrai.

**Arguments contre que le dev n'a pas chiffrés** :
- "preview" = peut changer du jour au lendemain (cf. ce qui vient d'arriver à 3-pro-preview)
- 6 mois de cycle preview Google = risque récurrent identique à celui qu'on vient de subir
- Le projet a déjà subi **deux pannes silencieuses de modèles preview en 8 jours** : 3-flash → 3-flash-preview (hotfix `35e20ab`) et 3-pro-preview → 3.1-pro-preview (F-11). C'est un pattern.

**Recommandation Q2** : la migration `3.1-pro-preview` est ACCEPTABLE mais sous-optimale. Idéalement :
- Court terme (deploy aujourd'hui) : 3.1-pro-preview OK, pas le moment de revoir l'archi LLM
- Court-moyen terme (sprint suivant, sous 7 jours) : ouvrir un ticket "migrer aiReviewPlan vers `gemini-pro-latest` (alias) ou `gemini-2.5-pro` (stable GA)". Documenter la doctrine "pas de modèle preview sur le chemin critique de validation".
- Ajouter un **healthcheck startup** qui ping chaque MODEL_ID utilisé une fois par déploiement → log warning si 404/410. Sans ça on rejouera le pattern dans 6 mois.

### Q3 — Le normalizer ajoute-t-il un risque ?

**Lecture critique du code** (`src/services/planValidator.ts:865-874`) :

```ts
export function normalizeFlaggedWeeks(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v): number => {
      if (typeof v === 'number') return v;
      const m = String(v).match(/\d+/);
      return m ? parseInt(m[0], 10) : NaN;
    })
    .filter((n) => Number.isInteger(n) && n > 0);
}
```

**Cas edge NON couverts par les 11 tests** :

1. **Number en string avec signe négatif** : `"-1"` → regex `\d+` capture `"1"` → output `[1]`. Pourtant le test 11 vérifie `["S0"]` filtré, et `[-1, -5]` filtré (number direct), mais **pas `"-1"` ou `"-5"` en string**. Cas réaliste si Gemini retourne `"-1"` par erreur. **Pas un bug grave**, juste une asymétrie de comportement (number `-1` filtré, string `"-1"` accepté comme `1`).

2. **Floats** : `[1.5, 2.5]` → `Number.isInteger(1.5)` = false → filtré → `[]`. **OK pour numbers**. Mais `"1.5"` → regex matche `"1"` → output `[1]`. Asymétrie identique.

3. **Range "Week 1-3"** : la regex `\d+` ne matche que le premier groupe → `[1]`. Or l'intention serait probablement `[1, 2, 3]`. **Cas non probable mais à signaler** : si Pro 3.1 retourne occasionnellement `"S1-S3"` au lieu d'éclater en array, on perd silencieusement les semaines 2 et 3. Pas de test couvre ce cas. **Risque P3, à monitorer via log post-deploy**.

4. **CSV-style string** : `["1, 2, 3"]` → regex prend le premier → `[1]`. Pareil que (3), risque potentiel selon ce que Pro 3.1 retourne réellement.

5. **String avec lettres ET chiffres au mauvais endroit** : `"plan-v2-week5"` → match `\d+` premier = `2` (pas `5`). **Risque réel** : Gemini pourrait retourner des identifiants composites. Pas dans les 11 tests.

6. **Doublons non dédupliqués** : `["S1", "Semaine 1", 1]` → `[1, 1, 1]`. Pas filtré. Pas grave pour la suite (line 1163 fait `new Set(...)` qui dédupe), donc **OK** dans le flux mais à savoir si jamais réutilisé ailleurs.

7. **Week number > nb de semaines du plan** : `["S100"]` sur un plan de 12 semaines → `[100]`. Layer 3 ne matchera rien et ignorera. Donc safe au final. Pas grave.

8. **Idempotence non strictement testée** : test 2 vérifie `[1,2,3] → [1,2,3]`, mais le contrat d'idempotence vrai serait `normalize(normalize(x)) === normalize(x)`. Pas explicitement asserté, mais trivial à vérifier par lecture du code (output toujours number[] > 0, et number → number direct, donc OK).

**Side effects** : la ligne 961 fait `review.flaggedWeeks = normalizeFlaggedWeeks((review as any).flaggedWeeks);`. C'est une mutation d'objet retourné par `JSON.parse` (donc owned localement, pas un risque), et l'output respecte le contrat `AIReviewResult.flaggedWeeks: number[]` (line 43). **Pas de side effect problématique.**

**Le risque le plus sérieux que le dev a manqué** : pas de log de l'écart **avant/après normalization**. Si Pro 3.1 retourne quelque chose de bizarre demain (par exemple `flaggedWeeks: "S1, S2"` au lieu d'array), le normalizer renvoie `[]` silencieusement (input non-array → `[]`). Et on perd Layer 3 sans rien voir dans les logs.

**Recommandation Q3** : normalizer techniquement OK et bien testé sur les cas attendus. Ajouter avant deploy :

```ts
const rawFlagged = (review as any).flaggedWeeks;
review.flaggedWeeks = normalizeFlaggedWeeks(rawFlagged);
if (Array.isArray(rawFlagged) && rawFlagged.length !== review.flaggedWeeks.length) {
  console.warn(`[PlanValidator] flaggedWeeks normalize: ${JSON.stringify(rawFlagged)} → ${JSON.stringify(review.flaggedWeeks)}`);
}
```

Une seule ligne qui respecte la doctrine D17 transparence (pas de patch silencieux). Sinon on rejoue la panne L2 en miroir : un normalizer qui mange silencieusement les inputs bizarres.

### Q4 — Convention déploiement projet

**État actuel observé** :

- Branche : `feat/sprint-f-plus-bugs` (sur HEAD `717b2d8`)
- 1 commit pour F-11 (planValidator.ts + geminiService.ts) — **mais ce commit NE CONTIENT NI le normalizer NI les 11 tests**. Le diff de `717b2d8` montre uniquement le passage de `gemini-3-pro-preview` → `gemini-3.1-pro-preview` (3 lignes utiles + commentaires + commentaire `recalculateSessionDistance`). **Le normalizer est en working tree non commité, et le fichier de test est untracked**.
- `git status` confirme :
  - `modified: src/services/planValidator.ts` (ajout normalizer non commité)
  - `Untracked: src/services/__tests__/plan-validator-flagged-weeks.test.ts`
- Le `package.json` n'a **pas de script `test`** défini (juste `dev`, `build`, `preview`, `start`). L'affirmation du dev "77/77 tests passent" est invérifiable depuis cet environnement (sandbox bloque `npm test`/`npx vitest`). À faire manuellement Romane.

**Donc verdict Q4** : **(b) ajouter des vérifications avant deploy**.

Liste précise des actions pré-deploy à effectuer :

1. **Commiter le normalizer + le fichier de test** dans un commit dédié (séparation responsabilité avec F-11 modèle migration). Suggestion :
   ```
   feat(sprint-f+): F-11 normalizer flaggedWeeks Pro 3.1 (strings → numbers)
   ```
   La doctrine `feedback_chaque_ligne_justifiee` exige que chaque ligne ajoutée ait une justification — c'est fait dans le commentaire bloc L852-863, mais elle exige aussi un commit propre attribuant le code au scope F-11. Là le commit `717b2d8` ne contient pas les 30 lignes de la fonction.
2. **Lancer manuellement** `npx vitest run` (full suite) et confirmer "77 verts" ou ce que ça donne réellement. Sans ça, l'affirmation est non vérifiée.
3. **Lire les logs Cloud Run** comme indiqué Q1 pour valider le scénario root cause.
4. **Tester l'aiReview à chaud** en deploy preview (Firebase Hosting channel) avant la prod, sur 1-2 plans réels avec un user de test. Le seul test E2E mentionné dans le commit message est "testé OK 27/05" sans détail d'output. C'est trop léger pour un patch qui touche le filet de sécurité L2.

**Sous-options écartées** :
- (a) Deploy direct : NON. Le commit est incomplet (normalizer absent), doctrine violée.
- (c) Rollback / re-architecturer : NON. La migration est juste, juste à finir proprement.

---

## Section 3 — Risques que le dev n'a pas vus

1. **Le commit `717b2d8` est incohérent avec ce qui est décrit** : il prétend faire la migration F-11 mais ne contient pas le normalizer ni les tests. Quelqu'un qui lit le commit sans la branche ne comprend pas pourquoi le code production a un appel à `normalizeFlaggedWeeks` non commité. **Doctrine `feedback_chaque_ligne_justifiee` violée**.

2. **Aucune télémétrie de validation post-deploy** : on déploie 3.1-pro-preview en confiance sur la base d'un test curl + un test E2E vague. Si demain 3.1-pro-preview est rate-limité, ou retourne des JSON malformés (Pro 3 le faisait déjà cf. ligne 950-957 "wrap markdown"), on retombe en silent-fallback {score:70} et on a juste déplacé le problème. **Pas de Cloud Monitoring alert ajouté**.

3. **Aucune vérification empirique du scénario "Layer 2 silencieusement KO depuis 8 jours"** : le récit du commit présente ça comme un fait, mais sans logs à l'appui c'est de l'hypothèse. Si en réalité Pro 3 répondait normalement depuis le 19 mai et n'est tombé qu'aujourd'hui, la fenêtre d'impact n'est pas la même. C'est important pour la communication interne (et pour Romane si elle doit prévenir des users impactés — bien qu'`feedback_jamais_contact_client` rappelle que c'est Romane qui gère).

4. **Le commentaire `recalculateSessionDistance`** ajouté dans `geminiService.ts` (4 lignes de doc) est commité avec F-11 mais n'a rien à voir avec la migration LLM. **Doctrine `feedback_scope_strict` à la limite** : le commit message le note ("Note doctrine"), mais ça mélange deux changements distincts. C'est mineur mais ça brouille la traçabilité.

5. **Pas d'observabilité ajoutée sur le normalizer** : si Pro 3.1 retourne `flaggedWeeks` comme `string` (pas array), comme `null`, ou comme `undefined`, le normalizer renvoie `[]` sans rien dire. **C'est le même anti-pattern que le fallback `{score:70}` qui a masqué la panne pendant 8 jours**. La doctrine D17 (transparence) exige un log de discrepancy.

6. **Le prompt n'a pas été amélioré** : le dev a constaté que Pro 3.1 retourne des strings, et a immédiatement codé un normalizer côté client. Une approche moins fragile aurait été de tester d'abord un prompt plus explicite : `"flaggedWeeks": [1, 2, 3]  // entiers, pas de "S1"`. Le normalizer reste utile en filet de sécurité, mais ne devrait pas être la seule défense.

7. **Le fallback `{overallScore: 70, ...}` n'est pas tagué comme "modèle KO"** dans le retour. Donc côté geminiService.ts:6017 (`if (aiReview) { console.log(...) }`), un fallback compte comme un review valide. Pas le scope de F-11 mais à noter pour un futur sprint observabilité.

8. **Pas de stratégie de fallback model-cascade** : si demain `gemini-3.1-pro-preview` plante (Google peut déprécier en preview), on retombe sur `{score:70}` silencieux. Il serait plus robuste de chaîner : Pro 3.1 → fallback Pro 2.5 → fallback Flash 3 → fallback `{score:70}`. Pas obligatoire aujourd'hui mais à proposer pour le sprint observabilité.

---

## Section 4 — Recommandation finale

### GO-CONDITIONNEL avec 3 actions bloquantes + 2 actions reco (non bloquantes)

**Bloquantes avant `firebase deploy --only hosting`** :

1. **Commiter le normalizer + le fichier test en un commit propre** distinct de `717b2d8`. Suggestion message : `feat(sprint-f+): F-11 normalizer flaggedWeeks Pro 3.1 (strings → numbers + 11 tests vitest)`. Sans ça, le travail n'est pas dans l'historique git et la doctrine `feedback_chaque_ligne_justifiee` est cassée.

2. **Lancer la full suite vitest** manuellement (`npx vitest run`) et confirmer que tous les tests passent (le dev annonce 77, à vérifier — le ratio 77 paraît bas vu qu'on voit 41 fichiers de test dans `__tests__/`, dont certains avec beaucoup de cas). Joindre l'output au commit ou à la PR. Si la suite échoue → NO-GO immédiat.

3. **Ajouter une ligne de log de discrepancy** sur le normalizer (cf. snippet Q3 ci-dessus, ~3 lignes). Sans ça, on viole D17 transparence en mettant en place un filet silencieux qui peut masquer de futures régressions Google.

**Reco non bloquantes (à faire dans les 7 jours)** :

4. **Lire les logs Cloud Run** sur 10 jours (`gcloud logging read ... --freshness=10d`) pour confirmer empiriquement que la couche L2 était silencieusement KO depuis le 19 mai. Si oui → publier un post-mortem interne (pas user-facing — `feedback_jamais_contact_client`). Si non → revoir le récit F-11.

5. **Ouvrir un ticket "migrer aiReviewPlan vers modèle non-preview"** (`gemini-pro-latest` ou `gemini-2.5-pro`). Le pattern actuel (preview → dépréciation → hotfix) s'est déjà répété 2× en 8 jours. C'est un risque structurel.

**Note Romane** : tout le reste de la PR sprint-f+ (F-5 Hyrox 8 km + F-7 "Ta santé" tutoiement) est indépendant de F-11 et déjà commité proprement (`207107b`). Si tu veux deploy ces deux fixes urgents sans attendre F-11, c'est possible en checkout sur `207107b^` → deploy → puis reprendre F-11. À toi de voir l'urgence relative.

**Délai estimé pour passer en GO** : 30-45 min (commit propre + run tests + ajout log de discrepancy + lecture logs gcloud).
