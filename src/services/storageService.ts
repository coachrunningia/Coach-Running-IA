
import { User, TrainingPlan, Session, QuestionnaireData } from '../types';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

const PLANS_COLLECTION = 'plans';
const USERS_COLLECTION = 'users';

const cleanObject = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(item => cleanObject(item)).filter(i => i !== null);
  if (typeof obj !== 'object') return obj;
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      cleaned[key] = cleanObject(val);
    }
  });
  return cleaned;
};

// --- USER MANAGEMENT ---

export const upgradeUserToPremium = async (userId: string) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  // Utiliser setDoc avec merge pour éviter l'erreur si le document n'existe pas encore
  await setDoc(userRef, { isPremium: true }, { merge: true });
  console.log('[upgradeUserToPremium] User marked as Premium in Firestore');
};

export const observeAuthState = (callback: (user: User | null) => void) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let lastVerifiedUserId: string | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
    // Nettoyer l'ancien listener Firestore si existe
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (fbUser) {
      const userRef = doc(db, USERS_COLLECTION, fbUser.uid);

      // Trigger Stripe verification on first load for non-anonymous users
      // This runs once per user session to sync subscription status
      if (!fbUser.isAnonymous && lastVerifiedUserId !== fbUser.uid) {
        lastVerifiedUserId = fbUser.uid;
        // Fire and forget - don't block the UI, Firestore will update via onSnapshot
        verifySubscriptionStatusInBackground(fbUser.uid);
      }

      unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            id: fbUser.uid,
            firstName: data.firstName || data.name || 'Coureur',
            email: fbUser.email || data.email || '',
            isPremium: data.isPremium || false,
            isAdmin: data.isAdmin || false,
            isAnonymous: fbUser.isAnonymous,
            questionnaireData: data.questionnaireData,
            photoURL: fbUser.photoURL || data.photoURL || undefined,
            stravaConnected: data.stravaConnected || false,
            stripeCustomerId: data.stripeCustomerId || undefined,
            stripeSubscriptionStatus: data.stripeSubscriptionStatus || undefined,
            premiumCancelAt: data.premiumCancelAt || undefined,
            premiumCancelledAt: data.premiumCancelledAt || undefined
          } as User);
        } else {
          // Document Firestore n'existe pas encore, retourner un user minimal
          callback({
            id: fbUser.uid,
            firstName: fbUser.displayName?.split(' ')[0] || 'Coureur',
            email: fbUser.email || '',
            isPremium: false,
            isAnonymous: fbUser.isAnonymous,
            photoURL: fbUser.photoURL || undefined
          } as User);
        }
      });
    } else {
      lastVerifiedUserId = null;
      callback(null);
    }
  });

  // Retourner une fonction qui nettoie les deux listeners
  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

// Background verification helper - doesn't block UI
// Optimisation: Cache localStorage pour éviter les appels Stripe répétés (1 vérification/24h max)
const STRIPE_CACHE_KEY = 'stripe_verification_cache';
const STRIPE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures

const getStripeCache = (userId: string): { isPremium: boolean; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(`${STRIPE_CACHE_KEY}_${userId}`);
    if (!cached) return null;
    const data = JSON.parse(cached);
    // Vérifier si le cache est encore valide
    if (Date.now() - data.timestamp < STRIPE_CACHE_DURATION_MS) {
      return data;
    }
    // Cache expiré, le supprimer
    localStorage.removeItem(`${STRIPE_CACHE_KEY}_${userId}`);
    return null;
  } catch {
    return null;
  }
};

const setStripeCache = (userId: string, isPremium: boolean) => {
  try {
    localStorage.setItem(`${STRIPE_CACHE_KEY}_${userId}`, JSON.stringify({
      isPremium,
      timestamp: Date.now()
    }));
  } catch {
    // Silent fail si localStorage non disponible
  }
};

const verifySubscriptionStatusInBackground = async (userId: string) => {
  // Vérifier le cache d'abord
  const cached = getStripeCache(userId);
  if (cached) {
    console.log(`[Auth] Using cached subscription status: isPremium=${cached.isPremium}`);
    return;
  }

  try {
    const response = await fetch('/api/verify-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Auth] Subscription verified: isPremium=${data.isPremium}, status=${data.status}`);
      // Mettre en cache le résultat
      setStripeCache(userId, data.isPremium);
    }
  } catch (error) {
    // Silent fail - Firestore listener will use cached data
    console.warn('[Auth] Background subscription verification failed:', error);
  }
};

