// Test diagnostic Ambre via impersonation gcloud (pas de fichier service account local)
import { execSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';

const AMBRE_UID = 'qJzkzjA5E5cVm0uRxAtK57zWlKy2';
const SA_EMAIL = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT_ID = 'coach-running-ia';

// 1. Get gcloud access token IMPERSONNÉ du Service Account (signJwt restreint aux SA)
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA_EMAIL || 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com'}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
console.log('✅ Token impersonné du SA obtenu');

// 2. Construire les claims pour Custom Token Firebase
const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: SA_EMAIL,
  sub: SA_EMAIL,
  aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
  iat: now,
  exp: now + 3600,
  uid: AMBRE_UID,
};

// 3. Signer le JWT via iamcredentials.signJwt (impersonate service account)
console.log('Signature JWT via iamcredentials...');
const signResp = await fetch(
  `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA_EMAIL}:signJwt`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'x-goog-user-project': PROJECT_ID,
    },
    body: JSON.stringify({ payload: JSON.stringify(claims) }),
  }
);
const signJson = await signResp.json();
if (!signResp.ok) {
  console.error('❌ signJwt ÉCHEC:', signResp.status, JSON.stringify(signJson));
  process.exit(1);
}
const customToken = signJson.signedJwt;
console.log('✅ Custom Token signé (longueur:', customToken.length, ')');

// 4. Init Firebase client SDK et sign in
const envContent = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf-8');
const apiKey = envContent.match(/VITE_FIREBASE_API_KEY\s*=\s*['"]?([^'"\s]+)/)?.[1];
if (!apiKey) {
  console.error('❌ VITE_FIREBASE_API_KEY introuvable dans .env');
  process.exit(1);
}

const firebaseConfig = {
  apiKey,
  authDomain: 'coach-running-ia.firebaseapp.com',
  projectId: PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('Sign in en tant qu\'Ambre via Custom Token...');
const userCred = await signInWithCustomToken(auth, customToken);
console.log('✅ Connecté en tant que', userCred.user.uid);

// 5. Tests de la chaîne Firestore avec son auth
console.log('\n=== TESTS CHAÎNE FIRESTORE AVEC AUTH AMBRE ===\n');

// 5a. READ user doc
try {
  const userDoc = await getDoc(doc(db, 'users', AMBRE_UID));
  console.log('✅ READ users/' + AMBRE_UID + ': exists=' + userDoc.exists());
} catch (e) {
  console.log('❌ READ users ÉCHEC:', e.code, '-', e.message);
}

// 5b. LIST plans
try {
  const q = query(collection(db, 'plans'), where('userId', '==', AMBRE_UID));
  const snap = await getDocs(q);
  console.log('✅ LIST plans where userId=Ambre: ' + snap.size + ' plans');
} catch (e) {
  console.log('❌ LIST plans ÉCHEC:', e.code, '-', e.message);
}

// 5c. WRITE test plan (simulation savePlan)
const testPlanId = `test-diagnostic-${Date.now()}`;
const testPlan = {
  id: testPlanId,
  name: 'TEST DIAGNOSTIC (à supprimer)',
  userId: AMBRE_UID,
  userEmail: 'painvin.ambre@yahoo.com',
  goal: 'Course sur route',
  distance: 'Semi-Marathon',
  durationWeeks: 17,
  createdAt: new Date().toISOString(),
  startDate: '2026-05-18',
  isPreview: true,
  fullPlanGenerated: false,
};
try {
  await setDoc(doc(db, 'plans', testPlanId), testPlan);
  console.log('✅ WRITE test plan: OK (' + testPlanId + ')');
  await deleteDoc(doc(db, 'plans', testPlanId));
  console.log('✅ DELETE test plan: nettoyé');
} catch (e) {
  console.log('❌ WRITE/DELETE test plan ÉCHEC:', e.code, '-', e.message);
}

// 5d. UPDATE user doc (simulation saveUserQuestionnaire avec merge)
try {
  await setDoc(doc(db, 'users', AMBRE_UID), { _diagnosticTestAt: new Date().toISOString() }, { merge: true });
  console.log('✅ UPDATE users (merge): OK');
} catch (e) {
  console.log('❌ UPDATE users ÉCHEC:', e.code, '-', e.message);
}

// 5e. ADD generation_errors (simulation logger)
try {
  const ref = await addDoc(collection(db, 'generation_errors'), {
    source: 'diagnostic-impersonation-test',
    userId: AMBRE_UID,
    userEmail: 'painvin.ambre@yahoo.com',
    errorMessage: 'TEST diagnostic — à ignorer',
    createdAt: serverTimestamp(),
  });
  console.log('✅ ADD generation_errors: OK (' + ref.id + ')');
  await deleteDoc(ref);
  console.log('✅ DELETE generation_errors test: nettoyé');
} catch (e) {
  console.log('❌ ADD generation_errors ÉCHEC:', e.code, '-', e.message);
}

// 5f. Test specific : la suppression du champ Strava qu'on vient de faire — peut-elle être lue ?
try {
  const userDoc = await getDoc(doc(db, 'users', AMBRE_UID));
  const data = userDoc.data();
  console.log('\n--- Strava fields post-cleanup ---');
  console.log('  stravaConnected:', data.stravaConnected, '(typeof:', typeof data.stravaConnected, ')');
  console.log('  stravaToken:', data.stravaToken, '(typeof:', typeof data.stravaToken, ')');
  console.log('  lastStravaSync:', data.lastStravaSync, '(typeof:', typeof data.lastStravaSync, ')');
  console.log('  → Si tous undefined : cleanup réussi, plus de bombe `null`');
} catch (e) {
  console.log('❌ Read post-cleanup:', e.message);
}

console.log('\n=== FIN DIAGNOSTIC ===');
console.log('Si tout est OK ci-dessus, l\'auth Firestore d\'Ambre fonctionne PARFAITEMENT.');
console.log('Le bug serait alors côté browser (cache JS, version périmée) ou dans Gemini.');
process.exit(0);
