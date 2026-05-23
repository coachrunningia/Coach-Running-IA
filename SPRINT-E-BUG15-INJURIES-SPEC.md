# SPRINT E — Bug 15 : Injuries blacklist patterns biomécaniques

> **Découvert sur** : plan Laurence `1779563548769` (tendinite ischio active) — S1 contient 3 séances "Footing vallonné, côtes en marche".
> **Sévérité** : **P0 sécurité** (aggravation directe de blessure déclarée par le user).
> **Phase** : **Sprint E Phase 1** (P0 transversal sécurité — pas Phase 2).

---

## Diagnostic racine

`geminiService.ts` lit bien `data.injuries.description` pour le **prompt LLM** (l. 3737-3750, RÈGLE BLESSURE EXPLICITE) — mais **uniquement comme texte d'instruction au modèle**. Le LLM Gemini Flash interprète mal "pas de côtes explosives sur tendinopathie" et génère quand même des footings vallonnés "doux" (cas Laurence).

**Aucun filtre post-LLM** ne vérifie que les séances générées sont compatibles biomécaniquement avec la blessure. Le `buildHilly()` détection (l. 2089 : `/vallonn|côte|sentier|trail|technique|progressif/i`) sert à **équilibrer** des footings entre eux, pas à les **bannir**.

---

## Logique fix

### 1. Constante blacklist en haut de `geminiService.ts` (après les imports)

```ts
// Bug 15 Sprint E — Contre-indications biomécaniques injuries.description.
// Si user déclare blessure tendineuse spécifique, certains patterns de séances
// = aggravation mécanique directe. On bannit côté code (pas confiance LLM).
// Sources : Cook & Purdam (tendinopathie), Lorimer & Hume (ischio), Silbernagel.
const INJURY_HILL_BLACKLIST_PATTERNS: RegExp[] = [
  /ischio|ischiojambier|tendon.*ischio|proximal hamstring/i, // côte = excentrique ischio
  /achille|tendon.*achille|achill[eé]en/i,                    // côte = traction tendon achille
  /tfl|bandelette|itbs|syndrome.*essuie.glace/i,              // descente = friction TFL
  /fasciite|aponévros/i,                                       // côte = surcharge fascia
];

const INJURY_HARDSURFACE_BLACKLIST_PATTERNS: RegExp[] = [
  /périostite|periostite|stress.*tibia|shin splints?/i,       // dur = surcharge périoste
  /fracture.*fatigue|stress fracture/i,                       // dur = compression osseuse
];

const isHillBanned = (injuryDesc: string | undefined): boolean => {
  if (!injuryDesc) return false;
  return INJURY_HILL_BLACKLIST_PATTERNS.some(p => p.test(injuryDesc));
};

const isHardSurfaceBanned = (injuryDesc: string | undefined): boolean => {
  if (!injuryDesc) return false;
  return INJURY_HARDSURFACE_BLACKLIST_PATTERNS.some(p => p.test(injuryDesc));
};
```

### 2. Injection préventive dans le prompt (renforcement avant LLM)

Dans `buildWelcomeToneBlock` / bloc RÈGLE BLESSURE EXPLICITE (l. 3737-3750), **après** la liste actuelle, ajouter :

```ts
if (data.injuries?.hasInjury && isHillBanned(data.injuries.description)) {
  parts.push(`⛔ CONTRE-INDICATION CÔTES ABSOLUE — blessure "${data.injuries.description.trim()}"
La pathologie déclarée interdit TOUTE séance "Footing vallonné", "côtes en marche",
"footing avec D+", "side hills". Les titres autorisés sont uniquement :
- "Footing EF plat"
- "Footing bords de rivière"
- "Footing piste"
- "Footing chemin lisse"
Le mainSet DOIT mentionner "terrain strictement plat" et "aucune côte, aucune descente".
Cette règle s'applique aux 4 premières semaines minimum (consolidation tendinopathie).`);
}
```

### 3. Post-LLM filter (filet de sécurité — LLM ignore parfois la consigne)

Dans `enforceWeekConstraints` (l. ~2080-2120 où `isHilly` est déjà défini), **ajouter en TÊTE de fonction** :

```ts
// Bug 15 Sprint E — Filet biomécanique post-LLM.
// Si user a une blessure côtes-incompatible, retyper les séances vallonnées.
const injuryDesc = data?.injuries?.description;
const banHills = isHillBanned(injuryDesc);
const banHardSurfaces = isHardSurfaceBanned(injuryDesc);
const isEarlyWeek = (week.weekNumber ?? 1) <= 4; // 4 premières sem = phase reprise

