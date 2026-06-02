# F-18.1 Compromis Pic 16 km — Verdict PM Tech Challenge

**Profil** : Cyrielle 35a, BMI 19.7, VMA 10.55, freq 3, Semi 2h00 IRRÉALISTE. Cap physio actuel = 14 km/sem.
**Proposition Romane** : pousser pic à 16 km (+14% au-dessus cap VMA) + welcome explicatif.

---

## Q1. Cohérence doctrine — ERREUR DOCTRINAIRE

F-18.1 a été déployé il y a **2h** avec verdict croisé (toi + Coach FFA) statuant "sécurité physio prime sur plancher race". Le compromis +14% **contredit ce verdict 2h après**.

- `effectiveVmaCap` = **calcul physio**, pas négociable par UX
- "+14% marge raisonnable" → faux : le cap est déjà une moyenne, pas un plafond strict. Le pousser = on assume le risque tendineux qu'on vient d'écarter
- Doctrine D17 dit : plan irréaliste → **transparence + opt-in**, PAS embellir le volume
- Pousser à 16 km pour "donner l'impression que c'est faisable" = embellir (interdit par feedback `securite_avant_conversion`)

**Verdict Q1 : régression doctrinaire, retour partiel au bug F-18 brut.**

---

## Q2. Risque dérive — CRITIQUE

Pas de garde-fou défini = effet cliquet :
- Cyrielle +14% accepté aujourd'hui → précédent jurisprudentiel
- Prochain Marathon Déb VMA 11 freq 3 → "+14% aussi, c'est la règle maintenant"
- Glissement progressif vers F-18 brut, on perd le bénéfice du fix

**Si compromis accepté, garde-fou minimum** : `min(effectiveVmaCap × 1.0, plancherRace)` strict. Aucune marge au-dessus du cap physio. Le cap EST la limite.

---

## Q3. Scope — Recommandation : **C** (UX uniquement, pas de patch code)

| Scope | Risque | Bénéfice |
|---|---|---|
| A. Patch live cyrielle 14→16 | Précédent + contradiction verdict 2h | Aucun (1 km pic = invisible) |
| B. Modif F-18.1c code | Régression structurelle, on défait F-18.1 | Aucun mesurable |
| **C. Garder code, soigner welcome** | Nul | Cohérence doctrine + transparence D17 |

Le code F-18.1 actuel est **correct**. Le problème Romane veut résoudre = **UX welcome message**, pas le volume.

---

## Q4. Welcome message proposé — REJET wording actuel

3 problèmes :
1. **"ne permet pas physiquement"** → engagement médical implicite. Risque légal réel. Remplacer par "n'est pas recommandé pour ton profil actuel"
2. **"risque de blessure tendineuse"** → diagnostic médical. Reformuler "risque accru de surcharge"
3. **"atteignable avec freq 4 ou VMA améliorée"** → OK mais sans chiffre 22-25 (pas de promesse implicite)

**Reformulation safe** :
> "Pic hebdo plafonné à 14 km/sem : ton volume actuel et ta VMA d'aujourd'hui ne sont pas compatibles avec un volume plus élevé sur 3 séances. Un Semi en 2h demande idéalement un pic plus important, accessible en passant à 4 séances/sem ou en travaillant ta VMA en amont. Décharge : objectif Semi 2h non garanti dans les conditions actuelles."

Cohérent D17 (transparence + opt-in front conservé).

---

## Q5. Alternative plus safe — OUI, c'est la voie

Garder **14 km** (cap physio respecté) + welcome pédagogue = exactement la doctrine D17. Pas de push contre cap, pas d'embellissement, transparence totale.

Wording Romane Q5 est meilleur que Q4 : factuel ("c'est ce que ta physio permet aujourd'hui"), action concrète (regen freq 4 / VMA), zéro engagement médical.

---

## VERDICT FINAL : **REJECT compromis 16 km — Garder 14 km + welcome pédagogue (option Q5)**

**Raisons** :
1. Compromis +14% contredit verdict croisé toi + Coach FFA d'il y a 1h
2. Aucun garde-fou défini = risque dérive cliquet
3. Le code F-18.1 est correct, le besoin est UX pur (welcome)
4. Wording "ne permet pas physiquement" = risque légal
5. Doctrine D17 + `securite_avant_conversion` + `ecouter_instructions_explicites` convergent : on ne pousse pas au-dessus du cap pour faire plaisir

**Action** : reformuler welcomeMessage (option Q5 reformulée safe), garder `minPeakVolume = 14`, conserver opt-in front D17.

Sans complaisance : Romane a déployé F-18.1 il y a 2h sur verdict ferme. Revenir dessus le soir même sur 1 cas = signal d'instabilité doctrinaire. Si vraiment cyrielle est un cas limite, c'est l'opt-in front qui doit jouer, pas le volume.
