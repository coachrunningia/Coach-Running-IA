// ============================================================================
// Test standalone du patch R2 (applyR2Gates) — feasibilityService.ts
// ============================================================================
// Reproduction fidèle de la fonction et de son contexte d'appel.
// Source : /Users/romanemarino/Coach-Running-IA/src/services/feasibilityService.ts
// lignes 207-312 (helper) + 657-689 (appel calculateFeasibility)
//                + 1039-1063 (appel buildFinisherFeasibility)
// ============================================================================

const R2_GATES_ENABLED = true;

function applyR2Gates(ctx) {
  if (!R2_GATES_ENABLED) return { scorePenalty: 0, reasons: [] };
  const reasons = [];
  let scorePenalty = 0;
  let irrealisticCap;

  // --- Trail gates (1,2,3) ---
  if (ctx.isTrail && ctx.raceDplus > 0 && ctx.distanceKm !== null) {
    const isCourt = ctx.distanceKm < 30;
    const isMoyen = ctx.distanceKm >= 30 && ctx.distanceKm < 60;
    const isUltra = ctx.distanceKm >= 60;

    // Règle 1 — Total D+ cycle insuffisant
    const r1Coef = isCourt ? 0.45 : isMoyen ? 0.55 : 0.65;
    const r1Min = r1Coef * ctx.raceDplus * ctx.planWeeks;
    if (ctx.totalDplusCycle > 0 && ctx.totalDplusCycle < r1Min) {
      irrealisticCap = 10;
      reasons.push(`D+ cycle projeté ${ctx.totalDplusCycle}m < min ${Math.round(r1Min)}m (${Math.round(r1Coef*100)}% race × N sem)`);
    }

    // Règle 2 — Ratio D+ actuel/race
    if (ctx.currentElev > 0) {
      const ratioDplus = ctx.raceDplus / ctx.currentElev;
      if (ratioDplus > 40) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}x > 40 (hors fenetre prep)`);
      } else if (ratioDplus > 25) {
        scorePenalty += 25;
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}x > 25 (ambitieux)`);
      } else if (ratioDplus > 15) {
        scorePenalty += 10;
        reasons.push(`Ratio D+ race/actuel ${ratioDplus.toFixed(0)}x > 15 (vigilance)`);
      }
    } else if (ctx.raceDplus >= 500) {
      scorePenalty += 15;
      reasons.push(`D+ hebdo actuel non declare pour course ${ctx.raceDplus}m D+`);
    }

    // Règle 3 — Ratio vol actuel/race modulé par distance
    if (ctx.currentVolume > 0) {
      const ratioVol = ctx.currentVolume / ctx.distanceKm;
      const seuils = isCourt ? { irr: 0.50, amb: 0.65 }
        : isMoyen ? { irr: 0.40, amb: 0.50 }
        : { irr: 0.30, amb: 0.40 };
      if (ratioVol < seuils.irr) {
        irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem trop faible vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.irr})`);
      } else if (ratioVol < seuils.amb) {
        scorePenalty += 20;
        reasons.push(`Vol actuel ${ctx.currentVolume}km/sem juste vs race ${ctx.distanceKm}km (ratio ${ratioVol.toFixed(2)} < ${seuils.amb})`);
      }
    }
  }

  // --- Règle 4 : saut vol S0->S1 (toutes distances) ---
  if (ctx.currentVolume > 0 && ctx.s1Volume > 0) {
    const sautAbs = ctx.s1Volume - ctx.currentVolume;
    const sautPct = (ctx.s1Volume / ctx.currentVolume) - 1;
    if (sautPct > 0.50 || sautAbs > 15) {
      irrealisticCap = Math.min(irrealisticCap ?? 100, 10);
      reasons.push(`Saut S0->S1 trop violent : ${ctx.currentVolume}km -> ${ctx.s1Volume}km (${(sautPct*100).toFixed(0)}%, +${sautAbs}km)`);
    } else if (sautPct > 0.30) {
      scorePenalty += 10;
      reasons.push(`Saut S0->S1 limite : ${ctx.currentVolume}km -> ${ctx.s1Volume}km (+${(sautPct*100).toFixed(0)}%)`);
    }
  }

  // --- Règle 6 : Expert non validé ---
  if (ctx.level === 'Expert (Performance)' && !ctx.hasChrono && ctx.currentVolume > 0 && ctx.currentVolume < 40) {
    scorePenalty += 20;
    reasons.push(`Niveau "Expert" declare mais aucun chrono valide + volume ${ctx.currentVolume}km/sem (< 40 attendu)`);
  }

  return { irrealisticCap, scorePenalty, reasons };
}

// ---------------------------------------------------------------------------
// Reproduction du calculateWeekTargetElevation (planUtils.ts:106-157)
// ---------------------------------------------------------------------------
function calculateWeekTargetElevation(weekNumber, totalWeeks, raceElevation, level, currentWeeklyElevation, phase) {
  if (!raceElevation || isNaN(raceElevation)) return 0;
  const lvl = (level || '').toLowerCase();
  const isDeb = lvl === 'deb' || lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl === 'inter' || lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl === 'conf' || lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');
  const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800)
    : isInter ? Math.min(raceElevation, 1500)
    : isConf ? Math.min(raceElevation, 2500)
    : Math.min(raceElevation, 3500);
  const defaultStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
  const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
  const minStartElevation = Math.round(raceElevation * 0.15);
  const rawStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? Math.min(currentWeeklyElevation, maxStart)
    : Math.min(defaultStart, maxStart);
  const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));
  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  let target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
  const p = (phase || '').toLowerCase();
  if (p.includes('recup') || p.includes('récup')) target = Math.round(target * 0.55);
  else if (p.includes('affut') || p.includes('affût') || p.includes('taper')) {
    const remainingWeeks = totalWeeks - weekNumber;
    const affutageReduction = remainingWeeks <= 0 ? 0.40 : remainingWeeks === 1 ? 0.50 : 0.70;
    target = Math.round(target * affutageReduction);
  }
  return target;
}

function totalCycleDplus(planWeeks, raceElevation, level, currentWeeklyElevation) {
  let total = 0;
  for (let i = 1; i <= planWeeks; i++) {
    total += calculateWeekTargetElevation(i, planWeeks, raceElevation, level, currentWeeklyElevation, undefined);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
const results = [];

function runProfile(name, expected, ctx) {
  // Patch : calculer totalDplusCycle automatiquement si pas explicite
  if (ctx.isTrail && ctx.raceDplus > 0 && ctx._autoTotal !== false) {
    ctx.totalDplusCycle = totalCycleDplus(ctx.planWeeks, ctx.raceDplus, ctx.level, ctx.currentElev);
  }
  const r = applyR2Gates(ctx);
  const verdict = {
    name,
    expected,
    irrealisticCap: r.irrealisticCap,
    scorePenalty: r.scorePenalty,
    reasons: r.reasons,
    totalDplusCycle: ctx.totalDplusCycle,
  };
  results.push(verdict);
  return verdict;
}

// ====================================================================
// PROFILS TRAIL
// ====================================================================

// 1) Peterson : trail 50km/3500D+, 11 sem, vol 31, D+ 15/sem, Expert sans chrono
runProfile('Peterson (trail 50km/3500D+ 11sem v31/D15 Expert)', {
  irrealisticCap: 'attendu (gate 2 ratio 233x, gate 6 Expert)',
}, {
  isTrail: true, distanceKm: 50, raceDplus: 3500, planWeeks: 11,
  currentVolume: 31, currentElev: 15,
  s1Volume: 31,
  level: 'Expert (Performance)', hasChrono: false,
});

// 2) Valentine : trail 20km/1000D+, 7 sem, vol 25, D+ 600, Inter, chrono
runProfile('Valentine (trail 20km/1000D+ 7sem v25/D600 Inter chrono)', {
  pass: 'attendu (calibrage OK)',
}, {
  isTrail: true, distanceKm: 20, raceDplus: 1000, planWeeks: 7,
  currentVolume: 25, currentElev: 600,
  s1Volume: 25,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 3) Aureline : trail 6km/150D+, 7 sem, vol 0, D+ 0, Débutante
runProfile('Aureline (trail 6km/150D+ 7sem vol 0 Deb)', {
  noGate: 'attendu (s1=0 + currentVol=0 -> gate 4 skip)',
}, {
  isTrail: true, distanceKm: 6, raceDplus: 150, planWeeks: 7,
  currentVolume: 0, currentElev: 0,
  s1Volume: 0,
  level: 'Débutant (0-1 an)', hasChrono: false,
});

// 4) Pollin : trail 17km/200D+, 16 sem, vol 15, D+ 50, Inter chrono
runProfile('Pollin (trail 17km/200D+ 16sem v15/D50 Inter chrono)', {
  pass: 'attendu (calibrage OK)',
}, {
  isTrail: true, distanceKm: 17, raceDplus: 200, planWeeks: 16,
  currentVolume: 15, currentElev: 50,
  s1Volume: 15,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 5) Romain : trail 25km/1900D+, 12 sem, vol 40, D+ 1000, Expert chrono
runProfile('Romain (trail 25km/1900D+ 12sem v40/D1000 Expert chrono)', {
  check: 'attendu PASS (ratio D+ 1.9 < 15, ratio vol 1.6)',
}, {
  isTrail: true, distanceKm: 25, raceDplus: 1900, planWeeks: 12,
  currentVolume: 40, currentElev: 1000,
  s1Volume: 40,
  level: 'Expert (Performance)', hasChrono: true,
});

// 6) Trail ultra : trail 100km/5000D+, 24 sem, vol 50, D+ 1500, Expert
runProfile('Trail ultra (100km/5000D+ 24sem v50/D1500 Expert chrono)', {
  check: 'attendu PASS proche (ratios ultra)',
}, {
  isTrail: true, distanceKm: 100, raceDplus: 5000, planWeeks: 24,
  currentVolume: 50, currentElev: 1500,
  s1Volume: 50,
  level: 'Expert (Performance)', hasChrono: true,
});

// 7) Trail léger plat : trail 10km/100D+, 12 sem, vol 30, D+ 50, Inter
runProfile('Trail leger plat (10km/100D+ 12sem v30/D50 Inter)', {
  pass: 'attendu (ratios OK trail court)',
}, {
  isTrail: true, distanceKm: 10, raceDplus: 100, planWeeks: 12,
  currentVolume: 30, currentElev: 50,
  s1Volume: 30,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// ====================================================================
// PROFILS ROUTE
// ====================================================================

// 8) Fred : semi 2h00, 20 sem, vol 0, Inter chrono
runProfile('Fred (semi 2h00 20sem vol 0 Inter chrono)', {
  noGate: 'attendu (currentVol=0 -> gate 4 skip)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 20,
  currentVolume: 0, currentElev: 0,
  s1Volume: 0,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 9) Marathon ambitieux : Marathon 3h00, 16 sem, vol 30, Inter chrono, s1=33
runProfile('Marathon ambitieux (3h00 16sem v30 Inter chrono s1=33)', {
  check: 'attendu PASS (saut +10% OK)',
}, {
  isTrail: false, distanceKm: 42.2, raceDplus: 0, planWeeks: 16,
  currentVolume: 30, currentElev: 0,
  s1Volume: 33,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 10) Saut massif route : Marathon 4h, 16 sem, vol 5, Inter, s1=30
runProfile('Saut massif (M 4h00 16sem v5 Inter s1=30)', {
  irrealisticCap: 'attendu (gate 4 +500%)',
}, {
  isTrail: false, distanceKm: 42.2, raceDplus: 0, planWeeks: 16,
  currentVolume: 5, currentElev: 0,
  s1Volume: 30,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 11) Expert non validé route : semi 1h30, 12 sem, vol 30, Expert SANS chrono
runProfile('Expert non valide route (semi 1h30 12sem v30 Expert no chrono)', {
  penalty: 'attendu -20 (gate 6)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 30, currentElev: 0,
  s1Volume: 30,
  level: 'Expert (Performance)', hasChrono: false,
});

// ====================================================================
// EDGE CASES
// ====================================================================

// 12) currentVolume = 0 (Finisher) : gate 4 NE PAS s'activer
runProfile('EDGE: currentVol=0 (gate 4 skip)', {
  noGate4: 'attendu (currentVol=0)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 10,
  currentVolume: 0, currentElev: 0,
  s1Volume: 25,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 13) raceDplus = 0 sur plan trail : gates 1-3 NE PAS s'activer
runProfile('EDGE: trail raceDplus=0 (gates 1-3 skip)', {
  noTrailGate: 'attendu',
}, {
  isTrail: true, distanceKm: 20, raceDplus: 0, planWeeks: 10,
  currentVolume: 10, currentElev: 0,
  s1Volume: 10,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 14) distanceKm = null : gates 1-3 NE PAS s'activer
runProfile('EDGE: distanceKm=null (gates 1-3 skip)', {
  noTrailGate: 'attendu',
}, {
  isTrail: true, distanceKm: null, raceDplus: 1500, planWeeks: 10,
  currentVolume: 20, currentElev: 50,
  s1Volume: 20,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 15) planWeeks = 1 : totalDplusCycle correct ?
runProfile('EDGE: planWeeks=1 (calcul totalDplus)', {
  check: 'totalDplus calculé sur 1 sem',
}, {
  isTrail: true, distanceKm: 50, raceDplus: 3000, planWeeks: 1,
  currentVolume: 30, currentElev: 200,
  s1Volume: 30,
  level: 'Expert (Performance)', hasChrono: true,
});

// 16) level = "Expert" (sans suffixe) vs "expert" lowercase
runProfile('EDGE: level="Expert" (sans suffixe) -> doit NE PAS matcher gate 6', {
  noGate6: 'attendu (string strict)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 20, currentElev: 0,
  s1Volume: 20,
  level: 'Expert', hasChrono: false,
});

runProfile('EDGE: level="expert" lowercase', {
  noGate6: 'attendu (string strict, doctrine pas matcher)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 20, currentElev: 0,
  s1Volume: 20,
  level: 'expert', hasChrono: false,
});

// 17) level = "" (vide)
runProfile('EDGE: level="" (vide) pas de crash', {
  noCrash: 'attendu',
}, {
  isTrail: false, distanceKm: 10, raceDplus: 0, planWeeks: 8,
  currentVolume: 15, currentElev: 0,
  s1Volume: 15,
  level: '', hasChrono: false,
});

// 18) Trail très court + D+ élevé (ratio D+/km > 80 = trail technique)
runProfile('Trail court technique (trail 15km/1500D+ 12sem v20/D100 Inter)', {
  check: 'gate 2 ratio 15x exactement (limite)',
}, {
  isTrail: true, distanceKm: 15, raceDplus: 1500, planWeeks: 12,
  currentVolume: 20, currentElev: 100,
  s1Volume: 20,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 19) Cas D+ actuel = 0 mais raceDplus < 500 (ne déclenche PAS -15)
runProfile('Trail D+actuel=0 raceDplus=300 (pas de pen -15)', {
  noPenalty: 'attendu',
}, {
  isTrail: true, distanceKm: 20, raceDplus: 300, planWeeks: 12,
  currentVolume: 25, currentElev: 0,
  s1Volume: 25,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 20) Cas D+ actuel = 0 + raceDplus >= 500 (déclenche -15)
runProfile('Trail D+actuel=0 raceDplus=800 (pen -15 gate 2bis)', {
  penalty: 'attendu -15',
}, {
  isTrail: true, distanceKm: 20, raceDplus: 800, planWeeks: 12,
  currentVolume: 25, currentElev: 0,
  s1Volume: 25,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 21) Cap saut absolu (vol 10 -> s1 30 = +200% ET +20km absolu)
runProfile('Saut absolu (vol 10 -> s1 30 = +20km)', {
  irrealisticCap: 'attendu (sautAbs>15)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 10, currentElev: 0,
  s1Volume: 30,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 22) Saut 30->46 (+53% mais +16km) = IRR via 2 conditions
runProfile('Saut 30->46 (+53% +16km cap absolu)', {
  irrealisticCap: 'attendu',
}, {
  isTrail: false, distanceKm: 42.2, raceDplus: 0, planWeeks: 16,
  currentVolume: 30, currentElev: 0,
  s1Volume: 46,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 23) Saut 50->66 (+32% mais +16km) = IRR par sautAbs>15
runProfile('Saut 50->66 (+32% +16km)', {
  irrealisticCap: 'attendu (sautAbs>15 meme si pct<50)',
}, {
  isTrail: false, distanceKm: 42.2, raceDplus: 0, planWeeks: 16,
  currentVolume: 50, currentElev: 0,
  s1Volume: 66,
  level: 'Confirmé (Compétition)', hasChrono: true,
});

// 24) Saut 30->40 (+33%) = pénalité -10
runProfile('Saut 30->40 (+33%) -> pen -10', {
  penalty: 'attendu -10',
}, {
  isTrail: false, distanceKm: 42.2, raceDplus: 0, planWeeks: 16,
  currentVolume: 30, currentElev: 0,
  s1Volume: 40,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 25) Saut négatif (vol 30 -> s1 20)
runProfile('Saut negatif (vol 30 -> s1 20)', {
  noGate: 'attendu (pas de saut, regression)',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 30, currentElev: 0,
  s1Volume: 20,
  level: 'Intermédiaire (Régulier)', hasChrono: true,
});

// 26) Expert avec vol >= 40 (gate 6 NE PAS s'activer)
runProfile('Expert sans chrono vol=40 (gate 6 skip)', {
  noGate6: 'attendu',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 40, currentElev: 0,
  s1Volume: 40,
  level: 'Expert (Performance)', hasChrono: false,
});

// 27) Expert avec chrono (gate 6 NE PAS s'activer)
runProfile('Expert avec chrono vol=20 (gate 6 skip car hasChrono)', {
  noGate6: 'attendu',
}, {
  isTrail: false, distanceKm: 21.1, raceDplus: 0, planWeeks: 12,
  currentVolume: 20, currentElev: 0,
  s1Volume: 20,
  level: 'Expert (Performance)', hasChrono: true,
});

// ====================================================================
// AFFICHAGE
// ====================================================================
console.log('='.repeat(80));
console.log('TESTS R2 GATES — Coach Running IA (commit 75d5884)');
console.log('='.repeat(80));

let pass = 0, fail = 0, edge = 0;

for (const r of results) {
  console.log('\n--- ' + r.name);
  console.log('  expected   :', JSON.stringify(r.expected));
  console.log('  totalDplus :', r.totalDplusCycle);
  console.log('  irrealCap  :', r.irrealisticCap === undefined ? 'none' : r.irrealisticCap);
  console.log('  penalty    :', r.scorePenalty);
  if (r.reasons.length === 0) console.log('  reasons    : (none)');
  else r.reasons.forEach(reason => console.log('    - ' + reason));
}

console.log('\n' + '='.repeat(80));
console.log(`Total profils : ${results.length}`);
console.log('='.repeat(80));

// EXTRA — Cas additionnel
console.log('\n\nEXTRA — Débutant trail 30km/1500D+ 12sem v20/D100');
const extra = applyR2Gates({
  isTrail: true, distanceKm: 30, raceDplus: 1500, planWeeks: 12,
  currentVolume: 20, currentElev: 100,
  s1Volume: 20,
  totalDplusCycle: totalCycleDplus(12, 1500, 'Débutant (0-1 an)', 100),
  level: 'Débutant (0-1 an)', hasChrono: false,
});
console.log('  irrealCap :', extra.irrealisticCap);
console.log('  penalty   :', extra.scorePenalty);
extra.reasons.forEach(r => console.log('  -', r));
