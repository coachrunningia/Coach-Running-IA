import { readFileSync, writeFileSync } from 'fs';

const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', 'utf-8'));

const MAX_WEEKLY_VOLUME = {
  '5K':        { deb: 25, inter: 40, conf: 46, expert: 60 },
  '10K':       { deb: 30, inter: 50, conf: 55, expert: 65 },
  'Semi':      { deb: 35, inter: 55, conf: 60, expert: 70 },
  'Marathon':  { deb: 45, inter: 65, conf: 75, expert: 85 },
  'Hyrox':     { deb: 19, inter: 30, conf: 38, expert: 42 },
  'Trail<30':  { deb: 35, inter: 50, conf: 55, expert: 65 },
  'Trail30+':  { deb: 45, inter: 60, conf: 70, expert: 80 },
  'Trail60+':  { deb: 45, inter: 55, conf: 70, expert: 100 },
  'Trail100+': { deb: 55, inter: 75, conf: 95, expert: 120 },
  'PertePoids':{ deb: 25, inter: 40, conf: 50, expert: 60 },
  'Maintien':  { deb: 25, inter: 40, conf: 45, expert: 55 },
};

const MAX_SL_DURATION = {
  '5K':{deb:50,inter:60,conf:70,expert:75},'10K':{deb:60,inter:75,conf:85,expert:90},
  'Semi':{deb:90,inter:105,conf:115,expert:120},'Marathon':{deb:150,inter:170,conf:190,expert:200},
  'Hyrox':{deb:55,inter:65,conf:75,expert:80},'Trail<30':{deb:90,inter:120,conf:140,expert:150},
  'Trail30+':{deb:140,inter:190,conf:220,expert:240},'Trail60+':{deb:150,inter:240,conf:270,expert:300},
  'Trail100+':{deb:180,inter:300,conf:360,expert:480},'PertePoids':{deb:60,inter:75,conf:90,expert:105},
  'Maintien':{deb:50,inter:70,conf:80,expert:90},
};

