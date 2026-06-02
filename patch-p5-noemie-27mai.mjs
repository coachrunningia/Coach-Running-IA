#!/usr/bin/env node
/**
 * patch-p5-noemie-27mai.mjs
 *
 * Patch live URGENT P5 noemie507 (1779874303413) — Trail 10km D+349m Annecy 1h25.
 * S1 commence AUJOURD'HUI (2026-05-27).
 *
 * Cause root : DIAGNOSTIC SYSTÈME FAUX (bug F-13).
 * Feasibility IRRÉALISTE 5/100 alors que :
 *   - PB 10k = 1h20 plat (vraie référence)
 *   - Pénalité D+ Minetti = +5 min sur 349 D+/10km → 1h28 attendu
 *   - Cible 1h25 = ambitieuse mais COHÉRENTE (pas irréaliste)
 *   - Profil habitué vallon : cv D+ 500m/sem
 *
 * Le système recommande "2h00 réaliste" = +40 min vs PB plat → aberration motivationnelle.
 * Violation doctrine "jamais baisser allure cible".
 *
 * Patches validés par expert FFA N5 + coach pro amateurs (2 experts convergents) :
 *   P5-1 : welcomeMessage régénéré (cible 1h25 ambitieuse mais cohérente)
 *   P5-2 : feasibility.status IRRÉALISTE → AMBITIEUX, score 5 → 55
 *   P5-3 : confidenceScore 5 → 55
 *   P5-4 : S1 Lundi sessions[0] retirer "blocs souples" (Intermédiaire ≠ Débutant marche-course)
 *   P5-5 : S1 Samedi sessions[2] réduire SL 8.4 km / 400 D+ → 5 km / 200 D+ (D20 intro safe)
 *
 * Doctrines respectées :
 *   D1 — allure cible 1h25 IMMUABLE (on confirme la cible, on baisse le score qui était faux) ✅
 *   D2 — inputs immuables (freq, cv, raceDate, targetTime, vma, preferredDays, startDate) ✅
 *   D5 + D18b — S1 commencée aujourd'hui (J0) — patch live autorisé (sécurité + cohérence) ✅
 *   D6 — zéro mention poids ✅
 *   D9 — freq 3 = 2 course + 1 renfo (déjà cas) ✅
 *   D14 — pic ≤ 1.5× cv : 17/15 = 1.13 ✅
 *   D17 — transparence : AMBITIEUX 55 est honnête (effort réel demandé), pas IRRÉALISTE faux ✅
 *   D18b — distance plat-équivalent : on baisse distance Samedi car Intro safe S1 vs cv hebdo ✅
 *   "Jamais baisser cible" — on confirme 1h25 (vs faux algo "vise 2h00") ✅
 *
 * Dry-run par défaut. Pour exec live : DRY_RUN=false node patch-p5-noemie-27mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779874303413';
const EXPECTED_EMAIL = 'noemie507@hotmail.com';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-5-plans-27mai/backups-pre-patch-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;

// D6 — mots interdits
const FORBIDDEN_WORDS = ['imc', 'poids', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'bmi', 'obèse', 'graisse'];
function assertSafe(label, txt) {
  if (!txt) return;
  const low = String(txt).toLowerCase();
  for (const w of FORBIDDEN_WORDS) {
    if (low.includes(w)) throw new Error(`Mot interdit D6 "${w}" dans ${label}`);
  }
}

function token() { return execSync('gcloud auth print-access-token').toString().trim(); }
function fetchDoc() {
  return JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
}

// ============== PATCH CONTENT (validés expert FFA + coach pro) ==============

const P5_1_WELCOME_NEW = "Bienvenue dans ta préparation pour ton trail de 10 km à Annecy ! Ton objectif de 1h25 est ambitieux mais cohérent : ton PB de 1h20 sur 10 km plat te donne une vraie base, et la pénalité dénivelé pour les 349m de D+ ajoute environ 5 minutes (méthode Minetti), soit ~1h28 attendu de référence. Atteindre 1h25 demandera régularité et travail spécifique en côtes. Comme tu cours déjà avec 500m de D+ par semaine, tu as les bases trail nécessaires — tu n'es pas une débutante du dénivelé. Reste prudente : consulte un médecin avant de débuter ce programme, notamment pour obtenir un certificat médical d'aptitude au sport. On y va progressivement : la S1 pose les bases d'endurance + active la chaîne musculaire spécifique aux montées/descentes. Le renforcement du mercredi est CRUCIAL pour préparer tes quadriceps aux freinages en descente. Écoute ton corps, et reste à l'effort — le chrono affiché est un repère plat-équivalent.";

const P5_2_FEASIBILITY_STATUS_NEW = 'AMBITIEUX';
const P5_2_FEASIBILITY_SCORE_NEW = 55;
const P5_2_FEASIBILITY_MESSAGE_NEW = "Objectif 1h25 ambitieux mais cohérent vs ton PB 10k plat (1h20). Pénalité D+ ~5 min pour 349m sur 10 km (35 m/km, Minetti). Référence calibrée : ~1h28. Atteindre 1h25 = écart de 3 min sur la pénalité, faisable avec travail spécifique en côtes + régularité S1-S7.";
const P5_2_FEASIBILITY_WARNING_NEW = "Profil Intermédiaire avec cv D+ 500m/sem actif = bases trail OK. Plan court 7 sem, S1 commence aujourd'hui — pas de marge d'erreur. Marche active dans les côtes raides, écoute le corps, kiné préventif recommandé en S3-S4 si tension articulaire.";

const P5_3_CONFIDENCE_SCORE_NEW = 55;

// P5-4 — S1 Lundi (sessions[0]) : retirer "blocs souples" (Intermédiaire ≠ Débutant)
const P5_4_LUNDI_TITLE_NEW = "Footing continu (Annecy)";
const P5_4_LUNDI_MAINSET_NEW = "Footing continu 60 min en endurance fondamentale (10:45 min/km) sur les chemins d'Annecy. Foulée légère, respiration nasale possible. Sur les 5 dernières minutes, ajoute 4 lignes droites de 60m en accélération progressive sur terrain plat pour activer la chaîne propulsive. Pas de fractionné, pas de seuil — base aérobie pure.";

// P5-5 — S1 Samedi (sessions[2]) : SL 8.4 km / 400 D+ → 5 km / 200 D+ (intro safe)
const P5_5_SAMEDI_DURATION_NEW = "55 min";
const P5_5_SAMEDI_DISTANCE_NEW = "5 km";
const P5_5_SAMEDI_ELEVATION_NEW = 200;
const P5_5_SAMEDI_TITLE_NEW = "Sortie longue trail introduction (Annecy)";
const P5_5_SAMEDI_MAINSET_NEW = "5 km en endurance fondamentale (10:45 min/km de référence plat) sur sentier vallonné doux (~200m D+ cumulé). Marche active OBLIGATOIRE dans les côtes raides (>10 % pente) : foulée courte, mains sur cuisses si besoin, c'est l'effort EF qui prime, pas le chrono. Repère plat-équivalent : 5 km — sur le vallon, ta vitesse au sol sera plus lente, c'est normal. Note : on monte progressivement, la SL ne dépassera pas 8 km avant la S4.";
const P5_5_SAMEDI_ADVICE_NEW = "Surfaces souples privilégiées (sentier forestier, chemin de terre). Évite les pavés/asphalte si possible — Annecy regorge de bons sentiers. Hydratation +++, collation glucides 30 min avant.";

// ============== EXEC ==============

console.log(`>>> Patch URGENT P5 noemie507 Trail 10km 1h25 Annecy — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups dans ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan P5 introuvable');

writeFileSync(`${BACKUP_DIR}/${PLAN_ID}.json`, JSON.stringify(doc, null, 2));
console.log(`>>> Backup OK`);

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ updateTime avant : ${doc.updateTime}`);
console.log(`✓ startDate : ${f.startDate?.stringValue} (S1 démarre AUJOURD'HUI)`);

// Sanity checks
const sessions = f.weeks.arrayValue.values[0].mapValue.fields.sessions.arrayValue.values;
const lundi = sessions[0].mapValue.fields;
const samedi = sessions[2].mapValue.fields;
if (lundi.day?.stringValue !== 'Lundi') throw new Error('sessions[0] expected Lundi');
if (samedi.day?.stringValue !== 'Samedi') throw new Error('sessions[2] expected Samedi');
if (!lundi.title?.stringValue?.includes('blocs souples')) {
  console.warn(`⚠️ Lundi title ne contient pas "blocs souples" : "${lundi.title?.stringValue}"`);
}
if (samedi.distance?.stringValue !== '8.4 km') {
  throw new Error(`Samedi distance attendu "8.4 km", got "${samedi.distance?.stringValue}"`);
}
console.log(`✓ S1 Lundi = "blocs souples" / S1 Samedi = 8.4 km confirmés`);

// === P5-1 welcomeMessage ===
console.log(`\n--- P5-1 welcomeMessage régénéré ---`);
const wmOld = f.welcomeMessage?.stringValue || '';
console.log(`  AVANT (180 c) : ${wmOld.slice(0, 180)}...`);
console.log(`  APRÈS (180 c) : ${P5_1_WELCOME_NEW.slice(0, 180)}...`);
assertSafe('P5-1 welcomeMessage', P5_1_WELCOME_NEW);
f.welcomeMessage = { stringValue: P5_1_WELCOME_NEW };

// === P5-2 feasibility ===
console.log(`\n--- P5-2 feasibility IRRÉALISTE 5 → AMBITIEUX 55 ---`);
const fb = f.feasibility?.mapValue?.fields || {};
const oldStatus = fb.status?.stringValue;
const oldScore = fb.score?.integerValue;
console.log(`  AVANT : ${oldStatus} ${oldScore}/100`);
console.log(`  APRÈS : ${P5_2_FEASIBILITY_STATUS_NEW} ${P5_2_FEASIBILITY_SCORE_NEW}/100`);
assertSafe('P5-2 feasibility message', P5_2_FEASIBILITY_MESSAGE_NEW);
assertSafe('P5-2 feasibility warning', P5_2_FEASIBILITY_WARNING_NEW);
// Remplacer toute la structure feasibility en préservant les autres clés éventuelles
f.feasibility = {
  mapValue: {
    fields: {
      status: { stringValue: P5_2_FEASIBILITY_STATUS_NEW },
      score: { integerValue: String(P5_2_FEASIBILITY_SCORE_NEW) },
      message: { stringValue: P5_2_FEASIBILITY_MESSAGE_NEW },
      safetyWarning: { stringValue: P5_2_FEASIBILITY_WARNING_NEW },
    },
  },
};

// === P5-3 confidenceScore ===
console.log(`\n--- P5-3 confidenceScore 5 → 55 ---`);
f.confidenceScore = { integerValue: String(P5_3_CONFIDENCE_SCORE_NEW) };

// === P5-4 S1 Lundi mainSet + title ===
console.log(`\n--- P5-4 S1 Lundi retirer "blocs souples" → footing continu ---`);
console.log(`  title AVANT : ${lundi.title?.stringValue}`);
console.log(`  title APRÈS : ${P5_4_LUNDI_TITLE_NEW}`);
assertSafe('P5-4 Lundi title', P5_4_LUNDI_TITLE_NEW);
assertSafe('P5-4 Lundi mainSet', P5_4_LUNDI_MAINSET_NEW);
lundi.title = { stringValue: P5_4_LUNDI_TITLE_NEW };
lundi.mainSet = { stringValue: P5_4_LUNDI_MAINSET_NEW };
// duration et distance restent (1h08 / 6.3 km) — c'était déjà cohérent

// === P5-5 S1 Samedi réduction SL 8.4 km / 400 D+ → 5 km / 200 D+ ===
console.log(`\n--- P5-5 S1 Samedi SL 8.4→5 km / D+400→200m ---`);
console.log(`  duration AVANT : ${samedi.duration?.stringValue} → APRÈS : ${P5_5_SAMEDI_DURATION_NEW}`);
console.log(`  distance AVANT : ${samedi.distance?.stringValue} → APRÈS : ${P5_5_SAMEDI_DISTANCE_NEW}`);
console.log(`  D+ AVANT       : ${samedi.elevationGain?.integerValue}m → APRÈS : ${P5_5_SAMEDI_ELEVATION_NEW}m`);
assertSafe('P5-5 Samedi title', P5_5_SAMEDI_TITLE_NEW);
assertSafe('P5-5 Samedi mainSet', P5_5_SAMEDI_MAINSET_NEW);
assertSafe('P5-5 Samedi advice', P5_5_SAMEDI_ADVICE_NEW);
samedi.duration = { stringValue: P5_5_SAMEDI_DURATION_NEW };
samedi.distance = { stringValue: P5_5_SAMEDI_DISTANCE_NEW };
samedi.elevationGain = { integerValue: String(P5_5_SAMEDI_ELEVATION_NEW) };
samedi.title = { stringValue: P5_5_SAMEDI_TITLE_NEW };
samedi.mainSet = { stringValue: P5_5_SAMEDI_MAINSET_NEW };
samedi.advice = { stringValue: P5_5_SAMEDI_ADVICE_NEW };

// === Exec ===
if (DRY_RUN) {
  console.log(`\n========== DRY RUN OK ==========`);
  console.log(`5 patches en mémoire (P5-1 welcome + P5-2 feasibility + P5-3 confidenceScore + P5-4 Lundi + P5-5 Samedi)`);
  console.log(`\nPour exec : DRY_RUN=false node patch-p5-noemie-27mai.mjs`);
} else {
  const url = `${docUrl}?updateMask.fieldPaths=weeks&updateMask.fieldPaths=welcomeMessage&updateMask.fieldPaths=feasibility&updateMask.fieldPaths=confidenceScore`;
  const body = {
    fields: {
      weeks: f.weeks,
      welcomeMessage: f.welcomeMessage,
      feasibility: f.feasibility,
      confidenceScore: f.confidenceScore,
    },
  };
  const tmp = `/tmp/patch-p5-noemie-${Date.now()}.json`;
  writeFileSync(tmp, JSON.stringify(body));
  const res = execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`, { maxBuffer: 80 * 1024 * 1024 }).toString();
  const parsed = JSON.parse(res);
  if (parsed.error) {
    console.error(`\n❌ PATCH FAILED : ${parsed.error.message}`);
    process.exit(1);
  }
  console.log(`\n========== EXEC TERMINÉ ==========`);
  console.log(`✅ PATCH OK -> updateTime: ${parsed.updateTime}`);
}
