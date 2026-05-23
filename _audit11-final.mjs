import fs from 'fs';
const d = JSON.parse(fs.readFileSync('/Users/romanemarino/Coach-Running-IA/audit11-extracted2.json'));

function maskEmail(e) {
  const [u,dom] = e.split('@');
  return u.slice(0,3) + '***@' + (dom||'').slice(0,3);
}

function paceToSec(p) {
  if (!p) return null;
  if (typeof p === 'number') return p;
  const s = String(p);
  // expects "5:30/km" or "5'30"" or "5:30"
  const m = s.match(/(\d+)[:'](\d{1,2})/);
  if (m) return Number(m[1])*60 + Number(m[2]);
  return null;
}

function paceFromTime(timeStr, distKm) {
  if (!timeStr) return null;
  // "3h30", "1h45", "44min", "22min", "0:44:00"
  let totalSec = null;
  let m = String(timeStr).match(/^(\d+)h(\d{1,2})?$/i);
  if (m) totalSec = Number(m[1])*3600 + (m[2]?Number(m[2])*60:0);
  if (!totalSec) { m = String(timeStr).match(/^(\d+)min$/i); if (m) totalSec = Number(m[1])*60; }
  if (!totalSec) { m = String(timeStr).match(/^(\d+):(\d{1,2}):(\d{1,2})$/); if (m) totalSec = Number(m[1])*3600+Number(m[2])*60+Number(m[3]); }
  if (!totalSec) return null;
  return totalSec / distKm;
}

const subgoalToDist = { Marathon: 42.195, 'Semi-Marathon': 21.0975, '10km': 10, '10K': 10, '5km': 5, '5K': 5 };

console.log('## RAW SUMMARIES');
for (const p of d) {
  if (p.status === 'NO_PLAN') { console.log(`\n--- ${p.email} : NO PLAN ---`); continue; }
  const qs = p.generationContext.raw.questionnaireSnapshot || {};
  const gc = p.generationContext.raw || {};
  const fz = p.feasibility || {};
  const wv = p.weeklyVolumes || [];
  const maxVol = Math.max(...wv);
  const s1 = wv[0] || 0;
  const sl1 = p.week1 ? (p.week1.sessions||[]).reduce((m,s)=>Math.max(m, Number(s.distance||0)), 0) : 0;
  const sessions = p.week1 ? p.week1.sessions : [];
  const sessionTypes = sessions.map(s=>s.type||'').join(',');
  const sessionTitles = sessions.map(s=>s.title||'').join(' | ');

  // Pace check
  const dist = qs.distance || qs.trailDetails?.distance || subgoalToDist[qs.goal] || subgoalToDist[p.goal];
  const targetSec = p.targetTime ? paceFromTime(p.targetTime, dist) : null;
  const targetPace = targetSec ? `${Math.floor(targetSec/60)}:${String(Math.round(targetSec%60)).padStart(2,'0')}/km` : null;

  // Paces stored
  const paces = p.paces || {};
  const pacesStr = Object.entries(paces).slice(0,15).map(([k,v])=>`${k}=${typeof v==='object'?JSON.stringify(v).slice(0,80):v}`).join('; ');

  // Max jump %
  let maxJumpPct = 0;
  for (let i=1;i<wv.length;i++) {
    if (wv[i-1]>0) { const pct=(wv[i]-wv[i-1])/wv[i-1]*100; if (pct>maxJumpPct) maxJumpPct=pct; }
  }

  console.log(`\n--- ${p.email} (${p.label}) ---`);
  console.log('createdAt:', p.createdAt);
  console.log('goal:', p.goal, '| target:', p.targetTime, '| raceDate:', p.raceDate, '| name:', p.planName);
  console.log('profile:', `niveau=${qs.level} age=${qs.age} sex=${qs.sex} poids=${qs.weight} taille=${qs.height} freq=${qs.frequency} curVol=${qs.currentWeeklyVolume} vma=${qs.vma?.toFixed(1)} BMI=${qs.weight&&qs.height?(qs.weight/((qs.height/100)**2)).toFixed(1):'?'}`);
  console.log('PB:', JSON.stringify(qs.recentRaceTimes||{}));
  console.log('injuries:', JSON.stringify(qs.injuries||{}));
  console.log('trailDetails:', JSON.stringify(qs.trailDetails||{}));
  console.log('dist (computed):', dist, 'km, targetPace:', targetPace);
  console.log('paces stored:', pacesStr);
  console.log('weeklyVolumes (' + wv.length + 'w):', wv.map(v=>Math.round(v)).join(','));
  console.log('S1 vol:', s1, 'pic:', maxVol, 'SL1:', sl1, 'maxJump:', maxJumpPct.toFixed(0)+'%');
  console.log('feasibility:', fz.status, '| score:', fz.score, '| msg:', (fz.message||'').slice(0,250));
  console.log('S1 sessions (' + sessions.length + '):');
  for (const s of sessions) {
    console.log('  -', s.day || '?', '|', s.type, '|', s.title, '|', s.distance, 'km/', s.duration, 'min');
    if (s.mainSet) console.log('     MAIN:', s.mainSet.slice(0,200));
  }
  console.log('welcomeMessage:', p.welcomeMessage.slice(0,1500).replace(/\n+/g,' / '));
}
