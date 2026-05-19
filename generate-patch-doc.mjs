import { readFileSync, writeFileSync } from 'fs';

const plans = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/audit-all-plans-enriched.json', 'utf-8'));

// Final ordered list of critical plan IDs
const CRITICAL_IDS = [
  // TOP 15 critiques (par sévérité décroissante)
  '1778846413141', // azerdeedvd — Débutant Marathon Finisher 7 sem, peak 80
  '1778441786486', // mouhammadslimani — Expert 18yo blessé 10k 9 sem, peak 88 SL 49
  '1778437313058', // j.tissot — Débutant blessé Marathon 5h 28 sem, SL 10.6
  '1778571577227', // didier.damiens — Débutant IMC 35.2 blessé 10k
  '1778574019379', // pierre.dewitte (=P1)
  '1778445060420', // jennibalme — Débuteuse IMC 30 5k peak 6
  '1778677412470', // estenoza.tom — Conf blessé Trail 87 km peak 69
  '1778422885365', // lenaduk — Conf IMC 28 blessée Mara, peak 75
  '1778654000218', // lameymichel — Conf blessé Trail 105km peak 75
  '1778669503908', // lamey.michel — Expert blessé Trail 105km peak 79
  '1778578676672', // liefhwekfhwekfh — Débutant IMC 28 Mara, SL 14.6
  '1778430589776', // soumaya (=P1)
  '1777043776160', // emiliendylanh — chrono saisi 44h30 SL 36
  '1778085118200', // oli833lena — Expert peak 132
  '1778351092726', // jade.leveque — Débuteuse IMC 35.6 blessée
  // Secondaires
  '1778429788661', // lisa-dutarde
  '1778423745051', // bastisa59174
  '1778505133265', // frige60
  '1778425804791', // durant.gab — IMC 41.7
  '1778485151731', // laurine-du-66 — IMC 37.7 Hyrox
  '1778264379970', // cesarini
  '1776889642333', // Agp-latour — 5k 15 min 6 sem
  '1778250764802', // gauthier.raph — Trail 55km 6 sem
  // P1 restants (déjà documentés dans p1-change-proposal mais inclus pour synthèse)
  '1778446762158', // Agathe (Hyrox 30 sem genou)
  '1778702412108', // Adrien (tendino Achille active)
  '1778852278323', // Hippolyte (Mara 7 sem)
  '1778695294712', // Karine (Ultra 105 km)
  '1778771945613', // Lukas (10k 40min 7 sem)
  '1778673418021', // Bruno (5k 20min)
  '1778436722110', // Christophe npsi (Trail 42/2500)
];

// Helper: BMI
const bmi = (w, h) => (w && h) ? (w / Math.pow(h/100, 2)) : 0;

// Helper: ideal peak volume by profile (km/sem) — moyenne raisonnable, ajustée
function idealPeakVol(plan) {
  const u = plan.user || {};
  const goal = plan.goal || '';
  const dist = plan.distance || '';
  const isHyrox = goal.includes('Hyrox');
  const isTrail = goal.includes('Trail');
  const isPdP = goal.includes('Perte');
  const isMaintien = goal.includes('Maintien');
  const isMara = dist.toLowerCase().includes('marathon') && !dist.toLowerCase().includes('semi');
  const isSemi = dist.toLowerCase().includes('semi');
  const is10k = dist.includes('10');
  const is5k = dist.includes('5');
  const td = u.trailDistance || 0;
  const lvl = u.level || '';
  const lvlKey = lvl.includes('Débutant') ? 'deb' : lvl.includes('Intermédiaire') ? 'inter' : lvl.includes('Confirmé') ? 'conf' : lvl.includes('Expert') ? 'expert' : 'inter';

  const T = {
    deb:    { mara: 35, semi: 22, '10k': 22, '5k': 18, trail: 25, trailMid: 35, trailLong: 50, ultra: 60, hyrox: 18, pdp: 15, maintien: 18 },
    inter:  { mara: 48, semi: 33, '10k': 32, '5k': 26, trail: 32, trailMid: 42, trailLong: 55, ultra: 65, hyrox: 26, pdp: 20, maintien: 25 },
    conf:   { mara: 62, semi: 45, '10k': 40, '5k': 34, trail: 45, trailMid: 55, trailLong: 70, ultra: 80, hyrox: 36, pdp: 25, maintien: 28 },
    expert: { mara: 80, semi: 58, '10k': 58, '5k': 44, trail: 58, trailMid: 70, trailLong: 90, ultra: 100, hyrox: 46, pdp: 30, maintien: 32 },
  };
  let v;
  if (isPdP) v = T[lvlKey].pdp;
  else if (isMaintien) v = T[lvlKey].maintien;
  else if (isHyrox) v = T[lvlKey].hyrox;
  else if (isTrail) {
    if (td >= 100) v = T[lvlKey].ultra;
    else if (td >= 60) v = T[lvlKey].trailLong;
    else if (td >= 30) v = T[lvlKey].trailMid;
    else v = T[lvlKey].trail;
  } else if (isMara) v = T[lvlKey].mara;
  else if (isSemi) v = T[lvlKey].semi;
  else if (is10k) v = T[lvlKey]['10k'];
  else if (is5k) v = T[lvlKey]['5k'];
  else v = T[lvlKey].pdp;

  // Réductions
  let factor = 1.0;
  const isFinisher = !u.targetTime || u.targetTime.trim() === '';
  if (isFinisher && !isPdP && !isMaintien) factor *= 0.8;
  if (u.age >= 65) factor *= 0.75;
  else if (u.age >= 55) factor *= 0.85;
  const b = bmi(u.weight, u.height);
  if (b >= 35) factor *= 0.65;
  else if (b >= 30) factor *= 0.80;
  if (u.hasInjury) factor *= 0.75;
  return Math.round(v * factor);
}

