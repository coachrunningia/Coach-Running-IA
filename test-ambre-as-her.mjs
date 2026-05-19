// Test de la chaîne Firestore en se loguant en tant qu'Ambre via Custom Token
// Requiert : serviceAccountKey.json dans le même dossier
import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';

const SERVICE_ACCOUNT_PATH = '/Users/romanemarino/Coach-Running-IA/serviceAccountKey.json';
const AMBRE_UID = 'qJzkzjA5E5cVm0uRxAtK57zWlKy2';

// 1. Check service account exists
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ serviceAccountKey.json introuvable :', SERVICE_ACCOUNT_PATH);
  console.error('Télécharge depuis Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

// 2. Init firebase-admin (server-side)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 3. Generate Custom Token for Ambre
console.log(`Génération Custom Token pour Ambre (uid=${AMBRE_UID})...`);
const customToken = await admin.auth().createCustomToken(AMBRE_UID);
console.log('✅ Custom Token généré (longueur:', customToken.length, ')');

// 4. Init firebase client SDK + sign in as Ambre
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDtJiZpRD7C4eLm9V8tZ8XdMs9oI6kKWXg',  // public anyway
  authDomain: 'coach-running-ia.firebaseapp.com',
  projectId: 'coach-running-ia',
};
// Try to load from .env
try {
  const envContent = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf-8');
  const apiKeyMatch = envContent.match(/VITE_FIREBASE_API_KEY\s*=\s*['"]?([^'"\n]+)/);
  if (apiKeyMatch) firebaseConfig.apiKey = apiKeyMatch[1];
} catch {}

const app = initializeApp(firebaseConfig);
const clientAuth = getAuth(app);
const db = getFirestore(app);

console.log('Sign in via Custom Token...');
const userCred = await signInWithCustomToken(clientAuth, customToken);
console.log('✅ Connecté en tant que', userCred.user.uid, '(', userCred.user.email || '(no email yet)', ')');

// 5. Tester la chaîne d'opérations
console.log('\n=== TEST CHAÎNE D\'OPÉRATIONS COMME AMBRE ===');

// 5a. Read user doc
try {
  const userDoc = await getDoc(doc(db, 'users', AMBRE_UID));
  console.log('✅ READ user doc:', userDoc.exists() ? 'exists' : 'NOT FOUND');
} catch (e) {
  console.log('❌ READ user doc ÉCHEC:', e.code, e.message);
}

// 5b. List plans
try {
  const q = query(collection(db, 'plans'), where('userId', '==', AMBRE_UID));
  const snap = await getDocs(q);
  console.log('✅ LIST plans:', snap.size, 'plans trouvés');
} catch (e) {
  console.log('❌ LIST plans ÉCHEC:', e.code, e.message);
}

// 5c. Tenter une écriture test plan (simulation savePlan)
const testPlanId = `test-${Date.now()}`;
const testPlan = {
  id: testPlanId,
  name: 'Test diagnostic Ambre',
  userId: AMBRE_UID,
  userEmail: 'painvin.ambre@yahoo.com',
  goal: 'Course sur route',
  distance: 'Semi-Marathon',
  durationWeeks: 17,
  createdAt: new Date().toISOString(),
  isPreview: true,
  fullPlanGenerated: false,
};
try {
  await setDoc(doc(db, 'plans', testPlanId), testPlan);
  console.log('✅ WRITE test plan: OK');
  // Nettoyage immédiat
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'plans', testPlanId));
  console.log('✅ DELETE test plan: nettoyé');
} catch (e) {
  console.log('❌ WRITE test plan ÉCHEC:', e.code, e.message);
}

// 5d. Tenter update du user doc (simulation saveUserQuestionnaire)
try {
  await setDoc(doc(db, 'users', AMBRE_UID), { _lastDiagnosticAt: serverTimestamp() }, { merge: true });
  console.log('✅ UPDATE user doc: OK');
} catch (e) {
  console.log('❌ UPDATE user doc ÉCHEC:', e.code, e.message);
}

// 5e. Tenter add generation_errors (simulation logger)
try {
  await addDoc(collection(db, 'generation_errors'), {
    source: 'diagnostic-test',
    userId: AMBRE_UID,
    userEmail: 'painvin.ambre@yahoo.com',
    errorMessage: 'TEST diagnostic - peut être supprimé',
    createdAt: serverTimestamp(),
  });
  console.log('✅ ADD generation_errors: OK');
} catch (e) {
  console.log('❌ ADD generation_errors ÉCHEC:', e.code, e.message);
}

console.log('\n=== FIN TEST ===');
console.log('Si tout OK → l\'auth Firestore d\'Ambre fonctionne correctement.');
console.log('Le bug serait alors dans le code JS du browser (cache, lib, etc.) — pas Firestore.');
process.exit(0);
