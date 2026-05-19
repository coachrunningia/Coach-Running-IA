// Reproduction du cas Ambre

function timeToSeconds(time, contextDistance) {
  if (!time) return 0;
  const s = time.trim();
  const hMatch = /^(\d+)h\s*(\d+)?/.exec(s);
  if (hMatch) {
    const h = parseInt(hMatch[1]);
    const m = hMatch[2] ? parseInt(hMatch[2]) : 0;
    const asHours = h * 3600 + m * 60;
    if (contextDistance === 10 && asHours > 7200) return h * 60 + m;
    return asHours;
  }
  const colonMatch = /^(\d+):(\d+)/.exec(s);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  return 0;
}

function calculateVMAFromTime(distance, seconds) {
  if (distance === 5) {
    const min = seconds / 60;
    const speedKmH = 5 / (min / 60);
    return speedKmH / 0.95;
  }
  if (distance === 10) {
    const speedKmH = 10 / (seconds / 3600);
    return speedKmH / 0.90;
  }
  if (distance === 21.1) {
    const speedKmH = 21.1 / (seconds / 3600);
    return speedKmH / 0.85;
  }
  return 0;
}

const ambre = {
  level: 'Intermédiaire (Régulier)',
  sex: 'Femme',
  age: 20,
  weight: 80,
  height: 168,
  currentWeeklyVolume: 5,
  frequency: 3,
  goal: 'Course sur route',
  subGoal: 'Semi-Marathon',
  targetTime: '2h00',
  recentRaceTimes: {
    distance5km: '35:22',
    distance10km: '1h19',
    distanceHalfMarathon: '3h05',
  },
  injuries: { hasInjury: true, description: 'douleur genou' },
};

// Calculs VMA selon chronos
const sec5 = timeToSeconds(ambre.recentRaceTimes.distance5km, 5);
const sec10 = timeToSeconds(ambre.recentRaceTimes.distance10km, 10);
const sec21 = timeToSeconds(ambre.recentRaceTimes.distanceHalfMarathon, 21.1);
const vma5 = calculateVMAFromTime(5, sec5);
const vma10 = calculateVMAFromTime(10, sec10);
const vma21 = calculateVMAFromTime(21.1, sec21);
console.log('Chronos parsés:');
console.log(`  5k=${sec5}s = ${(sec5/60).toFixed(1)}min → VMA ${vma5.toFixed(2)} km/h`);
console.log(`  10k=${sec10}s = ${(sec10/60).toFixed(1)}min → VMA ${vma10.toFixed(2)} km/h`);
console.log(`  21k=${sec21}s = ${(sec21/60).toFixed(1)}min → VMA ${vma21.toFixed(2)} km/h`);

console.log('\nVMA min/max écart:');
const max = Math.max(vma5, vma10, vma21);
const min = Math.min(vma5, vma10, vma21);
const ecart = (max - min) / min * 100;
console.log(`  écart ${ecart.toFixed(0)}% — ${ecart > 20 ? '🚨 INCOHÉRENT (>20%)' : 'OK'}`);

// Cible 2h00 sur semi
const targetSec = timeToSeconds('2h00');
const targetPaceMinKm = (targetSec / 21.1) / 60;
const targetSpeedKmH = 21.1 / (targetSec / 3600);
console.log(`\nCible 2h00 sur semi:`);
console.log(`  Pace cible: ${targetPaceMinKm.toFixed(2)} min/km`);
console.log(`  Speed cible: ${targetSpeedKmH.toFixed(2)} km/h`);
console.log(`  En % de VMA actuelle (la plus rapide=${max.toFixed(2)}): ${(targetSpeedKmH / max * 100).toFixed(0)}%`);
console.log(`  Pour viser 2h00, VMA requise (à 85% sur semi): ${(targetSpeedKmH / 0.85).toFixed(2)} km/h`);
console.log(`  ⚠️ Sa VMA actuelle ${max.toFixed(2)} vs requise ${(targetSpeedKmH / 0.85).toFixed(2)} = écart ${((targetSpeedKmH / 0.85 - max) / max * 100).toFixed(0)}%`);
console.log('  → Objectif clairement IRRÉALISTE');

// Sprint 1 helpers
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
const labelToLevelKey = (label) => {
  const l = (label || '').toLowerCase();
  if (l.includes('débutant') || l.includes('debutant')) return 'deb';
  if (l.includes('expert') || l.includes('performance')) return 'expert';
  if (l.includes('confirmé') || l.includes('confirme') || l.includes('compétition')) return 'conf';
  return 'inter';
};

const declared = labelToLevelKey(ambre.level);
const c5kLvl = classifyByChrono(sec5, '5K', true);
const c10kLvl = classifyByChrono(sec10, '10K', true);
const chronoLevel = LEVEL_NAMES[Math.min(LEVEL_RANK[c5kLvl], LEVEL_RANK[c10kLvl])];
console.log(`\nNiveau effectif (Sprint 1):`);
console.log(`  declared: ${declared}`);
console.log(`  5k chrono level (F): ${c5kLvl}`);
console.log(`  10k chrono level (F): ${c10kLvl}`);
console.log(`  → override vers: ${chronoLevel}`);

// Feasibility score estimation
console.log(`\n=== FEASIBILITY ESTIMATION ===`);
const bmi = ambre.weight / Math.pow(ambre.height/100, 2);
console.log(`IMC: ${bmi.toFixed(1)}`);
console.log(`gap chrono cible vs VMA actuelle: ${((targetSpeedKmH / 0.85 - max) / max * 100).toFixed(0)}%`);
// Si gap > 13% → score très bas
// IMC > 25 + longue distance → -5
// VMA < 12 + gap > 5 → low VMA penalty importante
// Vol actuel 5 + cible semi → bcp à monter
const lowVmaPenalty = Math.round((12 - max) * (((targetSpeedKmH / 0.85 - max) / max * 100) - 5) * 0.5);
console.log(`Low VMA penalty estimée: -${lowVmaPenalty}`);
console.log(`Score estimé: ~10-20 IRRÉALISTE`);
console.log(`\n→ La modal FeasibilityWarningModal va se déclencher`);
console.log(`→ Si elle ne coche pas la case "j'ai compris", elle ne peut PAS générer`);
