/**
 * AUDIT 5 PLANS — TEMPLATE V2 (18/05/2026)
 * Template enrichi avec :
 *   - Tableau weeklyVolumes COMPLET (toutes les semaines)
 *   - Comparaison S1 plan vs currentWeeklyVolume declared → flag 🚨 si baisse
 *   - SL pic projetée vs référentiel par objectif
 *   - Garde-fou délai court (<12 sem ambitieux)
 *
 * 5 dimensions par client :
 *   1. Allure cible cohérence (chrono / PB / Finisher)
 *   2. Volume hebdo COMPLET + projection + S1 vs declared
 *   3. SL S1 + projection SL pic
 *   4. Faisabilité (status / score / message / safetyWarning)
 *   5. WelcomeMessage (texte intégral + doctrine)
 *
 * Lecture seule. Aucun contact client. Aucune modif Firestore.
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
const secDiff = (p1, p2) => { const a=paceToSec(p1), b=paceToSec(p2); return (a&&b)?Math.abs(a-b):null; };

async function findUserByEmail(email){
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method:'POST', headers:H, body:JSON.stringify({ email:[email] }) });
  return (await lookup.json()).users?.[0] || null;
}

// Référentiel SL pic par objectif (en km, ou ratio si trail)
function slPicReferentiel(goal, subGoal, trailDist){
  const g = (goal||'').toLowerCase();
  const sg = (subGoal||'').toLowerCase();
  if(trailDist) return { min: trailDist*0.6, max: trailDist*0.8, label: `trail ${trailDist}km (60-80%)` };
  if(g.includes('marathon') && !g.includes('semi')) return { min: 28, max: 35, label: 'marathon (28-35 km)' };
  if(g.includes('semi') || sg.includes('semi')) return { min: 16, max: 22, label: 'semi (16-22 km)' };
  if(sg.includes('10') || g.includes('10km')) return { min: 7, max: 8, label: '10k (7-8 km)' };
  if(sg.includes('5') || g.includes('5km')) return { min: 7, max: 8, label: '5k (7-8 km)' };
  return { min: 0, max: 99, label: '?' };
}

const CLIENTS = [
  { tag:'Alan',      email:'alanwentzel74@gmail.com',     attendu:'Trail 35km/1200D+ 11 sem' },
  { tag:'Sébastien', email:'sebastien.sailly@outlook.fr', attendu:'10k Finisher 7 sem' },
  { tag:'Antoine',   email:'antoineg.gde@outlook.fr',     attendu:'Marathon 3h00 22 sem' },
  { tag:'Annabelle', email:'nabou57@hotmail.fr',          attendu:'Semi 1h45 7 sem' },
  { tag:'Armando',   email:'arenaarmando@hotmail.com',    attendu:'Semi 1h20 13 sem' },
];

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const dumps = {};
const synthClients = [];

log('═'.repeat(125));
log(`  AUDIT 5 PLANS — TEMPLATE V2  •  ${new Date().toLocaleString('fr-FR')}`);
log(`  Enrichi : weeklyVolumes complet, S1 vs declared (flag 🚨), SL pic projetée vs réf, garde-fou délai court`);
log('═'.repeat(125));

for(const c of CLIENTS){
  log('\n\n' + '█'.repeat(125));
  log(`📧 ${c.tag} — ${c.email}  (${c.attendu})`);
  log('█'.repeat(125));

  const u = await findUserByEmail(c.email);
  if(!u){ log(`  ❌ Pas de compte Firebase Auth`); continue; }
  const uid = u.localId;
  log(`  UID: ${uid}  •  Créé: ${u.createdAt?new Date(parseInt(u.createdAt)).toISOString():'?'}  •  Last login: ${u.lastLoginAt?new Date(parseInt(u.lastLoginAt)).toISOString():'?'}`);

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

  log(`  Plans total: ${plans.length}  •  Plan analysé: ${p.id} (createdAt=${p.createdAt||'?'}, full=${p.fullPlanGenerated}, premium=${p.isPremium}, preview=${p.isPreview})`);

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
  const curDplus = snap.currentWeeklyElevation ?? snap.currentElev;
  const inj = snap.injuries||ctx.injuries;
  const age = snap.age||ctx.age;
  const sex = snap.sex||snap.gender||ctx.sex||ctx.gender;
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
  const weTarget = pp.weeklyElevationTarget||[];

  log(`\n  ━━━ IDENTITÉ & INPUTS ━━━`);
  log(`  Prénom: ${user.firstName||u.displayName||'?'}  •  Plan: "${p.name||'?'}"`);
  log(`  Sexe: ${sex||'?'}  •  Âge: ${age||'?'}  •  Poids: ${w_||'?'} kg  •  Taille: ${h_||'?'} cm  •  IMC: ${bmi?.toFixed?.(1)||'?'}`);
  log(`  Niveau: ${level||'?'}  •  VMA: ${vma?.toFixed?.(2)||'?'} km/h (${p.vmaSource||'?'})`);
  log(`  Objectif: ${goal||'?'} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}`);
  log(`  Cible chrono: ${targetTime||'Finisher'}  •  Race date: ${raceDate||'(N/A)'}`);
  log(`  Durée: ${dur} sem  •  Fréquence: ${freq} séances/sem`);
  log(`  Vol DÉCLARÉ: ${curVol||'?'} km/sem${curDplus?` / D+ ${curDplus} m`:''}  •  Blessures: ${fmtInj(inj)}`);
  if(Object.keys(recent).length) log(`  Chronos récents: ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • ')}`);
  log(`  isPremium: ${p.isPremium}  •  isPreview: ${p.isPreview}  •  fullPlanGenerated: ${p.fullPlanGenerated}`);

  // ─── 1. ALLURE CIBLE ───
  log(`\n  ━━━ 1. ALLURE CIBLE — cohérence chrono / PB / Finisher ━━━`);
  log(`    Allures théoriques (paces[]) :`);
  for(const [k,v] of Object.entries(paces)) log(`      ${k.padEnd(32)} ${v}/km`);

  let chronoCheck = null;
  let allureSpecAffichee = null;
  if(targetTime && vma){
    const tt = String(targetTime); let chronoSec=null;
    const hm = tt.match(/(\d+)\s*h\s*(\d{1,2})?/i);
    if(hm) chronoSec = parseInt(hm[1])*3600 + (hm[2]?parseInt(hm[2])*60:0);
    else { const m = tt.match(/(\d{1,2})\s*[:h']\s*(\d{1,2})/); if(m) chronoSec = parseInt(m[1])*60+parseInt(m[2]); }
    let raceKm = null, lbl='', specKey=null;
    if((goal||'').toLowerCase().includes('marathon')&&!(goal||'').toLowerCase().includes('semi')){ raceKm=42.195; lbl='marathon'; specKey='allureSpecifiqueMarathon'; }
    else if((goal||'').toLowerCase().includes('semi')||(subGoal||'').toLowerCase().includes('semi')){ raceKm=21.097; lbl='semi'; specKey='allureSpecifiqueSemi'; }
    else if((subGoal||'').toLowerCase().includes('10')||(goal||'').toLowerCase().includes('10km')){ raceKm=10; lbl='10km'; specKey='allureSpecifique10k'; }
    else if((subGoal||'').toLowerCase().includes('5')||(goal||'').toLowerCase().includes('5km')){ raceKm=5; lbl='5km'; specKey='allureSpecifique5k'; }
    else if(trailDist) { raceKm = trailDist; lbl='trail'; }
    if(raceKm && chronoSec){
      const racePaceSec = chronoSec/raceKm;
      const racePaceKmh = 3600/racePaceSec;
      const pctVMA = racePaceKmh/vma;
      const expected = lbl==='marathon'?[0.78,0.86]:lbl==='semi'?[0.82,0.90]:lbl==='10km'?[0.86,0.94]:lbl==='5km'?[0.90,1.00]:[0.55,0.75];
      const verdict = pctVMA < expected[0]-0.05 ? '🟢 trop facile' : pctVMA > expected[1]+0.05 ? '🔴 INATTEIGNABLE' : pctVMA > expected[1] ? '🟡 ambitieux' : '✅ cohérent';
      allureSpecAffichee = specKey ? paces[specKey] : null;
      chronoCheck = { lbl, raceKm, paceCible:`${Math.floor(racePaceSec/60)}:${String(Math.round(racePaceSec%60)).padStart(2,'0')}/km`, pctVMA, verdict, expected, allureSpecAffichee };
      log(`\n    📍 Cohérence chrono cible :`);
      log(`       ${lbl} ${raceKm}km en ${targetTime} → pace cible théorique = ${chronoCheck.paceCible}`);
      log(`       Allure spec affichée plan (${specKey}) = ${allureSpecAffichee || '(absente)'}`);
      log(`       % VMA = ${(pctVMA*100).toFixed(0)}%  →  ${verdict}  (attendu ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}%VMA)`);
      // Comparaison allure plan vs pace cible théorique
      if(allureSpecAffichee){
        const diff = secDiff(allureSpecAffichee, chronoCheck.paceCible);
        log(`       Δ allure plan vs cible théo = ${diff===null?'?':diff+'s'} ${diff===null?'':diff<=15?'✅':diff<=30?'🟡':'🔴'}`);
      }
    }
  } else if(Object.keys(recent).length){
    log(`\n    📍 Finisher + PB déclaré : vérifier allure = max(allurePB + 5% cushion, allure VMA-based)`);
  } else {
    log(`\n    📍 Cohérence chrono cible : Finisher / pas de cible chrono → allure VMA-based`);
  }

  // Allures S1 vs paces théoriques
  const w1 = (p.weeks||[])[0]||{sessions:[]};
  const sess = w1.sessions||[];
  log(`\n    Séances S1 — cohérence allure vs type :`);
  const alluresCheck = [];
  for(const s of sess){
    if(!s.targetPace) {
      log(`      ⚪ ${(s.day||'?').padEnd(10)} ${(s.type||'?').padEnd(18)} (pas de targetPace) — "${s.title||''}"`);
      continue;
    }
    const pace = String(s.targetPace).match(/(\d+:\d+)/)?.[1];
    if(!pace) continue;
    const type = (s.type||'').toLowerCase(); const intens = (s.intensity||'').toLowerCase(); const title=(s.title||'').toLowerCase();
    let expectedKey = null;
    if(type.includes('seuil')||intens.includes('seuil')||title.includes('seuil')) expectedKey='seuilPace';
    else if(type.includes('vma')||intens.includes('vma')||title.includes('vma')) expectedKey='vmaPace';
    else if(title.includes('spécifique')||title.includes('specifique')){
      if((goal||'').toLowerCase().includes('marathon')&&!goal.includes('semi')) expectedKey='allureSpecifiqueMarathon';
      else if((goal||'').toLowerCase().includes('semi')||(subGoal||'').toLowerCase().includes('semi')) expectedKey='allureSpecifiqueSemi';
      else if((subGoal||'').toLowerCase().includes('10')) expectedKey='allureSpecifique10k';
      else if((subGoal||'').toLowerCase().includes('5')) expectedKey='allureSpecifique5k';
    }
    else if(type.includes('longue')||type.includes('jogging')||intens.includes('facile')||intens.includes('modéré')) expectedKey='efPace';
    else if(type.includes('récup')||type.includes('recup')||intens.includes('très facile')) expectedKey='recoveryPace';
    const expected = expectedKey?paces[expectedKey]:null;
    const diff = expected?secDiff(pace, expected):null;
    const ok = diff===null?true:diff<=20;
    alluresCheck.push({ day:s.day, type:s.type, title:s.title, pace, expectedKey, expected, diff, ok });
    const status = expectedKey ? (ok?'✅':'🔴') : '⚪';
    const diffStr = diff!==null ? ` (Δ ${diff}s)` : '';
    log(`      ${status} ${(s.day||'?').padEnd(10)} ${(s.type||'?').padEnd(18)} pace=${pace}/km ${expectedKey?`vs ${expectedKey}=${expected}`:''}${diffStr}`);
  }

  // ─── 2. VOLUME HEBDO COMPLET + S1 vs DECLARED ───
  log(`\n  ━━━ 2. VOLUME HEBDO COMPLET + PROJECTION + S1 vs DECLARED ━━━`);
  const peakKm = Math.max(0, ...wv);
  const peakWeek = wv.indexOf(peakKm)+1;
  const lastKm = wv[wv.length-1]||0;
  const last2Km = wv[wv.length-2]||0;
  const taperPct = peakKm?(lastKm/peakKm*100):0;
  const taperPct2 = peakKm?(last2Km/peakKm*100):0;
  const deltas = [];
  for(let i=1;i<wv.length;i++) if(wv[i-1]>0) deltas.push({ i, from:wv[i-1], to:wv[i], pct:(wv[i]-wv[i-1])/wv[i-1]*100 });
  const maxJump = deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity});
  const maxDrop = deltas.reduce((m,d)=>d.pct<m.pct?d:m, {pct:Infinity});
  const startJump = (curVol && wv[0]) ? (wv[0]/curVol-1)*100 : null;
  const baisseInjustifiee = (curVol && wv[0]) ? (wv[0] < curVol) : false;

  log(`\n    📊 Vol DÉCLARÉ user (currentWeeklyVolume) : ${curVol||'?'} km/sem${curDplus?` / D+ ${curDplus} m`:''}`);
  log(`    📊 Vol S1 plan : ${wv[0]||'?'} km`);
  if(curVol && wv[0]){
    const delta = wv[0]-curVol;
    if(baisseInjustifiee){
      log(`    🚨 BAISSE S1 vs DÉCLARÉ : ${wv[0]} km plan < ${curVol} km user (Δ ${delta} km, ${startJump.toFixed(0)}%) — FLAG CRITIQUE`);
    } else {
      const sj = startJump > 30 ? '🔴 trop fort' : startJump > 10 ? '🟡 prudent' : '✅';
      log(`    ${sj} S1 vs DÉCLARÉ : ${wv[0]} km plan vs ${curVol} km user = ${startJump>=0?'+':''}${startJump.toFixed(0)}%`);
    }
  }
  log(`    📊 Pic : S${peakWeek} = ${peakKm} km`);
  log(`    📊 Affûtage final : S${wv.length} = ${lastKm} km (${taperPct.toFixed(0)}% du pic) • S${wv.length-1} = ${last2Km} km (${taperPct2.toFixed(0)}% du pic)`);

  if(!wv.length){
    log(`    ⚠ Pas de weeklyVolumes projeté dans periodizationPlan`);
  } else {
    log(`\n    📋 TABLEAU weeklyVolumes COMPLET :`);
    log(`    Sem | Phase            | km   | bar                                          | Δ%      | Flags`);
    log(`    ────┼──────────────────┼──────┼──────────────────────────────────────────────┼─────────┼─────────`);
    const maxV = Math.max(...wv, 1);
    wv.forEach((v,i)=>{
      const bar = '█'.repeat(Math.round((v/maxV)*40))+'·'.repeat(40-Math.round((v/maxV)*40));
      const flag = (recoveryWeeks.includes(i+1) ? '↓DELOAD ' : '') + (i+1===peakWeek?'★PIC ':'') + (i===wv.length-1?'🏁RACE':'');
      const d = i>0 ? `${((v-wv[i-1])/wv[i-1]*100).toFixed(0).padStart(5)}%` : '   --';
      log(`    S${String(i+1).padStart(2)} | ${(wp[i]||'?').padEnd(16)} | ${String(v).padStart(4)} | ${bar} | ${d}  | ${flag}`);
    });

    // Tableau D+ si trail
    if(trailDist && weTarget.length){
      log(`\n    📋 TABLEAU weeklyElevationTarget (D+) :`);
      log(`    Sem | D+ (m) | bar`);
      log(`    ────┼────────┼──────────────────────────────`);
      const maxE = Math.max(...weTarget, 1);
      weTarget.forEach((e,i)=>{
        const bar = '█'.repeat(Math.round((e/maxE)*30));
        log(`    S${String(i+1).padStart(2)} | ${String(e).padStart(6)} | ${bar}`);
      });
      const peakD = Math.max(...weTarget);
      const peakDw = weTarget.indexOf(peakD)+1;
      log(`\n    D+ S1 plan = ${weTarget[0]} m vs DÉCLARÉ ${curDplus||'?'} m`);
      if(curDplus && weTarget[0] < curDplus) log(`    🚨 BAISSE D+ S1 vs DÉCLARÉ : ${weTarget[0]} m plan < ${curDplus} m user`);
      log(`    D+ pic = S${peakDw} = ${peakD} m vs race D+ = ${trailElev} m (ratio ${(peakD/trailElev*100).toFixed(0)}%)`);
    }

    log(`\n    📈 Max augmentation : S${maxJump.i}→S${maxJump.i+1} ${maxJump.from}→${maxJump.to}km = ${maxJump.pct>=0?'+':''}${maxJump.pct.toFixed(0)}%  ${maxJump.pct>20?'🔴':maxJump.pct>15?'🟡':'✅'}`);
    log(`    📉 Max décharge : S${maxDrop.i}→S${maxDrop.i+1} ${maxDrop.from}→${maxDrop.to}km = ${maxDrop.pct.toFixed(0)}%`);
    log(`    🔄 Semaines de décharge projetées : ${recoveryWeeks.join(', ')||'(aucune)'}`);

    // Garde-fou délai court
    const ambitieux = (goal||'').toLowerCase().includes('marathon') ||
                       ((goal||'').toLowerCase().includes('semi') && targetTime && targetTime!=='Finisher') ||
                       (trailDist && trailDist >= 30);
    if(dur < 12 && ambitieux){
      log(`\n    ⚠ GARDE-FOU DÉLAI COURT : plan ${dur} sem (<12) sur objectif ambitieux`);
      if(baisseInjustifiee){
        log(`    🚨 CRITIQUE : volume S1 < volume current → catastrophe préparatoire potentielle`);
      } else {
        log(`    ✅ Volume S1 maintient/augmente vs current (OK)`);
      }
    }
  }

  // ─── 3. SL S1 + PROJECTION SL PIC ───
  log(`\n  ━━━ 3. SL S1 + PROJECTION SL PIC ━━━`);
  const sl = sess.filter(s => /longue/i.test(s.type||'') || /longue/i.test(s.title||''));
  const distKmS1 = sess.reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0);
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));

  log(`    Total km course S1 (réel sessions) : ${distKmS1.toFixed(1)} km`);
  log(`    SL S1 max : ${slDistMax} km${slElevMax?` / ${slElevMax}m D+`:''}`);
  for(const s of sl){
    const km = kmFrom(s.distance);
    log(`      ${s.day} : ${km}km • ${s.duration||'?'} • D+${s.elevationGain||0}m • pace ${s.targetPace||'?'} • "${s.title}"`);
  }

  if(slDistMax && wv[0]){
    const ratio = slDistMax/wv[0]*100;
    const flag = ratio>40?'🔴':ratio>30?'🟡':'✅';
    log(`    Ratio SL/Volume hebdo S1 plan : ${ratio.toFixed(0)}% ${flag} (cible 25-40%)`);
  }
  if(slDistMax && curVol){
    const ratio = slDistMax/curVol*100;
    const flag = ratio>50?'🔴':ratio>40?'🟡':'✅';
    log(`    Ratio SL/Volume DÉCLARÉ user : ${ratio.toFixed(0)}% ${flag}`);
    // SL S1 vs ce que user fait
    const slUserEstim = curVol * 0.35;
    log(`    SL S1 plan vs estim. SL user (~35% vol declared) ≈ ${slUserEstim.toFixed(1)} km`);
    if(slDistMax < slUserEstim * 0.7){
      log(`    🚨 SL S1 plan ${slDistMax} km << SL user estimée ${slUserEstim.toFixed(1)} km — risque baisse SL`);
    }
  }

  // Projection SL pic
  if(wv.length){
    const slPicMin = peakKm * 0.4;
    const slPicMax = peakKm * 0.5;
    const ref = slPicReferentiel(goal, subGoal, trailDist);
    log(`\n    📍 Projection SL pic : weeklyVolumes[S${peakWeek}]=${peakKm} km × 0.4-0.5 ≈ ${slPicMin.toFixed(1)} - ${slPicMax.toFixed(1)} km`);
    log(`    📍 Référentiel par objectif : ${ref.label} → ${ref.min} - ${ref.max} km`);
    const inRef = slPicMax >= ref.min && slPicMin <= ref.max;
    const tooShort = slPicMax < ref.min;
    const tooLong = slPicMin > ref.max;
    if(tooShort) log(`    🚨 SL pic projetée TROP COURTE vs référentiel — pic insuffisant pour ${ref.label}`);
    else if(tooLong) log(`    🟡 SL pic projetée TROP LONGUE vs référentiel`);
    else log(`    ✅ SL pic projetée cohérente avec référentiel`);
  }

  if(trailDist && slElevMax && weTarget.length){
    log(`    D+ SL S1 plan = ${slElevMax}m  •  D+ hebdo S1 plan = ${weTarget[0]}m  •  D+ course = ${trailElev}m`);
  }

  // ─── 4. FAISABILITÉ ───
  log(`\n  ━━━ 4. SCORE FAISABILITÉ ━━━`);
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
  const fMsg = feas.message || '';
  if(fMsg){
    log(`    message (${fMsg.length} chars) :`);
    fMsg.split('\n').forEach(l => log(`      │ ${l}`));
  }
  const sw = feas.safetyWarning || p.safetyWarning || '';
  if(sw){
    log(`    safetyWarning :`);
    sw.split('\n').forEach(l => log(`      │ ${l}`));
  }
  // Bug detection
  const hasBugTime = /\d+h6\d|2h60|3h60|4h60/.test(fMsg+' '+sw+' '+(p.welcomeMessage||''));
  if(hasBugTime) log(`    🚨 BUG TEMPS détecté (XhYY avec YY>59)`);

  // ─── 5. WELCOMEMESSAGE ───
  log(`\n  ━━━ 5. WELCOMEMESSAGE ━━━`);
  const wm = p.welcomeMessage || '';
  log(`    welcomeMessage (${wm.length} chars) :`);
  log(`    ${'─'.repeat(120)}`);
  wm.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(120)}`);

  log(`\n    🔍 Doctrine checks :`);
  const lowerWm = wm.toLowerCase();
  const forbiddenWords = ['poids', 'imc', 'minceur', 'silhouette', 'kg perdu', 'kilos', 'maigrir', 'amincir', 'corpulence'];
  const found = forbiddenWords.filter(w => lowerWm.includes(w));
  log(`      Mots interdits poids/IMC dans corps : ${found.length?`🔴 TROUVÉ : ${found.join(', ')}`:'✅ aucun'}`);
  log(`      Titre du plan : "${p.name||'?'}"`);
  if(p.name && /poids|minceur/i.test(p.name)) log(`      → Mention "poids" dans titre = ✅ autorisé (doctrine)`);
  const pacesInMessage = [];
  for(const [k,v] of Object.entries(paces)){
    if(v && wm.includes(v)) pacesInMessage.push(`${k}=${v}`);
  }
  log(`      Allures mentionnées dans welcome : ${pacesInMessage.length?pacesInMessage.join(', '):'(aucune textuelle)'}`);
  // Mention sécurité
  const mentionSecu = /m[ée]decin|cardio|certificat|consult|aval/i.test(wm);
  log(`      Mention médecin/cardio/certif : ${mentionSecu?'✅ oui':'⚠ non'} (obligatoire si âge>50 ou BMI>30)`);
  if((age && age>=50) || (bmi && bmi>=30)){
    if(!mentionSecu) log(`      🚨 Manque mention sécurité (âge=${age}, BMI=${bmi?.toFixed(1)})`);
  }
  // Cross-training interdit
  const crossWords = ['vélo','velo','natation','nager','elliptique','rameur','cross-training','crosstraining'];
  const crossFound = crossWords.filter(w => lowerWm.includes(w));
  log(`      Cross-training mentionné : ${crossFound.length?`🔴 ${crossFound.join(', ')}`:'✅ aucun'}`);
  // Nutrition
  const nutWords = ['glucides','prot[ée]ines?','calories','macros','di[ée]t[ée]tique'];
  const nutFound = nutWords.filter(w => new RegExp(w,'i').test(lowerWm));
  log(`      Nutrition / chiffres : ${nutFound.length?`🟡 mentions : ${nutFound.join(', ')}`:'✅ aucune'}`);

  // ─── DUMP ───
  dumps[c.tag] = {
    email: c.email, uid, firstName: user.firstName||u.displayName,
    plan: { id: p.id, name: p.name, createdAt: p.createdAt, durationWeeks: p.durationWeeks, sessionsPerWeek: p.sessionsPerWeek, isPremium: p.isPremium, isPreview: p.isPreview, fullPlanGenerated: p.fullPlanGenerated },
    inputs: { sex, age, weight: w_, height: h_, bmi: bmi?.toFixed?.(1), goal, subGoal, targetTime, raceDate, freq, vma, level, curVol, curDplus, inj: fmtInj(inj), trailDist, trailElev, recent },
    paces,
    weeklyVolumes: wv, weeklyPhases: wp, recoveryWeeks, weeklyElevationTarget: weTarget,
    s1: { sessions: sess.map(s => ({ day:s.day, type:s.type, title:s.title, distance:s.distance, duration:s.duration, intensity:s.intensity, targetPace:s.targetPace, elevationGain:s.elevationGain })) },
    feasibility: feas, confidenceScore: p.confidenceScore,
    welcomeMessage: wm, safetyWarning: sw,
    audit: {
      baisseS1Injustifiee: baisseInjustifiee,
      startJumpPct: startJump,
      peakKm, peakWeek, lastKm, taperPct,
      slS1Max: slDistMax,
      slPicProjMin: wv.length?peakKm*0.4:0,
      slPicProjMax: wv.length?peakKm*0.5:0,
      slPicRef: slPicReferentiel(goal, subGoal, trailDist),
      hasBugTime,
      forbiddenWordsFound: found,
      crossTrainingFound: crossFound
    }
  };

  synthClients.push({
    tag: c.tag, email: c.email, firstName: user.firstName||u.displayName,
    goal: `${goal||''} ${subGoal?'('+subGoal+')':''}${trailDist?' '+trailDist+'k':''}`.trim(),
    target: targetTime||'Finisher',
    vma: vma?.toFixed?.(1), level, dur, freq,
    curVol: curVol||'?',
    s1Km: wv[0]||'?',
    baisseS1: baisseInjustifiee?'🚨 OUI':'✅ non',
    peakKm: peakKm||'?', peakWeek: peakKm?peakWeek:'?',
    maxJump: maxJump.pct!==-Infinity?`+${maxJump.pct.toFixed(0)}%`:'?',
    taperPct: peakKm?`${taperPct.toFixed(0)}%`:'?',
    slS1Max: slDistMax||'?',
    slPicProj: wv.length?`${(peakKm*0.4).toFixed(1)}-${(peakKm*0.5).toFixed(1)}`:'?',
    chronoVerdict: chronoCheck?chronoCheck.verdict.substring(0,20):'(finisher)',
    fStatus, fScore,
    wmLen: wm.length,
    forbiddenWordsCount: found.length,
    hasBugTime
  });
}

// ─── TABLEAU SYNTHÈSE ───
log('\n\n' + '═'.repeat(125));
log(`  📋 TABLEAU SYNTHÈSE — 5 CLIENTS`);
log('═'.repeat(125));
log(`  ${'Prénom'.padEnd(12)} ${'Goal'.padEnd(20)} ${'Cible'.padEnd(8)} ${'Niv'.padEnd(6)} ${'Vol'.padEnd(4)} ${'S1'.padEnd(4)} ${'Baisse'.padEnd(8)} ${'Pic'.padEnd(10)} ${'MaxJ'.padEnd(6)} ${'Aff'.padEnd(5)} ${'SLs1'.padEnd(5)} ${'SLpic'.padEnd(11)} ${'Chrono'.padEnd(20)} Fiab`);
log(`  ${'─'.repeat(123)}`);
for(const r of synthClients){
  log(`  ${(r.firstName||'?').substring(0,12).padEnd(12)} ${(r.goal).substring(0,20).padEnd(20)} ${String(r.target).substring(0,8).padEnd(8)} ${String(r.level||'?').substring(0,6).padEnd(6)} ${String(r.curVol).padEnd(4)} ${String(r.s1Km).padEnd(4)} ${String(r.baisseS1).padEnd(8)} ${(r.peakKm+'/S'+r.peakWeek).padEnd(10)} ${String(r.maxJump).padEnd(6)} ${String(r.taperPct).padEnd(5)} ${(r.slS1Max+'km').padEnd(5)} ${String(r.slPicProj).padEnd(11)} ${r.chronoVerdict.padEnd(20)} ${r.fStatus}/${r.fScore}`);
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-5-plans-template-v2.txt', out.join('\n'));
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-5-plans-template-v2.json', JSON.stringify(dumps, null, 2));
console.log('\n📝 audit-5-plans-template-v2.txt');
console.log('📝 audit-5-plans-template-v2.json');
