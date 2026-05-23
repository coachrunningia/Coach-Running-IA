#!/usr/bin/env node
/**
 * delete-thomas-plan-live.mjs
 *
 * Suppression live du plan Marathon Thomas Weill (plan ID 1779217739002).
 *
 * CONTEXTE — Verbatim Romane :
 *   "il s'est trompé de nombre de séance donc on va supprimer son plan
 *    ET permettre que quand il regenere il puisse deployer en complet
 *    le plan qu'il viendra de creer."
 *
 * Mécanique :
 *  - On supprime le doc `plans/{planId}` (Thomas n'a qu'1 plan).
 *  - On NE TOUCHE PAS `users/{uid}` :
 *      • `hasPurchasedPlan: true`  → reste = full plan automatique à régen
 *      • `planPurchaseDate`        → reste
 *      • `isPremium: false`        → inchangé (Plan Unique, normal)
 *  - maxActive = 2 plans (App.tsx:446 Plan Unique) → suppression OK,
 *    pas de crédit consommé côté Firestore.
 *
 * Pré-requis vérifiés au runtime :
 *  - 1 seul plan pour ce user (sinon STOP, demander GO Romane).
 *  - Email = thomas.weill.pro@gmail.com.
 *  - subGoal = Marathon, sex = Homme, age = 31 (anti-erreur identité).
 *  - Backup obligatoire AVANT delete.
 *
 * Dry-run par défaut. Pour exécuter : DRY_RUN=false node delete-thomas-plan-live.mjs
 *
 * Rollback :
 *  - Backup JSON sauvegardé dans /Users/romanemarino/Coach-Running-IA/
 *    backup-thomas-plan-PRE-DELETE-<ts>.json
 *  - Restauration possible via POST createDocument avec ce backup.
 */

import { execSync } from 'node:child_process';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779217739002';
const UID = 'nMH83IjgsYZY24QYWyijuIjyoH33';
const EXPECTED_EMAIL = 'thomas.weill.pro@gmail.com';

