/**
 * Audit de TOUS les plans créés EN PREVIEW le 13 mai 2026.
 * Preview = freemium = 1 semaine déployée (fullPlanGenerated !== true).
 *
 * Évalue par plan : message de bienvenue, allures, total km, SL max, volume,
 * évolution (vs vol actuel), sécurité (blessures, âge, IMC, mention poids).
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const DATE_START = '2026-05-13T00:00:00Z';
const DATE_END   = '2026-05-14T00:00:00Z';

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

async function getPlansOfDay() {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: DATE_START } } },
              { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: DATE_END } } },
            ],
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
        limit: 300,
      }
    }),
  });
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), ...pf(r.document.fields) }));
}

// ============== UTILS ALLURES ==============
const paceFmt = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
function paces(vma) {
  if (!vma) return null;
  return {
    EF: `${paceFmt(vma*0.70)}–${paceFmt(vma*0.65)}`,
    SL: `${paceFmt(vma*0.72)}–${paceFmt(vma*0.65)}`,
    Marathon: `${paceFmt(vma*0.82)}–${paceFmt(vma*0.78)}`,
    Semi: `${paceFmt(vma*0.86)}–${paceFmt(vma*0.82)}`,
    Seuil: `${paceFmt(vma*0.90)}–${paceFmt(vma*0.85)}`,
    VMAlongue: `${paceFmt(vma*1.00)}–${paceFmt(vma*0.95)}`,
    VMAcourte: `${paceFmt(vma*1.05)}–${paceFmt(vma*1.00)}`,
  };
}
const paceToSec = (p) => { if (!p) return null; const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const vmaPct = (pace, vma) => { const s = paceToSec(pace); if (!s || !vma) return null; return (3600/s)/vma; };
const kmFrom = (d) => { if (!d) return 0; const v = parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };

// ============== AUDIT PREVIEW ==============
function auditPreview(p) {
  const issues = [];
  const weeks = p.weeks || [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const vma = p.vma || ctx.vma || 0;
  const ref = paces(vma);
  const curVol = ctx.currentVolume || q.currentVolume || snap.currentVolume;
  const age = q.age || snap.age;
  const sex = q.sex || snap.sex;
  const weight = q.weight || snap.weight;
  const height = q.height || snap.height;
  const bmi = (weight && height) ? weight / ((height/100)**2) : null;
  const injObj = q.injuries || snap.injuries;
  const hasInj = !!(injObj?.hasInjury);
  const injDesc = injObj?.description || '';
  const exp = q.experience || snap.experience;
  const level = p.level || q.level || snap.level;
  const freq = p.sessionsPerWeek || q.frequency || snap.frequency;
  const goal = (p.goal || '').toLowerCase();
  const subGoal = (p.subGoal || ctx.subGoal || '').toLowerCase();
  const trailDist = q.trailDetails?.distance || snap.trailDetails?.distance;
  const trailElev = q.trailDetails?.elevation || snap.trailDetails?.elevation || 0;

  const welcome = p.feasibility?.message || '';
  const warning = p.feasibility?.safetyWarning || '';
  const status = p.feasibility?.status || '?';

  // Volume S1 et SL
  const s1 = weeks[0];
  const sessions = s1?.sessions || [];
  const courseSessions = sessions.filter(s => !/renfo|mobilit|cross|repos/i.test(s.type||''));
  const volS1 = courseSessions.reduce((sum, x) => sum + kmFrom(x.distance), 0);
  const slSessions = sessions.filter(s => /longue/i.test(s.type||''));
  const slMax = Math.max(0, ...slSessions.map(s => kmFrom(s.distance)));
  const slElev = Math.max(0, ...slSessions.map(s => s.elevationGain || 0));

  // === Message d'accueil ===
  if (!welcome || welcome.length < 20) issues.push({sev:'🟡', cat:'Accueil', msg:'Message vide/court'});
  if (/\bpoids\b|minceur|maigr|\bIMC\b|kilo|silhouette|corpulence/i.test(welcome) && !goal.includes('perte')) {
    issues.push({sev:'🔴', cat:'Accueil', msg:'Mention poids/IMC du coureur — interdit'});
  }
  if (hasInj && warning && !/blessur|kiné|médecin|professionnel|santé/i.test(warning)) {
    issues.push({sev:'🟡', cat:'Accueil', msg:`Blessure "${injDesc}" mais pas de mention médicale`});
  }

  // === Allures ===
  const allurePoints = [];
  for (const s of sessions) {
    if (!s.targetPace) continue;
    const pct = vmaPct(s.targetPace, vma); if (pct===null) continue;
    const intens = (s.intensity||'').toLowerCase(); const type = (s.type||'').toLowerCase();
    let exp = null, lbl = '';
    if (type.includes('longue')||intens.includes('facile')||type.includes('récup')) { exp=[0.62,0.74]; lbl='EF/SL'; }
    else if (type.includes('seuil')||intens.includes('seuil')) { exp=[0.82,0.92]; lbl='seuil'; }
    else if (type.includes('vma')||intens.includes('vma')||intens.includes('rapide')) { exp=[0.92,1.08]; lbl='VMA'; }
    else if (intens.includes('marathon')||type.includes('marathon')) { exp=[0.75,0.84]; lbl='marathon'; }
    if (exp) {
      const ok = pct >= exp[0] && pct <= exp[1];
      allurePoints.push({ title: s.title, pace: s.targetPace, pct, lbl, ok });
      if (!ok) {
        const sev = (pct < exp[0]-0.05 || pct > exp[1]+0.05) ? '🔴' : '🟡';
        issues.push({sev, cat:'Allures', msg:`"${s.title}": ${s.targetPace}=${(pct*100).toFixed(0)}%VMA vs ${lbl}(${(exp[0]*100).toFixed(0)}-${(exp[1]*100).toFixed(0)}%)`});
      }
    }
  }

  // === Évolution vs vol actuel ===
  if (curVol && volS1 && volS1 > curVol * 1.30 && curVol > 5) {
    issues.push({sev:'🔴', cat:'Charge', msg:`S1=${volS1.toFixed(0)}km vs actuel ${curVol}km/sem → +${((volS1/curVol-1)*100).toFixed(0)}% (>30%)`});
  } else if (curVol && volS1 < curVol * 0.4 && curVol > 10) {
    issues.push({sev:'🟡', cat:'Charge', msg:`S1=${volS1.toFixed(0)}km << actuel ${curVol}km/sem (-${((1-volS1/curVol)*100).toFixed(0)}%)`});
  }

  // === SL ===
  if (slMax > 0 && volS1 > 0 && slMax / volS1 > 0.60 && volS1 < 30) {
    issues.push({sev:'🟡', cat:'SL', msg:`SL ${slMax}km = ${(slMax/volS1*100).toFixed(0)}% du vol S1 (forte dominance)`});
  }
  // Cohérence SL vs objectif
  if (trailDist >= 100 && slMax > 0 && slMax < 12) issues.push({sev:'🟡', cat:'SL', msg:`SL S1 ${slMax}km très courte pour ultra ${trailDist}km`});
  if (goal.includes('marathon') && !goal.includes('semi') && slMax > 0 && slMax < 10) issues.push({sev:'🟡', cat:'SL', msg:`SL S1 ${slMax}km courte pour marathon`});

  // === Sécurité ===
  const safety = [];
  if (age && age < 18) safety.push({sev:'🔴', cat:'Sécurité', msg:`Mineur (${age}) — plan ne devrait pas être généré`});
  if (bmi && bmi >= 28) {
    let pliometrie = 0;
    for (const s of sessions) {
      const txt = ((s.mainSet||'')+' '+(s.title||'')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      if (s.type === 'Renforcement' && (txt.includes('saute')||txt.includes('saut ')||txt.includes('jump')||txt.includes('pliomet')||txt.includes('bond'))) pliometrie++;
    }
    if (pliometrie) safety.push({sev:'🔴', cat:'Sécurité', msg:`IMC ${bmi.toFixed(1)} ≥28 mais pliométrie présente`});
  }
  if (goal.includes('marathon') && !goal.includes('semi') && (p.durationWeeks||0) < 12) safety.push({sev:'🔴', cat:'Sécurité', msg:`Marathon en ${p.durationWeeks||0} sem — risque (min 12)`});
  if (trailDist >= 100 && (p.durationWeeks||0) < 20) safety.push({sev:'🔴', cat:'Sécurité', msg:`Ultra ${trailDist}km en ${p.durationWeeks||0} sem — risque sérieux`});
  if (trailDist && trailElev && slElev > 0 && (slElev/trailElev) > 0.6) safety.push({sev:'🟡', cat:'Sécurité', msg:`S1 SL D+${slElev}m = ${(slElev/trailElev*100).toFixed(0)}% du D+ course — démarrage très haut`});

  issues.push(...safety);

  return { issues, volS1, slMax, slElev, courseSessions: courseSessions.length, allurePoints, welcome, warning, status, ref, vma, age, bmi, hasInj, injDesc, level, exp, freq, goal, subGoal, trailDist, trailElev, curVol, weight, height };
}

function noteOf(issues, total) {
  const score = issues.reduce((s,i)=>s+(i.sev==='🔴'?3:1),0);
  const ratio = total ? score/total : score;
  if (score===0) return {lab:'A+', emo:'🏆'};
  if (ratio<0.3) return {lab:'A', emo:'✅'};
  if (ratio<0.6) return {lab:'B', emo:'👍'};
  if (ratio<1.0) return {lab:'C', emo:'⚠️'};
  return {lab:'D', emo:'🚨'};
}

// ============== MAIN ==============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

const allPlans = await getPlansOfDay();
const previews = allPlans.filter(p => (p.weeks || []).length === 1 && p.fullPlanGenerated !== true);

log(`${'═'.repeat(110)}`);
log(`  AUDIT PLANS PREVIEW DU 13 MAI 2026  •  ${new Date().toLocaleString('fr-FR')}`);
log(`  ${allPlans.length} plans créés ce jour  •  ${previews.length} en preview (S1 seule)`);
log(`${'═'.repeat(110)}`);

const summary = { ranks: { 'A+':0, 'A':0, 'B':0, 'C':0, 'D':0 }, issuesByCat: {}, totalIssues: 0, totalCritical: 0 };

for (const p of previews) {
  const a = auditPreview(p);
  const n = noteOf(a.issues, a.courseSessions);
  summary.ranks[n.lab]++;
  summary.totalIssues += a.issues.length;
  summary.totalCritical += a.issues.filter(i => i.sev === '🔴').length;
  a.issues.forEach(i => summary.issuesByCat[i.cat] = (summary.issuesByCat[i.cat]||0) + 1);

  const t = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('fr-FR') : '?';
  log(`\n┌${'─'.repeat(108)}`);
  log(`│ ${n.emo} ${n.lab}  •  ${p.id}  •  ${t}  •  ${p.userEmail||'?'}`);
  log(`│ ${p.name||'(sans nom)'}`);
  log(`│`);
  log(`│ PROFIL: VMA ${a.vma||'?'}km/h  •  ${a.age||'?'}ans  •  IMC ${a.bmi?.toFixed?.(1)||'?'}  •  ${a.level||'?'}  •  ${a.freq||'?'}sé/sem  •  ${p.durationWeeks||'?'}sem  •  vol actuel ${a.curVol||'?'}km/sem`);
  log(`│ OBJECTIF: ${p.goal} ${p.subGoal?`(${p.subGoal})`:''}${a.trailDist?` — ${a.trailDist}km/${a.trailElev}m D+`:''}  •  cible: ${p.targetTime||'Finisher'}`);
  log(`│ BLESSURE: ${a.hasInj?`"${a.injDesc}"`:'aucune'}`);
  log(`│`);
  log(`│ ACCUEIL [${a.status}]: "${a.welcome.substring(0,250)}${a.welcome.length>250?'…':''}"`);
  if (a.warning) log(`│ WARNING: "${a.warning.substring(0,200)}${a.warning.length>200?'…':''}"`);
  log(`│`);
  log(`│ S1: ${a.courseSessions} séances course  •  vol ${a.volS1.toFixed(0)}km  •  SL max ${a.slMax.toFixed(0)}km${a.slElev?` / ${a.slElev}m D+`:''}`);
  if (a.ref) log(`│ ALLURES théoriques: EF ${a.ref.EF}/km  •  Seuil ${a.ref.Seuil}/km  •  VMA ${a.ref.VMAlongue}/km`);
  if (a.allurePoints.length) log(`│ ALLURES réelles: ${a.allurePoints.map(x => `${x.title.substring(0,15)} ${(x.pct*100).toFixed(0)}%`).join(' | ')}`);
  log(`│`);
  if (a.issues.length === 0) log(`│ ✅ Aucun problème détecté`);
  else {
    const byCat = {};
    a.issues.forEach(i => (byCat[i.cat] = byCat[i.cat]||[]).push(i));
    for (const [cat, list] of Object.entries(byCat)) {
      log(`│ ▸ ${cat}:`);
      list.forEach(i => log(`│   ${i.sev} ${i.msg}`));
    }
  }
  log(`└${'─'.repeat(108)}`);
}

log(`\n\n${'═'.repeat(110)}`);
log(`  SYNTHÈSE — ${previews.length} previews du 13 mai`);
log(`${'═'.repeat(110)}`);
log(`Notes: A+(${summary.ranks['A+']})  A(${summary.ranks['A']})  B(${summary.ranks['B']})  C(${summary.ranks['C']})  D(${summary.ranks['D']})`);
log(`Total issues: ${summary.totalIssues}  •  Critiques 🔴: ${summary.totalCritical}`);
log(`\nIssues par catégorie:`);
Object.entries(summary.issuesByCat).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) => log(`  ${c.padEnd(15)} ${n}`));
log(``);

writeFileSync('audit-previews-13mai.txt', lines.join('\n'));
console.log(`\n📝 audit-previews-13mai.txt`);
