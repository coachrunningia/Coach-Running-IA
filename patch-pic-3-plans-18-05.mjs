/**
 * PATCH PIC 3 PLANS — 18/05/2026
 * ────────────────────────────────────────────────────────────────────────────
 * Arbitrage Romane : ajustement du pic de volume hebdomadaire sur 3 plans.
 *
 *  1. Antoine    — antoineg.gde@outlook.fr   — plan 1779086346189
 *     • Marathon sub-3h00, Expert, 22 sem.
 *     • Pic actuel 95 km/sem → cible 86 km/sem max (-9%, facteur 86/95)
 *     • Justif : "95 paraît bcp pour Expert qui fait déjà 80"
 *     • Garde-fou S1 ≥ 80 (declared)
 *
 *  2. Valentine  — valentinemery2004@gmail.com — plan 1779029895523
 *     • Trail 20 km, Intermédiaire, 7 sem.
 *     • Pic actuel 26 km/sem → cible 30 km/sem (+15%, facteur 30/26)
 *     • Justif : "ok pour monter à 30 ça paraît faible"
 *     • Garde-fou S1 ≥ 25 (declared)
 *
 *  3. Alan       — alanwentzel74@gmail.com    — plan 1779114282783
 *     • Trail 35 km, Confirmé Compétition, 11 sem.
 *     • Pic actuel 34 km/sem → cible 45 km/sem (+32%, facteur 45/34)
 *     • Justif : Confirmé Trail 35 km : 34 km/sem largement sous-dim.
 *     • Garde-fou S1 ≥ 30 (declared)
 *
 * RÈGLES :
 *   - Recalcul proportionnel : newVolume = round(oldVolume × facteur)
 *   - Garde-fou S1 : si S1 brut < declared, force S1 = declared
 *   - Garde-fou ACSM : aucun saut +>25% entre 2 sem consécutives (montées only)
 *   - Modifie UNIQUEMENT generationContext.periodizationPlan.weeklyVolumes
 *   - Idempotent : si pic déjà ≈ cible (±2 km), skip
 *   - Backup brut systématique → backup-pic-patch/<email>-pre-pic.json
 *   - Re-read confirmation après PATCH
 *
 * Doctrine :
 *   - feedback_jamais_contact_client     : aucune communication user
 *   - feedback_input_client_obligatoire  : S1 ≥ currentWeeklyVolume declared
 *   - feedback_chaque_ligne_justifiee    : modif justifiée + backup
 *
 * Mode : --apply (direct, pas de dry-run). Sans --apply : exit 1.
 *
 * Usage :
 *   node patch-pic-3-plans-18-05.mjs --apply
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

// ── Mode ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');
if (!APPLY) {
  console.error('🔴 --apply requis. Refus d\'exécuter en dry-run.');
  process.exit(1);
}

// ── Auth ────────────────────────────────────────────────────────────────────
const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(
  `gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { encoding: 'utf-8' }
).trim();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT,
};

// ── Backup dir ──────────────────────────────────────────────────────────────
const BACKUP_DIR = '/Users/romanemarino/Coach-Running-IA/backup-pic-patch';
mkdirSync(BACKUP_DIR, { recursive: true });

// ── Plans cible (arbitrage Romane 18/05) ────────────────────────────────────
const PLANS = [
  {
    tag: 'Antoine',
    email: 'antoineg.gde@outlook.fr',
    planId: '1779086346189',
    declared: 80,
    picTarget: 86,
    factor: 86 / 95,
  },
  {
    tag: 'Valentine',
    email: 'valentinemery2004@gmail.com',
    planId: '1779029895523',
    declared: 25,
    picTarget: 30,
    factor: 30 / 26,
  },
  {
    tag: 'Alan',
    email: 'alanwentzel74@gmail.com',
    planId: '1779114282783',
    declared: 30,
    picTarget: 45,
    factor: 45 / 34,
  },
];

// ── Firestore helpers ───────────────────────────────────────────────────────
function parseInt0(v) {
  if (v?.integerValue !== undefined) return Number(v.integerValue);
  if (v?.doubleValue !== undefined) return Number(v.doubleValue);
  return 0;
}

function parseWv(values) {
  return (values || []).map(parseInt0);
}

async function readPlan(planId) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`;
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`READ ${planId} → ${j.error.message}`);
  return j;
}

async function patchWeeklyVolumes(planId, newWv) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${planId}`;
  const maskFields = ['generationContext.periodizationPlan.weeklyVolumes'];
  const qs = maskFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = {
    fields: {
      generationContext: {
        mapValue: {
          fields: {
            periodizationPlan: {
              mapValue: {
                fields: {
                  weeklyVolumes: {
                    arrayValue: {
                      values: newWv.map((n) => ({ integerValue: String(n) })),
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  const r = await fetch(`${url}?${qs}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) throw new Error(`PATCH ${planId} → ${j.error.message}`);
  return j;
}

// ── Recalcul wv ─────────────────────────────────────────────────────────────
// Recalcul proportionnel + garde-fou S1 ≥ declared. Pas de smoothing actif
// car les patches ont été pré-vérifiés : aucun saut +>25% post-recalcul.
function recalcWv(wv, factor, declared) {
  const raw = wv.map((v) => Math.round(v * factor));
  if (raw[0] < declared) raw[0] = declared;
  return raw;
}

function checkMaxJump(wv) {
  const issues = [];
  for (let i = 1; i < wv.length; i++) {
    const prev = wv[i - 1];
    const cur = wv[i];
    if (prev <= 0) continue;
    const jumpPct = ((cur - prev) / prev) * 100;
    if (jumpPct > 25) issues.push({ week: i + 1, prev, cur, jumpPct: jumpPct.toFixed(1) });
  }
  return issues;
}

// ── Process one plan ────────────────────────────────────────────────────────
async function processOne(p) {
  console.log('\n' + '═'.repeat(80));
  console.log(`▶ ${p.tag} — ${p.email} — plan ${p.planId}`);
  console.log('═'.repeat(80));

  // 1. Read + backup
  const planRaw = await readPlan(p.planId);
  const backupPath = `${BACKUP_DIR}/${p.email}-pre-pic.json`;
  writeFileSync(backupPath, JSON.stringify(planRaw, null, 2));
  console.log(`  📦 backup → ${backupPath}`);

  const F = planRaw.fields;
  const pp = F?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
  if (!pp) {
    console.error('  🔴 generationContext.periodizationPlan introuvable.');
    return { ...p, status: 'error', reason: 'periodizationPlan missing' };
  }

  const wvBefore = parseWv(pp.weeklyVolumes?.arrayValue?.values);
  const picBefore = Math.max(...wvBefore);
  const s1Before = wvBefore[0];

  console.log(`  AVANT : wv=${JSON.stringify(wvBefore)}`);
  console.log(`          pic=${picBefore} km/sem • S1=${s1Before} km • declared=${p.declared} km`);
  console.log(`  CIBLE : pic=${p.picTarget} km/sem (facteur ${p.factor.toFixed(4)})`);

  // 2. Idempotence : pic déjà dans ±2 km de la cible
  if (Math.abs(picBefore - p.picTarget) <= 2) {
    console.log(`  ✅ Idempotent : pic actuel ${picBefore} ≈ cible ${p.picTarget} (±2 km). Aucun PATCH.`);
    return { ...p, status: 'skipped_idempotent', wvBefore, picBefore };
  }

  // 3. Recalcul
  const wvAfter = recalcWv(wvBefore, p.factor, p.declared);
  const picAfter = Math.max(...wvAfter);
  const s1After = wvAfter[0];

  console.log(`  APRÈS : wv=${JSON.stringify(wvAfter)}`);
  console.log(`          pic=${picAfter} km/sem • S1=${s1After} km`);

  // 4. Vérifs pré-PATCH
  const s1Ok = s1After >= p.declared;
  const jumpIssues = checkMaxJump(wvAfter);
  const jumpOk = jumpIssues.length === 0;
  const picOk = Math.abs(picAfter - p.picTarget) <= 2;

  console.log(`  CHECK : S1 ≥ declared (${p.declared})           : ${s1Ok ? '✅' : '🔴'} (S1=${s1After})`);
  console.log(`          Saut max < +25% (ACSM)                  : ${jumpOk ? '✅' : '🔴'}`);
  if (!jumpOk) console.log(`            issues: ${JSON.stringify(jumpIssues)}`);
  console.log(`          Pic ≈ cible (±2 km)                     : ${picOk ? '✅' : '🔴'} (pic=${picAfter} cible=${p.picTarget})`);

  if (!s1Ok || !jumpOk || !picOk) {
    console.error('  🔴 Pré-checks KO → refus du PATCH.');
    return { ...p, status: 'error', reason: 'pre-check failed', wvBefore, wvAfter };
  }

  // 5. PATCH
  await patchWeeklyVolumes(p.planId, wvAfter);
  console.log('  ✔ PATCH envoyé (generationContext.periodizationPlan.weeklyVolumes)');

  // 6. Re-read confirmation
  const reread = await readPlan(p.planId);
  const pp2 = reread.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
  const wvReread = parseWv(pp2?.weeklyVolumes?.arrayValue?.values);
  const rereadOk =
    wvReread.length === wvAfter.length &&
    wvReread.every((v, i) => v === wvAfter[i]);

  console.log(`  RE-READ : wv=${JSON.stringify(wvReread)}`);
  console.log(`            re-read OK : ${rereadOk ? '✅' : '🔴'}`);

  // Vérifs préservation autres champs critiques
  const F2 = reread.fields;
  const preservedKeys = pp2 ? Object.keys(pp2).sort() : [];
  const preservedKeysBefore = Object.keys(pp).sort();
  const ppKeysOk = JSON.stringify(preservedKeys) === JSON.stringify(preservedKeysBefore);
  console.log(`            periodizationPlan keys préservées      : ${ppKeysOk ? '✅' : '🔴'}`);

  const welcomeBefore = F?.welcomeMessage?.stringValue?.length || 0;
  const welcomeAfter = F2?.welcomeMessage?.stringValue?.length || 0;
  const welcomeOk = welcomeBefore === welcomeAfter;
  console.log(`            welcomeMessage len préservé             : ${welcomeOk ? '✅' : '🔴'} (${welcomeBefore}=${welcomeAfter})`);

  return {
    ...p,
    status: rereadOk && ppKeysOk && welcomeOk ? 'patched' : 'patched_but_check_warn',
    wvBefore,
    wvAfter,
    wvReread,
    picBefore,
    picAfter,
    s1Before,
    s1After,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('═'.repeat(80));
console.log('PATCH PIC 3 PLANS — 18/05/2026');
console.log('Auth :', SA);
console.log('═'.repeat(80));

const results = [];
for (const p of PLANS) {
  try {
    results.push(await processOne(p));
  } catch (e) {
    console.error(`  🔴 ${p.tag} : ${e.message}`);
    results.push({ ...p, status: 'error', reason: e.message });
  }
}

// ── Récap ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('RÉCAP');
console.log('═'.repeat(80));
for (const r of results) {
  console.log(`\n  ${r.tag} (${r.email}) — ${r.planId}`);
  console.log(`    status   : ${r.status}`);
  if (r.wvBefore) console.log(`    wv avant : ${JSON.stringify(r.wvBefore)} (pic ${r.picBefore})`);
  if (r.wvAfter)  console.log(`    wv après : ${JSON.stringify(r.wvAfter)} (pic ${r.picAfter})`);
  if (r.reason)   console.log(`    reason   : ${r.reason}`);
}

const okCount = results.filter((r) => r.status === 'patched' || r.status === 'skipped_idempotent').length;
console.log(`\n→ ${okCount}/${results.length} OK`);
process.exit(okCount === results.length ? 0 : 1);
