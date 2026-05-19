/**
 * AUDIT EN PROFONDEUR de 4 plans précis :
 * — Distance totale + évolution + plot ASCII
 * — Cohérence allures par type de séance
 * — Cohérence sécurité (blessures, âge, IMC)
 * — Renforcement (charge, progression, type d'exercices)
 * — Cohérence globale (durée, fréquence, affûtage, spécificité)
 * — Diversité (types, variété par jour)
 * — Lecture du contenu réel (mainSet, advice, warmup, cooldown)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_IDS = ['1774955442930', '1776286108764', '1778615277138', '1778669503908'];

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

async function getDoc(coll, id) {
  if (!id) return null;
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  return j.fields ? { id: j.name.split('/').pop(), ...pf(j.fields) } : null;
}

// ============ UTILS ============
const paceFmt = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
function paces(vma) {
  if (!vma) return null;
  return {
    EF: { range:[0.65,0.70], str:`${paceFmt(vma*0.70)}–${paceFmt(vma*0.65)}` },
    SL: { range:[0.65,0.72], str:`${paceFmt(vma*0.72)}–${paceFmt(vma*0.65)}` },
    Marathon: { range:[0.78,0.82], str:`${paceFmt(vma*0.82)}–${paceFmt(vma*0.78)}` },
    Semi: { range:[0.82,0.86], str:`${paceFmt(vma*0.86)}–${paceFmt(vma*0.82)}` },
    Seuil: { range:[0.85,0.90], str:`${paceFmt(vma*0.90)}–${paceFmt(vma*0.85)}` },
    VMAcourte: { range:[1.00,1.05], str:`${paceFmt(vma*1.05)}–${paceFmt(vma*1.00)}` },
    VMAlongue: { range:[0.95,1.00], str:`${paceFmt(vma*1.00)}–${paceFmt(vma*0.95)}` },
  };
}
const paceToSec = (p) => { if (!p) return null; const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const vmaPct = (pace, vma) => { const s = paceToSec(pace); if (!s || !vma) return null; return (3600/s)/vma; };
const kmFrom = (d) => { if (!d) return 0; const v = parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };
const durMin = (d) => { if (!d) return 0; let t=0; const s=String(d); const h=s.match(/(\d+)\s*h/i); if(h) t+=parseInt(h[1])*60; const m=s.match(/(\d+)(?:-\d+)?\s*min/i); if(m) t+=parseInt(m[1]); if(!h && !m) { const n=s.match(/^(\d+)/); if(n) t=parseInt(n[1]); } return t; };

// Plot ASCII vertical bar
function plot(values, label, maxBars = 20) {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1);
  const lines = [];
  const barWidth = 4;
  const height = 8;
  for (let row = height; row >= 0; row--) {
    let line = '  ';
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const barHeight = Math.round((v / max) * height);
      line += (barHeight >= row ? '█▆▅▄▃▂▁'[Math.min(6, row === barHeight ? Math.min(6, Math.floor((v / max) * 6.999)) : 0)] || '█' : ' ').padEnd(2);
    }
    lines.push(line);
  }
  lines.push('  ' + values.map((_, i) => String(i+1).padEnd(2)).join(''));
  lines.unshift(`  ${label} (max=${max.toFixed(0)})`);
  return lines;
}
// Simpler bar plot
function simpleBars(values, max = null) {
  const m = max || Math.max(...values, 1);
  return values.map(v => {
    const w = Math.round((v/m) * 30);
    return '█'.repeat(w) + '·'.repeat(30 - w);
  });
}

// ============ AUDIT EN PROFONDEUR ============
function deepAudit(p, user) {
  const issues = [];
  const weeks = p.weeks || [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const snap = ctx.questionnaireSnapshot || {};
  const vma = p.vma || ctx.vma || 0;
  const ref = paces(vma);
  const curVol = ctx.currentVolume || q.currentVolume || snap.currentVolume;
  const age = ctx.age || q.age || snap.age;
  const sex = ctx.sex || q.sex || snap.sex;
  const weight = ctx.weight || q.weight || snap.weight;
  const height = ctx.height || q.height || snap.height;
  const bmi = (weight && height) ? weight / ((height/100)**2) : null;
  const inj = ctx.injuries || q.injuries || snap.injuries;
  const exp = ctx.experience || q.experience || snap.experience;
  const level = p.level || ctx.level || snap.level;
  const freq = p.sessionsPerWeek || q.frequency || snap.frequency;
  const goal = (p.goal || '').toLowerCase();
  const subGoal = (p.subGoal || ctx.subGoal || '').toLowerCase();
  const trailDist = ctx.trailDistance || q.trailDistance || q.trailDetails?.distance || snap.trailDetails?.distance;
  const trailElev = q.trailDetails?.elevation || ctx.trailDetails?.elevation || snap.trailDetails?.elevation || 0;
  const dur = p.durationWeeks || weeks.length;

  // === 1. VOLUME & EVOLUTION ===
  const volumes = weeks.map(w => (w.sessions||[]).reduce((s,x) => /renfo|mobilit|cross/i.test(x.type||'') ? s : s + kmFrom(x.distance), 0));
  const totalKm = volumes.reduce((s,v)=>s+v, 0);
  const avgKm = totalKm / Math.max(1, volumes.length);
  const peakKm = Math.max(...volumes, 0);
  const peakWeek = volumes.indexOf(peakKm) + 1;
  const lastKm = volumes[volumes.length-1] || 0;
  const taperPct = peakKm ? (lastKm / peakKm * 100) : 0;
  const deltas = [];
  for (let i=1; i<volumes.length; i++) {
    if (volumes[i-1] > 0) deltas.push((volumes[i]-volumes[i-1]) / volumes[i-1] * 100);
  }
  const maxJump = deltas.length ? Math.max(...deltas) : 0;
  const maxDrop = deltas.length ? Math.min(...deltas) : 0;

  // Saut S1 / vol actuel
  if (curVol && volumes[0] && volumes[0] > curVol * 1.30 && curVol > 5)
    issues.push({sev:'🔴', cat:'Volume', msg:`S1=${volumes[0].toFixed(0)}km vs actuel ${curVol}km/sem → +${((volumes[0]/curVol-1)*100).toFixed(0)}% (>30%)`});
  // Progression hebdo
  for (let i=1; i<volumes.length; i++) {
    if (volumes[i-1] > 8) {
      const d = (volumes[i] - volumes[i-1]) / volumes[i-1];
      if (d > 0.20) issues.push({sev:'🟡', cat:'Évolution', msg:`S${i}→S${i+1}: +${(d*100).toFixed(0)}% (${volumes[i-1].toFixed(0)}→${volumes[i].toFixed(0)}km)`});
    }
  }
  // Décharge
  let deloadWeeks = [];
  for (let i=2; i<volumes.length; i++) {
    if (volumes[i] < volumes[i-1]*0.85 && volumes[i] < volumes[i-2]*0.85) deloadWeeks.push(i+1);
  }
  if (volumes.length >= 5 && deloadWeeks.length === 0)
    issues.push({sev:'🟡', cat:'Évolution', msg:`Aucune semaine de décharge sur ${volumes.length} sem`});
  // Affûtage final
  if (weeks.length >= 4) {
    if (goal.includes('marathon') && !goal.includes('semi') && taperPct > 65)
      issues.push({sev:'🔴', cat:'Affûtage', msg:`Dernière sem=${taperPct.toFixed(0)}% du pic — affûtage marathon insuffisant`});
    else if ((goal.includes('semi') || subGoal.includes('semi')) && taperPct > 70)
      issues.push({sev:'🟡', cat:'Affûtage', msg:`Dernière sem=${taperPct.toFixed(0)}% du pic — affûtage semi faible`});
  }

  // === 2. ALLURES ===
  const allurePoints = [];
  for (const w of weeks) for (const s of (w.sessions||[])) {
    if (!s.targetPace) continue;
    const pct = vmaPct(s.targetPace, vma); if (pct===null) continue;
    const intens = (s.intensity||'').toLowerCase();
    const type = (s.type||'').toLowerCase();
    const title = (s.title||'').toLowerCase();
    let exp = null, lbl = '';
    if (type.includes('seuil') || intens.includes('seuil') || title.includes('seuil')) { exp=[0.82,0.92]; lbl='seuil'; }
    else if (type.includes('vma') || intens.includes('vma') || title.includes('vma')) { exp=[0.92,1.08]; lbl='VMA'; }
    else if (title.includes('spécifique') && (goal.includes('marathon') && !goal.includes('semi'))) { exp=[0.75,0.84]; lbl='spé marathon'; }
    else if (title.includes('spécifique') && (goal.includes('semi') || subGoal.includes('semi'))) { exp=[0.80,0.88]; lbl='spé semi'; }
    else if (title.includes('spécifique') && (subGoal.includes('10')||goal.includes('10km'))) { exp=[0.85,0.92]; lbl='spé 10km'; }
    else if (intens.includes('marathon') || type.includes('marathon')) { exp=[0.75,0.84]; lbl='marathon'; }
    else if (intens.includes('semi') || type.includes('semi')) { exp=[0.80,0.88]; lbl='semi'; }
    else if (type.includes('longue') || intens.includes('facile') || type.includes('récup') || type.includes('recup')) { exp=[0.62,0.74]; lbl='EF/SL'; }
    if (exp) {
      const ok = pct >= exp[0] && pct <= exp[1];
      allurePoints.push({ week: w.weekNumber, title: s.title, pace: s.targetPace, pct, lbl, exp, ok });
      if (!ok) {
        const sev = (pct < exp[0]-0.05 || pct > exp[1]+0.05) ? '🔴' : '🟡';
        issues.push({sev, cat:'Allures', msg:`S${w.weekNumber} "${s.title}": ${s.targetPace}=${(pct*100).toFixed(0)}%VMA vs ${lbl}(${(exp[0]*100).toFixed(0)}-${(exp[1]*100).toFixed(0)}%)`});
      }
    }
  }
  const allureOK = allurePoints.filter(a => a.ok).length;
  const allurePctOK = allurePoints.length ? allureOK / allurePoints.length * 100 : 100;

  // === 3. SÉCURITÉ ===
  const safety = { passed: [], failed: [] };
  // Mineur
  if (age && age < 18) safety.failed.push(`Mineur (${age}) — plan ne devrait pas être généré`);
  // Senior
  if (age && age >= 50) safety.passed.push(`Senior ${age} ans détecté`);
  // BMI
  if (bmi) {
    if (bmi >= 28) {
      let pliometrie = 0;
      for (const w of weeks) for (const s of (w.sessions||[])) {
        const txt = ((s.mainSet||'')+' '+(s.title||'')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        if (s.type === 'Renforcement' && (txt.includes('saute')||txt.includes('saut ')||txt.includes('jump')||txt.includes('pliomet')||txt.includes('bond'))) pliometrie++;
      }
      if (pliometrie > 0) safety.failed.push(`IMC ${bmi.toFixed(1)} ≥28 mais ${pliometrie} séance(s) avec pliométrie/sauts`);
      else safety.passed.push(`IMC ${bmi.toFixed(1)} — pliométrie correctement évitée`);
    }
  }
  // Blessures
  const welcome = p.feasibility?.message || '';
  const warning = p.feasibility?.safetyWarning || '';
  if (inj && !/aucun|non|rien|^$/i.test(String(inj))) {
    if (/blessur|kiné|médecin|professionnel|santé/i.test(warning)) safety.passed.push(`Blessure "${inj}" — mention kiné/médecin présente`);
    else safety.failed.push(`Blessure "${inj}" — pas de mention kiné/médecin dans warning`);
    // Vérif squat bulgare / fente unipodale si genou
    if (/genou|rotul|ligament/i.test(String(inj))) {
      let unipodal = 0;
      for (const w of weeks) for (const s of (w.sessions||[])) {
        if (/squat bulgare|fente.*unipodal/i.test((s.mainSet||'')+' '+(s.title||''))) unipodal++;
      }
      if (unipodal) safety.failed.push(`Blessure genou "${inj}" mais ${unipodal} séance(s) avec squat bulgare/fente unipodal — contre-indiqué`);
    }
  } else safety.passed.push(`Aucune blessure déclarée`);
  // Mention poids/minceur
  if (/\bpoids\b|minceur|maigr|imc|kilo|silhouette|amaigriss/i.test(welcome+' '+warning)) {
    safety.failed.push(`Mention POIDS/MINCEUR dans le message — règle violée`);
    issues.push({sev:'🔴', cat:'Sécurité', msg:`Mention poids/minceur dans le message d'accueil`});
  } else safety.passed.push(`Aucune mention poids/minceur dans le message`);
  // Cohérence durée vs objectif
  if (goal.includes('marathon') && !goal.includes('semi') && dur < 12) safety.failed.push(`Marathon en ${dur} sem — risque blessure (min 12)`);
  if (trailDist >= 100 && dur < 20) safety.failed.push(`Ultra ${trailDist}km en ${dur} sem — risque sérieux (min 20-24)`);
  if (trailDist >= 60 && trailDist < 100 && dur < 16) safety.failed.push(`Trail ${trailDist}km en ${dur} sem — court (min 16)`);
  // D+ progression pour trail
  if (trailDist && trailElev) {
    const totalDplus = weeks.reduce((s,w) => s + (w.sessions||[]).reduce((s2,x) => s2+(x.elevationGain||0), 0), 0);
    const maxSLelev = Math.max(0, ...weeks.flatMap(w => (w.sessions||[]).filter(s=>/longue/i.test(s.type||'')).map(s=>s.elevationGain||0)));
    if (weeks.length >= 4) {
      if (totalDplus < trailElev * 3) safety.failed.push(`D+ cumulé ${totalDplus}m << 3x course (${trailElev*3}m attendu min)`);
      else safety.passed.push(`D+ cumulé ${totalDplus}m — ${(totalDplus/trailElev).toFixed(1)}x la course`);
      if (maxSLelev < trailElev * 0.4) safety.failed.push(`SL max D+ ${maxSLelev}m < 40% de la course ${trailElev}m`);
      else safety.passed.push(`SL max D+ ${maxSLelev}m — ${(maxSLelev/trailElev*100).toFixed(0)}% de la course`);
    }
  }

  // === 4. RENFORCEMENT ===
  const renfoSess = [];
  for (const w of weeks) for (const s of (w.sessions||[])) if (/renfo/i.test(s.type||'')) renfoSess.push({...s, week: w.weekNumber});
  const renfoFreq = weeks.length ? renfoSess.length / weeks.length : 0;
  const renfoDurations = renfoSess.map(r => durMin(r.duration));
  const exoCounts = renfoSess.map(r => {
    const m = (r.mainSet || '').match(/\([0-9]+x[0-9]+/g);
    return m ? m.length : 0;
  });
  // Progression renfo : split en moitiés
  let renfoProgression = 'N/A';
  if (renfoDurations.length >= 4) {
    const mid = Math.floor(renfoDurations.length / 2);
    const avg1 = renfoDurations.slice(0,mid).reduce((s,v)=>s+v,0)/mid;
    const avg2 = renfoDurations.slice(mid).reduce((s,v)=>s+v,0)/(renfoDurations.length-mid);
    renfoProgression = `${avg1.toFixed(0)}→${avg2.toFixed(0)} min`;
    if (avg2 <= avg1 * 1.05 && weeks.length >= 8) issues.push({sev:'🟡', cat:'Renfo', msg:`Pas de progression renfo (${avg1.toFixed(0)}→${avg2.toFixed(0)} min)`});
  }
  if (weeks.length >= 6 && renfoSess.length === 0)
    issues.push({sev:'🔴', cat:'Renfo', msg:`Aucun renfo sur ${weeks.length} sem`});
  else if (weeks.length >= 6 && renfoFreq < 0.7)
    issues.push({sev:'🟡', cat:'Renfo', msg:`Renfo ${renfoSess.length}/${weeks.length} sem (cible 1/sem)`});

  // === 5. DIVERSITÉ ===
  const types = {};
  const sessByDay = {};
  let easy=0, hard=0;
  for (const w of weeks) for (const s of (w.sessions||[])) {
    const t = (s.type||'Autre').trim();
    types[t] = (types[t]||0) + 1;
    const day = (s.day||'?').toLowerCase();
    (sessByDay[day] = sessByDay[day] || []).push((s.type||'') + '/' + (s.intensity||''));
    const i = (s.intensity||'').toLowerCase();
    const tp = (s.type||'').toLowerCase();
    if (tp.includes('renfo')||tp.includes('mobilit')||tp.includes('cross')) continue;
    if (i.includes('facile')||i.includes('modéré')||tp.includes('longue')||tp.includes('récup')) easy++;
    else if (i.includes('seuil')||i.includes('vma')||i.includes('rapide')||i.includes('soutenu')||i.includes('difficile')) hard++;
  }
  const totalIntens = easy+hard;
  const easyPct = totalIntens ? easy/totalIntens : 0;
  if (totalIntens > 0 && easyPct < 0.70)
    issues.push({sev:'🔴', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile — trop de qualité`});
  else if (totalIntens > 0 && easyPct < 0.75)
    issues.push({sev:'🟡', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile — limite basse`});

  // === 6. SL (sortie longue) ===
  const slData = weeks.map(w => {
    const sls = (w.sessions||[]).filter(s => /longue/i.test(s.type||''));
    return sls.map(s => ({ week: w.weekNumber, dist: kmFrom(s.distance), elev: s.elevationGain||0, pace: s.targetPace, title: s.title }));
  });
  const allSL = slData.flat();
  const slMax = Math.max(0, ...allSL.map(s=>s.dist));
  const slMaxElev = Math.max(0, ...allSL.map(s=>s.elev));

  // === 7. QUALITÉ DESCRIPTIONS ===
  let emptyMain = 0;
  const allSess = weeks.flatMap(w => w.sessions||[]);
  for (const s of allSess) if (!s.mainSet || String(s.mainSet).length < 20) emptyMain++;
  if (allSess.length > 0 && emptyMain/allSess.length > 0.3)
    issues.push({sev:'🟡', cat:'Qualité', msg:`${emptyMain}/${allSess.length} séances avec mainSet vide ou très court`});

  return {
    issues, volumes, totalKm, avgKm, peakKm, peakWeek, lastKm, taperPct, deltas, maxJump, maxDrop, deloadWeeks,
    allurePoints, allurePctOK, allureOK,
    safety, renfoSess, renfoFreq, renfoDurations, renfoProgression, exoCounts,
    types, sessByDay, easy, hard, easyPct, slData, slMax, slMaxElev, emptyMain,
    welcome, warning, ref, bmi, inj, age, level, exp, freq, goal, subGoal, trailDist, trailElev, curVol
  };
}

// ============ MAIN ============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

log(`${'═'.repeat(110)}`);
log(`  AUDIT EN PROFONDEUR — 4 PLANS  •  ${new Date().toLocaleString('fr-FR')}`);
log(`${'═'.repeat(110)}`);

for (const id of PLAN_IDS) {
  const p = await getDoc('plans', id);
  if (!p) { log(`\n❌ Plan ${id} introuvable`); continue; }
  const user = await getDoc('users', p.userId);
  const a = deepAudit(p, user);
  const ctx = p.generationContext || {};
  const t = p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR') : '?';
  const weeksDep = (p.weeks||[]).length;
  const vma = p.vma || ctx.vma;
  const score = a.issues.reduce((s,i)=>s+(i.sev==='🔴'?3:1),0);
  const sessTotal = (p.weeks||[]).reduce((s,w)=>s+(w.sessions||[]).length,0);
  const noteN = score===0?'A+': score/sessTotal<0.3?'A':score/sessTotal<0.6?'B':score/sessTotal<1?'C':'D';

  log(`\n\n${'╔'+'═'.repeat(108)+'╗'}`);
  log(`  ${id} — ${p.name||'(sans nom)'}`);
  log(`  Note ${noteN}  •  ${a.issues.length} issues  •  Score ${score}`);
  log(`${'╚'+'═'.repeat(108)+'╝'}`);
  log(``);
  log(`👤 ${user?.firstName||'?'} (${user?.email||p.userEmail||'?'})  •  Premium: ${user?.isPremium?'✅':'❌'} ${user?.hasPurchasedPlan?'+ Plan Unique':''}`);
  log(`📅 Créé ${t}  •  ${weeksDep}/${p.durationWeeks||'?'} sem déployées  •  ${a.freq||'?'} séances/sem`);
  log(`🎯 ${p.goal} ${p.subGoal?`(${p.subGoal})`:''}${a.trailDist?` — ${a.trailDist}km/${a.trailElev}m D+`:''}  •  Cible: ${p.targetTime||'Finisher'}`);
  log(`🧬 VMA ${vma?.toFixed?.(1)||vma} km/h  •  ${a.age||'?'} ans  •  IMC ${a.bmi?.toFixed?.(1)||'?'}  •  ${a.level||'?'}  •  Vol actuel: ${a.curVol||'?'} km/sem  •  Blessures: ${a.inj||'aucune'}`);

  log(`\n${'─'.repeat(110)}`);
  log(`  💬 MESSAGE D'ACCUEIL`);
  log(`${'─'.repeat(110)}`);
  log(`  Statut: ${p.feasibility?.status||'?'}`);
  log(`  Message:  "${a.welcome}"`);
  log(`  Warning:  "${a.warning}"`);

  log(`\n${'─'.repeat(110)}`);
  log(`  📏 ALLURES THÉORIQUES (VMA ${vma?.toFixed?.(1)})`);
  log(`${'─'.repeat(110)}`);
  if (a.ref) {
    log(`  EF (65-70%):     ${a.ref.EF.str}/km`);
    log(`  SL (65-72%):     ${a.ref.SL.str}/km`);
    log(`  Marathon (78-82%): ${a.ref.Marathon.str}/km`);
    log(`  Semi (82-86%):   ${a.ref.Semi.str}/km`);
    log(`  Seuil (85-90%):  ${a.ref.Seuil.str}/km`);
    log(`  VMA longue (95-100%): ${a.ref.VMAlongue.str}/km`);
    log(`  VMA courte (100-105%): ${a.ref.VMAcourte.str}/km`);
  }

  log(`\n${'─'.repeat(110)}`);
  log(`  📊 VOLUME HEBDO — ${a.totalKm.toFixed(0)}km total  •  Moy ${a.avgKm.toFixed(1)}km  •  Pic S${a.peakWeek}=${a.peakKm.toFixed(0)}km  •  Affûtage ${a.taperPct.toFixed(0)}%`);
  log(`${'─'.repeat(110)}`);
  const maxV = Math.max(...a.volumes, 1);
  a.volumes.forEach((v,i) => {
    const bar = '█'.repeat(Math.round((v/maxV)*40)) + '·'.repeat(40 - Math.round((v/maxV)*40));
    const flag = a.deloadWeeks.includes(i+1) ? '↓DELOAD' : (i+1===a.peakWeek?'★PIC':'');
    const delta = i>0 && a.volumes[i-1]>0 ? `${(((v-a.volumes[i-1])/a.volumes[i-1])*100).toFixed(0).padStart(4)}%` : '   --';
    log(`  S${String(i+1).padStart(2)} ${v.toFixed(0).padStart(3)}km |${bar}| Δ${delta} ${flag}`);
  });
  if (a.deltas.length) log(`  Max progression: +${a.maxJump.toFixed(0)}%  •  Max décharge: ${a.maxDrop.toFixed(0)}%`);

  log(`\n${'─'.repeat(110)}`);
  log(`  🏃 SORTIE LONGUE — max ${a.slMax.toFixed(0)}km${a.trailDist?` / ${a.slMaxElev}m D+`:''}`);
  log(`${'─'.repeat(110)}`);
  const slDistByWeek = a.slData.map(arr => arr.reduce((s,x)=>s+x.dist, 0));
  const slMaxBar = Math.max(...slDistByWeek, 1);
  slDistByWeek.forEach((v,i) => {
    if (v === 0) return;
    const bar = '█'.repeat(Math.round((v/slMaxBar)*40)) + '·'.repeat(40 - Math.round((v/slMaxBar)*40));
    const ratio = a.volumes[i]>0 ? (v/a.volumes[i]*100).toFixed(0) : '0';
    const sl = a.slData[i][0];
    log(`  S${String(i+1).padStart(2)} ${v.toFixed(0).padStart(2)}km |${bar}| ${ratio}% du vol  ${sl?.elev?'D+'+sl.elev+'m  ':''}${sl?.pace||''}`);
  });

  log(`\n${'─'.repeat(110)}`);
  log(`  🎯 COHÉRENCE ALLURES — ${a.allureOK}/${a.allurePoints.length} OK (${a.allurePctOK.toFixed(0)}%)`);
  log(`${'─'.repeat(110)}`);
  // Regroupe par type de séance
  const byLbl = {};
  a.allurePoints.forEach(ap => { (byLbl[ap.lbl] = byLbl[ap.lbl] || []).push(ap); });
  for (const [lbl, list] of Object.entries(byLbl)) {
    const ok = list.filter(x=>x.ok).length;
    const pcts = list.map(x => (x.pct*100).toFixed(0)+'%');
    const minPct = Math.min(...list.map(x=>x.pct));
    const maxPct = Math.max(...list.map(x=>x.pct));
    log(`  ${lbl.padEnd(15)} ${ok}/${list.length} OK  •  range ${(minPct*100).toFixed(0)}-${(maxPct*100).toFixed(0)}%VMA`);
  }

  log(`\n${'─'.repeat(110)}`);
  log(`  💪 RENFORCEMENT — ${a.renfoSess.length}/${weeksDep} sem  •  Fréq ${a.renfoFreq.toFixed(2)}/sem  •  Progression: ${a.renfoProgression}`);
  log(`${'─'.repeat(110)}`);
  if (a.renfoSess.length === 0) log(`  ❌ AUCUNE séance de renforcement`);
  else {
    log(`  Durées (min): ${a.renfoDurations.join(', ')}`);
    log(`  Nb exos/séance: ${a.exoCounts.join(', ')}`);
    log(`  Exemples titres:`);
    a.renfoSess.slice(0,5).forEach(r => log(`    S${r.week}: "${r.title}" — ${r.duration||'?'} — mainSet: ${(r.mainSet||'').substring(0,90)}${(r.mainSet||'').length>90?'...':''}`));
  }

  log(`\n${'─'.repeat(110)}`);
  log(`  🛡 SÉCURITÉ`);
  log(`${'─'.repeat(110)}`);
  a.safety.passed.forEach(m => log(`  ✅ ${m}`));
  a.safety.failed.forEach(m => log(`  🔴 ${m}`));

  log(`\n${'─'.repeat(110)}`);
  log(`  🎨 DIVERSITÉ — ${Object.keys(a.types).length} types  •  80/20: ${a.easy} facile / ${a.hard} dur (${(a.easyPct*100).toFixed(0)}% facile)`);
  log(`${'─'.repeat(110)}`);
  Object.entries(a.types).sort((x,y)=>y[1]-x[1]).forEach(([t,n]) => log(`  ${t.padEnd(30)} ${'■'.repeat(Math.min(40,n))} ${n}`));
  log(`  Variété hebdomadaire :`);
  Object.entries(a.sessByDay).forEach(([d,arr]) => {
    const unique = [...new Set(arr.map(x=>x.split('/')[0]))];
    log(`    ${d.padEnd(10)} ${unique.length} type(s) sur ${arr.length} séances : ${unique.join(', ')}`);
  });

  log(`\n${'─'.repeat(110)}`);
  log(`  🔎 DIAGNOSTIC — ${a.issues.length} issue(s)`);
  log(`${'─'.repeat(110)}`);
  if (a.issues.length === 0) log(`  ✅ Aucun problème détecté`);
  else {
    const byCat = {};
    a.issues.forEach(i => (byCat[i.cat] = byCat[i.cat]||[]).push(i));
    for (const [cat, list] of Object.entries(byCat)) {
      log(`  ▸ ${cat} (${list.length}):`);
      list.forEach(i => log(`    ${i.sev} ${i.msg}`));
    }
  }
}

writeFileSync('audit-4-plans-deep.txt', lines.join('\n'));
console.log(`\n📝 audit-4-plans-deep.txt`);
