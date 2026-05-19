/**
 * Audit léger des 14 freemium des 24h (S1 seule).
 * Pour chaque plan : volume cible vs réel, cohérence dist×pace=durée, allure EF,
 * faisabilité cible, jours respectés, SL unique, présence renfo.
 */
import { readFileSync } from 'fs';
const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => p.createdAt && new Date(p.createdAt) >= since && p.fullPlanGenerated !== true).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const paceSec = (p) => {
  const m = String(p||'').match(/(\d+):(\d+)/);
  return m ? parseInt(m[1])*60 + parseInt(m[2]) : null;
};
const durMin = (d) => {
  let s = 0;
  const dStr = String(d||'');
  const h = dStr.match(/(\d+)\s*h/); if (h) s += parseInt(h[1]) * 60;
  const m = dStr.match(/(\d+)\s*min/); if (m) s += parseInt(m[1]);
  return s;
};
const vmaPct = (pace, vma) => {
  const ps = paceSec(pace);
  if (!ps || !vma) return null;
  return (3600/ps) / vma;
};

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  AUDIT LÉGER — 14 plans FREEMIUM des 24h (S1 seule)                          ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

const issues = [];

for (const p of plans) {
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const peri = p.generationContext?.periodizationPlan;
  const s1 = p.weeks?.[0];
  if (!s1) continue;
  const runs = (s1.sessions || []).filter(s => !/renfo/i.test(s.type || ''));
  const renfo = (s1.sessions || []).filter(s => /renfo/i.test(s.type || ''));
  const vol = runs.reduce((s,x) => s + kmOf(x), 0);
  const target = peri?.weeklyVolumes?.[0];
  const vma = p.vma || qs.vma || 0;
  const goal = p.goal;
  const subGoal = p.targetTime || qs.targetTime;
  const freqDecl = p.sessionsPerWeek || qs.frequency;
  const preferredDays = qs.preferredDays || [];

  const planIssues = [];

  // 1. Volume cible
  if (target && Math.abs((vol-target)/target) > 0.20) {
    planIssues.push(`Volume S1 ${vol.toFixed(0)}km vs cible ${target}km = ${(((vol-target)/target)*100).toFixed(0)}%`);
  }

  // 2. Cohérence dist × pace = durée
  let coherenceIssues = 0;
  for (const s of runs) {
    if (!s.targetPace || s.type === 'Renforcement') continue;
    const ps = paceSec(s.targetPace);
    const km = kmOf(s);
    const dm = durMin(s.duration);
    if (ps && km && dm) {
      const expDur = (km * ps) / 60;
      if (Math.abs(dm - expDur) / expDur > 0.15) coherenceIssues++;
    }
  }
  if (coherenceIssues > 0) planIssues.push(`${coherenceIssues}/${runs.length} séances incohérentes dist×pace≠durée`);

  // 3. Allure EF dans la fourchette 60-75 %VMA (référentiel v2)
  for (const s of runs) {
    const isEF = s.type === 'Jogging' || s.type === 'Sortie Longue' || /facile|récup/i.test(s.intensity || '');
    if (!isEF || !s.targetPace) continue;
    const pct = vmaPct(s.targetPace, vma);
    if (pct === null) continue;
    if (pct < 0.55 || pct > 0.80) planIssues.push(`Allure EF "${s.title}": ${s.targetPace} = ${(pct*100).toFixed(0)}%VMA hors 60-75%`);
  }

  // 4. Faisabilité cible (référentiel v2 : refus dur >92% 10km, >88% semi, >85% marathon)
  if (vma && subGoal && subGoal !== 'Finisher') {
    const tm = String(subGoal).match(/(\d+)h?(\d*)/i);
    if (tm) {
      const h = parseInt(tm[1]) || 0;
      const mn = tm[2] ? parseInt(tm[2]) : 0;
      const targetH = h + mn/60;
      let dist = null;
      const goalLow = (goal||'').toLowerCase() + ' ' + (subGoal||'').toString().toLowerCase();
      if (/marathon/i.test(goal||'') && !/semi/i.test(goal||'')) dist = 42.195;
      else if (/semi/i.test(goal||'') || /21/i.test(subGoal||'')) dist = 21.0975;
      else if (/10\s*km/i.test(goalLow)) dist = 10;
      else if (/5\s*km/i.test(goalLow)) dist = 5;
      if (dist && targetH > 0) {
        const requiredKmh = dist / targetH;
        const pct = requiredKmh / vma;
        let limit = 0.85;
        if (dist === 10) limit = 0.92;
        else if (dist === 21.0975) limit = 0.88;
        if (pct > limit) planIssues.push(`⚠ FAISABILITÉ : ${subGoal} sur ${dist}km = ${(pct*100).toFixed(0)}%VMA > ${(limit*100).toFixed(0)}% max → refus dur (v2)`);
      }
    }
  }

  // 5. Préférence jours respectée
  if (preferredDays.length > 0) {
    const planDays = runs.map(s => s.day);
    const wrongDays = planDays.filter(d => !preferredDays.includes(d));
    if (wrongDays.length > 0) planIssues.push(`Jours non-préférés: ${[...new Set(wrongDays)].join(', ')}`);
  }

  // 6. Fréquence respectée (séances course)
  if (freqDecl && runs.length !== freqDecl) {
    planIssues.push(`${runs.length} séances course vs ${freqDecl} déclarées`);
  }

  // 7. 1 SL max
  const slCount = (s1.sessions||[]).filter(s => /sortie\s*longue|^sortie longue$/i.test(s.type || '')).length;
  if (slCount > 1) planIssues.push(`${slCount} séances "Sortie Longue" en S1 (max 1)`);

  // === Report ===
  const sev = planIssues.length === 0 ? '✅' : planIssues.length <= 1 ? '🟡' : '🔴';
  console.log(`${sev} ${p.name.substring(0, 55).padEnd(55)} | VMA ${vma?.toFixed(1)} | ${freqDecl}x/sem | S1=${vol.toFixed(0)}km`);
  if (planIssues.length) planIssues.forEach(i => console.log(`     - ${i}`));
  if (planIssues.length) issues.push({ name: p.name, id: p.id, email: p.userEmail, problems: planIssues });
}

console.log(`\n══ SYNTHÈSE ══`);
console.log(`Plans avec problèmes critiques: ${issues.filter(p => p.problems.length >= 2).length}/${plans.length}`);
console.log(`Plans avec problèmes mineurs:   ${issues.filter(p => p.problems.length === 1).length}/${plans.length}`);
console.log(`Plans propres:                  ${plans.length - issues.length}/${plans.length}`);

console.log(`\n══ FAISABILITÉS CRITIQUES (refus dur attendu) ══`);
issues.forEach(p => {
  const feas = p.problems.find(s => /FAISABILITÉ/.test(s));
  if (feas) console.log(`  ${p.email || '?'}: ${p.name}`);
});
