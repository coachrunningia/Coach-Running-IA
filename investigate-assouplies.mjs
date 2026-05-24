/**
 * Investigation 3 assertions assouplies — pourquoi le code génère ces valeurs ?
 *
 * 1. Profil 14 Hyrox cv=30 freq=4 14 sem → S1=27 (au lieu de >=30 cv)
 * 2. Profil 1 Trail Débutant cv=15 D+=50 Trail 20/500 12 sem → score 10 IRRÉALISTE
 * 3. Profil 6 Ultra UTMB cv=70 Trail 170/10000 28 sem Expert → pic 99 (au lieu de 100)
 */
import { calculatePeriodizationPlan } from './src/services/geminiService';
import { calculateFeasibility } from './src/services/feasibilityService';

// =====================================================
// 1. Profil 14 Hyrox
// =====================================================
console.log('═══════════════════════════════════════');
console.log('1. Profil 14 Hyrox cv=30 freq=4 14 sem');
console.log('═══════════════════════════════════════');
const plan14 = calculatePeriodizationPlan(
  14, 30, 'Intermédiaire (Régulier)', 'Hyrox', 'Hyrox',
  undefined, undefined, 'Finisher', 35, 78, 12, 4, { height: 180 },
);
console.log(`S1=${plan14.weeklyVolumes[0]} (attendu >=30 = cv)`);
console.log(`weeklyVolumes : ${JSON.stringify(plan14.weeklyVolumes)}`);
console.log(`weeklyPhases  : ${JSON.stringify(plan14.weeklyPhases)}`);
console.log(`recoveryWeeks : ${JSON.stringify(plan14.recoveryWeeks)}`);
const pic14 = Math.max(...plan14.weeklyVolumes);
console.log(`Pic=${pic14} | Ratio pic/cv=${(pic14/30).toFixed(2)}`);
// Analyse : pourquoi 27 < cv=30 ? Probablement doctrine courte-duree (<13 sem ?)
// 14 sem est juste à la limite. Le code peut-il considérer "petit plan" et calibrer allégé ?

// =====================================================
// 2. Profil 1 Trail Débutant
// =====================================================
console.log('\n═══════════════════════════════════════');
console.log('2. Profil 1 Trail Débutant cv=15 D+=50 Trail 20/500 12 sem');
console.log('═══════════════════════════════════════');
const r1 = calculateFeasibility({
  goal: 'Trail',
  level: 'Débutant (0-1 an)',
  vma: 10,
  distance: 'Trail 20km',
  planWeeks: 12,
  frequency: 3,
  currentVolume: 15,
  currentWeeklyElevation: 50,
  trailElevation: 500,
  trailDistance: 20,
  age: 35,
  weight: 60,
  height: 165,
});
console.log(`Score=${r1.score} | Status=${r1.status}`);
console.log(`Message=${(r1.message || '').slice(0, 300)}`);
console.log(`Reasons :`);
for (const reason of (r1.reasons || [])) console.log(`  - ${reason}`);

// =====================================================
// 3. Profil 6 Ultra UTMB
// =====================================================
console.log('\n═══════════════════════════════════════');
console.log('3. Profil 6 Ultra UTMB cv=70 Trail 170/10000 28 sem Expert');
console.log('═══════════════════════════════════════');
const plan6 = calculatePeriodizationPlan(
  28, 70, 'Expert (Performance)', 'Trail', 'Trail',
  170, 10000, undefined, 50, 70, 13, 5, { height: 175 },
);
const pic6 = Math.max(...plan6.weeklyVolumes);
console.log(`Pic=${pic6} (attendu >=100)`);
console.log(`weeklyVolumes : ${JSON.stringify(plan6.weeklyVolumes)}`);
console.log(`weeklyPhases  : ${JSON.stringify(plan6.weeklyPhases)}`);
console.log(`Ratio pic/cv=${(pic6/70).toFixed(2)}`);
console.log(`Ratio pic/distance=${(pic6/170).toFixed(2)}`);
// Analyse : Bug 4 floor 60% race = 170*0.6 = 102. Pic 99 < 102 = bug ?
// Vérifier si le floor Bug 4 s'est appliqué après deploy

