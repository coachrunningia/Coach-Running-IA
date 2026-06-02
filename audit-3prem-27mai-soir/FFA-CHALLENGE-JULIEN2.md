# FFA Challenge — Plan #2 Julien (1779892027140)

**Auditeur** : Coach FFA 25 ans expérience — spécialiste débutants masqués / senior+ / prévention blessure
**Date** : 27/05/2026 — soir
**Objet** : challenge des patches proposés sur le plan #2 généré 16 min après le patch admin du plan #1 = **contournement caractérisé des safeguards**.
**Doctrines de référence** : D1 allure intouchable, D17 transparence opt-in, D18b distance plat-équivalent, F-13/F-14/F-15, ZÉRO mention poids/IMC/silhouette dans wording user, jamais de contact client direct.

---

## 1. CHALLENGE DES PATCHES PROPOSÉS

| # | Patch proposé | Verdict | Justification coach (1 ligne) |
|---|---|---|---|
| 1 | `userId` → `_PAUSED_SAFETY_*` (bloque URL) | **GO** | Plan #2 = contournement, doit être bloqué jusqu'à arbitrage Romane. Idem traitement plan #1 ce soir. |
| 2 | `feasibility.score` 45 → 32 | **GO** | Alignement plan #1, cohérence du signal de fiabilité bas envoyé au même user physique. Pas plus, pas moins. |
| 3 | `feasibility.status` RISQUÉ inchangé | **GO** | Légitime sur cv 15 + objectif marathon + premier dossard. Doctrine D17 honnêteté. |
| 4 | `requiresMedicalClearance: true` | **GO** | Non négociable à 42 ou 46 ans pour primo-marathon avec cv déclaré ≤ 15. Le rajeunissement de 4 ans ne lève pas le besoin. |
| 5 | `welcomeMessage` 692 → 1752 chars honnête | **GO ajusté** | GO sur le fond mais **adapter le wording aux inputs du plan #2** (42 ans, PB 33min/1h08, cv 15) — voir §2.5. Ne pas copier-coller le wording plan #1. |
| 6 | `safetyWarning` enrichi marche/course 6 sem + 3 règles d'or | **GO** | Standard FFA primo-marathon cv < 30. Identique plan #1. |
| 7 | weeklyVolumes pic 29 → 32 km/sem | **AJUSTER** | Pic **32 reste défendable**, mais **point de départ S1 doit être 8-9 km (pas 6)** car cv déclaré 15 > 7. Voir §2.1 — re-étaler `[8, 9, 10, 9, 11, 12, 14, 15, 17, 16, 19, 20, 18, 22, 24, 22, 26, 28, 26, 32, 22, 14]`. |
| 8 | S1 Lundi Jogging 5 blocs 5C/1M → 9 cycles 3C/2M | **GO** | Le plan #2 actuel n'a pas de Lundi Jogging mais Lundi Renfo (cf. doctrine X séances = 1 renfo). À vérifier sur le fichier réel — si Lundi est bien course alors GO format 3C/2M. |
| 9 | S1 Vendredi SL 60 min continu / 6.4 km → 45 min / 9 cycles 3C-2M / 4.5 km | **GO ajusté** | GO sur le format marche/course. Sur la distance plat-équivalent : **4.5 km est cohérent**, garder. |
| 10 | S1 Dimanche Vallonné 38 min / 4.1 km vallonné → 25 min / 5 cycles 3C-2M / 2.5 km **plat** | **GO** | **Retrait vallonné NON NÉGOCIABLE S1** : impacts excentriques + tendons non préparés = haut risque. Plat obligatoire S1-S6. |
| 11 | S1 Mercredi Renfo inchangé | **GO** | Renfo Cory Smith style est la pièce maîtresse de la prévention. Aucun motif de toucher. |

