import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const sa = JSON.parse(fs.readFileSync('coach-running-ia-firebase-adminsdk.json', 'utf-8'));
initializeApp({ credential: cert(sa), projectId: 'coach-running-ia' });
const db = getFirestore();

const P1 = [
  { name: 'Pierre Dewitte', id: '1778574019379' },
  { name: 'Agathe',         id: '1778446762158' },
  { name: 'Soumaya',        id: '1778276731530' },
  { name: 'Adrien',         id: '1778702412108' },
  { name: 'Hippolyte',      id: '1778852278323' },
  { name: 'Karine',         id: '1778695294712' },
  { name: 'Lukas',          id: '1778771945613' },
  { name: 'Bruno',          id: '1778673418021' },
  { name: 'Sylvie',         id: '1778398957594' },
  { name: 'Christophe npsi',id: '1778210447573' },
];

for (const p of P1) {
  const snap = await db.collection('plans').doc(p.id).get();
  if (!snap.exists) { console.log(`\n## ${p.name} — NOT FOUND ${p.id}`); continue; }
  const d = snap.data();
  const q = d.generationContext?.questionnaire || {};
  const peri = d.generationContext?.periodizationPlan || {};
  const paces = d.generationContext?.calculatedPaces || {};
  const weeks = d.weeks || [];
  
  console.log(`\n\n========== ${p.name} (${p.id}) ==========`);
  console.log(`Goal: ${q.goal} / ${q.subGoal} — Target: ${q.targetTime} — Durée: ${q.planDurationWeeks} sem`);
  console.log(`Profile: ${q.age}yo ${q.sex} ${q.weightKg}kg/${q.heightCm}cm IMC=${q.weightKg && q.heightCm ? (q.weightKg / Math.pow(q.heightCm/100,2)).toFixed(1) : '?'}`);
  console.log(`Niveau: ${q.runningLevel} — Volume actuel: ${q.currentWeeklyKm} km/sem — Freq: ${q.weeklyFrequency} séances`);
  console.log(`Chronos: 5k=${q.chrono5km}, 10k=${q.chrono10km}, semi=${q.chronoHalfMarathon}, mara=${q.chronoMarathon}`);
  console.log(`Blessures: ${JSON.stringify(q.injuries)} — Pain: ${q.painOrInjuryDescription || 'none'}`);
  console.log(`Allures plan: EF=${paces.easy} seuil=${paces.threshold} VMA=${paces.vma} VMAValue=${peri.estimatedVMA}km/h`);
  console.log(`Periodization: peak=${peri.peakVolumeKm}km totalVol=${peri.totalVolumeKm}km weeklyVolumes=${JSON.stringify(peri.weeklyVolumes)}`);
  
  // Trouver la SL peak (longest single session)
  let maxSLkm = 0;
  let maxSLweek = 0;
  let maxSLdesc = '';
  let weekVolumes = [];
  for (const w of weeks) {
    let wkVol = 0;
    let wkMaxSL = 0;
    let wkMaxSLdesc = '';
    for (const s of (w.sessions || [])) {
      const km = s.totalKm || s.distance || 0;
      wkVol += km;
      const t = (s.type || '').toLowerCase();
      const n = (s.name || '').toLowerCase();
      if (t.includes('long') || n.includes('long') || n.includes('sortie longue') || n.includes('sl')) {
        if (km > wkMaxSL) { wkMaxSL = km; wkMaxSLdesc = `${s.name}=${km}km`; }
        if (km > maxSLkm) { maxSLkm = km; maxSLweek = w.weekNumber; maxSLdesc = `${s.name}=${km}km`; }
      }
    }
    weekVolumes.push({ wk: w.weekNumber, vol: Math.round(wkVol*10)/10, maxSL: wkMaxSL, slDesc: wkMaxSLdesc });
  }
  console.log(`Volumes/SL réels par semaine:`);
  weekVolumes.forEach(w => console.log(`  S${w.wk}: ${w.vol} km — SL: ${w.slDesc || '-'}`));
  console.log(`Peak SL: ${maxSLdesc} (S${maxSLweek})`);
}

process.exit(0);
