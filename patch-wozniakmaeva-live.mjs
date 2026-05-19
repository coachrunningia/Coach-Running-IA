/**
 * Patch live wozniak.maeva2@gmail.com (plan 1779188625574) :
 *   - feasibility.status : BON → AMBITIEUX
 *   - feasibility.score : 70 → 40
 *   - feasibility.message : réécrit transparent (1h30 ambitieux, chrono réaliste 1h45-1h55)
 *   - feasibility.recommendation : ajouté (chrono cible 1h45-1h55)
 *   - feasibility.safetyWarning : conservé (déjà bon, mention médecin/kiné présente)
 *   - confidenceScore (racine) : 70 → 40
 *   - welcomeMessage : réécrit transparent (scope course + objectif honnête + blessure)
 *
 * NE TOUCHE PAS :
 *   - targetTime "1h30" (doctrine feedback_jamais_baisser_allure_cible)
 *   - weeklyVolumes (blessure — calibré sécurité)
 *   - Sessions S1 (excellente adaptation blessure)
 *
 * Mode :
 *   DRY_RUN=true node patch-wozniakmaeva-live.mjs   (preview, aucun écriture)
 *   DRY_RUN=false node patch-wozniakmaeva-live.mjs  (exec patch live)
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const DRY_RUN = process.env.DRY_RUN !== 'false'; // défaut = dry-run
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779188625574';

const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { stdio:['pipe','pipe','pipe'] }).toString().trim();
const H = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

console.log(`\n${'='.repeat(70)}`);
console.log(`PATCH wozniakmaeva — plan ${PLAN_ID}`);
console.log(`MODE: ${DRY_RUN ? '🟡 DRY-RUN (preview seul)' : '🔴 LIVE (écriture Firestore)'}`);
console.log('='.repeat(70));

// 1. Fetch doc actuel
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
if (r.status !== 200) { console.error(`❌ Fetch failed (${r.status})`); process.exit(1); }
const doc = await r.json();

const oldFeas = doc.fields.feasibility?.mapValue?.fields;
const oldWelcome = doc.fields.welcomeMessage?.stringValue;
const oldConfidence = doc.fields.confidenceScore?.integerValue;
const oldTargetTime = doc.fields.targetTime?.stringValue;

console.log(`\n── AVANT ──`);
console.log(`  feasibility.status      : ${oldFeas?.status?.stringValue}`);
console.log(`  feasibility.score       : ${oldFeas?.score?.integerValue}`);
console.log(`  feasibility.message     : "${oldFeas?.message?.stringValue?.substring(0,100)}…"`);
console.log(`  feasibility.safetyWarning: "${oldFeas?.safetyWarning?.stringValue?.substring(0,100)}…"`);
console.log(`  confidenceScore (racine): ${oldConfidence}`);
console.log(`  targetTime              : ${oldTargetTime} (CONSERVÉ)`);
console.log(`  welcomeMessage          : "${oldWelcome?.substring(0,100)}…"`);

// 2. Nouveau feasibility.message (transparent, doctrine sécurité>conversion)
const newFeasMessage = `Ton objectif de 1h30 sur l'Hyrox est très ambitieux : il demande de tenir une allure course autour de 5:37/km entre les stations, soit ~89% de ta VMA actuelle (10,5 km/h) en jambes carbo après chaque station. Physiologiquement, c'est à la limite haute pour ce format.

Plus important : ta blessure genoux/ménisques nous impose une vraie prudence sur le volume — on reste à 12 km/sem au pic (pas 30-40 km comme pour un Hyrox 1h30 compétitif sans blessure) pour protéger ton genou.

Avec ce plan calibré sécurité, un **chrono réaliste se situe plutôt autour de 1h45-1h55**. C'est déjà une belle perf vu le contexte. L'objectif numéro 1 reste de finir l'Hyrox en bonne santé.`;

const newFeasRecommendation = `un chrono cible autour de 1h45-1h55`;

// safetyWarning existant : contient déjà mention kiné/médecin + adaptation. On le conserve.
const keepSafetyWarning = oldFeas?.safetyWarning?.stringValue || '';

// Nouveau welcomeMessage (transparent, scope course, blessure)
const newWelcome = `Bienvenue dans ton plan Hyrox sur 20 semaines. On a calibré ce plan avec deux contraintes prioritaires : ta blessure genoux/ménisques et la spécificité du format Hyrox (course + stations).

⚠️ Honnêteté sur l'objectif 1h30 : avec ta VMA actuelle de 10,5 km/h et la prudence imposée par ta blessure, ce chrono est très ambitieux. Un chrono réaliste pour cette prépa se situe autour de 1h45-1h55, ce qui est déjà une belle performance. L'objectif n°1 reste de finir en bonne santé.

📌 Important — Scope de ce plan : Coach Running IA prépare uniquement la partie course de ton Hyrox (8 × 1 km entre les stations). La préparation des stations (sled push, burpees, wall balls, etc.) est à compléter à part avec un coach Hyrox ou en salle. On se concentre sur l'aérobie + fractionnés au pace cible Hyrox.

🦵 Côté blessure : on reste à 12 km/sem au pic (très en-dessous des 30-40 km/sem usuels pour Hyrox 1h30 compétitif) pour protéger ton genou. Le renfo "Quadriceps & Prévention Genou" est intégré 1×/sem. Garde un suivi kiné régulier pendant la prépa et arrête toute séance qui réveille la douleur.

On compte sur toi pour t'écouter et te faire confiance sur ce plan calibré sécurité avant performance.`;

// Construction nouveau feasibility (clone tout, change ce qui doit l'être)
const newFeasFields = {
  ...oldFeas,
  status: { stringValue: 'AMBITIEUX' },
  score: { integerValue: '40' },
  message: { stringValue: newFeasMessage },
  recommendation: { stringValue: newFeasRecommendation },
  confidenceScore: { integerValue: '40' },
  // safetyWarning conservé via spread oldFeas
};

console.log(`\n── APRÈS ──`);
console.log(`  feasibility.status      : AMBITIEUX`);
console.log(`  feasibility.score       : 40`);
console.log(`  feasibility.message     : (${newFeasMessage.length} chars) "${newFeasMessage.substring(0,120)}…"`);
console.log(`  feasibility.recommendation: "${newFeasRecommendation}"`);
console.log(`  feasibility.safetyWarning: CONSERVÉ (${keepSafetyWarning.length} chars)`);
console.log(`  feasibility.confidenceScore: 40`);
console.log(`  confidenceScore (racine): 40`);
console.log(`  targetTime              : ${oldTargetTime} (NON TOUCHÉ)`);
console.log(`  welcomeMessage          : (${newWelcome.length} chars) "${newWelcome.substring(0,120)}…"`);

if (DRY_RUN) {
  console.log(`\n🟡 DRY-RUN — aucune écriture Firestore. Pour exécuter : DRY_RUN=false node patch-wozniakmaeva-live.mjs`);
  process.exit(0);
}

// 3. PATCH live
console.log(`\n🔴 Exécution patch Firestore live…`);
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?updateMask.fieldPaths=feasibility&updateMask.fieldPaths=confidenceScore&updateMask.fieldPaths=welcomeMessage`;
const body = {
  fields: {
    feasibility: { mapValue: { fields: newFeasFields } },
    confidenceScore: { integerValue: '40' },
    welcomeMessage: { stringValue: newWelcome },
  }
};
const patch = await fetch(url, { method:'PATCH', headers:H, body: JSON.stringify(body) });
const pj = await patch.json();
if (patch.status !== 200) {
  console.error(`❌ Patch failed (${patch.status}):`, JSON.stringify(pj).substring(0,800));
  process.exit(1);
}
console.log(`✅ PATCH OK (HTTP ${patch.status})`);

// 4. Re-fetch + dump
const v = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, { headers:H });
const vj = await v.json();
writeFileSync('/Users/romanemarino/Coach-Running-IA/post-patch-wozniakmaeva-plan.json', JSON.stringify(vj, null, 2));

const vFeas = vj.fields.feasibility?.mapValue?.fields;
console.log(`\n── VÉRIFICATION Firestore re-fetched ──`);
console.log(`  feasibility.status      : ${vFeas?.status?.stringValue}`);
console.log(`  feasibility.score       : ${vFeas?.score?.integerValue}`);
console.log(`  feasibility.confidenceScore: ${vFeas?.confidenceScore?.integerValue}`);
console.log(`  feasibility.message commence par: "${vFeas?.message?.stringValue?.substring(0,80)}…"`);
console.log(`  feasibility.recommendation: "${vFeas?.recommendation?.stringValue}"`);
console.log(`  feasibility.safetyWarning préservé: ${(vFeas?.safetyWarning?.stringValue || '').length} chars`);
console.log(`  confidenceScore (racine): ${vj.fields.confidenceScore?.integerValue}`);
console.log(`  targetTime              : ${vj.fields.targetTime?.stringValue} (DOIT être "1h30")`);
console.log(`  welcomeMessage commence par: "${vj.fields.welcomeMessage?.stringValue?.substring(0,80)}…"`);

// Checks sanity
const ok = {
  status: vFeas?.status?.stringValue === 'AMBITIEUX',
  score: vFeas?.score?.integerValue === '40',
  rootConfidence: vj.fields.confidenceScore?.integerValue === '40',
  targetTimePreserved: vj.fields.targetTime?.stringValue === '1h30',
  welcomeUpdated: vj.fields.welcomeMessage?.stringValue?.startsWith('Bienvenue dans ton plan Hyrox'),
};
console.log(`\n── SANITY CHECKS ──`);
Object.entries(ok).forEach(([k,v]) => console.log(`  ${v?'✅':'❌'} ${k}`));
const allOk = Object.values(ok).every(Boolean);
console.log(`\n${allOk ? '✅ TOUS LES CHECKS OK' : '❌ AU MOINS UN CHECK ÉCHOUE — vérifier post-patch JSON'}`);
console.log(`\n📁 Dump post-patch : /Users/romanemarino/Coach-Running-IA/post-patch-wozniakmaeva-plan.json`);
