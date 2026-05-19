/**
 * Audit qualité coach des 10 derniers plans générés.
 * Critères : volume (évolution), distance max séance, allures, diversité, cohérence.
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const last10 = all.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const paceSec = (p) => { const m = String(p||'').match(/(\d+):(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const durMin = (d) => { let s = 0; const dStr = String(d||''); const h = dStr.match(/(\d+)\s*h\s*(\d*)/); if (h) { s += parseInt(h[1])*60; if (h[2]) s += parseInt(h[2]); } const m = dStr.match(/^(\d+)\s*min/); if (m) s = parseInt(m[1]); return s; };
const vmaPct = (pace, vma) => { const ps = paceSec(pace); return ps && vma ? (3600/ps) / vma : null; };

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  AUDIT QUALITÉ COACH — 10 derniers plans générés                              ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

const results = [];

for (let idx = 0; idx < last10.length; idx++) {
  const p = last10[idx];
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${p.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const doc = pf((await r.json()).fields);
  const qs = doc.generationContext?.questionnaireSnapshot || {};
  const peri = doc.generationContext?.periodizationPlan;
  const weeks = doc.weeks || [];
  const isFreemium = doc.fullPlanGenerated !== true;
  const vma = doc.vma || qs.vma || 0;
  const freq = doc.sessionsPerWeek || qs.frequency;
  const time = new Date(doc.createdAt).toLocaleString('fr-FR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

  const scores = {};
  const findings = [];

  // === 1. VOLUME hebdo & évolution ===
  const vols = weeks.map(w => (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((s,x) => s + kmOf(x), 0));
  const peakVol = Math.max(...vols, 0);
  const meanVol = vols.length ? vols.reduce((a,b)=>a+b,0)/vols.length : 0;

  if (!isFreemium && vols.length > 2) {
    // Évolution : ratio peak/début + progression saine
    const minVol = Math.min(...vols);
    const range = peakVol > 0 ? peakVol / Math.max(minVol, 1) : 0;
    // Décharges respectées ?
    const recovWeeks = peri?.recoveryWeeks || [];
    const recovOK = recovWeeks.filter(w => {
      const i = w - 1;
      return i > 0 && i < vols.length && vols[i] < vols[i-1] * 0.92;
    }).length;
    // Saut excessif ?
    let bigJumps = 0, maxJump = 0;
    for (let i = 1; i < vols.length; i++) {
      if (vols[i-1] > 5) {
        const j = (vols[i] - vols[i-1]) / vols[i-1];
        if (j > 0.20) bigJumps++;
        if (Math.abs(j) > Math.abs(maxJump)) maxJump = j;
      }
    }
    if (bigJumps > vols.length * 0.2) findings.push(`🟡 ${bigJumps} sauts >+20% (max ${(maxJump*100).toFixed(0)}%)`);
    if (recovOK < recovWeeks.length) findings.push(`🟡 ${recovWeeks.length - recovOK}/${recovWeeks.length} décharges non respectées`);
    scores.volEvolution = bigJumps === 0 ? 10 : bigJumps <= 1 ? 7 : 4;
  }

  // === 2. DISTANCE MAX SÉANCE (SL pic) & évolution ===
  const slKms = [];
  for (const w of weeks) {
    const slCandidate = (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((m,x) => kmOf(x) > kmOf(m) ? x : m, {});
    if (kmOf(slCandidate) > 0) slKms.push(kmOf(slCandidate));
  }
  const slPic = Math.max(...slKms, 0);

  if (!isFreemium && slKms.length > 2) {
    // SL progressive ?
    const slStart = slKms[0];
    const slGrowth = ((slPic - slStart) / slStart) * 100;
    if (slGrowth < 30 && slKms.length > 8) findings.push(`🟡 SL stagne (+${slGrowth.toFixed(0)}% sur ${slKms.length} sem — attendu +50% min)`);
    scores.slEvolution = slGrowth >= 50 ? 10 : slGrowth >= 30 ? 7 : 4;
  }

  // === 3. ALLURES ===
  let allOK = 0, allTotal = 0, allHors = [];
  for (const w of weeks) for (const s of (w.sessions||[])) {
    if (s.type === 'Renforcement' || !s.targetPace) continue;
    const pct = vmaPct(s.targetPace, vma);
    if (pct === null) continue;
    allTotal++;
    const type = (s.type||'').toLowerCase(), inten = (s.intensity||'').toLowerCase();
    let exp = null, label = '';
    if (type.includes('longue') || type.includes('jogging') || type.includes('footing') || /facile|récup/i.test(inten)) { exp = [0.58, 0.78]; label = 'EF'; }
    else if (type.includes('tempo') || /seuil/.test(s.title||'')) { exp = [0.82, 0.94]; label = 'Seuil'; }
    else if (type.includes('vma') || type.includes('fractionn')) { exp = [0.80, 1.08]; label = 'VMA/Frac'; }
    else if (type.includes('marche')) { exp = [0.45, 0.75]; label = 'Marche/Course'; }
    if (exp) {
      if (pct >= exp[0] && pct <= exp[1]) allOK++;
      else if (allHors.length < 2) allHors.push(`S${w.weekNumber} ${s.day} "${s.title?.substring(0,25)}" = ${(pct*100).toFixed(0)}%VMA hors ${label}`);
    } else { allOK++; }
  }
  scores.allures = allTotal === 0 ? 0 : Math.round((allOK / allTotal) * 10);
  if (allHors.length) allHors.forEach(h => findings.push(`🟡 ${h}`));

  // === 4. DIVERSITÉ ===
  const types = new Set();
  const titlesByWeek = [];
  for (const w of weeks) {
    const ts = new Set();
    for (const s of (w.sessions||[])) {
      types.add(s.type);
      ts.add(s.title);
    }
    titlesByWeek.push(ts.size);
  }
  // Pour la S1 spécifiquement (freemium voient ça)
  if (weeks[0]) {
    const s1Sess = weeks[0].sessions || [];
    const s1Types = new Set(s1Sess.map(s => s.type));
    const s1Titles = new Set(s1Sess.map(s => s.title));
    const distinct = s1Titles.size === s1Sess.length;
    scores.diversite = Math.min(10, s1Types.size * 2 + (distinct ? 4 : 0));
    if (!distinct) findings.push(`🟡 S1: ${s1Sess.length - s1Titles.size} titre(s) dupliqué(s)`);
  }

  // === 5. COHÉRENCE dist×pace=durée ===
  let cohOK = 0, cohTotal = 0;
  for (const w of weeks) for (const s of (w.sessions||[])) {
    if (s.type === 'Renforcement') continue;
    const km = kmOf(s); const ps = paceSec(s.targetPace); const dm = durMin(s.duration);
    if (km && ps && dm) {
      cohTotal++;
      if (Math.abs(dm - (km*ps)/60) / ((km*ps)/60) < 0.15) cohOK++;
    }
  }
  scores.coherence = cohTotal === 0 ? 0 : Math.round((cohOK / cohTotal) * 10);
  if (cohOK < cohTotal) findings.push(`🟡 ${cohTotal - cohOK}/${cohTotal} séances incohérentes dist×pace≠durée`);

  // === SCORE GLOBAL ===
  const filteredScores = Object.values(scores).filter(s => s > 0);
  const global = filteredScores.length ? Math.round(filteredScores.reduce((a,b) => a+b, 0) / filteredScores.length) : 0;

  const tag = isFreemium ? '🆓' : '💎';
  const sevIcon = global >= 8 ? '✅' : global >= 6 ? '🟡' : '🔴';
  console.log(`\n${sevIcon} ${tag} [${idx+1}/10] ${doc.name?.substring(0,50)}`);
  console.log(`   ${doc.userEmail || '?'} | ${time} | ${weeks.length} sem | VMA ${vma?.toFixed(1) || '?'} | freq ${freq}`);
  console.log(`   Profil: ${(qs.level || '?').substring(0,12)} | Faisab: ${doc.feasibility?.status} (${doc.confidenceScore}/100)`);
  console.log(`   Volume: pic ${peakVol.toFixed(0)}km | moy ${meanVol.toFixed(0)}km | SL pic ${slPic.toFixed(1)}km`);
  console.log(`   Scores: vol-évo=${scores.volEvolution || '-'} sl-évo=${scores.slEvolution || '-'} allures=${scores.allures || '-'} diversité=${scores.diversite || '-'} cohérence=${scores.coherence || '-'} → GLOBAL ${global}/10`);
  if (findings.length) findings.forEach(f => console.log(`     ${f}`));

  results.push({ ...p, global, scores });
}

// Synthèse globale
console.log(`\n\n══ SYNTHÈSE 10 DERNIERS PLANS ══`);
const avgGlobal = results.reduce((a,r) => a + r.global, 0) / results.length;
console.log(`Score global moyen: ${avgGlobal.toFixed(1)}/10`);
const byTier = { excellent: 0, bon: 0, moyen: 0 };
results.forEach(r => { if (r.global >= 8) byTier.excellent++; else if (r.global >= 6) byTier.bon++; else byTier.moyen++; });
console.log(`Distribution: ✅ Excellent ${byTier.excellent} | 🟡 Bon ${byTier.bon} | 🔴 Moyen ${byTier.moyen}`);
