/**
 * Patch en Firebase le plan Perte de Poids 1778521479387 avec la v2 corrigée.
 * Backup automatique avant. Conserve generationContext, userId, paces, etc.
 */
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PLAN_ID = '1778521479387';
const PROJECT = 'coach-running-ia';
const DRY_RUN = process.argv.includes('--dry-run');

// === Auth via gcloud (token avec scope cloud-platform pour écriture Firestore) ===
import { execSync } from 'child_process';
let access_token;
try {
  access_token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf-8' }).trim();
} catch (e) {
  console.error('❌ Erreur gcloud auth print-access-token. Assure-toi que tu es loggé avec un compte ayant accès au projet coach-running-ia.');
  process.exit(1);
}

// === Backup ===
console.log(`📦 Backup du doc actuel...`);
const original = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
}).then(r => r.json());
writeFileSync(`backup-plan-${PLAN_ID}-${Date.now()}.json`, JSON.stringify(original, null, 2));
console.log(`✓ Backup écrit`);

// === Plan v5 — 12 sem, freq 3 = 2 course (Mar+Dim) + 1 RENFO (Jeu) — pic 28 km ===
// Volume adapté à un VRAI plan perte de poids (durée Z2, pas accumulation km)
const planV2 = [
  { phase: 'fondamental', theme: 'Démarrage en aisance respiratoire', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 8, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 12, pace: '5:32 min/km' },
  ]}, // 20
  { phase: 'fondamental', theme: 'Construction du volume aérobie', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 9, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 14, pace: '5:32 min/km' },
  ]}, // 23
  { phase: 'fondamental', theme: 'Consolidation et endurance', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 10, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 15, pace: '5:32 min/km' },
  ]}, // 25
  { phase: 'recuperation', theme: 'Semaine de décharge', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 7, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Facile', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 11, pace: '5:32 min/km' },
  ]}, // 18
  { phase: 'fondamental', theme: 'Relance du volume', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 9, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 14, pace: '5:32 min/km' },
  ]}, // 23
  { phase: 'fondamental', theme: 'Endurance prolongée', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 10, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 16, pace: '5:32 min/km' },
  ]}, // 26
  { phase: 'fondamental', theme: 'Introduction du tempo continu', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Modéré', km: 10, pace: 'EF 5:32 + 3×5\' tempo 4:22 (86% VMA) R=2\'' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 16, pace: '5:32 min/km' },
  ]}, // 26
  { phase: 'recuperation', theme: 'Semaine de décharge', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 8, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Facile', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 13, pace: '5:32 min/km' },
  ]}, // 21
  { phase: 'developpement', theme: 'Développement aérobie avec tempo', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Modéré', km: 10, pace: 'EF 5:32 + 4×4\' tempo 4:22 R=1\'30' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 15, pace: '5:32 min/km' },
  ]}, // 25
  { phase: 'developpement', theme: 'Tempo allongé + SL', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Modéré', km: 11, pace: 'EF 5:32 + 5×3\'30 tempo 4:22 R=1\'' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 16, pace: '5:32 min/km' },
  ]}, // 27
  { phase: 'developpement', theme: 'Pic du plan — endurance + qualité', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Modéré', km: 11, pace: 'EF 5:32 + tempo continu 15 min à 4:22' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Modéré', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Modéré', km: 17, pace: '5:32 → 5:00 (progressif)' },
  ]}, // 28
  { phase: 'recuperation', theme: 'Régénération et clôture cycle', sessions: [
    { day: 'Mardi', type: 'Jogging', intensity: 'Facile', km: 8, pace: '5:32 min/km' },
    { day: 'Jeudi', type: 'Renforcement', intensity: 'Facile', km: 0, pace: '-' },
    { day: 'Dimanche', type: 'Sortie Longue', intensity: 'Facile', km: 13, pace: '5:32 min/km' },
  ]}, // 21
];

