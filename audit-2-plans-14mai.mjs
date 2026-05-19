/**
 * Trouve + audite les 2 plans du 14/05/2026 :
 *  - lescouarn@live.fr
 *  - besson.mickael9@gmail.com (Mickaël)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const NEEDLES = ['lescouarn@live.fr', 'besson.mickael9@gmail.co'];

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
const paceFmt = (kmh) => { const p = 60 / kmh; const m = Math.floor(p); const s = Math.round((p - m) * 60); return `${m}:${String(s).padStart(2, '0')}`; };
const paceToSec = (p) => { if (!p) return null; const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null; };
const vmaPct = (pace, vma) => { const s = paceToSec(pace); if (!s || !vma) return null; return (3600 / s) / vma; };
const kmFrom = (d) => { if (!d) return 0; const v = parseFloat(String(d).replace(',', '.').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };

// ============ AUDIT ============
function auditPlan(p) {
  const issues = [];
  const ctx = p.generationContext || {};
  const q = ctx.questionnaireData || {};
  const snap = ctx.questionnaireSnapshot || {};
  const profile = { ...snap, ...q };
  const vma = p.vma || ctx.vma || 0;
  const weeks = p.weeks || [];

  const bmi = (profile.weight && profile.height) ? profile.weight / ((profile.height / 100) ** 2) : null;
  const hasInj = !!profile.injuries?.hasInjury;
  const injDesc = profile.injuries?.description || '';
  const rt = profile.recentRaceTimes || {};
  const hasChrono = !!(rt.distance5km || rt.distance10km || rt.distanceHalfMarathon || rt.distanceMarathon);

  // Drapeaux rouges médicaux
  const MEDICAL_RED = /douleur osseuse|fracture|fissure|œdème|stress fracture|ostéonécrose|hernie discale|sciatique aigu/i;
  if (hasInj && MEDICAL_RED.test(injDesc)) {
    if (p.feasibility?.status !== 'RISQUÉ' && p.feasibility?.status !== 'IRRÉALISTE') {
      issues.push({ sev: '🔴', cat: 'Médical', msg: `Drapeau rouge "${injDesc}" mais statut "${p.feasibility?.status}" (devrait être RISQUÉ)` });
    }
  }
  // IMC ≥ 27
  if (bmi && bmi >= 27) {
    const warning = p.feasibility?.safetyWarning || '';
    if (!/morpholog|amorti|surface souple|médical/i.test(warning)) {
      issues.push({ sev: '🟡', cat: 'IMC', msg: `IMC ${bmi.toFixed(1)} ≥ 27 mais aucune mention médicale/morphologie dans warning` });
    }
  }
  // VMA estimée
  if (!hasChrono) {
    issues.push({ sev: '🟡', cat: 'VMA', msg: `Pas de chrono déclaré → VMA estimée ${vma}km/h (marge d'incertitude)` });
  }
  // Volume non déclaré
  if (profile.currentWeeklyVolume === undefined || profile.currentWeeklyVolume === null) {
    const msg = p.feasibility?.message || '';
    const volMatch = msg.match(/(\d+)\s*km\/sem/i);
    if (volMatch) {
      issues.push({ sev: '🟡', cat: 'Volume', msg: `Volume non déclaré mais message affirme "${volMatch[1]} km/sem" (sans note d'estimation)` });
    }
  }

  // Analyse de TOUTES les semaines
  weeks.forEach((w, wi) => {
    const sessions = w.sessions || [];
    const renfo = sessions.filter(s => /renfo/i.test(s.type || '') || /renfo/i.test(s.title || ''));
    const slSessions = sessions.filter(s => /longue/i.test(s.type || ''));
    const crossSessions = sessions.filter(s => /\bvélo\b|\bvelo\b|natation|\bnage\b|cross-?training|elliptique|\brameur\b|\bvtt\b/i.test((s.type || '') + ' ' + (s.title || '') + ' ' + (s.mainSet || '')));

    // Règle fréquence : freq inclut TOUJOURS 1 renfo
    if (wi === 0) {
      const freq = profile.frequency;
      if (freq && renfo.length === 0) {
        issues.push({ sev: '🟡', cat: 'Renfo', msg: `S${wi + 1}: fréquence ${freq} mais 0 séance de renforcement (la fréquence doit inclure 1 renfo)` });
      }
    }
    // Doublon SL
    if (slSessions.length > 1) {
      issues.push({ sev: '🔴', cat: 'Structure', msg: `S${wi + 1}: ${slSessions.length} séances 'Sortie Longue' la même semaine` });
    }
    // Cross-training interdit
    if (crossSessions.length > 0) {
      crossSessions.forEach(s => issues.push({ sev: '🔴', cat: 'Cross-training', msg: `S${wi + 1}: "${s.title}" — cross-training interdit (QUE de la course à pied)` }));
    }
    // D+ relief = 0
    sessions.forEach(s => {
      if (/vallonn|colline|côte|montée/i.test(s.title || '') && (!s.elevationGain || s.elevationGain === 0)) {
        issues.push({ sev: '🟡', cat: 'D+', msg: `S${wi + 1}: "${s.title}" évoque le relief mais elevationGain = 0` });
      }
    });
    // Allures
    if (vma) for (const s of sessions) {
      if (!s.targetPace) continue;
      const pct = vmaPct(s.targetPace, vma); if (pct === null) continue;
      const intens = (s.intensity || '').toLowerCase(); const type = (s.type || '').toLowerCase();
      let exp = null, lbl = '';
      if (type.includes('longue') || intens.includes('facile') || type.includes('récup')) { exp = [0.62, 0.74]; lbl = 'EF/SL'; }
      else if (type.includes('seuil') || intens.includes('seuil')) { exp = [0.82, 0.92]; lbl = 'seuil'; }
      else if (type.includes('vma') || intens.includes('vma') || intens.includes('rapide')) { exp = [0.92, 1.08]; lbl = 'VMA'; }
      if (exp && (pct < exp[0] || pct > exp[1])) {
        const sev = (pct < exp[0] - 0.05 || pct > exp[1] + 0.05) ? '🔴' : '🟡';
        issues.push({ sev, cat: 'Allures', msg: `S${wi + 1} "${s.title}": ${s.targetPace}=${(pct * 100).toFixed(0)}%VMA vs ${lbl}(${(exp[0] * 100).toFixed(0)}-${(exp[1] * 100).toFixed(0)}%)` });
      }
    }
  });

  // Mention poids/minceur dans les messages utilisateur
  const POIDS = /poids|minceur|maigrir|kilos? à perdre|imc|corpulence|surpoids|perdre du poids/i;
  const userTexts = [p.feasibility?.message, p.feasibility?.safetyWarning, ...(weeks.flatMap(w => (w.sessions || []).map(s => s.advice)))].filter(Boolean);
  userTexts.forEach(t => {
    if (POIDS.test(t)) issues.push({ sev: '🔴', cat: 'Poids', msg: `Mention poids/minceur interdite dans un message utilisateur : "${t.substring(0, 120)}…"` });
  });

  return { issues, profile, bmi, hasInj, injDesc, hasChrono, vma };
}

// ============ RECHERCHE PAR EMAIL ============
async function findPlansByEmail() {
  const all = [];
  let lastCreatedAt = null;
  while (true) {
    const sq = {
      from: [{ collectionId: 'plans' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 300,
    };
    if (lastCreatedAt) sq.where = { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'LESS_THAN', value: { stringValue: lastCreatedAt } } };
    const q = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: sq }),
    });
    const data = await q.json();
    const docs = (Array.isArray(data) ? data : []).filter(r => r.document);
    if (docs.length === 0) break;
    for (const r of docs) all.push({ id: r.document.name.split('/').pop(), ...pf(r.document.fields) });
    lastCreatedAt = docs[docs.length - 1].document.fields.createdAt?.stringValue;
    if (!lastCreatedAt || docs.length < 300) break;
    if (all.length > 6000) break;
  }
  return all;
}

// ============ MAIN ============
const lines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); lines.push(s); };

const allPlans = await findPlansByEmail();
log(`# AUDIT 2 PLANS — 14/05/2026`);
log(`_(${allPlans.length} plans balayés)_\n`);

for (const needle of NEEDLES) {
  const matches = allPlans
    .filter(p => JSON.stringify({ a: p.userEmail, b: p.email, c: p.generationContext?.email, d: p.generationContext?.userEmail }).toLowerCase().includes(needle.toLowerCase()))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (matches.length === 0) { log(`\n## ❌ ${needle} — AUCUN PLAN TROUVÉ\n`); continue; }
  const p = matches[0];
  const a = auditPlan(p);

  log(`\n${'─'.repeat(90)}`);
  log(`## 📌 ${p.userEmail || p.email || needle}`);
  log(`   ID: ${p.id}  •  ${(p.weeks || []).length}/${p.durationWeeks} sem  •  Créé: ${new Date(p.createdAt).toLocaleString('fr-FR')}`);
  if (matches.length > 1) log(`   ⚠️ ${matches.length} plans pour cet email — analyse du plus récent`);
  log(`${'─'.repeat(90)}`);
  log(`👤 ${a.profile.age || '?'} ans, ${a.profile.sex || '?'}  •  ${a.profile.height || '?'}cm/${a.profile.weight || '?'}kg → IMC ${a.bmi ? a.bmi.toFixed(1) : '?'}`);
  log(`   Niveau: ${a.profile.level || '?'}  •  Fréq: ${a.profile.frequency || '?'}sé/sem  •  Vol actuel: ${a.profile.currentWeeklyVolume ?? '⚠️ NON DÉCLARÉ'}`);
  log(`   Chronos: ${a.hasChrono ? 'OUI' : '❌ NON'}  •  Blessure: ${a.hasInj ? `OUI — "${a.injDesc}"` : 'non'}`);
  log(`🎯 ${p.goal} ${p.subGoal || ''}${a.profile.trailDetails ? ` — ${a.profile.trailDetails.distance}km/${a.profile.trailDetails.elevation}m D+` : ''}  •  Cible: ${p.targetTime || 'Finisher'}  •  ${p.durationWeeks} sem`);
  log(`📊 VMA ${a.vma?.toFixed?.(1) || a.vma}  •  Source: ${p.vmaSource || '?'}  •  Statut: ${p.feasibility?.status}`);
  log(`💬 "${(p.feasibility?.message || '').substring(0, 300)}"`);
  log(`⚠️  "${(p.feasibility?.safetyWarning || '').substring(0, 300)}"`);

  // Synthèse semaines
  const weeks = p.weeks || [];
  log(`\n### Synthèse ${weeks.length} semaines`);
  weeks.forEach((w, i) => {
    const ss = w.sessions || [];
    const km = ss.reduce((s, x) => s + kmFrom(x.distance), 0);
    const dPlus = ss.reduce((s, x) => s + (x.elevationGain || 0), 0);
    const types = ss.map(s => s.type || '?').join('+');
    log(`- S${i + 1} (${w.phase || '?'}): ${km.toFixed(0)}km / ${dPlus}m D+ / ${ss.length}sé : ${types}`);
  });

  // S1 détaillée
  log(`\n### S1 détaillée (phase: ${weeks[0]?.phase}, theme: ${weeks[0]?.theme})`);
  (weeks[0]?.sessions || []).forEach((s, i) => {
    log(``);
    log(`**S1 séance ${i + 1} — ${s.day} : ${s.title}**`);
    log(`- Type: ${s.type} • Intensité: ${s.intensity} • Durée: ${s.duration} • Distance: ${s.distance || '-'} • D+: ${s.elevationGain || 0}m • Allure: ${s.targetPace || '-'}`);
    log(`- Warmup: ${s.warmup || '-'}`);
    log(`- MainSet: ${s.mainSet || '-'}`);
    log(`- Cooldown: ${s.cooldown || '-'}`);
    log(`- Advice: ${s.advice || '-'}`);
  });

  log(``);
  if (a.issues.length === 0) {
    log(`### ✅ Aucune issue détectée`);
  } else {
    log(`### 🔎 ${a.issues.length} issue(s)`);
    const byCat = {};
    a.issues.forEach(i => (byCat[i.cat] = byCat[i.cat] || []).push(i));
    for (const [cat, list] of Object.entries(byCat)) list.forEach(i => log(`- ${i.sev} [${cat}] ${i.msg}`));
  }
}

writeFileSync('audit-2-plans-14mai.md', lines.join('\n'));
console.log(`\n📝 audit-2-plans-14mai.md écrit`);
