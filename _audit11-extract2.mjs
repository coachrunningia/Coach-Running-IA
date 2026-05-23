import fs from 'fs';

const summary = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/audit11-summary.json'));
const out = [];

function sessionSummary(s) {
  if (!s) return null;
  return {
    day: s.day || s.jour || s.dayOfWeek,
    title: s.title || s.titre || s.name,
    type: s.type,
    duration: s.duration || s.dureeMinutes || s.minutes || s.durationMin,
    distance: s.distance || s.distanceKm || s.km,
    mainSet: (s.mainSet || s.coreSet || s.corps || '').toString().slice(0,300),
    description: (s.description || s.summary || s.objectif || '').toString().slice(0,200),
    intensity: s.intensity || s.intensite,
  };
}

for (const s of summary) {
  if (!s.planId) { out.push({ email: s.email, status: 'NO_PLAN' }); continue; }
  const planPath = `/Users/romanemarino/Coach-Running-IA/audit11-${s.label}-plan.json`;
  const userPath = `/Users/romanemarino/Coach-Running-IA/audit11-${s.label}-user.json`;
  const plan = JSON.parse(fs.readFileSync(planPath));
  const user = fs.existsSync(userPath) ? JSON.parse(fs.readFileSync(userPath)) : null;

  const gc = plan.generationContext || {};
  const weeks = plan.weeks || [];
  const wv = weeks.map(w => w.totalKm || w.weekVolume || w.volumeKm || w.totalDistance || (Array.isArray(w.sessions) ? w.sessions.reduce((acc,ss)=>acc+(Number(ss.distance||ss.distanceKm||ss.km||0)||0),0) : 0));

  const obj = {
    email: s.email,
    label: s.label,
    planId: s.planId,
    createdAt: s.createdAt,
    goal: plan.goal,
    targetTime: plan.targetTime,
    raceDate: plan.raceDate,
    distance: plan.distance,
    planName: plan.name,
    durationWeeks: plan.durationWeeks,
    sessionsPerWeek: plan.sessionsPerWeek,
    vma: plan.vma,
    calculatedVMA: plan.calculatedVMA,
    paces: plan.paces,
    feasibility: plan.feasibility,
    welcomeMessage: (plan.welcomeMessage || '').toString().slice(0, 2000),
    generationContext: {
      keys: Object.keys(gc),
      niveau: gc.niveau || gc.userLevel,
      currentVol: gc.currentVol || gc.currentVolume || gc.weeklyVolume,
      freq: gc.freq || gc.frequency || gc.frequenceSeances,
      BMI: gc.BMI || gc.bmi,
      age: gc.age,
      poids: gc.poids,
      taille: gc.taille,
      sexe: gc.sexe,
      pb5k: gc.pb5k, pb10k: gc.pb10k, pbSemi: gc.pbSemi, pbMarathon: gc.pbMarathon, pb: gc.pb,
      raw: gc,
    },
    weeklyVolumes: wv,
    nbWeeks: weeks.length,
    week1: weeks[0] ? {
      keys: Object.keys(weeks[0]),
      sessions: (weeks[0].sessions||[]).map(sessionSummary),
      totalKm: wv[0],
    } : null,
    user: user,
  };
  out.push(obj);
}

fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/audit11-extracted2.json', JSON.stringify(out, null, 2));
console.log('extracted', out.length);
