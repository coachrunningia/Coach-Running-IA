// ============================================================================
// Test E2E R2 — applyR2Gates + estimation s1Volume des callers (post-fixes)
// ============================================================================
// Reproduit fidèlement le code après fixes Bug 1 / 2 / 3
// Source : src/services/feasibilityService.ts
// ============================================================================

const R2_GATES_ENABLED = true;

function applyR2Gates(ctx) {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons = [];
  let scorePenalty = 0;
  let irrealisticCap;

  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const isCourt = ctx.distanceKm < 30;
    const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
    // Règle 1 — BUG 2 FIX : coef ultra 0.65 → 0.50
    const r1Coef = isCourt ? 0.45 : isMoyen ? 0.55 : 0.50;
    const r1Min = r1Coef * ctx.raceDplus * ctx.planWeeks;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m`);
    }
    // Règle 2
    if (ctx.currentElev > 0) {
      const ratio = ctx.raceDplus / ctx.currentElev;
      if (ratio > 40) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push(`Ratio D+ race/actuel ${ratio.toFixed(0)}× > 40`); }
      else if (ratio > 25) { scorePenalty += 25; reasons.push(`Ratio D+ ${ratio.toFixed(0)}× > 25`); }
      else if (ratio > 15) { scorePenalty += 10; reasons.push(`Ratio D+ ${ratio.toFixed(0)}× > 15`); }
    } else if (ctx.raceDplus >= 500) { scorePenalty += 15; reasons.push(`D+ actuel non déclaré pour race ${ctx.raceDplus}m`); }
    // Règle 3
    if (ctx.currentVolume > 0) {
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const s = isCourt ? { irr: 0.50, amb: 0.65 } : isMoyen ? { irr: 0.40, amb: 0.50 } : { irr: 0.30, amb: 0.40 };
      if (ratioVol < s.irr) { irrealisticCap = Math.min(irrealisticCap ?? 100, 10); reasons.push(`Vol ${ctx.currentVolume}km < ${s.irr}× race`); }
      else if (ratioVol < s.amb) { scorePenalty += 20; reasons.push(`Vol ${ctx.currentVolume}km < ${s.amb}× race`); }
    }
  }
  // Règle 4 — Saut S0→S1
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sautPct > 0.50 || sautAbs > 15) {
      irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
      reasons.push(`Saut S0→S1 ${ctx.currentVolume}→${ctx.s1Volume}km (${(sautPct*100).toFixed(0)}%, +${sautAbs}km)`);
    } else if (sautPct > 0.30) {
      scorePenalty += 10;
      reasons.push(`Saut S0→S1 ${ctx.currentVolume}→${ctx.s1Volume}km (+${(sautPct*100).toFixed(0)}%)`);
    }
  }
  // Règle 6 — BUG 3 FIX : .includes('Expert') au lieu de === strict
  if (ctx.level.includes('Expert') && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push(`Expert déclaré sans chrono + vol ${ctx.currentVolume}km/sem < 40`);
  }
  return { irrealisticCap, scorePenalty, reasons };
}

// Reproduction de calculateWeekTargetElevation (planUtils.ts:106)
function calculateWeekTargetElevation(weekNumber, totalWeeks, raceElevation, level, currentWeeklyElevation, phase) {
  if (!raceElevation) return 0;
  const lvl = level.toLowerCase();
  const isDeb = lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');
  const maxWeekly = isDeb ? Math.min(raceElevation, 800) : isInter ? Math.min(raceElevation, 1500) : isConf ? Math.min(raceElevation, 2500) : Math.min(raceElevation, 3500);
  const defaultStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
  const maxStart = Math.min(1500, Math.round(maxWeekly * 0.60));
  const minStart = Math.round(raceElevation * 0.15);
  const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0 ? Math.min(currentWeeklyElevation, maxStart) : Math.min(defaultStart, maxStart);
  const startElev = Math.max(rawStart, Math.min(minStart, maxStart));
  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  let target = Math.round(startElev + (maxWeekly - startElev) * progress);
  if (phase && phase.includes('recov')) target = Math.round(target * 0.55);
  else if (phase && (phase.includes('affut') || phase.includes('taper'))) {
    const remaining = totalWeeks - weekNumber;
    const factor = remaining <= 0 ? 0.40 : remaining === 1 ? 0.50 : 0.70;
    target = Math.round(target * factor);
  }
  return target;
}

// Reproduction du caller calculateFeasibility lines 657-695 + buildFinisherFeasibility 1039-1075 (POST FIX)
function simulateE2E(p) {
  const distanceKm = p.distanceKm;
  const isTrail = p.isTrail;
  const isMarathon = distanceKm >= 42;
  const isSemi = distanceKm >= 21 && distanceKm < 42;
  // BUG 1 FIX : estimation s1Volume
  const peakVolEst = distanceKm ? (isMarathon ? 60 : isSemi ? 45 : isTrail && distanceKm >= 60 ? 70 : isTrail && distanceKm >= 30 ? 55 : 35) : 35;
  const s1Vol = p.currentVolume > 0 ? Math.round(p.currentVolume * 1.10) : Math.round(peakVolEst * 0.30);
  // totalDplusCycle (recalculé à la volée comme dans le vrai code)
  let totalDplusCycle = 0;
  if (isTrail && p.raceDplus) {
    for (let i = 1; i <= p.planWeeks; i++) {
      totalDplusCycle += calculateWeekTargetElevation(i, p.planWeeks, p.raceDplus, p.level, p.currentElev, undefined);
    }
  }
  return applyR2Gates({
    isTrail,
    distanceKm,
    raceDplus: p.raceDplus ?? 0,
    planWeeks: p.planWeeks,
    currentVolume: p.currentVolume ?? 0,
    currentElev: p.currentElev ?? 0,
    s1Volume: s1Vol,
    totalDplusCycle,
    level: p.level || '',
    hasChrono: p.hasChrono,
  });
}

// ============================================================================
// 30 profils de test
// ============================================================================
const tests = [
  // --- Cas réels en base ---
  { name: 'Peterson trail 50/3500 11sem v31 D15 Expert (sans chrono)',
    p: { isTrail: true, distanceKm: 50, raceDplus: 3500, planWeeks: 11, currentVolume: 31, currentElev: 15, level: 'Expert (Performance)', hasChrono: false },
    expected: 'IRR (gate 2 ratio 233 + gate 6 Expert)' },
  { name: 'Valentine trail 20/1000 7sem v25 D600 Inter chrono',
    p: { isTrail: true, distanceKm: 20, raceDplus: 1000, planWeeks: 7, currentVolume: 25, currentElev: 600, level: 'Intermédiaire (Régulier)', hasChrono: true },
    expected: 'PASS (calibrage OK)' },
  { name: 'Pollin trail 17/200 16sem v15 D50 Inter chrono',
    p: { isTrail: true, distanceKm: 17, raceDplus: 200, planWeeks: 16, currentVolume: 15, currentElev: 50, level: 'Intermédiaire (Régulier)', hasChrono: true },
    expected: 'PASS' },
  { name: 'Romain trail 25/1900 12sem v40 D1000 Expert chrono',
    p: { isTrail: true, distanceKm: 25, raceDplus: 1900, planWeeks: 12, currentVolume: 40, currentElev: 1000, level: 'Expert (Performance)', hasChrono: true },
    expected: 'PASS ou pen léger (ratio 1.9 OK, vol 1.6 OK)' },
  { name: 'Aureline trail 6/150 7sem v0 D0 Débutante',
    p: { isTrail: true, distanceKm: 6, raceDplus: 150, planWeeks: 7, currentVolume: 0, currentElev: 0, level: 'Débutant (0-1 an)', hasChrono: false },
    expected: 'PASS gates R2 (autre garde-fou s\'occupe : getMinimumWeeksForBeginnerVolZero)' },
  // --- Ultra trail post-Bug 2 ---
  { name: 'Ultra 100/5000 24sem v50 D1500 Expert chrono (post-fix coef 0.50)',
    p: { isTrail: true, distanceKm: 100, raceDplus: 5000, planWeeks: 24, currentVolume: 50, currentElev: 1500, level: 'Expert (Performance)', hasChrono: true },
    expected: 'PASS attendu (avant fix : IRR injustifié)' },
  { name: 'Ultra 80/4000 20sem v45 D1200 Expert chrono',
    p: { isTrail: true, distanceKm: 80, raceDplus: 4000, planWeeks: 20, currentVolume: 45, currentElev: 1200, level: 'Expert (Performance)', hasChrono: true },
    expected: 'PASS attendu' },
  // --- Saut volume route post-Bug 1 ---
  { name: 'Marathon ambitieux v5 16sem (saut v5→s1=5.5 OK)',
    p: { isTrail: false, distanceKm: 42, raceDplus: 0, planWeeks: 16, currentVolume: 5, currentElev: 0, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'PASS (saut +10% léger)' },
  { name: 'Marathon vol 0 16sem Finisher (s1 estimé 30% de 60 = 18, saut depuis 0 → 0 car currentVol=0)',
    p: { isTrail: false, distanceKm: 42, raceDplus: 0, planWeeks: 16, currentVolume: 0, currentElev: 0, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'PASS gate 4 (currentVolume=0 → skip)' },
  { name: 'Semi vol 15 v15→s1=16.5 (saut +10%)',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 12, currentVolume: 15, currentElev: 0, level: 'Intermédiaire (Régulier)', hasChrono: true },
    expected: 'PASS' },
  // --- Expert non validé Bug 3 fix ---
  { name: 'Expert (Performance) sans chrono vol 30 → gate 6',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 16, currentVolume: 30, currentElev: 0, level: 'Expert (Performance)', hasChrono: false },
    expected: 'pen -20 (gate 6)' },
  { name: 'Expert (court) sans chrono vol 30 — variant texte',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 16, currentVolume: 30, currentElev: 0, level: 'Expert', hasChrono: false },
    expected: 'pen -20 (gate 6 fix .includes)' },
  { name: 'Expert avec chrono vol 30 → gate 6 skip',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 16, currentVolume: 30, currentElev: 0, level: 'Expert (Performance)', hasChrono: true },
    expected: 'PASS' },
  { name: 'Expert sans chrono vol 50 → gate 6 skip',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 16, currentVolume: 50, currentElev: 0, level: 'Expert (Performance)', hasChrono: false },
    expected: 'PASS' },
  // --- Edge cases ---
  { name: 'distanceKm = null + isTrail',
    p: { isTrail: true, distanceKm: null, raceDplus: 1000, planWeeks: 12, currentVolume: 30, currentElev: 200, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'PASS (gates 1-3 skip)' },
  { name: 'raceDplus = 0 + isTrail',
    p: { isTrail: true, distanceKm: 20, raceDplus: 0, planWeeks: 12, currentVolume: 30, currentElev: 200, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'PASS (gates trail skip)' },
  { name: 'planWeeks = 1 trail',
    p: { isTrail: true, distanceKm: 20, raceDplus: 1000, planWeeks: 1, currentVolume: 25, currentElev: 600, level: 'Intermédiaire (Régulier)', hasChrono: true },
    expected: '?' },
  { name: 'level vide string',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 12, currentVolume: 30, currentElev: 0, level: '', hasChrono: false },
    expected: 'PASS (pas crash)' },
  // --- Cas génériques ---
  { name: 'Trail court 10/100 12sem v30 D50 Inter chrono',
    p: { isTrail: true, distanceKm: 10, raceDplus: 100, planWeeks: 12, currentVolume: 30, currentElev: 50, level: 'Intermédiaire (Régulier)', hasChrono: true },
    expected: 'PASS' },
  { name: 'Trail moyen 35/2000 16sem v20 D300 Inter (ratio D+ 6.7 OK, vol 0.57 ≥0.50)',
    p: { isTrail: true, distanceKm: 35, raceDplus: 2000, planWeeks: 16, currentVolume: 20, currentElev: 300, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'gate 3 pen -20 ou gate 1 selon calcul' },
  { name: 'Saut vol absolu +20 (10→30)',
    p: { isTrail: false, distanceKm: 21, raceDplus: 0, planWeeks: 12, currentVolume: 10, currentElev: 0, level: 'Intermédiaire (Régulier)', hasChrono: false },
    expected: 'IRR (saut +110%, +1km abs... attends, le s1Vol = 10*1.10 = 11, donc saut +1km → PASS)' },
  // Ce dernier test est intéressant : après fix, s1Vol estime à v*1.10, donc saut limité, plus de gate IRR sur saut.
];

console.log('═'.repeat(125));
console.log(`  TEST E2E R2 — ${tests.length} profils (post-fixes Bug 1/2/3)`);
console.log('═'.repeat(125));
let pass = 0, fail = 0, edge = 0;
for (const t of tests) {
  const r = simulateE2E(t.p);
  const verdict = r.irrealisticCap !== undefined ? `IRR (cap ${r.irrealisticCap})` : r.scorePenalty > 0 ? `pen -${r.scorePenalty}` : 'PASS';
  console.log(`\n  ${t.name}`);
  console.log(`    attendu  : ${t.expected}`);
  console.log(`    résultat : ${verdict}`);
  if (r.reasons.length) for (const x of r.reasons) console.log(`               → ${x}`);
}

console.log(`\n${'═'.repeat(125)}`);
console.log('  RÉCAP : voir manuel par profil');
console.log('═'.repeat(125));
