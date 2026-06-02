# Audit Mobile — Launch ASAP (28/05/2026)

> Auditeur : Expert dev mobile senior (iOS + Android + Capacitor, 15 ans).
> Repo : `/Users/romanemarino/Coach-Running-IA`. Stack : Capacitor 8.3 wrap WebView de `coachrunningia.fr`.
> Ton attendu par Romane : **honnêteté brute, pas de fluff**.

---

## 1. État des lieux — résumé brutal

### Ce qui EST en place
- `capacitor.config.ts` : `appId=fr.coachrunningia.app`, server URL externe (`https://coachrunningia.fr`), SplashScreen+StatusBar configurés.
- Projets natifs présents : `ios/App/` (SPM, pas de Podfile) + `android/app/` (Gradle).
- AppIcons iOS 1024×1024 + Android mipmap multi-densités OK (#79 ✅).
- Détection plateforme : `src/services/apiConfig.ts` expose `isNative` + `apiFetch` (header `X-Mobile-App`).
- Pages légales web déjà routées : `/cgv`, `/confidentialite`, `/mentions-legales` (CGV + RGPD existent).
- `versionCode=1` / `versionName=1.0` (jamais bumpés).

### Ce qui N'EST PAS en place (et qui est marqué ✅ à tort dans la mémoire)
| Tâche | Statut mémoire | Réalité code | Gravité |
|---|---|---|---|
| **#75 PricingPage → Safari externe** | ✅ | **NON IMPLÉMENTÉ** : `PricingPage.tsx` fait `window.location.href = data.url` (Stripe URL). `isNative` jamais checké. | **BLOQUANT Apple rejet 3.1.1** |
| **#76 MobileLayout menu kebab** | ✅ | Aucun composant `MobileLayout` trouvé dans `src/` (grep négatif). À confirmer ou créer. | Moyen |
| **#77 Local Notifications J-1 + J 7h** | ✅ | `@capacitor/local-notifications` **absent de package.json**. Aucun appel `LocalNotifications.schedule` dans `src/`. | Élevé (feature promise vide) |
| **#91 Cacher routes vitrine en natif** | ⏳ | Confirmé non fait. Landing + Blog accessibles dans WebView. | Élevé (rejet Apple "minimum functionality") |

### Ce qui est PENDING comme prévu
- **#78** Apple Sign-In Capability Xcode (project.pbxproj à patcher).
- **#80** Firebase Android Console (`google-services.json` absent — `android/app/build.gradle` log déjà l'avertissement).
- **#81** Archive iOS + upload TestFlight.

### Trous critiques non listés dans la TODO
- **Info.plist iOS** : minimal. Manque `NSAppTransportSecurity`, `NSUserTrackingUsageDescription` (si analytics), `ITSAppUsesNonExemptEncryption=false`, `NSUserNotificationsUsageDescription`.
- **AndroidManifest.xml** : 41 lignes, manque `POST_NOTIFICATIONS` (Android 13+), `networkSecurityConfig`, intent-filter deep linking, `usesCleartextTraffic=false` explicite.
- **AppDelegate.swift** : default stub, pas de `UNUserNotificationCenter.current().requestAuthorization`.
- **Aucun crash reporting** (pas de Sentry, pas de Crashlytics).
- **Aucune Privacy Manifest** iOS 17+ (`PrivacyInfo.xcprivacy` requis depuis 2024-Q2 pour soumission App Store).

---

## 2. Tableau étapes restantes — priorisé

Légende : **P0** = bloquant soumission. **P1** = bloquant rejet store. **P2** = critique UX. **P3** = nice-to-have.

| # | Catégorie | Tâche | P | Effort | Risque si pas fait |
|---|---|---|---|---|---|
| 1 | **E** Conformité | **Stripe Premium : choisir IAP StoreKit OU "external payment" disclosure** (voir §3 piège #1). Mini : masquer Premium en iOS via `isNative && platform==='ios'` (revenue iOS perdu) | **P0** | 3 j (IAP) / 2 h (masquage) | Rejet Apple 3.1.1 quasi garanti |
| 2 | **C** Régression | Implémenter VRAIMENT #75 : si `isNative` → `Browser.open({url: stripeUrl})` via `@capacitor/browser` (web case Android uniquement, iOS = masqué cf #1) | **P0** | 2 h | Achat impossible mobile / rejet Apple |
| 3 | **C** Régression | Implémenter VRAIMENT #91 : routes `/`, `/coach-marathon`, `/blog/*` → redirect vers `/login` si `isNative` (sinon Apple "doesn't provide enough functionality") | **P0** | 2 h | Rejet Apple guideline 4.2 |
| 4 | **C** Régression | Audit complet Sprint G UX Strava + F-17 + F-18 revert sur **device iOS réel** (iPhone) + **device Android réel** : modal, auto-match, kebab menu, scroll, safe areas | **P0** | 1 j | Bugs invisibles desktop |
| 5 | **A** iOS | **#78** Apple Sign-In Capability : ouvrir Xcode → Signing & Capabilities → +Capability → Sign in with Apple. Patcher `entitlements`. | **P0** | 30 min | Login Apple ne marche pas |
| 6 | **A** iOS | Compléter `Info.plist` : `ITSAppUsesNonExemptEncryption=false`, `NSCameraUsageDescription` (si upload photo Strava un jour, sinon skip), `NSPhotoLibraryUsageDescription` (si export plan). | **P0** | 30 min | Bloque upload TestFlight |
| 7 | **A** iOS | **Privacy Manifest** `PrivacyInfo.xcprivacy` (iOS 17+ obligatoire May 2024). Déclarer Firebase Auth/Firestore/Stripe domain + reason codes API. | **P0** | 1 h | **Rejet automatique App Store Connect** |
| 8 | **A** iOS | App Store Connect : créer fiche app, bundle ID, screenshots 6.7" + 6.5", description FR, mots-clés, catégorie Health & Fitness, age rating, contact, privacy policy URL (=`coachrunningia.fr/confidentialite`). | **P0** | 4 h | Pas de soumission possible |
| 9 | **A** iOS | Certificate Distribution + Provisioning Profile App Store + Bumper `MARKETING_VERSION` (1.0.0) + `CURRENT_PROJECT_VERSION` (build 1+). | **P0** | 1 h | Pas d'archive |
| 10 | **A** iOS | **#81** Archive + upload Transporter / Xcode Cloud → TestFlight. | **P0** | 2 h | Pas de beta |
| 11 | **B** Android | **#80** Firebase Console : créer app Android `fr.coachrunningia.app`, télécharger `google-services.json`, placer dans `android/app/`, ajouter SHA-1 debug + release. | **P0** | 1 h | Login Google KO sur Android |
| 12 | **B** Android | Compléter `AndroidManifest.xml` : `<uses-permission POST_NOTIFICATIONS />` (Android 13+), `android:usesCleartextTraffic="false"`, `networkSecurityConfig`. | **P0** | 30 min | Notifs Android 13+ silencieuses |
| 13 | **B** Android | Google Play Console : créer app, signing key (Play App Signing recommandé), data safety form, screenshots, description, content rating, target audience. | **P0** | 4 h | Pas de soumission |
| 14 | **B** Android | Bumper `versionCode`/`versionName` (`android/app/build.gradle`). Build AAB release signé. Upload internal testing track. | **P0** | 2 h | Pas de beta Android |
| 15 | **D** UX natif | Safe areas iOS (notch + home indicator) : vérifier `contentInset: 'automatic'` suffisant ou patch CSS `env(safe-area-inset-*)`. Tester iPhone 15 Pro. | **P1** | 2 h | UX coupée notch / boutons cachés |
| 16 | **D** UX natif | Hardware back button Android : `App.addListener('backButton', ...)` via `@capacitor/app`. Sans ça, back = ferme l'app au lieu de naviguer. | **P1** | 2 h | Rejet Play Store probable |
| 17 | **D** UX natif | Pull-to-refresh : `webview.setBounces(false)` iOS sinon scroll bounce sur pages plan. | **P2** | 30 min | UX pas premium |
| 18 | **D** UX natif | Loading state : SplashScreen tient 2s + délai network → écran blanc 3-5s si réseau lent. Ajouter spinner avant `Capacitor.isNativePlatform()` hide. | **P1** | 1 h | UX "app cassée" |
| 19 | **D** UX natif | Offline mode : aucune gestion. Plan dans Firestore peut être lu offline si activé (`enableIndexedDbPersistence`). Vérifier. | **P2** | 2 h | App inutilisable métro/avion |
| 20 | **F** Monitoring | Sentry mobile (`@sentry/capacitor`) ou Firebase Crashlytics. **Indispensable post-launch** pour debug user. | **P1** | 3 h | Aveugle aux crashs |
| 21 | **F** Monitoring | Firebase Analytics events (`screen_view` natif) ou Plausible (mais web only). | **P3** | 2 h | Pas de funnel |
| 22 | **C** Régression | Tester webview persistence : reload après backgrounding, session Firebase Auth tient ? | **P1** | 1 h | User délogué tous les jours |
| 23 | **D** UX natif | Implémenter VRAIMENT **#77 Local Notifications** OU retirer la promesse de "Rappels J-1+J" du PricingPage. | **P1** | 1 j (impl) / 5 min (retirer) | Promesse non tenue = refund |
| 24 | **E** Conformité | App Tracking Transparency (ATT) iOS : si pas de tracking cross-app, déclarer "Data Not Collected" dans App Privacy. Si Firebase Analytics enabled = tracking. | **P0** | 1 h | Rejet privacy |
| 25 | **E** Conformité | Compte de test pour review Apple (login `apple-review@coachrunningia.fr` + password + plan exemple gratuit). | **P0** | 30 min | Rejet "can't test" |

**Total P0 effort minimal : ~3 j homme.** P0+P1 : ~5 j homme.

---

## 3. Pièges Capacitor 8.3 + iOS 17 / Android 14 à anticiper

### Piège #1 — Apple IAP (BLOQUANT N°1) — Guideline 3.1.1
Stripe Checkout pour abonnement Premium **dans WebView** = **rejet quasi automatique**. Trois options réalistes :
- **(A) Masquer Premium iOS** (`isNative + platform==='ios'` → cacher CTA, montrer "Disponible sur web uniquement"). Sacrifice revenue iOS mais lance vite. Pas un rejet si bien framé ("free preview app, full features web").
- **(B) Implémenter StoreKit IAP** via `@capacitor/in-app-purchase` ou plugin tiers (`cordova-plugin-purchase`). 15-30 % Apple tax. 3-5 jours dev + side-server validation receipts. Doctrine Romane "single founder", lourd.
- **(C) External Link Account Entitlement** (depuis iOS 16 EU DMA / depuis 2024 monde + 27 % fee Apple). Compliqué juridiquement.
**Reco : (A) pour launch ASAP, (B) en V2.**

### Piège #2 — Privacy Manifest iOS (`PrivacyInfo.xcprivacy`)
Obligatoire depuis mai 2024 sinon soumission rejetée automatiquement. À déclarer : Firebase domains, Stripe domain, reason codes pour `UserDefaults`, `FileTimestamp`, `SystemBootTime`, `DiskSpace` (Capacitor utilise ces APIs).

### Piège #3 — WebView session persistence iOS
Sans `WKWebsiteDataStore` custom, cookie Firebase Auth (`__session`) peut être purgé. Firebase Auth utilise IndexedDB ; Capacitor 8 WKWebView le persiste. **À tester** : login → background 24h → réouvrir, encore loggé ?

### Piège #4 — Android 13+ POST_NOTIFICATIONS
Sans permission runtime + déclaration manifest, **toutes les notifs silencieuses**. Casse #77 directement.

### Piège #5 — Deep linking / Universal Links
Pas configuré. Lien `coachrunningia.fr/success?session_id=...` (callback Stripe) **ne reviendra pas dans l'app après paiement**. User reste sur Safari. Fix : Apple Associated Domains + AndroidManifest intent-filter `android:autoVerify="true"` + `apple-app-site-association` hébergé sur le domaine (`/.well-known/apple-app-site-association`).

### Piège #6 — `server.url` externe = pas d'OTA Capacitor classique
Avantage : push une nouvelle version sans review store. **Risque** : Apple peut considérer ça comme contournement de review. **Doctrine Capacitor 2024** : tolérée si l'app fonctionne aussi avec bundle local fallback. **Aucun fallback local** ici (`webDir: 'dist'` mais `server.url` override). Si `coachrunningia.fr` tombe → app blanche. **Reco : ajouter fallback bundle local + retry.**

### Piège #7 — iOS 17 status bar / safe areas
`StatusBar.style: 'DARK'` + bg `#f97316` orange : OK mais vérifier que le contenu sous status bar n'est pas masqué (CSS `padding-top: env(safe-area-inset-top)` sur les pages).

### Piège #8 — Android 14 foreground service types
Pas concerné (pas de background tracking), mais si jamais on ajoute geolocation pendant run → `android:foregroundServiceType="location"` obligatoire.

### Piège #9 — `versionCode=1` réutilisé
Si Romane upload Build #1, rejette, refait Build #1 → Play Console refuse. **Toujours bumper avant upload**, même pour rebuild.

---

## 4. Trois scénarios roadmap

### Scénario A — **MVP Fast 1 semaine** (lancement TestFlight + Play Internal)

Périmètre : Android d'abord (pas de blocage Stripe), iOS sans Premium (CTA masqué).

| Jour | Tâches |
|---|---|
| **J1 (jeudi)** | #1 masquage Premium iOS + #3 routes vitrine + #11 google-services.json + #12 manifest Android + #16 hardware back |
| **J2** | #5 Apple Sign-In + #6 Info.plist + #7 Privacy Manifest + #9 versioning iOS |
| **J3** | #4 test device réel iPhone + Android (4-5h test) + bugfix |
| **J4** | #8 App Store Connect fiche + screenshots + #13 Play Console fiche + screenshots |
| **J5** | #10 Archive iOS + TestFlight upload + #14 AAB Play Internal + #25 compte review |
| **J6** | Buffer rejet/relance review Apple |
| **J7** | Test TestFlight + beta Android famille/coachs |

Sacrifices : Pas de Local Notifications (#23 → retirer la promesse PricingPage). Pas de monitoring (aveugle aux crashs). Pas de deep linking (Stripe success Android ouvre browser).

### Scénario B — **MVP Solid 2 semaines**

Tout du A + :
- Local Notifications J-1 + J 7h **vraiment** implémentées (#23 impl)
- Sentry mobile (#20)
- Universal Links / deep linking (#5 piège)
- Webview persistence audit (#22)
- Loading state (#18)
- Offline Firestore persistence (#19)
- Buffer 3 j pour itérations review store

### Scénario C — **Robust 1 mois**

Tout du B + :
- IAP StoreKit Apple pour Premium iOS (3-5 j)
- Tests E2E natif (Detox ou Maestro) sur 10 scénarios
- Crashlytics + Analytics funnel complet
- CI/CD Fastlane (Xcode Cloud iOS + GitHub Actions Android)
- Bundle local fallback (piège #6)
- A/B testing onboarding mobile

---

## 5. Recommandation honnête + 3 actions DEMAIN

### Verdict cash
**1 semaine = trop juste mais faisable Android-only.** iOS demande au minimum 5 jours pleins de dev + 1-3 jours review Apple (souvent 24h aujourd'hui, mais privacy manifest mal foutu = 3-5j de ping-pong).

**Réaliste pour TOI Romane (single founder + Claude qui code) :**
- **TestFlight iOS interne : 7-10 jours** (avec masquage Premium iOS)
- **Play Console Internal Testing : 4-5 jours**
- **App Store publique : 3 semaines minimum** (review Apple + corrections probables sur privacy manifest, screenshots, description)
- **Play Store publique : 2 semaines**

La fausse comptabilité des ✅ (#75, #76, #77) est le plus gros risque caché : 3 jours de "rattrapage de promesses" non chiffrés dans le planning original.

### 3 actions à faire DEMAIN (29 mai)
1. **Décision Stripe iOS** : choisir entre masquage Premium iOS (2h dev, lance vite) OU IAP StoreKit (5j dev). **C'est la seule décision business qui débloque tout.** Sans ça, rien ne sert d'avancer.
2. **Audit reality-check des ✅** : ouvrir `PricingPage.tsx`, `MobileLayout` (si existe), grep `LocalNotifications` → confirmer ce qui est vraiment fait. Mettre la TODO à jour avec mes constats §1.
3. **Créer fiche App Store Connect + Play Console** (4h chacune, peut être fait en parallèle du dev) : c'est le chemin critique le plus long (screenshots à shooter sur device, description à écrire, privacy form à remplir).

### Ce qu'il ne faut surtout PAS faire
- Lancer iOS sans Privacy Manifest → rejet immédiat, 24-48h perdues.
- Promettre "Rappels hebdo" dans PricingPage sans implémenter → refund Apple/Play possible.
- Activer Firebase Analytics côté natif sans ATT prompt iOS → rejet privacy.
- Pousser un build avec `versionCode=1` qui a déjà été uploadé → Play refuse.

**Bottom line** : Romane, tu peux avoir une beta TestFlight + Play Internal dans 7 jours si tu prends la décision #1 demain matin. Public store : compte 3 semaines, pas 1. Et arrête de marquer des tâches ✅ tant qu'elles n'ont pas tourné sur un device réel.
