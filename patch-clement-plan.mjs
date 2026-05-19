// Patch en live le plan de Clément Bouche : allure spé, score, welcome, S1, volumes
// AVEC BACKUP préalable
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'e4iFMJFc3ycDnqf4YO6MmQVMBTA2';
const PLAN_ID = '1778935838729';
const PLAN_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// 1. RÉCUPÉRER LE PLAN ACTUEL
console.log('▶ 1/6 Récupération plan actuel');
const planResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const fields = planDoc.fields;

// 2. BACKUP
mkdirSync('/Users/romanemarino/Coach-Running-IA/backup-clement-2026-05-16', { recursive: true });
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-clement-2026-05-16/plan-AVANT.json',
  JSON.stringify(planDoc, null, 2));
console.log('  ✅ Backup AVANT créé');

// Helper extract/encode Firestore typed values
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

// 3. CONSTRUIRE LES VALEURS PATCHÉES
console.log('\n▶ 2/6 Patch allure spécifique semi (5:49 → 5:41)');

// Récupérer paces actuelles
const currentCtx = ex(fields.generationContext) || {};
const newPaces = { ...currentCtx.paces, allureSpecifiqueSemi: '5:41' };

console.log('  ✅ allureSpecifiqueSemi = 5:41 (cible 2h00 respectée)');

console.log('\n▶ 3/6 Patch volumes hebdo (peak 27 → 36) + ajout slDistances');
// Volumes ajustés : peak passe de 27 à 36 km. Recovery weeks préservées.
const newWeeklyVolumes = [20, 22, 25, 20, 24, 28, 24, 30, 34, 28, 32, 36, 28, 32, 36, 28, 32, 24, 16];
// SL distances : peak 19 km (90% du semi). Recovery weeks SL plus courte.
const newSlDistances =   [10, 11, 13, 10, 12, 14, 11, 15, 17, 13, 16, 18, 14, 16, 19, 14, 17, 12, 10];
const newPeri = {
  ...currentCtx.periodizationPlan,
  weeklyVolumes: newWeeklyVolumes,
  slDistances: newSlDistances,
};
console.log(`  ✅ Volumes: peak ${Math.max(...newWeeklyVolumes)}km (était 27) | SL peak ${Math.max(...newSlDistances)}km`);

console.log('\n▶ 4/6 Patch feasibility (90 EXCELLENT → 50 RISQUÉ + reasons honnêtes)');
const newReasons = [
  { type: 'risk', text: 'cible 2h00 demande de courir à ~94% de ta VMA pendant 2h, ce qui est très exigeant — un confirmé tient typiquement 85-88% sur semi' },
  { type: 'risk', text: 'ta VMA actuelle (12,1 km/h) correspond plutôt à un niveau intermédiaire — la cible 2h00 suppose une VMA d\'au moins 14 km/h pour être tenue confortablement' },
  { type: 'warn', text: 'volume peak de 36 km/sem reste à la limite pour un semi 2h00 — un volume de 45-55 km/sem (4 séances) serait plus adapté' },
  { type: 'warn', text: 'niveau auto-déclaré "Confirmé" semble surévalué par rapport à ta VMA — pas un problème, on s\'adapte sur tes données réelles' },
  { type: 'good', text: '19 semaines de préparation : durée idéale pour faire monter la VMA et construire la résistance spécifique semi' },
];
const newFeasibility = {
  score: 50,
  status: 'RISQUÉ',
  reasons: newReasons,
};

console.log('\n▶ 5/6 Patch welcome message (transparence sur cible ambitieuse)');
const newWelcome = `Bienvenue Clément ! Ton plan de 19 semaines vise les 2h00 sur semi-marathon, comme tu l'as demandé.

À te dire honnêtement : c'est une cible ambitieuse vu ta VMA actuelle (12,1 km/h estimée depuis ton 10 km en 55 min). Tenir 5:41/km pendant 21 km demande de courir à environ 94% de ta VMA pendant 2h — un confirmé tient en général 85-88% sur cette distance. Une fourchette réaliste basée sur ton profil actuel serait plutôt 2h05-2h10.

On vise 2h00 et le plan est construit pour. Si tu progresses bien (VMA qui monte de 1 km/h sur la prépa = clairement atteignable), 2h00 devient jouable. Sinon, finir solide entre 2h05 et 2h10 sera déjà un excellent résultat.

Avec 3 séances/sem (2 sortie course + 1 renforcement), on est à la limite du volume nécessaire pour viser 2h00. Si tu peux passer à 4 séances course, ça augmenterait significativement tes chances — n'hésite pas à le modifier dans ton profil.

Consulte un médecin avant de débuter pour ton certificat médical d'aptitude. Écoute tes signaux : courbatures normales OK, douleur articulaire ou tendinite = STOP et adapte.`;

