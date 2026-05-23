import { execSync } from 'child_process';
const accessToken = execSync('gcloud auth print-access-token --impersonate-service-account=firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com 2>/dev/null').toString().trim();
const fetch = (await import('node-fetch')).default;
const projectId = 'coach-running-ia';

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

async function runQuery(structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery })
  });
  return await res.json();
}
function flat(r) {
  return (r || []).filter(rr => rr.document).map(rr => {
    const f = {};
    for (const [k, v] of Object.entries(rr.document.fields || {})) f[k] = parseFs(v);
    f._id = rr.document.name.split('/').pop();
    f._createTime = rr.document.createTime;
    return f;
  });
}

// Candidats à creuser
const candidates = [
  { uid: 'pU3EToUQWGgPJA3A8N8fHHm1Xct1', email: 'laurent_elisa26@orange.fr', label: 'PISTE #1 — Elisa @orange.fr (non premium)' },
  { uid: 'dVuk3CvGFYTauwRI2gGIFhUix7I2', email: 'arnaudmanoeuvre@gmail.com', label: 'PISTE #2 — Arnaud Manoeuvre (premium)' },
  { uid: 'YN3U8Iex3SMZgd4CkDkwj5lORE22', email: 'arnaudserres@orange.fr', label: 'PISTE #3 — Arnaud Serres (non premium)' },
  // Tous les autres Elisa/Elise/Lisa pour ratisser large
  { uid: 'YS3TQwqjNaZsTNSIQzw8UqMqyHB3', email: 'elisa.siebke@gmail.com', label: 'Elisa Siebke (non prem)' },
  { uid: 'dbDWPNTXCPPdZhyGxwu9KFNu5TC2', email: 'elisa.burgalat@laposte.net', label: 'Elisa Burgalat (non prem)' },
  { uid: 'nzs8zWyl5PN98XOuYfpJbDTEYf42', email: 'mariageelisa13@gmail.com', label: 'Mariageelisa13 (non prem)' },
  { uid: 'J5dqFViIPrQpnWVl29ye6onlQcm1', email: 'elise.dornier@icloud.com', label: 'Elise Dornier (non prem)' },
  { uid: 'v7pr1H6I81WqaTrSVl9ov7MlP6n2', email: 'elisezek@hotmail.fr', label: 'Elisezek (non prem)' },
  { uid: 'sP561Jjl5SgGm5mjMCoJAAiXYNm2', email: 'elidrawerytb@gmail.com', label: 'Elidrawerytb (non prem)' },
  { uid: '8MefMr54AsZXLyAwQevevBNnsek2', email: 'lisa.gollot@icloud.com', label: 'Lisa Gollot (non prem)' },
  { uid: 'ES3Rz6URNqROGGpHr2dmh2wRjn33', email: 'lisa-dutarde@hotmail.fr', label: 'Lisa Dutarde (premium)' },
  { uid: 'OFUKxs5O8VPYg9bi617vmDzZXa73', email: 'lisa_betti@hotmail.com', label: 'Lisa Betti (non prem)' },
  { uid: 'POnCbfSpfMNZaV0I6WEhINgRFp82', email: 'lisaaziane@gmail.com', label: 'Lisa Aziane (non prem)' },
];

console.log('═══════════════════════════════════════');
console.log('🔬 INSPECTION DES INPUTS PLAN / QUESTIONNAIRE');
console.log('═══════════════════════════════════════\n');

function pickQuestionnaireFields(plan) {
  const qs = plan.questionnaireSnapshot
    || (plan.generationContext && plan.generationContext.questionnaireSnapshot)
    || plan.questionnaireData
    || {};
  // Top-level fields can also carry name/age
  const merged = { ...qs };
  for (const k of ['name', 'firstName', 'lastName', 'prenom', 'nom', 'age', 'city', 'ville', 'comments']) {
    if (plan[k] != null && merged[k] == null) merged[k] = plan[k];
  }
  return merged;
}

for (const c of candidates) {
  console.log(`──────────── ${c.label}`);
  console.log(`   email: ${c.email} | uid: ${c.uid}`);

  // Get user doc
  const userUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${c.uid}`;
  const ur = await (await fetch(userUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (ur.fields) {
    const u = {};
    for (const [k, v] of Object.entries(ur.fields)) u[k] = parseFs(v);
    console.log(`   user.firstName: ${u.firstName || '?'} | photoURL: ${(u.photoURL || '').slice(0, 80) || '-'}`);
  }

  // Get all plans (by userId)
  const plans = flat(await runQuery({
    from: [{ collectionId: 'plans' }],
    where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: c.uid } } },
    limit: 10
  }));
  console.log(`   📋 ${plans.length} plan(s) :`);

  if (plans.length === 0) {
    console.log('     (aucun)');
  } else {
    for (const p of plans) {
      const q = pickQuestionnaireFields(p);
      console.log(`     • planId: ${p._id} | goal: ${p.goal} | createdAt: ${p._createTime}`);
      console.log(`       inputs : name=${q.name || q.firstName || q.prenom || '?'} | age=${q.age || '?'} | city=${q.city || q.ville || '?'} | freq=${q.frequency || '?'} | vol=${q.currentWeeklyVolume || '?'} | level=${q.level || '?'}`);
      if (q.comments) console.log(`       comments: "${(q.comments || '').slice(0, 150)}"`);
      // Show raceDate or distance
      if (p.raceDate) console.log(`       raceDate: ${p.raceDate}`);
    }
  }

  // Check also plan_deletions
  const dels = flat(await runQuery({
    from: [{ collectionId: 'plan_deletions' }],
    where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: c.uid } } },
    limit: 5
  }));
  if (dels.length > 0) {
    console.log(`   🗑️ ${dels.length} plan(s) supprimé(s) :`);
    for (const d of dels) {
      console.log(`     • ${d._id} | ${JSON.stringify(d).slice(0, 300)}`);
    }
  }

  console.log('');
}

console.log('\n═══════════════════════════════════════');
console.log('🎯 RAPPEL CIBLE Elisa Arnaud (elisarnaud.1311@gmail.com)');
console.log('   firstName Google OAuth : "Arnaud"');
console.log('   1311 → probable date naissance 13 novembre');
console.log('═══════════════════════════════════════');
