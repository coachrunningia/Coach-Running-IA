// AUDIT : combien de plans en prod sont affectés par le bug allure asymétrique
// Le bug : quand chrono cible saisi → allure spé DEVRAIT être chrono/distance,
// mais le code calculait depuis VMA (84% VMA) et ne corrigeait que si plus LENT que VMA potentiel.
// Donc tous les users avec cible AMBITIEUSE (cible plus rapide que potentiel VMA) sont affectés.

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const RACE_DISTANCES = {
  '5 km': 5,
  '10 km': 10,
  'Semi-Marathon': 21.1,
  'Semi-marathon': 21.1,
  'Marathon': 42.195,
};

// Convertit "1h50" / "50min" / "16min" → secondes total
function timeToSec(timeStr) {
  if (!timeStr) return 0;
  const m = String(timeStr).match(/(\d+)h\s*(\d+)?|(\d+)\s*min/);
  if (!m) return 0;
  if (m[1]) return parseInt(m[1]) * 3600 + parseInt(m[2] || '0') * 60;
  return parseInt(m[3]) * 60;
}

// Convertit "5:13" → secondes/km
function paceToSec(paceStr) {
  if (!paceStr) return 0;
  const [m, s] = String(paceStr).split(':').map(x => parseInt(x));
  return m * 60 + (s || 0);
}

// Convertit secondes/km → "5:13"
function secToPace(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Helper extract Firestore value
function ex(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(ex);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = ex(val);
    return out;
  }
  return v;
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  AUDIT ALLURE MISMATCH — ampleur du bug allure asymétrique');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Récupérer TOUS les plans Firestore (paginé si besoin)
let allPlans = [];
let pageToken = '';
do {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
  const r = await fetch(url, { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
  const j = await r.json();
  const docs = j.documents || [];
  allPlans = allPlans.concat(docs);
  pageToken = j.nextPageToken || '';
} while (pageToken);

console.log(`▶ Total plans en Firestore: ${allPlans.length}\n`);

// 2. Analyser chaque plan
const results = {
  total: allPlans.length,
  withChrono: 0,
  withChronoAndAllure: 0,
  affected: [],
  safe: [],
  noChrono: 0,
  noAllure: 0,
  invalidPace: 0,
  unaffected: 0,
};

// Pour chaque plan
for (const planDoc of allPlans) {
  const f = planDoc.fields || {};
  const planId = planDoc.name.split('/').pop();
  const userId = ex(f.userId) || '?';
  const userEmail = ex(f.userEmail) || '?';
  const distance = ex(f.distance) || '?';
  const createdAt = ex(f.createdAt) || '?';
  const ctx = ex(f.generationContext) || {};
  const targetTime = ctx.questionnaire?.targetTime || ex(f.targetTime) || null;
  const vma = ctx.vma || ex(f.vma) || null;
  const paces = ctx.paces || ex(f.paces) || {};
  const subGoal = ctx.questionnaire?.subGoal || distance;

  // Plan sans chrono → ignoré
  if (!targetTime) {
    results.noChrono++;
    continue;
  }
  results.withChrono++;

  // Distance reconnue ?
  const dist = RACE_DISTANCES[subGoal];
  if (!dist) continue;

  // Allure spé affichée selon distance
  const paceKey = dist === 5 ? 'allureSpecifique5k' :
                  dist === 10 ? 'allureSpecifique10k' :
                  dist === 21.1 ? 'allureSpecifiqueSemi' :
                  'allureSpecifiqueMarathon';
  const displayedPace = paces[paceKey];
  if (!displayedPace) {
    results.noAllure++;
    continue;
  }
  const displayedPaceSec = paceToSec(displayedPace);
  if (!displayedPaceSec) {
    results.invalidPace++;
    continue;
  }
  results.withChronoAndAllure++;

  // Allure attendue = chrono cible / distance
  const targetSec = timeToSec(targetTime);
  if (!targetSec) continue;
  const expectedPaceSec = targetSec / dist;
  const expectedPace = secToPace(expectedPaceSec);

  // Écart en secondes/km
  const gapSecPerKm = displayedPaceSec - expectedPaceSec;
  const gapTotalSec = Math.abs(gapSecPerKm * dist);

  const entry = {
    planId, userId, userEmail, distance, targetTime, vma: vma ? vma.toFixed(2) : '?',
    displayedPace, expectedPace,
    gapSecPerKm: Math.round(gapSecPerKm),
    gapTotalSec: Math.round(gapTotalSec),
    gapMinFormatted: `${Math.floor(gapTotalSec/60)}:${String(Math.round(gapTotalSec%60)).padStart(2,'0')}`,
    createdAt: createdAt.substring(0, 19),
  };

  // Tolérance 3 sec/km (arrondi)
  if (Math.abs(gapSecPerKm) <= 3) {
    results.safe.push(entry);
    results.unaffected++;
  } else {
    results.affected.push(entry);
  }
}

// 3. Synthèse
console.log(`▶ Plans avec chrono cible: ${results.withChrono} / ${results.total}`);
console.log(`▶ Plans avec chrono ET allure spé extractible: ${results.withChronoAndAllure}`);
console.log(`▶ Plans CORRECTS (écart ≤ 3 sec/km): ${results.unaffected}`);
console.log(`▶ Plans AFFECTÉS (écart > 3 sec/km): ${results.affected.length}`);
console.log('');

// 4. Distribution par sévérité d'écart
const bySeverity = { '< 5s/km': 0, '5-10s/km': 0, '10-20s/km': 0, '20-30s/km': 0, '> 30s/km': 0 };
for (const a of results.affected) {
  const g = Math.abs(a.gapSecPerKm);
  if (g < 5) bySeverity['< 5s/km']++;
  else if (g < 10) bySeverity['5-10s/km']++;
  else if (g < 20) bySeverity['10-20s/km']++;
  else if (g < 30) bySeverity['20-30s/km']++;
  else bySeverity['> 30s/km']++;
}
console.log('▶ Distribution écart allure (sévérité) :');
for (const [k, v] of Object.entries(bySeverity)) console.log(`    ${k}: ${v} plans`);
console.log('');

// 5. Top 20 plans les plus affectés
results.affected.sort((a, b) => Math.abs(b.gapSecPerKm) - Math.abs(a.gapSecPerKm));
console.log('▶ TOP 20 plans LES PLUS affectés (écart le plus grand) :');
console.log('   email | distance | cible | allure plan | allure attendue | écart sec/km | écart sur course');
for (const a of results.affected.slice(0, 20)) {
  console.log(`   ${a.userEmail.padEnd(35)} ${a.distance.padEnd(15)} ${a.targetTime.padEnd(8)} ${a.displayedPace.padEnd(6)} vs ${a.expectedPace.padEnd(6)} | ${String(a.gapSecPerKm).padStart(4)}s/km | ${a.gapMinFormatted}`);
}
console.log('');

// 6. Sauvegarde JSON pour analyse fine
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-allure-mismatch-results.json',
  JSON.stringify(results, null, 2));
console.log('✅ Résultats détaillés dans audit-allure-mismatch-results.json\n');
