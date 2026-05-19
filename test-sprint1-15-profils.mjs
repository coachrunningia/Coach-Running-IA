// Test Sprint 1 (commit 0435796) sur 15 profils variés
// Reproduit les fonctions clés post-fixes #1+#2+#4+#5a+#6 de planUtils.ts + geminiService.ts
// Date: 2026-05-19

// ============================================
// REPRODUCTION DES FONCTIONS CLÉS (lecture seule code source)
// ============================================

// --- planUtils.ts : calculateWeekTargetElevation (post fix #1+#2) ---
function calculateWeekTargetElevation(weekNumber, totalWeeks, raceElevation, level, currentWeeklyElevation, phase) {
  if (!raceElevation || isNaN(raceElevation)) return 0;
  const lvl = level.toLowerCase();
  const isDeb = lvl === 'deb' || lvl.includes('débutant') || lvl.includes('debutant');
  const isInter = lvl === 'inter' || lvl.includes('intermédiaire') || lvl.includes('intermediaire');
  const isConf = lvl === 'conf' || lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');

  // Fix #1 — Caps niveaux Master/Expert.
  const maxWeeklyElevation =
    isDeb ? Math.min(raceElevation, 800) :
    isInter ? Math.min(raceElevation, 1500) :
    isConf ? Math.min(raceElevation, 4500) :
    Math.min(raceElevation, 6500); // Expert

  const defaultStart =
    isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;

  // Fix #2 — Floor 100% du currentWeeklyElevation user.
  const maxStart = Math.min(3500, Math.round(maxWeeklyElevation * 0.60));
  const minStartElevation = Math.round(raceElevation * 0.15);
  const idealStart = currentWeeklyElevation && currentWeeklyElevation > 0
    ? currentWeeklyElevation
    : defaultStart;
  const startElevation = Math.max(
    idealStart,
    Math.min(minStartElevation, maxStart),
  );

  const progress = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 1));
  let target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);

  const p = (phase || '').toLowerCase();
  if (p.includes('recup') || p.includes('récup')) {
    target = Math.round(target * 0.55);
  } else if (p.includes('affut') || p.includes('affût') || p.includes('taper')) {
    const remainingWeeks = totalWeeks - weekNumber;
    const affutageReduction = remainingWeeks <= 0 ? 0.40
      : remainingWeeks === 1 ? 0.50
      : 0.70;
    target = Math.round(target * affutageReduction);
  }
  return target;
}

// --- geminiService.ts : timeToSeconds (post fix #6) ---
function timeToSeconds(time, contextDistance) {
  if (!time) return 0;
  const t = time.trim().toLowerCase();

  // Fix #6 — rejet inputs pollués contenant distance "km"
  if (/\d+\s*km/i.test(t)) {
    return 0; // input invalide
  }

  const hMatch = t.match(/^(\d+)h:?(\d{0,2})/);
  if (hMatch) {
    const hours = parseInt(hMatch[1]);
    const mins = hMatch[2] ? parseInt(hMatch[2]) : 0;
    return hours * 3600 + mins * 60;
  }
  const minMatchStart = t.match(/^(\d+)\s*min/);
  if (minMatchStart) return parseInt(minMatchStart[1]) * 60;
  const parts = time.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) {
    if (contextDistance && contextDistance >= 21) return parts[0] * 3600 + parts[1] * 60;
    if (contextDistance && contextDistance >= 5 && parts[0] <= 3) return parts[0] * 3600 + parts[1] * 60;
    return parts[0] * 60 + parts[1];
  }
  const soloNum = parseInt(t);
  if (!isNaN(soloNum) && soloNum > 0) {
    if (contextDistance && contextDistance >= 21) return soloNum <= 6 ? soloNum * 3600 : soloNum * 60;
    return soloNum * 60;
  }
  return 0;
}

// --- geminiService.ts : labelToLevelKey ---
function labelToLevelKey(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition')) return 'conf';
  return 'inter';
}

// --- geminiService.ts : classifyByChrono ---
const CHRONO_LEVEL_THRESHOLDS = {
  '10K': { M: [50, 42, 36], F: [60, 50, 42] },
  '5K':  { M: [30, 25, 21], F: [35, 30, 25] },
};
const LEVEL_RANK = { deb: 0, inter: 1, conf: 2, expert: 3 };
const LEVEL_NAMES = ['deb', 'inter', 'conf', 'expert'];

