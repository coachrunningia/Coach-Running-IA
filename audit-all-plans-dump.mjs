import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const getStr  = f => f?.stringValue;
const getNum  = f => f?.integerValue !== undefined ? +f.integerValue : (f?.doubleValue !== undefined ? +f.doubleValue : undefined);
const getBool = f => f?.booleanValue;
const getArr  = f => f?.arrayValue?.values || [];
const getMap  = f => f?.mapValue?.fields || {};
const getTs   = f => f?.timestampValue;
const parseKm = s => { if (!s) return 0; const m = String(s).match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',','.')) : 0; };

// List plans created in the last 30 days, ordered by createdAt desc
const since = new Date();
since.setDate(since.getDate() - 30);

const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
const query = {
  structuredQuery: {
    from: [{ collectionId: 'plans' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'createdAt' },
        op: 'GREATER_THAN',
        value: { stringValue: since.toISOString() }
      }
    },
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit: 200
  }
};

const r = await fetch(queryUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(query)
});
const docs = await r.json();
const plans = [];
for (const item of docs) {
  if (!item.document) continue;
  const f = item.document.fields;
  const id = item.document.name.split('/').pop();

  const goal = getStr(f.goal);
  const dist = getStr(f.distance);
  const score = getNum(f.confidenceScore);
  const fullGen = getBool(f.fullPlanGenerated);
  const isPreview = getBool(f.isPreview);
  const dur = getNum(f.durationWeeks);
  const vma = getNum(f.vma) ?? getNum(f.calculatedVMA);
  const vmaSource = getStr(f.vmaSource);
  const sessionsPerWeek = getNum(f.sessionsPerWeek);
  const paces = getMap(f.paces);
  const efPace = getStr(paces.efPace);
  const seuilPace = getStr(paces.seuilPace);
  const vmaPace = getStr(paces.vmaPace);
  const recoveryPace = getStr(paces.recoveryPace);
  const feas = getMap(f.feasibility);
  const status = getStr(feas.status);
  const userEmail = getStr(f.userEmail);
  const planName = getStr(f.name);
  const createdAt = getTs(f.createdAt);

  const gc = getMap(f.generationContext);
  const peri = getMap(gc.periodizationPlan);
  const peakVol = getNum(peri.peakVolumeKm);
  const total = getNum(peri.totalVolumeKm);
  const wv = getArr(peri.weeklyVolumes).map(getNum);
  const actualPeak = wv.length ? Math.max(...wv) : peakVol;

  // questionnaireSnapshot semble vide pour Pierre — chercher dans autres champs
  const qs = getMap(gc.questionnaireSnapshot);
  const qsKeys = Object.keys(qs);

  // Find SL peak in generated weeks
  const weeks = getArr(f.weeks);
  let slMaxKm=0, slMaxWk=0, slMaxName='';
  for (const w of weeks) {
    const wm = getMap(w);
    const wn = getNum(wm.weekNumber);
    const sessions = getArr(wm.sessions);
    for (const s of sessions) {
      const sm = getMap(s);
      const km = parseKm(getStr(sm.distance));
      const t = (getStr(sm.type)||'').toLowerCase();
      const n = (getStr(sm.title)||getStr(sm.name)||'').toLowerCase();
      if (t.includes('long') || n.includes('long') || n.includes('sortie longue') || n.includes(' sl')) {
        if (km > slMaxKm) { slMaxKm = km; slMaxWk = wn; slMaxName = getStr(sm.title)||getStr(sm.name)||'?'; }
      }
    }
  }

  plans.push({
    id, userEmail, planName, createdAt,
    goal, distance: dist, durationWeeks: dur, fullPlanGenerated: fullGen, isPreview,
    feasibility: status, score, vma, vmaSource, sessionsPerWeek,
    paces: { ef: efPace, seuil: seuilPace, vma: vmaPace, recovery: recoveryPace },
    periodization: { peakKm: peakVol, totalKm: total, weeklyVolumes: wv, actualPeak },
    weeksGenerated: weeks.length,
    slPeak: { km: slMaxKm, week: slMaxWk, name: slMaxName },
    questionnaireSnapshotKeys: qsKeys
  });
}

console.log(`# Plans collectés: ${plans.length}`);
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans.json', JSON.stringify(plans, null, 2));
console.log(`Dump écrit: /Users/romanemarino/Coach-Running-IA/audit-all-plans.json`);

// Quick summary
const profiles = plans.map(p => ({
  email: p.userEmail,
  goal: p.goal,
  dist: p.distance,
  dur: p.durationWeeks,
  vma: p.vma,
  vmaSrc: p.vmaSource,
  freq: p.sessionsPerWeek,
  peak: p.periodization.peakKm || p.periodization.actualPeak,
  slPeak: p.slPeak.km,
  weeksGen: p.weeksGenerated,
  fullGen: p.fullPlanGenerated,
  feas: p.feasibility,
  score: p.score,
  ef: p.paces.ef
}));
console.log('\n# Aperçu (top 20):');
profiles.slice(0,20).forEach(p => {
  console.log(`- ${p.email} | ${p.goal}/${p.dist} ${p.dur}sem fullGen=${p.fullGen} weeks=${p.weeksGen}/${p.dur} | VMA=${p.vma?.toFixed?.(1)||p.vma} freq=${p.freq} | peak=${p.peak} SL=${p.slPeak} | ${p.feas}${p.score?'/' +p.score:''} EF=${p.ef}`);
});
console.log(`\n... ${plans.length-20} plans supplémentaires dans le JSON`);
