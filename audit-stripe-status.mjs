/**
 * AUDIT READ-ONLY : statut Stripe réel de chaque orphelin.
 * Aucune écriture Firestore ni Stripe.
 */
import { readFileSync, writeFileSync } from 'fs';

// Charger .env manuellement
const env = readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) acc[m[1]] = m[2].trim();
  return acc;
}, {});

const STRIPE_KEY = env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) { console.error('STRIPE_SECRET_KEY introuvable dans .env'); process.exit(1); }
console.log(`Stripe key: ${STRIPE_KEY.substring(0, 12)}...`);

async function stripe(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.stripe.com/v1/${path}${qs ? '?' + qs : ''}`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${STRIPE_KEY}` } });
  return r.json();
}

const orphelins = JSON.parse(readFileSync('audit-orphelins-correct.json', 'utf-8')).trueOrphan;
console.log(`\n${orphelins.length} orphelins à investiguer\n`);

const results = [];
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

log(`${'═'.repeat(140)}`);
log(`AUDIT STRIPE RÉEL — ${orphelins.length} orphelins`);
log(`${'═'.repeat(140)}`);
log(`${'Email'.padEnd(38)} | ${'PlanDate'.padEnd(16)} | weeks | FStoreStripe              | StripeCust(API)          | Sub status        | Charges $`);
log(`${'─'.repeat(140)}`);

for (const o of orphelins) {
  const email = (o.plan.userEmail || '').toLowerCase();
  const planDate = o.plan.createdAt?.substring(0, 16) || '?';
  const weeks = o.plan.weeks.length;
  const fStoreStripe = o.user.stripeCustomerId || '(none)';

  // Stripe customers search by email
  const cust = await stripe('customers', { email, limit: 5 });
  const customers = cust.data || [];

  let verdict = '';
  let stripeCustId = '(none)';
  let subStatus = '(none)';
  let chargesTotal = 0;
  let chargesCount = 0;

  if (customers.length === 0) {
    verdict = '❌ AUCUN paiement Stripe — généré sans payer';
    stripeCustId = '(none)';
  } else {
    // Prend le customer le plus récent (ou correspondant au stripeCustomerId Firestore)
    const target = customers.find(c => c.id === fStoreStripe) || customers[0];
    stripeCustId = target.id;

    // Subs
    const subs = await stripe(`subscriptions`, { customer: target.id, status: 'all', limit: 5 });
    const subList = subs.data || [];
    if (subList.length > 0) {
      const active = subList.find(s => ['active', 'trialing'].includes(s.status));
      const last = subList[0];
      subStatus = active ? `active(${active.id.substring(0,12)})` : last.status;
    }
    // Charges
    const ch = await stripe('charges', { customer: target.id, limit: 20 });
    const chList = (ch.data || []).filter(x => x.status === 'succeeded');
    chargesCount = chList.length;
    chargesTotal = chList.reduce((s, c) => s + c.amount, 0) / 100;

    if (subStatus.startsWith('active')) verdict = `🟠 PAYÉ TJS — isPremium devrait être true`;
    else if (chargesCount > 0 && subStatus === '(none)') verdict = `🟢 Plan Unique payé`;
    else if (['canceled','past_due','unpaid','incomplete_expired'].some(s => subStatus.includes(s))) verdict = `🔵 Sub ${subStatus} — annulation OK`;
    else verdict = `⚪ ${subStatus} — à voir`;
  }

  const row = `${email.padEnd(38)} | ${planDate.padEnd(16)} | ${String(weeks).padStart(5)} | ${fStoreStripe.padEnd(25)} | ${stripeCustId.padEnd(25)} | ${subStatus.padEnd(18)} | ${String(chargesCount).padStart(3)}x ${String(chargesTotal).padStart(6)} € | ${verdict}`;
  log(row);
  results.push({ email, planDate, weeks, fStoreStripe, stripeCustId, subStatus, chargesCount, chargesTotal, verdict, planId: o.plan.id, userId: o.user.id });
}

log(`${'─'.repeat(140)}`);

// Synthèse
const byVerdict = {};
results.forEach(r => { byVerdict[r.verdict] = (byVerdict[r.verdict]||0) + 1; });
log(`\n── SYNTHÈSE PAR VERDICT ──`);
Object.entries(byVerdict).sort((a,b)=>b[1]-a[1]).forEach(([v,n]) => log(`  ${String(n).padStart(3)}  ${v}`));

writeFileSync('audit-stripe-status.txt', lines.join('\n'));
writeFileSync('audit-stripe-status.json', JSON.stringify(results, null, 2));
console.log(`\n📝 audit-stripe-status.txt + .json`);
