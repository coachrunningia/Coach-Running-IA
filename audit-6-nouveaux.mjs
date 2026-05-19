/**
 * Audit complet des 6 plans non encore analysés des 24h.
 * Profil + inputs + S1 détaillée + détection bugs.
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';

const PLAN_IDS = [
  ['1778702412108', 'adrien_marcourt — 18sem BON BLESSURE'],
  ['1778695294712', 'thuries.karine — 24sem RISQUÉ'],
  ['1778694780414', 'epouymayon — 12sem BON'],
  ['1778684157393', 'nicolasdts99 (2e tentative) — 7sem EXCELLENT'],
  ['1778682781778', 'nicolasdts99 (1ère tentative) — 7sem EXCELLENT'],
  ['1778645930644', 'rouet.dimitri — 12/12 IRRÉALISTE PLAN COMPLET'],
];

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

// ============ UTILS ============
const paceFmt = (kmh) => { const p = 60/kmh; const m = Math.floor(p); const s = Math.round((p-m)*60); return `${m}:${String(s).padStart(2,'0')}`; };
function paces(vma) {
  if (!vma) return null;
  return {
    EF: `${paceFmt(vma*0.70)}–${paceFmt(vma*0.65)}`,
    Seuil: `${paceFmt(vma*0.90)}–${paceFmt(vma*0.85)}`,
    VMAlongue: `${paceFmt(vma*1.00)}–${paceFmt(vma*0.95)}`,
  };
}
const paceToSec = (p) => { if (!p) return null; const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const vmaPct = (pace, vma) => { const s = paceToSec(pace); if (!s || !vma) return null; return (3600/s)/vma; };
const kmFrom = (d) => { if (!d) return 0; const v = parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };

// ============ AUDIT ============
function auditPlan(p) {
  const issues = [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };
  const vma = p.vma || ctx.vma || 0;
  const weeks = p.weeks || [];

  // Profile
  const bmi = (profile.weight && profile.height) ? profile.weight / ((profile.height/100)**2) : null;
  const hasInj = !!profile.injuries?.hasInjury;
  const injDesc = profile.injuries?.description || '';
  const rt = profile.recentRaceTimes || {};
  const hasChrono = !!(rt.distance5km || rt.distance10km || rt.distanceHalfMarathon || rt.distanceMarathon);
  const trailDist = profile.trailDetails?.distance;
  const trailElev = profile.trailDetails?.elevation || 0;
  const goal = (p.goal || '').toLowerCase();

  // === Drapeaux rouges ===
  const MEDICAL_RED = /douleur osseuse|fracture|fissure|œdème|stress fracture|ostéonécrose|hernie discale|sciatique aigu/i;
  if (hasInj && MEDICAL_RED.test(injDesc)) {
    if (p.feasibility?.status !== 'RISQUÉ' && p.feasibility?.status !== 'IRRÉALISTE') {
      issues.push({sev:'🔴', cat:'Médical', msg:`Drapeau rouge "${injDesc}" mais statut "${p.feasibility?.status}" (devrait être RISQUÉ)`});
    }
  }

  // === IMC ≥ 27 ===
  if (bmi && bmi >= 27) {
    const warning = p.feasibility?.safetyWarning || '';
    if (!/morpholog|amorti|surface souple|médical/i.test(warning)) {
      issues.push({sev:'🟡', cat:'IMC', msg:`IMC ${bmi.toFixed(1)} ≥ 27 mais aucune mention médicale/morphologie dans warning`});
    }
  }

  // === VMA estimée ===
  if (!hasChrono) {
    issues.push({sev:'🟡', cat:'VMA', msg:`Pas de chrono déclaré → VMA estimée ${vma}km/h (marge d'incertitude)`});
  }

  // === Volume estimé (champ vide) ===
  if (profile.currentWeeklyVolume === undefined || profile.currentWeeklyVolume === null) {
    const msg = p.feasibility?.message || '';
    const volMatch = msg.match(/(\d+)\s*km\/sem/i);
    if (volMatch) {
      issues.push({sev:'🟡', cat:'Volume', msg:`Volume non déclaré mais message affirme "${volMatch[1]} km/sem" (sans note d'estimation)`});
    }
  }

  // === S1 - allures et structure ===
  const s1 = weeks[0]?.sessions || [];
  const courseSessions = s1.filter(s => !/renfo|mobilit|cross|repos/i.test(s.type||''));
  const volS1 = courseSessions.reduce((sum, x) => sum + kmFrom(x.distance), 0);
  const slSessions = s1.filter(s => /longue/i.test(s.type||''));
  const slMax = Math.max(0, ...slSessions.map(s => kmFrom(s.distance)));
  const slElev = Math.max(0, ...slSessions.map(s => s.elevationGain || 0));

  // Doublon SL
  if (slSessions.length > 1) {
    issues.push({sev:'🔴', cat:'Structure', msg:`${slSessions.length} séances 'Sortie Longue' dans la même S1`});
  }

  // D+ vallonné = 0
  s1.forEach(s => {
    if (/vallonn|colline|côte|montée/i.test(s.title || '') && (!s.elevationGain || s.elevationGain === 0)) {
      issues.push({sev:'🟡', cat:'D+', msg:`"${s.title}" évoque relief mais elevationGain = 0`});
    }
  });

  // Allures S1
  if (vma) for (const s of s1) {
    if (!s.targetPace) continue;
    const pct = vmaPct(s.targetPace, vma); if (pct === null) continue;
    const intens = (s.intensity||'').toLowerCase(); const type = (s.type||'').toLowerCase();
    let exp = null, lbl = '';
    if (type.includes('longue') || intens.includes('facile') || type.includes('récup')) { exp=[0.62,0.74]; lbl='EF/SL'; }
    else if (type.includes('seuil') || intens.includes('seuil')) { exp=[0.82,0.92]; lbl='seuil'; }
    else if (type.includes('vma') || intens.includes('vma') || intens.includes('rapide')) { exp=[0.92,1.08]; lbl='VMA'; }
    if (exp && (pct < exp[0] || pct > exp[1])) {
      const sev = (pct < exp[0]-0.05 || pct > exp[1]+0.05) ? '🔴' : '🟡';
      issues.push({sev, cat:'Allures', msg:`"${s.title}": ${s.targetPace}=${(pct*100).toFixed(0)}%VMA vs ${lbl}(${(exp[0]*100).toFixed(0)}-${(exp[1]*100).toFixed(0)}%)`});
    }
  }

  return { issues, profile, bmi, hasInj, injDesc, hasChrono, vma, volS1, slMax, slElev, courseSessions, slSessions };
}

// ============ MAIN ============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

log(`${'═'.repeat(110)}`);
log(`  AUDIT 6 PLANS NON ENCORE ANALYSÉS (24h)`);
log(`${'═'.repeat(110)}\n`);

for (const [id, label] of PLAN_IDS) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const j = await r.json();
  if (!j.fields) { log(`\n❌ ${id} introuvable`); continue; }
  const p = { id, ...pf(j.fields) };
  const a = auditPlan(p);

  log(`\n${'─'.repeat(110)}`);
  log(`📌 ${label}`);
  log(`   ID: ${id}  •  ${(p.weeks||[]).length}/${p.durationWeeks} sem  •  Créé: ${new Date(p.createdAt).toLocaleString('fr-FR')}`);
  log(`${'─'.repeat(110)}`);
  log(`👤 ${p.userEmail}  •  ${a.profile.age||'?'} ans, ${a.profile.sex||'?'}  •  ${a.profile.height||'?'}cm/${a.profile.weight||'?'}kg → IMC ${a.bmi?a.bmi.toFixed(1):'?'}`);
  log(`   Niveau: ${a.profile.level||'?'}  •  Fréq: ${a.profile.frequency||'?'}sé/sem  •  Vol actuel: ${a.profile.currentWeeklyVolume ?? '⚠️ NON DÉCLARÉ'}`);
  log(`   Chronos: ${a.hasChrono ? 'OUI' : '❌ NON'}  •  Blessure: ${a.hasInj ? `OUI — "${a.injDesc}"` : 'non'}`);
  log(`🎯 ${p.goal} ${p.subGoal||''}${a.profile.trailDetails ? ` — ${a.profile.trailDetails.distance}km/${a.profile.trailDetails.elevation}m D+` : ''}  •  Cible: ${p.targetTime || 'Finisher'}`);
  log(`📊 VMA ${a.vma?.toFixed?.(1)||a.vma}  •  Source: ${p.vmaSource || '?'}  •  Statut: ${p.feasibility?.status}`);
  log(`💬 "${(p.feasibility?.message||'').substring(0,200)}…"`);
  log(`⚠️  "${(p.feasibility?.safetyWarning||'').substring(0,200)}…"`);
  log(``);
  log(`📅 S1 : ${a.courseSessions.length} séances course • vol ${a.volS1.toFixed(0)}km • SL max ${a.slMax}km${a.slElev?` / ${a.slElev}m D+`:''}`);
  (p.weeks?.[0]?.sessions||[]).forEach((s, i) => {
    log(`   ${i+1}. ${s.day.padEnd(10)} | ${(s.type||'?').padEnd(15)} | "${(s.title||'').substring(0,40)}" | ${s.duration||'?'} | ${s.distance||'-'} | D+${s.elevationGain||0}m | ${s.targetPace||'-'}`);
  });

  log(``);
  if (a.issues.length === 0) {
    log(`✅ Aucune issue détectée`);
  } else {
    log(`🔎 ${a.issues.length} issue(s):`);
    const byCat = {};
    a.issues.forEach(i => (byCat[i.cat] = byCat[i.cat]||[]).push(i));
    for (const [cat, list] of Object.entries(byCat)) {
      list.forEach(i => log(`   ${i.sev} [${cat}] ${i.msg}`));
    }
  }
}

writeFileSync('audit-6-nouveaux.txt', lines.join('\n'));
console.log(`\n📝 audit-6-nouveaux.txt`);
