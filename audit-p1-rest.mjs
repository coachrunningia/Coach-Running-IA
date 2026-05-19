import { execSync } from 'child_process';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const P1 = [
  { name: 'Pierre Dewitte',   id: '1778574019379' },
  { name: 'Agathe',           id: '1778446762158' },
  { name: 'Soumaya',          id: '1778276731530' },
  { name: 'Adrien',           id: '1778702412108' },
  { name: 'Hippolyte',        id: '1778852278323' },
  { name: 'Karine',           id: '1778695294712' },
  { name: 'Lukas',            id: '1778771945613' },
  { name: 'Bruno',            id: '1778673418021' },
  { name: 'Sylvie',           id: '1778398957594' },
  { name: 'Christophe npsi',  id: '1778210447573' },
];

function val(f) {
  if (f === undefined || f === null) return undefined;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return Number(f.integerValue);
  if (f.doubleValue !== undefined) return Number(f.doubleValue);
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.nullValue !== undefined) return null;
  if (f.arrayValue !== undefined) return (f.arrayValue.values || []).map(val);
  if (f.mapValue !== undefined) {
    const o = {}; for (const k of Object.keys(f.mapValue.fields || {})) o[k] = val(f.mapValue.fields[k]);
    return o;
  }
  if (f.timestampValue !== undefined) return f.timestampValue;
  return f;
}
function fields(f) {
  if (!f) return {}; const o = {};
  for (const k of Object.keys(f)) o[k] = val(f[k]);
  return o;
}

for (const p of P1) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.id}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) { console.log(`\n## ${p.name} — HTTP ${r.status}`); continue; }
  const j = await r.json();
  const d = fields(j.fields);
  const q = d.generationContext?.questionnaire || {};
  const peri = d.generationContext?.periodizationPlan || {};
  const paces = d.generationContext?.calculatedPaces || {};
  const feas = d.generationContext?.feasibility || {};
  const weeks = d.weeks || [];

  const imc = q.weightKg && q.heightCm ? (q.weightKg / Math.pow(q.heightCm/100,2)).toFixed(1) : '?';
  console.log(`\n\n========== ${p.name} (${p.id}) ==========`);
  console.log(`Goal: ${q.goal} / ${q.subGoal||'-'} — Target: ${q.targetTime||'-'} — Durée: ${q.planDurationWeeks} sem`);
  console.log(`Profile: ${q.age}yo ${q.sex} ${q.weightKg}kg/${q.heightCm}cm IMC=${imc} — Niveau: ${q.runningLevel} — VolAct: ${q.currentWeeklyKm}km/sem Freq:${q.weeklyFrequency}`);
  console.log(`Chronos: 5k=${q.chrono5km||'-'} 10k=${q.chrono10km||'-'} semi=${q.chronoHalfMarathon||'-'} mara=${q.chronoMarathon||'-'}`);
  console.log(`Blessures: ${JSON.stringify(q.injuries||q.painOrInjuryDescription||'-')}`);
  console.log(`Feasibility: ${feas.status} score=${feas.confidenceScore}`);
  console.log(`Allures: EF=${paces.easy} seuil=${paces.threshold} VMA=${paces.vma} (VMA=${peri.estimatedVMA}km/h)`);
  console.log(`Periodization: peak=${peri.peakVolumeKm}km total=${peri.totalVolumeKm}km`);
  console.log(`weeklyVolumes: ${JSON.stringify(peri.weeklyVolumes)}`);

  let maxSLkm=0, maxSLwk=0, maxSLname='';
  const rows = [];
  for (const w of weeks) {
    let vol=0, slMax=0, slDesc='';
    for (const s of (w.sessions||[])) {
      const km = s.totalKm || s.distance || 0;
      vol += Number(km)||0;
      const n = (s.name||'').toLowerCase();
      const t = (s.type||'').toLowerCase();
      if (t.includes('long')||n.includes('long')||n.includes('sortie longue')||n.includes(' sl')) {
        if (km>slMax){ slMax=km; slDesc=`${s.name}=${km}km`; }
        if (km>maxSLkm){ maxSLkm=km; maxSLwk=w.weekNumber; maxSLname=s.name; }
      }
    }
    rows.push(`S${w.weekNumber}: vol=${(Math.round(vol*10)/10)}km · SL=${slDesc||'-'}`);
  }
  console.log(`Détail réel:`);
  rows.forEach(r => console.log(`  ${r}`));
  console.log(`>>> Peak SL réel: ${maxSLname} = ${maxSLkm}km (S${maxSLwk})`);
}
