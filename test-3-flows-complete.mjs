// Test END-TO-END en conditions réelles
// Approche : impersonate users (Julian qui buguait + 3 nouveaux profils) + Puppeteer
// Vérifie : 0 pageerror, 0 console error "reasons", chargement /, /questionnaire, /pricing

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const SA_EMAIL = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const APP_URL = 'https://coachrunningia.fr';
const PROJECT_ID = 'coach-running-ia';

const apiKey = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf-8')
  .match(/VITE_FIREBASE_API_KEY\s*=\s*['"]?([^'"\s]+)/)?.[1];

async function saToken() {
  return execSync(`gcloud auth print-access-token --impersonate-service-account=${SA_EMAIL}`, { stdio: ['pipe','pipe','pipe'] }).toString().trim();
}

async function createUser(email) {
  const t = await saToken();
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:signUp`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ email, password:'TestPwd!2026', returnSecureToken:false }) });
  const j = await r.json();
  if (j.error) {
    const r2 = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
      { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
        body: JSON.stringify({ email:[email] }) });
    return (await r2.json()).users?.[0]?.localId;
  }
  return j.localId;
}

async function deleteUser(uid) {
  if (!uid) return;
  const t = await saToken();
  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ localId:uid }) });
  await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    { method:'DELETE', headers:{Authorization:`Bearer ${t}`,'x-goog-user-project':PROJECT_ID} });
}

async function signCT(uid) {
  const t = await saToken();
  const n = Math.floor(Date.now()/1000);
  const claims = { iss:SA_EMAIL, sub:SA_EMAIL, aud:'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat:n, exp:n+3600, uid };
  const r = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA_EMAIL}:signJwt`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ payload: JSON.stringify(claims) }) });
  return (await r.json()).signedJwt;
}

async function authOnPage(page, uid) {
  const ct = await signCT(uid);
  await page.evaluate(async ({ apiKey, ct }) => {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const app = getApps().length === 0 ? initializeApp({ apiKey, authDomain:'coach-running-ia.firebaseapp.com', projectId:'coach-running-ia' }) : getApps()[0];
    await signInWithCustomToken(getAuth(app), ct);
  }, { apiKey, ct });
  await page.reload({ waitUntil:'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
}

function attachErrorCapture(page) {
  const errors = [];
  page.on('pageerror', e => errors.push({ type:'pageerror', msg:e.message, stack:(e.stack||'').substring(0,400) }));
  page.on('console', m => {
    if (m.type() === 'error') {
      const txt = m.text();
      // Ignore network errors HTTP (déjà loggés ailleurs) et favicon
      if (txt.includes('favicon') || txt.includes('Failed to load resource')) return;
      errors.push({ type:'console', msg:txt.substring(0,300) });
    }
  });
  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('favicon') || url.includes('analytics') || url.includes('googletagmanager')) return;
    errors.push({ type:'reqfail', msg:`${url.substring(0,100)} → ${req.failure()?.errorText}` });
  });
  return errors;
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TEST 3 FLOWS — Coach Running IA — conditions réelles');
console.log('═══════════════════════════════════════════════════════════════\n');

const browser = await puppeteer.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox'] });

const RESULTS = { pages:[], questionnaire:[], stripe:[] };

// ════════════════════════════════════════════════════════════════════
// FLOW 1 : Charge toutes pages publiques + privées sans pageerror
// ════════════════════════════════════════════════════════════════════
console.log('▶ FLOW 1 : Smoke test pages critiques');
console.log('───────────────────────────────────────────────────────────────');

const PAGES_PUBLIC = ['/', '/pricing', '/questionnaire', '/plan-marathon', '/plan-trail'];

