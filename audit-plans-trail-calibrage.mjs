/**
 * Audit batch — comment le système calibre-t-il les plans Trail ?
 *
 * Pour chaque plan trail, on mesure :
 *   - Inputs : distance course, D+ course, vol actuel, D+ actuel, niveau, durée plan
 *   - Output système : pic vol km, SL S1 km (proxy SL pic), D+ S1 sessions cumul (proxy D+ projection)
 *   - Ratios : pic_vol / race_km, sl_s1 / race_km, dplus_s1 / race_dplus
 *   - Comparaison vs reco expert (finisher) : pic_vol = 1.1-1.4× race, SL = 50-60% race, D+ pic = 0.7-1.0× race
 *
 * Output : tableau classé par "sous-dimensionnement" décroissant
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

function pv(v){ if(!v) return null; if(v.stringValue!==undefined) return v.stringValue; if(v.integerValue!==undefined) return parseInt(v.integerValue); if(v.doubleValue!==undefined) return v.doubleValue; if(v.booleanValue!==undefined) return v.booleanValue; if(v.timestampValue!==undefined) return v.timestampValue; if(v.arrayValue) return (v.arrayValue.values||[]).map(pv); if(v.mapValue) return pf(v.mapValue.fields); return null; }
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }
const kmFrom = (d)=>{ if(!d) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };

async function fetchAllWithRetry() {
  const all = [];
  let pageToken = null;
  let retries = 0;
  do {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=200${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`;
      const r = await fetch(url, { headers:H, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      if (j.documents) all.push(...j.documents);
      pageToken = j.nextPageToken;
      retries = 0;
    } catch (e) {
      retries++;
      if (retries > 3) throw e;
      console.log(`  retry ${retries}…`);
      await new Promise(r => setTimeout(r, 2000));
    }
  } while (pageToken);
  return all;
}

console.log(`Fetch tous les plans…`);
const docs = await fetchAllWithRetry();
console.log(`Total ${docs.length} plans`);

// Filtrer trail
const trailPlans = [];
for (const doc of docs) {
  const p = pf(doc.fields);
  if (!(p.goal || '').toLowerCase().includes('trail')) continue;
  const snap = p.generationContext?.questionnaireSnapshot || {};
  const pp = p.generationContext?.periodizationPlan || {};
  const trailDist = snap.trailDetails?.distance;
  const trailDplus = snap.trailDetails?.elevation;
  if (!trailDist) continue;
  const wv = pp.weeklyVolumes || [];
  if (!wv.length) continue;

  // S1 sessions pour D+ et SL
  const w1 = (p.weeks || [])[0];
  let s1DplusTotal = 0, s1SLkm = 0, s1SLDplus = 0, s1Volume = 0;
  for (const s of (w1?.sessions || [])) {
    s1Volume += kmFrom(s.distance);
    s1DplusTotal += s.elevationGain || 0;
    if (/longue/i.test(s.type || '')) {
      const km = kmFrom(s.distance);
      if (km > s1SLkm) { s1SLkm = km; s1SLDplus = s.elevationGain || 0; }
    }
  }

  const picVol = Math.max(...wv);
  const totalVol = wv.reduce((s,v)=>s+v,0);
  const dur = wv.length;

  trailPlans.push({
    id: doc.name.split('/').pop(),
    email: p.userEmail,
    raceDate: p.raceDate || snap.raceDate,
    raceDist: trailDist,
    raceDplus: trailDplus || 0,
    targetTime: p.targetTime || snap.targetTime,
    isFinisher: !p.targetTime && !snap.targetTime,
    dur,
    freq: p.sessionsPerWeek || snap.frequency,
    level: p.level || snap.level,
    volActu: snap.currentWeeklyVolume,
    dplusActu: snap.currentWeeklyElevation || 0,
    age: snap.age, weight: snap.weight, height: snap.height,
    bmi: (snap.weight && snap.height) ? (snap.weight / ((snap.height/100)**2)).toFixed(1) : null,
    feasStatus: p.feasibility?.status,
    feasScore: p.feasibility?.score ?? p.confidenceScore,
    isPreview: p.isPreview,
    fullPlanGenerated: p.fullPlanGenerated,
    createdAt: p.createdAt?.substring(0,10),
    // Outputs système
    picVol,
    totalVol,
    s1Volume: s1Volume.toFixed(1),
    s1DplusTotal,
    s1SLkm,
    s1SLDplus,
    // Ratios
    ratioPicVolRace: (picVol / trailDist).toFixed(2),
    ratioSLs1Race: (s1SLkm / trailDist).toFixed(2),
    ratioDplusS1Race: trailDplus ? ((s1DplusTotal / trailDplus) * 100).toFixed(0) + '%' : '?',
    sautDplus: snap.currentWeeklyElevation ? (s1DplusTotal / snap.currentWeeklyElevation).toFixed(0) + '×' : '?',
  });
}

console.log(`\nPlans trail trouvés : ${trailPlans.length}`);

// Stats globales
console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  STATISTIQUES GLOBALES — ${trailPlans.length} plans trail`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);

// Catégoriser par taille de course
const cats = {
  'court (<15km)': trailPlans.filter(t => t.raceDist < 15),
  'moyen (15-30km)': trailPlans.filter(t => t.raceDist >= 15 && t.raceDist < 30),
  'long (30-60km)': trailPlans.filter(t => t.raceDist >= 30 && t.raceDist < 60),
  'ultra (60+km)': trailPlans.filter(t => t.raceDist >= 60),
};

for (const [cat, plans] of Object.entries(cats)) {
  if (!plans.length) continue;
  console.log(`\n── ${cat} (${plans.length} plans) ──`);
  const ratiosVol = plans.map(p => parseFloat(p.ratioPicVolRace));
  const avg = (arr) => arr.length ? (arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(2) : 'n/a';
  const med = (arr) => { if (!arr.length) return 'n/a'; const s=[...arr].sort((a,b)=>a-b); return s[Math.floor(s.length/2)].toFixed(2); };
  console.log(`  pic_vol / race_km : médiane=${med(ratiosVol)} | min=${Math.min(...ratiosVol).toFixed(2)} | max=${Math.max(...ratiosVol).toFixed(2)}`);
  console.log(`  Standard finisher recommandé : 1.10-1.40`);
  const underDimensioned = plans.filter(p => parseFloat(p.ratioPicVolRace) < 1.0);
  console.log(`  Plans sous-dimensionnés (pic_vol < race_km) : ${underDimensioned.length}/${plans.length} (${(underDimensioned.length/plans.length*100).toFixed(0)}%)`);
}

// Top 15 sous-dimensionnés
console.log(`\n══════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
console.log(`  TOP 15 PLANS LES PLUS SOUS-DIMENSIONNÉS (ratio pic_vol / race_km le plus bas)`);
console.log(`══════════════════════════════════════════════════════════════════════════════════════════════════════════════════`);
trailPlans.sort((a,b) => parseFloat(a.ratioPicVolRace) - parseFloat(b.ratioPicVolRace));
console.log(`  ${'planId'.padEnd(15)} ${'email'.padEnd(25)} ${'race'.padEnd(14)} ${'dur'.padEnd(4)} ${'lvl'.padEnd(20)} ${'volActu'.padEnd(8)} ${'D+actu'.padEnd(7)} ${'picVol'.padEnd(7)} ${'ratio'.padEnd(6)} ${'sl S1'.padEnd(6)} ${'D+ S1'.padEnd(7)} ${'feas'.padEnd(14)}`);
console.log('  '+'─'.repeat(150));
for (const p of trailPlans.slice(0, 15)) {
  console.log(`  ${p.id.padEnd(15)} ${(p.email||'?').substring(0,25).padEnd(25)} ${(p.raceDist+'km/'+p.raceDplus+'D+').padEnd(14)} ${String(p.dur).padEnd(4)} ${String(p.level||'?').substring(0,20).padEnd(20)} ${String(p.volActu??'?').padEnd(8)} ${String(p.dplusActu).padEnd(7)} ${String(p.picVol).padEnd(7)} ${p.ratioPicVolRace.padEnd(6)} ${String(p.s1SLkm).padEnd(6)} ${String(p.s1DplusTotal).padEnd(7)} ${(p.feasStatus+'/'+p.feasScore).padEnd(14)}`);
}

writeFileSync('audit-plans-trail-calibrage.json', JSON.stringify(trailPlans, null, 2));
console.log(`\n📝 audit-plans-trail-calibrage.json (${trailPlans.length} plans détaillés)`);
