# Audit divergences mobile/web — état actuel (28/05/2026)

> Auditeur : Expert dev frontend cross-platform (React + Capacitor 8.3, iOS + Android, 12 ans).
> Méthode : grep + lecture systématique de `src/`, `ios/`, `android/`, `capacitor.config.ts`, `package.json`.
> Verdict 30-sec : **le projet n'a quasiment aucune divergence mobile/web — parce qu'aucune adaptation native n'a été implémentée du tout**. C'est un wrap WebView pur de `https://coachrunningia.fr` avec UN seul fichier (`apiConfig.ts`) qui touche à `Capacitor.isNativePlatform()`. Ce n'est pas du drift, c'est du **néant natif**.

---

## 1. Tableau récapitulatif des divergences détectées

| ID | Type | Fichier:Ligne | Description | Justifié ? | Action |
|----|------|---------------|-------------|------------|--------|
| D-001 | Conditionnel inline | `src/services/apiConfig.ts:7` | `if (Capacitor.isNativePlatform()) return 'https://coachrunningia.fr'` — préfixe API pour Cloud Run en natif | Oui (CORS / WebView absolute URL) **mais inutile en pratique** car `server.url` charge déjà `coachrunningia.fr` donc les `/api/...` relatives marchent. Code défensif redondant. | Garder mais documenter / centraliser dans futur `platformService` |
| D-002 | Conditionnel inline | `src/services/apiConfig.ts:26` | `if (isNative)` ajoute header `X-Mobile-App: capacitor` sur fetch | Partiellement (server n'utilise ce header NULLE part — `grep X-Mobile-App` côté serveur = 0 résultats) | Soit utiliser côté serveur (analytics/rate-limit), soit supprimer |
| D-003 | Export const | `src/services/apiConfig.ts:16` | `export const isNative` figé au load. Une seule source de vérité plateforme. | Oui | OK, mais à enrichir (platform iOS/Android, version) |
| D-004 | Wrap fetch | `src/services/apiConfig.ts:24` | `apiFetch()` exporté. **Utilisé 1 SEULE fois** dans tout le code (`PlanView.tsx:2472`). | Non | Soit propager (14+ `fetch('/api/...')` sauvages à migrer), soit supprimer |
| D-005 | Plateforme externe | `capacitor.config.ts:10` | `server.url: 'https://coachrunningia.fr'` = WebView charge l'URL distante directement, **aucun fallback bundle local** | Choix d'archi assumé | RISQUE : si domaine down, app blanche. Pas de divergence mais pas de résilience. |
| D-006 | Absence native | `src/components/PricingPage.tsx:41` | `window.location.href = data.url` redirige vers Stripe Checkout en WebView | **NON justifié** — viole Apple 3.1.1 (Stripe in-app = rejet). Pas de check `isNative`. | BLOQUANT P0 : check `isNative && platform==='ios'` + masquer OU `@capacitor/browser` open externe |
| D-007 | Absence native | `src/services/storageService.ts:708, 742` | Idem : `window.location.assign(data.url)` Stripe checkout/portal | Non | Idem D-006 |
| D-008 | Absence native | `src/components/blog/BlogArticle.tsx:50-63` | `navigator.share` + fallback `navigator.clipboard` | Tolérable Web Share API marche en WebView iOS depuis 16.4 / Android | OK, optionnel : migrer vers `@capacitor/share` plus fiable |
| D-009 | UX dégradée | `src/App.tsx` lignes 100,116,196,392,565,744,1342 + `Questionnaire.tsx`, `StravaConnect.tsx` etc. (20+ occurrences) | `alert("...")` natif browser. En WebView iOS = popup "coachrunningia.fr says: ..." | Non | Remplacer par Toast (déjà existe : `src/components/Toast.tsx`) ou `@capacitor/dialog` |
| D-010 | Routes vitrine | `src/App.tsx:259-282` | TOUTES les routes vitrine (`/`, `/plan-marathon`, `/plan-trail`, `/blog/*`, `/outils/*`, `/glossary`, `/cgv`...) servies aussi en natif. Aucun gating `isNative`. | Non — Apple guideline 4.2 "minimum functionality" | Wrapper conditionnel sur 14+ routes vitrine en natif |
| D-011 | Layout commun | `src/components/Layout.tsx:60-65` | NavLinks inclut Accueil/Tarifs/Lexique/Blog en hamburger mobile **identique web** | Non | En natif, masquer ces entrées non-app |
| D-012 | Storage | 14 occurrences `localStorage.*` dans `src/` | Utilisé pour : paceUnit, strava_return_url, pendingPlanId, heatTipSeen, nutrition_*_warning, STRIPE_CACHE_KEY | Compatible WebView mais **persistance non garantie** sur iOS si purge système | Migrer caches critiques vers `@capacitor/preferences` |
| D-013 | Service Worker kill | `src/index.tsx:10-17` | Unregister SW à chaque load. En natif inutile (pas de SW). Bénin. | Bénin | Pas d'action |
| D-014 | Storage cookie | `src/components/Layout.tsx:57` | `window.location.hash = '/'` pour logout. HashRouter non utilisé (BrowserRouter en `App.tsx:1931`). Ligne morte / bug latent. | Non | Remplacer par `navigate('/')` |
| D-015 | window.open print | `src/services/exportService.ts:238` | `window.open('', '_blank')` pour générer HTML imprimable du plan | **Cassé en WebView** : pop-up bloquée, pas de print natif | Conditionner ou désactiver export PDF print en natif |
| D-016 | Download blob | `src/services/exportService.ts:88, 161, 299` | `URL.createObjectURL` + `link.click()` (ICS, TCX) | Fonctionne en WebView iOS (DL dans Files via Share sheet) mais UX médiocre | OK acceptable ; idéal : `@capacitor/filesystem` + share |
| D-017 | UserAgent leak | `src/App.tsx:186`, `src/index.tsx:62` | Log Firestore `navigator.userAgent` pour erreurs. En natif → contient `Capacitor` mais aucun parsing/filtrage. | Bénin (just logs) | Pas d'action |
| D-018 | Safe area | `src/` : `grep safe-area = 0 résultats` | AUCUN CSS `env(safe-area-inset-*)`. iPhone 15 notch + home indicator → contenu coupé sous status bar / au-dessus de la home bar. | Non | Patch CSS global `padding: env(safe-area-inset-top/bottom)` ou wrapper layout natif |
| D-019 | Hover media | `src/` : `grep @media.*hover = 0 résultats` | Pas de différenciation touch/hover. Tailwind `hover:` partout = effets visuels parasites sur touch device. | Bénin mais polish | Pas urgent |
| D-020 | Standalone detect | `src/` : `grep standalone = 0 résultats` | Pas de détection mode standalone (PWA), pas de différence avec WebView | Bénin | Pas d'action |

**Total divergences actives : 4 fichiers** (`apiConfig.ts`, `PricingPage.tsx`, `storageService.ts`, `BlogArticle.tsx`).
**Total divergences MANQUANTES (à créer)** : 11+ patterns (routes gating, Stripe iOS, alert, safe area, Layout, etc.).

---

## 2. Capacitor plugins

### Installés (présents dans `package.json`)
- `@capacitor/android` ^8.3.0
- `@capacitor/cli` ^8.3.0
- `@capacitor/core` ^8.3.0
- `@capacitor/ios` ^8.3.0
- `@capacitor/splash-screen` ^8.0.1 — **configuré** dans `capacitor.config.ts` plugins block
- `@capacitor/status-bar` ^8.0.2 — **configuré** dans `capacitor.config.ts` plugins block

### Fantômes (présents dans node_modules / Package.swift, NON utilisés dans src/)
- `@capacitor/app` (présent `node_modules/`, **absent package.json**, **0 import src/**) — fantôme installé sans déclaration
- `@capacitor/browser` (présent `node_modules/`, **absent package.json**, **0 import src/**) — fantôme. Nécessaire pour D-006 (open Stripe externe)
- `@capacitor/local-notifications` (présent `node_modules/`, **absent package.json**, **0 import src/**) — fantôme. Promesse #77 vide.
- `@capacitor/splash-screen` + `@capacitor/status-bar` : présents dans `ios/App/CapApp-SPM/Package.swift` mais **aucun appel JS** (juste configuration). Aucun `SplashScreen.hide()` programmatique → l'écran disparaît automatiquement après 2s.

### Manquants attendus (besoins métier identifiés sans plugin)
- `@capacitor/preferences` — pour storage natif sécurisé (vs localStorage volatile iOS)
- `@capacitor/dialog` — pour remplacer `alert()` natif browser (20+ occurrences)
- `@capacitor/share` — pour blog share (D-008, fallback plus fiable que `navigator.share`)
- `@capacitor/haptics` — feedback tactile (UX premium attendue en app mobile)
- `@capacitor/keyboard` — pour gérer safe area clavier sur Questionnaire/AuthModal (inputs cachés par keyboard sinon)
- `@capacitor/filesystem` — pour download ICS/TCX/PDF propre (D-015, D-016)
- `@capacitor/push-notifications` (optionnel) — push remote vs `local-notifications` (suffit pour J-1/J 7h)

---

## 3. Tasks "✅" vs réalité (verdict honnête)

### #75 PricingPage → Safari externe pour Stripe
**Verdict : PAS FAIT.**
- Preuve : `grep -n "isNative\|Capacitor" src/components/PricingPage.tsx` = **0 occurrence**.
- Code actuel (PricingPage.tsx:25) : `fetch('/api/create-checkout-session', ...)` puis ligne 41 `window.location.href = data.url`.
- Idem `src/services/storageService.ts:708, 742` : `window.location.assign(data.url)` direct.
- Aucun import `@capacitor/browser`. Aucun check plateforme. **iOS chargera Stripe IN-APP → rejet Apple 3.1.1.**

### #76 MobileLayout menu kebab
**Verdict : PAS FAIT (composant inexistant).**
- Preuve : `find src/ -name "*Mobile*" -o -name "MobileLayout*"` = **0 résultat**.
- `grep -rn "MobileLayout\|MobileNav\|MobileMenu\|kebab"` = 0.
- `Layout.tsx` a un menu hamburger (`isMenuOpen`) mais **identique en web et natif**, et il liste toutes les routes vitrine (Accueil, Tarifs, Lexique, Blog, Plans, Outils) — aucune entrée masquée en natif.

### #77 Local Notifications J-1 + J 7h
**Verdict : PAS FAIT (plugin pas dans package.json, 0 appel).**
- Preuve : `grep "local-notifications" package.json` = 0. Plugin présent dans `node_modules/` (fantôme installé), absent de la déclaration officielle.
- `grep -rn "LocalNotifications.schedule\|LocalNotifications" src/` = **0 résultat**.
- Mention dans PricingPage features : `"Rappels hebdomadaires", "Ne rate jamais une séance"` (ligne 59) → promesse marketing **vide**.
- Aucun pipeline cron côté serveur (vérifié `server.js` brièvement) qui pourrait remplacer.

---

## 4. Routes vitrine en natif

État : **TOUTES accessibles en natif sans aucun gating.** App.tsx:257-306 = 1 seul `<Routes>` partagé.

| Route | Type | Accessible natif ? | Devrait l'être ? |
|---|---|---|---|
| `/` (LandingPage) | Vitrine | OUI | NON (Apple 4.2) |
| `/pricing` (PricingPage) | Conversion | OUI | OUI mais avec Stripe gating iOS (D-006) |
| `/plan-semi-marathon`, `/plan-marathon`, `/plan-trail`, `/plan-hyrox`, `/programme-running-debutant`, `/plan-10km` | Vitrine SEO | OUI | NON |
| `/glossary` | Vitrine SEO | OUI | NON (ou tolérable comme bonus app) |
| `/cgv`, `/confidentialite`, `/mentions-legales` | Légal | OUI | OUI (obligatoire pour stores) |
| `/outils`, `/outils/*` (8 calculateurs) | Outils | OUI | OUI (vraie feature app) |
| `/blog`, `/blog/:slug`, `/post/:slug` | Contenu | OUI | NON (SEO web only) |
| `/auth`, `/verify-email`, `/email-sent` | Auth | OUI | OUI |
| `/strava-callback` | OAuth callback | OUI | OUI (mais deep-link manquant) |
| `/success` | Stripe callback | OUI | À voir (cf piège deep link Apple) |
| `/dashboard`, `/profile`, `/plan/:planId` | App | OUI | OUI |
| `/admin`, `/admin/blog` | Admin | OUI | NON (réservé) |

**Conclusion** : 14+ routes vitrine devraient être hidden/redirect en natif. Effort : 1 composant wrapper `<NativeOnlyRoute>` ou redirect global au mount si `isNative && route.match(vitrineList)`.

---

## 5. Recommandation refactor prioritaire

### Étape 1 — Créer `src/services/platformService.ts` (effort : 2 h)
Centraliser les 3 occurrences existantes + futures dans UN seul fichier exposant :
```ts
export const platform: 'web' | 'ios' | 'android'
export const isNative: boolean
export const isIOS: boolean
export const isAndroid: boolean
export const openExternal(url: string): Promise<void> // web: window.open ; natif: Browser.open
export const showAlert(msg: string): Promise<void>    // web: alert ; natif: Dialog.alert
export const setItem/getItem(key, value)              // web: localStorage ; natif: Preferences
export const share({ title, text, url })              // navigator.share OU Share plugin
```
Pas d'abstraction prématurée : seulement ce qui a un cas d'usage **immédiat** dans le code.

### Étape 2 — Patcher les 3 bombes Apple 3.1.1 (effort : 2 h)
1. `PricingPage.tsx:41` → `if (isIOS) hideCTA() else if (isAndroid) openExternal(data.url) else window.location.href = data.url`
2. `storageService.ts:708, 742` → idem
3. Mention "Rappels hebdo" dans PricingPage features → SOIT implémenter `@capacitor/local-notifications`, SOIT retirer la ligne pour éviter litige.

### Étape 3 — Gating routes vitrine (effort : 1 h)
```tsx
const VITRINE = ['/', '/plan-marathon', '/plan-trail', /* ... */];
if (isNative && VITRINE.includes(location.pathname)) <Navigate to="/auth" />
```

### Étape 4 — Remplacer `alert()` (effort : 2 h)
20+ occurrences `alert("...")`. Cibler les plus visibles d'abord :
- `App.tsx` (7 alerts dont erreurs Stripe et limites plan)
- `Questionnaire.tsx`, `StravaConnect.tsx` : flow signup critique
- Utiliser `Toast.tsx` existant (web + natif compatibles) ou ajouter `@capacitor/dialog`.

### Étape 5 — Safe areas iOS (effort : 1 h)
Patch CSS global :
```css
body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
```
+ ajuster header sticky de `Layout.tsx` pour compenser.

### Étape 6 — Hardware back Android (effort : 1 h)
Wire `@capacitor/app` → `addListener('backButton', () => navigate(-1))` au mount de `App.tsx`. Sans ça, back ferme l'app = rejet Play Store.

**Effort total reco : ~9h dev = 1.5 jour homme** pour passer de "wrap aveugle" à "natif-ready décent".

---

## 6. Risques drift futur si pas refactoré

1. **Inflation d'`isNative` inline** : sans `platformService`, chaque nouveau patch va `import { Capacitor } from '@capacitor/core'` et faire son propre `isNativePlatform()` inline. Drift garanti dans 6 mois.

2. **Duplication storage** : 14 sites localStorage + futur Preferences = 28 sites quand quelqu'un commencera à migrer "à moitié". Bugs de désync entre les deux stores.

3. **Alert + Toast + Dialog incohérents** : si on ajoute `@capacitor/dialog` sans remplacer les 20 `alert()`, on aura 3 systèmes de feedback utilisateur (alert browser pop-up, Toast custom, Dialog natif). UX schizophrène.

4. **`apiFetch` zombi** : utilisé 1 fois sur 15. Soit on impose son usage (lint rule), soit on supprime — sinon on a 2 façons de fetch et le header `X-Mobile-App` n'est jamais fiable côté serveur.

5. **Routes vitrine fuyantes** : à chaque nouvelle landing page SEO créée (`/plan-100k`, `/coach-debutant-femme`, etc.), si pas de wrapper systématique, elle apparaîtra automatiquement en natif. Apple finira par s'en rendre compte au reviewer suivant.

6. **Phantom plugins** : `@capacitor/app`, `@capacitor/browser`, `@capacitor/local-notifications` sont dans `node_modules/` mais absents de `package.json`. Au prochain `npm ci` propre (CI/CD), ils disparaissent. Code qui les utiliserait casserait silencieusement.

7. **Pas de fallback bundle local** : `capacitor.config.ts:10` charge tout depuis `coachrunningia.fr`. Si Firebase Hosting / domaine tombe → app blanche, aucun retry, aucun écran d'erreur natif. **Capacitor doctrine 2024** : Apple peut considérer ça comme contournement de review (push de feature sans store).

8. **`window.location.reload()` (4 occurrences)** : en natif, ça recharge la WebView depuis `server.url`. Si lente / réseau coupé → écran blanc 5-10s sans spinner. UX dégradée invisible en dev.

---

## Bottom line factuel

Le projet est **purement web déguisé en app native**. Aucune branche de code spécifique au-delà de :
- 3 lignes utiles dans `apiConfig.ts` (header + API base)
- Configuration plugin Splash + StatusBar dans `capacitor.config.ts`

Tout le reste — Stripe iOS, routes vitrine, alert, safe areas, notifications, hardware back, deep links — est **identique au web**.

Ce n'est **pas un état désastreux** car il n'y a quasi pas de drift à nettoyer. C'est un état **vide** : il faut **créer** la couche native, pas la **refactorer**. La bonne nouvelle : 1 fichier `platformService.ts` + 6 patches ciblés règlent 80 % des risques rejet stores et UX dégradée.

Les TODO #75/#76/#77 marqués ✅ dans la mémoire sont **factuellement faux** : aucun code n'y correspond.
