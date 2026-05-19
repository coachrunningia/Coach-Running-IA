// Audit de l'ampleur du bug : users avec hasPurchasedPlan=true mais isPremium=false
import { execSync } from 'child_process';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// runQuery direct sur le composé
const body = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'hasPurchasedPlan' }, op: 'EQUAL', value: { booleanValue: true } } },
          { fieldFilter: { field: { fieldPath: 'isPremium' }, op: 'EQUAL', value: { booleanValue: false } } }
        ]
      }
    },
    limit: 500
  }
};
const r = await fetch(`${BASE}:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const data = await r.json();
if(!Array.isArray(data)) { console.log('ERR composé:', JSON.stringify(data).slice(0,500)); process.exit(1); }
const docs = data.filter(d => d.document);
console.log(`=== Bug ampleur : hasPurchasedPlan=true ET isPremium=false ===`);
console.log(`Total trouvés : ${docs.length}`);
for(const d of docs) {
  const f = d.document.fields;
  console.log(JSON.stringify({
    uid: d.document.name.split('/').pop(),
    email: f.email?.stringValue,
    firstName: f.firstName?.stringValue,
    lastName: f.lastName?.stringValue,
    isPremium: f.isPremium?.booleanValue,
    hasPurchasedPlan: f.hasPurchasedPlan?.booleanValue,
    planPurchaseDate: f.planPurchaseDate?.stringValue || f.planPurchaseDate?.timestampValue,
    createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
    stripeCustomerId: f.stripeCustomerId?.stringValue,
  }, null, 2));
  console.log('---');
}

// Inverse : isPremium=true sans hasPurchasedPlan ?
console.log('\n=== Contrôle inverse : isPremium=true ET hasPurchasedPlan=false ===');
const body2 = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'hasPurchasedPlan' }, op: 'EQUAL', value: { booleanValue: false } } },
          { fieldFilter: { field: { fieldPath: 'isPremium' }, op: 'EQUAL', value: { booleanValue: true } } }
        ]
      }
    },
    limit: 50
  }
};
const r2 = await fetch(`${BASE}:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body2)
});
const data2 = await r2.json();
if(Array.isArray(data2)) {
  const docs2 = data2.filter(d => d.document);
  console.log(`Total inverse : ${docs2.length}`);
  for(const d of docs2.slice(0,5)) {
    const f = d.document.fields;
    console.log(`  ${f.email?.stringValue} | uid=${d.document.name.split('/').pop()}`);
  }
}
