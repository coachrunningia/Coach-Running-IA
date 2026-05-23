# Audit Expert Nutrition Trail V2 + 11 tests profils

**Date** : 2026-05-20
**Reviewer** : Expert nutrition trail 20 ans (Burke, Fitzgerald, Costa, Tiller, Jeukendrup, ISSN 2018/2024, ACSM 2024, ITRA, UTMB Academy, Balducci/Bramoullé terrain)
**Spec auditée** : V2 proposée par Romane (4 paliers Court/Moyen/Long/Ultra)
**Code de référence** : `~/Coach-Running-IA/src/components/tools/NutritionTrailPage.tsx` (2 084 lignes)
**Audit précédent** : `~/Coach-Running-IA/AUDIT-NUTRITION-TRAIL-EXPERT-MULTI-PROFILS.md` (25 profils, 5 fixes ciblés)
**Note typos** : valeurs Romane corrigées — `43000 → 4300`, `65000 → 6500`, `75000 → 7500` (cohérent avec record D+ Tor 24 000 m, Hardrock 10 000 m).

---

## 1. Validation spec V2 par expert nutrition

### 1.1 Les 4 paliers — targets g/h

| Palier | Durée V2 | Cible g/h V2 | Référentiel attendu | Verdict |
|---|---|---|---|---|
| Court | <2h | 30-50 (target 40) | Jeukendrup 2014 : 30-60 g/h <2h ; ACSM 2024 : 30 g/h suffit <2h | ✅ **Aligné** — borne haute volontairement basse pour éviter sur-dosage des trails 1h-1h30 |
| Moyen | 2-5h | 50-70 (target 60) | Jeukendrup 2014 : 60-90 g/h ; Tiller 2019 : 60-80 g/h | ⚠️ **Borne haute un peu basse**. 70 g/h plafond V2 sous-dose les coureurs trainés sur 4-5h chaud/exigeant. Référentiel solide : 60-80 g/h. |
| Long | 5-8h | 60-80 (target 70) | Tiller 2019 : 60-90 g/h ; ITRA/UTMB Academy : 70-90 g/h | ✅ **Aligné** |
| Ultra | >8h | 70-90 (target 80) | Tiller 2019 + Viribay 2020 : 70-100 g/h trainés ; Costa 2017 : viser plus bas si gut training absent | ✅ **Aligné** — borne 90 défendable comme borne haute |

**Verdict targets** : ✅ globalement OK. **Un ajustement utile** : relever borne haute palier moyen à 75 g/h (au lieu de 70) pour ne pas sous-doser les trails 4-5h exigeants (chaleur, D+, niveau Confirmé+).

**Référence chiffrée** :
- Jeukendrup 2014 *Nutrition for endurance sports* : 30-60 g/h <2h ; 60-90 g/h >2h
- Tiller et al. 2019 JISSN *Ultra-marathon nutrition position stand* : 150-400 kcal/h = ~38-100 g/h
- Costa et al. 2017 *Systematic review of GI issues* : seuil GI distress monte avec gut training, médiane 60-80 g/h
- Burke 2019 *Sports Nutrition* : palier <60 g/h novice, 60-90 trainé, >90 élite gut-entraîné

### 1.2 Cap "1 gel / 45 min max"

| Aspect | Verdict |
|---|---|
| Mécanique digestive (vidange gastrique gels concentrés) | ✅ **Juste**. Pfeiffer 2012 + Stuempfle 2015 : tolérance GI gels en course = max 1-1.5 gels/h continu sur >4h |
| Cap opérationnel | ✅ Bon garde-fou. Sur 26h cela donne 34 gels max — encore beaucoup mais infiniment plus crédible que 49 (V1) |
| Cas particulier ultra élite | ⚠️ Élite Viribay 2020 a démontré 120 g/h soutenu = 1 gel toutes 12 min, mais avec gut training spécifique. Ne pas modifier le cap V2 (visé grand public + Confirmé) |

**Verdict cap gels** : ✅ **Conserver tel quel**. C'est le fix structurel le plus important — l'absence de cap dans V1 produit 49-103 gels qui décrédibilisent l'outil.

### 1.3 Liste solides salés digestes

Liste V2 actuelle : **PdT, crackers, pain blanc, riz cuit**.

**Verdict** : ⚠️ **Incomplète**. Compléter par :

