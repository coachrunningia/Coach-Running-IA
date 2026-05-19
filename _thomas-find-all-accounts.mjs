// Cherche tous les comptes Firestore qui pourraient être Thomas Weill
// Stratégie : runQuery sur 'users' avec STARTS_WITH-like ne marche pas en REST, on récupère
// donc les users récents et on filtre côté code, + on tente plusieurs égalités strictes connues.

import { execSync } from 'child_process';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function queryUsersByEmail(email) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email }
        }
      },
      limit: 5
    }
  };
  const r = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if(!Array.isArray(data)) return { email, error: JSON.stringify(data).slice(0,300) };
  const docs = data.filter(d => d.document).map(d => ({
    uid: d.document.name.split('/').pop(),
    email: d.document.fields.email?.stringValue,
    displayName: d.document.fields.displayName?.stringValue,
    firstName: d.document.fields.firstName?.stringValue,
    lastName: d.document.fields.lastName?.stringValue,
    isPremium: d.document.fields.isPremium?.booleanValue,
    hasPurchasedPlan: d.document.fields.hasPurchasedPlan?.booleanValue,
    planPurchaseDate: d.document.fields.planPurchaseDate?.stringValue || d.document.fields.planPurchaseDate?.timestampValue,
    createdAt: d.document.fields.createdAt?.stringValue || d.document.fields.createdAt?.timestampValue,
    stripeCustomerId: d.document.fields.stripeCustomerId?.stringValue,
  }));
  return { email, docs };
}

const candidates = [
  'thomas.weill@gmail.com',
  'thomas.weill.pro@gmail.com',
  'thomasweill@gmail.com',
  'thomas.weill@hotmail.com',
  'thomas.weill@yahoo.fr',
  'thomas.weill@orange.fr',
  'thomas.weill@free.fr',
  'thomas.weill@outlook.com',
  'thomas.weill@laposte.net',
  'thomas.weill@icloud.com',
  'thomasweill@hotmail.com',
  't.weill@gmail.com',
  'tweill@gmail.com',
  'thomasw@gmail.com',
  'thomas.w@gmail.com',
  'thomas-weill@gmail.com',
  'weill.thomas@gmail.com',
];

console.log('=== Recherche par email exact ===');
for(const email of candidates) {
  const res = await queryUsersByEmail(email);
  if(res.error) {
    console.log(`[ERR] ${email}: ${res.error}`);
    continue;
  }
  if(res.docs.length === 0) continue;
  for(const d of res.docs) {
    console.log(JSON.stringify(d, null, 2));
    console.log('---');
  }
}

// Recherche par firstName=Thomas dans users (peut être lourd, on limite)
console.log('\n=== Recherche par firstName=Thomas ===');
const bodyFN = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'firstName' },
        op: 'EQUAL',
        value: { stringValue: 'Thomas' }
      }
    },
    limit: 100
  }
};
const rFN = await fetch(`${BASE}:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(bodyFN)
});
const dataFN = await rFN.json();
if(Array.isArray(dataFN)) {
  for(const d of dataFN) {
    if(!d.document) continue;
    const f = d.document.fields;
    const ln = f.lastName?.stringValue || '';
    if(ln.toLowerCase().includes('weill') || ln.toLowerCase().includes('weil')) {
      console.log(JSON.stringify({
        uid: d.document.name.split('/').pop(),
        email: f.email?.stringValue,
        firstName: f.firstName?.stringValue,
        lastName: f.lastName?.stringValue,
        displayName: f.displayName?.stringValue,
        isPremium: f.isPremium?.booleanValue,
        hasPurchasedPlan: f.hasPurchasedPlan?.booleanValue,
        createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
        stripeCustomerId: f.stripeCustomerId?.stringValue,
      }, null, 2));
      console.log('---');
    }
  }
} else {
  console.log('Erreur:', JSON.stringify(dataFN).slice(0,500));
}

// Aussi par displayName contenant "Weill" via runQuery (on tente EQUAL exact, sinon scan)
console.log('\n=== Recherche par lastName commençant par Weill ===');
const bodyLN = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'lastName' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: 'Weill' } } },
          { fieldFilter: { field: { fieldPath: 'lastName' }, op: 'LESS_THAN' }, value: { stringValue: 'Weilm' } }
        ]
      }
    },
    limit: 50
  }
};
// (Note: la syntaxe ci-dessus est erronée volontairement → on remplace)

const bodyLN2 = {
  structuredQuery: {
    from: [{ collectionId: 'users' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'lastName' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: 'Weill' } } },
          { fieldFilter: { field: { fieldPath: 'lastName' }, op: 'LESS_THAN', value: { stringValue: 'Weilm' } } }
        ]
      }
    },
    orderBy: [{ field: { fieldPath: 'lastName' }, direction: 'ASCENDING' }],
    limit: 50
  }
};
const rLN = await fetch(`${BASE}:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(bodyLN2)
});
const dataLN = await rLN.json();
if(Array.isArray(dataLN)) {
  for(const d of dataLN) {
    if(!d.document) continue;
    const f = d.document.fields;
    console.log(JSON.stringify({
      uid: d.document.name.split('/').pop(),
      email: f.email?.stringValue,
      firstName: f.firstName?.stringValue,
      lastName: f.lastName?.stringValue,
      displayName: f.displayName?.stringValue,
      isPremium: f.isPremium?.booleanValue,
      hasPurchasedPlan: f.hasPurchasedPlan?.booleanValue,
      planPurchaseDate: f.planPurchaseDate?.stringValue || f.planPurchaseDate?.timestampValue,
      createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
      stripeCustomerId: f.stripeCustomerId?.stringValue,
    }, null, 2));
    console.log('---');
  }
} else {
  console.log('Erreur LN:', JSON.stringify(dataLN).slice(0,500));
}
