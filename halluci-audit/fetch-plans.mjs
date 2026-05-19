import { execSync } from 'child_process';
import fs from 'fs';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const project = 'coach-running-ia';

// Récupérer 50 plans récents (on filtrera fullPlanGenerated côté client si nécessaire)
const body = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 100
  }
};

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const data = await r.json();
if (!Array.isArray(data)) {
  console.log("Erreur:", JSON.stringify(data).slice(0, 1000));
  process.exit(1);
}

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
console.log("Plans recuperes:", list.length);
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/halluci-audit/plans-list.json', JSON.stringify(list, null, 2));
for (const p of list.slice(0, 35)) {
  console.log(p.id, '|', p.createdAt, '|', p.userEmail, '|', p.name);
}
