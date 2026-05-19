import { readFileSync } from 'fs';
const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const premium = all.filter(p => p.fullPlanGenerated === true);

const norm = (s) => String(s || '?').trim();

console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
console.log(`║  INVENTAIRE TYPOLOGIES — 82 plans premium                            ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════╝\n`);

// === 1. Objectifs ===
const goalCount = {};
premium.forEach(p => { const g = norm(p.goal); goalCount[g] = (goalCount[g]||0)+1; });
console.log(`── 1. Répartition par objectif ──`);
Object.entries(goalCount).sort((a,b) => b[1]-a[1]).forEach(([k,n]) => console.log(`  ${n.toString().padStart(3)} × ${k}`));

// === 2. Niveaux ===
const lvlCount = {};
premium.forEach(p => {
  const lvl = norm(p.generationContext?.questionnaireSnapshot?.level || p.level);
  lvlCount[lvl] = (lvlCount[lvl]||0)+1;
});
console.log(`\n── 2. Répartition par niveau ──`);
Object.entries(lvlCount).sort((a,b) => b[1]-a[1]).forEach(([k,n]) => console.log(`  ${n.toString().padStart(3)} × ${k}`));

// === 3. Croisement objectif × niveau ===
console.log(`\n── 3. Croisement objectif × niveau ──`);
const matrix = {};
premium.forEach(p => {
  const g = norm(p.goal);
  const l = norm(p.generationContext?.questionnaireSnapshot?.level || p.level);
  const key = `${g}||${l}`;
  matrix[key] = (matrix[key]||0)+1;
});
const goals = [...new Set(Object.keys(matrix).map(k => k.split('||')[0]))];
const levels = [...new Set(Object.keys(matrix).map(k => k.split('||')[1]))];
const lvlOrder = ['Débutant', 'Intermédiaire (Régulier)', 'Confirmé (Compétition)', 'Expert', '?'];
const lvlSorted = lvlOrder.filter(l => levels.some(x => x === l)).concat(levels.filter(l => !lvlOrder.includes(l)));
const header = ['Objectif'.padEnd(20), ...lvlSorted.map(l => l.substring(0,12).padStart(13))].join('|');
console.log(`  ${header}`);
console.log(`  ${'-'.repeat(header.length)}`);
for (const g of goals.sort()) {
  const row = [g.padEnd(20)];
  for (const l of lvlSorted) {
    const n = matrix[`${g}||${l}`] || 0;
    row.push((n || '').toString().padStart(13));
  }
  console.log(`  ${row.join('|')}`);
}

// === 4. Sous-objectifs (subGoal, trailDistance) ===
console.log(`\n── 4. Sous-types détaillés ──`);
const sub = {};
premium.forEach(p => {
  const qs = p.generationContext?.questionnaireSnapshot || {};
  let label = norm(p.goal);
  if (p.subGoal) label += ` / ${p.subGoal}`;
  if (qs.trailDistance) label += ` ${qs.trailDistance}km`;
  if (qs.trailElevation || qs.trailDplus) label += ` ${qs.trailElevation || qs.trailDplus}D+`;
  if (p.targetTime && p.targetTime !== 'Finisher') label += ` (${p.targetTime})`;
  sub[label] = (sub[label]||0)+1;
});
Object.entries(sub).sort((a,b) => b[1]-a[1]).forEach(([k,n]) => console.log(`  ${n.toString().padStart(3)} × ${k}`));

// === 5. Distribution VMA ===
console.log(`\n── 5. VMA par niveau ──`);
const vmaByLvl = {};
premium.forEach(p => {
  const lvl = norm(p.generationContext?.questionnaireSnapshot?.level || p.level);
  if (!vmaByLvl[lvl]) vmaByLvl[lvl] = [];
  if (typeof p.vma === 'number') vmaByLvl[lvl].push(p.vma);
});
for (const lvl of lvlSorted) {
  const vmas = vmaByLvl[lvl] || [];
  if (vmas.length === 0) continue;
  const sorted = [...vmas].sort((a,b) => a-b);
  console.log(`  ${lvl.padEnd(28)} n=${vmas.length.toString().padStart(2)}  min=${sorted[0].toFixed(1)} med=${sorted[Math.floor(sorted.length/2)].toFixed(1)} max=${sorted[sorted.length-1].toFixed(1)}`);
}

// === 6. Durée plan par objectif ===
console.log(`\n── 6. Durée plan par objectif ──`);
const durByGoal = {};
premium.forEach(p => {
  const g = norm(p.goal);
  if (!durByGoal[g]) durByGoal[g] = [];
  if (typeof p.durationWeeks === 'number') durByGoal[g].push(p.durationWeeks);
});
for (const [g, durs] of Object.entries(durByGoal).sort((a,b) => b[1].length-a[1].length)) {
  const sorted = [...durs].sort((a,b) => a-b);
  console.log(`  ${g.padEnd(22)} n=${durs.length.toString().padStart(2)}  min=${sorted[0]}  med=${sorted[Math.floor(sorted.length/2)]}  max=${sorted[sorted.length-1]}`);
}

// === 7. Fréquence ===
console.log(`\n── 7. Fréquence (séances/sem) ──`);
const freqCount = {};
premium.forEach(p => { const f = `${p.sessionsPerWeek || '?'}x`; freqCount[f] = (freqCount[f]||0)+1; });
Object.entries(freqCount).sort((a,b) => a[0].localeCompare(b[0])).forEach(([k,n]) => console.log(`  ${k.padEnd(4)} ${n}`));

// === 8. targetTime renseigné ? ===
const withTarget = premium.filter(p => p.targetTime && p.targetTime !== 'Finisher').length;
const finisher = premium.filter(p => p.targetTime === 'Finisher').length;
console.log(`\n── 8. Cible chiffrée ──`);
console.log(`  Avec targetTime: ${withTarget}/${premium.length}`);
console.log(`  "Finisher":      ${finisher}/${premium.length}`);
console.log(`  Aucun:           ${premium.length - withTarget - finisher}/${premium.length}`);
