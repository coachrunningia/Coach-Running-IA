import { generatePreviewPlan } from './src/services/geminiService';

const ambre: any = {
  age: 20, sex: 'Femme', weight: 80, height: 168,
  level: 'Intermédiaire (Régulier)',
  currentWeeklyVolume: 5, frequency: 3,
  goal: 'Course sur route', subGoal: 'Semi-Marathon', targetTime: '2h00',
  recentRaceTimes: { distance5km: '35:22', distance10km: '1h19', distanceHalfMarathon: '3h05' },
  injuries: { hasInjury: true, description: "Quelque douleur au genoux depuis que j’ai repris la course" },
  preferredDays: ['Lundi','Mercredi','Samedi'],
  comments: "Avant je n’avais pas le temps de courir plus maintenant je peux ",
  city: 'Nancy', startDate: '2026-05-18', raceDate: '2026-09-12',
  email: 'painvin.ambre@yahoo.com',
  vma: 8.73,
};

(async () => {
  try {
    const plan = await generatePreviewPlan(ambre);
    console.log('✅ PLAN OK — name:', plan.name, 'weeks:', plan.weeks?.length);
  } catch (e: any) {
    console.log('❌ EXCEPTION:', e.constructor?.name);
    console.log('  message:', e.message);
    console.log('  stack:');
    console.log((e.stack || '').split('\n').slice(0, 15).join('\n'));
  }
})();
