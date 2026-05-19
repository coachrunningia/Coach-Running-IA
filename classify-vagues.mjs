import { readFileSync, writeFileSync } from 'fs';

const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', 'utf-8'));

const MAX_SL_DURATION = {
  '5K':        { deb: 50, inter: 60, conf: 70, expert: 75 },
  '10K':       { deb: 60, inter: 75, conf: 85, expert: 90 },
  'Semi':      { deb: 90, inter: 105, conf: 115, expert: 120 },
  'Marathon':  { deb: 150, inter: 170, conf: 190, expert: 200 },
  'Hyrox':     { deb: 55, inter: 65, conf: 75, expert: 80 },
  'Trail<30':  { deb: 90, inter: 120, conf: 140, expert: 150 },
  'Trail30+':  { deb: 140, inter: 190, conf: 220, expert: 240 },
  'Trail60+':  { deb: 150, inter: 240, conf: 270, expert: 300 },
  'Trail100+': { deb: 180, inter: 300, conf: 360, expert: 480 },
  'PertePoids':{ deb: 60, inter: 75, conf: 90, expert: 105 },
  'Maintien':  { deb: 50, inter: 70, conf: 80, expert: 90 },
};

const getObj = p => {
  const goal = p.goal || '', dist = (p.distance||'').toLowerCase(), td = p.user?.trailDistance || 0;
  if (goal.includes('Perte')) return 'PertePoids';
  if (goal.includes('Maintien')) return 'Maintien';
  if (goal.includes('Hyrox')) return 'Hyrox';
  if (goal.includes('Trail')) return td >= 100 ? 'Trail100+' : td >= 60 ? 'Trail60+' : td >= 30 ? 'Trail30+' : 'Trail<30';
  if (dist.includes('marathon') && !dist.includes('semi')) return 'Marathon';
  if (dist.includes('semi')) return 'Semi';
  if (dist.includes('10')) return '10K';
  return '5K';
};
const getLvl = l => !l ? 'inter' : l.includes('Débutant') ? 'deb' : l.includes('Intermédiaire') ? 'inter' : l.includes('Confirmé') ? 'conf' : l.includes('Expert') ? 'expert' : 'inter';
const bmi = (w,h) => (w&&h) ? w/Math.pow(h/100,2) : 0;

function idealPeakVol(plan) {
  const u = plan.user || {};
  const obj = getObj(plan), lvl = getLvl(u.level);
  const T = {
    Marathon:  { deb: 35, inter: 48, conf: 62, expert: 80 },
    Semi:      { deb: 22, inter: 33, conf: 45, expert: 58 },
    '10K':     { deb: 22, inter: 32, conf: 40, expert: 58 },
    '5K':      { deb: 18, inter: 26, conf: 34, expert: 44 },
    Hyrox:     { deb: 18, inter: 26, conf: 36, expert: 46 },
    PertePoids:{ deb: 15, inter: 20, conf: 25, expert: 30 },
    Maintien:  { deb: 18, inter: 25, conf: 28, expert: 32 },
    'Trail<30':{ deb: 25, inter: 32, conf: 45, expert: 58 },
    'Trail30+':{ deb: 35, inter: 42, conf: 55, expert: 70 },
    'Trail60+':{ deb: 50, inter: 55, conf: 70, expert: 90 },
    'Trail100+':{deb: 60, inter: 65, conf: 80, expert: 100 },
  };
  let v = T[obj]?.[lvl] || 25;
  // Réductions
  let f = 1;
  if (!u.targetTime?.trim() && !['PertePoids','Maintien'].includes(obj)) f *= 0.80;
  if (u.age >= 65) f *= 0.75;
  else if (u.age >= 55) f *= 0.85;
  const b = bmi(u.weight, u.height);
  if (b >= 35) f *= 0.65;
  else if (b >= 30) f *= 0.80;
  if (u.hasInjury) f *= 0.75;
  return Math.round(v * f);
}

function coachSLTarget(p) {
  const u = p.user || {}, obj = getObj(p), lvl = getLvl(u.level), td = u.trailDistance || 0;
  const T = {
    Marathon:  { deb: 26, inter: 28, conf: 32, expert: 35 },
    Semi:      { deb: 14, inter: 15, conf: 17, expert: 18 },
    '10K':     { deb: 10, inter: 12, conf: 14, expert: 15 },
    '5K':      { deb: 7, inter: 8, conf: 10, expert: 12 },
    Hyrox:     { deb: 6, inter: 7, conf: 8, expert: 10 },
    PertePoids:{ deb: 6, inter: 8, conf: 10, expert: 12 },
    Maintien:  { deb: 6, inter: 8, conf: 10, expert: 12 },
  };
  if (T[obj]) return T[obj][lvl];
  if (obj === 'Trail100+') return 40;
  if (obj === 'Trail60+') return Math.max(25, Math.round(td * 0.40));
  if (obj === 'Trail30+') return Math.max(18, Math.round(td * 0.45));
  if (obj === 'Trail<30') return Math.max(10, Math.round(td * 0.55));
  return 10;
}