// === Helpers pour calcul durée cohérente ===
function durationFromKmPace(km, paceStr) {
  if (km === 0) return null;
  // extract first pace match like "5:32"
  const m = String(paceStr).match(/(\d+):(\d+)/);
  if (!m) return null;
  const paceSec = parseInt(m[1]) * 60 + parseInt(m[2]);
  const totalSec = km * paceSec;
  const h = Math.floor(totalSec / 3600);
  const min = Math.round((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${String(min).padStart(2,'0')} min`;
  return `${min} min`;
}

// === Construction des séances ===
function buildSession(s, weekNum, sessionIdx, baseTs) {
  const id = `w${weekNum}-s${sessionIdx}-${baseTs + weekNum * 1000 + sessionIdx}`;
  const distance = s.km > 0 ? `${s.km} km` : '0 km';
  const duration = s.km > 0 ? durationFromKmPace(s.km, s.pace) : '45 min';

  let warmup, mainSet, cooldown, title, advice, locationSuggestion;
  const isProgressive = String(s.pace).includes('progressif') || String(s.pace).includes('→');
  const isTempo = s.type === 'Tempo';

  if (s.type === 'Renforcement') {
    title = weekNum % 2 === 0 ? 'Renfo Compound — Bas du corps + gainage' : 'Renfo Compound — Full body force';
    warmup = '10 min mobilité dynamique : cercles hanches, jambes pendulaires, fentes marchées, montées de genoux';
    mainSet = weekNum % 2 === 0
      ? 'Circuit force lente, 4 tours, repos 90s entre tours : Squats lestés (12 reps), Soulevé de terre roumain (10 reps), Fentes bulgares (8/jambe), Pont fessier 1 jambe (12/côté), Gainage planche (45s) + planche latérale (30s/côté).'
      : 'Circuit full body, 3 tours, repos 90s : Tractions assistées (8 reps) ou rowing inversé, Pompes lestées (10 reps), Squats avec saut (10 reps — uniquement si jambes fraîches), Mountain climbers (40s), Gainage dynamique (1 min).';
    cooldown = '5 min étirements ciblés : ischio-jambiers, quadriceps, mollets, fessiers, ouverture hanches';
    advice = 'La force lente compound préserve la masse maigre essentielle pour la perte de poids. La qualité d\'exécution prime sur la quantité. 1 séance/semaine est suffisant — pas besoin d\'en faire plus.';
    locationSuggestion = 'À la maison ou en salle de sport';
  } else if (isTempo) {
    title = s.km > 13 ? `Séance Tempo continu — ${s.km} km dont qualité` : `Tempo continu — ${s.km} km`;
    warmup = '20 min EF à 5:32 min/km + 4 lignes droites progressives de 80m';
    mainSet = String(s.pace).includes('5×4')
      ? '5 × 4 min à allure tempo (4:22 min/km, 86 % VMA), récupération 1 min trottinée entre chaque. Effort soutenu mais contrôlé — conversation impossible mais respiration sous contrôle.'
      : `Tempo continu de 15-20 min à 4:22 min/km (allure semi). Garder cadence régulière, ne pas accélérer en fin.`;
    cooldown = '10 min retour au calme à 6:11 min/km + étirements légers (ischios, mollets)';
    advice = 'L\'allure tempo (~86 % VMA) est la zone idéale pour développer l\'économie de course tout en restant en aérobie. Pour la perte de poids, cette séance casse la monotonie aérobie pure et apporte un stimulus métabolique additionnel.';
    locationSuggestion = 'Parcours plat de Saint-Pierre-de-Côle — éviter les chemins trop techniques';
  } else if (s.type === 'Sortie Longue') {
    const isPrincipale = s.day === 'Dimanche';
    title = isProgressive
      ? `Sortie Longue progressive — ${s.km} km`
      : isPrincipale ? `Sortie Longue principale — ${s.km} km` : `Sortie Longue molle — ${s.km} km`;
    warmup = '10 min de marche active puis 5 min footing très léger pour amorcer';
    mainSet = isProgressive
      ? `Sortie progressive : ${Math.round(s.km * 0.7)} km à 5:32 min/km (EF) puis ${Math.round(s.km * 0.3)} km descendants progressivement vers 5:00 min/km. Ne pas forcer — c'est la durée qui compte, pas la vitesse.`
      : isPrincipale
        ? `Allure stable à 5:32 min/km (EF, 70 % VMA). Conversation possible mais légèrement gênée. ${s.km}km en aisance — visez la régularité.`
        : `Allure très facile à 5:32-6:00 min/km (60-70 % VMA). C'est une 2e sortie longue MOLLE — durée prime sur intensité. Marche/course autorisée si jambes lourdes.`;
    cooldown = '10 min marche active + étirements complets (mollets, ischios, quadriceps, fessiers, hanches)';
    advice = 'La sortie longue est LE pilier de ce plan. Pour la perte de poids, la durée en zone aérobie maximise l\'oxydation lipidique. Hydratation toutes les 20 min, gel optionnel après 1h15.';
    locationSuggestion = 'Sentiers de la campagne de Saint-Pierre-de-Côle, ou boucle vallonnée si envie de variété';
  } else { // Jogging EF
    title = `Footing EF — ${s.km} km`;
    warmup = '5 min de marche active + 5 min footing très léger';
    mainSet = `${s.km}km à 5:32 min/km (EF, 70 % VMA). Cadence relâchée, respiration nasale possible. Optionnel : 4×100m lignes droites en fin de séance.`;
    cooldown = '5 min retour au calme + étirements légers (mollets, ischios, hanches)';
    advice = 'Le footing EF est la base du plan. Pas d\'objectif d\'allure — privilégie la sensation. Le renforcement dédié du Jeudi complète ce travail aérobie.';
    locationSuggestion = 'Boucle plate aux alentours de Saint-Pierre-de-Côle';
  }

  return {
    id,
    day: s.day,
    type: s.type === 'Tempo' ? 'Jogging' : s.type, // garder typage compatible avec UI (le mainSet décrit le tempo)
    intensity: s.intensity,
    distance,
    duration,
    targetPace: s.pace !== '-' ? s.pace : '',
    title,
    warmup,
    mainSet,
    cooldown,
    advice,
    locationSuggestion,
    elevationGain: 0,
  };
}

// === Construction des 12 semaines ===
const baseTs = Date.now();
const newWeeks = planV2.map((w, idx) => ({
  weekNumber: idx + 1,
  phase: w.phase,
  theme: w.theme,
  sessions: w.sessions.map((s, sidx) => buildSession(s, idx + 1, sidx + 1, baseTs)),
}));

// === welcomeMessage v2 ===
const welcomeMessageV2 = `Bienvenue dans ton programme de 12 semaines pour la perte de poids — version révisée.

Volume cible : 20 à 28 km/sem (≈ 2h à 2h30 de course par semaine). Ton profil de coureur expérimenté (Marathon 3h10, VMA 16.2 km/h) supporte largement ce volume sans risque. Pour la perte de poids, la **durée en zone aérobie** (oxydation des graisses) prime sur l'accumulation de kilomètres — d'où ce volume contenu mais régulier.

**Important pour la perte de poids :** la course seule suffit rarement à perdre du poids significativement. Vise un déficit calorique de 300 à 500 kcal par jour via l'alimentation (légèrement moins manger, pas drastique). Sans cela, l'entraînement seul produira peu de résultats sur la balance, même si tes performances et ton bien-être progresseront.

**Structure du plan (3 séances/sem, Mardi/Jeudi/Dimanche) :**
- **Mardi** : footing EF — base aérobie (puis intervalles tempo à partir de la S7)
- **Jeudi** : renforcement compound (45 min — squat, soulevé de terre, fentes, gainage) — préserve ta masse maigre, clé pour la perte de poids
- **Dimanche** : sortie longue — pilier du plan, durée en zone aérobie pour oxydation lipidique
- Décharges en S4 et S8 (cycle 3+1)
- Pas d'affûtage : programme glissant renouvelable

Bon entraînement.`;

// === Affichage avant push ===
console.log(`\n📋 Plan v2 résumé:`);
newWeeks.forEach(w => {
  const vol = w.sessions.reduce((s, x) => s + (parseFloat(String(x.distance).replace(/[^0-9.]/g, '')) || 0), 0);
  console.log(`  S${w.weekNumber.toString().padStart(2)} ${w.phase.padEnd(14)} ${vol.toFixed(0).padStart(3)}km — ${w.theme}`);
});
const totalKm = newWeeks.reduce((s, w) => s + w.sessions.reduce((ss, x) => ss + (parseFloat(String(x.distance).replace(/[^0-9.]/g, '')) || 0), 0), 0);
console.log(`\nTotal: ${totalKm.toFixed(0)} km sur 12 sem`);

// === Conversion vers format Firestore ===
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = toFs(val);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

const fsWeeks = toFs(newWeeks);
const fsMsg = toFs(welcomeMessageV2);

if (DRY_RUN) {
  writeFileSync('preview-plan-v2.json', JSON.stringify({ weeks: newWeeks, welcomeMessage: welcomeMessageV2 }, null, 2));
  console.log(`\n🔍 DRY-RUN — preview écrit dans preview-plan-v2.json`);
  console.log(`   Aucune modification Firebase. Pour pousser : node patch-perte-de-poids.mjs (sans --dry-run)`);
  process.exit(0);
}

// === PATCH Firebase ===
console.log(`\n🚀 Push vers Firebase plans/${PLAN_ID}...`);
const updateBody = {
  fields: {
    weeks: fsWeeks,
    welcomeMessage: fsMsg,
  },
};
const updateMask = 'updateMask.fieldPaths=weeks&updateMask.fieldPaths=welcomeMessage';
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}?${updateMask}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(updateBody),
});
if (!res.ok) {
  console.error(`❌ Erreur ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`✓ Plan mis à jour avec succès`);
console.log(`📂 Backup disponible : backup-plan-${PLAN_ID}-*.json`);
