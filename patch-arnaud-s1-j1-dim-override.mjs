import { execSync } from 'child_process';
import fs from 'fs';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const planId = '1779554515397';
const url = `https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${planId}`;
const DRY = process.argv.includes('--dry');

function parseFs(f) {
  if (f == null) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return parseInt(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(parseFs);
  if ('mapValue' in f) {
    const out = {};
    for (const [k, v] of Object.entries(f.mapValue.fields || {})) out[k] = parseFs(v);
    return out;
  }
  return f;
}
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFs(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

const doc = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const plan = {};
for (const [k, v] of Object.entries(doc.fields)) plan[k] = parseFs(v);

// Backup
const backup = `/Users/romanemarino/Coach-Running-IA/backup-arnaud-s1-override-${Date.now()}.json`;
fs.writeFileSync(backup, JSON.stringify(plan, null, 2));
console.log(`✅ Backup: ${backup}`);

// Sessions S1 — identifier la première (Lundi)
console.log('\n📋 État S1 actuel :');
const s1 = plan.weeks[0].sessions || [];
for (let i = 0; i < s1.length; i++) {
  console.log(`  ${i}: day=${s1[i].day} | type=${s1[i].type} | title=${s1[i].title} | dateOverride=${s1[i].dateOverride || 'none'}`);
}

// Trouver la session day=Lundi de S1 (la première séance de la semaine)
const lundiIdx = s1.findIndex(s => s.day === 'Lundi');
if (lundiIdx === -1) {
  console.error('❌ Aucune session Lundi en S1');
  process.exit(1);
}
console.log(`\n🎯 Session Lundi à patcher : index ${lundiIdx} — "${s1[lundiIdx].title}"`);

// Patch : ajouter dateOverride dim 24/05 sur la séance Lundi
const newS1Sessions = s1.map((s, i) => {
  if (i === lundiIdx) {
    console.log(`  ✓ Override : "${s.title}" → dateOverride = 2026-05-24 (dim 24 mai, demande Arnaud)`);
    return { ...s, dateOverride: '2026-05-24' };
  }
  return s;
});

const newWeeks = [...plan.weeks];
newWeeks[0] = { ...plan.weeks[0], sessions: newS1Sessions };

console.log('\n📊 Effet attendu après patch :');
console.log(`  - S1 J1 (Lundi avec override) → dim 24/05 (au lieu de lun 25/05)`);
console.log(`  - S1 autres séances (Mardi/Jeudi/Vendredi) → inchangées (mar 26 / jeu 28 / ven 29)`);
console.log(`  - S2+ → INCHANGÉES (preferredDays Lun/Mar/Jeu/Ven respectés à partir de S2)`);

if (DRY) {
  console.log('\n🛑 DRY-RUN');
  process.exit(0);
}

const patchRes = await fetch(`${url}?updateMask.fieldPaths=weeks`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { weeks: toFs(newWeeks) } }),
});
const r = await patchRes.json();
if (r.error) { console.error('❌', JSON.stringify(r.error)); process.exit(1); }
console.log(`\n✅ PATCH APPLIQUÉ — updateTime: ${r.updateTime}`);

// Verif
const verifDoc = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
const v = {};
for (const [k, val] of Object.entries(verifDoc.fields)) v[k] = parseFs(val);
console.log('\n🔍 Vérif post-patch S1 sessions :');
for (const s of v.weeks[0].sessions || []) {
  console.log(`  day=${s.day} | dateOverride=${s.dateOverride || 'none'} | title=${s.title}`);
}
