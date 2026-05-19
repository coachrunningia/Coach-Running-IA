// TEST E2E BOUT-EN-BOUT : nouvel utilisateur
// Le Questionnaire est embedded dans la LandingPage (section #questionnaire)
// On scroll, on clique étape par étape, on capture tout

import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

const SA_EMAIL = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT_ID = 'coach-running-ia';
const APP_URL = 'https://coachrunningia.fr';
const SCREENSHOT_DIR = '/Users/romanemarino/Coach-Running-IA/e2e-screenshots';

try { mkdirSync(SCREENSHOT_DIR); } catch {}

const TIMESTAMP = Date.now();
const TEST_EMAIL = `e2etest-${TIMESTAMP}@autodelete.tmp`;
const TEST_FIRSTNAME = 'TestE2E';
const TEST_PASSWORD = 'TestE2E!2026Strong';

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  TEST E2E BOUT-EN-BOUT — Nouveau utilisateur');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Email: ${TEST_EMAIL}`);
console.log(`  Profil: Marathon débutant ambitieux (Julian-like — DÉCLENCHE le bug reasons)`);
console.log('═══════════════════════════════════════════════════════════════\n');

async function saToken() {
  return execSync(`gcloud auth print-access-token --impersonate-service-account=${SA_EMAIL}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
}

async function findUserByEmail(email) {
  const t = await saToken();
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ email:[email] }) });
  return (await r.json()).users?.[0]?.localId;
}

async function deleteUserById(uid) {
  if (!uid) return;
  const t = await saToken();
  await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:delete`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ localId:uid }) });
  await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    { method:'DELETE', headers:{Authorization:`Bearer ${t}`,'x-goog-user-project':PROJECT_ID} }).catch(()=>{});
  const plansResp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  const plans = (await plansResp.json()).filter(r => r.document);
  for (const p of plans) {
    await fetch(`https://firestore.googleapis.com/v1/${p.document.name}`,
      { method:'DELETE', headers:{Authorization:`Bearer ${t}`,'x-goog-user-project':PROJECT_ID} });
  }
}

async function getPlansByUserId(uid) {
  const t = await saToken();
  const resp = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    { method:'POST', headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json','x-goog-user-project':PROJECT_ID},
      body: JSON.stringify({ structuredQuery: { from:[{collectionId:'plans'}], where:{ fieldFilter:{ field:{fieldPath:'userId'}, op:'EQUAL', value:{stringValue:uid} } } } }) });
  return (await resp.json()).filter(r => r.document).map(r => r.document);
}

// ════════════════════════════════════════════════════════════════════
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1024 });

const ALL_ERRORS = [];
page.on('pageerror', e => {
  const msg = e.message;
  if (msg.includes('__fbevents') || msg.includes('fbq')) return;
  ALL_ERRORS.push({ type:'pageerror', msg, stack:(e.stack||'').substring(0,400) });
  console.log(`  🚨 PAGEERROR: ${msg.substring(0,200)}`);
});
page.on('console', m => {
  if (m.type() === 'error') {
    const t = m.text();
    if (t.includes('favicon') || t.includes('fbq') || t.includes('__fbevents') || t.includes('Failed to load resource')) return;
    ALL_ERRORS.push({ type:'console', msg:t.substring(0,300) });
    console.log(`  ⚠️ Console error: ${t.substring(0,150)}`);
  }
});

let stepNum = 0;
async function snap(label) {
  stepNum++;
  const path = `${SCREENSHOT_DIR}/e2e-${String(stepNum).padStart(2,'0')}-${label}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${path.split('/').pop()}`);
}

async function clickInQuestionnaire(text, exact = false) {
  return await page.evaluate(({text, exact}) => {
    const section = document.querySelector('#questionnaire') || document.body;
    const buttons = Array.from(section.querySelectorAll('button'));
    let t;
    if (exact) {
      // Match EXACT du texte (trim)
      t = buttons.find(b => (b.textContent || '').trim() === text);
    } else {
      // Match qui CONTIENT mais privilégie le plus court (évite "Semi-Marathon" pour "Marathon")
      const matches = buttons.filter(b => (b.textContent || '').toLowerCase().includes(text.toLowerCase()));
      matches.sort((a,b) => a.textContent.length - b.textContent.length);
      t = matches[0];
    }
    if (t) { t.scrollIntoView({block:'center'}); t.click(); return (t.textContent||'').trim().substring(0,80); }
    return null;
  }, {text, exact});
}

