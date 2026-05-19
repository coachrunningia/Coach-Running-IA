/**
 * AUDIT : identifie tous les plans affectés par le bug pace asymétrique
 * (commit 94af713 du 24 avril, fix local non déployé).
 *
 * Critères d'affectation :
 *   - targetTime non vide ET ≠ Finisher
 *   - subGoal ∈ {5 km, 10 km, Semi-Marathon, Marathon}
 *   - Allure cible plus rapide que potentiel VMA → bug : pace stockée = potentiel VMA au lieu de cible
 *
 * On tolère 5s/km d'écart (arrondi pace).
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
  if(v.arrayValue) return (v.arrayValue.values||[]).map(pv);
  if(v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(f){ if(!f) return {}; const o={}; for(const [k,v] of Object.entries(f)) o[k]=pv(v); return o; }

// timeToSeconds : reproduction simplifiée du code Coach-Running-IA
function timeToSeconds(timeStr, distance) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  // Formats supportés : "3h30", "3h30m", "1h59", "1h45", "2:00:00", "1:45"
  const hm = s.match(/(\d+)\s*h\s*(\d{0,2})/);
  if (hm) {
    const h = parseInt(hm[1]);
    const m = hm[2] ? parseInt(hm[2]) : 0;
    return h * 3600 + m * 60;
  }
  const hms = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (hms) return parseInt(hms[1])*3600 + parseInt(hms[2])*60 + parseInt(hms[3]);
  const ms = s.match(/^(\d+):(\d{1,2})$/);
  if (ms) {
    // Si distance ≥ 10, c'est "MM:SS" qui n'a pas de sens (>1h). Plus probable HH:MM.
    if (distance >= 21) return parseInt(ms[1])*3600 + parseInt(ms[2])*60;
    return parseInt(ms[1])*60 + parseInt(ms[2]);
  }
  return 0;
}

function paceToSec(p) {
  if (!p) return null;
  const m = String(p).match(/(\d+)\s*[:'’]\s*(\d+)/);
  return m ? parseInt(m[1])*60 + parseInt(m[2]) : null;
}
function secondsToPace(s) {
  if (!s || s <= 0) return '0:00';
  const m = Math.floor(s/60), sec = Math.round(s%60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}

const raceMap = {
  '5 km':         { dist: 5, paceKey: 'allureSpecifique5k', vmaPct: 0.95 },
  '10 km':        { dist: 10, paceKey: 'allureSpecifique10k', vmaPct: 0.90 },
  'semi-marathon':{ dist: 21.097, paceKey: 'allureSpecifiqueSemi', vmaPct: 0.85 },
  'marathon':     { dist: 42.195, paceKey: 'allureSpecifiqueMarathon', vmaPct: 0.80 },
};

const FINISHER_TIMES = ['finisher','finish','terminer','la finir','arriver'];

// Fetch tous les plans par pagination (Firestore documents:list)
async function fetchAll() {
  const all = [];
  let pageToken = null;
  let pages = 0;
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`;
    const r = await fetch(url, { headers: H });
    const j = await r.json();
    if (j.documents) all.push(...j.documents);
    pageToken = j.nextPageToken;
    pages++;
    if (pages > 100) { console.error('safety break — trop de pages'); break; }
  } while (pageToken);
  return all;
}

console.log(`Fetch plans…`);
const docs = await fetchAll();
console.log(`Total plans : ${docs.length}`);

const buggy = [];
const ok = [];
const skipped = [];

for (const doc of docs) {
  const p = pf(doc.fields);
  const id = doc.name.split('/').pop();
  const snap = p.generationContext?.questionnaireSnapshot || {};
  const targetTime = p.targetTime || snap.targetTime;
  const subGoal = (p.subGoal || snap.subGoal || '').toString();
  const goal = (p.goal || snap.goal || '').toString();
  const vma = p.vma || snap.vma;
  const paces = p.paces || {};

  if (!targetTime || !subGoal || !vma || !paces) { skipped.push({id, why:'missing field'}); continue; }
  if (FINISHER_TIMES.some(f => String(targetTime).toLowerCase().includes(f))) { skipped.push({id, why:'finisher'}); continue; }

  const normalized = subGoal.toLowerCase().replace(/\s+/g, ' ').trim();
  const info = raceMap[normalized];
  if (!info) { skipped.push({id, why:`subGoal "${subGoal}" inconnu`}); continue; }

  const targetSec = timeToSeconds(targetTime, info.dist);
  if (targetSec === 0) { skipped.push({id, why:`targetTime "${targetTime}" non parsé`}); continue; }
  const targetPaceSec = targetSec / info.dist;

  const currentPaceStr = paces[info.paceKey];
  const currentPaceSec = paceToSec(currentPaceStr);
  if (!currentPaceSec) { skipped.push({id, why:`pace ${info.paceKey} absent`}); continue; }

  // Diff
  const diffSec = currentPaceSec - targetPaceSec; // positif = pace stockée plus lente que cible (= bug si cible ambitieuse)
  const tolerance = 5; // 5s/km

  if (Math.abs(diffSec) <= tolerance) {
    ok.push({id, email: p.userEmail, subGoal, targetTime, currentPaceStr, targetPaceStr: secondsToPace(targetPaceSec)});
    continue;
  }

  // Vérif que pace stockée = potentiel VMA (signal du bug)
  const vmaImpliedPaceSec = 3600 / (vma * info.vmaPct);
  const matchesVMAPotential = Math.abs(currentPaceSec - vmaImpliedPaceSec) <= tolerance;

  if (diffSec > 0 && matchesVMAPotential) {
    // BUG : cible plus rapide que potentiel, pace stockée = potentiel (override non appliqué)
    buggy.push({
      id, email: p.userEmail,
      goal, subGoal, targetTime,
      vma: vma.toFixed?.(2) ?? vma,
      pacesPotentiel: currentPaceStr,
      paceCible: secondsToPace(targetPaceSec),
      diffSec: Math.round(diffSec),
      diffStr: `${Math.round(diffSec)}s/km plus lent`,
      isPreview: p.isPreview,
      fullPlanGenerated: p.fullPlanGenerated,
      createdAt: p.createdAt,
      feasibilityStatus: p.feasibility?.status,
      feasibilityScore: p.feasibility?.score ?? p.confidenceScore,
    });
  } else if (diffSec > 0) {
    // Pace stockée plus lente mais ne correspond pas exactement au potentiel : zone grise
    ok.push({id, email: p.userEmail, subGoal, targetTime, currentPaceStr, note: `pace plus lente que cible mais ne match pas potentiel VMA exactement`});
  } else {
    // diff négatif : pace stockée plus rapide que cible (rare, pas le bug en question)
    ok.push({id, email: p.userEmail, subGoal, targetTime, currentPaceStr, note: `pace plus rapide que cible (override appliqué ?)`});
  }
}

console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
console.log(`  RÉSULTAT AUDIT BUG PACE ASYMÉTRIQUE`);
console.log(`══════════════════════════════════════════════════════════════════════════════`);
console.log(`  Total plans      : ${docs.length}`);
console.log(`  Skipped          : ${skipped.length} (Finisher, sans targetTime, etc.)`);
console.log(`  OK               : ${ok.length}`);
console.log(`  🔴 BUGGÉS        : ${buggy.length}`);

if (buggy.length) {
  console.log(`\n┌────────────────────┬──────────────────────────────────┬──────────────┬──────────┬───────────┬──────────┬─────────┬──────────────────┐`);
  console.log(`│ planId             │ email                            │ subGoal      │ target   │ paceStock │ paceCible│ Δ s/km  │ feasibilityStatus│`);
  console.log(`├────────────────────┼──────────────────────────────────┼──────────────┼──────────┼───────────┼──────────┼─────────┼──────────────────┤`);
  for (const b of buggy) {
    console.log(`│ ${b.id.padEnd(18)} │ ${(b.email||'?').substring(0,32).padEnd(32)} │ ${b.subGoal.padEnd(12)} │ ${String(b.targetTime).padEnd(8)} │ ${String(b.pacesPotentiel).padEnd(9)} │ ${String(b.paceCible).padEnd(8)} │ ${String('+'+b.diffSec).padEnd(7)} │ ${String(b.feasibilityStatus||'?').padEnd(16)} │`);
  }
  console.log(`└────────────────────┴──────────────────────────────────┴──────────────┴──────────┴───────────┴──────────┴─────────┴──────────────────┘`);
}

writeFileSync('audit-pace-bug.json', JSON.stringify({ buggy, ok: ok.length, skipped: skipped.length, total: docs.length }, null, 2));
console.log(`\n📝 audit-pace-bug.json (détail des ${buggy.length} plans buggés)`);
