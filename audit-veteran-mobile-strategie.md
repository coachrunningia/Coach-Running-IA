# Audit vétéran — stratégie mobile Coach Running IA

> Auteur : vieux briscard mobile, 35 ans de prod (HyperCard → Capacitor 8.3, en passant par J2ME, BB, Cordova 2009, RN 2015, Flutter, Xamarin).
> Méthode : lecture audit 28/05 + audit divergences + `capacitor.config.ts` + `package.json` + grep ciblé.
> Ton : franc, factuel. Pas de consultant-speak.

---

## 1. Verdict stack — continuer Capacitor (avec lucidité)

**Décision : on ne pivote pas. On reste Capacitor 8.3 + WebView wrap. Mais on arrête de se mentir sur ce que c'est.**

### Comparatif honnête (heures-homme, pas marketing)

| Option | Effort pivot | Gain UX réel | Risques | Verdict |
|---|---|---|---|---|
| **Capacitor 8.3 (statu quo)** | 0 (déjà là) | WebView 50-60fps moderne, suffisant pour cards/listes | Bridge JS limité, jank scroll long, pas de gestures iOS natives | **GO** |
| **React Native + Expo** | 250-400h (réécrire App.tsx 2700 lignes + Layout + Pricing + Plan + Questionnaire + Modal + Toast + 8 outils calculateurs + blog) | Vrai 60-120fps, gestures natives, scroll fluide | Bridges Stripe/Firebase OK, mais Gemini SSE streaming = douloureux. Expo SDK 52+ = lock-in. Dette Reanimated/Skia. | **NO** — coûte 2 mois homme pour une amélio UX 20-30 % |
| **Flutter** | 600-900h (réécrire 100 % en Dart) | 60-120fps natif Skia | Tout Firebase à recoder, Stripe Checkout web view-only, écosystème Gemini Dart = jeune. Romane ne lit pas Dart. | **NO** — suicide single-founder |
| **PWA pure (pas de wrap)** | 30-50h (manifest + SW + Add to Home Screen) | iOS 16.4+ supporte notifs push PWA, Android = bon | Pas de store = 90 % du revenu perdu (les coureurs cherchent dans l'App Store). Pas de IAP possible. | **NO** comme stratégie principale, **mais OUI en complément** : garde une PWA installable pour les Android budget (cf. §5) |
| **WebView wrapper custom Swift/Kotlin** | 80-120h (WKWebView + WebViewClient + bridges manuels) | Identique Capacitor | Tu réinventes Capacitor en moins testé. Bénéfice : zéro abstraction, dette propre. | **NO** — Capacitor est déjà ça, en mieux maintenu |

### Pourquoi Capacitor reste le bon choix pour CE projet précis

1. **Le produit est un générateur de plans + consultation** : 90 % lecture (cards, graphes), 10 % saisie (questionnaire). C'est PILE le cas d'usage où WebView ne gêne pas. Tu ne fais pas Strava (carto temps réel, GPS sec) ni TikTok (scroll infini 60fps obligatoire).
2. **Single founder + Claude qui code** : RN ou Flutter = 2 mois pour rattraper. Romane perd la fenêtre saison "été marathon préparation".
3. **L'écosystème est aligné** : Stripe (web), Firebase JS SDK (web), Gemini (web), recharts (web). Pivoter = tout réécrire avec des SDK natifs moins matures.
4. **Capacitor 8 + iOS 17 WKWebView = 2026 standard**. Le WebView iOS d'aujourd'hui n'a plus rien à voir avec UIWebView 2014. Le jank est anecdotique sur iPhone 12+.

### Ce que Capacitor NE règlera JAMAIS (assume-le)

- **Gestures iOS natives** (swipe-back fluide, swipe-to-dismiss modal) : impossible reproduire 100 %. Tolérable.
- **120 Hz ProMotion** : la WebView est cappée 60 Hz sur ProMotion sauf flags expérimentaux. Acceptable.
- **App Store ranking "Native quality"** : Apple détecte WebView wrap (cf. piège #6 audit 28/05). Tu seras toujours en mode "fragile" review.

**Coût net décision** : 0 h migration, 100 % focus sur les patches Apple 3.1.1 et la doctrine 100 % similitude.

---

## 2. Stratégie 100 % similitude mobile/web — patterns + outils

### Verdict de fond
Romane veut "mêmes features, même UI, sauf adaptations natives justifiées". **Avec Capacitor wrap d'une URL externe (`server.url`), c'est DÉJÀ le cas par construction.** Le risque n'est pas le drift, c'est l'**inverse** : oublier d'adapter là où c'est nécessaire (Stripe iOS, safe areas, hardware back, alerts).

### Pattern architecture recommandé : **NOT DDD, NOT Hexagonal. Feature folder + 1 service plateforme.**

L'app fait 2700 lignes dans `App.tsx`, c'est déjà trop pour appliquer DDD ou Hexagonal sans 3 semaines de refacto. **Reste pragmatique :**

```
src/
  services/
    platformService.ts        ← UNIQUE point d'entrée natif (cf. audit divergences §5)
    apiConfig.ts              ← garder, c'est déjà 50 % de platformService
  components/
    [feature].tsx             ← composants partagés web+natif
  hooks/
    usePlatform.ts            ← React hook qui consomme platformService
```

**Règle d'or doctrine** : un composant ne DOIT JAMAIS importer `@capacitor/*` directement. Toujours via `platformService`. Une lint rule (`no-restricted-imports`) peut imposer ça en 5 minutes.

### Outils mesure parité (ne pas tomber dans le piège du tooling overkill)

| Niveau | Outil | Coût setup | Vraie valeur |
|---|---|---|---|
| **L1 unit** | Vitest (déjà installé) | 0 h | Logique pure (générateur, paces, etc.) |
| **L2 visual** | **Playwright** screenshot diff multi-viewport (iPhone 13, Pixel 7, desktop) | 4 h | Détecte CSS responsive cassé. **Pas besoin de Chromatic** ($200/mois) pour single founder. |
| **L3 E2E web** | Playwright headless sur preview Firebase | 2 h | Smoke tests login/plan/Stripe |
| **L4 E2E natif** | **Maestro** (YAML, simple, gratuit) sur émulateur iOS + Android | 6 h | 5-10 flows critiques : login Apple, génération plan, paiement, déco/reco |
| **L5 perf** | Chrome DevTools remote debug WebView | 1 h | Audit jank scroll PlanView, FPS sur graphes recharts |

**Ne PAS faire** : Detox (3 jours setup pour single founder, Maestro est 10x plus simple). Chromatic ($$). Storybook visual regression (overkill 8 composants).

### Pièges oubliés dans les 8 points process

1. **Aucune mention du delta `server.url` externe vs OTA Capacitor** : actuellement tu pushes du code web sans review Apple. Apple peut considérer ça comme contournement (cf. piège #6 audit 28/05). À documenter dans CGV et **dans la review Apple notes**.
2. **Aucune mention de la versioning sémantique mobile** : `versionCode` Android **DOIT** être incrémenté à chaque upload (même rejeté). Mettre un script `bump-version.sh` qui patche `build.gradle` + `Info.plist` + `package.json` en cohérence.
3. **Aucune mention du keychain/keystore Android perdu** : si Romane perd la `keystore.jks` Play App Signing, **toute l'app est perdue**. Backup obligatoire chiffré (1Password / Bitwarden) **avant** le premier upload.
4. **Aucune mention du Firebase quota natif** : Firebase Auth a un quota anonyme + verified email. Le wrap WebView consomme la même `apiKey`. En cas de bot iOS, Firebase block = tout le monde bloqué.
5. **Aucune mention de l'observabilité Gemini par plateforme** : log `platform: 'ios' | 'android' | 'web'` dans le token monitoring sinon tu ne sauras pas si un crash vient du mobile.

### Drift à 6 mois — comment empêcher

- **Lint rule** : `eslint-plugin-no-restricted-imports` interdit `@capacitor/*` ailleurs que `platformService.ts`.
- **Snapshot UI tests** : 1 fois/sprint, Playwright capture les 10 écrans principaux en 3 viewports. Si diff non justifié → reject PR.
- **Doc `MOBILE_DIVERGENCES.md`** : 1 ligne par divergence justifiée. Si > 20 lignes en 6 mois, on rationalise.
- **Ban des `if (isNative)` inline** : code review humaine obligatoire. Toute conditionnelle plateforme passe par un hook ou un service.

### CSS responsiveness vs natif feel — où placer le curseur

**Mobile-first Tailwind, breakpoint sm: à 640px**, jamais d'écran "tablette" custom (Romane n'a pas le temps). Pour le "feel natif" :
- Safe areas via `env(safe-area-inset-*)` : OBLIGATOIRE, 1 h de patch global.
- **Tap target ≥ 44px** : Apple HIG, Tailwind `min-h-[44px]` sur boutons.
- **Pas de `:hover` parasites** : Tailwind `hover:` partout = effet visuel zombi sur touch. Wrapper `@media (hover: hover)`.
- **`scroll-behavior: smooth`** : OK sur web, à désactiver en natif (jank WebView). Conditionner via class root `is-native`.

### Animations — recommandation sèche

- **Framer Motion** : OK web, lourd en bundle (40 KB gz), saccade WebView iOS sur effets complexes. À utiliser avec parcimonie (transitions de modal, fade).
- **React Spring** : plus performant que Framer mais API plus complexe. **Skip.**
- **Lottie** : OK pour 1-2 animations onboarding (splash, success), interdit pour animations critiques (chargement plan : utiliser CSS spinner natif).
- **Reco** : 80 % `transition-` Tailwind (CSS pur, GPU), 15 % Framer Motion ciblé, 5 % Lottie hero.

---

## 3. Critique des 8 points process

### Ce qui tient
- **#1 Tests E2E réels (L1/L2/L3)** : OK, mais ajouter L4 perf (cf §2). Et arrêter de croire qu'un test LLM 10 profils remplace un test device réel.
- **#3 Audit honnête + grep avant ✅** : c'est LA leçon de l'audit 28/05. À graver. Mettre un hook git pre-commit qui interdit le mot "✅" dans les fichiers MEMORY si pas de grep en commentaire.
- **#5 Sentry + token logging Gemini** : OK, mais ajouter `platform` tag par défaut.
- **#7 Staging Firebase preview channel** : OK, exactement le bon usage.

### Ce qui tombe
- **#2 Pre-deploy checklist humaine** : Romane single founder, elle va la skip à la 3e fois. **Remplacer par checks automatisés CI** : grep `console.log`, grep `alert(`, grep `TODO`, lint, type check. Ce qui est manuel n'est pas fait.
- **#4 Plus de `gh pr merge --admin`** : règle évidente, mais inapplicable seule. **Brancher Settings → Branch Protection → require 1 review** (peut être self-review après 24h) + require CI green.
- **#8 Rollback automatique scripté** : OK sur le papier, mais en mobile, **un rollback ça n'existe pas**. Une app publiée sur l'App Store reste accessible 30 jours en download. **Vraie reco** : feature flags (LaunchDarkly trop cher → Firebase Remote Config gratuit). On désactive la feature buguée à distance.

### Ce qui manque (essentiel)
- **#9 Smoke test post-deploy auto** : 2 min après chaque deploy prod, un script Playwright tape `/auth`, login, génère un plan minimal, vérifie un screen Stripe. Si KO → alerte Pushover/SMS.
- **#10 Version pinning des dépendances natives** : `package-lock.json` commité, **et** `Podfile.lock` commité, **et** `gradle.lockfile` activé. Sinon Capacitor 8.3.1 vs 8.3.2 peut changer un comportement WebView en silence.
- **#11 Backup keystore Android + p12 iOS** : 1Password + AWS S3 chiffré. À faire AVANT le 1er upload.
- **#12 Plan de réponse aux rejets stores** : doc 1 page "si Apple rejette pour X, on répond Y". Sinon panique en review 24h après soumission.
- **#13 Privacy Manifest iOS** : pas dans tes 8 points. C'est P0 rejet auto depuis mai 2024.

### Réordonnancement
**Ordre d'exécution réaliste** : #3 (audit honnête) → #11 (backup keys) → #10 (version pin) → #2-#5 (CI + monitoring) → #6 (doctrine) → #7 (staging) → #8 (feature flags) → #1 (E2E).

---

## 4. Le pire risque caché qu'on n'a pas vu

**Le `server.url` externe Capacitor combiné à l'absence de bundle local fallback = bombe à retardement 6 mois.**

Concrètement : ton `capacitor.config.ts:10` pointe `https://coachrunningia.fr`. Le jour où (a) Firebase Hosting tombe 4 h, ou (b) tu pushes une regression CSS qui rend la page blanche, ou (c) Apple décide en 2027 que les wraps WebView sans bundle local doivent être rebuild (cf. évolutions guideline historiques 2017, 2020, 2024), **TOUS les users mobile voient un écran blanc instantanément**. Pas de retry, pas de message d'erreur, pas de cache. Ils désinstallent et tu te tapes des avis 1 étoile irréversibles sur l'App Store.

**Mitigation obligatoire avant TestFlight public** : `webDir: 'dist'` doit contenir un vrai bundle React minimal (login + landing app + "version offline indisponible") qui prend le relais si `server.url` ne répond pas en 3 s. C'est 4 h de dev. C'est non-négociable. Aucun audit ne l'a chiffré jusqu'ici parce que ça ne se voit qu'en prod, sous panne.

---

## 5. Roadmap 90 jours

### J+0 → J+7 (cette semaine — TestFlight interne)
- Décision Stripe iOS **Option A confirmée** : masquer Premium iOS, label "Disponible sur web".
- Patch P0 audit 28/05 : #75 (Browser external Android), #76 (MobileLayout), #91 (gating routes vitrine).
- `platformService.ts` créé (effort 2 h).
- Privacy Manifest iOS + Info.plist complété + Apple Sign-In capability.
- Safe areas CSS global + hardware back Android.
- Sentry mobile branché (`@sentry/capacitor`).
- Backup keystore + p12.
- Upload TestFlight interne (10 testeurs max) + Play Console Internal.

### J+8 → J+30 (TestFlight élargi + Play Closed Testing)
- Bundle local fallback (mitigation risque §4).
- Local Notifications #77 vraiment implémentées (J-1 + J 7h).
- Maestro 5 flows critiques (login Apple, génération, paiement, déco, plan view).
- Playwright visual diff 3 viewports.
- Universal Links / App Links (Stripe callback retour app).
- Feature flag Firebase Remote Config (kill switch CTA Premium, kill switch génération si crédit Gemini KO).
- Soumission Apple App Store + Play Store (review attendue 24-72 h).

### J+31 → J+60 (post-launch stabilisation)
- Monitoring Sentry analyse 100 premiers crashs réels, fix top 10.
- Optimisation perf WebView : code splitting routes vitrine (lazy), preload assets critiques, lighthouse score > 85 mobile.
- Premier audit drift `MOBILE_DIVERGENCES.md` : compter les `if (isNative)`.
- Décision V2 IAP StoreKit iOS Premium : si revenu iOS > 500 €/mois projetté, lancer chantier 5 j. Sinon, statu quo Safari external sur Android, masquage iOS.
- PWA pure (Add to Home Screen) en parallèle pour Android budget low-end (compte 1 j).

### J+61 → J+90 (croissance + résilience)
- ASO (App Store Optimization) : titre, keywords, screenshots A/B test via App Store Connect.
- Push Notifications remote (`@capacitor/push-notifications` + FCM) si rétention < 30 % J7.
- CI/CD Fastlane (Xcode Cloud + GitHub Actions Android) : auto-archive + auto-upload à chaque tag git.
- Audit perf 60 j : crash-free rate cible > 99.5 %, ANR Android < 0.3 %.
- Décision Flutter / RN re-évaluée seulement si crash-free < 98 % causé par WebView (improbable).

---

## 6. Décisions IRRÉVERSIBLES à prendre cette semaine

1. **Stripe iOS : masquage Premium (Option A) confirmé écrit dans CGV + privacy + page about**. Romane signe, on n'y revient pas avant J+30. Sinon, 3 jours d'IAP StoreKit qui font dérailler le launch.
2. **Bundle ID `fr.coachrunningia.app` définitif** : impossible à changer après publication sans re-créer une app store. Romane confirme aujourd'hui que c'est le bundle ID définitif (pas `com.coachrunning`, pas `fr.coachrunning.app`).
3. **Keystore Android signing key** : générer UNE fois, backup AWS S3 + 1Password, **jamais regénérer**. Si perdue = app perdue pour toujours sur Play Store (même userbase, même reviews).
4. **`server.url` externe : assumer publiquement** dans la review Apple notes ("Notre app charge le contenu depuis notre domaine web vérifié, qui est sous notre contrôle exclusif, et fonctionne avec un fallback local en cas de panne"). À écrire AVANT soumission, pas pendant le rejet.
5. **Doctrine 100 % similitude vs adaptation native : choisir le défaut**. Reco vétéran : **défaut = identique web, exception = documentée dans `MOBILE_DIVERGENCES.md` avec justif technique (Apple rejet, OS API)**. Pas l'inverse. Sinon, dans 6 mois, 47 `if (isNative)` inline incohérents.

---

## Bottom line vieux briscard

Tu es à la bonne stack (Capacitor), tu as la bonne stratégie (100 % similitude + adaptations ciblées), tu as identifié les bons risques (Apple 3.1.1, privacy manifest, drift `isNative`). **Ce qui te manque, ce n'est pas l'architecture, c'est la discipline d'exécution** : arrêter de marquer ✅ sans grep, ajouter le bundle local fallback, brancher Sentry **avant** le launch (pas après les crashs), et écrire `MOBILE_DIVERGENCES.md` dès aujourd'hui pour ne pas dériver.

Le launch TestFlight 7-10 jours est tenable. Le App Store public sous 3 semaines est tenable. **Mais pas en gardant le `server.url` externe sans fallback**. Ça, c'est non-négociable. Le reste, c'est de l'exécution propre.

Romane, tu as une bonne app. Ne la rate pas sur de la plomberie mobile mal serrée. Suis cette roadmap, prends les 5 décisions irréversibles avant vendredi, et lance.
