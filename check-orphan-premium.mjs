/**
 * Identifie les users avec plan COMPLET déployé mais isPremium=false ou stripeCustomerId vide.
 * → Détecte les paiements Stripe non synchronisés avec Firestore.
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
const users = await listAll('users');
const plans = await listAll('plans');
console.log(`Users: ${users.length}  •  Plans: ${plans.length}`);

// Plans avec ≥ 8 semaines déployées (= plan payant complet ou presque)
const deployedPlans = plans.filter(p => (p.weeks || []).length >= 8);
console.log(`Plans avec ≥8 semaines: ${deployedPlans.length}`);

// Map email → user
const userByEmail = {};
for (const u of users) {
  if (u.email) userByEmail[u.email.toLowerCase()] = u;
}

// Pour chaque plan complet : check user
const orphans = [];
for (const p of deployedPlans) {
  const email = (p.userEmail || '').toLowerCase();
  if (!email) continue;
  const u = userByEmail[email];
  if (!u) {
    orphans.push({ email, planId: p.id, weeks: p.weeks.length, issue: 'user introuvable', createdAt: p.createdAt });
    continue;
  }
  const hasStripe = !!u.stripeCustomerId;
  const prem = u.isPremium === true;
  const purchased = u.hasPurchasedPlan === true;
  if (!prem && !purchased) {
    orphans.push({
      email, planId: p.id, weeks: p.weeks.length, createdAt: p.createdAt,
      isPremium: u.isPremium, hasPurchasedPlan: u.hasPurchasedPlan,
      stripeCustomerId: u.stripeCustomerId || '(absent)',
      stripeStatus: u.stripeSubscriptionStatus || '(aucun)',
    });
  }
}

console.log(`\n🚨 PLANS ORPHELINS (déployés sans premium ni achat): ${orphans.length}\n`);
orphans.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
orphans.slice(0, 50).forEach(o => {
  console.log(`  ${o.createdAt?.substring(0,16) || '?'}  ${o.email.padEnd(40)} ${o.weeks} sem  isPremium=${o.isPremium}  stripeCustomerId=${o.stripeCustomerId}`);
});
if (orphans.length > 50) console.log(`  ... +${orphans.length-50} autres`);

writeFileSync('orphan-premium.json', JSON.stringify(orphans, null, 2));
console.log(`\n💾 Liste complète: orphan-premium.json`);
