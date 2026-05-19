// Vérification post-patch : compare backup vs état actuel, champ par champ, en normalisant.
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779114282783';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const before = JSON.parse(readFileSync('/Users/romanemarino/Coach-Running-IA/backup-plan-alan-pre-patch.json','utf8'));
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const after = await r.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-plan-alan-post-patch.json', JSON.stringify(after, null, 2));

// Normalisation récursive : tri des clés d'objets pour comparer indépendamment de l'ordre.
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') {
    const out = {};
    for (const k of Object.keys(x).sort()) out[k] = canon(x[k]);
    return out;
  }
  return x;
}
const cBefore = canon(before.fields || {});
const cAfter = canon(after.fields || {});

const keys = new Set([...Object.keys(cBefore), ...Object.keys(cAfter)]);
console.log('CHAMP                          AVANT==APRES');
console.log('────────────────────────────────────────────');
const changed = [];
for (const k of [...keys].sort()) {
  const eq = JSON.stringify(cBefore[k]) === JSON.stringify(cAfter[k]);
  console.log(`${k.padEnd(30)} ${eq ? 'OUI' : 'NON (changé)'}`);
  if (!eq) changed.push(k);
}

console.log('\n=== Champs qui ont changé ===');
console.log(changed.length ? changed.join(', ') : '(aucun)');

if (changed.length === 1 && changed[0] === 'welcomeMessage') {
  console.log('\nOK PARFAIT : SEUL welcomeMessage a changé.');
} else {
  console.log('\nATTENTION : plus que welcomeMessage a changé — détailler ci-dessous.');
  for (const k of changed) {
    if (k === 'welcomeMessage') continue;
    console.log(`\n--- ${k} ---`);
    console.log('AVANT:', JSON.stringify(cBefore[k]).substring(0, 500));
    console.log('APRES:', JSON.stringify(cAfter[k]).substring(0, 500));
  }
}

// Vérification ciblée valeurs critiques
const ftBefore = before.fields?.feasibility?.mapValue?.fields || {};
const ftAfter = after.fields?.feasibility?.mapValue?.fields || {};
console.log('\n=== feasibility (valeurs) ===');
console.log(`status   : "${ftBefore.status?.stringValue}" -> "${ftAfter.status?.stringValue}"`);
console.log(`message  : ${ftBefore.message?.stringValue === ftAfter.message?.stringValue ? 'identique' : 'DIFFERENT'}`);
console.log(`safetyWarning : ${ftBefore.safetyWarning?.stringValue === ftAfter.safetyWarning?.stringValue ? 'identique' : 'DIFFERENT'}`);
console.log(`recommendation: ${ftBefore.recommendation?.stringValue === ftAfter.recommendation?.stringValue ? 'identique' : 'DIFFERENT'}`);

// paces
const pBefore = JSON.stringify(canon(before.fields?.paces));
const pAfter  = JSON.stringify(canon(after.fields?.paces));
console.log(`\npaces : ${pBefore === pAfter ? 'identique' : 'DIFFERENT'} (len ${pBefore.length} vs ${pAfter.length})`);

// weeks
const wBefore = JSON.stringify(canon(before.fields?.weeks));
const wAfter  = JSON.stringify(canon(after.fields?.weeks));
console.log(`weeks : ${wBefore === wAfter ? 'identique' : 'DIFFERENT'} (len ${wBefore.length} vs ${wAfter.length})`);

// welcomeMessage final
console.log('\n=== welcomeMessage final (re-read) ===');
console.log(after.fields?.welcomeMessage?.stringValue);
