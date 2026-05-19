// Dump complet d'un plan preview pour voir s'il existe une projection théorique des semaines suivantes
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

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

// Le plan le plus complet : Romain (trail 12sem 5séances)
const id = '1778997054156';
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers:H });
const j = await r.json();
const p = pf(j.fields);

writeFileSync('plan-romain-full-dump.json', JSON.stringify(p, null, 2));
console.log(`📝 plan-romain-full-dump.json (${JSON.stringify(p).length} chars)`);
console.log(`\nClés racine: ${Object.keys(p).sort().join(', ')}`);
console.log(`\ngenerationContext keys: ${Object.keys(p.generationContext||{}).sort().join(', ')}`);

// Recherche de tout ce qui ressemble à projection
const candidatesKeys = ['phaseStructure','phases','weeklyTargets','volumeProgression','planStructure','blocks','macroPlan','weeklyPlan','weekPreview','allWeeksPreview','planSummary','weeklyVolumes','progression','targets','blueprint','outline','overview'];
function deepFind(obj, prefix=''){
  if(!obj||typeof obj!=='object') return;
  for(const [k,v] of Object.entries(obj)){
    const path = prefix?`${prefix}.${k}`:k;
    if(candidatesKeys.some(c => k.toLowerCase().includes(c.toLowerCase()))) console.log(`  🎯 ${path} = ${typeof v==='object'?JSON.stringify(v).substring(0,200):v}`);
    if(typeof v==='object'&&v!==null) deepFind(v, path);
  }
}
console.log(`\n🔍 Recherche projection théorique :`);
deepFind(p);

// Affiche adaptationLog & confidenceScore complets
console.log(`\n📊 adaptationLog (${(p.adaptationLog||[]).length} entrées):`);
(p.adaptationLog||[]).slice(0,5).forEach(a => console.log(`  ${JSON.stringify(a).substring(0,300)}`));

// generationContext full
console.log(`\n🧬 generationContext full :`);
console.log(JSON.stringify(p.generationContext, null, 2).substring(0,3000));
