/**
 * AUDIT FINAL 8 PLANS — 5 DIMENSIONS (18/05/2026)
 *
 * Vérification que les patches appliqués aujourd'hui ont produit des plans
 * "parfaits" prêts à convertir.
 *
 * 8 clients :
 *   - Édouard (coquatrix.edouard@gmail.com) — NOUVEAU
 *   - Aurore (auroregervot@yahoo.fr)
 *   - Justine (justine.clt29@icloud.com)
 *   - Alan (alanwentzel74@gmail.com)
 *   - Sébastien (sebastien.sailly@outlook.fr)
 *   - Antoine (antoineg.gde@outlook.fr)
 *   - Annabelle (nabou57@hotmail.fr)
 *   - Armando (arenaarmando@hotmail.com)
 *
 * 5 dimensions :
 *   1. Faisabilité (status/score/confidence + cohérence vs profil)
 *   2. Welcome + faisabilité.message + safetyWarning (texte + doctrine)
 *   3. Volumes (ratio S1/declared + tableau weeklyVolumes + pic + progression)
 *   4. SL S1 (distance/durée/allure/D+ + ratio vol)
 *   5. Variation des séances S1 (anti-ennui : titres/mainSet/types/lieu/intensité)
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
const kmFrom = (d)=>{ if(d==null) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };

async function findUserByEmail(email){
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, { method:'POST', headers:H, body:JSON.stringify({ email:[email] }) });
  const data = await r.json();
  return data.users?.[0] || null;
}

async function fetchUserDoc(uid){
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
  if(r.status===404) return {};
  return pf((await r.json()).fields);
}

async function fetchPlans(uid){
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  return (await r.json()).filter(x=>x.document).map(x=>({ id: x.document.name.split('/').pop(), ...pf(x.document.fields) }));
}

// Référentiel SL pic par objectif (en km, ou ratio si trail)
function slPicReferentiel(goal, subGoal, trailDist){
  const g = (goal||'').toLowerCase();
  const sg = (subGoal||'').toLowerCase();
  if(trailDist) return { min: Math.round(trailDist*0.6), max: Math.round(trailDist*0.8), label: `trail ${trailDist}km (60-80%)` };
  if(g.includes('marathon') && !g.includes('semi')) return { min: 28, max: 35, label: 'marathon (28-35 km)' };
  if(g.includes('semi') || sg.includes('semi')) return { min: 16, max: 22, label: 'semi (16-22 km)' };
  if(sg.includes('10') || g.includes('10km')) return { min: 7, max: 9, label: '10k (7-9 km)' };
  if(sg.includes('5') || g.includes('5km')) return { min: 6, max: 8, label: '5k (6-8 km)' };
  if(g.includes('hyrox')) return { min: 10, max: 15, label: 'Hyrox course (10-15 km)' };
  if(g.includes('maintien')||g.includes('forme')) return { min: 6, max: 12, label: 'maintien forme (6-12 km)' };
  return { min: 0, max: 99, label: '?' };
}

const CLIENTS = [
  { tag:'Édouard',   email:'coquatrix.edouard@gmail.com',  attendu:'NOUVEAU — jamais analysé', isNew:true },
  { tag:'Aurore',    email:'auroregervot@yahoo.fr',        attendu:'recheck patches volumes' },
  { tag:'Justine',   email:'justine.clt29@icloud.com',     attendu:'recheck patches volumes' },
  { tag:'Alan',      email:'alanwentzel74@gmail.com',      attendu:'recheck patch welcome MIX' },
  { tag:'Sébastien', email:'sebastien.sailly@outlook.fr',  attendu:'recheck allure 9:30 + welcome enrichi + SL 30min walk/run' },
  { tag:'Antoine',   email:'antoineg.gde@outlook.fr',      attendu:'recheck patch 2h60→3h00' },
  { tag:'Annabelle', email:'nabou57@hotmail.fr',           attendu:'recheck patches' },
  { tag:'Armando',   email:'arenaarmando@hotmail.com',     attendu:'recheck patches' },
];

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const dumps = {};
const synthesis = [];

log('═'.repeat(125));
log(`  AUDIT FINAL 8 PLANS — 5 DIMENSIONS  •  ${new Date().toLocaleString('fr-FR')}`);
log(`  Dimensions: 1.Faisabilité  2.Welcome+message  3.Volumes  4.SL S1  5.Variation séances S1`);
log('═'.repeat(125));

for(const c of CLIENTS){
  log('\n\n' + '█'.repeat(125));
  log(`📧 ${c.tag} — ${c.email}  (${c.attendu})`);
  log('█'.repeat(125));

  const u = await findUserByEmail(c.email);
  if(!u){
    log(`  ❌ NOT_FOUND — pas de compte Firebase Auth`);
    synthesis.push({ tag:c.tag, email:c.email, status:'NOT_FOUND' });
    continue;
  }
  const uid = u.localId;
  log(`  UID: ${uid}  •  Créé: ${u.createdAt?new Date(parseInt(u.createdAt)).toISOString():'?'}  •  Last login: ${u.lastLoginAt?new Date(parseInt(u.lastLoginAt)).toISOString():'?'}`);

  const user = await fetchUserDoc(uid);
  const plans = await fetchPlans(uid);
  if(!plans.length){
    log(`  ❌ Aucun plan`);
    synthesis.push({ tag:c.tag, email:c.email, status:'NO_PLAN' });
    continue;
  }
  plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const fullPlans = plans.filter(p => p.fullPlanGenerated === true);
  const p = fullPlans[0] || plans[0];
  log(`  Plans total: ${plans.length}  •  Plan analysé: ${p.id}  •  createdAt=${p.createdAt||'?'}  •  full=${p.fullPlanGenerated}  •  premium=${p.isPremium}  •  preview=${p.isPreview}`);
  if(plans.length > 1) log(`  Tous plans: ${plans.map(x=>`${x.id}(full=${x.fullPlanGenerated},${(x.createdAt||'?').slice(0,10)})`).join(' | ')}`);

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

  // ─── IDENTITÉ ───
  log(`\n  ━━━ IDENTITÉ & INPUTS ━━━`);
  log(`  Prénom: ${user.firstName||u.displayName||'?'}  •  Plan: "${p.name||'?'}"`);
  log(`  Sexe: ${sex||'?'}  •  Âge: ${age||'?'}  •  Poids: ${w_||'?'} kg  •  Taille: ${h_||'?'} cm  •  IMC: ${bmi?.toFixed?.(1)||'?'}`);
  log(`  Niveau: ${level||'?'}  •  VMA: ${vma?.toFixed?.(2)||'?'} km/h (${p.vmaSource||'?'})`);
  log(`  Objectif: ${goal||'?'} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}`);
  log(`  Cible chrono: ${targetTime||'Finisher'}  •  Race date: ${raceDate||'(N/A)'}`);
  log(`  Durée: ${dur} sem  •  Fréquence: ${freq} séances/sem`);
  log(`  Vol DÉCLARÉ: ${curVol||'?'} km/sem${curDplus?` / D+ ${curDplus} m`:''}  •  Blessures: ${fmtInj(inj)}`);
  if(Object.keys(recent).length) log(`  Chronos récents (PB): ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • ')}`);

  log(`\n  Allures (paces[]) :`);
  for(const [k,v] of Object.entries(paces)) log(`    ${k.padEnd(32)} ${v}/km`);

  // ─── DIM 1. FAISABILITÉ ───
  log(`\n  ━━━ 1. FAISABILITÉ ━━━`);
  const feas = p.feasibility||{};
  const fStatus = feas.status || '?';
  const fScore = feas.score ?? '?';
  const cScore = p.confidenceScore ?? '?';
  log(`    feasibility.status   : ${fStatus}`);
  log(`    feasibility.score    : ${fScore}`);
  log(`    confidenceScore      : ${cScore}`);
  if(feas.gates) log(`    feasibility.gates    : ${JSON.stringify(feas.gates)}`);
  if(feas.flags) log(`    feasibility.flags    : ${JSON.stringify(feas.flags)}`);
  if(feas.reasons) log(`    feasibility.reasons  : ${JSON.stringify(feas.reasons)}`);
  if(feas.warnings) log(`    feasibility.warnings : ${JSON.stringify(feas.warnings)}`);

  // Cohérence FAISABILITÉ vs profil réel
  let chronoCheck = null;
  if(targetTime && targetTime !== 'Finisher' && vma){
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
      chronoCheck = { lbl, raceKm, paceCible:`${Math.floor(racePaceSec/60)}:${String(Math.round(racePaceSec%60)).padStart(2,'0')}/km`, pctVMA, verdict, expected };
      log(`\n    📍 Cohérence chrono cible :`);
      log(`       ${lbl} ${raceKm}km en ${targetTime} → pace cible = ${chronoCheck.paceCible} (${(pctVMA*100).toFixed(0)}%VMA)`);
      log(`       Attendu ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}%VMA  →  ${verdict}`);
    }
  } else if(Object.keys(recent).length){
    log(`\n    📍 Finisher + PB déclaré → ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(', ')}`);
  } else {
    log(`\n    📍 Finisher / pas de cible chrono`);
  }

  // Verdict dimension 1
  let dim1Verdict = '✅';
  const dim1Issues = [];
  if(chronoCheck && chronoCheck.verdict.includes('INATTEIGNABLE') && fStatus === 'BON'){
    dim1Verdict = '❌'; dim1Issues.push('chrono INATTEIGNABLE mais status=BON');
  } else if(chronoCheck && chronoCheck.verdict.includes('INATTEIGNABLE')){
    if(fStatus === 'IRRÉALISTE' || fStatus === 'IRREALISTE') dim1Verdict = '✅';
    else if(fStatus === 'AMBITIEUX'){ dim1Verdict = '⚠️'; dim1Issues.push('chrono INATTEIGNABLE mais status=AMBITIEUX (devrait être IRRÉALISTE)'); }
  } else if(chronoCheck && chronoCheck.verdict.includes('ambitieux')){
    if(fStatus === 'BON'){ dim1Verdict = '⚠️'; dim1Issues.push('chrono ambitieux mais status=BON'); }
  }
  log(`    Verdict dim 1 : ${dim1Verdict} ${dim1Issues.length?'('+dim1Issues.join(' | ')+')':''}`);

  // ─── DIM 2. WELCOME + FAISABILITÉ.MESSAGE + SAFETY ───
  log(`\n  ━━━ 2. WELCOME + faisabilité.message + safetyWarning ━━━`);
  const wm = p.welcomeMessage || '';
  const fMsg = feas.message || '';
  const sw = feas.safetyWarning || p.safetyWarning || '';

  log(`\n    [A] welcomeMessage (${wm.length} chars):`);
  log(`    ${'─'.repeat(120)}`);
  wm.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(120)}`);

  log(`\n    [B] feasibility.message (${fMsg.length} chars):`);
  log(`    ${'─'.repeat(120)}`);
  fMsg.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(120)}`);

  log(`\n    [C] safetyWarning (${sw.length} chars):`);
  log(`    ${'─'.repeat(120)}`);
  sw.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(120)}`);

  // Doctrine checks
  log(`\n    🔍 Checklist doctrine :`);
  const allTxt = (wm + ' ' + fMsg + ' ' + sw).toLowerCase();

  const forbiddenWords = ['poids', 'imc', 'minceur', 'silhouette', 'kg perdu', 'kilos', 'maigrir', 'amincir', 'corpulence'];
  const found = forbiddenWords.filter(w => {
    // OK dans le titre, KO dans le corps
    const lowerWm = wm.toLowerCase();
    return lowerWm.includes(w) || fMsg.toLowerCase().includes(w) || sw.toLowerCase().includes(w);
  });
  log(`      Mots interdits poids/IMC dans corps msg : ${found.length?`🔴 ${found.join(', ')}`:'✅ aucun'}`);
  log(`      Titre du plan : "${p.name||'?'}" ${p.name&&/poids|minceur/i.test(p.name)?'(mention "poids" autorisée dans titre)':''}`);

  const crossWords = ['vélo','velo','natation','nager','elliptique','rameur','cross-training','crosstraining'];
  const crossFound = crossWords.filter(w => allTxt.includes(w));
  log(`      Cross-training mentionné : ${crossFound.length?`🔴 ${crossFound.join(', ')}`:'✅ aucun'}`);

  const nutWords = ['glucides','protéine','protein','calorie','macros','diététique','dietetique','grammes de','g/h','mg/h','ml/h'];
  const nutFound = nutWords.filter(w => allTxt.includes(w));
  log(`      Nutrition chiffrée : ${nutFound.length?`🟡 ${nutFound.join(', ')}`:'✅ aucune'}`);

  const hasBugTime = /\d+h6\d|2h60|3h60|4h60|5h60/.test(wm+' '+fMsg+' '+sw);
  log(`      Bug temps XhYY (YY>59) : ${hasBugTime?'🚨 TROUVÉ':'✅ aucun'}`);

  // Règle A3 : Finisher+PB → welcome cite le PB
  let pbMentioned = null;
  if((!targetTime || targetTime === 'Finisher') && Object.keys(recent).length){
    pbMentioned = Object.values(recent).some(v => wm.includes(String(v)));
    log(`      Règle A3 (Finisher+PB) : welcome cite le PB ? ${pbMentioned?'✅ oui':'⚠️ non'}`);
  }

  // Règle A4 : blessure → welcome cite + structure 3 piliers
  let injMentioned = null, has3pillars = null;
  const injStr = fmtInj(inj);
  if(injStr !== 'aucune'){
    // chercher mention spécifique
    const injKeywords = injStr.toLowerCase().split(/[,;]/).map(s=>s.trim()).filter(Boolean);
    injMentioned = injKeywords.some(k => k.length>3 && wm.toLowerCase().includes(k.substring(0,5)));
    // 3 piliers : prévention/renforcement/écoute corps
    has3pillars = /pr[ée]vent|renforc|[ée]cout/i.test(wm) && /pr[ée]vent|renforc|[ée]cout/i.test(wm.replace(/pr[ée]vent|renforc|[ée]cout/i,''));
    log(`      Règle A4 (blessure="${injStr}") : welcome cite blessure ? ${injMentioned?'✅':'⚠️'} | structure 3 piliers ? ${has3pillars?'✅':'⚠️'}`);
  }

  // Cohérence entre les 3 textes
  let coherence = '✅ cohérent';
  if(fStatus === 'IRRÉALISTE' && !/ambitieux|difficile|exigeant|engagement|prudent|risque/i.test(wm)){
    coherence = '⚠️ welcome trop optimiste vs status=IRRÉALISTE';
  } else if(fStatus === 'AMBITIEUX' && !/ambitieux|difficile|exigeant|engagement/i.test(wm)){
    coherence = '⚠️ welcome ne mentionne pas le caractère ambitieux';
  }
  log(`      Cohérence welcome ↔ status faisabilité : ${coherence}`);

  // Verdict dim 2
  let dim2Verdict = '✅';
  const dim2Issues = [];
  if(found.length){ dim2Verdict = '❌'; dim2Issues.push('mots interdits poids'); }
  if(crossFound.length){ dim2Verdict = '❌'; dim2Issues.push('cross-training'); }
  if(nutFound.length){ if(dim2Verdict==='✅') dim2Verdict='⚠️'; dim2Issues.push('nutrition chiffrée'); }
  if(hasBugTime){ dim2Verdict='❌'; dim2Issues.push('bug XhYY'); }
  if(coherence.startsWith('⚠️')){ if(dim2Verdict==='✅') dim2Verdict='⚠️'; dim2Issues.push('cohérence msg'); }
  if(pbMentioned === false){ if(dim2Verdict==='✅') dim2Verdict='⚠️'; dim2Issues.push('PB non cité (A3)'); }
  if(injStr !== 'aucune' && injMentioned === false){ if(dim2Verdict==='✅') dim2Verdict='⚠️'; dim2Issues.push('blessure non citée (A4)'); }
  log(`    Verdict dim 2 : ${dim2Verdict} ${dim2Issues.length?'('+dim2Issues.join(' | ')+')':''}`);

  // ─── DIM 3. VOLUMES ───
  log(`\n  ━━━ 3. VOLUMES HEBDO ━━━`);
  const peakKm = wv.length ? Math.max(...wv) : 0;
  const peakWeek = wv.indexOf(peakKm)+1;
  const s1Km = wv[0] || 0;
  const ratioS1 = (curVol && s1Km) ? s1Km/curVol : null;
  const baisseInjustifiee = (curVol && s1Km) ? (ratioS1 < 0.95) : false;
  const lastKm = wv[wv.length-1]||0;
  const taperPct = peakKm?(lastKm/peakKm*100):0;
  const deltas = [];
  for(let i=1;i<wv.length;i++) if(wv[i-1]>0) deltas.push({ i, from:wv[i-1], to:wv[i], pct:(wv[i]-wv[i-1])/wv[i-1]*100 });
  const maxJump = deltas.length ? deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity}) : {pct:0};

  log(`\n    📊 Vol DÉCLARÉ : ${curVol||'?'} km/sem${curDplus?` / D+ ${curDplus}m`:''}`);
  log(`    📊 Vol S1 plan : ${s1Km} km`);
  if(curVol && s1Km){
    const startJump = (s1Km/curVol-1)*100;
    if(baisseInjustifiee){
      log(`    🚨 BAISSE S1 : ${s1Km} km plan vs ${curVol} km user (ratio ${(ratioS1*100).toFixed(0)}%)`);
    } else {
      const sj = startJump > 30 ? '🔴 trop fort' : startJump > 10 ? '🟡 prudent' : '✅';
      log(`    ${sj} Ratio S1/declared = ${(ratioS1*100).toFixed(0)}% (Δ ${startJump>=0?'+':''}${startJump.toFixed(0)}%)`);
    }
  }
  log(`    📊 Pic : S${peakWeek} = ${peakKm} km`);
  log(`    📊 Affûtage final : S${wv.length} = ${lastKm} km (${taperPct.toFixed(0)}% du pic)`);

  if(wv.length){
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

    if(trailDist && weTarget.length){
      log(`\n    📋 TABLEAU weeklyElevationTarget (D+) :`);
      const maxE = Math.max(...weTarget, 1);
      weTarget.forEach((e,i)=>{
        const bar = '█'.repeat(Math.round((e/maxE)*30));
        log(`    S${String(i+1).padStart(2)} | ${String(e).padStart(6)}m | ${bar}`);
      });
      const peakD = Math.max(...weTarget);
      const peakDw = weTarget.indexOf(peakD)+1;
      log(`    D+ pic = S${peakDw} = ${peakD}m vs race D+ = ${trailElev}m (ratio ${trailElev?(peakD/trailElev*100).toFixed(0):'?'}%)`);
    }

    log(`\n    📈 Max augmentation : ${maxJump.pct!==-Infinity?`S${maxJump.i}→S${maxJump.i+1} ${maxJump.from}→${maxJump.to}km = +${maxJump.pct.toFixed(0)}%`:'?'}  ${maxJump.pct>20?'🔴':maxJump.pct>15?'🟡':'✅'}`);
    log(`    🔄 Semaines décharge : ${recoveryWeeks.join(', ')||'(aucune)'}`);
  }

  // Pic vs référentiel
  const slRef = slPicReferentiel(goal, subGoal, trailDist);

  // Verdict dim 3
  let dim3Verdict = '✅';
  const dim3Issues = [];
  if(baisseInjustifiee){ dim3Verdict='❌'; dim3Issues.push(`S1<declared (${(ratioS1*100).toFixed(0)}%)`); }
  if(maxJump.pct > 25){ if(dim3Verdict==='✅') dim3Verdict='⚠️'; dim3Issues.push(`saut max +${maxJump.pct.toFixed(0)}%`); }
  if(taperPct > 80){ if(dim3Verdict==='✅') dim3Verdict='⚠️'; dim3Issues.push(`affûtage faible (${taperPct.toFixed(0)}%)`); }
  if(!recoveryWeeks.length && dur >= 6){ if(dim3Verdict==='✅') dim3Verdict='⚠️'; dim3Issues.push('aucune sem décharge'); }
  log(`    Verdict dim 3 : ${dim3Verdict} ${dim3Issues.length?'('+dim3Issues.join(' | ')+')':''}`);

  // ─── DIM 4. SL S1 ───
  log(`\n  ━━━ 4. SL S1 ━━━`);
  const w1 = (p.weeks||[])[0]||{sessions:[]};
  const sess = w1.sessions||[];
  const sl = sess.filter(s => /longue/i.test(s.type||'') || /longue/i.test(s.title||''));
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));

  if(!sl.length){
    log(`    ⚠️ Aucune SL trouvée en S1`);
  } else {
    for(const s of sl){
      log(`    ${s.day}: ${s.distance||'?'} • ${s.duration||'?'} • D+${s.elevationGain||0}m • pace ${s.targetPace||'?'}`);
      log(`      Titre : "${s.title||''}"`);
      if(s.mainSet) log(`      mainSet : "${(s.mainSet||'').substring(0,200)}"`);
      if(s.locationSuggestion) log(`      location : "${s.locationSuggestion}"`);
    }
  }

  if(slDistMax && s1Km){
    const ratio = slDistMax/s1Km*100;
    const flag = ratio>40?'🔴':ratio>30?'🟡':'✅';
    log(`    Ratio SL/Vol hebdo S1 plan : ${ratio.toFixed(0)}% ${flag} (cible 25-40%)`);
  }
  if(slDistMax && curVol){
    const ratioUser = slDistMax/curVol*100;
    log(`    Ratio SL/Vol DÉCLARÉ user : ${ratioUser.toFixed(0)}%`);
  }
  log(`    Référentiel SL pic : ${slRef.label} → ${slRef.min}-${slRef.max} km`);

  // Verdict dim 4
  let dim4Verdict = '✅';
  const dim4Issues = [];
  if(!sl.length){
    // Check si débutant avec walk/run/jogging : OK ; sinon ⚠
    const hasWalkRun = sess.some(s => /marche|walk|jogging/i.test((s.type||'')+(s.title||'')));
    if(hasWalkRun){
      log(`    Note : pas de SL distincte mais walk/run/jogging présent (typique débutant)`);
    } else {
      dim4Verdict='⚠️'; dim4Issues.push('aucune SL S1');
    }
  } else {
    const ratio = slDistMax/s1Km*100;
    if(ratio > 50){ dim4Verdict='⚠️'; dim4Issues.push(`SL=${ratio.toFixed(0)}% S1 (trop long)`); }
    if(ratio < 20 && level && !level.toLowerCase().includes('débutant') && !level.toLowerCase().includes('debutant')){
      dim4Verdict='⚠️'; dim4Issues.push(`SL=${ratio.toFixed(0)}% S1 (trop court hors débutant)`);
    }
  }
  // Vérif spécifique Sébastien
  if(c.tag === 'Sébastien'){
    const slS1 = sl[0];
    const expectedTitle = /walk.run|walk\/run|marche.course|6.*2.*trot.*3.*marche/i;
    const slOk = slS1 && (expectedTitle.test(slS1.title||'') || expectedTitle.test(slS1.mainSet||''));
    if(slOk){
      log(`    ✅ Sébastien : SL S1 = walk/run conforme FFA`);
    } else {
      log(`    🔴 Sébastien : SL S1 ne suit pas le pattern walk/run (6×2'trot/3'marche)`);
      dim4Verdict = '❌';
      dim4Issues.push('SL Sébastien non walk/run');
    }
  }
  log(`    Verdict dim 4 : ${dim4Verdict} ${dim4Issues.length?'('+dim4Issues.join(' | ')+')':''}`);

  // ─── DIM 5. VARIATION SÉANCES S1 (NOUVELLE) ───
  log(`\n  ━━━ 5. VARIATION DES SÉANCES S1 (anti-ennui) ━━━`);
  log(`\n    📋 Tableau sessions S1 :`);
  log(`    Jour       | Type               | Titre                                        | mainSet (extrait)                    | Location`);
  log(`    ───────────┼────────────────────┼──────────────────────────────────────────────┼──────────────────────────────────────┼─────────`);
  for(const s of sess){
    const day = (s.day||'?').padEnd(10);
    const type = (s.type||'?').substring(0,18).padEnd(18);
    const title = (s.title||'').substring(0,44).padEnd(44);
    const main = (s.mainSet||'').replace(/\s+/g,' ').substring(0,36).padEnd(36);
    const loc = (s.locationSuggestion||'').substring(0,30);
    log(`    ${day} | ${type} | ${title} | ${main} | ${loc}`);
  }

  // Détails complets de chaque session
  log(`\n    📝 Détails complets sessions S1 :`);
  for(let i=0;i<sess.length;i++){
    const s = sess[i];
    log(`\n    [Session ${i+1}] ${s.day||'?'} — ${s.type||'?'}`);
    log(`      Titre        : "${s.title||''}"`);
    log(`      Distance     : ${s.distance||'?'}`);
    log(`      Durée        : ${s.duration||'?'}`);
    log(`      Intensité    : ${s.intensity||'?'}`);
    log(`      targetPace   : ${s.targetPace||'?'}`);
    log(`      D+ visé      : ${s.elevationGain||0}m`);
    log(`      warmUp       : "${(s.warmUp||'').replace(/\n/g,' ').substring(0,160)}"`);
    log(`      mainSet      : "${(s.mainSet||'').replace(/\n/g,' ').substring(0,200)}"`);
    log(`      coolDown     : "${(s.coolDown||'').replace(/\n/g,' ').substring(0,160)}"`);
    log(`      location     : "${s.locationSuggestion||''}"`);
    if(s.coachNote) log(`      coachNote    : "${(s.coachNote||'').replace(/\n/g,' ').substring(0,200)}"`);
  }

  // Analyse variation
  const titles = sess.map(s => (s.title||'').toLowerCase());
  const types = sess.map(s => (s.type||'').toLowerCase());
  const mainSets = sess.map(s => (s.mainSet||'').toLowerCase());
  const locations = sess.map(s => (s.locationSuggestion||'').toLowerCase());
  const intensities = sess.map(s => (s.intensity||'').toLowerCase());

  const uniqueTitles = new Set(titles).size;
  const uniqueTypes = new Set(types).size;
  const uniqueMainSets = new Set(mainSets.filter(Boolean)).size;
  const uniqueLocations = new Set(locations.filter(Boolean)).size;
  const uniqueIntensities = new Set(intensities.filter(Boolean)).size;

  // Footing N pattern (cliché)
  const footingN = titles.filter(t => /footing\s*\d+|jogging\s*\d+|sortie\s*\d+/i.test(t)).length;

  log(`\n    📊 Métriques variation :`);
  log(`      Titres uniques        : ${uniqueTitles}/${sess.length} ${uniqueTitles===sess.length?'✅':'⚠️'}`);
  log(`      Types uniques         : ${uniqueTypes}/${sess.length} (varié si ≥2)`);
  log(`      mainSet uniques       : ${uniqueMainSets}/${sess.length}`);
  log(`      Locations uniques     : ${uniqueLocations}/${sess.length}`);
  log(`      Intensités uniques    : ${uniqueIntensities}/${sess.length}`);
  log(`      Titres "Footing N"    : ${footingN} ${footingN>0?'🔴 cliché':'✅'}`);

  // Verdict dim 5
  let dim5Verdict = '✅';
  const dim5Issues = [];
  if(uniqueTitles < sess.length){ dim5Verdict='⚠️'; dim5Issues.push(`titres dupliqués (${uniqueTitles}/${sess.length})`); }
  if(footingN > 0){ dim5Verdict='❌'; dim5Issues.push(`titres "Footing N" génériques`); }
  // Si plus de 1 séance et tout est de l'EF (sauf si "Premier" / niveau débutant)
  const allEF = intensities.every(i => /facile|ef|endurance/i.test(i) || !i);
  if(sess.length >= 3 && allEF && !(level||'').toLowerCase().includes('premier')){
    // OK si débutant
    if(!(level||'').toLowerCase().includes('débutant')&&!(level||'').toLowerCase().includes('debutant')){
      if(dim5Verdict==='✅') dim5Verdict='⚠️';
      dim5Issues.push('100% EF sur S1 (variation intensité faible)');
    }
  }
  if(uniqueLocations <= 1 && sess.length >= 3){
    if(dim5Verdict==='✅') dim5Verdict='⚠️';
    dim5Issues.push(`location ${uniqueLocations===0?'absente':'unique'}`);
  }
  if(uniqueMainSets < sess.filter(s=>s.mainSet).length){
    if(dim5Verdict==='✅') dim5Verdict='⚠️';
    dim5Issues.push('mainSets dupliqués');
  }
  log(`    Verdict dim 5 : ${dim5Verdict} ${dim5Issues.length?'('+dim5Issues.join(' | ')+')':''}`);

  // ─── SYNTHÈSE CLIENT ───
  log(`\n  ━━━ SYNTHÈSE CLIENT ━━━`);
  const allVerdicts = [dim1Verdict, dim2Verdict, dim3Verdict, dim4Verdict, dim5Verdict];
  const nbKO = allVerdicts.filter(v => v === '❌').length;
  const nbWarn = allVerdicts.filter(v => v === '⚠️').length;
  const nbOK = allVerdicts.filter(v => v === '✅').length;
  let globalVerdict;
  if(nbKO > 0) globalVerdict = '❌ Encore des défauts';
  else if(nbWarn > 0) globalVerdict = '⚠️ Presque parfait';
  else globalVerdict = '✅ PLAN PARFAIT';
  log(`    Dim1 Faisabilité   : ${dim1Verdict}`);
  log(`    Dim2 Welcome+msg   : ${dim2Verdict}`);
  log(`    Dim3 Volumes       : ${dim3Verdict}`);
  log(`    Dim4 SL S1         : ${dim4Verdict}`);
  log(`    Dim5 Variation S1  : ${dim5Verdict}`);
  log(`    → VERDICT GLOBAL   : ${globalVerdict}  (${nbOK}✅ / ${nbWarn}⚠️ / ${nbKO}❌)`);

  // Dump
  dumps[c.tag] = {
    email: c.email, uid, firstName: user.firstName||u.displayName,
    plan: { id: p.id, name: p.name, createdAt: p.createdAt, durationWeeks: p.durationWeeks, sessionsPerWeek: p.sessionsPerWeek, isPremium: p.isPremium, isPreview: p.isPreview, fullPlanGenerated: p.fullPlanGenerated },
    inputs: { sex, age, weight: w_, height: h_, bmi: bmi?.toFixed?.(1), goal, subGoal, targetTime, raceDate, freq, vma, level, curVol, curDplus, inj: fmtInj(inj), trailDist, trailElev, recent },
    paces,
    weeklyVolumes: wv, weeklyPhases: wp, recoveryWeeks, weeklyElevationTarget: weTarget,
    s1: { sessions: sess.map(s => ({ day:s.day, type:s.type, title:s.title, distance:s.distance, duration:s.duration, intensity:s.intensity, targetPace:s.targetPace, elevationGain:s.elevationGain, warmUp:s.warmUp, mainSet:s.mainSet, coolDown:s.coolDown, locationSuggestion:s.locationSuggestion, coachNote:s.coachNote })) },
    feasibility: feas, confidenceScore: p.confidenceScore,
    welcomeMessage: wm, safetyWarning: sw,
    audit: {
      dim1: { verdict: dim1Verdict, issues: dim1Issues, status: fStatus, score: fScore, confidence: cScore, chronoCheck },
      dim2: { verdict: dim2Verdict, issues: dim2Issues, wmLen: wm.length, fMsgLen: fMsg.length, swLen: sw.length, forbiddenFound: found, crossFound, nutFound, hasBugTime, pbMentioned, injMentioned, has3pillars, coherence },
      dim3: { verdict: dim3Verdict, issues: dim3Issues, s1Km, curVol, ratioS1: ratioS1?(ratioS1*100).toFixed(0):null, baisseInjustifiee, peakKm, peakWeek, taperPct, maxJumpPct: maxJump.pct, recoveryWeeks },
      dim4: { verdict: dim4Verdict, issues: dim4Issues, slDistMax, slElevMax, slCount: sl.length, slRef },
      dim5: { verdict: dim5Verdict, issues: dim5Issues, uniqueTitles, uniqueTypes, uniqueMainSets, uniqueLocations, uniqueIntensities, footingN, sessCount: sess.length },
      globalVerdict, nbOK, nbWarn, nbKO,
    }
  };

  synthesis.push({
    tag: c.tag, email: c.email, firstName: user.firstName||u.displayName,
    goal: `${goal||''} ${subGoal?'('+subGoal+')':''}${trailDist?' '+trailDist+'k':''}`.trim(),
    target: targetTime||'Finisher',
    vma: vma?.toFixed?.(1), level, dur, freq,
    curVol: curVol||'?',
    s1Km, peakKm, peakWeek,
    fStatus, fScore: fScore !== '?' ? fScore : cScore,
    dim1Verdict, dim2Verdict, dim3Verdict, dim4Verdict, dim5Verdict,
    nbOK, nbWarn, nbKO,
    globalVerdict
  });
}

// ─── TABLEAU SYNTHÈSE ───
log('\n\n' + '═'.repeat(160));
log(`  📋 TABLEAU SYNTHÈSE GLOBALE — 8 CLIENTS / 5 DIMENSIONS`);
log('═'.repeat(160));
log(`  ${'Prénom'.padEnd(12)} ${'Goal'.padEnd(22)} ${'Cible'.padEnd(10)} ${'Niv'.padEnd(10)} ${'S1km'.padEnd(5)} ${'Pic'.padEnd(8)} ${'Faisa'.padEnd(11)} ${'D1'.padEnd(3)} ${'D2'.padEnd(3)} ${'D3'.padEnd(3)} ${'D4'.padEnd(3)} ${'D5'.padEnd(3)} | Verdict`);
log(`  ${'─'.repeat(158)}`);
for(const r of synthesis){
  if(r.status){
    log(`  ${(r.tag||'?').substring(0,12).padEnd(12)} ${r.status}`);
    continue;
  }
  log(`  ${(r.firstName||r.tag||'?').substring(0,12).padEnd(12)} ${(r.goal||'').substring(0,22).padEnd(22)} ${String(r.target).substring(0,10).padEnd(10)} ${String(r.level||'?').substring(0,10).padEnd(10)} ${String(r.s1Km).padEnd(5)} ${(r.peakKm+'/S'+r.peakWeek).padEnd(8)} ${(r.fStatus+'/'+r.fScore).padEnd(11)} ${r.dim1Verdict.padEnd(3)} ${r.dim2Verdict.padEnd(3)} ${r.dim3Verdict.padEnd(3)} ${r.dim4Verdict.padEnd(3)} ${r.dim5Verdict.padEnd(3)} | ${r.globalVerdict}`);
}

const nbPerfect = synthesis.filter(s => s.globalVerdict?.includes('PARFAIT')).length;
const nbAlmost  = synthesis.filter(s => s.globalVerdict?.includes('Presque')).length;
const nbDefect  = synthesis.filter(s => s.globalVerdict?.includes('défauts')).length;
log(`\n  TOTAL : ${nbPerfect} parfaits ✅ / ${nbAlmost} presque ⚠️ / ${nbDefect} avec défauts ❌`);

writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-final-8-plans.txt', out.join('\n'));
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-final-8-plans.json', JSON.stringify(dumps, null, 2));
console.log('\n📝 audit-final-8-plans.txt');
console.log('📝 audit-final-8-plans.json');
