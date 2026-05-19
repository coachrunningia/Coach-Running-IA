// Reproduit le cas Ambre via tsx (compile TS à la volée)
import { execSync } from 'child_process';

// Mock import.meta.env pour Vite
globalThis.import = globalThis.import || {};
process.env.VITE_GEMINI_API_KEY = 'fake-key-for-test';

// Charge le module via tsx
const tsxPath = `${process.cwd()}/node_modules/.bin/tsx`;

console.log('Lancement test direct via tsx...');
try {
  const result = execSync(`${tsxPath} -e "
    import { calculatePeriodizationPlan, detectLevelFromData, calculateAllPaces, isFinisherTarget } from './src/services/geminiService.ts';

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

    console.log('1. detectLevelFromData:');
    const lvl = detectLevelFromData({ ...ambre, vma: 8.93 });
    console.log('   →', lvl);

    console.log('2. calculateAllPaces(8.93):');
    const paces = calculateAllPaces(8.93);
    console.log('   EF:', paces.efPace, 'Seuil:', paces.seuilPace, 'VMA:', paces.vmaPace);

    console.log('3. isFinisherTarget(2h00):');
    console.log('   →', isFinisherTarget('2h00'));

    console.log('4. calculatePeriodizationPlan (18 sem):');
    const peri = calculatePeriodizationPlan(
      18,
      ambre.currentWeeklyVolume,
      'Débutant (0-1 an)', // niveau effectif après chrono override
      ambre.goal,
      ambre.subGoal,
      undefined, undefined,
      ambre.targetTime,
      ambre.age,
      ambre.weight,
      8.93,
      ambre.frequency,
      { height: ambre.height, vmaSource: '5km en 35:22' }
    );
    console.log('   weeklyVolumes:', JSON.stringify(peri.weeklyVolumes));
    console.log('   recoveryWeeks:', JSON.stringify(peri.recoveryWeeks));
    console.log('   weeklyPhases:', JSON.stringify(peri.weeklyPhases));

    console.log('\\n✅ Tous les calculs SANS exception');
  "`, { encoding: 'utf-8', cwd: '/Users/romanemarino/Coach-Running-IA' });
  console.log(result);
} catch (e) {
  console.log('🚨 EXCEPTION reproduite :');
  console.log(e.stdout || '');
  console.log('STDERR:', e.stderr || '');
  console.log('MSG:', e.message);
}
