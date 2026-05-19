import { readFileSync } from 'fs';
const all = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/all-plans.json'));
const since = new Date(Date.now() - 24*60*60*1000);
const plans = all.filter(p => p.createdAt && new Date(p.createdAt) >= since).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

const weekVol = (w) => (w.sessions || []).reduce((s, x) => s + (parseFloat(String(x.distance || '0').replace(/[^0-9.]/g, '')) || 0), 0);

console.log(`\n══════════════════════════════════════════════════════════════════════`);
console.log(`  DIMENSION 1 — VOLUME TOTAL ET ÉVOLUTION`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

// === PREMIUM ===
const premium = plans.filter(p => p.fullPlanGenerated === true);
console.log(`### PREMIUM (${premium.length}) — Audit complet\n`);

for (const p of premium) {
  const peri = p.generationContext?.periodizationPlan;
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const curVol = qs.currentVolume || qs.weeklyVolume || '?';
  console.log(`\n┌─── ${p.name}`);
  console.log(`│  Profil: ${qs.level || '?'} • VMA ${p.vma?.toFixed(1) || '?'} • ${qs.recentRaceTimes ? JSON.stringify(qs.recentRaceTimes) : 'pas de records'}`);
  console.log(`│  Volume actuel déclaré: ${curVol} km/sem  •  Fréq: ${p.sessionsPerWeek}x/sem`);
  console.log(`│`);
  console.log(`│  Sem | Phase           | Vol cible | Vol réel | Δ%      | Évolution`);
  console.log(`│  ----|-----------------|-----------|----------|---------|----------`);
  const vols = [];
  for (let i = 0; i < p.weeks.length; i++) {
    const w = p.weeks[i];
    const real = weekVol(w);
    vols.push(real);
    const decl = peri?.weeklyVolumes?.[i];
    const phase = w.phase || peri?.weeklyPhases?.[i] || '?';
    const delta = decl ? (((real - decl) / decl) * 100).toFixed(0) + '%' : '-';
    const prev = i > 0 ? vols[i-1] : null;
    const evo = prev ? `${(((real - prev) / prev) * 100).toFixed(0)}%` : 'init';
    console.log(`│  S${(i+1).toString().padStart(2)} | ${phase.padEnd(15)} | ${(decl||'?').toString().padStart(9)} | ${real.toFixed(0).padStart(8)} | ${delta.padStart(7)} | ${evo}`);
  }
  const sum = vols.reduce((a,b)=>a+b,0);
  const peak = Math.max(...vols);
  const mean = sum / vols.length;
  const minV = Math.min(...vols);
  const maxJump = vols.slice(1).map((v,i) => vols[i]>0 ? (v-vols[i])/vols[i] : 0).reduce((a,b) => Math.max(a, Math.abs(b)), 0);
  const cv = (Math.sqrt(vols.reduce((s,v) => s + (v-mean)**2, 0) / vols.length) / mean * 100).toFixed(0);
  console.log(`│`);
  console.log(`│  Total: ${sum.toFixed(0)} km  •  Pic: ${peak.toFixed(0)} km  •  Min: ${minV.toFixed(0)} km  •  Moy: ${mean.toFixed(0)} km`);
  console.log(`│  Coefficient variation: ${cv}%  •  Plus gros saut: ±${(maxJump*100).toFixed(0)}%`);
  // Décharges
  const recovWeeks = peri?.recoveryWeeks || [];
  const recovOK = recovWeeks.every(w => {
    const idx = w - 1;
    if (idx <= 0 || idx >= vols.length) return false;
    return vols[idx] < vols[idx-1] * 0.90;
  });
  console.log(`│  Décharges annoncées: S${recovWeeks.join(',S') || 'aucune'}  •  Respectées: ${recovOK ? '✓' : '✗'}`);
  // Affûtage
  const lastVol = vols[vols.length-1];
  const taper = lastVol / peak;
  console.log(`│  Affûtage: dernière sem = ${(taper*100).toFixed(0)}% du pic`);
  console.log(`└─`);
}

// === FREEMIUM === : S1 seule
const freemium = plans.filter(p => p.fullPlanGenerated !== true);
console.log(`\n\n### FREEMIUM (${freemium.length}) — S1 seule\n`);
console.log(`Plan                                                     | VMA  | Freq | Vol cible (peri.S1) | Vol réel S1 | Δ%`);
console.log(`---------------------------------------------------------|------|------|---------------------|-------------|------`);
for (const p of freemium) {
  const peri = p.generationContext?.periodizationPlan;
  const qs = p.generationContext?.questionnaireSnapshot || {};
  const s1Vol = p.weeks?.[0] ? weekVol(p.weeks[0]) : 0;
  const target = peri?.weeklyVolumes?.[0];
  const delta = target ? (((s1Vol - target) / target) * 100).toFixed(0) + '%' : '-';
  const name = p.name.substring(0, 55).padEnd(55);
  console.log(`${name} | ${(p.vma?.toFixed(1) || '?').padStart(4)} | ${(p.sessionsPerWeek||'?').toString().padStart(4)} | ${(target||'?').toString().padStart(19)} | ${s1Vol.toFixed(0).padStart(11)} | ${delta.padStart(5)}`);
}
