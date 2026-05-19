/**
 * AUDIT COACH des 5 plans 24h sur les 4 dimensions :
 * D1. Volume hebdo (vs référentiel v2 par typologie × freq)
 * D2. Distance max séance / SL pic (vs cible référentiel)
 * D3. Allures (%VMA cohérent par type de séance)
 * D4. Évolution volume (pour Premium : progression 3-15%/sem, décharges)
 *
 * Référentiel v2 par typologie × niveau × fréquence :
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
const token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
function pv(v){if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.doubleValue!==undefined)return v.doubleValue;if(v.booleanValue!==undefined)return v.booleanValue;if(v.timestampValue!==undefined)return v.timestampValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);if(v.mapValue)return pf(v.mapValue.fields);return null;}
function pf(fields){if(!fields)return{};const o={};for(const[k,v]of Object.entries(fields))o[k]=pv(v);return o;}

// Référentiel v2 — vol PIC par fréquence
const REF_VOL_PIC = {
  'Marathon':     { deb: {3:30,4:40,5:50}, inter: {3:39,4:52,5:65}, conf: {4:70,5:85,6:95}, expert: {4:80,5:100,6:115} },
  'Semi':         { deb: {3:27,4:36,5:45}, inter: {3:36,4:48,5:60}, conf: {3:42,4:56,5:70,6:84}, expert: {3:48,4:64,5:80,6:96} },
  '10km':         { deb: {3:24,4:32,5:40}, inter: {3:33,4:44,5:55}, conf: {3:39,4:52,5:65,6:78}, expert: {3:45,4:60,5:75,6:90} },
  '5km':          { deb: {3:18,4:24,5:30}, inter: {3:27,4:36,5:45}, conf: {3:33,4:44,5:55,6:66}, expert: {3:39,4:52,5:65,6:78} },
  'Hyrox':        { deb: {3:18,4:25}, inter: {3:25,4:35}, conf: {3:35,4:45,5:55}, expert: {3:45,4:55,5:65} },
  'PertePoids':   { deb: {3:15,4:22}, inter: {3:35,4:45}, conf: {3:35,4:50}, expert: null },
  'Maintien':     { deb: {3:15,4:22}, inter: {3:25,4:35}, conf: {3:35,4:45}, expert: {3:45,4:55} },
  'Trail<30':     { deb: {3:25,4:30}, inter: {3:35,4:45,5:50}, conf: {4:50,5:60}, expert: {4:60,5:70} },
  'Trail30+':     { deb: {3:30,4:35}, inter: {3:40,4:50,5:60}, conf: {4:60,5:75}, expert: {4:70,5:85,6:95} },
  'Trail60+':     { inter: {4:55,5:65}, conf: {4:70,5:85,6:95}, expert: {4:85,5:105,6:120} },
};
// SL pic par typologie
const REF_SL_PIC = {
  'Marathon': { deb: 25, inter: 30, conf: 33, expert: 38 },
  'Semi':     { deb: 14, inter: 17, conf: 20, expert: 24 },
  '10km':     { deb: 9, inter: 13, conf: 16, expert: 18 },
  '5km':      { deb: 7, inter: 11, conf: 13, expert: 15 },
  'Hyrox':    { deb: 8, inter: 11, conf: 13, expert: 16 },
  'PertePoids': { deb: 9, inter: 15, conf: 20, expert: 25 },
  'Maintien': { deb: 7, inter: 11, conf: 15, expert: 20 },
  'Trail<30': { deb: 16, inter: 20, conf: 25, expert: 32 },
  'Trail30+': { deb: 20, inter: 25, conf: 32, expert: 40 },
  'Trail60+': { inter: 35, conf: 48, expert: 60 },
};

function detectType(p) {
  const g = (p.goal || '').toLowerCase();
  const n = (p.name || '').toLowerCase();
  const td = p.generationContext?.questionnaireSnapshot?.trailDistance || p.trailDistance;
  if (g.includes('hyrox')) return 'Hyrox';
  if (g.includes('perte')) return 'PertePoids';
  if (g.includes('maintien')) return 'Maintien';
  if (g.includes('trail')) {
    if (td) {
      if (td < 30) return 'Trail<30';
      if (td < 60) return 'Trail30+';
      return 'Trail60+';
    }
    const m = n.match(/(\d+)\s*km/);
    const dist = m ? parseInt(m[1]) : 30;
    if (dist < 30) return 'Trail<30';
    if (dist < 60) return 'Trail30+';
    return 'Trail60+';
  }
  if (/marathon/i.test(n) && !/semi/i.test(n)) return 'Marathon';
  if (/semi/i.test(n) || /21/i.test(n)) return 'Semi';
  if (/10\s*km/i.test(n)) return '10km';
  if (/5\s*km/i.test(n)) return '5km';
  return null;
}
function detectLevel(p) {
  const l = (p.generationContext?.questionnaireSnapshot?.level || p.level || '').toLowerCase();
  if (l.includes('expert')) return 'expert';
  if (l.includes('confirm')) return 'conf';
  if (l.includes('inter')) return 'inter';
  return 'deb';
}

const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => p.createdAt && new Date(p.createdAt) >= since).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

const kmOf = (s) => parseFloat(String(s.distance || '0').replace(/[^0-9.]/g, '')) || 0;
const paceSec = (p) => { const m = String(p||'').match(/(\d+):(\d+)/); return m ? parseInt(m[1])*60 + parseInt(m[2]) : null; };
const vmaPct = (pace, vma) => { const ps = paceSec(pace); return ps && vma ? (3600/ps) / vma : null; };

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  AUDIT COACH 4 dimensions — Plans 24h                                         ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);

for (const p of plans) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${p.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const doc = pf((await r.json()).fields);
  const qs = doc.generationContext?.questionnaireSnapshot || {};
  const peri = doc.generationContext?.periodizationPlan;
  const typology = detectType(doc);
  const level = detectLevel(doc);
  const freq = doc.sessionsPerWeek || qs.frequency;
  const vma = doc.vma || qs.vma || 0;
  const weeks = doc.weeks || [];
  const isFreemium = doc.fullPlanGenerated !== true;

  console.log(`\n\n══════════════ ${doc.name} ══════════════`);
  console.log(`Typologie: ${typology || '?'} | Niveau: ${level} | VMA ${vma.toFixed(1)} | Freq: ${freq} | ${weeks.length} sem`);

  // === D1. VOLUME HEBDO vs RÉFÉRENTIEL ===
  console.log(`\n📊 D1 — VOLUME HEBDO`);
  const expectedPic = REF_VOL_PIC[typology]?.[level]?.[freq];
  if (expectedPic) {
    console.log(`  Référentiel v2 pic: ${typology} ${level} ${freq}x → ${expectedPic} km/sem`);
  } else {
    console.log(`  ⚠ Pas de référentiel pour ${typology} ${level} ${freq}x`);
  }
  if (isFreemium) {
    const s1Vol = (weeks[0]?.sessions || []).filter(s => s.type !== 'Renforcement').reduce((s,x) => s + kmOf(x), 0);
    const expS1 = expectedPic ? expectedPic * 0.55 : null;
    console.log(`  Vol S1 réel: ${s1Vol.toFixed(0)} km${expS1 ? ` | Attendu ~${expS1.toFixed(0)} km (55% du pic)` : ''}`);
    if (expS1 && Math.abs(s1Vol - expS1) / expS1 > 0.30) console.log(`  🔴 Écart ${(((s1Vol - expS1) / expS1) * 100).toFixed(0)}% vs attendu`);
  } else {
    const vols = weeks.map(w => (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((s,x) => s + kmOf(x), 0));
    const realPic = Math.max(...vols);
    console.log(`  Pic réel: ${realPic} km (S${vols.indexOf(realPic)+1})`);
    if (expectedPic) {
      const gap = ((realPic - expectedPic) / expectedPic) * 100;
      if (Math.abs(gap) > 20) console.log(`  🔴 Écart ${gap.toFixed(0)}% vs référentiel`);
      else if (Math.abs(gap) > 10) console.log(`  🟡 Écart ${gap.toFixed(0)}%`);
      else console.log(`  ✅ Cohérent avec référentiel`);
    }
  }

  // === D2. DISTANCE MAX / SL PIC ===
  console.log(`\n📏 D2 — DISTANCE MAX (SL PIC)`);
  const expectedSL = REF_SL_PIC[typology]?.[level];
  if (expectedSL) console.log(`  Référentiel v2: SL pic ${typology} ${level} → ~${expectedSL} km`);
  if (isFreemium) {
    const s1 = weeks[0];
    if (s1) {
      const runs = (s1.sessions||[]).filter(s => s.type !== 'Renforcement');
      const sl = runs.reduce((m,x) => kmOf(x) > kmOf(m) ? x : m, runs[0] || {});
      console.log(`  SL S1: ${kmOf(sl).toFixed(1)} km — "${sl.title?.substring(0,40)}"`);
      console.log(`  💡 S1 doit être ~30-50% du SL pic prévu (premières semaines de prépa)`);
    }
  } else {
    const slPic = Math.max(0, ...weeks.flatMap(w => (w.sessions||[]).filter(s => /sortie\s*longue/i.test(s.type||'')).map(kmOf)));
    console.log(`  SL pic réelle: ${slPic.toFixed(1)} km`);
    if (expectedSL) {
      const gap = ((slPic - expectedSL) / expectedSL) * 100;
      if (Math.abs(gap) > 25) console.log(`  🔴 Écart SL ${gap.toFixed(0)}% vs référentiel`);
      else if (Math.abs(gap) > 15) console.log(`  🟡 Écart ${gap.toFixed(0)}%`);
      else console.log(`  ✅ Cohérent`);
    }
  }

  // === D3. ALLURES ===
  console.log(`\n🎯 D3 — ALLURES (%VMA par type)`);
  let allureIssues = 0, allureChecked = 0;
  const courseAll = weeks.flatMap(w => w.sessions || []).filter(s => s.type !== 'Renforcement' && s.targetPace);
  for (const s of courseAll) {
    const pct = vmaPct(s.targetPace, vma);
    if (pct === null) continue;
    allureChecked++;
    const type = (s.type || '').toLowerCase();
    const inten = (s.intensity || '').toLowerCase();
    let expected = null, label = '';
    if (type.includes('longue') || type.includes('jogging') || type.includes('footing') || inten.includes('facile')) {
      expected = [0.60, 0.75]; label = 'EF/SL';
    } else if (type.includes('tempo') || /seuil/i.test(s.title||'')) {
      expected = [0.85, 0.92]; label = 'Seuil';
    } else if (type.includes('vma') || type.includes('fractionn')) {
      expected = [0.85, 1.05]; label = 'VMA';
    }
    if (expected && (pct < expected[0] || pct > expected[1])) {
      allureIssues++;
      if (allureIssues <= 3) console.log(`  ⚠ S${weeks.indexOf(weeks.find(w => w.sessions?.includes(s)))+1} "${s.title?.substring(0,30)}" ${s.targetPace} = ${(pct*100).toFixed(0)}%VMA vs ${label} ${(expected[0]*100).toFixed(0)}-${(expected[1]*100).toFixed(0)}%`);
    }
  }
  if (allureIssues === 0 && allureChecked > 0) console.log(`  ✅ ${allureChecked}/${allureChecked} allures cohérentes`);
  else if (allureChecked > 0) console.log(`  Total: ${allureIssues}/${allureChecked} allures hors zone`);

  // === D4. ÉVOLUTION VOLUME (Premium uniquement) ===
  if (!isFreemium) {
    console.log(`\n📈 D4 — ÉVOLUTION VOLUME`);
    const vols = weeks.map(w => (w.sessions||[]).filter(s => s.type !== 'Renforcement').reduce((s,x) => s + kmOf(x), 0));
    console.log(`  Séquence: ${vols.map(v => v.toFixed(0)).join(' → ')}`);
    let bigJumps = 0;
    for (let i = 1; i < vols.length; i++) {
      if (vols[i-1] > 5) {
        const j = (vols[i] - vols[i-1]) / vols[i-1];
        if (j > 0.20) { bigJumps++; if (bigJumps <= 2) console.log(`  ⚠ S${i}→S${i+1}: +${(j*100).toFixed(0)}% (règle 10-15%)`); }
      }
    }
    // Décharges
    const recovWeeks = peri?.recoveryWeeks || [];
    let recovOK = 0;
    for (const w of recovWeeks) {
      const idx = w - 1;
      if (idx > 0 && idx < vols.length && vols[idx] < vols[idx-1] * 0.90) recovOK++;
    }
    console.log(`  Décharges respectées: ${recovOK}/${recovWeeks.length}`);
    // Affûtage
    const lastVol = vols[vols.length-1];
    const peakVol = Math.max(...vols);
    console.log(`  Affûtage: dernière sem = ${((lastVol/peakVol)*100).toFixed(0)}% du pic`);
    const isWithEvent = doc.targetTime && doc.targetTime !== 'Finisher';
    const isPerteOrMaintien = ['PertePoids','Maintien'].includes(typology);
    if (isPerteOrMaintien) console.log(`  💡 Pas d'affûtage attendu (perte/maintien)`);
    else if (isWithEvent && lastVol > peakVol * 0.75) console.log(`  🔴 Pas d'affûtage suffisant`);
  }
}
