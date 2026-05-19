// V2 — focus sur distance/allure/SL/fiabilité visibles dans le PREVIEW (S1)
// + extraction propre paces[], feasibility.score, welcomeMessage, confidenceScore
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
  if(Array.isArray(inj)) return inj.map(x => typeof x==='string'?x:(x?.name||x?.zone||JSON.stringify(x))).join(', ') || 'aucune';
  if(typeof inj === 'object') return Object.entries(inj).map(([k,v])=>v?`${k}=${typeof v==='object'?JSON.stringify(v):v}`:null).filter(Boolean).join(', ') || 'aucune';
  return String(inj);
};
const kmFrom = (d)=>{ if(!d) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };

const out=[]; const log=(...a)=>{ const s=a.join(' '); console.log(s); out.push(s); };

log('═'.repeat(120));
log(`  AUDIT V2 — RÉCAP DISTANCE / ALLURE / SL / FIABILITÉ  •  ${new Date().toLocaleString('fr-FR')}`);
log('═'.repeat(120));

const rows = [];

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
  const q = ctx.questionnaireData||ctx;
  const snap = ctx.questionnaireSnapshot||{};

  // Inputs user
  const vma = p.vma || ctx.vma;
  const goal = p.goal || ctx.goal;
  const subGoal = p.subGoal || ctx.subGoal;
  const targetTime = p.targetTime || ctx.targetTime;
  const raceDate = p.raceDate || ctx.raceDate || q.raceDate;
  const dur = p.durationWeeks;
  const freq = p.sessionsPerWeek;
  const curVol = ctx.currentVolume || q.currentVolume || snap.currentVolume;
  const inj = ctx.injuries || q.injuries || snap.injuries;
  const age = ctx.age || q.age || snap.age;
  const w_ = ctx.weight || q.weight || snap.weight;
  const h_ = ctx.height || q.height || snap.height;
  const bmi = (w_&&h_)?w_/((h_/100)**2):null;
  const level = p.level || ctx.level || snap.level;
  const trailDist = ctx.trailDistance || q.trailDistance || q.trailDetails?.distance;
  const trailElev = q.trailDetails?.elevation || ctx.trailDetails?.elevation || snap.trailDetails?.elevation || 0;

  // Allures fournies par le système
  const paces = p.paces || {};

  // Fiabilité
  const feas = p.feasibility || {};
  const wm = p.welcomeMessage || feas.message || '';
  const sw = feas.safetyWarning || '';
  const fStatus = feas.status || '?';
  const fScore = feas.score ?? feas.feasibilityScore ?? p.confidenceScore ?? '?';

  // S1
  const w1 = (p.weeks||[])[0] || { sessions:[] };
  const sess = w1.sessions || [];
  const distKmS1 = sess.reduce((s,x) => /renfo|mobilit|cross/i.test(x.type||'') ? s : s + kmFrom(x.distance), 0);
  const sl = sess.filter(s => /longue/i.test(s.type||''));
  const slDistMax = Math.max(0, ...sl.map(s=>kmFrom(s.distance)));
  const slElevMax = Math.max(0, ...sl.map(s=>s.elevationGain||0));

  log(`\n\n${'█'.repeat(120)}`);
  log(`📧 ${email}  •  👤 ${user.firstName||u.displayName||'?'}  •  ${p.name}`);
  log('█'.repeat(120));
  log(`\n  ── INPUTS USER ──`);
  log(`    Objectif: ${goal} ${subGoal?`(${subGoal})`:''}${trailDist?` — ${trailDist}km / ${trailElev}m D+`:''}`);
  log(`    Cible chrono: ${targetTime||'Finisher'}  •  Date course: ${raceDate||'(non fournie)'}  •  Durée: ${dur} sem  •  ${freq} séances/sem`);
  log(`    Profil: ${age} ans  •  IMC ${bmi?.toFixed?.(1)||'?'}  •  Niveau: ${level}  •  Vol actuel: ${curVol||'(non fourni)'} km/sem  •  Blessures: ${fmtInj(inj)}`);
  log(`    VMA système: ${vma} km/h  (source: ${p.vmaSource||'?'})`);

  log(`\n  ── FIABILITÉ ──`);
  log(`    Statut: ${fStatus}  •  Score: ${fScore}  •  confidenceScore: ${p.confidenceScore??'?'}`);
  log(`    Welcome:  "${wm}"`);
  if(sw) log(`    Warning:  "${sw}"`);

  log(`\n  ── ALLURES SYSTÈME (paces[]) — référence donnée au plan ──`);
  if(Object.keys(paces).length === 0) log(`    (aucune allure exposée au top-level — calcul via VMA)`);
  else for(const [k,v] of Object.entries(paces)) log(`    ${k.padEnd(20)} ${typeof v==='object'?JSON.stringify(v):v}`);

  log(`\n  ── SEMAINE 1 (preview) ──`);
  log(`    Volume S1: ${distKmS1.toFixed(1)} km  •  Nb séances: ${sess.length}  •  SL max S1: ${slDistMax} km${slElevMax?` / ${slElevMax}m D+`:''}`);
  log(`    Détail séances :`);
  for(const s of sess){
    const km = kmFrom(s.distance);
    log(`      ${(s.day||'?').padEnd(10)} ${(s.type||'?').padEnd(20)} ${(s.title||'').substring(0,45).padEnd(46)} ${(s.distance||'-').toString().padStart(8)}  ${(s.duration||'-').toString().padStart(12)}  ${(s.targetPace||'').padStart(28)}  intens=${s.intensity||'-'}`);
  }

  rows.push({
    email, firstName:user.firstName||u.displayName||'?', name:p.name,
    goal, subGoal, targetTime, raceDate, dur, freq,
    vma, fStatus, fScore: typeof fScore==='number'?fScore:(p.confidenceScore??'?'),
    distKmS1: distKmS1.toFixed(1), slDistMax, slElevMax,
    isPreview: p.isPreview, fullPlanGenerated: p.fullPlanGenerated
  });
}

// TABLEAU RÉCAP
log('\n\n'+'═'.repeat(120));
log('  📋 TABLEAU RÉCAP — TOUS LES PLANS PREVIEW (S1 seule, full PAS encore généré)');
log('═'.repeat(120));
log(`  ${'Prénom'.padEnd(10)} ${'Objectif'.padEnd(22)} ${'Cible'.padEnd(10)} ${'Dur/Freq'.padEnd(10)} ${'VMA'.padEnd(6)} ${'Statut'.padEnd(12)} ${'Score'.padEnd(7)} ${'KmS1'.padEnd(7)} ${'SLmaxS1'.padEnd(9)} Full?`);
log('  '+'─'.repeat(118));
for(const r of rows){
  log(`  ${(r.firstName||'?').padEnd(10)} ${(`${r.goal||''} ${r.subGoal||''}`.trim()).substring(0,22).padEnd(22)} ${(r.targetTime||'Finisher').padEnd(10)} ${(`${r.dur}sem/${r.freq}`).padEnd(10)} ${String(r.vma).padEnd(6)} ${String(r.fStatus).padEnd(12)} ${String(r.fScore).padEnd(7)} ${String(r.distKmS1).padEnd(7)} ${(r.slDistMax+'km'+(r.slElevMax?'/'+r.slElevMax+'m':'')).padEnd(9)} ${r.fullPlanGenerated?'✅':'❌ preview'}`);
}

writeFileSync('audit-6-emails-v2.txt', out.join('\n'));
console.log(`\n📝 audit-6-emails-v2.txt`);
