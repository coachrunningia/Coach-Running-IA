// Patch Xavier : allure spé semi 8:32 → 5:41 (= 2h00 cible), welcome explicite, score reste 5
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'm6anUmcPCxY5o8Sgsj35YilCyvJ2';
const PLAN_ID = '1778945965666';
const PLAN_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const planResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const fields = planDoc.fields;

mkdirSync('/Users/romanemarino/Coach-Running-IA/backup-xavier-2026-05-16', { recursive: true });
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-xavier-2026-05-16/plan-AVANT.json',
  JSON.stringify(planDoc, null, 2));
console.log('✅ Backup AVANT');

const ex = v => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(ex);
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = ex(val);
    return out;
  }
  return v;
};
const enc = val => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(enc) } };
  if (typeof val === 'object') {
    const f = {};
    for (const [k, v] of Object.entries(val)) f[k] = enc(v);
    return { mapValue: { fields: f } };
  }
  return { stringValue: String(val) };
};

const currentCtx = ex(fields.generationContext) || {};

// Patch allure spé semi : 8:32 → 5:41 (DOCTRINE : respecte la cible 2h00)
const newPaces = { ...currentCtx.paces, allureSpecifiqueSemi: '5:41' };
const newGenCtx = { ...currentCtx, paces: newPaces };

// Welcome message explicite (doctrine : alerte HONNÊTE sur l'écart VMA/cible)
const newWelcome = `Bienvenue Xavier ! Ton plan de 20 semaines vise le Semi-Marathon en 2h00, comme tu l'as demandé. Le plan est entièrement construit pour cet objectif : les séances d'allure spécifique sont à 5:41/km, l'allure cible 2h00.

À te dire honnêtement : c'est une cible TRÈS ambitieuse vu ta VMA actuelle (8.3 km/h, estimée depuis ton 5K en 38:09). Tenir 5:41/km pendant 21 km demande de courir à environ 128% de ta VMA actuelle pendant 2h. C'est physiologiquement très difficile, même pour un coureur de haut niveau.

Une fourchette réaliste basée sur ton profil actuel serait plutôt 3h00-3h30. On vise 2h00 et le plan est construit pour. Si ta VMA monte significativement sur la prépa (objectif : passer de 8.3 à 12+ km/h), 2h00 deviendrait jouable. Sinon, signer un semi solide entre 3h00 et 3h30 serait déjà une grande performance.

À partir de 62 ans, la récupération est plus longue : respecte tes 48h entre 2 sorties intenses. Consulte un médecin avant de débuter pour un certificat médical d'aptitude et un bilan cardio-vasculaire. Écoute tes signaux : courbatures normales OK, douleur articulaire ou tendinite = STOP et adapte.`;

// Score reste 5 (l'alerte est déjà claire)
// Reasons : on ajoute des motifs honnêtes
const newReasons = [
  { type: 'risk', text: 'cible 2h00 sur semi demande de courir à 128% de ta VMA actuelle pendant 2h, ce qui est physiologiquement très difficile même pour un coureur expert' },
  { type: 'risk', text: 'ta VMA actuelle (8.3 km/h) correspondrait plutôt à une cible 3h00-3h30 sur semi-marathon' },
  { type: 'warn', text: 'à partir de 62 ans, la récupération est plus longue : sois particulièrement attentif aux signaux de surentraînement' },
  { type: 'good', text: '20 semaines de préparation : durée idéale pour faire monter la VMA si tu suis le plan rigoureusement' },
];
const newFeasibility = { score: 5, status: 'IRRÉALISTE', reasons: newReasons };

const updates = {
  fields: {
    generationContext: enc(newGenCtx),
    feasibility: enc(newFeasibility),
    feasibilityStatus: enc('IRRÉALISTE'),
    welcomeMessage: enc(newWelcome),
    welcomeBlock: enc({ message: newWelcome }),
    _patchedManuallyAt: enc(new Date().toISOString()),
    _patchedReason: enc('Doctrine respectée : allure suit cible chrono (8:32 → 5:41 pour 2h00). Score+welcome alertent irréalisme.'),
  },
};
const updateMask = Object.keys(updates.fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

const patchResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}?${updateMask}`,
  { method: 'PATCH', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify(updates) });
const patchText = await patchResp.text();
if (patchResp.status >= 400) {
  console.log(`❌ HTTP ${patchResp.status}: ${patchText.substring(0,500)}`);
  process.exit(1);
}
console.log(`✅ HTTP ${patchResp.status}`);

// Vérification
const verify = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const verifyDoc = await verify.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-xavier-2026-05-16/plan-APRES.json',
  JSON.stringify(verifyDoc, null, 2));
const vfields = verifyDoc.fields;
const newCtx = ex(vfields.generationContext) || {};
console.log(`\nVérification :`);
console.log(`  Score: ${ex(vfields.feasibility)?.score} (${ex(vfields.feasibilityStatus)})`);
console.log(`  Allure spé semi: ${newCtx.paces?.allureSpecifiqueSemi}  (doit être 5:41)`);
console.log(`  VMA inchangée: ${newCtx.vma}`);
console.log(`  Welcome (extrait): ${(ex(vfields.welcomeMessage) || '').substring(0,200)}...`);
