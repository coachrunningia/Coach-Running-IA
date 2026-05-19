// Vérifie le statut Premium / Plan Unique des 76 users critiques
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const data = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/top-77-critiques.json', 'utf-8'));
const all = [...data.ambitieux, ...data.modeste];

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`  AUDIT PREMIUM/PAYANT des ${all.length} users critiques`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

const enriched = [];
const counts = { premium: 0, planUnique: 0, free: 0, deleted: 0 };

for (const a of all) {
  const userDoc = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${a.userId}`,
    { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  if (userDoc.status === 404) {
    counts.deleted++;
    enriched.push({ ...a, status: 'DELETED', isPremium: false, hasPurchasedPlan: false });
    continue;
  }
  const ud = await userDoc.json();
  const f = ud.fields || {};
  const isPremium = f.isPremium?.booleanValue === true;
  const hasPurchasedPlan = f.hasPurchasedPlan?.booleanValue === true;
  const stripeCustomerId = f.stripeCustomerId?.stringValue;
  const status = isPremium ? 'PREMIUM' : (hasPurchasedPlan ? 'PLAN_UNIQUE' : 'FREE');
  if (status === 'PREMIUM') counts.premium++;
  else if (status === 'PLAN_UNIQUE') counts.planUnique++;
  else counts.free++;
  enriched.push({ ...a, status, isPremium, hasPurchasedPlan, stripeCustomerId: stripeCustomerId || null });
}

console.log(`▶ Distribution des ${all.length} users critiques :`);
console.log(`  🔴 PREMIUM (abonnement actif) : ${counts.premium}`);
console.log(`  🟠 PLAN UNIQUE (achat unique) : ${counts.planUnique}`);
console.log(`  🟢 FREE (preview gratuit)    : ${counts.free}`);
console.log(`  ⚫ DELETED (compte supprimé) : ${counts.deleted}`);
console.log('');

const payants = enriched.filter(e => e.status === 'PREMIUM' || e.status === 'PLAN_UNIQUE');
console.log(`▶ ${payants.length} USERS PAYANTS AFFECTÉS — détail :`);
payants.sort((a, b) => Math.abs(b.gapSecPerKm) - Math.abs(a.gapSecPerKm));
for (const p of payants) {
  const cas = p.gapSecPerKm > 0 ? 'CAS 1 (ambitieux)' : 'CAS 2 (modeste)';
  console.log(`  [${p.status}] ${p.userEmail.padEnd(34)} ${p.distance.padEnd(14)} cible=${p.targetTime.padEnd(7)} → ${p.displayedPace} vs ${p.expectedPace} (${p.gapSecPerKm > 0 ? '+' : ''}${p.gapSecPerKm}s/km) ${cas}`);
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/76-plans-with-premium-status.json',
  JSON.stringify({ counts, enriched }, null, 2));
console.log(`\n✅ Détails dans 76-plans-with-premium-status.json`);
