#!/bin/bash
# verify-ios-fixes.sh
#
# Vérification statique que tous les fixes Mobile iOS V1 (J1-J3) sont en place
# dans le code. Grep-based, rapide, sans dépendance.
#
# Usage : bash verify-ios-fixes.sh
# Exit code : 0 si tout OK, 1 si au moins 1 trou
#
# Cf CHECKLIST-IOS-SIMULATEUR.md pour la validation visuelle device.

set -e
cd "$(dirname "$0")"

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local cmd="$2"
  local expected="$3"  # "present" | "absent"

  local result
  if eval "$cmd" > /dev/null 2>&1; then
    result="present"
  else
    result="absent"
  fi

  if [ "$result" = "$expected" ]; then
    echo "  ✅ $label"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label (attendu=$expected, obtenu=$result)"
    FAIL=$((FAIL+1))
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo "  VERIFICATION STATIQUE FIXES iOS — Sprint Mobile V1"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─── J1 — platformService + Stripe iOS ───────────────────
echo "▶ J1 — platformService + Stripe iOS"
check "platformService.ts existe avec isIOSNative export" \
  "grep -q 'export const isIOSNative' src/services/platformService.ts" "present"
check "platformService.ts a canShowPaidCTA helper" \
  "grep -q 'canShowPaidCTA' src/services/platformService.ts" "present"
check "storageService.ts importe isIOSNative" \
  "grep -q \"from './platformService'\" src/services/storageService.ts" "present"
check "storageService.ts throw défensif Stripe iOS (checkout)" \
  "grep -A 5 'createStripeCheckoutSession' src/services/storageService.ts | grep -q 'isIOSNative'" "present"
check "storageService.ts throw défensif Stripe iOS (portal)" \
  "grep -A 5 'createPortalSession' src/services/storageService.ts | grep -q 'isIOSNative'" "present"
echo ""

# ─── J2 — Privacy Manifest + Google Sign-In ──────────────
echo "▶ J2 — Privacy Manifest + masquage Google iOS"
check "PrivacyInfo.xcprivacy existe" \
  "test -f ios/App/App/PrivacyInfo.xcprivacy" "present"
check "PrivacyInfo.xcprivacy déclare NSPrivacyTracking=false" \
  "grep -A 1 'NSPrivacyTracking</key>' ios/App/App/PrivacyInfo.xcprivacy | grep -q '<false/>'" "present"
check "PrivacyInfo.xcprivacy déclare NSPrivacyAccessedAPITypes (CA92.1)" \
  "grep -q 'CA92.1' ios/App/App/PrivacyInfo.xcprivacy" "present"
check "PrivacyInfo.xcprivacy n'a PAS Photos/Videos (remplacé par OtherUserContent)" \
  "grep -q 'NSPrivacyCollectedDataTypePhotosorVideos' ios/App/App/PrivacyInfo.xcprivacy" "absent"
check "PrivacyInfo.xcprivacy a OtherUserContent (avatar Google)" \
  "grep -q 'NSPrivacyCollectedDataTypeOtherUserContent' ios/App/App/PrivacyInfo.xcprivacy" "present"
check "AuthModal masque bouton Google en iOS" \
  "grep -B 5 'onClick={handleGoogleLogin}' src/components/AuthModal.tsx | grep -q '!isIOSNative'" "present"
echo ""

# ─── J2.5/J2.6 — 13 surfaces commerciales masquées iOS ───
echo "▶ J2.5/J2.6 — 13 surfaces commerciales masquées iOS"
check "PricingPage inline App.tsx:1335 a early return iOS" \
  "grep -A 15 'const PricingPage = ' src/App.tsx | grep -q 'isIOSNative'" "present"
check "LandingPage section TARIFS wrapée !isIOSNative" \
  "grep -B 1 'SECTION 8 — TARIFS' src/components/LandingPage.tsx > /dev/null; grep -A 50 'SECTION 8 — TARIFS' src/components/LandingPage.tsx | grep -q '!isIOSNative'" "present"
check "SharedSections PricingPreview retourne null iOS" \
  "grep -A 5 'PricingPreview' src/components/landing/SharedSections.tsx | grep -q 'isIOSNative'" "present"
check "App.tsx CTA 'Plans illimités — Premium' wrapé isIOSNative" \
  "grep -B 15 'Plans illimités — Premium' src/App.tsx | grep -q 'isIOSNative'" "present"
