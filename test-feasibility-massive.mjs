// Batterie de tests calculateFeasibility sur 15 profils pour valider qu'aucun plante
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

// Mock import.meta.env pour Node
const tsxRun = (code) => {
  const filename = '/tmp/test-feasibility-massive-inner.ts';
  writeFileSync(filename, code);
  return execSync(`npx tsx ${filename} 2>&1`, { encoding: 'utf-8' });
};

const PROFILES = [
  // Cas SAFE (devraient passer)
  { name: 'P01 Confirmé Semi chrono', vma: 15, targetTime: '1h30', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Confirmé (Compétition)', planWeeks: 22, currentVolume: 60, hasInjury: false, hasChrono: true },
  { name: 'P02 Expert Marathon', vma: 18, targetTime: '2h45', distance: 'Marathon', goal: 'Course sur route', level: 'Expert (Performance)', planWeeks: 18, currentVolume: 80, hasInjury: false, hasChrono: true },
  { name: 'P03 Intermédiaire 10k', vma: 13, targetTime: '50min', distance: '10 km', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 12, currentVolume: 30, hasInjury: false, hasChrono: true },

  // Cas RISQUÉS (VMA basse + cible ambitieuse — déclencheur du bug `reasons`)
  { name: 'P04 Débutant Mara ambitieux (Julian-like)', vma: 11, targetTime: '4h00', distance: 'Marathon', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 16, currentVolume: 20, hasInjury: false, hasChrono: true },
  { name: 'P05 Femme Débutante Semi (Ambre-like)', vma: 8.73, targetTime: '2h00', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 17, currentVolume: 5, hasInjury: true, hasChrono: true, sex: 'Femme' },
  { name: 'P06 Inter sub-1h45 semi VMA basse', vma: 11.5, targetTime: '1h45', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Intermédiaire (Régulier)', planWeeks: 12, currentVolume: 25, hasInjury: false, hasChrono: true },
  { name: 'P07 VMA très basse 5k 30min', vma: 9.5, targetTime: '25min', distance: '5 km', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 8, currentVolume: 10, hasInjury: false, hasChrono: true },

  // Cas IRRÉALISTES (>130% VMA)
  { name: 'P08 IRRÉALISTE Débutant sub-3h mara', vma: 10, targetTime: '3h00', distance: 'Marathon', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 16, currentVolume: 15, hasInjury: false, hasChrono: true },

  // Cas FINISHER (devrait passer par buildFinisherFeasibility)
  { name: 'P09 Finisher Trail', vma: 14, targetTime: '', distance: 'Trail', goal: 'Trail', level: 'Intermédiaire (Régulier)', planWeeks: 20, currentVolume: 40, hasInjury: false, hasChrono: true, trailDistance: 50, trailElevation: 1500 },
  { name: 'P10 Finisher Semi débutant', vma: 9, targetTime: '', distance: 'Semi-Marathon', goal: 'Course sur route', level: 'Débutant (0-1 an)', planWeeks: 16, currentVolume: 10, hasInjury: false, hasChrono: false },

  // Cas Hyrox (chrono + débutant)
  { name: 'P11 Hyrox Débutante 1h05', vma: 11.3, targetTime: '1h05', distance: '8 km (Hyrox)', goal: 'Hyrox', level: 'Débutant (0-1 an)', planWeeks: 18, currentVolume: 10, hasInjury: false, hasChrono: true },

  // Cas avec blessure
  { name: 'P12 Blessé trail ambitieux', vma: 16.47, targetTime: '6h20', distance: 'Trail', goal: 'Trail', level: 'Expert (Performance)', planWeeks: 18, currentVolume: 50, hasInjury: true, hasChrono: true, trailDistance: 63, trailElevation: 1200 },

  // Cas VMA très haute Expert
  { name: 'P13 Expert 5k 16min', vma: 22, targetTime: '16min', distance: '5 km', goal: 'Course sur route', level: 'Expert (Performance)', planWeeks: 12, currentVolume: 90, hasInjury: false, hasChrono: true },

  // Cas Perte de poids
  { name: 'P14 PdP femme', vma: 10.3, targetTime: '', distance: '', goal: 'Perte de poids', level: 'Débutant (0-1 an)', planWeeks: 12, currentVolume: 5, hasInjury: false, hasChrono: true, sex: 'Femme', weight: 80, height: 168 },

  // Cas Maintien
  { name: 'P15 Maintien', vma: 14, targetTime: '', distance: '', goal: 'Maintien en forme', level: 'Confirmé (Compétition)', planWeeks: 12, currentVolume: 30, hasInjury: false, hasChrono: true },
];

const code = `
import { calculateFeasibility } from '/Users/romanemarino/Coach-Running-IA/src/services/feasibilityService';
const PROFILES = ${JSON.stringify(PROFILES)};
let pass = 0, fail = 0;
for (const p of PROFILES) {
  const { name, ...params } = p;
  try {
    const result = calculateFeasibility(params);
    console.log('✅ ' + name + ' | score=' + result.score + ' status=' + result.status);
    pass++;
  } catch (e) {
    console.log('❌ ' + name + ' | EXCEPTION: ' + e.message);
    fail++;
  }
}
console.log('\\n=== ' + pass + '/' + (pass+fail) + ' tests passent ===');
if (fail > 0) process.exit(1);
`;

const out = tsxRun(code);
console.log(out);
