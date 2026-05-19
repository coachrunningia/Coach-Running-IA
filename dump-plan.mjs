import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PLAN_ID = process.argv[2];
if (!PLAN_ID) { console.error('Usage: node dump-plan.mjs <planId>'); process.exit(1); }

const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
const refreshToken = config.tokens?.refresh_token;

const tr = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi' }),
});
const { access_token } = await tr.json();

const r = await fetch(`https://firestore.googleapis.com/v1/projects/coach-running-ia/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` },
});
const doc = await r.json();

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

const plan = pf(doc.fields);
writeFileSync(`plan-${PLAN_ID}.json`, JSON.stringify(plan, null, 2));
console.log(`Écrit: plan-${PLAN_ID}.json`);
console.log(`Keys racine: ${Object.keys(plan).join(', ')}`);
console.log(`Weeks: ${plan.weeks?.length || 0}`);
console.log(`Sessions totales: ${(plan.weeks || []).reduce((s,w) => s + (w.sessions||[]).length, 0)}`);
