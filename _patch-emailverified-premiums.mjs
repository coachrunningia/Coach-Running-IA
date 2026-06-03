#!/usr/bin/env node
/**
 * _patch-emailverified-premiums.mjs
 *
 * Patch one-shot F-23 (03/06/2026) : align les Premium existants avec
 * la nouvelle doctrine "isPremium=true ⟹ emailVerified=true".
 *
 * Identifié 03/06 : 19 Premium ont payé via Stripe mais Firestore
 * users.emailVerified=false (ou absent). Cause : webhook Stripe pre-F-23
 * mettait isPremium=true mais ne touchait pas emailVerified.
 *
 * Conséquence : ils sont POTENTIELLEMENT pas dans LIST_SUBSCRIBERS Brevo
 * si segmentation se base sur emailVerified. Le script :
 *   1. Liste tous les users avec isPremium=true ET emailVerified !== true
 *   2. (Idem) hasPurchasedPlan=true ET emailVerified !== true (Plan Unique)
 *   3. Update Firestore emailVerified=true + emailVerifiedAt + Source flag
 *   4. (Idempotent) re-trigger brevoUpsertContact pour s'assurer LIST_SUBSCRIBERS
 *
 * Doctrine Romane :
 *   - PRIORITÉ ULTIME paiement (script read-only sur paiement, write seulement sur flag)
 *   - "Premium = validés d'office"
 *   - JAMAIS contacter user direct → script update Firestore + Brevo uniquement
 *
 * Usage :
 *   DRY RUN : node _patch-emailverified-premiums.mjs
 *   EXEC    : DRY_RUN=false node _patch-emailverified-premiums.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/backups-f23-emailverified-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

// Lire BREVO_API_KEY pour re-trigger Brevo
const envContent = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const BREVO_KEY = env.BREVO_API_KEY;
const BREVO_LIST_SUBSCRIBERS = parseInt(env.BREVO_LIST_SUBSCRIBERS) || 5;
const BREVO_LIST_NON_SUBSCRIBERS = parseInt(env.BREVO_LIST_NON_SUBSCRIBERS) || 6;
const BREVO_LIST_PLAN_UNIQUE = parseInt(env.BREVO_LIST_PLAN_UNIQUE) || 9;

const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`).toString().trim();
const FH = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT,
};

function fromFV(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, vv]) => [k, fromFV(vv)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFV);
  if ('nullValue' in v) return null;
  return v;
}

function toFV(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  throw new Error('toFV: type non supporté');
}

console.log(`\n═══════════════════════════════════════════════════════════════════════`);
console.log(`  PATCH F-23 ONE-SHOT — align Premium existants emailVerified=true`);
console.log(`  DRY_RUN=${DRY_RUN} (passe DRY_RUN=false pour exec)`);
console.log(`  Backup: ${BACKUP_DIR}`);
console.log(`═══════════════════════════════════════════════════════════════════════\n`);

// 1) Récupérer tous les users
console.log(`📂 Lecture users Firestore…`);
const users = [];
let pageToken = null;
do {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
  const res = await fetch(url, { headers: FH });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  for (const doc of (data.documents || [])) {
    const uid = doc.name.split('/').pop();
    const f = doc.fields || {};
    users.push({
      uid,
      docName: doc.name,
      email: fromFV(f.email),
      firstName: fromFV(f.firstName) || 'Coureur',
      emailVerified: fromFV(f.emailVerified) === true,
      isPremium: fromFV(f.isPremium) === true,
      hasPurchasedPlan: fromFV(f.hasPurchasedPlan) === true,
      premiumSince: fromFV(f.premiumSince),
      planPurchaseDate: fromFV(f.planPurchaseDate),
    });
  }
  pageToken = data.nextPageToken;
} while (pageToken);
console.log(`   ✓ ${users.length} users récupérés\n`);

// 2) Identifier les cibles : (Premium OU PlanUnique) ET emailVerified !== true
const cibles = users.filter(u =>
  (u.isPremium || u.hasPurchasedPlan) && !u.emailVerified && u.email
);
console.log(`🎯 Cibles à patcher (Premium/PlanUnique sans emailVerified) : ${cibles.length}\n`);

if (cibles.length === 0) {
  console.log(`✅ Rien à patcher. Tous les Premium ont déjà emailVerified=true.`);
  process.exit(0);
}

// 3) Backup avant patch
const backupFile = `${BACKUP_DIR}/cibles-before.json`;
writeFileSync(backupFile, JSON.stringify(cibles, null, 2));
console.log(`✓ Backup: ${backupFile}\n`);

// 4) Patch Firestore + re-trigger Brevo
let patched = 0;
let brevoOk = 0;
let brevoFail = 0;
let firestoreFail = 0;
const now = new Date().toISOString();

for (const u of cibles) {
  const sourceFlag = u.isPremium ? 'patch_f23_premium_backfill' : 'patch_f23_plan_unique_backfill';
  const emailVerifiedAt = u.premiumSince || u.planPurchaseDate || now;

  console.log(`━━ ${u.email} (uid=${u.uid}) ━━`);
  console.log(`   Type: ${u.isPremium ? 'Premium' : 'Plan Unique'} | emailVerifiedAt=${emailVerifiedAt}`);

  if (DRY_RUN) {
    console.log(`   >>> DRY RUN — would patch Firestore + Brevo`);
    patched++;
    continue;
  }

  // 4a) Patch Firestore users.emailVerified=true (fetch() cohérent avec 4b)
  try {
    const updateUrl = `https://firestore.googleapis.com/v1/${u.docName}?updateMask.fieldPaths=emailVerified&updateMask.fieldPaths=emailVerifiedAt&updateMask.fieldPaths=emailVerifiedSource`;
    const body = {
      fields: {
        emailVerified: toFV(true),
        emailVerifiedAt: toFV(emailVerifiedAt),
        emailVerifiedSource: toFV(sourceFlag),
      },
    };
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: FH,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || `HTTP ${res.status}`));
    console.log(`   ✓ Firestore emailVerified=true`);
    patched++;
  } catch (e) {
    console.error(`   ❌ Firestore failed: ${e.message}`);
    firestoreFail++;
    continue;
  }

  // 4b) Re-trigger brevoUpsertContact pour s'assurer LIST_SUBSCRIBERS / LIST_PLAN_UNIQUE
  // F-23 fix B-2 (03/06/2026) : retirer LIST_NON_SUBSCRIBERS pour Premium ET Plan Unique
  // (sinon dual-list inscription #6 + cible)
  try {
    const listIds = u.isPremium ? [BREVO_LIST_SUBSCRIBERS] : [BREVO_LIST_PLAN_UNIQUE];
    const removeFromList = BREVO_LIST_NON_SUBSCRIBERS;  // toujours retirer du #6
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: u.email.toLowerCase(),
        attributes: { PRENOM: u.firstName, IS_PREMIUM: u.isPremium },
        listIds,
        updateEnabled: true,
      }),
    });
    if (!brevoRes.ok) {
      const txt = await brevoRes.text();
      throw new Error(`HTTP ${brevoRes.status}: ${txt.substring(0, 200)}`);
    }
    if (removeFromList) {
      // Retirer de LIST_NON_SUBSCRIBERS s'il y était
      await fetch(`https://api.brevo.com/v3/contacts/lists/${removeFromList}/contacts/remove`, {
        method: 'POST',
        headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [u.email.toLowerCase()] }),
      });
    }
    console.log(`   ✓ Brevo upserted (LIST ${listIds[0]})`);
    brevoOk++;
  } catch (e) {
    console.error(`   ⚠️  Brevo failed (non-blocking): ${e.message}`);
    brevoFail++;
  }
}

console.log(`\n═══════════════════════════════════════════════════════════════════════`);
console.log(`  RÉCAP`);
console.log(`───────────────────────────────────────────────────────────────────────`);
console.log(`  Cibles               : ${cibles.length}`);
console.log(`  ✅ Firestore patché  : ${patched}`);
console.log(`  ❌ Firestore failed  : ${firestoreFail}`);
console.log(`  ✅ Brevo upserted    : ${brevoOk}`);
console.log(`  ⚠️  Brevo failed     : ${brevoFail}`);
console.log(`  Backup               : ${BACKUP_DIR}`);
console.log(`═══════════════════════════════════════════════════════════════════════\n`);

if (DRY_RUN) {
  console.log(`Pour exécuter : DRY_RUN=false node _patch-emailverified-premiums.mjs\n`);
}
