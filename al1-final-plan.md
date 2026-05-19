# Plan d'action consolidé Al1 + Ambre — Validation finale

## Contexte rapide

**Al1 Kasongo** — Nouveau Premium activé aujourd'hui
- 45yo H Confirmé · 70kg/171cm IMC 23,9
- Vol curr 60 km/sem · freq 4
- Chronos cohérents : 10k=43, semi=1h34, mara=3h31
- VMA calculée 15,64 km/h
- **Objectif Semi 1h30 en 22 sem**
- Plan actuel : score 83 BON · peak 60 km/sem (= aucune progression) · taper 2 sem (60→38→30) · 2 SL/sem en S1 (Mardi mistype Gemini)

**Ambre Painvin** — Premium active depuis 15/05
- 20yo F · IMC 28,3 · Semi 2h00 en 17 sem · vol 5 km/sem · blessure genou
- Bug "Une erreur est survenue" en génération
- Désync emailVerified Firebase Auth/Firestore identifiée et corrigée (115 autres users en désync aussi corrigés en bulk)
- Logger Firestore déployé pour capturer toute future erreur

---

## ACTIONS Al1 — Patches base (manuels sur son plan)

### A1 — Volume peak 60 → 70 km/sem
**Justification** : sub-1h30 nécessite 70-85 km/sem (Pfitzinger). Vol curr 60 → peak 70 = +17% = dans la zone safe (max règle = +30% = 78 km).

**Nouveau weeklyVolumes** : `[51,55,60,48,56,61,65,52,60,65,68,54,62,67,70,56,63,68,70,56,47,35]`
- Progression graduelle ~+5%/sem
- Plateau peak 70 km en S15 et S19
- Récup ondulée
- Taper 3 sem fini : 70→56→47→35

vs actuel : `[51,55,60,48,55,57,60,48,55,57,60,48,55,57,60,48,55,57,60,48,38,30]`

### A2 — Welcome refait avec transparence cible
Remplacer le welcome actuel (727 chars, neutre) par :

```
Transparence sur ton objectif

Sub-1h30 sur semi à 45 ans est un objectif ambitieux mais exigeant. Les références
d'entraînement (Pfitzinger, Daniels) pointent un volume peak de 70-85 km/sem pour
viser ce chrono avec marge.

Ton plan est calibré à 70 km/sem peak — c'est +17% vs ton volume actuel (60),
dans la zone safe de progression (max +30%). Cette charge te donne une vraie
chance sur sub-1h30, sans surcharger ta récupération à 45 ans.

Cible réaliste à 22 semaines : 1h31-1h32, sub-1h30 atteignable si :
- Tes séances qualité (VMA, seuil) sont tenues sans coupure,
- Ta SL hebdomadaire reste régulière (pas de saut > 2h00 sans préparation),
- Tu écoutes ton corps (jamais 2 séances dures consécutives).

Recommandé avant J+15 : bilan cardio + test effort max (45 ans + intensité
compétition). Sans feu vert médical, on reste sur 1h32 cible.
```

### A3 — Score 83 → 70 AMBITIEUX
Cohérent avec la transparence du welcome.

### A4 — Retyper Mardi S1 : Sortie Longue → Jogging
- `type: "Sortie Longue"` → `"Jogging"`
- `title: "Sortie moyenne en endurance fondamentale (MLR)"` (PAS "progressif")
- Contenu inchangé (17,9 km / 1h45 / pace 5:44)
- Justification : c'est un MLR Pfitzinger, pas une SL. Évite la règle "2 SL/sem".

### A5 — Vol annoncé vs vol réel
Vol annoncé S1 = 51 km · Vol réel sessions = 49,4 km · Écart = 1,6 km
Ajuster +1,6 km sur le footing Lundi (13,5 → 15,1 km).

---

## ACTIONS Al1 — Patches CODE (Sprint 2)

