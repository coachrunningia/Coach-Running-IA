// Pour chaque plan des 6 emails : afficher TOUS les champs racine + dimensions
import { execSync } from 'child_process';
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null;
  if(v.stringValue!==undefined) return v.stringValue;
  if(v.integerValue!==undefined) return parseInt(v.integerValue);
  if(v.doubleValue!==undefined) return v.doubleValue;
  if(v.booleanValue!==undefined) return v.booleanValue;
  if(v.timestampValue!==undefined) return v.timestampValue;
  if(v.arrayValue) return (v.arrayValue.values||[]).map(pv);
  if(v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

const PLAN_IDS = ['1779006774503','1779005945595','1779005164818','1779001846380','1778997054156','1778996794833'];

for(const id of PLAN_IDS){
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers:H });
  const j = await r.json();
  if(!j.fields){ console.log(`${id}: NOT FOUND`); continue; }
  const p = pf(j.fields);
  console.log(`\n──── ${id} ────`);
  console.log(`name: ${p.name}`);
  console.log(`isPreview: ${p.isPreview} | fullPlanGenerated: ${p.fullPlanGenerated} | durationWeeks: ${p.durationWeeks}`);
  console.log(`weeks.length: ${(p.weeks||[]).length}`);
  console.log(`weeks numbers: ${(p.weeks||[]).map(w=>w.weekNumber).join(',')}`);
  console.log(`Top-level keys: ${Object.keys(p).sort().join(', ')}`);
  // Champs spécifiques full
  if(p.fullWeeks) console.log(`fullWeeks: ${p.fullWeeks.length} sem`);
  if(p.weeksFull) console.log(`weeksFull: ${p.weeksFull.length} sem`);
  if(p.allWeeks) console.log(`allWeeks: ${p.allWeeks.length} sem`);
  // Sous-collections potentielles
  const sub = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}:listCollectionIds`, { method:'POST', headers:H, body:'{}' });
  const sj = await sub.json();
  if(sj.collectionIds?.length) console.log(`subcollections: ${sj.collectionIds.join(', ')}`);
}