// --- PLAN MANAGEMENT (Collection séparée) ---

export const savePlan = async (plan: TrainingPlan) => {
  try {
    console.log('[savePlan] Saving plan:', plan.id, 'for userId:', plan.userId);
    const planRef = doc(db, PLANS_COLLECTION, plan.id);
    await setDoc(planRef, cleanObject(plan));
    console.log('[savePlan] Plan saved successfully:', plan.id);
  } catch (error: any) {
    console.error('[savePlan] Error saving plan:', error.code, error.message);
    throw error;
  }
};

export const getUserPlans = async (userId: string): Promise<TrainingPlan[]> => {
  console.log('[getUserPlans] Fetching plans for userId:', userId);
  try {
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const plans = snap.docs.map(d => ({ ...d.data(), id: d.id } as TrainingPlan));
    console.log('[getUserPlans] Found', plans.length, 'plan(s)');
    return plans;
  } catch (error) {
    console.error('[getUserPlans] Error:', error);
    return [];
  }
};

export const getPlanById = async (planId: string, userId: string): Promise<TrainingPlan | null> => {
  const docRef = doc(db, PLANS_COLLECTION, planId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as TrainingPlan;
    // Sécurité simple : vérifier userId OU email si on veut être flexible
    return data;
  }
  return null;
};

export const checkCanGeneratePlan = async (user: User): Promise<boolean> => {
  // First check the passed user object
  if (user.isPremium) return true;

  // Double-check Firestore directly in case state is stale
  const userRef = doc(db, USERS_COLLECTION, user.id);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.isPremium) {
      console.log('[checkCanGeneratePlan] User is Premium in Firestore (state was stale)');
      return true;
    }
  }

  // Not premium, check plan count
  const plans = await getUserPlans(user.id);
  return plans.length === 0; // 1 seul plan gratuit
};

export const updateSessionFeedback = async (planId: string, updatedSession: Session, userId: string, weekNumber: number) => {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef);
  if (planSnap.exists()) {
    const plan = planSnap.data() as TrainingPlan;

    // Helper to match sessions: prefer ID, fallback to composite key (day + title)
    const sessionsMatch = (s1: Session, s2: Session): boolean => {
      // If both have valid IDs, compare by ID
      if (s1.id && s2.id && s1.id !== '' && s2.id !== '') {
        return s1.id === s2.id;
      }
      // Fallback: match by day + title (should be unique within a week)
      return s1.day === s2.day && s1.title === s2.title;
    };

    // Only update the specific week to avoid cross-week conflicts
    const updatedWeeks = plan.weeks.map(w => {
      if (w.weekNumber !== weekNumber) return w;
      return {
        ...w,
        sessions: w.sessions.map(s => sessionsMatch(s, updatedSession) ? updatedSession : s)
      };
    });
    await updateDoc(planRef, { weeks: updatedWeeks });
  }
};

// ============================================
// GESTION DES ADAPTATIONS (LIMITE 2/SEMAINE)
// ============================================

/**
 * Vérifie si une adaptation est encore possible cette semaine
 * Retourne { canAdapt, remaining, reason }
 */
export const checkAdaptationLimit = async (
  planId: string,
  weekNumber: number
): Promise<{ canAdapt: boolean; remaining: number; reason?: string }> => {
  const MAX_ADAPTATIONS_PER_WEEK = 2;

  const planRef = doc(db, PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef);

  if (!planSnap.exists()) {
    return { canAdapt: false, remaining: 0, reason: 'Plan introuvable' };
  }

  const plan = planSnap.data() as TrainingPlan;
  const adaptationLog = plan.adaptationLog || {
    weekNumber: 0,
    adaptationsThisWeek: 0,
    adaptationHistory: []
  };

  // Reset compteur si on change de semaine
  if (adaptationLog.weekNumber !== weekNumber) {
    return { canAdapt: true, remaining: MAX_ADAPTATIONS_PER_WEEK };
  }

  const remaining = MAX_ADAPTATIONS_PER_WEEK - adaptationLog.adaptationsThisWeek;
  const canAdapt = remaining > 0;

  return {
    canAdapt,
    remaining,
    reason: canAdapt ? undefined : `Tu as déjà utilisé tes ${MAX_ADAPTATIONS_PER_WEEK} adaptations cette semaine. Reprends l'entraînement prévu et adapte la semaine prochaine si besoin.`
  };
};

/**
 * Enregistre une adaptation effectuée
 */