async function listQuestionnaireButtons() {
  return await page.evaluate(() => {
    const section = document.querySelector('#questionnaire') || document.body;
    const visibles = Array.from(section.querySelectorAll('button')).filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return visibles.map(b => ((b.textContent||'').trim().substring(0,40))).slice(0,20);
  });
}

// ════════════════════════════════════════════════════════════════════
// [1] Landing + scroll vers #questionnaire
// ════════════════════════════════════════════════════════════════════
console.log('\n[1] Charger landing + scroll vers questionnaire');
await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));

await page.evaluate(() => {
  document.querySelector('#questionnaire')?.scrollIntoView({ behavior: 'instant' });
});
await new Promise(r => setTimeout(r, 1500));
await snap('landing-scrolled-to-questionnaire');

const initButtons = await listQuestionnaireButtons();
console.log(`  Boutons visibles dans questionnaire: ${initButtons.length}`);
console.log(`    Exemples: ${initButtons.slice(0,6).map(b => `"${b}"`).join(', ')}`);

// ════════════════════════════════════════════════════════════════════
// [2] STEP 1 : Choisir "Course sur route"
// ════════════════════════════════════════════════════════════════════
console.log('\n[2] Step 1 — Choisir "Course sur route"');
let clicked = await clickInQuestionnaire('Course sur route');
console.log(`  Clic: "${clicked}"`);
await new Promise(r => setTimeout(r, 2000));
await snap('step1-done');

// ════════════════════════════════════════════════════════════════════
// [3] STEP 2 : Date, distance, temps, niveau
// ════════════════════════════════════════════════════════════════════
console.log('\n[3] Step 2 — Date / Distance / Temps / Niveau');

const raceDate = new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const dateSet = await page.evaluate((date) => {
  const inp = document.querySelector('#questionnaire input[type="date"]');
  if (!inp) return 'no date input';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, date);
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  return inp.value;
}, raceDate);
console.log(`  Date course: ${dateSet}`);

// Marathon exact (sinon match Semi-Marathon)
clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('#questionnaire button'));
  // Chercher bouton qui contient "Marathon" mais PAS "Semi"
  const t = btns.find(b => {
    const txt = (b.textContent || '').toLowerCase();
    return txt.includes('marathon') && !txt.includes('semi');
  });
  if (t) { t.scrollIntoView({block:'center'}); t.click(); return (t.textContent||'').trim().substring(0,60); }
  return null;
});
console.log(`  Distance: "${clicked}"`);

// Temps cible : 1er select = heures (4), 2e select = minutes (0 ou 00)
const timeSet = await page.evaluate(() => {
  const selects = Array.from(document.querySelectorAll('#questionnaire select'));
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  const result = { count: selects.length, ops: [] };
  // 1er select heures
  if (selects[0]) {
    setter.call(selects[0], '4');
    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    result.ops.push({ idx:0, val:'4', success: selects[0].value === '4' });
  }
  // 2e select minutes — essayer '0' puis '00'
  if (selects[1]) {
    const opts = Array.from(selects[1].options).map(o => o.value);
    const val = opts.includes('0') ? '0' : (opts.includes('00') ? '00' : opts[0]);
    setter.call(selects[1], val);
    selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    result.ops.push({ idx:1, val, success: selects[1].value === val, opts:opts.slice(0,5) });
  }
  return result;
});
console.log(`  Temps cible: ${JSON.stringify(timeSet)}`);

// Niveau Débutant (chercher le bouton dont le texte CONTIENT 'Débutant' ou 'Debutant')
clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('#questionnaire button'));
  const t = btns.find(b => {
    const txt = (b.textContent || '').toLowerCase();
    return (txt.includes('débutant') || txt.includes('debutant')) && (txt.includes('0-1') || txt.includes('1 an'));
  }) || btns.find(b => (b.textContent || '').toLowerCase().includes('débutant'));
  if (t) { t.scrollIntoView({block:'center'}); t.click(); return (t.textContent||'').trim().substring(0,80); }
  return null;
});
console.log(`  Niveau: "${clicked}"`);

