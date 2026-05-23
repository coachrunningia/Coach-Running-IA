import { readFileSync, writeFileSync } from 'fs';
const ids = ['1779291643754', '1779291819180', '1779292771055', '1779296358366'];
const rows = [];
for (const id of ids) {
  const plan = JSON.parse(readFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/plan-${id}.json`,'utf-8'));
  const user = JSON.parse(readFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/user-${id}.json`,'utf-8'));
  const q = user.questionnaireData || {};
  const gen = plan.generationContext || {};
  const peri = gen.periodizationPlan || {};
  const weeks = plan.weeks || [];
  const wv = peri.weeklyVolumes || [];
  const f = plan.feasibility || {};
  const paces = plan.paces || {};
  // S1 sessions
  const s1 = weeks[0]?.sessions || [];
  const slS1 = s1.find(s => /SL|Sortie Longue/i.test(s.type || s.name || ''));
  // last week
  const wL = weeks[weeks.length-1] || {};
  const lastCourse = (wL.sessions||[]).find(s => /Course|Race|Officielle/i.test(s.type||s.name||s.description||''));
  rows.push({
    id,
    createdAt: plan.createdAt,
    email: user.email,
    sex: q.sex, age: q.age, weight: q.weight, height: q.height,
    bmi: q.weight && q.height ? (q.weight / Math.pow(q.height/100,2)).toFixed(1) : null,
    level: q.runnerLevel || q.level,
    goal: q.goal, subGoal: q.subGoal,
    targetTime: q.targetTime,
    raceDate: q.raceDate,
    frequency: q.frequency,
    currentWeeklyVolume: q.currentWeeklyVolume,
    pb5k: q.pb5k, pb10k: q.pb10k, pbSemi: q.pbSemi, pbMarathon: q.pbMarathon,
    vma: q.vma || gen.vma || plan.vma,
    planTitle: plan.title,
    planDistance: plan.distance,
    planTotalWeeks: weeks.length,
    weeklyVolumes: wv,
    weeklyVolumesMin: wv.length ? Math.min(...wv) : null,
    weeklyVolumesMax: wv.length ? Math.max(...wv) : null,
    paces: {
      ef: paces.efPace || paces.ef,
      semi: paces.allureSpecifiqueSemi || paces.semi,
      marathon: paces.allureSpecifiqueMarathon || paces.marathon,
      seuil: paces.allureSeuil || paces.seuil,
    },
    feasibility: {
      status: f.status,
      score: f.score,
      message: f.message,
      theoreticalTimeMinutes: f.theoreticalTimeMinutes || f.theoMinutes,
    },
    modelUsed: gen.modelUsed || plan.modelUsed,
    welcomeMessage: plan.welcomeMessage,
    slS1: slS1 ? { name: slS1.name, type: slS1.type, distance: slS1.distance, duration: slS1.duration, pace: slS1.pace, description: slS1.description, mainSet: slS1.mainSet } : null,
    lastWeek: wL ? { sessions: (wL.sessions||[]).map(s=>({name:s.name,type:s.type,distance:s.distance,duration:s.duration,description:s.description?.substring(0,200)})) } : null,
  });
}
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/extracted.json', JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows, null, 2));