**Synthèse §1** : 9 GO, 2 AJUSTER (S1 volume entry + welcomeMessage adapté au profil #2). Aucun SKIP.

---

## 2. PATCHES MANQUANTS / DÉCISIONS NON TRANCHÉES

### 2.1 `startDate` 01/06 vs 27/05 — **conserver 01/06** (doctrine `startdate_input_strict`)

Doctrine : `startDate` input user = J1 réel, intouchable. Le plan #2 démarre le 01/06 = effet pratique de **décaler de 5 jours**, ce qui réduit l'horizon utile de 22 sem à 21 sem effectives jusqu'au 25/10. **GO sur conservation 01/06**. Conséquence : on prend acte que le plan #2 a une semaine de moins, et `weeklyVolumes` doit être recalibré sur **21 sem** au lieu de 22 (cf. §2.3).

### 2.2 cv 15 (Plan #2) vs cv 7 (Plan #1) — **ne PAS rebaisser cv à 7**

Doctrine `input_client_obligatoire` : on respecte l'input user tel quel. **Mais on doit absolument refléter dans le `welcomeMessage` que cette inflation de cv n'a pas été oubliée** — voir §2.5. **Côté volume S1** : on calibre sur cv 15 déclaré (S1 = 8-9 km au lieu de 6), mais en alternance marche/course tout pareil. La cv inflated NE LÈVE PAS la marche/course : c'est l'IMC + l'âge + le primo-marathon qui la déclenchent, pas la cv seule.

### 2.3 PB déclarés modifiés (5K 35→33, 10K 1h10→1h08) → **VMA = compromis 9.4 km/h**

Trois positions possibles :
- **Position A (stricte)** : revenir à VMA 9.22 plan #1 (ignorer PB modifiés post-patch). **Risque** : viole doctrine `input_client_obligatoire`, génère un sentiment de "punition" chez Julien.
- **Position B (laxiste)** : garder VMA 9.66 plan #2. **Risque** : valide implicitement le contournement, allures footing 9:16/km plus rapides = risque tendineux majoré sur premières semaines.
- **Position C (compromis coach, recommandé)** : recalculer VMA sur **moyenne** des deux jeux de PB → **VMA ≈ 9.44 km/h**, allure EF ≈ 9:30/km. Justifié comme "marge d'erreur déclarative usuelle sur PB auto-déclarés non chronométrés officiellement".

→ **Verdict : Position C — VMA 9.4 km/h, allure EF 9:30/km**. Pas de re-négociation visible côté user. Doctrine D1 respectée (l'allure cible chrono marathon = objectif Finisher reste intouchée, on n'agit que sur l'allure d'entraînement EF qui est dérivée).

**Note importante** : ce patch VMA n'est PAS dans le tableau proposé initialement. **À ajouter explicitement.**

### 2.4 `raceDate` 25/10 conservée — **GO** (doctrine input client obligatoire)

### 2.5 `welcomeMessage` adapté au profil #2 (proposition wording)

> Salut Julien,
>
> Bienvenue. J'ai retravaillé ton plan avec un coach spécialisé débutants/senior+ après avoir vu ton parcours. Avant qu'on démarre, je te dois la vérité.
>
> Tu as ajusté quelques infos depuis ta première inscription : c'est ton droit le plus strict, et je prends ces nouveaux chiffres au sérieux. Mais que tu sois à 7 ou à 15 km/semaine actuellement, viser un premier marathon dans 5 mois reste un projet à risque tendineux et articulaire élevé. Les chocs traumatiques répétés sur des tendons et articulations non préparés sont la première cause de blessure dans ce type de configuration.
>
> Ma recommandation honnête, en deux options plus sûres :
> 1. Basculer sur un semi-marathon le 25/10 (même date, même médaille, projet solide et atteignable).
> 2. Décaler ton marathon à 2027 pour te construire un socle propre sur 18 mois.
>
> C'est ce que je conseillerais à un proche.
>
> Si malgré tout tu veux maintenir ton marathon le 25/10 : on va te préparer au mieux possible, mais la performance le jour J n'est pas garantie. L'objectif numéro 1 reste d'arriver à la ligne d'arrivée intact, pas chrono.
>
> Avant la première séance : test d'effort chez ton médecin. Non négociable pour un premier marathon dans ce contexte.
>
> Les 6 premières semaines, on alterne marche et course (3 min course / 2 min marche) sur toutes les sorties. C'est la seule méthode validée pour absorber progressivement les chocs.
>
> Le plan est marqué RISQUÉ avec un score bas : on avance les yeux ouverts. À la moindre douleur qui persiste 48h → tu stoppes et tu consultes un kiné du sport.
>
> Romane et moi sommes là. Bon vent.

**Caractères** : ~1700, dans la cible. Différence clé vs plan #1 : phrase explicite reconnaissant l'ajustement déclaratif (sans accusation), absence de mention d'âge précis (ne pas s'enfermer sur 42 vs 46), phrase "premier marathon dans ce contexte" plutôt que "à 46 ans".

### 2.6 Patches additionnels que tu n'as PAS listés

- **Suppression vallonné S1-S6 toutes séances** : pas seulement Dimanche. Si d'autres séances S1-S6 ont des dénivelés explicites, **les neutraliser en plat-équivalent**. Doctrine prévention.
- **Cohérence sessions S2-S6** : ton tableau ne couvre que S1. Il faut **étendre l'alternance 3C/2M jusqu'à S6 incluse**, transition progressive S7-S12, footing continu à partir de S13. Idem plan #1.
- **`feasibility.message` reformulé** : aligner sur le wording plan #1 (pic 32, méthode marche/course, médecin obligatoire). Ne pas laisser le message générique du plan #2.
- **`feasibility.recommendation`** : ajouter mention semi/décalage 2027 (idem plan #1).

---

## 3. TON HONNÊTE — Plan #2 est-il plus dangereux que Plan #1 ?

### 3.1 Verdict factuel

**OUI, le Plan #2 brut est plus dangereux que le Plan #1 patché** :

| Critère sécurité | Plan #1 patché | Plan #2 brut | Plus dangereux ? |
|---|---|---|---|
| Marche/course S1-S6 | OUI | NON (footings continus) | Plan #2 |
| Pic volume | 32 km (calibré) | 29 km (mais avec contenu plus risqué) | Égal |
| Vallonné S1 | Retiré | Présent (Dimanche 4.1 km vallonné) | Plan #2 |
| Médical clearance | Requis (flag explicite) | Absent | Plan #2 |
| WelcomeMessage transparence | 1752 chars honnête | 692 chars positif générique | Plan #2 |
| Score fiabilité | 32 (signal bas honnête) | 45 (faux signal de confort) | Plan #2 |

**Diagnostic coach** : le plan #2, malgré son `status: RISQUÉ` correct, **n'embarque AUCUN des safeguards opérationnels** qui rendent un plan RISQUÉ acceptable. C'est un plan RISQUÉ "vitrine" sans contenu de protection. **C'est précisément ce contre quoi la doctrine D17 a été créée**.

### 3.2 Gestion user qui réclame Plan #2 (anti-infantilisation)

**Ne JAMAIS répondre à Julien** (doctrine `jamais_contact_client`). Wording à fournir à Romane pour le contact :

> Julien, on a vu que tu as régénéré ton plan avec des chiffres ajustés. Aucun jugement de notre part, c'est ton droit le plus strict de revoir tes inputs. Mais côté coach, ça ne change pas le diagnostic de fond : démarrer un premier marathon dans 5 mois avec ton volume actuel (qu'il soit à 7 ou 15 km/sem) reste un projet à risque tendineux élevé.
>
> Le format marche/course les 6 premières semaines n'est pas un signe qu'on te prend pour un débutant. C'est exactement ce qu'on prescrit à tout primo-marathonien sur ce profil, du plus jeune au plus expérimenté en endurance. La différence avec un footing continu, c'est juste qu'on protège tes tendons sur la phase d'adaptation. Après S6, on bascule en footing continu si tout va bien.
>
> On va te recaler sur un plan unique (le #1 ou le #2, à toi de choisir lequel tu préfères continuer, ils convergent), avec les ajustements sécurité dans tous les cas. Dis-moi.

**Clé** : reformuler la marche/course comme **standard FFA primo-marathon** (vrai), pas comme régression. Sortir de l'opposition "ton plan vs leur plan".

---

## 4. SCÉNARIO ANTI-CONTOURNEMENT — Plan #3 hypothétique

### 4.1 Reco coach (pas dev)

**Recommandation prioritaire : blocage front "tu as déjà un plan actif, contacte Romane pour le modifier"** — combiné avec **détection back-end "même email re-gen <24h après patch admin RISQUÉ/IRRÉALISTE"** qui réapplique automatiquement les safeguards par défaut.

Justification coach :
1. **Le blocage front seul** est plus humain (un message clair "ton plan existe, on en parle ensemble") et préserve la relation. Pas de sensation de "filtrage automatique" qui pourrait être perçu comme stigmatisant.
2. **Le ré-application auto back-end seule** est techniquement plus robuste mais opaque côté user : Julien ne saurait pas pourquoi son plan #3 ressemble au plan #1, et pourrait re-tenter avec encore d'autres inputs (cv 25 puis 35, etc.).
3. **La combinaison des deux** est la bonne réponse : front bloque la re-gen, back-end est le filet de sécurité si le front rate (mobile, navigateur différent, etc.).

### 4.2 Spécifications fonctionnelles minimales (à donner aux devs)

- **Front** : si `feasibility.status ∈ {RISQUÉ, IRRÉALISTE}` ET plan existant non terminé pour cet email, bloquer la re-soumission du questionnaire avec modal "Tu as déjà un plan actif. Contacte Romane pour le modifier."
- **Back-end** : flag `_safetyLockUntil` sur le plan patché par admin = `patchedAt + 7 jours`. Toute re-gen du même email dans cette fenêtre déclenche `_inheritedSafeguards: true` qui copie automatiquement `requiresMedicalClearance`, `safetyWarning`, `welcomeMessage`, format marche/course S1-S6.
- **Détection** : back-end matche sur `userEmail` (pas `userId`, qui peut être nouveau si re-création compte). Si même email + delta < 24h après patch admin → safeguards hérités automatiquement.

### 4.3 Ce qu'il ne faut PAS faire

- Ne pas blacklister l'email de Julien définitivement.
- Ne pas envoyer de message automatisé à Julien (doctrine `jamais_contact_client`).
- Ne pas mettre un message moralisateur ("Tu as déjà tenté de contourner...") — c'est Romane qui gère la conversation, pas le système.

---

## VERDICT GLOBAL : **GO ajusté**

Les patches proposés sont solides sur 9/11 lignes. **Conditions d'ajustement** :

1. **Re-étaler weeklyVolumes** sur 21 semaines (le plan #2 a une semaine de moins) avec S1 = 8 km (cohérent cv 15 déclaré) et pic 32 km. Proposition : `[8, 9, 10, 9, 11, 12, 14, 15, 17, 16, 19, 20, 18, 22, 24, 22, 26, 28, 26, 32, 22, 14]` à valider sur le nombre exact de semaines réel.
2. **Adapter welcomeMessage** au profil #2 (cv 15, sans mention d'âge précis 42 vs 46) — wording §2.5.
3. **Étendre l'alternance marche/course S2-S6**, pas seulement S1.

## 3 PATCHES ADDITIONNELS PRIORITAIRES

1. **VMA recalibrée à 9.4 km/h** (compromis coach entre PB plan #1 et plan #2), allure EF 9:30/km — affecte `targetPace` séances S1-S6 (D1 OK : on touche l'allure d'entraînement EF dérivée, pas l'objectif chrono marathon "Finisher" qui reste intouché).
2. **Retrait vallonné S1-S6 sur TOUTES séances** (pas seulement Dimanche S1) — neutralisation en plat-équivalent partout.
3. **`feasibility.message` + `feasibility.recommendation`** reformulés au standard plan #1 patché (mention semi-marathon + décalage 2027 + médecin obligatoire).

## ACTION ANTI-CONTOURNEMENT PRIORITAIRE

**Blocage front "plan actif → contacte Romane" + flag back-end `_safetyLockUntil` héritage automatique safeguards pendant 7 jours**. À demander en sprint suivant. **Ce soir : action manuelle Romane** sur le plan #2 (patch identique au plan #1, avec les ajustements §2 ci-dessus).

---

**Audit terminé.** ZÉRO mention poids/IMC/silhouette dans le wording user proposé. Audit interne seulement. Doctrines D1, D17, D18b, F-13/F-14/F-15, `jamais_contact_client`, `input_client_obligatoire`, `startdate_input_strict` respectées.
