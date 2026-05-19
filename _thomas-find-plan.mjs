import { execSync } from 'child_process';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const body = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'userId' },
        op: 'EQUAL',
        value: { stringValue: 'nMH83IjgsYZY24QYWyijuIjyoH33' }
      }
    },
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 10
  }
};
const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const data = await r.json();
if(!Array.isArray(data)) { console.log("Erreur:", JSON.stringify(data).slice(0,800)); process.exit(1); }
for(const d of data) {
  if(!d.document) continue;
  const f = d.document.fields;
  console.log(d.document.name.split('/').pop(),
    '| createdAt:', f.createdAt?.stringValue || f.createdAt?.timestampValue,
    '| name:', f.name?.stringValue || '?',
    '| fullPlan:', f.fullPlanGenerated?.booleanValue,
    '| email:', f.userEmail?.stringValue);
}