function classifyByChrono(seconds, dist, isFemale) {
  const min = seconds / 60;
  const T = CHRONO_LEVEL_THRESHOLDS[dist][isFemale ? 'F' : 'M'];
  if (min > T[0]) return 'deb';
  if (min > T[1]) return 'inter';
  if (min > T[2]) return 'conf';
  return 'expert';
}

// --- geminiService.ts : detectLevelFromData (post fix #5a) ---
function detectLevelFromData(data) {
  const declared = labelToLevelKey(data.level);

  // Fix #5a — Préserver niveau déclaré pour senior ≥55 ans (non-deb).
  const age = data.age || 0;
  if (age >= 55 && declared && declared !== 'deb') {
    return declared; // senior preserved
  }

  const isFemale = data.sex === 'Femme';
  const c5kSec  = data.recentRaceTimes?.distance5km  ? timeToSeconds(data.recentRaceTimes.distance5km, 5)   : 0;
  const c10kSec = data.recentRaceTimes?.distance10km ? timeToSeconds(data.recentRaceTimes.distance10km, 10) : 0;

  const chronoLevels = [];
  if (c5kSec > 0)  chronoLevels.push(classifyByChrono(c5kSec, '5K', isFemale));
  if (c10kSec > 0) chronoLevels.push(classifyByChrono(c10kSec, '10K', isFemale));

  if (chronoLevels.length > 0) {
    const minRank = Math.min(...chronoLevels.map(l => LEVEL_RANK[l]));
    const chronoLevel = LEVEL_NAMES[minRank];
    if (LEVEL_RANK[chronoLevel] < LEVEL_RANK[declared]) {
      return chronoLevel;
    }
  }
  return declared;
}

// --- Logique simplifiée d'évolution weeklyVolumes (extraite geminiService L2635+) ---
// Approximation : volume pic = currentVol * multiplicateur niveau, ramp linéaire S1→pic,
// puis récup -25%, affût en S(N-1) et S(N)
function simulateWeeklyVolumes(currentVol, level, totalWeeks) {
  // Multiplicateurs typiques : deb ×1.4, inter ×1.6, conf ×1.8, expert ×2.0 (approximation simplifiée)
  const peakMultiplier =
    level === 'deb' ? 1.4 :
    level === 'inter' ? 1.6 :
    level === 'conf' ? 1.8 : 2.0;
  const peak = Math.round(currentVol * peakMultiplier);
  const peakWeek = Math.max(1, totalWeeks - 3);

  const vols = [];
  for (let w = 1; w <= totalWeeks; w++) {
    if (w === 1) { vols.push(currentVol); continue; }
    if (w >= totalWeeks - 1) {
      // affûtage : S(N-1) 70%, S(N) 50%
      const factor = w === totalWeeks - 1 ? 0.70 : 0.50;
      vols.push(Math.round(peak * factor));
      continue;
    }
    if (w === peakWeek) { vols.push(peak); continue; }
    // récup toutes les 3 semaines : −25%
    if (w % 3 === 0 && w < peakWeek) {
      vols.push(Math.round(vols[w-2] * 0.75));
      continue;
    }
    // ramp linéaire current → peak
    const progress = (w - 1) / Math.max(1, peakWeek - 1);
    vols.push(Math.round(currentVol + (peak - currentVol) * progress));
  }
  return { vols, peakWeek };
}

// --- Phase générique : 4 récup, S1-S(peak)=préparation/spécifique, S(N-1)/S(N) affûtage ---
function simulatePhases(totalWeeks) {
  const phases = [];
  for (let w = 1; w <= totalWeeks; w++) {
    if (w === totalWeeks) phases.push('affutage_final');
    else if (w === totalWeeks - 1) phases.push('affutage');
    else if (w % 4 === 0) phases.push('recup');
    else phases.push('specifique');
  }
  return phases;
}

// ============================================
// 15 PROFILS DE TEST
// ============================================

