/**
 * AUDIT 19 PLANS — case-by-case pic distance + SL pic
 * Date : 2026-05-18
 *
 * 19 plans :
 *   - 8 plans 18/05 (déjà patchés volumes sauf Sébastien) — re-check pic + SL
 *   - 11 plans Premium graves (ratio < 0.85, course future, isPremium=true)
 *
 * 100% lecture seule. Aucune modif Firestore. Aucun contact client.
 *
 * Pour chaque plan : extraction profil + weeklyVolumes + SL pic (actuelle si
 * weeks[] dispo, sinon projetée 40-50% du pic vol), puis match avec référentiel
 * coaching adapté au profil (niveau × objectif × chrono visé).
 *
 * Output : ~/Coach-Running-IA/AUDIT-19-PLANS-PIC-SL-CASE-BY-CASE.md
 * + ~/Coach-Running-IA/audit-19-plans-case-by-case.json (raw data)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// ── Firestore parse helpers ────────────────────────────────────────────────
function pv(v){
  if(!v) return null;
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
const kmFrom = (d)=>{ if(d==null) return 0; const v=parseFloat(String(d).replace(',','.').replace(/[^0-9.]/g,'')); return isNaN(v)?0:v; };

// ── Plans à auditer ───────────────────────────────────────────────────────
const PLANS_1805 = [
  { tag:'Aurore',    email:'auroregervot@yahoo.fr',        planId:'1779124806518' },
  { tag:'Justine',   email:'justine.clt29@icloud.com',     planId:'1779124016788' },
  { tag:'Alan',      email:'alanwentzel74@gmail.com',      planId:'1779114282783' },
  { tag:'Sebastien', email:'sebastien.sailly@outlook.fr',  planId:'1779099564353' },
  { tag:'Antoine',   email:'antoineg.gde@outlook.fr',      planId:'1779086346189' },
  { tag:'Annabelle', email:'nabou57@hotmail.fr',           planId:'1779085742508' },
  { tag:'Armando',   email:'arenaarmando@hotmail.com',     planId:'1779071910169' },
  { tag:'Valentine', email:'valentinemery2004@gmail.com',  planId:'1779029895523' },
];

// 11 plans Premium graves (from toRegenerate)
const PLANS_PREM = [
  { tag:'Lucie',     email:'lafleur666@yahoo.fr',                          planId:'1773143911561' },
  { tag:'Romain',    email:'baroneromain26400@gmail.com',                  planId:'1774180563158' },
  { tag:'Manon',     email:'manondbc92@gmail.com',                         planId:'1774900493420' },
  { tag:'Amelie',    email:'amelfoul@gmail.com',                           planId:'1771192741777' },
  { tag:'Emmanuel',  email:'emmanuel.tellier.professionnel@gmail.com',     planId:'1777227660497' },
  { tag:'Cyril',     email:'cyril.carriere4@gmail.com',                    planId:'1775202027706' },
  { tag:'Mouhammad', email:'mouhammadslimani2605@gmail.com',               planId:'1778441786486' },
  { tag:'Julien',    email:'deugnilson@gmail.com',                         planId:'1778654056401' },
  { tag:'Charles',   email:'charlesl.88@live.fr',                          planId:'1775251010162' },
  { tag:'Cyrienne',  email:'cyrienne.dacosta@gmail.com',                   planId:'1776770917685' },
  { tag:'AdminTest', email:'programme@coachrunningia.fr',                  planId:'1778920918506' },
];

// ── Référentiel coaching par PROFIL ────────────────────────────────────────
// Inputs : level (Débutant/Intermédiaire/Confirmé/Expert/Élite), goal, subGoal,
// trailDist, targetTime → renvoie { picMin, picMax, slMin, slMax, label }
function referentielPic(level, goal, subGoal, trailDist, trailElev, targetTime) {
  const lv = (level||'').toLowerCase();
  const g  = (goal||'').toLowerCase();
  const sg = (subGoal||'').toLowerCase();
  const tt = String(targetTime||'').toLowerCase();

  // Trail : ratio-based (1.5-2× distance race ; SL 60-80% de la race)
  // ⚠ trailDist peut être résiduel dans snap pour des plans route — gate uniquement sur goal=Trail
  if (g.includes('trail')) {
    const d = trailDist || 0;
    if (d >= 80) return { picMin: 90, picMax: 130, slMin: Math.round(d*0.45), slMax: Math.round(d*0.6), label: `Ultra ${d}km (90-130 km/sem, SL ${Math.round(d*0.45)}-${Math.round(d*0.6)} km + B2B)`, needsBackToBack: true };
    if (d >= 50) return { picMin: 80, picMax: 110, slMin: Math.round(d*0.5),  slMax: Math.round(d*0.7), label: `Ultra ${d}km (80-110 km/sem, SL ${Math.round(d*0.5)}-${Math.round(d*0.7)} km + B2B)`, needsBackToBack: true };
    if (d >= 40) return { picMin: Math.round(d*1.5), picMax: Math.round(d*2),   slMin: Math.round(d*0.6), slMax: Math.round(d*0.8), label: `Trail ${d}km (${Math.round(d*1.5)}-${Math.round(d*2)} km/sem, SL ${Math.round(d*0.6)}-${Math.round(d*0.8)} km)` };
    if (d >= 20) return { picMin: Math.round(d*1.5), picMax: Math.round(d*2),   slMin: Math.round(d*0.6), slMax: Math.round(d*0.8), label: `Trail ${d}km (${Math.round(d*1.5)}-${Math.round(d*2)} km/sem, SL ${Math.round(d*0.6)}-${Math.round(d*0.8)} km)` };
    return { picMin: 30, picMax: 50, slMin: 12, slMax: 20, label: 'Trail court (30-50 km/sem)' };
  }

  // Marathon (pas semi)
  if ((g.includes('marathon') || sg.includes('marathon')) && !g.includes('semi') && !sg.includes('semi')) {
    if (lv.includes('expert') || lv.includes('élite') || lv.includes('elite')) {
      if (/2h[0-2]\d|sub.?2h30/.test(tt)) return { picMin: 90, picMax: 130, slMin: 35, slMax: 40, label: 'Marathon Élite sub-2h30 (90-130 km/sem, SL 35-40 km + B2B)', needsBackToBack: true };
      if (/2h[3-5]\d|sub.?3h00|3h00/.test(tt)) return { picMin: 70, picMax: 90, slMin: 32, slMax: 38, label: 'Marathon Expert sub-3h00 (70-90 km/sem, SL 32-38 km)' };
      return { picMin: 60, picMax: 80, slMin: 30, slMax: 35, label: 'Marathon Expert (60-80 km/sem)' };
    }
    if (lv.includes('confirm')) {
      if (/sub.?3h30|3h[0-2]\d/.test(tt)) return { picMin: 55, picMax: 65, slMin: 30, slMax: 35, label: 'Marathon Confirmé sub-3h30 (55-65 km/sem, SL 30-35)' };
      return { picMin: 45, picMax: 60, slMin: 28, slMax: 32, label: 'Marathon Confirmé (45-60 km/sem, SL 28-32)' };
    }
    if (lv.includes('intermédiaire') || lv.includes('intermediaire') || lv.includes('régulier') || lv.includes('regulier')) {
      if (/sub.?4h|3h[3-5]\d/.test(tt)) return { picMin: 45, picMax: 55, slMin: 28, slMax: 32, label: 'Marathon Régulier sub-4h (45-55 km/sem, SL 28-32)' };
      return { picMin: 40, picMax: 50, slMin: 25, slMax: 30, label: 'Marathon Régulier (40-50 km/sem, SL 25-30)' };
    }
    // débutant
    return { picMin: 35, picMax: 45, slMin: 25, slMax: 28, label: 'Marathon Débutant Finisher (35-45 km/sem, SL 25-28)' };
  }

  // Semi-marathon
  if (g.includes('semi') || sg.includes('semi')) {
    if (lv.includes('expert') || lv.includes('élite') || lv.includes('elite')) {
      if (/1h1[0-5]/.test(tt)) return { picMin: 100, picMax: 130, slMin: 28, slMax: 32, label: 'Semi Élite sub-1h15 (100-130 km/sem, SL 28-32)' };
      if (/1h[12]\d/.test(tt)) return { picMin: 90, picMax: 110, slMin: 25, slMax: 30, label: 'Semi Expert sub-1h20 (90-110 km/sem, SL 25-30)' };
      if (/1h[23]\d/.test(tt)) return { picMin: 60, picMax: 80, slMin: 22, slMax: 25, label: 'Semi Expert sub-1h30 (60-80 km/sem, SL 22-25)' };
      return { picMin: 50, picMax: 70, slMin: 20, slMax: 24, label: 'Semi Expert (50-70 km/sem)' };
    }
    if (lv.includes('confirm')) {
      if (/1h[34]\d|sub.?1h45/.test(tt)) return { picMin: 40, picMax: 50, slMin: 18, slMax: 22, label: 'Semi Confirmé sub-1h45 (40-50 km/sem, SL 18-22)' };
      if (/1h5\d|2h0\d/.test(tt)) return { picMin: 35, picMax: 45, slMin: 17, slMax: 20, label: 'Semi Confirmé sub-2h (35-45 km/sem, SL 17-20)' };
      return { picMin: 35, picMax: 45, slMin: 17, slMax: 20, label: 'Semi Confirmé (35-45 km/sem, SL 17-20)' };
    }
    if (lv.includes('intermédiaire') || lv.includes('intermediaire') || lv.includes('régulier') || lv.includes('regulier')) {
      return { picMin: 30, picMax: 40, slMin: 16, slMax: 19, label: 'Semi Intermédiaire (30-40 km/sem, SL 16-19)' };
    }
    return { picMin: 25, picMax: 35, slMin: 16, slMax: 18, label: 'Semi Débutant Finisher (25-35 km/sem, SL 16-18)' };
  }

  // 10 km
  if (sg.includes('10') || g.includes('10km') || g.includes('10 km')) {
    if (lv.includes('expert') || lv.includes('élite')) {
      if (/^30(min|m)?$|sub.?30/.test(tt)) return { picMin: 80, picMax: 110, slMin: 20, slMax: 24, label: '10k Élite sub-30min (80-110 km/sem, SL 20-24)' };
      if (/^3[2-5]/.test(tt) || /sub.?35/.test(tt)) return { picMin: 60, picMax: 80, slMin: 18, slMax: 22, label: '10k Expert sub-35min (60-80 km/sem, SL 18-22)' };
      if (/^[34]0|sub.?40/.test(tt)) return { picMin: 50, picMax: 70, slMin: 16, slMax: 20, label: '10k Expert sub-40min (50-70 km/sem, SL 16-20)' };
      return { picMin: 45, picMax: 65, slMin: 15, slMax: 18, label: '10k Expert (45-65 km/sem)' };
    }
    if (lv.includes('confirm')) {
      if (/^4[0-5]|sub.?45/.test(tt)) return { picMin: 35, picMax: 45, slMin: 13, slMax: 16, label: '10k Confirmé sub-45min (35-45 km/sem, SL 13-16)' };
      if (/^[45]0|sub.?50/.test(tt)) return { picMin: 30, picMax: 40, slMin: 12, slMax: 15, label: '10k Confirmé sub-50min (30-40 km/sem, SL 12-15)' };
      return { picMin: 25, picMax: 35, slMin: 11, slMax: 14, label: '10k Confirmé (25-35 km/sem)' };
    }
    if (lv.includes('intermédiaire') || lv.includes('intermediaire') || lv.includes('régulier') || lv.includes('regulier')) {
      return { picMin: 18, picMax: 25, slMin: 9, slMax: 11, label: '10k Intermédiaire (18-25 km/sem, SL 9-11)' };
    }
    return { picMin: 12, picMax: 18, slMin: 7, slMax: 9, label: '10k Débutant Finisher (12-18 km/sem, SL 7-9)' };
  }

  // 5 km
  if (sg.includes('5') || g.includes('5km') || g.includes('5 km')) {
    if (lv.includes('expert') || lv.includes('élite')) return { picMin: 50, picMax: 60, slMin: 12, slMax: 15, label: '5k Expert (50-60 km/sem, SL 12-15)' };
    if (lv.includes('confirm')) return { picMin: 30, picMax: 40, slMin: 10, slMax: 12, label: '5k Confirmé (30-40 km/sem, SL 10-12)' };
    if (lv.includes('intermédiaire')||lv.includes('intermediaire')) return { picMin: 18, picMax: 25, slMin: 7, slMax: 10, label: '5k Intermédiaire (18-25 km/sem, SL 7-10)' };
    return { picMin: 10, picMax: 15, slMin: 5, slMax: 7, label: '5k Débutant (10-15 km/sem, SL 5-7)' };
  }

  // Hyrox / autre : fallback
  if (g.includes('hyrox')) return { picMin: 20, picMax: 30, slMin: 10, slMax: 15, label: 'Hyrox course (20-30 km/sem, SL 10-15)' };

  // Maintien en forme / Forme générale → calibrage modéré ancré sur curVol
  if (g.includes('maintien') || g.includes('forme') || g.includes('santé') || g.includes('sante')) {
    if (lv.includes('confirm') || lv.includes('expert')) return { picMin: 25, picMax: 40, slMin: 8, slMax: 12, label: 'Maintien forme Confirmé (25-40 km/sem, SL 8-12)' };
    if (lv.includes('intermédiaire')||lv.includes('intermediaire')) return { picMin: 15, picMax: 25, slMin: 6, slMax: 10, label: 'Maintien forme Intermédiaire (15-25 km/sem, SL 6-10)' };
    return { picMin: 8, picMax: 18, slMin: 4, slMax: 8, label: 'Maintien forme Débutant (8-18 km/sem, SL 4-8)' };
  }

  return { picMin: 0, picMax: 999, slMin: 0, slMax: 999, label: '? (objectif non reconnu)' };
}

// ── Fetch helpers ──────────────────────────────────────────────────────────
async function fetchPlan(planId) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`, { headers:H });
  if (r.status === 404) return null;
  const j = await r.json();
  if (j.error) throw new Error(`READ ${planId}: ${j.error.message}`);
  return pf(j.fields);
}

async function fetchUser(uid) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, { headers:H });
  if (r.status === 404) return {};
  return pf((await r.json()).fields);
}

// ── Extraction SL pic réelle (parcours toutes les semaines) ────────────────
function extractSLByWeek(plan) {
  const weeks = plan.weeks || [];
  const result = [];
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    const sess = w?.sessions || [];
    let slMax = 0;
    for (const s of sess) {
      const t = (s.type || '') + ' ' + (s.title || '');
      if (/longue|long run|sortie longue/i.test(t)) {
        const km = kmFrom(s.distance);
        if (km > slMax) slMax = km;
      }
    }
    result.push(slMax);
  }
  return result;
}

// ── Analyze one plan ───────────────────────────────────────────────────────
async function analyzeOne(p) {
  const plan = await fetchPlan(p.planId);
  if (!plan) return { ...p, error: 'plan_not_found' };

  const ctx = plan.generationContext || {};
  const snap = ctx.questionnaireSnapshot || {};
  const pp = ctx.periodizationPlan || {};

  const level = plan.level || snap.level;
  const goal = plan.goal || snap.goal;
  const subGoal = plan.subGoal || snap.subGoal;
  const targetTime = plan.targetTime || snap.targetTime;
  const trailDist = snap.trailDetails?.distance || ctx.trailDistance;
  const trailElev = snap.trailDetails?.elevation || 0;
  const freq = plan.sessionsPerWeek || snap.frequency;
  const curVol = snap.currentWeeklyVolume ?? ctx.currentVolume ?? snap.currentVolume;
  const curDplus = snap.currentWeeklyElevation ?? snap.currentElev;
  const raceDate = plan.raceDate || snap.raceDate;
  const dur = plan.durationWeeks || (pp.weeklyVolumes||[]).length;
  const vma = plan.vma || ctx.vma;
  const paces = plan.paces || {};

  const wv = pp.weeklyVolumes || [];
  const wp = pp.weeklyPhases || [];
  const we = pp.weeklyElevationTarget || [];

  const peakKm = wv.length ? Math.max(...wv) : 0;
  const peakWeek = wv.findIndex(v => v === peakKm) + 1;
  const s1 = wv[0] || 0;

  const slByWeek = extractSLByWeek(plan);
  const slPicReal = slByWeek.length ? Math.max(...slByWeek) : 0;
  const slPicProjMin = Math.round(peakKm * 0.40);
  const slPicProjMax = Math.round(peakKm * 0.50);

  const ref = referentielPic(level, goal, subGoal, trailDist, trailElev, targetTime);

  // Diagnostic pic
  let picDiag;
  if (peakKm < ref.picMin * 0.7) picDiag = '❌ très sous-dim';
  else if (peakKm < ref.picMin) picDiag = '⚠️ sous-dim';
  else if (peakKm > ref.picMax * 1.2) picDiag = '🟡 surdim';
  else picDiag = '✅ OK';

  // Diagnostic SL (compare to projected = the structural one)
  const slPicEffective = slPicReal || slPicProjMax;
  let slDiag;
  if (slPicEffective < ref.slMin * 0.7) slDiag = '❌ très sous-dim';
  else if (slPicEffective < ref.slMin) slDiag = '⚠️ sous-dim';
  else if (slPicEffective > ref.slMax * 1.2) slDiag = '🟡 surdim';
  else slDiag = '✅ OK';

  // Progression
  const declared = curVol || 0;
  const progression = declared > 0 ? ((peakKm - declared) / declared * 100) : null;

  return {
    ...p,
    plan: {
      name: plan.name,
      isPremium: plan.isPremium,
      isPreview: plan.isPreview,
      fullPlanGenerated: plan.fullPlanGenerated,
      raceDate,
      dur,
      freq,
      level, goal, subGoal, targetTime, trailDist, trailElev,
      curVol, curDplus,
      vma,
      paces,
    },
    volumes: {
      wv, wp, we,
      s1, peakKm, peakWeek,
      slByWeek,
      slPicReal,
      slPicProjMin, slPicProjMax,
    },
    ref,
    diag: { picDiag, slDiag, progression },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log('═'.repeat(110));
console.log('AUDIT 19 PLANS — pic distance + SL pic case-by-case');
console.log('═'.repeat(110));

const all1805 = [];
const allPrem = [];

for (const p of PLANS_1805) {
  console.log(`\n→ [1805] ${p.tag}…`);
  try {
    const r = await analyzeOne({ ...p, category: '1805' });
    all1805.push(r);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    else {
      console.log(`  ${r.plan.level} • ${r.plan.goal}${r.plan.subGoal?` (${r.plan.subGoal})`:''} • cible ${r.plan.targetTime||'?'}`);
      console.log(`  wv=${JSON.stringify(r.volumes.wv)}`);
      console.log(`  pic=${r.volumes.peakKm}km (S${r.volumes.peakWeek}) • SL pic réelle=${r.volumes.slPicReal||'-'} • SL pic projetée ${r.volumes.slPicProjMin}-${r.volumes.slPicProjMax}km`);
      console.log(`  REF: ${r.ref.label} → pic ${r.ref.picMin}-${r.ref.picMax} • SL ${r.ref.slMin}-${r.ref.slMax}`);
      console.log(`  DIAG: pic ${r.diag.picDiag} • SL ${r.diag.slDiag}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    all1805.push({ ...p, error: e.message });
  }
}

for (const p of PLANS_PREM) {
  console.log(`\n→ [PREM] ${p.tag}…`);
  try {
    const r = await analyzeOne({ ...p, category: 'PREM' });
    allPrem.push(r);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    else {
      console.log(`  ${r.plan.level} • ${r.plan.goal}${r.plan.subGoal?` (${r.plan.subGoal})`:''} • cible ${r.plan.targetTime||'?'}`);
      console.log(`  wv=${JSON.stringify(r.volumes.wv)}`);
      console.log(`  pic=${r.volumes.peakKm}km (S${r.volumes.peakWeek}) • SL pic réelle=${r.volumes.slPicReal||'-'} • SL pic projetée ${r.volumes.slPicProjMin}-${r.volumes.slPicProjMax}km`);
      console.log(`  REF: ${r.ref.label} → pic ${r.ref.picMin}-${r.ref.picMax} • SL ${r.ref.slMin}-${r.ref.slMax}`);
      console.log(`  DIAG: pic ${r.diag.picDiag} • SL ${r.diag.slDiag}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    allPrem.push({ ...p, error: e.message });
  }
}

const out = { date: new Date().toISOString(), plans1805: all1805, plansPrem: allPrem };
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-19-plans-case-by-case.json', JSON.stringify(out, null, 2));
console.log(`\nRaw data → /Users/romanemarino/Coach-Running-IA/audit-19-plans-case-by-case.json`);
console.log(`✅ Done. 1805=${all1805.length} • PREM=${allPrem.length}`);