if (banHills && isEarlyWeek) {
  week.sessions.forEach((s: any) => {
    if (!s || !s.title) return;
    const titleLower = (s.title || '').toLowerCase();
    if (/vallonn|côte|sentier|trail|technique|c[ôo]te/i.test(titleLower)) {
      const oldTitle = s.title;
      s.title = 'Footing EF plat';
      // Réécrit le mainSet pour retirer la mention côtes/vallonné
      if (s.mainSet) {
        s.mainSet = s.mainSet
          .replace(/c[ôo]tes?\s+en\s+marche/gi, 'terrain plat')
          .replace(/vallonn[ée]e?s?/gi, 'plat')
          .replace(/avec\s+d[ée]nivel[ée]/gi, 'sur terrain plat');
        // Ajoute la consigne sécurité si absente
        if (!/strictement plat|aucune côte/i.test(s.mainSet)) {
          s.mainSet += ' Terrain STRICTEMENT plat (bords de rivière, piste, chemin lisse). Aucune côte, aucune descente. Signal douleur > 2/10 → tu ralentis ou tu marches.';
        }
      }
      console.log(`[Bug15] S${week.weekNumber} ${s.day}: "${oldTitle}" → "${s.title}" (blessure côtes-incompatible)`);
    }
  });
}

if (banHardSurfaces && isEarlyWeek) {
  week.sessions.forEach((s: any) => {
    if (!s || !s.mainSet) return;
    if (/piste|bitume|asphalte|route/i.test(s.mainSet)) {
      s.mainSet = s.mainSet.replace(/(piste|bitume|asphalte|route)/gi, 'chemin de terre');
    }
  });
}
```

### 4. Distance bridge — assurer cohérence avec footing variants

Dans la suite de `enforceWeekConstraints` (l. ~2089), modifier `isHilly` pour qu'il **ne marque jamais "hilly"** une séance dont le titre vient d'être retypé "Footing EF plat" (déjà géré naturellement par le regex sur title — RAS, mais documenter).

---

## Tests à écrire

`src/services/__tests__/sprint-e-bug15-injuries-blacklist.test.ts` :

1. **Profil Laurence (tendinite ischio active)** :
   - Input : `data.injuries.hasInjury=true`, `data.injuries.description="tendinite ischio active"`
   - Mock week.sessions avec 3 séances `title: "Footing vallonné, côtes en marche"`
   - Expected : 3 séances retypées `title: "Footing EF plat"`, mainSet contient "STRICTEMENT plat"

2. **Profil tendinite achille** :
   - Input : `description="tendinite tendon d'achille gauche"`
   - Expected : isHillBanned=true, séances vallonnées retypées

3. **Profil TFL/ITBS** :
   - Input : `description="syndrome de l'essuie-glace (ITBS)"`
   - Expected : isHillBanned=true (descente = friction TFL)

4. **Profil sans blessure** :
   - Input : `data.injuries.hasInjury=false`
   - Expected : comportement actuel inchangé (séances vallonnées préservées)

5. **Profil "douleur genou générale" (non spécifique)** :
   - Input : `description="douleur genou"` (pas pattern ischio/achille/TFL)
   - Expected : isHillBanned=false, séances inchangées (pas de faux positif)

6. **Profil périostite tibia** :
   - Input : `description="périostite tibiale antérieure"`
   - Expected : isHardSurfaceBanned=true, mainSet "piste" → "chemin de terre"

7. **Idempotence** : appel 2× sur la même week → mainSet ne contient pas 2× la consigne sécurité.

8. **Semaine 5+** : `isEarlyWeek=false` → blacklist désactivée (laisser progression possible après consolidation).

---

## Statut Sprint E

**Phase 1 (P0 transversaux sécurité)** — Bug 15 = **P0 obligatoire** (sécurité utilisateur, aggravation blessure déclarée). À shipper avec Bug 8/10/11 si pas encore release, sinon hotfix dédié.

**Effet attendu** : plan Laurence en regen ne contient plus aucune séance vallonnée S1-S4. Cas Tendinite achille, ITBS, fasciite couverts de la même manière sans intervention manuelle Romane.

**Risques** : faux positif sur un user qui écrit "j'ai juste eu un petit pet à l'ischio il y a 2 ans" → le regex `ischio` match. Mitigation : la doctrine `feedback_compromis_messages_preventifs` privilégie le compromis → blacklister sur 4 semaines puis libérer = compromis acceptable même en cas de faux positif. Pas de blocage de progression long terme.
