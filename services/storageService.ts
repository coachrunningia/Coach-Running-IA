
import { User, TrainingPlan, Session, QuestionnaireData } from '../types';
import { auth, db } from './firebase';
import { 
  signInAnonymously, 
  linkWithCredential, 
  EmailAuthProvider,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  sendPasswordResetEmail,
  deleteUser,
  User as FirebaseUser
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

export const ensureGuestUser = async (data: QuestionnaireData): Promise<User> => {
  let currentUser = auth.currentUser;
  
  if (!currentUser) {
    const userCredential = await signInAnonymously(auth);
    currentUser = userCredential.user;
  }

  const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
  const userData = {
    id: currentUser.uid,
    firstName: data.comments?.split(' ')[0] || "Coureur", // On essaie de deviner le prénom ou défaut
    email: data.email || null,
    createdAt: new Date().toISOString(),
    isPremium: false,
    isAnonymous: currentUser.isAnonymous,
    questionnaireData: cleanObject(data)
  };

  await setDoc(userRef, cleanObject(userData), { merge: true });
  return userData as User;
};

export const upgradeUserToPremium = async (userId: string) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, { isPremium: true });
  // On propage l'info sur les plans existants si nécessaire (optionnel)
};

export const observeAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
      onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            id: fbUser.uid,
            firstName: data.firstName || data.name || 'Coureur',
            email: fbUser.email || data.email || '',
            isPremium: data.isPremium || false,
            isAnonymous: fbUser.isAnonymous,
            questionnaireData: data.questionnaireData,
            photoURL: fbUser.photoURL || data.photoURL || undefined
          } as User);
        }
      });
    } else {
      callback(null);
    }
  });
};

// --- PLAN MANAGEMENT (Collection séparée) ---

export const savePlan = async (plan: TrainingPlan) => {
  const planRef = doc(db, PLANS_COLLECTION, plan.id);
  // On enrichit le plan avec l'email actuel pour le retrouver plus tard
  const enrichedPlan = {
    ...plan,
    userEmail: auth.currentUser?.email || plan.userEmail || null,
    searchEmail: (auth.currentUser?.email || plan.userEmail || '').toLowerCase()
  };
  await setDoc(planRef, cleanObject(enrichedPlan));
};

export const getUserPlans = async (userId: string): Promise<TrainingPlan[]> => {
  const q = query(
    collection(db, PLANS_COLLECTION), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as TrainingPlan);
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
  if (user.isPremium) return true;
  const plans = await getUserPlans(user.id);
  return plans.length === 0; // 1 seul plan gratuit
};

export const updateSessionFeedback = async (planId: string, updatedSession: Session, userId: string) => {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef);
  if (planSnap.exists()) {
    const plan = planSnap.data() as TrainingPlan;
    const updatedWeeks = plan.weeks.map(w => ({
      ...w,
      sessions: w.sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
    }));
    await updateDoc(planRef, { weeks: updatedWeeks });
  }
};

// --- AUTH ACTIONS ---

// Fix: Implement missing registerUser export for AuthModal
export const registerUser = async (firstName: string, email: string, password: string): Promise<User | null> => {
  const currentUser = auth.currentUser;
  
  if (currentUser && currentUser.isAnonymous) {
    // Link anonymous user with email/password credential
    const credential = EmailAuthProvider.credential(email, password);
    const userCredential = await linkWithCredential(currentUser, credential);
    const fbUser = userCredential.user;
    await updateProfile(fbUser, { displayName: firstName });
    
    const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
    await updateDoc(userRef, { 
      firstName, 
      email, 
      isAnonymous: false 
    });
    
    return {
      id: fbUser.uid,
      firstName,
      email: fbUser.email || email,
      createdAt: new Date().toISOString(),
      isPremium: false,
      isAnonymous: false
    };
  } else {
    // Standard registration flow
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;
    await updateProfile(fbUser, { displayName: firstName });
    await sendEmailVerification(fbUser);
    
    const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
    const userData = {
      id: fbUser.uid,
      firstName,
      email,
      createdAt: new Date().toISOString(),
      isPremium: false,
      isAnonymous: false
    };
    await setDoc(userRef, userData);
    
    // Returning null tells UI to show verification sent screen
    return null; 
  }
};

// Fix: Implement missing loginWithGoogle export for AuthModal
export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const currentUser = auth.currentUser;
  
  let fbUser;
  if (currentUser && currentUser.isAnonymous) {
    const userCredential = await linkWithPopup(currentUser, provider);
    fbUser = userCredential.user;
  } else {
    const userCredential = await signInWithPopup(auth, provider);
    fbUser = userCredential.user;
  }
  
  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const snap = await getDoc(userRef);
  
  let userData;
  if (snap.exists()) {
    userData = snap.data() as User;
    if (userData.isAnonymous) {
      await updateDoc(userRef, { isAnonymous: false, email: fbUser.email });
      userData.isAnonymous = false;
      userData.email = fbUser.email || '';
    }
  } else {
    userData = {
      id: fbUser.uid,
      firstName: fbUser.displayName?.split(' ')[0] || 'Coureur',
      email: fbUser.email || '',
      createdAt: new Date().toISOString(),
      isPremium: false,
      isAnonymous: false,
      photoURL: fbUser.photoURL || undefined
    };
    await setDoc(userRef, userData);
  }
  
  return userData as User;
};

// Fix: Implement missing resetPassword export for AuthModal
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Fix: loginUser now fetches user data from Firestore to return the custom User type instead of just Firebase User
export const loginUser = async (email: string, password: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = cred.user;
  const userRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const snap = await getDoc(userRef);
  
  if (snap.exists()) {
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
export const createStripeCheckoutSession = async (priceId: string) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("Veuillez créer un compte avant de vous abonner.");
  
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId,
      userId: user.uid,
      userEmail: user.email,
      successUrl: window.location.origin + '/#/dashboard?payment_success=true',
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
  
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.uid,
      returnUrl: window.location.origin + '/#/profile',
    }),
  });
  
  const data = await response.json();
  if (data.url) window.location.assign(data.url);
  else throw new Error(data.error || "Erreur portail");
};