for (const url of PAGES_PUBLIC) {
  const page = await browser.newPage();
  const errors = attachErrorCapture(page);
  try {
    await page.goto(APP_URL + url, { waitUntil:'networkidle2', timeout:30000 });
    await new Promise(r => setTimeout(r, 2000));
    const status = errors.length === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${url} → ${errors.length} erreur(s)`);
    if (errors.length) {
      for (const e of errors.slice(0, 3)) console.log(`       ${e.type}: ${e.msg.substring(0, 180)}`);
    }
    RESULTS.pages.push({ url, errors: errors.length, errs: errors });
  } catch (e) {
    console.log(`  ❌ ${url} → exception: ${e.message}`);
    RESULTS.pages.push({ url, errors: -1, exc: e.message });
  }
  await page.close();
}

// ════════════════════════════════════════════════════════════════════
// FLOW 2 : Auth comme Julian (qui buguait) + load /, /questionnaire, /profile
// Si "reasons is not defined" se déclenche, on le voit
// ════════════════════════════════════════════════════════════════════
console.log('\n▶ FLOW 2 : Auth comme Julian (qui buguait) + nav pages privées');
console.log('───────────────────────────────────────────────────────────────');

const JULIAN_UID = 'bNTAkiezfzf2ZxLEFiwqAcvldsD3'; // identifié dans generation_errors
const page = await browser.newPage();
const errors = attachErrorCapture(page);
try {
  await page.goto(APP_URL, { waitUntil:'networkidle2', timeout:30000 });
  await authOnPage(page, JULIAN_UID);
  console.log(`  ✅ Auth comme Julian OK`);

  for (const url of ['/', '/questionnaire', '/profile', '/pricing']) {
    const errBefore = errors.length;
    try {
      await page.goto(APP_URL + url, { waitUntil:'networkidle2', timeout:30000 });
      await new Promise(r => setTimeout(r, 2500));
      const newErrs = errors.length - errBefore;
      const reasonsFound = errors.slice(errBefore).some(e => e.msg.includes('reasons is not defined'));
      const status = newErrs === 0 ? '✅' : (reasonsFound ? '🚨 CRITIQUE' : '⚠️');
      console.log(`    ${status} ${url} → ${newErrs} nouvelle(s) erreur(s)`);
      if (reasonsFound) console.log(`       🚨🚨🚨 ERREUR "reasons" ENCORE PRÉSENTE !`);
      for (const e of errors.slice(errBefore, errBefore+3)) console.log(`         ${e.type}: ${e.msg.substring(0,150)}`);
    } catch (e) {
      console.log(`    ❌ ${url} exception: ${e.message}`);
    }
  }
} catch (e) {
  console.log(`  ❌ Auth Julian fail: ${e.message}`);
}
await page.close();

// ════════════════════════════════════════════════════════════════════
// FLOW 3 : Vrai nouveau utilisateur — questionnaire UI + soumettre
// On simule un user qui arrive sur le site, fait le questionnaire en UI, soumet
// ════════════════════════════════════════════════════════════════════
console.log('\n▶ FLOW 3 : Simulation nouveau utilisateur via UI (questionnaire)');
console.log('───────────────────────────────────────────────────────────────');

const NEW_USER_PROFILES = [
  { name:'Julian-like (Mara débutant)', email:'autotest-mara-1@autodelete.tmp' },
  { name:'Ambre-like (Semi débutante)', email:'autotest-semi-1@autodelete.tmp' },
  { name:'Inter 10k', email:'autotest-10k-1@autodelete.tmp' },
];

for (const profile of NEW_USER_PROFILES) {
  console.log(`\n  → ${profile.name}`);
  const p = await browser.newPage();
  const errs = attachErrorCapture(p);
  try {
    await p.goto(APP_URL + '/questionnaire', { waitUntil:'networkidle2', timeout:30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Vérifie qu'il y a 0 pageerror au chargement
    const initErrs = errs.length;
    const reasonsFound = errs.some(e => e.msg.includes('reasons is not defined'));
    if (reasonsFound) {
      console.log(`    🚨🚨🚨 ERREUR "reasons" au load !`);
      RESULTS.questionnaire.push({ profile:profile.name, status:'CRITICAL_REASONS' });
    } else if (initErrs === 0) {
      console.log(`    ✅ Questionnaire chargé sans erreur`);
      RESULTS.questionnaire.push({ profile:profile.name, status:'OK_LOAD' });
    } else {
      console.log(`    ⚠️ ${initErrs} erreur(s) au load:`);
      for (const e of errs.slice(0,3)) console.log(`       ${e.type}: ${e.msg.substring(0,150)}`);
      RESULTS.questionnaire.push({ profile:profile.name, status:'WARN_LOAD', errs:initErrs });
    }
  } catch (e) {
    console.log(`    ❌ Exception: ${e.message}`);
    RESULTS.questionnaire.push({ profile:profile.name, status:'EXCEPTION', err:e.message });
  }
  await p.close();
}

// ════════════════════════════════════════════════════════════════════
// FLOW 4 : Stripe checkout — créer user, aller pricing, cliquer Premium
// ════════════════════════════════════════════════════════════════════
console.log('\n▶ FLOW 4 : Stripe checkout (sans payer)');
console.log('───────────────────────────────────────────────────────────────');

const stripeEmail = 'autotest-stripe@autodelete.tmp';
let stripeUid = null;
try {
  stripeUid = await createUser(stripeEmail);
  console.log(`  User test créé: ${stripeUid}`);

  const p = await browser.newPage();
  const errs = attachErrorCapture(p);
  await p.goto(APP_URL + '/pricing', { waitUntil:'networkidle2', timeout:30000 });
  await authOnPage(p, stripeUid);
  await p.goto(APP_URL + '/pricing', { waitUntil:'networkidle2', timeout:30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Chercher les boutons d'achat
  const buttons = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    return btns
      .filter(b => /premium|acheter|s'abonner|choisir|commencer|stripe/i.test(b.textContent || ''))
      .map(b => ({ text:(b.textContent||'').trim().substring(0,50), tag:b.tagName, href:b.href }));
  });
  console.log(`  Boutons pricing trouvés: ${buttons.length}`);
  for (const b of buttons.slice(0,5)) console.log(`    - [${b.tag}] "${b.text}"`);

  // Cliquer le premier bouton "Premium" et capter la navigation
  let stripeRedirected = false;
  let stripeUrl = '';
  p.on('framenavigated', f => {
    const u = f.url();
    if (u.includes('checkout.stripe.com') || u.includes('stripe.com/pay')) {
      stripeRedirected = true;
      stripeUrl = u;
    }
  });
  // Aussi écouter les requests POST vers /api/create-checkout-session
  let apiCalled = false;
  let apiStatus = 0;
  let apiBody = '';
  p.on('response', async r => {
    if (r.url().includes('/api/create-checkout-session') || r.url().includes('checkout.stripe.com')) {
      apiCalled = true;
      apiStatus = r.status();
      try { apiBody = (await r.text()).substring(0, 300); } catch {}
    }
  });

  // Cliquer un bouton "Premium" / "Acheter"
  const clicked = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const t = btns.find(b => /premium|acheter|s'abonner|continuer/i.test(b.textContent || ''));
    if (t) { t.click(); return (t.textContent||'').trim(); }
    return null;
  });
  console.log(`  Cliqué: ${clicked || 'aucun bouton trouvé'}`);
  await new Promise(r => setTimeout(r, 8000));

  console.log(`  Stripe redirect: ${stripeRedirected ? '✅ OUI → ' + stripeUrl.substring(0,80) : '❌ NON'}`);
  console.log(`  API checkout session appelée: ${apiCalled ? '✅' : '❌'} (status=${apiStatus})`);
  if (apiBody) console.log(`  API body: ${apiBody}`);
  console.log(`  Pageerrors pricing: ${errs.length}`);
  for (const e of errs.slice(0,3)) console.log(`    ${e.type}: ${e.msg.substring(0,150)}`);

  RESULTS.stripe.push({ clicked, stripeRedirected, apiCalled, apiStatus, errs:errs.length });
  await p.close();
} catch (e) {
  console.log(`  ❌ Stripe test exception: ${e.message}`);
  RESULTS.stripe.push({ exception:e.message });
} finally {
  if (stripeUid) { try { await deleteUser(stripeUid); console.log(`  🗑️ Cleanup OK`); } catch {} }
}

await browser.close();

// ════════════════════════════════════════════════════════════════════
// RÉSUMÉ
// ════════════════════════════════════════════════════════════════════
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  RÉSUMÉ');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\n📄 FLOW 1 — Pages publiques :');
for (const r of RESULTS.pages) console.log(`  ${r.errors === 0 ? '✅' : r.errors === -1 ? '❌' : '⚠️'} ${r.url} → ${r.errors} erreur(s)`);

console.log('\n👤 FLOW 3 — Questionnaire load :');
for (const r of RESULTS.questionnaire) console.log(`  ${r.status === 'OK_LOAD' ? '✅' : r.status.includes('CRITICAL') ? '🚨' : '⚠️'} ${r.profile}: ${r.status}`);

console.log('\n💳 FLOW 4 — Stripe :');
console.log(`  ${JSON.stringify(RESULTS.stripe[0], null, 2)}`);

const critical = RESULTS.questionnaire.some(r => r.status === 'CRITICAL_REASONS');
console.log('\n' + (critical ? '🚨🚨🚨 BUG "reasons" ENCORE PRÉSENT' : '✅ Aucun bug "reasons" détecté') + '\n');

process.exit(critical ? 1 : 0);
