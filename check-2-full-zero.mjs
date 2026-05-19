import { execSync } from 'child_process';
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'x-goog-user-project':PROJECT };
function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

for (const id of ['1773143911561', '1772961018568', '1778615277138']) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, { headers:H });
  const p = pf((await r.json()).fields);
  const snap = p.generationContext?.questionnaireSnapshot||{};
  console.log(`\n══════ ${id} ${p.userEmail} ══════`);
  console.log(`  goal: ${p.goal}  subGoal: ${p.subGoal||snap.subGoal}  distance: ${p.distance}  targetTime: ${p.targetTime}`);
  console.log(`  vma: ${p.vma}  paces.allureSpecifiqueSemi: ${p.paces?.allureSpecifiqueSemi}  paces.allureSpecifiqueMarathon: ${p.paces?.allureSpecifiqueMarathon}`);
  console.log(`  isPreview=${p.isPreview} fullPlanGenerated=${p.fullPlanGenerated} weeks=${(p.weeks||[]).length}`);
  // Compter types de séances + paces
  const typeCounts = {};
  const paceCounts = {};
  for (const w of (p.weeks||[])) {
    for (const s of (w.sessions||[])) {
      const t = (s.type||'?').trim();
      typeCounts[t] = (typeCounts[t]||0)+1;
      const tp = s.targetPace||'(none)';
      paceCounts[tp] = (paceCounts[tp]||0)+1;
    }
  }
  console.log(`  Types séances: ${JSON.stringify(typeCounts)}`);
  console.log(`  Paces distinctes (top 5): ${JSON.stringify(Object.fromEntries(Object.entries(paceCounts).sort((a,b)=>b[1]-a[1]).slice(0,5)))}`);

  // Pour arnaudmanoeuvre : lister les 10 séances avec pace stockée 4:21
  if (id === '1778615277138') {
    console.log(`\n  ── DÉTAIL DES SÉANCES À LA PACE 4:21 (à patcher) ──`);
    for (const w of (p.weeks||[])) {
      for (const s of (w.sessions||[])) {
        if (s.targetPace?.match(/4:21/)) {
          console.log(`    S${w.weekNumber} ${s.day} ${s.type} "${s.title}" — targetPace=${s.targetPace}`);
        }
      }
    }
  }
}
