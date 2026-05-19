# Validation PM senior — Brief V4 FINAL Nutrition Course
Date: 2026-05-17
Reviewer: PM senior CRIA (historique complet projet — 1500+ plans, doctrine progressive)

---

## Synthèse exec

- VALIDÉS : **8/13** sections (§1, §2, §4, §5, §7, §9, §11, §12)
- CONDITIONNELS : **5/13** sections (§0, §3, §6, §8, §10)
- CHALLENGÉS : **0/13**
- **Recommandation globale : GO dev APRÈS modifs PM ci-dessous (priorité P1 bloquantes : 4 items)**

Le brief V4 est **solide à 92 %**. La doctrine CRIA est respectée dans sa lettre. Les 5 conditionnels portent sur : (1) cross-sell sous-exploité, (2) un input intime à clarifier RGPD, (3) une formulation EAH ultra anxiogène à doser, (4) une mention "diététicien" dans le welcome plan qui élargit le scope au-delà de notre offre, (5) un PDF MVP qui peut basculer en over-engineering si mal scopé.

**Aucune section ne challenge la doctrine de manière irrécupérable**. Tous les conditionnels se règlent en <2h de PM avant dev.

---

## Verdict par section (§0 à §12)

### §0 — Synthèse exec (évolutions V3 → V4)

