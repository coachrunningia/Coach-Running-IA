#!/usr/bin/env node
/**
 * regen-5-tokens-relance-31mai.mjs
 *
 * Régénère 5 tokens email_verification pour relance Brevo (31/05/2026) :
 *   - nicolasdts99@gmail.com (10K Finisher 7sem)
 *   - nb69100@hotmail.com (10K Finisher 7sem)
 *   - maxsandy@wanadoo.fr (Trail 80km Finisher 13sem)
 *   - paccaud.bertrand@gmail.com (Trail 16km 2h15 — patché 31/05)
 *   - philkhal@hotmail.com (Trail 10km 55min — patché 31/05)
 *
 * Pourquoi régénérer : tokens originaux expiraient 24h après création (plans
 * 8-29 jours ago → tous EXPIRÉS). Nouveau token avec expiration 7 jours pour
 * laisser le temps à la relance.
 *
 * Anciens tokens : laissés intacts (les nouveaux s'utilisent en priorité au
 * point de vue user/Brevo car ce sont les nouveaux liens envoyés).
 *
 * Output : /Users/romanemarino/Coach-Running-IA/relance-5-users-31mai.csv
 *
 * Usage :
 *   DRY RUN : node regen-5-tokens-relance-31mai.mjs
 *   EXEC    : DRY_RUN=false node regen-5-tokens-relance-31mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const BASE_URL = 'https://coachrunningia.fr/verify-email';
const DRY_RUN = process.env.DRY_RUN !== 'false';

// 5 users à relancer (déduits de l'audit 31/05)
const USERS = [
  {
    email: 'nicolasdts99@gmail.com',
    firstName: 'Nicolas',
    planId: '1778682781778',
    userId: null, // sera récupéré du token existant
    planName: 'Préparation 10 km — Finisher — 7 sem.',
  },
  {
    email: 'nb69100@hotmail.com',
    firstName: 'Nicolas',
    planId: '1778423851514',
    userId: null,
    planName: 'Préparation 10 km — Finisher — 7 sem.',
  },
  {
    email: 'maxsandy@wanadoo.fr',
    firstName: 'maxime',
    planId: '1780049623628',
    userId: null,
    planName: 'Préparation Trail 80km / 5500m D+ — Finisher — 13 sem.',
  },
  {
    email: 'paccaud.bertrand@gmail.com',
    firstName: 'Bertrand',
    planId: '1779263721331',
    userId: null,
    planName: 'Préparation Trail 16km / 1000m D+ en 2h15 — 15 sem.',
  },
  {
    email: 'philkhal@hotmail.com',
    firstName: 'Philippe',
    planId: '1778254954905',
    userId: null,
    planName: 'Préparation Trail 10km / 500m D+ en 55min — 7 sem.',
  },
];

const token = () => execSync('gcloud auth print-access-token').toString().trim();

// Génère un token unique 32 chars (compatible code existant)
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
  return t;
}

// Récupère userId depuis le plan (champ `userId` dans plans/)
function getUserIdFromPlan(planId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`;
  const doc = JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${url}"`).toString());
  return doc.fields?.userId?.stringValue || null;
}

// Crée un token dans Firestore
function createTokenDoc(tokenStr, userId, email, firstName, planId, expiresInDays = 7) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/emailVerificationTokens?documentId=${tokenStr}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const body = {
    fields: {
      userId: { stringValue: userId },
      email: { stringValue: email.toLowerCase() },
      firstName: { stringValue: firstName },
      planId: { stringValue: planId },
      createdAt: { stringValue: new Date().toISOString() },
      expiresAt: { stringValue: expiresAt },
      used: { booleanValue: false },
    },
  };
  const tmpFile = `/tmp/token-create-${tokenStr}.json`;
  writeFileSync(tmpFile, JSON.stringify(body));
  const res = JSON.parse(execSync(`curl -s -X POST -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmpFile} "${url}"`).toString());
  if (res.error) throw new Error(`Create token failed: ${JSON.stringify(res.error)}`);
  return res;
}

// ────────────────────────────────────────
// EXEC
// ────────────────────────────────────────

console.log(`>>> Regen 5 tokens relance — DRY_RUN=${DRY_RUN}\n`);

const results = [];

for (const u of USERS) {
  console.log(`--- ${u.email} ---`);
  // 1. Récupère userId du plan (pour cohérence)
  const userId = getUserIdFromPlan(u.planId);
  if (!userId) {
    console.error(`  ❌ Plan ${u.planId} introuvable ou pas de userId`);
    continue;
  }
  u.userId = userId;
  console.log(`  ✓ userId : ${userId}`);

  // 2. Génère nouveau token
  const newToken = generateToken();
  console.log(`  ✓ Nouveau token : ${newToken.substring(0, 12)}... (expire dans 7j)`);

  // 3. Créer le doc Firestore (DRY RUN = skip)
  if (DRY_RUN) {
    console.log(`  >>> DRY RUN — pas d'écriture Firestore`);
  } else {
    try {
      createTokenDoc(newToken, userId, u.email, u.firstName, u.planId, 7);
      console.log(`  ✅ Token créé en Firestore`);
    } catch (e) {
      console.error(`  ❌ Erreur création : ${e.message}`);
      continue;
    }
  }

  results.push({
    email: u.email,
    firstName: u.firstName,
    planName: u.planName,
    token: newToken,
    url: `${BASE_URL}?token=${newToken}`,
  });
  console.log();
}

// 4. Génère le CSV
const csvLines = ['EMAIL,PRENOM,PLAN_TITRE,VERIFICATION_URL'];
for (const r of results) {
  // CSV escape : quote si virgule dans le nom du plan
  const planEsc = r.planName.includes(',') ? `"${r.planName}"` : r.planName;
  csvLines.push(`${r.email},${r.firstName},${planEsc},${r.url}`);
}

const csvPath = '/Users/romanemarino/Coach-Running-IA/relance-5-users-31mai.csv';
writeFileSync(csvPath, csvLines.join('\n') + '\n');

console.log(`\n=== CSV généré ===`);
console.log(csvLines.join('\n'));
console.log(`\n✅ Fichier : ${csvPath}`);
console.log(`✅ ${results.length}/5 tokens ${DRY_RUN ? 'SIMULÉS' : 'CRÉÉS LIVE'}`);
if (DRY_RUN) console.log(`\nPour exec : DRY_RUN=false node regen-5-tokens-relance-31mai.mjs`);
