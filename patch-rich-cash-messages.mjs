// PATCH RICH CASH MESSAGES — re-patch feasibility.message pour Plan 1 (13 sem) & Plan 2 (19 sem)
// User : Rich (rauroy@yahoo.fr) — UID eSVsxhsqU2en9sbXbIAmL4xA72A3
//
// Plan 1 : plans/1779135832271 (13 sem) — ton ALARMANT (n'est pas optimal / très court / très élevé / impossible)
// Plan 2 : plans/1775644846100 (19 sem) — ton MODÉRÉ-HONNÊTE (est ambitieux / fenêtre minimum acceptable)
//
// Romane veut transparence brutalement honnête (PAS OPTIMAL) + point positif (vol 70 km/sem solide).
// Les vecteurs pic 85 / D+ pic 5800 + status AMBITIEUX + score 60 + confidenceScore 60 + safetyWarning + welcomeMessage
// + weeklyVolumes + weeklyElevationTarget + paces + weeks restent INCHANGÉS.
// On ne touche QUE feasibility.message.
//
// Doctrine ABSOLUE :
// - Allures intactes (jamais touchées)
// - Aucun mot interdit (poids/IMC/minceur/silhouette/kilos/corpulence/maigrir)
// - Pas de contact client (Romane gère)
// - Backup pré-cash créé pour chaque plan
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique post-patch

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

const NEW_FEAS_MSG_PLAN1 =
  "Ce trail de 110 km / 12 000 m D+ n'est pas optimal dans les conditions actuelles. " +
  "13 semaines pour un ultra de cette ampleur est très court — 20-24 semaines sont le strict minimum recommandé pour ce type de course. " +
  "Le D+ de la course (12 000 m) est 4× ton D+ hebdomadaire actuel (3 000 m/sem) : le risque musculaire en descente est très élevé, " +
  "et il est impossible de construire toute la résistance excentrique nécessaire en seulement 13 semaines. " +
  "Ratio D+/km de 109 m/km : terrain de haute montagne, la gestion des montées sera déterminante. " +
  "VMA estimée à 17,6 km/h (dérivée de ton marathon 3h00) — pas de chrono trail validé, donc marge d'incertitude sur les allures. " +
  "Point positif : ton volume actuel de 70 km/sem est une excellente base. " +
  "Le plan vise un pic à 85 km/sem et 5 800 m D+/sem en plateau, calibré Master 55 pour limiter le risque de blessure. " +
  "Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan ou revoir l'objectif si nécessaire en cours de préparation.";

const NEW_FEAS_MSG_PLAN2 =
  "Cet ultra de 110 km / 12 000 m D+ est ambitieux. " +
  "19 semaines de préparation, c'est dans la fenêtre minimum acceptable (20-24 semaines restent idéales pour ce type d'effort). " +
  "Le D+ de la course (12 000 m) est 4× ton D+ hebdomadaire actuel (3 000 m/sem) : la résistance musculaire à la descente sera ton point clé à travailler, " +
  "et 19 semaines te permettent de la construire progressivement. " +
  "Ratio D+/km de 109 m/km : terrain de haute montagne, la gestion des montées sera déterminante. " +
  "VMA estimée à 17,6 km/h (dérivée de ton marathon 3h00) — pas de chrono trail validé, donc marge d'incertitude sur les allures. " +
  "Point positif : ton volume actuel de 70 km/sem est une excellente base. " +
  "Le plan vise un pic à 85 km/sem et 5 800 m D+/sem en plateau, calibré Master 55 pour limiter le risque de blessure. " +
  "Écoute ton corps, sois très progressif, et n'hésite pas à adapter le plan ou revoir l'objectif si nécessaire en cours de préparation.";

const PLANS = [
  {
    label: 'PLAN1',
    planId: '1779135832271',
    weeks: 13,
    newMsg: NEW_FEAS_MSG_PLAN1,
    backupPath: '/Users/romanemarino/Coach-Running-IA/backup-rich-PLAN1-pre-cash-message.json',
    afterPath:  '/Users/romanemarino/Coach-Running-IA/after-rich-PLAN1-post-cash-message.json',
  },
  {
    label: 'PLAN2',
    planId: '1775644846100',
    weeks: 19,
    newMsg: NEW_FEAS_MSG_PLAN2,
    backupPath: '/Users/romanemarino/Coach-Running-IA/backup-rich-PLAN2-pre-cash-message.json',
    afterPath:  '/Users/romanemarino/Coach-Running-IA/after-rich-PLAN2-post-cash-message.json',
  },
];

// --- Helpers Firestore typed-value ---
const toFs = (v) => {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = toFs(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
};
const fromFs = (v) => {
  if (!v) return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o={}; for (const k of Object.keys(v.mapValue.fields||{})) o[k]=fromFs(v.mapValue.fields[k]); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromFs);
  return v;
};