const profiles = [
  // === 10 PROFILS TRAIL ===
  {
    id: 'T1', name: 'Trail court 10km/300D+', sex: 'Femme', age: 35, level: 'Confirmé (Compétition)',
    isTrail: true, distance: 10, elevation: 300, currentVol: 25, currentElev: 200,
    targetTime: '1h30', totalWeeks: 12,
    recentRaceTimes: { distance10km: '50min' }
  },
  {
    id: 'T2', name: 'Trail moyen 20km/600D+', sex: 'Homme', age: 40, level: 'Confirmé (Compétition)',
    isTrail: true, distance: 20, elevation: 600, currentVol: 35, currentElev: 600,
    targetTime: '2h30', totalWeeks: 12,
    recentRaceTimes: { distance10km: '45min' }
  },
  {
    id: 'T3', name: 'Trail 30km/1500D+', sex: 'Homme', age: 45, level: 'Confirmé (Compétition)',
    isTrail: true, distance: 30, elevation: 1500, currentVol: 40, currentElev: 1500,
    targetTime: '4h', totalWeeks: 14,
    recentRaceTimes: { distance10km: '55min' }
  },
  {
    id: 'T4', name: 'Trail 50km/3000D+', sex: 'Femme', age: 50, level: 'Expert (Performance)',
    isTrail: true, distance: 50, elevation: 3000, currentVol: 55, currentElev: 2500,
    targetTime: 'Finisher', totalWeeks: 16,
    recentRaceTimes: {}
  },
  {
    id: 'T5', name: 'Trail 50km/3000D+ Senior', sex: 'Homme', age: 58, level: 'Expert (Performance)',
    isTrail: true, distance: 50, elevation: 3000, currentVol: 50, currentElev: 2500,
    targetTime: 'Finisher', totalWeeks: 16,
    recentRaceTimes: { distance10km: '1h05' } // test fix #5a : 1h05 à 58 ans préservé Expert
  },
  {
    id: 'T6', name: 'Trail 80km/5000D+', sex: 'Homme', age: 42, level: 'Expert (Performance)',
    isTrail: true, distance: 80, elevation: 5000, currentVol: 70, currentElev: 4000,
    targetTime: 'Finisher', totalWeeks: 20,
    recentRaceTimes: { distance10km: '40min' }
  },
  {
    id: 'T7', name: 'Ultra 100km/7000D+ Senior', sex: 'Homme', age: 55, level: 'Expert (Performance)',
    isTrail: true, distance: 100, elevation: 7000, currentVol: 80, currentElev: 4500,
    targetTime: 'Finisher', totalWeeks: 24,
    recentRaceTimes: { distance10km: '1h00' }
  },
  {
    id: 'T8', name: 'Ultra 110km/12000D+ Master (Rich-like)', sex: 'Homme', age: 55, level: 'Expert (Performance)',
    isTrail: true, distance: 110, elevation: 12000, currentVol: 70, currentElev: 3000,
    targetTime: 'Finisher', totalWeeks: 24,
    recentRaceTimes: { distance10km: '1h00' }
  },
  {
    id: 'T9', name: 'Ultra 130km/8000D+', sex: 'Femme', age: 48, level: 'Expert (Performance)',
    isTrail: true, distance: 130, elevation: 8000, currentVol: 85, currentElev: 5000,
    targetTime: 'Finisher', totalWeeks: 24,
    recentRaceTimes: { distance10km: '45min' }
  },
  {
    id: 'T10', name: 'Trail court débutant', sex: 'Femme', age: 30, level: 'Débutant (0-1 an)',
    isTrail: true, distance: 15, elevation: 500, currentVol: 8, currentElev: 300,
    targetTime: 'Finisher', totalWeeks: 12,
    recentRaceTimes: {}
  },

  // === 5 PROFILS ROUTE (non-régression) ===
  {
    id: 'R1', name: '5k Confirmé', sex: 'Femme', age: 30, level: 'Confirmé (Compétition)',
    isTrail: false, currentVol: 25, targetTime: '22min', totalWeeks: 10,
    recentRaceTimes: {}
  },
  {
    id: 'R2', name: '10k Régulier', sex: 'Homme', age: 38, level: 'Intermédiaire (Régulier)',
    isTrail: false, currentVol: 30, targetTime: '50min', totalWeeks: 10,
    recentRaceTimes: {}
  },
  {
    id: 'R3', name: 'Semi sub-1h45 Senior', sex: 'Homme', age: 57, level: 'Expert (Performance)',
    isTrail: false, currentVol: 50, targetTime: '1h45', totalWeeks: 12,
    recentRaceTimes: { distance10km: '39min' }
  },
  {
    id: 'R4', name: 'Marathon Finisher Expert', sex: 'Femme', age: 45, level: 'Expert (Performance)',
    isTrail: false, currentVol: 60, targetTime: 'Finisher', totalWeeks: 16,
    recentRaceTimes: { distance10km: '3h30' } // mauvais champ exprès — devrait être déconsidéré
  },
  {
    id: 'R5', name: 'Marathon sub-3h ambitieux', sex: 'Homme', age: 42, level: 'Expert (Performance)',
    isTrail: false, currentVol: 80, targetTime: '3h00', totalWeeks: 16,
    recentRaceTimes: { distance10km: '3h10' } // pollué par marathon time
  },
];

