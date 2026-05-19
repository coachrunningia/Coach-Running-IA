// PATCH DRY-RUN : force isPremium=true sur le compte Thomas Weill
// UID cible : nMH83IjgsYZY24QYWyijuIjyoH33 (thomas.weill.pro@gmail.com)
//
// ATTENTION : NE PAS EXÉCUTER sans GO ROMANE EXPLICITE.
// Par défaut, ce script est en mode dry-run (DRY_RUN=true). Pour exécuter :
//   DRY_RUN=false node patch-thomas-ispremium.mjs
//
// Le script :
//  1) lit le doc users/nMH83IjgsYZY24QYWyijuIjyoH33 actuel
//  2) affiche le diff (avant/après)
//  3) en mode dry-run : s'arrête là
//  4) en mode exec : applique le patch via Firestore REST
//
// Notes de doctrine :
//  - Le bug n'est PAS dans le webhook : Thomas a acheté un Plan Unique
//    (mode=payment), donc isPremium=false est by design.
//  - Patcher isPremium=true unlock Strava et features "abonné" pour Thomas,
//    mais c'est inéquitable vis-à-vis des autres 9 acheteurs Plan Unique
//    (dont chapeaujean@yahoo.fr, theosutter57, ghtdcd@laposte.net,
//    harnois.camille, perarnau.g, sarah.lefrancq, patrick.cadours,
//    lsautjeau, guillaumepoettoz, mhbrx06).
//  - Décision produit à prendre par Romane : soit on patch les 10, soit aucun.

import { execSync } from 'child_process';

const DRY_RUN = (process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';

const TARGET_UID = 'nMH83IjgsYZY24QYWyijuIjyoH33';
const TARGET_EMAIL = 'thomas.weill.pro@gmail.com';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const PROJECT = 'coach-running-ia';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// 1) Lecture état actuel
const rGet = await fetch(`${BASE}/users/${TARGET_UID}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const docCurrent = await rGet.json();
if(docCurrent.error) {
  console.error('ERR fetch:', docCurrent.error.message);
  process.exit(1);
}
const fCur = docCurrent.fields || {};
const cur = {
  email: fCur.email?.stringValue,
  isPremium: fCur.isPremium?.booleanValue,
  hasPurchasedPlan: fCur.hasPurchasedPlan?.booleanValue,
  planPurchaseDate: fCur.planPurchaseDate?.stringValue || fCur.planPurchaseDate?.timestampValue,
};

console.log('=== ÉTAT ACTUEL ===');
console.log(JSON.stringify({ uid: TARGET_UID, ...cur }, null, 2));

if(cur.email !== TARGET_EMAIL) {
  console.error(`ABORT : email actuel "${cur.email}" ≠ attendu "${TARGET_EMAIL}". Refus de patch.`);
  process.exit(2);
}
if(cur.hasPurchasedPlan !== true) {
  console.error(`ABORT : hasPurchasedPlan != true. Refus de patch (paiement non confirmé en base).`);
  process.exit(2);
}

console.log('\n=== DIFF ===');
console.log(`isPremium : ${cur.isPremium} → true`);
console.log(`premiumSince : (n/a) → ${new Date().toISOString()}  [ajout]`);

if(DRY_RUN) {
  console.log('\n[DRY-RUN] Aucune écriture Firestore. Pour exécuter : DRY_RUN=false node patch-thomas-ispremium.mjs');
  process.exit(0);
}

// 2) Patch (mode exec)
console.log('\n=== EXEC PATCH ===');
const updateMask = 'updateMask.fieldPaths=isPremium&updateMask.fieldPaths=premiumSince&updateMask.fieldPaths=premiumPatchedManually&updateMask.fieldPaths=premiumPatchReason';
const body = {
  fields: {
    isPremium: { booleanValue: true },
    premiumSince: { timestampValue: new Date().toISOString() },
    premiumPatchedManually: { booleanValue: true },
    premiumPatchReason: { stringValue: 'Plan Unique → unlock features (GO Romane 2026-05-19)' },
  }
};
const r = await fetch(`${BASE}/users/${TARGET_UID}?${updateMask}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const res = await r.json();
if(res.error) {
  console.error('ERR patch:', res.error);
  process.exit(3);
}
console.log('PATCH OK');
console.log('Nouveau isPremium :', res.fields?.isPremium?.booleanValue);
console.log('Nouveau premiumSince :', res.fields?.premiumSince?.timestampValue);
