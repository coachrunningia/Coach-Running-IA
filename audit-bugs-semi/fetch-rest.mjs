import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PROJECT = 'coach-running-ia';

async function getToken() {
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf-8'));
    const refresh = cfg.tokens?.refresh_token;
    if (refresh) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token', refresh_token: refresh,
          client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
          client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
        }),
      });
      const j = await res.json();
      if (j.access_token) return j.access_token;
    }
  } catch (e) {}
  const { execSync } = await import('child_process');
  return execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
}

function pv(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(pv);
  if (v.mapValue) return pf(v.mapValue.fields);
  return null;
}
function pf(fields) { if (!fields) return {}; const o={}; for (const [k,v] of Object.entries(fields)) o[k]=pv(v); return o; }

const token = await getToken();

async function getDoc(path) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await res.json();
  if (d.error) return { error: d.error };
  return { id: d.name.split('/').pop(), createTime: d.createTime, ...pf(d.fields) };
}

const ids = ['1779291643754', '1779291819180', '1779292771055', '1779296358366'];
const summary = [];
for (const id of ids) {
  const plan = await getDoc(`plans/${id}`);
  if (plan.error) { console.log(`PLAN ${id} ERROR:`, plan.error.message); summary.push({ id, error: plan.error.message }); continue; }
  writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/plan-${id}.json`, JSON.stringify(plan, null, 2));
  const uid = plan.userId;
  let user = null;
  if (uid) {
    user = await getDoc(`users/${uid}`);
    if (!user.error) writeFileSync(`/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/user-${id}.json`, JSON.stringify(user, null, 2));
  }
  console.log(`OK ${id} userId=${uid} email=${user?.email || 'NA'}`);
  summary.push({ id, uid, email: user?.email });
}
writeFileSync('/Users/romanemarino/Coach-Running-IA/audit-bugs-semi/_summary.json', JSON.stringify(summary, null, 2));
process.exit(0);
