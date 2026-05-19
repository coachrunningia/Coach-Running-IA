// Simulation: pour Rich (Expert, age 55, currentVol 70, currentDplus 3000, race 110km/12000m, 13 sem)
// On veut vérifier que les bugs planUtils:121-125 et planUtils:134 produisent bien :
//  - D+ S1 capé à 1500 (au lieu de 3000 réel déclaré)
//  - D+ pic capé à 3500 (au lieu de ~5800 doctrine)

const level = 'Expert (Performance)';
const raceElevation = 12000;
const currentWeeklyElevation = 3000;
const totalWeeks = 13;

// Reproduction code planUtils.ts
const lvl = level.toLowerCase();
const isDeb = lvl === 'deb' || lvl.includes('débutant') || lvl.includes('debutant');
const isInter = lvl === 'inter' || lvl.includes('intermédiaire') || lvl.includes('intermediaire');
const isConf = lvl === 'conf' || lvl.includes('confirmé') || lvl.includes('confirme') || lvl.includes('compétition');

const maxWeeklyElevation =
  isDeb ? Math.min(raceElevation, 800) :
  isInter ? Math.min(raceElevation, 1500) :
  isConf ? Math.min(raceElevation, 2500) :
  Math.min(raceElevation, 3500);

console.log('=== Simulation bug planUtils.ts:121-125 ===');
console.log(`level: "${level}" → bucket Expert (else)`);
console.log(`raceElevation: ${raceElevation}m`);
console.log(`maxWeeklyElevation calculé: ${maxWeeklyElevation}m (PLAFOND DUR: 3500m)`);
console.log(`→ POUR RICH: pic D+ hebdo MAX = ${maxWeeklyElevation}m alors qu'on vise 5800m`);
console.log(`→ ratio pic/race: ${(maxWeeklyElevation/raceElevation*100).toFixed(0)}% (devrait être ~48% Balducci basse pour Master, soit 5800m)`);

const defaultStart = isDeb ? 150 : isInter ? 300 : isConf ? 500 : 800;
const maxStart = Math.min(1500, Math.round(maxWeeklyElevation * 0.60));
const minStartElevation = Math.round(raceElevation * 0.15);
const rawStart = currentWeeklyElevation > 0
  ? Math.min(currentWeeklyElevation, maxStart)
  : Math.min(defaultStart, maxStart);
const startElevation = Math.max(rawStart, Math.min(minStartElevation, maxStart));

console.log('\n=== Simulation bug planUtils.ts:134 ===');
console.log(`currentWeeklyElevation déclaré: ${currentWeeklyElevation}m`);
console.log(`defaultStart (bucket Expert): ${defaultStart}m`);
console.log(`maxStart = Math.min(1500, ${maxWeeklyElevation}*0.60=${Math.round(maxWeeklyElevation*0.60)}) = ${maxStart}m`);
console.log(`minStartElevation = ${raceElevation}*0.15 = ${minStartElevation}m`);
console.log(`rawStart = Math.min(${currentWeeklyElevation}, ${maxStart}) = ${rawStart}m`);
console.log(`startElevation final = Math.max(${rawStart}, Math.min(${minStartElevation}, ${maxStart})) = ${startElevation}m`);
console.log(`→ POUR RICH: D+ S1 forcé à ${startElevation}m (alors qu'il déclare 3000m, donc régression de -50%)`);

// progression linéaire
console.log('\n=== Vecteur D+ généré par le code buggué ===');
for (let w = 1; w <= totalWeeks; w++) {
  const progress = Math.min(1, (w - 1) / Math.max(1, totalWeeks - 1));
  let target = Math.round(startElevation + (maxWeeklyElevation - startElevation) * progress);
  console.log(`  S${w}: ${target}m`);
}