const getObj = p => {
  const goal = p.goal||'', dist = (p.distance||'').toLowerCase(), td = p.user?.trailDistance || 0;
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

function slCoachTarget(p) {
  const u = p.user || {}, obj = getObj(p), lvl = getLvl(u.level), td = u.trailDistance || 0;
  const T = { Marathon:{deb:26,inter:28,conf:32,expert:35}, Semi:{deb:14,inter:15,conf:17,expert:18},
    '10K':{deb:10,inter:12,conf:14,expert:15}, '5K':{deb:7,inter:8,conf:10,expert:12},
    Hyrox:{deb:6,inter:7,conf:8,expert:10}, PertePoids:{deb:6,inter:8,conf:10,expert:12},
    Maintien:{deb:6,inter:8,conf:10,expert:12} };
  if (T[obj]) return T[obj][lvl];
  if (obj === 'Trail100+') return 40;
  if (obj === 'Trail60+') return Math.max(25, Math.round(td * 0.40));
  if (obj === 'Trail30+') return Math.max(18, Math.round(td * 0.45));
  return Math.max(10, Math.round(td * 0.55));
}

const v1 = [];
const v2 = [];
const ok = [];

for (const p of plans) {
  const u = p.user || {};
  const obj = getObj(p), lvl = getLvl(u.level);
  const peak = p.periodization.actualPeak || p.periodization.peakKm || 0;
  const curr = u.currentWeeklyVolume || 0;
  const cap = MAX_WEEKLY_VOLUME[obj]?.[lvl] || 100;
  const b = bmi(u.weight, u.height);
  const inj = !!u.hasInjury;
  const ratio = curr > 0 ? peak / curr : null;
  const aboveCap = peak > cap * 1.10;

  const slMaxDur = MAX_SL_DURATION[obj]?.[lvl] || 90;
  const vma = p.vma || u.vma || 0;
  const slTheo = (slMaxDur / 60) * (vma * 0.75);
  const slTarget = slCoachTarget(p);
  const slSous = slTheo < slTarget * 0.75;

  // Chrono aberrant ?
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

  // Délai aberrant : Mara < 8 sem ou Mara débutant < 14 sem ou ultra 100+ < 20 sem
  const dist = (p.distance||'').toLowerCase();
  const isMara = dist.includes('marathon') && !dist.includes('semi');
  const delaiAberrant =
    (isMara && p.durationWeeks < 8) ||
    (isMara && lvl === 'deb' && p.durationWeeks < 14) ||
    (obj === 'Trail100+' && p.durationWeeks < 18) ||
    (obj === 'Trail60+' && p.durationWeeks < 10);

  // Niveau mismatch
  let levelMismatch = false;
  if (u.chrono5km && !/h/i.test(u.chrono5km)) {
    const m = /(\d+):(\d+)/.exec(u.chrono5km);
    if (m) {
      const totSec = parseInt(m[1]) * 60 + parseInt(m[2]);
      if (lvl === 'expert' && totSec > 21*60) levelMismatch = true;
      if (lvl === 'conf' && totSec > 25*60) levelMismatch = true;
    }
  }

  const flags = [];

  // SUR-dim selon profil
  if (ratio !== null) {
    if (inj && ratio > 1.30) flags.push(`SUR_BLESSE (peak ${peak}/${curr} = ${ratio.toFixed(2)}x)`);
    else if (b >= 30 && ratio > 1.30) flags.push(`SUR_IMC (peak ${peak}/${curr} = ${ratio.toFixed(2)}x, IMC ${b.toFixed(1)})`);
    else if (ratio > 2.0) flags.push(`SUR_MAJEUR (peak ${peak}/${curr} = ${ratio.toFixed(2)}x)`);
    else if (ratio > 1.6 && !inj && b < 30) flags.push(`SUR_MODERE (peak ${peak}/${curr} = ${ratio.toFixed(2)}x)`);
    if (ratio < 1.05 && !['PertePoids','Maintien'].includes(obj)) flags.push(`SOUS_DIM (peak ${peak}/${curr} = ${ratio.toFixed(2)}x — pas de progression)`);
  } else if (curr === 0) {
    // Pas de volume déclaré — uniquement vérifier cap absolu et SL
    if (peak > cap) flags.push(`AU_DESSUS_CAP (peak ${peak} > ${cap})`);
  }

  if (aboveCap && !flags.some(f => f.includes('AU_DESSUS'))) flags.push(`AU_DESSUS_CAP (peak ${peak} > ${cap})`);
  if (slSous && (lvl === 'deb' || lvl === 'inter')) flags.push(`SL_SOUS (theo ${slTheo.toFixed(1)} vs cible ${slTarget})`);
  if (chronoAberrant) flags.push(`CHRONO_ABERRANT (${[u.chrono5km,u.chrono10km,u.chronoSemi,u.chronoMarathon].filter(Boolean).join('/')})`);
  if (delaiAberrant) flags.push(`DELAI_ABERRANT (${p.durationWeeks}sem)`);
  if (levelMismatch) flags.push(`NIVEAU_MISMATCH`);

  const data = { id: p.id, email: p.userEmail, goal: p.goal, dist: p.distance, dur: p.durationWeeks, lvl: u.level, peak, curr, cap, slTheo: +slTheo.toFixed(1), slTarget, inj, injuryDesc: u.injuryDescription, imc: +b.toFixed(1), flags };

  const major = flags.length > 0;
  const injOnly = inj && !major;

  if (major) v1.push(data);
  else if (injOnly) v2.push(data);
  else ok.push(data);
}

console.log(`\n## VAGUE 1 — anomalie majeure (${v1.length} plans)\n`);
v1.sort((a,b) => b.flags.length - a.flags.length);
v1.forEach((d,i) => console.log(`${i+1}. ${d.email} | ${d.goal}/${d.dist} ${d.dur}sem ${d.lvl} | peak=${d.peak} (curr=${d.curr}, cap=${d.cap}) | inj=${d.inj?'OUI':'non'} IMC=${d.imc} | flags: ${d.flags.join(' | ')}`));

console.log(`\n## VAGUE 2 — blessure sans autre anomalie (${v2.length})\n`);
v2.forEach((d,i) => console.log(`${i+1}. ${d.email} | ${d.goal}/${d.dist} | peak=${d.peak}/${d.curr} | injury: ${(d.injuryDesc||'').substring(0,60)}`));

console.log(`\n## Total: V1=${v1.length}, V2=${v2.length}, OK=${ok.length}/${plans.length}`);

writeFileSync('/Users/romanemarino/Coach-Running-IA/vagues-v2.json', JSON.stringify({ v1, v2 }, null, 2));
