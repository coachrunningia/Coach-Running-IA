/**
 * Patches finaux :
 * 1. Julien Remise en Forme — recalculer 2 séances incohérentes dist×pace=durée (S10 VMA, S12 Seuil)
 * 2. Arnaud Perte de Poids — lisser S5 (30→27 km) pour respecter règle +20% post-décharge
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}
function toFs(v){if(v===null||v===undefined)return{nullValue:null};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='boolean')return{booleanValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(toFs)}};if(typeof v==='object'){const fields={};for(const[k,val]of Object.entries(v))fields[k]=toFs(val);return{mapValue:{fields}};}return{stringValue:String(v)};}
async function getDoc(id){const r=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`,{headers:{'Authorization':`Bearer ${token}`}});return pf((await r.json()).fields);}
async function patchDoc(id, fields, fp){const params=fp.map(p=>`updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');const body={fields:{}};for(const k of fp)body.fields[k]=toFs(fields[k]);const r=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}?${params}`,{method:'PATCH',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${await r.text()}`);return r.json();}

// === 1. Julien — recalculer distance des séances VMA + Seuil pour cohérence ===
async function patchJulien() {
  const id = '1778600029840';
  const doc = await getDoc(id);
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-julien-${Date.now()}.json`, JSON.stringify(doc, null, 2));

  // Approche : pour séances qualité, le pace cible (4:17 ou 4:56) est l'allure du MAIN SET seulement.
  // La durée totale inclut warmup + main + cooldown. Donc on doit clarifier le targetPace
  // en allure moyenne pondérée OU recalculer distance pour cohérence stricte.
  // Choix : recalculer la distance = duration / pace (= cohérence post-validation que mon patch code attendait)
  let modCount = 0;
  for (const w of doc.weeks) {
    for (const s of (w.sessions || [])) {
      if (s.type === 'Renforcement') continue;
      const km = parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
      const pm = String(s.targetPace || '').match(/(\d+):(\d+)/);
      const dStr = String(s.duration || '');
      const h = dStr.match(/(\d+)\s*h\s*(\d*)/);
      const m = dStr.match(/^(\d+)\s*min/);
      let dm = 0;
      if (h) { dm += parseInt(h[1])*60; if (h[2]) dm += parseInt(h[2]); }
      if (m) dm = parseInt(m[1]);
      if (!km || !pm || !dm) continue;
      const ps = parseInt(pm[1])*60 + parseInt(pm[2]);
      const expMin = (km * ps) / 60;
      if (Math.abs(dm - expMin) / expMin > 0.15) {
        // Recalculer distance = duration / pace
        const corrected = Math.round((dm * 60 / ps) * 10) / 10;
        console.log(`  S${w.weekNumber} ${s.day} "${s.title?.substring(0,30)}": ${km}km → ${corrected}km (cohérence ${dm}min × ${s.targetPace})`);
        s.distance = `${corrected} km`;
        modCount++;
      }
    }
  }
  if (modCount === 0) { console.log(`  ⚠ Aucune incohérence détectée`); return; }
  if (DRY_RUN) { console.log(`  🔍 Dry-run — ${modCount} séances corrigées`); return; }
  await patchDoc(id, doc, ['weeks']);
  console.log(`  ✓ ${modCount} séances corrigées`);
}

// === 2. Arnaud — lisser S5 (30→27 km) pour respecter règle +20% post-décharge ===
async function patchArnaud() {
  const id = '1778521479387';
  const doc = await getDoc(id);
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/backup-arnaud-final-${Date.now()}.json`, JSON.stringify(doc, null, 2));

  // S5 actuel : Mardi 12 km + Dimanche 18 km = 30 km
  // Cible : 27 km (= S4 23 × 1.17 = respect règle +20%)
  // Distribution : Mardi 10 km, Dimanche 17 km
  const s5 = doc.weeks?.[4]; // index 4 = S5
  if (!s5) { console.log(`  ⚠ S5 introuvable`); return; }
  let modCount = 0;
  for (const s of s5.sessions || []) {
    if (s.day === 'Mardi' && s.type !== 'Renforcement') {
      const pm = String(s.targetPace).match(/(\d+):(\d+)/);
      if (pm) {
        const ps = parseInt(pm[1])*60 + parseInt(pm[2]);
        s.distance = '10 km';
        const newMin = Math.round((10 * ps) / 60);
        const h = Math.floor(newMin/60), m = newMin % 60;
        s.duration = h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${newMin} min`;
        modCount++;
        console.log(`  S5 Mardi: 12→10 km, durée ${s.duration}`);
      }
    } else if (s.day === 'Dimanche' && s.type !== 'Renforcement') {
      const pm = String(s.targetPace).match(/(\d+):(\d+)/);
      if (pm) {
        const ps = parseInt(pm[1])*60 + parseInt(pm[2]);
        s.distance = '17 km';
        const newMin = Math.round((17 * ps) / 60);
        const h = Math.floor(newMin/60), m = newMin % 60;
        s.duration = h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${newMin} min`;
        modCount++;
        console.log(`  S5 Dimanche: 18→17 km, durée ${s.duration}`);
      }
    }
  }
  if (modCount === 0) { console.log(`  ⚠ Aucune modification S5`); return; }
  if (DRY_RUN) { console.log(`  🔍 Dry-run — S5 ajustée à 27 km`); return; }
  await patchDoc(id, doc, ['weeks']);
  console.log(`  ✓ S5 ajustée à 27 km (respect règle +20% post-décharge S4=23)`);
}

console.log(`\n${DRY_RUN ? '🔍 DRY-RUN' : '🚀 PUSH'} — Patches finaux Julien + Arnaud\n`);
console.log(`▸ Julien Remise en Forme — cohérence dist×pace`);
await patchJulien();
console.log(`\n▸ Arnaud Perte de Poids — lissage S4→S5`);
await patchArnaud();
console.log(`\n✅ Terminé`);
