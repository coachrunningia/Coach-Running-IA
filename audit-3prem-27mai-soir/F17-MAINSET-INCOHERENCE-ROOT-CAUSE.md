# F-17 — Root cause `targetPace`/`mainSet` incohérents après recalcul VMA

Auditeur : Dev senior 15 ans React/Gemini/Firebase
Plan : `1776451012891` (Trail 21km, target 2h45, freq 5, 11 sem)
User : `romane.m2@hotmail.fr` (uid `p4dDVDJpuVfZkBku9iR2oQJzFn93`)
Contexte : déploiement F-17 SWAP PUR il y a 15 min — bug encore visible

⚠️ Diagnostic 100% statique (sandbox refuse `gcloud auth print-access-token`). Romane doit exécuter le `gcloud firestore ... export` ou un curl REST avec un token pour valider les chiffres bruts. Mais les ratios et le mécanisme sont confirmés par lecture code.

---

## 1. Cause racine confirmée

**Le swap V1 (`paceRecalibrationService.ts:54-118`) repose sur un exact-match `mm:ss` entre les paces écrites par Gemini et les `oldPaces` canoniques (`calculateAllPaces(oldVMA)`). Or Gemini écrit des paces "approximées" qui DIVERGENT de quelques secondes des paces canoniques. Ces paces hors-map ne sont JAMAIS swappées → résidus de la VMA d'origine restent figés dans le texte à chaque recalcul.**

Preuve code :
- `paceRecalibrationService.ts:74` : `swap.set(oldVal, newVal)` ne stocke que les 5 paces training + 4 paces course. Aucune tolérance ±N secondes.
- `paceRecalibrationService.ts:113` : `if (!swap.has(old)) return match;` — si la pace trouvée dans le texte n'est pas une clé exacte du swap, **le match est ignoré**, la pace reste en place.
- `geminiService.ts:4147-4153` (`MAINSET_COHERENCE_RULES`) demande à Gemini de n'utiliser QUE les paces du prompt — mais c'est une instruction soft, pas un contrat. Gemini écrit régulièrement des paces "voisines" (off-by-1-second sur arrondi, ou EF à 65% au lieu de 67%, etc.).
- Évidence sur le plan testé : `targetPace="5:41"` et `mainSet "5:52"` sont **incohérents avec `paces.efPace=5:16` et `paces.recoveryPace=5:53`** stockés. Le swap a tourné mais n'a swappé ni 5:41 ni 5:52.

**Reconstitution chronologique** (très probable) :
1. **Plan créé à VMA initiale ≈ 15.75 km/h** (génération preview). À cette VMA : `efPace ≈ 5:41` (3600/(15.75×0.67) = 341.15s). C'est exactement le `targetPace` observé. Gemini a écrit `5:41` dans `targetPace` ET dans `mainSet` un dérivé ~5:52 (probablement "EF 65%" approximation, ou pace "footing aisé" qu'il s'est inventée).
2. **Recalcul VMA #1** : feeling "too_slow" (+0.5) ou manuel : 16.3 → 16.8. Toast vu. À ce moment, `plan.paces` était soit déjà désynchronisé (recalculé une fois précédemment), soit re-calculé à 16.3 via fallback `calculateAllPaces(oldVMA)` (`App.tsx:1080`). Swap construit : `{5:30→5:20, 6:08→5:57}`. Le texte contient `5:41` et `5:52` → **0 match** → texte intact.
3. **Recalcul VMA #2** : 16.8 → 17 (saisi manuel "17", toast non vu/ignoré). Swap : `{5:20→5:16, 5:57→5:53}`. Encore 0 match sur 5:41/5:52. Texte intact.
4. Résultat Firestore : `plan.vma=17`, `paces.*` cohérent VMA 17, mais texte contient des paces fossiles d'une VMA antérieure.

**Pourquoi `plan.vma=17` alors que toast disait 16.8** : 2 recalculs successifs. Le toast disparait au bout de 25 s (`App.tsx:1280`). Le 2e recalcul a fixé `plan.vma=17` mais l'user n'a pas vu/retenu son toast.

