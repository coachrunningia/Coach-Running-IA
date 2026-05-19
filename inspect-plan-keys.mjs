import { execSync } from 'child_process';
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`).toString().trim();
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

// Get one plan of georgeslor1 to see structure
const uid = 'oWrcHj2F1CQsL34K3KS0ZMc7Olg1';
const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const plans = (await pq.json()).filter(x=>x.document);
console.log('plans count:', plans.length);
for (const p of plans) {
  const data = pf(p.document.fields);
  console.log('---', p.document.name.split('/').pop());
  console.log('  TOP-LEVEL KEYS:', Object.keys(data).sort());
  if (data.generationContext) {
    console.log('  generationContext keys:', Object.keys(data.generationContext).sort());
    if (data.generationContext.questionnaireData) {
      console.log('  gC.questionnaireData keys:', Object.keys(data.generationContext.questionnaireData).sort());
    }
  }
}
