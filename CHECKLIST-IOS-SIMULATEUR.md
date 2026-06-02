# 📱 CHECKLIST iOS Simulateur — Validation Sprint Mobile V1 (J1-J3)

> **À exécuter par Romane sur son Mac avec Xcode installé.**
> Estimation : 30-45 min.
> Si un check ❌ → notification au dev (mode Claude Code).

---

## 🚀 Setup (5 min)

```bash
cd /Users/romanemarino/Coach-Running-IA

# 1. Pull dernière main (J1+J2+J2.5+J2.6+J3 mergés)
git checkout main && git pull origin main

# 2. Build l'app web
npm run build
# Attendu : pas d'erreur, dist/ généré

# 3. Sync iOS
npx cap sync ios
# Attendu : "✔ Sync finished"

# 4. Ouvrir Xcode
npx cap open ios
# Xcode ouvre le projet ios/App.xcworkspace
```

Dans Xcode :
- Sélectionner **simulateur iPhone 15 Pro** (en haut, dropdown device)
- Cliquer le **▶ Run** (ou Cmd+R)
- Attendre que le simulateur ouvre l'app (1-2 min premier build)

---

## ✅ Checklist tests visuels (25 min)

### A. Build & boot — 🟢 doit passer

- [ ] `npm run build` finit sans erreur
- [ ] `npx cap sync ios` finit sans warning critique
- [ ] Xcode build sans erreur rouge
- [ ] App ouvre sur simulateur (splash orange, puis Login)
- [ ] **PAS d'écran blanc > 3s** après splash

### B. Auth — Apple Sign-In défense

Sur l'écran de login (`/auth`) :
- [ ] **Bouton "Continuer avec Google" est ABSENT** (J2 masquage)
- [ ] Seul le formulaire email/password est visible
- [ ] Lien "S'inscrire" / "Mot de passe oublié" fonctionnent

### C. Routes vitrine — Gating

Dans Safari du simulateur OU via URL bar dans l'app :
- [ ] `/` (LandingPage) → **redirige vers `/dashboard`** ou `/auth?from=dashboard` (J3 NativeOnlyRoute)
- [ ] `/plan-marathon` → redirige (idem)
- [ ] `/blog` → redirige
- [ ] **`/glossary` → s'affiche normalement** (gardé volontairement, vraie feature)
- [ ] `/outils/calculateur-vma` → s'affiche normalement (vraie feature)
- [ ] `/cgv` → s'affiche (obligatoire Apple)

### D. PricingPage iOS — Apple 3.1.1

Navigue vers `/pricing` (ou clique un CTA Premium quelque part) :
- [ ] **Écran neutre Crown** "Tu profites de la version gratuite"
- [ ] **PAS de prix** `9,90€`, `4,90€/mois`, `3,33€/mois`
- [ ] **PAS de boutons** "S'abonner", "Meilleur choix", "Acheter"
- [ ] **PAS de liste features** (Plans illimités, Connexion Strava, etc.)
- [ ] **PAS de lien** vers site web ou mention "coachrunningia.fr"

### E. LandingPage section TARIFS — masquée

Si tu peux navigate `/` (même si redirect) :
- [ ] **Section TARIFS absente** du DOM iOS (chercher inspecteur ou screenshot)
- [ ] Section blog/outils visible (si la page se charge avant redirect)

### F. ProfilePage iOS

Login avec un compte test (ou crée-en un) puis va dans `/profile` :
- [ ] **Si user Premium** : message Netflix-style affiché : *"Votre abonnement Premium est géré depuis votre compte sur notre site web (hors de cette application)."*
- [ ] **Si user Premium** : bouton "Gérer mon abonnement (portail Stripe)" **ABSENT**
- [ ] **Si user gratuit** : bouton "Passer Premium" **ABSENT**
- [ ] **Si user Premium résilié** : bouton "Se réabonner Premium" **ABSENT**

### G. Dashboard CTA quota

Tape le bouton "Nouveau plan" jusqu'à atteindre la limite gratuite :
- [ ] À la limite : **message neutre** "Tu as atteint la limite de la version gratuite" + redirect dashboard
- [ ] **PAS de bouton** "Plans illimités — Premium" (remplacé par message neutre iOS)

### H. PlanView — CTAs Premium

Ouvre un plan existant :
- [ ] **Pas de banner upsell** "Plan Unique actif. Passe en Premium..." (si user Plan Unique)
- [ ] **Pas de CTA** "Voir les offres Premium" sur les semaines verrouillées
- [ ] **Pas de CTA** "Débloquer Premium" sur la section Strava
- [ ] **Pas de CTA** "Passer en Premium" sur drawer exercices
- [ ] Modal VMA : pas de "Voir les abonnements"

### I. Exercices illustrés (Drawer)

Si user gratuit, tape "Voir les exercices illustrés" :
- [ ] Le drawer s'ouvre flouté
- [ ] **Message neutre** : "Cette fonctionnalité est disponible avec un compte Premium géré hors de l'application"
- [ ] **PAS de bouton** "Débloquer avec Premium" avec lien `/pricing`

### J. Navigation menu

Ouvre le menu burger (en haut à droite) :
- [ ] Lien "Tarifs" **ABSENT** du menu top
- [ ] Footer : lien "Tarifs" **ABSENT** aussi
- [ ] Lien "Accueil", "Lexique", "Blog" présents (mais Blog redirect, on s'en moque)

### K. Analytics — pas de tracking iOS

Dans Safari Inspector (Cmd+Opt+I si simulateur connecté à Safari Mac) :
- [ ] Pas de requête vers `connect.facebook.net` (Pixel)
- [ ] Pas de requête vers `googletagmanager.com` (GA)
- [ ] OK si requêtes vers `firestore.googleapis.com`, `vertexai`, etc. (normal)

### L. Privacy Manifest

Pas testable au runtime, mais vérifier au build :
- [ ] Xcode : Build Phases → vérifier `PrivacyInfo.xcprivacy` dans "Copy Bundle Resources"
- [ ] (Plus tard à la soumission App Store Connect) : le linter ne bloque PAS le upload

---

## 🚨 Si un check ❌ — Quoi faire

1. **Faire un screenshot** du problème
2. **Noter la route + le check ID** (ex: "F. ProfilePage iOS : bouton portail VISIBLE alors qu'il doit être absent")
3. **Pinger Claude Code** dans le terminal :
   ```
   FAIL check F : ProfilePage bouton portail Stripe encore visible iOS — screenshot dans ~/Desktop/ios-fail-F.png
   ```
4. Je fix dans la session

---

## ✅ Si TOUS les checks passent

- 🟢 **L'app iOS est prête pour J4-J6** (safe area + loading + Xcode archive + TestFlight)
- 🟢 **Surface Apple 3.1.1, 4.2, 5.1.1, 5.1.2 = OK**
- Reste à faire : safe area iPhone notch (J4), loading state (J5), archive Xcode (J6)

---

## Bonus tests recommandés (10 min)

### iPad simulateur
- [ ] Test sur simulateur **iPad** (le layout peut casser sur écran large)
- [ ] Rotation portrait/paysage : pas de bug visuel
- [ ] (Apple TESTE iPad obligatoirement au review si `UISupportedInterfaceOrientations~ipad` présent)

### iPhone SE (petit écran)
- [ ] Test simulateur **iPhone SE** (3rd gen) : écran 4.7", risque débordement texte
