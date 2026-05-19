// Revert immédiat du patch periodizationPlan de Fred — restaure l'état initial
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };
const PLAN_ID = '1779001846380';
const BACKUP = 'backup-fred-periodization-2026-05-17T10-03-40-987Z.json';

const back = JSON.parse(readFileSync(BACKUP, 'utf8'));
const originalPP = back.fields.generationContext.mapValue.fields.periodizationPlan;

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=generationContext.periodizationPlan`;
const r = await fetch(url, { method:'PATCH', headers:H,
  body: JSON.stringify({ fields: { generationContext: { mapValue: { fields: { periodizationPlan: originalPP } } } } })
});
const j = await r.json();
if(r.status !== 200){ console.error(`❌ Revert failed:`, JSON.stringify(j).substring(0,500)); process.exit(1); }

// Vérif
const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await v.json();
const vols = (vj.fields.generationContext.mapValue.fields.periodizationPlan.mapValue.fields.weeklyVolumes.arrayValue.values).map(x => parseInt(x.integerValue));
console.log(`✅ REVERT OK — weeklyVolumes = [${vols.join(', ')}] — pic ${Math.max(...vols)} km`);
