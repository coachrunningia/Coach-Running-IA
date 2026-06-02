# F-17 — PM CHALLENGE FINAL (hostile/bienveillant)

PM 15 ans produit. 12 min. Verdict tranché, pas de méta-questions.

---

## 1. Verdict : GO CONDITIONNEL

Le service pur + script admin sont solides (17 tests, swap map global, gel allures course). MAIS la version end-user **NE DOIT PAS partir live** tant que les 3 conditions ci-dessous ne sont pas remplies. Pour Robine + Lucas TOI sur la prod ce soir : OK, c'est un patch admin manuel sous contrôle, pas du self-serve.

**3 conditions bloquantes self-serve :**

1. **Snapshot complet `weeks` avant patch** dans `plans/{id}/snapshots/{ts}` Firestore (TTL 30j). Pas juste un `_lastRecalibratedAt`. Sinon rollback = mensonge UX. Le service actuel n'a aucun mécanisme de snapshot, le script admin écrit un JSON local — pas accessible côté app.
2. **Compteur 4 max + warning ≥+25% non bypassable côté client** dans un guard SERVEUR (Firestore rules ou Cloud Function). Sinon n'importe quel devtools/curl bypasse les safeguards. Doctrine `feedback_securite_avant_conversion` impose la défense en profondeur, pas juste la modal UI.
3. **Test "delta = 0" + "session déjà commencée aujourd'hui"** explicitement gérés. Le service actuel ne sait pas distinguer S-en-cours / S-future, il patche tout. Pour mid-week S15 (cf. challenge #4) on doit décider : patch ou skip.

---

## 2. Challenges 1→12

### #1 — User pousse VMA +50% pour avoir un plan "plus dur"

**Position :** safeguard +25% checkbox NE SUFFIT PAS. C'est un consentement, pas un blocage. Un user motivé clique. Risque blessure réel + risque réputationnel (user lambda dit "l'app m'a fait courir à 3:30/km").

**Reco :** ≥+25% = warning rouge + **double opt-in** (checkbox "j'ai testé ma VMA il y a moins de 4 semaines" + texte typé "JE CONFIRME"). ≥+40% = blocage dur avec message "contacte Romane via support" (doctrine `feedback_jamais_contact_client` = c'est Romane qui répond). Tracker `_recalibrationsBlockedHigh` Firestore pour Romane revue hebdo.

### #2 — Lucas 40min/10K targetTime irréaliste : geler quand même ?

**Position :** OUI on gèle quand même. Doctrine `feedback_jamais_baisser_allure_cible` est immuable, ET doctrine `feedback_d17_feasibility_transparence_optin` couvre déjà l'irréalisme via safetyWarning. Mélanger les deux = casser la cohérence.

**Reco :** gel ferme. Si feasibility ≤ 30, on AUGMENTE la friction côté UX (le bloc rouge D17 reste visible après recalibrage) mais on ne touche pas l'allureSpecifique10k. Conséquence implicite et acceptée : pour Lucas, recalibrer entraînement vers VMA 13.4 mais garder 4:00/km objectif = on rend le plan PLUS cohérent (entraînement et objectif convergent), pas moins.

### #3 — User baisse VMA -20% (blessure) : compteur 4 s'applique-t-il ?

**Position :** Le compteur 4 existe pour empêcher le yoyo, pas pour punir le retour à la santé. Mais l'exempter ouvre une faille (user déclare baisse fictive pour reset).

**Reco :** compteur 4 s'applique **uniformément**. Cas blessure géré côté UX par message dédié ("Tes allures vont ralentir, normal après blessure / coupure ?") + une 5e exception POSSIBLE via Romane (doctrine `feedback_jamais_contact_client` — l'user envoie un mail à Romane, elle patch via admin script, le compteur reste à 4 mais le plan est ajusté). Pas d'algo auto qui exempte la baisse.

### #4 — Plan finissant S15/16, recalibrage mid-week S15

**Position :** Trou critique. Le service actuel patch toutes les `weeks` indistinctement. Si on est mardi soir S15 et que le user a déjà fait sa séance lundi à l'ancienne allure, on va casser la cohérence visuelle (lundi à 5:30, mercredi à 5:00 sans explication) ET trahir doctrine `feedback_patch_live_plans_jour_seulement`.

**Reco :** patcher uniquement les sessions dont `date >= today`. Sessions passées de la semaine en cours : intactes (avec leur ancienne allure assumée). Welcome enrichi précise : "Les séances déjà passées ne sont pas modifiées." Le service `recalibrateSession` reste pure et idempotent ; c'est l'orchestrateur (côté app ou script admin) qui filtre par date.

### #5 — Multi-allures mainSet : 5K spécifique gelée mais EF recalibrée → incohérence visuelle

**Position :** Cas tordu réel et insuffisamment couvert. Exemple : "Footing 20min à 5:30, puis 4×800 à 4:45 (allure 5K), récup 6:00". Si VMA +20% et freeze raceSpecific, 5:30→4:50, 6:00→5:15, MAIS 4:45 reste. Sortie : "20min à 4:50, puis 4×800 à 4:45, récup 5:15". Le bloc principal devient **plus lent ou égal** à l'échauffement = absurde.

**Reco :** au moment du recalibrage, si `freezeRaceSpecific=true` ET mainSet contient une pace `RACE_SPECIFIC` ET une pace `TRAINING` qui devient ≥ la pace race après patch, **flagger la session** comme "à régénérer manuellement" (champ `_needsManualReview:true`) ET dans le welcome enrichi lister ces N sessions ("3 séances à vérifier par Romane"). Pas de régénération Gemini auto (coût + perte du wording).

### #6 — Plan trail D16 (Cory Smith) : compatible ?

**Position :** **INCOMPATIBLE en l'état**. Le service swap les paces `targetPace`. Or pour les sessions trail D16, `targetPace` a été patché Cory Smith à la génération en fonction du D+/km — c'est plus une allure plate équivalente. Swap par mapping VMA % aveugle = perdre la modulation D+.

**Reco :** détecter `session.goal === 'TRAIL'` ET `session.elevationGain > seuil` (cf. F17-CHALLENGE-DEV #2). Pour ces sessions : recalibrer mainSet/warmup/cooldown via swap MAIS recalculer `targetPace` en réappliquant Cory Smith sur la nouvelle pace plate. Tâche bloquante avant ouverture self-serve aux profils trail. Pour Robine/Lucas ce soir : aucun trail, c'est OK.

### #7 — Régression : recalibre, rollback, re-recalibre → compteur ?

**Position :** Question UX critique. Si "Revenir aux allures précédentes" décrémente le compteur, on a un loophole : user fait 8 cycles en 1 jour. Si non, l'user qui se trompe une fois est puni.

**Reco :** rollback **ne décrémente pas** le compteur, mais log un `_recalibrationHistory: [{at, fromVMA, toVMA, action:'apply'|'rollback'}]`. La doctrine 4 max est "4 changements de direction VMA dans la vie du plan", pas "4 writes". Affichage user : "Tu as utilisé 2 recalibrages sur 4 (1 annulé)". Transparence > naïveté.

### #8 — Plan déjà patché admin (Julien IRRÉALISTE) : peut recalibrer ?

**Position :** Risque réel de défaire le safeguard admin. Si Julien a vu son plan adouci par Romane via script, et qu'il recalibre à +20% VMA, il refait sauter l'ajustement humain.

**Reco :** ajouter flag `plan._adminPatched: true` (à setter dans tout script admin futur dont `admin-recalibrate-paces.mjs`). Si ce flag est `true` : recalibrage user **bloqué** avec message "Ton plan a été ajusté manuellement par notre coach. Pour le modifier à nouveau, contacte Romane." Doctrine `feedback_jamais_contact_client` respectée (Romane gère).

### #9 — Free user : preview cumulatif ou pricing wall direct ?

**Position :** Spec actuelle = "pricing modal léger, pas disabled". Mais "voir preview" ≠ "voir la modal pricing". Ambiguïté.

**Reco :** Free user clique "Recalibrer" → modal pricing IMMÉDIATE (pas de preview avant/après — sinon on offre la value gratuitement et on rate la conversion). Le **vrai preview avant/après 3 allures** n'apparaît qu'après upgrade Premium, dans la modal de confirmation. La phrase Premium reste : "Tes allures sont recalculées, voici les changements" + tableau 3 lignes.

### #10 — Mobile Capacitor : modal 3 allures sur 320pt min

**Position :** 320pt est le minimum iPhone SE 1st gen, et l'app Capacitor doit supporter ça. Trois lignes preview + boutons + warning + checkbox = très chargé.

**Reco :** modal preview en **2 écrans** scrollables sur < 375pt :
- Écran 1 : delta VMA + warning (si applicable) + checkbox + CTA "Suivant"
- Écran 2 : tableau 3 allures (EF / Seuil / VMA) avec rows compactes + CTA "Confirmer" + lien "Annuler"

Sur ≥ 375pt : tout sur 1 écran modal. Texte allures en monospaced pour alignement. Tap targets 44pt obligatoires (déjà spec'd dans F17-PM.md §4, OK).

### #11 — User mail Romane pour 5e recalibrage : risque dérive

**Position :** Doctrine `feedback_jamais_contact_client` impose que Romane gère. Mais si 200 users écrivent "je veux +1 recalibrage", Romane sature. Le compteur 4 n'a de sens que si l'override manuel reste rare.

**Reco :** message anti-saturation côté UI lorsque compteur atteint 4 : "Tu as atteint la limite de 4 recalibrages sur ce plan. Cette limite préserve la stabilité de ton entraînement. Tu pourras recalibrer librement sur ton prochain plan." Pas de "contacte Romane" affiché directement (sinon mail à chaque cas). Romane gère uniquement les cas où l'user trouve son chemin via support général.

### #12 — Logging VMA précédente : 2 rollbacks impossibles

**Position :** Vrai trou. Le service log `_lastRecalibratedAt` mais pas l'historique VMA. Si user fait : VMA 10 → 12 → 14 → veut revenir à 10, on ne sait pas où est 10.

**Reco :** ajouter `_vmaHistory: Array<{at, fromVMA, toVMA, fromPaces, toPaces}>` (cf. F17-CHALLENGE-DEV §4 idempotence). Bouton "Revenir aux allures précédentes" pop la DERNIÈRE entrée (1 step back). Pour multi-step : "Voir l'historique" → liste 4 max → user choisit le snapshot. Aligné avec compteur 4. Storage cost négligeable (4 × ~200 octets).

---

## 3. Cinq risques majeurs HORS specs

1. **Race condition write Firestore** : user clique Recalibrer 2× rapide → 2 writes concurrents → compteur incrémenté 2×, paces patchées 2×. Pas géré (pas de transaction, pas de debounce). Risque réel sur mobile lent.
2. **Plan multi-device** : user a 2 appareils ouverts (web + mobile), recalibre sur web, mobile ne voit pas le changement avant refresh → utilise les anciennes paces pour sa séance. Faut un realtime listener ou au minimum un `staleData` warning.
3. **Recalibrage pendant une séance Apple Watch / activité en cours** : si l'user enregistre une séance liée au plan et que les paces changent mid-activité, l'historique post-séance peut afficher des écarts faux (séance faite à 5:30 sur cible désormais 5:00 → "tu as ralenti"). Faut bloquer recalibrage si `_activeSessionInProgress`.
4. **Doctrine `feedback_pas_de_micro_expert`** : spec actuelle ajoute beaucoup de couches (4 max, ±1 sec, freeze race, warning 15/25%, opt-in, rollback 7j, snapshot 30j, multi-screen mobile). Risque overengineering pour ~5% des users qui vont vraiment utiliser ça. **PM call : on shippe la V1 sans le freeze race custom (par défaut all on) puis on ajoute si feedback**, sauf si Romane veut tout d'un coup pour Robine/Lucas.
5. **Régression du `welcomeMessage` original** : script admin AJOUTE en tête mais ne régénère pas le corps. Si le corps mentionnait l'ancienne VMA ("Ton plan basé sur VMA 8.3"), c'est maintenant contradictoire. Pas géré dans le service.

---

## 4. Cinq fail modes à tester en battery

1. **VMA inchangée (delta=0)** : `recalibrateSession(s, paces, paces)` → no-op strict, pas de write, pas d'incrément compteur. Test critique pour idempotence (cf. F17-CHALLENGE-DEV).
2. **Plan avec `_raceDay:true`** : la session jour-J ne doit JAMAIS être recalibrée (doctrine D19, `targetPace` lié à `targetTime`). Test : plan Lucas hypothétique avec raceDay → assert `targetPace` raceDay inchangé après recalibrage.
3. **mainSet contenant durée style "1:30 récup"** : faux-positif possible si swap.has("1:30"). Test : mainSet `"6×3:00 à 4:30, récup 1:30"` après swap 4:30→4:00 → "6×3:00 à 4:00, récup 1:30" (durées intactes). Le filtre `swap.has(...)` doit suffire MAIS à confirmer sur 10 plans réels.
4. **Plan trail D16 avec `targetPace` Cory Smith** : recalibrage doit soit skipper, soit recalculer Cory Smith sur nouvelle base. Test : plan trail avec 2 sessions D+ patchées → assert pas de régression sur ratio D+/km.
5. **Session déjà commencée aujourd'hui** : recalibrer mardi soir une séance lundi déjà loggée → assert session lundi intacte, sessions mercredi+ patchées. Cas réel pour Robine/Lucas qui sont en cours de S1.

---

## 5. Wording manquant détecté

**Message limite 4 max atteinte** — absent de F17-PM.md §1 (qui couvre A→E mais pas le cas "compteur épuisé"). Le service le track côté back, mais aucune copie UX. À ajouter :

```
Limite atteinte (4/4)

Tu as recalibré tes allures 4 fois sur ce plan.
Cette limite préserve la stabilité de ton
entraînement et évite les variations brutales.

Ta VMA reste enregistrée et sera prise en compte
sur ton prochain plan.

  [ J'ai compris ]
```

Pas de mention "contacte Romane" ici (cf. challenge #11 — anti-saturation support).

---

**TL;DR PM** : service pur + script admin = solides pour ce soir Robine/Lucas. Self-serve user = GO CONDITIONNEL avec les 3 conditions §1 + correctifs #4, #5, #6, #8, #12. Ne PAS ouvrir aux profils trail tant que #6 pas géré. Romane décide si V1 ship avec freeze race ON par défaut ou si on customize plus tard (mon call : ship ON, pas de toggle V1).