| Solide | Glucides/portion | Pourquoi |
|---|---|---|
| ✅ Pomme de terre | 20 g (1 PdT moyenne) | OK, déjà listé |
| ✅ Crackers salés (TUC, mini) | 15 g (6 unités) | OK |
| ✅ Pain blanc | 25 g (1 tartine) | OK |
| ✅ Riz cuit | 30 g (100g cuit) | OK |
| **+ Pâtes / gnocchis** | 30 g (80g cuits) | Base ravitaillement UTMB, très digeste |
| **+ Banane** | 25 g (1 moyenne) | Indispensable trail français, IG modéré |
| **+ Pâte de fruits** | 20 g (1 carré 25g) | Format poche, ne fond pas, salé option |
| **+ Demi-sandwich jambon/beurre** | 25 g | Doctrine BV Bramoullé H+6h |
| **+ Compote en gourde** | 25 g | Très digeste, alternative gel naturel |
| **+ Bouillon/soupe miso/coca plat** | 5-15 g (250 mL) | Reset gustatif Pfeiffer 2012 + sodium |

**À EXCLURE explicitement de la liste digeste H<6h** : saucisson, fromage gras, charcuterie épaisse (gras lent, GI distress probable avant H+6h). Ces aliments restent valides **après H+6h en BV uniquement**, jamais en autonomie sur sentier.

### 1.4 Seuil protéines >5h vs >8h

| Référentiel | Seuil utilité protéines |
|---|---|
| Saunders 2007 | Pas de bénéfice perf <4h |
| Knechtle 2018 | Bénéfice clair >8h (anti-catabolisme prouvé) |
| Tiller 2019 (ISSN ultra) | Recommandation 5-10 g/h dès >5h |
| Costa 2017 | Pas avant gut training établi (risque GI) |
| Balducci/Bramoullé terrain | Salé naturel BV >6h, protocole protéines >8h |

**Verdict seuil protéines** : ⚠️ **>5h est un compromis défendable** mais à **doser bas** (5 g/h max) pour ne pas alourdir le pack. Le saut à 7-10 g/h **doit attendre >8h** (Knechtle).

**Recommandation** :
- 5-8h : protéines en option, 5 g/h max, salé naturel suffit (saucisson en BV uniquement, jamais en autonomie)
- 8-15h : 7 g/h (preuve solide Knechtle)
- 15h+ : 7-10 g/h (zone TDG/UTMB, anti-catabolisme critique)

Le seuil V2 ">5h" est OK **à condition** que le messaging dise "optionnel, salé suffit", pas "obligatoire 5 g/h".

### 1.5 Hydratation 400-700 mL/h selon météo

| Aspect | Verdict |
|---|---|
| Borne basse 400 mL/h | ✅ Aligné Hoffman 2014 (moyenne réelle ultra) |
| Borne haute 700 mL/h "standard" | ✅ Cohérent, ne risque pas EAH |
| Météo >25°C + sudation Élevé/Salty | ⚠️ Peut nécessiter dépassement ponctuel à 800-900 mL/h. La plage "400-700" risque de sous-doser le profil tropical. **Garder cap absolu 1000 mL/h (Hew-Butler 2015)** et autoriser jusqu'à 850 mL/h sur cas extrême chaleur+sudation |
| Plafond F<65 kg climat extrême | ⚠️ **À ajouter explicitement** : 850 mL/h max (Hoffman 2014 montre que la consommation réelle terrain reste 500-650 mL/h pour ce profil) |

**Verdict hydratation** : ⚠️ **Plage 400-700 trop étroite par défaut**. Proposer :
- Standard / froid : 450-550 mL/h
- Modéré chaud (18-25°C) : 550-700 mL/h
- Chaud (>25°C) + Élevé : 650-850 mL/h
- Cap absolu 1000 mL/h, plafond protecteur 850 si F<65kg

### 1.6 Anti-métronome "1 gel par section technique"

**Verdict** : ⚠️ **Opérationnel mais flou**. "Section technique" est subjectif.

**Reformulation suggérée** :
- "1 gel toutes 30-45 min, calé sur un repère mémorable (sommet, refuge, base de vie, descente technique)"
- Anti-métronome = **éviter le minuteur strict** qui force la prise sur portion technique inadaptée
- Règle pragmatique : "Si tu peux mâcher = OK pour gel. Si tu cours en équilibre/freinage = retarde 5-10 min"

C'est plus actionnable qu'un repère "section technique" non défini.

---

