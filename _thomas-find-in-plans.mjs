// Cherche dans la collection plans : userEmail contenant "weill" (au cas où un plan
// est attaché à un compte sans email côté user mais avec userEmail côté plan)
import { execSync } from 'child_process';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

let pageToken = null;
let totalScanned = 0;
let matches = [];

while(true) {
  let url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300`;
  if(pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const r = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await r.json();
  if(data.error) { console.log('ERR', JSON.stringify(data.error).slice(0,400)); break; }
  const docs = data.documents || [];
  for(const d of docs) {
    totalScanned++;
    const f = d.fields || {};
    const em = (f.userEmail?.stringValue || '').toLowerCase();
    if(em.includes('weill') || em.includes('weil')) {
      matches.push({
        planId: d.name.split('/').pop(),
        userId: f.userId?.stringValue,
        userEmail: f.userEmail?.stringValue,
        name: f.name?.stringValue,
        createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
        fullPlanGenerated: f.fullPlanGenerated?.booleanValue,
      });
    }
  }
  if(data.nextPageToken) pageToken = data.nextPageToken;
  else break;
  if(totalScanned > 10000) break;
}
console.log(`Plans scanned: ${totalScanned}`);
console.log(`Matches weill: ${matches.length}`);
console.log(JSON.stringify(matches, null, 2));
