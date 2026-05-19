// Liste users via listDocuments (page-able). Pour scanner tous les comptes Thomas Weill éventuels.
import { execSync } from 'child_process';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

let pageToken = null;
let totalScanned = 0;
let matches = [];

while(true) {
  let url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=300`;
  if(pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await r.json();
  if(data.error) { console.log('ERR', JSON.stringify(data.error).slice(0,400)); break; }
  const docs = data.documents || [];
  for(const d of docs) {
    totalScanned++;
    const f = d.fields || {};
    const em = (f.email?.stringValue || '').toLowerCase();
    const fn = (f.firstName?.stringValue || '').toLowerCase();
    const ln = (f.lastName?.stringValue || '').toLowerCase();
    const dn = (f.displayName?.stringValue || '').toLowerCase();
    const qEmail = (f.questionnaireData?.mapValue?.fields?.email?.stringValue || '').toLowerCase();
    if(em.includes('weill') || em.includes('weil') ||
       ln.includes('weill') || ln.includes('weil') ||
       dn.includes('weill') || dn.includes('weil') ||
       qEmail.includes('weill') || qEmail.includes('weil') ||
       (fn === 'thomas')) {
      matches.push({
        uid: d.name.split('/').pop(),
        email: f.email?.stringValue,
        questEmail: f.questionnaireData?.mapValue?.fields?.email?.stringValue,
        firstName: f.firstName?.stringValue,
        lastName: f.lastName?.stringValue,
        displayName: f.displayName?.stringValue,
        isPremium: f.isPremium?.booleanValue,
        hasPurchasedPlan: f.hasPurchasedPlan?.booleanValue,
        planPurchaseDate: f.planPurchaseDate?.stringValue || f.planPurchaseDate?.timestampValue,
        createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
        stripeCustomerId: f.stripeCustomerId?.stringValue,
      });
    }
  }
  if(data.nextPageToken) {
    pageToken = data.nextPageToken;
    if(totalScanned % 1200 === 0) console.log(`  ...scanned ${totalScanned}`);
  } else break;
}

console.log(`Total scanned: ${totalScanned}`);
console.log(`Matches (Thomas ou email/lastName/displayName contenant weill): ${matches.length}`);
console.log(JSON.stringify(matches, null, 2));
