// Patch Elisa : S1 rééquilibrée (13+14 km), score 65→32, welcome avec alertes VMA + reco 4 séances
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();

const UID = 'pU3EToUQWGgPJA3A8N8fHHm1Xct1';
const PLAN_ID = '1778948515911';
const PLAN_PATH = `projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

const planResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const planDoc = await planResp.json();
const fields = planDoc.fields;

mkdirSync('/Users/romanemarino/Coach-Running-IA/backup-elisa-2026-05-16', { recursive: true });
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-elisa-2026-05-16/plan-AVANT.json', JSON.stringify(planDoc, null, 2));
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

const currentWeeks = ex(fields.weeks) || [];

// Nouvelles sessions S1
const newSessionsS1 = [
  {
    day: 'Mardi',
    type: 'Jogging',
    title: 'Footing nature modéré + côtes courtes',
    duration: '1h25',
    distance: '13 km',
    description: "Footing en endurance fondamentale sur terrain nature/vallonné. Inclure 4-5 côtes courtes (1 min) en course souple, redescente en marche active pour récupérer. Allure conversationnelle, pas d'effort soutenu.",
    pace: '6:30 à 6:45',
  },
  {
    day: 'Jeudi',
    type: 'Renforcement',
    title: 'Renfo Trail Focus A - Quadriceps & Excentrique (S1)',
    duration: '35-40 min',
    distance: '0 km',
    description: "Renforcement spécifique trail : quadriceps, fessiers, gainage, excentrique mollets. Échauffement 5min + circuit 30min (squats, fentes avants/arrières, descentes contrôlées, gainage planche, pont fessier excentrique).",
  },
  {
    day: 'Dimanche',
    type: 'Sortie Longue',
    title: 'Sortie Longue trail en endurance fondamentale',
    duration: '1h35',
    distance: '14 km',
    description: "Sortie longue en endurance fondamentale sur terrain vallonné (~D+200m). Allure très facile, conversation possible. Marche autorisée dans les montées raides si besoin. C'est la construction de la durée et de l'aisance.",
    pace: '6:45 à 7:00',
  },
];

const newWeeks = currentWeeks.map((w, idx) => {
  if (idx === 0) return { ...w, sessions: newSessionsS1, weekVolumeTarget: 27 };
  return w;
});

// Score + status
const newReasons = [
  { type: 'warn', text: 'aucun chrono saisi pour calibrer ta VMA — les allures sont estimées depuis ton niveau auto-déclaré (Intermédiaire), donc à valider sur le terrain' },
  { type: 'warn', text: 'volume actuel 35 km/sem en 2 sorties course = environ 17 km par sortie : c\'est lourd, passer à 3 sorties course (4 séances/sem total) répartirait la charge' },
  { type: 'risk', text: 'dénivelé cible 490m vs ton actuel 130m/sem : la progression D+ sera l\'enjeu majeur de ta prépa' },
  { type: 'good', text: '17 semaines de prépa avec volume de base solide (35 km/sem) : tu as une base saine pour ce trail finisher' },
  { type: 'good', text: '46 ans avec 0 blessure déclarée : profil sain, mais reste à l\'écoute (récupération 48h+ entre sorties intenses)' },
];
const newFeasibility = { score: 32, status: 'AMBITIEUX', reasons: newReasons };

// Welcome avec alertes
const newWelcome = `Bienvenue Elisa ! Ton plan de 17 semaines vise à te faire finir le Trail de 15 km D+490m avec confiance et plaisir.

⚠️ **Alerte calibration** : tu n'as pas saisi de chrono récent (5K, 10K…), donc ta VMA actuelle (13,5 km/h) est estimée par défaut depuis ton niveau Intermédiaire. Les allures du plan (EF 6:38, seuil 5:07, etc.) sont théoriques et peuvent être trop rapides pour toi. **Recommandation : fais un test VMA sur piste ou saisis un chrono récent pour calibrer le plan**. En attendant, prends les allures comme indicatives et ajuste à la sensation (effort modéré = conversation possible).

💡 **Reco fréquence** : tu fais déjà 35 km/sem en 3 séances (2 course + 1 renfo) = environ 17 km par sortie. Passer à **4 séances/sem** (3 course + 1 renfo) répartirait mieux la charge et permettrait d'introduire plus de travail technique (côtes structurées, footing technique). Tu peux le modifier dans ton profil à tout moment.

📈 **L'enjeu principal de ta prépa** : faire monter ton D+ hebdo de 130m actuel vers 500-600m en peak. Le D+ est le vrai challenge sur trail, plus que les km plats. Le plan intègre une progression progressive du dénivelé.

À partir de 46 ans, la récupération est plus longue : respecte tes 48h entre 2 sorties intenses. Consulte un médecin avant de débuter pour un certificat médical d'aptitude et un bilan cardio-vasculaire conseillé. Écoute tes signaux : courbatures normales OK, douleur articulaire ou tendinite = STOP et adapte.`;

const updates = {
  fields: {
    weeks: enc(newWeeks),
    confidenceScore: enc(32),
    feasibilityStatus: enc('AMBITIEUX'),
    feasibility: enc(newFeasibility),
    welcomeMessage: enc(newWelcome),
    welcomeBlock: enc({ message: newWelcome }),
    _patchedManuallyAt: enc(new Date().toISOString()),
    _patchedReason: enc('S1 rééquilibrée (Mardi 13 + Dimanche 14 = 27km au lieu de 29 mal distribués). Score honnête (VMA fictive). Welcome avec 3 alertes : calibration VMA / reco 4 séances / progression D+.'),
  },
};
const updateMask = Object.keys(updates.fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

const patchResp = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}?${updateMask}`,
  { method: 'PATCH', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify(updates) });
console.log(`PATCH HTTP ${patchResp.status}`);
if (patchResp.status >= 400) {
  console.log(await patchResp.text());
  process.exit(1);
}

// Vérif
const verify = await fetch(`https://firestore.googleapis.com/v1/${PLAN_PATH}`,
  { headers:{Authorization:`Bearer ${TOKEN}`,'x-goog-user-project':PROJECT} });
const verifyDoc = await verify.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/backup-elisa-2026-05-16/plan-APRES.json', JSON.stringify(verifyDoc, null, 2));
const vf = verifyDoc.fields;
const vw = ex(vf.weeks)?.[0];
console.log(`\nVérification :`);
console.log(`  Score: ${ex(vf.feasibility)?.score} (${ex(vf.feasibilityStatus)})`);
console.log(`  S1 sessions :`);
for (const s of (vw?.sessions || [])) {
  console.log(`    [${s.day}] ${s.title} — ${s.distance} / ${s.duration}`);
}
console.log(`  Welcome (extrait) : ${(ex(vf.welcomeMessage) || '').substring(0,180)}...`);
