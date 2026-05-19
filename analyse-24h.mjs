import { readFileSync, writeFileSync } from 'fs';
const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));

const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => {
  const ts = p.createdAt || p._createTime;
  return ts && new Date(ts) >= since;
}).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

const premium = plans.filter(p => p.fullPlanGenerated === true);
const freemium = plans.filter(p => p.fullPlanGenerated !== true);

console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
console.log(`║  AUDIT — Plans générés dans les 24 dernières heures                          ║`);
console.log(`║  Total: ${plans.length}  •  Premium: ${premium.length}  •  Freemium: ${freemium.length}                                       ║`);
console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

console.log(`Liste:`);
plans.forEach((p, i) => {
  const t = new Date(p.createdAt).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'});
  const tag = p.fullPlanGenerated ? '💎 PREMIUM' : '🆓 freemium';
  const w = (p.weeks||[]).length;
  console.log(`  ${(i+1).toString().padStart(2)}. ${tag}  ${t}  •  ${w}/${p.durationWeeks||'?'} sem  •  ${p.name}`);
});

console.log(`\n\nPour rappel — 4 dimensions à analyser:`);
console.log(`  1. Volume total et évolution (limité à S1 sur freemium)`);
console.log(`  2. Distance plus longue course de la semaine`);
console.log(`  3. Logique des allures (cohérence %VMA, durée=dist×pace)`);
console.log(`  4. Objectifs et messages prévention (feasibility, welcomeMessage, safetyWarning)`);
