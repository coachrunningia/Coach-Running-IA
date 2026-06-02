#!/usr/bin/env node
/**
 * patch-arnaud-ems-s2-28mai.mjs
 *
 * Demande Arnaud (elisarnaud.1311@gmail.com, plan 1779554515397 — Prépa 10 km
 * 50 min, 15 sem) : ajouter EMS Lundi 1er juin.
 *
 * Contexte clé : S2 contient sa COURSE OFFICIELLE 10 km Vendredi 5 juin (sa
 * référence chrono du plan). Décision Romane (coach pro) :
 *   - Lun 1/06 : REMPLACER footing par EMS 20 min (respecter demande user)
 *   - Mar 2/06 : Footing vallonné → "Optionnel EF" (selon ressenti post-EMS,
 *                  + retrait côtes pour affûtage)
 *   - Jeu 4/06 : Renfo → "Optionnel" (J-1 course, affûtage prime)
 *   - Ven 5/06 : Course officielle INCHANGÉE (priorité absolue)
 *
 * Doctrines :
 * - feedback_input_client_obligatoire : respect date Lun 1/06 demandée
 * - feedback_securite_avant_conversion : affûtage J-1 protégé via optionnels
 * - feedback_coach_running_ia_que_course : EMS = renfo, jamais substitué à course
 *   en dehors de cette demande explicite user
 * - feedback_patch_live_plans_jour_seulement : 1er juin = J+4, séance pas vécue
 * - feedback_jamais_contact_client : c'est Romane qui répond à Arnaud
 *
 * Usage :
 *   DRY RUN  : node patch-arnaud-ems-s2-28mai.mjs
 *   EXEC     : DRY_RUN=false node patch-arnaud-ems-s2-28mai.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const PLAN_ID = '1779554515397';
const EXPECTED_EMAIL = 'elisarnaud.1311@gmail.com';
const WEEK_IDX = 1; // S2 (idx 1)

const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/audit-arnaud-26mai/backups-ems-${Date.now()}`;
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
// Contenu des modifications S2 (validé Romane 28/05)
// ────────────────────────────────────────────────

const PATCH_BY_DAY = {
  'Lundi': {
    // Remplacer Footing Trail Fondamentale par EMS 20 min
    title: 'Musculation électro-stimulation (EMS) — 20 min',
    type: 'Renforcement',
    intensity: 'Modéré',
    distance: '0 km',
    duration: '20 min',
    targetPace: '-',
    warmup: '5 min de mobilité articulaire (cercles épaules, hanches, chevilles) avant pose des électrodes.',
    mainSet: "Séance EMS 20 min en mode renforcement musculaire (force ou hypertrophie selon ton studio). Cible chaîne postérieure et abdominaux. Contraction à 70-80 % de ta tolérance — pas plus. Hydrate-toi pendant et après.",
    cooldown: '5 min d\'étirements légers chaîne postérieure + auto-massage léger.',
    advice: "Demande prise en compte. À noter (pro) : l\'EMS active intensément les fibres musculaires mais ne stimule ni le cardio, ni l\'adaptation osseuse, ni la coordination de foulée. C\'est un excellent COMPLÉMENT au renfo, pas un substitut au footing. La semaine de ta course officielle Vendredi, on allège le footing du Mardi et le renfo du Jeudi (cf. séances suivantes) pour préserver ton chrono."
  },
  'Mardi': {
    // Footing vallonné côtes → Optionnel EF plat
    title: 'Optionnel selon ressenti — Footing EF plat',
    type: 'Jogging',
    intensity: 'Facile',
    distance: '8.2 km',
    duration: '59 min',
    targetPace: '5:50',
    warmup: '5 min marche puis transition vers le footing.',
    mainSet: "OPTIONNEL — à faire selon ton ressenti après la séance EMS de Lundi : si tu as de la fatigue dans les jambes (raideurs, tensions), prends une journée de récup totale. Si tu te sens bien, footing 8.2 km en endurance fondamentale STRICTE (5:50 min/km, allure conversation) sur terrain PLAT — on retire les côtes cette semaine pour préserver l\'affûtage avant la course de Vendredi.",
    cooldown: '5 min de marche + étirements légers.',
    advice: "Priorité affûtage pour ta course officielle Vendredi. Si doute → récup. Mieux vaut arriver frais sur la ligne que kilométrer."
  },
  'Jeudi': {
    // Renfo → Optionnel léger
    title: 'Optionnel — Renfo très léger (J-1 course)',
    type: 'Renforcement',
    intensity: 'Facile',
    distance: '0 km',
    duration: '15 min',
    targetPace: '-',
    warmup: '5 min mobilité articulaire douce.',
    mainSet: "OPTIONNEL J-1 course : si tu te sens bien, fais 1 tour seulement (vs les 3 habituels) : 30 sec planche faciale, 8 squats légers, 8 fentes par jambe, 8 ponts fessiers. Si fatigue ou tension → repos COMPLET, c\'est mieux pour ton chrono de demain.",
    cooldown: '5 min étirements doux.',
    advice: "À J-1 de ta course officielle, le repos vaut plus qu\'une séance forcée. Aucune progression possible en 24h, mais une fatigue de trop, oui. Écoute ton corps."
  },
  'Vendredi': null, // INCHANGÉ - course officielle priorité
};

// ────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────

console.log(`>>> Patch Arnaud S2 EMS — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups : ${BACKUP_DIR}`);

const doc = fetchDoc();
if (!doc.fields) throw new Error('Plan Arnaud introuvable');
writeFileSync(`${BACKUP_DIR}/${PLAN_ID}-before.json`, JSON.stringify(doc, null, 2));
console.log('✓ Backup OK');

if (doc.fields.userEmail?.stringValue !== EXPECTED_EMAIL) {
  throw new Error(`Email mismatch : ${doc.fields.userEmail?.stringValue} ≠ ${EXPECTED_EMAIL}`);
}
console.log(`✓ userEmail : ${EXPECTED_EMAIL}`);

const weeksFV = doc.fields.weeks.arrayValue.values;
const weeks = weeksFV.map(fromFV);
const w2 = weeks[WEEK_IDX];

if (!w2 || !Array.isArray(w2.sessions)) throw new Error(`weeks[${WEEK_IDX}] missing or no sessions`);
console.log(`✓ S2 trouvée — phase=${w2.phase} sessions=${w2.sessions.length}`);

// Apply patch by day
const updatedSessions = w2.sessions.map(s => {
  const patch = PATCH_BY_DAY[s.day];
  if (!patch) return s; // unchanged (Vendredi course)
  // preserve id, just override patched fields
  return { ...s, ...patch };
});

const newW2 = { ...w2, sessions: updatedSessions };
const newWeeks = [...weeks];
newWeeks[WEEK_IDX] = newW2;

const updates = {
  fields: {
    weeks: toFV(newWeeks),
  },
};

const updateMask = ['weeks'];
const updateUrl = `${docUrl}?${updateMask.map(p => `updateMask.fieldPaths=${p}`).join('&')}`;
const tmp = `/tmp/patch-arnaud-ems-${Date.now()}.json`;
writeFileSync(tmp, JSON.stringify(updates));

console.log(`\n=== S2 nouvelles séances ===`);
updatedSessions.forEach((s, i) => {
  const tag = PATCH_BY_DAY[s.day] ? '🔧' : '✓';
  console.log(`  ${tag} [${i}] ${s.day} — ${s.type} ${s.distance} ${s.duration} : ${s.title.slice(0, 60)}`);
});

if (DRY_RUN) {
  console.log(`\n>>> DRY RUN — pas d'écriture.`);
  console.log(`Pour exec : DRY_RUN=false node patch-arnaud-ems-s2-28mai.mjs`);
  process.exit(0);
}

const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${updateUrl}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());
if (res.error) throw new Error(JSON.stringify(res.error));
console.log(`\n✅ PATCH OK — updateTime: ${res.updateTime}`);