console.log('\n▶ 6/6 Patch S1 sessions (SL Dimanche, jogging Mardi, cap volume)');
// S1 corrigée : Mardi devient jogging EF court, Dimanche devient la vraie SL
const newSessionsS1 = [
  {
    day: 'Mardi',
    type: 'Jogging',
    title: 'Footing EF de reprise',
    duration: '55 min',
    distance: '7.5 km',
    description: 'Footing en endurance fondamentale, allure facile (7:23/km), tu dois pouvoir tenir une conversation. Surface souple si possible.',
    pace: '7:23',
  },
  {
    day: 'Jeudi',
    type: 'Renforcement',
    title: 'Renfo Focus A - Quadriceps & Gainage (S1)',
    duration: '30 min',
    distance: '0 km',
    description: 'Renforcement musculaire général. Quadriceps, fessiers, gainage. Échauffement 5min mobilité + 25min circuit (squats, fentes, gainage planche, pont fessier).',
  },
  {
    day: 'Dimanche',
    type: 'Sortie Longue',
    title: 'Première Sortie Longue en EF',
    duration: '1h10',
    distance: '10 km',
    description: 'Sortie longue en endurance fondamentale, allure facile (7:23/km). Très important : reste en conversation, on construit la durée pas l\'intensité. Hydrate-toi avant et pendant si > 1h.',
    pace: '7:23',
  },
];

// Mettre à jour le plan complet
const currentWeeks = ex(fields.weeks) || [];
const newWeeks = currentWeeks.map((w, idx) => {
  if (idx === 0) return { ...w, sessions: newSessionsS1, weekVolumeTarget: 17.5 };
  return w;
});

// Construire les updateMask + patch
const newGenCtx = {
  ...currentCtx,
  paces: newPaces,
  periodizationPlan: newPeri,
};

const updates = {
  fields: {
    generationContext: enc(newGenCtx),
    weeks: enc(newWeeks),
    confidenceScore: enc(50),
    feasibilityStatus: enc('RISQUÉ'),
    feasibility: enc(newFeasibility),
    welcomeMessage: enc(newWelcome),
    welcomeBlock: enc({ message: newWelcome }),
    _patchedManuallyAt: enc(new Date().toISOString()),
    _patchedReason: enc('Coach expert audit — allure spé respectée, score honnête, welcome transparent, S1 sécurisée, volumes ajustés'),
  },
};

const updateMask = Object.keys(updates.fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

console.log('\n▶ Application du patch via Firestore PATCH...');
const patchResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}?${updateMask}`,
  { method: 'PATCH', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify(updates) });
const patchResult = await patchResp.text();
if (patchResp.status >= 400) {
  console.log(`  ❌ HTTP ${patchResp.status}`);
  console.log(`  ${patchResult.substring(0, 500)}`);
  process.exit(1);
}
console.log(`  ✅ HTTP ${patchResp.status} — patch appliqué`);

// VÉRIFIER
console.log('\n▶ Vérification post-patch');
const verify = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const verifyDoc = await verify.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-clement-2026-05-16/plan-APRES.json',
  JSON.stringify(verifyDoc, null, 2));

const vfields = verifyDoc.fields;
const newCtx = ex(vfields.generationContext) || {};
const newW = ex(vfields.weeks) || [];
console.log(`  Score: ${ex(vfields.confidenceScore)}`);
console.log(`  Status: ${ex(vfields.feasibilityStatus)}`);
console.log(`  Allure spé semi: ${newCtx.paces?.allureSpecifiqueSemi}`);
console.log(`  Volume peak: ${Math.max(...(newCtx.periodizationPlan?.weeklyVolumes || [0]))} km`);
console.log(`  SL peak: ${Math.max(...(newCtx.periodizationPlan?.slDistances || [0]))} km`);
console.log(`  S1 sessions (${newW[0]?.sessions?.length}):`);
for (const s of (newW[0]?.sessions || [])) {
  console.log(`    [${s.day}] ${s.type} — ${s.title} (${s.distance})`);
}
console.log(`  Welcome (extrait): ${(ex(vfields.welcomeMessage) || '').substring(0,150)}...`);

console.log('\n✅ Backups : /Users/romanemarino/Coach-Running-IA/backup-clement-2026-05-16/');
console.log('   - plan-AVANT.json (état d\'origine, restaurable)');
console.log('   - plan-APRES.json (état après patch)');
