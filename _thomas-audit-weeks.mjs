import { readFileSync } from 'fs';
const plan = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-thomas-plan-parsed.json'));

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h\s*(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };

const weeks = plan.weeks || [];
console.log('Nb semaines:', weeks.length);
console.log('Periodization phases:', plan.generationContext.periodizationPlan.weeklyPhases);
console.log('Periodization vols:', plan.generationContext.periodizationPlan.weeklyVolumes);
console.log();

// Tableau par semaine
console.log('| W | Phase | Vol prévu | Vol réel (km) | Durée tot | Nb sess | Types | SL km / dur / pace | Vol/SL% |');
console.log('|---|-------|-----------|---------------|-----------|---------|-------|--------------------|---------|');
for (let i = 0; i < weeks.length; i++) {
  const w = weeks[i];
  const sessions = w.sessions || [];
  const courseSess = sessions.filter(s => s.type !== 'Renforcement' && s.type !== 'Renfo' && s.type !== 'Repos');
  const vols = courseSess.reduce((s, x) => s + kmOf(x), 0);
  const totalDur = sessions.reduce((s, x) => s + durMin(x.duration), 0);
  const types = sessions.map(s => s.type || '?').join(', ');
  // Trouver SL (la plus longue)
  let sl = null;
  for (const s of courseSess) {
    if (!sl || kmOf(s) > kmOf(sl)) sl = s;
  }
  const slKm = sl ? kmOf(sl) : 0;
  const slDur = sl ? sl.duration : '?';
  const slPace = sl ? (sl.pace || '?') : '?';
  const slPct = vols > 0 ? Math.round(slKm / vols * 100) : 0;
  console.log(`| ${(i+1).toString().padStart(2)} | ${w.phase || '?'} | ${plan.generationContext.periodizationPlan.weeklyVolumes[i]} | ${vols.toFixed(1)} | ${totalDur}m | ${sessions.length} | ${types} | ${slKm}km / ${slDur} / ${slPace} | ${slPct}% |`);
}

// Détail séances S1
console.log('\n\n=== DETAIL S1 ===');
const s1 = (weeks[0]?.sessions) || [];
for (const s of s1) {
  console.log(JSON.stringify(s, null, 2));
}