// ============================================
// EXÉCUTION + RAPPORT
// ============================================

function runProfile(p) {
  const data = {
    sex: p.sex, age: p.age, level: p.level,
    trailDetails: p.isTrail ? { distance: p.distance, elevation: p.elevation } : null,
    recentRaceTimes: p.recentRaceTimes,
    targetTime: p.targetTime,
  };

  const declared = labelToLevelKey(p.level);
  const effective = detectLevelFromData(data);

  const phases = simulatePhases(p.totalWeeks);

  // weeklyElevationTarget pour profils trail
  let weeklyElev = null;
  if (p.isTrail) {
    weeklyElev = [];
    for (let i = 0; i < p.totalWeeks; i++) {
      weeklyElev.push(calculateWeekTargetElevation(
        i + 1, p.totalWeeks, p.elevation, effective, p.currentElev, phases[i]
      ));
    }
  }

  // weeklyVolumes simulation
  const { vols, peakWeek } = simulateWeeklyVolumes(p.currentVol, effective, p.totalWeeks);

  // BTB & nuit injection (logique geminiService L3487+, L4368+)
  const btbInjected = p.isTrail && p.distance >= 70;
  const nightInjected = p.isTrail && p.distance >= 80;

  return {
    profile: p,
    declared, effective,
    weeklyElev, weeklyVols: vols, peakWeek, phases,
    btbInjected, nightInjected,
    s1Elev: weeklyElev ? weeklyElev[0] : null,
    peakElev: weeklyElev ? Math.max(...weeklyElev) : null,
    peakElevWeek: weeklyElev ? weeklyElev.indexOf(Math.max(...weeklyElev)) + 1 : null,
    s1Vol: vols[0],
    peakVol: Math.max(...vols),
  };
}

console.log('# Tests Sprint 1 — 15 profils\n');
console.log('Date: 2026-05-19\n');

const results = profiles.map(runProfile);

for (const r of results) {
  const p = r.profile;
  console.log(`\n=== ${p.id} : ${p.name} ===`);
  console.log(`Profil : ${p.sex}, ${p.age}ans, déclaré="${p.level}" → effectif="${r.effective}"`);
  if (p.isTrail) {
    const ratioS1 = p.currentElev > 0 ? (r.s1Elev / p.currentElev).toFixed(2) : 'N/A';
    const ratioPic = p.elevation > 0 ? (r.peakElev / p.elevation).toFixed(2) : 'N/A';
    console.log(`Trail : ${p.distance}km / ${p.elevation}m D+, current ${p.currentVol}km/${p.currentElev}m`);
    console.log(`  S1 D+ : ${r.s1Elev}m (current declared ${p.currentElev}m → ratio ${ratioS1})`);
    console.log(`  Pic D+ : ${r.peakElev}m (race ${p.elevation}m → ratio ${ratioPic}, semaine ${r.peakElevWeek})`);
    console.log(`  S1 vol : ${r.s1Vol}km | Pic vol : ${r.peakVol}km (S${r.peakWeek})`);
    console.log(`  BTB injecté : ${r.btbInjected ? 'oui' : 'non'} (distance ≥ 70)`);
    console.log(`  Nuit injectée : ${r.nightInjected ? 'oui' : 'non'} (distance ≥ 80)`);
    console.log(`  weeklyElev complet : [${r.weeklyElev.join(', ')}]`);
  } else {
    console.log(`Route : current ${p.currentVol}km/sem, cible ${p.targetTime}`);
    console.log(`  S1 vol : ${r.s1Vol}km | Pic vol : ${r.peakVol}km (S${r.peakWeek})`);
    console.log(`  Chronos input : ${JSON.stringify(p.recentRaceTimes)}`);
  }
}

