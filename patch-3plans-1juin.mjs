#!/usr/bin/env node
/**
 * patch-3plans-1juin.mjs
 *
 * Patches live 3 plans audités 01/06/2026 :
 *
 * 1. SEMENT.FRANCOIS (1780339024050) — Trail 31km/750D+ 2h15 Conf cv 40 freq 4
 *    hasInjury=TRUE (tendinopathie Achille). Pic 68→55 km (ratio 1.70→1.38).
 *    Verdict FFA : ratio 1.70 = limite + injury non géré code = patch live.
 *
 * 2. FRANCOIS.SEMENT (1780339846860) — Trail 31km/750D+ 2h50 Expert cv 40 freq 5
 *    hasInjury=TRUE (gêne Achille quasi guérie). Pic 77→62 km (ratio 1.93→1.55).
 *    Verdict FFA : ratio 1.93 = hors Pfitzinger + injury non géré = patch live.
 *
 * 3. VALENTIN (1780321709098) — Perte Poids 12sem Conf 26a 83kg/176cm
 *    Renfo S1 : "Circuit Métabolique Haute Intensité - Bas du corps" avec plyo
 *    (squats sautés, fentes sautées). Risque 5-15% blessure articulaire phase
 *    fondamentale + profil perte poids. Patch : titre + mainSet + advice safer.
 *
 * Doctrines respectées :
 * - feedback_securite_avant_conversion ✓
 * - feedback_jamais_poids_minceur ✓ (Valentin : zéro mention poids/BMI)
 * - feedback_chaque_ligne_justifiee ✓
 * - feedback_input_client_obligatoire ✓ (S1 volumes user respectés)
 *
 * Méthode patch volumes :
 *   - S1 conservé (= cv user)
 *   - Récupération conservées (semaines ≤ S1)
 *   - Pic et progression réduits proportionnellement entre S1 et nouveau pic
 *
 * Usage :
 *   DRY RUN : node patch-3plans-1juin.mjs
 *   EXEC    : DRY_RUN=false node patch-3plans-1juin.mjs
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROJECT = 'coach-running-ia';
const DRY_RUN = process.env.DRY_RUN !== 'false';
const BACKUP_DIR = `/Users/romanemarino/Coach-Running-IA/backups-3plans-1juin-${Date.now()}`;
mkdirSync(BACKUP_DIR, { recursive: true });

const token = () => execSync('gcloud auth print-access-token').toString().trim();
const fetchDoc = (pid) => JSON.parse(execSync(`curl -s -H "Authorization: Bearer ${token()}" "https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${pid}"`, { maxBuffer: 80 * 1024 * 1024 }).toString());

function toFV(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFV) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toFV(vv)])) } };
  throw new Error('toFV: type non supporté');
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

// Recalcule weeklyVolumes pour passer du pic ancien au pic nouveau
// en gardant S1 et les semaines récup (≤ S1) intactes.
function recalcVolumes(oldVols, newPic) {
  const s1 = oldVols[0];
  const oldPic = Math.max(...oldVols);
  const deltaOld = oldPic - s1;
  const deltaNew = newPic - s1;
  return oldVols.map(v => {
    if (v <= s1) return v; // récup/affûtage inchangés
    const progress = (v - s1) / deltaOld;
    return Math.round(s1 + progress * deltaNew);
  });
}

// ────────────────────────────────────────────────────
// PATCHES
// ────────────────────────────────────────────────────

const PATCHES = [
  // 1. SEMENT.FRANCOIS — volumes recalculés (pic 68→55)
  {
    pid: '1780339024050',
    label: 'SEMENT.FRANCOIS (Trail 31km/750D+ 2h15 — injury Achille)',
    expectedEmail: 'sement.francois@gmail.com',
    apply: (doc) => {
      const gc = fromFV(doc.fields.generationContext);
      const oldVols = gc.periodizationPlan.weeklyVolumes;
      const newVols = recalcVolumes(oldVols, 55);
      const newPP = { ...gc.periodizationPlan, weeklyVolumes: newVols };
      const newGC = { ...gc, periodizationPlan: newPP };
      return {
        fields: { generationContext: toFV(newGC) },
        mask: ['generationContext'],
        log: `weeklyVolumes pic ${Math.max(...oldVols)}→${Math.max(...newVols)} (S1=${newVols[0]} inchangé)\n   ancien : ${JSON.stringify(oldVols)}\n   nouveau : ${JSON.stringify(newVols)}`,
      };
    },
  },
  // 2. FRANCOIS.SEMENT — volumes recalculés (pic 77→62)
  {
    pid: '1780339846860',
    label: 'FRANCOIS.SEMENT (Trail 31km/750D+ 2h50 — injury Achille)',
    expectedEmail: 'francois.sement@gmail.com',
    apply: (doc) => {
      const gc = fromFV(doc.fields.generationContext);
      const oldVols = gc.periodizationPlan.weeklyVolumes;
      const newVols = recalcVolumes(oldVols, 62);
      const newPP = { ...gc.periodizationPlan, weeklyVolumes: newVols };
      const newGC = { ...gc, periodizationPlan: newPP };
      return {
        fields: { generationContext: toFV(newGC) },
        mask: ['generationContext'],
        log: `weeklyVolumes pic ${Math.max(...oldVols)}→${Math.max(...newVols)} (S1=${newVols[0]} inchangé)\n   ancien : ${JSON.stringify(oldVols)}\n   nouveau : ${JSON.stringify(newVols)}`,
      };
    },
  },
  // 3. VALENTIN — Renfo S1 retitre + mainSet safer
  {
    pid: '1780321709098',
    label: 'VALENTIN (Perte Poids — Renfo HIIT → safer)',
    expectedEmail: 'valentin.faroldi@hotmail.fr',
    apply: (doc) => {
      const weeks = fromFV(doc.fields.weeks);
      const w1 = weeks[0];
      const renfoIdx = w1.sessions.findIndex((s) => s.type === 'Renforcement');
      if (renfoIdx === -1) throw new Error('Pas de Renforcement S1');
      w1.sessions[renfoIdx] = {
        ...w1.sessions[renfoIdx],
        title: 'Renfo Adapté Course à Pied et Perte de Poids en toute Sécurité',
        mainSet: "Circuit 3 tours, repos 45s entre exercices, 1'30 entre tours : Squats au poids du corps (3×15) / Fentes marchées alternées (3×10/jambe) / Pont fessier hip thrust (3×15) / Planche faciale (3×30s) / Soulevés de talons (3×20).",
        cooldown: "5 min d'étirements doux : quadriceps, ischio-jambiers, mollets, hanches, chaîne postérieure.",
        advice: "Privilégie la qualité du mouvement à la rapidité. AUCUN saut, AUCUN choc. Si genou ou cheville chauffe, allonge la pause ou stoppe la séance. Renfo sécurité avant tout : on construit les muscles qui soutiennent ta foulée sur le long terme, pas pour brûler des calories en sprint.",
      };
      return {
        fields: { weeks: toFV(weeks) },
        mask: ['weeks'],
        log: `Renfo S1 retitre + mainSet plyo → safer (squats poids, fentes marchées, pont fessier, planche, soulevé talons)`,
      };
    },
  },
];

// ────────────────────────────────────────────────────
// EXEC
// ────────────────────────────────────────────────────

console.log(`>>> Patches 3 plans 1/06 — DRY_RUN=${DRY_RUN}`);
console.log(`>>> Backups : ${BACKUP_DIR}\n`);

for (const p of PATCHES) {
  console.log(`━━ ${p.label} (${p.pid}) ━━`);
  try {
    const doc = fetchDoc(p.pid);
    writeFileSync(`${BACKUP_DIR}/${p.pid}-before.json`, JSON.stringify(doc, null, 2));
    if (doc.fields.userEmail?.stringValue !== p.expectedEmail) {
      throw new Error(`Email mismatch : ${doc.fields.userEmail?.stringValue} ≠ ${p.expectedEmail}`);
    }
    const { fields, mask, log } = p.apply(doc);
    console.log(`  ✓ email : ${p.expectedEmail}`);
    console.log(`  ${log}`);

    if (DRY_RUN) {
      console.log(`  >>> DRY RUN — pas d'écriture`);
    } else {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${p.pid}?${mask.map(m => `updateMask.fieldPaths=${m}`).join('&')}`;
      const tmp = `/tmp/patch-3plans-${p.pid}.json`;
      writeFileSync(tmp, JSON.stringify({ fields }));
      const res = JSON.parse(execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token()}" -H "Content-Type: application/json" --data-binary @${tmp} "${url}"`).toString());
      if (res.error) throw new Error(JSON.stringify(res.error));
      console.log(`  ✅ updateTime: ${res.updateTime}`);
    }
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
  }
  console.log();
}

if (DRY_RUN) console.log(`Pour exec : DRY_RUN=false node patch-3plans-1juin.mjs`);
