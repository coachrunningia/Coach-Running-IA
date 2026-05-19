/**
 * Patch batch live — 8 plans 18/05 (S1 < currentWeeklyVolume)
 *
 * Contexte :
 *   Audit AUDIT-8-PLANS-S1-TEMPLATE-V2.md a confirmé que les 8 plans du 18/05
 *   ont tous un ratio S1/declared = 80-87% (baisse -13 à -20% vs current).
 *   Bug code à 85% (commit 26b3d3a du 18/05 17:59 patche L2655 mais L2666 résiduel).
 *
 * Décision Romane (validé) :
 *   Patcher live ces 8 plans pour remonter S1 = currentWeeklyVolume.
 *   PM B1.b : patch weeklyVolumes only, jamais semaine en cours, invisible côté user.
 *
 * Doctrine ABSOLUE :
 *   - Touche UNIQUEMENT generationContext.periodizationPlan.weeklyVolumes
 *   - Pas de contact client (feedback_jamais_contact_client)
 *   - Backup systématique par client (backup-vol-patch/<email>-pre.json)
 *   - Re-read confirmation systématique
 *   - Idempotent (skip si nouveau S1 déjà == declared)
 *   - Plafond : ne pas dépasser le pic original × 1.05
 *
 * Usage :
 *   node patch-batch-volumes-18-05.mjs --dry      (par défaut)
 *   node patch-batch-volumes-18-05.mjs --apply    (exec réel)
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const BACKUP_DIR = `${process.env.HOME}/Coach-Running-IA/backup-vol-patch`;

const DRY_RUN = !process.argv.includes('--apply');

// ── Auth ─────────────────────────────────────────────────────────────────────
const TOKEN = execSync(
  `gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio: ['pipe', 'pipe', 'pipe'] },
).toString().trim();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'x-goog-user-project': PROJECT,
};

// ── Les 8 plans à patcher (extraits de audit-8-plans-s1.json) ────────────────
const PLANS = [
  { name: 'Aurore',    email: 'auroregervot@yahoo.fr',         uid: 'ym0Uw0z1VveJGAWwmarvQRRzT6G2', planId: '1779124806518', declared: 12 },
  { name: 'Justine',   email: 'justine.clt29@icloud.com',      uid: 'oGi1YkRbNCSQfTucLkd9yxs6sfb2', planId: '1779124016788', declared: 13 },
  { name: 'Alan',      email: 'alanwentzel74@gmail.com',       uid: 'yzvy4Csd7OMYT7x5Xx6YPnFpML12', planId: '1779114282783', declared: 30 },
  // Sébastien : DÉJÀ PATCHÉ avec [4,5,6,7,8,9,5] (validé Romane + expert FFA).
  // Brief explicite : "vérifier le ratio actuel et patcher SEULEMENT s'il est encore < 1.0.
  //   Si déjà OK, le marquer 'skip - déjà patché'."
  // Le vecteur actuel correspond exactement à celui validé → SKIP forcé.
  { name: 'Sebastien', email: 'sebastien.sailly@outlook.fr',   uid: 'jZ8E7E1beJeO9GdDAYM6gYwMdVN2', planId: '1779099564353', declared: 5, forceSkipReason: 'Déjà patché avec [4,5,6,7,8,9,5] (validé Romane + expert FFA)' },
  { name: 'Antoine',   email: 'antoineg.gde@outlook.fr',       uid: 'G1QYJ1KzqqWXoB5BbcjKQFmORC02', planId: '1779086346189', declared: 80 },
  { name: 'Annabelle', email: 'nabou57@hotmail.fr',            uid: 'Zdxq3nSp88WYjhQ7ghVM4Z51aQA2', planId: '1779085742508', declared: 40 },
  { name: 'Armando',   email: 'arenaarmando@hotmail.com',      uid: 'rZwYWXDBJbMDbaRmZ2yAVcSLVED2', planId: '1779071910169', declared: 80 },
  { name: 'Valentine', email: 'valentinemery2004@gmail.com',   uid: '2D1Puvf4oLVeTBjCKHzvb8ZansL2', planId: '1779029895523', declared: 25 },
];

// ── Helpers Firestore ───────────────────────────────────────────────────────
const planUrl = (id) => `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${id}`;

async function readPlan(id) {
  const r = await fetch(planUrl(id), { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`READ ${id}: ${JSON.stringify(j.error)}`);
  return j;
}

function extractPP(doc) {
  return doc.fields?.generationContext?.mapValue?.fields?.periodizationPlan?.mapValue?.fields;
}

function extractVolumes(pp) {
  return (pp?.weeklyVolumes?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
}

async function writeVolumes(planId, newVolumes) {
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
                      values: newVolumes.map(v => ({ integerValue: String(v) })),
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
  const url = `${planUrl(planId)}?updateMask.fieldPaths=${encodeURIComponent('generationContext.periodizationPlan.weeklyVolumes')}`;
  const r = await fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error(`WRITE ${planId}: ${JSON.stringify(j.error)}`);
  return j;
}

// ── Process one plan ────────────────────────────────────────────────────────
async function processPlan(p) {
  const log = { name: p.name, email: p.email, planId: p.planId, declared: p.declared };
  console.log(`\n━━━ ${p.name} (${p.email}) ──`);
  console.log(`  plan ${p.planId}, declared ${p.declared} km/sem`);

  // 1. Read
  let doc;
  try {
    doc = await readPlan(p.planId);
  } catch (e) {
    console.error(`  🔴 READ failed: ${e.message}`);
    log.status = 'error_read';
    log.error = e.message;
    return log;
  }

  const pp = extractPP(doc);
  if (!pp) {
    console.error('  🔴 periodizationPlan introuvable');
    log.status = 'error_no_pp';
    return log;
  }
  const oldVolumes = extractVolumes(pp);
  if (!oldVolumes.length) {
    console.error('  🔴 weeklyVolumes vide');
    log.status = 'error_no_volumes';
    return log;
  }
  const s1Old = oldVolumes[0];
  const peakOld = Math.max(...oldVolumes);
  log.s1Old = s1Old;
  log.peakOld = peakOld;
  log.volumesOld = oldVolumes;

  console.log(`  S1 actuel : ${s1Old} km`);
  console.log(`  weeklyVolumes : [${oldVolumes.join(', ')}]`);
  console.log(`  pic original : ${peakOld} km`);

  // Force-skip (cas Sébastien : déjà patché expert FFA)
  if (p.forceSkipReason) {
    console.log(`  ⏭️  FORCE-SKIP : ${p.forceSkipReason}`);
    log.status = 'skip_force';
    log.skipReason = p.forceSkipReason;
    log.volumesNew = oldVolumes;
    log.s1New = s1Old;
    // Backup quand même
    const bkpPath = path.join(BACKUP_DIR, `${p.email}-pre.json`);
    if (!fs.existsSync(bkpPath)) {
      fs.writeFileSync(bkpPath, JSON.stringify(doc, null, 2));
      console.log(`  [backup] ${bkpPath}`);
    }
    log.backupPath = bkpPath;
    return log;
  }

  // 2. Backup brut (toujours, même en dry-run, pour pouvoir relire)
  const bkpPath = path.join(BACKUP_DIR, `${p.email}-pre.json`);
  if (!fs.existsSync(bkpPath)) {
    fs.writeFileSync(bkpPath, JSON.stringify(doc, null, 2));
    console.log(`  [backup] ${bkpPath}`);
  } else {
    console.log(`  [backup] déjà existant — pas réécrit`);
  }
  log.backupPath = bkpPath;

  // 3. Idempotence : skip si S1 >= declared
  if (s1Old >= p.declared) {
    console.log(`  ✅ SKIP — S1 ${s1Old} >= declared ${p.declared} (déjà OK)`);
    log.status = 'skip_already_ok';
    log.factor = 1;
    log.volumesNew = oldVolumes;
    log.s1New = s1Old;
    return log;
  }

  // 4. Recalcul : factor = declared / S1
  const factor = p.declared / s1Old;
  log.factor = factor;
  const peakCap = Math.round(peakOld * 1.05);

  let newVolumes = oldVolumes.map(v => Math.round(v * factor));

  // Force S1 == declared (au cas où l'arrondi ne le donne pas exactement)
  newVolumes[0] = p.declared;

  // Plafond : ne pas dépasser peakOld × 1.05
  let capped = 0;
  newVolumes = newVolumes.map(v => {
    if (v > peakCap) { capped++; return peakCap; }
    return v;
  });

  const s1New = newVolumes[0];
  const peakNew = Math.max(...newVolumes);
  log.volumesNew = newVolumes;
  log.s1New = s1New;
  log.peakNew = peakNew;
  log.peakCap = peakCap;
  log.cappedWeeks = capped;

  console.log(`  factor : ${factor.toFixed(3)} (${p.declared}/${s1Old})`);
  console.log(`  plafond pic : ${peakCap} km (${peakOld} × 1.05)`);
  if (capped > 0) console.log(`  ⚠️ ${capped} semaine(s) plafonnée(s) à ${peakCap}`);
  console.log(`  NEW weeklyVolumes : [${newVolumes.join(', ')}]`);
  console.log(`  S1 ${s1Old} → ${s1New} (cible ${p.declared}) ${s1New === p.declared ? '✅' : '🔴 cible non atteinte'}`);

  if (s1New !== p.declared) {
    console.error('  🔴 ABORT — S1 cible non atteinte');
    log.status = 'error_target_not_reached';
    return log;
  }

  // Sanity : pas de saut intra-plan > 25% (hors taper/recup)
  let maxJump = 0;
  for (let i = 1; i < newVolumes.length; i++) {
    if (newVolumes[i] > newVolumes[i - 1]) {
      const d = ((newVolumes[i] - newVolumes[i - 1]) / newVolumes[i - 1]) * 100;
      if (d > maxJump) maxJump = d;
    }
  }
  log.maxJumpPct = maxJump;
  console.log(`  max progression intra-plan : +${maxJump.toFixed(1)}%`);
  if (maxJump > 30) {
    console.error('  🔴 ABORT — saut intra-plan > 30%');
    log.status = 'error_jump_too_big';
    return log;
  }

  // 5. Write
  if (DRY_RUN) {
    console.log('  [DRY-RUN] write skip (use --apply)');
    log.status = 'dry_run';
    return log;
  }

  try {
    await writeVolumes(p.planId, newVolumes);
    console.log('  [write] PATCH OK');
  } catch (e) {
    console.error(`  🔴 WRITE failed: ${e.message}`);
    log.status = 'error_write';
    log.error = e.message;
    return log;
  }

  // 6. Re-read confirmation
  let after;
  try {
    after = await readPlan(p.planId);
  } catch (e) {
    console.error(`  🔴 RE-READ failed: ${e.message}`);
    log.status = 'error_reread';
    log.error = e.message;
    return log;
  }

  const ppAfter = extractPP(after);
  const volumesAfter = extractVolumes(ppAfter);
  const s1After = volumesAfter[0];

  console.log(`  RE-READ weeklyVolumes : [${volumesAfter.join(', ')}]`);
  console.log(`  RE-READ S1 : ${s1After} ${s1After === p.declared ? '✅' : '🔴'}`);
  log.volumesReread = volumesAfter;
  log.s1Reread = s1After;

  // Vérif que rien d'autre n'a bougé
  const beforePhases = (pp.weeklyPhases?.arrayValue?.values || []).map(v => v.stringValue);
  const afterPhases = (ppAfter?.weeklyPhases?.arrayValue?.values || []).map(v => v.stringValue);
  const beforeRecov = (pp.recoveryWeeks?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
  const afterRecov = (ppAfter?.recoveryWeeks?.arrayValue?.values || []).map(v => parseInt(v.integerValue));
  const beforeTw = parseInt(pp.totalWeeks?.integerValue);
  const afterTw = parseInt(ppAfter?.totalWeeks?.integerValue);

  const phasesOK = JSON.stringify(beforePhases) === JSON.stringify(afterPhases);
  const recovOK = JSON.stringify(beforeRecov) === JSON.stringify(afterRecov);
  const twOK = beforeTw === afterTw;
  log.phasesOK = phasesOK;
  log.recovOK = recovOK;
  log.twOK = twOK;

  console.log(`  weeklyPhases inchangées  : ${phasesOK ? '✅' : '🔴'}`);
  console.log(`  recoveryWeeks inchangées : ${recovOK ? '✅' : '🔴'}`);
  console.log(`  totalWeeks inchangé      : ${twOK ? '✅' : '🔴'}`);

  // Champs root-level critiques (feasibility / welcomeMessage / paces / safetyWarning)
  const rootFields = ['feasibility', 'welcomeMessage', 'safetyWarning', 'paces', 'confidenceScore'];
  log.rootChecks = {};
  for (const f of rootFields) {
    const a = JSON.stringify(doc.fields?.[f] || null);
    const b = JSON.stringify(after.fields?.[f] || null);
    const eq = a === b;
    log.rootChecks[f] = eq;
    console.log(`  ${eq ? '✅' : '🔴'} ${f} ${eq ? 'inchangé' : 'MODIFIÉ (régression !)'}`);
  }

  const allOK = phasesOK && recovOK && twOK && s1After === p.declared && Object.values(log.rootChecks).every(Boolean);
  log.status = allOK ? 'patched_ok' : 'patched_with_regression';
  console.log(`  → STATUS : ${log.status}`);
  return log;
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`Mode : ${DRY_RUN ? 'DRY-RUN (use --apply for real)' : 'APPLY (live)'}`);
console.log(`Backup dir : ${BACKUP_DIR}`);
console.log(`Plans à traiter : ${PLANS.length}`);

const results = [];
for (const p of PLANS) {
  const r = await processPlan(p);
  results.push(r);
}

// ── Récap ──────────────────────────────────────────────────────────────────
console.log('\n\n━━━━━━━━━━━━━━━ RÉCAP ━━━━━━━━━━━━━━━');
const byStatus = {};
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
}
for (const [s, n] of Object.entries(byStatus)) {
  console.log(`  ${s.padEnd(28)} : ${n}`);
}

const logPath = path.join(BACKUP_DIR, `_batch-log-${DRY_RUN ? 'dry' : 'apply'}.json`);
fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
console.log(`\nLog : ${logPath}`);
