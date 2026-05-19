// Vérif détaillée romane.m2@hotmail.fr : abonnement actif ?
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/.env','utf-8').split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];
}));
const KEY = env.STRIPE_SECRET_KEY;

async function s(path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { 'Authorization': `Bearer ${KEY}` } });
  return await r.json();
}

// Customer
const cs = await s(`customers?email=romane.m2@hotmail.fr&limit=5`);
console.log('Customers:', cs.data.length);
for(const c of cs.data || []) {
  console.log(`  ${c.id} created ${new Date(c.created*1000).toISOString()}`);
  // subs
  const subs = await s(`subscriptions?customer=${c.id}&status=all&limit=10`);
  console.log(`  Subscriptions (${subs.data?.length || 0}):`);
  for(const sub of subs.data || []) {
    console.log(`    ${sub.id} | status=${sub.status} | cancel_at_period_end=${sub.cancel_at_period_end} | current_period_end=${sub.current_period_end ? new Date(sub.current_period_end*1000).toISOString() : 'n/a'} | canceled_at=${sub.canceled_at ? new Date(sub.canceled_at*1000).toISOString() : 'n/a'} | ended_at=${sub.ended_at ? new Date(sub.ended_at*1000).toISOString() : 'n/a'} | created=${new Date(sub.created*1000).toISOString()}`);
  }
}