// Helper: ideal SL peak (km)
function idealSLPeak(plan) {
  const u = plan.user || {};
  const dist = plan.distance || '';
  const isMara = dist.toLowerCase().includes('marathon') && !dist.toLowerCase().includes('semi');
  const isSemi = dist.toLowerCase().includes('semi');
  const is10k = dist.includes('10');
  const is5k = dist.includes('5');
  const isHyrox = (plan.goal||'').includes('Hyrox');
  const isTrail = (plan.goal||'').includes('Trail');
  const td = u.trailDistance || 0;
  const lvl = u.level || '';
  const lvlKey = lvl.includes('Débutant') ? 'deb' : lvl.includes('Intermédiaire') ? 'inter' : lvl.includes('Confirmé') ? 'conf' : 'expert';
  if (isMara) return { deb: 26, inter: 28, conf: 32, expert: 35 }[lvlKey];
  if (isSemi) return { deb: 13, inter: 15, conf: 17, expert: 18 }[lvlKey];
  if (is10k) return { deb: 11, inter: 13, conf: 14, expert: 15 }[lvlKey];
  if (is5k) return { deb: 8, inter: 9, conf: 11, expert: 12 }[lvlKey];
  if (isHyrox) return { deb: 6, inter: 7, conf: 8, expert: 10 }[lvlKey];
  if (isTrail) {
    if (td >= 100) return 40;
    if (td >= 60) return Math.round(td * 0.40);
    if (td >= 30) return Math.round(td * 0.45);
    return Math.round(td * 0.55);
  }
  return 10;
}

// Pace coefficient by level
function idealPaces(plan) {
  const u = plan.user || {};
  const lvl = u.level || '';
  const lvlKey = lvl.includes('Débutant') ? 'deb' : lvl.includes('Intermédiaire') ? 'inter' : lvl.includes('Confirmé') ? 'conf' : 'expert';
  const b = bmi(u.weight, u.height);
  const efCoef = { deb: 0.60, inter: 0.63, conf: 0.65, expert: 0.67 }[lvlKey] - (b >= 30 ? 0.02 : 0);
  const seuilCoef = { deb: 0.82, inter: 0.84, conf: 0.86, expert: 0.88 }[lvlKey] - (b >= 30 ? 0.02 : 0);
  const vma = plan.vma || u.vma || 0;
  if (!vma) return null;
  const sToPace = sPerKm => {
    const m = Math.floor(sPerKm / 60);
    const s = Math.round(sPerKm % 60);
    return `${m}:${s.toString().padStart(2,'0')}`;
  };
  return {
    ef: sToPace(3600 / (vma * efCoef)),
    seuil: sToPace(3600 / (vma * seuilCoef)),
    vmaP: sToPace(3600 / vma),
    efCoef, seuilCoef
  };
}

