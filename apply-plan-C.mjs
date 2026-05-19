/**
 * Correction Plan C — mainmain (1778675188561) — Solution A coach.
 *   Jeudi  : devient officiellement la SL plate 1h30 / 14 km / D+ 50m
 *   Dimanche : devient Footing récup (type=Jogging) 45 min / 7 km / D+ 0m
 */
import { execSync } from 'child_process';

const real_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1778675188561';

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${real_token}` }
});
const j = await r.json();
const weeks = j.fields.weeks.arrayValue.values;
const w1 = weeks[0].mapValue.fields;
const sessions = w1.sessions.arrayValue.values;

// Locate sessions
const jeudi = sessions.find(s => s.mapValue.fields.day?.stringValue === 'Jeudi');
const dim   = sessions.find(s => s.mapValue.fields.day?.stringValue === 'Dimanche');

if (!jeudi || !dim) { console.error('Séances Jeudi ou Dimanche introuvables'); process.exit(1); }

// === Jeudi : SL plat 1h30 / 14km / D+50m ===
const jf = jeudi.mapValue.fields;
console.log(`AVANT Jeudi : type=${jf.type.stringValue}, title="${jf.title.stringValue}", duration=${jf.duration.stringValue}, distance=${jf.distance.stringValue}, D+=${jf.elevationGain?.integerValue||0}m`);

jf.type = { stringValue: 'Sortie Longue' };  // inchangé mais explicite
jf.title = { stringValue: 'Sortie Longue en endurance fondamentale' };
jf.duration = { stringValue: '1h 30 min' };
jf.distance = { stringValue: '14 km' };
jf.elevationGain = { integerValue: 50 };
jf.warmup = { stringValue: '10 min progressives en allure relâchée (montée progressive de marche à allure EF).' };
jf.mainSet = { stringValue: '1h15 en endurance fondamentale (6:44 min/km) sur parcours plat ou très légèrement vallonné. Allure conversationnelle, foulée souple.' };
jf.cooldown = { stringValue: '5 min de marche active + 5 min d\'étirements doux (mollets, ischio-jambiers, quadriceps, hanches).' };
jf.advice = { stringValue: 'Séance clé de la semaine : construis ton endurance fondamentale. Reste en aisance respiratoire (capable de tenir une conversation). Hydrate-toi régulièrement.' };

// === Dimanche : Footing récup type=Jogging ===
const df = dim.mapValue.fields;
console.log(`AVANT Dim   : type=${df.type.stringValue}, title="${df.title.stringValue}", duration=${df.duration.stringValue}, distance=${df.distance.stringValue}`);

df.type = { stringValue: 'Jogging' };
df.title = { stringValue: 'Footing de récupération' };
df.duration = { stringValue: '45 min' };
df.distance = { stringValue: '7 km' };
df.elevationGain = { integerValue: 0 };
df.warmup = { stringValue: '5 min marche + 5 min progressifs très souples.' };
df.mainSet = { stringValue: '35 min de footing en endurance fondamentale très souple (6:44 min/km ou légèrement plus lent si fatigue résiduelle de la sortie longue de jeudi).' };
df.cooldown = { stringValue: '5 min de marche + étirements doux.' };
df.advice = { stringValue: 'Footing de récupération après la sortie longue. Reste très souple, c\'est un rappel d\'endurance sans charge.' };

console.log(`\nAPRÈS Jeudi : SL plate 1h30 / 14 km / D+50m`);
console.log(`APRÈS Dim   : Jogging 45 min / 7 km / D+0m`);

// PATCH weeks
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=weeks`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${real_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { weeks: { arrayValue: { values: weeks } } } }),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur PATCH:', patched.error); process.exit(1); }

// Vérif
const r2 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers: { 'Authorization': `Bearer ${real_token}` } });
const j2 = await r2.json();
const s2 = j2.fields.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values;
console.log(`\n--- Vérif post-patch S1 ---`);
s2.forEach(s => {
  const f = s.mapValue.fields;
  console.log(`  ${f.day.stringValue.padEnd(10)} | ${f.type.stringValue.padEnd(15)} | "${f.title.stringValue}" | ${f.duration.stringValue} | ${f.distance.stringValue} | D+${f.elevationGain?.integerValue||0}m`);
});
console.log(`\n✅ Plan C corrigé.`);
