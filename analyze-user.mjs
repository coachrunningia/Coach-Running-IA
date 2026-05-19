// Analyse complète d'un user : Auth + Firestore + Plans + Erreurs
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const EMAIL = process.argv[2] || 'xbouche.clement.bc@gmail.com';

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`  ANALYSE USER : ${EMAIL}`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

// 1. Lookup Firebase Auth
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ email:[EMAIL] }) });
const lj = await lookup.json();
const user = lj.users?.[0];

if (!user) {
  console.log('❌ Aucun compte Firebase Auth pour cet email.');
  console.log('   → User jamais inscrit OU email mal orthographié.');
  process.exit(0);
}

console.log('▶ Firebase Auth');
console.log(`  UID: ${user.localId}`);
console.log(`  Email: ${user.email}`);
console.log(`  Nom: ${user.displayName || '(aucun)'}`);
console.log(`  Email vérifié: ${user.emailVerified ? '✅' : '❌'}`);
console.log(`  Providers: ${user.providerUserInfo?.map(p => p.providerId).join(', ') || '?'}`);
console.log(`  Créé: ${user.createdAt ? new Date(parseInt(user.createdAt)).toISOString() : '?'}`);
console.log(`  Dernière connexion: ${user.lastLoginAt ? new Date(parseInt(user.lastLoginAt)).toISOString() : '?'}`);
console.log(`  Dernière refresh: ${user.lastRefreshAt || '?'}`);

const uid = user.localId;

// 2. Doc Firestore users/{uid}
console.log('\n▶ Firestore users/');
const userDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
if (userDoc.status === 404) {
  console.log('  ❌ Pas de document Firestore (anomalie !)');
} else {
  const ud = await userDoc.json();
  const f = ud.fields || {};
  console.log(`  Premium: ${f.isPremium?.booleanValue ?? '?'}`);
  console.log(`  Plan unique acheté: ${f.hasPurchasedPlan?.booleanValue ?? '?'}`);
  console.log(`  Email vérifié (Firestore): ${f.emailVerified?.booleanValue ?? '?'}`);
  console.log(`  Plans count: ${f.plansCount?.integerValue ?? '?'}`);
  console.log(`  Stripe customer: ${f.stripeCustomerId?.stringValue || '(aucun)'}`);
  console.log(`  Strava: connected=${f.stravaConnected?.booleanValue ?? '?'}`);
  if (f.questionnaireData) {
    const q = f.questionnaireData.mapValue?.fields || {};
    console.log(`  Questionnaire:`);
    console.log(`    goal: ${q.goal?.stringValue || '?'}`);
    console.log(`    distance: ${q.distance?.stringValue || '?'}`);
    console.log(`    level: ${q.level?.stringValue || '?'}`);
    console.log(`    targetTime: ${q.targetTime?.stringValue || '?'}`);
    console.log(`    frequency: ${q.frequency?.integerValue ?? '?'}`);
    console.log(`    raceDate: ${q.raceDate?.stringValue || '?'}`);
    console.log(`    currentVolume: ${q.currentVolume?.integerValue ?? '?'}`);
    console.log(`    hasChrono: ${q.hasChrono?.booleanValue ?? '?'}`);
  }
}

// 3. Plans
console.log('\n▶ Plans Firestore');
const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const plans = (await plansResp.json()).filter(r => r.document);
console.log(`  Total: ${plans.length}`);
for (const p of plans) {
  const f = p.document.fields || {};
  const pid = p.document.name.split('/').pop();
  const w = f.weeks?.arrayValue?.values?.length || 0;
  const dist = f.distance?.stringValue || '?';
  const lvl = f.level?.stringValue || '?';
  const ca = f.createdAt?.stringValue || '?';
  const isPrev = f.isPreview?.booleanValue;
  const isFull = f.fullPlanGenerated?.booleanValue;
  const objective = f.objective?.stringValue || '?';
  console.log(`  - planId=${pid}`);
  console.log(`      distance=${dist} | niveau=${lvl} | objective=${objective}`);
  console.log(`      weeks=${w} | isPreview=${isPrev} | fullPlanGenerated=${isFull}`);
  console.log(`      createdAt=${ca.substring(0,19)}`);
}

// 4. Erreurs loggées
console.log('\n▶ Erreurs loggées (generation_errors)');
const errResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ structuredQuery: { from:[{collectionId:'generation_errors'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const errs = (await errResp.json()).filter(r => r.document);
console.log(`  Total: ${errs.length}`);
for (const e of errs) {
  const f = e.document.fields || {};
  const ts = f.createdAt?.timestampValue || '?';
  const msg = f.errorMessage?.stringValue || '?';
  const stack = (f.errorStack?.stringValue || '').substring(0,200);
  console.log(`  [${ts}] ${msg}`);
  console.log(`    stack: ${stack}`);
}

// 5. Tokens de vérification
console.log('\n▶ Tokens vérification email');
const tokResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ structuredQuery: { from:[{collectionId:'emailVerificationTokens'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const tokens = (await tokResp.json()).filter(r => r.document);
console.log(`  Total: ${tokens.length}`);
for (const t of tokens) {
  const f = t.document.fields || {};
  const used = f.used?.booleanValue;
  const created = f.createdAt?.timestampValue || '?';
  const usedAt = f.usedAt?.timestampValue || '(jamais)';
  console.log(`  - createdAt=${created.substring(0,19)} used=${used} usedAt=${usedAt.substring(0,19)}`);
}

// VERDICT
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  VERDICT');
console.log('═══════════════════════════════════════════════════════════════');
if (errs.length > 0) {
  console.log(`❌ ${errs.length} erreur(s) bloquante(s) — user victime du bug`);
}
if (plans.length === 0) {
  console.log(`❌ Aucun plan créé`);
} else {
  const hasFullPlan = plans.some(p => (p.document.fields.weeks?.arrayValue?.values?.length || 0) > 1);
  console.log(`${hasFullPlan ? '✅' : '⚠️'} Plan(s) créé(s): ${plans.length} | Plan complet: ${hasFullPlan ? 'oui' : 'preview seul'}`);
}
console.log(`${user.emailVerified ? '✅' : '❌'} Email vérifié`);
console.log(`${tokens.length > 0 ? '✅' : '❌'} Token(s) vérification: ${tokens.length}`);
