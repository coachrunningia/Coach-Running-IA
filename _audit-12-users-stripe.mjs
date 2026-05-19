// Pour chacun des 12 users hasPurchasedPlan=true & isPremium=false, vérifier Stripe : était-ce un Plan Unique ?
import fs from 'fs';
import { execSync } from 'child_process';
const env = Object.fromEntries(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/.env','utf-8').split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];
}));
const KEY = env.STRIPE_SECRET_KEY;
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();

async function stripeGet(path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { 'Authorization': `Bearer ${KEY}` } });
  return await r.json();
}

const users = [
  { uid: '2DldgCWEighgoLu66BD7zBXGLAP2', email: 'chapeaujean@yahoo.fr' },
  { uid: '5EFODYO5y2RTY9csZEwWtMQEP8p1', email: 'theosutter57@gmail.cim' },
  { uid: '6ibD7v1ziseYwVxiezMtrN1Nrou2', email: 'ghtdcd@laposte.net' },
  { uid: 'UTG9ouiSQuc4k5vIsVfodpgRMqt1', email: 'harnois.camille@hotmail.fr' },
  { uid: 'XiDADS9sORS1lU4Uji35zfqUwQ13', email: 'perarnau.g@gmail.com' },
  { uid: 'Y4HmO2zVhGOCDnGOHXukpZTwjVI3', email: 'sarah.lefrancq@yahoo.com' },
  { uid: 'dkik88CWTqdyQ8xMsHb0B3SIMAP2', email: 'patrick.cadours@hotmail.fr' },
  { uid: 'j6XTuwVzShbQMcMhW1RorVmGkrI3', email: 'lsautjeau@gmail.com' },
  { uid: 'lPoXg6nOrJeptrOB1w7lpAMnhs63', email: 'guillaumepoettoz@gmail.com' },
  { uid: 'nMH83IjgsYZY24QYWyijuIjyoH33', email: 'thomas.weill.pro@gmail.com' },
  { uid: 'p4dDVDJpuVfZkBku9iR2oQJzFn93', email: 'romane.m2@hotmail.fr' },
  { uid: 'sZCQwo8H6ichsu2W4TyFW2TosJ92', email: 'mhbrx06@gmail.com' },
];

for(const u of users) {
  // Chercher checkout session via search avec client_reference_id n'est pas supporté, on utilise list + filtre,
  // mais l'API list ne filtre pas non plus là-dessus. On utilise donc une fenêtre temporelle.
  // Plus simple : on cherche par customer_email
  const url = `checkout/sessions?customer_details[email]=${encodeURIComponent(u.email)}&limit=10`;
  // L'API list de checkout sessions ne supporte pas filter par email. On va tenter via Search.
  // Stripe Search ne supporte pas customer_email mais on peut faire via PaymentIntents.
  // Strategie : liste checkout sessions, filter par email
  // Plutôt : on liste les sessions sur 60 jours et on filtre côté code.
}

// Plus efficace : on liste TOUTES les checkout sessions des 90 derniers jours via pagination
const since = Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000);
let allSessions = [];
let starting_after = null;
while(true) {
  let url = `checkout/sessions?limit=100&created[gte]=${since}`;
  if(starting_after) url += `&starting_after=${starting_after}`;
  const r = await stripeGet(url);
  if(r.error) { console.log('ERR list', r.error.message); break; }
  allSessions.push(...(r.data || []));
  if(r.has_more) starting_after = r.data[r.data.length - 1].id;
  else break;
}
console.log(`Sessions totales sur 90j : ${allSessions.length}`);

const userIds = new Set(users.map(u => u.uid));
const userEmails = new Set(users.map(u => u.email.toLowerCase()));
const matched = allSessions.filter(s => {
  const ref = s.client_reference_id;
  const em = (s.customer_email || '').toLowerCase();
  return (ref && userIds.has(ref)) || userEmails.has(em);
});
console.log(`Sessions correspondant aux 12 users : ${matched.length}`);

for(const u of users) {
  const sessions = matched.filter(s =>
    s.client_reference_id === u.uid ||
    (s.customer_email || '').toLowerCase() === u.email.toLowerCase()
  );
  console.log(`\n${u.email} (${u.uid}) :`);
  if(sessions.length === 0) { console.log('  PAS DE SESSION TROUVÉE STRIPE'); continue; }
  for(const s of sessions) {
    console.log(`  ${s.id} | mode=${s.mode} | status=${s.status} | paid=${s.payment_status} | amount=${s.amount_total} | created=${new Date(s.created*1000).toISOString()} | purchaseType=${s.metadata?.purchaseType}`);
  }
}
