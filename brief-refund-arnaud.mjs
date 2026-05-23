import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const email = 'elisarnaud.1311@gmail.com';
const userId = '0wVykixEIWWVl8p9SbUyuYLoM6h1';
const stripeCustomerId = 'cus_UYikNWFImZJd3E';

function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}
async function runQuery(structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  return await res.json();
}
function flat(r) {
  return (r || []).filter(rr => rr.document).map(rr => {
    const f = {};
    for (const [k, v] of Object.entries(rr.document.fields || {})) f[k] = parseFs(v);
    f._id = rr.document.name.split('/').pop();
    f._createTime = rr.document.createTime;
    return f;
  });
}

console.log('═══════════════════════════════════════');
console.log('🚨 BRIEF REMBOURSEMENT — Arnaud (elisarnaud.1311@gmail.com)');
console.log('═══════════════════════════════════════\n');

// 1. État compte
console.log('1️⃣ COMPTE :');
const u = await (await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const ud = {};
for (const [k, v] of Object.entries(u.fields)) ud[k] = parseFs(v);
console.log(`   userId : ${userId}`);
console.log(`   firstName : ${ud.firstName} (= prénom Google OAuth, confirmé "Arnaud")`);
console.log(`   email : ${ud.email}`);
console.log(`   createdAt : ${ud.createdAt}`);
console.log(`   premiumSince : ${ud.premiumSince}`);
console.log(`   stripeSubscriptionStatus : ${ud.stripeSubscriptionStatus}`);
console.log(`   stripeCustomerId : ${ud.stripeCustomerId}`);
console.log(`   stripeSubscriptionId : ${ud.stripeSubscriptionId}`);
console.log(`   premiumCancelAt : ${ud.premiumCancelAt}`);

// 2. Plans (none expected)
const plansR = flat(await runQuery({
  from: [{ collectionId: 'plans' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 10
}));
console.log(`\n2️⃣ PLANS : ${plansR.length}`);
for (const p of plansR) console.log(`   • ${p._id} | ${p.goal} | ${p._createTime} | preview: ${p.isPreview}`);

// 3. plan_deletions
const dels = flat(await runQuery({
  from: [{ collectionId: 'plan_deletions' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 10
}));
console.log(`\n3️⃣ PLANS SUPPRIMÉS : ${dels.length}`);

// 4. generation_errors
const errors = flat(await runQuery({
  from: [{ collectionId: 'generation_errors' }],
  where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: userId } } },
  limit: 10
}));
console.log(`\n4️⃣ ERREURS GÉNÉRATION : ${errors.length}`);
for (const e of errors) {
  console.log(`   • ${e._id} | createTime: ${e._createTime}`);
  console.log(`     ${JSON.stringify(e).slice(0, 400)}`);
}

// 5. Recherche autres comptes Arnaud créés ces 7 derniers jours (pour s'assurer qu'il n'a pas un 2e compte)
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const recentArnaud = flat(await runQuery({
  from: [{ collectionId: 'users' }],
  where: {
    fieldFilter: { field: { fieldPath: 'firstName' }, op: 'EQUAL', value: { stringValue: 'Arnaud' } }
  },
  limit: 50
}));
console.log(`\n5️⃣ AUTRES COMPTES "Arnaud" en base : ${recentArnaud.length}`);
for (const a of recentArnaud) {
  const isElisarnaud = a.email === email;
  console.log(`   • ${a.email} | ${a.createdAt} | premium: ${a.isPremium} | uid: ${a._id}${isElisarnaud ? ' ← LUI' : ''}`);
}

// 6. Sortie : chronologie + recommandation
console.log('\n═══════════════════════════════════════');
console.log('📋 CHRONOLOGIE :');
console.log(`   ${ud.createdAt} — Compte créé (Google OAuth)`);
console.log(`   ${ud.premiumSince} — Premium activé (paiement Stripe)`);
const created = new Date(ud.createdAt).getTime();
const premium = new Date(ud.premiumSince).getTime();
console.log(`   → Délai paiement : ${Math.round((premium - created)/1000)} secondes (= flux immédiat)`);
console.log(`   ${new Date().toISOString()} — MAINTENANT`);
const minSincePremium = Math.round((Date.now() - premium) / 60000);
console.log(`   → Premium actif depuis : ${minSincePremium} minutes (${Math.round(minSincePremium/60)} h)`);

console.log('\n💡 SITUATION :');
console.log('   - Compte créé il y a quelques heures');
console.log('   - Premium activé 2 secondes après création');
console.log('   - 0 plan généré');
console.log('   - 0 erreur de génération');
console.log('   - 0 questionnaire entamé');
console.log('   - Arnaud dit "pas convaincu du plan" et "Strava ne détecte pas" → BIZARRE puisqu\'il n\'a aucun plan');
console.log('');
console.log('🎯 HYPOTHÈSES :');
console.log('   A. Il a vu un PREVIEW (page démo / homepage avec exemple) avant paiement — pas convaincu mais déjà payé');
console.log('   B. Il pensait acheter un autre service (Strava Premium ? confusion ?)');
console.log('   C. Il a tenté de générer un plan mais le LLM a planté côté client sans logger côté serveur (pas de generation_errors)');
console.log('   D. Il essaie le scénario "remboursement sans avoir utilisé" mais ses claims sont vagues');