const vague1 = [];
const vague2 = [];
const skipped = [];

for (const p of plans) {
  const u = p.user || {};
  const idealPeak = idealPeakVol(p);
  const actualPeak = p.periodization.actualPeak || p.periodization.peakKm || 0;
  const peakRatio = actualPeak / idealPeak;
  const obj = getObj(p), lvl = getLvl(u.level);
  const slMaxDur = MAX_SL_DURATION[obj]?.[lvl] || 90;
  const vma = p.vma || u.vma || 0;
  const slTheo = (slMaxDur / 60) * (vma * 0.75);
  const slTarget = coachSLTarget(p);
  const slRatio = slTheo / slTarget;
  const b = bmi(u.weight, u.height);

  // Détection chrono saisi aberrant
  const chronoAberrant = ['chrono5km','chrono10km','chronoSemi','chronoMarathon']
    .some(k => {
      const c = u[k]; if (!c) return false;
      const hMatch = /(\d+)h(\d+)/.exec(c); if (!hMatch) return false;
      const h = parseInt(hMatch[1]);
      if (k === 'chrono5km' && h >= 1) return true;
      if (k === 'chrono10km' && h >= 2) return true;
      if (k === 'chronoSemi' && h >= 4) return true;
      if (k === 'chronoMarathon' && h >= 8) return true;
      return false;
    });

  // Délai vs objectif aberrant
  const dist = (p.distance||'').toLowerCase();
  const isMaraInDist = dist.includes('marathon') && !dist.includes('semi');
  const delaiAberrant =
    (isMaraInDist && p.durationWeeks < 12 && lvl === 'deb') ||
    (isMaraInDist && p.durationWeeks < 8) ||
    (obj === 'Trail60+' && p.durationWeeks < 12) ||
    (obj === 'Trail100+' && p.durationWeeks < 20);

  // Niveau auto-déclaré vs chronos
  let levelMismatch = false;
  if (u.chrono5km) {
    const m = /(\d+):(\d+)/.exec(u.chrono5km);
    if (m && !/h/i.test(u.chrono5km)) {
      const totSec = parseInt(m[1]) * 60 + parseInt(m[2]);
      if (lvl === 'expert' && totSec > 21*60) levelMismatch = true;
      if (lvl === 'conf' && totSec > 25*60) levelMismatch = true;
    }
  }

  const flags = [];
  if (peakRatio > 1.15 && u.hasInjury) flags.push(`VOLUME_BLESSURE_SUR (${actualPeak}/${idealPeak} ratio ${peakRatio.toFixed(2)})`);
  else if (peakRatio > 1.20) flags.push(`VOLUME_SUR (${actualPeak}/${idealPeak})`);
  else if (peakRatio < 0.65) flags.push(`VOLUME_SOUS (${actualPeak}/${idealPeak})`);
  if (slRatio < 0.75) flags.push(`SL_SOUS (${slTheo.toFixed(1)}/${slTarget})`);
  if (chronoAberrant) flags.push(`CHRONO_ABERRANT`);
  if (delaiAberrant) flags.push(`DELAI_ABERRANT`);
  if (levelMismatch) flags.push(`NIVEAU_MISMATCH`);
  if (b >= 35 && peakRatio > 1.0) flags.push(`IMC_SEVERE_VOL_HIGH`);

  const hasMajorIssue = flags.length > 0;
  const hasInjuryOnly = u.hasInjury && !hasMajorIssue;

  const data = { id: p.id, email: p.userEmail, goal: p.goal, dist: p.distance, dur: p.durationWeeks, lvl: u.level, peak: actualPeak, idealPeak, peakRatio: peakRatio.toFixed(2), slTheo: slTheo.toFixed(1), slTarget, hasInjury: u.hasInjury, injury: u.injuryDescription, flags };

  if (hasMajorIssue) vague1.push(data);
  else if (hasInjuryOnly) vague2.push(data);
  else skipped.push(data);
}

console.log(`\n## VAGUE 1 — URGENT (${vague1.length} plans)\n`);
vague1.sort((a,b) => b.flags.length - a.flags.length);
vague1.forEach((d,i) => console.log(`${i+1}. ${d.email} | ${d.goal}/${d.dist} ${d.dur}sem | ${d.lvl} | peak=${d.peak}/${d.idealPeak} (${d.peakRatio}x) | inj=${d.hasInjury?'OUI':'non'} | flags: ${d.flags.join(', ')}`));

console.log(`\n## VAGUE 2 — Blessure active sans autre anomalie (${vague2.length} plans)\n`);
vague2.forEach((d,i) => console.log(`${i+1}. ${d.email} | ${d.goal}/${d.dist} | peak=${d.peak}/${d.idealPeak} | injury: ${(d.injury||'').substring(0,60)}`));

console.log(`\n## Total flag: V1=${vague1.length}, V2=${vague2.length}, OK=${skipped.length}`);
writeFileSync('/Users/romanemarino/Coach-Running-IA/vagues.json', JSON.stringify({ vague1, vague2 }, null, 2));