const PLAN_DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const USER_DOC_PATH = `projects/${PROJECT}/databases/(default)/documents/users/${UID}`;
const PLAN_URL = `https://firestore.googleapis.com/v1/${PLAN_DOC_PATH}`;
const USER_URL = `https://firestore.googleapis.com/v1/${USER_DOC_PATH}`;
const QUERY_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_FILE = `/Users/romanemarino/Coach-Running-IA/backup-thomas-plan-PRE-DELETE-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

function token() {
  return execSync('gcloud auth print-access-token').toString().trim();
}

function fetchUser() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" "${USER_URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

function fetchPlan() {
  const t = token();
  const out = execSync(
    `curl -s -H "Authorization: Bearer ${t}" "${PLAN_URL}"`,
    { maxBuffer: 50 * 1024 * 1024 }
  ).toString();
  return JSON.parse(out);
}

function listPlansForUser() {
  const t = token();
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'plans' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'userId' },
          op: 'EQUAL',
          value: { stringValue: UID },
        },
      },
    },
  };
  const tmp = `/tmp/q-thomas-${Date.now()}.json`;
  execSync(`cat > ${tmp} <<'JSON_EOF'\n${JSON.stringify(body)}\nJSON_EOF`);
  const out = execSync(
    `curl -s -X POST -H "Authorization: Bearer ${t}" -H "Content-Type: application/json" --data-binary @${tmp} "${QUERY_URL}"`,
    { maxBuffer: 100 * 1024 * 1024 }
  ).toString();
  const arr = JSON.parse(out);
  if (!Array.isArray(arr)) {
    throw new Error('Réponse runQuery non-array : ' + JSON.stringify(arr).slice(0, 300));
  }
  return arr.filter((x) => x.document).map((x) => x.document);
}

(async () => {
  console.log(`>>> DELETE plan Thomas Weill (${PLAN_ID}) — DRY_RUN=${DRY_RUN}`);
  console.log(`>>> UID: ${UID}`);
  console.log(`>>> Expected email: ${EXPECTED_EMAIL}\n`);

  // ─── 1. Fetch user + sanity ───
  const userDoc = fetchUser();
  if (!userDoc.fields) throw new Error('User introuvable.');
  const uf = userDoc.fields;
  const userEmail = uf.email?.stringValue;
  const hasPurchased = uf.hasPurchasedPlan?.booleanValue;
  // planPurchaseDate est stocké en stringValue dans Firestore (ISO string), pas timestampValue.
  const planPurchaseDate = uf.planPurchaseDate?.stringValue || uf.planPurchaseDate?.timestampValue;
  const isPremium = uf.isPremium?.booleanValue;
  const firstName = uf.firstName?.stringValue;
  // questionnaireData est sur le USER (pas sur le plan)
  const qd = uf.questionnaireData?.mapValue?.fields || {};
  const qdEmail = qd.email?.stringValue;
  const qdSex = qd.sex?.stringValue;
  const qdAge = qd.age?.integerValue || qd.age?.doubleValue;
  const qdSubGoal = qd.subGoal?.stringValue;
  const qdTargetTime = qd.targetTime?.stringValue;
  const qdFrequency = qd.frequency?.integerValue || qd.frequency?.doubleValue;

  console.log('--- USER PRE-DELETE ---');
  console.log(`  email                : ${userEmail}`);
  console.log(`  firstName            : ${firstName}`);
  console.log(`  hasPurchasedPlan     : ${hasPurchased}`);
  console.log(`  planPurchaseDate     : ${planPurchaseDate}`);
  console.log(`  isPremium            : ${isPremium}`);
  console.log(`  questionnaire email  : ${qdEmail}`);
  console.log(`  questionnaire sex    : ${qdSex}`);
  console.log(`  questionnaire age    : ${qdAge}`);
  console.log(`  questionnaire subGoal: ${qdSubGoal}`);
  console.log(`  questionnaire target : ${qdTargetTime}`);
  console.log(`  questionnaire freq   : ${qdFrequency}`);

  if (userEmail !== EXPECTED_EMAIL) {
    throw new Error(`STOP — email user (${userEmail}) ≠ attendu (${EXPECTED_EMAIL}). Anti-erreur.`);
  }
  if (qdEmail !== EXPECTED_EMAIL) {
    throw new Error(`STOP — questionnaire email (${qdEmail}) ≠ attendu (${EXPECTED_EMAIL}). Anti-erreur.`);
  }
  if (hasPurchased !== true) {
    throw new Error(`STOP — hasPurchasedPlan ≠ true. On ne veut pas perdre le bénéfice paiement.`);
  }
  if (!planPurchaseDate) {
    throw new Error(`STOP — planPurchaseDate manquant. Anomalie.`);
  }
  if (qdSubGoal !== 'Marathon') {
    throw new Error(`STOP — subGoal questionnaire (${qdSubGoal}) ≠ Marathon. Anti-erreur.`);
  }
  if (qdSex !== 'Homme') {
    throw new Error(`STOP — sex questionnaire (${qdSex}) ≠ Homme. Anti-erreur.`);
  }
  if (String(qdAge) !== '31') {
    throw new Error(`STOP — age questionnaire (${qdAge}) ≠ 31. Anti-erreur.`);
  }

  // ─── 2. List all plans for this user → doit en avoir 1 seul ───
  const plans = listPlansForUser();
  console.log(`\n--- PLANS PRE-DELETE (collection plans) ---`);
  console.log(`  Total trouvés : ${plans.length}`);
  for (const p of plans) {
    const id = p.name.split('/').pop();
    const totalW = p.fields?.weeks?.arrayValue?.values?.length || '?';
    console.log(`  - planId=${id}  weeks=${totalW}  createTime=${p.createTime}  updateTime=${p.updateTime}`);
  }

  if (plans.length === 0) {
    console.warn(`\n⚠ Aucun plan trouvé pour ce user — rien à supprimer. FLAG.`);
    process.exit(0);
  }
  if (plans.length > 1) {
    console.error(`\n⛔ ${plans.length} plans trouvés pour Thomas — STOP, GO Romane requis avant suppression multiple.`);
    process.exit(1);
  }

  const targetPlanId = plans[0].name.split('/').pop();
  if (targetPlanId !== PLAN_ID) {
    throw new Error(`STOP — plan trouvé (${targetPlanId}) ≠ PLAN_ID hardcodé (${PLAN_ID}). Anti-erreur.`);
  }

  // ─── 3. Fetch plan + sanity (userEmail/userId/goal/distance/targetTime) ───
  const planDoc = fetchPlan();
  if (!planDoc.fields) throw new Error('Plan introuvable.');
  const pf = planDoc.fields;
  // Structure réelle : champs top-level sur le plan (pas de questionnaireData).
  const planUserEmail = pf.userEmail?.stringValue;
  const planUserId = pf.userId?.stringValue;
  const planGoal = pf.goal?.stringValue;
  const planDistance = pf.distance?.stringValue;
  const planTargetTime = pf.targetTime?.stringValue;
  const planName = pf.name?.stringValue;
  const planFrequency = pf.sessionsPerWeek?.integerValue || pf.sessionsPerWeek?.doubleValue;
  const planDurationWeeks = pf.durationWeeks?.integerValue || pf.durationWeeks?.doubleValue;
  const planTotalWeeks = pf.weeks?.arrayValue?.values?.length;

  console.log('\n--- PLAN PRE-DELETE (sanity check) ---');
  console.log(`  planId         : ${PLAN_ID}`);
  console.log(`  userEmail      : ${planUserEmail}`);
  console.log(`  userId         : ${planUserId}`);
  console.log(`  goal           : ${planGoal}`);
  console.log(`  distance       : ${planDistance}`);
  console.log(`  targetTime     : ${planTargetTime}`);
  console.log(`  name           : ${planName}`);
  console.log(`  sessionsPerWeek: ${planFrequency}`);
  console.log(`  durationWeeks  : ${planDurationWeeks}`);
  console.log(`  totalWeeks(arr): ${planTotalWeeks}`);
  console.log(`  createTime     : ${planDoc.createTime}`);
  console.log(`  updateTime     : ${planDoc.updateTime}`);

  if (planUserEmail !== EXPECTED_EMAIL) {
    throw new Error(`STOP — userEmail plan (${planUserEmail}) ≠ attendu (${EXPECTED_EMAIL}). Anti-erreur.`);
  }
  if (planUserId !== UID) {
    throw new Error(`STOP — userId plan (${planUserId}) ≠ attendu (${UID}). Anti-erreur.`);
  }
  if (planDistance !== '42.195 km') {
    throw new Error(`STOP — distance plan (${planDistance}) ≠ "42.195 km". Anti-erreur Marathon.`);
  }
  if (planGoal !== 'Course sur route') {
    throw new Error(`STOP — goal plan (${planGoal}) ≠ "Course sur route". Anti-erreur.`);
  }
  if (!/marathon/i.test(planName || '')) {
    throw new Error(`STOP — name plan ("${planName}") ne contient pas "Marathon". Anti-erreur.`);
  }

  // ─── 4. Backup ───
  console.log(`\n--- BACKUP ---`);
  execSync(`cat > ${BACKUP_FILE} <<'JSON_EOF'\n${JSON.stringify(planDoc, null, 2)}\nJSON_EOF`);
  const sizeKb = (execSync(`stat -f%z "${BACKUP_FILE}"`).toString().trim() / 1024).toFixed(1);
  console.log(`  Fichier : ${BACKUP_FILE}`);
  console.log(`  Taille  : ${sizeKb} KB`);

  // ─── 5. DRY-RUN cut-off ───
  if (DRY_RUN) {
    console.log('\n=== DRY RUN — aucune écriture/suppression effectuée ===');
    console.log('Pour exécuter : DRY_RUN=false node delete-thomas-plan-live.mjs');
    return;
  }

  // ─── 6. DELETE plan ───
  console.log(`\n--- DELETE plans/${PLAN_ID} ---`);
  const t = token();
  const delRes = execSync(
    `curl -s -X DELETE -H "Authorization: Bearer ${t}" "${PLAN_URL}"`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString();
  // DELETE Firestore REST = body vide en succès, JSON erreur sinon.
  if (delRes.trim().length > 0) {
    let parsed;
    try { parsed = JSON.parse(delRes); } catch (_) {
      console.error('Réponse DELETE non-JSON :', delRes.slice(0, 500));
      process.exit(1);
    }
    if (parsed.error) {
      console.error('ERREUR DELETE :', JSON.stringify(parsed.error, null, 2));
      process.exit(1);
    }
    // Sinon, body non-vide mais sans erreur (improbable) → log
    console.log('Réponse DELETE :', delRes.slice(0, 200));
  }
  console.log('DELETE OK (body vide = succès Firestore REST).');

  // ─── 7. Re-fetch plans → doit être vide ───
  console.log('\n--- POST-DELETE VERIF ---');
  const plansAfter = listPlansForUser();
  console.log(`  Plans actifs pour Thomas : ${plansAfter.length}`);
  if (plansAfter.length !== 0) {
    console.error('⛔ Le user a encore des plans après suppression — vérifier manuellement.');
    for (const p of plansAfter) {
      console.error(`     - ${p.name}`);
    }
    process.exit(1);
  }

  // Re-fetch plan direct → doit 404
  const planAfter = fetchPlan();
  if (planAfter.fields) {
    console.error('⛔ Le plan existe toujours après DELETE — anomalie Firestore.');
    process.exit(1);
  }
  console.log(`  Fetch direct plans/${PLAN_ID} : ${planAfter.error?.code || 'NOT_FOUND'} ✓`);

  // ─── 8. Re-fetch user → flags intacts ───
  const userAfter = fetchUser();
  const ua = userAfter.fields;
  const ppd = ua.planPurchaseDate?.stringValue || ua.planPurchaseDate?.timestampValue;
  console.log('\n--- USER POST-DELETE ---');
  console.log(`  email             : ${ua.email?.stringValue}`);
  console.log(`  hasPurchasedPlan  : ${ua.hasPurchasedPlan?.booleanValue} ${ua.hasPurchasedPlan?.booleanValue === true ? '✓' : '⛔'}`);
  console.log(`  planPurchaseDate  : ${ppd} ${ppd ? '✓' : '⛔'}`);
  console.log(`  isPremium         : ${ua.isPremium?.booleanValue} (Plan Unique = false normal)`);

  if (ua.hasPurchasedPlan?.booleanValue !== true) {
    console.error('⛔ CRITIQUE : hasPurchasedPlan a été perdu !');
    process.exit(1);
  }
  if (!ppd) {
    console.error('⛔ CRITIQUE : planPurchaseDate a été perdu !');
    process.exit(1);
  }

  console.log('\n=== DELETE OK — Thomas peut régénérer un nouveau plan full. ===');
})().catch((err) => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
