/**
 * AUDIT V3 — PRIORITÉ : ALLURES → DISTANCES ÉVOLUTION → SL → puis message/fiabilité
 *
 * Sources :
 *   - allures théoriques : plan.paces (efPace, eaPace, seuilPace, vmaPace, recoveryPace, allureSpecifiqueXX)
 *   - cohérence allures : chaque séance S1 → pace vs type vs paces[]
 *   - évolution distances : generationContext.periodizationPlan.weeklyVolumes (projection des N semaines)
 *   - SL : SEULEMENT S1 disponible en preview (la projection SL par semaine n'est pas exposée)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

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
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

const EMAILS = ['kikoune.df@outlook.com','audrey.fourrier@gmail.com','albane.sohier@outlook.com','frederic.bordier22@gmail.com','romain.lambert51@yahoo.fr','beajordi@hotmail.fr'];

const fmtInj = (inj) => {
  if(!inj) return 'aucune';
  if(typeof inj === 'string') return inj;
  if(Array.isArray(inj)) return inj.map(x => typeof x==='string'?x:(x?.description||x?.name||JSON.stringify(x))).join(', ') || 'aucune';
  if(typeof inj === 'object'){
    if(inj.hasInjury === false) return 'aucune';
    if(inj.hasInjury === true && inj.description) return inj.description;
    return Object.entries(inj).filter(([k,v])=>v&&k!=='hasInjury').map(([k,v])=>`${k}=${v}`).join(', ') || 'aucune';
  }
  return String(inj);
};
const kmFrom = (d)=>{ if(!d) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };
const secDiff = (p1, p2) => { const a=paceToSec(p1), b=paceToSec(p2); return (a&&b)?Math.abs(a-b):null; };

const out=[]; const log=(...a)=>{ const s=a.join(' '); console.log(s); out.push(s); };

log('═'.repeat(125));
log(`  AUDIT V3 — ALLURES • DISTANCES ÉVOLUTION • SL • MESSAGE/FIABILITÉ  •  ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(125));

const summary = [];

for(const email of EMAILS){
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method:'POST', headers:H, body:JSON.stringify({ email:[email] }) });
  const u = (await lookup.json()).users?.[0];
  if(!u){ log(`\n❌ ${email} — pas de compte`); continue; }
  const uid = u.localId;
  const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
  const user = ud.status===404?{}:pf((await ud.json()).fields);
  const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const plans = (await pq.json()).filter(x=>x.document).map(x=>pf(x.document.fields));
  if(!plans.length) continue;
  plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const p = plans[0];
  const ctx = p.generationContext||{};
  const snap = ctx.questionnaireSnapshot||{};
  const pp = ctx.periodizationPlan||{};

  const vma = p.vma||ctx.vma;
  const goal = p.goal||snap.goal;
  const subGoal = p.subGoal||snap.subGoal;
  const targetTime = p.targetTime||snap.targetTime;
  const raceDate = p.raceDate||snap.raceDate;
  const dur = p.durationWeeks;
  const freq = p.sessionsPerWeek||snap.frequency;
  const curVol = snap.currentWeeklyVolume ?? ctx.currentVolume ?? snap.currentVolume;
  const curDplus = snap.currentWeeklyElevation;
  const inj = snap.injuries||ctx.injuries;
  const age = snap.age||ctx.age;
  const w_ = snap.weight||ctx.weight; const h_ = snap.height||ctx.height;
  const bmi = (w_&&h_)?w_/((h_/100)**2):null;
  const level = p.level||snap.level;
  const trailDist = snap.trailDetails?.distance||ctx.trailDistance;
  const trailElev = snap.trailDetails?.elevation||0;
  const recent = snap.recentRaceTimes||{};

  const paces = p.paces||{};
  const wv = pp.weeklyVolumes||[];
  const wp = pp.weeklyPhases||[];
  const recoveryWeeks = pp.recoveryWeeks||[];

  // Cohérence allure vs chrono cible
  let chronoCheck = null;
  if(targetTime && vma){
    const tt = String(targetTime); let chronoSec=null;
    const hm = tt.match(/(\d+)\s*h\s*(\d{1,2})?/i);
    if(hm) chronoSec = parseInt(hm[1])*3600 + (hm[2]?parseInt(hm[2])*60:0);
    else { const m = tt.match(/(\d{1,2})\s*[:h']\s*(\d{1,2})/); if(m) chronoSec = parseInt(m[1])*60+parseInt(m[2]); }
    let raceKm = null, lbl='';
    if((goal||'').toLowerCase().includes('marathon')&&!(goal||'').toLowerCase().includes('semi')){ raceKm=42.195; lbl='marathon'; }
    else if((goal||'').toLowerCase().includes('semi')||(subGoal||'').toLowerCase().includes('semi')){ raceKm=21.097; lbl='semi'; }
    else if((subGoal||'').toLowerCase().includes('10')||(goal||'').toLowerCase().includes('10km')){ raceKm=10; lbl='10km'; }
    else if((subGoal||'').toLowerCase().includes('5')||(goal||'').toLowerCase().includes('5km')){ raceKm=5; lbl='5km'; }
    else if(trailDist) { raceKm = trailDist; lbl='trail'; }
    if(raceKm && chronoSec){
      const racePaceSec = chronoSec/raceKm;
      const racePaceKmh = 3600/racePaceSec;
      const pctVMA = racePaceKmh/vma;
      const expected = lbl==='marathon'?[0.78,0.86]:lbl==='semi'?[0.82,0.90]:lbl==='10km'?[0.86,0.94]:lbl==='5km'?[0.90,1.00]:[0.55,0.75];
      const verdict = pctVMA < expected[0]-0.05 ? '🟢 trop facile' : pctVMA > expected[1]+0.05 ? '🔴 INATTEIGNABLE' : pctVMA > expected[1] ? '🟡 ambitieux' : '✅ cohérent';
      chronoCheck = { lbl, raceKm, paceStr:`${Math.floor(racePaceSec/60)}:${String(Math.round(racePaceSec%60)).padStart(2,'0')}/km`, pctVMA, verdict, expected };
    }
  }

  // Allures S1 vs paces théoriques
  const w1 = (p.weeks||[])[0]||{sessions:[]};
  const sess = w1.sessions||[];
  const alluresCheck = [];
  for(const s of sess){
    if(!s.targetPace) continue;
    const pace = String(s.targetPace).match(/(\d+:\d+)/)?.[1];
    if(!pace) continue;
    const type = (s.type||'').toLowerCase(); const intens = (s.intensity||'').toLowerCase(); const title=(s.title||'').toLowerCase();
    let expectedKey = null;
    if(type.includes('seuil')||intens.includes('seuil')||title.includes('seuil')) expectedKey='seuilPace';
    else if(type.includes('vma')||intens.includes('vma')||title.includes('vma')) expectedKey='vmaPace';
    else if(title.includes('spécifique')){
      if((goal||'').toLowerCase().includes('marathon')&&!goal.includes('semi')) expectedKey='allureSpecifiqueMarathon';
      else if((goal||'').toLowerCase().includes('semi')||(subGoal||'').toLowerCase().includes('semi')) expectedKey='allureSpecifiqueSemi';
      else if((subGoal||'').toLowerCase().includes('10')) expectedKey='allureSpecifique10k';
      else if((subGoal||'').toLowerCase().includes('5')) expectedKey='allureSpecifique5k';
    }
    else if(type.includes('longue')||type.includes('jogging')||intens.includes('facile')||intens.includes('modéré')) expectedKey='efPace';
    else if(type.includes('récup')||type.includes('recup')||intens.includes('très facile')) expectedKey='recoveryPace';
    const expected = expectedKey?paces[expectedKey]:null;
    const diff = expected?secDiff(pace, expected):null;
    const ok = diff===null?true:diff<=20; // tolérance 20s/km
    alluresCheck.push({ day:s.day, type:s.type, title:s.title, pace, expectedKey, expected, diff, ok });
  }

  // Distances S1
  const distKmS1 = sess.reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0);
  const sl = sess.filter(s => /longue/i.test(s.type||''));
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));

  // Évolution projetée (weeklyVolumes)
  const peakKm = Math.max(0, ...wv);
  const peakWeek = wv.indexOf(peakKm)+1;
  const lastKm = wv[wv.length-1]||0;
  const taperPct = peakKm?(lastKm/peakKm*100):0;
  const deltas = [];
  for(let i=1;i<wv.length;i++) if(wv[i-1]>0) deltas.push({ i, from:wv[i-1], to:wv[i], pct:(wv[i]-wv[i-1])/wv[i-1]*100 });
  const maxJump = deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity});
  const maxDrop = deltas.reduce((m,d)=>d.pct<m.pct?d:m, {pct:Infinity});
  // saut depuis vol actuel user
  const startJump = (curVol && wv[0]) ? (wv[0]/curVol-1)*100 : null;

  // Fiabilité
  const feas = p.feasibility||{};
  const wm = p.welcomeMessage || feas.message || '';
  const sw = feas.safetyWarning || '';
  const fStatus = feas.status || '?';
  const fScore = feas.score ?? p.confidenceScore ?? '?';

  log(`\n\n${'█'.repeat(125)}`);
  log(`📧 ${email}  •  👤 ${user.firstName||u.displayName||'?'}  •  ${p.name}`);
  log('█'.repeat(125));
  log(`  Objectif: ${goal} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}  •  Cible: ${targetTime||'Finisher'}  •  Race: ${raceDate||'(N/A)'}  •  Durée: ${dur} sem  •  ${freq} séances/sem`);
  log(`  Profil: ${age} ans • IMC ${bmi?.toFixed?.(1)||'?'} • ${level} • VMA ${vma?.toFixed?.(2)} km/h (${p.vmaSource||'?'}) • Vol actuel: ${curVol||'?'} km/sem${curDplus?` / ${curDplus}m D+`:''} • Blessures: ${fmtInj(inj)}`);
  if(Object.keys(recent).length) log(`  Chronos récents: ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • ')}`);

  // ─── 1. ALLURES ───
  log(`\n  ━━━ 1. ALLURES — COHÉRENCE ━━━`);
  log(`    Allures théoriques (paces[]) :`);
  for(const [k,v] of Object.entries(paces)) log(`      ${k.padEnd(28)} ${v}/km`);
  if(chronoCheck){
    log(`\n    Cohérence chrono cible :`);
    log(`      ${chronoCheck.lbl} ${chronoCheck.raceKm}km en ${targetTime} → ${chronoCheck.paceStr} = ${(chronoCheck.pctVMA*100).toFixed(0)}%VMA  →  ${chronoCheck.verdict}  (att. ${(chronoCheck.expected[0]*100).toFixed(0)}-${(chronoCheck.expected[1]*100).toFixed(0)}%VMA)`);
  } else {
    log(`\n    Cohérence chrono cible : pas de cible chrono fournie (Finisher)`);
  }
  log(`\n    Cohérence allures séances S1 vs type :`);
  const okN = alluresCheck.filter(a=>a.ok).length;
  log(`    ${okN}/${alluresCheck.length} séances avec pace conforme (tolérance ±20s/km)`);
  for(const a of alluresCheck){
    const status = a.expectedKey ? (a.ok?'✅':'🔴') : '⚪';
    const diffStr = a.diff!==null ? ` (Δ ${a.diff}s)` : '';
    log(`      ${status} ${(a.day||'?').padEnd(10)} ${(a.type||'?').padEnd(18)} pace=${a.pace}/km ${a.expectedKey?`vs ${a.expectedKey}=${a.expected}`:''}${diffStr}`);
  }

  // ─── 2. DISTANCES — ÉVOLUTION ───
  log(`\n  ━━━ 2. DISTANCES — ÉVOLUTION HEBDO (projection ${wv.length} sem) ━━━`);
  if(!wv.length) log(`    ⚠ Pas de weeklyVolumes projeté dans periodizationPlan`);
  else {
    const totalKm = wv.reduce((s,v)=>s+v,0);
    log(`    Total: ${totalKm} km  •  Moy: ${(totalKm/wv.length).toFixed(1)} km/sem  •  Pic: S${peakWeek}=${peakKm}km  •  Affûtage final: S${wv.length}=${lastKm}km (${taperPct.toFixed(0)}% du pic)`);
    if(startJump !== null){
      const sj = startJump > 30 ? '🔴' : startJump > 10 ? '🟡' : '✅';
      log(`    Saut depuis vol actuel : ${curVol}km/sem → S1=${wv[0]}km = ${startJump>=0?'+':''}${startJump.toFixed(0)}%  ${sj}`);
    }
    const maxV = Math.max(...wv, 1);
    log(``);
    log(`    Sem | Phase           | km  | bar                                          | Δ%`);
    log(`    ────┼─────────────────┼─────┼──────────────────────────────────────────────┼──────`);
    wv.forEach((v,i)=>{
      const bar = '█'.repeat(Math.round((v/maxV)*40))+'·'.repeat(40-Math.round((v/maxV)*40));
      const flag = recoveryWeeks.includes(i+1) ? ' ↓DELOAD' : (i+1===peakWeek?' ★PIC':'');
      const d = i>0 ? `${((v-wv[i-1])/wv[i-1]*100).toFixed(0).padStart(4)}%` : '   --';
      log(`    S${String(i+1).padStart(2)} | ${(wp[i]||'?').padEnd(15)} | ${String(v).padStart(3)} | ${bar} | ${d}${flag}`);
    });
    log(``);
    log(`    📊 Max augmentation : S${maxJump.i}→S${maxJump.i+1} ${maxJump.from}→${maxJump.to}km = ${maxJump.pct>=0?'+':''}${maxJump.pct.toFixed(0)}%  ${maxJump.pct>20?'🔴':maxJump.pct>15?'🟡':'✅'}`);
    log(`    📉 Max décharge : S${maxDrop.i}→S${maxDrop.i+1} ${maxDrop.from}→${maxDrop.to}km = ${maxDrop.pct.toFixed(0)}%`);
    log(`    🔄 Semaines de décharge projetées : ${recoveryWeeks.join(', ')||'(aucune)'}`);
  }

  // ─── 3. SL ───
  log(`\n  ━━━ 3. SORTIE LONGUE ━━━`);
  log(`    ⚠ La projection SL par semaine n'est PAS exposée dans le preview. Seule S1 est observable.`);
  log(`    SL S1 max : ${slDistMax} km${slElevMax?` / ${slElevMax}m D+`:''}`);
  if(slDistMax && wv[0]) log(`    Ratio SL/Volume S1 : ${(slDistMax/wv[0]*100).toFixed(0)}%${slDistMax/wv[0]>0.5?' 🟡 (>50% du volume — élevé pour S1)':''}`);
  for(const s of sl){
    const km = kmFrom(s.distance);
    log(`      ${s.day} : ${km}km • D+${s.elevationGain||0}m • pace ${s.targetPace||'?'} • "${s.title}"`);
  }
  if(trailDist && slElevMax){
    log(`    D+ SL S1 / D+ course (${trailElev}m) : ${(slElevMax/trailElev*100).toFixed(0)}%`);
  }

  // ─── 4. MESSAGE & FIABILITÉ ───
  log(`\n  ━━━ 4. MESSAGE D'ACCUEIL & FIABILITÉ ━━━`);
  log(`    Statut: ${fStatus}  •  Score: ${fScore}/100  •  confidenceScore: ${p.confidenceScore??'?'}`);
  log(`    Welcome:  "${wm.substring(0,400)}${wm.length>400?'…':''}"`);
  if(sw) log(`    Warning:  "${sw}"`);

  summary.push({
    firstName: user.firstName||u.displayName||'?', email,
    goal: `${goal||''} ${subGoal||''}`.trim(), target: targetTime||'Finisher',
    vma: vma?.toFixed?.(1),
    dur, freq,
    curVol: curVol||'?',
    startJump: startJump!==null?`${startJump>=0?'+':''}${startJump.toFixed(0)}%`:'?',
    peakKm: peakKm||'?', peakWeek: peakKm?peakWeek:'?',
    maxJump: maxJump.pct!==-Infinity?`+${maxJump.pct.toFixed(0)}% (S${maxJump.i}→${maxJump.i+1})`:'?',
    taperPct: peakKm?`${taperPct.toFixed(0)}%`:'?',
    slS1Max: slDistMax||'?',
    chronoVerdict: chronoCheck?chronoCheck.verdict:'(finisher)',
    allureOK: `${alluresCheck.filter(a=>a.ok).length}/${alluresCheck.length}`,
    fStatus, fScore
  });
}

// ─── TABLEAU SYNTHÈSE ───
log(`\n\n${'═'.repeat(125)}`);
log(`  📋 TABLEAU SYNTHÈSE — 6 USERS`);
log(`${'═'.repeat(125)}`);
log(`  ${'Prénom'.padEnd(10)} ${'Goal'.padEnd(22)} ${'Cible'.padEnd(10)} ${'VMA'.padEnd(5)} ${'Vol actu'.padEnd(8)} ${'Saut S1'.padEnd(9)} ${'Pic km/S'.padEnd(10)} ${'Max ↑'.padEnd(18)} ${'Affût'.padEnd(7)} ${'SL S1'.padEnd(7)} ${'AllOK'.padEnd(6)} ${'Chrono'.padEnd(15)} Fiab`);
log(`  ${'─'.repeat(123)}`);
for(const r of summary){
  log(`  ${(r.firstName||'?').padEnd(10)} ${(r.goal).substring(0,22).padEnd(22)} ${String(r.target).padEnd(10)} ${String(r.vma).padEnd(5)} ${String(r.curVol).padEnd(8)} ${String(r.startJump).padEnd(9)} ${(`${r.peakKm}/S${r.peakWeek}`).padEnd(10)} ${String(r.maxJump).padEnd(18)} ${String(r.taperPct).padEnd(7)} ${(r.slS1Max+'km').padEnd(7)} ${r.allureOK.padEnd(6)} ${r.chronoVerdict.substring(0,15).padEnd(15)} ${r.fStatus}/${r.fScore}`);
}

writeFileSync('audit-6-emails-v3.txt', out.join('\n'));
console.log(`\n📝 audit-6-emails-v3.txt`);
