import { readFileSync } from 'fs';
const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => p.createdAt && new Date(p.createdAt) >= since).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const isRun = (s) => !/renfo|mobilité|cross|étir|repos/i.test(s.type || '');

console.log(`\n══════════════════════════════════════════════════════════════════════`);
console.log(`  DIMENSION 2 — DISTANCE DE LA PLUS LONGUE COURSE DE LA SEMAINE`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

// === PREMIUM ===
const premium = plans.filter(p => p.fullPlanGenerated === true);
console.log(`### PREMIUM (${premium.length})\n`);

for (const p of premium) {
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const goal = p.goal;
  const trailDist = qs.trailDistance || 0;
  console.log(`\n┌─── ${p.name}`);
  console.log(`│  Objectif: ${goal}${trailDist ? ` ${trailDist}km` : ''}  •  VMA ${p.vma?.toFixed(1) || '?'}  •  Cible: ${p.targetTime || 'Finisher'}`);
  console.log(`│`);
  console.log(`│  Sem | Phase           | Vol  | SL réelle | SL/Vol | Titre`);
  console.log(`│  ----|-----------------|------|-----------|--------|----`);
  const sls = [];
  for (let i = 0; i < p.weeks.length; i++) {
    const w = p.weeks[i];
    const runs = (w.sessions || []).filter(isRun);
    const vol = runs.reduce((s, x) => s + kmOf(x), 0);
    // SL = la plus longue séance course
    const sl = runs.reduce((m, x) => kmOf(x) > kmOf(m) ? x : m, runs[0] || {});
    const slKm = kmOf(sl);
    sls.push(slKm);
    const ratio = vol > 0 ? (slKm/vol*100).toFixed(0)+'%' : '-';
    const title = (sl.title || '').substring(0, 30);
    const phase = (w.phase || '').substring(0, 15).padEnd(15);
    const taggedSL = /longue/i.test(sl.type || '') ? '✓' : '✗';
    console.log(`│  S${(i+1).toString().padStart(2)} | ${phase} | ${vol.toFixed(0).padStart(4)} | ${slKm.toFixed(1).padStart(6)} ${taggedSL} | ${ratio.padStart(6)} | ${title}`);
  }
  const slPeak = Math.max(...sls);
  const slStart = sls[0];
  const slGrowth = ((slPeak - slStart) / slStart * 100).toFixed(0);
  console.log(`│`);
  console.log(`│  SL: début ${slStart.toFixed(1)}km → pic ${slPeak.toFixed(1)}km (+${slGrowth}%)`);
  // Cible théorique selon objectif
  let slCibleMin = null, slCibleMax = null;
  if (goal === 'Trail' && trailDist) { slCibleMin = trailDist * 0.40; slCibleMax = trailDist * 0.70; }
  else if (/marathon/i.test(goal) && !/semi/i.test(goal)) { slCibleMin = 30; slCibleMax = 35; }
  else if (/semi/i.test(goal) || /semi/i.test(p.subGoal||'')) { slCibleMin = 16; slCibleMax = 20; }
  else if (/10/i.test(p.subGoal||'')) { slCibleMin = 12; slCibleMax = 16; }
  if (slCibleMin) console.log(`│  SL pic théorique pour ${goal}: ${slCibleMin.toFixed(0)}–${slCibleMax.toFixed(0)}km  •  Atteint: ${slPeak < slCibleMin ? '❌ insuffisant' : slPeak > slCibleMax ? '⚠️ trop' : '✓'}`);
  // Combien de "Sortie Longue" taggées (devrait être 1/sem)
  let totalTaggedSL = 0, weeksWithMultipleSL = 0;
  for (const w of p.weeks) {
    const slsInWeek = (w.sessions || []).filter(s => /longue/i.test(s.type || '')).length;
    totalTaggedSL += slsInWeek;
    if (slsInWeek > 1) weeksWithMultipleSL++;
  }
  console.log(`│  Séances étiquetées "Sortie Longue": ${totalTaggedSL}  •  Semaines avec ≥2 SL: ${weeksWithMultipleSL} ${weeksWithMultipleSL > 0 ? '❌' : '✓'}`);
  console.log(`└─`);
}

// === FREEMIUM === : SL S1 seule
const freemium = plans.filter(p => p.fullPlanGenerated !== true);
console.log(`\n\n### FREEMIUM (${freemium.length}) — SL en S1\n`);
console.log(`Plan                                                     | Goal      | Vol S1 | SL S1 | SL/Vol | Cible théo  | Verdict`);
console.log(`---------------------------------------------------------|-----------|--------|-------|--------|-------------|--------`);
for (const p of freemium) {
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const w = p.weeks?.[0];
  if (!w) continue;
  const runs = (w.sessions || []).filter(isRun);
  const vol = runs.reduce((s, x) => s + kmOf(x), 0);
  const sl = runs.reduce((m, x) => kmOf(x) > kmOf(m) ? x : m, runs[0] || {});
  const slKm = kmOf(sl);
  const goal = p.goal;
  const trailDist = qs.trailDistance || 0;
  // SL en S1 = ~30-35% du volume hebdo (règle Jack Daniels)
  const ratio = vol > 0 ? slKm/vol : 0;
  const ratioPct = (ratio*100).toFixed(0);
  let verdict = '✓';
  if (ratio > 0.50) verdict = '⚠️ SL trop grosse (>50% vol)';
  else if (ratio < 0.25 && vol > 10) verdict = '⚠️ SL trop petite (<25% vol)';
  const name = p.name.substring(0, 55).padEnd(55);
  console.log(`${name} | ${goal.substring(0,9).padEnd(9)} | ${vol.toFixed(0).padStart(6)} | ${slKm.toFixed(1).padStart(5)} | ${(ratioPct+'%').padStart(6)} | ${(trailDist || '?').toString().padEnd(11)} | ${verdict}`);
}