export const logAdaptation = async (
  planId: string,
  weekNumber: number,
  sessionId: string,
  reason: string,
  changes: string
): Promise<void> => {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef);

  if (!planSnap.exists()) return;

  const plan = planSnap.data() as TrainingPlan;
  let adaptationLog = plan.adaptationLog || {
    weekNumber: 0,
    adaptationsThisWeek: 0,
    adaptationHistory: []
  };

  // Reset si nouvelle semaine
  if (adaptationLog.weekNumber !== weekNumber) {
    adaptationLog = {
      weekNumber,
      adaptationsThisWeek: 0,
      adaptationHistory: adaptationLog.adaptationHistory || []
    };
  }

  // Incrémenter et enregistrer
  adaptationLog.adaptationsThisWeek += 1;
  adaptationLog.lastAdaptationDate = new Date().toISOString();
  adaptationLog.adaptationHistory.push({
    date: new Date().toISOString(),
    sessionId,
    reason,
    changes
  });

  await updateDoc(planRef, { adaptationLog });
  console.log(`[Adaptation] Semaine ${weekNumber}: ${adaptationLog.adaptationsThisWeek}/2 utilisées`);
};

// --- AUTH ACTIONS ---

// Helper to register contact in Brevo (fire and forget)
const registerBrevoContact = async (email: string, firstName: string) => {
  try {
    await fetch('/api/brevo/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName }),
    });
    console.log('[Brevo] Contact registered:', email);
  } catch (error) {
    // Silent fail - Brevo registration is not critical
    console.warn('[Brevo] Registration failed:', error);
  }
};

// Inscription d'un nouvel utilisateur (compte non vérifié)
// Retourne l'utilisateur créé (email non vérifié)
export const registerUser = async (
  firstName: string,
  email: string,
  password: string,
  questionnaireData?: QuestionnaireData
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = userCredential.user;
  await updateProfile(fbUser, { displayName: firstName });

  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const userData: User = {
    id: fbUser.uid,
    firstName,
    email,
    createdAt: new Date().toISOString(),
    isPremium: false,
    isAnonymous: false,
    questionnaireData: questionnaireData ? cleanObject(questionnaireData) : undefined
  };
  await setDoc(userRef, cleanObject(userData));

  // Register in Brevo (non-blocking)
  registerBrevoContact(email, firstName);

  console.log('[Auth] User registered:', fbUser.uid);
  return userData;
};

// Connexion avec Google
export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const fbUser = userCredential.user;

  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const snap = await getDoc(userRef);

  let userData: User;
  if (snap.exists()) {
    userData = snap.data() as User;
  } else {
    // Nouveau compte Google
    userData = {
      id: fbUser.uid,
      firstName: fbUser.displayName?.split(' ')[0] || 'Coureur',
      email: fbUser.email || '',
      createdAt: new Date().toISOString(),
      isPremium: false,
      isAnonymous: false,
      photoURL: fbUser.photoURL || undefined
    };
    await setDoc(userRef, cleanObject(userData));

    // Register new Google user in Brevo (non-blocking)
    if (fbUser.email) {
      registerBrevoContact(fbUser.email, userData.firstName);
    }
  }

  console.log('[Auth] Google login successful:', fbUser.uid);
  return userData;
};

// Réinitialisation du mot de passe
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Connexion avec email/password
export const loginUser = async (email: string, password: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = cred.user;

  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    console.log('[Auth] Login successful:', fbUser.uid);
    return snap.data() as User;
  } else {
    // Fallback profile if Firestore data is missing
    return {
      id: fbUser.uid,
      firstName: fbUser.displayName?.split(' ')[0] || 'Coureur',
      email: fbUser.email || email,
      createdAt: new Date().toISOString(),
      isPremium: false,
      isAnonymous: false
    };
  }
};

export const logoutUser = async () => await signOut(auth);

// --- PROFILE ACTIONS ---

// Fix: Implement missing updateUserProfile export for ProfilePage
export const updateUserProfile = async (firstName: string, photoURL?: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");
  
  await updateProfile(user, { 
    displayName: firstName,
    photoURL: photoURL 
  });
  
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await updateDoc(userRef, { firstName, photoURL });
};

// Fix: Implement missing deleteUserAccount export for ProfilePage
export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");
  await deleteUser(user);
};

export const saveUserQuestionnaire = async (userId: string, data: QuestionnaireData) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, { questionnaireData: cleanObject(data), email: data.email || null });
};

// --- STRIPE ---

