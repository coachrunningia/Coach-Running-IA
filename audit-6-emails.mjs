/**
 * AUDIT 6 EMAILS — résolution email → uid → plans + audit profond
 * Focus demandé :
 *   - allures VS objectif rentré en input
 *   - distance DL (sortie longue) max
 *   - volume hebdo + augmentation (Δ%)
 *   - message d'accueil + statut/score de fiabilité
 *   - variation des séances (diversité types + variété par jour)
 *
 * Inspiré de audit-4-plans-deep.mjs + analyze-user.mjs.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

const EMAILS = [
  'kikoune.df@outlook.com',
  'audrey.fourrier@gmail.com',
  'albane.sohier@outlook.com',
  'frederic.bordier22@gmail.com',
  'romain.lambert51@yahoo.fr',
  'beajordi@hotmail.fr',
];

// ============ Firestore value parsing ============
function pv(v){ if(!v) return null;
  if(v.stringValue!==undefined) return v.stringValue;
  if(v.integerValue!==undefined) return parseInt(v.integerValue);
  if(v.doubleValue!==undefined) return v.doubleValue;
  if(v.booleanValue!==undefined) return v.booleanValue;
  if(v.timestampValue!==undefined) return v.timestampValue;
  if(v.arrayValue) return (v.arrayValue.values||[]).map(pv);
  if(v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields){ if(!fields) return {}; const o={}; for(const [k,v] of Object.entries(fields)) o[k]=pv(v); return o; }

async function lookupAuth(email){
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
    { method:'POST', headers:H, body:JSON.stringify({ email:[email] }) });
  const j = await r.json(); return j.users?.[0] || null;
}
async function getDoc(coll,id){
  if(!id) return null;
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${coll}/${id}`, { headers:H });
  const j = await r.json();
  return j.fields ? { id:j.name.split('/').pop(), ...pf(j.fields) } : null;
}
async function plansForUser(uid){
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const arr = await r.json();
  return arr.filter(x=>x.document).map(x=>({ id:x.document.name.split('/').pop(), ...pf(x.document.fields) }));
}

// ============ Allures & utils ============
const paceFmt = (kmh)=>{ const p=60/kmh; const m=Math.floor(p); const s=Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
function paces(vma){
  if(!vma) return null;
  return {
    EF:{ range:[0.65,0.70], str:`${paceFmt(vma*0.70)}–${paceFmt(vma*0.65)}` },
    SL:{ range:[0.65,0.72], str:`${paceFmt(vma*0.72)}–${paceFmt(vma*0.65)}` },
    Marathon:{ range:[0.78,0.82], str:`${paceFmt(vma*0.82)}–${paceFmt(vma*0.78)}` },
    Semi:{ range:[0.82,0.86], str:`${paceFmt(vma*0.86)}–${paceFmt(vma*0.82)}` },
    Seuil:{ range:[0.85,0.90], str:`${paceFmt(vma*0.90)}–${paceFmt(vma*0.85)}` },
    VMAcourte:{ range:[1.00,1.05], str:`${paceFmt(vma*1.05)}–${paceFmt(vma*1.00)}` },
    VMAlongue:{ range:[0.95,1.00], str:`${paceFmt(vma*1.00)}–${paceFmt(vma*0.95)}` },
  };
}
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };
const vmaPct = (p,vma)=>{ const s=paceToSec(p); if(!s||!vma) return null; return (3600/s)/vma; };
const kmFrom = (d)=>{ if(!d) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };
const durMin = (d)=>{ if(!d) return 0; let t=0; const s=String(d); const h=s.match(/(\d+)\s*h/i); if(h) t+=parseInt(h[1])*60; const m=s.match(/(\d+)(?:-\d+)?\s*min/i); if(m) t+=parseInt(m[1]); if(!h&&!m){ const n=s.match(/^(\d+)/); if(n) t=parseInt(n[1]); } return t; };

// ============ AUDIT ============
function deepAudit(p, user){
  const issues=[]; const weeks=p.weeks||[]; const ctx=p.generationContext||{};
  const q=ctx.questionnaireData||ctx; const snap=ctx.questionnaireSnapshot||{};
  const vma=p.vma||ctx.vma||0; const ref=paces(vma);
  const curVol=ctx.currentVolume||q.currentVolume||snap.currentVolume;
  const age=ctx.age||q.age||snap.age;
  const weight=ctx.weight||q.weight||snap.weight; const height=ctx.height||q.height||snap.height;
  const bmi=(weight&&height)?weight/((height/100)**2):null;
  const inj=ctx.injuries||q.injuries||snap.injuries;
  const level=p.level||ctx.level||snap.level;
  const freq=p.sessionsPerWeek||q.frequency||snap.frequency;
  const goal=(p.goal||'').toLowerCase(); const subGoal=(p.subGoal||ctx.subGoal||'').toLowerCase();
  const targetTime=p.targetTime||ctx.targetTime||q.targetTime;
  const trailDist=ctx.trailDistance||q.trailDistance||q.trailDetails?.distance||snap.trailDetails?.distance;
  const trailElev=q.trailDetails?.elevation||ctx.trailDetails?.elevation||snap.trailDetails?.elevation||0;
  const dur=p.durationWeeks||weeks.length;

  // VOLUME
  const volumes = weeks.map(w => (w.sessions||[]).reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0));
  const totalKm=volumes.reduce((s,v)=>s+v,0); const avgKm=totalKm/Math.max(1,volumes.length);
  const peakKm=Math.max(...volumes,0); const peakWeek=volumes.indexOf(peakKm)+1;
  const lastKm=volumes[volumes.length-1]||0; const taperPct=peakKm?(lastKm/peakKm*100):0;
  const deltas=[]; for(let i=1;i<volumes.length;i++) if(volumes[i-1]>0) deltas.push((volumes[i]-volumes[i-1])/volumes[i-1]*100);
  const maxJump=deltas.length?Math.max(...deltas):0; const maxDrop=deltas.length?Math.min(...deltas):0;

  if (curVol && volumes[0] && volumes[0] > curVol*1.30 && curVol>5)
    issues.push({sev:'🔴', cat:'Volume', msg:`S1=${volumes[0].toFixed(0)}km vs actuel ${curVol}km/sem → +${((volumes[0]/curVol-1)*100).toFixed(0)}% (>30%)`});
  for(let i=1;i<volumes.length;i++) if(volumes[i-1]>8){
    const d=(volumes[i]-volumes[i-1])/volumes[i-1];
    if(d>0.20) issues.push({sev:'🟡', cat:'Évolution', msg:`S${i}→S${i+1}: +${(d*100).toFixed(0)}% (${volumes[i-1].toFixed(0)}→${volumes[i].toFixed(0)}km)`});
  }
  let deloadWeeks=[];
  for(let i=2;i<volumes.length;i++) if(volumes[i]<volumes[i-1]*0.85 && volumes[i]<volumes[i-2]*0.85) deloadWeeks.push(i+1);
  if(volumes.length>=5 && deloadWeeks.length===0) issues.push({sev:'🟡', cat:'Évolution', msg:`Aucune semaine de décharge sur ${volumes.length} sem`});
  if(weeks.length>=4){
    if(goal.includes('marathon') && !goal.includes('semi') && taperPct>65)
      issues.push({sev:'🔴', cat:'Affûtage', msg:`Dernière sem=${taperPct.toFixed(0)}% du pic — affûtage marathon insuffisant`});
    else if((goal.includes('semi')||subGoal.includes('semi')) && taperPct>70)
      issues.push({sev:'🟡', cat:'Affûtage', msg:`Dernière sem=${taperPct.toFixed(0)}% du pic — affûtage semi faible`});
  }

  // ALLURES vs objectif input
  const allurePoints=[];
  for(const w of weeks) for(const s of (w.sessions||[])){
    if(!s.targetPace) continue;
    const pct=vmaPct(s.targetPace,vma); if(pct===null) continue;
    const intens=(s.intensity||'').toLowerCase(); const type=(s.type||'').toLowerCase(); const title=(s.title||'').toLowerCase();
    let exp=null, lbl='';
    if(type.includes('seuil')||intens.includes('seuil')||title.includes('seuil')){ exp=[0.82,0.92]; lbl='seuil'; }
    else if(type.includes('vma')||intens.includes('vma')||title.includes('vma')){ exp=[0.92,1.08]; lbl='VMA'; }
    else if(title.includes('spécifique') && goal.includes('marathon') && !goal.includes('semi')){ exp=[0.75,0.84]; lbl='spé marathon'; }
    else if(title.includes('spécifique') && (goal.includes('semi')||subGoal.includes('semi'))){ exp=[0.80,0.88]; lbl='spé semi'; }
    else if(title.includes('spécifique') && (subGoal.includes('10')||goal.includes('10km'))){ exp=[0.85,0.92]; lbl='spé 10km'; }
    else if(intens.includes('marathon')||type.includes('marathon')){ exp=[0.75,0.84]; lbl='marathon'; }
    else if(intens.includes('semi')||type.includes('semi')){ exp=[0.80,0.88]; lbl='semi'; }
    else if(type.includes('longue')||intens.includes('facile')||type.includes('récup')||type.includes('recup')){ exp=[0.62,0.74]; lbl='EF/SL'; }
    if(exp){
      const ok=pct>=exp[0]&&pct<=exp[1];
      allurePoints.push({ week:w.weekNumber, title:s.title, pace:s.targetPace, pct, lbl, exp, ok });
      if(!ok){
        const sev=(pct<exp[0]-0.05||pct>exp[1]+0.05)?'🔴':'🟡';
        issues.push({sev, cat:'Allures', msg:`S${w.weekNumber} "${s.title}": ${s.targetPace}=${(pct*100).toFixed(0)}%VMA vs ${lbl}(${(exp[0]*100).toFixed(0)}-${(exp[1]*100).toFixed(0)}%)`});
      }
    }
  }
  const allureOK=allurePoints.filter(a=>a.ok).length;
  const allurePctOK=allurePoints.length?allureOK/allurePoints.length*100:100;

  // Cohérence allure ↔ chrono input
  let targetCheck=null;
  if(targetTime && vma){
    const tt=String(targetTime); let chronoSec=null;
    const hm=tt.match(/(\d+)\s*h\s*(\d{1,2})?/i);
    if(hm) chronoSec=parseInt(hm[1])*3600+(hm[2]?parseInt(hm[2])*60:0);
    else { const m=tt.match(/(\d{1,2})\s*[:h']\s*(\d{1,2})/); if(m) chronoSec=parseInt(m[1])*60+parseInt(m[2]); }
    let raceKm=null;
    if(goal.includes('marathon')&&!goal.includes('semi')) raceKm=42.195;
    else if(goal.includes('semi')||subGoal.includes('semi')) raceKm=21.097;
    else if(subGoal.includes('10')||goal.includes('10km')) raceKm=10;
    else if(subGoal.includes('5')||goal.includes('5km')) raceKm=5;
    if(raceKm && chronoSec){
      const racePaceSec=chronoSec/raceKm; const racePaceKmh=3600/racePaceSec;
      const pctVMA=racePaceKmh/vma;
      targetCheck={ raceKm, target:tt, paceMinPerKm:`${Math.floor(racePaceSec/60)}:${String(Math.round(racePaceSec%60)).padStart(2,'0')}`, pctVMA };
      const expMin=raceKm>=40?0.78:raceKm>=20?0.82:raceKm>=10?0.86:0.90;
      const expMax=raceKm>=40?0.86:raceKm>=20?0.90:raceKm>=10?0.94:1.00;
      if(pctVMA<expMin-0.05) issues.push({sev:'🔴', cat:'Chrono', msg:`Cible ${tt} sur ${raceKm}km = ${(pctVMA*100).toFixed(0)}%VMA → trop facile (att. ${(expMin*100).toFixed(0)}-${(expMax*100).toFixed(0)}%)`});
      if(pctVMA>expMax+0.05) issues.push({sev:'🔴', cat:'Chrono', msg:`Cible ${tt} sur ${raceKm}km = ${(pctVMA*100).toFixed(0)}%VMA → INATTEIGNABLE (att. ${(expMin*100).toFixed(0)}-${(expMax*100).toFixed(0)}%)`});
    }
  }

  // SL
  const slData = weeks.map(w => {
    const sls=(w.sessions||[]).filter(s=>/longue/i.test(s.type||''));
    return sls.map(s=>({ week:w.weekNumber, dist:kmFrom(s.distance), elev:s.elevationGain||0, pace:s.targetPace, title:s.title }));
  });
  const allSL=slData.flat();
  const slMax=Math.max(0,...allSL.map(s=>s.dist));
  const slMaxElev=Math.max(0,...allSL.map(s=>s.elev));

  // DIVERSITÉ
  const types={}; const sessByDay={}; let easy=0, hard=0;
  for(const w of weeks) for(const s of (w.sessions||[])){
    const t=(s.type||'Autre').trim(); types[t]=(types[t]||0)+1;
    const day=(s.day||'?').toLowerCase(); (sessByDay[day]=sessByDay[day]||[]).push((s.type||'')+'/'+(s.intensity||''));
    const i=(s.intensity||'').toLowerCase(); const tp=(s.type||'').toLowerCase();
    if(tp.includes('renfo')||tp.includes('mobilit')||tp.includes('cross')) continue;
    if(i.includes('facile')||i.includes('modéré')||tp.includes('longue')||tp.includes('récup')) easy++;
    else if(i.includes('seuil')||i.includes('vma')||i.includes('rapide')||i.includes('soutenu')||i.includes('difficile')) hard++;
  }
  const totalIntens=easy+hard; const easyPct=totalIntens?easy/totalIntens:0;
  if(totalIntens>0 && easyPct<0.70) issues.push({sev:'🔴', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile — trop de qualité`});
  else if(totalIntens>0 && easyPct<0.75) issues.push({sev:'🟡', cat:'80/20', msg:`${(easyPct*100).toFixed(0)}% facile — limite basse`});

  // RENFO
  const renfoSess=[];
  for(const w of weeks) for(const s of (w.sessions||[])) if(/renfo/i.test(s.type||'')) renfoSess.push({...s, week:w.weekNumber});
  const renfoFreq=weeks.length?renfoSess.length/weeks.length:0;
  if(weeks.length>=6 && renfoSess.length===0) issues.push({sev:'🔴', cat:'Renfo', msg:`Aucun renfo sur ${weeks.length} sem`});
  else if(weeks.length>=6 && renfoFreq<0.7) issues.push({sev:'🟡', cat:'Renfo', msg:`Renfo ${renfoSess.length}/${weeks.length} sem (cible 1/sem)`});

  // SECURITE / message
  const welcome=p.feasibility?.message||''; const warning=p.feasibility?.safetyWarning||'';
  if(/\bpoids\b|minceur|maigr|imc|kilo|silhouette|amaigriss/i.test(welcome+' '+warning))
    issues.push({sev:'🔴', cat:'Sécurité', msg:`Mention poids/minceur dans le message d'accueil`});

  return { issues, volumes, totalKm, avgKm, peakKm, peakWeek, lastKm, taperPct, deltas, maxJump, maxDrop, deloadWeeks,
    allurePoints, allurePctOK, allureOK, targetCheck,
    renfoSess, renfoFreq, types, sessByDay, easy, hard, easyPct, slData, slMax, slMaxElev,
    welcome, warning, ref, bmi, inj, age, level, freq, goal, subGoal, trailDist, trailElev, curVol, targetTime, dur };
}

// ============ MAIN ============
const out=[]; const log=(...a)=>{ const s=a.join(' '); console.log(s); out.push(s); };
log('═'.repeat(110));
log(`  AUDIT 6 EMAILS  •  ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(110));

for(const email of EMAILS){
  log(`\n\n${'█'.repeat(110)}`);
  log(`  📧 ${email}`);
  log('█'.repeat(110));

  const u = await lookupAuth(email);
  if(!u){ log(`  ❌ Aucun compte Firebase Auth pour cet email.`); continue; }
  const uid=u.localId;
  const userDoc = await getDoc('users', uid);
  const firstName = userDoc?.firstName || u.displayName || '(?)';
  log(`  👤 ${firstName}  •  uid=${uid}  •  Premium ${userDoc?.isPremium?'✅':'❌'} ${userDoc?.hasPurchasedPlan?'+ Plan Unique':''}`);
  log(`  📅 Créé ${u.createdAt?new Date(parseInt(u.createdAt)).toISOString().substring(0,19):'?'}  •  Last login ${u.lastLoginAt?new Date(parseInt(u.lastLoginAt)).toISOString().substring(0,19):'?'}`);

  const plans = await plansForUser(uid);
  if(plans.length===0){ log(`  ⚠ Aucun plan généré.`); continue; }
  // Sort par createdAt desc
  plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  log(`  📚 ${plans.length} plan(s) trouvé(s)`);

  for(const p of plans){
    const a = deepAudit(p, userDoc);
    const ctx = p.generationContext||{};
    const w = (p.weeks||[]).length;
    const vma = p.vma||ctx.vma;
    const t = p.createdAt?new Date(p.createdAt).toLocaleString('fr-FR'):'?';
    const score = a.issues.reduce((s,i)=>s+(i.sev==='🔴'?3:1),0);
    const sessTotal = (p.weeks||[]).reduce((s,w)=>s+(w.sessions||[]).length,0);
    const note = score===0?'A+':sessTotal&&score/sessTotal<0.3?'A':sessTotal&&score/sessTotal<0.6?'B':sessTotal&&score/sessTotal<1?'C':'D';

    log(`\n  ╔${'═'.repeat(106)}╗`);
    log(`    PLAN ${p.id} — ${p.name||'(sans nom)'}`);
    log(`    Note ${note}  •  ${a.issues.length} issues  •  Score ${score}  •  ${w}/${a.dur} sem  •  Créé ${t}`);
    log(`  ╚${'═'.repeat(106)}╝`);
    log(`  🎯 Objectif: ${p.goal} ${p.subGoal?`(${p.subGoal})`:''}${a.trailDist?` — ${a.trailDist}km/${a.trailElev}m D+`:''}  •  Cible: ${a.targetTime||'Finisher'}  •  ${a.freq||'?'} séances/sem`);
    log(`  🧬 VMA ${vma?.toFixed?.(1)||vma}km/h  •  ${a.age||'?'} ans  •  IMC ${a.bmi?.toFixed?.(1)||'?'}  •  ${a.level||'?'}  •  Vol actuel: ${a.curVol||'?'}km/sem  •  Blessures: ${a.inj||'aucune'}`);
    log(`  isPreview=${p.isPreview} fullPlanGenerated=${p.fullPlanGenerated}`);

    log(`\n  ─── 💬 MESSAGE D'ACCUEIL & FIABILITÉ ───`);
    log(`    Statut feasibility: ${p.feasibility?.status||'?'}  •  Score: ${p.feasibility?.score??p.feasibility?.feasibilityScore??'?'}`);
    log(`    Message:  "${a.welcome}"`);
    log(`    Warning:  "${a.warning}"`);

    if(a.targetCheck){
      log(`\n  ─── ⏱ COHÉRENCE CHRONO ↔ ALLURE ───`);
      log(`    ${a.targetCheck.target} sur ${a.targetCheck.raceKm}km → ${a.targetCheck.paceMinPerKm}/km = ${(a.targetCheck.pctVMA*100).toFixed(0)}%VMA`);
    }
    if(a.ref){
      log(`\n  ─── 📏 ALLURES THÉORIQUES (VMA ${vma?.toFixed?.(1)}) ───`);
      log(`    EF ${a.ref.EF.str}/km  •  SL ${a.ref.SL.str}/km  •  Marathon ${a.ref.Marathon.str}/km  •  Semi ${a.ref.Semi.str}/km`);
      log(`    Seuil ${a.ref.Seuil.str}/km  •  VMA longue ${a.ref.VMAlongue.str}/km  •  VMA courte ${a.ref.VMAcourte.str}/km`);
    }

    log(`\n  ─── 📊 VOLUME HEBDO — ${a.totalKm.toFixed(0)}km total • Moy ${a.avgKm.toFixed(1)}km • Pic S${a.peakWeek}=${a.peakKm.toFixed(0)}km • Affûtage ${a.taperPct.toFixed(0)}% ───`);
    const maxV=Math.max(...a.volumes,1);
    a.volumes.forEach((v,i)=>{
      const bar='█'.repeat(Math.round((v/maxV)*36))+'·'.repeat(36-Math.round((v/maxV)*36));
      const flag=a.deloadWeeks.includes(i+1)?'↓DELOAD':(i+1===a.peakWeek?'★PIC':'');
      const delta=i>0&&a.volumes[i-1]>0?`${(((v-a.volumes[i-1])/a.volumes[i-1])*100).toFixed(0).padStart(4)}%`:'   --';
      log(`    S${String(i+1).padStart(2)} ${v.toFixed(0).padStart(3)}km |${bar}| Δ${delta} ${flag}`);
    });
    if(a.deltas.length) log(`    Max progression: +${a.maxJump.toFixed(0)}%  •  Max décharge: ${a.maxDrop.toFixed(0)}%`);

    log(`\n  ─── 🏃 SORTIE LONGUE — max ${a.slMax.toFixed(0)}km${a.trailDist?` / ${a.slMaxElev}m D+`:''} ───`);
    const slDistByWeek=a.slData.map(arr=>arr.reduce((s,x)=>s+x.dist,0));
    const slMaxBar=Math.max(...slDistByWeek,1);
    slDistByWeek.forEach((v,i)=>{
      if(v===0) return;
      const bar='█'.repeat(Math.round((v/slMaxBar)*36))+'·'.repeat(36-Math.round((v/slMaxBar)*36));
      const ratio=a.volumes[i]>0?(v/a.volumes[i]*100).toFixed(0):'0';
      const sl=a.slData[i][0];
      log(`    S${String(i+1).padStart(2)} ${v.toFixed(0).padStart(2)}km |${bar}| ${ratio}% du vol${sl?.elev?'  D+'+sl.elev+'m':''}  ${sl?.pace||''}`);
    });

    log(`\n  ─── 🎯 COHÉRENCE ALLURES vs TYPE — ${a.allureOK}/${a.allurePoints.length} OK (${a.allurePctOK.toFixed(0)}%) ───`);
    const byLbl={}; a.allurePoints.forEach(ap=>{ (byLbl[ap.lbl]=byLbl[ap.lbl]||[]).push(ap); });
    for(const [lbl,list] of Object.entries(byLbl)){
      const ok=list.filter(x=>x.ok).length;
      const minP=Math.min(...list.map(x=>x.pct)); const maxP=Math.max(...list.map(x=>x.pct));
      log(`    ${lbl.padEnd(15)} ${ok}/${list.length} OK  •  range ${(minP*100).toFixed(0)}-${(maxP*100).toFixed(0)}%VMA`);
    }

    log(`\n  ─── 🎨 VARIATION DES SÉANCES — ${Object.keys(a.types).length} types • 80/20: ${a.easy} easy / ${a.hard} hard (${(a.easyPct*100).toFixed(0)}% easy) ───`);
    Object.entries(a.types).sort((x,y)=>y[1]-x[1]).forEach(([t,n])=> log(`    ${t.padEnd(28)} ${'■'.repeat(Math.min(36,n))} ${n}`));
    log(`    Variété hebdomadaire :`);
    Object.entries(a.sessByDay).forEach(([d,arr])=>{
      const unique=[...new Set(arr.map(x=>x.split('/')[0]))];
      log(`      ${d.padEnd(10)} ${unique.length} type(s) / ${arr.length} séances : ${unique.join(', ')}`);
    });

    log(`\n  ─── 💪 RENFO — ${a.renfoSess.length}/${w} sem  •  Fréq ${a.renfoFreq.toFixed(2)}/sem ───`);
    if(a.renfoSess.length===0) log(`    ❌ AUCUNE séance de renforcement`);
    else a.renfoSess.slice(0,3).forEach(r=>log(`    S${r.week}: "${r.title}" — ${r.duration||'?'}`));

    log(`\n  ─── 🔎 DIAGNOSTIC — ${a.issues.length} issue(s) ───`);
    if(a.issues.length===0) log(`    ✅ Aucun problème détecté`);
    else {
      const byCat={}; a.issues.forEach(i=>(byCat[i.cat]=byCat[i.cat]||[]).push(i));
      for(const [cat,list] of Object.entries(byCat)){
        log(`    ▸ ${cat} (${list.length}):`);
        list.forEach(i=>log(`      ${i.sev} ${i.msg}`));
      }
    }
  }
}

writeFileSync('audit-6-emails.txt', out.join('\n'));
console.log(`\n📝 audit-6-emails.txt`);
