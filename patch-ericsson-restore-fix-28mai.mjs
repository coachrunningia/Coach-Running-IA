#!/usr/bin/env node
/**
 * patch-ericsson-restore-fix-28mai.mjs
 *
 * Patch live ericsson777@hotmail.com (1779998376847) — Marathon 3h20 24 sem :
 *
 * 1. S1 reconstruite : 6 séances Marathon Expert (était 1 séance buggée par
 *    truncate Gemini)
 * 2. weeklyVolumes mis à jour : pic 75 km/sem (était 90 km dépassant doctrine MAX)
 * 3. welcomeMessage refait court et propre (sans surcharge F-18 +800 tokens)
 * 4. Restore userId original (lève safety lock posé à 22:10:01)
 *
 * Doctrines :
 * - feedback_securite_avant_conversion ✓ (volumes safe, doctrine respectée)
 * - feedback_patch_live_plans_jour_seulement ✓ (S1 démarre 22/06, pas commencée)
 * - feedback_chaque_ligne_justifiee ✓ (justifs dans script + commit)
 * - feedback_jamais_contact_client ✓ (patch silencieux)
 *
 * Usage :
 *   DRY RUN  : node patch-ericsson-restore-fix-28mai.mjs
 *   EXEC     : DRY_RUN=false node patch-ericsson-restore-fix-28mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779998376847';
const EXPECTED_EMAIL = 'ericsson777@hotmail.com';
const ORIGINAL_USER_ID = 'iDawDSv2qWgpJZicGSLzXy7VBXS2';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-bug-s1-1seance-28mai-backups-fix-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

// ────────────────────────────────────────────────
// CONTENT — validé Romane 28/05/2026 22:45
// ────────────────────────────────────────────────

const NEW_WEEKLY_VOLUMES = [60, 67, 75, 60, 69, 71, 75, 60, 69, 71, 75, 60, 69, 71, 75, 60, 69, 71, 75, 60, 69, 50, 44, 38];

const NEW_WELCOME = `Bienvenue dans ta préparation pour ton Marathon en 3h20 le 6 décembre.

Ton profil (VMA 15.7, Semi 1h31, Marathon 3h35) est solide et ton objectif 3h20 est cohérent — temps théorique ≈ 3h21. Plan de 24 semaines structuré pour t'amener serein le jour J.

📊 Pic plan : 75 km/sem (S3, S7, S11, S15, S19). Récup tous les 4 sem. Affûtage S22→S24 progressif (50/44/38).

⚠️ À 50 ans, on te conseille vivement :
- Test d'effort + certificat médical avant de commencer
- 48-72h de récup entre séances intenses (VMA, seuil, SL longue)
- Échauffement systématique 20 min + gammes
- Renfo Mercredi : ton meilleur garde-fou contre les blessures

Bonne préparation. On est là si besoin.`;

const sid = (n) => `w1-s${n}-${PLAN_ID}-${Math.random().toString(36).slice(2, 9)}`;

const NEW_S1_SESSIONS = [
  // 1. Lundi 22/06 — Footing EF
  {
    id: sid(1),
    day: 'Lundi',
    type: 'Jogging',
    title: 'Footing endurance fondamentale',
    intensity: 'Facile',
    distance: '12 km',
    duration: '1h 08 min',
    targetPace: '5:42',
    warmup: '5 min marche puis transition vers le footing.',
    mainSet: "12 km en endurance fondamentale (5:42 min/km). Allure conversation, respiration calme et nasale. Termine par 4 à 5 lignes droites souples de 80 m sur surface plate pour réveiller la chaîne neuromusculaire.",
    cooldown: '5 min de marche + étirements légers chaîne postérieure.',
    advice: "L'EF construit ton capital aérobie sans agresser les tendons. Reste strictement dans la zone : tu dois pouvoir parler en phrases complètes."
  },
  // 2. Mardi 23/06 — VMA courte
  {
    id: sid(2),
    day: 'Mardi',
    type: 'VMA',
    title: 'VMA courte 8×400m',
    intensity: 'Difficile',
    distance: '10 km',
    duration: '1h 00 min',
    targetPace: '3:49',
    warmup: '20 min footing EF (5:42) puis gammes athlétiques (talons-fesses, montées de genoux, pas chassés, foulées bondissantes, 2×30 m par exercice) + 4 lignes droites accélérées.',
    mainSet: "8 × 400 m à allure VMA (3:49 min/km, soit ≈ 1'32\"/400 m), récupération 1'30 en trot lent (6:22). Maintiens une foulée souple et l'allure constante sur tous les blocs — pas plus vite sur les premiers.",
    cooldown: '10 min footing EF (5:42) + étirements légers, hydratation.',
    advice: "L'objectif est la régularité, pas le record. Si tu craques après le 6e bloc, lève le pied — meilleure adaptation tissulaire qu'un dernier bloc forcé."
  },
  // 3. Mercredi 24/06 — Renforcement
  {
    id: sid(3),
    day: 'Mercredi',
    type: 'Renforcement',
    title: 'Renfo gainage + chaîne postérieure',
    intensity: 'Modéré',
    distance: '0 km',
    duration: '45 min',
    targetPace: '-',
    warmup: '5 min mobilité articulaire (cercles épaules, hanches, chevilles).',
    mainSet: "3 tours en circuit, 30 sec de transition entre exercices : 1 min planche faciale, 12 squats lents tempo 3:1, 10 fentes avant par jambe, 10 ponts fessiers, 10 superman (extension dorsale). Repos 2 min entre les tours.",
    cooldown: '5 min étirements actifs chaîne postérieure (ischios, fessiers, mollets).',
    advice: "Le renfo est ton meilleur assurance anti-blessure à 50 ans. Ne le saute jamais — gainage fort = bassin stable = moins de surcharges genou/hanche."
  },
  // 4. Jeudi 25/06 — Footing EA (endurance active)
  {
    id: sid(4),
    day: 'Jeudi',
    type: 'Jogging',
    title: 'Footing endurance active',
    intensity: 'Modéré',
    distance: '10 km',
    duration: '50 min',
    targetPace: '4:58',
    warmup: '10 min footing EF (5:42) pour amorcer.',
    mainSet: "10 km en endurance active (4:58 min/km). Allure soutenue mais aérobie : tu dois pouvoir parler par phrases courtes, pas en discussion fluide.",
    cooldown: '5 min footing très lent (6:22) + étirements légers.',
    advice: "L'EA travaille ton seuil aérobie. Tu dois finir avec la sensation d'avoir bossé sans être lessivé : si tu es 'cramé', c'est que tu as forcé en EA."
  },
  // 5. Vendredi 26/06 — Récup
  {
    id: sid(5),
    day: 'Vendredi',
    type: 'Récupération',
    title: 'Footing récupération',
    intensity: 'Facile',
    distance: '8 km',
    duration: '50 min',
    targetPace: '6:22',
    warmup: '5 min marche tranquille.',
    mainSet: "8 km en footing récupération (6:22 min/km), respiration nasale stricte. Objectif : drainer la fatigue de la VMA mardi avant la SL samedi. Allure très tranquille, technique propre.",
    cooldown: '5 min étirements doux + auto-massage mollets/quadriceps.',
    advice: "La récup active vaut mieux que le repos total entre 2 séances intenses. Tu rinces les déchets sans surcharger."
  },
  // 6. Samedi 27/06 — Sortie Longue
  {
    id: sid(6),
    day: 'Samedi',
    type: 'Sortie Longue',
    title: 'Sortie longue 22 km EF',
    intensity: 'Modéré',
    distance: '22 km',
    duration: '2h 05 min',
    targetPace: '5:42',
    warmup: '5 min marche puis 10 min footing très lent pour amorcer (6:10).',
    mainSet: "22 km en endurance fondamentale (5:42 min/km). Bois 200 ml avant départ. Prends 1 gel énergétique à la 70e minute. Termine en restant propre techniquement (pas de tassement de foulée).",
    cooldown: '5 min marche + étirements complets quadriceps, ischios, mollets, fessiers.',
    advice: "Premier SL du plan : objectif endurance, pas chrono. Si tu dois ralentir sur les 5 derniers km, c'est OK — meilleur que de finir cassé."
  }
];

const NEW_WEEK_1 = {
  weekNumber: 1,
  phase: 'fondamental',
  theme: 'Mise en route et développement de la base aérobie',
  weekGoal: 'Mise en route et développement de la base aérobie',
  sessions: NEW_S1_SESSIONS
};

// ────────────────────────────────────────────────
// CONVERT JS objects → Firestore format
// ────────────────────────────────────────────────

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toFirestoreValue(vv)])) } };
  }
  throw new Error(`Unsupported value type: ${typeof v}`);
}

// ────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────

console.log(`>>> Patch ericsson restore + fix — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups : ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan ericsson introuvable');

writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
console.log(`✓ Backup OK`);

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ userId AVANT : ${f.userId?.stringValue}`);

// Build new generationContext.periodizationPlan (only weeklyVolumes changes; restore rest)
const currentGenCtx = doc.fields.generationContext?.mapValue?.fields || {};
const currentPeriodPlan = currentGenCtx.periodizationPlan?.mapValue?.fields || {};
const newPeriodPlan = {
  ...currentPeriodPlan,
  weeklyVolumes: toFirestoreValue(NEW_WEEKLY_VOLUMES),
};
const newGenCtx = { ...currentGenCtx, periodizationPlan: { mapValue: { fields: newPeriodPlan } } };

// Build update
const updates = {
  fields: {
    userId: { stringValue: ORIGINAL_USER_ID },                          // RESTORE pause
    _originalUserId: { stringValue: '' },                               // Clear pause meta
    _pausedAt: { stringValue: '' },
    _pausedReason: { stringValue: '' },
    welcomeMessage: { stringValue: NEW_WELCOME },                       // NEW welcome
    weeks: toFirestoreValue([NEW_WEEK_1]),                              // NEW S1 (6 sessions)
    generationContext: { mapValue: { fields: newGenCtx } },             // NEW weeklyVolumes
  },
};

const updateMask = ['userId', '_originalUserId', '_pausedAt', '_pausedReason', 'welcomeMessage', 'weeks', 'generationContext'];
const updateUrl = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
const tmp = `/tmp/patch-ericsson-fix-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`\n=== PATCH SUMMARY ===`);
console.log(`  userId : ${f.userId?.stringValue} → ${ORIGINAL_USER_ID}`);
console.log(`  welcomeMessage : ${NEW_WELCOME.length} chars (était ${f.welcomeMessage?.stringValue?.length || '?'})`);
console.log(`  weeks[0].sessions : 1 → 6`);
console.log(`  weeklyVolumes pic : 90 → 75 km`);
console.log(`  S1 total : 14.6 km → ${NEW_S1_SESSIONS.reduce((s, x) => s + (parseFloat(x.distance) || 0), 0)} km`);
console.log(`  S1 sessions :`);
NEW_S1_SESSIONS.forEach((s, i) => console.log(`    [${i + 1}] ${s.day} ${s.type} ${s.distance} ${s.duration} @${s.targetPace}`));

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-ericsson-restore-fix-28mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
console.log(`✅ userId APRÈS : ${res.fields?.userId?.stringValue}`);
console.log(`✅ Plan ericsson restauré + fixé.`);