**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible
**Impact conversion** : neutre
**Si CONDITIONNEL** :
- Ligne 14 du tableau ("Mode Premier marathon/semi/ultra") → préciser qu'il **n'est PAS désactivable côté UI quand Niveau=Débutant** (sinon un débutant l'enlève et perd la sécurité). Le toggle existe mais en lecture seule pour les débutants. Sinon mode = optionnel = jamais activé = warnings sécurité contournés.
- Ligne 17 → l'articulation outil↔plan doit être marquée comme **delta doctrine** (modif mémoire) dans la synthèse exec elle-même, pas seulement en §8.4. Quiconque lit la synthèse doit voir qu'une doctrine est touchée.
- Reformuler ligne 1 du tableau : "120 g/h = gut-trained 6-8 sem documenté" → ajouter "et **réservé sub-2h45 confirmés**" (sinon un sub-2h30 débutant pourrait tester 120 g/h). Cohérent avec doctrine sécurité > conversion.

---

### §1 — Positionnement

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : positif

Le warning pré/post + warning gut training sont bien hiérarchisés. La promesse user est honnête, sans survente. Le "bouton Compris, montre-moi les chiffres" est un excellent friction-utile (n'empêche pas la conversion, force la lecture). Aligné `feedback_securite_avant_conversion`, `feedback_compromis_messages_preventifs`.

Single nit (non bloquant) : le warning de tête mentionne "consulte ton coach, un diététicien du sport, ou ta fédération" — on pourrait ajouter "ou utilise nos plans d'entraînement pour structurer ton approche" mais ce serait gold-plating. Le brief se tient tel quel.

---

### §2 — Architecture technique

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : positif

Composant React partagé + 3 configs = excellente économie dev. Le sous-menu Outils place "Nutrition Course" en dernier, ce qui est correct (volume search inférieur aux convertisseurs). V2 future (ultra >100km, 10km séparés, PWA, pré/post) bien priorisée selon analytics — pas d'over-engineering MVP.

`durationRange: [2, 6.5]` marathon = cohérent avec extension sub-6h V4. RAS.

---

### §3 — Inputs du calculateur

**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : moyen (RGPD + doctrine `feedback_jamais_poids_minceur`)
**Impact conversion** : neutre
**Si CONDITIONNEL** :

1. **Input "Phase cycle menstruel" (§3.1)** : optionnel mais affiché par défaut = risque perception "outil intime / médical". Modifier : input **masqué derrière un lien "+ Affiner pour profil féminin (optionnel)"** qui n'apparaît que si Sexe=F. Sinon : 50 % des users H verront un champ "cycle menstruel" grisé = bug de perception. **Bloquant P1**.

2. **Input "Poids"** : la note dit "JAMAIS affiché ailleurs, jamais cité en message" — bien. Ajouter explicitement : **pas envoyé en analytics, pas stocké côté serveur, vit uniquement en localStorage + URL query string optionnelle**. Aligne `feedback_jamais_poids_minceur` côté tech.

3. **Mini-questionnaire scoré (§3.5)** : 5 questions OK mais la question 3 ("crampes même bien hydraté") peut induire en erreur — les crampes ont des causes multiples (fatigue neuromusculaire >> sodium dans la littérature actuelle, Schwellnus 2009). Reformuler : "Tu as déjà ressenti des crampes que tu attribues au manque de sel ?" — plus honnête épistémiquement. **Non bloquant P2**.

4. **Borne basse Trail <10km (§3.6)** : excellent garde-fou. Validé tel quel.

5. **Mode "Premier" required si Débutant** : bien mais préciser que l'input est **pré-coché Oui et non décochable** quand Niveau=Débutant (cf. §0 ci-dessus). **Bloquant P1**.

---

### §4 — Formules de calcul

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : positif (crédibilité)

Les 10 sous-sections sont scientifiquement adressées, sourcées DOI, et les corrections docteur intégrées proprement. Le passage 90-120 → 90-110 g/h sub-2h30 est sage (conformité doctrine sécurité). La distinction altitude aigu/acclimaté apporte une vraie valeur perçue.

Single point d'attention pour le dev (à mettre en §12.2) : le calcul Minetti pondéré demande de **clamper le coefficient grimpée à un range défini** sinon un user qui rentre 15000 m D+ sur 50 km va sortir des kcal/h délirantes. Mais c'est de l'implem, pas du brief.

---

### §5 — Cartes de résultat

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : très positif

La carte §5.5 "Quand tester ta stratégie" avec CTA générateur de plans = **meilleur cross-sell du brief**. Bien positionnée (post-synthèse, après le moment de valeur). Le message anti-rigidité en pied de carte synthèse (anti-TCA soft) est doctrinalement parfait, cohérent avec `feedback_jamais_poids_minceur` + `feedback_securite_avant_conversion`.

La carte §5.6 "Méthodologie & limites" renforce la perception "outil sérieux" — différenciant fort vs concurrence (Aptonia/Overstim's ne le font pas).

Nit non bloquant : la carte "Pack nutrition" (§5.1.3) mentionne "X gels marque type" — éviter le naming concurrent direct (Maurten, SiS) dans les exemples par défaut pour éviter d'apparaître affilié. Préférer "gel iso 25 g de glucides" générique. Le brief le laisse ambigu.

---

### §6 — Warnings & garde-fous sécurité

**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible
**Impact conversion** : négatif si non corrigé (warnings trop anxiogènes peuvent perdre l'user avant la value)
**Si CONDITIONNEL** :

1. **§6.3 Warning EAH trail/ultra** : la formulation "prise de poids pendant la course (urines très claires + abondantes = OVER-hydratation)" est techniquement juste mais demande à l'user de **se peser EN COURSE** ce qui est irréaliste. Reformuler : "**Signes à surveiller** : nausées, maux de tête, confusion mentale, gonflement des doigts/anneau de bague trop serré, urines très claires ET abondantes. Si suspicion → arrête l'eau plate, prends sodium + aliment salé, repose-toi 30 min." Plus actionnable. **Bloquant P2**.

2. **§6.5 Disclaimer médical élargi** : la liste de 10+ pathologies est correcte cliniquement mais **risque "scared off"** au premier load. Modifier : afficher en **accordéon replié par défaut** intitulé "Cet outil ne s'applique pas si tu as une condition médicale (cliquer pour voir la liste)". L'user qui clique veut savoir ; l'user healthy ne se prend pas un mur clinique en pleine face. **Bloquant P1**.

3. **§6.7 Cycle menstruel Option B générique** : bien validé en doctrine. Mais préciser que ce message **n'apparaît que si Sexe=F** (sinon un H lit "deuxième moitié de cycle" = bug perception). **Bloquant P1**.

4. **§6.8 Validation logique inputs** : excellent, respecte `feedback_compromis_messages_preventifs`. Validé.

5. **§6.2 Mode "Premier"** : caféine plafonnée à 3 mg/kg max — OK mais préciser que **boost final (100-200 mg) reste désactivé** pour Premier (sinon le plafond saute via la carte caféine pré-fin). **Non bloquant P2**.

---

### §7 — SEO & contenu (1500-2500 mots/page)

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : positif

ROI sur effort rédactionnel : justifié. Les volumes KW (nutrition trail 480, nutrition marathon 390, semi 170) + longue traîne ciblée (sub-3h/sub-5h30/sub-6h, "premier semi/marathon", "mur du 30e km") = **traffic SEO acquérable à 6-12 mois**. C'est l'asset principal du brief pour le coût-acquisition.

Note opérationnelle : 3 pages × 2000 mots = ~6000 mots à rédiger. Externalisable ou batch Claude avec relecture humaine. Pas un blocant brief, c'est de l'exécution.

La FAQ tabulée (12-15 questions par page) = excellent format pour featured snippets Google. Validé.

---

### §8 — Maillage interne + articulation outil ↔ plan

**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : faible (touche `feedback_pas_de_nutrition_dans_plan`)
**Impact conversion** : très positif si bien fait, neutre sinon
**Si CONDITIONNEL** :

1. **§8.2.1 CTA principal en haut de l'outil** : "Pas encore de plan d'entraînement structuré ? Notre générateur te crée un plan personnalisé en 2 min — gratuit." Le placement "sous le warning gut training" est **trop tôt** — l'user n'a pas encore vécu le moment de valeur (le calcul). Risque : il ferme la pub avant d'utiliser l'outil. Déplacer : **CTA principal = post-synthèse** (carte §5.5, qui l'a déjà). Le placement "haut" devient un **bandeau discret** en pied de page, ou supprimé. **Bloquant P1 conversion**.

2. **§8.3.1 Welcome message du plan** : "Pour la calculer et la tester sur tes sorties longues, va sur notre outil dédié" — bien. Mais retirer le mot "**diététicien**" de la doctrine si présent ailleurs, on ne vend pas ça. Vérifier : le texte ne le mentionne pas, donc OK. **Non bloquant.**

3. **§8.4 Documentation doctrine** : la modif proposée à `feedback_pas_de_nutrition_dans_plan` est correcte. **À acter en mémoire AVANT dev** (cf. section dédiée plus bas). Validé conditionnel.

4. **CTA tertiaire FAQ** : "Lance ton plan 12-16 semaines avant ta course objectif" — bien. Mais ajouter une variante "Hyrox" puisque la FAQ semi mentionne Hyrox (§7.3) — cohérent avec mémoire `project_coach_running_ia_hyrox_scope`. **Non bloquant P2**.

5. **Manque** : cross-sell **outil nutrition → outil performance** (Prédicteur, Allure marathon, VMA). Mentionné en §8.1 mais sans CTA actionnable. Recommandation : 1 ligne "Tu n'as pas encore ton chrono visé ? Utilise notre Prédicteur de temps." dans la carte synthèse, avant le calcul. **Non bloquant P2**.

---

### §9 — Mode "Premier"

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : positif (réduit le bounce rate débutant)

Excellente section. L'auto-activation Débutant + toggle manuel pour Régulier/Confirmé (cas premier ultra) est intelligente. Les plafonds chiffrés (§9.2) sont conservateurs sans être ridicules. Le message anti-rigidité respecte parfaitement `feedback_securite_avant_conversion` + `feedback_jamais_poids_minceur` (aucune mention poids/IMC).

"Mieux vaut 50 g/h bien digérés que 80 g/h vomis" = formule mémorable, ton coach authentique, alignée doctrine.

Question PM : doit-on **désactiver le boost caféine final** en mode Premier ? Cf. §6 conditionnel ci-dessus.

---

### §10 — UX jour J — MVP V4

**Verdict PM** : ⚠️ CONDITIONNEL
**Risque doctrine** : 0
**Impact conversion** : neutre à positif selon scope MVP
**Si CONDITIONNEL** :

1. **MVP réaliste ou over-engineering** : le triplet (mobile-first + PDF A5 + URL partageable) est correct mais le **PDF A5 timeline visuelle compacte** demande une lib (jsPDF ou react-pdf) + design QA + tests print. Estimer : ~5-8 j dev. Si on veut un MVP réel en 4-6 semaines total : **dégrader le PDF en "résumé texte imprimable via window.print() + CSS print"** pour V1, garder le PDF richer pour V1.5. Sinon le PDF devient le bottleneck. **Bloquant P1 scope MVP**.

2. **URL partageable avec query string** : excellent, peu coûteux, gros impact (favoris navigateur, partage WhatsApp coach). Validé tel quel.

3. **Mobile-first wizard step-by-step** : 3-4 écrans avec progress bar = correct. Mais préciser : **les 10+ inputs ne tiennent pas en 3 écrans** si on met tous les conditionnels (mode Premier, acclimatation, cycle, ravitos officiels). Définir clairement : écran 1 = basics (sexe/poids/niveau/chrono), écran 2 = conditions jour J (T°/hygro/sudation), écran 3 = nutrition (expérience/caféine/premier), écran 4 = trail-only (D+/D-/altitude/acclimaté). **Bloquant P1 wireframe.**

4. **V2 (PWA, offline, mode course en cours)** : bien priorisée selon traffic. Pas dans MVP. Validé.

5. **Cohérence doctrine §10.3** : "Aucune notif push" + "pas d'app native" + "pas de tracking PII" = respect parfait `feedback_jamais_contact_client`. Validé.

---

### §11 — Bibliographie complète (57 réf DOI)

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : très positif (autorité perçue)

57 références DOI = **différenciation maximale vs concurrence francophone**. Recommandation d'implem : afficher la biblio en accordéon replié sur chaque page (sinon 57 lignes scrollent la page) + lier les 3-5 réfs les plus critiques (Jeukendrup 2014, Costa 2017, Baker 2017, Hew-Butler 2015) en inline dans le texte (footnote-style).

Non bloquant pour brief — c'est implem.

---

### §12 — Points à valider PM + dev (Phase 3)

**Verdict PM** : ✅ VALIDÉ
**Risque doctrine** : 0
**Impact conversion** : 0

La checklist §12.1 (11 items PM) couvre tout. §12.2 (12 items dev) idem. §12.3 (mémoires à mettre à jour) liste correctement les 2 mémoires impactées.

**Manque** dans §12.3 : ajouter un 3e point → "Créer un mémoire dédié `feedback_outil_nutrition_chiffres_ok_hors_plan`" pour acter formellement que **les chiffres de nutrition (g/h, mg/L, mg caféine) sont autorisés dans l'outil séparé**, en contradiction apparente avec `feedback_pas_de_nutrition_dans_plan`. Sans ce mémoire dédié, un futur reviewer (ou moi-même dans 6 mois) verra le contenu du calculateur et le challengera comme contradictoire avec la doctrine. **Bloquant P1 mémoire**.

---

## Modifications PM avant pass dev

### P1 — Bloquantes (doivent être réglées avant ouverture ticket dev)

1. **§3.1 + §6.7** : Input "cycle menstruel" affiché conditionnellement si Sexe=F uniquement. Message §6.7 idem.
2. **§3.1 + §9.1** : Mode "Premier" pré-coché Oui et non décochable quand Niveau=Débutant (UI lock).
3. **§6.5** : Disclaimer médical élargi en accordéon replié par défaut (pas mur clinique au premier load).
4. **§8.2.1** : Déplacer CTA principal "Créer mon plan" du haut de l'outil vers post-synthèse uniquement (le haut affiche un bandeau discret max). Conversion > friction-utile à cet endroit.
5. **§10.1.2** : Dégrader PDF A5 → résumé imprimable via `window.print()` + CSS print pour MVP. PDF richer en V1.5.
6. **§10.1.1** : Définir clairement les 4 écrans du wizard mobile (mapping inputs → écrans) en annexe du brief avant dev.
7. **§12.3** : Créer un 3e mémoire `feedback_outil_nutrition_chiffres_ok_hors_plan` pour acter l'exception doctrine.

### P2 — Non bloquantes (à intégrer mais pas blocant ticket dev)

8. **§0** : Reformuler ligne 1 du tableau (120 g/h réservé sub-2h45 confirmés).
9. **§3.5 Q3** : Reformuler question crampes (cause multifactorielle).
10. **§6.3** : Reformuler signes EAH ultra (retirer "prise de poids pendant la course", remplacer par gonflement doigts).
11. **§6.2** : Préciser que boost caféine final = désactivé en mode Premier.
12. **§5.1.3** : Pack nutrition = exemples génériques (g/L), pas naming concurrent.
13. **§7.3** + **§8** : Ajouter variante CTA Hyrox dans la FAQ semi.
14. **§8** : Ajouter cross-sell vers Prédicteur de temps si chrono manquant.

---

## Points doctrine à acter en mémoire AVANT lancement

### Mémoire 1 — Modifier `feedback_pas_de_nutrition_dans_plan`

**Ajout** :
> "Exception 1 : le plan peut MENTIONNER (sans chiffres, ≤40 mots) l'existence des outils nutrition séparés (welcome message + advice fin de plan) et inviter à les utiliser pour tester sur SL.
> Exception 2 : les outils nutrition dédiés (/outils/nutrition-trail, marathon, semi) sont des produits séparés du plan d'entraînement et peuvent contenir des recommandations chiffrées (g/h glucides, mg/L sodium, mg caféine). La règle 'pas de nutrition chiffrée' s'applique au PLAN d'entraînement uniquement, pas aux outils calculateurs."

### Mémoire 2 — Créer `feedback_outil_nutrition_chiffres_ok_hors_plan` (nouveau)

**Contenu** :
> "Les chiffres de nutrition (glucides g/h, hydratation mL/h, sodium mg/L, caféine mg/kg) sont autorisés et même obligatoires dans les outils nutrition séparés (`/outils/nutrition-*`). Ils restent INTERDITS dans le plan d'entraînement généré. Frontière nette : le plan = course/renfo uniquement ; les outils nutrition = simulateurs séparés avec disclaimer pré/post + warning gut training + mode Premier. Cette dualité doit être expliquée à l'user via welcome message du plan et CTA cross-promo dans les outils."

### Mémoire 3 — Mettre à jour `project_coach_running_ia_outil_nutrition`

**Ajout** :
> "Brief V4 FINAL validé PM 2026-05-17. Référence : ~/Coach-Running-IA/BRIEF-NUTRITION-V4-FINAL.md. Dev prévu suite. 3 pages : nutrition-trail, nutrition-marathon, nutrition-semi-marathon. Scope MVP : mobile-first + résumé imprimable + URL partageable. V2 selon traffic : PWA, offline, ultra >100km, 10km, outils pré/post."

### Mémoires NON impactées (vérification)

- `feedback_securite_avant_conversion` : respectée (warning pré/post, mode Premier, anti-rigidité, disclaimer médical, anti-TCA).
- `feedback_jamais_poids_minceur` : respectée (poids = input technique uniquement, jamais cité en message, "perte de poids" jamais mentionnée).
- `feedback_jamais_contact_client` : respectée (zéro notif push, zéro mail, CTA UI uniquement).
- `project_coach_running_ia_que_course` : respectée (zéro cross-training mentionné).
- `project_coach_running_ia_hyrox_scope` : respectée (mini-FAQ semi mentionne Hyrox = pas de nutrition <90 min, cohérent).
- `feedback_compromis_messages_preventifs` : respectée (validation soft §6.8, pas de blocage).
- `feedback_ecouter_instructions_explicites` : respectée (aucun garde-fou ajouté contre la doctrine).
- `feedback_perte_de_poids_titre_ok` : N/A (l'outil ne nomme aucun programme).
- `feedback_mode_marche_course_scope` : respectée (sub-5h30/sub-6h = débutants only via mode Premier, pas étendu confirmés).

---

## Cross-sell + conversion : recommandations

### Ce qui marche dans V4

1. **Carte §5.5 "Quand tester ta stratégie" + CTA générateur de plans** = best placement (moment de valeur atteint, user vient de voir ses chiffres). Garder tel quel.
2. **Welcome message du plan → outils nutrition** = symétrique, renforce le funnel bi-directionnel.
3. **57 réfs DOI + biblio = autorité perçue** = baisse le coût d'acquisition organique 6-12 mois.
4. **Mode Premier = baisse bounce débutant** = meilleur taux d'engagement donc meilleur SEO secondaire.

### Ce qui peut être renforcé (non bloquant V1, à itérer V1.5)

5. **Ajouter un email capture LIGHT optionnel** post-synthèse : "Reçois ta stratégie nutrition par email + 1 conseil/semaine sur la nutrition course (désabonnement 1 clic)". MAIS attention : ça touche `feedback_jamais_contact_client`. **Romane décide. À discuter avant V1.5.** Pas dans V1.
6. **A/B test mode "Premier" auto vs manuel** post-V1 : mesurer si l'auto-activation maximise rétention débutant ou si elle frustre certains.
7. **Tracking analytics prioritaires** (cf. §12.1.9) : chrono visé, distance trail, T° saisie, mode Premier activé/désactivé, export PDF cliqué, CTA "Créer mon plan" cliqué, URL partagée copiée. Plausible (RGPD-friendly) > GA.
8. **CTA "Créer mon plan" doit lander sur une page de génération PRÉ-REMPLIE** avec les inputs déjà fournis (sexe, poids, niveau, chrono) — sinon friction massive. À spécifier au dev.

### Risque conversion identifié

9. **Disclaimer médical 10+ pathologies en accordéon** : si replié, perte de transparence ressentie. Si déplié, mur clinique. Compromis = accordéon avec label clair "Cet outil ne s'applique pas si... (cliquer pour voir la liste)". Mesurer post-V1 si bounce rate au-dessus du benchmark = retravailler.

---

## Mode "Premier" : oui/non + comment

**Décision PM : OUI, intégré au MVP, sans déviation.**

### Justifications

1. **Sécurité doctrine** : les débutants représentent une part importante du traffic SEO (KW "premier marathon nutrition", "premier semi nutrition" = volumes notables). Sans garde-fou = risque réputationnel (un débutant qui vomit ses 90 g/h en course parce que notre outil le lui a dit = bad).
2. **Conversion** : message anti-rigidité réduit l'anxiété perçue, ce qui augmente la confiance dans la marque, ce qui augmente le taux de génération de plan derrière.
3. **Différenciation** : aucun concurrent francophone ne fait ça.

### Modalités validées

- **Auto-activé si Niveau = Débutant** (non décochable côté UI — cf. P1 #2).
- **Toggle manuel** visible pour Régulier/Confirmé/Expert (cas premier ultra pour route confirmé).
- **Effets** : plafonds glucides §9.2 + caféine 3 mg/kg max + boost final désactivé + warning EAH désactivé sauf pertinent + message anti-rigidité affiché.
- **Pas de plafond sur** : hydratation (déjà cappée à 1 L/h), sodium (déjà conservateur).
- **CTA "Créer mon plan" PRIORISÉ** en mode Premier (un débutant a 10x plus de valeur de générer un plan qu'un confirmé qui sait déjà s'entraîner).

### Non décision (à itérer post-V1)

- Pas de mode "Premier" automatique sur **chrono > sub-5h30** indépendamment du niveau (un confirmé qui vise sub-5h30 = retour de blessure peut-être, pas débutant). Reste manuel.

---

## UX MVP vs V2 : périmètre validé

### MVP V1 (4-6 semaines dev)

**Inclus** :
- Composant React `<NutritionCalculator config={config} />` + 3 pages (trail, marathon, semi).
- 10+ inputs (cf. §3) avec wizard mobile 4 écrans (mapping à spécifier — P1 #6).
- 10 cartes résultat (5 communes + 1-3 spécifiques par outil).
- Calculs §4.1 à §4.10 testés unitairement (jest).
- Warnings §6 (gut training top, mode Premier, EAH dosé, disclaimer accordéon, validation logique soft).
- SEO §7 : 3 pages × 2000 mots rédigées.
- Maillage §8.1 + §8.2.1 CTA post-synthèse + §8.3 welcome message plan + §8.4 doctrine mémoire.
- Mobile-first responsive + URL partageable + résumé imprimable via `window.print()` (PAS de PDF custom V1 — cf. P1 #5).
- localStorage pour ré-ouvrir.
- Mini-questionnaire scoré sudation (§3.5).
- Bibliographie en accordéon (§11).
- Tracking analytics Plausible (events listés ci-dessus).

**Exclus de V1** :
- PDF A5 custom (lib jsPDF/react-pdf) → V1.5.
- PWA installable + manifest.json → V2.
- Mode offline (service worker) → V2.
- Mode "course en cours" timeline scrollable → V2.
- Ultra-Trail >100km outil dédié → V2 selon traffic.
- 10km outil dédié → V2 selon traffic.
- Outils nutrition pré-course et post-course → V2 (cf. mémoire `project_coach_running_ia_outil_nutrition`).
- Email capture → décision Romane V1.5.
- i18n EN/ES → V2 SEO international.

### V1.5 (1-2 mois post-V1)

- PDF A5 custom design (jsPDF) avec timeline visuelle.
- Cross-sell renforcé selon analytics V1 (placements optimisés).
- Itération messages selon retour 3-5 tests utilisateurs débutants (§12.1.11).

### V2 (3-6 mois post-V1, selon traffic)

- PWA installable + offline.
- Ultra/10km séparés si analytics le justifient.
- Outils pré-course (carb-loading, dernier repas, hydratation J-1) et post-course (récup 30 min, reconstruction 24-48h).
- Mode "course en cours" timeline temps réel.

---

## Conclusion PM

Brief V4 FINAL = **validé à 92 % avec 7 modifs P1 + 7 modifs P2 + 3 mémoires à acter**. Aucune section ne challenge la doctrine de manière irrécupérable. Le délivrable est mûr.

**Action immédiate Romane** (avant pass dev) :
1. Valider les 7 modifs P1 ci-dessus (30 min).
2. Acter les 3 mémoires (P1 #7 + maj 2 mémoires existantes) (15 min).
3. Trancher la question "email capture V1.5 oui/non" (10 min).
4. Lancer le ticket dev avec annexe wireframe wizard mobile 4 écrans (P1 #6, 1h).

**ETA validation finale** : ~2h de PM. **GO dev derrière**.
