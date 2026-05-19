/**
 * Audit RÉEL des plans complets orphelins :
 * Pour chaque plan complet, lit le user EXACT (via plan.userId, pas via email)
 * et vérifie son isPremium. Distingue les vrais orphelins des faux positifs
 * (doublons d'UID où un autre user du même email est premium).
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

async function listAll(coll) {
  const all = [];
  let pageToken = null;
  while (true) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}?pageSize=300${pageToken?`&pageToken=${pageToken}`:''}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${access_token}` } });
    const j = await res.json();
    (j.documents || []).forEach(d => all.push({ id: d.name.split('/').pop(), ...pf(d.fields) }));
    pageToken = j.nextPageToken;
    if (!pageToken) break;
  }
  return all;
}

console.log('Chargement users + plans...');
const [users, plans] = await Promise.all([listAll('users'), listAll('plans')]);
console.log(`Users: ${users.length}  •  Plans: ${plans.length}`);

const userById = Object.fromEntries(users.map(u => [u.id, u]));
const userByEmail = {};
for (const u of users) {
  if (u.email) (userByEmail[u.email.toLowerCase()] = userByEmail[u.email.toLowerCase()] || []).push(u);
}

// Plans avec ≥8 semaines = plans complets
const deployedPlans = plans.filter(p => (p.weeks || []).length >= 8);
console.log(`\nPlans avec ≥8 semaines déployées: ${deployedPlans.length}\n`);

const categories = {
  legit: [],                 // plan.userId trouve un user isPremium=true OU hasPurchasedPlan=true
  trueOrphan: [],            // plan.userId trouve un user non-premium ET aucun autre user du même email n'est premium
  duplicateRescued: [],      // plan.userId trouve un user non-premium MAIS un autre user du même email est premium
  userMissing: [],           // plan.userId pointe vers un user qui n'existe pas
  adminTest: [],             // emails admin connus
};

const ADMIN_EMAILS = ['programme@coachrunningia.fr', 'marino.romane@gmail.com'];

for (const p of deployedPlans) {
  const email = (p.userEmail || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) { categories.adminTest.push(p); continue; }
  const u = userById[p.userId];
  if (!u) { categories.userMissing.push({ plan: p, otherUsers: userByEmail[email] || [] }); continue; }
  if (u.isPremium === true || u.hasPurchasedPlan === true) { categories.legit.push({ plan: p, user: u }); continue; }
  // Non-premium : check si un autre UID du même email est premium
  const same = (userByEmail[email] || []).filter(x => x.id !== u.id);
  const rescuer = same.find(x => x.isPremium === true || x.hasPurchasedPlan === true);
  if (rescuer) { categories.duplicateRescued.push({ plan: p, user: u, rescuer }); continue; }
  categories.trueOrphan.push({ plan: p, user: u, otherUsers: same });
}

console.log(`── RÉPARTITION ──`);
console.log(`✅ Plans LÉGITIMES (user lié au plan est premium): ${categories.legit.length}`);
console.log(`🔄 Doublons RÉCUPÉRÉS (user lié non-premium MAIS autre UID du même email l'est): ${categories.duplicateRescued.length}`);
console.log(`🔴 VRAIS ORPHELINS (user lié non-premium ET aucun doublon premium): ${categories.trueOrphan.length}`);
console.log(`❓ User pointé par plan introuvable: ${categories.userMissing.length}`);
console.log(`🟡 Plans admin (test): ${categories.adminTest.length}`);

console.log(`\n── DOUBLONS RÉCUPÉRÉS (${categories.duplicateRescued.length}) ──`);
categories.duplicateRescued.forEach(({ plan, user, rescuer }) => {
  console.log(`  ${plan.createdAt?.substring(0,16)}  ${plan.userEmail.padEnd(38)} planUser=${user.id.substring(0,12)}(${user.isPremium}) → rescuer=${rescuer.id.substring(0,12)}(${rescuer.isPremium})`);
});

console.log(`\n── VRAIS ORPHELINS (${categories.trueOrphan.length}) ──`);
categories.trueOrphan.forEach(({ plan, user, otherUsers }) => {
  const stripe = user.stripeCustomerId ? `stripe=${user.stripeCustomerId}` : 'no stripe';
  console.log(`  ${plan.createdAt?.substring(0,16)}  ${plan.userEmail.padEnd(38)} weeks=${plan.weeks.length} ${stripe} otherUIDs=${otherUsers.length}`);
});

console.log(`\n── USER MISSING (${categories.userMissing.length}) ──`);
categories.userMissing.forEach(({ plan, otherUsers }) => {
  console.log(`  ${plan.createdAt?.substring(0,16)}  ${plan.userEmail?.padEnd(38) || '?'} planUserId=${plan.userId} (introuvable) ; ${otherUsers.length} autres UIDs sur cet email`);
});

writeFileSync('audit-orphelins-correct.json', JSON.stringify(categories, null, 2));
console.log(`\n💾 Détails: audit-orphelins-correct.json`);