// === VÉRIFICATIONS SPÉCIFIQUES ===
console.log('\n\n=== VÉRIFICATIONS SPÉCIFIQUES ===\n');

// 1. T8 Rich-like
const t8 = results.find(r => r.profile.id === 'T8');
console.log(`1. T8 (Rich-like 110/12000) :`);
console.log(`   S1 D+ attendu ≥ 3000 (vs 1500 pre-fix) → réel : ${t8.s1Elev}m → ${t8.s1Elev >= 3000 ? '✅' : '❌'}`);
console.log(`   Pic D+ attendu ≥ 5500 (vs 3500 pre-fix) → réel : ${t8.peakElev}m → ${t8.peakElev >= 5500 ? '✅' : '❌'}`);

// 2. T5 Senior
const t5 = results.find(r => r.profile.id === 'T5');
console.log(`2. T5 (Senior 58 ans Expert, 10K 1h05) :`);
console.log(`   Niveau effectif attendu = expert → réel : ${t5.effective} → ${t5.effective === 'expert' ? '✅' : '❌'}`);

// 3. T6 + T8 BTB+nuit
const t6 = results.find(r => r.profile.id === 'T6');
console.log(`3. T6 (80km) BTB+nuit : ${t6.btbInjected && t6.nightInjected ? '✅' : '❌'}`);
console.log(`   T8 (110km) BTB+nuit : ${t8.btbInjected && t8.nightInjected ? '✅' : '❌'}`);

// 4. R1-R5 non-régression (pas de weeklyElev attendu sur route)
console.log(`4. R1-R5 non-régression :`);
for (const id of ['R1','R2','R3','R4','R5']) {
  const r = results.find(x => x.profile.id === id);
  console.log(`   ${id} : weeklyElev=${r.weeklyElev ? 'PRÉSENT ❌ (régression)' : 'absent ✅'}, vols S1=${r.s1Vol}, pic=${r.peakVol}`);
}

// 5. T1 cap raceElevation
const t1 = results.find(r => r.profile.id === 'T1');
console.log(`5. T1 (trail court 10km/300D+) :`);
console.log(`   S1 D+ ≤ 300 (race) : ${t1.s1Elev}m → ${t1.s1Elev <= 300 ? '✅' : '❌'}`);
console.log(`   Pic D+ ≤ 300 (cap raceElevation prime) : ${t1.peakElev}m → ${t1.peakElev <= 300 ? '✅' : '❌'}`);

// 6. R3 senior 57 ans + chrono 10K 39min : niveau préservé Expert (fix #5a)
const r3 = results.find(r => r.profile.id === 'R3');
console.log(`6. R3 (Senior 57 Expert, 10K 39min - chrono ok) : effectif=${r3.effective} → ${r3.effective === 'expert' ? '✅ (préservé via #5a)' : '⚠️ override chrono'}`);

// 7. Fix #6 : R4 / R5 ont distance10km pollué avec "3h30" / "3h10" — ne contient pas "km" donc ne déclenche pas le reject, mais c'est un faux 10K. Test : un input "50km (6h50)" doit retourner 0.
console.log(`7. Fix #6 (timeToSeconds reject "km") :`);
console.log(`   "50km (6h50)" → ${timeToSeconds('50km (6h50)', 10)} (attendu 0) → ${timeToSeconds('50km (6h50)', 10) === 0 ? '✅' : '❌'}`);
console.log(`   "45min" → ${timeToSeconds('45min', 10)} (attendu 2700) → ${timeToSeconds('45min', 10) === 2700 ? '✅' : '❌'}`);
console.log(`   "1h00" → ${timeToSeconds('1h00', 10)} (attendu 3600) → ${timeToSeconds('1h00', 10) === 3600 ? '✅' : '❌'}`);