async function getDoc(base) {
  const r = await fetch(base, { headers: HDR });
  if (!r.ok) throw new Error(`GET ${r.status} ${await r.text()}`);
  return r.json();
}

// --- Banned words sanity ---
const BANNED = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'maigre'];
function assertNoBanned(label, txt) {
  if (typeof txt !== 'string') return;
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) throw new Error(`[BANNED WORD] "${w}" présent dans ${label}`);
  }
}
for (const p of PLANS) {
  assertNoBanned(`NEW_FEAS_MSG_${p.label}`, p.newMsg);
}

// --- Hash util pour snapshot invariants (sauf feasibility.message) ---
function snapshotInvariants(doc) {
  const f = doc.fields;
  const fe = fromFs(f.feasibility) || {};
  const gc = fromFs(f.generationContext) || {};
  const pp = gc.periodizationPlan || {};
  const paces = fromFs(f.paces);
  const weeks = fromFs(f.weeks);
  const wm = fromFs(f.welcomeMessage);
  const conf = fromFs(f.confidenceScore);
  return {
    status: fe.status,
    score: fe.score,
    safetyWarning: fe.safetyWarning,
    recommendation: fe.recommendation,
    confidenceScore: conf,
    welcomeMessage: wm,
    weeklyVolumes: pp.weeklyVolumes,
    weeklyElevationTarget: pp.weeklyElevationTarget,
    paces,
    weeksCount: Array.isArray(weeks) ? weeks.length : null,
    // Full weeks object for canonical equality check
    weeks,
  };
}
// Canonical stringify (sorted keys) — Firestore peut réordonner les champs sans changer la sémantique
function canonStringify(x) {
  if (x === null || x === undefined) return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(canonStringify).join(',') + ']';
  if (typeof x === 'object') {
    const keys = Object.keys(x).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonStringify(x[k])).join(',') + '}';
  }
  return JSON.stringify(x);
}
function diffInvariants(a, b) {
  const diffs = [];
  for (const k of Object.keys(a)) {
    const av = typeof a[k] === 'object' ? canonStringify(a[k]) : String(a[k]);
    const bv = typeof b[k] === 'object' ? canonStringify(b[k]) : String(b[k]);
    if (av !== bv) diffs.push({ key: k, before: av, after: bv });
  }
  return diffs;
}

