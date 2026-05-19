import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TOKEN = execSync('gcloud auth application-default print-access-token').toString().trim();
const PROJECT = 'coach-running-ia';

const USERS = {
  Ambre: { uid: 'qJzkzjA5E5cVm0uRxAtK57zWlKy2', email: 'painvin.ambre@yahoo.com', label: 'AMBRE (bloquée)' },
  Al1: { uid: null, email: 'al1.kasongo@hotmail.fr', label: 'AL1 (Premium OK)' },
};

// Récupérer UID Al1 via email
async function findUid(email) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
        limit: 1,
      }
    })
  });
  const j = await r.json();
  return j.find(x => x.document)?.document?.name?.split('/').pop();
}

USERS.Al1.uid = await findUid(USERS.Al1.email);
console.log('Al1 UID trouvé:', USERS.Al1.uid);

function unwrap(f) {
  if (!f) return undefined;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return +f.integerValue;
  if (f.doubleValue !== undefined) return +f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.nullValue !== undefined) return null;
  if (f.timestampValue !== undefined) return f.timestampValue;
  if (f.arrayValue) return (f.arrayValue.values||[]).map(unwrap);
  if (f.mapValue) {
    const o = {}; for (const k of Object.keys(f.mapValue.fields||{})) o[k] = unwrap(f.mapValue.fields[k]); return o;
  }
  return undefined;
}

async function getAllData(uid) {
  // 1. Firestore user doc
  const r1 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const userDoc = await r1.json();
  const userData = {};
  for (const k of Object.keys(userDoc.fields || {})) userData[k] = unwrap(userDoc.fields[k]);

  // 2. Firebase Auth
  const r2 = await fetch('https://identitytoolkit.googleapis.com/v1/projects/coach-running-ia/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'x-goog-user-project': 'coach-running-ia' },
    body: JSON.stringify({ localId: [uid] }),
  });
  const j2 = await r2.json();
  const auth = j2.users?.[0] || {};

  // 3. Plans
  const r3 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plans' }],
        where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } },
        limit: 10
      }
    })
  });
  const j3 = await r3.json();
  const plans = (j3 || []).filter(x => x.document).map(x => ({
    id: x.document.name.split('/').pop(),
    name: x.document.fields.name?.stringValue,
    createdAt: x.document.fields.createdAt?.stringValue,
    isPreview: x.document.fields.isPreview?.booleanValue,
    fullGen: x.document.fields.fullPlanGenerated?.booleanValue,
    weeks: x.document.fields.weeks?.arrayValue?.values?.length || 0,
    score: x.document.fields.confidenceScore?.integerValue,
  }));

  // 4. Plan deletions
  const r4 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'plan_deletions' }],
        where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } },
        limit: 10
      }
    })
  });
  const j4 = await r4.json();
  const deletions = (j4 || []).filter(x => x.document).length;

  // 5. Generation errors
  const r5 = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'generation_errors' }],
        where: { fieldFilter: { field: { fieldPath: 'userId' }, op: 'EQUAL', value: { stringValue: uid } } },
        limit: 10
      }
    })
  });
  const j5 = await r5.json();
  const errors = (j5 || []).filter(x => x.document).map(x => ({
    createdAt: x.document.fields.createdAt?.timestampValue,
    error: x.document.fields.errorMessage?.stringValue,
  }));

  return { userData, auth, plans, deletions, errors };
}

const dataA = await getAllData(USERS.Ambre.uid);
const dataB = await getAllData(USERS.Al1.uid);

writeFileSync('/Users/romanemarino/Coach-Running-IA/ambre-vs-al1.json', JSON.stringify({ Ambre: dataA, Al1: dataB }, null, 2));

// ===== Affichage côte à côte =====
function row(label, valA, valB) {
  const a = String(valA === undefined ? '∅' : (typeof valA === 'object' ? JSON.stringify(valA).substring(0,60) : valA)).padEnd(38);
  const b = String(valB === undefined ? '∅' : (typeof valB === 'object' ? JSON.stringify(valB).substring(0,60) : valB)).padEnd(38);
  const diff = JSON.stringify(valA) !== JSON.stringify(valB) ? '🔴' : '  ';
  console.log(`${diff} ${label.padEnd(26)} │ ${a} │ ${b}`);
}

console.log('\n' + '='.repeat(100));
console.log(' COMPARAISON AMBRE (bloquée) vs AL1 (Premium OK)');
console.log('='.repeat(100));
console.log('                              │ AMBRE                                  │ AL1');
console.log('-'.repeat(100));

console.log('\n--- Firestore user doc (champs racine) ---');
const allUserKeys = [...new Set([...Object.keys(dataA.userData), ...Object.keys(dataB.userData)])].sort();
for (const k of allUserKeys) {
  if (k === 'questionnaireData') continue;
  row(k, dataA.userData[k], dataB.userData[k]);
}

console.log('\n--- Firebase Auth ---');
const authKeys = ['email','emailVerified','disabled','displayName','providerUserInfo','customClaims','validSince','lastLoginAt','lastRefreshAt','createdAt','passwordUpdatedAt'];
for (const k of authKeys) {
  row(k, dataA.auth[k], dataB.auth[k]);
}

console.log('\n--- Plans ---');
row('Nb plans', dataA.plans.length, dataB.plans.length);
row('plan_deletions', dataA.deletions, dataB.deletions);
row('generation_errors', dataA.errors.length, dataB.errors.length);

console.log('\n--- questionnaireData (clés présentes) ---');
const qdA = Object.keys(dataA.userData.questionnaireData || {}).sort();
const qdB = Object.keys(dataB.userData.questionnaireData || {}).sort();
const allQdKeys = [...new Set([...qdA, ...qdB])].sort();
for (const k of allQdKeys) {
  const presentA = qdA.includes(k);
  const presentB = qdB.includes(k);
  const valA = dataA.userData.questionnaireData?.[k];
  const valB = dataB.userData.questionnaireData?.[k];
  if (!presentA || !presentB) {
    console.log(`🔴 ${k.padEnd(26)} │ ${presentA ? String(valA).substring(0,40) : '⚠️ MANQUE'.padEnd(40)} │ ${presentB ? String(valB).substring(0,40) : '⚠️ MANQUE'}`);
  } else {
    const sameType = typeof valA === typeof valB;
    const flag = sameType ? '  ' : '🔴';
    console.log(`${flag} ${k.padEnd(26)} │ ${String(valA).substring(0,38).padEnd(38)} │ ${String(valB).substring(0,38).padEnd(38)}`);
  }
}

console.log('\n--- Resume ---');
console.log('Dump complet écrit dans /Users/romanemarino/Coach-Running-IA/ambre-vs-al1.json');