await new Promise(r => setTimeout(r, 1000));
await snap('step2-filled');

clicked = await clickInQuestionnaire('Continuer');
console.log(`  Continuer: "${clicked}"`);
await new Promise(r => setTimeout(r, 2000));
await snap('after-step2');

// ════════════════════════════════════════════════════════════════════
// [4] STEP 3 : Chronos & Santé
// ════════════════════════════════════════════════════════════════════
console.log('\n[4] Step 3 — Chronos & Santé');
const step3Buttons = await listQuestionnaireButtons();
console.log(`  Boutons: ${step3Buttons.slice(0,10).map(b => `"${b}"`).join(', ')}`);

// Cliquer tous les "Non"
const nonsClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('#questionnaire button'));
  const nons = btns.filter(b => (b.textContent||'').trim() === 'Non');
  for (const n of nons) n.click();
  return nons.length;
});
console.log(`  Cliqué ${nonsClicked} boutons "Non"`);

await new Promise(r => setTimeout(r, 1500));
await snap('step3-filled');

clicked = await clickInQuestionnaire('Continuer');
console.log(`  Continuer: "${clicked}"`);
await new Promise(r => setTimeout(r, 2000));
await snap('after-step3');

// ════════════════════════════════════════════════════════════════════
// [5] STEP 4 : Disponibilités
// ════════════════════════════════════════════════════════════════════
console.log('\n[5] Step 4 — Disponibilités');
const step4Buttons = await listQuestionnaireButtons();
console.log(`  Boutons: ${step4Buttons.slice(0,15).map(b => `"${b}"`).join(', ')}`);

// Fréquence 4
await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('#questionnaire button'));
  const f4 = btns.find(b => (b.textContent||'').trim() === '4');
  if (f4) f4.click();
});

// Jours
const days = await page.evaluate(() => {
  const wanted = ['Lundi','Mercredi','Vendredi','Samedi'];
  const btns = Array.from(document.querySelectorAll('#questionnaire button'));
  const clicked = [];
  for (const d of wanted) {
    const t = btns.find(b => (b.textContent||'').trim() === d);
    if (t) { t.click(); clicked.push(d); }
  }
  return clicked;
});
console.log(`  Jours: ${days.join(', ')}`);

await new Promise(r => setTimeout(r, 1000));
await snap('step4-filled');

clicked = await clickInQuestionnaire('Continuer');
console.log(`  Continuer: "${clicked}"`);
await new Promise(r => setTimeout(r, 2000));
await snap('after-step4');

// ════════════════════════════════════════════════════════════════════
// [6] STEP 5 : Inscription
// ════════════════════════════════════════════════════════════════════
console.log('\n[6] Step 5 — Inscription');
const step5Buttons = await listQuestionnaireButtons();
console.log(`  Boutons: ${step5Buttons.slice(0,10).map(b => `"${b}"`).join(', ')}`);

const inputsInfo = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#questionnaire input')).map(i => ({
    type: i.type, name: i.name, placeholder: i.placeholder, id: i.id
  }));
});
console.log(`  Inputs trouvés: ${JSON.stringify(inputsInfo)}`);

const filled = await page.evaluate(({ firstName, email, password }) => {
  const setVal = (input, val) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const inputs = Array.from(document.querySelectorAll('#questionnaire input'));
  const result = {};
  for (const inp of inputs) {
    const ph = (inp.placeholder || '').toLowerCase();
    if (inp.type === 'email' || ph.includes('mail')) { setVal(inp, email); result.email = true; }
    else if (inp.type === 'password' || ph.includes('passe')) { setVal(inp, password); result.password = true; }
    else if (inp.type === 'text' && (ph.includes('prénom') || ph.includes('nom'))) { setVal(inp, firstName); result.firstName = true; }
  }
  return result;
}, { firstName: TEST_FIRSTNAME, email: TEST_EMAIL, password: TEST_PASSWORD });
console.log(`  Inputs remplis: ${JSON.stringify(filled)}`);

await new Promise(r => setTimeout(r, 1000));
await snap('step5-filled');

