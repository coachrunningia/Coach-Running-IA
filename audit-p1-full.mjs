import { execSync } from 'child_process';
const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();

const PLANS = [
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

const getStr  = f => f?.stringValue;
const getNum  = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getBool = f => f?.booleanValue;
const getArr  = f => f?.arrayValue?.values || [];
const getMap  = f => f?.mapValue?.fields || {};
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

for (const p of PLANS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${p.id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) { console.log(`\n=== ${p.name} (${p.id}) === HTTP ${r.status}`); continue; }
  const j = await r.json();
  const f = j.fields;

  const goal = getStr(f.goal);
  const dist = getStr(f.distance);
  const score = getNum(f.confidenceScore);
  const fullGen = getBool(f.fullPlanGenerated);
  const dur = getNum(f.durationWeeks);
  const vma = getNum(f.vma) ?? getNum(f.calculatedVMA);
  const paces = getMap(f.paces);
  const easy = getStr(paces.easy);
  const thr = getStr(paces.threshold);
  const vmaP = getStr(paces.vma);
  const recov = getStr(paces.recovery);
  const feas = getMap(f.feasibility);
  const status = getStr(feas.status);

  const gc = getMap(f.generationContext);
  const peri = getMap(gc.periodizationPlan);
  const peakVol = getNum(peri.peakVolumeKm);
  const total = getNum(peri.totalVolumeKm);
  const wv = getArr(peri.weeklyVolumes).map(getNum);

  const qs = getMap(gc.questionnaireSnapshot);
  const age = getNum(qs.age);
  const sex = getStr(qs.sex);
  const weight = getNum(qs.weightKg);
  const height = getNum(qs.heightCm);
  const imc = (weight && height) ? (weight / Math.pow(height/100,2)).toFixed(1) : '?';
  const lvl = getStr(qs.runningLevel);
  const curr = getNum(qs.currentWeeklyKm);
  const freq = getNum(qs.weeklyFrequency);
  const sub = getStr(qs.subGoal);
  const target = getStr(qs.targetTime);
  const c5 = getStr(qs.chrono5km);
  const c10 = getStr(qs.chrono10km);
  const cSemi = getStr(qs.chronoHalfMarathon);
  const cMara = getStr(qs.chronoMarathon);
  const inj = getArr(qs.injuries).map(getStr).filter(Boolean).join(',') || getStr(qs.painOrInjuryDescription) || '-';

  console.log(`\n\n=========== ${p.name} (${p.id}) ===========`);
  console.log(`Goal=${goal} dist=${dist} sub=${sub} target=${target} dur=${dur}sem fullGen=${fullGen}`);
  console.log(`Profil: ${age}yo ${sex} ${weight}kg/${height}cm IMC=${imc} — ${lvl} — ${curr}km/sem freq=${freq}`);
  console.log(`Chronos: 5k=${c5||'-'} 10k=${c10||'-'} semi=${cSemi||'-'} mara=${cMara||'-'} — Blessures: ${inj}`);
  console.log(`Feasibility: ${status} score=${score}`);
  console.log(`VMA=${vma}km/h — Allures: EF=${easy} seuil=${thr} VMA=${vmaP} récup=${recov}`);
  console.log(`Periodization: peak=${peakVol}km total=${total}km`);
  console.log(`weeklyVolumes=${JSON.stringify(wv)}`);

  const weeks = getArr(f.weeks);
  let slMaxKm=0, slMaxWk=0, slMaxName='';
  const rows = [];
  for (const w of weeks) {
    const wm = getMap(w);
    const wn = getNum(wm.weekNumber);
    const sessions = getArr(wm.sessions);
    let wSL=0, wSLname='', wVol=0;
    for (const s of sessions) {
      const sm = getMap(s);
      const km = parseKm(getStr(sm.distance));
      const t = (getStr(sm.type)||'').toLowerCase();
      const n = (getStr(sm.title)||getStr(sm.name)||'').toLowerCase();
      wVol += km;
      if (t.includes('long') || n.includes('long') || n.includes('sortie longue') || n.includes(' sl')) {
        if (km > wSL) { wSL = km; wSLname = getStr(sm.title)||getStr(sm.name)||'?'; }
        if (km > slMaxKm) { slMaxKm = km; slMaxWk = wn; slMaxName = getStr(sm.title)||getStr(sm.name)||'?'; }
      }
    }
    rows.push(`S${wn}: vol=${wVol.toFixed(1)}km${wSLname?` · SL: ${wSLname}=${wSL.toFixed(1)}km`:''}`);
  }
  console.log(`Weeks générées: ${weeks.length}/${dur}`);
  if (slMaxName) console.log(`>>> Peak SL réel: ${slMaxName} = ${slMaxKm.toFixed(1)}km (S${slMaxWk})`);
  else console.log(`>>> Pas de SL identifiée dans les semaines générées (preview)`);
  rows.forEach(r => console.log('  '+r));
}
