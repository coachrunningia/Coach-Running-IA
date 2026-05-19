// Patch en live le plan de Maud : allure spé semi (5:46 → 5:13), score, welcome, volumes
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'TvrFIXvwaqPROy5NjQ0mmgNAOUS2';
const PLAN_ID = '1778926085135';
const PLAN_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

console.log('▶ 1/5 Récupération plan');
const planResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const fields = planDoc.fields;

mkdirSync('/Users/romanemarino/Coach-Running-IA/backup-maud-2026-05-16', { recursive: true });
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-maud-2026-05-16/plan-AVANT.json',
  JSON.stringify(planDoc, null, 2));
console.log('  ✅ Backup AVANT');

const ex = (v) => {
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
const enc = (val) => {
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

console.log('\n▶ 2/5 Patch allure spé semi (5:46 → 5:13 = 1h50)');
const newPaces = { ...currentCtx.paces, allureSpecifiqueSemi: '5:13' };

console.log('\n▶ 3/5 Patch volumes (peak 23 → 38) + ajout slDistances (peak 19)');
// 22 semaines, peak 38 km, recovery weeks préservées (S4, S8, S12, S16, S20)
const newWeeklyVolumes = [17, 20, 23, 19, 22, 26, 28, 23, 28, 32, 34, 28, 32, 35, 38, 30, 34, 36, 38, 30, 22, 16];
const newSlDistances =   [8,  10, 11,  9, 11, 13, 14, 11, 14, 15, 16, 13, 15, 17, 18, 14, 16, 17, 19, 14, 11,  9];
const newPeri = { ...currentCtx.periodizationPlan, weeklyVolumes: newWeeklyVolumes, slDistances: newSlDistances };
console.log(`  Volumes peak: ${Math.max(...newWeeklyVolumes)} km | SL peak: ${Math.max(...newSlDistances)} km`);

console.log('\n▶ 4/5 Patch feasibility (78 → 45 RISQUÉ + reasons honnêtes)');
const newReasons = [
  { type: 'risk', text: 'cible 1h50 sur semi demande de courir à ~93% de ta VMA pendant 1h50, ce qui est très exigeant — un confirmé tient typiquement 87-88% sur semi' },
  { type: 'risk', text: 'ta VMA actuelle (12,2 km/h) correspond plutôt à un niveau intermédiaire — la cible 1h50 suppose une VMA d\'au moins 14 km/h pour être tenue confortablement' },
  { type: 'warn', text: 'volume peak de 38 km/sem est à la limite pour un semi 1h50 — un volume de 50+ km/sem (4 séances) serait optimal' },
  { type: 'warn', text: 'à partir de 46 ans, la récupération est plus longue : 3 séances/sem est adapté en intensité mais limitant pour le volume nécessaire' },
  { type: 'good', text: '22 semaines de préparation : durée idéale pour faire monter la VMA et construire la résistance spécifique semi' },
];
const newFeasibility = { score: 45, status: 'RISQUÉ', reasons: newReasons };

console.log('\n▶ 5/5 Patch welcome message (transparent + reco 4 séances + prudence 46+)');
const newWelcome = `Bienvenue Maud ! Ton plan de 22 semaines vise le Semi-Marathon de Paris en 1h50, comme tu l'as demandé.

À te dire honnêtement : c'est une cible ambitieuse vu ta VMA actuelle (12,2 km/h estimée depuis tes chronos 10 km et semi). Tenir 5:13/km pendant 21 km demande de courir à environ 93% de ta VMA pendant 1h50 — un confirmé tient en général 87-88% sur cette distance. Une fourchette réaliste basée sur ton profil actuel serait plutôt 1h55-2h00.

On vise 1h50 et le plan est construit pour. Si tu progresses bien (VMA qui monte de 1 km/h sur la prépa = atteignable sur 22 semaines), 1h50 devient jouable. Sinon, signer un semi solide entre 1h55 et 2h00 sera déjà un excellent résultat.

Avec 3 séances/sem (2 sortie course + 1 renforcement), on est à la limite du volume pour cette cible. Si tu peux passer à 4 séances course, ça augmenterait significativement tes chances — n'hésite pas à le modifier dans ton profil.

À partir de 46 ans, la récupération est plus longue : respecte tes 48h entre 2 sorties intenses. Consulte un médecin avant de débuter pour un certificat médical d'aptitude et un bilan cardio-vasculaire. Écoute tes signaux : courbatures normales OK, douleur articulaire ou tendinite = STOP et adapte.`;

const newGenCtx = { ...currentCtx, paces: newPaces, periodizationPlan: newPeri };

const updates = {
  fields: {
    generationContext: enc(newGenCtx),
    confidenceScore: enc(45),
    feasibilityStatus: enc('RISQUÉ'),
    feasibility: enc(newFeasibility),
    welcomeMessage: enc(newWelcome),
    welcomeBlock: enc({ message: newWelcome }),
    _patchedManuallyAt: enc(new Date().toISOString()),
    _patchedReason: enc('Bug allure asymétrique : 5:46 (~2h01) → 5:13 (= 1h50 cible). Score + welcome alignés.'),
  },
};
const updateMask = Object.keys(updates.fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

console.log('\n▶ PATCH Firestore...');
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
console.log('\n▶ Vérification post-patch');
const verify = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const verifyDoc = await verify.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-maud-2026-05-16/plan-APRES.json',
  JSON.stringify(verifyDoc, null, 2));
const vfields = verifyDoc.fields;
const newCtx = ex(vfields.generationContext) || {};
console.log(`  Score: ${ex(vfields.confidenceScore)}`);
console.log(`  Status: ${ex(vfields.feasibilityStatus)}`);
console.log(`  Allure spé semi: ${newCtx.paces?.allureSpecifiqueSemi}`);
console.log(`  Volume peak: ${Math.max(...(newCtx.periodizationPlan?.weeklyVolumes || [0]))} km`);
console.log(`  SL peak: ${Math.max(...(newCtx.periodizationPlan?.slDistances || [0]))} km`);

console.log('\n✅ Backups: backup-maud-2026-05-16/');
