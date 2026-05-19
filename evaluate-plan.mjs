// Script générique d'éval plan (réutilisable) — appel: node evaluate-plan.mjs <UID> <PLAN_ID>
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = process.argv[2];
const PLAN_ID = process.argv[3];

if (!UID || !PLAN_ID) {
  console.error('Usage: node evaluate-plan.mjs <UID> <PLAN_ID>');
  process.exit(1);
}

const planResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const f = planDoc.fields || {};

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
console.log(`  ÉVALUATION PLAN — planId=${PLAN_ID}`);
console.log(`═══════════════════════════════════════════════════════════════\n`);

console.log('▶ MÉTADONNÉES');
console.log(`  distance: ${plan.distance}`);
console.log(`  isPreview: ${plan.isPreview} | weeks: ${plan.weeks?.length}`);
console.log(`  confidenceScore: ${plan.confidenceScore}`);
console.log(`  feasibilityStatus: ${plan.feasibilityStatus}`);
console.log('');

const ctx = plan.generationContext || {};
console.log('▶ CONTEXTE');
console.log(`  VMA: ${ctx.vma} km/h  (source: ${ctx.vmaSource})`);
if (ctx.paces) {
  console.log(`  Allures:`);
  for (const [k, v] of Object.entries(ctx.paces)) console.log(`    ${k}: ${v}`);
}
console.log('');

const peri = ctx.periodizationPlan || {};
console.log('▶ PÉRIODISATION');
console.log(`  Total weeks: ${peri.totalWeeks}`);
console.log(`  Volumes: ${JSON.stringify(peri.weeklyVolumes)}`);
if (peri.weeklyVolumes) {
  console.log(`  → START: ${peri.weeklyVolumes[0]} km`);
  console.log(`  → PEAK: ${Math.max(...peri.weeklyVolumes)} km (S${peri.weeklyVolumes.indexOf(Math.max(...peri.weeklyVolumes))+1})`);
}
if (peri.slDistances) {
  console.log(`  SL distances: ${JSON.stringify(peri.slDistances)} → PEAK SL: ${Math.max(...peri.slDistances)} km`);
}
if (peri.weeklyPhases) console.log(`  Phases: ${peri.weeklyPhases.join(', ')}`);
console.log('');

console.log('▶ WELCOME');
console.log(`  ${(plan.welcomeMessage || plan.welcomeBlock?.message || '(aucun)').substring(0, 800)}`);
console.log('');

const w1 = plan.weeks?.[0];
if (w1) {
  console.log('▶ SEMAINE 1');
  for (const s of (w1.sessions || [])) {
    console.log(`  [${s.day}] ${s.type}: ${s.title}`);
    console.log(`         duration=${s.duration} distance=${s.distance}${s.pace ? ' pace='+s.pace : ''}`);
  }
}
