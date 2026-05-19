// PATCH URGENT — Rich (rauroy@yahoo.fr) — NOUVEAU plan 1779135832271
// Trail 110 km / 12 000 m D+ — 13 sem — 55 ans — Expert — Premium
//
// Doctrine:
// - Allures intactes
// - Aucun mot interdit (poids/IMC/minceur...)
// - Pas de contact client
// - Backup pré-patch existant: backup-rich-NEW-pre-patch.json
// - Idempotent (re-run = no-op si déjà patché)
// - Re-read systématique
//
// Changements:
//  1. generationContext.periodizationPlan.weeklyVolumes  -> vecteur 13 sem pic 130 km
//  2. generationContext.periodizationPlan.weeklyElevationTarget -> vecteur 13 sem pic 7800 m
//  3. weeks[0].sessions[].elevationGain  -> total S1 ≈ 3000 m (au lieu de 1500)
//  4. weeks[0].sessions[].mainSet (footing vallonné + SL) -> mentions sentiers/côtes
//  5. feasibility (status, score, message, safetyWarning)
//  6. confidenceScore (top-level)  -> 60
//  7. welcomeMessage  -> texte challenge + sécurité

import { execSync } from 'child_process';
import fs from 'fs';

const SA = 'firebase-adminsdk-fbsvc@coach-running-ia.iam.gserviceaccount.com';
const PROJECT = 'coach-running-ia';
const TOKEN = execSync(`gcloud auth print-access-token --impersonate-service-account=${SA}`,
  { stdio:['pipe','pipe','pipe'] }).toString().trim();
const PLAN_ID = '1779135832271';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/plans/${PLAN_ID}`;
const HDR  = { Authorization:`Bearer ${TOKEN}`, 'Content-Type':'application/json', 'x-goog-user-project':PROJECT };

// --- Vecteurs cibles ---
const TARGET_VOLUMES   = [60, 70, 80, 65, 85, 100, 75, 110, 125, 130, 100, 65, 45];
const TARGET_ELEVATION = [3000, 3500, 4200, 2800, 5000, 6000, 4500, 6500, 7500, 7800, 5500, 3500, 1500];

// S1 D+ cible par session (total = 3000)
const S1_ELEV = {
  'Mardi':      400,   // Footing vallonné
  'Mercredi':   0,     // Renfo
  'Jeudi':      700,   // Footing nature varié
  'Samedi':     200,   // Récup -> bumpé léger
  'Dimanche':   1700,  // Sortie Longue
};
// Total = 3000 m

const FEASIBILITY_STATUS  = 'AMBITIEUX';
const FEASIBILITY_SCORE   = 60;
const FEASIBILITY_MESSAGE = "Ton objectif est ambitieux : ultra 110 km / 12 000 m D+ en moins de 13 semaines, c'est court (la fenêtre idéale serait 16-20 semaines). Avec ton volume actuel (60 km + 3000 m D+/sem) et ton expérience Expert, tu as une vraie base — mais à 55 ans pour cet ultra alpin, la bonne préparation, l'écoute du corps et la validation médicale sont absolument essentiels. Le plan vise une montée progressive du volume et du dénivelé pour t'amener prêt à finisher.";
const FEASIBILITY_WARNING = "⚠️ Sécurité PRIORITAIRE : à 55 ans + ultra de haute montagne (12 000 m D+), un bilan cardio-vasculaire complet (test d'effort + ECG) avant de débuter est INDISPENSABLE. Respecte impérativement les semaines de récupération, hydrate-toi rigoureusement, et écoute ton corps. À la moindre douleur articulaire, tendineuse ou cardiaque persistante, stoppe et consulte immédiatement.";
const TOP_CONFIDENCE      = 60;
const WELCOME_MESSAGE = `Bienvenue Rich ! Tu te lances dans un projet ambitieux : un ultra de 110 km avec 12 000 m de D+ en moins de 13 semaines de préparation. Ton expérience Expert (marathon 3h00) et ton volume actuel (60 km/sem + 3 000 m D+/sem) sont une base solide pour aborder ce défi.

Ce plan construit progressivement le volume et le dénivelé jusqu'à un pic à ~130 km/sem et ~7 800 m D+/sem en phase spécifique, pour t'amener prêt à finisher. La structure intègre 3 semaines de décharge bien placées et un affûtage de 2-3 semaines avant la course.

