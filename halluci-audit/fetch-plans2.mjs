import { execSync } from 'child_process';
import fs from 'fs';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const project = 'coach-running-ia';

// Pagination : aller plus loin pour récupérer 20 plans fullPlan supplémentaires
// On utilise startAt sur createdAt pour pagination - mais offset c'est plus simple
const body = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    offset: 100,
    limit: 200
  }
};

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const data = await r.json();
if (!Array.isArray(data)) { console.log("Erreur:", JSON.stringify(data).slice(0,800)); process.exit(1); }

const list = [];
for (const d of data) {
  if (!d.document) continue;
  const id = d.document.name.split('/').pop();
  const f = d.document.fields;
  list.push({
    id,
    createdAt: f.createdAt?.stringValue || f.createdAt?.timestampValue,
    userEmail: f.userEmail?.stringValue,
    name: f.name?.stringValue,
    fullPlanGenerated: f.fullPlanGenerated?.booleanValue
  });
}
const full = list.filter(p => p.fullPlanGenerated === true);
console.log("Total batch 2:", list.length, "fullPlan:", full.length);
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/plans-list-2.json', JSON.stringify(list, null, 2));
for (const p of full) {
  console.log(p.id, p.createdAt, p.userEmail, '|', p.name);
}