async function patchOne(plan) {
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${plan.planId}`;
  console.log(`\n############################`);
  console.log(`### ${plan.label} (${plan.planId}) — ${plan.weeks} sem`);
  console.log(`############################`);

  // --- SNAPSHOT BEFORE ---
  const before = await getDoc(BASE);
  const feB = fromFs(before.fields.feasibility) || {};
  const oldMsg = feB.message || '';

  // Backup pré-cash (n'écrase pas si déjà présent)
  if (!fs.existsSync(plan.backupPath)) {
    fs.writeFileSync(plan.backupPath, JSON.stringify(before, null, 2));
    console.log(`✅ Backup pré-cash créé : ${plan.backupPath}`);
  } else {
    console.log(`⏭️  Backup pré-cash déjà présent : ${plan.backupPath}`);
  }

  console.log(`\nfeasibility.status   (before) : ${feB.status}`);
  console.log(`feasibility.score    (before) : ${feB.score}`);
  console.log(`confidenceScore      (before) : ${fromFs(before.fields.confidenceScore)}`);
  console.log(`\nfeasibility.message (BEFORE, full) :`);
  console.log(oldMsg);

  // --- Idempotence ---
  if (oldMsg === plan.newMsg) {
    console.log(`\n⏭️  ${plan.label} : feasibility.message déjà à jour. Aucun write.`);
    return { plan, before, after: before, skipped: true };
  }

  // --- Snapshot invariants AVANT ---
  const invBefore = snapshotInvariants(before);

  // --- Build patched doc (ONLY feasibility) ---
  const feFields = before.fields.feasibility.mapValue.fields;
  feFields.message = { stringValue: plan.newMsg };

  // --- PATCH via updateMask sur 'feasibility' uniquement ---
  // Note: updateMask sur 'feasibility' remplace toute la map → on doit renvoyer la map COMPLÈTE
  // (ce qu'on fait : on a juste modifié .message, gardé tous les autres champs de feasibility)
  const qs = `updateMask.fieldPaths=${encodeURIComponent('feasibility')}`;
  const url = `${BASE}?${qs}`;
  const patchBody = JSON.stringify({ fields: { feasibility: before.fields.feasibility } });

  console.log(`\n=== APPLY PATCH ${plan.label} (feasibility uniquement) ===`);
  const r = await fetch(url, { method: 'PATCH', headers: HDR, body: patchBody });
  if (!r.ok) throw new Error(`PATCH ${plan.label} ${r.status} ${await r.text()}`);
  console.log(`✅ PATCH ${plan.label} appliqué`);

  // --- RE-READ ---
  const after = await getDoc(BASE);
  fs.writeFileSync(plan.afterPath, JSON.stringify(after, null, 2));
  const feA = fromFs(after.fields.feasibility) || {};

  console.log(`\nfeasibility.message (AFTER, full) :`);
  console.log(feA.message);

  // Vérif message
  if (feA.message !== plan.newMsg) {
    console.error(`❌ ${plan.label} : message AFTER ne correspond pas au newMsg.`);
    process.exit(2);
  }
  console.log(`\n✅ ${plan.label} : feasibility.message OK`);

  // Vérif invariants
  const invAfter = snapshotInvariants(after);
  const diffs = diffInvariants(invBefore, invAfter);
  if (diffs.length > 0) {
    console.error(`❌ ${plan.label} : invariants modifiés (interdit) :`);
    for (const d of diffs) {
      console.error(`  - ${d.key}: before=${String(d.before).slice(0,100)} | after=${String(d.after).slice(0,100)}`);
    }
    process.exit(3);
  }
  console.log(`✅ ${plan.label} : tous invariants préservés (status/score/safetyWarning/recommendation/confidenceScore/welcomeMessage/weeklyVolumes/weeklyElevationTarget/paces/weeks)`);

  // Vérif sémantique (selon plan)
  assertNoBanned(`feasibility.message AFTER ${plan.label}`, feA.message);
  console.log(`✅ ${plan.label} : aucun mot interdit`);

  // Mention pic 85 + 5 800 (toléré 5 800 ou 5800)
  const msg = feA.message;
  const has85 = msg.includes('85 km/sem');
  const has5800 = msg.includes('5 800') || msg.includes('5800');
  const has4x = msg.includes('4×') || msg.includes('4x');
  const has109 = msg.includes('109 m/km');
  const hasVMAref = msg.includes('17,6 km/h') || msg.includes('17.6 km/h');
  const hasPointPositif = msg.includes('Point positif') && msg.includes('70 km/sem');
  const hasMaster55 = msg.includes('Master 55');
  const hasEcoute = msg.toLowerCase().includes('écoute ton corps');
  console.log(`  • pic 85 km/sem : ${has85}`);
  console.log(`  • 5800 m D+/sem : ${has5800}`);
  console.log(`  • 4× D+ courant : ${has4x}`);
  console.log(`  • 109 m/km      : ${has109}`);
  console.log(`  • VMA 17,6 km/h : ${hasVMAref}`);
  console.log(`  • Point positif vol 70 km/sem : ${hasPointPositif}`);
  console.log(`  • Master 55     : ${hasMaster55}`);
  console.log(`  • écoute corps  : ${hasEcoute}`);
  if (!(has85 && has5800 && has4x && has109 && hasVMAref && hasPointPositif && hasMaster55 && hasEcoute)) {
    console.error(`❌ ${plan.label} : un marqueur sémantique attendu manque`);
    process.exit(4);
  }

  // Tonalité spécifique
  if (plan.label === 'PLAN1') {
    const hasAlarmant = msg.includes("n'est pas optimal") && msg.includes('très court')
                     && msg.includes('très élevé') && msg.includes('impossible');
    console.log(`  • PLAN1 ton alarmant (pas optimal / très court / très élevé / impossible) : ${hasAlarmant}`);
    if (!hasAlarmant) { console.error('❌ PLAN1 tonalité alarmante manquante'); process.exit(5); }
  } else {
    const hasModere = msg.includes('est ambitieux') && msg.includes('fenêtre minimum acceptable')
                   && msg.includes('point clé à travailler');
    console.log(`  • PLAN2 ton modéré-honnête (est ambitieux / fenêtre minimum / point clé) : ${hasModere}`);
    if (!hasModere) { console.error('❌ PLAN2 tonalité modérée manquante'); process.exit(5); }
  }

  return { plan, before, after, skipped: false };
}

// --- MAIN ---
const results = [];
for (const p of PLANS) {
  const res = await patchOne(p);
  results.push(res);
}

console.log('\n\n========================================');
console.log('=== RÉSUMÉ FINAL — CASH MESSAGES RICH ===');
console.log('========================================');
for (const r of results) {
  console.log(`\n${r.plan.label} (${r.plan.planId}, ${r.plan.weeks} sem) : ${r.skipped ? 'SKIP (déjà patché)' : 'PATCH appliqué OK'}`);
}
console.log('\n✅✅✅ TERMINÉ');
