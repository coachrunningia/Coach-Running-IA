#!/usr/bin/env node
/**
 * patch-jeanluc-fix-28mai.mjs
 *
 * Patch live jeanlucpoint4@gmail.com (1779999888748) — Préparation 10 km 55 min,
 * 10 sem, 66 ans Confirmé VMA 11.9 cv 35 freq 4.
 *
 * Plan créé 28/05 20:24:49Z (22:24 Paris) = DANS LA FENÊTRE F-18 ACTIVE
 * (revert à 22:32). Bugs identifiés :
 *   - S1 = 4 séances (count OK) mais structure ANORMALE :
 *     - Mardi : type "Sortie Longue" + title "Footing technique" = incohérence LLM
 *     - 2 SL (Mar + Dim) au lieu de 1
 *     - AUCUNE séance VMA/Seuil (prep 10K Confirmé)
 *     - Samedi récup seul (pas de séance qualité)
 *   - weeklyVolumes OK (pic 41 km, cohérent 10K Conf MAX 55)
 *   - feasibility AMBITIEUX 60 OK
 *
 * Action : pause + reconstruction S1 = 4 séances cohérentes 10K Conf 66a :
 *   - Mar : Footing EF 8 km
 *   - Jeu : Renforcement (préservé existant)
 *   - Sam : VMA 8×400m (prep 10K spécifique)
 *   - Dim : Sortie Longue 12 km
 * Total 28 km ✓ (matches weeklyVolumes[0])
 *
 * Doctrines :
 * - feedback_securite_avant_conversion : prep 10K cohérente (VMA + SL essentiels)
 * - feedback_patch_live_plans_jour_seulement : S1 démarre Mar 2/06, pas vécue
 * - feedback_jamais_contact_client : patch silencieux
 *
 * Usage :
 *   DRY RUN : node patch-jeanluc-fix-28mai.mjs
 *   EXEC    : DRY_RUN=false node patch-jeanluc-fix-28mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779999888748';
const EXPECTED_EMAIL = 'jeanlucpoint4@gmail.com';
const ORIGINAL_USER_ID = '67FvOohTiaeU8xSaxJMSMGkxeA12';

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-bug-s1-1seance-28mai-backups-jeanluc-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = () => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "${docUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

function toFV(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFV) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toFV(vv)])) } };
  throw new Error(`Unsupported: ${typeof v}`);
}

function fromFV(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, vv]) => [k, fromFV(vv)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFV);
  return v;
}

// ────────────────────────────────────────────────
// CONTENT (validé Romane 28/05 ~minuit)
// ────────────────────────────────────────────────

const NEW_WELCOME = `Bienvenue dans ta préparation pour ton 10 km en 55 min le 1er août.

Avec ta VMA actuelle de 11.9 km/h (ton 10K en 56 min), ton objectif de 55 min est ambitieux mais accessible : on parle d'un gain de 1 minute soit ≈ 6 sec/km, gagnable avec 10 semaines de prépa spécifique.

📊 Pic plan : 41 km/sem (S3 et S7). Récup S4 et S8. Affûtage S10 à 21 km.

⚠️ À 66 ans, on te recommande vivement :
- Test d'effort + certificat médical avant de commencer
- 48h de récup entre séances intenses (VMA Samedi, SL Dimanche)
- Renfo Jeudi : prévention essentielle à ton âge
- Hydratation et sommeil non négociables

Le secret pour atteindre 55 min : régularité de la séance VMA Samedi + SL Dimanche en endurance pure (pas de tentation d'accélérer).

Bonne préparation. On est là si besoin.`;

const sid = (n) => `w1-s${n}-${PLAN_ID}-${Math.random().toString(36).slice(2, 9)}`;

const NEW_S1_SESSIONS = [
  // 1. Mardi 2/06 — Footing EF
  {
    id: sid(1),
    day: 'Mardi',
    type: 'Jogging',
    title: 'Footing endurance fondamentale',
    intensity: 'Facile',
    distance: '8 km',
    duration: '1h 00 min',
    targetPace: '7:31',
    warmup: '5 min marche puis transition vers le footing tranquille.',
    mainSet: "8 km en endurance fondamentale (7:31 min/km). Allure conversation, respiration nasale possible. Termine par 3-4 lignes droites souples de 80 m pour réveiller la chaîne neuromusculaire.",
    cooldown: '5 min marche + étirements légers chaîne postérieure.',
    advice: "L'EF construit ton capital aérobie sans agresser les tendons. À 66 ans, l'EF stricte (allure conversation maintenue) est ta meilleure assurance contre l'usure tissulaire."
  },
  // 2. Jeudi 4/06 — Renforcement
  {
    id: sid(2),
    day: 'Jeudi',
    type: 'Renforcement',
    title: 'Renforcement Quadriceps & Gainage',
    intensity: 'Modéré',
    distance: '0 km',
    duration: '40 min',
    targetPace: '-',
    warmup: '5 min mobilité articulaire (cercles épaules, hanches, chevilles).',
    mainSet: "3 tours en circuit, 30 sec de transition entre exercices : 1 min planche faciale, 12 squats lents tempo 3:1, 10 fentes avant par jambe, 10 ponts fessiers, 10 mountain climbers. Repos 2 min entre les tours.",
    cooldown: '5 min étirements actifs chaîne postérieure (ischios, fessiers, mollets).',
    advice: "À 66 ans, le renfo est ton meilleur assurance anti-blessure. Ne le saute jamais : gainage fort = bassin stable = moins de surcharges genou/hanche sur ton 10K."
  },
  // 3. Samedi 6/06 — VMA courte
  {
    id: sid(3),
    day: 'Samedi',
    type: 'VMA',
    title: 'VMA courte 8×400m',
    intensity: 'Difficile',
    distance: '8 km',
    duration: '55 min',
    targetPace: '5:02',
    warmup: "20 min footing EF (7:31) puis gammes athlétiques (talons-fesses, montées de genoux, pas chassés, 2×30 m chacun) + 4 lignes droites accélérées.",
    mainSet: "8 × 400 m à allure VMA (5:02 min/km, soit ≈ 2'01\\\"/400 m), récupération 1'30 en trot lent (8:24). Maintiens une foulée souple et l'allure constante sur tous les blocs — pas plus vite sur les premiers.",
    cooldown: '10 min footing EF (7:31) + étirements légers, hydratation.',
    advice: "À 66 ans Confirmé, la VMA reste essentielle pour préserver ton plafond aérobie et viser 55 min sur 10K. Reste régulier : si tu craques après le 6e bloc, lève le pied — meilleure adaptation qu'un dernier bloc forcé."
  },
  // 4. Dimanche 7/06 — Sortie Longue
  {
    id: sid(4),
    day: 'Dimanche',
    type: 'Sortie Longue',
    title: 'Sortie longue endurance fondamentale',
    intensity: 'Modéré',
    distance: '12 km',
    duration: '1h 30 min',
    targetPace: '7:31',
    warmup: '5 min marche puis 10 min footing très lent (8:00) pour amorcer.',
    mainSet: "12 km en endurance fondamentale (7:31 min/km). Bois 200 ml avant départ. Allure conversation maintenue tout au long. Termine en restant propre techniquement (pas de tassement de foulée).",
    cooldown: '5 min marche + étirements complets quadriceps, ischios, mollets, fessiers.',
    advice: "Premier SL du plan : objectif endurance, pas chrono. À 66 ans, la SL travaille ton oxydation des graisses + ton capital tendineux. Hydrate-toi bien après."
  }
];

const NEW_WEEK_1 = {
  weekNumber: 1,
  phase: 'fondamental',
  theme: 'Mise en route et développement de la base aérobie',
  weekGoal: 'Mise en route et développement de la base aérobie + 1 séance qualité',
  sessions: NEW_S1_SESSIONS
};

// ────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────

console.log(`>>> Patch jeanluc fix S1 — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups : ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan jeanluc introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
console.log('✓ Backup OK');

const f = doc.fields;
if (f.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${f.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);
console.log(`✓ userId AVANT : ${f.userId?.stringValue}`);

const updates = {
  fields: {
    welcomeMessage: { stringValue: NEW_WELCOME },
    weeks: toFV([NEW_WEEK_1]),
  },
};

const updateMask = ['welcomeMessage', 'weeks'];
const updateUrl = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
const tmp = `/tmp/patch-jeanluc-fix-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`\n=== PATCH SUMMARY ===`);
console.log(`  welcomeMessage : ${NEW_WELCOME.length} chars (était ~600)`);
console.log(`  weeks[0].sessions : 4 → 4 (structure corrigée)`);
console.log(`  S1 total : 28 km → ${NEW_S1_SESSIONS.reduce((s, x) => s + (parseFloat(x.distance) || 0), 0)} km`);
console.log(`  S1 sessions APRÈS :`);
NEW_S1_SESSIONS.forEach((s, i) => console.log(`    [${i + 1}] ${s.day} ${s.type} ${s.distance} ${s.duration} @${s.targetPace}`));

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-jeanluc-fix-28mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
console.log(`✅ Plan jeanluc fixé.`);