check "ProfilePage bouton portail Stripe masqué iOS" \
  "grep -B 1 'stripeCustomerId && !isIOSNative' src/components/ProfilePage.tsx > /dev/null" "present"
check "ProfilePage CTAs 'Passer Premium' wrapés !isIOSNative" \
  "grep -B 8 'Passer Premium' src/components/ProfilePage.tsx | grep -q '!isIOSNative'" "present"
check "ProfilePage CTAs 'Se réabonner Premium' wrapés !isIOSNative" \
  "grep -B 8 'Se réabonner Premium' src/components/ProfilePage.tsx | grep -q '!isIOSNative'" "present"
check "PlanView 5 CTAs 'Premium' wrapés !isIOSNative (compte ≥5)" \
  "test \$(grep -c '!isIOSNative' src/components/PlanView.tsx) -ge 5" "present"
check "PlanView banner Plan Unique upsell wrapé !isIOSNative" \
  "grep -B 1 'isPlanUniqueUser && !isIOSNative' src/components/PlanView.tsx > /dev/null" "present"
check "Layout menu nav 'Tarifs' wrapé isIOSNative" \
  "grep -B 1 -A 1 \"name: 'Tarifs'\" src/components/Layout.tsx | grep -q 'isIOSNative'" "present"
check "Layout footer 'Tarifs' wrapé !isIOSNative" \
  "grep -B 2 '\">Tarifs</Link></li>' src/components/Layout.tsx | grep -q '!isIOSNative'" "present"
check "ExerciseDetailDrawer CTA 'Débloquer Premium' wrapé iOS" \
  "grep -B 10 'Débloquer avec Premium' src/components/ExerciseDetailDrawer.tsx | grep -q 'isIOSNative'" "present"
check "LandingPage FAQ Q3 a _hideOnIOS marker" \
  "grep -q '_hideOnIOS' src/components/LandingPage.tsx" "present"
echo ""

# ─── J3 — Info.plist + routes vitrine + analytics ────────
echo "▶ J3 — Info.plist + routes vitrine + analytics iOS"
check "Info.plist a arm64 (pas armv7)" \
  "grep -A 2 'UIRequiredDeviceCapabilities' ios/App/App/Info.plist | grep -q 'arm64'" "present"
check "Info.plist n'a PAS armv7 (obsolète)" \
  "grep -A 2 'UIRequiredDeviceCapabilities' ios/App/App/Info.plist | grep -q 'armv7'" "absent"
check "Info.plist a ITSAppUsesNonExemptEncryption=false" \
  "grep -A 1 'ITSAppUsesNonExemptEncryption' ios/App/App/Info.plist | grep -q '<false/>'" "present"
check "Info.plist N'A PAS LSApplicationCategoryType (macOS only)" \
  "grep -q 'LSApplicationCategoryType' ios/App/App/Info.plist" "absent"
check "index.html Facebook Pixel wrappé !Capacitor.isNativePlatform" \
  "grep -B 15 \"fbq('init', '1434110431562090')\" index.html | grep -q 'Capacitor.isNativePlatform'" "present"
check "index.html Google Analytics wrappé !Capacitor.isNativePlatform" \
  "grep -B 5 'G-P0641L8TPT' index.html | grep -q 'Capacitor.isNativePlatform'" "present"
check "NativeOnlyRoute.tsx existe" \
  "test -f src/components/NativeOnlyRoute.tsx" "present"
check "NativeOnlyRoute utilise <Navigate replace />" \
  "grep -q 'Navigate to={redirect} replace' src/components/NativeOnlyRoute.tsx" "present"
check "App.tsx wrap 10 routes vitrine dans NativeOnlyRoute" \
  "test \$(grep -c '<NativeOnlyRoute redirect' src/App.tsx) -ge 10" "present"
echo ""

# ─── Récap ───────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo "  RECAP : $PASS PASS / $FAIL FAIL / $WARN WARN"
echo "═══════════════════════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "✅ TOUS LES FIXES iOS J1-J3 SONT EN PLACE DANS LE CODE."
  echo "→ Prochaine étape : test visuel simulateur (cf CHECKLIST-IOS-SIMULATEUR.md)"
  exit 0
else
  echo "❌ $FAIL fix(es) manquant(s). Voir les ❌ ci-dessus."
  exit 1
fi
