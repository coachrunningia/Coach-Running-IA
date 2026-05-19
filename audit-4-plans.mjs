/**
 * Audit complet de 4 plans précis par leur ID.
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

async function getPlan(id) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) return null;
  return { id: j.name.split('/').pop(), ...pf(j.fields) };
}

async function getUser(id) {
  if (!id) return null;
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) return null;
  return { id: j.name.split('/').pop(), ...pf(j.fields) };
}

// ==== UTILS ====
function paces(vma) {
  if (!vma) return null;
  const f = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
  return {
    EF: `${f(vma*0.70)}–${f(vma*0.65)}`,
    SL: `${f(vma*0.72)}–${f(vma*0.65)}`,
    Marathon: `${f(vma*0.82)}–${f(vma*0.78)}`,
    Semi: `${f(vma*0.86)}–${f(vma*0.82)}`,
    Seuil: `${f(vma*0.90)}–${f(vma*0.85)}`,
    VMAcourte: `${f(vma*1.05)}–${f(vma*1.00)}`,
    VMAlongue: `${f(vma*1.00)}–${f(vma*0.95)}`,
  };
}
function paceToSec(p) { if (!p) return null; const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; }
function vmaPctFromPace(pace, vma) { const s = paceToSec(pace); if (!s || !vma) return null; return (3600/s)/vma; }
function kmFromDist(d) { if (!d) return 0; const v = parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; }

function auditPlan(p, user) {
  const issues = [];
  const weeks = p.weeks || [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const vma = p.vma || ctx.vma || 0;
  const ref = paces(vma);
  const curVol = ctx.currentVolume || q.currentVolume;
  const freq = p.sessionsPerWeek;
  const goal = (p.goal || '').toLowerCase();
  const subGoal = (p.subGoal || ctx.subGoal || '').toLowerCase();
  const trailDist = ctx.trailDistance || q.trailDistance || q.trailDetails?.distance;
  const goalElevation = q.trailDetails?.elevation || ctx.trailDetails?.elevation || q.elevation || 0;
  const inj = ctx.injuries || q.injuries;

  // Message accueil
  const welcome = p.feasibility?.message || '';
  const warning = p.feasibility?.safetyWarning || '';
  if (!welcome || welcome.length < 20) issues.push({sev:'🟡', cat:'Accueil', msg:'Message vide/court'});
  if (/poids|minceur|maigr|imc|kilo|silhouette/i.test(welcome+warning)) issues.push({sev:'🔴', cat:'Accueil', msg:'Mention poids/minceur interdite'});
  if (inj && !/aucun|non|rien|^$/i.test(String(inj)) && warning && !/blessur|kiné|médecin|professionnel/i.test(warning)) {
    issues.push({sev:'🟡', cat:'Accueil', msg:`Blessure "${inj}" sans rappel kiné/médecin`});
  }

  // Allures
  if (vma) for (const w of weeks) for (const s of (w.sessions||[])) {
    if (!s.targetPace) continue;
    const pct = vmaPctFromPace(s.targetPace, vma); if (pct===null) continue;
    const intens = (s.intensity||'').toLowerCase(); const type = (s.type||'').toLowerCase();
    let exp=null, lbl='';
    if (type.includes('longue')||intens.includes('facile')||type.includes('récup')||type.includes('recup')) { exp=[0.62,0.74]; lbl='EF/SL'; }
    else if (type.includes('seuil')||intens.includes('seuil')) { exp=[0.82,0.92]; lbl='seuil'; }
    else if (type.includes('vma')||intens.includes('vma')||intens.includes('rapide')) { exp=[0.92,1.08]; lbl='VMA'; }
    else if (intens.includes('marathon')||type.includes('marathon')) { exp=[0.75,0.84]; lbl='marathon'; }
    else if (intens.includes('semi')||type.includes('semi')) { exp=[0.80,0.88]; lbl='semi'; }
    if (exp && (pct<exp[0]||pct>exp[1])) {
      const sev = (pct<exp[0]-0.05||pct>exp[1]+0.05)?'🔴':'🟡';
      issues.push({sev, cat:'Allures', msg:`S${w.weekNumber} "${s.title}": ${s.targetPace}=${(pct*100).toFixed(0)}%VMA vs ${lbl} (${(exp[0]*100).toFixed(0)}-${(exp[1]*100).toFixed(0)}%)`});
    }
  }

  // Volumes hebdo
  const volumes = weeks.map(w => (w.sessions||[]).reduce((s,x)=>/renfo|mobilit|cross/i.test(x.type||'')?s:s+kmFromDist(x.distance),0));
  if (curVol && volumes[0] && volumes[0] > curVol*1.30 && curVol>5) issues.push({sev:'🔴', cat:'Charge', msg:`S1 ${volumes[0].toFixed(0)}km vs actuel ${curVol}km/sem — +${((volumes[0]/curVol-1)*100).toFixed(0)}%`});
  for (let i=1; i<volumes.length; i++) if (volumes[i-1]>8) {
    const j = (volumes[i]-volumes[i-1])/volumes[i-1];
    if (j > 0.20) issues.push({sev:'🟡', cat:'Évolution', msg:`S${i}→S${i+1}: +${(j*100).toFixed(0)}% (${volumes[i-1].toFixed(0)}→${volumes[i].toFixed(0)}km)`});
  }
  let hasDeload = false;
  for (let i=2; i<volumes.length; i++) if (volumes[i]<volumes[i-1]*0.85 && volumes[i]<volumes[i-2]*0.85) hasDeload = true;
  if (volumes.length>=5 && !hasDeload) issues.push({sev:'🟡', cat:'Évolution', msg:'Pas de semaine de décharge'});

  // SL
  const slDist = weeks.map(w => Math.max(0, ...(w.sessions||[]).filter(s=>/longue/i.test(s.type||'')).map(s=>kmFromDist(s.distance))));
  const slMax = Math.max(...slDist, 0);
  let slCap = null;
  if (goal.includes('marathon') && !goal.includes('semi')) slCap = [28,35];
  else if (goal.includes('semi') || subGoal.includes('semi')) slCap = [16,22];
  else if (subGoal.includes('10') || goal.includes('10km')) slCap = [10,16];
  else if (trailDist >= 60) slCap = [Math.max(20, trailDist*0.4), trailDist*0.6];
  else if (trailDist >= 20) slCap = [trailDist*0.6, trailDist*0.85];
  if (slCap && slMax > 0) {
    if (slMax < slCap[0]) issues.push({sev:'🟡', cat:'SL', msg:`SL max ${slMax.toFixed(0)}km < cible ${slCap[0]}-${slCap[1]}km`});
    else if (slMax > slCap[1]) issues.push({sev:'🟡', cat:'SL', msg:`SL max ${slMax.toFixed(0)}km > cible ${slCap[0]}-${slCap[1]}km`});
  }
  for (let i=0; i<weeks.length; i++) if (volumes[i]>0 && slDist[i]>volumes[i]*0.45) issues.push({sev:'🟡', cat:'SL', msg:`S${i+1}: SL ${slDist[i]}km = ${(slDist[i]/volumes[i]*100).toFixed(0)}% du vol hebdo`});

  // D+ (trail)
  let dPlusByWeek = [], slDplus = [];
  if (trailDist) {
    dPlusByWeek = weeks.map(w => (w.sessions||[]).reduce((s,x)=>s+(x.elevationGain||0),0));
    slDplus = weeks.map(w => (w.sessions||[]).filter(s=>/longue/i.test(s.type||'')).reduce((s,x)=>s+(x.elevationGain||0),0));
    const maxSLelev = Math.max(0, ...slDplus);
    if (goalElevation && maxSLelev < goalElevation*0.4) issues.push({sev:'🟡', cat:'D+', msg:`SL max ${maxSLelev}m D+ < 60% cible ${goalElevation}m`});
    const totalDplus = dPlusByWeek.reduce((s,v)=>s+v, 0);
    if (goalElevation && totalDplus < goalElevation*5) issues.push({sev:'🔴', cat:'D+', msg:`D+ cumulé ${totalDplus}m << 5x course ${goalElevation}m`});
  }

  // Diversité + 80/20 + renfo
  const sessAll = weeks.flatMap(w => w.sessions||[]);
  const types = {}; sessAll.forEach(s => { const t = (s.type||'Autre').trim(); types[t]=(types[t]||0)+1; });
  let easy=0, hard=0;
  for (const s of sessAll) {
    const i = (s.intensity||'').toLowerCase(); const t = (s.type||'').toLowerCase();
    if (t.includes('renfo')||t.includes('mobilit')||t.includes('cross')) continue;
    if (i.includes('facile')||i.includes('modéré')||t.includes('longue')||t.includes('récup')) easy++;
    else if (i.includes('seuil')||i.includes('vma')||i.includes('rapide')||i.includes('soutenu')||i.includes('difficile')) hard++;
  }
  const total = easy+hard;
  if (total > 0) {
    const easyPct = easy/total;
    if (easyPct < 0.70) issues.push({sev:'🔴', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile (cible 80%)`});
    else if (easyPct < 0.75) issues.push({sev:'🟡', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile (cible 80%)`});
  }
  const renfo = sessAll.filter(s=>/renfo/i.test(s.type||'')).length;
  if (weeks.length>=6 && renfo===0) issues.push({sev:'🔴', cat:'Renfo', msg:`0 renfo sur ${weeks.length} sem`});
  else if (weeks.length>=6 && renfo<weeks.length*0.7) issues.push({sev:'🟡', cat:'Renfo', msg:`${renfo} renfo sur ${weeks.length} sem`});

  // Cohérence
  const dur = p.durationWeeks || weeks.length;
  if (goal.includes('marathon') && !goal.includes('semi') && dur<12) issues.push({sev:'🔴', cat:'Durée', msg:`Marathon en ${dur} sem`});
  if ((goal.includes('semi')||subGoal.includes('semi')) && dur<8) issues.push({sev:'🟡', cat:'Durée', msg:`Semi en ${dur} sem`});
  if (trailDist>=100 && dur<20) issues.push({sev:'🔴', cat:'Durée', msg:`Ultra ${trailDist}km en ${dur} sem`});
  for (const w of weeks) {
    const days = (w.sessions||[]).map(s=>s.day).filter(Boolean);
    const dupes = [...new Set(days.filter((d,i)=>days.indexOf(d)!==i))];
    if (dupes.length) issues.push({sev:'🔴', cat:'Structure', msg:`S${w.weekNumber}: jours dupliqués [${dupes.join(',')}]`});
  }

  return { issues, volumes, slDist, slDplus, slMax, dPlusByWeek, types, easy, hard, renfo, welcome, warning, ref, goalElevation };
}

function noteOf(issues, total) {
  const score = issues.reduce((s,i)=>s+(i.sev==='🔴'?3:i.sev==='🟡'?1:0),0);
  const ratio = total ? score/total : score;
  if (score===0) return {lab:'A+', emo:'🏆'};
  if (ratio<0.3) return {lab:'A', emo:'✅'};
  if (ratio<0.6) return {lab:'B', emo:'👍'};
  if (ratio<1.0) return {lab:'C', emo:'⚠️'};
  return {lab:'D', emo:'🚨'};
}

const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

log(`${'═'.repeat(110)}`);
log(`  AUDIT 4 PLANS  •  ${new Date().toLocaleString('fr-FR')}`);
log(`${'═'.repeat(110)}\n`);

for (const id of PLAN_IDS) {
  const p = await getPlan(id);
  if (!p) { log(`\n❌ Plan ${id} introuvable`); continue; }
  const user = await getUser(p.userId);
  const a = auditPlan(p, user);
  const totalSess = (p.weeks||[]).reduce((s,w)=>s+(w.sessions||[]).length,0);
  const n = noteOf(a.issues, totalSess);

  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || ctx;
  const vma = p.vma || ctx.vma;
  const t = p.createdAt ? new Date(p.createdAt).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}) : '?';
  const weeksDep = (p.weeks||[]).length;

  log(`\n┌${'─'.repeat(108)}`);
  log(`│ ${n.emo} ${p.id}  •  Note ${n.lab}  •  ${p.name||'(sans nom)'}`);
  log(`│ Créé ${t}  •  ${weeksDep}/${p.durationWeeks||'?'} sem  •  Premium: ${user?.isPremium?'✅':'❌'} ${user?.hasPurchasedPlan?'+ planUnique':''}`);
  log(`│ User: ${user?.email||p.userEmail||'?'}  •  ${user?.firstName||'?'}  •  UID ${p.userId?.substring(0,12)}`);
  log(`│`);
  log(`│ ── PROFIL ──`);
  log(`│ VMA: ${vma?.toFixed?.(1)||vma||'?'} km/h  •  ${ctx.age||q.age||'?'} ans  •  ${ctx.sex||q.sex||'?'}  •  niveau: ${p.level||ctx.level||'?'}`);
  log(`│ Vol actuel: ${ctx.currentVolume||q.currentVolume||'?'} km/sem  •  Expérience: ${ctx.experience||q.experience||'?'}  •  Blessures: ${ctx.injuries||q.injuries||'aucune'}`);
  log(`│ Objectif: ${p.goal||'?'} ${p.subGoal?`(${p.subGoal})`:''}  •  ${q.trailDetails?.distance?`trail ${q.trailDetails.distance}km/${q.trailDetails.elevation}m`:''}`);
  log(`│ Cible: ${p.targetTime||'Finisher'}  •  ${p.sessionsPerWeek||'?'} séances/sem`);
  log(`│`);
  log(`│ ── ACCUEIL ──`);
  log(`│ Statut: ${p.feasibility?.status||'?'}`);
  log(`│ Message: ${a.welcome?`"${a.welcome.substring(0,180)}${a.welcome.length>180?'...':''}"`:'(vide)'}`);
  log(`│ Warning: ${a.warning?`"${a.warning.substring(0,180)}${a.warning.length>180?'...':''}"`:'(aucun)'}`);
  log(`│`);
  if (a.ref) {
    log(`│ ── ALLURES (VMA ${vma?.toFixed?.(1)||vma}) ──`);
    log(`│ EF: ${a.ref.EF}/km  •  Seuil: ${a.ref.Seuil}/km  •  VMA courte: ${a.ref.VMAcourte}  •  VMA longue: ${a.ref.VMAlongue}`);
    log(`│`);
  }
  log(`│ ── VOLUME HEBDO ──`);
  log(`│ ${a.volumes.map((v,i)=>`S${i+1}=${v.toFixed(0)}km`).join('  ')}`);
  log(`│ Total ${a.volumes.reduce((s,v)=>s+v,0).toFixed(0)}km  •  Moy ${(a.volumes.reduce((s,v)=>s+v,0)/Math.max(1,a.volumes.length)).toFixed(1)}km  •  Pic ${Math.max(0,...a.volumes).toFixed(0)}km`);
  log(`│`);
  log(`│ ── SORTIE LONGUE ──`);
  log(`│ ${a.slDist.map((v,i)=>`S${i+1}=${v.toFixed(0)}km`).join('  ')}`);
  log(`│ SL max: ${a.slMax.toFixed(0)}km`);
  if (a.dPlusByWeek.length) {
    log(`│`);
    log(`│ ── D+ ── (cible course: ${a.goalElevation}m)`);
    log(`│ Tot/sem: ${a.dPlusByWeek.map((v,i)=>`S${i+1}=${v}m`).join('  ')}`);
    log(`│ SL D+: ${a.slDplus.map((v,i)=>`S${i+1}=${v}m`).join('  ')}  •  max SL: ${Math.max(0,...a.slDplus)}m`);
  }
  log(`│`);
  log(`│ ── DIVERSITÉ ──`);
  log(`│ Types: ${Object.entries(a.types).map(([t,n])=>`${t}(${n})`).join(', ')}`);
  log(`│ 80/20: ${a.easy} facile / ${a.hard} dur = ${a.easy+a.hard?((a.easy/(a.easy+a.hard))*100).toFixed(0):'?'}% facile  •  Renfo: ${a.renfo}`);
  log(`│`);
  log(`│ ── DIAGNOSTIC (${a.issues.length}) ──`);
  if (a.issues.length===0) log(`│ ✅ Aucun problème détecté`);
  else {
    const byCat = {};
    a.issues.forEach(i => (byCat[i.cat]=byCat[i.cat]||[]).push(i));
    for (const [c, list] of Object.entries(byCat)) {
      log(`│   ▸ ${c}:`);
      list.forEach(i => log(`│     ${i.sev} ${i.msg}`));
    }
  }
  log(`└${'─'.repeat(108)}`);
}

writeFileSync('audit-4-plans.txt', lines.join('\n'));
console.log(`\n📝 audit-4-plans.txt`);
