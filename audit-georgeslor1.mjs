/**
 * AUDIT COMPLET — georgeslor1@gmail.com
 *
 * 5 dimensions :
 *   1. ALLURE COHÉRENCE — paces calculées vs VMA, vs targetTime, vs niveau
 *   2. DISTANCE / DURÉE SL — progression sortie longue, pic, saut
 *   3. VOLUME HEBDO + PIC — saut S1, progression, récup, affûtage
 *   4. WELCOMEMESSAGE — conformité doctrine (pas poids/IMC/minceur, allures EXACTES)
 *   5. FAISABILITÉ R2 — status, message, safetyWarning, score, gates déclenchées
 *
 * Lecture seule. Aucune modification du plan ni contact client.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

const EMAIL = 'georgeslor1@gmail.com';

// ─── helpers Firestore REST → JS ───
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

const kmFrom = (d)=>{ if(!d) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };
const paceToSec = (p)=>{ if(!p) return null; const m=String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m?parseInt(m[1])*60+parseInt(m[2]):null; };
const secDiff = (p1, p2) => { const a=paceToSec(p1), b=paceToSec(p2); return (a&&b)?Math.abs(a-b):null; };
function timeToSeconds(timeStr, distance) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/);
  if (hm) { const h = parseInt(hm[1]); const m = hm[2] ? parseInt(hm[2]) : 0; return h * 3600 + m * 60; }
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) { if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60; return parseInt(ms[1])*60 + parseInt(ms[2]); }
  return 0;
}
function secondsToPace(s) { if (!s || s <= 0) return '0:00'; const m = Math.floor(s/60), sec = Math.round(s%60); return `${m}:${String(sec).padStart(2,'0')}`; }
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

const out = []; const log = (...a)=>{ const s=a.join(' '); console.log(s); out.push(s); };

log('═'.repeat(125));
log(`  AUDIT COMPLET — ${EMAIL}  •  ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(125));

// 1. Lookup Auth
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:H, body:JSON.stringify({ email:[EMAIL] }) });
const lj = await lookup.json();
const u = lj.users?.[0];
if (!u) { log(`\n❌ ${EMAIL} — pas de compte Firebase Auth`); writeFileSync('audit-georgeslor1.txt', out.join('\n')); process.exit(0); }
const uid = u.localId;

log(`\n▶ Firebase Auth`);
log(`  UID: ${uid}`);
log(`  Email vérifié: ${u.emailVerified?'✅':'❌'}`);
log(`  Créé: ${u.createdAt ? new Date(parseInt(u.createdAt)).toISOString() : '?'}`);
log(`  Dernière connexion: ${u.lastLoginAt ? new Date(parseInt(u.lastLoginAt)).toISOString() : '?'}`);
log(`  Display name: ${u.displayName || '(aucun)'}`);

// 2. Doc Firestore users/{uid}
const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
const user = ud.status === 404 ? {} : pf((await ud.json()).fields);
log(`\n▶ Firestore users/${uid}`);
log(`  firstName: ${user.firstName || '?'}`);
log(`  isPremium: ${user.isPremium ?? '?'}`);
log(`  hasPurchasedPlan: ${user.hasPurchasedPlan ?? '?'}`);
log(`  plansCount: ${user.plansCount ?? '?'}`);
log(`  emailVerified: ${user.emailVerified ?? '?'}`);
log(`  stravaConnected: ${user.stravaConnected ?? '?'}`);

// 3. Plans
const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
  { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
const plansRaw = (await pq.json()).filter(x=>x.document);
log(`\n▶ Plans Firestore : ${plansRaw.length}`);
if (!plansRaw.length) { log(`❌ Aucun plan trouvé pour ce user`); writeFileSync('audit-georgeslor1.txt', out.join('\n')); process.exit(0); }
const plans = plansRaw.map(x => ({ id:x.document.name.split('/').pop(), ...pf(x.document.fields) }));
plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
for (const p of plans) {
  log(`  - planId=${p.id} | createdAt=${(p.createdAt||'').substring(0,19)} | isPreview=${p.isPreview} | fullPlanGenerated=${p.fullPlanGenerated} | weeks=${(p.weeks||[]).length} | name="${p.name}"`);
}

const p = plans[0];
const ctx = p.generationContext || {};
const snap = ctx.questionnaireSnapshot || {};
const pp = ctx.periodizationPlan || {};

// 4. Identité plan
const vma = p.vma || ctx.vma;
const goal = p.goal || snap.goal;
const subGoal = p.subGoal || snap.subGoal;
const targetTime = p.targetTime || snap.targetTime;
const raceDate = p.raceDate || snap.raceDate;
const dur = p.durationWeeks;
const freq = p.sessionsPerWeek || snap.frequency;
const curVol = snap.currentWeeklyVolume ?? ctx.currentVolume ?? snap.currentVolume;
const curDplus = snap.currentWeeklyElevation;
const inj = snap.injuries || ctx.injuries;
const age = snap.age || ctx.age;
const w_ = snap.weight || ctx.weight; const h_ = snap.height || ctx.height;
const bmi = (w_&&h_) ? w_/((h_/100)**2) : null;
const level = p.level || snap.level;
const trailDist = snap.trailDetails?.distance || ctx.trailDistance;
const trailElev = snap.trailDetails?.elevation || 0;
const recent = snap.recentRaceTimes || {};

log(`\n${'█'.repeat(125)}`);
log(`  PLAN ANALYSÉ : ${p.id}  •  "${p.name}"`);
log('█'.repeat(125));
log(`  Objectif: ${goal} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}`);
log(`  Cible: ${targetTime||'Finisher'}  •  Race: ${raceDate||'(N/A)'}  •  Durée: ${dur} sem  •  Fréquence: ${freq} séances/sem`);
log(`  Profil: ${age} ans • IMC ${bmi?.toFixed?.(1)||'?'} • Niveau ${level} • VMA ${vma?.toFixed?.(2)} km/h (${p.vmaSource||'?'}) • Vol actuel: ${curVol||'?'} km/sem${curDplus?` / ${curDplus}m D+`:''}`);
log(`  Blessures: ${fmtInj(inj)}`);
if (Object.keys(recent).length) log(`  Chronos récents: ${Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • ')}`);

const paces = p.paces || {};
const wv = pp.weeklyVolumes || [];
const wp = pp.weeklyPhases || [];
const recoveryWeeks = pp.recoveryWeeks || [];
const weeks = p.weeks || [];

// ═══ 1. ALLURE COHÉRENCE ═══
log(`\n\n  ━━━━━━━━━━ 1. ALLURE COHÉRENCE ━━━━━━━━━━`);
log(`\n  Allures théoriques (paces[]) :`);
for(const [k,v] of Object.entries(paces)) log(`    ${k.padEnd(28)} ${v}/km`);

// VMA dérivée des paces vs déclarée
const vmaPaceSec = paceToSec(paces.vmaPace);
const vmaFromPaces = vmaPaceSec ? (3600/vmaPaceSec) : null;
log(`\n  VMA déclarée: ${vma?.toFixed?.(2)} km/h • VMA dérivée de vmaPace (${paces.vmaPace}): ${vmaFromPaces?.toFixed?.(2)} km/h`);
if (vma && vmaFromPaces) {
  const diffVMA = Math.abs(vma - vmaFromPaces);
  log(`    Écart: ${diffVMA.toFixed(2)} km/h ${diffVMA>0.5?'🔴 incohérent':'✅ cohérent'}`);
}

// Cohérence chrono cible
let chronoCheck = null;
if (targetTime && vma) {
  const sg = String(subGoal||'').toLowerCase();
  const g = String(goal||'').toLowerCase();
  let raceKm = null, lbl = '', paceKey = null;
  if (g.includes('marathon')&&!g.includes('semi')||sg.includes('marathon')&&!sg.includes('semi')) { raceKm=42.195; lbl='marathon'; paceKey='allureSpecifiqueMarathon'; }
  else if (g.includes('semi')||sg.includes('semi')) { raceKm=21.097; lbl='semi'; paceKey='allureSpecifiqueSemi'; }
  else if (sg.includes('10')||g.includes('10km')) { raceKm=10; lbl='10km'; paceKey='allureSpecifique10k'; }
  else if (sg.includes('5')||g.includes('5km')) { raceKm=5; lbl='5km'; paceKey='allureSpecifique5k'; }
  else if (trailDist) { raceKm=trailDist; lbl='trail'; }
  if (raceKm) {
    const chronoSec = timeToSeconds(targetTime, raceKm);
    const racePaceSec = chronoSec/raceKm;
    const racePaceKmh = 3600/racePaceSec;
    const pctVMA = racePaceKmh/vma;
    const expected = lbl==='marathon'?[0.78,0.86]:lbl==='semi'?[0.82,0.90]:lbl==='10km'?[0.86,0.94]:lbl==='5km'?[0.90,1.00]:[0.55,0.75];
    let verdict;
    if (pctVMA < expected[0]-0.05) verdict='🟢 trop facile';
    else if (pctVMA > expected[1]+0.10) verdict='❌ IRRÉALISTE/INATTEIGNABLE';
    else if (pctVMA > expected[1]+0.05) verdict='🔴 dangereux';
    else if (pctVMA > expected[1]) verdict='🟡 ambitieux';
    else verdict='✅ cohérent';
    chronoCheck = { lbl, raceKm, chronoSec, paceStr:secondsToPace(racePaceSec), pctVMA, verdict, expected, paceKey };
    log(`\n  Cohérence chrono cible:`);
    log(`    ${lbl} ${raceKm}km en ${targetTime} (${chronoSec}s) → ${chronoCheck.paceStr}/km = ${(pctVMA*100).toFixed(0)}% VMA`);
    log(`    Fourchette attendue : ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}% VMA  →  ${verdict}`);
    if (paceKey && paces[paceKey]) {
      const stockSec = paceToSec(paces[paceKey]);
      const cibleSec = racePaceSec;
      const diffStock = Math.round(stockSec - cibleSec);
      log(`    Pace cible théorique: ${chronoCheck.paceStr}/km • Pace stockée (${paceKey}): ${paces[paceKey]}/km • Δ ${diffStock>=0?'+':''}${diffStock}s/km ${Math.abs(diffStock)>15?'🔴 bug applyTargetTimeOverride asymétrique potentiel':'✅'}`);
    }
    // Détection chrono PR
    const chronoMap = { marathon:'distanceMarathon', semi:'distanceHalfMarathon', '10km':'distance10km', '5km':'distance5km' };
    const ck = chronoMap[lbl];
    if (ck && recent[ck]) {
      const prSec = timeToSeconds(recent[ck], raceKm);
      const delta = Math.round((prSec - chronoSec)/60);
      log(`    PB ${lbl} déclaré: ${recent[ck]} (${prSec}s) → cible ${delta>=0?'-':'+'}${Math.abs(delta)} min ${delta<-10?'🔴 cible plus lente que PB':delta>15?'🟡 cible très ambitieuse':'✅'}`);
    }
  }
}

// Allures séances semaine 1
const w1 = weeks[0] || { sessions: [] };
log(`\n  Cohérence allures séances S1 vs type:`);
const sess1 = w1.sessions || [];
const alluresCheck = [];
for (const s of sess1) {
  if (!s.targetPace) continue;
  const pace = String(s.targetPace).match(/(\d+:\d+)/)?.[1];
  if (!pace) continue;
  const type = (s.type||'').toLowerCase(); const intens = (s.intensity||'').toLowerCase(); const title=(s.title||'').toLowerCase();
  let expectedKey = null;
  if (type.includes('seuil')||intens.includes('seuil')||title.includes('seuil')) expectedKey='seuilPace';
  else if (type.includes('vma')||intens.includes('vma')||title.includes('vma')) expectedKey='vmaPace';
  else if (title.includes('spécifique')) {
    if ((goal||'').toLowerCase().includes('marathon')&&!goal.includes('semi')) expectedKey='allureSpecifiqueMarathon';
    else if ((goal||'').toLowerCase().includes('semi')||(subGoal||'').toLowerCase().includes('semi')) expectedKey='allureSpecifiqueSemi';
    else if ((subGoal||'').toLowerCase().includes('10')) expectedKey='allureSpecifique10k';
    else if ((subGoal||'').toLowerCase().includes('5')) expectedKey='allureSpecifique5k';
  }
  else if (type.includes('longue')||type.includes('jogging')||intens.includes('facile')||intens.includes('modéré')) expectedKey='efPace';
  else if (type.includes('récup')||type.includes('recup')||intens.includes('très facile')) expectedKey='recoveryPace';
  const expected = expectedKey ? paces[expectedKey] : null;
  const diff = expected ? secDiff(pace, expected) : null;
  const ok = diff===null ? true : diff<=20;
  alluresCheck.push({ day:s.day, type:s.type, title:s.title, intensity:s.intensity, pace, expectedKey, expected, diff, ok });
}
const okN = alluresCheck.filter(a=>a.ok).length;
log(`  ${okN}/${alluresCheck.length} séances avec pace conforme (tolérance ±20s/km)`);
for (const a of alluresCheck) {
  const status = a.expectedKey ? (a.ok?'✅':'🔴') : '⚪';
  const diffStr = a.diff!==null ? ` (Δ ${a.diff}s)` : '';
  log(`    ${status} ${(a.day||'?').padEnd(10)} ${(a.type||'?').padEnd(18)} pace=${a.pace}/km ${a.expectedKey?`vs ${a.expectedKey}=${a.expected}`:'(pas de référence)'}${diffStr} — "${a.title||''}"`);
}

// ═══ 2. DISTANCE / DURÉE SL ═══
log(`\n\n  ━━━━━━━━━━ 2. DISTANCE / DURÉE SORTIE LONGUE (SL) ━━━━━━━━━━`);
log(`\n  Détection SL semaine par semaine (champ 'type' contient 'longue') :`);
const slPerWeek = [];
let slPeakKm = 0, slPeakWeek = 0, slPeakMin = 0;
for (let i=0; i<weeks.length; i++) {
  const w = weeks[i];
  const sl = (w.sessions||[]).filter(s => /longue/i.test(s.type||'')||/longue/i.test(s.title||''));
  if (!sl.length) { slPerWeek.push({ week:i+1, km:0, min:0, dplus:0 }); continue; }
  const km = Math.max(0, ...sl.map(s => kmFrom(s.distance)));
  const dplus = Math.max(0, ...sl.map(s => s.elevationGain||0));
  const min = Math.max(0, ...sl.map(s => {
    if (s.duration) {
      const dm = String(s.duration).match(/(\d+)\s*h\s*(\d+)?/i); if (dm) return parseInt(dm[1])*60+(dm[2]?parseInt(dm[2]):0);
      const m = String(s.duration).match(/(\d+)\s*min/i); if (m) return parseInt(m[1]);
      const n = parseInt(s.duration); if (!isNaN(n)) return n;
    }
    return 0;
  }));
  slPerWeek.push({ week:i+1, km, min, dplus, sessions: sl });
  if (km > slPeakKm) { slPeakKm = km; slPeakWeek = i+1; slPeakMin = min; }
}

log(``);
log(`    Sem | km     | min   | D+    | progression vs sem précédente`);
log(`    ────┼────────┼───────┼───────┼──────────────────────────────`);
for (let i=0; i<slPerWeek.length; i++) {
  const s = slPerWeek[i];
  let prog = '   --';
  if (i>0 && slPerWeek[i-1].km>0 && s.km>0) {
    const pct = (s.km-slPerWeek[i-1].km)/slPerWeek[i-1].km*100;
    const flag = pct>15?' 🔴 saut>15%':pct<-30?' ↓DELOAD':'';
    prog = `${pct>=0?'+':''}${pct.toFixed(0)}%${flag}`;
  }
  const pic = i+1===slPeakWeek ? ' ★PIC' : '';
  log(`    S${String(i+1).padStart(2)} | ${String(s.km).padStart(5)}km | ${String(s.min).padStart(4)}min | ${String(s.dplus).padStart(4)}m  | ${prog}${pic}`);
}
log(`\n  SL pic: Sem ${slPeakWeek} = ${slPeakKm}km / ${slPeakMin}min`);
// Cohérence pic vs objectif
const goalLow = String(goal||'').toLowerCase(); const sgLow = String(subGoal||'').toLowerCase();
let slExpected = null;
if (goalLow.includes('marathon')&&!goalLow.includes('semi')||sgLow.includes('marathon')&&!sgLow.includes('semi')) slExpected = { kmRange:[28,35], minRange:[140,210], lbl:'marathon' };
else if (goalLow.includes('semi')||sgLow.includes('semi')) slExpected = { kmRange:[16,22], minRange:[90,150], lbl:'semi' };
else if (sgLow.includes('10')) slExpected = { kmRange:[12,18], minRange:[60,100], lbl:'10km' };
else if (sgLow.includes('5')) slExpected = { kmRange:[8,14], minRange:[45,80], lbl:'5km' };
else if (trailDist) slExpected = { kmRange:[Math.round(trailDist*0.6), Math.round(trailDist*0.85)], minRange:[120,300], lbl:`trail ${trailDist}km` };
if (slExpected) {
  const ok = slPeakKm >= slExpected.kmRange[0] && slPeakKm <= slExpected.kmRange[1];
  const okMin = slPeakMin >= slExpected.minRange[0] && slPeakMin <= slExpected.minRange[1];
  log(`  Attendu ${slExpected.lbl}: ${slExpected.kmRange[0]}-${slExpected.kmRange[1]}km / ${slExpected.minRange[0]}-${slExpected.minRange[1]}min  → km ${ok?'✅':'⚠️'}  / min ${okMin?'✅':'⚠️'}`);
}

// ═══ 3. VOLUME HEBDO ═══
log(`\n\n  ━━━━━━━━━━ 3. VOLUME HEBDO + VOLUME PIC ━━━━━━━━━━`);
// Volume réel par semaine (somme distances course)
const volPerWeek = [];
for (let i=0; i<weeks.length; i++) {
  const w = weeks[i];
  const km = (w.sessions||[]).reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0);
  volPerWeek.push(Math.round(km*10)/10);
}
const peakVol = Math.max(0, ...volPerWeek);
const peakVolWeek = volPerWeek.indexOf(peakVol)+1;
const lastVol = volPerWeek[volPerWeek.length-1]||0;
const taperPct = peakVol ? lastVol/peakVol*100 : 0;
const startJump = (curVol && volPerWeek[0]) ? (volPerWeek[0]/curVol-1)*100 : null;

log(`\n  Volume actuel user déclaré: ${curVol||'?'} km/sem`);
log(`  S1 plan: ${volPerWeek[0]} km`);
if (startJump !== null) {
  const sj = startJump > 30 ? '🔴 saut critique' : startJump > 15 ? '🟡 saut élevé' : '✅';
  log(`  Saut S1: ${startJump>=0?'+':''}${startJump.toFixed(0)}% (${curVol}→${volPerWeek[0]} km) ${sj}`);
  if (volPerWeek[0]-curVol > 15) log(`  ⚠️  +${(volPerWeek[0]-curVol).toFixed(0)} km absolus (seuil warning ≥+15 km)`);
}
log(`\n  Volume pic: Sem ${peakVolWeek} = ${peakVol} km`);
log(`  Affûtage final (dernière sem): ${lastVol} km = ${taperPct.toFixed(0)}% du pic ${taperPct<70?'✅':'⚠️ affûtage insuffisant'}`);

// Comparaison weeklyVolumes (planning théorique) vs réel
log(`\n  Comparaison weeklyVolumes (théorique pp) vs sommes réelles weeks[].sessions:`);
log(`    Sem | Phase           | théo | réel | Δ      | bar                              | Δ% réel`);
log(`    ────┼─────────────────┼──────┼──────┼────────┼──────────────────────────────────┼─────────`);
const maxV = Math.max(1, ...volPerWeek, ...wv);
for (let i=0; i<weeks.length; i++) {
  const teo = wv[i] ?? '?';
  const re = volPerWeek[i] ?? '?';
  const delta = (typeof teo==='number'&&typeof re==='number') ? (re-teo) : null;
  const bar = '█'.repeat(Math.round((re/maxV)*32))+'·'.repeat(32-Math.round((re/maxV)*32));
  const flag = recoveryWeeks.includes(i+1) ? ' ↓DELOAD' : (i+1===peakVolWeek?' ★PIC':'');
  let pct = '   --';
  if (i>0 && volPerWeek[i-1]>0) pct = `${((re-volPerWeek[i-1])/volPerWeek[i-1]*100).toFixed(0).padStart(4)}%`;
  log(`    S${String(i+1).padStart(2)} | ${String(wp[i]||'?').padEnd(15)} | ${String(teo).padStart(4)} | ${String(re).padStart(4)} | ${delta!==null?(delta>=0?'+':'')+delta.toFixed(1):'?'.padStart(6)} | ${bar} | ${pct}${flag}`);
}

// Progression maxi
const progDeltas = [];
for (let i=1; i<volPerWeek.length; i++) if (volPerWeek[i-1]>0) progDeltas.push({ i, from:volPerWeek[i-1], to:volPerWeek[i], pct:(volPerWeek[i]-volPerWeek[i-1])/volPerWeek[i-1]*100 });
const maxJump = progDeltas.reduce((m,d)=> d.pct>m.pct?d:m, {pct:-Infinity});
const maxDrop = progDeltas.reduce((m,d)=> d.pct<m.pct?d:m, {pct:Infinity});
log(`\n  📊 Max augmentation: ${maxJump.pct!==-Infinity?`S${maxJump.i}→S${maxJump.i+1} ${maxJump.from}→${maxJump.to}km = +${maxJump.pct.toFixed(0)}%`:'?'}  ${maxJump.pct>20?'🔴':maxJump.pct>15?'🟡':'✅'}`);
log(`  📉 Max décharge: ${maxDrop.pct!==Infinity?`S${maxDrop.i}→S${maxDrop.i+1} ${maxDrop.from}→${maxDrop.to}km = ${maxDrop.pct.toFixed(0)}%`:'?'}`);
log(`  🔄 Semaines de décharge déclarées (pp.recoveryWeeks): ${recoveryWeeks.join(', ')||'(aucune)'}`);

// ═══ 4. WELCOMEMESSAGE ═══
log(`\n\n  ━━━━━━━━━━ 4. WELCOMEMESSAGE — CONFORMITÉ DOCTRINE ━━━━━━━━━━`);
const wm = p.welcomeMessage || '';
log(`\n  Longueur: ${wm.length} caractères`);
log(`\n  ─── Texte intégral ───`);
log(wm || '(vide)');
log(`  ──────────────────────`);

const wmLow = wm.toLowerCase();
log(`\n  Doctrine — checks automatiques:`);
const forbidden = ['poids','imc','minceur','minceur','maigrir','minci','perdre des kilos','kilos en trop','corpulence','obésité','obese','régime'];
const found = forbidden.filter(t => wmLow.includes(t));
log(`    Mots interdits (corps message): ${found.length?'🔴 trouvés: '+found.join(', '):'✅ aucun'}`);
const planNameLow = (p.name||'').toLowerCase();
const planHasMinceur = ['poids','minceur','maigrir','perte'].some(t => planNameLow.includes(t));
log(`    Nom plan "${p.name}" : ${planHasMinceur?'⚠️ contient terme minceur (OK uniquement dans titre selon doctrine feedback_perte_de_poids_titre_ok)':'✅ neutre'}`);

// Allures EXACTES fournies par user (respect feedback_input_client_obligatoire)
if (targetTime) {
  const tInWm = wm.includes(targetTime) || wm.includes(String(targetTime).replace(/\s/g,''));
  log(`    targetTime user "${targetTime}" cité dans welcomeMessage: ${tInWm?'✅':'⚠️ pas cité textuellement'}`);
}
// Date course
if (raceDate) {
  const rd = wm.includes(raceDate) || wm.includes(String(raceDate).substring(0,10));
  log(`    raceDate "${raceDate}" cité: ${rd?'✅':'⚠️ pas cité'}`);
}
// Sécurité / transparence
const safetyTerms = ['progressi','prudent','sécurit','écoute','récup','adapt','respect'];
const safetyMentions = safetyTerms.filter(t => wmLow.includes(t));
log(`    Mentions sécurité/écoute: ${safetyMentions.length} (${safetyMentions.join(', ')})`);
const commercialTerms = ['super','génial','formidable','exceptionnel','incroyable','garanti','garantie'];
const commercial = commercialTerms.filter(t => wmLow.includes(t));
log(`    Mots commerciaux/embellissants: ${commercial.length?'⚠️ '+commercial.join(', '):'✅ aucun'}`);

// ═══ 5. FAISABILITÉ R2 ═══
log(`\n\n  ━━━━━━━━━━ 5. FAISABILITÉ R2 ━━━━━━━━━━`);
const feas = p.feasibility || {};
const fStatus = feas.status || '?';
const fScore = feas.score ?? p.confidenceScore ?? '?';
const fMsg = feas.message || '';
const sw = feas.safetyWarning || '';
log(`\n  feasibility.status: ${fStatus}`);
log(`  feasibility.score / confidenceScore: ${fScore} / ${p.confidenceScore ?? '?'}`);
log(`  feasibility.message:`);
log(`    "${fMsg}"`);
log(`  feasibility.safetyWarning:`);
log(`    "${sw}"`);
if (feas.warnings) {
  log(`  feasibility.warnings:`);
  for (const w of (Array.isArray(feas.warnings)?feas.warnings:[feas.warnings])) log(`    - ${typeof w==='string'?w:JSON.stringify(w)}`);
}
if (feas.gates || feas.r2Gates) {
  log(`  feasibility.gates / r2Gates:`);
  log(`    ${JSON.stringify(feas.gates || feas.r2Gates, null, 2)}`);
}

// Détection gates implicites
log(`\n  Détection gates implicites:`);
// Saut volume
if (startJump !== null && startJump > 30) log(`    🔴 Gate "saut S1 >30%": déclenchée (${startJump.toFixed(0)}%)`);
else if (startJump !== null && startJump > 15) log(`    🟡 Gate "saut S1 >15%": frontière (${startJump.toFixed(0)}%)`);
else log(`    ✅ Gate "saut S1": non déclenchée`);
// Expert sans chrono
if (level && String(level).toLowerCase().includes('expert')) {
  const hasAnyChrono = Object.keys(recent).length > 0;
  log(`    ${hasAnyChrono?'✅':'🔴'} Gate "Expert sans chrono": ${hasAnyChrono?`OK (${Object.keys(recent).length} chrono(s))`:'DÉCLENCHÉE'}`);
}
// Chrono cible vs %VMA
if (chronoCheck) {
  const verdict = chronoCheck.verdict;
  if (verdict.includes('IRRÉALISTE')||verdict.includes('dangereux')) log(`    🔴 Gate "chrono cible >fourchette physiologique": déclenchée → ${verdict}`);
  else if (verdict.includes('ambitieux')) log(`    🟡 Gate "chrono cible ambitieux": frontière`);
  else log(`    ✅ Gate "chrono cible": cohérent`);
}
// Ratio D+ trail
if (trailDist && trailElev && slPeakKm > 0) {
  // Estimation D+ pic SL (max sur weeks)
  const slMaxDplus = Math.max(0, ...slPerWeek.map(s=>s.dplus||0));
  const ratio = trailElev>0 ? slMaxDplus/trailElev : 0;
  log(`    Trail: D+ SL pic ${slMaxDplus}m vs course ${trailElev}m → ratio ${(ratio*100).toFixed(0)}% ${ratio<0.5?'🟡 SL pic <50% D+ course':'✅'}`);
}

// Cohérence calibrage feasibility
log(`\n  Vérification calibrage:`);
const expectedStatus = chronoCheck && chronoCheck.verdict.includes('cohérent') && startJump < 30 ? 'BON'
  : chronoCheck && (chronoCheck.verdict.includes('ambitieux')||chronoCheck.verdict.includes('IRRÉALISTE')) ? 'AMBITIEUX/IRRÉALISTE attendu'
  : 'à analyser';
log(`    Statut attendu (estimation): ${expectedStatus}`);
log(`    Statut affiché: ${fStatus}`);

// ═══ SYNTHÈSE ═══
log(`\n\n  ━━━━━━━━━━ SYNTHÈSE GLOBALE ━━━━━━━━━━`);
const positifs = [];
const attention = [];
const critiques = [];

if (okN === alluresCheck.length && alluresCheck.length>0) positifs.push(`Allures S1 toutes conformes (${okN}/${alluresCheck.length})`);
else if (okN < alluresCheck.length) critiques.push(`Allures S1 incohérentes (${okN}/${alluresCheck.length})`);

if (startJump !== null && Math.abs(startJump) > 30) critiques.push(`Saut volume S1 ${startJump.toFixed(0)}% (>30%)`);
else if (startJump !== null && Math.abs(startJump) > 15) attention.push(`Saut volume S1 ${startJump.toFixed(0)}% (15-30%)`);
else if (startJump !== null) positifs.push(`Saut volume S1 ${startJump.toFixed(0)}% (<15%)`);

if (chronoCheck) {
  if (chronoCheck.verdict.includes('IRRÉALISTE')) critiques.push(`Chrono cible IRRÉALISTE (${(chronoCheck.pctVMA*100).toFixed(0)}% VMA)`);
  else if (chronoCheck.verdict.includes('ambitieux')) attention.push(`Chrono cible ambitieux (${(chronoCheck.pctVMA*100).toFixed(0)}% VMA)`);
  else if (chronoCheck.verdict.includes('cohérent')) positifs.push(`Chrono cible cohérent (${(chronoCheck.pctVMA*100).toFixed(0)}% VMA)`);
}

if (maxJump.pct > 25) critiques.push(`Saut hebdo max +${maxJump.pct.toFixed(0)}% (S${maxJump.i}→${maxJump.i+1})`);
else if (maxJump.pct > 15) attention.push(`Saut hebdo max +${maxJump.pct.toFixed(0)}%`);

if (taperPct > 80) attention.push(`Affûtage insuffisant (${taperPct.toFixed(0)}% du pic)`);
else if (taperPct < 70 && taperPct > 0) positifs.push(`Affûtage cohérent (${taperPct.toFixed(0)}% du pic)`);

if (found.length) critiques.push(`Welcome contient mots interdits: ${found.join(', ')}`);
else positifs.push(`Welcome doctrine OK (pas de poids/IMC)`);

if (commercial.length>0) attention.push(`Welcome embellissant: ${commercial.join(', ')}`);

log(`\n  ✅ Points positifs (${positifs.length}):`);
for (const p of positifs) log(`     + ${p}`);
log(`\n  ⚠️  Points d'attention (${attention.length}):`);
for (const p of attention) log(`     ~ ${p}`);
log(`\n  ❌ Points critiques (${critiques.length}):`);
for (const p of critiques) log(`     ! ${p}`);

const action = critiques.length>0 ? '🔴 Patch ou régénération à envisager (revue Romane requise)'
  : attention.length>0 ? '🟡 Surveillance + ajustements éventuels'
  : '✅ Pas d\'intervention nécessaire';
log(`\n  Recommandation action: ${action}`);

// ═══ JSON brut ═══
log(`\n\n  ━━━━━━━━━━ DONNÉES BRUTES (extraits) ━━━━━━━━━━`);
log(`\n  questionnaireSnapshot (extrait):`);
log(JSON.stringify({
  age, weight: w_, height: h_, bmi: bmi?.toFixed?.(2), level, goal, subGoal, targetTime, raceDate,
  frequency: freq, currentWeeklyVolume: curVol, currentWeeklyElevation: curDplus,
  injuries: inj, trailDetails: snap.trailDetails, recentRaceTimes: recent,
  vmaInput: snap.vma, vmaSource: p.vmaSource
}, null, 2));

log(`\n  paces:`);
log(JSON.stringify(paces, null, 2));

log(`\n  periodizationPlan (extrait):`);
log(JSON.stringify({ weeklyVolumes: wv, weeklyPhases: wp, recoveryWeeks }, null, 2));

log(`\n  feasibility:`);
log(JSON.stringify(feas, null, 2));

// Sauvegarde
writeFileSync('audit-georgeslor1.txt', out.join('\n'));
writeFileSync('audit-georgeslor1.json', JSON.stringify({
  email: EMAIL, uid, planId: p.id, planName: p.name, createdAt: p.createdAt,
  goal, subGoal, targetTime, raceDate, dur, freq, level, vma, curVol,
  paces, weeklyVolumes: wv, recoveryWeeks,
  slPerWeek, volPerWeek, peakVol, peakVolWeek, slPeakKm, slPeakWeek, slPeakMin,
  alluresCheck, chronoCheck, startJump, maxJump, maxDrop, taperPct,
  welcomeMessage: wm, feasibility: feas,
  synth: { positifs, attention, critiques, action }
}, null, 2));
console.log('\n📝 audit-georgeslor1.txt & audit-georgeslor1.json générés');