### Code 1 — Cap MAX_WEEKLY_VOLUME +15% si chrono ambitieux
Dans `calculatePeriodizationPlan`, après calcul peak vol :
```ts
const hasChronoTarget = !isFinisherTarget(targetTime);
const levelKey = labelToLevelKey(getEffectiveLevel(data));
const isHighLevel = ['conf', 'expert'].includes(levelKey);
const freqOk = (sessionsPerWeek ?? 3) >= 4;
const progressionSafe = peakVolKm <= (currentVolume ?? 0) * 1.30;

if (hasChronoTarget && isHighLevel && freqOk && progressionSafe) {
  maxVolume = Math.round(MAX_WEEKLY_VOLUME[objective][levelKey] * 1.15);
}
```
- Semi conf : 60 → 70
- Marathon conf : 75 → 85
- 10K conf : 55 → 65

### Code 2 — Taper 3 semaines minimum pour Semi/Marathon
Dans `calculatePeriodizationPlan` (~ligne 2419) :
```ts
const maxAffutageByDist = raceDistanceKm <= 10 ? 1
  : raceDistanceKm <= 21.1 ? 3   // AVANT: 2
  : raceDistanceKm <= 42.2 ? 3 : 4;
if ((isSemi || isMarathon) && affutageWeeks < 3) {
  const diff = 3 - affutageWeeks;
  affutageWeeks = 3;
  specifiqueWeeks -= diff;
}
```

### Code 3 — Post-processing cohérence vol annoncé vs réel
Dans `enforceWeekConstraints`, ajouter passe 8 :
```ts
const announced = targetWeekKm;
const actual = week.sessions.reduce((s, sess) =>
  s + (sess.type === 'Renforcement' || sess.type === 'Repos' ? 0 : parseKm(sess.distance)), 0);
const diff = announced - actual;
if (diff > 1) {
  // Compléter sur la 1ère séance non-SL, non-renfo
  const target = week.sessions.find(s =>
    s.type !== 'Renforcement' && s.type !== 'Sortie Longue' && s.type !== 'Repos');
  if (target) {
    const newKm = parseKm(target.distance) + diff;
    target.distance = `${newKm.toFixed(1)} km`;
    const efSpeed = (questionnaireData?.vma || 13) * 0.67;
    target.duration = formatDurationStr(Math.round(newKm / efSpeed * 60));
  }
}
```

### Code 4 — Séance qualité en S1 pour Conf+ avec vol_curr ≥ 40
Modifier le prompt `generatePreviewPlan` pour ajouter une condition :
```
SI (level = Conf+ ET currentWeeklyVolume >= 40) :
  En S1 fondamental, AUTORISÉ 1 séance fartlek doux ou lignes droites
  (PAS de VMA pure, juste éveil neuromusculaire).
```

---

## ACTIONS Ambre

### Déjà fait
- ✅ Désync emailVerified fixée pour elle (Auth=true)
- ✅ Désync fixée en bulk pour 115 autres users
- ✅ Logger erreurs Firestore déployé

### À discuter
- **Option A** : Custom Token via Admin SDK pour tester en tant qu'elle sans son mdp (30 min setup, 0 email envoyé à Ambre)
- **Option B** : Attendre qu'elle retest naturellement (logger capture)

### Patch code complémentaire (anti-récurrence)
Dans `server.js:1493` (endpoint `/api/verify-email`), ajouter 1 ligne :
```js
await admin.auth().updateUser(tokenData.userId, { emailVerified: true });
```
→ Sync automatique Firebase Auth quand l'utilisateur clique son lien email.

---

## QUESTIONS À VALIDER

1. **Cap volume 70 km/sem pour Al1** : OK (+17%, safe vs règle +30%) ?
2. **Welcome refait avec cible 1h31-1h32** : assez transparent ? Trop dur ?
3. **Score 70 AMBITIEUX** : OK ou trop bas ?
4. **Patches code 1-2-3-4** : ROI vs risque ?
5. **Option A Custom Token Ambre** : OK ou on attend logger ?
