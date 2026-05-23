import fs from 'fs';

const summary = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/audit11-summary.json'));
const out = [];

function pickPaces(paces, subGoal) {
  if (!paces) return {};
  const sg = (subGoal||'').toLowerCase();
  const keys = Object.keys(paces);
  const ks = {};
  for (const k of keys) {
    if (/specifique|allureSpec|race|cible|target/i.test(k)) ks[k]=paces[k];
  }
  return { allKeys: keys, specifiques: ks, all: paces };
}

function sessionSummary(s) {
  if (!s) return null;
  return {
    title: s.title || s.titre || s.name,
    type: s.type,
    duration: s.duration || s.dureeMinutes || s.minutes,
    distance: s.distance || s.distanceKm,
    mainSet: (s.mainSet || s.coreSet || '').toString().slice(0,200),
    description: (s.description || s.summary || '').toString().slice(0,200),
  };
}

for (const s of summary) {
  if (!s.planId) { out.push({ email: s.email, status: 'NO_PLAN' }); continue; }
  const planPath = `/Users/romanemarino/Coach-Running-IA/audit11-${s.label}-plan.json`;
  const userPath = `/Users/romanemarino/Coach-Running-IA/audit11-${s.label}-user.json`;
  const plan = JSON.parse(fs.readFileSync(planPath));
  const user = fs.existsSync(userPath) ? JSON.parse(fs.readFileSync(userPath)) : null;

  const obj = {
    email: s.email,
    label: s.label,
    planId: s.planId,
    createdAt: s.createdAt,
    // Plan top-level
    planKeys: Object.keys(plan).sort(),
    goal: plan.goal,
    subGoal: plan.subGoal,
    targetTime: plan.targetTime,
    raceDate: plan.raceDate,
    planName: plan.planName,
    niveau: plan.niveau || plan.userLevel,
    freq: plan.freq || plan.frequency || plan.frequenceSeances,
    currentVol: plan.currentVol || plan.currentVolume || plan.volumeActuelKm,
    BMI: plan.BMI || plan.bmi,
    VMA: plan.VMA || plan.vma,
    age: plan.age,
    paces: plan.paces ? pickPaces(plan.paces, plan.subGoal) : null,
    weeklyVolumes: plan.weeklyVolumes,
    feasibility: plan.feasibility,
    welcomeMessage: (plan.welcomeMessage || '').toString().slice(0, 1200),
    // S1
    weeks0: plan.weeks && plan.weeks[0] ? {
      keys: Object.keys(plan.weeks[0]),
      sessions: (plan.weeks[0].sessions||[]).map(sessionSummary),
      weekVolume: plan.weeks[0].volumeKm || plan.weeks[0].weekVolume || plan.weeks[0].totalKm,
    } : null,
    // User profile snippet
    user: user ? {
      age: user.age,
      sexe: user.sexe || user.gender,
      poids: user.poids || user.weight,
      taille: user.taille || user.height,
      vma: user.vma || user.VMA,
      currentVol: user.currentVol || user.currentVolume,
      freq: user.freq || user.frequency,
      niveau: user.niveau,
      goal: user.goal,
      subGoal: user.subGoal,
      targetTime: user.targetTime,
      raceDate: user.raceDate,
      pb: user.pb || user.personalBests || user.pbs,
      keys: Object.keys(user).sort(),
    } : null,
  };
  out.push(obj);
}

fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit11-extracted.json', JSON.stringify(out, null, 2));
console.log('extracted', out.length);
