// Pour chaque user créé aujourd'hui : a-t-il reçu son plan ou pas ?
import { execSync } from 'child_process';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const USERS = [
  { uid:'VrjPeZ84teW1IwjNyjoH12pnQpi1', email:'herve.louvel@icloud.com' },
  { uid:'bNTAkiezfzf2ZxLEFiwqAcvldsD3', email:'(Julian)' },
  { uid:'hRPS1SEzXIR0D44OsVPsFybzPV73', email:'morgane.maupin@laposte.net' },
  { uid:'TvrFIXvwaqPROy5NjQ0mmgNAOUS2', email:'maud@maisonorgo.com' },
  { uid:'bfEUtFhTbCgsiut7yUJvW9sskPn2', email:'delphine2107@yahoo.fr' },
];

// Récupérer aussi al1.kasongo
const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
  { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
    body: JSON.stringify({ email:['al1.kasongo@hotmail.fr'] }) });
const al1Uid = (await lookup.json()).users?.[0]?.localId;
if (al1Uid) USERS.push({ uid:al1Uid, email:'al1.kasongo@hotmail.fr' });

// Pour chaque user, lister plans + générer verdict
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  AUDIT USERS RÉCENTS — Qui a reçu son plan, qui a été bloqué ?');
console.log('═══════════════════════════════════════════════════════════════\n');

const verdicts = [];

for (const u of USERS) {
  // Lookup pour email + emailVerified + lastSeen
  const lu = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ localId:[u.uid] }) });
  const luj = await lu.json();
  const acc = luj.users?.[0];
  const realEmail = acc?.email || u.email;
  const verified = acc?.emailVerified;
  const created = acc?.createdAt ? new Date(parseInt(acc.createdAt)).toISOString() : '?';

  // Plans
  const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:u.uid} } } } }) });
  const plans = (await plansResp.json()).filter(r => r.document);

  // Errors
  const errResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json','x-goog-user-project':PROJECT},
      body: JSON.stringify({ structuredQuery: { from:[{collectionId:'generation_errors'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:u.uid} } } } }) });
  const errs = (await errResp.json()).filter(r => r.document);

  // Verdict
  let verdict, action;
  if (plans.length === 0 && errs.length > 0) {
    verdict = '❌ BLOQUÉ par bug — pas de plan créé';
    action = 'INVITER À RETESTER';
  } else if (plans.length === 0) {
    verdict = '⏸️ Pas de plan (peut-être inscription abandonnée)';
    action = 'OPTIONNEL';
  } else {
    const maxWeeks = Math.max(...plans.map(p => p.document.fields.weeks?.arrayValue?.values?.length || 0));
    if (maxWeeks === 1) {
      verdict = '⚠️ Preview seul (1 semaine) — soit gratuit, soit bloqué après preview';
      action = 'À VOIR (peut être normal si gratuit)';
    } else {
      verdict = `✅ Plan complet (${maxWeeks} semaines)`;
      action = '—';
    }
  }

  console.log(`📋 ${realEmail}`);
  console.log(`   UID: ${u.uid}`);
  console.log(`   Email vérifié: ${verified ? '✅' : '❌'}`);
  console.log(`   Compte créé: ${created.substring(0,19)}`);
  console.log(`   Plans: ${plans.length} | Erreurs loggées: ${errs.length}`);
  for (const p of plans) {
    const f = p.document.fields;
    const w = f.weeks?.arrayValue?.values?.length || 0;
    const dist = f.distance?.stringValue || '?';
    const ca = f.createdAt?.stringValue || '?';
    const isPrev = f.isPreview?.booleanValue;
    console.log(`     - distance=${dist} weeks=${w} isPreview=${isPrev} createdAt=${ca.substring(0,19)}`);
  }
  console.log(`   ${verdict}`);
  console.log(`   ACTION: ${action}\n`);

  verdicts.push({ email: realEmail, uid: u.uid, plansCount: plans.length, errsCount: errs.length, verdict, action });
}

// Synthèse
console.log('═══════════════════════════════════════════════════════════════');
console.log('  SYNTHÈSE');
console.log('═══════════════════════════════════════════════════════════════\n');

const bloques = verdicts.filter(v => v.action === 'INVITER À RETESTER');
const ok = verdicts.filter(v => v.verdict.includes('✅'));
const preview = verdicts.filter(v => v.verdict.includes('Preview'));
const abandon = verdicts.filter(v => v.action === 'OPTIONNEL');

console.log(`✅ Plan complet OK: ${ok.length}`);
ok.forEach(v => console.log(`   - ${v.email}`));
console.log(`\n⚠️ Preview seul: ${preview.length}`);
preview.forEach(v => console.log(`   - ${v.email}`));
console.log(`\n❌ BLOQUÉS par bug (à recontacter): ${bloques.length}`);
bloques.forEach(v => console.log(`   - ${v.email}`));
console.log(`\n⏸️ Pas de plan, pas d'erreur loggée: ${abandon.length}`);
abandon.forEach(v => console.log(`   - ${v.email}`));
