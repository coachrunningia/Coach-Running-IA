# Sprint P1 — Bugs structurels audit fin

**Date** : 2026-05-20
**Source** : `AUDIT-FIN-3-PLANS-LILIAN-MARGAUX-FLOGGYZ.md`
**Branche** : `main` (ahead origin by 3 commits, **PAS pushé**)

---

## Synthèse

3 bugs structurels traités (A, D, F) sur les 6 identifiés.
3 bugs reportés (B couvert, C investigation, E sprint dédié).

Tests : baseline 411 → **431 verts** (+20).
Build : 39/39 routes OK.

---

## Bugs traités

### A : Hard floor 10K + 5K minPeakVolume
**Commit** : `49926ae` — `P1a fix(volume): hard floor 10K ≥18 + 5K ≥15`
**Cible** : Lilian (10K Inter pic stagne ~17 km) + futurs 10K/5K freq=3.
**Fichier** : `src/services/geminiService.ts` (zone hard floors L2671-2700)
**Patch** :
```ts
// AVANT (P0b)
if (objectiveKey === 'Semi'     && minPeakVolume < 22) minPeakVolume = 22;
if (objectiveKey === 'Marathon' && minPeakVolume < 32) minPeakVolume = 32;
// APRÈS (P1a)
if (objectiveKey === '10K' && minPeakVolume < 18) minPeakVolume = 18;
if (objectiveKey === '5K' && minPeakVolume < 15) minPeakVolume = 15;
```
**Référentiel** : Pfitzinger novice 10K = 25-30 km. On reste sous (doctrine charge allégée), mais on évite ridicule.
**Tests** : +4 dans `semi-marathon-volume-floor.test.ts` (test 6 adapté + 4 P1a-1/2/3/4).

### D : Mode "absolute beginner" cv=0
**Commit** : `93abd6c` — `P1d fix(volume): mode absolute beginner cv=0 (S1 cap 10 km)`
**Cible** : Lilian (10K Déb cv=0 → S1 13 km, saut violent depuis 0).
**Fichier** : `src/services/geminiService.ts` (~L2887, après calcul `startVolume`)
**Patch** :
```ts
const isAbsoluteBeginner = currentVolume === 0 && level === 'Débutant (0-1 an)';
if (isAbsoluteBeginner) {
  startVolume = Math.min(startVolume, 10);
}
```
**Doctrine** : `[[feedback_input_client_obligatoire]]` — cv=0 = signal novice absolu, respecté.
**Tests** : nouveau fichier `absolute-beginner-mode.test.ts` (+5).

### F : Distance Marche/Course pondérée par run ratio
**Commit** : `abff7e7` — `P1f fix(distance): distance Marche/Course pondérée par run ratio`
**Cible** : Lilian (séance "60 min 8×(2min course + 1min marche)" affichée 6.6 km vs ~4.4 km réel).
**Fichier** : `src/services/geminiService.ts` (~L582 `recalculateSessionDistance`)
**Patch** :
- Nouvelle fonction `extractRunRatio(mainSet)` qui parse les patterns `X min course + Y min marche`.
- `recalculateSessionDistance` : si `type === 'Marche/Course'`, pondère par `runRatio` (fallback 0.6).
- Les autres types (Jogging, SL, Fractionné) restent inchangés (`runRatio = 1`).

**Tests** : nouveau fichier `marche-course-distance.test.ts` (+11).

---

## Bugs reportés (P2)

### B : VMA-duration cap Semi Inter freq=3 trop agressif — SKIP
Couvert par le hard floor Semi 22 km (P0b) + patches live Margaux/Bertrand. Le `realisticFactor 0.85` reste actif (doctrine Sprint plancher ~70% Pfitzinger). Pas de modif additionnelle requise.

### C : Post-récup smoothing ×1.15 — REPORTÉ
Investigation à approfondir avant patch. Le lissage post-récup `Math.min(preRecovVol, Math.round(curr * 1.15))` étrangle effectivement les Inter+ VMA basse, mais c'est un mécanisme central avec plusieurs effets secondaires. Sprint dédié recommandé (analyse de l'impact sur 8-10 profils variés avant relâche).

### E : Phase fondamental Expert trop longue + safety net L673-691 — SPRINT DÉDIÉ
Complexité estimée : ~50 lignes (prompt + code safety net + tests). Demande refonte du ratio phase fondamental pour Expert (cap 35% du plan vs ~45% actuel) ET exception dans safety net pour autoriser strides/accélérations dès S1-S2 Expert. À traiter dans un sprint dédié avec validation Coach 20 ans (cf. AUDIT-FIN section P4).

---

## Tests

| Avant P1 | Après P1 | Δ |
|---|---|---|
| 411 verts | **431 verts** | +20 |

Détail nouveaux tests :
- P1a : +4 (semi-marathon-volume-floor.test.ts)
- P1d : +5 (absolute-beginner-mode.test.ts — nouveau fichier)
- P1f : +11 (marche-course-distance.test.ts — nouveau fichier)

Build : `npm run build` → 39/39 routes OK après chaque commit.

---

## Commits

| Hash | Bug | Description |
|---|---|---|
| `49926ae` | A | hard floor 10K ≥18 + 5K ≥15 |
| `93abd6c` | D | mode absolute beginner cv=0 (S1 cap 10 km) |
| `abff7e7` | F | distance Marche/Course pondérée par run ratio |

`main` ahead `origin/main` by **3 commits**.

---

## En attente

- **Décision push** : `git push origin main` en attente du GO Romane.
- Bugs C et E : sprint dédié P2 (cf. priorisation ci-dessus).

---

## Doctrines respectées

- [[feedback_input_client_obligatoire]] — cv=0, allures, dates user respectées.
- [[feedback_courte_duree_charge_allegee]] — hard floors restent sous référentiel Pfitzinger.
- [[project_coach_running_ia_frequence]] — runningSessions = freq − 1 inchangé.
- [[feedback_qualite_avant_vitesse]] — chaque patch validé par tests + build.
- [[feedback_chaque_ligne_justifiee]] — commentaires expliquent pourquoi/audit/référentiel.
- [[feedback_jamais_contact_client]] — aucune comm utilisateur, pas de push prod.
