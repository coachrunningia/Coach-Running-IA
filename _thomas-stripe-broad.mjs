// Liste toutes les checkout sessions du 19/05/2026 pour identifier paiement Thomas
import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/.env','utf-8').split('\n').filter(Boolean).map(l => {
  const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)];
}));
const KEY = env.STRIPE_SECRET_KEY;

async function stripe(path) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${KEY}` }
  });
  return await r.json();
}

// Searching by email variants — Stripe accepts search via Search API
const variants = [
  'thomas.weill.pro@gmail.com',
  'thomas.weill@gmail.com',
  'thomas.weill.pro',
  'weill',
];

for(const q of variants) {
  console.log(`\n=== Stripe Search customer: email~"${q}" ===`);
  const url = `customers/search?query=${encodeURIComponent(`email:"${q}"`)}&limit=20`;
  const r = await stripe(url);
  if(r.error) { console.log('ERR', r.error.message); continue; }
  console.log(`${r.data.length} found`);
  for(const c of r.data) {
    console.log(JSON.stringify({
      id: c.id, email: c.email, created: new Date(c.created*1000).toISOString(),
      description: c.description, name: c.name,
    }));
  }
}

// Search avec wildcard
console.log('\n=== Search query email~weill ===');
const sw = await stripe(`customers/search?query=${encodeURIComponent('email~"weill"')}&limit=20`);
if(sw.error) console.log('ERR', sw.error.message);
else {
  console.log(`${sw.data?.length || 0} found`);
  for(const c of sw.data || []) {
    console.log(JSON.stringify({ id: c.id, email: c.email, created: new Date(c.created*1000).toISOString() }));
  }
}

// Liste sessions par fenêtre temporelle (depuis 2026-05-19 18:00 UTC)
const since = Math.floor(new Date('2026-05-19T18:00:00Z').getTime() / 1000);
console.log(`\n=== Checkout sessions created>=${new Date(since*1000).toISOString()} ===`);
const sessions = await stripe(`checkout/sessions?limit=50&created[gte]=${since}&expand[]=data.customer`);
if(sessions.error) { console.log('ERR', sessions.error); }
else {
  console.log(`${sessions.data.length} sessions`);
  for(const s of sessions.data) {
    console.log(JSON.stringify({
      id: s.id,
      mode: s.mode,
      status: s.status,
      payment_status: s.payment_status,
      amount_total: s.amount_total,
      customer: s.customer?.id || s.customer,
      customer_email: s.customer_email || s.customer?.email,
      client_reference_id: s.client_reference_id,
      created: new Date(s.created * 1000).toISOString(),
      metadata: s.metadata,
    }));
  }
}