// Verify subscription status with Stripe API (called on auth state change)
export const verifySubscriptionStatus = async (userId: string): Promise<{
  isPremium: boolean;
  status: string;
  cancelAt: string | null;
}> => {
  try {
    const response = await fetch('/api/verify-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.warn('[verifySubscriptionStatus] API error:', response.status);
      return { isPremium: false, status: 'error', cancelAt: null };
    }

    const data = await response.json();
    return {
      isPremium: data.isPremium || false,
      status: data.status || 'unknown',
      cancelAt: data.cancelAt || null,
    };
  } catch (error) {
    console.error('[verifySubscriptionStatus] Error:', error);
    return { isPremium: false, status: 'error', cancelAt: null };
  }
};

// Invalider le cache Stripe (appelé après paiement ou modification d'abonnement)
export const invalidateStripeCache = (userId?: string) => {
  const uid = userId || auth.currentUser?.uid;
  if (uid) {
    localStorage.removeItem(`${STRIPE_CACHE_KEY}_${uid}`);
    console.log('[Auth] Stripe cache invalidated for user:', uid);
  }
};

export const createStripeCheckoutSession = async (priceId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Veuillez créer un compte avant de vous abonner.");

  // Invalider le cache avant de rediriger vers Stripe
  invalidateStripeCache(user.uid);

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId,
      userId: user.uid,
      userEmail: user.email,
      successUrl: window.location.origin + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: window.location.origin + '/#/pricing',
    }),
  });
  const data = await response.json();
  if (data.url) window.location.assign(data.url);
};

// Fix: Implement missing createPortalSession export for ProfilePage
export const createPortalSession = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Non authentifié");

  // Fetch stripeCustomerId from Firestore client-side to avoid Firebase Admin dependency on server
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userSnap = await getDoc(userRef);
  const stripeCustomerId = userSnap.exists() ? userSnap.data().stripeCustomerId : null;

  if (!stripeCustomerId) {
    throw new Error("Aucun abonnement Stripe trouvé. Veuillez d'abord souscrire un abonnement.");
  }

  // Invalider le cache car l'utilisateur peut modifier son abonnement dans le portail
  invalidateStripeCache(user.uid);

  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.uid,
      stripeCustomerId,
      returnUrl: window.location.origin + '/#/profile',
    }),
  });

  const data = await response.json();
  if (data.url) window.location.assign(data.url);
  else throw new Error(data.error || "Erreur portail");
};

// ============================================
// EMAIL VERIFICATION TOKEN (Client-side)
// ============================================

// Generate a unique token
function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create and store verification token in Firestore (client-side)
export const createEmailVerificationToken = async (
  userId: string,
  email: string,
  planId?: string
): Promise<string> => {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const tokenRef = doc(db, 'emailVerificationTokens', token);
  await setDoc(tokenRef, {
    userId,
    email: email.toLowerCase(),
    planId: planId || null,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  });

  console.log('[createEmailVerificationToken] Token created for', email);
  return token;
};

// ============================================
// STRAVA TOKEN STORAGE (Client-side)
// ============================================

export interface StravaTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: string;
  athlete_name?: string;
}

// Save Strava tokens to Firestore (client-side)
export const saveStravaTokens = async (
  userId: string,
  tokenData: StravaTokenData
): Promise<void> => {
  console.log('[saveStravaTokens] Starting save for user:', userId);
  console.log('[saveStravaTokens] Token data received:', {
    access_token: tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'missing',
    refresh_token: tokenData.refresh_token ? 'present' : 'missing',
    expires_at: tokenData.expires_at,
    athlete_id: tokenData.athlete_id,
    athlete_name: tokenData.athlete_name
  });

  const userRef = doc(db, USERS_COLLECTION, userId);

  const updateData = {
    stravaConnected: true,
    stravaToken: {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      athlete: {
        id: tokenData.athlete_id,
        firstname: tokenData.athlete_name || ''
      }
    },
    lastStravaSync: new Date().toISOString()
  };

  console.log('[saveStravaTokens] Writing to Firestore...');

  // Use setDoc with merge to be more robust (works even if some fields are missing)
  await setDoc(userRef, updateData, { merge: true });

  console.log('[saveStravaTokens] Strava tokens saved successfully for user:', userId);
};

// Disconnect Strava
export const disconnectStrava = async (userId: string): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);

  await updateDoc(userRef, {
    stravaConnected: false,
    stravaToken: null,
    lastStravaSync: null
  });

  console.log('[disconnectStrava] Strava disconnected for user:', userId);
};
