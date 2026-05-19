// Test SYSTÉMATIQUE chaque étape de génération avec data EXACTE d'Ambre
import { execSync } from 'child_process';
const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const UID = 'qJzkzjA5E5cVm0uRxAtK57zWlKy2';

// Récupérer DONNÉES EXACTES Ambre
const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/users/${UID}`, {
  headers: { Authorization: 'Bearer ' + TOKEN }
});
const j = await r.json();
const qd = j.fields?.questionnaireData?.mapValue?.fields || {};

function unwrap(f) {
  if (!f) return undefined;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return +f.integerValue;
  if (f.doubleValue !== undefined) return +f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.arrayValue) return (f.arrayValue.values||[]).map(unwrap);
  if (f.mapValue) {
    const o = {};
    for (const k of Object.keys(f.mapValue.fields||{})) o[k] = unwrap(f.mapValue.fields[k]);
    return o;
  }
  return undefined;
}

const data = {};
for (const k of Object.keys(qd)) data[k] = unwrap(qd[k]);

console.log('=== Data Ambre brut ===');
console.log(JSON.stringify(data, null, 2));

// === Tests systématiques ===
console.log('\n\n=== Test 1: Sérialisation JSON ===');
try {
  const str = JSON.stringify(data);
  console.log('✅ JSON.stringify OK (' + str.length + ' chars)');
  const parsed = JSON.parse(str);
  console.log('✅ JSON.parse OK');
} catch (e) {
  console.log('❌ ERREUR JSON: ' + e.message);
}

console.log('\n=== Test 2: Caractères non-ASCII par champ ===');
for (const k of Object.keys(data)) {
  const v = data[k];
  if (typeof v === 'string') {
    for (let i = 0; i < v.length; i++) {
      const c = v.charCodeAt(i);
      if (c > 127) {
        console.log(`  ${k}[${i}] = ${JSON.stringify(v[i])} (U+${c.toString(16).padStart(4,'0').toUpperCase()})`);
      }
    }
  }
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    for (const sk of Object.keys(v)) {
      const sv = v[sk];
      if (typeof sv === 'string') {
        for (let i = 0; i < sv.length; i++) {
          const c = sv.charCodeAt(i);
          if (c > 127) {
            console.log(`  ${k}.${sk}[${i}] = ${JSON.stringify(sv[i])} (U+${c.toString(16).padStart(4,'0').toUpperCase()})`);
          }
        }
      }
    }
  }
}

console.log('\n=== Test 3: Template literal (simulation prompt) ===');
try {
  const promptFragment = `
- Blessure : ${data.injuries?.description || 'aucune'}
- Commentaires : "${data.comments || ''}"
- Objectif : ${data.subGoal} en ${data.targetTime}
  `;
  console.log('✅ Template literal OK');
  console.log('Fragment:\n' + promptFragment);
} catch (e) {
  console.log('❌ ERREUR template: ' + e.message);
}

console.log('\n=== Test 4: Échappement JSON dans prompt (cas Gemini) ===');
// Gemini reçoit un prompt avec JSON template. Si data contient des chars qui doivent être échappés...
try {
  const jsonInPrompt = `
Voici le profil utilisateur :
${JSON.stringify(data, null, 2)}
`;
  console.log('✅ JSON dans prompt OK');
} catch (e) {
  console.log('❌ ERREUR: ' + e.message);
}

console.log('\n=== Test 5: VMA + Paces (cas Ambre) ===');
// VMA basse 8.73 + cible 2h00 semi = écart énorme
const vma = 8.73;
const targetSec = 7200; // 2h00
const semiDist = 21.1;
const targetSpeed = semiDist / (targetSec / 3600);
const gapPercent = ((targetSpeed/0.85 - vma) / vma) * 100;
console.log(`VMA: ${vma} km/h | Cible: ${targetSpeed.toFixed(2)} km/h | VMA requise (85%): ${(targetSpeed/0.85).toFixed(2)} km/h | Gap: ${gapPercent.toFixed(1)}%`);
console.log(`→ Score IRRÉALISTE attendu (~10-15)`);

console.log('\n=== Test 6: Calcul minViableVolume (cas Ambre) ===');
const raceDistKm = 21.1; // semi
const minViableVolume = raceDistKm <= 5 ? 15 : raceDistKm <= 10 ? 22 : raceDistKm <= 21.1 ? 32 : raceDistKm <= 42.2 ? 38 : 40;
console.log(`minViableVolume Semi: ${minViableVolume} km/sem`);
console.log(`currentVolume Ambre: ${data.currentWeeklyVolume} km/sem`);
const ratio = data.currentWeeklyVolume / minViableVolume;
console.log(`Ratio: ${ratio.toFixed(2)} → ${ratio < 0.30 ? '🚨 isLowVolForTimedLongRace ACTIVÉ (mode marche-course)' : 'OK'}`);

console.log('\n=== Test 7: Vérification preferredLongRunDay ===');
console.log('preferredLongRunDay:', data.preferredLongRunDay || '(undefined)');
console.log('preferredDays:', data.preferredDays);
console.log('→ Si preferredLongRunDay manquant, fallback "Dimanche". Mais si Dimanche pas dans preferredDays...');
const fallbackSlDay = data.preferredLongRunDay || 'Dimanche';
const dimancheInPrefs = (data.preferredDays || []).includes('Dimanche');
console.log(`SL day cible: "${fallbackSlDay}" | Dimanche dans preferredDays: ${dimancheInPrefs}`);
if (!dimancheInPrefs && fallbackSlDay === 'Dimanche') {
  console.log('🚨 ANOMALIE: SL forcée sur Dimanche mais Dimanche pas dans preferredDays → conflit potentiel');
}
