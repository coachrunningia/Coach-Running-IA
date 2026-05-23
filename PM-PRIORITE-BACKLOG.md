# PM 10 ans — Priorisation backlog
Date : 2026-05-21
Posture : PM produit B2C fitness/wellness. Décisions sur axes UX, conversion, support, image. Pas de doublon avec priorité dev.

---

## Tableau récap business

| Item | Impact UX (visible/% users) | Risque support | Risque conversion / réputation | Priorité PM | Patch live déjà fait sur user observé ? |
|---|---|---|---|---|---|
| **P0-1** save feasibility post recalc VMA | Visible direct. ~15-25 % users recalculent VMA en cours de plan. Sévérité **critique** (message incohérent = perte confiance IA) | Élevé : ticket "le coach se contredit" | Élevé : si user partage capture sur Reddit/Trustpilot = image "IA bugée" | 🔴 **P0** ship aujourd'hui | Oui (Julian) — rétro-patch fait, donc fix code = prévention futurs cas |
| **P0-2** doublon Strava activityId | Arrière-plan, mais stats visibles dans UI tracking. ~10 % users Strava-connectés affectés (estim.) | Moyen : user confus "j'ai fait 1 sortie, vous en comptez 2" | Moyen : touche un feature Strava = différenciant Premium | 🔴 **P0** ship aujourd'hui | Non rétro-patché (data live encore fausse pour Julian) → à corriger côté data ET code |
| **P0-3** D+ Trail %VMA branche secondaire | Visible direct. Touche **100 % des plans Trail** (~8-12 % de la base). Sévérité **critique** : message décourageant à tort = killer émotionnel | Élevé : "votre IA me dit que je suis pas capable, alors que mon coach humain dit l'inverse" | Très élevé : population Trail = niche engagée, bouche-à-oreille fort dans clubs | 🔴 **P0** ship aujourd'hui | Oui (Bertrand, Cyril Berger) rétro-patchés → fix code = prévention |
| **P1-1** smoothing ×1.15 étrangle Inter+ | Arrière-plan (user ne voit pas le calcul, mais voit le pic faible). ~20 % users Semi/Marathon Inter VMA<11 | Faible (user ne sait pas que c'est sous-dimensionné, sauf coach externe lui dit) | Moyen : plan sous-calibré = pas de progression = churn silencieux à la fin du plan | 🟠 **P1** cette semaine | Oui (Margaux) rétro-patchée |
| **P1-2** Expert phase fondamental + safety net | Visible direct (4 footings identiques = lassitude évidente). Peu d'users (~3-5 % Expert) mais **les plus exigeants/vocaux** | Élevé sur ce segment : Expert sait reconnaître un plan plat | Très élevé sur image : Expert qui désinstalle = avis négatif détaillé et crédible | 🟠 **P1** cette semaine — segment haute valeur | Oui (floggyz) rétro-patché |
| **P1-3** Hard floor pic Trail | Arrière-plan, pas de cas observé. Préventif doctrine | Faible aujourd'hui | Faible aujourd'hui | 🟡 **P2** ce mois — pas urgent rétroactif | N/A (aucun cas) |
| **P1-4** freq=2 Marathon | Préventif. <2 % users probablement (Marathon freq=2 rare). Mais si arrive = **danger physio réel** (blessure) | Faible volume mais **risque juridique/image fort** si user se blesse | Élevé image : "l'app m'a fait blesser" = pire pire-cas | 🟠 **P1** cette semaine — risque asymétrique justifie même sans cas | N/A (aucun cas observé) |
| **P1-6** message "très chargée en volume" inversé | Visible direct. ~5-10 % users freq≤3 + planWeeks>16 + vol faible. Sévérité **moyen** (message faux mais pas décourageant) | Moyen : user pense que son plan est "intense" alors qu'il est léger = attente faussée | Faible-moyen : crédibilité IA entamée mais pas killer | 🟠 **P1** quick win | Oui (Bertrand) rétro-patché |
| **P1-7** cap planWeeks par objectif | Visible direct (user voit "30 sem pour 10K Finisher" et abandonne au tunnel). ~5 % users objectif court + horizon lointain | Moyen : "pourquoi 30 sem pour un 10K ?" | Élevé sur conversion onboarding : un user qui voit un plan dispro abandonne avant Premium | 🟠 **P1** cette semaine — touche conversion direct | Oui (floggyz) rétro-patché |
| **P2-3** modal confirm chrono format | Préventif. Cas rare ("39h20" pour 10K) mais entrée fausse = tout le plan calibré sur fausse PB. ~1-2 % users mais impact 100 % sur le plan généré | Faible volume, élevé par cas | Moyen : un cas viral suffit | 🟡 **P2** ce mois | N/A (préventif) |

---

## Ordre de bataille recommandé (1→10) pour demain matin

Logique : visibilité user × volume affecté × risque image, en intercalant quick wins entre les gros morceaux pour garder du momentum.

1. **P0-1** save feasibility post recalc VMA — *5 min code + 15 min test. Quick win critique, déclenche confiance équipe pour la suite.*
2. **P0-3** D+ Trail branche secondaire — *Investigation 45 min. Le plus gros risque image (niche Trail = ambassadeurs). À faire avant que le bug touche un nouveau user.*
3. **P1-7** cap planWeeks — *15 min. Quick win conversion onboarding direct. Évite "abandon au tunnel" sur futurs users.*
4. **P1-6** message "très chargée" inversé — *10 min. Quick win crédibilité, même fichier `feasibilityService.ts` que P0-3 → synergie contexte.*
5. **P0-2** doublon Strava activityId — *30 min. P0 dev mais déprioritisé en ordre car arrière-plan + moins exposé que Trail. Reste P0 prioritaire en journée.*
6. **P1-4** warning freq=2 Marathon — *20 min. Risque asymétrique : faible volume mais si arrive = blessure + image. À shipper avant un cas réel.*
7. **P1-1** smoothing ×1.15 Inter+ — *1h. Touche un segment volumineux (Semi/Marathon Inter) mais churn silencieux donc moins urgent que les bugs visibles.*
8. **P1-3** hard floor pic Trail — *20 min. Synergie avec P0-3 (même contexte Trail) → à enchaîner si énergie.*
9. **P1-2** Expert phase fondamental — *1h refacto. Segment haute valeur mais petit volume. Justifie un bloc dédié, pas en fin de journée fatiguée.*
10. **P2-3** modal chrono format — *1h composant React. Préventif, peut attendre la semaine prochaine si la journée déborde.*

**Note** : si la journée déborde après item 6, **stopper et planifier P1-1 / P1-2 en bloc dédié demain** plutôt que les bâcler. Cf. doctrine `feedback_qualite_avant_vitesse`.

---

## Quick wins recommandés (effort faible × impact moyen+)

- **P0-1** : 20 min total, déverrouille la confiance UI sur tous les recalculs VMA futurs. Ratio impact/effort imbattable.
- **P1-6** message inversé : 10 min, fix de crédibilité instantané.
- **P1-7** cap planWeeks : 15 min, gain conversion direct (évite plans dispro à l'onboarding).
- **P1-3** hard floor Trail : 20 min, ferme un trou doctrine pendant qu'on est dans le contexte Trail (cf. P0-3).

**Bloc quick wins enchaînés** = items 1, 3, 4, 8 = ~1h cumulée, 4 sujets clos.

---

## Sprints lourds à planifier (effort élevé × impact élevé)

- **P0-3** D+ Trail branche secondaire : 45 min mais **investigation** = imprévisible. Bloquer 1h30 plein pour ne pas couper. Sujet image-critique.
- **P1-1** smoothing ×1.15 : 1h, demande tests Semi/Marathon Inter complets. À traiter en bloc avec validation cas Margaux + 2-3 autres profils similaires.
- **P1-2** Expert phase fondamental : 1h refacto prompt + code + tests. Segment Expert exigeant = pas le droit de bâcler. Bloc dédié.

**Reco** : ne pas mélanger sprints lourds et quick wins dans la même heure. Soit on est en mode chirurgical (P0-3, P1-1, P1-2), soit en mode abattage (quick wins enchaînés).

---

## Items écartés ou downgradés vs priorité technique

- **P0-2 doublon Strava** : maintenu P0 mais **descendu en ordre #5**. Honnêteté PM : arrière-plan, ~10 % users, beaucoup moins exposé image que P0-3. Le dev le classe P0 par propreté data — légitime, mais en termes de risque business immédiat, ça passe après les bugs visibles.
- **P1-3 hard floor Trail** : downgradé à 🟡 **P2** côté PM. Aucun cas observé, pure prévention doctrine. Justifie pas l'urgence semaine.
- **P2-3 modal chrono** : maintenu P2. Préventif rare, peut attendre.

**À l'inverse, upgradé** :
- **P1-7 cap planWeeks** confirmé 🟠 P1 fort car touche conversion onboarding (un user qui voit 30 sem pour 10K Finisher abandonne avant Premium — impact direct revenue).
- **P1-4 freq=2 Marathon** maintenu 🟠 P1 malgré 0 cas, à cause du risque asymétrique blessure/image.

---

## Synergie observée

- **Bloc Trail** : P0-3 + P1-3 partagent le contexte `feasibilityService.ts` et la doctrine Trail (`effectiveDistanceKm` ITRA). Enchaîner les deux = -20 min de re-contexte.
- **Bloc `feasibilityService.ts`** : P0-3, P1-6 (et P1-5 du backlog dev = blessure structurelle) sont tous dans ce fichier. Un PR groupé = moins de revue, tests partagés.
- **Bloc Expert / floggyz** : P1-2 + P1-7 concernent le même user observé (floggyz). Tester les deux fixes ensemble sur ce profil = validation croisée gratuite.
- **Couverture patch live** : 7 items sur 10 (P0-1, P0-3, P1-1, P1-2, P1-6, P1-7 + Lilian sur P1-5 backlog dev) ont déjà été rétro-patchés sur les users observés hier. **Conséquence PM** : le fix code est **prévention futurs cas**, pas urgence rétro. Cela autorise à séquencer proprement plutôt que paniquer.

---

## Honnêteté PM — points d'attention

1. **Estimations % users** ci-dessus sont des ordres de grandeur sans analytics derrière. À confirmer avec data une fois Mixpanel/PostHog en place. Pas un blocant pour prioriser aujourd'hui.
2. **Risque image Trail (P0-3)** sur-pondéré peut-être : niche petite mais qualitative. Si la base Trail est <5 % du total, ré-évaluer en P1.
3. **P1-2 Expert** : tentation de downgrader car petit segment, mais doctrine `feedback_qualite_avant_vitesse` + Expert = ambassadeurs vocaux justifient le maintien P1.
4. Pas de méta-question : si arbitrage à faire entre items 7-10 selon énergie restante, **toujours préférer P1-2 (Expert) à P1-1 (smoothing)** car l'Expert qui désinstalle laisse une trace publique, le smoothing churne silencieusement.
5. Doctrine `feedback_input_client_obligatoire` rappelée : aucun de ces fixes ne doit modifier les inputs user (allures, dates, PB) ; tous concernent le calcul aval. RAS sur ce point.

---

**Décision finale PM** : journée demain = items 1 à 6 obligatoires (~2h30 cumulé). Items 7-10 selon énergie, sinon report mardi/mercredi en blocs dédiés.
