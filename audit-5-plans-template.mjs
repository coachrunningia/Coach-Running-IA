/**
 * AUDIT 5 PLANS — TEMPLATE RÉFÉRENCE POST-PREVIEW (18/05/2026)
 * 5 dimensions par client :
 *   1. Allure cible (chrono ou Finisher+PB cushion 5%)
 *   2. Volume hebdo + pic + distribution + référentiel
 *   3. SL S1
 *   4. Faisabilité + message + safetyWarning (bug 2h60min, contradictoire, embellissement)
 *   5. WelcomeMessage doctrine
 *
 * Clients :
 *   1. Alan          alanwentzel74@gmail.com
 *   2. Sébastien     sebastien.sailly@outlook.fr        (re-check patches: 9:30, welcome enrichi, pic vol 9, AMBITIEUX/60)
 *   3. Antoine       antoineg.gde@outlook.fr            (re-check bug "2h60min")
 *   4. Annabelle     nabou57@hotmail.fr                 (re-check)
 *   5. Armando       arenaarmando@hotmail.???           (.com .fr .es .it si tronqué)
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
const secToPace = (s)=>{ const m=Math.floor(s/60); const r=Math.round(s%60); return `${m}:${String(r).padStart(2,'0')}`; };

async function findUserByEmail(email){
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method:'POST', headers:H, body:JSON.stringify({ email:[email] }) });
  return (await lookup.json()).users?.[0] || null;
}

async function lookupEmailVariants(baseEmail, domains){
  const results = [];
  for(const d of domains){
    const email = `${baseEmail}.${d}`;
    const u = await findUserByEmail(email);
    if(u) results.push({ email, user: u });
    await new Promise(r => setTimeout(r, 150));
  }
  return results;
}

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

log('═'.repeat(140));
log(`  AUDIT 5 PLANS — TEMPLATE POST-PREVIEW  •  ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(140));

// ─── Résolution Armando (.com .fr .es .it) ───
log('\n▶ Résolution email Armando (arenaarmando@hotmail.???)');
const armandoVariants = await lookupEmailVariants('arenaarmando@hotmail', ['com', 'fr', 'es', 'it', 'co.uk', 'de']);
for(const v of armandoVariants){
  log(`  ✓ TROUVÉ : ${v.email} (uid=${v.user.localId})`);
}
const armandoEmail = armandoVariants[0]?.email || 'arenaarmando@hotmail.com';
if(!armandoVariants.length){
  log(`  ⚠ Aucune variante trouvée — on garde .com par défaut`);
}

const CLIENTS = [
  { tag: 'Alan',      email: 'alanwentzel74@gmail.com',        recheck: false },
  { tag: 'Sébastien', email: 'sebastien.sailly@outlook.fr',    recheck: true, patches: { allure10k: '9:30', pic: 9, status: 'AMBITIEUX', score: 60 } },
  { tag: 'Antoine',   email: 'antoineg.gde@outlook.fr',        recheck: true, patches: { bug2h60: 'patched' } },
  { tag: 'Annabelle', email: 'nabou57@hotmail.fr',             recheck: true },
  { tag: 'Armando',   email: armandoEmail,                     recheck: true },
];

const dumps = {};
const synthRows = [];

for(const c of CLIENTS){
  log('\n\n' + '█'.repeat(140));
  log(`📧 ${c.tag.toUpperCase()} — ${c.email}${c.recheck?'  [RE-CHECK]':''}`);
  log('█'.repeat(140));

  const u = await findUserByEmail(c.email);
  if(!u){ log(`  ❌ Pas de compte Firebase Auth pour ${c.email}`); continue; }
  const uid = u.localId;
  log(`  UID: ${uid}  •  Créé: ${u.createdAt?new Date(parseInt(u.createdAt)).toISOString():'?'}  •  Last login: ${u.lastLoginAt?new Date(parseInt(u.lastLoginAt)).toISOString():'?'}  •  Email vérifié: ${u.emailVerified?'oui':'non'}`);

  // User doc
  const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
  const user = ud.status===404?{}:pf((await ud.json()).fields);

  // Plans
  const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const plans = (await pq.json()).filter(x=>x.document).map(x=>({ id: x.document.name.split('/').pop(), ...pf(x.document.fields) }));
  if(!plans.length){ log(`  ❌ Aucun plan`); continue; }
  plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const fullPlans = plans.filter(p => p.fullPlanGenerated === true);
  const p = fullPlans[0] || plans[0];

  log(`  Plans total: ${plans.length}  •  Plan analysé: ${p.id} (createdAt=${p.createdAt||'?'}, full=${p.fullPlanGenerated})`);
  if(plans.length > 1){
    log(`  Autres plans :`);
    plans.slice(0,5).forEach(pp => log(`    - ${pp.id}  full=${pp.fullPlanGenerated}  createdAt=${pp.createdAt}  name="${pp.name||'?'}"`));
  }

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
  const sex = snap.sex||snap.gender||user.sex;

  const paces = p.paces||{};
  const wv = pp.weeklyVolumes||[];
  const wp = pp.weeklyPhases||[];
  const recoveryWeeks = pp.recoveryWeeks||[];

  log(`\n  ━━━ IDENTITÉ & INPUTS ━━━`);
  log(`  Prénom: ${user.firstName||u.displayName||'?'}  •  Plan: "${p.name||'?'}"`);
  log(`  Objectif: ${goal||'?'} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}`);
  log(`  Cible chrono: ${targetTime||'Finisher'}  •  Race date: ${raceDate||'(N/A)'}`);
  log(`  Durée: ${dur} sem  •  Fréquence: ${freq} séances/sem (inclut 1 renfo)`);
  log(`  Profil: ${sex||'?'} • ${age?age+' ans':'?'} • ${w_||'?'} kg • ${h_||'?'} cm • IMC ${bmi?.toFixed?.(1)||'?'} • Niveau: ${level||'?'} • VMA: ${vma?.toFixed?.(2)||'?'} km/h (${p.vmaSource||'?'})`);
  log(`  Vol actuel user: ${curVol||'?'} km/sem${curDplus?` / ${curDplus}m D+`:''}  •  Blessures: ${fmtInj(inj)}`);
  if(Object.keys(recent).length) log(`  Chronos récents : ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • ')}`);

  // ═══════ 1. ALLURE CIBLE ═══════
  log(`\n  ━━━ 1. ALLURE CIBLE — cohérence chrono ou Finisher+PB ━━━`);
  log(`    Allures théoriques (paces[]) :`);
  for(const [k,v] of Object.entries(paces)) log(`      ${k.padEnd(32)} ${v}/km`);

  // Détecter la distance objectif
  let raceKm = null, lbl='', allureKey='';
  const gL = (goal||'').toLowerCase(), sgL = (subGoal||'').toLowerCase();
  if(gL.includes('marathon')&&!gL.includes('semi')){ raceKm=42.195; lbl='marathon'; allureKey='allureSpecifiqueMarathon'; }
  else if(gL.includes('semi')||sgL.includes('semi')){ raceKm=21.097; lbl='semi'; allureKey='allureSpecifiqueSemi'; }
  else if(sgL.includes('10')||gL.includes('10km')){ raceKm=10; lbl='10km'; allureKey='allureSpecifique10k'; }
  else if(sgL.includes('5')||gL.includes('5km')){ raceKm=5; lbl='5km'; allureKey='allureSpecifique5k'; }
  else if(trailDist){ raceKm=trailDist; lbl='trail'; allureKey='allureSpecifiqueTrail'; }

  log(`\n    Distance objectif : ${lbl||'?'} (${raceKm||'?'} km)  •  Clé allure attendue : ${allureKey||'?'}`);
  const allureCible = allureKey && paces[allureKey] ? paces[allureKey] : null;
  log(`    Allure cible affichée (${allureKey}) : ${allureCible||'(absente)'}`);

  let verdictAllure = '?';
  const isFinisher = !targetTime || /finisher/i.test(targetTime);
  if(!isFinisher && targetTime){
    // Chrono cible: vérifier que pace allureCible match chrono cible
    const tt = String(targetTime);
    let chronoSec=null;
    const hm = tt.match(/(\d+)\s*h\s*(\d{1,2})?/i);
    if(hm) chronoSec = parseInt(hm[1])*3600 + (hm[2]?parseInt(hm[2])*60:0);
    else { const m = tt.match(/(\d{1,2})\s*[:h']\s*(\d{1,2})/); if(m) chronoSec = parseInt(m[1])*60+parseInt(m[2]); }
    if(chronoSec && raceKm){
      const racePaceSec = chronoSec/raceKm;
      log(`    Chrono cible ${targetTime} sur ${raceKm}km → pace nécessaire = ${secToPace(racePaceSec)}/km`);
      const allureCibleSec = paceToSec(allureCible);
      if(allureCibleSec){
        const diff = allureCibleSec - racePaceSec;
        if(Math.abs(diff) <= 10) { verdictAllure='✅'; log(`    Verdict : ✅ allure cible (${allureCible}) cohérente avec chrono (Δ ${Math.round(diff)}s)`); }
        else if(diff > 10) { verdictAllure='⚠️'; log(`    Verdict : ⚠️ allure cible (${allureCible}) plus lente que chrono nécessaire de ${Math.round(diff)}s`); }
        else { verdictAllure='⚠️'; log(`    Verdict : ⚠️ allure cible (${allureCible}) plus rapide que chrono nécessaire de ${Math.round(-diff)}s`); }
      } else {
        verdictAllure='❌'; log(`    Verdict : ❌ pas d'allure cible affichée pour ${allureKey}`);
      }
      // % VMA
      if(vma){
        const racePaceKmh = 3600/racePaceSec;
        const pctVMA = racePaceKmh/vma;
        const expected = lbl==='marathon'?[0.78,0.86]:lbl==='semi'?[0.82,0.90]:lbl==='10km'?[0.86,0.94]:lbl==='5km'?[0.90,1.00]:[0.55,0.75];
        log(`    %VMA cible : ${(pctVMA*100).toFixed(0)}%  (attendu ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}% pour ${lbl})`);
        if(pctVMA > expected[1]+0.05) log(`    🔴 INATTEIGNABLE théoriquement à cette VMA`);
        else if(pctVMA > expected[1]) log(`    🟡 ambitieux à cette VMA`);
      }
    }
  } else {
    // Finisher : checker PB déclaré + 5% cushion
    const pbKey = `distance${raceKm===10?'10':raceKm===5?'5':raceKm===21.097?'21':raceKm===42.195?'42':String(Math.round(raceKm))}km`;
    const pbAlt = recent[`${Math.round(raceKm)}km`] || recent[pbKey];
    if(pbAlt && raceKm){
      // Parse PB en secondes
      const pb = String(pbAlt);
      let pbSec = null;
      const hm = pb.match(/(\d+)\s*h\s*(\d{1,2})/i);
      const ms = pb.match(/^(\d{1,2})[:h](\d{1,2})(?:[:](\d{1,2}))?$/);
      if(hm){ pbSec = parseInt(hm[1])*3600 + parseInt(hm[2])*60; }
      else if(ms){
        if(ms[3]) pbSec = parseInt(ms[1])*3600+parseInt(ms[2])*60+parseInt(ms[3]);
        else pbSec = parseInt(ms[1])*60+parseInt(ms[2]);
      }
      if(pbSec){
        const pbPaceSec = pbSec/raceKm;
        const cushionPaceSec = pbPaceSec*1.05;
        log(`    Finisher avec PB déclaré : ${pbAlt} sur ${raceKm}km → pace PB = ${secToPace(pbPaceSec)}/km  •  Cushion +5% = ${secToPace(cushionPaceSec)}/km`);
        const allureCibleSec = paceToSec(allureCible);
        if(allureCibleSec){
          if(allureCibleSec >= cushionPaceSec - 5){
            verdictAllure='✅'; log(`    Verdict : ✅ allure cible (${allureCible}) >= pace PB + 5% cushion`);
          } else {
            verdictAllure='❌'; log(`    Verdict : ❌ allure cible (${allureCible}) TROP RAPIDE vs PB+cushion (${secToPace(cushionPaceSec)})`);
          }
        }
      }
    } else {
      log(`    Finisher sans PB sur ${lbl} → allure VMA-based OK par défaut`);
      verdictAllure = allureCible ? '✅' : '⚠️';
    }
  }

  // ═══════ 2. VOLUME HEBDO ═══════
  log(`\n  ━━━ 2. VOLUME HEBDO TOTAL + PIC + DISTRIBUTION ━━━`);
  const peakKm = Math.max(0, ...wv);
  const peakWeek = wv.indexOf(peakKm)+1;
  const lastKm = wv[wv.length-1]||0;
  const taperPct = peakKm?(lastKm/peakKm*100):0;
  const deltas = [];
  for(let i=1;i<wv.length;i++) if(wv[i-1]>0) deltas.push({ i, from:wv[i-1], to:wv[i], pct:(wv[i]-wv[i-1])/wv[i-1]*100 });
  const maxJump = deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity});
  const maxDrop = deltas.reduce((m,d)=>d.pct<m.pct?d:m, {pct:Infinity});
  const startJump = (curVol && wv[0]) ? (wv[0]/curVol-1)*100 : null;

  let verdictVolume='?';
  if(!wv.length){
    log(`    ⚠ Pas de weeklyVolumes projeté dans periodizationPlan`);
    verdictVolume = '❌';
  } else {
    const totalKm = wv.reduce((s,v)=>s+v,0);
    log(`    Total: ${totalKm} km  •  Moy: ${(totalKm/wv.length).toFixed(1)} km/sem  •  Pic: S${peakWeek}=${peakKm}km  •  Affûtage final S${wv.length}=${lastKm}km (${taperPct.toFixed(0)}% du pic)`);
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

    // Référentiel
    let refMin=0, refMax=0, refLbl='';
    if(lbl==='5k'||lbl==='5km'){ refMin=7; refMax=8; refLbl='5k → SL pic 7-8 km'; }
    else if(lbl==='10km'){ refMin=7; refMax=8; refLbl='10k → SL pic 7-8 km'; }
    else if(lbl==='semi'){ refMin=16; refMax=22; refLbl='semi → SL pic 16-22 km'; }
    else if(lbl==='marathon'){ refMin=28; refMax=35; refLbl='marathon → SL pic 28-35 km'; }
    else if(lbl==='trail' && raceKm){ refMin=Math.round(raceKm*0.6); refMax=Math.round(raceKm*0.8); refLbl=`trail → SL pic 60-80% = ${refMin}-${refMax} km`; }

    // SL pic = max SL des semaines (on prend wv pic comme proxy si pas mieux ; SL réelle dispo seulement S1)
    log(`    Référentiel coaching : ${refLbl||'(non défini)'}`);

    // Verdict général volume
    const sautInit = startJump !== null ? startJump : 0;
    const sautMax = maxJump.pct;
    if(sautInit > 30 || sautMax > 20) verdictVolume = '❌';
    else if(sautInit > 15 || sautMax > 15 || taperPct < 50 || taperPct > 80) verdictVolume = '⚠️';
    else verdictVolume = '✅';
    log(`    Verdict volume : ${verdictVolume}`);
  }

  // ═══════ 3. SL S1 ═══════
  log(`\n  ━━━ 3. SORTIE LONGUE S1 ━━━`);
  const w1 = (p.weeks||[])[0]||{sessions:[]};
  const sess = w1.sessions||[];
  const sl = sess.filter(s => /longue/i.test(s.type||'') || /longue/i.test(s.title||''));
  const distKmS1 = sess.reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0);
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));
  let verdictSL = '?';
  let ratioSL = null;
  log(`    Total km course S1 (hors renfo) : ${distKmS1.toFixed(1)} km`);
  log(`    SL S1 max : ${slDistMax} km${slElevMax?` / ${slElevMax}m D+`:''}`);
  if(slDistMax && wv[0]) {
    ratioSL = slDistMax/wv[0]*100;
    const flag = ratioSL>40?'🔴':ratioSL>30?'🟡':'✅';
    log(`    Ratio SL/Volume hebdo S1 : ${ratioSL.toFixed(0)}% ${flag} (cible 25-40%)`);
    if(ratioSL < 20) verdictSL = '⚠️ ratio bas';
    else if(ratioSL >= 25 && ratioSL <= 40) verdictSL = '✅';
    else if(ratioSL > 40 && ratioSL <= 50) verdictSL = '⚠️';
    else verdictSL = '❌';
  }
  if(slDistMax && curVol){
    const r2 = slDistMax/curVol*100;
    const flag = r2>50?'🔴':r2>40?'🟡':'✅';
    log(`    Ratio SL/Volume actuel user : ${r2.toFixed(0)}% ${flag}`);
  }
  for(const s of sl){
    const km = kmFrom(s.distance);
    log(`      ${s.day} : ${km}km • ${s.duration||'?'} • D+${s.elevationGain||0}m • pace ${s.targetPace||'?'} • "${s.title}"`);
  }
  if(trailDist && slElevMax){
    log(`    D+ SL S1 / D+ course (${trailElev}m) : ${(slElevMax/trailElev*100).toFixed(0)}%`);
  }
  log(`    Verdict SL : ${verdictSL}`);

  // ═══════ 4. FAISABILITÉ ═══════
  log(`\n  ━━━ 4. SCORE FAISABILITÉ + MESSAGE ━━━`);
  const feas = p.feasibility||{};
  const fStatus = feas.status || '?';
  const fScore = feas.score ?? p.confidenceScore ?? '?';
  log(`    feasibility.status : ${fStatus}`);
  log(`    feasibility.score : ${feas.score ?? '?'}`);
  log(`    confidenceScore : ${p.confidenceScore ?? '?'}`);
  if(feas.gates) log(`    gates : ${JSON.stringify(feas.gates)}`);
  if(feas.reasons) log(`    reasons : ${JSON.stringify(feas.reasons)}`);
  if(feas.flags) log(`    flags : ${JSON.stringify(feas.flags)}`);
  if(feas.warnings) log(`    warnings : ${JSON.stringify(feas.warnings)}`);
  log(`    Tous champs feasibility : [${Object.keys(feas).join(', ')}]`);

  const fmsg = feas.message || '';
  const sw = feas.safetyWarning || p.safetyWarning || '';

  if(fmsg){
    log(`\n    feasibility.message (${fmsg.length} chars) :`);
    log(`    ${'─'.repeat(130)}`);
    fmsg.split('\n').forEach(l => log(`    │ ${l}`));
    log(`    ${'─'.repeat(130)}`);
  }
  if(sw){
    log(`\n    safetyWarning (${sw.length} chars) :`);
    log(`    ${'─'.repeat(130)}`);
    sw.split('\n').forEach(l => log(`    │ ${l}`));
    log(`    ${'─'.repeat(130)}`);
  }

  // Bug detection
  const allText = (fmsg||'') + '\n' + (sw||'') + '\n' + (p.welcomeMessage||'');
  const bug2h60 = /\d+h\s*[6-9]\d\s*min|\d+h[6-9]\d/i.test(allText);
  const embellishIrr = fStatus === 'IRRÉALISTE' && /accessible|atteignable|tu vas y arriver|sereinement/i.test(allText);
  let verdictFeas = '✅';
  if(bug2h60){ log(`    🔴 BUG "XhYY" détecté (Y>=60)`); verdictFeas='❌'; }
  if(embellishIrr){ log(`    🔴 EMBELLISSEMENT plan IRRÉALISTE`); verdictFeas='❌'; }
  if(fStatus === '?' || fScore === '?'){ log(`    ⚠️ Faisabilité absente ou incomplète`); if(verdictFeas==='✅') verdictFeas='⚠️'; }
  log(`    Verdict faisabilité : ${verdictFeas}`);

  // ═══════ 5. WELCOMEMESSAGE ═══════
  log(`\n  ━━━ 5. WELCOMEMESSAGE ━━━`);
  const wm = p.welcomeMessage || '';
  log(`    welcomeMessage (${wm.length} chars) :`);
  log(`    ${'─'.repeat(130)}`);
  wm.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(130)}`);

  // Doctrine checks
  log(`\n    🔍 Doctrine checks :`);
  const lowerWm = wm.toLowerCase();
  const forbiddenWords = ['poids', 'imc', 'minceur', 'silhouette', 'kg perdu', 'kilos', 'maigrir', 'amincir', 'corpulence'];
  const found = forbiddenWords.filter(w => lowerWm.includes(w));
  log(`      Mots interdits (poids/IMC/minceur) corps msg : ${found.length?`🔴 TROUVÉ : ${found.join(', ')}`:'✅ aucun'}`);
  log(`      Titre plan : "${p.name||'?'}"`);
  if(p.name && /poids|minceur/i.test(p.name)) log(`        → "poids" dans titre = ✅ autorisé (doctrine perte_de_poids_titre_ok)`);

  // Allures dans message
  const pacesInMessage = [];
  for(const [k,v] of Object.entries(paces)){
    if(v && wm.includes(v)) pacesInMessage.push(`${k}=${v}`);
  }
  log(`      Allures mentionnées dans welcome : ${pacesInMessage.length?pacesInMessage.join(', '):'(aucune textuelle)'}`);

  // PB déclaré référencé ?
  const pbRefs = [];
  for(const [k,v] of Object.entries(recent)){
    if(v && wm.includes(v)) pbRefs.push(`${k}=${v}`);
  }
  log(`      PB déclarés cités dans welcome : ${pbRefs.length?pbRefs.join(', '):'(aucun)'}`);
  if(isFinisher && Object.keys(recent).length && !pbRefs.length){
    log(`      ⚠️ Finisher + PB déclaré MAIS PB pas cité dans welcome (doctrine recommande référence explicite)`);
  }

  // Sécurité ?
  const safetyMention = /m[ée]decin|cardio|certificat|avis m[ée]dical|consult/i.test(wm);
  log(`      Mention sécurité (médecin/cardio) : ${safetyMention?'✅':'(non)'}`);
  if((age && age > 50) || (bmi && bmi > 30)){
    log(`        → Profil > 50 ans ou BMI > 30 : sécurité ${safetyMention?'OK':'🔴 MANQUE'}`);
  }

  let verdictWelcome = '✅';
  if(found.length) verdictWelcome = '❌';
  if(((age && age > 50) || (bmi && bmi > 30)) && !safetyMention) verdictWelcome = verdictWelcome==='❌'?'❌':'⚠️';
  if(isFinisher && Object.keys(recent).length && !pbRefs.length && verdictWelcome==='✅') verdictWelcome='⚠️';
  log(`      Verdict welcome : ${verdictWelcome}`);

  // ═══════ DUMP ═══════
  dumps[c.tag] = {
    email: c.email, uid, firstName: user.firstName||u.displayName,
    plan: { id: p.id, name: p.name, createdAt: p.createdAt, durationWeeks: p.durationWeeks, sessionsPerWeek: p.sessionsPerWeek, fullPlanGenerated: p.fullPlanGenerated },
    inputs: { goal, subGoal, targetTime, raceDate, freq, vma, vmaSource: p.vmaSource, level, curVol, curDplus, inj, age, sex, weight: w_, height: h_, bmi, trailDist, trailElev, recent },
    paces, weeklyVolumes: wv, weeklyPhases: wp, recoveryWeeks,
    s1: { sessions: sess.map(s => ({ day:s.day, type:s.type, title:s.title, distance:s.distance, duration:s.duration, intensity:s.intensity, targetPace:s.targetPace, elevationGain:s.elevationGain })) },
    feasibility: feas, confidenceScore: p.confidenceScore,
    welcomeMessage: wm, safetyWarning: sw,
    verdicts: { allure: verdictAllure, volume: verdictVolume, sl: verdictSL, feas: verdictFeas, welcome: verdictWelcome }
  };

  synthRows.push({
    tag: c.tag, firstName: user.firstName||u.displayName||c.tag,
    goal: `${goal||''} ${subGoal||''}`.trim(), target: targetTime||'Finisher',
    level, vma: vma?.toFixed?.(1), freq, curVol,
    peak: peakKm, peakW: peakWeek,
    sl: slDistMax,
    ratioSL: ratioSL!==null?`${ratioSL.toFixed(0)}%`:'?',
    fStatus, fScore,
    allure: verdictAllure, volume: verdictVolume, slV: verdictSL,
    feas: verdictFeas, wel: verdictWelcome,
    wmLen: wm.length, fbWords: found?.length || 0
  });
}

// ─── TABLEAU SYNTHÈSE ───
log('\n\n' + '═'.repeat(140));
log(`  📋 TABLEAU SYNTHÈSE — 5 CLIENTS`);
log('═'.repeat(140));
log(`  ${'Prénom'.padEnd(12)} ${'Goal'.padEnd(18)} ${'Cible'.padEnd(10)} ${'Niv.'.padEnd(8)} ${'VMA'.padEnd(5)} ${'Vol'.padEnd(5)} ${'Pic'.padEnd(8)} ${'SL/ratio'.padEnd(10)} ${'fStat'.padEnd(12)} ${'sc'.padEnd(4)} | 1All 2Vol 3SL 4Fa 5Wel`);
log(`  ${'─'.repeat(138)}`);
for(const r of synthRows){
  log(`  ${(r.firstName||'?').substring(0,12).padEnd(12)} ${(r.goal).substring(0,18).padEnd(18)} ${String(r.target).substring(0,10).padEnd(10)} ${String(r.level||'?').substring(0,8).padEnd(8)} ${String(r.vma||'?').padEnd(5)} ${String(r.curVol||'?').padEnd(5)} ${(`${r.peak}/S${r.peakW}`).padEnd(8)} ${(r.sl+'/'+r.ratioSL).padEnd(10)} ${String(r.fStatus).substring(0,12).padEnd(12)} ${String(r.fScore).padEnd(4)} | ${r.allure}   ${r.volume}   ${r.slV}   ${r.feas}   ${r.wel}`);
}

writeFileSync('audit-5-plans-template.txt', out.join('\n'));
writeFileSync('audit-5-plans-template.json', JSON.stringify(dumps, null, 2));
console.log('\n📝 audit-5-plans-template.txt');
console.log('📝 audit-5-plans-template.json');
