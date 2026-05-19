import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779135832271';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'x-goog-user-project':PROJECT };

const r = await fetch(BASE, { headers: HDR });
if (!r.ok) { console.error('GET fail', r.status, await r.text()); process.exit(1); }
const doc = await r.json();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/rich-current-state.json', JSON.stringify(doc, null, 2));

const fromFs = (v) => {
  if (!v) return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o={}; for (const k of Object.keys(v.mapValue.fields||{})) o[k]=fromFs(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromFs);
  return v;
};

const gc = fromFs(doc.fields.generationContext);
const fe = fromFs(doc.fields.feasibility);
const wm = fromFs(doc.fields.welcomeMessage);
const conf = fromFs(doc.fields.confidenceScore);

console.log('=== CURRENT PLAN STATE ===');
console.log('weeklyVolumes:', JSON.stringify(gc?.periodizationPlan?.weeklyVolumes));
console.log('weeklyElevation:', JSON.stringify(gc?.periodizationPlan?.weeklyElevationTarget));
console.log('feasibility.status:', fe?.status);
console.log('feasibility.score:', fe?.score);
console.log('confidenceScore:', conf);
console.log('currentWeeklyVolume declared:', gc?.currentWeeklyVolume, '| user info:', JSON.stringify(gc?.userProfile||gc?.profile||{}).slice(0,300));

const weeks = fromFs(doc.fields.weeks) || [];
const s1 = weeks[0]?.sessions || [];
console.log('\n=== S1 SESSIONS ===');
let totalKm = 0, totalD = 0;
for (const s of s1) {
  const km = s.distance || 0;
  const d = s.elevationGain || 0;
  totalKm += parseFloat(km);
  totalD += parseInt(d);
  console.log(`  ${s.day}: type=${s.type} dist=${km}km D+=${d}m`);
  console.log(`    mainSet: ${(s.mainSet||'').slice(0,120)}`);
}
console.log(`TOTAL S1: ${totalKm} km / ${totalD} m D+`);
