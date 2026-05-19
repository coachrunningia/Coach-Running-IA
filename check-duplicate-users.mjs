/**
 * Vérifie le doublon d'user pour deugnilson + cherche le pattern global :
 * doublons d'users (même email, plusieurs UID) qui expliquent les webhooks orphelins.
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

// 1. Doc user "ghost" du webhook
const ghostId = 'OWf2mFic4nUYfEn24HNLaKZOVGJ3';
const realId = '1rb3mwtLptOdjrD4M6i4cxfAFi72';

for (const id of [ghostId, realId]) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const d = await r.json();
  console.log(`\n── User ${id} ──`);
  if (d.fields) {
    const data = pf(d.fields);
    console.log(`  email:            ${data.email}`);
    console.log(`  createdAt:        ${data.createdAt}`);
    console.log(`  isPremium:        ${data.isPremium}`);
    console.log(`  stripeCustomerId: ${data.stripeCustomerId || '(absent)'}`);
    console.log(`  stripeSubscriptionId: ${data.stripeSubscriptionId || '(absent)'}`);
    console.log(`  stripeSubscriptionStatus: ${data.stripeSubscriptionStatus || '(absent)'}`);
    console.log(`  premiumSince:     ${data.premiumSince || '(absent)'}`);
    console.log(`  firstName:        ${data.firstName || '(absent)'}`);
  } else {
    console.log(`  ❌ Doc introuvable: ${JSON.stringify(d).slice(0,200)}`);
  }
}

// 2. Pattern global : combien de users en doublon par email ?
console.log('\n\n── PATTERN GLOBAL DOUBLON USERS ──');
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

const users = await listAll('users');
console.log(`Total users: ${users.length}`);
const byEmail = {};
for (const u of users) {
  if (!u.email) continue;
  const k = u.email.toLowerCase();
  (byEmail[k] = byEmail[k] || []).push(u);
}
const duplicates = Object.entries(byEmail).filter(([_, list]) => list.length > 1);
console.log(`Emails avec plusieurs UIDs: ${duplicates.length}\n`);
duplicates.slice(0, 30).forEach(([email, list]) => {
  console.log(`  ${email} (${list.length} UIDs):`);
  list.forEach(u => {
    const stripe = u.stripeCustomerId ? `stripeCustomer=${u.stripeCustomerId}` : 'no stripe';
    console.log(`    - ${u.id}  isPremium=${u.isPremium}  ${stripe}  createdAt=${u.createdAt?.substring(0,16) || '?'}`);
  });
});
if (duplicates.length > 30) console.log(`  ... +${duplicates.length-30} autres`);

writeFileSync('duplicate-users.json', JSON.stringify(duplicates, null, 2));
console.log(`\n💾 duplicate-users.json`);
