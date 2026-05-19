// Recherche élargie : tous les firstName=Thomas, et tous les emails contenant "weill"
// Pour ce dernier on doit lister tous les users récents et filtrer côté code car
// Firestore REST ne supporte pas LIKE / CONTAINS sur strings.

import { execSync } from 'child_process';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// 1) Tous les users avec firstName=Thomas (pas de lastName)
console.log('=== firstName=Thomas (any case) ===');
for(const fn of ['Thomas','thomas','THOMAS']) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: { field: { fieldPath: 'firstName' }, op: 'EQUAL', value: { stringValue: fn } }
      },
      limit: 100
    }
  };
  const r = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if(!Array.isArray(data)) { console.log('ERR', fn, JSON.stringify(data).slice(0,300)); continue; }
  for(const d of data) {
    if(!d.document) continue;
    const f = d.document.fields;
    const em = f.email?.stringValue || '';
    if(em.toLowerCase().includes('weill') || em.toLowerCase().includes('weil')) {
      console.log(JSON.stringify({
        uid: d.document.name.split('/').pop(),
        email: em,
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
  }
}

// 2) Pagination users récents (depuis 2026-05-01) pour scanner les emails contenant "weill"
console.log('\n=== Scan users récents (>=2026-04-01) emails contenant weill/weil ===');
let pageToken = null;
let scanned = 0;
let found = 0;
const since = '2026-04-01T00:00:00.000Z';
while(true) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: since } }
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300
    }
  };
  const r = await fetch(`${BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if(!Array.isArray(data)) { console.log('ERR scan', JSON.stringify(data).slice(0,500)); break; }
  if(data.length === 0) break;
  for(const d of data) {
    if(!d.document) continue;
    scanned++;
    const f = d.document.fields;
    const em = (f.email?.stringValue || '').toLowerCase();
    const fn = (f.firstName?.stringValue || '').toLowerCase();
    const ln = (f.lastName?.stringValue || '').toLowerCase();
    const dn = (f.displayName?.stringValue || '').toLowerCase();
    if(em.includes('weill') || em.includes('weil') || ln.includes('weill') || ln.includes('weil') || dn.includes('weill') || (fn === 'thomas' && em.length>0)) {
      found++;
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
  }
  break; // un seul page, runQuery ne donne pas de nextPageToken sur ce mode
}
console.log(`Scan terminé : ${scanned} users scannés, ${found} matchs (firstName=Thomas inclus).`);
