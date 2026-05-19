// Évalue le plan de Clément : distance peak, SL peak, volume hebdo peak, allures, welcome, faisabilité
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'e4iFMJFc3ycDnqf4YO6MmQVMBTA2';
const PLAN_ID = '1778935838729';

// Récupère le plan
const planResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const f = planDoc.fields || {};

// Helper extraction Firestore types
function extract(v) {
  if (v == null) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(extract);
  if (v.mapValue !== undefined) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = extract(val);
    return out;
  }
  return v;
}

const plan = {};
for (const [k, v] of Object.entries(f)) plan[k] = extract(v);

console.log(`\n═══════════════════════════════════════════════════════════════`);
console.log(`  ÉVALUATION PLAN — Clément Bouche`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

console.log('▶ INPUTS UTILISATEUR (rappel)');
console.log('  Niveau: Confirmé (Compétition)');
console.log('  Distance: Semi-Marathon');
console.log('  Temps cible: 2h00  (≈ 5\'40/km — pour info, sub-1h45 = chrono confirmé)');
console.log('  Fréquence: 3 séances/sem');
console.log('  Date course: 2026-09-20  (≈ 18 sem)');
console.log('');

// ============ ÉLÉMENTS CRITIQUES ============
console.log('▶ MÉTADONNÉES PLAN');
console.log(`  title: ${plan.title}`);
console.log(`  distance: ${plan.distance}`);
console.log(`  level: ${plan.level}`);
console.log(`  objective: ${plan.objective}`);
console.log(`  isPreview: ${plan.isPreview}`);
console.log(`  weeks générées: ${plan.weeks?.length}`);
console.log('');

// generationContext
const ctx = plan.generationContext || {};
console.log('▶ CONTEXTE DE GÉNÉRATION (figé)');
console.log(`  VMA estimée: ${ctx.vma} km/h`);
console.log(`  VMA source: ${ctx.vmaSource}`);
if (ctx.paces) {
  console.log(`  Allures calculées:`);
  for (const [k, v] of Object.entries(ctx.paces)) {
    console.log(`    ${k}: ${v}`);
  }
}
console.log('');

// Périodisation
const peri = ctx.periodizationPlan || {};
console.log('▶ PÉRIODISATION');
console.log(`  Total weeks: ${peri.totalWeeks}`);
console.log(`  Phases: dev=${peri.developpementWeeks}, spec=${peri.specifiqueWeeks}, affut=${peri.affutageWeeks}`);
console.log(`  Volumes hebdo (km): ${JSON.stringify(peri.weeklyVolumes)}`);
if (peri.weeklyVolumes && peri.weeklyVolumes.length > 0) {
  const peakVol = Math.max(...peri.weeklyVolumes);
  const peakWeek = peri.weeklyVolumes.indexOf(peakVol) + 1;
  const startVol = peri.weeklyVolumes[0];
  console.log(`  → Volume START: ${startVol} km`);
  console.log(`  → Volume PEAK: ${peakVol} km (S${peakWeek})`);
}
console.log('');

// SL distances
if (peri.slDistances) {
  console.log('▶ SORTIES LONGUES');
  console.log(`  SL distances (km): ${JSON.stringify(peri.slDistances)}`);
  const peakSL = Math.max(...peri.slDistances);
  console.log(`  → SL PEAK: ${peakSL} km (sur Semi-Marathon = ${(peakSL/21.1*100).toFixed(0)}% de la distance course)`);
  console.log('');
}

// Welcome message
console.log('▶ MESSAGE DE BIENVENUE');
const welcome = plan.welcomeMessage || plan.welcomeBlock?.message || plan.welcomeBlock || 'AUCUN';
if (typeof welcome === 'string') {
  console.log(`  ${welcome.substring(0, 1000)}${welcome.length > 1000 ? '...' : ''}`);
} else if (typeof welcome === 'object') {
  console.log(`  Block: ${JSON.stringify(welcome, null, 2).substring(0, 1500)}`);
}
console.log('');

// Faisabilité
console.log('▶ FAISABILITÉ');
const feas = plan.feasibility || ctx.feasibility || plan.confidenceScore || ctx.confidenceScore;
console.log(`  Score: ${plan.confidenceScore || feas?.score || '?'}`);
console.log(`  Status: ${plan.feasibilityStatus || feas?.status || '?'}`);
if (feas?.reasons) {
  console.log(`  Reasons:`);
  for (const r of feas.reasons.slice(0,10)) console.log(`    [${r.type}] ${r.text}`);
}
console.log('');

// Semaine 1 — sessions + allures
const w1 = plan.weeks?.[0];
if (w1) {
  console.log('▶ SEMAINE 1 — Sessions');
  console.log(`  weekNumber: ${w1.weekNumber} | type: ${w1.weekType}`);
  console.log(`  weekVolumeTarget: ${w1.weekVolumeTarget || w1.volumeTarget || '?'}`);
  let weekKm = 0;
  for (const s of (w1.sessions || [])) {
    const dist = (s.distance || '').match(/([\d.]+)/)?.[1];
    if (dist) weekKm += parseFloat(dist);
    console.log(`    [${s.day}] ${s.type}: ${s.title}`);
    console.log(`           duration=${s.duration} distance=${s.distance}`);
    if (s.allure || s.pace) console.log(`           allure=${s.allure || s.pace}`);
    if (s.intervals) console.log(`           intervals: ${JSON.stringify(s.intervals).substring(0,200)}`);
  }
  console.log(`  → Volume S1 réel calculé: ${weekKm.toFixed(1)} km`);
}
