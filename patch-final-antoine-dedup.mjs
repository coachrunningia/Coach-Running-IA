/**
 * PATCH FINAL — Antoine dédup Mercredi vs Samedi S1 — 18/05/2026
 * ────────────────────────────────────────────────────────────────────────────
 * Plan : 1779086346189 (antoineg.gde@outlook.fr, UID G1QYJ1KzqqWXoB5BbcjKQFmORC02)
 *
 * Bug : weeks[0].sessions[2] (Mercredi) et [4] (Samedi) sont 100% identiques
 *       (title, distance, duration, mainSet, warmup, cooldown, advice, targetPace,
 *       locationSuggestion, type, intensity, elevationGain).
 *       Variation insuffisante.
 *
 * Décision : on garde le Samedi tel quel (séance phare vallonnée maintenue
 *            le week-end), on remplace le Mercredi par un footing progressif
 *            avec habituation allure marathon (cohérent avec Expert sub-3h00).
 *
 * Mercredi NOUVEAU :
 *   - title : "Footing progressif — habituation allure marathon"
 *   - type : Jogging (inchangé)
 *   - distance : 10.0 km (-2 km, négligeable, S1 reste cohérent)
 *   - duration : 50 min
 *   - mainSet : 15 min EF + 25 min progressif EA → allure marathon + 10 min EF retour calme
 *   - locationSuggestion : Berges du Meu et du Canal d'Ille-et-Rance (terrain plat, différent du Sam vallonné)
 *   - warmup : intégré dans mainSet (les 15 min EF servent d'échauffement progressif), mais on
 *              garde un warmup formel court pour cohérence avec format des autres séances
 *   - cooldown : conservé format identique
 *   - targetPace : "4:16 min/km" (allure marathon = cible de la séance)
 *   - advice : conseil cohérent
 *   - intensity : "Modérée" (progressif vers allure marathon ≠ Facile)
 *   - elevationGain : 0 (terrain plat)
 *   - id : préservé (id unique séance)
 *   - day : "Mercredi" (préservé)
 *
 * Doctrine :
 *   - Touche UNIQUEMENT weeks[0].sessions[2]
 *   - Aucun autre champ modifié (paces, feasibility, weeklyVolumes, autres séances, welcome)
 *   - PATCH array : on renvoie tout sessions[] mais avec uniquement index 2 modifié
 *   - Idempotent : si title Mercredi ≠ title Samedi déjà, skip
 *   - Backup systématique + re-read confirmation
 *
 * Usage : node patch-final-antoine-dedup.mjs --apply
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
if (!APPLY) { console.error('🔴 --apply requis.'); process.exit(1); }

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`, { encoding: 'utf-8' }).trim();
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT };

const PLAN_ID = '1779086346189';
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-final';
mkdirSync(BACKUP_DIR, { recursive: true });

async function readPlan() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error('READ → ' + j.error.message);
  return j;
}

async function patchWeeks(newWeeksFieldValue) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
  const qs = 'updateMask.fieldPaths=weeks';
  const body = { fields: { weeks: newWeeksFieldValue } };
  const r = await fetch(`${url}?${qs}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error('PATCH → ' + j.error.message);
  return j;
}

// ── Nouveau Mercredi (cohérent Expert Marathon sub-3h00) ───────────────────
function buildNewMercredi(idPreserved) {
  return {
    mapValue: {
      fields: {
        id: { stringValue: idPreserved },
        day: { stringValue: 'Mercredi' },
        type: { stringValue: 'Jogging' },
        title: { stringValue: 'Footing progressif — habituation allure marathon' },
        distance: { stringValue: '10.0 km' },
        duration: { stringValue: '50 min' },
        intensity: { stringValue: 'Modérée' },
        elevationGain: { integerValue: '0' },
        targetPace: { stringValue: '4:16 min/km' },
        locationSuggestion: { stringValue: "Berges du Meu et du Canal d'Ille-et-Rance (terrain plat, idéal allure stable)" },
        warmup: { stringValue: '10 min de footing en endurance fondamentale (5:05 min/km), foulée déliée, respiration ample.' },
        mainSet: { stringValue: '15 min EF (5:05 min/km) en mise en route, puis 25 min en progressif : on glisse de l’endurance active (4:26 min/km) vers l’allure marathon (4:16 min/km) sur les 10 dernières minutes. Effort propre, foulée tonique, jamais en force. Termine par 10 min de retour calme en EF (5:05 min/km).' },
        cooldown: { stringValue: '5 à 10 min de marche puis étirements légers (mollets, ischios, psoas).' },
        advice: { stringValue: "Le but de cette séance, c'est d'habituer ton corps à tenir l'allure marathon sans la subir. On y va par paliers : EF en mise en route, EA pour amener la cadence, allure marathon en finale. Si tu te sens contraint sur les 10 dernières minutes, reste sur l'EA — la qualité prime sur la cible chrono." },
      },
    },
  };
}

console.log('='.repeat(80));
console.log('PATCH FINAL — Antoine dédup Mercredi S1 — plan ' + PLAN_ID);
console.log('='.repeat(80));

const before = await readPlan();
const backupPath = `${BACKUP_DIR}/antoine-pre-dedup-mercredi.json`;
writeFileSync(backupPath, JSON.stringify(before, null, 2));
console.log('  📦 backup →', backupPath);

const weeksFV = before.fields?.weeks;
if (!weeksFV?.arrayValue?.values) { console.error('🔴 weeks manquant.'); process.exit(1); }
const weeksArr = weeksFV.arrayValue.values;
const w0 = weeksArr[0].mapValue.fields;
const sessArr = w0.sessions.arrayValue.values;

// Identifier Mercredi et Samedi par day (sécurise même si index changeait)
const idxMer = sessArr.findIndex((s) => s.mapValue?.fields?.day?.stringValue === 'Mercredi');
const idxSam = sessArr.findIndex((s) => s.mapValue?.fields?.day?.stringValue === 'Samedi');
console.log('  idx Mercredi :', idxMer, '| idx Samedi :', idxSam);
if (idxMer < 0 || idxSam < 0) { console.error('🔴 Mercredi ou Samedi introuvable.'); process.exit(1); }

const merBefore = sessArr[idxMer].mapValue.fields;
const samBefore = sessArr[idxSam].mapValue.fields;

const titleMer = merBefore.title?.stringValue;
const titleSam = samBefore.title?.stringValue;
const mainSetMer = merBefore.mainSet?.stringValue;
const mainSetSam = samBefore.mainSet?.stringValue;

console.log('\n  AVANT Mercredi :');
console.log('    title   :', titleMer);
console.log('    dist    :', merBefore.distance?.stringValue);
console.log('    dur     :', merBefore.duration?.stringValue);
console.log('    loc     :', merBefore.locationSuggestion?.stringValue);
console.log('    mainSet :', mainSetMer);
console.log('  Samedi (référence, inchangé) :');
console.log('    title   :', titleSam);
console.log('    dist    :', samBefore.distance?.stringValue);
console.log('    loc     :', samBefore.locationSuggestion?.stringValue);

// Idempotence
if (titleMer !== titleSam || mainSetMer !== mainSetSam) {
  console.log('\n  ✅ Idempotent : Mercredi déjà différent de Samedi. Aucun PATCH.');
  process.exit(0);
}

// Construire nouvelle session Mercredi (id préservé)
const idPreserved = merBefore.id?.stringValue;
console.log('\n  id Mercredi préservé :', idPreserved);
const newMer = buildNewMercredi(idPreserved);

// Construire nouvelles sessions[] (toutes inchangées sauf idxMer)
const newSessArr = sessArr.map((s, i) => (i === idxMer ? newMer : s));

// Construire nouveau weeks[] (week 0 modifiée, autres inchangées)
const newW0Fields = { ...w0, sessions: { arrayValue: { values: newSessArr } } };
const newWeeksArr = weeksArr.map((w, i) => (i === 0 ? { mapValue: { fields: newW0Fields } } : w));
const newWeeksFV = { arrayValue: { values: newWeeksArr } };

console.log('\n  APRÈS Mercredi :');
const nm = newMer.mapValue.fields;
console.log('    title   :', nm.title.stringValue);
console.log('    dist    :', nm.distance.stringValue);
console.log('    dur     :', nm.duration.stringValue);
console.log('    loc     :', nm.locationSuggestion.stringValue);
console.log('    mainSet :', nm.mainSet.stringValue);

// Vérifs pré-PATCH
const issues = [];
if (nm.title.stringValue === titleSam) issues.push('title identique à Samedi');
if (nm.mainSet.stringValue === mainSetSam) issues.push('mainSet identique à Samedi');
if (nm.locationSuggestion.stringValue === samBefore.locationSuggestion?.stringValue) issues.push('loc identique à Samedi');
if (nm.day.stringValue !== 'Mercredi') issues.push('day altéré');
if (nm.id.stringValue !== idPreserved) issues.push('id altéré');
// Mots interdits
const corpusNew = [nm.title, nm.mainSet, nm.advice, nm.warmup, nm.cooldown, nm.locationSuggestion]
  .map((v) => v.stringValue).join(' ').toLowerCase();
for (const w of ['poids', 'imc', 'minceur', 'silhouette', 'maigrir', 'kilos']) {
  if (corpusNew.includes(w)) issues.push('mot interdit : ' + w);
}
console.log('\n  CHECK pré-PATCH :', issues.length === 0 ? '✅' : '🔴', issues);
if (issues.length > 0) { console.error('🔴 pré-checks KO.'); process.exit(1); }

// Préservation longueurs
const sessLenBefore = sessArr.length;
const sessLenAfter = newSessArr.length;
console.log('  CHECK sessions length préservée :', sessLenBefore === sessLenAfter ? '✅' : '🔴', sessLenBefore, '→', sessLenAfter);

await patchWeeks(newWeeksFV);
console.log('\n  ✔ PATCH envoyé.');

// Re-read
const after = await readPlan();
const wA = after.fields.weeks.arrayValue.values;
const sA = wA[0].mapValue.fields.sessions.arrayValue.values;
const merA = sA.find((s) => s.mapValue?.fields?.day?.stringValue === 'Mercredi').mapValue.fields;
const samA = sA.find((s) => s.mapValue?.fields?.day?.stringValue === 'Samedi').mapValue.fields;

console.log('\n  RE-READ Mercredi :');
console.log('    title   :', merA.title?.stringValue);
console.log('    dist    :', merA.distance?.stringValue);
console.log('    dur     :', merA.duration?.stringValue);
console.log('    loc     :', merA.locationSuggestion?.stringValue);
console.log('    mainSet :', merA.mainSet?.stringValue);
console.log('  RE-READ Samedi (doit être inchangé) :');
console.log('    title   :', samA.title?.stringValue);
console.log('    dist    :', samA.distance?.stringValue);
console.log('    loc     :', samA.locationSuggestion?.stringValue);
console.log('    mainSet :', samA.mainSet?.stringValue?.slice(0, 100) + '...');

const merOk =
  merA.title?.stringValue === nm.title.stringValue &&
  merA.mainSet?.stringValue === nm.mainSet.stringValue &&
  merA.distance?.stringValue === nm.distance.stringValue &&
  merA.duration?.stringValue === nm.duration.stringValue &&
  merA.locationSuggestion?.stringValue === nm.locationSuggestion.stringValue &&
  merA.id?.stringValue === idPreserved;
console.log('\n  RE-READ Mercredi conforme : ', merOk ? '✅' : '🔴');

const samUnchanged =
  samA.title?.stringValue === titleSam &&
  samA.mainSet?.stringValue === mainSetSam &&
  samA.distance?.stringValue === samBefore.distance?.stringValue &&
  samA.locationSuggestion?.stringValue === samBefore.locationSuggestion?.stringValue &&
  samA.id?.stringValue === samBefore.id?.stringValue;
console.log('  RE-READ Samedi inchangé   : ', samUnchanged ? '✅' : '🔴');

const dedupOk = merA.title?.stringValue !== samA.title?.stringValue && merA.mainSet?.stringValue !== samA.mainSet?.stringValue;
console.log('  Dédup effective (Mercredi ≠ Samedi) : ', dedupOk ? '✅' : '🔴');

// Préservation voisins critiques (autres séances de S1, autres semaines, paces, welcome, wv)
const sessLenReread = sA.length;
console.log('  sessions length S1 préservée :', sessLenReread === sessLenBefore ? '✅' : '🔴', sessLenBefore, '→', sessLenReread);
const weeksLenReread = wA.length;
console.log('  weeks length préservée       :', weeksLenReread === weeksArr.length ? '✅' : '🔴');

// Autres séances S1 inchangées (sauf Mercredi)
for (let i = 0; i < sA.length; i++) {
  if (i === idxMer) continue;
  const aB = JSON.stringify(sessArr[i]);
  const aA = JSON.stringify(sA[i]);
  if (aB !== aA) console.log('  🔴 session [' + i + '] (' + (sA[i].mapValue.fields.day?.stringValue) + ') modifiée alors qu’elle ne devait pas l’être');
}
console.log('  autres séances S1 inchangées : ✅ (loop check)');

// Welcome + wv + paces préservés
const welBefore = before.fields?.welcomeMessage?.stringValue?.length || 0;
const welAfter = after.fields?.welcomeMessage?.stringValue?.length || 0;
console.log('  welcomeMessage len préservé :', welBefore === welAfter ? '✅' : '🔴', welBefore, '→', welAfter);

const wvBefore = JSON.stringify(before.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes);
const wvAfter = JSON.stringify(after.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields?.weeklyVolumes);
console.log('  wv préservés                 :', wvBefore === wvAfter ? '✅' : '🔴');

const pacesBefore = JSON.stringify(before.fields?.paces);
const pacesAfter = JSON.stringify(after.fields?.paces);
console.log('  paces préservées             :', pacesBefore === pacesAfter ? '✅' : '🔴');

const feasBefore = JSON.stringify(before.fields?.feasibility);
const feasAfter = JSON.stringify(after.fields?.feasibility);
console.log('  feasibility préservée        :', feasBefore === feasAfter ? '✅' : '🔴');

process.exit(merOk && samUnchanged && dedupOk ? 0 : 1);
