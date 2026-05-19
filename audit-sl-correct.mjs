import { readFileSync } from 'fs';

const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', 'utf-8'));

const MAX_SL_DURATION = {
  '5K':        { deb: 50, inter: 60, conf: 70, expert: 75 },
  '10K':       { deb: 60, inter: 75, conf: 85, expert: 90 },
  'Semi':      { deb: 90, inter: 105, conf: 115, expert: 120 },
  'Marathon':  { deb: 150, inter: 170, conf: 190, expert: 200 },
  'Hyrox':     { deb: 55, inter: 65, conf: 75, expert: 80 },
  'VK':        { deb: 60, inter: 80, conf: 100, expert: 120 },
  'TrailSteep':{ deb: 75, inter: 100, conf: 120, expert: 140 },
  'Trail<30':  { deb: 90, inter: 120, conf: 140, expert: 150 },
  'Trail30+':  { deb: 140, inter: 190, conf: 220, expert: 240 },
  'Trail60+':  { deb: 150, inter: 240, conf: 270, expert: 300 },
  'Trail100+': { deb: 180, inter: 300, conf: 360, expert: 480 },
  'PertePoids':{ deb: 60, inter: 75, conf: 90, expert: 105 },
  'Maintien':  { deb: 50, inter: 70, conf: 80, expert: 90 },
};

function getObjectiveKey(plan) {
  const goal = plan.goal || '';
  const dist = plan.distance || '';
  const u = plan.user || {};
  const td = u.trailDistance || 0;
  const isTrail = goal.includes('Trail');
  if (goal.includes('Perte')) return 'PertePoids';
  if (goal.includes('Maintien')) return 'Maintien';
  if (goal.includes('Hyrox')) return 'Hyrox';
  if (isTrail) {
    if (td >= 100) return 'Trail100+';
    if (td >= 60) return 'Trail60+';
    if (td >= 30) return 'Trail30+';
    return 'Trail<30';
  }
  const d = dist.toLowerCase();
  if (d.includes('marathon') && !d.includes('semi')) return 'Marathon';
  if (d.includes('semi')) return 'Semi';
  if (d.includes('10')) return '10K';
  if (d.includes('5')) return '5K';
  return '5K';
}

function getLvlKey(level) {
  if (!level) return 'inter';
  if (level.includes('Débutant')) return 'deb';
  if (level.includes('Intermédiaire')) return 'inter';
  if (level.includes('Confirmé')) return 'conf';
  if (level.includes('Expert')) return 'expert';
  return 'inter';
}

// SL peak coach target (km) — réaliste pour pouvoir finir/performer
function coachSLTarget(plan) {
  const u = plan.user || {};
  const obj = getObjectiveKey(plan);
  const lvl = getLvlKey(u.level);
  const td = u.trailDistance || 0;
  // Cibles minimales pour pouvoir aborder la course en sécurité
  const targets = {
    'Marathon':  { deb: 26, inter: 28, conf: 32, expert: 35 },
    'Semi':      { deb: 14, inter: 15, conf: 17, expert: 18 },
    '10K':       { deb: 10, inter: 12, conf: 14, expert: 15 },
    '5K':        { deb: 7, inter: 8, conf: 10, expert: 12 },
    'Hyrox':     { deb: 6, inter: 7, conf: 8, expert: 10 },
    'PertePoids':{ deb: 6, inter: 8, conf: 10, expert: 12 },
    'Maintien':  { deb: 6, inter: 8, conf: 10, expert: 12 },
  };
  if (targets[obj]) return targets[obj][lvl];
  // Trail
  if (obj === 'Trail100+') return 40;
  if (obj === 'Trail60+') return Math.max(25, Math.round(td * 0.40));
  if (obj === 'Trail30+') return Math.max(18, Math.round(td * 0.45));
  if (obj === 'Trail<30') return Math.max(10, Math.round(td * 0.55));
  return 10;
}

const CRITICAL_IDS = [
  '1778846413141','1778441786486','1778437313058','1778571577227','1778574019379',
  '1778445060420','1778677412470','1778422885365','1778654000218','1778669503908',
  '1778578676672','1778430589776','1777043776160','1778085118200','1778351092726',
  '1778429788661','1778423745051','1778505133265','1778425804791','1778485151731',
  '1778264379970','1776889642333','1778250764802','1778446762158','1778702412108',
  '1778852278323','1778695294712','1778771945613','1778673418021','1778436722110',
];

console.log('SL peak théorique (code) vs cible coach — 30 plans critiques\n');
console.log('Email | Obj | Niv | VMA | slMaxDur(min) | SL_theo_code(km) | SL_cible_coach(km) | Verdict');
console.log('-'.repeat(140));

for (const id of CRITICAL_IDS) {
  const p = plans.find(x => x.id === id);
  if (!p) { console.log(`${id} NOT FOUND`); continue; }
  const u = p.user || {};
  const obj = getObjectiveKey(p);
  const lvl = getLvlKey(u.level);
  const slMaxDur = MAX_SL_DURATION[obj]?.[lvl] || 90;
  const vma = p.vma || u.vma || 0;
  const efSpeed = vma * 0.75;
  // Formule code : peak SL = slMaxDur × 1.0 / 60 × efSpeed (en pic réel, sans realisticFactor 0.7 qui est pour le volume)
  // En réalité une SL au pic atteint la durée max
  const slTheoCode = (slMaxDur / 60) * efSpeed;
  const target = coachSLTarget(p);
  const verdict = slTheoCode < target * 0.85 ? '🔴 SOUS' : slTheoCode > target * 1.4 ? '⚠️ très long' : '🟢 OK';
  console.log(`${(p.userEmail||'').padEnd(36)} | ${obj.padEnd(11)} | ${lvl.padEnd(6)} | ${vma.toFixed(1).padStart(5)} | ${String(slMaxDur).padStart(4)} | ${slTheoCode.toFixed(1).padStart(6)} | ${String(target).padStart(4)} | ${verdict}`);
}
