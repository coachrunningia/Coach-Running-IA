// Audit complet des 2 plans Rich post-patches
import { execSync } from 'child_process';
import fs from 'fs';
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const HDR = { Authorization:`Bearer ${TOKEN}`, 'x-goog-user-project':PROJECT };
const fromFs = (v) => {
  if (!v) return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o={}; for (const k of Object.keys(v.mapValue.fields||{})) o[k]=fromFs(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromFs);
  return v;
};
const getFsType = (v) => {
  if (!v) return 'null';
  return Object.keys(v)[0];
};

async function auditPlan(planId, label) {
  console.log('\n========================================');
  console.log(`=== ${label}: ${planId} ===`);
  console.log('========================================');
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`, { headers: HDR });
  if (!r.ok) { console.error('GET fail', r.status); return; }
  const doc = await r.json();
  const fields = doc.fields;

  // Typage Firestore par champ-clé
  console.log('\n--- TYPAGE FIRESTORE (raw) ---');
  console.log('feasibility raw type:', getFsType(fields.feasibility));
  if (fields.feasibility?.mapValue?.fields) {
    const fe = fields.feasibility.mapValue.fields;
    console.log('  feasibility.status type:', getFsType(fe.status), '| val:', fromFs(fe.status));
    console.log('  feasibility.score type:', getFsType(fe.score), '| val:', fromFs(fe.score));
    console.log('  feasibility.message present:', !!fe.message, '| type:', getFsType(fe.message));
    console.log('  feasibility.safetyWarning present:', !!fe.safetyWarning, '| type:', getFsType(fe.safetyWarning));
    console.log('  feasibility.confidenceScore present:', !!fe.confidenceScore, '| type:', getFsType(fe.confidenceScore));
  }
  console.log('confidenceScore (top-level) type:', getFsType(fields.confidenceScore), '| val:', fromFs(fields.confidenceScore));
  console.log('welcomeMessage type:', getFsType(fields.welcomeMessage));

  const gc = fromFs(fields.generationContext);
  const fe = fromFs(fields.feasibility);
  const wm = fromFs(fields.welcomeMessage);
  const weeks = fromFs(fields.weeks) || [];

  // Cohérence interne
  console.log('\n--- COHÉRENCE INTERNE ---');
  const wv = gc?.periodizationPlan?.weeklyVolumes || [];
  const we = gc?.periodizationPlan?.weeklyElevationTarget || [];
  console.log('weeklyVolumes:', JSON.stringify(wv), '| len:', wv.length);
  console.log('weeklyElevationTarget:', JSON.stringify(we), '| len:', we.length);
  console.log('weeks.length:', weeks.length);
  console.log('Pic vol:', Math.max(...wv), '| Pic D+:', Math.max(...we));

  // S1 cohérence
  const s1 = weeks[0]?.sessions || [];
  let s1Km = 0, s1D = 0;
  for (const s of s1) {
    s1Km += parseFloat(s.distance || 0);
    s1D += parseInt(s.elevationGain || 0);
  }
  console.log(`S1 calculé: ${s1Km}km / ${s1D}m D+`);
  console.log(`S1 cohérence vol: weeklyVolumes[0]=${wv[0]} vs sum=${s1Km} -> ${wv[0]===s1Km?'OK':'MISMATCH'}`);
  console.log(`S1 cohérence D+: weeklyElevationTarget[0]=${we[0]} vs sum=${s1D} -> ${we[0]===s1D?'OK':'MISMATCH'}`);

  // Allures
  console.log('\n--- ALLURES (paces) ---');
  const paces = gc?.paces || fields.paces;
  if (paces) {
    const p = typeof paces === 'object' && !Array.isArray(paces) ? paces : fromFs(fields.paces);
    console.log('paces keys:', Object.keys(p || {}));
    console.log('paces full:', JSON.stringify(p));
  } else {
    console.log('Pas de paces dans gc');
    const topPaces = fromFs(fields.paces);
    console.log('paces (top):', JSON.stringify(topPaces));
  }

  // Feasibility détaillé
  console.log('\n--- FEASIBILITY DETAIL ---');
  console.log('status:', fe?.status, '| score:', fe?.score, '| confScore:', fe?.confidenceScore);
  console.log('message (300 chars):', (fe?.message||'').slice(0,300));
  console.log('safetyWarning (300 chars):', (fe?.safetyWarning||'').slice(0,300));

  // WelcomeMessage
  console.log('\n--- WELCOME MESSAGE (400 chars) ---');
  console.log((wm||'').slice(0,400));

  // Mots interdits
  console.log('\n--- MOTS INTERDITS check ---');
  const allText = JSON.stringify(doc).toLowerCase();
  const forbidden = ['poids', 'minceur', 'maigrir', 'silhouette', 'corpulence', 'kilo', 'imc'];
  for (const w of forbidden) {
    const count = (allText.match(new RegExp(w, 'g')) || []).length;
    if (count > 0) console.log(`  TROUVÉ "${w}":`, count, 'occurrences');
  }
  console.log('Forbidden check done');

  // Profil utilisateur
  console.log('\n--- USER PROFILE / generationContext context ---');
  console.log('age:', gc?.age, '| level:', gc?.level, '| objective:', gc?.objective);
  console.log('raceDate:', gc?.raceDate, '| weeksToRace:', gc?.weeksToRace);
  console.log('currentWeeklyVolume:', gc?.currentWeeklyVolume);
  console.log('raceElevation:', gc?.raceElevation, '| raceDistance:', gc?.raceDistance);

  // Champs top-level présents
  console.log('\n--- TOP-LEVEL FIELDS ---');
  console.log(Object.keys(fields).sort().join(', '));

  return doc;
}

const plan1 = await auditPlan('1779135832271', 'PLAN 1 (13 sem, nouveau)');
const plan2 = await auditPlan('1775644846100', 'PLAN 2 (19 sem, ancien)');

fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan1.json', JSON.stringify(plan1, null, 2));
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/challenge-plan2.json', JSON.stringify(plan2, null, 2));
console.log('\nDONE');
