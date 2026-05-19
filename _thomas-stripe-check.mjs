// Vérif Stripe API : qu'a réellement payé Thomas ?
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/.env','utf-8').split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];
}));
const KEY = env.STRIPE_SECRET_KEY;
if(!KEY) { console.log('Pas de STRIPE_SECRET_KEY'); process.exit(1); }

async function stripe(path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${KEY}` }
  });
  return await r.json();
}

// 1) Recherche customer par email
console.log('=== Customers Stripe pour thomas.weill.pro@gmail.com ===');
const customers = await stripe('customers?email=thomas.weill.pro@gmail.com&limit=10');
if(customers.error) { console.log('ERR', customers.error); process.exit(1); }
console.log(`${customers.data.length} customer(s) trouvé(s)`);
for(const c of customers.data) {
  console.log(JSON.stringify({
    id: c.id,
    email: c.email,
    created: new Date(c.created * 1000).toISOString(),
    description: c.description,
    metadata: c.metadata,
  }, null, 2));
}

// 2) Recherche des checkout sessions par client_reference_id
console.log('\n=== Checkout sessions pour client_reference_id=nMH83IjgsYZY24QYWyijuIjyoH33 ===');
const sessions = await stripe('checkout/sessions?limit=10&client_reference_id=nMH83IjgsYZY24QYWyijuIjyoH33');
if(sessions.error) { console.log('ERR sessions', sessions.error); }
else {
  console.log(`${sessions.data.length} session(s)`);
  for(const s of sessions.data) {
    console.log(JSON.stringify({
      id: s.id,
      mode: s.mode,
      status: s.status,
      payment_status: s.payment_status,
      amount_total: s.amount_total,
      currency: s.currency,
      customer: s.customer,
      customer_email: s.customer_email,
      client_reference_id: s.client_reference_id,
      created: new Date(s.created * 1000).toISOString(),
      metadata: s.metadata,
    }, null, 2));
    console.log('---');
  }
}

// 3) Payment intents pour les customers retrouvés
for(const c of customers.data || []) {
  console.log(`\n=== Payment intents pour customer ${c.id} ===`);
  const pis = await stripe(`payment_intents?customer=${c.id}&limit=10`);
  if(pis.error) { console.log('ERR', pis.error); continue; }
  for(const p of pis.data || []) {
    console.log(JSON.stringify({
      id: p.id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      created: new Date(p.created * 1000).toISOString(),
      metadata: p.metadata,
    }, null, 2));
  }
}
