import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  clientOptions: { subject: 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com' }
});

// Impersonation via gcloud
import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();

const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';
const planId = '1779381807357';

// Read plan
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/plans/${planId}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
const doc = await res.json();

if (!doc.fields) {
  console.log('❌ Plan not found or auth issue:', JSON.stringify(doc, null, 2).slice(0, 500));
  process.exit(1);
}

// Recursive Firestore JSON parser
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

const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// Diagnostics
console.log('═══════════════════════════════════════');
console.log('PLAN HYROX ALEXANDRE — DIAGNOSTIC AFFÛTAGE');
console.log('═══════════════════════════════════════\n');

console.log('📅 DATE COURSE HYROX :');
console.log('  raceDate         :', plan.raceDate || '❌ MANQUANT');
console.log('  startDate        :', plan.startDate || plan.planStartDate || '?');
console.log('  endDate          :', plan.endDate || plan.planEndDate || '?');
console.log('  goal             :', plan.goal);
console.log('  targetTime       :', plan.targetTime);
console.log('  hyroxPreviousTime:', plan.hyroxPreviousTime || '(non renseigné)');
console.log('');

const qData = plan.questionnaireData || {};
console.log('📋 QUESTIONNAIRE :');
console.log('  raceDate         :', qData.raceDate || '?');
console.log('  goal             :', qData.goal);
console.log('  level            :', qData.level);
console.log('  frequency        :', qData.frequency);
console.log('  vma              :', qData.vma);
console.log('  currentWeeklyVol :', qData.currentWeeklyVolume);
console.log('');

const weeks = plan.weeks || [];
console.log(`📊 STRUCTURE : ${weeks.length} semaines`);

const weeklyVols = plan.weeklyVolumes || [];
console.log('  weeklyVolumes :', weeklyVols.join(' / '));
console.log('');

// Detect affûtage : last 1-3 weeks should have decreasing volume
const lastN = 4;
console.log(`📉 AFFÛTAGE (${lastN} dernières semaines) :`);
for (let i = Math.max(0, weeks.length - lastN); i < weeks.length; i++) {
  const w = weeks[i];
  const sessions = (w.sessions || []).filter(s => s.type !== 'Repos' && s.type !== 'Renforcement');
  const totalKm = sessions.reduce((acc, s) => {
    const d = parseFloat(String(s.distance || '0').replace(/[^\d.]/g, '')) || 0;
    return acc + d;
  }, 0);
  const types = sessions.map(s => s.type).join(', ');
  const phase = w.phase || '?';
  console.log(`  S${i+1} (${phase}) → ${totalKm.toFixed(1)} km / ${sessions.length} séances course | ${types}`);
}
console.log('');

// Peak detection
const allVols = weeks.map((w, i) => {
  const sessions = (w.sessions || []).filter(s => s.type !== 'Repos' && s.type !== 'Renforcement');
  return sessions.reduce((acc, s) => {
    const d = parseFloat(String(s.distance || '0').replace(/[^\d.]/g, '')) || 0;
    return acc + d;
  }, 0);
});
const peakKm = Math.max(...allVols);
const peakWeek = allVols.indexOf(peakKm) + 1;
console.log(`🏔️ PIC volume = ${peakKm.toFixed(1)} km en S${peakWeek}`);
const lastWeekVol = allVols[allVols.length - 1] || 0;
const tapeReduction = peakKm > 0 ? Math.round((1 - lastWeekVol/peakKm) * 100) : 0;
console.log(`📉 Dernière semaine = ${lastWeekVol.toFixed(1)} km (réduction ${tapeReduction}% vs pic) — cible Hyrox affûtage = -40% à -50%`);
console.log('');

// Verdict affûtage
if (weeks.length >= 4) {
  const sBefLast = allVols[allVols.length - 2] || 0;
  const sLast = lastWeekVol;
  console.log('🎯 ANALYSE AFFÛTAGE :');
  console.log(`  S-1 (dernière) : ${sLast.toFixed(1)} km`);
  console.log(`  S-2 (avant-dern) : ${sBefLast.toFixed(1)} km`);
  console.log(`  Pic : ${peakKm.toFixed(1)} km en S${peakWeek}/${weeks.length}`);
  const peakWeeksBeforeEnd = weeks.length - peakWeek;
  console.log(`  Pic placé à ${peakWeeksBeforeEnd} semaines de la course`);
  if (peakWeeksBeforeEnd < 2) console.log('  ⚠️ Pic TROP proche de la course (cible: 2-3 sem avant)');
  if (tapeReduction < 30) console.log('  ⚠️ Affûtage INSUFFISANT (-' + tapeReduction + '% au lieu de -40%)');
  if (tapeReduction >= 40 && peakWeeksBeforeEnd >= 2) console.log('  ✅ Affûtage CONFORME doctrine');
}
