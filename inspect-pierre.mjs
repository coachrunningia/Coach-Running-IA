import { execSync } from 'child_process';
const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/1778574019379`;
const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
const j = await r.json();
// Top-level keys
console.log('TOP-LEVEL KEYS:', Object.keys(j.fields || {}).sort().join(', '));
const gc = j.fields?.generationContext?.mapValue?.fields || {};
console.log('\ngenerationContext KEYS:', Object.keys(gc).sort().join(', '));
const q = gc.questionnaire?.mapValue?.fields || {};
console.log('\nquestionnaire KEYS:', Object.keys(q).sort().join(', '));
// Sample some questionnaire values
for (const k of ['age','sex','runningLevel','goal','subGoal','targetTime','currentWeeklyKm','weeklyFrequency','planDurationWeeks','chrono5km','chrono10km','chronoHalfMarathon','chronoMarathon','injuries','painOrInjuryDescription','weightKg','heightCm']) {
  const f = q[k];
  if (!f) continue;
  let v = '?';
  if (f.stringValue !== undefined) v = `"${f.stringValue}"`;
  else if (f.integerValue !== undefined) v = f.integerValue;
  else if (f.doubleValue !== undefined) v = f.doubleValue;
  else if (f.arrayValue !== undefined) v = JSON.stringify((f.arrayValue.values||[]).map(x => x.stringValue ?? x.integerValue ?? x));
  console.log(`  ${k} = ${v}`);
}
const peri = gc.periodizationPlan?.mapValue?.fields || {};
console.log('\nperiodizationPlan KEYS:', Object.keys(peri).sort().join(', '));
const weeks = j.fields?.weeks?.arrayValue?.values || [];
console.log(`\nweeks: ${weeks.length} weeks, first week KEYS:`, weeks[0] ? Object.keys(weeks[0].mapValue?.fields||{}).sort().join(', ') : 'NONE');
if (weeks[0]) {
  const sessions = weeks[0].mapValue?.fields?.sessions?.arrayValue?.values || [];
  console.log(`first week sessions: ${sessions.length}`);
  if (sessions[0]) console.log(`first session KEYS:`, Object.keys(sessions[0].mapValue?.fields||{}).sort().join(', '));
  // Sample first session
  if (sessions[0]) {
    const f = sessions[0].mapValue?.fields || {};
    for (const k of Object.keys(f)) {
      let v = '?';
      if (f[k].stringValue !== undefined) v = `"${f[k].stringValue.substring(0,80)}"`;
      else if (f[k].integerValue !== undefined) v = f[k].integerValue;
      else if (f[k].doubleValue !== undefined) v = f[k].doubleValue;
      console.log(`  session.${k} = ${v}`);
    }
  }
}