## 2. Simulation 11 profils — V1 vs V2 vs reco expert

**Hypothèses constantes** (sauf indication contraire) : 72 kg H, niveau adapté (Régulier <5h, Confirmé 5-15h, Expert >15h), Habitué nutrition pour Confirmé+, météo standard 15°C, sudation Modéré, café 1-2/j, pas de premierMode.

### Profil 1 — 10 km / 500 D+ (1h15)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 45 | 40 | 30-45 selon intensité |
| Glucides total | 56 g | 50 g | ~40 g |
| Hydratation | 556 mL/h | 500 mL/h | 400-500 mL/h |
| Gels | 2 | 0 (boisson dominante) | 0-1 gel + 1 bidon iso 30g |
| Protéines | 0 | 0 | 0 |
| Bidons | 1 | 1 | 1 (500 mL iso) |

**V1** : pertinent mais légèrement sur-doses (2 gels pour 1h15 c'est trop).
**V2** : ✅ pertinent. Boisson dominante = doctrine correcte sur 1h15.
**Reco** : 1 bidon 500 mL iso 6 % (30 g glucides) + 1 gel facultatif si creux H45.

### Profil 2 — 27 km / 1500 D+ (~3h50)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 75 | 60 | 60-70 |
| Glucides total | 287 g | 230 g | 220-250 g |
| Hydratation | 556 mL/h | 500 mL/h | 500-600 mL/h |
| Gels | **9** | 1 | 3-5 gels |
| Solides salés | non géré | 2 (1 BV + 1 H3) | 1-2 (banane + crackers BV) |
| Protéines | 0 | 0 | 0 |
| Bidons | 4 | 2 | 2-3 bidons iso |

**V1** : ❌ **Over-engineered** (9 gels = doctrine pack mono-gel cassée).
**V2** : ⚠️ **Légèrement sous-dosé en gels** (1 seul gel). La répartition boisson 115g + solides 60g + 30g stock = 205g, il manque 25g → devrait être 2 gels.
**Reco** : 2 bidons iso 6 % (60g) + 3 gels (75g) + 1 banane BV (25g) + 1 cracker salé BV (15g) = ~205g + stock 30g = ~235g. C'est ce qu'un coach trail conseillerait.

### Profil 3 — 27 km / 3000 D+ (~4h45)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 75 | 60 | 65-75 |
| Glucides total | 356 g | 285 g | 290-340 g |
| Hydratation | 612 mL/h | 500 mL/h | 550-650 mL/h |
| Gels | **12** | 3 | 4-6 gels |
| Solides | non géré | 2 | 2-3 (banane + crackers + soupe BV) |
| Protéines V1 | 12 g | 0 | 0 |
| Protéines V2 | — | 0 | 0 (4h45 < seuil 5h) |

**V1** : ❌ 12 gels + protéines déjà déclenchées = over-engineered + ultra-ification d'un trail 5h.
**V2** : ✅ **Pertinent**. 3 gels + 2 solides + 2 bidons iso = pack réaliste. Protéines OFF (h<5).
**Reco** : ✅ identique V2. Très haut D+ → coût Minetti élevé mais glucides absorbables restent capés ~70 g/h. C'est un trail "court intense" pas un ultra.

### Profil 4 — 47 km / 3000 D+ (~7h30)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 80 | 70 | 70-80 |
| Glucides total | 600 g | 525 g | 525-600 g |
| Hydratation | 612 mL/h | 500 mL/h | 550-650 mL/h |
| Gels | **20** | 8 | 8-10 gels |
| Solides | non géré | 4 (2 BV + 2 H3+) | 4-5 |
| Protéines V1 | 32 g | — | — |
| Protéines V2 | — | 18 g (5 g/h × 3.5h) | 10-20 g (option) |

**V1** : ❌ 20 gels pour 7h30 = inhumain. Doctrine pack mono-gel cassée.
**V2** : ✅ **Pertinent**. 8 gels = 1 gel/55 min, sous le cap 45 min. Solides H3+ correctement positionnés. Protéines légères 5 g/h pertinentes >5h.
**Reco** : ✅ Aligné V2. Coach trail : "2 bidons iso entre 2 BV + 8 gels + soupe/pain BV ×2 + 2-3 prises solides intermédiaires (pâte de fruit, banane)".

### Profil 5 — 55 km / 4000 D+ (~9h30)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 80 | 80 | 75-85 |
| Glucides total | 760 g | 760 g | 700-800 g |
| Hydratation | 612 mL/h | 500 mL/h | 550-650 mL/h |
| Gels | **25** | 12 | 10-14 gels |
| Solides | non géré | 6 (3 BV + 3) | 6-8 |
| Protéines V1 | 46 g | — | — |
| Protéines V2 | — | 44 g (8 g/h × 5.5h) | 30-50 g |

**V1** : ❌ 25 gels = irréaliste.
**V2** : ✅ **Pertinent**. 12 gels = 1 gel/47 min ≈ cap. 6 solides = doctrine BV+autonomie respectée.
**Reco** : ✅ Coach UTMB Academy : "10-12 gels + 4-6 prises solides BV (soupe+pâtes+jambon-beurre) + 2-3 prises solides autonomie (banane, pâte fruits) + 2-3 bidons iso entre BV". V2 OK.

### Profil 6 — 55 km / 1200 D+ (~7h30)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 80 | 70 | 70-80 |
| Glucides total | 600 g | 525 g | 525-600 g |
| Gels | **20** | 8 | 8-10 |
| Solides | non géré | 4 | 4-5 |
| Protéines V1 | 32 g | — | — |
| Protéines V2 | — | 18 g | 10-20 g |

**V1** : ❌ 20 gels.
**V2** : ✅ **Pertinent**. D+ bas → plus de course continue → tolérance gels meilleure, mais cap 1/45min reste juste.
**Reco** : ✅ Aligné V2.

### Profil 7 — 75 km / 1500 D+ (~10h30)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 80 | 80 | 70-85 |
| Glucides total | 840 g | 840 g | 750-900 g |
| Gels | **28** | 14 | 12-16 |
| Solides | non géré | 6 (3 BV + 3) | 7-9 |
| Protéines V1 | 53 g | — | — |
| Protéines V2 | — | 52 g | 40-60 g |

**V1** : ❌ 28 gels.
**V2** : ✅ **Pertinent**. Cap 1/45min = 14 gels exactement.
**Reco** : ✅ Coach trail Saintélyon-like : "14 gels max + 3 ravitos solides BV (soupe, pâtes, jambon) + 3-4 collations solides autonomie (compote, banane, pâte fruits) + 2 bidons iso entre BV". V2 OK.

### Profil 8 — 75 km / 4300 D+ (~14h)

**Note typo** : Romane a écrit "43000 D+", interprété comme **4300 D+** (43 000 D+ serait irréaliste, supérieur au Tor des Géants).

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 70 (palier 12-24h V1) | 80 | 75-85 |
| Glucides total | 980 g | 1120 g | 1000-1100 g |
| Hydratation | 612 mL/h | 500 mL/h | 550-650 mL/h |
| Gels | **32** | 18 | 15-20 |
| Solides | non géré | 9 | 10-12 |
| Protéines V1 | 77 g | — | — |
| Protéines V2 | — | 80 g (8 g/h × 10h) | 70-100 g |

**V1** : ⚠️ Cible 70 g/h sous-dose (palier V1 "12-24h" appliqué) **+** 32 gels irréaliste.
**V2** : ✅ **Pertinent**. La cible 80 g/h corrige le sous-dosage V1 sur 14h. 18 gels + 9 solides + protéines 8 g/h sont alignés terrain.
**Reco** : ✅ Aligné V2. Coach trail montagne : "Cible 75-80 g/h, alterne dès H+3 sucré/salé, dès H+6 bascule salé dominant, dès H+10 aliments vrais (soupe, gnocchis, omelette en BV)".

### Profil 9 — 85 km / 6000 D+ (~16h)

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 70 | 80 | 75-85 |
| Glucides total | 1120 g | 1280 g | 1200-1400 g |
| Hydratation | 612 mL/h | 500 mL/h | 550-650 mL/h |
| Gels | **36** | 21 | 18-24 |
| Solides | non géré | 11 | 12-15 |
| Protéines V1 | 91 g | — | — |
| Protéines V2 | — | 96 g | 80-120 g |

**V1** : ❌ 36 gels + cible 70 g/h sous-dosée pour 16h Expert.
**V2** : ✅ **Pertinent**. Cap 21 gels (16h × 60/45). 80 g/h cohérent ultra trainé.
**Reco** : ✅ Profil UTMB/Diagonale typique. V2 aligné.

### Profil 10 — 100 km / 6500 D+ (~19h)

**Note typo** : Romane a écrit "65000 D+", interprété comme **6500 D+** (cohérent ratio km/D+ ultra).

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 70 | 80 | 70-85 |
| Glucides total | 1330 g | 1520 g | 1330-1600 g |
| Hydratation | 612 mL/h | 500 mL/h | 500-650 mL/h |
| Gels | **43** | 25 | 22-28 |
| Solides | non géré | 14 | 14-18 |
| Protéines V1 | 112 g | — | — |
| Protéines V2 | — | 120 g | 100-140 g |

**V1** : ❌ 43 gels = inacceptable.
**V2** : ✅ **Pertinent**. 25 gels = cap 1/45min strict, 14 solides + protéines 8 g/h = pack ultra crédible.
**Reco** : ✅ Profil UTMB finisher. Coach trail : "Cible 75-80 g/h, alternance 50/50 gel-solide dès H+6, salé dominant dès H+8 en BV (soupe miso, riz salé, gnocchis), caféine 1-2 mg/kg en début de nuit".

### Profil 11 — 130 km / 7500 D+ (~26h)

**Note typo** : Romane a écrit "75000 D+", interprété comme **7500 D+**.

| Métrique | V1 | V2 | Reco expert |
|---|---|---|---|
| g/h cible | 60 (palier >24h V1) | 80 | 65-80 |
| Glucides total | 1560 g | 2080 g | 1700-2100 g |
| Hydratation | 612 mL/h × pause 0.85 | 500 × 0.85 | 500-600 × pause 0.85 |
| Gels | **49** | 34 | 25-35 |
| Solides | non géré | 19 | 20-30 |
| Protéines V1 | 161 g | — | — |
| Protéines V2 | — | 176 g | 150-220 g |

**V1** : ❌ 49 gels **et** cible 60 g/h sous-dosée pour ultra trainé.
**V2** : ⚠️ **Globalement pertinent mais à nuancer** : 34 gels reste beaucoup (cap 1/45min sur 26h). 80 g/h cible est haute pour 26h — Tiller 2019 mentionne que beaucoup d'ultra-runners descendent à 60-70 g/h dans la 2e moitié pour préserver le gut. Proposer **palier "très long >18h" à 70-80 g/h** plutôt que 80 g/h flat ?
**Reco** : ✅ Coach TDG/UTMB Trace : "Cible 70-80 g/h H1-H12, redescendre à 60-70 g/h H12-H24+, dominante salé/aliments vrais BV. Sommeil 1-2h + sieste = critique. Protocole personnalisé diététicien recommandé." V2 OK mais avec **nuance "viser borne basse en 2e moitié"**.

---

## 3. Synthèse comparative 11 profils

| # | Profil | V1 verdict | V2 verdict | Reco coach |
|---|---|---|---|---|
| 1 | 10 km / 500 / 1h15 | OK (léger sur-dosage gels) | ✅ pertinent | 0-1 gel + 1 bidon iso |
| 2 | 27 km / 1500 / 3h50 | ❌ over-engineered (9 gels) | ⚠️ légèrement sous-dosé (1 gel) | 3 gels + 2 solides + 2 bidons iso |
| 3 | 27 km / 3000 / 4h45 | ❌ over-engineered (12 gels + prot) | ✅ pertinent | 4-6 gels + 2-3 solides + 2 bidons iso |
| 4 | 47 km / 3000 / 7h30 | ❌ over-engineered (20 gels) | ✅ pertinent | 8-10 gels + 4-5 solides + protéines option |
| 5 | 55 km / 4000 / 9h30 | ❌ over-engineered (25 gels) | ✅ pertinent | 10-14 gels + 6-8 solides + prot 5-8 g/h |
| 6 | 55 km / 1200 / 7h30 | ❌ over-engineered (20 gels) | ✅ pertinent | 8-10 gels + 4-5 solides |
| 7 | 75 km / 1500 / 10h30 | ❌ over-engineered (28 gels) | ✅ pertinent | 12-16 gels + 7-9 solides |
| 8 | 75 km / 4300 / 14h | ❌ sous-doses g/h + 32 gels | ✅ pertinent | 15-20 gels + 10-12 solides + prot 8 g/h |
| 9 | 85 km / 6000 / 16h | ❌ sous-doses g/h + 36 gels | ✅ pertinent | 18-24 gels + 12-15 solides + prot 8 g/h |
| 10 | 100 km / 6500 / 19h | ❌ sous-doses g/h + 43 gels | ✅ pertinent | 22-28 gels + 14-18 solides |
| 11 | 130 km / 7500 / 26h | ❌ 49 gels + sous-doses g/h | ⚠️ à nuancer (palier 18h+) | 25-35 gels + 20-30 solides + viser 70 g/h H12+ |

**Bilan V2** :
- ✅ 9/11 profils pertinents direct
- ⚠️ 2/11 nécessitent micro-ajustement (#2 sous-dosé en gels, #11 palier "très long")
- ❌ 0/11 dangereux

**Bilan V1** :
- ✅ 1/11 OK (profil 1)
- ❌ 10/11 over-engineered (gels) ou sous-dosés (g/h sur 14h+)

---

## 4. Cas particuliers détectés

### 4.1 Profil 2 — Sous-dosage gels V2 sur le palier 2-5h limite haute
Avec target 60 g/h × 3h50 - 30 (stock) - 60 (2 solides) - 115 (boisson 30 g/h) = 25g restants → 1 gel.

**Cause** : la boisson 30 g/h × durée est trop comptée comme certaine. En pratique, un coureur ne boit pas toujours iso 6 % constant (alternance eau plate + iso).

**Fix proposé** : compter boisson 20-25 g/h "garantie" plutôt que 30 g/h sur palier moyen. Cela ramène 3 gels = aligné reco expert.

### 4.2 Profil 11 — Palier ultra "flat" à 80 g/h sur 26h
Le palier V2 ">8h = 80 g/h" est top sur 8-15h, mais sur 20-30h la borne haute risque de sur-doser le système GI.

**Fix proposé** : ajouter un **5e palier "Très long >18h"** :
- 18-30h → 65-80 g/h (target 70)
- >30h → 50-70 g/h (target 60) [doctrine TDG, gut fatigue cumulée]

Sinon, l'outil dira 80 g/h × 26h = 2080g glucides — chiffre crédible mais que peu d'humains tolèrent réellement.

### 4.3 Profil 3 — 27 km / 3000 D+ : cas tordu D+/distance élevé sur format court
**Spécificité** : densité D+ élevée (111 m/km), durée 4h45. V1 lit 5h pour déclencher protéines (4.75 → seuil 4h V1 active prot). V2 ne déclenche pas (h=4.75 < 5h).

**Verdict** : ✅ V2 a raison. Protéines inutiles sur 4h45. Vrai coach trail : "Sur trail montagne court intense, focus glucides absorption + sodium pertes sueur, protéines hors sujet".

### 4.4 Trails ultra avec haute densité D+ + faible niveau (non testé ici)
Cas non couvert mais potentiel : 75 km / 6000 D+ par un Régulier (durée projetée >20h).
**Risque** : V2 cible 80 g/h × 20h = 1600g pour un coureur non gut-trained = quasi-certain GI distress.
**Fix** : conserver la pondération `expNutrition === 'Jamais' → -20%` (déjà dans V1, à garder en V2).

### 4.5 Profil F petit gabarit climat extrême (non testé ici)
Cas Diagonale 60 kg F + humide + altitude (audit précédent #18).
**Fix** : conserver le plafond hydratation 850 mL/h pour F<65 kg en humide+altitude (issu de l'audit V1).

---

## 5. Ajustements V2 finaux recommandés

### A. Targets g/h — micro-ajustements

| Palier V2 actuel | Ajustement final |
|---|---|
| <2h : 30-50 (40) | ✅ inchangé |
| 2-5h : 50-70 (60) | ⚠️ → **50-75 (target 60)** — relever borne haute pour Confirmé+ sur trails 4-5h exigeants |
| 5-8h : 60-80 (70) | ✅ inchangé |
| 8-18h : 70-90 (80) | ⚠️ **renommer palier "8-18h"** au lieu de ">8h" |
| **>18h** (nouveau) | **65-80 g/h (target 70)** — palier ultra long, gut fatigue cumulée |
| **>30h** (warning) | 50-70 g/h (target 60) — orientation diététicien (déjà dans V1) |

### B. Cap gels — conserver tel quel

✅ "1 gel / 45 min max" est juste. **Ajouter règle complémentaire** :
- Sur palier ultra >12h : forcer ratio solide/gel ≥ 50/50 (sinon le pack reste lourd même avec cap respecté)

### C. Solides — compléter liste

Ajouter à la liste digeste : **banane, pâte de fruits, demi-sandwich jambon-beurre, compote en gourde, gnocchis, bouillon/soupe miso**.

**Exclure explicitement avant H+6h** : saucisson, fromage gras, charcuterie épaisse (autorisés en BV après H+6h uniquement).

### D. Protéines — affiner palier

| Durée | Protéines V2 final |
|---|---|
| <5h | 0 (jamais) |
| 5-8h | **Optionnel** 0-5 g/h (salé naturel BV suffit, pas de gel protéiné forcé) |
| 8-15h | 7 g/h (Knechtle 2018) |
| >15h | 7-10 g/h |

### E. Hydratation — élargir plage

| Conditions | mL/h V2 final |
|---|---|
| Froid <10°C / sudation Faible | 350-500 |
| Standard 10-18°C / Modéré | 450-600 |
| Chaud 18-25°C / Modéré-Élevé | 550-700 |
| Très chaud >25°C + Élevé/Salty | 650-850 (cap absolu 1000) |
| F<65kg + humide + altitude | **plafond 850 mL/h** (Hoffman) |

### F. Anti-métronome — reformuler

Remplacer "1 gel par section technique" par :
> "Cale tes prises sur des repères mémorables (sommet, refuge, base de vie). Évite le minuteur strict : si tu cours en équilibre/freinage technique = retarde 5-10 min, ton estomac ne gère pas la concentration et l'effort équilibre en même temps."

### G. Boisson dominante palier court — calibrer comptage

Sur palier moyen (2-5h), compter **boisson 20-25 g/h "garantie"** (pas 30 g/h) pour éviter sous-dosage en gels (cas profil 2). Le user n'est pas certain de tenir 30 g/h iso pur 100 % du temps.

---

## 6. Risques détectés

### 6.1 Risque sous-dosage palier moyen 2-5h
**Profil exposé** : trail 27 km / 1500 D+ / 4h chez Régulier.
**Risque** : 1 seul gel recommandé → coureur ressent creux H3 et pioche en panique.
**Mitigation** : recalibrer boisson 20-25 g/h (cf. §5.G) → 3 gels recommandés = aligné expert.

### 6.2 Risque sur-dosage palier ultra 20h+ avec target 80 g/h flat
**Profil exposé** : 100-130 km par coureur Confirmé non-élite.
**Risque** : viser 80 g/h × 25h = 2000g glucides → GI distress probable dès H+15.
**Mitigation** : ajouter palier "très long >18h" à 65-80 g/h (cf. §5.A).

### 6.3 Risque incohérence pack vs timeline (déjà identifié V1, à éviter V2)
**Vérification V2** : le pack output doit aligner avec la timeline qui prescrit salé dès H+6 et aliments vrais H+8. V2 le fait via les "solides salés" comptés explicitement. ✅ OK.

### 6.4 Risque psychologique "pack allégé = sous-alimentation"
Après application V2, un user habitué V1 (66 gels UTMB) verra 23-25 gels et pensera être sous-alimenté.
**Mitigation** : ajouter texte explicatif sous le pack : "Le reste des glucides (X g) est apporté par boisson iso + solides BV + collations solides intermédiaires. Ratio terrain UTMB finisher : 30-40 % gels, 60-70 % autres formats" (déjà recommandé dans audit V1 §4.5).

### 6.5 Cas tordu non couvert : 75 km / 4300 D+ par Régulier très lent (18-20h)
Profil potentiel : un Régulier à 11 min/km sur 75km très technique → 18h.
**Risque** : V2 active palier ultra (>8h) à 80 g/h mais ce profil n'a pas le gut training. Cap V1 `expNutrition === 'Jamais' → -20 %` à conserver. ✅ déjà géré.

---

## 7. Validation finale

### Verdict global V2 (avec ajustements §5)

✅ **GO Spec V2 prête à coder avec ajustements §5 intégrés**

**Justification** :
- 9/11 profils validés direct, 2/11 micro-ajustements (palier moyen comptage boisson + palier très long >18h)
- 0 profil dangereux, 0 profil sous-dosé en sécurité (cap EAH 1000 mL/h conservé)
- Cap 1 gel/45 min = fix structurel majeur qui résout le problème V1 "66 gels UTMB"
- Liste solides à compléter (banane, pâte fruits, demi-sandwich, compote)
- Seuil protéines >5h défendable si messaging "optionnel"
- Hydratation à élargir 350-850 mL/h selon contexte (au lieu de 400-700 flat)

### Checklist avant coder V2

1. ✅ Implémenter `carbsByTrailDuration_V2` avec 5 paliers (<2h / 2-5h / 5-8h / 8-18h / >18h)
2. ✅ Implémenter cap gels `Math.floor(h × 60 / 45)`
3. ✅ Implémenter compteur boisson 20-30 g/h et compteur solides explicite
4. ✅ Ratio solide/gel ≥ 50/50 sur palier ultra >12h
5. ✅ Conserver pondérations V1 : `expNutrition === 'Jamais' → -20%`, `sexe F → -10%`, `premierMode → cap 60 g/h`
6. ✅ Conserver caps sécurité V1 : EAH 1000 mL/h, caféine 6 mg/kg, plafond F<65kg humide+altitude
7. ✅ Refonte timeline pour aligner avec pack (déjà en partie OK dans V1, à compléter avec solides)
8. ✅ Texte explicatif sous pack : "Reste des glucides via boisson + solides BV + collations"
9. ✅ Reformuler anti-métronome (cf. §5.F)
10. ✅ Étendre cap durée à 150h pour Expert non-premierMode (fix #3 audit V1, à reprendre)

### Risques résiduels acceptés

- Pack ultra reste lourd visuellement (25-35 gels sur 130 km) mais c'est honnête, pas masquable
- Cible 80 g/h sur 8-18h peut nécessiter gut training (à signaler dans warnings)
- Profil F<65kg climat extrême reste à monitorer post-déploiement

---

## 8. Sources scientifiques mobilisées

| Domaine | Source clé | Verdict V2 |
|---|---|---|
| Glucides plages | Jeukendrup 2014, Tiller 2019, ACSM 2024 | ✅ aligné |
| Cap glucides élite | Viribay 2020 (120 g/h trainés) | non utilisé V2 (sage) |
| Gut training | Costa 2017 | ✅ pondération conservée |
| Cap EAH | Hew-Butler 2015 (1000 mL/h) | ✅ conservé |
| Hydra terrain réelle | Hoffman 2014 (400-650 mL/h) | ✅ aligné V2 |
| Cap caféine | Grgic 2020 (6 mg/kg) | ✅ conservé |
| Protéines ultra | Knechtle 2018 (>8h preuve) + Saunders 2007 | ✅ palier 5/8h défendable |
| Pack mixte | Balducci/Bramoullé terrain | ✅ V2 corrige V1 |
| Coût énergétique | Minetti 2002 + Vernillo 2017 | ✅ cap 1000 kcal/h conservé |
| Distance équivalente | ITRA Performance Index | ✅ conservé |
| MAM altitude | Lipman 2013 | ✅ conservé |
| Lassitude gustative | Pfeiffer 2012, Stuempfle 2015 | ✅ timeline conservée |
| Sodium pertes | Stofan 2005, Costa 2019 | ✅ conservé |

---

## 9. Conclusion expert

**La spec V2 est solide et prête à coder, sous réserve des 7 ajustements §5**.

Les fondations scientifiques sont correctes : 4 paliers alignés référentiels, cap gels physiologique, hiérarchie boisson > gels > solides cohérente avec doctrine Balducci/Bramoullé/Tiller. La V2 résout les défauts structurels V1 identifiés (mono-gel pack, protéines trop précoces, sous-dosage g/h sur 14h+).

Les ajustements clés à intégrer **avant code** :
1. **5e palier "très long >18h"** à 65-80 g/h (sinon profil 11 sur-dosé GI)
2. **Recalibrage boisson 20-25 g/h** sur palier 2-5h (sinon profil 2 sous-dosé en gels)
3. **Liste solides complète** (banane, pâte fruits, demi-sandwich, compote, gnocchis, bouillon)
4. **Distinction salé H<6h vs H>6h** (saucisson/fromage interdits avant H+6, OK en BV après)
5. **Hydratation plage élargie 350-850 mL/h** selon météo+sudation (au lieu de 400-700 flat)
6. **Protéines optionnelles 5-8h, obligatoires 8h+** (au lieu de 5g/h flat dès 5h)
7. **Reformulation anti-métronome** : "repères mémorables" au lieu de "sections techniques"

Avec ces ajustements, la V2 couvre les 11 profils testés et reste sécurisée (EAH, caféine, premier ultra). **Décision : GO Spec V2 ajustée**.

---

**Fin de l'audit.**