Quelques règles d'or pour ces 13 semaines :
- Marche les montées techniques à l'entraînement comme en course — stratégie ultra trail normale
- Renforcement spécifique trail (quadriceps excentrique, mollets, gainage) prioritaire
- Écoute ton corps : à la moindre douleur articulaire, tendineuse ou fatigue persistante, on adapte plutôt que forcer

⚠️ À 55 ans pour cet ultra alpin, un bilan cardio-vasculaire complet (test d'effort + ECG) avant de débuter est INDISPENSABLE. La validation médicale n'est pas négociable.`;

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

// --- Banned words sanity check ---
const BANNED = ['poids', 'imc', 'minceur', 'silhouette', 'kilos', 'corpulence', 'maigrir', 'maigre'];
function assertNoBanned(label, txt) {
  if (typeof txt !== 'string') return;
  const lower = txt.toLowerCase();
  for (const w of BANNED) {
    if (lower.includes(w)) {
      throw new Error(`[BANNED WORD] "${w}" présent dans ${label}`);
    }
  }
}
assertNoBanned('feasibility.message',       FEASIBILITY_MESSAGE);
assertNoBanned('feasibility.safetyWarning', FEASIBILITY_WARNING);
assertNoBanned('welcomeMessage',            WELCOME_MESSAGE);
console.log('✅ Sanity banned-words OK');

// --- Fetch current doc ---
async function getDoc() {
  const r = await fetch(BASE, { headers: HDR });
  if (!r.ok) throw new Error(`GET ${r.status} ${await r.text()}`);
  return r.json();
}

// --- Patch séquentiel via updateMask ---
async function patchFields(updates) {
  // updates: [{ path: 'feasibility.status', value: 'AMBITIEUX' }, ...]
  // On lit le doc complet, modifie en mémoire, et PATCH avec updateMask par top-level field.
  const doc = await getDoc();
  const fields = doc.fields;

  // Apply updates to in-memory structure (top-level keys we touch)
  const touchedTop = new Set();
  for (const u of updates) {
    const parts = u.path.split('.');
    const top = parts[0];
    touchedTop.add(top);
    // Navigate the typed structure
    let cursor = fields[top];
    if (!cursor) {
      // Create top-level
      fields[top] = toFs(u.value);
      continue;
    }
    if (parts.length === 1) {
      fields[top] = toFs(u.value);
      continue;
    }
    // Deep navigate
    let cur = cursor;
    for (let i = 1; i < parts.length - 1; i++) {
      const k = parts[i];
      // Array index?
      if (/^\d+$/.test(k)) {
        cur = cur.arrayValue.values[parseInt(k)];
      } else {
        cur = cur.mapValue.fields[k];
      }
    }
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      cur.arrayValue.values[parseInt(last)] = toFs(u.value);
    } else {
      cur.mapValue.fields[last] = toFs(u.value);
    }
  }

  // Build updateMask (top-level keys)
  const qs = [...touchedTop].map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE}?${qs}`;
  const body = JSON.stringify({ fields });
  const r = await fetch(url, { method: 'PATCH', headers: HDR, body });
  if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
  return r.json();
}

// --- Idempotence check ---
async function isAlreadyPatched() {
  const d = await getDoc();
  const gc = fromFs(d.fields.generationContext);
  const fe = fromFs(d.fields.feasibility);
  const wm = fromFs(d.fields.welcomeMessage);
  const conf = fromFs(d.fields.confidenceScore);
  const vol  = gc?.periodizationPlan?.weeklyVolumes;
  const elev = gc?.periodizationPlan?.weeklyElevationTarget;

  const sameVol  = Array.isArray(vol) && vol.length === TARGET_VOLUMES.length &&
                   vol.every((v,i)=>v===TARGET_VOLUMES[i]);
  const sameElev = Array.isArray(elev) && elev.length === TARGET_ELEVATION.length &&
                   elev.every((v,i)=>v===TARGET_ELEVATION[i]);
  const sameFeas = fe?.status === FEASIBILITY_STATUS && parseInt(fe?.score) === FEASIBILITY_SCORE &&
                   fe?.message === FEASIBILITY_MESSAGE && fe?.safetyWarning === FEASIBILITY_WARNING;
  const sameWm   = wm === WELCOME_MESSAGE;
  const sameConf = parseInt(conf) === TOP_CONFIDENCE;

  return { sameVol, sameElev, sameFeas, sameWm, sameConf, allSame: sameVol && sameElev && sameFeas && sameWm && sameConf };
}

