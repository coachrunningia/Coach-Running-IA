// 6 profils précis du coach UTMB Academy — validation finale R2 v2
const R2_GATES_ENABLED = true;
function applyR2Gates(ctx) {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons = []; let scorePenalty = 0; let irrealisticCap;
  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const isCourt = ctx.distanceKm < 30, isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
    const r1Mult = ctx.distanceKm < 20 ? 5 : ctx.distanceKm < 50 ? 4 : ctx.distanceKm < 100 ? 3.5 : 3;
    const r1Min = r1Mult * ctx.raceDplus;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) { irrealisticCap = 10; reasons.push(`g1: D+ cycle ${ctx.totalDplusCycle}<${Math.round(r1Min)} (${r1Mult}×)`); }
    if (ctx.currentElev > 0) {
      const ratio = ctx.raceDplus / ctx.currentElev;
      if (ratio > 40) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push(`g2: ratio ${ratio.toFixed(0)}×>40`); }
      else if (ratio > 25) { scorePenalty += 25; reasons.push(`g2: ratio ${ratio.toFixed(0)}×>25`); }
      else if (ratio > 15) { scorePenalty += 10; reasons.push(`g2: ratio ${ratio.toFixed(0)}×>15`); }
    } else if (ctx.raceDplus >= 500) { scorePenalty += 15; reasons.push(`g2bis: D+actuel=0`); }
    if (ctx.currentVolume > 0) {
      const r = ctx.currentVolume / ctx.distanceKm;
      const s = isCourt ? { irr: 0.50, amb: 0.65 } : isMoyen ? { irr: 0.40, amb: 0.50 } : { irr: 0.30, amb: 0.40 };
      if (r < s.irr) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push(`g3: vol ${ctx.currentVolume}<${s.irr}×race`); }
      else if (r < s.amb) { scorePenalty += 20; reasons.push(`g3: vol ${ctx.currentVolume}<${s.amb}×race`); }
    }
  }
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sa = ctx.s1Volume - ctx.currentVolume, sp = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sp > 0.50 || sa > 15) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push(`g4: saut +${(sp*100).toFixed(0)}%`); }
    else if (sp > 0.30) { scorePenalty += 10; reasons.push(`g4: saut +${(sp*100).toFixed(0)}%`); }
  }
  if (ctx.level.includes('Expert') && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) { scorePenalty += 20; reasons.push(`g6: Expert sans chrono v${ctx.currentVolume}<40`); }
  return { irrealisticCap, scorePenalty, reasons };
}
function calcWeekDplus(wn, total, race, level, cur) {
  if (!race) return 0;
  const l = level.toLowerCase();
  const isDeb = l.includes('débutant')||l.includes('debutant');
  const isInter = l.includes('intermédiaire')||l.includes('intermediaire');
  const isConf = l.includes('confirmé')||l.includes('confirme')||l.includes('compétition');
  const maxW = isDeb ? Math.min(race,800) : isInter ? Math.min(race,1500) : isConf ? Math.min(race,2500) : Math.min(race,3500);
  const defStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
  const maxStart = Math.min(1500, Math.round(maxW*0.60));
  const minStart = Math.round(race*0.15);
  const raw = cur && cur>0 ? Math.min(cur,maxStart) : Math.min(defStart,maxStart);
  const start = Math.max(raw, Math.min(minStart, maxStart));
  const prog = Math.min(1, (wn-1)/Math.max(1,total-1));
  return Math.round(start + (maxW - start) * prog);
}
function sim(p) {
  const dk = p.distanceKm, isT = p.isTrail;
  const peak = dk ? (isT && dk>=60 ? 70 : isT && dk>=30 ? 55 : 35) : 35;
  const s1 = p.currentVolume>0 ? Math.round(p.currentVolume*1.10) : Math.round(peak*0.30);
  let tot = 0;
  if (isT && p.raceDplus) for (let i=1;i<=p.planWeeks;i++) tot += calcWeekDplus(i, p.planWeeks, p.raceDplus, p.level, p.currentElev);
  return { res: applyR2Gates({ isTrail:isT, distanceKm:dk, raceDplus:p.raceDplus??0, planWeeks:p.planWeeks, currentVolume:p.currentVolume??0, currentElev:p.currentElev??0, s1Volume:s1, totalDplusCycle:tot, level:p.level||'', hasChrono:p.hasChrono }), s1, totalCycle:tot };
}

// 6 profils du coach UTMB Academy
const tests = [
  { n: '1. TRAIL DÉBUTANT PETIT VOLUME (Déb v5 D50 trail 10/300 12sem)',
    p: { isTrail:true, distanceKm:10, raceDplus:300, planWeeks:12, currentVolume:5, currentElev:50, level:'Débutant (0-1 an)', hasChrono:false },
    expected: 'pen-20 (saut g4 + ratios)' },
  { n: '2. TRAIL INTERMÉDIAIRE 25KM (Inter v25 D300 trail 25/800 12sem)',
    p: { isTrail:true, distanceKm:25, raceDplus:800, planWeeks:12, currentVolume:25, currentElev:300, level:'Intermédiaire (Régulier)', hasChrono:false },
    expected: 'PASS (ratios sains)' },
  { n: '3. TRAIL PERFORMANT 45KM (Conf v45 D800 trail 45/2500 16sem)',
    p: { isTrail:true, distanceKm:45, raceDplus:2500, planWeeks:16, currentVolume:45, currentElev:800, level:'Confirmé (Compétition)', hasChrono:true },
    expected: 'PASS (profil propre)' },
  { n: '4. ULTRA 75KM (Conf v50 D1200 ultra 75/3500 20sem)',
    p: { isTrail:true, distanceKm:75, raceDplus:3500, planWeeks:20, currentVolume:50, currentElev:1200, level:'Confirmé (Compétition)', hasChrono:true },
    expected: 'pen-10 (g3 limite ou g1 juste)' },
  { n: '5. ULTRA 100KM (Expert v60 D1800 ultra 100/5000 24sem)',
    p: { isTrail:true, distanceKm:100, raceDplus:5000, planWeeks:24, currentVolume:60, currentElev:1800, level:'Expert (Performance)', hasChrono:true },
    expected: 'PASS (référence saine)' },
  { n: '6. ULTRA 150KM (Expert v70 D2500 ultra 150/8000 30sem)',
    p: { isTrail:true, distanceKm:150, raceDplus:8000, planWeeks:30, currentVolume:70, currentElev:2500, level:'Expert (Performance)', hasChrono:true },
    expected: 'pen-10 à PASS (g3 ratio 0.47<0.50 → pen-20 si trail moyen, sinon PASS)' },
];

console.log('═'.repeat(120));
console.log('  TEST 6 PROFILS COACH UTMB ACADEMY — Garde-fou avant deploy R2 v2');
console.log('═'.repeat(120));
for (const t of tests) {
  const { res, s1, totalCycle } = sim(t.p);
  const v = res.irrealisticCap !== undefined ? `🔴 IRR(${res.irrealisticCap})` : res.scorePenalty > 0 ? `🟡 pen-${res.scorePenalty}` : '✅ PASS';
  console.log(`\n  ${t.n}`);
  console.log(`    s1Vol estimé : ${s1} km  |  totalDplusCycle projeté : ${totalCycle}m`);
  console.log(`    Verdict      : ${v}`);
  console.log(`    Attendu coach : ${t.expected}`);
  if (res.reasons.length) console.log(`    Raisons      : ${res.reasons.join(' | ')}`);
}
console.log(`\n${'═'.repeat(120)}`);
