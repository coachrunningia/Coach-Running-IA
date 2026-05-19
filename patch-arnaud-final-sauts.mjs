/**
 * Patch final Arnaud : lisser S6 (33→32) et S9 (33→31) pour respecter règle +20% post-décharge.
 * S4=23 → S5=27 (+17%) ✓ déjà fait
 * S5=27 → S6=32 (+18%) au lieu de 33 (+22%)
 * S8=26 → S9=31 (+19%) au lieu de 33 (+27%)
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PROJECT = 'coach-running-ia', PLAN_ID = '1778521479387';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${token}` } });
const doc = pf((await r.json()).fields);
writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-arnaud-sauts-${Date.now()}.json`, JSON.stringify(doc, null, 2));

const adjustments = {
  6: { mardi: 13, dimanche: 19 }, // total 32
  9: { mardi: 12, dimanche: 19 }, // total 31
};

const formatDur = (totalSec) => { const min = Math.round(totalSec / 60); const h = Math.floor(min/60); const m = min % 60; return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${min} min`; };

let modCount = 0;
for (const [weekNum, vols] of Object.entries(adjustments)) {
  const w = doc.weeks?.[parseInt(weekNum)-1];
  if (!w) continue;
  for (const s of (w.sessions || [])) {
    if (s.type === 'Renforcement') continue;
    const targetKm = s.day === 'Mardi' ? vols.mardi : s.day === 'Dimanche' ? vols.dimanche : null;
    if (targetKm === null) continue;
    const pm = String(s.targetPace).match(/(\d+):(\d+)/);
    if (!pm) continue;
    const ps = parseInt(pm[1])*60 + parseInt(pm[2]);
    s.distance = `${targetKm} km`;
    s.duration = formatDur(targetKm * ps);
    modCount++;
    console.log(`  S${weekNum} ${s.day}: ${targetKm}km @ ${s.targetPace} = ${s.duration}`);
  }
}

console.log(`\nNouvelle séquence Arnaud :`);
const newVols = doc.weeks.map(w => (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((sum,x) => sum + (parseFloat(String(x.distance || '0').replace(/[^0-9.]/g, '')) || 0), 0));
console.log(`  ${newVols.map(v => v.toFixed(0)).join(' → ')}`);

if (DRY_RUN) { console.log(`\n🔍 DRY-RUN`); process.exit(0); }
const params = 'updateMask.fieldPaths=weeks';
const body = { fields: { weeks: toFs(doc.weeks) }};
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?${params}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
if (!res.ok) { console.error(`❌ ${res.status}`); process.exit(1); }
console.log(`\n✓ ${modCount} séances patchées`);