// --- Snapshot BEFORE ---
console.log('\n=== SNAPSHOT BEFORE ===');
const before = await getDoc();
// NB: on n'overwrite PAS le fichier pre-patch s'il existe déjà (garde la vraie photo originale).
const BK = '/Users/romanemarino/Coach-Running-IA/backup-rich-NEW-pre-patch.json';
if (!fs.existsSync(BK)) {
  fs.writeFileSync(BK, JSON.stringify(before, null, 2));
  console.log('✅ Backup pré-patch écrit (première fois).');
} else {
  console.log('⏭️  Backup pré-patch déjà présent, conservé tel quel.');
}
const gcB = fromFs(before.fields.generationContext);
const feB = fromFs(before.fields.feasibility);
console.log('  weeklyVolumes (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyVolumes));
console.log('  weeklyElev    (before):', JSON.stringify(gcB?.periodizationPlan?.weeklyElevationTarget));
console.log('  feasibility   (before):', JSON.stringify({ status: feB?.status, score: feB?.score }));
console.log('  confidence    (before):', fromFs(before.fields.confidenceScore));

const idem = await isAlreadyPatched();
if (idem.allSame) {
  console.log('\n⏭️  Déjà patché (idempotent). Aucun write.');
  process.exit(0);
}

// --- Build update list ---
const updates = [];

// 1. weeklyVolumes
updates.push({ path: 'generationContext.periodizationPlan.weeklyVolumes', value: TARGET_VOLUMES });
// 2. weeklyElevationTarget
updates.push({ path: 'generationContext.periodizationPlan.weeklyElevationTarget', value: TARGET_ELEVATION });

// 3. weeks[0].sessions[].elevationGain et mainSet
//    On modifie l'array entier en l'extrayant, on le re-set complet.
const weeksArr = before.fields.weeks?.arrayValue?.values || [];
if (weeksArr.length > 0) {
  const sessionsRaw = weeksArr[0].mapValue.fields.sessions.arrayValue.values;
  for (const s of sessionsRaw) {
    const day = s.mapValue.fields.day?.stringValue;
    if (day && day in S1_ELEV) {
      s.mapValue.fields.elevationGain = { integerValue: String(S1_ELEV[day]) };
    }
    // Enrichir mainSet (footing vallonné mardi + SL dimanche) — déjà mentionne sentiers, on bumpe juste D+
    if (day === 'Mardi') {
      const old = s.mapValue.fields.mainSet?.stringValue || '';
      const fresh = "62 min sur parcours vallonné (~400 m D+). En montée : foulée courte, effort d'endurance fondamentale maintenu (5:07 en référence sur le plat, la vitesse baisse en côte c'est normal). En descente : relâché, foulée courte et contrôlée. Cherche du vrai relief (côtes, sentiers), pas seulement du plat. (allure : 5:07 min/km)";
      s.mapValue.fields.mainSet = { stringValue: fresh };
    }
    if (day === 'Jeudi') {
      const fresh = "62 min sur terrain varié et vallonné (~700 m D+) — chemins, sentiers larges, sous-bois avec relief. Adapte l'allure au sol pour garder un effort d'endurance fondamentale constant (5:07 en référence). Évite le terrain piégeux (racines, cailloux, dévers). Cherche le relief progressif, c'est ton vrai entraînement spécifique. (allure : 5:07 min/km)";
      s.mapValue.fields.mainSet = { stringValue: fresh };
    }
    if (day === 'Samedi') {
      const fresh = "25 min de footing très léger sur sentiers roulants vallonnés (~200 m D+ doux) à 5:43 min/km";
      s.mapValue.fields.mainSet = { stringValue: fresh };
    }
    if (day === 'Dimanche') {
      const fresh = "2h30 de course en alternant endurance fondamentale (allure proche de 5:07 min/km sur les portions moins pentues) et des sections de marche rapide en montée (power hiking, allure 7:00-8:00 min/km) sur les pentes raides. Objectif S1 : ~1700 m D+ sur sentiers techniques pour démarrer la résistance excentrique en descente. L'objectif est d'accumuler du temps d'effort, de s'habituer au terrain technique et au dénivelé, en maintenant un effort globalement confortable sans chercher la vitesse.";
      s.mapValue.fields.mainSet = { stringValue: fresh };
    }
  }
  updates.push({ path: 'weeks', value: undefined, _raw: true, _rawValue: before.fields.weeks });
}

// 4. feasibility (status, score, message, safetyWarning) — on garde les autres sous-champs intacts
const feas = fromFs(before.fields.feasibility) || {};
feas.status        = FEASIBILITY_STATUS;
feas.score         = FEASIBILITY_SCORE;
feas.message       = FEASIBILITY_MESSAGE;
feas.safetyWarning = FEASIBILITY_WARNING;
updates.push({ path: 'feasibility', value: feas });

// 5. confidenceScore
updates.push({ path: 'confidenceScore', value: TOP_CONFIDENCE });

// 6. welcomeMessage
updates.push({ path: 'welcomeMessage', value: WELCOME_MESSAGE });

// --- Custom apply for _raw value (weeks array kept as-is structurally) ---
// Le patchFields helper sait gérer du JS natif, mais pour weeks on a déjà mis à jour le typed-value.
// On va construire le PATCH manuellement pour passer weeks raw.

async function applyAll() {
  // Apply non-raw updates via simple PATCH per top-level
  const doc = await getDoc();
  const fields = doc.fields;
  const touchedTop = new Set();

  for (const u of updates) {
    const parts = u.path.split('.');
    const top = parts[0];
    touchedTop.add(top);
    if (u._raw) {
      fields[top] = u._rawValue;
      continue;
    }
    if (parts.length === 1) {
      fields[top] = toFs(u.value);
      continue;
    }
    // Deep nav — ensure path exists
    let cur = fields[top];
    if (!cur) { fields[top] = toFs({}); cur = fields[top]; }
    for (let i = 1; i < parts.length - 1; i++) {
      const k = parts[i];
      if (!cur.mapValue) throw new Error(`Path ${u.path} expects mapValue at ${k}`);
      if (!cur.mapValue.fields[k]) cur.mapValue.fields[k] = toFs({});
      cur = cur.mapValue.fields[k];
    }
    const last = parts[parts.length - 1];
    if (!cur.mapValue) throw new Error(`Path ${u.path} expects mapValue at final`);
    cur.mapValue.fields[last] = toFs(u.value);
  }

  const qs = [...touchedTop].map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE}?${qs}`;
  const body = JSON.stringify({ fields });
  const r = await fetch(url, { method: 'PATCH', headers: HDR, body });
  if (!r.ok) throw new Error(`PATCH ${r.status} ${await r.text()}`);
  return r.json();
}

console.log('\n=== APPLY PATCH ===');
console.log('Top fields touched:', [...new Set(updates.map(u=>u.path.split('.')[0]))].join(', '));
await applyAll();
console.log('✅ PATCH appliqué');

// --- RE-READ confirmation ---
console.log('\n=== RE-READ CONFIRMATION ===');
const after = await getDoc();
fs.writeFileSync('/Users/romanemarino/Coach-Running-IA/after-rich-NEW-post-patch.json', JSON.stringify(after, null, 2));
const gcA = fromFs(after.fields.generationContext);
const feA = fromFs(after.fields.feasibility);
const wmA = fromFs(after.fields.welcomeMessage);
const confA = fromFs(after.fields.confidenceScore);

console.log('weeklyVolumes (after):',          JSON.stringify(gcA?.periodizationPlan?.weeklyVolumes));
console.log('weeklyElevationTarget (after):',  JSON.stringify(gcA?.periodizationPlan?.weeklyElevationTarget));
console.log('feasibility.status:',             feA?.status);
console.log('feasibility.score:',              feA?.score);
console.log('feasibility.message (50):',       (feA?.message||'').slice(0,80)+'...');
console.log('feasibility.safetyWarning (50):', (feA?.safetyWarning||'').slice(0,80)+'...');
console.log('confidenceScore:',                confA);
console.log('welcomeMessage (50):',            (wmA||'').slice(0,80)+'...');

// Sessions S1 D+
const weeksA = fromFs(after.fields.weeks) || [];
const s1A = weeksA[0]?.sessions || [];
let totalD = 0;
for (const s of s1A) {
  const d = parseInt(s.elevationGain || 0);
  totalD += d;
  console.log(`  S1 [${s.day}] elev=${d}`);
}
console.log(`  TOTAL S1 D+: ${totalD}`);

// --- Assertions ---
console.log('\n=== ASSERTIONS ===');
const idem2 = await isAlreadyPatched();
console.log('Vol OK:',  idem2.sameVol);
console.log('Elev OK:', idem2.sameElev);
console.log('Feas OK:', idem2.sameFeas);
console.log('Wm OK:',   idem2.sameWm);
console.log('Conf OK:', idem2.sameConf);
if (!idem2.allSame) {
  console.error('❌ PATCH INCOMPLET');
  process.exit(2);
}
console.log('\n✅✅✅ PATCH COMPLET ET CONFIRMÉ');
