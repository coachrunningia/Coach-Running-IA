import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1778942808369';

function parseFs(field) {
  if (field == null) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseFs);
  if ('mapValue' in field) {
    const out = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return field;
}

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();
if (!doc.fields) { console.log('❌ Plan not found:', JSON.stringify(doc).slice(0, 500)); process.exit(1); }

const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

console.log('═══════════════════════════════════════');
console.log(`AUDIT PLAN ${planId}`);
console.log('═══════════════════════════════════════\n');

console.log('🆔 IDENTITÉ :');
console.log(`   userEmail   : ${plan.userEmail}`);
console.log(`   userId      : ${plan.userId}`);
console.log(`   goal        : ${plan.goal}`);
console.log(`   name        : ${plan.name}`);
console.log(`   raceDate    : ${plan.raceDate || '?'}`);
console.log(`   startDate   : ${plan.startDate || '?'}`);
console.log(`   endDate     : ${plan.endDate || '?'}`);
console.log(`   durationWk  : ${plan.durationWeeks || '?'}`);
console.log(`   createdAt   : ${doc.createTime}`);
console.log(`   isPreview   : ${plan.isPreview}`);
console.log(`   fullPlanGen : ${plan.fullPlanGenerated}`);
console.log('');

const qs = plan.generationContext?.questionnaireSnapshot || {};
console.log('📋 QUESTIONNAIRE INPUTS :');
console.log(JSON.stringify(qs, null, 2));
console.log('');

console.log('🏃 VMA & ALLURES :');
console.log(`   vma        : ${plan.vma} (${plan.vmaSource || '?'})`);
console.log(`   calculatedVMA : ${plan.calculatedVMA}`);
const paces = plan.paces || plan.allures || plan.generationContext?.paces || {};
console.log(`   paces :`);
for (const [k, v] of Object.entries(paces)) console.log(`     ${k}: ${v}`);
console.log('');

console.log('🎯 FEASIBILITY :');
if (plan.feasibility) {
  console.log(`   status  : ${plan.feasibility.status}`);
  console.log(`   message : ${plan.feasibility.message}`);
}
console.log('');

const periodization = plan.generationContext?.periodizationPlan || {};
console.log('📊 PÉRIODISATION :');
console.log(`   totalWeeks : ${periodization.totalWeeks}`);
console.log(`   weeklyVolumes : ${(periodization.weeklyVolumes || []).join(' / ')}`);
console.log(`   weeklyPhases  : ${(periodization.weeklyPhases || []).join(' / ')}`);
console.log(`   recoveryWeeks : ${(periodization.recoveryWeeks || []).join(', ')}`);
console.log('');

const weeks = plan.weeks || [];
console.log(`📅 SEMAINES GÉNÉRÉES : ${weeks.length}`);
for (let i = 0; i < weeks.length; i++) {
  const w = weeks[i];
  const sessions = w.sessions || [];
  const totalKm = sessions.reduce((acc, s) => {
    const d = parseFloat(String(s.distance || '0').replace(/[^\d.]/g, '')) || 0;
    return acc + d;
  }, 0);
  console.log(`\n   ━━━━━━━━━━ S${i+1} (${w.phase || '?'}) — ${totalKm.toFixed(1)} km total ━━━━━━━━━━`);
  for (let j = 0; j < sessions.length; j++) {
    const s = sessions[j];
    console.log(`   J${j+1} [${s.dayDate || s.date || '?'}] ${s.type} — ${s.title || ''}`);
    console.log(`        distance: ${s.distance || '?'} | duration: ${s.duration || '?'} | targetPace: ${s.targetPace || '?'}`);
    if (s.mainSet) console.log(`        mainSet : ${String(s.mainSet).slice(0, 200)}`);
  }
}

console.log('\n💬 WELCOMEMESSAGE :');
console.log((plan.welcomeMessage || '(vide)').slice(0, 1500));
