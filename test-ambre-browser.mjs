// Simule la session navigateur d'Ambre via Puppeteer
// Auth via Custom Token (impersonation SA) + clique "Générer" + capture toute erreur
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const AMBRE_UID = 'qJzkzjA5E5cVm0uRxAtK57zWlKy2';
const SA_EMAIL = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const APP_URL = 'https://coach-running-ia.web.app';

// === 1. Générer Custom Token via impersonation ===
console.log('[1/6] Génération Custom Token Ambre via SA impersonation...');
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA_EMAIL}`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();

const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: SA_EMAIL, sub: SA_EMAIL,
  aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
  iat: now, exp: now + 3600, uid: AMBRE_UID,
};
const signResp = await fetch(
  `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA_EMAIL}:signJwt`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': 'coach-running-ia' },
    body: JSON.stringify({ payload: JSON.stringify(claims) }),
  }
);
const customToken = (await signResp.json()).signedJwt;
console.log('  ✅ Custom Token signé');

// === 2. Lire Firebase API key ===
const apiKey = readFileSync('/Users/romanemarino/Coach-Running-IA/.env', 'utf-8')
  .match(/VITE_FIREBASE_API_KEY\s*=\s*['"]?([^'"\s]+)/)?.[1];

// === 3. Lancer Puppeteer ===
console.log('[2/6] Lancement Puppeteer headless...');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

// Capter TOUS les events console + erreurs
const errors = [];
const consoleMessages = [];
page.on('pageerror', (err) => {
  errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  console.log('🚨 PAGEERROR:', err.message);
});
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error' || t === 'warning') {
    consoleMessages.push({ type: t, text: msg.text() });
    if (t === 'error') console.log('🚨 CONSOLE ERROR:', msg.text());
  }
});
page.on('requestfailed', (req) => {
  errors.push({ type: 'requestfailed', url: req.url(), failure: req.failure()?.errorText });
  console.log('🚨 REQUEST FAILED:', req.url(), req.failure()?.errorText);
});
page.on('response', async (resp) => {
  if (resp.status() >= 400) {
    const txt = (await resp.text().catch(() => '')).substring(0, 500);
    errors.push({ type: 'http_' + resp.status(), url: resp.url(), body: txt });
    console.log('🚨 HTTP', resp.status(), resp.url().substring(0, 100));
  }
});

// === 4. Naviguer + s'auth comme Ambre ===
console.log('[3/6] Navigation vers app + auth comme Ambre...');
await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 60000 });
console.log('  ✅ App chargée');

const authResult = await page.evaluate(async ({ apiKey, customToken }) => {
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const { getAuth, signInWithCustomToken } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    let app;
    if (getApps().length === 0) {
      app = initializeApp({ apiKey, authDomain: 'coach-running-ia.firebaseapp.com', projectId: 'coach-running-ia' });
    } else {
      app = getApps()[0];
    }
    const auth = getAuth(app);
    const cred = await signInWithCustomToken(auth, customToken);
    return { ok: true, uid: cred.user.uid, email: cred.user.email };
  } catch (e) {
    return { ok: false, error: e.message, stack: e.stack };
  }
}, { apiKey, customToken });
console.log('  Auth result:', JSON.stringify(authResult));

if (!authResult.ok) {
  console.log('❌ Auth échec, abandon');
  await browser.close();
  process.exit(1);
}

// === 5. Reload page pour que l'auth state se propage ===
console.log('[4/6] Reload après auth...');
await page.reload({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));

// === 6. Naviguer vers questionnaire + déclencher génération ===
console.log('[5/6] Navigation vers questionnaire...');
const urls = ['/questionnaire', '/dashboard', '/profile', '/'];
let navigated = false;
for (const u of urls) {
  try {
    await page.goto(APP_URL + u, { waitUntil: 'networkidle2', timeout: 30000 });
    const title = await page.title();
    console.log('  ' + u + ' →', title.substring(0, 60));
    navigated = true;
    break;
  } catch (e) {}
}

await new Promise(r => setTimeout(r, 2000));

// Chercher le bouton "Générer" (multiples noms possibles)
console.log('[6/6] Recherche bouton Générer...');
const buttonTexts = ['Générer', 'Generer', 'Generate', 'Crée mon plan', 'Mon plan'];
let clicked = false;
for (const btnText of buttonTexts) {
  const clicked_attempt = await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const target = btns.find(b => b.textContent?.includes(text));
    if (target) { target.click(); return true; }
    return false;
  }, btnText);
  if (clicked_attempt) {
    console.log('  ✅ Cliqué bouton contenant: "' + btnText + '"');
    clicked = true;
    break;
  }
}
if (!clicked) console.log('  ⚠️ Aucun bouton Générer trouvé sur cette page');

// Attendre 30s pour laisser le flow se dérouler + capter erreurs
console.log('  Attente 30s pour capture erreurs...');
await new Promise(r => setTimeout(r, 30000));

// Screenshot pour analyse
await page.screenshot({ path: '/Users/romanemarino/Coach-Running-IA/ambre-test-final.png', fullPage: true });
console.log('  📸 Screenshot final: ambre-test-final.png');

// Récup current URL + body text snippet
const currentUrl = page.url();
const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800));
console.log('\n=== RÉSULTAT FINAL ===');
console.log('URL finale:', currentUrl);
console.log('Body text:\n', bodyText);
console.log('\nErreurs capturées (' + errors.length + '):');
for (const e of errors) console.log('  - ' + JSON.stringify(e).substring(0, 250));
console.log('\nConsole errors (' + consoleMessages.length + '):');
for (const m of consoleMessages.slice(0, 10)) console.log('  - ' + m.text.substring(0, 200));

await browser.close();
console.log('\n✅ Test terminé');