---

## 2. Tableau d'analyse des paces

Hypothèse VMA originale = 15.75 (donne efPace=5:41 pile, vérifié) :

| Pace observée | Champ | Vitesse (km/h) | % de VMA 15.75 | % de VMA 16.3 | % de VMA 16.8 | % de VMA 17 | paceRole probable | Swap rattrapé ? |
|---|---|---|---|---|---|---|---|---|
| `5:16` | `paces.efPace` | 11.39 | 72.3% | 69.9% | 67.8% | **67.0%** | EF | ✅ canonique VMA 17 |
| `5:53` | `paces.recoveryPace` | 10.20 | 64.8% | 62.6% | 60.7% | **60.0%** | Récup | ✅ canonique VMA 17 |
| `5:41` | `session.targetPace` | 10.56 | **67.0%** | 64.8% | 62.8% | 62.1% | EF (VMA d'origine 15.75) | ❌ pace fossile non swappée |
| `5:52` | `mainSet` (Footing EF) | 10.23 | 65.0% | 62.9% | 60.9% | 60.2% | EF "65% relax" ou Récup (très proche) | ❌ pace fossile non swappée |

**Confirmation forte** : `5:41 = 67% × VMA 15.75` à 0.05 km/h près. La VMA initiale du plan était bien ~15.75 km/h. `5:52` est une approximation Gemini (probablement EF "doux" 65% ou recovery arrondi différent), donc hors map canonique → jamais swappée.

`paces.efPace=5:16` et `recoveryPace=5:53` à VMA 17.0 (recalculées proprement par `calculateAllPaces(17)` au dernier recalcul). Donc le plan STOCKE bien les bonnes paces, mais le **texte Gemini** est désynchronisé.

---

## 3. Cause des 3 anomalies

| # | Anomalie | Cause |
|---|---|---|
| 1 | `plan.vma=17` mais toast "16.3→16.8" | 2 recalculs successifs (16.3→16.8 puis 16.8→17). Toast disparait à 25 s. **Pas un bug.** |
| 2 | `targetPace=5:41` alors que `paces.efPace=5:16` | `targetPace` figé sur la VMA d'origine (~15.75). Swap V1 n'a jamais matché parce que les `oldPaces` au moment des recalculs étaient calculées à 16.3/16.8, pas 15.75. **Bug structurel swap V1.** |
| 3 | `mainSet` contient `5:52` (pas `5:16` EF VMA 17) | Idem : `5:52` n'est canonique d'aucune VMA standard à 67% (c'est une approximation Gemini), donc jamais dans `oldPaces`, donc jamais dans le swap. **Bug Gemini compliance + bug structurel swap V1.** |

---

## 4. Fix recommandé

### Option A — Force update mainSet par `paceRole` (heuristique type session → newPace) ✅ **RECOMMANDÉ**

Pré-passe SUR LE TEXTE avant le swap : pour chaque session, détecter heuristiquement le paceRole attendu (EF / Récup / Seuil / VMA) à partir du `type` + `title` + `intensity`, puis remplacer TOUTE pace `m:ss` du texte qui tombe dans un intervalle de tolérance autour de la pace canonique correspondante.

Avantages :
- Rattrape les paces "approximées" par Gemini (±10 s autour de canonique → forcer canonique exacte).
- Garde le swap V1 derrière comme fallback pour les autres paces (mainSet multi-paces : seuil/récup/VMA).
- 100% déterministe, < 50 ms, pas d'appel Gemini.
- Cohérent avec la doctrine `feedback_chaque_ligne_justifiee` : on documente le mapping type→paceRole une fois.

Inconvénients :
- Heuristique type→role : si Gemini met un Fartlek dans un "Jogging EF" (rare mais possible), le force-update écrasera la pace VMA en pace EF. Mitigation : ne s'applique qu'aux types "purs" (Jogging/Récupération/Sortie Longue avec intensity Facile/Modéré).

### Option B — Régénérer mainSet via Gemini avec nouvelles paces

Avantages : qualité éditoriale top.

Inconvénients :
- C'est exactement le bug F-17 historique (10 min + plant). Le SWAP PUR a été choisi POUR éviter ça.
- Latence 10-20s vs 50 ms.
- Charge API.
- **Régression doctrinaire**.

### Option C — Refacto profond : stocker `paceRole` à la génération

Modifier le prompt Gemini pour qu'il sorte un champ `paceRole` par session (`EF`/`Recup`/`Seuil`/`VMA`/`AS5k`/`AS10k`/`ASSemi`/`ASMarathon`). Au recalcul, on regénère `targetPace = newPaces[paceRole]` sans toucher au texte.

Avantages : 100% propre, jamais de désynchro.

Inconvénients :
- Nécessite modif prompt + schéma JSON + migration des plans existants.
- Le `mainSet` reste un blob texte avec des paces inline → besoin de Option A en parallèle.
- 1-2 jours de travail + battery 10+ profils (doctrine `feedback_validation_n_profils_avant_sprint`).

### Recommandation finale

- **Court terme (aujourd'hui)** : Option A — patch dans `paceRecalibrationService.ts`. Documente l'heuristique. Battery 5 profils (debutant, inter, conf, expert, trail).
- **Moyen terme (sprint suivant)** : Option C — sortir `paceRole` au schéma Gemini. Migration optionnelle des plans existants.

---

## 5. Patch code (Option A)

`/Users/romanemarino/Coach-Running-IA/src/services/paceRecalibrationService.ts`

Ajouter avant la fonction `recalibrateSession`, et la modifier pour appliquer le force-update AVANT le swap V1 :

```ts
// === FORCE UPDATE PAR PACEROLE (anti-bug paces fossiles non-canoniques) ===
// Doctrine F-17 v2 : Gemini écrit parfois des paces "approximées" (off-by-seconds,
// ou ratios inhabituels comme EF 65% au lieu de 67%) qui ne matchent pas oldPaces
// canoniques → jamais swappées → résidus de VMA initiale figés.
// Solution : sur les sessions "type pur" (Jogging/Récupération/SL), forcer la pace
// canonique attendue dans une fenêtre de tolérance ±20s autour de la newPaces cible.

const paceToSec = (mmss: string): number => {
  const m = mmss.match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
};

type PaceRole = 'EF' | 'Recup' | null;

function detectSessionPaceRole(session: Session): PaceRole {
  const type = (session.type || '').toLowerCase();
  const title = (session.title || '').toLowerCase();
  const intensity = (session.intensity || '').toLowerCase();
  // Seuls les types "purs" — éviter d'écraser Fractionné/Seuil
  if (type === 'récupération' || type === 'recuperation' ||
      /r[ée]cup[ée]ration/.test(title)) return 'Recup';
  if ((type === 'jogging' || type === 'sortie longue' || type === 'sortie longue') &&
      !/seuil|fractionn|vma|tempo|fartlek|intervalle/.test(title) &&
      (intensity === 'facile' || intensity === 'modéré' || intensity === 'modere' || !intensity)) {
    return 'EF';
  }
  return null;
}

function forcePaceInText(
  text: string,
  targetPaceSec: number,
  newPaceStr: string,
  toleranceSec = 20
): string {
  if (!text) return text;
  // Remplace toute occurrence m:ss tombant dans [target-tol, target+tol] par newPaceStr
  return text.replace(/\b(\d{1,2}):([0-5]\d)\b/g, (match, mm, ss) => {
    const sec = parseInt(mm, 10) * 60 + parseInt(ss, 10);
    // Ignorer les "durées" (typiquement < 60 sec total) — m=0 → c'est une durée pas une pace
    if (parseInt(mm, 10) === 0) return match;
    // Ignorer paces vraisemblablement hors gamme running (< 2:30 ou > 12:00)
    if (sec < 150 || sec > 720) return match;
    if (Math.abs(sec - targetPaceSec) <= toleranceSec) return newPaceStr;
    return match;
  });
}

export function forceUpdatePaceByRole(
  session: Session,
  newPaces: Partial<TrainingPaces>
): Session {
  const role = detectSessionPaceRole(session);
  if (!role) return session;
  const targetPaceStr = role === 'EF' ? newPaces.efPace : newPaces.recoveryPace;
  if (!targetPaceStr) return session;
  const targetSec = paceToSec(targetPaceStr.replace(/\s*min\s*\/\s*km/i, '').trim());
  if (isNaN(targetSec)) return session;

  const out: Session = { ...session };
  // targetPace : si dans la tolérance, normaliser ; sinon laisser swap V1 le faire
  if (session.targetPace) {
    const tpClean = session.targetPace.replace(/\s*min\s*\/\s*km/i, '').trim();
    const tpSec = paceToSec(tpClean);
    if (!isNaN(tpSec) && Math.abs(tpSec - targetSec) <= 20) {
      const hadUnit = /min\s*\/\s*km/i.test(session.targetPace);
      out.targetPace = hadUnit ? `${targetPaceStr} min/km` : targetPaceStr;
    }
  }
  if (session.mainSet) out.mainSet = forcePaceInText(session.mainSet, targetSec, targetPaceStr);
  const a = session as any;
  if (typeof a.warmup === 'string') (out as any).warmup = forcePaceInText(a.warmup, targetSec, targetPaceStr);
  if (typeof a.cooldown === 'string') (out as any).cooldown = forcePaceInText(a.cooldown, targetSec, targetPaceStr);
  return out;
}
```

Et dans `recalibrateSession` (ligne 132) :

```ts
export function recalibrateSession(
  session: Session,
  oldPaces, newPaces, options = {}
): Session {
  if (!oldPaces || !newPaces) return session;
  // F-17 v2 — Pré-passe role-based pour rattraper paces fossiles non-canoniques
  const roleForced = forceUpdatePaceByRole(session, newPaces);
  // Swap V1 derrière (canonique exact-match) pour les paces non-EF/non-Recup
  const swap = buildPaceSwapMap(oldPaces, newPaces, options);
  if (swap.size === 0) return roleForced;
  // ... reste identique (appliquer le swap sur roleForced au lieu de session)
}
```

---

## 6. Validation requise avant merge

- Battery 10+ profils diversifiés (doctrine `feedback_validation_n_profils_avant_sprint`).
- Cas critique : `targetPace=5:41` (VMA fossile 15.75) avec recalcul vers VMA 17 → vérifier `5:41 → 5:16` et `5:52 → 5:53`.
- Cas faux-positif à vérifier : durée "4:30" dans "Récupération 4:30 entre les blocs" — la regex `\b(\d):([0-5]\d)\b` matcherait. Le guard `parseInt(mm) === 0` ne suffit pas. **Ajouter** : `/min\/?km|allure|à\s+\d:\d/i` lookaround pour ne forcer QUE les paces explicitement marquées (pace context).
- Cas trail D+ : déjà skippé par `App.tsx:1213` (elevationGain > 150). OK.

---

## TL;DR

**Bug** : swap V1 exact-match → paces "approximées" par Gemini (off-by-seconds, ratios non-canoniques) ne sont jamais swappées → résidus de VMA initiale figés à chaque recalcul. Plan testé : VMA initiale ≈ 15.75 → `targetPace=5:41` (= EF 67% exact à 15.75 mais hors map pour les recalculs vers 16.3/16.8/17) + `mainSet "5:52"` (approximation Gemini sans correspondance canonique). 2 recalculs successifs (16.3→16.8→17) expliquent `plan.vma=17` mais toast "16.3→16.8" (l'user a fait un second recalcul ensuite).

**Fix** : Option A — pré-passe `forceUpdatePaceByRole` (heuristique type/title/intensity → EF/Recup) avec fenêtre de tolérance ±20s autour de la pace canonique cible. Patch dans `paceRecalibrationService.ts`. Battery 10 profils obligatoire avant déploiement.
