/**
 * Passe deugnilson@gmail.com en isPremium=true.
 * Sauvegarde la valeur précédente dans backup-deugnilson-premium.json.
 * Run: node set-deugnilson-premium.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const USER_ID = '1rb3mwtLptOdjrD4M6i4cxfAFi72';

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o = {}; for (const [k, v] of Object.entries(fields)) o[k] = pv(v); return o; }

// 1. Lecture état actuel
const getRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${USER_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const before = await getRes.json();
if (!before.fields) { console.error('User introuvable:', before); process.exit(1); }
const beforeData = pf(before.fields);
console.log('— AVANT —');
console.log(`  email:    ${beforeData.email}`);
console.log(`  isPremium: ${beforeData.isPremium}`);
console.log(`  stripeCustomerId: ${beforeData.stripeCustomerId || '(aucun)'}`);

writeFileSync('backup-deugnilson-premium.json', JSON.stringify({ timestamp: new Date().toISOString(), before: beforeData }, null, 2));
console.log('💾 Backup écrit: backup-deugnilson-premium.json');

// 2. PATCH isPremium=true (updateMask pour ne toucher QUE ce champ)
const patchRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${USER_ID}?updateMask.fieldPaths=isPremium`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { isPremium: { booleanValue: true } } }),
});
const patched = await patchRes.json();
if (patched.error) { console.error('🔴 Erreur PATCH:', patched.error); process.exit(1); }

const after = pf(patched.fields);
console.log('\n— APRÈS —');
console.log(`  isPremium: ${after.isPremium}`);
console.log(`\n✅ deugnilson@gmail.com est maintenant premium.`);
console.log(`\nPour revenir en arrière :`);
console.log(`  node -e "import('fs').then(({readFileSync})=>{const b=JSON.parse(readFileSync('backup-deugnilson-premium.json'));console.log('Valeur précédente:',b.before.isPremium)})"`);