// Format inputs
function profileLine(p) {
  const u = p.user || {};
  const b = bmi(u.weight, u.height);
  const inj = u.hasInjury ? ` • **🩹 BLESSURE : ${u.injuryDescription || 'non précisée'}**` : '';
  return `${u.age || '?'} ans ${u.sex || '?'} • ${u.weight}kg/${u.height}cm ${b ? `(IMC ${b.toFixed(1)})` : ''} • Niveau **${u.level}** • Vol actuel ${u.currentWeeklyVolume || 0} km/sem • freq ${u.frequency || '?'}${inj}`;
}

function chronos(u) {
  const arr = [];
  if (u.chrono5km) arr.push(`5k=${u.chrono5km}`);
  if (u.chrono10km) arr.push(`10k=${u.chrono10km}`);
  if (u.chronoSemi) arr.push(`semi=${u.chronoSemi}`);
  if (u.chronoMarathon) arr.push(`mara=${u.chronoMarathon}`);
  return arr.length ? arr.join(' / ') : '_aucun chrono saisi_';
}

let out = `# Patch proposals — Plans critiques (à valider par coach expert)

Document généré le ${new Date().toISOString().split('T')[0]}.
Sources : audit coach 125 plans (30j) + cross-référencement P1.

**Périmètre** : ${CRITICAL_IDS.length} plans uniques classés par sévérité.

**Aucune modification en base n'a été appliquée à ce stade.**

---

`;

let n = 0;
for (const id of CRITICAL_IDS) {
  const p = plans.find(x => x.id === id);
  if (!p) { out += `\n⚠️ Plan ${id} introuvable dans le dump.\n\n`; continue; }
  n++;
  const u = p.user || {};
  const idealPeak = idealPeakVol(p);
  const actualPeak = p.periodization.actualPeak;
  const peakRatio = actualPeak ? (actualPeak / idealPeak) : 0;
  const peakVerdict = peakRatio < 0.7 ? '🔴 SOUS-DIM' : peakRatio > 1.15 ? '🔴 SUR-DIM' : peakRatio < 0.85 ? '🟠 limite basse' : peakRatio > 1.05 ? '🟠 limite haute' : '🟢 OK';

  const idealSL = idealSLPeak(p);
  const slProj = p.slPeak.km * 2.25; // projection grossière
  const slVerdict = slProj < idealSL * 0.7 ? '🔴 SOUS' : slProj > idealSL * 1.3 ? '🔴 SUR' : '🟢 OK';

  const ip = idealPaces(p);
  const currentEf = p.paces.ef;
  const currentSeuil = p.paces.seuil;

  out += `## ${n}. ${p.userEmail} — ${p.goal}/${p.distance} — ${p.durationWeeks} sem (id=${p.id})

**Profil** : ${profileLine(p)}
**Chronos** : ${chronos(u)}
**Objectif** : ${u.targetTime ? `chrono ${u.targetTime}` : 'Finisher'} • délai ${p.durationWeeks} sem • course ${u.raceDate || '?'}
**VMA** : ${(p.vma || 0).toFixed(1)} km/h (${p.vmaSource || '?'})

### État actuel
- Feasibility : **${p.feasibility}** score=${p.score}
- Volume peak : **${actualPeak} km/sem** (cible coach ${idealPeak} km/sem → ${peakVerdict}, ratio ${(peakRatio).toFixed(2)}x)
- SL peak (proj. depuis S1=${p.slPeak.km.toFixed(1)} km) : **~${slProj.toFixed(0)} km** (cible coach ${idealSL} km → ${slVerdict})
- Allures : EF=${currentEf} (67% VMA fixe) · Seuil=${currentSeuil} (87% VMA fixe) · VMA=${p.paces.vma}
- Allures **cibles** (différenciées par niveau) : EF=${ip?.ef || '?'} (${ip ? (ip.efCoef*100).toFixed(0) + '%' : '?'} VMA) · Seuil=${ip?.seuil || '?'} (${ip ? (ip.seuilCoef*100).toFixed(0) + '%' : '?'} VMA)

### Patch proposé (à valider)
_À compléter manuellement ci-dessous_

---

`;
}

writeFileSync('/Users/romanemarino/Coach-Running-IA/patch-proposals-final.md', out);
console.log(`Skeleton généré: ${n} plans, ${out.length} chars, ${out.split('\n').length} lignes`);
console.log(`Fichier: /Users/romanemarino/Coach-Running-IA/patch-proposals-final.md`);
