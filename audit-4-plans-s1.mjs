/**
 * AUDIT 4 PLANS S1 ENRICHI (18/05/2026)
 *  - 3 inscrits du 18/05 : antoineg.gde@outlook.fr, nabou57@hotmail.fr, arenaarmando@hotmail.???
 *  - 1 ajouté par Romane : sebastien.sailly@outlook.fr
 *
 * 5 dimensions par client :
 *   1. ALLURE COHÉRENCE vs OBJECTIF  (VMA, paces, cible course, PB recents, bug 2h60min)
 *   2. PIC VOLUME — TOUTES LES SEMAINES (tableau complet, sauts, decloads, taper)
 *   3. SL S1 — distance + durée + D+ + ratio
 *   4. SCORE FAISABILITÉ + MESSAGE INTÉGRAL (+ safetyWarning + détection bugs)
 *   5. WELCOMEMESSAGE doctrine
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
  if(v.nullValue!==undefined) return null;
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
const secDiff = (p1, p2) => { const a=paceToSec(p1), b=paceToSec(p2); return (a&&b)?Math.abs(a-b):null; };
const fmtSec = (s)=> { if(!s||isNaN(s)) return '?'; const m=Math.floor(s/60), x=Math.round(s%60); return `${m}:${String(x).padStart(2,'0')}`; };

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
    await new Promise(r => setTimeout(r, 120));
  }
  return results;
}

const out = [];
const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };

log('═'.repeat(130));
log(`  AUDIT 4 PLANS S1 ENRICHI — ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(130));

// ─── Résolution Armando ───
log('\n▶ Résolution email Armando (arenaarmando@hotmail.???)');
const armandoVariants = await lookupEmailVariants('arenaarmando@hotmail', ['com', 'fr', 'es', 'it', 'co.uk', 'de']);
for(const v of armandoVariants){
  log(`  ✓ TROUVÉ : ${v.email} (uid=${v.user.localId})`);
}
const armandoEmail = armandoVariants[0]?.email || 'arenaarmando@hotmail.com';

const CLIENTS = [
  { tag: 'Client 1', email: 'antoineg.gde@outlook.fr', prenomAttendu: '(antoineg)', date_inscription: '18/05/2026' },
  { tag: 'Client 2', email: 'nabou57@hotmail.fr', prenomAttendu: 'Annabelle', date_inscription: '18/05/2026' },
  { tag: 'Client 3', email: armandoEmail, prenomAttendu: 'Armando', date_inscription: '18/05/2026' },
  { tag: 'Client 4', email: 'sebastien.sailly@outlook.fr', prenomAttendu: 'Sébastien (ajouté par Romane)', date_inscription: '?' },
];

const synthClients = [];
const dumps = {};

for(const c of CLIENTS){
  log('\n\n' + '█'.repeat(130));
  log(`📧 ${c.tag} — ${c.email}  (prénom attendu : ${c.prenomAttendu})`);
  log('█'.repeat(130));

  const u = await findUserByEmail(c.email);
  if(!u){ log(`  ❌ Pas de compte Firebase Auth pour ${c.email}`); continue; }
  const uid = u.localId;
  const createdISO = u.createdAt ? new Date(parseInt(u.createdAt)).toISOString() : '?';
  const lastLoginISO = u.lastLoginAt ? new Date(parseInt(u.lastLoginAt)).toISOString() : '?';
  log(`  UID: ${uid}`);
  log(`  Auth créé: ${createdISO}  •  Dernier login: ${lastLoginISO}  •  emailVerified: ${u.emailVerified?'oui':'non'}`);

  // User doc
  const ud = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
  const userJson = await ud.json();
  const user = ud.status===404?{}:pf(userJson.fields);

  // Plans
  const pq = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, { method:'POST', headers:H, body:JSON.stringify({ structuredQuery:{ from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const plans = (await pq.json()).filter(x=>x.document).map(x=>({ id: x.document.name.split('/').pop(), ...pf(x.document.fields) }));
  if(!plans.length){ log(`  ❌ Aucun plan`); continue; }
  // Tri desc par createdAt
  plans.sort((a,b)=> String(b.createdAt||'').localeCompare(String(a.createdAt||'')));

  log(`  Total plans: ${plans.length}`);
  for(const pp of plans){
    log(`    - id=${pp.id} • createdAt=${pp.createdAt||'?'} • full=${pp.fullPlanGenerated} • preview=${pp.isPreview} • name="${pp.name||'?'}"`);
  }

  // Sélection : full le plus récent, sinon preview le plus récent
  const fullPlans = plans.filter(p => p.fullPlanGenerated === true);
  const p = fullPlans[0] || plans[0];
  log(`  Plan analysé: ${p.id}`);

  const ctx = p.generationContext||{};
  const snap = ctx.questionnaireSnapshot||{};
  const pp = ctx.periodizationPlan||{};

  const vma = p.vma||ctx.vma;
  const vmaSource = p.vmaSource || ctx.vmaSource || snap.vmaSource;
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
  const sex = snap.sex || snap.gender || ctx.sex || ctx.gender;
  const w_ = snap.weight||ctx.weight; const h_ = snap.height||ctx.height;
  const bmi = (w_&&h_)?w_/((h_/100)**2):null;
  const level = p.level||snap.level;
  const trailDist = snap.trailDetails?.distance||ctx.trailDistance;
  const trailElev = snap.trailDetails?.elevation||0;
  const recent = snap.recentRaceTimes || ctx.recentRaceTimes || {};

  const paces = p.paces||{};
  const wv = pp.weeklyVolumes||[];
  const wp = pp.weeklyPhases||[];
  const recoveryWeeks = pp.recoveryWeeks||[];

  // ─── TABLEAU IDENTITÉ ───
  log(`\n  ━━━ IDENTITÉ ━━━`);
  log(`    | Champ              | Valeur |`);
  log(`    |--------------------|--------|`);
  log(`    | Email              | ${c.email} |`);
  log(`    | UID                | ${uid} |`);
  log(`    | Plan ID            | ${p.id} |`);
  log(`    | Plan name          | ${p.name||'?'} |`);
  log(`    | Date inscription   | ${createdISO} (attendu: ${c.date_inscription}) |`);
  log(`    | Génération plan    | ${p.createdAt||'?'} |`);
  log(`    | Dernière connexion | ${lastLoginISO} |`);
  log(`    | isPremium          | ${user.isPremium ?? p.isPremium ?? '?'} |`);
  log(`    | isPreview          | ${p.isPreview ?? '?'} |`);
  log(`    | fullPlanGenerated  | ${p.fullPlanGenerated ?? '?'} |`);
  log(`    | Sexe               | ${sex||'?'} |`);
  log(`    | Âge                | ${age||'?'} |`);
  log(`    | Poids              | ${w_||'?'} kg |`);
  log(`    | Taille             | ${h_||'?'} cm |`);
  log(`    | BMI                | ${bmi?bmi.toFixed(1):'?'} |`);
  log(`    | Niveau             | ${level||'?'} |`);
  log(`    | Goal               | ${goal||'?'} |`);
  log(`    | SubGoal            | ${subGoal||'?'} |`);
  log(`    | TargetTime         | ${targetTime||'Finisher'} |`);
  log(`    | RaceDate           | ${raceDate||'?'} |`);
  log(`    | Frequency          | ${freq||'?'} séances/sem |`);
  log(`    | CurrentWeeklyVol   | ${curVol||'?'} km/sem |`);
  log(`    | Injuries           | ${fmtInj(inj)} |`);
  log(`    | RecentRaceTimes    | ${Object.keys(recent).length? Object.entries(recent).map(([k,v])=>`${k}=${v}`).join(' • '):'(aucun)'} |`);
  if(trailDist) log(`    | Trail              | ${trailDist}km / ${trailElev}m D+ |`);

  // ─── 1. ALLURES ───
  log(`\n  ━━━ 1. ALLURE COHÉRENCE vs OBJECTIF ━━━`);
  log(`    VMA estimée : ${vma?vma.toFixed(2):'?'} km/h  •  source: ${vmaSource||'?'}`);
  log(`\n    Toutes les paces stockées :`);
  log(`    | Pace                      | Valeur     |`);
  log(`    |---------------------------|------------|`);
  const paceKeys = ['efPace','eaPace','seuilPace','vmaPace','recoveryPace','allureSpecifique5k','allureSpecifique10k','allureSpecifiqueSemi','allureSpecifiqueMarathon','allureSpecifiqueTrail'];
  for(const k of paceKeys) log(`    | ${k.padEnd(25)} | ${(paces[k]||'(n/a)').padEnd(10)} |`);
  // Autres paces non listées
  for(const [k,v] of Object.entries(paces)){
    if(!paceKeys.includes(k)) log(`    | ${k.padEnd(25)} | ${String(v).padEnd(10)} |`);
  }

  // Cohérence chrono
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
      const verdict = pctVMA < expected[0]-0.05 ? '🟢 trop facile' : pctVMA > expected[1]+0.05 ? '❌ INATTEIGNABLE' : pctVMA > expected[1] ? '⚠️ AMBITIEUX' : '✅ COHÉRENT';
      chronoCheck = { lbl, raceKm, paceStr:fmtSec(racePaceSec)+'/km', pctVMA, verdict, expected };
      log(`\n    Cohérence allure cible course :`);
      log(`      ${lbl} ${raceKm}km en ${targetTime} → ${chronoCheck.paceStr} = ${(pctVMA*100).toFixed(1)}%VMA`);
      log(`      Attendu : ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}%VMA  →  ${verdict}`);

      // Comparaison PB
      if(Object.keys(recent).length){
        log(`\n    Comparaison vs PB déclarés :`);
        for(const [k,v] of Object.entries(recent)){
          log(`      PB ${k} = ${v}`);
        }
      }
    }
  } else {
    log(`\n    Cohérence chrono cible : Finisher ou pas de cible chrono → non applicable`);
  }

  // ─── 2. PIC VOLUME — TOUTES LES SEMAINES ───
  log(`\n  ━━━ 2. PIC VOLUME (toutes les semaines) ━━━`);
  const peakKm = Math.max(0, ...wv);
  const peakWeek = wv.indexOf(peakKm)+1;
  const lastKm = wv[wv.length-1]||0;
  const taperPct = peakKm?(lastKm/peakKm*100):0;
  const deltas = [];
  for(let i=1;i<wv.length;i++) if(wv[i-1]>0) deltas.push({ i, from:wv[i-1], to:wv[i], pct:(wv[i]-wv[i-1])/wv[i-1]*100, abs: wv[i]-wv[i-1] });
  const maxJump = deltas.reduce((m,d)=>d.pct>m.pct?d:m, {pct:-Infinity});
  const maxDrop = deltas.reduce((m,d)=>d.pct<m.pct?d:m, {pct:Infinity});
  const startJump = (curVol && wv[0]) ? (wv[0]/curVol-1)*100 : null;

  if(!wv.length){
    log(`    ⚠ Pas de weeklyVolumes projeté dans periodizationPlan`);
  } else {
    const totalKm = wv.reduce((s,v)=>s+v,0);
    log(`    Total: ${totalKm} km  •  Moy: ${(totalKm/wv.length).toFixed(1)} km/sem`);
    log(`    Pic identifié : S${peakWeek} = ${peakKm} km/sem`);
    log(`    Affûtage final : S${wv.length} = ${lastKm} km (${taperPct.toFixed(0)}% du pic)`);
    if(wv.length >= 2){
      const avant = wv[wv.length-2];
      log(`    Avant-dernière sem : S${wv.length-1} = ${avant} km (${peakKm?((avant/peakKm)*100).toFixed(0):'?'}% du pic)`);
    }
    if(startJump !== null){
      const sj = startJump > 30 ? '❌' : startJump > 10 ? '⚠️' : '✅';
      log(`    Saut depuis vol actuel : ${curVol}km/sem → S1=${wv[0]}km = ${startJump>=0?'+':''}${startJump.toFixed(0)}%  ${sj}`);
    }
    const maxV = Math.max(...wv, 1);
    log(``);
    log(`    Sem | Phase           | km   | bar                                          | Δkm   | Δ%      | Flag`);
    log(`    ────┼─────────────────┼──────┼──────────────────────────────────────────────┼───────┼─────────┼──────────`);
    wv.forEach((v,i)=>{
      const bar = '█'.repeat(Math.round((v/maxV)*40))+'·'.repeat(40-Math.round((v/maxV)*40));
      let flag = '';
      if(recoveryWeeks.includes(i+1)) flag = '↓DELOAD';
      if(i+1===peakWeek) flag = '★PIC';
      const d = i>0 ? `${((v-wv[i-1])/wv[i-1]*100).toFixed(0).padStart(5)}%` : '   --';
      const dkm = i>0 ? `${(v-wv[i-1]>=0?'+':'')+ (v-wv[i-1])}km` : '   --';
      log(`    S${String(i+1).padStart(2)} | ${(wp[i]||'?').padEnd(15)} | ${String(v).padStart(4)} | ${bar} | ${dkm.padStart(5)} | ${d} | ${flag}`);
    });
    log(``);
    log(`    📊 Max augmentation : S${maxJump.i}→S${maxJump.i+1} ${maxJump.from}→${maxJump.to}km = ${maxJump.pct>=0?'+':''}${maxJump.pct.toFixed(0)}% (+${maxJump.abs}km)  ${maxJump.pct>20?'❌':maxJump.pct>15?'⚠️':'✅'}`);
    log(`    📉 Max décharge : S${maxDrop.i}→S${maxDrop.i+1} ${maxDrop.from}→${maxDrop.to}km = ${maxDrop.pct.toFixed(0)}% (${maxDrop.abs}km)`);
    log(`    🔄 Semaines de décharge projetées : ${recoveryWeeks.join(', ')||'(aucune)'}`);
    // Détail des semaines de décharge
    if(recoveryWeeks.length){
      for(const rwIdx of recoveryWeeks){
        const v = wv[rwIdx-1];
        const prev = wv[rwIdx-2];
        const delta = prev ? ((v-prev)/prev*100) : 0;
        log(`      • S${rwIdx} = ${v} km (Δ ${delta>=0?'+':''}${delta.toFixed(0)}% vs S${rwIdx-1}=${prev||'?'}km)`);
      }
    }
  }

  // ─── 3. SL S1 ───
  log(`\n  ━━━ 3. SL S1 ━━━`);
  const w1 = (p.weeks||[])[0]||{sessions:[]};
  const sess = w1.sessions||[];
  log(`    Séances S1 (${sess.length}) :`);
  for(const s of sess){
    log(`      • ${(s.day||'?').padEnd(10)} ${(s.type||'?').padEnd(18)} ${s.distance?s.distance+' '.padEnd(10):'-'.padEnd(10)} ${s.duration||'?'} pace=${s.targetPace||'-'} D+${s.elevationGain||0}m "${s.title||''}"`);
  }
  const sl = sess.filter(s => /longue|sortie longue|long run/i.test(s.type||'') || /longue|sortie longue|long run/i.test(s.title||''));
  const distKmS1 = sess.reduce((s,x)=> /renfo|mobilit|cross/i.test(x.type||'') ? s : s+kmFrom(x.distance), 0);
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));
  const slDuree = sl.length ? sl[0].duration : '?';
  log(`\n    Total km course S1 : ${distKmS1.toFixed(1)} km`);
  log(`    SL S1 distance : ${slDistMax} km${slElevMax?` / ${slElevMax}m D+`:''}  •  durée : ${slDuree}`);
  if(slDistMax && wv[0]) {
    const ratio = slDistMax/wv[0]*100;
    const flag = ratio>40?'❌':ratio>35?'⚠️':ratio<20?'⚠️ (trop court)':'✅';
    log(`    Ratio SL/Volume hebdo S1 : ${ratio.toFixed(0)}% ${flag} (cible 25-35%)`);
  }
  if(slDistMax && curVol){
    const ratio = slDistMax/curVol*100;
    const flag = ratio>50?'❌':ratio>40?'⚠️':'✅';
    log(`    Ratio SL/Volume actuel user : ${ratio.toFixed(0)}% ${flag}`);
  }
  if(trailDist && slElevMax){
    log(`    D+ SL S1 / D+ course (${trailElev}m) : ${(slElevMax/trailElev*100).toFixed(0)}%`);
  }

  // ─── 4. FAISABILITÉ ───
  log(`\n  ━━━ 4. SCORE FAISABILITÉ + MESSAGE ━━━`);
  const feas = p.feasibility||{};
  const fStatus = feas.status || '?';
  log(`    feasibility.status : ${fStatus}`);
  log(`    feasibility.score : ${feas.score ?? '?'}`);
  log(`    confidenceScore : ${p.confidenceScore ?? '?'}`);
  if(feas.gates) log(`    gates : ${JSON.stringify(feas.gates)}`);
  if(feas.reasons) log(`    reasons : ${JSON.stringify(feas.reasons)}`);
  if(feas.flags) log(`    flags : ${JSON.stringify(feas.flags)}`);
  if(feas.warnings) log(`    warnings : ${JSON.stringify(feas.warnings)}`);
  const fkeys = Object.keys(feas);
  log(`    Tous les champs feasibility : [${fkeys.join(', ')}]`);

  const fmsg = feas.message || '';
  const sw = feas.safetyWarning || p.safetyWarning || '';
  if(fmsg){
    log(`\n    📨 feasibility.message (${fmsg.length} chars) :`);
    log(`    ${'─'.repeat(124)}`);
    fmsg.split('\n').forEach(l => log(`    │ ${l}`));
    log(`    ${'─'.repeat(124)}`);
    // Bug "2h60min" detection
    const bug2h60 = /\d+h\s*60(\s*min)?/i.test(fmsg);
    log(`    🔍 Bug formatTime "XhYY" Y>=60 : ${bug2h60?'❌ DÉTECTÉ':'✅ OK'}`);
  } else {
    log(`\n    📨 feasibility.message : (vide)`);
  }
  if(sw){
    log(`\n    ⚠️ safetyWarning :`);
    log(`    ${'─'.repeat(124)}`);
    sw.split('\n').forEach(l => log(`    │ ${l}`));
    log(`    ${'─'.repeat(124)}`);
  } else {
    log(`\n    ⚠️ safetyWarning : (vide)`);
  }

  // ─── 5. WELCOMEMESSAGE ───
  log(`\n  ━━━ 5. WELCOMEMESSAGE ━━━`);
  const wm = p.welcomeMessage || '';
  log(`    welcomeMessage (${wm.length} chars) :`);
  log(`    ${'─'.repeat(124)}`);
  wm.split('\n').forEach(l => log(`    │ ${l}`));
  log(`    ${'─'.repeat(124)}`);
  log(`\n    🔍 Doctrine checks :`);
  const lowerWm = wm.toLowerCase();
  const forbiddenWords = ['poids', 'imc', 'minceur', 'silhouette', 'kg perdu', 'kilos', 'maigrir', 'amincir', 'corpulence'];
  const found = forbiddenWords.filter(w => lowerWm.includes(w));
  log(`      Mots interdits dans corps : ${found.length?`❌ TROUVÉ : ${found.join(', ')}`:'✅ aucun'}`);
  log(`      Titre du plan : "${p.name||'?'}"`);
  if(p.name && /poids|minceur/i.test(p.name)) log(`      → Mention "poids" dans titre = ✅ autorisé (doctrine)`);
  // Bug 2h60min dans WM
  const bug2h60wm = /\d+h\s*60(\s*min)?/i.test(wm);
  log(`      Bug formatTime "XhYY" Y>=60 : ${bug2h60wm?'❌ DÉTECTÉ':'✅ OK'}`);
  // Mention médecin/cardio
  const mentMedecin = /m[ée]decin|cardio|certificat/i.test(wm);
  if(age >= 50 || bmi > 30){
    log(`      Profil sensible (age=${age}, bmi=${bmi?bmi.toFixed(1):'?'}) → mention médecin/cardio : ${mentMedecin?'✅ présente':'⚠️ ABSENTE'}`);
  } else {
    log(`      Profil non sensible → mention médecin/cardio : ${mentMedecin?'présente':'non requise'}`);
  }
  // Allures dans message
  const pacesInMessage = [];
  for(const [k,v] of Object.entries(paces)){
    if(v && wm.includes(v)) pacesInMessage.push(`${k}=${v}`);
  }
  log(`      Allures mentionnées : ${pacesInMessage.length?pacesInMessage.join(', '):'(aucune)'}`);

  // ─── DUMP JSON ───
  dumps[c.tag] = {
    email: c.email, uid, firstName: user.firstName||u.displayName,
    auth: { createdAt: createdISO, lastLogin: lastLoginISO },
    plan: { id: p.id, name: p.name, createdAt: p.createdAt, durationWeeks: p.durationWeeks, sessionsPerWeek: p.sessionsPerWeek, fullPlanGenerated: p.fullPlanGenerated, isPreview: p.isPreview, isPremium: p.isPremium },
    inputs: { goal, subGoal, targetTime, raceDate, freq, vma, vmaSource, level, curVol, curDplus, inj, age, sex, weight: w_, height: h_, bmi, trailDist, trailElev, recent },
    paces,
    weeklyVolumes: wv, weeklyPhases: wp, recoveryWeeks,
    s1: { sessions: sess.map(s => ({ day:s.day, type:s.type, title:s.title, distance:s.distance, duration:s.duration, intensity:s.intensity, targetPace:s.targetPace, elevationGain:s.elevationGain })) },
    feasibility: feas, confidenceScore: p.confidenceScore,
    welcomeMessage: wm, safetyWarning: sw
  };

  synthClients.push({
    tag: c.tag, email: c.email, firstName: user.firstName||u.displayName,
    goal: `${goal||''} ${subGoal||''}`.trim(), target: targetTime||'Finisher',
    vma: vma?.toFixed?.(1), level, dur, freq,
    curVol: curVol||'?',
    startJump: startJump!==null?`${startJump>=0?'+':''}${startJump.toFixed(0)}%`:'?',
    peakKm: peakKm||'?', peakWeek: peakKm?peakWeek:'?',
    maxJump: maxJump.pct!==-Infinity?`+${maxJump.pct.toFixed(0)}%`:'?',
    taperPct: peakKm?`${taperPct.toFixed(0)}%`:'?',
    slS1Max: slDistMax||'?',
    chronoVerdict: chronoCheck?chronoCheck.verdict:'(finisher)',
    fStatus,
    fScore: feas.score ?? '?',
    wmLen: wm.length,
    forbiddenWordsCount: found?.length || 0,
    bug2h60: /\d+h\s*60(\s*min)?/i.test(fmsg+'\n'+wm)
  });
}

// ─── TABLEAU SYNTHÈSE ───
log('\n\n' + '═'.repeat(130));
log(`  📋 TABLEAU SYNTHÈSE — 4 CLIENTS`);
log('═'.repeat(130));
log(`  ${'Prénom'.padEnd(12)} ${'Goal'.padEnd(22)} ${'Cible'.padEnd(10)} ${'Niv.'.padEnd(8)} ${'VMA'.padEnd(5)} ${'Vol'.padEnd(5)} ${'Jump'.padEnd(7)} ${'Pic'.padEnd(10)} ${'MaxΔ'.padEnd(10)} ${'Affût'.padEnd(7)} ${'SL'.padEnd(6)} ${'Chrono'.padEnd(20)} Fiab/Score Bug2h60`);
log(`  ${'─'.repeat(128)}`);
for(const r of synthClients){
  log(`  ${(r.firstName||'?').substring(0,12).padEnd(12)} ${(r.goal).substring(0,22).padEnd(22)} ${String(r.target).substring(0,10).padEnd(10)} ${String(r.level||'?').substring(0,8).padEnd(8)} ${String(r.vma).padEnd(5)} ${String(r.curVol).padEnd(5)} ${String(r.startJump).padEnd(7)} ${(`${r.peakKm}/S${r.peakWeek}`).padEnd(10)} ${String(r.maxJump).padEnd(10)} ${String(r.taperPct).padEnd(7)} ${(r.slS1Max+'km').padEnd(6)} ${r.chronoVerdict.substring(0,20).padEnd(20)} ${r.fStatus}/${r.fScore} ${r.bug2h60?'❌':'✅'}`);
}

writeFileSync('audit-4-plans-s1.txt', out.join('\n'));
writeFileSync('audit-4-plans-s1.json', JSON.stringify(dumps, null, 2));
console.log('\n📝 audit-4-plans-s1.txt');
console.log('📝 audit-4-plans-s1.json');