// ════════════════════════════════════════════════════════════════════
// [7] SUBMIT — déclenche generatePreviewPlan
// ════════════════════════════════════════════════════════════════════
console.log('\n[7] SUBMIT — déclenche flow critique generatePreviewPlan');
let submitClicked = null;
for (const txt of ['Créer mon plan', 'Générer mon plan', 'Generer mon plan', 'Lancer', "C'est parti", 'Valider', 'Mon plan']) {
  submitClicked = await clickInQuestionnaire(txt);
  if (submitClicked) break;
}
console.log(`  Submit: "${submitClicked}"`);
await snap('after-submit-immediate');

if (!submitClicked) {
  console.log('  ⚠️ Bouton submit non trouvé, exploration boutons restants...');
  const allBtns = await listQuestionnaireButtons();
  console.log(`     Boutons: ${allBtns.map(b => `"${b}"`).join(', ')}`);
}

// Attendre redirection ou erreur (max 120s)
console.log('  Attente résultat (max 120s)...');
const startWait = Date.now();
let finalState = null;
while (Date.now() - startWait < 120000) {
  const url = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 600)).catch(() => '');
  if (url.includes('/email-sent')) { finalState = { type: 'SUCCESS_EMAIL_SENT', url }; break; }
  if (url.includes('/plan/')) { finalState = { type: 'SUCCESS_PLAN_REDIRECT', url }; break; }
  if (bodyText.includes('reasons is not defined')) { finalState = { type: 'CRITICAL_REASONS_BUG', bodyText }; break; }
  if (bodyText.includes('Une erreur est survenue')) { finalState = { type: 'ERROR_ALERT', bodyText }; break; }
  await new Promise(r => setTimeout(r, 3000));
  process.stdout.write('.');
}
console.log('');
await snap('final');
console.log(`  État final: ${JSON.stringify(finalState).substring(0,300)}`);

// ════════════════════════════════════════════════════════════════════
// [8] Vérif Firestore
// ════════════════════════════════════════════════════════════════════
console.log('\n[8] Vérification Firestore');
await new Promise(r => setTimeout(r, 3000));
const uid = await findUserByEmail(TEST_EMAIL);
console.log(`  UID Auth: ${uid || 'NON CRÉÉ'}`);

let plansFound = [];
if (uid) {
  plansFound = await getPlansByUserId(uid);
  console.log(`  Plans Firestore: ${plansFound.length}`);
  for (const p of plansFound) {
    const f = p.fields || {};
    const weeks = f.weeks?.arrayValue?.values?.length || 0;
    const title = f.title?.stringValue || '?';
    const dist = f.distance?.stringValue || '?';
    const isPrev = f.isPreview?.booleanValue;
    console.log(`    → title="${title}" distance="${dist}" weeks=${weeks} isPreview=${isPrev}`);
  }
}

// CLEANUP
console.log('\n[CLEANUP]');
if (uid) {
  try { await deleteUserById(uid); console.log('  ✅ User + plans supprimés'); }
  catch (e) { console.log(`  ⚠️ Cleanup fail: ${e.message}`); }
}

await browser.close();

// RÉSUMÉ
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  RÉSUMÉ TEST E2E');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Submit cliqué: ${submitClicked ? '✅ "'+submitClicked+'"' : '❌'}`);
console.log(`État final: ${finalState?.type || '⚠️ TIMEOUT'}`);
console.log(`User créé en Auth: ${uid ? '✅' : '❌'}`);
console.log(`Plans en Firestore: ${plansFound.length}`);
console.log(`Erreurs JS: ${ALL_ERRORS.length}`);
for (const e of ALL_ERRORS.slice(0, 5)) console.log(`  [${e.type}] ${e.msg.substring(0,200)}`);
const reasonsBug = ALL_ERRORS.some(e => e.msg.includes('reasons is not defined'));
console.log(`\n🚨 Bug "reasons is not defined": ${reasonsBug ? 'OUI ❌ ENCORE PRÉSENT' : 'NON ✅ ÉLIMINÉ'}`);
console.log(`📸 Screenshots: ${SCREENSHOT_DIR}/`);

process.exit(reasonsBug ? 1 : 0);
