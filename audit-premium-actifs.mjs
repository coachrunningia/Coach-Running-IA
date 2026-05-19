/**
 * Audit des plans premium actifs (hors Arnaud déjà patché).
 * Référentiel v2 + règle freq N = (N-1) course + 1 renfo.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const active = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/active-premium.json'));
const toAudit = active.filter(a => a.planId !== '1778521479387'); // Arnaud déjà fait

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const paceSec = (p) => { const m = String(p||'').match(/(\d+):(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };

console.log(`\n══════ AUDIT ${toAudit.length} premium actifs (réf v2 + règle N-1+1) ══════\n`);

const fullResults = [];
for (const a of toAudit) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${a.planId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const doc = pf((await r.json()).fields);
  const qs = doc.generationContext?.questionnaireSnapshot || {};
  const peri = doc.generationContext?.periodizationPlan;
  const weeks = doc.weeks || [];
  const vma = doc.vma || qs.vma || 0;
  const freqDecl = doc.sessionsPerWeek || qs.frequency;
  const expCourse = freqDecl - 1; // règle N-1
  const goal = doc.goal;
  const subGoal = doc.targetTime || qs.targetTime;
  const preferredDays = qs.preferredDays || [];

  const issues = [];

  // === 1. Faisabilité cible (refus dur v2) ===
  if (vma && subGoal && subGoal !== 'Finisher') {
    const tm = String(subGoal).match(/(\d+)h?(\d*)/i);
    if (tm) {
      const h = parseInt(tm[1])||0, mn = tm[2] ? parseInt(tm[2]) : 0;
      const targetH = h + mn/60;
      let dist = null;
      const nameLow = (doc.name||'').toLowerCase();
      if (/marathon/i.test(nameLow) && !/semi/i.test(nameLow)) dist = 42.195;
      else if (/semi/i.test(nameLow) || /21\s*km/.test(nameLow)) dist = 21.0975;
      else if (/10\s*km/.test(nameLow) || /10km/.test(nameLow)) dist = 10;
      else if (/5\s*km/.test(nameLow)) dist = 5;
      if (dist && targetH > 0) {
        const req = dist / targetH;
        const pct = req / vma;
        let limit = 0.85;
        if (dist === 10) limit = 0.92;
        else if (dist === 21.0975) limit = 0.88;
        if (pct > limit) issues.push({sev:'🔴', msg:`Cible ${subGoal} sur ${dist}km = ${(pct*100).toFixed(1)}%VMA > limit ${(limit*100).toFixed(0)}% → faisabilité critique`});
      }
    }
  }

  // === 2. Volumes vs périodisation ===
  if (peri?.weeklyVolumes && weeks.length) {
    const realVols = weeks.map(w => (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((sum,x) => sum + kmOf(x), 0));
    let bigGaps = 0;
    for (let i = 0; i < Math.min(realVols.length, peri.weeklyVolumes.length); i++) {
      const gap = (realVols[i] - peri.weeklyVolumes[i]) / peri.weeklyVolumes[i];
      if (Math.abs(gap) > 0.20) bigGaps++;
    }
    if (bigGaps > weeks.length * 0.3) issues.push({sev:'🟡', msg:`${bigGaps}/${weeks.length} semaines hors ±20% de periodizationPlan`});
  }

  // === 3. Cohérence dist × pace = durée ===
  let cohIssues = 0, totalSess = 0;
  for (const w of weeks) for (const s of (w.sessions||[])) {
    if (s.type === 'Renforcement') continue;
    totalSess++;
    const ps = paceSec(s.targetPace), km = kmOf(s), dm = durMin(s.duration);
    if (ps && km && dm && Math.abs(dm - (km*ps)/60) / ((km*ps)/60) > 0.15) cohIssues++;
  }
  if (cohIssues > totalSess * 0.20) issues.push({sev:'🟡', msg:`${cohIssues}/${totalSess} séances incohérentes dist×pace≠durée`});

  // === 4. SL count par semaine (1 max sauf perte de poids) ===
  const isPertePoids = /perte.*poids/i.test(goal||'');
  for (const w of weeks) {
    const slCount = (w.sessions||[]).filter(s => /sortie\s*longue/i.test(s.type||'')).length;
    const maxSL = isPertePoids ? 2 : 1;
    if (slCount > maxSL) { issues.push({sev:'🟡', msg:`S${w.weekNumber}: ${slCount} SL (max ${maxSL})`}); break; }
  }

  // === 5. Course count = freqDecl - 1 ===
  for (const w of weeks) {
    const courseCount = (w.sessions||[]).filter(s => s.type !== 'Renforcement').length;
    if (courseCount > expCourse) { issues.push({sev:'🟡', msg:`S${w.weekNumber}: ${courseCount} séances course vs ${expCourse} attendues (freq ${freqDecl} = N-1 course + 1 renfo)`}); break; }
  }

  // === 6. Renfo absent ===
  let totalRenfo = 0;
  for (const w of weeks) totalRenfo += (w.sessions||[]).filter(s => /renfo/i.test(s.type||'')).length;
  if (weeks.length >= 6 && totalRenfo < weeks.length * 0.5) issues.push({sev:'🟡', msg:`Renfo: ${totalRenfo}/${weeks.length} sem (attendu ≥${Math.ceil(weeks.length*0.5)})`});

  // === 7. Jours préférés ===
  if (preferredDays.length > 0) {
    let wrongDays = 0;
    for (const w of weeks) for (const s of (w.sessions||[])) {
      if (s.day && !preferredDays.includes(s.day)) wrongDays++;
    }
    if (wrongDays > 2) issues.push({sev:'🟡', msg:`${wrongDays} séances sur jour non-préféré (déclaré: ${preferredDays.join(',')})`});
  }

  // === Verdict ===
  const sev = issues.length === 0 ? '✅' : issues.filter(i => i.sev === '🔴').length > 0 ? '🔴' : '🟡';
  console.log(`${sev} ${(a.email||'?').padEnd(40)} | VMA ${vma?.toFixed(1)} | freq ${freqDecl} | ${weeks.length} sem | ${doc.name?.substring(0,40)}`);
  for (const i of issues) console.log(`     ${i.sev} ${i.msg}`);

  fullResults.push({ ...a, doc, issues, sev });
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-premium-actifs.json', JSON.stringify(fullResults.map(({doc, ...rest}) => rest), null, 2));

console.log(`\n══════ SYNTHÈSE ══════`);
console.log(`✅ Plans propres        : ${fullResults.filter(r => r.sev === '✅').length}`);
console.log(`🟡 Plans mineurs        : ${fullResults.filter(r => r.sev === '🟡').length}`);
console.log(`🔴 Plans critiques     : ${fullResults.filter(r => r.sev === '🔴').length}`);
